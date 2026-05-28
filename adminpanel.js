// ==========================================
// ADMIN PANEL — PATCH HELPERS
// All writes use surgical patch endpoints. saveDB() is NEVER called here.
// ==========================================

// ── Short-lived cache so tab-switches don't re-fetch unnecessarily ──────────
// Mutations always update db.* in-memory immediately (optimistic) and bust
// the cache so the next forced-fetch gets real data.
let _adminCache = null, _adminCacheAt = 0;
const ADMIN_CACHE_TTL = 8000; // ms
let adminUserFilter = 'all';

window.setAdminUserFilter = function(filter) {
    adminUserFilter = filter;
    const view = document.getElementById('admin-view-area');
    if (view) _renderUsersTable(view);
};

// fetchAdminDB(force, slim)
// slim=true (default): only fetches users+settings+notices — fast, no content blob
// slim=false: fetches full DB including content — only needed for manage/ACS tabs
async function fetchAdminDB(force = false, slim = true) {
    const cacheKey = slim ? 'slim' : 'full';
    if (!force && _adminCache?.[cacheKey] && (Date.now() - _adminCacheAt) < ADMIN_CACHE_TTL) {
        return _adminCache[cacheKey];
    }
    const token   = getAuthToken();
    const slimParam = slim ? '&slim=1' : '';
    const res = await fetch(`api.php?action=read&token=${token}${slimParam}&_=${Date.now()}`, { cache: 'no-store' });
    if (res.status === 401) { forceLogout('Your session has expired. Please log in again.'); throw new Error('Session expired'); }
    if (res.status === 403) { throw new Error('Permission denied'); }
    if (!res.ok) throw new Error('Failed: ' + res.status);
    const full = await res.json();
    // Merge into in-memory db selectively
    if (full.users)    db.users    = full.users;
    if (full.settings) db.settings = full.settings;
    if (full.notices)  db.notices  = full.notices;
    if (full.content)  db.content  = full.content;
    if (!_adminCache) _adminCache = {};
    _adminCache[cacheKey] = full;
    _adminCacheAt = Date.now();
    return full;
}

function _bustAdminCache() { _adminCache = null; }

