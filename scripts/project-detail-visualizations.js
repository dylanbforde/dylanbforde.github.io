(() => {
    const stage = document.querySelector(".project-detail-stage[data-project-stage]");
    const canvas = stage?.querySelector("[data-project-canvas]");
    if (!stage || !canvas) return;

    const ctx = canvas.getContext("2d");
    const mode = stage.dataset.projectStage;
    const pauseButton = stage.querySelector("[data-project-pause]");
    const focusButtons = [...stage.querySelectorAll("[data-project-focus]")];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const details = {
        vaccine: ["Graph AI / precision oncology", "A mutation is localized in sequence, expanded into peptide candidates, represented structurally, and ranked.", "TCGA variants", "peptide graph", "ranked candidates"],
        forde: ["Adaptive networks / vision–language", "Route density emerges inside the neural layer while a slower loop senses and reorganizes functional pathways.", "image + text", "adaptive layer", "brain map"],
        shift: ["Deep reinforcement learning / robustness", "A cart-pole policy is observed across controlled dynamics shifts before a meta-model estimates its suitability.", "source policy", "shift probe", "suitability estimate"],
        cardiac: ["Volumetric vision / segmentation", "A scanning plane passes through a cardiac volume while hierarchical features reconstruct an anatomy mask.", "MRI volume", "3D hierarchy", "anatomy mask"],
        mrnet: ["Medical imaging / study classification", "A stack of MRI slices retains local evidence before learned attention forms a study-level decision.", "MRI slices", "slice attention", "study prediction"],
        luad: ["Computational biology / survival modeling", "A regulatory network and clinical cohort produce a sparse signature, separated survival curves, and a report.", "TCGA-LUAD", "Cox + network", "risk report"],
        nix: ["Developer systems / reproducibility", "A flake evaluates a configuration tree, decrypts runtime secrets, passes checks, and creates a new generation.", "flake inputs", "module evaluation", "atomic generation"]
    };

    const copy = details[mode];
    stage.querySelector("[data-project-kicker]").textContent = copy[0];
    stage.querySelector("[data-project-description]").textContent = copy[1];
    stage.querySelector("[data-project-input]").textContent = copy[2];
    stage.querySelector("[data-project-core]").textContent = copy[3];
    stage.querySelector("[data-project-output]").textContent = copy[4];

    let width = 0;
    let height = 0;
    let focus = "all";
    let paused = reduceMotion;
    let pointer = null;
    let raf = 0;
    let last = 0;

    const colors = { ink: "#2d261f", muted: "#74685d", teal: "#0f9d8d", orange: "#d9782d", paper: "#fffaf4", red: "#b95248" };
    const box = () => ({ left: width < 700 ? 24 : 56, right: width - (width < 700 ? 24 : 56), top: width < 700 ? 210 : 150, bottom: height - (width < 700 ? 120 : 88) });
    const sectionAlpha = (section) => focus === "all" || focus === section ? 1 : .18;
    const mono = (size = 9) => `${size}px 'JetBrains Mono', monospace`;
    const sans = (size = 11, weight = 600) => `${weight} ${size}px Inter, sans-serif`;

    const label = (text, x, y, options = {}) => {
        ctx.fillStyle = options.color || colors.muted;
        ctx.font = options.font || mono(width < 700 ? 8 : 9);
        ctx.textAlign = options.align || "center";
        ctx.fillText(options.upper === false ? text : text.toUpperCase(), x, y);
    };
    const dot = (x, y, r, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
    const line = (x1, y1, x2, y2, color, lineWidth = 1) => { ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    const roundRect = (x, y, w, h, r, fill, stroke) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); } };

    const drawVaccine = (time, a) => {
        const compact = width < 700;
        const span = a.right - a.left;
        const letters = "G L Y K M V A F R".split(" ");
        const seqY = a.top + 42;
        ctx.globalAlpha = sectionAlpha("input");
        label("mutant 9-mer sequence", a.left, a.top, { align: "left", color: colors.ink });
        letters.forEach((letter, i) => {
            const x = a.left + (i / 8) * span * (compact ? .92 : .42);
            roundRect(x - 14, seqY - 18, 28, 36, 8, i === 4 ? colors.orange : "rgba(255,252,246,.92)", i === 4 ? colors.orange : "rgba(45,38,31,.16)");
            label(letter, x, seqY + 4, { color: i === 4 ? colors.paper : colors.ink, font: sans(11, 700), upper: false });
        });
        label("variant", a.left + 4 * span * (compact ? .92 : .42) / 8, seqY + 35, { color: colors.orange });

        ctx.globalAlpha = sectionAlpha("core");
        const gx = compact ? (a.left + a.right) / 2 : a.left + span * .56;
        const gy = compact ? a.top + (a.bottom - a.top) * .55 : (a.top + a.bottom) / 2;
        const gr = compact ? 70 : 92;
        const amino = 9;
        const rotation = time * .00045;
        for (let i = 0; i < amino; i += 1) {
            const angle = (i / amino) * Math.PI * 2 - Math.PI / 2 + rotation;
            const x = gx + Math.cos(angle) * gr;
            const y = gy + Math.sin(angle) * gr * .62;
            const next = (i + 1) % amino;
            const na = (next / amino) * Math.PI * 2 - Math.PI / 2 + rotation;
            line(x, y, gx + Math.cos(na) * gr, gy + Math.sin(na) * gr * .62, "rgba(15,157,141,.35)", 2);
            const pulse = paused ? 0 : .5 + .5 * Math.sin(time * .003 + i);
            dot(x, y, 8 + pulse * 3, i === 4 ? colors.orange : "rgba(15,157,141,.86)");
        }
        dot(gx, gy, 25, "rgba(255,252,246,.95)"); label("GNN", gx, gy + 4, { color: colors.ink, font: sans(11, 700), upper: false });
        label("peptide graph", gx, gy + gr * .78, { color: colors.teal });

        ctx.globalAlpha = sectionAlpha("output");
        const bx = compact ? a.left : a.left + span * .78;
        const by = compact ? a.bottom - 76 : a.top + 55;
        const bw = compact ? span : span * .2;
        label("candidate ranking", bx, by - 18, { align: "left", color: colors.ink });
        [.92,.74,.58,.41].forEach((score, i) => {
            const y = by + i * 42;
            roundRect(bx, y, bw, 25, 8, "rgba(45,38,31,.06)");
            roundRect(bx, y, bw * score, 25, 8, i === 0 ? colors.orange : "rgba(15,157,141,.65)");
            label(`#${i + 1}`, bx + 10, y + 17, { align: "left", color: colors.paper, font: mono(8), upper: false });
        });
        ctx.globalAlpha = 1;
    };

    const drawForde = (time, a) => {
        const compact = width < 700;
        const span = a.right - a.left;
        const orange = "#ff5c00";
        const blue = "#00a3ff";
        const panel = "rgba(255,252,246,.94)";
        const arrow = (x1, y1, x2, y2, color, lineWidth = 1.6) => {
            line(x1, y1, x2, y2, color, lineWidth);
            const angle = Math.atan2(y2 - y1, x2 - x1);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - Math.cos(angle - .55) * 7, y2 - Math.sin(angle - .55) * 7);
            ctx.lineTo(x2 - Math.cos(angle + .55) * 7, y2 - Math.sin(angle + .55) * 7);
            ctx.closePath();
            ctx.fill();
        };
        const card = (x, y, w, h, title, subtitle, stroke = "rgba(45,38,31,.16)") => {
            roundRect(x, y, w, h, compact ? 10 : 14, panel, stroke);
            label(title, x + w / 2, y + h * .43, { color: colors.ink, font: sans(compact ? 8 : 10, 700) });
            if (subtitle) label(subtitle, x + w / 2, y + h * .7, { color: colors.muted, font: mono(compact ? 6.5 : 7.5), upper: false });
        };
        const fastY = a.top + (compact ? 30 : 28);
        const fastH = compact ? 70 : 88;
        const inputW = compact ? span * .18 : span * .16;
        const layerW = compact ? span * .38 : span * .31;
        const outputW = compact ? span * .22 : span * .2;
        const inputX = a.left;
        const layerX = a.left + span * (compact ? .27 : .28);
        const outputX = a.right - outputW;

        ctx.globalAlpha = sectionAlpha("input");
        label("FAST LOOP · EVERY TRAINING STEP", a.left, a.top, { align: "left", color: colors.ink });
        card(inputX, fastY, inputW, fastH, "IMAGE + TEXT", compact ? "paired batch" : "paired contrastive batch", "rgba(0,163,255,.34)");
        arrow(inputX + inputW, fastY + fastH / 2, layerX - 7, fastY + fastH / 2, "rgba(0,163,255,.62)");

        ctx.globalAlpha = sectionAlpha("core");
        card(layerX, fastY, layerW, fastH, "STATEFUL LAYER", compact ? "routed neurons" : "attention → routed neurons", "rgba(255,92,0,.42)");
        const neuronY = fastY + fastH * .77;
        const neuronCount = compact ? 5 : 7;
        for (let i = 0; i < neuronCount; i += 1) {
            const nx = layerX + layerW * (i + 1) / (neuronCount + 1);
            dot(nx, neuronY, compact ? 3.2 : 4.2, i % 3 === 2 ? orange : blue);
        }
        arrow(layerX + layerW, fastY + fastH / 2, outputX - 7, fastY + fastH / 2, "rgba(45,38,31,.32)");

        ctx.globalAlpha = sectionAlpha("output");
        card(outputX, fastY, outputW, fastH, "EMBEDDINGS", compact ? "loss" : "shared space + loss", "rgba(0,163,255,.34)");

        const slowLabelY = fastY + fastH + (compact ? 56 : 72);
        const slowY = slowLabelY + (compact ? 16 : 22);
        const slowGap = compact ? 5 : 12;
        const mapW = compact ? span * .2 : span * .19;
        const slowSpan = span - mapW - (compact ? 16 : 34);
        const slowW = (slowSpan - slowGap * 3) / 4;
        const slowH = compact ? 48 : 62;
        const slowNames = ["SENSE", "CLUSTER", "SMOOTH", "ACTUATE"];

        ctx.globalAlpha = sectionAlpha("core");
        label("SLOW LOOP · EVERY N STEPS", a.left, slowLabelY, { align: "left", color: orange });
        slowNames.forEach((name, i) => {
            const x = a.left + i * (slowW + slowGap);
            card(x, slowY, slowW, slowH, name, compact ? "" : ["statistics", "neuron types", "stable areas", "write state"][i], i === 3 ? "rgba(255,92,0,.45)" : "rgba(45,38,31,.15)");
            if (i < slowNames.length - 1) arrow(x + slowW, slowY + slowH / 2, x + slowW + slowGap - 2, slowY + slowH / 2, "rgba(45,38,31,.28)", 1.2);
        });

        const statStartX = layerX + layerW * .5;
        const statStartY = fastY + fastH;
        ctx.strokeStyle = "rgba(45,38,31,.26)";
        ctx.lineWidth = 1.3;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.moveTo(statStartX, statStartY);
        ctx.lineTo(statStartX, slowLabelY - 8);
        ctx.lineTo(a.left + slowW * .5, slowLabelY - 8);
        ctx.lineTo(a.left + slowW * .5, slowY - 4);
        ctx.stroke();
        ctx.setLineDash([]);
        label(compact ? "STATS" : "GRADIENT + ACTIVATION HISTORY", statStartX, slowLabelY - 13, { color: colors.muted, font: mono(compact ? 6.5 : 7.5) });

        ctx.globalAlpha = sectionAlpha("output");
        const mapX = a.right - mapW;
        const mapY = slowY;
        card(mapX, mapY, mapW, slowH, "BRAIN MAP", "assignments", "rgba(0,163,255,.42)");
        const gridSize = compact ? 3 : 4;
        const cell = compact ? 5 : 7;
        const gridX = mapX + mapW / 2 - (gridSize * cell) / 2;
        const gridY = mapY + slowH * .72 - (gridSize * cell) / 2;
        for (let row = 0; row < gridSize; row += 1) for (let col = 0; col < gridSize; col += 1) {
            ctx.fillStyle = (row + col * 2) % 3 === 0 ? orange : blue;
            ctx.globalAlpha = sectionAlpha("output") * (.45 + ((row + col) % 3) * .2);
            ctx.fillRect(gridX + col * cell, gridY + row * cell, cell - 1, cell - 1);
        }
        ctx.globalAlpha = sectionAlpha("output");
        arrow(a.left + slowSpan, slowY + slowH / 2, mapX - 5, slowY + slowH / 2, "rgba(255,92,0,.62)");

        const returnY = Math.min(a.bottom - 14, slowY + slowH + (compact ? 54 : 68));
        ctx.strokeStyle = "rgba(0,163,255,.72)";
        ctx.lineWidth = 2;
        const returnStart = { x: mapX + mapW / 2, y: mapY + slowH };
        const returnControlA = { x: returnStart.x, y: returnY };
        const returnEnd = { x: layerX + layerW / 2, y: fastY + fastH + 5 };
        const returnControlB = { x: returnEnd.x, y: returnY };
        ctx.beginPath();
        ctx.moveTo(returnStart.x, returnStart.y);
        ctx.bezierCurveTo(returnControlA.x, returnControlA.y, returnControlB.x, returnControlB.y, returnEnd.x, returnEnd.y);
        ctx.stroke();
        ctx.fillStyle = blue;
        ctx.beginPath();
        ctx.moveTo(returnEnd.x, returnEnd.y);
        ctx.lineTo(returnEnd.x - 5, returnEnd.y + 8);
        ctx.lineTo(returnEnd.x + 5, returnEnd.y + 8);
        ctx.closePath();
        ctx.fill();
        const pulse = paused ? .5 : (time * .00022) % 1;
        const inversePulse = 1 - pulse;
        const pulseX = inversePulse ** 3 * returnStart.x + 3 * inversePulse ** 2 * pulse * returnControlA.x + 3 * inversePulse * pulse ** 2 * returnControlB.x + pulse ** 3 * returnEnd.x;
        const pulseY = inversePulse ** 3 * returnStart.y + 3 * inversePulse ** 2 * pulse * returnControlA.y + 3 * inversePulse * pulse ** 2 * returnControlB.y + pulse ** 3 * returnEnd.y;
        dot(pulseX, pulseY, compact ? 3.5 : 4.5, blue);
        label("NEW ASSIGNMENTS ROUTE THE NEXT FAST STEPS", (returnStart.x + returnEnd.x) / 2, returnY + (compact ? 17 : 20), { color: blue, font: mono(compact ? 6.2 : 7.5) });
        ctx.globalAlpha = 1;
    };

    const drawShift = (time, a) => {
        const span = a.right - a.left;
        const centerX = a.left + span * .42;
        const groundY = a.bottom - 34;
        const shift = paused ? .22 : Math.sin(time * .0014) * .2;
        ctx.globalAlpha = sectionAlpha("input");
        line(a.left, groundY, a.right, groundY, "rgba(45,38,31,.26)", 2);
        for(let i=0;i<18;i+=1) line(a.left+i*span/18,groundY,a.left+i*span/18+8,groundY+8,"rgba(45,38,31,.1)");
        ctx.globalAlpha = sectionAlpha("core");
        roundRect(centerX-52,groundY-28,104,28,7,"rgba(15,157,141,.88)"); dot(centerX-34,groundY+3,10,colors.ink); dot(centerX+34,groundY+3,10,colors.ink);
        const poleLength = Math.min(190,(a.bottom-a.top)*.62);
        const angle = -.18 + shift + (pointer ? (pointer.x-width/2)/width*.35 : 0);
        const px = centerX + Math.sin(angle)*poleLength;
        const py = groundY-28-Math.cos(angle)*poleLength;
        line(centerX,groundY-28,px,py,colors.orange,5); dot(centerX,groundY-28,8,colors.ink); dot(px,py,11,colors.orange);
        label("controlled dynamics shift", centerX, a.top+10, {color:colors.orange});
        ctx.globalAlpha = sectionAlpha("output");
        const gaugeX = a.left + span * .82, gaugeY = a.top + (a.bottom-a.top)*.47;
        ctx.strokeStyle="rgba(45,38,31,.15)";ctx.lineWidth=14;ctx.beginPath();ctx.arc(gaugeX,gaugeY,Math.min(70,span*.11),Math.PI*.75,Math.PI*2.25);ctx.stroke();
        ctx.strokeStyle=colors.teal;ctx.beginPath();ctx.arc(gaugeX,gaugeY,Math.min(70,span*.11),Math.PI*.75,Math.PI*(1.15 + (.5+.5*Math.cos(angle*3))*.85));ctx.stroke();
        label("POLICY",gaugeX,gaugeY-3,{color:colors.ink});label("SUITABILITY",gaugeX,gaugeY+15,{color:colors.teal});
        ctx.globalAlpha=1;
    };

    const drawCardiac = (time, a) => {
        const compact=width<700,narrow=width<470,span=a.right-a.left,blue="#00a3ff",orange="#ff5c00";
        const scan=(time*.00034)%1,activeSlice=Math.min(4,Math.floor(scan*5));
        const arrow=(x1,y1,x2,y2,color)=>{line(x1,y1,x2,y2,color,1.5);const angle=Math.atan2(y2-y1,x2-x1);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-Math.cos(angle-.55)*7,y2-Math.sin(angle-.55)*7);ctx.lineTo(x2-Math.cos(angle+.55)*7,y2-Math.sin(angle+.55)*7);ctx.closePath();ctx.fill();};
        const anatomy=(cx,cy,scale,animated=false)=>{
            ctx.fillStyle="rgba(45,38,31,.035)";ctx.strokeStyle="rgba(45,38,31,.22)";ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(cx,cy,scale*.7,scale*.54,-.08,0,Math.PI*2);ctx.fill();ctx.stroke();
            ctx.fillStyle="rgba(0,163,255,.12)";ctx.strokeStyle=blue;ctx.lineWidth=Math.max(2,scale*.055);ctx.beginPath();ctx.ellipse(cx-scale*.08,cy,scale*.27,scale*.31,.05,0,Math.PI*2);ctx.fill();ctx.stroke();
            ctx.strokeStyle=orange;ctx.lineWidth=Math.max(3,scale*.09);if(animated){ctx.setLineDash([7,5]);ctx.lineDashOffset=-time*.018;}ctx.beginPath();ctx.ellipse(cx-scale*.08,cy,scale*.39,scale*.43,.05,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
            ctx.fillStyle="rgba(0,163,255,.17)";ctx.strokeStyle="rgba(0,163,255,.75)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx+scale*.25,cy-scale*.28);ctx.bezierCurveTo(cx+scale*.62,cy-scale*.18,cx+scale*.62,cy+scale*.24,cx+scale*.24,cy+scale*.31);ctx.bezierCurveTo(cx+scale*.42,cy+scale*.12,cx+scale*.42,cy-scale*.08,cx+scale*.25,cy-scale*.28);ctx.closePath();ctx.fill();ctx.stroke();
        };

        const volumeX=narrow?(a.left+a.right)/2:a.left+(compact?70:span*.15);
        const volumeY=narrow?a.top+62:a.top+(a.bottom-a.top)*.48;
        const volumeW=narrow?126:(compact?126:180),volumeH=narrow?72:(compact?82:112);
        ctx.globalAlpha=sectionAlpha("input");
        for(let i=4;i>=0;i--){const offset=(i-2)*(narrow?5:7),x=volumeX-volumeW/2+offset,y=volumeY-volumeH/2-offset*.65,isActive=i===activeSlice;roundRect(x,y,volumeW,volumeH,12,isActive?"rgba(0,163,255,.1)":"rgba(255,252,246,.76)",isActive?"rgba(0,163,255,.68)":"rgba(45,38,31,.15)");anatomy(x+volumeW/2,y+volumeH/2,Math.min(volumeW,volumeH)*(isActive?.54:.48));}
        const planeY=volumeY-volumeH*.5+scan*volumeH;
        line(volumeX-volumeW*.64,planeY,volumeX+volumeW*.64,planeY,"rgba(0,163,255,.82)",2);roundRect(volumeX-volumeW*.64,planeY-4,volumeW*1.28,8,4,"rgba(0,163,255,.1)");
        label("3D MRI VOLUME",volumeX,volumeY+volumeH*.72,{color:colors.ink});label(`SLICE ${String(activeSlice+1).padStart(2,"0")} / 05`,volumeX,volumeY+volumeH*.72+14,{color:blue,font:mono(compact?7:8)});

        const encoderY=narrow?a.top+214:volumeY;
        const encoderStart=narrow?a.left+34:a.left+(compact?170:span*.34);
        const encoderEnd=narrow?a.right-34:a.left+(compact?365:span*.67);
        const stageGap=(encoderEnd-encoderStart)/3;
        const stageSizes=narrow?[48,42,36,30]:(compact?[58,50,42,34]:[78,66,54,42]);
        ctx.globalAlpha=sectionAlpha("core");
        const stages=stageSizes.map((size,i)=>({x:encoderStart+i*stageGap,y:encoderY,size}));
        stages.forEach((stage,i)=>{roundRect(stage.x-stage.size/2,stage.y-stage.size/2,stage.size,stage.size,10,"rgba(255,252,246,.92)",i===3?"rgba(255,92,0,.55)":"rgba(0,163,255,.42)");const cells=i<2?4:3,cell=stage.size/(cells+2);for(let row=0;row<cells;row++)for(let col=0;col<cells;col++){ctx.fillStyle=(row+col+i)%4===0?orange:"rgba(0,163,255,.58)";ctx.fillRect(stage.x-stage.size*.3+col*cell,stage.y-stage.size*.3+row*cell,Math.max(2,cell-3),Math.max(2,cell-3));}label(`S${i+1}`,stage.x,stage.y+stage.size/2+16,{color:i===3?orange:blue,font:mono(compact?7:8)});if(i<3)arrow(stage.x+stage.size/2+4,stage.y,stages[i+1].x-stages[i+1].size/2-5,stages[i+1].y,"rgba(45,38,31,.28)");});
        label("SPATIAL DETAIL ↓   CONTEXT ↑",(encoderStart+encoderEnd)/2,encoderY-(compact?48:66),{color:colors.muted,font:mono(compact?7:8)});
        if(narrow)arrow(volumeX,volumeY+volumeH*.78,(encoderStart+encoderEnd)/2,encoderY-stageSizes[0]*.75,"rgba(45,38,31,.28)");else arrow(volumeX+volumeW*.66,volumeY,encoderStart-stageSizes[0]*.7,encoderY,"rgba(45,38,31,.28)");
        const packetProgress=(time*.00042)%1,totalSegments=stages.length-1,segment=Math.min(totalSegments-1,Math.floor(packetProgress*totalSegments)),localProgress=packetProgress*totalSegments-segment;
        const packetX=stages[segment].x+(stages[segment+1].x-stages[segment].x)*localProgress,packetY=stages[segment].y+(stages[segment+1].y-stages[segment].y)*localProgress;dot(packetX,packetY,8,"rgba(255,92,0,.14)");dot(packetX,packetY,3.5,orange);

        const maskX=narrow?(a.left+a.right)/2:a.right-(compact?50:span*.13);
        const maskY=narrow?a.top+340:volumeY;
        const maskScale=narrow?54:(compact?54:82);
        ctx.globalAlpha=sectionAlpha("output");
        if(narrow)arrow((encoderStart+encoderEnd)/2,encoderY+stageSizes[0]*.75,maskX,maskY-maskScale*.8,"rgba(255,92,0,.48)");else arrow(encoderEnd+stageSizes[3]*.7,encoderY,maskX-maskScale*.9,maskY,"rgba(255,92,0,.48)");
        roundRect(maskX-maskScale*.92,maskY-maskScale*.72,maskScale*1.84,maskScale*1.44,16,"rgba(255,252,246,.92)","rgba(255,92,0,.3)");anatomy(maskX,maskY,maskScale,true);
        label("VOXEL MASK",maskX,maskY+maskScale*.95,{color:orange});
        const legendY=maskY+maskScale*1.2;dot(maskX-maskScale*.48,legendY,3.5,blue);label("CAVITY",maskX-maskScale*.39,legendY+3,{align:"left",color:colors.muted,font:mono(6.5)});dot(maskX+maskScale*.08,legendY,3.5,orange);label("MYOCARDIUM",maskX+maskScale*.17,legendY+3,{align:"left",color:colors.muted,font:mono(6.5)});
        ctx.globalAlpha=1;
    };

    const drawMrnet = (time,a) => {
        const compact=width<700, span=a.right-a.left, sliceW=compact?145:240, sliceH=compact?62:82;
        const sx=compact?a.left+10:a.left+span*.08, sy=a.top+25;
        const stepX=compact?8:14, stepY=compact?30:24;
        const scan=(time*.00042)%6, activeSlice=Math.floor(scan);
        const blue="#00a3ff", orange="#ff5c00";
        ctx.globalAlpha=sectionAlpha("input");
        for(let i=5;i>=0;i--){
            const x=sx+i*stepX,y=sy+i*stepY,isActive=i===activeSlice;
            roundRect(x,y,sliceW,sliceH,12,isActive?"rgba(0,163,255,.11)":"rgba(45,38,31,.035)",isActive?"rgba(0,163,255,.72)":"rgba(45,38,31,.18)");
            ctx.lineWidth=isActive?2:1;
            ctx.strokeStyle=isActive?"rgba(0,163,255,.68)":"rgba(45,38,31,.16)";
            ctx.beginPath();ctx.ellipse(x+sliceW*.5,y+sliceH*.5,sliceW*.28,sliceH*.31,0,0,Math.PI*2);ctx.stroke();
            if(i===2){const lesionPulse=1+.22*Math.sin(time*.006);dot(x+sliceW*.62,y+sliceH*.43,8*lesionPulse,"rgba(255,92,0,.78)");}
        }
        const scanY=sy+scan*stepY+sliceH*.5;
        line(sx-4,scanY,sx+sliceW+stepX*5+4,scanY,"rgba(0,163,255,.78)",2);
        roundRect(sx-4,scanY-5,sliceW+stepX*5+8,10,5,"rgba(0,163,255,.09)");
        label("ORDERED MRI SLICES",sx,sy-10,{align:"left",color:colors.ink});
        label(`SCAN ${String(activeSlice+1).padStart(2,"0")} / 06`,sx+sliceW+stepX*5,sy-10,{align:"right",color:blue});
        ctx.globalAlpha=sectionAlpha("core");
        const ax=compact?a.right-42:a.left+span*.62, ay=a.top+(a.bottom-a.top)*.5;
        for(let i=0;i<6;i++){
            const weight=.18+((i*37)%7)/8,activeBoost=i===activeSlice?1:0;
            const fromX=sx+i*stepX+sliceW,fromY=sy+i*stepY+sliceH*.5;
            line(fromX,fromY,ax,ay,activeBoost?"rgba(255,92,0,.78)":`rgba(0,163,255,${.1+weight*.34})`,1+weight*2+activeBoost*2);
        }
        const packetProgress=(time*.0009)%1;
        const packetStartX=sx+activeSlice*stepX+sliceW,packetStartY=sy+activeSlice*stepY+sliceH*.5;
        const packetX=packetStartX+(ax-packetStartX)*packetProgress,packetY=packetStartY+(ay-packetStartY)*packetProgress;
        dot(packetX,packetY,8,"rgba(255,92,0,.14)");dot(packetX,packetY,3.5,orange);
        const attentionPulse=(compact?28:42)+(2+2*Math.sin(time*.004));
        dot(ax,ay,attentionPulse,"rgba(0,163,255,.88)");label("Σ",ax,ay+6,{color:colors.paper,font:sans(18,700),upper:false});label("SLICE ATTENTION",ax,ay+(compact?48:66),{color:blue});
        ctx.globalAlpha=sectionAlpha("output");
        const bx=compact?a.left:a.left+span*.78, by=compact?a.bottom-33:ay-28, bw=compact?span:span*.2;
        const confidence=.76+.1*(.5+.5*Math.sin(time*.0016));
        roundRect(bx,by,bw,56,14,"rgba(255,252,246,.92)","rgba(255,92,0,.38)");
        label("STUDY PREDICTION",bx+bw/2,by+18,{color:colors.ink});
        label(`ATTENTION ${Math.round(confidence*100)}%`,bx+bw/2,by+34,{color:orange,font:mono(compact?7:8)});
        roundRect(bx+12,by+42,bw-24,6,3,"rgba(45,38,31,.08)");roundRect(bx+12,by+42,(bw-24)*confidence,6,3,orange);
        ctx.globalAlpha=1;
    };

    const drawLuad = (time,a) => {
        const compact=width<700, span=a.right-a.left, mid=compact?a.top+(a.bottom-a.top)*.48:a.left+span*.43;
        const blue="#00a3ff",orange="#ff5c00";
        const genePhase=(time*.0011)%10,activeGene=Math.floor(genePhase);
        const trace=(time*.0002)%1;
        ctx.globalAlpha=sectionAlpha("input");
        const nx=compact?(a.left+a.right)/2:a.left+span*.2, ny=compact?a.top+80:a.top+(a.bottom-a.top)*.48;
        const genes=Array.from({length:10},(_,i)=>{const ang=i/10*Math.PI*2;return{x:nx+Math.cos(ang)*(compact?72:110),y:ny+Math.sin(ang)*(compact?48:85)}});
        const geneEdges=[];
        genes.forEach((g,i)=>{genes.forEach((h,j)=>{if(j>i&&(i*3+j)%7===0){geneEdges.push([g,h]);line(g.x,g.y,h.x,h.y,"rgba(45,38,31,.13)");}});const active=i===activeGene;dot(g.x,g.y,(i%3===0?7:4)+(active?3:0),active?orange:(i%3===0?"rgba(255,92,0,.74)":"rgba(0,163,255,.68)"));});
        const activeEdge=geneEdges[Math.floor((time*.00065)%geneEdges.length)];
        if(activeEdge){const edgeProgress=(time*.00105)%1,ex=activeEdge[0].x+(activeEdge[1].x-activeEdge[0].x)*edgeProgress,ey=activeEdge[0].y+(activeEdge[1].y-activeEdge[0].y)*edgeProgress;dot(ex,ey,7,"rgba(0,163,255,.14)");dot(ex,ey,3.2,blue);}
        const signaturePulse=12+3*(.5+.5*Math.sin(time*.004));
        dot(nx,ny,signaturePulse,"rgba(0,163,255,.9)");label("SPARSE SIGNATURE",nx,ny+(compact?78:118),{color:blue});
        ctx.globalAlpha=sectionAlpha("core");
        const gx=compact?a.left:a.left+span*.52, gy=compact?a.top+(a.bottom-a.top)*.58:a.top+25, gw=compact?span:span*.45, gh=compact?(a.bottom-a.top)*.38:(a.bottom-a.top)*.72;
        const bridgeStartX=compact?nx: nx+110,bridgeStartY=compact?ny+62:ny;
        const bridgeEndX=gx,bridgeEndY=gy+gh*.12;
        line(bridgeStartX,bridgeStartY,bridgeEndX,bridgeEndY,"rgba(0,163,255,.24)",1.5);
        const bridgeProgress=(time*.00055)%1;
        const bridgeX=bridgeStartX+(bridgeEndX-bridgeStartX)*bridgeProgress,bridgeY=bridgeStartY+(bridgeEndY-bridgeStartY)*bridgeProgress;
        dot(bridgeX,bridgeY,8,"rgba(255,92,0,.14)");dot(bridgeX,bridgeY,3.5,orange);
        line(gx,gy,gx,gy+gh,"rgba(45,38,31,.25)");line(gx,gy+gh,gx+gw,gy+gh,"rgba(45,38,31,.25)");
        const survivalY=(fraction,risk)=>gy+gh*(1-Math.exp(-fraction*(risk?1.65:.72)));
        const curve=(risk,progress,color,lineWidth)=>{ctx.beginPath();const steps=Math.max(1,Math.floor(50*progress));for(let i=0;i<=steps;i++){const fraction=i/50,x=gx+fraction*gw,y=survivalY(fraction,risk);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.stroke();};
        curve(false,1,"rgba(0,163,255,.12)",2);curve(true,1,"rgba(255,92,0,.12)",2);
        curve(false,trace,blue,3);curve(true,trace,orange,3);
        const cursorX=gx+trace*gw,lowY=survivalY(trace,false),highY=survivalY(trace,true);
        line(cursorX,gy,cursorX,gy+gh,"rgba(45,38,31,.12)",1);
        dot(cursorX,lowY,5,blue);dot(cursorX,highY,5,orange);
        label("MODEL TIME",cursorX,gy-10,{color:colors.muted,font:mono(compact?7:8)});
        label("LOW RISK",gx+gw*.74,gy+gh*.42,{color:blue});label("HIGH RISK",gx+gw*.74,gy+gh*.72,{color:orange});label("TIME",gx+gw,gy+gh+20,{align:"right"});
        ctx.globalAlpha=sectionAlpha("output");
        if(!compact){const reportX=a.left+span*.82,reportW=span*.16;roundRect(reportX,a.bottom-62,reportW,44,10,"rgba(255,252,246,.9)","rgba(255,92,0,.3)");label("RISK REPORT",reportX+reportW/2,a.bottom-42,{color:colors.ink});label(`TRACE ${Math.round(trace*100)}%`,reportX+reportW/2,a.bottom-27,{color:orange,font:mono(8)});}
        ctx.globalAlpha=1;
    };

    const drawNix = (time,a) => {
        const compact=width<700, span=a.right-a.left;
        const tx=a.left,ty=a.top+8,tw=span,th=a.bottom-a.top-16;
        roundRect(tx,ty,tw,th,14,"rgba(34,31,28,.96)","rgba(45,38,31,.25)");
        [colors.red,colors.orange,colors.teal].forEach((c,i)=>dot(tx+18+i*18,ty+18,5,c));
        ctx.globalAlpha=sectionAlpha("input");
        label("flake.nix",tx+16,ty+48,{align:"left",color:"rgba(255,250,244,.62)",upper:false});
        const tree=["inputs","├─ hosts","│  └─ nixos-laptop","├─ modules","│  ├─ desktop","│  └─ development","└─ home + sops"];
        tree.forEach((text,i)=>label(text,tx+20,ty+75+i*(compact?28:30),{align:"left",color:i===2?colors.teal:"rgba(255,250,244,.72)",upper:false,font:mono(compact?9:10)}));
        ctx.globalAlpha=sectionAlpha("core");
        const logX=compact?tx+18:tx+tw*.52, logY=compact?ty+285:ty+70;
        const logs=["evaluating module graph","decrypting runtime secrets","running flake checks","building system closure"];
        logs.forEach((text,i)=>{const done=paused?i<3:((time*.001+i*.7)%4)>i*.35;label(`${done?"✓":"·"} ${text}`,logX,logY+i*34,{align:"left",color:done?colors.teal:"rgba(255,250,244,.38)",upper:false,font:mono(compact?8:10)});});
        ctx.globalAlpha=sectionAlpha("output");
        const by=compact?a.bottom-62:ty+th-75;roundRect(logX,by,compact?tw-36:tw*.43,48,9,"rgba(15,157,141,.16)","rgba(15,157,141,.48)");label("generation 127 · ready",logX+12,by+29,{align:"left",color:colors.teal,upper:false,font:mono(compact?9:11)});
        ctx.globalAlpha=1;
    };

    const renderers = { vaccine:drawVaccine, forde:drawForde, shift:drawShift, cardiac:drawCardiac, mrnet:drawMrnet, luad:drawLuad, nix:drawNix };
    const draw = (time) => { if(!width||!height)return;ctx.clearRect(0,0,width,height);renderers[mode](time,box());ctx.globalAlpha=1; };
    const resize = () => { const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);width=r.width;height=r.height;canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);draw(performance.now()); };
    const animate = time => { raf=requestAnimationFrame(animate);if(paused||document.hidden||time-last<30)return;last=time;draw(time); };

    focusButtons.forEach(button=>button.addEventListener("click",()=>{focus=button.dataset.projectFocus;focusButtons.forEach(current=>current.setAttribute("aria-pressed",String(current===button)));draw(performance.now());}));
    pauseButton?.addEventListener("click",()=>{paused=!paused;pauseButton.setAttribute("aria-pressed",String(paused));pauseButton.textContent=paused?"Resume motion":"Pause motion";draw(performance.now());});
    canvas.addEventListener("pointermove",event=>{const r=canvas.getBoundingClientRect();pointer={x:event.clientX-r.left,y:event.clientY-r.top};draw(performance.now());});
    canvas.addEventListener("pointerleave",()=>{pointer=null;draw(performance.now());});
    new ResizeObserver(resize).observe(canvas);resize();raf=requestAnimationFrame(animate);window.addEventListener("pagehide",()=>cancelAnimationFrame(raf),{once:true});
})();
