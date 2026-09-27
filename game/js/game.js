/* =========================================================
   GAME — estado da partida e regras do jogo:
   vidas, checkpoints, itens, inimigos, fogo, chefe, câmera.
   ========================================================= */
const Game = {
  state: 'menu',          // menu | playing | paused | gameover | complete | victory
  level: null,
  levelId: 1,
  player: new Player(),
  enemies: [],
  fireballs: [],
  enemyShots: [],
  pickupFx: [],
  boss: null,
  bossActive: false,
  particles: new ParticleSystem(),
  camera: { x: 0, y: 0 },
  shakeT: 0,
  shakeMag: 0,
  time: 0,
  lives: CONFIG.START_LIVES,
  stats: null,
  runGameOvers: 0,
  ending: null,
  doorHintT: 0,
  menuLevel: null,

  /* ---------------- ciclo da fase ---------------- */
  startLevel(id, keepRun = false) {
    const def = LEVELS[id - 1];
    this.levelId = id;
    this.level = new Level(def);
    this.enemies = this.level.enemySpawns.map((s) => new Enemy(s.type, s.x, s.y));
    this.fireballs = [];
    this.enemyShots = [];
    this.pickupFx = [];
    this.particles.clear();
    this.boss = this.level.bossArena ? new Boss(this.level.bossArena) : null;
    this.bossActive = false;
    this.ending = null;
    if (!keepRun) this.runGameOvers = 0;
    this.stats = {
      coins: 0, specials: 0, specialTotal: this.level.specialCount, time: 0, livesLost: 0,
      fireUsed: 0, keys: 0, bossDefeated: false, score: 0, gameOvers: this.runGameOvers, completed: false
    };
    this.lives = CONFIG.START_LIVES;
    this.player.reset(this.level.start.x, this.level.start.y);
    this.respawnPoint = { x: this.level.start.x, y: this.level.start.y };
    this.snapCamera();
    Input.releaseAll();
    this.state = 'playing';
    UI.showGame();
    UI.hideBossBar();
    UI.updateHud(true);
    UI.toast(`Fase ${id}: ${def.name}`, 2200);
  },

  restartLevel() { this.startLevel(this.levelId, true); },

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      Input.releaseAll();
      UI.show('pause');
    } else if (this.state === 'paused') {
      this.resume();
    }
  },

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    Input.releaseAll();
    UI.showGame();
  },

  toMenu() {
    this.state = 'menu';
    UI.hideBossBar();
    UI.show('menu');
  },

  /* ---------------- atualização ---------------- */
  update(dt) {
    this.time += dt;
    if (this.state === 'menu' || !this.level) { this.updateMenuBackground(dt); return; }
    if (this.state !== 'playing') return;

    const level = this.level;
    const player = this.player;

    // animação de saída pelo portal
    if (this.ending) {
      this.ending.t -= dt;
      this.particles.update(dt);
      if (this.ending.t <= 0) { this.ending = null; this.completeLevel(); }
      return;
    }

    this.stats.time += dt;
    if (this.doorHintT > 0) this.doorHintT -= dt;

    for (const p of level.platforms) p.update(dt, this);
    for (const v of level.vents) v.update(dt);

    player.update(dt, this);

    if (!player.dead) {
      this.checkItems(dt);
      this.checkCheckpoints();
      this.checkHazards();
      this.checkDoorAndBoss();
      if (level.exit && Collision.overlap(player, level.exit)) this.reachExit();
    } else {
      this.updateRegenItems(dt);
    }

    this.updateEnemies(dt);
    this.updateFireballs(dt);
    this.updateEnemyShots(dt);
    if (this.boss && this.bossActive) this.updateBoss(dt);

    this.updatePickupFx(dt);
    this.particles.update(dt);
    this.updateCamera(dt);
    if (this.shakeT > 0) this.shakeT -= dt;
    UI.updateHud();
  },

  /* ---------------- itens ---------------- */
  checkItems(dt) {
    const p = this.player;
    for (const it of this.level.items) {
      if (it.taken) {
        if (it.regen && it.regenT > 0) { it.regenT -= dt; if (it.regenT <= 0) it.taken = false; }
        continue;
      }
      if (Math.abs(it.x - p.cx) > 40 || Math.abs(it.y - p.cy) > 48) continue;
      if (Collision.overlapCircle(p, it.x, it.y, it.r)) this.collect(it);
    }
  },

  updateRegenItems(dt) {
    for (const it of this.level.items) {
      if (it.taken && it.regen && it.regenT > 0) { it.regenT -= dt; if (it.regenT <= 0) it.taken = false; }
    }
  },

  collect(it) {
    const p = this.player;
    // itens de fogo só são pegos se tiverem utilidade
    if (it.kind === 'fire' && p.fireCharges >= CONFIG.FIRE_MAX_CHARGES) return;
    it.taken = true;
    if (it.regen) it.regenT = CONFIG.REGEN_PICKUP_TIME;
    this.pickupFx.push({ it, t: 0 });
    switch (it.kind) {
      case 'coin':
        this.stats.coins++;
        this.addScore(CONFIG.SCORE.COIN);
        this.particles.sparkle(it.x, it.y, '#fff3b0', 6);
        Sound.play('coin');
        break;
      case 'special':
        this.stats.specials++;
        this.addScore(CONFIG.SCORE.SPECIAL, it.x, it.y - 10);
        this.particles.sparkle(it.x, it.y, '#d9c6ff', 16);
        Sound.play('special');
        UI.toast(`Moeda especial ${this.stats.specials}/${this.stats.specialTotal}!`);
        break;
      case 'fire':
        p.fireCharges = Math.min(CONFIG.FIRE_MAX_CHARGES, p.fireCharges + CONFIG.FIRE_PICKUP_CHARGES);
        this.particles.sparkle(it.x, it.y, '#ffb23d', 8);
        Sound.play('pickup');
        if (!p.hasFire) UI.toast('Carga de fogo guardada (precisa da Brasa Viva)');
        break;
      case 'power': {
        const first = !p.hasFire;
        p.hasFire = true;
        p.fireCharges = Math.max(p.fireCharges, CONFIG.FIRE_START_CHARGES);
        this.particles.burst(it.x, it.y, 24, '#ff9a3c', 200, 6);
        Sound.play('power');
        if (first) UI.toast(Input.isTouch ? 'Brasa Viva! Toque em FIRE para lançar fogo' : 'Brasa Viva! Aperte F para lançar fogo', 3000);
        break;
      }
      case 'key':
        this.stats.keys++;
        this.addScore(CONFIG.SCORE.KEY, it.x, it.y - 10);
        this.particles.sparkle(it.x, it.y, '#ffe07a', 16);
        Sound.play('key');
        UI.toast(`Chave ${this.stats.keys}/${this.level.keysTotal}`);
        break;
    }
    UI.updateHud(true);
  },

  updatePickupFx(dt) {
    for (let i = this.pickupFx.length - 1; i >= 0; i--) {
      this.pickupFx[i].t += dt * 3;
      if (this.pickupFx[i].t >= 1) this.pickupFx.splice(i, 1);
    }
  },

  /* ---------------- checkpoints / saída ---------------- */
  checkCheckpoints() {
    for (const cp of this.level.checkpoints) {
      if (cp.active) continue;
      if (Collision.overlap(this.player, cp)) {
        cp.active = true;
        if (cp.spawnX >= this.respawnPoint.x) this.respawnPoint = { x: cp.spawnX, y: cp.spawnY };
        Sound.play('checkpoint');
        this.particles.burst(cp.x + cp.w / 2, cp.y + 4, 16, '#7dffe0', 150, 4);
        UI.toast('Checkpoint!', 1200);
      }
    }
  },

  reachExit() {
    const p = this.player;
    this.ending = { t: 1.1 };
    p.vx = 0; p.vy = 0;
    Sound.play('victory');
    const e = this.level.exit;
    this.particles.burst(e.x + e.w / 2, e.y + e.h / 2, 30, '#8ef6ff', 200, 10);
  },

  completeLevel() {
    const st = this.stats;
    st.completed = true;
    const def = this.level.def;
    const timeBonus = Math.max(0, Math.floor(def.parTime - st.time)) * CONFIG.SCORE.TIME_BONUS_PER_SEC;
    const lifeBonus = this.lives * CONFIG.SCORE.LIFE_BONUS;
    st.score += timeBonus + lifeBonus;
    const challenges = def.challenges.map((c) => !!c.test(st));
    const saved = Save.recordLevel(this.levelId, { score: st.score, time: st.time, coins: st.coins, challenges });
    const result = { def, stats: st, challenges, timeBonus, lifeBonus, lives: this.lives, saved };
    if (this.levelId === LEVELS.length) {
      this.state = 'victory';
      UI.showVictory(result);
    } else {
      this.state = 'complete';
      UI.showComplete(result);
    }
  },

  /* ---------------- perigos ---------------- */
  checkHazards() {
    const p = this.player;
    const level = this.level;
    const T = CONFIG.TILE;
    // hitbox um pouco menor para ser justo
    const hx0 = Math.floor((p.x + 4) / T), hx1 = Math.floor((p.x + p.w - 4) / T);
    const hy0 = Math.floor((p.y + 6) / T), hy1 = Math.floor((p.y + p.h - 1) / T);
    for (let r = hy0; r <= hy1; r++) {
      for (let c = hx0; c <= hx1; c++) {
        const t = level.tileAt(c, r);
        if (t === TILE.LAVA) {
          // a superfície da lava fica um pouco abaixo do topo do bloco
          if (p.y + p.h > r * T + 8) { this.hurtPlayer('lava'); return; }
        } else if (t === TILE.SPIKES) {
          if (p.y + p.h > r * T + 14) { this.hurtPlayer('spikes'); return; }
        }
      }
    }
    for (const v of level.vents) {
      if (v.on && Collision.overlap(p, v.hitbox())) { this.hurtPlayer('fire'); return; }
    }
  },

  hurtPlayer(kind) {
    const p = this.player;
    if (p.dead || this.ending) return;
    const instant = kind === 'pit' || kind === 'lava';
    if (!instant && p.invuln > 0) return;
    p.die();
    if (kind === 'pit') p.deadTimer = 0.5;
    this.lives--;
    this.stats.livesLost++;
    Sound.play('hurt');
    this.shake(6, 0.3);
    this.vibrate(120);
    if (kind === 'lava') this.particles.burst(p.cx, p.y + p.h, 18, '#ff9a3c', 200, 8);
    UI.updateHud(true);
  },

  onDeathAnimationEnd() {
    if (this.lives <= 0) { this.gameOver(); return; }
    const p = this.player;
    p.spawn(this.respawnPoint.x, this.respawnPoint.y);
    p.invuln = CONFIG.INVULN_TIME;
    p.hasFire = false; // o poder de fogo vale só durante aquela vida
    // power-ups e cargas voltam a aparecer para o jogador não ficar preso
    for (const it of this.level.items) if (it.respawn && !it.regen) it.taken = false;
    for (const pl of this.level.platforms) if (pl.reset) pl.reset();
    this.fireballs.length = 0;
    this.enemyShots.length = 0;
    this.snapCamera();
    UI.updateHud(true);
  },

  gameOver() {
    this.state = 'gameover';
    this.runGameOvers++;
    Sound.play('gameover');
    UI.show('gameover');
  },

  /* ---------------- inimigos ---------------- */
  updateEnemies(dt) {
    const p = this.player;
    const cam = this.camera;
    const margin = CONFIG.ENEMY_ACTIVATE_MARGIN;
    const viewW = Render.viewW, viewH = Render.viewH;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const near = e.x + e.w > cam.x - margin && e.x < cam.x + viewW + margin &&
        e.y + e.h > cam.y - margin * 2 && e.y < cam.y + viewH + margin * 2;
      if (!e.active) { if (near) e.active = true; else continue; }
      // longe da câmera: congela para economizar processamento
      if (!near && e.dying <= 0) continue;
      e.update(dt, this);
      if (!e.alive) { this.enemies.splice(i, 1); continue; }
      if (p.dead || e.dying > 0 || !Collision.overlap(p, e)) continue;

      const prevBottom = p.y + p.h - p.vy * dt;
      const stomping = p.vy > 0 && prevBottom <= e.y + e.h * 0.5 + 4;
      if (stomping && e.def.stompable) {
        e.kill('stomp', this);
        this.bouncePlayer();
      } else {
        this.hurtPlayer('enemy');
      }
    }
  },

  bouncePlayer() {
    const p = this.player;
    p.vy = -(Input.jump ? CONFIG.JUMP_FORCE * 0.95 : CONFIG.STOMP_BOUNCE);
    p.jumping = Input.jump;
    p.squash = 1.2;
  },

  /* ---------------- fogo ---------------- */
  tryShoot() {
    const p = this.player;
    if (!p.hasFire || p.dead) return;
    if (p.fireCooldown > 0 || this.fireballs.length >= CONFIG.FIRE_MAX_ON_SCREEN) return;
    if (p.fireCharges <= 0) {
      Sound.play('fizzle');
      UI.toast('Sem cargas de fogo! Procure brasas +3', 1500);
      p.fireCooldown = 0.5;
      return;
    }
    p.fireCharges--;
    p.fireCooldown = CONFIG.FIRE_COOLDOWN;
    p.shootT = 0.15;
    this.stats.fireUsed++;
    const y = p.y + p.h * 0.45;
    this.fireballs.push({ x: p.cx + p.facing * 10, y, baseY: y, vx: p.facing * CONFIG.FIRE_SPEED, dist: 0, t: 0 });
    Sound.play('fire');
    UI.updateHud(true);
  },

  updateFireballs(dt) {
    const level = this.level;
    const T = CONFIG.TILE;
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const f = this.fireballs[i];
      f.t += dt;
      f.x += f.vx * dt;
      f.dist += Math.abs(f.vx * dt);
      f.y = f.baseY + Math.sin(f.t * 25) * 2.5;
      if (Math.random() < 0.5) this.particles.add({ x: f.x, y: f.y, vx: -f.vx * 0.1, vy: -20, g: -40, life: 0.25, max: 0.25, size: 3, color: '#ffb23d', shape: 'circle' });
      let dead = false;
      const c = Math.floor(f.x / T), r = Math.floor(f.y / T);
      if (level.isSolid(c, r)) {
        if (!level.breakBlock(c, r, this)) Sound.play('fizzle');
        dead = true;
      } else if (f.dist > CONFIG.FIRE_RANGE) {
        dead = true;
      }
      if (!dead) {
        const box = { x: f.x - 6, y: f.y - 6, w: 12, h: 12 };
        for (const e of this.enemies) {
          if (e.dying <= 0 && e.active && Collision.overlap(box, e)) { e.kill('fire', this); dead = true; break; }
        }
        if (!dead && this.boss && this.bossActive && this.boss.state !== 'dying' && Collision.overlap(box, this.boss)) {
          this.boss.damage(CONFIG.BOSS_FIRE_DAMAGE, this);
          dead = true;
        }
      }
      if (dead) {
        this.particles.burst(f.x, f.y, 6, '#ff9a3c', 100, 2, { g: 100, up: 10, life: 0.3 });
        this.fireballs.splice(i, 1);
      }
    }
  },

  updateEnemyShots(dt) {
    const p = this.player;
    const level = this.level;
    const T = CONFIG.TILE;
    for (let i = this.enemyShots.length - 1; i >= 0; i--) {
      const s = this.enemyShots[i];
      s.life -= dt;
      s.vy += CONFIG.BOSS_PROJECTILE_GRAVITY * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      let dead = s.life <= 0 || s.y > level.pixelHeight;
      if (!dead && level.isSolid(Math.floor(s.x / T), Math.floor(s.y / T))) dead = true;
      if (!dead && !p.dead && Collision.overlapCircle(p, s.x, s.y, s.r - 2)) { this.hurtPlayer('shot'); dead = true; }
      if (dead) {
        this.particles.burst(s.x, s.y, 8, '#6b4a8c', 120);
        this.enemyShots.splice(i, 1);
      }
    }
  },

  /* ---------------- porta e chefe ---------------- */
  checkDoorAndBoss() {
    const level = this.level;
    const p = this.player;
    const T = CONFIG.TILE;
    if (level.doorCells && !level.doorOpen && !this.bossActive) {
      const [dc, dr] = level.doorCells[0];
      const dist = dc * T - (p.x + p.w);
      if (dist < T * 2 && dist > -T && p.y + p.h > dr * T) {
        if (this.stats.keys >= level.keysTotal) {
          level.openDoor(this);
          UI.toast('A porta se abriu!');
          this.shake(4, 0.6);
        } else if (this.doorHintT <= 0) {
          this.doorHintT = 3;
          UI.toast(`Porta trancada: faltam ${level.keysTotal - this.stats.keys} chave(s)`);
        }
      }
    }
    const arena = level.bossArena;
    if (arena && this.boss && !this.bossActive && p.x > arena.x0 + T * 3) {
      this.bossActive = true;
      level.closeDoor();
      // o retorno passa a ser dentro da arena (a porta fechou atrás do jogador)
      const cp = level.checkpoints.find((c) => c.x > arena.x0 && c.x < arena.x1);
      if (cp) { cp.active = true; this.respawnPoint = { x: cp.spawnX, y: cp.spawnY }; }
      this.boss.wake();
      this.shake(6, 0.8);
      UI.showBossBar();
      UI.toast('MORVAK, o Guardião de Fuligem!', 2500);
    }
  },

  updateBoss(dt) {
    const b = this.boss;
    const p = this.player;
    b.update(dt, this);
    UI.updateBossBar(b.hp / b.maxHp);
    if (p.dead || b.state === 'dying' || b.state === 'sleep' || b.dead) return;
    // hitbox do chefe um pouco menor que o desenho
    const box = { x: b.x + 6, y: b.y + 6, w: b.w - 12, h: b.h - 6 };
    if (!Collision.overlap(p, box)) return;
    const prevBottom = p.y + p.h - p.vy * dt;
    if (p.vy > 0 && prevBottom <= box.y + 22) {
      // pisou no cristal da cabeça
      if (b.damage(CONFIG.BOSS_STOMP_DAMAGE, this)) this.particles.sparkle(p.cx, p.y + p.h, '#caa6ff', 12);
      this.bouncePlayer();
      p.vy = Math.min(p.vy, -CONFIG.STOMP_BOUNCE * 1.1);
      p.vx = (p.cx < b.x + b.w / 2 ? -1 : 1) * 160;
    } else if (b.invuln <= 0 || b.state === 'charge') {
      this.hurtPlayer('boss');
    }
  },

  onBossDefeated() {
    this.stats.bossDefeated = true;
    UI.hideBossBar();
    this.enemyShots.length = 0;
    Sound.play('victory');
    this.ending = { t: 1.4, boss: true };
  },

  /* ---------------- pontuação e efeitos ---------------- */
  addScore(n, x, y) {
    this.stats.score += n;
    if (x !== undefined) this.particles.text(x, y, '+' + n, '#fff6a8');
  },

  shake(mag, time) { this.shakeMag = mag; this.shakeT = time; },

  vibrate(ms) {
    if (Save.data.settings.vibration && navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) { /* ignorado */ }
    }
  },

  /* ---------------- câmera ---------------- */
  cameraTarget() {
    const p = this.player, L = this.level;
    const tx = p.cx - Render.viewW * CONFIG.CAMERA_ANCHOR_X + p.facing * CONFIG.CAMERA_LOOKAHEAD;
    const ty = p.cy - Render.viewH * CONFIG.CAMERA_ANCHOR_Y;
    return {
      x: Math.max(0, Math.min(L.pixelWidth - Render.viewW, tx)),
      y: Math.max(0, Math.min(L.pixelHeight - Render.viewH, ty))
    };
  },

  snapCamera() {
    const t = this.cameraTarget();
    this.camera.x = t.x; this.camera.y = t.y;
  },

  updateCamera(dt) {
    if (this.player.dead) return; // congela a câmera durante a animação de dano
    const t = this.cameraTarget();
    const k = Math.min(1, CONFIG.CAMERA_LERP * dt);
    this.camera.x += (t.x - this.camera.x) * k;
    this.camera.y += (t.y - this.camera.y) * k * 0.8;
    // se a fase for mais estreita que a tela, centraliza
    if (this.level.pixelWidth < Render.viewW) this.camera.x = (this.level.pixelWidth - Render.viewW) / 2;
  },

  /* ---------------- fundo animado do menu ---------------- */
  updateMenuBackground(dt) {
    if (!this.menuLevel) this.menuLevel = new Level(LEVELS[0]);
    const L = this.menuLevel;
    this.menuCamX = ((this.menuCamX || 0) + dt * 30) % Math.max(1, L.pixelWidth - Render.viewW);
  },

  /* ---------------- desenho ---------------- */
  render(frameDt) {
    Render.beginFrame();
    const ctx = Render.ctx;
    const inMenu = this.state === 'menu' || !this.level;
    const level = inMenu ? (this.menuLevel || (this.menuLevel = new Level(LEVELS[0]))) : this.level;
    const cam = inMenu ? { x: this.menuCamX || 0, y: level.pixelHeight - Render.viewH } : this.camera;
    const time = this.time;

    Render.drawSky(level.theme, cam, level, time);

    let sx = 0, sy = 0;
    if (!inMenu && this.shakeT > 0) {
      sx = (Math.random() - 0.5) * this.shakeMag * 2;
      sy = (Math.random() - 0.5) * this.shakeMag * 2;
    }
    ctx.save();
    ctx.translate(-Math.round(cam.x + sx), -Math.round(cam.y + sy));

    Render.drawDecor(level, cam, time);
    Render.drawTiles(level, cam, time);
    if (!inMenu) Render.drawSigns(level, cam);

    const visible = (x, w) => x + w > cam.x - 64 && x < cam.x + Render.viewW + 64;
    for (const cp of level.checkpoints) if (visible(cp.x, cp.w)) Render.drawCheckpoint(cp, time);
    if (level.exit && visible(level.exit.x, level.exit.w)) Render.drawExit(level.exit, time);
    for (const v of level.vents) if (visible(v.x, v.w)) Render.drawVent(v, time);
    for (const p of level.platforms) if (visible(p.x, p.w)) Render.drawPlatform(p, level, time);
    for (const it of level.items) if (!it.taken && visible(it.x - 20, 40)) Render.drawItem(it, time);

    if (!inMenu) {
      // animação de coleta: item sobe e encolhe
      for (const fx of this.pickupFx) {
        ctx.save();
        ctx.globalAlpha = 1 - fx.t;
        ctx.translate(fx.it.x, fx.it.y - fx.t * 30);
        ctx.scale(1 + fx.t * 0.5, 1 + fx.t * 0.5);
        ctx.translate(-fx.it.x, -fx.it.y);
        Render.drawItem(fx.it, time);
        ctx.restore();
      }
      for (const e of this.enemies) if (e.active && visible(e.x, e.w)) e.draw(ctx, time);
      if (this.boss && (this.bossActive || visible(this.boss.x, this.boss.w)) && !this.boss.dead) this.boss.draw(ctx, time);
      for (const s of this.enemyShots) Render.drawEnemyShot(s, time);

      if (this.ending && !this.ending.boss) {
        // jogador sendo sugado pelo portal
        const e = this.level.exit;
        const k = Math.max(0, this.ending.t / 1.1);
        ctx.save();
        ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
        ctx.rotate((1 - k) * 8);
        ctx.scale(k, k);
        ctx.translate(-this.player.cx, -this.player.cy);
        this.player.draw(ctx, time);
        ctx.restore();
      } else {
        this.player.draw(ctx, time);
      }
      for (const f of this.fireballs) Render.drawFireball(f, time);
      this.particles.draw(ctx);
    }
    Render.drawLavaGlow(level, cam);
    ctx.restore();

    Render.drawAmbient(level.theme, cam, this.state === 'playing' || inMenu ? frameDt : 0, time);
  }
};
