import Phaser from 'phaser';
import { SCENE_KEYS } from '../constants';
import { AudioManager } from '../systems/AudioManager';
import { ArtGenerator } from '../utils/ArtGenerator';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  public create(): void {
    ArtGenerator.generateAll(this);
    AudioManager.getInstance().init();
    this.scene.start(SCENE_KEYS.MENU);
  }
}

