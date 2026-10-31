import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../constants';

export type PlatformVisualStyle = 'ground' | 'floating' | 'aqueduct' | 'sanctum';

export class ArtGenerator {
  public static generateAll(scene: Phaser.Scene): void {
    this.createRadialParticle(scene, 'tex_mote_cyan', 'rgba(140, 240, 255, 1)', 'rgba(78, 165, 217, 0)');
    this.createRadialParticle(scene, 'tex_mote_gold', 'rgba(255, 224, 153, 1)', 'rgba(230, 172, 76, 0)');
    this.createRadialParticle(scene, 'tex_mote_amber', 'rgba(255, 182, 92, 1)', 'rgba(232, 131, 58, 0)');
    this.createRadialParticle(scene, 'tex_mote_rose', 'rgba(255, 175, 155, 1)', 'rgba(242, 143, 121, 0)');
    this.createRadialParticle(scene, 'tex_mote_dust', 'rgba(186, 198, 226, 0.78)', 'rgba(82, 97, 140, 0)');
    this.createWindStreak(scene, 'tex_wind_streak');
    this.createMistBand(scene, 'tex_mist_band');
    this.createSkyTexture(scene, 'tex_sky_gradient');
    this.createParallaxFar(scene, 'tex_parallax_far');
    this.createParallaxMid(scene, 'tex_parallax_mid');
    this.createParallaxNear(scene, 'tex_parallax_near');
    this.createVignette(scene, 'tex_vignette');
    this.createPixel(scene, 'tex_pixel');
    this.createLightCookie(scene, 'tex_light_cookie');
    this.createCelestialSun(scene, 'tex_celestial_sun');
    this.createCelestialMoon(scene, 'tex_celestial_moon');
    this.createStarsLayer(scene, 'tex_stars_layer');
    this.createSkyDynamic(scene, 'tex_sky_dynamic');
  }

  public static hexToCss(colorHex: number): string {
    return '#' + (colorHex & 0xffffff).toString(16).padStart(6, '0');
  }

