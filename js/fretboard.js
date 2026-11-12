/*
 * fretboard.js: draws a guitar neck (SVG) and small chord diagrams.
 *
 * Fretboard.render(container, {
 *   tuning:    [40, 45, 50, 55, 59, 64]     // MIDI numbers, lowest string first
 *   from, to:  0, 15                        // fret range to show
 *   lefty:     false                        // mirror for left-handed players
 *   marks:     Map(pitchClass → { name, label, role })
 *   only:      Set("string:fret") | null    // if given, draw marks only at these positions (a shape or box)
 *   labelMode: 'name' | 'degree'
 *   onNote:    (midi, pitchClass) => {}
 * })
 *
 * Fretboard.diagram(voicing, marks, { labelMode }) → SVG string of a vertical chord box.
 */
(function () {
  'use strict';

  const G = { left: 34, open: 46, fret: 58, top: 22, string: 32 };
  const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
  const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

  function render(container, opts) {
    const { tuning, marks = new Map(), labelMode = 'name', onNote, only = null, lefty = false } = opts;
    const from = Math.max(0, opts.from || 0);
    const to = Math.max(from + 3, opts.to == null ? 15 : opts.to);
    const strings = tuning.length;
    const hasOpen = from === 0;
    const nutX = G.left + (hasOpen ? G.open : 6);
    const firstCol = hasOpen ? 1 : from;
    const width = nutX + (to - firstCol + 1) * G.fret + 14;
    const boardBottom = G.top + (strings - 1) * G.string;
    const height = boardBottom + 40;
    const midY = G.top + ((strings - 1) * G.string) / 2;
    const X = (x) => (lefty ? width - x : x);               // mirror horizontally for lefties
    const fretLineX = (f) => nutX + (f - firstCol + 1) * G.fret;
    const noteX = (f) => (f === 0 ? G.left + G.open / 2 : fretLineX(f) - G.fret / 2);
    const stringY = (i) => G.top + (strings - 1 - i) * G.string; // highest string on top, like tab
    const rect = (x, y, w, h, cls, extra = '') => `<rect class="${cls}" x="${X(lefty ? x + w : x)}" y="${y}" width="${w}" height="${h}" ${extra}/>`;

    const parts = [];
    parts.push(rect(nutX, G.top - 10, (to - firstCol + 1) * G.fret, boardBottom - G.top + 20, 'fb-wood', 'rx="3"'));
    INLAYS.filter((f) => f >= firstCol && f <= to).forEach((f) => parts.push(`<circle class="fb-inlay" cx="${X(noteX(f))}" cy="${midY}" r="6"/>`));
    if (12 >= firstCol && 12 <= to) {
      parts.push(`<circle class="fb-inlay" cx="${X(noteX(12))}" cy="${midY - G.string}" r="6"/>`);
      parts.push(`<circle class="fb-inlay" cx="${X(noteX(12))}" cy="${midY + G.string}" r="6"/>`);
    }
    for (let f = firstCol; f <= to; f++) {
      parts.push(`<line class="fb-fret" x1="${X(fretLineX(f))}" y1="${G.top - 10}" x2="${X(fretLineX(f))}" y2="${boardBottom + 10}"/>`);
      parts.push(`<text class="fb-fretnum" x="${X(noteX(f))}" y="${boardBottom + 30}">${f}</text>`);
    }
    if (hasOpen) parts.push(rect(nutX - 4, G.top - 10, 6, boardBottom - G.top + 20, 'fb-nut'));
    else parts.push(`<line class="fb-fret" x1="${X(nutX)}" y1="${G.top - 10}" x2="${X(nutX)}" y2="${boardBottom + 10}"/>`);

    tuning.forEach((openMidi, i) => {
      const y = stringY(i);
      const thickness = 1 + (strings - 1 - i) * 0.35;
      parts.push(`<line class="fb-string" x1="${X(G.left + 4)}" y1="${y}" x2="${X(width - 10)}" y2="${y}" stroke-width="${thickness.toFixed(2)}"/>`);
      parts.push(`<text class="fb-stringname" x="${X(G.left - 14)}" y="${y + 4}">${NAMES[openMidi % 12]}</text>`);
      const frets = hasOpen ? [0] : [];
      for (let f = firstCol; f <= to; f++) frets.push(f);
      frets.forEach((f) => {
        const midi = openMidi + f;
        const pc = midi % 12;
        const x = noteX(f);
        const w = f === 0 ? G.open : G.fret;
        parts.push(rect(x - w / 2, y - G.string / 2, w, G.string, 'fb-hit', `data-midi="${midi}" data-pc="${pc}"`)
          .replace('/>', `><title>${NAMES[pc]}, fret ${f}</title></rect>`));
        const m = marks.get(pc);
        if (!m || (only && !only.has(`${i}:${f}`))) return;
        const label = labelMode === 'degree' ? m.label : m.name;
        const small = label.length > 2 ? ' small' : '';
        parts.push(`<g class="fb-dot role-${m.role}" data-midi="${midi}" data-pc="${pc}">` +
          `<circle cx="${X(x)}" cy="${y}" r="12.5"/><text class="${small}" x="${X(x)}" y="${y + 4}">${label}</text></g>`);
      });
    });

    container.innerHTML = `<svg class="fretboard" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Guitar fretboard">${parts.join('')}</svg>`;
    container.onclick = (e) => {
      const el = e.target.closest('[data-midi]');
      if (el && onNote) onNote(Number(el.dataset.midi), Number(el.dataset.pc));
    };
  }

  /** A small vertical chord box (like in songbooks). */
  function diagram(v, marks, { labelMode = 'name', lefty = false } = {}) {
    const strings = v.frets.length;
    const sp = 16; const fh = 20; const left = 22; const top = 26; const rows = 5;
    const base = v.maxFret <= 4 ? 1 : v.minFret;
    const w = left + (strings - 1) * sp + 18;
    const h = top + rows * fh + 10;
    const sx = (s) => left + (lefty ? strings - 1 - s : s) * sp;
    const p = [];
    for (let r = 0; r <= rows; r++) p.push(`<line class="cd-line${r === 0 && base === 1 ? ' nut' : ''}" x1="${left}" y1="${top + r * fh}" x2="${left + (strings - 1) * sp}" y2="${top + r * fh}"/>`);
    for (let s = 0; s < strings; s++) p.push(`<line class="cd-line" x1="${sx(s)}" y1="${top}" x2="${sx(s)}" y2="${top + rows * fh}"/>`);
    if (base > 1) p.push(`<text class="cd-base" x="${left - 6}" y="${top + fh / 2 + 4}">${base}</text>`);
    v.frets.forEach((f, s) => {
      if (f == null) { p.push(`<text class="cd-top" x="${sx(s)}" y="${top - 8}">×</text>`); return; }
      const pc = v.notes.find((n) => n.string === s).pc;
      const m = marks.get(pc) || { role: 'tone', name: '', label: '' };
      const label = labelMode === 'degree' ? m.label : m.name;
      if (f === 0) { p.push(`<g class="cd-open role-${m.role}"><circle cx="${sx(s)}" cy="${top - 12}" r="6"/></g>`); return; }
      const y = top + (f - base + 0.5) * fh;
      p.push(`<g class="fb-dot role-${m.role}"><circle cx="${sx(s)}" cy="${y}" r="7.5"/><text class="tiny" x="${sx(s)}" y="${y + 3}">${label}</text></g>`);
    });
    return `<svg class="chord-diagram" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${p.join('')}</svg>`;
  }

  const TUNINGS = {
    standard: { name: 'Standard (E A D G B E)', midi: [40, 45, 50, 55, 59, 64] },
    dropD: { name: 'Drop D (D A D G B E)', midi: [38, 45, 50, 55, 59, 64] },
    halfDown: { name: 'Half step down (E♭)', midi: [39, 44, 49, 54, 58, 63] },
    dadgad: { name: 'DADGAD', midi: [38, 45, 50, 55, 57, 62] },
    openG: { name: 'Open G (D G D G B D)', midi: [38, 43, 50, 55, 59, 62] },
  };

  window.Fretboard = { render, diagram, TUNINGS };
})();
