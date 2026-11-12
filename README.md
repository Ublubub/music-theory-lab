# 🎸 Music Theory Lab

A visual, interactive way to learn music theory, built around the guitar fretboard.

Pick a key and the app shows you its **scale**, the **scale degrees** (Roman numerals I–VII), the **chords** that
live in it, what **job** each chord does (tonic / subdominant / dominant), and helps you **build chord
progressions** step by step. Every note and chord can be heard and seen on the **fretboard**.

Don't know the key? Enter the notes you hear (starting with the first one) and the app finds the keys and chords
that fit.

## Features (v0.1)

| Tab | What you can do |
|---|---|
| **Scales & Degrees** | 12 scales and modes in any key. Degrees (1, ♭3…), Roman numerals, degree names, intervals, W/H step pattern. |
| **Chords in Key** | The 7 diatonic chords as triads or 7th chords, colour-coded by harmonic function (T/S/D). |
| **Chord Builder** | 33 chord types (triads, 6ths, 7ths, 9/11/13, altered) on any root: formula, spelled notes, and how the chord relates to your key. |
| **Progressions** | Type numerals (`I V vi IV`, `ii7 V7 Imaj7`, `i bVII bVI V`), load famous progressions, get ranked "what comes next?" suggestions, see the function flow and cadence, and play it back with tempo and loop. |
| **Intervals** | Every interval from the tonic, with its sound and character, played melodically or harmonically. |
| **Find Key & Chord** | Enter notes on buttons or the fretboard. See matching keys (ranked by your first note) and matching chords, including inversions. |
| **Fretboard** (always visible) | Notes coloured by role (root / 3rd / 5th / 7th / extension), note names or degree labels, 5 tunings, 12–22 frets. Click any fret to hear it. |

Notes are always **spelled correctly** for the key (F♯ major has E♯, C°7 has B𝄫), because the engine tracks letter
names and not just pitches.

## Run it

**Easiest:** double-click `index.html`. It opens in your browser. No install needed.

**Or with a local server** (needs [Node.js](https://nodejs.org)):

```bash
npm start          # then open http://localhost:5173
```

**Tests** check the theory engine (scale spelling, chord building, numerals, suggestions…):

```bash
npm test
```

## Project structure

```
index.html            the page
css/styles.css        all styling (dark + light theme)
js/theory.js          the music theory engine: pure logic, no UI (tested)
js/fretboard.js       draws the guitar neck (SVG)
js/audio.js           small built-in synth (Web Audio), so no sound files are needed
js/app.js             the interface: tabs, state, clicks
tests/                automated tests for theory.js (run with `npm test`)
scripts/serve.js      optional local web server
docs/                 roadmap, how-it-works notes, beginner Git/GitHub guide
```

## Docs

- [Roadmap](docs/ROADMAP.md): what's planned next, and ideas waiting for your decision
- [How it works](docs/HOW_IT_WORKS.md): theory conventions and how the code fits together
- [Git & GitHub guide](docs/GIT_GUIDE.md): beginner-friendly guide to working on this repo
- [Changelog](CHANGELOG.md)

## License

MIT. See [LICENSE](LICENSE).
