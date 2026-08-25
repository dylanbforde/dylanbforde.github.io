(() => {
    const stage = document.querySelector("[data-argument-stage]");
    const canvas = document.querySelector("[data-argument-canvas]");
    if (!stage || !canvas) return;

    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const buttons = [...stage.querySelectorAll("[data-argument-mode]")];
    const pauseButton = stage.querySelector("[data-argument-pause]");
    const copy = {
        kicker: stage.querySelector("[data-argument-kicker]"),
        description: stage.querySelector("[data-argument-description]"),
        variable: stage.querySelector("[data-argument-variable]"),
        effect: stage.querySelector("[data-argument-effect]"),
        horizon: stage.querySelector("[data-argument-horizon]")
    };
    const modes = {
        commons: { kicker: "Education / coordination / search", description: "Independent explorers become correlated around the same legible path, leaving more of the search space untouched.", stats: ["correlation", "crowded search", "one generation"] },
        constraint: { kicker: "Economics / information / optimization", description: "Frequent local updates respond to fresh conditions while a central batch becomes cleaner, slower, and increasingly stale.", stats: ["update latency", "stale gradient", "continuous"] },
        capital: { kicker: "Genetics / inheritance / compounding", description: "A small persistent change alters the starting point on which every later generation acts.", stats: ["heritable delta", "compounding base", "many generations"] }
    };

    let mode = "commons";
    let width = 0;
    let height = 0;
    let paused = reduceMotion;
    let pointer = null;
    let last = 0;
    let raf = 0;

    const fit = () => {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = rect.width;
        height = rect.height;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw(performance.now());
    };

    const area = () => ({
        left: width < 700 ? 24 : 58,
        right: width - (width < 700 ? 24 : 58),
        top: width < 700 ? 215 : 155,
        bottom: height - (width < 700 ? 126 : 96)
    });

    const label = (text, x, y, color = "rgba(45,38,31,.62)", align = "center") => {
        ctx.fillStyle = color;
        ctx.font = `${width < 700 ? 8 : 9}px 'JetBrains Mono', monospace`;
        ctx.textAlign = align;
        ctx.fillText(text.toUpperCase(), x, y);
    };

    const dot = (x, y, radius, color) => {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    };

    const drawCommons = (time, box) => {
        const spanX = box.right - box.left;
        const spanY = box.bottom - box.top;
        const peaks = [
            { x: box.left + spanX * .18, y: box.top + spanY * .55, h: .28, name: "unusual depth" },
            { x: box.left + spanX * .48, y: box.top + spanY * .39, h: .43, name: "legible prestige" },
            { x: box.left + spanX * .76, y: box.top + spanY * .58, h: .24, name: "unmapped frontier" }
        ];
        ctx.strokeStyle = "rgba(45,38,31,.12)"; ctx.lineWidth = 1;
        for (let row = 0; row < 5; row += 1) {
            ctx.beginPath();
            for (let i = 0; i <= 80; i += 1) {
                const x = box.left + (i / 80) * spanX;
                let value = 0;
                peaks.forEach((p) => { const d = (x - p.x) / (spanX * .13); value += p.h * Math.exp(-d * d); });
                const y = box.bottom - row * 12 - value * spanY;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        peaks.forEach((peak, i) => label(peak.name, peak.x, box.bottom - peak.h * spanY - 18, i === 1 ? "#0f9d8d" : "rgba(45,38,31,.5)"));

        const target = pointer && pointer.y > box.top && pointer.y < box.bottom ? pointer.x : peaks[1].x;
        for (let i = 0; i < 18; i += 1) {
            const startX = box.left + (i / 17) * spanX;
            const phase = paused ? .72 : ((time * .00012 + i * .041) % 1);
            const correlated = i < 14;
            const endX = correlated ? peaks[1].x + Math.sin(i * 2.2) * 18 : peaks[i % 3].x;
            const perturbedEnd = correlated ? endX * .84 + target * .16 : endX;
            const x = startX + (perturbedEnd - startX) * phase;
            const arc = Math.sin(phase * Math.PI) * (28 + (i % 4) * 7);
            const y = box.bottom - 12 - arc;
            dot(x, y, correlated ? 4 : 3, correlated ? "rgba(217,120,45,.82)" : "rgba(15,157,141,.72)");
        }
        label("18 search trajectories · 14 share the same signal", box.left, box.bottom + 26, "rgba(45,38,31,.56)", "left");
    };

    const drawConstraint = (time, box) => {
        const cx = (box.left + box.right) / 2;
        const cy = (box.top + box.bottom) / 2;
        const radius = Math.min((box.right - box.left) * .36, (box.bottom - box.top) * .42);
        const local = [];
        for (let i = 0; i < 12; i += 1) {
            const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            local.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius * .72 });
        }
        local.forEach((point, i) => {
            const fresh = i % 3 !== 0;
            ctx.strokeStyle = fresh ? "rgba(15,157,141,.24)" : "rgba(217,120,45,.22)";
            ctx.setLineDash(fresh ? [] : [4,5]);
            ctx.beginPath(); ctx.moveTo(point.x, point.y); ctx.lineTo(cx, cy); ctx.stroke(); ctx.setLineDash([]);
            const pulse = paused ? .4 : ((time * (fresh ? .00028 : .00008) + i * .08) % 1);
            dot(point.x + (cx - point.x) * pulse, point.y + (cy - point.y) * pulse, fresh ? 3 : 4, fresh ? "rgba(15,157,141,.8)" : "rgba(217,120,45,.78)");
            dot(point.x, point.y, 7, fresh ? "rgba(15,157,141,.82)" : "rgba(217,120,45,.72)");
        });
        ctx.shadowColor = "rgba(45,38,31,.15)"; ctx.shadowBlur = 18;
        ctx.fillStyle = "rgba(255,252,246,.98)"; ctx.beginPath(); ctx.arc(cx, cy, 57, 0, Math.PI * 2); ctx.fill();
        ctx.shadowColor = "transparent"; ctx.strokeStyle = "rgba(45,38,31,.2)"; ctx.stroke();
        label("central batch", cx, cy - 3, "#2d261f"); label("arrives after delay", cx, cy + 15, "rgba(217,120,45,.85)");
        label("frequent local updates", box.left, box.bottom + 26, "rgba(15,157,141,.8)", "left");
        label("slow / compressed updates", box.right, box.bottom + 26, "rgba(217,120,45,.8)", "right");
        if (pointer && pointer.y > box.top && pointer.y < box.bottom) dot(pointer.x, pointer.y, 18, "rgba(15,157,141,.08)");
    };

    const drawCapital = (time, box) => {
        const cx = (box.left + box.right) / 2;
        const cy = (box.top + box.bottom) / 2;
        const maxR = Math.min((box.right - box.left) * .43, (box.bottom - box.top) * .46);
        const generations = width < 700 ? 5 : 7;
        for (let g = generations; g >= 1; g -= 1) {
            const r = (g / generations) * maxR;
            ctx.strokeStyle = g === generations ? "rgba(217,120,45,.38)" : "rgba(45,38,31,.13)";
            ctx.lineWidth = g === generations ? 2 : 1;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
            label(`G${g}`, cx, cy - r + 12, g === generations ? "rgba(217,120,45,.9)" : "rgba(45,38,31,.42)");
            const count = 5 + g * 2;
            for (let i = 0; i < count; i += 1) {
                const baseAngle = (i / count) * Math.PI * 2;
                const drift = paused ? .2 : Math.sin(time * .00035 + g + i) * .025;
                const rr = r + Math.sin(i * 3.1) * 4;
                const emphasized = i % Math.max(2, 7 - g) === 0;
                dot(cx + Math.cos(baseAngle + drift) * rr, cy + Math.sin(baseAngle + drift) * rr, emphasized ? 4 : 2.5, emphasized ? "rgba(217,120,45,.8)" : "rgba(15,157,141,.54)");
            }
        }
        dot(cx, cy, 12, "#0f9d8d");
        ctx.strokeStyle = "rgba(217,120,45,.55)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + maxR * .72, cy - maxR * .58); ctx.stroke();
        label("persistent delta", cx + maxR * .74, cy - maxR * .61, "rgba(217,120,45,.9)");
        label("each ring inherits the previous base", box.left, box.bottom + 26, "rgba(45,38,31,.56)", "left");
        if (pointer && pointer.y > box.top && pointer.y < box.bottom) {
            ctx.strokeStyle = "rgba(15,157,141,.22)"; ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 24, 0, Math.PI * 2); ctx.stroke();
        }
    };

    function draw(time) {
        if (!width || !height) return;
        ctx.clearRect(0, 0, width, height);
        const box = area();
        if (mode === "commons") drawCommons(time, box);
        if (mode === "constraint") drawConstraint(time, box);
        if (mode === "capital") drawCapital(time, box);
    }

    const animate = (time) => {
        raf = requestAnimationFrame(animate);
        if (paused || document.hidden || time - last < 30) return;
        last = time; draw(time);
    };

    const setMode = (next) => {
        if (!modes[next]) return;
        mode = next;
        buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.argumentMode === mode)));
        const data = modes[mode];
        copy.kicker.textContent = data.kicker; copy.description.textContent = data.description;
        copy.variable.textContent = data.stats[0]; copy.effect.textContent = data.stats[1]; copy.horizon.textContent = data.stats[2];
        draw(performance.now());
    };

    buttons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.argumentMode)));
    pauseButton?.addEventListener("click", () => {
        paused = !paused; pauseButton.setAttribute("aria-pressed", String(paused));
        pauseButton.textContent = paused ? "Resume motion" : "Pause motion"; draw(performance.now());
    });
    canvas.addEventListener("pointermove", (event) => { const rect = canvas.getBoundingClientRect(); pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top }; draw(performance.now()); });
    canvas.addEventListener("pointerleave", () => { pointer = null; draw(performance.now()); });

    new ResizeObserver(fit).observe(canvas);
    fit(); raf = requestAnimationFrame(animate);
    window.addEventListener("pagehide", () => cancelAnimationFrame(raf), { once: true });
})();
