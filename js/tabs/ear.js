/*
 * Ear Training tab: quizzes for intervals, chord qualities, scale degrees and chords in a key.
 */
(function () {
  'use strict';
  const A = window.App;
  const { T, state, save, esc } = A;

  const LEVELS = { basic: 'Easy', more: 'Medium', all: 'Hard' };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const MODES = {
    interval: {
      name: 'Intervals',
      help: 'Two notes, one after the other. How far apart are they?',
      options: (lvl) => ({ basic: ['M2', 'M3', 'P4', 'P5', 'M6', 'P8'], more: ['m2', 'M2', 'm3', 'M3', 'P4', 'P5', 'm6', 'M6', 'P8'], all: ['m2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'] }[lvl])
        .map((k) => ({ id: k, label: `${T.INTERVALS[k].short} · ${T.INTERVALS[k].name.replace(' (tritone)', '')}` })),
      make(opts) {
        const ans = pick(opts);
        const rootMidi = 48 + Math.floor(Math.random() * 12);
        const iv = T.INTERVALS[ans.id];
        const harmonic = state.ear.level === 'all' && Math.random() < 0.4;
        return {
          answer: ans.id,
          play: () => (harmonic ? window.Sound.strum([rootMidi, rootMidi + iv.semis], { gap: 0 }) : window.Sound.arpeggio([rootMidi, rootMidi + iv.semis], { gap: 0.6, duration: 1.2 })),
          reveal: () => {
            const from = T.pcName(rootMidi % 12);
            const to = T.pcName((rootMidi + iv.semis) % 12);
            A.setFocus({ kind: 'interval', iv, from: { name: from, pc: rootMidi % 12 }, to: { name: to, pc: (rootMidi + iv.semis) % 12 }, title: `${iv.name}: ${from} → ${to}` });
            return `${iv.name} (${iv.semis} semitones${harmonic ? ', played together' : ''}): ${from} → ${to}`;
          },
        };
      },
    },
    quality: {
      name: 'Chord quality',
      help: 'One chord, strummed then arpeggiated. What type is it?',
      options: (lvl) => ({ basic: ['maj', 'min'], more: ['maj', 'min', 'dim', 'aug', 'sus4'], all: ['maj', 'min', 'dim', 'aug', 'maj7', '7', 'm7', 'm7b5', 'dim7'] }[lvl])
        .map((k) => ({ id: k, label: T.CHORD_TYPES[k].name })),
      make(opts) {
        const ans = pick(opts);
        const root = pick(['C', 'D', 'Eb', 'E', 'F', 'G', 'Ab', 'A', 'Bb', 'B']);
        const chord = A.analyze(root, ans.id);
        const midis = A.chordMidis(chord);
        return {
          answer: ans.id,
          play: () => { window.Sound.strum(midis); setTimeout(() => window.Sound.arpeggio(midis, { gap: 0.3 }), 1300); },
          reveal: () => { A.focusChord(chord, { title: `${chord.name}: ${chord.typeName}` }); return `${chord.name}: ${chord.typeName} (${chord.notes.map((n) => n.interval.short).join(' ')})`; },
        };
      },
    },
    degree: {
      name: 'Scale degrees',
      help: 'You hear the key (I–IV–V–I), then one note. Which scale degree is it?',
      options(lvl) {
        const scale = T.buildScale(state.keyRoot, state.scale);
        const keep = { basic: [1, 3, 5], more: [1, 2, 3, 4, 5], all: null }[lvl];
        return scale.filter((n) => !keep || keep.includes(n.interval.deg)).map((n) => ({ id: n.interval.short, label: `${n.interval.short} · ${n.degreeName}`, pc: n.pc }));
      },
      make(opts) {
        const ans = pick(opts);
        const tonic = T.pc(T.parseNote(state.keyRoot));
        const base = 48 + tonic;
        const midi = base + T.mod(ans.pc - tonic, 12) + (Math.random() < 0.3 ? 12 : 0);
        return {
          answer: ans.id,
          play: () => { cadence(); setTimeout(() => window.Sound.pluck(midi, 0, 1.6, 0.3), 2600); },
          replayNote: () => window.Sound.pluck(midi, 0, 1.6, 0.3),
          reveal: () => {
            const name = T.pcName(ans.pc);
            A.setFocus({ kind: 'interval', iv: { short: ans.id, name: ans.label }, from: { name: T.pcName(tonic), pc: tonic }, to: { name, pc: ans.pc }, title: `Degree ${ans.id} in ${A.keyName()}: ${name}` });
            return `Degree ${ans.label}: the note ${name}`;
          },
        };
      },
    },
    chord: {
      name: 'Chords in key',
      help: 'You hear the key (I–IV–V–I), then one chord. Which Roman numeral is it?',
      options(lvl) {
        const chords = T.diatonicChords(state.keyRoot, state.scale);
        if (!chords.length) return [];
        const keep = { basic: [1, 4, 5], more: [1, 2, 4, 5, 6], all: null }[lvl];
        return chords.filter((c) => !keep || keep.includes(c.degree)).map((c) => ({ id: c.numeral, label: c.numeral, chord: c }));
      },
      make(opts) {
        const ans = pick(opts);
        return {
          answer: ans.id,
          play: () => { cadence(); setTimeout(() => A.playChord(ans.chord), 2600); },
          replayNote: () => A.playChord(ans.chord),
          reveal: () => { A.focusChord(ans.chord); return `${ans.chord.numeral} = ${ans.chord.name} (${T.FUNCTIONS[ans.chord.fn].name} function)`; },
        };
      },
    },
  };

  function cadence() {
    const chords = T.parseProgression('I IV V I', state.keyRoot, 'major').chords;
    const minor = T.SCALES[state.scale].family === 'minor';
    const prog = minor ? T.parseProgression('i iv V i', state.keyRoot, state.scale).chords : chords;
    prog.forEach((c, i) => setTimeout(() => window.Sound.strum(A.chordMidis(c), { duration: 0.7 }), i * 600));
  }

  let q = null;       // current question
  let result = null;  // { correct: bool, chosen, text }
  const stats = () => {
    const s = state.ear.stats[state.ear.mode] || (state.ear.stats[state.ear.mode] = { right: 0, total: 0, streak: 0, best: 0 });
    return s;
  };

  function ask() {
    const mode = MODES[state.ear.mode];
    const opts = mode.options(state.ear.level);
    if (!opts.length) { q = null; return; }
    q = { ...mode.make(opts), opts };
    result = null;
    A.renderTab();
    q.play();
  }

  A.registerTab({
    id: 'ear', label: 'Ear Training', order: 90,
    render() {
      const mode = MODES[state.ear.mode];
      const s = stats();
      const opts = q ? q.opts : mode.options(state.ear.level);
      return `
        <section class="panel">
          <div class="panel-head">
            <h2>Ear training</h2>
            <div class="btn-row">
              <div class="seg">${Object.entries(MODES).map(([k, m]) => `<button class="${k === state.ear.mode ? 'on' : ''}" data-action="ear-mode" data-mode="${k}">${m.name}</button>`).join('')}</div>
              <div class="seg">${Object.entries(LEVELS).map(([k, n]) => `<button class="${k === state.ear.level ? 'on' : ''}" data-action="ear-level" data-level="${k}">${n}</button>`).join('')}</div>
            </div>
          </div>
          <p>${esc(mode.help)}${['degree', 'chord'].includes(state.ear.mode) ? ` Uses your current key: <b>${esc(A.keyName())}</b>.` : ''}</p>
          <div class="ear-stats">
            <span>Score <b>${s.right}/${s.total}</b>${s.total ? ` (${Math.round((100 * s.right) / s.total)}%)` : ''}</span>
            <span>Streak <b>${s.streak}</b></span><span>Best <b>${s.best}</b></span>
            <button class="icon-btn" data-action="ear-reset" title="Reset score">Reset</button>
          </div>
          ${!opts.length ? '<p class="error">This quiz needs a 7-note key. Pick Major or Minor in the top bar.</p>' : !q ? `
            <button class="btn primary big-btn" data-action="ear-start">▶ Start</button>` : `
            <div class="btn-row ear-controls">
              <button class="btn" data-action="ear-replay">↻ Replay</button>
              ${q.replayNote ? '<button class="btn" data-action="ear-replay-note">↻ Just the note/chord</button>' : ''}
              ${result ? '<button class="btn primary" data-action="ear-next">Next →</button>' : ''}
            </div>
            <div class="ear-answers">
              ${opts.map((o) => {
                let cls = '';
                if (result) cls = o.id === q.answer ? ' right' : o.id === result.chosen ? ' wrong' : ' dim';
                return `<button class="ear-answer${cls}" data-action="ear-answer" data-id="${esc(o.id)}"${result ? ' disabled' : ''}>${esc(o.label)}</button>`;
              }).join('')}
            </div>
            ${result ? `<p class="ear-result ${result.correct ? 'ok' : 'bad'}">${result.correct ? '✓ Correct!' : '✗ Not quite.'} ${esc(result.text)}</p>` : ''}`}
        </section>
        <details class="learn">
          <summary>Tips for hearing intervals</summary>
          <ul>
            <li>Link each interval to a song you know, e.g. <b>P4</b> "Here Comes the Bride", <b>P5</b> "Twinkle Twinkle" (2nd note), <b>M6</b> "My Bonnie", <b>m3</b> "Greensleeves", <b>P8</b> "Somewhere Over the Rainbow".</li>
            <li>For chord quality, listen to the <b>3rd</b> (bright = major, dark = minor) and then the <b>5th</b> (tense and small = diminished, stretched = augmented).</li>
            <li>For scale degrees, sing back down to the tonic: the number of steps tells you the degree.</li>
            <li>A few minutes every day beats an hour once a week.</li>
          </ul>
        </details>`;
    },
    onLeave: () => { q = null; result = null; },
    onKeyChange: () => { q = null; result = null; },
    actions: {
      'ear-mode': (d) => { state.ear.mode = d.mode; q = null; result = null; save(); A.renderTab(); },
      'ear-level': (d) => { state.ear.level = d.level; q = null; result = null; save(); A.renderTab(); },
      'ear-start': () => ask(),
      'ear-next': () => ask(),
      'ear-replay': () => q && q.play(),
      'ear-replay-note': () => q && q.replayNote && q.replayNote(),
      'ear-reset': () => { state.ear.stats[state.ear.mode] = { right: 0, total: 0, streak: 0, best: 0 }; save(); A.renderTab(); },
      'ear-answer': (d) => {
        if (!q || result) return;
        const s = stats();
        const correct = d.id === q.answer;
        s.total++;
        if (correct) { s.right++; s.streak++; s.best = Math.max(s.best, s.streak); } else s.streak = 0;
        save();
        result = { correct, chosen: d.id, text: q.reveal() };
        A.renderTab();
      },
    },
  });
})();
