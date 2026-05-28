// ==========================================
// 3. BACKEND STATE
// ==========================================
let db = { settings: {}, content: {}, notices: [] };
let currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;
const app = document.getElementById('app-container');

let _lastDBFetchTime = 0;
const DB_THROTTLE_MS = 30000; // don't re-fetch home more than once per 30s

function getAuthToken() { return localStorage.getItem('authToken') || ''; }

async function fetchFreshDB() {
    const token = getAuthToken();
    const res = await fetch(`api.php?action=data&type=home&_=${Date.now()}${token ? '&token=' + token : ''}`, {
        cache: 'no-store'
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const payload = await res.json();

    // Extract currentUser — never store it inside db
    if (payload.currentUser) {
        currentUser = payload.currentUser;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        delete payload.currentUser;
    }
    delete payload.user; // strip legacy key

    db = payload;
    _lastDBFetchTime = Date.now();
    return payload;
}

async function fetchChildren(path) {
    try {
        const token = getAuthToken();
        const res = await fetch(
            `api.php?action=data&type=children&path=${encodeURIComponent(path)}&_=${Date.now()}${token ? '&token=' + token : ''}`,
            { cache: 'no-store' }
        );
        if (!res.ok) return {};
        return (await res.json()).children || {};
    } catch (e) { return {}; }
}

// validateTokenWithServer()
// Returns:
//   true  — token valid, user data matches sessionStorage
//   false — token expired / user deleted / session invalidated by admin
//           (forceLogout is called automatically in these cases)
//   null  — network error (don't log out — could be a blip)
async function validateTokenWithServer() {
    const token = getAuthToken();
    if (!token) return false;
    try {
        const res = await fetch(`api.php?action=auth&type=validate&token=${token}&_=${Date.now()}`, {
            cache: 'no-store'
        });

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));

            // Admin explicitly ended this session
            if (body.error === 'session_invalidated') {
                forceLogout(body.message || 'Your session was ended by an administrator. Please contact admin.');
                return false;
            }

            // Token expired or user deleted
            forceLogout('Your session has expired. Please log in again.');
            return false;
        }

        const data = await res.json();
        const srv = data.user; // { id, role, access }

        if (srv && currentUser) {
            // Compare every field the server considers authoritative.
            // Any change means the admin edited this account while the user
            // was active — force logout immediately.
            const roleChanged   = srv.role !== currentUser.role;
            const accessChanged = JSON.stringify((srv.access || []).slice().sort())
                               !== JSON.stringify((currentUser.access || []).slice().sort());

            // Device lock: server's lockedDevice is always the LAST device
            // that successfully logged in. If it no longer matches THIS device,
            // a second device has taken the lock — evict this session immediately.
            const myDeviceId    = typeof getDeviceId === 'function' ? getDeviceId() : null;
            const deviceEvicted = srv.lockedDevice && myDeviceId && srv.lockedDevice !== myDeviceId;

            if (deviceEvicted) {
                forceLogout('You were logged out because your account was signed in on another device.');
                return false;
            }

            if (roleChanged || accessChanged) {
                // Update in-memory and re-check — don't force logout for minor access changes
                currentUser = { ...currentUser, ...srv };
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                // Only force logout for role changes (admin -> student etc)
                if (roleChanged) {
                    forceLogout('Your account role was updated. Please log in again.');
                    return false;
                }
            }

            // No mismatch — keep sessionStorage fresh with the server copy
            currentUser = { ...currentUser, ...srv };
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        }

        return true;
    } catch (e) {
        // Network error — do NOT log out. Return null so the poller knows
        // to skip this tick rather than treating it as an invalidation.
        return null;
    }
}

// saveDB — ONLY used by manage-tab raw JSON editor. All other saves use patch endpoints.
async function saveDB() {
    applyTheme();
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    const payload = { ...db };
    delete payload.user; delete payload.currentUser; // strip ephemeral keys
    const res = await fetch('api.php?action=write&token=' + token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) { const e = await res.json().catch(()=>{}); throw new Error(e?.error || 'Save failed: ' + res.status); }
}

function applyTheme() {
    const t = db.settings || {};
    let s = document.getElementById('dynamic-theme');
    if (!s) { s = document.createElement('style'); s.id = 'dynamic-theme'; document.head.appendChild(s); }
    s.innerHTML = `
        body{background-color:${t.bg||'#000'}}
        .text-primary{color:${t.primary||'#00ffff'}!important}
        .bg-primary{background-color:${t.primary||'#00ffff'}!important}
        .border-primary{border-color:${t.primary||'#00ffff'}!important}
        .glass-panel{background:${t.panel||'rgba(0,0,0,0)'}}
        .bg-bgMain{background-color:${t.bg||'#000'}}
        .bg-panelMain{background-color:${t.panel||'rgba(0,0,0,0)'}}
        :root{--plyr-color-main:${t.primary||'#00ffff'}}`;
}

// ── THUMBNAIL CACHE ────────────────────────────────────────────────────────
const THUMB_CACHE = 'thumb-v1';
const THUMB_META  = 'thumbMeta';

async function precacheThumbnails(content) {
    if (!('caches' in window)) return;
    const urls = new Set(Object.values(content).map(i => i.thumbnail).filter(Boolean));
    if (!urls.size) return;
    let meta = {}; try { meta = JSON.parse(localStorage.getItem(THUMB_META)||'{}'); } catch(e){}
    const cache = await caches.open(THUMB_CACHE);
    // Evict removed URLs
    for (const old of Object.keys(meta)) if (!urls.has(old)) { await cache.delete(old).catch(()=>{}); delete meta[old]; }
    const newMeta = { ...meta };
    await Promise.allSettled([...urls].map(async url => {
        try {
            const existing = await cache.match(url);
            if (existing) {
                const head = await fetch(url, { method:'HEAD', cache:'no-store' }).catch(()=>null);
                if (head) {
                    const fp = (head.headers.get('content-length')||'') + '|' + (head.headers.get('last-modified')||'');
                    if (meta[url] && meta[url] !== fp) { await cache.delete(url); newMeta[url] = fp; } // stale — re-fetch below
                    else { newMeta[url] = fp; return; }
                } else return;
            }
            const r = await fetch(url, { cache:'force-cache' });
            if (r.ok) { await cache.put(url, r.clone()); newMeta[url] = (r.headers.get('content-length')||'')+'|'+(r.headers.get('last-modified')||''); }
        } catch(e) {}
    }));
    localStorage.setItem(THUMB_META, JSON.stringify(newMeta));
}

async function cacheSingleThumbnail(url) {
    if (!url || !('caches' in window)) return;
    try {
        const cache = await caches.open(THUMB_CACHE);
        if (await cache.match(url)) return;
        const r = await fetch(url, { cache:'force-cache' });
        if (r.ok) await cache.put(url, r.clone());
    } catch(e) {}
}
