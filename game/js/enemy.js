/* =========================================================
   ENEMY — inimigos originais, chefe final e projéteis.

   walker  "Brotolho"       : básico, anda e vira nas bordas
   runner  "Zunideira"      : besouro rápido
   armor   "Casco-de-Pedra" : casco com espinhos, só o fogo derrota
   flyer   "Lanterninha"    : voa em onda, pode ser pisado
   Chefe   "Morvak, o Guardião de Fuligem"
   ========================================================= */
const ENEMY_TYPES = {
  walker: { w: 26, h: 24, speed: () => CONFIG.ENEMY_SPEED, stompable: true, spiky: false, flying: false, score: () => CONFIG.SCORE.ENEMY },
  runner: { w: 26, h: 20, speed: () => CONFIG.FAST_ENEMY_SPEED, stompable: true, spiky: false, flying: false, score: () => CONFIG.SCORE.FAST_ENEMY },
  armor:  { w: 32, h: 38, speed: () => CONFIG.ARMOR_ENEMY_SPEED, stompable: false, spiky: true, flying: false, score: () => CONFIG.SCORE.ARMOR_ENEMY },
  flyer:  { w: 26, h: 22, speed: () => CONFIG.FLYER_SPEED, stompable: true, spiky: false, flying: true, score: () => CONFIG.SCORE.FLYER }
};

class Enemy {
  constructor(type, tx, ty) {
    const T = CONFIG.TILE;
    const def = ENEMY_TYPES[type];
    this.type = type;
    this.def = def;
    this.w = def.w; this.h = def.h;
    this.x = (tx + 0.5) * T - this.w / 2;
    this.y = (ty + 1) * T - this.h;
    this.x0 = this.x; this.y0 = this.y;
    this.vx = 0; this.vy = 0;
    this.dir = -1;
    this.alive = true;
    this.dying = 0;
    this.deathKind = '';
    this.active = false;
    this.t = Math.random() * 10;
    this.onGround = false;
  }

  update(dt, game) {
    this.t += dt;
    if (this.dying > 0) {
      this.dying -= dt;
      if (this.deathKind === 'fire') { this.vy += CONFIG.GRAVITY * dt; this.y += this.vy * dt; this.x += this.vx * dt; }
      if (this.dying <= 0) this.alive = false;
      return;
    }
    const speed = this.def.speed();
    if (this.def.flying) {
      // patrulha horizontal de ±3 blocos com movimento em onda
      const range = CONFIG.TILE * 3;
      this.x += this.dir * speed * dt;
      if (this.x < this.x0 - range) { this.x = this.x0 - range; this.dir = 1; }
      if (this.x > this.x0 + range) { this.x = this.x0 + range; this.dir = -1; }
      this.y = this.y0 + Math.sin(this.t * 2.2) * 22;
      return;
    }
    this.vx = this.dir * speed;
    this.vy = Math.min(this.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL_SPEED);
    Collision.moveEntity(this, game.level, dt);
    if (this.hitWallX) this.dir = -this.hitWallX;
    else if (this.onGround) {
      // vira ao chegar na borda de uma plataforma
      const T = CONFIG.TILE;
      const aheadX = this.dir > 0 ? this.x + this.w + 1 : this.x - 1;
      const col = Math.floor(aheadX / T);
      const row = Math.floor((this.y + this.h + 2) / T);
      if (!game.level.isStandable(col, row)) this.dir = -this.dir;
    }
    if (this.y > game.level.pixelHeight + 64) this.alive = false;
  }

  kill(kind, game) {
    if (this.dying > 0) return;
    this.dying = kind === 'fire' ? 0.9 : 0.45;
    this.deathKind = kind;
    if (kind === 'fire') { this.vy = -300; this.vx = this.dir * -40; }
    game.addScore(this.def.score(), this.x + this.w / 2, this.y);
    game.particles.burst(this.x + this.w / 2, this.y + this.h / 2, 10, kind === 'fire' ? '#ffb23d' : '#ffffff', 140);
    Sound.play('stomp');
  }

  get harmful() { return this.dying <= 0; }

