// Shock waves: a blast's front of air racing out from it, by its size (the author: "from something small it is small,
// next to nothing; from a big one it should really hit"). A raider's blast sends none (its own ring is enough), a
// tank's runs out about 450 m, a flagship's last blast about 2 km across the screen. Its front is a bright band with the thinned air dark
// behind it; as it passes it blows the sparks and smoke outward, and where it meets your ship it shakes the screen,
// whitens it for a moment and shoves the ship away, by the blast's strength and how far it has run.
let shock_waves = [];
// A blast this size and up sends one: a tank's, a bulwark's, a carrier's, a flagship's (a raider's is 40 to 48: only the
// blast's own ring; with them too, bin/perf's fights went from 3.5 to 27 ms a frame at p95 on a software canvas)
const shock_wave_min = 60;
// At most this many at once: the newest stay
const shock_wave_limit = 6;
// The shove a flagship's last blast gives your ship close by, m/s; a wave's strength scales it, and the distance run
const shock_wave_push = 220;

// How far a blast's wave runs (m): 1.37 × size^1.35, so 40 → 200, 72 → 440, 220 → 2000
function shock_wave_reach(size)
{
    return 1.37*Math.pow(size, 1.35);
}

// How strong a blast's wave is, 0.08 for a raider's to 1 for a flagship's last
function shock_wave_strength(size)
{
    return clamp((size - 30)/190, 0.08, 1);
}

// A blast of this size at x, y, going off in `delay` s, sends its wave
function shock_wave_add(x, y, size, delay = 0)
{
    if (size < shock_wave_min) {
        return;
    }
    shock_waves.push({
        x,
        y,
        size,
        r: 0,
        t: -delay,
        reach: shock_wave_reach(size),
        speed: 600 + size*5,
        strength: shock_wave_strength(size),
        band: 40 + size*0.9,
        hit: false,
    });
    if (shock_waves.length > shock_wave_limit) {
        shock_waves.splice(0, shock_waves.length - shock_wave_limit);
    }
}

function update_shock_waves(dt)
{
    for (const w of shock_waves) {
        w.t += dt;
        if (w.t <= 0) {
            continue;
        }
        const was = w.r;
        w.r = Math.min(w.reach, w.t*w.speed);
        const left = 1 - w.r/w.reach;
        // the sparks and smoke the front passes this frame fly on outward
        const kick = (80 + 400*w.strength)*left;
        for (const p of particles) {
            const dx = p.x - w.x;
            const dy = p.y - w.y;
            const d = Math.hypot(dx, dy);
            if ((d > was) && (d <= w.r) && (d > 0)) {
                p.vx += dx/d*kick;
                p.vy += dy/d*kick;
            }
        }
        // it meets your ship once: the screen shakes, the ship is shoved away from the blast
        if (!w.hit && player && (state === 'playing')) {
            const dx = player.x - w.x;
            const dy = player.y - w.y;
            const d = Math.hypot(dx, dy);
            if (d <= w.r) {
                w.hit = true;
                if (d < w.reach) {
                    const k = w.strength*(1 - d/w.reach);
                    shake = Math.max(shake, 3 + 22*k);
                    // a strong front whitens the screen for a moment as it passes (with full effects)
                    blast_flash = Math.max(blast_flash, 0.25*k);
                    if (d > 0) {
                        player.vx += dx/d*shock_wave_push*k;
                        player.vy += dy/d*shock_wave_push*k;
                    }
                }
            }
        }
    }
    shock_waves = shock_waves.filter(v => v.r < v.reach);
}

// Each wave in view: a bright front, its blast's light in the band behind it, and the thinned air dark behind that
function render_shock_waves()
{
    for (const w of shock_waves) {
        if ((w.t <= 0) || (w.r <= 0) || !in_view(w, w.r + w.band)) {
            continue;
        }
        const q = w.r/w.reach;
        const a = (0.3 + 0.7*w.strength)*Math.pow(1 - q, 1.1);
        if (a < 0.01) {
            continue;
        }
        const band = w.band*(1 - q*0.3);
        const inner = Math.max(0, w.r - band*1.2);
        const g = ctx.createRadialGradient(w.x, w.y, inner, w.x, w.y, w.r);
        g.addColorStop(0, 'rgba(0, 0, 0, 0)');
        g.addColorStop(0.15, `rgba(0, 0, 0, ${(0.2*a).toFixed(3)})`);
        g.addColorStop(0.4, 'rgba(0, 0, 0, 0)');
        g.addColorStop(0.85, `rgba(255, 214, 160, ${(0.12*a).toFixed(3)})`);
        g.addColorStop(0.97, `rgba(255, 248, 232, ${(0.75*a).toFixed(3)})`);
        g.addColorStop(1, 'rgba(255, 248, 232, 0)');
        ctx.save();
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI*2);
        ctx.arc(w.x, w.y, inner, 0, Math.PI*2, true);
        ctx.fill();
        ctx.restore();
    }
}

// The ripple a strong wave leaves on the picture (the author's video: a wave from the blast bends all it crosses,
// pushing it out and letting it spring back): the frame drawn so far is copied once, and for each strong wave in view
// redrawn in thin rings along the wave's band, each a little magnified about the blast, so what lies under the band
// is pushed outward by up to shock_ripple_push px and comes back as the front passes on. Only on screen: nothing in
// the world moves for it; only with full effects, and only while the frames keep up
let shock_ripple_copy = null;
// A wave this strong and up ripples the picture: a flagship's last blast (1), not a tank's (0.22): the ripple reads the
// picture back, which a fight full of tanks' waves could not afford
const shock_ripple_min = 0.5;
// The push at its strongest (a flagship's last blast, just gone off), in screen px at a zoom of 1, and the rings
const shock_ripple_push = 45;
const shock_ripple_rings = 4;
// A ring is drawn in arcs about this long, px
const shock_ripple_arc = 220;
// At most this many waves ripple in one frame: the strongest
const shock_ripple_limit = 2;

