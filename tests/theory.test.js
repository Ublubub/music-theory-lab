// Run with: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../js/theory.js');

const names = (arr) => arr.map((n) => n.name).join(' ');

test('scales are spelled with one of each letter', () => {
  assert.equal(names(T.buildScale('C', 'major')), 'C D E F G A B');
  assert.equal(names(T.buildScale('F#', 'major')), 'F♯ G♯ A♯ B C♯ D♯ E♯');
  assert.equal(names(T.buildScale('Db', 'major')), 'D♭ E♭ F G♭ A♭ B♭ C');
  assert.equal(names(T.buildScale('A', 'minor')), 'A B C D E F G');
  assert.equal(names(T.buildScale('A', 'harmonicMinor')), 'A B C D E F G♯');
  assert.equal(names(T.buildScale('D', 'dorian')), 'D E F G A B C');
  assert.equal(names(T.buildScale('A', 'blues')), 'A C D E♭ E G');
});

test('step pattern of the major scale', () => {
  assert.equal(T.stepPattern('G', 'major').join(' '), 'W W H W W W H');
});

test('chords are spelled correctly', () => {
  assert.equal(names(T.chordNotes('C', 'dim7')), 'C E♭ G♭ B♭♭');
  assert.equal(names(T.chordNotes('E', 'maj')), 'E G♯ B');
  assert.equal(names(T.chordNotes('Bb', 'm7b5')), 'B♭ D♭ F♭ A♭');
  assert.equal(names(T.chordNotes('G', '13')), 'G B D F A E');
  assert.equal(T.chordSymbol('F#', 'm7'), 'F♯m7');
});

test('diatonic triads and sevenths in C major', () => {
  assert.deepEqual(T.diatonicChords('C', 'major').map((c) => c.numeral), ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
  assert.deepEqual(T.diatonicChords('C', 'major', true).map((c) => c.numeral),
    ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7']);
  assert.deepEqual(T.diatonicChords('C', 'major').map((c) => c.fn).join(''), 'TSTSDTD');
});

test('diatonic chords in minor use numerals relative to major', () => {
  assert.deepEqual(T.diatonicChords('A', 'minor').map((c) => c.numeral), ['i', 'ii°', '♭III', 'iv', 'v', '♭VI', '♭VII']);
  assert.deepEqual(T.diatonicChords('A', 'harmonicMinor', true).map((c) => c.name),
    ['Am(maj7)', 'Bm7♭5', 'Cmaj7♯5', 'Dm7', 'E7', 'Fmaj7', 'G♯dim7']);
});

test('pentatonic scales have no diatonic chords', () => {
  assert.deepEqual(T.diatonicChords('A', 'minorPentatonic'), []);
});

test('Roman numeral parsing', () => {
  const p = (s, key) => { const { root, type } = T.parseNumeral(s, key); return T.chordSymbol(root, type); };
  assert.equal(p('bVII', 'C'), 'B♭');
  assert.equal(p('V7', 'E'), 'B7');
  assert.equal(p('iiø7', 'Bb'), 'Cm7♭5');
  assert.equal(p('vii°', 'G'), 'F♯dim');
  assert.equal(p('IIm7', 'C'), 'Dm7');
  assert.equal(p('#iv°7', 'C'), 'F♯dim7');
  assert.throws(() => T.parseNumeral('X', 'C'));
});

test('every chord type survives a numeral round trip', () => {
  Object.keys(T.CHORD_TYPES).forEach((type) => {
    const a = T.analyzeChord('C', 'major', 'D', type);
    const back = T.parseNumeral(a.numeral, 'C');
    assert.equal(back.type, type, `${type} → ${a.numeral}`);
    assert.equal(T.noteName(back.root), 'D');
  });
});

test('progressions parse with separators and report errors', () => {
  const { chords, errors } = T.parseProgression('ii7 - V7 - Imaj7, Q', 'C', 'major');
  assert.deepEqual(chords.map((c) => c.name), ['Dm7', 'G7', 'Cmaj7']);
  assert.equal(errors.length, 1);
});

test('next-chord suggestions favour V → I', () => {
  const prog = T.parseProgression('IV V', 'C', 'major').chords;
  const s = T.suggestNext('C', 'major', prog);
  assert.equal(s[0].chord.numeral, 'I');
  const afterIV = T.suggestNext('C', 'major', T.parseProgression('I IV', 'C', 'major').chords);
  assert.equal(afterIV[0].chord.numeral, 'V');
});

test('minor keys suggest the harmonic-minor V', () => {
  const prog = T.parseProgression('i iv', 'A', 'minor').chords;
  const s = T.suggestNext('A', 'minor', prog);
  assert.ok(s.some((x) => x.chord.name === 'E'));
});

test('cadence detection', () => {
  const c = (s) => T.detectCadence(T.parseProgression(s, 'C', 'major').chords).name;
  assert.match(c('ii V I'), /Authentic/);
  assert.match(c('I IV I'), /Plagal/);
  assert.match(c('I V vi'), /Deceptive/);
  assert.match(c('I IV V'), /Half/);
});

test('find keys from notes', () => {
  const C = 0, E = 4, G = 7, Fs = 6;
  const keys = T.findKeys([C, E, G]);
  assert.equal(keys[0].name, 'C Major (Ionian)');
  assert.ok(keys.some((k) => k.name === 'A Natural minor (Aeolian)'));
  assert.ok(!T.findKeys([C, E, G, Fs]).some((k) => k.root === 'C' && k.scaleKey === 'major'));
});

test('identify chords from notes', () => {
  assert.equal(T.identifyChords([4, 7, 11])[0].name, 'Em');
  assert.equal(T.identifyChords([7, 11, 2, 5])[0].name, 'G7');
  assert.ok(T.identifyChords([4, 7, 0]).some((c) => c.name === 'C/E'));
});
