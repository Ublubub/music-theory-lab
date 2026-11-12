# Changelog

## 0.2.0 (2026-11-12)

Advanced harmony, guitar tools and all the suggested extras.

- **Advanced Harmony tab**: secondary dominants, tritone substitutions, borrowed chords from 7 parallel scales,
  modulation helper with pivot chords and closely related keys.
- **Numeral input** now understands secondary chords (`V7/vi`), inversions (`I/3`, `V7/7`) and slash chords (`IV/C`).
  4 new famous progressions use them.
- **Chord shapes**: a search for playable fingerings (≤ 4-fret span, ≤ 4 fingers, correct bass note) shown as chord
  diagrams under the neck. Click one to see and hear just that shape.
- **Scale positions**: the 5 pentatonic boxes, or 3 notes per string for 7-note scales.
- **Fretboard**: left-handed mode, choose any fret range, piano keyboard view (or both).
- **Circle of Fifths tab**: interactive, with key signatures and the current key's chords highlighted.
- **Ear Training tab**: intervals, chord quality, scale degrees and chords in key at 3 levels, with score and streaks.
- **Songs tab**: sections with repeats and lyrics, playback, print/PDF, .txt chord chart, .json export/import, share link.
- **Share links** for key + progression + tab.
- **Microphone** note detection with a tuner in the Find tab; held notes are added automatically.
- **Sounds**: Karplus-Strong plucked guitar (default), piano, synth.
- **Installable offline app** (PWA): manifest, icons, network-first service worker.
- Code split into a small core (`app.js`) plus one file per tab in `js/tabs/`.
- Tests: 14 → 28 (advanced harmony, chord shapes, scale boxes, pitch detection).
- The app is now public at https://ublubub.github.io/music-theory-lab/.

## 0.1.0 (2026-11-12)

First version: theory engine, six tabs, interactive fretboard, built-in synth, 14 tests, CI, docs.
