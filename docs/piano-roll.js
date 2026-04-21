// Piano roll canvas renderer
const PianoRoll = (() => {
  const TRACK_COLORS = ['#d4a843','#7c6cf0','#27ae60','#e74c3c','#2eafd4','#e67e22'];
  const BEAT_W = 36;
  const TRACK_H = 52;
  const LABEL_W = 88;

  let rafId = null;
  let playStart = null;

  function roundRect(ctx, x, y, w, h, r) {
    if (w < 1) return;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, Math.max(w, 2), h, r);
    } else {
      ctx.rect(x, y, Math.max(w, 2), h);
    }
  }

  function draw(canvas, arrangement, playheadBeat = -1) {
    if (!arrangement) return;
    const { tracks = [], totalBeats = 32, timeSignature = [4, 4] } = arrangement;
    const beatsPerBar = timeSignature[0] || 4;

    const W = Math.max(canvas.parentElement ? canvas.parentElement.offsetWidth : 320,
                       LABEL_W + totalBeats * BEAT_W);
    const H = tracks.length * TRACK_H + 24;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    // Beat grid
    for (let b = 0; b <= totalBeats; b++) {
      const x = LABEL_W + b * BEAT_W;
      const isBar = b % beatsPerBar === 0;
      ctx.strokeStyle = isBar ? '#2a2520' : '#151210';
      ctx.lineWidth = isBar ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();

      if (isBar && b < totalBeats) {
        ctx.fillStyle = '#3a3028';
        ctx.font = '9px monospace';
        ctx.fillText(String(b / beatsPerBar + 1), x + 3, 10);
      }
    }

    // Tracks
    tracks.forEach((track, ti) => {
      const color = TRACK_COLORS[ti % TRACK_COLORS.length];
      const ty = 16 + ti * TRACK_H;

      // Row background
      ctx.fillStyle = ti % 2 === 0 ? '#111008' : '#0e0d06';
      ctx.fillRect(LABEL_W, ty, W - LABEL_W, TRACK_H - 2);

      // Label background
      ctx.fillStyle = '#18140a';
      ctx.fillRect(0, ty, LABEL_W, TRACK_H - 2);

      // Color bar
      ctx.fillStyle = color;
      ctx.fillRect(0, ty, 3, TRACK_H - 2);

      // Label text
      ctx.fillStyle = color;
      ctx.font = 'bold 10px sans-serif';
      const label = (track.name || track.instrument || 'Track').split('—').pop().trim();
      ctx.fillText(label, 8, ty + TRACK_H / 2 + 4, LABEL_W - 14);

      // Pitch range for this track
      const pitches = (track.notes || []).map(n => n.pitch);
      if (pitches.length === 0) return;
      const minP = Math.min(...pitches) - 3;
      const maxP = Math.max(...pitches) + 3;
      const pRange = Math.max(maxP - minP, 8);
      const noteArea = TRACK_H - 12;

      // Notes
      ctx.fillStyle = color;
      (track.notes || []).forEach(note => {
        const nx = LABEL_W + note.start * BEAT_W;
        const nw = Math.max(2, note.duration * BEAT_W - 2);
        const nh = Math.max(5, noteArea * 0.45);
        const ratio = (note.pitch - minP) / pRange;
        const ny = ty + 4 + (1 - ratio) * (noteArea - nh);
        const alpha = 0.5 + 0.5 * ((note.velocity || 80) / 127);

        ctx.globalAlpha = alpha;
        roundRect(ctx, nx, ny, nw, nh, 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    });

    // Separator line
    ctx.strokeStyle = '#2a2010';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(LABEL_W, 0);
    ctx.lineTo(LABEL_W, H);
    ctx.stroke();

    // Playhead
    if (playheadBeat >= 0) {
      const px = LABEL_W + playheadBeat * BEAT_W;
      ctx.strokeStyle = '#ffdd44';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ffdd44';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  function startPlayhead(canvas, arrangement) {
    stopPlayhead();
    const { totalBeats = 32, tempo = 120 } = arrangement;
    const totalMs = (totalBeats / tempo) * 60 * 1000;
    playStart = performance.now();

    function frame() {
      const elapsed = performance.now() - playStart;
      const beat = Math.min((elapsed / totalMs) * totalBeats, totalBeats);
      draw(canvas, arrangement, beat);
      if (elapsed < totalMs) rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
  }

  function stopPlayhead() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  return { draw, startPlayhead, stopPlayhead, TRACK_COLORS };
})();
