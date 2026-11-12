# 🎸 Music Theory Lab

**Live app: https://ublubub.github.io/music-theory-lab/**

A visual, interactive way to learn music theory, built around the guitar fretboard (and a piano keyboard).

Pick a key and the app shows you its **scale**, the **scale degrees** (Roman numerals I–VII), the **chords** that
live in it, what **job** each chord does (tonic / subdominant / dominant), and helps you **build chord
progressions** and whole **songs** step by step. Every note and chord can be heard, and seen on the neck with
**playable chord shapes**.

Don't know the key? Enter the notes you hear (or **play them into your microphone**), starting with the first
one, and the app finds the keys and chords that fit.

## Features

| Tab | What you can do |
|---|---|
| **Scales & Degrees** | 12 scales and modes in any key: degrees, Roman numerals, degree names, intervals, step pattern, key signature. |
| **Chords in Key** | The 7 diatonic chords as triads or 7ths, colour-coded by harmonic function (T/S/D). |
| **Chord Builder** | 33 chord types on any root: formula, spelled notes, how the chord relates to your key. |
| **Progressions** | Type numerals (`I V vi IV`, `ii7 V7 Imaj7`, `I V7/vi vi IV/3`), load 17 famous progressions, get ranked "what comes next?" suggestions, see function flow and cadence, play it back. |
| **Songs** | Arrange progressions into sections (verse, chorus…) with repeats and lyrics. Play the whole song, print it or save as PDF, download a chord chart (.txt) or song file (.json), share a link. |
| **Advanced Harmony** | Secondary dominants, tritone substitutions, borrowed chords (modal interchange), modulation with pivot chords and closely related keys. |
| **Circle of Fifths** | Interactive circle: key signatures, relative/parallel keys, your key's chords highlighted. Click to change key. |
| **Intervals** | Every interval from the tonic, with its character, played melodically or harmonically. |
| **Ear Training** | Quizzes on intervals, chord quality, scale degrees and chords in a key, at 3 levels, with score and streaks. |
| **Find Key & Chord** | Enter notes on buttons, on the fretboard, or **by playing into the microphone** (with a built-in tuner). See matching keys and chords, including inversions. |

**Always on screen:** the fretboard and/or piano.
- Chord tones are colour-coded, and labels show note names or degrees.
- **Playable chord shapes** appear for every chord, with chord diagrams.
- **Scale positions**: the 5 pentatonic boxes, or 3 notes per string.
- 5 tunings, any fret range, and a **left-handed** mode.

**Sound:** guitar (plucked-string synthesis), piano, or synth. No sound files needed.

**Share links** reopen the same key, progression, tab or song. The app **installs** like a phone or desktop app
(PWA) and **works offline**.

Notes are always **spelled correctly** for the key (F♯ major has E♯, C°7 has B𝄫).

## Run it

- **Online:** https://ublubub.github.io/music-theory-lab/. On a phone, use "Add to Home Screen" to install it.
- **On your computer:** double-click `index.html`. The microphone and offline mode need the online version or
  `npm start`.
- **With a local server** (needs [Node.js](https://nodejs.org)): `npm start`, then open http://localhost:5173.

**Tests** (theory engine, guitar shapes, pitch detection): `npm test`

## Project structure

```
index.html              the page
css/styles.css          all styling (dark + light theme, print layout for song sheets)
js/theory.js            music theory engine: pure logic, no UI (tested)
js/guitar.js            chord-shape search and scale positions (tested)
js/audio.js             built-in instruments (Web Audio)
js/fretboard.js         draws the guitar neck and chord diagrams (SVG)
js/piano.js             draws the piano keyboard (SVG)
js/mic.js               microphone pitch detection (tested)
js/app.js               core interface: state, fretboard panel, tab system, player, share links
js/tabs/*.js            one file per bigger tab (progressions + songs, advanced + circle, ear training, find)
js/main.js              starts the app, registers the offline service worker
sw.js, manifest.webmanifest, icons/   installable app (PWA)
tests/                  automated tests (npm test)
docs/                   roadmap, how-it-works notes, beginner Git/GitHub guide
```

## Docs

- [Roadmap](docs/ROADMAP.md)
- [How it works](docs/HOW_IT_WORKS.md): theory conventions and how the code fits together
- [Git & GitHub guide](docs/GIT_GUIDE.md): beginner-friendly guide to working on this repo
- [Changelog](CHANGELOG.md)

## License

MIT. See [LICENSE](LICENSE).
