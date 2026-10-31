import Phaser from 'phaser';
import {
  DEFAULT_PLAYER_NAME,
  GAME_HEIGHT,
  GAME_WIDTH,
  PALETTE,
  SCENE_KEYS,
} from '../constants';
import { AudioManager } from '../systems/AudioManager';
import { sanitizePlayerName } from '../systems/SaveManager';

interface AwakeningSceneData {
  playerName?: string;
}

interface AwakeningBeat {
  verse: string;
  subverse: string;
  prompt: string;
}

export class AwakeningScene extends Phaser.Scene {
  private gfx!: Phaser.GameObjects.Graphics;
  private chapterLabel!: Phaser.GameObjects.Text;
  private verseText!: Phaser.GameObjects.Text;
  private subverseText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;

  private beats: AwakeningBeat[] = [];
  private playerName = DEFAULT_PLAYER_NAME;
  private beatIndex = 0;
  private beatTransitioning = false;
  private finishing = false;

  constructor() {
    super({ key: SCENE_KEYS.AWAKENING });
  }

  public create(data?: AwakeningSceneData): void {
    this.playerName = sanitizePlayerName(data?.playerName);
    this.beatIndex = 0;
    this.beatTransitioning = false;
    this.finishing = false;

    this.beats = [
      {
        verse: 'Silence first.',
        subverse: 'No heartbeat, no breath, no physical body beneath the dark.',
        prompt: '[ Press SPACE or E to stir within the void ]',
      },
      {
        verse: 'Threads of charcoal ash and kintsugi gold draw together around your unseen presence.',
        subverse:
          'An unfamiliar stabilizing garment gives your bodiless existence a silhouette capable of touching stone.',
        prompt: '[ Press SPACE or E to inhabit the garment ]',
      },
      {
        verse: `Below the twilight mist, the Shattered Verge awaits, ${this.playerName}.`,
        subverse:
          'You step forth to reclaim what you believe was lost, unaware of who you may become along the way.',
        prompt: '[ Press SPACE or E to awaken upon the Precipice ]',
      },
    ];

    AudioManager.getInstance().unlockAndStartAmbient(false);

    this.cameras.main.setBackgroundColor(PALETTE.VOID_DEEP);
    this.gfx = this.add.graphics();

    this.add.particles(0, 0, 'tex_mote_gold', {
      x: { min: 240, max: GAME_WIDTH - 240 },
      y: { min: 150, max: GAME_HEIGHT - 150 },
      speedY: { min: -26, max: 26 },
      speedX: { min: -26, max: 26 },
      scale: { start: 0.36, end: 0 },
      alpha: { start: 0.46, end: 0 },
      lifespan: 3800,
      frequency: 120,
      blendMode: 'ADD',
    });

    this.chapterLabel = this.add
      .text(GAME_WIDTH / 2, 155, 'PROLOGUE: THE STABILIZING GARMENT', {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: PALETTE.TEXT_GOLD,
        letterSpacing: 4.5,
      })
      .setOrigin(0.5)
      .setAlpha(0.85);

    this.verseText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 125, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '31px',
        color: PALETTE.TEXT_LIGHT,
        align: 'center',
        wordWrap: { width: 1180 },
      })
      .setOrigin(0.5);

    this.subverseText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 188, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '19px',
        fontStyle: 'italic',
        color: PALETTE.TEXT_MUTED,
        align: 'center',
        wordWrap: { width: 980 },
      })
      .setOrigin(0.5);

    this.promptText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 115, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '16.5px',
        color: PALETTE.TEXT_CYAN,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH - 42, 34, '[ESC] Skip Prologue', {
        fontFamily: 'Georgia, serif',
        fontSize: '14.5px',
        color: PALETTE.TEXT_MUTED,
      })
      .setOrigin(1, 0);

    this.showBeat(0);

    const kb = this.input.keyboard;
    if (kb) {
      kb.on('keydown-SPACE', () => this.advanceBeat());
      kb.on('keydown-E', () => this.advanceBeat());
      kb.on('keydown-ENTER', () => this.advanceBeat());
      kb.on('keydown-ESC', () => this.finishAwakening());
    }
    this.input.on('pointerdown', () => this.advanceBeat());

    this.cameras.main.fadeIn(650, 7, 9, 19);
  }

  private showBeat(index: number): void {
    const beat = this.beats[index];
    this.beatTransitioning = true;

    this.verseText.setAlpha(0).setText(beat.verse);
    this.subverseText.setAlpha(0).setText(beat.subverse);
    this.promptText.setAlpha(0).setText(beat.prompt);

    this.tweens.add({
      targets: [this.verseText, this.subverseText],
      alpha: 1,
      duration: 520,
      ease: 'Sine.easeOut',
    });

    this.tweens.add({
      targets: this.promptText,
      alpha: 0.94,
      delay: 300,
      duration: 400,
      onComplete: () => {
        this.beatTransitioning = false;
      },
    });
  }

  private advanceBeat(): void {
    if (this.finishing || this.beatTransitioning) return;
    AudioManager.getInstance().playInteract();

    if (this.beatIndex + 1 < this.beats.length) {
      this.beatIndex++;
      this.showBeat(this.beatIndex);
    } else {
      this.finishAwakening();
    }
  }

  private finishAwakening(): void {
    if (this.finishing) return;
    this.finishing = true;
    AudioManager.getInstance().playQuestChime();
    this.cameras.main.fadeOut(700, 7, 9, 19);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.GAME, {
        loadSaved: false,
        playerName: this.playerName,
      });
    });
  }

  public update(time: number): void {
    const t = time * 0.001;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 70;
    const stage = this.beatIndex;

    this.gfx.clear();

    // Soft kintsugi-gold stabilization aura
    const baseRadius = 46 + stage * 18;
    this.gfx.fillStyle(PALETTE.GARMENT_GOLD_SEAM, 0.05 + stage * 0.035);
    this.gfx.fillCircle(cx, cy, baseRadius * 2 + Math.sin(t * 2.2) * 8);

    // Orbiting gold seam threads weaving inward across the 3 beats
    const orbitDist = 92 - stage * 26;
    for (let i = 0; i < 6; i++) {
      const a = t * 1.2 + (i * Math.PI) / 3;
      const fx = cx + Math.cos(a) * orbitDist;
      const fy = cy + Math.sin(a * 1.25) * (orbitDist * 0.65);
      this.gfx.lineStyle(1.6, PALETTE.GARMENT_GOLD_BRIGHT, 0.78);
      this.gfx.beginPath();
      this.gfx.moveTo(fx - Math.sin(a) * 10, fy + Math.cos(a) * 6);
      this.gfx.lineTo(fx + Math.sin(a) * 10, fy - Math.cos(a) * 6);
      this.gfx.strokePath();
    }

    // Beat 1+: The charcoal cowl and silver-ash crest coalesce around an empty shadow void
    if (stage >= 1) {
      this.gfx.fillStyle(0x09090f, 1);
      this.gfx.fillCircle(cx, cy - 28, 16);

      // Swept silver-ash crest threads
      this.gfx.fillStyle(PALETTE.GARMENT_SILVER_CREST, 0.9);
      this.gfx.beginPath();
      this.gfx.moveTo(cx - 17, cy - 24);
      this.gfx.lineTo(cx - 21, cy - 36);
      this.gfx.lineTo(cx - 4, cy - 46);
      this.gfx.lineTo(cx + 16, cy - 40);
      this.gfx.lineTo(cx + 18, cy - 31);
      this.gfx.lineTo(cx + 3, cy - 34);
      this.gfx.closePath();
      this.gfx.fillPath();

      // High charcoal cowl collar with gold seam
      this.gfx.fillStyle(PALETTE.GARMENT_CHARCOAL, 1);
      this.gfx.beginPath();
      this.gfx.moveTo(cx - 20, cy - 12);
      this.gfx.lineTo(cx - 16, cy - 25);
      this.gfx.lineTo(cx + 16, cy - 25);
      this.gfx.lineTo(cx + 20, cy - 12);
      this.gfx.closePath();
      this.gfx.fillPath();

      this.gfx.lineStyle(1.6, PALETTE.GARMENT_GOLD_SEAM, 0.9);
      this.gfx.beginPath();
      this.gfx.moveTo(cx - 16, cy - 24);
      this.gfx.lineTo(cx, cy - 19);
      this.gfx.lineTo(cx + 16, cy - 24);
      this.gfx.strokePath();
    }

    // Beat 2: Full layered charcoal mantle, parchment lining, and antique gold waist-ring clasp
    if (stage >= 2) {
      const sway = Math.sin(t * 2.4) * 5;

      // Parchment inner lining
      this.gfx.fillStyle(PALETTE.GARMENT_LINING, 0.82);
      this.gfx.beginPath();
      this.gfx.moveTo(cx - 24, cy - 10);
      this.gfx.lineTo(cx + 24, cy - 10);
      this.gfx.lineTo(cx + 34 + sway, cy + 56);
      this.gfx.lineTo(cx - 34 + sway, cy + 56);
      this.gfx.closePath();
      this.gfx.fillPath();

      // Charcoal outer robe & split coat-tails
      this.gfx.fillStyle(PALETTE.GARMENT_CHARCOAL, 0.98);
      this.gfx.beginPath();
      this.gfx.moveTo(cx - 22, cy - 12);
      this.gfx.lineTo(cx + 22, cy - 12);
      this.gfx.lineTo(cx + 28 + sway, cy + 58);
      this.gfx.lineTo(cx + sway * 0.5, cy + 42);
      this.gfx.lineTo(cx - 28 + sway, cy + 58);
      this.gfx.closePath();
      this.gfx.fillPath();

      // Kintsugi gold seams & antique waist-ring clasp
      this.gfx.lineStyle(1.8, PALETTE.GARMENT_GOLD_BRIGHT, 0.95);
      this.gfx.beginPath();
      this.gfx.moveTo(cx - 14, cy - 8);
      this.gfx.lineTo(cx, cy + 8);
      this.gfx.lineTo(cx + 14, cy - 4);
      this.gfx.strokePath();

      this.gfx.strokeCircle(cx + 4, cy + 18, 5.5);
      this.chapterLabel.setAlpha(0.98);
    }
  }
}
