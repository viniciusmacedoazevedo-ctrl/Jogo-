/* =========================================================
   RENDER — desenho do cenário: céu, parallax, blocos,
   decoração, itens, checkpoints, portal e efeitos.
   Sprites de blocos e camadas de fundo são pré-desenhados
   em canvases fora da tela (cache) para economizar CPU.
   ========================================================= */
const Render = {
  canvas: null,
  ctx: null,
  scale: 1,
  dpr: 1,
  viewW: 800,
  viewH: CONFIG.VIEW_ROWS * CONFIG.TILE,
  tileCache: {},
  bgCache: {},
  ambient: [],
  skyGrad: null,
  skyTheme: null,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.resize();
  },

  resize() {
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    const maxDpr = Save.data && Save.data.settings.quality === 'low' ? CONFIG.LOW_DPR : CONFIG.MAX_DPR;
    this.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    this.scale = cssH / this.viewH;
    this.viewW = Math.ceil(cssW / this.scale);
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.skyGrad = null;
  },

  beginFrame() {
    const k = this.scale * this.dpr;
    this.ctx.setTransform(k, 0, 0, k, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
  },

  /* ---------------- cache de blocos ---------------- */
  tiles(theme) {
    const key = theme.background;
    if (this.tileCache[key]) return this.tileCache[key];
    const S = 2; // desenha em 2x para ficar nítido em telas retina
    const T = CONFIG.TILE;
    const make = (fn) => {
      const c = document.createElement('canvas');
      c.width = T * S; c.height = T * S;
      const g = c.getContext('2d');
      g.scale(S, S);
      fn(g, T);
      return c;
    };
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed % 1000) / 1000; };
    const castle = key === 'castle';

    const groundInner = (g, T) => {
      g.fillStyle = theme.ground; g.fillRect(0, 0, T, T);
      if (castle) {
        g.strokeStyle = theme.groundDark; g.lineWidth = 1.5;
        g.strokeRect(0.75, 0.75, T - 1.5, T / 2 - 1); g.strokeRect(-T / 2, T / 2, T, T / 2 - 0.75); g.strokeRect(T / 2, T / 2, T, T / 2 - 0.75);
        return;
      }
      g.fillStyle = theme.groundDark;
      for (let i = 0; i < 5; i++) {
        g.globalAlpha = 0.35 + rnd() * 0.3;
        g.beginPath(); g.ellipse(rnd() * T, rnd() * T, 2 + rnd() * 3, 1.5 + rnd() * 2, 0, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
    };

    const sprites = {
      ground: make(groundInner),
      groundTop: make((g, T) => {
        groundInner(g, T);
        g.fillStyle = theme.top;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(T, 0); g.lineTo(T, 9);
        for (let x = T; x >= 0; x -= 4) g.lineTo(x, 9 + ((x / 4) % 2 === 0 ? 3 : 0));
        g.closePath(); g.fill();
        g.fillStyle = theme.topLight;
        g.fillRect(0, 0, T, 3);
        if (key === 'forest') {
          g.fillStyle = theme.topLight;
          for (let i = 0; i < 4; i++) { const x = rnd() * T; g.fillRect(x, 3, 1.5, 4); }
        }
      }),
      block: make((g, T) => {
        g.fillStyle = theme.blockDark; g.fillRect(0, 0, T, T);
        g.fillStyle = theme.block; g.fillRect(1.5, 1.5, T - 3, T - 3);
        g.fillStyle = theme.blockLight; g.fillRect(1.5, 1.5, T - 3, 3); g.fillRect(1.5, 1.5, 3, T - 3);
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(4, T - 5, T - 5.5, 3.5); g.fillRect(T - 5, 4, 3.5, T - 5.5);
        if (castle) {
          g.fillStyle = theme.blockDark; g.fillRect(0, T / 2 - 1, T, 2); g.fillRect(T / 2 - 1, 0, 2, T / 2);
        } else {
          g.fillStyle = 'rgba(255,255,255,0.18)';
          g.beginPath(); g.arc(T / 2, T / 2, 4, 0, Math.PI * 2); g.fill();
        }
      }),
      platform: make((g, T) => {
        g.fillStyle = theme.plat; g.fillRect(0, 0, T, 12);
        g.fillStyle = theme.platTop; g.fillRect(0, 0, T, 4);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 11, T, 2);
        g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(T - 2, 0, 2, 12);
        g.fillStyle = theme.plat; g.fillRect(6, 12, 3, 6); g.fillRect(T - 9, 12, 3, 6);
      }),
      ice: make((g, T) => {
        const ice = theme.ice || '#a9e4ff', iceDark = theme.iceDark || '#6fbde6';
        g.fillStyle = iceDark; g.fillRect(0, 0, T, T);
        g.fillStyle = ice; g.fillRect(1, 1, T - 2, T - 2);
        g.fillStyle = 'rgba(255,255,255,0.7)';
        g.beginPath(); g.moveTo(4, T - 4); g.lineTo(T - 10, 4); g.lineTo(T - 6, 4); g.lineTo(8, T - 4); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(1, 1, T - 2, 3);
      }),
      breakable: make((g, T) => {
        g.fillStyle = theme.blockDark; g.fillRect(0, 0, T, T);
        g.fillStyle = theme.breakColor; g.fillRect(1.5, 1.5, T - 3, T - 3);
        g.strokeStyle = theme.blockDark; g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(6, 3); g.lineTo(13, 13); g.lineTo(9, 20); g.lineTo(15, 29);
        g.moveTo(13, 13); g.lineTo(24, 10); g.lineTo(29, 4);
        g.moveTo(24, 10); g.lineTo(22, 22); g.lineTo(29, 27);
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(1.5, 1.5, T - 3, 3);
      }),
      spikes: make((g, T) => {
        g.fillStyle = '#6b6f86'; g.fillRect(0, T - 6, T, 6);
        for (let i = 0; i < 4; i++) {
          const x = i * 8;
          const grd = g.createLinearGradient(x, 0, x + 8, 0);
          grd.addColorStop(0, '#f4f6ff'); grd.addColorStop(1, '#9aa0bb');
          g.fillStyle = grd;
          g.beginPath(); g.moveTo(x, T - 6); g.lineTo(x + 4, T - 22); g.lineTo(x + 8, T - 6); g.fill();
        }
      }),
      door: make((g, T) => {
        g.fillStyle = '#2a1d3d'; g.fillRect(0, 0, T, T);
        g.fillStyle = '#4b336b'; g.fillRect(2, 0, T - 4, T);
        g.fillStyle = '#8b6bb8'; g.fillRect(2, 0, 3, T); g.fillRect(T - 5, 0, 3, T);
        g.fillStyle = '#caa6ff';
        g.beginPath(); g.arc(T / 2, T / 2, 4, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#2a1d3d'; g.fillRect(T / 2 - 1, T / 2, 2, 6);
      }),
      lava: make((g, T) => {
        g.fillStyle = theme.lavaDark || '#c22a12'; g.fillRect(0, 0, T, T);
        g.fillStyle = theme.lava || '#ff5a1f';
        g.beginPath(); g.ellipse(10, 12, 7, 4, 0, 0, Math.PI * 2); g.ellipse(24, 24, 6, 3, 0, 0, Math.PI * 2); g.fill();
      })
    };
    this.tileCache[key] = sprites;
    return sprites;
  },

  /* ---------------- fundo com parallax ---------------- */
  background(theme) {
    const key = theme.background;
    if (this.bgCache[key]) return this.bgCache[key];
    const W = 1024, H = this.viewH;
    const layer = (fn) => {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      fn(c.getContext('2d'), W, H);
      return c;
    };
    const wave = (g, color, base, amps, W, H) => {
      g.fillStyle = color;
      g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) {
        let y = base;
        amps.forEach(([a, f]) => { y -= Math.sin((x / W) * Math.PI * 2 * f) * a; });
        g.lineTo(x, y);
      }
      g.lineTo(W, H); g.closePath(); g.fill();
    };
    const peaks = (g, color, base, count, height, W, H, snow) => {
      const step = W / count;
      for (let i = -1; i <= count; i++) {
        const x = i * step + step / 2;
        const h = height * (0.7 + ((i * 37) % 10) / 30);
        g.fillStyle = color;
        g.beginPath(); g.moveTo(x - step * 0.75, base); g.lineTo(x, base - h); g.lineTo(x + step * 0.75, base); g.fill();
        if (snow) {
          g.fillStyle = snow;
          g.beginPath(); g.moveTo(x - h * 0.22, base - h * 0.72); g.lineTo(x, base - h); g.lineTo(x + h * 0.22, base - h * 0.72);
          g.lineTo(x + h * 0.08, base - h * 0.66); g.lineTo(x - h * 0.05, base - h * 0.74); g.closePath(); g.fill();
        }
      }
      g.fillRect(0, base, W, H - base);
    };
    const towers = (g, color, base, W, H, windows) => {
      g.fillStyle = color;
      for (let i = 0; i < 8; i++) {
        const x = i * 128 + ((i * 53) % 40);
        const tw = 40 + ((i * 29) % 30), th = 120 + ((i * 71) % 110);
        g.fillRect(x, base - th, tw, th + H);
        for (let k = 0; k < tw; k += 12) g.fillRect(x + k, base - th - 10, 7, 10);
        g.beginPath(); g.moveTo(x - 4, base - th - 10); g.lineTo(x + tw / 2, base - th - 50); g.lineTo(x + tw + 4, base - th - 10); g.fill();
        if (windows) {
          g.fillStyle = windows;
          g.fillRect(x + tw / 2 - 4, base - th + 30, 8, 14);
          g.fillStyle = color;
        }
      }
      g.fillRect(0, base, W, H - base);
    };

    let layers;
    switch (key) {
      case 'hills':
        layers = [
          { f: 0.15, c: layer((g, W, H) => wave(g, theme.far, H * 0.55, [[30, 2], [18, 5]], W, H)) },
          { f: 0.35, c: layer((g, W, H) => {
            wave(g, theme.mid, H * 0.7, [[26, 3], [10, 7]], W, H);
            // árvores distantes
            g.fillStyle = theme.near;
            for (let i = 0; i < 18; i++) {
              const x = (i * 59) % W, y = H * 0.7 - Math.sin((x / W) * Math.PI * 6) * 26;
              g.beginPath(); g.arc(x, y - 12, 14, 0, Math.PI * 2); g.arc(x + 10, y - 4, 11, 0, Math.PI * 2); g.fill();
            }
          }) },
          { f: 0.6, c: layer((g, W, H) => wave(g, theme.near, H * 0.86, [[18, 4], [8, 9]], W, H)) }
        ];
        break;
      case 'dunes':
        layers = [
          { f: 0.12, c: layer((g, W, H) => {
            // mesas de pedra ao longe
            g.fillStyle = theme.far;
            for (let i = 0; i < 4; i++) {
              const x = i * 256 + 40, w = 120 + i * 20, h = 80 + (i % 2) * 40;
              g.beginPath(); g.moveTo(x, H * 0.62); g.lineTo(x + 18, H * 0.62 - h); g.lineTo(x + w - 18, H * 0.62 - h); g.lineTo(x + w, H * 0.62); g.fill();
            }
            g.fillRect(0, H * 0.62, W, H);
          }) },
          { f: 0.3, c: layer((g, W, H) => wave(g, theme.mid, H * 0.72, [[22, 2], [12, 5]], W, H)) },
          { f: 0.55, c: layer((g, W, H) => wave(g, theme.near, H * 0.86, [[16, 3], [6, 8]], W, H)) }
        ];
        break;
      case 'peaks':
        layers = [
          { f: 0.1, c: layer((g, W, H) => peaks(g, theme.far, H * 0.66, 5, 220, W, H, '#ffffff')) },
          { f: 0.28, c: layer((g, W, H) => peaks(g, theme.mid, H * 0.76, 7, 150, W, H, '#f2f8ff')) },
          { f: 0.55, c: layer((g, W, H) => {
            wave(g, theme.near, H * 0.88, [[10, 3], [5, 8]], W, H);
            g.fillStyle = '#5d78b0';
            for (let i = 0; i < 14; i++) {
              const x = (i * 73) % W, y = H * 0.88;
              g.beginPath(); g.moveTo(x - 12, y); g.lineTo(x, y - 46); g.lineTo(x + 12, y); g.fill();
            }
          }) }
        ];
        break;
      case 'volcano':
        layers = [
          { f: 0.08, c: layer((g, W, H) => {
            g.fillStyle = theme.far;
            g.beginPath(); g.moveTo(180, H * 0.7); g.lineTo(420, H * 0.22); g.lineTo(500, H * 0.22); g.lineTo(760, H * 0.7); g.fill();
            g.fillRect(0, H * 0.7, W, H);
            const glow = g.createRadialGradient(460, H * 0.22, 5, 460, H * 0.22, 120);
            glow.addColorStop(0, 'rgba(255,140,40,0.8)'); glow.addColorStop(1, 'rgba(255,90,31,0)');
            g.fillStyle = glow; g.fillRect(300, 0, 320, H * 0.5);
            g.fillStyle = '#ff7a2a';
            g.beginPath(); g.moveTo(440, H * 0.22); g.lineTo(452, H * 0.4); g.lineTo(462, H * 0.3); g.lineTo(470, H * 0.45); g.lineTo(480, H * 0.22); g.fill();
          }) },
          { f: 0.3, c: layer((g, W, H) => peaks(g, theme.mid, H * 0.8, 6, 170, W, H, null)) },
          { f: 0.55, c: layer((g, W, H) => wave(g, theme.near, H * 0.9, [[14, 3], [8, 7]], W, H)) }
        ];
        break;
      default: // castle
        layers = [
          { f: 0.1, c: layer((g, W, H) => towers(g, theme.far, H * 0.7, W, H, 'rgba(255,210,120,0.55)')) },
          { f: 0.3, c: layer((g, W, H) => {
            // arcos da muralha
            g.fillStyle = theme.mid;
            g.fillRect(0, H * 0.55, W, H);
            g.fillStyle = theme.far;
            for (let x = 20; x < W; x += 128) {
              g.beginPath(); g.moveTo(x, H); g.lineTo(x, H * 0.7); g.arc(x + 44, H * 0.7, 44, Math.PI, 0); g.lineTo(x + 88, H); g.fill();
            }
            g.fillStyle = theme.mid;
            for (let k = 0; k < W; k += 32) g.fillRect(k, H * 0.55 - 14, 18, 14);
          }) },
          { f: 0.55, c: layer((g, W, H) => {
            g.fillStyle = theme.near;
            for (let x = 0; x < W; x += 256) {
              g.fillRect(x + 40, H * 0.35, 36, H);
              g.fillRect(x + 32, H * 0.35, 52, 14);
            }
          }) }
        ];
    }
    this.bgCache[key] = layers;
    return layers;
  },

  drawSky(theme, camera, level, time) {
    const ctx = this.ctx, W = this.viewW, H = this.viewH;
    if (!this.skyGrad || this.skyTheme !== theme) {
      this.skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      this.skyGrad.addColorStop(0, theme.sky[0]);
      this.skyGrad.addColorStop(1, theme.sky[1]);
      this.skyTheme = theme;
      this.initAmbient(theme);
    }
    ctx.fillStyle = this.skyGrad;
    ctx.fillRect(0, 0, W, H);

    // sol / lua
    if (theme.sun) {
      const sx = W * 0.78 - camera.x * 0.02, sy = 70;
      ctx.fillStyle = theme.sun;
      ctx.globalAlpha = 0.25;
      ctx.beginPath(); ctx.arc(sx, sy, 52, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(sx, sy, 34, 0, Math.PI * 2); ctx.fill();
      if (theme.background === 'castle') {
        ctx.fillStyle = theme.sky[0];
        ctx.beginPath(); ctx.arc(sx + 12, sy - 8, 30, 0, Math.PI * 2); ctx.fill();
      }
    }
    // nuvens
    if (theme.background === 'hills' || theme.background === 'dunes' || theme.background === 'peaks') {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let i = 0; i < 5; i++) {
        const span = W + 300;
        const x = ((i * 260 - camera.x * 0.08 + time * 8) % span + span) % span - 150;
        const y = 40 + (i * 47) % 110;
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.arc(x + 20, y - 8, 22, 0, Math.PI * 2); ctx.arc(x + 44, y, 17, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // camadas de parallax (ancoradas na base da fase)
    const layers = this.background(theme);
    const bottomGap = level.pixelHeight - H - camera.y; // 0 quando a câmera está no fundo
    for (let i = 0; i < layers.length; i++) {
      const L = layers[i];
      const off = -((camera.x * L.f) % 1024);
      const y = bottomGap * L.f * 0.6;
      for (let x = off; x < W; x += 1024) ctx.drawImage(L.c, Math.floor(x), Math.floor(y));
      if (y < 0) { /* camada subiu: nada a fazer */ }
    }
  },

  /* ---------------- partículas de ambiente (tela) ---------------- */
  initAmbient(theme) {
    this.ambient = [];
    const n = theme.ambient === 'leaves' ? 10 : 26;
    for (let i = 0; i < n; i++) {
      this.ambient.push({ x: Math.random() * 1400, y: Math.random() * this.viewH, s: Math.random(), p: Math.random() * 6 });
    }
  },

  drawAmbient(theme, camera, dt, time) {
    const ctx = this.ctx, W = this.viewW, H = this.viewH;
    const kind = theme.ambient;
    for (let i = 0; i < this.ambient.length; i++) {
      const a = this.ambient[i];
      let vx = 0, vy = 0, color, size;
      switch (kind) {
        case 'snow': vx = -15 + Math.sin(time + a.p) * 12; vy = 30 + a.s * 30; color = '#fff'; size = 1.5 + a.s * 2; break;
        case 'embers': vx = Math.sin(time * 2 + a.p) * 15; vy = -30 - a.s * 40; color = a.s > 0.5 ? '#ffb23d' : '#ff5a1f'; size = 1 + a.s * 2; break;
        case 'dust': vx = -40 - a.s * 30; vy = Math.sin(time + a.p) * 5; color = 'rgba(255,240,200,0.6)'; size = 1 + a.s * 1.5; break;
        case 'motes': vx = Math.sin(time * 0.7 + a.p) * 8; vy = -8 - a.s * 6; color = 'rgba(200,180,255,0.55)'; size = 1 + a.s * 1.8; break;
        default: vx = -20 + Math.sin(time + a.p) * 25; vy = 25 + a.s * 15; color = a.s > 0.5 ? '#7ad65a' : '#e8c34a'; size = 3; break;
      }
      a.x += vx * dt; a.y += vy * dt;
      if (a.y > H + 10) { a.y = -10; a.x = Math.random() * (W + 200); }
      if (a.y < -10) { a.y = H + 10; a.x = Math.random() * (W + 200); }
      const sx = ((a.x - camera.x * 0.3) % (W + 200) + (W + 200)) % (W + 200) - 100;
      ctx.fillStyle = color;
      if (kind === 'leaves') {
        ctx.save(); ctx.translate(sx, a.y); ctx.rotate(time * 2 + a.p);
        ctx.beginPath(); ctx.ellipse(0, 0, size, size * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      } else {
        ctx.fillRect(sx, a.y, size, size);
      }
    }
  },

  /* ---------------- blocos ---------------- */
  drawTiles(level, camera, time) {
    const ctx = this.ctx, T = CONFIG.TILE;
    const sprites = this.tiles(level.theme);
    const c0 = Math.max(0, Math.floor(camera.x / T)), c1 = Math.min(level.width - 1, Math.floor((camera.x + this.viewW) / T));
    const r0 = Math.max(0, Math.floor(camera.y / T)), r1 = Math.min(level.height - 1, Math.floor((camera.y + this.viewH) / T));
    const lava = level.theme.lava || '#ff5a1f', lavaLight = level.theme.lavaLight || '#ffc23d';
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = level.tiles[r * level.width + c];
        if (!t) continue;
        const x = c * T, y = r * T;
        switch (t) {
          case TILE.GROUND: {
            const above = r > 0 ? level.tiles[(r - 1) * level.width + c] : 0;
            ctx.drawImage(above === TILE.GROUND ? sprites.ground : sprites.groundTop, x, y, T, T);
            break;
          }
          case TILE.BLOCK: ctx.drawImage(sprites.block, x, y, T, T); break;
          case TILE.PLATFORM: ctx.drawImage(sprites.platform, x, y, T, T); break;
          case TILE.ICE: ctx.drawImage(sprites.ice, x, y, T, T); break;
          case TILE.BREAK: ctx.drawImage(sprites.breakable, x, y, T, T); break;
          case TILE.SPIKES: ctx.drawImage(sprites.spikes, x, y, T, T); break;
          case TILE.DOOR: ctx.drawImage(sprites.door, x, y, T, T); break;
          case TILE.LAVA: {
            const above = r > 0 ? level.tiles[(r - 1) * level.width + c] : 0;
            ctx.drawImage(sprites.lava, x, y, T, T);
            if (above !== TILE.LAVA) {
              // superfície ondulada animada
              ctx.fillStyle = lava;
              ctx.beginPath(); ctx.moveTo(x, y + T);
              for (let k = 0; k <= T; k += 8) ctx.lineTo(x + k, y + 4 + Math.sin(time * 3 + (x + k) * 0.08) * 3);
              ctx.lineTo(x + T, y + T); ctx.fill();
              ctx.fillStyle = lavaLight;
              ctx.fillRect(x, y + 5 + Math.sin(time * 3 + x * 0.08) * 3, T, 3);
            }
            break;
          }
        }
      }
    }
  },

  // brilho da lava por cima (efeito de calor)
  drawLavaGlow(level, camera) {
    if (!level.theme.lava) return;
    const ctx = this.ctx;
    const bottom = level.pixelHeight; // coordenadas do mundo
    if (bottom - camera.y > this.viewH + 110) return;
    const g = ctx.createLinearGradient(0, bottom - 110, 0, bottom);
    g.addColorStop(0, 'rgba(255,90,31,0)');
    g.addColorStop(1, 'rgba(255,90,31,0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(camera.x, bottom - 110, this.viewW, 110);
  },

  /* ---------------- decoração ---------------- */
  drawDecor(level, camera, time) {
    const ctx = this.ctx;
    for (let i = 0; i < level.decor.length; i++) {
      const d = level.decor[i];
      if (d.x < camera.x - 80 || d.x > camera.x + this.viewW + 80) continue;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.scale(d.s, d.s);
      drawDecorItem(ctx, d, level.theme, time);
      ctx.restore();
    }
  },

  /* ---------------- objetos ---------------- */
  drawSigns(level, camera) {
    const ctx = this.ctx;
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const s of level.signs) {
      if (s.x < camera.x - 300 || s.x > camera.x + this.viewW + 300) continue;
      const text = !Input.isTouch && s.pcText ? s.pcText : s.text;
      const w = ctx.measureText(text).width + 20;
      ctx.fillStyle = 'rgba(20,16,40,0.55)';
      roundRect(ctx, s.x - w / 2, s.y - 13, w, 26, 8); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(text, s.x, s.y + 1);
    }
    ctx.textBaseline = 'alphabetic';
  },

  drawCheckpoint(cp, time) {
    const ctx = this.ctx;
    const x = cp.x + cp.w / 2, base = cp.y + cp.h;
    // poste
    ctx.fillStyle = '#5b4a3a';
    ctx.fillRect(x - 2, base - 50, 4, 50);
    ctx.fillStyle = '#3e3228';
    ctx.fillRect(x - 7, base - 4, 14, 4);
    // lanterna-cristal
    const lit = cp.active;
    if (lit) {
      ctx.fillStyle = 'rgba(120,255,220,0.25)';
      ctx.beginPath(); ctx.arc(x, base - 52, 16 + Math.sin(time * 4) * 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = lit ? '#7dffe0' : '#6f7a8a';
    ctx.beginPath(); ctx.moveTo(x, base - 64); ctx.lineTo(x + 7, base - 52); ctx.lineTo(x, base - 42); ctx.lineTo(x - 7, base - 52); ctx.fill();
    ctx.fillStyle = lit ? '#e6fff9' : '#9aa5b5';
    ctx.beginPath(); ctx.moveTo(x, base - 61); ctx.lineTo(x + 2.5, base - 52); ctx.lineTo(x, base - 46); ctx.fill();
    // bandeirinha
    ctx.fillStyle = lit ? '#39cbbf' : '#8a8f9c';
    const wv = lit ? Math.sin(time * 6) * 2 : 0;
    ctx.beginPath(); ctx.moveTo(x + 2, base - 40); ctx.lineTo(x + 18, base - 36 + wv); ctx.lineTo(x + 2, base - 30); ctx.fill();
  },

  drawExit(exit, time) {
    const ctx = this.ctx;
    const cx = exit.x + exit.w / 2, cy = exit.y + exit.h / 2 + 4;
    // arco de pedra
    ctx.fillStyle = '#6d6a8a';
    ctx.beginPath(); ctx.ellipse(cx, cy, 30, 42, 0, 0, Math.PI * 2); ctx.fill();
    // redemoinho
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#8ef6ff'); g.addColorStop(1, '#6a4cff');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(cx, cy, 22, 34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = time * 3 + i * 2.09;
      ctx.beginPath(); ctx.ellipse(cx, cy, 14 - i * 3, 24 - i * 5, 0, a, a + 2.2); ctx.stroke();
    }
    // brilhinhos
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) {
      const a = time * 1.5 + i * 1.26;
      ctx.fillRect(cx + Math.cos(a) * 34 - 1.5, cy + Math.sin(a) * 46 - 1.5, 3, 3);
    }
  },

  drawItem(it, time) {
    const ctx = this.ctx;
    const bob = Math.sin(time * 3 + it.phase) * 3;
    const x = it.x, y = it.y + bob;
    switch (it.kind) {
      case 'coin': {
        // "semente-luz": moeda dourada girando
        const sx = Math.abs(Math.cos(time * 4 + it.phase));
        ctx.fillStyle = '#c98a12';
        ctx.beginPath(); ctx.ellipse(x, y, 8 * sx + 1.5, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd43b';
        ctx.beginPath(); ctx.ellipse(x, y, 6.5 * sx + 1, 7.5, 0, 0, Math.PI * 2); ctx.fill();
        if (sx > 0.4) {
          ctx.fillStyle = '#fff3b0';
          ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 2.5 * sx, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 2.5 * sx, y); ctx.fill();
        }
        break;
      }
      case 'special': {
        // moeda-estrela especial, maior, com auréola
        ctx.fillStyle = 'rgba(160,120,255,0.25)';
        ctx.beginPath(); ctx.arc(x, y, 20 + Math.sin(time * 5) * 2, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(time * 2) * 0.3);
        ctx.fillStyle = '#7b4dff';
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#b89bff';
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff6a8';
        starPath(ctx, 0, 0, 5, 8, 3.5); ctx.fill();
        ctx.restore();
        break;
      }
      case 'fire': {
        // carga de fogo: gota de brasa
        const f = 1 + Math.sin(time * 12 + it.phase) * 0.1;
        ctx.fillStyle = 'rgba(255,140,40,0.25)';
        ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff5a1f';
        ctx.beginPath(); ctx.moveTo(x, y - 11 * f); ctx.quadraticCurveTo(x + 9, y, x, y + 8); ctx.quadraticCurveTo(x - 9, y, x, y - 11 * f); ctx.fill();
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath(); ctx.moveTo(x, y - 5 * f); ctx.quadraticCurveTo(x + 4.5, y + 1, x, y + 5); ctx.quadraticCurveTo(x - 4.5, y + 1, x, y - 5 * f); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('+' + CONFIG.FIRE_PICKUP_CHARGES, x, y + 20);
        break;
      }
      case 'power': {
        // "Brasa Viva": semente flamejante dentro de uma bolha
        ctx.fillStyle = 'rgba(255,120,40,0.3)';
        ctx.beginPath(); ctx.arc(x, y, 20 + Math.sin(time * 6) * 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#8a4b2a';
        ctx.beginPath(); ctx.ellipse(x, y + 4, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
        const f = 1 + Math.sin(time * 18) * 0.15;
        ctx.fillStyle = '#ff5a1f';
        ctx.beginPath(); ctx.moveTo(x - 6, y + 2); ctx.quadraticCurveTo(x - 6, y - 8 * f, x, y - 12 * f); ctx.quadraticCurveTo(x + 6, y - 8 * f, x + 6, y + 2); ctx.fill();
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath(); ctx.moveTo(x - 3, y + 2); ctx.quadraticCurveTo(x - 3, y - 4 * f, x, y - 7 * f); ctx.quadraticCurveTo(x + 3, y - 4 * f, x + 3, y + 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.arc(x - 6, y - 7, 2.5, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'key': {
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(time * 2) * 0.2);
        ctx.fillStyle = 'rgba(255,220,100,0.3)';
        ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffcf3d';
        ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, -6, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillRect(-1.5, -1, 3, 14);
        ctx.fillRect(1.5, 7, 5, 2.5); ctx.fillRect(1.5, 11, 4, 2.5);
        ctx.fillStyle = '#7b4dff';
        ctx.beginPath(); ctx.arc(0, -6, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        break;
      }
    }
  },

  drawPlatform(p, level, time) {
    const ctx = this.ctx;
    const theme = level.theme;
    if (p.kind === 'crumble') {
      if (p.state === 'gone') {
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.setLineDash([4, 4]);
        ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1); ctx.setLineDash([]);
        return;
      }
      const shake = p.state === 'shaking' ? Math.sin(time * 70) * 1.5 : 0;
      const n = p.w / 16;
      for (let i = 0; i < n; i++) {
        const x = p.x + i * 16 + shake, y = p.y;
        ctx.fillStyle = theme.blockDark; ctx.fillRect(x, y, 16, p.h);
        ctx.fillStyle = theme.breakColor; ctx.fillRect(x + 1, y + 1, 14, p.h - 2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 7, y + 2, 1.5, p.h - 4);
      }
      return;
    }
    // plataforma móvel: barra com engrenagens
    const x = p.x, y = p.y, w = p.w;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 3, y + p.h, w - 6, 4);
    ctx.fillStyle = theme.plat; roundRect(ctx, x, y, w, p.h, 5); ctx.fill();
    ctx.fillStyle = theme.platTop; roundRect(ctx, x, y, w, 5, 3); ctx.fill();
    ctx.fillStyle = '#ffd23f';
    for (let k = 10; k < w - 6; k += 20) {
      ctx.beginPath(); ctx.arc(x + k, y + 9, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  },

  drawVent(v, time) {
    const ctx = this.ctx;
    // bico
    ctx.fillStyle = '#3a3240';
    ctx.fillRect(v.x - 2, v.baseY - 8, v.w + 4, 8);
    ctx.fillStyle = '#ff7a2a';
    ctx.fillRect(v.x + 4, v.baseY - 8, v.w - 8, 3);
    if (v.warning) {
      ctx.fillStyle = 'rgba(120,120,130,0.6)';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(v.x + v.w / 2 + Math.sin(time * 10 + i) * 4, v.baseY - 14 - i * 8, 4 + i, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (v.on) {
      const cx = v.x + v.w / 2;
      for (let i = 0; i < 3; i++) {
        const k = 1 - i * 0.28;
        ctx.fillStyle = ['#ff4a1a', '#ff9a3c', '#ffe68a'][i];
        ctx.beginPath();
        ctx.moveTo(cx - (v.w / 2) * k, v.baseY - 6);
        for (let s = 0; s <= 6; s++) {
          const yy = v.baseY - 6 - (v.h - 6) * (s / 6) * k;
          ctx.lineTo(cx - (v.w / 2) * k * (1 - s / 7) + Math.sin(time * 30 + s + i) * 3, yy);
        }
        for (let s = 6; s >= 0; s--) {
          const yy = v.baseY - 6 - (v.h - 6) * (s / 6) * k;
          ctx.lineTo(cx + (v.w / 2) * k * (1 - s / 7) + Math.sin(time * 27 + s + i) * 3, yy);
        }
        ctx.fill();
      }
    }
  },

  drawFireball(f, time) {
    const ctx = this.ctx;
    // rastro
    ctx.fillStyle = 'rgba(255,120,40,0.35)';
    ctx.beginPath(); ctx.arc(f.x - f.vx * 0.025, f.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,90,31,0.25)';
    ctx.beginPath(); ctx.arc(f.x - f.vx * 0.045, f.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(time * 20 * Math.sign(f.vx));
    ctx.fillStyle = '#ff5a1f';
    starPath(ctx, 0, 0, 5, 8, 4.5); ctx.fill();
    ctx.fillStyle = '#ffe68a';
    ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  drawEnemyShot(s, time) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(120,70,170,0.35)';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2350';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath(); ctx.arc(s.x + Math.sin(time * 20) * 2, s.y - 2, 3, 0, Math.PI * 2); ctx.fill();
  }
};

/* ---------------- utilitários de desenho ---------------- */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function starPath(ctx, x, y, points, outer, inner) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

// Decoração de cenário (origem = base do objeto sobre o chão)
function drawDecorItem(ctx, d, theme, time) {
  switch (d.kind) {
    case 'tree': {
      ctx.fillStyle = '#6b4526';
      ctx.fillRect(-5, -46, 10, 46);
      const sway = Math.sin(time * 1.5 + d.v * 6) * 2;
      ctx.fillStyle = '#2f8a45';
      ctx.beginPath(); ctx.arc(sway, -62, 24, 0, Math.PI * 2); ctx.arc(-16 + sway, -48, 16, 0, Math.PI * 2); ctx.arc(16 + sway, -48, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#48b25a';
      ctx.beginPath(); ctx.arc(-6 + sway, -68, 13, 0, Math.PI * 2); ctx.arc(10 + sway, -56, 9, 0, Math.PI * 2); ctx.fill();
      if (d.v > 0.6) {
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath(); ctx.arc(8 + sway, -60, 3, 0, Math.PI * 2); ctx.arc(-10 + sway, -52, 3, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'bush':
      ctx.fillStyle = '#3c9e4f';
      ctx.beginPath(); ctx.arc(-9, -8, 10, 0, Math.PI * 2); ctx.arc(4, -11, 12, 0, Math.PI * 2); ctx.arc(14, -6, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5cc56a';
      ctx.beginPath(); ctx.arc(2, -15, 5, 0, Math.PI * 2); ctx.fill();
      break;
    case 'flower': {
      ctx.strokeStyle = '#2f8a45'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(time * 2 + d.v * 5) * 2, -14); ctx.stroke();
      const colors = ['#ff6b9a', '#ffd23f', '#9b7bff', '#ffffff'];
      ctx.fillStyle = colors[Math.floor(d.v * 4)];
      const fx = Math.sin(time * 2 + d.v * 5) * 2;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 3.5, -14 + Math.sin(a) * 3.5, 2.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#ffb300';
      ctx.beginPath(); ctx.arc(fx, -14, 2.2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'grass':
      ctx.fillStyle = '#3fae4f';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(i * 4 - 2, 0); ctx.lineTo(i * 4 + Math.sin(time * 3 + i) * 1.5, -8 - Math.abs(i) * -1); ctx.lineTo(i * 4 + 2, 0); ctx.fill();
      }
      break;
    case 'cactus':
      ctx.fillStyle = '#3f9a55';
      roundRect(ctx, -6, -44, 12, 44, 6); ctx.fill();
      roundRect(ctx, -18, -30, 8, 18, 4); ctx.fill();
      ctx.fillRect(-14, -16, 10, 6);
      roundRect(ctx, 10, -36, 8, 16, 4); ctx.fill();
      ctx.fillRect(4, -24, 10, 6);
      ctx.fillStyle = '#5fbf6f'; ctx.fillRect(-2, -40, 2, 36);
      if (d.v > 0.5) { ctx.fillStyle = '#ff6b9a'; ctx.beginPath(); ctx.arc(0, -45, 4, 0, Math.PI * 2); ctx.fill(); }
      break;
    case 'rock':
      ctx.fillStyle = theme.blockDark;
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-10, -12); ctx.lineTo(2, -16); ctx.lineTo(13, -8); ctx.lineTo(15, 0); ctx.fill();
      ctx.fillStyle = theme.blockLight;
      ctx.beginPath(); ctx.moveTo(-9, -10); ctx.lineTo(1, -14); ctx.lineTo(4, -9); ctx.fill();
      break;
    case 'dryGrass':
      ctx.strokeStyle = '#b8863b'; ctx.lineWidth = 1.5;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 3, 0); ctx.lineTo(i * 5, -10 + Math.abs(i)); ctx.stroke(); }
      break;
    case 'pine':
      ctx.fillStyle = '#6b4a3a'; ctx.fillRect(-3, -12, 6, 12);
      ctx.fillStyle = '#2f6f6a';
      for (let i = 0; i < 3; i++) {
        const y = -12 - i * 14, w = 20 - i * 5;
        ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(0, y - 22); ctx.lineTo(w, y); ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 3; i++) {
        const y = -12 - i * 14, w = 20 - i * 5;
        ctx.beginPath(); ctx.moveTo(-w * 0.45, y - 11); ctx.lineTo(0, y - 22); ctx.lineTo(w * 0.45, y - 11); ctx.fill();
      }
      break;
    case 'crystal':
      ctx.fillStyle = 'rgba(170,230,255,0.9)';
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-3, -20); ctx.lineTo(1, -24); ctx.lineTo(4, -18); ctx.lineTo(6, 0); ctx.fill();
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(9, -12); ctx.lineTo(12, 0); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-1, -18, 1.5, 14);
      break;
    case 'snowRock':
      ctx.fillStyle = '#6a7aa0';
      ctx.beginPath(); ctx.ellipse(0, -6, 14, 8, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(0, -11, 10, 4, 0, Math.PI, Math.PI * 2); ctx.fill();
      break;
    case 'redCrystal':
      ctx.fillStyle = '#ff4a5a';
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-2, -18); ctx.lineTo(3, -14); ctx.lineTo(5, 0); ctx.fill();
      ctx.fillStyle = 'rgba(255,120,120,0.3)';
      ctx.beginPath(); ctx.arc(0, -10, 12 + Math.sin(time * 3 + d.v * 9) * 2, 0, Math.PI * 2); ctx.fill();
      break;
    case 'smoke':
      for (let i = 0; i < 3; i++) {
        const k = ((time * 0.5 + d.v + i / 3) % 1);
        ctx.fillStyle = `rgba(90,80,90,${0.35 * (1 - k)})`;
        ctx.beginPath(); ctx.arc(Math.sin(k * 6 + d.v * 5) * 5, -6 - k * 50, 5 + k * 10, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 'torch': {
      ctx.fillStyle = '#3a3240'; ctx.fillRect(-2, -46, 4, 16);
      ctx.fillStyle = '#6b5a4a'; ctx.fillRect(-5, -50, 10, 5);
      const f = 1 + Math.sin(time * 14 + d.v * 10) * 0.15;
      ctx.fillStyle = 'rgba(255,170,60,0.22)';
      ctx.beginPath(); ctx.arc(0, -58, 18 * f, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff7a2a';
      ctx.beginPath(); ctx.moveTo(-5, -50); ctx.quadraticCurveTo(-5, -60 * f, 0, -66 * f); ctx.quadraticCurveTo(5, -60 * f, 5, -50); ctx.fill();
      ctx.fillStyle = '#ffe68a';
      ctx.beginPath(); ctx.moveTo(-2, -50); ctx.quadraticCurveTo(-2, -56, 0, -59 * f); ctx.quadraticCurveTo(2, -56, 2, -50); ctx.fill();
      break;
    }
    case 'banner':
      ctx.fillStyle = '#2a2440'; ctx.fillRect(-12, -76, 24, 3);
      ctx.fillStyle = '#7b2d5a';
      ctx.beginPath(); ctx.moveTo(-10, -73); ctx.lineTo(10, -73); ctx.lineTo(10, -40 + Math.sin(time * 2 + d.v * 5) * 2); ctx.lineTo(0, -46); ctx.lineTo(-10, -40); ctx.fill();
      ctx.fillStyle = '#caa6ff';
      starPath(ctx, 0, -60, 4, 5, 2); ctx.fill();
      break;
    case 'chain':
      ctx.strokeStyle = '#6a6488'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(0, -90 + i * 8, 2.5, 4, 0, 0, Math.PI * 2); ctx.stroke(); }
      break;
  }
}
