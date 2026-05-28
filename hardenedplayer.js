class HardenedPlayer {
    constructor(selector, videoUrl) {
        this.element = document.querySelector(selector);
        this.container = this.element ? this.element.closest('.player-mask-window') : null;
        this.videoUrl = videoUrl;

        if (!this.element || !this.container) return;

        this.injectStyles();

        const isIframe = /iframe\.mediadelivery\.net\/embed/i.test(videoUrl);
        const isHLS    = /^https?:\/\/vz/i.test(videoUrl);

        if (isIframe)   this.initIframeEmbed();
        else if (isHLS) this.initHLS();
        else            this.init();
    }

    // ------------------------------------------------------------------
    // Public: clean teardown
    // ------------------------------------------------------------------
    destroy() {
        try {
            if (this.player && typeof this.player.destroy === 'function') {
                this.player.destroy();
            }
        } catch(e) {}

        this.player = null;
        this.element = null;
        this.container = null;
    }

    injectStyles() {
        if (document.getElementById('hardened-player-styles')) return;

        const style = document.createElement('style');
        style.id = 'hardened-player-styles';

        style.innerHTML = `
            .player-mask-window {
                position: relative;
                width: 100%;
                max-width: 1000px;
                aspect-ratio: 16 / 9;
                margin: 0 auto;
                background: #000;
                overflow: hidden;
                border-radius: 12px;
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                border: 1px solid rgba(255,255,255,0.1);
            }

            .plyr__video-embed iframe {
                position: absolute !important;
                top: -33.33% !important;
                height: 166.66% !important;
                width: 100% !important;
                scale: 1 !important;
                pointer-events: none !important;
                transition: scale .2s ease;
            }

            /* Zoomed mode */
            .player-mask-window.zoomed .plyr__video-embed iframe {
                scale: .83333 !important;
            }

            :fullscreen .player-mask-window,
            .player-mask-window:fullscreen {
                width: 100vw !important;
                height: 100vh !important;
                max-width: none !important;
                border-radius: 0 !important;
                border: none !important;
            }

            :fullscreen .plyr,
            :fullscreen .plyr__video-wrapper {
                height: 100% !important;
            }

            .plyr--full-ui.plyr--video .plyr__control--overlaid {
                display: none !important;
            }

            .plyr__volume,
            .plyr__control[data-plyr="mute"] {
                display: none !important;
            }

            .custom-fs-btn {
                background: transparent;
                border: 0;
                color: #fff;
                cursor: pointer;
                padding: 7px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background .2s ease;
            }

            .custom-fs-btn:hover {
                background: rgba(255,255,255,0.2);
                border-radius: 4px;
            }

            .custom-fs-btn.active {
                background: rgba(255,255,255,0.25);
                border-radius: 4px;
            }

            .custom-fs-btn svg {
                width: 18px;
                height: 18px;
                fill: currentColor;
            }

            .iframe-media-embed {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                border: none;
                display: block;
            }

            .iframe-media-overlay {
                position: absolute;
                inset: 0;
                z-index: 10;
            }
        `;

        document.head.appendChild(style);
    }

    // ── HLS Direct Play ───────────────────────────────────────────────
    initHLS() {
        const video = document.createElement('video');

        video.setAttribute('playsinline', '');
        video.setAttribute('controls', '');

        this.element.replaceWith(video);
        this.element = video;

        // Played directly using the raw videoUrl instead of proxy.php wrapper
        const directUrl = this.videoUrl;

        if (!window.Hls) {
            console.error('HardenedPlayer: hls.js not loaded');
            return;
        }

        if (Hls.isSupported()) {
            const hls = new Hls({ debug: false });

            hls.loadSource(directUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {

                const heights = [...new Set(data.levels.map(l => l.height))]
                    .filter(h => h <= 720)
                    .sort((a, b) => b - a);

                const options = [0, ...heights];

                const i18n = { 0: 'Auto' };

                heights.forEach(h => {
                    i18n[h] = h + 'p';
                });

                this.player = new Plyr(video, {
                    controls: [
                        'play',
                        'rewind',
                        'fast-forward',
                        'progress',
                        'current-time',
                        'settings'
                    ],

                    settings: ['quality', 'speed'],

                    keyboard: {
                        focused: false,
                        global: false
                    },

                    quality: {
                        default: 0,
                        options,
                        forced: true,

                        onChange: (newQ) => {
                            if (newQ === 0) {
                                hls.currentLevel = -1;
                            } else {
                                hls.levels.forEach((level, index) => {
                                    if (level.height === newQ) {
                                        hls.currentLevel = index;
                                    }
                                });
                            }
                        },
                    },

                    i18n: {
                        qualityLabel: i18n
                    },
                });

                this.player.on('ready', () => {
                    this.player.volume = 1;
                    this.setupControls();
                });

                this.player.play().catch(() => {});
            });

            hls.on(Hls.Events.ERROR, (_, data) => {
                if (data.fatal) {
                    console.error(
                        'HardenedPlayer HLS error:',
                        data.type,
                        data.details
                    );
                }
            });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {

            video.src = directUrl;

            this.player = new Plyr(video, {
                controls: [
                    'play',
                    'rewind',
                    'fast-forward',
                    'progress',
                    'current-time',
                    'settings'
                ],

                settings: ['speed'],

                keyboard: {
                    focused: false,
                    global: false
                },
            });

            this.player.on('ready', () => {
                this.player.volume = 1;
                this.setupControls();
            });
        }

        this._blockKeys();

        this.container.addEventListener('contextmenu', e => {
            e.preventDefault();
        });
    }

    // ── iframe embed ────────────────────────────────────────────────────
    initIframeEmbed() {
        const iframe = document.createElement('iframe');

        iframe.src = this.videoUrl;
        iframe.className = 'iframe-media-embed';

        iframe.allow =
            'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;';

        iframe.allowFullscreen = true;

        this.element.replaceWith(iframe);

        this.container.addEventListener('contextmenu', e => {
            e.preventDefault();
        });

        this._blockKeys();
    }

    // ── YouTube / generic Plyr embed ───────────────────────────────────
    init() {
        this.element.setAttribute(
            'data-plyr-embed-id',
            this.extractId(this.videoUrl)
        );

        this.player = new Plyr(this.element, {
            controls: [
                'play',
                'rewind',
                'fast-forward',
                'progress',
                'current-time',
                'settings'
            ],

            settings: ['quality', 'speed'],

            keyboard: {
                focused: false,
                global: false
            },

            youtube: {
                noCookie: false,
                rel: 0,
                modestbranding: 1,
                cookie: 0
            },
        });

        this.player.on('ready', () => {
            this.player.volume = 1;
            this.setupControls();
        });

        this.container.addEventListener('contextmenu', e => {
            e.preventDefault();
        });

        this._blockKeys();
    }

    // ── Shared helpers ─────────────────────────────────────────────────
    _blockKeys() {
        const blocked = [
            ' ',
            'k',
            'j',
            'l',
            'f',
            'm',
            '0',
            '1',
            '2',
            '3',
            '4',
            '5',
            '6',
            '7',
            '8',
            '9',
            'arrowleft',
            'arrowright'
        ];

        this.container.addEventListener('keydown', (e) => {
            if (blocked.includes(e.key.toLowerCase())) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    }

    extractId(url) {
        const match = url.match(
            /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
        );

        return (match && match[2].length === 11)
            ? match[2]
            : url;
    }

    // ── Custom controls ────────────────────────────────────────────────
    setupControls() {
        const bar = this.container.querySelector('.plyr__controls');

        if (!bar || this.container.querySelector('.custom-fs-btn')) {
            return;
        }

        // --------------------------------------------------------------
        // Zoom Button
        // --------------------------------------------------------------
        const zoomBtn = document.createElement('button');

        zoomBtn.className = 'custom-fs-btn';
        zoomBtn.setAttribute('aria-label', 'Toggle Zoom');

        zoomBtn.innerHTML = `
            <svg viewBox="0 0 18 18">
                <path d="M12.5 11h-.79l-.28-.27A5.5 5.5 0 1 0 11 12.5l.27.28v.79L16 18l2-2-5.5-5.5zm-5 0A3.5 3.5 0 1 1 11 7.5 3.5 3.5 0 0 1 7.5 11z"></path>
            </svg>
        `;

        bar.appendChild(zoomBtn);

        let zoomed = false;

        zoomBtn.addEventListener('click', () => {

            zoomed = !zoomed;

            this.container.classList.toggle('zoomed', zoomed);

            zoomBtn.classList.toggle('active', zoomed);
        });

        // --------------------------------------------------------------
        // Fullscreen Button
        // --------------------------------------------------------------
        const fsBtn = document.createElement('button');

        fsBtn.className = 'custom-fs-btn';
        fsBtn.setAttribute('aria-label', 'Fullscreen');

        fsBtn.innerHTML = `
            <svg viewBox="0 0 18 18">
                <path d="M10 3h5v5h-2V5h-3V3zM8 3H3v5h2V5h3V3zm5 10h-3v2h5v-5h-2v3zM5 13H3v5h5v-2H5v-3z"></path>
            </svg>
        `;

        bar.appendChild(fsBtn);

        fsBtn.addEventListener('click', () => {

            if (!document.fullscreenElement) {

                this.container.requestFullscreen().catch(() => {});

                if (screen.orientation?.lock) {
                    screen.orientation.lock('landscape').catch(() => {});
                }

            } else {

                document.exitFullscreen().catch(() => {});
            }
        });
    }
}
