export type AtmospherePhase =
  | 'dawn'
  | 'morning'
  | 'day'
  | 'golden_hour'
  | 'sunset'
  | 'night';

export interface AtmosphereState {
  phase: AtmospherePhase;
  fraction: number;
  skyTop: number;
  skyMid: number;
  skyBottom: number;
  horizonGlowColor: number;
  horizonGlowAlpha: number;
  starsAlpha: number;
  sunAlpha: number;
  sunXPercent: number;
  sunYPercent: number;
  sunColor: number;
  sunScale: number;
  moonAlpha: number;
  moonXPercent: number;
  moonYPercent: number;
  moonScale: number;
  layerFarTint: number;
  layerMidTint: number;
  layerNearTint: number;
  propTint: number;
  fogColor: number;
  fogAlpha: number;
  localLightMultiplier: number;
  ambientBrightnessFloor: number;
  gradeColor: number;
  gradeAlpha: number;
  vignetteAlpha: number;
}

export interface AtmosphereKeyframe {
  phase: AtmospherePhase;
  centerFraction: number;
  state: AtmosphereState;
}

export function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export function lerpColor(c1: number, c2: number, t: number): number {
  const clampT = Math.max(0, Math.min(1, t));
  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;

  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;

  const r = Math.round(r1 + (r2 - r1) * clampT);
  const g = Math.round(g1 + (g2 - g1) * clampT);
  const b = Math.round(b1 + (b2 - b1) * clampT);

  return (r << 16) | (g << 8) | b;
}

export const ATMOSPHERE_KEYFRAMES: AtmosphereKeyframe[] = [
  {
    phase: 'night',
    centerFraction: 0.04167, // 01:00
    state: {
      phase: 'night',
      fraction: 0.04167,
      skyTop: 0x050814,
      skyMid: 0x0d152c,
      skyBottom: 0x19223e,
      horizonGlowColor: 0x406085,
      horizonGlowAlpha: 0.18,
      starsAlpha: 0.95,
      sunAlpha: 0.0,
      sunXPercent: 0.05,
      sunYPercent: 1.25,
      sunColor: 0xffaa66,
      sunScale: 0.8,
      moonAlpha: 0.92,
      moonXPercent: 0.78,
      moonYPercent: 0.22,
      moonScale: 1.0,
      layerFarTint: 0x6a7d9b,
      layerMidTint: 0x889bb8,
      layerNearTint: 0x9eafc8,
      propTint: 0xa0b0c6,
      fogColor: 0x324765,
      fogAlpha: 0.4,
      localLightMultiplier: 1.0,
      ambientBrightnessFloor: 0.65,
      gradeColor: 0x121c38,
      gradeAlpha: 0.16,
      vignetteAlpha: 0.52,
    },
  },
  {
    phase: 'dawn',
    centerFraction: 0.25, // 06:00
    state: {
      phase: 'dawn',
      fraction: 0.25,
      skyTop: 0x181e3a,
      skyMid: 0x3c3456,
      skyBottom: 0x8a5464,
      horizonGlowColor: 0xf49a82,
      horizonGlowAlpha: 0.45,
      starsAlpha: 0.22,
      sunAlpha: 0.65,
      sunXPercent: 0.18,
      sunYPercent: 0.72,
      sunColor: 0xffaa77,
      sunScale: 0.9,
      moonAlpha: 0.25,
      moonXPercent: 0.88,
      moonYPercent: 0.18,
      moonScale: 0.85,
      layerFarTint: 0x9b8aa8,
      layerMidTint: 0xb8a4bd,
      layerNearTint: 0xd0bfcf,
      propTint: 0xd4c6d4,
      fogColor: 0x6b5b7b,
      fogAlpha: 0.46,
      localLightMultiplier: 0.82,
      ambientBrightnessFloor: 0.76,
      gradeColor: 0x523548,
      gradeAlpha: 0.12,
      vignetteAlpha: 0.44,
    },
  },
  {
    phase: 'morning',
    centerFraction: 0.375, // 09:00
    state: {
      phase: 'morning',
      fraction: 0.375,
      skyTop: 0x1b3562,
      skyMid: 0x356598,
      skyBottom: 0x6e9ec4,
      horizonGlowColor: 0xffe4b5,
      horizonGlowAlpha: 0.26,
      starsAlpha: 0.0,
      sunAlpha: 0.92,
      sunXPercent: 0.35,
      sunYPercent: 0.38,
      sunColor: 0xfff0aa,
      sunScale: 1.0,
      moonAlpha: 0.0,
      moonXPercent: 0.96,
      moonYPercent: 0.1,
      moonScale: 0.7,
      layerFarTint: 0xb0cce6,
      layerMidTint: 0xcfe0f2,
      layerNearTint: 0xe5effa,
      propTint: 0xedf4fc,
      fogColor: 0x8fb4d4,
      fogAlpha: 0.3,
      localLightMultiplier: 0.42,
      ambientBrightnessFloor: 0.88,
      gradeColor: 0xfff8eb,
      gradeAlpha: 0.04,
      vignetteAlpha: 0.36,
    },
  },
  {
    phase: 'day',
    centerFraction: 0.5625, // 13:30
    state: {
      phase: 'day',
      fraction: 0.5625,
      skyTop: 0x1e4f88,
      skyMid: 0x3c7ab8,
      skyBottom: 0x7bb6e0,
      horizonGlowColor: 0xffffff,
      horizonGlowAlpha: 0.14,
      starsAlpha: 0.0,
      sunAlpha: 1.0,
      sunXPercent: 0.52,
      sunYPercent: 0.18,
      sunColor: 0xfffae0,
      sunScale: 1.08,
      moonAlpha: 0.0,
      moonXPercent: 0.05,
      moonYPercent: 0.9,
      moonScale: 0.6,
      layerFarTint: 0xcce3f5,
      layerMidTint: 0xe2effa,
      layerNearTint: 0xf5f9fd,
      propTint: 0xffffff,
      fogColor: 0xb2d6f0,
      fogAlpha: 0.22,
      localLightMultiplier: 0.2,
      ambientBrightnessFloor: 0.95,
      gradeColor: 0xffffff,
      gradeAlpha: 0.0,
      vignetteAlpha: 0.32,
    },
  },
  {
    phase: 'golden_hour',
    centerFraction: 0.72917, // 17:30
    state: {
      phase: 'golden_hour',
      fraction: 0.72917,
      skyTop: 0x20355b,
      skyMid: 0x5b4a68,
      skyBottom: 0xbf6c46,
      horizonGlowColor: 0xffa834,
      horizonGlowAlpha: 0.56,
      starsAlpha: 0.06,
      sunAlpha: 0.96,
      sunXPercent: 0.7,
      sunYPercent: 0.58,
      sunColor: 0xffb84d,
      sunScale: 1.05,
      moonAlpha: 0.18,
      moonXPercent: 0.28,
      moonYPercent: 0.32,
      moonScale: 0.8,
      layerFarTint: 0xd9a882,
      layerMidTint: 0xedc29d,
      layerNearTint: 0xfce0c5,
      propTint: 0xffe4cc,
      fogColor: 0xba7c59,
      fogAlpha: 0.36,
      localLightMultiplier: 0.65,
      ambientBrightnessFloor: 0.82,
      gradeColor: 0xbf6420,
      gradeAlpha: 0.14,
      vignetteAlpha: 0.38,
    },
  },
  {
    phase: 'sunset',
    centerFraction: 0.8125, // 19:30
    state: {
      phase: 'sunset',
      fraction: 0.8125,
      skyTop: 0x141832,
      skyMid: 0x42264c,
      skyBottom: 0x943d3b,
      horizonGlowColor: 0xee6038,
      horizonGlowAlpha: 0.48,
      starsAlpha: 0.42,
      sunAlpha: 0.45,
      sunXPercent: 0.82,
      sunYPercent: 0.78,
      sunColor: 0xe84a28,
      sunScale: 0.95,
      moonAlpha: 0.52,
      moonXPercent: 0.52,
      moonYPercent: 0.28,
      moonScale: 0.9,
      layerFarTint: 0x9c708a,
      layerMidTint: 0xb889a2,
      layerNearTint: 0xd4aabf,
      propTint: 0xddb8cb,
      fogColor: 0x6a3854,
      fogAlpha: 0.42,
      localLightMultiplier: 0.92,
      ambientBrightnessFloor: 0.72,
      gradeColor: 0x5e1e36,
      gradeAlpha: 0.16,
      vignetteAlpha: 0.46,
    },
  },
];

