// ─── Music Theory Engine ───────────────────────────────────────────
const MusicGen = (() => {

  const SCALE_INTERVALS = {
    major:          [0,2,4,5,7,9,11],
    minor:          [0,2,3,5,7,8,10],
    dorian:         [0,2,3,5,7,9,10],
    mixolydian:     [0,2,4,5,7,9,10],
    phrygian:       [0,1,3,5,7,8,10],
    pentatonic_min: [0,3,5,7,10],
    pentatonic_maj: [0,2,4,7,9],
    blues:          [0,3,5,6,7,10],
  };

  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

  function noteNameToMidi(name, octave = 4) {
    const idx = NOTE_NAMES.indexOf(name);
    return (octave + 1) * 12 + idx;
  }

  // ── Pseudo-random with seed ──
  function seededRand(seed) {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  // ── Style definitions ──────────────────────────────────────────────
  const STYLES = {
    medieval: {
      label: 'Medieval',
      icon: '⚔',
      scale: 'dorian',
      keys:   { bright:'D', dark:'A', epic:'G', peaceful:'F' },
      tempos: { slow:70, medium:88, fast:108 },
      time:   [3,4],
      instruments: ['flute','lute','harp','drum'],
      roles:  ['melody','harmony','bass','rhythm'],
      prog:   [0,5,3,0, 0,3,5,0],  // scale degree roots
      melStyle:'stepwise', bassStyle:'root', harmStyle:'drone',
    },
    renaissance: {
      label: 'Renaissance',
      icon: '🎻',
      scale: 'mixolydian',
      keys:   { bright:'G', dark:'D', epic:'C', peaceful:'F' },
      tempos: { slow:76, medium:96, fast:126 },
      time:   [3,4],
      instruments: ['flute','strings','harp','drum'],
      roles:  ['melody','harmony','bass','rhythm'],
      prog:   [0,3,5,0, 4,3,0,4],
      melStyle:'dance', bassStyle:'root', harmStyle:'parallel',
    },
    baroque: {
      label: 'Baroque',
      icon: '🎹',
      scale: 'major',
      keys:   { bright:'G', dark:'D', epic:'C', peaceful:'F' },
      tempos: { slow:84, medium:112, fast:144 },
      time:   [4,4],
      instruments: ['violin','harpsichord','cello','organ'],
      roles:  ['melody','harmony','bass','bass2'],
      prog:   [0,3,4,0, 5,4,0,4],
      melStyle:'running', bassStyle:'walking', harmStyle:'alberti',
    },
    classical: {
      label: 'Classical',
      icon: '🎼',
      scale: 'major',
      keys:   { bright:'C', dark:'G', epic:'D', peaceful:'F' },
      tempos: { slow:88, medium:120, fast:152 },
      time:   [4,4],
      instruments: ['piano','violin','cello'],
      roles:  ['melody','harmony','bass'],
      prog:   [0,3,4,0, 3,5,4,0],
      melStyle:'elegant', bassStyle:'alberti', harmStyle:'chords',
    },
    romantic: {
      label: 'Romantic',
      icon: '🌹',
      scale: 'minor',
      keys:   { bright:'A', dark:'D', epic:'E', peaceful:'C' },
      tempos: { slow:60, medium:84, fast:104 },
      time:   [3,4],
      instruments: ['piano','strings','choir','harp'],
      roles:  ['melody','harmony','bass','pad'],
      prog:   [0,5,3,0, 6,3,4,0],
      melStyle:'lyrical', bassStyle:'waltz', harmStyle:'sweep',
    },
    jazz: {
      label: 'Jazz',
      icon: '🎷',
      scale: 'major',
      keys:   { bright:'F', dark:'Bb', epic:'Eb', peaceful:'G' },
      tempos: { slow:80, medium:110, fast:160 },
      time:   [4,4],
      instruments: ['piano','trumpet','bass','drums'],
      roles:  ['melody','harmony','bass','rhythm'],
      prog:   [1,4,0,0, 1,4,0,4],  // ii-V-I
      melStyle:'jazz', bassStyle:'walking', harmStyle:'shell',
    },
    blues: {
      label: 'Blues',
      icon: '🎸',
      scale: 'blues',
      keys:   { bright:'A', dark:'E', epic:'G', peaceful:'D' },
      tempos: { slow:72, medium:96, fast:126 },
      time:   [4,4],
      instruments: ['guitar','bass','drums','organ'],
      roles:  ['melody','bass','rhythm','pad'],
      prog:   [0,0,0,0, 3,3,0,0],  // 12-bar simplified
      melStyle:'blues', bassStyle:'shuffle', harmStyle:'power',
    },
    rock: {
      label: 'Rock',
      icon: '🎸',
      scale: 'pentatonic_min',
      keys:   { bright:'E', dark:'A', epic:'D', peaceful:'G' },
      tempos: { slow:84, medium:116, fast:152 },
      time:   [4,4],
      instruments: ['guitar','bass','drums','guitar'],
      roles:  ['melody','bass','rhythm','harmony'],
      prog:   [0,6,3,4, 0,6,3,4],
      melStyle:'rock', bassStyle:'root_8', harmStyle:'power',
    },
    electronic: {
      label: 'Electronic',
      icon: '🎛',
      scale: 'minor',
      keys:   { bright:'A', dark:'D', epic:'E', peaceful:'C' },
      tempos: { slow:90, medium:128, fast:150 },
      time:   [4,4],
      instruments: ['synth','bass','drums','pad'],
      roles:  ['lead','bass','rhythm','pad'],
      prog:   [0,6,3,4, 0,6,3,7],
      melStyle:'arp', bassStyle:'ostinato', harmStyle:'pad',
    },
  };

  // ── Generate a note sequence ──────────────────────────────────────
  function scaleNote(intervals, rootMidi, degree, octaveOffset = 0) {
    const len = intervals.length;
    const oct = Math.floor(degree / len);
    const idx = ((degree % len) + len) % len;
    return rootMidi + intervals[idx] + oct * 12 + octaveOffset * 12;
  }

  function generateMelody(rand, intervals, rootMidi, bars, bpb, style) {
    const notes = [];
    const totalBeats = bars * bpb;
    let beat = 0, deg = 2;

    const durSets = {
      stepwise: [0.5, 0.5, 1, 1, 0.5],
      running:  [0.25, 0.25, 0.25, 0.5, 0.5],
      dance:    [1, 0.5, 0.5, 1],
      elegant:  [1, 0.5, 0.5, 2, 1],
      lyrical:  [1.5, 0.5, 1, 2],
      jazz:     [0.5, 0.5, 1, 0.5, 0.5],
      blues:    [1, 0.5, 0.5, 1, 1],
      rock:     [0.5, 0.5, 1, 1],
      arp:      [0.25, 0.25, 0.25, 0.25],
    };

    const durs = durSets[style] || durSets.stepwise;

    while (beat < totalBeats) {
      const durOpts = durs;
      let dur = durOpts[Math.floor(rand() * durOpts.length)];
      if (beat + dur > totalBeats) dur = totalBeats - beat;
      if (dur <= 0) break;

      // Step motion with occasional leaps
      const r = rand();
      if (r < 0.05) deg = Math.floor(rand() * 5) + 1; // reset near middle
      else if (r < 0.25) deg += Math.floor(rand() * 3) - 1 + (rand() < 0.4 ? 2 : -2);
      else deg += (rand() < 0.55 ? 1 : -1);

      // Keep in singable range (scale degrees 0-13, roughly 2 octaves)
      if (deg < 0) deg = 1;
      if (deg > 13) deg = 11;

      const pitch = scaleNote(intervals, rootMidi + 12, deg, 0);
      const velocity = 65 + Math.floor(rand() * 30);
      notes.push({ pitch, start: beat, duration: dur * 0.88, velocity });
      beat += dur;
    }
    return notes;
  }

  function generateBass(rand, intervals, rootMidi, bars, bpb, chordRoots, style) {
    const notes = [];

    for (let bar = 0; bar < bars; bar++) {
      const root = chordRoots[bar % chordRoots.length];
      const bassPitch = scaleNote(intervals, rootMidi - 12, root, 0);
      const barStart = bar * bpb;

      if (style === 'walking') {
        // Walking bass: fill every beat
        for (let b = 0; b < bpb; b++) {
          const nextRoot = chordRoots[(bar + (b === bpb - 1 ? 1 : 0)) % chordRoots.length];
          let pitch = bassPitch;
          if (b === bpb - 1) {
            // Approach note to next chord
            const nextPitch = scaleNote(intervals, rootMidi - 12, nextRoot, 0);
            pitch = nextPitch + (rand() < 0.5 ? -1 : 1);
          } else if (b > 0) {
            pitch = bassPitch + Math.floor((rand() < 0.5 ? 1 : -1) * (b % 3 + 1));
          }
          notes.push({ pitch, start: barStart + b, duration: 0.85, velocity: 70 + Math.floor(rand()*15) });
        }
      } else if (style === 'waltz') {
        notes.push({ pitch: bassPitch, start: barStart, duration: 1, velocity: 80 });
        notes.push({ pitch: bassPitch + 7, start: barStart + 1, duration: 0.8, velocity: 55 });
        notes.push({ pitch: bassPitch + 7, start: barStart + 2, duration: 0.8, velocity: 55 });
      } else if (style === 'shuffle' || style === 'root_8') {
        // Eighth notes on root
        for (let b = 0; b < bpb; b++) {
          notes.push({ pitch: bassPitch, start: barStart + b, duration: 0.45, velocity: 72 });
          if (style === 'root_8') {
            notes.push({ pitch: bassPitch + 7, start: barStart + b + 0.5, duration: 0.4, velocity: 65 });
          }
        }
      } else if (style === 'alberti') {
        // Alberti bass: root-5th-3rd-5th
        const fifth = bassPitch + 7;
        const third = bassPitch + (intervals.includes(4) ? 4 : 3);
        const pattern = [bassPitch, fifth, third, fifth];
        pattern.forEach((p, i) => {
          notes.push({ pitch: p, start: barStart + i * (bpb / 4), duration: 0.4, velocity: 58 });
        });
      } else if (style === 'ostinato') {
        for (let b = 0; b < bpb; b++) {
          notes.push({ pitch: bassPitch, start: barStart + b, duration: 0.9, velocity: 78 });
        }
      } else {
        // Root held or half notes
        notes.push({ pitch: bassPitch, start: barStart, duration: bpb * 0.95, velocity: 72 });
      }
    }
    return notes;
  }

  function generateHarmony(rand, intervals, rootMidi, bars, bpb, chordRoots, style) {
    const notes = [];

    for (let bar = 0; bar < bars; bar++) {
      const root = chordRoots[bar % chordRoots.length];
      const barStart = bar * bpb;

      // Build triad on scale degree
      const r = scaleNote(intervals, rootMidi + 12, root, 0);
      const third = scaleNote(intervals, rootMidi + 12, root + 2, 0);
      const fifth = scaleNote(intervals, rootMidi + 12, root + 4, 0);

      if (style === 'alberti') {
        const pattern = [r, fifth, third, fifth];
        pattern.forEach((p, i) => {
          notes.push({ pitch: p, start: barStart + i * 0.5, duration: 0.45, velocity: 52 + Math.floor(rand()*12) });
        });
      } else if (style === 'sweep') {
        // Arpeggiated upward
        for (let b = 0; b < bpb; b += 0.5) {
          const p = [r, third, fifth, third][Math.floor(b / 0.5) % 4];
          notes.push({ pitch: p, start: barStart + b, duration: 0.45, velocity: 48 });
        }
      } else if (style === 'shell') {
        // Jazz shell voicing: 3rd + 7th
        const seventh = scaleNote(intervals, rootMidi + 12, root + 6, 0);
        notes.push({ pitch: third, start: barStart, duration: bpb * 0.95, velocity: 55 });
        notes.push({ pitch: seventh, start: barStart, duration: bpb * 0.95, velocity: 52 });
      } else if (style === 'power') {
        // Power chord (root + 5th)
        notes.push({ pitch: r,    start: barStart, duration: bpb * 0.9, velocity: 75 });
        notes.push({ pitch: fifth, start: barStart, duration: bpb * 0.9, velocity: 68 });
      } else if (style === 'pad') {
        // Whole-bar pad chord
        [r, third, fifth].forEach(p => {
          notes.push({ pitch: p - 12, start: barStart, duration: bpb * 0.97, velocity: 42 });
        });
      } else if (style === 'drone') {
        // Just root + 5th
        notes.push({ pitch: r,    start: barStart, duration: bpb * 0.95, velocity: 45 });
        notes.push({ pitch: fifth, start: barStart, duration: bpb * 0.95, velocity: 40 });
      } else if (style === 'parallel') {
        // Block chord on beats
        [1, bpb > 2 ? 2 : null].filter(Boolean).forEach(beat => {
          [r, third, fifth].forEach(p => {
            notes.push({ pitch: p, start: barStart + beat - 1, duration: 0.9, velocity: 55 });
          });
        });
      } else {
        // Default block chord
        [r, third, fifth].forEach(p => {
          notes.push({ pitch: p, start: barStart, duration: bpb * 0.95, velocity: 52 });
        });
      }
    }
    return notes;
  }

  function generateRhythm(rand, bars, bpb, style) {
    const notes = [];
    for (let bar = 0; bar < bars; bar++) {
      const barStart = bar * bpb;

      if (style === 'jazz' || style === 'blues') {
        // Kick on 1 and 3, snare on 2 and 4
        [0, 2].forEach(b => notes.push({ pitch: 36, start: barStart + b, duration: 0.3, velocity: 80 }));
        [1, 3].forEach(b => notes.push({ pitch: 38, start: barStart + b, duration: 0.2, velocity: 70 }));
        for (let b = 0; b < bpb; b += 0.5) {
          notes.push({ pitch: 42, start: barStart + b, duration: 0.15, velocity: 45 + Math.floor(rand()*20) });
        }
      } else if (style === 'rock') {
        [0, 2.5].forEach(b => notes.push({ pitch: 36, start: barStart + b, duration: 0.3, velocity: 85 }));
        [1, 3].forEach(b => notes.push({ pitch: 38, start: barStart + b, duration: 0.2, velocity: 75 }));
        for (let b = 0; b < bpb; b += 0.5) {
          notes.push({ pitch: 42, start: barStart + b, duration: 0.12, velocity: 50 });
        }
      } else if (style === 'electronic') {
        // Four-on-the-floor
        for (let b = 0; b < bpb; b++) {
          notes.push({ pitch: 36, start: barStart + b, duration: 0.3, velocity: 88 });
        }
        [1, 3].forEach(b => notes.push({ pitch: 38, start: barStart + b, duration: 0.2, velocity: 72 }));
        for (let b = 0; b < bpb; b += 0.5) {
          notes.push({ pitch: 42, start: barStart + b, duration: 0.1, velocity: 40 });
        }
      } else {
        // Simple medieval/renaissance drum
        notes.push({ pitch: 36, start: barStart,     duration: 0.3, velocity: 75 });
        if (bpb >= 3) notes.push({ pitch: 38, start: barStart + Math.floor(bpb/2), duration: 0.2, velocity: 60 });
      }
    }
    return notes;
  }

  // ── Main generate function ────────────────────────────────────────
  function generate(styleKey, mood, speedKey, length, seed) {
    const cfg = STYLES[styleKey];
    if (!cfg) throw new Error('Unknown style');

    const rand = seededRand(seed || Date.now());
    const rootName = cfg.keys[mood] || 'C';
    const rootMidi = noteNameToMidi(rootName, 4);
    const intervals = SCALE_INTERVALS[cfg.scale];
    const tempo = cfg.tempos[speedKey] || cfg.tempos.medium;
    const [bpbNum, bpbDen] = cfg.time;
    const bpb = bpbNum;
    const bars = length === 'short' ? 8 : length === 'long' ? 24 : 16;
    const totalBeats = bars * bpb;

    // Build chord root sequence from progression template
    const rawProg = cfg.prog;
    const chordRoots = [];
    for (let b = 0; b < bars; b++) {
      chordRoots.push(rawProg[b % rawProg.length]);
    }

    // Generate tracks
    const tracks = [];

    // Melody
    tracks.push({
      name: `Melody — ${cfg.instruments[0]}`,
      instrument: cfg.instruments[0],
      volume: 95,
      notes: generateMelody(rand, intervals, rootMidi, bars, bpb, cfg.melStyle),
    });

    // Harmony
    if (cfg.instruments[1] && cfg.roles[1] !== 'bass2') {
      tracks.push({
        name: cfg.instruments[1].charAt(0).toUpperCase() + cfg.instruments[1].slice(1),
        instrument: cfg.instruments[1],
        volume: 72,
        notes: generateHarmony(rand, intervals, rootMidi, bars, bpb, chordRoots, cfg.harmStyle),
      });
    }

    // Bass
    if (cfg.instruments[2]) {
      tracks.push({
        name: `Bass — ${cfg.instruments[2]}`,
        instrument: cfg.instruments[2],
        volume: 80,
        notes: generateBass(rand, intervals, rootMidi, bars, bpb, chordRoots, cfg.bassStyle),
      });
    }

    // Rhythm (if applicable)
    const rhythmStyles = ['jazz','blues','rock','electronic','medieval','renaissance'];
    if (cfg.instruments[3] && rhythmStyles.includes(styleKey)) {
      const rhyStyle = ['jazz','blues'].includes(styleKey) ? 'jazz'
                     : ['rock'].includes(styleKey) ? 'rock'
                     : ['electronic'].includes(styleKey) ? 'electronic'
                     : 'simple';
      tracks.push({
        name: `Drums — ${cfg.instruments[3]}`,
        instrument: cfg.instruments[3],
        volume: 85,
        notes: generateRhythm(rand, bars, bpb, rhyStyle),
      });
    }

    // Build title
    const MOODS = { bright:'Bright', dark:'Dark', epic:'Epic', peaceful:'Peaceful' };
    const SPEEDS = { slow:'Slow', medium:'', fast:'Fast' };
    const speedLabel = SPEEDS[speedKey] ? SPEEDS[speedKey] + ' ' : '';
    const title = `${speedLabel}${MOODS[mood]} ${cfg.label} in ${rootName}`;

    return {
      title,
      tempo,
      timeSignature: cfg.time,
      key: rootName + ' ' + cfg.scale.charAt(0).toUpperCase() + cfg.scale.slice(1).replace('_',' '),
      totalBeats,
      tracks,
    };
  }

  return { generate, STYLES };
})();
