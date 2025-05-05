// js/finalReveal.js
// ──────────────────────────────────────────────────────────────
// Final reveal: track list slide-down/up, then "HAPPY BIRTHDAY" squares
// in two rows, followed by a "MY LOVE" banner with album art background.

import { playlistData }              from './config.js';
import { els, disablePlayerControls } from './ui.js';
import { state as sdkState }         from './player.js';
import { getValidStoredToken }       from './auth.js';

// Ensure GSAP & ColorThief are available
const gsap       = window.gsap;
const ColorThief = window.ColorThief;

let built = false;
const HAPPY_BIRTHDAY_LETTERS = 'HAPPYBIRTHDAY';
const MY_LOVE_TEXT           = 'MY LOVE';
const BG_TRACK_URI           = 'spotify:track:4mDAxQGyDdpju78hGsACwn';

/** Highlights first occurrence of `letter` in `title`. */
function highlightLetter(title, letter, letterIndex) {
  if (!title || !letter) return title || '';
  const lower = letter.toLowerCase();
  let pos = -1;
  if (lower === 'y') {
    pos = letterIndex === 12
      ? title.toLowerCase().lastIndexOf('y')
      : title.toLowerCase().indexOf('y');
    if (pos === -1) pos = title.toLowerCase().indexOf('y');
  } else {
    const m = new RegExp(letter, 'i').exec(title);
    if (m) pos = m.index;
  }
  if (pos !== -1) {
    return title.slice(0, pos)
      + `<span class="highlight">${title[pos]}</span>`
      + title.slice(pos + 1);
  }
  return title;
}

