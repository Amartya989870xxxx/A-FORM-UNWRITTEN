import Phaser from 'phaser';
import {
  GAME_EVENTS,
  GAME_HEIGHT,
  GAME_WIDTH,
  PALETTE,
  SCENE_KEYS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../constants';
import { DIALOGUE_TREES } from '../data/dialogues';
import { ECHO_FRAGMENT_DEFINITIONS } from '../data/quests';
import {
  CHAPTER_TRIGGERS,
  WORLD_PLATFORMS,
  WORLD_PROPS,
  WORLD_RUNE_SIGNS,
  WORLD_UPDRAFTS,
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
import { ImprintManager } from '../systems/ImprintManager';
import { QuestManager } from '../systems/QuestManager';
import { REMNANT_DEFINITIONS, RemnantManager } from '../systems/RemnantManager';
import { SaveManager, type SaveState } from '../systems/SaveManager';
import { DialogueBox } from '../ui/DialogueBox';
import { HUD } from '../ui/HUD';
import { Journal } from '../ui/Journal';
import { PauseMenu } from '../ui/PauseMenu';
import { RestorationOverlay } from '../ui/RestorationOverlay';
import { ArtGenerator } from '../utils/ArtGenerator';

export interface GameSceneInitData {
  loadSaved?: boolean;
}

export class GameScene extends Phaser.Scene {
  // Parallax layers
  private parallaxFar!: Phaser.GameObjects.TileSprite;
  private parallaxMid!: Phaser.GameObjects.TileSprite;
  private parallaxNear!: Phaser.GameObjects.TileSprite;
  private conduitLinesGfx!: Phaser.GameObjects.Graphics;

  // Core systems
  public remnantManager!: RemnantManager;
  public imprintManager!: ImprintManager;
  public questManager!: QuestManager;
  public dialogueManager!: DialogueManager;

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

  // UI overlays
  private hud!: HUD;
  private dialogueBox!: DialogueBox;
  private restorationOverlay!: RestorationOverlay;
  private journal!: Journal;
  private pauseMenu!: PauseMenu;

  // Runtime state
  public worldFlags: Record<string, boolean> = {};
  public discoveredEchoes = new Set<string>();
  private visitedChapters = new Set<number>();
  private currentChapter = 1;
  private currentChapterTitle = 'Chapter I — The Shattered Verge';
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
  private keyM!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private keyOne!: Phaser.Input.Keyboard.Key;
  private keyTwo!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  public create(data?: GameSceneInitData): void {
    // Reset collections on scene start/restart
    this.updrafts.clear();
    this.blocks.clear();
    this.plates.clear();
    this.slabs.clear();
    this.gates.clear();
    this.npcs.clear();
    this.interactables = [];
    this.worldFlags = {};
    this.discoveredEchoes.clear();
    this.visitedChapters.clear();
    this.isRestoringSequence = false;
    this.isEndingSequence = false;
    this.blockTouchToastCooldownMs = 0;

    // Ensure custom scene event listeners are cleaned up on restart/shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.removeAllListeners(GAME_EVENTS.QUEST_UPDATED);
      this.events.removeAllListeners(GAME_EVENTS.REMNANT_RESTORED);
      this.events.removeAllListeners(GAME_EVENTS.IMPRINT_ACQUIRED);
      this.events.removeAllListeners(GAME_EVENTS.ECHO_DISCOVERED);
      this.events.removeAllListeners(GAME_EVENTS.CHAPTER_CHANGED);
    });

    const saved: SaveState | null = data?.loadSaved ? SaveManager.load() : null;
    if (saved) {
      this.worldFlags = { ...saved.worldFlags };
      saved.discoveredEchoes.forEach((e) => this.discoveredEchoes.add(e));
      this.currentChapter = saved.chapter;
      this.currentChapterTitle = saved.chapterTitle;
      for (let c = 1; c <= saved.chapter; c++) {
        this.visitedChapters.add(c);
      }
    } else {
      this.currentChapter = 1;
      this.currentChapterTitle = 'Chapter I — The Shattered Verge';
    }

    // Initialize managers
    this.remnantManager = new RemnantManager(this.events, saved?.restoredRemnants ?? []);
    this.imprintManager = new ImprintManager(this.events, saved?.imprint ?? null);
    this.questManager = new QuestManager(this.events, saved?.questStates);
    this.dialogueManager = new DialogueManager(DIALOGUE_TREES);

    if (!saved) {
      this.questManager.startQuest('q_awakening_verge', true);
    }

    AudioManager.getInstance().unlockAndStartAmbient(this.remnantManager.hasWeight());
    AudioManager.getInstance().setGroundedMode(this.remnantManager.hasWeight());

    // Configure physics & world bounds
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT + 120);

    this.buildBackdropAndAtmosphere();
    this.buildWorldGeometry();
    this.buildPuzzlesAndEntities(saved);
    this.buildUI();
    this.setupInput();
    this.setupCamera();

    this.cameras.main.fadeIn(750, 7, 9, 19);

    if (!saved) {
      this.visitedChapters.add(1);
      this.time.delayedCall(450, () => {
        this.hud.showChapterCard(
          'Chapter I — The Shattered Verge',
          'An Unfinished Outline Upon Ancient Stone'
        );
      });
      this.saveCheckpoint('awakening_dais');
    } else {
      this.time.delayedCall(350, () => {
        this.hud.showToast(`Journey Resumed — ${this.currentChapterTitle}`, 'gold', 2800);
      });
    }
  }

  private buildBackdropAndAtmosphere(): void {
    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'tex_sky_gradient')
      .setScrollFactor(0)
      .setDepth(0);

    this.parallaxFar = this.add
      .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - 220, GAME_WIDTH, 520, 'tex_parallax_far')
      .setScrollFactor(0)
      .setDepth(1)
      .setAlpha(0.88);

    this.parallaxMid = this.add
      .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - 190, GAME_WIDTH, 540, 'tex_parallax_mid')
      .setScrollFactor(0)
      .setDepth(2)
      .setAlpha(0.92);

    this.parallaxNear = this.add
      .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - 165, GAME_WIDTH, 560, 'tex_parallax_near')
      .setScrollFactor(0)
      .setDepth(3)
      .setAlpha(0.95);

    // Subtle world-space ambient motes across the Shattered Verge
    this.add
      .particles(0, 0, 'tex_mote_cyan', {
        x: { min: 60, max: WORLD_WIDTH - 100 },
        y: { min: 180, max: WORLD_HEIGHT - 80 },
        speedY: { min: -22, max: -6 },
        speedX: { min: -12, max: 12 },
        scale: { start: 0.35, end: 0 },
        alpha: { start: 0.35, end: 0 },
        lifespan: 5400,
        frequency: 110,
        blendMode: 'ADD',
      })
      .setDepth(12);

    // Warm bioluminescent embers in the Sunken Sanctum
    this.add
      .particles(0, 0, 'tex_mote_gold', {
        x: { min: 1400, max: 4350 },
        y: { min: 920, max: 1150 },
        speedY: { min: -18, max: -5 },
        speedX: { min: -8, max: 8 },
        scale: { start: 0.38, end: 0 },
        alpha: { start: 0.42, end: 0 },
        lifespan: 4800,
        frequency: 140,
        blendMode: 'ADD',
      })
      .setDepth(12);

    // Screen-edge atmospheric vignette
    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'tex_vignette')
      .setScrollFactor(0)
      .setDepth(90);
  }

  private buildWorldGeometry(): void {
    // Decorative ancient ruins layer behind platforms
    const propsGfx = this.add.graphics().setDepth(10);
    for (const prop of WORLD_PROPS) {
      this.drawRuinProp(propsGfx, prop.x, prop.y, prop.kind, prop.scale ?? 1);
    }

    // Dynamic conduit trace lines connecting mechanisms to gates
    this.conduitLinesGfx = this.add.graphics().setDepth(11);

    // Diegetic carved stone tutorial inscriptions
    for (const sign of WORLD_RUNE_SIGNS) {
      const signW = sign.subtext ? 268 : 186;
      const signPlinth = this.add.graphics().setDepth(11);
      signPlinth.fillStyle(0x13192e, 0.72);
      signPlinth.fillRoundedRect(sign.x - signW / 2, sign.y - 24, signW, sign.subtext ? 46 : 30, 6);
      signPlinth.lineStyle(1, PALETTE.STONE_HIGHLIGHT, 0.38);
      signPlinth.strokeRoundedRect(sign.x - signW / 2, sign.y - 24, signW, sign.subtext ? 46 : 30, 6);

      this.add
        .text(sign.x, sign.y - 10, sign.text, {
          fontFamily: 'Georgia, serif',
          fontSize: '12.5px',
          color: PALETTE.TEXT_CYAN,
        })
        .setOrigin(0.5)
        .setDepth(12);

      if (sign.subtext) {
        this.add
          .text(sign.x, sign.y + 9, sign.subtext, {
            fontFamily: 'Georgia, serif',
            fontSize: '11px',
            fontStyle: 'italic',
            color: PALETTE.TEXT_MUTED,
          })
          .setOrigin(0.5)
          .setDepth(12);
      }
    }

    // Carved stone platforms + static Arcade Physics colliders
    const platGfx = this.add.graphics().setDepth(16);
    this.platformsGroup = this.physics.add.staticGroup();

    for (const p of WORLD_PLATFORMS) {
      ArtGenerator.drawCarvedPlatform(platGfx, p.x, p.y, p.width, p.height, p.style);
      const block = this.platformsGroup.create(p.x, p.y, 'tex_pixel') as Phaser.Physics.Arcade.Sprite;
      block.setAlpha(0);
      block.setDisplaySize(p.width, p.height);
      block.refreshBody();
    }
  }

  private drawRuinProp(
    g: Phaser.GameObjects.Graphics,
    x: number,
    floorY: number,
    kind: 'arch' | 'pillar' | 'statue' | 'monolith' | 'roots',
    scale: number
  ): void {
    switch (kind) {
      case 'arch': {
        const w = 110 * scale;
        const h = 135 * scale;
        g.fillStyle(0x161d34, 0.86);
        g.fillRect(x - w / 2, floorY - h, 18 * scale, h);
        g.fillRect(x + w / 2 - 18 * scale, floorY - h * 0.88, 18 * scale, h * 0.88);
        g.fillRoundedRect(x - w / 2 - 8, floorY - h - 14, w + 16, 18 * scale, 4);
        g.lineStyle(1.4, PALETTE.ETHEREAL_CYAN, 0.22);
        g.strokeCircle(x, floorY - h + 6, 16 * scale);
        break;
      }
      case 'pillar': {
        const h = 115 * scale;
        g.fillStyle(0x182038, 0.85);
        g.fillRect(x - 13 * scale, floorY - h, 26 * scale, h);
        g.fillRect(x - 19 * scale, floorY - 12, 38 * scale, 12);
        g.fillStyle(PALETTE.ETHEREAL_CYAN, 0.18);
        g.fillRect(x - 2, floorY - h + 20, 4, h * 0.45);
        break;
      }
      case 'statue': {
        const h = 92 * scale;
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
        const h = 140 * scale;
        g.fillStyle(0x151c31, 0.9);
        g.beginPath();
        g.moveTo(x - 22 * scale, floorY);
        g.lineTo(x - 14 * scale, floorY - h);
        g.lineTo(x, floorY - h - 22 * scale);
        g.lineTo(x + 14 * scale, floorY - h);
        g.lineTo(x + 22 * scale, floorY);
        g.closePath();
        g.fillPath();
        g.lineStyle(1.4, PALETTE.REMNANT_GOLD, 0.3);
        g.strokeCircle(x, floorY - h * 0.55, 11 * scale);
        break;
      }
      case 'roots': {
        // Bioluminescent ceiling/arch roots in the Sunken Sanctum
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
    }
  }

  private buildPuzzlesAndEntities(saved: SaveState | null): void {
    const hasWeight = this.remnantManager.hasWeight();

    // 1. Spawn Player
    const startX = saved ? saved.playerX : 165;
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
    for (const u of WORLD_UPDRAFTS) {
      const enabled =
        u.id === 'updraft_east_balcony'
          ? Boolean(this.worldFlags['vane_east_active'])
          : u.initiallyEnabled;
      this.updrafts.set(
        u.id,
        new WindUpdraft(this, u.x, u.y, u.width, u.height, enabled)
      );
    }

    // 3. Runic Gates
    const crucibleOpen =
      Boolean(this.worldFlags['conduit_north']) && Boolean(this.worldFlags['conduit_east']);
    this.gates.set(
      'gate_crucible',
      new RunicGate(this, {
        id: 'gate_crucible',
        x: 3210,
        y: 470,
        width: 34,
        height: 140,
        totalSeals: 2,
        initiallyOpen: crucibleOpen,
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
        x: 3720,
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

    // 4. Fractured Slabs (destructible via post-Weight Ground Impact)
    const slabCrucible = new FracturedSlab(this, {
      id: 'slab_crucible',
      x: 3650,
      y: 554,
      width: 160,
      height: 28,
      initiallyBroken: Boolean(this.worldFlags['slab_crucible_broken']),
      onShatter: () => {
        this.worldFlags['slab_crucible_broken'] = true;
        this.questManager.completeObjective('q_changed_world', 'obj_shatter_crucible');
        this.hud.showToast('The fractured vault floor gives way beneath your Weight!', 'gold');
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
        this.hud.showToast('The calcified sanctum seal shatters open!', 'gold');
        this.saveCheckpoint('sanctum_vault');
      },
    });
    this.slabs.set('slab_sanctum', slabSanctum);

    for (const slab of this.slabs.values()) {
      this.physics.add.collider(this.player.sprite, slab.collider);
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
            'Your unbound form passes without force against the runic granite.',
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
          this.hud.showToast('The ancient plinth does not yield. You carry no weight.', 'cyan');
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
          this.hud.showToast('The counterweight ignores your weightless outline.', 'cyan');
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

    const vespera = new NPC(this, 3280, 1114, 'vespera');
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
        radius: 76,
        kind: 'npc',
        getPrompt: () => 'Converse with Oren',
        onInteract: () => this.openDialogue('npc_oren'),
      })
    );

    // Puzzle 1: North Spire Conduit
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

    // Puzzle 1: Wind Vane Switch
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

    // Puzzle 1: East Balcony Conduit
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

    // Chapter 3: The Remnant of Weight
    this.interactables.push(
      new Interactable(this, {
        id: 'remnant_weight',
        x: 3440,
        y: 512,
        radius: 74,
        kind: 'remnant_weight',
        isActivated: () => this.remnantManager.hasWeight(),
        getPrompt: () =>
          this.remnantManager.hasWeight() ? null : 'Reclaim Remnant of Weight',
        onInteract: () => this.triggerWeightRestoration(),
      })
    );

    // Block Reset Pedestals (anti-softlock safeguard)
    this.interactables.push(
      new Interactable(this, {
        id: 'reset_courtyard_block',
        x: 625,
        y: 814,
        radius: 52,
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
        radius: 50,
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

    // Chapter 5: Vespera & the Memory Crucible
    this.interactables.push(
      new Interactable(this, {
        id: 'npc_vespera',
        x: 3280,
        y: 1114,
        radius: 82,
        kind: 'npc',
        getPrompt: () =>
          this.imprintManager.getCurrentId() === 'resolve'
            ? 'Inspect Quiet Crucible'
            : 'Speak with Vespera',
        onInteract: () => this.openDialogue('npc_vespera'),
      })
    );

    // Prototype Ending Threshold: The Fractured Mirror-Arch
    this.interactables.push(
      new Interactable(this, {
        id: 'ending_arch',
        x: 4180,
        y: 1112,
        radius: 84,
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
          radius: 64,
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
              this.events.emit(GAME_EVENTS.ECHO_DISCOVERED, def);
              this.saveCheckpoint(`echo_${ep.id}`);
            }
          },
        })
      );
    }
  }

  private evaluateGateSeals(silent = false): void {
    // 1. Crucible Gate (North + East Conduits)
    const crucibleCount =
      (this.worldFlags['conduit_north'] ? 1 : 0) + (this.worldFlags['conduit_east'] ? 1 : 0);
    const crucibleChanged = this.gates.get('gate_crucible')?.setSealProgress(crucibleCount);
    if (crucibleChanged && crucibleCount === 2 && !silent) {
      AudioManager.getInstance().playMechanismActivate();
      this.cameras.main.shake(180, 0.004);
      this.hud.showToast('Both wind conduits resonate — the Crucible of Mass unseals!', 'gold', 4000);
    }

    // 2. Courtyard Sunken Entry Gate (latches permanently once both plates are simultaneously active)
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

    // 3. Sanctum Mid Vault Gate
    const innerActive =
      this.worldFlags['sanctum_inner_latched'] ||
      this.plates.get('plate_sanctum_inner')?.isDepressed()
        ? 1
        : 0;
    this.gates.get('gate_sanctum_mid')?.setSealProgress(innerActive);

    // 4. Sanctum Final Gate (Inner Seal + Heavy Block Gate Plate; latches once both engage)
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

    // 5. Final Threshold Gate (opens once Chapter 5 choice is made)
    this.gates
      .get('gate_threshold')
      ?.setSealProgress(this.imprintManager.getCurrentId() !== null ? 1 : 0);
  }

  private buildUI(): void {
    this.hud = new HUD(
      this,
      this.questManager,
      this.remnantManager,
      this.imprintManager.getCurrent()
    );
    this.dialogueBox = new DialogueBox(this, this.dialogueManager);
    this.restorationOverlay = new RestorationOverlay(this);
    this.journal = new Journal(
      this,
      this.questManager,
      this.remnantManager,
      this.imprintManager,
      () => Array.from(this.discoveredEchoes)
    );
    this.pauseMenu = new PauseMenu(this, {
      onResume: () => {
        this.pauseMenu.close();
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
      onRestart: () => {
        this.pauseMenu.close();
        SaveManager.clear();
        this.scene.restart({ loadSaved: false });
      },
      onMainMenu: () => {
        this.pauseMenu.close();
        this.cameras.main.fadeOut(450, 7, 9, 19);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start(SCENE_KEYS.MENU);
        });
      },
    });
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
    this.keyM = kb.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.keyEsc = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.keyOne = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.keyTwo = kb.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    cam.startFollow(this.player.sprite, true, 0.09, 0.09, 0, 26);
  }

  private openDialogue(treeId: string): void {
    if (this.dialogueBox.isVisible() || this.isRestoringSequence || this.isEndingSequence) return;

    const node = this.dialogueManager.start(treeId, {
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
          this.player.setImprint('resonance');
          this.npcs.get('vespera')?.setImprintState('resonance');
          this.questManager.completeObjective('q_changed_world', 'obj_meet_vespera');
          this.evaluateGateSeals();
          this.saveCheckpoint('imprint_resonance');
        }
        break;

      case 'choose_imprint_resolve':
        if (this.imprintManager.acquire('resolve')) {
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
   * Executes the Chapter 3 Remnant of Weight restoration ceremony exactly once.
   */
  private triggerWeightRestoration(): void {
    if (this.remnantManager.hasWeight() || this.isRestoringSequence) return;

    this.isRestoringSequence = true;
    this.syncControlLock();

    AudioManager.getInstance().playRestorationSequence();
    this.cameras.main.zoomTo(1.24, 1800, 'Sine.easeInOut');

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

        for (const block of this.blocks.values()) {
          block.syncWeightCapability(true);
        }

        this.cameras.main.flash(380, 232, 169, 72);
        this.cameras.main.shake(280, 0.009);
        this.cameras.main.zoomTo(1, 800, 'Sine.easeOut');

        // Ensure earlier objectives mark complete cleanly
        this.questManager.completeObjective('q_echoes_of_substance', 'obj_conduit_north');
        this.questManager.completeObjective('q_echoes_of_substance', 'obj_conduit_east');
        this.questManager.completeObjective('q_echoes_of_substance', 'obj_claim_weight');

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
    AudioManager.getInstance().playConduitAttune();
    this.cameras.main.zoomTo(1.18, 1600, 'Sine.easeInOut');
    this.hud.showToast(
      '"Look upon the chains within the mirror—they were struck open from the inside."',
      'gold',
      3000
    );

    this.time.delayedCall(2200, () => {
      this.cameras.main.fadeOut(900, 7, 9, 19);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start(SCENE_KEYS.ENDING, {
          imprint: this.imprintManager.getCurrentId(),
          echoCount: this.discoveredEchoes.size,
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
      this.pauseMenu.isOpen();
    this.player.setControlsLocked(locked);
  }

  private saveCheckpoint(checkpointId: string): void {
    SaveManager.save({
      chapter: this.currentChapter,
      chapterTitle: this.currentChapterTitle,
      checkpointId,
      playerX: Math.round(this.player.sprite.x),
      playerY: Math.round(this.player.sprite.y),
      restoredRemnants: this.remnantManager.getAllRestored(),
      imprint: this.imprintManager.getCurrentId(),
      discoveredEchoes: Array.from(this.discoveredEchoes),
      worldFlags: { ...this.worldFlags },
      questStates: this.questManager.serialize(),
    });
  }

  public update(time: number, delta: number): void {
    if (this.blockTouchToastCooldownMs > 0) {
      this.blockTouchToastCooldownMs -= delta;
    }

    // Parallax scrolling synchronized to camera
    const cam = this.cameras.main;
    this.parallaxFar.tilePositionX = cam.scrollX * 0.11;
    this.parallaxMid.tilePositionX = cam.scrollX * 0.26;
    this.parallaxNear.tilePositionX = cam.scrollX * 0.46;

    // Global audio toggle
    if (Phaser.Input.Keyboard.JustDown(this.keyM)) {
      AudioManager.getInstance().toggleMute();
      this.hud.refresh();
    }

    // Handle modal / overlay inputs in priority order
    if (this.restorationOverlay.isOpen()) {
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
    } else if (this.journal.isOpen()) {
      if (
        Phaser.Input.Keyboard.JustDown(this.keyJ) ||
        Phaser.Input.Keyboard.JustDown(this.keyEsc)
      ) {
        this.journal.close();
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
      // Standard gameplay hotkeys
      if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
        this.pauseMenu.open();
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

    // Immortal abyss reformation if fallen below world floor
    if (this.player.sprite.y > WORLD_HEIGHT - 28) {
      this.player.respawnAtLastSafe();
      this.hud.showToast('Death cannot claim an unwritten form.', 'cyan', 2600);
    }

    // Quest objective auto-detection for crossing the Zone 1 Updraft Chasm
    if (this.player.sprite.x > 1475 && this.player.sprite.y < 590) {
      this.questManager.completeObjective('q_awakening_verge', 'obj_cross_chasm');
    }

    // Check Chapter triggers
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

    // Update proximity interactables
    const nearest = this.findNearestActiveInteractable();
    for (const inter of this.interactables) {
      inter.setInRange(inter === nearest && !this.player.isControlsLocked());
      inter.update(time);
    }

    this.renderConduitTraces(time);
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

    // Puzzle 1 spire traces -> Crucible Gate
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

