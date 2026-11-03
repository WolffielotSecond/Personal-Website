(() => {
    const page = document.querySelector('.works-page');
    const preview = page.querySelector('.work-preview');
    const dialog = page.closest('dialog');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const vertices = [
        [1, 43, 0.4, 4], [6, 8, 1.8, 2],
        [43, 2, 6, 0.5], [92, 5, 2, 1.4],
        [99, 34, 0.4, 5], [95, 92, 1.8, 2],
        [57, 98, 6, 0.5], [5, 93, 1.8, 2],
    ];
    let frame = null;
    let lastTime = null;
    let elapsed = 0;

    function draw(seconds) {
        const points = vertices.map(([x, y, ax, ay], index) => {
            const phase = index * 0.8;
            const dx = ax * (Math.sin(seconds * Math.PI * 2 / 9 + phase) - Math.sin(phase));
            const dy = ay * (Math.sin(seconds * Math.PI * 2 / 11 + phase + 1.1) - Math.sin(phase + 1.1));
            return [x + dx, y + dy];
        });
        // Both video layers inherit the same silhouette; their checker masks stay outside its feathering.
        preview.style.setProperty('--preview-shape', `polygon(${points.map(([x, y]) => `${x.toFixed(3)}% ${y.toFixed(3)}%`).join(', ')})`);
    }

    function animate(time) {
        if (lastTime !== null) elapsed += time - lastTime;
        lastTime = time;
        draw(elapsed / 1000);
        frame = window.requestAnimationFrame(animate);
    }

    function syncMotion() {
        const visible = dialog.open && !page.hidden && !document.hidden;
        if (!visible || reducedMotion.matches) {
            if (frame !== null) window.cancelAnimationFrame(frame);
            frame = null;
            lastTime = null;
            if (reducedMotion.matches) draw(0);
        } else if (frame === null) {
            frame = window.requestAnimationFrame(animate);
        }
    }

    const observer = new MutationObserver(syncMotion);
    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    observer.observe(page, { attributes: true, attributeFilter: ['hidden'] });
    document.addEventListener('visibilitychange', syncMotion);
    reducedMotion.addEventListener('change', syncMotion);
    syncMotion();
})();
