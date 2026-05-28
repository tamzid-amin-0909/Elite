// ==========================================
// BANNER SLIDER + SOCIAL MEDIA LINKS
// Manageable by admin & sub-admin (if permitted)
// ==========================================

// ── INJECT STYLES ────────────────────────────────────────────────────────────
(function injectBannerStyles() {
    if (document.getElementById('banner-slider-styles')) return;
    const s = document.createElement('style');
    s.id = 'banner-slider-styles';
    s.innerHTML = `
        /* ── BANNER SLIDER ── */
        .bs-track { display: flex; transition: transform 0.55s cubic-bezier(.4,0,.2,1); will-change: transform; }
        .bs-slide { flex: 0 0 100%; min-width: 100%; position: relative; overflow: hidden; }
        .bs-slide img { width:100%; height:100%; object-fit:cover; display:block; transition: transform 0.6s ease; }
        .bs-slide:hover img { transform: scale(1.03); }
        .bs-slide-overlay {
            position:absolute; inset:0;
            background: linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 60%, transparent 100%);
            display:flex; flex-direction:column; justify-content:flex-end; padding: 18px 22px 16px;
        }
        .bs-title {
            color:#fff; font-weight:800; font-size:clamp(14px,3vw,22px);
            text-shadow: 0 2px 12px rgba(0,0,0,0.6);
            line-height:1.2; max-width:85%;
            overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
        }
        .bs-dot { width:7px; height:7px; border-radius:50%; background:rgba(255,255,255,0.35); cursor:pointer; transition:.3s; border:none; padding:0; }
        .bs-dot.active { background:var(--primary,#f59e0b); width:20px; border-radius:4px; }
        .bs-arrow {
            position:absolute; top:50%; transform:translateY(-50%);
            width:34px; height:34px; border-radius:50%;
            background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.2);
            color:#fff; display:flex; align-items:center; justify-content:center;
            cursor:pointer; transition:.2s; backdrop-filter:blur(6px); z-index:5;
        }
        .bs-arrow:hover { background:rgba(0,0,0,0.7); border-color:rgba(255,255,255,0.5); }
        .bs-arrow.left { left:10px; }
        .bs-arrow.right { right:10px; }

        /* ── SOCIAL LINKS ── */
        .social-grid { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
        .social-item {
            flex:1 1 calc(33.33% - 7px); min-width:calc(33.33% - 7px);
            display:flex; align-items:center; justify-content:center; gap:9px;
            padding:10px 14px; border-radius:14px;
            background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08);
            text-decoration:none; color:#e2e8f0; font-weight:700; font-size:13px;
            transition:.25s; overflow:hidden; white-space:nowrap;
        }
        .social-item:hover { background:rgba(255,255,255,0.12); border-color:rgba(255,255,255,0.2); transform:translateY(-2px); }
        .social-item img { width:22px; height:22px; border-radius:5px; object-fit:cover; flex-shrink:0; }
        .social-item span { overflow:hidden; text-overflow:ellipsis; }

        /* Responsive: 1=full, 2=half, 3=third, 4=quarter, 5+=wrap */
        @media (max-width:480px) {
            .social-item { font-size:12px; padding:9px 10px; gap:7px; }
            .social-item img { width:18px; height:18px; }
        }

        /* Banner container */
        .banner-section { margin-bottom:14px; }
        .social-section { margin-bottom:18px; }

        /* Fade-in animation */
        @keyframes bsFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .bs-fadein { animation: bsFadeIn 0.4s ease forwards; }

        /* ── ADMIN PANEL: Banner/Social form styles ── */
        .bs-slide-row {
            background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08);
            border-radius:14px; padding:14px 16px; margin-bottom:10px;
        }
        .bs-slide-row:hover { border-color:rgba(255,255,255,0.15); }
        .bs-drag-handle { cursor:grab; color:rgba(255,255,255,0.3); }
        .bs-drag-handle:active { cursor:grabbing; }
    `;
    document.head.appendChild(s);
})();

