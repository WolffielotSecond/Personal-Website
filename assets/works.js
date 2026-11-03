const worksPage = document.querySelector('.works-page');
const worksTrack = worksPage.querySelector('.works-track');
const workCards = [...worksTrack.querySelectorAll('.work-card')];
const previousCovers = worksPage.querySelector('.works-nav-up');
const nextCovers = worksPage.querySelector('.works-nav-down');
const workPreview = worksPage.querySelector('.work-preview');
const playOnline = worksPage.querySelector('.play-online');
const workDetails = {
    '1': {
        name: 'THE AWAKENING',
        action: 'STEAM PAGE',
        url: 'https://store.steampowered.com/app/4811530/The_Awakening/',
        video: 'assets/videos/black-screen.mp4',
    },
    '2': {
        name: 'THE AWAKENING LEGACY',
        action: 'DOWNLOAD GAME',
        url: 'https://github.com/WolffielotSecond/The-Awakening/releases/tag/demo_v0.6.2',
        video: 'assets/videos/steam-trailer-web.mp4',
        poster: 'assets/covers/the-awakening-legacy.jpg',
    },
    '3': {
        name: 'THE RETRIVAL',
        action: 'PLAY ONLINE',
        video: 'assets/videos/the-retrieval.mp4',
        background: 'assets/covers/TR_Header.png',
    },
    '4': {
        name: 'THE HOUSE OF JANUS',
        action: 'PLAY ONLINE',
        video: 'assets/videos/the-house-of-janus.mp4',
        background: 'assets/covers/THOJ_Header.png',
    },
};
const visibleCoverCount = 4;
let workOffset = 0;
const previewReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let currentWork = '1';
let requestedWork = currentWork;
let previewSwitching = false;
const worksDialog = worksPage.closest('dialog');
// Every image shares this persistent track, so crossfades never restart the scroll.
const backgroundImages = worksPage.querySelector('.works-background-track');
const entranceParts = [worksPage.querySelector('.works-sidebar'), worksPage.querySelector('.works-stage')];
let backgroundVersion = 0;
let entranceTimers = [];
let worksWasVisible = false;

function setWorkBackground(work, animate = true) {
    const card = worksPage.querySelector(`.work-card[data-work="${work}"]`);
    const source = workDetails[work].background ?? card.querySelector('img').getAttribute('src');
    const layer = document.createElement('div');
    layer.className = 'works-background-image';
    layer.dataset.work = work;
    layer.style.setProperty('--work-background', `url("${source}")`);
    for (let i = 0; i < 2; i++) {
        const tile = document.createElement('div');
        tile.className = 'works-background-tile';
        layer.append(tile);
    }
    const version = ++backgroundVersion;
    if (!animate || previewReducedMotion.matches || !backgroundImages.children.length) {
        backgroundImages.replaceChildren(layer);
    } else {
        layer.classList.add('is-incoming');
        backgroundImages.append(layer);
        window.setTimeout(() => {
            if (version !== backgroundVersion) return;
            layer.classList.remove('is-incoming');
            backgroundImages.replaceChildren(layer);
        }, 400);
    }
}

function beginWorksEntrance() {
    entranceTimers.forEach(timer => window.clearTimeout(timer));
    entranceTimers = [];
    setWorkBackground(requestedWork, false);
    worksPage.classList.add('is-resetting');
    worksPage.classList.remove('is-background-in', 'is-background-dim', 'is-content-visible');
    entranceParts.forEach(part => { part.inert = true; });
    worksPage.getBoundingClientRect();
    worksPage.classList.remove('is-resetting');
    if (previewReducedMotion.matches) {
        worksPage.classList.add('is-background-in', 'is-background-dim', 'is-content-visible');
        entranceParts.forEach(part => { part.inert = false; });
        updatePreviewGrid();
        return;
    }
    // Follow the white page by 150 ms, using the same 800 ms slide curve.
    entranceTimers.push(window.setTimeout(() => {
        worksPage.classList.add('is-background-in', 'is-background-dim');
    }, 150));
    // Let the UI become visible on screen before playing its separate slide and fade.
    entranceTimers.push(window.setTimeout(() => {
        worksPage.classList.add('is-content-visible');
        entranceParts.forEach(part => { part.inert = false; });
    }, 500));
    entranceTimers.push(window.setTimeout(updatePreviewGrid, 950));
    entranceTimers.push(window.setTimeout(updatePreviewGrid, 1150));
}

function syncWorksEntrance() {
    const visible = worksDialog.open && !worksPage.hidden;
    if (visible && !worksWasVisible) beginWorksEntrance();
    if (!visible) {
        entranceTimers.forEach(timer => window.clearTimeout(timer));
        entranceTimers = [];
        // Keep the finished layout intact throughout the dialog's slide back out.
    }
    worksWasVisible = visible;
}

const entranceObserver = new MutationObserver(syncWorksEntrance);
entranceObserver.observe(worksDialog, { attributes: true, attributeFilter: ['open'] });
entranceObserver.observe(worksPage, { attributes: true, attributeFilter: ['hidden'] });
syncWorksEntrance();

function updateWorkAction(work) {
    const details = workDetails[work];
    playOnline.textContent = details.action;
    playOnline.dataset.selectedWork = work;
    playOnline.setAttribute('aria-label', `${details.action} — ${details.name}`);
}

playOnline.addEventListener('click', () => {
    if (previewSwitching) return;
    const url = workDetails[currentWork].url;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else startWorkPlay(currentWork);
});

