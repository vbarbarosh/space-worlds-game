// Names in the world (the station, gates, fields, transports, the guide's marker) on dark plates, as the kit draws
// them: queued while the world is drawn, then drawn over it in screen px, each moved the shortest way out of the HUD's
// blocks and of the labels before it, and kept inside the window. A target off the screen becomes an edge marker.
const world_label_pad = 8;
let world_labels = [];
const world_labels_taken = [];

// Queue a label hanging from (x, y) in the canvas's current frame: `title` in bold, `sub` under it
function world_label(x, y, title, sub = '', color = cyan)
{
    // the point through the canvas's matrix as DOMMatrix.transformPoint works it, with no points made for it
    const t = ctx.getTransform();
    world_labels.push({x: (x*t.a + y*t.c + t.e)/dpr, y: (x*t.b + y*t.d + t.f)/dpr, title, sub, color});
}

function render_world_labels()
{
    const labels = world_labels;
    world_labels = [];
    if (!labels.length) {
        return;
    }
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    // the HUD's blocks and the plates placed so far, in one list kept from frame to frame
    const taken = world_labels_taken;
    taken.length = 0;
    for (let i = 0; i < hud_layout.rects.length; ++i) {
        taken.push(hud_layout.rects[i]);
    }
    for (const v of labels) {
        // a thing off the window keeps its name off it too
        if ((v.x < 0) || (v.x > hud_layout.width) || (v.y < -40) || (v.y > hud_layout.height)) {
            continue;
        }
        ctx.font = world_label_font(false);
        const w = Math.max(ctx.measureText(v.title).width, v.sub ? world_label_sub_width(v.sub) : 0) + 18;
        const h = v.sub ? 31 : 20;
        const p = hud_place_label({x: v.x, y: v.y, w, h}, taken);
        if (!p) {
            continue;
        }
        taken.push({left: p.x - w/2 - 4, right: p.x + w/2 + 4, top: p.y - 4, bottom: p.y + h + 4});
        ctx.fillStyle = 'rgba(4, 8, 15, 0.66)';
        ctx.strokeStyle = 'rgba(120, 170, 220, 0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(Math.round(p.x - w/2) + 0.5, Math.round(p.y) + 0.5, Math.round(w), h, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = v.color;
        ctx.fillText(v.title, p.x, p.y + 5);
        if (v.sub) {
            ctx.font = world_label_font(true);
            ctx.fillStyle = '#8396ab';
            ctx.fillText(v.sub, p.x, p.y + 18);
        }
    }
    ctx.restore();
}

function world_label_font(sub)
{
    return sub ? '600 10px "JetBrains Mono", ui-monospace, monospace' : '700 11.5px "JetBrains Mono", ui-monospace, monospace';
}

function world_label_sub_width(text)
{
    ctx.font = world_label_font(true);
    const out = ctx.measureText(text).width;
    ctx.font = world_label_font(false);
    return out;
}

// A box ({x: its centre, y: its top, w, h}, screen px) moved out of each rectangle it touches the shortest way that
// keeps it inside the window (moving up or down is cheaper, so it reads as the label sliding off a panel); null when
// it finds no free place
function hud_place_label(box, rects)
{
    let x = box.x;
    let y = box.y;
    const half = box.w/2;
    x = clamp(x, world_label_pad + half, hud_layout.width - world_label_pad - half);
    y = clamp(y, world_label_pad, hud_layout.height - world_label_pad - box.h);
    for (let pass = 0; pass < 8; ++pass) {
        let moved = false;
        for (let i = 0; i < rects.length; ++i) {
            const r = rects[i];
            const left = x - half;
            const right = x + half;
            const bottom = y + box.h;
            if (!((left < r.right) && (right > r.left) && (y < r.bottom) && (bottom > r.top))) {
                continue;
            }
            // the four ways out, up, down, left and right, in that order: the first inside the window, the cheapest
            // of those, wins (as a stable sort of them by both would put first); worked in numbers, no list made
            let best_x = x;
            let best_y = y - (bottom - r.top);
            let best_cost = bottom - r.top;
            let best_inside = hud_label_inside(box, best_x, best_y);
            for (let way = 1; way < 4; ++way) {
                const vx = (way === 2) ? x - (right - r.left) : (way === 3) ? x + (r.right - left) : x;
                const vy = (way === 1) ? y + (r.bottom - y) : y;
                const cost = (way === 1) ? r.bottom - y : (way === 2) ? (right - r.left)*1.6 : (r.right - left)*1.6;
                const inside = hud_label_inside(box, vx, vy);
                if ((inside > best_inside) || ((inside === best_inside) && (cost < best_cost))) {
                    best_x = vx;
                    best_y = vy;
                    best_cost = cost;
                    best_inside = inside;
                }
            }
            x = best_x;
            y = best_y;
            moved = true;
        }
        if (!moved) {
            return {x, y};
        }
    }
    // boxed in between blocks: no place for it this frame
    return null;
}

// Whether a box ({w, h}) centred at vx with its top at vy is inside the window, its margin kept
function hud_label_inside(box, vx, vy)
{
    return (vx - box.w/2 >= world_label_pad) && (vx + box.w/2 <= hud_layout.width - world_label_pad) && (vy >= world_label_pad) && (vy + box.h <= hud_layout.height - world_label_pad);
}

function hud_rects_hit(a, b)
{
    return (a.left < b.right) && (a.right > b.left) && (a.top < b.bottom) && (a.bottom > b.top);
}

