// ============================================================
//  REVAMP script.js  (v2)
//  3D BG Story · Scroll-Jacked Projects · Holo Voicelines
// ============================================================
'use strict';

// ── Mobile / Touch Detection ─────────────────────────────
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
const isMobile = isTouchDevice || isSmallScreen;

const isInProjects = window.location.pathname.toLowerCase().includes('/projects/');
const basePath = isInProjects ? '../' : '';

// Clear the page-transition curtain whenever the page is shown — including
// bfcache restores (browser back button). Without this, returning to a page
// leaves the "Portifolio" curtain stuck over the viewport.
window.addEventListener('pageshow', () => {
    const ov = document.querySelector('.page-transition-overlay');
    if (ov) ov.classList.remove('active');
});

// ── Global Preload Solver ──────────────────────────────────
// Removed window.addEventListener('load') to ensure body.preload is removed only after Holo sequence.



window.holoCanNavigate = false;

// ── Audio ────────────────────────────────────────────────────
const sounds = {};
['click', 'pop', 'shatter'].forEach(k => {
    sounds[k] = new Audio(basePath + 'images/' + (k === 'click' ? 'mouse-click' : k === 'pop' ? 'bubble-pop' : 'glass-shatter') + '.mp3');
    sounds[k].preload = 'auto';
    sounds[k].load();
});
let audioUnlocked = false;
function unlockAudio() {
    if (audioUnlocked) return; audioUnlocked = true;
    Object.values(sounds).forEach(a => { a.muted = true; a.play().catch(() => { }).then(() => { a.pause(); a.currentTime = 0; a.muted = false; }); });
}
window.addEventListener('click', unlockAudio, { once: true, capture: true });
function playSound(k, vol = 1) { if (!sounds[k]) return; const c = sounds[k].cloneNode(); c.volume = vol; c.play().catch(() => { }); }

// ── Nav link delay + sound ────────────────────────────────────
document.addEventListener('click', e => {
    const tgt = e.target.closest('a,.cta-button');
    if (!tgt || e.target.closest('#holo-container')) return;
    if (tgt.tagName === 'A' && tgt.href && tgt.target !== '_blank' && !tgt.getAttribute('href').startsWith('#')) {
        if (!e.ctrlKey && !e.metaKey) {
            playSound('click', 0.35);
            e.preventDefault();

            // Trigger transition overlay
            const ov = document.querySelector('.page-transition-overlay');
            if (ov) ov.classList.add('active');

            setTimeout(() => { window.location.href = tgt.href; }, 600);
        }
    } else {
        playSound('click', 0.35);
    }
});

// ============================================================
//  3D BACKGROUND — SCROLL STORY
// ============================================================
const BG_KEYFRAMES = [
    { p: 0.00, rx: 0, ry: 0, rz: 0, tx: 0, ty: 0, s: 1.18 },
    { p: 0.18, rx: 4, ry: -14, rz: 2, tx: -6, ty: -3, s: 1.14 },
    { p: 0.38, rx: 12, ry: 10, rz: -3, tx: 5, ty: -8, s: 1.22 },
    { p: 0.60, rx: -6, ry: -8, rz: 5, tx: -8, ty: 4, s: 1.10 },
    { p: 0.76, rx: 14, ry: 6, rz: -2, tx: 3, ty: 7, s: 1.08 },
    { p: 1.00, rx: 0, ry: 0, rz: 0, tx: 0, ty: 0, s: 1.12 },
];

function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function lerp(a, b, t) { return a + (b - a) * t; }
function getStoryState(p) {
    p = Math.max(0, Math.min(1, p));
    let lo = BG_KEYFRAMES[0], hi = BG_KEYFRAMES[BG_KEYFRAMES.length - 1];
    for (let i = 0; i < BG_KEYFRAMES.length - 1; i++) {
        if (p >= BG_KEYFRAMES[i].p && p <= BG_KEYFRAMES[i + 1].p) { lo = BG_KEYFRAMES[i]; hi = BG_KEYFRAMES[i + 1]; break; }
    }
    const range = hi.p - lo.p || 0.0001;
    const t = easeInOut((p - lo.p) / range);
    return {
        rx: lerp(lo.rx, hi.rx, t), ry: lerp(lo.ry, hi.ry, t), rz: lerp(lo.rz, hi.rz, t),
        tx: lerp(lo.tx, hi.tx, t), ty: lerp(lo.ty, hi.ty, t), s: lerp(lo.s, hi.s, t)
    };
}

