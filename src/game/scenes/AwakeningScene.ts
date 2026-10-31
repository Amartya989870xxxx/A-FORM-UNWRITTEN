import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, SCENE_KEYS } from '../constants';
import { AudioManager } from '../systems/AudioManager';

interface AwakeningBeat {
  verse: string;
  subverse: string;
  prompt: string;
}

const AWAKENING_BEATS: AwakeningBeat[] = [
  {
    verse: 'Silence first.',
    subverse: 'Then the ache of an outline where a body used to be.',
    prompt: '[ Press SPACE or E to open your eyes ]',
  },
  {
    verse: 'Death holds no claim over what remains of you.',
    subverse: 'Yet your hands are mist, your past is blank, and something essential is missing.',
    prompt: '[ Press SPACE or E to gather your scattered form ]',
  },
  {
    verse: 'Below the twilight drift, ancient stones await a footprint.',
    subverse: 'You descend into the Shattered Verge—to reclaim what you believe was stolen.',
    prompt: '[ Press SPACE or E to awaken ]',
  },
];

export class AwakeningScene extends Phaser.Scene {
  private gfx!: Phaser.GameObjects.Graphics;
  private chapterLabel!: Phaser.GameObjects.Text;
  private verseText!: Phaser.GameObjects.Text;
  private subverseText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;

  private beatIndex = 0;
  private beatTransitioning = false;
  private finishing = false;

  constructor() {
    super({ key: SCENE_KEYS.AWAKENING });
  }

  public create(): void {
    this.beatIndex = 0;
    this.beatTransitioning = false;
    this.finishing = false;

    AudioManager.getInstance().unlockAndStartAmbient(false);

    this.cameras.main.setBackgroundColor(PALETTE.VOID_DEEP);
    this.gfx = this.add.graphics();

    this.add.particles(0, 0, 'tex_mote_cyan', {
      x: { min: 180, max: GAME_WIDTH - 180 },
      y: { min: 120, max: GAME_HEIGHT - 120 },
      speedY: { min: -24, max: 24 },
      speedX: { min: -24, max: 24 },
      scale: { start: 0.35, end: 0 },
      alpha: { start: 0.45, end: 0 },
      lifespan: 3600,
      frequency: 130,
      blendMode: 'ADD',
    });

    this.chapterLabel = this.add
      .text(GAME_WIDTH / 2, 118, 'CHAPTER 0  —  AWAKENING', {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: PALETTE.TEXT_MUTED,
        letterSpacing: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0.8);

    this.verseText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 78, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '25px',
        color: PALETTE.TEXT_LIGHT,
        align: 'center',
      })
      .setOrigin(0.5);

    this.subverseText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 118, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '15.5px',
        fontStyle: 'italic',
        color: PALETTE.TEXT_MUTED,
        align: 'center',
        wordWrap: { width: 720 },
      })
      .setOrigin(0.5);

    this.promptText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 86, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '13.5px',
        color: PALETTE.TEXT_CYAN,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH - 28, 24, '[ESC] Skip Intro', {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
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
    const beat = AWAKENING_BEATS[index];
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
      alpha: 0.92,
      delay: 320,
      duration: 420,
      onComplete: () => {
        this.beatTransitioning = false;
      },
    });
  }

  private advanceBeat(): void {
    if (this.finishing || this.beatTransitioning) return;
    AudioManager.getInstance().playInteract();

    if (this.beatIndex + 1 < AWAKENING_BEATS.length) {
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
      this.scene.start(SCENE_KEYS.GAME, { loadSaved: false });
    });
  }

  public update(time: number): void {
    const t = time * 0.001;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 42;

    this.gfx.clear();

    // Expanding ethereal pulse rings
    const stage = this.beatIndex;
    const baseRadius = 34 + stage * 14;
    this.gfx.fillStyle(PALETTE.ETHEREAL_CYAN, 0.06 + stage * 0.03);
    this.gfx.fillCircle(cx, cy, baseRadius * 1.9 + Math.sin(t * 2.4) * 6);

    // Orbiting unfinished fragments drawing closer with each beat
    const orbitDist = 66 - stage * 18;
    for (let i = 0; i < 6; i++) {
      const a = t * 1.3 + (i * Math.PI) / 3;
      const fx = cx + Math.cos(a) * orbitDist;
      const fy = cy + Math.sin(a * 1.2) * (orbitDist * 0.65);
      this.gfx.fillStyle(0x10172d, 0.9);
      this.gfx.fillCircle(fx, fy, 4);
      this.gfx.lineStyle(1.3, PALETTE.ETHEREAL_CYAN, 0.78);
      this.gfx.strokeCircle(fx, fy, 4);
    }

    // Beat 1+: Eyes open inside the unfinished silhouette
    if (stage >= 1) {
      this.gfx.fillStyle(0x0b0f1f, 0.92);
      this.gfx.fillCircle(cx, cy - 16, 13);
      this.gfx.lineStyle(1.6, PALETTE.ETHEREAL_CYAN, 0.88);
      this.gfx.strokeCircle(cx, cy - 16, 13);

      // Luminous awakening eyes
      this.gfx.fillStyle(PALETTE.ETHEREAL_SOFT, 0.96);
      this.gfx.fillEllipse(cx - 4.5, cy - 16, 3.6, 4.2);
      this.gfx.fillEllipse(cx + 4.5, cy - 16, 3.6, 4.2);
    }

    // Beat 2: Fragmented torso outline forms beneath the eyes
    if (stage >= 2) {
      this.gfx.fillStyle(0x0b0f1f, 0.85);
      this.gfx.lineStyle(1.6, PALETTE.ETHEREAL_CYAN, 0.8);
      this.gfx.beginPath();
      this.gfx.moveTo(cx - 14, cy + 2);
      this.gfx.lineTo(cx + 14, cy + 2);
      this.gfx.lineTo(cx + 9, cy + 28);
      this.gfx.lineTo(cx - 9, cy + 28);
      this.gfx.closePath();
      this.gfx.fillPath();
      this.gfx.strokePath();

      this.chapterLabel.setAlpha(0.95);
    }
  }
}

