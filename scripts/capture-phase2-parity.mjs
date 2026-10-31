import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const SHOT_DIR = join(ROOT, 'qa', 'phase2-parity');

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

const VIEWPORTS = [
  { id: '01_start', x: 215, y: 810, label: 'Starting Region (Whispering Precipice)' },
  { id: '02_wind_spire', x: 2210, y: 510, label: 'Wind-Spire Conduit (Floating Islands)' },
  { id: '03_sky_arch', x: 3760, y: 344, label: 'Shattered Sky-Arch (Bridge Span)' },
  { id: '04_crucible', x: 4385, y: 564, label: 'Crucible of Mass (Sealed Altar)' },
  { id: '05_sunken_causeway', x: 2500, y: 1140, label: 'Sunken Causeway (Submerged Sanctum)' },
  { id: '06_upper_vertical', x: 2560, y: 224, label: 'Upper Vertical Viewport (High Overlook)' },
];

async function captureMode(browser, modeName, urlParam) {
  console.log(`\n--- Capturing mode: ${modeName} (${urlParam}) ---`);
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/?tod=day${urlParam}`, { waitUntil: 'networkidle' });
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
  await sleep(800);

  // Force day phase and stabilize
  await page.evaluate(() => {
    const gs = window.__AUF_GAME__.scene.getScene('GameScene');
    gs.lightingController.forcePhase('day');
    gs.lightingController.update(1000, 16);
  });
  await sleep(300);

  for (const vp of VIEWPORTS) {
    console.log(`Capturing ${vp.label} at (${vp.x}, ${vp.y})...`);
    await page.evaluate(
      ({ x, y }) => {
        const gs = window.__AUF_GAME__.scene.getScene('GameScene');
        gs.player.sprite.setPosition(x, y);
        const body = gs.player.sprite.body;
        if (body) {
          body.setVelocity(0, 0);
          body.setAcceleration(0, 0);
        }
        gs.cameras.main.scrollX = x - gs.cameras.main.width / 2;
        gs.cameras.main.scrollY = y - gs.cameras.main.height / 2;
      },
      { x: vp.x, y: vp.y }
    );
    await sleep(400);

    const outPath = join(SHOT_DIR, `${vp.id}_${modeName}.png`);
    await page.screenshot({ path: outPath });
    console.log(`Saved: ${outPath}`);
  }

  await context.close();
}

async function run() {
  await mkdir(SHOT_DIR, { recursive: true });
  const preview = await startPreviewServer();
  console.log('Preview server ready on port 4173.');

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'],
  });

  try {
    // 1. Modular mode (Phase 2 architecture)
    await captureMode(browser, 'modular', '');

    // 2. Legacy fallback mode (?env=legacy)
    await captureMode(browser, 'legacy', '&env=legacy');

    console.log('\nParity capture complete! All screenshots saved in qa/phase2-parity/');
  } finally {
    await browser.close();
    preview.kill('SIGTERM');
  }
}

run().catch((err) => {
  console.error('Parity capture failed:', err);
  process.exit(1);
});
