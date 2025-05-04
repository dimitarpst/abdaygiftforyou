// js/player.js  ──────────────────────────────────────────────
// Updated to display Spotify album art instead of placeholder images.

import {
  els,
  enablePlayerControls,
  disablePlayerControls,
  updatePlayPauseIcon,
  updateSeekBar,
  updateTimeLabels,
  setSeekBarMax,
  updateTrackInfo
} from './ui.js';

import { getValidStoredToken, clearTokenInfo } from './auth.js';
import { playlistData } from './config.js';
import {
  showSlide,
  revealFinalMessage,
  nextSlide,
  syncIndexFromTrackUri
} from './slideshow.js';
import {
  initEqualizer,
  setEqualizerPlaying
} from './equalizer.js';

export const state = { spotifyPlayer: null, deviceId: null, isPlaying: false };
let prevSnapshot = null;
let lastHandledUri = null;
let progressTimer = null;

/* ---------- progress timer ---------- */
function startProgressTimer() {
  if (progressTimer) return;
  progressTimer = setInterval(async () => {
    if (!state.spotifyPlayer) return;
    const s = await state.spotifyPlayer.getCurrentState();
    if (!s) return;
    updateSeekBar(s.position);
    updateTimeLabels(s.position, s.duration);
  }, 1000);
}
function stopProgressTimer() {
  clearInterval(progressTimer);
  progressTimer = null;
}

/* ---------------------------------------------------------- */
export function initPlayer() {
  if (!window.Spotify?.Player) {
    return;
  }

  state.spotifyPlayer?.disconnect();

  state.spotifyPlayer = new Spotify.Player({
    name: 'Birthday Slideshow Player (PKCE)',
    getOAuthToken: cb => {
      const token = getValidStoredToken();
      if (token) {
        cb(token);
      } 
    },
    volume: 0.5
  });

  state.spotifyPlayer.addListener('ready', ({ device_id }) => {
    state.deviceId = device_id;
    enablePlayerControls();
    els.loginArea.classList.add('hidden');
    els.startBtn.classList.remove('hidden');

    initEqualizer();
    state.spotifyPlayer.getVolume().then(v => {
      els.volumeSlider.value = Math.round(v * 100);
    });
  });

  state.spotifyPlayer.addListener('not_ready', () => {
    state.deviceId = null;
    disablePlayerControls();
  });

  state.spotifyPlayer.addListener('player_state_changed', onPlayerStateChanged);
  state.spotifyPlayer.addListener('initialization_error', ({ message }) => {
    disablePlayerControls();
  });
  state.spotifyPlayer.addListener('authentication_error', ({ message }) => {
    clearTokenInfo();
    disablePlayerControls();
  });

  els.seekBar.addEventListener('input', e => updateTimeLabels(+e.target.value, +els.seekBar.max));
  els.seekBar.addEventListener('change', e => state.spotifyPlayer.seek(+e.target.value));
  els.volumeSlider.addEventListener('input', e => state.spotifyPlayer.setVolume(+e.target.value / 100));

  state.spotifyPlayer.connect();
}

export function togglePlay() {
  state.spotifyPlayer?.togglePlay();
}

