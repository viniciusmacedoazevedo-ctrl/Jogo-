/* =========================================================
   LEVEL — mapa de blocos, construtor de fases e objetos
   do cenário (itens, plataformas, checkpoints, jatos de fogo).
   As fases em si ficam em js/levels/levels.js.
   ========================================================= */
const TILE = {
  EMPTY: 0,
  GROUND: 1,    // chão (terra, areia, neve, rocha, pedra)
  BLOCK: 2,     // bloco sólido
  PLATFORM: 3,  // plataforma atravessável por baixo
  ICE: 4,       // gelo escorregadio (sólido)
  BREAK: 5,     // bloco rachado, quebra com cabeçada ou fogo
  LAVA: 6,      // mata na hora
  SPIKES: 7,    // espinhos, causam dano
  DOOR: 8       // porta trancada (abre com 3 chaves)
};
const TILE_SOLID = [false, true, true, false, true, true, false, false, true];

/* ---------- Plataforma dinâmica (móvel ou que desmorona) ---------- */
class MovingPlatform {
  constructor(x, y, w, dx, dy, speed, ice) {
    const T = CONFIG.TILE;
    this.x0 = x * T; this.y0 = y * T;
    this.x = this.x0; this.y = this.y0;
    this.prevX = this.x; this.prevY = this.y;
    this.w = w * T; this.h = 14;
    this.rangeX = dx * T; this.rangeY = dy * T;
    const len = Math.hypot(this.rangeX, this.rangeY) || 1;
    this.period = (len * 2) / speed;
    this.t = 0;
    this.dx = 0; this.dy = 0;
    this.solid = true;
    this.ice = !!ice;
    this.kind = 'moving';
  }
  update(dt) {
    this.prevX = this.x; this.prevY = this.y;
    this.t += dt;
    // vai-e-volta suave (cosseno)
    const k = (1 - Math.cos((this.t / this.period) * Math.PI * 2)) / 2;
    this.x = this.x0 + this.rangeX * k;
    this.y = this.y0 + this.rangeY * k;
    this.dx = this.x - this.prevX; this.dy = this.y - this.prevY;
  }
}

class CrumblePlatform {
  constructor(x, y, w) {
    const T = CONFIG.TILE;
    this.x = x * T; this.y = y * T;
    this.prevX = this.x; this.prevY = this.y;
    this.w = w * T; this.h = 16;
    this.dx = 0; this.dy = 0;
    this.solid = true;
    this.state = 'idle';   // idle -> shaking -> gone -> idle
    this.timer = 0;
    this.kind = 'crumble';
  }
  touch() {
    if (this.state === 'idle') { this.state = 'shaking'; this.timer = CONFIG.CRUMBLE_DELAY; }
  }
  update(dt, game) {
    this.prevY = this.y;
    if (this.state === 'shaking') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'gone'; this.solid = false; this.timer = CONFIG.CRUMBLE_RESPAWN;
        Sound.play('crumble');
        game.particles.burst(this.x + this.w / 2, this.y + 8, 14, game.level.theme.block, 140, this.w / 2);
      }
    } else if (this.state === 'gone') {
      this.timer -= dt;
      if (this.timer <= 0) { this.state = 'idle'; this.solid = true; }
    }
  }
  reset() { this.state = 'idle'; this.solid = true; }
}

/* ---------- Jato de fogo (armadilha periódica) ---------- */
class Vent {
  constructor(x, y, phase) {
    const T = CONFIG.TILE;
    this.x = x * T + 4; this.w = T - 8;
    this.baseY = y * T;          // topo do bloco onde está o bico
    this.h = T * 3;
    this.y = this.baseY - this.h;
    this.t = phase || 0;
    this.on = false;
  }
  update(dt) {
    this.t += dt;
    const cycle = CONFIG.VENT_ON + CONFIG.VENT_OFF;
    this.phaseT = this.t % cycle;
    this.on = this.phaseT > CONFIG.VENT_OFF;
    this.warning = !this.on && this.phaseT > CONFIG.VENT_OFF - 0.6;
  }
  hitbox() { return { x: this.x + 3, y: this.y + 10, w: this.w - 6, h: this.h - 10 }; }
}

