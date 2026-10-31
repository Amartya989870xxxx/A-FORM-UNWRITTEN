import Phaser from 'phaser';
import { PALETTE } from '../constants';

export type InteractableKind =
  | 'npc'
  | 'conduit'
  | 'vane'
  | 'echo'
  | 'remnant_weight'
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
  onInteract: () => void;
}

export class Interactable {
  public readonly config: InteractableConfig;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly promptContainer: Phaser.GameObjects.Container;
  private readonly promptBg: Phaser.GameObjects.Graphics;
  private readonly promptText: Phaser.GameObjects.Text;
  private inRange = false;

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

    this.promptContainer = scene.add.container(config.x, config.y - 54, [
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
    return this.config.radius ?? 68;
  }

  public update(time: number): void {
    const t = time * 0.001;
    this.gfx.clear();
    this.renderObject(t);

    const promptLabel = this.inRange ? this.config.getPrompt() : null;
    if (promptLabel) {
      this.promptText.setText(`[E]  ${promptLabel}`);
      const padX = 14;
      const w = this.promptText.width + padX * 2;
      const h = 28;
      this.promptBg.clear();
      this.promptBg.fillStyle(PALETTE.UI_BG, 0.9);
      this.promptBg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
      this.promptBg.lineStyle(
        1.2,
        this.config.kind === 'remnant_weight' ? PALETTE.REMNANT_GOLD : PALETTE.UI_BORDER_CYAN,
        0.85
      );
      this.promptBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);

      this.promptContainer.y = this.config.y - 58 + Math.sin(t * 3.2) * 2.5;
      this.promptContainer.alpha = Phaser.Math.Linear(this.promptContainer.alpha, 1, 0.22);
    } else {
      this.promptContainer.alpha = Phaser.Math.Linear(this.promptContainer.alpha, 0, 0.22);
    }
  }

  private renderObject(t: number): void {
    const { x, y, kind } = this.config;
    const active = this.config.isActivated?.() ?? false;

    switch (kind) {
      case 'npc':
        // Rendered by dedicated NPC class
        break;

      case 'conduit': {
        // Ancient Resonance Spire Pylon
        this.gfx.fillStyle(PALETTE.STONE_BASE, 1);
        this.gfx.beginPath();
        this.gfx.moveTo(x - 16, y + 26);
        this.gfx.lineTo(x - 10, y - 26);
        this.gfx.lineTo(x, y - 38);
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
        // Ancient Wind Vane Switch
        this.gfx.fillStyle(PALETTE.STONE_DARK, 1);
        this.gfx.fillRect(x - 12, y + 6, 24, 20);
        this.gfx.lineStyle(3, PALETTE.STONE_HIGHLIGHT, 1);
        this.gfx.beginPath();
        this.gfx.moveTo(x, y + 6);
        this.gfx.lineTo(x, y - 20);
        this.gfx.strokePath();

        // Spinning vane blades oriented vertically when active
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
        // Inscribed Echo Stele Tablet
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

      case 'remnant_weight': {
        // Altar & hovering Remnant of Weight sphere (disappears into warm ember after claimed)
        this.gfx.fillStyle(PALETTE.STONE_DARK, 1);
        this.gfx.fillRoundedRect(x - 28, y + 10, 56, 18, 4);
        this.gfx.lineStyle(1.5, PALETTE.REMNANT_BRONZE, 0.8);
        this.gfx.strokeRoundedRect(x - 28, y + 10, 56, 18, 4);

        if (!active) {
          const oy = y - 16 + Math.sin(t * 2.4) * 4.5;
          this.gfx.fillStyle(PALETTE.REMNANT_GOLD, 0.16);
          this.gfx.fillCircle(x, oy, 34 + Math.sin(t * 3.5) * 3);
          this.gfx.fillStyle(PALETTE.REMNANT_GOLD, 0.32);
          this.gfx.fillCircle(x, oy, 20);
          this.gfx.fillStyle(PALETTE.REMNANT_BRIGHT, 0.98);
          this.gfx.fillCircle(x, oy, 10.5);
          this.gfx.lineStyle(1.8, PALETTE.REMNANT_GOLD, 0.85);
          this.gfx.strokeEllipse(x, oy, 42, 14);

          // Orbiting iron-gold fragments
          for (let i = 0; i < 4; i++) {
            const a = t * 1.9 + (i * Math.PI) / 2;
            this.gfx.fillStyle(PALETTE.REMNANT_BRIGHT, 0.9);
            this.gfx.fillCircle(x + Math.cos(a) * 21, oy + Math.sin(a) * 7, 2.4);
          }
        } else {
          // Restored altar lingering warmth
          this.gfx.fillStyle(PALETTE.REMNANT_GOLD, 0.18);
          this.gfx.fillCircle(x, y + 6, 14);
        }
        break;
      }

      case 'reset_rune': {
        // Small floor glyph allowing safe reset of nearby heavy stone block
        this.gfx.fillStyle(PALETTE.STONE_BASE, 1);
        this.gfx.fillRoundedRect(x - 10, y + 12, 20, 14, 3);
        this.gfx.lineStyle(1.4, PALETTE.REMNANT_GOLD, 0.7 + Math.sin(t * 3) * 0.2);
        this.gfx.strokeCircle(x, y + 4, 6);
        break;
      }

      case 'ending_arch': {
        // Towering Fractured Mirror-Arch at the Sanctum threshold
        this.gfx.fillStyle(0x121629, 0.96);
        this.gfx.fillRoundedRect(x - 42, y - 88, 84, 116, { tl: 40, tr: 40, bl: 4, br: 4 });
        this.gfx.lineStyle(2.5, PALETTE.REMNANT_GOLD, 0.85);
        this.gfx.strokeRoundedRect(x - 42, y - 88, 84, 116, { tl: 40, tr: 40, bl: 4, br: 4 });

        // Shimmering obsidian mirror surface with broken chain motif inside
        this.gfx.fillStyle(0x1d2645, 0.72 + Math.sin(t * 2.2) * 0.12);
        this.gfx.fillRoundedRect(x - 30, y - 76, 60, 100, { tl: 30, tr: 30, bl: 2, br: 2 });

        // Diagonal mirror fracture lines
        this.gfx.lineStyle(1.4, PALETTE.ETHEREAL_CYAN, 0.65);
        this.gfx.beginPath();
        this.gfx.moveTo(x - 22, y - 48);
        this.gfx.lineTo(x + 4, y - 22);
        this.gfx.lineTo(x + 24, y - 34);
        this.gfx.moveTo(x + 4, y - 22);
        this.gfx.lineTo(x - 12, y + 12);
        this.gfx.strokePath();
        break;
      }
    }
  }
}

