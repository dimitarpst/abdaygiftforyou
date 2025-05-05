// js/finalReveal.js
// ──────────────────────────────────────────────────────────────
// Final reveal: track list scrolls/slides down/up, then interactive "H A P P Y   B I R T H D A Y" squares
// (click for message), auto-showing tooltips on cards, confetti, final buttons, and "MY LOVE" banner.

import { playlistData }           from './config.js';
import { els, disablePlayerControls } from './ui.js'; // Ensure disablePlayerControls is exported from ui.js
import { state as sdkState }        from './player.js';
import { getValidStoredToken }      from './auth.js';

// Ensure GSAP & ColorThief are available
const gsap     = window.gsap;
const ColorThief = window.ColorThief;

let built = false;
const HAPPY_BIRTHDAY_LETTERS = 'HAPPYBIRTHDAY';
const MY_LOVE_TEXT           = 'MY LOVE';
const BG_TRACK_URI           = 'spotify:track:4mDAxQGyDdpju78hGsACwn'; // Example BG Track

// --- Personal messages for each letter (Click Interaction) ---
const LETTER_MESSAGES = [
  "H is for How you always inspire me.",                   // H (Heart pt. 5 / Harleys)
  "A is for the Affection I feel endlessly with you.",     // A (A Heart Like Hers / All I Need)
  "P is for the Peace you give my heart.",                 // P (Pink + White)
  "P is for being my favorite Person to get lost with.",   // P (Preoccupied)
  "Y is for You, the love I never knew I needed.",         // Y (Yours / Get You)
  "B is for the Beauty in every memory we share.",         // B (Birch Tree)
  "I is for Infinite moments we’ve spent together.",       // I (Ivy)
  "R is for how Rare and precious our bond is.",           // R (Romantic Lover)
  "T is for Treasuring every beat, every lyric with you.", // T (Timeless Memories)
  "H is for how Happy you make even ordinary days feel.",  // H (Harleys in Hawaii)
  "D is for Dreaming of every adventure yet to come.",     // D (Drugs and Hella Melodies)
  "A is for Adoring you more deeply every day.",           // A (A Heart Like Hers / All I Need)
  "Y is for You and me, my forever favorite song."         // Y (Yours / Get You)
];


// Messages for card tooltips (Auto-Show Interaction)
const CUTE_MESSAGES = [
  "Reminds me of us playing ML together.", // H
  "makes me think how lucky I am that your heart chose mine.",
  "I'm really feeling this vibe—especially with you.", // P
  "My absolute favorite track to listen to with ya!", // P
  "Exactly how I see myself through your eyes.", // Y
  "Every note brings me back to our peaceful moments together.", // B (Updated)
  "We really can't resist Frank Ocean, can we?", // I
  "This song perfectly describes both of us.", // R
  "This melody feels like a warm memory with you.", // T (Updated)
  "Reminds me of watching my adorable Aylin doing her makeup.", // H
  "Feels like we're little thugs vibing to this.", // D
  "I've heard your lovely voice singing this one so many times.", // A
  "Just you, me, and this song—nothing better." // Y
];




/** Highlights first occurrence of `letter` in `title`. */
function highlightLetter(title, letter, letterIndex) {
    if (!title || !letter) return title || '';
    const lower = letter.toLowerCase();
    let pos = -1;
    // Special handling for 'Y' to find the last one for the final 'Y'
    if (lower === 'y') {
        pos = letterIndex === 12 // Is it the last 'Y'?
            ? title.toLowerCase().lastIndexOf('y')
            : title.toLowerCase().indexOf('y');
        // Fallback for last 'Y' if lastIndexOf fails but indexOf finds one
        if (pos === -1 && letterIndex === 12) pos = title.toLowerCase().indexOf('y');
    } else {
        // Find the first occurrence for other letters
        const titleLower = title.toLowerCase();
        pos = titleLower.indexOf(lower);
    }

    if (pos !== -1) {
        return title.slice(0, pos)
            + `<span class="highlight">${title[pos]}</span>`
            + title.slice(pos + 1);
    }
    return title; // Return original title if letter not found
}

/** Function to show message modal (for letter click) */
function showLetterMessage(message) {
    let modal = document.getElementById('letter-message-modal');
    if (!modal) {
        // Create modal structure if it doesn't exist
        modal = document.createElement('div');
        modal.id = 'letter-message-modal';
        modal.className = 'letter-message-modal hidden'; // Start hidden

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        const messageP = document.createElement('p');
        messageP.id = 'modal-message-text';
        modalContent.appendChild(messageP);

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.className = 'modal-close-button';
        closeButton.onclick = () => {
            // Animate modal out
            gsap.to(modal, { autoAlpha: 0, duration: 0.3, onComplete: () => modal.classList.add('hidden') });
        };
        modalContent.appendChild(closeButton);

        modal.appendChild(modalContent);
        document.body.appendChild(modal); // Append to body for overlay
    }

    // Set message and show modal
    modal.querySelector('#modal-message-text').textContent = message;
    modal.classList.remove('hidden');
    gsap.to(modal, { autoAlpha: 1, duration: 0.3 }); // Animate modal in
}


