import Phaser from 'phaser';
import { GAME_EVENTS } from '../constants';
import {
  QUEST_DEFINITIONS,
  type QuestDefinition,
  type QuestStatus,
} from '../data/quests';

export interface QuestRuntimeState {
  status: QuestStatus;
  completedObjectives: Set<string>;
}

export class QuestManager {
  private states = new Map<string, QuestRuntimeState>();
  private events?: Phaser.Events.EventEmitter;

  constructor(
    events?: Phaser.Events.EventEmitter,
    savedStates?: Record<string, { status: QuestStatus; completedObjectives: string[] }>
  ) {
    this.events = events;
    for (const def of QUEST_DEFINITIONS) {
      const saved = savedStates?.[def.id];
      if (saved) {
        this.states.set(def.id, {
          status: saved.status,
          completedObjectives: new Set(saved.completedObjectives),
        });
      } else {
        this.states.set(def.id, {
          status: 'NOT_STARTED',
          completedObjectives: new Set(),
        });
      }
    }
  }

  public startQuest(questId: string, silent = false): boolean {
    const state = this.states.get(questId);
    const def = this.getDefinition(questId);
    if (!state || !def || state.status !== 'NOT_STARTED') {
      return false;
    }
    state.status = 'ACTIVE';
    if (!silent) {
      this.events?.emit(GAME_EVENTS.QUEST_UPDATED, {
        type: 'started',
        quest: def,
      });
    }
    return true;
  }

  public completeObjective(questId: string, objectiveId: string): boolean {
    const state = this.states.get(questId);
    const def = this.getDefinition(questId);
    if (!state || !def) return false;

    if (state.status === 'NOT_STARTED') {
      state.status = 'ACTIVE';
    }
    if (state.completedObjectives.has(objectiveId)) {
      return false;
    }

    const validObj = def.objectives.find((o) => o.id === objectiveId);
    if (!validObj) return false;

    state.completedObjectives.add(objectiveId);

    const allDone = def.objectives.every((o) => state.completedObjectives.has(o.id));
    if (allDone && state.status !== 'COMPLETED') {
      state.status = 'COMPLETED';
      this.events?.emit(GAME_EVENTS.QUEST_UPDATED, {
        type: 'completed',
        quest: def,
        objective: validObj,
      });
      if (def.nextQuestId) {
        this.startQuest(def.nextQuestId);
      }
    } else {
      this.events?.emit(GAME_EVENTS.QUEST_UPDATED, {
        type: 'objective',
        quest: def,
        objective: validObj,
      });
    }
    return true;
  }

  public getStatus(questId: string): QuestStatus {
    return this.states.get(questId)?.status ?? 'NOT_STARTED';
  }

  public isObjectiveCompleted(questId: string, objectiveId: string): boolean {
    return this.states.get(questId)?.completedObjectives.has(objectiveId) ?? false;
  }

  public getActiveQuest(): {
    definition: QuestDefinition;
    state: QuestRuntimeState;
    currentObjectiveText: string;
  } | null {
    for (const def of QUEST_DEFINITIONS) {
      const state = this.states.get(def.id);
      if (state && state.status === 'ACTIVE') {
        const nextObj = def.objectives.find((o) => !state.completedObjectives.has(o.id));
        return {
          definition: def,
          state,
          currentObjectiveText: nextObj ? nextObj.description : 'Quest Complete',
        };
      }
    }
    return null;
  }

  public getAllQuestsWithState(): Array<{
    definition: QuestDefinition;
    status: QuestStatus;
    completedObjectives: string[];
  }> {
    return QUEST_DEFINITIONS.map((def) => {
      const state = this.states.get(def.id)!;
      return {
        definition: def,
        status: state.status,
        completedObjectives: Array.from(state.completedObjectives),
      };
    });
  }

  public serialize(): Record<string, { status: QuestStatus; completedObjectives: string[] }> {
    const out: Record<string, { status: QuestStatus; completedObjectives: string[] }> = {};
    for (const [id, state] of this.states.entries()) {
      out[id] = {
        status: state.status,
        completedObjectives: Array.from(state.completedObjectives),
      };
    }
    return out;
  }

  private getDefinition(questId: string): QuestDefinition | undefined {
    return QUEST_DEFINITIONS.find((q) => q.id === questId);
  }
}

