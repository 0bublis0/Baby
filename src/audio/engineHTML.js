export const AUDIO_ENGINE_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
</style>
</head>
<body>
<script>
// ═══════════════════════════════
// Pitch Detection (Autocorrelation)
// ═══════════════════════════════
function autocorrelate(buffer, sampleRate) {
  var SIZE = buffer.length;
  var rms = 0;
  for (var i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.015) return -1;

  var r1 = 0, r2 = SIZE - 1;
  var threshold = 0.2;
  for (var i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) { r1 = i; break; }
  }
  for (var i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < threshold) { r2 = SIZE - i; break; }
  }

  var buf = buffer.slice(r1, r2);
  var c = new Array(buf.length).fill(0);
  for (var i = 0; i < buf.length; i++) {
    for (var j = 0; j < buf.length - i; j++) {
      c[i] += buf[j] * buf[j + i];
    }
  }

  var d = 0;
  while (c[d] > c[d + 1]) d++;
  var maxval = -1, maxpos = -1;
  for (var i = d; i < buf.length; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }

  var T0 = maxpos;
  if (T0 > 1 && T0 < buf.length - 1) {
    var x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    var a = (x1 + x3 - 2 * x2) / 2;
    var b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);
  }

  return sampleRate / T0;
}

function freqToMidi(freq) {
  return Math.round(12 * Math.log2(freq / 440) + 69);
}

function midiToNoteName(midi) {
  var names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  var octave = Math.floor(midi / 12) - 1;
  return names[midi % 12] + octave;
}

// ═══════════════════════════════
// State
// ═══════════════════════════════
var audioCtx = null, analyser = null, micStream = null;
var pitchTimer = null, recordedNotes = [], currentMidi = null, noteStart = null, recordStart = null;
var toneLoaded = false;

// ═══════════════════════════════
// RN Bridge
// ═══════════════════════════════
function sendToRN(msg) {
  var json = JSON.stringify(msg);
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(json);
  } else {
    window.parent.postMessage(json, '*');
  }
}

function handleMessage(event) {
  try {
    var msg = JSON.parse(event.data);
    switch (msg.type) {
      case 'START_RECORDING': startRecording(); break;
      case 'STOP_RECORDING': stopRecording(); break;
      case 'PLAY': playArrangement(msg.arrangement); break;
      case 'STOP': stopPlayback(); break;
      case 'LOAD_TONE': loadTone(); break;
    }
  } catch(e) {}
}

window.addEventListener('message', handleMessage);
document.addEventListener('message', handleMessage);

// ═══════════════════════════════
// Recording
// ═══════════════════════════════
function startRecording() {
  navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    .then(function(stream) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
      micStream = stream;
      var source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 4096;
      source.connect(analyser);
      recordedNotes = [];
      currentMidi = null;
      noteStart = null;
      recordStart = audioCtx.currentTime;

      pitchTimer = setInterval(function() {
        var buf = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(buf);
        var freq = autocorrelate(buf, audioCtx.sampleRate);
        var now = audioCtx.currentTime - recordStart;

        if (freq > 80 && freq < 1200) {
          var midi = freqToMidi(freq);
          sendToRN({ type: 'PITCH', note: midi, name: midiToNoteName(midi) });

          if (currentMidi === null || Math.abs(currentMidi - midi) > 1.5) {
            if (currentMidi !== null && now - noteStart > 0.08) {
              recordedNotes.push({ pitch: currentMidi, start: noteStart, duration: now - noteStart });
            }
            currentMidi = midi;
            noteStart = now;
          }
        } else {
          if (currentMidi !== null) {
            var elapsed = audioCtx.currentTime - recordStart;
            if (elapsed - noteStart > 0.08) {
              recordedNotes.push({ pitch: currentMidi, start: noteStart, duration: elapsed - noteStart });
            }
            currentMidi = null;
            noteStart = null;
          }
          sendToRN({ type: 'PITCH', note: null, name: null });
        }
      }, 50);

      sendToRN({ type: 'RECORDING_STARTED' });
    })
    .catch(function(e) {
      sendToRN({ type: 'ERROR', message: 'Microphone access denied: ' + e.message });
    });
}

