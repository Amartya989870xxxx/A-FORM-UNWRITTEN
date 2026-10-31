import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../constants';

export type PlatformVisualStyle = 'ground' | 'floating' | 'aqueduct' | 'sanctum';

export class ArtGenerator {
  public static generateAll(scene: Phaser.Scene): void {
    this.createRadialParticle(scene, 'tex_mote_cyan', 'rgba(140, 240, 255, 1)', 'rgba(78, 165, 217, 0)');
    this.createRadialParticle(scene, 'tex_mote_gold', 'rgba(255, 220, 145, 1)', 'rgba(232, 169, 72, 0)');
    this.createRadialParticle(scene, 'tex_mote_rose', 'rgba(255, 175, 155, 1)', 'rgba(242, 143, 121, 0)');
    this.createRadialParticle(scene, 'tex_mote_dust', 'rgba(180, 194, 224, 0.75)', 'rgba(82, 97, 140, 0)');
    this.createWindStreak(scene, 'tex_wind_streak');
    this.createSkyTexture(scene, 'tex_sky_gradient');
    this.createParallaxFar(scene, 'tex_parallax_far');
    this.createParallaxMid(scene, 'tex_parallax_mid');
    this.createParallaxNear(scene, 'tex_parallax_near');
    this.createVignette(scene, 'tex_vignette');
    this.createPixel(scene, 'tex_pixel');
  }

