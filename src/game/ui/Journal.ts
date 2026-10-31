import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  PALETTE,
  type AdventurerRank,
  type SoulAffinityKey,
} from '../constants';
import { ECHO_FRAGMENT_DEFINITIONS, RELIC_DEFINITIONS } from '../data/quests';
import { AudioManager } from '../systems/AudioManager';
import type { ExplorationManager } from '../systems/ExplorationManager';
import type { ImprintManager } from '../systems/ImprintManager';
import type { QuestManager } from '../systems/QuestManager';
import { REMNANT_DEFINITIONS, type RemnantManager } from '../systems/RemnantManager';
import type { SoulSpectrumState } from '../systems/SaveManager';

export interface JournalMetaProvider {
  playerName: string;
  adventurerRank: AdventurerRank;
  discoveredEchoes: string[];
  relics: string[];
  soulAffinities: SoulSpectrumState;
}

const AFFINITY_LABELS: Array<{ key: SoulAffinityKey; label: string; color: string }> = [
  { key: 'azure', label: 'Azure', color: '#7ee8fa' },
  { key: 'verdant', label: 'Verdant', color: '#8be8b0' },
  { key: 'amber', label: 'Amber', color: '#f3be6b' },
  { key: 'crimson', label: 'Crimson', color: '#f59584' },
  { key: 'violet', label: 'Violet', color: '#c5a8ff' },
  { key: 'silver', label: 'Silver', color: '#dce4f5' },
];

export class Journal {
  private readonly scene: Phaser.Scene;
  private readonly questManager: QuestManager;
  private readonly remnantManager: RemnantManager;
  private readonly imprintManager: ImprintManager;
  private readonly explorationManager: ExplorationManager;
  private readonly getMeta: () => JournalMetaProvider;
  private readonly onOpenAtlas: () => void;

  private readonly container: Phaser.GameObjects.Container;
  private openState = false;
  private showGuidanceHints = false;

  constructor(
    scene: Phaser.Scene,
    questManager: QuestManager,
    remnantManager: RemnantManager,
    imprintManager: ImprintManager,
    explorationManager: ExplorationManager,
    getMeta: () => JournalMetaProvider,
    onOpenAtlas: () => void
  ) {
    this.scene = scene;
    this.questManager = questManager;
    this.remnantManager = remnantManager;
    this.imprintManager = imprintManager;
    this.explorationManager = explorationManager;
    this.getMeta = getMeta;
    this.onOpenAtlas = onOpenAtlas;

    this.container = scene.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setScrollFactor(0)
      .setDepth(145)
      .setVisible(false);
  }

  public getRootObjects(): Phaser.GameObjects.GameObject[] {
    return [this.container];
  }

  public isOpen(): boolean {
    return this.openState;
  }

  public toggle(): void {
    if (this.openState) {
      this.close();
    } else {
      this.open();
    }
  }

  public toggleHints(): void {
    if (!this.openState) return;
    this.showGuidanceHints = !this.showGuidanceHints;
    AudioManager.getInstance().playDialogueBlip();
    this.rebuild();
  }

  public open(): void {
    this.openState = true;
    AudioManager.getInstance().playInteract();
    this.rebuild();
    this.container.setVisible(true);
  }

  public close(): void {
    if (!this.openState) return;
    this.openState = false;
    AudioManager.getInstance().playDialogueBlip();
    this.container.setVisible(false);
  }

  private rebuild(): void {
    this.container.removeAll(true);
    const meta = this.getMeta();
    const regionPct = this.explorationManager.getRegionExplorationPercent();
    const worldPct = this.explorationManager.getWorldExplorationPercent();

    const backdrop = this.scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050711, 0.85)
      .setInteractive();
    backdrop.on('pointerdown', () => this.close());

