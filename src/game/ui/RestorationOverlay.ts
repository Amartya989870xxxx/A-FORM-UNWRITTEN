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

  public getRootObjects(): Phaser.GameObjects.GameObject[] {
    return [this.container];
  }

  public isOpen(): boolean {
    return this.openState;
  }

  public show(def: RemnantDefinition, onDismiss: () => void): void {
    this.openState = true;
    this.onDismiss = onDismiss;
    this.container.removeAll(true);

    const backdrop = this.scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050711, 0.82)
      .setInteractive();

    const w = 840;
    const h = 470;
    const panel = this.scene.add.graphics();
    panel.fillStyle(PALETTE.UI_BG, 0.98);
    panel.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    panel.lineStyle(2.2, PALETTE.REMNANT_GOLD, 0.94);
    panel.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    panel.lineStyle(1, PALETTE.REMNANT_BRONZE, 0.48);
    panel.strokeRoundedRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 10);

    const header = this.scene.add
      .text(0, -182, 'GARMENT STABILIZATION ACHIEVED', {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: PALETTE.TEXT_GOLD,
        letterSpacing: 4,
      })
      .setOrigin(0.5);

    const title = this.scene.add
      .text(0, -138, def.name.toUpperCase(), {
        fontFamily: 'Georgia, serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_LIGHT,
      })
      .setOrigin(0.5);

    const lore = this.scene.add
      .text(0, -76, `"${def.lore}"`, {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        fontStyle: 'italic',
        color: PALETTE.TEXT_MUTED,
        align: 'center',
        lineSpacing: 4,
        wordWrap: { width: w - 110 },
      })
      .setOrigin(0.5);

    const gainedBox = this.scene.add.graphics();
    gainedBox.fillStyle(0x161f36, 0.92);
    gainedBox.fillRoundedRect(-w / 2 + 44, -18, w - 88, 86, 8);
    gainedBox.lineStyle(1.4, PALETTE.REMNANT_GOLD, 0.75);
    gainedBox.strokeRoundedRect(-w / 2 + 44, -18, w - 88, 86, 8);

    const gainedText = this.scene.add
      .text(0, 25, `◆ ANCHORED: ${def.gainedSummary}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '15.5px',
        color: PALETTE.TEXT_GOLD,
        align: 'center',
        lineSpacing: 4,
        wordWrap: { width: w - 124 },
      })
      .setOrigin(0.5);

    const lostBox = this.scene.add.graphics();
    lostBox.fillStyle(0x171429, 0.92);
    lostBox.fillRoundedRect(-w / 2 + 44, 82, w - 88, 76, 8);
    lostBox.lineStyle(1.4, PALETTE.ETHEREAL_BLUE, 0.58);
    lostBox.strokeRoundedRect(-w / 2 + 44, 82, w - 88, 76, 8);

    const lostText = this.scene.add
      .text(0, 120, `◇ SURRENDERED: ${def.lostSummary}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '15.5px',
        color: PALETTE.TEXT_CYAN,
        align: 'center',
        lineSpacing: 4,
        wordWrap: { width: w - 124 },
      })
      .setOrigin(0.5);

    const prompt = this.scene.add
      .text(0, 194, '[ Press SPACE or E to Stand Upon the Earth ]', {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
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
