import Phaser from 'phaser';
import { PALETTE } from '../constants';
import { AudioManager } from '../systems/AudioManager';

/**
 * Vertical wind updraft zone. Lifts the Unbound protagonist while floating;
 * harmlessly rustles past once Weight is restored.
 */
export class WindUpdraft {
  public readonly bounds: Phaser.Geom.Rectangle;
  private enabled: boolean;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    initiallyEnabled = true
  ) {
    this.bounds = new Phaser.Geom.Rectangle(x - width / 2, y - height / 2, width, height);
    this.enabled = initiallyEnabled;

    this.gfx = scene.add.graphics();
    this.gfx.setDepth(14);

    this.emitter = scene.add.particles(x, y + height / 2 - 10, 'tex_mote_cyan', {
      x: { min: -width * 0.42, max: width * 0.42 },
      y: { min: -10, max: 10 },
      speedY: { min: -185, max: -115 },
      speedX: { min: -12, max: 12 },
      scale: { start: 0.35, end: 0.08 },
      alpha: { start: 0.5, end: 0 },
      lifespan: Math.max(700, (height / 150) * 950),
      frequency: 75,
      blendMode: 'ADD',
    });
    this.emitter.setDepth(15);
    if (!initiallyEnabled) {
      this.emitter.stop();
    }
  }

  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (enabled) {
      this.emitter.start();
    } else {
      this.emitter.stop();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public contains(px: number, py: number): boolean {
    return this.enabled && this.bounds.contains(px, py);
  }

  public update(time: number): void {
    this.gfx.clear();
    if (!this.enabled) return;

    const t = time * 0.001;
    const { x, y, width, height } = this.bounds;

    // Soft translucent wind column sheen
    this.gfx.fillStyle(PALETTE.ETHEREAL_CYAN, 0.045);
    this.gfx.fillRect(x, y, width, height);

    // Animated rising wind ribbons
    const cols = Math.max(2, Math.floor(width / 38));
    for (let i = 0; i < cols; i++) {
      const colX = x + ((i + 0.5) / cols) * width;
      const cycle = ((t * 140 + i * 75) % height);
      const streakY = y + height - cycle;
      const streakLen = Math.min(54, streakY - y);
      if (streakLen > 8) {
        this.gfx.lineStyle(1.6, PALETTE.ETHEREAL_SOFT, 0.28);
        this.gfx.beginPath();
        this.gfx.moveTo(colX + Math.sin(t * 3 + i) * 5, streakY);
        this.gfx.lineTo(colX - Math.sin(t * 3 + i) * 5, streakY - streakLen);
        this.gfx.strokePath();
      }
    }
  }
}

/**
 * Pushable runic granite monolith. Immovable before restoring Weight;
 * pushable horizontally within safe track bounds after restoring Weight.
 */
