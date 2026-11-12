# How it works

## The pieces

```
   js/tabs/progressions.js  js/tabs/advanced.js  js/tabs/ear.js  js/tabs/find.js     ← one file per big tab
                 └───────────────┬──────────┴──────────────┘
                     js/app.js  (state, fretboard panel, tab system, player, share links)
          ┌──────────┬───────────┼─────────────┬─────────────┬───────────┐
     theory.js   guitar.js   fretboard.js   piano.js      audio.js      mic.js
   (music logic) (shapes &   (neck + chord  (keyboard)   (instruments) (pitch
    tested        positions)  diagrams)                                 detection)
```

- **theory.js**, **guitar.js** and the pitch detector in **mic.js** know nothing about the page. They take names
  and numbers and return data, so they are tested with Node (`npm test`).
- **app.js** holds the current `state` (key, scale, tab, progression, songs…), saves it in the browser's
  localStorage, draws the fretboard/piano panel, and runs a tiny tab system. Each tab is an object
  `{ id, label, order, render(), actions, changes, … }` passed to `App.registerTab()`. To add a tab, create a file
  in `js/tabs/`, register it, and add a `<script>` line in `index.html` (and in `SHELL` in `sw.js`).
- Buttons use `data-action="name"` attributes. One click listener finds the matching handler in the core or in a tab.
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

### Numeral syntax
| You type | Meaning | In C |
|---|---|---|
| `V7` | dominant 7th on degree 5 | G7 |
| `bVII`, `#iv°` | chromatic roots (relative to the major scale) | B♭, F♯dim |
| `V7/ii` | secondary dominant: the V7 *of* ii | A7 |
| `I/3`, `V7/7` | inversion: that chord tone in the bass | C/E, G7/F |
| `IV/C` | slash chord with any bass note | F/C |

## Guitar tools

### Chord shapes (`Guitar.voicings`)
A brute-force search, fast enough because a guitar only has 6 strings. For every 4-fret window on the neck, each
string is either muted or plays a chord tone inside the window. A shape is kept only if:
- the lowest note is the root (or the slash-chord bass note)
- it contains the essential tones (root, 3rd, 7th, top extension; the 5th is optional in bigger chords)
- it needs at most 4 fingers (a barre counts as one) and has at most one muted string in the middle

Shapes are scored (more strings, open strings and low positions score higher, big stretches lower), then the best
ones spread out along the neck are shown. For major chords these come out as the familiar CAGED shapes.

### Scale positions (`Guitar.scalePosition`)
Start on a scale note on the low E string and walk up the scale, putting **2 notes per string** (pentatonic: the
5 classic boxes) or **3 notes per string** (7-note scales), then move to the next string.

## Sound
- **Guitar**: Karplus-Strong synthesis. A short burst of noise is fed through a delay line one period long, and
  each pass averages neighbouring samples. The noise quickly turns into a decaying plucked tone, much like a real
  string. Each note is generated once and cached.
- **Piano**: five sine harmonics with a hammer-like envelope. **Synth**: the original triangle tone.

## Microphone
Autocorrelation: compare the signal with time-shifted copies of itself and find the shift where it matches best.
That shift is one period of the note. Quiet or noisy input is ignored. Browsers only allow the microphone on
`https://` pages or `localhost`, so it works on GitHub Pages and with `npm start`, but not from a double-clicked file.

## Share links and offline use
- Share links put the key, scale and progression in the URL (`?key=A&scale=minor&prog=i bVII bVI V#progressions`).
  A song is packed as base64 JSON in `?song=…`. The app reads them on start-up, then removes them from the address bar.
- `sw.js` is a service worker with a **network-first** strategy. Online you always get the newest version, and the
  copy it saves is used when offline. When adding a new file, list it in `SHELL` so it's available offline from the
  first visit.
