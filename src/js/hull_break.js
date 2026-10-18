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
// from `delay` seconds on, drifting with `drift` (units a second). Each piece is its outline and its cut edges; a frame
// draws it from the ship's raster under a clip (hull_piece_cut).
function hull_break_add(name, color, length, x, y, angle, drift, count, delay)
{
    const s = sprite(name);
    if (!full_fx || !s) {
        return;
    }
    const size = (length*256)/sprite_span;
    // the raster the ship is drawn from in the world (render): a kill comes between frames, under the screen's transform
    const px = Math.min(512, sprite_raster_px(s, size, {a: dpr*scale*zoom, b: 0}));
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

// The piece of the drawing inside `points` and its cut `edges`, drawn each frame from two tints of the ship's raster
// made once per kind (burnt dark, and glowing hot) under clips: no canvas of its own. A canvas a piece, made at each
// kill and drawn once or twice, made every frame with pieces in view several times slower to draw on a software canvas
// (bin/perf fight-w3-z100: frame p95 12 to 150 ms; on the GPU path a texture per canvas)
function hull_piece_cut(raster, size, points, edges)
{
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
    // the glow: a band along each cut, as wide as the old stroke, as a closed outline to clip by
    const band = Math.max(1.5, size*0.035);
    const bands = edges.map(function (edge) {
        const there = [];
        const back = [];
        for (let i = 0; i < edge.length; ++i) {
            const a = edge[Math.max(0, i - 1)];
            const b = edge[Math.min(edge.length - 1, i + 1)];
            const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
            const nx = (-(b.y - a.y)/d)*band;
            const ny = ((b.x - a.x)/d)*band;
            there.push({x: edge[i].x + nx, y: edge[i].y + ny});
            back.unshift({x: edge[i].x - nx, y: edge[i].y - ny});
        }
        return [...there, ...back];
    });
    return {
        burnt: sprite_tint(hull_piece_raster(raster), '#140e10', 0.45),
        hot: sprite_tint(hull_piece_raster(raster), '#ffc070', 1),
        size,
        points,
        bands,
        w: Math.min(half, right) - Math.max(-half, left),
        h: Math.min(half, bottom) - Math.max(-half, top),
    };
}

// The ship's raster at half its pixels for its pieces: a burnt piece tumbling away loses nothing by it, and a frame
// with pieces in view draws a quarter of the image bytes (the canvas holds a frame's drawing until the images it draws
// pass a limit, then draws it at once, in the middle of the frame)
const hull_piece_rasters = new WeakMap();

function hull_piece_raster(raster)
{
    let out = hull_piece_rasters.get(raster);
    if (!out) {
        out = document.createElement('canvas');
        out.width = Math.max(1, Math.round(raster.width/2));
        out.height = Math.max(1, Math.round(raster.height/2));
        out.getContext('2d').drawImage(raster, 0, 0, out.width, out.height);
        hull_piece_rasters.set(raster, out);
    }
    return out;
}

function hull_piece_path(points)
{
    for (let i = 0; i < points.length; ++i) {
        if (i) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        else {
            ctx.moveTo(points[i].x, points[i].y);
        }
    }
    ctx.closePath();
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
        ctx.beginPath();
        hull_piece_path(v.points);
        ctx.clip();
        ctx.drawImage(v.burnt, -v.size/2, -v.size/2, v.size, v.size);
        if (heat > 0) {
            // the cut edges glow hot on the hull's own pixels and cool out
            ctx.beginPath();
            for (const band of v.bands) {
                hull_piece_path(band);
            }
            ctx.clip();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = heat*heat;
            ctx.drawImage(v.hot, -v.size/2, -v.size/2, v.size, v.size);
        }
        ctx.restore();
    }
}
