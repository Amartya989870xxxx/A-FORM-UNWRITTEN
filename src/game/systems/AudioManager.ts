import { AUDIO_PREF_KEY } from '../constants';

/**
 * Procedural Web Audio synthesizer providing ambient wind, evolving dark-fantasy
 * harmonic pads, and tactile gameplay SFX without external audio file dependencies.
 * Safely degrades in headless or audio-restricted environments.
 */
export class AudioManager {
  private static instance: AudioManager | null = null;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private muted = false;
  private ambientStarted = false;
  private groundedMode = false;
  private padTimer: number | null = null;

  public static getInstance(): AudioManager {
    if (!this.instance) {
      this.instance = new AudioManager();
    }
    return this.instance;
  }

  private constructor() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        this.muted = window.localStorage.getItem(AUDIO_PREF_KEY) === 'true';
      }
    } catch {
      this.muted = false;
    }
  }

  public init(): void {
    if (this.ctx || typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.65;
      this.masterGain.connect(this.ctx.destination);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.28;
      this.ambientGain.connect(this.masterGain);
    } catch {
      this.ctx = null;
    }
  }

  public unlockAndStartAmbient(grounded = false): void {
    this.groundedMode = grounded;
    if (!this.ctx) {
      this.init();
    }
    if (!this.ctx || !this.ambientGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (this.ambientStarted) return;
    this.ambientStarted = true;

    try {
      // Soft procedural wind bed via filtered noise buffer
      const bufferSize = this.ctx.sampleRate * 3;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.025 * white) / 1.025;
        lastOut = data[i];
        data[i] *= 1.8;
      }

      const windSource = this.ctx.createBufferSource();
      windSource.buffer = noiseBuffer;
      windSource.loop = true;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 340;
      bandpass.Q.value = 1.4;

      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 0.11;
      lfoGain.gain.value = 145;
      lfo.connect(lfoGain);
      lfoGain.connect(bandpass.frequency);

      const windGain = this.ctx.createGain();
      windGain.gain.value = 0.22;

      windSource.connect(bandpass);
      bandpass.connect(windGain);
      windGain.connect(this.ambientGain);

      windSource.start();
      lfo.start();

      // Slow melancholic harmonic pad progression
      this.scheduleAmbientChord();
      this.padTimer = window.setInterval(() => {
        this.scheduleAmbientChord();
      }, 6400);
    } catch {
      // Ignore Web Audio scheduling errors in restricted contexts
    }
  }

  public setGroundedMode(grounded: boolean): void {
    this.groundedMode = grounded;
  }

  public stopAmbient(): void {
    if (this.padTimer !== null) {
      window.clearInterval(this.padTimer);
      this.padTimer = null;
    }
    this.ambientStarted = false;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(AUDIO_PREF_KEY, String(this.muted));
      }
    } catch {
      // Ignore storage error
    }
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.65, this.ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  private scheduleAmbientChord(): void {
    if (!this.ctx || !this.ambientGain || this.muted || this.ctx.state !== 'running') return;
    // D minor / Aeolian ethereal voicings; drops an octave and warms after Weight restoration
    const unboundChords = [
      [293.66, 440.0, 659.25], // D4, A4, E5
      [261.63, 392.0, 587.33], // C4, G4, D5
      [233.08, 349.23, 523.25], // Bb3, F4, C5
      [220.0, 329.63, 493.88], // A3, E4, B4
    ];
    const groundedChords = [
      [146.83, 220.0, 349.23], // D3, A3, F4
      [130.81, 196.0, 293.66], // C3, G3, D4
      [116.54, 174.61, 261.63], // Bb2, F3, C4
      [110.0, 220.0, 329.63], // A2, A3, E4
    ];
    const pool = this.groundedMode ? groundedChords : unboundChords;
    const chord = pool[Math.floor(Math.random() * pool.length)];
    const now = this.ctx.currentTime;

    for (const freq of chord) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = this.groundedMode ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(this.groundedMode ? 720 : 1200, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.055, now + 2.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 6.1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientGain);

      osc.start(now);
      osc.stop(now + 6.2);
    }
  }

  public playJump(grounded: boolean): void {
    this.playToneSweep(
      grounded ? 135 : 260,
      grounded ? 255 : 490,
      grounded ? 0.16 : 0.22,
      grounded ? 'triangle' : 'sine',
      0.14
    );
  }

  public playFootstep(grounded: boolean): void {
    if (grounded) {
      this.playToneSweep(98, 52, 0.08, 'triangle', 0.12);
    } else {
      this.playToneSweep(380, 440, 0.06, 'sine', 0.035);
    }
  }

  public playFloatPulse(): void {
    this.playToneSweep(520, 660, 0.18, 'sine', 0.04);
  }

  public playLand(heavy: boolean): void {
    if (heavy) {
      this.playToneSweep(110, 42, 0.2, 'triangle', 0.22);
    } else {
      this.playToneSweep(210, 145, 0.1, 'sine', 0.06);
    }
  }

  public playGroundImpact(): void {
    this.playToneSweep(150, 34, 0.42, 'sawtooth', 0.28);
    this.playToneSweep(95, 28, 0.48, 'triangle', 0.34);
  }

  public playInteract(): void {
    this.playToneSweep(440, 660, 0.16, 'sine', 0.12);
  }

  public playDialogueBlip(): void {
    this.playToneSweep(540, 585, 0.045, 'sine', 0.045);
  }

  public playConduitAttune(): void {
    this.playChord([440, 554.37, 659.25, 880], 1.1, 'sine', 0.11);
  }

  public playMechanismActivate(): void {
    this.playToneSweep(120, 74, 0.38, 'sawtooth', 0.16);
    this.playChord([220, 329.63], 0.55, 'triangle', 0.11);
  }

  public playQuestChime(): void {
    this.playChord([329.63, 440, 587.33], 0.85, 'sine', 0.09);
  }

  public playRestorationSequence(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.groundedMode = true;
    // Ascending ethereal shimmer resolving into a deep grounded bronze chord
    this.playChord([293.66, 440, 587.33], 1.8, 'sine', 0.12);
    window.setTimeout(() => {
      this.playChord([349.23, 523.25, 659.25], 1.6, 'sine', 0.14);
    }, 900);
    window.setTimeout(() => {
      this.playToneSweep(180, 38, 0.85, 'triangle', 0.36);
      this.playChord([73.42, 146.83, 220.0, 293.66], 2.6, 'triangle', 0.18);
    }, 2050);
  }

  private playToneSweep(
    startFreq: number,
    endFreq: number,
    durationSec: number,
    type: OscillatorType,
    volume: number
  ): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = type;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + durationSec);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, now);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + durationSec + 0.02);
    } catch {
      // Ignore Web Audio errors
    }
  }

  private playChord(
    freqs: number[],
    durationSec: number,
    type: OscillatorType,
    volumePerVoice: number
  ): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    try {
      const now = this.ctx.currentTime;
      for (const freq of freqs) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(volumePerVoice, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + durationSec + 0.03);
      }
    } catch {
      // Ignore Web Audio errors
    }
  }
}
