// ==========================================
// 6. FORCE LOGOUT
// ==========================================
window.forceLogout = function(message) {
    // Wipe ALL local auth state so initApp won't restore the session
    localStorage.removeItem('authToken');
    localStorage.removeItem('sessionToken'); // legacy key
    sessionStorage.removeItem('currentUser');
    clearRememberCookie();
    currentUser = null;

    // Prevent calling forceLogout multiple times if already showing overlay
    if (document.getElementById('force-logout-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'force-logout-overlay';
    overlay.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4';
    overlay.innerHTML = `
        <div style="background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:24px;
                    padding:2rem 2.5rem;max-width:380px;width:100%;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,0.6);">
            <div style="width:56px;height:56px;background:rgba(239,68,68,0.15);border-radius:50%;
                        display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">
                <svg style="width:28px;height:28px;" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
            </div>
            <h3 style="color:#f1f5f9;font-size:1.1rem;font-weight:700;margin-bottom:.6rem;">Session Ended</h3>
            <p style="color:#94a3b8;font-size:.85rem;line-height:1.6;margin-bottom:1.5rem;">${message || 'You have been logged out.'}</p>
            <button id="fl-ok-btn"
                style="width:100%;padding:.75rem 1rem;background:#f59e0b;color:#0f172a;font-weight:700;
                       font-size:.9rem;border:none;border-radius:12px;cursor:pointer;">
                OK — Go to Login
            </button>
        </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Hard replace so back button can't return to protected page
    document.getElementById('fl-ok-btn').addEventListener('click', () => {
        window.location.replace(window.location.pathname);
    });
};
