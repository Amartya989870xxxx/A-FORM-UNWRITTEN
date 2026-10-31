import Phaser from 'phaser';
import { GAME_EVENTS, PALETTE } from '../constants';
import type { ImprintId } from './SaveManager';

export interface ImprintDefinition {
  id: ImprintId;
  name: string;
  alignmentLabel: 'Becoming' | 'Original Self';
  colorHex: number;
  textColor: string;
  summary: string;
  endingReflection: string;
}

export const IMPRINT_DEFINITIONS: Record<ImprintId, ImprintDefinition> = {
  resonance: {
    id: 'resonance',
    name: 'Imprint of Resonance',
    alignmentLabel: 'Becoming',
    colorHex: PALETTE.IMPRINT_RESONANCE,
    textColor: PALETTE.TEXT_ROSE,
    summary:
      'You lent your newly anchored Weight to steady Vespera’s fading sanctuary, placing a fragile living memory above certainty of your past.',
    endingReflection:
      'Within the gold seams of your garment stirs a warmth that never belonged to your former existence, proof that an unwritten soul can author meaning of its own.',
  },
  resolve: {
    id: 'resolve',
    name: 'Imprint of Resolve',
    alignmentLabel: 'Original Self',
    colorHex: PALETTE.IMPRINT_RESOLVE,
    textColor: PALETTE.TEXT_VIOLET,
    summary:
      'With Vespera’s solemn blessing, you drew the Echo Core inward, allowing her long vigil to rest so the truth of your origin could awaken.',
    endingReflection:
      'Cold starlight sharpens the edges of your memory. You step closer to the existence you once held, even as the quiet hearth behind you settles into ash.',
  },
};

export class ImprintManager {
  private currentImprint: ImprintId | null = null;
  private events?: Phaser.Events.EventEmitter;

  constructor(events?: Phaser.Events.EventEmitter, initial: ImprintId | null = null) {
    this.events = events;
    this.currentImprint = initial;
  }

  public acquire(id: ImprintId): boolean {
    if (this.currentImprint !== null) {
      return false;
    }
    this.currentImprint = id;
    this.events?.emit(GAME_EVENTS.IMPRINT_ACQUIRED, IMPRINT_DEFINITIONS[id]);
    return true;
  }

  public getCurrent(): ImprintDefinition | null {
    return this.currentImprint ? IMPRINT_DEFINITIONS[this.currentImprint] : null;
  }

  public getCurrentId(): ImprintId | null {
    return this.currentImprint;
  }

  public reset(): void {
    this.currentImprint = null;
  }
}
