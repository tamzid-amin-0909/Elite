// ==========================================
// 2. SKELETON LOADER STYLES (injected once)
// ==========================================
(function injectSkeletonStyles() {
    if (document.getElementById('skeleton-styles')) return;
    const s = document.createElement('style');
    s.id = 'skeleton-styles';
    s.innerHTML = `
        @keyframes skshimmer {
            0%   { background-position: -600px 0; }
            100% { background-position:  600px 0; }
        }
        .skel {
            background: linear-gradient(90deg,
                rgba(255,255,255,0.04) 25%,
                rgba(255,255,255,0.10) 50%,
                rgba(255,255,255,0.04) 75%);
            background-size: 600px 100%;
            animation: skshimmer 1.4s infinite linear;
            border-radius: 8px;
        }
        .skel-card {
            border-radius: 16px;
            overflow: hidden;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.06);
        }
        /* Logout modal overlay */
        .logout-modal-overlay {
            position: fixed; inset: 0; z-index: 9999;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            padding: 1rem;
            animation: fadeInModal 0.2s ease;
        }
        @keyframes fadeInModal {
            from { opacity: 0; transform: scale(0.96); }
            to   { opacity: 1; transform: scale(1); }
        }
    `;
    document.head.appendChild(s);
})();
// ==========================================
// 5. SKELETON LOADERS
// Shows animated shimmer cards instantly while the DB is fetching.
// Auto-scrolls to top so the user always starts at the beginning.
// ==========================================
function buildSkeletonCard(wide = false) {
    return `
        <div class="skel-card ${wide ? '' : ''}">
            <div class="skel" style="aspect-ratio:16/10; width:100%;"></div>
            <div style="padding:12px 14px 14px;">
                <div class="skel" style="height:14px; width:75%; margin-bottom:8px;"></div>
                <div class="skel" style="height:11px; width:50%;"></div>
            </div>
        </div>`;
}
function showSkeletonGrid(count = 8) {
    // Scroll to top instantly so the skeleton is visible from the beginning
    window.scrollTo({ top: 0, behavior: 'instant' });
    let html = `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">`;
    for (let i = 0; i < count; i++) html += buildSkeletonCard();
    app.innerHTML = html + `</div>`;
}
function showSkeletonVideo() {
    // Scroll to top instantly so the skeleton is visible from the beginning
    window.scrollTo({ top: 0, behavior: 'instant' });
    app.innerHTML = `
        <div class="max-w-5xl mx-auto fade-in">
            <div class="skel" style="height:32px; width:55%; margin-bottom:20px; border-radius:10px;"></div>
            <div class="skel-card" style="aspect-ratio:16/9; width:100%; border-radius:14px; margin-bottom:24px;"></div>
            <div class="skel" style="height:13px; width:80%; margin-bottom:10px;"></div>
            <div class="skel" style="height:13px; width:60%;"></div>
        </div>
        <div class="max-w-7xl mx-auto mt-10">
            <div class="skel" style="height:18px; width:160px; margin-bottom:20px; border-radius:8px;"></div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                ${[1,2,3,4].map(() => buildSkeletonCard()).join('')}
            </div>
        </div>`;
}
// ==========================================

// ==========================================
// 10. ROUTER — shows skeleton FIRST, then renders real content (with lazy loading)
// ==========================================

// _lastDBFetchTime and DB_THROTTLE_MS are declared in backend-state.js — do NOT redeclare here.

async function render() {
    const hash = window.location.hash.substring(1);

    // Show skeleton immediately so the user sees something while we fetch
    const keys = hash ? hash.split('/') : [];
    const looksLikeVideo = (() => {
        let cur = db.content;
        for (let k of keys) { if (!cur || !cur[k]) return false; if (cur[k].type === 'video') return true; cur = cur[k].children || {}; }
        return false;
    })();
    if (hash && hash !== 'admin' && hash !== 'login') {
        looksLikeVideo ? showSkeletonVideo() : showSkeletonGrid(8);
    }

    // Only re-fetch home DB if enough time has passed since last fetch.
    const now = Date.now();
    if (now - _lastDBFetchTime > DB_THROTTLE_MS) {
        try {
            db = await fetchFreshDB();
            _lastDBFetchTime = Date.now();
        } catch(e) { /* keep existing on network blip */ }
    }

    setupHeader();

    let rootSubject = keys[0] || null;
    if (rootSubject && rootSubject !== 'admin' && rootSubject !== 'login') {
        const subjectInfo = db.content[rootSubject];
        const isFree = subjectInfo && subjectInfo.isFree;
        if (!currentUser && !isFree) return renderLoginForm();
        else if (currentUser && currentUser.role !== 'admin' && !isFree) {
            if (currentUser.role === 'subadmin') {
            if (!subAdminCanEditContent(rootSubject)) return renderAccessDenied(subjectInfo.title || rootSubject);
        } else if (!currentUser.access.includes('all') && !currentUser.access.includes(rootSubject)) {
            return renderAccessDenied(subjectInfo.title || rootSubject);
        }
        }
    } else if (!currentUser) {
        if (hash === 'login') return renderLoginForm();
        return renderLandingCatalog();
    } else if (!hash || hash === '') {
        // Logged-in users at root also see the full landing (welcome + banner + social + courses)
        return renderLandingCatalog();
    }

    if (hash === 'admin') {
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'subadmin')) {
            window.location.hash = ''; return render();
        }
        return renderAdmin();
    }

    let current = db.content;
    let item = { type: 'category', children: db.content, title: 'Dashboard' };
    let siblings = db.content;
    let currentThumb = '';
    let currentPath = '';

    for (let key of keys) {
        const keyPath = currentPath ? currentPath + '/' + key : key;

        if (!current[key]) {
            // If URL contains a hash
            if (window.location.hash) {
                // Redirect to same path without hash
                return window.location.replace(
                    window.location.pathname + window.location.search
                );
            }
        
            // Redirect trailing slash version like /app/ -> /app
            return window.location.replace(
                window.location.pathname.replace(/\/+$/, '') || '/'
            );
        
            // Optional fallback HTML
            app.innerHTML = `
                <div class="text-center py-20">
                    <h2 class="text-3xl font-bold text-slate-500">
                        404 - Not Found
                    </h2>
                </div>
            `;
        }

        if (current[key].thumbnail) currentThumb = current[key].thumbnail;
        siblings = current;
        item = current[key];

        if (item.type === 'category' && (!item.children || Object.keys(item.children).length === 0)) {
            item.children = await fetchChildren(keyPath);
            current[key].children = item.children;
            for (const child of Object.values(item.children)) {
                if (child.thumbnail) cacheSingleThumbnail(child.thumbnail);
            }
        }

        current = item.children || {};
        currentPath = keyPath;
    }

    let breadcrumbHtml = `<a href="#" class="hover:text-primary transition">Home</a>`;
    let buildPath = '';
    keys.forEach(k => { buildPath += (buildPath ? '/' : '') + k; breadcrumbHtml += ` <span class="mx-1 opacity-30">/</span> <a href="#${buildPath}" class="hover:text-primary capitalize transition">${k.replace(/_/g, ' ')}</a>`; });
    document.getElementById('breadcrumb').innerHTML = breadcrumbHtml;
    document.getElementById('breadcrumb-mobile').innerHTML = breadcrumbHtml;

    if (item.type === 'video') renderVideo(item, siblings, keys, currentThumb);
    else renderCategory(item, hash, currentThumb);
}
