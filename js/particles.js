/* =========================================================
   PARTICLES — partículas simples e textos flutuantes.
   Usa um array com limite para não pesar no celular.
   ========================================================= */
class ParticleSystem {
  constructor() {
    this.list = [];
    this.texts = [];
  }

  clear() { this.list.length = 0; this.texts.length = 0; }

  add(p) {
    if (this.list.length >= CONFIG.PARTICLE_LIMIT) this.list.shift();
    this.list.push(p);
  }

  // explosão radial de partículas
  burst(x, y, n, color, speed = 120, spread = 4, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.add({
        x: x + (Math.random() - 0.5) * spread * 2,
        y: y + (Math.random() - 0.5) * spread,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - (opts.up || 40),
        g: opts.g !== undefined ? opts.g : 500,
        life: opts.life || 0.5 + Math.random() * 0.3,
        max: opts.life || 0.8,
        size: opts.size || 2 + Math.random() * 3,
        color,
        shape: opts.shape || 'square'
      });
    }
  }

  // poeira ao pular/aterrissar
  dust(x, y, n = 6) {
    for (let i = 0; i < n; i++) {
      this.add({
        x: x + (Math.random() - 0.5) * 16, y,
        vx: (Math.random() - 0.5) * 90, vy: -Math.random() * 50,
        g: 60, life: 0.35 + Math.random() * 0.2, max: 0.55,
        size: 3 + Math.random() * 3, color: 'rgba(255,255,255,0.7)', shape: 'circle'
      });
    }
  }

  // estilhaços de bloco quebrado
  debris(x, y, color) {
    for (let i = 0; i < 8; i++) {
      this.add({
        x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 260, vy: -150 - Math.random() * 220,
        g: 1300, life: 0.9, max: 0.9, size: 5 + Math.random() * 4, color, shape: 'square', spin: true
      });
    }
  }

  sparkle(x, y, color = '#fff6a8', n = 8) {
    this.burst(x, y, n, color, 110, 4, { g: 0, up: 0, life: 0.45, shape: 'star', size: 3 });
  }

  text(x, y, str, color = '#fff') {
    this.texts.push({ x, y, str, color, life: 0.9 });
  }

  update(dt) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.life -= dt;
      if (p.life <= 0) { l.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    const t = this.texts;
    for (let i = t.length - 1; i >= 0; i--) {
      t[i].life -= dt;
      t[i].y -= 40 * dt;
      if (t[i].life <= 0) t.splice(i, 1);
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.list.length; i++) {
      const p = this.list[i];
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5));
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      } else if (p.shape === 'star') {
        const s = p.size;
        ctx.fillRect(p.x - s, p.y - 0.8, s * 2, 1.6);
        ctx.fillRect(p.x - 0.8, p.y - s, 1.6, s * 2);
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
    if (this.texts.length) {
      ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      for (let i = 0; i < this.texts.length; i++) {
        const t = this.texts[i];
        ctx.globalAlpha = Math.min(1, t.life * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillText(t.str, t.x + 1, t.y + 1);
        ctx.fillStyle = t.color;
        ctx.fillText(t.str, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    }
  }
}
