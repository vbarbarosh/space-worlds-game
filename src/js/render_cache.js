// Cached render assets remain local to this page; gameplay and saves keep their original format.
const nebula_layers = new Map();
let last_render_state = '';
let performance_render_dirty = true;
let guide_context_cache = null;
let guide_context_cache_key = '';
// the view's size the nebula layers were drawn for: a resize event that leaves it as it was keeps them
let nebula_layers_size = '';
addEventListener('resize', function () {
    if (`${W}x${H}` !== nebula_layers_size) {
        nebula_layers_size = `${W}x${H}`;
        nebula_layers.clear();
    }
    performance_render_dirty = true;
});
function render_nebula_layer(id, sky)
{
    const key = `${id}:${W}:${H}:${world.w}:${world.h}`;
    const look = world_looks[id];
    let v = nebula_layers.get(key);
    if (!v) {
        const pad = Math.max(360, Math.ceil(Math.max(world.w, world.h)*0.025));
        const ratio = 0.5;
        const box = nebula_box(sky, pad);
        const layer = document.createElement('canvas');
        layer.width = Math.ceil((box.right - box.left)*ratio);
        layer.height = Math.ceil((box.bottom - box.top)*ratio);
        const draw = layer.getContext('2d');
        draw.scale(ratio, ratio);
        draw.translate(-box.left, -box.top);
        draw.fillStyle = look.base;
        draw.fillRect(-pad, -pad, W + pad*2, H + pad*2);
        const gradient = draw.createRadialGradient(W*0.44, H*0.45, 10, W*0.44, H*0.45, Math.max(W, H));
        gradient.addColorStop(0, worlds[id].color);
        gradient.addColorStop(0.65, look.base);
        gradient.addColorStop(1, '#02040a');
        draw.fillStyle = gradient;
        draw.fillRect(-pad, -pad, W + pad*2, H + pad*2);
        for (let i = 0, end = sky.clouds.length; i < end; ++i) {
            const cloud = sky.clouds[i];
            const x = cloud.x*W + Math.sin(cloud.phase)*35;
            const y = cloud.y*H;
            const r = cloud.r*Math.max(W, H);
            const g = draw.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, `${(i % 2) ? look.second : look.cloud}${(id === 7) ? '28' : '50'}`);
            g.addColorStop(0.5, `${(i % 2) ? look.cloud : look.second}18`);
            g.addColorStop(1, `${look.cloud}00`);
            draw.fillStyle = g;
            draw.fillRect(x - r, y - r, r*2, r*2);
        }
        nebula_bake_detail(draw, id, box);
        // Keep just the current sky to avoid retaining high-resolution buffers for every world.
        nebula_layers.clear();
        v = {layer, left: box.left, top: box.top, w: layer.width/ratio, h: layer.height/ratio};
        nebula_layers.set(key, v);
    }
    const drift = full_fx ? Math.sin(clock*0.025)*18 : 0;
    const x = v.left - camera.x*0.018 + drift;
    const y = v.top - camera.y*0.012;
    const t = ctx.getTransform();
    if (t.b || t.c) {
        // past the layer the sky is the glow's last colour
        if ((x > 0) || (y > 0) || (x + v.w < W) || (y + v.h < H)) {
            ctx.fillStyle = '#02040a';
            ctx.fillRect(0, 0, W, H);
        }
        ctx.drawImage(v.layer, x, y, v.w, v.h);
        return;
    }
    // the layer's corner on the nearest device pixel, and the copy of the window round it
    const left = Math.round(t.a*x + t.e);
    const top = Math.round(t.d*y + t.f);
    const copy = nebula_copy_for(v, t, -left, -top);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(copy.canvas, left + copy.u, top + copy.v);
    ctx.restore();
}

// The sky layer scaled to device pixels once, as the screen shows it, over the window and a margin round it, on the
// glow's last colour as the sky is past the layer: copied to the nearest device pixel each frame, as an unscaled copy
// costs the software canvas a third of a scaled one. The parallax moves it a fraction of a pixel a frame; it is drawn
// again when it takes the window past the margin. u, v: the copy's corner from the layer's, in device pixels.
let nebula_copy = null;