function createPreviewLayer(work, className) {
    const layer = document.createElement('div');
    layer.className = `preview-layer ${className}`;
    layer.dataset.work = work;
    layer.style.setProperty('--preview-color', '#000');
    layer.setAttribute('aria-hidden', 'true');
    // Soften the polygon first, then cut the result with the outer layer's sharp checker mask.
    const softPolygon = document.createElement('div');
    softPolygon.className = 'preview-polygon-soft';
    const polygon = document.createElement('div');
    polygon.className = 'preview-polygon';
    softPolygon.append(polygon);
    layer.append(softPolygon);
    const details = workDetails[work];
    if (details.video) {
        const video = document.createElement('video');
        video.className = 'preview-video';
        video.muted = true;
        // Playback starts automatically through visibility handling, never in a hidden page.
        video.autoplay = false;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'auto';
        if (details.poster) video.poster = details.poster;
        video.src = details.video;
        polygon.append(video);
    }
    return layer;
}

function updatePreviewGrid() {
    const rect = workPreview.getBoundingClientRect();
    if (!rect.width) return;
    // Subtract the dialog's slide transform to keep the grid aligned to the screen.
    const dialogRect = worksPage.closest('dialog').getBoundingClientRect();
    workPreview.style.setProperty('--tile-size', `${Math.round(rect.width / 3.5)}px`);
    workPreview.style.setProperty('--grid-x', `${-(rect.left - dialogRect.left)}px`);
    workPreview.style.setProperty('--grid-y', `${-(rect.top - dialogRect.top)}px`);
}

function finishPreviewSwitch(incoming, work) {
    workPreview.querySelectorAll('video').forEach(video => {
        if (!incoming.contains(video)) video.pause();
    });
    incoming.className = 'preview-layer preview-current';
    workPreview.replaceChildren(incoming);
    workPreview.classList.remove('is-switching');
    workPreview.setAttribute('aria-label', `${workDetails[work].name} video`);
    workPreview.setAttribute('aria-busy', 'false');
    currentWork = work;
    previewSwitching = false;
    syncWorkVideoPlayback();
    if (requestedWork !== currentWork) {
        switchWorkPreview(requestedWork);
    } else {
        updateWorkAction(work);
        playOnline.classList.remove('is-hidden');
        playOnline.setAttribute('aria-hidden', 'false');
        playOnline.disabled = false;
    }
}

function switchWorkPreview(work) {
    requestedWork = work;
    if (previewSwitching || work === currentWork) return;
    const alreadyHidden = playOnline.classList.contains('is-hidden');
    playOnline.classList.add('is-hidden');
    playOnline.setAttribute('aria-hidden', 'true');
    playOnline.disabled = true;
    const incoming = createPreviewLayer(work, 'preview-incoming');
    if (previewReducedMotion.matches) {
        finishPreviewSwitch(incoming, work);
        return;
    }
    previewSwitching = true;
    workPreview.setAttribute('aria-busy', 'true');
    const startCheckerTransition = () => {
        updatePreviewGrid();
        workPreview.append(incoming);
        syncWorkVideoPlayback();
        workPreview.classList.add('is-switching');
        window.setTimeout(() => finishPreviewSwitch(incoming, work), 600);
    };
    // Fade the action out before the mosaic starts; keep it hidden across queued selections.
    if (alreadyHidden) startCheckerTransition();
    else window.setTimeout(startCheckerTransition, 200);
}

workPreview.append(createPreviewLayer(currentWork, 'preview-current'));
updateWorkAction(currentWork);
new ResizeObserver(updatePreviewGrid).observe(workPreview);
window.addEventListener('resize', updatePreviewGrid);

function syncWorkVideoPlayback() {
    const visible = worksDialog.open && !worksPage.hidden && !document.hidden && !worksPage.querySelector('.play-view.is-ready');
    workPreview.querySelectorAll('video').forEach(video => {
        if (visible) video.play().catch(() => {});
        else video.pause();
    });
}

const workVisibilityObserver = new MutationObserver(syncWorkVideoPlayback);
workVisibilityObserver.observe(worksPage.closest('dialog'), { attributes: true, attributeFilter: ['open'] });
workVisibilityObserver.observe(worksPage, { attributes: true, attributeFilter: ['hidden'] });
document.addEventListener('visibilitychange', syncWorkVideoPlayback);

function moveWorkCovers(offset) {
    workOffset = Math.max(0, Math.min(workCards.length - visibleCoverCount, offset));
    worksTrack.style.setProperty('--work-offset', workOffset);
    previousCovers.disabled = workOffset === 0;
    nextCovers.disabled = workOffset === workCards.length - visibleCoverCount;
    workCards.forEach((card, index) => {
        card.inert = index < workOffset || index >= workOffset + visibleCoverCount;
    });
}

previousCovers.addEventListener('click', () => moveWorkCovers(workOffset - 1));
nextCovers.addEventListener('click', () => moveWorkCovers(workOffset + 1));

worksPage.querySelector('.works-sidebar').addEventListener('keydown', event => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    moveWorkCovers(workOffset + (event.key === 'ArrowDown' ? 1 : -1));
});

worksPage.querySelectorAll('.work-card[data-work]').forEach(card => {
    card.addEventListener('click', () => {
        worksPage.querySelectorAll('.work-card[data-work]').forEach(other => {
            other.setAttribute('aria-pressed', String(other === card));
        });
        worksTrack.style.setProperty('--selected-index', workCards.indexOf(card));
        if (requestedWork !== card.dataset.work) setWorkBackground(card.dataset.work);
        switchWorkPreview(card.dataset.work);
    });
});

moveWorkCovers(0);
