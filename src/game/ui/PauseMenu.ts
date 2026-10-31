import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../constants';
import { AudioManager } from '../systems/AudioManager';

export interface PauseMenuCallbacks {
  onResume: () => void;
  onOpenAtlas: () => void;
  onOpenJournal: () => void;
  onAudioToggled: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

interface MenuOption {
  getLabel: () => string;
  action: () => void;
}

export class PauseMenu {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly options: MenuOption[];
  private selectedIndex = 0;
  private openState = false;

  constructor(scene: Phaser.Scene, callbacks: PauseMenuCallbacks) {
    this.scene = scene;
    this.options = [
      { getLabel: () => 'Resume Journey', action: () => callbacks.onResume() },
      { getLabel: () => 'Open World Atlas (Tab)', action: () => callbacks.onOpenAtlas() },
      { getLabel: () => 'Open Chronicle (J)', action: () => callbacks.onOpenJournal() },
      {
        getLabel: () => `Audio: ${AudioManager.getInstance().isMuted() ? 'Muted' : 'Enabled'} (M)`,
        action: () => {
          AudioManager.getInstance().toggleMute();
          callbacks.onAudioToggled();
          this.rebuild();
        },
      },
      { getLabel: () => 'Restart Chapter One', action: () => callbacks.onRestart() },
      { getLabel: () => 'Return to Title Screen', action: () => callbacks.onMainMenu() },
    ];

    this.container = scene.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setScrollFactor(0)
      .setDepth(160)
      .setVisible(false);
  }

  public getRootObjects(): Phaser.GameObjects.GameObject[] {
    return [this.container];
  }

  public isOpen(): boolean {
    return this.openState;
  }

  public open(): void {
    this.openState = true;
    this.selectedIndex = 0;
    AudioManager.getInstance().playDialogueBlip();
    this.rebuild();
    this.container.setVisible(true);
  }

  public close(): void {
    this.openState = false;
    this.container.setVisible(false);
  }

  public moveSelection(delta: number): void {
    if (!this.openState) return;
    this.selectedIndex = (this.selectedIndex + delta + this.options.length) % this.options.length;
    AudioManager.getInstance().playDialogueBlip();
    this.rebuild();
  }

  public confirm(): void {
    if (!this.openState) return;
    AudioManager.getInstance().playInteract();
    this.options[this.selectedIndex].action();
  }

  private rebuild(): void {
    this.container.removeAll(true);

    const backdrop = this.scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050711, 0.82)
      .setInteractive();

    const w = 540;
    const h = 490;
    const panel = this.scene.add.graphics();
    panel.fillStyle(PALETTE.UI_BG, 0.97);
    panel.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    panel.lineStyle(1.8, PALETTE.REMNANT_GOLD, 0.82);
    panel.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);

    const title = this.scene.add
      .text(0, -h / 2 + 44, 'JOURNEY PAUSED', {
        fontFamily: 'Georgia, serif',
        fontSize: '23px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_LIGHT,
        letterSpacing: 3,
      })
      .setOrigin(0.5);

    const controlsNote = this.scene.add
      .text(
        0,
        h / 2 - 30,
        'Move: A/D  •  Leap/Drift: Space  •  Impact: S+Space  •  Atlas: Tab',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '13px',
          color: PALETTE.TEXT_MUTED,
        }
      )
      .setOrigin(0.5);

    this.container.add([backdrop, panel, title, controlsNote]);

    const startY = -124;
    const rowH = 48;

    this.options.forEach((opt, idx) => {
      const selected = idx === this.selectedIndex;
      const y = startY + idx * 57;
      const btnW = 410;

      const bg = this.scene.add.graphics();
      bg.fillStyle(selected ? 0x1b2442 : 0x11172b, 0.96);
      bg.fillRoundedRect(-btnW / 2, y - rowH / 2, btnW, rowH, 8);
      bg.lineStyle(
        selected ? 1.8 : 1,
        selected ? PALETTE.REMNANT_GOLD : PALETTE.STONE_HIGHLIGHT,
        selected ? 0.96 : 0.45
      );
      bg.strokeRoundedRect(-btnW / 2, y - rowH / 2, btnW, rowH, 8);

      const label = this.scene.add
        .text(0, y, `${selected ? '◆  ' : ''}${opt.getLabel()}`, {
          fontFamily: 'Georgia, serif',
          fontSize: '16.5px',
          color: selected ? PALETTE.TEXT_GOLD : PALETTE.TEXT_LIGHT,
        })
        .setOrigin(0.5);

      const hit = this.scene.add
        .rectangle(0, y, btnW, rowH, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (this.selectedIndex !== idx) {
          this.selectedIndex = idx;
          this.rebuild();
        }
      });
      hit.on('pointerdown', () => {
        this.selectedIndex = idx;
        this.confirm();
      });

      this.container.add([bg, label, hit]);
    });
  }
}
