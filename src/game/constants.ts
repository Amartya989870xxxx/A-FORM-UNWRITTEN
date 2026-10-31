export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;
export const WORLD_CAMERA_ZOOM = 1.42;

export const WORLD_WIDTH = 5500;
export const WORLD_HEIGHT = 1420;

export const SAVE_STORAGE_KEY = 'auf_save_v1';
export const SETTINGS_STORAGE_KEY = 'auf_settings_v1';
export const AUDIO_PREF_KEY = 'auf_audio_muted_v1';

export const DEFAULT_PLAYER_NAME = 'The Unwritten';

export type AdventurerRank = 'G' | 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export type SoulAffinityKey =
  | 'azure'
  | 'verdant'
  | 'amber'
  | 'crimson'
  | 'violet'
  | 'silver';

export const SCENE_KEYS = {
  BOOT: 'BootScene',
  MENU: 'MenuScene',
  AWAKENING: 'AwakeningScene',
  GAME: 'GameScene',
  ENDING: 'EndingScene',
} as const;

export const PALETTE = {
  VOID_DEEP: 0x070a14,
  SKY_TOP: 0x090d1e,
  SKY_MID: 0x161f3d,
  SKY_HORIZON: 0x352c4d,
  HORIZON_PEACH: 0xd99b66,
  MIST_TEAL: 0x456b84,
  MIST_LAVENDER: 0x7b78a6,
  MIST_AMBER: 0x9c7248,

  // Stabilizing Garment canonical palette (charcoal, dark ash, parchment lining, antique gold)
  GARMENT_CHARCOAL: 0x19191f,
  GARMENT_DARK_ASH: 0x28272f,
  GARMENT_MID_ASH: 0x3a3842,
  GARMENT_LINING: 0x8d867e,
  GARMENT_SILVER_CREST: 0xcfd3df,
  GARMENT_GOLD_SEAM: 0xe6ac4c,
  GARMENT_GOLD_BRIGHT: 0xffe099,

  STONE_DARK: 0x131829,
  STONE_BASE: 0x202840,
  STONE_MID: 0x2c3654,
  STONE_LIGHT: 0x414f75,
  STONE_HIGHLIGHT: 0x62739e,
  MOSS_TEAL: 0x2d5e6b,
  BRAZIER_FLAME: 0xffb347,
  BRAZIER_GLOW: 0xe8833a,

  ETHEREAL_CYAN: 0x7ee8fa,
  ETHEREAL_SOFT: 0xbef5ff,
  ETHEREAL_BLUE: 0x4ea5d9,

  REMNANT_GOLD: 0xe8a948,
  REMNANT_BRIGHT: 0xffd78a,
  REMNANT_BRONZE: 0x9c6828,

  IMPRINT_RESONANCE: 0xf28f79,
  IMPRINT_RESOLVE: 0xb18cfe,

  UI_BG: 0x0a0e1c,
  UI_PANEL: 0x12182d,
  UI_PARCHMENT_DARK: 0x171b2b,
  UI_BORDER_CYAN: 0x58b8d1,
  UI_BORDER_GOLD: 0xd49b45,
  TEXT_LIGHT: '#edf1fc',
  TEXT_MUTED: '#9ca9c9',
  TEXT_CYAN: '#8be9fd',
  TEXT_GOLD: '#f3be6b',
  TEXT_ROSE: '#f5a391',
  TEXT_VIOLET: '#c5a8ff',
} as const;

export const PHYSICS_PROFILES = {
  UNBOUND: {
    gravityY: 620,
    moveSpeed: 245,
    acceleration: 1550,
    dragX: 1350,
    airDragX: 750,
    jumpVelocity: -415,
    floatMaxFallSpeed: 58,
    normalMaxFallSpeed: 420,
    updraftLiftAcceleration: -1650,
    updraftMaxRiseSpeed: -295,
    canFloat: true,
    canUseUpdraft: true,
    canGroundImpact: false,
    canActivateHeavyPlates: false,
    canPushHeavyBlocks: false,
  },
  GROUNDED: {
    gravityY: 1180,
    moveSpeed: 235,
    acceleration: 1850,
    dragX: 1750,
    airDragX: 1050,
    jumpVelocity: -525,
    floatMaxFallSpeed: 640,
    normalMaxFallSpeed: 640,
    updraftLiftAcceleration: 0,
    updraftMaxRiseSpeed: 0,
    canFloat: false,
    canUseUpdraft: false,
    canGroundImpact: true,
    canActivateHeavyPlates: true,
    canPushHeavyBlocks: true,
  },
} as const;

export const GAME_EVENTS = {
  QUEST_UPDATED: 'quest-updated',
  REMNANT_RESTORED: 'remnant-restored',
  IMPRINT_ACQUIRED: 'imprint-acquired',
  ECHO_DISCOVERED: 'echo-discovered',
  RELIC_ACQUIRED: 'relic-acquired',
  LOCATION_DISCOVERED: 'location-discovered',
  CHAPTER_CHANGED: 'chapter-changed',
  TOAST_MESSAGE: 'toast-message',
} as const;
