// js/finalReveal.js
// ──────────────────────────────────────────────────────────────
// Final reveal: track list fade-in, then "HAPPY BIRTHDAY" squares
// in two rows, followed by a "MY LOVE" banner.

import { playlistData }          from './config.js'; // Needs 13 tracks WITH METADATA
import { els, disablePlayerControls } from './ui.js';
import { state as sdkState }       from './player.js';
import { getValidStoredToken }     from './auth.js';

// Ensure GSAP is loaded
const gsap = window.gsap;

let built = false;
const HAPPY_BIRTHDAY_LETTERS = 'HAPPYBIRTHDAY'; // 13 letters
const MY_LOVE_TEXT = 'MY LOVE';
const NUM_LETTERS_TRACKS = 13; // Number of letters using track data
const BG_TRACK_URI = 'spotify:track:4mDAxQGyDdpju78hGsACwn'; // Background track ("My Love")

/**
 * Highlights a specific letter within a track title.
 * @param {string} title - The track title.
 * @param {string} letter - The letter to highlight.
 * @param {number} letterIndex - The index within "HAPPYBIRTHDAY" (0-12).
 * @returns {string} HTML string with the highlighted letter.
 */
function highlightLetter(title, letter, letterIndex) {
    // ... (highlightLetter function remains the same - handles H,A,P,P,Y, B,I,R,T,H,D,A,Y) ...
    if (!title || !letter) return title || '';

    const lowerLetter = letter.toLowerCase();
    let pos = -1;

    // Special handling for 'Y's based on their position in HAPPYBIRTHDAY
    if (lowerLetter === 'y') {
        if (letterIndex === 12) { // Y in BIRTHDAY (last letter)
            pos = title.toLowerCase().lastIndexOf('y');
        } else { // Y in HAPPY (index 4)
             pos = title.toLowerCase().indexOf('y');
        }
        // Fallback if specific position not found
        if (pos === -1) pos = title.toLowerCase().indexOf('y');

    } else {
        // General case: find the first occurrence case-insensitively
        const regex = new RegExp(letter, 'i');
        const match = regex.exec(title);
        if (match) {
            pos = match.index;
        }
    }

    // Wrap the found letter in a span
    if (pos !== -1) {
        return title.slice(0, pos)
        + `<span class="highlight">${title[pos]}</span>`
        + title.slice(pos + 1);
    }
    // Return original title if letter not found
    return title;
}


/**
 * Builds the DOM elements for the final reveal sequence.
 */
