import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, SCENE_KEYS } from '../constants';
import { AudioManager } from '../systems/AudioManager';
import { SaveManager, type SaveState } from '../systems/SaveManager';

interface TitleAction {
  label: () => string;
  sublabel?: () => string;
  execute: () => void;
}

export class MenuScene extends Phaser.Scene {
  private parallaxFar!: Phaser.GameObjects.TileSprite;
  private parallaxMid!: Phaser.GameObjects.TileSprite;
  private emblemGfx!: Phaser.GameObjects.Graphics;
  private menuContainer!: Phaser.GameObjects.Container;
  private loreModal!: Phaser.GameObjects.Container;

  private actions: TitleAction[] = [];
  private selectedIndex = 0;
  private savedState: SaveState | null = null;
  private loreOpen = false;
  private transitioning = false;

  constructor() {
    super({ key: SCENE_KEYS.MENU });
  }

  public create(): void {
    this.transitioning = false;
    this.loreOpen = false;
    this.savedState = SaveManager.load();

    // Sky & drifting parallax ruins
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'tex_sky_gradient');
    this.parallaxFar = this.add
      .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - 230, GAME_WIDTH, 520, 'tex_parallax_far')
      .setAlpha(0.85);
    this.parallaxMid = this.add
      .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - 200, GAME_WIDTH, 540, 'tex_parallax_mid')
      .setAlpha(0.92);

    // Ambient rising motes
    this.add.particles(0, 0, 'tex_mote_cyan', {
      x: { min: 40, max: GAME_WIDTH - 40 },
      y: { min: GAME_HEIGHT - 80, max: GAME_HEIGHT + 20 },
      speedY: { min: -42, max: -16 },
      speedX: { min: -14, max: 14 },
      scale: { start: 0.45, end: 0.05 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 6800,
      frequency: 140,
      blendMode: 'ADD',
    });

    this.add.particles(0, 0, 'tex_mote_gold', {
      x: { min: 140, max: GAME_WIDTH - 140 },
      y: { min: GAME_HEIGHT - 60, max: GAME_HEIGHT + 10 },
      speedY: { min: -30, max: -12 },
      scale: { start: 0.35, end: 0 },
      alpha: { start: 0.38, end: 0 },
      lifespan: 7200,
      frequency: 280,
      blendMode: 'ADD',
    });

    this.emblemGfx = this.add.graphics();
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'tex_vignette').setDepth(50);

    // Title Typography
    this.add
      .text(GAME_WIDTH / 2, 224, 'A FORM UNWRITTEN', {
        fontFamily: 'Georgia, serif',
        fontSize: '46px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_LIGHT,
        letterSpacing: 7,
      })
      .setOrigin(0.5)
      .setShadow(0, 4, 'rgba(0,0,0,0.75)', 12);

    this.add
      .text(
        GAME_WIDTH / 2,
        276,
        '"An immortal soul. An unfinished form. A story yet to be written."',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '15.5px',
          fontStyle: 'italic',
          color: PALETTE.TEXT_MUTED,
        }
      )
      .setOrigin(0.5);

    const rule = this.add.graphics();
    rule.lineStyle(1.2, PALETTE.REMNANT_GOLD, 0.55);
    rule.beginPath();
    rule.moveTo(GAME_WIDTH / 2 - 190, 304);
    rule.lineTo(GAME_WIDTH / 2 + 190, 304);
    rule.strokePath();

    this.buildActions();
    this.menuContainer = this.add.container(GAME_WIDTH / 2, 375).setDepth(20);
    this.loreModal = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setDepth(60)
      .setVisible(false);

    this.renderMenuButtons();
    this.buildLoreModal();

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 28,
        'Vertical Slice  •  Navigate: W/S or ↑/↓  •  Select: SPACE / ENTER  •  Click Supported',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '12px',
          color: PALETTE.TEXT_MUTED,
        }
      )
      .setOrigin(0.5)
      .setDepth(20);

    this.bindInput();
    this.cameras.main.fadeIn(650, 7, 9, 19);
  }

  private buildActions(): void {
    this.actions = [];
    if (this.savedState) {
      const snap = this.savedState;
      this.actions.push({
        label: () => 'Continue Journey',
        sublabel: () =>
          `${snap.chapterTitle}  •  ${snap.restoredRemnants.includes('weight') ? 'Grounded Vessel' : 'Unbound Outline'}`,
        execute: () => this.startContinue(),
      });
    }

    this.actions.push(
      {
        label: () => (this.savedState ? 'Begin New Journey' : 'Begin Journey'),
        sublabel: () =>
          this.savedState ? 'Starts fresh from Chapter 0: Awakening' : 'Enter the Shattered Verge',
        execute: () => this.startNewJourney(),
      },
      {
        label: () => 'Controls & Premise',
        execute: () => this.toggleLoreModal(true),
      },
      {
        label: () => `Audio: ${AudioManager.getInstance().isMuted() ? 'Muted' : 'Enabled'}`,
        execute: () => {
          AudioManager.getInstance().unlockAndStartAmbient(false);
          AudioManager.getInstance().toggleMute();
          this.renderMenuButtons();
        },
      }
    );
    this.selectedIndex = 0;
  }

  private renderMenuButtons(): void {
    this.menuContainer.removeAll(true);
    const btnW = 390;
    const btnH = 54;

    this.actions.forEach((act, idx) => {
      const selected = idx === this.selectedIndex;
      const y = idx * 66;
      const sub = act.sublabel?.();

      const bg = this.add.graphics();
      bg.fillStyle(selected ? 0x18213d : 0x0e1326, 0.9);
      bg.fillRoundedRect(-btnW / 2, y - btnH / 2, btnW, btnH, 8);
      bg.lineStyle(
        selected ? 1.8 : 1,
        selected ? PALETTE.REMNANT_GOLD : PALETTE.UI_BORDER_CYAN,
        selected ? 0.95 : 0.38
      );
      bg.strokeRoundedRect(-btnW / 2, y - btnH / 2, btnW, btnH, 8);

      const title = this.add
        .text(0, sub ? y - 8 : y, `${selected ? '◆  ' : ''}${act.label()}`, {
          fontFamily: 'Georgia, serif',
          fontSize: '16.5px',
          fontStyle: selected ? 'bold' : 'normal',
          color: selected ? PALETTE.TEXT_GOLD : PALETTE.TEXT_LIGHT,
        })
        .setOrigin(0.5);

      this.menuContainer.add([bg, title]);

      if (sub) {
        const subText = this.add
          .text(0, y + 12, sub, {
            fontFamily: 'Georgia, serif',
            fontSize: '11.5px',
            color: PALETTE.TEXT_MUTED,
          })
          .setOrigin(0.5);
        this.menuContainer.add(subText);
      }

      const hit = this.add
        .rectangle(0, y, btnW, btnH, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (!this.loreOpen && this.selectedIndex !== idx) {
          this.selectedIndex = idx;
          AudioManager.getInstance().playDialogueBlip();
          this.renderMenuButtons();
        }
      });

      hit.on('pointerdown', () => {
        if (this.loreOpen || this.transitioning) return;
        this.selectedIndex = idx;
        AudioManager.getInstance().unlockAndStartAmbient(false);
        AudioManager.getInstance().playInteract();
        act.execute();
      });

      this.menuContainer.add(hit);
    });
  }

  private buildLoreModal(): void {
    this.loreModal.removeAll(true);
    const backdrop = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050711, 0.82)
      .setInteractive();
    backdrop.on('pointerdown', () => this.toggleLoreModal(false));

    const w = 680;
    const h = 420;
    const panel = this.add.graphics();
    panel.fillStyle(PALETTE.UI_BG, 0.97);
    panel.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    panel.lineStyle(1.6, PALETTE.REMNANT_GOLD, 0.85);
    panel.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);

    const heading = this.add
      .text(0, -h / 2 + 38, 'CONTROLS & JOURNEY', {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_GOLD,
        letterSpacing: 3,
      })
      .setOrigin(0.5);

    const body = this.add
      .text(
        0,
        -12,
        [
          'You awaken immortal, nameless, and physically unfinished upon the Shattered Verge.',
          'Recovering lost Remnants transforms how you touch the world—every restoration',
          'awakens new physical presence while surrendering what came before.',
          '',
          'A / D  or  Left / Right Arrow     Move across the ruins',
          'SPACE                             Leap',
          'Hold SPACE while airborne         Drift & rise in wind currents (Before Weight)',
          'S / Down Arrow + SPACE (midair)   Ground Impact shatter (After Weight)',
          'E                                 Interact / Converse / Attune',
          'J                                 Open Chronicle & Echo Tablets',
          'M                                 Toggle Audio    •    ESC   Pause Menu',
        ].join('\n'),
        {
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          color: PALETTE.TEXT_LIGHT,
          lineSpacing: 7,
          align: 'center',
        }
      )
      .setOrigin(0.5);

    const closePrompt = this.add
      .text(0, h / 2 - 30, '[ Press SPACE, ESC, or Click to Return ]', {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: PALETTE.TEXT_CYAN,
      })
      .setOrigin(0.5);

    this.loreModal.add([backdrop, panel, heading, body, closePrompt]);
  }

  private toggleLoreModal(open: boolean): void {
    this.loreOpen = open;
    this.loreModal.setVisible(open);
    AudioManager.getInstance().playDialogueBlip();
  }

  private bindInput(): void {
    const kb = this.input.keyboard;
    if (!kb) return;

    kb.on('keydown-UP', () => this.handleNav(-1));
    kb.on('keydown-W', () => this.handleNav(-1));
    kb.on('keydown-DOWN', () => this.handleNav(1));
    kb.on('keydown-S', () => this.handleNav(1));
    kb.on('keydown-M', () => {
      AudioManager.getInstance().toggleMute();
      this.renderMenuButtons();
    });
    kb.on('keydown-ESC', () => {
      if (this.loreOpen) this.toggleLoreModal(false);
    });
    kb.on('keydown-SPACE', () => this.handleConfirm());
    kb.on('keydown-ENTER', () => this.handleConfirm());
    kb.on('keydown-E', () => this.handleConfirm());
  }

  private handleNav(delta: number): void {
    if (this.loreOpen || this.transitioning) return;
    this.selectedIndex = (this.selectedIndex + delta + this.actions.length) % this.actions.length;
    AudioManager.getInstance().unlockAndStartAmbient(false);
    AudioManager.getInstance().playDialogueBlip();
    this.renderMenuButtons();
  }

  private handleConfirm(): void {
    if (this.transitioning) return;
    AudioManager.getInstance().unlockAndStartAmbient(false);
    if (this.loreOpen) {
      this.toggleLoreModal(false);
      return;
    }
    AudioManager.getInstance().playInteract();
    this.actions[this.selectedIndex].execute();
  }

  private startNewJourney(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    SaveManager.clear();
    this.cameras.main.fadeOut(550, 7, 9, 19);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.AWAKENING);
    });
  }

  private startContinue(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(550, 7, 9, 19);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.GAME, { loadSaved: true });
    });
  }

  public update(time: number, delta: number): void {
    this.parallaxFar.tilePositionX += delta * 0.008;
    this.parallaxMid.tilePositionX += delta * 0.018;

    // Animated unfinished soul-emblem above title
    const t = time * 0.001;
    const cx = GAME_WIDTH / 2;
    const cy = 128;
    this.emblemGfx.clear();

    this.emblemGfx.fillStyle(PALETTE.ETHEREAL_CYAN, 0.08 + Math.sin(t * 2.2) * 0.03);
    this.emblemGfx.fillCircle(cx, cy, 52);

    this.emblemGfx.lineStyle(1.6, PALETTE.ETHEREAL_CYAN, 0.72);
    this.emblemGfx.beginPath();
    this.emblemGfx.arc(cx, cy, 36, t * 0.45, t * 0.45 + 4.3);
    this.emblemGfx.strokePath();

    this.emblemGfx.lineStyle(1.4, PALETTE.REMNANT_GOLD, 0.68);
    this.emblemGfx.beginPath();
    this.emblemGfx.arc(cx, cy, 26, -t * 0.65, -t * 0.65 + 3.8);
    this.emblemGfx.strokePath();

    this.emblemGfx.fillStyle(PALETTE.REMNANT_BRIGHT, 0.9);
    this.emblemGfx.fillCircle(cx, cy + Math.sin(t * 2.6) * 3, 6.5);
  }
}

