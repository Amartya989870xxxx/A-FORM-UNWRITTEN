export type RemnantId = 'weight';
export type ImprintId = 'resonance' | 'resolve';

export interface SaveState {
  version: 1;
  timestamp: number;
  chapter: number;
  chapterTitle: string;
  checkpointId: string;
  playerX: number;
  playerY: number;
  restoredRemnants: RemnantId[];
  imprint: ImprintId | null;
  discoveredEchoes: string[];
  worldFlags: Record<string, boolean>;
  questStates: Record<
    string,
    {
      status: 'NOT_STARTED' | 'ACTIVE' | 'COMPLETED';
      completedObjectives: string[];
    }
  >;
}

import { SAVE_STORAGE_KEY } from '../constants';

export class SaveManager {
  private static isValidSave(raw: unknown): raw is SaveState {
    if (!raw || typeof raw !== 'object') return false;
    const candidate = raw as Partial<SaveState>;
    return (
      candidate.version === 1 &&
      typeof candidate.timestamp === 'number' &&
      typeof candidate.chapter === 'number' &&
      typeof candidate.chapterTitle === 'string' &&
      typeof candidate.checkpointId === 'string' &&
      typeof candidate.playerX === 'number' &&
      Number.isFinite(candidate.playerX) &&
      typeof candidate.playerY === 'number' &&
      Number.isFinite(candidate.playerY) &&
      Array.isArray(candidate.restoredRemnants) &&
      (candidate.imprint === null ||
        candidate.imprint === 'resonance' ||
        candidate.imprint === 'resolve') &&
      Array.isArray(candidate.discoveredEchoes) &&
      typeof candidate.worldFlags === 'object' &&
      candidate.worldFlags !== null &&
      typeof candidate.questStates === 'object' &&
      candidate.questStates !== null
    );
  }

  public static hasSave(): boolean {
    return this.load() !== null;
  }

  public static load(): SaveState | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const serialized = window.localStorage.getItem(SAVE_STORAGE_KEY);
      if (!serialized) return null;
      const parsed: unknown = JSON.parse(serialized);
      if (!this.isValidSave(parsed)) {
        // Recover cleanly from corrupted or outdated schema
        window.localStorage.removeItem(SAVE_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      try {
        window.localStorage.removeItem(SAVE_STORAGE_KEY);
      } catch {
        // Ignore storage restriction errors
      }
      return null;
    }
  }

  public static save(state: Omit<SaveState, 'version' | 'timestamp'>): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      const payload: SaveState = {
        ...state,
        version: 1,
        timestamp: Date.now(),
      };
      if (!this.isValidSave(payload)) return false;
      window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  public static clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(SAVE_STORAGE_KEY);
      }
    } catch {
      // Ignore storage restriction errors
    }
  }
}

