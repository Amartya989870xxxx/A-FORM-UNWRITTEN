import { describe, expect, it, beforeEach } from 'vitest';
import { SettingsManager, type GameSettings } from '../systems/SettingsManager';
import { TimeOfDayService } from '../time/TimeOfDayService';
import type { AtmospherePhase } from '../time/atmospherePresets';

describe('TimeOfDayService and SettingsManager', () => {
  beforeEach(() => {
    SettingsManager.reset();
  });

  describe('SettingsManager', () => {
    it('returns default settings when uninitialized', () => {
      const s = SettingsManager.load();
      expect(s.atmosphereMode).toBe('local_time');
      expect(s.fixedPhase).toBe('day');
      expect(s.cycleMinutes).toBe(24);
      expect(s.quality).toBe('high');
    });

    it('persists and updates partial settings', () => {
      const updated = SettingsManager.save({
        atmosphereMode: 'fixed',
        fixedPhase: 'sunset',
      });
      expect(updated.atmosphereMode).toBe('fixed');
      expect(updated.fixedPhase).toBe('sunset');

      const reloaded = SettingsManager.load();
      expect(reloaded.atmosphereMode).toBe('fixed');
      expect(reloaded.fixedPhase).toBe('sunset');
      expect(reloaded.cycleMinutes).toBe(24);
    });

    it('sanitizes corrupt or invalid input values', () => {
      const sanitized = SettingsManager.sanitize({
        atmosphereMode: 'invalid_mode',
        fixedPhase: 'invalid_phase',
        cycleMinutes: -99,
        quality: 'super_ultra',
      });
      expect(sanitized.atmosphereMode).toBe('local_time');
      expect(sanitized.fixedPhase).toBe('day');
      expect(sanitized.cycleMinutes).toBe(1); // Clamped minimum
      expect(sanitized.quality).toBe('high');
    });

    it('recovers gracefully from non-object inputs', () => {
      expect(SettingsManager.sanitize(null)).toEqual(expect.objectContaining({ atmosphereMode: 'local_time' }));
      expect(SettingsManager.sanitize('corrupt string')).toEqual(expect.objectContaining({ atmosphereMode: 'local_time' }));
    });
  });

  describe('TimeOfDayService calculation modes', () => {
    const baseSettings: GameSettings = {
      atmosphereMode: 'local_time',
      fixedPhase: 'golden_hour',
      cycleMinutes: 24,
      quality: 'high',
    };

    it('calculates exact day fraction in local_time mode', () => {
      // 12:00:00.000 -> 43200 / 86400 = 0.5
      const noon = new Date(2026, 0, 1, 12, 0, 0, 0);
      const fracNoon = TimeOfDayService.calculateDayFraction(noon, baseSettings);
      expect(fracNoon).toBeCloseTo(0.5, 4);

      // 06:00:00.000 -> 21600 / 86400 = 0.25
      const dawn = new Date(2026, 0, 1, 6, 0, 0, 0);
      const fracDawn = TimeOfDayService.calculateDayFraction(dawn, baseSettings);
      expect(fracDawn).toBeCloseTo(0.25, 4);
    });

    it('uses fixed phase nominal fraction when atmosphereMode is fixed', () => {
      const fixedSettings: GameSettings = {
        ...baseSettings,
        atmosphereMode: 'fixed',
        fixedPhase: 'night',
      };
      const anyDate = new Date();
      const frac = TimeOfDayService.calculateDayFraction(anyDate, fixedSettings);
      expect(frac).toBeCloseTo(TimeOfDayService.getNominalFractionForPhase('night'), 4);
    });

    it('calculates elapsed cycle progress in living_cycle mode', () => {
      const cycleSettings: GameSettings = {
        ...baseSettings,
        atmosphereMode: 'living_cycle',
        cycleMinutes: 10, // 600 seconds full cycle
      };
      const anyDate = new Date();
      // At 300 seconds elapsed out of 600 -> 0.5 fraction
      const fracHalf = TimeOfDayService.calculateDayFraction(anyDate, cycleSettings, 300);
      expect(fracHalf).toBeCloseTo(0.5, 4);

      // At 600 seconds elapsed -> wraps to 0.0
      const fracFull = TimeOfDayService.calculateDayFraction(anyDate, cycleSettings, 600);
      expect(fracFull).toBeCloseTo(0.0, 4);
    });

    it('dev override overrides all other mode calculations', () => {
      const anyDate = new Date();
      const frac = TimeOfDayService.calculateDayFraction(anyDate, baseSettings, 0, 'sunset');
      expect(frac).toBeCloseTo(TimeOfDayService.getNominalFractionForPhase('sunset'), 4);
    });
  });

  describe('Atmosphere phase categorization', () => {
    it('correctly maps fractional time of day to discrete phase labels', () => {
      expect(TimeOfDayService.getPhaseForFraction(0.04)).toBe('night'); // 01:00
      expect(TimeOfDayService.getPhaseForFraction(0.25)).toBe('dawn'); // 06:00
      expect(TimeOfDayService.getPhaseForFraction(0.38)).toBe('morning'); // 09:07
      expect(TimeOfDayService.getPhaseForFraction(0.55)).toBe('day'); // 13:12
      expect(TimeOfDayService.getPhaseForFraction(0.72)).toBe('golden_hour'); // 17:16
      expect(TimeOfDayService.getPhaseForFraction(0.82)).toBe('sunset'); // 19:40
      expect(TimeOfDayService.getPhaseForFraction(0.95)).toBe('night'); // 22:48
      expect(TimeOfDayService.getPhaseForFraction(0.01)).toBe('night'); // 00:14
    });
  });

  describe('Atmosphere sampling and continuous interpolation', () => {
    const phases: AtmospherePhase[] = ['dawn', 'morning', 'day', 'golden_hour', 'sunset', 'night'];

    it('samples valid color and alpha values across all phase nominal centers', () => {
      for (const p of phases) {
        const frac = TimeOfDayService.getNominalFractionForPhase(p);
        const state = TimeOfDayService.sampleAtmosphere(frac);

        expect(state.skyTop).toBeGreaterThanOrEqual(0);
        expect(state.skyTop).toBeLessThanOrEqual(0xffffff);
        expect(state.skyMid).toBeGreaterThanOrEqual(0);
        expect(state.skyBottom).toBeGreaterThanOrEqual(0);

        expect(state.starsAlpha).toBeGreaterThanOrEqual(0);
        expect(state.starsAlpha).toBeLessThanOrEqual(1);

        expect(state.sunAlpha).toBeGreaterThanOrEqual(0);
        expect(state.sunAlpha).toBeLessThanOrEqual(1);

        expect(state.localLightMultiplier).toBeGreaterThan(0);
        expect(state.ambientBrightnessFloor).toBeGreaterThanOrEqual(0.6); // Preserves readability
      }
    });

    it('interpolates seamlessly across midnight wrap (0.999 to 0.001)', () => {
      const statePreMidnight = TimeOfDayService.sampleAtmosphere(0.999);
      const statePostMidnight = TimeOfDayService.sampleAtmosphere(0.001);

      // Night colors should be closely matched across midnight without jumps
      expect(Math.abs(((statePreMidnight.skyTop >> 16) & 0xff) - ((statePostMidnight.skyTop >> 16) & 0xff))).toBeLessThanOrEqual(3);
      expect(Math.abs(statePreMidnight.starsAlpha - statePostMidnight.starsAlpha)).toBeLessThanOrEqual(0.05);
      expect(Number.isNaN(statePreMidnight.skyTop)).toBe(false);
      expect(Number.isNaN(statePostMidnight.skyTop)).toBe(false);
    });

    it('parses URL override query strings cleanly', () => {
      expect(TimeOfDayService.parseUrlAtmosphereOverride('?tod=dawn')).toBe('dawn');
      expect(TimeOfDayService.parseUrlAtmosphereOverride('?tod=golden')).toBe('golden_hour');
      expect(TimeOfDayService.parseUrlAtmosphereOverride('?tod=sunset')).toBe('sunset');
      expect(TimeOfDayService.parseUrlAtmosphereOverride('?tod=night')).toBe('night');
      expect(TimeOfDayService.parseUrlAtmosphereOverride('?tod=invalid')).toBe(null);
      expect(TimeOfDayService.parseUrlAtmosphereOverride('')).toBe(null);
    });
  });
});