async function patchServer(type, data) {
    const token = getAuthToken();
    const res = await fetch(`api.php?action=patch&type=${type}&token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (res.status === 401) { forceLogout('Your session has expired. Please log in again.'); throw new Error('Session expired'); }
    if (!res.ok) { const e = await res.json().catch(()=>{}); throw new Error(e?.error || 'Failed: ' + res.status); }
    return res.json();
}
async function patchUser(userId, data) { return patchServer('user', { userId, data }); }

// deleteUserServer removed — patchServer('deleteuser', { userId }) is used directly

function showAdminToast(msg, isError = false) {
    const t = document.createElement('div');
    t.className = `fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl font-bold text-sm shadow-2xl transition
        ${isError ? 'bg-red-600 text-white' : 'bg-emerald-500 text-slate-900'}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

// ==========================================
// 15. ADMIN DASHBOARD
// ==========================================
function renderAdmin() {
    if (!requireAdmin()) return;
    document.getElementById('breadcrumb').innerHTML = `<span class="text-primary">Admin Control</span>`;
    document.getElementById('breadcrumb-mobile').innerHTML = '';

    const owner = isOwner();
    const canUsers   = subAdminCan('users');
    const canContent = isOwner() || (currentUser?.subAdminPerms || []).some(p => p === 'all' || p === 'content:all' || p.startsWith('content:'));
    const canNotices = subAdminCan('notices');
    const canSettings= owner; // only owner
    const canManage  = owner;
    const canSubAdmin= owner;
    const canBanners = owner || subAdminCan('banners');
    const canSocial  = owner || subAdminCan('banners'); // same permission covers social

    const tabCls = 'admin-tab shrink-0 text-xs md:text-sm lg:text-base w-auto lg:w-full text-center lg:text-left px-3 py-2 md:px-4 md:py-3 rounded-xl font-bold transition';
    let tabs = '';
    if (canUsers)    tabs += `<button onclick="switchAdminTab('users')"        class="${tabCls}" id="tab-users">👤 Users</button>`;
    if (canNotices)  tabs += `<button onclick="switchAdminTab('notices')"      class="${tabCls}" id="tab-notices">📢 Notices</button>`;
    if (canBanners)  tabs += `<button onclick="switchAdminTab('tgchannels')"   class="${tabCls}" id="tab-tgchannels">📣 TG Channels</button>`;
    if (canBanners)  tabs += `<button onclick="switchAdminTab('banners')"      class="${tabCls}" id="tab-banners">🖼️ Banners</button>`;
    if (canSocial)   tabs += `<button onclick="switchAdminTab('social')"       class="${tabCls}" id="tab-social">🔗 Social</button>`;
    if (canSettings) tabs += `<button onclick="switchAdminTab('theme')"        class="${tabCls}" id="tab-theme">⚙️ Settings</button>`;
    if (canManage)   tabs += `<button onclick="switchAdminTab('manage')"       class="${tabCls}" id="tab-manage">📊 Manage</button>`;
    if (canSubAdmin) tabs += `<button onclick="switchAdminTab('subadmins')"    class="${tabCls}" id="tab-subadmins">🛡️ Sub-Admins</button>`;
    if (canSettings) tabs += `<button onclick="switchAdminTab('trial')"        class="${tabCls}" id="tab-trial">🎁 Free Trial</button>`;

    const roleLabel = isSubAdmin() ? `<div class="px-3 py-1.5 bg-violet-500/20 text-violet-300 rounded-lg text-xs font-bold border border-violet-500/30 mb-3">Sub-Admin</div>` : '';

    app.innerHTML = `
        <div class="max-w-6xl mx-auto fade-in">
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
                <div class="glass-panel rounded-3xl p-3 md:p-4 lg:col-span-1 h-fit md:sticky top-24 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible hide-scrollbar">
                    <div class="hidden lg:block px-2 mb-2">
                        <h3 class="text-lg font-bold text-white mb-1">Admin Panel</h3>
                        ${roleLabel}
                    </div>
                    ${tabs}
                </div>
                <div class="glass-panel rounded-3xl p-4 md:p-8 lg:col-span-3 min-h-[60vh] overflow-x-hidden" id="admin-view-area"></div>
            </div>
        </div>`;

    const adminView = document.getElementById('admin-view-area');
    if (canUsers)        switchAdminTab('users');
    else if (canNotices) switchAdminTab('notices');
    else if (canBanners) switchAdminTab('banners');
    else if (canSettings) switchAdminTab('theme');
    else if (canManage) switchAdminTab('manage');
    else if (canSubAdmin) switchAdminTab('subadmins');
    else if (canContent && adminView) renderSubAdminContentInfo(adminView);
    else if (adminView) adminView.innerHTML = `<div class="text-center py-20 text-slate-400">No admin panels are available for your account. Contact the owner or use the content editor.</div>`;
}

const TAB_ACTIVE   = 'admin-tab shrink-0 text-xs md:text-sm lg:text-base w-auto lg:w-full text-center lg:text-left px-3 py-2 md:px-4 md:py-3 rounded-xl font-bold lg:mb-2 bg-primary text-slate-900 shadow-lg transition';
const TAB_INACTIVE = 'admin-tab shrink-0 text-xs md:text-sm lg:text-base w-auto lg:w-full text-center lg:text-left px-3 py-2 md:px-4 md:py-3 rounded-xl font-bold lg:mb-2 text-slate-400 hover:bg-white/5 transition';

window.switchAdminTab = function(tab) {
    if (!requireAdmin()) return;
    document.querySelectorAll('.admin-tab').forEach(b => b.className = TAB_INACTIVE);
    const tabEl = document.getElementById(`tab-${tab}`);
    if (tabEl) tabEl.className = TAB_ACTIVE;
    const view = document.getElementById('admin-view-area');
    if (!view) return;
    if (tab === 'users')      renderAdminUsers(view);
    else if (tab === 'theme')      renderAdminTheme(view);
    else if (tab === 'notices')    renderAdminNotices(view);
    else if (tab === 'manage')     renderAdminManage(view);
    else if (tab === 'subadmins')  renderAdminSubAdmins(view);
    else if (tab === 'trial')      renderAdminTrial(view);
    else if (tab === 'banners')     renderAdminBanners(view);
    else if (tab === 'social')      renderAdminSocial(view);
    else if (tab === 'tgchannels')  renderAdminTgChannels(view);
};

// Sub-admin content info tab — shown when subadmin has content perms but no users perm
function renderSubAdminContentInfo(view) {
    if (!requireAdmin()) return;
    const perms = currentUser.subAdminPerms || [];
    const contentPerms = perms.filter(p => p.startsWith('content:')).map(p => {
        const slug = p.slice(8);
        return slug === 'all' ? '🎬 All Sections' : `🎬 ${slug.replace(/_/g,' ')}`;
    });
    view.innerHTML = `
        <div class="text-center py-10">
            <div class="w-16 h-16 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
            </div>
            <h2 class="text-xl font-bold text-white mb-2">Content Editor Access</h2>
            <p class="text-slate-400 text-sm mb-6 max-w-sm mx-auto">You have been granted permission to edit specific content sections. Use the ACS editor to manage course content.</p>
            <div class="flex flex-wrap gap-2 justify-center mb-8">
                ${contentPerms.map(p => `<span class="px-3 py-1.5 bg-violet-500/15 text-violet-300 rounded-lg text-sm font-bold border border-violet-500/20">${p}</span>`).join('')}
            </div>
            <a href="#acs" class="inline-flex items-center gap-2 bg-primary text-slate-900 font-bold px-6 py-3 rounded-xl hover:opacity-90 transition text-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                Open Content Editor
            </a>
        </div>`;
}

// ── USERS TAB ──────────────────────────────────────────────────────────────

// Pure sync render from in-memory db.users — no network, instant.
function _renderUsersTable(view) {
    const now = Date.now(), sev = 3*24*60*60*1000;
    let rows = '';
    const allUsers = isSubAdmin()
        ? Object.entries(db.users || {}).filter(([,u]) => u.createdBy === currentUser.id)
        : Object.entries(db.users || {});
    const users = allUsers.filter(([,u]) => {
        if (adminUserFilter === 'tg') return !!u.isTelegramUser;
        if (adminUserFilter === 'normal') return !u.isTelegramUser;
        return true;
    });
    const tgCount = allUsers.filter(([,u]) => !!u.isTelegramUser).length;
    const normalCount = allUsers.filter(([,u]) => !u.isTelegramUser).length;
    for (const [id, data] of users) {
        let lock = `<span class="text-slate-500 text-[10px]">None</span>`;
        if (data.lockedDevice && data.deviceLockTime) {
            const days = Math.ceil((sev - (now - data.deviceLockTime)) / 86400000);
            if (days > 0) lock = `<span class="text-rose-400 text-[10px] font-bold">Locked (${days}d)</span><br>
                <button onclick="resetDevice('${id}')" class="text-[9px] bg-white/10 px-1 py-0.5 mt-1 rounded hover:bg-white/20">Reset</button>`;
        }
        // Role badge
        let roleBadge;
        if (data.role === 'admin') roleBadge = `<span class="px-1.5 py-1 rounded text-[9px] uppercase font-bold bg-rose-500/20 text-rose-300">Owner</span>`;
        else if (data.role === 'subadmin') roleBadge = `<span class="px-1.5 py-1 rounded text-[9px] uppercase font-bold bg-violet-500/20 text-violet-300">Sub-Admin</span>`;
        else roleBadge = `<span class="px-1.5 py-1 rounded text-[9px] uppercase font-bold bg-emerald-500/20 text-emerald-400">Student</span>`;

        // TG badge + trial info + reset button
        let tgBadge = '';
        if (data.isTelegramUser) {
            const trialExpired = data.trialEnd && (Date.now() > data.trialEnd);
            const trialStatus = data.trialEnd 
                ? (trialExpired 
                    ? `<span class="text-[9px] text-red-400 font-bold">Trial Expired</span>` 
                    : `<span class="text-[9px] text-emerald-400 font-bold">Trial Active</span>`)
                : '<span class="text-[9px] text-slate-500">No trial</span>';
            const resetBtn = isOwner()
                ? `<button onclick="adminResetTrial('${id}')" class="text-[9px] bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-1.5 py-0.5 rounded font-bold ml-1 transition">↺ Reset Trial</button>`
                : '';
            tgBadge = `<span class="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">TG</span> ${trialStatus}${resetBtn}`;
        }

        // Created by (subadmin tracking)
        let createdBy = '';
        if (data.createdBy) {
            createdBy = `<span class="text-[9px] text-slate-500">by <b class="text-violet-400">${data.createdBy}</b></span>`;
        }

        // Can edit/delete
        const canEdit = isOwner() || (isSubAdmin() && data.role === 'student');
        const canDel  = isOwner() || (isSubAdmin() && data.role === 'student');

        rows += `<tr class="border-b border-white/5 hover:bg-white/5 text-sm transition">
            <td class="p-2 md:p-3">
                <div class="font-bold text-white text-sm">${id}</div>
                <div class="flex items-center gap-1 mt-0.5">${tgBadge}</div>
                <div class="mt-0.5">${createdBy}</div>
            </td>
            <td class="p-2 md:p-3 text-slate-400 text-xs">${data.isTelegramUser ? '<span class="text-slate-600 italic">TG auth</span>' : (data.password || '')}</td>
            <td class="p-2 md:p-3">${roleBadge}</td>
            <td class="p-2 md:p-3">${lock}</td>
            <td class="p-2 md:p-3 text-right whitespace-nowrap">
                ${canEdit ? `<button onclick="openEditUser('${id}')" class="text-primary hover:text-white mr-1 md:mr-3 text-xs md:text-sm">Edit</button>` : ''}
                ${canDel  ? `<button onclick="adminDeleteUser('${id}')" class="text-red-400 hover:text-white text-xs md:text-sm" ${id==='admin'?'disabled':''}>Del</button>` : ''}
            </td></tr>`;
    }
    view.innerHTML = `
        <div class="flex justify-between items-center mb-4 md:mb-6 flex-wrap gap-2">
            <div>
                <h2 class="text-xl md:text-2xl font-bold text-white">User Database</h2>
                <div class="text-slate-500 text-xs mt-1">Showing ${users.length} of ${allUsers.length} users</div>
            </div>
            <div class="flex flex-wrap gap-2 items-center text-xs">
                <button onclick="setAdminUserFilter('all')" class="px-3 py-1 rounded-xl border ${adminUserFilter==='all' ? 'bg-primary text-slate-900 border-transparent' : 'bg-white/5 text-slate-400 border-white/10'} transition">All (${allUsers.length})</button>
                <button onclick="setAdminUserFilter('tg')" class="px-3 py-1 rounded-xl border ${adminUserFilter==='tg' ? 'bg-blue-500 text-slate-900 border-transparent' : 'bg-white/5 text-slate-400 border-white/10'} transition">TG (${tgCount})</button>
                <button onclick="setAdminUserFilter('normal')" class="px-3 py-1 rounded-xl border ${adminUserFilter==='normal' ? 'bg-white text-slate-900 border-transparent' : 'bg-white/5 text-slate-400 border-white/10'} transition">Normal (${normalCount})</button>
                <button onclick="(async()=>{const v=document.getElementById('admin-view-area');if(v){v.innerHTML='<div class=\'flex items-center justify-center py-20 text-slate-400 text-sm\'>Refreshing…</div>';try{await fetchAdminDB(true,true);_renderUsersTable(v);}catch(e){showAdminToast('Refresh failed',true);}}})()" 
                    class="bg-white/5 text-slate-400 hover:bg-white/10 px-2 py-1 rounded border border-white/5 transition flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    Refresh
                </button>
            </div>
        </div>
        <div class="overflow-x-auto bg-bgMain rounded-2xl border border-white/10 w-full">
            <table class="w-full text-left border-collapse min-w-[500px]">
                <thead><tr class="bg-panelMain text-slate-300 text-[10px] md:text-xs uppercase tracking-wider">
                    <th class="p-3 md:p-4">User</th><th class="p-3 md:p-4">Pass</th><th class="p-3 md:p-4">Role</th><th class="p-3 md:p-4">Lock</th><th class="p-3 md:p-4"></th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        ${subAdminCan('users') ? `
        <form onsubmit="handleNewUser(event)" class="mt-6 md:mt-8 flex flex-col sm:flex-row gap-2 md:gap-3 p-3 md:p-4 bg-panelMain rounded-2xl border border-white/10">
            <input type="text" id="nu_id" placeholder="New User ID" required class="flex-1 bg-bgMain border border-white/10 rounded-lg p-2.5 text-white text-xs md:text-sm">
            <input type="text" id="nu_pass" placeholder="Password" required class="flex-1 bg-bgMain border border-white/10 rounded-lg p-2.5 text-white text-xs md:text-sm">
            <button type="submit" class="bg-primary text-slate-900 font-bold px-4 py-2.5 rounded-lg text-xs md:text-sm">Add Student</button>
        </form>` : ''}`;
}

// Fetches ONLY if db.users isn't populated yet (slim=true — fast), then renders from memory.
async function renderAdminUsers(view) {
    if (!requireAdmin()) return;
    if (!db.users) {
        view.innerHTML = `<div class="flex items-center justify-center py-20 text-slate-400 text-sm"><div class="animate-spin w-5 h-5 border-2 border-white/20 border-t-primary rounded-full mr-3"></div>Loading users…</div>`;
        try { await fetchAdminDB(true, true); }  // slim=true
        catch(err) { view.innerHTML = `<div class="text-rose-400 text-center p-10">Failed to load users: ${err.message}</div>`; return; }
    }
    _renderUsersTable(view);
}


// Reset TG free trial for a user
window.adminResetTrial = async function(id) {
    if (!isOwner()) return;
    const user = db.users?.[id];
    if (!user) return showAdminToast('User not found', true);
    const mins = db.settings?.trialMinutes || 8;
    if (!confirm(`Reset free trial for "${id}"?\nThis gives them a fresh ${mins}-minute trial.`)) return;
    try {
        const res = await patchServer('reset-trial', { userId: id });
        // Update in-memory
        if (db.users?.[id]) {
            db.users[id].trialEnd   = res.trialEnd;
            db.users[id].trialStart = res.trialEnd - (mins * 60 * 1000);
        }
        _bustAdminCache();
        const view = document.getElementById('admin-view-area');
        if (view) _renderUsersTable(view);
        showAdminToast(`Trial reset for "${id}" — ${mins} min restarted!`);
    } catch(e) { showAdminToast('Reset failed: ' + e.message, true); }
};

window.adminDeleteUser = async function(id) {
    if (!requireAdmin()) return;
    if (!confirm('Delete ' + id + '?')) return;
    try {
        await patchServer('deleteuser', { userId: id });
        if (db.users) delete db.users[id];
        _bustAdminCache();
        const view = document.getElementById('admin-view-area');
        if (view) _renderUsersTable(view); // instant in-place re-render
        showAdminToast('User deleted.');
    } catch(e) { showAdminToast('Delete failed: ' + e.message, true); }
};

window.handleNewUser = async function(e) {
    if (!requireAdmin()) return;
    e.preventDefault();
    const id   = document.getElementById('nu_id').value.trim();
    const pass = document.getElementById('nu_pass').value.trim();
    if (!id || !pass) return showAdminToast('ID and password required.', true);
    if (db.users?.[id]) return showAdminToast('ID already exists!', true);
    const user = { 
        password: pass, role: 'student', access: ['none'],
        ...(isSubAdmin() ? { createdBy: currentUser.id, createdAt: Date.now() } : {})
    };
    try {
        await patchUser(id, user);
        if (!db.users) db.users = {};
        db.users[id] = user;
        _bustAdminCache();
        const view = document.getElementById('admin-view-area');
        if (view) _renderUsersTable(view);
        showAdminToast(`User "${id}" created!`);
    } catch(e) { showAdminToast('Save failed: ' + e.message, true); }
};

// Reset device lock — uses in-memory db.users, no extra fetch
window.resetDevice = async function(id) {
    if (!requireAdmin()) return;
    const existing = db.users?.[id];
    if (!existing) return showAdminToast('User not found', true);
    const u = { ...existing, lockedDevice: null, deviceLockTime: null };
    try {
        await patchUser(id, u);
        db.users[id] = u;
        _bustAdminCache();
        const view = document.getElementById('admin-view-area');
        if (view) _renderUsersTable(view);
        showAdminToast('Device lock reset.');
    } catch(e) { showAdminToast('Reset failed: ' + e.message, true); }
};

// Open edit modal — reads directly from in-memory db.users, zero extra fetch
window.openEditUser = function(id) {
    if (!requireAdmin()) return;
    const user = db.users?.[id];
    if (!user) return showAdminToast('User not found — try refreshing.', true);

    const allSubjects = Object.keys(db.content || {});

    // Sub-admin can only grant access to subjects within their own access scope
    let allowedSubjects = allSubjects;
    if (isSubAdmin()) {
        const myPerms = currentUser.subAdminPerms || [];
        if (myPerms.includes('access:all')) {
            allowedSubjects = allSubjects; // can grant all
        } else {
            const accessSlugs = myPerms.filter(p => p.startsWith('access:')).map(p => p.slice(7));
            allowedSubjects = accessSlugs.length ? accessSlugs : [];
        }
    }

    const isAll = (user.access || []).includes('all');
    let subHtml = '';
    allowedSubjects.forEach(sub => {
        subHtml += `<label class="flex items-center space-x-3 text-sm text-slate-300">
            <input type="checkbox" class="eu_sub w-4 h-4 accent-primary" value="${sub}" ${!isAll && user.access.includes(sub) ? 'checked' : ''}>
            <span class="capitalize">${sub.replace(/_/g, ' ')}</span></label>`;
    });
    if (!allowedSubjects.length) {
        subHtml = `<p class="text-xs text-slate-500 italic">You don't have permission to grant any specific courses. Ask the main admin.</p>`;
    }

    // Only show "ALL ACCESS" option if owner or sub-admin with access:all
    const canGrantAll = isOwner() || (isSubAdmin() && (currentUser.subAdminPerms||[]).includes('access:all'));

    document.getElementById('modal-root').innerHTML = `
        <div class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4 fade-in">
            <div class="bg-bgMain border border-white/10 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative">
                <button onclick="closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                <h2 class="text-xl font-bold text-white mb-4">Edit: <span class="text-primary">${id}</span></h2>
                <form onsubmit="submitEditUser(event,'${id}')" class="space-y-4">
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="block text-xs text-slate-400 mb-1">Password</label>
                            <input type="text" id="eu_pass" value="${user.password}" class="w-full bg-panelMain border border-white/10 rounded-lg p-2 text-white text-sm"></div>
                        <div><label class="block text-xs text-slate-400 mb-1">Role</label>
                            <select id="eu_role" class="w-full bg-panelMain border border-white/10 rounded-lg p-2 text-white text-sm">
                                <option value="student"  ${user.role === 'student'  ? 'selected' : ''}>Student</option>
                                ${isOwner() ? `<option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>` : ''}
                            </select></div>
                    </div>
                    ${canGrantAll ? `<label class="flex items-center space-x-3 text-sm text-white p-2 bg-panelMain rounded-lg border border-primary/50 cursor-pointer">
                        <input type="checkbox" id="eu_all" class="w-4 h-4 accent-primary" ${isAll ? 'checked' : ''}>
                        <span class="font-bold">ALL ACCESS</span>
                    </label>` : `<input type="hidden" id="eu_all" value="">`}
                    <div class="border-t border-white/10 pt-3 space-y-2 max-h-40 overflow-y-auto">
                        <p class="text-[10px] text-slate-400 mb-2 uppercase tracking-wide">Grant specific subjects:</p>
                        ${subHtml}
                    </div>
                    <button type="submit" class="w-full bg-primary text-slate-900 font-bold py-2.5 rounded-xl mt-4 transition hover:opacity-90">Update Profile</button>
                </form>
            </div>
        </div>`;
};

// Save edit — uses in-memory db.users[id] as base, no extra fetch before save
window.submitEditUser = async function(e, id) {
    if (!requireAdmin()) return;
    e.preventDefault();

    const newRole = document.getElementById('eu_role').value;
    if (db.users?.[id] && newRole !== db.users[id].role) {
        const msg = newRole === 'admin'
            ? `⚠️ Grant ADMIN to "${id}"? This gives full control.`
            : `Demote "${id}" to student? They will be logged out.`;
        if (!confirm(msg)) return;
    }

    let access = [];
    const allCheckbox = document.getElementById('eu_all');
    if (allCheckbox && allCheckbox.type === 'checkbox' && allCheckbox.checked) {
        access = ['all'];
    } else {
        document.querySelectorAll('.eu_sub:checked').forEach(cb => access.push(cb.value));
        if (!access.length) access = ['none'];
    }

    // Sub-admin access scope enforcement — cannot grant access to courses outside their scope
    if (isSubAdmin()) {
        const myPerms = currentUser.subAdminPerms || [];
        const allowedSlugs = myPerms.includes('access:all')
            ? Object.keys(db.content || {})
            : myPerms.filter(p => p.startsWith('access:')).map(p => p.slice(7));
        // Keep existing access items that are outside the sub-admin's scope
        const existing = db.users?.[id]?.access || [];
        const outsideScope = existing.filter(a => a !== 'none' && a !== 'all' && !allowedSlugs.includes(a));
        access = [...new Set([...access.filter(a => a !== 'none'), ...outsideScope])];
        if (!access.length) access = ['none'];
    }

    // Use in-memory copy — no fetchAdminDB() before saving
    const existing = db.users?.[id] || {};
    const updated = {
        ...existing,
        password: document.getElementById('eu_pass').value,
        role: newRole,
        access,
        currentSession: 'INVALIDATED-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8),
        rememberToken: null
    };

    try {
        await patchUser(id, updated);
        if (!db.users) db.users = {};
        db.users[id] = updated;
        _bustAdminCache();
        closeModal();
        const view = document.getElementById('admin-view-area');
        if (view) _renderUsersTable(view);
        showAdminToast(`"${id}" updated!`);
    } catch(err) { showAdminToast('Save failed: ' + err.message, true); }
};

// ── SETTINGS TAB ───────────────────────────────────────────────────────────

// Uses in-memory db.settings — fetches only if not yet populated
async function renderAdminTheme(view) {
    if (!requireAdmin()) return;
    if (!db.settings || Object.keys(db.settings).length === 0) {
        view.innerHTML = `<div class="flex items-center justify-center py-20 text-slate-400 text-sm">Loading…</div>`;
        try { await fetchAdminDB(true, true); } catch(e) {}  // slim — settings only
    }
    _renderThemeForm(view);
}

function _renderThemeForm(view) {
    const parseRGBA = rgba => {
        const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!m) return { hex: '#1e293b', a: 0.7 };
        const hex = '#' + ((1<<24)+(+m[1]<<16)+(+m[2]<<8)+(+m[3])).toString(16).slice(1);
        return { hex, a: m[4] !== undefined ? parseFloat(m[4]) : 1 };
    };
    const p = parseRGBA(db.settings.panel || 'rgba(30,41,59,0.7)');
    const s = db.settings;

    view.innerHTML = `
        <div class="flex flex-wrap justify-between items-center mb-6 gap-2">
            <h2 class="text-xl md:text-2xl font-bold text-white">Platform Settings</h2>
            <button onclick="adminResetTheme()" class="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500/30 transition">Reset Theme</button>
        </div>
        <form onsubmit="adminSaveTheme(event)" class="space-y-5 max-w-lg">

            <!-- ── APPEARANCE ── -->
            <div class="bg-bgMain rounded-2xl border border-white/10 p-5">
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">🎨 Appearance</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-slate-300 font-bold mb-1.5 text-xs">Primary Accent</label>
                        <div class="flex items-center gap-3">
                            <input type="color" id="th_primary" value="${s.primary || '#f59e0b'}" oninput="this.nextElementSibling.value=this.value" class="w-10 h-10 rounded cursor-pointer bg-transparent border-none">
                            <input type="text" value="${s.primary || '#f59e0b'}" class="flex-1 bg-panelMain border border-white/10 rounded-lg p-2 text-white uppercase text-xs pointer-events-none">
                        </div>
                    </div>
                    <div>
                        <label class="block text-slate-300 font-bold mb-1.5 text-xs">Background</label>
                        <div class="flex items-center gap-3">
                            <input type="color" id="th_bg" value="${s.bg || '#0f172a'}" oninput="this.nextElementSibling.value=this.value" class="w-10 h-10 rounded cursor-pointer bg-transparent border-none">
                            <input type="text" value="${s.bg || '#0f172a'}" class="flex-1 bg-panelMain border border-white/10 rounded-lg p-2 text-white uppercase text-xs pointer-events-none">
                        </div>
                    </div>
                </div>
                <div>
                    <label class="block text-slate-300 font-bold mb-1.5 text-xs">Glass Panel (RGBA)</label>
                    <div class="bg-panelMain border border-white/10 rounded-lg p-3 space-y-3">
                        <div class="flex items-center gap-4">
                            <input type="color" id="rgba_hex" value="${p.hex}" oninput="updatePanelRGBA()" class="w-10 h-10 rounded cursor-pointer bg-transparent border-none">
                            <div class="flex-1">
                                <div class="flex justify-between text-[10px] text-slate-400 mb-1 uppercase font-bold">
                                    <span>Opacity</span><span id="rgba_alpha_label">${Math.round(p.a * 100)}%</span>
                                </div>
                                <input type="range" id="rgba_alpha" min="0" max="1" step="0.01" value="${p.a}" oninput="updatePanelRGBA()" class="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary">
                            </div>
                        </div>
                        <input type="text" id="th_panel" value="${s.panel || 'rgba(30,41,59,0.7)'}" readonly class="w-full bg-black/20 border border-white/5 rounded p-2 text-white text-xs font-mono">
                    </div>
                </div>
            </div>

            <!-- ── TELEGRAM INTEGRATION ── -->
            <div class="bg-bgMain rounded-2xl border border-white/10 p-5">
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">🤖 Telegram Integration</p>
                <div class="space-y-4">
                    <div>
                        <label class="block text-slate-300 font-bold mb-1 text-xs">Bot Token <span class="text-slate-500 font-normal">(from @BotFather)</span></label>
                        <p class="text-slate-500 text-[11px] mb-2">Used server-side to verify Telegram logins. Keep this secret.</p>
                        <input type="text" id="th_bot_token" value="${s.telegramBotToken || ''}"
                            placeholder="1234567890:AAXXXXXXXX…"
                            class="w-full bg-panelMain border border-white/10 rounded-lg px-3 py-2.5 text-white text-xs focus:border-primary outline-none font-mono">
                    </div>
                    <div>
                        <label class="block text-slate-300 font-bold mb-1 text-xs">Bot Username <span class="text-slate-500 font-normal">(without @)</span></label>
                        <p class="text-slate-500 text-[11px] mb-2">Shown as the Telegram login button label on the login page.</p>
                        <div class="flex items-center gap-2">
                            <span class="text-slate-500 text-sm">@</span>
                            <input type="text" id="th_bot_name" value="${s.telegramBotName || ''}"
                                placeholder="YourBotName"
                                class="flex-1 bg-panelMain border border-white/10 rounded-lg px-3 py-2.5 text-white text-xs focus:border-primary outline-none">
                        </div>
                    </div>
                    ${s.telegramBotName ? `<div class="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-400">
                        ✅ Telegram login button is <strong>active</strong> on the login page. Users logging in via @${s.telegramBotName} get a free trial.
                    </div>` : `<div class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-400">
                        ⚠️ Bot username not set — Telegram login button will not appear on the login page.
                    </div>`}
                </div>
            </div>

            <!-- ── OTHER ── -->
            <div class="bg-bgMain rounded-2xl border border-white/10 p-5">
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">⚙️ Other</p>
                <div>
                    <label class="block text-slate-300 font-bold mb-1.5 text-xs">Video Share Text</label>
                    <textarea id="th_share" rows="3" class="w-full bg-panelMain border border-white/10 rounded-lg p-3 text-white text-xs focus:border-primary outline-none resize-none">${s.shareText || ''}</textarea>
                </div>
            </div>

            <button type="submit" class="w-full bg-primary text-slate-900 font-bold py-3.5 rounded-xl hover:opacity-90 transition text-sm">
                💾 Save All Settings
            </button>
        </form>`;

    window.updatePanelRGBA = function() {
        const hex = document.getElementById('rgba_hex').value;
        const a   = document.getElementById('rgba_alpha').value;
        const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        document.getElementById('th_panel').value = `rgba(${r},${g},${b},${a})`;
        document.getElementById('rgba_alpha_label').innerText = Math.round(a * 100) + '%';
    };
}

window.adminSaveTheme = async function(e) {
    if (!requireAdmin()) return;
    e.preventDefault();
    const settings = {
        ...db.settings,
        primary:          document.getElementById('th_primary').value,
        bg:               document.getElementById('th_bg').value,
        panel:            document.getElementById('th_panel').value,
        shareText:        document.getElementById('th_share').value,
        telegramBotToken: document.getElementById('th_bot_token').value.trim(),
        telegramBotName:  document.getElementById('th_bot_name').value.trim().replace('@',''),
    };
    try {
        await patchServer('settings', settings);
        db.settings = settings;
        _bustAdminCache();
        applyTheme();
        showAdminToast('Settings saved!');
        // Re-render to update Telegram status badge
        const view = document.getElementById('admin-view-area');
        if (view) _renderThemeForm(view);
    } catch(e) { showAdminToast('Error: ' + e.message, true); }
};

window.adminResetTheme = async function() {
    if (!requireAdmin()) return;
    if (!confirm('Restore default colors?')) return;
    const settings = { ...db.settings, primary: '#f59e0b', bg: '#0f172a', panel: 'rgba(30,41,59,0.7)' };
    try {
        await patchServer('settings', settings);
        db.settings = settings;
        _bustAdminCache();
        applyTheme();
        const view = document.getElementById('admin-view-area');
        if (view) _renderThemeForm(view);
        showAdminToast('Theme reset!');
    } catch(e) { showAdminToast('Reset failed: ' + e.message, true); }
};


// ── NOTICES TAB ────────────────────────────────────────────────────────────

// Uses in-memory db.notices — fetches only if not yet populated
async function renderAdminNotices(view) {
    if (!requireAdmin()) return;
    if (!db.notices) {
        view.innerHTML = `<div class="flex items-center justify-center py-20 text-slate-400 text-sm">Loading…</div>`;
        try { await fetchAdminDB(); } catch(e) {}
    }
    _renderNoticesHTML(view);
}

function _renderNoticesHTML(view) {
    const list = (db.notices || []).map((n, i) => `
        <div class="flex justify-between items-center bg-bgMain p-3 md:p-4 rounded-xl border border-white/5 mb-3">
            <p class="text-xs md:text-sm text-white pr-2 leading-relaxed">${n}</p>
            <div class="shrink-0 flex gap-1.5 md:gap-2">
                <button onclick="editNotice(${i})" class="text-blue-400 hover:text-blue-300 bg-blue-400/10 px-2 py-1 md:px-3 rounded text-[10px] md:text-xs font-bold transition">Edit</button>
                <button onclick="adminDeleteNotice(${i})" class="text-red-400 hover:text-red-300 bg-red-400/10 px-2 py-1 md:px-3 rounded text-[10px] md:text-xs font-bold transition">Del</button>
            </div>
        </div>`).join('') || '<p class="text-slate-500 italic text-sm">No active notices.</p>';

    view.innerHTML = `
        <h2 class="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">Notice Broadcaster</h2>
        <form onsubmit="adminBroadcastNotice(event)" class="mb-6 md:mb-8 flex flex-col sm:flex-row gap-2">
            <input type="text" id="new_notice" required placeholder="Type a new top banner notice…" class="flex-grow bg-bgMain border border-white/10 rounded-xl p-3 text-white text-xs md:text-sm focus:border-primary outline-none">
            <button type="submit" class="bg-primary text-slate-900 font-bold px-6 py-3 rounded-xl text-xs md:text-sm">Broadcast</button>
        </form>
        <div>${list}</div>`;
}

window.editNotice = async function(i) {
    if (!requireAdmin()) return;
    const n = prompt('Edit notice:', (db.notices || [])[i]);
    if (n === null || !n.trim()) return;
    db.notices[i] = n.trim();
    try {
        await patchServer('notices', db.notices);
        _bustAdminCache();
        setupHeader();
        const view = document.getElementById('admin-view-area');
        if (view) _renderNoticesHTML(view);
        showAdminToast('Notice updated!');
    } catch(e) { showAdminToast('Save failed', true); }
};

window.adminBroadcastNotice = async function(e) {
    if (!requireAdmin()) return;
    e.preventDefault();
    const val = document.getElementById('new_notice').value.trim();
    if (!val) return;
    if (!db.notices) db.notices = [];
    db.notices.push(val);
    try {
        await patchServer('notices', db.notices);
        _bustAdminCache();
        setupHeader();
        const view = document.getElementById('admin-view-area');
        if (view) _renderNoticesHTML(view);
        showAdminToast('Notice broadcast!');
    } catch(e) { showAdminToast('Save failed', true); }
};

window.adminDeleteNotice = async function(i) {
    if (!requireAdmin()) return;
    db.notices.splice(i, 1);
    try {
        await patchServer('notices', db.notices);
        _bustAdminCache();
        setupHeader();
        const view = document.getElementById('admin-view-area');
        if (view) _renderNoticesHTML(view);
        showAdminToast('Notice deleted.');
    } catch(e) { showAdminToast('Save failed', true); }
};

// ==========================================
// COURSE MANAGER (Manage Tab)
// ==========================================
let courseDb = {};

async function fetchCourseData(forceFull = false) {
    const container = document.getElementById('treeContainer');
    if (container) container.innerHTML = `<div class="text-center py-20 text-slate-500 text-sm">Loading…</div>`;
    try {
        // Force a full DB fetch when requested so the manage tab has all content.
        const full = await fetchAdminDB(forceFull, forceFull ? false : undefined);
        courseDb = { ...full };
        delete courseDb.user; delete courseDb.currentUser;
        renderCourse();
    } catch(err) {
        if (container) container.innerHTML = `<div class="text-rose-400 text-center p-10 font-mono text-xs font-bold">Connection Failed: ${err.message}</div>`;
    }
}

function renderCourse() {
    const container = document.getElementById('treeContainer');
    if (!container) return;
    container.innerHTML = '';
    const frag = document.createDocumentFragment();
    Object.entries(courseDb).forEach(([k, v]) => frag.appendChild(buildCourseNode(k, v, [k])));
    container.appendChild(frag);
}

function buildCourseNode(key, val, path) {
    const isObj  = val !== null && typeof val === 'object';
    const pathStr = path.join('|');
    const node   = document.createElement('div');
    node.className = 'mb-0.5';
    const item   = document.createElement('div');
    item.className = 'node-item flex items-center p-1.5 rounded-lg cursor-pointer group';
    item.innerHTML = `
        <div class="w-6 h-6 flex items-center justify-center rounded-lg mr-2 flex-shrink-0 ${isObj ? 'bg-emerald-500/40' : 'bg-slate-800 text-slate-500'}">
            ${isObj ? `<svg id="icon-${pathStr}" class="w-3 h-3 transition-transform duration-150 -rotate-90" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>` : '•'}
        </div>
        <div class="text-[12px] flex-1 mr-2">
            <span class="text-slate-300 font-medium">${key}</span>
            <span class="ml-1 italic ${isObj ? 'text-slate-600 text-[9px] font-bold' : 'text-emerald-400'}">
                ${isObj ? `(${Object.keys(val).length})` : `"${String(val).substring(0, 60)}"`}
            </span>
        </div>
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="action-btn bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" data-action="copy" data-path="${pathStr}" title="Copy">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
            </button>
            <button class="action-btn bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" data-action="edit" data-path="${pathStr}" data-key="${key}" title="Edit">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button class="action-btn bg-purple-500/10 text-purple-400 hover:bg-purple-500/20" data-action="paste" data-path="${pathStr}" data-key="${key}" title="Paste into">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
            </button>
        </div>`;

    item.addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (btn) {
            e.stopPropagation();
            const p = btn.dataset.path.split('|');
            if (btn.dataset.action === 'copy') {
                const d = getNestedCourseData(p);
                if (navigator.clipboard) navigator.clipboard.writeText(JSON.stringify(d, null, 2)).then(() => showCourseToast('Copied'));
                else fallbackCopy(JSON.stringify(d, null, 2));
            } else if (btn.dataset.action === 'edit') {
                openCourseEditor(`Edit: ${btn.dataset.key}`, getNestedCourseData(p), p, false);
            } else if (btn.dataset.action === 'paste') {
                openCourseEditor(`Paste into: ${btn.dataset.key}`, {}, p, true);
            }
            return;
        }
        if (isObj) {
            const cb = node.querySelector(':scope > .children-block');
            if (cb) {
                const hidden = cb.classList.toggle('hidden');
                const ico = document.getElementById(`icon-${pathStr}`);
                if (ico) ico.style.transform = hidden ? 'rotate(-90deg)' : 'rotate(0deg)';
                if (!hidden && !cb.dataset.rendered) {
                    cb.dataset.rendered = '1';
                    Object.entries(val).forEach(([ck, cv]) => cb.appendChild(buildCourseNode(ck, cv, [...path, ck])));
                }
            }
        }
    });
    node.appendChild(item);
    if (isObj) { const cb = document.createElement('div'); cb.className = 'children-block hidden tree-line'; node.appendChild(cb); }
    return node;
}

