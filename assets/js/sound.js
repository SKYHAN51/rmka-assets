/* ==========================================================================
   Sound — synthesized with WebAudio, nothing to download.
   Projector whirr + mains hum as ambience, a scroll-driven whoosh and a
   clapperboard snap. Off by default; starts only after a click.
   ========================================================================== */
(() => {
  let ctx = null;
  let master, whooshGain, whooshFilter, noiseBuf;
  let on = false;

  const makeNoise = () => {
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  };
  const noise = () => {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    return src;
  };

  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    noiseBuf = makeNoise();

    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // Projector: band-passed noise chopped at 24 frames per second
    const proj = noise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400;
    bp.Q.value = 0.9;
    const clatter = ctx.createGain();
    clatter.gain.value = 0.018;
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 24;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.014;
    lfo.connect(lfoDepth).connect(clatter.gain);
    proj.connect(bp).connect(clatter).connect(master);

    // Low mains hum + motor
    const hum = ctx.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 50;
    const hum2 = ctx.createOscillator();
    hum2.type = 'triangle';
    hum2.frequency.value = 100.5;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.035;
    hum.connect(humGain);
    hum2.connect(humGain);
    humGain.connect(master);

    // Whoosh follows scroll velocity
    const wn = noise();
    whooshFilter = ctx.createBiquadFilter();
    whooshFilter.type = 'bandpass';
    whooshFilter.frequency.value = 400;
    whooshFilter.Q.value = 0.7;
    whooshGain = ctx.createGain();
    whooshGain.gain.value = 0;
    wn.connect(whooshFilter).connect(whooshGain).connect(master);

    [proj, lfo, hum, hum2, wn].forEach((n) => n.start());
    return true;
  }

  function set(state) {
    if (state && !ctx && !init()) return false;
    if (!ctx) return false;
    on = state;
    if (on && ctx.state === 'suspended') ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.25);
    return on;
  }

  function velocity(v) {
    if (!on || !ctx) return;
    const a = Math.min(1, Math.abs(v) / 60);
    whooshGain.gain.setTargetAtTime(a * 0.16, ctx.currentTime, 0.08);
    whooshFilter.frequency.setTargetAtTime(300 + a * 1600, ctx.currentTime, 0.1);
  }

  function clap() {
    if (!on || !ctx) return;
    const t = ctx.currentTime;
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    n.connect(hp).connect(g).connect(master);
    n.start(t);
    n.stop(t + 0.2);

    const thump = ctx.createOscillator();
    thump.frequency.setValueAtTime(140, t);
    thump.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.6, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    thump.connect(tg).connect(master);
    thump.start(t);
    thump.stop(t + 0.2);
  }

  window.RMKSound = { set, velocity, clap, get on() { return on; } };
})();