/** Build DOM for the final reveal once. */
function buildDom() {
    if (built) return true; // Only build once
    built = true;

    // Expand outer container slightly and allow overflow
    const appEl = document.getElementById('app-container');
    if (appEl) {
        gsap.set(appEl, { overflow: 'visible' }); // Allow overflow for modal/confetti
        gsap.to(appEl, { duration: 1, maxWidth: '56rem', ease: 'power2.out' });
    }

    // Hide original placeholder message
    if (els.finalMsg) {
        els.finalMsg.classList.add('hidden');
    } else {
        console.warn("buildDom: els.finalMsg not found.");
        return false; // Cannot proceed without insertion point
    }

    // Insert sequence container
    const container = document.createElement('div');
    container.id = 'final-sequence';
    container.className = 'relative flex flex-col items-center justify-center text-center w-full px-4 py-8'; // Added relative positioning
    els.finalMsg.parentNode.insertBefore(container, els.finalMsg);

    // "Did you notice?" text (starts hidden)
    const notice = document.createElement('p');
    notice.id = 'did-you-notice';
    notice.textContent = 'Did you notice my love?';
    notice.className = 'text-3xl md:text-4xl font-bold mb-8'; // Added margin
    notice.style.overflow = 'hidden';
    notice.style.height   = '0px';
    notice.style.opacity  = '0';
    container.appendChild(notice);

    // Spotify cards list container (starts hidden)
    const cardsWrap = document.createElement('div');
    cardsWrap.id = 'cards-container';
    cardsWrap.className = 'flex flex-col items-stretch gap-4 w-full max-w-md mb-8';
    cardsWrap.style.overflow = 'hidden';
    cardsWrap.style.height   = '0px';
    cardsWrap.style.opacity  = '0';
    container.appendChild(cardsWrap);
    const continueBtn = document.createElement('button');
    continueBtn.id = 'continue-button';
    continueBtn.textContent = 'Continue';
    continueBtn.className = 'hidden continue-button';
    container.appendChild(continueBtn);
    // Metadata checks
    if (!playlistData || playlistData.length < HAPPY_BIRTHDAY_LETTERS.length) {
        console.error(`BuildDom Error: Need ${HAPPY_BIRTHDAY_LETTERS.length} tracks, found ${playlistData?.length}. Check config.js.`);
        // Optionally display an error message to the user in the container
        return false;
    }
    if (playlistData.slice(0, HAPPY_BIRTHDAY_LETTERS.length).some(t => !t || !t.imageUrl || !t.trackName || !t.trackArtist)) {
        console.error("BuildDom Error: One or more tracks in playlistData are missing required metadata (imageUrl, trackName, trackArtist). Check config.js.");
         // Optionally display an error message
        return false;
    }

    // --- Build each Spotify card with tooltip ---
    playlistData.slice(0, HAPPY_BIRTHDAY_LETTERS.length).forEach((meta, i) => {
        const card = document.createElement('div');
        card.className =
          'spotify-card flex items-center justify-between bg-white dark:bg-gray-800 ' +
          'rounded-lg p-3 shadow-md transition-shadow duration-300 transform ' +
          'hover:shadow-lg hover:-translate-y-1 relative'; // Added relative for tooltip positioning

        // Album art
        const img = document.createElement('img');
        img.src = meta.imageUrl || 'https://placehold.co/64x64/333/ccc?text=?'; // Fallback image
        img.alt = meta.trackName || 'Track';
        img.className = 'w-12 h-12 md:w-16 md:h-16 rounded-md object-cover flex-shrink-0';
        img.onerror = () => { img.src = 'https://placehold.co/64x64/333/ccc?text=?'; }; // Handle image loading errors
        card.appendChild(img);

        // Title + artist section
        const mid = document.createElement('div');
        mid.className = 'flex flex-col flex-1 mx-3 overflow-hidden'; // flex-1 allows text to take available space

        const title = document.createElement('span');
        title.className = 'font-semibold text-gray-800 dark:text-white truncate'; // Truncate long titles
        // Highlight the corresponding letter
        title.innerHTML = highlightLetter(meta.trackName || 'Unknown Track', HAPPY_BIRTHDAY_LETTERS[i], i);
        mid.appendChild(title);

        const artist = document.createElement('span');
        artist.className = 'text-xs text-gray-500 dark:text-gray-400 truncate'; // Truncate long artist names
        artist.textContent = meta.trackArtist || 'Unknown Artist';
        mid.appendChild(artist);
        card.appendChild(mid);

        // Spotify icon
        const logoWrap = document.createElement('div');
        logoWrap.className = 'flex items-center gap-3 flex-shrink-0';
        const logo = document.createElement('i');
        logo.className = 'fab fa-spotify text-green-500 text-xl md:text-2xl'; // Font Awesome Spotify icon
        logoWrap.appendChild(logo);
        card.appendChild(logoWrap);

        // --- Tooltip bubble (for auto-show animation) ---
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip-bubble'; // CSS class for styling
        tooltip.style.opacity = 0; // Start invisible for GSAP fade-in
        tooltip.style.transform = 'translateX(-50%) translateY(8px) scale(0.8)'; // Start state for GSAP animation
        tooltip.textContent = CUTE_MESSAGES[i] || "Thinking of you!"; // Use message from CUTE_MESSAGES array
        card.appendChild(tooltip); // Append tooltip to the card
        const coverImg = new Image();
        coverImg.crossOrigin = 'Anonymous';
        coverImg.src = meta.imageUrl;
        
        coverImg.onload = () => {
          try {
            // get two dominant colors [ [r,g,b], [r2,g2,b2], … ]
            const palette = new ColorThief().getPalette(coverImg, 2);
            const [c1, c2] = palette;
            tooltip.style.background = 
              `linear-gradient(
                 to right,
                 rgb(${c1[0]}, ${c1[1]}, ${c1[2]}) 0%,
                 rgb(${c2[0]}, ${c2[1]}, ${c2[2]}) 100%
               )`;
          } catch (err) {
            console.warn('ColorThief error on tooltip gradient:', err);
            // fallback to a simple translucent black
            tooltip.style.background = 'rgba(0,0,0,0.6)';
          }
        };
        
        coverImg.onerror = () => {
          // in case image fails to load, give a fallback
          tooltip.style.background = 'rgba(0,0,0,0.6)';
        };
        cardsWrap.appendChild(card); // Add the completed card to the container
    });

    // --- "H A P P Y   B I R T H D A Y" interactive squares (Click for Message) ---
    const birthdayContainer = document.createElement('div');
    birthdayContainer.id = 'birthday-squares-container';
    birthdayContainer.className = 'flex flex-col items-center gap-2 md:gap-3 mb-4'; // Vertical flex, gap, margin
    birthdayContainer.style.overflow = 'hidden';
    birthdayContainer.style.height   = '0px';
    birthdayContainer.style.opacity  = '0';
    container.appendChild(birthdayContainer);

    // Rows for letters
    const happyRow = document.createElement('div');
    happyRow.className = 'flex flex-wrap justify-center gap-2 md:gap-3';
    birthdayContainer.appendChild(happyRow);
    const birthdayRow = document.createElement('div');
    birthdayRow.className = 'flex flex-wrap justify-center gap-2 md:gap-3 mt-2 md:mt-3'; // Margin top for second row
    birthdayContainer.appendChild(birthdayRow);

    HAPPY_BIRTHDAY_LETTERS.split('').forEach((char, idx) => {
        const meta = playlistData[idx]; // Get corresponding track metadata
        const square = document.createElement('div');
        square.className =
          'letter-square relative aspect-square w-16 h-16 md:w-20 md:h-20 ' + // Sizing & aspect ratio
          'rounded-lg overflow-hidden shadow-lg transform scale-0 flex items-center justify-center ' + // Styling & initial animation state
          'cursor-pointer hover:scale-105 transition-transform'; // Interactivity styling

        // Store message in data attribute for click listener
        square.dataset.message = LETTER_MESSAGES[idx] || `Special message for ${char}!`; // Fallback message

        // Add click listener to show the message modal
        square.onclick = () => showLetterMessage(square.dataset.message);

        // Background image (album art)
        const back = document.createElement('img');
        back.src = meta.imageUrl || 'https://placehold.co/80x80/333/ccc?text=?'; // Fallback
        back.alt = `Letter ${char}`;
        back.crossOrigin = 'Anonymous'; // Needed for ColorThief
        back.className = 'absolute inset-0 w-full h-full object-cover opacity-40'; // Cover, slight opacity
        back.onerror = () => { back.src = 'https://placehold.co/80x80/333/ccc?text=?'; }; // Error handling
        square.appendChild(back);

        // Letter text
        const letterSpan = document.createElement('span');
        letterSpan.textContent = char;
        letterSpan.className = 'relative z-10 text-3xl md:text-4xl font-bold pointer-events-none'; // Styling, ensure background click-through
        square.appendChild(letterSpan);

        // --- ColorThief logic for text color ---
        if (ColorThief) {
            const thief = new ColorThief();
            const applyColor = () => {
                try {
                    // Ensure image is loaded and has dimensions before getting color
                    if (back.complete && back.naturalWidth > 0 && back.naturalHeight > 0) {
                        const [r, g, b] = thief.getColor(back);
                        // Simple brightness check to determine light/dark text
                        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                        letterSpan.style.color = brightness > 128 ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)'; // Dark text on light bg, light text on dark bg
                    } else {
                         // Fallback if image not loaded properly
                        letterSpan.style.color = 'rgba(255,255,255,0.9)';
                    }
                } catch (e) {
                    console.warn("ColorThief error for letter:", char, e);
                    letterSpan.style.color = 'rgba(255,255,255,0.9)'; // Fallback on error
                }
            };
            // Apply color immediately if image is already loaded, otherwise on load/error
            if (back.complete) { applyColor(); }
            else { back.onload = applyColor; back.onerror = applyColor; } // onerror applyColor sets fallback
        } else {
            // Fallback if ColorThief library isn't loaded
            letterSpan.style.color = 'rgba(255,255,255,0.9)';
        }

        // Append square to the correct row (HAPPY or BIRTHDAY)
        if (idx < 5) happyRow.appendChild(square);
        else         birthdayRow.appendChild(square);
    });

    // --- "MY LOVE" banner (starts hidden) ---
    const myLoveBanner = document.createElement('div');
    myLoveBanner.id = 'my-love-banner';
    myLoveBanner.className =
      'relative w-full h-16 md:h-20 mt-2 md:mt-3 ' + // Sizing, margin
      'rounded-lg shadow-lg flex items-center justify-center ' + // Styling
      'bg-cover bg-center'; // Background properties (image set later)
    myLoveBanner.style.overflow = 'hidden';
    myLoveBanner.style.maxHeight = '0px'; // Initial animation state
    myLoveBanner.style.opacity  = '0';    // Initial animation state
    const bannerText = document.createElement('span');
    bannerText.textContent = MY_LOVE_TEXT;
    bannerText.className = 'relative z-10 text-3xl md:text-4xl font-bold tracking-wider'; // Styling, ensure text is above potential background overlay
    myLoveBanner.appendChild(bannerText);
    container.appendChild(myLoveBanner);

    // --- Container for final buttons (starts hidden) ---
    const finalButtonsContainer = document.createElement('div');
    finalButtonsContainer.id = 'final-buttons-container';
    finalButtonsContainer.className = 'mt-6 flex flex-col sm:flex-row gap-4 items-center justify-center';
    finalButtonsContainer.style.overflow = 'hidden';
    finalButtonsContainer.style.height   = '0px';
    finalButtonsContainer.style.opacity  = '0';    container.appendChild(finalButtonsContainer);

    // Replay Button
    const replayButton = document.createElement('button');
    replayButton.id = 'replay-button';
    replayButton.className = 'final-action-button'; // Shared button style
    replayButton.innerHTML = '<i class="fas fa-redo mr-2"></i> Replay?'; // Icon + text
    replayButton.onclick = () => window.location.reload(); // Simple page reload for replay
    finalButtonsContainer.appendChild(replayButton);

    // Spotify Button
    const spotifyButton = document.createElement('button');
    spotifyButton.id = 'spotify-button';
    spotifyButton.className = 'final-action-button spotify'; // Shared + specific style
    spotifyButton.innerHTML = '<i class="fab fa-spotify mr-2"></i> Open Spotify'; // Icon + text
    // IMPORTANT: Replace with your actual playlist link
    spotifyButton.onclick = () => window.open('https://open.spotify.com/playlist/YOUR_PLAYLIST_ID', '_blank'); // Replace with actual link
    finalButtonsContainer.appendChild(spotifyButton);

    // --- Container for confetti (starts hidden) ---
    const confettiContainer = document.createElement('div');
    confettiContainer.id = 'confetti-container';
    confettiContainer.className = 'absolute inset-0 pointer-events-none overflow-hidden z-30 opacity-0'; // Overlay, non-interactive, initial state
    for (let i = 0; i < 50; i++) { // Add 50 confetti pieces
        const confetti = document.createElement('div');
        confetti.className = 'confetti'; // CSS class for styling and animation
        confetti.style.left = `${Math.random() * 100}%`; // Random horizontal start
        confetti.style.animationDuration = `${Math.random() * 3 + 2}s`; // Random fall speed
        confetti.style.animationDelay = `${Math.random() * 5}s`; // Random start delay
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 70%)`; // Random color
        confettiContainer.appendChild(confetti);
    }
    container.appendChild(confettiContainer); // Add confetti overlay to the main sequence container

    

    return true; // Indicate successful build
}

/** Play the background track on next available device. */
async function playBackgroundSong(token) {
    if (!token || !sdkState.deviceId) {
        console.warn("Cannot play background song: Missing token or device ID.", { token: !!token, deviceId: sdkState.deviceId });
        return;
    }
    try {
        console.log(`Attempting to play background track ${BG_TRACK_URI} on device ${sdkState.deviceId}`);
        const response = await fetch( `https://api.spotify.com/v1/me/player/play?device_id=${sdkState.deviceId}`, { // Use standard Spotify API endpoint
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ uris: [BG_TRACK_URI] }) // Play specific track URI
        });
        if (!response.ok) {
            // Log detailed error from Spotify if available
            const errorBody = await response.text();
            console.error('Error playing background song:', response.status, response.statusText, errorBody);
        } else {
            console.log("Background song playback initiated.");
            // Set volume after playback starts (add slight delay)
            setTimeout(() => {
                 if (sdkState.spotifyPlayer) {
                     sdkState.spotifyPlayer.setVolume(0.3).catch(e => console.warn("Couldn't set background volume", e));
                 }
            }, 500); // Wait 500ms before setting volume
        }
    } catch (e) {
        console.error('Fetch error trying to play background song:', e);
    }
}