function getNestedCourseData(arr) { return arr.reduce((o, k) => o?.[k], courseDb); }
function fallbackCopy(text) { const el = document.createElement('textarea'); el.value = text; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); showCourseToast('Copied'); }

function openCourseEditor(title, data, path, isPaste = false) {
    const modal = document.getElementById('courseModal'), ed = document.getElementById('courseEditor');
    if (!modal || !ed) return;
    document.getElementById('courseModalTitle').innerText = title;
    ed.value = isPaste ? '' : JSON.stringify(data, null, 2);
    modal.classList.remove('hidden');
    ed.focus();
    document.getElementById('courseSaveBtn').onclick = async () => {
        try {
            const parsed = JSON.parse(ed.value);
            updateCoursePath(path, parsed);
            const token = getAuthToken();
            const res = await fetch('api.php?action=write&token=' + token, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(courseDb)
            });
            if (res.ok) { showCourseToast('Saved ✓'); closeCourseModal(); _bustAdminCache(); fetchCourseData(); }
            else { const err = await res.json().catch(() => {}); alert('Save failed: ' + (err?.error || res.status)); }
        } catch(e) { alert('Invalid JSON format!'); }
    };
}
function updateCoursePath(path, val) { let c = courseDb; for (let i = 0; i < path.length - 1; i++) c = c[path[i]]; c[path[path.length - 1]] = val; }
function closeCourseModal() { const m = document.getElementById('courseModal'); if (m) m.classList.add('hidden'); }
function showCourseToast(msg) { const t = document.getElementById('courseToast'); if (!t) return; t.innerText = msg; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 1500); }

