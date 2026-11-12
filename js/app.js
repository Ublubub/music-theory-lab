/*
 * app.js: the core of the interface.
 *
 *   - `state`: everything the user has chosen (saved in the browser so the app remembers it)
 *   - the fretboard / piano panel, which shows the current "focus" (a scale, chord, interval or notes)
 *   - a tiny tab system: each tab registers { id, label, order, render, actions, changes }
 *     Core tabs live here; bigger ones live in js/tabs/*.js. js/main.js starts the app.
 *   - a progression player shared by the Progressions, Songs and Ear Training tabs
 */
(function () {
  'use strict';
  const T = window.Theory;
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const DEFAULTS = {
    keyRoot: 'C', scale: 'major', tab: 'scales', labelMode: 'name', tuning: 'standard',
    fretFrom: 0, fretTo: 15, lefty: false, view: 'guitar', instrument: 'guitar', position: 0,
    sevenths: false, progression: ['I', 'V', 'vi', 'IV'], tempo: 90, beatsPerChord: 4, loop: true,
    builderRoot: 'C', builderType: 'maj7', finder: [],
    songs: [], songId: null, ear: { mode: 'interval', level: 'basic', stats: {} },
    pivotRoot: 'G', pivotScale: 'major',
  };
  const STORAGE_KEY = 'music-theory-lab:v1';
  const state = JSON.parse(JSON.stringify(DEFAULTS));
  try { Object.assign(state, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); } catch (e) { /* ignore */ }
  if (state.frets && !('fretTo' in JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'))) state.fretTo = state.frets; // v0.1 setting
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } };

  let focus = null; // null = show the scale; or { kind: 'chord'|'interval'|'notes', ... }

  // ---------------------------------------------------------------------------
  // Shared helpers (exposed on window.App for the tab files)
  // ---------------------------------------------------------------------------
  const keyName = () => `${T.noteName(T.parseNote(state.keyRoot))} ${T.SCALES[state.scale].name}`;
  const fnBadge = (fn) => `<span class="fn fn-${fn}" title="${esc(T.FUNCTIONS[fn].name)}">${fn}</span>`;
  const rootOptions = (selected) => T.KEY_ROOTS.map((r) => `<option value="${r}"${r === selected ? ' selected' : ''}>${T.noteName(T.parseNote(r))}</option>`).join('');
  const tuningMidi = () => window.Fretboard.TUNINGS[state.tuning].midi;

  /** MIDI notes for a chord in a comfortable register (root between A2 and G♯3), bass note below. */
  function chordMidis(chord) {
    const notes = chord.notes;
    const base = 45 + T.mod(notes[0].pc - 9, 12);
    const out = notes.map((n) => base + n.interval.semis);
    if (chord.bass) out.unshift(base - 12 + T.mod(T.pc(chord.bass) - notes[0].pc, 12));
    return out;
  }

  /** Analyse a chord (by root + type, or a parsed numeral) in the current key. */
  const analyze = (root, type, opts) => T.analyzeChord(state.keyRoot, state.scale, root, type, opts);

  function playChord(chord) { window.Sound.strum(chordMidis(chord)); }

  /** Show a chord on the neck. `chord` = result of analyze(). */
  function focusChord(chord, { play = false, title } = {}) {
    focus = { kind: 'chord', chord, voicing: -1, title: title || `${chord.name}: ${chord.typeName} (${chord.numeral} in ${keyName()})` };
    renderFretboard();
    if (play) playChord(chord);
  }
  const setFocus = (f) => { focus = f; renderFretboard(); };
  const getFocus = () => focus;

  function chordCard(c, { add = true, active = false, index = null } = {}) {
    return `
      <div class="chord-card fnb-${c.fn}${active ? ' active' : ''}${c.diatonic ? '' : ' outside'}" ${index !== null ? `data-index="${index}"` : ''}>
        <button class="chord-main" data-action="focus-chord" data-numeral="${esc(c.numeral)}">
          <span class="numeral">${esc(c.numeral)}</span>
          <span class="chord-name">${esc(c.name)}</span>
          <span class="chord-notes">${(c.bass ? [T.noteName(c.bass) + ' ·'] : []).concat(c.notes.map((n) => n.name)).join(' ')}</span>
        </button>
        <div class="chord-foot">
          ${fnBadge(c.fn)}
          ${c.diatonic ? '' : '<span class="tag" title="Uses notes outside the key">outside key</span>'}
          ${add ? `<button class="icon-btn" data-action="add-chord" data-numeral="${esc(c.numeral)}" title="Add to progression">＋</button>` : ''}
        </div>
      </div>`;
  }

  const sevenToggle = () => `<div class="seg" role="group" aria-label="Chord size">
      <button class="${state.sevenths ? '' : 'on'}" data-action="set-sevenths" data-value="0">Triads</button>
      <button class="${state.sevenths ? 'on' : ''}" data-action="set-sevenths" data-value="1">7th chords</button>
    </div>`;

  let flashTimer = null;
  function flash(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  async function copyText(text, okMsg = 'Link copied') {
    try { await navigator.clipboard.writeText(text); flash(okMsg); } catch (e) { window.prompt('Copy this link:', text); }
  }

  function download(filename, text, type = 'text/plain') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // base64url for share links (handles ♭/♯ and other non-ASCII text)
  const b64 = {
    enc: (obj) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    dec: (s) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0)))),
  };

  /** A link that reopens the app in the same key, with the same progression, on the same tab. */
  function shareUrl(extra = {}) {
    const u = new URL(location.href);
    u.search = '';
    u.hash = state.tab;
    u.searchParams.set('key', state.keyRoot);
    u.searchParams.set('scale', state.scale);
    if (state.progression.length) u.searchParams.set('prog', state.progression.join(' '));
    Object.entries(extra).forEach(([k, v]) => u.searchParams.set(k, v));
    return u.toString();
  }

  // ---------------------------------------------------------------------------
  // Player: plays a list of chords in time (progressions, songs)
  // ---------------------------------------------------------------------------
  const Player = {
    timer: null,
    get playing() { return this.timer !== null; },
    /** steps: [{ chord, beats }]; onStep(i, step) runs as each chord starts. */
    play(steps, { tempo = state.tempo, loop = false, onStep, onEnd } = {}) {
      this.stop(true);
      if (!steps.length) return;
      const run = (i) => {
        if (i >= steps.length) {
          if (!loop) { this.stop(); if (onEnd) onEnd(); return; }
          i = 0;
        }
        const step = steps[i];
        const ms = (60000 / tempo) * (step.beats || state.beatsPerChord);
        window.Sound.strum(chordMidis(step.chord), { duration: Math.min(3, ms / 1000 + 0.3) });
        focus = { kind: 'chord', chord: step.chord, voicing: -1, title: `${step.chord.name} (${step.chord.numeral})` };
        renderFretboard();
        if (onStep) onStep(i, step);
        this.timer = setTimeout(() => run(i + 1), ms);
      };
      this.timer = -1;
      run(0);
    },
    stop(silent) {
      clearTimeout(this.timer);
      this.timer = null;
      if (!silent) document.querySelectorAll('.chord-card.active, .is-playing').forEach((el) => el.classList.remove('active', 'is-playing'));
    },
  };

  // ---------------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------------
  const tabs = [];
  function registerTab(tab) { tabs.push(tab); tabs.sort((a, b) => a.order - b.order); }
  const currentTab = () => tabs.find((t) => t.id === state.tab) || tabs[0];

  function renderTabs() {
    $('#tabs').innerHTML = tabs.map((t) =>
      `<button role="tab" aria-selected="${t.id === state.tab}" class="${t.id === state.tab ? 'on' : ''}" data-action="tab" data-tab="${t.id}">${t.label}</button>`).join('');
  }
  function renderTab() { $('#content').innerHTML = currentTab().render(); if (currentTab().afterRender) currentTab().afterRender(); }

  function switchTab(id) {
    const prev = currentTab();
    if (prev.onLeave) prev.onLeave();
    state.tab = id;
    save();
    history.replaceState(null, '', `${location.pathname}${location.search}#${id}`);
    const tab = currentTab();
    if (!tab.keepFocus) focus = null;
    renderTabs(); renderTab(); renderFretboard();
    if (tab.onEnter) tab.onEnter();
  }

  // ---------------------------------------------------------------------------
  // Fretboard / piano panel
  // ---------------------------------------------------------------------------
  const REL = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];

  function panelModel() {
    const marks = new Map();
    const scale = T.buildScale(state.keyRoot, state.scale);
    const tab = currentTab();
    if (tab.defaultFocus && (!focus || focus.kind === 'notes')) focus = tab.defaultFocus();

    if (focus && focus.kind === 'notes') {
      focus.pcs.forEach((p, i) => marks.set(p, { name: T.pcName(p), label: i === 0 ? '1st' : T.pcName(p), role: i === 0 ? 'root' : 'picked' }));
      return { marks, caption: focus.title };
    }
    if (focus && focus.kind === 'chord') {
      const c = focus.chord;
      const rootPc = c.notes[0].pc;
      scale.forEach((n) => marks.set(n.pc, { name: n.name, label: REL[T.mod(n.pc - rootPc, 12)], role: 'ghost' }));
      c.notes.forEach((n) => marks.set(n.pc, { name: n.name, label: n.interval.short, role: n.role }));
      return { marks, caption: focus.title, legend: true, chord: c };
    }
    if (focus && focus.kind === 'interval') {
      marks.set(focus.from.pc, { name: focus.from.name, label: '1', role: 'root' });
      if (focus.to.pc !== focus.from.pc) marks.set(focus.to.pc, { name: focus.to.name, label: focus.iv.short, role: 'third' });
      return { marks, caption: focus.title };
    }
    scale.forEach((n, i) => marks.set(n.pc, { name: n.name, label: n.interval.short, role: i === 0 ? 'root' : 'tone' }));
    return { marks, caption: `${keyName()} scale: ${scale.map((n) => n.name).join(' ')}`, scale };
  }

  /** Positions (string:fret) for the selected scale box, repeated an octave up where it fits. */
  function positionCells(scale) {
    if (!state.position || !scale) return null;
    const pcs = scale.map((n) => n.pc);
    const nps = pcs.length <= 5 ? 2 : 3;
    const cells = window.Guitar.scalePosition(tuningMidi(), pcs, state.position - 1, nps);
    const only = new Set();
    [0, 12, -12].forEach((shift) => {
      const moved = cells.map((c) => ({ ...c, fret: c.fret + shift }));
      if (moved.every((c) => c.fret >= state.fretFrom && c.fret <= state.fretTo)) moved.forEach((c) => only.add(`${c.string}:${c.fret}`));
    });
    return { only, minFret: Math.min(...cells.map((c) => c.fret)) };
  }

  let voicingCache = { key: '', list: [] };
  function chordVoicings(c) {
    const key = `${c.name}|${state.tuning}|${state.fretTo}`;
    if (voicingCache.key !== key) {
      const tones = c.notes.map((n) => ({ pc: n.pc, role: n.role, deg: n.interval.deg }));
      voicingCache = { key, list: window.Guitar.voicings(tuningMidi(), tones, { bassPc: c.bass ? T.pc(c.bass) : null, maxFret: Math.max(12, state.fretTo) }) };
    }
    return voicingCache.list;
  }

  function onPanelNote(midi, p) {
    window.Sound.pluck(midi);
    const tab = currentTab();
    if (tab.onNote) tab.onNote(midi, p);
  }

  function renderFretboard() {
    const { marks, caption, legend, chord, scale } = panelModel();
    $('#fb-caption').textContent = caption;
    $('#fb-legend').hidden = !legend;
    $('#fb-show-scale').hidden = !focus || !!currentTab().defaultFocus;

    // Scale positions (only when showing a scale)
    const posSel = $('#position');
    const posWrap = $('#position-wrap');
    posWrap.hidden = !scale;
    let only = null;
    if (scale) {
      const n = scale.length;
      posSel.innerHTML = `<option value="0">Whole neck</option>` + Array.from({ length: n }, (_, i) =>
        `<option value="${i + 1}"${state.position === i + 1 ? ' selected' : ''}>Position ${i + 1} (from ${scale[i].name})${n === 5 ? ' box' : n === 7 ? ' · 3 per string' : ''}</option>`).join('');
      if (state.position > n) state.position = 0;
      posSel.value = String(state.position);
      const pos = positionCells(scale);
      if (pos) only = pos.only;
    }

    // Chord shapes (only when showing a chord)
    const shapes = $('#shapes');
    if (chord && state.view !== 'piano') {
      const list = chordVoicings(chord);
      if (focus.voicing >= list.length) focus.voicing = -1;
      if (focus.voicing >= 0) {
        only = new Set(list[focus.voicing].notes.map((n) => `${n.string}:${n.fret}`));
      }
      shapes.hidden = false;
      shapes.innerHTML = `<span class="shapes-label">Chord shapes</span>
        <button class="shape${focus.voicing < 0 ? ' on' : ''}" data-action="voicing" data-index="-1"><span class="all-notes">All<br>notes</span></button>
        ${list.map((v, i) => `<button class="shape${focus.voicing === i ? ' on' : ''}" data-action="voicing" data-index="${i}" title="Frets ${v.frets.map((f) => (f == null ? 'x' : f)).join('-')}">
          ${window.Fretboard.diagram(v, marks, { labelMode: state.labelMode, lefty: state.lefty })}</button>`).join('')}
        ${list.length ? '' : '<span class="muted">No easy shape found within 4 frets. Try fewer notes.</span>'}`;
    } else {
      shapes.hidden = true;
    }

    $('#fretboard').hidden = state.view === 'piano';
    $('#piano').hidden = state.view === 'guitar';
    if (state.view !== 'piano') {
      window.Fretboard.render($('#fretboard'), {
        tuning: tuningMidi(), from: state.fretFrom, to: state.fretTo, lefty: state.lefty,
        marks, only, labelMode: state.labelMode, onNote: onPanelNote,
      });
    }
    if (state.view !== 'guitar') {
      window.Piano.render($('#piano'), { marks, labelMode: state.labelMode, onNote: onPanelNote });
    }
  }

  function renderControls() {
    $('#key-root').innerHTML = rootOptions(state.keyRoot);
    $('#key-scale').innerHTML = Object.entries(T.SCALES).map(([k, s]) => `<option value="${k}"${k === state.scale ? ' selected' : ''}>${esc(s.name)}</option>`).join('');
    $('#instrument').innerHTML = Object.entries(window.Sound.INSTRUMENTS).map(([k, n]) => `<option value="${k}"${k === state.instrument ? ' selected' : ''}>${n}</option>`).join('');
    $('#label-mode').value = state.labelMode;
    $('#view').value = state.view;
    $('#lefty').checked = state.lefty;
    $('#tuning').innerHTML = Object.entries(window.Fretboard.TUNINGS).map(([k, t]) => `<option value="${k}"${k === state.tuning ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
    const fretOpts = (sel, max) => Array.from({ length: max + 1 }, (_, i) => `<option${i === sel ? ' selected' : ''}>${i}</option>`).join('');
    $('#fret-from').innerHTML = fretOpts(state.fretFrom, 18);
    $('#fret-to').innerHTML = fretOpts(state.fretTo, 22).replace(/<option(?: selected)?>[0-3]<\/option>/g, '');
    window.Sound.setInstrument(state.instrument);
  }

  function renderAll() { renderControls(); renderTabs(); renderTab(); renderFretboard(); }

  // ---------------------------------------------------------------------------
  // Core tabs: Scales, Chords in Key, Chord Builder, Intervals
  // ---------------------------------------------------------------------------
  registerTab({
    id: 'scales', label: 'Scales & Degrees', order: 10,
    render() {
      const scale = T.buildScale(state.keyRoot, state.scale);
      const steps = T.stepPattern(state.keyRoot, state.scale);
      const info = T.SCALES[state.scale];
      const seven = scale.length === 7;
      const chords = seven ? T.diatonicChords(state.keyRoot, state.scale) : [];
      const sig = T.keySignature(state.keyRoot, state.scale);
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
          ${seven ? `<p class="muted">Key signature: ${sig.count ? `${sig.count}${sig.type} (${sig.notes.join(' ')})` : 'no sharps or flats'}</p>` : ''}
          <div class="table-wrap"><table>
            <thead><tr><th>Numeral</th><th>Degree</th><th>Note</th><th>Name</th><th>Interval from tonic</th><th>Step to next</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>
        </section>
        <details class="learn" open>
          <summary>How scale degrees work</summary>
          <p>Each note of a scale gets a number (1–7) by its position above the tonic. The numbers are compared to the <b>major scale</b>: in A minor, C is the <b>♭3</b> because it is one half step lower than the 3rd of A major (C♯).</p>
          <p><b>Roman numerals</b> name the chord built on each degree: UPPER CASE = major, lower case = minor, ° = diminished, + = augmented. Because they don't name specific notes, <code>I–V–vi–IV</code> describes the same song in every key.</p>
          <p><b>Positions:</b> use the <i>Position</i> menu above the neck to see the scale one hand-position at a time: the 5 classic boxes for pentatonic scales, or 3 notes per string for 7-note scales.</p>
        </details>`;
    },
  });

  registerTab({
    id: 'chords', label: 'Chords in Key', order: 20, keepFocus: true,
    render() {
      const chords = T.diatonicChords(state.keyRoot, state.scale, state.sevenths);
      if (!chords.length) {
        return `<section class="panel"><h2>Chords in ${esc(keyName())}</h2>
          <p>Chords are built by stacking every other note of a <b>7-note</b> scale, so pentatonic and blues scales don't have their own chord set. Pick Major, Minor or a mode to see the chords. (Pentatonic scales are usually played over the chords of their parent major or minor key.)</p></section>`;
      }
      const isMode = !['major', 'minor', 'harmonicMinor'].includes(state.scale);
      return `
        <section class="panel">
          <div class="panel-head"><h2>Chords in ${esc(keyName())}</h2>${sevenToggle()}</div>
          <p class="muted">Click a chord to hear it and see it on the neck, with playable shapes. Use ＋ to add it to your progression.</p>
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
    },
  });

  registerTab({
    id: 'builder', label: 'Chord Builder', order: 30,
    defaultFocus() {
      const c = analyze(state.builderRoot, state.builderType);
      return { kind: 'chord', chord: c, voicing: -1, title: `${c.name}: ${c.typeName} (${c.numeral} in ${keyName()})` };
    },
    render() {
      const root = state.builderRoot;
      const type = T.CHORD_TYPES[state.builderType];
      const a = analyze(root, type.key);
      const groups = T.CHORD_CATEGORIES.map((cat) => `
        <div class="type-group"><h4>${cat}</h4><div class="type-list">
          ${T.CHORD_LIST.filter((t) => t.category === cat).map((t) =>
            `<button class="chip${t.key === type.key ? ' on' : ''}" data-action="builder-type" data-type="${t.key}" title="${esc(t.name)}">${esc(T.noteName(T.parseNote(root)) + t.symbol)}</button>`).join('')}
        </div></div>`).join('');
      return `
        <section class="panel">
          <div class="panel-head">
            <h2>Chord Builder</h2>
            <label class="inline">Root <select id="builder-root">${rootOptions(root)}</select></label>
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
            ${a.notes.map((n) => `<div class="tone role-${n.role}"><span class="tone-deg">${n.interval.short}</span><span class="tone-note">${n.name}</span><span class="tone-iv">${n.interval.name}</span></div>`).join('')}
          </div>
          <p><b>Formula:</b> ${a.notes.map((n) => n.interval.short).join(' – ')}</p>
          <p><b>In ${esc(keyName())}:</b> ${esc(a.numeral)} ${fnBadge(a.fn)}
            ${a.diatonic ? ' all notes belong to the key.' : ` uses notes outside the key: <b>${a.outside.map((n) => n.name).join(', ')}</b> (a borrowed or chromatic chord).`}</p>
          <p class="muted">Pick a chord shape under the fretboard to see one playable fingering.</p>
        </section>
        <details class="learn">
          <summary>Reading chord formulas</summary>
          <p>Every chord is a root plus intervals stacked above it. <b>3</b> vs <b>♭3</b> decides major vs minor. <b>5</b> is the stable "glue", ♭5 and ♯5 make diminished and augmented. Add <b>♭7</b> for dominant tension, <b>7</b> for a smooth major 7th.</p>
          <p>Extensions (9, 11, 13) are the 2nd, 4th and 6th an octave higher. On guitar you often leave out the 5th (and sometimes the root) of big chords: the 3rd and 7th carry the sound. The chord shapes do this automatically.</p>
        </details>`;
    },
    actions: {
      'builder-type': (d) => { state.builderType = d.type; save(); focus = null; renderTab(); renderFretboard(); playChord(analyze(state.builderRoot, state.builderType)); },
      'play-builder': () => playChord(analyze(state.builderRoot, state.builderType)),
      'arp-builder': () => window.Sound.arpeggio(chordMidis(analyze(state.builderRoot, state.builderType))),
    },
    changes: {
      'builder-root': (el) => { state.builderRoot = el.value; save(); focus = null; renderTab(); renderFretboard(); },
    },
  });

  const SIMPLE_IVS = ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];
  registerTab({
    id: 'intervals', label: 'Intervals', order: 80, keepFocus: false,
    render() {
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
          <p class="muted">An interval is the distance between two notes. Every scale and chord is built from them. Click to hear one and see it on the neck. Train your ear on them in the <b>Ear Training</b> tab.</p>
          <div class="table-wrap"><table>
            <thead><tr><th>Degree</th><th>Interval</th><th>Semitones (frets)</th><th>Example</th><th>Character</th><th>Play</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>
        </section>
        <details class="learn">
          <summary>Intervals on the guitar</summary>
          <p>One fret = one semitone. On the same string, a <b>major 3rd</b> is 4 frets up and a <b>perfect 5th</b> is 7. Across strings (standard tuning), the next string up is a <b>4th</b> higher, except G → B, which is a <b>major 3rd</b>. That's why shapes shift by one fret when they cross onto the B string.</p>
        </details>`;
    },
    actions: {
      interval: (d) => {
        const root = T.parseNote(state.keyRoot);
        const iv = T.INTERVALS[d.iv];
        const note = T.transpose(root, d.iv);
        setFocus({ kind: 'interval', iv, from: { name: T.noteName(root), pc: T.pc(root) }, to: { name: T.noteName(note), pc: T.pc(note) }, title: `${iv.name}: ${T.noteName(root)} → ${T.noteName(note)}` });
        const a = 48 + T.pc(root);
        if (d.mode === 'harmonic') window.Sound.strum([a, a + iv.semis], { gap: 0 });
        else window.Sound.arpeggio([a, a + iv.semis], { gap: 0.5, duration: 1.1 });
      },
    },
  });

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------
  const CORE_ACTIONS = {
    tab: (d) => switchTab(d.tab),
    'play-scale': () => {
      const s = T.buildScale(state.keyRoot, state.scale);
      const base = 48 + s[0].pc;
      window.Sound.arpeggio([...s.map((n) => base + T.mod(n.pc - s[0].pc, 12)), base + 12]);
    },
    'play-note': (d) => window.Sound.pluck(48 + Number(d.pc)),
    'focus-chord': (d) => {
      const p = T.parseNumeral(d.numeral, state.keyRoot);
      focusChord(analyze(p.root, p.type, p), { play: true });
    },
    'show-scale': () => { focus = null; renderFretboard(); },
    voicing: (d) => {
      if (!focus || focus.kind !== 'chord') return;
      focus.voicing = Number(d.index);
      renderFretboard();
      if (focus.voicing >= 0) window.Sound.strum(chordVoicings(focus.chord)[focus.voicing].notes.map((n) => n.midi));
      else playChord(focus.chord);
    },
    'add-chord': (d) => {
      state.progression.push(d.numeral);
      save();
      flash(`Added ${d.numeral} to your progression`);
      if (state.tab === 'progressions') renderTab();
    },
    'set-sevenths': (d) => { state.sevenths = d.value === '1'; save(); renderTab(); },
    share: () => copyText(shareUrl(), 'Share link copied: it opens this key, progression and tab'),
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.tagName === 'FORM') return;
    const d = el.dataset;
    const handler = CORE_ACTIONS[d.action] || tabs.map((t) => t.actions && t.actions[d.action]).find(Boolean);
    if (handler) handler(d, el, e);
  });

  document.addEventListener('submit', (e) => {
    const handler = tabs.map((t) => t.submits && t.submits[e.target.dataset.form]).find(Boolean);
    if (handler) { e.preventDefault(); handler(e.target); }
  });

  const CORE_CHANGES = {
    'key-root': (el) => { state.keyRoot = el.value; state.builderRoot = el.value; focus = null; return 'tab'; },
    'key-scale': (el) => { state.scale = el.value; focus = null; state.position = 0; return 'tab'; },
    instrument: (el) => { state.instrument = el.value; window.Sound.setInstrument(el.value); window.Sound.pluck(52); },
    'label-mode': (el) => { state.labelMode = el.value; },
    view: (el) => { state.view = el.value; },
    tuning: (el) => { state.tuning = el.value; },
    'fret-from': (el) => { state.fretFrom = Math.min(Number(el.value), state.fretTo - 3); },
    'fret-to': (el) => { state.fretTo = Math.max(Number(el.value), state.fretFrom + 3); },
    lefty: (el) => { state.lefty = el.checked; },
    position: (el) => { state.position = Number(el.value); },
  };

  document.addEventListener('change', (e) => {
    const el = e.target;
    const core = CORE_CHANGES[el.id];
    if (core) {
      const what = core(el);
      save();
      if (what === 'tab') { const t = currentTab(); if (t.onKeyChange) t.onKeyChange(); renderTab(); }
      renderControls();
      renderFretboard();
      return;
    }
    const handler = tabs.map((t) => t.changes && t.changes[el.id || el.dataset.change]).find(Boolean);
    if (handler) handler(el, e);
  });

  // ---------------------------------------------------------------------------
  // Start-up: share links (?key=…&scale=…&prog=…), deep links (#tab)
  // ---------------------------------------------------------------------------
  function applyUrl() {
    const q = new URLSearchParams(location.search);
    let changed = false;
    if (q.get('key') && T.KEY_ROOTS.includes(q.get('key'))) { state.keyRoot = q.get('key'); state.builderRoot = state.keyRoot; changed = true; }
    if (q.get('scale') && T.SCALES[q.get('scale')]) { state.scale = q.get('scale'); changed = true; }
    if (q.get('prog')) { state.progression = q.get('prog').split(/\s+/).filter(Boolean); changed = true; }
    tabs.forEach((t) => { if (t.fromUrl && t.fromUrl(q)) changed = true; });
    const h = location.hash.slice(1);
    if (tabs.some((t) => t.id === h)) state.tab = h;
    if (!tabs.some((t) => t.id === state.tab)) state.tab = 'scales';
    if (changed) {
      save();
      history.replaceState(null, '', `${location.pathname}#${state.tab}`); // don't re-apply on reload
      setTimeout(() => flash('Opened from a shared link'), 300);
    }
  }

  function start() {
    applyUrl();
    $('#fb-show-scale').addEventListener('click', () => { focus = null; renderFretboard(); });
    window.addEventListener('hashchange', () => {
      const h = location.hash.slice(1);
      if (h !== state.tab && tabs.some((t) => t.id === h)) switchTab(h);
    });
    renderAll();
    if (currentTab().onEnter) currentTab().onEnter();
  }

  window.App = {
    T, state, save, esc, $, keyName, fnBadge, rootOptions, chordCard, sevenToggle, chordMidis, analyze,
    playChord, focusChord, setFocus, getFocus, flash, copyText, download, b64, shareUrl, Player,
    registerTab, switchTab, renderAll, renderTab, renderFretboard, renderControls, tuningMidi, start,
  };
})();