// ── RENDER BANNER SECTION (public-facing) ────────────────────────────────────
function renderBannerSection() {
    const slides = (db.settings?.bannerSlides || []).filter(s => s && s.image);
    if (!slides.length) return '';

    const slidesHtml = slides.map((slide, i) => `
        <div class="bs-slide">
            <a href="${slide.href || '#'}" ${slide.href && slide.href !== '#' ? 'target="_blank" rel="noopener"' : ''} style="display:block;width:100%;height:100%;">
                <img src="${slide.image}" alt="${slide.title || ''}" loading="${i === 0 ? 'eager' : 'lazy'}">
                ${slide.title ? `<div class="bs-slide-overlay"><div class="bs-title">${slide.title}</div></div>` : ''}
            </a>
        </div>`).join('');

    const dotsHtml = slides.length > 1 ? slides.map((_, i) =>
        `<button class="bs-dot${i===0?' active':''}" onclick="bsGoto(${i})" aria-label="Slide ${i+1}"></button>`
    ).join('') : '';

    const arrowsHtml = slides.length > 1 ? `
        <button class="bs-arrow left" onclick="bsPrev()" aria-label="Previous">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button class="bs-arrow right" onclick="bsNext()" aria-label="Next">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
        </button>` : '';

    return `
        <div class="banner-section bs-fadein">
            <div id="bs-root" style="position:relative; border-radius:16px; overflow:hidden; aspect-ratio:21/7; background:#0f172a; box-shadow:0 4px 32px rgba(0,0,0,0.4);">
                <div id="bs-track" class="bs-track" style="height:100%;">${slidesHtml}</div>
                ${arrowsHtml}
                ${dotsHtml ? `<div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:5px;z-index:5;">${dotsHtml}</div>` : ''}
            </div>
        </div>`;
}

// ── RENDER SOCIAL LINKS SECTION (public-facing) ──────────────────────────────
function renderSocialSection() {
    const links = (db.settings?.socialLinks || []).filter(l => l && l.url);
    if (!links.length) return '';

    const itemsHtml = links.map(link => `
        <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="social-item" title="${link.label || link.url}">
            ${link.icon ? `<img src="${link.icon}" alt="${link.label || ''}">` : ''}
            ${link.label ? `<span>${link.label}</span>` : ''}
        </a>`).join('');

    return `
        <div class="social-section bs-fadein">
            <div class="social-grid">${itemsHtml}</div>
        </div>`;
}

// ── SLIDER STATE & CONTROLS ──────────────────────────────────────────────────
let _bsCurrent = 0;
let _bsTimer = null;
let _bsCount = 0;

function bsInit() {
    const slides = (db.settings?.bannerSlides || []).filter(s => s && s.image);
    _bsCount = slides.length;
    _bsCurrent = 0;
    bsStopAuto();
    if (_bsCount > 1) bsStartAuto();
}

function bsGoto(idx) {
    _bsCurrent = ((idx % _bsCount) + _bsCount) % _bsCount;
    const track = document.getElementById('bs-track');
    if (track) track.style.transform = `translateX(-${_bsCurrent * 100}%)`;
    document.querySelectorAll('.bs-dot').forEach((d, i) => d.classList.toggle('active', i === _bsCurrent));
}

window.bsGoto = bsGoto;
window.bsNext = function() { bsGoto(_bsCurrent + 1); bsStopAuto(); bsStartAuto(); };
window.bsPrev = function() { bsGoto(_bsCurrent - 1); bsStopAuto(); bsStartAuto(); };

function bsStartAuto() {
    const interval = (db.settings?.bannerInterval || 5) * 1000;
    _bsTimer = setInterval(() => bsGoto(_bsCurrent + 1), interval);
}
function bsStopAuto() { if (_bsTimer) { clearInterval(_bsTimer); _bsTimer = null; } }

// ── ADMIN PANEL: BANNER & SOCIAL TABS ───────────────────────────────────────

// Check if current user can manage banners/social
function canManageBannerSocial() {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'subadmin') {
        const perms = currentUser.subAdminPerms || [];
        return perms.includes('all') || perms.includes('banners');
    }
    return false;
}

// ── ADMIN: BANNER SLIDES PANEL ────────────────────────────────────────────────
async function renderAdminBanners(view) {
    if (!requireAdmin()) return;
    if (!db.settings) {
        view.innerHTML = `<div class="flex items-center justify-center py-20 text-slate-400 text-sm"><div class="animate-spin w-5 h-5 border-2 border-white/20 border-t-primary rounded-full mr-3"></div>Loading…</div>`;
        try { await fetchAdminDB(true, true); } catch(e) {}
    }
    _renderBannersPanel(view);
}

function _renderBannersPanel(view) {
    const slides = db.settings?.bannerSlides || [];
    let rows = slides.map((slide, i) => _buildSlideRow(slide, i, slides.length)).join('');
    if (!rows) rows = `<div class="text-center py-8 text-slate-500 text-sm">No slides yet. Add your first banner below.</div>`;

    view.innerHTML = `
        <div class="flex justify-between items-center mb-6 flex-wrap gap-2">
            <div>
                <h2 class="text-xl md:text-2xl font-bold text-white">Banner Slides</h2>
                <p class="text-slate-400 text-xs mt-1">Slides auto-play on the dashboard above the courses</p>
            </div>
            <span class="text-xs bg-white/5 text-slate-400 px-3 py-1.5 rounded-lg border border-white/10">${slides.length} slide${slides.length!==1?'s':''}</span>
        </div>

        <!-- Hero subtitle editor -->
        <div class="bg-bgMain rounded-2xl border border-white/10 p-4 mb-6">
            <div class="mb-3">
                <h3 class="text-sm font-bold text-white">🏷️ Welcome Page Subtitle</h3>
                <p class="text-xs text-slate-400 mt-0.5">The tagline shown under "Welcome to EduZod" on the home page</p>
            </div>
            <div class="space-y-3">
                <div>
                    <label class="block text-xs text-slate-400 mb-1 font-bold uppercase tracking-wide">For Logged-In Users</label>
                    <input type="text" id="hero_subtitle_in"
                        value="${(db.settings?.heroSubtitleLoggedIn || '').replace(/"/g, '&quot;')}"
                        placeholder="Explore our premium courses. Click any course to start learning!"
                        class="w-full bg-panelMain border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1 font-bold uppercase tracking-wide">For Logged-Out Visitors</label>
                    <input type="text" id="hero_subtitle_out"
                        value="${(db.settings?.heroSubtitleLoggedOut || '').replace(/"/g, '&quot;')}"
                        placeholder="Explore our premium courses. Sign in or click a Free course to start learning immediately!"
                        class="w-full bg-panelMain border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none">
                </div>
                <button onclick="saveHeroSubtitles()" class="bg-primary/20 text-primary border border-primary/30 px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/30 transition">Save Subtitles</button>
            </div>
        </div>

        <!-- Auto-play interval -->
        <div class="bg-bgMain rounded-2xl border border-white/10 p-4 mb-6">
            <div class="flex items-center gap-4 flex-wrap">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">Auto-play Interval</label>
                <div class="flex items-center gap-2">
                    <input type="number" id="bs_interval" min="2" max="30" value="${db.settings?.bannerInterval || 5}"
                        class="w-20 bg-panelMain border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none">
                    <span class="text-slate-400 text-xs">seconds</span>
                </div>
                <button onclick="saveBannerInterval()" class="bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/30 transition">Save Interval</button>
            </div>
        </div>

        <!-- Existing slides -->
        <div id="bs-slides-list" class="mb-6">${rows}</div>

        <!-- Add slide form -->
        <div class="bg-panelMain border border-primary/20 rounded-2xl p-5">
            <h3 class="text-white font-bold text-sm mb-4">➕ Add New Slide</h3>
            <div class="space-y-3">
                <div>
                    <label class="block text-xs text-slate-400 mb-1 font-bold uppercase tracking-wide">Title <span class="font-normal text-slate-500">(optional)</span></label>
                    <input type="text" id="bs_new_title" placeholder="Banner title text…"
                        class="w-full bg-bgMain border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1 font-bold uppercase tracking-wide">Image URL <span class="text-rose-400">*</span></label>
                    <input type="url" id="bs_new_image" placeholder="https://example.com/banner.jpg"
                        class="w-full bg-bgMain border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none font-mono text-xs">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1 font-bold uppercase tracking-wide">Link (href) <span class="font-normal text-slate-500">(optional — where to go on click)</span></label>
                    <input type="url" id="bs_new_href" placeholder="https://example.com or #"
                        class="w-full bg-bgMain border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none font-mono text-xs">
                </div>
                <button onclick="addBannerSlide()" class="w-full bg-primary text-slate-900 font-bold py-3 rounded-xl hover:opacity-90 transition text-sm mt-1">Add Slide</button>
            </div>
        </div>`;
}

function _buildSlideRow(slide, i, total) {
    return `
        <div class="bs-slide-row" id="bs-row-${i}">
            <div class="flex items-start gap-3">
                <div class="w-24 h-14 rounded-lg overflow-hidden shrink-0 bg-black/30 border border-white/10">
                    <img src="${slide.image}" alt="" class="w-full h-full object-cover" onerror="this.style.opacity=0.2">
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <div class="text-sm font-bold text-white truncate">${slide.title || '<span class="text-slate-500 font-normal italic">No title</span>'}</div>
                            <div class="text-[11px] text-slate-500 font-mono truncate mt-0.5">${slide.image}</div>
                            ${slide.href ? `<div class="text-[11px] text-primary/70 font-mono truncate mt-0.5">→ ${slide.href}</div>` : ''}
                        </div>
                        <div class="flex gap-1.5 shrink-0">
                            ${i > 0 ? `<button onclick="moveBannerSlide(${i},-1)" title="Move up" class="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs hover:bg-white/10 transition">↑</button>` : ''}
                            ${i < total-1 ? `<button onclick="moveBannerSlide(${i},1)" title="Move down" class="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs hover:bg-white/10 transition">↓</button>` : ''}
                            <button onclick="editBannerSlide(${i})" title="Edit" class="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 text-blue-400 hover:bg-blue-500/30 flex items-center justify-center transition">
                                <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button onclick="deleteBannerSlide(${i})" title="Delete" class="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/20 text-rose-400 hover:bg-rose-500/30 flex items-center justify-center transition">
                                <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

