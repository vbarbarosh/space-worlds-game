// A ship that blows up breaks into pieces of its own hull: two or three for a raider, five for a flagship, three for
// your ship. Each piece is the ship's drawing cut along jagged lines through its middle, burnt dark, its cut edges
// glowing and cooling as it tumbles away and fades. Only with full effects, as the wrecks; the newest 24 are kept.
// Their randomness is the explosions' own (explosion_random).
let hull_pieces = [];
const hull_piece_limit = 24;

// A raster with `color` laid over its drawn pixels, `amount` of the way (a burnt hull, a dark far rock, a hull lit by
// a blast): made once per raster, colour and amount, and dropped with the rest past 96
const sprite_tints = new Map();

function sprite_tint(raster, color, amount)
{
    let by_key = sprite_tints.get(raster);
    if (!by_key) {
        if (sprite_tints.size >= 96) {
            sprite_tints.clear();
        }
        by_key = new Map();
        sprite_tints.set(raster, by_key);
    }
    const key = `${color}:${amount}`;
    let out = by_key.get(key);
    if (!out) {
        out = document.createElement('canvas');
        out.width = raster.width;
        out.height = raster.height;
        const draw = out.getContext('2d');
        draw.drawImage(raster, 0, 0);
        draw.globalCompositeOperation = 'source-atop';
        draw.globalAlpha = amount;
        draw.fillStyle = color;
        draw.fillRect(0, 0, out.width, out.height);
        by_key.set(key, out);
    }
    return out;
}

// A raider killed (kill in combat.js): its hull in pieces where it was, going the way it flew; a flagship's when its
// last blast goes off (explode_flagship)
function hull_break_enemy(enemy)
{
    const art = enemy_sprite(enemy);
    const boss = enemy.type === 'boss';
    const drift = raider_trail_velocity(enemy);
    const count = boss ? 5 : (enemy.type === 'tank') ? 3 : (enemy.type === 'shard') ? 2 : 2 + Math.floor(explosion_random()*2);
    hull_break_add(art.name, enemy.color || pink, art.length, enemy.x, enemy.y, raider_draw_angle(enemy), drift, count, boss ? 1.25 : 0);
}

// Your ship, under its last blast (explode_ship_death)
function hull_break_player()
{
    if (!player) {
        return;
    }
    const art = ship_sprite(current_ship());
    hull_break_add(art.name, null, art.length, player.x, player.y, player.angle, {x: player.vx*0.3, y: player.vy*0.3}, 3, 0.3);
}

// `count` pieces of the drawing `name` (its accent `color`) drawn `length` long at x, y turned to angle, flying apart
// from `delay` seconds on, drifting with `drift` (units a second). Each piece is cut out of the raster once, here,
// into a canvas of its own with its glowing edge beside it, so a frame draws two images a piece and clips nothing.
function hull_break_add(name, color, length, x, y, angle, drift, count, delay)
{
    const s = sprite(name);
    if (!full_fx || !s) {
        return;
    }
    const size = (length*256)/sprite_span;
    const px = Math.min(512, sprite_raster_px(s, size, ctx.getTransform()));
    const raster = sprite_raster(name, color, px);
    if (!raster) {
        return;
    }
    const r = length*0.62;
    // the cuts: jagged lines from a point near the middle out past the hull, each shared by the two pieces either side
    const start = explosion_random()*Math.PI*2;
    const middle = {x: (explosion_random() - 0.5)*r*0.25, y: (explosion_random() - 0.5)*r*0.25};
    const cuts = [];
    for (let i = 0; i < count; ++i) {
        const a = start + (i/count)*Math.PI*2 + (explosion_random() - 0.5)*(2.4/count);
        const line = [middle];
        for (let j = 1; j <= 4; ++j) {
            const d = (j < 4) ? (r*j)/3 : size;
            const off = (j < 3) ? (explosion_random() - 0.5)*r*0.35 : 0;
            line.push({x: middle.x + Math.cos(a)*d - Math.sin(a)*off, y: middle.y + Math.sin(a)*d + Math.cos(a)*off});
        }
        cuts.push({a, line});
    }
    const big = length > 150;
    for (let i = 0; i < count; ++i) {
        const one = cuts[i];
        const two = cuts[(i + 1) % count];
        const a1 = one.a;
        const a2 = (two.a > a1) ? two.a : two.a + Math.PI*2;
        // the piece: out along one cut, round past the drawing's corners, back along the next
        const points = [...one.line];
        for (let k = 1; k < 4; ++k) {
            const a = a1 + ((a2 - a1)*k)/4;
            points.push({x: middle.x + Math.cos(a)*size, y: middle.y + Math.sin(a)*size});
        }
        for (let k = two.line.length - 1; k > 0; --k) {
            points.push(two.line[k]);
        }
        const piece = hull_piece_cut(raster, size, points, [one.line, two.line]);
        // away from the middle along the piece's own bisector, in the world's frame
        const heading = angle + (a1 + a2)/2;
        const speed = length*(big ? 0.18 + explosion_random()*0.15 : 0.9 + explosion_random()*0.9);
        hull_pieces.push({
            ...piece,
            x,
            y,
            angle,
            vx: drift.x + Math.cos(heading)*speed,
            vy: drift.y + Math.sin(heading)*speed,
            spin: (explosion_random() - 0.5)*(big ? 0.5 : 4),
            t: -delay,
            duration: big ? 3.2 : 1.3 + explosion_random()*0.5,
        });
    }
    if (hull_pieces.length > hull_piece_limit) {
        hull_pieces.splice(0, hull_pieces.length - hull_piece_limit);
    }
}

