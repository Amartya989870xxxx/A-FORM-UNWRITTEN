import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { SettingsManager, type AtmosphereMode, type GameSettings } from '../systems/SettingsManager';
import { ArtGenerator } from '../utils/ArtGenerator';
import { TimeOfDayService } from './TimeOfDayService';
import type { AtmospherePhase, AtmosphereState } from './atmospherePresets';

export interface LocalLightDef {
  x: number;
  y: number;
  baseRadius: number;
  baseIntensity: number;
  flickerSpeed?: number;
}

export interface RegisteredMistBand {
  sprite: Phaser.GameObjects.Image;
  baseAlpha: number;
}

export interface LightingControllerConfig {
  scene: Phaser.Scene;
  skyImage: Phaser.GameObjects.Image;
  parallaxFar?: Phaser.GameObjects.TileSprite;
  parallaxMid?: Phaser.GameObjects.TileSprite;
  parallaxNear?: Phaser.GameObjects.TileSprite;
  vignetteImage?: Phaser.GameObjects.Image;
}

export class LightingController {
  private readonly scene: Phaser.Scene;
  private settings: GameSettings;
  private currentFraction = 0;
  private currentState: AtmosphereState;
  private overridePhase: AtmospherePhase | null = null;

  // Visual handles
  private readonly skyImage: Phaser.GameObjects.Image;
  private readonly parallaxFar?: Phaser.GameObjects.TileSprite;
  private readonly parallaxMid?: Phaser.GameObjects.TileSprite;
  private readonly parallaxNear?: Phaser.GameObjects.TileSprite;
  private readonly vignetteImage?: Phaser.GameObjects.Image;

  private starsImage!: Phaser.GameObjects.Image;
  private sunSprite!: Phaser.GameObjects.Image;
  private moonSprite!: Phaser.GameObjects.Image;
  private horizonGlow!: Phaser.GameObjects.Graphics;
  private gradeOverlay!: Phaser.GameObjects.Rectangle;

  private mistBands: RegisteredMistBand[] = [];
  private localLights: Array<{
    sprite: Phaser.GameObjects.Image;
    baseScale: number;
    baseIntensity: number;
    flickerSpeed: number;
    seed: number;
  }> = [];

  // Throttling for dynamic sky texture repaint
  private lastSkyRepaintTime = 0;
  private lastAtmosphereUpdateTime = 0;
  private lastRepaintFraction = -1;
  private gameElapsedSeconds = 0;
  private needsImmediateUpdate = true;

  constructor(config: LightingControllerConfig) {
    this.scene = config.scene;
    this.skyImage = config.skyImage;
    this.parallaxFar = config.parallaxFar;
    this.parallaxMid = config.parallaxMid;
    this.parallaxNear = config.parallaxNear;
    this.vignetteImage = config.vignetteImage;

    this.settings = SettingsManager.load();
    this.overridePhase = TimeOfDayService.parseUrlAtmosphereOverride();

    this.currentFraction = TimeOfDayService.calculateDayFraction(
      new Date(),
      this.settings,
      0,
      this.overridePhase
    );
    this.currentState = TimeOfDayService.sampleAtmosphere(this.currentFraction);

    this.buildAtmosphericElements();
    this.applyAtmosphereState(this.currentState, true);
  }

  public getRootUiObjects(): Phaser.GameObjects.GameObject[] {
    return [this.gradeOverlay];
  }

  public getCurrentState(): AtmosphereState {
    return { ...this.currentState };
  }

  public getCurrentPhase(): AtmospherePhase {
    return this.currentState.phase;
  }

  public getDayFraction(): number {
    return this.currentFraction;
  }

  public getSettings(): GameSettings {
    return { ...this.settings };
  }

  public setAtmosphereMode(mode: AtmosphereMode, fixedPhase?: AtmospherePhase): void {
    const updated = SettingsManager.save({
      atmosphereMode: mode,
      ...(fixedPhase ? { fixedPhase } : {}),
    });
    this.settings = updated;
    this.overridePhase = null;
    this.recomputeAndApply(true);
  }

  public setFixedPhase(phase: AtmospherePhase): void {
    const updated = SettingsManager.save({
      atmosphereMode: 'fixed',
      fixedPhase: phase,
    });
    this.settings = updated;
    this.overridePhase = null;
    this.recomputeAndApply(true);
  }

  public forcePhase(phase: AtmospherePhase | null): void {
    this.overridePhase = phase;
    this.recomputeAndApply(true);
  }

  public registerMistBand(sprite: Phaser.GameObjects.Image, baseAlpha: number): void {
    this.mistBands.push({ sprite, baseAlpha });
    sprite.setTint(this.currentState.fogColor);
    sprite.setAlpha(baseAlpha * (this.currentState.fogAlpha / 0.35));
  }

