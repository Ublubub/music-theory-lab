/*
 * audio.js: built-in instruments (Web Audio API), so no sound files are needed.
 *
 *   guitar: Karplus-Strong plucked-string synthesis (a burst of noise fed through a tuned delay loop,
 *           which is how a real string "filters" the pluck into a pitch)
 *   piano:  additive synthesis (several harmonics with a hammer-like envelope)
 *   synth:  the simple triangle-wave tone from v0.1
 */
(function () {
  'use strict';
  let ctx = null;
  let master = null;
  let instrument = 'guitar';
  let active = []; // sources currently scheduled, so Stop can silence them
  const bufferCache = new Map();

  function ac() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.7;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  const track = (node, until) => {
    active.push(node);
    node.onended = () => { active = active.filter((n) => n !== node); };
    node.stop(until);
  };

  // --- Guitar (Karplus-Strong) ---------------------------------------------------
  function stringBuffer(midi) {
    if (bufferCache.has(midi)) return bufferCache.get(midi);
    const c = ac();
    const sr = c.sampleRate;
    const period = Math.max(2, Math.round(sr / freq(midi)));
    const length = Math.floor(sr * 3);
    const buf = c.createBuffer(1, length, sr);
    const d = buf.getChannelData(0);
    // Softened noise burst = the pick hitting the string.
    let prev = 0;
    for (let i = 0; i < period; i++) { prev = 0.6 * prev + 0.4 * (Math.random() * 2 - 1); d[i] = prev; }
    // Higher strings lose energy faster, like real ones.
    const decay = 0.996 - Math.max(0, midi - 52) * 0.00012;
    for (let i = period; i < length; i++) d[i] = decay * 0.5 * (d[i - period] + d[i - period - 1 >= 0 ? i - period - 1 : 0]);
    const entry = { buf, rate: freq(midi) / (sr / period) }; // fine-tune: the period was rounded
    bufferCache.set(midi, entry);
    return entry;
  }

  function guitarNote(midi, t, duration, volume) {
    const c = ac();
    const { buf, rate } = stringBuffer(midi);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = c.createGain();
    g.gain.setValueAtTime(volume * 1.6, t);
    g.gain.setTargetAtTime(0, t + duration, 0.08);
    const body = c.createBiquadFilter(); // a little "wooden body" resonance
    body.type = 'peaking'; body.frequency.value = 220; body.Q.value = 1; body.gain.value = 4;
    src.connect(body).connect(g).connect(master);
    src.start(t);
    track(src, t + duration + 0.5);
  }

  // --- Piano (additive) -----------------------------------------------------------
  function pianoNote(midi, t, duration, volume) {
    const c = ac();
    const f = freq(midi);
    const out = c.createGain();
    const len = Math.min(duration + 1.5, 4 - (midi - 48) * 0.03);
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(volume, t + 0.004);
    out.gain.exponentialRampToValueAtTime(volume * 0.35, t + 0.25);
    out.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.6, len));
    out.connect(master);
    [[1, 1], [2, 0.45], [3, 0.22], [4, 0.12], [5, 0.06]].forEach(([h, a], i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = f * h * (1 + i * 0.0004); // slight inharmonicity, like real piano strings
      g.gain.value = a;
      o.connect(g).connect(out);
      o.start(t);
      track(o, t + Math.max(0.6, len) + 0.05);
    });
  }

  // --- Synth (v0.1) -------------------------------------------------------------
  function synthNote(midi, t, duration, volume) {
    const c = ac();
    const out = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(9000, freq(midi) * 8), t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(300, freq(midi) * 1.5), t + duration);
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(volume, t + 0.006);
    out.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    filter.connect(out).connect(master);
    [['triangle', 1, 1], ['sawtooth', 1, 0.18], ['sine', 2, 0.25]].forEach(([type, mult, g]) => {
      const o = c.createOscillator();
      const og = c.createGain();
      o.type = type;
      o.frequency.value = freq(midi) * mult;
      og.gain.value = g;
      o.connect(og).connect(filter);
      o.start(t);
      track(o, t + duration + 0.05);
    });
  }

  const VOICES = { guitar: guitarNote, piano: pianoNote, synth: synthNote };

  function pluck(midi, delay = 0, duration = 1.6, volume = 0.22) {
    const c = ac();
    VOICES[instrument](midi, c.currentTime + delay, duration, volume);
  }

  /** Several notes as a strum (low to high). */
  function strum(midis, { gap = 0.035, duration = 1.8 } = {}) {
    const vol = Math.max(0.09, 0.2 - midis.length * 0.015);
    midis.slice().sort((a, b) => a - b).forEach((m, i) => pluck(m, i * gap, duration, vol));
  }

  /** Notes one after another. */
  function arpeggio(midis, { gap = 0.28, duration = 0.9 } = {}) {
    midis.forEach((m, i) => pluck(m, i * gap, duration));
  }

  function stopAll() {
    active.forEach((n) => { try { n.stop(); } catch (e) { /* already stopped */ } });
    active = [];
  }

  window.Sound = {
    pluck, strum, arpeggio, stopAll,
    setInstrument: (name) => { if (VOICES[name]) instrument = name; },
    INSTRUMENTS: { guitar: 'Guitar', piano: 'Piano', synth: 'Synth' },
    context: ac,
  };
})();
