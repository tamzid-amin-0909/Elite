// ==========================================
// 9. INIT APP
// ==========================================

let _sessionPollInterval = null;
function startSessionPoller() {
    if (_sessionPollInterval) return;
    _sessionPollInterval = setInterval(async () => {
        if (!currentUser) { clearInterval(_sessionPollInterval); _sessionPollInterval = null; return; }
        await validateTokenWithServer();
    }, 10000);
}

async function initApp() {
    let attempt = 0;
    const delays = [1000, 2000, 3000, 5000, 5000, 8000, 8000, 10000];

    async function boot() {
        attempt++;
        try {
            db = await fetchFreshDB();
        } catch (e) {
            console.warn(`Boot attempt ${attempt} failed (network):`, e);
            if (attempt <= delays.length) {
                const delay = delays[attempt - 1];
                showRetryOverlay(attempt, delays.length, delay);
                setTimeout(boot, delay);
            } else {
                showRetryOverlay(attempt, delays.length, 0, true);
            }
            return;
        }

        const overlay = document.getElementById('boot-retry-overlay');
        if (overlay) overlay.remove();

        try {
            const authToken = localStorage.getItem('authToken');
            if (authToken) {
                const valid = await validateTokenWithServer();
                if (valid === false) return;
            }

            if (!currentUser) {
                const cookie = getRememberCookie();
                if (cookie) {
                    try {
                        const res = await fetch('api.php?action=auth&type=cookie', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: cookie.userId, rememberToken: cookie.token, deviceId: getDeviceId() })
                        });
                        if (res.ok) {
                            const data = await res.json();
                            localStorage.setItem('authToken', data.token);
                            currentUser = data.user;
                            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                            db = await fetchFreshDB();
                        } else {
                            const err = await res.json().catch(() => ({}));
                            if (err.error !== 'device_locked') clearRememberCookie();
                            currentUser = null;
                            sessionStorage.removeItem('currentUser');
                            localStorage.removeItem('authToken');
                        }
                    } catch(e) { /* network blip */ }
                }
            }

            applyTheme();
            if (db.content) precacheThumbnails(db.content).catch(() => {});

            // TG channel gate — only for Telegram-login users.
            // Password-login users skip entirely (checked inside checkTgChannelMembership).
            if (currentUser?.isTelegramUser) {
                const passed = await checkTgChannelMembership();
                if (!passed) {
                    // Gate is showing — attach hashchange so recheck can navigate later
                    window.addEventListener('hashchange', render);
                    return;
                }
            }

            window.addEventListener('hashchange', render);
            render();
            if (currentUser) {
                startSessionPoller();
                if (typeof startTrialTimer === 'function') startTrialTimer();
            }

        } catch (e) {
            console.error('App boot error:', e);
        }
    }

    boot();
}