// The piece of the raster (drawn `size` units wide) inside `points`, burnt darker, and its cut `edges` as a glow on
// the hull's pixels alone (no glow out in space past the hull), each in a canvas round the piece's box
function hull_piece_cut(raster, size, points, edges)
{
    const k = raster.width/size;
    const half = size/2;
    let left = half;
    let top = half;
    let right = -half;
    let bottom = -half;
    for (const point of points) {
        left = Math.min(left, point.x);
        top = Math.min(top, point.y);
        right = Math.max(right, point.x);
        bottom = Math.max(bottom, point.y);
    }
    left = Math.max(-half, left);
    top = Math.max(-half, top);
    right = Math.min(half, right);
    bottom = Math.min(half, bottom);
    const w = Math.max(1, Math.ceil((right - left)*k));
    const h = Math.max(1, Math.ceil((bottom - top)*k));
    function canvas_for(paint) {
        const out = document.createElement('canvas');
        out.width = w;
        out.height = h;
        const draw = out.getContext('2d');
        draw.scale(k, k);
        draw.translate(-left, -top);
        draw.beginPath();
        for (let i = 0; i < points.length; ++i) {
            if (i) {
                draw.lineTo(points[i].x, points[i].y);
            }
            else {
                draw.moveTo(points[i].x, points[i].y);
            }
        }
        draw.closePath();
        draw.clip();
        draw.drawImage(raster, -half, -half, size, size);
        draw.globalCompositeOperation = 'source-atop';
        paint(draw);
        return out;
    }
    const hull = canvas_for(function (draw) {
        draw.fillStyle = 'rgba(20, 14, 16, 0.45)';
        draw.fillRect(-half, -half, size, size);
    });
    const glow = canvas_for(function (draw) {
        draw.fillStyle = '#000000';
        draw.fillRect(-half, -half, size, size);
        draw.strokeStyle = '#ffb347';
        draw.lineJoin = 'round';
        draw.lineCap = 'round';
        draw.beginPath();
        for (const edge of edges) {
            draw.moveTo(edge[0].x, edge[0].y);
            for (let i = 1; i < edge.length; ++i) {
                draw.lineTo(edge[i].x, edge[i].y);
            }
        }
        draw.lineWidth = Math.max(3/k, size*0.07);
        draw.stroke();
        draw.strokeStyle = '#fff1c8';
        draw.lineWidth = Math.max(1.5/k, size*0.025);
        draw.stroke();
    });
    return {hull, glow, left, top, w: right - left, h: bottom - top};
}

function update_hull_breaks(dt)
{
    if (!hull_pieces.length) {
        return;
    }
    for (const v of hull_pieces) {
        v.t += dt;
    }
    hull_pieces = hull_pieces.filter(v => v.t < v.duration);
}

// Drawn in world units, under the blasts (render_explosions), so the fireball of the kill burns over its pieces
function render_hull_breaks()
{
    if (!hull_pieces.length) {
        return;
    }
    for (let i = 0; i < hull_pieces.length; ++i) {
        const v = hull_pieces[i];
        if (v.t < 0) {
            continue;
        }
        // drag: the pieces slow as they go, a second and a half to come almost to rest
        const travel = (1 - Math.exp(-1.6*v.t))/1.6;
        const x = v.x + v.vx*travel;
        const y = v.y + v.vy*travel;
        if (!in_view({x, y}, v.w + v.h)) {
            continue;
        }
        const p = v.t/v.duration;
        const heat = Math.max(0, 1 - p*1.8);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(v.angle + v.spin*v.t);
        ctx.globalAlpha = (p < 0.55) ? 1 : 1 - (p - 0.55)/0.45;
        ctx.drawImage(v.hull, v.left, v.top, v.w, v.h);
        if (heat > 0) {
            // the cut edges glow white-hot and cool out
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = heat*heat;
            ctx.drawImage(v.glow, v.left, v.top, v.w, v.h);
        }
        ctx.restore();
    }
}