function render_shock_ripple()
{
    // it reads the picture back, which makes the canvas draw the frame there and then: on a software canvas it cost 8
    // to 10 ms for a flagship's wave at 1920 × 1080, so a machine whose frames already fall behind (the adaptive
    // resolution has stepped down, or given up) goes without it
    if (!full_fx || (resolution.level > 0) || resolution.futile) {
        return;
    }
    const waves = shock_waves.filter(v => (v.t > 0) && (v.strength >= shock_ripple_min) && in_view(v, v.r + v.band)).sort((a, b) => b.strength - a.strength).slice(0, shock_ripple_limit);
    if (!waves.length) {
        return;
    }
    if (!shock_ripple_copy) {
        shock_ripple_copy = document.createElement('canvas');
    }
    if ((shock_ripple_copy.width !== canvas.width) || (shock_ripple_copy.height !== canvas.height)) {
        shock_ripple_copy.width = canvas.width;
        shock_ripple_copy.height = canvas.height;
    }
    const copy = shock_ripple_copy.getContext('2d', {alpha: false});
    // device px: the view's transform is dpr × (ox, oy + scale × (world − camera) × zoom)
    const k = dpr*scale*zoom;
    const rings = [];
    for (const w of waves) {
        const q = w.r/w.reach;
        const push = shock_ripple_push*w.strength*Math.pow(1 - q, 1.1)*dpr*scale;
        if (push < 0.5) {
            continue;
        }
        const cx = dpr*(ox + scale*(w.x - camera.x)*zoom);
        const cy = dpr*(oy + scale*(w.y - camera.y)*zoom);
        const front = w.r*k;
        const band = Math.min(front, w.band*(1 - q*0.3)*k*0.8);
        // the ring is drawn in arcs, each in a small square of its own: a ring's own square is most of the screen, and a
        // software canvas pays for all of it (9 ms a frame for a flagship's wave)
        const arcs = clamp(Math.ceil(Math.PI*2*front/shock_ripple_arc), 8, 64);
        // only the band is copied, a push deep more inward (what the rings draw from)
        for (let j = 0; j < arcs; ++j) {
            const box = shock_ripple_arc_box(cx, cy, Math.max(0, front - band - push - 2), front + 2, j*Math.PI*2/arcs, (j + 1)*Math.PI*2/arcs);
            if (box) {
                copy.drawImage(canvas, box[0], box[1], box[2], box[3], box[0], box[1], box[2], box[3]);
            }
        }
        rings.push({cx, cy, front, band, push, arcs});
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const v of rings) {
        for (let i = 0; i < shock_ripple_rings; ++i) {
            const outer = v.front - v.band*i/shock_ripple_rings;
            const inner = Math.max(0, v.front - v.band*(i + 1)/shock_ripple_rings);
            if (outer <= 0) {
                break;
            }
            // the push swells and falls across the band, most at its middle; f magnifies about the blast
            const d = v.push*Math.sin(Math.PI*(i + 0.5)/shock_ripple_rings);
            const f = 1 + d/Math.max(1, (outer + inner)/2);
            for (let j = 0; j < v.arcs; ++j) {
                const a0 = j*Math.PI*2/v.arcs;
                const a1 = (j + 1)*Math.PI*2/v.arcs;
                const box = shock_ripple_arc_box(v.cx, v.cy, inner, outer, a0, a1);
                if (!box) {
                    continue;
                }
                ctx.save();
                ctx.beginPath();
                ctx.arc(v.cx, v.cy, outer, a0, a1);
                ctx.arc(v.cx, v.cy, inner, a1, a0, true);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(shock_ripple_copy, v.cx + (box[0] - v.cx)/f, v.cy + (box[1] - v.cy)/f, box[2]/f, box[3]/f, box[0], box[1], box[2], box[3]);
                ctx.restore();
            }
        }
    }
    ctx.restore();
}

// The square round an arc of a ring (radii inner to outer, angles a0 to a1) about cx, cy, cut to the canvas, in
// device px: [x, y, w, h], or null outside it
function shock_ripple_arc_box(cx, cy, inner, outer, a0, a1)
{
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let i = 0; i <= 4; ++i) {
        const a = a0 + (a1 - a0)*i/4;
        for (const r of [inner, outer]) {
            const x = cx + Math.cos(a)*r;
            const y = cy + Math.sin(a)*r;
            x0 = Math.min(x0, x);
            y0 = Math.min(y0, y);
            x1 = Math.max(x1, x);
            y1 = Math.max(y1, y);
        }
    }
    // the arc bulges past its corners by at most outer × (1 − cos(half its angle)): a few px
    const pad = 2 + outer*(1 - Math.cos((a1 - a0)/2));
    x0 = Math.max(0, Math.floor(x0 - pad));
    y0 = Math.max(0, Math.floor(y0 - pad));
    x1 = Math.min(canvas.width, Math.ceil(x1 + pad));
    y1 = Math.min(canvas.height, Math.ceil(y1 + pad));
    return ((x1 > x0) && (y1 > y0)) ? [x0, y0, x1 - x0, y1 - y0] : null;
}