function buildDom() {
  if (built) return true; // Already built successfully

  // Hide original message area
  els.finalMsg.classList.add('hidden');

  // Main container
  const container = document.createElement('div');
  container.id = 'final-sequence';
  container.className = 'flex flex-col items-center justify-center text-center h-auto px-4 py-8 w-full'; // Ensure full width
  els.finalMsg.parentNode.insertBefore(container, els.finalMsg);

  // 1. "Did you notice?" text
  const notice = document.createElement('p');
  notice.id = 'did-you-notice';
  notice.textContent = 'Did you notice my love?';
  notice.className = 'text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-200 opacity-0 mb-8';
  container.appendChild(notice);

  // 2. Spotify cards container (Initial list)
  const cardsWrap = document.createElement('div');
  cardsWrap.id = 'cards-container';
  cardsWrap.className = 'flex flex-col items-stretch gap-4 opacity-0 h-auto w-full max-w-md mb-8';
  container.appendChild(cardsWrap);

  // --- CRITICAL CHECK ---
  // Need 13 tracks with metadata
  if (!playlistData || playlistData.length < NUM_LETTERS_TRACKS) {
    console.error(`Not enough tracks in playlistData. Need ${NUM_LETTERS_TRACKS}, found ${playlistData?.length || 0}.`);
    const errorMsg = document.createElement('p');
    errorMsg.textContent = 'Error: Could not load track details for the message.';
    errorMsg.className = 'text-red-500 text-center mt-4';
    container.appendChild(errorMsg);
    return false; // Build failure
  }
  const missingMetadata = playlistData.slice(0, NUM_LETTERS_TRACKS).some(
      (track) => !track || !track.imageUrl || !track.trackName || !track.trackArtist
  );
  if (missingMetadata) {
      console.error('Error: Missing required metadata for one or more tracks.');
      const errorMsg = document.createElement('p');
      errorMsg.textContent = 'Error: Missing track details for the message.';
      errorMsg.className = 'text-red-500 text-center mt-4';
      container.appendChild(errorMsg);
      return false; // Build failure
  }
  // --- END CRITICAL CHECK ---

  // Create Spotify cards (List view)
  playlistData.slice(0, NUM_LETTERS_TRACKS).forEach((meta, i) => {
    const card = document.createElement('div');
    card.className = 'spotify-card flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 shadow-md hover:shadow-lg transition-shadow duration-300';
    // ... (rest of card creation logic - image, title, artist, logo) ...
    // Album art
    const img = document.createElement('img');
    img.src = meta.imageUrl;
    img.alt = meta.trackName;
    img.className = 'w-12 h-12 md:w-16 md:h-16 rounded-md object-cover flex-shrink-0';
    img.onerror = () => { img.src = 'https://placehold.co/64x64/333/ccc?text=?'; };
    card.appendChild(img);
    // Text content
    const mid = document.createElement('div');
    mid.className = 'flex flex-col flex-1 mx-3 overflow-hidden';
    const title = document.createElement('span');
    title.className = 'font-semibold text-gray-800 dark:text-white truncate';
    title.innerHTML = highlightLetter(meta.trackName, HAPPY_BIRTHDAY_LETTERS[i], i);
    mid.appendChild(title);
    const artist = document.createElement('span');
    artist.className = 'text-xs text-gray-500 dark:text-gray-400 truncate';
    artist.textContent = meta.trackArtist;
    mid.appendChild(artist);
    card.appendChild(mid);
    // Icons
    const right = document.createElement('div');
    right.className = 'flex items-center gap-3 flex-shrink-0';
    const logo = document.createElement('i');
    logo.className = 'fab fa-spotify text-green-500 text-xl md:text-2xl';
    right.appendChild(logo);
    card.appendChild(right);

    cardsWrap.appendChild(card);
  });

  // 3. "HAPPY BIRTHDAY" Squares Container (Grid/Flex layout)
  const birthdayContainer = document.createElement('div');
  birthdayContainer.id = 'birthday-squares-container';
  // Initially hidden, flex column to stack rows
  birthdayContainer.className = 'flex flex-col items-center gap-2 md:gap-3 opacity-0 mt-8';
  container.appendChild(birthdayContainer);

  // Create rows for HAPPY and BIRTHDAY
  const happyRow = document.createElement('div');
  happyRow.className = 'flex flex-wrap justify-center gap-2 md:gap-3';
  birthdayContainer.appendChild(happyRow);

  const birthdayRow = document.createElement('div');
  birthdayRow.className = 'flex flex-wrap justify-center gap-2 md:gap-3';
  birthdayContainer.appendChild(birthdayRow);

  // Create letter squares for "HAPPY BIRTHDAY"
  HAPPY_BIRTHDAY_LETTERS.split('').forEach((char, index) => {
    const meta = playlistData[index]; // Get corresponding track data

    const square = document.createElement('div');
    square.className = 'letter-square relative aspect-square w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden shadow-lg transform scale-0 flex items-center justify-center bg-gray-700'; // Base style

    // Background image (album art)
    const img = document.createElement('img');
    img.src = meta.imageUrl; // Already checked it exists
    img.alt = `Letter ${char}`;
    img.className = 'absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity';
    img.onerror = () => { img.src = 'https://placehold.co/80x80/333/ccc?text=?'; }; // Fallback
    square.appendChild(img);

    // Letter text
    const letterSpan = document.createElement('span');
    letterSpan.textContent = char;
    letterSpan.className = 'relative z-10 text-3xl md:text-4xl font-bold text-yellow-300'; // Letter on top
    square.appendChild(letterSpan);

    // Add square to the correct row (HAPPY = first 5, BIRTHDAY = next 8)
    if (index < 5) {
      happyRow.appendChild(square);
    } else {
      birthdayRow.appendChild(square);
    }
  });

  // 4. "MY LOVE" Banner
  const myLoveBanner = document.createElement('div');
  myLoveBanner.id = 'my-love-banner';
  // Styling for the banner: gradient, rounded, padding, text style, hidden initially
  myLoveBanner.className = 'opacity-0 transform scale-90 mt-6 md:mt-8 px-8 py-4 md:px-12 md:py-5 bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-500 rounded-full shadow-lg w-auto inline-block'; // Use inline-block for auto-width
  const bannerText = document.createElement('span');
  bannerText.textContent = MY_LOVE_TEXT;
  bannerText.className = 'text-3xl md:text-4xl font-bold text-white tracking-wider'; // White text
  myLoveBanner.appendChild(bannerText);
  container.appendChild(myLoveBanner); // Add banner to the main container

  built = true; // Mark as built successfully
  return true; // Indicate build success
}

/**
 * Plays the background track.
 * @param {string} token - Valid Spotify access token.
 */
