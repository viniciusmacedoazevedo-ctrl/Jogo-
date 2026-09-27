/* =========================================================
   INPUT — teclado (PC) e controles touch (celular).
   O jogo lê apenas o estado deste objeto.
   ========================================================= */
const Input = {
  left: false,
  right: false,
  jump: false,
  fire: false,
  jumpPressed: false,   // verdadeiro por um passo de física após apertar
  firePressed: false,
  isTouch: false,

  _keys: { left: false, right: false, jump: false, fire: false },
  _touch: { left: false, right: false, jump: false, fire: false },

  init() {
    const map = {
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
      Space: 'jump', ArrowUp: 'jump', KeyW: 'jump',
      KeyF: 'fire', KeyJ: 'fire'
    };
    window.addEventListener('keydown', (e) => {
      const k = map[e.code];
      if (k) { this._keys[k] = true; this._sync(); e.preventDefault(); }
      if (e.code === 'Escape' || e.code === 'KeyP') Game.togglePause();
    });
    window.addEventListener('keyup', (e) => {
      const k = map[e.code];
      if (k) { this._keys[k] = false; this._sync(); e.preventDefault(); }
    });
    window.addEventListener('blur', () => this.releaseAll());

    // Detecta aparelho com toque (ou ?touch=1 para testar no PC)
    const forced = /[?&]touch=1/.test(location.search);
    if (forced || 'ontouchstart' in window || navigator.maxTouchPoints > 0) this.enableTouch();
    window.addEventListener('touchstart', () => this.enableTouch(), { once: true, passive: true });

    this._bindTouchControls(forced);
  },

  enableTouch() {
    if (this.isTouch) return;
    this.isTouch = true;
    document.body.classList.add('touch');
  },

  // Um único listener cuida de todos os dedos: cada toque "aciona" o botão
  // que está debaixo dele. Assim dá para deslizar o dedo de ◀ para ▶.
  _bindTouchControls(withMouse) {
    const pad = document.getElementById('controls');
    const update = (e) => {
      e.preventDefault();
      const t = { left: false, right: false, jump: false, fire: false };
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const btn = el && el.closest ? el.closest('.ctl') : null;
        if (btn && btn.offsetParent !== null) t[btn.dataset.key] = true;
      }
      this._touch = t;
      this._sync();
    };
    ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach((type) =>
      pad.addEventListener(type, update, { passive: false }));

    // Mouse: só para testar os botões na tela do PC (?touch=1)
    if (withMouse) {
      let down = null;
      pad.addEventListener('mousedown', (e) => {
        const btn = e.target.closest('.ctl');
        if (!btn) return;
        down = btn.dataset.key;
        this._touch[down] = true; this._sync();
      });
      window.addEventListener('mouseup', () => {
        if (!down) return;
        this._touch[down] = false; down = null; this._sync();
      });
    }
  },

  _sync() {
    const k = this._keys, t = this._touch;
    const jump = k.jump || t.jump;
    const fire = k.fire || t.fire;
    if (jump && !this.jump) this.jumpPressed = true;
    if (fire && !this.fire) this.firePressed = true;
    this.left = k.left || t.left;
    this.right = k.right || t.right;
    this.jump = jump;
    this.fire = fire;
    const pad = document.getElementById('controls');
    if (pad) {
      pad.querySelectorAll('.ctl').forEach((b) => b.classList.toggle('pressed', !!t[b.dataset.key]));
    }
  },

  // Chamado depois de cada passo de física que consumiu os "pressed"
  consume() {
    this.jumpPressed = false;
    this.firePressed = false;
  },

  releaseAll() {
    this._keys = { left: false, right: false, jump: false, fire: false };
    this._touch = { left: false, right: false, jump: false, fire: false };
    this._sync();
    this.consume();
  }
};
