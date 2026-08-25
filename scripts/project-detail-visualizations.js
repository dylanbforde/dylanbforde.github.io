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
        for (let i = 0; i < amino; i += 1) {
            const angle = (i / amino) * Math.PI * 2 - Math.PI / 2;
            const x = gx + Math.cos(angle) * gr;
            const y = gy + Math.sin(angle) * gr * .62;
            const next = (i + 1) % amino;
            const na = (next / amino) * Math.PI * 2 - Math.PI / 2;
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

    const heartPath = (cx, cy, s) => {
        ctx.beginPath(); ctx.moveTo(cx,cy+s*.32); ctx.bezierCurveTo(cx-s*.62,cy-s*.08,cx-s*.58,cy-s*.62,cx-s*.22,cy-s*.56); ctx.bezierCurveTo(cx,cy-s*.52,cx,cy-s*.3,cx,cy-s*.22); ctx.bezierCurveTo(cx,cy-s*.3,cx,cy-s*.52,cx+s*.22,cy-s*.56); ctx.bezierCurveTo(cx+s*.58,cy-s*.62,cx+s*.62,cy-s*.08,cx,cy+s*.32); ctx.closePath();
    };
    const drawCardiac = (time, a) => {
        const compact=width<700, span=a.right-a.left;
        const cx=compact?(a.left+a.right)/2:a.left+span*.38, cy=a.top+(a.bottom-a.top)*.52, s=Math.min(compact?140:220,(a.bottom-a.top)*.72);
        ctx.globalAlpha=sectionAlpha("input");
        for(let i=3;i>=0;i--){ctx.strokeStyle=`rgba(45,38,31,${.07+i*.035})`;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(cx+i*7,cy-i*5,s*.7,s*.48,0,0,Math.PI*2);ctx.stroke();}
        ctx.globalAlpha=sectionAlpha("core");
        heartPath(cx,cy,s);ctx.fillStyle="rgba(185,82,72,.12)";ctx.fill();ctx.strokeStyle="rgba(185,82,72,.78)";ctx.lineWidth=3;ctx.stroke();
        heartPath(cx,cy,s*.68);ctx.strokeStyle="rgba(217,120,45,.42)";ctx.lineWidth=2;ctx.stroke();
        const scan = paused ? .5 : (time * .00016) % 1; const sy=cy-s*.62+scan*s*1.05;
        line(cx-s*.72,sy,cx+s*.72,sy,"rgba(15,157,141,.75)",2); roundRect(cx-s*.75,sy-5,s*1.5,10,5,"rgba(15,157,141,.1)");
        label("LIVE MRI PLANE",cx,sy-10,{color:colors.teal});
        ctx.globalAlpha=sectionAlpha("output");
        if(!compact){const ox=a.left+span*.78,oy=cy;[1,.82,.64,.46].forEach((scale,i)=>{heartPath(ox+i*18,oy-i*12,s*.48*scale);ctx.strokeStyle=i===0?colors.orange:`rgba(15,157,141,${.55-i*.08})`;ctx.lineWidth=2;ctx.stroke();});label("MULTI-SCALE MASK",ox,cy+s*.38,{color:colors.orange});}
        else label("SEGMENTATION MASK BUILDS WITH EACH PASS",cx,a.bottom-3,{color:colors.orange});
        ctx.globalAlpha=1;
    };

    const drawMrnet = (time,a) => {
        const compact=width<700, span=a.right-a.left, sliceW=compact?145:240, sliceH=compact?62:82;
        const sx=compact?a.left+10:a.left+span*.08, sy=a.top+25;
        ctx.globalAlpha=sectionAlpha("input");
        for(let i=5;i>=0;i--){const x=sx+i*(compact?8:14),y=sy+i*(compact?30:24);roundRect(x,y,sliceW,sliceH,12,"rgba(45,38,31,.035)","rgba(45,38,31,.18)");ctx.strokeStyle="rgba(45,38,31,.16)";ctx.beginPath();ctx.ellipse(x+sliceW*.5,y+sliceH*.5,sliceW*.28,sliceH*.31,0,0,Math.PI*2);ctx.stroke();if(i===2){dot(x+sliceW*.62,y+sliceH*.43,8,"rgba(217,120,45,.72)");}}
        label("ORDERED MRI SLICES",sx,sy-10,{align:"left",color:colors.ink});
        ctx.globalAlpha=sectionAlpha("core");
        const ax=compact?a.right-42:a.left+span*.62, ay=a.top+(a.bottom-a.top)*.5;
        for(let i=0;i<6;i++){const weight=.18+((i*37)%7)/8;const fromX=sx+5*(compact?8:14)+sliceW;const fromY=sy+i*(compact?30:24)+sliceH*.5;line(fromX,fromY,ax,ay,`rgba(15,157,141,${.12+weight*.5})`,1+weight*3);}
        dot(ax,ay,compact?28:42,"rgba(15,157,141,.88)");label("Σ",ax,ay+6,{color:colors.paper,font:sans(18,700),upper:false});label("SLICE ATTENTION",ax,ay+(compact?48:66),{color:colors.teal});
        ctx.globalAlpha=sectionAlpha("output");
        const bx=compact?a.left:a.left+span*.78, by=compact?a.bottom-33:ay-28, bw=compact?span:span*.2;
        roundRect(bx,by,bw,56,14,"rgba(255,252,246,.92)","rgba(217,120,45,.35)");label("STUDY PREDICTION",bx+bw/2,by+24,{color:colors.ink});label("evidence weighted",bx+bw/2,by+42,{color:colors.orange,upper:false});
        ctx.globalAlpha=1;
    };

    const drawLuad = (time,a) => {
        const compact=width<700, span=a.right-a.left, mid=compact?a.top+(a.bottom-a.top)*.48:a.left+span*.43;
        ctx.globalAlpha=sectionAlpha("input");
        const nx=compact?(a.left+a.right)/2:a.left+span*.2, ny=compact?a.top+80:a.top+(a.bottom-a.top)*.48;
        const genes=Array.from({length:10},(_,i)=>{const ang=i/10*Math.PI*2;return{x:nx+Math.cos(ang)*(compact?72:110),y:ny+Math.sin(ang)*(compact?48:85)}});
        genes.forEach((g,i)=>{genes.forEach((h,j)=>{if(j>i&&(i*3+j)%7===0)line(g.x,g.y,h.x,h.y,"rgba(45,38,31,.13)");});dot(g.x,g.y,i%3===0?7:4,i%3===0?colors.orange:"rgba(15,157,141,.68)");});
        dot(nx,ny,12,colors.teal);label("SPARSE SIGNATURE",nx,ny+(compact?78:118),{color:colors.teal});
        ctx.globalAlpha=sectionAlpha("core");
        const gx=compact?a.left:a.left+span*.52, gy=compact?a.top+(a.bottom-a.top)*.58:a.top+25, gw=compact?span:span*.45, gh=compact?(a.bottom-a.top)*.38:(a.bottom-a.top)*.72;
        line(gx,gy,gx,gy+gh,"rgba(45,38,31,.25)");line(gx,gy+gh,gx+gw,gy+gh,"rgba(45,38,31,.25)");
        const curve=(risk)=>{ctx.beginPath();for(let i=0;i<=40;i++){const x=gx+i/40*gw,y=gy+gh*(1-Math.exp(-i/40*(risk?1.65:.72)));if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=risk?colors.orange:colors.teal;ctx.lineWidth=3;ctx.stroke();};curve(false);curve(true);
        label("LOW RISK",gx+gw*.74,gy+gh*.42,{color:colors.teal});label("HIGH RISK",gx+gw*.74,gy+gh*.72,{color:colors.orange});label("TIME",gx+gw,gy+gh+20,{align:"right"});
        ctx.globalAlpha=sectionAlpha("output");
        if(!compact){roundRect(a.left+span*.82,a.bottom-62,span*.16,44,10,"rgba(255,252,246,.9)","rgba(45,38,31,.15)");label("RISK REPORT",a.left+span*.9,a.bottom-35,{color:colors.ink});}
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
