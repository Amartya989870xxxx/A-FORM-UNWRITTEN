/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from 'vitest';
import indexHtmlRaw from '../../../index.html?raw';
import { DEFAULT_PLAYER_NAME, SAVE_STORAGE_KEY } from '../constants';
import { DIALOGUE_TREES } from '../data/dialogues';
import { DialogueManager } from '../systems/DialogueManager';
import {
  ExplorationManager,
  KNOWN_WORLD_CONTINENTS,
  REACHABLE_VERGE_CELLS,
  TOTAL_KNOWN_WORLD_REGIONS,
} from '../systems/ExplorationManager';
import { ImprintManager } from '../systems/ImprintManager';
import { QuestManager } from '../systems/QuestManager';
import { RemnantManager } from '../systems/RemnantManager';
import {
  createDefaultSoulSpectrum,
  sanitizePlayerName,
  SaveManager,
} from '../systems/SaveManager';
import { promptForPlayerName } from '../ui/NamePrompt';

class MemoryStorage {
  private store = new Map<string, string>();
  public getItem(k: string): string | null {
    return this.store.get(k) ?? null;
  }
  public setItem(k: string, v: string): void {
    this.store.set(k, v);
  }
  public removeItem(k: string): void {
    this.store.delete(k);
  }
  public clear(): void {
    this.store.clear();
  }
}

