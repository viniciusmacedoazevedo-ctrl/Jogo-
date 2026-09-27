/* =========================================================
   COLLISION — colisão AABB com o mapa de blocos e com
   plataformas dinâmicas (móveis / que desmoronam).
   ========================================================= */
const Collision = {
  overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  },

  // Retângulo x círculo (itens como moedas usam um raio)
  overlapCircle(r, cx, cy, radius) {
    const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
    const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < radius * radius;
  },

  /* Move a entidade pelo mapa resolvendo colisões eixo por eixo.
     Preenche: onGround, groundType, hitWallX (-1/0/1), ceilHit ({c,r} ou null). */
  moveEntity(e, level, dt) {
    const T = CONFIG.TILE;
    e.onGround = false;
    e.groundType = 0;
    e.hitWallX = 0;
    e.ceilHit = null;

    // ---- eixo X ----
    e.x += e.vx * dt;
    const top = Math.floor(e.y / T);
    const bottom = Math.floor((e.y + e.h - 0.01) / T);
    if (e.vx > 0) {
      const col = Math.floor((e.x + e.w) / T);
      for (let r = top; r <= bottom; r++) {
        if (level.isSolid(col, r)) { e.x = col * T - e.w; e.vx = 0; e.hitWallX = 1; break; }
      }
    } else if (e.vx < 0) {
      const col = Math.floor(e.x / T);
      for (let r = top; r <= bottom; r++) {
        if (level.isSolid(col, r)) { e.x = (col + 1) * T; e.vx = 0; e.hitWallX = -1; break; }
      }
    }

    // ---- eixo Y ----
    const prevBottom = e.y + e.h;
    e.y += e.vy * dt;
    const left = Math.floor(e.x / T);
    const right = Math.floor((e.x + e.w - 0.01) / T);
    if (e.vy > 0) {
      const row = Math.floor((e.y + e.h) / T);
      for (let c = left; c <= right; c++) {
        const t = level.tileAt(c, row);
        const oneWay = t === TILE.PLATFORM && prevBottom <= row * T + 0.5;
        if (TILE_SOLID[t] || oneWay) {
          e.y = row * T - e.h;
          e.vy = 0;
          e.onGround = true;
          // gelo tem prioridade para o jogador escorregar mesmo meio pé no gelo
          if (!e.groundType || t === TILE.ICE) e.groundType = t;
        }
      }
    } else if (e.vy < 0) {
      const row = Math.floor(e.y / T);
      const center = Math.floor((e.x + e.w / 2) / T);
      let hit = null;
      for (let c = left; c <= right; c++) {
        if (level.isSolid(c, row)) {
          if (!hit || c === center) hit = { c, r: row };
        }
      }
      if (hit) { e.y = (row + 1) * T; e.vy = 0; e.ceilHit = hit; }
    }
  },

  /* Plataformas dinâmicas: só colidem por cima (como plataformas "one-way").
     prevBottom = base da entidade antes do movimento deste passo. */
  landOnPlatforms(e, platforms, prevBottom) {
    e.platform = null;
    if (e.vy < 0) return;
    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      if (!p.solid) continue;
      if (e.x + e.w <= p.x || e.x >= p.x + p.w) continue;
      const bottom = e.y + e.h;
      if (prevBottom <= p.prevY + 2 && bottom >= p.y) {
        e.y = p.y - e.h;
        e.vy = 0;
        e.onGround = true;
        e.platform = p;
        e.groundType = p.ice ? TILE.ICE : TILE.BLOCK;
        return;
      }
    }
  }
};
