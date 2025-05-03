// js/config.js  ───────────────────────────────────────────
export const CLIENT_ID  = 'b008c63967424a379518b79158bdb177';   // ★ keep secret out of Git
export const REDIRECT_URI = 'http://127.0.0.1:5501/index.html';

export const SPOTIFY_AUTHORIZE_ENDPOINT = 'https://accounts.spotify.com/authorize';
export const SPOTIFY_TOKEN_ENDPOINT    = 'https://accounts.spotify.com/api/token';

export const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state'
];

export const CODE_VERIFIER_STORAGE_KEY = 'spotify_code_verifier';
export const ACCESS_TOKEN_STORAGE_KEY  = 'spotify_access_token';
export const TOKEN_EXPIRY_STORAGE_KEY  = 'spotify_token_expiry';
export const REFRESH_TOKEN_STORAGE_KEY = 'spotify_refresh_token';


export const playlistData = [
  /* 1 */ { trackUri: 'spotify:track:1SGvjfc85yzqKXsfKcCxn2' },
  /* 2 */ { trackUri: 'spotify:track:1Ijh9lrbGPUj1tui7OGpnB' },
  /* 3 */ { trackUri: 'spotify:track:3xKsf9qdS1CyvXSMEid6g8' },
  /* 4 */ { trackUri: 'spotify:track:6N4WUdbz6HVKy6u6JX1KqK' },
  /* 5 */ { trackUri: 'spotify:track:0gmStTUTuiU807EB4KafOX' },
  /* 6 */ { trackUri: 'spotify:track:2isf9DCebk6mUhGagcD5bf' },
  /* 7 */ { trackUri: 'spotify:track:71BWZa1liIRyUiuJ3MB66o' },
  /* 8 */ { trackUri: 'spotify:track:7s5VQqrjBtrBgZL4pEa46S' },
  /* 9 */ { trackUri: 'spotify:track:190K3zR3nkKQzmOtEQTB37' },
  /*10 */ { trackUri: 'spotify:track:1JdQibdvxgcrB8Rv1KFndw' },
  /*11 */ { trackUri: 'spotify:track:2ALEhWrcpAdOC7YYJBQIre' },
  /*12 */ { trackUri: 'spotify:track:5d4njBTnGHcaSvjDnicA3N' },
  /*13 */ { trackUri: 'spotify:track:2s4AcE9n80mSHl87lp4gIm' },
  /*14 */ { trackUri: 'spotify:track:4mDAxQGyDdpju78hGsACwn' }
];
