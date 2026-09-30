(() => {
    const stage = document.querySelector('[data-topology-stage]');
    if (!stage) return;

    const graph = stage.querySelector('[data-topology-graph]');
    const signal = stage.querySelector('[data-topology-signal]');
    const modes = [...stage.querySelectorAll('[data-support]')];
    const playButton = stage.querySelector('[data-topology-action="play"]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const ns = 'http://www.w3.org/2000/svg';
    const n = 8;
    let support = 'ring';
    let cycle = 0;
    let eta = [];
    let kernel = [];
    const slider = stage.querySelector('[data-topology-scrubber]');
    const speedButton = stage.querySelector('[data-topology-action="speed"]');
    const message = stage.querySelector('[data-topology-message]');
    const speeds = [
        { duration: 1600, label: 'Speed: normal' },
        { duration: 3200, label: 'Speed: slow' },
        { duration: 6000, label: 'Speed: very slow' }
    ];
    let speedIndex = 1;
    let states = [];
    let bars = [];
    let playing = false;
    let frame = null;
    let transition = null;
    let previousTime = null;
    const tv = values => values.reduce((sum, value) => sum + Math.abs(value), 0) / 2;
    const percentage = values => {
        const percent = tv(values) * 100;
        return percent > 0 && percent < 0.1 ? '<0.1%' : `${percent.toFixed(1)}%`;
    };
    const finished = () => cycle >= 24 || tv(eta) < 0.001;

    const descriptions = {
        ring: 'Local overlap can spread a signal without guaranteeing contraction in one cycle.',
        shared: 'A shared row carries 25% of the mass, giving every column a common route.',
        dense: 'This uniform dense plan averages across every column in a single cycle.'
    };

    const svg = (tag, attributes, text) => {
        const element = document.createElementNS(ns, tag);
        Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
        if (text !== undefined) element.textContent = text;
        return element;
    };
    const label = (x, y, text, size = 17) => svg('text', {
        x, y, 'text-anchor': 'middle', fill: '#797080',
        'font-family': 'Consolas, monospace', 'font-size': size
    }, text);

    // Construct balanced plans explicitly; their row/column sums define a and b.
    const planFor = (mode) => {
        if (mode === 'dense') return Array.from({ length: n }, () => Array(n).fill(1 / (n * n)));
        const localMass = mode === 'shared' ? 0.75 : 1;
        const plan = Array.from({ length: n }, (_, row) =>
            Array.from({ length: n }, (_, col) =>
                col === row || col === (row + 1) % n ? localMass / (2 * n) : 0));
        if (mode === 'shared') plan.push(Array(n).fill(0.25 / n));
        return plan;
    };
    const kernelFor = (plan) => {
        const a = plan.map(row => row.reduce((sum, v) => sum + v, 0));
        const b = Array.from({ length: n }, (_, col) => plan.reduce((sum, row) => sum + row[col], 0));
        return Array.from({ length: n }, (_, j) => Array.from({ length: n }, (_, k) =>
            plan.reduce((sum, row, i) => sum + row[j] * row[k] / (b[j] * a[i]), 0)));
    };
    const coefficient = matrix => Math.max(...matrix.flatMap(row => matrix.map(other =>
        row.reduce((sum, value, col) => sum + Math.abs(value - other[col]), 0) / 2)));

    const drawGraph = plan => {
        graph.querySelectorAll('g').forEach(group => group.remove());
        const group = svg('g', {});
        const x = [48, 270, 492];
        const y = (index, count) => 65 + index * 270 / (count - 1);
        const highlightedRows = plan.map(row => row[0] > 0);
        group.append(label(x[0], 28, 'COLUMN'), label(x[1], 28, 'ROW'), label(x[2], 28, 'COLUMN'));
        // Pale support edges first, then the two-hop routes from column 1.
        for (const activeOnly of [false, true]) {
            plan.forEach((row, i) => row.forEach((weight, j) => {
                if (!weight) return;
                for (const half of [0, 1]) {
                    const active = half === 0 ? j === 0 : highlightedRows[i];
                    if (active !== activeOnly) continue;
                    const from = half === 0 ? [x[0], y(j, n)] : [x[1], y(i, plan.length)];
                    const to = half === 0 ? [x[1], y(i, plan.length)] : [x[2], y(j, n)];
                    group.append(svg('path', {
                        d: `M${from} C${(from[0] + to[0]) / 2},${from[1]} ${(from[0] + to[0]) / 2},${to[1]} ${to}`,
                        fill: 'none', stroke: active ? (half === 0 ? '#6389bf' : '#c97f91') : '#3f3949',
                        'stroke-width': active ? 2 : 1, opacity: active ? 0.7 : 0.08,
                        class: active ? 'topology-route' : ''
                    }));
                }
            }));
        }
        [n, plan.length, n].forEach((count, column) => {
            for (let i = 0; i < count; i++) {
                const active = column === 0 ? i === 0 : column === 1 ? highlightedRows[i] : kernel[0][i] > 0;
                const shared = column === 1 && i === n;
                group.append(svg('circle', {
                    cx: x[column], cy: y(i, count), r: shared ? 10 : 7,
                    fill: active ? (column === 0 ? '#6389bf' : '#c97f91') : '#f9f7f4',
                    stroke: '#3f3949', 'stroke-width': 1
                }));
                if (column !== 1) group.append(label(x[column] + (column === 0 ? -25 : 25), y(i, count) + 5, i + 1, 16));
            }
        });
        if (support === 'shared') group.append(label(x[1], 369, 'SHARED ROW · 25%', 15));
        else group.append(label(x[1], 369, 'TWO HALF-STEPS', 15));
        graph.append(group);
    };

    const buildSignal = () => {
        signal.replaceChildren();
        signal.append(svg('line', { x1: 15, y1: 68, x2: 305, y2: 68, stroke: '#cdc5d2' }));
        // Keep the initial amplitude visible without rescaling a shrinking signal.
        [0, 4].forEach(col => signal.append(svg('rect', {
            x: 24 + col * 38 - 9, y: col === 0 ? 16 : 68,
            width: 18, height: 52, rx: 2, fill: 'none',
            stroke: '#797080', 'stroke-opacity': 0.45, 'stroke-dasharray': '3 3'
        })));
        bars = Array.from({ length: n }, (_, col) => {
            const bar = svg('rect', { x: 15 + col * 38, y: 68, width: 18, height: 0, rx: 2 });
            signal.append(bar, label(24 + col * 38, 140, col + 1, 12));
            return bar;
        });
    };
    const drawBars = values => values.forEach((value, col) => {
        const height = Math.abs(value) * 52;
        bars[col].setAttribute('y', value >= 0 ? 68 - height : 68);
        bars[col].setAttribute('height', height);
        bars[col].setAttribute('fill', value >= 0 ? '#6389bf' : '#c97f91');
    });
    const updateReadout = (next = null) => {
        const cycleText = next === null ? String(cycle) : `${cycle} → ${next}`;
        const remaining = next === null ? percentage(eta) : `${percentage(eta)} → ${percentage(states[next])}`;
        stage.querySelector('[data-topology-cycle]').textContent = cycleText;
        stage.querySelector('[data-topology-tv]').textContent = remaining;
        slider.value = cycle;
        signal.setAttribute('aria-label', `Cycle ${cycleText}: ${remaining} of the initial total variation. Dashed outlines show the starting signal.`);
        if (next !== null) {
            message.textContent = 'Showing the transition between two exact cycle states.';
        } else if (tv(eta) === 0) {
            message.textContent = `Fully mixed after ${cycle} ${cycle === 1 ? 'cycle' : 'cycles'}. Replay or drag back to inspect the starting signal.`;
        } else if (tv(eta) < 0.001) {
            message.textContent = 'Less than 0.1% remains. Drag back to inspect earlier cycles.';
        } else if (cycle >= 24) {
            message.textContent = '24 cycles shown. Replay or drag back to compare earlier states.';
        } else {
            message.textContent = 'Dashed outlines mark the starting signal. Bars keep the same scale.';
        }
        if (!playing) playButton.textContent = !transition && finished() ? 'Replay' : 'Play';
    };
    const pause = () => {
        playing = false;
        window.cancelAnimationFrame(frame);
        frame = null;
        previousTime = null;
        playButton.textContent = !transition && finished() ? 'Replay' : 'Play';
        playButton.setAttribute('aria-pressed', 'false');
        stage.classList.remove('is-playing');
    };
    const seek = next => {
        pause();
        transition = null;
        cycle = Math.max(0, Math.min(24, next));
        eta = states[cycle].slice();
        drawBars(eta);
        updateReadout();
    };
    const reset = () => seek(0);
    const animate = time => {
        if (!playing) return;
        const elapsed = previousTime === null ? 0 : Math.min(time - previousTime, 100);
        previousTime = time;
        if (!transition) transition = { progress: 0, announced: false };
        transition.progress += elapsed / speeds[speedIndex].duration;
        // Hold the old state, ease to the next, then leave time to read the result.
        const progress = Math.max(0, Math.min(1, (transition.progress - 0.2) / 0.6));
        if (progress > 0 && !transition.announced) {
            transition.announced = true;
            updateReadout(cycle + 1);
        }
        const eased = reducedMotion.matches ? (progress >= 1 ? 1 : 0) : progress * progress * (3 - 2 * progress);
        drawBars(eta.map((value, col) => value + (states[cycle + 1][col] - value) * eased));
        if (transition.progress >= 1) {
            cycle++;
            eta = states[cycle].slice();
            transition = null;
            drawBars(eta);
            updateReadout();
            if (finished()) { pause(); return; }
        }
        frame = window.requestAnimationFrame(animate);
    };
    const select = next => {
        support = next;
        const plan = planFor(support);
        kernel = kernelFor(plan);
        modes.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.support === support)));
        stage.querySelector('[data-topology-description]').textContent = descriptions[support];
        stage.querySelector('[data-topology-tau]').textContent = `τ(M) = ${coefficient(kernel).toFixed(2)}`;
        states = [Array.from({ length: n }, (_, col) => col === 0 ? 1 : col === 4 ? -1 : 0)];
        for (let step = 1; step <= 24; step++) {
            const prior = states[step - 1];
            states.push(Array.from({ length: n }, (_, col) => prior.reduce((sum, value, row) => sum + kernel[row][col] * value, 0)));
        }
        drawGraph(plan);
        buildSignal();
        reset();
    };
    modes.forEach(button => button.addEventListener('click', () => select(button.dataset.support)));
    stage.querySelector('[data-topology-action="step"]').addEventListener('click', () => seek(cycle + 1));
    stage.querySelector('[data-topology-action="reset"]').addEventListener('click', reset);
    slider.addEventListener('input', () => seek(Number(slider.value)));
    speedButton.addEventListener('click', () => {
        speedIndex = (speedIndex + 1) % speeds.length;
        speedButton.textContent = speeds[speedIndex].label;
    });
    playButton.addEventListener('click', () => {
        if (playing) return pause();
        if (!transition && finished()) reset();
        playing = true;
        previousTime = null;
        playButton.textContent = 'Pause';
        playButton.setAttribute('aria-pressed', 'true');
        if (!reducedMotion.matches) stage.classList.add('is-playing');
        frame = window.requestAnimationFrame(animate);
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => { if (!entries[0].isIntersecting) pause(); }).observe(stage);
    }
    select(support);
})();
