import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../constants';
import { AudioManager } from '../systems/AudioManager';
import type { DialogueChoice, DialogueManager } from '../systems/DialogueManager';

export class DialogueBox {
  private readonly scene: Phaser.Scene;
  private readonly manager: DialogueManager;
  private readonly container: Phaser.GameObjects.Container;
  private readonly panelGfx: Phaser.GameObjects.Graphics;
  private readonly speakerText: Phaser.GameObjects.Text;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly bodyText: Phaser.GameObjects.Text;
  private readonly continueHint: Phaser.GameObjects.Text;
  private readonly choiceContainer: Phaser.GameObjects.Container;

  private fullText = '';
  private revealedChars = 0;
  private charAccumMs = 0;
  private typingComplete = true;
  private selectedChoiceIndex = 0;
  private currentChoices: DialogueChoice[] = [];
  private onCloseCallback?: () => void;

  private readonly boxW = 840;
  private readonly boxH = 215;

  constructor(scene: Phaser.Scene, manager: DialogueManager) {
    this.scene = scene;
    this.manager = manager;

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT - 152;

    this.panelGfx = scene.add.graphics();
    this.speakerText = scene.add.text(-this.boxW / 2 + 28, -this.boxH / 2 + 18, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: PALETTE.TEXT_GOLD,
    });

