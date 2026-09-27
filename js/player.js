/* =========================================================
   PLAYER — "Brotim", um pequeno broto-espírito da floresta.
   Movimento, pulo, fogo, animações e desenho.
   ========================================================= */
class Player {
  constructor() {
    this.w = 22;
    this.h = 28;
    this.reset(0, 0);
  }

  reset(x, y) {
    this.spawn(x, y);
    this.hasFire = false;
    this.fireCharges = 0;
  }

  // posiciona o jogador com os pés em (x, y)
  spawn(x, y) {
    this.x = x - this.w / 2;
    this.y = y - this.h;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.groundType = 0;
    this.platform = null;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumping = false;
    this.fireCooldown = 0;
    this.invuln = 0;
    this.dead = false;
    this.deadTimer = 0;
    this.anim = 'idle';
    this.walkT = 0;
    this.squash = 1;
    this.shootT = 0;
    this.wasOnGround = false;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dt, game) {
    const level = game.level;

    if (this.dead) {
      this.deadTimer -= dt;
      this.vy = Math.min(this.vy + CONFIG.GRAVITY * 0.8 * dt, CONFIG.MAX_FALL_SPEED);
      this.y += this.vy * dt;
      if (this.deadTimer <= 0) game.onDeathAnimationEnd();
      return;
    }

    if (this.invuln > 0) this.invuln -= dt;
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.shootT > 0) this.shootT -= dt;

    // ---- movimento horizontal ----
    const dir = (Input.right ? 1 : 0) - (Input.left ? 1 : 0);
    const onIce = this.onGround && this.groundType === TILE.ICE;
    let accel, decel;
    if (!this.onGround) { accel = CONFIG.AIR_ACCEL; decel = CONFIG.AIR_ACCEL * 0.6; }
    else if (onIce) { accel = CONFIG.ICE_ACCEL; decel = CONFIG.ICE_DECEL; }
    else { accel = CONFIG.PLAYER_ACCEL; decel = CONFIG.PLAYER_DECEL; }

    if (dir !== 0) {
      const target = dir * CONFIG.PLAYER_SPEED;
      const a = (Math.sign(this.vx) !== dir && this.vx !== 0) ? Math.max(accel, decel) : accel;
      this.vx = approach(this.vx, target, a * dt);
      this.facing = dir;
    } else {
      this.vx = approach(this.vx, 0, decel * dt);
    }

