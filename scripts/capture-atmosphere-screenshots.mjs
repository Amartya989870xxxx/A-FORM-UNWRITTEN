import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const SHOT_DIR = join(ROOT, 'qa', 'environment');

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

async function capture() {
  await mkdir(SHOT_DIR, { recursive: true });
  const preview = await startPreviewServer();
  console.log('Preview server ready on port 4173.');

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'],
  });

  const phases = [
    { id: 'dawn', filename: '01-dawn.png', label: 'Dawn (06:00)' },
    { id: 'morning', filename: '02-morning.png', label: 'Morning (09:00)' },
    { id: 'day', filename: '03-day.png', label: 'Day (13:30)' },
    { id: 'golden', filename: '04-golden-hour.png', label: 'Golden Hour (17:30)' },
    { id: 'sunset', filename: '05-sunset.png', label: 'Sunset (19:30)' },
    { id: 'night', filename: '06-night.png', label: 'Night (01:00)' },
  ];

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Start with Dawn
    await page.goto(`${BASE_URL}/?tod=dawn`, { waitUntil: 'networkidle' });
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

    // Capture each phase
    for (const p of phases) {
      console.log(`Setting atmosphere to ${p.label}...`);
      await page.evaluate((phaseId) => {
        const gs = window.__AUF_GAME__.scene.getScene('GameScene');
        const phaseName = phaseId === 'golden' ? 'golden_hour' : phaseId;
        gs.lightingController.forcePhase(phaseName);
        // Step controller forward to immediately apply visual changes
        gs.lightingController.update(1000, 16);
      }, p.id);

      await sleep(650);

      const state = await page.evaluate(() => {
        const s = window.__AUF_STATE__();
        return {
          phase: s.atmospherePhase,
          fraction: s.dayFraction,
          playerX: s.playerX,
          playerY: s.playerY,
        };
      });

      console.log(`Captured ${p.filename} [Phase: ${state.phase}, DayFraction: ${state.fraction}]`);
      const targetPath = join(SHOT_DIR, p.filename);
      await page.screenshot({ path: targetPath });
    }

    console.log('All 6 atmosphere phase screenshots successfully captured in Full HD (1920x1080)!');
  } finally {
    await browser.close();
    preview.kill();
  }
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
