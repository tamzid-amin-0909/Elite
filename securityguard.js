// ==========================================
// 7. SECURITY GUARDS
// ==========================================

// requireAdmin — returns true if admin OR subadmin. Does NOT force logout.
// Only called from admin panel UI — a subadmin IS allowed in the panel.
function requireAdmin() {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'subadmin')) {
        // Not logged in at all, or a regular student — redirect to login
        if (!currentUser) {
            window.location.hash = '#login';
        }
        return false;
    }
    return true;
}

function isOwner() {
    return currentUser?.role === 'admin';
}

function isSubAdmin() {
    return currentUser?.role === 'subadmin';
}

// Check if current user has a given base permission key
function subAdminCan(perm) {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'subadmin') {
        const perms = currentUser.subAdminPerms || [];
        if (perms.includes('all') || perms.includes('content:all')) return true;
        // For 'content': check any content: prefix
        if (perm === 'content') return perms.some(p => p.startsWith('content:'));
        // For 'access': check any access: prefix
        if (perm === 'access') return perms.some(p => p.startsWith('access:'));
        return perms.includes(perm);
    }
    return false;
}

// Check if subadmin can edit a specific content root slug
function subAdminCanEditContent(slug) {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'subadmin') {
        const perms = currentUser.subAdminPerms || [];
        if (perms.includes('all') || perms.includes('content:all')) return true;
        if (!slug) return false;
        return perms.some(p => p === `content:${slug}` || p === `content:${slug.split('/')[0]}`);
    }
    return false;
}

function validateSession() {
    return !!currentUser;
}

// ── TRIAL HELPERS ──────────────────────────────────────────────────────────

function getTrialInfo() {
    if (!currentUser) return null;
    if (!currentUser.trialEnd) return null;
    const now       = Date.now();
    const end       = currentUser.trialEnd;
    const remaining = end - now;
    return { active: remaining > 0, remaining, end, expired: remaining <= 0 };
}

function isTrialUser() {
    return currentUser?.isTelegramUser === true && currentUser?.trialEnd != null;
}

function hasContentAccess(subjectSlug) {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'subadmin') return subAdminCanEditContent(subjectSlug);
    const access = currentUser.access || [];
    if (access.includes('all')) return true;
    if (access.includes(subjectSlug)) return true;
    // Check live trial
    const trial = getTrialInfo();
    if (trial && trial.active && isTrialUser()) {
        const trialAccess = window.db?.settings?.trialAccess || [];
        if (trialAccess.includes('all') || trialAccess.includes(subjectSlug)) return true;
    }
    return false;
}