    // ---- pulo (coyote time + buffer + pulo variável) ----
    if (this.onGround) this.coyote = CONFIG.COYOTE_TIME; else this.coyote -= dt;
    if (Input.jumpPressed) this.jumpBuffer = CONFIG.JUMP_BUFFER; else this.jumpBuffer -= dt;
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vy = -CONFIG.JUMP_FORCE;
      this.jumping = true;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.onGround = false;
      this.platform = null;
      this.squash = 1.25;
      Sound.play('jump');
      game.particles.dust(this.cx, this.y + this.h, 5);
    }
    if (this.jumping && !Input.jump && this.vy < -CONFIG.JUMP_FORCE * CONFIG.JUMP_CUT) {
      this.vy = -CONFIG.JUMP_FORCE * CONFIG.JUMP_CUT;
    }
    if (this.vy >= 0) this.jumping = false;

    // ---- gravidade ----
    this.vy = Math.min(this.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL_SPEED);

    // ---- carregado por plataforma móvel ----
    if (this.platform && this.platform.solid) {
      this.x += this.platform.dx;
      this.y += this.platform.dy;
    }

    // ---- colisão ----
    const prevBottom = this.y + this.h;
    this.wasOnGround = this.onGround;
    Collision.moveEntity(this, level, dt);
    if (!this.onGround) Collision.landOnPlatforms(this, level.platforms, prevBottom);
    else this.platform = null;
    if (this.platform && this.platform.kind === 'crumble') this.platform.touch();

    if (this.onGround && !this.wasOnGround) {
      this.squash = 0.75;
      if (prevBottom - this.y > 0) game.particles.dust(this.cx, this.y + this.h, 3);
    }
    this.squash += (1 - this.squash) * Math.min(1, dt * 12);

    // cabeçada em bloco rachado
    if (this.ceilHit) {
      if (!level.breakBlock(this.ceilHit.c, this.ceilHit.r, game)) Sound.play('clank');
    }

    // ---- fogo ----
    if (Input.firePressed) game.tryShoot();

    // ---- animação ----
    if (!this.onGround) this.anim = this.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(this.vx) > 15) this.anim = 'walk';
    else this.anim = 'idle';
    if (this.anim === 'walk') this.walkT += Math.abs(this.vx) * dt * 0.06;

    // ---- caiu no buraco ----
    if (this.y > level.pixelHeight + 40) game.hurtPlayer('pit');
  }

  die() {
    this.dead = true;
    this.deadTimer = CONFIG.HURT_TIME;
    this.vy = -420;
    this.vx = 0;
    this.anim = 'hurt';
  }

  /* ---------------- desenho ---------------- */
  draw(ctx, time) {
    if (!this.dead && this.invuln > 0 && Math.floor(time * 16) % 2 === 0) return; // pisca

    const fire = this.hasFire;
    const body = fire ? '#ff8f3a' : '#39cbbf';
    const bodyDark = fire ? '#d8561b' : '#1f9a95';
    const belly = fire ? '#ffe2a8' : '#c6f7ec';
    const hurt = this.dead;

    let sx = 1, sy = 1;
    if (this.anim === 'jump') { sx = 0.88; sy = 1.14; }
    else if (this.anim === 'fall') { sx = 0.95; sy = 1.06; }
    sy *= this.squash; sx /= Math.sqrt(this.squash);

    const bob = this.anim === 'walk' ? Math.abs(Math.sin(this.walkT * Math.PI)) * 2 : (this.anim === 'idle' ? Math.sin(time * 3) * 0.8 : 0);

    ctx.save();
    ctx.translate(this.cx, this.y + this.h);
    if (hurt) ctx.rotate(Math.sin(time * 30) * 0.25);

    // sombra
    if (this.onGround && !hurt) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(0, 0, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
    }

    ctx.scale(this.facing * sx, sy);

    // pés
    const step = this.anim === 'walk' ? Math.sin(this.walkT * Math.PI) * 4 : 0;
    ctx.fillStyle = '#2b2d42';
    if (this.anim === 'jump' || this.anim === 'fall') {
      ctx.beginPath(); ctx.ellipse(-5, -4, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(5, -5, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.ellipse(-5 + step, -2.5, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(5 - step, -2.5, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    }

    ctx.translate(0, -bob);

    // cachecol esvoaçante (atrás)
    const wave = Math.sin(time * 10) * 3;
    const trail = Math.min(1, Math.abs(this.vx) / CONFIG.PLAYER_SPEED + (this.onGround ? 0 : 0.6));
    ctx.fillStyle = fire ? '#ffd23f' : '#ff5d73';
    ctx.beginPath();
    ctx.moveTo(-4, -14);
    ctx.quadraticCurveTo(-12 - trail * 6, -16 + wave, -16 - trail * 8, -12 + wave * 1.5);
    ctx.lineTo(-15 - trail * 7, -8 + wave);
    ctx.quadraticCurveTo(-10, -10, -3, -10);
    ctx.fill();

    // corpo
    const grad = ctx.createLinearGradient(0, -26, 0, -2);
    grad.addColorStop(0, hurt ? '#ffffff' : body);
    grad.addColorStop(1, hurt ? '#ffb3b3' : bodyDark);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(0, -14, 12, 12.5, 0, 0, Math.PI * 2); ctx.fill();
    // barriga
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.ellipse(1.5, -9.5, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
    // brilho
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(-5, -20, 3.5, 2.2, -0.6, 0, Math.PI * 2); ctx.fill();

    // cachecol (frente)
    ctx.fillStyle = fire ? '#ffd23f' : '#ff5d73';
    ctx.beginPath(); ctx.ellipse(0, -12.5, 11, 2.6, 0, 0, Math.PI * 2); ctx.fill();

    // olhos
    if (hurt) {
      ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = 1.8;
      [[2, -18], [8, -18]].forEach(([ex, ey]) => {
        ctx.beginPath(); ctx.moveTo(ex - 2, ey - 2); ctx.lineTo(ex + 2, ey + 2);
        ctx.moveTo(ex + 2, ey - 2); ctx.lineTo(ex - 2, ey + 2); ctx.stroke();
      });
    } else {
      const blink = (Math.floor(time * 10) % 37 === 0) ? 0.2 : 1;
      const lookY = this.anim === 'fall' ? 1 : (this.anim === 'jump' ? -1 : 0);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(2, -18, 3.4, 4.2 * blink, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(8.5, -18, 3, 4 * blink, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b2d42';
      ctx.beginPath(); ctx.ellipse(3.2, -17.5 + lookY, 1.8, 2.4 * blink, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(9.4, -17.5 + lookY, 1.6, 2.2 * blink, 0, 0, Math.PI * 2); ctx.fill();
      // bochecha
      ctx.fillStyle = 'rgba(255,120,140,0.5)';
      ctx.beginPath(); ctx.ellipse(-1, -12.5 - 2, 2, 1.2, 0, 0, Math.PI * 2); ctx.fill();
    }

    // broto na cabeça (ou chama, com o poder de fogo)
    const sway = Math.sin(time * 4) * 0.25 - this.vx / CONFIG.PLAYER_SPEED * 0.3;
    ctx.save();
    ctx.translate(0, -26);
    ctx.rotate(sway);
    if (fire) {
      const f = 1 + Math.sin(time * 25) * 0.12;
      ctx.fillStyle = '#ff5a1f';
      ctx.beginPath();
      ctx.moveTo(-5, 1); ctx.quadraticCurveTo(-6, -8 * f, 0, -13 * f); ctx.quadraticCurveTo(6, -8 * f, 5, 1); ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(-2.5, 1); ctx.quadraticCurveTo(-3, -5 * f, 0, -8 * f); ctx.quadraticCurveTo(3, -5 * f, 2.5, 1); ctx.fill();
    } else {
      ctx.strokeStyle = '#2f8f3a'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(0, -6); ctx.stroke();
      ctx.fillStyle = '#6fdc5a';
      ctx.beginPath(); ctx.ellipse(-4, -7, 4.5, 2.2, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4cc34a';
      ctx.beginPath(); ctx.ellipse(4, -8, 4.5, 2.2, -0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // braço/mão lançando fogo
    if (this.shootT > 0) {
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.ellipse(12, -12, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  }
}

function approach(v, target, amount) {
  if (v < target) return Math.min(v + amount, target);
  if (v > target) return Math.max(v - amount, target);
  return v;
}
