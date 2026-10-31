import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, SCENE_KEYS } from '../constants';
import { ECHO_FRAGMENT_DEFINITIONS } from '../data/quests';
import { AudioManager } from '../systems/AudioManager';
import { IMPRINT_DEFINITIONS } from '../systems/ImprintManager';
import { SaveManager, type ImprintId } from '../systems/SaveManager';

export interface EndingSceneData {
  imprint: ImprintId | null;
  echoCount: number;
}

export class EndingScene extends Phaser.Scene {
  private selectedIndex = 0;
  private btnContainer!: Phaser.GameObjects.Container;
  private transitioning = false;

  private readonly buttons = [
    {
      label: 'Replay Vertical Slice',
      action: () => this.restartGame(),
    },
    {
      label: 'Return to Title Screen',
      action: () => this.goToMenu(),
    },
  ];

  constructor() {
    super({ key: SCENE_KEYS.ENDING });
  }

  public create(data?: EndingSceneData): void {
    this.selectedIndex = 0;
    this.transitioning = false;

    const imprintId = data?.imprint ?? null;
    const imprint = imprintId ? IMPRINT_DEFINITIONS[imprintId] : null;
    const echoCount = data?.echoCount ?? 0;

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'tex_sky_gradient');
    this.add
      .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - 210, GAME_WIDTH, 520, 'tex_parallax_far')
      .setAlpha(0.75);

    this.add.particles(0, 0, 'tex_mote_gold', {
      x: { min: 100, max: GAME_WIDTH - 100 },
      y: { min: GAME_HEIGHT - 80, max: GAME_HEIGHT },
      speedY: { min: -36, max: -14 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 6000,
      frequency: 160,
      blendMode: 'ADD',
    });

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'tex_vignette').setDepth(40);

    // Framing panel
    const panel = this.add.graphics();
    panel.fillStyle(PALETTE.UI_BG, 0.88);
    panel.fillRoundedRect(GAME_WIDTH / 2 - 430, 54, 860, 612, 14);
    panel.lineStyle(1.6, PALETTE.REMNANT_GOLD, 0.78);
    panel.strokeRoundedRect(GAME_WIDTH / 2 - 430, 54, 860, 612, 14);

    this.add
      .text(GAME_WIDTH / 2, 96, 'BEYOND THE SHATTERED VERGE', {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: PALETTE.TEXT_GOLD,
        letterSpacing: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        148,
        'Within the Fractured Mirror-Arch, your restored reflection briefly flickers—\nnot as a helpless victim, but surrounded by ancient chains struck open from within.',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '16.5px',
          color: PALETTE.TEXT_LIGHT,
          align: 'center',
          lineSpacing: 7,
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        214,
        '"No thief stole your form. Why, then, did you cast your own existence to the winds?"',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '17px',
          fontStyle: 'italic',
          color: PALETTE.TEXT_CYAN,
          align: 'center',
        }
      )
      .setOrigin(0.5);

    // Summary box
    const sumGfx = this.add.graphics();
    sumGfx.fillStyle(0x11172c, 0.92);
    sumGfx.fillRoundedRect(GAME_WIDTH / 2 - 360, 254, 720, 178, 9);
    sumGfx.lineStyle(
      1.2,
      imprint ? imprint.colorHex : PALETTE.UI_BORDER_GOLD,
      0.68
    );
    sumGfx.strokeRoundedRect(GAME_WIDTH / 2 - 360, 254, 720, 178, 9);

    const summaryHeader = imprint
      ? `✦  ${imprint.name}   •   Path of ${imprint.alignmentLabel}`
      : '◆  Remnant of Weight Restored';
    this.add
      .text(GAME_WIDTH / 2, 284, summaryHeader, {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: imprint ? imprint.textColor : PALETTE.TEXT_GOLD,
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        336,
        imprint
          ? imprint.endingReflection
          : 'Your footsteps now echo across the threshold toward the Forgotten Kingdom.',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '14.5px',
          color: PALETTE.TEXT_LIGHT,
          align: 'center',
          lineSpacing: 5,
          wordWrap: { width: 650 },
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        402,
        `Remnants Reclaimed: Weight (1 / 1)     •     Echo Tablets Discovered: ${echoCount} / ${ECHO_FRAGMENT_DEFINITIONS.length}`,
        {
          fontFamily: 'Georgia, serif',
          fontSize: '13px',
          color: PALETTE.TEXT_MUTED,
        }
      )
      .setOrigin(0.5);

    // Guiding thematic quote
    this.add
      .text(
        GAME_WIDTH / 2,
        476,
        '"He began his journey to discover who he was.\nHe never expected to discover who he could become."',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '18px',
          fontStyle: 'italic',
          color: PALETTE.TEXT_GOLD,
          align: 'center',
          lineSpacing: 7,
        }
      )
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 528, 'END OF PROTOTYPE CHAPTER  —  A FORM UNWRITTEN', {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: PALETTE.TEXT_MUTED,
        letterSpacing: 3,
      })
      .setOrigin(0.5);

    this.btnContainer = this.add.container(GAME_WIDTH / 2, 594).setDepth(45);
    this.renderButtons();

    const kb = this.input.keyboard;
    if (kb) {
      kb.on('keydown-LEFT', () => this.moveSelection(-1));
      kb.on('keydown-A', () => this.moveSelection(-1));
      kb.on('keydown-UP', () => this.moveSelection(-1));
      kb.on('keydown-RIGHT', () => this.moveSelection(1));
      kb.on('keydown-D', () => this.moveSelection(1));
      kb.on('keydown-DOWN', () => this.moveSelection(1));
      kb.on('keydown-SPACE', () => this.confirm());
      kb.on('keydown-ENTER', () => this.confirm());
      kb.on('keydown-E', () => this.confirm());
    }

    this.cameras.main.fadeIn(850, 7, 9, 19);
  }

  private renderButtons(): void {
    this.btnContainer.removeAll(true);
    const btnW = 270;
    const btnH = 46;

    this.buttons.forEach((btn, idx) => {
      const selected = idx === this.selectedIndex;
      const x = (idx === 0 ? -1 : 1) * 155;

      const bg = this.add.graphics();
      bg.fillStyle(selected ? 0x1b2442 : 0x10162a, 0.95);
      bg.fillRoundedRect(x - btnW / 2, -btnH / 2, btnW, btnH, 8);
      bg.lineStyle(
        selected ? 1.8 : 1,
        selected ? PALETTE.REMNANT_GOLD : PALETTE.STONE_HIGHLIGHT,
        selected ? 0.95 : 0.45
      );
      bg.strokeRoundedRect(x - btnW / 2, -btnH / 2, btnW, btnH, 8);

      const txt = this.add
        .text(x, 0, `${selected ? '◆  ' : ''}${btn.label}`, {
          fontFamily: 'Georgia, serif',
          fontSize: '14.5px',
          color: selected ? PALETTE.TEXT_GOLD : PALETTE.TEXT_LIGHT,
        })
        .setOrigin(0.5);

      const hit = this.add
        .rectangle(x, 0, btnW, btnH, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (this.selectedIndex !== idx) {
          this.selectedIndex = idx;
          AudioManager.getInstance().playDialogueBlip();
          this.renderButtons();
        }
      });
      hit.on('pointerdown', () => {
        this.selectedIndex = idx;
        this.confirm();
      });

      this.btnContainer.add([bg, txt, hit]);
    });
  }

  private moveSelection(delta: number): void {
    if (this.transitioning) return;
    this.selectedIndex = (this.selectedIndex + delta + this.buttons.length) % this.buttons.length;
    AudioManager.getInstance().playDialogueBlip();
    this.renderButtons();
  }

  private confirm(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    AudioManager.getInstance().playInteract();
    this.buttons[this.selectedIndex].action();
  }

  private restartGame(): void {
    SaveManager.clear();
    this.cameras.main.fadeOut(550, 7, 9, 19);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.AWAKENING);
    });
  }

  private goToMenu(): void {
    this.cameras.main.fadeOut(550, 7, 9, 19);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.MENU);
    });
  }
}