function nebula_copy_for(layer, t, u, v)
{
    const c = nebula_copy;
    const w = canvas.width;
    const h = canvas.height;
    if (c && (c.layer === layer) && (c.a === t.a) && (c.d === t.d) && (u >= c.u) && (v >= c.v) && (u + w <= c.u + c.canvas.width) && (v + h <= c.v + c.canvas.height)) {
        return c;
    }
    const margin = 128;
    const out = (c && (c.canvas.width === w + margin*2) && (c.canvas.height === h + margin*2)) ? c : {canvas: document.createElement('canvas')};
    out.canvas.width = w + margin*2;
    out.canvas.height = h + margin*2;
    out.layer = layer;
    out.a = t.a;
    out.d = t.d;
    out.u = u - margin;
    out.v = v - margin;
    const draw = out.canvas.getContext('2d', {alpha: false});
    draw.fillStyle = '#02040a';
    draw.fillRect(0, 0, out.canvas.width, out.canvas.height);
    draw.drawImage(layer.layer, -out.u, -out.v, t.a*layer.w, t.d*layer.h);
    nebula_copy = out;
    return out;
}

// The sky layer's box: what the parallax can bring into view and the glow and clouds colour, on the old pixel grid.
// Padding by the map's size alone made Eclipse's layer 7000 × 6500 px.
function nebula_box(sky, pad)
{
    const size = Math.max(W, H);
    let left = W*0.44 - size;
    let right = W*0.44 + size;
    let top = H*0.45 - size;
    let bottom = H*0.45 + size;
    for (const cloud of sky.clouds) {
        const x = cloud.x*W + Math.sin(cloud.phase)*35;
        const y = cloud.y*H;
        const r = cloud.r*size;
        left = Math.min(left, x - r);
        right = Math.max(right, x + r);
        top = Math.min(top, y - r);
        bottom = Math.max(bottom, y + r);
    }
    left = Math.max(-pad, left - 16, -40);
    right = Math.min(W + pad, right + 16, W + world.w*0.018 + 40);
    top = Math.max(-pad, top - 16, -40);
    bottom = Math.min(H + pad, bottom + 16, H + world.h*0.012 + 40);
    return {left: -pad + Math.floor((left + pad)/16)*16, top: -pad + Math.floor((top + pad)/16)*16, right, bottom};
}

function render_projectiles()
{
    const groups = new Map();
    function gather(items, friendly) {
        for (let i = 0, end = items.length; i < end; ++i) {
            const v = items[i];
            if ((v.life <= 0) || !in_view(v, 100)) {
                continue;
            }
            const type = v.weapon || 'plasma';
            const color = v.color || (friendly ? cyan : pink);
            const key = `${friendly ? 'f' : 'h'}${type}${color}${v.tier || 1}`;
            let group = groups.get(key);
            if (!group) {
                group = {type, color, friendly, items: []};
                groups.set(key, group);
            }
            group.items.push(v);
        }
    }
    gather(bullets, true);
    gather(hostile, false);
    // Missiles fly with their trails and blast waves (missiles.js); every other shot is a bolt along its flight, a raider's too
    missile_wakes_draw();
    missile_waves_draw();
    shot_traces_draw();
    ctx.shadowBlur = 0;
    for (const group of groups.values()) {
        ctx.lineCap = group.items[0].missile ? 'butt' : 'round';
        if (group.items[0].missile) {
            missile_group_draw(group);
        }
        else if (group.friendly) {
            shot_group_draw(group);
        }
        else {
            hostile_group_draw(group);
        }
    }
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
}