  public registerLocalLight(def: LocalLightDef): Phaser.GameObjects.Image {
    const s = this.scene.add
      .image(def.x, def.y, 'tex_light_cookie')
      .setDepth(14)
      .setBlendMode(Phaser.BlendModes.ADD);

    const baseScale = (def.baseRadius * 2) / 160;
    const flickerSpeed = def.flickerSpeed ?? 3.5;
    const seed = Math.random() * 100;

    s.setScale(baseScale);
    s.setAlpha(def.baseIntensity * this.currentState.localLightMultiplier);

    this.localLights.push({
      sprite: s,
      baseScale,
      baseIntensity: def.baseIntensity,
      flickerSpeed,
      seed,
    });

    return s;
  }

  public update(time: number, delta: number): void {
    this.gameElapsedSeconds += delta * 0.001;

    // Throttle atmosphere evaluation to ~4 times per second unless immediate update requested
    const timeSinceLastUpdate = time - this.lastAtmosphereUpdateTime;
    if (this.needsImmediateUpdate || timeSinceLastUpdate >= 250) {
      this.needsImmediateUpdate = false;
      this.lastAtmosphereUpdateTime = time;

      const fraction = TimeOfDayService.calculateDayFraction(
        new Date(),
        this.settings,
        this.gameElapsedSeconds,
        this.overridePhase
      );

      const fractionDelta =
        this.lastRepaintFraction < 0 ? 1 : Math.abs(fraction - this.lastRepaintFraction);
      const timeSinceLastRepaint = time - this.lastSkyRepaintTime;

      this.currentFraction = fraction;
      this.currentState = TimeOfDayService.sampleAtmosphere(fraction);

      // Repaint dynamic sky texture only on significant phase change or interval
      const forceRepaint = fractionDelta > 0.004 || timeSinceLastRepaint >= 1200;
      this.applyAtmosphereState(this.currentState, forceRepaint);

      if (forceRepaint) {
        this.lastSkyRepaintTime = time;
        this.lastRepaintFraction = fraction;
      }
    }

    // Flicker local lights naturally at low cost
    const sec = time * 0.001;
    for (let i = 0; i < this.localLights.length; i++) {
      const l = this.localLights[i];
      const flicker = 1.0 + Math.sin(sec * l.flickerSpeed + l.seed) * 0.06;
      l.sprite.setAlpha(Math.min(1.0, l.baseIntensity * this.currentState.localLightMultiplier * flicker));
    }
  }

  private buildAtmosphericElements(): void {
    const invZoom = 1 / 1.42;
    const toCamScreenX = (sx: number) => GAME_WIDTH / 2 + (sx - GAME_WIDTH / 2) * invZoom;
    const toCamScreenY = (sy: number) => GAME_HEIGHT / 2 + (sy - GAME_HEIGHT / 2) * invZoom;

    // Stars layer
    this.starsImage = this.scene.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'tex_stars_layer')
      .setScrollFactor(0)
      .setScale(invZoom)
      .setDepth(0.2)
      .setAlpha(this.currentState.starsAlpha);

    // Horizon glow graphics
    this.horizonGlow = this.scene.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(0.3);

    // Sun sprite
    this.sunSprite = this.scene.add
      .image(
        toCamScreenX(GAME_WIDTH * this.currentState.sunXPercent),
        toCamScreenY(GAME_HEIGHT * this.currentState.sunYPercent),
        'tex_celestial_sun'
      )
      .setScrollFactor(0)
      .setScale(invZoom * this.currentState.sunScale)
      .setDepth(0.4)
      .setAlpha(this.currentState.sunAlpha);

    // Moon sprite
    this.moonSprite = this.scene.add
      .image(
        toCamScreenX(GAME_WIDTH * this.currentState.moonXPercent),
        toCamScreenY(GAME_HEIGHT * this.currentState.moonYPercent),
        'tex_celestial_moon'
      )
      .setScrollFactor(0)
      .setScale(invZoom * this.currentState.moonScale)
      .setDepth(0.5)
      .setAlpha(this.currentState.moonAlpha);

