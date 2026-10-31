import Phaser from 'phaser';
import bgFarUrl from '../../assets/environments/verge_highlands/bg_highland_far.webp';
import bgMidUrl from '../../assets/environments/verge_highlands/bg_highland_mid.webp';
import bgNearUrl from '../../assets/environments/verge_highlands/bg_highland_near.webp';
import fgOverhangUrl from '../../assets/environments/verge_highlands/fg_highland_overhang.png';
import propStatueFragmentUrl from '../../assets/environments/verge_highlands/prop_statue_fragment.png';
import propStoneLanternUrl from '../../assets/environments/verge_highlands/prop_stone_lantern.png';
import propWildflowersUrl from '../../assets/environments/verge_highlands/prop_wildflowers.png';
import propWindChimesUrl from '../../assets/environments/verge_highlands/prop_wind_chimes.png';
import terrainGroundUrl from '../../assets/environments/verge_highlands/terrain_highland_ground.png';
import terrainRockyOutcropUrl from '../../assets/environments/verge_highlands/terrain_rocky_outcrop.png';
import terrainStonePavingUrl from '../../assets/environments/verge_highlands/terrain_stone_paving.png';
import { SCENE_KEYS } from '../constants';
import { AudioManager } from '../systems/AudioManager';
import { ArtGenerator } from '../utils/ArtGenerator';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  public preload(): void {
    // Phase 3: Load illustrated highland assets
    this.load.image('tex_highland_far', bgFarUrl);
    this.load.image('tex_highland_mid', bgMidUrl);
    this.load.image('tex_highland_near', bgNearUrl);
    this.load.image('tex_highland_fg', fgOverhangUrl);
    this.load.image('tex_prop_wind_chimes', propWindChimesUrl);
    this.load.image('tex_prop_stone_lantern', propStoneLanternUrl);
    this.load.image('tex_prop_statue_fragment', propStatueFragmentUrl);
    this.load.image('tex_prop_wildflowers', propWildflowersUrl);
    this.load.image('tex_terrain_highland_ground', terrainGroundUrl);
    this.load.image('tex_terrain_stone_paving', terrainStonePavingUrl);
    this.load.image('tex_terrain_rocky_outcrop', terrainRockyOutcropUrl);
  }

  public create(): void {
    ArtGenerator.generateAll(this);
    AudioManager.getInstance().init();
    this.scene.start(SCENE_KEYS.MENU);
  }
}