/** Fetches album art for the background track and applies it to the banner. */
async function setupBannerBackground(token) {
    const bannerEl = document.getElementById('my-love-banner');
    if (!bannerEl || !token) {
        console.warn("Cannot setup banner background: Missing banner element or token.");
        if (bannerEl) { // Apply fallback color if element exists but token missing
             bannerEl.style.backgroundColor = '#a78bfa'; // Default purple fallback
             const bannerText = bannerEl.querySelector('span');
             if (bannerText) bannerText.style.color = 'rgba(255,255,255,0.9)';
        }
        return;
    }

    try {
        // Extract track ID from the background track URI
        const trackId = BG_TRACK_URI.split(':').pop();
        if (!trackId) throw new Error("Invalid BG_TRACK_URI");

        // Fetch track details from Spotify API
        const resp = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, { // Use standard Spotify API endpoint
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) {
            throw new Error(`Spotify API error fetching track: ${resp.status} ${resp.statusText}`);
        }
        const data = await resp.json();

        // Get the first album image URL
        const imageUrl = data.album?.images?.[0]?.url;

        if (imageUrl) {
            // Apply image as background
            bannerEl.style.backgroundImage = `url(${imageUrl})`;

            // Use ColorThief to set text color based on image
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // Required for ColorThief
            img.src = imageUrl;
            img.onload = () => {
                if (ColorThief && img.naturalWidth > 0) { // Check library loaded & image valid
                    try {
                        const thief = new ColorThief();
                        const [r, g, b] = thief.getColor(img);
                        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                        const textColor = brightness > 128 ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)';
                        const bannerText = bannerEl.querySelector('span');
                        if (bannerText) bannerText.style.color = textColor;
                        bannerEl.classList.add('has-background'); // Add class to potentially activate overlay via CSS
                    } catch (e) {
                        console.warn('ColorThief error on banner:', e);
                        const bannerText = bannerEl.querySelector('span');
                        if (bannerText) bannerText.style.color = 'rgba(255,255,255,0.9)'; // Fallback text color
                        bannerEl.classList.add('has-background');
                    }
                } else {
                    // Fallback if ColorThief fails or image isn't valid
                    const bannerText = bannerEl.querySelector('span');
                    if (bannerText) bannerText.style.color = 'rgba(255,255,255,0.9)';
                    bannerEl.classList.add('has-background');
                }
            };
            img.onerror = () => {
                // Handle image load error
                console.error('Could not load banner image:', imageUrl);
                const bannerText = bannerEl.querySelector('span');
                if (bannerText) bannerText.style.color = 'rgba(255,255,255,0.9)';
                bannerEl.style.backgroundColor = '#a78bfa'; // Fallback background color
                bannerEl.classList.add('has-background'); // Still add class
            }
        } else {
            // Handle case where track has no image
            console.warn("No image found for banner background track.");
            const bannerText = bannerEl.querySelector('span');
            if (bannerText) bannerText.style.color = 'rgba(255,255,255,0.9)';
            bannerEl.style.backgroundColor = '#a78bfa'; // Fallback background color
            bannerEl.classList.add('has-background');
        }
    } catch (e) {
        // Handle general errors fetching/processing banner background
        console.error('Could not load banner cover:', e);
        const bannerText = bannerEl.querySelector('span');
        if (bannerText) bannerText.style.color = 'rgba(255,255,255,0.9)';
        bannerEl.style.backgroundColor = '#a78bfa'; // Fallback background color
        bannerEl.classList.add('has-background');
    }
}


