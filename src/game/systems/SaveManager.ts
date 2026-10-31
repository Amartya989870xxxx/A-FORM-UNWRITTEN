import {
  DEFAULT_PLAYER_NAME,
  SAVE_STORAGE_KEY,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type AdventurerRank,
  type SoulAffinityKey,
} from '../constants';

export type RemnantId = 'weight';
export type ImprintId = 'resonance' | 'resolve';

export type SoulSpectrumState = Record<SoulAffinityKey, number>;

export type SavedQuestEntry = {
  status: 'NOT_STARTED' | 'ACTIVE' | 'COMPLETED';
  completedObjectives: string[];
};

export interface SaveState {
  version: 2;
  timestamp: number;
  playerName: string;
  adventurerRank: AdventurerRank;
  chapter: number;
  chapterTitle: string;
  checkpointId: string;
  playerX: number;
  playerY: number;
  restoredRemnants: RemnantId[];
  imprint: ImprintId | null;
  discoveredEchoes: string[];
  discoveredCells: string[];
  discoveredLocations: string[];
  relics: string[];
  soulAffinities: SoulSpectrumState;
  blackOrbUsedCount: number;
  garmentOriginMystery: 'unresolved';
  worldFlags: Record<string, boolean>;
  questStates: Record<string, SavedQuestEntry>;
}

interface RawSaveCandidate {
  version?: unknown;
  timestamp?: unknown;
  playerName?: unknown;
  adventurerRank?: unknown;
  chapter?: unknown;
  chapterTitle?: unknown;
  checkpointId?: unknown;
  playerX?: unknown;
  playerY?: unknown;
  restoredRemnants?: unknown;
  imprint?: unknown;
  discoveredEchoes?: unknown;
  discoveredCells?: unknown;
  discoveredLocations?: unknown;
  relics?: unknown;
  soulAffinities?: unknown;
  blackOrbUsedCount?: unknown;
  worldFlags?: unknown;
  questStates?: unknown;
}

export function createDefaultSoulSpectrum(): SoulSpectrumState {
  return {
    azure: 1,
    verdant: 1,
    amber: 1,
    crimson: 1,
    violet: 1,
    silver: 1,
  };
}

export function sanitizePlayerName(rawName?: string | null): string {
  if (!rawName) return DEFAULT_PLAYER_NAME;
  const cleaned = rawName
    .replace(/[\u0000-\u001F\u007F<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
  return cleaned.length > 0 ? cleaned : DEFAULT_PLAYER_NAME;
}

const VALID_RANKS = new Set<AdventurerRank>(['G', 'F', 'E', 'D', 'C', 'B', 'A', 'S']);
const SOUL_KEYS: SoulAffinityKey[] = ['azure', 'verdant', 'amber', 'crimson', 'violet', 'silver'];
const VALID_QUEST_STATUSES = new Set(['NOT_STARTED', 'ACTIVE', 'COMPLETED']);

function sanitizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item === 'string' && item.length > 0) {
      seen.add(item);
    }
  }
  return Array.from(seen);
}

function sanitizeRemnants(raw: unknown): RemnantId[] {
  if (!Array.isArray(raw)) return [];
  return raw.includes('weight') ? ['weight'] : [];
}

function sanitizeImprint(raw: unknown): ImprintId | null {
  return raw === 'resonance' || raw === 'resolve' ? raw : null;
}

function sanitizeWorldFlags(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'boolean') {
      out[k] = v;
    }
  }
  return out;
}

function sanitizeQuestStates(raw: unknown): Record<string, SavedQuestEntry> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, SavedQuestEntry> = {};
  for (const [questId, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const e = entry as { status?: unknown; completedObjectives?: unknown };
    const status =
      typeof e.status === 'string' && VALID_QUEST_STATUSES.has(e.status)
        ? (e.status as SavedQuestEntry['status'])
        : 'NOT_STARTED';
    out[questId] = {
      status,
      completedObjectives: sanitizeStringArray(e.completedObjectives),
    };
  }
  return out;
}