let mNX = 0, mNY = 0, cRX = 0, cRY = 0;
const CURSOR_DEG = 5, CURSOR_LERP = 0.055;
if (!isMobile) {
    document.addEventListener('mousemove', e => {
        mNX = (e.clientX / window.innerWidth) * 2 - 1;
        mNY = (e.clientY / window.innerHeight) * 2 - 1;
    });
}

let cur = { rx: 0, ry: 0, rz: 0, tx: 0, ty: 0, s: 1.18 };
const BG_LERP = 0.055;
const bgEl = document.getElementById('cinematic-bg');
const progressBar = document.getElementById('scroll-progress-bar');

function renderBG() {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

    const progress = maxScroll > 0 ? scrollY / maxScroll : 0;
    const target = getStoryState(progress);

    cRX += (mNY * -CURSOR_DEG - cRX) * CURSOR_LERP;
    cRY += (mNX * CURSOR_DEG - cRY) * CURSOR_LERP;

    cur.rx += (target.rx - cur.rx) * BG_LERP;
    cur.ry += (target.ry - cur.ry) * BG_LERP;
    cur.rz += (target.rz - cur.rz) * BG_LERP;
    cur.tx += (target.tx - cur.tx) * BG_LERP;
    cur.ty += (target.ty - cur.ty) * BG_LERP;
    cur.s += (target.s - cur.s) * BG_LERP;

    if (bgEl) {
        bgEl.style.transform =
            `scale(${cur.s}) ` +
            `rotateX(${cur.rx + cRX}deg) ` +
            `rotateY(${cur.ry + cRY}deg) ` +
            `rotateZ(${cur.rz}deg) ` +
            `translateX(${cur.tx}%) ` +
            `translateY(${cur.ty}%)`;
    }
    if (progressBar) progressBar.style.width = (progress * 100) + '%';
    requestAnimationFrame(renderBG);
}
requestAnimationFrame(renderBG);

// Procedural depth field: floating nodes that rise through the scene as scroll progresses.
document.addEventListener('DOMContentLoaded', () => {
    if (isMobile) return; // Skip depth field on mobile for performance
    const field = document.getElementById('bg-depth-field');
    if (!field) return;

    const count = Math.max(18, Math.min(36, Math.floor(window.innerWidth / 48)));
    const nodes = [];

    for (let i = 0; i < count; i++) {
        const node = document.createElement('div');
        node.className = 'depth-node';

        const size = 14 + Math.random() * 36;
        node.style.width = `${size}px`;
        node.style.height = `${size}px`;
        node.style.left = `${Math.random() * 100}%`;
        node.dataset.seed = String(Math.random() * 10);
        node.dataset.speed = String(0.4 + Math.random() * 0.9);
        node.dataset.depth = String(-140 + Math.random() * 380);
        node.dataset.sway = String(8 + Math.random() * 22);
        node.dataset.phase = String(Math.random() * Math.PI * 2);

        field.appendChild(node);
        nodes.push(node);
    }

    function animateDepthField(ts) {
        const t = ts * 0.001;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;

        nodes.forEach((node, idx) => {
            const speed = parseFloat(node.dataset.speed || '1');
            const depth = parseFloat(node.dataset.depth || '0');
            const sway = parseFloat(node.dataset.sway || '12');
            const phase = parseFloat(node.dataset.phase || '0');

            const lane = (progress * 220 + t * 14 * speed + idx * 6.7) % 180;
            const y = 115 - lane;
            const xWave = Math.sin((t * 1.15 * speed) + phase) * sway;
            const scale = 0.82 + (progress * 0.38) + ((depth + 140) / 1200);
            const alpha = Math.max(0.05, 0.42 - Math.abs(y - 24) / 135);

            node.style.opacity = alpha.toFixed(3);
            node.style.transform = `translate3d(calc(${node.style.left} + ${xWave.toFixed(2)}px), ${y.toFixed(2)}vh, ${depth.toFixed(1)}px) scale(${scale.toFixed(3)})`;
        });

        requestAnimationFrame(animateDepthField);
    }

    requestAnimationFrame(animateDepthField);
});