export class HeavyBlock {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly spawnX: number;
  private readonly spawnY: number;
  private readonly minX: number;
  private readonly maxX: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    minX: number,
    maxX: number
  ) {
    this.spawnX = x;
    this.spawnY = y;
    this.minX = minX;
    this.maxX = maxX;

    this.sprite = scene.physics.add.sprite(x, y, 'tex_pixel');
    this.sprite.setAlpha(0);
    this.sprite.setSize(48, 48);
    this.sprite.setOffset(-22, -22);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setGravityY(1200);
    body.setDragX(1600);
    body.setMaxVelocity(110, 600);
    body.setImmovable(true);
    body.pushable = false;

    this.gfx = scene.add.graphics();
    this.gfx.setDepth(24);
  }

  public syncWeightCapability(canPush: boolean): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (canPush) {
      body.setAllowGravity(true);
      body.setImmovable(false);
      body.pushable = true;
    } else {
      body.setVelocity(0, 0);
      body.setAllowGravity(false);
      body.setImmovable(true);
      body.pushable = false;
    }
  }

  public resetToSpawn(): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.sprite.setPosition(this.spawnX, this.spawnY);
    body.setVelocity(0, 0);
  }

  public update(hasWeight: boolean): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (this.sprite.y > this.spawnY) {
      this.sprite.y = this.spawnY;
      if (body.velocity.y > 0) body.setVelocityY(0);
    }
    if (this.sprite.x < this.minX) {
      this.sprite.x = this.minX;
      if (body.velocity.x < 0) body.setVelocityX(0);
    } else if (this.sprite.x > this.maxX) {
      this.sprite.x = this.maxX;
      if (body.velocity.x > 0) body.setVelocityX(0);
    }

    const x = this.sprite.x;
    const y = this.sprite.y;
    this.gfx.clear();

    // Carved granite cube with bronze-gold weight sigil
    this.gfx.fillStyle(0x1c233a, 1);
    this.gfx.fillRoundedRect(x - 24, y - 24, 48, 48, 5);
    this.gfx.lineStyle(2, hasWeight ? PALETTE.REMNANT_GOLD : PALETTE.STONE_HIGHLIGHT, 0.85);
    this.gfx.strokeRoundedRect(x - 24, y - 24, 48, 48, 5);

    // Inner carved square & central rune diamond
    this.gfx.lineStyle(1.2, PALETTE.STONE_DARK, 0.9);
    this.gfx.strokeRect(x - 16, y - 16, 32, 32);

    this.gfx.lineStyle(1.6, hasWeight ? PALETTE.REMNANT_BRIGHT : 0x52618c, hasWeight ? 0.9 : 0.45);
    this.gfx.beginPath();
    this.gfx.moveTo(x, y - 10);
    this.gfx.lineTo(x + 10, y);
    this.gfx.lineTo(x, y + 10);
    this.gfx.lineTo(x - 10, y);
    this.gfx.closePath();
    this.gfx.strokePath();
  }
}

/**
 * Heavy pressure plate embedded into a stone floor.
 * Requires either the Grounded protagonist or a HeavyBlock resting upon it.
 * Can optionally latch permanently once depressed if configured (`latch: true`).
 */
export class PressurePlate {
  public readonly id: string;
  public readonly x: number;
  public readonly y: number;
  private readonly width: number;
  private readonly latch: boolean;
  private depressed = false;
  private lightTouchFeedbackCooldown = 0;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly onStateChange?: (depressed: boolean) => void;
  private readonly onWeightlessTouch?: () => void;

  constructor(
    scene: Phaser.Scene,
    config: {
      id: string;
      x: number;
      y: number;
      width?: number;
      latch?: boolean;
      initiallyDepressed?: boolean;
      onStateChange?: (depressed: boolean) => void;
      onWeightlessTouch?: () => void;
    }
  ) {
    this.id = config.id;
    this.x = config.x;
    this.y = config.y;
    this.width = config.width ?? 64;
    this.latch = config.latch ?? false;
    this.depressed = config.initiallyDepressed ?? false;
    this.onStateChange = config.onStateChange;
    this.onWeightlessTouch = config.onWeightlessTouch;

    this.gfx = scene.add.graphics();
    this.gfx.setDepth(18);
  }

  public isDepressed(): boolean {
    return this.depressed;
  }

  public evaluate(
    delta: number,
    playerX: number,
    playerBottomY: number,
    playerHasWeight: boolean,
    blocks: HeavyBlock[]
  ): void {
    if (this.lightTouchFeedbackCooldown > 0) {
      this.lightTouchFeedbackCooldown -= delta;
    }

    const halfW = this.width / 2 + 6;
    const playerOnPlate =
      Math.abs(playerX - this.x) <= halfW && Math.abs(playerBottomY - this.y) <= 16;

    if (playerOnPlate && !playerHasWeight && !this.depressed) {
      if (this.lightTouchFeedbackCooldown <= 0) {
        this.lightTouchFeedbackCooldown = 3600;
        this.onWeightlessTouch?.();
      }
    }

    const blockOnPlate = blocks.some(
      (b) => Math.abs(b.sprite.x - this.x) <= halfW && Math.abs(b.sprite.y + 24 - this.y) <= 18
    );

    const shouldDepress =
      (this.latch && this.depressed) || (playerOnPlate && playerHasWeight) || blockOnPlate;

    if (shouldDepress !== this.depressed) {
      this.depressed = shouldDepress;
      if (shouldDepress) {
        AudioManager.getInstance().playMechanismActivate();
      }
      this.onStateChange?.(this.depressed);
    }

    this.render(playerOnPlate && !playerHasWeight);
  }