function deriveSpectrum(
  rawSpectrum: unknown,
  hasWeight: boolean,
  imprint: ImprintId | null,
  echoCount: number,
  worldFlags: Record<string, boolean>
): SoulSpectrumState {
  const base = createDefaultSoulSpectrum();
  if (rawSpectrum && typeof rawSpectrum === 'object' && !Array.isArray(rawSpectrum)) {
    const src = rawSpectrum as Record<string, unknown>;
    let hadValidKey = false;
    for (const key of SOUL_KEYS) {
      const val = src[key];
      if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
        base[key] = Math.round(val);
        hadValidKey = true;
      }
    }
    if (hadValidKey) return base;
  }

  if (hasWeight) {
    base.amber += 2;
  }
  if (imprint === 'resonance') {
    base.verdant += 2;
    base.azure += 1;
  } else if (imprint === 'resolve') {
    base.crimson += 2;
    base.violet += 1;
  }
  if (echoCount > 0) {
    base.azure += echoCount;
  }
  if (worldFlags['loom_clue_1']) base.silver += 1;
  if (worldFlags['loom_clue_2']) base.silver += 1;
  if (worldFlags['loom_reliquary_opened']) base.silver += 2;
  return base;
}

function clampWorldX(x: number): number {
  return Math.max(40, Math.min(WORLD_WIDTH - 40, Math.round(x)));
}

function clampWorldY(y: number): number {
  return Math.max(80, Math.min(WORLD_HEIGHT - 40, Math.round(y)));
}

export class SaveManager {
  private static hasRecoverableProgress(c: RawSaveCandidate): boolean {
    return (
      typeof c.checkpointId === 'string' ||
      Array.isArray(c.restoredRemnants) ||
      (typeof c.questStates === 'object' && c.questStates !== null && !Array.isArray(c.questStates)) ||
      (typeof c.worldFlags === 'object' && c.worldFlags !== null && !Array.isArray(c.worldFlags)) ||
      Array.isArray(c.discoveredEchoes) ||
      Array.isArray(c.relics)
    );
  }

  private static migrateOrNormalizeV1(c: RawSaveCandidate): SaveState | null {
    const hasCoords =
      typeof c.playerX === 'number' &&
      Number.isFinite(c.playerX) &&
      typeof c.playerY === 'number' &&
      Number.isFinite(c.playerY);

    if (!hasCoords && !this.hasRecoverableProgress(c)) {
      return null;
    }

    const restoredRemnants = sanitizeRemnants(c.restoredRemnants);
    const hasWeight = restoredRemnants.includes('weight');
    const imprint = sanitizeImprint(c.imprint);
    const discoveredEchoes = sanitizeStringArray(c.discoveredEchoes);
    const worldFlags = sanitizeWorldFlags(c.worldFlags);
    const questStates = sanitizeQuestStates(c.questStates);
    const relics = sanitizeStringArray(c.relics);
    if (worldFlags['loom_reliquary_opened'] && !relics.includes('relic_compass_lens')) {
      relics.push('relic_compass_lens');
    }

    let rawX = hasCoords ? (c.playerX as number) : hasWeight ? 3440 : 215;
    let rawY = hasCoords ? (c.playerY as number) : hasWeight ? 514 : 810;

    // Remap legacy v1 eastern coordinates safely around the expanded Shattered Sky-Arch & sealed Crucible
    let migratedX = rawX;
    let migratedY = rawY;
    if (rawY < 620 && rawX >= 3300) {
      if (hasWeight) {
        // Post-Weight v1 save inside old Crucible: shift +1040 onto the v2 Crucible dais
        migratedX = rawX + 1040;
        worldFlags['sky_bell_rung'] = true;
        worldFlags['crucible_lock_west'] = true;
        worldFlags['crucible_lock_east'] = true;
        worldFlags['crucible_lock_zenith'] = true;
        worldFlags['crucible_unsealed'] = true;
      } else {
        // Pre-Weight v1 save east of Wind-Spires: NEVER place inside the newly sealed Crucible.
        // Place safely on the Outer Spire Gate / Sky-Arch threshold platform (p_z2_spire_gate_floor).
        const spiresOpen = Boolean(worldFlags['conduit_north']) && Boolean(worldFlags['conduit_east']);
        migratedX = spiresOpen ? 3268 : 3168;
        migratedY = 514;
      }
    } else if (rawY > 980 && rawX >= 3100) {
      if (hasWeight || Boolean(worldFlags['courtyard_unsealed'])) {
        migratedX = rawX + 760;
      } else {
        migratedX = 870;
        migratedY = 812;
      }
    }

    if (hasWeight) {
      worldFlags['sky_bell_rung'] = true;
      worldFlags['crucible_lock_west'] = true;
      worldFlags['crucible_lock_east'] = true;
      worldFlags['crucible_lock_zenith'] = true;
      worldFlags['crucible_unsealed'] = true;
    }

    const locations = new Set<string>(['loc_precipice', ...sanitizeStringArray(c.discoveredLocations)]);
    if (migratedX >= 700 || worldFlags['courtyard_unsealed']) locations.add('loc_courtyard_seals');
    if (worldFlags['met_oren'] || (migratedY < 620 && migratedX >= 1550)) locations.add('loc_observatory');
    if (worldFlags['conduit_north'] || worldFlags['conduit_east'] || (migratedY < 620 && migratedX >= 2100)) {
      locations.add('loc_wind_spires');
    }
    if (hasWeight) locations.add('loc_crucible');
    if (worldFlags['courtyard_unsealed']) locations.add('loc_sunken_causeway');
    if (imprint !== null) locations.add('loc_cradle_sanctum');

    const rawRank =
      typeof c.adventurerRank === 'string' && VALID_RANKS.has(c.adventurerRank as AdventurerRank)
        ? (c.adventurerRank as AdventurerRank)
        : 'G';
    const adventurerRank: AdventurerRank =
      hasWeight && rawRank === 'G' ? 'F' : rawRank;

    const rawTitle =
      typeof c.chapterTitle === 'string' && c.chapterTitle.trim().length > 0
        ? c.chapterTitle.replace(/[\u2013\u2014]/g, ':')
        : 'Chapter I: The Shattered Verge';

    return {
      version: 2,
      timestamp:
        typeof c.timestamp === 'number' && Number.isFinite(c.timestamp) ? c.timestamp : Date.now(),
      playerName: sanitizePlayerName(typeof c.playerName === 'string' ? c.playerName : undefined),
      adventurerRank,
      chapter:
        typeof c.chapter === 'number' && Number.isFinite(c.chapter) && c.chapter >= 1
          ? Math.round(c.chapter)
          : 1,
      chapterTitle: rawTitle,
      checkpointId:
        typeof c.checkpointId === 'string' && c.checkpointId.length > 0
          ? c.checkpointId
          : 'migrated_v1',
      playerX: clampWorldX(migratedX),
      playerY: clampWorldY(migratedY),
      restoredRemnants,
      imprint,
      discoveredEchoes,
      discoveredCells: sanitizeStringArray(c.discoveredCells),
      discoveredLocations: Array.from(locations),
      relics,
      soulAffinities: deriveSpectrum(
        c.soulAffinities,
        hasWeight,
        imprint,
        discoveredEchoes.length,
        worldFlags
      ),
      blackOrbUsedCount:
        typeof c.blackOrbUsedCount === 'number' && Number.isFinite(c.blackOrbUsedCount)
          ? Math.max(0, Math.round(c.blackOrbUsedCount))
          : 0,
      garmentOriginMystery: 'unresolved',
      worldFlags,
      questStates,
    };
  }

