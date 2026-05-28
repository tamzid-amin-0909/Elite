// ==========================================
// HELPER: LINK DETECTION (Direct & Compressed)
// ==========================================
function linkify(text) {
    if (!text) return '';
    const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.trim().replace(urlPattern, function(url) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="inline-block text-primary underline hover:text-white transition-colors font-bold underline-offset-4">Link</a>`;
    });
}

// Global cleanup helper for CAPTCHA gates
function clearCaptchaGate() {
    const gate = document.getElementById('captcha-gate');
    if (gate) {
        gate.remove();
    }
}

// Instantly remove CAPTCHA whenever the user navigates (back button, breadcrumbs, etc.)
window.addEventListener('hashchange', clearCaptchaGate);

// ==========================================
// CAPTCHA GATE — Renders centered on screen
// Calls onSuccess() once the user answers correctly.
// ==========================================
function createCaptchaGate(onSuccess) {
    // Generate a simple arithmetic challenge
    function newChallenge() {
        const ops = ['+', '-', '×'];
        const op  = ops[Math.floor(Math.random() * ops.length)];
        let a, b, answer;
        if (op === '+') { a = Math.floor(Math.random() * 20) + 1; b = Math.floor(Math.random() * 20) + 1; answer = a + b; }
        if (op === '-') { a = Math.floor(Math.random() * 20) + 10; b = Math.floor(Math.random() * a) + 1;  answer = a - b; }
        if (op === '×') { a = Math.floor(Math.random() * 9)  + 2; b = Math.floor(Math.random() * 9) + 2;  answer = a * b; }
        return { question: `${a} ${op} ${b}`, answer };
    }

    let challenge = newChallenge();

    const gate = document.createElement('div');
    gate.id = 'captcha-gate';
    gate.innerHTML = `
        <div class="captcha-inner">
            <div class="captcha-shield">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6
                           3.42 3.42 0 003 6.75l.003.09c0 2.77.863 5.34 2.33 7.46
                           1.48 2.145 3.56 3.808 5.998 4.696a11.96 11.96 0 006-4.695
                           11.95 11.95 0 002.33-7.46L19.5 6.75a3.42 3.42 0 00-.598-.786
                           A11.96 11.96 0 0012 2.714z"/>
                </svg>
            </div>
            <p class="captcha-label">Verify you're human</p>
            <p class="captcha-question" id="captcha-question">${challenge.question} = ?</p>
            <div class="captcha-input-row">
                <input id="captcha-input" type="number" placeholder="Answer" autocomplete="off" />
                <button id="captcha-submit">Go</button>
            </div>
            <p class="captcha-error" id="captcha-error"></p>
            <button class="captcha-refresh" id="captcha-refresh" title="New question">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0
                           l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0
                           0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
                </svg>
                New question
            </button>
        </div>`;

    // ----- styles (injected once) -----
    if (!document.getElementById('captcha-gate-styles')) {
        const s = document.createElement('style');
        s.id = 'captcha-gate-styles';
        s.textContent = `
            #captcha-gate {
                position: fixed; 
                inset: 0; 
                z-index: 9999;
                display: flex; 
                align-items: center; 
                justify-content: center;
                background: rgba(8, 10, 18, 0.92);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                transition: opacity .4s ease;
            }
            #captcha-gate.captcha-fade-out { opacity: 0; pointer-events: none; }
            .captcha-inner {
                display: flex; flex-direction: column; align-items: center; gap: 10px;
                padding: 32px 40px; text-align: center;
                background: rgba(25, 28, 41, 0.75);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 20px;
                box-shadow: 0 20px 50px rgba(0,0,0,0.6);
                min-width: 280px;
                max-width: 90%;
                box-sizing: border-box;
            }
            .captcha-shield svg {
                width: 44px; height: 44px; color: var(--color-primary, #facc15);
                margin-bottom: 6px;
            }
            .captcha-label {
                font-size: 11px; font-weight: 700; letter-spacing: .15em;
                text-transform: uppercase; color: rgba(255,255,255,.45); margin: 0;
            }
            .captcha-question {
                font-size: 28px; font-weight: 800; color: #fff;
                letter-spacing: .02em; margin: 4px 0 6px;
                font-variant-numeric: tabular-nums;
            }
            .captcha-input-row { display: flex; gap: 8px; width: 100%; }
            #captcha-input {
                flex: 1; min-width: 0;
                background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18);
                color: #fff; border-radius: 8px; padding: 10px 14px;
                font-size: 16px; font-weight: 700; text-align: center;
                outline: none; transition: border-color .2s;
                -moz-appearance: textfield;
            }
            #captcha-input::-webkit-outer-spin-button,
            #captcha-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            #captcha-input:focus { border-color: var(--color-primary, #facc15); }
            #captcha-submit {
                background: var(--color-primary, #facc15); color: #1a1a1a;
                border: 0; border-radius: 8px; padding: 10px 22px;
                font-size: 14px; font-weight: 800; cursor: pointer; transition: opacity .2s;
            }
            #captcha-submit:hover { opacity: .85; }
            .captcha-error {
                font-size: 11px; color: #f87171; font-weight: 600;
                min-height: 16px; margin: 2px 0;
            }
            .captcha-refresh {
                background: transparent; border: 0; color: rgba(255,255,255,.35);
                font-size: 11px; cursor: pointer; display: flex; align-items: center;
                gap: 4px; padding: 4px 8px; border-radius: 6px;
                transition: color .2s, background .2s;
            }
            .captcha-refresh:hover { color: rgba(255,255,255,.7); background: rgba(255,255,255,.07); }
            .captcha-refresh svg { width: 13px; height: 13px; }

            /* success tick overlay */
            #captcha-gate .captcha-success-tick {
                position: absolute; inset: 0; display: flex; align-items: center;
                justify-content: center; pointer-events: none;
                background: rgba(8, 10, 18, 0.4);
                border-radius: 20px;
            }
            #captcha-gate .captcha-success-tick svg {
                width: 72px; height: 72px; color: var(--color-primary, #facc15);
                animation: captcha-pop .35s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
            }
            @keyframes captcha-pop {
                0%   { transform: scale(0.3); opacity: 0; }
                70%  { transform: scale(1.15); }
                100% { transform: scale(1);   opacity: 1; }
            }
        `;
        document.head.appendChild(s);
    }

    // ----- logic -----
    function attempt() {
        const val = parseInt(document.getElementById('captcha-input').value, 10);
        const errEl = document.getElementById('captcha-error');
        if (isNaN(val)) { errEl.textContent = 'Please enter a number.'; return; }
        if (val === challenge.answer) {
            errEl.textContent = '';
            // Show success tick on top of the card container, then fade out
            const inner = gate.querySelector('.captcha-inner');
            const tick = document.createElement('div');
            tick.className = 'captcha-success-tick';
            tick.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>`;
            inner.style.position = 'relative';
            inner.appendChild(tick);
            setTimeout(() => {
                gate.classList.add('captcha-fade-out');
                setTimeout(() => { gate.remove(); onSuccess(); }, 420);
            }, 600);
        } else {
            errEl.textContent = 'Wrong answer — try again!';
            document.getElementById('captcha-input').value = '';
            document.getElementById('captcha-input').focus();
            // Shake the question briefly
            const q = document.getElementById('captcha-question');
            q.style.animation = 'none';
            q.offsetHeight; // reflow
            q.style.animation = 'captcha-shake .35s ease';
        }
    }

    // Allow pressing Enter in the input
    gate.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') attempt();
    });

    gate.querySelector('#captcha-submit').addEventListener('click', attempt);

    gate.querySelector('#captcha-refresh').addEventListener('click', () => {
        challenge = newChallenge();
        document.getElementById('captcha-question').textContent = `${challenge.question} = ?`;
        document.getElementById('captcha-input').value = '';
        document.getElementById('captcha-error').textContent = '';
        document.getElementById('captcha-input').focus();
    });

    // Shake keyframe (injected once)
    if (!document.getElementById('captcha-shake-style')) {
        const s2 = document.createElement('style');
        s2.id = 'captcha-shake-style';
        s2.textContent = `@keyframes captcha-shake {
            0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)}
            40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)}
        }`;
        document.head.appendChild(s2);
    }

    return gate;
}

