# Jogo-

## Brotim: Jornada das Cinco Terras

Jogo de plataforma 2D **original**, feito para celular na horizontal. Roda direto no navegador, em HTML5 Canvas e JavaScript puro, sem frameworks e sem backend.

O jogo está na pasta [`game/`](game/).

### Como executar

Qualquer servidor estático serve. Na pasta `game/`, rode um destes:

```bash
npx http-server -p 8080     # ou
python3 -m http.server 8080
```

Depois abra `http://localhost:8080`. Abrir o `index.html` direto do disco também funciona, porque o jogo não usa módulos ES.

- **No celular:** deixe o PC e o celular na mesma rede Wi-Fi e abra `http://IP-DO-PC:8080`. Também dá para publicar a pasta `game/` no GitHub Pages, Netlify etc.
- **Teclado (PC):** A/D ou setas para andar, Espaço (ou ↑ ou W) para pular, F para fogo, Esc ou P para pausar.
- **Botões touch no PC:** abra `index.html?touch=1`.

### Estrutura

```
game/
  index.html            telas (menu, fases, pause, resultado...) e HUD
  css/style.css         layout responsivo, controles touch
  js/config.js          CONFIG: física, fogo, inimigos, câmera, pontuação
  js/input.js           teclado + toque (multitoque, deslizar o dedo)
  js/audio.js           efeitos sonoros sintetizados (Web Audio API)
  js/save.js            progresso no LocalStorage
  js/collision.js       colisão AABB com blocos e plataformas
  js/particles.js       partículas e textos flutuantes
  js/level.js           mapa de blocos, construtor de fases, plataformas, jatos de fogo
  js/levels/themes.js   cores e ambientação de cada mundo
  js/levels/levels.js   as 5 fases e seus desafios
  js/player.js          personagem Brotim
  js/enemy.js           inimigos e o chefe Morvak
  js/render.js          cenário, parallax, blocos e itens
  js/ui.js              menus, HUD, avisos
  js/game.js            regras da partida (vidas, checkpoints, fogo, chefe, câmera)
  js/main.js            inicialização e loop (requestAnimationFrame, passo fixo)
  assets/images, assets/sounds   vazias: toda a arte e todo o som são gerados por código
```

### Como editar

- **Física e dificuldade:** altere `js/config.js`.
- **Fases:** cada fase em `js/levels/levels.js` é uma sequência de comandos, com coordenadas em blocos (`b.ground`, `b.plat`, `b.coins`, `b.enemy`, `b.checkpoint`, `b.exit`...). A lista completa de comandos está na classe `LevelBuilder`, em `js/level.js`.

### APK para Android

O APK pronto fica em `android/dist/brotim.apk` e roda no Android 7.0 ou mais novo.

Para gerar de novo depois de mudar o jogo (precisa de Python 3, JDK e acesso ao Maven Central):

```bash
python3 android/build_apk.py
```

O app é uma tela cheia na horizontal, com um WebView que carrega a pasta `game/` embutida. Não precisa de internet.

O script baixa sozinho o `android.jar`, o `dx` e o `apksig` do Maven Central. O manifesto binário e o `resources.arsc` são gerados pelo próprio script, sem Android SDK nem Gradle.

A chave de assinatura é criada em `android/.keystore/`, que fica fora do git. Guarde essa pasta: um APK assinado com outra chave só instala depois de desinstalar a versão anterior, e isso apaga o progresso salvo.
