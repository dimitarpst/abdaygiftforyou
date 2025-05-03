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
  const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_STORAGE_KEY);
  if (!codeVerifier) {
    showError('Auth error: code verifier missing. Please log in again.');
    return null;
  }

  const params = new URLSearchParams({
    client_id     : CLIENT_ID,
    grant_type    : 'authorization_code',
    code,
    redirect_uri  : REDIRECT_URI,
    code_verifier : codeVerifier
  });

  try {
    const r = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
      method  : 'POST',
      headers : { 'Content-Type': 'application/x-www-form-urlencoded' },
      body    : params.toString()
    });

    if (!r.ok) {
      const err = await r.json();
      showError(`Authentication failed: ${err.error_description || err.error || r.statusText}.`);
      clearTokenInfo();
      return null;
    }

    const tokenData = await r.json();

    /* save token + expiry (minus 60 s buffer) */
    const expiry = Date.now() + (tokenData.expires_in - 60) * 1000;
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY,  tokenData.access_token);
    localStorage.setItem(TOKEN_EXPIRY_STORAGE_KEY,  expiry.toString());
    if (tokenData.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokenData.refresh_token);
    }
    scheduleTokenRefresh(expiry);

    sessionStorage.removeItem(CODE_VERIFIER_STORAGE_KEY);
    return tokenData.access_token;
  } catch (e) {
    showError(`Authentication failed: ${e.message}.`);
    clearTokenInfo();
    sessionStorage.removeItem(CODE_VERIFIER_STORAGE_KEY);
    return null;
  }
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
  const delay = Math.max(5_000, expiryMs - Date.now() - 60_000);
  refreshTimeoutId = setTimeout(refreshAccessToken, delay);
}

/** swap an expired access-token for a fresh one */
export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (!refreshToken) return null;

  const body = new URLSearchParams({
    client_id    : CLIENT_ID,
    grant_type   : 'refresh_token',
    refresh_token: refreshToken
  });

  try {
    const r = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
      method : 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body   : body.toString()
    });
    if (!r.ok) throw new Error('refresh failed');

    const t = await r.json();
    const expiry = Date.now() + (t.expires_in - 60) * 1000;
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY,  t.access_token);
    localStorage.setItem(TOKEN_EXPIRY_STORAGE_KEY,  expiry.toString());
    scheduleTokenRefresh(expiry);
    return t.access_token;
  } catch {
    clearTokenInfo();
    return null;
  }
}

/* internal helper */
function showError(msg) {
  els.authError.textContent = msg;
  els.authError.classList.remove('hidden');
}
