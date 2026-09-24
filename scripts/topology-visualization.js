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
    let timer = null;

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
        x, y, 'text-anchor': 'middle', fill: '#867a69',
        'font-family': 'JetBrains Mono, monospace', 'font-size': size
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
                        fill: 'none', stroke: active ? (half === 0 ? '#00a3ff' : '#ff5c00') : '#2d261f',
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
                    fill: active ? (column === 0 ? '#00a3ff' : '#ff5c00') : '#fffcf6',
                    stroke: '#2d261f', 'stroke-width': 1
                }));
                if (column !== 1) group.append(label(x[column] + (column === 0 ? -25 : 25), y(i, count) + 5, i + 1, 16));
            }
        });
        if (support === 'shared') group.append(label(x[1], 369, 'SHARED ROW · 25%', 15));
        else group.append(label(x[1], 369, 'TWO HALF-STEPS', 15));
        graph.append(group);
    };

    const drawSignal = () => {
        signal.replaceChildren();
        signal.append(svg('line', { x1: 15, y1: 68, x2: 305, y2: 68, stroke: '#c5bba9' }));
        eta.forEach((value, col) => {
            const x = 24 + col * 38;
            const h = Math.abs(value) * 52;
            signal.append(svg('rect', {
                x: x - 9, y: value >= 0 ? 68 - h : 68,
                width: 18, height: Math.max(0.8, h), rx: 2,
                fill: value >= 0 ? '#00a3ff' : '#ff5c00'
            }));
            signal.append(label(x, 140, col + 1, 12));
        });
        const tv = eta.reduce((sum, value) => sum + Math.abs(value), 0) / 2;
        const percent = tv * 100;
        stage.querySelector('[data-topology-cycle]').textContent = cycle;
        stage.querySelector('[data-topology-tv]').textContent = percent > 0 && percent < 0.1 ? '<0.1%' : `${percent.toFixed(1)}%`;
        signal.setAttribute('aria-label', `Cycle ${cycle}: ${percent.toFixed(1)} percent of the initial total variation remains across eight columns.`);
    };
    const stop = () => {
        window.clearInterval(timer);
        timer = null;
        playButton.textContent = 'Play';
        playButton.setAttribute('aria-pressed', 'false');
        stage.classList.remove('is-playing');
    };
    const step = () => {
        eta = Array.from({ length: n }, (_, col) => eta.reduce((sum, value, row) => sum + kernel[row][col] * value, 0));
        cycle++;
        drawSignal();
        if (cycle >= 24) stop();
    };
    const reset = () => {
        stop();
        cycle = 0;
        eta = Array(n).fill(0);
        eta[0] = 1;
        eta[4] = -1;
        drawSignal();
    };
    const select = next => {
        support = next;
        const plan = planFor(support);
        kernel = kernelFor(plan);
        modes.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.support === support)));
        stage.querySelector('[data-topology-description]').textContent = descriptions[support];
        stage.querySelector('[data-topology-tau]').textContent = `τ(M) = ${coefficient(kernel).toFixed(2)}`;
        drawGraph(plan);
        reset();
    };
    modes.forEach(button => button.addEventListener('click', () => select(button.dataset.support)));
    stage.querySelector('[data-topology-action="step"]').addEventListener('click', () => { stop(); step(); });
    stage.querySelector('[data-topology-action="reset"]').addEventListener('click', reset);
    playButton.addEventListener('click', () => {
        if (timer) return stop();
        if (cycle >= 24) reset();
        playButton.textContent = 'Pause';
        playButton.setAttribute('aria-pressed', 'true');
        if (!reducedMotion.matches) stage.classList.add('is-playing');
        timer = window.setInterval(step, 850);
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stop(); }).observe(stage);
    }
    select(support);
})();
