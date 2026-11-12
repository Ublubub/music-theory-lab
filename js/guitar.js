/*
 * guitar.js: guitar-specific logic: playable chord shapes (voicings) and scale positions.
 * Pure functions on MIDI numbers and pitch classes, testable with Node like theory.js.
 *
 * Tuning = array of open-string MIDI numbers, lowest string first (standard: [40,45,50,55,59,64]).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Guitar = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const mod = (n, m) => ((n % m) + m) % m;

  /**
   * Find playable shapes for a chord.
   * tones: [{ pc, role, deg }] chord tones (role: root/third/fifth/seventh/ext; deg = interval degree number)
   * opts:  { bassPc, maxFret = 15, span = 4, limit = 6, minStrings }
   * Returns [{ frets: [fret|null per string], minFret, maxFret, notes: [{ string, fret, midi, pc }] , score }]
   */
  function voicings(tuning, tones, opts = {}) {
    const { maxFret = 15, span = 4, limit = 6 } = opts;
    const pcs = new Set(tones.map((t) => t.pc));
    const rootPc = tones[0].pc;
    const bassPc = opts.bassPc == null ? rootPc : opts.bassPc;
    // Which tones must be present: root, 3rd (or sus tone), 7th and the top extension. The 5th is optional
    // in 4+ note chords; in 5–6 note chords the lower extensions (9, 11) are optional too.
    const highest = tones.reduce((a, t) => (t.deg > a.deg ? t : a), tones[0]);
    const required = new Set(tones.filter((t) => {
      if (tones.length <= 3) return true;
      if (t.role === 'fifth') return false;
      if (t.role === 'ext') return t === highest || tones.length === 4;
      return true;
    }).map((t) => t.pc));
    required.add(bassPc);
    const minStrings = opts.minStrings || Math.min(4, Math.max(2, pcs.size));
    const strings = tuning.length;
    const seen = new Map();

    for (let base = 0; base <= maxFret - 1; base++) {
      const lo = Math.max(1, base);
      const hi = Math.min(maxFret, lo + span - 1);
      const choice = new Array(strings).fill(null);
      const dfs = (s) => {
        if (s === strings) { consider(choice.slice()); return; }
        dfs(s + 1); // muted
        const options = base === 0 ? [0] : [];
        for (let f = lo; f <= hi; f++) options.push(f); // open strings only in the first window
        options.forEach((f) => {
          if (!pcs.has(mod(tuning[s] + f, 12))) return;
          choice[s] = f; dfs(s + 1); choice[s] = null;
        });
      };
      dfs(0);
    }

    function consider(frets) {
      const played = frets.map((f, s) => (f == null ? null : { string: s, fret: f, midi: tuning[s] + f, pc: mod(tuning[s] + f, 12) })).filter(Boolean);
      if (played.length < minStrings) return;
      const lowest = played.reduce((a, n) => (n.midi < a.midi ? n : a));
      if (lowest.pc !== bassPc) return;
      const have = new Set(played.map((n) => n.pc));
      for (const p of required) if (!have.has(p)) return;
      // Muted strings in the middle are hard to play cleanly: allow at most one.
      const first = played[0].string;
      const last = played[played.length - 1].string;
      const innerMutes = frets.slice(first, last + 1).filter((f) => f == null).length;
      if (innerMutes > 1) return;
      const fretted = played.filter((n) => n.fret > 0);
      const minF = fretted.length ? Math.min(...fretted.map((n) => n.fret)) : 0;
      const maxF = fretted.length ? Math.max(...fretted.map((n) => n.fret)) : 0;
      if (maxF - minF > 3) return;
      // Fingers: notes on the lowest fret can be barred (one finger) if 2+ strings share it.
      const atMin = fretted.filter((n) => n.fret === minF).length;
      const fingers = fretted.length - (atMin >= 2 ? atMin - 1 : 0);
      if (fingers > 4) return;
      const opens = played.filter((n) => n.fret === 0).length;
      let score = played.length * 2 + have.size * 1.5 + opens * 1.2 - minF * 0.25 - (maxF - minF) * 0.6 - innerMutes * 3;
      if (atMin >= 2 && fretted.length > atMin) score -= 1; // barre chord
      const key = frets.map((f) => (f == null ? 'x' : f)).join('-');
      if (!seen.has(key)) seen.set(key, { frets, minFret: minF, maxFret: maxF, notes: played, score: Math.round(score * 10) / 10 });
    }

    // Best shapes, spread out along the neck (like the CAGED shapes).
    const all = [...seen.values()].sort((a, b) => b.score - a.score);
    const picked = [];
    for (const v of all) {
      if (picked.length >= limit) break;
      if (picked.some((p) => Math.abs(p.minFret - v.minFret) < 2 && (p.minFret === 0) === (v.minFret === 0))) continue;
      picked.push(v);
    }
    return picked.sort((a, b) => a.minFret - b.minFret);
  }

  /**
   * One playable position (box) of a scale.
   * scalePcs: pitch classes in scale order starting from the tonic.
   * index:    which scale note to start from on the lowest string (0 = tonic → "position 1").
   * nps:      notes per string (2 for pentatonic boxes, 3 for three-notes-per-string).
   * Returns [{ string, fret, midi, pc, degreeIndex }]
   */
  function scalePosition(tuning, scalePcs, index, nps) {
    const n = scalePcs.length;
    let midi = tuning[0] + mod(scalePcs[index % n] - tuning[0], 12);
    let idx = index % n;
    const cells = [];
    for (let s = 0; s < tuning.length; s++) {
      for (let k = 0; k < nps; k++) {
        cells.push({ string: s, fret: midi - tuning[s], midi, pc: mod(midi, 12), degreeIndex: idx });
        idx = (idx + 1) % n;
        let next = midi + 1;
        while (mod(next, 12) !== scalePcs[idx]) next++;
        midi = next;
      }
    }
    return cells;
  }

  return { voicings, scalePosition };
});
