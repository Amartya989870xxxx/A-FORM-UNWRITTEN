import type Phaser from 'phaser';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import type { LightingController } from '../time/LightingController';
import type { RegionMistPlacement } from './types';

export class AtmosphereFX {
  private readonly scene: Phaser.Scene;
  private lightingController?: LightingController;
  private mistBands: Array<{
    sprite: Phaser.GameObjects.Image;
    baseX: number;
    speed: number;
    amp: number;
  }> = [];
  private particleEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  constructor(scene: Phaser.Scene, lightingController?: LightingController) {
    this.scene = scene;
    this.lightingController = lightingController;
  }

  public setLightingController(controller: LightingController): void {
    this.lightingController = controller;
  }

  public addMistBand(mp: RegionMistPlacement): Phaser.GameObjects.Image {
    const sprite = this.scene.add
      .image(mp.x, mp.y, 'tex_mist_band')
      .setScale(mp.scaleX, mp.scaleY)
      .setAlpha(mp.alpha)
      .setDepth(mp.depth);

    this.mistBands.push({
      sprite,
      baseX: mp.x,
      speed: mp.speed,
      amp: mp.amp,
    });

    if (this.lightingController) {
      this.lightingController.registerMistBand(sprite, mp.alpha);
    }

    return sprite;
  }

  public addAmbientMotes(
    type: 'cyan' | 'gold' | 'amber',
    bounds?: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    const minX = bounds?.minX ?? 60;
    const maxX = bounds?.maxX ?? WORLD_WIDTH - 100;
    const minY = bounds?.minY ?? 180;
    const maxY = bounds?.maxY ?? WORLD_HEIGHT - 80;

    const textureKey =
      type === 'gold'
        ? 'tex_mote_gold'
        : type === 'amber'
          ? 'tex_mote_amber'
          : 'tex_mote_cyan';

    const emitter = this.scene.add
      .particles(0, 0, textureKey, {
        x: { min: minX, max: maxX },
        y: { min: minY, max: maxY },
        speedY: { min: type === 'gold' ? -20 : -22, max: type === 'gold' ? -5 : -6 },
        speedX: { min: type === 'gold' ? -8 : -12, max: type === 'gold' ? 8 : 12 },
        scale: { start: type === 'gold' ? 0.36 : 0.34, end: 0 },
        alpha: { start: type === 'gold' ? 0.4 : 0.34, end: 0 },
        lifespan: type === 'gold' ? 4800 : 5400,
        frequency: type === 'gold' ? 120 : 105,
        blendMode: 'ADD',
      })
      .setDepth(12);

    this.particleEmitters.push(emitter);
  }

  public update(time: number): void {
    const t = time * 0.001;
    for (let i = 0; i < this.mistBands.length; i++) {
      const mb = this.mistBands[i];
      mb.sprite.x = mb.baseX + Math.sin(t * mb.speed + i * 1.4) * mb.amp;
    }
  }

  public clear(): void {
    for (const mb of this.mistBands) {
      mb.sprite.destroy();
    }
    this.mistBands = [];
    for (const em of this.particleEmitters) {
      em.destroy();
    }
    this.particleEmitters = [];
  }

  public destroy(): void {
    this.clear();
  }
}