document.addEventListener('DOMContentLoaded', () => {
    if (isMobile) return; // No cursor glow on touch devices
    const gl = document.getElementById('cursor-glow');
    if (!gl) return;
    let mx = window.innerWidth / 2, my = window.innerHeight / 2, gx = mx, gy = my;
    let isMayhem = false;

    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

    // Listen for heat - ANY interactive element triggers mayhem
    document.addEventListener('mouseover', e => {
        if (e.target.closest('a, button, .cta-button, [role="button"], #holo-container')) {
            isMayhem = true;
            gl.classList.add('atom-heat');
        } else {
            isMayhem = false;
            gl.classList.remove('atom-heat');
        }
    });

    (function loop() {
        // Normal position
        gx = mx; gy = my;

        // Add "Atom in Heat" Jitter (Tighter Range)
        let jx = isMayhem ? (Math.random() - 0.5) * 1.5 : 0;
        let jy = isMayhem ? (Math.random() - 0.5) * 1.5 : 0;

        gl.style.transform = `translate(${gx + jx}px,${gy + jy}px) scale(${isMayhem ? 1.8 : 1})`;
        requestAnimationFrame(loop);
    })();
});

document.addEventListener('DOMContentLoaded', () => {
    if (!isInProjects) return;
    const navContainer = document.querySelector('.glass-nav .nav-container');
    const fallbackBackLink = document.querySelector('.back-link');
    if (!navContainer || !fallbackBackLink) return;
    if (navContainer.querySelector('.project-nav-return')) return;

    const topReturn = document.createElement('a');
    topReturn.className = 'project-nav-return';
    topReturn.href = fallbackBackLink.getAttribute('href') || '../index.html#projects';
    topReturn.textContent = 'Back to Projects';
    navContainer.appendChild(topReturn);
});

document.addEventListener('DOMContentLoaded', () => {
    // Lowered threshold to 0.01 and added safety timeout to prevent "blank page" bugs on zoom
    // One-way, permanently: reveal once, then stop watching. An element that
    // has been read must never be taken away again by scrolling back to it.
    const obs = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('active');
        obs.unobserve(e.target);
    }), { threshold: 0.01 });

    document.querySelectorAll('.reveal').forEach(el => {
        obs.observe(el);
        // Safety net: force reveal after 1.5s if it somehow missed the intersection
        setTimeout(() => el.classList.add('active'), 1500);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const hero = document.getElementById('hero'); if (!hero) return;
    const style = document.createElement('style');
    style.textContent = `@keyframes pDrift{0%{transform:translateY(0) translateX(0) scale(1);opacity:.35;}50%{transform:translateY(-40px) translateX(20px) scale(1.4);opacity:.65;}100%{transform:translateY(18px) translateX(-28px) scale(.8);opacity:.2;}}`;
    document.head.appendChild(style);
    for (let i = 0; i < (isMobile ? 10 : 35); i++) {
        const p = document.createElement('div');
        p.style.cssText = `position:absolute;border-radius:50%;width:${Math.random() * 3 + 1}px;height:${Math.random() * 3 + 1}px;background:${Math.random() > .5 ? 'rgba(255,30,86,.4)' : 'rgba(0,229,255,.3)'};left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation:pDrift ${Math.random() * 12 + 8}s ease-in-out ${Math.random() * 6}s infinite alternate;pointer-events:none;z-index:0;`;
        hero.appendChild(p);
    }
});

