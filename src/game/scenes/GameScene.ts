import Phaser from 'phaser';
import {
  DEFAULT_PLAYER_NAME,
  GAME_EVENTS,
  GAME_HEIGHT,
  GAME_WIDTH,
  PALETTE,
  SCENE_KEYS,
  WORLD_CAMERA_ZOOM,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type AdventurerRank,
} from '../constants';
import { DIALOGUE_TREES } from '../data/dialogues';
import { ECHO_FRAGMENT_DEFINITIONS, RELIC_DEFINITIONS } from '../data/quests';
import {
  CHAPTER_TRIGGERS,
  FOREGROUND_SILHOUETTES,
  WORLD_PLATFORMS,
  WORLD_PROPS,
  WORLD_RUNE_SIGNS,
  WORLD_UPDRAFTS,
  type RuinPropDef,
} from '../data/world';
import { Interactable } from '../entities/Interactable';
import { NPC } from '../entities/NPC';
import { Player } from '../entities/Player';
import {
  FracturedSlab,
  HeavyBlock,
  PressurePlate,
  RunicGate,
  WindUpdraft,
} from '../entities/PuzzleObjects';
import { AudioManager } from '../systems/AudioManager';
import { DialogueManager } from '../systems/DialogueManager';
import { ExplorationManager } from '../systems/ExplorationManager';
import { ImprintManager } from '../systems/ImprintManager';
import { QuestManager } from '../systems/QuestManager';
import { REMNANT_DEFINITIONS, RemnantManager } from '../systems/RemnantManager';
import {
  SaveManager,
  createDefaultSoulSpectrum,
  sanitizePlayerName,
  type SaveState,
  type SoulSpectrumState,
} from '../systems/SaveManager';
import { ConfirmModal } from '../ui/ConfirmModal';
import { DialogueBox } from '../ui/DialogueBox';
import { HUD } from '../ui/HUD';
import { Journal } from '../ui/Journal';
import { PauseMenu } from '../ui/PauseMenu';
import { RestorationOverlay } from '../ui/RestorationOverlay';
import { WorldMap } from '../ui/WorldMap';
import { LightingController } from '../time/LightingController';
import { ArtGenerator } from '../utils/ArtGenerator';
import { EnvironmentRenderer } from '../environment/EnvironmentRenderer';

export interface GameSceneInitData {
  loadSaved?: boolean;
  playerName?: string;
}

export class GameScene extends Phaser.Scene {
  // Cameras & Parallax layers
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private uiObjects = new Set<Phaser.GameObjects.GameObject>();
  private uiIgnoredObjects = new WeakSet<Phaser.GameObjects.GameObject>();

  public environmentRenderer!: EnvironmentRenderer;
  private parallaxFar?: Phaser.GameObjects.TileSprite;
  private parallaxMid?: Phaser.GameObjects.TileSprite;
  private parallaxNear?: Phaser.GameObjects.TileSprite;
  private skyImage!: Phaser.GameObjects.Image;
  public lightingController!: LightingController;
  private vignetteImage!: Phaser.GameObjects.Image;
  private animatedPropsGfx!: Phaser.GameObjects.Graphics;
  private conduitLinesGfx!: Phaser.GameObjects.Graphics;
  private compassGfx!: Phaser.GameObjects.Graphics;
  private static readonly COMPASS_SENSE_RADIUS = 480;
  private mistBands: Array<{
    sprite: Phaser.GameObjects.Image;
    baseX: number;
    speed: number;
    amp: number;
  }> = [];

  // Core systems
  public remnantManager!: RemnantManager;
  public imprintManager!: ImprintManager;
  public questManager!: QuestManager;
  public dialogueManager!: DialogueManager;
  public explorationManager!: ExplorationManager;

  // Entities & world objects
  public player!: Player;
  private platformsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private updrafts = new Map<string, WindUpdraft>();
  private blocks = new Map<string, HeavyBlock>();
  private plates = new Map<string, PressurePlate>();
  private slabs = new Map<string, FracturedSlab>();
  private gates = new Map<string, RunicGate>();
  private npcs = new Map<string, NPC>();
  private interactables: Interactable[] = [];
  private animatedProps: RuinPropDef[] = [];

  // UI overlays
  private hud!: HUD;
  private dialogueBox!: DialogueBox;
  private restorationOverlay!: RestorationOverlay;
  private journal!: Journal;
  private worldMap!: WorldMap;
  private pauseMenu!: PauseMenu;
  private confirmModal!: ConfirmModal;

  // Runtime state
  public playerName = DEFAULT_PLAYER_NAME;
  public adventurerRank: AdventurerRank = 'G';
  public relics = new Set<string>();
  public soulAffinities: SoulSpectrumState = createDefaultSoulSpectrum();
  public worldFlags: Record<string, boolean> = {};
  public discoveredEchoes = new Set<string>();
  private compassSensedIds: string[] = [];

  private visitedChapters = new Set<number>();
  private currentChapter = 1;
  private currentChapterTitle = 'Chapter I: The Shattered Verge';
  private isRestoringSequence = false;
  private isEndingSequence = false;
  private blockTouchToastCooldownMs = 0;