// ==========================================
// 13. CONTENT VIEWS
// ==========================================
function renderLandingCatalog() {
    clearCaptchaGate();
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById('breadcrumb').innerHTML = '';
    document.getElementById('breadcrumb-mobile').innerHTML = '';

    // Determine subtitle based on login state (editable from admin panel)
    const subtitleLoggedIn  = db.settings?.heroSubtitleLoggedIn  || 'Explore our premium courses. Click any course to start learning!';
    const subtitleLoggedOut = db.settings?.heroSubtitleLoggedOut || 'Explore our premium courses. Sign in or click a Free course to start learning immediately!';
    const heroSubtitle = currentUser ? subtitleLoggedIn : subtitleLoggedOut;

    // Welcome heading first, then banner + social below it
    const bannerHtml = (typeof renderBannerSection === 'function') ? renderBannerSection() : '';
    const socialHtml = (typeof renderSocialSection === 'function') ? renderSocialSection() : '';

    let html = `<div class="text-center mb-8 md:mb-12 fade-in"><h1 class="text-3xl md:text-5xl font-bold text-white mb-3 md:mb-4">Welcome to <span class="text-primary">EduZod</span></h1><p class="text-xs md:text-lg text-slate-400 max-w-2xl mx-auto px-4">${heroSubtitle}</p></div>`;
    html += bannerHtml + socialHtml;
    html += `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 fade-in">`;
    for (let [slug, sub] of getSortedEntries(db.content)) {
        html += `<a href="#${slug}" class="premium-card glass-panel rounded-2xl overflow-hidden block flex flex-col relative group">${generateAdminActions('', slug)}<div class="relative aspect-video overflow-hidden"><img src="${sub.thumbnail}" class="w-full h-full object-cover group-hover:scale-110 transition duration-700 opacity-80 group-hover:opacity-100"><div class="absolute top-3 right-3 ${sub.isFree ? 'bg-emerald-500' : 'bg-primary'} text-slate-900 text-[10px] font-bold px-3 py-1 rounded-full shadow-md uppercase">${sub.isFree ? 'Free' : 'Premium'}</div></div><div class="p-4 md:p-5 flex-grow flex flex-col"><h3 class="text-lg md:text-xl font-bold text-white mb-1.5 md:mb-2">${sub.title}</h3><p class="text-slate-400 text-xs md:text-sm line-clamp-2">${sub.description || 'Explore this course...'}</p></div></a>`;
    }
    if (currentUser?.role === 'admin') html += `<button onclick="openContentModal('')" class="glass-panel rounded-2xl border-dashed border-2 border-slate-600 hover:border-primary hover:bg-white/5 transition flex flex-col items-center justify-center min-h-[200px] md:min-h-[250px] text-slate-400 hover:text-primary group"><div class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-panelMain border border-slate-600 flex items-center justify-center mb-3 group-hover:scale-110 transition"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg></div><span class="font-bold text-sm md:text-base">Add Root Subject</span></button>`;
    app.innerHTML = html + `</div>`;
    // Init banner slider autoplay
    if (typeof bsInit === 'function') bsInit();
}

