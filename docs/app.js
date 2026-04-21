const PRESETS = [
  { era: 'Ancient & Medieval', items: [
    'Gregorian chant with choir, slow and ethereal, 4/4',
    'Medieval ballad with lute and flute, slow waltz in 3/4',
    'Celtic jig with harp and flute, fast and lively',
  ]},
  { era: 'Renaissance (1400–1600)', items: [
    'Renaissance dance with lute, recorder and viol, bright and lively',
    'Madrigal with choir and strings, gentle four-part harmony',
  ]},
  { era: 'Baroque (1600–1750)', items: [
    'Bach-style fugue with harpsichord and organ, complex counterpoint',
    'Baroque violin concerto with strings and harpsichord, fast and ornate',
  ]},
  { era: 'Classical (1750–1820)', items: [
    'Mozart-style piano sonata, elegant and bright, 4/4',
    'Classical string quartet, Haydn style, playful and structured',
  ]},
  { era: 'Romantic (1820–1900)', items: [
    'Chopin nocturne for solo piano, slow and deeply emotional',
    'Romantic orchestral piece with strings, brass and choir, epic and sweeping',
  ]},
  { era: 'Jazz & Blues (1900–1960)', items: [
    '1920s jazz with piano, trumpet and upright bass, swing rhythm',
    '12-bar blues with guitar, harmonica and drums, slow and soulful',
  ]},
  { era: 'Rock & Pop (1950s–1990s)', items: [
    'Classic rock with electric guitar, bass and drums, driving 4/4',
    '1980s synth-pop with synthesizers, drum machine and bass',
  ]},
  { era: 'Electronic & Modern', items: [
    'Electronic dance music with synth leads, bass and kick drum, 128 BPM',
    'Lo-fi hip hop with piano, bass and soft brushed drums, slow and chill',
  ]},
];

// ── State ──────────────────────────────────────────────
const state = {
  apiKey: localStorage.getItem('bardai_key') || '',
  melody: [],
  arrangement: null,
  isRecording: false,
  isPlaying: false,
  toneLoaded: false,
};

// ── Navigation ──────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.toggle('active', s.id === 'screen-' + id);
  });
  if (id === 'play') loadTone();
}

// ── Settings ────────────────────────────────────────────
function openSettings() {
  document.getElementById('key-input').value = state.apiKey;
  document.getElementById('modal-settings').classList.remove('hidden');
}
function closeSettings() {
  document.getElementById('modal-settings').classList.add('hidden');
}
function saveKey() {
  const k = document.getElementById('key-input').value.trim();
  if (k && !k.startsWith('sk-ant-')) {
    showToast('Key should start with sk-ant-', 'error'); return;
  }
  state.apiKey = k;
  localStorage.setItem('bardai_key', k);
  closeSettings();
  updateKeyStatus();
  showToast('API key saved');
}
function updateKeyStatus() {
  const dot = document.getElementById('key-dot');
  const txt = document.getElementById('key-txt');
  if (state.apiKey) {
    dot.className = 'dot dot-on'; txt.textContent = 'AI connected';
  } else {
    dot.className = 'dot dot-off'; txt.textContent = 'No API key — tap gear to add';
  }
}

// ── Recording ───────────────────────────────────────────
function startRecording() {
  if (state.isRecording) return;
  state.isRecording = true;

  const btn = document.getElementById('btn-record');
  const liveNote = document.getElementById('live-note');
  const pulse = document.getElementById('pulse-ring');

  btn.textContent = 'TAP TO STOP';
  btn.classList.add('recording');
  pulse.classList.add('active');
  liveNote.textContent = '—';
  document.getElementById('detected-notes').innerHTML = '';

  Pitch.start((midi, name) => {
    liveNote.textContent = name || '—';
    liveNote.style.color = name ? '#d4a843' : '#555';
  }).catch(err => {
    state.isRecording = false;
    btn.textContent = 'TAP TO SING';
    btn.classList.remove('recording');
    pulse.classList.remove('active');
    showToast('Microphone error: ' + err.message, 'error');
  });
}

function stopRecording() {
  if (!state.isRecording) return;
  state.isRecording = false;

  const btn = document.getElementById('btn-record');
  const pulse = document.getElementById('pulse-ring');
  btn.textContent = 'TAP TO SING';
  btn.classList.remove('recording');
  pulse.classList.remove('active');
  document.getElementById('live-note').textContent = '—';

  state.melody = Pitch.stop();

  const box = document.getElementById('detected-notes');
  if (state.melody.length === 0) {
    box.innerHTML = '<p class="dim-text">No notes detected. Try singing louder and closer to your device.</p>';
    document.getElementById('btn-to-describe').disabled = true;
  } else {
    const unique = state.melody.filter((n, i) =>
      i === 0 || n.pitch !== state.melody[i-1].pitch
    );
    const chips = unique.slice(0, 24).map(n =>
      `<span class="note-chip">${Pitch.midiName(n.pitch)}</span>`
    ).join('');
    box.innerHTML = `<p class="dim-text">${state.melody.length} notes detected</p><div class="note-chips">${chips}${unique.length > 24 ? '<span class="dim-text">…</span>' : ''}</div>`;
    document.getElementById('btn-to-describe').disabled = false;
  }
}

function toggleRecord() {
  if (state.isRecording) stopRecording();
  else startRecording();
}

