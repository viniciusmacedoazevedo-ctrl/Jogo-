/* =========================================================
   SAVE — progresso e configurações no LocalStorage.
   ========================================================= */
const Save = {
  KEY: 'brotim_save_v1',
  data: null,

  defaults() {
    return {
      version: 1,
      unlocked: 1,          // maior fase liberada (1..5)
      levels: {},           // { [id]: { completed, stars, challenges:[b,b,b], bestScore, bestTime } }
      totalCoins: 0,
      gameCompleted: false,
      settings: { sound: true, vibration: true, quality: 'high', bigButtons: false }
    };
  },

  load() {
    const base = this.defaults();
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = Object.assign(base, parsed);
        this.data.settings = Object.assign(this.defaults().settings, parsed.settings || {});
        this.data.levels = parsed.levels || {};
        return;
      }
    } catch (e) { /* dados corrompidos ou storage bloqueado */ }
    this.data = base;
  },

  persist() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* sem storage */ }
  },

  level(id) {
    return this.data.levels[id] || { completed: false, stars: 0, challenges: [false, false, false], bestScore: 0, bestTime: 0 };
  },

  isUnlocked(id) { return id <= this.data.unlocked; },

  // Registra o resultado de uma fase concluída e retorna informações para a tela de resultado
  recordLevel(id, result) {
    const prev = this.level(id);
    const challenges = prev.challenges.map((c, i) => c || !!result.challenges[i]);
    const stars = Math.max(1, challenges.filter(Boolean).length);
    const newBest = result.score > prev.bestScore;
    this.data.levels[id] = {
      completed: true,
      stars,
      challenges,
      bestScore: Math.max(prev.bestScore, result.score),
      bestTime: prev.bestTime ? Math.min(prev.bestTime, result.time) : result.time
    };
    this.data.totalCoins += result.coins;
    if (id + 1 > this.data.unlocked && id < LEVELS.length) this.data.unlocked = id + 1;
    if (id === LEVELS.length) this.data.gameCompleted = true;
    this.persist();
    return { stars, newBest, runStars: Math.max(1, result.challenges.filter(Boolean).length) };
  },

  bestScore() {
    return Object.values(this.data.levels).reduce((s, l) => s + (l.bestScore || 0), 0);
  },

  totalStars() {
    return Object.values(this.data.levels).reduce((s, l) => s + (l.stars || 0), 0);
  },

  completedCount() {
    return Object.values(this.data.levels).filter((l) => l.completed).length;
  },

  setSetting(key, value) {
    this.data.settings[key] = value;
    this.persist();
  },

  resetProgress() {
    const settings = this.data.settings;
    this.data = this.defaults();
    this.data.settings = settings;
    this.persist();
  }
};
