/*
 * theory.js — the music theory engine.
 *
 * Everything here is pure logic (no HTML, no sound), so it can be tested with Node
 * (`npm test`) and used in the browser (as `window.Theory`).
 *
 * Key idea: notes are stored as { letter, acc } instead of just a number 0–11.
 *   letter: 0–6 for C D E F G A B
 *   acc:    accidental, e.g. -1 = flat, +1 = sharp, -2 = double flat
 * That way the app always spells notes correctly: the 3rd of E major is G♯ (not A♭),
 * and the 7th of a C diminished 7th chord is B𝄫 (B♭♭), not A.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Theory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Notes
  // ---------------------------------------------------------------------------
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const LETTER_PC = [0, 2, 4, 5, 7, 9, 11]; // pitch class (0–11) of each natural note
  const mod = (n, m) => ((n % m) + m) % m;

  /** Keys offered in the key picker. */
  const KEY_ROOTS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

  /** A common spelling for each pitch class, used when we only know the pitch (e.g. a clicked fret). */
  const COMMON_SPELLING = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

  function parseNote(str) {
    if (str && typeof str === 'object' && 'letter' in str) return { letter: str.letter, acc: str.acc };
    const s = String(str).trim().replace(/♯/g, '#').replace(/♭/g, 'b').replace(/x/g, '##');
    const m = /^([A-Ga-g])(#*|b*)$/.exec(s);
    if (!m) throw new Error(`Not a note: "${str}"`);
    const letter = LETTERS.indexOf(m[1].toUpperCase());
    const acc = m[2].startsWith('#') ? m[2].length : -m[2].length;
    return { letter, acc };
  }

  const pc = (note) => mod(LETTER_PC[note.letter] + note.acc, 12);
  const accidentalStr = (acc) => (acc > 0 ? '♯'.repeat(acc) : '♭'.repeat(-acc));
  const noteName = (note) => LETTERS[note.letter] + accidentalStr(note.acc);
  const asciiName = (note) => LETTERS[note.letter] + (note.acc > 0 ? '#'.repeat(note.acc) : 'b'.repeat(-note.acc));
  const pcName = (p) => noteName(parseNote(COMMON_SPELLING[mod(p, 12)]));

  // ---------------------------------------------------------------------------
  // Intervals
  // ---------------------------------------------------------------------------
  // semis = size in semitones, deg = how many letter names it spans (a 3rd spans 3 letters).
  const INTERVALS = {};
  [
    ['P1', 0, 1, 'Perfect unison', '1'],
    ['m2', 1, 2, 'Minor 2nd', '♭2'],
    ['M2', 2, 2, 'Major 2nd', '2'],
    ['A2', 3, 2, 'Augmented 2nd', '♯2'],
    ['m3', 3, 3, 'Minor 3rd', '♭3'],
    ['M3', 4, 3, 'Major 3rd', '3'],
    ['P4', 5, 4, 'Perfect 4th', '4'],
    ['A4', 6, 4, 'Augmented 4th (tritone)', '♯4'],
    ['d5', 6, 5, 'Diminished 5th (tritone)', '♭5'],
    ['P5', 7, 5, 'Perfect 5th', '5'],
    ['A5', 8, 5, 'Augmented 5th', '♯5'],
    ['m6', 8, 6, 'Minor 6th', '♭6'],
    ['M6', 9, 6, 'Major 6th', '6'],
    ['d7', 9, 7, 'Diminished 7th', '♭♭7'],
    ['m7', 10, 7, 'Minor 7th', '♭7'],
    ['M7', 11, 7, 'Major 7th', '7'],
    ['P8', 12, 8, 'Octave', '8'],
    ['m9', 13, 9, 'Minor 9th', '♭9'],
    ['M9', 14, 9, 'Major 9th', '9'],
    ['A9', 15, 9, 'Augmented 9th', '♯9'],
    ['P11', 17, 11, 'Perfect 11th', '11'],
    ['A11', 18, 11, 'Augmented 11th', '♯11'],
    ['m13', 20, 13, 'Minor 13th', '♭13'],
    ['M13', 21, 13, 'Major 13th', '13'],
  ].forEach(([key, semis, deg, name, short]) => { INTERVALS[key] = { key, semis, deg, name, short }; });

  /** Character of each simple interval, for the Intervals tab. */
  const INTERVAL_CHARACTER = {
    P1: 'Same note.',
    m2: 'Very tense, crunchy. The "Jaws" theme.',
    M2: 'A whole step. Neutral, the building block of melodies.',
    m3: 'Dark, sad. Defines minor chords.',
    M3: 'Bright, happy. Defines major chords.',
    P4: 'Open, "hymn-like". Wants to fall to the 3rd.',
    A4: 'The tritone: maximum tension. Sits inside every dominant 7th chord.',
    P5: 'Strong and stable. The power chord.',
    m6: 'Bittersweet, dramatic.',
    M6: 'Warm, sweet.',
    m7: 'Bluesy tension. The 7th of a dominant 7th chord.',
    M7: 'Dreamy, jazzy. Leans hard into the octave.',
    P8: 'Same note name, higher. Pure consonance.',
  };

  const SEMITONE_NAMES = ['Unison', 'Minor 2nd', 'Major 2nd', 'Minor 3rd', 'Major 3rd', 'Perfect 4th',
    'Tritone', 'Perfect 5th', 'Minor 6th', 'Major 6th', 'Minor 7th', 'Major 7th'];

  /** Move a note up by an interval, keeping correct letter spelling. */
  function transpose(note, ivKey) {
    const iv = INTERVALS[ivKey];
    if (!iv) throw new Error(`Unknown interval ${ivKey}`);
    const n = parseNote(note);
    const letter = mod(n.letter + iv.deg - 1, 7);
    const target = pc(n) + iv.semis;
    const acc = mod(target - LETTER_PC[letter] + 6, 12) - 6;
    return { letter, acc };
  }

  // ---------------------------------------------------------------------------
  // Scales
  // ---------------------------------------------------------------------------
  const SCALES = {
    major: { name: 'Major (Ionian)', family: 'major', intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'],
      blurb: 'The reference scale of Western music. Bright and resolved. Every other scale is described by how it differs from this one.' },
    minor: { name: 'Natural minor (Aeolian)', family: 'minor', intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'],
      blurb: 'The "sad" counterpart of major: ♭3, ♭6 and ♭7. Shares its notes with the major scale a minor 3rd above (its relative major).' },
    harmonicMinor: { name: 'Harmonic minor', family: 'minor', intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'M7'],
      blurb: 'Natural minor with a raised 7th. That leading tone gives minor keys a strong major V chord. Exotic gap (♭6 → 7).' },
    melodicMinor: { name: 'Melodic minor (jazz minor)', family: 'minor', intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'M7'],
      blurb: 'Major scale with a ♭3. Smooth for melodies, and the source of many jazz sounds (altered, lydian dominant).' },
    dorian: { name: 'Dorian', family: 'minor', intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'm7'],
      blurb: 'Minor with a bright natural 6. Funk, soul, Santana, "So What". Characteristic chord: major IV.' },
    phrygian: { name: 'Phrygian', family: 'minor', intervals: ['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'm7'],
      blurb: 'Minor with a ♭2. Dark, Spanish/flamenco and metal flavour. Characteristic chord: ♭II.' },
    lydian: { name: 'Lydian', family: 'major', intervals: ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'M7'],
      blurb: 'Major with a ♯4. Dreamy, floating, film-score sound. Characteristic chord: major II.' },
    mixolydian: { name: 'Mixolydian', family: 'major', intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7'],
      blurb: 'Major with a ♭7. Rock, blues and folk. Characteristic chord: ♭VII.' },
    locrian: { name: 'Locrian', family: 'minor', intervals: ['P1', 'm2', 'm3', 'P4', 'd5', 'm6', 'm7'],
      blurb: 'The unstable mode: its tonic chord is diminished. Rare as a home key, useful over m7♭5 chords.' },
    majorPentatonic: { name: 'Major pentatonic', family: 'major', intervals: ['P1', 'M2', 'M3', 'P5', 'M6'],
      blurb: 'Major scale without the 4th and 7th: no half steps, so it is very hard to play a "wrong" note. Country, pop, rock solos.' },
    minorPentatonic: { name: 'Minor pentatonic', family: 'minor', intervals: ['P1', 'm3', 'P4', 'P5', 'm7'],
      blurb: 'The first scale most guitarists learn. Blues and rock solos.' },
    blues: { name: 'Blues', family: 'minor', intervals: ['P1', 'm3', 'P4', 'd5', 'P5', 'm7'],
      blurb: 'Minor pentatonic plus the ♭5 "blue note".' },
  };

  const DEGREE_NAMES = ['Tonic', 'Supertonic', 'Mediant', 'Subdominant', 'Dominant', 'Submediant', 'Leading tone'];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const MAJOR_IVS = SCALES.major.intervals;
  const MAJOR_SEMIS = MAJOR_IVS.map((k) => INTERVALS[k].semis);

  function buildScale(rootName, scaleKey) {
    const scale = SCALES[scaleKey];
    if (!scale) throw new Error(`Unknown scale ${scaleKey}`);
    const root = parseNote(rootName);
    return scale.intervals.map((ivKey) => {
      const note = transpose(root, ivKey);
      const iv = INTERVALS[ivKey];
      let degreeName = DEGREE_NAMES[iv.deg - 1];
      if (iv.deg === 7 && iv.semis === 10) degreeName = 'Subtonic';
      return { note, name: noteName(note), pc: pc(note), interval: iv, degreeName };
    });
  }

  /** W / H step pattern between consecutive scale notes. */
  function stepPattern(rootName, scaleKey) {
    const s = buildScale(rootName, scaleKey);
    return s.map((n, i) => {
      const next = i === s.length - 1 ? s[0].pc + 12 : s[i + 1].pc;
      const d = mod(next - n.pc, 12) || 12;
      return { 1: 'H', 2: 'W', 3: 'W+H', 4: '2W' }[d] || `${d}`;
    });
  }

  // ---------------------------------------------------------------------------
  // Chords
  // ---------------------------------------------------------------------------
  // minor: true → written in lower case as a Roman numeral (ii, vi, vii°…)
  // numeral: suffix after the Roman numeral
  const CHORD_TYPES = {};
  const CHORD_LIST = []; // same chords, in display order (object keys like "7" would otherwise sort first)
  [
    // key, name, symbol, intervals, category, minor, numeral suffix
    ['maj', 'Major', '', ['P1', 'M3', 'P5'], 'Triads', false, ''],
    ['min', 'Minor', 'm', ['P1', 'm3', 'P5'], 'Triads', true, ''],
    ['dim', 'Diminished', 'dim', ['P1', 'm3', 'd5'], 'Triads', true, '°'],
    ['aug', 'Augmented', 'aug', ['P1', 'M3', 'A5'], 'Triads', false, '+'],
    ['sus2', 'Suspended 2nd', 'sus2', ['P1', 'M2', 'P5'], 'Triads', false, 'sus2'],
    ['sus4', 'Suspended 4th', 'sus4', ['P1', 'P4', 'P5'], 'Triads', false, 'sus4'],
    ['5', 'Power chord', '5', ['P1', 'P5'], 'Triads', false, '5'],

    ['6', 'Major 6th', '6', ['P1', 'M3', 'P5', 'M6'], 'Sixths & sevenths', false, '6'],
    ['m6', 'Minor 6th', 'm6', ['P1', 'm3', 'P5', 'M6'], 'Sixths & sevenths', true, '6'],
    ['maj7', 'Major 7th', 'maj7', ['P1', 'M3', 'P5', 'M7'], 'Sixths & sevenths', false, 'maj7'],
    ['7', 'Dominant 7th', '7', ['P1', 'M3', 'P5', 'm7'], 'Sixths & sevenths', false, '7'],
    ['m7', 'Minor 7th', 'm7', ['P1', 'm3', 'P5', 'm7'], 'Sixths & sevenths', true, '7'],
    ['mMaj7', 'Minor-major 7th', 'm(maj7)', ['P1', 'm3', 'P5', 'M7'], 'Sixths & sevenths', true, 'maj7'],
    ['m7b5', 'Half-diminished 7th', 'm7♭5', ['P1', 'm3', 'd5', 'm7'], 'Sixths & sevenths', true, 'ø7'],
    ['dim7', 'Diminished 7th', 'dim7', ['P1', 'm3', 'd5', 'd7'], 'Sixths & sevenths', true, '°7'],
    ['augMaj7', 'Augmented major 7th', 'maj7♯5', ['P1', 'M3', 'A5', 'M7'], 'Sixths & sevenths', false, '+maj7'],
    ['aug7', 'Augmented 7th', '7♯5', ['P1', 'M3', 'A5', 'm7'], 'Sixths & sevenths', false, '+7'],
    ['7sus4', 'Dominant 7th sus4', '7sus4', ['P1', 'P4', 'P5', 'm7'], 'Sixths & sevenths', false, '7sus4'],

    ['add9', 'Add 9', 'add9', ['P1', 'M3', 'P5', 'M9'], 'Extended', false, 'add9'],
    ['madd9', 'Minor add 9', 'm(add9)', ['P1', 'm3', 'P5', 'M9'], 'Extended', true, 'add9'],
    ['69', 'Six-nine', '6/9', ['P1', 'M3', 'P5', 'M6', 'M9'], 'Extended', false, '69'],
    ['maj9', 'Major 9th', 'maj9', ['P1', 'M3', 'P5', 'M7', 'M9'], 'Extended', false, 'maj9'],
    ['9', 'Dominant 9th', '9', ['P1', 'M3', 'P5', 'm7', 'M9'], 'Extended', false, '9'],
    ['m9', 'Minor 9th', 'm9', ['P1', 'm3', 'P5', 'm7', 'M9'], 'Extended', true, '9'],
    ['11', 'Dominant 11th', '11', ['P1', 'M3', 'P5', 'm7', 'M9', 'P11'], 'Extended', false, '11'],
    ['m11', 'Minor 11th', 'm11', ['P1', 'm3', 'P5', 'm7', 'M9', 'P11'], 'Extended', true, '11'],
    ['maj13', 'Major 13th', 'maj13', ['P1', 'M3', 'P5', 'M7', 'M9', 'M13'], 'Extended', false, 'maj13'],
    ['13', 'Dominant 13th', '13', ['P1', 'M3', 'P5', 'm7', 'M9', 'M13'], 'Extended', false, '13'],
    ['m13', 'Minor 13th', 'm13', ['P1', 'm3', 'P5', 'm7', 'M9', 'M13'], 'Extended', true, '13'],

    ['7b9', 'Dominant 7th ♭9', '7♭9', ['P1', 'M3', 'P5', 'm7', 'm9'], 'Altered', false, '7♭9'],
    ['7#9', 'Dominant 7th ♯9 ("Hendrix")', '7♯9', ['P1', 'M3', 'P5', 'm7', 'A9'], 'Altered', false, '7♯9'],
    ['7b5', 'Dominant 7th ♭5', '7♭5', ['P1', 'M3', 'd5', 'm7'], 'Altered', false, '7♭5'],
    ['maj7#11', 'Major 7th ♯11 (Lydian)', 'maj7♯11', ['P1', 'M3', 'P5', 'M7', 'A11'], 'Altered', false, 'maj7♯11'],
  ].forEach(([key, name, symbol, intervals, category, minor, numeral]) => {
    CHORD_TYPES[key] = { key, name, symbol, intervals, category, minor, numeral };
    CHORD_LIST.push(CHORD_TYPES[key]);
  });

  const CHORD_CATEGORIES = ['Triads', 'Sixths & sevenths', 'Extended', 'Altered'];

  /** Which part of the chord a note is (for colouring). */
  function toneRole(iv) {
    if (iv.deg === 1) return 'root';
    if (iv.deg === 3) return 'third';
    if (iv.deg === 5) return 'fifth';
    if (iv.deg === 7) return 'seventh';
    return 'ext';
  }

  function chordNotes(rootName, typeKey) {
    const type = CHORD_TYPES[typeKey];
    if (!type) throw new Error(`Unknown chord type ${typeKey}`);
    const root = parseNote(rootName);
    return type.intervals.map((ivKey) => {
      const iv = INTERVALS[ivKey];
      const note = transpose(root, ivKey);
      return { note, name: noteName(note), pc: pc(note), interval: iv, role: toneRole(iv) };
    });
  }

  const chordSymbol = (rootName, typeKey) => noteName(parseNote(rootName)) + CHORD_TYPES[typeKey].symbol;

  // Recognise chords made by stacking scale 3rds, from semitone distances above the root.
  const TRIAD_BY_SHAPE = { '4,7': 'maj', '3,7': 'min', '3,6': 'dim', '4,8': 'aug' };
  const SEVENTH_BY_SHAPE = {
    '4,7,11': 'maj7', '4,7,10': '7', '3,7,10': 'm7', '3,7,11': 'mMaj7',
    '3,6,10': 'm7b5', '3,6,9': 'dim7', '4,8,11': 'augMaj7', '4,8,10': 'aug7',
  };

  // ---------------------------------------------------------------------------
  // Harmonic function & Roman numerals
  // ---------------------------------------------------------------------------
  const FUNCTIONS = {
    T: { key: 'T', name: 'Tonic', desc: 'Home. Stable and restful: songs usually start and end here.' },
    S: { key: 'S', name: 'Subdominant', desc: 'Also called predominant. Moves away from home and sets up the dominant.' },
    D: { key: 'D', name: 'Dominant', desc: 'Tension. Contains the leading tone and wants to resolve to the tonic.' },
  };
  // Function by scale degree: I iii vi = tonic, ii IV = subdominant, V vii = dominant.
  const FUNCTION_BY_DEGREE = ['T', 'S', 'T', 'S', 'D', 'T', 'D'];
  // Chords on a flattened root (borrowed chords) behave differently.
  const FUNCTION_FLAT_ROOT = { 2: 'S', 3: 'T', 6: 'S', 7: 'S' };

  /**
   * Analyse a chord inside a key. Roman numerals are always written relative to the
   * MAJOR scale of the tonic, so in A minor the C chord is ♭III (pop/jazz convention).
   */
  /** Plain Roman numeral of a chord root + type relative to a tonic (no slash). */
  function numeralOf(tonic, root, typeKey) {
    const type = CHORD_TYPES[typeKey];
    const deg = mod(root.letter - tonic.letter, 7) + 1;
    const semis = mod(pc(root) - pc(tonic), 12);
    const acc = mod(semis - MAJOR_SEMIS[deg - 1] + 6, 12) - 6;
    const base = type.minor ? ROMAN[deg - 1].toLowerCase() : ROMAN[deg - 1];
    return { text: accidentalStr(acc) + base + type.numeral, deg, acc };
  }

  /**
   * opts.bass:    a note for slash chords / inversions (C/E)
   * opts.applied: { numeral } for secondary dominants (V7/ii): function becomes Dominant
   */
  function analyzeChord(keyRootName, scaleKey, chordRootName, typeKey, opts = {}) {
    const tonic = parseNote(keyRootName);
    const root = parseNote(chordRootName);
    const type = CHORD_TYPES[typeKey];
    const { text, deg, acc } = numeralOf(tonic, root, typeKey);
    const notes = chordNotes(root, typeKey);
    let numeral = text;
    let name = noteName(root) + type.symbol;
    let bass = null;
    let inversion = 0;
    if (opts.bass) {
      bass = parseNote(opts.bass);
      if (pc(bass) !== pc(root)) {
        name += `/${noteName(bass)}`;
        const tone = notes.find((n) => n.pc === pc(bass));
        if (tone) {
          numeral += `/${tone.interval.deg}`;
          inversion = { 3: 1, 2: 1, 4: 1, 5: 2, 7: 3 }[tone.interval.deg] || 0;
        } else {
          numeral += `/${noteName(bass)}`;
        }
      } else bass = null;
    }
    if (opts.applied) numeral = opts.applied.numeral + numeral.slice(text.length);
    const fn = opts.applied ? 'D' : (acc < 0 && FUNCTION_FLAT_ROOT[deg]) || FUNCTION_BY_DEGREE[deg - 1];
    const scalePcs = new Set(buildScale(tonic, scaleKey).map((n) => n.pc));
    const outside = notes.filter((n) => !scalePcs.has(n.pc));
    return {
      root, type: typeKey, name, typeName: type.name, numeral, degree: deg, acc, fn, notes, bass, inversion,
      applied: opts.applied || null, diatonic: outside.length === 0 && (!bass || scalePcs.has(pc(bass))), outside,
    };
  }

  /** The chords that live in a key: stack every other note of a 7-note scale. */
  function diatonicChords(keyRootName, scaleKey, sevenths = false) {
    const scale = buildScale(keyRootName, scaleKey);
    if (scale.length !== 7) return [];
    return scale.map((deg, i) => {
      const stack = sevenths ? [2, 4, 6] : [2, 4];
      const shape = stack.map((k) => mod(scale[(i + k) % 7].pc - deg.pc, 12)).join(',');
      const typeKey = (sevenths ? SEVENTH_BY_SHAPE : TRIAD_BY_SHAPE)[shape];
      return analyzeChord(keyRootName, scaleKey, deg.note, typeKey);
    });
  }

  // Reverse lookup: Roman numeral suffix → chord type
  const NUMERAL_LOOKUP = {};
  Object.values(CHORD_TYPES).forEach((t) => { NUMERAL_LOOKUP[(t.minor ? 'l|' : 'u|') + t.numeral] = t.key; });
  const SUFFIX_ALIASES = {
    'u|M7': 'maj7', 'u|Δ': 'maj7', 'u|Δ7': 'maj7', 'u|ma7': 'maj7', 'u|aug': '+', 'u|+maj7': '+maj7',
    'l|dim': '°', 'l|dim7': '°7', 'l|o': '°', 'l|o7': '°7', 'l|ø': 'ø7', 'l|m7♭5': 'ø7', 'l|7♭5': 'ø7',
    'l|h7': 'ø7', 'l|(maj7)': 'maj7', 'l|M7': 'maj7',
  };

  const NUMERAL_RE = /^([b#♭♯]*)(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)/;

  /**
   * Read a Roman numeral in a key. Supports:
   *   "V7", "bVII", "iiø7", "vii°"       plain numerals
   *   "V7/ii", "vii°7/V"                 secondary (applied) chords
   *   "I/3", "V7/7"                      inversions (bass = that chord tone)
   *   "IV/C"                             slash chord with any bass note
   * Returns { root, type, bass?, applied? } ready for analyzeChord(…, opts).
   */
  function parseNumeral(str, keyRootName) {
    const s = String(str).trim().replace('6/9', '69'); // the 6/9 chord name contains a slash
    const slash = s.indexOf('/');
    if (slash < 0) return parseSimpleNumeral(s, keyRootName);
    const left = s.slice(0, slash);
    const right = s.slice(slash + 1);
    if (/^\d+$/.test(right)) {
      const c = parseSimpleNumeral(left, keyRootName);
      const tone = chordNotes(c.root, c.type).find((n) => n.interval.deg === Number(right));
      if (!tone) throw new Error(`"${str}": the chord has no ${right} to put in the bass`);
      return { ...c, bass: tone.note };
    }
    if (NUMERAL_RE.test(right)) {
      const target = parseNumeral(right, keyRootName);
      const c = parseSimpleNumeral(left, target.root);
      const leftText = numeralOf(target.root, c.root, c.type).text;
      const rightText = analyzeChord(keyRootName, 'major', target.root, target.type, target).numeral;
      return { ...c, applied: { numeral: `${leftText}/${rightText}`, target: rightText } };
    }
    const c = parseSimpleNumeral(left, keyRootName);
    try { return { ...c, bass: parseNote(right) }; } catch (e) {
      throw new Error(`"${str}": can't read "${right}" after the slash (use 3/5/7, a note, or a numeral)`);
    }
  }

  function parseSimpleNumeral(str, keyRootName) {
    const s = String(str).trim().replace(/♭/g, 'b').replace(/♯/g, '#');
    const m = /^([b#]*)(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(.*)$/.exec(s);
    if (!m) throw new Error(`"${str}" is not a Roman numeral (try I, ii, V7, bVII…)`);
    const acc = (m[1].match(/#/g) || []).length - (m[1].match(/b/g) || []).length;
    let lower = m[2] === m[2].toLowerCase();
    let suffix = m[3].replace(/b/g, '♭').replace(/#/g, '♯');
    if (!lower && /^m(?!aj)/.test(suffix)) { lower = true; suffix = suffix.slice(1); } // "IIm7"
    const prefix = lower ? 'l|' : 'u|';
    suffix = SUFFIX_ALIASES[prefix + suffix] || suffix;
    const typeKey = NUMERAL_LOOKUP[prefix + suffix];
    if (!typeKey) throw new Error(`Unknown chord suffix "${m[3]}" in "${str}"`);
    const deg = ROMAN.indexOf(m[2].toUpperCase()) + 1;
    const root = transpose(parseNote(keyRootName), MAJOR_IVS[deg - 1]);
    root.acc += acc;
    return { root, type: typeKey };
  }

  /** Parse a whole progression ("I V vi IV" or "ii7-V7-Imaj7"). */
  function parseProgression(text, keyRootName, scaleKey) {
    const tokens = String(text).split(/[\s,|–—-]+/).filter(Boolean);
    const chords = [];
    const errors = [];
    tokens.forEach((tok) => {
      try {
        const p = parseNumeral(tok, keyRootName);
        chords.push(analyzeChord(keyRootName, scaleKey, p.root, p.type, p));
      } catch (e) { errors.push(e.message); }
    });
    return { chords, errors };
  }

  // ---------------------------------------------------------------------------
  // Progression helpers: next-chord suggestions & cadences
  // ---------------------------------------------------------------------------
  const MOTION_REASONS = {
    3: [3, 'Root falls a 5th: the strongest pull in harmony'],
    4: [1, 'Root rises a 5th'],
    1: [1, 'Root moves up a step'],
    6: [1, 'Root moves down a step'],
    2: [1, 'Root moves a 3rd: shares two notes, smooth'],
    5: [1, 'Root moves a 3rd: shares two notes, smooth'],
  };
  const FLOW_REASONS = {
    'T>S': [2, 'Tonic → Subdominant: leaving home'],
    'S>D': [2, 'Subdominant → Dominant: building tension'],
    'D>T': [3, 'Dominant → Tonic: tension resolves'],
    'S>T': [1, 'Subdominant → Tonic: plagal ("Amen") motion'],
    'T>D': [1, 'Tonic → Dominant: straight to tension'],
    'D>S': [-2, 'Dominant → Subdominant: "backwards" (common in rock, rarer in classical)'],
    'T>T': [0, 'Stays in tonic function'],
    'S>S': [0, 'Stays in subdominant function'],
    'D>D': [0, 'Stays in dominant function'],
  };

  function suggestNext(keyRootName, scaleKey, progression, sevenths = false) {
    const candidates = diatonicChords(keyRootName, scaleKey, sevenths);
    if (!candidates.length) return [];
    // In minor keys, also offer the major V from harmonic minor.
    if (SCALES[scaleKey].family === 'minor' && !candidates.some((c) => c.degree === 5 && c.acc === 0 && !CHORD_TYPES[c.type].minor)) {
      const v = transpose(parseNote(keyRootName), 'P5');
      candidates.push(analyzeChord(keyRootName, scaleKey, v, sevenths ? '7' : 'maj'));
    }
    const last = progression[progression.length - 1];
    if (last && last.applied) {
      // A secondary dominant wants to resolve to the chord it points at.
      const target = parseNumeral(last.applied.target, keyRootName);
      const t = analyzeChord(keyRootName, scaleKey, target.root, target.type);
      return [{ chord: t, score: 5, reasons: [`${last.numeral} is the dominant of ${t.numeral}: resolve to it`] }]
        .concat(candidates.filter((c) => c.name !== t.name).map((c) => ({ chord: c, score: 0, reasons: ['Deceptive: dodge the expected resolution'] })));
    }
    if (!last) {
      return candidates.map((c) => ({ chord: c, score: c.degree === 1 ? 3 : c.fn === 'T' ? 1 : 0,
        reasons: [c.degree === 1 ? 'Start at home (the tonic)' : c.fn === 'T' ? 'A tonic-family chord also feels like home' : 'Starting away from home creates mystery'] }))
        .sort((a, b) => b.score - a.score);
    }
    return candidates
      .filter((c) => !(c.degree === last.degree && c.acc === last.acc && c.type === last.type))
      .map((c) => {
        const reasons = [];
        let score = 0;
        const motion = mod(c.degree - last.degree, 7);
        const semis = mod(pc(c.root) - pc(last.root), 12);
        if (motion === 3 && semis === 6) { score += 1; reasons.push('Root moves a tritone (a "diminished" 5th): less pull than a true 5th'); }
        else if (MOTION_REASONS[motion]) { score += MOTION_REASONS[motion][0]; reasons.push(MOTION_REASONS[motion][1]); }
        if (c.type === 'dim' || c.type === 'aug') { score -= 1; reasons.push('Unstable chord: use it as a passing colour'); }
        if (last.fn === 'D' && last.degree === 5 && c.degree === 6) {
          score += 2; reasons.push('Deceptive cadence: V → vi fakes the resolution');
        } else {
          const flow = FLOW_REASONS[`${last.fn}>${c.fn}`];
          score += flow[0]; reasons.push(flow[1]);
        }
        if (!c.diatonic) { score += 1; reasons.push('Raised 7th (harmonic minor) gives a stronger pull to the tonic'); }
        return { chord: c, score, reasons };
      })
      .sort((a, b) => b.score - a.score);
  }

  function detectCadence(progression) {
    const n = progression.length;
    if (n === 0) return null;
    const last = progression[n - 1];
    const prev = progression[n - 2];
    if (prev && prev.degree === 5 && prev.acc === 0 && last.degree === 1)
      return { name: 'Authentic cadence (V → I)', desc: 'The strongest, most final ending.' };
    if (prev && prev.degree === 7 && prev.acc === 0 && last.degree === 1)
      return { name: 'Leading-tone cadence (vii° → I)', desc: 'A softer dominant-to-tonic ending.' };
    if (prev && prev.degree === 4 && last.degree === 1)
      return { name: 'Plagal cadence (IV → I)', desc: 'The gentle "Amen" ending.' };
    if (prev && prev.degree === 7 && prev.acc === -1 && last.degree === 1)
      return { name: '"Mixolydian" cadence (♭VII → I)', desc: 'A rock-flavoured way home.' };
    if (prev && prev.degree === 5 && last.degree === 6)
      return { name: 'Deceptive cadence (V → vi)', desc: 'Sets up the tonic, then dodges it.' };
    if (last.degree === 5)
      return { name: 'Half cadence (ends on V)', desc: 'Open-ended, like a question. Great before repeating the loop.' };
    if (last.degree === 1) return { name: 'Ends on the tonic', desc: 'Feels resolved.' };
    return { name: 'Open ending', desc: 'Doesn\'t land on I or V, so it feels unfinished.' };
  }

  // ---------------------------------------------------------------------------
  // Reverse lookup: notes → keys and chords
  // ---------------------------------------------------------------------------
  const MAJOR_TONIC_SPELLING = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const MINOR_TONIC_SPELLING = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

  /** Keys whose scale contains every given pitch class. pcs[0] is treated as "the first note". */
  function findKeys(pcs, scaleKeys = ['major', 'minor']) {
    const wanted = [...new Set(pcs.map((p) => mod(p, 12)))];
    if (!wanted.length) return [];
    const first = mod(pcs[0], 12);
    const results = [];
    scaleKeys.forEach((scaleKey) => {
      const spell = SCALES[scaleKey].family === 'minor' ? MINOR_TONIC_SPELLING : MAJOR_TONIC_SPELLING;
      for (let t = 0; t < 12; t++) {
        const root = spell[t];
        const scale = buildScale(root, scaleKey);
        const set = new Set(scale.map((n) => n.pc));
        if (!wanted.every((p) => set.has(p))) continue;
        let score = 0;
        const why = [];
        if (first === t) { score += 3; why.push('your first note is its tonic'); }
        const triad = [scale[0].pc, scale[2].pc, scale[4].pc];
        const inTriad = wanted.filter((p) => triad.includes(p)).length;
        score += inTriad;
        if (inTriad) why.push(`${inTriad} of your notes are in its tonic chord`);
        results.push({ root, scaleKey, name: `${noteName(parseNote(root))} ${SCALES[scaleKey].name}`, score, why });
      }
    });
    return results.sort((a, b) => b.score - a.score);
  }

  /** Chords whose notes are exactly the given pitch classes. */
  function identifyChords(pcs) {
    const wanted = [...new Set(pcs.map((p) => mod(p, 12)))].sort((a, b) => a - b);
    if (wanted.length < 2) return [];
    const bass = mod(pcs[0], 12);
    const out = [];
    wanted.forEach((r) => {
      const rootName = COMMON_SPELLING[r];
      CHORD_LIST.forEach((t) => {
        const chordPcs = [...new Set(chordNotes(rootName, t.key).map((n) => n.pc))].sort((a, b) => a - b);
        if (chordPcs.length === wanted.length && chordPcs.every((p, i) => p === wanted[i])) {
          const name = chordSymbol(rootName, t.key) + (r === bass ? '' : `/${pcName(bass)}`);
          out.push({ root: rootName, type: t.key, name, typeName: t.name, rootPosition: r === bass });
        }
      });
    });
    return out.sort((a, b) => (b.rootPosition - a.rootPosition)
      || CHORD_CATEGORIES.indexOf(CHORD_TYPES[a.type].category) - CHORD_CATEGORIES.indexOf(CHORD_TYPES[b.type].category));
  }

  /** Name the interval between two pitch classes (going up). */
  const intervalName = (fromPc, toPc) => SEMITONE_NAMES[mod(toPc - fromPc, 12)];

  // ---------------------------------------------------------------------------
  // Advanced harmony
  // ---------------------------------------------------------------------------

  /** V(7)/x for every major or minor diatonic chord except I. */
  function secondaryDominants(keyRootName, scaleKey, sevenths = true) {
    return diatonicChords(keyRootName, scaleKey)
      .filter((t) => t.degree !== 1 && (t.type === 'maj' || t.type === 'min'))
      .map((target) => {
        const root = transpose(target.root, 'P5');
        const type = sevenths ? '7' : 'maj';
        const applied = { numeral: `${sevenths ? 'V7' : 'V'}/${target.numeral}`, target: target.numeral };
        const chord = analyzeChord(keyRootName, scaleKey, root, type, { applied });
        const leading = transpose(target.root, 'M7'); // the note that pulls up to the target
        return { chord, target, leadingTone: noteName(leading) };
      });
  }

  /** Tritone substitutions: a dominant 7th a tritone away shares the same 3rd and 7th. */
  function tritoneSubs(keyRootName, scaleKey) {
    const v = transpose(parseNote(keyRootName), 'P5');
    const dominants = [{ chord: analyzeChord(keyRootName, scaleKey, v, '7'), label: 'V7', target: 'I' }]
      .concat(secondaryDominants(keyRootName, scaleKey).map((s) => ({ chord: s.chord, label: s.chord.numeral, target: s.target.numeral })));
    return dominants.map((d) => {
      const subRoot = transpose(d.chord.root, 'd5');
      const sub = analyzeChord(keyRootName, scaleKey, subRoot, '7');
      const shared = d.chord.notes.filter((n) => n.role === 'third' || n.role === 'seventh').map((n) => n.name);
      return { original: d.chord, label: d.label, target: d.target, sub, shared };
    });
  }

  const INTERCHANGE_SOURCES = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'harmonicMinor', 'melodicMinor'];

  /** Chords borrowed from parallel scales (same tonic) that aren't already in the key. */
  function borrowedChords(keyRootName, scaleKey, sevenths = false) {
    const own = new Set(diatonicChords(keyRootName, scaleKey, sevenths).map((c) => c.name));
    const family = SCALES[scaleKey].family;
    const sources = INTERCHANGE_SOURCES.filter((s) => s !== scaleKey)
      .sort((a, b) => (SCALES[b].family !== family) - (SCALES[a].family !== family));
    return sources.map((src) => ({
      scaleKey: src,
      name: SCALES[src].name,
      chords: diatonicChords(keyRootName, src, sevenths)
        .filter((c) => !own.has(c.name))
        .map((c) => analyzeChord(keyRootName, scaleKey, c.root, c.type)),
    })).filter((g) => g.chords.length);
  }

  /** Chords that belong to both keys: the "doorways" for modulating. */
  function pivotChords(keyA, scaleA, keyB, scaleB, sevenths = false) {
    const B = diatonicChords(keyB, scaleB, sevenths);
    return diatonicChords(keyA, scaleA, sevenths).flatMap((a) => {
      const b = B.find((x) => pc(x.root) === pc(a.root) && x.type === a.type);
      return b ? [{ chord: a, inA: a.numeral, inB: b.numeral, fnA: a.fn, fnB: b.fn }] : [];
    });
  }

  /** The closely related keys: one for each major/minor chord of the key (except I). */
  function closeKeys(keyRootName, scaleKey) {
    return diatonicChords(keyRootName, scaleKey)
      .filter((c) => (c.type === 'maj' || c.type === 'min') && c.degree !== 1)
      .map((c) => ({ root: asciiName(c.root), scaleKey: c.type === 'maj' ? 'major' : 'minor', numeral: c.numeral, name: `${noteName(c.root)} ${c.type === 'maj' ? 'major' : 'minor'}` }));
  }

  /** Circle of fifths, clockwise from C. */
  const CIRCLE = [
    ['C', 'A'], ['G', 'E'], ['D', 'B'], ['A', 'F#'], ['E', 'C#'], ['B', 'G#'],
    ['F#', 'D#'], ['Db', 'Bb'], ['Ab', 'F'], ['Eb', 'C'], ['Bb', 'G'], ['F', 'D'],
  ].map(([major, minor]) => ({ major, minor }));

  /** Sharps or flats in a key signature, e.g. { count: 2, type: '♯', notes: ['F♯','C♯'] }. */
  function keySignature(keyRootName, scaleKey) {
    const notes = buildScale(keyRootName, scaleKey).filter((n) => n.note.acc !== 0);
    const sharp = notes.some((n) => n.note.acc > 0);
    // Order accidentals the way they're written: F C G D A E B for sharps, reverse for flats.
    const order = sharp ? 'FCGDAEB' : 'BEADGCF';
    notes.sort((a, b) => order.indexOf(LETTERS[a.note.letter]) - order.indexOf(LETTERS[b.note.letter]));
    return { count: notes.length, type: notes.length ? (sharp ? '♯' : '♭') : '', notes: notes.map((n) => n.name) };
  }

  /** Index on the circle of the major key that has the same notes as this scale (null if none). */
  function circleIndex(keyRootName, scaleKey) {
    const set = buildScale(keyRootName, scaleKey).map((n) => n.pc).sort((a, b) => a - b).join();
    if (buildScale(keyRootName, scaleKey).length !== 7) return null;
    const i = CIRCLE.findIndex((k) => buildScale(k.major, 'major').map((n) => n.pc).sort((a, b) => a - b).join() === set);
    return i < 0 ? null : i;
  }

  // ---------------------------------------------------------------------------
  // Ready-made progressions (written as Roman numerals, so they work in any key)
  // ---------------------------------------------------------------------------
  const PRESETS = [
    { name: 'Pop "Axis"', family: 'major', numerals: 'I V vi IV', note: 'Thousands of pop songs.' },
    { name: "'50s doo-wop", family: 'major', numerals: 'I vi IV V', note: '"Stand By Me" style.' },
    { name: 'Jazz ii–V–I', family: 'major', numerals: 'ii7 V7 Imaj7', note: 'The core of jazz harmony.' },
    { name: 'Canon', family: 'major', numerals: 'I V vi iii IV I IV V', note: 'Pachelbel-style descending bass.' },
    { name: '12-bar blues', family: 'major', numerals: 'I7 I7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7', note: 'Dominant 7ths everywhere: bluesy, not strictly in key.' },
    { name: 'Royal road', family: 'major', numerals: 'IVmaj7 V7 iii7 vi7', note: 'A J-pop favourite.' },
    { name: 'Mixolydian rock', family: 'major', numerals: 'I bVII IV I', note: 'Borrowed ♭VII: classic rock.' },
    { name: 'Minor plagal', family: 'major', numerals: 'I IV iv I', note: 'Borrowed iv: bittersweet.' },
    { name: 'Secondary-dominant pop', family: 'major', numerals: 'I V7/vi vi IV', note: 'V7/vi gives the vi chord extra pull.' },
    { name: 'Ragtime circle', family: 'major', numerals: 'V7/vi V7/ii V7/V V7 I', note: 'A chain of dominants falling in 5ths.' },
    { name: 'Tritone-sub ii–V–I', family: 'major', numerals: 'ii7 bII7 Imaj7', note: '♭II7 replaces V7: chromatic bass line.' },
    { name: 'Descending bass', family: 'major', numerals: 'I V/3 vi I/5 IV I/3 ii V', note: 'Inversions make the bass walk down step by step.' },
    { name: 'Aeolian vamp', family: 'minor', numerals: 'i bVII bVI bVII', note: 'Rock and film-score minor.' },
    { name: 'Andalusian cadence', family: 'minor', numerals: 'i bVII bVI V', note: 'Flamenco. The V comes from harmonic minor.' },
    { name: 'Epic minor', family: 'minor', numerals: 'i bVI bIII bVII', note: 'Anthemic minor pop.' },
    { name: 'Minor ii–V–i', family: 'minor', numerals: 'iiø7 V7 i7', note: 'The minor-key jazz cadence.' },
    { name: 'Minor blues', family: 'minor', numerals: 'i7 i7 i7 i7 iv7 iv7 i7 i7 bVI7 V7 i7 V7', note: '12 bars, minor flavour.' },
  ];

  return {
    LETTERS, KEY_ROOTS, COMMON_SPELLING, INTERVALS, INTERVAL_CHARACTER, SCALES, CHORD_TYPES, CHORD_LIST, CHORD_CATEGORIES,
    FUNCTIONS, PRESETS, ROMAN, CIRCLE,
    mod, parseNote, pc, noteName, asciiName, pcName, transpose,
    buildScale, stepPattern, chordNotes, chordSymbol, analyzeChord, diatonicChords,
    parseNumeral, parseProgression, suggestNext, detectCadence, findKeys, identifyChords, intervalName,
    secondaryDominants, tritoneSubs, borrowedChords, pivotChords, closeKeys, keySignature, circleIndex,
  };
});