// ============================================================
//  SCROLL-JACKED PROJECTS
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const projectsSection = document.getElementById('projects');
    const rawSlides = Array.from(document.querySelectorAll('.proj-slide'));
    const currentEl = document.getElementById('proj-current');
    const totalEl = document.getElementById('proj-total');
    if (!projectsSection || !rawSlides.length) return;

    const slides = rawSlides;
    if (totalEl) totalEl.textContent = slides.length;

    // On mobile, skip scroll-jacking entirely — cards are stacked by CSS
    if (isMobile) {
        projectsSection.style.minHeight = 'auto';

        slides.forEach(slide => {
            slide.classList.add('proj-active');
            slide.style.pointerEvents = 'auto';
        });
        return;
    }

    // Give the sticky project stage enough runway so the first and last cards
    // do not get "half buckets" at the ends of the scroll span.
    projectsSection.style.minHeight = `calc(${slides.length + 1} * 100vh + 200px)`;

    const exitMap = {
        'left': 'proj-exit-left',
        'right': 'proj-exit-right',
        'below': 'proj-exit-below',
        'rotate-left': 'proj-exit-rotate',
        'top-perspective': 'proj-exit-top',
    };

    let currentIdx = -1;
    let hasEnteredProjects = false;

    function showSlide(idx, force = false) {
        if (idx === currentIdx && !force) return;
        const prevIdx = currentIdx;
        currentIdx = idx;

        slides.forEach((slide, i) => {
            if (i === idx) {
                slide.classList.remove(...Object.values(exitMap));
                slide.classList.add('proj-active');
                slide.style.pointerEvents = 'auto';
            } else if (i === prevIdx && prevIdx >= 0) {
                const exitClass = exitMap[slide.getAttribute('data-enter')] || 'proj-exit-left';
                slide.classList.remove('proj-active');
                slide.classList.add(exitClass);
                slide.style.pointerEvents = 'none';
            } else {
                slide.classList.remove('proj-active', ...Object.values(exitMap));
                slide.style.pointerEvents = 'none';
            }
        });

        if (currentEl) currentEl.textContent = idx + 1;

        // Hide discovery indicator after the first slide
        const discovery = document.querySelector('.scroll-discovery');
        if (discovery) {
            if (idx > 0) discovery.classList.add('hidden');
            else discovery.classList.remove('hidden');
        }

        // If we are in the zone, let Holo speak
        if (hasEnteredProjects && idx >= 0 && idx < slides.length) {
            const cp = slides[idx].getAttribute('data-checkpoint');

            // DYNAMIC BACKGROUND SHIFT
            const scene = document.getElementById('scene-3d');
            if (scene) {
                // Shift background colors based on project
                const colors = {
                    'agora': 'rgba(139, 124, 248, 0.20)', // Agora violet — the title-card glow
                    'replay': 'rgba(232, 177, 102, 0.15)', // Replay amber — the choice colour
                    'anan': 'rgba(255, 217, 125, 0.16)', // AnAn amber — the receipt colour
                    'mera': 'rgba(255, 30, 86, 0.25)', // Deep Crimson
                    'wingman': 'rgba(0, 229, 255, 0.18)', // Cyan
                    'notes': 'rgba(255, 215, 0, 0.15)', // Gold
                    'matrix': 'rgba(255, 30, 86, 0.2)',
                    'shoppo': 'rgba(38, 165, 228, 0.2)',
                    'kampung': 'rgba(232, 197, 71, 0.18)',
                };
                const c = colors[cp] || 'rgba(255, 30, 86, 0.12)';
                scene.style.setProperty('--scene-accent', c);
            }

            if (cp && HOLO_LINES[cp]) {
                triggerHoloCheckpoint(cp, 'down', true); // force=true bypasses cooldowns
            }
        }
    }

    function onScroll() {
        const rect = projectsSection.getBoundingClientRect();
        const total = projectsSection.offsetHeight - window.innerHeight;
        const scrolled = -rect.top;

        // We enter the zone when the top of the section is 60% up the screen
        const inZone = scrolled > -window.innerHeight * 0.6 && scrolled < total + window.innerHeight;

        // Trigger the voice line immediately upon crossing the threshold
        if (inZone && !hasEnteredProjects) {
            hasEnteredProjects = true;
            showSlide(currentIdx === -1 ? 0 : currentIdx, true);
        } else if (!inZone && hasEnteredProjects) {
            hasEnteredProjects = false;
        }

        if (scrolled < -window.innerHeight || scrolled > total + window.innerHeight) return;

        const progress = Math.max(0, Math.min(0.999999, scrolled / (total || 1)));
        const bucketProgress = progress * slides.length;
        const slideFactor = Math.max(0, Math.min(slides.length - 1, bucketProgress - 0.5));
        const activeIdx = Math.max(0, Math.min(slides.length - 1, Math.floor(bucketProgress)));

        slides.forEach((slide, i) => {
            const dist = slideFactor - i; // distance from center of this slide
            // Map distance: 0 (perfectly centered, icons far) to +/-1 (exiting/entering, icons converged)
            const converge = Math.max(-1, Math.min(1, dist)); // Dampened from dist * 2
            const opp = Math.max(0, 1 - Math.abs(dist) * 0.8); // Much slower fade than 1.5
            slide.style.setProperty('--converge', converge);
            slide.style.setProperty('--opp', opp);

            // Toggle active state for visibility/pointer events
            if (i === activeIdx) {
                if (!slide.classList.contains('proj-active')) showSlide(i, true);
            }
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // ── Deep-Link Handler ──────────────────────────────────
    // If we land on a specific project card hash (e.g. index.html#proj-2)
    function checkHash() {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#proj-')) {
            const targetId = hash.slice(1);
            const idx = slides.findIndex(slide => slide.id === targetId);
            if (idx !== -1 && slides[idx]) {
                const total = projectsSection.offsetHeight - window.innerHeight;
                // Move slightly past the bucket start to ensure the correct index is selected
                const targetProgress = (idx + 0.5) / slides.length;
                const sectionTop = projectsSection.getBoundingClientRect().top + window.scrollY;
                const targetY = sectionTop + (total * targetProgress);

                // On load, jump instantly. After interaction, can be smooth.
                window.scrollTo({ top: targetY, behavior: 'instant' });
                showSlide(idx, true); // Force update slide visibility
            }
        }
    }
    // ── 3D TILT HANDLER removed — cards stay flat, no mouse-driven wobble ──

    // Check on load
    setTimeout(checkHash, 110);
});

