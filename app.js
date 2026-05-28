// ==========================================
// 16. BOOTSTRAP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();

    // Session check every 10 seconds
    // Calls /auth/validate; on 401 shows forceLogout modal.
    // On role/access change also logs out so stale permissions can't be used.
    setInterval(async () => {
        if (!currentUser) return;
        const token = getAuthToken();
        if (!token) return;
        try {
            const res = await fetch(`api.php?action=auth&type=validate&token=${encodeURIComponent(token)}&_=${Date.now()}`, {
                cache: 'no-store',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.status === 401) {
                const err = await res.json().catch(() => ({}));
                forceLogout(err.message || err.error || 'Your session has expired.');
                return;
            }
            if (res.ok) {
                const data = await res.json();
                const s = data.user;
                if (s && currentUser && (
                    s.id !== currentUser.id ||
                    s.role !== currentUser.role ||
                    JSON.stringify(s.access) !== JSON.stringify(currentUser.access)
                )) {
                    forceLogout('Your account settings changed. Please log in again.');
                }
            }
        } catch(e) { /* network blip — retry in 10s */ }
    }, 10000);
});
