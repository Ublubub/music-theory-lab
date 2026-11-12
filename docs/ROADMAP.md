# Roadmap

Status: ✅ done · 🔜 planned next · 💡 idea, needs your decision

## v0.1: Foundations ✅

- ✅ Theory engine with correct spelling (letters + accidentals)
- ✅ 12 scales and modes, scale degrees, Roman numerals, degree names, step patterns
- ✅ Diatonic triads and 7th chords with harmonic function (T / S / D)
- ✅ Chord builder with 33 chord types
- ✅ Progression builder: numeral input, presets, next-chord suggestions, cadence detection, playback
- ✅ Intervals reference with playback
- ✅ Key and chord finder from notes (first note weighted as tonic)
- ✅ Interactive fretboard: roles, labels, tunings, click to play
- ✅ Automated tests for the theory engine (and CI on GitHub)

## v0.2: Advanced harmony 🔜

The "advanced music theory" part of the original idea:

- 🔜 **Secondary dominants** (V/ii, V/V, V7/vi…): chords that briefly point at a chord other than I
- 🔜 **Borrowed chords / modal interchange**: a panel showing chords from the parallel minor (or major) and from the modes
- 🔜 **Tritone substitution** (♭II7 for V7) and other jazz substitutions
- 🔜 **Slash chords and inversions** in the progression input (`I/3`, `V/7`)
- 🔜 **Modulation helper**: pivot chords shared between two keys

## v0.3: Guitar-specific 🔜

- 🔜 **Playable chord shapes / voicings** (CAGED shapes, drop-2, shell voicings) instead of every note on the neck
- 🔜 **Scale positions** (the 5 pentatonic boxes, 3-notes-per-string)
- 🔜 Left-handed fretboard and a "show only frets X–Y" zoom

## 💡 Ideas for you to decide on

| Idea | Why it might help |
|---|---|
| **Ear-training quizzes** (name the interval / chord quality / degree) | Turns knowledge into hearing, the step most self-learners skip |
| **Song sheet / export**: save a progression with sections (verse, chorus) and print or share it | Actually building out songs, as in the original goal |
| **Share links**: encode key and progression in the URL | Send a progression to a friend or bandmate |
| **Microphone note detection**: play a note on your guitar and the app recognises it | Feed the key finder by playing instead of clicking |
| **Circle of fifths view** | Shows key relationships and why ii–V–I works |
| **Piano keyboard view** next to the fretboard | Many theory resources use piano layout |
| **Better sounds** (sampled guitar or piano) | The current synth is functional, not pretty |
| **Install as an app (PWA)** so it works offline on your phone | Practice anywhere |
