import Phaser from 'phaser';
import { PALETTE } from '../constants';
import type { ImprintId } from '../systems/SaveManager';

export type NPCKind = 'oren' | 'vespera';

export class NPC {
  public readonly x: number;
  public readonly y: number;
  public readonly kind: NPCKind;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private imprintState: ImprintId | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: NPCKind) {
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(22);
  }

  public setImprintState(imprint: ImprintId | null): void {
    this.imprintState = imprint;
  }

  public update(time: number): void {
    const t = time * 0.001;
    this.gfx.clear();
    if (this.kind === 'oren') {
      this.renderOren(t);
    } else {
      this.renderVespera(t);
    }
  }

  private renderOren(t: number): void {
    const x = this.x;
    const y = this.y;

    // Carved stone chronicler shrine pedestal
    this.gfx.fillStyle(PALETTE.STONE_DARK, 0.96);
    this.gfx.fillRoundedRect(x - 24, y - 34, 48, 62, 8);
    this.gfx.lineStyle(1.5, PALETTE.STONE_HIGHLIGHT, 0.6);
    this.gfx.strokeRoundedRect(x - 24, y - 34, 48, 62, 8);

    // Rotating astrolabe rings behind Oren's mask
    const ringPulse = Math.sin(t * 1.8) * 2;
    this.gfx.lineStyle(1.4, PALETTE.REMNANT_GOLD, 0.48);
    this.gfx.strokeCircle(x, y - 22, 26 + ringPulse);
    this.gfx.lineStyle(1, PALETTE.ETHEREAL_CYAN, 0.35);
    this.gfx.strokeEllipse(x, y - 22, 62, 20);

    // Orbiting astrolabe bead
    const bx = x + Math.cos(t * 1.1) * 31;
    const by = y - 22 + Math.sin(t * 1.1) * 10;
    this.gfx.fillStyle(PALETTE.REMNANT_BRIGHT, 0.85);
    this.gfx.fillCircle(bx, by, 2.5);

    // Weathered stone cloak & shoulders
    this.gfx.fillStyle(0x252d47, 1);
    this.gfx.beginPath();
    this.gfx.moveTo(x - 19, y + 26);
    this.gfx.lineTo(x - 14, y - 14);
    this.gfx.lineTo(x + 14, y - 14);
    this.gfx.lineTo(x + 19, y + 26);
    this.gfx.closePath();
    this.gfx.fillPath();

    // Floating carved chronicle mask
    const maskY = y - 23 + Math.sin(t * 2.1) * 2.2;
    this.gfx.fillStyle(0x313b5c, 1);
    this.gfx.fillRoundedRect(x - 10, maskY - 12, 20, 24, 7);
    this.gfx.lineStyle(1.5, PALETTE.REMNANT_GOLD, 0.7);
    this.gfx.strokeRoundedRect(x - 10, maskY - 12, 20, 24, 7);

    // Gentle amber chronicler eyes
    this.gfx.fillStyle(PALETTE.REMNANT_BRIGHT, 0.92);
    this.gfx.fillCircle(x - 4, maskY - 2, 2.1);
    this.gfx.fillCircle(x + 4, maskY - 2, 2.1);
  }

  private renderVespera(t: number): void {
    const x = this.x;
    const y = this.y;

    // Memory Crucible beside Vespera (at x + 36)
    const cx = x + 36;
    const cy = y + 4;
    this.gfx.fillStyle(PALETTE.STONE_DARK, 1);
    this.gfx.fillRoundedRect(cx - 16, cy, 32, 24, 4);
    this.gfx.lineStyle(1.5, PALETTE.STONE_HIGHLIGHT, 0.7);
    this.gfx.strokeRoundedRect(cx - 16, cy, 32, 24, 4);

    const flameColor =
      this.imprintState === 'resonance'
        ? PALETTE.IMPRINT_RESONANCE
        : this.imprintState === 'resolve'
          ? PALETTE.IMPRINT_RESOLVE
          : PALETTE.ETHEREAL_CYAN;
    const flameAlpha = this.imprintState === 'resolve' ? 0.25 : 0.78;
    const flameRadius =
      this.imprintState === 'resonance'
        ? 15 + Math.sin(t * 3.2) * 2
        : 11 + Math.sin(t * 6.5) * 2.5;

    this.gfx.fillStyle(flameColor, flameAlpha * 0.3);
    this.gfx.fillCircle(cx, cy - 10, flameRadius * 1.6);
    this.gfx.fillStyle(flameColor, flameAlpha);
    this.gfx.fillCircle(cx, cy - 10 + Math.sin(t * 3.5) * 2, flameRadius * 0.65);

    // If Resolve was chosen, Vespera's vigil has peacefully dissolved into starlight motes
    if (this.imprintState === 'resolve') {
      for (let i = 0; i < 5; i++) {
        const mx = x + Math.sin(t * 1.4 + i * 1.3) * 14;
        const my = y - 6 - ((t * 14 + i * 9) % 36);
        this.gfx.fillStyle(PALETTE.IMPRINT_RESOLVE, 0.55);
        this.gfx.fillCircle(mx, my, 2.2);
      }
      return;
    }

    // Vespera's translucent warden silhouette
    const hover = Math.sin(t * 2.3) * 2.8;
    const vy = y + hover;
    const auraColor =
      this.imprintState === 'resonance' ? PALETTE.IMPRINT_RESONANCE : PALETTE.ETHEREAL_CYAN;

    this.gfx.fillStyle(auraColor, 0.12);
    this.gfx.fillCircle(x, vy - 6, 26);

    // Flowing spectral robe
    this.gfx.fillStyle(0x18223d, 0.88);
    this.gfx.lineStyle(1.5, auraColor, 0.72);
    this.gfx.beginPath();
    this.gfx.moveTo(x - 14, vy + 24);
    this.gfx.lineTo(x - 9, vy - 12);
    this.gfx.lineTo(x + 9, vy - 12);
    this.gfx.lineTo(x + 16, vy + 24);
    this.gfx.closePath();
    this.gfx.fillPath();
    this.gfx.strokePath();

    // Hooded head & serene eyes facing the Crucible/player
    this.gfx.fillStyle(0x12192e, 0.94);
    this.gfx.fillCircle(x, vy - 20, 8);
    this.gfx.lineStyle(1.4, auraColor, 0.8);
    this.gfx.strokeCircle(x, vy - 20, 8);

    this.gfx.fillStyle(0xeaf8ff, 0.92);
    this.gfx.fillCircle(x - 2.5, vy - 20, 1.8);
    this.gfx.fillCircle(x + 2.5, vy - 20, 1.8);
  }
}