    // Screen color grade overlay (scaled to main camera zoom, ignored by UI camera)
    this.gradeOverlay = this.scene.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH * invZoom + 60,
        GAME_HEIGHT * invZoom + 60,
        this.currentState.gradeColor,
        this.currentState.gradeAlpha
      )
      .setScrollFactor(0)
      .setDepth(85)
      .setVisible(this.currentState.gradeAlpha > 0.01);
  }

  private recomputeAndApply(forceRepaint: boolean): void {
    this.currentFraction = TimeOfDayService.calculateDayFraction(
      new Date(),
      this.settings,
      this.gameElapsedSeconds,
      this.overridePhase
    );
    this.currentState = TimeOfDayService.sampleAtmosphere(this.currentFraction);
    this.applyAtmosphereState(this.currentState, forceRepaint);
  }

  private applyAtmosphereState(state: AtmosphereState, repaintSky: boolean): void {
    const invZoom = 1 / 1.42;
    const toCamScreenX = (sx: number) => GAME_WIDTH / 2 + (sx - GAME_WIDTH / 2) * invZoom;
    const toCamScreenY = (sy: number) => GAME_HEIGHT / 2 + (sy - GAME_HEIGHT / 2) * invZoom;

    // 1. Dynamic sky gradient texture
    if (repaintSky) {
      ArtGenerator.updateSkyDynamic(
        this.scene,
        'tex_sky_dynamic',
        state.skyTop,
        state.skyMid,
        state.skyBottom
      );
      if (this.skyImage.texture.key !== 'tex_sky_dynamic') {
        this.skyImage.setTexture('tex_sky_dynamic');
      }
      this.skyImage.setDisplaySize(GAME_WIDTH * invZoom, GAME_HEIGHT * invZoom);
    }

    // 2. Stars (only render when visible)
    const showStars = state.starsAlpha > 0.02;
    this.starsImage.setVisible(showStars);
    if (showStars) {
      this.starsImage.setAlpha(state.starsAlpha);
    }

    // 3. Sun position and alpha
    const showSun = state.sunAlpha > 0.02;
    this.sunSprite.setVisible(showSun);
    if (showSun) {
      this.sunSprite.setPosition(
        toCamScreenX(GAME_WIDTH * state.sunXPercent),
        toCamScreenY(GAME_HEIGHT * state.sunYPercent)
      );
      this.sunSprite.setAlpha(state.sunAlpha);
      this.sunSprite.setScale(invZoom * state.sunScale);
      this.sunSprite.setTint(state.sunColor);
    }

    // 4. Moon position and alpha
    const showMoon = state.moonAlpha > 0.02;
    this.moonSprite.setVisible(showMoon);
    if (showMoon) {
      this.moonSprite.setPosition(
        toCamScreenX(GAME_WIDTH * state.moonXPercent),
        toCamScreenY(GAME_HEIGHT * state.moonYPercent)
      );
      this.moonSprite.setAlpha(state.moonAlpha);
      this.moonSprite.setScale(invZoom * state.moonScale);
    }

    // 5. Horizon warm glow wash
    const showGlow = state.horizonGlowAlpha > 0.02;
    this.horizonGlow.setVisible(showGlow);
    if (showGlow) {
      this.horizonGlow.clear();
      const hgH = GAME_HEIGHT * invZoom * 0.5;
      const hgY = GAME_HEIGHT / 2 + (GAME_HEIGHT * 0.52 - GAME_HEIGHT / 2) * invZoom;
      this.horizonGlow.fillGradientStyle(
        state.horizonGlowColor,
        state.horizonGlowColor,
        state.horizonGlowColor,
        state.horizonGlowColor,
        0,
        0,
        state.horizonGlowAlpha,
        state.horizonGlowAlpha
      );
      this.horizonGlow.fillRect(
        GAME_WIDTH / 2 - (GAME_WIDTH * invZoom + 60) / 2,
        hgY,
        GAME_WIDTH * invZoom + 60,
        hgH
      );
    }

    // 6. Parallax layers tinting
    if (this.parallaxFar) {
      this.parallaxFar.setTint(state.layerFarTint);
    }
    if (this.parallaxMid) {
      this.parallaxMid.setTint(state.layerMidTint);
    }
    if (this.parallaxNear) {
      this.parallaxNear.setTint(state.layerNearTint);
    }

    // 7. Mist bands tinting and density
    for (let i = 0; i < this.mistBands.length; i++) {
      const mb = this.mistBands[i];
      mb.sprite.setTint(state.fogColor);
      mb.sprite.setAlpha(mb.baseAlpha * Math.min(1.2, state.fogAlpha / 0.32));
    }

    // 8. Grade overlay & Vignette
    const showGrade = state.gradeAlpha > 0.02;
    this.gradeOverlay.setVisible(showGrade);
    if (showGrade) {
      this.gradeOverlay.setFillStyle(state.gradeColor, state.gradeAlpha);
    }
    if (this.vignetteImage) {
      this.vignetteImage.setAlpha(state.vignetteAlpha);
    }
  }
}