/** Runs the final reveal animation sequence. */
export async function startFinalSequence(token = getValidStoredToken()) {
    console.log("Starting final sequence...");
    // Ensure the DOM is built. If not, attempt to build it.
    if (!built) {
        if (!buildDom()) {
            console.error("Final sequence aborted: Failed to build DOM.");
            return; // Stop if DOM build fails
        }
    }

    // --- Stop Slideshow & Hide Controls ---
    console.log("Pausing player and hiding controls...");
    // Stop any currently playing track from the slideshow gracefully
    if (sdkState.spotifyPlayer) {
        try {
            await sdkState.spotifyPlayer.pause();
            console.log("Paused slideshow track via SDK.");
        } catch (e) {
            console.warn("Could not pause player via SDK:", e);
            // As a fallback, try pausing via API if SDK fails (less ideal)
            if (token && sdkState.deviceId) {
                 try {
                     await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${sdkState.deviceId}`, {
                         method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }
                     });
                     console.log("Paused slideshow track via API fallback.");
                 } catch (apiError) { console.warn("API pause fallback also failed:", apiError); }
            }
        }
    } else {
        console.warn("Spotify player SDK instance not available to pause.");
    }
    await new Promise(resolve => setTimeout(resolve, 200)); // Short delay to ensure pause command is processed

    // Hide slideshow elements and disable player controls
    els.ssArea?.classList.add('hidden');
    els.mainTitle?.classList.add('hidden');
    if (typeof disablePlayerControls === 'function') {
         disablePlayerControls(); // Call the imported function
         console.log("Player controls disabled.");
    } else {
         console.warn("disablePlayerControls function not found or not imported correctly from ui.js");
    }
    // --- End Stop Slideshow ---


    // --- Setup Background Music & Banner ---
    console.log("Setting up background music and banner...");
    // Use Promise.all to start song and banner setup concurrently
    await Promise.all([
        playBackgroundSong(token),
        setupBannerBackground(token)
    ]);
    console.log("Background music and banner setup initiated.");
    // --- End Setup ---


    // --- Get Elements Needed for Animation ---
    console.log("Gathering elements for animation...");
    const noticeEl = document.getElementById('did-you-notice');
    const cardsEl = document.getElementById('cards-container');
    const cardEls = cardsEl ? Array.from(cardsEl.querySelectorAll('.spotify-card')) : []; // Convert NodeList to Array
    const tooltips = cardsEl ? Array.from(cardsEl.querySelectorAll('.tooltip-bubble')) : []; // Convert NodeList to Array
    const squaresEl = document.getElementById('birthday-squares-container');
    const letterEls = squaresEl ? Array.from(squaresEl.querySelectorAll('.letter-square')) : []; // Convert NodeList to Array
    const banner = document.getElementById('my-love-banner');
    const confetti = document.getElementById('confetti-container');
    const finalBtns = document.getElementById('final-buttons-container');
    const sequenceContainer = document.getElementById('final-sequence');
    // --- End Get Elements ---


    // --- GSAP Timeline Setup ---
    console.log("Setting up GSAP timeline...");
    const tl = gsap.timeline({
         defaults: { ease: 'power2.out' },
         paused: true, // Create paused, play explicitly later
         onComplete: () => console.log("Final sequence timeline completed.") // Log completion
    });

    // --- Timing Variables ---
    let currentTime = 0;
    let cardSequenceEndTime = 0; // Tracks when the card reveal/hide section finishes
    // --- End Timing Variables ---


    // 1) Notice Text Animation
    if (noticeEl) {
        const noticeRevealDuration = 1.5;
        const noticeHoldDuration = 2.0;
        const noticeHideDuration = 1.0;
        tl.to(noticeEl, { height: 'auto', autoAlpha: 1, duration: noticeRevealDuration }, currentTime);
        // Schedule hide: Starts after reveal + hold
        tl.to(noticeEl, { height: 0, autoAlpha: 0, duration: noticeHideDuration }, currentTime + noticeRevealDuration + noticeHoldDuration);
        // Update marker for end of this independent part
        cardSequenceEndTime = Math.max(cardSequenceEndTime, currentTime + noticeRevealDuration + noticeHoldDuration + noticeHideDuration);
        console.log(`Notice animation scheduled to end around ${cardSequenceEndTime.toFixed(1)}s`);
    } else {
        console.warn("Notice element not found for animation.");
    }


    // 2) Cards Reveal & Scroll Animation
    if (cardsEl && cardEls.length > 0 && sequenceContainer) {
        const startScroll = window.scrollY;
        const sequenceRect = sequenceContainer.getBoundingClientRect();

        // --- ADJUSTED SCROLL TARGET ---
        // Aim to position the top of the sequence container 1/5th down the viewport
        // This should scroll the page further down than just bringing the top into view.
        const endScroll = startScroll + sequenceRect.top + (window.innerHeight / 5); // (+) offset scrolls further down
        // --- End Adjusted Scroll Target ---

        const numCards = cardEls.length;
        const cardStagger = 0.5;
        const cardDuration = 2.5; // Individual card animation duration
        const cardContainerRevealStartTime = 0.5; // Start container/scroll slightly after timeline starts
        const cardAnimStartTime = cardContainerRevealStartTime + 0.2; // Start card stagger shortly after

        // Calculate approx end time for the last card's entrance animation
        const lastCardAnimEndTime = cardAnimStartTime + (numCards - 1) * cardStagger + cardDuration;

        // Scroll Animation: Duration related to card reveal time
        const scrollDuration = Math.max(4, lastCardAnimEndTime - cardContainerRevealStartTime + 0.5); // Ensure decent duration, extend slightly past cards
        const scrollObj = { y: startScroll };
        tl.to(scrollObj, {
            y: Math.max(0, endScroll), // Don't scroll above top
            duration: scrollDuration,
            ease: 'power2.inOut', // Smooth ease for scroll
            onUpdate: () => window.scrollTo(0, scrollObj.y),
            onStart: () => console.log(`Scroll animation started (duration: ${scrollDuration.toFixed(1)}s)`),
        }, cardContainerRevealStartTime); // Start scroll

        // Reveal Cards Container: Match scroll/content reveal duration
        tl.to(cardsEl, {
            height: 'auto',
            autoAlpha: 1,
            duration: scrollDuration - 0.5, // Reveal slightly faster than scroll ends
            ease: 'power2.inOut'
        }, cardContainerRevealStartTime); // Start reveal with scroll

        // Stagger Reveal Individual Cards
        tl.from(cardEls, {
            y: 40,
            autoAlpha: 0,
            duration: cardDuration,
            stagger: cardStagger,
            onStart: () => console.log("Card stagger animation started"),
        }, cardAnimStartTime); // Start slightly after container starts

        // Animate Tooltips
        let lastTooltipFadeEndTime = lastCardAnimEndTime; // Default end time
        if (tooltips.length === numCards) {
          const tooltipAnimStartTime = cardAnimStartTime + 1.5;  // Give cards a bit more head‐start
          const tooltipShowDuration   = 0.8;                    // Slow fade/scale
          const tooltipStagger        = 0.6;                    // Longer gap between each
          tl.to(tooltips, {
              autoAlpha: 1,
              scale:     1,
              y:         0,
              duration:  tooltipShowDuration,
              stagger:   tooltipStagger,
              ease:      'back.out(1.7)',
              onStart:   () => console.log("Tooltip show animation started")
          }, tooltipAnimStartTime);
          // (you can re‑calculate lastTooltipFadeEndTime if you still need it)
      }
      

        // Hide Cards Container: Start after cards are in AND tooltips faded
        const cardHideStartTime = Math.max(lastCardAnimEndTime, lastTooltipFadeEndTime) + 0.5; // Start 0.5s after the latest event finishes
        const cardHideDuration = 2.0;

        tl.call(
          () => { cardsEl.style.overflow = 'visible'; },
          null,
          cardHideStartTime - 0.4
        );
    // 2a) Pause here and show the Continue button
    tl.addPause(cardHideStartTime, () => {
      const btn = document.getElementById('continue-button');
      btn.classList.remove('hidden');
    });

    // When they click it, hide the button and resume the timeline
    const contBtn = document.getElementById('continue-button');
    contBtn.addEventListener('click', () => {
      // Slide the button down and fade it out…
      gsap.to(contBtn, {
        y: 20,            // move it down 20px
        autoAlpha: 0,     // fade to 0
        duration: 0.5,    // half a second
        ease: 'power2.in',
        onComplete: () => {
          // then hide it from layout and kick off the rest
          contBtn.classList.add('hidden');
          cardsEl.style.overflow = 'hidden';
          tl.play();
        }
      });
    });
    
    

    // 2b) Now schedule the cards‑hide after resume
    tl.to(cardsEl, {
      height: 0,
      autoAlpha: 0,
      duration: cardHideDuration,
      ease: 'power2.in',
      onStart: () => console.log("Card hide animation started"),
    }, `>`);


        // Update the overall end time marker for this sequence
        cardSequenceEndTime = Math.max(cardSequenceEndTime, cardHideStartTime + cardHideDuration);
        console.log(`Card reveal/hide sequence scheduled to end around ${cardSequenceEndTime.toFixed(1)}s`);

    } else {
        console.warn("Card animation elements not found.");
        // If no cards, sequence end time remains based on notice text
    }


    // --- Position subsequent animations based on calculated cardSequenceEndTime ---
    currentTime = cardSequenceEndTime; // Reset current time marker


    // 3) Squares Reveal
    let squaresEndTime = currentTime;
    if (squaresEl && letterEls.length > 0) {
        const squaresStartTime = currentTime - 1.0; // Overlap: Start 1s before card sequence ends
        const squaresRevealDuration = 1.5;
        const letterScaleStartTime = squaresStartTime + 0.2;
        const letterScaleDuration = 1.2;
        const letterStagger = 0.14;
        // Calculate approx end time for last letter scaling
        const lastLetterScaleEndTime = letterScaleStartTime + (letterEls.length - 1) * letterStagger + letterScaleDuration;

        tl.to(squaresEl, {
             height: 'auto', autoAlpha: 1, duration: squaresRevealDuration,
             onStart: () => console.log("Squares container reveal started"),
        }, squaresStartTime);
        tl.to(letterEls, {
            scale: 1, duration: letterScaleDuration,
            stagger: { each: letterStagger, from: 'start' },
            ease: 'back.out(1.7)',
            onStart: () => console.log("Letter squares scaling started"),
        }, letterScaleStartTime);

        squaresEndTime = Math.max(currentTime, lastLetterScaleEndTime); // Update end time
        console.log(`Squares sequence scheduled to end around ${squaresEndTime.toFixed(1)}s`);
    } else { console.warn("Squares animation elements not found."); }

    currentTime = squaresEndTime; // Update time marker


    // 4) Banner Reveal
    let bannerEndTime = currentTime;
    if (banner) {
        const bannerStartTime = currentTime - 0.6; // Overlap: Start 0.6s before squares sequence ends
        const bannerDuration = 1.5;
        const bannerScaleDuration = 1.2;

        tl.to(banner, {
             maxHeight: '8rem', autoAlpha: 1, duration: bannerDuration,
             onStart: () => console.log("Banner reveal started"),
        }, bannerStartTime);
        tl.from(banner, { // Elastic scale effect
             scale: 0.5, duration: bannerScaleDuration, ease: 'elastic.out(1,0.75)'
        }, bannerStartTime); // Start scale with height animation

        bannerEndTime = Math.max(currentTime, bannerStartTime + bannerDuration); // Update end time
        console.log(`Banner reveal scheduled to end around ${bannerEndTime.toFixed(1)}s`);
    } else { console.warn("Banner element not found."); }

    currentTime = bannerEndTime; // Update time marker


    // 5) Confetti Reveal
    let confettiStartTime = currentTime - 0.5; // Default overlap
    if (confetti) {
        confettiStartTime = bannerEndTime - 0.5; // Start 0.5s before banner finishes
        tl.to(confetti, {
             autoAlpha: 1, duration: 1.5,
             onStart: () => console.log("Confetti reveal started"),
        }, confettiStartTime);
        // Confetti has CSS animation, doesn't block timeline
    } else { console.warn("Confetti container not found."); }


    if (finalBtns) {
    const buttonsStartTime = confettiStartTime + 0.8;
    // slide down + fade in
    tl.to(finalBtns, {
        height:   'auto',
        autoAlpha:1,
        duration: 1.0,
        ease:     'power2.out',
        onComplete() {
          // now that it’s fully open, allow shadows/etc to show
          finalBtns.style.overflow = 'visible';
        }
    }, buttonsStartTime);
     }


    // --- Play the timeline ---
    console.log("Starting GSAP timeline playback...");
    tl.play();

} // End of startFinalSequence


// --- Inject CSS (Includes styles for Modal, Confetti, Buttons, Tooltips) ---
(function injectCss() {
    // Prevent duplicate injection
    if (document.getElementById('final-reveal-css')) return;

    const css = `
      /* Base styles */
      .highlight { color: #fde047; /* Yellow highlight */ font-weight: bold; }
      #cards-container { margin: 0 auto; } /* Center card container if needed */
      .letter-square { transition: transform 0.3s ease, box-shadow 0.3s ease; }
      .letter-square:hover { box-shadow: 0 5px 15px rgba(0,0,0,0.2); transform: translateY(-3px) scale(1.03); }
      .fab.fa-spotify { font-family: 'Font Awesome 5 Brands'; } /* Ensure Font Awesome loads */
      .fas { font-family: 'Font Awesome 5 Free'; font-weight: 900; } /* Ensure Font Awesome loads */

      /* Spotify Card Tooltip styling (For Auto-Show GSAP control) */
      .tooltip-bubble {
        position: absolute;
        bottom: -23%; /* Position above the card */
        left: 50%;
        margin-bottom: 8px; /* Space between tooltip and card */
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        color: white;
        white-space: nowrap; /* Prevent wrapping */
        font-size: 0.875rem; /* 14px */
        z-index: 10; /* Ensure tooltip is above card */
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        pointer-events: none; /* Tooltip shouldn't block interaction with card */
        /* GSAP controls transform/opacity from initial state set in buildDom */
      }
      /* Optional: Fallback hover style if JS/GSAP fails */
      .spotify-card:hover .tooltip-bubble {
        opacity: 1 !important; /* Use !important carefully */
        transform: translateX(-50%) translateY(0) scale(1) !important;
        transition: transform 0.2s ease-out, opacity 0.2s ease-out !important;
      }

      /* Letter Message Modal (From Click) */
      .letter-message-modal {
        position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.6); /* Semi-transparent overlay */
        display: flex; align-items: center; justify-content: center;
        z-index: 100; padding: 1rem; opacity: 0; /* Start hidden for GSAP */
        visibility: hidden; /* Add visibility for better hiding */
      }
      .letter-message-modal:not(.hidden) { /* Control visibility with class */
         visibility: visible;
      }
      .letter-message-modal.hidden { display: none; } /* Use display none when fully hidden */

      .letter-message-modal .modal-content {
        background-color: white; padding: 2rem; border-radius: 0.75rem;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center;
        max-width: 90%; width: 400px; /* Responsive width */
        transform: scale(0.95); /* Slight scale for GSAP entrance */
        opacity: 0; /* Start hidden for GSAP */
      }
      .letter-message-modal:not(.hidden) .modal-content { /* Animate in with GSAP */
         transform: scale(1);
         opacity: 1;
         transition: transform 0.3s ease-out, opacity 0.3s ease-out;
      }

      .letter-message-modal #modal-message-text {
        font-size: 1.125rem; /* 18px */ color: #374151; /* Gray-700 */ margin-bottom: 1.5rem;
      }
      .letter-message-modal .modal-close-button {
        padding: 0.5rem 1.5rem; background-color: var(--accent, #8b5cf6); /* Use accent color */
        color: white; border: none; border-radius: 9999px; /* Pill shape */ cursor: pointer;
        font-weight: 600; transition: background-color 0.2s ease;
      }
      .letter-message-modal .modal-close-button:hover {
        background-color: var(--accent-secondary, #a855f7); /* Darken on hover */
      }

      /* Confetti Animation */
      #confetti-container { z-index: 5; } /* Position below modal but above other content */
      .confetti {
        position: absolute; width: 8px; height: 12px; opacity: 0.9;
        animation: fall linear infinite; /* Use keyframe animation */
        will-change: transform, opacity; /* Performance hint */
      }
      @keyframes fall {
        0% { transform: translateY(-10vh) rotateZ(0deg); opacity: 1; }
        100% { transform: translateY(110vh) rotateZ(720deg); opacity: 0; } /* Fall off screen */
      }

      /* Final Action Buttons */
      .final-action-button {
        display: inline-flex; align-items: center; justify-content: center;
        padding: 0.75rem 1.5rem; border-radius: 9999px; /* Pill shape */ font-weight: 600;
        font-size: 1rem; /* 16px */ cursor: pointer; transition: all 0.3s ease;
        border: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      }
      .final-action-button:hover {
        transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0,0,0,0.15);
      }
      .final-action-button { background-color: var(--accent, #8b5cf6); color: white; } /* Default style */
      .final-action-button:hover { background-color: var(--accent-secondary, #a855f7); }
      /* Spotify specific style */
      .final-action-button.spotify { background-color: #1DB954; }
      .final-action-button.spotify:hover { background-color: #1AA34A; }

      /* Banner Background Overlay */
      #my-love-banner.has-background { /* Class added by JS when background image is set */
          position: relative; /* Needed for pseudo-element positioning */
          background-size: cover;
          background-position: center;
       }
      #my-love-banner.has-background::before { /* Darkening overlay */
        content: ""; position: absolute; inset: 0;
        background-color: rgba(0, 0, 0, 0.5); /* Adjust opacity as needed */
        border-radius: inherit; /* Match banner's border radius */
        z-index: 0; /* Position behind banner text */
      }
    `;
    const style = document.createElement('style');
    style.id = 'final-reveal-css';
    style.textContent = css;
    document.head.appendChild(style);
    console.log("Final reveal CSS injected.");
})(); // End of injectCss IIFE