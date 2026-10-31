import type { RegionDefinition } from './types';

export interface ActiveRegionWeight {
  region: RegionDefinition;
  weight: number;
}

export class EnvironmentZones {
  private regions: Map<string, RegionDefinition> = new Map();

  constructor(initialRegions: RegionDefinition[] = []) {
    for (const reg of initialRegions) {
      this.registerRegion(reg);
    }
  }

  public registerRegion(region: RegionDefinition): void {
    this.regions.set(region.id, region);
  }

  public getRegionById(id: string): RegionDefinition | undefined {
    return this.regions.get(id);
  }

  public getAllRegions(): RegionDefinition[] {
    return Array.from(this.regions.values());
  }

  /**
   * Computes normalized blend weights [0..1] across regions overlapping or adjacent
   * to the camera position. Sum of weights always equals 1.0.
   */
  public getActiveRegionsWithWeights(
    camX: number,
    camY: number,
    transitionMargin = 260
  ): ActiveRegionWeight[] {
    const list = this.getAllRegions();
    if (list.length === 0) return [];
    if (list.length === 1) return [{ region: list[0], weight: 1.0 }];

    const rawWeights: Array<{ region: RegionDefinition; raw: number }> = [];
    let totalRaw = 0;

    for (const reg of list) {
      const b = reg.bounds;
      const left = b.x;
      const right = b.x + b.width;
      const top = b.y;
      const bottom = b.y + b.height;

      // Distance from box (0 if inside)
      const distX = camX < left ? left - camX : camX > right ? camX - right : 0;
      const distY = camY < top ? top - camY : camY > bottom ? camY - bottom : 0;
      const dist = Math.hypot(distX, distY);

      if (dist <= transitionMargin) {
        // Linear falloff from 1 at boundary to 0 at transitionMargin
        const factor = 1 - dist / transitionMargin;
        const raw = factor * factor; // Smooth quadratic curve
        rawWeights.push({ region: reg, raw });
        totalRaw += raw;
      }
    }

    if (totalRaw > 0) {
      return rawWeights.map((rw) => ({
        region: rw.region,
        weight: rw.raw / totalRaw,
      }));
    }

    // Camera is outside all regions: find nearest region and assign weight 1.0
    let nearest = list[0];
    let minDist = Infinity;
    for (const reg of list) {
      const b = reg.bounds;
      const left = b.x;
      const right = b.x + b.width;
      const top = b.y;
      const bottom = b.y + b.height;
      const distX = camX < left ? left - camX : camX > right ? camX - right : 0;
      const distY = camY < top ? top - camY : camY > bottom ? camY - bottom : 0;
      const d = Math.hypot(distX, distY);
      if (d < minDist) {
        minDist = d;
        nearest = reg;
      }
    }

    return [{ region: nearest, weight: 1.0 }];
  }

  /**
   * Returns the single dominant region at camera position.
   */
  public getPrimaryRegion(camX: number, camY: number): RegionDefinition {
    const weights = this.getActiveRegionsWithWeights(camX, camY);
    let best = weights[0].region;
    let maxW = -1;
    for (const item of weights) {
      if (item.weight > maxW) {
        maxW = item.weight;
        best = item.region;
      }
    }
    return best;
  }
}
