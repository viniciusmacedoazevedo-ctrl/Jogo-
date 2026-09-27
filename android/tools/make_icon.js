// Gera android/res/ic_launcher.png desenhando o Brotim com o código do próprio jogo.
// Uso: node android/tools/make_icon.js  (precisa do Playwright e do servidor em localhost:8080 servindo game/)
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8080/index.html');
  const data = await page.evaluate(() => {
    const S = 192, c = document.createElement('canvas');
    c.width = S; c.height = S;
    const g = c.getContext('2d');
    // fundo arredondado com céu e chão
    g.beginPath(); g.roundRect(0, 0, S, S, 40); g.clip();
    const sky = g.createLinearGradient(0, 0, 0, S);
    sky.addColorStop(0, '#5dbdf5'); sky.addColorStop(1, '#c4ecff');
    g.fillStyle = sky; g.fillRect(0, 0, S, S);
    g.fillStyle = '#72c08f'; g.beginPath(); g.ellipse(40, 150, 90, 40, 0, 0, Math.PI * 2); g.ellipse(170, 155, 80, 35, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8b5a2b'; g.fillRect(0, 150, S, 42);
    g.fillStyle = '#47bf57'; g.fillRect(0, 146, S, 10);
    // moeda
    g.fillStyle = '#c98a12'; g.beginPath(); g.ellipse(150, 50, 15, 17, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffd43b'; g.beginPath(); g.ellipse(150, 50, 12, 14, 0, 0, Math.PI * 2); g.fill();
    // Brotim
    const p = BROTIM.Game.player;
    p.spawn(0, 0); p.anim = 'idle'; p.invuln = 0; p.dead = false; p.onGround = true; p.facing = 1; p.squash = 1;
    g.save(); g.translate(92, 150); g.scale(4.2, 4.2); g.translate(-p.cx, -(p.y + p.h));
    p.draw(g, 0.3);
    g.restore();
    return c.toDataURL('image/png');
  });
  require('fs').writeFileSync(path.join(__dirname, '..', 'res', 'ic_launcher.png'), Buffer.from(data.split(',')[1], 'base64'));
  console.log('ícone gerado');
  await browser.close();
})();
