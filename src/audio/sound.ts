/**
 * Som 100% gerado por código (Web Audio): nenhum arquivo de áudio.
 * Um fundo ambiente que fica mais tenso conforme o mundo piora, e efeitos curtos para cada acontecimento.
 */
export type Sfx =
  | 'bubble' | 'dilemma' | 'choose' | 'evolve' | 'betrayal' | 'war' | 'lost' | 'stage'
  | 'rival' | 'alarm' | 'echo' | 'attack' | 'absorb' | 'click' | 'ending' | 'goal';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private filter!: BiquadFilterNode;
  private dissonance!: GainNode;
  private beatTimer: number | null = null;
  private bellTimer: number | null = null;
  private tension = 0;
  private enabled = true;
  private volume = 0.6;
  private ducked = false;
  private droneOn = false;

  /** Navegadores só liberam áudio depois de um gesto do jogador. */
  unlock() {
    if (!this.enabled) return;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.music = this.ctx.createGain();
      this.music.gain.value = 0;
      this.music.connect(this.master);
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 0.9;
      this.sfx.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(on ? this.volume : 0, this.ctx.currentTime, 0.1);
    if (!on) this.stopTimers();
    else if (this.droneOn) this.startTimers();
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.ctx && this.enabled) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }

  /** Liga o fundo ambiente (durante a partida). */
  startDrone() {
    this.unlock();
    if (!this.ctx || this.droneOn) return;
    this.droneOn = true;
    const c = this.ctx;
    this.filter = c.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 400;
    this.filter.Q.value = 2;
    this.filter.connect(this.music);
    const voice = (freq: number, type: OscillatorType, gain: number, dest: AudioNode) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g).connect(dest);
      o.start();
      return o;
    };
    voice(55, 'sine', 0.5, this.filter);
    voice(82.4, 'triangle', 0.22, this.filter);
    voice(110.3, 'sine', 0.12, this.filter);
    // A dissonância cresce com a tensão
    this.dissonance = c.createGain();
    this.dissonance.gain.value = 0;
    this.dissonance.connect(this.filter);
    voice(58.3, 'sawtooth', 0.12, this.dissonance);
    voice(77.8, 'triangle', 0.2, this.dissonance);
    // Respiração lenta do filtro
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain).connect(this.filter.frequency);
    lfo.start();
    this.music.gain.setTargetAtTime(this.ducked ? 0.05 : 0.16, c.currentTime, 1.5);
    this.applyTension();
    this.startTimers();
  }

  stopDrone() {
    if (!this.ctx || !this.droneOn) return;
    this.music.gain.setTargetAtTime(0, this.ctx.currentTime, 0.6);
    this.stopTimers();
  }

  /** 0 = calmo, 1 = colapso. */
  setTension(t: number) {
    const n = Math.max(0, Math.min(1, t));
    if (Math.abs(n - this.tension) < 0.01) return;
    this.tension = n;
    this.applyTension();
  }

  /** Abaixa o fundo enquanto o jogo está congelado (dilema, pausa, painel). */
  setDuck(d: boolean) {
    this.ducked = d;
    if (this.ctx && this.droneOn) this.music.gain.setTargetAtTime(d ? 0.05 : 0.16, this.ctx.currentTime, 0.4);
  }

  private applyTension() {
    if (!this.ctx || !this.droneOn) return;
    const t = this.ctx.currentTime;
    this.filter.frequency.setTargetAtTime(260 + 1100 * this.tension, t, 2);
    this.dissonance.gain.setTargetAtTime(0.9 * this.tension ** 1.5, t, 2);
  }

  private startTimers() {
    this.stopTimers();
    // Batimento cardíaco quando a situação aperta
    const beat = () => {
      if (this.tension > 0.55 && !this.ducked) {
        this.tone(62, 0.18, 'sine', 0.5, 0.005, 0.16, 38, this.music);
        setTimeout(() => this.tone(58, 0.14, 'sine', 0.35, 0.005, 0.12, 36, this.music), 180);
      }
      this.beatTimer = window.setTimeout(beat, 1400 - 600 * this.tension);
    };
    // Sinos esparsos e calmos quando o mundo está em paz
    const bell = () => {
      if (this.tension < 0.45 && !this.ducked) {
        const notes = [523.3, 587.3, 659.3, 784, 880, 1046.5];
        this.tone(notes[Math.floor(Math.random() * notes.length)], 2.4, 'sine', 0.05, 0.02, 2.3, undefined, this.music);
      }
      this.bellTimer = window.setTimeout(bell, 5000 + Math.random() * 7000);
    };
    this.beatTimer = window.setTimeout(beat, 1500);
    this.bellTimer = window.setTimeout(bell, 3000);
  }

  private stopTimers() {
    if (this.beatTimer) clearTimeout(this.beatTimer);
    if (this.bellTimer) clearTimeout(this.bellTimer);
    this.beatTimer = this.bellTimer = null;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, attack = 0.01, release = dur, freqEnd?: number, dest?: AudioNode, delay = 0) {
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
    o.connect(g).connect(dest ?? this.sfx);
    o.start(t);
    o.stop(t + attack + release + 0.05);
  }

  private noise(dur: number, filterType: BiquadFilterType, freq: number, gain: number, delay = 0) {
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx;
    const t = c.currentTime + delay;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t);
  }

  play(name: Sfx) {
    if (!this.enabled) return;
    this.unlock();
    if (!this.ctx) return;
    switch (name) {
      case 'click': this.tone(1200, 0.03, 'sine', 0.05, 0.002, 0.03); break;
      case 'bubble':
        this.tone(660, 0.12, 'sine', 0.14, 0.005, 0.12, 990);
        this.tone(1320, 0.08, 'sine', 0.05, 0.005, 0.1, undefined, undefined, 0.05);
        break;
      case 'dilemma':
        this.tone(110, 1.2, 'triangle', 0.18, 0.3, 1.1);
        this.tone(880, 1.4, 'sine', 0.08, 0.01, 1.4, undefined, undefined, 0.15);
        this.tone(1320, 1.0, 'sine', 0.03, 0.01, 1.0, undefined, undefined, 0.15);
        break;
      case 'choose':
        for (const f of [392, 493.9, 587.3]) this.tone(f, 0.5, 'triangle', 0.05, 0.02, 0.5);
        break;
      case 'evolve':
        [440, 554.4, 659.3, 880].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.09, 0.005, 0.3, undefined, undefined, i * 0.08));
        break;
      case 'betrayal':
        this.tone(220, 0.9, 'sawtooth', 0.07, 0.02, 0.9, 110);
        this.tone(233, 0.9, 'sawtooth', 0.07, 0.02, 0.9, 116);
        this.noise(0.4, 'bandpass', 900, 0.06);
        break;
      case 'war':
        this.noise(1.8, 'lowpass', 180, 0.35);
        this.tone(48, 1.6, 'sine', 0.4, 0.02, 1.6, 30);
        this.noise(1.2, 'lowpass', 120, 0.25, 0.5);
        break;
      case 'lost': this.tone(330, 0.6, 'triangle', 0.12, 0.01, 0.6, 165); break;
      case 'stage':
        for (const f of [261.6, 329.6, 392, 523.3]) this.tone(f, 1.6, 'sine', 0.06, 0.2, 1.4);
        break;
      case 'rival':
        this.tone(988, 0.07, 'square', 0.04, 0.003, 0.07);
        this.tone(740, 0.09, 'square', 0.04, 0.003, 0.09, undefined, undefined, 0.1);
        this.tone(554, 0.22, 'square', 0.03, 0.003, 0.2, undefined, undefined, 0.22);
        break;
      case 'alarm':
        for (let i = 0; i < 3; i++) this.tone(440, 0.12, 'square', 0.05, 0.005, 0.12, undefined, undefined, i * 0.22);
        break;
      case 'echo':
        this.tone(1046.5, 1.6, 'sine', 0.05, 0.3, 1.4);
        this.tone(1568, 1.4, 'sine', 0.025, 0.4, 1.2);
        this.tone(261.6, 1.8, 'triangle', 0.05, 0.4, 1.5);
        break;
      case 'attack':
        this.noise(0.3, 'bandpass', 1400, 0.12);
        this.tone(180, 0.35, 'sawtooth', 0.06, 0.005, 0.35, 70);
        break;
      case 'absorb':
        this.tone(220, 0.8, 'sine', 0.1, 0.05, 0.8, 880);
        for (const f of [523.3, 659.3, 784]) this.tone(f, 1.2, 'sine', 0.04, 0.1, 1.1, undefined, undefined, 0.6);
        break;
      case 'goal':
        [659.3, 784, 1046.5].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.07, 0.01, 0.5, undefined, undefined, i * 0.1));
        break;
      case 'ending':
        for (const f of [130.8, 196, 261.6, 329.6, 392]) this.tone(f, 4, 'sine', 0.07, 1.2, 3.5);
        break;
    }
  }
}

export const sound = new SoundEngine();
