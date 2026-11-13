// The Nooze mark as a 3D model, built from the same geometry as the 2D logo
// (NoozeClockLoader.kt / window.NoozeMark): units are the logo's R, angles are clock
// degrees (0 at 12, clockwise). Loaded lazily by Hero.astro once the 2D mark is on
// screen; the 2D canvas stays as the poster and the fallback.
//
// It takes over from the 2D mark facing the camera, so the swap is invisible, then
// pops out into depth: the layers part, it settles into a slow float and leans toward
// the pointer. Hover pulls the layers apart (exploded view); a click or tap rings it.
import {
    WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, InstancedMesh, Object3D, Shape,
    ExtrudeGeometry, CylinderGeometry, TorusGeometry, BoxGeometry, PlaneGeometry,
    MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, CanvasTexture, Color,
    PMREMGenerator, NeutralToneMapping, SRGBColorSpace, AdditiveBlending,
    type BufferGeometry, type Material,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface Mark3DOptions {
    /** Second-hand angle in clock degrees, read every frame. */
    secondAngle: () => number;
    /** Element whose area steers the lean toward the pointer. */
    hero: HTMLElement;
    /** Called once the first frame (facing the camera) is on the canvas. */
    onReady: () => void;
}
export interface Mark3D { destroy(): void }

const D2R = Math.PI / 180;
const GLOW = '0,96,208';
const HI = '#3B8CFF';
const HAND = '#F80000';
const MINUTE_REST = 61;
const BLOCK_STARTS = [15.5, 30, 44, 57.5, 70.5, 84.6];
const BLOCK_SWEEPS = [11.5, 11, 10.5, 10, 9.5, 1.4];
const FOV = 38;
const BLEED = 1.32; // the canvas is this much larger than the 2D mark, so a tilt never clips

// Clock degrees on a circle of radius r, y up.
const polar = (deg: number, r: number): [number, number] => [r * Math.sin(deg * D2R), r * Math.cos(deg * D2R)];

/** An annular sector from `from` to `to` clock degrees, clockwise. */
function sector(r0: number, r1: number, from: number, to: number): Shape {
    const a0 = (90 - from) * D2R;
    const a1 = (90 - to) * D2R;
    const s = new Shape();
    s.moveTo(Math.cos(a0) * r1, Math.sin(a0) * r1);
    s.absarc(0, 0, r1, a0, a1, true);
    s.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0);
    s.absarc(0, 0, r0, a1, a0, false);
    s.closePath();
    return s;
}

function needle(length: number): Shape {
    const half = 0.04;
    const base = 0.06;
    const s = new Shape();
    s.moveTo(-half, base);
    s.lineTo(0, length);
    s.lineTo(half, base);
    s.closePath();
    return s;
}

function haloTexture(): CanvasTexture {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${GLOW},0.12)`);
    grad.addColorStop(0.52, `rgba(${GLOW},0.24)`);
    grad.addColorStop(0.68, 'rgba(59,140,255,0.70)');
    grad.addColorStop(0.80, `rgba(${GLOW},0.62)`);
    grad.addColorStop(1, `rgba(${GLOW},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
}

