import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../constants';
import { AudioManager } from '../systems/AudioManager';
import type { RemnantDefinition } from '../systems/RemnantManager';

export class RestorationOverlay {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private openState = false;
  private onDismiss?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setScrollFactor(0)
      .setDepth(150)
      .setVisible(false);
  }

  public isOpen(): boolean {
    return this.openState;
  }

  public show(def: RemnantDefinition, onDismiss: () => void): void {
    this.openState = true;
    this.onDismiss = onDismiss;
    this.container.removeAll(true);

    const backdrop = this.scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050711, 0.78)
      .setInteractive();

    const w = 680;
    const h = 390;
    const panel = this.scene.add.graphics();
    panel.fillStyle(PALETTE.UI_BG, 0.97);
    panel.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    panel.lineStyle(2, PALETTE.REMNANT_GOLD, 0.92);
    panel.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    panel.lineStyle(1, PALETTE.REMNANT_BRONZE, 0.45);
    panel.strokeRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 9);

    const header = this.scene.add
      .text(0, -148, 'REMNANT RESTORED', {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: PALETTE.TEXT_GOLD,
        letterSpacing: 4,
      })
      .setOrigin(0.5);

    const title = this.scene.add
      .text(0, -112, def.name.toUpperCase(), {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_LIGHT,
      })
      .setOrigin(0.5);

    const lore = this.scene.add
      .text(0, -64, `"${def.lore}"`, {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        fontStyle: 'italic',
        color: PALETTE.TEXT_MUTED,
        align: 'center',
        wordWrap: { width: w - 90 },
      })
      .setOrigin(0.5);

    const gainedBox = this.scene.add.graphics();
    gainedBox.fillStyle(0x161f36, 0.9);
    gainedBox.fillRoundedRect(-w / 2 + 36, -18, w - 72, 74, 7);
    gainedBox.lineStyle(1.2, PALETTE.REMNANT_GOLD, 0.7);
    gainedBox.strokeRoundedRect(-w / 2 + 36, -18, w - 72, 74, 7);

    const gainedText = this.scene.add
      .text(0, 19, `◆ AWAKENED — ${def.gainedSummary}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '13.5px',
        color: PALETTE.TEXT_GOLD,
        align: 'center',
        wordWrap: { width: w - 104 },
      })
      .setOrigin(0.5);

    const lostBox = this.scene.add.graphics();
    lostBox.fillStyle(0x171429, 0.9);
    lostBox.fillRoundedRect(-w / 2 + 36, 68, w - 72, 64, 7);
    lostBox.lineStyle(1.2, PALETTE.ETHEREAL_BLUE, 0.55);
    lostBox.strokeRoundedRect(-w / 2 + 36, 68, w - 72, 64, 7);

    const lostText = this.scene.add
      .text(0, 100, `◇ SURRENDERED — ${def.lostSummary}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '13.5px',
        color: PALETTE.TEXT_CYAN,
        align: 'center',
        wordWrap: { width: w - 104 },
      })
      .setOrigin(0.5);

    const prompt = this.scene.add
      .text(0, 162, '[ Press SPACE or E to Stand Upon the Earth ]', {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: PALETTE.TEXT_LIGHT,
      })
      .setOrigin(0.5);

    backdrop.on('pointerdown', () => this.dismiss());

    this.container.add([
      backdrop,
      panel,
      header,
      title,
      lore,
      gainedBox,
      gainedText,
      lostBox,
      lostText,
      prompt,
    ]);

    this.container.setVisible(true);
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 380,
      ease: 'Sine.easeOut',
    });
  }

  public dismiss(): void {
    if (!this.openState) return;
    this.openState = false;
    AudioManager.getInstance().playInteract();
    this.container.setVisible(false);
    const cb = this.onDismiss;
    this.onDismiss = undefined;
    cb?.();
  }
}

