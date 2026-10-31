import Phaser from 'phaser';
import {
  GAME_EVENTS,
  GAME_HEIGHT,
  GAME_WIDTH,
  PALETTE,
  type AdventurerRank,
} from '../constants';
import type { RelicDef } from '../data/quests';
import { AudioManager } from '../systems/AudioManager';
import type { ExplorationManager, MapLocationDef } from '../systems/ExplorationManager';
import type { ImprintDefinition } from '../systems/ImprintManager';
import type { QuestManager } from '../systems/QuestManager';
import type { RemnantManager } from '../systems/RemnantManager';

export class HUD {
  private readonly scene: Phaser.Scene;
  private readonly questManager: QuestManager;
  private readonly remnantManager: RemnantManager;
  private readonly explorationManager: ExplorationManager;
  private readonly getPlayerMeta: () => {
    playerName: string;
    adventurerRank: AdventurerRank;
    relicCount: number;
  };

  private readonly root: Phaser.GameObjects.Container;
  private readonly leftCardBg: Phaser.GameObjects.Graphics;
  private readonly identityText: Phaser.GameObjects.Text;
  private readonly formTitleText: Phaser.GameObjects.Text;
  private readonly formDetailText: Phaser.GameObjects.Text;
  private readonly imprintText: Phaser.GameObjects.Text;
  private readonly relicText: Phaser.GameObjects.Text;