// Each gun's bolt: its tail in seconds of its flight, its white core's share of the tail and of the width, its round
// head and the glow round it in widths (no head: a streak). A plasma bolt is a hot round head with a tail, a pellet a
// short spark, a slug a long white streak, a lance long and flickering. Bright as Galaxy Attack's (the author's
// screenshots, 2026-10-21): the bolts' heads, glows and tails half again or more what they were.
const shot_looks = {
    plasma: {length: 0.032, core: 0.3, core_width: 0.75, head: 3, glow: 12},
    ion: {length: 0.025, core: 0.3, core_width: 0.8, head: 3.4, glow: 14},
    scatter: {length: 0.018, core: 0.4, core_width: 0.8, head: 2.5, glow: 9.5},
    rail: {length: 0.032, core: 0.85, core_width: 0.55, head: 0, glow: 4.5},
    // a lance as long as the way to the next one: while the gun fires, they join into a beam
    beam: {length: 0.1, core: 0.9, core_width: 0.35, head: 0, glow: 3.5},
};

// Your shots, one group at a time (render_projectiles): a glow at each head, the bolt in its colour, a white core
// along its front. A gun's higher tier burns hotter: a wider glow and a longer, wider core.
function shot_group_draw(group)
{
    const items = group.items;
    const look = shot_looks[group.type] || shot_looks.plasma;
    // A player's shot is as wide as the bore it left; a drone's or a platform's by its gun
    const bore = items[0].width;
    // a third wider than the bore with full effects: bright bolts, as Galaxy Attack's
    const width = (bore ? Math.max(1.4, bore) : (group.type === 'rail') ? 4 : (group.type === 'beam') ? 5 : 3)*(full_fx ? 1.35 : 1);
    const hot = 1 + ((items[0].tier || 1) - 1)*0.1;
    // a lance's core flickers, all of a gun's lances together, as a beam would
    const flicker = (full_fx && (group.type === 'beam')) ? 0.75 + Math.sin(clock*57)*0.25 + Math.sin(clock*23)*0.12 : 1;
    if (full_fx) {
        // the glow and the bolt's colour round its body are light, added to what is under them
        ctx.globalCompositeOperation = 'lighter';
        const glow = shot_glow(group.color);
        const r = width*look.glow*hot;
        ctx.globalAlpha = 0.9;
        for (let i = 0, end = items.length; i < end; ++i) {
            ctx.drawImage(glow, items[i].x - r, items[i].y - r, r*2, r*2);
        }
        // the bolt's colour, wide and faint, round its body; a lance's afterimage is its glow (shot_traces_draw)
        if (group.type !== 'beam') {
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = group.color;
            ctx.lineWidth = width*3.4;
            shot_path(items, 0, look.length);
            ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = group.color;
    ctx.lineWidth = width;
    shot_path(items, 0, look.length);
    ctx.stroke();
    if (look.head) {
        // a dash with round caps, barely longer than wide: the bolt's round head
        ctx.lineWidth = width*look.head*hot;
        shot_path(items, 0, 0.002);
        ctx.stroke();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = width*look.core_width*hot*flicker;
    shot_path(items, 0, look.length*Math.min(1, look.core*hot));
    ctx.stroke();
    if (full_fx && (group.type === 'ion')) {
        // an ion bolt crackles: a thin ring round its head that swells and shrinks
        const r = width*(2.2 + Math.sin(clock*41)*0.5);
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = group.color;
        ctx.lineWidth = Math.max(0.8, width*0.35);
        ctx.beginPath();
        for (let i = 0, end = items.length; i < end; ++i) {
            ctx.moveTo(items[i].x + r, items[i].y);
            ctx.arc(items[i].x, items[i].y, r, 0, Math.PI*2);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
}

// A raider's shot reads as hostile whatever the world's colour: red and pink with a little of the raider's own. A
// bolt is a lozenge, its nose ahead of the point it hits with and its tail drawn out behind; a slug a long thin streak.
function hostile_group_draw(group)
{
    const items = group.items;
    const color = hostile_shot_color(group.color);
    const rail = group.type === 'rail';
    const width = (rail ? 2.2 : (group.type === 'scatter') ? 4 : (group.type === 'ion') ? 5.4 : 5)*(full_fx ? 1.25 : 1);
    if (rail) {
        ctx.strokeStyle = color;
        if (full_fx) {
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = width*3;
            shot_path(items, 0, 0.05);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.lineWidth = width;
        shot_path(items, 0, 0.05);
        ctx.stroke();
        ctx.strokeStyle = '#ffe1ea';
        ctx.lineWidth = width*0.5;
        shot_path(items, 0, 0.03);
        ctx.stroke();
        return;
    }
    // a glow round each bolt, light added to what is under it (Galaxy Attack's bright bolts, the author's screenshots)
    if (full_fx) {
        const glow = shot_glow(color);
        const r = width*4.5;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.7;
        for (let i = 0, end = items.length; i < end; ++i) {
            ctx.drawImage(glow, items[i].x - r, items[i].y - r, r*2, r*2);
        }
        ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = color;
    hostile_lozenge_path(items, width, 1);
    // the glow: the lozenges' own outline, wide and faint, in one stroke for all of them, as dozens of raiders
    // fire at once
    if (full_fx) {
        ctx.strokeStyle = color;
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.24;
        ctx.lineWidth = width*3.6;
        ctx.stroke();
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = width*1.6;
        ctx.stroke();
        ctx.lineJoin = 'miter';
    }
    ctx.globalAlpha = 1;
    ctx.fill();
    ctx.fillStyle = '#ffe1ea';
    hostile_lozenge_path(items, width, 0.45);
    ctx.fill();
}

// Each shot's line from its head back `to` seconds of its flight (from `from`), never back past the muzzle it left
function shot_path(items, from, to)
{
    ctx.beginPath();
    for (let i = 0, end = items.length; i < end; ++i) {
        const v = items[i];
        const k = shot_tail(v, to);
        ctx.moveTo(v.x - v.vx*from, v.y - v.vy*from);
        ctx.lineTo(v.x - v.vx*k, v.y - v.vy*k);
    }
}

// A shot's tail in seconds of its flight, cut to the way it has flown from its muzzle (ox, oy) when it has one
function shot_tail(v, seconds)
{
    if (v.ox === undefined) {
        return seconds;
    }
    const dx = v.x - v.ox;
    const dy = v.y - v.oy;
    const flown = dx*dx + dy*dy;
    const tail = (v.vx*v.vx + v.vy*v.vy)*seconds*seconds;
    return (flown < tail) ? seconds*Math.sqrt(flown/tail) : seconds;
}

// The lozenges of raider bolts, `scale` of their full size: the nose a width ahead, the shoulders across the point
// they hit with, the tail three widths behind
function hostile_lozenge_path(items, width, scale)
{
    ctx.beginPath();
    for (let i = 0, end = items.length; i < end; ++i) {
        const v = items[i];
        const speed = Math.sqrt(v.vx*v.vx + v.vy*v.vy) || 1;
        const fx = v.vx/speed*width*scale;
        const fy = v.vy/speed*width*scale;
        ctx.moveTo(v.x + fx*1.3, v.y + fy*1.3);
        ctx.lineTo(v.x - fy, v.y + fx);
        ctx.lineTo(v.x - fx*3.2, v.y - fy*3.2);
        ctx.lineTo(v.x + fy, v.y - fx);
        ctx.closePath();
    }
}

// The red a raider's shot is drawn in, by the raider's colour
const hostile_shot_colors = new Map();

function hostile_shot_color(color)
{
    let v = hostile_shot_colors.get(color);
    if (!v) {
        v = /^#[0-9a-f]{6}$/i.test(color) ? color_mix('#ff3f6e', color, 0.22) : '#ff3f6e';
        hostile_shot_colors.set(color, v);
    }
    return v;
}

// A soft round glow in one colour, drawn once and stamped under every shot, flash and hit of that colour
const shot_glows = new Map();

function shot_glow(color)
{
    let v = shot_glows.get(color);
    if (!v) {
        v = document.createElement('canvas');
        v.width = v.height = 64;
        const draw = v.getContext('2d');
        const g = draw.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, color_with_alpha(color, 0.85));
        g.addColorStop(0.2, color_with_alpha(color, 0.45));
        g.addColorStop(0.5, color_with_alpha(color, 0.14));
        g.addColorStop(1, color_with_alpha(color, 0));
        draw.fillStyle = g;
        draw.fillRect(0, 0, 64, 64);
        // some colours are computed: the cache is kept small
        if (shot_glows.size >= 64) {
            shot_glows.clear();
        }
        shot_glows.set(color, v);
    }
    return v;
}

// The afterimage of a rail slug or a beam's lance: a line along the way it flew, brightest behind the shot, kept
// `fade` seconds after it is gone; a lance's fills the gap to the next one, so the beam holds from muzzle to target.
// Drawn in plain strokes, brighter in steps toward the shot: a new gradient a line a frame cost 0.6 ms each.
const shot_traces = [];
const shot_trace_limit = 40;
const shot_trace_steps = [[0.35, 0.75, 0.1], [0.75, 1, 0.3]];

function shot_trace_add(b, fade)
{
    if (!full_fx) {
        return;
    }
    shot_traces.push({b, x0: b.x, y0: b.y, x1: b.x, y1: b.y, color: b.color, width: Math.max(1.4, b.width || 2), start: clock, end: -1, fade});
    if (shot_traces.length > shot_trace_limit) {
        shot_traces.splice(0, shot_traces.length - shot_trace_limit);
    }
}

function shot_traces_draw()
{
    for (let i = shot_traces.length - 1; i >= 0; --i) {
        const v = shot_traces[i];
        if (v.end < 0) {
            v.x1 = v.b.x;
            v.y1 = v.b.y;
            // a slug dropped with the bullets (a new run, a jump) ends its trace by age
            if ((v.b.life <= 0) || (clock - v.start > 1)) {
                v.end = clock;
            }
        }
        const fade = (v.end < 0) ? 1 : 1 - (clock - v.end)/v.fade;
        if (fade <= 0) {
            shot_traces.splice(i, 1);
            continue;
        }
        const dx = v.x1 - v.x0;
        const dy = v.y1 - v.y0;
        ctx.strokeStyle = v.color;
        ctx.lineWidth = v.width*(1.2 + (1 - fade)*1.5);
        for (const [from, to, alpha] of shot_trace_steps) {
            ctx.globalAlpha = alpha*fade;
            ctx.beginPath();
            ctx.moveTo(v.x0 + dx*from, v.y0 + dy*from);
            ctx.lineTo(v.x0 + dx*to, v.y0 + dy*to);
            ctx.stroke();
        }
    }
    ctx.globalAlpha = 1;
}

function in_gravity_core(v, padding = 0)
{
    const x = v.x;
    const y = v.y;
    for (let i = 0, end = black_holes.length; i < end; ++i) {
        const h = black_holes[i];
        const dx = x - h.x;
        const dy = y - h.y;
        const r = h.core + padding;
        if ((Math.abs(dx) < r) && (Math.abs(dy) < r) && (dx*dx + dy*dy < r*r)) {
            return true;
        }
    }
    return false;
}

function guide_context()
{
    const m = focused_contract();
    const f = campaign.fleet;
    const s = (state === 'navigation') ? nav_return : state;
    const key = [
        campaign.world,
        mining_resource_revision,
        s,
        m?.id,
        m?.stage_index,
        m?.type,
        m?.world,
        Math.floor(m?.progress || 0),
        m?.ready,
        m?.scans?.join(','),
        campaign.route_world,
        campaign.tracked_id,
        guide_manual?.x,
        guide_manual?.y,
        guide_manual?.label,
        f?.ship_id,
        f?.weapon_id,
        f?.loadouts?.[f?.ship_id]?.join(','),
        Object.values(f?.weapon_levels || {}).join(','),
        salvage,
        Object.values(upgrades).join(','),
        Math.round((escort?.x || 0)/30),
        Math.round((escort?.y || 0)/30),
        Math.ceil(escort?.hp || 0),
        escort?.leg,
        Math.floor(player?.x/90),
        Math.floor(player?.y/90),
        Math.floor(time*5),
    ].join('|');
    if (guide_context_cache && (key === guide_context_cache_key)) {
        return guide_context_cache;
    }
    guide_context_cache_key = key;
    guide_context_cache = build_guide_context();
    return guide_context_cache;
}
