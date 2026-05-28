// ==========================================
// 4. REMEMBER ME — COOKIE HELPERS
// Stores userId + rememberToken in a 30-day cookie so the
// user is auto-logged-in every time they visit the site.
// The token is also stored in db.users[id].rememberToken so
// server-side it can be validated and invalidated at any time.
// ==========================================
function setRememberCookie(userId, token) {
    const age = 30 * 24 * 60 * 60; // 30 days in seconds
    document.cookie = `rm_uid=${encodeURIComponent(userId)}; max-age=${age}; path=/; SameSite=Strict`;
    document.cookie = `rm_tok=${token}; max-age=${age}; path=/; SameSite=Strict`;
}
function clearRememberCookie() {
    document.cookie = 'rm_uid=; max-age=0; path=/; SameSite=Strict';
    document.cookie = 'rm_tok=; max-age=0; path=/; SameSite=Strict';
}
function getRememberCookie() {
    const jar = {};
    document.cookie.split(';').forEach(c => {
        const [k, ...v] = c.trim().split('=');
        jar[k] = decodeURIComponent(v.join('='));
    });
    return (jar.rm_uid && jar.rm_tok) ? { userId: jar.rm_uid, token: jar.rm_tok } : null;
}