function playBackgroundSong(token) {
    // ... (playBackgroundSong function remains the same) ...
     if (!token || !sdkState.deviceId) {
        console.warn('Cannot play background song: Missing token or device ID.');
        return;
    }
    const url = `https://api.spotify.com/v1/me/player/play?device_id=${sdkState.deviceId}`;
    fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ uris: [BG_TRACK_URI] })
    })
    .then(response => {
        if (!response.ok) {
            response.json().then(err => console.error('Error playing background song:', err)).catch(() => console.error('Error playing background song, status:', response.status));
        } else { console.log('Background track playback started.'); }
    })
    .catch(error => { console.error('Fetch error trying to play background song:', error); });
}

/**
 * Starts the final reveal animation sequence.
 * @param {string} [token=getValidStoredToken()] - Spotify access token.
 */
export function startFinalSequence(token = getValidStoredToken()) {
  // Build DOM and check success
  const buildSuccessful = buildDom();
  if (!buildSuccessful) {
      console.error("Final sequence aborted because DOM build failed.");
      return;
  }

  // Hide other sections, disable controls
  els.ssArea?.classList.add('hidden');
  els.mainTitle?.classList.add('hidden');
  disablePlayerControls();

  // Play background song
  playBackgroundSong(token);

  // GSAP Timeline
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

  // Select elements *after* buildDom
  const noticeEl = document.getElementById('did-you-notice');
  const cardsContainerEl = document.getElementById('cards-container');
  const spotifyCardEls = document.querySelectorAll('.spotify-card');
  const birthdayContainerEl = document.getElementById('birthday-squares-container');
  const letterSquareEls = document.querySelectorAll('#birthday-squares-container .letter-square'); // Select only birthday squares
  const myLoveBannerEl = document.getElementById('my-love-banner');

  // --- Animation Sequence ---

  // 1. Notice Text
  if (noticeEl) {
      tl.to(noticeEl, { duration: 1.5, autoAlpha: 1 });
      tl.to(noticeEl, { duration: 1.0, autoAlpha: 0, delay: 2 });
  }

  // 2. Spotify Cards (List view)
  if (cardsContainerEl && spotifyCardEls.length > 0) {
      tl.to(cardsContainerEl, { duration: 1.0, autoAlpha: 1 }, noticeEl ? "-=0.5" : "+=0");
      tl.from(spotifyCardEls, {
          y: 40, autoAlpha: 0, duration: 0.8, stagger: 0.15
      }, '<');
      // Fade out cards *before* showing squares
      tl.to(cardsContainerEl, { duration: 1.0, autoAlpha: 0, delay: 3.0 }); // Shortened delay slightly
  } else {
       tl.add(()=>{}, "+=1.0"); // Add delay if cards skipped
  }

  // 3. "HAPPY BIRTHDAY" Squares
  if (birthdayContainerEl && letterSquareEls.length > 0) {
      // Fade in the container for the squares
      tl.to(birthdayContainerEl, { duration: 0.5, autoAlpha: 1 }, "-=0.2"); // Overlap slightly with card fade out
      // Staggered scale-in animation for each letter square
      tl.to(letterSquareEls, {
          scale: 1, // Scale up to normal size
          duration: 0.6,
          stagger: {
              each: 0.07, // Faster stagger
              from: 'start' // Animate from H to Y
          },
          ease: 'back.out(1.7)'
      }, '<0.1'); // Start shortly after the container fades in
  } else {
      console.warn("Skipping birthday square animations: Container or squares not found.");
  }

  // 4. "MY LOVE" Banner (appears after squares)
  if (myLoveBannerEl) {
      // Fade in and scale up the banner
      tl.to(myLoveBannerEl, {
          autoAlpha: 1, // Fade in
          scale: 1,     // Scale up from 0.9
          duration: 0.8,
          ease: 'elastic.out(1, 0.75)' // Bouncy effect
      }, "-=0.3"); // Overlap slightly with the end of square animation
  } else {
       console.warn("Skipping 'MY LOVE' banner animation: Element not found.");
  }
}

// Inject CSS
(function injectCss() {
    // ... (injectCss function remains the same - ensures .highlight etc. exist) ...
    if (document.getElementById('final-reveal-css')) return;
    const css = `
        .highlight { color: #facc15; font-weight: bold; }
        #cards-container { margin-left: auto; margin-right: auto; }
        .letter-square { transition: transform 0.3s ease; }
        .letter-square:hover { transform: scale(1.05); }
        .fab.fa-spotify { font-family: 'Font Awesome 5 Brands'; }
        .fas.fa-play { font-family: 'Font Awesome 5 Free'; font-weight: 900; }
    `;
    const styleElement = document.createElement('style');
    styleElement.id = 'final-reveal-css';
    styleElement.textContent = css;
    document.head.appendChild(styleElement);
})();
