import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  PALETTE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type AdventurerRank,
} from '../constants';
import { WORLD_PLATFORMS } from '../data/world';
import { AudioManager } from '../systems/AudioManager';
import {
  KNOWN_WORLD_CONTINENTS,
  MAP_GRID_COLS,
  MAP_GRID_ROWS,
  SHATTERED_VERGE_LOCATIONS,
  type ExplorationManager,
  type MapLocationDef,
} from '../systems/ExplorationManager';

export type AtlasViewMode = 'regional' | 'world';

export class WorldMap {
  private readonly scene: Phaser.Scene;
  private readonly exploration: ExplorationManager;
  private readonly getPlayerInfo: () => {
    x: number;
    y: number;
    name: string;
    rank: AdventurerRank;
    hasCompassRelic: boolean;
  };

  private readonly container: Phaser.GameObjects.Container;
  private openState = false;
  private viewMode: AtlasViewMode = 'regional';
  private selectedLocation: MapLocationDef | null = null;
  private pulseGraphics?: Phaser.GameObjects.Graphics;
  private shroudGraphics?: Phaser.GameObjects.Graphics;
  private playerPinCoords: { x: number; y: number } | null = null;

  constructor(
    scene: Phaser.Scene,
    exploration: ExplorationManager,
    getPlayerInfo: () => {
      x: number;
      y: number;
      name: string;
      rank: AdventurerRank;
      hasCompassRelic: boolean;
    }
  ) {
    this.scene = scene;
    this.exploration = exploration;
    this.getPlayerInfo = getPlayerInfo;

    this.container = scene.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setScrollFactor(0)
      .setDepth(148)
      .setVisible(false);
  }

  public getRootObjects(): Phaser.GameObjects.GameObject[] {
    return [this.container];
  }

  public isOpen(): boolean {
    return this.openState;
  }

  public toggle(initialMode?: AtlasViewMode): void {
    if (this.openState) {
      this.close();
    } else {
      this.open(initialMode);
    }
  }

  public open(mode?: AtlasViewMode): void {
    if (mode) {
      this.viewMode = mode;
    }
    this.openState = true;
    AudioManager.getInstance().playInteract();
    const discovered = this.exploration.getDiscoveredLocationDefs();
    if (!this.selectedLocation && discovered.length > 0) {
      this.selectedLocation = discovered[discovered.length - 1];
    }
    this.rebuild();
    this.container.setVisible(true);
  }

  public close(): void {
    if (!this.openState) return;
    this.openState = false;
    AudioManager.getInstance().playDialogueBlip();
    this.container.setVisible(false);
  }

  public switchViewMode(nextMode?: AtlasViewMode): void {
    this.viewMode = nextMode ?? (this.viewMode === 'regional' ? 'world' : 'regional');
    AudioManager.getInstance().playDialogueBlip();
    if (this.openState) {
      this.rebuild();
    }
  }

  public update(time: number): void {
    if (!this.openState) return;
    const t = time * 0.001;

    if (this.pulseGraphics && this.playerPinCoords) {
      this.pulseGraphics.clear();
      const r = 10 + ((t * 16) % 16);
      const alpha = Math.max(0, 1 - (r - 10) / 16) * 0.75;
      this.pulseGraphics.lineStyle(1.8, PALETTE.GARMENT_GOLD_BRIGHT, alpha);
      this.pulseGraphics.strokeCircle(this.playerPinCoords.x, this.playerPinCoords.y, r);
    }

    if (this.shroudGraphics && this.viewMode === 'world') {
      this.shroudGraphics.clear();
      // Swirling eternal black-violet tempest mist concealing the secret fifth continent on the eastern sea
      const cx = 205;
      const cy = 22;

      // Outer violet tempest aura so the veiled eastern horizon reads clearly against the dark sea
      this.shroudGraphics.fillStyle(0x2d1b4e, 0.42);
      this.shroudGraphics.fillEllipse(cx - 8, cy, 196, 286);

      for (let i = 0; i < 11; i++) {
        const angle = t * (0.3 + (i % 3) * 0.08) + i * 0.65;
        const ox = cx + Math.cos(angle) * (20 + (i % 4) * 14);
        const oy = cy + Math.sin(angle * 0.9) * (34 + (i % 3) * 26);
        this.shroudGraphics.fillStyle(i % 2 === 0 ? 0x04030a : 0x1b1130, 0.94);
        this.shroudGraphics.fillEllipse(ox, oy, 126 - (i % 3) * 14, 88 + (i % 2) * 22);
      }

      this.shroudGraphics.lineStyle(1.4, 0x6b4aa0, 0.38 + Math.sin(t * 2.2) * 0.12);
      this.shroudGraphics.strokeEllipse(cx - 4, cy, 178, 248);
      this.shroudGraphics.lineStyle(1, 0x9b7ad6, 0.22 + Math.cos(t * 1.7) * 0.08);
      this.shroudGraphics.beginPath();
      this.shroudGraphics.arc(cx - 6, cy, 98, 2.2 + Math.sin(t) * 0.2, 4.1 + Math.sin(t) * 0.2);
      this.shroudGraphics.strokePath();
    }
  }

