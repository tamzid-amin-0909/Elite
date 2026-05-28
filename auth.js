// ==========================================
// AUTH — LOGIN, TELEGRAM, TRIAL TIMER
// ==========================================

// ── STANDARD LOGIN ───────────────────────────────────────────────────────────
window.handleLogin = async function(e) {
    e.preventDefault();
    const username = document.getElementById('userid').value.trim();
    const password = document.getElementById('password').value;
    const errEl    = document.getElementById('login-err');
    const btn      = e.target.querySelector('button[type="submit"]');
    const deviceId = typeof getDeviceId === 'function' ? getDeviceId() : 'unknown';

    if (!username || !password) { errEl.innerText = 'Username and password required'; return; }
    btn.disabled = true; btn.innerText = 'Signing in…'; errEl.innerText = '';

    try {
        const res  = await fetch('api.php?action=auth&type=login', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ username, password, deviceId })
        });
        const data = await res.json();
        if (!res.ok) {
            errEl.innerText = (res.status === 403 && data.daysLeft)
                ? `Device locked. Try again in ${data.daysLeft} day(s).`
                : (data.error || 'Login failed');
            btn.disabled = false; btn.innerText = 'Sign In'; return;
        }
        localStorage.setItem('authToken', data.token);
        currentUser = data.user;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        if (data.rememberToken) setRememberCookie(username, data.rememberToken);
        startSessionPoller();
        window.location.hash = ''; render();
    } catch(err) {
        errEl.innerText = 'Connection error. Please try again.';
        btn.disabled = false; btn.innerText = 'Sign In';
    }
};

// ── TELEGRAM CALLBACK (called by widget) ────────────────────────────────────
// This is the global callback the Telegram widget script calls with user data
window.onTelegramAuth = async function(tgUser) {
    const errEl   = document.getElementById('login-err');
    const btnWrap = document.getElementById('tg-btn-wrap');
    if (errEl)   errEl.innerText = '';
    if (btnWrap) btnWrap.innerHTML = `<div class="tg-loading">
        <div class="tg-spinner"></div><span style="color:#94a3b8;font-size:13px;">Verifying with Telegram…</span>
    </div>`;

    const deviceId = typeof getDeviceId === 'function' ? getDeviceId() : 'unknown';
    try {
        const res  = await fetch('api.php?action=auth&type=telegram', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ tgData: tgUser, deviceId })
        });
        const data = await res.json();
        if (!res.ok) {
            if (data.error === 'trial_expired') {
                // Show a prominent modal instead of inline error
                _showTrialExpiredBlocker(data.message || 'Your free trial has expired. Please contact the admin to purchase access.');
            } else {
                if (errEl) errEl.innerText = data.error || 'Telegram login failed';
            }
            if (btnWrap) _mountTgWidget(btnWrap);
            return;
        }
        localStorage.setItem('authToken', data.token);
        currentUser = data.user;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        startSessionPoller();
        // NOTE: do NOT set window.location.hash here — that fires hashchange → render()
        // before the gate check completes, causing the page to render without the gate.
        // Check TG channel membership FIRST, then navigate.
        if (typeof checkTgChannelMembership === 'function') {
            const passed = await checkTgChannelMembership();
            if (!passed) return; // gate is showing — recheckTgChannels will call render() on pass
        }
        // All channels joined — safe to navigate and start trial
        startTrialTimer();
        window.location.hash = '';
        render();
    } catch(err) {
        if (errEl) errEl.innerText = 'Connection error. Please try again.';
        if (btnWrap) _mountTgWidget(btnWrap);
    }
};

