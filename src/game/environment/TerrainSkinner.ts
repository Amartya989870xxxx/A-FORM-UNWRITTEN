import type Phaser from 'phaser';
import { PALETTE } from '../constants';
import { ArtGenerator } from '../utils/ArtGenerator';
import type { TerrainSkinId } from './types';

export class TerrainSkinner {
  /**
   * Renders a styled visual skin over a collision rectangle.
   * Collider geometry remains completely unchanged.
   */
  public static renderPlatform(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    skin: TerrainSkinId,
    textured = false
  ): void {
    if (textured) {
      const left = x - w / 2;
      const top = y - h / 2;
      // Soft ambient contact shadow beneath platform
      g.fillStyle(0x060810, 0.45);
      g.fillRect(left + 2, top + h, w - 4, 3);
      // Subtle top edge rim light
      g.lineStyle(1, PALETTE.STONE_HIGHLIGHT, 0.35);
      g.beginPath();
      g.moveTo(left, top);
      g.lineTo(left + w, top);
      g.strokePath();
      return;
    }

    switch (skin) {
      case 'ground':
      case 'floating':
      case 'aqueduct':
      case 'sanctum':
        ArtGenerator.drawCarvedPlatform(g, x, y, w, h, skin);
        break;

      case 'grass':
        this.drawGrassSkin(g, x, y, w, h);
        break;

      case 'soil':
        this.drawSoilSkin(g, x, y, w, h);
        break;

      case 'limestone':
        this.drawLimestoneSkin(g, x, y, w, h);
        break;

      case 'stone_paving':
        this.drawStonePavingSkin(g, x, y, w, h);
        break;

      case 'rocky_outcrop':
        this.drawRockyOutcropSkin(g, x, y, w, h);
        break;

      case 'sand':
        this.drawSandSkin(g, x, y, w, h);
        break;

      case 'underground_masonry':
        this.drawUndergroundMasonrySkin(g, x, y, w, h);
        break;

      default:
        ArtGenerator.drawCarvedPlatform(g, x, y, w, h, 'ground');
        break;
    }
  }

  private static drawGrassSkin(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const left = x - w / 2;
    const top = y - h / 2;

    // Rich dark earth base
    g.fillStyle(0x191e2b, 1);
    g.fillRoundedRect(left, top, w, h, 4);

    // Deep lower shadow band
    g.fillStyle(0x0e111a, 0.9);
    g.fillRect(left + 2, top + Math.max(10, h - 12), w - 4, Math.min(12, h));

    // Overhanging grass lip (purely visual 5px lip)
    g.fillStyle(0x2d6350, 1);
    g.beginPath();
    g.moveTo(left - 3, top - 4);
    g.lineTo(left + w + 3, top - 4);
    g.lineTo(left + w + 1, top + 6);
    g.lineTo(left - 1, top + 6);
    g.closePath();
    g.fillPath();

    // Grass blade highlights along top edge
    g.fillStyle(0x429672, 0.85);
    for (let gx = left + 4; gx < left + w - 4; gx += 14) {
      g.fillRect(gx, top - 5, 4, 3);
    }

    // Root tendrils hanging below
    g.lineStyle(1.2, 0x3d3025, 0.7);
    for (let rx = left + 18; rx < left + w - 18; rx += 42) {
      g.beginPath();
      g.moveTo(rx, top + 7);
      g.lineTo(rx + 2, top + 15);
      g.strokePath();
    }
  }

  private static drawSoilSkin(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const left = x - w / 2;
    const top = y - h / 2;

    g.fillStyle(0x221a15, 1);
    g.fillRoundedRect(left, top, w, h, 4);

    // Compacted loam horizontal strata
    g.fillStyle(0x2f241d, 0.85);
    g.fillRect(left + 2, top + 3, w - 4, Math.min(10, h * 0.35));

    // Exposed pebble speckles
    g.fillStyle(0x56473b, 0.6);
    for (let px = left + 16; px < left + w - 16; px += 28) {
      g.fillCircle(px, top + 12, 1.8);
    }
  }