  private rebuild(): void {
    this.container.removeAll(true);
    this.pulseGraphics = undefined;
    this.shroudGraphics = undefined;
    this.playerPinCoords = null;

    const info = this.getPlayerInfo();
    const regionPct = this.exploration.getRegionExplorationPercent();
    const worldPct = this.exploration.getWorldExplorationPercent();

    const backdrop = this.scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x04060e, 0.86)
      .setInteractive();
    backdrop.on('pointerdown', () => this.close());

    const w = 1480;
    const h = 870;
    const frame = this.scene.add.graphics();

    // Outer dark cartographer's slate-parchment board
    frame.fillStyle(0x0d1222, 0.98);
    frame.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    frame.lineStyle(2.2, PALETTE.REMNANT_GOLD, 0.88);
    frame.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    frame.lineStyle(1, PALETTE.STONE_HIGHLIGHT, 0.42);
    frame.strokeRoundedRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 10);

    // Header divider
    frame.lineStyle(1, PALETTE.REMNANT_BRONZE, 0.55);
    frame.beginPath();
    frame.moveTo(-w / 2 + 28, -h / 2 + 94);
    frame.lineTo(w / 2 - 28, -h / 2 + 94);
    frame.strokePath();

    const title = this.scene.add
      .text(-w / 2 + 38, -h / 2 + 26, 'CARTOGRAPHIC ATLAS OF THE REALMS', {
        fontFamily: 'Georgia, serif',
        fontSize: '23px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_GOLD,
        letterSpacing: 2.5,
      })
      .setOrigin(0, 0);

    const subHeader = this.scene.add
      .text(
        -w / 2 + 38,
        -h / 2 + 58,
        `Wayfarer: ${info.name}   •   Guild Rank ${info.rank}   •   Shattered Verge: ${regionPct.toFixed(1)}%   •   Known World: ${worldPct.toFixed(2)}%`,
        {
          fontFamily: 'Georgia, serif',
          fontSize: '14.5px',
          color: PALETTE.TEXT_LIGHT,
        }
      )
      .setOrigin(0, 0);

    this.container.add([backdrop, frame, title, subHeader]);

    // View mode toggle tabs in top-right header
    this.buildModeButton(w / 2 - 475, -h / 2 + 48, 215, 'Regional Survey [1]', 'regional');
    this.buildModeButton(w / 2 - 245, -h / 2 + 48, 215, 'World Continents [2]', 'world');

    // Map canvas bounds (left) & Sidebar bounds (right)
    const mapLeft = -w / 2 + 36;
    const mapTop = -h / 2 + 114;
    const mapW = 1010;
    const mapH = 684;

    const sideLeft = mapLeft + mapW + 24;
    const sideW = w - 36 - (mapW + 24) - 36;

    if (this.viewMode === 'regional') {
      this.renderRegionalSurvey(mapLeft, mapTop, mapW, mapH, sideLeft, mapTop, sideW, mapH, info);
    } else {
      this.renderWorldContinents(mapLeft, mapTop, mapW, mapH, sideLeft, mapTop, sideW, mapH, regionPct, worldPct);
    }

    const footer = this.scene.add
      .text(
        0,
        h / 2 - 26,
        '[TAB or ESC] Close Atlas     [V or 1/2] Switch Regional / World View     Click Discovered Landmarks to Inspect',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '13.5px',
          color: PALETTE.TEXT_MUTED,
        }
      )
      .setOrigin(0.5);
    this.container.add(footer);
  }

  private buildModeButton(
    cx: number,
    cy: number,
    btnW: number,
    label: string,
    mode: AtlasViewMode
  ): void {
    const active = this.viewMode === mode;
    const btnH = 38;
    const bg = this.scene.add.graphics();
    bg.fillStyle(active ? 0x26233b : 0x13192e, 0.96);
    bg.fillRoundedRect(cx - btnW / 2, cy - btnH / 2, btnW, btnH, 7);
    bg.lineStyle(active ? 1.8 : 1, active ? PALETTE.REMNANT_GOLD : PALETTE.STONE_HIGHLIGHT, active ? 0.95 : 0.45);
    bg.strokeRoundedRect(cx - btnW / 2, cy - btnH / 2, btnW, btnH, 7);

    const txt = this.scene.add
      .text(cx, cy, label, {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        fontStyle: active ? 'bold' : 'normal',
        color: active ? PALETTE.TEXT_GOLD : PALETTE.TEXT_MUTED,
      })
      .setOrigin(0.5);

    const hit = this.scene.add
      .rectangle(cx, cy, btnW, btnH, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      if (this.viewMode !== mode) {
        this.switchViewMode(mode);
      }
    });

    this.container.add([bg, txt, hit]);
  }

  private renderRegionalSurvey(
    mapX: number,
    mapY: number,
    mapW: number,
    mapH: number,
    sideX: number,
    sideY: number,
    sideW: number,
    sideH: number,
    playerInfo: { x: number; y: number; name: string; rank: AdventurerRank; hasCompassRelic: boolean }
  ): void {
    const g = this.scene.add.graphics();

    // Aged dark-parchment cartographic background
    g.fillStyle(0x171b2c, 1);
    g.fillRoundedRect(mapX, mapY, mapW, mapH, 10);

    // Subtle cartographic grid lines & compass rose
    g.lineStyle(1, 0x2a3350, 0.42);
    for (let gx = 1; gx < 10; gx++) {
      const lx = mapX + (gx / 10) * mapW;
      g.beginPath();
      g.moveTo(lx, mapY + 8);
      g.lineTo(lx, mapY + mapH - 8);
      g.strokePath();
    }
    for (let gy = 1; gy < 7; gy++) {
      const ly = mapY + (gy / 7) * mapH;
      g.beginPath();
      g.moveTo(mapX + 8, ly);
      g.lineTo(mapX + mapW - 8, ly);
      g.strokePath();
    }

    const pad = 28;
    const innerW = mapW - pad * 2;
    const innerH = mapH - pad * 2;
    const toMapX = (wx: number) => mapX + pad + (wx / WORLD_WIDTH) * innerW;
    const toMapY = (wy: number) => mapY + pad + (wy / WORLD_HEIGHT) * innerH;

    // Illustrated architectural platforms & pathways (revealed wherever fog is cleared)
    for (const p of WORLD_PLATFORMS) {
      const px = toMapX(p.x - p.width / 2);
      const py = toMapY(p.y - p.height / 2);
      const pw = Math.max(4, (p.width / WORLD_WIDTH) * innerW);
      const ph = Math.max(4, (p.height / WORLD_HEIGHT) * innerH);

      const fill =
        p.style === 'sanctum'
          ? 0x453b64
          : p.style === 'aqueduct'
            ? 0x3b4d74
            : 0x4b5678;
      g.fillStyle(fill, 0.92);
      g.fillRoundedRect(px, py, pw, ph, 2);
      g.lineStyle(1, PALETTE.REMNANT_GOLD, 0.42);
      g.strokeRoundedRect(px, py, pw, ph, 2);
    }

    // Dotted route lines linking already-discovered landmarks
    const routePairs: Array<[string, string]> = [
      ['loc_precipice', 'loc_courtyard_seals'],
      ['loc_courtyard_seals', 'loc_observatory'],
      ['loc_observatory', 'loc_wind_spires'],
      ['loc_wind_spires', 'loc_sky_bridge'],
      ['loc_sky_bridge', 'loc_crucible'],
      ['loc_crucible', 'loc_return_gallery'],
      ['loc_return_gallery', 'loc_courtyard_seals'],
      ['loc_courtyard_seals', 'loc_sunken_causeway'],
      ['loc_sunken_causeway', 'loc_cradle_sanctum'],
      ['loc_cradle_sanctum', 'loc_mirror_arch'],
    ];
    g.lineStyle(1.4, PALETTE.REMNANT_GOLD, 0.42);
    for (const [aId, bId] of routePairs) {
      if (!this.exploration.isLocationDiscovered(aId) || !this.exploration.isLocationDiscovered(bId)) {
        continue;
      }
      const a = SHATTERED_VERGE_LOCATIONS.find((l) => l.id === aId);
      const b = SHATTERED_VERGE_LOCATIONS.find((l) => l.id === bId);
      if (a && b) {
        g.beginPath();
        g.moveTo(toMapX(a.worldX), toMapY(a.worldY));
        g.lineTo(toMapX(b.worldX), toMapY(b.worldY));
        g.strokePath();
      }
    }

    // Fog of war: uniform opaque black-charcoal mist concealing all unexplored territory
    // without leaking silhouettes of undiscovered reachable rooms
    const cellW = innerW / MAP_GRID_COLS;
    const cellH = innerH / MAP_GRID_ROWS;
    for (let c = 0; c < MAP_GRID_COLS; c++) {
      for (let r = 0; r < MAP_GRID_ROWS; r++) {
        const discovered = this.exploration.isCellDiscovered(c, r);
        if (!discovered) {
          const cx = mapX + pad + c * cellW;
          const cy = mapY + pad + r * cellH;
          g.fillStyle(0x070913, 1);
          g.fillRect(cx - 1.2, cy - 1.2, cellW + 2.4, cellH + 2.4);
        }
      }
    }

    // Subtle feathered mist edge strictly along the frontier of already-discovered cells
    for (let c = 0; c < MAP_GRID_COLS; c++) {
      for (let r = 0; r < MAP_GRID_ROWS; r++) {
        if (this.exploration.isCellDiscovered(c, r)) continue;
        const bordersDiscovered =
          (c > 0 && this.exploration.isCellDiscovered(c - 1, r)) ||
          (c < MAP_GRID_COLS - 1 && this.exploration.isCellDiscovered(c + 1, r)) ||
          (r > 0 && this.exploration.isCellDiscovered(c, r - 1)) ||
          (r < MAP_GRID_ROWS - 1 && this.exploration.isCellDiscovered(c, r + 1));
        if (bordersDiscovered) {
          const cx = mapX + pad + c * cellW;
          const cy = mapY + pad + r * cellH;
          g.fillStyle(0x070913, 0.52);
          g.fillEllipse(cx + cellW * 0.5, cy + cellH * 0.5, cellW * 1.24, cellH * 1.22);
        }
      }
    }

    // Map border & Compass Rose in lower-left corner
    g.lineStyle(1.6, PALETTE.REMNANT_BRONZE, 0.78);
    g.strokeRoundedRect(mapX, mapY, mapW, mapH, 10);
    this.drawCompassRose(g, mapX + 58, mapY + mapH - 58, 28);

    this.container.add(g);

    const banner = this.scene.add
      .text(mapX + 20, mapY + 14, 'REGIONAL SURVEY: THE SHATTERED VERGE (CROWN REACHES BORDER)', {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_GOLD,
        letterSpacing: 1.5,
      })
      .setOrigin(0, 0);
    this.container.add(banner);

    // Discovered Landmark markers
    for (const loc of SHATTERED_VERGE_LOCATIONS) {
      if (!this.exploration.isLocationDiscovered(loc.id)) continue;
      const lx = toMapX(loc.worldX);
      const ly = toMapY(loc.worldY);
      const isSelected = this.selectedLocation?.id === loc.id;

      const marker = this.scene.add.graphics();
      const color =
        loc.kind === 'dungeon'
          ? PALETTE.REMNANT_BRIGHT
          : loc.kind === 'sanctum'
            ? PALETTE.IMPRINT_RESONANCE
            : loc.kind === 'threshold'
              ? PALETTE.IMPRINT_RESOLVE
              : PALETTE.ETHEREAL_CYAN;

      if (isSelected) {
        marker.lineStyle(1.8, PALETTE.REMNANT_GOLD, 0.95);
        marker.strokeCircle(lx, ly, 11);
      }
      marker.fillStyle(0x0b0f1e, 0.95);
      marker.fillCircle(lx, ly, 6.5);
      marker.fillStyle(color, 1);
      marker.fillCircle(lx, ly, 4.2);

      const hit = this.scene.add
        .circle(lx, ly, 15, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        this.selectedLocation = loc;
        AudioManager.getInstance().playDialogueBlip();
        this.rebuild();
      });

      this.container.add([marker, hit]);
    }

    // Live Player Position Pin
    const pinX = toMapX(playerInfo.x);
    const pinY = toMapY(playerInfo.y);
    this.playerPinCoords = { x: pinX, y: pinY };

    this.pulseGraphics = this.scene.add.graphics();
    const pinGfx = this.scene.add.graphics();
    pinGfx.fillStyle(PALETTE.GARMENT_CHARCOAL, 1);
    pinGfx.fillCircle(pinX, pinY, 7);
    pinGfx.lineStyle(2.2, PALETTE.GARMENT_GOLD_BRIGHT, 1);
    pinGfx.strokeCircle(pinX, pinY, 7);
    pinGfx.fillStyle(PALETTE.GARMENT_GOLD_BRIGHT, 1);
    pinGfx.fillCircle(pinX, pinY, 2.6);

    const pinLabel = this.scene.add
      .text(pinX, pinY - 16, playerInfo.name, {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_GOLD,
        backgroundColor: 'rgba(10, 14, 28, 0.82)',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 1);

    this.container.add([this.pulseGraphics, pinGfx, pinLabel]);

    // Right Sidebar: Selected Landmark & Discovered Locations List
    this.renderRegionalSidebar(sideX, sideY, sideW, sideH, playerInfo.hasCompassRelic);
  }

  private renderRegionalSidebar(
    sideX: number,
    sideY: number,
    sideW: number,
    sideH: number,
    hasCompassRelic: boolean
  ): void {
    const panel = this.scene.add.graphics();
    panel.fillStyle(0x11162a, 0.96);
    panel.fillRoundedRect(sideX, sideY, sideW, sideH, 10);
    panel.lineStyle(1.3, PALETTE.STONE_HIGHLIGHT, 0.45);
    panel.strokeRoundedRect(sideX, sideY, sideW, sideH, 10);
    this.container.add(panel);

    const discovered = this.exploration.getDiscoveredLocationDefs();
    const total = SHATTERED_VERGE_LOCATIONS.length;

    let curY = sideY + 18;
    const header = this.scene.add.text(
      sideX + 20,
      curY,
      `CHARTED LANDMARKS (${discovered.length} / ${total})`,
      {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_CYAN,
        letterSpacing: 1.2,
      }
    );
    this.container.add(header);
    curY += 28;

    for (const loc of SHATTERED_VERGE_LOCATIONS) {
      const isFound = this.exploration.isLocationDiscovered(loc.id);
      const isSelected = this.selectedLocation?.id === loc.id;
      const rowTxt = this.scene.add.text(
        sideX + 22,
        curY,
        isFound ? `${isSelected ? '◆' : '▸'}  ${loc.name}` : '◇  Uncharted Mist',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '13.5px',
          fontStyle: isSelected ? 'bold' : 'normal',
          color: !isFound
            ? '#5c688a'
            : isSelected
              ? PALETTE.TEXT_GOLD
              : PALETTE.TEXT_LIGHT,
        }
      );
      if (isFound) {
        rowTxt.setInteractive({ useHandCursor: true });
        rowTxt.on('pointerdown', () => {
          this.selectedLocation = loc;
          AudioManager.getInstance().playDialogueBlip();
          this.rebuild();
        });
      }
      this.container.add(rowTxt);
      curY += 27;
    }

    curY += 12;
    panel.lineStyle(1, PALETTE.STONE_HIGHLIGHT, 0.32);
    panel.beginPath();
    panel.moveTo(sideX + 18, curY);
    panel.lineTo(sideX + sideW - 18, curY);
    panel.strokePath();
    curY += 16;

    const sel = this.selectedLocation;
    const detailTitle = this.scene.add.text(
      sideX + 20,
      curY,
      sel ? sel.name : 'Select a Landmark',
      {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_GOLD,
        wordWrap: { width: sideW - 40 },
      }
    );
    this.container.add(detailTitle);
    curY += detailTitle.height + 8;

    const detailBody = this.scene.add.text(
      sideX + 20,
      curY,
      sel
        ? sel.description
        : 'Explore the ruins of the Shattered Verge to dispel the dark mist and record landmarks.',
      {
        fontFamily: 'Georgia, serif',
        fontSize: '13.5px',
        color: PALETTE.TEXT_MUTED,
        lineSpacing: 4,
        wordWrap: { width: sideW - 40 },
      }
    );
    this.container.add(detailBody);

    if (hasCompassRelic) {
      const relicNote = this.scene.add.text(
        sideX + 20,
        sideY + sideH - 46,
        '✦ Wayfarer’s Compass-Lens Active (+45% Survey Sight)',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '12.5px',
          color: PALETTE.TEXT_GOLD,
          wordWrap: { width: sideW - 40 },
        }
      );
      this.container.add(relicNote);
    }
  }

  /**
   * Continental World Atlas inspired by world-atlas-reference.png:
   * 4 sculpted known continents around the Sundered Sea Gyre, plus the 5th eastern
   * landmass permanently veiled beneath swirling black-violet abyssal mist.
   */
  private renderWorldContinents(
    mapX: number,
    mapY: number,
    mapW: number,
    mapH: number,
    sideX: number,
    sideY: number,
    sideW: number,
    sideH: number,
    regionPct: number,
    worldPct: number
  ): void {
    const g = this.scene.add.graphics();

    // Deep maritime parchment-slate ocean
    g.fillStyle(0x13192b, 1);
    g.fillRoundedRect(mapX, mapY, mapW, mapH, 10);

    const cx = mapX + mapW * 0.46;
    const cy = mapY + mapH * 0.52;

    // Rhumb lines & Sundered Sea Gyre rings
    g.lineStyle(1, 0x2a3656, 0.42);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * 460, cy + Math.sin(a) * 310);
      g.strokePath();
    }
    for (const r of [42, 76, 114]) {
      g.lineStyle(1.1, PALETTE.ETHEREAL_BLUE, 0.22);
      g.strokeEllipse(cx, cy, r * 2.1, r * 1.45);
    }

    const drawContinent = (
      pts: Array<[number, number]>,
      exploredHighlight: boolean,
      labelX: number,
      labelY: number,
      title: string,
      sub: string
    ) => {
      // Coastal shelf halo
      g.lineStyle(5, 0x243252, 0.5);
      g.beginPath();
      pts.forEach(([px, py], idx) => (idx === 0 ? g.moveTo(px, py) : g.lineTo(px, py)));
      g.closePath();
      g.strokePath();

      // Landmass fill (parchment-bronze where charted, veiled slate-ash where unexplored)
      g.fillStyle(exploredHighlight ? 0x302b3d : 0x1c2033, 0.96);
      g.lineStyle(1.6, exploredHighlight ? PALETTE.REMNANT_GOLD : 0x525e82, 0.78);
      g.beginPath();
      pts.forEach(([px, py], idx) => (idx === 0 ? g.moveTo(px, py) : g.lineTo(px, py)));
      g.closePath();
      g.fillPath();
      g.strokePath();

      // Fog of war veil over unvisited inner kingdoms
      if (!exploredHighlight) {
        g.fillStyle(0x080a14, 0.64);
        g.beginPath();
        pts.forEach(([px, py], idx) => (idx === 0 ? g.moveTo(px, py) : g.lineTo(px, py)));
        g.closePath();
        g.fillPath();
      }

      const t1 = this.scene.add
        .text(labelX, labelY, title, {
          fontFamily: 'Georgia, serif',
          fontSize: '15px',
          fontStyle: 'bold',
          color: exploredHighlight ? PALETTE.TEXT_GOLD : '#9aa7c7',
          align: 'center',
        })
        .setOrigin(0.5);
      const t2 = this.scene.add
        .text(labelX, labelY + 20, sub, {
          fontFamily: 'Georgia, serif',
          fontSize: '11.5px',
          fontStyle: 'italic',
          color: PALETTE.TEXT_MUTED,
          align: 'center',
        })
        .setOrigin(0.5);
      this.container.add([t1, t2]);
    };

    this.container.add(g);

    // 1. Northwest: Aethelgard & The Crown Reaches (contains The Shattered Verge!)
    drawContinent(
      [
        [mapX + 75, mapY + 115],
        [mapX + 215, mapY + 78],
        [mapX + 365, mapY + 96],
        [mapX + 410, mapY + 178],
        [mapX + 335, mapY + 258],
        [mapX + 235, mapY + 286],
        [mapX + 125, mapY + 245],
        [mapX + 68, mapY + 180],
      ],
      true,
      mapX + 238,
      mapY + 166,
      'Aethelgard & Crown Reaches',
      '1 / 5 Regions Reached'
    );

    // 2. Northeast: Aurelia of the Ivory Spires
    drawContinent(
      [
        [mapX + 515, mapY + 92],
        [mapX + 685, mapY + 76],
        [mapX + 790, mapY + 145],
        [mapX + 748, mapY + 248],
        [mapX + 615, mapY + 275],
        [mapX + 505, mapY + 205],
      ],
      false,
      mapX + 648,
      mapY + 168,
      'Aurelia of the Ivory Spires',
      '0 / 5 Regions Charted'
    );

    // 3. Southwest: The Solis Aridlands
    drawContinent(
      [
        [mapX + 96, mapY + 415],
        [mapX + 255, mapY + 382],
        [mapX + 380, mapY + 448],
        [mapX + 352, mapY + 575],
        [mapX + 195, mapY + 602],
        [mapX + 88, mapY + 525],
      ],
      false,
      mapX + 235,
      mapY + 492,
      'The Solis Aridlands',
      '0 / 4 Regions Charted'
    );

    // 4. Southeast: The Sylphic Marches
    drawContinent(
      [
        [mapX + 495, mapY + 425],
        [mapX + 668, mapY + 398],
        [mapX + 772, mapY + 485],
        [mapX + 725, mapY + 598],
        [mapX + 545, mapY + 610],
        [mapX + 470, mapY + 518],
      ],
      false,
      mapX + 622,
      mapY + 504,
      'The Sylphic Marches',
      '0 / 4 Regions Charted'
    );

    // Active Chapter I Beacon on southern cliff of Aethelgard: The Shattered Verge
    const vergeX = mapX + 255;
    const vergeY = mapY + 272;
    this.playerPinCoords = { x: vergeX, y: vergeY };
    this.pulseGraphics = this.scene.add.graphics();

    const beacon = this.scene.add.graphics();
    beacon.fillStyle(PALETTE.REMNANT_GOLD, 1);
    beacon.fillCircle(vergeX, vergeY, 6);
    beacon.lineStyle(2, PALETTE.ETHEREAL_CYAN, 0.95);
    beacon.strokeCircle(vergeX, vergeY, 9.5);

    const vergeTag = this.scene.add
      .text(vergeX, vergeY + 15, `The Shattered Verge (${regionPct.toFixed(1)}%)`, {
        fontFamily: 'Georgia, serif',
        fontSize: '12.5px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_CYAN,
        backgroundColor: 'rgba(10, 14, 28, 0.85)',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    vergeTag.on('pointerdown', () => this.switchViewMode('regional'));

    // 5. Far Eastern Sea: Secret Fifth Continent veiled completely in dynamic swirling black mist
    this.shroudGraphics = this.scene.add.graphics();

    const frameOverlay = this.scene.add.graphics();
    frameOverlay.lineStyle(1.6, PALETTE.REMNANT_BRONZE, 0.78);
    frameOverlay.strokeRoundedRect(mapX, mapY, mapW, mapH, 10);
    this.drawCompassRose(frameOverlay, mapX + 58, mapY + mapH - 58, 28);

    this.container.add([this.pulseGraphics, beacon, vergeTag, this.shroudGraphics, frameOverlay]);

    // Right Sidebar: Known Realms Overview
    const sPanel = this.scene.add.graphics();
    sPanel.fillStyle(0x11162a, 0.96);
    sPanel.fillRoundedRect(sideX, sideY, sideW, sideH, 10);
    sPanel.lineStyle(1.3, PALETTE.STONE_HIGHLIGHT, 0.45);
    sPanel.strokeRoundedRect(sideX, sideY, sideW, sideH, 10);
    this.container.add(sPanel);

    let sy = sideY + 20;
    const sHead = this.scene.add.text(sideX + 20, sy, 'KNOWN REALMS LEDGER', {
      fontFamily: 'Georgia, serif',
      fontSize: '14.5px',
      fontStyle: 'bold',
      color: PALETTE.TEXT_GOLD,
      letterSpacing: 1.4,
    });
    this.container.add(sHead);
    sy += 30;

    const summary = this.scene.add.text(
      sideX + 20,
      sy,
      `Global Cartography: ${worldPct.toFixed(2)}% of the 18 known regions across four continents.\n\nYour journey begins upon the Shattered Verge, a fractured borderland clinging to the southern cliffs of Aethelgard.`,
      {
        fontFamily: 'Georgia, serif',
        fontSize: '13.5px',
        color: PALETTE.TEXT_LIGHT,
        lineSpacing: 4,
        wordWrap: { width: sideW - 40 },
      }
    );
    this.container.add(summary);
    sy += summary.height + 22;

    for (const cont of KNOWN_WORLD_CONTINENTS) {
      if (cont.isSecretContinent) continue;
      const isCurrent = cont.id === 'cont_verge_crown';
      const ct = this.scene.add.text(
        sideX + 20,
        sy,
        `${isCurrent ? '◆' : '◇'}  ${cont.name}\n    ${cont.subtitle}`,
        {
          fontFamily: 'Georgia, serif',
          fontSize: '13px',
          color: isCurrent ? PALETTE.TEXT_GOLD : PALETTE.TEXT_MUTED,
          lineSpacing: 3,
          wordWrap: { width: sideW - 40 },
        }
      );
      this.container.add(ct);
      sy += ct.height + 14;
    }

    const abyssNote = this.scene.add.text(
      sideX + 20,
      sideY + sideH - 76,
      'Eastern Horizon Note:\nGuild sea-charts end abruptly at an impenetrable wall of black tempest mist in the far east. No ship has returned with its bearings.',
      {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        fontStyle: 'italic',
        color: '#8e84b8',
        lineSpacing: 3,
        wordWrap: { width: sideW - 40 },
      }
    );
    this.container.add(abyssNote);
  }

  private drawCompassRose(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
    g.lineStyle(1.3, PALETTE.REMNANT_GOLD, 0.72);
    g.strokeCircle(cx, cy, r);
    g.strokeCircle(cx, cy, r * 0.62);

    const dirs: Array<[number, number, number]> = [
      [0, -1, 1],
      [1, 0, 0.78],
      [0, 1, 0.78],
      [-1, 0, 0.78],
    ];
    for (const [dx, dy, scale] of dirs) {
      g.fillStyle(PALETTE.REMNANT_GOLD, scale === 1 ? 0.95 : 0.62);
      g.beginPath();
      g.moveTo(cx + dx * r * scale * 1.18, cy + dy * r * scale * 1.18);
      g.lineTo(cx - dy * 4, cy + dx * 4);
      g.lineTo(cx + dy * 4, cy - dx * 4);
      g.closePath();
      g.fillPath();
    }
  }
}
