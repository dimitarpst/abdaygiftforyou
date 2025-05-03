// js/main.js  ─────────────────────────────────────────────
import { els, disablePlayerControls } from './ui.js';
import { getValidStoredToken, refreshAccessToken, fetchAndStoreAccessToken, redirectToSpotifyLogin } from './auth.js';
import { initPlayer, togglePlay } from './player.js';
import { startSlideshow, nextSlide, prevSlide } from './slideshow.js';




/* ------- tiny helper waits for SDK callback -------- */
function waitForSpotifySdk() {
  return new Promise(res=>{
    if (window.__spotifySdkLoaded) return res();
    const id = setInterval(()=>{ if(window.__spotifySdkLoaded){ clearInterval(id); res(); } },50);
  });
}

window.onload = async ()=>{
  await waitForSpotifySdk();
  disablePlayerControls();

  // with this
  let accessToken = getValidStoredToken();
  if (!accessToken) {
    accessToken = await refreshAccessToken();   
  }


  if(accessToken){
    els.loginArea.classList.add('hidden');
    els.ssArea.classList.remove('hidden');
    els.statusTxt.textContent='Initializing player…';
    initPlayer(accessToken);
  }else{
    const p = new URLSearchParams(window.location.search);
    const code  = p.get('code');
    const error = p.get('error');
    history.replaceState({},document.title,window.location.pathname);

    if(error){
      els.authError.textContent=`Spotify Login Error: ${error}`;
      els.authError.classList.remove('hidden');
    }else if(code){
      els.authStatus.textContent='Authenticating…';
      els.authStatus.classList.remove('hidden');
      accessToken = await fetchAndStoreAccessToken(code);
      if(accessToken) initPlayer(accessToken);
    }
  }

  /* ---- button wires ---- */
  els.loginBtn.addEventListener('click', redirectToSpotifyLogin);
  els.startBtn.addEventListener('click', ()=>startSlideshow(accessToken));
  els.ppBtn  .addEventListener('click', togglePlay);
  els.prevBtn.addEventListener('click', () => prevSlide(getValidStoredToken()));
  els.nextBtn.addEventListener('click', () => nextSlide(getValidStoredToken()));
};
