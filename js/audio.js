/* =========================================================
   SOUND — efeitos sonoros sintetizados com Web Audio API.
   Nenhum arquivo de áudio externo é necessário.
   (Chama-se "Sound" para não conflitar com window.Audio.)
   ========================================================= */
const Sound = {
  ctx: null,
  master: null,
  enabled: true,
  _noiseBuffer: null,

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
      // buffer de ruído reutilizável
      const len = this.ctx.sampleRate * 0.5;
      this._noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this._noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch (e) {
      this.ctx = null;
    }
  },

  // Navegadores móveis só liberam áudio após um toque do usuário
  unlock() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  setEnabled(on) { this.enabled = on; },

  tone(freq, dur, type = 'square', vol = 0.25, slideTo = null, delay = 0) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  },

  noise(dur, vol = 0.2, filterFreq = 1200, delay = 0) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + dur + 0.02);
  },

  arp(notes, step, type = 'triangle', vol = 0.2, dur = 0.12) {
    notes.forEach((n, i) => this.tone(n, dur, type, vol, null, i * step));
  },

  play(name) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    switch (name) {
      case 'jump': this.tone(260, 0.16, 'square', 0.12, 520); break;
      case 'coin': this.arp([880, 1175, 1568], 0.04, 'sine', 0.18, 0.1); break;
      case 'special': this.arp([660, 880, 1109, 1319, 1760], 0.06, 'triangle', 0.22, 0.16); break;
      case 'stomp': this.tone(420, 0.12, 'square', 0.18, 90); this.noise(0.08, 0.15, 900); break;
      case 'clank': this.tone(1400, 0.08, 'square', 0.1, 900); this.tone(700, 0.1, 'triangle', 0.12); break;
      case 'power': this.arp([392, 523, 659, 784, 1047, 1319], 0.07, 'square', 0.13, 0.14); break;
      case 'fire': this.noise(0.14, 0.14, 2200); this.tone(520, 0.12, 'sawtooth', 0.07, 180); break;
      case 'fizzle': this.noise(0.1, 0.07, 3000); break;
      case 'hurt': this.tone(440, 0.45, 'sawtooth', 0.16, 70); break;
      case 'checkpoint': this.arp([784, 988, 1319], 0.09, 'triangle', 0.2, 0.25); break;
      case 'break': this.noise(0.2, 0.25, 700); this.tone(180, 0.12, 'square', 0.1, 60); break;
      case 'key': this.arp([1047, 1397, 2093], 0.07, 'sine', 0.2, 0.3); break;
      case 'door': this.noise(0.8, 0.25, 300); this.tone(90, 0.8, 'sawtooth', 0.1, 50); break;
      case 'pickup': this.arp([700, 1050], 0.05, 'triangle', 0.18, 0.12); break;
      case 'bosshit': this.tone(160, 0.25, 'square', 0.22, 60); this.noise(0.15, 0.2, 600); break;
      case 'bossroar': this.tone(110, 0.6, 'sawtooth', 0.16, 55); this.noise(0.5, 0.12, 400); break;
      case 'throw': this.tone(300, 0.2, 'triangle', 0.14, 700); break;
      case 'crumble': this.noise(0.25, 0.12, 500); break;
      case 'gameover': this.arp([523, 440, 349, 262], 0.18, 'triangle', 0.2, 0.3); break;
      case 'victory':
        this.arp([523, 659, 784, 659, 784, 1047], 0.12, 'square', 0.12, 0.18);
        this.arp([262, 330, 392, 523], 0.18, 'triangle', 0.16, 0.3);
        break;
      case 'click': this.tone(660, 0.05, 'sine', 0.12); break;
    }
  }
};
