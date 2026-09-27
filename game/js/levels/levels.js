/* =========================================================
   LEVELS — as 5 fases do jogo.
   Cada fase usa o LevelBuilder (js/level.js). Coordenadas em
   blocos; y é a linha contada de cima (b.G = topo do chão).

   Alcance do pulo (valores padrão do CONFIG):
     - sobe até ~3 blocos
     - atravessa buracos de até ~4 blocos
   ========================================================= */

// stats disponíveis para os desafios:
// completed, specials, specialTotal, time (s), livesLost, fireUsed, keys, bossDefeated, gameOvers
const LEVELS = [
  /* ---------------- FASE 1 ---------------- */
  {
    id: 1,
    name: 'Floresta Inicial',
    theme: 'forest',
    width: 170,
    parTime: 150,
    challenges: [
      { text: 'Terminar a fase', test: (s) => s.completed },
      { text: 'Encontrar 2/3 moedas especiais', test: (s) => s.specials >= 2 },
      { text: 'Terminar em menos de 3 minutos', test: (s) => s.completed && s.time < 180 }
    ],
    build(b) {
      b.start(3);
      b.ground(0, 30);
      b.sign(5, 7, '◀ ▶  para andar');
      b.coins(7, 11, 4);
      b.sign(13, 6, 'JUMP para pular');
      b.solid(14, 10, 2, 2);
      b.coins(14, 9, 2);
      b.plat(18, 9, 4);
      b.coins(18, 8, 4);
      b.sign(25, 6, 'Pule em cima dos inimigos!');
      b.enemy('walker', 26);
      // buraco 30-31
      b.coinArc(29, 10, 4);
      b.ground(32, 20);
      b.plat(34, 9, 3);
      b.plat(38, 6, 3);
      b.special(39, 5);
      b.coins(44, 11, 3);
      b.enemy('walker', 46);
      b.checkpoint(50);
      // buraco 52-54
      b.coinArc(52, 10, 3);
      b.ground(55, 25);
      b.solid(58, 10, 1, 2);
      b.enemy('walker', 62);
      b.plat(64, 9, 4);
      b.coins(64, 8, 4);
      b.enemy('walker', 69);
      b.solid(72, 11, 4, 1);
      b.solid(73, 10, 3, 1);
      b.solid(74, 9, 2, 1);
      b.coins(74, 8, 2);
      // moeda especial arriscada acima do buraco 80-82
      b.plat(78, 7, 3);
      b.special(79, 6);
      b.ground(83, 30);
      b.coins(86, 11, 3);
      b.enemy('walker', 89);
      b.enemy('walker', 96);
      b.checkpoint(100);
      b.plat(104, 9, 3);
      b.plat(108, 6, 3);
      b.coins(108, 5, 3);
      b.enemy('walker', 110);
      // buraco 113-115
      b.coinArc(113, 10, 3);
      b.ground(116, 25);
      // exploração: escada de plataformas até a 3ª moeda especial
      b.plat(120, 9, 2);
      b.plat(124, 6, 2);
      b.plat(128, 4, 3);
      b.special(129, 3);
      b.coins(124, 5, 2);
      b.enemy('walker', 126);
      b.enemy('walker', 134);
      b.coins(131, 11, 5);
      // buraco 141-142
      b.ground(143, 27);
      b.coins(146, 11, 3);
      b.enemy('walker', 150);
      b.sign(158, 7, 'Entre no portal!');
      b.exit(163);
    }
  },

  /* ---------------- FASE 2 ---------------- */
  {
    id: 2,
    name: 'Deserto Perdido',
    theme: 'desert',
    width: 200,
    parTime: 180,
    challenges: [
      { text: 'Terminar a fase', test: (s) => s.completed },
      { text: 'Não perder nenhuma vida', test: (s) => s.completed && s.livesLost === 0 },
      { text: 'Encontrar 3 moedas especiais', test: (s) => s.specials >= 3 }
    ],
    build(b) {
      b.start(3);
      b.ground(0, 24);
      b.coins(6, 11, 4);
      b.sign(10, 5, 'Blocos rachados quebram com uma cabeçada!');
      // bolso escondido: quebre o piso rachado por baixo
      b.solid(12, 7, 4, 1);
      b.solid(12, 8);
      b.solid(15, 8);
      b.breakable(12, 9, 4, 1);
      b.special(13.5, 8);
      b.enemy('runner', 20);
      // buraco 24-26
      b.ground(27, 18);
      b.breakable(31, 9, 4, 1);
      b.coins(31, 8, 4);
      b.enemy('runner', 37);
      b.enemy('walker', 42);
      // buraco grande 45-52 com plataforma móvel
      b.sign(47, 5, 'Plataformas móveis!');
      b.moving(45, 10, 3, 4, 0, 55);
      b.coinArc(46, 8, 5);
      b.ground(53, 20);
      b.checkpoint(55);
      b.coins(58, 11, 3);
      b.enemy('runner', 61);
      b.breakable(63, 9, 3, 1);
      b.coins(63, 8, 3);
      b.enemy('runner', 67);
      // buraco 73-80: moeda especial no alto, acima da plataforma
      b.moving(73, 9, 3, 4, 0, 55);
      b.special(76, 6);
      b.ground(81, 22);
      b.enemy('walker', 86);
      b.breakable(88, 9, 2, 1);
      b.coins(88, 8, 2);
      b.enemy('runner', 92);
      b.solid(96, 11, 2, 1);
      b.solid(97, 10, 1, 1);
      b.checkpoint(100);
      // buraco 103-108
      b.moving(104, 10, 2, 2, 0, 60);
      b.coinArc(103, 8, 6);
      b.ground(109, 18);
      b.coins(111, 11, 3);
      b.enemy('runner', 114);
      b.enemy('runner', 120);
      // buraco 127-134 com pilares
      b.solid(129, 9, 1, 6);
      b.special(129, 7);
      b.solid(132, 10, 1, 5);
      b.coins(132, 8);
      b.ground(135, 30);
      b.checkpoint(142);
      b.coins(144, 11, 3);
      b.breakable(147, 9, 3, 1);
      b.coins(147, 8, 3);
      b.enemy('walker', 150);
      b.enemy('runner', 156);
      // buraco 165-171
      b.moving(166, 10, 3, 2, 0, 65);
      b.ground(172, 28);
      b.coins(176, 11, 5);
      b.enemy('runner', 182);
      b.exit(192);
    }
  },

  /* ---------------- FASE 3 ---------------- */
  {
    id: 3,
    name: 'Montanha Congelada',
    theme: 'ice',
    width: 210,
    parTime: 200,
    challenges: [
      { text: 'Terminar a fase', test: (s) => s.completed },
      { text: 'Usar no máximo 3 ataques de fogo', test: (s) => s.completed && s.fireUsed <= 3 },
      { text: 'Encontrar 3 moedas especiais', test: (s) => s.specials >= 3 }
    ],
    build(b) {
      b.start(3);
      b.ground(0, 22);
      b.coins(6, 11, 4);
      b.enemy('walker', 13);
      b.sign(18, 6, 'Cuidado: o gelo escorrega!');
      b.ice(17, 9, 4, 1);
      b.coins(17, 8, 4);
      b.ice(22, 12, 8, 3);
      b.enemy('walker', 26);
      // buraco 30-32
      b.ground(33, 34);
      // caminho de cima (gelo) x caminho de baixo
      b.ice(36, 9, 3);
      b.ice(40, 6, 3);
      b.ice(45, 6, 3);
      b.coins(45, 5, 3);
      b.ice(49, 4, 3);
      b.special(50, 3);
      b.enemy('flyer', 47, 9);
      b.coins(40, 11, 6);
      b.enemy('walker', 44);
      b.enemy('walker', 53);
      b.checkpoint(57);
      // o poder de fogo aparece aqui pela primeira vez
      b.sign(61, 6, 'Brasa Viva! Aperte FIRE (ou F)');
      b.power(62, 11);
      b.fire(65, 11);
      // corredor com teto baixo: só passa usando fogo
      b.ground(67, 24);
      b.sign(67, 5, 'Casco-de-Pedra tem espinhos: use FIRE!');
      b.solid(70, 0, 14, 10);
      b.enemy('armor', 75);
      b.enemy('armor', 80);
      b.coins(72, 11, 10);
      b.checkpoint(87);
      b.fire(89, 11);
      // buraco 91-94 com bloco de gelo no meio
      b.ice(92, 10, 2, 1);
      b.ground(95, 20);
      b.coins(97, 11, 3);
      b.enemy('flyer', 100, 8);
      b.enemy('walker', 104);
      b.enemy('flyer', 108, 7);
      b.enemy('armor', 111);
      // área de queda: saliência dentro do buraco 115-121
      b.solid(117, 13, 2, 2);
      b.special(117.5, 12);
      b.ground(122, 26);
      b.checkpoint(124);
      b.ice(128, 12, 10, 3);
      b.enemy('runner', 133);
      b.coins(129, 11, 8);
      b.enemy('flyer', 139, 8);
      b.ice(141, 9, 2);
      b.ice(144, 6, 2);
      b.special(144.5, 4);
      b.fire(146, 11);
      // buraco 148-151
      b.ground(152, 20);
      b.checkpoint(155);
      b.enemy('armor', 161);
      b.enemy('walker', 167);
      b.coins(158, 8, 5);
      // buraco 172-174
      b.coinArc(172, 10, 3);
      b.ground(175, 35);
      b.enemy('flyer', 182, 8);
      b.enemy('walker', 188);
      b.coins(190, 11, 5);
      b.exit(202);
    }
  },

  /* ---------------- FASE 4 ---------------- */
  {
    id: 4,
    name: 'Vulcão Ardente',
    theme: 'volcano',
    width: 180,
    height: 24,
    parTime: 240,
    challenges: [
      { text: 'Terminar a fase', test: (s) => s.completed },
      { text: 'Não perder todas as vidas (sem Game Over)', test: (s) => s.completed && s.gameOvers === 0 },
      { text: 'Encontrar 2/3 moedas especiais', test: (s) => s.specials >= 2 }
    ],
    build(b) {
      b.start(3);
      b.ground(0, 16);
      b.sign(6, 16, 'Lava derrota na hora!');
      b.power(8, 20);
      b.fire(11, 20);
      b.lava(16, 6);
      b.solid(18, 19, 2, 1);
      b.ground(22, 10);
      b.coins(23, 20, 3);
      b.enemy('armor', 27);
      b.vent(30, b.G, 0);
      b.enemy('flyer', 29, 16);
      // subida sobre o mar de lava
      b.lava(32, 53);
      b.solid(33, 19, 2, 1);
      b.crumble(36, 17, 2);
      b.solid(39, 15, 2, 1);
      b.crumble(42, 13, 2);
      b.solid(45, 11, 3, 1);
      b.coins(45, 10, 3);
      b.solid(49, 9, 2, 1);
      b.solid(52, 7, 10, 1);
      b.checkpoint(54, 7);
      b.coins(56, 6, 5);
      // área secreta no alto
      b.plat(57, 4, 3);
      b.special(58, 3);
      b.fire(60, 3);
      // descida com plataformas que desaparecem
      b.crumble(63, 7, 2);
      b.crumble(66, 8, 2);
      b.enemy('flyer', 67, 4);
      b.solid(69, 9, 3, 1);
      b.coins(69, 8, 3);
      b.solid(73, 11, 2, 1);
      b.crumble(76, 13, 2);
      b.solid(79, 15, 2, 1);
      b.solid(82, 17, 2, 1);
      b.ground(85, 15);
      b.checkpoint(88);
      b.power(86, 20);
      b.enemy('armor', 92);
      b.enemy('walker', 96);
      // sala secreta: parede rachada, quebre com FIRE
      b.plat(88, 18, 3);
      b.plat(90, 15, 4);
      b.sign(91, 12, 'Hmm... parede rachada?');
      b.solid(94, 11, 5, 1);
      b.solid(94, 15, 5, 1);
      b.solid(98, 12, 1, 3);
      b.breakable(94, 12, 1, 3);
      b.special(96, 14);
      b.coins(95, 13);
      b.coins(97, 13);
      // lava 100-111 com plataforma móvel
      b.lava(100, 12);
      b.moving(101, 19, 3, 6, 0, 70);
      b.enemy('flyer', 105, 15);
      b.coinArc(102, 17, 7);
      b.ground(112, 14);
      b.vent(116, b.G, 0);
      b.vent(121, b.G, 1.6);
      b.enemy('armor', 119);
      b.fire(114, 20);
      b.checkpoint(124);
      // torres sobre a lava
      b.lava(126, 24);
      b.solid(127, 19, 2, 5);
      b.solid(131, 17, 2, 7);
      b.crumble(135, 15, 2);
      b.solid(138, 14, 2, 10);
      b.plat(140, 11, 2);
      b.special(140.5, 10);
      b.solid(142, 16, 2, 8);
      b.solid(146, 18, 2, 6);
      b.ground(150, 30);
      b.coins(152, 20, 4);
      b.enemy('flyer', 158, 16);
      b.enemy('armor', 162);
      b.enemy('walker', 167);
      b.exit(174);
    }
  },

  /* ---------------- FASE 5 ---------------- */
  {
    id: 5,
    name: 'Castelo Sombrio',
    theme: 'castle',
    width: 200,
    parTime: 300,
    challenges: [
      { text: 'Encontrar as 3 chaves', test: (s) => s.keys >= 3 },
      { text: 'Derrotar o chefe', test: (s) => s.bossDefeated },
      { text: 'Encontrar todas as moedas especiais', test: (s) => s.specials >= s.specialTotal }
    ],
    build(b) {
      b.start(3);
      b.ground(0, 20);
      b.sign(5, 6, 'Encontre as 3 chaves!');
      b.power(7, 11);
      b.fire(9, 11);
      b.enemy('walker', 13);
      b.spikes(16, 11, 2);
      b.lava(20, 3);
      b.ground(23, 20);
      b.enemy('runner', 27);
      // chave 1 no alto
      b.plat(30, 9, 3);
      b.plat(34, 6, 2);
      b.key(34.5, 5);
      b.enemy('flyer', 32, 8);
      b.enemy('armor', 36);
      b.vent(39, b.G, 0.5);
      b.checkpoint(41);
      // ponte que desmorona sobre a lava
      b.lava(43, 6);
      b.crumble(44, 10, 2);
      b.ground(49, 24);
      b.spikes(53, 11, 3);
      b.special(54, 8);
      b.enemy('runner', 59);
      b.fire(60, 8);
      b.enemy('walker', 62);
      // chave 2: sala com parede rachada (use FIRE)
      b.sign(62, 5, 'Use FIRE na parede rachada');
      b.solid(65, 9, 4, 1);
      b.breakable(65, 10, 1, 2);
      b.solid(68, 10, 1, 2);
      b.key(67, 11);
      b.enemy('flyer', 70, 7);
      b.checkpoint(71);
      // lava 73-77 com plataforma móvel
      b.lava(73, 5);
      b.moving(74, 10, 2, 2, 0, 60);
      b.ground(78, 30);
      b.enemy('armor', 84);
      b.enemy('walker', 90);
      // chave 3 no topo da torre
      b.solid(92, 9, 2, 3);
      b.plat(95, 6, 3);
      b.plat(99, 3, 2);
      b.key(99.5, 2);
      b.enemy('runner', 96);
      b.spikes(101, 11, 2);
      b.fire(105, 11);
      // lava 108-113 com plataforma que desmorona
      b.lava(108, 6);
      b.crumble(110, 10, 2);
      b.special(110.5, 7);
      b.ground(114, 25);
      b.checkpoint(116);
      b.plat(119, 9, 2);
      b.plat(123, 6, 2);
      b.special(123.5, 5);
      b.enemy('flyer', 122, 8);
      b.enemy('armor', 127);
      b.enemy('flyer', 130, 6);
      b.vent(133, b.G, 0);
      b.vent(135, b.G, 1.6);
      // buraco 139-142
      b.ground(143, 57);
      b.enemy('walker', 147);
      b.enemy('runner', 151);
      b.fire(153, 11);
      b.checkpoint(155);
      b.sign(156, 5, 'Porta das 3 chaves');
      b.solid(159, 0, 3, 9);
      b.door(159, 9, 3, 3);
      // arena do chefe
      b.checkpoint(164);
      b.plat(170, 9, 3);
      b.plat(186, 9, 3);
      b.fire(171, 8, true);
      b.fire(187, 8, true);
      b.solid(198, 0, 2, 12);
      b.boss(162, 198, 184);
    }
  }
];
