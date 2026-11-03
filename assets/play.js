const playView = worksPage.querySelector('.play-view');
const controlsGuide = worksPage.querySelector('.play-guide');
const guideOpen = worksPage.querySelector('.play-guide-open');
const guideReturn = worksPage.querySelector('.play-guide-return');
const previewFrame = worksPage.querySelector('.preview-feather');
const previewStage = worksPage.querySelector('.works-stage');
const previewBlur = worksPage.querySelector('#preview-alpha-feather feGaussianBlur');
const unityMount = document.createElement('div');
unityMount.className = 'unity-mount';
unityMount.setAttribute('role', 'region');
unityMount.setAttribute('aria-label', 'Unity Web player placeholder');

let playFrame = null;
let playFinishTimer;
let driftAnimation;

function placePlayFrame() {
    const width = worksPage.clientWidth;
    const height = worksPage.clientHeight;
    const sideSpace = Math.max(76, Math.min(115, width * 0.08));
    const bottomSpace = Math.min(76, height * 0.24);
    const playerWidth = Math.max(1, Math.min(width - sideSpace * 2, (height - bottomSpace - 20) * 16 / 9));
    const playerHeight = playerWidth * 9 / 16;
    previewFrame.style.left = `${(width - playerWidth) / 2}px`;
    previewFrame.style.top = `${(height - bottomSpace - playerHeight) / 2}px`;
    previewFrame.style.width = `${playerWidth}px`;
    previewFrame.style.height = `${playerHeight}px`;
}

function startWorkPlay(work) {
    if (worksPage.classList.contains('is-playing')) return;
    const pageRect = worksPage.getBoundingClientRect();
    const frameRect = previewFrame.getBoundingClientRect();
    const duration = previewReducedMotion.matches ? 0 : 1000;
    worksPage.classList.add('is-playing');
    entranceParts[0].inert = true;
    playOnline.disabled = true;
    playOnline.classList.add('is-hidden');
    playView.hidden = false;
    playView.inert = false;
    previewFrame.style.left = `${frameRect.left - pageRect.left}px`;
    previewFrame.style.top = `${frameRect.top - pageRect.top}px`;
    previewFrame.style.width = `${frameRect.width}px`;
    previewFrame.style.height = `${frameRect.height}px`;
    playView.prepend(previewFrame);
    previewFrame.getBoundingClientRect();
    playView.classList.add('is-expanding');
    placePlayFrame();

    driftAnimation = backgroundImages.getAnimations()[0];
    const start = performance.now();
    function softenAndStop(now) {
        const progress = Math.min(1, (now - start) / duration);
        const remaining = (1 - progress) ** 2;
        previewBlur.setAttribute('stdDeviation', String(10 * remaining));
        if (driftAnimation) driftAnimation.updatePlaybackRate(remaining);
        if (progress < 1) playFrame = window.requestAnimationFrame(softenAndStop);
    }
    if (duration) playFrame = window.requestAnimationFrame(softenAndStop);

    playFinishTimer = window.setTimeout(() => {
        window.cancelAnimationFrame(playFrame);
        driftAnimation?.updatePlaybackRate(0);
        playView.classList.add('is-ready');
        unityMount.dataset.work = work;
        controlsGuide.querySelectorAll('[data-guide-work]').forEach(guide => {
            guide.hidden = guide.dataset.guideWork !== work;
        });
        const gameInfo = {
            '3': { folder: 'the-retrieval', title: 'The Retrieval' },
            '4': { folder: 'the-house-of-janus', title: 'The House of Janus' },
        }[work];
        if (gameInfo) {
            const game = document.createElement('iframe');
            game.src = `assets/games/${gameInfo.folder}/index.html`;
            game.title = siteLocale?.player ?? gameInfo.title;
            unityMount.append(game);
            unityMount.setAttribute('aria-label', `${gameInfo.title} player`);
        } else {
            unityMount.setAttribute('aria-label', 'Unity Web player placeholder');
        }
        previewFrame.append(unityMount);
        guideOpen.hidden = false;
        controlsGuide.hidden = false;
        syncWorkVideoPlayback();
        guideOpen.focus({ preventScroll: true });
    }, duration);
}

