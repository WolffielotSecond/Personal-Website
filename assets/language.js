const languageSwitch = document.querySelector('.language-switch');
const languageHighlight = languageSwitch.querySelector('.language-highlight');
const languageButtons = [...languageSwitch.querySelectorAll('button')];
const languageShapes = {
    'zh-CN': ['polygon(0 0, 56% 0, 44% 100%, 0 100%)', 'polygon(0 0, 50% 0, 50% 100%, 0 100%)'],
    en: ['polygon(56% 0, 100% 0, 100% 100%, 44% 100%)', 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)'],
};
let languageAnimation;
let languageRequest;
let guideRequest;

function placeLanguageSwitch() {
    const host = introDialog.open ? introDialog : worksDialog.open ? worksDialog : document.body;
    if (languageSwitch.parentElement === host && languageSwitch.matches(':popover-open')) return;
    languageSwitch.hidePopover();
    host.append(languageSwitch);
    languageSwitch.showPopover();
}

const languageLayerObserver = new MutationObserver(placeLanguageSwitch);
for (const dialog of [worksDialog, introDialog]) {
    languageLayerObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] });
}
placeLanguageSwitch();
languageHighlight.style.clipPath = languageShapes.en[0];

async function refreshControlGuides(language, locale) {
    guideRequest?.abort();
    guideRequest = new AbortController();
    const { signal } = guideRequest;
    await Promise.all([...controlsGuide.querySelectorAll('[data-guide-work]')].map(async guide => {
        guide.replaceChildren();
        const file = workDetails[guide.dataset.guideWork].introduction;
        try {
            const response = await fetch(`assets/controls/${language}/${file}`, { cache: 'no-cache', signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const markdown = await response.text();
            if (signal.aborted) return;
            for (const line of markdown.split(/\r?\n/)) {
                if (!line.trim()) continue;
                const item = document.createElement('li');
                appendMarkdownBold(item, line.replace(/^[-*] +/, ''));
                guide.append(item);
            }
        } catch {
            if (signal.aborted) return;
            const item = document.createElement('li');
            item.textContent = locale.controlsUnavailable;
            guide.append(item);
        }
    }));
}

async function setSiteLanguage(language) {
    languageRequest?.abort();
    languageRequest = new AbortController();
    const { signal } = languageRequest;
    let locale;
    try {
        const response = await fetch(`assets/locales/${language}.json`, { cache: 'no-cache', signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        locale = await response.json();
    } catch (error) {
        if (!signal.aborted) console.error('Could not load language:', error);
        return;
    }
    if (signal.aborted) return;

    const previous = siteLanguage;
    siteLanguage = language;
    siteLocale = locale;
    document.documentElement.lang = language;
    for (const [selector, value] of Object.entries(locale.labels)) {
        document.querySelector(selector).setAttribute('aria-label', value);
    }
    for (const [selector, value] of Object.entries(locale.text)) {
        document.querySelector(selector).textContent = value;
    }
    for (const card of workCards.filter(card => card.dataset.work)) {
        const name = workDetails[card.dataset.work].name;
        card.setAttribute('aria-label', locale.select.replace('{name}', name));
    }
    updateWorkAction(currentWork);
    updatePreviewLabel(currentWork);
    unityMount.setAttribute('aria-label', locale.player);
    unityMount.querySelector('iframe')?.setAttribute('title', locale.player);
    if (introDialog.open) refreshIntroduction();
    refreshControlGuides(language, locale);
    for (const button of languageButtons) {
        button.setAttribute('aria-pressed', String(button.dataset.language === language));
    }

    languageAnimation?.cancel();
    languageHighlight.style.clipPath = languageShapes[language][0];
    if (previous !== language && !previewReducedMotion.matches) {
        languageAnimation = languageHighlight.animate([
            { clipPath: languageShapes[previous][0] },
            { clipPath: languageShapes[previous][1], offset: 0.22 },
            { clipPath: languageShapes[language][1], offset: 0.78 },
            { clipPath: languageShapes[language][0] },
        ], { duration: 360, easing: 'ease-in-out' });
    }
    try { localStorage.setItem('site-language', language); } catch {}
}

for (const button of languageButtons) {
    button.addEventListener('click', () => setSiteLanguage(button.dataset.language));
    button.setAttribute('aria-pressed', String(button.dataset.language === siteLanguage));
}
let savedLanguage;
try { savedLanguage = localStorage.getItem('site-language'); } catch {}
setSiteLanguage(savedLanguage === 'zh-CN' ? 'zh-CN' : 'en');