/** Build DOM for the final reveal once. */
function buildDom() {
  if (built) return true;
  built = true;

  // Expand outer container
  const appEl = document.getElementById('app-container');
  if (appEl) {
    gsap.set(appEl, { overflow: 'hidden' });
    gsap.to(appEl, { duration: 1, maxWidth: '56rem', ease: 'power2.out' });
  }

  // Hide original placeholder
  els.finalMsg.classList.add('hidden');

  // Insert sequence container
  const container = document.createElement('div');
  container.id = 'final-sequence';
  container.className = 'flex flex-col items-center justify-center text-center w-full px-4 py-8';
  els.finalMsg.parentNode.insertBefore(container, els.finalMsg);

  // 1) "Did you notice?" text
  const notice = document.createElement('p');
  notice.id = 'did-you-notice';
  notice.textContent = 'Did you notice my love?';
  notice.className = 'text-3xl md:text-4xl font-bold '; 
  notice.style.overflow = 'hidden';
  notice.style.height   = '0px';
  notice.style.opacity  = '0';
  container.appendChild(notice);

  // 2) Spotify cards list
  const cardsWrap = document.createElement('div');
  cardsWrap.id = 'cards-container';
  cardsWrap.className = 'flex flex-col items-stretch gap-4 w-full max-w-md mb-8';
  cardsWrap.style.overflow = 'hidden';
  cardsWrap.style.height   = '0px';
  cardsWrap.style.opacity  = '0';
  container.appendChild(cardsWrap);

  // Metadata checks
  if (!playlistData || playlistData.length < HAPPY_BIRTHDAY_LETTERS.length) {
    console.error(`Need ${HAPPY_BIRTHDAY_LETTERS.length} tracks, found ${playlistData?.length}.`);
    const err = document.createElement('p');
    err.textContent = 'Error: Missing track details.';
    err.className = 'text-red-500';
    container.appendChild(err);
    return false;
  }
  if (playlistData.slice(0, HAPPY_BIRTHDAY_LETTERS.length)
      .some(t => !t.imageUrl || !t.trackName || !t.trackArtist)) {
    console.error('Missing metadata on one or more tracks.');
    const err = document.createElement('p');
    err.textContent = 'Error: Incomplete track metadata.';
    err.className = 'text-red-500';
    container.appendChild(err);
    return false;
  }

  // Build each Spotify card
  playlistData.slice(0, HAPPY_BIRTHDAY_LETTERS.length).forEach((meta, i) => {
    const card = document.createElement('div');
    card.className =
      'spotify-card flex items-center justify-between bg-white dark:bg-gray-800 ' +
      'rounded-lg p-3 shadow-md hover:shadow-lg transition-shadow duration-300';

    const img = document.createElement('img');
    img.src = meta.imageUrl;
    img.alt = meta.trackName;
    img.className = 'w-12 h-12 md:w-16 md:h-16 rounded-md object-cover flex-shrink-0';
    img.onerror = () => { img.src = 'https://placehold.co/64x64/333/ccc?text=?'; };
    card.appendChild(img);

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

    const logoWrap = document.createElement('div');
    logoWrap.className = 'flex items-center gap-3 flex-shrink-0';
    const logo = document.createElement('i');
    logo.className = 'fab fa-spotify text-green-500 text-xl md:text-2xl';
    logoWrap.appendChild(logo);
    card.appendChild(logoWrap);

    cardsWrap.appendChild(card);
  });

  // 3) "HAPPY BIRTHDAY" squares
  const birthdayContainer = document.createElement('div');
  birthdayContainer.id = 'birthday-squares-container';
  birthdayContainer.className = 'flex flex-col items-center gap-2 md:gap-3';
  // initially hidden via height
  birthdayContainer.style.overflow = 'hidden';
  birthdayContainer.style.height   = '0px';
  birthdayContainer.style.opacity  = '0';
  container.appendChild(birthdayContainer);

  const happyRow = document.createElement('div');
  happyRow.className = 'flex flex-wrap justify-center gap-2 md:gap-3';
  birthdayContainer.appendChild(happyRow);
  const birthdayRow = document.createElement('div');
  birthdayRow.className = 'flex flex-wrap justify-center gap-2 md:gap-3';
  birthdayContainer.appendChild(birthdayRow);

  HAPPY_BIRTHDAY_LETTERS.split('').forEach((char, idx) => {
    const meta = playlistData[idx];
    const square = document.createElement('div');
    square.className =
      'letter-square relative aspect-square w-16 h-16 md:w-20 md:h-20 ' +
      'rounded-lg overflow-hidden shadow-lg transform scale-0 flex items-center justify-center';

    const back = document.createElement('img');
    back.src = meta.imageUrl;
    back.alt = `Letter ${char}`;
    back.crossOrigin = 'Anonymous';
    back.className = 'absolute inset-0 w-full h-full object-cover opacity-40';
    back.onerror = () => { back.src = 'https://placehold.co/80x80/333/ccc?text=?'; };
    square.appendChild(back);

    const letterSpan = document.createElement('span');
    letterSpan.textContent = char;
    letterSpan.className = 'relative z-10 text-3xl md:text-4xl font-bold';
    square.appendChild(letterSpan);

    if (ColorThief) {
      const thief = new ColorThief();
      const applyColor = () => {
        try {
          const [r, g, b] = thief.getColor(back);
          const ir = 255 - r, ig = 255 - g, ib = 255 - b;
          letterSpan.style.color = `rgb(${ir},${ig},${ib})`;
        } catch {}
      };
      if (back.complete && back.naturalHeight) applyColor();
      else back.onload = applyColor;
    }

    if (idx < 5) happyRow.appendChild(square);
    else       birthdayRow.appendChild(square);
  });

  // 4) "MY LOVE" banner
  const myLoveBanner = document.createElement('div');
  myLoveBanner.id = 'my-love-banner';
  myLoveBanner.className =
    'relative w-full h-16 md:h-20 mt-2 md:mt-3 ' +
    'rounded-lg shadow-lg flex items-center justify-center ' +
    'bg-cover bg-center';
  // initial hidden via height
  myLoveBanner.style.overflow = 'hidden';
  myLoveBanner.style.maxHeight = '0px';
  myLoveBanner.style.opacity  = '0';
  const bannerText = document.createElement('span');
  bannerText.textContent = MY_LOVE_TEXT;
  bannerText.className = 'text-3xl md:text-4xl font-bold tracking-wider';
  myLoveBanner.appendChild(bannerText);
  container.appendChild(myLoveBanner);

  return true;
}

