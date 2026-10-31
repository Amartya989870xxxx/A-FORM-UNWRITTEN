export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const WORLD_WIDTH = 4700;
export const WORLD_HEIGHT = 1360;

export const SAVE_STORAGE_KEY = 'auf_save_v1';
export const AUDIO_PREF_KEY = 'auf_audio_muted_v1';

export const SCENE_KEYS = {
  BOOT: 'BootScene',
  MENU: 'MenuScene',
  AWAKENING: 'AwakeningScene',
  GAME: 'GameScene',
  ENDING: 'EndingScene',
} as const;

export const PALETTE = {
  VOID_DEEP: 0x080b16,
  SKY_TOP: 0x0c1022,
  SKY_MID: 0x19203d,
  SKY_HORIZON: 0x312a4a,
  MIST_TEAL: 0x3f6278,
  MIST_AMBER: 0x8b6748,

  STONE_DARK: 0x161b2e,
  STONE_BASE: 0x222942,
  STONE_LIGHT: 0x364163,
  STONE_HIGHLIGHT: 0x52618c,
  MOSS_TEAL: 0x2e5b68,

  ETHEREAL_CYAN: 0x7ee8fa,
  ETHEREAL_SOFT: 0xbef5ff,
  ETHEREAL_BLUE: 0x4ea5d9,

  REMNANT_GOLD: 0xe8a948,
  REMNANT_BRIGHT: 0xffd78a,
  REMNANT_BRONZE: 0x9c6828,

  IMPRINT_RESONANCE: 0xf28f79, // Warm rose-amber (Becoming)
  IMPRINT_RESOLVE: 0xb18cfe,   // Astral violet (Original Self)

  UI_BG: 0x0b0f1e,
  UI_PANEL: 0x12182d,
  UI_BORDER_CYAN: 0x58b8d1,
  UI_BORDER_GOLD: 0xd49b45,
  TEXT_LIGHT: '#e8edf9',
  TEXT_MUTED: '#9aa7c7',
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
  CHAPTER_CHANGED: 'chapter-changed',
  TOAST_MESSAGE: 'toast-message',
} as const;