function renderAdminManage(view) {
    if (!requireAdmin()) return;
    view.innerHTML = `
        <div>
            <div class="max-w-4xl mx-auto">
                <header class="flex justify-between items-center mb-4 px-1">
                    <h1 class="text-lg font-extrabold text-white tracking-tighter">Course <span class="text-emerald-500">Architect</span></h1>
                    <button onclick="fetchCourseData(true)" title="Fetch full database" class="px-3 py-2 bg-white/5 rounded-xl border border-white/10 text-emerald-400 hover:scale-105 transition-all flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        <span class="text-[11px]">Fetch Full DB</span>
                    </button>
                </header>
                <div id="treeContainer" class="glass-panel rounded-2xl p-2 md:p-4 min-h-[500px] overflow-x-auto">
                    <div class="text-center py-20 text-slate-500 text-sm">Loading Database…</div>
                </div>
            </div>
            <div id="courseModal" class="fixed inset-0 z-50 flex items-center justify-center hidden bg-black/80 backdrop-blur-sm p-2 md:p-4">
                <div class="fixed inset-0" onclick="closeCourseModal()"></div>
                <div class="glass-panel w-full max-w-3xl rounded-2xl p-4 md:p-5 z-10 relative shadow-2xl">
                    <div class="flex justify-between items-center mb-3 md:mb-4">
                        <h2 id="courseModalTitle" class="text-[10px] font-bold uppercase tracking-widest text-emerald-400 font-mono">Editor</h2>
                        <button onclick="closeCourseModal()" class="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
                    </div>
                    <textarea id="courseEditor" class="w-full h-[55vh] md:h-[65vh] p-3 md:p-4 text-[12px] md:text-[13px] text-emerald-100 outline-none rounded-xl border border-white/10 focus:border-emerald-500/50" spellcheck="false" placeholder="Paste JSON here…" style="font-family:'Courier New',monospace;background:rgba(0,0,0,0.4)"></textarea>
                    <div class="flex justify-end gap-2 md:gap-3 mt-3 md:mt-5">
                        <button onclick="closeCourseModal()" class="px-4 md:px-5 py-2 text-slate-400 text-xs font-bold hover:text-white uppercase transition">Cancel</button>
                        <button id="courseSaveBtn" class="bg-emerald-600 hover:bg-emerald-500 px-6 md:px-8 py-2 rounded-xl text-xs font-bold text-white shadow-lg uppercase transition">Save Entry</button>
                    </div>
                </div>
            </div>
            <div id="courseToast" class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-2 rounded-full text-[10px] font-bold shadow-xl hidden z-50 uppercase tracking-widest"></div>
            <style>
                .node-item{transition:all .15s ease-out}.node-item:hover{background:rgba(255,255,255,.05)}
                .action-btn{padding:.375rem;border-radius:.375rem;cursor:pointer;transition:all .15s ease-out}
                .tree-line{border-left:1px solid rgba(255,255,255,.08);margin-left:.75rem;padding-left:.25rem}
            </style>
        </div>`;
    setTimeout(fetchCourseData, 100);
}

