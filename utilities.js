// ==========================================
// 8. UTILITIES
// ==========================================
function getDeviceId() {
    let id = localStorage.getItem('device_fingerprint');
    if (!id) { id = 'DEV-' + Math.random().toString(36).substr(2, 16); localStorage.setItem('device_fingerprint', id); }
    return id;
}

function getSortedEntries(obj) {
    if (!obj) return [];
    return Object.entries(obj).sort((a, b) => {
        let va = a[1].type === 'video' ? 0 : 1, vb = b[1].type === 'video' ? 0 : 1;
        if (va !== vb) return va - vb;
        return a[1].title.localeCompare(b[1].title, undefined, { numeric: true, sensitivity: 'base' });
    });
}

function extractThumbnails(node, set = new Map()) {
    for (let key in node) {
        if (node[key].thumbnail && !set.has(node[key].thumbnail)) set.set(node[key].thumbnail, node[key].title);
        if (node[key].children) extractThumbnails(node[key].children, set);
    }
    return set;
}

window.shareContent = function(title) {
    const text = (db.settings.shareText || '') + '\n\n' + title;
    if (navigator.share) navigator.share({ title, text, url: window.location.href }).catch(() => {});
    else { navigator.clipboard.writeText(text + '\n' + window.location.href); alert('Link copied!'); }
};

// ==========================================
// CRYPTO — TOKEN-DERIVED AES-256-CBC DECRYPTION
//
// There is NO hardcoded key anywhere in this codebase.
// The AES-256 key is derived at runtime by both sides independently:
//
//   key = SHA-256( authToken + "-enc-v1" )
//
// PHP:  hash('sha256', $token . '-enc-v1', true)
// JS:   crypto.subtle.digest('SHA-256', encode(token + '-enc-v1'))
//
// Why this is secure:
//   • No key is ever transmitted or stored — both sides compute it from
//     the session token they already share.
//   • The token is 64 random hex chars (256 bits of entropy) — unique
//     per login. If someone gets their own token, they can only decrypt
//     their own session's traffic. They cannot decrypt anyone else's.
//   • Reading the source reveals only the derivation algorithm — useless
//     without a valid session token to feed into it.
//   • Unauthenticated calls (login, cookie handshake) carry no sensitive
//     data beyond the token itself, so they stay plaintext.
// ==========================================

// Cache CryptoKey per-token so we don't re-derive on every request.
// Invalidated automatically when the token changes (login/logout).
let _cachedCryptoKey  = null;
let _cachedKeyForToken = null;

async function _getApiCryptoKey() {
    const token = localStorage.getItem('authToken');
    if (!token) return null; // unauthenticated — no decryption needed

    // Re-derive only when the token changes (login refreshes it, logout clears it)
    if (_cachedCryptoKey && _cachedKeyForToken === token) return _cachedCryptoKey;

    const raw = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(token + '-enc-v1')
    );
    _cachedCryptoKey  = await crypto.subtle.importKey('raw', raw, { name: 'AES-CBC' }, false, ['decrypt']);
    _cachedKeyForToken = token;
    return _cachedCryptoKey;
}

async function _decryptAPIPayload(payload) {
    const key = await _getApiCryptoKey();
    if (!key) return null;
    const iv  = Uint8Array.from(atob(payload.i), c => c.charCodeAt(0));
    const enc = Uint8Array.from(atob(payload.e), c => c.charCodeAt(0));
    const dec = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, enc);
    return JSON.parse(new TextDecoder().decode(dec));
}

// Global fetch override — intercepts every api.php call, auto-decrypts transparently.
// All other files (auth.js, backend-state.js, adminpanel.js, etc.) need zero changes.
(function _installFetchInterceptor() {
    const _nativeFetch = window.fetch.bind(window);

    window.fetch = async function(input, init) {
        const urlStr = typeof input === 'string' ? input
                     : (input instanceof Request ? input.url : String(input));
        const res = await _nativeFetch(input, init);

        // Only intercept api.php responses
        if (!urlStr.includes('api.php')) return res;

        let bodyText;
        try { bodyText = await res.text(); } catch(e) { return res; }

        let finalText = bodyText;
        try {
            const raw = JSON.parse(bodyText);
            // Encrypted envelope: { e: base64ciphertext, i: base64iv }
            if (raw && typeof raw.e === 'string' && typeof raw.i === 'string') {
                const decrypted = await _decryptAPIPayload(raw);
                if (decrypted !== null) finalText = JSON.stringify(decrypted);
                // If decrypted is null (no key), fall through to plaintext
            }
            // Otherwise it's already plaintext JSON (login/cookie handshakes)
        } catch(e) { /* parse error — pass through as-is */ }

        return new Response(finalText, {
            status: res.status,
            statusText: res.statusText,
            headers: { 'Content-Type': 'application/json' }
        });
    };
})();


// ==========================================
// DOM VIDEO URL ENCRYPTION
// Video URLs are stored in the DOM as an encrypted blob, never as plaintext.
// A 32-byte random key is generated at page load and held only in JS memory.
// Inspect-element shows only: data-enc-url="T3JqXWFfQ2Nk..." — not the real URL.
// decryptURLFromDOM() recovers the URL in memory right before playback.
// ==========================================

const _DOM_ENC_KEY = crypto.getRandomValues(new Uint8Array(32));

function encryptURLForDOM(url) {
    if (!url) return '';
    const bytes = new TextEncoder().encode(url);
    const enc   = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) enc[i] = bytes[i] ^ _DOM_ENC_KEY[i % _DOM_ENC_KEY.length];
    return btoa(String.fromCharCode(...enc));
}

function decryptURLFromDOM(encoded) {
    if (!encoded) return '';
    try {
        const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
        const dec   = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) dec[i] = bytes[i] ^ _DOM_ENC_KEY[i % _DOM_ENC_KEY.length];
        return new TextDecoder().decode(dec);
    } catch(e) { return ''; }
}