// Where an off-screen target's marker goes (screen px): on a frame inset from the window's edges, on the line from
// the centre to the target, walked back toward the centre until clear of the HUD
function hud_edge_marker(target, inset = 28)
{
    const cx = hud_layout.width/2;
    const cy = hud_layout.height/2;
    const angle = Math.atan2(target.y - cy, target.x - cx);
    const inside = (target.x >= inset) && (target.x <= hud_layout.width - inset) && (target.y >= inset) && (target.y <= hud_layout.height - inset);
    if (inside) {
        return {offscreen: false, x: target.x, y: target.y, angle};
    }
    const dx = target.x - cx;
    const dy = target.y - cy;
    const tx = dx ? (((dx > 0) ? hud_layout.width - inset : inset) - cx)/dx : Infinity;
    const ty = dy ? (((dy > 0) ? hud_layout.height - inset : inset) - cy)/dy : Infinity;
    const t = Math.min(tx, ty);
    let x = cx + dx*t;
    let y = cy + dy*t;
    for (let i = 0; i < 40; ++i) {
        const b = {left: x - 16, right: x + 16, top: y - 16, bottom: y + 16};
        if (!hud_layout.rects.some(v => hud_rects_hit(b, v))) {
            break;
        }
        x -= Math.cos(angle)*12;
        y -= Math.sin(angle)*12;
    }
    return {offscreen: true, x, y, angle};
}

// The kit's edge marker (screen px): a gold disc with an arrow toward the target, and its name on a pill beside it,
// on the side toward the centre
function draw_edge_marker(m, text, color = gold)
{
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '700 12px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 44;
    const left = (Math.cos(m.angle) > 0) ? m.x - w + 16 : m.x - 16;
    const x = clamp(left, 4, hud_layout.width - w - 4);
    ctx.fillStyle = 'rgba(4, 8, 15, 0.72)';
    ctx.strokeStyle = `${color}73`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + 0.5, m.y - 16 + 0.5, w, 32, 16);
    ctx.fill();
    ctx.stroke();
    const disc = (Math.cos(m.angle) > 0) ? x + w - 16 : x + 16;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(disc, m.y, 10, 0, Math.PI*2);
    ctx.fill();
    ctx.fillText(text, (Math.cos(m.angle) > 0) ? x + 12 : x + 32, m.y + 1);
    ctx.translate(disc, m.y);
    ctx.rotate(m.angle);
    ctx.fillStyle = '#2a1d00';
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(-3, -4);
    ctx.lineTo(-3, 4);
    ctx.fill();
    ctx.restore();
}

const target_names = {chaser: 'Raider', tank: 'Raider tank', shooter: 'Raider gunner', splitter: 'Raider splitter', lancer: 'Raider lancer', shard: 'Raider shard', boss: 'Flagship', interceptor: 'Raider interceptor', bulwark: 'Raider bulwark', carrier: 'Raider carrier', drone: 'Carrier drone', sniper: 'Raider sniper', minelayer: 'Raider mine-layer'};

// The name on a raider's plate: what it is to you, a goal's part by its part (arcade_goals.js), else its kind
function target_plate_name(target)
{
    if (target.leviathan) {
        return 'LEVIATHAN';
    }
    if (target.launcher) {
        return 'MISSILE LAUNCHER';
    }
    if (target.emitter) {
        return 'SHIELD EMITTER';
    }
    if (target.post) {
        return arcade_post_shielded(target) ? 'COMMAND · SHIELDED' : 'COMMAND POST';
    }
    if (target.jammer) {
        return 'JAMMER';
    }
    if (target.goal_raid) {
        return arcade_raid_plate_name(target);
    }
    // a flagship's nest (boss_duels.js)
    if (target.duel_owner) {
        return 'NEST';
    }
    return (target_names[target.type] || 'Raider').toUpperCase();
}

// The raider nearest you in a fight: red corner brackets round it, its hull under it, and its name and distance on a
// plate below (screen px; the plate joins the world's labels, so it keeps clear of the HUD)
function render_target_brackets()
{
    const target = (state === 'playing') && player ? hud_threat() : null;
    if (!target) {
        return;
    }
    const x = ox + (target.x - camera.x)*zoom*scale;
    const y = oy + (target.y - camera.y)*zoom*scale;
    const half = Math.max(18, (target.r || 16)*zoom*scale*1.9);
    if ((x < -half) || (y < -half) || (x > hud_layout.width + half) || (y > hud_layout.height + half)) {
        return;
    }
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = 'rgba(255, 77, 94, 0.9)';
    ctx.lineWidth = 2;
    const arm = Math.min(14, half*0.5);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const cx = x + sx*half;
        const cy = y + sy*half;
        ctx.beginPath();
        ctx.moveTo(cx - sx*arm, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy - sy*arm);
        ctx.stroke();
    }
    const share = clamp(target.hp/Math.max(1, target.max_hp || target.hp), 0, 1);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x - half*0.7, y + half + 6, half*1.4, 3);
    ctx.fillStyle = '#ff4d5e';
    ctx.fillRect(x - half*0.7, y + half + 6, half*1.4*share, 3);
    ctx.restore();
    const [value, unit] = hud_distance(distance(player, target));
    world_labels.push({x, y: y + half + 14, title: target_plate_name(target), sub: `${value} ${unit}`, color: '#ff8a96'});
}