  private static drawLimestoneSkin(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const left = x - w / 2;
    const top = y - h / 2;

    g.fillStyle(0x2c3342, 1);
    g.fillRoundedRect(left, top, w, h, 4);

    // Pale limestone top course
    g.fillStyle(0x4f5b73, 1);
    g.fillRect(left, top, w, Math.min(10, h * 0.38));

    // Weathered mortar lines
    g.lineStyle(1, 0x1f2430, 0.8);
    for (let lx = left + 48; lx < left + w - 10; lx += 48) {
      g.beginPath();
      g.moveTo(lx, top);
      g.lineTo(lx, top + h);
      g.strokePath();
    }
  }

  private static drawStonePavingSkin(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const left = x - w / 2;
    const top = y - h / 2;

    g.fillStyle(0x1a2133, 1);
    g.fillRoundedRect(left, top, w, h, 4);

    // Fitted paving stones on top
    g.fillStyle(0x333e5c, 0.95);
    for (let px = left + 2; px < left + w - 18; px += 34) {
      g.fillRoundedRect(px, top + 1, 30, Math.min(12, h * 0.4), 2);
    }

    // Gold seam runic flecks
    g.fillStyle(PALETTE.REMNANT_GOLD, 0.35);
    for (let rx = left + 24; rx < left + w - 20; rx += 72) {
      g.fillCircle(rx, top + 5, 1.6);
    }
  }

  private static drawRockyOutcropSkin(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const left = x - w / 2;
    const top = y - h / 2;

    g.fillStyle(0x151b2a, 1);
    g.fillRoundedRect(left, top, w, h, 4);

    // Chiseled angular crag facets
    g.fillStyle(0x26314a, 0.85);
    g.beginPath();
    g.moveTo(left, top + 6);
    g.lineTo(left + w * 0.3, top + 1);
    g.lineTo(left + w * 0.65, top + 8);
    g.lineTo(left + w, top + 2);
    g.lineTo(left + w, top + h);
    g.lineTo(left, top + h);
    g.closePath();
    g.fillPath();

    // Sharp sunlit ridge line
    g.lineStyle(1.4, PALETTE.STONE_HIGHLIGHT, 0.65);
    g.beginPath();
    g.moveTo(left + 4, top + 2);
    g.lineTo(left + w * 0.5, top + 4);
    g.lineTo(left + w - 4, top + 2);
    g.strokePath();
  }

  private static drawSandSkin(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const left = x - w / 2;
    const top = y - h / 2;

    g.fillStyle(0x3d3023, 1);
    g.fillRoundedRect(left, top, w, h, 4);

    // Warm dune crest
    g.fillStyle(0x5c4832, 1);
    g.fillRect(left, top, w, Math.min(8, h * 0.3));

    // Wind ripple strata
    g.lineStyle(1, 0x7a6347, 0.5);
    for (let rx = left + 12; rx < left + w - 12; rx += 24) {
      g.beginPath();
      g.moveTo(rx, top + 3);
      g.lineTo(rx + 14, top + 4);
      g.strokePath();
    }
  }

  private static drawUndergroundMasonrySkin(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const left = x - w / 2;
    const top = y - h / 2;

    g.fillStyle(0x0e121f, 1);
    g.fillRoundedRect(left, top, w, h, 4);

    // Heavy basalt ashlar blocks
    g.fillStyle(0x192238, 0.95);
    g.fillRect(left + 2, top + 2, w - 4, Math.min(14, h * 0.42));

    // Cyan glowing damp moss in joints
    g.fillStyle(PALETTE.ETHEREAL_CYAN, 0.28);
    for (let mx = left + 36; mx < left + w - 20; mx += 64) {
      g.fillCircle(mx, top + 6, 2.2);
    }
  }
}
