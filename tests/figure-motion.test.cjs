const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const source = readFileSync(require('node:path').join(__dirname, '../scripts/figure-motion.js'), 'utf8');
function fixture(paused = false) {
    const events = () => ({ handlers: {}, addEventListener(name, fn) { this.handlers[name] = fn; }, emit(name, value) { this.handlers[name]?.(value); } });
    const window = events(), document = { ...events(), hidden: false }, preference = events();
    const frames = new Map(), rendered = [], preferences = [];
    let now = 0, next = 1, intersect;
    runInNewContext(source, {
        window, document, matchMedia: () => preference, performance: { now: () => now },
        requestAnimationFrame: fn => { const id = next++; frames.set(id, fn); return id; },
        cancelAnimationFrame: id => frames.delete(id),
        IntersectionObserver: class { constructor(fn) { intersect = fn; } observe() {} }
    });
    const motion = window.createFigureMotion({ element: {}, paused, render: time => rendered.push(time), onPauseChange: value => preferences.push(value) });
    const step = (ms = 1000 / 60) => {
        now += ms;
        const pending = [...frames.values()]; frames.clear();
        pending.forEach(fn => fn(now));
    };
    return { window, document, preference, frames, rendered, preferences, motion, step, visible: value => intersect([{ isIntersecting: value }]) };
}

test('no animation work before visibility, then one draw per display frame at 60 and 120 Hz', () => {
    const f = fixture(); f.step(); assert.equal(f.rendered.length, 0);
    f.visible(true);
    for (let i = 0; i < 60; i++) f.step();
    for (let i = 0; i < 120; i++) f.step(1000 / 120);
    assert.equal(f.rendered.length, 180);
    assert.ok(Math.abs(f.rendered.at(-1) - 2000) < .001);
    assert.equal(f.frames.size, 1);
});

test('off-screen and hidden figures stop without advancing their clock', () => {
    const f = fixture(); f.visible(true); f.step(); const first = f.rendered.at(-1);
    f.visible(false); f.step(5000); assert.equal(f.frames.size, 0);
    f.visible(true); f.step(); assert.ok(Math.abs(f.rendered.at(-1) - first - 1000 / 60) < .001);
    f.document.hidden = true; f.document.emit('visibilitychange'); f.step(5000);
    assert.equal(f.frames.size, 0);
    f.document.hidden = false; f.document.emit('visibilitychange'); f.step();
    assert.equal(f.frames.size, 1);
});

test('pausing preserves the current drawing through interactions and visibility changes', () => {
    const f = fixture(); f.visible(true); f.step(); f.motion.setPaused(true);
    const frozen = f.rendered.at(-1); f.step(5000); f.motion.redraw();
    assert.equal(f.rendered.at(-1), frozen);
    f.visible(false); f.visible(true); assert.equal(f.frames.size, 0);
    f.motion.setPaused(false); f.step(); assert.ok(f.rendered.at(-1) > frozen);
    assert.deepEqual(f.preferences, [false, true, false]);
});

test('reduced motion and page restoration cannot create duplicate loops', () => {
    const f = fixture(true); f.visible(true); f.step(); assert.equal(f.frames.size, 0);
    f.preference.emit('change', { matches: false }); f.step(); assert.equal(f.frames.size, 1);
    f.window.emit('pagehide'); f.step(5000); assert.equal(f.frames.size, 0);
    f.window.emit('pageshow'); f.window.emit('pageshow'); f.step(); assert.equal(f.frames.size, 1);
    f.preference.emit('change', { matches: true }); f.step(); assert.equal(f.frames.size, 0);
});
