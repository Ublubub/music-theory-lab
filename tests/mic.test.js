// Checks the microphone pitch detector with synthetic notes (no real microphone needed).
const test = require('node:test');
const assert = require('node:assert/strict');

globalThis.window = globalThis.window || {};
require('../js/mic.js');
const { detect } = globalThis.window.Mic;

function tone(freq, { sr = 44100, n = 2048, harmonics = [1, 0.5, 0.3] } = {}) {
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    buf[i] = harmonics.reduce((s, a, h) => s + a * Math.sin((2 * Math.PI * freq * (h + 1) * i) / sr), 0) * 0.3;
  }
  return buf;
}

test('detects guitar-range notes', () => {
  // [frequency, expected MIDI]: low E, A, G, high E, a slightly sharp A
  [[82.41, 40], [110, 45], [196, 55], [329.63, 64], [442, 69]].forEach(([f, midi]) => {
    const r = detect(tone(f), 44100);
    assert.ok(r, `no pitch for ${f} Hz`);
    assert.equal(r.midi, midi, `${f} Hz`);
  });
});

test('reports cents and ignores silence', () => {
  const r = detect(tone(446.0), 44100); // ~ +23 cents above A4
  assert.ok(r.cents > 10 && r.cents < 35, `cents ${r.cents}`);
  assert.equal(detect(new Float32Array(2048), 44100), null);
});