// ── Describe / Compose ──────────────────────────────────
function buildPresets() {
  const container = document.getElementById('presets-list');
  container.innerHTML = '';
  PRESETS.forEach(group => {
    const era = document.createElement('div');
    era.className = 'era-group';
    era.innerHTML = `<div class="era-label">${group.era}</div>`;
    group.items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.textContent = item;
      btn.onclick = () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('style-input').value = item;
      };
      era.appendChild(btn);
    });
    container.appendChild(era);
  });
}

async function compose() {
  const style = document.getElementById('style-input').value.trim();
  if (!style) { showToast('Describe the style first', 'error'); return; }

  showLoading('Composing your arrangement...');
  try {
    state.arrangement = await API.compose(state.apiKey, state.melody, style);
    hideLoading();
    showScreen('play');
    renderPlay();
  } catch(err) {
    hideLoading();
    showToast(err.message, 'error');
  }
}

// ── Play ────────────────────────────────────────────────
function loadTone() {
  if (state.toneLoaded || document.getElementById('tone-status').textContent !== 'Loading audio...') return;
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/tone/14.7.77/Tone.js';
  s.onload = () => {
    state.toneLoaded = true;
    document.getElementById('tone-status').textContent = 'Ready';
    document.getElementById('btn-play').disabled = false;
  };
  s.onerror = () => {
    document.getElementById('tone-status').textContent = 'Audio failed to load — check internet';
  };
  document.head.appendChild(s);
}

function renderPlay() {
  const arr = state.arrangement;
  if (!arr) return;

  document.getElementById('song-title').textContent = arr.title || 'Untitled';
  document.getElementById('song-key').textContent = arr.key || '?';
  document.getElementById('song-bpm').textContent = arr.tempo || 120;
  document.getElementById('song-time').textContent = (arr.timeSignature || [4,4]).join('/');

  const mins = Math.floor((arr.totalBeats / arr.tempo) * 60 / 60);
  const secs = Math.round((arr.totalBeats / arr.tempo) * 60) % 60;
  document.getElementById('song-len').textContent =
    (mins > 0 ? mins + 'm ' : '') + secs + 's';

  // Track list
  const trackList = document.getElementById('track-list');
  trackList.innerHTML = '';
  (arr.tracks || []).forEach((t, i) => {
    const color = PianoRoll.TRACK_COLORS[i % PianoRoll.TRACK_COLORS.length];
    const row = document.createElement('div');
    row.className = 'track-row';
    row.innerHTML = `
      <span class="track-dot" style="background:${color}"></span>
      <span class="track-name">${t.name || t.instrument || 'Track ' + (i+1)}</span>
      <span class="track-notes dim-text">${(t.notes||[]).length} notes</span>`;
    trackList.appendChild(row);
  });

  // Draw piano roll
  const canvas = document.getElementById('piano-roll');
  PianoRoll.draw(canvas, arr);

  document.getElementById('btn-play').textContent = 'PLAY';
  state.isPlaying = false;
}

function togglePlay() {
  if (!state.toneLoaded) { showToast('Audio engine still loading...'); return; }
  const btn = document.getElementById('btn-play');
  if (state.isPlaying) {
    Synth.stop();
    PianoRoll.stopPlayhead();
    state.isPlaying = false;
    btn.textContent = 'PLAY';
    btn.classList.remove('playing');
    PianoRoll.draw(document.getElementById('piano-roll'), state.arrangement);
  } else {
    state.isPlaying = true;
    btn.textContent = 'STOP';
    btn.classList.add('playing');
    const canvas = document.getElementById('piano-roll');
    PianoRoll.startPlayhead(canvas, state.arrangement);
    Synth.play(state.arrangement, () => {
      state.isPlaying = false;
      btn.textContent = 'PLAY';
      btn.classList.remove('playing');
      PianoRoll.stopPlayhead();
      PianoRoll.draw(canvas, state.arrangement);
    });
  }
}

// ── Toast ────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Loading overlay ──────────────────────────────────────
function showLoading(msg) {
  document.getElementById('loading-text').textContent = msg;
  document.getElementById('loading-overlay').classList.remove('hidden');
}
function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}

// ── Init ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  updateKeyStatus();
  buildPresets();

  // Wire up events
  document.getElementById('btn-settings').onclick = openSettings;
  document.getElementById('btn-settings-2').onclick = openSettings;
  document.getElementById('btn-close-settings').onclick = closeSettings;
  document.getElementById('modal-settings').onclick = e => { if (e.target === e.currentTarget) closeSettings(); };
  document.getElementById('btn-save-key').onclick = saveKey;

  document.getElementById('btn-begin').onclick = () => showScreen('record');
  document.getElementById('btn-record').onclick = toggleRecord;
  document.getElementById('btn-back-home').onclick = () => { stopRecording(); showScreen('home'); };
  document.getElementById('btn-to-describe').onclick = () => showScreen('describe');

  document.getElementById('btn-back-record').onclick = () => showScreen('record');
  document.getElementById('btn-compose').onclick = compose;

  document.getElementById('btn-back-describe').onclick = () => showScreen('describe');
  document.getElementById('btn-play').onclick = togglePlay;
  document.getElementById('btn-new-song').onclick = () => {
    Synth.stop(); PianoRoll.stopPlayhead(); state.isPlaying = false;
    showScreen('home');
  };
});