function setGuideOpen(open) {
    worksPage.classList.toggle('is-guide-open', open);
    guideOpen.setAttribute('aria-expanded', String(open));
    playView.inert = open;
    controlsGuide.inert = !open;
    (open ? guideReturn : guideOpen).focus({ preventScroll: true });
}

guideOpen.addEventListener('click', () => {
    if (siteLocale) refreshControlGuides(siteLanguage, siteLocale);
    setGuideOpen(true);
});
guideReturn.addEventListener('click', () => setGuideOpen(false));
window.addEventListener('resize', () => {
    if (worksPage.classList.contains('is-play-returning')) placePreviewFrame();
    else if (worksPage.classList.contains('is-playing')) placePlayFrame();
});

function resetWorkPlay() {
    window.clearTimeout(playFinishTimer);
    window.cancelAnimationFrame(playFrame);
    driftAnimation?.updatePlaybackRate(1);
    driftAnimation = undefined;
    previewBlur.setAttribute('stdDeviation', '10');
    unityMount.remove();
    unityMount.replaceChildren();
    previewStage.insertBefore(previewFrame, playOnline.parentElement);
    previewFrame.removeAttribute('style');
    worksPage.classList.remove('is-playing', 'is-guide-open', 'is-play-returning');
    playView.classList.remove('is-expanding', 'is-ready');
    playView.hidden = true;
    playView.inert = true;
    controlsGuide.hidden = true;
    controlsGuide.inert = true;
    guideOpen.hidden = true;
    guideOpen.setAttribute('aria-expanded', 'false');
    entranceParts[0].inert = false;
    playOnline.disabled = false;
    playOnline.classList.remove('is-hidden');
    syncWorkVideoPlayback();
}

function placePreviewFrame() {
    const pageRect = worksPage.getBoundingClientRect();
    const stageRect = previewStage.getBoundingClientRect();
    const topInset = window.innerHeight * 0.02;
    previewFrame.style.left = `${stageRect.left - pageRect.left}px`;
    previewFrame.style.top = `${stageRect.top - pageRect.top + topInset}px`;
    previewFrame.style.width = `${stageRect.width}px`;
    previewFrame.style.height = `${stageRect.height - topInset}px`;
}

worksDialog.querySelector('.back-arrow').addEventListener('click', event => {
    if (!worksPage.classList.contains('is-playing')) return;
    event.stopImmediatePropagation();
    if (worksPage.classList.contains('is-play-returning')) return;

    window.clearTimeout(playFinishTimer);
    window.cancelAnimationFrame(playFrame);
    const duration = previewReducedMotion.matches ? 0 : 1000;
    const initialBlur = Number(previewBlur.getAttribute('stdDeviation'));
    const initialRate = driftAnimation?.playbackRate ?? 0;
    worksPage.classList.add('is-play-returning');
    worksPage.classList.remove('is-guide-open');
    controlsGuide.inert = true;
    guideOpen.hidden = true;
    playView.inert = true;
    unityMount.remove();
    unityMount.replaceChildren();
    playView.classList.remove('is-ready');
    previewFrame.getBoundingClientRect();
    playView.classList.remove('is-expanding');
    placePreviewFrame();
    syncWorkVideoPlayback();

    const start = performance.now();
    function restoreMotion(now) {
        const progress = Math.min(1, (now - start) / duration);
        previewBlur.setAttribute('stdDeviation', String(initialBlur + (10 - initialBlur) * progress));
        driftAnimation?.updatePlaybackRate(initialRate + (1 - initialRate) * progress);
        if (progress < 1) playFrame = window.requestAnimationFrame(restoreMotion);
    }
    if (duration) playFrame = window.requestAnimationFrame(restoreMotion);
    playFinishTimer = window.setTimeout(() => {
        resetWorkPlay();
        playOnline.focus({ preventScroll: true });
    }, duration);
}, { capture: true });

new MutationObserver(() => {
    if (worksDialog.open || !worksPage.classList.contains('is-playing')) return;
    resetWorkPlay();
}).observe(worksDialog, { attributes: true, attributeFilter: ['open'] });
