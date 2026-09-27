/* =========================================================
   MAIN — inicialização e loop principal (requestAnimationFrame
   com passo fixo de física para ficar igual em qualquer tela).
   ========================================================= */
(function () {
  Save.load();
  Render.init(document.getElementById('game'));
  Input.init();
  UI.init();
  UI.show('menu');

  // Impede gestos do navegador que atrapalham o jogo
  const stop = (e) => e.preventDefault();
  document.addEventListener('gesturestart', stop, { passive: false });
  document.addEventListener('dblclick', stop, { passive: false });
  document.addEventListener('contextmenu', stop);
  document.addEventListener('touchmove', (e) => {
    if (!e.target.closest('.scroll')) e.preventDefault();
  }, { passive: false });
  // Bloqueia zoom com dois toques rápidos no iOS
  let lastTouch = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouch < 300 && !e.target.closest('button')) e.preventDefault();
    lastTouch = now;
  }, { passive: false });

  // Libera o áudio no primeiro toque/tecla
  const unlock = () => Sound.unlock();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock, { passive: true });

  const onResize = () => {
    Render.resize();
    // celular em pé durante o jogo: pausa automaticamente
    if (Input.isTouch && window.innerHeight > window.innerWidth && Game.state === 'playing') Game.togglePause();
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 200));

  // Aba em segundo plano: pausa
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && Game.state === 'playing') Game.togglePause();
  });

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > CONFIG.MAX_FRAME_DT) dt = CONFIG.MAX_FRAME_DT;
    acc += dt;
    let steps = 0;
    while (acc >= CONFIG.FIXED_DT && steps < 5) {
      Game.update(CONFIG.FIXED_DT);
      Input.consume();
      acc -= CONFIG.FIXED_DT;
      steps++;
    }
    if (steps === 5) acc = 0;
    Game.render(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Atalho para testes: window.BROTIM.Game etc.
  window.BROTIM = { Game, Save, CONFIG, Input, Render, UI };
})();
