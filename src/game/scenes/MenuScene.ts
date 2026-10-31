import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, SCENE_KEYS } from '../constants';
import { AudioManager } from '../systems/AudioManager';
import { SaveManager, type SaveState } from '../systems/SaveManager';
import { SettingsManager } from '../systems/SettingsManager';
import { ConfirmModal } from '../ui/ConfirmModal';
import { promptForPlayerName } from '../ui/NamePrompt';

interface TitleAction {
  label: () => string;
  sublabel?: () => string;
  execute: () => void;
}

export class MenuScene extends Phaser.Scene {
  private parallaxFar!: Phaser.GameObjects.TileSprite;
  private parallaxMid!: Phaser.GameObjects.TileSprite;
  private parallaxNear!: Phaser.GameObjects.TileSprite;
  private emblemGfx!: Phaser.GameObjects.Graphics;
  private menuContainer!: Phaser.GameObjects.Container;
  private loreModal!: Phaser.GameObjects.Container;
  private confirmModal!: ConfirmModal;

  private actions: TitleAction[] = [];
  private selectedIndex = 0;
  private savedState: SaveState | null = null;
  private loreOpen = false;
  private namingOpen = false;
  private transitioning = false;

  constructor() {
    super({ key: SCENE_KEYS.MENU });
  }

