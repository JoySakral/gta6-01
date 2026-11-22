// Synthesized sound: every effect is made with WebAudio oscillators and noise.
// No audio files, no network — the context starts on the first user gesture.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;
  let skidSource = null;
  let skidGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenPhase = 0;
  let sirenTimer = 0;
  let muted = false;

  function noiseBuffer() {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, duration, type, volume, slideTo) {
    if (!ensure()) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  function noiseBurst(duration, volume, filterFreq) {
    if (!ensure()) return;
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
    source.stop(ctx.currentTime + duration + 0.02);
  }

  return {
    ensure,
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    /** Continuous engine hum: speed01 0..1, on true while driving. */
    engine(speed01, on) {
      if (!ensure()) return;
      if (!engineOsc) {
        engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineFilter = ctx.createBiquadFilter();
        engineFilter.type = 'lowpass';
        engineFilter.frequency.value = 700;
        engineGain = ctx.createGain();
        engineGain.gain.value = 0;
        engineOsc.connect(engineFilter);
        engineFilter.connect(engineGain);
        engineGain.connect(master);
        engineOsc.start();
      }
      const target = on ? 0.05 + speed01 * 0.09 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(55 + speed01 * 165, ctx.currentTime, 0.08);
      engineFilter.frequency.setTargetAtTime(400 + speed01 * 900, ctx.currentTime, 0.1);
    },
    /** Tyre skid loop, on while the car slides. */
    skid(on) {
      if (!ensure()) return;
      if (on && !skidSource) {
        skidSource = ctx.createBufferSource();
        skidSource.buffer = noiseBuffer();
        skidSource.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 900;
        skidGain = ctx.createGain();
        skidGain.gain.value = 0.06;
        skidSource.connect(filter);
        filter.connect(skidGain);
        skidGain.connect(master);
        skidSource.start();
      } else if (!on && skidSource) {
        try { skidSource.stop(); } catch { /* already stopped */ }
        skidSource = null;
        skidGain = null;
      }
    },
    /** Two-tone police siren loop, on while police are close. Call every frame with dt. */
    siren(on, dt) {
      if (!ensure()) return;
      if (on) {
        if (!sirenOsc) {
          sirenOsc = ctx.createOscillator();
          sirenOsc.type = 'triangle';
          sirenGain = ctx.createGain();
          sirenGain.gain.value = 0.045;
          sirenOsc.connect(sirenGain);
          sirenGain.connect(master);
          sirenOsc.start();
          sirenPhase = 0;
          sirenTimer = 0;
        }
        sirenTimer += dt;
        if (sirenTimer > 0.45) {
          sirenTimer = 0;
          sirenPhase = 1 - sirenPhase;
        }
        sirenOsc.frequency.setTargetAtTime(sirenPhase ? 950 : 700, ctx.currentTime, 0.05);
      } else if (sirenOsc) {
        try { sirenOsc.stop(); } catch { /* already stopped */ }
        sirenOsc = null;
        sirenGain = null;
      }
    },
    punch() { noiseBurst(0.09, 0.35, 300); },
    thud() { blip(95, 0.18, 'sine', 0.5, 38); },
    crash() { noiseBurst(0.22, 0.4, 180); blip(70, 0.25, 'sine', 0.45, 30); },
    cash() { blip(880, 0.09, 'sine', 0.3); setTimeout(() => blip(1318, 0.14, 'sine', 0.3), 90); },
    pickup() { blip(520, 0.08, 'square', 0.16, 780); },
    missionDone() {
      const notes = [523, 659, 784, 1046];
      notes.forEach((freq, i) => setTimeout(() => blip(freq, 0.18, 'triangle', 0.3), i * 110));
    },
    busted() { blip(220, 0.5, 'sawtooth', 0.25, 110); },
    click() { blip(660, 0.05, 'square', 0.15); },
  };
}
