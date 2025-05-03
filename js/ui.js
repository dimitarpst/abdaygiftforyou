// js/ui.js  ───────────────────────────────────────────────
// Builds all UI nodes (old + new) once, exports references
// + tiny helpers so the other modules never touch the DOM.

/* ---------- grab the original elements ---------- */
const loginBtn   = document.getElementById('login-button');
const loginArea  = document.getElementById('login-area');
const authError  = document.getElementById('auth-error');
const authStatus = document.getElementById('auth-status');

const startBtn   = document.getElementById('start-button');
const ssArea     = document.getElementById('slideshow-area');
const ssImage    = document.getElementById('slideshow-image');
const statusTxt  = document.getElementById('status-indicator');
const finalMsg   = document.getElementById('final-reveal');
const mainTitle  = document.getElementById('main-title');

const prevBtn    = document.getElementById('prev-button');
const ppBtn      = document.getElementById('play-pause-button');
const ppIcon     = ppBtn.querySelector('i');
const nextBtn    = document.getElementById('next-button');

/* ---------- create NEW elements (progress, volume, info) ---------- */
const playerControls = document.getElementById('player-controls');

/* Progress / seek bar + time labels */
const progressWrap = document.createElement('div');
progressWrap.id = 'progress-container';
progressWrap.className = 'flex items-center justify-center space-x-2 mt-3';

const currentTime = document.createElement('span');
currentTime.id = 'current-time';
currentTime.className = 'text-sm text-gray-700 w-12 text-right';
currentTime.textContent = '0:00';

const seekBar = document.createElement('input');
seekBar.id   = 'seek-bar';
seekBar.type = 'range';
seekBar.min  = 0;
seekBar.max  = 100;
seekBar.value = 0;
seekBar.step  = 1000;                     // 1 s
seekBar.className = 'flex-1 h-2 accent-purple-600 rounded-lg';

const totalDuration = document.createElement('span');
totalDuration.id = 'total-duration';
totalDuration.className = 'text-sm text-gray-700 w-12 text-left';
totalDuration.textContent = '0:00';

progressWrap.append(currentTime, seekBar, totalDuration);
playerControls.parentNode.insertBefore(progressWrap, playerControls.nextSibling);

/* Volume slider */
const volumeWrap = document.createElement('div');
volumeWrap.id = 'volume-container';
volumeWrap.className = 'flex items-center justify-center space-x-2 mt-3';

const volLow = document.createElement('i');
volLow.className = 'fas fa-volume-down text-gray-600';

const volumeSlider = document.createElement('input');
volumeSlider.id   = 'volume-slider';
volumeSlider.type = 'range';
volumeSlider.min  = 0;
volumeSlider.max  = 100;
volumeSlider.value = 50;
volumeSlider.className = 'w-32 h-2 accent-purple-600 rounded-lg';

const volHigh = document.createElement('i');
volHigh.className = 'fas fa-volume-up text-gray-600';

volumeWrap.append(volLow, volumeSlider, volHigh);
progressWrap.parentNode.insertBefore(volumeWrap, progressWrap.nextSibling);

/* Track title + artist label */
const trackInfo = document.createElement('p');
trackInfo.id = 'track-info';
trackInfo.className = 'mt-4 text-sm font-medium text-gray-800';
volumeWrap.parentNode.insertBefore(trackInfo, volumeWrap.nextSibling);


/* ---------- export every element ---------- */
export const els = {
  /* old */
  loginBtn, loginArea, authError, authStatus,
  startBtn, ssArea, ssImage, statusTxt, finalMsg, mainTitle,
  prevBtn, ppBtn, ppIcon, nextBtn,
  /* new */
  seekBar, volumeSlider, currentTime, totalDuration, trackInfo
};

/* ---------- tiny reusable helpers ---------- */
export function enablePlayerControls ()  {
  els.prevBtn.disabled = els.nextBtn.disabled = els.ppBtn.disabled = false;
}
export function disablePlayerControls () {
  els.prevBtn.disabled = els.nextBtn.disabled = els.ppBtn.disabled = true;
  updatePlayPauseIcon(false);
}

/** Swap play / pause icon */
export function updatePlayPauseIcon (isPlaying) {
  const { ppIcon, ppBtn } = els;
  ppIcon.classList.toggle('fa-play',  !isPlaying);
  ppIcon.classList.toggle('fa-pause',  isPlaying);
  ppBtn.title = isPlaying ? 'Pause' : 'Play';
}

/* ---------- new helpers for the extras ---------- */
const fmt = ms => {
  const t = Math.floor(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};
export function setSeekBarMax (durMs = 0)               { els.seekBar.max = durMs; }
export function updateSeekBar (posMs = 0)               { els.seekBar.value = posMs; }
export function updateTimeLabels (posMs = 0, durMs = 0) {
  els.currentTime.textContent  = fmt(posMs);
  els.totalDuration.textContent = fmt(durMs);
}
export function updateTrackInfo (name = '', artists = []) {
  const artistLine = Array.isArray(artists) ? artists.join(', ') : artists;
  els.trackInfo.textContent = name ? `${name} — ${artistLine}` : '';
}
