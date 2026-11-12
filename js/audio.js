/*
 * audio.js: a small built-in synth (Web Audio API) so you can hear notes, chords and progressions.
 * No sound files needed.
 */
(function () {
  'use strict';
  let ctx = null;
  let master = null;
  let voices = [];

  function ac() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.6;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  /** A plucked-string-ish tone. */
  function pluck(midi, delay = 0, duration = 1.6, volume = 0.22) {
    const c = ac();
    const t = c.currentTime + delay;
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
      o.stop(t + duration + 0.05);
      voices.push(o);
      o.onended = () => { voices = voices.filter((v) => v !== o); };
    });
  }

  /** Play several notes as a strum (low to high). */
  function strum(midis, { gap = 0.035, duration = 1.8 } = {}) {
    midis.slice().sort((a, b) => a - b).forEach((m, i) => pluck(m, i * gap, duration, 0.16));
  }

  /** Play notes one after another. */
  function arpeggio(midis, { gap = 0.28, duration = 0.9 } = {}) {
    midis.forEach((m, i) => pluck(m, i * gap, duration));
  }

  function stopAll() {
    voices.forEach((o) => { try { o.stop(); } catch (e) { /* already stopped */ } });
    voices = [];
  }

  window.Sound = { pluck, strum, arpeggio, stopAll };
})();
