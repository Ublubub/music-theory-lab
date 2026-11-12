# How it works

## The pieces

```
           ┌────────────── js/app.js (interface, state, clicks) ──────────────┐
           │                         │                                         │
     js/theory.js              js/fretboard.js                           js/audio.js
  (music logic, tested)      (draws the neck, SVG)                (synth, Web Audio API)
```

- **theory.js** knows nothing about the page. It takes names like `"F#"` and `"maj7"` and returns data. That keeps
  it easy to test (`npm test` runs `tests/theory.test.js`) and easy to reuse.
- **app.js** holds the current `state` (key, scale, tab, progression…), saves it in the browser's localStorage
  so the app remembers where you were, and re-draws the page whenever something changes.
- There is **no build step** and no framework: plain HTML, CSS and JavaScript, so the files on GitHub are exactly
  what runs in the browser.

## Theory conventions used in the app

### Note spelling
Notes are stored as a **letter + accidental**, not just a pitch number. To go up an interval, the engine moves up
the right number of *letters* (a 3rd = 3 letters) and then adds whatever sharp/flat makes the right number of
*semitones*. That's why E major's 3rd is G♯ (a 3rd above E must be some kind of G), not A♭.

### Scale degrees
Degrees are numbered against the **major scale** of the same tonic. In A minor: 1 2 ♭3 4 5 ♭6 ♭7.

### Roman numerals
- UPPER CASE = major, lower case = minor, ° diminished, ø half-diminished, + augmented.
- Numerals are written **relative to the major scale** (pop/jazz convention), so the chords of A minor are
  `i ii° ♭III iv v ♭VI ♭VII`. Classical textbooks often write `III VI VII` instead. Same chords, different labels.
  This convention means a numeral always points at the same root in a given tonic, whatever the mode, which makes
  borrowed chords easy to type (`bVII` in a major key).

### Harmonic function
| Function | Degrees | Feeling |
|---|---|---|
| **T**: Tonic | I, iii, vi | home, rest |
| **S**: Subdominant (predominant) | ii, IV (and borrowed ♭VI, ♭VII, ♭II) | moving away |
| **D**: Dominant | V, vii° | tension, wants to resolve home |

These labels come from major/minor harmony and are only approximate in modes.

### "What could come next?" scoring
Every chord in the key gets points for:
- **Root motion**: falling a 5th (V → I, ii → V) is strongest (+3). Steps and 3rds score +1. A tritone gets only +1.
- **Function flow**: T→S (+2), S→D (+2), D→T (+3), S→T plagal (+1), T→D (+1), D→S retrogression (−2).
- **Special cases**: V → vi is a deceptive cadence (+2). Diminished and augmented chords get −1.
- **Minor keys** also offer the major V from harmonic minor.

The weights are a teaching heuristic, not a rule. Change them in `suggestNext()` in `js/theory.js`.

### Key finder
Lists every major and natural-minor key that contains **all** the entered notes. Keys rank higher when the
**first note you entered is the tonic** (+3) and for each entered note in the key's tonic chord (+1).