    const w = 1500;
    const h = 940;
    const panel = this.scene.add.graphics();
    panel.fillStyle(PALETTE.UI_BG, 0.98);
    panel.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    panel.lineStyle(2, PALETTE.REMNANT_GOLD, 0.85);
    panel.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);

    // Header, column, and footer dividers
    panel.lineStyle(1, PALETTE.STONE_HIGHLIGHT, 0.38);
    panel.beginPath();
    panel.moveTo(-w / 2 + 36, -h / 2 + 92);
    panel.lineTo(w / 2 - 36, -h / 2 + 92);
    panel.moveTo(-30, -h / 2 + 108);
    panel.lineTo(-30, h / 2 - 56);
    panel.moveTo(-w / 2 + 36, h / 2 - 48);
    panel.lineTo(w / 2 - 36, h / 2 - 48);
    panel.strokePath();

    const header = this.scene.add
      .text(-w / 2 + 40, -h / 2 + 24, 'CHRONICLE OF AN UNWRITTEN FORM', {
        fontFamily: 'Georgia, serif',
        fontSize: '23px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_GOLD,
        letterSpacing: 2.2,
      })
      .setOrigin(0, 0);

    const subHeader = this.scene.add
      .text(
        -w / 2 + 40,
        -h / 2 + 57,
        `Wayfarer: ${meta.playerName}   •   Guild Rank ${meta.adventurerRank}   •   Verge Surveyed: ${regionPct.toFixed(1)}%   •   Known World: ${worldPct.toFixed(2)}%`,
        {
          fontFamily: 'Georgia, serif',
          fontSize: '14.5px',
          color: PALETTE.TEXT_LIGHT,
        }
      )
      .setOrigin(0, 0);

    // Top-right button to open World Atlas directly from Chronicle
    const atlasBtnW = 240;
    const atlasBtnH = 38;
    const atlasBtnX = w / 2 - 160;
    const atlasBtnY = -h / 2 + 48;
    const atlasBg = this.scene.add.graphics();
    atlasBg.fillStyle(0x1b2442, 0.96);
    atlasBg.fillRoundedRect(atlasBtnX - atlasBtnW / 2, atlasBtnY - atlasBtnH / 2, atlasBtnW, atlasBtnH, 7);
    atlasBg.lineStyle(1.4, PALETTE.UI_BORDER_CYAN, 0.85);
    atlasBg.strokeRoundedRect(atlasBtnX - atlasBtnW / 2, atlasBtnY - atlasBtnH / 2, atlasBtnW, atlasBtnH, 7);

    const atlasTxt = this.scene.add
      .text(atlasBtnX, atlasBtnY, 'Open World Atlas [Tab]', {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_CYAN,
      })
      .setOrigin(0.5);

    const atlasHit = this.scene.add
      .rectangle(atlasBtnX, atlasBtnY, atlasBtnW, atlasBtnH, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    atlasHit.on('pointerdown', () => {
      this.close();
      this.onOpenAtlas();
    });

    const closeHint = this.scene.add
      .text(
        0,
        h / 2 - 26,
        `[J or ESC] Close Chronicle     [H] ${this.showGuidanceHints ? 'Hide' : 'Show'} Wayfarer Guidance Hints     [TAB] Open World Atlas`,
        {
          fontFamily: 'Georgia, serif',
          fontSize: '13.5px',
          color: PALETTE.TEXT_MUTED,
        }
      )
      .setOrigin(0.5);

    this.container.add([backdrop, panel, header, subHeader, atlasBg, atlasTxt, atlasHit, closeHint]);

    const addSectionLabel = (x: number, y: number, label: string) => {
      const t = this.scene.add.text(x, y, label, {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_CYAN,
        letterSpacing: 1.5,
      });
      this.container.add(t);
    };

    // LEFT COLUMN: Stabilizing Garment, Soul Spectrum, Imprints, Relics & Echo Tablets
    const leftX = -w / 2 + 40;
    const leftW = 648;
    let curY = -h / 2 + 110;

    addSectionLabel(leftX, curY, 'STABILIZING GARMENT & REMNANTS');
    curY += 26;

    const hasWeight = this.remnantManager.hasWeight();
    const weightDef = REMNANT_DEFINITIONS.weight;
    const formDesc = hasWeight
      ? `◆ Grounded State (${weightDef.name})\n   ${weightDef.gainedSummary}`
      : '◇ Unanchored State (Origin Unknown)\n   Your bodiless presence is held in shape by charcoal and gold cloth. Heavy mechanisms ignore your step until anchored.';
    const formTxt = this.scene.add.text(leftX, curY, formDesc, {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: hasWeight ? PALETTE.TEXT_GOLD : PALETTE.TEXT_LIGHT,
      lineSpacing: 4,
      wordWrap: { width: leftW },
    });
    this.container.add(formTxt);
    curY += formTxt.height + 20;

    addSectionLabel(leftX, curY, 'ASTRAL SOUL SPECTRUM & IMPRINTS');
    curY += 25;

    const spectrumParts = AFFINITY_LABELS.map(
      (a) => `${a.label}: ${meta.soulAffinities[a.key] ?? 1}`
    ).join('   •   ');
    const specTxt = this.scene.add.text(
      leftX,
      curY,
      `Latent Prism Resonance (Unsettled):  ${spectrumParts}`,
      {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: PALETTE.TEXT_MUTED,
        wordWrap: { width: leftW },
      }
    );
    this.container.add(specTxt);
    curY += specTxt.height + 10;

    const imprint = this.imprintManager.getCurrent();
    const impText = this.scene.add.text(
      leftX,
      curY,
      imprint
        ? `✦ ${imprint.name} (${imprint.alignmentLabel})\n   ${imprint.summary}`
        : '○ No Imprint etched yet. Consequential choices shape the prism hidden beneath your garment.',
      {
        fontFamily: 'Georgia, serif',
        fontSize: '13.5px',
        color: imprint ? imprint.textColor : PALETTE.TEXT_MUTED,
        lineSpacing: 4,
        wordWrap: { width: leftW },
      }
    );
    this.container.add(impText);
    curY += impText.height + 20;

    addSectionLabel(leftX, curY, `RECOVERED RELICS (${meta.relics.length})`);
    curY += 24;
    if (meta.relics.length === 0) {
      const noRelic = this.scene.add.text(
        leftX,
        curY,
        '◇ No relics recovered. Hidden quests and ancient vaults reward curious explorers.',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '13px',
          color: PALETTE.TEXT_MUTED,
          wordWrap: { width: leftW },
        }
      );
      this.container.add(noRelic);
      curY += noRelic.height + 18;
    } else {
      for (const rId of meta.relics) {
        const rDef = RELIC_DEFINITIONS[rId];
        if (!rDef) continue;
        const rt = this.scene.add.text(
          leftX,
          curY,
          `✦ ${rDef.name} [${rDef.rarity} Relic]\n   ${rDef.effectSummary}`,
          {
            fontFamily: 'Georgia, serif',
            fontSize: '13.5px',
            color: PALETTE.TEXT_GOLD,
            lineSpacing: 3,
            wordWrap: { width: leftW },
          }
        );
        this.container.add(rt);
        curY += rt.height + 14;
      }
    }

    const echoes = new Set(meta.discoveredEchoes);
    addSectionLabel(
      leftX,
      curY,
      `ECHO TABLETS RECOVERED (${echoes.size} / ${ECHO_FRAGMENT_DEFINITIONS.length})`
    );
    curY += 24;

    for (const echo of ECHO_FRAGMENT_DEFINITIONS) {
      const found = echoes.has(echo.id);
      const t = this.scene.add.text(
        leftX,
        curY,
        found
          ? `◆ ${echo.title}\n   ${echo.inscription}`
          : `◇ Undiscovered Stele (${echo.locationHint})`,
        {
          fontFamily: 'Georgia, serif',
          fontSize: '13px',
          fontStyle: found ? 'italic' : 'normal',
          color: found ? PALETTE.TEXT_LIGHT : PALETTE.TEXT_MUTED,
          lineSpacing: 3,
          wordWrap: { width: leftW },
        }
      );
      this.container.add(t);
      curY += t.height + 12;
    }

    // RIGHT COLUMN: Quests (Rank, Mystery Age, Objectives & Optional Hints)
    const rightX = 8;
    const rightW = w / 2 - 52;
    const maxRightY = h / 2 - 64;
    let rY = -h / 2 + 110;

    addSectionLabel(rightX, rY, 'JOURNEY & QUEST LEDGER');

    // Hint toggle clickable pill
    const hintToggle = this.scene.add
      .text(
        w / 2 - 42,
        rY,
        this.showGuidanceHints ? '[H] Guidance Hints: Shown' : '[H] Guidance Hints: Hidden',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '12.5px',
          color: this.showGuidanceHints ? PALETTE.TEXT_GOLD : PALETTE.TEXT_MUTED,
        }
      )
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    hintToggle.on('pointerdown', () => this.toggleHints());
    this.container.add(hintToggle);

    rY += 28;

    for (const q of this.questManager.getAllQuestsWithState()) {
      if (q.status === 'NOT_STARTED') continue;
      if (rY > maxRightY - 40) break;
      const isCompleted = q.status === 'COMPLETED';
      const badge = isCompleted ? '✓ COMPLETED' : '◆ ACTIVE';
      const catTag = q.definition.category === 'Hidden' ? 'HIDDEN  •  ' : '';
      const qHeader = this.scene.add.text(
        rightX,
        rY,
        `${q.definition.title}   [${badge}]`,
        {
          fontFamily: 'Georgia, serif',
          fontSize: '15.5px',
          fontStyle: 'bold',
          color: isCompleted ? PALETTE.TEXT_MUTED : PALETTE.TEXT_GOLD,
        }
      );
      this.container.add(qHeader);
      rY += 21;

      const qMeta = this.scene.add.text(
        rightX,
        rY,
        `${catTag}Rank ${q.definition.rank}   •   ${q.definition.mysteryAge}`,
        {
          fontFamily: 'Georgia, serif',
          fontSize: '12px',
          color: PALETTE.TEXT_CYAN,
        }
      );
      this.container.add(qMeta);
      rY += 18;

      const qSum = this.scene.add.text(rightX, rY, q.definition.summary, {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: PALETTE.TEXT_MUTED,
        lineSpacing: 2,
        wordWrap: { width: rightW },
      });
      this.container.add(qSum);
      rY += qSum.height + 6;

      const doneSet = new Set(q.completedObjectives);
      for (const obj of q.definition.objectives) {
        if (rY > maxRightY - 18) break;
        const done = doneSet.has(obj.id);
        const objTxt = this.scene.add.text(
          rightX + 10,
          rY,
          `${done ? '✓' : '▸'}  ${obj.description}`,
          {
            fontFamily: 'Georgia, serif',
            fontSize: isCompleted ? '12.5px' : '13px',
            color: done ? '#7f93b8' : PALETTE.TEXT_LIGHT,
            wordWrap: { width: rightW - 14 },
          }
        );
        this.container.add(objTxt);
        rY += objTxt.height + 4;
      }

      if (this.showGuidanceHints && q.status === 'ACTIVE' && rY <= maxRightY - 24) {
        const hintTxt = this.scene.add.text(
          rightX + 10,
          rY + 2,
          `Wayfarer Note: ${q.definition.journalHint}`,
          {
            fontFamily: 'Georgia, serif',
            fontSize: '12.5px',
            fontStyle: 'italic',
            color: PALETTE.TEXT_GOLD,
            wordWrap: { width: rightW - 14 },
          }
        );
        this.container.add(hintTxt);
        rY += hintTxt.height + 6;
      }

      rY += 13;
    }
  }
}
