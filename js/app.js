/*
 * app.js: the user interface. Reads/writes `state`, re-renders the page, and wires up clicks.
 * Theory comes from theory.js (window.Theory), the neck from fretboard.js, sound from audio.js.
 */
(function () {
  'use strict';
  const T = window.Theory;
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------------------------------------------------------------------------
  // State (saved in your browser so the app remembers where you were)
  // ---------------------------------------------------------------------------
  const DEFAULTS = {
    keyRoot: 'C', scale: 'major', tab: 'scales', labelMode: 'name', tuning: 'standard', frets: 15,
    sevenths: false, progression: ['I', 'V', 'vi', 'IV'], tempo: 90, beatsPerChord: 4, loop: true,
    builderRoot: 'C', builderType: 'maj7', finder: [],
  };
  const STORAGE_KEY = 'music-theory-lab:v1';
  let state = { ...DEFAULTS };
  try { Object.assign(state, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); } catch (e) { /* ignore */ }
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } };

  let focus = null;      // what the fretboard shows: null = the scale, or { kind: 'chord' | 'interval', ... }
  let playTimer = null;  // progression playback
  let playIndex = -1;

  const TABS = [
    ['scales', 'Scales & Degrees'],
    ['chords', 'Chords in Key'],
    ['builder', 'Chord Builder'],
    ['progressions', 'Progressions'],
    ['intervals', 'Intervals'],
    ['find', 'Find Key & Chord'],
  ];

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const keyName = () => `${T.noteName(T.parseNote(state.keyRoot))} ${T.SCALES[state.scale].name}`;
  const fnBadge = (fn) => `<span class="fn fn-${fn}" title="${esc(T.FUNCTIONS[fn].name)}">${fn}</span>`;

  /** MIDI notes for a chord in a comfortable guitar register (root between A2 and G♯3). */
  function chordMidis(notes) {
    const base = 45 + T.mod(notes[0].pc - 9, 12);
    return notes.map((n) => base + n.interval.semis);
  }

  function playChord(rootName, type) { window.Sound.strum(chordMidis(T.chordNotes(rootName, type))); }

  function focusChord(rootName, type, extra = '') {
    const root = T.parseNote(rootName);
    const a = T.analyzeChord(state.keyRoot, state.scale, root, type);
    focus = { kind: 'chord', root, type, title: `${a.name}: ${a.typeName}${extra || ` (${a.numeral} in ${keyName()})`}` };
    renderFretboard();
  }

  function progressionChords() {
    return T.parseProgression(state.progression.join(' '), state.keyRoot, state.scale).chords;
  }

  // ---------------------------------------------------------------------------
  // Header: key picker
  // ---------------------------------------------------------------------------
  function renderKeyPicker() {
    $('#key-root').innerHTML = T.KEY_ROOTS.map((r) =>
      `<option value="${r}"${r === state.keyRoot ? ' selected' : ''}>${T.noteName(T.parseNote(r))}</option>`).join('');
    $('#key-scale').innerHTML = Object.entries(T.SCALES).map(([k, s]) =>
      `<option value="${k}"${k === state.scale ? ' selected' : ''}>${esc(s.name)}</option>`).join('');
  }

  // ---------------------------------------------------------------------------
  // Fretboard
  // ---------------------------------------------------------------------------
  function fretboardModel() {
    const marks = new Map();
    const scale = T.buildScale(state.keyRoot, state.scale);

    if (state.tab === 'find' && !focus) {
      state.finder.forEach((p, i) => marks.set(p, { name: T.pcName(p), label: i === 0 ? '1st' : T.pcName(p), role: i === 0 ? 'root' : 'picked' }));
      return { marks, caption: state.finder.length ? 'Your notes (the first one is outlined as the likely tonic)' : 'Click frets or note buttons to enter notes' };
    }
    if (!focus && state.tab === 'builder') {
      const a = T.analyzeChord(state.keyRoot, state.scale, state.builderRoot, state.builderType);
      focus = { kind: 'chord', root: a.root, type: a.type, title: `${a.name}: ${a.typeName} (${a.numeral} in ${keyName()})` };
    }
    if (focus && focus.kind === 'chord') {
      const notes = T.chordNotes(focus.root, focus.type);
      // Scale notes not in the chord are shown faintly, labelled relative to the chord root.
      const REL = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];
      scale.forEach((n) => marks.set(n.pc, { name: n.name, label: REL[T.mod(n.pc - T.pc(focus.root), 12)], role: 'ghost' }));
      notes.forEach((n) => marks.set(n.pc, { name: n.name, label: n.interval.short, role: n.role }));
      return { marks, caption: focus.title, legend: true };
    }
    if (focus && focus.kind === 'interval') {
      const root = scale[0];
      marks.set(root.pc, { name: root.name, label: '1', role: 'root' });
      if (focus.note.pc !== root.pc) marks.set(focus.note.pc, { name: focus.note.name, label: focus.iv.short, role: 'third' });
      return { marks, caption: `${focus.iv.name}: ${root.name} → ${focus.note.name}` };
    }
    scale.forEach((n, i) => marks.set(n.pc, { name: n.name, label: n.interval.short, role: i === 0 ? 'root' : 'tone' }));
    return { marks, caption: `${keyName()} scale: ${scale.map((n) => n.name).join(' ')}` };
  }

  function renderFretboard() {
    const { marks, caption, legend } = fretboardModel();
    $('#fb-caption').textContent = caption;
    $('#fb-legend').hidden = !legend;
    $('#fb-show-scale').hidden = !focus;
    window.Fretboard.render($('#fretboard'), {
      tuning: window.Fretboard.TUNINGS[state.tuning].midi,
      frets: Number(state.frets),
      marks,
      labelMode: state.labelMode,
      onNote: (midi, p) => {
        window.Sound.pluck(midi);
        if (state.tab === 'find') toggleFinder(p);
      },
    });
  }

  function renderFretboardControls() {
    $('#label-mode').value = state.labelMode;
    $('#frets').value = String(state.frets);
    $('#tuning').innerHTML = Object.entries(window.Fretboard.TUNINGS).map(([k, t]) =>
      `<option value="${k}"${k === state.tuning ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
  }

  // ---------------------------------------------------------------------------
  // Tab: Scales & Degrees
  // ---------------------------------------------------------------------------
  function renderScales() {
    const scale = T.buildScale(state.keyRoot, state.scale);
    const steps = T.stepPattern(state.keyRoot, state.scale);
    const info = T.SCALES[state.scale];
    const seven = scale.length === 7;
    const chords = seven ? T.diatonicChords(state.keyRoot, state.scale) : [];
    const rows = scale.map((n, i) => `
      <tr>
        <td class="big">${seven ? chords[i].numeral : '–'}</td>
        <td><span class="deg">${n.interval.short}</span></td>
        <td><button class="note-btn" data-action="play-note" data-pc="${n.pc}">${n.name}</button></td>
        <td>${n.degreeName}</td>
        <td>${n.interval.name}</td>
        <td class="muted">${steps[i]} ↓</td>
      </tr>`).join('');
    return `
      <section class="panel">
        <div class="panel-head">
          <h2>${esc(keyName())}</h2>
          <button class="btn primary" data-action="play-scale">▶ Play scale</button>
        </div>
        <p>${esc(info.blurb)}</p>
        <p class="steps">Step pattern: ${steps.map((s) => `<span class="step step-${s.replace('+', '')}">${s}</span>`).join('')}</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Numeral</th><th>Degree</th><th>Note</th><th>Name</th><th>Interval from tonic</th><th>Step to next</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </section>
      <details class="learn" open>
        <summary>How scale degrees work</summary>
        <p>Each note of a scale gets a number (1–7) by its position above the tonic. The numbers are compared to the <b>major scale</b>: in A minor, C is the <b>♭3</b> because it is one half step lower than the 3rd of A major (C♯).</p>
        <p><b>Roman numerals</b> name the chord built on each degree: UPPER CASE = major, lower case = minor, ° = diminished, + = augmented. Because they don't name specific notes, <code>I–V–vi–IV</code> describes the same song in every key.</p>
        <p><b>W</b> = whole step (2 frets), <b>H</b> = half step (1 fret). The major scale is always W W H W W W H.</p>
      </details>`;
  }

  // ---------------------------------------------------------------------------
  // Tab: Chords in Key
  // ---------------------------------------------------------------------------
  function chordCard(c, { add = true, active = false, index = null } = {}) {
    const rootAscii = T.asciiName(c.root);
    return `
      <div class="chord-card fnb-${c.fn}${active ? ' active' : ''}${c.diatonic ? '' : ' outside'}" ${index !== null ? `data-index="${index}"` : ''}>
        <button class="chord-main" data-action="focus-chord" data-root="${rootAscii}" data-type="${c.type}">
          <span class="numeral">${esc(c.numeral)}</span>
          <span class="chord-name">${esc(c.name)}</span>
          <span class="chord-notes">${c.notes.map((n) => n.name).join(' ')}</span>
        </button>
        <div class="chord-foot">
          ${fnBadge(c.fn)}
          ${c.diatonic ? '' : '<span class="tag" title="Uses notes outside the key">outside key</span>'}
          ${add ? `<button class="icon-btn" data-action="add-chord" data-numeral="${esc(c.numeral)}" title="Add to progression">＋</button>` : ''}
        </div>
      </div>`;
  }

  function sevenToggle() {
    return `<div class="seg" role="group" aria-label="Chord size">
      <button class="${state.sevenths ? '' : 'on'}" data-action="set-sevenths" data-value="0">Triads</button>
      <button class="${state.sevenths ? 'on' : ''}" data-action="set-sevenths" data-value="1">7th chords</button>
    </div>`;
  }

  function renderChords() {
    const chords = T.diatonicChords(state.keyRoot, state.scale, state.sevenths);
    if (!chords.length) {
      return `<section class="panel"><h2>Chords in ${esc(keyName())}</h2>
        <p>Chords are built by stacking every other note of a <b>7-note</b> scale, so pentatonic and blues scales don't have their own chord set. Pick Major, Minor or a mode to see the chords. (Pentatonic scales are usually played over the chords of their parent major or minor key.)</p></section>`;
    }
    const isMode = !['major', 'minor', 'harmonicMinor'].includes(state.scale);
    return `
      <section class="panel">
        <div class="panel-head"><h2>Chords in ${esc(keyName())}</h2>${sevenToggle()}</div>
        <p class="muted">Click a chord to hear it and see it on the neck. Use ＋ to add it to your progression.</p>
        <div class="chord-grid">${chords.map((c) => chordCard(c)).join('')}</div>
      </section>
      <section class="panel">
        <h3>Harmonic function: the job each chord does</h3>
        <div class="fn-legend">
          ${Object.values(T.FUNCTIONS).map((f) => `<div>${fnBadge(f.key)} <b>${f.name}</b>: ${esc(f.desc)}</div>`).join('')}
        </div>
        <p>The usual journey is <b>T → S → D → T</b>: leave home, build tension, resolve. Chords with the same function can usually stand in for each other (vi for I, ii for IV).</p>
        ${isMode ? '<p class="muted">Note: function labels come from major/minor harmony and only roughly apply to modes, where the "characteristic" chord matters more.</p>' : ''}
      </section>
      <details class="learn">
        <summary>How these chords are built</summary>
        <p>Start on a scale note, then skip a note, take one, skip one: <b>1-3-5</b> (a triad), or <b>1-3-5-7</b> for a 7th chord. Doing this from every degree gives the 7 chords of the key. In every major key you get the same pattern: <b>I ii iii IV V vi vii°</b>.</p>
      </details>`;
  }

  // ---------------------------------------------------------------------------
  // Tab: Chord Builder
  // ---------------------------------------------------------------------------
  function renderBuilder() {
    const root = state.builderRoot;
    const type = T.CHORD_TYPES[state.builderType];
    const notes = T.chordNotes(root, type.key);
    const a = T.analyzeChord(state.keyRoot, state.scale, root, type.key);
    const groups = T.CHORD_CATEGORIES.map((cat) => `
      <div class="type-group"><h4>${cat}</h4><div class="type-list">
        ${T.CHORD_LIST.filter((t) => t.category === cat).map((t) =>
          `<button class="chip${t.key === type.key ? ' on' : ''}" data-action="builder-type" data-type="${t.key}" title="${esc(t.name)}">${esc(T.noteName(T.parseNote(root)) + t.symbol)}</button>`).join('')}
      </div></div>`).join('');
    return `
      <section class="panel">
        <div class="panel-head">
          <h2>Chord Builder</h2>
          <label class="inline">Root
            <select id="builder-root">${T.KEY_ROOTS.map((r) => `<option value="${r}"${r === root ? ' selected' : ''}>${T.noteName(T.parseNote(r))}</option>`).join('')}</select>
          </label>
        </div>
        ${groups}
      </section>
      <section class="panel builder-result">
        <div class="panel-head">
          <h2>${esc(a.name)} <span class="muted">${esc(type.name)}</span></h2>
          <div class="btn-row">
            <button class="btn primary" data-action="play-builder">▶ Strum</button>
            <button class="btn" data-action="arp-builder">Arpeggio</button>
            <button class="btn" data-action="add-chord" data-numeral="${esc(a.numeral)}">＋ Add to progression</button>
          </div>
        </div>
        <div class="formula">
          ${notes.map((n) => `<div class="tone role-${n.role}"><span class="tone-deg">${n.interval.short}</span><span class="tone-note">${n.name}</span><span class="tone-iv">${n.interval.name}</span></div>`).join('')}
        </div>
        <p><b>Formula:</b> ${notes.map((n) => n.interval.short).join(' – ')}</p>
        <p><b>In ${esc(keyName())}:</b> ${esc(a.numeral)} ${fnBadge(a.fn)}
          ${a.diatonic ? ' all notes belong to the key.' : ` uses notes outside the key: <b>${a.outside.map((n) => n.name).join(', ')}</b> (a borrowed or chromatic chord).`}</p>
      </section>
      <details class="learn">
        <summary>Reading chord formulas</summary>
        <p>Every chord is a root plus intervals stacked above it. <b>3</b> vs <b>♭3</b> decides major vs minor. <b>5</b> is the stable "glue", ♭5 and ♯5 make diminished and augmented. Add <b>♭7</b> for dominant tension, <b>7</b> for a smooth major 7th.</p>
        <p>Extensions (9, 11, 13) are the 2nd, 4th and 6th an octave higher. On guitar you often leave out the 5th (and sometimes the root) of big chords: the 3rd and 7th carry the sound.</p>
      </details>`;
  }

  // ---------------------------------------------------------------------------
  // Tab: Progressions
  // ---------------------------------------------------------------------------
  function renderProgressions() {
    const parsed = T.parseProgression(state.progression.join(' '), state.keyRoot, state.scale);
    const chords = parsed.chords;
    const cadence = T.detectCadence(chords);
    const suggestions = T.suggestNext(state.keyRoot, state.scale, chords, state.sevenths).slice(0, 5);
    const fam = T.SCALES[state.scale].family;
    const presets = T.PRESETS.slice().sort((a, b) => (b.family === fam) - (a.family === fam));

    return `
      <section class="panel">
        <div class="panel-head">
          <h2>Your progression in ${esc(keyName())}</h2>
          <div class="btn-row">
            <button class="btn primary" data-action="${playTimer ? 'prog-stop' : 'prog-play'}">${playTimer ? '■ Stop' : '▶ Play'}</button>
            <label class="inline">BPM <input id="tempo" type="number" min="40" max="220" value="${state.tempo}"></label>
            <label class="inline">Beats/chord <input id="beats" type="number" min="1" max="8" value="${state.beatsPerChord}"></label>
            <label class="inline"><input id="loop" type="checkbox"${state.loop ? ' checked' : ''}> Loop</label>
            <button class="btn" data-action="prog-clear">Clear</button>
          </div>
        </div>
        <form class="prog-input" data-action="prog-apply">
          <input id="prog-text" type="text" spellcheck="false" autocomplete="off" value="${esc(state.progression.join(' '))}" aria-label="Progression as Roman numerals" placeholder="Type numerals, e.g. I V vi IV or ii7 V7 Imaj7">
          <button class="btn" type="submit">Apply</button>
        </form>
        ${parsed.errors.map((e) => `<p class="error">${esc(e)}</p>`).join('')}
        <div class="prog-strip">
          ${chords.length ? chords.map((c, i) => `
            <div class="prog-item">
              ${chordCard(c, { add: false, active: i === playIndex, index: i })}
              <button class="icon-btn remove" data-action="prog-remove" data-index="${i}" title="Remove">×</button>
            </div>`).join('') : '<p class="muted">Empty. Add chords from the suggestions below, the Chords in Key tab, or type numerals above.</p>'}
        </div>
        ${chords.length ? `<p class="flow">Function flow: ${chords.map((c) => fnBadge(c.fn)).join('<span class="arrow">→</span>')}</p>` : ''}
        ${cadence ? `<p><b>${esc(cadence.name)}</b>: ${esc(cadence.desc)}</p>` : ''}
      </section>

      <section class="panel">
        <div class="panel-head"><h3>What could come next?</h3>${sevenToggle()}</div>
        <p class="muted">Ranked by root movement and harmonic function. Suggestions, not rules: trust your ear.</p>
        <div class="suggestions">
          ${suggestions.map((s) => `
            <div class="suggestion">
              <button class="btn suggestion-add" data-action="add-chord" data-numeral="${esc(s.chord.numeral)}">＋ ${esc(s.chord.numeral)} <span class="muted">${esc(s.chord.name)}</span></button>
              <button class="icon-btn" data-action="focus-chord" data-root="${T.asciiName(s.chord.root)}" data-type="${s.chord.type}" title="Preview">▶</button>
              ${fnBadge(s.chord.fn)}
              <span class="score" title="Score">${'●'.repeat(Math.max(0, Math.min(5, s.score)))}${'○'.repeat(Math.max(0, 5 - Math.max(0, Math.min(5, s.score))))}</span>
              <span class="reasons">${s.reasons.map(esc).join(' · ')}</span>
            </div>`).join('') || '<p class="muted">Suggestions need a 7-note scale.</p>'}
        </div>
      </section>

      <section class="panel">
        <h3>Famous progressions</h3>
        <p class="muted">Written in numerals, so they play in your current key. Ones that fit a ${fam} key are listed first.</p>
        <div class="presets">
          ${presets.map((p) => `<button class="preset" data-action="prog-preset" data-prog="${esc(p.numerals)}">
            <b>${esc(p.name)}</b> <span class="tag">${p.family}</span><br><code>${esc(p.numerals)}</code><br><span class="muted">${esc(p.note)}</span></button>`).join('')}
        </div>
      </section>

      <details class="learn">
        <summary>Building a song from just the key</summary>
        <ol>
          <li>Pick the key in the top bar (if you don't know it, use <b>Find Key &amp; Chord</b>).</li>
          <li>Start on <b>I</b> (or <b>i</b>) and use the suggestions: chords whose root falls a 5th (like ii → V → I) pull strongest.</li>
          <li>End on <b>V</b> to loop back smoothly, or on <b>I</b> to finish.</li>
          <li>For colour, borrow chords from the parallel minor (♭VII, ♭VI, iv) by typing them above.</li>
        </ol>
        <p>Typing tips: <code>b</code> = flat, <code>#</code> = sharp, <code>°</code> or <code>o</code> = diminished, <code>ø7</code> = half-diminished, <code>maj7</code>, <code>7</code>, <code>sus4</code>, <code>add9</code>…</p>
      </details>`;
  }

  // ---------------------------------------------------------------------------
  // Tab: Intervals
  // ---------------------------------------------------------------------------
  const SIMPLE_IVS = ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];
  function renderIntervals() {
    const root = T.parseNote(state.keyRoot);
    const rows = SIMPLE_IVS.map((k) => {
      const iv = T.INTERVALS[k];
      const n = T.transpose(root, k);
      return `<tr>
        <td><b>${iv.short}</b></td><td>${iv.name}</td><td>${iv.semis}</td>
        <td>${T.noteName(root)} → <b>${T.noteName(n)}</b></td>
        <td class="muted">${esc(T.INTERVAL_CHARACTER[k] || '')}</td>
        <td class="nowrap">
          <button class="icon-btn" data-action="interval" data-iv="${k}" data-mode="melodic" title="Play one after the other">♪♪</button>
          <button class="icon-btn" data-action="interval" data-iv="${k}" data-mode="harmonic" title="Play together">♫</button>
        </td></tr>`;
    }).join('');
    return `
      <section class="panel">
        <h2>Intervals from ${T.noteName(root)}</h2>
        <p class="muted">An interval is the distance between two notes. Every scale and chord is built from them. Click to hear one and see it on the neck.</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Degree</th><th>Interval</th><th>Semitones (frets)</th><th>Example</th><th>Character</th><th>Play</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </section>
      <details class="learn">
        <summary>Intervals on the guitar</summary>
        <p>One fret = one semitone. On the same string, a <b>major 3rd</b> is 4 frets up and a <b>perfect 5th</b> is 7. Across strings (standard tuning), the next string up is a <b>4th</b> higher, except G → B, which is a <b>major 3rd</b>. That's why shapes shift by one fret when they cross onto the B string.</p>
      </details>`;
  }

  // ---------------------------------------------------------------------------
  // Tab: Find Key & Chord
  // ---------------------------------------------------------------------------
  function toggleFinder(p) {
    const i = state.finder.indexOf(p);
    if (i >= 0) state.finder.splice(i, 1); else state.finder.push(p);
    focus = null;
    save();
    renderTab();
    renderFretboard();
  }

  function renderFind() {
    const picked = state.finder;
    const keys = T.findKeys(picked, ['major', 'minor']).slice(0, 8);
    const chordMatches = T.identifyChords(picked).slice(0, 8);
    const intervals = picked.slice(1).map((p, i) => `${T.pcName(picked[i])} → ${T.pcName(p)}: <b>${T.intervalName(picked[i], p)}</b>`);
    return `
      <section class="panel">
        <div class="panel-head">
          <h2>Find the key or chord from notes</h2>
          <div class="btn-row">
            <button class="btn" data-action="find-play" ${picked.length ? '' : 'disabled'}>▶ Play notes</button>
            <button class="btn" data-action="find-clear">Clear</button>
          </div>
        </div>
        <p class="muted">Play a melody or chord, then enter its notes here or by clicking the fretboard, <b>starting with the first note</b>. The first note is often the tonic, so keys that start there rank higher.</p>
        <div class="note-picker">
          ${T.COMMON_SPELLING.map((n, p) => `<button class="note-toggle${picked.includes(p) ? ' on' : ''}${picked[0] === p ? ' first' : ''}" data-action="find-toggle" data-pc="${p}">${T.pcName(p)}</button>`).join('')}
        </div>
        ${picked.length ? `<p><b>Your notes:</b> ${picked.map((p) => T.pcName(p)).join(' · ')}</p>` : ''}
        ${intervals.length ? `<p class="muted">Intervals between your notes: ${intervals.join(' · ')}</p>` : ''}
      </section>
      <div class="two-col">
        <section class="panel">
          <h3>Possible keys</h3>
          ${picked.length ? (keys.length ? `<ul class="results">${keys.map((k) => `
            <li><button class="btn" data-action="use-key" data-root="${k.root}" data-scale="${k.scaleKey}">Use</button>
            <b>${esc(k.name)}</b> <span class="muted">${esc(k.why.join('; '))}</span></li>`).join('')}</ul>`
            : '<p>No major or natural minor key contains all of these notes. Try removing one: it may be a passing or borrowed note.</p>')
            : '<p class="muted">Enter some notes first.</p>'}
        </section>
        <section class="panel">
          <h3>Matching chords</h3>
          ${picked.length < 2 ? '<p class="muted">Enter at least 2 notes.</p>' : chordMatches.length ? `<ul class="results">${chordMatches.map((c) => `
            <li><button class="btn" data-action="focus-chord" data-root="${c.root}" data-type="${c.type}">▶</button>
            <b>${esc(c.name)}</b> <span class="muted">${esc(c.typeName)}${c.rootPosition ? '' : ' (inversion: first note isn\'t the root)'}</span></li>`).join('')}</ul>`
            : '<p class="muted">These notes don\'t form a chord in the library exactly.</p>'}
        </section>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const RENDERERS = { scales: renderScales, chords: renderChords, builder: renderBuilder, progressions: renderProgressions, intervals: renderIntervals, find: renderFind };

  function renderTabs() {
    $('#tabs').innerHTML = TABS.map(([k, label]) =>
      `<button role="tab" aria-selected="${k === state.tab}" class="${k === state.tab ? 'on' : ''}" data-action="tab" data-tab="${k}">${label}</button>`).join('');
  }

  function renderTab() { $('#content').innerHTML = RENDERERS[state.tab](); }

  function renderAll() {
    renderKeyPicker();
    renderFretboardControls();
    renderTabs();
    renderTab();
    renderFretboard();
  }

  // ---------------------------------------------------------------------------
  // Progression playback
  // ---------------------------------------------------------------------------
  function stopProgression() {
    clearTimeout(playTimer);
    playTimer = null;
    playIndex = -1;
    if (state.tab === 'progressions') renderTab();
  }

  function playProgression() {
    const chords = progressionChords();
    if (!chords.length) return;
    const barMs = (60000 / state.tempo) * state.beatsPerChord;
    const step = (i) => {
      if (i >= chords.length) {
        if (!state.loop) { stopProgression(); return; }
        i = 0;
      }
      playIndex = i;
      const c = chords[i];
      window.Sound.strum(chordMidis(c.notes), { duration: Math.min(3, barMs / 1000 + 0.3) });
      focusChord(T.asciiName(c.root), c.type);
      document.querySelectorAll('.prog-strip .chord-card').forEach((el) => el.classList.toggle('active', Number(el.dataset.index) === i));
      playTimer = setTimeout(() => step(i + 1), barMs);
    };
    playTimer = -1; // mark as playing before first render
    if (state.tab === 'progressions') renderTab();
    step(0);
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.tagName === 'FORM') return;
    const d = el.dataset;
    switch (d.action) {
      case 'tab':
        state.tab = d.tab;
        save();
        history.replaceState(null, '', `#${d.tab}`);
        if (d.tab !== 'chords' && d.tab !== 'progressions') focus = null;
        renderTabs(); renderTab(); renderFretboard();
        break;
      case 'play-scale': {
        const s = T.buildScale(state.keyRoot, state.scale);
        const base = 48 + s[0].pc;
        window.Sound.arpeggio([...s.map((n) => base + T.mod(n.pc - s[0].pc, 12)), base + 12]);
        break;
      }
      case 'play-note': window.Sound.pluck(48 + Number(d.pc)); break;
      case 'focus-chord': focusChord(d.root, d.type); playChord(d.root, d.type); break;
      case 'show-scale': focus = null; renderFretboard(); break;
      case 'add-chord':
        state.progression.push(d.numeral);
        save();
        flash(`Added ${d.numeral} to your progression`);
        if (state.tab === 'progressions') renderTab();
        break;
      case 'set-sevenths': state.sevenths = d.value === '1'; save(); renderTab(); break;
      case 'builder-type':
        state.builderType = d.type; save(); renderTab();
        focusChord(state.builderRoot, state.builderType); playChord(state.builderRoot, state.builderType);
        break;
      case 'play-builder': playChord(state.builderRoot, state.builderType); break;
      case 'arp-builder': window.Sound.arpeggio(chordMidis(T.chordNotes(state.builderRoot, state.builderType))); break;
      case 'prog-play': playProgression(); break;
      case 'prog-stop': stopProgression(); break;
      case 'prog-clear': stopProgression(); state.progression = []; save(); renderTab(); break;
      case 'prog-remove': state.progression.splice(Number(d.index), 1); save(); renderTab(); break;
      case 'prog-preset': state.progression = d.prog.split(' '); save(); renderTab(); break;
      case 'interval': {
        const root = T.parseNote(state.keyRoot);
        const iv = T.INTERVALS[d.iv];
        const note = T.transpose(root, d.iv);
        focus = { kind: 'interval', iv, note: { name: T.noteName(note), pc: T.pc(note) } };
        renderFretboard();
        const a = 48 + T.pc(root);
        if (d.mode === 'harmonic') window.Sound.strum([a, a + iv.semis], { gap: 0 });
        else window.Sound.arpeggio([a, a + iv.semis], { gap: 0.5, duration: 1.1 });
        break;
      }
      case 'find-toggle': toggleFinder(Number(d.pc)); window.Sound.pluck(48 + Number(d.pc)); break;
      case 'find-clear': state.finder = []; focus = null; save(); renderTab(); renderFretboard(); break;
      case 'find-play': window.Sound.arpeggio(state.finder.map((p, i, arr) => 48 + p + (i && p < arr[0] ? 12 : 0))); break;
      case 'use-key':
        state.keyRoot = d.root; state.scale = d.scale; state.builderRoot = d.root; focus = null; state.tab = 'scales';
        save(); renderAll(); flash(`Key set to ${keyName()}`);
        break;
      default: break;
    }
  });

  document.addEventListener('submit', (e) => {
    if (!e.target.matches('.prog-input')) return;
    e.preventDefault();
    state.progression = $('#prog-text').value.split(/[\s,|–—-]+/).filter(Boolean);
    save();
    renderTab();
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    switch (t.id) {
      case 'key-root': state.keyRoot = t.value; state.builderRoot = t.value; focus = null; break;
      case 'key-scale': state.scale = t.value; focus = null; break;
      case 'label-mode': state.labelMode = t.value; break;
      case 'tuning': state.tuning = t.value; break;
      case 'frets': state.frets = Number(t.value); break;
      case 'builder-root': state.builderRoot = t.value; renderTab(); focusChord(state.builderRoot, state.builderType); save(); return;
      case 'tempo': state.tempo = Math.max(40, Math.min(220, Number(t.value) || 90)); save(); return;
      case 'beats': state.beatsPerChord = Math.max(1, Math.min(8, Number(t.value) || 4)); save(); return;
      case 'loop': state.loop = t.checked; save(); return;
      default: return;
    }
    save();
    if (t.id === 'key-root' || t.id === 'key-scale') renderTab();
    renderFretboard();
  });

  let flashTimer = null;
  function flash(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => el.classList.remove('show'), 1600);
  }

  $('#fb-show-scale').addEventListener('click', () => { focus = null; renderFretboard(); });

  // Deep links: index.html#progressions opens that tab.
  const fromHash = () => {
    const h = location.hash.slice(1);
    if (RENDERERS[h] && h !== state.tab) { state.tab = h; focus = null; renderTabs(); renderTab(); renderFretboard(); }
  };
  window.addEventListener('hashchange', fromHash);
  const h0 = location.hash.slice(1);
  if (RENDERERS[h0]) state.tab = h0;
  if (!RENDERERS[state.tab]) state.tab = 'scales';
  renderAll();
})();
