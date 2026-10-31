import type { PlatformVisualStyle } from '../utils/ArtGenerator';

export interface PlatformDef {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: PlatformVisualStyle;
}

export interface UpdraftDef {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  initiallyEnabled: boolean;
}

export interface RuneSignDef {
  x: number;
  y: number;
  text: string;
  subtext?: string;
}

export interface RuinPropDef {
  x: number;
  y: number;
  kind: 'arch' | 'pillar' | 'statue' | 'monolith' | 'roots';
  scale?: number;
}

export interface ChapterZoneTrigger {
  id: string;
  chapter: number;
  title: string;
  subtitle: string;
  bounds: { x: number; y: number; width: number; height: number };
  requiresWeight?: boolean;
}

/**
 * Interconnected 5-zone layout of The Shattered Verge.
 * Every platform height and horizontal span is tuned against PHYSICS_PROFILES
 * (Unbound jump height ~139px + float/updraft vs. Grounded jump height ~117px).
 */
export const WORLD_PLATFORMS: PlatformDef[] = [
  // --- ZONE 1: THE WHISPERING PRECIPICE (Top y = 840) ---
  { id: 'p_z1_start', x: 255, y: 864, width: 470, height: 48, style: 'ground' },
  { id: 'p_z1_safety', x: 540, y: 936, width: 220, height: 28, style: 'floating' },
  { id: 'p_z1_courtyard', x: 870, y: 864, width: 560, height: 48, style: 'ground' },
  // Optional high sky-ledge for Echo Tablet I (reachable by floating left from main updraft)
  { id: 'p_z1_echo_ledge', x: 760, y: 652, width: 170, height: 24, style: 'floating' },

  // Sunken shaft steps (comfortable 70-75px increments between y=840 and y=1140)
  { id: 'p_shaft_step_0', x: 1278, y: 864, width: 76, height: 24, style: 'ground' },
  { id: 'p_shaft_step_1', x: 1190, y: 927, width: 88, height: 24, style: 'sanctum' },
  { id: 'p_shaft_step_2', x: 1272, y: 1002, width: 88, height: 24, style: 'sanctum' },
  { id: 'p_shaft_step_3', x: 1190, y: 1077, width: 88, height: 24, style: 'sanctum' },
  // Right wall of shaft above gate_sunken_entry
  { id: 'p_shaft_wall_e', x: 1360, y: 900, width: 44, height: 160, style: 'sanctum' },

  // --- ZONE 2: THE FORGOTTEN MECHANISM (Main Top y = 540) ---
  { id: 'p_z2_observatory', x: 1720, y: 564, width: 520, height: 48, style: 'aqueduct' },
  // Puzzle 1 floating islands & spires
  { id: 'p_z2_island_a', x: 2210, y: 510, width: 180, height: 28, style: 'floating' },
  { id: 'p_z2_north_spire', x: 2130, y: 314, width: 210, height: 28, style: 'floating' },
  { id: 'p_z2_island_b', x: 2540, y: 554, width: 230, height: 28, style: 'floating' },
  { id: 'p_z2_east_balcony', x: 2940, y: 374, width: 240, height: 28, style: 'floating' },
  // High Spire Overlook for Echo Tablet II
  { id: 'p_z2_echo_peak', x: 2560, y: 224, width: 170, height: 24, style: 'floating' },

  // Crucible Vault dividing wall (above and below gate_crucible so Zone 3 cannot be bypassed)
  { id: 'p_z3_vault_header', x: 3210, y: 260, width: 42, height: 280, style: 'aqueduct' },
  { id: 'p_z3_vault_pillar_low', x: 3210, y: 632, width: 42, height: 92, style: 'aqueduct' },

  // --- ZONE 3: THE CRUCIBLE OF MASS (Top y = 540) ---
  { id: 'p_z3_crucible', x: 3380, y: 564, width: 380, height: 48, style: 'aqueduct' },
  // Gap from x=3570..3730 holds FracturedSlab 'slab_crucible'
  { id: 'p_z3_east_cap', x: 3800, y: 564, width: 140, height: 48, style: 'aqueduct' },
  { id: 'p_z3_east_wall', x: 3860, y: 650, width: 44, height: 220, style: 'aqueduct' },

  // --- ZONE 4: RETURN GALLERY & TERRACED STEPS (Top y = 722) ---
  { id: 'p_z4_gallery', x: 2665, y: 746, width: 2430, height: 48, style: 'aqueduct' },
  // Optional stairs from Return Gallery back up to Oren's Observatory (60px steps)
  { id: 'p_z4_oren_step_1', x: 1880, y: 674, width: 105, height: 24, style: 'aqueduct' },
  { id: 'p_z4_oren_step_2', x: 1785, y: 614, width: 105, height: 24, style: 'aqueduct' },
  // Terraced steps connecting Return Gallery (722) westward down to Zone 1 Courtyard (840)
  { id: 'p_z4_return_step', x: 1395, y: 794, width: 120, height: 24, style: 'ground' },

  // --- ZONE 5: THE SUNKEN CAUSEWAY & SANCTUM (Floor Top y = 1140) ---
  { id: 'p_z5_floor_main', x: 2800, y: 1170, width: 3380, height: 60, style: 'sanctum' },
  { id: 'p_z5_west_wall', x: 1110, y: 1040, width: 44, height: 320, style: 'sanctum' },

  // Puzzle 2: Mezzanine steps leading over the calcified vault roof (68px steps)
  { id: 'p_z5_mez_step_1', x: 1580, y: 1084, width: 110, height: 24, style: 'sanctum' },
  { id: 'p_z5_mez_step_2', x: 1715, y: 1016, width: 150, height: 24, style: 'sanctum' },
  // Echo Tablet III alcove to the west of mezzanine
  { id: 'p_z5_echo_ledge', x: 1460, y: 970, width: 115, height: 22, style: 'sanctum' },
  // Vault left wall (forces player up mezzanine and through slab_sanctum via Ground Impact)
  { id: 'p_z5_vault_wall_w', x: 1840, y: 1072, width: 36, height: 136, style: 'sanctum' },
  { id: 'p_z5_vault_inner_step', x: 1882, y: 1084, width: 48, height: 20, style: 'sanctum' },
  // Gap x=1858..2018 at y=1004 holds FracturedSlab 'slab_sanctum'
  { id: 'p_z5_vault_roof_e', x: 2068, y: 1016, width: 100, height: 24, style: 'sanctum' },
  // Header above gate_sanctum_mid (x=2100) and gate_sanctum_final (x=2620) and gate_threshold (x=3720)
  { id: 'p_z5_ceiling_mid', x: 2100, y: 940, width: 40, height: 130, style: 'sanctum' },
  { id: 'p_z5_ceiling_final', x: 2620, y: 920, width: 44, height: 160, style: 'sanctum' },
  { id: 'p_z5_ceiling_thresh', x: 3720, y: 920, width: 44, height: 160, style: 'sanctum' },
];