// ============================================================
//  HOLO VOICELINES
// ============================================================
const HOLO_LINES = {
    hero: {
        down: ["From silicon to sentience. Let's see if the title holds, traveler."],
        up: ["Back to the beginning. The entrance never changes."]
    },
    about: {
        down: ["Hardware at dawn, LLM orchestration by noon. Not many can say that."],
        up: ["Revisiting the foundation. A wise habit."]
    },
    projects: {
        down: ["Builds from the edge to the cloud. What are you looking for?"],
        up: ["The gallery. Every build tells a story."]
    },
    mera: {
        down: ["Synapxe AI Challenge. 478-pt facial mesh, rPPG heart rate, skeletal FSM. Edge-computed health intelligence at its peak."],
        up: ["Mera. Clinical-grade markers on a Telegram bot. Innovative, isn't it?"]
    },
    wingman: {
        down: ["Six AI personalities, fully offline. It never phones home — ever."],
        up: ["The desktop companion. Local-first by design."]
    },
    notes: {
        down: ["One command converts a semester of PDFs into a searchable knowledge base. No server. No nonsense."],
        up: ["Simple tools, serious leverage."]
    },
    hacx: {
        down: ["A Raspberry Pi Zero told a two-ton AV to stop. At 15 metres. Under $342."],
        up: ["The AV disruptor. Hardware that fills a real public safety gap."]
    },
    matrix: {
        down: ["OLS, Ridge, KNN, Bayes — all from the CLI. Mathematics, made interactive."],
        up: ["The matrix solver. Computational power in a prompt."]
    },
    transcriber: {
        down: ["Whisper AI on a GPU. Local transcription that actually respects your privacy, traveler."],
        up: ["Audio to text. Fast and precise."]
    },
    iupscaler: {
        down: ["Real-ESRGAN or EDSR? Hallucinating details or preserving them — the choice is yours."],
        up: ["Still images, redefined."]
    },
    cc: {
        down: ["Subtitles or Audio? My intelligent fallback ensures you never walk away empty-handed."],
        up: ["Extracting the essence of media."]
    },
    fscanner: {
        down: ["3,100 files per second. Standard tools are just... slow in comparison."],
        up: ["Performance first. Always."]
    },
    shoppo: {
        down: ["Shoppo. Telegram in front, TinyFish underneath, and a shortlist that actually helps you decide."],
        up: ["Cross-marketplace shopping without the tab jungle. Much cleaner."]
    },
    agora: {
        down: ["Agora. A dozen agents in one room \u2014 the trick was never writing the code, it was landing it."],
        up: ["One host, one room, total context. The orchestrator settles the conflicts before a human has to."]
    },
    replay: {
        down: ["Replay. Everyone at the table is handed a different piece of the truth, on purpose."],
        up: ["No score, no correct answer. The credits are where the real conversation starts."]
    },
    anan: {
        down: ["AnAn. She treats silence as an input, and writes a receipt before she is allowed to act."],
        up: ["Seven phases, one tick. Nothing here is narration \u2014 every phase left a row behind."]
    },
    kampung: {
        down: ["Kampung Kaki. One live map, three roles, and a shared truth layer when every minute matters."],
        up: ["Citizens, responders, and ops looking at the same incident from three useful angles."]
    },
    experience: {
        down: ["KABAM Robotics by day, software engineering tutorials by term. Building and teaching, both visible."],
        up: ["Experience. Autonomous robots and production-grade software, not just prototypes."]
    },
    hackathons: {
        down: ["Seven hackathons across two years. CODE_EXP ended with an Open Finalist certificate."],
        up: ["Back through the build sprints. Short clocks, real systems, documented outcomes."]
    },
    skills: {
        down: ["Verilog to TypeScript. FPGA to Docker. The stack depth is... uncommon."],
        up: ["Every tool here was earned, not borrowed."]
    },
    contact: {
        down: ["You've seen the work. If you're building something hard — this is the one to call."],
        up: ["The end, revisited. Perhaps something above caught your eye?"]
    }
};

