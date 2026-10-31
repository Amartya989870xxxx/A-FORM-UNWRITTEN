import type Phaser from 'phaser';
import { GAME_EVENTS, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';

export interface MapLocationDef {
  id: string;
  name: string;
  kind: 'landmark' | 'ruin' | 'dungeon' | 'sanctum' | 'threshold';
  worldX: number;
  worldY: number;
  discoverRadius: number;
  description: string;
}

export interface WorldContinentDef {
  id: string;
  name: string;
  subtitle: string;
  totalRegions: number;
  isSecretContinent?: boolean;
}

/**
 * Known world geography used to calculate honest global vs. regional exploration.
 * The fifth eastern landmass is shrouded in eternal black mist and excluded from
 * ordinary world percentages until its hidden multi-arc quest is unlocked in future chapters.
 */
export const KNOWN_WORLD_CONTINENTS: WorldContinentDef[] = [
  {
    id: 'cont_verge_crown',
    name: 'Aethelgard & The Crown Reaches',
    subtitle: 'Northern Highland Kingdoms & The Shattered Verge',
    totalRegions: 5,
  },
  {
    id: 'cont_solis_expanse',
    name: 'The Solis Aridlands',
    subtitle: 'Southwestern Sun-Forged Dominions & Obsidian Calderas',
    totalRegions: 4,
  },
  {
    id: 'cont_high_spire',
    name: 'Aurelia of the Ivory Spires',
    subtitle: 'Northeastern Guild Citadels & Sky-Bridges',
    totalRegions: 5,
  },
  {
    id: 'cont_verdant_march',
    name: 'The Sylphic Marches',
    subtitle: 'Southeastern River Realms & Sunken Archives',
    totalRegions: 4,
  },
  {
    id: 'cont_veiled_abyss',
    name: 'Uncharted Abyssal Shroud',
    subtitle: 'Veiled Beyond Recorded Cartography',
    totalRegions: 0,
    isSecretContinent: true,
  },
];

export const TOTAL_KNOWN_WORLD_REGIONS = KNOWN_WORLD_CONTINENTS.reduce(
  (acc, c) => acc + c.totalRegions,
  0
); // 18 regions across the 4 known continents

export const SHATTERED_VERGE_LOCATIONS: MapLocationDef[] = [
  {
    id: 'loc_precipice',
    name: 'Whispering Precipice',
    kind: 'landmark',
    worldX: 240,
    worldY: 815,
    discoverRadius: 340,
    description: 'Broken awakening terrace overlooking the mist-choked chasms.',
  },
  {
    id: 'loc_courtyard_seals',
    name: 'Counterweight Courtyard',
    kind: 'ruin',
    worldX: 890,
    worldY: 815,
    discoverRadius: 280,
    description: 'Ancient dual-plinth lock sealing the subterranean shaft.',
  },
  {
    id: 'loc_observatory',
    name: 'Oren’s Observatory',
    kind: 'landmark',
    worldX: 1660,
    worldY: 514,
    discoverRadius: 290,
    description: 'Ruined aqueduct watchpost tended by Oren, the Hollow Chronicler.',
  },
  {
    id: 'loc_wind_spires',
    name: 'Twin Wind-Spires',
    kind: 'ruin',
    worldX: 2540,
    worldY: 420,
    discoverRadius: 420,
    description: 'Suspended resonance pylons and directional wind vanes.',
  },
  {
    id: 'loc_sky_bridge',
    name: 'Shattered Sky-Arch',
    kind: 'ruin',
    worldX: 3650,
    worldY: 360,
    discoverRadius: 380,
    description: 'Drifting masonry spans and the harmonic sky-bell above the clouds.',
  },
  {
    id: 'loc_crucible',
    name: 'Crucible of Mass',
    kind: 'dungeon',
    worldX: 4480,
    worldY: 480,
    discoverRadius: 380,
    description: 'Domed vault housing the triple-locked Remnant of Weight.',
  },
  {
    id: 'loc_return_gallery',
    name: 'Echoing Underwalk',
    kind: 'ruin',
    worldX: 2900,
    worldY: 700,
    discoverRadius: 380,
    description: 'Lower colonnade connecting the Crucible foundation to the western cliffs.',
  },
  {
    id: 'loc_sunken_causeway',
    name: 'Sunken Causeway Vault',
    kind: 'dungeon',
    worldX: 2050,
    worldY: 1110,
    discoverRadius: 380,
    description: 'Calcified subterranean lock chamber beneath the main chasm.',
  },
  {
    id: 'loc_cradle_sanctum',
    name: 'Cradle of First Names',
    kind: 'sanctum',
    worldX: 3680,
    worldY: 1110,
    discoverRadius: 380,
    description: 'Root-woven sanctuary where Vespera tends the fracturing Memory Crucible.',
  },
  {
    id: 'loc_mirror_arch',
    name: 'Fractured Mirror-Arch',
    kind: 'threshold',
    worldX: 5060,
    worldY: 1110,
    discoverRadius: 320,
    description: 'Eastern cliffside threshold gazing out toward the Inner Kingdoms.',
  },
];

export const MAP_GRID_COLS = 28;
export const MAP_GRID_ROWS = 8;

/**
 * Defines which grid cells (col, row) correspond to actual traversable airspace, ruins,
 * spires, galleries, and subterranean halls in The Shattered Verge (excluding solid bedrock).
 */
function buildReachableVergeCells(): Set<string> {
  const cells = new Set<string>();
  const addRect = (c0: number, c1: number, r0: number, r1: number) => {
    for (let c = c0; c <= c1; c++) {
      for (let r = r0; r <= r1; r++) {
        if (c >= 0 && c < MAP_GRID_COLS && r >= 0 && r < MAP_GRID_ROWS) {
          cells.add(`${c}_${r}`);
        }
      }
    }
  };

  // Zone 1 Precipice, Courtyard & Sky Alcove (cols 0..7, rows 3..5)
  addRect(0, 7, 3, 5);
  // Sunken Shaft vertical drop (cols 5..7, rows 5..6)
  addRect(5, 7, 5, 6);
  // Zone 2 Observatory & Wind-Spires (cols 7..16, rows 1..3)
  addRect(7, 16, 1, 3);
  // Zone 2.5 Shattered Sky-Arch Bridge (cols 16..20, rows 1..3)
  addRect(16, 20, 1, 3);
  // Zone 3 Crucible of Mass Dome & Floor (cols 20..24, rows 1..3)
  addRect(20, 24, 1, 3);
  // Zone 4 Return Gallery Underwalk (cols 7..24, row 4)
  addRect(7, 24, 4, 4);
  // Zone 5 Sunken Causeway, Cradle Sanctum & Mirror-Arch Promontory (cols 6..26, rows 5..6)
  addRect(6, 26, 5, 6);

  return cells;
}

export const REACHABLE_VERGE_CELLS = buildReachableVergeCells();

export class ExplorationManager {
  private readonly discoveredCells = new Set<string>();
  private readonly discoveredLocations = new Set<string>();
  private readonly events?: Phaser.Events.EventEmitter;

  constructor(
    events?: Phaser.Events.EventEmitter,
    savedCells: string[] = [],
    savedLocations: string[] = []
  ) {
    this.events = events;
    for (const cell of savedCells) {
      if (REACHABLE_VERGE_CELLS.has(cell)) {
        this.discoveredCells.add(cell);
      }
    }
    for (const loc of savedLocations) {
      this.discoveredLocations.add(loc);
    }
  }

  public updatePlayerPosition(worldX: number, worldY: number, revealRadius = 270): boolean {
    let changed = false;

    const cellW = WORLD_WIDTH / MAP_GRID_COLS;
    const cellH = WORLD_HEIGHT / MAP_GRID_ROWS;

    const minCol = Math.max(0, Math.floor((worldX - revealRadius) / cellW));
    const maxCol = Math.min(MAP_GRID_COLS - 1, Math.floor((worldX + revealRadius) / cellW));
    const minRow = Math.max(0, Math.floor((worldY - revealRadius * 0.85) / cellH));
    const maxRow = Math.min(MAP_GRID_ROWS - 1, Math.floor((worldY + revealRadius * 0.85) / cellH));

    for (let c = minCol; c <= maxCol; c++) {
      for (let r = minRow; r <= maxRow; r++) {
        const cx = (c + 0.5) * cellW;
        const cy = (r + 0.5) * cellH;
        const dx = (cx - worldX) / revealRadius;
        const dy = (cy - worldY) / (revealRadius * 0.92);
        if (dx * dx + dy * dy <= 1.25) {
          const key = `${c}_${r}`;
          if (REACHABLE_VERGE_CELLS.has(key) && !this.discoveredCells.has(key)) {
            this.discoveredCells.add(key);
            changed = true;
          }
        }
      }
    }

    for (const loc of SHATTERED_VERGE_LOCATIONS) {
      if (this.discoveredLocations.has(loc.id)) continue;
      const dist = Math.hypot(loc.worldX - worldX, loc.worldY - worldY);
      if (dist <= loc.discoverRadius) {
        this.discoveredLocations.add(loc.id);
        changed = true;
        this.events?.emit(GAME_EVENTS.LOCATION_DISCOVERED, loc);
      }
    }

    return changed;
  }

  public isCellDiscovered(col: number, row: number): boolean {
    return this.discoveredCells.has(`${col}_${row}`);
  }

  public isReachableCell(col: number, row: number): boolean {
    return REACHABLE_VERGE_CELLS.has(`${col}_${row}`);
  }

  public isLocationDiscovered(locationId: string): boolean {
    return this.discoveredLocations.has(locationId);
  }

  public getRegionExplorationPercent(): number {
    if (REACHABLE_VERGE_CELLS.size === 0) return 0;
    const pct = (this.discoveredCells.size / REACHABLE_VERGE_CELLS.size) * 100;
    return Math.min(100, Math.round(pct * 10) / 10);
  }

  public getWorldExplorationPercent(): number {
    const regionRatio =
      REACHABLE_VERGE_CELLS.size > 0
        ? Math.min(1, this.discoveredCells.size / REACHABLE_VERGE_CELLS.size)
        : 0;
    const worldPct = (regionRatio / TOTAL_KNOWN_WORLD_REGIONS) * 100;
    return Math.round(worldPct * 100) / 100;
  }

  public getDiscoveredCells(): string[] {
    return Array.from(this.discoveredCells);
  }

  public getDiscoveredLocations(): string[] {
    return Array.from(this.discoveredLocations);
  }

  public getDiscoveredLocationDefs(): MapLocationDef[] {
    return SHATTERED_VERGE_LOCATIONS.filter((l) => this.discoveredLocations.has(l.id));
  }
}