export function interpolateAtmosphereStates(
  s1: AtmosphereState,
  s2: AtmosphereState,
  t: number,
  resultingPhase: AtmospherePhase,
  fraction: number
): AtmosphereState {
  return {
    phase: resultingPhase,
    fraction,
    skyTop: lerpColor(s1.skyTop, s2.skyTop, t),
    skyMid: lerpColor(s1.skyMid, s2.skyMid, t),
    skyBottom: lerpColor(s1.skyBottom, s2.skyBottom, t),
    horizonGlowColor: lerpColor(s1.horizonGlowColor, s2.horizonGlowColor, t),
    horizonGlowAlpha: lerpNumber(s1.horizonGlowAlpha, s2.horizonGlowAlpha, t),
    starsAlpha: lerpNumber(s1.starsAlpha, s2.starsAlpha, t),
    sunAlpha: lerpNumber(s1.sunAlpha, s2.sunAlpha, t),
    sunXPercent: lerpNumber(s1.sunXPercent, s2.sunXPercent, t),
    sunYPercent: lerpNumber(s1.sunYPercent, s2.sunYPercent, t),
    sunColor: lerpColor(s1.sunColor, s2.sunColor, t),
    sunScale: lerpNumber(s1.sunScale, s2.sunScale, t),
    moonAlpha: lerpNumber(s1.moonAlpha, s2.moonAlpha, t),
    moonXPercent: lerpNumber(s1.moonXPercent, s2.moonXPercent, t),
    moonYPercent: lerpNumber(s1.moonYPercent, s2.moonYPercent, t),
    moonScale: lerpNumber(s1.moonScale, s2.moonScale, t),
    layerFarTint: lerpColor(s1.layerFarTint, s2.layerFarTint, t),
    layerMidTint: lerpColor(s1.layerMidTint, s2.layerMidTint, t),
    layerNearTint: lerpColor(s1.layerNearTint, s2.layerNearTint, t),
    propTint: lerpColor(s1.propTint, s2.propTint, t),
    fogColor: lerpColor(s1.fogColor, s2.fogColor, t),
    fogAlpha: lerpNumber(s1.fogAlpha, s2.fogAlpha, t),
    localLightMultiplier: lerpNumber(s1.localLightMultiplier, s2.localLightMultiplier, t),
    ambientBrightnessFloor: lerpNumber(s1.ambientBrightnessFloor, s2.ambientBrightnessFloor, t),
    gradeColor: lerpColor(s1.gradeColor, s2.gradeColor, t),
    gradeAlpha: lerpNumber(s1.gradeAlpha, s2.gradeAlpha, t),
    vignetteAlpha: lerpNumber(s1.vignetteAlpha, s2.vignetteAlpha, t),
  };
}
