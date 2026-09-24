(() => {
    const stage = document.querySelector("[data-sinkhorn-stage]");
    const canvas = stage?.querySelector("[data-sinkhorn-canvas]");

    if (!stage || !canvas || !canvas.getContext) {
        return;
    }

    const context = canvas.getContext("2d");
    const description = stage.querySelector("[data-stage-description]");
    const status = stage.querySelector("[data-stage-status]");
    const modeButtons = [...stage.querySelectorAll("[data-mode]")];
    const speedButton = stage.querySelector("[data-action='speed']");
    const pauseButton = stage.querySelector("[data-action='pause']");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const modes = {
        transport: {
            description: "Move across the field to inspect how a query owns a local transport window.",
            status: "local transport window"
        },
        stream: {
            description: "The active tile moves through banded support while the rest of the plan stays out of memory.",
            status: "one active plan tile"
        },
        adjoint: {
            description: "Four staircase factors are reconstructed from one reference plan tile and vector modifiers.",
            status: "one-reference R=2 adjoint"
        }
    };

    const speedStates = [
        { multiplier: 1, label: "Slow down" },
        { multiplier: 0.34, label: "Speed: ⅓×" },
        { multiplier: 0.12, label: "Speed: ⅛×" }
    ];

    let mode = "stream";
    let selectedRow = 8;
    let pointerInside = false;
    let speedIndex = reducedMotion ? 2 : 0;
    let paused = reducedMotion;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let frameId = null;
    let startTime = performance.now();
    let pauseTime = 0;

    const palette = {
        ink: "#2d261f",
        muted: "#867a69",
        faint: "rgba(45, 38, 31, 0.1)",
        cyan: "#00a3ff",
        cyanSoft: "rgba(0, 163, 255, 0.16)",
        amber: "#ff5c00",
        amberSoft: "rgba(255, 92, 0, 0.14)",
        red: "#a54826",
        paper: "rgba(255, 252, 246, 0.92)"
    };

    const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
    const setCanvasSize = () => {
        const rect = canvas.getBoundingClientRect();
        width = Math.max(1, rect.width);
        height = Math.max(1, rect.height);
        pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        draw(performance.now());
    };

    const getLayout = () => {
        const compact = width < 720;
        const count = compact ? 14 : 20;
        const top = 44;
        const bottom = height - 32;
        const left = compact ? 24 : 86;
        const right = width - left;
        const centerLeft = compact ? 52 : 190;
        const centerRight = width - centerLeft;
        const rowGap = (bottom - top) / Math.max(1, count - 1);
        return { compact, count, top, bottom, left, right, centerLeft, centerRight, rowGap };
    };

    const nodeY = (index, layout) => layout.top + index * layout.rowGap;

    const drawNode = (x, y, active, target = false) => {
        context.beginPath();
        context.arc(x, y, active ? 5.2 : 3.2, 0, Math.PI * 2);
        context.fillStyle = active ? (target ? palette.amber : palette.cyan) : palette.paper;
        context.fill();
        context.lineWidth = active ? 1.5 : 1;
        context.strokeStyle = active ? palette.ink : "rgba(45, 38, 31, 0.45)";
        context.stroke();
    };

    const drawCurve = (x1, y1, x2, y2, opacity, color, bend = 0) => {
        const centerX = (x1 + x2) / 2;
        context.beginPath();
        context.moveTo(x1, y1);
        context.bezierCurveTo(centerX, y1 + bend, centerX, y2 - bend, x2, y2);
        context.lineWidth = opacity > 0.55 ? 1.45 : 0.8;
        context.strokeStyle = color.replace("ALPHA", String(opacity));
        context.stroke();
    };

    const pointOnCurve = (x1, y1, x2, y2, bend, progress) => {
        const centerX = (x1 + x2) / 2;
        const inverse = 1 - progress;
        return {
            x: inverse ** 3 * x1 + 3 * inverse ** 2 * progress * centerX + 3 * inverse * progress ** 2 * centerX + progress ** 3 * x2,
            y: inverse ** 3 * y1 + 3 * inverse ** 2 * progress * (y1 + bend) + 3 * inverse * progress ** 2 * (y2 - bend) + progress ** 3 * y2
        };
    };

    const drawSequenceLabels = (layout) => {
        context.save();
        context.fillStyle = palette.muted;
        context.font = "10px JetBrains Mono, monospace";
        context.textAlign = "left";
        context.fillText("QUERY TOKENS", layout.compact ? 18 : layout.left, layout.top - 24);
        context.textAlign = "right";
        context.fillText("KEY / VALUE TOKENS", layout.compact ? width - 18 : layout.right, layout.top - 24);
        context.restore();
    };

    const drawTransport = (time, layout) => {
        const phase = time * 0.0012 * speedStates[speedIndex].multiplier;
        const windowRadius = layout.compact ? 2 : 3;

        if (!pointerInside) {
            const sweep = (time * 0.00016 * speedStates[speedIndex].multiplier) % 2;
            const pingPong = sweep <= 1 ? sweep : 2 - sweep;
            selectedRow = Math.round(pingPong * (layout.count - 1));
        }

        for (let row = 0; row < layout.count; row += 2) {
            const target = clamp(row + Math.round(Math.sin(phase + row * 0.7) * 2), 0, layout.count - 1);
            drawCurve(
                layout.left + 5,
                nodeY(row, layout),
                layout.right - 5,
                nodeY(target, layout),
                0.07,
                "rgba(45, 38, 31, ALPHA)",
                Math.sin(row) * 12
            );
        }

        for (let offset = -windowRadius; offset <= windowRadius; offset += 1) {
            const target = clamp(selectedRow + offset, 0, layout.count - 1);
            const distance = Math.abs(offset);
            const pulse = 0.76 + Math.sin(phase * 2.2 + offset) * 0.14;
            const opacity = clamp((1 - distance / (windowRadius + 1)) * pulse, 0.16, 0.9);
            const startX = layout.left + 5;
            const startY = nodeY(selectedRow, layout);
            const endX = layout.right - 5;
            const endY = nodeY(target, layout);
            const bend = offset * 7;
            drawCurve(
                startX,
                startY,
                endX,
                endY,
                opacity,
                offset === 0 ? "rgba(0, 163, 255, ALPHA)" : "rgba(255, 92, 0, ALPHA)",
                bend
            );

            const flowProgress = (time * 0.00055 * speedStates[speedIndex].multiplier + (offset + windowRadius) * 0.11) % 1;
            const particle = pointOnCurve(startX, startY, endX, endY, bend, flowProgress);
            const particleColor = offset === 0 ? palette.cyan : palette.amber;
            context.beginPath();
            context.arc(particle.x, particle.y, distance === 0 ? 9 : 7, 0, Math.PI * 2);
            context.fillStyle = offset === 0 ? "rgba(0, 163, 255, 0.16)" : "rgba(255, 92, 0, 0.13)";
            context.fill();
            context.beginPath();
            context.arc(particle.x, particle.y, distance === 0 ? 4.2 : 3.2, 0, Math.PI * 2);
            context.fillStyle = particleColor;
            context.fill();
        }

        context.fillStyle = palette.ink;
        context.font = `${layout.compact ? 8 : 10}px JetBrains Mono, monospace`;
        context.textAlign = "center";
        context.fillText("MASS FLOW  →", width / 2, nodeY(selectedRow, layout) - 18);

        for (let row = 0; row < layout.count; row += 1) {
            drawNode(layout.left, nodeY(row, layout), row === selectedRow);
            drawNode(layout.right, nodeY(row, layout), Math.abs(row - selectedRow) <= windowRadius, true);
        }
    };

    const drawMatrixFrame = (layout) => {
        const matrixSize = Math.min(layout.centerRight - layout.centerLeft, layout.bottom - layout.top);
        const x = (width - matrixSize) / 2;
        const y = layout.top + (layout.bottom - layout.top - matrixSize) / 2;
        const cells = layout.compact ? 7 : 9;
        const cell = matrixSize / cells;

        context.strokeStyle = "rgba(45, 38, 31, 0.12)";
        context.lineWidth = 1;
        for (let index = 0; index <= cells; index += 1) {
            context.beginPath();
            context.moveTo(x + index * cell, y);
            context.lineTo(x + index * cell, y + matrixSize);
            context.stroke();
            context.beginPath();
            context.moveTo(x, y + index * cell);
            context.lineTo(x + matrixSize, y + index * cell);
            context.stroke();
        }

        return { x, y, size: matrixSize, cells, cell };
    };

    const drawStream = (time, layout) => {
        const matrix = drawMatrixFrame(layout);
        const progress = (time * 0.00022 * speedStates[speedIndex].multiplier) % 1;
        const active = Math.floor(progress * matrix.cells);
        const band = layout.compact ? 1 : 2;

        for (let row = 0; row < matrix.cells; row += 1) {
            for (let column = 0; column < matrix.cells; column += 1) {
                if (Math.abs(row - column) <= band) {
                    context.fillStyle = row === active
                        ? "rgba(0, 163, 255, 0.34)"
                        : "rgba(0, 163, 255, 0.07)";
                    context.fillRect(
                        matrix.x + column * matrix.cell + 1,
                        matrix.y + row * matrix.cell + 1,
                        matrix.cell - 2,
                        matrix.cell - 2
                    );
                }
            }
        }

        const activeY = matrix.y + active * matrix.cell;
        context.strokeStyle = palette.cyan;
        context.lineWidth = 2;
        context.strokeRect(matrix.x - 2, activeY - 2, matrix.size + 4, matrix.cell + 4);

        context.fillStyle = palette.ink;
        context.font = "10px JetBrains Mono, monospace";
        context.textAlign = "left";
        context.fillText("RESIDENT TILE", matrix.x, matrix.y - 12);

        const sourceRow = Math.round(active * (layout.count - 1) / Math.max(1, matrix.cells - 1));
        selectedRow = sourceRow;
        for (let row = 0; row < layout.count; row += 1) {
            drawNode(layout.left, nodeY(row, layout), row === sourceRow);
            drawNode(layout.right, nodeY(row, layout), Math.abs(row - sourceRow) <= 2, true);
        }
    };

    const drawAdjoint = (time, layout) => {
        const phase = time * 0.001 * speedStates[speedIndex].multiplier;
        const matrix = drawMatrixFrame(layout);
        const tileSize = matrix.cell * (layout.compact ? 1.25 : 1.45);
        const tileX = matrix.x + matrix.size / 2 - tileSize / 2;
        const tileY = matrix.y + matrix.size / 2 - tileSize / 2;

        context.fillStyle = "rgba(0, 163, 255, 0.2)";
        context.fillRect(tileX, tileY, tileSize, tileSize);
        context.strokeStyle = palette.cyan;
        context.lineWidth = 2;
        context.strokeRect(tileX, tileY, tileSize, tileSize);

        const labels = ["P²˒²", "P²˒¹", "P¹˒¹", "P¹˒⁰"];
        labels.forEach((label, index) => {
            const angle = phase * 0.35 + index * Math.PI / 2;
            const orbit = tileSize * 1.35;
            const x = tileX + tileSize / 2 + Math.cos(angle) * orbit;
            const y = tileY + tileSize / 2 + Math.sin(angle) * orbit;
            context.beginPath();
            context.arc(x, y, 18, 0, Math.PI * 2);
            context.fillStyle = index === 0 ? palette.cyan : "rgba(255, 92, 0, 0.13)";
            context.fill();
            context.strokeStyle = index === 0 ? palette.ink : palette.amber;
            context.lineWidth = 1;
            context.stroke();
            context.fillStyle = index === 0 ? "#fffaf4" : palette.ink;
            context.font = "10px JetBrains Mono, monospace";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(label, x, y);

            drawCurve(
                tileX + tileSize / 2,
                tileY + tileSize / 2,
                x,
                y,
                index === 0 ? 0.8 : 0.38,
                index === 0 ? "rgba(0, 163, 255, ALPHA)" : "rgba(255, 92, 0, ALPHA)",
                0
            );
        });

        context.fillStyle = palette.ink;
        context.font = "10px JetBrains Mono, monospace";
        context.textAlign = "center";
        context.textBaseline = "alphabetic";
        context.fillText(layout.compact ? "ONE REFERENCE TILE" : "ONE MATERIALIZED REFERENCE", width / 2, matrix.y + matrix.size + 22);
    };

    const draw = (time) => {
        if (!width || !height) {
            return;
        }

        context.clearRect(0, 0, width, height);
        const layout = getLayout();
        selectedRow = clamp(selectedRow, 0, layout.count - 1);
        drawSequenceLabels(layout);

        if (mode === "stream") {
            drawStream(paused ? pauseTime : time, layout);
        } else if (mode === "adjoint") {
            drawAdjoint(paused ? pauseTime : time, layout);
        } else {
            drawTransport(paused ? pauseTime : time, layout);
        }

        if (status) {
            status.textContent = `Query ${String(selectedRow + 1).padStart(2, "0")} · ${modes[mode].status}`;
        }
    };

    const animate = (time) => {
        draw(time - startTime);
        frameId = window.requestAnimationFrame(animate);
    };

    const selectMode = (nextMode) => {
        mode = nextMode;
        modeButtons.forEach((button) => {
            button.setAttribute("aria-pressed", String(button.dataset.mode === mode));
        });
        if (description) {
            description.textContent = modes[mode].description;
        }
        draw(performance.now() - startTime);
    };

    modeButtons.forEach((button) => {
        button.addEventListener("click", () => selectMode(button.dataset.mode));
    });

    speedButton?.addEventListener("click", () => {
        speedIndex = (speedIndex + 1) % speedStates.length;
        speedButton.textContent = speedStates[speedIndex].label;
        speedButton.setAttribute("aria-pressed", String(speedIndex > 0));
    });

    pauseButton?.addEventListener("click", () => {
        paused = !paused;
        if (paused) {
            pauseTime = performance.now() - startTime;
        } else {
            startTime = performance.now() - pauseTime;
        }
        pauseButton.textContent = paused ? "Resume" : "Pause";
        pauseButton.setAttribute("aria-pressed", String(paused));
        draw(paused ? pauseTime : performance.now() - startTime);
    });

    const updateSelectedRow = (event) => {
        if (mode !== "transport") {
            return;
        }
        pointerInside = true;
        const rect = canvas.getBoundingClientRect();
        const layout = getLayout();
        const pointerY = event.clientY - rect.top;
        const normalized = (pointerY - layout.top) / Math.max(1, layout.bottom - layout.top);
        selectedRow = Math.round(clamp(normalized, 0, 1) * (layout.count - 1));
        draw(performance.now() - startTime);
    };

    canvas.addEventListener("pointermove", updateSelectedRow, { passive: true });
    canvas.addEventListener("pointerdown", updateSelectedRow, { passive: true });
    canvas.addEventListener("pointerleave", () => {
        pointerInside = false;
    }, { passive: true });

    document.addEventListener("visibilitychange", () => {
        if (document.hidden && frameId) {
            window.cancelAnimationFrame(frameId);
            frameId = null;
        } else if (!document.hidden && !frameId) {
            frameId = window.requestAnimationFrame(animate);
        }
    });

    if ("ResizeObserver" in window) {
        const resizeObserver = new ResizeObserver(setCanvasSize);
        resizeObserver.observe(canvas);
    } else {
        window.addEventListener("resize", setCanvasSize, { passive: true });
    }

    speedButton.textContent = speedStates[speedIndex].label;
    if (paused && pauseButton) {
        pauseButton.textContent = "Resume";
        pauseButton.setAttribute("aria-pressed", "true");
    }
    setCanvasSize();
    frameId = window.requestAnimationFrame(animate);
})();
