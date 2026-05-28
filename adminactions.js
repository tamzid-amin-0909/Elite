// ==========================================
// 14. ADMIN ACTIONS & MODALS
// All writes use surgical patch endpoints — they never send the full db object.
// This means unloaded content branches, users, settings, and notices are
// NEVER touched, regardless of what the browser has or hasn't loaded.
// ==========================================
window.closeModal = function() { document.getElementById('modal-root').innerHTML = ''; };

// ── PATCH HELPERS ──────────────────────────────────────────────────────────
// All server writes go through these. They call the server-side patch endpoint
// which reads the fresh DB, applies the single operation, and saves.

async function patchContent(op, payload) {
    const token = getAuthToken();
    const res = await fetch('api.php?action=patch&type=content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ op, ...payload })
    });
    if (!res.ok) {
        let msg = 'Save failed: ' + res.status;
        try { const err = await res.json(); msg = err.error || msg; } catch(e) {}
        throw new Error(msg);
    }
    return res.json();
}

function showSaveToast(msg = 'Saved ✓', isError = false) {
    const t = document.createElement('div');
    t.className = `fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl font-bold text-sm shadow-2xl transition-all
        ${isError ? 'bg-red-600 text-white' : 'bg-emerald-500 text-slate-900'}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

// ── GENERATE ADMIN ACTION BUTTONS ─────────────────────────────────────────
function generateAdminActions(parentPath, slug) {
    if (!currentUser) return '';
    const fullPath = parentPath ? `${parentPath}/${slug}` : slug;
    if (currentUser.role !== 'admin' && !subAdminCanEditContent(fullPath)) return '';
    return `<div class="admin-actions">
        <button onclick="openMoveCopyModal('${parentPath}','${slug}',event)" title="Move / Copy" class="bg-amber-600/90 hover:bg-amber-500 text-white p-1.5 md:p-2 rounded-lg shadow-lg backdrop-blur transition transform hover:scale-110">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
        </button>
        <button onclick="openContentModal('${parentPath}','${slug}',event)" title="Edit" class="bg-blue-600/90 hover:bg-blue-500 text-white p-1.5 md:p-2 rounded-lg shadow-lg backdrop-blur transition transform hover:scale-110">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        </button>
        <button onclick="deleteContent('${parentPath}','${slug}',event)" title="Delete" class="bg-red-600/90 hover:bg-red-500 text-white p-1.5 md:p-2 rounded-lg shadow-lg backdrop-blur transition transform hover:scale-110">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
    </div>`;
}

// ── DELETE ─────────────────────────────────────────────────────────────────
window.deleteContent = async function(parentPath, slug, event) {
    if (!requireAdmin()) return;
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (prompt(`Type '1' to delete "${slug}":`) !== '1') return;

    const fullPath = parentPath ? parentPath + '/' + slug : slug;
    try {
        await patchContent('delete', { path: fullPath });
        // Also remove from in-memory db so UI reflects change immediately
        let target = db.content;
        if (parentPath) {
            for (const k of parentPath.split('/')) {
                if (!target[k]) break;
                target = target[k].children || {};
            }
        }
        delete target[slug];
        showSaveToast('Deleted ✓');

        const currentHash = window.location.hash.substring(1);
        if (currentHash.startsWith(fullPath)) window.location.hash = parentPath || '';
        else render();
    } catch(e) {
        showSaveToast(e.message, true);
    }
};

// ── MOVE / COPY MODAL ──────────────────────────────────────────────────────
window.openMoveCopyModal = function(parentPath, slug, event) {
    if (!requireAdmin()) return;
    if (event) { event.preventDefault(); event.stopPropagation(); }
    document.getElementById('modal-root').innerHTML = `
        <div class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4 fade-in">
            <div class="bg-bgMain border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative">
                <button onclick="closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                <h2 class="text-xl md:text-2xl font-bold text-white mb-6">Move / Copy Item</h2>
                <form onsubmit="submitMoveCopy(event,'${parentPath}','${slug}')" class="space-y-4">
                    <div class="flex gap-4 p-3 bg-panelMain rounded-xl border border-white/10">
                        <label class="flex items-center gap-2 cursor-pointer text-white font-bold text-sm"><input type="radio" name="mc_action" value="move" checked class="w-4 h-4 accent-primary"> Move</label>
                        <label class="flex items-center gap-2 cursor-pointer text-white font-bold text-sm"><input type="radio" name="mc_action" value="copy" class="w-4 h-4 accent-primary"> Duplicate</label>
                    </div>
                    <div><label class="block text-slate-400 text-xs mb-1">Destination Path (leave blank for root)</label>
                        <input type="text" id="mc_target" value="${parentPath}" placeholder="e.g. physics/chapter1" class="w-full bg-panelMain border border-white/10 rounded-lg p-3 text-white outline-none focus:border-primary text-sm"></div>
                    <div><label class="block text-slate-400 text-xs mb-1">New Slug (rename optional)</label>
                        <input type="text" id="mc_slug" value="${slug}" required class="w-full bg-panelMain border border-white/10 rounded-lg p-3 text-white outline-none focus:border-primary text-sm"></div>
                    <button type="submit" class="w-full bg-primary text-slate-900 font-bold py-3 rounded-xl transition hover:opacity-90">Confirm</button>
                </form>
            </div>
        </div>`;
};

window.submitMoveCopy = async function(e, parentPath, slug) {
    if (!requireAdmin()) return;
    e.preventDefault();
    const action     = document.querySelector('input[name="mc_action"]:checked').value;
    const targetDir  = document.getElementById('mc_target').value.trim().replace(/^\/|\/$/g, '');
    const newSlug    = document.getElementById('mc_slug').value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const fromPath   = parentPath ? parentPath + '/' + slug : slug;
    const toPath     = targetDir  ? targetDir  + '/' + newSlug : newSlug;

    try {
        await patchContent(action, { from: fromPath, to: toPath });

        // Sync in-memory db
        let srcParent = db.content;
        if (parentPath) { for (const k of parentPath.split('/')) { srcParent = srcParent?.[k]?.children || {}; } }
        const nodeCopy = JSON.parse(JSON.stringify(srcParent[slug] || {}));

        let dstParent = db.content;
        if (targetDir) {
            for (const k of targetDir.split('/')) {
                if (!dstParent[k]) dstParent[k] = { type: 'category', children: {} };
                if (!dstParent[k].children) dstParent[k].children = {};
                dstParent = dstParent[k].children;
            }
        }
        dstParent[newSlug] = nodeCopy;
        if (action === 'move' && (targetDir !== parentPath || newSlug !== slug)) delete srcParent[slug];

        showSaveToast(action === 'move' ? 'Moved ✓' : 'Duplicated ✓');
        closeModal();
        window.location.hash = targetDir;
        render();
    } catch(e) {
        showSaveToast(e.message, true);
    }
};

// ── ADD / EDIT CONTENT MODAL ───────────────────────────────────────────────
window.openContentModal = function(parentPath, editSlug = null, event = null) {
    if (!requireAdmin()) return;
    if (event) { event.preventDefault(); event.stopPropagation(); }

    // Get item from in-memory db for pre-filling the form.
    // We only need the fields (not children) so this is safe even without full load.
    let target = db.content;
    if (parentPath) {
        for (const k of parentPath.split('/')) {
            if (!target[k]) { target = {}; break; }
            target = target[k].children || {};
        }
    }
    const isEdit   = !!editSlug;
    const item     = isEdit ? (target[editSlug] || {}) : { type: 'category', isFree: false, title: '', thumbnail: '', description: '', url: '' };
    const isRoot   = !parentPath;
    const allThumbs = extractThumbnails(db.content);
    const thumbDatalist = Array.from(allThumbs.entries()).map(([url, title]) => `<option value="${url}">${title}</option>`).join('');

    document.getElementById('modal-root').innerHTML = `
        <div class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4 fade-in">
            <div class="bg-bgMain border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative max-h-[95vh] overflow-y-auto">
                <button onclick="closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                <h2 class="text-2xl font-bold text-white mb-6">${isEdit ? '✏️ Edit Content' : '➕ Add Content'}</h2>
                <form onsubmit="submitContentModal(event,'${parentPath}',${isEdit ? `'${editSlug}'` : 'null'})" class="space-y-4">
                    ${isRoot ? `<div class="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-sm mb-4 font-bold flex items-center gap-2">
                        <input type="checkbox" id="qa_isfree" class="w-4 h-4 accent-emerald-500" ${item.isFree ? 'checked' : ''}>
                        <label for="qa_isfree">Mark as FREE Subject (Public)</label></div>` : ''}
                    <div class="grid grid-cols-2 gap-4">
                        <div><label class="block text-slate-400 text-xs mb-1">Slug (URL ID) *</label>
                            <input type="text" id="qa_slug" value="${isEdit ? editSlug : ''}" required class="w-full bg-panelMain border border-white/10 rounded-lg p-2 text-white outline-none focus:border-primary text-sm"></div>
                        <div><label class="block text-slate-400 text-xs mb-1">Display Title *</label>
                            <input type="text" id="qa_title" value="${item.title || ''}" required class="w-full bg-panelMain border border-white/10 rounded-lg p-2 text-white outline-none focus:border-primary text-sm"></div>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-xs mb-1">Thumbnail ${isRoot ? '*' : '(Optional)'}</label>
                        ${!isRoot ? `<select id="qa_thumb_mode" onchange="document.getElementById('qa_thumb_div').style.display=this.value==='custom'?'block':'none'" class="w-full bg-panelMain border border-white/10 rounded-lg p-2 text-white outline-none focus:border-primary mb-2 text-sm">
                            <option value="inherit" ${!item.thumbnail ? 'selected' : ''}>🔗 Inherit from Parent</option>
                            <option value="custom" ${item.thumbnail ? 'selected' : ''}>🔍 Custom URL</option></select>` : ''}
                        <div id="qa_thumb_div" style="display:${isRoot || item.thumbnail ? 'block' : 'none'};">
                            <input type="url" id="qa_thumb" list="thumb_list" value="${item.thumbnail || ''}" placeholder="Search or paste URL..." ${isRoot ? 'required' : ''} autocomplete="off" class="w-full bg-panelMain border border-white/10 rounded-lg p-2 text-white outline-none focus:border-primary text-sm">
                            <datalist id="thumb_list">${thumbDatalist}</datalist>
                        </div>
                    </div>
                    <div><label class="block text-slate-400 text-xs mb-1">Type *</label>
                        <select id="qa_type" onchange="document.getElementById('qa_vid_div').style.display=this.value==='video'?'block':'none'" class="w-full bg-panelMain border border-white/10 rounded-lg p-2 text-white outline-none focus:border-primary text-sm">
                            <option value="category" ${item.type === 'category' ? 'selected' : ''}>📁 Category / Folder</option>
                            <option value="video"    ${item.type === 'video'    ? 'selected' : ''}>▶️ Video Lecture</option>
                        </select></div>
                    <div id="qa_vid_div" style="display:${item.type === 'video' ? 'block' : 'none'};">
                        <label class="block text-slate-400 text-xs mb-1">YouTube / Video URL</label>
                        <input type="url" id="qa_url" value="${item.url || ''}" class="w-full bg-panelMain border border-rose-500/50 rounded-lg p-2 text-white outline-none focus:border-rose-500 text-sm">
                    </div>
                    <div><label class="block text-slate-400 text-xs mb-1">Description / Note</label>
                        <textarea id="qa_desc" rows="3" class="w-full bg-panelMain border border-white/10 rounded-lg p-2 text-white outline-none focus:border-primary text-sm">${item.description || ''}</textarea></div>
                    <button type="submit" class="w-full bg-primary text-slate-900 font-bold py-3 rounded-xl transition hover:opacity-90">
                        ${isEdit ? 'Save Changes' : 'Create Content'}
                    </button>
                </form>
            </div>
        </div>`;
};

window.submitContentModal = async function(e, parentPath, oldSlug) {
    if (!requireAdmin()) return;
    e.preventDefault();

    const newSlug  = document.getElementById('qa_slug').value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const type     = document.getElementById('qa_type').value;
    const isRoot   = !parentPath;
    let thumbVal   = document.getElementById('qa_thumb').value;
    if (!isRoot && document.getElementById('qa_thumb_mode')?.value === 'inherit') thumbVal = '';

    // Build the node data — never include children.
    // The server ALWAYS preserves stored children for category nodes;
    // sending children:{} would be ignored but we omit it to be clean.
    let nodeData = {
        title:       document.getElementById('qa_title').value,
        thumbnail:   thumbVal,
        type,
        description: document.getElementById('qa_desc').value
    };
    if (type === 'video') nodeData.url = document.getElementById('qa_url').value;
    if (isRoot)           nodeData.isFree = document.getElementById('qa_isfree').checked;

    const fullPath = parentPath ? parentPath + '/' + newSlug : newSlug;

    // If slug changed, delete old slug first then set new one
    if (oldSlug && oldSlug !== newSlug) {
        const oldPath = parentPath ? parentPath + '/' + oldSlug : oldSlug;
        try {
            await patchContent('delete', { path: oldPath });
        } catch(e) { /* old slug may not exist — ok */ }
    }

    try {
        await patchContent('set', { path: fullPath, data: nodeData });

        // Sync in-memory db (shallow — no children needed for UI)
        let target = db.content;
        if (parentPath) {
            for (const k of parentPath.split('/')) {
                if (!target[k]) { target[k] = { type: 'category', children: {} }; }
                if (!target[k].children) target[k].children = {};
                target = target[k].children;
            }
        }
        // Preserve in-memory children so navigation within this session still works
        const existingChildren = (oldSlug && target[oldSlug]?.children) ? target[oldSlug].children : (target[newSlug]?.children || {});
        if (type === 'category') nodeData.children = existingChildren;
        if (oldSlug && oldSlug !== newSlug) delete target[oldSlug];
        target[newSlug] = nodeData;

        showSaveToast(oldSlug ? 'Updated ✓' : 'Created ✓');
        closeModal();

        const currentHash = window.location.hash.substring(1);
        const oldPath = parentPath ? parentPath + '/' + oldSlug : oldSlug;
        if (oldSlug && oldSlug !== newSlug && currentHash.startsWith(oldPath)) {
            window.location.hash = currentHash.replace(oldPath, fullPath);
        } else {
            render();
        }
    } catch(err) {
        showSaveToast(err.message, true);
    }
};
