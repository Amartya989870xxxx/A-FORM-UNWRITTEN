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
    subtitle: 'Physical Presence & Consequence',
    gainedSummary:
      'Depress heavy stone mechanisms, push runic monoliths, and unleash Ground Impact (S / Down + Space in midair) to shatter fractured stone.',
    lostSummary:
      'Weightless Drift is gone. You can no longer float on air or rise through wind currents.',
    lore: 'To exist in the world is to press against it. The sky releases you so the stone may finally remember your footsteps.',
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

  public getAllRestored(): RemnantId[] {
    return Array.from(this.restored);
  }

  public reset(): void {
    this.restored.clear();
  }
}

