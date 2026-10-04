// Names in the world (the station, gates, fields, transports, the guide's marker) on dark plates, as the kit draws
// them: queued while the world is drawn, then drawn over it in screen px, each moved the shortest way out of the HUD's
// blocks and of the labels before it, and kept inside the window. A target off the screen becomes an edge marker.
const world_label_pad = 8;
let world_labels = [];

// Queue a label hanging from (x, y) in the canvas's current frame: `title` in bold, `sub` under it
function world_label(x, y, title, sub = '', color = cyan)
{
    const p = ctx.getTransform().transformPoint(new DOMPoint(x, y));
    world_labels.push({x: p.x/dpr, y: p.y/dpr, title, sub, color});
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
    const taken = [...hud_layout.rects];
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
    function inside(vx, vy) {
        return (vx - box.w/2 >= world_label_pad) && (vx + box.w/2 <= hud_layout.width - world_label_pad) && (vy >= world_label_pad) && (vy + box.h <= hud_layout.height - world_label_pad);
    }
    x = clamp(x, world_label_pad + box.w/2, hud_layout.width - world_label_pad - box.w/2);
    y = clamp(y, world_label_pad, hud_layout.height - world_label_pad - box.h);
    for (let pass = 0; pass < 8; ++pass) {
        let moved = false;
        for (const r of rects) {
            const b = {left: x - box.w/2, right: x + box.w/2, top: y, bottom: y + box.h};
            if (!hud_rects_hit(b, r)) {
                continue;
            }
            const moves = [
                {x, y: y - (b.bottom - r.top), cost: b.bottom - r.top},
                {x, y: y + (r.bottom - b.top), cost: r.bottom - b.top},
                {x: x - (b.right - r.left), y, cost: (b.right - r.left)*1.6},
                {x: x + (r.right - b.left), y, cost: (r.right - b.left)*1.6},
            ].sort(function (p, q) {
                return (inside(q.x, q.y) - inside(p.x, p.y)) || (p.cost - q.cost);
            });
            x = moves[0].x;
            y = moves[0].y;
            moved = true;
        }
        if (!moved) {
            return {x, y};
        }
    }
    // boxed in between blocks: no place for it this frame
    return null;
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
