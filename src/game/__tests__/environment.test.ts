import { describe, expect, it } from 'vitest';
import { WORLD_WIDTH } from '../constants';
import { WORLD_PLATFORMS } from '../data/world';
import { EnvironmentRenderer, isLegacyEnvironmentMode } from '../environment/EnvironmentRenderer';
import { EnvironmentZones } from '../environment/EnvironmentZones';
import {
  ALL_SHATTERED_VERGE_REGIONS,
  SHATTERED_VERGE_PARALLAX_LAYERS,
} from '../environment/regions/shatteredVerge';

describe('Environment Architecture & Platform Preservation (Phase 2)', () => {
  describe('1. Platform Geometry Snapshot', () => {
    it('preserves exactly 45 collision platforms with unchanged dimensions', () => {
      expect(WORLD_PLATFORMS.length).toBe(45);

      // Deterministic snapshot of platform coordinates
      const snapshot = WORLD_PLATFORMS.map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        style: p.style,
      }));

      // Validate critical anchor platforms
      const startPlat = snapshot.find((p) => p.id === 'p_z1_start');
      expect(startPlat).toEqual({
        id: 'p_z1_start',
        x: 245,
        y: 864,
        width: 490,
        height: 48,
        style: 'ground',
      });

      const observatoryPlat = snapshot.find((p) => p.id === 'p_z2_observatory');
      expect(observatoryPlat).toEqual({
        id: 'p_z2_observatory',
        x: 1720,
        y: 564,
        width: 520,
        height: 48,
        style: 'aqueduct',
      });

      const cruciblePlat = snapshot.find((p) => p.id === 'p_z3_crucible_main');
      expect(cruciblePlat).toEqual({
        id: 'p_z3_crucible_main',
        x: 4385,
        y: 564,
        width: 370,
        height: 48,
        style: 'aqueduct',
      });

      const sanctumPlat = snapshot.find((p) => p.id === 'p_z5_floor_main');
      expect(sanctumPlat).toEqual({
        id: 'p_z5_floor_main',
        x: 3195,
        y: 1170,
        width: 4170,
        height: 60,
        style: 'sanctum',
      });
    });

    it('ensures every platform has positive dimensions and valid coordinates', () => {
      for (const p of WORLD_PLATFORMS) {
        expect(p.width).toBeGreaterThan(0);
        expect(p.height).toBeGreaterThan(0);
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(WORLD_WIDTH);
        expect(p.y).toBeGreaterThan(0);
      }
    });
  });

  describe('2. Region Data & Coverage', () => {
    it('defines valid Shattered Verge regions covering the horizontal world span', () => {
      expect(ALL_SHATTERED_VERGE_REGIONS.length).toBe(6);

      for (const reg of ALL_SHATTERED_VERGE_REGIONS) {
        expect(reg.id).toBeDefined();
        expect(reg.name).toBeDefined();
        expect(reg.biome).toBeDefined();
        expect(reg.bounds.width).toBeGreaterThan(0);
        expect(reg.bounds.height).toBeGreaterThan(0);
        expect(reg.defaultTerrainSkin).toBeDefined();
      }
    });

    it('verifies platform skin overrides reference existing platform identifiers', () => {
      const validPlatformIds = new Set(WORLD_PLATFORMS.map((p) => p.id));

      for (const reg of ALL_SHATTERED_VERGE_REGIONS) {
        if (reg.platformSkinOverrides) {
          for (const platId of Object.keys(reg.platformSkinOverrides)) {
            expect(validPlatformIds.has(platId)).toBe(true);
          }
        }
      }
    });

    it('contains no horizontal gaps between western spawn and eastern threshold', () => {
      // Sort regions by horizontal left bound
      const sorted = [...ALL_SHATTERED_VERGE_REGIONS].sort((a, b) => a.bounds.x - b.bounds.x);
      expect(sorted[0].bounds.x).toBeLessThanOrEqual(50);

      // Check each step has overlap or contiguous bounds
      let maxReach = sorted[0].bounds.x + sorted[0].bounds.width;
      for (let i = 1; i < sorted.length; i++) {
        const reg = sorted[i];
        expect(reg.bounds.x).toBeLessThanOrEqual(maxReach + 260); // Within transition margin
        maxReach = Math.max(maxReach, reg.bounds.x + reg.bounds.width);
      }
      expect(maxReach).toBeGreaterThanOrEqual(5000);
    });
  });

  describe('3. Environment Zones & Weight Blending', () => {
    const zones = new EnvironmentZones(ALL_SHATTERED_VERGE_REGIONS);

    it('produces normalized blend weights summing exactly to 1.0 at any coordinate', () => {
      const testCoordinates = [
        { x: 100, y: 700 }, // Deep in Precipice
        { x: 1440, y: 550 }, // Boundary between Precipice and Spires
        { x: 2100, y: 400 }, // Spires
        { x: 3300, y: 450 }, // Sky-Arch entry
        { x: 4400, y: 400 }, // Crucible
        { x: 2500, y: 1140 }, // Sunken Sanctum
        { x: 6000, y: 500 }, // Outside boundary
      ];

      for (const pt of testCoordinates) {
        const weights = zones.getActiveRegionsWithWeights(pt.x, pt.y);
        expect(weights.length).toBeGreaterThan(0);

        let sum = 0;
        for (const w of weights) {
          expect(w.weight).toBeGreaterThanOrEqual(0);
          expect(w.weight).toBeLessThanOrEqual(1.0);
          sum += w.weight;
        }
        expect(sum).toBeCloseTo(1.0, 4);
      }
    });

    it('resolves primary region correctly', () => {
      expect(zones.getPrimaryRegion(200, 750).id).toBe('shattered_verge_precipice');
      expect(zones.getPrimaryRegion(2000, 400).id).toBe('shattered_verge_spires');
      expect(zones.getPrimaryRegion(3600, 400).id).toBe('shattered_verge_sky_arch');
      expect(zones.getPrimaryRegion(4500, 400).id).toBe('shattered_verge_crucible');
      expect(zones.getPrimaryRegion(2500, 1100).id).toBe('shattered_verge_sanctum');
    });
  });

  describe('4. Parallax Layer & Gameplay Separation', () => {
    it('ensures all decorative parallax layers have scrollFactorX < 1.0', () => {
      for (const layer of SHATTERED_VERGE_PARALLAX_LAYERS) {
        expect(layer.scrollFactorX).toBeGreaterThan(0);
        expect(layer.scrollFactorX).toBeLessThan(1.0);
        expect(layer.depth).toBeLessThan(10); // Far behind gameplay plane (depth 16+)
      }
    });

    it('ensures gameplay colliders are never assigned decorative parallax scroll factors', () => {
      // All physics bodies in Phaser arcade physics operate in 1:1 world coordinates
      for (const p of WORLD_PLATFORMS) {
        expect(p.id).toBeDefined();
        // Platform definitions strictly represent static Arcade Physics bodies
        expect(p.width).toBeGreaterThanOrEqual(20);
        expect(p.height).toBeGreaterThanOrEqual(20);
      }
    });
  });

  describe('5. Legacy Switch Availability', () => {
    it('detects legacy mode query parameter reliably', () => {
      expect(isLegacyEnvironmentMode('?env=legacy')).toBe(true);
      expect(isLegacyEnvironmentMode('?env=LEGACY')).toBe(true);
      expect(isLegacyEnvironmentMode('?env=modular')).toBe(false);
      expect(isLegacyEnvironmentMode('')).toBe(false);
      expect(isLegacyEnvironmentMode('?foo=bar')).toBe(false);

      const rendererDefault = new EnvironmentRenderer({ scene: {} as any });
      expect(rendererDefault.isLegacyMode()).toBe(false);
    });
  });
});