const cpState = {};
let lastScrollY = window.scrollY;
let holoCooldown = false;

function speakHolo(text) {
    const holo = document.getElementById('holo-container');
    const htxt = document.getElementById('holo-text');
    const dlg = holo?.querySelector('.holo-dialog-box');
    if (!holo || !htxt || !dlg) return;
    if (htxt.textContent === 'Ready?') return;

    htxt.textContent = text;
    holo.classList.add('talking');
    clearTimeout(holo._vlt);
    holo._vlt = setTimeout(() => holo.classList.remove('talking'), 4500);
}

function triggerHoloCheckpoint(id, dir, force = false) {
    if (!window.holoCanNavigate) return;
    if ((holoCooldown && !force) || !HOLO_LINES[id]) return;
    if (!cpState[id]) cpState[id] = { di: 0, ui: 0 };
    const state = cpState[id];
    const lines = HOLO_LINES[id][dir];
    const idx = dir === 'down' ? state.di++ % lines.length : state.ui++ % lines.length;
    speakHolo(lines[idx]);

    if (!force) {
        holoCooldown = true;
        setTimeout(() => { holoCooldown = false; }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const cps = document.querySelectorAll('.checkpoint:not(.proj-slide)');
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            const id = e.target.getAttribute('data-checkpoint');
            if (!id || !HOLO_LINES[id]) return;
            if (!cpState[id]) cpState[id] = { di: 0, ui: 0 };
            const wasVis = cpState[id].lastVis;
            if (e.isIntersecting === wasVis) return;
            cpState[id].lastVis = e.isIntersecting;
            if (e.isIntersecting) {
                const dir = window.scrollY >= lastScrollY ? 'down' : 'up';
                triggerHoloCheckpoint(id, dir);
            }
        });
    }, { threshold: 0.3 });
    cps.forEach(el => obs.observe(el));
    window.addEventListener('scroll', () => {
        // Special case for hero checkpoint scroll-back
        if (window.scrollY < 50 && window.scrollY < lastScrollY) {
            triggerHoloCheckpoint('hero', 'up');
        }
        lastScrollY = window.scrollY;
    }, { passive: true });
});

let reachedBottom = false;
window.addEventListener('scroll', () => {
    if (reachedBottom) return;
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 60) {
        reachedBottom = true;
        setTimeout(() => speakHolo("You've seen everything, traveler. Tell me — was it worth the journey?"), 400);
    }
}, { passive: true });

// ============================================================
//  HOLO ADVANCED INTERACTIONS
// ============================================================
let holoTaps = 0;
let holoTimer;