// ==========================================
// SUB-ADMIN MANAGEMENT (Owner only)
// ==========================================
async function renderAdminSubAdmins(view) {
    if (!isOwner()) { view.innerHTML = `<div class="text-rose-400 text-center p-10 text-sm">Owner access required.</div>`; return; }
    if (!db.users) {
        view.innerHTML = `<div class="flex items-center justify-center py-20 text-slate-400 text-sm">Loading…</div>`;
        try { await fetchAdminDB(true, true); } catch(e) {}  // slim — no content needed
    }
    _renderSubAdminsPanel(view);
}

function _renderSubAdminsPanel(view) {
    const rootSlugs  = Object.keys(db.content || {});
    const subAdmins  = Object.entries(db.users || {}).filter(([,u]) => u.role === 'subadmin');
    const students   = Object.entries(db.users || {}).filter(([,u]) => u.role === 'student');

    // Table rows
    let saRows = subAdmins.length ? '' : `<tr><td colspan="4" class="p-8 text-center text-slate-500 text-sm">No sub-admins yet. Promote a student below.</td></tr>`;
    for (const [id, data] of subAdmins) {
        const perms  = (data.subAdminPerms || []);
        const badges = _permBadges(perms, rootSlugs);
        saRows += `<tr class="border-b border-white/5 hover:bg-white/5 transition">
            <td class="p-3">
                <div class="font-bold text-white text-sm">${id}</div>
                <div class="text-[10px] text-slate-500 mt-0.5">${data.telegramName ? `TG: ${data.telegramName}` : ''}</div>
            </td>
            <td class="p-3">
                <div class="flex flex-wrap gap-1">${badges}</div>
            </td>
            <td class="p-3 text-right whitespace-nowrap">
                <button onclick="openEditSubAdmin('${id}')" class="text-primary text-xs mr-3 hover:text-white font-bold transition">Edit</button>
                <button onclick="revokeSubAdmin('${id}')" class="text-red-400 text-xs hover:text-white font-bold transition">Revoke</button>
            </td></tr>`;
    }

    const studentOptions = students.map(([id]) => `<option value="${id}">${id}</option>`).join('') || '<option value="">No students available</option>';

    // Build promote form permission checkboxes
    const promotePermsHtml = _buildPermsForm('np', rootSlugs);

    view.innerHTML = `
        <div class="flex justify-between items-center mb-6 flex-wrap gap-2">
            <div>
                <h2 class="text-xl md:text-2xl font-bold text-white">Sub-Admin Management</h2>
                <p class="text-slate-400 text-xs mt-1">Assign limited admin powers to trusted students</p>
            </div>
            <span class="text-xs bg-white/5 text-slate-400 px-3 py-1.5 rounded-lg border border-white/10">${subAdmins.length} sub-admin${subAdmins.length!==1?'s':''}</span>
        </div>

        <!-- Existing sub-admins table -->
        <div class="bg-bgMain rounded-2xl border border-white/10 overflow-x-auto mb-8">
            <table class="w-full text-left border-collapse min-w-[420px]">
                <thead><tr class="bg-panelMain text-slate-400 text-[10px] uppercase tracking-widest">
                    <th class="p-3 pl-4">User</th>
                    <th class="p-3">Permissions</th>
                    <th class="p-3"></th>
                </tr></thead>
                <tbody>${saRows}</tbody>
            </table>
        </div>

        <!-- Promote form -->
        <div class="bg-panelMain border border-primary/20 rounded-2xl p-5 md:p-6">
            <h3 class="text-white font-bold text-base mb-1">➕ Promote to Sub-Admin</h3>
            <p class="text-slate-500 text-xs mb-5">Select a student and define exactly what they can do.</p>

            <div class="mb-5">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Student</label>
                <select id="sa_uid" class="w-full bg-bgMain border border-white/10 rounded-xl p-3 text-white text-sm focus:border-primary outline-none">
                    ${studentOptions}
                </select>
            </div>

            <div class="mb-5">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Grant Permissions</label>
                ${promotePermsHtml}
            </div>

            <button onclick="promoteToSubAdmin()" class="w-full bg-primary text-slate-900 font-bold py-3 rounded-xl hover:opacity-90 transition text-sm">
                🛡️ Promote to Sub-Admin
            </button>
        </div>`;
}