  private static normalizeV2(c: RawSaveCandidate): SaveState | null {
    const coordsExplicitlyInvalid =
      (c.playerX !== undefined && (typeof c.playerX !== 'number' || !Number.isFinite(c.playerX))) ||
      (c.playerY !== undefined && (typeof c.playerY !== 'number' || !Number.isFinite(c.playerY)));

    const hasValidCoords =
      typeof c.playerX === 'number' &&
      Number.isFinite(c.playerX) &&
      typeof c.playerY === 'number' &&
      Number.isFinite(c.playerY);

    if (coordsExplicitlyInvalid && !this.hasRecoverableProgress(c)) {
      return null;
    }
    if (!hasValidCoords && !this.hasRecoverableProgress(c)) {
      return null;
    }

    const restoredRemnants = sanitizeRemnants(c.restoredRemnants);
    const hasWeight = restoredRemnants.includes('weight');
    const imprint = sanitizeImprint(c.imprint);
    const discoveredEchoes = sanitizeStringArray(c.discoveredEchoes);
    const worldFlags = sanitizeWorldFlags(c.worldFlags);
    const questStates = sanitizeQuestStates(c.questStates);
    const relics = sanitizeStringArray(c.relics);
    if (worldFlags['loom_reliquary_opened'] && !relics.includes('relic_compass_lens')) {
      relics.push('relic_compass_lens');
    }

    const fallbackX = hasWeight ? 4480 : 215;
    const fallbackY = hasWeight ? 514 : 810;
    const px = hasValidCoords ? (c.playerX as number) : fallbackX;
    const py = hasValidCoords ? (c.playerY as number) : fallbackY;

    const rawRank =
      typeof c.adventurerRank === 'string' && VALID_RANKS.has(c.adventurerRank as AdventurerRank)
        ? (c.adventurerRank as AdventurerRank)
        : hasWeight
          ? 'F'
          : 'G';
    const adventurerRank: AdventurerRank = hasWeight && rawRank === 'G' ? 'F' : rawRank;

    const savedLocs = sanitizeStringArray(c.discoveredLocations);
    const discoveredLocations = savedLocs.length > 0 ? savedLocs : ['loc_precipice'];

    const rawTitle =
      typeof c.chapterTitle === 'string' && c.chapterTitle.trim().length > 0
        ? c.chapterTitle.replace(/[\u2013\u2014]/g, ':')
        : 'Chapter I: The Shattered Verge';

    return {
      version: 2,
      timestamp:
        typeof c.timestamp === 'number' && Number.isFinite(c.timestamp) ? c.timestamp : Date.now(),
      playerName: sanitizePlayerName(typeof c.playerName === 'string' ? c.playerName : undefined),
      adventurerRank,
      chapter:
        typeof c.chapter === 'number' && Number.isFinite(c.chapter) && c.chapter >= 1
          ? Math.round(c.chapter)
          : 1,
      chapterTitle: rawTitle,
      checkpointId:
        typeof c.checkpointId === 'string' && c.checkpointId.length > 0
          ? c.checkpointId
          : 'recovered_checkpoint',
      playerX: clampWorldX(px),
      playerY: clampWorldY(py),
      restoredRemnants,
      imprint,
      discoveredEchoes,
      discoveredCells: sanitizeStringArray(c.discoveredCells),
      discoveredLocations,
      relics,
      soulAffinities: deriveSpectrum(
        c.soulAffinities,
        hasWeight,
        imprint,
        discoveredEchoes.length,
        worldFlags
      ),
      blackOrbUsedCount:
        typeof c.blackOrbUsedCount === 'number' && Number.isFinite(c.blackOrbUsedCount)
          ? Math.max(0, Math.round(c.blackOrbUsedCount))
          : 0,
      garmentOriginMystery: 'unresolved',
      worldFlags,
      questStates,
    };
  }

