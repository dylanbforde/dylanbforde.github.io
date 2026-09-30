(() => {
    const stage = document.querySelector("[data-project-stage]");
    const canvas = document.querySelector("[data-project-canvas]");
    if (!stage || !canvas) return;

    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const controls = [...stage.querySelectorAll("[data-project-mode]")];
    const focusControls = [...stage.querySelectorAll("[data-project-focus]")];
    const pauseButton = stage.querySelector("[data-project-pause]");
    const fields = {
        kicker: stage.querySelector("[data-project-kicker]"),
        description: stage.querySelector("[data-project-description]"),
        input: stage.querySelector("[data-project-input]"),
        core: stage.querySelector("[data-project-core]"),
        output: stage.querySelector("[data-project-output]"),
        link: stage.querySelector("[data-project-link]")
    };

    const projects = {
        vaccine: {
            page: "projects/vaccine-design.html",
            kicker: "Graph AI / precision oncology",
            description: "Mutations become candidate peptides, graph representations, binding estimates, and a ranked shortlist.",
            stats: ["TCGA variants", "peptide graph", "ranked candidates"],
            nodes: [[.08,.52,"Variants","missense · indel"],[.26,.36,"Sequence","UniProt / Ensembl"],[.26,.67,"9-mers","mutant windows"],[.49,.51,"Peptide graph","biophysical nodes"],[.7,.36,"GNN score","MHC binding"],[.7,.67,"Sinkhorn","motif alignment"],[.91,.51,"Rank","candidate report"]],
            edges: [[0,1],[0,2],[1,3],[2,3],[3,4],[3,5],[4,6],[5,6]]
        },
        forde: {
            page: "projects/forde-vision-language.html",
            kicker: "Adaptive networks / vision–language",
            description: "A fast gradient loop feeds a slower Sense → Cluster → Smooth → Actuate reorganization loop.",
            stats: ["image + text", "dual-loop routing", "brain map"],
            nodes: [[.08,.5,"Image + text","paired samples"],[.29,.5,"Dual encoder","fast loop"],[.51,.31,"Sense","activation history"],[.68,.31,"Cluster","functional groups"],[.82,.5,"Smooth","stable map"],[.68,.69,"Actuate","route update"],[.51,.69,"State","cached brain map"]],
            edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,1]]
        },
        shift: {
            page: "projects/domain-shift-rl.html",
            kicker: "Deep reinforcement learning / robustness",
            description: "Behaviour across controlled environment changes trains a meta-model of policy suitability.",
            stats: ["source policy", "shift meta-model", "suitability estimate"],
            nodes: [[.08,.48,"Policy","source domain"],[.29,.31,"Shift A","dynamics"],[.29,.66,"Shift B","observations"],[.51,.31,"Rollout","behaviour trace"],[.51,.66,"Rollout","return + state"],[.73,.48,"Meta-model","shift magnitude"],[.92,.48,"Estimate","policy fit"]],
            edges: [[0,1],[0,2],[1,3],[2,4],[3,5],[4,5],[5,6]]
        },
        cardiac: {
            page: "projects/cardiac-mri.html",
            kicker: "Volumetric vision / segmentation",
            description: "Overlapping 3D patches move through a hierarchical encoder and return as a voxel-level mask.",
            stats: ["MRI volume", "3D MixTransformer", "anatomy mask"],
            nodes: [[.08,.5,"MRI volume","stacked slices"],[.28,.5,"3D patches","overlapping tokens"],[.48,.26,"Stage 1","fine detail"],[.57,.42,"Stage 2","local context"],[.66,.58,"Stage 3","global context"],[.75,.72,"Stage 4","semantic features"],[.91,.5,"Decoder","voxel mask"]],
            edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[2,6],[3,6],[4,6],[5,6]]
        },
        mrnet: {
            page: "projects/mrnet-classification.html",
            kicker: "Medical imaging / study classification",
            description: "Slice representations preserve local evidence before attention aggregates a decision across the scan.",
            stats: ["MRI slices", "slice attention", "study prediction"],
            nodes: [[.08,.27,"Slice 01","patch tokens"],[.08,.5,"Slice 02","patch tokens"],[.08,.73,"Slice 03","patch tokens"],[.34,.27,"Encoder","local evidence"],[.34,.5,"Encoder","local evidence"],[.34,.73,"Encoder","local evidence"],[.65,.5,"Attention","across slices"],[.9,.5,"Classifier","study label"]],
            edges: [[0,3],[1,4],[2,5],[3,6],[4,6],[5,6],[6,7]]
        },
        luad: {
            page: "projects/luad-modeling.html",
            kicker: "Computational biology / survival modeling",
            description: "Molecular and clinical data converge on risk stratification, rule-based recommendations, and a report.",
            stats: ["TCGA-LUAD", "Cox + rules", "risk report"],
            nodes: [[.07,.34,"Expression","gene matrix"],[.07,.68,"Clinical","outcomes"],[.29,.34,"Cox screen","survival signal"],[.49,.34,"Lasso-Cox","risk signature"],[.29,.68,"Biomarkers","clinical rules"],[.7,.5,"Risk + rules","combined view"],[.91,.5,"Report","research output"]],
            edges: [[0,2],[1,2],[2,3],[1,4],[3,5],[4,5],[5,6]]
        },
        nix: {
            page: "projects/nixos-system.html",
            kicker: "Developer systems / reproducibility",
            description: "Pinned inputs compose hosts and modules while encrypted secrets and checks guard activation.",
            stats: ["flake inputs", "module graph", "reproducible host"],
            nodes: [[.07,.5,"Inputs","pinned revisions"],[.28,.28,"Hosts","machine intent"],[.28,.69,"Home","user intent"],[.5,.28,"Modules","reusable config"],[.5,.69,"sops-nix","encrypted secrets"],[.72,.5,"Checks","eval + leak scan"],[.92,.5,"System","atomic activation"]],
            edges: [[0,1],[0,2],[1,3],[2,3],[2,4],[3,5],[4,5],[5,6]]
        }
    };

    let mode = stage.dataset.projectStage || "vaccine";
    let focus = "all";
    let width = 0;
    let height = 0;
    let paused = reduceMotion;
    let hoverIndex = -1;
    let pointer = null;
    let motion;

    const resize = () => {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = rect.width;
        height = rect.height;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        motion?.redraw();
    };

    const layoutNode = (node, index) => {
        const compact = width < 700;
        const top = 36;
        const bottom = 36;
        if (compact) {
            const nodeCount = projects[mode].nodes.length;
            const rows = Math.ceil(nodeCount / 2);
            const isUnpairedLast = nodeCount % 2 === 1 && index === nodeCount - 1;
            const column = index % 2;
            const row = Math.floor(index / 2);
            const xRatio = isUnpairedLast ? .5 : (column === 0 ? .24 : .76);
            const yRatio = (row + .5) / rows;
            return { x: 34 + xRatio * (width - 68), y: top + yRatio * (height - top - bottom) };
        }
        return { x: 34 + node[0] * (width - 68), y: top + node[1] * (height - top - bottom) };
    };

    const roundedRect = (x, y, w, h, r) => {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
    };

    const drawArrow = (a, b, active, time, edgeIndex) => {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy) || 1;
        const ux = dx / distance;
        const uy = dy / distance;
        const start = { x: a.x + ux * 54, y: a.y + uy * 28 };
        const end = { x: b.x - ux * 56, y: b.y - uy * 28 };
        ctx.strokeStyle = active ? "rgba(91,119,177,.62)" : "rgba(63,57,73,.1)";
        ctx.lineWidth = active ? 2 : 1.2;
        ctx.setLineDash(active ? [] : [4, 5]);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.setLineDash([]);

        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        ctx.fillStyle = active ? "rgba(91,119,177,.78)" : "rgba(63,57,73,.28)";
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - 8 * Math.cos(angle - .45), end.y - 8 * Math.sin(angle - .45));
        ctx.lineTo(end.x - 8 * Math.cos(angle + .45), end.y - 8 * Math.sin(angle + .45));
        ctx.closePath();
        ctx.fill();

        {
            const progress = ((time * .00016 + edgeIndex * .17) % 1);
            const px = start.x + (end.x - start.x) * progress;
            const py = start.y + (end.y - start.y) * progress;
            ctx.fillStyle = active ? "#c37e87" : "rgba(91,119,177,.72)";
            ctx.beginPath();
            ctx.arc(px, py, active ? 4 : 3, 0, Math.PI * 2);
            ctx.fill();
        }
    };

    const drawNode = (node, index, position, active) => {
        const compact = width < 700;
        const w = compact ? 104 : 122;
        const h = compact ? 50 : 58;
        const hovered = index === hoverIndex;
        const x = Math.max(8, Math.min(width - w - 8, position.x - w / 2));
        const y = position.y - h / 2;
        ctx.shadowColor = hovered ? "rgba(91,119,177,.22)" : "rgba(63,57,73,.08)";
        ctx.shadowBlur = hovered ? 20 : 8;
        ctx.shadowOffsetY = 3;
        roundedRect(x, y, w, h, 12);
        ctx.fillStyle = hovered ? "rgba(91,119,177,.96)" : (active ? "rgba(249,247,244,.97)" : "rgba(249,247,244,.58)");
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.strokeStyle = hovered ? "rgba(91,119,177,1)" : (active ? "rgba(63,57,73,.18)" : "rgba(63,57,73,.08)");
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.textAlign = "center";
        ctx.fillStyle = hovered ? "#f9f7f4" : (active ? "#3f3949" : "rgba(63,57,73,.35)");
        ctx.font = `600 ${compact ? 10 : 11}px Helvetica, Arial, sans-serif`;
        ctx.fillText(node[2], x + w / 2, y + 21);
        ctx.fillStyle = hovered ? "rgba(249,247,244,.76)" : (active ? "rgba(96,89,105,.76)" : "rgba(96,89,105,.3)");
        ctx.font = `${compact ? 8 : 9}px Consolas, monospace`;
        ctx.fillText(node[3], x + w / 2, y + 38);
    };

    function draw(time) {
        if (!width || !height) return;
        ctx.clearRect(0, 0, width, height);
        const project = projects[mode];
        const positions = project.nodes.map(layoutNode);
        const incoming = new Set(project.edges.map((edge) => edge[1]));
        const outgoing = new Set(project.edges.map((edge) => edge[0]));
        const activeIndices = new Set(project.nodes.map((_, index) => index).filter((index) => {
            if (focus === "input") return !incoming.has(index);
            if (focus === "output") return !outgoing.has(index);
            if (focus === "core") return incoming.has(index) && outgoing.has(index);
            return true;
        }));
        project.edges.forEach((edge, index) => {
            const active = hoverIndex >= 0 ? edge.includes(hoverIndex) : (focus === "all" || activeIndices.has(edge[0]) || activeIndices.has(edge[1]));
            drawArrow(positions[edge[0]], positions[edge[1]], active, time, index);
        });
        project.nodes.forEach((node, index) => drawNode(node, index, positions[index], focus === "all" || activeIndices.has(index)));

        if (pointer && hoverIndex >= 0) {
            ctx.fillStyle = "rgba(195,126,135,.08)";
            ctx.beginPath();
            ctx.arc(pointer.x, pointer.y, 34, 0, Math.PI * 2);
            ctx.fill();
        }
    }


    const setMode = (nextMode) => {
        if (!projects[nextMode]) return;
        mode = nextMode;
        hoverIndex = -1;
        const project = projects[mode];
        controls.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.projectMode === mode)));
        fields.kicker.textContent = project.kicker;
        fields.description.textContent = project.description;
        fields.input.textContent = project.stats[0];
        fields.core.textContent = project.stats[1];
        fields.output.textContent = project.stats[2];
        if (fields.link) fields.link.href = project.page;
        motion?.redraw();
    };

    controls.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.projectMode)));
    focusControls.forEach((button) => button.addEventListener("click", () => {
        focus = button.dataset.projectFocus;
        focusControls.forEach((current) => current.setAttribute("aria-pressed", String(current === button)));
        motion?.redraw();
    }));
    pauseButton?.addEventListener("click", () => motion.setPaused(!paused));

    canvas.addEventListener("pointermove", (event) => {
        const rect = canvas.getBoundingClientRect();
        pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        const positions = projects[mode].nodes.map(layoutNode);
        let nearest = -1;
        let minDistance = 70;
        positions.forEach((position, index) => {
            const distance = Math.hypot(pointer.x - position.x, pointer.y - position.y);
            if (distance < minDistance) { minDistance = distance; nearest = index; }
        });
        if (nearest !== hoverIndex) { hoverIndex = nearest; motion?.redraw(); }
    });
    canvas.addEventListener("pointerleave", () => { pointer = null; hoverIndex = -1; motion?.redraw(); });

    motion = createFigureMotion({ element: stage, render: draw, paused, onPauseChange: value => {
        paused = value;
        if (pauseButton) { pauseButton.setAttribute("aria-pressed", String(value)); pauseButton.textContent = value ? "Resume motion" : "Pause motion"; }
    } });
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    setMode(mode);
    resize();

})();
