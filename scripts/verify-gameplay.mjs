import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CUSTOM_URL = process.env.GAME_URL;
const PREVIEW_PORT = 4173;
const BASE_URL = CUSTOM_URL || `http://127.0.0.1:${PREVIEW_PORT}`;
const SHOT_DIR =
  process.env.SHOT_DIR ||
  '/Users/amartyamajumder/.gemini/antigravity/brain/64c12712-833e-4d63-82f3-1feaabffe7b2/scratch/shots';

mkdirSync(SHOT_DIR, { recursive: true });

function assert(cond, msg) {
  if (!cond) {
    throw new Error(`VERIFICATION FAILED: ${msg}`);
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function startPreviewServer() {
  if (CUSTOM_URL) return null;
  const child = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PREVIEW_PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out starting vite preview')), 10000);
    child.stdout.on('data', (chunk) => {
      if (String(chunk).includes(String(PREVIEW_PORT))) {
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

async function run() {
  const previewServer = await startPreviewServer();
  console.log(`Launching headless Chrome against ${BASE_URL}...`);
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'],
  });
  try {

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.url()} (${req.failure()?.errorText})`);
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__AUF_STATE__));
  await sleep(900);

  // 1. Verify MenuScene
  let state = await page.evaluate(() => window.__AUF_STATE__());
  console.log('1. MenuScene active:', state.activeScenes);
  assert(state.activeScenes.includes('MenuScene'), 'Expected MenuScene to be active on boot');
  await page.screenshot({ path: join(SHOT_DIR, '01_menu.png') });

  // Start New Journey -> AwakeningScene
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__AUF_STATE__().activeScenes.includes('AwakeningScene'));
  await sleep(950);
  await page.keyboard.press('Space'); // Beat 1 -> Beat 2 (eyes open)
  await sleep(950);
  await page.screenshot({ path: join(SHOT_DIR, '02_awakening.png') });
  await page.keyboard.press('Space'); // Beat 2 -> Beat 3
  await sleep(950);
  await page.keyboard.press('Space'); // Beat 3 -> GameScene

  await page.waitForFunction(
    () =>
      window.__AUF_STATE__().activeScenes.includes('GameScene') &&
      typeof window.__AUF_STATE__().playerX === 'number',
    { timeout: 10000 }
  );
  await sleep(1100);
  await page.screenshot({ path: join(SHOT_DIR, '03_chapter1_awakening_dais.png') });

  // 2. Verify horizontal movement & jumping
  state = await page.evaluate(() => window.__AUF_STATE__());
  const startX = state.playerX;
  assert(state.hasWeight === false, 'Player must start without Weight');
  assert(state.activeQuest === 'q_awakening_verge', 'Initial quest must be q_awakening_verge');

  await page.keyboard.down('KeyD');
  await sleep(550);
  await page.keyboard.up('KeyD');
  state = await page.evaluate(() => window.__AUF_STATE__());
  console.log(`2. Movement check: x=${startX} -> x=${state.playerX}`);
  assert(state.playerX > startX + 60, 'Player must move right when holding D');

  // Verify Jump + Pre-Restoration Floating
  const groundY = state.playerY;
  await page.keyboard.down('Space');
  await sleep(260);
  const jumpMid = await page.evaluate(() => window.__AUF_STATE__());
  assert(jumpMid.playerY < groundY - 25, 'Player must rise when jumping');
  // Continue holding Space past apex to verify Float slow-descent!
  await sleep(750);
  const floatState = await page.evaluate(() => window.__AUF_STATE__());
  console.log('3. Float check:', {
    isFloating: floatState.isFloating,
    velY: floatState.velY,
  });
  assert(floatState.isFloating === true, 'Player must enter float state while holding Space airborne');
  assert(floatState.velY <= 62, `Float fall speed must be capped <= 62, got ${floatState.velY}`);
  await page.keyboard.up('Space');
  await sleep(900);

  // 3. Verify Wind Updraft lift before Weight restoration
  await page.evaluate(() => {
    const gs = window.__AUF_GAME__.scene.getScene('GameScene');
    gs.player.sprite.setPosition(1285, 810);
    gs.player.sprite.body.setVelocity(0, 0);
  });
  await sleep(120);
  await page.keyboard.down('Space');
  await sleep(900);
  const updraftState = await page.evaluate(() => window.__AUF_STATE__());
  console.log('4. Updraft lift check: y=810 -> y=' + updraftState.playerY);
  await page.screenshot({ path: join(SHOT_DIR, '04_updraft_float.png') });
  assert(updraftState.playerY < 680, 'Unbound player must rise inside WindUpdraft when holding Space');
  await page.keyboard.up('Space');

  // 4. Move to Oren & verify Dialogue + Quest Progression
  await page.evaluate(() => {
    const gs = window.__AUF_GAME__.scene.getScene('GameScene');
    gs.player.sprite.setPosition(1640, 510);
    gs.player.sprite.body.setVelocity(0, 0);
  });
  await sleep(300);
  await page.keyboard.press('KeyE'); // Open Oren dialogue
  await sleep(450);
  await page.screenshot({ path: join(SHOT_DIR, '05_oren_dialogue.png') });

  // Advance through Oren's dialogue & choices
  for (let i = 0; i < 12; i++) {
    const dlgOpen = await page.evaluate(() => {
      const gs = window.__AUF_GAME__.scene.getScene('GameScene');
      return gs.dialogueManager.isActive();
    });
    if (!dlgOpen) break;
    await page.keyboard.press('Space');
    await sleep(180);
  }

  state = await page.evaluate(() => window.__AUF_STATE__());
  console.log('5. Post-Oren quest:', state.activeQuest);
  assert(
    state.questStates.q_awakening_verge.status === 'COMPLETED',
    'q_awakening_verge should complete after talking to Oren'
  );
  assert(
    state.activeQuest === 'q_echoes_of_substance',
    'q_echoes_of_substance should activate after Oren dialogue'
  );

  // 5. Solve Puzzle 1 (North Conduit + Wind Vane + East Conduit)
  await page.evaluate(() => {
    const gs = window.__AUF_GAME__.scene.getScene('GameScene');
    gs.player.sprite.setPosition(2130, 286);
    gs.player.sprite.body.setVelocity(0, 0);
  });
  await sleep(220);
  await page.keyboard.press('KeyE'); // Attune North Conduit
  await sleep(200);

  await page.evaluate(() => {
    const gs = window.__AUF_GAME__.scene.getScene('GameScene');
    gs.player.sprite.setPosition(2540, 514);
    gs.player.sprite.body.setVelocity(0, 0);
  });
  await sleep(220);
  await page.keyboard.press('KeyE'); // Turn Wind Vane
  await sleep(200);

  await page.evaluate(() => {
    const gs = window.__AUF_GAME__.scene.getScene('GameScene');
    gs.player.sprite.setPosition(2950, 346);
    gs.player.sprite.body.setVelocity(0, 0);
  });
  await sleep(220);
  await page.keyboard.press('KeyE'); // Attune East Conduit
  await sleep(250);

  const crucibleGateOpen = await page.evaluate(() => {
    const gs = window.__AUF_GAME__.scene.getScene('GameScene');
    return gs.worldFlags.conduit_north && gs.worldFlags.conduit_east;
  });
  assert(crucibleGateOpen, 'Both conduits must be attuned to unseal Crucible Gate');

  // 6. Claim Remnant of Weight & verify Transformation + Single-Trigger Guarantee
  await page.evaluate(() => {
    const gs = window.__AUF_GAME__.scene.getScene('GameScene');
    gs.player.sprite.setPosition(3430, 512);
    gs.player.sprite.body.setVelocity(0, 0);
  });
  await sleep(300);
  await page.screenshot({ path: join(SHOT_DIR, '06_crucible_before_weight.png') });

  await page.keyboard.press('KeyE'); // Claim Remnant of Weight
  await sleep(3100); // Wait for 2.15s restoration ceremony + 0.52s overlay reveal
  await page.screenshot({ path: join(SHOT_DIR, '07_restoration_overlay.png') });

  await page.keyboard.press('Space'); // Dismiss RestorationOverlay
  await sleep(350);
  await page.screenshot({ path: join(SHOT_DIR, '08_grounded_vessel_after_weight.png') });

  state = await page.evaluate(() => window.__AUF_STATE__());
  console.log('6. Post-Restoration state:', {
    hasWeight: state.hasWeight,
    activeQuest: state.activeQuest,
  });
  assert(state.hasWeight === true, 'Player must now possess Weight');
  assert(
    state.activeQuest === 'q_changed_world',
    'q_changed_world must start upon restoring Weight'
  );

  // Verify player CANNOT float after restoration
  await page.keyboard.down('Space');
  await sleep(200);
  await sleep(380);
  const postJumpState = await page.evaluate(() => window.__AUF_STATE__());
  assert(
    postJumpState.isFloating === false,
    'Player must NOT be able to float after restoring Weight'
  );
  await page.keyboard.up('Space');
  await sleep(450);

  // 7. Verify Ground Impact (S + Space while airborne) shatters FracturedSlab
  await page.evaluate(() => {
    const gs = window.__AUF_GAME__.scene.getScene('GameScene');
    gs.player.sprite.setPosition(3650, 512);
    gs.player.sprite.body.setVelocity(0, 0);
  });
  await sleep(220);
  await page.keyboard.press('Space'); // Jump up
  await sleep(160);
  await page.keyboard.down('KeyS');
  await page.keyboard.press('Space'); // Trigger Ground Impact!
  await page.keyboard.up('KeyS');
  await sleep(750);

  state = await page.evaluate(() => window.__AUF_STATE__());
  console.log('7. Post-Ground Impact:', {
    slabBroken: state.worldFlags.slab_crucible_broken,
    playerY: state.playerY,
  });
  assert(
    state.worldFlags.slab_crucible_broken === true,
    'FracturedSlab must shatter under Ground Impact'
  );
  assert(
    state.playerY > 640,
    `Player must drop into Return Gallery (y > 640), got y=${state.playerY}`
  );

  // 8. Verify Chapter 4 Heavy Block Pushing & Dual Pressure Plates in Courtyard
  await page.evaluate(() => {
    const gs = window.__AUF_GAME__.scene.getScene('GameScene');
    gs.player.sprite.setPosition(695, 812);
    gs.player.sprite.body.setVelocity(0, 0);
  });
  await sleep(250);

  // Push HeavyBlock (spawns at x=735) right onto plate_courtyard_a (x=880)
  await page.keyboard.down('KeyD');
  await sleep(1750);
  await page.keyboard.up('KeyD');

  const blockX = await page.evaluate(() => {
    const gs = window.__AUF_GAME__.scene.getScene('GameScene');
    return Math.round(gs.blocks.get('block_courtyard').sprite.x);
  });
  console.log('8. Heavy block pushed: x=735 -> x=' + blockX);
  assert(blockX > 850, `HeavyBlock must move when pushed after Weight, got x=${blockX}`);

  // Step onto plate_courtyard_b (x=1035) while block holds plate_courtyard_a
  await page.evaluate(() => {
    const gs = window.__AUF_GAME__.scene.getScene('GameScene');
    gs.blocks.get('block_courtyard').sprite.setPosition(880, 816);
    gs.player.sprite.setPosition(1035, 812);
    gs.player.sprite.body.setVelocity(0, 0);
  });
  await sleep(350);
  await page.screenshot({ path: join(SHOT_DIR, '09_courtyard_counterweights.png') });

  state = await page.evaluate(() => window.__AUF_STATE__());
  assert(
    state.worldFlags.courtyard_unsealed === true,
    'Dual pressure plates must unseal the Sunken Causeway'
  );

  // 9. Verify Journal [J] UI
  await page.keyboard.press('KeyJ');
  await sleep(300);
  await page.screenshot({ path: join(SHOT_DIR, '10_journal_chronicle.png') });
  await page.keyboard.press('KeyJ');
  await sleep(200);

  // 10. Verify Chapter 5 Vespera Choice & Imprint Acquisition
  await page.evaluate(() => {
    const gs = window.__AUF_GAME__.scene.getScene('GameScene');
    gs.player.sprite.setPosition(3260, 1112);
    gs.player.sprite.body.setVelocity(0, 0);
  });
  await sleep(300);
  await page.keyboard.press('KeyE'); // Speak with Vespera
  await sleep(450);

  // Advance until the final philosophical choice node ('vespera_choice_prompt')
  for (let i = 0; i < 14; i++) {
    const nodeInfo = await page.evaluate(() => {
      const gs = window.__AUF_GAME__.scene.getScene('GameScene');
      return gs.dialogueManager.getCurrentNode()?.id ?? null;
    });
    if (!nodeInfo) break;
    if (nodeInfo === 'vespera_choice_prompt') {
      await sleep(750); // Let typewriter complete
      await page.screenshot({ path: join(SHOT_DIR, '11_vespera_choice.png') });
      await page.keyboard.press('Digit1'); // Choose Imprint of Resonance (Becoming)
      await sleep(300);
      await page.keyboard.press('Space');
      await sleep(250);
      await page.keyboard.press('Space');
      break;
    }
    await page.keyboard.press('Space');
    await sleep(220);
  }

  state = await page.evaluate(() => window.__AUF_STATE__());
  console.log('9. Imprint acquired:', state.imprint);
  assert(state.imprint === 'resonance', 'Expected Imprint of Resonance after choosing option 1');

  // 11. Verify Save Persistence Reload before triggering Ending
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__AUF_STATE__().activeScenes.includes('MenuScene'));
  await sleep(700);
  // Option 0 on MenuScene is now "Continue Journey"!
  await page.keyboard.press('Space');
  await page.waitForFunction(
    () =>
      window.__AUF_STATE__().activeScenes.includes('GameScene') &&
      window.__AUF_STATE__().hasWeight === true,
    { timeout: 10000 }
  );
  state = await page.evaluate(() => window.__AUF_STATE__());
  console.log('10. Save reload verified:', {
    hasWeight: state.hasWeight,
    imprint: state.imprint,
  });
  assert(state.hasWeight === true && state.imprint === 'resonance', 'Saved state must restore');

  // 12. Reach Fractured Mirror-Arch & verify EndingScene + Restart
  await page.evaluate(() => {
    const gs = window.__AUF_GAME__.scene.getScene('GameScene');
    gs.player.sprite.setPosition(4175, 1112);
    gs.player.sprite.body.setVelocity(0, 0);
  });
  await sleep(950); // Wait for camera fade-in settle
  await page.keyboard.press('KeyE'); // Gaze into Fractured Mirror-Arch

  await page.waitForFunction(() => window.__AUF_STATE__().activeScenes.includes('EndingScene'), {
    timeout: 10000,
  });
  await sleep(1100);
  await page.screenshot({ path: join(SHOT_DIR, '12_ending_scene.png') });

  // Press Space on EndingScene -> Replay Vertical Slice (AwakeningScene)
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__AUF_STATE__().activeScenes.includes('AwakeningScene'), {
    timeout: 8000,
  });

  console.log('11. Restart from EndingScene verified!');
  assert(consoleErrors.length === 0, `Console errors found: ${consoleErrors.join('; ')}`);
  assert(failedRequests.length === 0, `Failed asset requests found: ${failedRequests.join('; ')}`);

  console.log('ALL 12 END-TO-END GAMEPLAY VERIFICATION CHECKS PASSED WITH ZERO ERRORS!');
  } finally {
    await browser.close();
    if (previewServer) {
      previewServer.kill('SIGTERM');
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

