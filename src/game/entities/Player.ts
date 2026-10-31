import Phaser from 'phaser';
import { PALETTE, PHYSICS_PROFILES } from '../constants';
import { AudioManager } from '../systems/AudioManager';
import type { ImprintId } from '../systems/SaveManager';

export type PlayerAnimState =
  | 'idle'
  | 'run'
  | 'jump'
  | 'float'
  | 'fall'
  | 'ground_impact'
  | 'interact'
  | 'restoring';

export interface PlayerInputSnapshot {
  left: boolean;
  right: boolean;
  down: boolean;
  jumpJustPressed: boolean;
  jumpHeld: boolean;
  jumpJustReleased: boolean;
}

/**
 * Playable protagonist rendered canonically as the Stabilizing Garment:
 * layered charcoal and dark-ash robes, parchment-lined flowing mantle,
 * antique gold waist-ring clasp, kintsugi-gold seams, and a completely
 * concealed void face beneath swept silver-ash garment folds.
 * No exposed human anatomy or cyan astral body is ever shown in gameplay.
 */
export class Player {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly scene: Phaser.Scene;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly auraEmitter: Phaser.GameObjects.Particles.ParticleEmitter;

  private hasWeight = false;
  private imprint: ImprintId | null = null;
  private animState: PlayerAnimState = 'idle';
  private facing: 1 | -1 = 1;

  // Responsive platforming timers (ms)
  private coyoteTimerMs = 0;
  private jumpBufferMs = 0;
  private wasOnGround = false;
  private inUpdraft = false;

  // Ground impact state
  private isGroundImpacting = false;
  private impactWindupMs = 0;
  private onGroundImpactCallback?: (x: number, y: number) => void;

  // Visual animation state
  private walkCycle = 0;
  private footstepAccum = 0;
  private floatSoundAccum = 0;
  private landingSquash = 0;
  private interactPulseMs = 0;
  private restoringProgress = 0;
  private controlsLocked = false;
  private cloakTrail: Array<{ x: number; y: number }> = [];

