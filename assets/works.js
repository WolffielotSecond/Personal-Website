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
    '3': { name: 'THE RETRIVAL', action: 'PLAY ONLINE', video: 'assets/videos/black-screen.mp4' },
    '4': { name: 'THE HOUSE OF JANUS', action: 'PLAY ONLINE', video: 'assets/videos/black-screen.mp4' },
};
const visibleCoverCount = 4;
let workOffset = 0;
const previewReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let currentWork = '1';
let requestedWork = currentWork;
let previewSwitching = false;

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
});

function createPreviewLayer(work, className) {
    const layer = document.createElement('div');
    layer.className = `preview-layer ${className}`;
    layer.dataset.work = work;
    layer.style.setProperty('--preview-color', '#000');
    layer.setAttribute('aria-hidden', 'true');
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
        layer.append(video);
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
    const visible = worksPage.closest('dialog').open && !worksPage.hidden && !document.hidden;
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
        switchWorkPreview(card.dataset.work);
    });
});

moveWorkCovers(0);