/** Tell Spotify to play “MY LOVE” on device. */
function playBackgroundSong(token) {
  if (!token || !sdkState.deviceId) return;
  fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${sdkState.deviceId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ uris: [BG_TRACK_URI] })
    }
  ).catch(e => console.error('Error playing bg song:', e));
}

/** Runs the final reveal animation with slide-up/down. */
export async function startFinalSequence(token = getValidStoredToken()) {
  if (!buildDom()) return;

  // hide slideshow + disable controls
  els.ssArea?.classList.add('hidden');
  els.mainTitle?.classList.add('hidden');
  disablePlayerControls();

  // play background track & sample banner cover
  playBackgroundSong(token);
  const bannerEl = document.getElementById('my-love-banner');
  if (bannerEl && token) {
    try {
      const id   = BG_TRACK_URI.split(':').pop();
      const resp = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      const url  = data.album.images[0]?.url;
      if (url) {
        bannerEl.style.backgroundImage = `url(${url})`;
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => {
          try {
            const thief = new ColorThief();
            const [r, g, b] = thief.getColor(img);
            const ir = 255 - r, ig = 255 - g, ib = 255 - b;
            const txt = bannerEl.querySelector('span');
            if (txt) txt.style.color = `rgb(${ir},${ig},${ib})`;
          } catch {}
        };
      }
    } catch (e) {
      console.error('Could not load banner cover:', e);
    }
  }

  // GSAP timeline for slide animations
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
  const noticeEl  = document.getElementById('did-you-notice');
  const cardsEl   = document.getElementById('cards-container');
  const cardEls   = document.querySelectorAll('.spotify-card');
  const squaresEl = document.getElementById('birthday-squares-container');
  const letterEls = document.querySelectorAll('#birthday-squares-container .letter-square');
  const banner    = document.getElementById('my-love-banner');

  // 1) Notice text slide-down/up
  if (noticeEl) {
    tl.to(noticeEl, { height: 'auto', autoAlpha: 1, duration: 1.5 });
    tl.to(noticeEl, { height: 0, autoAlpha: 0, duration: 1.0, delay: 2.0 });
  }

  if (cardsEl && cardEls.length) {
    const startScroll = window.scrollY;
    const endScroll   = cardsEl.getBoundingClientRect().top + window.scrollY;
    const scrollObj = { y: startScroll };

    tl.to(scrollObj, {
      y:        endScroll,
      duration: 5,
      ease:     'none',
      onUpdate: () => window.scrollTo(0, scrollObj.y)
    }, '<');

    tl.to(cardsEl, {
      height:    'auto',
      autoAlpha: 1,
      duration:  5,
      ease:      'power2.inOut'
    }, '<');

    tl.from(cardEls, {
      y:         40,
      autoAlpha: 0,
      duration:  2.5,
      stagger:   0.5
    }, '<');

    tl.to(cardsEl, {
      height:    0,
      autoAlpha: 0,
      duration:  2,
      delay:     4
    });
  }

  if (squaresEl && letterEls.length) {
    tl.to(squaresEl, { height: 'auto', autoAlpha: 1, duration: 1.5 }, '-=1.0');
    tl.to(letterEls, {
      scale: 1,
      duration: 1.2,
      stagger: { each: 0.14, from: 'start' },
      ease: 'back.out(1.7)'
    }, '<0.2');
  }

  if (banner) {
    tl.to(banner, { maxHeight: 84, autoAlpha: 1, duration: 1.5 }, '-=0.6');
    tl.to(banner, {
      scale: 1,
      duration: 1.2,
      ease: 'elastic.out(1,0.75)'
    }, '<');
  }
}

(function injectCss() {
  if (document.getElementById('final-reveal-css')) return;
  const css = `
    .highlight { color: #facc15; font-weight: bold; }
    #cards-container { margin: 0 auto; }
    .letter-square { transition: transform 0.3s ease; }
    .letter-square:hover { transform: scale(1.05); }
    .fab.fa-spotify { font-family: 'Font Awesome 5 Brands'; }
    .fas.fa-play    { font-family: 'Font Awesome 5 Free'; font-weight: 900; }
  `;
  const style = document.createElement('style');
  style.id = 'final-reveal-css';
  style.textContent = css;
  document.head.appendChild(style);
})();
