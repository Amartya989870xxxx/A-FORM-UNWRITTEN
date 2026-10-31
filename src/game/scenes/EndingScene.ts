import Phaser from 'phaser';
import {
  DEFAULT_PLAYER_NAME,
  GAME_HEIGHT,
  GAME_WIDTH,
  PALETTE,
  SCENE_KEYS,
  type AdventurerRank,
} from '../constants';
import { ECHO_FRAGMENT_DEFINITIONS } from '../data/quests';
import { AudioManager } from '../systems/AudioManager';
import { IMPRINT_DEFINITIONS } from '../systems/ImprintManager';
import { SaveManager, sanitizePlayerName, type ImprintId } from '../systems/SaveManager';
import { ConfirmModal } from '../ui/ConfirmModal';

export interface EndingSceneData {
  playerName?: string;
  adventurerRank?: AdventurerRank;
  imprint: ImprintId | null;
  echoCount: number;
  regionExplorationPct?: number;
  worldExplorationPct?: number;
  relicCount?: number;
}

export class EndingScene extends Phaser.Scene {
  private selectedIndex = 0;
  private btnContainer!: Phaser.GameObjects.Container;
  private confirmModal!: ConfirmModal;
  private transitioning = false;
  private playerName = DEFAULT_PLAYER_NAME;

  private readonly buttons = [
    {
      label: 'Return to Title Screen',
      action: () => this.goToMenu(),
    },
    {
      label: 'Replay Chapter One',
      action: () => this.restartGame(),
    },
  ];

  constructor() {
    super({ key: SCENE_KEYS.ENDING });
  }

