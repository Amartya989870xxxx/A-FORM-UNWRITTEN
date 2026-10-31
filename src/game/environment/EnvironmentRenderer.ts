import type Phaser from 'phaser';
import { PALETTE } from '../constants';
import type { ForegroundSilhouetteDef, PlatformDef } from '../data/world';
import type { LightingController } from '../time/LightingController';
import { AtmosphereFX } from './AtmosphereFX';
import { EnvironmentZones } from './EnvironmentZones';
import { ParallaxLayer } from './ParallaxLayer';
import { PropPlacer } from './PropPlacer';
import { TerrainSkinner } from './TerrainSkinner';
import { ALL_SHATTERED_VERGE_REGIONS, SHATTERED_VERGE_PARALLAX_LAYERS } from './regions/shatteredVerge';
import type { RegionDefinition, TerrainSkinId } from './types';

export interface EnvironmentRendererConfig {
  scene: Phaser.Scene;
  lightingController?: LightingController;
  regions?: RegionDefinition[];
}

export class EnvironmentRenderer {
  private readonly scene: Phaser.Scene;
  private readonly zones: EnvironmentZones;
  private lightingController?: LightingController;

  private parallaxLayers: ParallaxLayer[] = [];
  private terrainGraphics?: Phaser.GameObjects.Graphics;
  private foregroundGraphics?: Phaser.GameObjects.Graphics;
  private propPlacer?: PropPlacer;
  private atmosphereFX?: AtmosphereFX;
  private legacyMode = false;
  private active = false;

  constructor(config: EnvironmentRendererConfig) {
    this.scene = config.scene;
    this.lightingController = config.lightingController;
    const initialRegions = config.regions ?? ALL_SHATTERED_VERGE_REGIONS;
    this.zones = new EnvironmentZones(initialRegions);

    this.legacyMode = this.checkLegacyUrlParam();
  }

  public isLegacyMode(): boolean {
    return this.legacyMode;
  }

  public setLightingController(controller: LightingController): void {
    this.lightingController = controller;
    this.propPlacer?.setLightingController(controller);
    this.atmosphereFX?.setLightingController(controller);
    if (this.parallaxLayers.length > 0) {
      const far = this.parallaxLayers.find((l) => l.def.id === 'shattered_verge_far')?.getTileSprite();
      const mid = this.parallaxLayers.find((l) => l.def.id === 'shattered_verge_mid')?.getTileSprite();
      const near = this.parallaxLayers.find((l) => l.def.id === 'shattered_verge_near')?.getTileSprite();
      controller.setParallaxLayers(far, mid, near);
    }
  }

  public getZones(): EnvironmentZones {
    return this.zones;
  }

  public getParallaxLayers(): ParallaxLayer[] {
    return [...this.parallaxLayers];
  }

  public init(platforms: PlatformDef[], silhouettes: ForegroundSilhouetteDef[]): void {
    if (this.legacyMode) {
      this.active = false;
      return;
    }

    this.active = true;

    // 1. Build decorative Parallax Layers
    this.parallaxLayers = SHATTERED_VERGE_PARALLAX_LAYERS.map(
      (def) => new ParallaxLayer(this.scene, def)
    );

    if (this.lightingController) {
      const far = this.parallaxLayers.find((l) => l.def.id === 'shattered_verge_far')?.getTileSprite();
      const mid = this.parallaxLayers.find((l) => l.def.id === 'shattered_verge_mid')?.getTileSprite();
      const near = this.parallaxLayers.find((l) => l.def.id === 'shattered_verge_near')?.getTileSprite();
      this.lightingController.setParallaxLayers(far, mid, near);
    }

    // 2. Initialize PropPlacer & AtmosphereFX
    this.propPlacer = new PropPlacer(this.scene, this.lightingController);
    this.atmosphereFX = new AtmosphereFX(this.scene, this.lightingController);

    // 3. Render Terrain skins over each platform collider rectangle
    this.terrainGraphics = this.scene.add.graphics().setDepth(16);
    this.renderPlatforms(platforms);

    // 4. Place Region Props & Mist
    const regions = this.zones.getAllRegions();
    for (const reg of regions) {
      if (reg.props.length > 0) {
        this.propPlacer.placeProps(reg.props);
      }
      if (reg.mistPlacements) {
        for (const mp of reg.mistPlacements) {
          this.atmosphereFX.addMistBand(mp);
        }
      }
    }

    // 5. Ambient World Motes
    this.atmosphereFX.addAmbientMotes('cyan', { minX: 60, maxX: 5400, minY: 180, maxY: 1340 });
    this.atmosphereFX.addAmbientMotes('gold', { minX: 1400, maxX: 5360, minY: 320, maxY: 1160 });

    // 6. Foreground depth silhouettes (depth: 65, scrollFactorX: 1.14)
    this.buildForegroundDepth(silhouettes);
  }

