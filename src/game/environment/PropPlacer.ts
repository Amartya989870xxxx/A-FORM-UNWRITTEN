import type Phaser from 'phaser';
import { PALETTE } from '../constants';
import type { LightingController } from '../time/LightingController';
import type { PropPlacement } from './types';

interface PlacedPropImage {
  image: Phaser.GameObjects.Image;
  prop: PropPlacement;
  index: number;
}

export class PropPlacer {
  private readonly scene: Phaser.Scene;
  private readonly staticGraphics: Phaser.GameObjects.Graphics;
  private readonly animatedGraphics: Phaser.GameObjects.Graphics;
  private animatedProps: PropPlacement[] = [];
  private propImages: PlacedPropImage[] = [];
  private lightingController?: LightingController;

  constructor(scene: Phaser.Scene, lightingController?: LightingController) {
    this.scene = scene;
    this.lightingController = lightingController;
    this.staticGraphics = scene.add.graphics().setDepth(10);
    this.animatedGraphics = scene.add.graphics().setDepth(13);
  }

  public setLightingController(controller: LightingController): void {
    this.lightingController = controller;
  }

  public placeProps(props: PropPlacement[]): void {
    for (const prop of props) {
      this.placeProp(prop);
    }
  }

  public placeProp(prop: PropPlacement): void {
    const scale = prop.scale ?? 1;
    let renderedAsImage = false;

    let texKey = prop.textureKey;
    if (!texKey) {
      if (prop.kind === 'wind_chimes') texKey = 'tex_prop_wind_chimes';
      else if (prop.kind === 'stone_lantern') texKey = 'tex_prop_stone_lantern';
      else if (prop.kind === 'statue_fragment') texKey = 'tex_prop_statue_fragment';
      else if (prop.kind === 'wildflowers') texKey = 'tex_prop_wildflowers';
    }

    if (
      texKey &&
      this.scene.textures &&
      typeof this.scene.textures.exists === 'function' &&
      this.scene.textures.exists(texKey)
    ) {
      const img = this.scene.add.image(prop.x, prop.y, texKey);
      if (prop.kind === 'wind_chimes') {
        img.setOrigin(0.5, 0.0);
      } else {
        img.setOrigin(0.5, 1.0);
      }
      img.setScale(scale);
      const depth = prop.depth ?? (prop.kind === 'stone_lantern' || prop.kind === 'wildflowers' ? 14 : 13);
      img.setDepth(depth);
      this.propImages.push({ image: img, prop, index: this.propImages.length });
      renderedAsImage = true;
    }

    if (!renderedAsImage) {
      this.drawStaticProp(this.staticGraphics, prop.x, prop.y, prop.kind, scale);
    }

    if (prop.kind === 'brazier' || prop.kind === 'waterfall' || prop.sway) {
      this.animatedProps.push(prop);
    }

    if (prop.kind === 'brazier') {
      if (this.lightingController) {
        this.lightingController.registerLocalLight({
          x: prop.x,
          y: prop.y - 32 * scale,
          baseRadius: 115 * scale,
          baseIntensity: 0.85,
          flickerSpeed: 3.2,
        });
      }

      this.scene.add
        .particles(prop.x, prop.y - 38 * scale, 'tex_mote_amber', {
          x: { min: -7, max: 7 },
          y: { min: -4, max: 4 },
          speedY: { min: -44, max: -16 },
          speedX: { min: -10, max: 10 },
          scale: { start: 0.3, end: 0 },
          alpha: { start: 0.72, end: 0 },
          lifespan: 950,
          frequency: 165,
          blendMode: 'ADD',
        })
        .setDepth(14);
    } else if (prop.kind === 'stone_lantern' || prop.hasLight) {
      if (this.lightingController) {
        this.lightingController.registerLocalLight({
          x: prop.x,
          y: prop.y - 18 * scale,
          baseRadius: 110,
          baseIntensity: 0.8,
          flickerSpeed: 1.6,
        });
      }
    }
  }