// Build permission checkboxes HTML — prefix is "np" for new, "ep" for edit
function _buildPermsForm(prefix, rootSlugs) {
    const BASE_PERMS = [
        { key: 'users',   icon: '👤', label: 'User Management',     desc: 'Create, edit & delete student accounts' },
        { key: 'notices', icon: '📢', label: 'Notices',              desc: 'Manage platform announcement banners' },
        { key: 'banners', icon: '🖼️', label: 'Banners & Social',     desc: 'Manage banner slider and social media links' },
        { key: 'access',  icon: '🔑', label: 'Grant Course Access',  desc: 'Give students access to courses (within allowed scope)' },
    ];

    let html = `<div class="space-y-3">`;

    // Base permissions
    BASE_PERMS.forEach(p => {
        if (p.key === 'access') {
            // Access grant has sub-selection: all courses or specific
            html += `<div class="bg-bgMain rounded-xl border border-white/5 overflow-hidden">
                <label class="flex items-start gap-3 p-3.5 cursor-pointer hover:bg-white/5 transition" onclick="_toggleAccessPerms('${prefix}')">
                    <input type="checkbox" id="${prefix}_access_master" class="w-4 h-4 mt-0.5 accent-primary shrink-0" onchange="_onAccessMasterChange('${prefix}', this.checked)">
                    <div class="flex-1">
                        <div class="text-sm font-bold text-white">${p.icon} ${p.label}</div>
                        <div class="text-xs text-slate-500 mt-0.5">${p.desc}</div>
                    </div>
                    <svg id="${prefix}_access_arrow" class="w-4 h-4 text-slate-500 mt-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </label>
                <div id="${prefix}_access_sub" class="hidden border-t border-white/5 p-3 bg-black/20">
                    <p class="text-[11px] text-slate-500 mb-2 font-semibold">What can they give access to?</p>
                    <label class="flex items-center gap-2.5 mb-2 cursor-pointer">
                        <input type="checkbox" id="${prefix}_access_all" class="w-3.5 h-3.5 accent-primary" onchange="_onAccessAllChange('${prefix}', this.checked)">
                        <span class="text-xs font-bold text-primary">All Courses</span>
                    </label>
                    <div id="${prefix}_access_slugs" class="space-y-1 pl-1">
                        ${rootSlugs.length ? rootSlugs.map(slug => `
                        <label class="flex items-center gap-2.5 cursor-pointer py-1">
                            <input type="checkbox" class="${prefix}_access_slug w-3.5 h-3.5 accent-primary" value="${slug}">
                            <span class="text-xs text-slate-300 capitalize">${slug.replace(/_/g,' ')}</span>
                        </label>`).join('') : '<p class="text-[11px] text-slate-500">No content sections yet</p>'}
                    </div>
                </div>
            </div>`;
        } else {
            html += `<label class="flex items-start gap-3 p-3.5 bg-bgMain rounded-xl border border-white/5 cursor-pointer hover:border-primary/30 transition group">
                <input type="checkbox" class="${prefix}_perm w-4 h-4 mt-0.5 accent-primary shrink-0" value="${p.key}">
                <div>
                    <div class="text-sm font-bold text-white">${p.icon} ${p.label}</div>
                    <div class="text-xs text-slate-500 mt-0.5">${p.desc}</div>
                </div>
            </label>`;
        }
    });

    // Content permission with sub-selection
    html += `<div class="bg-bgMain rounded-xl border border-white/5 overflow-hidden">
        <label class="flex items-start gap-3 p-3.5 cursor-pointer hover:bg-white/5 transition" onclick="_toggleContentPerms('${prefix}')">
            <input type="checkbox" id="${prefix}_content_master" class="w-4 h-4 mt-0.5 accent-primary shrink-0" onchange="_onContentMasterChange('${prefix}', this.checked)">
            <div class="flex-1">
                <div class="text-sm font-bold text-white">🎬 Content Editing</div>
                <div class="text-xs text-slate-500 mt-0.5">Edit course/subject content in the platform</div>
            </div>
            <svg id="${prefix}_content_arrow" class="w-4 h-4 text-slate-500 mt-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </label>
        <div id="${prefix}_content_sub" class="hidden border-t border-white/5 p-3 bg-black/20">
            <p class="text-[11px] text-slate-500 mb-2 font-semibold">Which sections can they edit?</p>
            <label class="flex items-center gap-2.5 mb-2 cursor-pointer">
                <input type="checkbox" id="${prefix}_content_all" class="w-3.5 h-3.5 accent-primary" onchange="_onContentAllChange('${prefix}', this.checked)">
                <span class="text-xs font-bold text-primary">All Sections</span>
            </label>
            <div id="${prefix}_content_slugs" class="space-y-1 pl-1">
                ${rootSlugs.length ? rootSlugs.map(slug => `
                <label class="flex items-center gap-2.5 cursor-pointer py-1">
                    <input type="checkbox" class="${prefix}_content_slug w-3.5 h-3.5 accent-primary" value="${slug}">
                    <span class="text-xs text-slate-300 capitalize">${slug.replace(/_/g,' ')}</span>
                </label>`).join('') : '<p class="text-[11px] text-slate-500">No content sections yet</p>'}
            </div>
        </div>
    </div>`;

    html += `</div>`;
    return html;
}