  private static createPixel(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const canvas = scene.textures.createCanvas(key, 4, 4);
    if (!canvas) return;
    const ctx = canvas.getContext();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 4, 4);
    canvas.refresh();
  }

  private static createRadialParticle(
    scene: Phaser.Scene,
    key: string,
    innerColor: string,
    outerColor: string
  ): void {
    if (scene.textures.exists(key)) return;
    const size = 24;
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const grad = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.45, innerColor.replace(', 1)', ', 0.45)').replace(', 0.75)', ', 0.35)'));
    grad.addColorStop(1, outerColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  }

  private static createWindStreak(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const w = 48;
    const h = 8;
    const canvas = scene.textures.createCanvas(key, w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(140, 238, 255, 0)');
    grad.addColorStop(0.5, 'rgba(175, 245, 255, 0.7)');
    grad.addColorStop(1, 'rgba(140, 238, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2, h / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    canvas.refresh();
  }

  private static createSkyTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const canvas = scene.textures.createCanvas(key, GAME_WIDTH, GAME_HEIGHT);
    if (!canvas) return;
    const ctx = canvas.getContext();

    const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    skyGrad.addColorStop(0, '#090c1a');
    skyGrad.addColorStop(0.38, '#141a34');
    skyGrad.addColorStop(0.72, '#282546');
    skyGrad.addColorStop(0.92, '#3b4a62');
    skyGrad.addColorStop(1, '#1e273c');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Subtle horizon glow
    const horizonGlow = ctx.createRadialGradient(
      GAME_WIDTH * 0.68,
      GAME_HEIGHT * 0.72,
      20,
      GAME_WIDTH * 0.68,
      GAME_HEIGHT * 0.72,
      460
    );
    horizonGlow.addColorStop(0, 'rgba(232, 169, 72, 0.16)');
    horizonGlow.addColorStop(0.45, 'rgba(110, 195, 224, 0.09)');
    horizonGlow.addColorStop(1, 'rgba(14, 18, 36, 0)');
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Deterministic starlight
    let seed = 1337;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 110; i++) {
      const sx = rand() * GAME_WIDTH;
      const sy = rand() * (GAME_HEIGHT * 0.62);
      const r = 0.6 + rand() * 1.4;
      const alpha = 0.2 + rand() * 0.55;
      ctx.fillStyle = i % 7 === 0 ? `rgba(243, 190, 107, ${alpha})` : `rgba(210, 236, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fractured astral moon / ring in upper-right sky
    const mx = GAME_WIDTH * 0.76;
    const my = GAME_HEIGHT * 0.22;
    const moonGlow = ctx.createRadialGradient(mx, my, 8, mx, my, 120);
    moonGlow.addColorStop(0, 'rgba(190, 240, 255, 0.24)');
    moonGlow.addColorStop(0.5, 'rgba(126, 232, 250, 0.07)');
    moonGlow.addColorStop(1, 'rgba(126, 232, 250, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(mx, my, 120, 0, Math.PI * 2);
    ctx.fill();

    // Crescent arc
    ctx.strokeStyle = 'rgba(215, 245, 255, 0.42)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(mx, my, 38, -0.75, 2.15);
    ctx.stroke();

    // Broken outer celestial ring
    ctx.strokeStyle = 'rgba(232, 169, 72, 0.26)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(mx, my, 68, 22, -0.32, 0.2, 2.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(mx, my, 68, 22, -0.32, 3.3, 5.7);
    ctx.stroke();

    canvas.refresh();
  }

  private static createParallaxFar(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const w = 1280;
    const h = 520;
    const canvas = scene.textures.createCanvas(key, w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // Seamlessly tileable jagged monolith mountains (y=360 at x=0 and x=1280)
    ctx.fillStyle = '#141a31';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, 360);
    ctx.lineTo(110, 275);
    ctx.lineTo(195, 315);
    ctx.lineTo(310, 170);
    ctx.lineTo(360, 185);
    ctx.lineTo(445, 295);
    ctx.lineTo(570, 225);
    ctx.lineTo(690, 330);
    ctx.lineTo(830, 145);
    ctx.lineTo(885, 190);
    ctx.lineTo(975, 285);
    ctx.lineTo(1115, 215);
    ctx.lineTo(1210, 310);
    ctx.lineTo(w, 360);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Distant floating stone shards above peaks
    ctx.fillStyle = '#1b2340';
    const shards = [
      { x: 325, y: 112, rw: 14, rh: 28 },
      { x: 352, y: 132, rw: 8, rh: 16 },
      { x: 842, y: 92, rw: 18, rh: 34 },
      { x: 872, y: 115, rw: 10, rh: 19 },
      { x: 1120, y: 158, rw: 12, rh: 22 },
    ];
    for (const s of shards) {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - s.rh);
      ctx.lineTo(s.x + s.rw, s.y);
      ctx.lineTo(s.x, s.y + s.rh);
      ctx.lineTo(s.x - s.rw, s.y);
      ctx.closePath();
      ctx.fill();
    }

    canvas.refresh();
  }

  private static createParallaxMid(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const w = 1280;
    const h = 540;
    const canvas = scene.textures.createCanvas(key, w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // Ruined aqueduct silhouettes and broken arches (seamless at y=420)
    ctx.fillStyle = '#1a223b';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, 420);
    ctx.lineTo(240, 395);
    ctx.lineTo(480, 415);
    ctx.lineTo(760, 385);
    ctx.lineTo(1040, 410);
    ctx.lineTo(w, 420);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Ancient broken pillars & arches
    ctx.fillStyle = '#1e2744';
    const arches = [140, 290, 620, 770, 1060];
    for (const ax of arches) {
      const topY = ax === 620 ? 235 : 265;
      ctx.fillRect(ax - 18, topY, 36, 175);
      ctx.fillRect(ax - 26, topY - 10, 52, 12);
      // Faint glowing rune slit inside pillar
      ctx.fillStyle = 'rgba(126, 232, 250, 0.16)';
      ctx.fillRect(ax - 2, topY + 24, 4, 48);
      ctx.fillStyle = '#1e2744';
    }

    // Broken lintel connecting arches 140->290 and 620->770
    ctx.fillRect(120, 255, 195, 18);
    ctx.fillRect(595, 225, 145, 20);

    canvas.refresh();
  }

  private static createParallaxNear(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const w = 1280;
    const h = 560;
    const canvas = scene.textures.createCanvas(key, w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // Near misty hills & weathered obelisks (seamless at y=470)
    ctx.fillStyle = '#12182b';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, 470);
    ctx.quadraticCurveTo(320, 430, 640, 465);
    ctx.quadraticCurveTo(960, 495, w, 470);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Slanted ancient obelisks
    const obelisks = [
      { x: 210, y: 465, h: 135, tilt: -8 },
      { x: 525, y: 458, h: 105, tilt: 6 },
      { x: 920, y: 472, h: 155, tilt: -5 },
    ];
    ctx.fillStyle = '#161e34';
    for (const ob of obelisks) {
      ctx.beginPath();
      ctx.moveTo(ob.x - 16, ob.y);
      ctx.lineTo(ob.x - 9 + ob.tilt, ob.y - ob.h);
      ctx.lineTo(ob.x + ob.tilt, ob.y - ob.h - 18);
      ctx.lineTo(ob.x + 9 + ob.tilt, ob.y - ob.h);
      ctx.lineTo(ob.x + 16, ob.y);
      ctx.closePath();
      ctx.fill();
    }

    canvas.refresh();
  }

  private static createVignette(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const canvas = scene.textures.createCanvas(key, GAME_WIDTH, GAME_HEIGHT);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const grad = ctx.createRadialGradient(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_HEIGHT * 0.34,
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH * 0.62
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.72, 'rgba(6, 8, 18, 0.22)');
    grad.addColorStop(1, 'rgba(4, 6, 14, 0.66)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    canvas.refresh();
  }

  /**
   * Draws an atmospheric carved ancient stone platform onto a Phaser Graphics object.
   */
  public static drawCarvedPlatform(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    style: PlatformVisualStyle = 'ground'
  ): void {
    const left = x - w / 2;
    const top = y - h / 2;

    if (style === 'floating') {
      // Tapered rocky crag root beneath floating platform
      g.fillStyle(PALETTE.STONE_DARK, 0.96);
      g.beginPath();
      g.moveTo(left + 8, top + h);
      g.lineTo(left + w * 0.28, top + h + Math.min(44, w * 0.18));
      g.lineTo(left + w * 0.52, top + h + Math.min(62, w * 0.24));
      g.lineTo(left + w * 0.76, top + h + Math.min(38, w * 0.15));
      g.lineTo(left + w - 8, top + h);
      g.closePath();
      g.fillPath();
    }

    // Main stone body
    const bodyColor =
      style === 'sanctum'
        ? 0x1d2238
        : style === 'aqueduct'
          ? 0x242c47
          : PALETTE.STONE_BASE;
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(left, top, w, h, 4);

    // Lower shadow band
    g.fillStyle(PALETTE.STONE_DARK, 0.85);
    g.fillRect(left + 2, top + Math.max(10, h - 10), w - 4, Math.min(10, h));

    // Top weathered stone cap / moss & runic trim
    const capColor = style === 'sanctum' ? 0x3b3556 : PALETTE.STONE_LIGHT;
    g.fillStyle(capColor, 1);
    g.fillRoundedRect(left, top, w, Math.min(10, h * 0.4), { tl: 4, tr: 4, bl: 0, br: 0 });

    // Top edge highlight
    g.lineStyle(1.5, PALETTE.STONE_HIGHLIGHT, 0.65);
    g.beginPath();
    g.moveTo(left + 4, top + 1);
    g.lineTo(left + w - 4, top + 1);
    g.strokePath();

    // Subtle masonry joints & runic accent dots
    g.lineStyle(1, PALETTE.STONE_DARK, 0.65);
    const step = 64;
    for (let sx = left + step; sx < left + w - 16; sx += step) {
      g.beginPath();
      g.moveTo(sx, top + 2);
      g.lineTo(sx, top + Math.min(h - 2, 26));
      g.strokePath();
    }

    const runeColor = style === 'sanctum' ? PALETTE.REMNANT_GOLD : PALETTE.ETHEREAL_CYAN;
    g.fillStyle(runeColor, 0.35);
    for (let rx = left + 32; rx < left + w - 24; rx += 96) {
      g.fillCircle(rx, top + Math.min(16, h * 0.5), 2);
    }
  }
}

