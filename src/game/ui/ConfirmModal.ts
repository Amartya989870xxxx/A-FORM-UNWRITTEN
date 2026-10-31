import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../constants';
import { AudioManager } from '../systems/AudioManager';

export interface ConfirmModalOptions {
  kicker?: string;
  title: string;
  body: string;
  cancelLabel?: string;
  confirmLabel: string;
  accent?: 'gold' | 'cyan';
  onCancel?: () => void;
  onConfirm: () => void;
}

/**
 * Reusable in-canvas confirmation dialogue for irreversible or destructive actions
 * (such as erasing saved progress on Restart/Replay or anchoring the Remnant of Weight).
 * Defaults initial selection to index 0 (Cancel) so accidental key taps preserve state.
 */
export class ConfirmModal {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private openState = false;
  private selectedIndex = 0; // 0 = Cancel (safe default), 1 = Confirm
  private currentOptions: ConfirmModalOptions | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setScrollFactor(0)
      .setDepth(185)
      .setVisible(false);
  }

  public getRootObjects(): Phaser.GameObjects.GameObject[] {
    return [this.container];
  }

  public isOpen(): boolean {
    return this.openState;
  }

  public getTitle(): string | null {
    return this.openState && this.currentOptions ? this.currentOptions.title : null;
  }

  public getSelectedIndex(): number {
    return this.selectedIndex;
  }

  public open(options: ConfirmModalOptions): void {
    this.currentOptions = options;
    this.openState = true;
    this.selectedIndex = 0; // Safe action (Cancel) focused first
    AudioManager.getInstance().playDialogueBlip();
    this.rebuild();
    this.container.setVisible(true);
  }

  public close(): void {
    this.openState = false;
    this.currentOptions = null;
    this.container.setVisible(false);
    this.container.removeAll(true);
  }

  public moveSelection(delta: number): void {
    if (!this.openState) return;
    this.selectedIndex = (this.selectedIndex + delta + 2) % 2;
    AudioManager.getInstance().playDialogueBlip();
    this.rebuild();
  }

  public setSelectedIndex(index: 0 | 1): void {
    if (!this.openState) return;
    if (this.selectedIndex !== index) {
      this.selectedIndex = index;
      AudioManager.getInstance().playDialogueBlip();
      this.rebuild();
    }
  }

  public cancel(): void {
    if (!this.openState) return;
    const cb = this.currentOptions?.onCancel;
    AudioManager.getInstance().playDialogueBlip();
    this.close();
    cb?.();
  }

  public confirmSelection(): void {
    if (!this.openState || !this.currentOptions) return;
    if (this.selectedIndex === 0) {
      this.cancel();
      return;
    }
    const cb = this.currentOptions.onConfirm;
    AudioManager.getInstance().playInteract();
    this.close();
    cb();
  }

  private rebuild(): void {
    this.container.removeAll(true);
    const opts = this.currentOptions;
    if (!opts) return;

    const backdrop = this.scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050711, 0.86)
      .setInteractive();

    const w = 740;
    const h = 380;
    const borderColor =
      opts.accent === 'cyan' ? PALETTE.UI_BORDER_CYAN : PALETTE.REMNANT_GOLD;

    const panel = this.scene.add.graphics();
    panel.fillStyle(PALETTE.UI_BG, 0.98);
    panel.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    panel.lineStyle(2, borderColor, 0.9);
    panel.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    panel.lineStyle(1, borderColor, 0.25);
    panel.strokeRoundedRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 10);

    this.container.add([backdrop, panel]);

    if (opts.kicker) {
      const kickerText = this.scene.add
        .text(0, -h / 2 + 38, opts.kicker.toUpperCase(), {
          fontFamily: 'Georgia, serif',
          fontSize: '12.5px',
          color: opts.accent === 'cyan' ? PALETTE.TEXT_CYAN : PALETTE.TEXT_GOLD,
          letterSpacing: 2.5,
        })
        .setOrigin(0.5);
      this.container.add(kickerText);
    }

    const titleText = this.scene.add
      .text(0, -h / 2 + (opts.kicker ? 70 : 54), opts.title, {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_LIGHT,
        letterSpacing: 1.5,
        align: 'center',
      })
      .setOrigin(0.5);

    const bodyText = this.scene.add
      .text(0, -8, opts.body, {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: PALETTE.TEXT_MUTED,
        align: 'center',
        lineSpacing: 7,
        wordWrap: { width: w - 96 },
      })
      .setOrigin(0.5);

    const hintText = this.scene.add
      .text(
        0,
        h / 2 - 26,
        '[ A/D or Arrows: Choose   •   Space/Enter: Select   •   Esc: Cancel ]',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '12.5px',
          color: PALETTE.TEXT_MUTED,
        }
      )
      .setOrigin(0.5);

    this.container.add([titleText, bodyText, hintText]);

    const labels = [opts.cancelLabel ?? 'Cancel', opts.confirmLabel];
    const btnW = 290;
    const btnH = 52;
    const btnY = h / 2 - 80;

    labels.forEach((label, idx) => {
      const selected = idx === this.selectedIndex;
      const isConfirm = idx === 1;
      const x = (idx === 0 ? -1 : 1) * 164;

      const bg = this.scene.add.graphics();
      const fill = selected
        ? isConfirm
          ? 0x2a2035
          : 0x1a2342
        : 0x10162a;
      const stroke = selected
        ? isConfirm
          ? PALETTE.REMNANT_GOLD
          : PALETTE.UI_BORDER_CYAN
        : PALETTE.STONE_HIGHLIGHT;

      bg.fillStyle(fill, 0.96);
      bg.fillRoundedRect(x - btnW / 2, btnY - btnH / 2, btnW, btnH, 9);
      bg.lineStyle(selected ? 2 : 1.1, stroke, selected ? 0.96 : 0.45);
      bg.strokeRoundedRect(x - btnW / 2, btnY - btnH / 2, btnW, btnH, 9);

      const txt = this.scene.add
        .text(
          x,
          btnY,
          `${selected ? '◆  ' : ''}${label}`,
          {
            fontFamily: 'Georgia, serif',
            fontSize: '16px',
            fontStyle: selected ? 'bold' : 'normal',
            color: selected
              ? isConfirm
                ? PALETTE.TEXT_GOLD
                : PALETTE.TEXT_CYAN
              : PALETTE.TEXT_LIGHT,
          }
        )
        .setOrigin(0.5);

      const hit = this.scene.add
        .rectangle(x, btnY, btnW, btnH, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (this.selectedIndex !== idx) {
          this.selectedIndex = idx;
          AudioManager.getInstance().playDialogueBlip();
          this.rebuild();
        }
      });

      hit.on('pointerdown', () => {
        this.selectedIndex = idx;
        this.confirmSelection();
      });

      this.container.add([bg, txt, hit]);
    });
  }
}