function showRetryOverlay(attempt, maxAttempts, nextDelay, final = false) {
    let overlay = document.getElementById('boot-retry-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'boot-retry-overlay';
        overlay.style.cssText = `position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);padding:1rem;`;
        document.body.appendChild(overlay);
    }
    const secs = Math.round(nextDelay / 1000);
    overlay.innerHTML = `
        <div style="background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:2rem 2.5rem;max-width:360px;width:100%;text-align:center;">
            <div style="width:52px;height:52px;margin:0 auto 1rem;border-radius:50%;background:rgba(245,158,11,0.15);display:flex;align-items:center;justify-content:center;">
                ${final
                    ? `<svg style="width:26px;height:26px;" fill="none" stroke="#ef4444" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`
                    : `<svg style="width:26px;height:26px;animation:spin 1s linear infinite;" fill="none" stroke="#f59e0b" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>`
                }
            </div>
            <h3 style="color:#f1f5f9;font-size:1rem;font-weight:700;margin-bottom:.4rem;">${final ? 'Connection Failed' : 'Connecting…'}</h3>
            <p style="color:#94a3b8;font-size:.8rem;line-height:1.6;margin-bottom:1.5rem;">${final ? 'Could not reach the server. Please check your connection.' : `Retrying in ${secs}s… (${attempt}/${maxAttempts})`}</p>
            <button onclick="window.location.reload()" style="width:100%;padding:.7rem 1rem;background:#f59e0b;color:#0f172a;font-weight:700;font-size:.85rem;border:none;border-radius:12px;cursor:pointer;">${final ? 'Reload Page' : 'Retry Now'}</button>
        </div>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
}

// ── CLIENT-SIDE TG CHANNEL MEMBERSHIP CHECK ───────────────────────────────────
// 1. Asks api.php for the bot token, tgUserId, and channel list (encrypted response).
// 2. Browser calls api.telegram.org directly — no server egress needed.
// 3. Gate shows only for TG users who genuinely haven't joined.
// 4. Non-TG (password) users skip entirely — never see the gate.
async function checkTgChannelMembership() {
    // Hard guard: password-login users never hit the gate
    if (!currentUser?.isTelegramUser) return true;

    const token = getAuthToken();
    if (!token) return true;

    let info;
    try {
        const res = await fetch(
            `api.php?action=check_tg_channels&token=${encodeURIComponent(token)}&_=${Date.now()}`,
            { cache: 'no-store' }
        );
        if (!res.ok) {
            console.warn('TG gate: server returned', res.status, '— skipping gate');
            return true; // server error → fail-open
        }
        const raw = await res.json();
        // Decrypt if the response is encrypted (has .e and .i fields)
        info = (typeof decryptResponse === 'function' && raw.e) ? decryptResponse(raw) : raw;
    } catch (e) {
        console.warn('TG gate: failed to reach api.php —', e.message, '— skipping gate');
        return true;
    }

    // Server said skip (not a TG user, no channels configured, no bot token)
    if (info.skip) return true;

    // Server returns mode:'client' with botToken + tgUserId + channels[]
    if (info.mode !== 'client' || !info.botToken || !info.tgUserId || !info.channels?.length) {
        return true;
    }

    return _runClientSideChannelCheck(info.botToken, info.tgUserId, info.channels);
}

// Calls api.telegram.org/getChatMember from the browser for each channel.
// Returns true (all joined) or false (gate shown).
async function _runClientSideChannelCheck(botToken, tgUserId, channels) {
    const notJoined = [];

    await Promise.all(channels.map(async (ch) => {
        let chatId = (ch.username || '').trim();
        if (!chatId) return;

        // Normalize t.me/xxx → @xxx
        if (chatId.includes('t.me/')) {
            chatId = '@' + chatId.replace(/.*t\.me\//, '').replace(/\/$/, '');
        }
        chatId = chatId.replace(/\/$/, '');
        if (chatId && chatId[0] !== '@' && !/^\d+$/.test(chatId)) chatId = '@' + chatId;

        const url = `https://api.telegram.org/bot${botToken}/getChatMember`
                  + `?chat_id=${encodeURIComponent(chatId)}&user_id=${encodeURIComponent(tgUserId)}`;
        try {
            const r    = await fetch(url, { cache: 'no-store' });
            const body = await r.json();
            if (!body.ok) {
                // Telegram returned an error (bot not admin, user never messaged bot, etc.)
                // Treat as "not joined" so the gate correctly shows the channel
                notJoined.push(ch);
                return;
            }
            const status = body.result?.status ?? 'left';
            const joined = ['member', 'administrator', 'creator'].includes(status);
            if (!joined) notJoined.push(ch);
        } catch (e) {
            // Browser couldn't reach api.telegram.org — fail-open for this channel
            console.warn('TG gate: browser fetch failed for', chatId, '—', e.message);
            // Do not push to notJoined (fail-open)
        }
    }));

    if (!notJoined.length) return true; // all joined ✓

    showTgChannelGate(notJoined);
    return false;
}