  public update(time: number): void {
    const t = time * 0.001;
    this.animatedGraphics.clear();

    for (let idx = 0; idx < this.animatedProps.length; idx++) {
      const prop = this.animatedProps[idx];
      const s = prop.scale ?? 1;

      if (prop.kind === 'brazier') {
        const fx = prop.x;
        const fy = prop.y - 36 * s;
        const flicker = Math.sin(t * 9.5 + idx * 1.7) * 2.2 + Math.cos(t * 14 + idx) * 1.1;

        // Outer amber flame tongue
        this.animatedGraphics.fillStyle(PALETTE.BRAZIER_GLOW, 0.9);
        this.animatedGraphics.beginPath();
        this.animatedGraphics.moveTo(fx - 9 * s, fy + 2);
        this.animatedGraphics.lineTo(fx + flicker * 0.4, fy - (18 + flicker) * s);
        this.animatedGraphics.lineTo(fx + 9 * s, fy + 2);
        this.animatedGraphics.closePath();
        this.animatedGraphics.fillPath();

        // Bright gold-white flame core
        this.animatedGraphics.fillStyle(0xffe6a3, 0.95);
        this.animatedGraphics.beginPath();
        this.animatedGraphics.moveTo(fx - 4.5 * s, fy + 2);
        this.animatedGraphics.lineTo(fx - flicker * 0.25, fy - (10 + flicker * 0.6) * s);
        this.animatedGraphics.lineTo(fx + 4.5 * s, fy + 2);
        this.animatedGraphics.closePath();
        this.animatedGraphics.fillPath();
      } else if (prop.kind === 'waterfall') {
        const wx = prop.x;
        const topY = prop.y + 14;
        const dropH = 225 * s;

        this.animatedGraphics.fillStyle(PALETTE.ETHEREAL_CYAN, 0.14);
        this.animatedGraphics.fillRect(wx - 13 * s, topY, 26 * s, dropH);

        for (let strand = -1; strand <= 1; strand++) {
          const sx = wx + strand * 6 * s;
          const offset = ((t * 145 + idx * 31 + strand * 29) % 48);
          this.animatedGraphics.lineStyle(2.2, PALETTE.ETHEREAL_SOFT, 0.34);
          for (let segY = topY + offset; segY < topY + dropH - 22; segY += 48) {
            this.animatedGraphics.beginPath();
            this.animatedGraphics.moveTo(sx, segY);
            this.animatedGraphics.lineTo(sx, segY + 26);
            this.animatedGraphics.strokePath();
          }
        }

        // Mist spray cloud at base of cascade
        this.animatedGraphics.fillStyle(PALETTE.ETHEREAL_SOFT, 0.18 + Math.sin(t * 4 + idx) * 0.04);
        this.animatedGraphics.fillEllipse(wx, topY + dropH, 52 * s, 18 * s);
      } else if (prop.kind === 'grass_tuft' || prop.sway) {
        // Lightweight grass sway
        const gx = prop.x;
        const gy = prop.y;
        const sway = Math.sin(t * 3.2 + idx * 0.8) * 3.5 * s;

        this.animatedGraphics.lineStyle(1.4, 0x367a5b, 0.85);
        this.animatedGraphics.beginPath();
        this.animatedGraphics.moveTo(gx, gy);
        this.animatedGraphics.lineTo(gx + sway, gy - 16 * s);
        this.animatedGraphics.strokePath();

        this.animatedGraphics.beginPath();
        this.animatedGraphics.moveTo(gx + 4 * s, gy);
        this.animatedGraphics.lineTo(gx + 4 * s + sway * 1.2, gy - 20 * s);
        this.animatedGraphics.strokePath();
      }
    }

    for (const item of this.propImages) {
      if (item.prop.sway) {
        if (item.prop.kind === 'wind_chimes') {
          item.image.setRotation(Math.sin(t * 1.8 + item.index * 1.4) * 0.05);
        } else if (item.prop.kind === 'wildflowers') {
          item.image.setRotation(Math.sin(t * 2.6 + item.index * 1.1) * 0.035);
        }
      }
    }
  }

  public clear(): void {
    this.staticGraphics.clear();
    this.animatedGraphics.clear();
    this.animatedProps = [];
    for (const item of this.propImages) {
      item.image.destroy();
    }
    this.propImages = [];
  }

  public destroy(): void {
    this.staticGraphics.destroy();
    this.animatedGraphics.destroy();
    this.animatedProps = [];
    for (const item of this.propImages) {
      item.image.destroy();
    }
    this.propImages = [];
  }