window._toggleContentPerms = function(prefix) {
    const sub = document.getElementById(`${prefix}_content_sub`);
    const arrow = document.getElementById(`${prefix}_content_arrow`);
    if (!sub) return;
    sub.classList.toggle('hidden');
    if (arrow) arrow.style.transform = sub.classList.contains('hidden') ? '' : 'rotate(180deg)';
};

window._onContentMasterChange = function(prefix, checked) {
    const sub = document.getElementById(`${prefix}_content_sub`);
    const arrow = document.getElementById(`${prefix}_content_arrow`);
    if (!sub) return;
    if (checked) {
        sub.classList.remove('hidden');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    } else {
        sub.classList.add('hidden');
        if (arrow) arrow.style.transform = '';
        // Uncheck all sub-options
        document.getElementById(`${prefix}_content_all`).checked = false;
        document.querySelectorAll(`.${prefix}_content_slug`).forEach(c => c.checked = false);
    }
};

window._onContentAllChange = function(prefix, checked) {
    document.querySelectorAll(`.${prefix}_content_slug`).forEach(c => {
        c.checked = false; c.disabled = checked;
    });
};

// Access permission handlers
window._toggleAccessPerms = function(prefix) {
    const sub = document.getElementById(`${prefix}_access_sub`);
    const arrow = document.getElementById(`${prefix}_access_arrow`);
    if (!sub) return;
    sub.classList.toggle('hidden');
    if (arrow) arrow.style.transform = sub.classList.contains('hidden') ? '' : 'rotate(180deg)';
};

window._onAccessMasterChange = function(prefix, checked) {
    const sub = document.getElementById(`${prefix}_access_sub`);
    const arrow = document.getElementById(`${prefix}_access_arrow`);
    if (!sub) return;
    if (checked) {
        sub.classList.remove('hidden');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    } else {
        sub.classList.add('hidden');
        if (arrow) arrow.style.transform = '';
        const allBox = document.getElementById(`${prefix}_access_all`);
        if (allBox) allBox.checked = false;
        document.querySelectorAll(`.${prefix}_access_slug`).forEach(c => { c.checked = false; c.disabled = false; });
    }
};

window._onAccessAllChange = function(prefix, checked) {
    document.querySelectorAll(`.${prefix}_access_slug`).forEach(c => {
        c.checked = false; c.disabled = checked;
    });
};

// Collect permissions from a form
function _collectPerms(prefix) {
    const perms = [];
    // Base perms (excluding 'access' which has sub-selection)
    document.querySelectorAll(`.${prefix}_perm:checked`).forEach(c => perms.push(c.value));
    // Content perms
    const contentMaster = document.getElementById(`${prefix}_content_master`);
    if (contentMaster && contentMaster.checked) {
        const allContent = document.getElementById(`${prefix}_content_all`);
        if (allContent && allContent.checked) {
            perms.push('content:all');
        } else {
            document.querySelectorAll(`.${prefix}_content_slug:checked`).forEach(c => perms.push(`content:${c.value}`));
        }
    }
    // Access grant perms
    const accessMaster = document.getElementById(`${prefix}_access_master`);
    if (accessMaster && accessMaster.checked) {
        const allAccess = document.getElementById(`${prefix}_access_all`);
        if (allAccess && allAccess.checked) {
            perms.push('access:all');
        } else {
            document.querySelectorAll(`.${prefix}_access_slug:checked`).forEach(c => perms.push(`access:${c.value}`));
        }
    }
    return perms;
}

// Set permissions into a form (for editing)
function _setPerms(prefix, perms, rootSlugs) {
    // Set base perms
    document.querySelectorAll(`.${prefix}_perm`).forEach(c => {
        c.checked = perms.includes(c.value);
    });
    // Content perms
    const hasContent = perms.some(p => p.startsWith('content:'));
    const master     = document.getElementById(`${prefix}_content_master`);
    if (master) master.checked = hasContent;
    if (hasContent) {
        const sub = document.getElementById(`${prefix}_content_sub`);
        if (sub) sub.classList.remove('hidden');
        const arrow = document.getElementById(`${prefix}_content_arrow`);
        if (arrow) arrow.style.transform = 'rotate(180deg)';
        const allBox = document.getElementById(`${prefix}_content_all`);
        if (perms.includes('content:all')) {
            if (allBox) { allBox.checked = true; _onContentAllChange(prefix, true); }
        } else {
            const slugPerms = perms.filter(p => p.startsWith('content:')).map(p => p.slice(8));
            document.querySelectorAll(`.${prefix}_content_slug`).forEach(c => {
                c.checked = slugPerms.includes(c.value);
            });
        }
    }
    // Access grant perms
    const hasAccess = perms.some(p => p.startsWith('access:'));
    const accessMaster = document.getElementById(`${prefix}_access_master`);
    if (accessMaster) accessMaster.checked = hasAccess;
    if (hasAccess) {
        const sub = document.getElementById(`${prefix}_access_sub`);
        if (sub) sub.classList.remove('hidden');
        const arrow = document.getElementById(`${prefix}_access_arrow`);
        if (arrow) arrow.style.transform = 'rotate(180deg)';
        const allBox = document.getElementById(`${prefix}_access_all`);
        if (perms.includes('access:all')) {
            if (allBox) { allBox.checked = true; _onAccessAllChange(prefix, true); }
        } else {
            const slugPerms = perms.filter(p => p.startsWith('access:')).map(p => p.slice(7));
            document.querySelectorAll(`.${prefix}_access_slug`).forEach(c => {
                c.checked = slugPerms.includes(c.value);
            });
        }
    }
}

// Permission badge HTML
function _permBadges(perms, rootSlugs) {
    let html = '';
    if (perms.includes('users'))   html += `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400">👤 Users</span>`;
    if (perms.includes('notices')) html += `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400">📢 Notices</span>`;
    if (perms.includes('banners')) html += `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400">🖼️ Banners</span>`;
    if (perms.includes('access:all')) {
        html += `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-400">🔑 All Access</span>`;
    } else {
        perms.filter(p => p.startsWith('access:')).forEach(p => {
            const slug = p.slice(7);
            html += `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 capitalize">🔑 ${slug.replace(/_/g,' ')}</span>`;
        });
    }
    if (perms.includes('content:all')) {
        html += `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-500/15 text-violet-400">🎬 All Content</span>`;
    } else {
        perms.filter(p => p.startsWith('content:')).forEach(p => {
            const slug = p.slice(8);
            html += `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-500/10 text-violet-400 capitalize">🎬 ${slug.replace(/_/g,' ')}</span>`;
        });
    }
    if (!html) html = `<span class="text-slate-600 text-[10px]">No permissions</span>`;
    return html;
}

window.promoteToSubAdmin = async function() {
    if (!isOwner()) return;
    const uid = document.getElementById('sa_uid')?.value;
    if (!uid) return showAdminToast('Select a user first', true);
    const perms = _collectPerms('np');
    if (!perms.length) return showAdminToast('Grant at least one permission', true);
    if (!confirm(`Promote "${uid}" to Sub-Admin?\nPermissions: ${perms.join(', ')}`)) return;
    try {
        await patchServer('subadmin', { userId: uid, permissions: perms });
        if (db.users?.[uid]) { db.users[uid].role = 'subadmin'; db.users[uid].subAdminPerms = perms; }
        _bustAdminCache();
        _renderSubAdminsPanel(document.getElementById('admin-view-area'));
        showAdminToast(`${uid} promoted to Sub-Admin!`);
    } catch(e) { showAdminToast('Failed: ' + e.message, true); }
};

window.revokeSubAdmin = async function(id) {
    if (!isOwner()) return;
    if (!confirm(`Revoke sub-admin from "${id}"? They'll become a student.`)) return;
    try {
        await patchServer('revoke-subadmin', { userId: id });
        if (db.users?.[id]) { db.users[id].role = 'student'; delete db.users[id].subAdminPerms; }
        _bustAdminCache();
        _renderSubAdminsPanel(document.getElementById('admin-view-area'));
        showAdminToast(`${id}'s sub-admin access revoked.`);
    } catch(e) { showAdminToast('Failed: ' + e.message, true); }
};