/* ---------------------------------------------------------- */
async function onPlayerStateChanged(s) {



  // 1. Handle No State (Player disconnected, etc.)
  if (!s) {
    // console.log("Player state is null.");
    state.isPlaying = false;
    updatePlayPauseIcon(false);
    setEqualizerPlaying(false);
    stopProgressTimer();
    // Optionally reset background to default here if needed
    // document.body.style.backgroundImage = `linear-gradient(to bottom right, #fecdd3, #e9d5ff)`;
    return;
  }

  // 2. Update Core Playback State (Play/Pause, Timer)
  const wasPlaying = state.isPlaying;
  state.isPlaying = !s.paused;

  if (state.isPlaying !== wasPlaying) {
    //  console.log(state.isPlaying ? "Playback started." : "Playback paused.");
     updatePlayPauseIcon(state.isPlaying);
     setEqualizerPlaying(state.isPlaying);
  }

  if (state.isPlaying) {
      startProgressTimer();
  } else {
      stopProgressTimer();
  }

  // 3. Get Current Track Info
  const currentTrack = s.track_window?.current_track;
  const nowUri = currentTrack?.uri ?? '';
  const nowName = currentTrack?.name ?? '';
  const albumImages = currentTrack?.album?.images ?? [];

  if (!currentTrack) {
      // console.log("No current track data in state.");
      // Optionally clear track info, reset background
      updateTrackInfo('', []);
      // document.body.style.backgroundImage = `linear-gradient(to bottom right, #fecdd3, #e9d5ff)`;
      prevSnapshot = s; // Still update snapshot
      return; // Nothing more to do if there's no track
  }



  // 4. Check if Track Changed and if it's in our Playlist
  const spotifyId = nowUri.split(':').pop();          
  const idx = playlistData.findIndex(p =>
    p.trackUri.endsWith(spotifyId)
  );
  const newTrack = !prevSnapshot || nowUri !== prevSnapshot.track_window?.current_track?.uri;
  // 5. Handle New Track Logic (Slideshow Image, Background Colors)
  // console.log(
  //   '%c🔍 Debug track', 'color: magenta; font-weight: bold;',
  //   { nowUri, idx, newTrack }
  // );
  if (idx !== -1 && newTrack) {
    // console.log(`LALA New track detected (Index ${idx}): ${nowName}`);

    const albumArtUrl = albumImages.length ? albumImages[0].url : playlistData[idx].imageUrl; // Prefer largest image, fallback to stored one
    // console.log(`Track ${idx} (“${nowName}”) → albumImages:`, albumImages);
    // console.log(`… selected albumArtUrl:`, albumArtUrl);

    if (albumArtUrl) {
        // Update stored image URL and show slide (as before)
        playlistData[idx].imageUrl = albumArtUrl;
        const artistList = currentTrack.artists.map(a => a.name);   // <— make the array first
        playlistData[idx].trackName   = nowName;
        playlistData[idx].trackArtist = artistList.join(', ');

        showSlide(albumArtUrl);

        // --- Background Color Extraction ---
        // console.log("Attempting to extract colors from:", albumArtUrl);
        try {
            // Make sure ColorThief is loaded (e.g., via CDN script)
            const colorThief = new ColorThief();
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // Crucial for CORS

            img.onload = () => {
                // console.log("Image loaded for color extraction.");
                try {
                    const dominantColor = colorThief.getColor(img);
                    const palette = colorThief.getPalette(img, 2); // Get 2 main colors
                    const color1 = `rgb(${dominantColor.join(',')})`;
                    // Use second palette color if available, otherwise a modified dominant
                    const color2 = palette[1] ? `rgb(${palette[1].join(',')})` : `rgba(${dominantColor.join(',')}, 0.7)`;

                    // console.log(`Applying background gradient: ${color1}, ${color2}`);
                    // Apply gradient to body (ensure CSS transition is set on body)

                    function mixColors(hex1, hex2) {
                      const rgb1 = hexToRgb(hex1);
                      const rgb2 = hexToRgb(hex2);
                      const avg = {
                        r: Math.round((rgb1.r + rgb2.r) / 2),
                        g: Math.round((rgb1.g + rgb2.g) / 2),
                        b: Math.round((rgb1.b + rgb2.b) / 2)
                      };
                      return `rgb(${avg.r}, ${avg.g}, ${avg.b})`;
                    }
                    
                    function hexToRgb(hex) {
                      const raw = hex.replace('#', '');
                      const bigint = parseInt(raw, 16);
                      return {
                        r: (bigint >> 16) & 255,
                        g: (bigint >> 8) & 255,
                        b: bigint & 255
                      };
                    }
                    
                    document.body.style.backgroundImage = `linear-gradient(to bottom right, ${color1}, ${color2})`;
                    document.documentElement.style.setProperty('--accent', color1);
                    document.documentElement.style.setProperty('--accent-secondary', color2);
                    document.documentElement.style.setProperty('--accent-tertiary', mixColors(color1, color2));
                    
                } catch (e) {
                    console.error('ColorThief extraction error:', e);
                    // Fallback gradient on extraction error
                    document.body.style.backgroundImage = `linear-gradient(to bottom right, #fecdd3, #e9d5ff)`; // Pink -> Purple
                }
            };
            img.onerror = (e) => {
                 console.error('Error loading image for color extraction:', albumArtUrl, e);
                 // Fallback gradient on image load error
                 document.body.style.backgroundImage = `linear-gradient(to bottom right, #c4b5fd, #a5b4fc)`; // Violet -> Indigo
            };
            img.src = albumArtUrl; // Start loading the image

        } catch (e) {
            console.error("ColorThief library error (is it loaded?):", e);
             // Fallback gradient if ColorThief itself fails
             document.body.style.backgroundImage = `linear-gradient(to bottom right, #a5b4fc, #fbcfe8)`; // Indigo -> Pink
        }
        // --- End Background Color Extraction ---

    } else {
      // console.log("No album art URL found for this track.");
      // Fallback if no album art URL exists
      showSlide(null); // Or a default image?
      document.body.style.backgroundImage = `linear-gradient(to bottom right, #e2e8f0, #cbd5e1)`; // Gray fallback
    }
  } // End of newTrack logic

  // 6. Update UI Elements if Track is in Playlist (Seek Bar, Time, Info)
  // (This logic remains inside the check for idx !== -1 as per original code)
  if (idx !== -1) {
      // Sync slideshow index regardless of whether it's a 'newTrack' event
      // This handles cases where playback starts mid-song on a known track
      if (typeof syncIndexFromTrackUri === 'function') {
           syncIndexFromTrackUri(nowUri);
      }
      const dur = currentTrack.duration_ms;
      setSeekBarMax(dur);
      updateSeekBar(s.position); // Update position based on current state 's'
      updateTimeLabels(s.position, dur); // Update time labels based on 's'
      const artists = currentTrack.artists.map(a => a.name);
      updateTrackInfo(nowName, artists);
  } else if (nowUri){ // If track URI exists but not in our list
      // console.log(`Track ${nowName} (${nowUri}) not found in playlistData.`);
      // Optionally clear specific UI elements if track isn't managed by slideshow
      updateTrackInfo(nowName, s.track_window?.current_track?.artists.map(a => a.name) ?? []); // Show info anyway?
      setSeekBarMax(s.track_window?.current_track?.duration_ms ?? 0);
      updateSeekBar(s.position);
      updateTimeLabels(s.position, s.track_window?.current_track?.duration_ms ?? 0);
  }

  // 7. Check if Track Finished Naturally to Auto-Advance
  // Ensure position is exactly 0 and it was previously playing
  const trackJustFinished =
    prevSnapshot &&                   // Need previous state
    !prevSnapshot.paused &&           // Was playing before
    s.paused &&                       // Is paused now
    s.position === 0 &&               // Position is at the start
    nowUri === prevSnapshot.track_window?.current_track?.uri &&
    nowUri !== lastHandledUri;

  if (trackJustFinished) {
    // console.log(`Track finished: ${nowName}`);
    lastHandledUri = nowUri;
    if (idx === playlistData.length - 1) {
      // console.log("Last track finished, revealing final message.");
      revealFinalMessage();
    } else if (idx !== -1) { // Only advance if the finished track was in our playlist
      // console.log("Advancing to next slide.");
      // Use setTimeout to avoid potential race conditions with SDK state updates
      setTimeout(() => nextSlide(), 100); // Small delay before advancing
    }
  } else {
      // If not finished, clear lastHandledUri if the track changed
      if (newTrack) {
          lastHandledUri = null;
      }
  }

  // 8. Store Current State for Next Comparison
  prevSnapshot = s;
}