window.holoInteract = (el) => {
    holoTaps++;
    const txt = el.querySelector('#holo-text');
    if (!txt) return;

    el.classList.add('shaking');
    setTimeout(() => el.classList.remove('shaking'), 420);
    el.classList.add('talking');
    clearTimeout(holoTimer);

    // ── ENTRY TRIGGER ──
    if (txt.textContent.trim() === 'Ready?') {
        el.classList.remove('holo-splash-center');
        el.style.width = '70px';
        document.body.classList.remove('preload');
        window.holoCanNavigate = true;
        sessionStorage.setItem('visited', 'true');
        txt.textContent = 'Greetings, traveler. Explore freely.';

        // Force reveal elements that might be stuck behind the transition
        setTimeout(() => {
            document.querySelectorAll('.reveal').forEach(el => el.classList.add('active'));
        }, 100);

        if (typeof playSound === 'function') playSound('pop', 0.8);
        holoTaps = 0;
        holoTimer = setTimeout(() => el.classList.remove('talking'), 3500);
        return;
    }

    // ── Normal Interactions ──
    const inProj = window.location.pathname.toLowerCase().includes('/projects/');

    if (!inProj) {
        // Main page states 
        if (holoTaps === 1) {
            txt.textContent = "Greetings, traveler.";
        } else if (holoTaps === 2) {
            txt.textContent = "Do you have any apples?";
        } else if (holoTaps === 3) {
            txt.textContent = "Stop poking me!";
        } else if (holoTaps === 4) {
            txt.textContent = "I mean it!";
        } else {
            txt.textContent = "...mph! Dizzy...";
            el.classList.add('vanished');
            if (typeof playSound === 'function') playSound('pop', 0.5);
            setTimeout(() => {
                el.classList.remove('vanished');
                holoTaps = 0;
                speakHolo("I'm back.");
            }, 10000);
        }
    } else {
        // Subpage states - using reference logic
        if (holoTaps === 1) {
            txt.textContent = "You should be reading!";
        } else if (holoTaps === 2) {
            txt.textContent = "Focus on the project!";
        } else if (holoTaps === 3) {
            txt.textContent = "Don't make me angry!";
        } else if (holoTaps >= 4) {
            txt.textContent = "BEGONE!";

            // Start Attack Sequence
            el.classList.remove('talking');
            el.style.opacity = '0'; // Hide original holo sprite

            let attackImg = document.querySelector(".holo-attack-gif");
            if (!attackImg) {
                attackImg = document.createElement("img");
                attackImg.src = basePath + "images/holo-attack.gif?t=" + Date.now();
                attackImg.classList.add("holo-attack-gif");
                document.body.appendChild(attackImg);
            } else {
                attackImg.src = basePath + "images/holo-attack.gif?t=" + Date.now();
            }

            let glassOverlay = document.querySelector("#glass-shatter-overlay");
            if (!glassOverlay) {
                glassOverlay = document.createElement("div");
                glassOverlay.id = "glass-shatter-overlay";
                document.body.appendChild(glassOverlay);
            }

            attackImg.classList.remove("holo-attack-active");
            void attackImg.offsetWidth; // Reflow
            attackImg.classList.add("holo-attack-active");

            setTimeout(() => {
                if (typeof playSound === 'function') playSound('shatter', 0.8);
                document.body.classList.add('glass-cracked');
                glassOverlay.classList.add("active");
                attackImg.style.opacity = "0"; // hide after shatter
            }, 600);

            setTimeout(() => {
                const curtain = document.querySelector('.page-transition-overlay');
                if (curtain) curtain.classList.add('active');
                setTimeout(() => {
                    window.location.href = basePath + 'index.html';
                }, 2500); // 2.5s hold for seeing that beautiful blue branding
            }, 1600);

            return; // Prevent clearing timer at the bottom
        }
    }

    if (holoTaps < (inProj ? 4 : 5)) {
        holoTimer = setTimeout(() => el.classList.remove('talking'), 3000);
    }
};

// ── Typing & Triggers ──
document.addEventListener('DOMContentLoaded', () => {
    const hTxt = document.querySelector('#holo-text');
    if (hTxt) {
        let tTO, typingTarget = "", typingProgress = "";
        const typeIt = (el, text, speed = 12) => {
            clearTimeout(tTO);
            if (text === 'Ready?') { el.textContent = 'Ready?'; typingTarget = 'Ready?'; typingProgress = 'Ready?'; return; }
            typingTarget = text;
            typingProgress = "";
            el.textContent = '';
            let i = 0;
            (function t() {
                if (i < text.length && typingTarget === text) {
                    typingProgress += text.charAt(i++);
                    el.textContent = typingProgress;
                    tTO = setTimeout(t, speed);
                }
            })();
        };
        new MutationObserver(() => {
            const tx = hTxt.textContent || "";
            if (tx === typingProgress || tx === typingTarget) return; // Ignore our own typing steps
            if (tx.trim()) {
                typeIt(hTxt, tx, 12);
            }
        }).observe(hTxt, { characterData: true, childList: true, subtree: true });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('nav a[href^="#"]').forEach(a => {
        a.addEventListener('click', function (e) {
            e.preventDefault();
            const t = document.querySelector(this.getAttribute('href'));
            if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
});
