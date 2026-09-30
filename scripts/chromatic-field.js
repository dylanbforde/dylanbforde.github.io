/* A small constellation of pigment sculptures, with perspective and depth-tested stippling. */
(() => {
    "use strict";
    const field = document.querySelector(".chromatic-field");
    const canvas = field?.querySelector("canvas");
    const control = document.querySelector(".art-motion");
    if (!canvas || !control) return;

    const gl = canvas.getContext("webgl", {
        alpha: false, antialias: false, depth: true, stencil: false,
        powerPreference: "low-power", preserveDrawingBuffer: false
    });
    if (!gl) return; // The CSS colour wash remains available without WebGL.

    const pigment = `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
        #else
        precision mediump float;
        #endif
        uniform vec2 u_resolution;
        uniform vec2 u_cssSize;
        uniform float u_home;
        uniform float u_mobile;
        uniform vec4 u_clearings[10];
        const vec3 paper = vec3(.96863, .96471, .94902);
        float hash(vec2 p) {
            p = fract(mod(p, 61.0) * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
        }
        float clearingAt(vec2 uv) {
            float clearing = 1.;
            for (int i = 0; i < 10; i++) {
                vec4 box = u_clearings[i];
                vec2 d = max(max(box.xy - uv, uv - box.zw), vec2(0.)) * u_cssSize;
                float feather = mix(mix(65., 92., u_home), 28., u_mobile);
                clearing = min(clearing, smoothstep(0., feather, length(d)));
            }
            return clearing;
        }
    `;
    const washVertex = `
        attribute vec2 a_position;
        void main() { gl_Position = vec4(a_position, 0., 1.); }
    `;
    const washFragment = pigment + `
        uniform float u_time;
        uniform vec4 u_halos[3];
        uniform vec3 u_haloInks[3];
        void main() {
            vec2 uv = gl_FragCoord.xy / u_resolution;
            uv.y = 1. - uv.y;
            vec2 pixel = uv * u_cssSize;
            vec3 colour = paper;
            float clearing = mix(.035, 1., clearingAt(uv));
            for (int i = 0; i < 3; i++) {
                vec4 halo = u_halos[i];
                vec2 q = (pixel - halo.xy) / halo.z;
                q += vec2(sin(u_time * .07 + float(i)), cos(u_time * .06)) * .025;
                float spread = exp(-dot(q, q) * 1.6) * halo.w * clearing;
                colour = mix(colour, u_haloInks[i], spread);
            }
            colour += (hash(pixel) - .5) * .009;
            gl_FragColor = vec4(colour, 1.);
        }
    `;
    const surfaceVertex = `
        precision highp float;
        attribute vec3 a_position;
        attribute vec3 a_normal;
        attribute vec2 a_pigment;
        uniform vec2 u_cssSize;
        uniform vec2 u_resolution;
        uniform vec2 u_pointer;
        uniform vec3 u_model;
        uniform vec3 u_pose;
        uniform vec3 u_rate;
        uniform float u_depth;
        uniform float u_time;
        uniform float u_points;
        varying vec3 v_normal;
        varying float v_hue;
        varying float v_distance;
        mat3 rotateX(float a) {
            float c = cos(a), s = sin(a);
            return mat3(1., 0., 0., 0., c, s, 0., -s, c);
        }
        mat3 rotateY(float a) {
            float c = cos(a), s = sin(a);
            return mat3(c, 0., -s, 0., 1., 0., s, 0., c);
        }
        mat3 rotateZ(float a) {
            float c = cos(a), s = sin(a);
            return mat3(c, s, 0., -s, c, 0., 0., 0., 1.);
        }
        void main() {
            vec3 angle = u_pose + u_rate * u_time;
            angle.xy += u_pointer.yx * vec2(.12, .18);
            mat3 rotation = rotateZ(angle.z) * rotateY(angle.y) * rotateX(angle.x);
            vec3 p = rotation * a_position;
            v_normal = rotation * a_normal;
            v_hue = a_pigment.x;
            float distance = u_depth - p.z;
            v_distance = distance;
            vec2 drift = vec2(sin(u_time * .16 + u_pose.x), cos(u_time * .13 + u_pose.y)) * 5.;
            vec2 screen = u_model.xy + drift + vec2(p.x, -p.y) * u_model.z / distance;
            screen += u_pointer * (9. - u_depth) * 7.;
            vec2 ndc = screen / u_cssSize * 2. - 1.;
            ndc.y = -ndc.y;
            float near = 1., far = 14.;
            float clipZ = (far + near) / (far - near) * distance - 2. * far * near / (far - near);
            gl_Position = vec4(ndc * distance, clipZ, distance);
            gl_Position.z -= u_points * .00055 * distance;
            float size = (1.04 + .35 * a_pigment.y) * 6.4 / distance;
            gl_PointSize = max(1., size * u_resolution.x / u_cssSize.x);
        }
    `;
    const surfaceFragment = pigment + `
        uniform vec3 u_inkA;
        uniform vec3 u_inkB;
        uniform vec3 u_inkC;
        varying vec3 v_normal;
        varying float v_hue;
        varying float v_distance;
        void main() {
            vec2 uv = gl_FragCoord.xy / u_resolution;
            uv.y = 1. - uv.y;
            vec3 n = normalize(v_normal);
            float diffuse = max(0., dot(n, normalize(vec3(-.55, .8, 1.2))));
            vec3 ink = mix(u_inkA, u_inkB, smoothstep(.05, .52, v_hue));
            ink = mix(ink, u_inkC, smoothstep(.50, .96, v_hue));
            vec3 colour = ink * (.37 + .63 * diffuse);
            colour = mix(colour, paper, pow(diffuse, 5.) * .30);
            float distanceFade = smoothstep(4.2, 8.8, v_distance);
            float alpha;
            #ifdef POINT_PASS
                float r = length(gl_PointCoord - .5) * 2.;
                if (r > 1.) discard;
                float edge = 1. - smoothstep(.48, 1., r);
                colour *= .88 + diffuse * .12;
                alpha = edge * mix(.95, .59, distanceFade);
            #else
                colour = mix(colour, paper, .08 + distanceFade * .10);
                alpha = .48;
            #endif
            alpha *= mix(.025, 1., clearingAt(uv));
            gl_FragColor = vec4(colour, alpha);
        }
    `;

    const programs = [];
    const shaders = [];
    const makeProgram = (vertexSource, fragmentSource) => {
        const compile = (kind, source) => {
            const shader = gl.createShader(kind);
            shaders.push(shader);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
            return shader;
        };
        const vertex = compile(gl.VERTEX_SHADER, vertexSource);
        const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
        const program = gl.createProgram();
        programs.push(program);
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
        const uniforms = Object.fromEntries(["resolution", "cssSize", "pointer", "time", "home", "mobile", "model", "points", "pose", "rate", "depth", "inkA", "inkB", "inkC", "halos[0]", "haloInks[0]", "clearings[0]"]
            .map(name => [name, gl.getUniformLocation(program, `u_${name}`)]));
        return { program, uniforms, attributes: Object.fromEntries(["position", "normal", "pigment"]
            .map(name => [name, gl.getAttribLocation(program, `a_${name}`)])) };
    };
    let wash, sculpture, stipples;
    try {
        wash = makeProgram(washVertex, washFragment);
        sculpture = makeProgram(surfaceVertex, surfaceFragment);
        // A dedicated point program preserves gl_PointCoord on drivers that
        // mishandle switching between triangle and point draws in one program.
        stipples = makeProgram(surfaceVertex, "#define POINT_PASS\n" + surfaceFragment);
    } catch (error) {
        programs.forEach(program => gl.deleteProgram(program));
        console.warn("Colour field uses its static fallback:", error.message);
        return;
    } finally {
        shaders.forEach(shader => gl.deleteShader(shader));
    }
    const makeBuffer = (type, data) => {
        const buffer = gl.createBuffer();
        gl.bindBuffer(type, buffer);
        gl.bufferData(type, data, gl.STATIC_DRAW);
        return buffer;
    };
    const backdrop = makeBuffer(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]));
    const add = (a, b) => a.map((v, i) => v + b[i]);
    const subtract = (a, b) => a.map((v, i) => v - b[i]);
    const multiply = (a, scale) => a.map(v => v * scale);
    const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const normalise = a => multiply(a, 1 / Math.max(.00001, Math.hypot(...a)));
    const fract = n => n - Math.floor(n);
    const vertex = (array, position, normal, seed) => {
        const hue = Math.max(0, Math.min(1, .46 - position[1] * .34 + position[0] * .23 + position[2] * .14));
        array.push(...position, ...normal, hue, seed);
    };
    const upload = (mesh, points) => ({
        mesh: makeBuffer(gl.ARRAY_BUFFER, new Float32Array(mesh)), meshCount: mesh.length / 8,
        points: makeBuffer(gl.ARRAY_BUFFER, new Float32Array(points)), pointCount: points.length / 8
    });

    // A gently uneven celestial body. The shallow fault is our own contour,
    // without the markings or silhouette details of a game asset.
    const orbSurface = direction => {
        const seam = Math.exp(-Math.pow((direction[1] + .15 * direction[0] + .20) / .027, 2));
        const radius = 1 - seam * .032 + .012 * Math.sin(direction[0] * 8 + direction[2] * 5) * Math.sin(direction[1] * 7);
        return multiply(direction, radius);
    };
    const orbNormal = direction => {
        const tangent = normalise(cross(direction, Math.abs(direction[1]) < .9 ? [0, 1, 0] : [1, 0, 0]));
        const other = cross(direction, tangent);
        const derivative = axis => subtract(orbSurface(normalise(add(direction, multiply(axis, .003)))), orbSurface(normalise(add(direction, multiply(axis, -.003)))));
        return normalise(cross(derivative(tangent), derivative(other)));
    };
    const buildOrb = () => {
        const mesh = [], points = [];
        const longitude = 128, latitude = 80;
        const at = (u, v) => {
            const a = u / longitude * Math.PI * 2, b = v / latitude * Math.PI;
            const direction = [Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)];
            return [orbSurface(direction), orbNormal(direction)];
        };
        const grid = Array.from({ length: longitude + 1 }, (_, u) => Array.from({ length: latitude + 1 }, (_, v) => at(u, v)));
        for (let u = 0; u < longitude; u++) for (let v = 0; v < latitude; v++) {
            for (const [i, j] of [[u, v], [u + 1, v], [u, v + 1], [u + 1, v], [u + 1, v + 1], [u, v + 1]]) {
                vertex(mesh, ...grid[i][j], .5);
            }
        }
        // Equal-area Fibonacci samples avoid a dense pinched grid at the poles.
        const count = 13500;
        for (let i = 0; i < count; i++) {
            const y = 1 - 2 * (i + .5) / count, radius = Math.sqrt(1 - y * y);
            const angle = i * Math.PI * (3 - Math.sqrt(5)) + .007 * Math.sin(i * 3.7);
            const direction = [radius * Math.cos(angle), y, radius * Math.sin(angle)];
            vertex(points, orbSurface(direction), orbNormal(direction), fract(i * .61803398875));
        }
        return upload(mesh, points);
    };
    const buildFacets = (faces, density) => {
        const mesh = [], points = [];
        let seed = 0;
        for (const [a, b, c] of faces) {
            const ab = subtract(b, a), ac = subtract(c, a);
            const areaVector = cross(ab, ac), normal = normalise(areaVector);
            for (const position of [a, b, c]) vertex(mesh, position, normal, .5);
            const count = Math.ceil(Math.hypot(...areaVector) * .5 * density);
            // Deterministic area sampling breaks up rows without glitter or random frames.
            for (let i = 0; i < count; i++) {
                const r = Math.sqrt((i + .5) / count), t = fract(i * .61803398875 + seed * .381966);
                const position = add(a, add(multiply(ab, r * (1 - t)), multiply(ac, r * t)));
                vertex(points, position, normal, fract((seed + i) * .754877666));
            }
            seed += count;
        }
        return upload(mesh, points);
    };
    const outward = face => {
        const [a, b, c] = face;
        return dot(cross(subtract(b, a), subtract(c, a)), add(add(a, b), c)) < 0 ? [a, c, b] : face;
    };
    const buildCrystal = () => {
        const phi = (1 + Math.sqrt(5)) / 2, vertices = [];
        for (const a of [-1, 1]) for (const b of [-phi, phi]) vertices.push([0, a, b], [a, b, 0], [b, 0, a]);
        const faces = [];
        const edge = (i, j) => Math.abs(Math.hypot(...subtract(vertices[i], vertices[j])) - 2) < .001;
        const shape = ([x, y, z]) => [x * .48, y * .63, z * .48 + y * .08];
        for (let a = 0; a < vertices.length; a++) for (let b = a + 1; b < vertices.length; b++) for (let c = b + 1; c < vertices.length; c++) {
            if (edge(a, b) && edge(b, c) && edge(c, a)) faces.push(outward([vertices[a], vertices[b], vertices[c]].map(shape)));
        }
        return buildFacets(faces, 720);
    };
    const buildOpenForm = () => {
        // Three separated triangular slabs, with an open centre and blunt edges.
        // Their asymmetric proportions suggest floating architecture, not a vehicle.
        const top = [.13, 1.18, -.10];
        const base = [[-.94, -.64, .65], [.97, -.64, .65], [-.12, -.64, -.98]];
        const faces = [];
        for (let i = 0; i < 3; i++) {
            const outer = outward([top, base[i], base[(i + 1) % 3]]);
            const normal = normalise(cross(subtract(outer[1], outer[0]), subtract(outer[2], outer[0])));
            const front = outer.map(v => add(v, multiply(normal, .12)));
            const back = outer.map(v => add(v, multiply(normal, .035)));
            faces.push(front, [back[2], back[1], back[0]]);
            for (let e = 0; e < 3; e++) {
                const next = (e + 1) % 3;
                faces.push([front[e], back[e], front[next]], [front[next], back[e], back[next]]);
            }
        }
        return buildFacets(faces, 640);
    };
    const objects = [
        { ...buildOrb(), depth: 7.1, pose: [.16, -.40, -.20], rate: [.035, .105, -.018],
            inks: [[.76, .89, 1.], [.21, .64, .91], [.28, .30, .84]], model: [0, 0, 1] },
        { ...buildCrystal(), depth: 6.5, pose: [.36, .55, -.24], rate: [-.065, .085, .027],
            inks: [[1., .76, .37], [1., .40, .43], [.77, .23, .58]], model: [0, 0, 1] },
        { ...buildOpenForm(), depth: 5.9, pose: [.30, .68, -.22], rate: [.052, -.09, -.025],
            inks: [[.91, .73, 1.], [.59, .37, .93], [.23, .40, .82]], model: [0, 0, 1] }
    ];
    // Related colour studies, without changing the approved homepage palette.
    const colourOrder = ({ research: [0, 2, 1], notes: [2, 1, 0], resume: [1, 0, 2] })[document.body.dataset.artTheme] || [0, 1, 2];
    const inks = objects.map(object => object.inks);
    const washes = [[.37, .67, .94], [1., .49, .46], [.65, .43, .92]];
    const haloInks = new Float32Array(colourOrder.flatMap(index => washes[index]));
    objects.forEach((object, index) => { object.inks = inks[colourOrder[index]]; });
    const enabledAttributes = new Set();
    const use = (pass, buffer, isWash = false) => {
        gl.useProgram(pass.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        const wanted = new Set(Object.values(pass.attributes).filter(index => index >= 0));
        for (const index of enabledAttributes) if (!wanted.has(index)) { gl.disableVertexAttribArray(index); enabledAttributes.delete(index); }
        const sizes = { position: isWash ? 2 : 3, normal: 3, pigment: 2 };
        const offsets = { position: 0, normal: 12, pigment: 24 };
        for (const [name, index] of Object.entries(pass.attributes)) {
            if (index < 0) continue;
            gl.enableVertexAttribArray(index);
            enabledAttributes.add(index);
            gl.vertexAttribPointer(index, sizes[name], gl.FLOAT, false, isWash ? 0 : 32, offsets[name]);
        }
    };
    const setObject = (pass, object, points) => {
        const u = pass.uniforms;
        gl.uniform3fv(u.model, object.model);
        gl.uniform3fv(u.pose, object.pose);
        gl.uniform3fv(u.rate, object.rate);
        gl.uniform1f(u.depth, object.depth);
        gl.uniform3fv(u.inkA, object.inks[0]);
        gl.uniform3fv(u.inkB, object.inks[1]);
        gl.uniform3fv(u.inkC, object.inks[2]);
        gl.uniform1f(u.time, time);
        gl.uniform2f(u.pointer, pointerX, pointerY);
        gl.uniform1f(u.points, points ? 1 : 0);
    };
    const home = document.body.classList.contains("home-page");
    const targets = [...document.querySelectorAll(home
        ? ".introduction, .research-index, .notes-index, .work-index, .off-hours, .bookshelf, .site-header, .site-footer"
        : ".hero-copy, .hero-panel, .section > .container, .article-header, .article-visual-intro, .article-content, .paper-feature, .site-header, .site-footer")];
    // The mobile illustration sits between the title and paragraphs. Clear the
    // text itself rather than erasing the empty art space inside that wrapper.
    const narrowTargets = home ? targets.flatMap(element => element.matches(".introduction")
        ? [...element.children].filter(child => child.matches("h1, p")) : [element]) : targets;
    const study = document.querySelector(home ? ".margin-study" : ".page-study");
    const localTargets = home ? narrowTargets : [...document.querySelectorAll(
        ".hero-copy > :not(.page-study), .hero-panel, .article-header > :not(.page-study), .site-header, .site-footer")];
    const mobileViewport = matchMedia("(max-width: 600px)");
    const originalParent = field.parentNode, originalSibling = field.nextSibling;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let manualPause = false;
    try { manualPause = localStorage.getItem("dylan-art-paused") === "true"; } catch (_) { /* Storage may be disabled. */ }
    let paused = manualPause || reducedMotion.matches;
    let lost = false;
    let frame = 0;
    let lastTime = 0;
    let time = 0;
    let dirty = true;
    let localSurface = false, inView = true;
    let visibilityObserver = null;
    let viewportWidth = 0, pixelRatio = 0;
    let width = 1, height = 1;
    let pointerX = 0, pointerY = 0;
    let targetX = 0, targetY = 0;
    const rectangles = new Float32Array(40);

    const selectSurface = () => {
        const local = Boolean(study && (!home || mobileViewport.matches));
        if (local === localSurface) return;
        localSurface = local;
        inView = true;
        visibilityObserver?.unobserve(field);
        if (local) {
            // Let the compositor carry the artwork with its figure during touch
            // scrolling. No scroll event or animation frame positions this layer.
            field.dataset.surface = "local";
            study.prepend(field);
            visibilityObserver?.observe(field);
        } else {
            delete field.dataset.surface;
            originalParent.insertBefore(field, originalSibling);
        }
    };
    const measure = () => {
        viewportWidth = document.documentElement.clientWidth;
        pixelRatio = devicePixelRatio || 1;
        const bounds = localSurface ? field.getBoundingClientRect() : null;
        const left = bounds?.left || 0, top = bounds?.top || 0;
        width = bounds ? bounds.width : viewportWidth;
        height = bounds ? bounds.height : window.innerHeight;
        // On phones render only the illustration and its soft colour bleed.
        const mobile = mobileViewport.matches;
        const scale = mobile
            ? Math.min(Math.max(pixelRatio, 1.5), 2)
            : Math.min(Math.max(pixelRatio, 1.25), 1.5, 1800 / width);
        const w = Math.max(1, Math.round(width * scale));
        const h = Math.max(1, Math.round(height * scale));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w; canvas.height = h;
            gl.viewport(0, 0, w, h);
        }
        rectangles.fill(-20);
        let index = 0;
        for (const element of localSurface ? localTargets : mobile ? narrowTargets : targets) {
            const box = element.getBoundingClientRect();
            if (box.bottom - top < -110 || box.top - top > height + 110 || !box.width || !box.height) continue;
            if (index >= 10) break;
            const inset = element.matches(".site-header, .site-footer") ? 4 : 8;
            rectangles.set([(box.left - left - inset) / width, (box.top - top - inset) / height,
                (box.right - left + inset) / width, (box.bottom - top + inset) / height], index++ * 4);
        }
        // Desktop keeps its margin composition. Phone artwork uses a full-width
        // stage and follows it out of the viewport as the reader scrolls.
        const studyBox = study?.getBoundingClientRect();
        const anchor = mobile && studyBox
            ? Math.max(height * .32, studyBox.top + studyBox.height * .52)
            : Math.min(height * .48, 350);
        const unit = mobile ? Math.min(width / 390, 1) : Math.min(width / 1265, 1.2);
        let layout = mobile
            ? [[width * .27, anchor - 42, 71], [width * .78, anchor - 22, 49], [width * .53, anchor + 73, 48]]
            : [[width * .71, anchor - 120 * unit, 123], [width * .90, anchor - 13 * unit, 93], [width * .74, anchor + 142 * unit, 89]];
        if (localSurface && studyBox) {
            const span = Math.min(studyBox.width, 440);
            const studyLeft = studyBox.left - left;
            const studyTop = studyBox.top - top, space = studyBox.height;
            layout = [
                [studyLeft + studyBox.width * .21, studyTop + space * .35, span * .265 / unit],
                [studyLeft + studyBox.width * .83, studyTop + space * .34, span * .175 / unit],
                [studyLeft + studyBox.width * .62, studyTop + space * .74, span * .175 / unit]
            ];
        }
        const halos = [];
        objects.forEach((object, i) => {
            const [x, y, radius] = layout[i];
            object.model = [x, y, radius * unit * object.depth];
            halos.push(x, y, radius * unit * 2.1, [.19, .20, .18][i]);
        });
        for (const pass of [wash, sculpture, stipples]) {
            gl.useProgram(pass.program);
            const uniforms = pass.uniforms;
            gl.uniform2f(uniforms.resolution, w, h);
            gl.uniform2f(uniforms.cssSize, width, height);
            gl.uniform1f(uniforms.home, home ? 1 : 0);
            gl.uniform1f(uniforms.mobile, mobile ? 1 : 0);
            gl.uniform4fv(uniforms["clearings[0]"], rectangles);

        }
        gl.useProgram(wash.program);
        gl.uniform4fv(wash.uniforms["halos[0]"], new Float32Array(halos));
        gl.uniform3fv(wash.uniforms["haloInks[0]"], haloInks);
        dirty = false;
    };
    const canRender = () => !lost && !document.hidden && (!localSurface || inView);
    const draw = () => {
        if (!canRender()) return;
        if (dirty) measure();
        gl.depthMask(true);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        use(wash, backdrop, true);
        gl.uniform1f(wash.uniforms.time, time);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // All objects share the same depth prepass, so independent silhouettes
        // and the separated slabs occlude one another correctly during rotation.
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.colorMask(false, false, false, false);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(1, 1);
        for (const object of objects) {
            use(sculpture, object.mesh);
            setObject(sculpture, object, false);
            gl.drawArrays(gl.TRIANGLES, 0, object.meshCount);
        }
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.colorMask(true, true, true, true);
        gl.depthMask(false);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        for (const object of objects) {
            use(sculpture, object.mesh);
            setObject(sculpture, object, false);
            gl.drawArrays(gl.TRIANGLES, 0, object.meshCount);
        }
        for (const object of objects) {
            use(stipples, object.points);
            setObject(stipples, object, true);
            gl.drawArrays(gl.POINTS, 0, object.pointCount);
        }
        gl.depthMask(true);
    };
    const tick = now => {
        frame = 0;
        if (!canRender()) return;
        if (!paused) {
            // Follow display refresh rather than dropping frames at a 30 Hz
            // threshold. Damping and rotation stay independent of refresh rate.
            const delta = Math.min((now - lastTime) / 1000, .07);
            time += delta;
            lastTime = now;
            const easing = 1 - Math.exp(-delta * 1.38);
            pointerX += (targetX - pointerX) * easing;
            pointerY += (targetY - pointerY) * easing;
        }
        if (dirty || !paused) draw();
        if (!paused) frame = requestAnimationFrame(tick);
    };
    const requestDraw = () => {
        if (!frame && canRender()) {
            lastTime = performance.now();
            frame = requestAnimationFrame(tick);
        }
    };
    const syncMotion = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        const still = paused || document.hidden || lost;
        document.body.dataset.artMotion = still ? "paused" : "running";
        control.textContent = paused ? "Resume colour" : "Pause colour";
        control.setAttribute("aria-label", control.textContent);
        requestDraw();
    };
    const invalidate = () => {
        dirty = true;
        requestDraw();
    };
    control.addEventListener("click", () => {
        paused = !paused;
        manualPause = paused;
        try { localStorage.setItem("dylan-art-paused", String(paused)); } catch (_) { /* Optional preference. */ }
        syncMotion();
    });
    reducedMotion.addEventListener("change", () => { paused = manualPause || reducedMotion.matches; syncMotion(); });
    document.addEventListener("visibilitychange", () => { dirty = true; syncMotion(); });
    const resize = () => {
        // Mobile browser chrome changes viewport height during scrolling; the
        // page-local figure has not changed size and needs no canvas allocation.
        if (localSurface && (!home || mobileViewport.matches) && viewportWidth === document.documentElement.clientWidth
            && pixelRatio === (devicePixelRatio || 1)) return;
        selectSurface();
        invalidate();
    };
    window.addEventListener("resize", resize, { passive: true });
    mobileViewport.addEventListener("change", resize);
    window.addEventListener("scroll", () => { if (!localSurface) invalidate(); }, { passive: true });
    window.addEventListener("pointermove", event => {
        if (event.pointerType !== "mouse" || paused) return;
        targetX = event.clientX / viewportWidth - .5;
        targetY = event.clientY / window.innerHeight - .5;
    }, { passive: true });
    window.addEventListener("pointerout", event => {
        if (!event.relatedTarget) { targetX = 0; targetY = 0; }
    }, { passive: true });
    if (typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(invalidate);
        new Set([...targets, ...localTargets, ...(study ? [study] : [])]).forEach(element => observer.observe(element));
    }
    if (typeof IntersectionObserver !== "undefined") {
        visibilityObserver = new IntersectionObserver(([entry]) => {
            if (!localSurface || inView === entry.isIntersecting) return;
            inView = entry.isIntersecting;
            // Keep the user's pause preference separate from automatic culling.
            syncMotion();
        }, { rootMargin: "96px" });
    }
    document.fonts?.ready.then(invalidate);
    canvas.addEventListener("webglcontextlost", event => {
        event.preventDefault();
        lost = true;
        syncMotion();
        delete field.dataset.ready;
        control.hidden = true;
    });
    // A lost graphics context keeps the static composition until the next navigation.
    // Set readiness before measuring: it activates the mobile figure layout.
    syncMotion();
    selectSurface();
    draw();
    field.dataset.ready = "true";
    control.hidden = false;
})();