  public update(time: number, _delta: number, camera: Phaser.Cameras.Scene2D.Camera): void {
    if (!this.active || this.legacyMode) return;

    // Update Parallax tile positions
    for (const layer of this.parallaxLayers) {
      layer.update(camera.scrollX, camera.scrollY);
    }

    // Update animated props (brazier flames, waterfalls, swaying vegetation)
    this.propPlacer?.update(time);

    // Update drifting mist bands
    this.atmosphereFX?.update(time);
  }

  public destroy(): void {
    for (const layer of this.parallaxLayers) {
      layer.destroy();
    }
    this.parallaxLayers = [];

    this.terrainGraphics?.destroy();
    this.foregroundGraphics?.destroy();
    this.propPlacer?.destroy();
    this.atmosphereFX?.destroy();
    this.active = false;
  }

  private renderPlatforms(platforms: PlatformDef[]): void {
    if (!this.terrainGraphics) return;

    for (const p of platforms) {
      const skin = this.resolvePlatformSkin(p);
      TerrainSkinner.renderPlatform(this.terrainGraphics, p.x, p.y, p.width, p.height, skin);
    }
  }

  private resolvePlatformSkin(p: PlatformDef): TerrainSkinId {
    // Find primary region for platform center
    const region = this.zones.getPrimaryRegion(p.x, p.y);
    if (region.platformSkinOverrides && region.platformSkinOverrides[p.id]) {
      return region.platformSkinOverrides[p.id];
    }
    if (p.style) {
      return p.style;
    }
    return region.defaultTerrainSkin;
  }

  private buildForegroundDepth(silhouettes: ForegroundSilhouetteDef[]): void {
    this.foregroundGraphics = this.scene.add
      .graphics()
      .setDepth(65)
      .setScrollFactor(1.14, 1)
      .setAlpha(0.46);

    for (const item of silhouettes) {
      const s = item.scale;
      if (item.kind === 'pillar_overhang') {
        this.foregroundGraphics.fillStyle(0x070a15, 0.92);
        this.foregroundGraphics.fillRect(item.x - 24 * s, item.y - 260 * s, 48 * s, 320 * s);
        this.foregroundGraphics.fillRoundedRect(item.x - 36 * s, item.y - 270 * s, 72 * s, 20 * s, 4);
        this.foregroundGraphics.lineStyle(1, PALETTE.STONE_HIGHLIGHT, 0.24);
        this.foregroundGraphics.strokeRect(item.x - 24 * s, item.y - 260 * s, 48 * s, 320 * s);
      } else if (item.kind === 'broken_arch') {
        this.foregroundGraphics.fillStyle(0x070a15, 0.9);
        this.foregroundGraphics.fillRect(item.x - 22 * s, item.y - 220 * s, 44 * s, 260 * s);
        this.foregroundGraphics.beginPath();
        this.foregroundGraphics.moveTo(item.x - 22 * s, item.y - 210 * s);
        this.foregroundGraphics.lineTo(item.x + 85 * s, item.y - 250 * s);
        this.foregroundGraphics.lineTo(item.x + 70 * s, item.y - 215 * s);
        this.foregroundGraphics.closePath();
        this.foregroundGraphics.fillPath();
      } else if (item.kind === 'hanging_vines') {
        this.foregroundGraphics.lineStyle(3.2, 0x090d1b, 0.88);
        for (let i = -2; i <= 2; i++) {
          this.foregroundGraphics.beginPath();
          this.foregroundGraphics.moveTo(item.x + i * 22, item.y - 280);
          this.foregroundGraphics.lineTo(item.x + i * 19 + 7, item.y - 190);
          this.foregroundGraphics.lineTo(item.x + i * 24 - 4, item.y - 125 - Math.abs(i) * 14);
          this.foregroundGraphics.strokePath();
        }
      }
    }
  }

  private checkLegacyUrlParam(): boolean {
    return isLegacyEnvironmentMode();
  }
}

export function isLegacyEnvironmentMode(searchQuery?: string): boolean {
  if (typeof searchQuery === 'string') {
    const params = new URLSearchParams(searchQuery);
    return params.get('env')?.toLowerCase() === 'legacy';
  }
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('env')?.toLowerCase() === 'legacy';
  } catch {
    return false;
  }
}