function stopRecording() {
  clearInterval(pitchTimer);
  if (currentMidi !== null && noteStart !== null && audioCtx) {
    var now = audioCtx.currentTime - recordStart;
    if (now - noteStart > 0.08) {
      recordedNotes.push({ pitch: currentMidi, start: noteStart, duration: now - noteStart });
    }
  }
  if (micStream) micStream.getTracks().forEach(function(t) { t.stop(); });
  if (audioCtx) { audioCtx.close(); audioCtx = null; }
  sendToRN({ type: 'RECORDING_DONE', notes: recordedNotes });
}

// ═══════════════════════════════
// Tone.js Loader
// ═══════════════════════════════
function loadTone() {
  if (toneLoaded) { sendToRN({ type: 'TONE_READY' }); return; }
  var script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tone/14.7.77/Tone.js';
  script.onload = function() {
    toneLoaded = true;
    sendToRN({ type: 'TONE_READY' });
  };
  script.onerror = function() {
    sendToRN({ type: 'ERROR', message: 'Could not load audio engine. Check internet connection.' });
  };
  document.head.appendChild(script);
}

// ═══════════════════════════════
// Instrument Factory
// ═══════════════════════════════
function makeInstrument(name) {
  var n = (name || '').toLowerCase();

  // ── Plucked / keyboard ──
  if (n.includes('piano') || n.includes('grand')) {
    return new Tone.PluckSynth({ attackNoise: 0.8, dampening: 5000, resonance: 0.99 }).toDestination();
  }
  if (n.includes('harpsichord') || n.includes('clavier')) {
    return new Tone.PluckSynth({ attackNoise: 2.5, dampening: 2000, resonance: 0.88 }).toDestination();
  }
  if (n.includes('harp')) {
    return new Tone.PluckSynth({ attackNoise: 0.4, dampening: 6000, resonance: 0.98 }).toDestination();
  }
  if (n.includes('lute') || n.includes('pluck') || n.includes('banjo') || n.includes('mandolin')) {
    return new Tone.PluckSynth({ attackNoise: 1.5, dampening: 3500, resonance: 0.97 }).toDestination();
  }

  // ── Guitar ──
  if (n.includes('guitar') && (n.includes('electric') || n.includes('elec'))) {
    return new Tone.FMSynth({
      harmonicity: 2, modulationIndex: 8,
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.8 }
    }).toDestination();
  }
  if (n.includes('guitar')) {
    return new Tone.PluckSynth({ attackNoise: 2, dampening: 4000, resonance: 0.95 }).toDestination();
  }

  // ── Wind / Woodwind ──
  if (n.includes('flute') || n.includes('recorder') || n.includes('piccolo')) {
    return new Tone.Synth({
      oscillator: { type: 'triangle8' },
      envelope: { attack: 0.12, decay: 0.1, sustain: 0.6, release: 0.6 }
    }).toDestination();
  }
  if (n.includes('oboe') || n.includes('bassoon') || n.includes('clarinet')) {
    return new Tone.Synth({
      oscillator: { type: 'square4' },
      envelope: { attack: 0.08, decay: 0.1, sustain: 0.65, release: 0.4 }
    }).toDestination();
  }
  if (n.includes('saxophone') || n.includes('sax')) {
    return new Tone.FMSynth({
      harmonicity: 3, modulationIndex: 5,
      envelope: { attack: 0.06, decay: 0.1, sustain: 0.6, release: 0.5 }
    }).toDestination();
  }

  // ── Brass ──
  if (n.includes('trumpet') || n.includes('horn') || n.includes('brass') || n.includes('trombone') || n.includes('bugle')) {
    return new Tone.Synth({
      oscillator: { type: 'sawtooth8' },
      envelope: { attack: 0.09, decay: 0.1, sustain: 0.7, release: 0.5 }
    }).toDestination();
  }

  // ── Strings ──
  if (n.includes('violin') || n.includes('viola') || n.includes('cello') || n.includes('strings')) {
    return new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.2, decay: 0.1, sustain: 0.7, release: 0.8 }
    }).toDestination();
  }

  // ── Drums / Percussion ──
  if (n.includes('snare')) {
    return new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 }
    }).toDestination();
  }
  if (n.includes('hihat') || n.includes('hi-hat') || n.includes('cymbal')) {
    return new Tone.MetalSynth({
      frequency: 400, envelope: { attack: 0.001, decay: 0.1, release: 0.05 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5
    }).toDestination();
  }
  if (n.includes('timpani')) {
    return new Tone.MembraneSynth({
      pitchDecay: 0.08, octaves: 3,
      envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.2 }
    }).toDestination();
  }
  if (n.includes('drum') || n.includes('percussion') || n.includes('beat') || n.includes('kick')) {
    return new Tone.MembraneSynth({
      pitchDecay: 0.04, octaves: 5,
      envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 }
    }).toDestination();
  }

  // ── Bass ──
  if (n.includes('bass')) {
    return new Tone.FMSynth({
      harmonicity: 1.5, modulationIndex: 3,
      envelope: { attack: 0.05, decay: 0.1, sustain: 0.5, release: 0.4 }
    }).toDestination();
  }

  // ── Keyboard / Pads ──
  if (n.includes('organ')) {
    return new Tone.AMSynth({
      harmonicity: 2,
      envelope: { attack: 0.01, decay: 0.0, sustain: 1.0, release: 0.3 }
    }).toDestination();
  }
  if (n.includes('choir') || n.includes('vocal') || n.includes('voice')) {
    return new Tone.AMSynth({
      harmonicity: 1.5,
      envelope: { attack: 0.3, decay: 0.1, sustain: 0.9, release: 0.8 }
    }).toDestination();
  }
  if (n.includes('pad') || n.includes('atmosphere') || n.includes('ambient')) {
    return new Tone.AMSynth({
      harmonicity: 2.5,
      envelope: { attack: 0.4, decay: 0.2, sustain: 0.8, release: 1.2 }
    }).toDestination();
  }

  // ── Electronic / Synth ──
  if (n.includes('lead') || n.includes('arp')) {
    return new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.3 }
    }).toDestination();
  }
  if (n.includes('synth') || n.includes('electronic') || n.includes('digital')) {
    return new Tone.FMSynth({
      harmonicity: 3, modulationIndex: 10,
      envelope: { attack: 0.02, decay: 0.15, sustain: 0.5, release: 0.5 }
    }).toDestination();
  }

  // ── Default ──
  return new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.05, decay: 0.1, sustain: 0.5, release: 0.4 }
  }).toDestination();
}