describe('A Form Unwritten: Core Progression & Chapter One Systems', () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      writable: true,
      configurable: true,
    });
  });

  it('transitions RemnantManager physics profile and triggers stabilization once', () => {
    const rm = new RemnantManager();
    expect(rm.hasWeight()).toBe(false);
    expect(rm.getStabilizationLabel()).toBe('Unanchored State');
    expect(rm.getPhysicsProfile().canFloat).toBe(true);
    expect(rm.getPhysicsProfile().canGroundImpact).toBe(false);

    expect(rm.restore('weight')).toBe(true);
    // Second restoration attempt must return false (triggers exactly once)
    expect(rm.restore('weight')).toBe(false);

    expect(rm.hasWeight()).toBe(true);
    expect(rm.getStabilizationLabel()).toBe('Grounded State');
    expect(rm.getPhysicsProfile().canFloat).toBe(false);
    expect(rm.getPhysicsProfile().canGroundImpact).toBe(true);
    expect(rm.getPhysicsProfile().canPushHeavyBlocks).toBe(true);
    expect(rm.getPhysicsProfile().canActivateHeavyPlates).toBe(true);
  });

  it('auto-chains QuestManager across expanded 6-stage Echoes of Substance and optional Hidden Quest', () => {
    const qm = new QuestManager();
    expect(qm.getStatus('q_awakening_verge')).toBe('NOT_STARTED');
    expect(qm.getStatus('hq_silent_loom')).toBe('NOT_STARTED');

    qm.startQuest('q_awakening_verge');
    expect(qm.getStatus('q_awakening_verge')).toBe('ACTIVE');

    // Discovering a hidden clue auto-activates hq_silent_loom while keeping Main quest primary on HUD
    expect(qm.completeObjective('hq_silent_loom', 'obj_loom_thread')).toBe(true);
    expect(qm.getStatus('hq_silent_loom')).toBe('ACTIVE');
    expect(qm.getActiveQuest()?.definition.id).toBe('q_awakening_verge');

    qm.completeObjective('q_awakening_verge', 'obj_cross_chasm');
    qm.completeObjective('q_awakening_verge', 'obj_speak_oren');
    expect(qm.getStatus('q_awakening_verge')).toBe('COMPLETED');
    expect(qm.getStatus('q_echoes_of_substance')).toBe('ACTIVE');

    // Verify all 6 required stages of Echoes of Substance before chaining to q_changed_world
    const stages = [
      'obj_inspect_survey',
      'obj_conduit_north',
      'obj_conduit_east',
      'obj_sky_arch_bell',
      'obj_crucible_locks',
      'obj_claim_weight',
    ];
    for (let i = 0; i < stages.length - 1; i++) {
      expect(qm.completeObjective('q_echoes_of_substance', stages[i])).toBe(true);
      expect(qm.getStatus('q_echoes_of_substance')).toBe('ACTIVE');
    }
    expect(qm.completeObjective('q_echoes_of_substance', 'obj_claim_weight')).toBe(true);
    expect(qm.getStatus('q_echoes_of_substance')).toBe('COMPLETED');
    expect(qm.getStatus('q_changed_world')).toBe('ACTIVE');

    // Complete remaining hidden quest stages independently
    qm.completeObjective('hq_silent_loom', 'obj_loom_spindle');
    qm.completeObjective('hq_silent_loom', 'obj_loom_reliquary');
    expect(qm.getStatus('hq_silent_loom')).toBe('COMPLETED');
  });

  it('branches DialogueManager across conditional states, player naming, and choice triggers', () => {
    const dm = new DialogueManager(DIALOGUE_TREES);
    const actions: string[] = [];

    const n1 = dm.start('npc_oren', {
      playerName: 'Caelen',
      hasWeight: false,
      imprint: null,
      flags: {},
      triggerAction: (a) => actions.push(a),
    });
    expect(n1?.id).toBe('oren_intro_1');
    expect(actions).toContain('met_oren');

    const n2 = dm.advance();
    expect(n2?.id).toBe('oren_intro_2');
    expect(dm.getAvailableChoices().length).toBe(2);

    const n3 = dm.advance(0);
    expect(n3?.id).toBe('oren_taken');

    const postNode = dm.start('npc_oren', {
      playerName: 'Caelen',
      hasWeight: true,
      imprint: null,
      flags: { met_oren: true },
      triggerAction: (a) => actions.push(a),
    });
    expect(postNode?.id).toBe('oren_post_weight');
    expect(dm.getResolvedText()).toContain('Caelen');
  });

  it('records Imprint of Experience once and prevents overwriting', () => {
    const im = new ImprintManager();
    expect(im.getCurrent()).toBeNull();
    expect(im.acquire('resonance')).toBe(true);
    expect(im.acquire('resolve')).toBe(false);
    expect(im.getCurrent()?.alignmentLabel).toBe('Becoming');
  });

  it('persists SaveState v2, sanitizes player names, migrates v1 saves, and recovers from corrupted data', () => {
    expect(SaveManager.hasSave()).toBe(false);
    expect(sanitizePlayerName('   ')).toBe(DEFAULT_PLAYER_NAME);
    expect(sanitizePlayerName('  Aurelius   Vane  ')).toBe('Aurelius Vane');

    const savedOk = SaveManager.save({
      playerName: '  Caelen  ',
      adventurerRank: 'F',
      chapter: 1,
      chapterTitle: 'Chapter I: The Shattered Verge',
      checkpointId: 'weight_restored',
      playerX: 4480,
      playerY: 514,
      restoredRemnants: ['weight'],
      imprint: null,
      discoveredEchoes: ['echo_first_law'],
      discoveredCells: ['1_4', '2_4'],
      discoveredLocations: ['loc_precipice', 'loc_crucible'],
      relics: ['relic_compass_lens'],
      soulAffinities: createDefaultSoulSpectrum(),
      worldFlags: { conduit_north: true, conduit_east: true },
      questStates: {
        q_changed_world: { status: 'ACTIVE', completedObjectives: [] },
      },
    });
    expect(savedOk).toBe(true);
    const loadedV2 = SaveManager.load();
    expect(loadedV2?.version).toBe(2);
    expect(loadedV2?.playerName).toBe('Caelen');
    expect(loadedV2?.adventurerRank).toBe('F');
    expect(loadedV2?.restoredRemnants).toEqual(['weight']);
    expect(loadedV2?.relics).toEqual(['relic_compass_lens']);
    expect(loadedV2?.garmentOriginMystery).toBe('unresolved');

    // Legacy v1 migration check
    const legacyV1 = {
      version: 1,
      timestamp: 1700000000000,
      chapter: 3,
      chapterTitle: 'Chapter III: The First Remnant',
      checkpointId: 'weight_restored',
      playerX: 3440,
      playerY: 514,
      restoredRemnants: ['weight'],
      imprint: 'resonance',
      discoveredEchoes: ['echo_first_law'],
      worldFlags: { conduit_north: true, conduit_east: true },
      questStates: {
        q_changed_world: { status: 'ACTIVE', completedObjectives: [] },
      },
    };
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(legacyV1));
    const migrated = SaveManager.load();
    expect(migrated?.version).toBe(2);
    expect(migrated?.playerName).toBe(DEFAULT_PLAYER_NAME);
    expect(migrated?.playerX).toBe(4480); // Shifted +1040 for expanded Sky-Arch layout
    expect(migrated?.soulAffinities.amber).toBe(3);
    expect(migrated?.soulAffinities.verdant).toBe(3);

    // Inject corrupted JSON and verify graceful null recovery without throwing
    window.localStorage.setItem(SAVE_STORAGE_KEY, '{corrupted_json');
    expect(SaveManager.load()).toBeNull();
    expect(window.localStorage.getItem(SAVE_STORAGE_KEY)).toBeNull();

    // Inject malformed schema and verify graceful rejection
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify({ version: 2, playerX: 'bad' }));
    expect(SaveManager.load()).toBeNull();
  });

  it('migrates pre-Weight v1 saves safely outside the sealed Crucible with Rank G and intact progress', () => {
    // Eastern pre-Weight v1 save with both Wind-Spire Conduits attuned (previously at old Crucible x=3420)
    const preWeightConduitsDone = {
      version: 1,
      timestamp: 1700000010000,
      chapter: 2,
      chapterTitle: 'Chapter II: Echoes of Substance',
      checkpointId: 'conduit_east',
      playerX: 3420,
      playerY: 514,
      restoredRemnants: [],
      imprint: null,
      discoveredEchoes: ['echo_first_law', 'echo_sky_bargain'],
      worldFlags: { conduit_north: true, conduit_east: true, vane_east_active: true },
      questStates: {
        q_awakening_verge: {
          status: 'COMPLETED',
          completedObjectives: ['obj_cross_chasm', 'obj_speak_oren'],
        },
        q_echoes_of_substance: {
          status: 'ACTIVE',
          completedObjectives: ['obj_conduit_north', 'obj_conduit_east'],
        },
      },
    };
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(preWeightConduitsDone));
    const migratedEast = SaveManager.load();
    expect(migratedEast).not.toBeNull();
    expect(migratedEast?.version).toBe(2);
    expect(migratedEast?.adventurerRank).toBe('G');
    expect(migratedEast?.restoredRemnants).toEqual([]);
    // Must NOT be placed inside the sealed Crucible (x >= 4120); lands safely on Sky-Arch threshold
    expect(migratedEast?.playerX).toBe(3268);
    expect(migratedEast?.playerX).toBeLessThan(4100);
    expect(migratedEast?.playerY).toBe(514);
    expect(migratedEast?.discoveredEchoes).toEqual(['echo_first_law', 'echo_sky_bargain']);
    expect(migratedEast?.worldFlags['conduit_north']).toBe(true);
    expect(migratedEast?.worldFlags['conduit_east']).toBe(true);
    expect(migratedEast?.worldFlags['sky_bell_rung']).toBeUndefined();

    // Eastern pre-Weight v1 save WITHOUT both conduits attuned lands west of Outer Spire Gate (x < 3210)
    const preWeightGateClosed = {
      ...preWeightConduitsDone,
      worldFlags: { conduit_north: true },
    };
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(preWeightGateClosed));
    const migratedWestOfGate = SaveManager.load();
    expect(migratedWestOfGate?.adventurerRank).toBe('G');
    expect(migratedWestOfGate?.playerX).toBe(3168);
    expect(migratedWestOfGate?.playerX).toBeLessThan(3210);

    // Western pre-Weight v1 save preserves exact player coordinates
    const preWeightObservatory = {
      ...preWeightConduitsDone,
      playerX: 1660,
      playerY: 514,
    };
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(preWeightObservatory));
    const migratedObservatory = SaveManager.load();
    expect(migratedObservatory?.playerX).toBe(1660);
    expect(migratedObservatory?.playerY).toBe(514);
    expect(migratedObservatory?.adventurerRank).toBe('G');
  });

  it('migrates post-Weight v1 saves with Rank F, reconciled Crucible flags, and safe fallbacks without erasing saves', () => {
    const postWeightV1 = {
      version: 1,
      timestamp: 1700000020000,
      chapter: 3,
      chapterTitle: 'Chapter III: The First Remnant',
      checkpointId: 'weight_restored',
      playerX: 3440,
      playerY: 514,
      restoredRemnants: ['weight'],
      imprint: 'resolve',
      discoveredEchoes: ['echo_first_law'],
      worldFlags: { conduit_north: true, conduit_east: true },
      questStates: {
        q_changed_world: { status: 'ACTIVE', completedObjectives: [] },
      },
    };
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(postWeightV1));
    const migrated = SaveManager.load();
    expect(migrated).not.toBeNull();
    expect(migrated?.version).toBe(2);
    expect(migrated?.adventurerRank).toBe('F');
    expect(migrated?.playerX).toBe(4480);
    expect(migrated?.imprint).toBe('resolve');
    expect(migrated?.discoveredEchoes).toEqual(['echo_first_law']);
    expect(migrated?.worldFlags['sky_bell_rung']).toBe(true);
    expect(migrated?.worldFlags['crucible_unsealed']).toBe(true);
    expect(migrated?.soulAffinities.crimson).toBeGreaterThanOrEqual(2);

    // Incomplete/partial v2 save with recoverable progress falls back safely without erasing storage
    const incompleteV2 = {
      version: 2,
      playerName: '  Vaelen  ',
      restoredRemnants: ['weight'],
      discoveredEchoes: ['echo_sunken_oath', 42],
      worldFlags: { courtyard_unsealed: true },
    };
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(incompleteV2));
    const recovered = SaveManager.load();
    expect(recovered).not.toBeNull();
    expect(recovered?.playerName).toBe('Vaelen');
    expect(recovered?.adventurerRank).toBe('F');
    expect(recovered?.restoredRemnants).toEqual(['weight']);
    expect(recovered?.discoveredEchoes).toEqual(['echo_sunken_oath']);
    expect(recovered?.worldFlags['courtyard_unsealed']).toBe(true);
    expect(window.localStorage.getItem(SAVE_STORAGE_KEY)).not.toBeNull();

    // Non-save JSON object returns null cleanly without silently erasing localStorage key
    const nonSaveJson = JSON.stringify({ version: 2, playerX: 'bad' });
    window.localStorage.setItem(SAVE_STORAGE_KEY, nonSaveJson);
    expect(SaveManager.load()).toBeNull();
    expect(window.localStorage.getItem(SAVE_STORAGE_KEY)).toBe(nonSaveJson);
  });

  it('resolves Oren bypass quest ordering coherently and heals previously stuck quest states', () => {
    const qm = new QuestManager();
    qm.startQuest('q_awakening_verge');
    expect(qm.getActiveQuest()?.definition.id).toBe('q_awakening_verge');

    // Player crosses chasm and inspects Surveyor Stele / attunes conduits without talking to Oren
    qm.startQuest('q_echoes_of_substance');
    qm.completeObjective('q_echoes_of_substance', 'obj_inspect_survey');

    expect(qm.getStatus('q_awakening_verge')).toBe('COMPLETED');
    expect(qm.getActiveQuest()?.definition.id).toBe('q_echoes_of_substance');

    // Completing Echoes of Substance chains cleanly to q_changed_world
    for (const objId of [
      'obj_conduit_north',
      'obj_conduit_east',
      'obj_sky_arch_bell',
      'obj_crucible_locks',
      'obj_claim_weight',
    ]) {
      qm.completeObjective('q_echoes_of_substance', objId);
    }
    expect(qm.getStatus('q_echoes_of_substance')).toBe('COMPLETED');
    expect(qm.getActiveQuest()?.definition.id).toBe('q_changed_world');

    // Loading a previously stuck save where q_awakening_verge stayed ACTIVE after Weight self-heals on load
    const healedQm = new QuestManager(undefined, {
      q_awakening_verge: { status: 'ACTIVE', completedObjectives: ['obj_cross_chasm'] },
      q_echoes_of_substance: {
        status: 'COMPLETED',
        completedObjectives: [
          'obj_inspect_survey',
          'obj_conduit_north',
          'obj_conduit_east',
          'obj_sky_arch_bell',
          'obj_crucible_locks',
          'obj_claim_weight',
        ],
      },
      q_changed_world: { status: 'ACTIVE', completedObjectives: [] },
    });
    expect(healedQm.getStatus('q_awakening_verge')).toBe('COMPLETED');
    expect(healedQm.getActiveQuest()?.definition.id).toBe('q_changed_world');

    // Speaking to Oren post-Weight after bypassing him earlier triggers met_oren and coherent dialogue
    const dm = new DialogueManager(DIALOGUE_TREES);
    const actions: string[] = [];
    const postNode = dm.start('npc_oren', {
      playerName: 'Caelen',
      hasWeight: true,
      imprint: null,
      flags: {},
      triggerAction: (a) => actions.push(a),
    });
    expect(postNode?.id).toBe('oren_post_weight');
    expect(actions).toContain('met_oren');
  });

  it('records Imprint of Resolve (Original Self) and executes Vespera Resolve dialogue branch', () => {
    const im = new ImprintManager();
    expect(im.acquire('resolve')).toBe(true);
    expect(im.acquire('resonance')).toBe(false);
    expect(im.getCurrentId()).toBe('resolve');
    expect(im.getCurrent()?.name).toBe('Imprint of Resolve');
    expect(im.getCurrent()?.alignmentLabel).toBe('Original Self');

    const dm = new DialogueManager(DIALOGUE_TREES);
    const actions: string[] = [];
    dm.start('npc_vespera', {
      playerName: 'Caelen',
      hasWeight: true,
      imprint: null,
      flags: {},
      triggerAction: (a) => actions.push(a),
    });
    for (
      let step = 0;
      step < 12 && dm.getCurrentNode() && dm.getCurrentNode()?.id !== 'vespera_choice_prompt';
      step++
    ) {
      dm.advance(0);
    }
    expect(dm.getCurrentNode()?.id).toBe('vespera_choice_prompt');
    const resolveNode = dm.advance(1);
    expect(resolveNode?.id).toBe('vespera_chose_resolve');
    expect(actions).toContain('choose_imprint_resolve');
  });

  it('handles NamePrompt cancellation and confirmation while restoring Phaser keyboard capture', async () => {
    const dialogListeners = new Map<string, Set<() => void>>();
    const inputListeners = new Map<string, Set<(e: unknown) => void>>();

    const mockDialog = {
      open: false,
      returnValue: '',
      showModal() {
        this.open = true;
      },
      close(val = '') {
        this.returnValue = val;
        this.open = false;
        dialogListeners.get('close')?.forEach((fn) => fn());
      },
      addEventListener(type: string, fn: () => void) {
        if (!dialogListeners.has(type)) dialogListeners.set(type, new Set());
        dialogListeners.get(type)!.add(fn);
      },
      removeEventListener(type: string, fn: () => void) {
        dialogListeners.get(type)?.delete(fn);
      },
    };

    const mockInput = {
      value: '',
      focused: false,
      selected: false,
      focus() {
        this.focused = true;
      },
      select() {
        this.selected = true;
      },
      addEventListener(type: string, fn: (e: unknown) => void) {
        if (!inputListeners.has(type)) inputListeners.set(type, new Set());
        inputListeners.get(type)!.add(fn);
      },
      removeEventListener(type: string, fn: (e: unknown) => void) {
        inputListeners.get(type)?.delete(fn);
      },
    };

    const prevDocument = globalThis.document;
    Object.defineProperty(globalThis, 'document', {
      value: {
        getElementById: (id: string) => {
          if (id === 'name-dialog') return mockDialog;
          if (id === 'player-name-input') return mockInput;
          return null;
        },
      },
      writable: true,
      configurable: true,
    });

    try {
      const kbManager = { enabled: true, preventDefault: true };
      const kbPlugin = { enabled: true };
      const mockScene = {
        game: { input: { keyboard: kbManager } },
        input: { keyboard: kbPlugin },
      } as unknown as Parameters<typeof promptForPlayerName>[0];

      // 1. Cancel via Cancel button (returnValue = 'cancel')
      const cancelPromise = promptForPlayerName(mockScene, '');
      expect(mockDialog.open).toBe(true);
      expect(kbManager.enabled).toBe(false);
      expect(kbPlugin.enabled).toBe(false);
      mockInput.value = 'DiscardedName';
      mockDialog.close('cancel');

      const cancelResult = await cancelPromise;
      expect(cancelResult).toEqual({ cancelled: true, playerName: DEFAULT_PLAYER_NAME });
      expect(kbManager.enabled).toBe(true);
      expect(kbManager.preventDefault).toBe(true);
      expect(kbPlugin.enabled).toBe(true);
      expect(SaveManager.hasSave()).toBe(false);

      // 2. Cancel via Escape close (empty returnValue)
      const escPromise = promptForPlayerName(mockScene, '');
      mockDialog.close('');
      const escResult = await escPromise;
      expect(escResult.cancelled).toBe(true);
      expect(kbManager.enabled).toBe(true);

      // 3. Confirm custom name (returnValue = 'confirm')
      const confirmPromise = promptForPlayerName(mockScene, '');
      mockInput.value = '  Lyra   Vane  ';
      mockDialog.close('confirm');
      const confirmResult = await confirmPromise;
      expect(confirmResult).toEqual({ cancelled: false, playerName: 'Lyra Vane' });
      expect(kbManager.enabled).toBe(true);
      expect(kbPlugin.enabled).toBe(true);
    } finally {
      Object.defineProperty(globalThis, 'document', {
        value: prevDocument,
        writable: true,
        configurable: true,
      });
    }
  });

  it('tracks ExplorationManager fog-of-war cells, landmarks, and honest regional vs. known-world percentages', () => {
    const em = new ExplorationManager();
    expect(em.getRegionExplorationPercent()).toBe(0);
    expect(em.getWorldExplorationPercent()).toBe(0);

    // Verify 4 known continents (18 regions) + 1 secret shrouded 5th continent excluded from ordinary %
    expect(TOTAL_KNOWN_WORLD_REGIONS).toBe(18);
    const secretCont = KNOWN_WORLD_CONTINENTS.find((c) => c.isSecretContinent);
    expect(secretCont).toBeDefined();
    expect(secretCont?.totalRegions).toBe(0);

    const changed = em.updatePlayerPosition(215, 810, 280);
    expect(changed).toBe(true);
    expect(em.isLocationDiscovered('loc_precipice')).toBe(true);
    expect(em.getRegionExplorationPercent()).toBeGreaterThan(0);
    expect(em.getWorldExplorationPercent()).toBeGreaterThan(0);

    // Full Shattered Verge discovery yields 100% regional and 1/18 (~5.56%) known-world completion
    const fullEm = new ExplorationManager(undefined, Array.from(REACHABLE_VERGE_CELLS), []);
    expect(fullEm.getRegionExplorationPercent()).toBe(100);
    expect(fullEm.getWorldExplorationPercent()).toBeCloseTo(100 / 18, 2);
  });

  it('enforces zero Unicode em/en dashes and zero hardcoded Fushi across all game source files and HTML', () => {
    const rawFiles = import.meta.glob('../../**/*.{ts,css}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;

    const entries: Array<[string, string]> = [
      ['index.html', indexHtmlRaw],
      ...Object.entries(rawFiles),
    ];

    const dashViolations: string[] = [];
    const nameViolations: string[] = [];

    for (const [path, content] of entries) {
      if (path.includes('systems.test.ts')) continue;
      if (content.includes('\u2014') || content.includes('\u2013')) {
        dashViolations.push(path);
      }
      if (/\bfushi\b/i.test(content)) {
        nameViolations.push(path);
      }
    }

    expect(dashViolations).toEqual([]);
    expect(nameViolations).toEqual([]);
  });
});
