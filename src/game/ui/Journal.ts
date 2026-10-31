import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../constants';
import { ECHO_FRAGMENT_DEFINITIONS } from '../data/quests';
import { AudioManager } from '../systems/AudioManager';
import type { ImprintManager } from '../systems/ImprintManager';
import type { QuestManager } from '../systems/QuestManager';
import { REMNANT_DEFINITIONS, type RemnantManager } from '../systems/RemnantManager';

export class Journal {
  private readonly scene: Phaser.Scene;
  private readonly questManager: QuestManager;
  private readonly remnantManager: RemnantManager;
  private readonly imprintManager: ImprintManager;
  private readonly getDiscoveredEchoes: () => string[];

  private readonly container: Phaser.GameObjects.Container;
  private openState = false;

  constructor(
    scene: Phaser.Scene,
    questManager: QuestManager,
    remnantManager: RemnantManager,
    imprintManager: ImprintManager,
    getDiscoveredEchoes: () => string[]
  ) {
    this.scene = scene;
    this.questManager = questManager;
    this.remnantManager = remnantManager;
    this.imprintManager = imprintManager;
    this.getDiscoveredEchoes = getDiscoveredEchoes;

    this.container = scene.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setScrollFactor(0)
      .setDepth(145)
      .setVisible(false);
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

    const backdrop = this.scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050711, 0.82)
      .setInteractive();
    backdrop.on('pointerdown', () => this.close());

    const w = 960;
    const h = 580;
    const panel = this.scene.add.graphics();
    panel.fillStyle(PALETTE.UI_BG, 0.97);
    panel.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    panel.lineStyle(1.6, PALETTE.REMNANT_GOLD, 0.8);
    panel.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);

    // Vertical column divider
    panel.lineStyle(1, PALETTE.STONE_HIGHLIGHT, 0.35);
    panel.beginPath();
    panel.moveTo(0, -h / 2 + 72);
    panel.lineTo(0, h / 2 - 48);
    panel.strokePath();

    const header = this.scene.add
      .text(0, -h / 2 + 32, 'CHRONICLE OF AN UNWRITTEN FORM', {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_GOLD,
        letterSpacing: 2,
      })
      .setOrigin(0.5);

    const closeHint = this.scene.add
      .text(0, h / 2 - 24, '[ Press J or ESC to Close Chronicle ]', {
        fontFamily: 'Georgia, serif',
        fontSize: '12.5px',
        color: PALETTE.TEXT_MUTED,
      })
      .setOrigin(0.5);

    this.container.add([backdrop, panel, header, closeHint]);

    // LEFT COLUMN: Identity, Remnants & Imprints + Echo Tablets
    const leftX = -w / 2 + 34;
    let curY = -h / 2 + 74;

    const addSectionLabel = (x: number, y: number, label: string) => {
      const t = this.scene.add.text(x, y, label, {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: PALETTE.TEXT_CYAN,
        letterSpacing: 1.5,
      });
      this.container.add(t);
    };

    addSectionLabel(leftX, curY, 'VESSEL & REMNANTS');
    curY += 26;

    const hasWeight = this.remnantManager.hasWeight();
    const weightDef = REMNANT_DEFINITIONS.weight;
    const formDesc = hasWeight
      ? `◆ ${weightDef.name} — Restored\n   ${weightDef.gainedSummary}`
      : '◇ Unbound Silhouette — Incomplete\n   Weightless and drifting. Heavy mechanisms ignore your presence.';
    const formTxt = this.scene.add.text(leftX, curY, formDesc, {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: hasWeight ? PALETTE.TEXT_GOLD : PALETTE.TEXT_LIGHT,
      lineSpacing: 4,
      wordWrap: { width: 420 },
    });
    this.container.add(formTxt);
    curY += formTxt.height + 20;

    addSectionLabel(leftX, curY, 'IMPRINT OF EXPERIENCE');
    curY += 24;

    const imprint = this.imprintManager.getCurrent();
    const impText = this.scene.add.text(
      leftX,
      curY,
      imprint
        ? `✦ ${imprint.name} (${imprint.alignmentLabel})\n   ${imprint.summary}`
        : '○ None yet etched. Meaningful choices leave permanent Imprints upon who you become.',
      {
        fontFamily: 'Georgia, serif',
        fontSize: '12.5px',
        color: imprint ? imprint.textColor : PALETTE.TEXT_MUTED,
        lineSpacing: 4,
        wordWrap: { width: 420 },
      }
    );
    this.container.add(impText);
    curY += impText.height + 22;

    const echoes = new Set(this.getDiscoveredEchoes());
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
          : `◇ Undiscovered Stele — ${echo.locationHint}`,
        {
          fontFamily: 'Georgia, serif',
          fontSize: '12px',
          fontStyle: found ? 'italic' : 'normal',
          color: found ? PALETTE.TEXT_LIGHT : PALETTE.TEXT_MUTED,
          lineSpacing: 3,
          wordWrap: { width: 420 },
        }
      );
      this.container.add(t);
      curY += t.height + 12;
    }

    // RIGHT COLUMN: Quests & Objectives
    const rightX = 28;
    let rY = -h / 2 + 74;
    addSectionLabel(rightX, rY, 'JOURNEY & QUESTS');
    rY += 28;

    for (const q of this.questManager.getAllQuestsWithState()) {
      if (q.status === 'NOT_STARTED') continue;
      const badge = q.status === 'COMPLETED' ? '✓ COMPLETED' : '◆ ACTIVE';
      const qHeader = this.scene.add.text(
        rightX,
        rY,
        `${q.definition.title}   [${badge}]`,
        {
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          fontStyle: 'bold',
          color: q.status === 'COMPLETED' ? PALETTE.TEXT_MUTED : PALETTE.TEXT_GOLD,
        }
      );
      this.container.add(qHeader);
      rY += 22;

      const qSum = this.scene.add.text(rightX, rY, q.definition.summary, {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: PALETTE.TEXT_MUTED,
        wordWrap: { width: 420 },
      });
      this.container.add(qSum);
      rY += qSum.height + 8;

      const doneSet = new Set(q.completedObjectives);
      for (const obj of q.definition.objectives) {
        const done = doneSet.has(obj.id);
        const objTxt = this.scene.add.text(
          rightX + 10,
          rY,
          `${done ? '✓' : '▸'}  ${obj.description}`,
          {
            fontFamily: 'Georgia, serif',
            fontSize: '12px',
            color: done ? '#7f93b8' : PALETTE.TEXT_LIGHT,
            wordWrap: { width: 405 },
          }
        );
        this.container.add(objTxt);
        rY += objTxt.height + 6;
      }
      rY += 16;
    }
  }
}

