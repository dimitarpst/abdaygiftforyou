// js/playlistBuilder.js

import { getValidStoredToken } from './auth.js';
import { playlistData }      from './config.js';

const gsap = window.gsap;

/**
 * Call this once (e.g. from main.js after initPlayer) to wire up your button.
 */
export function initPlaylistBuilder() {
  // 1) Inject the button
  const btn = document.createElement('button');
  btn.id = 'create-playlist-button';
  btn.textContent = 'Create Playlist';
  btn.className =
    'mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition';
  document.getElementById('player-controls')?.after(btn);

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Gathering tracks…';

    // 2) Quick “gather” animation
    const overlay = document.createElement('div');
    overlay.id = 'gather-overlay';
    overlay.style = `
      position: fixed; inset:0;
      pointer-events: none;
    `;
    document.body.appendChild(overlay);

    // create little dots for each track
    playlistData.forEach((t, i) => {
      const dot = document.createElement('div');
      dot.className = 'gather-dot';
      Object.assign(dot.style, {
        position: 'absolute',
        width: '12px', height: '12px',
        borderRadius: '50%',
        background: 'var(--accent)',
        left: `${10 + Math.random()*80}%`,
        top: `${10 + Math.random()*80}%`,
        transform: 'translate(-50%,-50%)'
      });
      overlay.appendChild(dot);

      // animate each into center
      gsap.to(dot, {
        x: window.innerWidth/2 - (dot.offsetLeft),
        y: window.innerHeight/2 - (dot.offsetTop),
        delay: i * 0.08,
        duration: 0.5,
        ease: 'power2.in'
      });
    });

    // wait for the gather to finish
    await new Promise(r => setTimeout(r, playlistData.length * 80 + 600));

    // 3) Spotify Web API calls
    const token = getValidStoredToken();
    if (!token) {
      alert('Please log in first!');
      return;
    }

    // fetch user profile
    const meRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const me = await meRes.json();
    const userId = me.id;

    // create playlist
    const createRes = await fetch(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: "Aylin's Special Playlist",
          description: "Handcrafted with love 💖",
          public: true
        })
      }
    );
    const playlist = await createRes.json();

    // add tracks
    await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: playlistData.map(p => p.trackUri)
        })
      }
    );

    // 4) done! open it
    window.open(playlist.external_urls.spotify, '_blank');

    // cleanup
    btn.textContent = 'Done!';
    overlay.remove();
  });
}
