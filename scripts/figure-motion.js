/* A shared clock for the interactive figures. Hidden drawings do no frame work. */
window.createFigureMotion = ({ element, render, paused = false, onPauseChange = () => {} }) => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false, suspended = false, frame = 0, last = 0, time = 0;
    const active = () => visible && !document.hidden && !suspended && !paused;
    const tick = now => {
        frame = 0;
        if (!active()) return;
        time += Math.min(Math.max(0, now - last), 70);
        last = now;
        render(time);
        frame = requestAnimationFrame(tick);
    };
    const sync = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        if (active()) {
            last = performance.now();
            frame = requestAnimationFrame(tick);
        }
    };
    const setPaused = value => {
        paused = Boolean(value);
        onPauseChange(paused);
        render(time);
        sync();
    };
    document.addEventListener("visibilitychange", sync);
    preference.addEventListener("change", event => setPaused(event.matches));
    window.addEventListener("pagehide", () => { suspended = true; sync(); });
    window.addEventListener("pageshow", () => { suspended = false; sync(); });
    if (typeof IntersectionObserver !== "undefined") {
        new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            sync();
        }, { rootMargin: "80px" }).observe(element);
    } else {
        visible = true;
    }
    onPauseChange(paused);
    sync();
    return { redraw: () => render(time), setPaused };
};