  private render(weightlessHover: boolean): void {
    this.gfx.clear();
    const sink = this.depressed ? 6 : 0;

    // Base socket
    this.gfx.fillStyle(PALETTE.STONE_DARK, 1);
    this.gfx.fillRect(this.x - this.width / 2 - 4, this.y - 3, this.width + 8, 9);

    // Movable pressure slab
    const slabColor = this.depressed ? 0x3b3324 : 0x2a3352;
    this.gfx.fillStyle(slabColor, 1);
    this.gfx.fillRoundedRect(this.x - this.width / 2, this.y - 10 + sink, this.width, 10, 2);

    const trimColor = this.depressed
      ? PALETTE.REMNANT_BRIGHT
      : weightlessHover
        ? PALETTE.ETHEREAL_CYAN
        : PALETTE.REMNANT_BRONZE;
    this.gfx.lineStyle(1.8, trimColor, this.depressed ? 0.98 : 0.7);
    this.gfx.strokeRoundedRect(this.x - this.width / 2, this.y - 10 + sink, this.width, 10, 2);
  }
}

/**
 * Weakened ancient rune-slab floor that shatters permanently when hit by Ground Impact.
 */
export class FracturedSlab {
  public readonly id: string;
  public readonly collider: Phaser.Physics.Arcade.Sprite;
  private readonly scene: Phaser.Scene;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly x: number;
  private readonly y: number;
  private readonly width: number;
  private readonly height: number;
  private broken = false;
  private readonly onShatter?: () => void;

  constructor(
    scene: Phaser.Scene,
    config: {
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      initiallyBroken?: boolean;
      onShatter?: () => void;
    }
  ) {
    this.scene = scene;
    this.id = config.id;
    this.x = config.x;
    this.y = config.y;
    this.width = config.width;
    this.height = config.height;
    this.onShatter = config.onShatter;

    this.collider = scene.physics.add.staticSprite(config.x, config.y, 'tex_pixel');
    this.collider.setAlpha(0);
    this.collider.setDisplaySize(config.width, config.height);
    this.collider.refreshBody();

    this.gfx = scene.add.graphics();
    this.gfx.setDepth(19);

    if (config.initiallyBroken) {
      this.shatter(true);
    }
  }

  public isBroken(): boolean {
    return this.broken;
  }

  public tryImpactAt(impactX: number, impactBottomY: number): boolean {
    if (this.broken) return false;
    const withinX = Math.abs(impactX - this.x) <= this.width / 2 + 24;
    const topY = this.y - this.height / 2;
    const withinY = Math.abs(impactBottomY - topY) <= 26;
    if (withinX && withinY) {
      this.shatter(false);
      return true;
    }
    return false;
  }

  public shatter(silent = false): void {
    if (this.broken) return;
    this.broken = true;
    this.collider.disableBody(true, true);
    this.gfx.clear();

    if (!silent) {
      this.scene.cameras.main.shake(220, 0.008);
      const emitter = this.scene.add.particles(this.x, this.y, 'tex_mote_gold', {
        speedX: { min: -170, max: 170 },
        speedY: { min: -110, max: 160 },
        scale: { start: 0.55, end: 0 },
        alpha: { start: 0.9, end: 0 },
        lifespan: 620,
        quantity: 20,
        emitting: false,
      });
      emitter.setDepth(32);
      emitter.explode(20);
      this.scene.time.delayedCall(680, () => emitter.destroy());
      this.onShatter?.();
    }
  }