window.addBannerSlide = async function() {
    const title = document.getElementById('bs_new_title')?.value.trim() || '';
    const image = document.getElementById('bs_new_image')?.value.trim() || '';
    const href  = document.getElementById('bs_new_href')?.value.trim() || '';
    if (!image) return showAdminToast('Image URL is required', true);
    const slides = [...(db.settings?.bannerSlides || []), { title, image, href }];
    await _saveBannerSlides(slides, 'Slide added!');
};

window.deleteBannerSlide = async function(i) {
    if (!confirm('Delete this slide?')) return;
    const slides = (db.settings?.bannerSlides || []).filter((_, idx) => idx !== i);
    await _saveBannerSlides(slides, 'Slide deleted.');
};

window.moveBannerSlide = async function(i, dir) {
    const slides = [...(db.settings?.bannerSlides || [])];
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    [slides[i], slides[j]] = [slides[j], slides[i]];
    await _saveBannerSlides(slides, 'Order updated.');
};

window.editBannerSlide = function(i) {
    const slide = (db.settings?.bannerSlides || [])[i];
    if (!slide) return;
    document.getElementById('modal-root').innerHTML = `
        <div class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4 fade-in">
            <div class="bg-bgMain border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
                <button onclick="closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                <h2 class="text-lg font-bold text-white mb-4">Edit Slide</h2>
                <div class="space-y-3">
                    <div>
                        <label class="block text-xs text-slate-400 mb-1 font-bold uppercase tracking-wide">Title</label>
                        <input type="text" id="bs_edit_title" value="${slide.title || ''}"
                            class="w-full bg-panelMain border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none">
                    </div>
                    <div>
                        <label class="block text-xs text-slate-400 mb-1 font-bold uppercase tracking-wide">Image URL</label>
                        <input type="url" id="bs_edit_image" value="${slide.image || ''}"
                            class="w-full bg-panelMain border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none font-mono text-xs">
                    </div>
                    <div>
                        <label class="block text-xs text-slate-400 mb-1 font-bold uppercase tracking-wide">Link (href)</label>
                        <input type="url" id="bs_edit_href" value="${slide.href || ''}"
                            class="w-full bg-panelMain border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none font-mono text-xs">
                    </div>
                    <button onclick="saveEditSlide(${i})" class="w-full bg-primary text-slate-900 font-bold py-3 rounded-xl hover:opacity-90 transition text-sm">Save Changes</button>
                </div>
            </div>
        </div>`;
};

