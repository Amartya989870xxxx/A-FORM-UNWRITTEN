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
  kind: 'arch' | 'pillar' | 'statue' | 'monolith' | 'roots' | 'brazier' | 'waterfall';
  scale?: number;
}

export interface ForegroundSilhouetteDef {
  x: number;
  y: number;
  kind: 'pillar_overhang' | 'broken_arch' | 'hanging_vines';
  scale: number;
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
 * Interconnected 6-area Chapter One layout of The Shattered Verge (WORLD_WIDTH = 5500).
 * Every platform height and horizontal span is tuned against PHYSICS_PROFILES
 * (Unanchored jump height ~139px + float/updraft vs. Grounded jump height ~117px).
 */
export const WORLD_PLATFORMS: PlatformDef[] = [
  // --- ZONE 1: THE WHISPERING PRECIPICE (Top y = 840) ---
  { id: 'p_z1_start', x: 245, y: 864, width: 490, height: 48, style: 'ground' },
  { id: 'p_z1_safety', x: 540, y: 936, width: 220, height: 28, style: 'floating' },
  { id: 'p_z1_courtyard', x: 870, y: 864, width: 560, height: 48, style: 'ground' },
  // Optional high sky-ledge for Echo Tablet I (reachable by floating left from main updraft)
  { id: 'p_z1_echo_ledge', x: 760, y: 652, width: 170, height: 24, style: 'floating' },

  // Sunken shaft steps (70 to 75px increments between y=840 and y=1140)
  { id: 'p_shaft_step_0', x: 1278, y: 864, width: 76, height: 24, style: 'ground' },
  { id: 'p_shaft_step_1', x: 1190, y: 927, width: 88, height: 24, style: 'sanctum' },
  { id: 'p_shaft_step_2', x: 1272, y: 1002, width: 88, height: 24, style: 'sanctum' },
  { id: 'p_shaft_step_3', x: 1190, y: 1077, width: 88, height: 24, style: 'sanctum' },
  // Right wall of shaft above gate_sunken_entry
  { id: 'p_shaft_wall_e', x: 1360, y: 900, width: 44, height: 160, style: 'sanctum' },

  // --- ZONE 2: THE FORGOTTEN MECHANISM (Main Top y = 540) ---
  { id: 'p_z2_observatory', x: 1720, y: 564, width: 520, height: 48, style: 'aqueduct' },
  // Wind-Spire Conduit Alignment floating islands & spires
  { id: 'p_z2_island_a', x: 2210, y: 510, width: 180, height: 28, style: 'floating' },
  { id: 'p_z2_north_spire', x: 2130, y: 314, width: 210, height: 28, style: 'floating' },
  { id: 'p_z2_island_b', x: 2540, y: 554, width: 230, height: 28, style: 'floating' },
  { id: 'p_z2_east_balcony', x: 2940, y: 374, width: 240, height: 28, style: 'floating' },
  // High Spire Overlook for Echo Tablet II
  { id: 'p_z2_echo_peak', x: 2560, y: 224, width: 170, height: 24, style: 'floating' },

  // Outer Spire Gate structure (x = 3210, opened by North + East Wind-Spire Conduits)
  { id: 'p_z2_spire_gate_floor', x: 3230, y: 564, width: 180, height: 48, style: 'aqueduct' },
  { id: 'p_z2_spire_gate_header', x: 3210, y: 260, width: 42, height: 280, style: 'aqueduct' },
  { id: 'p_z2_spire_gate_low', x: 3210, y: 632, width: 42, height: 92, style: 'aqueduct' },

  // --- ZONE 2.5: THE SHATTERED SKY-ARCH (x = 3320 .. 4120) ---
  { id: 'p_sky_span_1', x: 3470, y: 494, width: 155, height: 26, style: 'floating' },
  { id: 'p_sky_bell_arch', x: 3760, y: 344, width: 210, height: 28, style: 'floating' },
  { id: 'p_sky_span_2', x: 3955, y: 448, width: 145, height: 26, style: 'floating' },

  // Crucible Vault Entry Gate structure (x = 4120, opened by Aerial Resonance Bell)
  { id: 'p_z3_entry_plaza', x: 4120, y: 564, width: 200, height: 48, style: 'aqueduct' },
  { id: 'p_z3_vault_header', x: 4120, y: 220, width: 42, height: 360, style: 'aqueduct' },
  { id: 'p_z3_vault_pillar_low', x: 4120, y: 632, width: 42, height: 92, style: 'aqueduct' },

  // --- ZONE 3: THE CRUCIBLE OF MASS (Top y = 540, Dome Interior x = 4140 .. 4860) ---
  { id: 'p_z3_crucible_main', x: 4385, y: 564, width: 370, height: 48, style: 'aqueduct' },
  // Gap from x=4570..4730 holds FracturedSlab 'slab_crucible' (x=4650, y=554, width=160)
  { id: 'p_z3_east_cap', x: 4795, y: 564, width: 130, height: 48, style: 'aqueduct' },
  { id: 'p_z3_east_wall', x: 4872, y: 450, width: 44, height: 610, style: 'aqueduct' },

  // Interior Crucible Dome Galleries for the 3-Lock Stabilization Mechanism
  { id: 'p_z3_west_ledge', x: 4255, y: 444, width: 150, height: 24, style: 'floating' },
  { id: 'p_z3_east_ledge', x: 4795, y: 444, width: 116, height: 24, style: 'floating' },
  { id: 'p_z3_zenith_cupola', x: 4480, y: 276, width: 185, height: 24, style: 'floating' },

  // --- ZONE 4: ECHOING UNDERWALK / RETURN GALLERY (Top y = 722) ---
  { id: 'p_z4_gallery', x: 3165, y: 746, width: 3430, height: 48, style: 'aqueduct' },
  // Stairs from Return Gallery back up to Oren's Observatory (60px steps)
  { id: 'p_z4_oren_step_1', x: 1880, y: 674, width: 105, height: 24, style: 'aqueduct' },
  { id: 'p_z4_oren_step_2', x: 1785, y: 614, width: 105, height: 24, style: 'aqueduct' },
  // Terraced step connecting Return Gallery (722) westward down to Zone 1 Courtyard (840)
  { id: 'p_z4_return_step', x: 1395, y: 794, width: 120, height: 24, style: 'ground' },

  // --- ZONE 5: THE SUNKEN CAUSEWAY, SANCTUM & THRESHOLD (Floor Top y = 1140) ---
  { id: 'p_z5_floor_main', x: 3195, y: 1170, width: 4170, height: 60, style: 'sanctum' },
  { id: 'p_z5_west_wall', x: 1110, y: 1040, width: 44, height: 320, style: 'sanctum' },

  // Puzzle 2: Mezzanine steps leading over the calcified vault roof (68px steps)
  { id: 'p_z5_mez_step_1', x: 1580, y: 1084, width: 110, height: 24, style: 'sanctum' },
  { id: 'p_z5_mez_step_2', x: 1715, y: 1016, width: 150, height: 24, style: 'sanctum' },
  // Echo Tablet III alcove to the west of mezzanine
  { id: 'p_z5_echo_ledge', x: 1460, y: 970, width: 115, height: 22, style: 'sanctum' },
  // Vault left wall (forces player up mezzanine and through slab_sanctum via Ground Impact)
  { id: 'p_z5_vault_wall_w', x: 1840, y: 1072, width: 36, height: 136, style: 'sanctum' },
  { id: 'p_z5_vault_inner_step', x: 1882, y: 1084, width: 48, height: 20, style: 'sanctum' },
  // Gap x=1858..2018 at y=1016 holds FracturedSlab 'slab_sanctum'
  { id: 'p_z5_vault_roof_e', x: 2068, y: 1016, width: 100, height: 24, style: 'sanctum' },
  // Headers above gate_sanctum_mid (x=2100), gate_sanctum_final (x=2620), and gate_threshold (x=4180)
  { id: 'p_z5_ceiling_mid', x: 2100, y: 940, width: 40, height: 130, style: 'sanctum' },
  { id: 'p_z5_ceiling_final', x: 2620, y: 920, width: 44, height: 160, style: 'sanctum' },
  { id: 'p_z5_ceiling_thresh', x: 4180, y: 920, width: 44, height: 160, style: 'sanctum' },
];

export const WORLD_UPDRAFTS: UpdraftDef[] = [
  // Zone 1 main chasm updraft (carries Unanchored protagonist from y=840 to y=520)
  {
    id: 'updraft_chasm',
    x: 1295,
    y: 660,
    width: 175,
    height: 350,
    initiallyEnabled: true,
  },
  // Safety return updraft from Return Gallery (y=722) back to Observatory (y=540)
  {
    id: 'updraft_gallery_safety',
    x: 2045,
    y: 615,
    width: 115,
    height: 220,
    initiallyEnabled: true,
  },
  // Wind-Spire North Spire thermal
  {
    id: 'updraft_north_spire',
    x: 2270,
    y: 395,
    width: 115,
    height: 230,
    initiallyEnabled: true,
  },
  // Wind-Spire East Balcony thermal (activated by redirecting Wind Vane 'vane_east')
  {
    id: 'updraft_east_balcony',
    x: 2735,
    y: 385,
    width: 135,
    height: 340,
    initiallyEnabled: false,
  },
  // Safety thermal returning from Return Gallery (y=722) up to Shattered Sky-Arch entry (y=540)
  {
    id: 'updraft_sky_arch_return',
    x: 3315,
    y: 615,
    width: 120,
    height: 220,
    initiallyEnabled: true,
  },
  // Shattered Sky-Arch central thermal lifting toward the Aerial Resonance Bell
  {
    id: 'updraft_sky_arch',
    x: 3605,
    y: 395,
    width: 130,
    height: 255,
    initiallyEnabled: true,
  },
  // Crucible of Mass central dome thermal (ignited after West + East Crucible seals are released)
  {
    id: 'updraft_crucible_dome',
    x: 4370,
    y: 390,
    width: 125,
    height: 295,
    initiallyEnabled: false,
  },
];

export const WORLD_RUNE_SIGNS: RuneSignDef[] = [
  {
    x: 205,
    y: 742,
    text: 'A / D  or  Left / Right   Traverse',
    subtext: 'TAB: World Atlas     J: Journal     ESC: Pause',
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
    subtext: 'Unanchored garments rise within glowing currents',
  },
  {
    x: 3470,
    y: 416,
    text: 'Ring the Sky-Arch Bell to Unseal the Crucible Gate',
    subtext: 'Ride the high wind column across the broken span',
  },
  {
    x: 4480,
    y: 368,
    text: 'Release All Three Dome Seals to Uncage the Remnant',
    subtext: 'Jump + S / Down + SPACE shatters amber slabs once Grounded',
  },
];

export const WORLD_PROPS: RuinPropDef[] = [
  { x: 92, y: 840, kind: 'arch', scale: 1.0 },
  { x: 185, y: 840, kind: 'brazier', scale: 1.0 },
  { x: 350, y: 840, kind: 'pillar', scale: 0.92 },
  { x: 700, y: 840, kind: 'statue', scale: 1.0 },
  { x: 985, y: 840, kind: 'brazier', scale: 1.0 },
  { x: 1580, y: 540, kind: 'arch', scale: 1.15 },
  { x: 1740, y: 540, kind: 'brazier', scale: 1.0 },
  { x: 1940, y: 540, kind: 'monolith', scale: 1.0 },
  { x: 2210, y: 496, kind: 'waterfall', scale: 1.0 },
  { x: 2540, y: 540, kind: 'pillar', scale: 0.85 },
  { x: 2940, y: 360, kind: 'waterfall', scale: 1.15 },
  { x: 3260, y: 540, kind: 'brazier', scale: 0.95 },
  { x: 3760, y: 330, kind: 'waterfall', scale: 1.1 },
  { x: 4070, y: 540, kind: 'brazier', scale: 1.0 },
  { x: 4320, y: 540, kind: 'arch', scale: 1.25 },
  { x: 4580, y: 540, kind: 'brazier', scale: 1.05 },
  { x: 2350, y: 722, kind: 'pillar', scale: 0.95 },
  { x: 2880, y: 722, kind: 'statue', scale: 1.0 },
  { x: 3480, y: 722, kind: 'arch', scale: 1.08 },
  { x: 4180, y: 722, kind: 'brazier', scale: 0.95 },
  { x: 2820, y: 1140, kind: 'roots', scale: 1.1 },
  { x: 3060, y: 1140, kind: 'brazier', scale: 1.0 },
  { x: 3410, y: 1140, kind: 'arch', scale: 1.25 },
  { x: 3580, y: 1140, kind: 'roots', scale: 1.2 },
  { x: 3820, y: 1140, kind: 'brazier', scale: 1.05 },
  { x: 4560, y: 1140, kind: 'monolith', scale: 1.2 },
  { x: 4920, y: 1140, kind: 'brazier', scale: 1.1 },
];

/**
 * Foreground parallax silhouette frames (depth: 65, scrollFactorX: 1.14) placed
 * purely in open scenic transitions away from puzzle plates, blocks, and slabs.
 */
export const FOREGROUND_SILHOUETTES: ForegroundSilhouetteDef[] = [
  { x: 46, y: 1126, kind: 'pillar_overhang', scale: 0.94 },
  { x: 1520, y: 690, kind: 'hanging_vines', scale: 1.05 },
  { x: 3380, y: 680, kind: 'broken_arch', scale: 1.0 },
  { x: 4720, y: 1438, kind: 'pillar_overhang', scale: 1.04 },
];

export const CHAPTER_TRIGGERS: ChapterZoneTrigger[] = [
  {
    id: 'ch1_verge',
    chapter: 1,
    title: 'Chapter I: The Shattered Verge',
    subtitle: 'A Stabilizing Garment Upon Forgotten Stone',
    bounds: { x: 40, y: 650, width: 520, height: 260 },
  },
  {
    id: 'ch2_mechanism',
    chapter: 2,
    title: 'Chapter I: The Wind-Spires',
    subtitle: 'Where Only the Unanchored May Ascend',
    bounds: { x: 1470, y: 360, width: 460, height: 240 },
  },
  {
    id: 'ch3_crucible',
    chapter: 3,
    title: 'Chapter I: The Crucible of Mass',
    subtitle: 'Three Seals Guarding the First Anchor',
    bounds: { x: 4160, y: 360, width: 420, height: 240 },
  },
  {
    id: 'ch4_changed_world',
    chapter: 4,
    title: 'Chapter I: The Weight of Becoming',
    subtitle: 'The Sky Releases What the Earth Remembers',
    bounds: { x: 680, y: 700, width: 680, height: 200 },
    requiresWeight: true,
  },
  {
    id: 'ch5_first_choice',
    chapter: 5,
    title: 'Chapter I: Cradle of First Names',
    subtitle: 'The Memory Crucible Beneath the Verge',
    bounds: { x: 3360, y: 960, width: 650, height: 240 },
    requiresWeight: true,
  },
];