window.openEditSubAdmin = function(id) {
    if (!isOwner()) return;
    const user = db.users?.[id];
    if (!user) return showAdminToast('User not found', true);
    const rootSlugs = Object.keys(db.content || {});
    const current   = user.subAdminPerms || [];

    document.getElementById('modal-root').innerHTML = `
        <div class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4 fade-in">
            <div class="bg-bgMain border border-white/10 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button onclick="closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white z-10">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                <div class="mb-5">
                    <h2 class="text-lg font-bold text-white">Edit Sub-Admin</h2>
                    <p class="text-violet-400 font-bold text-sm mt-0.5">${id}</p>
                </div>
                ${_buildPermsForm('ep', rootSlugs)}
                <button onclick="saveSubAdminPerms('${id}')" class="w-full bg-primary text-slate-900 font-bold py-3 rounded-xl hover:opacity-90 transition mt-5 text-sm">
                    Save Permissions
                </button>
            </div>
        </div>`;

    // Set current permissions
    setTimeout(() => _setPerms('ep', current, rootSlugs), 50);
};

window.saveSubAdminPerms = async function(id) {
    if (!isOwner()) return;
    const perms = _collectPerms('ep');
    if (!perms.length) return showAdminToast('Grant at least one permission', true);
    try {
        await patchServer('subadmin', { userId: id, permissions: perms });
        if (db.users?.[id]) db.users[id].subAdminPerms = perms;
        _bustAdminCache();
        closeModal();
        _renderSubAdminsPanel(document.getElementById('admin-view-area'));
        showAdminToast(`${id}'s permissions updated!`);
    } catch(e) { showAdminToast('Failed: ' + e.message, true); }
};

// ==========================================
// FREE TRIAL SETTINGS (Owner only)
// ==========================================
async function renderAdminTrial(view) {
    if (!isOwner()) { view.innerHTML = `<div class="text-rose-400 text-center p-10 text-sm">Owner access required.</div>`; return; }
    if (!db.settings) {
        view.innerHTML = `<div class="flex items-center justify-center py-20 text-slate-400 text-sm">Loading…</div>`;
        try { await fetchAdminDB(true, true); } catch(e) {}  // slim
    }
    _renderTrialSettings(view);
}

function _renderTrialSettings(view) {
    const rootSlugs       = Object.keys(db.content || {});
    const trialAccess     = db.settings?.trialAccess || [];
    const trialMinutes    = db.settings?.trialMinutes ?? 8;
    const isAll           = trialAccess.includes('all');

    // Trial users stats
    const tgUsers   = Object.values(db.users || {}).filter(u => u.isTelegramUser);
    const now       = Date.now();
    const active    = tgUsers.filter(u => u.trialEnd && u.trialEnd > now).length;
    const expired   = tgUsers.filter(u => u.trialEnd && u.trialEnd <= now).length;

    const slugCheckboxes = rootSlugs.map(slug => `
        <label class="flex items-center gap-2.5 py-1.5 cursor-pointer">
            <input type="checkbox" class="trial_sub w-4 h-4 accent-primary" value="${slug}"
                ${!isAll && trialAccess.includes(slug) ? 'checked' : ''}
                ${isAll ? 'disabled' : ''}>
            <span class="text-sm text-slate-300 capitalize">${slug.replace(/_/g,' ')}</span>
        </label>`).join('');

    view.innerHTML = `
        <div class="flex justify-between items-center mb-6 flex-wrap gap-2">
            <div>
                <h2 class="text-xl md:text-2xl font-bold text-white">Free Trial Settings</h2>
                <p class="text-slate-400 text-xs mt-1">Configure the Telegram free-trial experience</p>
            </div>
        </div>

        <div class="space-y-5 max-w-lg">

            <!-- Stats -->
            <div class="grid grid-cols-3 gap-3">
                <div class="bg-bgMain rounded-2xl border border-white/10 p-4 text-center">
                    <div class="text-2xl font-bold text-blue-400">${tgUsers.length}</div>
                    <div class="text-[11px] text-slate-500 mt-1 font-medium">TG Users</div>
                </div>
                <div class="bg-bgMain rounded-2xl border border-white/10 p-4 text-center">
                    <div class="text-2xl font-bold text-emerald-400">${active}</div>
                    <div class="text-[11px] text-slate-500 mt-1 font-medium">Active Trial</div>
                </div>
                <div class="bg-bgMain rounded-2xl border border-white/10 p-4 text-center">
                    <div class="text-2xl font-bold text-red-400">${expired}</div>
                    <div class="text-[11px] text-slate-500 mt-1 font-medium">Expired</div>
                </div>
            </div>

            <!-- Trial Duration -->
            <div class="bg-bgMain rounded-2xl border border-white/10 p-5">
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">⏱ Trial Duration</p>
                <p class="text-slate-500 text-xs mb-3">How long each new Telegram user gets free access after their first login.</p>
                <div class="flex items-center gap-3">
                    <input type="number" id="trial_minutes" value="${trialMinutes}" min="1" max="120" step="1"
                        class="w-24 bg-panelMain border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm text-center focus:border-primary outline-none font-bold">
                    <span class="text-slate-300 text-sm font-semibold">minutes</span>
                    <span class="text-slate-500 text-xs">(1–120)</span>
                </div>
                <p class="text-slate-500 text-[11px] mt-2">⚠️ Changing this only affects <em>new</em> Telegram logins, not existing trial users.</p>
            </div>

            <!-- Trial Content -->
            <div class="bg-bgMain rounded-2xl border border-white/10 p-5">
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">📚 Trial Content Access</p>
                <p class="text-slate-500 text-xs mb-4">Which subject sections trial users can browse during their free period.</p>

                <label class="flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5 cursor-pointer mb-3">
                    <input type="checkbox" id="trial_all" class="w-4 h-4 accent-primary" ${isAll ? 'checked' : ''}>
                    <span class="text-sm font-bold text-primary">All Sections (Full Access)</span>
                </label>

                <div class="pl-1 space-y-0.5" id="trial_subs_wrap">
                    ${slugCheckboxes || `<p class="text-slate-500 text-xs py-2">No content sections found. Add subjects first.</p>`}
                </div>
            </div>

            <button onclick="saveTrialSettings()" class="w-full bg-primary text-slate-900 font-bold py-3.5 rounded-xl hover:opacity-90 transition text-sm">
                💾 Save Trial Settings
            </button>

            <!-- Bulk Admin Actions -->
            <div class="bg-bgMain rounded-2xl border border-white/10 p-5">
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">⚡ Bulk Actions</p>
                <p class="text-slate-500 text-xs mb-4">Apply actions to all users at once. These cannot be undone.</p>
                <div class="flex flex-col gap-3">
                    <button onclick="resetAllDevices()"
                        class="w-full flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold py-3 rounded-xl transition text-sm">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                        Reset All Device Locks
                    </button>
                    <button onclick="resetAllTgTrials()"
                        class="w-full flex items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold py-3 rounded-xl transition text-sm">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/></svg>
                        Reset All TG Trials
                    </button>
                </div>
            </div>
        </div>`;

    document.getElementById('trial_all').addEventListener('change', function() {
        document.querySelectorAll('.trial_sub').forEach(cb => {
            cb.disabled = this.checked;
            if (this.checked) cb.checked = false;
        });
    });
}

window.saveTrialSettings = async function() {
    if (!isOwner()) return;
    const minutes   = parseInt(document.getElementById('trial_minutes')?.value) || 8;
    const allBox    = document.getElementById('trial_all')?.checked;
    let trialAccess;
    if (allBox) {
        trialAccess = ['all'];
    } else {
        trialAccess = [...document.querySelectorAll('.trial_sub:checked')].map(c => c.value);
        if (!trialAccess.length) trialAccess = ['none'];
    }

    const settings = { ...db.settings, trialMinutes: minutes, trialAccess };
    try {
        await patchServer('settings', settings);
        db.settings = settings;
        _bustAdminCache();
        showAdminToast('Trial settings saved!');
        const view = document.getElementById('admin-view-area');
        if (view) _renderTrialSettings(view);
    } catch(e) { showAdminToast('Error: ' + e.message, true); }
};

window.resetAllDevices = async function() {
    if (!isOwner()) return;
    if (!confirm('Reset ALL device locks?\n\nThis will allow every user to log in from a new device. This cannot be undone.')) return;
    try {
        const res = await patchServer('reset-all-devices', {});
        const count = res?.reset ?? '?';
        _bustAdminCache();
        showAdminToast(`✅ Reset ${count} device lock(s).`);
    } catch(e) { showAdminToast('Error: ' + e.message, true); }
};

window.resetAllTgTrials = async function() {
    if (!isOwner()) return;
    if (!confirm('Reset ALL Telegram user trials?\n\nEvery TG user will get a fresh trial period. This cannot be undone.')) return;
    try {
        const res = await patchServer('reset-all-trials', {});
        const count = res?.reset ?? '?';
        // Refresh local user data
        await fetchAdminDB(true, false);
        _bustAdminCache();
        showAdminToast(`✅ Reset ${count} TG trial(s).`);
        const view = document.getElementById('admin-view-area');
        if (view) _renderTrialSettings(view);
    } catch(e) { showAdminToast('Error: ' + e.message, true); }
};
