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

    for (let i = 0; i < 6; i++) {
      this.cloakTrail.push({ x, y });
    }

    this.auraEmitter = scene.add.particles(0, 0, 'tex_mote_cyan', {
      x: { min: -12, max: 12 },
      y: { min: -22, max: 18 },
      speedY: { min: -28, max: -8 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0.34, end: 0 },
      alpha: { start: 0.55, end: 0 },
      lifespan: 1100,
      frequency: 95,
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
    this.interactPulseMs = 320;
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

    if (hasWeight) {
      this.auraEmitter.setTexture('tex_mote_gold');
      this.auraEmitter.setFrequency(150);
    } else {
      this.auraEmitter.setTexture('tex_mote_cyan');
      this.auraEmitter.setFrequency(95);
    }
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
        this.landingSquash = this.hasWeight ? 0.26 : 0.12;
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
    }

    if (this.controlsLocked) {
      body.setAccelerationX(0);
      body.setDragX(profile.dragX);
      if (this.animState !== 'restoring') {
        this.animState = onGround ? 'idle' : 'fall';
      }
      this.updateCloakTrail();
      this.render(time);
      this.wasOnGround = onGround;
      return;
    }

    // Ground Impact windup & plunge (Post-Weight only)
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
      this.updateCloakTrail();
      this.render(time);
      this.wasOnGround = onGround;
      return;
    }

    // Trigger Ground Impact: S / Down + Space while airborne after Weight restoration
    if (
      !onGround &&
      profile.canGroundImpact &&
      input.down &&
      input.jumpJustPressed &&
      !this.isGroundImpacting
    ) {
      this.isGroundImpacting = true;
      this.impactWindupMs = 85;
      this.jumpBufferMs = 0;
      body.setVelocity(0, 0);
      this.animState = 'ground_impact';
      this.updateCloakTrail();
      this.render(time);
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
    if (!input.jumpJustPressed && input.jumpJustReleased && body.velocity.y < -130 && !this.inUpdraft) {
      body.setVelocityY(body.velocity.y * 0.56);
    }

    // Floating & Updraft lift (Pre-Weight only)
    let activelyFloating = false;
    if (profile.canFloat && this.inUpdraft && profile.canUseUpdraft && input.jumpHeld) {
      // Rise smoothly inside updraft currents when holding Space (even from standing at the base)
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
        // Gentle passive cushion in updraft even without holding Space
        const nextVy = Math.min(body.velocity.y, 38);
        body.setVelocityY(nextVy);
        activelyFloating = true;
      } else if (input.jumpHeld && body.velocity.y > 0) {
        // Controlled slow-descent float in open air
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

    this.updateCloakTrail();
    this.render(time);
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

  private updateCloakTrail(): void {
    const headX = this.sprite.x - this.facing * 5;
    const headY = this.sprite.y - 8;
    this.cloakTrail[0] = { x: headX, y: headY };
    for (let i = 1; i < this.cloakTrail.length; i++) {
      const prev = this.cloakTrail[i - 1];
      const cur = this.cloakTrail[i];
      cur.x += (prev.x - this.facing * 5.5 - cur.x) * 0.38;
      cur.y += (prev.y + 4.2 - cur.y) * 0.38;
    }
  }

  private render(time: number): void {
    this.gfx.clear();
    const x = this.sprite.x;
    const y = this.sprite.y;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const vx = body.velocity.x;
    const t = time * 0.001;

    if (!this.hasWeight && this.animState !== 'restoring') {
      this.renderUnboundForm(x, y, vx, t);
    } else if (this.animState === 'restoring') {
      this.renderRestoringMetamorphosis(x, y, t);
    } else {
      this.renderGroundedForm(x, y, vx, t);
    }
  }

  /**
   * Form 1: Incomplete, translucent void silhouette with missing limb gaps,
   * orbiting fragments, cyan rim-glow, and billowing float wisps.
   */
  private renderUnboundForm(x: number, y: number, vx: number, t: number): void {
    const bob = Math.sin(t * 3.1) * 3.5;
    const lean = Phaser.Math.Clamp(vx * 0.025, -6, 6);
    const isFloating = this.animState === 'float';
    const cy = y + bob;

    // Soft ethereal outer glow
    this.gfx.fillStyle(PALETTE.ETHEREAL_CYAN, isFloating ? 0.16 : 0.09);
    this.gfx.fillCircle(x, cy - 4, isFloating ? 28 : 21);

    // Spectral wing-ribbons when floating
    if (isFloating) {
      const wingSpread = 22 + Math.sin(t * 9) * 3.5;
      this.gfx.lineStyle(2, PALETTE.ETHEREAL_CYAN, 0.65);
      for (const side of [-1, 1]) {
        this.gfx.beginPath();
        this.gfx.moveTo(x + side * 6, cy - 8);
        this.gfx.lineTo(x + side * wingSpread, cy - 16 + Math.sin(t * 7 + side) * 3);
        this.gfx.lineTo(x + side * (wingSpread * 0.72), cy + 2);
        this.gfx.strokePath();
      }
    }

    // Trailing wisp ribbons instead of solid legs (incomplete lower form)
    for (let i = 0; i < 3; i++) {
      const offset = (i - 1) * 6;
      const wave = Math.sin(t * 5.2 + i * 1.5) * 4.5 - vx * 0.02;
      this.gfx.lineStyle(3.2 - i * 0.4, PALETTE.ETHEREAL_CYAN, 0.42);
      this.gfx.beginPath();
      this.gfx.moveTo(x + offset * 0.6, cy + 5);
      this.gfx.lineTo(x + offset + wave * 0.5, cy + 16);
      this.gfx.lineTo(x + offset + wave, cy + 25);
      this.gfx.strokePath();
    }

    // Orbiting unfinished soul-shards around gaps in torso
    for (let i = 0; i < 4; i++) {
      const angle = t * 2.2 + (i * Math.PI) / 2;
      const sx = x + Math.cos(angle) * (13 + (isFloating ? 4 : 0));
      const sy = cy + 2 + Math.sin(angle * 1.3) * 11;
      this.gfx.fillStyle(0x0c1022, 0.9);
      this.gfx.fillCircle(sx, sy, 2.8);
      this.gfx.lineStyle(1.2, PALETTE.ETHEREAL_CYAN, 0.8);
      this.gfx.strokeCircle(sx, sy, 2.8);
    }

    // Fragmented upper torso (with visible hollow core gap)
    this.gfx.fillStyle(0x0b0f1f, 0.84);
    this.gfx.lineStyle(1.6, PALETTE.ETHEREAL_CYAN, 0.78);
    this.gfx.beginPath();
    this.gfx.moveTo(x - 9 + lean * 0.4, cy - 10);
    this.gfx.lineTo(x + 9 + lean * 0.4, cy - 10);
    this.gfx.lineTo(x + 6 + lean * 0.2, cy + 5);
    this.gfx.lineTo(x - 6 + lean * 0.2, cy + 5);
    this.gfx.closePath();
    this.gfx.fillPath();
    this.gfx.strokePath();

    // Missing chest void fracture
    this.gfx.fillStyle(PALETTE.ETHEREAL_CYAN, 0.35 + Math.sin(t * 4.5) * 0.15);
    this.gfx.fillCircle(x + lean * 0.3, cy - 3, 3.2);

    // Floating head silhouette (detached slightly from shoulders to emphasize unfinished form)
    const hx = x + lean * 0.55;
    const hy = cy - 20;
    this.gfx.fillStyle(0x0b0f1f, 0.9);
    this.gfx.fillCircle(hx, hy, 7.8);
    this.gfx.lineStyle(1.5, PALETTE.ETHEREAL_CYAN, 0.85);
    this.gfx.strokeCircle(hx, hy, 7.8);

    // Expressive glowing eyes (with periodic blink)
    const blink = Math.sin(t * 0.85) > 0.985 ? 0.2 : 1;
    const eyeX = hx + this.facing * 2.6;
    this.gfx.fillStyle(PALETTE.ETHEREAL_SOFT, 0.95);
    this.gfx.fillEllipse(eyeX - 1.8, hy - 0.5, 2.4, 2.8 * blink);
    this.gfx.fillEllipse(eyeX + 2.2, hy - 0.5, 2.4, 2.8 * blink);
  }

  /**
   * Cinematic transition between Unbound Silhouette and Grounded Vessel.
   */
  private renderRestoringMetamorphosis(x: number, y: number, t: number): void {
    const p = Phaser.Math.Clamp(this.restoringProgress, 0, 1);
    const radius = 38 * (1 - p * 0.45);
    this.gfx.fillStyle(PALETTE.REMNANT_GOLD, 0.18 + p * 0.22);
    this.gfx.fillCircle(x, y - 4, radius + Math.sin(t * 14) * 4);

    // Spiraling golden fragments converging into the body
    for (let i = 0; i < 8; i++) {
      const a = t * 5 + (i * Math.PI) / 4;
      const dist = (1 - p) * 44 + 4;
      const fx = x + Math.cos(a) * dist;
      const fy = y - 4 + Math.sin(a) * dist * 0.75;
      this.gfx.fillStyle(PALETTE.REMNANT_BRIGHT, 0.9);
      this.gfx.fillCircle(fx, fy, 3.2);
    }

    if (p < 0.65) {
      this.renderUnboundForm(x, y - p * 8, 0, t);
    } else {
      this.renderGroundedForm(x, y, 0, t);
    }
  }

  /**
   * Form 2: Solid, grounded obsidian-slate vessel bound by warm kintsugi-gold seams,
   * articulated striding legs, traveler's mantle, and glowing core sigil.
   */
  private renderGroundedForm(x: number, y: number, vx: number, t: number): void {
    const squashY = 1 - this.landingSquash * 0.35;
    const stretchX = 1 + this.landingSquash * 0.22;
    const lean = Phaser.Math.Clamp(vx * 0.02, -5, 5);
    const breath = Math.sin(t * 2.6) * 1.1;

    // Ground Impact comet shroud
    if (this.animState === 'ground_impact') {
      this.gfx.fillStyle(PALETTE.REMNANT_GOLD, 0.28);
      this.gfx.fillEllipse(x, y - 6, 30, 58);
      this.gfx.lineStyle(2.5, PALETTE.REMNANT_BRIGHT, 0.9);
      this.gfx.strokeEllipse(x, y - 2, 24, 50);
    }

    // Optional Imprint aura halo behind shoulders
    if (this.imprint === 'resonance') {
      this.gfx.fillStyle(PALETTE.IMPRINT_RESONANCE, 0.16);
      this.gfx.fillCircle(x, y - 8, 24 + Math.sin(t * 3) * 2);
    } else if (this.imprint === 'resolve') {
      this.gfx.lineStyle(1.6, PALETTE.IMPRINT_RESOLVE, 0.55);
      this.gfx.strokeCircle(x, y - 18, 14 + Math.sin(t * 2.5));
    }

    // Flowing traveler's cloak / scarf ribbon
    this.gfx.lineStyle(7, 0x262d4a, 0.95);
    this.gfx.beginPath();
    this.gfx.moveTo(x - this.facing * 3, y - 11);
    for (let i = 1; i < this.cloakTrail.length; i++) {
      this.gfx.lineTo(this.cloakTrail[i].x, this.cloakTrail[i].y);
    }
    this.gfx.strokePath();

    this.gfx.lineStyle(1.6, PALETTE.REMNANT_GOLD, 0.72);
    this.gfx.beginPath();
    this.gfx.moveTo(x - this.facing * 3, y - 11);
    for (let i = 1; i < this.cloakTrail.length; i++) {
      this.gfx.lineTo(this.cloakTrail[i].x, this.cloakTrail[i].y + 2);
    }
    this.gfx.strokePath();

    // Articulated solid legs & grounded boots
    const isRunning = this.animState === 'run';
    const strideA = isRunning ? Math.sin(this.walkCycle * 6.5) * 8 : 0;
    const strideB = isRunning ? -strideA : 0;
    const kneeLiftA = isRunning ? Math.max(0, -Math.cos(this.walkCycle * 6.5) * 4) : 0;
    const kneeLiftB = isRunning ? Math.max(0, Math.cos(this.walkCycle * 6.5) * 4) : 0;

    const footY = y + 25;
    const hipY = y + 6 * squashY;

    // Back leg
    this.gfx.lineStyle(4.5, 0x101425, 1);
    this.gfx.beginPath();
    this.gfx.moveTo(x - 3, hipY);
    this.gfx.lineTo(x - 3 + strideB, footY - kneeLiftB);
    this.gfx.strokePath();

    // Front leg with golden greave seam
    this.gfx.lineStyle(4.8, 0x181f36, 1);
    this.gfx.beginPath();
    this.gfx.moveTo(x + 3, hipY);
    this.gfx.lineTo(x + 3 + strideA, footY - kneeLiftA);
    this.gfx.strokePath();

    this.gfx.lineStyle(1.3, PALETTE.REMNANT_GOLD, 0.85);
    this.gfx.beginPath();
    this.gfx.moveTo(x + 3 + strideA * 0.5, (hipY + footY) * 0.5);
    this.gfx.lineTo(x + 3 + strideA, footY - kneeLiftA);
    this.gfx.strokePath();

    // Solid armored/mantled torso
    const torsoTop = y - (13 - breath * 0.4) * squashY;
    const torsoW = 10.5 * stretchX;
    this.gfx.fillStyle(0x141a2e, 1);
    this.gfx.lineStyle(1.6, PALETTE.REMNANT_BRONZE, 0.9);
    this.gfx.beginPath();
    this.gfx.moveTo(x - torsoW + lean * 0.4, torsoTop);
    this.gfx.lineTo(x + torsoW + lean * 0.4, torsoTop);
    this.gfx.lineTo(x + torsoW * 0.78, hipY + 2);
    this.gfx.lineTo(x - torsoW * 0.78, hipY + 2);
    this.gfx.closePath();
    this.gfx.fillPath();
    this.gfx.strokePath();

    // Kintsugi golden seams & restored Weight core sigil on chest
    this.gfx.lineStyle(1.5, PALETTE.REMNANT_BRIGHT, 0.92);
    this.gfx.beginPath();
    this.gfx.moveTo(x - 6 + lean * 0.3, torsoTop + 3);
    this.gfx.lineTo(x + lean * 0.3, y - 3);
    this.gfx.lineTo(x + 6 + lean * 0.3, torsoTop + 5);
    this.gfx.strokePath();

    const coreColor =
      this.imprint === 'resonance'
        ? PALETTE.IMPRINT_RESONANCE
        : this.imprint === 'resolve'
          ? PALETTE.IMPRINT_RESOLVE
          : PALETTE.REMNANT_BRIGHT;
    this.gfx.fillStyle(coreColor, 0.95);
    this.gfx.fillCircle(x + lean * 0.3, y - 3, 3.2);

    // Solid head connected by collar
    const hx = x + lean * 0.55;
    const hy = torsoTop - 8.5;
    this.gfx.fillStyle(0x141a2e, 1);
    this.gfx.fillCircle(hx, hy, 8.2);
    this.gfx.lineStyle(1.6, PALETTE.REMNANT_GOLD, 0.88);
    this.gfx.strokeCircle(hx, hy, 8.2);

    // Warm golden-white eyes
    const blink = Math.sin(t * 0.9) > 0.985 ? 0.2 : 1;
    const eyeX = hx + this.facing * 2.8;
    this.gfx.fillStyle(PALETTE.REMNANT_BRIGHT, 1);
    this.gfx.fillEllipse(eyeX - 1.8, hy - 0.5, 2.5, 2.8 * blink);
    this.gfx.fillEllipse(eyeX + 2.2, hy - 0.5, 2.5, 2.8 * blink);
  }
}
