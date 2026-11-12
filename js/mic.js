/*
 * mic.js: listens to the microphone and detects the pitch you play or sing.
 *
 * Uses autocorrelation: a pitched sound repeats itself every 1/frequency seconds, so we look for
 * the time shift at which the signal best matches itself.
 *
 *   Mic.start(({ freq, midi, cents }) => {...})   // called ~30× per second while a clear note sounds
 *   Mic.stop()
 *
 * Browsers only allow the microphone on https:// pages (like GitHub Pages) or http://localhost.
 */
(function () {
  'use strict';
  let stream = null;
  let ctx = null;
  let raf = null;

  function detect(buf, sampleRate) {
    // Ignore silence.
    let rms = 0;
    for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / buf.length);
    if (rms < 0.012) return null;

    // Trim the quiet edges so the correlation isn't dominated by noise.
    let start = 0; let end = buf.length - 1;
    const thr = 0.2;
    for (let i = 0; i < buf.length / 2; i++) if (Math.abs(buf[i]) < thr) { start = i; break; }
    for (let i = 1; i < buf.length / 2; i++) if (Math.abs(buf[buf.length - i]) < thr) { end = buf.length - i; break; }
    const x = buf.slice(start, end);
    const n = x.length;
    const c = new Float32Array(n);
    for (let lag = 0; lag < n; lag++) {
      let sum = 0;
      for (let i = 0; i < n - lag; i++) sum += x[i] * x[i + lag];
      c[lag] = sum;
    }
    let d = 0;
    while (d < n - 1 && c[d] > c[d + 1]) d++;   // skip the first downhill
    let best = -1; let bestLag = -1;
    for (let i = d; i < n; i++) if (c[i] > best) { best = c[i]; bestLag = i; }
    if (bestLag <= 0 || best / c[0] < 0.6) return null;   // not periodic enough
    // Parabolic interpolation for sub-sample accuracy.
    const a = c[bestLag - 1] || 0; const b = c[bestLag]; const e = c[bestLag + 1] || 0;
    const shift = (a - e) / (2 * (a - 2 * b + e) || 1);
    const freq = sampleRate / (bestLag + shift);
    if (freq < 60 || freq > 1500) return null;
    const exact = 69 + 12 * Math.log2(freq / 440);
    const midi = Math.round(exact);
    return { freq, midi, cents: Math.round((exact - midi) * 100) };
  }

  async function start(onPitch) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('This browser can\'t use the microphone here. Open the app from its https:// address (GitHub Pages) or via npm start.');
    }
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const loop = () => {
      analyser.getFloatTimeDomainData(buf);
      const p = detect(buf, ctx.sampleRate);
      onPitch(p);
      raf = requestAnimationFrame(loop);
    };
    loop();
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    if (ctx) ctx.close();
    ctx = null;
  }

  window.Mic = { start, stop, detect, get listening() { return !!stream; } };
})();