function showTgChannelGate(channels) {
    document.getElementById('tg-channel-gate')?.remove();

    const channelRows = channels.map(ch => {
        const link = ch.link || ch.username;
        const href = link.startsWith('http') ? link : `https://t.me/${link.replace(/^@/, '')}`;
        return `<a href="${href}" target="_blank" rel="noopener noreferrer"
            style="display:flex;align-items:center;gap:12px;padding:12px 16px;
                   background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
                   border-radius:14px;text-decoration:none;color:#fff;font-weight:700;font-size:14px;
                   transition:background .2s;cursor:pointer;"
            onmouseover="this.style.background='rgba(255,255,255,0.12)'"
            onmouseout="this.style.background='rgba(255,255,255,0.06)'">
            <svg style="width:22px;height:22px;flex-shrink:0;color:#29aae1;" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/>
            </svg>
            <span style="flex:1;">${ch.name || ch.username}</span>
            <svg style="width:14px;height:14px;opacity:.5;flex-shrink:0;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
            </svg>
        </a>`;
    }).join('');

    const gate = document.createElement('div');
    gate.id = 'tg-channel-gate';
    gate.style.cssText = 'position:fixed;inset:0;z-index:99997;display:flex;align-items:center;justify-content:center;background:rgba(8,10,18,0.97);backdrop-filter:blur(16px);padding:1rem;';
    gate.innerHTML = `
        <div style="background:rgba(15,22,36,0.99);border:1px solid rgba(255,255,255,0.1);
                    border-top:3px solid #29aae1;border-radius:24px;padding:28px 24px 24px;
                    max-width:400px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,0.8);">
            <div style="text-align:center;margin-bottom:20px;">
                <div style="width:56px;height:56px;background:rgba(41,170,225,0.15);border-radius:50%;
                            display:flex;align-items:center;justify-content:center;margin:0 auto 14px;">
                    <svg style="width:28px;height:28px;color:#29aae1;" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/>
                    </svg>
                </div>
                <h2 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 6px;">Join Our Channels</h2>
                <p style="color:#64748b;font-size:13px;margin:0;line-height:1.6;">You must join the following Telegram channels to access the site</p>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
                ${channelRows}
            </div>
            <button id="tg-recheck-btn" onclick="recheckTgChannels(this)"
                style="width:100%;padding:13px;background:#f59e0b;color:#1a1a1a;
                       font-weight:800;font-size:14px;border:none;border-radius:14px;cursor:pointer;
                       transition:opacity .2s;"
                onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
                ✅ I've Joined — Check Again
            </button>
            <p style="color:#334155;font-size:11px;text-align:center;margin-top:12px;line-height:1.5;">
                Click each channel above to join, then press the button to verify.
            </p>
        </div>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
    document.body.appendChild(gate);
}

// "I've Joined — Check Again" button handler
// Re-runs the full client-side check without another server round-trip
// (botToken/tgUserId are cached on the gate element via data attributes).
window.recheckTgChannels = async function(btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px;"><span style="width:14px;height:14px;border:2px solid rgba(0,0,0,.3);border-top-color:#000;border-radius:50%;animation:spin .6s linear infinite;display:inline-block;"></span>Checking…</span>';
    btn.disabled = true;

    try {
        const token = getAuthToken();
        // Re-fetch from server (gets fresh encrypted payload, validates session)
        const res = await fetch(
            `api.php?action=check_tg_channels&token=${encodeURIComponent(token)}&_=${Date.now()}`,
            { cache: 'no-store' }
        );
        if (!res.ok) throw new Error('Server error ' + res.status);
        const raw  = await res.json();
        const info = (typeof decryptResponse === 'function' && raw.e) ? decryptResponse(raw) : raw;

        if (info.skip) {
            // Shouldn't happen mid-session, but handle gracefully
            document.getElementById('tg-channel-gate')?.remove();
            if (currentUser) startSessionPoller();
            if (typeof startTrialTimer === 'function') startTrialTimer();
            render();
            return;
        }

        if (info.mode !== 'client' || !info.botToken || !info.tgUserId || !info.channels?.length) {
            document.getElementById('tg-channel-gate')?.remove();
            if (currentUser) startSessionPoller();
            if (typeof startTrialTimer === 'function') startTrialTimer();
            render();
            return;
        }

        const passed = await _runClientSideChannelCheck(info.botToken, info.tgUserId, info.channels);
        if (passed) {
            document.getElementById('tg-channel-gate')?.remove();
            if (currentUser) startSessionPoller();
            if (typeof startTrialTimer === 'function') startTrialTimer();
            render();
        }
        // If not passed, _runClientSideChannelCheck already called showTgChannelGate()
    } catch (e) {
        console.error('Recheck error:', e);
        btn.innerHTML = orig;
        btn.disabled = false;
    }
};