function midiToToneNote(midi) {
  var names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  var octave = Math.floor(midi / 12) - 1;
  return names[midi % 12] + octave;
}

// ═══════════════════════════════
// Playback
// ═══════════════════════════════
var playbackTimeout = null;

function playArrangement(arr) {
  if (!toneLoaded) { sendToRN({ type: 'ERROR', message: 'Audio engine not loaded' }); return; }

  Tone.start().then(function() {
    stopPlayback();

    var tempo = arr.tempo || 120;
    var secondsPerBeat = 60 / tempo;

    Tone.Transport.bpm.value = tempo;
    Tone.Transport.timeSignature = arr.timeSignature || [4, 4];

    var isDrumTrack = function(track) {
      var n = (track.instrument || track.name || '').toLowerCase();
      return n.includes('drum') || n.includes('percussion') || n.includes('beat') || n.includes('kick');
    };

    (arr.tracks || []).forEach(function(track) {
      var synth = makeInstrument(track.instrument || track.name || '');
      var isDrum = isDrumTrack(track);
      var vol = (track.volume || 80) / 127;
      if (synth.volume) synth.volume.value = Tone.gainToDb(Math.min(1, vol));

      (track.notes || []).forEach(function(note) {
        var startSec = note.start * secondsPerBeat;
        var durSec = Math.max(0.05, note.duration * secondsPerBeat - 0.02);
        var pitchArg = isDrum ? 'C2' : midiToToneNote(Math.max(21, Math.min(108, note.pitch)));
        var vel = (note.velocity || 80) / 127;

        Tone.Transport.schedule(function(time) {
          try { synth.triggerAttackRelease(pitchArg, durSec, time, vel); } catch(e) {}
        }, '+' + startSec);
      });
    });

    var totalBeats = arr.totalBeats || 32;
    var totalMs = totalBeats * secondsPerBeat * 1000 + 1500;

    Tone.Transport.start('+0.1');

    playbackTimeout = setTimeout(function() {
      stopPlayback();
      sendToRN({ type: 'PLAYBACK_DONE' });
    }, totalMs);

    sendToRN({ type: 'PLAYBACK_STARTED', totalBeats: totalBeats, tempo: tempo });
  });
}

function stopPlayback() {
  if (playbackTimeout) { clearTimeout(playbackTimeout); playbackTimeout = null; }
  try {
    Tone.Transport.stop();
    Tone.Transport.cancel();
  } catch(e) {}
}
<\/script>
</body>
</html>`;
