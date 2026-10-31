import { describe, expect, it, beforeEach } from 'vitest';
import { DIALOGUE_TREES } from '../data/dialogues';
import { DialogueManager } from '../systems/DialogueManager';
import { ImprintManager } from '../systems/ImprintManager';
import { QuestManager } from '../systems/QuestManager';
import { RemnantManager } from '../systems/RemnantManager';
import { SaveManager } from '../systems/SaveManager';
import { SAVE_STORAGE_KEY } from '../constants';

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

describe('A Form Unwritten — Core Progression Systems', () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      writable: true,
      configurable: true,
    });
  });

  it('transitions RemnantManager physics profile and triggers restoration once', () => {
    const rm = new RemnantManager();
    expect(rm.hasWeight()).toBe(false);
    expect(rm.getPhysicsProfile().canFloat).toBe(true);
    expect(rm.getPhysicsProfile().canGroundImpact).toBe(false);

    expect(rm.restore('weight')).toBe(true);
    // Second restoration attempt must return false (triggers exactly once)
    expect(rm.restore('weight')).toBe(false);

    expect(rm.hasWeight()).toBe(true);
    expect(rm.getPhysicsProfile().canFloat).toBe(false);
    expect(rm.getPhysicsProfile().canGroundImpact).toBe(true);
    expect(rm.getPhysicsProfile().canPushHeavyBlocks).toBe(true);
    expect(rm.getPhysicsProfile().canActivateHeavyPlates).toBe(true);
  });

  it('auto-chains QuestManager states from Not Started -> Active -> Completed', () => {
    const qm = new QuestManager();
    expect(qm.getStatus('q_awakening_verge')).toBe('NOT_STARTED');

    qm.startQuest('q_awakening_verge');
    expect(qm.getStatus('q_awakening_verge')).toBe('ACTIVE');

    qm.completeObjective('q_awakening_verge', 'obj_cross_chasm');
    expect(qm.getStatus('q_awakening_verge')).toBe('ACTIVE');

    qm.completeObjective('q_awakening_verge', 'obj_speak_oren');
    expect(qm.getStatus('q_awakening_verge')).toBe('COMPLETED');
    // Chained quest automatically starts
    expect(qm.getStatus('q_echoes_of_substance')).toBe('ACTIVE');
  });

  it('branches DialogueManager across conditional states and choice triggers', () => {
    const dm = new DialogueManager(DIALOGUE_TREES);
    const actions: string[] = [];

    // Pre-weight Oren dialogue
    const n1 = dm.start('npc_oren', {
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

    // Choose option 0
    const n3 = dm.advance(0);
    expect(n3?.id).toBe('oren_taken');

    // Post-weight conditional dialogue entry
    const postNode = dm.start('npc_oren', {
      hasWeight: true,
      imprint: null,
      flags: { met_oren: true },
      triggerAction: (a) => actions.push(a),
    });
    expect(postNode?.id).toBe('oren_post_weight');
  });

  it('records Imprint of Experience once and prevents overwriting', () => {
    const im = new ImprintManager();
    expect(im.getCurrent()).toBeNull();
    expect(im.acquire('resonance')).toBe(true);
    expect(im.acquire('resolve')).toBe(false);
    expect(im.getCurrent()?.alignmentLabel).toBe('Becoming');
  });

  it('persists valid SaveState and safely recovers from corrupted LocalStorage data', () => {
    expect(SaveManager.hasSave()).toBe(false);

    const savedOk = SaveManager.save({
      chapter: 3,
      chapterTitle: 'Chapter III — The First Remnant',
      checkpointId: 'weight_restored',
      playerX: 3440,
      playerY: 514,
      restoredRemnants: ['weight'],
      imprint: null,
      discoveredEchoes: ['echo_first_law'],
      worldFlags: { conduit_north: true, conduit_east: true },
      questStates: {
        q_changed_world: { status: 'ACTIVE', completedObjectives: [] },
      },
    });
    expect(savedOk).toBe(true);
    expect(SaveManager.load()?.restoredRemnants).toEqual(['weight']);

    // Inject corrupted JSON and verify graceful null recovery without throwing
    window.localStorage.setItem(SAVE_STORAGE_KEY, '{corrupted_json');
    expect(SaveManager.load()).toBeNull();
    expect(window.localStorage.getItem(SAVE_STORAGE_KEY)).toBeNull();

    // Inject malformed schema and verify graceful rejection
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify({ version: 1, playerX: 'bad' }));
    expect(SaveManager.load()).toBeNull();
  });
});