function renderCategory(item, hash, currentThumb) {
    clearCaptchaGate();
    window.scrollTo({ top: 0, behavior: 'instant' });
    let html = `<div class="max-w-7xl mx-auto fade-in"><div class="flex justify-between items-end mb-6 md:mb-8 border-b border-white/10 pb-4 relative"><div><h2 class="text-xl md:text-3xl font-bold text-white flex items-center gap-2 md:gap-3"><span class="w-1.5 md:w-2 h-5 md:h-8 bg-primary rounded-full"></span>${item.title}</h2>${item.description ? `<p class="text-slate-400 mt-2 text-xs md:text-base max-w-3xl">${item.description}</p>` : ''}</div></div><div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">`;
    if (item.children) {
        for (let [slug, child] of getSortedEntries(item.children)) {
            const childPath = (hash ? hash + '/' : '') + slug;
            const isVideo = child.type === 'video';
            const imgThumb = child.thumbnail || currentThumb;
            let isLocked = false;
            if (!hash && currentUser?.role !== 'admin') {
                if (currentUser?.role === 'subadmin') {
                    isLocked = !child.isFree && !subAdminCanEditContent(childPath);
                } else {
                    isLocked = !child.isFree && (!currentUser || (!currentUser.access.includes('all') && !currentUser.access.includes(slug)));
                }
            }
            html += `<a href="#${childPath}" onclick="if(${isLocked && !currentUser}){window.location.hash='login'; return false;}" class="premium-card glass-panel rounded-2xl overflow-hidden block group flex flex-col relative">${generateAdminActions(hash, slug)}<div class="relative aspect-[16/10] overflow-hidden bg-bgMain"><img src="${imgThumb}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100">${isLocked ? `<div class="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-10"><div class="text-center"><svg class="w-8 h-8 md:w-10 md:h-10 text-slate-400 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path></svg><span class="text-[10px] md:text-xs font-bold text-slate-300 uppercase">Locked</span></div></div>` : ''}${isVideo && !isLocked ? `<div class="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-all flex items-center justify-center"><div class="bg-primary text-slate-900 rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform pl-1"><svg class="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg></div></div>` : ''}<div class="absolute top-3 right-3 ${isVideo ? 'bg-rose-500 text-white' : (child.isFree ? 'bg-emerald-500 text-slate-900' : 'bg-primary text-slate-900')} text-[9px] md:text-[10px] font-bold px-2 py-1 md:px-2.5 md:py-1 rounded shadow-md uppercase tracking-wider">${isVideo ? 'Video' : (child.isFree ? 'Free Folder' : 'Folder')}</div></div><div class="p-3 md:p-4 flex-grow flex flex-col justify-center border-t border-white/5"><h3 class="text-sm md:text-base font-bold text-slate-200 text-center line-clamp-2 ${isLocked ? 'text-slate-500' : ''}">${child.title}</h3></div></a>`;
        }
    }
    const canAddItem = currentUser?.role === 'admin' || (currentUser?.role === 'subadmin' && subAdminCanEditContent(hash));
    if (canAddItem) html += `<button onclick="openContentModal('${hash}')" class="glass-panel rounded-2xl border-dashed border-2 border-slate-600 hover:border-primary hover:bg-white/5 transition flex flex-col items-center justify-center aspect-[16/10] sm:aspect-auto min-h-[150px] md:min-h-[180px] text-slate-400 hover:text-primary group"><div class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-panelMain border border-slate-600 flex items-center justify-center mb-2 md:mb-3 group-hover:scale-110 transition"><svg class="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg></div><span class="font-bold text-xs md:text-sm">Add Item Here</span></button>`;
    app.innerHTML = html + `</div></div>`;
}