  private drawStaticProp(
    g: Phaser.GameObjects.Graphics,
    x: number,
    floorY: number,
    kind: PropPlacement['kind'],
    scale: number
  ): void {
    switch (kind) {
      case 'arch': {
        const w = 114 * scale;
        const h = 138 * scale;
        g.fillStyle(0x161d34, 0.88);
        g.fillRect(x - w / 2, floorY - h, 19 * scale, h);
        g.fillRect(x + w / 2 - 19 * scale, floorY - h * 0.9, 19 * scale, h * 0.9);
        g.fillRoundedRect(x - w / 2 - 8, floorY - h - 14, w + 16, 18 * scale, 4);
        g.lineStyle(1.4, PALETTE.REMNANT_GOLD, 0.25);
        g.strokeCircle(x, floorY - h + 6, 16 * scale);
        break;
      }

      case 'pillar': {
        const h = 118 * scale;
        g.fillStyle(0x182038, 0.86);
        g.fillRect(x - 13 * scale, floorY - h, 26 * scale, h);
        g.fillRect(x - 19 * scale, floorY - 12, 38 * scale, 12);
        g.fillStyle(PALETTE.ETHEREAL_CYAN, 0.18);
        g.fillRect(x - 2, floorY - h + 20, 4, h * 0.45);
        break;
      }

      case 'statue': {
        const h = 94 * scale;
        g.fillStyle(0x19213a, 0.88);
        g.fillRoundedRect(x - 20 * scale, floorY - 18, 40 * scale, 18, 3);
        g.beginPath();
        g.moveTo(x - 15 * scale, floorY - 18);
        g.lineTo(x - 10 * scale, floorY - h);
        g.lineTo(x + 8 * scale, floorY - h + 6);
        g.lineTo(x + 15 * scale, floorY - 18);
        g.closePath();
        g.fillPath();
        g.fillCircle(x - 1 * scale, floorY - h - 10 * scale, 9 * scale);
        break;
      }

      case 'monolith': {
        const h = 144 * scale;
        g.fillStyle(0x151c31, 0.9);
        g.beginPath();
        g.moveTo(x - 22 * scale, floorY);
        g.lineTo(x - 14 * scale, floorY - h);
        g.lineTo(x, floorY - h - 22 * scale);
        g.lineTo(x + 14 * scale, floorY - h);
        g.lineTo(x + 22 * scale, floorY);
        g.closePath();
        g.fillPath();
        g.lineStyle(1.4, PALETTE.REMNANT_GOLD, 0.32);
        g.strokeCircle(x, floorY - h * 0.55, 11 * scale);
        break;
      }

      case 'roots': {
        g.lineStyle(2.2, 0x3b4d6b, 0.65);
        for (let i = -2; i <= 2; i++) {
          g.beginPath();
          g.moveTo(x + i * 24, floorY - 210);
          g.lineTo(x + i * 20 + 8, floorY - 145);
          g.lineTo(x + i * 26 - 5, floorY - 95);
          g.strokePath();
          g.fillStyle(PALETTE.REMNANT_GOLD, 0.48);
          g.fillCircle(x + i * 26 - 5, floorY - 95, 3);
        }
        break;
      }

      case 'brazier': {
        const h = 34 * scale;
        g.fillStyle(0x181c2e, 0.96);
        g.fillRect(x - 7 * scale, floorY - h + 8 * scale, 14 * scale, h - 8 * scale);
        g.fillRoundedRect(x - 13 * scale, floorY - 6 * scale, 26 * scale, 6 * scale, 2);
        g.fillStyle(0x282438, 1);
        g.beginPath();
        g.moveTo(x - 16 * scale, floorY - h);
        g.lineTo(x + 16 * scale, floorY - h);
        g.lineTo(x + 10 * scale, floorY - h + 10 * scale);
        g.lineTo(x - 10 * scale, floorY - h + 10 * scale);
        g.closePath();
        g.fillPath();
        g.lineStyle(1.2, PALETTE.REMNANT_BRONZE, 0.8);
        g.strokeRect(x - 14 * scale, floorY - h, 28 * scale, 3 * scale);
        break;
      }

      case 'rock_cluster': {
        g.fillStyle(0x1c2438, 0.95);
        g.fillCircle(x - 12 * scale, floorY - 8 * scale, 10 * scale);
        g.fillCircle(x + 10 * scale, floorY - 11 * scale, 13 * scale);
        g.fillCircle(x, floorY - 6 * scale, 8 * scale);
        g.fillStyle(PALETTE.MOSS_TEAL, 0.4);
        g.fillCircle(x + 8 * scale, floorY - 16 * scale, 5 * scale);
        break;
      }

      case 'lantern': {
        const h = 42 * scale;
        g.lineStyle(1.2, 0x111624, 0.9);
        g.beginPath();
        g.moveTo(x, floorY - h);
        g.lineTo(x, floorY - h + 16 * scale);
        g.strokePath();

        g.fillStyle(0x3a2c1d, 1);
        g.fillRoundedRect(x - 7 * scale, floorY - h + 16 * scale, 14 * scale, 18 * scale, 3);
        g.fillStyle(PALETTE.BRAZIER_FLAME, 0.85);
        g.fillRect(x - 4 * scale, floorY - h + 20 * scale, 8 * scale, 10 * scale);
        break;
      }

      case 'wind_chimes': {
        const h = 54 * scale;
        g.lineStyle(1.4, PALETTE.REMNANT_BRONZE, 0.85);
        g.beginPath();
        g.moveTo(x - 14 * scale, floorY);
        g.lineTo(x + 14 * scale, floorY);
        g.moveTo(x, floorY);
        g.lineTo(x, floorY + 12 * scale);
        g.strokePath();
        for (let i = -2; i <= 2; i++) {
          const cx = x + i * 5 * scale;
          const clen = (h - Math.abs(i) * 6) * 0.7;
          g.lineStyle(1, PALETTE.REMNANT_GOLD, 0.8);
          g.beginPath();
          g.moveTo(cx, floorY + 12 * scale);
          g.lineTo(cx, floorY + 12 * scale + clen);
          g.strokePath();
        }
        break;
      }

      case 'stone_lantern': {
        const h = 48 * scale;
        g.fillStyle(0x283244, 0.95);
        g.fillRect(x - 9 * scale, floorY - 6 * scale, 18 * scale, 6 * scale);
        g.fillRect(x - 4 * scale, floorY - h + 12 * scale, 8 * scale, h - 18 * scale);
        g.fillStyle(0x35435c, 1);
        g.fillRect(x - 11 * scale, floorY - h + 6 * scale, 22 * scale, 14 * scale);
        g.fillStyle(PALETTE.BRAZIER_FLAME, 0.9);
        g.fillRect(x - 6 * scale, floorY - h + 8 * scale, 12 * scale, 10 * scale);
        g.fillStyle(0x1e2634, 1);
        g.beginPath();
        g.moveTo(x - 14 * scale, floorY - h + 6 * scale);
        g.lineTo(x, floorY - h - 4 * scale);
        g.lineTo(x + 14 * scale, floorY - h + 6 * scale);
        g.closePath();
        g.fillPath();
        break;
      }

      case 'statue_fragment': {
        const h = 38 * scale;
        g.fillStyle(0x263348, 0.92);
        g.beginPath();
        g.moveTo(x - 14 * scale, floorY);
        g.lineTo(x - 10 * scale, floorY - h);
        g.lineTo(x + 12 * scale, floorY - h * 0.7);
        g.lineTo(x + 16 * scale, floorY);
        g.closePath();
        g.fillPath();
        g.lineStyle(1.2, PALETTE.MOSS_TEAL, 0.5);
        g.strokePath();
        break;
      }

      case 'wildflowers': {
        for (let i = -2; i <= 2; i++) {
          const fx = x + i * 7 * scale;
          const fh = (16 + Math.abs(i) * 4) * scale;
          g.lineStyle(1.2, 0x3d7a58, 0.85);
          g.beginPath();
          g.moveTo(fx, floorY);
          g.lineTo(fx + i * 2, floorY - fh);
          g.strokePath();
          g.fillStyle(i % 2 === 0 ? PALETTE.ETHEREAL_CYAN : 0xfff6d0, 0.9);
          g.fillCircle(fx + i * 2, floorY - fh, 2.5 * scale);
        }
        break;
      }

      default:
        break;
    }
  }
}
