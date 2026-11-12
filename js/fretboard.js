/*
 * fretboard.js: draws a guitar neck as SVG and marks notes on it.
 *
 * Fretboard.render(container, {
 *   tuning:    [40, 45, 50, 55, 59, 64]   // MIDI numbers, lowest string first
 *   frets:     15,
 *   marks:     Map(pitchClass → { name, label, role }),
 *   labelMode: 'name' | 'degree',
 *   onNote:    (midi, pitchClass) => {}
 * })
 */
(function () {
  'use strict';

  const G = { left: 34, open: 46, fret: 58, top: 22, string: 32 };
  const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
  const STRING_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

  function render(container, opts) {
    const { tuning, frets = 15, marks = new Map(), labelMode = 'name', onNote } = opts;
    const strings = tuning.length;
    const nutX = G.left + G.open;
    const width = nutX + frets * G.fret + 14;
    const boardBottom = G.top + (strings - 1) * G.string;
    const height = boardBottom + 40;
    const midY = G.top + ((strings - 1) * G.string) / 2;
    const fretX = (f) => nutX + f * G.fret;
    const noteX = (f) => (f === 0 ? G.left + G.open / 2 : fretX(f) - G.fret / 2);
    const stringY = (i) => G.top + (strings - 1 - i) * G.string; // highest string on top, like tab

    const parts = [];
    parts.push(`<rect class="fb-wood" x="${nutX}" y="${G.top - 10}" width="${frets * G.fret}" height="${boardBottom - G.top + 20}" rx="3"/>`);
    INLAYS.filter((f) => f <= frets).forEach((f) => {
      parts.push(`<circle class="fb-inlay" cx="${noteX(f)}" cy="${midY}" r="6"/>`);
    });
    if (frets >= 12) {
      parts.push(`<circle class="fb-inlay" cx="${noteX(12)}" cy="${midY - G.string}" r="6"/>`);
      parts.push(`<circle class="fb-inlay" cx="${noteX(12)}" cy="${midY + G.string}" r="6"/>`);
    }
    for (let f = 1; f <= frets; f++) {
      parts.push(`<line class="fb-fret" x1="${fretX(f)}" y1="${G.top - 10}" x2="${fretX(f)}" y2="${boardBottom + 10}"/>`);
      parts.push(`<text class="fb-fretnum" x="${noteX(f)}" y="${boardBottom + 30}">${f}</text>`);
    }
    parts.push(`<rect class="fb-nut" x="${nutX - 4}" y="${G.top - 10}" width="6" height="${boardBottom - G.top + 20}"/>`);

    tuning.forEach((openMidi, i) => {
      const y = stringY(i);
      const thickness = 1 + (strings - 1 - i) * 0.35;
      parts.push(`<line class="fb-string" x1="${G.left + 4}" y1="${y}" x2="${width - 10}" y2="${y}" stroke-width="${thickness.toFixed(2)}"/>`);
      parts.push(`<text class="fb-stringname" x="${G.left - 14}" y="${y + 4}">${STRING_NAMES[openMidi % 12]}</text>`);
      for (let f = 0; f <= frets; f++) {
        const midi = openMidi + f;
        const pc = midi % 12;
        const x = noteX(f);
        const w = f === 0 ? G.open : G.fret;
        parts.push(`<rect class="fb-hit" x="${x - w / 2}" y="${y - G.string / 2}" width="${w}" height="${G.string}" data-midi="${midi}" data-pc="${pc}"><title>${STRING_NAMES[pc]}, fret ${f}</title></rect>`);
        const m = marks.get(pc);
        if (!m) continue;
        const label = labelMode === 'degree' ? m.label : m.name;
        const small = label.length > 2 ? ' small' : '';
        parts.push(`<g class="fb-dot role-${m.role}" data-midi="${midi}" data-pc="${pc}">` +
          `<circle cx="${x}" cy="${y}" r="12.5"/>` +
          `<text class="${small}" x="${x}" y="${y + 4}">${label}</text></g>`);
      }
    });

    container.innerHTML = `<svg class="fretboard" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Guitar fretboard">${parts.join('')}</svg>`;

    container.onclick = (e) => {
      const el = e.target.closest('[data-midi]');
      if (el && onNote) onNote(Number(el.dataset.midi), Number(el.dataset.pc));
    };
  }

  const TUNINGS = {
    standard: { name: 'Standard (E A D G B E)', midi: [40, 45, 50, 55, 59, 64] },
    dropD: { name: 'Drop D (D A D G B E)', midi: [38, 45, 50, 55, 59, 64] },
    halfDown: { name: 'Half step down (E♭)', midi: [39, 44, 49, 54, 58, 63] },
    dadgad: { name: 'DADGAD', midi: [38, 45, 50, 55, 57, 62] },
    openG: { name: 'Open G (D G D G B D)', midi: [38, 43, 50, 55, 59, 62] },
  };

  window.Fretboard = { render, TUNINGS };
})();