function renderVideo(item, siblings, keys, currentThumb) {
    clearCaptchaGate();
    window.scrollTo({ top: 0, behavior: 'instant' });

    const parentHash = keys.slice(0, -1).join('/');
    const itemKey = keys[keys.length - 1];
    const itemPath = parentHash ? `${parentHash}/${itemKey}` : itemKey;
    const isAdmin = currentUser?.role === 'admin';
    const canEdit = isAdmin || (currentUser?.role === 'subadmin' && subAdminCanEditContent(itemPath));
    const processedNote = item.description ? linkify(item.description) : '';

    let html = `<div class="max-w-5xl mx-auto mb-8 md:mb-10 fade-in text-left">
        <div class="flex flex-wrap justify-between items-center gap-3 mb-4">
            <h2 class="text-xl md:text-3xl font-bold text-white flex-grow">${item.title}</h2>
            <div class="flex flex-wrap gap-2 shrink-0">
                <button onclick="shareContent('${item.title}')" class="bg-indigo-600/90 hover:bg-indigo-500 text-white px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg shadow-lg backdrop-blur transition flex items-center gap-1.5 text-[10px] md:text-sm font-bold">
                    <svg class="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg> Share
                </button>
                ${canEdit ? `<button onclick="openMoveCopyModal('${parentHash}', '${keys[keys.length-1]}')" class="bg-amber-600/90 hover:bg-amber-500 text-white p-1.5 md:p-2 rounded-lg shadow-lg transition"><svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg></button>
                <button onclick="openContentModal('${parentHash}', '${keys[keys.length-1]}')" class="bg-blue-600/90 hover:bg-blue-500 text-white p-1.5 md:p-2 rounded-lg shadow-lg transition"><svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
                <button onclick="deleteContent('${parentHash}', '${keys[keys.length-1]}')" class="bg-red-600/90 hover:bg-red-500 text-white p-1.5 md:p-2 rounded-lg shadow-lg transition"><svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>` : ''}
            </div>
        </div>

        <div class="player-mask-window mb-6">
            <div id="my-video-player" data-plyr-provider="youtube"></div>
        </div>

        ${item.description ? `
        <div class="glass-panel p-3 md:p-5 rounded-2xl border-l-4 border-l-primary bg-white/5 overflow-hidden flex flex-col items-start justify-start">
            <div class="flex items-center gap-2 mb-1 shrink-0">
                <svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>
                <h4 class="text-[10px] md:text-xs text-primary font-bold uppercase tracking-widest">Teacher's Note</h4>
            </div>
            <div class="text-sm md:text-base text-slate-300 leading-normal whitespace-pre-wrap break-words text-left w-full">${processedNote}</div>
        </div>` : ''}
    </div>

    <div class="max-w-7xl mx-auto fade-in">
        <h3 class="text-lg md:text-xl font-bold text-white mb-4 md:mb-6 flex items-center gap-2 border-b border-white/10 pb-2">Related Items</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">`;

    for (let [slug, sibling] of getSortedEntries(siblings)) {
        const sibPath = (parentHash ? parentHash + '/' : '') + slug;
        const isCurrent = slug === keys[keys.length - 1];
        const imgThumb = sibling.thumbnail || currentThumb;
        html += `<a href="#${sibPath}" class="glass-panel rounded-xl overflow-hidden block group relative ${isCurrent ? 'ring-2 ring-primary opacity-50 cursor-default pointer-events-none' : 'hover:-translate-y-1 transition'}">${generateAdminActions(parentHash, slug)}<div class="relative aspect-video overflow-hidden"><img src="${imgThumb}" class="w-full h-full object-cover">${sibling.type === 'video' ? `<div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg></div>` : ''}</div><div class="p-2 md:p-3 bg-panelMain"><h3 class="text-[10px] md:text-sm font-semibold text-slate-300 truncate">${sibling.title}</h3></div></a>`;
    }
    if (isAdmin) html += `<button onclick="openContentModal('${parentHash}')" class="glass-panel rounded-xl border-dashed border border-slate-600 hover:border-primary flex items-center justify-center text-slate-400 hover:text-primary min-h-[80px] md:min-h-[100px]"><svg class="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg></button>`;

    // Destroy existing player before replacing DOM
    if (window._activePlayer && typeof window._activePlayer.destroy === 'function') {
        try { window._activePlayer.destroy(); } catch(e) {}
    }
    window._activePlayer = null;

    app.innerHTML = html + `</div></div>`;

    // ── CAPTCHA GATE ON VIDEO LOAD ───────────────────────────────────────────
    if (item.url) {
        const captureUrl = item.url;

        const initializeVideoPlayer = () => {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    const el = document.getElementById('my-video-player');
                    if (!el) return;

                    el.dataset.encUrl = encryptURLForDOM(captureUrl);

                    const videoUrl = decryptURLFromDOM(el.dataset.encUrl || '');
                    if (!videoUrl) return;

                    const p = new HardenedPlayer('#my-video-player', videoUrl);
                    window._activePlayer = p;
                }, 50);
            });
        };

        // Create the gate container and render it centered on the viewport
        const gate = createCaptchaGate(() => {
            initializeVideoPlayer();
        });

        document.body.appendChild(gate);

        // Instantly focus input for desktop/mobile interaction
        setTimeout(() => {
            const inp = document.getElementById('captcha-input');
            if (inp) inp.focus();
        }, 100);
    }
}