  private static isValidV2(raw: unknown): raw is SaveState {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    const c = raw as Partial<SaveState>;
    return (
      c.version === 2 &&
      typeof c.timestamp === 'number' &&
      typeof c.playerName === 'string' &&
      typeof c.adventurerRank === 'string' &&
      VALID_RANKS.has(c.adventurerRank as AdventurerRank) &&
      typeof c.chapter === 'number' &&
      typeof c.chapterTitle === 'string' &&
      typeof c.checkpointId === 'string' &&
      typeof c.playerX === 'number' &&
      Number.isFinite(c.playerX) &&
      typeof c.playerY === 'number' &&
      Number.isFinite(c.playerY) &&
      Array.isArray(c.restoredRemnants) &&
      (c.imprint === null || c.imprint === 'resonance' || c.imprint === 'resolve') &&
      Array.isArray(c.discoveredEchoes) &&
      Array.isArray(c.discoveredCells) &&
      Array.isArray(c.discoveredLocations) &&
      Array.isArray(c.relics) &&
      typeof c.soulAffinities === 'object' &&
      c.soulAffinities !== null &&
      typeof c.worldFlags === 'object' &&
      c.worldFlags !== null &&
      typeof c.questStates === 'object' &&
      c.questStates !== null
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
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null;
      }

      const candidate = parsed as RawSaveCandidate;
      if (candidate.version === 2) {
        const normalized = this.normalizeV2(candidate);
        if (!normalized) return null;
        return normalized;
      }

      if (candidate.version === 1) {
        const migrated = this.migrateOrNormalizeV1(candidate);
        if (!migrated) return null;
        window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }

      // Unrecognized version: never silently delete stored user data
      return null;
    } catch {
      try {
        window.localStorage.removeItem(SAVE_STORAGE_KEY);
      } catch {
        // Ignore restricted storage errors
      }
      return null;
    }
  }

  public static save(
    state: Omit<
      SaveState,
      'version' | 'timestamp' | 'blackOrbUsedCount' | 'garmentOriginMystery'
    > & {
      blackOrbUsedCount?: number;
    }
  ): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      const payload: SaveState = {
        ...state,
        playerName: sanitizePlayerName(state.playerName),
        blackOrbUsedCount: state.blackOrbUsedCount ?? 0,
        garmentOriginMystery: 'unresolved',
        version: 2,
        timestamp: Date.now(),
      };
      if (!this.isValidV2(payload)) return false;
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
      // Ignore restricted storage errors
    }
  }
}
