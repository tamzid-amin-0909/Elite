// ==========================================
// 11. HEADER
// ==========================================
function setupHeader() {
    const authBtnDiv = document.getElementById('auth-buttons');
    const greetDiv = document.getElementById('user-greeting');
    if (db.notices?.length > 0) {
        document.getElementById('notice-bar').classList.remove('hidden');
        document.getElementById('notice-text').innerText = '📢 ' + db.notices.join('  |  📢 ');
    } else document.getElementById('notice-bar').classList.add('hidden');

    if (currentUser) {
        greetDiv.classList.remove('hidden');
        greetDiv.innerHTML = `Hi, <span class="text-primary font-bold">${currentUser.id}</span>`;
        const isConfirmedAdmin = currentUser?.role === 'admin' || currentUser?.role === 'subadmin';
        authBtnDiv.innerHTML = `
            <a href="#" class="p-2 md:px-3 md:py-1.5 bg-panelMain hover:bg-white/10 rounded-lg text-xs font-bold border border-white/10 transition text-white flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                <span class="hidden md:inline">Dash</span>
            </a>
            ${isConfirmedAdmin ? `<a href="#admin" class="p-2 md:px-3 md:py-1.5 bg-primary hover:opacity-80 text-slate-900 rounded-lg text-xs font-bold shadow-lg transition flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <span class="hidden md:inline">Admin</span>
            </a>` : ''}
            <button onclick="logout()" class="p-2 md:px-3 md:py-1.5 bg-red-500/10 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-bold transition flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                <span class="hidden md:inline">Logout</span>
            </button>`;
    } else {
        greetDiv.classList.add('hidden');
        authBtnDiv.innerHTML = `<a href="#login" class="px-4 py-2 bg-primary hover:opacity-80 text-slate-900 rounded-lg text-xs md:text-sm font-bold shadow transition flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
            Login</a>`;
    }
}
