// js/auth.js  ────────────────────────────────────────────
// with this
import {
  CLIENT_ID, REDIRECT_URI,
  SPOTIFY_AUTHORIZE_ENDPOINT, SPOTIFY_TOKEN_ENDPOINT,
  SCOPES,
  CODE_VERIFIER_STORAGE_KEY, ACCESS_TOKEN_STORAGE_KEY,
  TOKEN_EXPIRY_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY      
} from './config.js';

import { els } from './ui.js';

/* ---------- PKCE helper functions (unchanged logic) ---------- */
function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64encode(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  bytes.forEach(b => { str += String.fromCharCode(b); });
  const base64 = btoa(str);
  // URL-safe base64
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
  const hashed = await sha256(verifier);
  return base64encode(hashed);
}

/* ---------------- public API ---------------- */
export async function redirectToSpotifyLogin() {
  clearTokenInfo();                               // start clean

  const verifier = generateRandomString(64);
  sessionStorage.setItem(CODE_VERIFIER_STORAGE_KEY, verifier);

  const challenge = await generateCodeChallenge(verifier);

  const url =
    `${SPOTIFY_AUTHORIZE_ENDPOINT}` +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES.join(' '))}` +
    `&code_challenge_method=S256` +
    `&code_challenge=${encodeURIComponent(challenge)}`;

  window.location = url;                          // full redirect
}

/**
 * Exchange the returned `?code=` for an access token and store it.
 * @param {string} code  The authorization-code from Spotify
 * @returns {Promise<string|null>}  access token or null on error
 */
export async function fetchAndStoreAccessToken(code) {
  const verifier = sessionStorage.getItem(CODE_VERIFIER_STORAGE_KEY);
  if (!verifier) {
    showError('Auth error: code verifier missing. Please log in again.');
    return null;
  }

  const params = new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  REDIRECT_URI,
    client_id:     CLIENT_ID,
    code_verifier: verifier
  });

  const r = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString()
  });
  const data = await r.json();
  if (!r.ok) {
    showError(`Authentication failed: ${data.error_description||data.error}.`);
    clearTokenInfo();
    return null;
  }

  // store tokens + expiry (minus 60s buffer) :contentReference[oaicite:2]{index=2}:contentReference[oaicite:3]{index=3}
  const expiry = Date.now() + (data.expires_in - 60) * 1000;
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY,  data.access_token);
  localStorage.setItem(TOKEN_EXPIRY_STORAGE_KEY,  expiry.toString());
  if (data.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, data.refresh_token);
  }
  scheduleTokenRefresh(expiry);

  sessionStorage.removeItem(CODE_VERIFIER_STORAGE_KEY);
  return data.access_token;
}

// with this
export function getValidStoredToken() {
  const token  = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  const expiry = +localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY);
  if (token && expiry && Date.now() < expiry) {
    scheduleTokenRefresh(expiry);       // keep it fresh
    return token;
  }
  clearTokenInfo();
  return null;
}


export function clearTokenInfo() {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  clearTimeout(refreshTimeoutId);
}

let refreshTimeoutId;

/** schedule refresh 1 min before expiry */
function scheduleTokenRefresh(expiryMs) {
  clearTimeout(refreshTimeoutId);
  const delay = Math.max(5000, expiryMs - Date.now() - 60000);
  console.log(`🔄 scheduling token refresh in ${Math.round(delay/1000)}s`);
  refreshTimeoutId = setTimeout(async () => {
    console.log('🔄 performing token refresh now');
    await refreshAccessToken();
  }, delay);
}


/** swap an expired access-token for a fresh one */
export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (!refreshToken) return null;

  const params = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: refreshToken,
    client_id:     CLIENT_ID
  });

  const r = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString()
  });
  const t = await r.json();
  if (!r.ok) {
    clearTokenInfo();
    return null;
  }

  // update stored access token + expiry :contentReference[oaicite:4]{index=4}:contentReference[oaicite:5]{index=5}
  const expiry = Date.now() + (t.expires_in - 60) * 1000;
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, t.access_token);
  localStorage.setItem(TOKEN_EXPIRY_STORAGE_KEY, expiry.toString());

  if (t.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, t.refresh_token);
    }
  scheduleTokenRefresh(expiry);
  return t.access_token;
}

/* internal helper */
function showError(msg) {
  els.authError.textContent = msg;
  els.authError.classList.remove('hidden');
}
window.scheduleTokenRefresh = scheduleTokenRefresh;
window.refreshAccessToken   = refreshAccessToken;