/* ---------- Construtor de fases ----------
   Coordenadas em blocos. y = linha contada de cima para baixo.
   b.G = linha do topo do chão padrão (altura - 3). */
class LevelBuilder {
  constructor(level) {
    this.L = level;
    this.G = level.height - 3;
  }
  _fill(x, y, w, h, t) {
    for (let c = x; c < x + w; c++) for (let r = y; r < y + h; r++) this.L.setTile(c, r, t);
  }
  ground(x, w, top = this.G) { this._fill(x, top, w, this.L.height - top, TILE.GROUND); return this; }
  solid(x, y, w = 1, h = 1) { this._fill(x, y, w, h, TILE.BLOCK); return this; }
  plat(x, y, w) { this._fill(x, y, w, 1, TILE.PLATFORM); return this; }
  ice(x, y, w, h = 1) { this._fill(x, y, w, h, TILE.ICE); return this; }
  breakable(x, y, w = 1, h = 1) { this._fill(x, y, w, h, TILE.BREAK); return this; }
  spikes(x, y, w = 1) { this._fill(x, y, w, 1, TILE.SPIKES); return this; }
  lava(x, w, top = this.G + 1) { this._fill(x, top, w, this.L.height - top, TILE.LAVA); return this; }
  clear(x, y, w = 1, h = 1) { this._fill(x, y, w, h, TILE.EMPTY); return this; }
  door(x, y, w, h) {
    this._fill(x, y, w, h, TILE.DOOR);
    this.L.doorCells = [];
    for (let c = x; c < x + w; c++) for (let r = y; r < y + h; r++) this.L.doorCells.push([c, r]);
    return this;
  }

  _item(kind, x, y, extra) {
    const T = CONFIG.TILE;
    const radius = { coin: 9, special: 14, fire: 11, power: 13, key: 12 }[kind];
    this.L.items.push(Object.assign({
      kind, x: (x + 0.5) * T, y: (y + 0.5) * T, r: radius, taken: false,
      phase: (x * 0.7 + y) % 6.28, respawn: kind === 'power' || kind === 'fire', regen: false, regenT: 0
    }, extra || {}));
  }
  coins(x, y, n = 1, dx = 1, dy = 0) { for (let i = 0; i < n; i++) this._item('coin', x + i * dx, y + i * dy); return this; }
  // arco de moedas (por cima de um buraco, por exemplo)
  coinArc(x, y, n, height = 2) {
    for (let i = 0; i < n; i++) {
      const k = n === 1 ? 0.5 : i / (n - 1);
      this._item('coin', x + i, y - Math.sin(k * Math.PI) * height);
    }
    return this;
  }
  special(x, y) { this._item('special', x, y, { index: this.L.specialCount++ }); return this; }
  fire(x, y, regen = false) { this._item('fire', x, y, { regen }); return this; }
  power(x, y) { this._item('power', x, y); return this; }
  key(x, y) { this._item('key', x, y); return this; }

  enemy(type, x, y = this.G - 1, opts) {
    this.L.enemySpawns.push({ type, x, y, opts: opts || {} });
    return this;
  }
  moving(x, y, w, dx, dy = 0, speed = 60, ice = false) { this.L.platforms.push(new MovingPlatform(x, y, w, dx, dy, speed, ice)); return this; }
  crumble(x, y, w = 2) { this.L.platforms.push(new CrumblePlatform(x, y, w)); return this; }
  vent(x, y = this.G, phase = 0) { this.L.vents.push(new Vent(x, y, phase)); return this; }

  checkpoint(x, y = this.G) {
    const T = CONFIG.TILE;
    this.L.checkpoints.push({ x: x * T + 6, y: y * T - 56, w: 20, h: 56, active: false, spawnX: (x + 0.5) * T, spawnY: y * T });
    return this;
  }
  start(x, y = this.G) { this.L.start = { x: (x + 0.5) * CONFIG.TILE, y: y * CONFIG.TILE }; return this; }
  exit(x, y = this.G) {
    const T = CONFIG.TILE;
    this.L.exit = { x: x * T - 8, y: y * T - 80, w: 48, h: 80 };
    return this;
  }
  sign(x, y, text) { this.L.signs.push({ x: (x + 0.5) * CONFIG.TILE, y: (y + 0.5) * CONFIG.TILE, text }); return this; }
  // Arena do chefe: x0..x1 em blocos, chefe nasce em bx
  boss(x0, x1, bx) {
    const T = CONFIG.TILE;
    this.L.bossArena = { x0: x0 * T, x1: x1 * T, spawnX: bx * T, spawnY: this.G * T };
    return this;
  }
}