  // Safe respawn memory for immortal reformation
  private lastSafeX: number;
  private lastSafeY: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    initialHasWeight = false,
    initialImprint: ImprintId | null = null
  ) {
    this.scene = scene;
    this.lastSafeX = x;
    this.lastSafeY = y;
    this.hasWeight = initialHasWeight;
    this.imprint = initialImprint;

    this.sprite = scene.physics.add.sprite(x, y, 'tex_pixel');
    this.sprite.setAlpha(0); // Rendered procedurally on this.gfx
    this.sprite.setSize(24, 52);
    this.sprite.setOffset(-10, -24);
    this.sprite.setCollideWorldBounds(true);

    this.gfx = scene.add.graphics();
    this.gfx.setDepth(30);

    for (let i = 0; i < 7; i++) {
      this.cloakTrail.push({ x, y });
    }

    this.auraEmitter = scene.add.particles(0, 0, 'tex_mote_gold', {
      x: { min: -11, max: 11 },
      y: { min: -20, max: 18 },
      speedY: { min: -24, max: -6 },
      speedX: { min: -9, max: 9 },
      scale: { start: 0.28, end: 0 },
      alpha: { start: 0.42, end: 0 },
      lifespan: 1050,
      frequency: initialHasWeight ? 155 : 115,
      blendMode: 'ADD',
    });
    this.auraEmitter.setDepth(29);
    this.auraEmitter.startFollow(this.sprite);

    this.applyPhysicsProfile();
  }

  public setOnGroundImpact(cb: (x: number, y: number) => void): void {
    this.onGroundImpactCallback = cb;
  }

  public setInUpdraft(active: boolean): void {
    this.inUpdraft = active;
  }

  public setControlsLocked(locked: boolean): void {
    this.controlsLocked = locked;
    if (locked && this.sprite.body) {
      const body = this.sprite.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX(0);
      body.setAccelerationX(0);
    }
  }

  public isControlsLocked(): boolean {
    return this.controlsLocked;
  }

  public getHasWeight(): boolean {
    return this.hasWeight;
  }

  public isFloating(): boolean {
    return this.animState === 'float';
  }

  public isPerformingGroundImpact(): boolean {
    return this.isGroundImpacting;
  }

  public setImprint(imprint: ImprintId | null): void {
    this.imprint = imprint;
  }

  public triggerInteractAnim(): void {
    this.interactPulseMs = 340;
  }

  public setRestoringVisual(active: boolean, progress = 0): void {
    if (active) {
      this.animState = 'restoring';
      this.restoringProgress = progress;
    } else if (this.animState === 'restoring') {
      this.animState = 'idle';
      this.restoringProgress = 0;
    }
  }

  public applyWeightRestoration(hasWeight: boolean): void {
    this.hasWeight = hasWeight;
    this.isGroundImpacting = false;
    this.impactWindupMs = 0;
    this.applyPhysicsProfile();

    this.auraEmitter.setTexture('tex_mote_gold');
    this.auraEmitter.setFrequency(hasWeight ? 155 : 115);
  }

  public recordSafePosition(x: number, y: number): void {
    this.lastSafeX = x;
    this.lastSafeY = y;
  }

  public respawnAtLastSafe(): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.sprite.setPosition(this.lastSafeX, this.lastSafeY - 6);
    body.setVelocity(0, 0);
    body.setAcceleration(0, 0);
    this.isGroundImpacting = false;
    this.landingSquash = 0.25;
  }

  private applyPhysicsProfile(): void {
    const profile = this.hasWeight ? PHYSICS_PROFILES.GROUNDED : PHYSICS_PROFILES.UNBOUND;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setGravityY(profile.gravityY);
    body.setMaxVelocity(profile.moveSpeed, profile.normalMaxFallSpeed);
  }

  public update(time: number, delta: number, input: PlayerInputSnapshot): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const profile = this.hasWeight ? PHYSICS_PROFILES.GROUNDED : PHYSICS_PROFILES.UNBOUND;
    const onGround = body.blocked.down || body.touching.down;

    // Detect landing
    if (onGround && !this.wasOnGround) {
      if (this.isGroundImpacting) {
        this.isGroundImpacting = false;
        this.impactWindupMs = 0;
        this.landingSquash = 0.45;
        body.setMaxVelocity(profile.moveSpeed, profile.normalMaxFallSpeed);
        AudioManager.getInstance().playGroundImpact();
        this.emitLandingBurst(true);
        this.onGroundImpactCallback?.(this.sprite.x, this.sprite.y + 26);
      } else {
        this.landingSquash = this.hasWeight ? 0.26 : 0.14;
        AudioManager.getInstance().playLand(this.hasWeight);
        if (this.hasWeight) {
          this.emitLandingBurst(false);
        }
      }
    }

    if (onGround) {
      this.coyoteTimerMs = 115;
    } else {
      this.coyoteTimerMs = Math.max(0, this.coyoteTimerMs - delta);
    }

    if (input.jumpJustPressed && !this.controlsLocked) {
      this.jumpBufferMs = 125;
    } else {
      this.jumpBufferMs = Math.max(0, this.jumpBufferMs - delta);
    }

    if (this.interactPulseMs > 0) {
      this.interactPulseMs = Math.max(0, this.interactPulseMs - delta);
    }
    if (this.landingSquash > 0) {
      this.landingSquash = Math.max(0, this.landingSquash - delta * 0.0014);
    } else if (this.landingSquash < 0) {
      this.landingSquash = Math.min(0, this.landingSquash + delta * 0.0018);
    }

    if (this.controlsLocked) {
      body.setAccelerationX(0);
      body.setDragX(profile.dragX);
      if (this.animState !== 'restoring') {
        this.animState = onGround ? 'idle' : 'fall';
      }
      this.updateCloakTrail(time, body.velocity.x, body.velocity.y);
      this.render(time, onGround);
      this.wasOnGround = onGround;
      return;
    }

    // Ground Impact windup & plunge (Grounded State only)
    if (this.isGroundImpacting) {
      body.setVelocityX(0);
      body.setAccelerationX(0);
      if (this.impactWindupMs > 0) {
        this.impactWindupMs -= delta;
        body.setVelocityY(-20);
      } else {
        body.setMaxVelocity(profile.moveSpeed, 920);
        body.setVelocityY(860);
      }
      this.animState = 'ground_impact';
      this.updateCloakTrail(time, body.velocity.x, body.velocity.y);
      this.render(time, onGround);
      this.wasOnGround = onGround;
      return;
    }

    // Trigger Ground Impact: S / Down + Space while airborne after Weight stabilization
    if (
      !onGround &&
      profile.canGroundImpact &&
      input.down &&
      (input.jumpJustPressed || this.jumpBufferMs > 0) &&
      !this.isGroundImpacting
    ) {
      this.isGroundImpacting = true;
      this.impactWindupMs = 85;
      this.jumpBufferMs = 0;
      body.setVelocity(0, 0);
      this.animState = 'ground_impact';
      this.updateCloakTrail(time, body.velocity.x, body.velocity.y);
      this.render(time, onGround);
      this.wasOnGround = onGround;
      return;
    }

    // Horizontal movement
    const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (moveDir !== 0) {
      this.facing = moveDir as 1 | -1;
      body.setAccelerationX(moveDir * profile.acceleration);
      body.setDragX(onGround ? profile.dragX : profile.airDragX);
    } else {
      body.setAccelerationX(0);
      body.setDragX(onGround ? profile.dragX : profile.airDragX);
    }

    // Jump execution (supports coyote time + jump buffer)
    if (this.jumpBufferMs > 0 && this.coyoteTimerMs > 0) {
      body.setVelocityY(profile.jumpVelocity);
      this.jumpBufferMs = 0;
      this.coyoteTimerMs = 0;
      this.landingSquash = -0.18;
      AudioManager.getInstance().playJump(this.hasWeight);
    }

    // Variable jump height cut (ignore sub-frame press+release on initial jump tick)
    if (
      !input.jumpJustPressed &&
      input.jumpJustReleased &&
      body.velocity.y < -130 &&
      !this.inUpdraft
    ) {
      body.setVelocityY(body.velocity.y * 0.56);
    }

    // Floating & Updraft lift (Unanchored State only)
    let activelyFloating = false;
    if (profile.canFloat && this.inUpdraft && profile.canUseUpdraft && input.jumpHeld) {
      const startVy = onGround ? Math.min(body.velocity.y, -140) : body.velocity.y;
      const nextVy = Math.max(
        profile.updraftMaxRiseSpeed,
        startVy + (profile.updraftLiftAcceleration * delta) / 1000
      );
      body.setVelocityY(nextVy);
      body.setMaxVelocity(profile.moveSpeed * 1.08, profile.normalMaxFallSpeed);
      activelyFloating = true;
    } else if (!onGround && profile.canFloat) {
      if (this.inUpdraft && profile.canUseUpdraft) {
        const nextVy = Math.min(body.velocity.y, 38);
        body.setVelocityY(nextVy);
        activelyFloating = true;
      } else if (input.jumpHeld && body.velocity.y > 0) {
        body.setMaxVelocity(profile.moveSpeed * 1.05, profile.floatMaxFallSpeed);
        if (body.velocity.y > profile.floatMaxFallSpeed) {
          body.setVelocityY(profile.floatMaxFallSpeed);
        }
        activelyFloating = true;
      } else {
        body.setMaxVelocity(profile.moveSpeed, profile.normalMaxFallSpeed);
      }
    } else {
      body.setMaxVelocity(profile.moveSpeed, profile.normalMaxFallSpeed);
    }

    if (activelyFloating) {
      this.floatSoundAccum += delta;
      if (this.floatSoundAccum > 420) {
        this.floatSoundAccum = 0;
        AudioManager.getInstance().playFloatPulse();
      }
    } else {
      this.floatSoundAccum = 250;
    }

    // Walk cycle & footsteps
    if (onGround && Math.abs(body.velocity.x) > 28) {
      this.walkCycle += (delta * Math.abs(body.velocity.x)) / 1450;
      this.footstepAccum += delta;
      const stepInterval = this.hasWeight ? 310 : 390;
      if (this.footstepAccum >= stepInterval) {
        this.footstepAccum = 0;
        AudioManager.getInstance().playFootstep(this.hasWeight);
      }
    } else {
      this.footstepAccum = 180;
    }

    // Resolve animation state
    if (this.interactPulseMs > 0) {
      this.animState = 'interact';
    } else if (activelyFloating) {
      this.animState = 'float';
    } else if (!onGround) {
      if (body.velocity.y < -20) {
        this.animState = 'jump';
      } else {
        this.animState = 'fall';
      }
    } else if (Math.abs(body.velocity.x) > 22) {
      this.animState = 'run';
    } else {
      this.animState = 'idle';
    }

    this.updateCloakTrail(time, body.velocity.x, body.velocity.y);
    this.render(time, onGround);
    this.wasOnGround = onGround;
  }

  private emitLandingBurst(impact: boolean): void {
    const tex = impact ? 'tex_mote_gold' : 'tex_mote_dust';
    const emitter = this.scene.add.particles(this.sprite.x, this.sprite.y + 24, tex, {
      speedX: { min: impact ? -190 : -75, max: impact ? 190 : 75 },
      speedY: { min: impact ? -140 : -55, max: -10 },
      scale: { start: impact ? 0.65 : 0.35, end: 0 },
      alpha: { start: 0.85, end: 0 },
      lifespan: impact ? 540 : 340,
      quantity: impact ? 22 : 8,
      emitting: false,
    });
    emitter.setDepth(31);
    emitter.explode(impact ? 22 : 8);
    this.scene.time.delayedCall(620, () => emitter.destroy());

    if (impact) {
      const ring = this.scene.add.graphics();
      ring.setDepth(31);
      ring.lineStyle(3, PALETTE.REMNANT_BRIGHT, 0.9);
      ring.strokeCircle(this.sprite.x, this.sprite.y + 22, 14);
      this.scene.tweens.add({
        targets: ring,
        scaleX: 4.5,
        scaleY: 1.8,
        alpha: 0,
        duration: 420,
        onUpdate: () => {
          ring.clear();
          ring.lineStyle(2.5, PALETTE.REMNANT_GOLD, ring.alpha);
          ring.strokeEllipse(this.sprite.x, this.sprite.y + 24, 95 * (1.2 - ring.alpha * 0.5), 24);
        },
        onComplete: () => ring.destroy(),
      });
    }
  }

  private updateCloakTrail(time: number, vx: number, vy: number): void {
    const t = time * 0.001;
    const isFloating = this.animState === 'float';
    const shoulderX = this.sprite.x - this.facing * 4;
    const shoulderY = this.sprite.y - 10;

    if (
      this.cloakTrail.length > 1 &&
      Math.hypot(shoulderX - this.cloakTrail[1].x, shoulderY - this.cloakTrail[1].y) > 85
    ) {
      for (let i = 0; i < this.cloakTrail.length; i++) {
        this.cloakTrail[i] = {
          x: shoulderX - this.facing * i * 4.5,
          y: shoulderY + i * 3.5,
        };
      }
      return;
    }

    this.cloakTrail[0] = { x: shoulderX, y: shoulderY };

    const windBillow = isFloating ? 9.5 : !this.hasWeight ? 6.2 : 4.8;
    const verticalLift = isFloating
      ? 2.2
      : vy > 120
        ? -2.8
        : vy < -80
          ? 6.0
          : 4.4;

    for (let i = 1; i < this.cloakTrail.length; i++) {
      const prev = this.cloakTrail[i - 1];
      const cur = this.cloakTrail[i];
      const flutter = Math.sin(t * (isFloating ? 8.5 : 4.2) + i * 0.9) * (isFloating ? 2.6 : 1.2);
      const targetX = prev.x - this.facing * windBillow - vx * 0.015 + flutter;
      const targetY = prev.y + verticalLift;
      cur.x += (targetX - cur.x) * 0.36;
      cur.y += (targetY - cur.y) * 0.36;
    }
  }

  private render(time: number, onGround: boolean): void {
    this.gfx.clear();
    const x = this.sprite.x;
    const y = this.sprite.y;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const vx = body.velocity.x;
    const vy = body.velocity.y;
    const t = time * 0.001;

    if (this.animState === 'restoring') {
      this.renderStabilizationRite(x, y, t, onGround);
    } else {
      this.renderStabilizingGarment(x, y, vx, vy, t, onGround, this.hasWeight);
    }
  }

  private renderStabilizationRite(x: number, y: number, t: number, onGround: boolean): void {
    const p = Phaser.Math.Clamp(this.restoringProgress, 0, 1);
    const radius = 42 * (1 - p * 0.42);

    // Kintsugi gold stabilization halo drawing threads tighter into the garment
    this.gfx.fillStyle(PALETTE.GARMENT_GOLD_SEAM, 0.16 + p * 0.2);
    this.gfx.fillCircle(x, y - 4, radius + Math.sin(t * 12) * 3.5);
    this.gfx.lineStyle(1.6, PALETTE.GARMENT_GOLD_BRIGHT, 0.78);
    this.gfx.strokeEllipse(x, y + 18, 52 * (1 - p * 0.3), 14);

    for (let i = 0; i < 8; i++) {
      const a = t * 4.6 + (i * Math.PI) / 4;
      const dist = (1 - p) * 42 + 6;
      const fx = x + Math.cos(a) * dist;
      const fy = y - 4 + Math.sin(a) * dist * 0.72;
      this.gfx.fillStyle(PALETTE.GARMENT_GOLD_BRIGHT, 0.92);
      this.gfx.fillCircle(fx, fy, 2.8);
    }

    this.renderStabilizingGarment(x, y - (1 - p) * 6, 0, 0, t, onGround, p >= 0.6);
  }

  /**
   * Canonical side-view Stabilizing Garment renderer.
   * Both Unanchored and Grounded states wear the same mysterious charcoal-and-gold
   * garment with concealed face and zero human skin; Unanchored hovers weightlessly
   * with billowing mantle hems, whereas Grounded plants firmly with heavy stride and
   * intensified gold kintsugi seams.
   */
  private renderStabilizingGarment(
    x: number,
    y: number,
    vx: number,
    vy: number,
    t: number,
    onGround: boolean,
    anchored: boolean
  ): void {
    const f = this.facing;
    const isFloating = this.animState === 'float';
    const isRunning = this.animState === 'run';
    const isImpacting = this.animState === 'ground_impact';

    // Subtle unmoored drift when Unanchored vs planted breathing when Grounded
    const hoverOffset = anchored
      ? 0
      : onGround
        ? -2.2 + Math.sin(t * 2.9) * 1.6
        : Math.sin(t * 3.4) * 1.8;

    const squashY = 1 - this.landingSquash * 0.3;
    const stretchX = 1 + this.landingSquash * 0.18;
    const lean = Phaser.Math.Clamp(vx * 0.022, -5.5, 5.5);
    const breath = Math.sin(t * 2.5) * 0.9;
    const cy = y + hoverOffset;

    // 1. Ground-contact shadow (soft diffused shadow when Unanchored, crisp dark contact shadow when Grounded)
    if (onGround) {
      const shadowW = anchored ? 28 * stretchX : 22;
      const shadowAlpha = anchored ? 0.46 : 0.22;
      this.gfx.fillStyle(0x05070f, shadowAlpha);
      this.gfx.fillEllipse(x, y + 25.5, shadowW, anchored ? 6.5 : 5);
    }

    // 2. Ground Impact golden-amber kinetic shroud
    if (isImpacting) {
      this.gfx.fillStyle(PALETTE.GARMENT_GOLD_SEAM, 0.24);
      this.gfx.fillEllipse(x, cy - 4, 32, 60);
      this.gfx.lineStyle(2.2, PALETTE.GARMENT_GOLD_BRIGHT, 0.88);
      this.gfx.strokeEllipse(x, cy - 2, 24, 52);
    }

    // 3. Optional Imprint subtle halo behind cowl (never overrides the garment)
    if (this.imprint === 'resonance') {
      this.gfx.fillStyle(PALETTE.IMPRINT_RESONANCE, 0.14);
      this.gfx.fillCircle(x, cy - 10, 23 + Math.sin(t * 2.8) * 1.8);
    } else if (this.imprint === 'resolve') {
      this.gfx.lineStyle(1.4, PALETTE.IMPRINT_RESOLVE, 0.48);
      this.gfx.strokeCircle(x, cy - 18, 13.5 + Math.sin(t * 2.4));
    }

    // 4. Flowing Multi-Layered Mantle (Parchment-ash inner lining + Charcoal outer cloak + Gold kintsugi hem)
    this.renderFlowingMantle(x, cy, f, t, isFloating, anchored);

    // 5. Glider mantle spread wings when actively floating in Unanchored State
    if (isFloating) {
      const spread = 21 + Math.sin(t * 8.2) * 2.8;
      // Parchment inner lining fan
      this.gfx.fillStyle(PALETTE.GARMENT_LINING, 0.72);
      this.gfx.beginPath();
      this.gfx.moveTo(x - spread, cy - 6);
      this.gfx.lineTo(x, cy - 13);
      this.gfx.lineTo(x + spread * 0.82, cy - 5);
      this.gfx.lineTo(x + spread * 0.48, cy + 9);
      this.gfx.lineTo(x - spread * 0.65, cy + 10);
      this.gfx.closePath();
      this.gfx.fillPath();

      // Charcoal outer mantle rib & gold seam
      this.gfx.lineStyle(2.4, PALETTE.GARMENT_CHARCOAL, 0.95);
      this.gfx.beginPath();
      this.gfx.moveTo(x - spread, cy - 6);
      this.gfx.lineTo(x, cy - 13);
      this.gfx.lineTo(x + spread * 0.82, cy - 5);
      this.gfx.strokePath();

      this.gfx.lineStyle(1.2, PALETTE.GARMENT_GOLD_SEAM, 0.85);
      this.gfx.beginPath();
      this.gfx.moveTo(x - spread * 0.9, cy - 4);
      this.gfx.lineTo(x, cy - 11);
      this.gfx.lineTo(x + spread * 0.74, cy - 3);
      this.gfx.strokePath();
    }

    // 6. Cloth-wrapped Greaves & Boots (no bare skin; garment shapes the stride)
    const cycle = this.walkCycle * 6.5;
    const strideFront = isRunning
      ? Math.sin(cycle) * (anchored ? 8.2 : 6.4)
      : !onGround
        ? f * 2.5
        : 0;
    const strideBack = isRunning
      ? -strideFront
      : !onGround
        ? -f * 2.2
        : 0;
    const liftFront = isRunning ? Math.max(0, -Math.cos(cycle) * 4.2) : !onGround ? 3.2 : 0;
    const liftBack = isRunning ? Math.max(0, Math.cos(cycle) * 4.2) : !onGround ? 1.5 : 0;

    const hipY = cy + 5 * squashY;
    const footBaseY = anchored ? y + 24.8 : cy + 23.5;

    // Back wrapped leg
    const backFootX = x - f * 2.5 + strideBack;
    const backFootY = footBaseY - liftBack;
    this.gfx.lineStyle(4.6, 0x121217, 0.98);
    this.gfx.beginPath();
    this.gfx.moveTo(x - f * 2, hipY);
    this.gfx.lineTo(backFootX, backFootY);
    this.gfx.strokePath();

    // Front wrapped leg + antique gold kintsugi shin-binding
    const frontFootX = x + f * 2.5 + strideFront;
    const frontFootY = footBaseY - liftFront;
    this.gfx.lineStyle(5, PALETTE.GARMENT_CHARCOAL, 1);
    this.gfx.beginPath();
    this.gfx.moveTo(x + f * 2, hipY);
    this.gfx.lineTo(frontFootX, frontFootY);
    this.gfx.strokePath();

    // Tapered dark-ash cloth boot cuff
    this.gfx.fillStyle(PALETTE.GARMENT_DARK_ASH, 1);
    this.gfx.fillRoundedRect(frontFootX - 3, frontFootY - 4, 7.5 * (f === 1 ? 1 : 0.9), 4.5, 1.5);

    this.gfx.lineStyle(1.2, PALETTE.GARMENT_GOLD_SEAM, anchored ? 0.9 : 0.62);
    this.gfx.beginPath();
    this.gfx.moveTo(x + f * 2 + strideFront * 0.45, (hipY + frontFootY) * 0.52);
    this.gfx.lineTo(frontFootX, frontFootY - 2);
    this.gfx.strokePath();

    // 7. Split Longcoat Skirt / Lower Robe Panels with Parchment Underlayer & Gold Seams
    const tailSway = Phaser.Math.Clamp(-vx * 0.025, -7, 7) + Math.sin(t * 3.8) * (anchored ? 1.1 : 2.4);
    const tailLift = Phaser.Math.Clamp(-vy * 0.015, -5, 4);
    const hemY = hipY + 14.5 + tailLift * 0.4;

    // Inner parchment-ash robe panel peek
    this.gfx.fillStyle(PALETTE.GARMENT_LINING, 0.85);
    this.gfx.beginPath();
    this.gfx.moveTo(x - 5, hipY);
    this.gfx.lineTo(x + 5, hipY);
    this.gfx.lineTo(x + 6 + tailSway * 0.6, hemY - 2);
    this.gfx.lineTo(x - 6 + tailSway * 0.6, hemY - 2);
    this.gfx.closePath();
    this.gfx.fillPath();

    // Outer charcoal split coat-tails (back panel & front angled panel)
    this.gfx.fillStyle(PALETTE.GARMENT_CHARCOAL, 0.98);
    this.gfx.beginPath();
    this.gfx.moveTo(x - 7.5 * stretchX, hipY - 1);
    this.gfx.lineTo(x + 7.5 * stretchX, hipY - 1);
    this.gfx.lineTo(x + 9.5 + tailSway, hemY);
    this.gfx.lineTo(x + f * 1.5 + tailSway * 0.5, hemY - 4.5);
    this.gfx.lineTo(x - 9.5 + tailSway, hemY + 1);
    this.gfx.closePath();
    this.gfx.fillPath();

    // Gold kintsugi fracture seam tracing down the front coat-tail
    const seamAlpha = anchored ? 0.92 : 0.68 + Math.sin(t * 4.2) * 0.16;
    this.gfx.lineStyle(1.3, PALETTE.GARMENT_GOLD_SEAM, seamAlpha);
    this.gfx.beginPath();
    this.gfx.moveTo(x + f * 3.5, hipY + 1);
    this.gfx.lineTo(x + f * 5.2 + tailSway * 0.5, hipY + 7);
    this.gfx.lineTo(x + f * 4.2 + tailSway * 0.8, hemY - 1.5);
    this.gfx.strokePath();

    // 8. Layered Charcoal & Dark-Ash Upper Robe Torso
    const torsoTop = cy - (13.5 - breath * 0.35) * squashY;
    const shoulderW = 9.8 * stretchX;

    this.gfx.fillStyle(PALETTE.GARMENT_DARK_ASH, 1);
    this.gfx.lineStyle(1.2, PALETTE.GARMENT_MID_ASH, 0.8);
    this.gfx.beginPath();
    this.gfx.moveTo(x - shoulderW + lean * 0.4, torsoTop);
    this.gfx.lineTo(x + shoulderW + lean * 0.4, torsoTop);
    this.gfx.lineTo(x + shoulderW * 0.76, hipY + 1);
    this.gfx.lineTo(x - shoulderW * 0.76, hipY + 1);
    this.gfx.closePath();
    this.gfx.fillPath();
    this.gfx.strokePath();

    // Cross-wrapped charcoal lapel & diagonal kintsugi gold chest seam
    this.gfx.fillStyle(PALETTE.GARMENT_CHARCOAL, 1);
    this.gfx.beginPath();
    this.gfx.moveTo(x - shoulderW * 0.85 + lean * 0.4, torsoTop + 1);
    this.gfx.lineTo(x + f * 4 + lean * 0.3, torsoTop + 1);
    this.gfx.lineTo(x - f * 3, hipY);
    this.gfx.lineTo(x - shoulderW * 0.75, hipY);
    this.gfx.closePath();
    this.gfx.fillPath();

    this.gfx.lineStyle(1.45, PALETTE.GARMENT_GOLD_BRIGHT, seamAlpha);
    this.gfx.beginPath();
    this.gfx.moveTo(x - f * 5 + lean * 0.35, torsoTop + 2.5);
    this.gfx.lineTo(x + f * 1.2 + lean * 0.3, cy - 3.5);
    this.gfx.lineTo(x + f * 5.8 + lean * 0.25, torsoTop + 5.5);
    this.gfx.strokePath();

    // 9. Antique Gold Waist-Ring Clasp & Sash (signature detail from playable-garment-reference.png)
    this.gfx.fillStyle(0x141318, 1);
    this.gfx.fillRect(x - shoulderW * 0.78, hipY - 2.6, shoulderW * 1.56, 4.2);

    const ringX = x + f * 2.4 + lean * 0.2;
    const ringY = hipY - 0.5;
    this.gfx.lineStyle(1.8, PALETTE.GARMENT_GOLD_BRIGHT, 0.96);
    this.gfx.strokeCircle(ringX, ringY, 3.1);

    // Hanging gold-tipped sash ribbon from waist-ring
    this.gfx.lineStyle(1.5, PALETTE.GARMENT_GOLD_SEAM, 0.85);
    this.gfx.beginPath();
    this.gfx.moveTo(ringX, ringY + 3);
    this.gfx.lineTo(ringX + tailSway * 0.45, ringY + 10.5);
    this.gfx.strokePath();

    // 10. Draped Foreground Cloth Sleeve (reacts to run, float, and interact)
    const interactReach = this.animState === 'interact' ? 7.5 : 0;
    const armSwing = isRunning ? -Math.sin(cycle) * 5.2 : isFloating ? 4.5 : 0;
    const sleeveEndX = x + f * (4.5 + interactReach) + armSwing + lean * 0.3;
    const sleeveEndY =
      this.animState === 'interact'
        ? cy - 4
        : isFloating
          ? cy - 5
          : cy + 3.5;

    this.gfx.fillStyle(PALETTE.GARMENT_CHARCOAL, 0.98);
    this.gfx.beginPath();
    this.gfx.moveTo(x + lean * 0.35, torsoTop + 2);
    this.gfx.lineTo(sleeveEndX + f * 2.5, sleeveEndY - 2);
    this.gfx.lineTo(sleeveEndX - f * 2.2, sleeveEndY + 4.5);
    this.gfx.lineTo(x - f * 3 + lean * 0.3, torsoTop + 7);
    this.gfx.closePath();
    this.gfx.fillPath();

    this.gfx.lineStyle(1.25, PALETTE.GARMENT_GOLD_SEAM, seamAlpha);
    this.gfx.beginPath();
    this.gfx.moveTo(x + lean * 0.35, torsoTop + 3.2);
    this.gfx.lineTo(sleeveEndX, sleeveEndY + 1);
    this.gfx.strokePath();

    if (this.animState === 'interact') {
      this.gfx.fillStyle(PALETTE.GARMENT_GOLD_BRIGHT, 0.45);
      this.gfx.fillCircle(sleeveEndX + f * 3, sleeveEndY, 5.5);
    }

    // 11. High Draped Shoulder Cowl, Concealed Void Face & Swept Silver-Ash Garment Crest
    // Zero visible skin, eyes, or human facial features.
    const hx = x + lean * 0.52;
    const hy = torsoTop - 7.5;

    // Concealed shadow-void head interior
    this.gfx.fillStyle(0x09090e, 1);
    this.gfx.fillCircle(hx, hy, 7.6);

    // Swept sculptural silver-ash crest folds (signature upper-head silhouette of reference)
    this.gfx.fillStyle(0x9ea4b3, 0.94);
    this.gfx.beginPath();
    this.gfx.moveTo(hx - f * 7.8, hy + 1.5);
    this.gfx.lineTo(hx - f * 9.5 + tailSway * 0.22, hy - 5.5);
    this.gfx.lineTo(hx - f * 2.5, hy - 10.2);
    this.gfx.lineTo(hx + f * 6.8, hy - 7.4);
    this.gfx.lineTo(hx + f * 8.2, hy - 2.6);
    this.gfx.lineTo(hx + f * 2.5, hy - 3.8);
    this.gfx.lineTo(hx - f * 3.5, hy - 1.2);
    this.gfx.closePath();
    this.gfx.fillPath();

    // Brighter silver-ash top highlight strands
    this.gfx.lineStyle(1.3, PALETTE.GARMENT_SILVER_CREST, 0.88);
    this.gfx.beginPath();
    this.gfx.moveTo(hx - f * 8.4 + tailSway * 0.2, hy - 5.2);
    this.gfx.lineTo(hx - f * 1.8, hy - 9.8);
    this.gfx.lineTo(hx + f * 6.5, hy - 7.1);
    this.gfx.strokePath();

    // High dark-ash collar cowl wrapping the lower face completely in shadow
    this.gfx.fillStyle(PALETTE.GARMENT_CHARCOAL, 1);
    this.gfx.beginPath();
    this.gfx.moveTo(hx - 8.8, torsoTop + 2.5);
    this.gfx.lineTo(hx - 7.4, hy - 1.2);
    this.gfx.lineTo(hx + f * 7.6, hy - 0.4);
    this.gfx.lineTo(hx + 8.8, torsoTop + 2.5);
    this.gfx.closePath();
    this.gfx.fillPath();

    // Delicate gold kintsugi collar rim
    this.gfx.lineStyle(1.3, PALETTE.GARMENT_GOLD_SEAM, 0.88);
    this.gfx.beginPath();
    this.gfx.moveTo(hx - 7.2, hy - 0.8);
    this.gfx.lineTo(hx + f * 1.5, hy + 1.4);
    this.gfx.lineTo(hx + 7.2, hy - 0.3);
    this.gfx.strokePath();
  }

  private renderFlowingMantle(
    x: number,
    cy: number,
    f: 1 | -1,
    t: number,
    isFloating: boolean,
    anchored: boolean
  ): void {
    if (this.cloakTrail.length < 3) return;

    const baseWidth = isFloating ? 11.5 : anchored ? 8.8 : 9.6;

    // Parchment-ash inner mantle lining (slightly offset beneath outer charcoal fabric)
    this.gfx.lineStyle(baseWidth, PALETTE.GARMENT_LINING, 0.82);
    this.gfx.beginPath();
    this.gfx.moveTo(x - f * 3, cy - 11);
    for (let i = 1; i < this.cloakTrail.length; i++) {
      this.gfx.lineTo(this.cloakTrail[i].x + f * 1.5, this.cloakTrail[i].y + 2.2);
    }
    this.gfx.strokePath();

    // Outer charcoal-ash mantle layer
    this.gfx.lineStyle(baseWidth - 1.6, PALETTE.GARMENT_CHARCOAL, 0.96);
    this.gfx.beginPath();
    this.gfx.moveTo(x - f * 3, cy - 12);
    for (let i = 1; i < this.cloakTrail.length; i++) {
      this.gfx.lineTo(this.cloakTrail[i].x, this.cloakTrail[i].y);
    }
    this.gfx.strokePath();

    // Delicate kintsugi gold thread running along mantle border
    const goldAlpha = anchored ? 0.82 : 0.58 + Math.sin(t * 3.6) * 0.16;
    this.gfx.lineStyle(1.4, PALETTE.GARMENT_GOLD_SEAM, goldAlpha);
    this.gfx.beginPath();
    this.gfx.moveTo(x - f * 3, cy - 11.2);
    for (let i = 1; i < this.cloakTrail.length; i++) {
      this.gfx.lineTo(this.cloakTrail[i].x, this.cloakTrail[i].y + 1.6);
    }
    this.gfx.strokePath();
  }
}