  public update(time: number): void {
    if (this.broken) return;
    const t = time * 0.001;
    this.gfx.clear();

    const left = this.x - this.width / 2;
    const top = this.y - this.height / 2;

    this.gfx.fillStyle(0x272338, 1);
    this.gfx.fillRoundedRect(left, top, this.width, this.height, 3);
    this.gfx.lineStyle(1.4, PALETTE.REMNANT_BRONZE, 0.8);
    this.gfx.strokeRoundedRect(left, top, this.width, this.height, 3);

    // Glowing amber fault fissures signaling Ground Impact vulnerability
    const pulse = 0.55 + Math.sin(t * 4.2) * 0.3;
    this.gfx.lineStyle(2, PALETTE.REMNANT_BRIGHT, pulse);
    this.gfx.beginPath();
    this.gfx.moveTo(left + 12, top + 2);
    this.gfx.lineTo(this.x - 10, this.y + 3);
    this.gfx.lineTo(this.x + 8, top + 4);
    this.gfx.lineTo(left + this.width - 14, this.y + this.height - 3);
    this.gfx.moveTo(this.x - 10, this.y + 3);
    this.gfx.lineTo(this.x - 2, top + this.height - 2);
    this.gfx.strokePath();
  }
}

/**
 * Ancient stone gate that retracts smoothly when its required seals are active.
 */
export class RunicGate {
  public readonly id: string;
  public readonly collider: Phaser.Physics.Arcade.Sprite;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly x: number;
  private readonly closedY: number;
  private readonly width: number;
  private readonly height: number;
  private readonly totalSeals: number;
  private activeSeals = 0;
  private open = false;
  private openProgress = 0;

  constructor(
    scene: Phaser.Scene,
    config: {
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      totalSeals: number;
      initiallyOpen?: boolean;
    }
  ) {
    this.id = config.id;
    this.x = config.x;
    this.closedY = config.y;
    this.width = config.width;
    this.height = config.height;
    this.totalSeals = config.totalSeals;

    this.collider = scene.physics.add.staticSprite(config.x, config.y, 'tex_pixel');
    this.collider.setAlpha(0);
    this.collider.setDisplaySize(config.width, config.height);
    this.collider.refreshBody();

    this.gfx = scene.add.graphics();
    this.gfx.setDepth(21);

    if (config.initiallyOpen) {
      this.activeSeals = config.totalSeals;
      this.open = true;
      this.openProgress = 1;
      this.collider.disableBody(true, true);
    }
  }

  public setSealProgress(activeCount: number): boolean {
    this.activeSeals = Phaser.Math.Clamp(activeCount, 0, this.totalSeals);
    const shouldOpen = this.activeSeals >= this.totalSeals;
    if (shouldOpen !== this.open) {
      this.open = shouldOpen;
      if (this.open) {
        this.collider.disableBody(true, true);
      } else {
        this.collider.enableBody(false, this.x, this.closedY, true, true);
        this.collider.setAlpha(0);
        this.collider.setDisplaySize(this.width, this.height);
        this.collider.refreshBody();
      }
      return true;
    }
    return false;
  }

  public isOpen(): boolean {
    return this.open;
  }

  public update(delta: number): void {
    const target = this.open ? 1 : 0;
    this.openProgress = Phaser.Math.Linear(this.openProgress, target, Math.min(1, delta * 0.008));

    this.gfx.clear();
    const visibleH = this.height * (1 - this.openProgress * 0.92);
    if (visibleH <= 3) return;

    const top = this.closedY - this.height / 2;
    const left = this.x - this.width / 2;

    this.gfx.fillStyle(0x171d32, 0.98);
    this.gfx.fillRoundedRect(left, top, this.width, visibleH, 3);
    this.gfx.lineStyle(1.8, this.open ? PALETTE.REMNANT_GOLD : PALETTE.ETHEREAL_BLUE, 0.85);
    this.gfx.strokeRoundedRect(left, top, this.width, visibleH, 3);

    // Seal indicator nodes on the gate face
    for (let i = 0; i < this.totalSeals; i++) {
      const sy = top + ((i + 1) / (this.totalSeals + 1)) * visibleH;
      const lit = i < this.activeSeals;
      this.gfx.fillStyle(lit ? PALETTE.REMNANT_BRIGHT : 0x2f3b5e, lit ? 0.95 : 0.65);
      this.gfx.fillCircle(this.x, sy, 4.5);
    }
  }
}