  public create(): void {
    this.transitioning = false;
    this.loreOpen = false;
    this.namingOpen = false;
    this.savedState = SaveManager.load();

    // Full HD 1920x1080 sky & multi-layer drifting ruins
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'tex_sky_gradient');
    this.parallaxFar = this.add
      .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - 320, GAME_WIDTH, 680, 'tex_parallax_far')
      .setAlpha(0.88);
    this.parallaxMid = this.add
      .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - 280, GAME_WIDTH, 680, 'tex_parallax_mid')
      .setAlpha(0.92);
    this.parallaxNear = this.add
      .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - 230, GAME_WIDTH, 700, 'tex_parallax_near')
      .setAlpha(0.95);

    // Ambient rising stardust & golden kintsugi motes
    this.add.particles(0, 0, 'tex_mote_cyan', {
      x: { min: 60, max: GAME_WIDTH - 60 },
      y: { min: GAME_HEIGHT - 100, max: GAME_HEIGHT + 20 },
      speedY: { min: -46, max: -16 },
      speedX: { min: -16, max: 16 },
      scale: { start: 0.45, end: 0.05 },
      alpha: { start: 0.48, end: 0 },
      lifespan: 7200,
      frequency: 135,
      blendMode: 'ADD',
    });

    this.add.particles(0, 0, 'tex_mote_gold', {
      x: { min: 160, max: GAME_WIDTH - 160 },
      y: { min: GAME_HEIGHT - 80, max: GAME_HEIGHT + 10 },
      speedY: { min: -34, max: -12 },
      scale: { start: 0.38, end: 0 },
      alpha: { start: 0.42, end: 0 },
      lifespan: 7600,
      frequency: 220,
      blendMode: 'ADD',
    });

    this.emblemGfx = this.add.graphics().setDepth(15);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'tex_vignette').setDepth(50);

    // Chapter Kicker & Title Typography
    this.add
      .text(GAME_WIDTH / 2, 304, 'CHAPTER ONE: THE SHATTERED VERGE', {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: PALETTE.TEXT_GOLD,
        letterSpacing: 5,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.add
      .text(GAME_WIDTH / 2, 362, 'A FORM UNWRITTEN', {
        fontFamily: 'Georgia, serif',
        fontSize: '64px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_LIGHT,
        letterSpacing: 9,
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setShadow(0, 6, 'rgba(0,0,0,0.82)', 16);

    this.add
      .text(
        GAME_WIDTH / 2,
        428,
        '"An immortal soul. An unfinished form. A story yet to be written."',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '20px',
          fontStyle: 'italic',
          color: PALETTE.TEXT_MUTED,
        }
      )
      .setOrigin(0.5)
      .setDepth(20);

    const rule = this.add.graphics().setDepth(20);
    rule.lineStyle(1.4, PALETTE.REMNANT_GOLD, 0.62);
    rule.beginPath();
    rule.moveTo(GAME_WIDTH / 2 - 280, 468);
    rule.lineTo(GAME_WIDTH / 2 + 280, 468);
    rule.strokePath();

    this.buildActions();
    this.menuContainer = this.add.container(GAME_WIDTH / 2, 520).setDepth(20);
    this.loreModal = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setDepth(60)
      .setVisible(false);
    this.confirmModal = new ConfirmModal(this);

    this.renderMenuButtons();
    this.buildLoreModal();

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 38,
        'Chapter I Expansion  •  Navigate: W/S or Up/Down  •  Select: SPACE / ENTER  •  Mouse Supported',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '14.5px',
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
      const stateLabel = snap.restoredRemnants.includes('weight')
        ? 'Grounded State'
        : 'Unanchored State';
      this.actions.push({
        label: () => 'Continue Journey',
        sublabel: () =>
          `${snap.playerName} (Rank ${snap.adventurerRank})  •  ${snap.chapterTitle}  •  ${stateLabel}`,
        execute: () => this.startContinue(),
      });
    }

    this.actions.push(
      {
        label: () => (this.savedState ? 'Begin New Journey' : 'Begin Journey'),
        sublabel: () =>
          this.savedState
            ? 'Inscribe a new name and awaken upon the Shattered Verge'
            : 'Choose a name and step into the Shattered Verge',
        execute: () => {
          void this.startNewJourney();
        },
      },
      {
        label: () => `Atmosphere: ${SettingsManager.getAtmosphereLabel()}`,
        sublabel: () => 'Local device clock, accelerated cycle, or fixed time of day',
        execute: () => {
          SettingsManager.cycleAtmosphere();
          this.renderMenuButtons();
        },
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
    const btnW = 540;
    const btnH = 68;

    this.actions.forEach((act, idx) => {
      const selected = idx === this.selectedIndex;
      const y = idx * 78;
      const sub = act.sublabel?.();

      const bg = this.add.graphics();
      bg.fillStyle(selected ? 0x1a223f : 0x0e1326, 0.92);
      bg.fillRoundedRect(-btnW / 2, y - btnH / 2, btnW, btnH, 10);
      bg.lineStyle(
        selected ? 2 : 1.1,
        selected ? PALETTE.REMNANT_GOLD : PALETTE.UI_BORDER_CYAN,
        selected ? 0.96 : 0.4
      );
      bg.strokeRoundedRect(-btnW / 2, y - btnH / 2, btnW, btnH, 10);

      const title = this.add
        .text(0, sub ? y - 10 : y, `${selected ? '◆  ' : ''}${act.label()}`, {
          fontFamily: 'Georgia, serif',
          fontSize: '21px',
          fontStyle: selected ? 'bold' : 'normal',
          color: selected ? PALETTE.TEXT_GOLD : PALETTE.TEXT_LIGHT,
        })
        .setOrigin(0.5);

      this.menuContainer.add([bg, title]);

      if (sub) {
        const subText = this.add
          .text(0, y + 15, sub, {
            fontFamily: 'Georgia, serif',
            fontSize: '13.5px',
            color: PALETTE.TEXT_MUTED,
          })
          .setOrigin(0.5);
        this.menuContainer.add(subText);
      }

      const hit = this.add
        .rectangle(0, y, btnW, btnH, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (
          !this.loreOpen &&
          !this.namingOpen &&
          !this.confirmModal.isOpen() &&
          this.selectedIndex !== idx
        ) {
          this.selectedIndex = idx;
          AudioManager.getInstance().playDialogueBlip();
          this.renderMenuButtons();
        }
      });

      hit.on('pointerdown', () => {
        if (
          this.loreOpen ||
          this.namingOpen ||
          this.confirmModal.isOpen() ||
          this.transitioning
        ) {
          return;
        }
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
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050711, 0.85)
      .setInteractive();
    backdrop.on('pointerdown', () => this.toggleLoreModal(false));

    const w = 960;
    const h = 580;
    const panel = this.add.graphics();
    panel.fillStyle(PALETTE.UI_BG, 0.98);
    panel.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    panel.lineStyle(2, PALETTE.REMNANT_GOLD, 0.88);
    panel.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);

    const heading = this.add
      .text(0, -h / 2 + 48, 'CONTROLS & PREMISE', {
        fontFamily: 'Georgia, serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_GOLD,
        letterSpacing: 3.5,
      })
      .setOrigin(0.5);

    const body = this.add
      .text(
        0,
        -10,
        [
          'You awaken immortal, without memory or physical flesh, upon the Shattered Verge.',
          'Only a mysterious charcoal and gold stabilizing garment gives your presence shape.',
          'Every Remnant you reclaim anchors new physical capabilities while surrendering old freedoms.',
          '',
          'A / D  or  Left / Right Arrow       Traverse the ruins',
          'SPACE                               Leap',
          'Hold SPACE while airborne           Drift and rise in wind currents (Unanchored State)',
          'S / Down Arrow + SPACE (midair)     Ground Impact shatter (Grounded State)',
          'E                                   Interact, Converse, or Attune',
          'TAB                                 Open Cartographic World Atlas',
          'J                                   Open Chronicle, Quests, Relics & Hints',
          'M                                   Toggle Audio      •      ESC   Pause Menu',
        ].join('\n'),
        {
          fontFamily: 'Georgia, serif',
          fontSize: '17px',
          color: PALETTE.TEXT_LIGHT,
          lineSpacing: 9,
          align: 'center',
        }
      )
      .setOrigin(0.5);

    const closePrompt = this.add
      .text(0, h / 2 - 42, '[ Press SPACE, ESC, or Click to Return ]', {
        fontFamily: 'Georgia, serif',
        fontSize: '15.5px',
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

  public isConfirmModalOpen(): boolean {
    return this.confirmModal?.isOpen() ?? false;
  }

  public getConfirmModalTitle(): string | null {
    return this.confirmModal?.getTitle() ?? null;
  }

  private bindInput(): void {
    const kb = this.input.keyboard;
    if (!kb) return;

    kb.on('keydown-UP', () => this.handleNav(-1));
    kb.on('keydown-W', () => this.handleNav(-1));
    kb.on('keydown-LEFT', () => {
      if (this.confirmModal.isOpen()) this.confirmModal.moveSelection(-1);
    });
    kb.on('keydown-A', () => {
      if (this.confirmModal.isOpen()) this.confirmModal.moveSelection(-1);
    });
    kb.on('keydown-DOWN', () => this.handleNav(1));
    kb.on('keydown-S', () => this.handleNav(1));
    kb.on('keydown-RIGHT', () => {
      if (this.confirmModal.isOpen()) this.confirmModal.moveSelection(1);
    });
    kb.on('keydown-D', () => {
      if (this.confirmModal.isOpen()) this.confirmModal.moveSelection(1);
    });
    kb.on('keydown-M', () => {
      if (this.namingOpen || this.confirmModal.isOpen()) return;
      AudioManager.getInstance().toggleMute();
      this.renderMenuButtons();
    });
    kb.on('keydown-ESC', () => {
      if (this.confirmModal.isOpen()) {
        this.confirmModal.cancel();
        return;
      }
      if (this.loreOpen) this.toggleLoreModal(false);
    });
    kb.on('keydown-SPACE', () => this.handleConfirm());
    kb.on('keydown-ENTER', () => this.handleConfirm());
    kb.on('keydown-E', () => this.handleConfirm());
  }

  private handleNav(delta: number): void {
    if (this.namingOpen || this.transitioning) return;
    if (this.confirmModal.isOpen()) {
      this.confirmModal.moveSelection(delta);
      return;
    }
    if (this.loreOpen) return;
    this.selectedIndex = (this.selectedIndex + delta + this.actions.length) % this.actions.length;
    AudioManager.getInstance().unlockAndStartAmbient(false);
    AudioManager.getInstance().playDialogueBlip();
    this.renderMenuButtons();
  }

  private handleConfirm(): void {
    if (this.transitioning || this.namingOpen) return;
    AudioManager.getInstance().unlockAndStartAmbient(false);
    if (this.confirmModal.isOpen()) {
      this.confirmModal.confirmSelection();
      return;
    }
    if (this.loreOpen) {
      this.toggleLoreModal(false);
      return;
    }
    AudioManager.getInstance().playInteract();
    this.actions[this.selectedIndex].execute();
  }

  private async startNewJourney(confirmedOverwrite = false): Promise<void> {
    if (this.transitioning || this.namingOpen || this.confirmModal.isOpen()) return;

    if (!confirmedOverwrite && SaveManager.hasSave()) {
      this.confirmModal.open({
        kicker: 'Overwrite Saved Chronicle',
        title: 'BEGIN A NEW JOURNEY?',
        body: 'Starting a new journey will permanently delete your existing saved progress once you confirm a new name.\n\nChoose Cancel to preserve your current save.',
        cancelLabel: 'Cancel (Keep Save)',
        confirmLabel: 'Confirm New Journey',
        onConfirm: () => {
          void this.startNewJourney(true);
        },
      });
      return;
    }

    this.namingOpen = true;

    const result = await promptForPlayerName(this, '');
    this.namingOpen = false;
    if (result.cancelled) {
      AudioManager.getInstance().playDialogueBlip();
      return;
    }

    this.transitioning = true;
    SaveManager.clear();
    this.cameras.main.fadeOut(550, 7, 9, 19);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.AWAKENING, { playerName: result.playerName });
    });
  }

  private startContinue(): void {
    if (this.transitioning || this.namingOpen) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(550, 7, 9, 19);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.GAME, { loadSaved: true });
    });
  }

  public update(time: number, delta: number): void {
    this.parallaxFar.tilePositionX += delta * 0.009;
    this.parallaxMid.tilePositionX += delta * 0.02;
    this.parallaxNear.tilePositionX += delta * 0.032;

    // Animated Stabilizing Garment & Broken Astrolabe Crest above title
    const t = time * 0.001;
    const cx = GAME_WIDTH / 2;
    const cy = 185;
    this.emblemGfx.clear();

    this.emblemGfx.fillStyle(PALETTE.GARMENT_GOLD_SEAM, 0.08 + Math.sin(t * 2.1) * 0.03);
    this.emblemGfx.fillCircle(cx, cy, 74);

    // Outer broken golden astrolabe ring
    this.emblemGfx.lineStyle(2, PALETTE.GARMENT_GOLD_SEAM, 0.78);
    this.emblemGfx.beginPath();
    this.emblemGfx.arc(cx, cy, 56, t * 0.35, t * 0.35 + 4.4);
    this.emblemGfx.strokePath();

    this.emblemGfx.lineStyle(1.4, PALETTE.ETHEREAL_CYAN, 0.55);
    this.emblemGfx.beginPath();
    this.emblemGfx.arc(cx, cy, 44, -t * 0.5, -t * 0.5 + 3.9);
    this.emblemGfx.strokePath();

    // Stylized Charcoal-and-Gold Stabilizing Garment Mantle Crest
    const hover = Math.sin(t * 2.4) * 3;
    this.emblemGfx.fillStyle(PALETTE.GARMENT_CHARCOAL, 0.96);
    this.emblemGfx.beginPath();
    this.emblemGfx.moveTo(cx, cy - 24 + hover);
    this.emblemGfx.lineTo(cx + 20, cy - 6 + hover);
    this.emblemGfx.lineTo(cx + 13, cy + 26 + hover);
    this.emblemGfx.lineTo(cx, cy + 18 + hover);
    this.emblemGfx.lineTo(cx - 13, cy + 26 + hover);
    this.emblemGfx.lineTo(cx - 20, cy - 6 + hover);
    this.emblemGfx.closePath();
    this.emblemGfx.fillPath();

    this.emblemGfx.lineStyle(1.6, PALETTE.GARMENT_GOLD_BRIGHT, 0.92);
    this.emblemGfx.strokeCircle(cx, cy + 5 + hover, 5.5);
    this.emblemGfx.beginPath();
    this.emblemGfx.moveTo(cx - 12, cy - 8 + hover);
    this.emblemGfx.lineTo(cx, cy + hover);
    this.emblemGfx.lineTo(cx + 12, cy - 8 + hover);
    this.emblemGfx.strokePath();
  }
}
