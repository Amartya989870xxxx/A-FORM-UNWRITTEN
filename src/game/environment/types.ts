export type BiomeKind =
  | 'ancient_ruins'
  | 'highland_spires'
  | 'underwalk'
  | 'sunken_sanctum'
  | 'forest'
  | 'city'
  | 'desert'
  | 'mountain'
  | 'coastal';

export type TerrainSkinId =
  | 'ground'
  | 'floating'
  | 'aqueduct'
  | 'sanctum'
  | 'grass'
  | 'soil'
  | 'limestone'
  | 'stone_paving'
  | 'rocky_outcrop'
  | 'sand'
  | 'underground_masonry';

export type LightingProfile = 'outdoor' | 'covered' | 'underground' | 'interior';

export interface AtmosphereProfile {
  fogDensityMultiplier?: number;
  fogColorOverride?: number;
  localLightMultiplier?: number;
  ambientBrightnessModifier?: number;
}

export interface ParallaxLayerDef {
  id: string;
  textureKey: string;
  depth: number;
  scrollFactorX: number;
  scrollFactorY: number;
  alpha: number;
  baseY: number;
  height?: number;
  tintBand?: 'far' | 'mid' | 'near' | 'none';
}

export type PropKind =
  | 'arch'
  | 'pillar'
  | 'statue'
  | 'monolith'
  | 'roots'
  | 'brazier'
  | 'waterfall'
  | 'grass_tuft'
  | 'banner'
  | 'lantern'
  | 'rock_cluster'
  | 'wind_chimes'
  | 'stone_lantern'
  | 'statue_fragment'
  | 'wildflowers'
  | 'ivy_overhang';

export interface PropPlacement {
  id: string;
  x: number;
  y: number;
  kind: PropKind;
  scale?: number;
  depth?: number;
  sway?: boolean;
  hasLight?: boolean;
  textureKey?: string;
}

export interface RegionMistPlacement {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
  speed: number;
  amp: number;
  depth: number;
}

export interface RegionDefinition {
  id: string;
  name: string;
  biome: BiomeKind;
  bounds: { x: number; y: number; width: number; height: number };
  lightingProfile: LightingProfile;
  atmosphereProfile?: AtmosphereProfile;
  defaultTerrainSkin: TerrainSkinId;
  platformSkinOverrides?: Record<string, TerrainSkinId>;
  parallaxLayers?: ParallaxLayerDef[];
  props: PropPlacement[];
  mistPlacements?: RegionMistPlacement[];
  ambientParticleType?: 'cyan' | 'gold' | 'amber' | 'none';
}
