import type { GameSettings } from '../systems/SettingsManager';
import {
  ATMOSPHERE_KEYFRAMES,
  interpolateAtmosphereStates,
  type AtmospherePhase,
  type AtmosphereState,
} from './atmospherePresets';

export class TimeOfDayService {
  /**
   * Computes normalized day fraction [0, 1) based on settings, clock, and optional dev override.
   */
  public static calculateDayFraction(
    date: Date,
    settings: GameSettings,
    gameElapsedSeconds = 0,
    overridePhase?: AtmospherePhase | null
  ): number {
    if (overridePhase) {
      return this.getNominalFractionForPhase(overridePhase);
    }

    if (settings.atmosphereMode === 'fixed') {
      return this.getNominalFractionForPhase(settings.fixedPhase);
    }

    if (settings.atmosphereMode === 'living_cycle') {
      const cycleSeconds = Math.max(60, settings.cycleMinutes * 60);
      const modSeconds = ((gameElapsedSeconds % cycleSeconds) + cycleSeconds) % cycleSeconds;
      return modSeconds / cycleSeconds;
    }

    // Default: local_time
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const millis = date.getMilliseconds();
    const totalSeconds = hours * 3600 + minutes * 60 + seconds + millis / 1000;
    return Math.max(0, Math.min(0.999999, totalSeconds / 86400));
  }

  /**
   * Returns human-readable nominal phase name for a day fraction.
   */
  public static getPhaseForFraction(fraction: number): AtmospherePhase {
    const f = ((fraction % 1) + 1) % 1;

    // Boundaries:
    // 05:00 = 5/24 = 0.20833
    // 07:00 = 7/24 = 0.29167
    // 11:00 = 11/24 = 0.45833
    // 16:30 = 16.5/24 = 0.68750
    // 18:30 = 18.5/24 = 0.77083
    // 21:00 = 21/24 = 0.87500
    if (f < 0.20833 || f >= 0.875) {
      return 'night';
    }
    if (f < 0.29167) {
      return 'dawn';
    }
    if (f < 0.45833) {
      return 'morning';
    }
    if (f < 0.6875) {
      return 'day';
    }
    if (f < 0.77083) {
      return 'golden_hour';
    }
    return 'sunset';
  }

  /**
   * Returns nominal center fraction for a given phase.
   */
  public static getNominalFractionForPhase(phase: AtmospherePhase): number {
    switch (phase) {
      case 'night':
        return 0.04167; // 01:00
      case 'dawn':
        return 0.25; // 06:00
      case 'morning':
        return 0.375; // 09:00
      case 'day':
        return 0.5625; // 13:30
      case 'golden_hour':
        return 0.72917; // 17:30
      case 'sunset':
        return 0.8125; // 19:30
    }
  }

  /**
   * Continuously samples and blends atmospheric properties across all 24 hours.
   */
  public static sampleAtmosphere(fraction: number): AtmosphereState {
    const f = ((fraction % 1) + 1) % 1;
    const currentPhase = this.getPhaseForFraction(f);

    const kf = ATMOSPHERE_KEYFRAMES;
    const n = kf.length;

    // Handle midnight wraparound between Sunset (0.8125) and Night (0.04167)
    const sunsetKf = kf[n - 1]; // Sunset
    const nightKf = kf[0]; // Night

    if (f >= sunsetKf.centerFraction || f < nightKf.centerFraction) {
      const wrapSpan = 1.0 - sunsetKf.centerFraction + nightKf.centerFraction;
      const distFromSunset =
        f >= sunsetKf.centerFraction
          ? f - sunsetKf.centerFraction
          : 1.0 - sunsetKf.centerFraction + f;
      const t = Math.max(0, Math.min(1, distFromSunset / wrapSpan));
      return interpolateAtmosphereStates(sunsetKf.state, nightKf.state, t, currentPhase, f);
    }

    // Between intermediate keyframes
    for (let i = 0; i < n - 1; i++) {
      const curr = kf[i];
      const next = kf[i + 1];
      if (f >= curr.centerFraction && f <= next.centerFraction) {
        const span = next.centerFraction - curr.centerFraction;
        const t = span <= 0 ? 0 : Math.max(0, Math.min(1, (f - curr.centerFraction) / span));
        return interpolateAtmosphereStates(curr.state, next.state, t, currentPhase, f);
      }
    }

    return { ...nightKf.state, fraction: f, phase: currentPhase };
  }

  /**
   * Parses debug/testing URL query param ?tod=dawn|morning|day|golden|sunset|night
   */
  public static parseUrlAtmosphereOverride(searchString?: string): AtmospherePhase | null {
    if (typeof window === 'undefined' && !searchString) return null;
    const query = searchString ?? (typeof window !== 'undefined' ? window.location.search : '');
    if (!query) return null;

    try {
      const params = new URLSearchParams(query);
      const val = params.get('tod')?.toLowerCase();
      if (!val) return null;
      if (val === 'dawn') return 'dawn';
      if (val === 'morning') return 'morning';
      if (val === 'day') return 'day';
      if (val === 'golden' || val === 'golden_hour') return 'golden_hour';
      if (val === 'sunset' || val === 'dusk') return 'sunset';
      if (val === 'night') return 'night';
      return null;
    } catch {
      return null;
    }
  }
}