window.saveEditSlide = async function(i) {
    const slides = [...(db.settings?.bannerSlides || [])];
    slides[i] = {
        title: document.getElementById('bs_edit_title')?.value.trim() || '',
        image: document.getElementById('bs_edit_image')?.value.trim() || '',
        href:  document.getElementById('bs_edit_href')?.value.trim() || '',
    };
    if (!slides[i].image) return showAdminToast('Image URL required', true);
    await _saveBannerSlides(slides, 'Slide updated!');
    closeModal();
};

window.saveHeroSubtitles = async function() {
    const loggedIn  = document.getElementById('hero_subtitle_in')?.value.trim() || '';
    const loggedOut = document.getElementById('hero_subtitle_out')?.value.trim() || '';
    const settings = {
        ...(db.settings || {}),
        heroSubtitleLoggedIn:  loggedIn,
        heroSubtitleLoggedOut: loggedOut,
    };
    try {
        await patchServer('settings', settings);
        db.settings = settings;
        _bustAdminCache();
        showAdminToast('Subtitles saved!');
    } catch(e) { showAdminToast('Failed: ' + e.message, true); }
};

window.saveBannerInterval = async function() {
    const v = parseInt(document.getElementById('bs_interval')?.value) || 5;
    const settings = { ...(db.settings || {}), bannerInterval: Math.max(2, Math.min(30, v)) };
    try {
        await patchServer('settings', settings);
        db.settings = settings;
        _bustAdminCache();
        showAdminToast('Interval saved!');
    } catch(e) { showAdminToast('Failed: ' + e.message, true); }
};

async function _saveBannerSlides(slides, msg) {
    const settings = { ...(db.settings || {}), bannerSlides: slides };
    try {
        await patchServer('settings', settings);
        db.settings = settings;
        _bustAdminCache();
        const view = document.getElementById('admin-view-area');
        if (view) _renderBannersPanel(view);
        showAdminToast(msg || 'Saved!');
    } catch(e) { showAdminToast('Failed: ' + e.message, true); }
}

// ── ADMIN: SOCIAL LINKS PANEL ─────────────────────────────────────────────────
async function renderAdminSocial(view) {
    if (!requireAdmin()) return;
    if (!db.settings) {
        view.innerHTML = `<div class="flex items-center justify-center py-20 text-slate-400 text-sm"><div class="animate-spin w-5 h-5 border-2 border-white/20 border-t-primary rounded-full mr-3"></div>Loading…</div>`;
        try { await fetchAdminDB(true, true); } catch(e) {}
    }
    _renderSocialPanel(view);
}

