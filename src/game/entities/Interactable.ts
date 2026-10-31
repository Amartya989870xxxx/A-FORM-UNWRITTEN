import Phaser from 'phaser';
import { PALETTE } from '../constants';

export type InteractableKind =
  | 'npc'
  | 'conduit'
  | 'vane'
  | 'echo'
  | 'survey_stele'
  | 'sky_bell'
  | 'crucible_lock'
  | 'loom_clue'
  | 'loom_reliquary'
  | 'remnant_weight'
  | 'waystone_lift'
  | 'reset_rune'
  | 'ending_arch';

export interface InteractableConfig {
  id: string;
  x: number;
  y: number;
  radius?: number;
  kind: InteractableKind;
  getPrompt: () => string | null;
  isActivated?: () => boolean;
  getLockCountRemaining?: () => number;
  onInteract: () => void;
}

export class Interactable {
  public readonly config: InteractableConfig;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly promptContainer: Phaser.GameObjects.Container;
  private readonly promptBg: Phaser.GameObjects.Graphics;
  private readonly promptText: Phaser.GameObjects.Text;
  private inRange = false;
  private compassResonance = 0;
  private lastPromptLabel = '';

  constructor(scene: Phaser.Scene, config: InteractableConfig) {
    this.config = config;
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(20);

    this.promptBg = scene.add.graphics();
    this.promptText = scene.add.text(0, 0, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: PALETTE.TEXT_LIGHT,
      align: 'center',
    });
    this.promptText.setOrigin(0.5, 0.5);
    this.promptText.setResolution(2);

