/*
 * piano.js: draws a two-octave piano keyboard (SVG) with the same note marks as the fretboard.
 * Piano.render(container, { marks, labelMode, startMidi = 48, octaves = 2, onNote })
 */
(function () {
  'use strict';
  const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
  const BLACK_AFTER = { 0: 1, 2: 3, 5: 6, 7: 8, 9: 10 }; // white pc → the black key to its right

  function render(container, { marks = new Map(), labelMode = 'name', startMidi = 48, octaves = 2, onNote } = {}) {
    const ww = 40; const wh = 150; const bw = 26; const bh = 92;
    const whites = [];
    for (let o = 0; o < octaves; o++) WHITE_PCS.forEach((pc) => whites.push(startMidi + o * 12 + pc));
    whites.push(startMidi + octaves * 12); // final C
    const width = whites.length * ww + 2;
    const parts = [];
    const dot = (cx, cy, midi) => {
      const m = marks.get(midi % 12);
      if (!m) return '';
      const label = labelMode === 'degree' ? m.label : m.name;
      return `<g class="fb-dot role-${m.role}"><circle cx="${cx}" cy="${cy}" r="12"/><text class="${label.length > 2 ? 'small' : ''}" x="${cx}" y="${cy + 4}">${label}</text></g>`;
    };
    whites.forEach((midi, i) => {
      parts.push(`<g data-midi="${midi}" data-pc="${midi % 12}"><rect class="pk-white" x="${i * ww + 1}" y="1" width="${ww - 2}" height="${wh}" rx="4"/>${dot(i * ww + ww / 2, wh - 22, midi)}</g>`);
    });
    whites.forEach((midi, i) => {
      const b = BLACK_AFTER[midi % 12];
      if (b == null || i === whites.length - 1) return;
      const bm = midi + 1;
      const x = (i + 1) * ww - bw / 2;
      parts.push(`<g data-midi="${bm}" data-pc="${bm % 12}"><rect class="pk-black" x="${x}" y="1" width="${bw}" height="${bh}" rx="3"/>${dot(x + bw / 2, bh - 18, bm)}</g>`);
    });
    container.innerHTML = `<svg class="piano" viewBox="0 0 ${width} ${wh + 4}" width="${width}" height="${wh + 4}" role="img" aria-label="Piano keyboard">${parts.join('')}</svg>`;
    container.onclick = (e) => {
      const el = e.target.closest('[data-midi]');
      if (el && onNote) onNote(Number(el.dataset.midi), Number(el.dataset.pc));
    };
  }

  window.Piano = { render };
})();