/* ---------- Fase ---------- */
class Level {
  constructor(def) {
    this.def = def;
    this.id = def.id;
    this.name = def.name;
    this.theme = THEMES[def.theme];
    this.width = def.width;
    this.height = def.height || CONFIG.VIEW_ROWS;
    this.tiles = new Uint8Array(this.width * this.height);
    this.items = [];
    this.enemySpawns = [];
    this.platforms = [];
    this.checkpoints = [];
    this.vents = [];
    this.signs = [];
    this.decor = [];
    this.doorCells = null;
    this.doorOpen = false;
    this.specialCount = 0;
    this.exit = null;
    this.bossArena = null;
    this.start = { x: 64, y: (this.height - 3) * CONFIG.TILE };
    def.build(new LevelBuilder(this));
    this.pixelWidth = this.width * CONFIG.TILE;
    this.pixelHeight = this.height * CONFIG.TILE;
    this.keysTotal = this.items.filter((i) => i.kind === 'key').length;
    this._makeDecor();
  }

  idx(c, r) { return r * this.width + c; }
  setTile(c, r, t) {
    if (c < 0 || c >= this.width || r < 0 || r >= this.height) return;
    this.tiles[this.idx(c, r)] = t;
  }
  tileAt(c, r) {
    if (c < 0 || c >= this.width) return TILE.BLOCK; // paredes invisíveis nas bordas
    if (r < 0 || r >= this.height) return TILE.EMPTY;
    return this.tiles[this.idx(c, r)];
  }
  isSolid(c, r) { return TILE_SOLID[this.tileAt(c, r)]; }
  // algo em que um inimigo pode pisar
  isStandable(c, r) {
    const t = this.tileAt(c, r);
    return TILE_SOLID[t] || t === TILE.PLATFORM;
  }

  breakBlock(c, r, game) {
    if (this.tileAt(c, r) !== TILE.BREAK) return false;
    const T = CONFIG.TILE;
    this.setTile(c, r, TILE.EMPTY);
    game.particles.debris((c + 0.5) * T, (r + 0.5) * T, this.theme.breakColor);
    game.addScore(CONFIG.SCORE.BLOCK, (c + 0.5) * T, r * T);
    Sound.play('break');
    return true;
  }

  openDoor(game) {
    if (!this.doorCells || this.doorOpen) return;
    this.doorOpen = true;
    const T = CONFIG.TILE;
    this.doorCells.forEach(([c, r]) => {
      this.setTile(c, r, TILE.EMPTY);
      game.particles.burst((c + 0.5) * T, (r + 0.5) * T, 4, '#caa6ff', 120, 12);
    });
    Sound.play('door');
  }

  closeDoor() {
    if (!this.doorCells) return;
    this.doorCells.forEach(([c, r]) => this.setTile(c, r, TILE.DOOR));
  }

  // Decoração gerada de forma determinística (mesma semente = mesmo cenário)
  _makeDecor() {
    let seed = this.id * 9301 + 49297;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const kinds = this.theme.decor;
    const T = CONFIG.TILE;
    for (let c = 1; c < this.width - 1; c++) {
      for (let r = 1; r < this.height; r++) {
        if (this.tileAt(c, r) === TILE.GROUND && this.tileAt(c, r - 1) === TILE.EMPTY) {
          const roll = rand();
          if (roll < this.theme.decorDensity) {
            const kind = kinds[Math.floor(rand() * kinds.length)];
            this.decor.push({ kind, x: (c + 0.5) * T, y: r * T, s: 0.75 + rand() * 0.5, v: rand() });
          }
          break;
        }
      }
    }
  }
}
