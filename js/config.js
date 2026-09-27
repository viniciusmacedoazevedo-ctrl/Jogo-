/* =========================================================
   CONFIG — todos os parâmetros ajustáveis do jogo ficam aqui.
   Altere estes valores para mudar a física, a dificuldade etc.
   Unidades: pixels (mundo virtual) e segundos.
   ========================================================= */
const CONFIG = {
  // Tela / renderização
  TILE: 32,               // tamanho de um bloco em pixels do mundo
  VIEW_ROWS: 15,          // linhas de blocos visíveis na altura da tela
  MAX_DPR: 2,             // limite de devicePixelRatio (qualidade alta)
  LOW_DPR: 1,             // devicePixelRatio na qualidade baixa
  FIXED_DT: 1 / 60,       // passo fixo da física
  MAX_FRAME_DT: 0.1,      // evita "saltos" quando a aba volta do segundo plano

  // Jogador
  PLAYER_SPEED: 210,
  PLAYER_ACCEL: 1900,
  PLAYER_DECEL: 2300,
  AIR_ACCEL: 1400,
  ICE_ACCEL: 420,         // aceleração no gelo (escorrega)
  ICE_DECEL: 160,
  JUMP_FORCE: 650,
  JUMP_CUT: 0.45,         // soltar o pulo cedo corta a velocidade (pulo variável)
  GRAVITY: 1850,
  MAX_FALL_SPEED: 720,
  COYOTE_TIME: 0.1,       // tempo para ainda pular depois de sair da borda
  JUMP_BUFFER: 0.12,      // aperto de pulo "lembrado" antes de tocar o chão
  STOMP_BOUNCE: 430,
  START_LIVES: 3,
  HURT_TIME: 0.9,         // duração da animação de dano antes de voltar ao checkpoint
  INVULN_TIME: 2.0,       // invulnerabilidade após voltar ao checkpoint

  // Poder de fogo
  FIRE_COOLDOWN: 0.28,
  FIRE_SPEED: 430,
  FIRE_RANGE: 320,        // distância máxima de uma bola de fogo
  FIRE_MAX_ON_SCREEN: 3,
  FIRE_START_CHARGES: 5,  // cargas ao pegar o power-up
  FIRE_PICKUP_CHARGES: 3, // cargas por item de carga
  FIRE_MAX_CHARGES: 15,

  // Inimigos
  ENEMY_SPEED: 60,
  FAST_ENEMY_SPEED: 135,
  ARMOR_ENEMY_SPEED: 40,
  FLYER_SPEED: 70,
  ENEMY_ACTIVATE_MARGIN: 160,

  // Chefe
  BOSS_HP: 12,
  BOSS_STOMP_DAMAGE: 2,
  BOSS_FIRE_DAMAGE: 1,
  BOSS_SPEED: [70, 95, 150],       // velocidade por fase
  BOSS_CHARGE_SPEED: 330,
  BOSS_HIT_INVULN: 0.9,
  BOSS_PROJECTILE_GRAVITY: 900,

  // Plataformas especiais
  CRUMBLE_DELAY: 0.45,    // tempo em pé antes de desmoronar
  CRUMBLE_RESPAWN: 3.0,
  VENT_ON: 1.2,           // jato de fogo ligado
  VENT_OFF: 2.0,          // jato desligado
  REGEN_PICKUP_TIME: 9,   // cargas de fogo da arena do chefe reaparecem

  // Câmera
  CAMERA_LERP: 7,
  CAMERA_LOOKAHEAD: 50,
  CAMERA_ANCHOR_X: 0.42,  // posição horizontal do jogador na tela (0..1)
  CAMERA_ANCHOR_Y: 0.58,

  // Pontuação
  SCORE: {
    COIN: 10,
    SPECIAL: 250,
    ENEMY: 100,
    FAST_ENEMY: 150,
    ARMOR_ENEMY: 250,
    FLYER: 150,
    BLOCK: 20,
    KEY: 300,
    BOSS: 3000,
    TIME_BONUS_PER_SEC: 5,  // bônus por segundo abaixo do tempo de referência
    LIFE_BONUS: 500
  },

  PARTICLE_LIMIT: 260
};
