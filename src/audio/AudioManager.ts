import type { CombatEvent } from '../combat/CombatSystem';
import type { RoundSnapshot } from '../game/RoundManager';
import type { WeaponDefinition } from '../weapons/WeaponTypes';

export class AudioManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambient: OscillatorNode | null = null;

  public initialize(): void {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.context.destination);
      this.startAmbient();
    }

    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
  }

  public handleCombatEvent(event: CombatEvent): void {
    if (event.type === 'shot') {
      this.playWeaponFire(event.shot.weapon);
      if (event.result.hit) {
        this.playImpact();
      }
      return;
    }

    if (event.result.damage) {
      this.playHit(event.result.damage.killed);
    }
  }

  public handleRound(snapshot: RoundSnapshot): void {
    if (snapshot.phase === 'active') {
      this.playRoundStart();
    } else if (snapshot.phase === 'round-end') {
      this.playRoundEnd(snapshot.winner === 'player');
    }
  }

  public playReload(): void {
    this.playTone(220, 0.08, 'square', 0.12);
    this.playTone(330, 0.1, 'square', 0.08, 0.09);
  }

  public playFootstep(): void {
    this.playNoise(0.055, 0.075, 850);
  }

  public dispose(): void {
    this.ambient?.stop();
    void this.context?.close();
    this.context = null;
    this.master = null;
  }

  private playWeaponFire(weapon: WeaponDefinition): void {
    const pitch = weapon.category === 'sniper' ? 92 : weapon.category === 'rifle' ? 128 : 174;
    const duration = weapon.category === 'sniper' ? 0.22 : 0.13;
    this.playTone(pitch, duration, 'sawtooth', 0.35);
    this.playNoise(duration, 0.28, 500);
  }

  private playImpact(): void {
    this.playTone(740, 0.07, 'triangle', 0.09);
  }

  private playHit(kill: boolean): void {
    this.playTone(kill ? 880 : 560, kill ? 0.16 : 0.08, 'sine', 0.16);
  }

  private playRoundStart(): void {
    this.playTone(460, 0.11, 'sine', 0.11);
    this.playTone(690, 0.18, 'sine', 0.11, 0.1);
  }

  private playRoundEnd(won: boolean): void {
    this.playTone(won ? 580 : 180, 0.22, 'sine', 0.16);
    this.playTone(won ? 860 : 130, 0.32, 'sine', 0.12, 0.16);
  }

  private playTone(frequency: number, duration: number, type: OscillatorType, volume: number, delay = 0): void {
    if (!this.context || !this.master) {
      return;
    }

    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private playNoise(duration: number, volume: number, filterFrequency: number): void {
    if (!this.context || !this.master) {
      return;
    }

    const buffer = this.context.createBuffer(1, Math.max(1, Math.floor(this.context.sampleRate * duration)), this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }

    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;
    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();
  }

  private startAmbient(): void {
    if (!this.context || !this.master) {
      return;
    }

    this.ambient = this.context.createOscillator();
    const gain = this.context.createGain();
    this.ambient.type = 'sine';
    this.ambient.frequency.value = 48;
    gain.gain.value = 0.022;
    this.ambient.connect(gain);
    gain.connect(this.master);
    this.ambient.start();
  }
}