  private readonly questBg: Phaser.GameObjects.Graphics;
  private readonly questMetaText: Phaser.GameObjects.Text;
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
    explorationManager: ExplorationManager,
    initialImprint: ImprintDefinition | null,
    getPlayerMeta: () => {
      playerName: string;
      adventurerRank: AdventurerRank;
      relicCount: number;
    }
  ) {
    this.scene = scene;
    this.questManager = questManager;
    this.remnantManager = remnantManager;
    this.explorationManager = explorationManager;
    this.activeImprint = initialImprint;
    this.getPlayerMeta = getPlayerMeta;

    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(100);

    // Top-left Identity & Stabilizing Garment Status Card
    this.leftCardBg = scene.add.graphics();
    this.identityText = scene.add.text(40, 28, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: PALETTE.TEXT_LIGHT,
    });
    this.formTitleText = scene.add.text(40, 52, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: PALETTE.TEXT_CYAN,
    });
    this.formDetailText = scene.add.text(40, 76, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '13.5px',
      color: PALETTE.TEXT_MUTED,
    });
    this.imprintText = scene.add.text(40, 100, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '13.5px',
      fontStyle: 'italic',
      color: PALETTE.TEXT_ROSE,
    });
    this.relicText = scene.add.text(40, 122, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      fontStyle: 'italic',
      color: PALETTE.TEXT_GOLD,
    });

    // Top-right Active Quest Tracker
    this.questBg = scene.add.graphics();
    this.questMetaText = scene.add
      .text(GAME_WIDTH - 40, 27, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: PALETTE.TEXT_MUTED,
        align: 'right',
        letterSpacing: 1,
      })
      .setOrigin(1, 0);

    this.questTitleText = scene.add
      .text(GAME_WIDTH - 40, 46, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '17px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_GOLD,
        align: 'right',
      })
      .setOrigin(1, 0);

    this.questObjText = scene.add
      .text(GAME_WIDTH - 40, 72, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '14.5px',
        color: PALETTE.TEXT_LIGHT,
        align: 'right',
        wordWrap: { width: 450 },
      })
      .setOrigin(1, 0);

    this.shortcutText = scene.add
      .text(GAME_WIDTH - 40, 118, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '12.5px',
        color: PALETTE.TEXT_MUTED,
        align: 'right',
      })
      .setOrigin(1, 0);

    this.root.add([
      this.leftCardBg,
      this.identityText,
      this.formTitleText,
      this.formDetailText,
      this.imprintText,
      this.relicText,
      this.questBg,
      this.questMetaText,
      this.questTitleText,
      this.questObjText,
      this.shortcutText,
    ]);

    // Chapter Banner (positioned cleanly in top-center sky band above Crucible Zenith Dome Seal)
    this.chapterLine = scene.add.graphics();
    this.chapterTitleText = scene.add
      .text(0, -14, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        color: PALETTE.TEXT_LIGHT,
        letterSpacing: 3.2,
      })
      .setOrigin(0.5);
    this.chapterSubText = scene.add
      .text(0, 19, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '15.5px',
        fontStyle: 'italic',
        color: PALETTE.TEXT_MUTED,
      })
      .setOrigin(0.5);
    this.chapterContainer = scene.add
      .container(GAME_WIDTH / 2, 74, [
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
        fontSize: '16px',
        color: PALETTE.TEXT_LIGHT,
        align: 'center',
        wordWrap: { width: 820 },
      })
      .setOrigin(0.5);
    this.toastContainer = scene.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT - 125, [this.toastBg, this.toastText])
      .setScrollFactor(0)
      .setDepth(103)
      .setAlpha(0);

    this.bindEvents();
    this.refresh();
  }

  public getRootObjects(): Phaser.GameObjects.GameObject[] {
    return [this.root, this.chapterContainer, this.toastContainer];
  }

  private bindEvents(): void {
    this.scene.events.on(
      GAME_EVENTS.QUEST_UPDATED,
      (payload: { type: string; quest: { title: string; category?: string } }) => {
        this.refresh();
        AudioManager.getInstance().playQuestChime();
        const prefix = payload.quest.category === 'Hidden' ? 'Hidden Quest' : 'Quest';
        if (payload.type === 'started') {
          this.showToast(`${prefix} Discovered: ${payload.quest.title}`, 'gold');
        } else if (payload.type === 'completed') {
          this.showToast(`${prefix} Fulfilled: ${payload.quest.title}`, 'gold', 4000);
        }
      }
    );

    this.scene.events.on(GAME_EVENTS.REMNANT_RESTORED, () => {
      this.refresh();
    });

    this.scene.events.on(GAME_EVENTS.IMPRINT_ACQUIRED, (imprint: ImprintDefinition) => {
      this.activeImprint = imprint;
      this.refresh();
      this.showToast(`${imprint.name} Etched Into Your Becoming`, 'gold', 4400);
    });

    this.scene.events.on(GAME_EVENTS.LOCATION_DISCOVERED, (loc: MapLocationDef) => {
      this.refresh();
      this.showToast(`Landmark Charted: ${loc.name}  (Press TAB for World Atlas)`, 'cyan', 3300);
    });

    this.scene.events.on(GAME_EVENTS.RELIC_ACQUIRED, (relic: RelicDef) => {
      this.refresh();
      this.showToast(`Rare Relic Recovered: ${relic.name}`, 'gold', 4400);
    });
  }

  public refresh(): void {
    const hasWeight = this.remnantManager.hasWeight();
    const meta = this.getPlayerMeta();
    const regionPct = this.explorationManager.getRegionExplorationPercent();

    this.identityText.setText(
      `${meta.playerName}   •   Rank ${meta.adventurerRank}   •   Verge ${regionPct.toFixed(0)}%`
    );

    if (hasWeight) {
      this.formTitleText.setText('◆  Garment: Grounded State');
      this.formTitleText.setColor(PALETTE.TEXT_GOLD);
      this.formDetailText.setText('Remnant of Weight  •  S+Space: Ground Impact');
    } else {
      this.formTitleText.setText('◇  Garment: Unanchored State');
      this.formTitleText.setColor(PALETTE.TEXT_CYAN);
      this.formDetailText.setText('Unmoored Presence  •  Hold Space: Drift on Wind');
    }

    let nextExtraY = 100;
    if (this.activeImprint) {
      this.imprintText.setPosition(40, nextExtraY);
      this.imprintText.setVisible(true);
      this.imprintText.setText(
        `✦  ${this.activeImprint.name} (${this.activeImprint.alignmentLabel})`
      );
      this.imprintText.setColor(this.activeImprint.textColor);
      nextExtraY += 22;
    } else {
      this.imprintText.setVisible(false);
    }

    if (meta.relicCount > 0) {
      this.relicText.setPosition(40, nextExtraY);
      this.relicText.setVisible(true);
      this.relicText.setText('◈  Wayfarer’s Compass-Lens Equipped');
      this.relicText.setColor(PALETTE.TEXT_GOLD);
      nextExtraY += 22;
    } else {
      this.relicText.setVisible(false);
    }

    const extraRows = (this.imprintText.visible ? 1 : 0) + (this.relicText.visible ? 1 : 0);
    const leftW = Math.max(
      370,
      Math.max(
        this.identityText.width,
        this.formTitleText.width,
        this.formDetailText.width,
        this.imprintText.visible ? this.imprintText.width : 0,
        this.relicText.visible ? this.relicText.width : 0
      ) + 42
    );
    const cardH = 88 + extraRows * 23;
    this.leftCardBg.clear();
    this.leftCardBg.fillStyle(PALETTE.UI_BG, 0.82);
    this.leftCardBg.fillRoundedRect(24, 18, leftW, cardH, 9);
    this.leftCardBg.lineStyle(
      1.3,
      hasWeight ? PALETTE.UI_BORDER_GOLD : PALETTE.UI_BORDER_CYAN,
      0.72
    );
    this.leftCardBg.strokeRoundedRect(24, 18, leftW, cardH, 9);

    // Update Quest Card
    const activeQuest = this.questManager.getActiveQuest();
    this.questBg.clear();
    if (activeQuest) {
      const def = activeQuest.definition;
      this.questMetaText.setText(`RANK ${def.rank}   •   ${def.mysteryAge.toUpperCase()}`);
      this.questTitleText.setText(def.title);
      this.questObjText.setText(`▸ ${activeQuest.currentObjectiveText}`);

      const objBottom = 72 + this.questObjText.height;
      this.shortcutText.y = objBottom + 10;

      const qWidth = Math.max(
        390,
        Math.max(
          this.questMetaText.width,
          this.questTitleText.width,
          this.questObjText.width,
          this.shortcutText.width
        ) + 42
      );
      const qHeight = this.shortcutText.y + 12;
      this.questBg.fillStyle(PALETTE.UI_BG, 0.82);
      this.questBg.fillRoundedRect(GAME_WIDTH - 24 - qWidth, 18, qWidth, qHeight, 9);
      this.questBg.lineStyle(1.2, PALETTE.UI_BORDER_GOLD, 0.55);
      this.questBg.strokeRoundedRect(GAME_WIDTH - 24 - qWidth, 18, qWidth, qHeight, 9);
    } else {
      this.questMetaText.setText('CHAPTER ONE');
      this.questTitleText.setText('Journey Continues');
      this.questObjText.setText('Approach the eastern threshold ahead');
      this.shortcutText.y = 104;
      this.questBg.fillStyle(PALETTE.UI_BG, 0.78);
      this.questBg.fillRoundedRect(GAME_WIDTH - 414, 18, 390, 114, 9);
    }

    const muted = AudioManager.getInstance().isMuted();
    this.shortcutText.setText(
      `[Tab] Atlas   [J] Chronicle   [M] Audio: ${muted ? 'Off' : 'On'}   [Esc] Pause`
    );
  }

  public showChapterCard(title: string, subtitle: string): void {
    this.chapterTitleText.setText(title.toUpperCase());
    this.chapterSubText.setText(subtitle);
    this.chapterLine.clear();
    this.chapterLine.lineStyle(1.4, PALETTE.REMNANT_GOLD, 0.8);
    this.chapterLine.beginPath();
    this.chapterLine.moveTo(-240, 6);
    this.chapterLine.lineTo(240, 6);
    this.chapterLine.strokePath();

    this.scene.tweens.killTweensOf(this.chapterContainer);
    this.chapterContainer.setAlpha(0);
    this.chapterContainer.y = 88;

    this.scene.tweens.add({
      targets: this.chapterContainer,
      alpha: 1,
      y: 74,
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
    const w = Math.min(880, this.toastText.width + 54);
    const h = Math.max(48, this.toastText.height + 26);

    this.toastBg.clear();
    this.toastBg.fillStyle(PALETTE.UI_BG, 0.94);
    this.toastBg.fillRoundedRect(-w / 2, -h / 2, w, h, 9);
    this.toastBg.lineStyle(
      1.4,
      accent === 'gold' ? PALETTE.REMNANT_GOLD : PALETTE.UI_BORDER_CYAN,
      0.88
    );
    this.toastBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 9);

    if (this.toastTween) {
      this.toastTween.stop();
    }
    this.toastContainer.setAlpha(0);
    this.toastContainer.y = GAME_HEIGHT - 114;

    this.toastTween = this.scene.tweens.add({
      targets: this.toastContainer,
      alpha: 1,
      y: GAME_HEIGHT - 128,
      duration: 280,
      ease: 'Sine.easeOut',
      hold: durationMs,
      yoyo: true,
    });
  }
}
