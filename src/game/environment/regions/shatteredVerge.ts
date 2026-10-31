import type { ParallaxLayerDef, RegionDefinition } from '../types';
import {
  REGION_PRECIPICE,
  VERGE_HIGHLANDS_PARALLAX_LAYERS,
} from './vergeHighlands';

export const SHATTERED_VERGE_PARALLAX_LAYERS: ParallaxLayerDef[] = VERGE_HIGHLANDS_PARALLAX_LAYERS;
export { REGION_PRECIPICE };

export const REGION_SPIRES: RegionDefinition = {
  id: 'shattered_verge_spires',
  name: 'The Wind-Spires',
  biome: 'highland_spires',
  bounds: { x: 1450, y: 150, width: 1850, height: 550 },
  lightingProfile: 'outdoor',
  defaultTerrainSkin: 'floating',
  platformSkinOverrides: {
    p_z2_observatory: 'aqueduct',
    p_z2_spire_gate_floor: 'aqueduct',
    p_z2_spire_gate_header: 'aqueduct',
    p_z2_spire_gate_low: 'aqueduct',
  },
  parallaxLayers: SHATTERED_VERGE_PARALLAX_LAYERS,
  props: [
    { id: 'prop_s1', x: 1580, y: 540, kind: 'arch', scale: 1.15 },
    { id: 'prop_s2', x: 1740, y: 540, kind: 'brazier', scale: 1.0, hasLight: true },
    { id: 'prop_s3', x: 1940, y: 540, kind: 'monolith', scale: 1.0 },
    { id: 'prop_s4', x: 2210, y: 496, kind: 'waterfall', scale: 1.0 },
    { id: 'prop_s5', x: 2540, y: 540, kind: 'pillar', scale: 0.85 },
    { id: 'prop_s6', x: 2940, y: 360, kind: 'waterfall', scale: 1.15 },
    { id: 'prop_s7', x: 3260, y: 540, kind: 'brazier', scale: 0.95, hasLight: true },
  ],
  mistPlacements: [
    { x: 2480, y: 585, scaleX: 2.2, scaleY: 1.2, alpha: 0.38, speed: 0.28, amp: 64, depth: 13 },
  ],
  ambientParticleType: 'cyan',
};

export const REGION_SKY_ARCH: RegionDefinition = {
  id: 'shattered_verge_sky_arch',
  name: 'The Shattered Sky-Arch',
  biome: 'highland_spires',
  bounds: { x: 3300, y: 150, width: 850, height: 550 },
  lightingProfile: 'outdoor',
  defaultTerrainSkin: 'floating',
  platformSkinOverrides: {
    p_z3_entry_plaza: 'aqueduct',
    p_z3_vault_header: 'aqueduct',
    p_z3_vault_pillar_low: 'aqueduct',
  },
  parallaxLayers: SHATTERED_VERGE_PARALLAX_LAYERS,
  props: [
    { id: 'prop_sa1', x: 3760, y: 330, kind: 'waterfall', scale: 1.1 },
    { id: 'prop_sa2', x: 4070, y: 540, kind: 'brazier', scale: 1.0, hasLight: true },
  ],
  mistPlacements: [
    { x: 3680, y: 530, scaleX: 2.4, scaleY: 1.3, alpha: 0.48, speed: 0.36, amp: 70, depth: 13 },
  ],
  ambientParticleType: 'cyan',
};

export const REGION_CRUCIBLE: RegionDefinition = {
  id: 'shattered_verge_crucible',
  name: 'The Crucible of Mass',
  biome: 'ancient_ruins',
  bounds: { x: 4150, y: 150, width: 1350, height: 550 },
  lightingProfile: 'covered',
  defaultTerrainSkin: 'aqueduct',
  platformSkinOverrides: {
    p_z3_west_ledge: 'floating',
    p_z3_east_ledge: 'floating',
    p_z3_zenith_cupola: 'floating',
  },
  parallaxLayers: SHATTERED_VERGE_PARALLAX_LAYERS,
  props: [
    { id: 'prop_c1', x: 4320, y: 540, kind: 'arch', scale: 1.25 },
    { id: 'prop_c2', x: 4580, y: 540, kind: 'brazier', scale: 1.05, hasLight: true },
  ],
  mistPlacements: [
    { x: 4480, y: 558, scaleX: 1.9, scaleY: 1.1, alpha: 0.34, speed: 0.3, amp: 46, depth: 33 },
  ],
  ambientParticleType: 'gold',
};

export const REGION_UNDERWALK: RegionDefinition = {
  id: 'shattered_verge_underwalk',
  name: 'Echoing Underwalk',
  biome: 'underwalk',
  bounds: { x: 1350, y: 680, width: 3600, height: 320 },
  lightingProfile: 'covered',
  defaultTerrainSkin: 'aqueduct',
  platformSkinOverrides: {
    p_z4_return_step: 'ground',
  },
  parallaxLayers: SHATTERED_VERGE_PARALLAX_LAYERS,
  props: [
    { id: 'prop_u1', x: 2350, y: 722, kind: 'pillar', scale: 0.95 },
    { id: 'prop_u2', x: 2880, y: 722, kind: 'statue', scale: 1.0 },
    { id: 'prop_u3', x: 3480, y: 722, kind: 'arch', scale: 1.08 },
    { id: 'prop_u4', x: 4180, y: 722, kind: 'brazier', scale: 0.95, hasLight: true },
  ],
  mistPlacements: [],
  ambientParticleType: 'cyan',
};

export const REGION_SANCTUM: RegionDefinition = {
  id: 'shattered_verge_sanctum',
  name: 'Sunken Causeway & Sanctum',
  biome: 'sunken_sanctum',
  bounds: { x: 1050, y: 980, width: 4450, height: 440 },
  lightingProfile: 'underground',
  defaultTerrainSkin: 'sanctum',
  platformSkinOverrides: {},
  parallaxLayers: SHATTERED_VERGE_PARALLAX_LAYERS,
  props: [
    { id: 'prop_sc1', x: 2820, y: 1140, kind: 'roots', scale: 1.1 },
    { id: 'prop_sc2', x: 3060, y: 1140, kind: 'brazier', scale: 1.0, hasLight: true },
    { id: 'prop_sc3', x: 3410, y: 1140, kind: 'arch', scale: 1.25 },
    { id: 'prop_sc4', x: 3580, y: 1140, kind: 'roots', scale: 1.2 },
    { id: 'prop_sc5', x: 3820, y: 1140, kind: 'brazier', scale: 1.05, hasLight: true },
    { id: 'prop_sc6', x: 4560, y: 1140, kind: 'monolith', scale: 1.2 },
    { id: 'prop_sc7', x: 4920, y: 1140, kind: 'brazier', scale: 1.1, hasLight: true },
  ],
  mistPlacements: [
    { x: 3550, y: 1142, scaleX: 2.5, scaleY: 1.15, alpha: 0.36, speed: 0.25, amp: 60, depth: 33 },
  ],
  ambientParticleType: 'gold',
};

export const ALL_SHATTERED_VERGE_REGIONS: RegionDefinition[] = [
  REGION_PRECIPICE,
  REGION_SPIRES,
  REGION_SKY_ARCH,
  REGION_CRUCIBLE,
  REGION_UNDERWALK,
  REGION_SANCTUM,
];
