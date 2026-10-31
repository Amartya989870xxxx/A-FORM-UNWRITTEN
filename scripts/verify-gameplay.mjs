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
  '/Users/amartyamajumder/.gemini/antigravity/brain/64c12712-833e-4d63-82f3-1feaabffe7b2/scratch/shots_hd';

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
  const child = spawn(
    'npx',
    ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PREVIEW_PORT)],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
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

async function teleportPlayer(page, x, y) {
  await page.evaluate(
    ([tx, ty]) => {
      const gs = window.__AUF_GAME__.scene.getScene('GameScene');
      gs.player.sprite.setPosition(tx, ty);
      gs.player.sprite.body.setVelocity(0, 0);
      gs.cameras.main.centerOn(tx, ty);
      gs.explorationManager.updatePlayerPosition(tx, ty, gs.getMapRevealRadius());
    },
    [x, y]
  );
}

async function run() {
  const previewServer = await startPreviewServer();
  console.log(`Launching headless Chrome (1920x1080 Full HD) against ${BASE_URL}...`);
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
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
    await sleep(950);

    // 1. Verify Full HD MenuScene (1920x1080)
    let state = await page.evaluate(() => window.__AUF_STATE__());
    console.log('1. MenuScene active:', state.activeScenes, `${state.canvasWidth}x${state.canvasHeight}`);
    assert(state.activeScenes.includes('MenuScene'), 'Expected MenuScene to be active on boot');
    assert(
      state.canvasWidth === 1920 && state.canvasHeight === 1080,
      `Expected 1920x1080 Full HD canvas, got ${state.canvasWidth}x${state.canvasHeight}`
    );
    await page.screenshot({ path: join(SHOT_DIR, '01_menu_hd.png') });

    // 2. Verify NamePrompt Cancellation first, then Confirmation with 'Caelen'
    await page.keyboard.press('Space');
    await page.waitForFunction(() => {
      const dlg = document.getElementById('name-dialog');
      return Boolean(dlg && dlg.open);
    });
    await page.fill('#player-name-input', 'DiscardedDraft');
    await page.click('#name-dialog button[value="cancel"]');
    await page.waitForFunction(() => {
      const dlg = document.getElementById('name-dialog');
      return Boolean(dlg && !dlg.open);
    });
    await sleep(220);
    state = await page.evaluate(() => ({
      ...window.__AUF_STATE__(),
      hasSave: window.localStorage.getItem('auf_save_v1') !== null,
    }));
    assert(
      state.activeScenes.includes('MenuScene') && state.hasSave === false,
      'Cancelling NamePrompt must stay on MenuScene without writing any save'
    );

    // Re-open NamePrompt, type 'Caelen', submit via Enter
    await page.keyboard.press('Space');
    await page.waitForFunction(() => {
      const dlg = document.getElementById('name-dialog');
      return Boolean(dlg && dlg.open);
    });
    await sleep(200);
    await page.fill('#player-name-input', 'Caelen');
    await sleep(160);
    await page.screenshot({ path: join(SHOT_DIR, '02_player_naming_dialog.png') });
    await page.press('#player-name-input', 'Enter');

    await page.waitForFunction(
      () => window.__AUF_STATE__().activeScenes.includes('AwakeningScene'),
      null,
      { timeout: 8000 }
    );
    await sleep(900);
    await page.keyboard.press('Space', { delay: 80 }); // Beat 1 -> Beat 2
    await sleep(900);
    await page.screenshot({ path: join(SHOT_DIR, '02b_awakening_hd.png') });
    await page.keyboard.press('Space', { delay: 80 }); // Beat 2 -> Beat 3
    await sleep(900);
    await page.keyboard.press('Space', { delay: 80 }); // Beat 3 -> GameScene

    await page.waitForFunction(
      () =>
        window.__AUF_STATE__().activeScenes.includes('GameScene') &&
        typeof window.__AUF_STATE__().playerX === 'number',
      null,
      { timeout: 10000 }
    );
    await sleep(1000);
    await page.screenshot({ path: join(SHOT_DIR, '03_gameplay_garment_unanchored.png') });

    // 3. Verify Character Identity, Custom Name, Movement & Floating
    state = await page.evaluate(() => window.__AUF_STATE__());
    console.log('2. Initial GameScene state:', {
      playerName: state.playerName,
      rank: state.adventurerRank,
      stabilizationState: state.stabilizationState,
      regionExplorationPct: state.regionExplorationPct,
    });
    assert(state.playerName === 'Caelen', `Expected playerName 'Caelen', got '${state.playerName}'`);
    assert(state.adventurerRank === 'G', `Expected initial rank 'G', got '${state.adventurerRank}'`);
    assert(state.hasWeight === false, 'Player must start without Weight');
    assert(state.stabilizationState === 'Unanchored State', 'Initial state must be Unanchored State');
    assert(state.activeQuest === 'q_awakening_verge', 'Initial quest must be q_awakening_verge');

    const startX = state.playerX;
    await page.keyboard.down('KeyD');
    await sleep(550);
    await page.keyboard.up('KeyD');
    state = await page.evaluate(() => window.__AUF_STATE__());
    assert(state.playerX > startX + 60, 'Player must move right when holding D');

    const groundY = state.playerY;
    await page.keyboard.down('Space');
    await sleep(260);
    const jumpMid = await page.evaluate(() => window.__AUF_STATE__());
    assert(jumpMid.playerY < groundY - 25, 'Player must rise when jumping');
    await sleep(750);
    const floatState = await page.evaluate(() => window.__AUF_STATE__());
    assert(floatState.isFloating === true, 'Player must enter float state while holding Space airborne');
    assert(floatState.velY <= 62, `Float fall speed must be capped <= 62, got ${floatState.velY}`);
    await page.keyboard.up('Space');
    await sleep(800);

    // 3b. Pick up Echo Tablet I & Test PauseMenu Restart Confirmation (both Cancel and Confirm!)
    await teleportPlayer(page, 760, 612);
    await sleep(260);
    await page.keyboard.press('KeyE');
    await sleep(260);
    state = await page.evaluate(() => window.__AUF_STATE__());
    assert(
      state.echoCount === 1 && state.discoveredEchoes.includes('echo_first_law'),
      'Interacting with echo_first_law must record Echo Tablet I'
    );

    // Verify Compass-Lens indicator does NOT activate before owning relic_compass_lens
    await teleportPlayer(page, 120, 812);
    await sleep(220);
    state = await page.evaluate(() => window.__AUF_STATE__());
    assert(
      state.compassSensedInscriptionIds.length === 0,
      'Compass-Lens indicator must remain inactive when relic_compass_lens is not owned'
    );

    // Open PauseMenu -> Restart Chapter One -> Test CANCEL preserves save & progress
    await page.keyboard.press('Escape');
    await sleep(200);
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('ArrowDown');
      await sleep(80);
    }
    await page.keyboard.press('Space');
    await sleep(220);
    state = await page.evaluate(() => window.__AUF_STATE__());
    assert(
      state.confirmModalOpen === true && state.confirmModalTitle === 'RESTART CHAPTER ONE?',
      `Expected RESTART CHAPTER ONE? confirmation modal, got ${state.confirmModalTitle}`
    );
    await page.keyboard.press('Space'); // Default index 0 = Cancel (Keep Save)
    await sleep(220);
    await page.keyboard.press('Escape'); // Close PauseMenu
    await sleep(200);
    state = await page.evaluate(() => ({
      ...window.__AUF_STATE__(),
      hasSave: window.localStorage.getItem('auf_save_v1') !== null,
    }));
    assert(
      state.confirmModalOpen === false && state.echoCount === 1 && state.hasSave === true,
      'Cancelling Restart Chapter One must preserve all in-memory and saved progress'
    );

    // Open PauseMenu -> Restart Chapter One -> Test CONFIRM deletes save & restarts fresh
    await page.keyboard.press('Escape');
    await sleep(200);
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('ArrowDown');
      await sleep(80);
    }
    await page.keyboard.press('Space');
    await sleep(200);
    await page.keyboard.press('ArrowRight'); // Move selection to Confirm Restart
    await sleep(120);
    await page.keyboard.press('Space');
    await page.waitForFunction(
      () =>
        window.__AUF_STATE__().activeScenes.includes('GameScene') &&
        window.__AUF_STATE__().echoCount === 0 &&
        window.__AUF_STATE__().playerX < 300,
      null,
      { timeout: 8000 }
    );
    await sleep(500);
    console.log('3a. PauseMenu Restart Confirmation Cancel + Confirm verified.');

    // Re-collect Echo Tablet I (760, 612) and Hidden Quest Clue 1 (58, 814) for full run
    await teleportPlayer(page, 760, 612);
    await sleep(240);
    await page.keyboard.press('KeyE');
    await sleep(220);

    await teleportPlayer(page, 62, 812);
    await sleep(240);
    await page.keyboard.press('KeyE');
    await sleep(240);
    state = await page.evaluate(() => window.__AUF_STATE__());
    console.log('3b. Echo I + Hidden Quest Clue 1 discovered:', state.questStates.hq_silent_loom);
    assert(
      state.echoCount === 1 && state.questStates.hq_silent_loom.status === 'ACTIVE',
      'Echo Tablet I and hq_silent_loom Clue 1 must be active'
    );
    assert(
      state.activeQuest === 'q_awakening_verge',
      'Main quest must remain primary on HUD tracker when optional hidden quest starts'
    );

    // 5. Verify Wind Updraft lift across Chasm (x: 1295)
    await teleportPlayer(page, 1295, 810);
    await sleep(140);
    await page.keyboard.down('Space');
    await sleep(900);
    const updraftState = await page.evaluate(() => window.__AUF_STATE__());
    assert(updraftState.playerY < 680, 'Unanchored player must rise inside WindUpdraft when holding Space');
    await page.keyboard.up('Space');

    // 6. Test M-3 Oren Bypass Route FIRST (inspect Surveyor Stele before speaking with Oren!)
    await teleportPlayer(page, 1875, 512);
    await sleep(260);
    await page.keyboard.press('KeyE');
    await sleep(260);
    state = await page.evaluate(() => window.__AUF_STATE__());
    console.log('4a. Oren bypass quest tracker check:', {
      awakeningStatus: state.questStates.q_awakening_verge.status,
      activeQuest: state.activeQuest,
    });
    assert(
      state.questStates.q_awakening_verge.status === 'COMPLETED' &&
        state.activeQuest === 'q_echoes_of_substance' &&
        state.questStates.q_echoes_of_substance.completedObjectives.includes('obj_inspect_survey'),
      'Bypassing Oren to inspect Surveyor Stele must auto-resolve q_awakening_verge and advance tracker to q_echoes_of_substance'
    );

    // Now speak with Oren (normal dialogue catch-up) and verify coherent state
    await teleportPlayer(page, 1650, 512);
    await sleep(260);
    await page.keyboard.press('KeyE', { delay: 80 });
    await page.waitForFunction(
      () => window.__AUF_GAME__.scene.getScene('GameScene').dialogueManager.isActive(),
      null,
      { timeout: 5000 }
    );
    for (let i = 0; i < 32; i++) {
      const dlgOpen = await page.evaluate(() =>
        window.__AUF_GAME__.scene.getScene('GameScene').dialogueManager.isActive()
      );
      if (!dlgOpen) break;
      await page.keyboard.press('Space', { delay: 80 });
      await sleep(150);
    }
    state = await page.evaluate(() => window.__AUF_STATE__());
    assert(
      state.worldFlags.met_oren === true && state.activeQuest === 'q_echoes_of_substance',
      'Speaking with Oren after inspecting Stele must set met_oren and keep q_echoes_of_substance active'
    );

    // 7. Verify World Atlas [Tab]: Regional Survey + Continental World View
    await page.keyboard.press('Tab');
    await sleep(420);
    state = await page.evaluate(() => window.__AUF_STATE__());
    console.log('4b. World Atlas opened:', {
      worldMapOpen: state.worldMapOpen,
      regionPct: state.regionExplorationPct,
      worldPct: state.worldExplorationPct,
    });
    assert(state.worldMapOpen === true, 'Pressing Tab must open WorldMap');
    assert(state.regionExplorationPct > 5, 'Regional exploration % must increase as player explores');
    assert(
      state.worldExplorationPct > 0 && state.worldExplorationPct < 6,
      `Known World exploration % must reflect 1 of 18 regions, got ${state.worldExplorationPct}`
    );
    await page.screenshot({ path: join(SHOT_DIR, '04_world_map_regional.png') });

    await page.keyboard.press('Digit2', { delay: 80 });
    await sleep(420);
    await page.screenshot({ path: join(SHOT_DIR, '05_world_map_continents.png') });
    await page.keyboard.press('Tab', { delay: 80 });
    await sleep(260);

    // 8. Expanded Quest Stage: Wind-Spire Conduits -> Shattered Sky-Arch -> Crucible 3-Lock Puzzle
    await teleportPlayer(page, 2130, 272);
    await sleep(220);
    await page.keyboard.press('KeyE'); // North Conduit
    await sleep(200);

    await teleportPlayer(page, 2540, 514);
    await sleep(220);
    await page.keyboard.press('KeyE'); // Wind Vane
    await sleep(200);

    await teleportPlayer(page, 2950, 332);
    await sleep(220);
    await page.keyboard.press('KeyE'); // East Conduit
    await sleep(260);

    // Deliberately leave Echo Tablet II (2560, 186) uncollected before Weight to test M-7 post-Weight Counterweight Lift!
    await teleportPlayer(page, 3760, 302);
    await sleep(300);
    await page.screenshot({ path: join(SHOT_DIR, '06_quest_sequence_sky_arch.png') });
    await page.keyboard.press('KeyE'); // Ring Sky-Arch Resonance Bell
    await sleep(280);

    state = await page.evaluate(() => window.__AUF_STATE__());
    assert(
      state.worldFlags.sky_bell_rung === true &&
        state.questStates.q_echoes_of_substance.completedObjectives.includes('obj_sky_arch_bell'),
      'Ringing Aerial Resonance Bell must unseal Crucible entry and complete obj_sky_arch_bell'
    );

    // Enter Crucible of Mass & VERIFY REMNANT CANNOT BE CLAIMED EARLY (0 / 3 locks released)
    await teleportPlayer(page, 4480, 512);
    await sleep(300);
    await page.screenshot({ path: join(SHOT_DIR, '07_crucible_sealed_remnant.png') });
    await page.keyboard.press('KeyE');
    await sleep(320);

    state = await page.evaluate(() => window.__AUF_STATE__());
    assert(state.crucibleLocksReleased === 0 && state.hasWeight === false, 'Early Remnant claim must be blocked');

    // Release West Lever (4255, 406) and East Dial (4795, 406)
    await teleportPlayer(page, 4255, 404);
    await sleep(220);
    await page.keyboard.press('KeyE');
    await sleep(220);

    await teleportPlayer(page, 4795, 404);
    await sleep(220);
    await page.keyboard.press('KeyE');
    await sleep(260);

    // Verify Crucible Dome Updraft lifts player toward Zenith Keystone (4480, 238)
    await teleportPlayer(page, 4370, 505);
    await sleep(140);
    await page.keyboard.down('Space');
    await sleep(750);
    const domeLiftState = await page.evaluate(() => window.__AUF_STATE__());
    assert(
      domeLiftState.playerY < 410,
      `Ignited Crucible Dome updraft must lift player toward Zenith Cupola, got y=${domeLiftState.playerY}`
    );
    await page.keyboard.up('Space');

    // Release Zenith Keystone (4480, 238) -> 3/3 locks released!
    await teleportPlayer(page, 4480, 236);
    await sleep(240);
    await page.keyboard.press('KeyE');
    await sleep(280);

    state = await page.evaluate(() => window.__AUF_STATE__());
    assert(state.crucibleLocksReleased === 3, 'All 3 Crucible locks must now be released');

    // 9. Verify M-7 Pre-Weight Stabilization Warning Modal (Step Back / Cancel first, then Confirm!)
    await teleportPlayer(page, 4480, 512);
    await sleep(280);
    await page.keyboard.press('KeyE', { delay: 80 });
    await sleep(240);
    state = await page.evaluate(() => window.__AUF_STATE__());
    console.log('6. Pre-Weight Warning Modal opened:', state.confirmModalTitle);
    assert(
      state.confirmModalOpen === true && state.confirmModalTitle === 'ANCHOR THE REMNANT OF WEIGHT?',
      'Interacting with uncaged Remnant of Weight must show pre-stabilization warning modal'
    );

    // Step Back (Cancel) first -> player keeps Unanchored state
    await page.keyboard.press('Space', { delay: 80 });
    await sleep(220);
    state = await page.evaluate(() => window.__AUF_STATE__());
    assert(
      state.confirmModalOpen === false && state.hasWeight === false,
      'Choosing Step Back on stabilization warning must allow player to explore before claiming Weight'
    );

    // Now Confirm Stabilization
    await page.keyboard.press('KeyE', { delay: 80 });
    await sleep(200);
    await page.keyboard.press('ArrowRight', { delay: 80 });
    await sleep(120);
    await page.keyboard.press('Space', { delay: 80 });

    await page.waitForFunction(
      () => window.__AUF_GAME__.scene.getScene('GameScene').restorationOverlay.isOpen(),
      null,
      { timeout: 14000 }
    );
    await sleep(650);
    await page.screenshot({ path: join(SHOT_DIR, '08_stabilization_sequence.png') });

    await page.keyboard.press('Space', { delay: 80 });
    await page.waitForFunction(
      () =>
        !window.__AUF_GAME__.scene.getScene('GameScene').restorationOverlay.isOpen() &&
        !window.__AUF_GAME__.scene.getScene('GameScene').isRestoringSequence,
      null,
      { timeout: 6000 }
    );
    await sleep(400);
    await page.screenshot({ path: join(SHOT_DIR, '09_garment_character_grounded.png') });

    state = await page.evaluate(() => window.__AUF_STATE__());
    console.log('7. Post-Stabilization state:', {
      hasWeight: state.hasWeight,
      rank: state.adventurerRank,
      stabilizationState: state.stabilizationState,
      activeQuest: state.activeQuest,
    });
    assert(state.hasWeight === true, 'Player must now possess Weight');
    assert(state.adventurerRank === 'F', 'Claiming Weight must promote Adventurer Rank to F');
    assert(state.stabilizationState === 'Grounded State', 'State must transition to Grounded State');
    assert(state.activeQuest === 'q_changed_world', 'q_changed_world must start after Weight restoration');

    // Verify Floating is sacrificed in Grounded State
    await page.keyboard.down('Space');
    await sleep(560);
    const postJumpState = await page.evaluate(() => window.__AUF_STATE__());
    assert(postJumpState.isFloating === false, 'Grounded garment must NOT float');
    await page.keyboard.up('Space');
    await sleep(450);

    // 10. Ground Impact (S + Space airborne) shatters Crucible Slab (x: 4650) -> Echoing Underwalk
    await teleportPlayer(page, 4650, 512);
    await sleep(320);
    await page.keyboard.down('Space');
    await page.waitForFunction(() => window.__AUF_STATE__().playerY < 470, null, { timeout: 6000 });
    await page.keyboard.up('Space');
    await sleep(140);
    await page.keyboard.down('KeyS');
    await page.keyboard.down('Space');
    await page.waitForFunction(
      () =>
        window.__AUF_GAME__.scene.getScene('GameScene').player.isPerformingGroundImpact() ||
        Boolean(window.__AUF_STATE__().worldFlags.slab_crucible_broken),
      null,
      { timeout: 6000 }
    );
    await page.keyboard.up('Space');
    await page.keyboard.up('KeyS');
    await page.waitForFunction(() => window.__AUF_STATE__().playerY > 640, null, { timeout: 8000 });

    // Collect Hidden Quest Clue 2 in Echoing Underwalk (x: 3480, y: 696)
    await teleportPlayer(page, 3480, 694);
    await sleep(260);
    await page.keyboard.press('KeyE', { delay: 80 });
    await page.waitForFunction(
      () => Boolean(window.__AUF_STATE__().worldFlags.loom_clue_2),
      null,
      { timeout: 5000 }
    );

    // 10b. Verify M-7 Post-Weight Grounded Counterweight Lift revisits High Spire Echo Tablet II & Sky-Arch!
    await teleportPlayer(page, 1948, 512); // Observatory Spire Counterweight Lift
    await sleep(240);
    await page.keyboard.press('KeyE', { delay: 80 });
    await sleep(300);
    state = await page.evaluate(() => window.__AUF_STATE__());
    assert(
      state.playerY < 215 && Math.abs(state.playerX - 2606) < 40,
      `Grounded Counterweight Lift must hoist player to High Spire Overlook, got (${state.playerX}, ${state.playerY})`
    );
    await teleportPlayer(page, 2560, 184);
    await sleep(220);
    await page.keyboard.press('KeyE', { delay: 80 }); // Collect Echo Tablet II while Grounded!
    await sleep(240);
    state = await page.evaluate(() => window.__AUF_STATE__());
    assert(
      state.echoCount === 2 && state.discoveredEchoes.includes('echo_sky_bargain'),
      'Grounded player must be able to collect high-spire echo_sky_bargain via Counterweight Lift'
    );

    // Traverse Counterweight Cable to Sky-Arch Belfry and descend back to Observatory
    await teleportPlayer(page, 2616, 184);
    await sleep(200);
    await page.keyboard.press('KeyE', { delay: 80 });
    await sleep(240);
    state = await page.evaluate(() => window.__AUF_STATE__());
    assert(state.playerX > 3750 && state.playerY < 330, 'Cable lift must reach Sky-Arch Belfry');
    await page.keyboard.press('KeyE', { delay: 80 });
    await sleep(240);
    state = await page.evaluate(() => window.__AUF_STATE__());
    assert(state.playerX < 2000 && state.playerY > 480, 'Belfry return lift must lower player to Observatory');

    // 11. Courtyard Dual Counterweight Plates
    await teleportPlayer(page, 695, 812);
    await sleep(280);
    await page.keyboard.down('KeyD');
    await page.waitForFunction(
      () =>
        Math.round(
          window.__AUF_GAME__.scene.getScene('GameScene').blocks.get('block_courtyard').sprite.x
        ) > 855,
      null,
      { timeout: 8000 }
    );
    await page.keyboard.up('KeyD');

    await page.evaluate(() => {
      const gs = window.__AUF_GAME__.scene.getScene('GameScene');
      gs.blocks.get('block_courtyard').sprite.setPosition(880, 816);
      gs.player.sprite.setPosition(1035, 812);
      gs.player.sprite.body.setVelocity(0, 0);
    });
    await page.waitForFunction(
      () => Boolean(window.__AUF_STATE__().worldFlags.courtyard_unsealed),
      null,
      { timeout: 5000 }
    );

    // 12. Complete Optional Hidden Quest at Sealed Reliquary Loom (x: 2960, y: 1114)
    await teleportPlayer(page, 2960, 1112);
    await sleep(280);
    await page.keyboard.press('KeyE', { delay: 80 });
    await page.waitForFunction(
      () => window.__AUF_STATE__().questStates.hq_silent_loom.status === 'COMPLETED',
      null,
      { timeout: 5000 }
    );

    state = await page.evaluate(() => window.__AUF_STATE__());
    console.log('8. Hidden Quest completed:', {
      hqStatus: state.questStates.hq_silent_loom.status,
      relics: state.relics,
      rank: state.adventurerRank,
      sensedAtReliquary: state.compassSensedInscriptionIds,
    });
    assert(state.relics.includes('relic_compass_lens'), 'Must award relic_compass_lens');
    assert(
      state.compassSensedInscriptionIds.length === 0,
      'Compass-Lens must NOT highlight distant inscriptions or nearby non-inscription objects'
    );

    // 12b. Verify M-5 Compass-Lens Proximity Indicator near uncollected Echo Tablet III (1460, 934)
    await teleportPlayer(page, 1715, 988); // Mezzanine Step 2 (~260px from echo_sunken_oath, near slab/gate/reset)
    await sleep(300);
    state = await page.evaluate(() => window.__AUF_STATE__());
    console.log('8b. Compass-Lens nearby sense check:', state.compassSensedInscriptionIds);
    assert(
      state.compassSensedInscriptionIds.length === 1 &&
        state.compassSensedInscriptionIds[0] === 'echo_sunken_oath',
      `Compass-Lens must highlight nearby undiscovered echo_sunken_oath only, got ${JSON.stringify(
        state.compassSensedInscriptionIds
      )}`
    );

    // Collect Echo Tablet III (1460, 932) -> verify sensed list clears immediately!
    await teleportPlayer(page, 1460, 932);
    await sleep(240);
    await page.keyboard.press('KeyE', { delay: 80 });
    await sleep(260);
    state = await page.evaluate(() => window.__AUF_STATE__());
    assert(
      state.echoCount === 3 && state.compassSensedInscriptionIds.length === 0,
      'Collecting final Echo Tablet must increment echoCount to 3 and clear Compass-Lens highlight'
    );

    // Open Journal Chronicle [J] to verify Full HD layout with Relics, Rank & 3/3 Echoes
    await page.keyboard.press('KeyJ', { delay: 80 });
    await page.waitForFunction(() => window.__AUF_STATE__().journalOpen === true, null, {
      timeout: 5000,
    });
    await sleep(300);
    await page.screenshot({ path: join(SHOT_DIR, '10_journal_chronicle_hd.png') });
    await page.keyboard.press('KeyJ', { delay: 80 });
    await page.waitForFunction(() => window.__AUF_STATE__().journalOpen === false, null, {
      timeout: 5000,
    });

    // 13. Speak with Vespera (x: 3680, y: 1114) & Choose Imprint of Resolve (Digit2) + Verify L-4 HUD Dual Badges!
    await teleportPlayer(page, 3665, 1112);
    await sleep(300);
    await page.keyboard.press('KeyE', { delay: 80 });
    await page.waitForFunction(
      () => window.__AUF_GAME__.scene.getScene('GameScene').dialogueManager.isActive(),
      null,
      { timeout: 5000 }
    );

    for (let i = 0; i < 40; i++) {
      const dlgInfo = await page.evaluate(() => {
        const gs = window.__AUF_GAME__.scene.getScene('GameScene');
        return {
          id: gs.dialogueManager.getCurrentNode()?.id ?? null,
          typingComplete: Boolean(gs.dialogueBox.typingComplete),
        };
      });
      if (!dlgInfo.id) break;
      if (dlgInfo.id === 'vespera_choice_prompt') {
        if (!dlgInfo.typingComplete) {
          await page.keyboard.press('Space', { delay: 80 });
          await page.waitForFunction(
            () => Boolean(window.__AUF_GAME__.scene.getScene('GameScene').dialogueBox.typingComplete),
            null,
            { timeout: 4000 }
          );
        }
        await sleep(280);
        await page.screenshot({ path: join(SHOT_DIR, '10b_vespera_choice_hd.png') });
        await page.keyboard.press('Digit2', { delay: 80 }); // Choose Imprint of Resolve (Original Self)
        await sleep(240);
        for (let j = 0; j < 10; j++) {
          const active = await page.evaluate(() =>
            window.__AUF_GAME__.scene.getScene('GameScene').dialogueManager.isActive()
          );
          if (!active) break;
          await page.keyboard.press('Space', { delay: 80 });
          await sleep(180);
        }
        break;
      }
      await page.keyboard.press('Space', { delay: 80 });
      await sleep(170);
    }

    state = await page.evaluate(() => window.__AUF_STATE__());
    assert(state.imprint === 'resolve', `Expected Imprint of Resolve ('resolve'), got '${state.imprint}'`);

    // Verify L-4: Both Imprint badge AND Compass-Lens badge are visible simultaneously without overlap
    const hudCheck = await page.evaluate(() => {
      const hud = window.__AUF_GAME__.scene.getScene('GameScene').hud;
      return {
        imprintVisible: hud.imprintText.visible,
        imprintStr: hud.imprintText.text,
        imprintY: hud.imprintText.y,
        relicVisible: hud.relicText.visible,
        relicStr: hud.relicText.text,
        relicY: hud.relicText.y,
      };
    });
    console.log('9a. Simultaneous HUD badges verified:', hudCheck);
    assert(
      hudCheck.imprintVisible &&
        hudCheck.imprintStr.includes('Imprint of Resolve') &&
        hudCheck.relicVisible &&
        hudCheck.relicStr.includes('Compass-Lens') &&
        hudCheck.relicY >= hudCheck.imprintY + 20,
      'HUD must display both Imprint indicator and Compass-Lens relic badge simultaneously on distinct rows'
    );

    // 14. Verify Full Save v2 Persistence Across Browser Reload + MenuScene Overwrite Confirmation Cancel
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(
      () => Boolean(window.__AUF_STATE__ && window.__AUF_STATE__().activeScenes.includes('MenuScene')),
      null,
      { timeout: 10000 }
    );
    await sleep(750);

    // Test MenuScene 'Begin New Journey' overwrite confirmation Cancel
    await page.keyboard.press('ArrowDown', { delay: 80 }); // Select 'Begin New Journey'
    await sleep(140);
    await page.keyboard.press('Space', { delay: 80 });
    await sleep(220);
    state = await page.evaluate(() => window.__AUF_STATE__());
    assert(
      state.confirmModalOpen === true && state.confirmModalTitle === 'BEGIN A NEW JOURNEY?',
      'Selecting Begin New Journey with an existing save must open confirmation modal'
    );
    await page.keyboard.press('Escape', { delay: 80 }); // Cancel overwrite
    await sleep(200);
    await page.keyboard.press('ArrowUp', { delay: 80 }); // Back to 'Continue Journey'
    await sleep(140);
    await page.keyboard.press('Space', { delay: 80 });

    await page.waitForFunction(
      () =>
        window.__AUF_STATE__().activeScenes.includes('GameScene') &&
        window.__AUF_STATE__().hasWeight === true,
      null,
      { timeout: 12000 }
    );
    state = await page.evaluate(() => window.__AUF_STATE__());
    console.log('9b. Save v2 reload verified:', {
      playerName: state.playerName,
      rank: state.adventurerRank,
      hasWeight: state.hasWeight,
      imprint: state.imprint,
      echoCount: state.echoCount,
      relics: state.relics,
      regionPct: state.regionExplorationPct,
    });
    assert(
      state.playerName === 'Caelen' &&
        state.adventurerRank === 'F' &&
        state.hasWeight === true &&
        state.imprint === 'resolve' &&
        state.echoCount === 3 &&
        state.relics.includes('relic_compass_lens') &&
        state.regionExplorationPct > 20,
      'SaveState v2 must restore playerName, rank, Weight, Imprint of Resolve, 3 Echoes, Relics, and World Atlas discovery'
    );

    // 15. Cross Fractured Mirror-Arch (x: 5060, y: 1112) -> Chapter One EndingScene
    await teleportPlayer(page, 5055, 1112);
    await sleep(900);
    await page.keyboard.press('KeyE', { delay: 80 });

    await page.waitForFunction(
      () => window.__AUF_STATE__().activeScenes.includes('EndingScene'),
      null,
      { timeout: 18000 }
    );
    await sleep(1400);
    await page.screenshot({ path: join(SHOT_DIR, '11_chapter_one_ending.png') });

    // Verify Replay Chapter One Confirmation on EndingScene (Cancel preserves save, Confirm clears & restarts)
    await page.keyboard.press('ArrowRight', { delay: 80 });
    await sleep(200);
    await page.keyboard.press('Space', { delay: 80 });
    await sleep(220);
    state = await page.evaluate(() => ({
      ...window.__AUF_STATE__(),
      hasSave: window.localStorage.getItem('auf_save_v1') !== null,
    }));
    assert(
      state.confirmModalOpen === true &&
        state.confirmModalTitle === 'REPLAY CHAPTER ONE?' &&
        state.hasSave === true,
      'Replay Chapter One on EndingScene must prompt for confirmation before clearing save'
    );
    await page.keyboard.press('Space', { delay: 80 }); // Default index 0 = Cancel
    await sleep(200);
    state = await page.evaluate(() => ({
      ...window.__AUF_STATE__(),
      hasSave: window.localStorage.getItem('auf_save_v1') !== null,
    }));
    assert(
      state.confirmModalOpen === false &&
        state.activeScenes.includes('EndingScene') &&
        state.hasSave === true,
      'Cancelling Replay Chapter One must preserve save and stay on EndingScene'
    );

    // Confirm Replay Chapter One
    await page.keyboard.press('Space', { delay: 80 });
    await sleep(200);
    await page.keyboard.press('ArrowRight', { delay: 80 }); // Move to Confirm Replay
    await sleep(120);
    await page.keyboard.press('Space', { delay: 80 });
    await page.waitForFunction(
      () => window.__AUF_STATE__().activeScenes.includes('AwakeningScene'),
      null,
      { timeout: 12000 }
    );
    const saveAfterReplay = await page.evaluate(() => window.localStorage.getItem('auf_save_v1'));
    assert(saveAfterReplay === null, 'Confirming Replay Chapter One must clear saved progress');

    assert(consoleErrors.length === 0, `Console errors found: ${consoleErrors.join('; ')}`);
    assert(failedRequests.length === 0, `Failed asset requests found: ${failedRequests.join('; ')}`);

    console.log('ALL FULL-HD END-TO-END CHAPTER ONE & RELEASE-FIX VERIFICATION CHECKS PASSED WITH ZERO ERRORS!');
  } catch (err) {
    try {
      const pages = browser.contexts()[0]?.pages() ?? [];
      if (pages[0]) {
        const dump = await pages[0].evaluate(() => (window.__AUF_STATE__ ? window.__AUF_STATE__() : null));
        console.error('DIAGNOSTIC STATE AT FAILURE:', JSON.stringify(dump, null, 2));
      }
    } catch {
      // ignore diagnostic error
    }
    throw err;
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
