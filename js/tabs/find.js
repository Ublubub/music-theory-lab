/*
 * Find Key & Chord tab: enter notes (buttons, fretboard, or by playing into the microphone)
 * and see which keys and chords they fit.
 */
(function () {
  'use strict';
  const A = window.App;
  const { T, state, save, esc } = A;

  let autoAdd = true;
  let micError = '';
  let stable = { midi: null, frames: 0, added: false };

  function toggle(p) {
    const i = state.finder.indexOf(p);
    if (i >= 0) state.finder.splice(i, 1); else state.finder.push(p);
    save();
    A.renderTab();
    A.setFocus(null);
  }

  function onPitch(p) {
    const out = document.querySelector('#mic-readout');
    if (!out) return;
    if (!p) {
      out.innerHTML = '<span class="muted">Listening… play or sing a single note</span>';
      stable = { midi: null, frames: 0, added: false };
      return;
    }
    const name = T.pcName(p.midi % 12);
    const octave = Math.floor(p.midi / 12) - 1;
    const pct = Math.max(-50, Math.min(50, p.cents));
    out.innerHTML = `<span class="mic-note">${name}<sub>${octave}</sub></span>
      <span class="tuner"><span class="tuner-mid"></span><span class="tuner-needle${Math.abs(pct) < 8 ? ' in-tune' : ''}" style="left:${50 + pct}%"></span></span>
      <span class="muted">${p.cents > 0 ? '+' : ''}${p.cents} cents · ${p.freq.toFixed(1)} Hz</span>`;
    if (p.midi === stable.midi) stable.frames++; else stable = { midi: p.midi, frames: 0, added: false };
    // A note held for ~a quarter second gets added once.
    if (autoAdd && stable.frames > 8 && !stable.added) {
      stable.added = true;
      const pc = p.midi % 12;
      if (state.finder[state.finder.length - 1] !== pc && !state.finder.includes(pc)) {
        state.finder.push(pc);
        save();
        const keep = out.innerHTML;
        A.renderTab();
        A.renderFretboard();
        const again = document.querySelector('#mic-readout');
        if (again) again.innerHTML = keep;
      }
    }
  }

  async function startMic() {
    micError = '';
    try {
      await window.Mic.start(onPitch);
    } catch (e) {
      micError = e && e.name === 'NotAllowedError' ? 'Microphone permission was denied. Allow it in your browser\'s address bar and try again.' : (e.message || String(e));
    }
    A.renderTab();
  }

  A.registerTab({
    id: 'find', label: 'Find Key & Chord', order: 100,
    defaultFocus: () => ({
      kind: 'notes', pcs: state.finder,
      title: state.finder.length ? 'Your notes (the first one is shown as the likely tonic)' : 'Click frets, note buttons, or use the microphone to enter notes',
    }),
    onNote: (midi, p) => toggle(p),
    onLeave: () => { if (window.Mic.listening) window.Mic.stop(); },
    render() {
      const picked = state.finder;
      const keys = T.findKeys(picked, ['major', 'minor']).slice(0, 8);
      const chordMatches = T.identifyChords(picked).slice(0, 8);
      const intervals = picked.slice(1).map((p, i) => `${T.pcName(picked[i])} → ${T.pcName(p)}: <b>${T.intervalName(picked[i], p)}</b>`);
      const listening = window.Mic.listening;
      return `
        <section class="panel">
          <div class="panel-head">
            <h2>Find the key or chord from notes</h2>
            <div class="btn-row">
              <button class="btn${listening ? ' primary' : ''}" data-action="mic-toggle">${listening ? '■ Stop listening' : '🎤 Listen'}</button>
              <label class="inline"><input id="auto-add" type="checkbox"${autoAdd ? ' checked' : ''}> Add notes I play</label>
              <button class="btn" data-action="find-play" ${picked.length ? '' : 'disabled'}>▶ Play notes</button>
              <button class="btn" data-action="find-undo" ${picked.length ? '' : 'disabled'}>↶ Undo</button>
              <button class="btn" data-action="find-clear">Clear</button>
            </div>
          </div>
          <p class="muted">Play a melody or chord, then enter its notes here, on the fretboard, or by playing them into your microphone one at a time, <b>starting with the first note</b>. The first note is often the tonic, so keys that start there rank higher.</p>
          ${listening ? '<div id="mic-readout" class="mic-readout"><span class="muted">Listening…</span></div>' : ''}
          ${micError ? `<p class="error">${esc(micError)}</p>` : ''}
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
              <div><b>${esc(k.name)}</b><br><span class="muted">${esc(k.why.join('; ') || 'contains all your notes')}</span></div></li>`).join('')}</ul>`
              : '<p>No major or natural minor key contains all of these notes. Try removing one: it may be a passing or borrowed note.</p>')
              : '<p class="muted">Enter some notes first.</p>'}
          </section>
          <section class="panel">
            <h3>Matching chords</h3>
            ${picked.length < 2 ? '<p class="muted">Enter at least 2 notes.</p>' : chordMatches.length ? `<ul class="results">${chordMatches.map((c) => `
              <li><button class="btn" data-action="find-chord" data-root="${c.root}" data-type="${c.type}" data-bass="${T.COMMON_SPELLING[picked[0]]}">▶</button>
              <div><b>${esc(c.name)}</b> <span class="muted">${esc(c.typeName)}${c.rootPosition ? '' : ' (inversion: first note isn\'t the root)'}</span></div></li>`).join('')}</ul>`
              : '<p class="muted">These notes don\'t form a chord in the library exactly.</p>'}
          </section>
        </div>`;
    },
    actions: {
      'find-toggle': (d) => { toggle(Number(d.pc)); window.Sound.pluck(48 + Number(d.pc)); },
      'find-clear': () => { state.finder = []; save(); A.renderTab(); A.setFocus(null); },
      'find-undo': () => { state.finder.pop(); save(); A.renderTab(); A.setFocus(null); },
      'find-play': () => window.Sound.arpeggio(state.finder.map((p, i, arr) => 48 + p + (i && p < arr[0] ? 12 : 0))),
      'find-chord': (d) => {
        const chord = A.analyze(d.root, d.type, { bass: d.bass });
        A.playChord(chord);
        A.focusChord(chord);
      },
      'mic-toggle': () => { if (window.Mic.listening) { window.Mic.stop(); A.renderTab(); } else startMic(); },
      'use-key': (d) => {
        state.keyRoot = d.root; state.scale = d.scale; state.builderRoot = d.root; state.position = 0;
        save();
        A.switchTab('scales');
        A.renderAll();
        A.flash(`Key set to ${A.keyName()}`);
      },
    },
    changes: { 'auto-add': (el) => { autoAdd = el.checked; } },
  });
})();