  public create(data?: EndingSceneData): void {
    this.selectedIndex = 0;
    this.transitioning = false;

    this.playerName = sanitizePlayerName(data?.playerName);
    const rank: AdventurerRank = data?.adventurerRank ?? 'G';
    const imprintId = data?.imprint ?? null;
    const imprint = imprintId ? IMPRINT_DEFINITIONS[imprintId] : null;
    const echoCount = data?.echoCount ?? 0;
    const regionPct = data?.regionExplorationPct ?? 0;
    const worldPct = data?.worldExplorationPct ?? 0;
    const relicCount = data?.relicCount ?? 0;

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'tex_sky_gradient');
    this.add
      .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - 300, GAME_WIDTH, 680, 'tex_parallax_far')
      .setAlpha(0.8);
    this.add
      .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - 260, GAME_WIDTH, 680, 'tex_parallax_mid')
      .setAlpha(0.85);

    this.add.particles(0, 0, 'tex_mote_gold', {
      x: { min: 140, max: GAME_WIDTH - 140 },
      y: { min: GAME_HEIGHT - 100, max: GAME_HEIGHT },
      speedY: { min: -42, max: -14 },
      scale: { start: 0.42, end: 0 },
      alpha: { start: 0.52, end: 0 },
      lifespan: 6400,
      frequency: 150,
      blendMode: 'ADD',
    });

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'tex_vignette').setDepth(40);

    const w = 1220;
    const h = 880;
    const top = (GAME_HEIGHT - h) / 2;

    const panel = this.add.graphics();
    panel.fillStyle(PALETTE.UI_BG, 0.92);
    panel.fillRoundedRect(GAME_WIDTH / 2 - w / 2, top, w, h, 16);
    panel.lineStyle(2, PALETTE.REMNANT_GOLD, 0.85);
    panel.strokeRoundedRect(GAME_WIDTH / 2 - w / 2, top, w, h, 16);

    this.add
      .text(GAME_WIDTH / 2, top + 52, 'END OF CHAPTER ONE: THE SHATTERED VERGE', {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_GOLD,
        letterSpacing: 4.5,
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        top + 124,
        'Within the Fractured Mirror-Arch, your charcoal and gold garment shimmers against obsidian glass.\nFor a heartbeat, ancient chains appear around your reflection, struck open from the inside.',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '21px',
          color: PALETTE.TEXT_LIGHT,
          align: 'center',
          lineSpacing: 8,
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        top + 210,
        '"No thief stole your form. Who wove this garment to hold you together, and why did you cast yourself to the winds?"',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '20px',
          fontStyle: 'italic',
          color: PALETTE.TEXT_CYAN,
          align: 'center',
          wordWrap: { width: 1020 },
        }
      )
      .setOrigin(0.5);

    // Chapter One Chronicle Ledger Box
    const sumW = 1020;
    const sumH = 265;
    const sumTop = top + 266;
    const sumGfx = this.add.graphics();
    sumGfx.fillStyle(0x11172c, 0.94);
    sumGfx.fillRoundedRect(GAME_WIDTH / 2 - sumW / 2, sumTop, sumW, sumH, 11);
    sumGfx.lineStyle(
      1.5,
      imprint ? imprint.colorHex : PALETTE.UI_BORDER_GOLD,
      0.74
    );
    sumGfx.strokeRoundedRect(GAME_WIDTH / 2 - sumW / 2, sumTop, sumW, sumH, 11);

    const summaryHeader = imprint
      ? `✦  ${this.playerName} (Guild Rank ${rank})   •   ${imprint.name} (${imprint.alignmentLabel})`
      : `◆  ${this.playerName} (Guild Rank ${rank})   •   Grounded State Anchored`;
    this.add
      .text(GAME_WIDTH / 2, sumTop + 38, summaryHeader, {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: imprint ? imprint.textColor : PALETTE.TEXT_GOLD,
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        sumTop + 105,
        imprint
          ? imprint.endingReflection
          : 'Your anchored footsteps now echo beyond the border cliffs toward the Inner Kingdoms of Aethelgard.',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '18px',
          color: PALETTE.TEXT_LIGHT,
          align: 'center',
          lineSpacing: 6,
          wordWrap: { width: 900 },
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        sumTop + 185,
        `Remnant Anchored: Weight (1 / 1)   •   Echo Tablets: ${echoCount} / ${ECHO_FRAGMENT_DEFINITIONS.length}   •   Relics Recovered: ${relicCount}`,
        {
          fontFamily: 'Georgia, serif',
          fontSize: '15.5px',
          color: PALETTE.TEXT_MUTED,
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        sumTop + 222,
        `Shattered Verge Surveyed: ${regionPct.toFixed(1)}%   •   Known World Cartography: ${worldPct.toFixed(2)}% (1 of 18 Regions Reached)`,
        {
          fontFamily: 'Georgia, serif',
          fontSize: '15px',
          color: PALETTE.TEXT_CYAN,
        }
      )
      .setOrigin(0.5);

    // Chapter Two Horizon Hook
    this.add
      .text(
        GAME_WIDTH / 2,
        top + 592,
        'Far below the eastern cliffs, lantern-lit roads wind toward the highland cities of Aethelgard,\nthe Adventurers’ Guild spires, and three distant continents still veiled upon your Atlas.',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '17.5px',
          color: PALETTE.TEXT_LIGHT,
          align: 'center',
          lineSpacing: 6,
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        top + 678,
        '"He began his journey to reclaim who he once was.\nNow the wider world awaits who he will choose to become."',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '22px',
          fontStyle: 'italic',
          color: PALETTE.TEXT_GOLD,
          align: 'center',
          lineSpacing: 8,
        }
      )
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, top + 744, 'YOUR JOURNEY CONTINUES IN CHAPTER TWO: THE CROWN REACHES', {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: PALETTE.TEXT_MUTED,
        letterSpacing: 3.5,
      })
      .setOrigin(0.5);

    this.btnContainer = this.add.container(GAME_WIDTH / 2, top + 812).setDepth(45);
    this.confirmModal = new ConfirmModal(this);
    this.renderButtons();

    const kb = this.input.keyboard;
    if (kb) {
      kb.on('keydown-LEFT', () => this.moveSelection(-1));
      kb.on('keydown-A', () => this.moveSelection(-1));
      kb.on('keydown-UP', () => this.moveSelection(-1));
      kb.on('keydown-W', () => this.moveSelection(-1));
      kb.on('keydown-RIGHT', () => this.moveSelection(1));
      kb.on('keydown-D', () => this.moveSelection(1));
      kb.on('keydown-DOWN', () => this.moveSelection(1));
      kb.on('keydown-S', () => this.moveSelection(1));
      kb.on('keydown-ESC', () => {
        if (this.confirmModal.isOpen()) {
          this.confirmModal.cancel();
        }
      });
      kb.on('keydown-SPACE', () => this.confirm());
      kb.on('keydown-ENTER', () => this.confirm());
      kb.on('keydown-E', () => this.confirm());
    }

    this.cameras.main.fadeIn(850, 7, 9, 19);
  }

  private renderButtons(): void {
    this.btnContainer.removeAll(true);
    const btnW = 340;
    const btnH = 56;

    this.buttons.forEach((btn, idx) => {
      const selected = idx === this.selectedIndex;
      const x = (idx === 0 ? -1 : 1) * 195;

      const bg = this.add.graphics();
      bg.fillStyle(selected ? 0x1b2442 : 0x10162a, 0.96);
      bg.fillRoundedRect(x - btnW / 2, -btnH / 2, btnW, btnH, 9);
      bg.lineStyle(
        selected ? 2 : 1.1,
        selected ? PALETTE.REMNANT_GOLD : PALETTE.STONE_HIGHLIGHT,
        selected ? 0.96 : 0.45
      );
      bg.strokeRoundedRect(x - btnW / 2, -btnH / 2, btnW, btnH, 9);

      const txt = this.add
        .text(x, 0, `${selected ? '◆  ' : ''}${btn.label}`, {
          fontFamily: 'Georgia, serif',
          fontSize: '17px',
          color: selected ? PALETTE.TEXT_GOLD : PALETTE.TEXT_LIGHT,
        })
        .setOrigin(0.5);

      const hit = this.add
        .rectangle(x, 0, btnW, btnH, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (this.confirmModal.isOpen() || this.transitioning) return;
        if (this.selectedIndex !== idx) {
          this.selectedIndex = idx;
          AudioManager.getInstance().playDialogueBlip();
          this.renderButtons();
        }
      });
      hit.on('pointerdown', () => {
        if (this.confirmModal.isOpen() || this.transitioning) return;
        this.selectedIndex = idx;
        this.confirm();
      });

      this.btnContainer.add([bg, txt, hit]);
    });
  }

  public isConfirmModalOpen(): boolean {
    return this.confirmModal?.isOpen() ?? false;
  }

  public getConfirmModalTitle(): string | null {
    return this.confirmModal?.getTitle() ?? null;
  }

  private moveSelection(delta: number): void {
    if (this.transitioning) return;
    if (this.confirmModal.isOpen()) {
      this.confirmModal.moveSelection(delta);
      return;
    }
    this.selectedIndex = (this.selectedIndex + delta + this.buttons.length) % this.buttons.length;
    AudioManager.getInstance().playDialogueBlip();
    this.renderButtons();
  }

  private confirm(): void {
    if (this.transitioning) return;
    if (this.confirmModal.isOpen()) {
      this.confirmModal.confirmSelection();
      return;
    }
    AudioManager.getInstance().playInteract();
    this.buttons[this.selectedIndex].action();
  }

  private restartGame(): void {
    if (SaveManager.hasSave()) {
      this.confirmModal.open({
        kicker: 'Erase Saved Progress',
        title: 'REPLAY CHAPTER ONE?',
        body: 'Replaying Chapter One will permanently delete your saved progress and return your garment to the Awakening Precipice.\n\nChoose Cancel to preserve your completed save.',
        cancelLabel: 'Cancel (Keep Save)',
        confirmLabel: 'Confirm Replay',
        onConfirm: () => {
          this.executeRestart();
        },
      });
      return;
    }
    this.executeRestart();
  }

  private executeRestart(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    SaveManager.clear();
    this.cameras.main.fadeOut(550, 7, 9, 19);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.AWAKENING, { playerName: this.playerName });
    });
  }

  private goToMenu(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(550, 7, 9, 19);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.MENU);
    });
  }
}
