// ── State ────────────────────────────────────────────────────────
const state = {
  style: 'classical',
  mood: 'bright',
  speed: 'medium',
  length: 'medium',
  arrangement: null,
  isPlaying: false,
  toneLoaded: false,
  seed: null,
};

// ── Navigation ───────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + id));
  if (id === 'play') loadTone();
}

// ── Selection helpers ────────────────────────────────────────────
function selectOption(groupId, value, stateKey) {
  document.querySelectorAll(`#${groupId} .opt-btn`).forEach(b => {
    b.classList.toggle('selected', b.dataset.value === value);
  });
  state[stateKey] = value;
}

function bindOptionGroup(groupId, stateKey) {
  document.getElementById(groupId)?.querySelectorAll('.opt-btn').forEach(btn => {
    btn.addEventListener('click', () => selectOption(groupId, btn.dataset.value, stateKey));
  });
}

// ── Generate ─────────────────────────────────────────────────────
function generate(newSeed = true) {
  if (newSeed) state.seed = Date.now() + Math.floor(Math.random() * 9999);
  try {
    state.arrangement = MusicGen.generate(state.style, state.mood, state.speed, state.length, state.seed);
    return true;
  } catch(e) {
    showToast('Generation failed: ' + e.message, 'error');
    return false;
  }
}

function handleGenerate() {
  if (!generate()) return;
  showScreen('play');
  renderPlay();
}

function handleRegenerate() {
  if (!generate()) return;
  renderPlay();
  if (state.isPlaying) {
    Synth.stop();
    PianoRoll.stopPlayhead();
    state.isPlaying = false;
    updatePlayBtn();
  }
}

// ── Play screen ──────────────────────────────────────────────────
function loadTone() {
  if (state.toneLoaded) return;
  const status = document.getElementById('tone-status');
  const btn = document.getElementById('btn-play');
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/tone/14.7.77/Tone.js';
  s.onload = () => {
    state.toneLoaded = true;
    if (status) status.textContent = 'Ready';
    if (btn) btn.disabled = false;
  };
  s.onerror = () => { if (status) status.textContent = 'Audio load failed — check internet'; };
  document.head.appendChild(s);
}

function renderPlay() {
  const arr = state.arrangement;
  if (!arr) return;

  document.getElementById('song-title').textContent = arr.title || 'Untitled';
  document.getElementById('song-key').textContent = arr.key?.split(' ')[0] || '?';
  document.getElementById('song-bpm').textContent = arr.tempo;
  document.getElementById('song-time').textContent = arr.timeSignature.join('/');
  const totalSecs = Math.round((arr.totalBeats / arr.tempo) * 60);
  const m = Math.floor(totalSecs / 60), s = totalSecs % 60;
  document.getElementById('song-len').textContent = (m > 0 ? m + 'm ' : '') + s + 's';

  // Track list
  const list = document.getElementById('track-list');
  list.innerHTML = '';
  arr.tracks.forEach((t, i) => {
    const color = PianoRoll.TRACK_COLORS[i % PianoRoll.TRACK_COLORS.length];
    const row = document.createElement('div');
    row.className = 'track-row';
    row.innerHTML = `<span class="track-dot" style="background:${color}"></span>
      <span class="track-name">${t.name}</span>
      <span class="dim-text">${t.notes.length} notes</span>`;
    list.appendChild(row);
  });

  PianoRoll.draw(document.getElementById('piano-roll'), arr);
  updatePlayBtn();
}

function updatePlayBtn() {
  const btn = document.getElementById('btn-play');
  if (!btn) return;
  btn.querySelector('.play-icon').textContent = state.isPlaying ? '⏹' : '▶';
  btn.querySelector('.play-label').textContent = state.isPlaying ? 'STOP' : 'PLAY';
  btn.classList.toggle('playing', state.isPlaying);
}

function togglePlay() {
  if (!state.toneLoaded) { showToast('Audio engine still loading…'); return; }
  if (state.isPlaying) {
    Synth.stop();
    PianoRoll.stopPlayhead();
    state.isPlaying = false;
    PianoRoll.draw(document.getElementById('piano-roll'), state.arrangement);
  } else {
    state.isPlaying = true;
    PianoRoll.startPlayhead(document.getElementById('piano-roll'), state.arrangement);
    Synth.play(state.arrangement, () => {
      state.isPlaying = false;
      PianoRoll.stopPlayhead();
      PianoRoll.draw(document.getElementById('piano-roll'), state.arrangement);
      updatePlayBtn();
    });
  }
  updatePlayBtn();
}

// ── Toast ─────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Build style grid ──────────────────────────────────────────────
function buildStyleGrid() {
  const grid = document.getElementById('style-grid');
  Object.entries(MusicGen.STYLES).forEach(([key, cfg]) => {
    const btn = document.createElement('button');
    btn.className = 'style-card opt-btn' + (key === state.style ? ' selected' : '');
    btn.dataset.value = key;
    btn.innerHTML = `<span class="style-icon">${cfg.icon}</span><span class="style-label">${cfg.label}</span>`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('#style-grid .opt-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.style = key;
    });
    grid.appendChild(btn);
  });
}

// ── Init ──────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  buildStyleGrid();
  bindOptionGroup('mood-group', 'mood');
  bindOptionGroup('speed-group', 'speed');
  bindOptionGroup('length-group', 'length');

  // Set initial selections
  selectOption('mood-group', state.mood, 'mood');
  selectOption('speed-group', state.speed, 'speed');
  selectOption('length-group', state.length, 'length');

  document.getElementById('btn-begin').addEventListener('click', () => showScreen('create'));
  document.getElementById('btn-back-home').addEventListener('click', () => showScreen('home'));
  document.getElementById('btn-generate').addEventListener('click', handleGenerate);
  document.getElementById('btn-back-create').addEventListener('click', () => showScreen('create'));
  document.getElementById('btn-play').addEventListener('click', togglePlay);
  document.getElementById('btn-regenerate').addEventListener('click', handleRegenerate);
  document.getElementById('btn-new-song').addEventListener('click', () => {
    Synth.stop(); PianoRoll.stopPlayhead(); state.isPlaying = false;
    showScreen('create');
  });
});
