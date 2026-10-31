import Phaser from 'phaser';
import { GAME_EVENTS, PHYSICS_PROFILES } from '../constants';
import type { RemnantId } from './SaveManager';

export interface RemnantDefinition {
  id: RemnantId;
  name: string;
  subtitle: string;
  gainedSummary: string;
  lostSummary: string;
  lore: string;
}

export const REMNANT_DEFINITIONS: Record<RemnantId, RemnantDefinition> = {
  weight: {
    id: 'weight',
    name: 'Remnant of Weight',
    subtitle: 'Garment Stabilization and Physical Anchor',
    gainedSummary:
      'Your stabilizing garment anchors firmly to the physical world. Depress heavy stone plinths, push runic monoliths, and unleash Ground Impact (S or Down + Space in midair) to shatter fractured stone.',
    lostSummary:
      'Unanchored Drift has ended. Your garment can no longer float on air or ride rising wind currents.',
    lore: 'No flesh forms beneath the charcoal weave, yet the earth finally feels your presence. The sky lets go so the stone may remember your steps.',
  },
};

export class RemnantManager {
  private restored = new Set<RemnantId>();
  private events?: Phaser.Events.EventEmitter;

  constructor(events?: Phaser.Events.EventEmitter, initial: RemnantId[] = []) {
    this.events = events;
    for (const id of initial) {
      this.restored.add(id);
    }
  }

  public has(id: RemnantId): boolean {
    return this.restored.has(id);
  }

  public hasWeight(): boolean {
    return this.restored.has('weight');
  }

  public restore(id: RemnantId): boolean {
    if (this.restored.has(id)) {
      return false;
    }
    this.restored.add(id);
    this.events?.emit(GAME_EVENTS.REMNANT_RESTORED, REMNANT_DEFINITIONS[id]);
    return true;
  }

  public getPhysicsProfile() {
    return this.hasWeight() ? PHYSICS_PROFILES.GROUNDED : PHYSICS_PROFILES.UNBOUND;
  }

  public getStabilizationLabel(): 'Unanchored State' | 'Grounded State' {
    return this.hasWeight() ? 'Grounded State' : 'Unanchored State';
  }

  public getAllRestored(): RemnantId[] {
    return Array.from(this.restored);
  }

  public reset(): void {
    this.restored.clear();
  }
}
