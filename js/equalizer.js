// js/equalizer.js  ──────────────────────────────────────────
// Ultra-dense, fluid neon equalizer overlay — now spanning 100% width
// with 50 bars that flex to fill the frame for maximum coverage.

let eqEl;

/**
 * Build (once) and return the equalizer DOM node.
 * @param {number} barCount  number of bars (default 50)
 */
export function initEqualizer(barCount = 50) {
  if (eqEl) return eqEl;

  const imgWrapper = document.querySelector('#slideshow-area .relative');
  if (!imgWrapper) throw new Error('Image wrapper not found');

  eqEl = document.createElement('div');
  eqEl.id = 'equalizer';
  eqEl.className =
    'hidden pointer-events-none absolute inset-x-0 bottom-0 ' +
    'flex items-end gap-[2px] h-12 ' +
    'perspective-400 z-20';

  for (let i = 0; i < barCount; i++) {
    const bar = document.createElement('div');
    bar.className = 'eq-bar';
    bar.style.setProperty('--idx', i);
    bar.style.setProperty('--dur', `${1.4 + Math.random() * 1.4}s`);
    eqEl.appendChild(bar);
  }
  imgWrapper.appendChild(eqEl);

  const css = `
#equalizer { perspective:400px; transform:rotateX(-18deg); }
#equalizer .eq-bar{
  flex:1;                       /* stretch to fill */
  min-width:2px;                /* prevent collapse */
  height:70%;
background: linear-gradient(
      to top,
      var(--accent, #f472b6) 0%,
      var(--accent-secondary, #a855f7) 50%,
      var(--accent-tertiary, #6366f1) 100%
    );
  background-size:100% 400%;
  border-radius:6px;
  box-shadow:
     0 0 8px rgba(139,92,246,.55),
     0 0 3px rgba(0,0,0,.25) inset;
  transform-origin:bottom;
  animation:
     equalize var(--dur) ease-in-out infinite,
     hueShift 5s linear infinite;
  animation-delay:calc(var(--idx)*-0.1s);
  animation-play-state:paused;
}
#equalizer.playing .eq-bar{ animation-play-state:running; }

@keyframes equalize{
  0%  { transform:scaleY(.30) rotateX(3deg);   }
  25% { transform:scaleY(.95) rotateX(0deg);   }
  50% { transform:scaleY(.40) rotateX(2deg);   }
  75% { transform:scaleY(1.05) rotateX(-1deg); }
 100% { transform:scaleY(.30) rotateX(3deg);   }
}
@keyframes hueShift{
   0% { background-position:0%   0%; }
 100% { background-position:0% 100%; }
}`;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  return eqEl;
}

/**
 * Show or hide the equalizer animation.
 */
export function setEqualizerPlaying(isPlaying = false) {
  if (!eqEl) initEqualizer();
  eqEl.classList.toggle('hidden', !isPlaying);
  eqEl.classList.toggle('playing', isPlaying);
}