    this.titleText = scene.add.text(-this.boxW / 2 + 115, -this.boxH / 2 + 21, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      fontStyle: 'italic',
      color: PALETTE.TEXT_MUTED,
    });

    this.bodyText = scene.add.text(-this.boxW / 2 + 28, -this.boxH / 2 + 52, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '15.5px',
      color: PALETTE.TEXT_LIGHT,
      lineSpacing: 6,
      wordWrap: { width: this.boxW - 56 },
    });

    this.continueHint = scene.add
      .text(this.boxW / 2 - 26, this.boxH / 2 - 20, '[SPACE / E] Continue ▾', {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: PALETTE.TEXT_CYAN,
      })
      .setOrigin(1, 0.5);

    this.choiceContainer = scene.add.container(0, 22);

    this.container = scene.add
      .container(cx, cy, [
        this.panelGfx,
        this.speakerText,
        this.titleText,
        this.bodyText,
        this.continueHint,
        this.choiceContainer,
      ])
      .setScrollFactor(0)
      .setDepth(130)
      .setVisible(false);
  }

  public isVisible(): boolean {
    return this.container.visible;
  }

  public open(onClose?: () => void): void {
    this.onCloseCallback = onClose;
    this.container.setVisible(true);
    this.renderCurrentNode();
  }

  public renderCurrentNode(): void {
    const node = this.manager.getCurrentNode();
    if (!node) {
      this.hide();
      return;
    }

    this.speakerText.setText(node.speaker);
    this.titleText.setPosition(-this.boxW / 2 + 38 + this.speakerText.width, -this.boxH / 2 + 21);
    this.titleText.setText(node.speakerTitle ? `— ${node.speakerTitle}` : '');

    this.fullText = this.manager.getResolvedText();
    this.revealedChars = 0;
    this.charAccumMs = 0;
    this.typingComplete = false;
    this.bodyText.setText('');

    this.currentChoices = this.manager.getAvailableChoices();
    this.selectedChoiceIndex = 0;
    this.choiceContainer.removeAll(true);
    this.continueHint.setVisible(false);

    this.drawPanel(this.currentChoices.length > 0 ? 245 : 190);
  }

  private drawPanel(height: number): void {
    this.panelGfx.clear();
    this.panelGfx.fillStyle(PALETTE.UI_BG, 0.985);
    this.panelGfx.fillRoundedRect(-this.boxW / 2, -this.boxH / 2, this.boxW, height, 10);
    this.panelGfx.lineStyle(1.6, PALETTE.REMNANT_GOLD, 0.78);
    this.panelGfx.strokeRoundedRect(-this.boxW / 2, -this.boxH / 2, this.boxW, height, 10);

    // Subtle divider under speaker header
    this.panelGfx.lineStyle(1, PALETTE.STONE_HIGHLIGHT, 0.4);
    this.panelGfx.beginPath();
    this.panelGfx.moveTo(-this.boxW / 2 + 26, -this.boxH / 2 + 44);
    this.panelGfx.lineTo(this.boxW / 2 - 26, -this.boxH / 2 + 44);
    this.panelGfx.strokePath();
  }

  public update(delta: number): void {
    if (!this.container.visible) return;

    if (!this.typingComplete) {
      this.charAccumMs += delta;
      const charsToAdd = Math.floor(this.charAccumMs / 16);
      if (charsToAdd > 0) {
        this.charAccumMs %= 16;
        const prev = this.revealedChars;
        this.revealedChars = Math.min(this.fullText.length, this.revealedChars + charsToAdd);
        this.bodyText.setText(this.fullText.slice(0, this.revealedChars));
        if (Math.floor(this.revealedChars / 5) > Math.floor(prev / 5)) {
          AudioManager.getInstance().playDialogueBlip();
        }
        if (this.revealedChars >= this.fullText.length) {
          this.finishTyping();
        }
      }
    }
  }

  public moveChoiceSelection(deltaIndex: number): void {
    if (!this.typingComplete || this.currentChoices.length === 0) return;
    this.selectedChoiceIndex =
      (this.selectedChoiceIndex + deltaIndex + this.currentChoices.length) %
      this.currentChoices.length;
    AudioManager.getInstance().playDialogueBlip();
    this.rebuildChoices();
  }

  public selectChoiceByNumber(numOneBased: number): void {
    if (!this.typingComplete || this.currentChoices.length === 0) return;
    const idx = numOneBased - 1;
    if (idx >= 0 && idx < this.currentChoices.length) {
      this.selectedChoiceIndex = idx;
      this.confirmOrAdvance();
    }
  }

  public confirmOrAdvance(): void {
    if (!this.container.visible) return;

    if (!this.typingComplete) {
      this.finishTyping();
      return;
    }

    AudioManager.getInstance().playInteract();
    if (this.currentChoices.length > 0) {
      const next = this.manager.advance(this.selectedChoiceIndex);
      if (next) {
        this.renderCurrentNode();
      } else {
        this.hide();
      }
    } else {
      const next = this.manager.advance();
      if (next) {
        this.renderCurrentNode();
      } else {
        this.hide();
      }
    }
  }

  private finishTyping(): void {
    this.typingComplete = true;
    this.revealedChars = this.fullText.length;
    this.bodyText.setText(this.fullText);

    if (this.currentChoices.length > 0) {
      this.continueHint.setVisible(false);
      this.rebuildChoices();
    } else {
      this.continueHint.setVisible(true);
    }
  }

  private rebuildChoices(): void {
    this.choiceContainer.removeAll(true);
    const startY = 12;
    const rowH = 38;

    this.currentChoices.forEach((choice, idx) => {
      const selected = idx === this.selectedChoiceIndex;
      const y = startY + idx * (rowH + 7);
      const w = this.boxW - 56;

      const bg = this.scene.add.graphics();
      const borderColor =
        choice.accent === 'becoming'
          ? PALETTE.IMPRINT_RESONANCE
          : choice.accent === 'original'
            ? PALETTE.IMPRINT_RESOLVE
            : selected
              ? PALETTE.ETHEREAL_CYAN
              : PALETTE.STONE_HIGHLIGHT;

      bg.fillStyle(selected ? 0x1b2442 : 0x10162a, 0.96);
      bg.fillRoundedRect(-w / 2, y - rowH / 2, w, rowH, 6);
      bg.lineStyle(selected ? 1.8 : 1, borderColor, selected ? 0.98 : 0.55);
      bg.strokeRoundedRect(-w / 2, y - rowH / 2, w, rowH, 6);

      const labelColor =
        choice.accent === 'becoming'
          ? PALETTE.TEXT_ROSE
          : choice.accent === 'original'
            ? PALETTE.TEXT_VIOLET
            : selected
              ? PALETTE.TEXT_CYAN
              : PALETTE.TEXT_LIGHT;

      const txt = this.scene.add
        .text(-w / 2 + 16, y, `${selected ? '◆' : '◇'}  ${idx + 1}. ${choice.label}`, {
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          color: labelColor,
        })
        .setOrigin(0, 0.5);

      const hit = this.scene.add
        .rectangle(0, y, w, rowH, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (this.selectedChoiceIndex !== idx) {
          this.selectedChoiceIndex = idx;
          this.rebuildChoices();
        }
      });
      hit.on('pointerdown', () => {
        this.selectedChoiceIndex = idx;
        this.confirmOrAdvance();
      });

      this.choiceContainer.add([bg, txt, hit]);
    });
  }

  private hide(): void {
    this.container.setVisible(false);
    const cb = this.onCloseCallback;
    this.onCloseCallback = undefined;
    cb?.();
  }
}

