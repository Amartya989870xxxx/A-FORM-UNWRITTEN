import type { ImprintId } from './SaveManager';

export interface DialogueContext {
  hasWeight: boolean;
  imprint: ImprintId | null;
  flags: Record<string, boolean>;
  triggerAction: (actionId: string) => void;
}

export interface DialogueChoice {
  label: string;
  nextNodeId: string | null;
  accent?: 'default' | 'becoming' | 'original';
  condition?: (ctx: DialogueContext) => boolean;
  actionId?: string;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  speakerTitle?: string;
  text: string | ((ctx: DialogueContext) => string);
  nextNodeId?: string | null;
  onEnterActionId?: string;
  choices?: DialogueChoice[];
}

export interface DialogueTree {
  id: string;
  getEntryNodeId: (ctx: DialogueContext) => string;
  nodes: Record<string, DialogueNode>;
}

export class DialogueManager {
  private trees = new Map<string, DialogueTree>();
  private activeTree: DialogueTree | null = null;
  private activeNode: DialogueNode | null = null;
  private context: DialogueContext | null = null;

  constructor(trees: DialogueTree[] = []) {
    for (const tree of trees) {
      this.trees.set(tree.id, tree);
    }
  }

  public isActive(): boolean {
    return this.activeNode !== null;
  }

  public start(treeId: string, context: DialogueContext): DialogueNode | null {
    const tree = this.trees.get(treeId);
    if (!tree) return null;
    this.activeTree = tree;
    this.context = context;
    const entryId = tree.getEntryNodeId(context);
    return this.enterNode(entryId);
  }

  public getCurrentNode(): DialogueNode | null {
    return this.activeNode;
  }

  public getResolvedText(): string {
    if (!this.activeNode || !this.context) return '';
    return typeof this.activeNode.text === 'function'
      ? this.activeNode.text(this.context)
      : this.activeNode.text;
  }

  public getAvailableChoices(): DialogueChoice[] {
    if (!this.activeNode?.choices || !this.context) return [];
    return this.activeNode.choices.filter((c) => !c.condition || c.condition(this.context!));
  }

  public advance(choiceIndex?: number): DialogueNode | null {
    if (!this.activeNode || !this.activeTree || !this.context) return null;

    const choices = this.getAvailableChoices();
    if (choices.length > 0) {
      if (choiceIndex === undefined || choiceIndex < 0 || choiceIndex >= choices.length) {
        return this.activeNode;
      }
      const chosen = choices[choiceIndex];
      if (chosen.actionId) {
        this.context.triggerAction(chosen.actionId);
      }
      if (!chosen.nextNodeId) {
        this.close();
        return null;
      }
      return this.enterNode(chosen.nextNodeId);
    }

    if (this.activeNode.nextNodeId) {
      return this.enterNode(this.activeNode.nextNodeId);
    }

    this.close();
    return null;
  }

  public close(): void {
    this.activeTree = null;
    this.activeNode = null;
    this.context = null;
  }

  private enterNode(nodeId: string): DialogueNode | null {
    if (!this.activeTree || !this.context) return null;
    const next = this.activeTree.nodes[nodeId];
    if (!next) {
      this.close();
      return null;
    }
    this.activeNode = next;
    if (next.onEnterActionId) {
      this.context.triggerAction(next.onEnterActionId);
    }
    return next;
  }
}

