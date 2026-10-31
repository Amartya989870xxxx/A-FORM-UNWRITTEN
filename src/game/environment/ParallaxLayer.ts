import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, WORLD_CAMERA_ZOOM } from '../constants';
import type { ParallaxLayerDef } from './types';

export class ParallaxLayer {
  public readonly def: ParallaxLayerDef;
  private readonly tileSprite: Phaser.GameObjects.TileSprite;

  constructor(scene: Phaser.Scene, def: ParallaxLayerDef) {
    this.def = def;

    const invZoom = 1 / WORLD_CAMERA_ZOOM;
    const toCamScreenY = (screenY: number) =>
      GAME_HEIGHT / 2 + (screenY - GAME_HEIGHT / 2) * invZoom;

    const h = def.height ?? 680;
    const yPos = toCamScreenY(def.baseY);

    let textureKey = def.textureKey;
    if (scene.textures && typeof scene.textures.exists === 'function') {
      if (!scene.textures.exists(textureKey)) {
        if (def.id.includes('far') && scene.textures.exists('tex_parallax_far')) {
          textureKey = 'tex_parallax_far';
        } else if (def.id.includes('mid') && scene.textures.exists('tex_parallax_mid')) {
          textureKey = 'tex_parallax_mid';
        } else if (def.id.includes('near') && scene.textures.exists('tex_parallax_near')) {
          textureKey = 'tex_parallax_near';
        }
      }
    }

    this.tileSprite = scene.add
      .tileSprite(GAME_WIDTH / 2, yPos, GAME_WIDTH, h, textureKey)
      .setScrollFactor(0)
      .setScale(invZoom)
      .setDepth(def.depth)
      .setAlpha(def.alpha);
  }

  public getTileSprite(): Phaser.GameObjects.TileSprite {
    return this.tileSprite;
  }

  public setTint(colorHex: number): void {
    this.tileSprite.setTint(colorHex);
  }

  public setAlpha(alpha: number): void {
    this.tileSprite.setAlpha(alpha);
  }

  public setVisible(visible: boolean): void {
    this.tileSprite.setVisible(visible);
  }

  public update(camScrollX: number, camScrollY = 0): void {
    this.tileSprite.tilePositionX = camScrollX * this.def.scrollFactorX;
    if (this.def.scrollFactorY !== 0) {
      this.tileSprite.tilePositionY = camScrollY * this.def.scrollFactorY;
    }
  }

  public destroy(): void {
    this.tileSprite.destroy();
  }
}
