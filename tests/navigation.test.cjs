const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the real page handlers with recorded-style wheel bursts and a fake clock.
function createPage() {
    let now = 0;
    let timerId = 0;
    const timers = new Map();
    const handlers = {};
    const button = () => ({
        addEventListener(type, callback) { this[type] = callback; },
        focus() {},
    });
    const covers = ['home', 'works', 'writing', 'about'].map(id => ({
        id,
        arrow: button(),
        contains: () => false,
        focus() {},
        querySelector(selector) {
            return selector === '.cover-arrow' ? this.arrow : { textContent: id };
        },
    }));
    const style = { index: 0, setProperty(name, value) { this.index = value; } };
    const back = button();
    const dialog = {
        open: false,
        dataset: {},
        classList: { add() {}, remove() {} },
        querySelector: () => back,
        querySelectorAll: () => covers.map(cover => ({ dataset: { subtab: cover.id } })),
        setAttribute() {},
        addEventListener() {},
        getBoundingClientRect() {},
        showModal() { this.open = true; },
        close() { this.open = false; },
    };
    const window = {
        innerWidth: 1280,
        innerHeight: 720,
        matchMedia: () => ({ matches: false }),
        addEventListener(type, callback) { handlers[type] = callback; },
        setTimeout(callback, delay) {
            timers.set(++timerId, { callback, due: now + delay });
            return timerId;
        },
        clearTimeout(id) { timers.delete(id); },
    };
    const document = {
        activeElement: {},
        querySelectorAll: () => covers,
        querySelector: selector => selector === '#subtab' ? dialog : { style },
    };
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], { window, document });

    return {
        get index() { return style.index; },
        dialog,
        advance(milliseconds) {
            const target = now + milliseconds;
            while (true) {
                const next = [...timers].filter(([, timer]) => timer.due <= target)
                    .sort((a, b) => a[1].due - b[1].due)[0];
                if (!next) break;
                now = next[1].due;
                timers.delete(next[0]);
                next[1].callback();
            }
            now = target;
        },
        wheel(y, x = 0) {
            handlers.wheel({
                deltaX: x, deltaY: y, deltaMode: 0, ctrlKey: false,
                preventDefault() {},
            });
        },
    };
}

test('another same-direction swipe works without an idle gap in the inertia stream', () => {
    const page = createPage();
    page.wheel(60);
    assert.equal(page.index, 1);
    for (const delta of [48, 35, 25, 18, 12, 8, 5, 3, 2]) {
        page.advance(100);
        page.wheel(delta);
    }
    for (const delta of [6, 12, 22, 24]) {
        page.advance(40);
        page.wheel(delta);
    }
    assert.equal(page.index, 2);
});

test('tiny residual events cannot keep the next swipe locked', () => {
    const page = createPage();
    page.wheel(60);
    for (let i = 0; i < 12; i++) {
        page.advance(80);
        page.wheel(0.8);
    }
    page.wheel(60);
    assert.equal(page.index, 2);
});

test('one long decaying inertia stream still advances only one page', () => {
    const page = createPage();
    page.wheel(60);
    for (let delta = 54; delta > 0.1; delta *= 0.9) {
        page.advance(80);
        page.wheel(delta);
        assert.equal(page.index, 1);
    }
});

test('horizontal entry and reverse return keep the selected cover', () => {
    const page = createPage();
    page.wheel(60);
    page.advance(900);
    page.wheel(0, 60);
    assert.equal(page.dialog.dataset.cover, 'works');
    for (const delta of [40, 28, 20, 12, 8, 5, 3, 2, 2]) {
        page.advance(100);
        page.wheel(0, delta);
    }
    page.wheel(0, -60);
    page.advance(800);
    assert.equal(page.dialog.open, false);
    assert.equal(page.index, 1);
});
