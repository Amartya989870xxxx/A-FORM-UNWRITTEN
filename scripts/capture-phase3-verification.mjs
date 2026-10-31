import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const SHOT_DIR = join(ROOT, 'qa', 'phase3-highlands');

const BASE_URL = 'http://127.0.0.1:4173';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startPreviewServer() {
  const child = spawn(
    'npx',
    ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173'],
    {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Preview server timeout')), 10000);
    child.stdout.on('data', (d) => {
      const msg = String(d);
      if (msg.includes('4173') || msg.includes('Local:')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  return child;
}

async function teleportPlayer(page, x, y) {
  await page.evaluate(
    ([tx, ty]) => {
      const gs = window.__AUF_GAME__.scene.getScene('GameScene');
      gs.player.sprite.setPosition(tx, ty);
      gs.player.sprite.body.setVelocity(0, 0);
      gs.cameras.main.centerOn(tx, ty);
    },
    [x, y]
  );
}

async function capture() {
  await mkdir(SHOT_DIR, { recursive: true });
  const preview = await startPreviewServer();
  console.log('Preview server ready on port 4173.');

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'],
  });

  try {
    // 1. Full HD desktop viewport (1920x1080)
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/?tod=day`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(window.__AUF_GAME__ && window.__AUF_STATE__));
    await sleep(600);

    // Boot directly into GameScene
    await page.evaluate(() => {
      window.__AUF_GAME__.scene.start('GameScene', { playerName: 'Caelen' });
    });

    await page.waitForFunction(
      () =>
        window.__AUF_STATE__().activeScenes.includes('GameScene') &&
        typeof window.__AUF_STATE__().playerX === 'number',
      null,
      { timeout: 10000 }
    );
    await sleep(1000);

    // 1. Player spawn at Whispering Precipice (Day)
    console.log('Capturing 01-player-spawn-day.png...');
    await page.evaluate(() => {
      const gs = window.__AUF_GAME__.scene.getScene('GameScene');
      gs.lightingController.forcePhase('day');
      gs.lightingController.update(1000, 16);
    });
    await teleportPlayer(page, 150, 836);
    await sleep(700);
    await page.screenshot({ path: join(SHOT_DIR, '01-player-spawn-day.png') });

    // 2. Precipice at Dawn
    console.log('Capturing 02-precipice-dawn.png...');
    await page.evaluate(() => {
      const gs = window.__AUF_GAME__.scene.getScene('GameScene');
      gs.lightingController.forcePhase('dawn');
      gs.lightingController.update(1000, 16);
    });
    await sleep(700);
    await page.screenshot({ path: join(SHOT_DIR, '02-precipice-dawn.png') });

    // 3. Precipice at Sunset
    console.log('Capturing 03-precipice-sunset.png...');
    await page.evaluate(() => {
      const gs = window.__AUF_GAME__.scene.getScene('GameScene');
      gs.lightingController.forcePhase('sunset');
      gs.lightingController.update(1000, 16);
    });
    await sleep(700);
    await page.screenshot({ path: join(SHOT_DIR, '03-precipice-sunset.png') });

    // 4. Precipice at Night (moonlit, readable, lantern glow)
    console.log('Capturing 04-precipice-night.png...');
    await page.evaluate(() => {
      const gs = window.__AUF_GAME__.scene.getScene('GameScene');
      gs.lightingController.forcePhase('night');
      gs.lightingController.update(1000, 16);
    });
    await sleep(700);
    await page.screenshot({ path: join(SHOT_DIR, '04-precipice-night.png') });

    // 5. Counterweight Courtyard with stone pavers and props (Day)
    console.log('Capturing 05-counterweight-courtyard.png...');
    await page.evaluate(() => {
      const gs = window.__AUF_GAME__.scene.getScene('GameScene');
      gs.lightingController.forcePhase('day');
      gs.lightingController.update(1000, 16);
    });
    await teleportPlayer(page, 870, 836);
    await sleep(700);
    await page.screenshot({ path: join(SHOT_DIR, '05-counterweight-courtyard.png') });

    // 6. Close-up on platform edge showing collision parity (no floating, no sinking)
    console.log('Capturing 06-platform-edge-collision.png...');
    await teleportPlayer(page, 475, 836);
    await sleep(700);
    await page.screenshot({ path: join(SHOT_DIR, '06-platform-edge-collision.png') });

    // 7. Parallax depth test at wide viewport (1920x1080)
    console.log('Capturing 07-parallax-wide-1920x1080.png...');
    await teleportPlayer(page, 320, 836);
    await sleep(700);
    await page.screenshot({ path: join(SHOT_DIR, '07-parallax-wide-1920x1080.png') });

    await context.close();

    // 8. Parallax depth test at mobile viewport (375x667)
    console.log('Capturing 08-parallax-mobile-375x667.png...');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      deviceScaleFactor: 2,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${BASE_URL}/?tod=day`, { waitUntil: 'networkidle' });
    await mobilePage.waitForFunction(() => Boolean(window.__AUF_GAME__ && window.__AUF_STATE__));
    await sleep(600);

    await mobilePage.evaluate(() => {
      window.__AUF_GAME__.scene.start('GameScene', { playerName: 'Caelen' });
    });

    await mobilePage.waitForFunction(
      () =>
        window.__AUF_STATE__().activeScenes.includes('GameScene') &&
        typeof window.__AUF_STATE__().playerX === 'number',
      null,
      { timeout: 10000 }
    );
    await sleep(1000);
    await teleportPlayer(mobilePage, 320, 836);
    await sleep(700);
    await mobilePage.screenshot({ path: join(SHOT_DIR, '08-parallax-mobile-375x667.png') });
    await mobileContext.close();

    console.log('All 8 Phase 3 verification screenshots successfully captured in qa/phase3-highlands/!');
  } finally {
    await browser.close();
    preview.kill();
  }
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