// Mount the official Telegram Login Widget script into a container
function _mountTgWidget(container) {
    const botName = db.settings?.telegramBotName || '';
    if (!botName) {
        container.innerHTML = `<div style="color:#f59e0b;font-size:12px;padding:6px 12px;background:rgba(245,158,11,.08);border-radius:8px;border:1px solid rgba(245,158,11,.2);">
            ⚠️ Bot username not configured — set it in Admin → Settings
        </div>`;
        return;
    }

    // Remove any existing TG widget script to allow re-mounting
    const existing = document.getElementById('tg-widget-script');
    if (existing) existing.remove();

    container.innerHTML = ''; // Clear loading placeholder

    const script = document.createElement('script');
    script.id = 'tg-widget-script';
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;
    script.onerror = () => {
        container.innerHTML = `<div style="color:#ef4444;font-size:12px;">Failed to load Telegram widget.</div>`;
    };
    container.appendChild(script);
}

// ── TRIAL EXPIRED BLOCKER (shown on login attempt, not after countdown) ─────
function _showTrialExpiredBlocker(msg) {
    // Remove any existing
    const existing = document.getElementById('trial-blocked-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'trial-blocked-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;animation:fadeIn .25s ease;';
    overlay.innerHTML = `
        <div style="background:#0f172a;border:1px solid rgba(255,255,255,.07);border-top:3px solid #ef4444;
                    border-radius:24px;padding:40px 32px;max-width:360px;width:100%;text-align:center;">
            <div style="width:60px;height:60px;background:rgba(239,68,68,.1);border-radius:50%;
                        display:flex;align-items:center;justify-content:center;margin:0 auto 18px;">
                <svg width="26" height="26" fill="#ef4444" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                </svg>
            </div>
            <h2 style="color:#fff;font-size:20px;font-weight:800;margin-bottom:8px;">Free Trial Expired</h2>
            <p style="color:#64748b;font-size:14px;line-height:1.7;margin-bottom:28px;">${msg}</p>
            <button onclick="document.getElementById('trial-blocked-overlay').remove();"
                style="background:#f59e0b;color:#0f172a;font-weight:800;padding:12px 28px;
                       border-radius:12px;border:none;cursor:pointer;font-size:14px;width:100%;">
                OK
            </button>
        </div>`;
    document.body.appendChild(overlay);
}

// ── TRIAL TIMER ──────────────────────────────────────────────────────────────
let _trialTimerInterval = null;

window.startTrialTimer = function() {
    if (!isTrialUser()) return;
    _clearTrialTimer();
    _renderTrialBadge(); // immediate render
    _trialTimerInterval = setInterval(() => {
        const trial = getTrialInfo();
        if (!trial || !trial.active) {
            _clearTrialTimer();
            _showTrialExpiredOverlay();
        } else {
            _renderTrialBadge();
        }
    }, 1000);
};

function _clearTrialTimer() {
    if (_trialTimerInterval) { clearInterval(_trialTimerInterval); _trialTimerInterval = null; }
    const b = document.getElementById('trial-countdown-badge');
    if (b) b.remove();
}

function _renderTrialBadge() {
    const trial = getTrialInfo();
    if (!trial) return;
    const totalSec  = Math.max(0, Math.floor(trial.remaining / 1000));
    const m         = Math.floor(totalSec / 60);
    const s         = totalSec % 60;
    const pct       = Math.min(100, (totalSec / ((db.settings?.trialMinutes || 8) * 60)) * 100);
    const urgent    = totalSec <= 60;
    const accent    = urgent ? '#ef4444' : '#f59e0b';

    let badge = document.getElementById('trial-countdown-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'trial-countdown-badge';
        document.body.appendChild(badge);

        if (!document.getElementById('trial-badge-style')) {
            const st = document.createElement('style');
            st.id = 'trial-badge-style';
            st.textContent = `
                #trial-countdown-badge {
                    position:fixed;bottom:24px;right:24px;z-index:9998;
                    background:rgba(15,23,42,0.97);border-radius:16px;
                    padding:14px 18px;min-width:160px;
                    box-shadow:0 8px 32px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.07);
                    backdrop-filter:blur(16px);
                    transition:border-color .3s;
                }
                @keyframes urgentPulse {
                    0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.5),0 8px 32px rgba(0,0,0,.6)}
                    50%{box-shadow:0 0 0 10px rgba(239,68,68,0),0 8px 32px rgba(0,0,0,.6)}
                }
                .tg-loading{display:flex;align-items:center;gap:8px;padding:6px 0;}
                .tg-spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,.15);border-top-color:#0088cc;border-radius:50%;animation:spin .7s linear infinite;}
                @keyframes spin{to{transform:rotate(360deg)}}
            `;
            document.head.appendChild(st);
        }
    }

    badge.style.animation     = urgent ? 'urgentPulse 1s infinite' : 'none';
    badge.style.borderTop     = `2px solid ${accent}`;
    badge.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
            <svg width="12" height="12" fill="${accent}" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
            <span style="color:${accent};font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;">Free Trial</span>
        </div>
        <div style="font-size:30px;font-weight:800;color:#fff;font-variant-numeric:tabular-nums;line-height:1;letter-spacing:-1px;margin-bottom:10px;">${m}<span style="font-size:20px;">:</span>${String(s).padStart(2,'0')}</div>
        <div style="height:3px;background:rgba(255,255,255,.07);border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${accent};border-radius:3px;transition:width 1s linear;"></div>
        </div>
        ${urgent ? `<div style="color:#ef4444;font-size:10px;font-weight:600;margin-top:8px;text-align:center;">⚡ Ending soon!</div>` : ''}`;
}

function _showTrialExpiredOverlay() {
    _clearTrialTimer();
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');

    const overlay = document.createElement('div');
    overlay.id = 'trial-expired-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:99999;display:flex;align-items:center;justify-content:center;animation:fadeIn .3s ease;';
    overlay.innerHTML = `
        <div style="background:#0f172a;border:1px solid rgba(255,255,255,.07);border-top:3px solid #ef4444;border-radius:24px;padding:44px 32px;max-width:380px;width:90%;text-align:center;">
            <div style="width:64px;height:64px;background:rgba(239,68,68,.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
                <svg width="28" height="28" fill="#ef4444" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
            </div>
            <h2 style="color:#fff;font-size:22px;font-weight:800;margin-bottom:8px;">Free Trial Ended</h2>
            <p style="color:#64748b;font-size:14px;line-height:1.7;margin-bottom:28px;">
                Your free trial has expired. Contact the admin to get full access to all courses.
            </p>
            <button onclick="document.getElementById('trial-expired-overlay').remove();render();"
                style="background:#f59e0b;color:#0f172a;font-weight:800;padding:13px 32px;border-radius:12px;border:none;cursor:pointer;font-size:15px;width:100%;transition:opacity .15s;"
                onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
                Return to Home
            </button>
        </div>`;
    document.body.appendChild(overlay);
    render();
}

// ── LOGIN PAGE ────────────────────────────────────────────────────────────────
function renderLoginForm() {
    document.getElementById('breadcrumb').innerHTML = `<span class="text-slate-400">Authentication</span>`;
    const botName   = db.settings?.telegramBotName || '';
    const trialMins = db.settings?.trialMinutes || 8;
    const hasTg     = !!botName;

    app.innerHTML = `
        <div class="flex items-center justify-center min-h-[65vh] fade-in px-4 py-10">
            <div class="w-full max-w-[420px]">
                <div class="glass-panel rounded-3xl shadow-2xl overflow-hidden">
                    <div class="h-1 bg-gradient-to-r from-primary via-primary to-primary/60 w-full"></div>
                    <div class="p-8 md:p-10">

                        <div class="text-center mb-8">
                            <h2 class="text-2xl md:text-3xl font-bold text-white mb-2">Welcome Back</h2>
                            <p class="text-slate-400 text-sm">Sign in to access your courses</p>
                        </div>

                        <p id="login-err" class="text-red-400 text-center text-sm font-semibold mb-4 min-h-[20px]"></p>

                        ${hasTg ? `
                        <div class="mb-6 p-4 rounded-2xl" style="background:rgba(0,136,204,0.07);border:1px solid rgba(0,136,204,0.2);">
                            <div class="flex items-center gap-2 mb-1">
                                <svg width="16" height="16" fill="#0088cc" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.01 9.471c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.28 14.607l-2.95-.924c-.642-.2-.654-.642.136-.953l11.527-4.448c.537-.194 1.006.131.569 1.966z"/></svg>
                                <span style="color:#0088cc;font-size:12px;font-weight:700;letter-spacing:.5px;">NEW USER? FREE TRIAL</span>
                            </div>
                            <p class="text-slate-400 text-xs mb-3">Login with Telegram and get <span class="text-primary font-bold">${trialMins} minutes free</span> to explore the platform.</p>
                            <div id="tg-btn-wrap" class="flex justify-center min-h-[46px] items-center">
                                <div class="tg-loading"><div class="tg-spinner"></div><span style="color:#64748b;font-size:12px;">Loading…</span></div>
                            </div>
                        </div>

                        <div class="flex items-center gap-3 mb-6">
                            <div class="flex-1 h-px bg-white/10"></div>
                            <span class="text-slate-600 text-xs font-bold tracking-wider">OR</span>
                            <div class="flex-1 h-px bg-white/10"></div>
                        </div>` : ''}

                        <form onsubmit="handleLogin(event)" class="space-y-4">
                            <div>
                                <label class="block text-slate-400 text-xs font-bold mb-1.5 uppercase tracking-wider">User ID</label>
                                <input type="text" id="userid" required autocomplete="username"
                                    class="w-full bg-bgMain border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition text-sm"
                                    placeholder="Enter your user ID">
                            </div>
                            <div>
                                <label class="block text-slate-400 text-xs font-bold mb-1.5 uppercase tracking-wider">Password</label>
                                <input type="password" id="password" required autocomplete="current-password"
                                    class="w-full bg-bgMain border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition text-sm"
                                    placeholder="Enter your password">
                            </div>
                            <button type="submit"
                                class="w-full bg-primary hover:opacity-90 text-slate-900 font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-95 text-sm mt-2">
                                Sign In →
                            </button>
                        </form>

                        <p class="text-center text-slate-600 text-xs mt-5">Contact admin to purchase course access.</p>
                    </div>
                </div>
            </div>
        </div>`;

    if (hasTg) {
        // Inject spinner styles early, then mount widget
        if (!document.getElementById('trial-badge-style')) {
            const st = document.createElement('style');
            st.id = 'trial-badge-style';
            st.textContent = `.tg-loading{display:flex;align-items:center;gap:8px;padding:4px 0;}.tg-spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,.15);border-top-color:#0088cc;border-radius:50%;animation:spin .7s linear infinite;}@keyframes spin{to{transform:rotate(360deg)}}`;
            document.head.appendChild(st);
        }
        const wrap = document.getElementById('tg-btn-wrap');
        if (wrap) _mountTgWidget(wrap);
    }
}

