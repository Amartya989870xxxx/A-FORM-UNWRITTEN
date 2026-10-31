import Phaser from 'phaser';
import { GAME_EVENTS, GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../constants';
import { AudioManager } from '../systems/AudioManager';
import type { ImprintDefinition } from '../systems/ImprintManager';
import type { QuestManager } from '../systems/QuestManager';
import type { RemnantManager } from '../systems/RemnantManager';

export class HUD {
  private readonly scene: Phaser.Scene;
  private readonly questManager: QuestManager;
  private readonly remnantManager: RemnantManager;

  private readonly root: Phaser.GameObjects.Container;
  private readonly leftCardBg: Phaser.GameObjects.Graphics;
  private readonly formTitleText: Phaser.GameObjects.Text;
  private readonly formDetailText: Phaser.GameObjects.Text;
  private readonly imprintText: Phaser.GameObjects.Text;

  private readonly questBg: Phaser.GameObjects.Graphics;
  private readonly questTitleText: Phaser.GameObjects.Text;
  private readonly questObjText: Phaser.GameObjects.Text;
  private readonly shortcutText: Phaser.GameObjects.Text;

  // Cinematic chapter banner
  private readonly chapterContainer: Phaser.GameObjects.Container;
  private readonly chapterTitleText: Phaser.GameObjects.Text;
  private readonly chapterSubText: Phaser.GameObjects.Text;
  private readonly chapterLine: Phaser.GameObjects.Graphics;

  // Atmospheric toast / whisper banner
  private readonly toastContainer: Phaser.GameObjects.Container;
  private readonly toastBg: Phaser.GameObjects.Graphics;
  private readonly toastText: Phaser.GameObjects.Text;
  private toastTween?: Phaser.Tweens.Tween;

  private activeImprint: ImprintDefinition | null = null;

  constructor(
    scene: Phaser.Scene,
    questManager: QuestManager,
    remnantManager: RemnantManager,
    initialImprint: ImprintDefinition | null
  ) {
    this.scene = scene;
    this.questManager = questManager;
    this.remnantManager = remnantManager;
    this.activeImprint = initialImprint;

    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(100);

    // Top-left Identity / Form Card
    this.leftCardBg = scene.add.graphics();
    this.formTitleText = scene.add.text(34, 24, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: PALETTE.TEXT_CYAN,
    });
    this.formDetailText = scene.add.text(34, 44, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: PALETTE.TEXT_MUTED,
    });
    this.imprintText = scene.add.text(34, 63, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      fontStyle: 'italic',
      color: PALETTE.TEXT_ROSE,
    });

    // Top-right Active Quest Tracker
    this.questBg = scene.add.graphics();
    this.questTitleText = scene.add.text(GAME_WIDTH - 32, 24, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: PALETTE.TEXT_GOLD,
      align: 'right',
    }).setOrigin(1, 0);

    this.questObjText = scene.add.text(GAME_WIDTH - 32, 45, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '12.5px',
      color: PALETTE.TEXT_LIGHT,
      align: 'right',
      wordWrap: { width: 350 },
    }).setOrigin(1, 0);

    this.shortcutText = scene.add.text(GAME_WIDTH - 32, 86, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: PALETTE.TEXT_MUTED,
      align: 'right',
    }).setOrigin(1, 0);

    this.root.add([
      this.leftCardBg,
      this.formTitleText,
      this.formDetailText,
      this.imprintText,
      this.questBg,
      this.questTitleText,
      this.questObjText,
      this.shortcutText,
    ]);

    // Chapter Banner
    this.chapterLine = scene.add.graphics();
    this.chapterTitleText = scene.add
      .text(0, -14, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '26px',
        color: PALETTE.TEXT_LIGHT,
        letterSpacing: 3,
      })
      .setOrigin(0.5);
    this.chapterSubText = scene.add
      .text(0, 18, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        fontStyle: 'italic',
        color: PALETTE.TEXT_MUTED,
      })
      .setOrigin(0.5);
    this.chapterContainer = scene.add
      .container(GAME_WIDTH / 2, 138, [
        this.chapterLine,
        this.chapterTitleText,
        this.chapterSubText,
      ])
      .setScrollFactor(0)
      .setDepth(102)
      .setAlpha(0);

    // Toast Whisper Banner
    this.toastBg = scene.add.graphics();
    this.toastText = scene.add
      .text(0, 0, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '13.5px',
        color: PALETTE.TEXT_LIGHT,
        align: 'center',
        wordWrap: { width: 640 },
      })
      .setOrigin(0.5);
    this.toastContainer = scene.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT - 105, [this.toastBg, this.toastText])
      .setScrollFactor(0)
      .setDepth(103)
      .setAlpha(0);

    this.bindEvents();
    this.refresh();
  }

  private bindEvents(): void {
    this.scene.events.on(GAME_EVENTS.QUEST_UPDATED, (payload: { type: string; quest: { title: string } }) => {
      this.refresh();
      AudioManager.getInstance().playQuestChime();
      if (payload.type === 'started') {
        this.showToast(`Quest Begun — ${payload.quest.title}`, 'gold');
      } else if (payload.type === 'completed') {
        this.showToast(`Quest Fulfilled — ${payload.quest.title}`, 'gold');
      }
    });

    this.scene.events.on(GAME_EVENTS.REMNANT_RESTORED, () => {
      this.refresh();
    });

    this.scene.events.on(GAME_EVENTS.IMPRINT_ACQUIRED, (imprint: ImprintDefinition) => {
      this.activeImprint = imprint;
      this.refresh();
      this.showToast(`${imprint.name} Etched Into Your Becoming`, 'gold', 4400);
    });
  }

  public refresh(): void {
    const hasWeight = this.remnantManager.hasWeight();

    // Update Form Medallion
    this.leftCardBg.clear();
    const cardH = this.activeImprint ? 76 : 56;
    this.leftCardBg.fillStyle(PALETTE.UI_BG, 0.78);
    this.leftCardBg.fillRoundedRect(20, 16, 290, cardH, 7);
    this.leftCardBg.lineStyle(
      1.2,
      hasWeight ? PALETTE.UI_BORDER_GOLD : PALETTE.UI_BORDER_CYAN,
      0.65
    );
    this.leftCardBg.strokeRoundedRect(20, 16, 290, cardH, 7);

    if (hasWeight) {
      this.formTitleText.setText('◆  Form: Grounded Vessel');
      this.formTitleText.setColor(PALETTE.TEXT_GOLD);
      this.formDetailText.setText('Remnant of Weight  •  S+Space: Ground Impact');
    } else {
      this.formTitleText.setText('◇  Form: Unbound Outline');
      this.formTitleText.setColor(PALETTE.TEXT_CYAN);
      this.formDetailText.setText('Weightless  •  Hold Space: Drift on Air');
    }

    if (this.activeImprint) {
      this.imprintText.setVisible(true);
      this.imprintText.setText(`✦  ${this.activeImprint.name} (${this.activeImprint.alignmentLabel})`);
      this.imprintText.setColor(this.activeImprint.textColor);
    } else {
      this.imprintText.setVisible(false);
    }

    // Update Quest Card
    const activeQuest = this.questManager.getActiveQuest();
    this.questBg.clear();
    if (activeQuest) {
      this.questTitleText.setText(activeQuest.definition.title);
      this.questObjText.setText(`▸ ${activeQuest.currentObjectiveText}`);
      const qWidth = Math.max(290, Math.max(this.questTitleText.width, this.questObjText.width) + 32);
      const qHeight = 86;
      this.questBg.fillStyle(PALETTE.UI_BG, 0.78);
      this.questBg.fillRoundedRect(GAME_WIDTH - 20 - qWidth, 16, qWidth, qHeight, 7);
      this.questBg.lineStyle(1, PALETTE.UI_BORDER_GOLD, 0.48);
      this.questBg.strokeRoundedRect(GAME_WIDTH - 20 - qWidth, 16, qWidth, qHeight, 7);
      this.shortcutText.y = 82;
    } else {
      this.questTitleText.setText('Journey Continues');
      this.questObjText.setText('Approach the threshold ahead');
      this.questBg.fillStyle(PALETTE.UI_BG, 0.72);
      this.questBg.fillRoundedRect(GAME_WIDTH - 290, 16, 270, 76, 7);
      this.shortcutText.y = 72;
    }

    const muted = AudioManager.getInstance().isMuted();
    this.shortcutText.setText(`[J] Journal   [M] Audio: ${muted ? 'Off' : 'On'}   [Esc] Pause`);
  }

  public showChapterCard(title: string, subtitle: string): void {
    this.chapterTitleText.setText(title.toUpperCase());
    this.chapterSubText.setText(subtitle);
    this.chapterLine.clear();
    this.chapterLine.lineStyle(1.2, PALETTE.REMNANT_GOLD, 0.75);
    this.chapterLine.beginPath();
    this.chapterLine.moveTo(-180, 4);
    this.chapterLine.lineTo(180, 4);
    this.chapterLine.strokePath();

    this.scene.tweens.killTweensOf(this.chapterContainer);
    this.chapterContainer.setAlpha(0);
    this.chapterContainer.y = 148;

    this.scene.tweens.add({
      targets: this.chapterContainer,
      alpha: 1,
      y: 136,
      duration: 750,
      ease: 'Sine.easeOut',
      hold: 2700,
      yoyo: true,
    });
  }

  public showToast(
    message: string,
    accent: 'cyan' | 'gold' = 'cyan',
    durationMs = 3400
  ): void {
    this.toastText.setText(message);
    const w = Math.min(700, this.toastText.width + 44);
    const h = Math.max(40, this.toastText.height + 22);

    this.toastBg.clear();
    this.toastBg.fillStyle(PALETTE.UI_BG, 0.92);
    this.toastBg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    this.toastBg.lineStyle(
      1.3,
      accent === 'gold' ? PALETTE.REMNANT_GOLD : PALETTE.UI_BORDER_CYAN,
      0.85
    );
    this.toastBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

    if (this.toastTween) {
      this.toastTween.stop();
    }
    this.toastContainer.setAlpha(0);
    this.toastContainer.y = GAME_HEIGHT - 96;

    this.toastTween = this.scene.tweens.add({
      targets: this.toastContainer,
      alpha: 1,
      y: GAME_HEIGHT - 108,
      duration: 280,
      ease: 'Sine.easeOut',
      hold: durationMs,
      yoyo: true,
    });
  }
}

