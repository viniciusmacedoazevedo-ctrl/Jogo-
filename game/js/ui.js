/* =========================================================
   UI — telas (menu, fases, pause, resultado...), HUD e avisos.
   Tudo em HTML/CSS por cima do canvas.
   ========================================================= */
const UI = {
  el: {},
  current: null,
  _hud: {},
  _toastTimer: null,

  init() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      hud: $('hud'), controls: $('controls'), fireBtn: $('ctl-fire'),
      lives: $('hud-lives'), coins: $('hud-coins'), fire: $('hud-fire'), time: $('hud-time'),
      keys: $('hud-keys'), score: $('hud-score'), bossBar: $('boss-bar'), bossFill: $('boss-fill'),
      toast: $('toast')
    };

    // Botões com data-action
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action], [data-level]');
      if (!btn || btn.disabled) return;
      btn.blur();
      Sound.unlock();
      Sound.play('click');
      if (btn.dataset.level) { this.startLevel(parseInt(btn.dataset.level, 10)); return; }
      this.action(btn.dataset.action);
    });
    document.getElementById('btn-pause').addEventListener('click', (e) => {
      e.stopPropagation();
      e.currentTarget.blur();
      Sound.play('click');
      Game.togglePause();
    });
    this.applySettings();
  },

  action(name) {
    switch (name) {
      case 'play': {
        // continua da primeira fase ainda não concluída
        let id = 1;
        for (let i = 1; i <= Save.data.unlocked; i++) { id = i; if (!Save.level(i).completed) break; }
        this.startLevel(id);
        break;
      }
      case 'levels': this.renderLevels(); this.show('levels'); break;
      case 'settings': this.renderSettings(); this.show('settings'); break;
      case 'howto': this.show('howto'); break;
      case 'back': case 'menu': Game.toMenu(); break;
      case 'resume': Game.resume(); break;
      case 'restart': Game.restartLevel(); break;
      case 'next': this.startLevel(Math.min(LEVELS.length, Game.levelId + 1)); break;
      case 'toggle-sound': Save.setSetting('sound', !Save.data.settings.sound); this.applySettings(); this.renderSettings(); break;
      case 'toggle-vibration': Save.setSetting('vibration', !Save.data.settings.vibration); this.renderSettings(); break;
      case 'toggle-quality':
        Save.setSetting('quality', Save.data.settings.quality === 'high' ? 'low' : 'high');
        Render.resize(); this.renderSettings();
        break;
      case 'toggle-buttons': Save.setSetting('bigButtons', !Save.data.settings.bigButtons); this.applySettings(); this.renderSettings(); break;
      case 'reset-progress':
        if (confirm('Apagar todo o progresso salvo?')) { Save.resetProgress(); this.renderSettings(); this.toast('Progresso apagado'); }
        break;
    }
  },

  startLevel(id) {
    if (!Save.isUnlocked(id)) return;
    this.requestFullscreen();
    Game.startLevel(id);
  },

  // Em celulares tenta tela cheia + trava na horizontal (nem todo navegador permite)
  requestFullscreen() {
    if (!Input.isTouch) return;
    const de = document.documentElement;
    try {
      const req = de.requestFullscreen || de.webkitRequestFullscreen;
      if (req && !document.fullscreenElement && !document.webkitFullscreenElement) {
        const p = req.call(de, { navigationUI: 'hide' });
        if (p && p.then) {
          p.then(() => {
            if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
          }).catch(() => {});
        }
      }
    } catch (e) { /* sem suporte */ }
  },

  applySettings() {
    const s = Save.data.settings;
    Sound.setEnabled(s.sound);
    document.body.classList.toggle('big-buttons', !!s.bigButtons);
  },

  /* ---------------- telas ---------------- */
  show(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + name));
    this.current = name;
    if (name !== 'game') { this.el.toast.classList.remove('show'); clearTimeout(this._toastTimer); }
    const inGame = name === 'game';
    this.el.hud.classList.toggle('hidden', !inGame && name !== 'pause');
    this.el.controls.classList.toggle('hidden', !inGame);
    if (name === 'menu') this.renderMenu();
  },

  showGame() { this.show('game'); },

  renderMenu() {
    const d = Save.data;
    document.getElementById('menu-best').textContent = Save.bestScore().toLocaleString('pt-BR');
    document.getElementById('menu-progress').textContent = `${Save.completedCount()}/${LEVELS.length} fases · ${Save.totalStars()}/${LEVELS.length * 3} ★`;
    document.getElementById('menu-coins').textContent = d.totalCoins.toLocaleString('pt-BR');
    const playBtn = document.querySelector('#screen-menu [data-action="play"]');
    playBtn.textContent = Save.completedCount() > 0 ? 'CONTINUAR' : 'JOGAR';
  },

  renderLevels() {
    const list = document.getElementById('level-list');
    list.innerHTML = '';
    LEVELS.forEach((def) => {
      const rec = Save.level(def.id);
      const unlocked = Save.isUnlocked(def.id);
      const btn = document.createElement('button');
      btn.className = 'level-card theme-' + def.theme + (unlocked ? '' : ' locked');
      if (unlocked) btn.dataset.level = def.id; else btn.disabled = true;
      const stars = [0, 1, 2].map((i) => `<span class="${i < rec.stars ? 'on' : ''}">★</span>`).join('');
      btn.innerHTML = `
        <div class="lc-num">FASE ${def.id} ${rec.completed ? '✓' : (unlocked ? '' : '🔒')}</div>
        <div class="lc-name">${def.name}</div>
        <div class="lc-stars">${unlocked ? stars : ''}</div>
        <ul class="lc-ch">${unlocked ? def.challenges.map((c, i) => `<li class="${rec.challenges[i] ? 'done' : ''}">${rec.challenges[i] ? '☑' : '☐'} ${c.text}</li>`).join('') : '<li>Termine a fase anterior</li>'}</ul>`;
      list.appendChild(btn);
    });
  },

  renderSettings() {
    const s = Save.data.settings;
    document.getElementById('set-sound').textContent = 'SOM: ' + (s.sound ? 'ON' : 'OFF');
    document.getElementById('set-vibration').textContent = 'VIBRAÇÃO: ' + (s.vibration ? 'ON' : 'OFF');
    document.getElementById('set-quality').textContent = 'GRÁFICOS: ' + (s.quality === 'high' ? 'ALTA' : 'LEVE');
    document.getElementById('set-buttons').textContent = 'BOTÕES: ' + (s.bigButtons ? 'GRANDES' : 'NORMAIS');
  },

  challengeList(def, challenges) {
    return def.challenges.map((c, i) =>
      `<li class="${challenges[i] ? 'done' : ''}">${challenges[i] ? '☑' : '☐'} ${c.text}</li>`).join('');
  },

  starsHtml(n) {
    return [0, 1, 2].map((i) => `<span class="${i < n ? 'on' : ''}" style="animation-delay:${0.2 + i * 0.25}s">★</span>`).join('');
  },

  showComplete(r) {
    const st = r.stats;
    document.getElementById('complete-title').textContent = `${r.def.name} concluída!`;
    document.getElementById('complete-stars').innerHTML = this.starsHtml(r.saved.runStars);
    document.getElementById('complete-stats').innerHTML = `
      <div><b>COINS</b>${st.coins}</div>
      <div><b>ESPECIAIS</b>${st.specials}/${st.specialTotal}</div>
      <div><b>TEMPO</b>${formatTime(st.time)}</div>
      <div><b>PONTOS</b>${st.score}</div>`;
    document.getElementById('complete-challenges').innerHTML = this.challengeList(r.def, r.challenges);
    document.getElementById('complete-best').textContent = r.saved.newBest ? 'NOVO RECORDE!' : '';
    this.show('complete');
  },

  showVictory(r) {
    const st = r.stats;
    document.getElementById('victory-stars').innerHTML = this.starsHtml(r.saved.runStars);
    document.getElementById('victory-stats').innerHTML = `
      <div><b>COINS</b>${st.coins}</div>
      <div><b>SPECIAL COINS</b>${st.specials}/${st.specialTotal}</div>
      <div><b>TIME</b>${formatTime(st.time)}</div>
      <div><b>LIVES</b>${r.lives}</div>`;
    document.getElementById('victory-challenges').innerHTML = this.challengeList(r.def, r.challenges);
    document.getElementById('victory-total').textContent =
      `Moedas totais: ${Save.data.totalCoins} · Estrelas: ${Save.totalStars()}/${LEVELS.length * 3} · Pontuação: ${Save.bestScore()}`;
    this.show('victory');
  },

  /* ---------------- HUD ---------------- */
  updateHud(force) {
    const p = Game.player, st = Game.stats;
    if (!st) return;
    const h = this._hud;
    const lives = Math.max(0, Game.lives);
    if (force || h.lives !== lives) {
      h.lives = lives;
      let s = '';
      for (let i = 0; i < CONFIG.START_LIVES; i++) s += `<span class="${i < lives ? '' : 'lost'}">❤️</span>`;
      this.el.lives.innerHTML = s;
    }
    if (force || h.coins !== st.coins) { h.coins = st.coins; this.el.coins.textContent = 'COINS: ' + pad2(st.coins); }
    const fireKey = p.fireCharges + (p.hasFire ? 100 : 0);
    if (force || h.fire !== fireKey) {
      h.fire = fireKey;
      this.el.fire.textContent = 'FIRE: ' + pad2(p.fireCharges);
      this.el.fire.classList.toggle('dim', !p.hasFire);
      this.el.fireBtn.classList.toggle('hidden', !p.hasFire);
    }
    const sec = Math.floor(st.time);
    if (force || h.time !== sec) { h.time = sec; this.el.time.textContent = 'TIME: ' + formatTime(st.time); }
    const keysTotal = Game.level ? Game.level.keysTotal : 0;
    if (force || h.keys !== st.keys || h.keysTotal !== keysTotal) {
      h.keys = st.keys; h.keysTotal = keysTotal;
      this.el.keys.classList.toggle('hidden', !keysTotal);
      this.el.keys.textContent = '🔑 ' + st.keys + '/' + keysTotal;
    }
    if (force || h.score !== st.score) { h.score = st.score; this.el.score.textContent = st.score; }
  },

  showBossBar() { this.el.bossBar.classList.remove('hidden'); this.updateBossBar(1); },
  hideBossBar() { this.el.bossBar.classList.add('hidden'); },
  updateBossBar(k) {
    const w = Math.round(k * 100) + '%';
    if (this._bossW !== w) { this._bossW = w; this.el.bossFill.style.width = w; }
  },

  toast(msg, ms = 1800) {
    const t = this.el.toast;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }
};

function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function formatTime(s) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return pad2(m) + ':' + pad2(sec);
}
