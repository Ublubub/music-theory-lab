// Tests for advanced harmony (theory.js) and guitar shapes (guitar.js). Run with: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../js/theory.js');
const G = require('../js/guitar.js');

const STANDARD = [40, 45, 50, 55, 59, 64];
const prog = (s, key = 'C', scale = 'major') => T.parseProgression(s, key, scale);

test('secondary dominants parse and analyse', () => {
  const { chords, errors } = prog('V7/ii V7/V vii°7/V');
  assert.deepEqual(errors, []);
  assert.deepEqual(chords.map((c) => c.name), ['A7', 'D7', 'F♯dim7']);
  assert.deepEqual(chords.map((c) => c.numeral), ['V7/ii', 'V7/V', 'vii°7/V']);
  assert.ok(chords.every((c) => c.fn === 'D'));
});

test('secondary dominant suggests its target next', () => {
  const s = T.suggestNext('C', 'major', prog('I V7/vi').chords);
  assert.equal(s[0].chord.numeral, 'vi');
});

test('inversions and slash chords', () => {
  const { chords } = prog('I/3 V7/7 IV/C');
  assert.deepEqual(chords.map((c) => c.name), ['C/E', 'G7/F', 'F/C']);
  assert.deepEqual(chords.map((c) => c.numeral), ['I/3', 'V7/7', 'IV/5']);
  assert.equal(chords[0].inversion, 1);
  assert.throws(() => T.parseNumeral('I/7', 'C')); // a triad has no 7th
});

test('secondary dominant list in C', () => {
  const s = T.secondaryDominants('C', 'major');
  assert.deepEqual(s.map((x) => x.chord.name), ['A7', 'B7', 'C7', 'D7', 'E7']);
  assert.deepEqual(s.map((x) => x.leadingTone), ['C♯', 'D♯', 'E', 'F♯', 'G♯']);
});

test('tritone substitution of G7 is D♭7 and shares B and F', () => {
  const sub = T.tritoneSubs('C', 'major')[0];
  assert.equal(sub.sub.name, 'D♭7');
  assert.equal(sub.sub.numeral, '♭II7');
  assert.deepEqual(sub.shared, ['B', 'F']);
});

test('borrowed chords from the parallel minor come first in a major key', () => {
  const groups = T.borrowedChords('C', 'major');
  assert.equal(groups[0].scaleKey, 'minor');
  assert.deepEqual(groups[0].chords.map((c) => c.numeral), ['i', 'ii°', '♭III', 'iv', 'v', '♭VI', '♭VII']);
});

test('pivot chords between C major and G major', () => {
  const p = T.pivotChords('C', 'major', 'G', 'major');
  assert.deepEqual(p.map((x) => `${x.chord.name}:${x.inA}=${x.inB}`), ['C:I=IV', 'Em:iii=vi', 'G:V=I', 'Am:vi=ii']);
});

test('close keys, key signatures, circle index', () => {
  assert.deepEqual(T.closeKeys('C', 'major').map((k) => k.name), ['D minor', 'E minor', 'F major', 'G major', 'A minor']);
  assert.deepEqual(T.keySignature('D', 'major').notes, ['F♯', 'C♯']);
  assert.deepEqual(T.keySignature('Eb', 'major').notes, ['B♭', 'E♭', 'A♭']);
  assert.equal(T.circleIndex('A', 'minor'), 0);
  assert.equal(T.circleIndex('D', 'dorian'), 0);
  assert.equal(T.circleIndex('E', 'major'), 4);
  assert.equal(T.circleIndex('A', 'minorPentatonic'), null);
});

test('new presets all parse', () => {
  T.PRESETS.forEach((p) => assert.deepEqual(prog(p.numerals).errors, [], p.name));
});

const tones = (root, type) => T.chordNotes(root, type).map((n) => ({ pc: n.pc, role: n.role, deg: n.interval.deg }));
const shape = (v) => v.frets.map((f) => (f == null ? 'x' : f)).join('');

test('voicings include the open C and E shapes', () => {
  const c = G.voicings(STANDARD, tones('C', 'maj')).map(shape);
  assert.ok(c.includes('x32010'), c.join(' '));
  const e = G.voicings(STANDARD, tones('E', 'maj')).map(shape);
  assert.ok(e.includes('022100'), e.join(' '));
});

test('voicings respect the bass note and stay playable', () => {
  const v = G.voicings(STANDARD, tones('C', 'maj'), { bassPc: 4 });
  assert.ok(v.length > 0);
  v.forEach((x) => {
    const low = x.notes.reduce((a, n) => (n.midi < a.midi ? n : a));
    assert.equal(low.pc, 4);
    assert.ok(x.maxFret - x.minFret <= 3);
  });
  assert.ok(G.voicings(STANDARD, tones('G', '13')).length > 0);
});

test('pentatonic position 1 in A is the classic box', () => {
  const aMinPent = T.buildScale('A', 'minorPentatonic').map((n) => n.pc);
  const box = G.scalePosition(STANDARD, aMinPent, 0, 2).map((c) => c.fret);
  assert.deepEqual(box, [5, 8, 5, 7, 5, 7, 5, 7, 5, 8, 5, 8]);
});