function _renderSocialPanel(view) {
    const links = db.settings?.socialLinks || [];
    let rows = links.map((link, i) => _buildSocialRow(link, i, links.length)).join('');
    if (!rows) rows = `<div class="text-center py-8 text-slate-500 text-sm">No social links yet. Add your first link below.</div>`;

    // Preset popular platforms
    const presets = [
        { label:'Telegram Channel', icon:'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Telegram_logo.svg/512px-Telegram_logo.svg.png', url:'https://t.me/' },
        { label:'Telegram Bot', icon:'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Telegram_logo.svg/512px-Telegram_logo.svg.png', url:'https://t.me/' },
        { label:'WhatsApp', icon:'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/512px-WhatsApp.svg.png', url:'https://wa.me/' },
        { label:'Facebook', icon:'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/512px-Facebook_Logo_%282019%29.png', url:'https://facebook.com/' },
        { label:'YouTube', icon:'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/512px-YouTube_full-color_icon_%282017%29.svg.png', url:'https://youtube.com/' },
        { label:'Instagram', icon:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/512px-Instagram_icon.png', url:'https://instagram.com/' },
        { label:'Twitter/X', icon:'https://abs.twimg.com/favicons/twitter.3.ico', url:'https://x.com/' },
        { label:'Discord', icon:'https://assets-global.website-files.com/6257adef93867e50d84d30e2/6266bc493fb42d4e27d97008_Discord-Logo-Color.png', url:'https://discord.gg/' },
    ];
    const presetsHtml = presets.map(p => `
        <button onclick="prefillSocial('${p.label}','${p.icon}','${p.url}')"
            class="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-bgMain border border-white/5 hover:border-primary/30 transition group cursor-pointer">
            <img src="${p.icon}" alt="${p.label}" class="w-7 h-7 object-contain rounded">
            <span class="text-[10px] text-slate-400 group-hover:text-white transition text-center leading-tight">${p.label}</span>
        </button>`).join('');

    view.innerHTML = `
        <div class="flex justify-between items-center mb-6 flex-wrap gap-2">
            <div>
                <h2 class="text-xl md:text-2xl font-bold text-white">Social Media Links</h2>
                <p class="text-slate-400 text-xs mt-1">Displayed below the banner slider on the dashboard</p>
            </div>
            <span class="text-xs bg-white/5 text-slate-400 px-3 py-1.5 rounded-lg border border-white/10">${links.length} link${links.length!==1?'s':''}</span>
        </div>

        <!-- Preview -->
        ${links.length ? `<div class="bg-bgMain rounded-2xl border border-white/10 p-4 mb-6">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Preview</p>
            <div class="social-grid">${links.filter(l=>l&&l.url).map(link=>`
                <a href="${link.url}" target="_blank" rel="noopener" class="social-item" style="pointer-events:none;">
                    ${link.icon ? `<img src="${link.icon}" alt="${link.label||''}">` : ''}
                    ${link.label ? `<span>${link.label}</span>` : ''}
                </a>`).join('')}
            </div>
        </div>` : ''}

        <!-- Existing links -->
        <div id="sl-links-list" class="mb-6">${rows}</div>

        <!-- Add form -->
        <div class="bg-panelMain border border-primary/20 rounded-2xl p-5">
            <h3 class="text-white font-bold text-sm mb-3">➕ Add Social Link</h3>
            <p class="text-xs text-slate-500 mb-4">Quick add — click a preset to prefill:</p>
            <div class="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-5">${presetsHtml}</div>
            <div class="space-y-3">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs text-slate-400 mb-1 font-bold uppercase tracking-wide">Label <span class="font-normal text-slate-500">(e.g. Telegram)</span></label>
                        <input type="text" id="sl_new_label" placeholder="Platform name"
                            class="w-full bg-bgMain border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none">
                    </div>
                    <div>
                        <label class="block text-xs text-slate-400 mb-1 font-bold uppercase tracking-wide">Icon Image URL</label>
                        <input type="url" id="sl_new_icon" placeholder="https://…/icon.png"
                            class="w-full bg-bgMain border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none font-mono text-[11px]">
                    </div>
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1 font-bold uppercase tracking-wide">URL / Link <span class="text-rose-400">*</span></label>
                    <input type="url" id="sl_new_url" placeholder="https://t.me/yourchannel"
                        class="w-full bg-bgMain border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none font-mono text-xs">
                </div>
                <button onclick="addSocialLink()" class="w-full bg-primary text-slate-900 font-bold py-3 rounded-xl hover:opacity-90 transition text-sm">Add Link</button>
            </div>
        </div>`;
}

function _buildSocialRow(link, i, total) {
    return `
        <div class="bs-slide-row">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-black/30 border border-white/10 flex items-center justify-center">
                    ${link.icon ? `<img src="${link.icon}" alt="" class="w-7 h-7 object-contain" onerror="this.style.opacity=0.2">` : '<span class="text-slate-600 text-lg">🔗</span>'}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-bold text-white">${link.label || '<span class="text-slate-500 italic">No label</span>'}</div>
                    <div class="text-[11px] text-primary/70 font-mono truncate">${link.url}</div>
                </div>
                <div class="flex gap-1.5 shrink-0">
                    ${i > 0 ? `<button onclick="moveSocialLink(${i},-1)" class="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs hover:bg-white/10 transition">↑</button>` : ''}
                    ${i < total-1 ? `<button onclick="moveSocialLink(${i},1)" class="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs hover:bg-white/10 transition">↓</button>` : ''}
                    <button onclick="editSocialLink(${i})" class="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 text-blue-400 hover:bg-blue-500/30 flex items-center justify-center transition">
                        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button onclick="deleteSocialLink(${i})" class="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/20 text-rose-400 hover:bg-rose-500/30 flex items-center justify-center transition">
                        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </div>
        </div>`;
}

window.prefillSocial = function(label, icon, url) {
    const lEl = document.getElementById('sl_new_label');
    const iEl = document.getElementById('sl_new_icon');
    const uEl = document.getElementById('sl_new_url');
    if (lEl) lEl.value = label;
    if (iEl) iEl.value = icon;
    if (uEl) { uEl.value = url; uEl.focus(); }
};

window.addSocialLink = async function() {
    const label = document.getElementById('sl_new_label')?.value.trim() || '';
    const icon  = document.getElementById('sl_new_icon')?.value.trim() || '';
    const url   = document.getElementById('sl_new_url')?.value.trim() || '';
    if (!url) return showAdminToast('URL is required', true);
    const links = [...(db.settings?.socialLinks || []), { label, icon, url }];
    await _saveSocialLinks(links, 'Link added!');
};

window.deleteSocialLink = async function(i) {
    if (!confirm('Delete this link?')) return;
    const links = (db.settings?.socialLinks || []).filter((_, idx) => idx !== i);
    await _saveSocialLinks(links, 'Link deleted.');
};

window.moveSocialLink = async function(i, dir) {
    const links = [...(db.settings?.socialLinks || [])];
    const j = i + dir;
    if (j < 0 || j >= links.length) return;
    [links[i], links[j]] = [links[j], links[i]];
    await _saveSocialLinks(links, 'Order updated.');
};

window.editSocialLink = function(i) {
    const link = (db.settings?.socialLinks || [])[i];
    if (!link) return;
    document.getElementById('modal-root').innerHTML = `
        <div class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4 fade-in">
            <div class="bg-bgMain border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
                <button onclick="closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                <h2 class="text-lg font-bold text-white mb-4">Edit Social Link</h2>
                <div class="space-y-3">
                    <div>
                        <label class="block text-xs text-slate-400 mb-1 font-bold uppercase tracking-wide">Label</label>
                        <input type="text" id="sl_edit_label" value="${link.label || ''}"
                            class="w-full bg-panelMain border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none">
                    </div>
                    <div>
                        <label class="block text-xs text-slate-400 mb-1 font-bold uppercase tracking-wide">Icon Image URL</label>
                        <input type="url" id="sl_edit_icon" value="${link.icon || ''}"
                            class="w-full bg-panelMain border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none font-mono text-[11px]">
                    </div>
                    <div>
                        <label class="block text-xs text-slate-400 mb-1 font-bold uppercase tracking-wide">URL</label>
                        <input type="url" id="sl_edit_url" value="${link.url || ''}"
                            class="w-full bg-panelMain border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none font-mono text-xs">
                    </div>
                    <button onclick="saveEditSocialLink(${i})" class="w-full bg-primary text-slate-900 font-bold py-3 rounded-xl hover:opacity-90 transition text-sm">Save Changes</button>
                </div>
            </div>
        </div>`;
};

window.saveEditSocialLink = async function(i) {
    const links = [...(db.settings?.socialLinks || [])];
    links[i] = {
        label: document.getElementById('sl_edit_label')?.value.trim() || '',
        icon:  document.getElementById('sl_edit_icon')?.value.trim() || '',
        url:   document.getElementById('sl_edit_url')?.value.trim() || '',
    };
    if (!links[i].url) return showAdminToast('URL required', true);
    await _saveSocialLinks(links, 'Link updated!');
    closeModal();
};

// ── ADMIN: TG REQUIRED CHANNELS PANEL ────────────────────────────────────────
async function renderAdminTgChannels(view) {
    if (!requireAdmin()) return;
    if (!db.settings) {
        view.innerHTML = `<div class="flex items-center justify-center py-20 text-slate-400 text-sm"><div class="animate-spin w-5 h-5 border-2 border-white/20 border-t-primary rounded-full mr-3"></div>Loading…</div>`;
        try { await fetchAdminDB(true, true); } catch(e) {}
    }
    _renderTgChannelsPanel(view);
}

function _buildTgGatePreviewHtml(channels) {
    if (!channels.length) return `<div style="text-align:center;padding:20px 0;color:#475569;font-size:13px;">No channels added yet — add channels below to see the gate preview</div>`;
    const rows = channels.map(ch => {
        const link = ch.link || ch.username;
        const href = link.startsWith('http') ? link : `https://t.me/${link.replace(/^@/,'')}`;
        return `<div style="display:flex;align-items:center;gap:12px;padding:11px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;">
            <svg style="width:20px;height:20px;flex-shrink:0;color:#29aae1;" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/></svg>
            <span style="flex:1;color:#fff;font-weight:700;font-size:13px;">${ch.name || ch.username}</span>
            <span style="font-size:10px;color:#29aae1;font-family:monospace;">${ch.username}</span>
            <svg style="width:12px;height:12px;opacity:.4;flex-shrink:0;" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
        </div>`;
    }).join('');
    return `
        <div style="text-align:center;margin-bottom:14px;">
            <div style="width:44px;height:44px;background:rgba(41,170,225,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;">
                <svg style="width:22px;height:22px;color:#29aae1;" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/></svg>
            </div>
            <div style="color:#fff;font-size:16px;font-weight:800;margin-bottom:4px;">Join Our Channels</div>
            <div style="color:#64748b;font-size:12px;">Please join the following channels to access the site</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">${rows}</div>
        <div style="width:100%;padding:11px;background:rgba(245,158,11,0.2);border:1px solid rgba(245,158,11,0.3);border-radius:12px;text-align:center;color:#f59e0b;font-weight:700;font-size:13px;">Check Again</div>`;
}

function _renderTgChannelsPanel(view) {
    const channels = db.settings?.requiredTgChannels || [];
    const botToken = db.settings?.tgBotToken || db.settings?.telegramBotToken || '';

    const rowsHtml = channels.length
        ? channels.map((ch, i) => `
            <div class="bs-slide-row" id="tgch-row-${i}">
                <!-- View mode -->
                <div class="tgch-view-${i} flex items-center gap-3">
                    <div class="flex gap-1.5 shrink-0 flex-col">
                        ${i > 0 ? `<button onclick="moveTgChannel(${i},-1)" title="Move up" class="w-6 h-6 rounded-md bg-white/5 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs hover:bg-white/10 transition">↑</button>` : '<div class="w-6 h-6"></div>'}
                        ${i < channels.length-1 ? `<button onclick="moveTgChannel(${i},1)" title="Move down" class="w-6 h-6 rounded-md bg-white/5 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs hover:bg-white/10 transition">↓</button>` : '<div class="w-6 h-6"></div>'}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-bold text-white">${ch.name || '<span class="text-slate-500 italic">No name</span>'}</div>
                        <div class="text-[11px] text-primary/70 font-mono truncate">${ch.username}</div>
                        ${ch.link && ch.link !== ch.username ? `<div class="text-[10px] text-slate-600 font-mono truncate">${ch.link}</div>` : ''}
                    </div>
                    <div class="flex gap-1.5 shrink-0">
                        <button onclick="editTgChannel(${i})" class="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 text-blue-400 hover:bg-blue-500/30 flex items-center justify-center transition" title="Edit">
                            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onclick="deleteTgChannel(${i})" class="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/20 text-rose-400 hover:bg-rose-500/30 flex items-center justify-center transition" title="Delete">
                            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                </div>
                <!-- Edit mode (hidden by default) -->
                <div class="tgch-edit-${i} hidden bg-bgMain border border-primary/30 rounded-xl p-3 mt-1">
                    <div class="space-y-2 mb-3">
                        <input type="text" id="tgch_edit_name_${i}" value="${(ch.name||'').replace(/"/g,'&quot;')}" placeholder="Display Name"
                            class="w-full bg-panelMain border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none">
                        <input type="text" id="tgch_edit_username_${i}" value="${(ch.username||'').replace(/"/g,'&quot;')}" placeholder="@username for membership check *"
                            class="w-full bg-panelMain border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none font-mono text-xs">
                        <input type="text" id="tgch_edit_link_${i}" value="${(ch.link||'').replace(/"/g,'&quot;')}" placeholder="Join link (https://t.me/…)"
                            class="w-full bg-panelMain border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none font-mono text-xs">
                    </div>
                    <div class="flex gap-2">
                        <button onclick="saveTgChannelEdit(${i})" class="flex-1 bg-primary text-slate-900 font-bold py-2 rounded-lg text-xs hover:opacity-90 transition">Save</button>
                        <button onclick="cancelTgChannelEdit(${i})" class="flex-1 bg-white/5 text-slate-400 font-bold py-2 rounded-lg text-xs hover:bg-white/10 transition">Cancel</button>
                    </div>
                </div>
            </div>`).join('')
        : `<div class="text-center py-8 text-slate-500 text-sm">No required channels yet. Add one below.</div>`;

    view.innerHTML = `
        <div class="flex justify-between items-center mb-6 flex-wrap gap-2">
            <div>
                <h2 class="text-xl md:text-2xl font-bold text-white">📣 TG Required Channels</h2>
                <p class="text-slate-400 text-xs mt-1">Telegram-login users must join these channels before accessing the site</p>
            </div>
            <span class="text-xs bg-white/5 text-slate-400 px-3 py-1.5 rounded-lg border border-white/10">${channels.length} channel${channels.length!==1?'s':''}</span>
        </div>

        <!-- Bot Token -->
        <div class="bg-bgMain rounded-2xl border border-white/10 p-4 mb-5">
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bot Token for Channel Check</label>
            <p class="text-[11px] text-slate-500 mb-3">The bot must be an <strong class="text-slate-400">admin</strong> in every required channel. If left blank, the login bot token is used automatically.</p>
            <div class="flex gap-2">
                <input type="text" id="tgch_bot_token" value="${botToken}"
                    placeholder="Leave blank to use your login bot token"
                    class="flex-1 bg-panelMain border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none font-mono text-xs">
                <button onclick="saveTgBotToken()" class="bg-primary/20 text-primary border border-primary/30 px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/30 transition whitespace-nowrap">Save Token</button>
            </div>
        </div>

        <!-- Channel list -->
        <div id="tgch-list" class="mb-5 space-y-2">${rowsHtml}</div>

        <!-- Gate preview panel (always visible) -->
        <div id="tgch-preview-panel" class="mb-5 bg-bgMain rounded-2xl border border-white/10 p-4">
            <div class="mb-3">
                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Gate Preview (what users see)</span>
            </div>
            <div style="background:rgba(8,10,18,0.95);border-radius:16px;padding:20px;">
                ${_buildTgGatePreviewHtml(channels)}
            </div>
        </div>

        <!-- Add form -->
        <div class="bg-panelMain border border-primary/20 rounded-2xl p-5">
            <h3 class="text-white font-bold text-sm mb-4">➕ Add Required Channel</h3>
            <div class="space-y-3">
                <input type="text" id="tgch_new_name" placeholder="Display Name (e.g. My Updates Channel)"
                    class="w-full bg-bgMain border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none">
                <div>
                    <input type="text" id="tgch_new_username" placeholder="@username  ← for membership check *"
                        class="w-full bg-bgMain border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none font-mono text-xs">
                    <p class="text-[11px] text-slate-500 mt-1">Must be <strong class="text-slate-400">@username</strong> format so the bot can check membership via Telegram API</p>
                </div>
                <input type="text" id="tgch_new_link" placeholder="Join link — https://t.me/… (optional, defaults to username)"
                    class="w-full bg-bgMain border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none font-mono text-xs">
                <button onclick="addTgChannel()" class="w-full bg-primary text-slate-900 font-bold py-3 rounded-xl hover:opacity-90 transition text-sm">Add Channel</button>
            </div>
        </div>`;
}

window.editTgChannel = function(i) {
    document.querySelector(`.tgch-view-${i}`)?.classList.add('hidden');
    document.querySelector(`.tgch-edit-${i}`)?.classList.remove('hidden');
};

window.cancelTgChannelEdit = function(i) {
    document.querySelector(`.tgch-view-${i}`)?.classList.remove('hidden');
    document.querySelector(`.tgch-edit-${i}`)?.classList.add('hidden');
};

window.saveTgChannelEdit = async function(i) {
    const name     = document.getElementById(`tgch_edit_name_${i}`)?.value.trim() || '';
    const username = document.getElementById(`tgch_edit_username_${i}`)?.value.trim() || '';
    const link     = document.getElementById(`tgch_edit_link_${i}`)?.value.trim() || '';
    if (!username) return showAdminToast('Username is required', true);
    const channels = [...(db.settings?.requiredTgChannels || [])];
    channels[i] = { name, username, link: link || username };
    await _saveTgChannels(channels, 'Channel updated!');
};

window.saveTgBotToken = async function() {
    const token = document.getElementById('tgch_bot_token')?.value.trim() || '';
    const settings = { ...(db.settings || {}), tgBotToken: token };
    try {
        await patchServer('settings', settings);
        db.settings = settings;
        _bustAdminCache();
        showAdminToast('Bot token saved!');
    } catch(e) { showAdminToast('Failed: ' + e.message, true); }
};

window.addTgChannel = async function() {
    const name     = document.getElementById('tgch_new_name')?.value.trim() || '';
    const username = document.getElementById('tgch_new_username')?.value.trim() || '';
    const link     = document.getElementById('tgch_new_link')?.value.trim() || '';
    if (!username) return showAdminToast('Username is required — use @channelname format', true);
    if (!username.startsWith('@') && !username.startsWith('http') && !username.match(/^-?\d+$/)) {
        return showAdminToast('Username must start with @ (e.g. @mychannel)', true);
    }
    const channels = [...(db.settings?.requiredTgChannels || []), { name, username, link: link || username }];
    await _saveTgChannels(channels, 'Channel added!');
};

window.deleteTgChannel = async function(i) {
    if (!confirm('Remove this channel requirement?')) return;
    const channels = (db.settings?.requiredTgChannels || []).filter((_, idx) => idx !== i);
    await _saveTgChannels(channels, 'Channel removed.');
};

window.moveTgChannel = async function(i, dir) {
    const channels = [...(db.settings?.requiredTgChannels || [])];
    const j = i + dir;
    if (j < 0 || j >= channels.length) return;
    [channels[i], channels[j]] = [channels[j], channels[i]];
    await _saveTgChannels(channels, 'Order updated.');
};

async function _saveTgChannels(channels, msg) {
    const settings = { ...(db.settings || {}), requiredTgChannels: channels };
    try {
        await patchServer('settings', settings);
        db.settings = settings;
        _bustAdminCache();
        const view = document.getElementById('admin-view-area');
        if (view) _renderTgChannelsPanel(view);
        showAdminToast(msg || 'Saved!');
    } catch(e) { showAdminToast('Failed: ' + e.message, true); }
}

async function _saveSocialLinks(links, msg) {
    const settings = { ...(db.settings || {}), socialLinks: links };
    try {
        await patchServer('settings', settings);
        db.settings = settings;
        _bustAdminCache();
        const view = document.getElementById('admin-view-area');
        if (view) _renderSocialPanel(view);
        showAdminToast(msg || 'Saved!');
    } catch(e) { showAdminToast('Failed: ' + e.message, true); }
}
