// Instrument factory — maps Claude's instrument names to Tone.js synths
const Synth = (() => {
  function make(name) {
    const n = (name || '').toLowerCase();

    if (n.includes('piano') || n.includes('grand'))
      return new Tone.PluckSynth({ attackNoise: 0.8, dampening: 5000, resonance: 0.99 }).toDestination();
    if (n.includes('harpsichord') || n.includes('clavier'))
      return new Tone.PluckSynth({ attackNoise: 2.5, dampening: 2000, resonance: 0.88 }).toDestination();
    if (n.includes('harp'))
      return new Tone.PluckSynth({ attackNoise: 0.4, dampening: 6000, resonance: 0.98 }).toDestination();
    if (n.includes('lute') || n.includes('banjo') || n.includes('mandolin'))
      return new Tone.PluckSynth({ attackNoise: 1.5, dampening: 3500, resonance: 0.97 }).toDestination();
    if (n.includes('guitar') && (n.includes('electric') || n.includes('elec')))
      return new Tone.FMSynth({ harmonicity: 2, modulationIndex: 8,
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.8 } }).toDestination();
    if (n.includes('guitar'))
      return new Tone.PluckSynth({ attackNoise: 2, dampening: 4000, resonance: 0.95 }).toDestination();
    if (n.includes('flute') || n.includes('recorder') || n.includes('piccolo'))
      return new Tone.Synth({ oscillator: { type: 'triangle8' },
        envelope: { attack: 0.12, decay: 0.1, sustain: 0.6, release: 0.6 } }).toDestination();
    if (n.includes('oboe') || n.includes('bassoon') || n.includes('clarinet'))
      return new Tone.Synth({ oscillator: { type: 'square4' },
        envelope: { attack: 0.08, decay: 0.1, sustain: 0.65, release: 0.4 } }).toDestination();
    if (n.includes('sax'))
      return new Tone.FMSynth({ harmonicity: 3, modulationIndex: 5,
        envelope: { attack: 0.06, decay: 0.1, sustain: 0.6, release: 0.5 } }).toDestination();
    if (n.includes('trumpet') || n.includes('horn') || n.includes('brass') || n.includes('trombone'))
      return new Tone.Synth({ oscillator: { type: 'sawtooth8' },
        envelope: { attack: 0.09, decay: 0.1, sustain: 0.7, release: 0.5 } }).toDestination();
    if (n.includes('violin') || n.includes('viola') || n.includes('cello') || n.includes('strings'))
      return new Tone.Synth({ oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.2, decay: 0.1, sustain: 0.7, release: 0.8 } }).toDestination();
    if (n.includes('snare'))
      return new Tone.NoiseSynth({ noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 } }).toDestination();
    if (n.includes('hihat') || n.includes('hi-hat') || n.includes('cymbal'))
      return new Tone.MetalSynth({ frequency: 400,
        envelope: { attack: 0.001, decay: 0.1, release: 0.05 },
        harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination();
    if (n.includes('timpani'))
      return new Tone.MembraneSynth({ pitchDecay: 0.08, octaves: 3,
        envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.2 } }).toDestination();
    if (n.includes('drum') || n.includes('percussion') || n.includes('kick') || n.includes('beat'))
      return new Tone.MembraneSynth({ pitchDecay: 0.04, octaves: 5,
        envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 } }).toDestination();
    if (n.includes('bass'))
      return new Tone.FMSynth({ harmonicity: 1.5, modulationIndex: 3,
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.5, release: 0.4 } }).toDestination();
    if (n.includes('organ'))
      return new Tone.AMSynth({ harmonicity: 2,
        envelope: { attack: 0.01, decay: 0.0, sustain: 1.0, release: 0.3 } }).toDestination();
    if (n.includes('choir') || n.includes('vocal') || n.includes('voice'))
      return new Tone.AMSynth({ harmonicity: 1.5,
        envelope: { attack: 0.3, decay: 0.1, sustain: 0.9, release: 0.8 } }).toDestination();
    if (n.includes('pad') || n.includes('ambient') || n.includes('atmosphere'))
      return new Tone.AMSynth({ harmonicity: 2.5,
        envelope: { attack: 0.4, decay: 0.2, sustain: 0.8, release: 1.2 } }).toDestination();
    if (n.includes('lead') || n.includes('arp'))
      return new Tone.Synth({ oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.3 } }).toDestination();
    if (n.includes('synth') || n.includes('electronic'))
      return new Tone.FMSynth({ harmonicity: 3, modulationIndex: 10,
        envelope: { attack: 0.02, decay: 0.15, sustain: 0.5, release: 0.5 } }).toDestination();

    return new Tone.Synth({ oscillator: { type: 'triangle' },
      envelope: { attack: 0.05, decay: 0.1, sustain: 0.5, release: 0.4 } }).toDestination();
  }

  function midiToNote(midi) {
    const n = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    return n[midi % 12] + (Math.floor(midi / 12) - 1);
  }

  function isDrum(name) {
    const n = (name || '').toLowerCase();
    return n.includes('drum') || n.includes('kick') || n.includes('snare') ||
           n.includes('hihat') || n.includes('cymbal') || n.includes('percussion') || n.includes('timpani');
  }

  let playbackTimeout = null;

  function play(arrangement, onDone) {
    Tone.start().then(() => {
      stop();
      const { tempo = 120, timeSignature = [4,4], tracks = [], totalBeats = 32 } = arrangement;
      const spb = 60 / tempo;

      Tone.Transport.bpm.value = tempo;
      Tone.Transport.timeSignature = timeSignature;

      tracks.forEach(track => {
        const synth = make(track.instrument || track.name || '');
        const drum = isDrum(track.instrument || track.name || '');
        const vol = (track.volume || 80) / 127;
        if (synth.volume) synth.volume.value = Tone.gainToDb(Math.min(1, vol));

        (track.notes || []).forEach(note => {
          const startSec = note.start * spb;
          const durSec = Math.max(0.05, note.duration * spb - 0.02);
          const pitch = drum ? 'C2' : midiToNote(Math.max(21, Math.min(108, note.pitch)));
          const vel = (note.velocity || 80) / 127;
          Tone.Transport.schedule(t => {
            try { synth.triggerAttackRelease(pitch, durSec, t, vel); } catch(e) {}
          }, '+' + startSec);
        });
      });

      const totalMs = totalBeats * spb * 1000 + 1500;
      Tone.Transport.start('+0.1');
      playbackTimeout = setTimeout(() => { stop(); onDone && onDone(); }, totalMs);
    });
  }

  function stop() {
    if (playbackTimeout) { clearTimeout(playbackTimeout); playbackTimeout = null; }
    try { Tone.Transport.stop(); Tone.Transport.cancel(); } catch(e) {}
  }

  return { make, play, stop, midiToNote, isDrum };
})();