// ── LOGOUT ────────────────────────────────────────────────────────────────────
window.logout = async function() {
    const confirm = prompt('Type "logout" to confirm:');
    if (confirm !== 'logout') return;
    _clearTrialTimer();
    const token = localStorage.getItem('authToken');
    if (token) { try { await fetch('api.php?action=auth&type=logout&token=' + token, {method:'POST'}); } catch(e){} }
    localStorage.removeItem('authToken');
    clearRememberCookie();
    sessionStorage.removeItem('currentUser');
    currentUser = null;
    window.location.hash = ''; render();
};

function renderAccessDenied(title) {
    app.innerHTML = `<div class="flex items-center justify-center min-h-[50vh] fade-in text-center px-4">
        <div class="max-w-lg p-6 md:p-10 glass-panel rounded-3xl border-t-4 border-t-red-500">
            <div class="text-red-500 mb-4 flex justify-center"><svg class="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg></div>
            <h2 class="text-2xl font-bold text-white mb-2">Access Required</h2>
            <p class="text-slate-400 mb-6 text-sm">You don't have access to "<b>${title}</b>". Contact the admin to purchase access.</p>
            <button onclick="window.location.hash=''" class="px-6 py-3 bg-panelMain hover:bg-white/10 rounded-xl text-white font-bold transition border border-white/10 text-sm">← Return Home</button>
        </div>
    </div>`;
}
