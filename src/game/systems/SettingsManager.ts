import { SETTINGS_STORAGE_KEY } from '../constants';
import type { AtmospherePhase } from '../time/atmospherePresets';

export type AtmosphereMode = 'local_time' | 'living_cycle' | 'fixed';

export interface GameSettings {
  atmosphereMode: AtmosphereMode;
  fixedPhase: AtmospherePhase;
  cycleMinutes: number;
  quality: 'high' | 'standard' | 'low';
}

export const DEFAULT_SETTINGS: GameSettings = {
  atmosphereMode: 'local_time',
  fixedPhase: 'day',
  cycleMinutes: 24,
  quality: 'high',
};

const VALID_MODES: readonly AtmosphereMode[] = ['local_time', 'living_cycle', 'fixed'] as const;
const VALID_PHASES: readonly AtmospherePhase[] = [
  'dawn',
  'morning',
  'day',
  'golden_hour',
  'sunset',
  'night',
] as const;
const VALID_QUALITIES: readonly ('high' | 'standard' | 'low')[] = ['high', 'standard', 'low'] as const;

let inMemorySettings: GameSettings | null = null;

export class SettingsManager {
  public static load(): GameSettings {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return inMemorySettings ? { ...inMemorySettings } : { ...DEFAULT_SETTINGS };
      }
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        return inMemorySettings ? { ...inMemorySettings } : { ...DEFAULT_SETTINGS };
      }
      const parsed = JSON.parse(raw) as Partial<GameSettings>;
      const sanitized = this.sanitize(parsed);
      inMemorySettings = sanitized;
      return sanitized;
    } catch {
      return inMemorySettings ? { ...inMemorySettings } : { ...DEFAULT_SETTINGS };
    }
  }

  public static save(partial: Partial<GameSettings>): GameSettings {
    const current = this.load();
    const updated = this.sanitize({ ...current, ...partial });
    inMemorySettings = updated;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {
      // Storage quota exceeded or blocked; in-memory fallback remains active
    }

    return updated;
  }

  public static reset(): GameSettings {
    inMemorySettings = { ...DEFAULT_SETTINGS };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
      }
    } catch {
      // Ignored safely
    }
    return { ...DEFAULT_SETTINGS };
  }

  public static sanitize(input?: unknown): GameSettings {
    if (!input || typeof input !== 'object') {
      return { ...DEFAULT_SETTINGS };
    }
    const candidate = input as Record<string, unknown>;

    const atmosphereMode: AtmosphereMode =
      typeof candidate.atmosphereMode === 'string' &&
      VALID_MODES.includes(candidate.atmosphereMode as AtmosphereMode)
        ? (candidate.atmosphereMode as AtmosphereMode)
        : DEFAULT_SETTINGS.atmosphereMode;

    const fixedPhase: AtmospherePhase =
      typeof candidate.fixedPhase === 'string' &&
      VALID_PHASES.includes(candidate.fixedPhase as AtmospherePhase)
        ? (candidate.fixedPhase as AtmospherePhase)
        : DEFAULT_SETTINGS.fixedPhase;

    let cycleMinutes =
      typeof candidate.cycleMinutes === 'number' && Number.isFinite(candidate.cycleMinutes)
        ? Math.max(1, Math.min(180, candidate.cycleMinutes))
        : DEFAULT_SETTINGS.cycleMinutes;

    if (!Number.isFinite(cycleMinutes)) {
      cycleMinutes = DEFAULT_SETTINGS.cycleMinutes;
    }

    const quality: 'high' | 'standard' | 'low' =
      typeof candidate.quality === 'string' &&
      VALID_QUALITIES.includes(candidate.quality as 'high' | 'standard' | 'low')
        ? (candidate.quality as 'high' | 'standard' | 'low')
        : DEFAULT_SETTINGS.quality;

    return {
      atmosphereMode,
      fixedPhase,
      cycleMinutes,
      quality,
    };
  }

  public static getAtmosphereLabel(settings?: GameSettings): string {
    const s = settings ?? this.load();
    if (s.atmosphereMode === 'local_time') {
      return 'Local Time (Device)';
    }
    if (s.atmosphereMode === 'living_cycle') {
      return `Living World (${s.cycleMinutes}m)`;
    }
    const phaseNames: Record<AtmospherePhase, string> = {
      dawn: 'Dawn',
      morning: 'Morning',
      day: 'Day',
      golden_hour: 'Golden Hour',
      sunset: 'Sunset',
      night: 'Night',
    };
    return `Fixed: ${phaseNames[s.fixedPhase] ?? 'Day'}`;
  }

  public static cycleAtmosphere(): GameSettings {
    const s = this.load();
    const cycleSequence: Array<{ mode: AtmosphereMode; phase?: AtmospherePhase }> = [
      { mode: 'local_time' },
      { mode: 'living_cycle' },
      { mode: 'fixed', phase: 'dawn' },
      { mode: 'fixed', phase: 'morning' },
      { mode: 'fixed', phase: 'day' },
      { mode: 'fixed', phase: 'golden_hour' },
      { mode: 'fixed', phase: 'sunset' },
      { mode: 'fixed', phase: 'night' },
    ];

    let currentIndex = cycleSequence.findIndex((item) => {
      if (item.mode !== s.atmosphereMode) return false;
      if (item.mode === 'fixed') return item.phase === s.fixedPhase;
      return true;
    });

    if (currentIndex === -1) currentIndex = 0;
    const next = cycleSequence[(currentIndex + 1) % cycleSequence.length];

    return this.save({
      atmosphereMode: next.mode,
      ...(next.phase ? { fixedPhase: next.phase } : {}),
    });
  }
}