  public static updateSkyDynamic(
    scene: Phaser.Scene,
    key: string,
    topHex: number,
    midHex: number,
    bottomHex: number
  ): void {
    const tex = scene.textures.get(key);
    if (!tex) return;
    const canvas = tex.getSourceImage() as HTMLCanvasElement;
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const h = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, this.hexToCss(topHex));
    grad.addColorStop(0.52, this.hexToCss(midHex));
    grad.addColorStop(1, this.hexToCss(bottomHex));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, h);

    if ('refresh' in tex && typeof (tex as unknown as { refresh: () => void }).refresh === 'function') {
      (tex as unknown as { refresh: () => void }).refresh();
    }
  }

  private static createSkyDynamic(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const canvas = scene.textures.createCanvas(key, 4, 512);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#050814');
    grad.addColorStop(0.52, '#0d152c');
    grad.addColorStop(1, '#19223e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 4, 512);
    canvas.refresh();
  }

  private static createLightCookie(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const size = 160;
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 4, half, half, half);
    grad.addColorStop(0, 'rgba(255, 235, 170, 0.95)');
    grad.addColorStop(0.2, 'rgba(255, 185, 90, 0.65)');
    grad.addColorStop(0.5, 'rgba(240, 120, 40, 0.25)');
    grad.addColorStop(0.75, 'rgba(220, 80, 20, 0.08)');
    grad.addColorStop(1, 'rgba(180, 50, 10, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  }

  private static createCelestialSun(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const size = 160;
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const half = size / 2;

    const corona = ctx.createRadialGradient(half, half, 16, half, half, half);
    corona.addColorStop(0, 'rgba(255, 255, 240, 0.95)');
    corona.addColorStop(0.24, 'rgba(255, 230, 150, 0.7)');
    corona.addColorStop(0.52, 'rgba(255, 180, 70, 0.28)');
    corona.addColorStop(0.78, 'rgba(255, 140, 40, 0.08)');
    corona.addColorStop(1, 'rgba(255, 100, 20, 0)');
    ctx.fillStyle = corona;
    ctx.fillRect(0, 0, size, size);

    // Warm solar core
    ctx.fillStyle = '#fffdf5';
    ctx.beginPath();
    ctx.arc(half, half, 20, 0, Math.PI * 2);
    ctx.fill();

    canvas.refresh();
  }

  private static createCelestialMoon(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const size = 160;
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const half = size / 2;

    // Soft silver-blue lunar aura
    const aura = ctx.createRadialGradient(half, half, 14, half, half, half);
    aura.addColorStop(0, 'rgba(220, 240, 255, 0.42)');
    aura.addColorStop(0.42, 'rgba(140, 200, 245, 0.16)');
    aura.addColorStop(1, 'rgba(100, 160, 230, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();

    // Sculpted crescent moon
    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, 34, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(235, 246, 255, 0.9)';
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(half - 12, half - 7, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Celestial golden astrolabe rim
    ctx.strokeStyle = 'rgba(240, 190, 100, 0.38)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(half, half, 58, 20, -0.3, 0.2, 2.6);
    ctx.stroke();

    canvas.refresh();
  }

  private static createStarsLayer(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    const canvas = scene.textures.createCanvas(key, w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    let seed = 4289;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 280; i++) {
      const sx = rand() * w;
      const sy = rand() * (h * 0.72);
      const r = 0.5 + rand() * 1.5;
      const alpha = 0.25 + rand() * 0.7;

      ctx.fillStyle =
        i % 7 === 0
          ? `rgba(255, 215, 140, ${alpha})`
          : i % 4 === 0
            ? `rgba(180, 225, 255, ${alpha})`
            : `rgba(240, 248, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();

      if (i % 22 === 0) {
        ctx.strokeStyle = `rgba(240, 248, 255, ${alpha * 0.65})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy);
        ctx.lineTo(sx + 4, sy);
        ctx.moveTo(sx, sy - 4);
        ctx.lineTo(sx, sy + 4);
        ctx.stroke();
      }
    }

    canvas.refresh();
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
    const size = 28;
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const grad = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(
      0.45,
      innerColor.replace(', 1)', ', 0.46)').replace(', 0.78)', ', 0.36)')
    );
    grad.addColorStop(1, outerColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  }

  private static createWindStreak(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const w = 64;
    const h = 10;
    const canvas = scene.textures.createCanvas(key, w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(140, 238, 255, 0)');
    grad.addColorStop(0.5, 'rgba(190, 248, 255, 0.72)');
    grad.addColorStop(1, 'rgba(140, 238, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2, h / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    canvas.refresh();
  }

  private static createMistBand(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const w = 512;
    const h = 140;
    const canvas = scene.textures.createCanvas(key, w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const grad = ctx.createRadialGradient(w / 2, h / 2, 18, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(168, 204, 232, 0.26)');
    grad.addColorStop(0.55, 'rgba(122, 148, 192, 0.12)');
    grad.addColorStop(1, 'rgba(20, 28, 48, 0)');
    ctx.fillStyle = grad;
    ctx.save();
    ctx.scale(1, h / w);
    ctx.beginPath();
    ctx.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    canvas.refresh();
  }

  /**
   * Full HD 1920x1080 celestial sky inspired by shattered-verge-reference.png:
   * starry diagonal nebula wash, illuminated crescent moon, and warm golden-peach horizon glow.
   */
  private static createSkyTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const canvas = scene.textures.createCanvas(key, GAME_WIDTH, GAME_HEIGHT);
    if (!canvas) return;
    const ctx = canvas.getContext();

    const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    skyGrad.addColorStop(0, '#070b18');
    skyGrad.addColorStop(0.28, '#111936');
    skyGrad.addColorStop(0.56, '#232448');
    skyGrad.addColorStop(0.77, '#464d6e');
    skyGrad.addColorStop(0.9, '#8b6e66');
    skyGrad.addColorStop(1, '#2a334e');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Warm golden-peach horizon cloud break on the right-center horizon
    const horizonGlow = ctx.createRadialGradient(
      GAME_WIDTH * 0.64,
      GAME_HEIGHT * 0.78,
      30,
      GAME_WIDTH * 0.64,
      GAME_HEIGHT * 0.78,
      780
    );
    horizonGlow.addColorStop(0, 'rgba(242, 182, 118, 0.34)');
    horizonGlow.addColorStop(0.38, 'rgba(214, 138, 96, 0.17)');
    horizonGlow.addColorStop(0.72, 'rgba(110, 174, 214, 0.08)');
    horizonGlow.addColorStop(1, 'rgba(14, 18, 36, 0)');
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Diagonal astral nebula band across upper sky
    ctx.save();
    ctx.translate(GAME_WIDTH * 0.46, GAME_HEIGHT * 0.25);
    ctx.rotate(-0.26);
    const nebGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, 740);
    nebGrad.addColorStop(0, 'rgba(136, 178, 246, 0.17)');
    nebGrad.addColorStop(0.42, 'rgba(164, 122, 212, 0.1)');
    nebGrad.addColorStop(0.75, 'rgba(232, 169, 98, 0.05)');
    nebGrad.addColorStop(1, 'rgba(10, 14, 30, 0)');
    ctx.fillStyle = nebGrad;
    ctx.scale(1.6, 0.42);
    ctx.beginPath();
    ctx.arc(0, 0, 720, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Deterministic crisp starfield
    let seed = 1337;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 230; i++) {
      const sx = rand() * GAME_WIDTH;
      const sy = rand() * (GAME_HEIGHT * 0.66);
      const r = 0.55 + rand() * 1.55;
      const alpha = 0.22 + rand() * 0.65;
      ctx.fillStyle =
        i % 8 === 0
          ? `rgba(248, 205, 132, ${alpha})`
          : i % 5 === 0
            ? `rgba(182, 224, 255, ${alpha})`
            : `rgba(235, 244, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();

      // Subtle cross-glint on bright stars
      if (i % 19 === 0) {
        ctx.strokeStyle = `rgba(235, 246, 255, ${alpha * 0.6})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(sx - 5, sy);
        ctx.lineTo(sx + 5, sy);
        ctx.moveTo(sx, sy - 5);
        ctx.lineTo(sx, sy + 5);
        ctx.stroke();
      }
    }

    // Illuminated crescent moon + fractured astrolabe halo in upper sky
    const mx = GAME_WIDTH * 0.78;
    const my = GAME_HEIGHT * 0.2;
    const moonGlow = ctx.createRadialGradient(mx, my, 10, mx, my, 185);
    moonGlow.addColorStop(0, 'rgba(225, 244, 255, 0.3)');
    moonGlow.addColorStop(0.45, 'rgba(138, 214, 248, 0.09)');
    moonGlow.addColorStop(1, 'rgba(126, 232, 250, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(mx, my, 185, 0, Math.PI * 2);
    ctx.fill();

    // Sculpted crescent moon body using off-center shadow cut
    ctx.save();
    ctx.beginPath();
    ctx.arc(mx, my, 46, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(232, 244, 255, 0.86)';
    ctx.fillRect(mx - 50, my - 50, 100, 100);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(mx - 15, my - 10, 43, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Faint dark-side lunar limb & broken golden celestial ring
    ctx.strokeStyle = 'rgba(205, 232, 255, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(mx, my, 46, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(238, 184, 98, 0.3)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(mx, my, 98, 30, -0.3, 0.15, 2.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(mx, my, 98, 30, -0.3, 3.35, 5.75);
    ctx.stroke();

    canvas.refresh();
  }

  /**
   * Distant mountain horizon (1920x680 seamless) with colossal Broken Stone Ring-Monolith,
   * sunlit ridge highlights, and high floating runic islands.
   */
  private static createParallaxFar(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const w = 1920;
    const h = 680;
    const canvas = scene.textures.createCanvas(key, w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // Colossal distant Broken Ring-Monolith rising behind the mountain saddle (around x=1160)
    const rx = 1160;
    const ry = 315;
    ctx.save();
    ctx.strokeStyle = '#252c4a';
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.arc(rx, ry, 165, Math.PI * 0.72, Math.PI * 1.92);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rx, ry, 165, Math.PI * 0.04, Math.PI * 0.32);
    ctx.stroke();

    // Warm horizon rim-light & faint rune spots along the giant ring
    ctx.strokeStyle = 'rgba(228, 174, 114, 0.24)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(rx, ry, 181, Math.PI * 1.05, Math.PI * 1.88);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(138, 228, 250, 0.24)';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([12, 18]);
    ctx.beginPath();
    ctx.arc(rx, ry, 165, Math.PI * 0.8, Math.PI * 1.86);
    ctx.stroke();
    ctx.restore();

    // Seamlessly tileable jagged mountain range (y=460 at x=0 and x=1920)
    const mGrad = ctx.createLinearGradient(0, 170, 0, h);
    mGrad.addColorStop(0, '#1e2542');
    mGrad.addColorStop(0.55, '#171f39');
    mGrad.addColorStop(1, '#11172c');
    ctx.fillStyle = mGrad;

    const peaks: Array<[number, number]> = [
      [0, 460],
      [145, 350],
      [255, 395],
      [410, 215],
      [485, 245],
      [620, 385],
      [790, 280],
      [955, 415],
      [1140, 355],
      [1290, 390],
      [1445, 195],
      [1530, 250],
      [1685, 370],
      [1810, 295],
      [w, 460],
    ];

    ctx.beginPath();
    ctx.moveTo(0, h);
    for (const [px, py] of peaks) {
      ctx.lineTo(px, py);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Golden-peach atmospheric rim-light on sun-facing slopes
    ctx.strokeStyle = 'rgba(232, 176, 116, 0.2)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(255, 395);
    ctx.lineTo(410, 215);
    ctx.moveTo(620, 385);
    ctx.lineTo(790, 280);
    ctx.moveTo(1290, 390);
    ctx.lineTo(1445, 195);
    ctx.stroke();

    // Floating runic sky-islands & suspended monolith shards
    const islands = [
      { x: 430, y: 132, w: 68, h: 36, waterfall: true },
      { x: 492, y: 156, w: 28, h: 18, waterfall: false },
      { x: 1035, y: 162, w: 46, h: 26, waterfall: false },
      { x: 1315, y: 175, w: 38, h: 24, waterfall: false },
      { x: 1475, y: 118, w: 82, h: 42, waterfall: true },
    ];
    for (const isl of islands) {
      ctx.fillStyle = '#222b4c';
      ctx.beginPath();
      ctx.moveTo(isl.x - isl.w / 2, isl.y);
      ctx.lineTo(isl.x + isl.w / 2, isl.y);
      ctx.lineTo(isl.x + isl.w * 0.22, isl.y + isl.h);
      ctx.lineTo(isl.x - isl.w * 0.12, isl.y + isl.h * 1.25);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(232, 182, 122, 0.26)';
      ctx.fillRect(isl.x - isl.w / 2, isl.y - 2, isl.w, 3);

      if (isl.waterfall) {
        const wfGrad = ctx.createLinearGradient(0, isl.y + 4, 0, isl.y + 115);
        wfGrad.addColorStop(0, 'rgba(182, 240, 255, 0.42)');
        wfGrad.addColorStop(1, 'rgba(182, 240, 255, 0)');
        ctx.fillStyle = wfGrad;
        ctx.fillRect(isl.x + 4, isl.y + 4, 5, 110);
      }
    }

    canvas.refresh();
  }

  /**
   * Mid-distance ruined multi-tier aqueducts, cascading waterfalls, and cloud-sea mist (1920x680 seamless).
   */
  private static createParallaxMid(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const w = 1920;
    const h = 680;
    const canvas = scene.textures.createCanvas(key, w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // Seamlessly tileable mid ridge (y=500 at x=0 and x=1920)
    ctx.fillStyle = '#18213b';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, 500);
    ctx.lineTo(340, 468);
    ctx.lineTo(680, 494);
    ctx.lineTo(1060, 456);
    ctx.lineTo(1480, 488);
    ctx.lineTo(w, 500);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Tiered aqueduct bridge spans with carved arches & cascading waterfalls
    const spans = [
      { startX: 150, count: 3, spacing: 118, topY: 310, waterfallIdx: 1 },
      { startX: 880, count: 4, spacing: 118, topY: 280, waterfallIdx: 2 },
      { startX: 1540, count: 2, spacing: 118, topY: 325, waterfallIdx: 0 },
    ];

    for (const sp of spans) {
      const totalW = (sp.count - 1) * sp.spacing + 56;
      ctx.fillStyle = '#1f2948';
      // Upper aqueduct deck & cornice
      ctx.fillRect(sp.startX - 28, sp.topY, totalW, 24);
      ctx.fillStyle = 'rgba(225, 180, 122, 0.16)';
      ctx.fillRect(sp.startX - 28, sp.topY, totalW, 3);

      for (let i = 0; i < sp.count; i++) {
        const px = sp.startX + i * sp.spacing;
        ctx.fillStyle = '#1f2948';
        ctx.fillRect(px - 20, sp.topY + 20, 40, 215);
        // Glowing vertical rune lancet
        ctx.fillStyle = 'rgba(138, 232, 250, 0.18)';
        ctx.fillRect(px - 2, sp.topY + 46, 4, 62);

        // Cascading waterfall pouring between pillars into mist
        if (i === sp.waterfallIdx) {
          const wx = px + sp.spacing * 0.5;
          const wf = ctx.createLinearGradient(0, sp.topY + 22, 0, 535);
          wf.addColorStop(0, 'rgba(195, 245, 255, 0.45)');
          wf.addColorStop(0.65, 'rgba(148, 224, 248, 0.25)');
          wf.addColorStop(1, 'rgba(148, 224, 248, 0)');
          ctx.fillStyle = wf;
          ctx.fillRect(wx - 11, sp.topY + 22, 22, 515 - sp.topY);

          // Bright foam core
          ctx.fillStyle = 'rgba(232, 252, 255, 0.35)';
          ctx.fillRect(wx - 3, sp.topY + 22, 6, 470 - sp.topY);
        }
      }
    }

    // Soft valley cloud-sea mist bank along the lower aqueduct bases
    const mistGrad = ctx.createLinearGradient(0, 420, 0, 580);
    mistGrad.addColorStop(0, 'rgba(128, 162, 204, 0)');
    mistGrad.addColorStop(0.5, 'rgba(128, 162, 204, 0.18)');
    mistGrad.addColorStop(1, 'rgba(20, 28, 52, 0)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, 420, w, 160);

    canvas.refresh();
  }

  /**
   * Near parallax layer (1920x700 seamless) inspired by foreground-depth-reference.png:
   * classical domed rotunda temple silhouette, gothic broken arches, and warm glowing braziers.
   */
  private static createParallaxNear(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const w = 1920;
    const h = 700;
    const canvas = scene.textures.createCanvas(key, w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // Seamlessly tileable near hills (y=565 at x=0 and x=1920)
    ctx.fillStyle = '#11172a';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, 565);
    ctx.quadraticCurveTo(480, 520, 960, 560);
    ctx.quadraticCurveTo(1440, 595, w, 565);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Classical Domed Rotunda Silhouette (around x=690)
    const dx = 690;
    const baseY = 552;
    ctx.fillStyle = '#151d34';
    ctx.fillRect(dx - 92, baseY - 135, 184, 145);
    ctx.fillRect(dx - 104, baseY - 145, 208, 14);
    ctx.beginPath();
    ctx.arc(dx, baseY - 145, 78, Math.PI, 0);
    ctx.fill();
    // Cupola lantern atop dome
    ctx.fillRect(dx - 16, baseY - 244, 32, 24);
    ctx.beginPath();
    ctx.moveTo(dx - 20, baseY - 244);
    ctx.lineTo(dx, baseY - 266);
    ctx.lineTo(dx + 20, baseY - 244);
    ctx.closePath();
    ctx.fill();

    // Warm candle/brazier glow slits inside the rotunda colonnade windows
    for (let wi = -2; wi <= 2; wi++) {
      const wx = dx + wi * 32;
      ctx.fillStyle = 'rgba(244, 178, 92, 0.24)';
      ctx.fillRect(wx - 6, baseY - 105, 12, 58);
    }

    // Slanted ancient obelisks & broken gothic archways with warm brazier halos
    const obelisks = [
      { x: 260, y: 558, h: 165, tilt: -9 },
      { x: 1245, y: 565, h: 185, tilt: 7 },
      { x: 1640, y: 562, h: 145, tilt: -6 },
    ];
    for (const ob of obelisks) {
      ctx.fillStyle = '#151d34';
      ctx.beginPath();
      ctx.moveTo(ob.x - 20, ob.y);
      ctx.lineTo(ob.x - 11 + ob.tilt, ob.y - ob.h);
      ctx.lineTo(ob.x + ob.tilt, ob.y - ob.h - 24);
      ctx.lineTo(ob.x + 11 + ob.tilt, ob.y - ob.h);
      ctx.lineTo(ob.x + 20, ob.y);
      ctx.closePath();
      ctx.fill();

      // Distant warm brazier glow beside obelisk base
      const bGlow = ctx.createRadialGradient(ob.x + 36, ob.y - 26, 2, ob.x + 36, ob.y - 26, 48);
      bGlow.addColorStop(0, 'rgba(255, 184, 88, 0.36)');
      bGlow.addColorStop(1, 'rgba(255, 140, 56, 0)');
      ctx.fillStyle = bGlow;
      ctx.beginPath();
      ctx.arc(ob.x + 36, ob.y - 26, 48, 0, Math.PI * 2);
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
      GAME_HEIGHT * 0.38,
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH * 0.64
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.74, 'rgba(6, 8, 18, 0.18)');
    grad.addColorStop(1, 'rgba(4, 6, 14, 0.62)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    canvas.refresh();
  }

  /**
   * Draws a 2.5D bevelled ancient flagstone platform with chiseled masonry blocks,
   * weathered moss, underside corbels/roots, and subtle runic inlays.
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
      // Sculpted craggy floating island underside + hanging root tendrils
      g.fillStyle(PALETTE.STONE_DARK, 0.97);
      g.beginPath();
      g.moveTo(left + 6, top + h);
      g.lineTo(left + w * 0.24, top + h + Math.min(48, w * 0.19));
      g.lineTo(left + w * 0.5, top + h + Math.min(72, w * 0.27));
      g.lineTo(left + w * 0.78, top + h + Math.min(42, w * 0.17));
      g.lineTo(left + w - 6, top + h);
      g.closePath();
      g.fillPath();

      // Subtle hanging moss vines beneath floating rock
      g.lineStyle(1.4, PALETTE.MOSS_TEAL, 0.55);
      for (let vx = left + 22; vx < left + w - 20; vx += 58) {
        const vLen = 14 + ((Math.abs(Math.round(vx * 13)) % 5) * 6);
        g.beginPath();
        g.moveTo(vx, top + h + 4);
        g.lineTo(vx - 3, top + h + 4 + vLen);
        g.strokePath();
      }
    } else if (style === 'aqueduct' && w >= 160) {
      // Recessed stone corbel arches along aqueduct underside
      g.fillStyle(PALETTE.STONE_DARK, 0.78);
      for (let ax = left + 36; ax < left + w - 44; ax += 96) {
        g.fillRoundedRect(ax, top + h - 2, 42, 14, { tl: 0, tr: 0, bl: 14, br: 14 });
      }
    }

    // 2.5D top perspective bevel plane (receding top surface just above collision edge)
    const bevelH = 5;
    const bevelColor =
      style === 'sanctum'
        ? 0x453e63
        : style === 'aqueduct'
          ? 0x3b486e
          : 0x364366;
    g.fillStyle(bevelColor, 0.92);
    g.beginPath();
    g.moveTo(left + 6, top - bevelH);
    g.lineTo(left + w - 6, top - bevelH);
    g.lineTo(left + w, top);
    g.lineTo(left, top);
    g.closePath();
    g.fillPath();

    // Main front stone face
    const bodyColor =
      style === 'sanctum'
        ? 0x1e2238
        : style === 'aqueduct'
          ? 0x252e4a
          : PALETTE.STONE_BASE;
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(left, top, w, h, 4);

    // Deep lower shadow band for 3D mass
    g.fillStyle(PALETTE.STONE_DARK, 0.88);
    g.fillRect(left + 2, top + Math.max(10, h - 12), w - 4, Math.min(12, h));

    // Chiseled top flagstone cornice cap
    const capH = Math.min(11, Math.max(7, h * 0.36));
    const capColor = style === 'sanctum' ? 0x3c3659 : PALETTE.STONE_LIGHT;
    g.fillStyle(capColor, 1);
    g.fillRoundedRect(left, top, w, capH, { tl: 4, tr: 4, bl: 0, br: 0 });

    // Weathered teal-moss patches along top flagstones (except sanctum)
    if (style !== 'sanctum') {
      g.fillStyle(PALETTE.MOSS_TEAL, 0.45);
      for (let mx = left + 18; mx < left + w - 34; mx += 110) {
        g.fillRoundedRect(mx, top, 28, 4, 2);
      }
    }

    // Crisp sunlit rim highlight
    const rimColor = style === 'sanctum' ? PALETTE.REMNANT_GOLD : PALETTE.STONE_HIGHLIGHT;
    g.lineStyle(1.4, rimColor, style === 'sanctum' ? 0.55 : 0.72);
    g.beginPath();
    g.moveTo(left + 4, top + 1);
    g.lineTo(left + w - 4, top + 1);
    g.strokePath();

    // Masonry block joints & staggered lower ashlar courses
    g.lineStyle(1.1, PALETTE.STONE_DARK, 0.72);
    const step = 56;
    for (let sx = left + step; sx < left + w - 14; sx += step) {
      g.beginPath();
      g.moveTo(sx, top + 1);
      g.lineTo(sx, top + Math.min(h - 2, 24));
      g.strokePath();
    }
    if (h >= 34) {
      g.beginPath();
      g.moveTo(left + 6, top + 22);
      g.lineTo(left + w - 6, top + 22);
      g.strokePath();
      for (let sx = left + step * 0.5; sx < left + w - 14; sx += step) {
        g.beginPath();
        g.moveTo(sx, top + 22);
        g.lineTo(sx, top + Math.min(h - 3, 44));
        g.strokePath();
      }
    }

    // Subtle carved rune accents
    const runeColor = style === 'sanctum' ? PALETTE.REMNANT_GOLD : PALETTE.ETHEREAL_CYAN;
    g.fillStyle(runeColor, 0.38);
    for (let rx = left + 28; rx < left + w - 24; rx += 112) {
      g.fillCircle(rx, top + Math.min(16, h * 0.5), 2.1);
    }
  }
}