export function mountMark3D(canvas: HTMLCanvasElement, opts: Mark3DOptions): Mark3D | null {
    let renderer: WebGLRenderer;
    try {
        renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'default' });
    } catch {
        return null;
    }
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
    renderer.toneMapping = NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);

    const scene = new Scene();
    const pmrem = new PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;

    const camera = new PerspectiveCamera(FOV, 1, 0.1, 50);
    // Frame it so R = 1 covers 40% of the 2D mark, exactly as the 2D logo does.
    camera.position.set(0, 0, (1.25 * BLEED) / Math.tan((FOV / 2) * D2R));

    const geos: BufferGeometry[] = [];
    const mats: Material[] = [];
    const keep = <T extends BufferGeometry>(g: T) => (geos.push(g), g);
    const mat = <T extends Material>(m: T) => (mats.push(m), m);

    // ---- materials ----
    const ringMat = mat(new MeshPhysicalMaterial({
        color: 0xffffff, roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12,
        emissive: 0xffffff, emissiveIntensity: 0.4,
    }));
    // Hands and rim glow in the logo's exact red and blue: no diffuse to grey them, no tone
    // mapping to desaturate them; only the bevels pick up highlights from the environment.
    const blueMat = mat(new MeshStandardMaterial({ color: 0x000000, emissive: HI, emissiveIntensity: 1, roughness: 0.3, envMapIntensity: 0.4, toneMapped: false }));
    const handMat = mat(new MeshStandardMaterial({ color: 0x000000, emissive: HAND, emissiveIntensity: 1, roughness: 0.28, metalness: 0, envMapIntensity: 0.5, toneMapped: false }));
    const faceMat = mat(new MeshPhysicalMaterial({
        color: 0x010510, roughness: 0.22, metalness: 0.1, clearcoat: 0.5, clearcoatRoughness: 0.12,
        emissive: 0x041338, emissiveIntensity: 0.4, envMapIntensity: 0.32,
    }));
    const tickMat = mat(new MeshBasicMaterial({ color: 0xffffff }));

    // ---- layers (each a Group so the exploded view can move it in z) ----
    const mark = new Group();
    scene.add(mark);
    type Layer = { obj: Object3D; z: number; spread: number };
    const layers: Layer[] = [];
    const layer = (obj: Object3D, z: number, spread: number) => { mark.add(obj); layers.push({ obj, z, spread }); return obj; };

    // Halo: the logo's one-gradient neon haze, as a glowing card behind everything.
    const halo = new Mesh(keep(new PlaneGeometry(2.5, 2.5)), mat(new MeshBasicMaterial({
        map: haloTexture(), transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false,
    })));
    layer(halo, -0.2, -0.9);

    // Dial face: a dark glass disc with the blue rim line.
    const face = new Group();
    const disc = new Mesh(keep(new CylinderGeometry(0.83, 0.83, 0.05, 96)), faceMat);
    disc.rotation.x = Math.PI / 2;
    face.add(disc);
    const rim = new Mesh(keep(new TorusGeometry(0.83, 0.016, 12, 160)), blueMat);
    rim.position.z = 0.028;
    face.add(rim);
    layer(face, 0, 0);

    // Sixty ticks, quarters as bold blocks, exactly the logo's lengths and weights.
    const ticks = new InstancedMesh(keep(new BoxGeometry(1, 1, 1)), tickMat, 60);
    const dummy = new Object3D();
    const shade = new Color();
    for (let n = 0; n < 60; n++) {
        const quarter = n % 15 === 0;
        const five = n % 5 === 0;
        const outer = 0.755;
        const len = quarter ? 0.155 : five ? 0.085 : 0.05;
        const w = quarter ? 0.085 : five ? 0.024 : 0.014;
        const [x, y] = polar(n * 6, outer - len / 2);
        dummy.position.set(x, y, 0);
        dummy.rotation.set(0, 0, -n * 6 * D2R);
        dummy.scale.set(w, len, quarter ? 0.05 : 0.025);
        dummy.updateMatrix();
        ticks.setMatrixAt(n, dummy.matrix);
        ticks.setColorAt(n, shade.setScalar(quarter ? 1 : five ? 0.9 : 0.6));
    }
    layer(ticks, 0.045, 0.5);

    // The arrow ring: five shrinking blocks, the blue hairline, the solid sweep, the arrowhead.
    const ring = new Group();
    const extrude = { depth: 0.2, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.016, bevelSegments: 4 };
    BLOCK_STARTS.forEach((start, i) => {
        const g = keep(new ExtrudeGeometry(sector(0.85, 1.0, start, start + BLOCK_SWEEPS[i]), { ...extrude, curveSegments: 6 }));
        ring.add(new Mesh(g, i === 5 ? blueMat : ringMat));
    });
    ring.add(new Mesh(keep(new ExtrudeGeometry(sector(0.85, 1.0, 90, 358), { ...extrude, curveSegments: 96 })), ringMat));
    const head = new Shape();
    const [ox, oy] = polar(-3, 1.085);
    const [tx, ty] = polar(12.5, 0.935);
    const [ix, iy] = polar(-3, 0.79);
    head.moveTo(ox, oy); head.lineTo(tx, ty); head.lineTo(ix, iy); head.closePath();
    ring.add(new Mesh(keep(new ExtrudeGeometry(head, { ...extrude, curveSegments: 1 })), ringMat));
    layer(ring, -0.1, 0.28);

    // Hands at three depths, like a real movement.
    const handDepth = { depth: 0.035, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.007, bevelSegments: 2 };
    const hour = new Mesh(keep(new ExtrudeGeometry(needle(0.41), handDepth)), handMat);
    layer(hour, 0.07, 0.9);
    const minute = new Mesh(keep(new ExtrudeGeometry(needle(0.62), handDepth)), handMat);
    minute.rotation.z = -MINUTE_REST * D2R;
    layer(minute, 0.1, 1.25);
    const second = new Group();
    const sweep = new Mesh(keep(new BoxGeometry(0.022, 0.52, 0.02)), handMat);
    sweep.position.y = 0.36;
    second.add(sweep);
    const hub = new Mesh(keep(new TorusGeometry(0.085, 0.022, 12, 48)), handMat);
    second.add(hub);
    layer(second, 0.135, 1.6);

    // ---- motion state ----
    let explode = 0;      // 0 assembled, 1 fully exploded
    let explodeV = 0;
    let explodeTarget = 0;
    let rotX = 0;
    let rotY = 0;
    let px = 0;           // pointer, -0.5..0.5 across the hero
    let py = 0;
    let hovering = false;
    let popped = false;
    let popAt = -1;       // time the pop (a full spin) started
    let ringAt = -1;      // time a ring (click) started
    let start = 0;
    let last = 0;
    let raf = 0;
    let inView = true;
    let frameNo = 0;
    const IDLE_SPREAD = 0.14;

    const resize = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    };
    resize();

    const pose = (t: number, dt: number) => {
        // Lean toward the pointer on top of a slow float; frozen face-on until the pop.
        const floatY = Math.sin(t * 0.55) * 0.16;
        const floatX = Math.cos(t * 0.45) * 0.08;
        const goalY = popped ? floatY + px * 0.75 : 0;
        const goalX = popped ? floatX - py * 0.5 : 0;
        const k = 1 - Math.exp(-dt * (popped ? 4.5 : 20));
        rotY += (goalY - rotY) * k;
        rotX += (goalX - rotX) * k;

        // Under-damped spring, so the layers overshoot as they part and settle.
        const goal = hovering ? 1 : explodeTarget;
        explodeV += ((goal - explode) * 90 - explodeV * 11) * dt;
        explode += explodeV * dt;

        let wobble = 0;
        let pulse = 0;
        if (ringAt >= 0) {
            const r = t - ringAt;
            if (r > 1.4) ringAt = -1;
            else {
                const fall = Math.exp(-r * 3.2);
                wobble = Math.sin(r * 38) * 0.09 * fall;
                pulse = Math.sin(r * 9) * 0.5 * fall;
            }
        }
        // The pop: one full turn that starts and ends face-on, braking hard at the end.
        let spin = 0;
        if (popAt >= 0) {
            const p = Math.min(1, (t - popAt) / 1.5);
            const e = 1 - Math.pow(1 - p, 4);
            spin = -Math.PI * 2 * (1 - e);
            if (p >= 1) popAt = -1;
        }
        mark.rotation.set(rotX, rotY + spin, wobble);
        for (const l of layers) l.obj.position.z = l.z + l.spread * Math.max(0, explode + pulse * 0.6);
        second.rotation.z = -opts.secondAngle() * D2R;
    };

    const frame = (now: number) => {
        raf = 0;
        if (!inView || document.hidden) return;
        const t = now / 1000;
        if (!start) start = t;
        const dt = Math.min(0.05, last ? t - last : 0.016);
        last = t;
        raf = requestAnimationFrame(frame);
        // Phones: 30 fps is plenty for a float and saves battery.
        if (coarse && (frameNo++ & 1)) return;
        pose(t, coarse ? dt * 2 : dt);
        renderer.render(scene, camera);
    };
    const schedule = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };

    // First frame face-on and assembled, so it can replace the 2D mark without a jump.
    pose(0, 0.016);
    renderer.render(scene, camera);
    opts.onReady();
    window.setTimeout(() => {
        popped = true;
        popAt = performance.now() / 1000;
        explodeTarget = IDLE_SPREAD;
        explodeV = 7; // the kick that throws the layers apart once
    }, 260);
    schedule();

    // ---- input ----
    const onMove = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        const r = opts.hero.getBoundingClientRect();
        px = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5));
        py = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5));
    };
    const onLeave = () => { px = 0; py = 0; };
    const onEnter = (e: PointerEvent) => { if (e.pointerType === 'mouse') hovering = true; };
    const onExit = () => { hovering = false; };
    // Phones have no pointer to lean toward, so the mark follows the device's tilt.
    const onTilt = (e: DeviceOrientationEvent) => {
        if (e.gamma == null || e.beta == null) return;
        px = Math.max(-0.5, Math.min(0.5, e.gamma / 50));
        py = Math.max(-0.5, Math.min(0.5, (e.beta - 50) / 60));
    };
    if (coarse) window.addEventListener('deviceorientation', onTilt, { passive: true });
    const onRing = () => { ringAt = performance.now() / 1000; explodeV += 3; schedule(); };
    opts.hero.addEventListener('pointermove', onMove, { passive: true });
    opts.hero.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointerenter', onEnter);
    canvas.addEventListener('pointerleave', onExit);
    canvas.addEventListener('click', onRing);

    const io = new IntersectionObserver((entries) => {
        inView = entries[0].isIntersecting;
        if (inView) schedule();
    });
    io.observe(canvas);
    const onVis = () => { if (!document.hidden) schedule(); };
    document.addEventListener('visibilitychange', onVis);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return {
        destroy() {
            cancelAnimationFrame(raf);
            io.disconnect();
            ro.disconnect();
            document.removeEventListener('visibilitychange', onVis);
            opts.hero.removeEventListener('pointermove', onMove);
            opts.hero.removeEventListener('pointerleave', onLeave);
            canvas.removeEventListener('pointerenter', onEnter);
            canvas.removeEventListener('pointerleave', onExit);
            canvas.removeEventListener('click', onRing);
            window.removeEventListener('deviceorientation', onTilt);
            geos.forEach((g) => g.dispose());
            mats.forEach((m) => m.dispose());
            envRT.dispose();
            pmrem.dispose();
            renderer.dispose();
        },
    };
}