export const WORLD_UPDRAFTS: UpdraftDef[] = [
  // Zone 1 main chasm updraft (carries Unbound protagonist from y=840 to y=520)
  {
    id: 'updraft_chasm',
    x: 1295,
    y: 660,
    width: 175,
    height: 350,
    initiallyEnabled: true,
  },
  // Safety return updraft from Return Gallery (y=722) back to Observatory (y=540) while Unbound
  {
    id: 'updraft_gallery_safety',
    x: 2045,
    y: 615,
    width: 115,
    height: 220,
    initiallyEnabled: true,
  },
  // Puzzle 1 North Spire thermal
  {
    id: 'updraft_north_spire',
    x: 2270,
    y: 395,
    width: 115,
    height: 230,
    initiallyEnabled: true,
  },
  // Puzzle 1 East Balcony thermal (activated by redirecting Wind Vane 'vane_east')
  {
    id: 'updraft_east_balcony',
    x: 2735,
    y: 385,
    width: 135,
    height: 340,
    initiallyEnabled: false,
  },
];

export const WORLD_RUNE_SIGNS: RuneSignDef[] = [
  {
    x: 185,
    y: 742,
    text: 'A / D  or  ← / →   Traverse',
    subtext: 'J — Journal     ESC — Pause',
  },
  {
    x: 458,
    y: 748,
    text: 'SPACE   Leap',
  },
  {
    x: 1085,
    y: 742,
    text: 'Hold SPACE in Midair   Drift on Wind',
    subtext: 'Weightless forms rise within glowing currents',
  },
  {
    x: 3650,
    y: 472,
    text: 'Jump + S / ↓ + SPACE   Ground Impact',
    subtext: 'Shatter weakened rune-slabs beneath your mass',
  },
];

export const WORLD_PROPS: RuinPropDef[] = [
  { x: 160, y: 840, kind: 'arch', scale: 1.05 },
  { x: 340, y: 840, kind: 'pillar', scale: 0.9 },
  { x: 700, y: 840, kind: 'statue', scale: 1.0 },
  { x: 960, y: 840, kind: 'pillar', scale: 1.1 },
  { x: 1580, y: 540, kind: 'arch', scale: 1.15 },
  { x: 1890, y: 540, kind: 'monolith', scale: 1.0 },
  { x: 2540, y: 540, kind: 'pillar', scale: 0.85 },
  { x: 3440, y: 540, kind: 'arch', scale: 1.3 },
  { x: 2350, y: 722, kind: 'pillar', scale: 0.95 },
  { x: 2880, y: 722, kind: 'statue', scale: 1.0 },
  { x: 2920, y: 1140, kind: 'roots', scale: 1.1 },
  { x: 3295, y: 1140, kind: 'arch', scale: 1.25 },
  { x: 3520, y: 1140, kind: 'roots', scale: 1.2 },
  { x: 3980, y: 1140, kind: 'monolith', scale: 1.2 },
];

export const CHAPTER_TRIGGERS: ChapterZoneTrigger[] = [
  {
    id: 'ch1_verge',
    chapter: 1,
    title: 'Chapter I — The Shattered Verge',
    subtitle: 'An Unfinished Outline Upon Ancient Stone',
    bounds: { x: 40, y: 650, width: 520, height: 260 },
  },
  {
    id: 'ch2_mechanism',
    chapter: 2,
    title: 'Chapter II — The Forgotten Mechanism',
    subtitle: 'Where Only the Weightless May Ascend',
    bounds: { x: 1470, y: 360, width: 460, height: 240 },
  },
  {
    id: 'ch3_crucible',
    chapter: 3,
    title: 'Chapter III — The First Remnant',
    subtitle: 'The Crucible of Mass',
    bounds: { x: 3240, y: 380, width: 340, height: 220 },
  },
  {
    id: 'ch4_changed_world',
    chapter: 4,
    title: 'Chapter IV — A Changed World',
    subtitle: 'The Sky Releases What the Earth Remembers',
    bounds: { x: 680, y: 700, width: 680, height: 200 },
    requiresWeight: true,
  },
  {
    id: 'ch5_first_choice',
    chapter: 5,
    title: 'Chapter V — The First Choice',
    subtitle: 'Cradle of First Names',
    bounds: { x: 2680, y: 960, width: 650, height: 240 },
    requiresWeight: true,
  },
];
