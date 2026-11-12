/*
 * Advanced Harmony tab: secondary dominants, tritone substitutions, borrowed chords, modulation.
 * Circle of Fifths tab: key relationships at a glance.
 */
(function () {
  'use strict';
  const A = window.App;
  const { T, state, save, esc } = A;

  const chordBtn = (c, extra = '') => `
    <button class="mini-chord fnb-${c.fn}" data-action="focus-chord" data-numeral="${esc(c.numeral)}" title="Hear it and see it on the neck">
      <b>${esc(c.name)}</b> <span class="muted">${esc(c.numeral)}</span>${extra}</button>`;
  const addBtn = (numeral) => `<button class="icon-btn" data-action="add-chord" data-numeral="${esc(numeral)}" title="Add to progression">＋</button>`;

  A.registerTab({
    id: 'advanced', label: 'Advanced Harmony', order: 60, keepFocus: true,
    render() {
      if (T.buildScale(state.keyRoot, state.scale).length !== 7) {
        return `<section class="panel"><h2>Advanced harmony</h2><p>These tools need a 7-note key. Pick Major, Minor or a mode in the top bar.</p></section>`;
      }
      const sec = T.secondaryDominants(state.keyRoot, state.scale);
      const subs = T.tritoneSubs(state.keyRoot, state.scale);
      const borrowed = T.borrowedChords(state.keyRoot, state.scale, state.sevenths);
      const close = T.closeKeys(state.keyRoot, state.scale);
      const targetScale = state.pivotScale;
      const pivots = T.pivotChords(state.keyRoot, state.scale, state.pivotRoot, targetScale, state.sevenths);
      const targetName = `${T.noteName(T.parseNote(state.pivotRoot))} ${T.SCALES[targetScale].name}`;

      return `
        <section class="panel">
          <h2>Secondary dominants</h2>
          <p>Any major or minor chord in the key can get its <b>own</b> dominant for a moment: the V7 of that chord. It adds one note from outside the key (a leading tone that pulls up a half step into the target). Written <code>V7/ii</code>: "five of two".</p>
          <div class="table-wrap"><table>
            <thead><tr><th>Chord</th><th>Resolves to</th><th>Borrowed leading tone</th><th>Try</th><th></th></tr></thead>
            <tbody>${sec.map((s) => `<tr>
              <td>${chordBtn(s.chord)}</td>
              <td>${chordBtn(s.target)}</td>
              <td><b>${esc(s.leadingTone)}</b> → ${esc(T.noteName(s.target.root))}</td>
              <td><code>${esc(s.chord.numeral)} ${esc(s.target.numeral)}</code></td>
              <td class="nowrap">${addBtn(s.chord.numeral)}<button class="icon-btn" data-action="adv-try" data-prog="${esc(`${s.chord.numeral} ${s.target.numeral}`)}" title="Play the resolution">▶</button></td>
            </tr>`).join('')}</tbody>
          </table></div>
        </section>

        <section class="panel">
          <h2>Tritone substitution</h2>
          <p>Two dominant 7th chords a tritone apart share the same <b>3rd and 7th</b> (swapped), which are the two notes that create the tension. So one can replace the other. The sub's root usually slides down by a half step into the target: a smooth, jazzy bass line.</p>
          <div class="table-wrap"><table>
            <thead><tr><th>Dominant</th><th>Substitute</th><th>Shared tension notes</th><th>Resolves to</th><th></th></tr></thead>
            <tbody>${subs.map((s) => `<tr>
              <td>${chordBtn(s.original)}</td>
              <td>${chordBtn(s.sub)}</td>
              <td>${s.shared.map(esc).join(' + ')}</td>
              <td><code>${esc(s.target)}</code></td>
              <td class="nowrap">${addBtn(s.sub.numeral)}<button class="icon-btn" data-action="adv-try" data-prog="${esc(`${s.sub.numeral} ${s.target}`)}" title="Play the resolution">▶</button></td>
            </tr>`).join('')}</tbody>
          </table></div>
        </section>

        <section class="panel">
          <div class="panel-head"><h2>Borrowed chords (modal interchange)</h2>${A.sevenToggle()}</div>
          <p>Borrow chords from scales that share your tonic. ${T.SCALES[state.scale].family === 'major' ? 'In a major key, the <b>parallel minor</b> gives the classic ones: <b>iv</b> (bittersweet), <b>♭VI</b> and <b>♭VII</b> (epic, rock), <b>♭III</b>.' : 'In a minor key, the most common borrow is the <b>major V</b> (from harmonic minor), plus the bright <b>IV</b> from Dorian.'} Only chords that aren't already in your key are listed.</p>
          ${borrowed.map((g) => `
            <div class="borrow-group">
              <h4>From ${esc(T.noteName(T.parseNote(state.keyRoot)))} ${esc(g.name)}</h4>
              <div class="mini-list">${g.chords.map((c) => `<span class="mini-wrap">${chordBtn(c)}${addBtn(c.numeral)}</span>`).join('')}</div>
            </div>`).join('')}
        </section>

        <section class="panel">
          <h2>Modulation: changing key</h2>
          <p>The smoothest way to change key is through a <b>pivot chord</b>: a chord that belongs to both keys. The listener hears it in the old key, and you continue as if it were in the new one. The <b>closely related keys</b> (one accidental apart, or relative major/minor) share the most chords.</p>
          <div class="btn-row">
            <span class="muted">Close keys:</span>
            ${close.map((k) => `<button class="chip${k.root === state.pivotRoot && k.scaleKey === state.pivotScale ? ' on' : ''}" data-action="pivot-key" data-root="${k.root}" data-scale="${k.scaleKey}">${esc(k.name)} <span class="muted">(${esc(k.numeral)})</span></button>`).join('')}
          </div>
          <div class="btn-row" style="margin-top:8px">
            <label class="inline">Or any key <select id="pivot-root">${A.rootOptions(state.pivotRoot)}</select></label>
            <select id="pivot-scale">${['major', 'minor', 'dorian', 'mixolydian', 'harmonicMinor'].map((k) => `<option value="${k}"${k === targetScale ? ' selected' : ''}>${esc(T.SCALES[k].name)}</option>`).join('')}</select>
          </div>
          <h4>Pivot chords: ${esc(A.keyName())} → ${esc(targetName)}</h4>
          ${pivots.length ? `<div class="table-wrap"><table>
            <thead><tr><th>Chord</th><th>In ${esc(T.noteName(T.parseNote(state.keyRoot)))}</th><th>In ${esc(T.noteName(T.parseNote(state.pivotRoot)))}</th></tr></thead>
            <tbody>${pivots.map((p) => `<tr><td>${chordBtn(p.chord)}</td><td>${esc(p.inA)} ${A.fnBadge(p.fnA)}</td><td>${esc(p.inB)} ${A.fnBadge(p.fnB)}</td></tr>`).join('')}</tbody>
          </table></div>
          <p class="muted">Tip: a pivot that is <b>S</b> (subdominant) in the new key works best, because it leads naturally to the new key's V → I.</p>`
            : '<p>These keys share no chords: you\'d need a direct ("abrupt") modulation or a chain of keys in between. Try one of the close keys.</p>'}
          <button class="btn" data-action="use-pivot-key">Switch the app to ${esc(targetName)}</button>
        </section>`;
    },
    actions: {
      'adv-try': (d) => {
        const chords = T.parseProgression(d.prog, state.keyRoot, state.scale).chords;
        A.Player.play(chords.map((chord) => ({ chord, beats: 2 })), { tempo: 80 });
      },
      'pivot-key': (d) => { state.pivotRoot = d.root; state.pivotScale = d.scale; save(); A.renderTab(); },
      'use-pivot-key': () => {
        state.keyRoot = state.pivotRoot; state.scale = state.pivotScale; state.builderRoot = state.keyRoot;
        save(); A.renderAll(); A.flash(`Key changed to ${A.keyName()}`);
      },
    },
    changes: {
      'pivot-root': (el) => { state.pivotRoot = el.value; save(); A.renderTab(); },
      'pivot-scale': (el) => { state.pivotScale = el.value; save(); A.renderTab(); },
    },
  });

  // ---------------------------------------------------------------------------
  // Circle of fifths
  // ---------------------------------------------------------------------------
  function circleSvg(current) {
    const cx = 210; const cy = 210; const R1 = 200; const R2 = 140; const R3 = 88;
    const diatonic = {}; // index → { outer: numeral, inner: numeral, fn }
    if (current !== null) {
      const at = (k) => T.mod(current + k, 12);
      // Roman numerals relative to the major key that shares the notes; the current tonic is highlighted.
      diatonic[at(0)] = { outer: 'I', inner: 'vi' };
      diatonic[at(-1)] = { outer: 'IV', inner: 'ii' };
      diatonic[at(1)] = { outer: 'V', inner: 'iii' };
      diatonic[at(2)] = { inner: 'vii°', dim: true };
    }
    const seg = (r0, r1, i) => {
      const a0 = ((i - 0.5) * 30 - 90) * Math.PI / 180;
      const a1 = ((i + 0.5) * 30 - 90) * Math.PI / 180;
      const p = (r, a) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
      return `M ${p(r1, a0)} A ${r1} ${r1} 0 0 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 0 0 ${p(r0, a0)} Z`;
    };
    const pos = (r, i) => {
      const a = (i * 30 - 90) * Math.PI / 180;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    };
    const tonicPc = T.pc(T.parseNote(state.keyRoot));
    const parts = [];
    T.CIRCLE.forEach((k, i) => {
      const d = diatonic[i] || {};
      const majOn = T.pc(T.parseNote(k.major)) === tonicPc && T.SCALES[state.scale].family === 'major';
      const minOn = T.pc(T.parseNote(k.minor)) === tonicPc && T.SCALES[state.scale].family === 'minor';
      const sig = T.keySignature(k.major, 'major');
      const [ox, oy] = pos((R1 + R2) / 2, i);
      const [ix, iy] = pos((R2 + R3) / 2, i);
      parts.push(`<g class="cof-seg${d.outer ? ' in-key' : ''}${majOn ? ' tonic' : ''}" data-action="cof-key" data-root="${k.major}" data-scale="major">
        <path d="${seg(R2, R1, i)}"/><text class="cof-key" x="${ox}" y="${oy - 4}">${T.noteName(T.parseNote(k.major))}${k.major === 'F#' ? '/G♭' : k.major === 'Db' ? '/C♯' : ''}</text>
        <text class="cof-sub" x="${ox}" y="${oy + 13}">${d.outer ? d.outer : sig.count ? sig.count + sig.type : '–'}</text></g>`);
      parts.push(`<g class="cof-seg inner${d.inner ? ' in-key' : ''}${d.dim ? ' dim' : ''}${minOn ? ' tonic' : ''}" data-action="cof-key" data-root="${k.minor}" data-scale="minor">
        <path d="${seg(R3, R2, i)}"/><text class="cof-key small" x="${ix}" y="${iy - 2}">${T.noteName(T.parseNote(k.minor))}m</text>
        ${d.inner ? `<text class="cof-sub" x="${ix}" y="${iy + 12}">${d.inner}</text>` : ''}</g>`);
    });
    parts.push(`<circle class="cof-hub" cx="${cx}" cy="${cy}" r="${R3 - 4}"/><text class="cof-hub-text" x="${cx}" y="${cy - 4}">Circle of</text><text class="cof-hub-text" x="${cx}" y="${cy + 14}">fifths</text>`);
    return `<svg class="cof" viewBox="0 0 420 420" width="420" height="420" role="img" aria-label="Circle of fifths">${parts.join('')}</svg>`;
  }

  A.registerTab({
    id: 'circle', label: 'Circle of Fifths', order: 70,
    render() {
      const idx = T.circleIndex(state.keyRoot, state.scale);
      const sig = T.keySignature(state.keyRoot, state.scale);
      const fam = T.SCALES[state.scale].family;
      const tonic = T.noteName(T.parseNote(state.keyRoot));
      const rel = idx === null ? null : fam === 'minor' ? T.CIRCLE[idx].major : T.CIRCLE[idx].minor;
      const modeNote = idx !== null && !['major', 'minor'].includes(state.scale)
        ? `<p><b>${esc(A.keyName())}</b> uses the same notes as <b>${T.noteName(T.parseNote(T.CIRCLE[idx].major))} major</b>, so its chords are highlighted on that part of the circle.</p>` : '';
      return `
        <div class="cof-layout">
          <section class="panel cof-panel">${circleSvg(idx)}</section>
          <section class="panel">
            <h2>${esc(A.keyName())}</h2>
            ${idx === null ? '<p>The circle shows 7-note major and minor keys. Pick one of those in the top bar to see it highlighted.</p>' : `
            <p><b>Key signature:</b> ${sig.count ? `${sig.count} ${sig.type === '♯' ? 'sharp' : 'flat'}${sig.count > 1 ? 's' : ''}: ${sig.notes.join(' ')}` : 'no sharps or flats'}</p>
            ${rel && ['major', 'minor'].includes(state.scale) ? `<p><b>Relative ${fam === 'major' ? 'minor' : 'major'}:</b> ${T.noteName(T.parseNote(rel))} ${fam === 'major' ? 'minor' : 'major'} (same notes, different home)</p>` : ''}
            <p><b>Parallel ${fam === 'major' ? 'minor' : 'major'}:</b> ${tonic} ${fam === 'major' ? 'minor' : 'major'} (same home, different notes: a source of borrowed chords)</p>
            ${modeNote}`}
            <h3>How to read it</h3>
            <ul>
              <li>Going <b>clockwise</b>, each key is a <b>5th higher</b> and adds one sharp (or removes a flat).</li>
              <li><b>Neighbours</b> differ by just one note. That's why I, IV and V sit next to each other, and why moving to a neighbouring key sounds smooth.</li>
              <li>The <b>highlighted slice</b> is your key's chords: the 3 major chords outside, the 3 minor chords inside, plus vii°.</li>
              <li>Moving <b>counter-clockwise</b> is falling by 5ths, the strongest chord motion: ii → V → I, or the whole ragtime chain V/vi → V/ii → V/V → V → I.</li>
            </ul>
            <p class="muted">Click any key to switch to it.</p>
          </section>
        </div>`;
    },
    actions: {
      'cof-key': (d) => {
        state.keyRoot = d.root; state.scale = d.scale; state.builderRoot = d.root; state.position = 0;
        save(); A.renderAll();
        const s = T.buildScale(d.root, d.scale);
        const triad = [s[0], s[2], s[4]].map((n) => 48 + T.mod(n.pc - s[0].pc, 12) + s[0].pc);
        window.Sound.strum(triad);
      },
    },
  });
})();
