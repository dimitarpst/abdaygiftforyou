// js/slideshow.js  ──────────────────────────────────────────
// Skeleton image loader ✔  +  cross-fade volume/opacity ✔

import { els, disablePlayerControls, enablePlayerControls } from './ui.js';
import { playlistData } from './config.js';
import { state as sdkState } from './player.js';
import { getValidStoredToken } from './auth.js';
import { startFinalSequence } from './finalReveal.js';

export let slideshowActive   = false;
export let currentTrackIndex = 0;

/* ---------------------------------------------------------- */
export function syncIndexFromTrackUri(uri) {
  const i = playlistData.findIndex(p => p.trackUri === uri);
  if (i !== -1) currentTrackIndex = i;
}

/* ---------------- helpers ---------------- */
const wait = ms => new Promise(res => setTimeout(res, ms));

async function rampVolume(to, duration = 300) { // Removed default value for 'to'
  if (!sdkState.spotifyPlayer) return;
  const from = await sdkState.spotifyPlayer.getVolume();
  const step = 20;
  const steps = Math.max(1, Math.round(duration / step));
  for (let i = 1; i <= steps; i++) {
    // Calculate volume ensuring it doesn't exceed 1 or go below 0
    let v = from + (to - from) * (i / steps);
    v = Math.max(0, Math.min(1, v)); // Clamp volume between 0 and 1
    sdkState.spotifyPlayer.setVolume(v);
    await wait(step);
  }
  // Ensure final volume is set precisely
  sdkState.spotifyPlayer.setVolume(Math.max(0, Math.min(1, to)));
}

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.onload  = () => resolve(img);
    img.onerror = reject;
  });
}

/**
 * Fade-out current image, skeleton-load the next, then fade-in.
 */
export async function showSlide(url) {
  // console.log('🖼️ showSlide → url:', url, 'currentTrackIndex:', currentTrackIndex);
  if (!url) return;

  const img = els.ssImage;
  img.classList.add('image-fade-out');
  await wait(150);                        // tiny opacity dip while we load
  img.classList.remove('image-fade-out');

  /* skeleton shimmer ON */
  img.classList.add('skeleton');
  img.classList.remove('loaded');

  await preloadImage(url);                // fetch & decode

  img.src = url;
  img.alt = `Birthday Slide ${currentTrackIndex + 1}`;

  /* skeleton shimmer OFF + fade in */
  img.classList.remove('skeleton');
  img.classList.add('loaded', 'image-fade-in');
  await wait(300);
  img.classList.remove('image-fade-in');
}

/* ---------------- Spotify Web-API playback ---------------- */
export function playCurrentTrack(accessToken) {
  if (!sdkState.spotifyPlayer || !sdkState.deviceId) {
    return;
  }

  const item = playlistData[currentTrackIndex];
  if (!item) {
    revealFinalMessage();
    return;
  }

  fetch(`https://api.spotify.com/v1/me/player/play?device_id=${sdkState.deviceId}`, {
    method : 'PUT',
    headers: { 'Content-Type': 'application/json',
               'Authorization': `Bearer ${accessToken}` },
    body   : JSON.stringify({ uris: [item.trackUri] })
  })
    .then(r => {
      if (!r.ok) throw new Error('Playback error');
      slideshowActive = true;
      enablePlayerControls();
    })
    .catch(e => {
      slideshowActive = false;
      disablePlayerControls();
    });
 
}

/* ----------- ← / → navigation with cross-fade ---------- */
export async function nextSlide(accessToken = getValidStoredToken()) {
  if (currentTrackIndex >= playlistData.length - 1) {
    revealFinalMessage();
    return;
  }

  await rampVolume(0, 300);           // volume OUT
  currentTrackIndex++;
  await showSlide(playlistData[currentTrackIndex].imageUrl);
  playCurrentTrack(accessToken);
const currentVolume = els.volumeSlider.value / 100;
await rampVolume(currentVolume, 300); // volume IN to slider level
}

export async function prevSlide(accessToken = getValidStoredToken()) {
  if (currentTrackIndex === 0) {
    sdkState.spotifyPlayer.seek(0);
    return;
  }

  await rampVolume(0, 300);
  currentTrackIndex--;
  await showSlide(playlistData[currentTrackIndex].imageUrl);
  playCurrentTrack(accessToken);
  const currentVolume = els.volumeSlider.value / 100;
  await rampVolume(currentVolume, 300); // volume IN to slider level
}

/* -------------- entry + finale -------------- */
export function startSlideshow(accessToken) {
  document.querySelector('#slideshow-area .relative')?.classList.remove('hidden');
  els.startBtn.classList.add('hidden');
  els.ssArea.classList.remove('hidden');
  els.mainTitle.textContent = 'Listen & Watch…';

  currentTrackIndex = 0;
  showSlide(playlistData[0].imageUrl);
  sdkState.spotifyPlayer.seek(0);
  const initialVolume = els.volumeSlider.value / 100;
  sdkState.spotifyPlayer.setVolume(initialVolume);
  playCurrentTrack(accessToken);
}

export function revealFinalMessage () {
  startFinalSequence(getValidStoredToken());
}