  // Input keys
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyEnter!: Phaser.Input.Keyboard.Key;
  private keyJ!: Phaser.Input.Keyboard.Key;
  private keyH!: Phaser.Input.Keyboard.Key;
  private keyV!: Phaser.Input.Keyboard.Key;
  private keyTab!: Phaser.Input.Keyboard.Key;
  private keyM!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private keyOne!: Phaser.Input.Keyboard.Key;
  private keyTwo!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  public create(data?: GameSceneInitData): void {
    // Reset collections on scene start/restart
    this.uiObjects.clear();
    this.uiIgnoredObjects = new WeakSet<Phaser.GameObjects.GameObject>();
    this.updrafts.clear();
    this.blocks.clear();
    this.plates.clear();
    this.slabs.clear();
    this.gates.clear();
    this.npcs.clear();
    this.interactables = [];
    this.animatedProps = [];
    this.mistBands = [];
    this.worldFlags = {};
    this.discoveredEchoes.clear();
    this.compassSensedIds = [];
    this.relics.clear();
    this.visitedChapters.clear();
    this.isRestoringSequence = false;
    this.isEndingSequence = false;
    this.blockTouchToastCooldownMs = 0;

    // Clean up custom scene event listeners on restart/shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.environmentRenderer?.destroy();
      this.events.removeAllListeners(GAME_EVENTS.QUEST_UPDATED);
      this.events.removeAllListeners(GAME_EVENTS.REMNANT_RESTORED);
      this.events.removeAllListeners(GAME_EVENTS.IMPRINT_ACQUIRED);
      this.events.removeAllListeners(GAME_EVENTS.ECHO_DISCOVERED);
      this.events.removeAllListeners(GAME_EVENTS.RELIC_ACQUIRED);
      this.events.removeAllListeners(GAME_EVENTS.LOCATION_DISCOVERED);
      this.events.removeAllListeners(GAME_EVENTS.CHAPTER_CHANGED);
    });

    const saved: SaveState | null = data?.loadSaved ? SaveManager.load() : null;
    if (saved) {
      this.playerName = sanitizePlayerName(saved.playerName);
      this.adventurerRank = saved.adventurerRank;
      this.soulAffinities = { ...createDefaultSoulSpectrum(), ...saved.soulAffinities };
      saved.relics.forEach((r) => this.relics.add(r));
      this.worldFlags = { ...saved.worldFlags };
      saved.discoveredEchoes.forEach((e) => this.discoveredEchoes.add(e));
      this.currentChapter = saved.chapter;
      this.currentChapterTitle = saved.chapterTitle;
      for (let c = 1; c <= saved.chapter; c++) {
        this.visitedChapters.add(c);
      }
    } else {
      this.playerName = sanitizePlayerName(data?.playerName);
      this.adventurerRank = 'G';
      this.soulAffinities = createDefaultSoulSpectrum();
      this.currentChapter = 1;
      this.currentChapterTitle = 'Chapter I: The Shattered Verge';
    }

    // Initialize managers
    this.remnantManager = new RemnantManager(this.events, saved?.restoredRemnants ?? []);
    this.imprintManager = new ImprintManager(this.events, saved?.imprint ?? null);
    this.questManager = new QuestManager(this.events, saved?.questStates);
    this.dialogueManager = new DialogueManager(DIALOGUE_TREES);
    this.explorationManager = new ExplorationManager(
      this.events,
      saved?.discoveredCells ?? [],
      saved?.discoveredLocations ?? ['loc_precipice']
    );

    if (!saved) {
      this.questManager.startQuest('q_awakening_verge', true);
    }

    AudioManager.getInstance().unlockAndStartAmbient(this.remnantManager.hasWeight());
    AudioManager.getInstance().setGroundedMode(this.remnantManager.hasWeight());

    // Configure physics & expanded world bounds
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT + 120);

    this.environmentRenderer = new EnvironmentRenderer({
      scene: this,
    });

    this.buildBackdropAndAtmosphere();
    this.buildWorldGeometry();
    this.buildForegroundDepthLayer();
    this.buildPuzzlesAndEntities(saved);
    this.buildUI();
    this.setupInput();
    this.setupCameras();

    // Seed initial fog-of-war cell discovery around spawn/load position
    this.explorationManager.updatePlayerPosition(
      this.player.sprite.x,
      this.player.sprite.y,
      this.getMapRevealRadius()
    );
    this.hud.refresh();

    this.cameras.main.fadeIn(750, 7, 9, 19);

    if (!saved) {
      this.visitedChapters.add(1);
      this.time.delayedCall(450, () => {
        this.hud.showChapterCard(
          'Chapter I: The Shattered Verge',
          'A Stabilizing Garment Upon Forgotten Stone'
        );
      });
      this.saveCheckpoint('awakening_dais');
    } else {
      this.time.delayedCall(350, () => {
        this.hud.showToast(
          `Journey Resumed: ${this.playerName} (${this.currentChapterTitle})`,
          'gold',
          2900
        );
      });
    }
  }

  public isWorldMapOpen(): boolean {
    return this.worldMap?.isOpen() ?? false;
  }

  public isJournalOpen(): boolean {
    return this.journal?.isOpen() ?? false;
  }

  public isConfirmModalOpen(): boolean {
    return this.confirmModal?.isOpen() ?? false;
  }

  public getConfirmModalTitle(): string | null {
    return this.confirmModal?.getTitle() ?? null;
  }

  public getCompassSensedInteractableIds(): string[] {
    return [...this.compassSensedIds];
  }

  public getCrucibleLocksReleasedCount(): number {
    return (
      (this.worldFlags['crucible_lock_west'] ? 1 : 0) +
      (this.worldFlags['crucible_lock_east'] ? 1 : 0) +
      (this.worldFlags['crucible_lock_zenith'] ? 1 : 0)
    );
  }

  private getMapRevealRadius(): number {
    return this.relics.has('relic_compass_lens') ? 392 : 270;
  }

  private buildBackdropAndAtmosphere(): void {
    const invZoom = 1 / WORLD_CAMERA_ZOOM;
    const toCamScreenY = (screenY: number) =>
      GAME_HEIGHT / 2 + (screenY - GAME_HEIGHT / 2) * invZoom;

    this.skyImage = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'tex_sky_dynamic')
      .setScrollFactor(0)
      .setScale(invZoom)
      .setDepth(0);

    // Screen-edge atmospheric vignette (rendered on 1:1 UI camera)
    this.vignetteImage = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'tex_vignette')
      .setScrollFactor(0)
      .setDepth(90);

    if (this.environmentRenderer.isLegacyMode()) {
      this.parallaxFar = this.add
        .tileSprite(
          GAME_WIDTH / 2,
          toCamScreenY(GAME_HEIGHT - 340),
          GAME_WIDTH,
          680,
          'tex_parallax_far'
        )
        .setScrollFactor(0)
        .setScale(invZoom)
        .setDepth(1)
        .setAlpha(0.9);

      this.parallaxMid = this.add
        .tileSprite(
          GAME_WIDTH / 2,
          toCamScreenY(GAME_HEIGHT - 320),
          GAME_WIDTH,
          680,
          'tex_parallax_mid'
        )
        .setScrollFactor(0)
        .setScale(invZoom)
        .setDepth(2)
        .setAlpha(0.93);

      this.parallaxNear = this.add
        .tileSprite(
          GAME_WIDTH / 2,
          toCamScreenY(GAME_HEIGHT - 300),
          GAME_WIDTH,
          700,
          'tex_parallax_near'
        )
        .setScrollFactor(0)
        .setScale(invZoom)
        .setDepth(3)
        .setAlpha(0.96);

      // Initialize real-time dynamic atmosphere & time-of-day controller
      this.lightingController = new LightingController({
        scene: this,
        skyImage: this.skyImage,
        parallaxFar: this.parallaxFar,
        parallaxMid: this.parallaxMid,
        parallaxNear: this.parallaxNear,
        vignetteImage: this.vignetteImage,
      });

      // Volumetric 2.5D drifting valley mist bands
      const mistPlacements = [
        { x: 540, y: 900, scaleX: 1.8, scaleY: 1.15, alpha: 0.42, speed: 0.32, amp: 52, depth: 13 },
        { x: 1295, y: 785, scaleX: 1.9, scaleY: 1.25, alpha: 0.46, speed: 0.4, amp: 44, depth: 13 },
        { x: 2480, y: 585, scaleX: 2.2, scaleY: 1.2, alpha: 0.38, speed: 0.28, amp: 64, depth: 13 },
        { x: 3680, y: 530, scaleX: 2.4, scaleY: 1.3, alpha: 0.48, speed: 0.36, amp: 70, depth: 13 },
        { x: 4480, y: 558, scaleX: 1.9, scaleY: 1.1, alpha: 0.34, speed: 0.3, amp: 46, depth: 33 },
        { x: 3550, y: 1142, scaleX: 2.5, scaleY: 1.15, alpha: 0.36, speed: 0.25, amp: 60, depth: 33 },
      ];
      for (const mp of mistPlacements) {
        const sprite = this.add
          .image(mp.x, mp.y, 'tex_mist_band')
          .setScale(mp.scaleX, mp.scaleY)
          .setAlpha(mp.alpha)
          .setDepth(mp.depth);
        this.mistBands.push({
          sprite,
          baseX: mp.x,
          speed: mp.speed,
          amp: mp.amp,
        });
        this.lightingController.registerMistBand(sprite, mp.alpha);
      }

      // Subtle world-space ambient motes across the Shattered Verge
      this.add
        .particles(0, 0, 'tex_mote_cyan', {
          x: { min: 60, max: WORLD_WIDTH - 100 },
          y: { min: 180, max: WORLD_HEIGHT - 80 },
          speedY: { min: -22, max: -6 },
          speedX: { min: -12, max: 12 },
          scale: { start: 0.34, end: 0 },
          alpha: { start: 0.34, end: 0 },
          lifespan: 5400,
          frequency: 105,
          blendMode: 'ADD',
        })
        .setDepth(12);

      // Warm bioluminescent & brazier embers in the Crucible and Sunken Sanctum
      this.add
        .particles(0, 0, 'tex_mote_gold', {
          x: { min: 1400, max: WORLD_WIDTH - 140 },
          y: { min: 320, max: 1160 },
          speedY: { min: -20, max: -5 },
          speedX: { min: -8, max: 8 },
          scale: { start: 0.36, end: 0 },
          alpha: { start: 0.4, end: 0 },
          lifespan: 4800,
          frequency: 120,
          blendMode: 'ADD',
        })
        .setDepth(12);
    } else {
      this.lightingController = new LightingController({
        scene: this,
        skyImage: this.skyImage,
        vignetteImage: this.vignetteImage,
      });
      this.environmentRenderer.setLightingController(this.lightingController);
    }
  }

  private buildWorldGeometry(): void {
    if (this.environmentRenderer.isLegacyMode()) {
      const propsGfx = this.add.graphics().setDepth(10);
      for (const prop of WORLD_PROPS) {
        this.drawStaticRuinProp(propsGfx, prop.x, prop.y, prop.kind, prop.scale ?? 1);
        if (prop.kind === 'brazier' || prop.kind === 'waterfall') {
          this.animatedProps.push(prop);
        }
        if (prop.kind === 'brazier') {
          const s = prop.scale ?? 1;
          this.lightingController.registerLocalLight({
            x: prop.x,
            y: prop.y - 32 * s,
            baseRadius: 115 * s,
            baseIntensity: 0.85,
            flickerSpeed: 3.2,
          });
          this.add
            .particles(prop.x, prop.y - 38 * s, 'tex_mote_amber', {
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
        }
      }

      this.animatedPropsGfx = this.add.graphics().setDepth(13);

      const platGfx = this.add.graphics().setDepth(16);
      for (const p of WORLD_PLATFORMS) {
        ArtGenerator.drawCarvedPlatform(platGfx, p.x, p.y, p.width, p.height, p.style);
      }
    } else {
      this.environmentRenderer.init(WORLD_PLATFORMS, FOREGROUND_SILHOUETTES);
    }

    this.conduitLinesGfx = this.add.graphics().setDepth(11);
    this.compassGfx = this.add.graphics().setDepth(31);

    // Diegetic carved stone inscriptions
    for (const sign of WORLD_RUNE_SIGNS) {
      const titleObj = this.add
        .text(sign.x, sign.subtext ? sign.y - 10 : sign.y - 9, sign.text, {
          fontFamily: 'Georgia, serif',
          fontSize: '12.5px',
          color: PALETTE.TEXT_CYAN,
        })
        .setOrigin(0.5)
        .setResolution(2)
        .setDepth(12);

      let subObj: Phaser.GameObjects.Text | undefined;
      if (sign.subtext) {
        subObj = this.add
          .text(sign.x, sign.y + 9, sign.subtext, {
            fontFamily: 'Georgia, serif',
            fontSize: '11px',
            fontStyle: 'italic',
            color: PALETTE.TEXT_MUTED,
          })
          .setOrigin(0.5)
          .setResolution(2)
          .setDepth(12);
      }

      const contentW = Math.max(titleObj.width, subObj ? subObj.width : 0);
      const signW = Math.max(sign.subtext ? 290 : 184, Math.ceil(contentW + 38));
      const signH = sign.subtext ? 48 : 30;
      const signPlinth = this.add.graphics().setDepth(11);
      signPlinth.fillStyle(0x11172b, 0.82);
      signPlinth.fillRoundedRect(sign.x - signW / 2, sign.y - 24, signW, signH, 6);
      signPlinth.lineStyle(1, PALETTE.STONE_HIGHLIGHT, 0.44);
      signPlinth.strokeRoundedRect(sign.x - signW / 2, sign.y - 24, signW, signH, 6);
    }

    // 2.5D bevelled stone platforms + static Arcade Physics colliders
    this.platformsGroup = this.physics.add.staticGroup();

    for (const p of WORLD_PLATFORMS) {
      const block = this.platformsGroup.create(p.x, p.y, 'tex_pixel') as Phaser.Physics.Arcade.Sprite;
      block.setAlpha(0);
      block.setDisplaySize(p.width, p.height);
      block.refreshBody();
    }
  }

  private buildForegroundDepthLayer(): void {
    if (!this.environmentRenderer.isLegacyMode()) {
      return;
    }
    // Foreground 2.5D occluder silhouettes (scrollFactorX 1.14, placed away from platforms & puzzles)
    const fg = this.add.graphics().setDepth(65).setScrollFactor(1.14, 1).setAlpha(0.46);
    for (const item of FOREGROUND_SILHOUETTES) {
      const s = item.scale;
      if (item.kind === 'pillar_overhang') {
        fg.fillStyle(0x070a15, 0.92);
        fg.fillRect(item.x - 24 * s, item.y - 260 * s, 48 * s, 320 * s);
        fg.fillRoundedRect(item.x - 36 * s, item.y - 270 * s, 72 * s, 20 * s, 4);
        fg.lineStyle(1, PALETTE.STONE_HIGHLIGHT, 0.24);
        fg.strokeRect(item.x - 24 * s, item.y - 260 * s, 48 * s, 320 * s);
      } else if (item.kind === 'broken_arch') {
        fg.fillStyle(0x070a15, 0.9);
        fg.fillRect(item.x - 22 * s, item.y - 220 * s, 44 * s, 260 * s);
        fg.beginPath();
        fg.moveTo(item.x - 22 * s, item.y - 210 * s);
        fg.lineTo(item.x + 85 * s, item.y - 250 * s);
        fg.lineTo(item.x + 70 * s, item.y - 215 * s);
        fg.closePath();
        fg.fillPath();
      } else if (item.kind === 'hanging_vines') {
        fg.lineStyle(3.2, 0x090d1b, 0.88);
        for (let i = -2; i <= 2; i++) {
          fg.beginPath();
          fg.moveTo(item.x + i * 22, item.y - 280);
          fg.lineTo(item.x + i * 19 + 7, item.y - 190);
          fg.lineTo(item.x + i * 24 - 4, item.y - 125 - Math.abs(i) * 14);
          fg.strokePath();
        }
      }
    }
  }

  private drawStaticRuinProp(
    g: Phaser.GameObjects.Graphics,
    x: number,
    floorY: number,
    kind: RuinPropDef['kind'],
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
        // Carved iron-and-stone tripod brazier bowl
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
      case 'waterfall': {
        // Drawn dynamically in renderAnimatedWorldProps
        break;
      }
    }
  }

  private renderAnimatedWorldProps(time: number): void {
    const t = time * 0.001;
    this.animatedPropsGfx.clear();

    for (let idx = 0; idx < this.animatedProps.length; idx++) {
      const prop = this.animatedProps[idx];
      const s = prop.scale ?? 1;
      if (prop.kind === 'brazier') {
        const fx = prop.x;
        const fy = prop.y - 36 * s;
        const flicker = Math.sin(t * 9.5 + idx * 1.7) * 2.2 + Math.cos(t * 14 + idx) * 1.1;

        // Warm ambient light pool cast onto surrounding masonry
        this.animatedPropsGfx.fillStyle(PALETTE.BRAZIER_GLOW, 0.08 + Math.sin(t * 6 + idx) * 0.02);
        this.animatedPropsGfx.fillCircle(fx, fy - 4, 56 * s);
        this.animatedPropsGfx.fillStyle(PALETTE.BRAZIER_FLAME, 0.18);
        this.animatedPropsGfx.fillCircle(fx, fy - 4, 24 * s);

        // Outer amber flame tongue
        this.animatedPropsGfx.fillStyle(PALETTE.BRAZIER_GLOW, 0.9);
        this.animatedPropsGfx.beginPath();
        this.animatedPropsGfx.moveTo(fx - 9 * s, fy + 2);
        this.animatedPropsGfx.lineTo(fx + flicker * 0.4, fy - (18 + flicker) * s);
        this.animatedPropsGfx.lineTo(fx + 9 * s, fy + 2);
        this.animatedPropsGfx.closePath();
        this.animatedPropsGfx.fillPath();

        // Bright gold-white flame core
        this.animatedPropsGfx.fillStyle(0xffe6a3, 0.95);
        this.animatedPropsGfx.beginPath();
        this.animatedPropsGfx.moveTo(fx - 4.5 * s, fy + 2);
        this.animatedPropsGfx.lineTo(fx - flicker * 0.25, fy - (10 + flicker * 0.6) * s);
        this.animatedPropsGfx.lineTo(fx + 4.5 * s, fy + 2);
        this.animatedPropsGfx.closePath();
        this.animatedPropsGfx.fillPath();
      } else if (prop.kind === 'waterfall') {
        const wx = prop.x;
        const topY = prop.y + 14;
        const dropH = 225 * s;

        this.animatedPropsGfx.fillStyle(PALETTE.ETHEREAL_CYAN, 0.14);
        this.animatedPropsGfx.fillRect(wx - 13 * s, topY, 26 * s, dropH);

        for (let strand = -1; strand <= 1; strand++) {
          const sx = wx + strand * 6 * s;
          const offset = ((t * 145 + idx * 31 + strand * 29) % 48);
          this.animatedPropsGfx.lineStyle(2.2, PALETTE.ETHEREAL_SOFT, 0.34);
          for (let segY = topY + offset; segY < topY + dropH - 22; segY += 48) {
            this.animatedPropsGfx.beginPath();
            this.animatedPropsGfx.moveTo(sx, segY);
            this.animatedPropsGfx.lineTo(sx, segY + 26);
            this.animatedPropsGfx.strokePath();
          }
        }

        // Mist spray cloud at base of cascade
        this.animatedPropsGfx.fillStyle(PALETTE.ETHEREAL_SOFT, 0.18 + Math.sin(t * 4 + idx) * 0.04);
        this.animatedPropsGfx.fillEllipse(wx, topY + dropH, 52 * s, 18 * s);
      }
    }
  }

  private buildPuzzlesAndEntities(saved: SaveState | null): void {
    const hasWeight = this.remnantManager.hasWeight();

    // 1. Spawn Player (Stabilizing Garment)
    const startX = saved ? saved.playerX : 215;
    const startY = saved ? saved.playerY : 810;
    this.player = new Player(
      this,
      startX,
      startY,
      hasWeight,
      this.imprintManager.getCurrentId()
    );

    this.physics.add.collider(this.player.sprite, this.platformsGroup, () => {
      const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
      if (body.blocked.down) {
        this.player.recordSafePosition(this.player.sprite.x, this.player.sprite.y);
      }
    });

    // 2. Wind Updrafts
    const domeThermalActive =
      Boolean(this.worldFlags['crucible_lock_west']) &&
      Boolean(this.worldFlags['crucible_lock_east']);

    for (const u of WORLD_UPDRAFTS) {
      const enabled =
        u.id === 'updraft_east_balcony'
          ? Boolean(this.worldFlags['vane_east_active'])
          : u.id === 'updraft_crucible_dome'
            ? domeThermalActive
            : u.initiallyEnabled;
      this.updrafts.set(u.id, new WindUpdraft(this, u.x, u.y, u.width, u.height, enabled));
    }

    // 3. Runic Gates
    const spireOuterOpen =
      Boolean(this.worldFlags['conduit_north']) && Boolean(this.worldFlags['conduit_east']);
    this.gates.set(
      'gate_spire_outer',
      new RunicGate(this, {
        id: 'gate_spire_outer',
        x: 3210,
        y: 470,
        width: 34,
        height: 140,
        totalSeals: 2,
        initiallyOpen: spireOuterOpen,
      })
    );

    this.gates.set(
      'gate_crucible_entry',
      new RunicGate(this, {
        id: 'gate_crucible_entry',
        x: 4120,
        y: 470,
        width: 34,
        height: 140,
        totalSeals: 1,
        initiallyOpen: Boolean(this.worldFlags['sky_bell_rung']),
      })
    );

    this.gates.set(
      'gate_sunken_entry',
      new RunicGate(this, {
        id: 'gate_sunken_entry',
        x: 1360,
        y: 1060,
        width: 36,
        height: 160,
        totalSeals: 2,
        initiallyOpen: Boolean(this.worldFlags['courtyard_unsealed']),
      })
    );

    this.gates.set(
      'gate_sanctum_mid',
      new RunicGate(this, {
        id: 'gate_sanctum_mid',
        x: 2100,
        y: 1084,
        width: 32,
        height: 112,
        totalSeals: 1,
        initiallyOpen: Boolean(this.worldFlags['sanctum_inner_latched']),
      })
    );

    this.gates.set(
      'gate_sanctum_final',
      new RunicGate(this, {
        id: 'gate_sanctum_final',
        x: 2620,
        y: 1060,
        width: 36,
        height: 160,
        totalSeals: 2,
        initiallyOpen: Boolean(this.worldFlags['sanctum_final_unsealed']),
      })
    );

    this.gates.set(
      'gate_threshold',
      new RunicGate(this, {
        id: 'gate_threshold',
        x: 4180,
        y: 1060,
        width: 36,
        height: 160,
        totalSeals: 1,
        initiallyOpen: this.imprintManager.getCurrentId() !== null,
      })
    );

    for (const gate of this.gates.values()) {
      this.physics.add.collider(this.player.sprite, gate.collider);
    }

    // 4. Fractured Slabs (destructible via Grounded State Ground Impact)
    const slabCrucible = new FracturedSlab(this, {
      id: 'slab_crucible',
      x: 4650,
      y: 554,
      width: 160,
      height: 28,
      initiallyBroken: Boolean(this.worldFlags['slab_crucible_broken']),
      onShatter: () => {
        this.worldFlags['slab_crucible_broken'] = true;
        this.questManager.completeObjective('q_changed_world', 'obj_shatter_crucible');
        this.hud.showToast(
          'The fractured Crucible floor gives way beneath your anchored Weight!',
          'gold'
        );
        this.saveCheckpoint('crucible_descent');
      },
    });
    this.slabs.set('slab_crucible', slabCrucible);

    const slabSanctum = new FracturedSlab(this, {
      id: 'slab_sanctum',
      x: 1938,
      y: 1016,
      width: 160,
      height: 24,
      initiallyBroken: Boolean(this.worldFlags['slab_sanctum_broken']),
      onShatter: () => {
        this.worldFlags['slab_sanctum_broken'] = true;
        this.hud.showToast('The calcified sanctum vault shatters open!', 'gold');
        this.saveCheckpoint('sanctum_vault');
      },
    });
    this.slabs.set('slab_sanctum', slabSanctum);

    for (const slab of this.slabs.values()) {
      this.physics.add.collider(
        this.player.sprite,
        slab.collider,
        undefined,
        () => {
          if (this.player.isPerformingGroundImpact() && this.player.sprite.y <= slab.collider.y) {
            AudioManager.getInstance().playGroundImpact();
            slab.shatter(false);
            return false;
          }
          return true;
        }
      );
    }

    this.player.setOnGroundImpact((ix, iy) => {
      for (const slab of this.slabs.values()) {
        slab.tryImpactAt(ix, iy);
      }
    });

    // 5. Heavy Pushable Blocks
    const blockCourtyard = new HeavyBlock(
      this,
      this.worldFlags['courtyard_unsealed'] ? 880 : 735,
      816,
      645,
      955
    );
    blockCourtyard.syncWeightCapability(hasWeight);
    this.blocks.set('block_courtyard', blockCourtyard);

    const blockSanctum = new HeavyBlock(
      this,
      this.worldFlags['sanctum_final_unsealed'] ? 2460 : 2235,
      1116,
      2150,
      2535
    );
    blockSanctum.syncWeightCapability(hasWeight);
    this.blocks.set('block_sanctum', blockSanctum);

    for (const block of this.blocks.values()) {
      this.physics.add.collider(block.sprite, this.platformsGroup);
      this.physics.add.collider(this.player.sprite, block.sprite, () => {
        if (!this.remnantManager.hasWeight() && this.blockTouchToastCooldownMs <= 0) {
          this.blockTouchToastCooldownMs = 3600;
          this.hud.showToast(
            'Your unanchored garment brushes against the runic granite without force.',
            'cyan'
          );
        }
      });
    }

    // 6. Pressure Plates
    this.plates.set(
      'plate_courtyard_a',
      new PressurePlate(this, {
        id: 'plate_courtyard_a',
        x: 880,
        y: 840,
        latch: false,
        initiallyDepressed: Boolean(this.worldFlags['courtyard_unsealed']),
        onWeightlessTouch: () => {
          this.hud.showToast('The ancient plinth does not yield. Your garment carries no mass.', 'cyan');
        },
        onStateChange: () => this.evaluateGateSeals(),
      })
    );

    this.plates.set(
      'plate_courtyard_b',
      new PressurePlate(this, {
        id: 'plate_courtyard_b',
        x: 1035,
        y: 840,
        latch: false,
        initiallyDepressed: Boolean(this.worldFlags['courtyard_unsealed']),
        onWeightlessTouch: () => {
          this.hud.showToast('The counterweight ignores your unanchored presence.', 'cyan');
        },
        onStateChange: () => this.evaluateGateSeals(),
      })
    );

    this.plates.set(
      'plate_sanctum_inner',
      new PressurePlate(this, {
        id: 'plate_sanctum_inner',
        x: 1938,
        y: 1140,
        latch: true,
        initiallyDepressed: Boolean(this.worldFlags['sanctum_inner_latched']),
        onStateChange: (depressed) => {
          if (depressed) {
            this.worldFlags['sanctum_inner_latched'] = true;
          }
          this.evaluateGateSeals();
        },
      })
    );

    this.plates.set(
      'plate_sanctum_gate',
      new PressurePlate(this, {
        id: 'plate_sanctum_gate',
        x: 2460,
        y: 1140,
        latch: false,
        initiallyDepressed: Boolean(this.worldFlags['sanctum_final_unsealed']),
        onStateChange: () => this.evaluateGateSeals(),
      })
    );

    // 7. NPCs & World Interactables
    const oren = new NPC(this, 1660, 514, 'oren');
    this.npcs.set('oren', oren);

    const vespera = new NPC(this, 3680, 1114, 'vespera');
    vespera.setImprintState(this.imprintManager.getCurrentId());
    this.npcs.set('vespera', vespera);

    this.registerInteractables();
    this.evaluateGateSeals(true);
  }

  private registerInteractables(): void {
    // Oren NPC
    this.interactables.push(
      new Interactable(this, {
        id: 'npc_oren',
        x: 1660,
        y: 514,
        radius: 78,
        kind: 'npc',
        getPrompt: () => 'Converse with Oren',
        onInteract: () => this.openDialogue('npc_oren'),
      })
    );

    // Echoes of Substance Stage 1: Surveyor Stele in Zone 2 Observatory
    this.interactables.push(
      new Interactable(this, {
        id: 'survey_stele',
        x: 1875,
        y: 514,
        radius: 72,
        kind: 'survey_stele',
        isActivated: () => Boolean(this.worldFlags['survey_inspected']),
        getPrompt: () =>
          this.worldFlags['survey_inspected']
            ? 'Review Crucible Surveyor Diagram'
            : 'Inspect Surveyor Stele',
        onInteract: () => {
          const first = !this.worldFlags['survey_inspected'];
          this.worldFlags['survey_inspected'] = true;
          AudioManager.getInstance().playConduitAttune();
          if (this.questManager.getStatus('q_echoes_of_substance') === 'NOT_STARTED') {
            this.questManager.startQuest('q_echoes_of_substance');
          }
          this.questManager.completeObjective('q_echoes_of_substance', 'obj_inspect_survey');
          this.hud.showToast(
            'Surveyor Diagram: "Two Wind-Spire Conduits open the Sky-Arch; the Aerial Bell opens the Dome; three interior Locks uncage Weight."',
            'gold',
            5200
          );
          if (first) {
            this.saveCheckpoint('survey_stele');
          }
        },
      })
    );

    // Echoes of Substance Stage 2a: North Spire Conduit
    this.interactables.push(
      new Interactable(this, {
        id: 'conduit_north',
        x: 2130,
        y: 274,
        kind: 'conduit',
        isActivated: () => Boolean(this.worldFlags['conduit_north']),
        getPrompt: () =>
          this.worldFlags['conduit_north'] ? null : 'Attune North Spire Conduit',
        onInteract: () => {
          if (this.worldFlags['conduit_north']) return;
          this.worldFlags['conduit_north'] = true;
          AudioManager.getInstance().playConduitAttune();
          this.questManager.completeObjective('q_echoes_of_substance', 'obj_conduit_north');
          this.evaluateGateSeals();
          this.hud.showToast('North Wind-Spire Conduit attuned.', 'cyan');
          this.saveCheckpoint('conduit_north');
        },
      })
    );

    // Wind Vane Switch
    this.interactables.push(
      new Interactable(this, {
        id: 'vane_east',
        x: 2540,
        y: 526,
        kind: 'vane',
        isActivated: () => Boolean(this.worldFlags['vane_east_active']),
        getPrompt: () =>
          this.worldFlags['vane_east_active']
            ? 'Wind Vane Aligned Skyward'
            : 'Turn Ancient Wind Vane',
        onInteract: () => {
          if (!this.worldFlags['vane_east_active']) {
            this.worldFlags['vane_east_active'] = true;
            this.updrafts.get('updraft_east_balcony')?.setEnabled(true);
            AudioManager.getInstance().playMechanismActivate();
            this.hud.showToast(
              'A vertical thermal surges upward toward the East Balcony!',
              'cyan'
            );
          } else {
            this.hud.showToast('The wind vane already channels the eastern thermal.', 'cyan');
          }
        },
      })
    );

    // Echoes of Substance Stage 2b: East Balcony Conduit
    this.interactables.push(
      new Interactable(this, {
        id: 'conduit_east',
        x: 2950,
        y: 334,
        kind: 'conduit',
        isActivated: () => Boolean(this.worldFlags['conduit_east']),
        getPrompt: () =>
          this.worldFlags['conduit_east'] ? null : 'Attune East Balcony Conduit',
        onInteract: () => {
          if (this.worldFlags['conduit_east']) return;
          this.worldFlags['conduit_east'] = true;
          AudioManager.getInstance().playConduitAttune();
          this.questManager.completeObjective('q_echoes_of_substance', 'obj_conduit_east');
          this.evaluateGateSeals();
          this.hud.showToast('East Balcony Conduit attuned.', 'cyan');
          this.saveCheckpoint('conduit_east');
        },
      })
    );

    // Echoes of Substance Stage 3: Shattered Sky-Arch Aerial Resonance Bell
    this.interactables.push(
      new Interactable(this, {
        id: 'sky_bell',
        x: 3760,
        y: 304,
        radius: 76,
        kind: 'sky_bell',
        isActivated: () => Boolean(this.worldFlags['sky_bell_rung']),
        getPrompt: () =>
          this.worldFlags['sky_bell_rung'] ? null : 'Ring Aerial Resonance Bell',
        onInteract: () => {
          if (this.worldFlags['sky_bell_rung']) return;
          this.worldFlags['sky_bell_rung'] = true;
          AudioManager.getInstance().playQuestChime();
          this.cameras.main.shake(180, 0.004);
          this.questManager.completeObjective('q_echoes_of_substance', 'obj_sky_arch_bell');
          this.evaluateGateSeals();
          this.hud.showToast(
            'The Aerial Resonance Bell rings across the clouds! The Crucible Entry Gate opens ahead.',
            'gold',
            4200
          );
          this.saveCheckpoint('sky_bell_rung');
        },
      })
    );

    // Echoes of Substance Stage 4: Three Crucible Dome Stabilization Locks
    const crucibleLocks: Array<{ id: string; flag: string; label: string; x: number; y: number }> =
      [
        {
          id: 'crucible_lock_west',
          flag: 'crucible_lock_west',
          label: 'Release West Anchor Lever',
          x: 4255,
          y: 406,
        },
        {
          id: 'crucible_lock_east',
          flag: 'crucible_lock_east',
          label: 'Align East Harmonic Dial',
          x: 4795,
          y: 406,
        },
        {
          id: 'crucible_lock_zenith',
          flag: 'crucible_lock_zenith',
          label: 'Unseal Zenith Cupola Keystone',
          x: 4480,
          y: 238,
        },
      ];

    for (const lock of crucibleLocks) {
      this.interactables.push(
        new Interactable(this, {
          id: lock.id,
          x: lock.x,
          y: lock.y,
          radius: 72,
          kind: 'crucible_lock',
          isActivated: () => Boolean(this.worldFlags[lock.flag]),
          getPrompt: () => (this.worldFlags[lock.flag] ? null : lock.label),
          onInteract: () => {
            if (this.worldFlags[lock.flag]) return;
            this.worldFlags[lock.flag] = true;
            AudioManager.getInstance().playMechanismActivate();

            const count = this.getCrucibleLocksReleasedCount();
            if (
              this.worldFlags['crucible_lock_west'] &&
              this.worldFlags['crucible_lock_east'] &&
              !this.updrafts.get('updraft_crucible_dome')?.isEnabled()
            ) {
              this.updrafts.get('updraft_crucible_dome')?.setEnabled(true);
              this.hud.showToast(
                `Crucible Seal ${count} / 3 released! The central dome thermal ignites toward the Zenith Cupola.`,
                'cyan',
                4200
              );
            } else if (count >= 3) {
              this.worldFlags['crucible_unsealed'] = true;
              this.questManager.completeObjective('q_echoes_of_substance', 'obj_crucible_locks');
              this.cameras.main.shake(220, 0.006);
              this.hud.showToast(
                'All three Stabilization Locks released! The Remnant of Weight is uncaged below.',
                'gold',
                4400
              );
            } else {
              this.hud.showToast(
                `Crucible Stabilization Seal released (${count} / 3).`,
                'gold',
                3000
              );
            }
            this.saveCheckpoint(lock.id);
          },
        })
      );
    }

    // Echoes of Substance Stage 5: The Remnant of Weight (locked until all 3 Crucible seals release)
    this.interactables.push(
      new Interactable(this, {
        id: 'remnant_weight',
        x: 4480,
        y: 514,
        radius: 76,
        kind: 'remnant_weight',
        isActivated: () => this.remnantManager.hasWeight(),
        getLockCountRemaining: () => 3 - this.getCrucibleLocksReleasedCount(),
        getPrompt: () => {
          if (this.remnantManager.hasWeight()) return null;
          const remaining = 3 - this.getCrucibleLocksReleasedCount();
          return remaining > 0
            ? `Inspect Sealed Remnant Cage (${remaining} Seals Active)`
            : 'Anchor Garment with Remnant of Weight';
        },
        onInteract: () => {
          if (this.remnantManager.hasWeight()) return;
          const released = this.getCrucibleLocksReleasedCount();
          if (released < 3) {
            AudioManager.getInstance().playDialogueBlip();
            this.hud.showToast(
              `Containment active: release all three Crucible Dome Seals first (${released} / 3 released).`,
              'cyan',
              3800
            );
            return;
          }
          this.confirmModal.open({
            kicker: 'Irreversible Stabilization Rite',
            title: 'ANCHOR THE REMNANT OF WEIGHT?',
            body: 'Anchoring your garment grants physical mass, counterweight force, and Ground Impact, but permanently surrenders Unanchored Drift and wind-current ascent.\n\nElevated sky-alcoves and high Wind-Spire ledges will no longer be reachable by wind (though Grounded Counterweight Lifts will awaken along the lower terraces to revisit them).',
            cancelLabel: 'Step Back (Explore First)',
            confirmLabel: 'Confirm Stabilization',
            onCancel: () => {
              this.syncControlLock();
            },
            onConfirm: () => {
              this.syncControlLock();
              this.triggerWeightRestoration();
            },
          });
          this.syncControlLock();
        },
      })
    );

    // Post-Weight Grounded Counterweight Lifts (allow revisiting elevated Echo Tablets & upper spire fog cells after losing Unanchored Drift)
    const counterweightLifts: Array<{
      id: string;
      x: number;
      y: number;
      radius?: number;
      prompt: string;
      destX: number;
      destY: number;
      toast: string;
      surveyPoints?: Array<[number, number]>;
    }> = [
      {
        id: 'lift_courtyard_alcove',
        x: 1118,
        y: 814,
        radius: 58,
        prompt: 'Engage Counterweight Lift to Sky Alcove',
        destX: 805,
        destY: 610,
        toast: 'Anchored mass engages the ancient pulley, raising you to the Whispering Sky Alcove.',
        surveyPoints: [[760, 614]],
      },
      {
        id: 'lift_observatory_spires',
        x: 1948,
        y: 514,
        radius: 58,
        prompt: 'Engage Spire Counterweight Lift to High Overlook',
        destX: 2606,
        destY: 182,
        toast: 'The observatory counterweight hoists your anchored garment to the High Spire Overlook.',
        surveyPoints: [
          [1720, 260],
          [2130, 274],
          [2560, 186],
          [2950, 334],
          [3230, 280],
        ],
      },
      {
        id: 'lift_peak_sky_arch',
        x: 2616,
        y: 186,
        radius: 52,
        prompt: 'Traverse Counterweight Cable to Sky-Arch Belfry',
        destX: 3818,
        destY: 300,
        toast: 'The counterweight carriage glides across the upper thermals to the Shattered Sky-Arch.',
        surveyPoints: [
          [3470, 310],
          [3760, 304],
          [4020, 310],
        ],
      },
      {
        id: 'lift_belfry_return',
        x: 3822,
        y: 304,
        radius: 54,
        prompt: 'Descend Counterweight Lift to Observatory',
        destX: 1948,
        destY: 510,
        toast: 'The counterweight cradle lowers you gently back to Oren’s Observatory.',
      },
    ];

    for (const lift of counterweightLifts) {
      this.interactables.push(
        new Interactable(this, {
          id: lift.id,
          x: lift.x,
          y: lift.y,
          radius: lift.radius ?? 56,
          kind: 'waystone_lift',
          isActivated: () => this.remnantManager.hasWeight(),
          getPrompt: () => (this.remnantManager.hasWeight() ? lift.prompt : null),
          onInteract: () => {
            if (!this.remnantManager.hasWeight()) return;
            this.useCounterweightLift(lift.destX, lift.destY, lift.toast, lift.surveyPoints);
          },
        })
      );
    }

    // Optional Hidden Quest (hq_silent_loom): Clue 1 behind Western Precipice
    this.interactables.push(
      new Interactable(this, {
        id: 'clue_loom_1',
        x: 58,
        y: 814,
        radius: 68,
        kind: 'loom_clue',
        isActivated: () => Boolean(this.worldFlags['loom_clue_1']),
        getPrompt: () =>
          this.worldFlags['loom_clue_1'] ? null : 'Examine Frayed Gold Spool',
        onInteract: () => {
          if (this.worldFlags['loom_clue_1']) return;
          this.worldFlags['loom_clue_1'] = true;
          this.soulAffinities.silver += 1;
          AudioManager.getInstance().playConduitAttune();
          this.questManager.completeObjective('hq_silent_loom', 'obj_loom_thread');
          this.hud.showToast(
            'Recovered Frayed Gold Spool: metallic thread identical to the kintsugi seams of your garment.',
            'gold',
            4400
          );
          this.saveCheckpoint('loom_clue_1');
        },
      })
    );

    // Optional Hidden Quest (hq_silent_loom): Clue 2 in Echoing Underwalk
    this.interactables.push(
      new Interactable(this, {
        id: 'clue_loom_2',
        x: 3480,
        y: 696,
        radius: 68,
        kind: 'loom_clue',
        isActivated: () => Boolean(this.worldFlags['loom_clue_2']),
        getPrompt: () =>
          this.worldFlags['loom_clue_2'] ? null : 'Examine Astral Weaver Spindle',
        onInteract: () => {
          if (this.worldFlags['loom_clue_2']) return;
          this.worldFlags['loom_clue_2'] = true;
          this.soulAffinities.silver += 1;
          AudioManager.getInstance().playConduitAttune();
          this.questManager.completeObjective('hq_silent_loom', 'obj_loom_spindle');
          this.hud.showToast(
            'Recovered Astral Weaver Spindle: its notch resonates toward a sealed coffer beneath the Verge.',
            'gold',
            4400
          );
          this.saveCheckpoint('loom_clue_2');
        },
      })
    );

    // Optional Hidden Quest (hq_silent_loom): Sealed Reliquary Loom in Sunken Sanctum
    this.interactables.push(
      new Interactable(this, {
        id: 'reliquary_loom',
        x: 2960,
        y: 1114,
        radius: 74,
        kind: 'loom_reliquary',
        isActivated: () => Boolean(this.worldFlags['loom_reliquary_opened']),
        getPrompt: () => {
          if (this.worldFlags['loom_reliquary_opened']) return 'Inspect Opened Weaver Reliquary';
          const ready =
            Boolean(this.worldFlags['loom_clue_1']) && Boolean(this.worldFlags['loom_clue_2']);
          return ready ? 'Unseal Reliquary Loom with Weaver Tools' : 'Inspect Sealed Reliquary Loom';
        },
        onInteract: () => {
          if (this.worldFlags['loom_reliquary_opened']) {
            this.hud.showToast(
              'An inscription inside reads: "For the unbodied traveller, until the outer mist parts."',
              'gold',
              4000
            );
            return;
          }
          const hasBoth =
            Boolean(this.worldFlags['loom_clue_1']) && Boolean(this.worldFlags['loom_clue_2']);
          if (!hasBoth) {
            this.questManager.startQuest('hq_silent_loom');
            AudioManager.getInstance().playDialogueBlip();
            this.hud.showToast(
              'Two recesses await missing weaver relics: a gold spool from a high western cliff, and a spindle from the underwalk.',
              'cyan',
              4600
            );
            return;
          }

          this.worldFlags['loom_reliquary_opened'] = true;
          this.relics.add('relic_compass_lens');
          if (this.adventurerRank === 'G') {
            this.adventurerRank = 'F';
          }
          this.soulAffinities.silver += 2;
          AudioManager.getInstance().playQuestChime();
          this.questManager.completeObjective('hq_silent_loom', 'obj_loom_reliquary');
          this.events.emit(GAME_EVENTS.RELIC_ACQUIRED, RELIC_DEFINITIONS.relic_compass_lens);
          this.explorationManager.updatePlayerPosition(
            this.player.sprite.x,
            this.player.sprite.y,
            this.getMapRevealRadius()
          );
          this.hud.refresh();
          this.saveCheckpoint('reliquary_loom_unsealed');
        },
      })
    );

    // Block Reset Pedestals (anti-softlock safeguard)
    this.interactables.push(
      new Interactable(this, {
        id: 'reset_courtyard_block',
        x: 625,
        y: 814,
        radius: 54,
        kind: 'reset_rune',
        getPrompt: () =>
          this.remnantManager.hasWeight() && !this.worldFlags['courtyard_unsealed']
            ? 'Reset Runic Monolith'
            : null,
        onInteract: () => {
          if (!this.remnantManager.hasWeight()) return;
          this.blocks.get('block_courtyard')?.resetToSpawn();
          AudioManager.getInstance().playInteract();
          this.hud.showToast('The granite monolith returns to its socket.', 'gold');
        },
      })
    );

    this.interactables.push(
      new Interactable(this, {
        id: 'reset_sanctum_block',
        x: 2132,
        y: 1114,
        radius: 52,
        kind: 'reset_rune',
        getPrompt: () =>
          this.remnantManager.hasWeight() && !this.worldFlags['sanctum_final_unsealed']
            ? 'Reset Sanctum Monolith'
            : null,
        onInteract: () => {
          if (!this.remnantManager.hasWeight()) return;
          this.blocks.get('block_sanctum')?.resetToSpawn();
          AudioManager.getInstance().playInteract();
          this.hud.showToast('The sanctum monolith returns to its socket.', 'gold');
        },
      })
    );

    // Vespera & the Memory Crucible
    this.interactables.push(
      new Interactable(this, {
        id: 'npc_vespera',
        x: 3680,
        y: 1114,
        radius: 84,
        kind: 'npc',
        getPrompt: () =>
          this.imprintManager.getCurrentId() === 'resolve'
            ? 'Inspect Quiet Crucible'
            : 'Speak with Vespera',
        onInteract: () => this.openDialogue('npc_vespera'),
      })
    );

    // Chapter One Ending Threshold: The Fractured Mirror-Arch
    this.interactables.push(
      new Interactable(this, {
        id: 'ending_arch',
        x: 5060,
        y: 1112,
        radius: 88,
        kind: 'ending_arch',
        getPrompt: () => 'Gaze Into the Fractured Mirror-Arch',
        onInteract: () => this.triggerEndingSequence(),
      })
    );

    // 3 Hidden Echo Lore Tablets
    const echoPlacements = [
      { id: 'echo_first_law', x: 760, y: 614 },
      { id: 'echo_sky_bargain', x: 2560, y: 186 },
      { id: 'echo_sunken_oath', x: 1460, y: 934 },
    ];

    for (const ep of echoPlacements) {
      const def = ECHO_FRAGMENT_DEFINITIONS.find((d) => d.id === ep.id)!;
      this.interactables.push(
        new Interactable(this, {
          id: ep.id,
          x: ep.x,
          y: ep.y,
          radius: 66,
          kind: 'echo',
          isActivated: () => this.discoveredEchoes.has(ep.id),
          getPrompt: () =>
            this.discoveredEchoes.has(ep.id) ? `Re-read ${def.title}` : `Read ${def.title}`,
          onInteract: () => {
            const firstTime = !this.discoveredEchoes.has(ep.id);
            this.discoveredEchoes.add(ep.id);
            AudioManager.getInstance().playConduitAttune();
            this.hud.showToast(`${def.title}: ${def.inscription}`, 'cyan', 5200);
            if (firstTime) {
              this.soulAffinities.azure += 1;
              this.events.emit(GAME_EVENTS.ECHO_DISCOVERED, def);
              this.saveCheckpoint(`echo_${ep.id}`);
            }
          },
        })
      );
    }
  }

  private evaluateGateSeals(silent = false): void {
    // 1. Outer Spire Gate -> Shattered Sky-Arch (North + East Conduits)
    const spireCount =
      (this.worldFlags['conduit_north'] ? 1 : 0) + (this.worldFlags['conduit_east'] ? 1 : 0);
    const spireChanged = this.gates.get('gate_spire_outer')?.setSealProgress(spireCount);
    if (spireChanged && spireCount === 2 && !silent) {
      AudioManager.getInstance().playMechanismActivate();
      this.cameras.main.shake(180, 0.004);
      this.hud.showToast(
        'Both Wind-Spire Conduits resonate! The gate to the Shattered Sky-Arch opens.',
        'gold',
        4200
      );
    }

    // 2. Crucible Entry Gate (opened by Aerial Resonance Bell)
    const bellActive = this.worldFlags['sky_bell_rung'] ? 1 : 0;
    this.gates.get('gate_crucible_entry')?.setSealProgress(bellActive);

    // 3. Courtyard Sunken Entry Gate (latches permanently once both plates are simultaneously active)
    if (this.worldFlags['courtyard_unsealed']) {
      this.gates.get('gate_sunken_entry')?.setSealProgress(2);
    } else {
      const pA = this.plates.get('plate_courtyard_a')?.isDepressed() ? 1 : 0;
      const pB = this.plates.get('plate_courtyard_b')?.isDepressed() ? 1 : 0;
      const total = pA + pB;
      if (total === 2) {
        this.worldFlags['courtyard_unsealed'] = true;
        this.gates.get('gate_sunken_entry')?.setSealProgress(2);
        this.questManager.completeObjective('q_changed_world', 'obj_unseal_courtyard');
        if (!silent) {
          this.cameras.main.shake(240, 0.006);
          this.hud.showToast(
            'Counterweights engaged! Beneath the chasm, the Sunken Causeway unseals.',
            'gold',
            4400
          );
          this.saveCheckpoint('courtyard_unsealed');
        }
      } else {
        this.gates.get('gate_sunken_entry')?.setSealProgress(total);
      }
    }

    // 4. Sanctum Mid Vault Gate
    const innerActive =
      this.worldFlags['sanctum_inner_latched'] ||
      this.plates.get('plate_sanctum_inner')?.isDepressed()
        ? 1
        : 0;
    this.gates.get('gate_sanctum_mid')?.setSealProgress(innerActive);

    // 5. Sanctum Final Gate (Inner Seal + Heavy Block Gate Plate; latches once both engage)
    if (this.worldFlags['sanctum_final_unsealed']) {
      this.gates.get('gate_sanctum_final')?.setSealProgress(2);
    } else {
      const gatePlate = this.plates.get('plate_sanctum_gate')?.isDepressed() ? 1 : 0;
      const finalCount = innerActive + gatePlate;
      if (finalCount === 2) {
        this.worldFlags['sanctum_final_unsealed'] = true;
        this.gates.get('gate_sanctum_final')?.setSealProgress(2);
        if (!silent) {
          this.cameras.main.shake(220, 0.005);
          this.hud.showToast('The Cradle of First Names opens ahead.', 'gold', 3800);
          this.saveCheckpoint('sanctum_final_open');
        }
      } else {
        this.gates.get('gate_sanctum_final')?.setSealProgress(finalCount);
      }
    }

    // 6. Final Threshold Gate (opens once Vespera choice is made)
    this.gates
      .get('gate_threshold')
      ?.setSealProgress(this.imprintManager.getCurrentId() !== null ? 1 : 0);
  }

  private buildUI(): void {
    this.hud = new HUD(
      this,
      this.questManager,
      this.remnantManager,
      this.explorationManager,
      this.imprintManager.getCurrent(),
      () => ({
        playerName: this.playerName,
        adventurerRank: this.adventurerRank,
        relicCount: this.relics.size,
      })
    );

    this.dialogueBox = new DialogueBox(this, this.dialogueManager);
    this.restorationOverlay = new RestorationOverlay(this);

    this.worldMap = new WorldMap(this, this.explorationManager, () => ({
      x: this.player.sprite.x,
      y: this.player.sprite.y,
      name: this.playerName,
      rank: this.adventurerRank,
      hasCompassRelic: this.relics.has('relic_compass_lens'),
    }));

    this.journal = new Journal(
      this,
      this.questManager,
      this.remnantManager,
      this.imprintManager,
      this.explorationManager,
      () => ({
        playerName: this.playerName,
        adventurerRank: this.adventurerRank,
        discoveredEchoes: Array.from(this.discoveredEchoes),
        relics: Array.from(this.relics),
        soulAffinities: { ...this.soulAffinities },
      }),
      () => {
        this.worldMap.open();
        this.syncControlLock();
      }
    );

    this.pauseMenu = new PauseMenu(this, {
      onResume: () => {
        this.pauseMenu.close();
        this.syncControlLock();
      },
      onOpenAtlas: () => {
        this.pauseMenu.close();
        this.worldMap.open();
        this.syncControlLock();
      },
      onOpenJournal: () => {
        this.pauseMenu.close();
        this.journal.open();
        this.syncControlLock();
      },
      onAudioToggled: () => {
        this.hud.refresh();
      },
      onAtmosphereToggled: () => {
        const s = this.lightingController.getSettings();
        this.lightingController.setAtmosphereMode(s.atmosphereMode, s.fixedPhase);
      },
      onRestart: () => {
        this.pauseMenu.close();
        this.confirmModal.open({
          kicker: 'Erase Saved Progress',
          title: 'RESTART CHAPTER ONE?',
          body: 'Restarting Chapter One will permanently delete your saved progress and return your garment to the Awakening Precipice.\n\nChoose Cancel to preserve all current progress.',
          cancelLabel: 'Cancel (Keep Save)',
          confirmLabel: 'Confirm Restart',
          onCancel: () => {
            this.pauseMenu.open();
            this.syncControlLock();
          },
          onConfirm: () => {
            SaveManager.clear();
            this.scene.restart({ loadSaved: false, playerName: this.playerName });
          },
        });
        this.syncControlLock();
      },
      onMainMenu: () => {
        this.pauseMenu.close();
        this.cameras.main.fadeOut(450, 7, 9, 19);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start(SCENE_KEYS.MENU);
        });
      },
    });

    this.confirmModal = new ConfirmModal(this);
  }

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keySpace = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyE = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyEnter = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.keyJ = kb.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.keyH = kb.addKey(Phaser.Input.Keyboard.KeyCodes.H);
    this.keyV = kb.addKey(Phaser.Input.Keyboard.KeyCodes.V);
    this.keyTab = kb.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
    this.keyM = kb.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.keyEsc = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.keyOne = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.keyTwo = kb.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
  }

  private setupCameras(): void {
    const cam = this.cameras.main;
    cam.setZoom(WORLD_CAMERA_ZOOM);
    cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    cam.startFollow(this.player.sprite, true, 0.09, 0.09, 0, 22);

    // Dedicated 1:1 Full HD UI Camera so HUD, Journal, Dialogue & Atlas stay razor-sharp
    this.uiCamera = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT, false, 'UICamera');
    this.uiCamera.setScroll(0, 0);
    this.uiCamera.setZoom(1);

    const uiRoots = [
      this.vignetteImage,
      ...this.hud.getRootObjects(),
      ...this.dialogueBox.getRootObjects(),
      ...this.restorationOverlay.getRootObjects(),
      ...this.journal.getRootObjects(),
      ...this.worldMap.getRootObjects(),
      ...this.pauseMenu.getRootObjects(),
      ...this.confirmModal.getRootObjects(),
    ];
    for (const obj of uiRoots) {
      this.uiObjects.add(obj);
    }

    cam.ignore(uiRoots);
    this.syncUiCameraIgnores();
  }

  private syncUiCameraIgnores(): void {
    if (!this.uiCamera) return;
    const list = this.children.list;
    for (let i = 0; i < list.length; i++) {
      const child = list[i];
      if (!this.uiObjects.has(child) && !this.uiIgnoredObjects.has(child)) {
        this.uiCamera.ignore(child);
        this.uiIgnoredObjects.add(child);
      }
    }
  }

  private openDialogue(treeId: string): void {
    if (this.dialogueBox.isVisible() || this.isRestoringSequence || this.isEndingSequence) return;

    const node = this.dialogueManager.start(treeId, {
      playerName: this.playerName,
      hasWeight: this.remnantManager.hasWeight(),
      imprint: this.imprintManager.getCurrentId(),
      flags: this.worldFlags,
      triggerAction: (actionId) => this.handleDialogueAction(actionId),
    });

    if (node) {
      this.player.triggerInteractAnim();
      this.dialogueBox.open(() => {
        this.syncControlLock();
      });
      this.syncControlLock();
    }
  }

  private handleDialogueAction(actionId: string): void {
    switch (actionId) {
      case 'met_oren':
        this.worldFlags['met_oren'] = true;
        this.questManager.completeObjective('q_awakening_verge', 'obj_cross_chasm');
        this.questManager.completeObjective('q_awakening_verge', 'obj_speak_oren');
        break;

      case 'start_echoes_quest':
        this.questManager.startQuest('q_echoes_of_substance');
        this.saveCheckpoint('met_oren');
        break;

      case 'met_vespera':
        this.worldFlags['met_vespera'] = true;
        break;

      case 'choose_imprint_resonance':
        if (this.imprintManager.acquire('resonance')) {
          this.soulAffinities.verdant += 2;
          this.soulAffinities.azure += 1;
          this.player.setImprint('resonance');
          this.npcs.get('vespera')?.setImprintState('resonance');
          this.questManager.completeObjective('q_changed_world', 'obj_meet_vespera');
          this.evaluateGateSeals();
          this.saveCheckpoint('imprint_resonance');
        }
        break;

      case 'choose_imprint_resolve':
        if (this.imprintManager.acquire('resolve')) {
          this.soulAffinities.crimson += 2;
          this.soulAffinities.violet += 1;
          this.player.setImprint('resolve');
          this.npcs.get('vespera')?.setImprintState('resolve');
          this.questManager.completeObjective('q_changed_world', 'obj_meet_vespera');
          this.evaluateGateSeals();
          this.saveCheckpoint('imprint_resolve');
        }
        break;
    }
  }

  /**
   * Executes the Crucible of Mass Remnant of Weight stabilization rite once all 3 locks are unsealed.
   */
  private triggerWeightRestoration(): void {
    if (this.remnantManager.hasWeight() || this.isRestoringSequence) return;
    if (this.getCrucibleLocksReleasedCount() < 3) return;

    this.isRestoringSequence = true;
    this.syncControlLock();

    AudioManager.getInstance().playRestorationSequence();
    this.cameras.main.zoomTo(WORLD_CAMERA_ZOOM * 1.18, 1800, 'Sine.easeInOut');

    const progressHolder = { t: 0 };
    this.tweens.add({
      targets: progressHolder,
      t: 1,
      duration: 2150,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.player.setRestoringVisual(true, progressHolder.t);
      },
      onComplete: () => {
        this.player.setRestoringVisual(false);
        this.remnantManager.restore('weight');
        this.player.applyWeightRestoration(true);
        this.soulAffinities.amber += 2;
        if (this.adventurerRank === 'G') {
          this.adventurerRank = 'F';
        }

        for (const block of this.blocks.values()) {
          block.syncWeightCapability(true);
        }

        this.cameras.main.flash(380, 232, 169, 72);
        this.cameras.main.shake(280, 0.009);
        this.cameras.main.zoomTo(WORLD_CAMERA_ZOOM, 800, 'Sine.easeOut');

        // Ensure all Echoes of Substance stages record completion cleanly
        this.questManager.completeObjective('q_echoes_of_substance', 'obj_inspect_survey');
        this.questManager.completeObjective('q_echoes_of_substance', 'obj_conduit_north');
        this.questManager.completeObjective('q_echoes_of_substance', 'obj_conduit_east');
        this.questManager.completeObjective('q_echoes_of_substance', 'obj_sky_arch_bell');
        this.questManager.completeObjective('q_echoes_of_substance', 'obj_crucible_locks');
        this.questManager.completeObjective('q_echoes_of_substance', 'obj_claim_weight');

        this.hud.refresh();
        this.saveCheckpoint('weight_restored');

        this.time.delayedCall(520, () => {
          this.isRestoringSequence = false;
          this.restorationOverlay.show(REMNANT_DEFINITIONS.weight, () => {
            this.syncControlLock();
          });
          this.syncControlLock();
        });
      },
    });
  }

  private triggerEndingSequence(): void {
    if (this.isEndingSequence) return;
    this.isEndingSequence = true;
    this.syncControlLock();

    this.questManager.completeObjective('q_changed_world', 'obj_cross_threshold');
    this.saveCheckpoint('chapter_one_complete');
    AudioManager.getInstance().playConduitAttune();
    this.cameras.main.zoomTo(WORLD_CAMERA_ZOOM * 1.15, 1600, 'Sine.easeInOut');
    this.hud.showToast(
      '"Look upon the chains within the mirror: they were struck open from the inside."',
      'gold',
      3100
    );

    this.time.delayedCall(2300, () => {
      this.cameras.main.fadeOut(900, 7, 9, 19);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start(SCENE_KEYS.ENDING, {
          playerName: this.playerName,
          adventurerRank: this.adventurerRank,
          imprint: this.imprintManager.getCurrentId(),
          echoCount: this.discoveredEchoes.size,
          regionExplorationPct: this.explorationManager.getRegionExplorationPercent(),
          worldExplorationPct: this.explorationManager.getWorldExplorationPercent(),
          relicCount: this.relics.size,
        });
      });
    });
  }

  private syncControlLock(): void {
    const locked =
      this.isRestoringSequence ||
      this.isEndingSequence ||
      this.dialogueBox.isVisible() ||
      this.restorationOverlay.isOpen() ||
      this.journal.isOpen() ||
      this.worldMap.isOpen() ||
      this.pauseMenu.isOpen() ||
      this.confirmModal.isOpen();
    this.player.setControlsLocked(locked);
  }

  private saveCheckpoint(checkpointId: string): void {
    SaveManager.save({
      playerName: this.playerName,
      adventurerRank: this.adventurerRank,
      chapter: this.currentChapter,
      chapterTitle: this.currentChapterTitle,
      checkpointId,
      playerX: Math.round(this.player.sprite.x),
      playerY: Math.round(this.player.sprite.y),
      restoredRemnants: this.remnantManager.getAllRestored(),
      imprint: this.imprintManager.getCurrentId(),
      discoveredEchoes: Array.from(this.discoveredEchoes),
      discoveredCells: this.explorationManager.getDiscoveredCells(),
      discoveredLocations: this.explorationManager.getDiscoveredLocations(),
      relics: Array.from(this.relics),
      soulAffinities: { ...this.soulAffinities },
      worldFlags: { ...this.worldFlags },
      questStates: this.questManager.serialize(),
    });
  }

  public update(time: number, delta: number): void {
    if (this.blockTouchToastCooldownMs > 0) {
      this.blockTouchToastCooldownMs -= delta;
    }

    const cam = this.cameras.main;

    if (this.environmentRenderer.isLegacyMode()) {
      const t = time * 0.001;
      if (this.parallaxFar) this.parallaxFar.tilePositionX = cam.scrollX * 0.12;
      if (this.parallaxMid) this.parallaxMid.tilePositionX = cam.scrollX * 0.27;
      if (this.parallaxNear) this.parallaxNear.tilePositionX = cam.scrollX * 0.48;

      for (let i = 0; i < this.mistBands.length; i++) {
        const mb = this.mistBands[i];
        mb.sprite.x = mb.baseX + Math.sin(t * mb.speed + i * 1.4) * mb.amp;
      }

      this.renderAnimatedWorldProps(time);
    } else {
      this.environmentRenderer.update(time, delta, cam);
    }

    this.lightingController.update(time, delta);

    // Global audio toggle
    if (Phaser.Input.Keyboard.JustDown(this.keyM)) {
      AudioManager.getInstance().toggleMute();
      this.hud.refresh();
    }

    // Handle modal / overlay inputs in priority order
    if (this.confirmModal.isOpen()) {
      if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
        this.confirmModal.cancel();
      } else if (
        Phaser.Input.Keyboard.JustDown(this.cursors.left) ||
        Phaser.Input.Keyboard.JustDown(this.keyA) ||
        Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
        Phaser.Input.Keyboard.JustDown(this.keyW)
      ) {
        this.confirmModal.moveSelection(-1);
      } else if (
        Phaser.Input.Keyboard.JustDown(this.cursors.right) ||
        Phaser.Input.Keyboard.JustDown(this.keyD) ||
        Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
        Phaser.Input.Keyboard.JustDown(this.keyS)
      ) {
        this.confirmModal.moveSelection(1);
      } else if (
        Phaser.Input.Keyboard.JustDown(this.keySpace) ||
        Phaser.Input.Keyboard.JustDown(this.keyEnter) ||
        Phaser.Input.Keyboard.JustDown(this.keyE)
      ) {
        this.confirmModal.confirmSelection();
      }
    } else if (this.restorationOverlay.isOpen()) {
      if (
        Phaser.Input.Keyboard.JustDown(this.keySpace) ||
        Phaser.Input.Keyboard.JustDown(this.keyE) ||
        Phaser.Input.Keyboard.JustDown(this.keyEnter)
      ) {
        this.restorationOverlay.dismiss();
      }
    } else if (this.pauseMenu.isOpen()) {
      if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
        this.pauseMenu.close();
        this.syncControlLock();
      } else if (
        Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
        Phaser.Input.Keyboard.JustDown(this.keyW)
      ) {
        this.pauseMenu.moveSelection(-1);
      } else if (
        Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
        Phaser.Input.Keyboard.JustDown(this.keyS)
      ) {
        this.pauseMenu.moveSelection(1);
      } else if (
        Phaser.Input.Keyboard.JustDown(this.keySpace) ||
        Phaser.Input.Keyboard.JustDown(this.keyEnter) ||
        Phaser.Input.Keyboard.JustDown(this.keyE)
      ) {
        this.pauseMenu.confirm();
      }
    } else if (this.worldMap.isOpen()) {
      this.worldMap.update(time);
      if (
        Phaser.Input.Keyboard.JustDown(this.keyTab) ||
        Phaser.Input.Keyboard.JustDown(this.keyEsc)
      ) {
        this.worldMap.close();
        this.syncControlLock();
      } else if (Phaser.Input.Keyboard.JustDown(this.keyV)) {
        this.worldMap.switchViewMode();
      } else if (Phaser.Input.Keyboard.JustDown(this.keyOne)) {
        this.worldMap.switchViewMode('regional');
      } else if (Phaser.Input.Keyboard.JustDown(this.keyTwo)) {
        this.worldMap.switchViewMode('world');
      }
    } else if (this.journal.isOpen()) {
      if (
        Phaser.Input.Keyboard.JustDown(this.keyJ) ||
        Phaser.Input.Keyboard.JustDown(this.keyEsc)
      ) {
        this.journal.close();
        this.syncControlLock();
      } else if (Phaser.Input.Keyboard.JustDown(this.keyH)) {
        this.journal.toggleHints();
      } else if (Phaser.Input.Keyboard.JustDown(this.keyTab)) {
        this.journal.close();
        this.worldMap.open();
        this.syncControlLock();
      }
    } else if (this.dialogueBox.isVisible()) {
      this.dialogueBox.update(delta);
      if (
        Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
        Phaser.Input.Keyboard.JustDown(this.keyW)
      ) {
        this.dialogueBox.moveChoiceSelection(-1);
      } else if (
        Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
        Phaser.Input.Keyboard.JustDown(this.keyS)
      ) {
        this.dialogueBox.moveChoiceSelection(1);
      } else if (Phaser.Input.Keyboard.JustDown(this.keyOne)) {
        this.dialogueBox.selectChoiceByNumber(1);
      } else if (Phaser.Input.Keyboard.JustDown(this.keyTwo)) {
        this.dialogueBox.selectChoiceByNumber(2);
      } else if (
        Phaser.Input.Keyboard.JustDown(this.keySpace) ||
        Phaser.Input.Keyboard.JustDown(this.keyE) ||
        Phaser.Input.Keyboard.JustDown(this.keyEnter)
      ) {
        this.dialogueBox.confirmOrAdvance();
      }
    } else if (!this.isRestoringSequence && !this.isEndingSequence) {
      if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
        this.pauseMenu.open();
        this.syncControlLock();
      } else if (Phaser.Input.Keyboard.JustDown(this.keyTab)) {
        this.worldMap.open();
        this.syncControlLock();
      } else if (Phaser.Input.Keyboard.JustDown(this.keyJ)) {
        this.journal.open();
        this.syncControlLock();
      } else if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
        const nearest = this.findNearestActiveInteractable();
        if (nearest) {
          AudioManager.getInstance().playInteract();
          this.player.triggerInteractAnim();
          nearest.config.onInteract();
        }
      }
    }

    // Check Wind Updraft overlap for Player
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;
    let insideAnyUpdraft = false;
    for (const updraft of this.updrafts.values()) {
      updraft.update(time);
      if (updraft.contains(px, py)) {
        insideAnyUpdraft = true;
      }
    }
    this.player.setInUpdraft(insideAnyUpdraft);

    // Update Player physics & animation
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.keySpace);
    const downHeldOrTapped =
      this.cursors.down.isDown ||
      this.keyS.isDown ||
      Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
      Phaser.Input.Keyboard.JustDown(this.keyS);

    this.player.update(time, delta, {
      left: this.cursors.left.isDown || this.keyA.isDown,
      right: this.cursors.right.isDown || this.keyD.isDown,
      down: downHeldOrTapped,
      jumpJustPressed: jumpPressed,
      jumpHeld: this.keySpace.isDown,
      jumpJustReleased: Phaser.Input.Keyboard.JustUp(this.keySpace),
    });

    // Update Exploration fog-of-war & landmark discovery
    const mapUpdated = this.explorationManager.updatePlayerPosition(
      this.player.sprite.x,
      this.player.sprite.y,
      this.getMapRevealRadius()
    );
    if (mapUpdated) {
      this.hud.refresh();
    }

    // Immortal abyss reformation if fallen below world floor
    if (this.player.sprite.y > WORLD_HEIGHT - 28) {
      this.player.respawnAtLastSafe();
      this.hud.showToast('Death cannot claim an unbodied presence.', 'cyan', 2600);
    }

    // Quest objective auto-detection for crossing the Zone 1 Updraft Chasm
    if (this.player.sprite.x > 1475 && this.player.sprite.y < 590) {
      this.questManager.completeObjective('q_awakening_verge', 'obj_cross_chasm');
    }

    this.checkChapterZones();

    // Update world objects
    const hasWeight = this.remnantManager.hasWeight();
    const blockList = Array.from(this.blocks.values());
    for (const block of blockList) {
      block.update(hasWeight);
    }
    for (const plate of this.plates.values()) {
      plate.evaluate(delta, this.player.sprite.x, this.player.sprite.y + 26, hasWeight, blockList);
    }
    for (const slab of this.slabs.values()) {
      slab.update(time);
    }
    for (const gate of this.gates.values()) {
      gate.update(delta);
    }
    for (const npc of this.npcs.values()) {
      npc.update(time);
    }

    // Update proximity interactables & Wayfarer's Compass-Lens resonance
    this.updateCompassLensProximity(time);
    const nearest = this.findNearestActiveInteractable();
    for (const inter of this.interactables) {
      inter.setInRange(inter === nearest && !this.player.isControlsLocked());
      inter.update(time);
    }

    this.renderConduitTraces(time);
    this.syncUiCameraIgnores();
  }

  private useCounterweightLift(
    destX: number,
    destY: number,
    toast: string,
    surveyPoints?: Array<[number, number]>
  ): void {
    AudioManager.getInstance().playMechanismActivate();
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    this.player.sprite.setPosition(destX, destY);
    body.setVelocity(0, 0);
    body.setAcceleration(0, 0);
    this.player.recordSafePosition(destX, destY + 4);

    const radius = this.getMapRevealRadius();
    if (surveyPoints) {
      for (const [sx, sy] of surveyPoints) {
        this.explorationManager.updatePlayerPosition(sx, sy, radius);
      }
    }
    this.explorationManager.updatePlayerPosition(destX, destY, radius);
    this.hud.refresh();
    this.hud.showToast(toast, 'gold', 3400);
  }

  private updateCompassLensProximity(time: number): void {
    this.compassGfx.clear();
    const equipped = this.relics.has('relic_compass_lens');
    if (!equipped) {
      if (this.compassSensedIds.length > 0) {
        this.compassSensedIds = [];
      }
      for (const inter of this.interactables) {
        if (inter.getCompassResonance() > 0) {
          inter.setCompassResonance(0);
        }
      }
      return;
    }

    const px = this.player.sprite.x;
    const py = this.player.sprite.y;
    const sensed: string[] = [];
    let nearestTarget: Interactable | null = null;
    let nearestDist = Infinity;

    for (const inter of this.interactables) {
      if (!inter.isHiddenInscriptionCandidate()) {
        if (inter.getCompassResonance() > 0) {
          inter.setCompassResonance(0);
        }
        continue;
      }

      const dist = Phaser.Math.Distance.Between(px, py, inter.config.x, inter.config.y);
      if (dist <= GameScene.COMPASS_SENSE_RADIUS) {
        const strength = Phaser.Math.Clamp(
          1 - dist / GameScene.COMPASS_SENSE_RADIUS,
          0.22,
          1
        );
        inter.setCompassResonance(strength);
        sensed.push(inter.config.id);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestTarget = inter;
        }
      } else if (inter.getCompassResonance() > 0) {
        inter.setCompassResonance(0);
      }
    }

    this.compassSensedIds = sensed;

    if (nearestTarget) {
      const t = time * 0.001;
      const strength = nearestTarget.getCompassResonance();
      const angle = Phaser.Math.Angle.Between(
        px,
        py - 4,
        nearestTarget.config.x,
        nearestTarget.config.y - 6
      );
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.1);
      const ringR = 34;

      // Subtle outer astrolabe arc & directional pointer around the Stabilizing Garment
      this.compassGfx.lineStyle(
        1.4,
        PALETTE.GARMENT_GOLD_BRIGHT,
        (0.24 + pulse * 0.2) * strength
      );
      this.compassGfx.beginPath();
      this.compassGfx.arc(px, py - 4, ringR, angle - 0.52, angle + 0.52);
      this.compassGfx.strokePath();

      const tipX = px + Math.cos(angle) * (ringR + 5);
      const tipY = py - 4 + Math.sin(angle) * (ringR + 5);
      const leftX = px + Math.cos(angle - 0.14) * (ringR - 1);
      const leftY = py - 4 + Math.sin(angle - 0.14) * (ringR - 1);
      const rightX = px + Math.cos(angle + 0.14) * (ringR - 1);
      const rightY = py - 4 + Math.sin(angle + 0.14) * (ringR - 1);

      this.compassGfx.fillStyle(
        PALETTE.ETHEREAL_CYAN,
        (0.36 + pulse * 0.24) * strength
      );
      this.compassGfx.beginPath();
      this.compassGfx.moveTo(tipX, tipY);
      this.compassGfx.lineTo(leftX, leftY);
      this.compassGfx.lineTo(rightX, rightY);
      this.compassGfx.closePath();
      this.compassGfx.fillPath();
    }
  }

  private findNearestActiveInteractable(): Interactable | null {
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;
    let best: Interactable | null = null;
    let bestDist = Infinity;

    for (const inter of this.interactables) {
      if (!inter.config.getPrompt()) continue;
      const dist = Phaser.Math.Distance.Between(px, py, inter.config.x, inter.config.y);
      if (dist <= inter.getRadius() && dist < bestDist) {
        best = inter;
        bestDist = dist;
      }
    }
    return best;
  }

  private checkChapterZones(): void {
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;
    const hasWeight = this.remnantManager.hasWeight();

    for (const trig of CHAPTER_TRIGGERS) {
      if (this.visitedChapters.has(trig.chapter)) continue;
      if (trig.requiresWeight && !hasWeight) continue;

      const b = trig.bounds;
      if (px >= b.x && px <= b.x + b.width && py >= b.y && py <= b.y + b.height) {
        this.visitedChapters.add(trig.chapter);
        this.currentChapter = trig.chapter;
        this.currentChapterTitle = trig.title;
        this.hud.showChapterCard(trig.title, trig.subtitle);
        this.events.emit(GAME_EVENTS.CHAPTER_CHANGED, trig);
        this.saveCheckpoint(`chapter_${trig.chapter}`);
      }
    }
  }

  private renderConduitTraces(time: number): void {
    const t = time * 0.001;
    this.conduitLinesGfx.clear();

    const drawTrace = (
      points: Array<[number, number]>,
      active: boolean,
      colorActive: number
    ) => {
      this.conduitLinesGfx.lineStyle(
        active ? 2.2 : 1.2,
        active ? colorActive : 0x2a3454,
        active ? 0.72 + Math.sin(t * 4) * 0.18 : 0.35
      );
      this.conduitLinesGfx.beginPath();
      this.conduitLinesGfx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        this.conduitLinesGfx.lineTo(points[i][0], points[i][1]);
      }
      this.conduitLinesGfx.strokePath();
    };

    // Wind-Spire Conduits -> Outer Spire Gate (x=3210)
    drawTrace(
      [
        [2130, 300],
        [2480, 410],
        [3210, 435],
      ],
      Boolean(this.worldFlags['conduit_north']),
      PALETTE.ETHEREAL_CYAN
    );
    drawTrace(
      [
        [2950, 360],
        [3090, 455],
        [3210, 500],
      ],
      Boolean(this.worldFlags['conduit_east']),
      PALETTE.ETHEREAL_CYAN
    );

    // Aerial Resonance Bell -> Crucible Entry Gate (x=4120)
    drawTrace(
      [
        [3760, 330],
        [3955, 420],
        [4120, 470],
      ],
      Boolean(this.worldFlags['sky_bell_rung']),
      PALETTE.REMNANT_GOLD
    );

    // 3 Crucible Stabilization Locks -> Central Remnant Containment Dais (x=4480, y=514)
    drawTrace(
      [
        [4255, 430],
        [4360, 480],
        [4480, 514],
      ],
      Boolean(this.worldFlags['crucible_lock_west']),
      PALETTE.REMNANT_GOLD
    );
    drawTrace(
      [
        [4795, 430],
        [4620, 480],
        [4480, 514],
      ],
      Boolean(this.worldFlags['crucible_lock_east']),
      PALETTE.REMNANT_GOLD
    );
    drawTrace(
      [
        [4480, 262],
        [4480, 514],
      ],
      Boolean(this.worldFlags['crucible_lock_zenith']),
      PALETTE.ETHEREAL_CYAN
    );

    // Courtyard plates -> Sunken Entry Gate
    const cOpen = Boolean(this.worldFlags['courtyard_unsealed']);
    drawTrace(
      [
        [880, 845],
        [1145, 845],
        [1360, 1020],
      ],
      cOpen || Boolean(this.plates.get('plate_courtyard_a')?.isDepressed()),
      PALETTE.REMNANT_GOLD
    );
    drawTrace(
      [
        [1035, 845],
        [1145, 855],
        [1360, 1090],
      ],
      cOpen || Boolean(this.plates.get('plate_courtyard_b')?.isDepressed()),
      PALETTE.REMNANT_GOLD
    );

    // Sanctum plates -> Mid & Final Gates
    drawTrace(
      [
        [1938, 1144],
        [2100, 1138],
        [2620, 1095],
      ],
      Boolean(this.worldFlags['sanctum_inner_latched']),
      PALETTE.REMNANT_GOLD
    );
    drawTrace(
      [
        [2460, 1144],
        [2620, 1035],
      ],
      Boolean(this.worldFlags['sanctum_final_unsealed']) ||
        Boolean(this.plates.get('plate_sanctum_gate')?.isDepressed()),
      PALETTE.REMNANT_GOLD
    );
  }
}
