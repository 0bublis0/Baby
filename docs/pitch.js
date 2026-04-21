// Pitch detection via autocorrelation (YIN-inspired)
const Pitch = (() => {
  let audioCtx = null, analyser = null, stream = null;
  let timer = null, notes = [], curMidi = null, noteStart = null, recStart = null;

  function autocorrelate(buf, sr) {
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.015) return -1;

    let r1 = 0, r2 = SIZE - 1;
    for (let i = 0; i < SIZE / 2; i++) { if (Math.abs(buf[i]) < 0.2) { r1 = i; break; } }
    for (let i = 1; i < SIZE / 2; i++) { if (Math.abs(buf[SIZE - i]) < 0.2) { r2 = SIZE - i; break; } }

    const b = buf.slice(r1, r2);
    const c = new Array(b.length).fill(0);
    for (let i = 0; i < b.length; i++)
      for (let j = 0; j < b.length - i; j++)
        c[i] += b[j] * b[j + i];

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < b.length; i++) { if (c[i] > maxval) { maxval = c[i]; maxpos = i; } }

    let T0 = maxpos;
    if (T0 > 1 && T0 < b.length - 1) {
      const a = (c[T0-1] + c[T0+1] - 2*c[T0]) / 2;
      const bv = (c[T0+1] - c[T0-1]) / 2;
      if (a) T0 = T0 - bv / (2 * a);
    }
    return sr / T0;
  }

  function freqToMidi(f) { return Math.round(12 * Math.log2(f / 440) + 69); }

  function midiName(m) {
    return ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][m % 12] + (Math.floor(m/12)-1);
  }

  async function start(onPitch) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const src = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 4096;
    src.connect(analyser);
    notes = []; curMidi = null; noteStart = null; recStart = audioCtx.currentTime;

    timer = setInterval(() => {
      const buf = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buf);
      const freq = autocorrelate(buf, audioCtx.sampleRate);
      const now = audioCtx.currentTime - recStart;

      if (freq > 80 && freq < 1200) {
        const midi = freqToMidi(freq);
        onPitch(midi, midiName(midi));
        if (curMidi === null || Math.abs(curMidi - midi) > 1.5) {
          if (curMidi !== null && now - noteStart > 0.08)
            notes.push({ pitch: curMidi, start: noteStart, duration: now - noteStart });
          curMidi = midi; noteStart = now;
        }
      } else {
        if (curMidi !== null) {
          const elapsed = audioCtx.currentTime - recStart;
          if (elapsed - noteStart > 0.08)
            notes.push({ pitch: curMidi, start: noteStart, duration: elapsed - noteStart });
          curMidi = null; noteStart = null;
        }
        onPitch(null, null);
      }
    }, 50);
  }

  function stop() {
    clearInterval(timer);
    if (curMidi !== null && audioCtx) {
      const now = audioCtx.currentTime - recStart;
      if (now - noteStart > 0.08)
        notes.push({ pitch: curMidi, start: noteStart, duration: now - noteStart });
    }
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
    return [...notes];
  }

  return { start, stop, midiName };
})();
