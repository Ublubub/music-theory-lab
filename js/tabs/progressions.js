/*
 * Progressions tab (build one chord loop) and Songs tab (arrange loops into a song sheet).
 */
(function () {
  'use strict';
  const A = window.App;
  const { T, state, save, esc } = A;

  let playIndex = -1;
  const parse = (text) => T.parseProgression(text, state.keyRoot, state.scale);

  // ---------------------------------------------------------------------------
  // Progressions
  // ---------------------------------------------------------------------------
  A.registerTab({
    id: 'progressions', label: 'Progressions', order: 40, keepFocus: true,
    render() {
      const parsed = parse(state.progression.join(' '));
      const chords = parsed.chords;
      const cadence = T.detectCadence(chords);
      const suggestions = T.suggestNext(state.keyRoot, state.scale, chords, state.sevenths).slice(0, 5);
      const fam = T.SCALES[state.scale].family;
      const presets = T.PRESETS.slice().sort((a, b) => (b.family === fam) - (a.family === fam));
      const playing = A.Player.playing && playIndex >= 0;
      return `
        <section class="panel">
          <div class="panel-head">
            <h2>Your progression in ${esc(A.keyName())}</h2>
            <div class="btn-row">
              <button class="btn primary" data-action="${playing ? 'prog-stop' : 'prog-play'}">${playing ? '■ Stop' : '▶ Play'}</button>
              <label class="inline">BPM <input id="tempo" type="number" min="40" max="220" value="${state.tempo}"></label>
              <label class="inline">Beats/chord <input id="beats" type="number" min="1" max="8" value="${state.beatsPerChord}"></label>
              <label class="inline"><input id="loop" type="checkbox"${state.loop ? ' checked' : ''}> Loop</label>
              <button class="btn" data-action="share">🔗 Share</button>
              <button class="btn" data-action="prog-to-song">→ Song</button>
              <button class="btn" data-action="prog-clear">Clear</button>
            </div>
          </div>
          <form class="prog-input" data-form="prog">
            <input id="prog-text" type="text" spellcheck="false" autocomplete="off" value="${esc(state.progression.join(' '))}" aria-label="Progression as Roman numerals" placeholder="Type numerals, e.g. I V vi IV  ·  ii7 V7 Imaj7  ·  I V7/vi vi IV/3">
            <button class="btn" type="submit">Apply</button>
          </form>
          ${parsed.errors.map((e) => `<p class="error">${esc(e)}</p>`).join('')}
          <div class="prog-strip">
            ${chords.length ? chords.map((c, i) => `
              <div class="prog-item">
                ${A.chordCard(c, { add: false, active: i === playIndex, index: i })}
                <button class="icon-btn remove" data-action="prog-remove" data-index="${i}" title="Remove">×</button>
              </div>`).join('') : '<p class="muted">Empty. Add chords from the suggestions below, the Chords in Key or Advanced Harmony tabs, or type numerals above.</p>'}
          </div>
          ${chords.length ? `<p class="flow">Function flow: ${chords.map((c) => A.fnBadge(c.fn)).join('<span class="arrow">→</span>')}</p>` : ''}
          ${cadence ? `<p><b>${esc(cadence.name)}</b>: ${esc(cadence.desc)}</p>` : ''}
        </section>

        <section class="panel">
          <div class="panel-head"><h3>What could come next?</h3>${A.sevenToggle()}</div>
          <p class="muted">Ranked by root movement and harmonic function. Suggestions, not rules: trust your ear.</p>
          <div class="suggestions">
            ${suggestions.map((s) => {
              const dots = Math.max(0, Math.min(5, s.score));
              return `
              <div class="suggestion">
                <button class="btn suggestion-add" data-action="add-chord" data-numeral="${esc(s.chord.numeral)}">＋ ${esc(s.chord.numeral)} <span class="muted">${esc(s.chord.name)}</span></button>
                <button class="icon-btn" data-action="focus-chord" data-numeral="${esc(s.chord.numeral)}" title="Preview">▶</button>
                ${A.fnBadge(s.chord.fn)}
                <span class="score" title="Score">${'●'.repeat(dots)}${'○'.repeat(5 - dots)}</span>
                <span class="reasons">${s.reasons.map(esc).join(' · ')}</span>
              </div>`;
            }).join('') || '<p class="muted">Suggestions need a 7-note scale.</p>'}
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
            <li>For colour, use the <b>Advanced Harmony</b> tab: secondary dominants, borrowed chords, tritone subs.</li>
            <li>Happy with it? Click <b>→ Song</b> to make it a section of a song sheet.</li>
          </ol>
          <p>Typing tips: <code>b</code> = flat, <code>#</code> = sharp, <code>°</code> or <code>o</code> = diminished, <code>ø7</code> = half-diminished, <code>maj7</code>, <code>7</code>, <code>sus4</code>, <code>add9</code>.
            Secondary chords: <code>V7/vi</code>. Inversions: <code>I/3</code> (3rd in the bass), <code>V7/7</code>. Any bass note: <code>IV/C</code>.</p>
        </details>`;
    },
    actions: {
      'prog-play': () => {
        const chords = parse(state.progression.join(' ')).chords;
        playIndex = 0;
        A.renderTab();
        A.Player.play(chords.map((chord) => ({ chord, beats: state.beatsPerChord })), {
          loop: state.loop,
          onStep: (i) => {
            playIndex = i;
            document.querySelectorAll('.prog-strip .chord-card').forEach((el) => el.classList.toggle('active', Number(el.dataset.index) === i));
          },
          onEnd: () => { playIndex = -1; if (state.tab === 'progressions') A.renderTab(); },
        });
      },
      'prog-stop': () => { A.Player.stop(); playIndex = -1; A.renderTab(); },
      'prog-clear': () => { A.Player.stop(); playIndex = -1; state.progression = []; save(); A.renderTab(); },
      'prog-remove': (d) => { state.progression.splice(Number(d.index), 1); save(); A.renderTab(); },
      'prog-preset': (d) => { state.progression = d.prog.split(' '); save(); A.renderTab(); },
      'prog-to-song': () => {
        const song = currentSong() || newSong();
        song.sections.push({ name: nextSectionName(song), prog: state.progression.join(' '), repeat: 1, notes: '' });
        save();
        A.switchTab('songs');
        A.flash('Added as a new section of your song');
      },
    },
    submits: {
      prog: (form) => {
        state.progression = form.querySelector('#prog-text').value.replace('6/9', '69').split(/[\s,|–—]+/).filter(Boolean).map((t) => t.replace('69', '6/9'));
        save();
        A.renderTab();
      },
    },
    changes: {
      tempo: (el) => { state.tempo = Math.max(40, Math.min(220, Number(el.value) || 90)); save(); },
      beats: (el) => { state.beatsPerChord = Math.max(1, Math.min(8, Number(el.value) || 4)); save(); },
      loop: (el) => { state.loop = el.checked; save(); },
    },
    onLeave: () => { if (playIndex >= 0) { A.Player.stop(); playIndex = -1; } },
  });

  // ---------------------------------------------------------------------------
  // Songs
  // ---------------------------------------------------------------------------
  const SECTION_NAMES = ['Intro', 'Verse', 'Pre-chorus', 'Chorus', 'Bridge', 'Solo', 'Outro'];
  const uid = () => Math.random().toString(36).slice(2, 9);
  const currentSong = () => state.songs.find((s) => s.id === state.songId) || null;

  function newSong(title = 'Untitled song') {
    const song = { id: uid(), title, key: state.keyRoot, scale: state.scale, tempo: state.tempo, beatsPerChord: 4, sections: [] };
    state.songs.push(song);
    state.songId = song.id;
    save();
    return song;
  }

  function nextSectionName(song) {
    const used = song.sections.map((s) => s.name);
    return ['Verse', 'Chorus', 'Bridge', 'Outro'].find((n) => !used.includes(n)) || 'Verse';
  }

  /** Make the app's key match the song (when opening it). */
  function openSong(song) {
    state.songId = song.id;
    state.keyRoot = song.key;
    state.scale = song.scale;
    state.builderRoot = song.key;
    save();
    A.renderAll();
  }

  const sectionChords = (sec) => parse(sec.prog);
  const formLine = (song) => song.sections.map((s) => s.name + (s.repeat > 1 ? ` ×${s.repeat}` : '')).join(' → ');

  function songText(song) {
    const lines = [`${song.title}`, `Key: ${A.keyName()} · ${song.tempo} BPM · ${song.beatsPerChord} beats per chord`, `Form: ${formLine(song)}`, ''];
    song.sections.forEach((sec) => {
      const chords = sectionChords(sec).chords;
      lines.push(`[${sec.name}]${sec.repeat > 1 ? ` ×${sec.repeat}` : ''}`);
      const cells = chords.map((c) => ({ name: c.name, num: c.numeral, w: Math.max(c.name.length, c.numeral.length) + 2 }));
      lines.push(`| ${cells.map((c) => c.name.padEnd(c.w)).join('| ')}|`);
      lines.push(`  ${cells.map((c) => c.num.padEnd(c.w)).join('  ')}`);
      if (sec.notes) lines.push(...sec.notes.split('\n').map((l) => `  ${l}`));
      lines.push('');
    });
    lines.push('Made with Music Theory Lab');
    return lines.join('\n');
  }

  let playing = null; // { section, chord }

  function songSteps(song, onlySection = null) {
    const steps = [];
    song.sections.forEach((sec, si) => {
      if (onlySection !== null && si !== onlySection) return;
      const chords = sectionChords(sec).chords;
      for (let r = 0; r < (onlySection !== null ? 1 : sec.repeat); r++) chords.forEach((chord, ci) => steps.push({ chord, beats: song.beatsPerChord, si, ci }));
    });
    return steps;
  }

  function playSong(song, onlySection = null) {
    const steps = songSteps(song, onlySection);
    if (!steps.length) { A.flash('Add some chords first'); return; }
    playing = { si: -1, ci: -1 };
    A.renderTab();
    A.Player.play(steps, {
      tempo: song.tempo,
      onStep: (i, step) => {
        playing = { si: step.si, ci: step.ci };
        document.querySelectorAll('.sheet-chord').forEach((el) => el.classList.toggle('is-playing', Number(el.dataset.si) === step.si && Number(el.dataset.ci) === step.ci));
        document.querySelectorAll('.song-section').forEach((el) => el.classList.toggle('is-playing', Number(el.dataset.si) === step.si));
      },
      onEnd: () => { playing = null; if (state.tab === 'songs') A.renderTab(); },
    });
  }

  A.registerTab({
    id: 'songs', label: 'Songs', order: 50, keepFocus: true,
    render() {
      const song = currentSong();
      const list = state.songs.map((s) => `<option value="${s.id}"${s.id === state.songId ? ' selected' : ''}>${esc(s.title)}</option>`).join('');
      const head = `
        <section class="panel no-print">
          <div class="panel-head">
            <h2>Song sheets</h2>
            <div class="btn-row">
              ${state.songs.length ? `<label class="inline">Song <select id="song-select">${list}</select></label>` : ''}
              <button class="btn" data-action="song-new">＋ New song</button>
              <label class="btn file-btn">Import .json<input id="song-import" type="file" accept=".json,application/json" hidden></label>
            </div>
          </div>
          <p class="muted">A song is a list of sections (verse, chorus…), each with its own progression in Roman numerals. Change the key in the top bar and the whole song transposes.</p>
        </section>`;
      if (!song) return `${head}<section class="panel"><p>No song yet. Click <b>＋ New song</b>, or build a loop in <b>Progressions</b> and press <b>→ Song</b>.</p></section>`;

      const sections = song.sections.map((sec, si) => {
        const { chords, errors } = sectionChords(sec);
        return `
          <div class="song-section" data-si="${si}">
            <div class="section-head no-print">
              <input class="section-name" data-change="section-name" data-index="${si}" value="${esc(sec.name)}" list="section-names" aria-label="Section name">
              <label class="inline">× <select data-change="section-repeat" data-index="${si}">${[1, 2, 3, 4, 6, 8].map((n) => `<option${n === sec.repeat ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
              <button class="icon-btn" data-action="section-play" data-index="${si}" title="Play this section">▶</button>
              <button class="icon-btn" data-action="section-move" data-index="${si}" data-dir="-1" title="Move up"${si === 0 ? ' disabled' : ''}>↑</button>
              <button class="icon-btn" data-action="section-move" data-index="${si}" data-dir="1" title="Move down"${si === song.sections.length - 1 ? ' disabled' : ''}>↓</button>
              <button class="icon-btn" data-action="section-copy" data-index="${si}" title="Duplicate">⧉</button>
              <button class="icon-btn" data-action="section-remove" data-index="${si}" title="Delete section">×</button>
            </div>
            <h3 class="print-only">${esc(sec.name)}${sec.repeat > 1 ? ` ×${sec.repeat}` : ''}</h3>
            <input class="section-prog no-print" data-change="section-prog" data-index="${si}" value="${esc(sec.prog)}" spellcheck="false" placeholder="Numerals, e.g. I V vi IV" aria-label="Section chords">
            ${errors.map((e) => `<p class="error no-print">${esc(e)}</p>`).join('')}
            <div class="sheet-row">${chords.map((c, ci) => `
              <button class="sheet-chord fnb-${c.fn}${playing && playing.si === si && playing.ci === ci ? ' is-playing' : ''}" data-si="${si}" data-ci="${ci}" data-action="focus-chord" data-numeral="${esc(c.numeral)}">
                <span class="sc-name">${esc(c.name)}</span><span class="sc-num">${esc(c.numeral)}</span></button>`).join('')}</div>
            <textarea class="section-notes" data-change="section-notes" data-index="${si}" rows="2" placeholder="Lyrics or notes (optional)">${esc(sec.notes || '')}</textarea>
          </div>`;
      }).join('');

      return `${head}
        <section class="panel song-sheet">
          <div class="panel-head no-print">
            <input id="song-title" class="song-title" value="${esc(song.title)}" aria-label="Song title">
            <div class="btn-row">
              <button class="btn primary" data-action="${A.Player.playing && playing ? 'song-stop' : 'song-play'}">${A.Player.playing && playing ? '■ Stop' : '▶ Play song'}</button>
              <label class="inline">BPM <input id="song-tempo" type="number" min="40" max="220" value="${song.tempo}"></label>
              <label class="inline">Beats/chord <input id="song-beats" type="number" min="1" max="8" value="${song.beatsPerChord}"></label>
            </div>
          </div>
          <h2 class="print-only">${esc(song.title)}</h2>
          <p class="song-meta">Key: <b>${esc(A.keyName())}</b> · ${song.tempo} BPM${song.sections.length ? ` · Form: ${esc(formLine(song))}` : ''}</p>
          ${sections || '<p class="muted">No sections yet.</p>'}
          <datalist id="section-names">${SECTION_NAMES.map((n) => `<option value="${n}">`).join('')}</datalist>
          <div class="btn-row no-print add-section">
            <span class="muted">Add section:</span>
            ${SECTION_NAMES.map((n) => `<button class="chip" data-action="section-add" data-name="${n}">${n}</button>`).join('')}
          </div>
        </section>
        <section class="panel no-print">
          <h3>Save &amp; share</h3>
          <div class="btn-row">
            <button class="btn" data-action="song-print">🖨 Print / PDF</button>
            <button class="btn" data-action="song-txt">Download chord chart (.txt)</button>
            <button class="btn" data-action="song-json">Download song file (.json)</button>
            <button class="btn" data-action="song-share">🔗 Copy share link</button>
            <button class="btn" data-action="song-duplicate">Duplicate</button>
            <button class="btn danger" data-action="song-delete">Delete song</button>
          </div>
          <p class="muted">Songs are saved in this browser automatically. Download the .json file to back one up or move it to another device.</p>
        </section>`;
    },
    onEnter() { const s = currentSong(); if (s && (s.key !== state.keyRoot || s.scale !== state.scale)) openSong(s); },
    onKeyChange() { const s = currentSong(); if (s) { s.key = state.keyRoot; s.scale = state.scale; save(); } },
    onLeave() { if (playing) { A.Player.stop(); playing = null; } },
    fromUrl(q) {
      if (!q.get('song')) return false;
      try {
        const s = A.b64.dec(q.get('song'));
        const song = { id: uid(), title: String(s.t || 'Shared song'), key: s.k, scale: s.s, tempo: Number(s.b) || 90, beatsPerChord: Number(s.p) || 4,
          sections: (s.x || []).map(([name, prog, repeat, notes]) => ({ name: String(name), prog: String(prog), repeat: Number(repeat) || 1, notes: String(notes || '') })) };
        if (!T.KEY_ROOTS.includes(song.key) || !T.SCALES[song.scale]) throw new Error('bad key');
        state.songs.push(song);
        state.songId = song.id;
        state.keyRoot = song.key; state.scale = song.scale;
        location.hash = 'songs';
        return true;
      } catch (e) { return false; }
    },
    actions: {
      'song-new': () => { newSong(); A.renderTab(); },
      'song-play': () => playSong(currentSong()),
      'song-stop': () => { A.Player.stop(); playing = null; A.renderTab(); },
      'section-play': (d) => playSong(currentSong(), Number(d.index)),
      'section-add': (d) => { currentSong().sections.push({ name: d.name, prog: state.progression.join(' ') || 'I V vi IV', repeat: 1, notes: '' }); save(); A.renderTab(); },
      'section-remove': (d) => { currentSong().sections.splice(Number(d.index), 1); save(); A.renderTab(); },
      'section-copy': (d) => { const s = currentSong(); const i = Number(d.index); s.sections.splice(i + 1, 0, { ...s.sections[i] }); save(); A.renderTab(); },
      'section-move': (d) => {
        const s = currentSong().sections; const i = Number(d.index); const j = i + Number(d.dir);
        if (j < 0 || j >= s.length) return;
        [s[i], s[j]] = [s[j], s[i]]; save(); A.renderTab();
      },
      'song-print': () => { document.body.classList.add('printing-song'); window.print(); document.body.classList.remove('printing-song'); },
      'song-txt': () => { const s = currentSong(); A.download(`${s.title.replace(/[^\w-]+/g, '_')}.txt`, songText(s)); },
      'song-json': () => { const s = currentSong(); A.download(`${s.title.replace(/[^\w-]+/g, '_')}.json`, JSON.stringify({ musicTheoryLab: 1, song: s }, null, 2), 'application/json'); },
      'song-share': () => {
        const s = currentSong();
        const compact = { t: s.title, k: s.key, s: s.scale, b: s.tempo, p: s.beatsPerChord, x: s.sections.map((x) => [x.name, x.prog, x.repeat, x.notes || '']) };
        const u = new URL(location.href); u.search = ''; u.hash = 'songs'; u.searchParams.set('song', A.b64.enc(compact));
        A.copyText(u.toString(), 'Song link copied: anyone with it can open the song');
      },
      'song-duplicate': () => { const s = currentSong(); const copy = JSON.parse(JSON.stringify(s)); copy.id = uid(); copy.title += ' (copy)'; state.songs.push(copy); state.songId = copy.id; save(); A.renderTab(); },
      'song-delete': () => {
        const s = currentSong();
        if (!window.confirm(`Delete "${s.title}"? This can't be undone (unless you downloaded the .json).`)) return;
        state.songs = state.songs.filter((x) => x.id !== s.id);
        state.songId = state.songs.length ? state.songs[0].id : null;
        save(); A.renderTab();
      },
    },
    changes: {
      'song-select': (el) => openSong(state.songs.find((s) => s.id === el.value)),
      'song-title': (el) => { currentSong().title = el.value || 'Untitled song'; save(); A.renderTab(); },
      'song-tempo': (el) => { currentSong().tempo = Math.max(40, Math.min(220, Number(el.value) || 90)); save(); A.renderTab(); },
      'song-beats': (el) => { currentSong().beatsPerChord = Math.max(1, Math.min(8, Number(el.value) || 4)); save(); },
      'section-name': (el) => { currentSong().sections[Number(el.dataset.index)].name = el.value || 'Section'; save(); A.renderTab(); },
      'section-repeat': (el) => { currentSong().sections[Number(el.dataset.index)].repeat = Number(el.value); save(); A.renderTab(); },
      'section-prog': (el) => { currentSong().sections[Number(el.dataset.index)].prog = el.value; save(); A.renderTab(); },
      'section-notes': (el) => { currentSong().sections[Number(el.dataset.index)].notes = el.value; save(); },
      'song-import': (el) => {
        const file = el.files[0];
        if (!file) return;
        file.text().then((txt) => {
          const data = JSON.parse(txt);
          const s = data.song || data;
          if (!Array.isArray(s.sections)) throw new Error('not a song file');
          s.id = uid();
          state.songs.push(s);
          openSong(s);
          A.flash(`Imported "${s.title}"`);
        }).catch(() => A.flash('That file isn\'t a Music Theory Lab song'));
      },
    },
  });
})();