    this.promptContainer = scene.add.container(config.x, config.y - 56, [
      this.promptBg,
      this.promptText,
    ]);
    this.promptContainer.setDepth(45);
    this.promptContainer.setAlpha(0);
  }

  public setInRange(inRange: boolean): void {
    this.inRange = inRange;
  }

  public isInRange(): boolean {
    return this.inRange;
  }

  public getRadius(): number {
    return this.config.radius ?? 70;
  }

  public setCompassResonance(strength: number): void {
    this.compassResonance = Phaser.Math.Clamp(strength, 0, 1);
  }

  public getCompassResonance(): number {
    return this.compassResonance;
  }

  public isHiddenInscriptionCandidate(): boolean {
    const { kind } = this.config;
    if (kind !== 'echo' && kind !== 'loom_clue') return false;
    return !(this.config.isActivated?.() ?? false);
  }

  public update(time: number): void {
    const t = time * 0.001;
    this.gfx.clear();
    this.renderObject(t);
    this.renderCompassResonance(t);

    const promptLabel = this.inRange ? this.config.getPrompt() : null;
    if (promptLabel) {
      if (promptLabel !== this.lastPromptLabel) {
        this.lastPromptLabel = promptLabel;
        this.promptText.setText(`[E]  ${promptLabel}`);
        const padX = 14;
        const w = this.promptText.width + padX * 2;
        const h = 28;
        const isGoldKind =
          this.config.kind === 'remnant_weight' ||
          this.config.kind === 'crucible_lock' ||
          this.config.kind === 'loom_clue' ||
          this.config.kind === 'loom_reliquary' ||
          this.config.kind === 'waystone_lift';
        this.promptBg.clear();
        this.promptBg.fillStyle(PALETTE.UI_BG, 0.92);
        this.promptBg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
        this.promptBg.lineStyle(
          1.3,
          isGoldKind ? PALETTE.REMNANT_GOLD : PALETTE.UI_BORDER_CYAN,
          0.88
        );
        this.promptBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
      }

      this.promptContainer.y = this.config.y - 60 + Math.sin(t * 3.2) * 2.5;
      this.promptContainer.alpha = Phaser.Math.Linear(this.promptContainer.alpha, 1, 0.22);
    } else {
      this.lastPromptLabel = '';
      this.promptContainer.alpha = Phaser.Math.Linear(this.promptContainer.alpha, 0, 0.22);
    }
  }

  private renderObject(t: number): void {
    const { x, y, kind } = this.config;
    const active = this.config.isActivated?.() ?? false;

    switch (kind) {
      case 'npc':
        break;

      case 'conduit': {
        this.gfx.fillStyle(PALETTE.STONE_BASE, 1);
        this.gfx.beginPath();
        this.gfx.moveTo(x - 16, y + 26);
        this.gfx.lineTo(x - 10, y - 26);
        this.gfx.lineTo(x, y - 40);
        this.gfx.lineTo(x + 10, y - 26);
        this.gfx.lineTo(x + 16, y + 26);
        this.gfx.closePath();
        this.gfx.fillPath();

        const glowColor = active ? PALETTE.ETHEREAL_CYAN : 0x455375;
        this.gfx.lineStyle(1.6, glowColor, active ? 0.95 : 0.5);
        this.gfx.strokeCircle(x, y - 10, 10 + (active ? Math.sin(t * 4) * 1.5 : 0));
        this.gfx.fillStyle(glowColor, active ? 0.9 : 0.35);
        this.gfx.fillCircle(x, y - 10, active ? 5.5 : 3.5);
        if (active) {
          this.gfx.fillStyle(PALETTE.ETHEREAL_CYAN, 0.16);
          this.gfx.fillCircle(x, y - 10, 26 + Math.sin(t * 3) * 3);
        }
        break;
      }

      case 'vane': {
        this.gfx.fillStyle(PALETTE.STONE_DARK, 1);
        this.gfx.fillRect(x - 12, y + 6, 24, 20);
        this.gfx.lineStyle(3, PALETTE.STONE_HIGHLIGHT, 1);
        this.gfx.beginPath();
        this.gfx.moveTo(x, y + 6);
        this.gfx.lineTo(x, y - 20);
        this.gfx.strokePath();

        const angle = active ? -Math.PI / 2 + Math.sin(t * 6) * 0.12 : 0.15;
        const bx = x + Math.cos(angle) * 18;
        const by = y - 20 + Math.sin(angle) * 18;
        this.gfx.lineStyle(2.5, active ? PALETTE.ETHEREAL_CYAN : PALETTE.REMNANT_GOLD, 0.95);
        this.gfx.beginPath();
        this.gfx.moveTo(x - Math.cos(angle) * 10, y - 20 - Math.sin(angle) * 10);
        this.gfx.lineTo(bx, by);
        this.gfx.strokePath();
        this.gfx.fillStyle(active ? PALETTE.ETHEREAL_CYAN : PALETTE.REMNANT_GOLD, 0.85);
        this.gfx.fillCircle(x, y - 20, 4);
        break;
      }

      case 'echo': {
        this.gfx.fillStyle(0x1b223a, 1);
        this.gfx.fillRoundedRect(x - 13, y - 20, 26, 46, { tl: 12, tr: 12, bl: 2, br: 2 });
        this.gfx.lineStyle(1.4, active ? PALETTE.ETHEREAL_CYAN : PALETTE.STONE_HIGHLIGHT, 0.75);
        this.gfx.strokeRoundedRect(x - 13, y - 20, 26, 46, { tl: 12, tr: 12, bl: 2, br: 2 });

        const runeAlpha = active ? 0.35 : 0.75 + Math.sin(t * 3.5) * 0.2;
        this.gfx.lineStyle(1.4, PALETTE.ETHEREAL_CYAN, runeAlpha);
        for (let row = -10; row <= 10; row += 7) {
          this.gfx.beginPath();
          this.gfx.moveTo(x - 6, y + row);
          this.gfx.lineTo(x + 6, y + row);
          this.gfx.strokePath();
        }
        break;
      }

      case 'survey_stele': {
        // Wide astrolabe surveyor table & diagram stele in Zone 2
        this.gfx.fillStyle(0x192038, 1);
        this.gfx.fillRoundedRect(x - 18, y - 26, 36, 52, { tl: 8, tr: 8, bl: 2, br: 2 });
        this.gfx.lineStyle(1.5, active ? PALETTE.REMNANT_GOLD : PALETTE.ETHEREAL_CYAN, 0.82);
        this.gfx.strokeRoundedRect(x - 18, y - 26, 36, 52, { tl: 8, tr: 8, bl: 2, br: 2 });

        // Engraved Crucible dome & three-seal schematic
        this.gfx.lineStyle(1.3, PALETTE.REMNANT_BRIGHT, active ? 0.55 : 0.9);
        this.gfx.strokeCircle(x, y - 6, 9);
        for (let i = 0; i < 3; i++) {
          const a = -Math.PI / 2 + (i * Math.PI * 2) / 3 + t * (active ? 0.6 : 0.2);
          this.gfx.fillStyle(PALETTE.ETHEREAL_CYAN, 0.88);
          this.gfx.fillCircle(x + Math.cos(a) * 9, y - 6 + Math.sin(a) * 9, 2.2);
        }
        break;
      }

      case 'sky_bell': {
        // Suspended bronze-and-cyan Aerial Resonance Bell under stone belfry arch
        this.gfx.lineStyle(4, PALETTE.STONE_LIGHT, 1);
        this.gfx.beginPath();
        this.gfx.moveTo(x - 22, y + 26);
        this.gfx.lineTo(x - 20, y - 30);
        this.gfx.lineTo(x + 20, y - 30);
        this.gfx.lineTo(x + 22, y + 26);
        this.gfx.strokePath();

        const swing = active ? Math.sin(t * 5.2) * 3.5 : Math.sin(t * 1.6) * 0.8;
        this.gfx.fillStyle(active ? PALETTE.REMNANT_GOLD : 0x7b6340, 1);
        this.gfx.beginPath();
        this.gfx.moveTo(x - 9 + swing * 0.4, y - 22);
        this.gfx.lineTo(x + 9 + swing * 0.4, y - 22);
        this.gfx.lineTo(x + 14 + swing, y - 2);
        this.gfx.lineTo(x - 14 + swing, y - 2);
        this.gfx.closePath();
        this.gfx.fillPath();

        this.gfx.fillStyle(active ? PALETTE.ETHEREAL_CYAN : PALETTE.REMNANT_BRIGHT, 0.95);
        this.gfx.fillCircle(x + swing * 1.15, y + 1, 3.4);

        if (active) {
          const waveR = 16 + ((t * 28) % 24);
          this.gfx.lineStyle(1.4, PALETTE.ETHEREAL_CYAN, 1 - (waveR - 16) / 24);
          this.gfx.strokeCircle(x, y - 10, waveR);
        }
        break;
      }

      case 'crucible_lock': {
        // Crucible Stabilization Seal Mechanism (Bronze-crimson when locked, gold-cyan when released)
        this.gfx.fillStyle(PALETTE.STONE_DARK, 1);
        this.gfx.fillRoundedRect(x - 15, y - 8, 30, 34, 4);
        this.gfx.lineStyle(1.5, active ? PALETTE.REMNANT_GOLD : 0x7a483b, 0.9);
        this.gfx.strokeRoundedRect(x - 15, y - 8, 30, 34, 4);

        const wheelY = y - 16;
        const wheelColor = active ? PALETTE.ETHEREAL_CYAN : PALETTE.REMNANT_GOLD;
        this.gfx.lineStyle(2.2, wheelColor, 0.95);
        this.gfx.strokeCircle(x, wheelY, 11);

        const rot = active ? t * 1.8 : 0.35;
        for (let i = 0; i < 4; i++) {
          const a = rot + (i * Math.PI) / 2;
          this.gfx.beginPath();
          this.gfx.moveTo(x, wheelY);
          this.gfx.lineTo(x + Math.cos(a) * 11, wheelY + Math.sin(a) * 11);
          this.gfx.strokePath();
        }
        this.gfx.fillStyle(active ? PALETTE.ETHEREAL_SOFT : 0xe06d53, 0.95);
        this.gfx.fillCircle(x, wheelY, 3.8);
        break;
      }

      case 'loom_clue': {
        // Hidden Weaver Clue: glowing spool/spindle of kintsugi gold thread
        if (active) {
          this.gfx.fillStyle(PALETTE.GARMENT_GOLD_SEAM, 0.16);
          this.gfx.fillCircle(x, y + 8, 8);
          return;
        }
        const floatY = y - 4 + Math.sin(t * 3.1) * 3.2;
        this.gfx.fillStyle(PALETTE.GARMENT_GOLD_SEAM, 0.18);
        this.gfx.fillCircle(x, floatY, 18 + Math.sin(t * 4) * 2);

        this.gfx.lineStyle(2, PALETTE.GARMENT_GOLD_BRIGHT, 0.95);
        this.gfx.beginPath();
        this.gfx.moveTo(x, floatY - 10);
        this.gfx.lineTo(x + 7, floatY);
        this.gfx.lineTo(x, floatY + 10);
        this.gfx.lineTo(x - 7, floatY);
        this.gfx.closePath();
        this.gfx.strokePath();

        this.gfx.lineStyle(1.1, PALETTE.GARMENT_GOLD_SEAM, 0.8);
        this.gfx.strokeEllipse(x, floatY, 22, 8);
        break;
      }

      case 'loom_reliquary': {
        // Sealed Reliquary Loom Coffer in the Sunken Sanctum
        this.gfx.fillStyle(0x181c30, 1);
        this.gfx.fillRoundedRect(x - 22, y - 6, 44, 32, 5);
        this.gfx.lineStyle(1.8, PALETTE.GARMENT_GOLD_SEAM, 0.9);
        this.gfx.strokeRoundedRect(x - 22, y - 6, 44, 32, 5);

        // Woven gold loom threads across coffer face
        this.gfx.lineStyle(1.2, PALETTE.GARMENT_GOLD_BRIGHT, active ? 0.45 : 0.88);
        this.gfx.beginPath();
        this.gfx.moveTo(x - 16, y + 10);
        this.gfx.lineTo(x + 16, y + 10);
        this.gfx.moveTo(x, y - 6);
        this.gfx.lineTo(x, y + 26);
        this.gfx.strokePath();

        if (!active) {
          this.gfx.fillStyle(PALETTE.GARMENT_GOLD_BRIGHT, 0.85);
          this.gfx.fillCircle(x, y + 10, 4 + Math.sin(t * 3.5) * 0.8);
        } else {
          this.gfx.fillStyle(PALETTE.ETHEREAL_CYAN, 0.22);
          this.gfx.fillCircle(x, y - 12, 16 + Math.sin(t * 2.5) * 2);
        }
        break;
      }

      case 'remnant_weight': {
        const locksRemaining = this.config.getLockCountRemaining?.() ?? 0;

        this.gfx.fillStyle(PALETTE.STONE_DARK, 1);
        this.gfx.fillRoundedRect(x - 30, y + 10, 60, 18, 4);
        this.gfx.lineStyle(1.5, PALETTE.REMNANT_BRONZE, 0.85);
        this.gfx.strokeRoundedRect(x - 30, y + 10, 60, 18, 4);

        if (!active) {
          const oy = y - 18 + Math.sin(t * 2.4) * 4;
          const sealed = locksRemaining > 0;

          this.gfx.fillStyle(PALETTE.REMNANT_GOLD, sealed ? 0.11 : 0.2);
          this.gfx.fillCircle(x, oy, 36 + Math.sin(t * 3.5) * 3);
          this.gfx.fillStyle(PALETTE.REMNANT_GOLD, sealed ? 0.24 : 0.36);
          this.gfx.fillCircle(x, oy, 20);
          this.gfx.fillStyle(PALETTE.REMNANT_BRIGHT, sealed ? 0.78 : 0.98);
          this.gfx.fillCircle(x, oy, 10.5);

          if (sealed) {
            // Concentric runic containment cage rings (1 ring per remaining Crucible lock)
            for (let ringIdx = 0; ringIdx < locksRemaining; ringIdx++) {
              const r = 24 + ringIdx * 7;
              this.gfx.lineStyle(1.8, 0xd9735b, 0.85 - ringIdx * 0.12);
              this.gfx.strokeCircle(x, oy, r);
              const nodeA = t * (1.4 - ringIdx * 0.5) + ringIdx * 1.7;
              this.gfx.fillStyle(0xffb49a, 0.95);
              this.gfx.fillCircle(x + Math.cos(nodeA) * r, oy + Math.sin(nodeA) * r, 2.8);
            }
          } else {
            this.gfx.lineStyle(1.8, PALETTE.REMNANT_GOLD, 0.9);
            this.gfx.strokeEllipse(x, oy, 44, 15);
            for (let i = 0; i < 4; i++) {
              const a = t * 1.9 + (i * Math.PI) / 2;
              this.gfx.fillStyle(PALETTE.REMNANT_BRIGHT, 0.92);
              this.gfx.fillCircle(x + Math.cos(a) * 22, oy + Math.sin(a) * 7.5, 2.5);
            }
          }
        } else {
          this.gfx.fillStyle(PALETTE.REMNANT_GOLD, 0.18);
          this.gfx.fillCircle(x, y + 6, 14);
        }
        break;
      }

      case 'waystone_lift': {
        this.gfx.fillStyle(PALETTE.STONE_DARK, 0.96);
        this.gfx.fillRoundedRect(x - 20, y + 12, 40, 14, 4);
        this.gfx.lineStyle(
          1.4,
          active ? PALETTE.REMNANT_GOLD : PALETTE.STONE_HIGHLIGHT,
          active ? 0.86 : 0.32
        );
        this.gfx.strokeRoundedRect(x - 20, y + 12, 40, 14, 4);

        if (active) {
          const liftBob = Math.sin(t * 2.6) * 2.5;
          this.gfx.lineStyle(1.3, PALETTE.REMNANT_GOLD, 0.55);
          this.gfx.strokeEllipse(x, y + 6 + liftBob, 28, 9);
          this.gfx.lineStyle(1.1, PALETTE.ETHEREAL_CYAN, 0.36);
          this.gfx.beginPath();
          this.gfx.moveTo(x, y + 6);
          this.gfx.lineTo(x, y - 24 + liftBob);
          this.gfx.strokePath();
          this.gfx.fillStyle(PALETTE.REMNANT_BRIGHT, 0.85);
          this.gfx.fillCircle(x, y - 24 + liftBob, 3);
        }
        break;
      }

      case 'reset_rune': {
        this.gfx.fillStyle(PALETTE.STONE_BASE, 1);
        this.gfx.fillRoundedRect(x - 10, y + 12, 20, 14, 3);
        this.gfx.lineStyle(1.4, PALETTE.REMNANT_GOLD, 0.7 + Math.sin(t * 3) * 0.2);
        this.gfx.strokeCircle(x, y + 4, 6);
        break;
      }

      case 'ending_arch': {
        this.gfx.fillStyle(0x121629, 0.96);
        this.gfx.fillRoundedRect(x - 44, y - 92, 88, 120, { tl: 42, tr: 42, bl: 4, br: 4 });
        this.gfx.lineStyle(2.5, PALETTE.REMNANT_GOLD, 0.88);
        this.gfx.strokeRoundedRect(x - 44, y - 92, 88, 120, { tl: 42, tr: 42, bl: 4, br: 4 });

        this.gfx.fillStyle(0x1d2645, 0.74 + Math.sin(t * 2.2) * 0.12);
        this.gfx.fillRoundedRect(x - 32, y - 80, 64, 104, { tl: 32, tr: 32, bl: 2, br: 2 });

        this.gfx.lineStyle(1.4, PALETTE.ETHEREAL_CYAN, 0.68);
        this.gfx.beginPath();
        this.gfx.moveTo(x - 22, y - 50);
        this.gfx.lineTo(x + 4, y - 22);
        this.gfx.lineTo(x + 24, y - 34);
        this.gfx.moveTo(x + 4, y - 22);
        this.gfx.lineTo(x - 12, y + 12);
        this.gfx.strokePath();
        break;
      }
    }
  }

  /**
   * Restrained astrolabe shimmer rendered only on nearby undiscovered Echo inscriptions
   * or Weaver clues while the Wayfarer's Compass-Lens relic is equipped.
   */
  private renderCompassResonance(t: number): void {
    if (this.compassResonance <= 0.01 || !this.isHiddenInscriptionCandidate()) return;
    const { x, y } = this.config;
    const s = this.compassResonance;

    const cycle = (t * 0.75) % 1;
    const pulseR = 18 + cycle * 24;
    const pulseAlpha = (1 - cycle) * (0.16 + 0.32 * s);

    this.gfx.lineStyle(1.4, PALETTE.GARMENT_GOLD_BRIGHT, pulseAlpha);
    this.gfx.strokeCircle(x, y - 4, pulseR);

    this.gfx.lineStyle(1.1, PALETTE.ETHEREAL_CYAN, 0.14 + 0.24 * s);
    this.gfx.beginPath();
    this.gfx.arc(x, y - 4, 24, t * 0.9, t * 0.9 + 2.1);
    this.gfx.strokePath();
    this.gfx.beginPath();
    this.gfx.arc(x, y - 4, 24, t * 0.9 + Math.PI, t * 0.9 + Math.PI + 2.1);
    this.gfx.strokePath();

    // Subtle 4-point compass glint above the inscription
    const sy = y - 34 + Math.sin(t * 3.1) * 2.2;
    const arm = 3.5 + s * 2.2;
    this.gfx.lineStyle(1.3, PALETTE.GARMENT_GOLD_BRIGHT, 0.28 + 0.45 * s);
    this.gfx.beginPath();
    this.gfx.moveTo(x - arm, sy);
    this.gfx.lineTo(x + arm, sy);
    this.gfx.moveTo(x, sy - arm);
    this.gfx.lineTo(x, sy + arm);
    this.gfx.strokePath();
  }
}