  /* ---------------- desenho ---------------- */
  draw(ctx, time) {
    const cx = this.x + this.w / 2;
    const by = this.y + this.h;
    ctx.save();
    ctx.translate(cx, by);
    if (this.dying > 0 && this.deathKind === 'stomp') ctx.scale(1.3, 0.35);
    if (this.dying > 0 && this.deathKind === 'fire') { ctx.rotate(Math.PI); ctx.translate(0, this.h); }
    ctx.scale(this.dir > 0 ? -1 : 1, 1); // desenhado olhando para a esquerda
    switch (this.type) {
      case 'walker': drawWalker(ctx, this.t); break;
      case 'runner': drawRunner(ctx, this.t); break;
      case 'armor': drawArmor(ctx, this.t); break;
      case 'flyer': drawFlyer(ctx, this.t); break;
    }
    ctx.restore();
  }
}

// Brotolho: bolinha de musgo com um olho grande e folhinhas
function drawWalker(ctx, t) {
  const step = Math.sin(t * 10);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(0, 0, 12, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4a2f5c';
  ctx.beginPath(); ctx.ellipse(-6, -2 + Math.max(0, step) * -2, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6, -2 + Math.max(0, -step) * -2, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(0, -24, 0, -2);
  g.addColorStop(0, '#b57bd6'); g.addColorStop(1, '#7a45a3');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, -12, 13, 11 + Math.sin(t * 10) * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  // folhinhas
  ctx.fillStyle = '#7fe36b';
  ctx.beginPath(); ctx.ellipse(-4, -23, 4, 2, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3, -24, 4, 2, 0.5, 0, Math.PI * 2); ctx.fill();
  // olho
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-3, -14, 6, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b2d42';
  ctx.beginPath(); ctx.arc(-5, -14, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-6, -15.5, 1, 0, Math.PI * 2); ctx.fill();
  // dentinhos
  ctx.fillStyle = '#fff';
  ctx.fillRect(-7, -6, 2.5, 2.5); ctx.fillRect(-2, -6, 2.5, 2.5);
}

// Zunideira: besouro vermelho rápido com asinhas vibrando
function drawRunner(ctx, t) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(0, 0, 12, 3, 0, 0, Math.PI * 2); ctx.fill();
  // perninhas
  ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    const k = Math.sin(t * 30 + i * 2) * 3;
    ctx.beginPath(); ctx.moveTo(i * 6, -6); ctx.lineTo(i * 6 + k, 0); ctx.stroke();
  }
  const g = ctx.createLinearGradient(0, -20, 0, -4);
  g.addColorStop(0, '#ff6b5b'); g.addColorStop(1, '#c0283a');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(2, -11, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
  // listra da carapaça
  ctx.strokeStyle = '#7d1427'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(2, -20); ctx.lineTo(4, -3); ctx.stroke();
  // pintas
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath(); ctx.arc(7, -14, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-2, -9, 1.6, 0, Math.PI * 2); ctx.fill();
  // cabeça
  ctx.fillStyle = '#2b2d42';
  ctx.beginPath(); ctx.ellipse(-10, -9, 6, 5.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-12, -10, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff3b3b';
  ctx.beginPath(); ctx.arc(-12.6, -10, 1, 0, Math.PI * 2); ctx.fill();
  // antenas
  ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-12, -13); ctx.lineTo(-17, -19 + Math.sin(t * 20)); ctx.stroke();
  // asas vibrando
  ctx.fillStyle = 'rgba(220,240,255,0.55)';
  ctx.beginPath(); ctx.ellipse(6, -21, 7, 3 + Math.abs(Math.sin(t * 40)) * 2, 0.3, 0, Math.PI * 2); ctx.fill();
}

// Casco-de-Pedra: criatura de rocha com carapaça cheia de espinhos
function drawArmor(ctx, t) {
  const step = Math.sin(t * 6);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 0, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3b3a4a';
  ctx.fillRect(-12 + step * 2, -7, 7, 7);
  ctx.fillRect(5 - step * 2, -7, 7, 7);
  // corpo
  ctx.fillStyle = '#7b7f96';
  ctx.beginPath(); ctx.ellipse(0, -14, 15, 11, 0, 0, Math.PI * 2); ctx.fill();
  // carapaça metálica
  const g = ctx.createLinearGradient(0, -36, 0, -12);
  g.addColorStop(0, '#d7dbe8'); g.addColorStop(1, '#6d7390');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(2, -20, 16, 13, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillRect(-14, -21, 32, 4);
  // espinhos
  ctx.fillStyle = '#f2f4fa';
  for (let i = -2; i <= 2; i++) {
    const x = 2 + i * 6.5;
    const topY = -20 - Math.sqrt(Math.max(0, 1 - (i * 6.5 / 16) ** 2)) * 13;
    ctx.beginPath(); ctx.moveTo(x - 3, topY + 3); ctx.lineTo(x, topY - 6); ctx.lineTo(x + 3, topY + 3); ctx.fill();
  }
  // rebites
  ctx.fillStyle = '#4d5270';
  ctx.beginPath(); ctx.arc(-6, -24, 1.5, 0, Math.PI * 2); ctx.arc(8, -24, 1.5, 0, Math.PI * 2); ctx.fill();
  // rosto
  ctx.fillStyle = '#2b2d42';
  ctx.fillRect(-14, -16, 12, 6);
  ctx.fillStyle = '#ffcf3d';
  ctx.fillRect(-12, -14, 3, 2); ctx.fillRect(-7, -14, 3, 2);
}

// Lanterninha: vagalume-fantasma com asas e brilho
function drawFlyer(ctx, t) {
  const flap = Math.sin(t * 18);
  ctx.save();
  ctx.translate(0, -11);
  // brilho
  ctx.fillStyle = 'rgba(160,255,200,0.18)';
  ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
  // asas
  ctx.fillStyle = 'rgba(210,240,255,0.8)';
  ctx.beginPath(); ctx.ellipse(-4, -8, 9, 4 + flap * 3, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6, -8, 9, 4 - flap * 3, 0.5, 0, Math.PI * 2); ctx.fill();
  // corpo
  const g = ctx.createRadialGradient(-2, -2, 2, 0, 0, 12);
  g.addColorStop(0, '#9dffcf'); g.addColorStop(1, '#2f9e76');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
  // cauda luminosa
  ctx.fillStyle = '#e9ff7a';
  ctx.beginPath(); ctx.ellipse(10, 3, 5, 4, 0.4, 0, Math.PI * 2); ctx.fill();
  // olhos bravos
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-5, -1, 3, 3.5, 0, 0, Math.PI * 2); ctx.ellipse(1, -1, 2.6, 3.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b2d42';
  ctx.beginPath(); ctx.arc(-6, -0.5, 1.6, 0, Math.PI * 2); ctx.arc(0, -0.5, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-3, -3.5); ctx.moveTo(3, -4.5); ctx.lineTo(-1, -3.5); ctx.stroke();
  ctx.restore();
}

/* =========================================================
   BOSS — Morvak, o Guardião de Fuligem.
   Um golem de fuligem com um cristal na cabeça (ponto fraco).
   Fase 1: anda e investe.  Fase 2: arremessa bolas de fuligem.
   Fase 3: mais rápido, investe e arremessa.
   ========================================================= */
class Boss {
  constructor(arena) {
    this.w = 64; this.h = 76;
    this.arena = arena;
    this.x = arena.spawnX - this.w / 2;
    this.y = arena.spawnY - this.h;
    this.vx = 0; this.vy = 0;
    this.dir = -1;
    this.hp = CONFIG.BOSS_HP;
    this.maxHp = CONFIG.BOSS_HP;
    this.state = 'sleep';
    this.timer = 0;
    this.actionTimer = 2;
    this.invuln = 0;
    this.t = 0;
    this.throwsLeft = 0;
    this.dead = false;
    this.onGround = false;
  }

  get phase() {
    const r = this.hp / this.maxHp;
    return r > 0.66 ? 1 : (r > 0.34 ? 2 : 3);
  }

  wake() {
    if (this.state !== 'sleep') return;
    this.state = 'roar';
    this.timer = 1.2;
    Sound.play('bossroar');
  }

  update(dt, game) {
    this.t += dt;
    if (this.invuln > 0) this.invuln -= dt;
    const player = game.player;
    const phase = this.phase;

    switch (this.state) {
      case 'sleep':
        break;
      case 'roar':
        this.timer -= dt;
        if (this.timer <= 0) { this.state = 'walk'; this.actionTimer = 2.2; }
        break;
      case 'walk': {
        this.vx = this.dir * CONFIG.BOSS_SPEED[phase - 1];
        this.actionTimer -= dt;
        if (this.actionTimer <= 0) {
          this.dir = player.cx < this.x + this.w / 2 ? -1 : 1;
          this.state = 'windup';
          this.timer = phase === 3 ? 0.45 : 0.7;
          this.vx = 0;
          // decide o próximo ataque
          if (phase === 1) this.next = 'charge';
          else if (phase === 2) this.next = Math.random() < 0.65 ? 'throw' : 'charge';
          else this.next = Math.random() < 0.5 ? 'throw' : 'charge';
        }
        break;
      }
      case 'windup':
        this.vx = 0;
        this.timer -= dt;
        if (this.timer <= 0) {
          if (this.next === 'charge') {
            this.state = 'charge';
            Sound.play('bossroar');
          } else {
            this.state = 'throw';
            this.throwsLeft = phase === 2 ? 2 : 3;
            this.timer = 0;
          }
        }
        break;
      case 'charge':
        this.vx = this.dir * CONFIG.BOSS_CHARGE_SPEED * (phase === 3 ? 1.2 : 1);
        break;
      case 'throw':
        this.vx = 0;
        this.timer -= dt;
        if (this.timer <= 0) {
          if (this.throwsLeft > 0) {
            this.throwsLeft--;
            this.throwOrb(game);
            this.timer = 0.45;
          } else {
            this.state = 'walk';
            this.actionTimer = phase === 3 ? 1.4 : 2.2;
          }
        }
        break;
      case 'stunned':
        this.vx = 0;
        this.timer -= dt;
        if (this.timer <= 0) { this.state = 'walk'; this.actionTimer = phase === 3 ? 1.2 : 2; }
        break;
      case 'dying':
        this.vx = 0;
        this.timer -= dt;
        if (Math.random() < 0.5) {
          game.particles.burst(this.x + Math.random() * this.w, this.y + Math.random() * this.h, 3,
            Math.random() < 0.5 ? '#6b4a8c' : '#ffb23d', 160);
        }
        if (this.timer <= 0 && !this.dead) {
          this.dead = true;
          game.particles.burst(this.x + this.w / 2, this.y + this.h / 2, 40, '#caa6ff', 260, 20);
          game.onBossDefeated();
        }
        return;
    }

    this.vy = Math.min(this.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL_SPEED);
    Collision.moveEntity(this, game.level, dt);
    // limites da arena
    if (this.x < this.arena.x0 + 8) { this.x = this.arena.x0 + 8; this.hitWallX = -1; }
    if (this.x + this.w > this.arena.x1 - 8) { this.x = this.arena.x1 - 8 - this.w; this.hitWallX = 1; }
    if (this.hitWallX) {
      if (this.state === 'charge') {
        this.state = 'stunned';
        this.timer = phase === 3 ? 0.9 : 1.4;
        game.shake(8, 0.35);
        Sound.play('bosshit');
        game.particles.burst(this.hitWallX > 0 ? this.x + this.w : this.x, this.y + this.h - 10, 12, '#a99bc4', 180);
      }
      this.dir = -this.hitWallX;
    }
  }

  throwOrb(game) {
    const p = game.player;
    const sx = this.x + this.w / 2 + this.dir * 20;
    const sy = this.y + 16;
    const dx = p.cx - sx;
    const flight = 0.9;
    game.enemyShots.push({
      x: sx, y: sy, r: 9,
      vx: Math.max(-340, Math.min(340, dx / flight)),
      vy: -CONFIG.BOSS_PROJECTILE_GRAVITY * flight * 0.5 + (p.cy - sy) / flight,
      life: 4
    });
    Sound.play('throw');
  }

  damage(amount, game) {
    if (this.invuln > 0 || this.state === 'dying' || this.state === 'sleep') return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invuln = CONFIG.BOSS_HIT_INVULN;
    Sound.play('bosshit');
    game.shake(5, 0.2);
    game.particles.burst(this.x + this.w / 2, this.y + 10, 14, '#caa6ff', 180);
    if (this.hp <= 0) {
      this.state = 'dying';
      this.timer = 2.0;
      game.addScore(CONFIG.SCORE.BOSS, this.x + this.w / 2, this.y);
    }
    return true;
  }

  /* ---------------- desenho ---------------- */
  draw(ctx, time) {
    if (this.invuln > 0 && Math.floor(time * 20) % 2 === 0 && this.state !== 'dying') return;
    const cx = this.x + this.w / 2;
    const by = this.y + this.h;
    const phase = this.phase;
    let shakeX = 0;
    if (this.state === 'windup' || this.state === 'dying') shakeX = Math.sin(time * 60) * 2;
    ctx.save();
    ctx.translate(cx + shakeX, by);
    if (this.state === 'dying') {
      const k = Math.max(0, this.timer / 2);
      ctx.globalAlpha = 0.3 + k * 0.7;
      ctx.scale(1 + (1 - k) * 0.3, k * 0.8 + 0.2);
    }
    ctx.scale(this.dir > 0 ? -1 : 1, 1);

    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 0, 36, 7, 0, 0, Math.PI * 2); ctx.fill();

    const walk = this.state === 'walk' || this.state === 'charge' ? Math.sin(this.t * (this.state === 'charge' ? 22 : 8)) : 0;
    // pés
    ctx.fillStyle = '#231a33';
    ctx.beginPath(); ctx.ellipse(-16, -6 - Math.max(0, walk) * 5, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(16, -6 - Math.max(0, -walk) * 5, 12, 7, 0, 0, Math.PI * 2); ctx.fill();

    // corpo de fuligem
    const bodyCol = phase === 3 ? ['#6b3a7a', '#2a1633'] : ['#584a86', '#211a38'];
    const g = ctx.createLinearGradient(0, -76, 0, -6);
    g.addColorStop(0, bodyCol[0]); g.addColorStop(1, bodyCol[1]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-30, -10);
    ctx.quadraticCurveTo(-38, -44, -22, -62);
    ctx.quadraticCurveTo(0, -74, 22, -62);
    ctx.quadraticCurveTo(38, -44, 30, -10);
    ctx.quadraticCurveTo(0, -2, -30, -10);
    ctx.fill();
    // fumacinha
    ctx.fillStyle = 'rgba(40,30,60,0.5)';
    for (let i = 0; i < 3; i++) {
      const a = time * 2 + i * 2.1;
      ctx.beginPath(); ctx.arc(Math.sin(a) * 26, -30 + Math.cos(a) * 20, 6, 0, Math.PI * 2); ctx.fill();
    }
    // núcleo brilhante
    const core = ctx.createRadialGradient(4, -30, 2, 4, -30, 14);
    core.addColorStop(0, '#fff3b0'); core.addColorStop(0.5, '#ff9a3c'); core.addColorStop(1, 'rgba(255,90,31,0)');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(4, -30, 14 + Math.sin(time * 6) * 2, 0, Math.PI * 2); ctx.fill();

    // braços
    const arm = this.state === 'throw' ? -0.9 + Math.sin(this.timer * 14) * 0.6 : Math.sin(this.t * 4) * 0.2;
    ctx.fillStyle = '#3a2d5a';
    ctx.save(); ctx.translate(-28, -38); ctx.rotate(arm);
    ctx.beginPath(); ctx.ellipse(-4, 10, 8, 14, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(28, -38); ctx.rotate(-arm * 0.5);
    ctx.beginPath(); ctx.ellipse(4, 10, 8, 14, -0.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();

    // olho único
    const angry = this.state === 'windup' || this.state === 'charge' || phase === 3;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(-8, -52, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = angry ? '#ff3b3b' : '#ffcf3d';
    ctx.beginPath(); ctx.arc(-11, -51, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1026';
    ctx.beginPath(); ctx.arc(-12, -51, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a1026'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-22, angry ? -66 : -63); ctx.lineTo(2, angry ? -58 : -61); ctx.stroke();
    // boca
    if (this.state === 'stunned') {
      ctx.fillStyle = '#1a1026';
      ctx.beginPath(); ctx.ellipse(-6, -36, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
      // estrelinhas de tontura
      ctx.fillStyle = '#fff6a8';
      for (let i = 0; i < 3; i++) {
        const a = time * 5 + i * 2.1;
        ctx.fillRect(Math.cos(a) * 20 - 2, -84 + Math.sin(a) * 4 - 2, 4, 4);
      }
    } else {
      ctx.fillStyle = '#1a1026';
      ctx.fillRect(-16, -38, 18, 4);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-14, -38, 3, 3); ctx.fillRect(-6, -38, 3, 3);
    }

    // cristal na cabeça (ponto fraco) — brilha
    const glow = 0.6 + Math.sin(time * 5) * 0.4;
    ctx.fillStyle = `rgba(202,166,255,${0.25 * glow})`;
    ctx.beginPath(); ctx.arc(0, -78, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#caa6ff';
    ctx.beginPath(); ctx.moveTo(-10, -68); ctx.lineTo(-6, -86); ctx.lineTo(0, -92); ctx.lineTo(6, -86); ctx.lineTo(10, -68); ctx.fill();
    ctx.fillStyle = '#f1e6ff';
    ctx.beginPath(); ctx.moveTo(-3, -70); ctx.lineTo(0, -88); ctx.lineTo(2, -70); ctx.fill();

    ctx.restore();
  }
}
