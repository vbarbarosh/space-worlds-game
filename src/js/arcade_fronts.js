// Sweeping fronts (arcade only): danger that chases. Every world from Verdant on sends its own hazard across the whole
// arena during its waves, so flying away from a fight no longer leaves the danger behind: the front spans the arena
// from edge to edge and keeps coming, and the far edge is where the radiation starts. Each is announced (a toast, then
// an edge marker with its time to you while it is off the window), drawn as it comes, and has a way through: lanes
// where it does not blow, the lee of a rock (the side away from it), or, in Ion Reach, cells that flash in turn. It
// hurts or hinders the raiders in it as it does you. Haven has none: the first world stays gentle.
// - Verdant, spore drift: a slow band of spores that eat every hull; two clear lanes.
// - Dustfall, a sandstorm: a wall of sand that grinds and shoves along; the lee of a rock, or one calm lane.
// - Ion Reach, a storm front: cells 520 m wide flash in turn, lit 2 s, dark 2 s; a lit one takes the shield and
//   charges the pulse (the world's own trade), and with the shield gone it takes hull.
// - Obsidian, a gravity surge: shoves every ship along, no hull lost (a rail world: fair); two calm lanes; in the
//   first wave only (a bot's runs died three times in the second, at the emitters, where they had not before).
// - Cryosphere, a freezing front: a wide band where engines run at 45% and raiders at 35%; two warm lanes.
// - Nova Forge, a solar flare: fast, hot and burning; only a rock's shadow keeps it off.
// - Eclipse, a tidal ripple: a ring that runs out of the black hole, drains the pulse and pushes out (away from the
//   core); three lanes; none in the flagship's wave (a rail world: fair).

// Each world's front: its name and line, the lane's tag, colour, speed (m/s), depth (m), lanes and their width (m);
// hull per second (hurt, raiders: raiders), a push along its way and a cap on speed (a share of cruise; raider_slow on
// a raider's own pace), heat, shield and pulse per second, whether a rock's lee shelters, and the waves it comes in
const arcade_front_kinds = {
    1: {id: 'spores', title: 'SPORE DRIFT', line: 'Spores eat every hull · fly through a clear lane', way: 'CLEAR LANE', color: '#c8f56a', speed: 85, width: 340, gaps: 2, gap: 300, hurt: 5, raiders: 8, sound: 'storm'},
    2: {id: 'sand', title: 'SANDSTORM', line: 'A wall of sand · shelter in a rock\'s lee or the calm lane', way: 'CALM LANE', color: '#e8b25e', speed: 130, width: 420, gaps: 1, gap: 260, hurt: 9, raiders: 9, push: 60, shelter: true, sound: 'storm'},
    3: {id: 'ion', title: 'STORM FRONT', line: 'Its cells flash in turn · cross a dark one, or charge the pulse in a lit one', color: '#8d9cff', speed: 120, width: 280, cells: 520, cycle: 4, shield_drain: 40, pulse_gain: 30, hurt: 10, raiders: 10, sound: 'storm'},
    4: {id: 'gravity', title: 'GRAVITY SURGE', line: 'It shoves every ship along · cross at a calm lane', way: 'CALM LANE', color: '#ed97cf', speed: 140, width: 300, gaps: 2, gap: 300, push: 70, waves: [1], sound: 'gravity'},
    5: {id: 'frost', title: 'FREEZING FRONT', line: 'Ice slows every engine · cross at a warm lane', way: 'WARM LANE', color: '#bfeeff', speed: 100, width: 520, gaps: 2, gap: 280, hurt: 3, slow: 0.45, raider_slow: 0.35, sound: 'storm'},
    6: {id: 'flare', title: 'SOLAR FLARE', line: 'Heat and fire · hide in a rock\'s shadow', color: '#ffad42', speed: 150, width: 340, gaps: 0, gap: 0, hurt: 10, raiders: 10, heat: 45, shelter: true, sound: 'flare'},
    7: {id: 'tide', title: 'TIDAL RIPPLE', line: 'It rings out of the black hole · cross at a lane', way: 'LANE', color: '#b98cff', ring: true, speed: 140, width: 260, gaps: 3, gap: 320, hurt: 5, raiders: 6, push: 70, pulse_drain: 25, waves: [1, 2], sound: 'gravity'},
};
// the first front of a world sets out this long into its first wave, the next this long after one is gone (s)
const arcade_front_first = 14;
const arcade_front_gap = 20;
// a front sets out this far from you (or at the arena's edge, when that is nearer), and goes this far past you (m)
const arcade_front_lead = 1700;
const arcade_front_beyond = 2000;
// how often it bites (s), and how long a rock's lee is, in the rock's radii
const arcade_front_tick = 0.5;
const arcade_front_lee = 7;
// the first lane is this far to one side of you when the front sets out (m)
const arcade_front_near_gap = [350, 800];
// Eclipse's ring waits until you are this far outside where it sets out (m: about 4 s of warning), trying again each
// second; at the anchors on the hole's rim it would be on you before its toast was read
const arcade_front_ring_lead = 600;
// an Ion Reach cell between flashes
const arcade_front_dark = '#4a5590';

// The front sweeping now, and the time until the next one sets out
let arcade_front = null;
let arcade_front_timer = 0;

function arcade_front_kind()
{
    return arcade_front_kinds[campaign.world] || null;
}

// Called from arcade_wave_start: a world's first wave (a death or a load starts there too) starts the clock again
function arcade_front_wave(n)
{
    if (n === 1) {
        arcade_front = null;
        arcade_front_timer = arcade_front_first;
    }
}

function arcade_front_stop()
{
    arcade_front = null;
}

// Called from arcade_update, between waves too: the clock, the front's way, what it does to you and the raiders in it
function arcade_front_update(dt)
{
    const kind = arcade_front_kind();
    if (!kind) {
        return;
    }
    const f = arcade_front;
    if (!f) {
        if ((kind.waves || [1, 2, 3]).includes(arcade.wave)) {
            arcade_front_timer -= dt;
            if ((arcade_front_timer <= 0) && arcade_front_ready(kind)) {
                arcade_front_launch(kind);
            }
            else if (arcade_front_timer <= 0) {
                arcade_front_timer = 1;
            }
        }
        return;
    }
    f.time += dt;
    f.pos += f.speed*dt;
    if (f.fade > 0) {
        f.fade -= dt;
        if (f.fade <= 0) {
            arcade_front = null;
            arcade_front_timer = arcade_front_gap;
        }
        return;
    }
    // gone past you, out of the arena, or into a wave it has no part in (a rail world's flagship): it fades away
    const past = (f.pos - f.width > arcade_front_at(f, player).s + arcade_front_beyond) || (f.pos - f.width > f.end);
    if (past || !(kind.waves || [1, 2, 3]).includes(arcade.wave)) {
        f.fade = 1.2;
        return;
    }
    f.rocks = kind.shelter ? arcade_front_rocks(f) : [];
    arcade_front_player(f, kind, dt);
    arcade_front_raiders(f, kind, dt);
}

// Whether a front may set out now: a ring needs you well outside the hole's rim, where it starts
function arcade_front_ready(kind)
{
    const hole = kind.ring ? black_holes[0] : null;
    return !hole || (distance(player, hole) > hole.radius*1.1 + arcade_front_ring_lead);
}

// A front sets out: a ring out of the black hole in Eclipse, elsewhere a line across the arena from a side with room
// behind you, its first lane a few hundred metres to one side of you
function arcade_front_launch(kind)
{
    const f = {id: kind.id, time: 0, fade: 0, speed: kind.speed, width: kind.width, gaps: [], tick: 0, raider_tick: 0, inside: false, safe: false, rocks: [], ring: false};
    const hole = kind.ring ? black_holes[0] : null;
    if (hole) {
        f.ring = true;
        f.x = hole.x;
        f.y = hole.y;
        f.pos = hole.radius*1.1;
        f.end = Math.max(...[[0, 0], [world.w, 0], [0, world.h], [world.w, world.h]].map(v => Math.hypot(v[0] - hole.x, v[1] - hole.y)));
        const a = Math.atan2(player.y - hole.y, player.x - hole.x);
        const side = (Math.random() < 0.5) ? -1 : 1;
        const first = a + side*rand(arcade_front_near_gap[0], arcade_front_near_gap[1])/Math.max(800, distance(player, hole));
        for (let i = 0; i < kind.gaps; ++i) {
            f.gaps.push({at: first + (i*Math.PI*2)/kind.gaps, half: kind.gap/2});
        }
    }
    else {
        const way = arcade_front_way();
        f.nx = Math.cos(way.angle);
        f.ny = Math.sin(way.angle);
        const at = arcade_front_at(f, player);
        f.pos = at.s - Math.min(arcade_front_lead, way.room + 40);
        const corners = [[0, 0], [world.w, 0], [0, world.h], [world.w, world.h]].map(v => arcade_front_at(f, {x: v[0], y: v[1]}));
        f.end = Math.max(...corners.map(v => v.s));
        const low = Math.min(...corners.map(v => v.u)) + kind.gap;
        const high = Math.max(...corners.map(v => v.u)) - kind.gap;
        const side = (Math.random() < 0.5) ? -1 : 1;
        for (let i = 0; i < kind.gaps; ++i) {
            const u = (i === 0) ? at.u + side*rand(arcade_front_near_gap[0], arcade_front_near_gap[1]) : rand(low, high);
            f.gaps.push({at: clamp(u, low, high), half: kind.gap/2});
        }
    }
    arcade_front = f;
    show_toast(kind.title, kind.line, 4, 'danger');
    sfx(kind.sound, 0.7);
}

// The way a line front comes: one of eight, turned a little, with the most room behind you up to the lead it starts at
function arcade_front_way()
{
    const ways = [];
    const turn = rand(-0.2, 0.2);
    for (let i = 0; i < 8; ++i) {
        const angle = (i*Math.PI)/4 + turn;
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        // the room behind you, against the way it comes, to the arena's edge
        const tx = (nx > 0.01) ? player.x/nx : (nx < -0.01) ? (world.w - player.x)/-nx : Infinity;
        const ty = (ny > 0.01) ? player.y/ny : (ny < -0.01) ? (world.h - player.y)/-ny : Infinity;
        ways.push({angle, room: Math.min(tx, ty)});
    }
    const roomy = ways.filter(v => v.room >= arcade_front_lead);
    if (roomy.length) {
        return roomy[Math.floor(Math.random()*roomy.length)];
    }
    return ways.reduce((a, b) => (b.room > a.room) ? b : a);
}

// Where v stands to the front: s along its way (its leading edge is at f.pos, its depth behind that), u across it (an
// angle for a ring)
function arcade_front_at(f, v)
{
    if (f.ring) {
        return {s: Math.hypot(v.x - f.x, v.y - f.y), u: Math.atan2(v.y - f.y, v.x - f.x)};
    }
    return {s: v.x*f.nx + v.y*f.ny, u: v.y*f.nx - v.x*f.ny};
}

// The way the front moves at v (a unit vector)
function arcade_front_dir(f, v)
{
    if (f.ring) {
        const d = Math.max(1, Math.hypot(v.x - f.x, v.y - f.y));
        return {x: (v.x - f.x)/d, y: (v.y - f.y)/d};
    }
    return {x: f.nx, y: f.ny};
}

// The point at s along the front's way and u across it
function arcade_front_point(f, s, u)
{
    if (f.ring) {
        return {x: f.x + Math.cos(u)*s, y: f.y + Math.sin(u)*s};
    }
    return {x: f.nx*s - f.ny*u, y: f.ny*s + f.nx*u};
}

// The lane v is in, if any: within its half width across (along the ring's arc in Eclipse)
function arcade_front_lane(f, at)
{
    for (const g of f.gaps) {
        const off = f.ring ? Math.abs(Math.atan2(Math.sin(at.u - g.at), Math.cos(at.u - g.at)))*at.s : Math.abs(at.u - g.at);
        if (off < g.half) {
            return g;
        }
    }
    return null;
}

// Whether an Ion Reach cell is lit at u: neighbours take turns, lit for the first half of the cycle
function arcade_front_lit(f, kind, u)
{
    if (!kind.cells) {
        return true;
    }
    const k = Math.floor(u/kind.cells);
    return ((f.time/kind.cycle + (((k % 2) + 2) % 2)*0.5) % 1) < 0.5;
}

// The rocks whose lee the front covers now or soon: whole ones near its depth
function arcade_front_rocks(f)
{
    const out = [];
    for (const rock of ore_nodes) {
        if (!(rock.hp > 0)) {
            continue;
        }
        const at = arcade_front_at(f, rock);
        if ((at.s > f.pos - f.width - rock.r*arcade_front_lee) && (at.s < f.pos + 900)) {
            out.push({rock, s: at.s, u: at.u});
        }
    }
    return out;
}

// The rock whose lee v is in: behind it, away from the front, within its radius across
function arcade_front_lee_of(f, at)
{
    for (const v of f.rocks) {
        const behind = at.s - v.s;
        if ((behind > 0) && (behind < v.rock.r*arcade_front_lee) && (Math.abs(at.u - v.u) < v.rock.r)) {
            return v.rock;
        }
    }
    return null;
}

// What the front does at a place: nothing outside its depth, in a lane, in a rock's lee or in a dark cell
function arcade_front_bites(f, kind, at)
{
    if ((at.s > f.pos) || (at.s < f.pos - f.width)) {
        return 'out';
    }
    if (arcade_front_lane(f, at) || (kind.shelter && arcade_front_lee_of(f, at))) {
        return 'safe';
    }
    return arcade_front_lit(f, kind, at.u) ? 'in' : 'dark';
}

function arcade_front_player(f, kind, dt)
{
    const bite = arcade_front_bites(f, kind, arcade_front_at(f, player));
    // a word where you are when it reaches you: its name, or that you are out of it
    if ((bite !== 'out') && !f.inside) {
        label(player.x, player.y - 34, (bite === 'safe') ? (kind.shelter ? 'SHELTERED' : 'IN THE LANE') : kind.title, kind.color);
        f.tick = arcade_front_tick*0.5;
    }
    f.inside = bite !== 'out';
    if (bite !== 'in') {
        return;
    }
    if (kind.push) {
        const d = arcade_front_dir(f, player);
        player.x = clamp(player.x + d.x*kind.push*dt, 24, world.w - 24);
        player.y = clamp(player.y + d.y*kind.push*dt, 24, world.h - 24);
    }
    if (kind.slow) {
        const cap = cruise_speed()*kind.slow;
        const v = Math.hypot(player.vx, player.vy);
        if (v > cap) {
            player.vx *= cap/v;
            player.vy *= cap/v;
        }
    }
    if (kind.heat) {
        player.heat = Math.min(100, (player.heat || 0) + kind.heat*dt);
        if (player.heat >= 100) {
            player.overheated = true;
        }
    }
    if (kind.pulse_drain) {
        player.energy = Math.max(0, player.energy - kind.pulse_drain*dt);
    }
    if (kind.shield_drain) {
        player.shield = Math.max(0, player.shield - kind.shield_drain*dt);
        player.energy = Math.min(100, player.energy + kind.pulse_gain*dt);
    }
    // a lit storm cell takes the shield first, and hull once it is gone
    if (!kind.hurt || (kind.shield_drain && (player.shield > 0))) {
        return;
    }
    f.tick -= dt;
    if (f.tick <= 0) {
        f.tick = arcade_front_tick;
        arcade_front_hurt(kind.hurt*arcade_front_tick);
    }
}

// A bite of the front: a hit as any other (the shield first, the mode's factor, armour), but it leaves the moment of
// grace after a hit and the shake to the raiders' hits
function arcade_front_hurt(amount)
{
    const invincible = player.invincible;
    const shaken = shake;
    damage_player(amount, false, 'front');
    if (player.hp > 0) {
        player.invincible = invincible;
        shake = Math.max(shaken, 4);
    }
}

// The raiders in it: pushed, slowed (the step each took since the last frame cut back to its share), stripped of shield
// and bitten as you are; a flagship, a goal's anchored part and a freighter keep their way
function arcade_front_raiders(f, kind, dt)
{
    f.raider_tick -= dt;
    const bite = f.raider_tick <= 0;
    if (bite) {
        f.raider_tick = arcade_front_tick;
    }
    for (const v of enemies) {
        if ((v.hp <= 0) || (v.type === 'boss') || v.anchor || v.event_goal) {
            continue;
        }
        if (kind.raider_slow && v.front_in && (v.front_x !== undefined)) {
            v.x -= (v.x - v.front_x)*(1 - kind.raider_slow);
            v.y -= (v.y - v.front_y)*(1 - kind.raider_slow);
        }
        v.front_in = arcade_front_bites(f, kind, arcade_front_at(f, v)) === 'in';
        if (v.front_in) {
            if (kind.push) {
                const d = arcade_front_dir(f, v);
                v.x = clamp(v.x + d.x*kind.push*dt, 24, world.w - 24);
                v.y = clamp(v.y + d.y*kind.push*dt, 24, world.h - 24);
            }
            if (kind.shield_drain) {
                v.shield = Math.max(0, (v.shield || 0) - kind.shield_drain*dt);
            }
            if (bite && kind.raiders) {
                damage_enemy(v, kind.raiders*arcade_front_tick);
            }
        }
        v.front_x = v.x;
        v.front_y = v.y;
    }
}

// How a pilot meets the front, for the bots (bin/playtest): the velocity to fly at (m/s), to keep to with raiders near
// (firm); null while it does not need the stick: the front far, gone or past, or only shoving (Obsidian's: the fight
// matters more), or the pilot well inside a lane or a rock's lee, where it fights on. It moves late, as a player does:
// to the nearest lane across from you or into the lee of a rock near you once that takes all the time left (and 1.5 s
// more), back to its middle when it drifts out; with no way there in time, straight through, against its way, just
// before the front reaches you.
function arcade_front_pilot()
{
    const f = arcade.active && arcade_front;
    const kind = arcade_front_kind();
    if (!f || !kind || (f.fade > 0) || !(kind.hurt || kind.slow)) {
        return null;
    }
    const at = arcade_front_at(f, player);
    const eta = (at.s - f.pos)/f.speed;
    if (at.s < f.pos - f.width - 30) {
        return null;
    }
    const speed = cruise_speed()*(kind.slow || 1);
    const spot = arcade_front_refuge(f, kind, at);
    if (spot) {
        const d = distance(spot, player);
        if (d < spot.leash) {
            return null;
        }
        const need = d/speed;
        if (need + 1.5 < eta) {
            return null;
        }
        if (need < Math.max(0, eta) + f.width/f.speed*0.5) {
            return {vx: ((spot.x - player.x)/d)*speed, vy: ((spot.y - player.y)/d)*speed, firm: true};
        }
    }
    if (eta > 1) {
        return null;
    }
    const dir = arcade_front_dir(f, player);
    return {vx: -dir.x*speed, vy: -dir.y*speed, firm: true};
}

// The safe spot nearest you, and how far from it the pilot may stray (m): in the nearest lane, level with you, a
// quarter of its width; or 30 m into the lee of the nearest rock that the front has not passed, half its radius
function arcade_front_refuge(f, kind, at)
{
    let best = null;
    let near = Infinity;
    for (const g of f.gaps) {
        const p = arcade_front_point(f, at.s, g.at);
        const d = distance(p, player);
        if (d < near) {
            near = d;
            best = {...p, leash: g.half*0.5};
        }
    }
    for (const v of kind.shelter ? f.rocks : []) {
        if (v.s < f.pos - f.width*0.5) {
            continue;
        }
        const p = arcade_front_point(f, v.s + v.rock.r + 30, v.u);
        const d = distance(p, player);
        if (d < near) {
            near = d;
            best = {...p, leash: v.rock.r*0.5};
        }
    }
    return best;
}

// The point of the front's leading edge nearest v
function arcade_front_nearest(f, v)
{
    return arcade_front_point(f, f.pos, arcade_front_at(f, v).u);
}

// The front off the window, coming: the kit's edge marker with its name and its time to you (screen px)
function render_arcade_front_marker()
{
    const f = arcade.active && arcade_front;
    if (!f || (f.fade > 0) || (state !== 'playing')) {
        return;
    }
    const at = arcade_front_at(f, player);
    const near = arcade_front_nearest(f, player);
    if ((at.s <= f.pos) || in_view(near, 0)) {
        return;
    }
    const m = hud_edge_marker(radar_screen(near), 40);
    if (m.offscreen) {
        const kind = arcade_front_kind();
        draw_edge_marker(m, `${kind.title} · ${Math.ceil((at.s - f.pos)/f.speed)} s`, kind.color);
    }
}

// The front for the map: where it will reach you, and when
function arcade_front_marks(add)
{
    const f = arcade.active && arcade_front;
    if (!f || (f.fade > 0)) {
        return;
    }
    const kind = arcade_front_kind();
    const at = arcade_front_at(f, player);
    const eta = Math.ceil((at.s - f.pos)/f.speed);
    add('danger', arcade_front_nearest(f, player), 'storm', kind.color, (eta > 0) ? `${kind.title} · ${eta} S` : kind.title);
}

// The front in the world (the camera's units), under everything that flies: its band, its leading edge bright and its
// trailing one dashed, the world's own grain in it, the lanes' posts and tags, and the lee behind each rock near it
function render_arcade_front()
{
    const f = arcade.active && arcade_front;
    if (!f) {
        return;
    }
    const kind = arcade_front_kind();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, world.w, world.h);
    ctx.clip();
    ctx.globalAlpha = Math.min(1, f.time/1.5, (f.fade > 0) ? f.fade/1.2 : 1);
    if (f.ring) {
        arcade_front_draw_ring(f, kind);
    }
    else {
        arcade_front_draw_line(f, kind);
    }
    ctx.restore();
}

// A line front, drawn in its own frame: x along its way (0 the leading edge), y across it, from the view's middle
function arcade_front_draw_line(f, kind)
{
    const middle = {x: camera.x + W/zoom/2, y: camera.y + H/zoom/2};
    const reach = Math.hypot(W, H)/zoom/2 + 60;
    const at = arcade_front_at(f, middle);
    if ((at.s > f.pos + reach) || (at.s < f.pos - f.width - reach)) {
        return;
    }
    // the stretches between the lanes, across the view
    const cuts = f.gaps.map(v => [v.at - v.half - at.u, v.at + v.half - at.u]).filter(v => (v[1] > -reach) && (v[0] < reach)).sort((a, b) => a[0] - b[0]);
    const spans = [];
    let from = -reach;
    for (const cut of cuts) {
        if (cut[0] > from) {
            spans.push([from, cut[0]]);
        }
        from = Math.max(from, cut[1]);
    }
    if (from < reach) {
        spans.push([from, reach]);
    }
    const origin = arcade_front_point(f, f.pos, at.u);
    ctx.save();
    ctx.translate(origin.x, origin.y);
    ctx.rotate(Math.atan2(f.ny, f.nx));
    for (const span of spans) {
        arcade_front_band(f, kind, span, at.u);
    }
    // a lane's posts: its two sides, a short bright bar across the band and ahead of it
    ctx.strokeStyle = kind.color;
    ctx.lineWidth = 4/zoom;
    ctx.beginPath();
    for (const cut of cuts) {
        for (const y of cut) {
            ctx.moveTo(-f.width, y);
            ctx.lineTo(60, y);
        }
    }
    ctx.stroke();
    ctx.restore();
    if (kind.shelter) {
        arcade_front_lee_draw(f, kind);
    }
    for (const g of f.gaps) {
        const p = arcade_front_point(f, f.pos + 40, g.at);
        if (in_view(p, 0)) {
            arcade_goal_tag(p.x, p.y, kind.way, kind.color);
        }
    }
}

// One stretch of a line front's band, from y0 to y1 across it: the fill, deeper toward the leading edge, the edges,
// and the grain (u0: where y = 0 is across the front, so the grain stays put on it as the view moves). Ion Reach's
// stretch is dim, its lit cells drawn over it.
function arcade_front_band(f, kind, span, u0)
{
    const [y0, y1] = span;
    const color = kind.cells ? arcade_front_dark : kind.color;
    ctx.fillStyle = `${color}${kind.cells ? '18' : '30'}`;
    ctx.fillRect(-f.width, y0, f.width, y1 - y0);
    ctx.fillStyle = `${color}${kind.cells ? '10' : '40'}`;
    ctx.fillRect(-Math.min(110, f.width), y0, Math.min(110, f.width), y1 - y0);
    ctx.strokeStyle = color;
    ctx.lineWidth = (kind.cells ? 1.5 : 3)/zoom;
    ctx.setLineDash(kind.cells ? [10/zoom, 10/zoom] : []);
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.lineTo(0, y1);
    ctx.stroke();
    ctx.lineWidth = 1/zoom;
    ctx.setLineDash([6/zoom, 14/zoom]);
    ctx.beginPath();
    ctx.moveTo(-f.width, y0);
    ctx.lineTo(-f.width, y1);
    ctx.stroke();
    ctx.setLineDash([]);
    if (kind.cells) {
        arcade_front_cells(f, kind, y0, y1, u0);
    }
    else {
        arcade_front_grain(f, kind, y0, y1, u0);
    }
}

// Ion Reach: each cell of the stretch drawn on its own, lit with arcs along its edge, dark dimmed; a dark one about to
// light flickers
function arcade_front_cells(f, kind, y0, y1, u0)
{
    const first = Math.floor((y0 + u0)/kind.cells);
    const last = Math.floor((y1 + u0)/kind.cells);
    for (let k = first; k <= last; ++k) {
        const a = Math.max(y0, k*kind.cells - u0);
        const b = Math.min(y1, (k + 1)*kind.cells - u0);
        const u = (a + b)/2 + u0;
        const lit = arcade_front_lit(f, kind, u);
        const phase = (f.time/kind.cycle + (((k % 2) + 2) % 2)*0.5) % 1;
        const soon = !lit && (phase > 0.88) && (Math.sin(clock*40) > 0);
        if (lit || soon) {
            ctx.fillStyle = `${kind.color}${lit ? '40' : '20'}`;
            ctx.fillRect(-f.width, a, f.width, b - a);
        }
        if (!lit) {
            continue;
        }
        ctx.strokeStyle = kind.color;
        ctx.lineWidth = 3/zoom;
        ctx.beginPath();
        ctx.moveTo(0, a);
        ctx.lineTo(0, b);
        ctx.stroke();
        ctx.strokeStyle = '#d8e0ff';
        ctx.lineWidth = 2/zoom;
        ctx.beginPath();
        for (let y = a, i = 0; y < b; y += 26, ++i) {
            const x = -8 - Math.abs(Math.sin(i*12.9898 + Math.floor(clock*12)*78.233))*Math.min(90, f.width*0.4);
            if (i === 0) {
                ctx.moveTo(x, y);
            }
            else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
}

// The world's grain in a stretch: spores, sand streaks, gravity chevrons, frost crystals, flare tongues; at most 70
// marks, in one path
function arcade_front_grain(f, kind, y0, y1, u0)
{
    const step = Math.max(45, (y1 - y0)/70);
    const start = Math.ceil((y0 + u0)/step)*step - u0;
    ctx.strokeStyle = `${kind.color}aa`;
    ctx.fillStyle = `${kind.color}aa`;
    ctx.lineWidth = 2/zoom;
    ctx.beginPath();
    for (let y = start; y < y1; y += step) {
        const i = Math.round((y + u0)/step);
        const r = Math.abs(Math.sin(i*12.9898)*43758.5453) % 1;
        const x = -((r*f.width + f.time*kind.speed*0.35) % f.width);
        if (kind.id === 'spores') {
            const r2 = 4 + r*6;
            const y2 = y + Math.sin(f.time + i)*12;
            ctx.moveTo(x + r2, y2);
            ctx.arc(x, y2, r2, 0, Math.PI*2);
        }
        else if (kind.id === 'sand') {
            ctx.moveTo(x, y);
            ctx.lineTo(x + 46, y + 4);
        }
        else if (kind.id === 'gravity') {
            ctx.moveTo(x - 14, y - 14);
            ctx.lineTo(x, y);
            ctx.lineTo(x - 14, y + 14);
        }
        else if (kind.id === 'frost') {
            ctx.moveTo(x - 8, y);
            ctx.lineTo(x + 8, y);
            ctx.moveTo(x, y - 8);
            ctx.lineTo(x, y + 8);
            ctx.moveTo(x - 6, y - 6);
            ctx.lineTo(x + 6, y + 6);
        }
        else {
            ctx.moveTo(-f.width*0.9*r, y);
            ctx.lineTo(18 + Math.sin(clock*9 + i)*16, y + step*0.5);
        }
    }
    if (kind.id === 'spores') {
        ctx.fill();
    }
    else {
        ctx.stroke();
    }
}

// The lee behind each rock near the front and in view, in one path: from the rock away from the front, dark and calm,
// a thin edge in the front's colour (world units)
function arcade_front_lee_draw(f, kind)
{
    ctx.fillStyle = '#04070d77';
    ctx.strokeStyle = `${kind.color}66`;
    ctx.lineWidth = 1.5/zoom;
    ctx.setLineDash([8/zoom, 8/zoom]);
    ctx.beginPath();
    for (const v of f.rocks) {
        const r = v.rock.r;
        const long = r*arcade_front_lee;
        if (!in_view(v.rock, long)) {
            continue;
        }
        const q = [
            arcade_front_point(f, v.s + r*0.5, v.u - r),
            arcade_front_point(f, v.s + long, v.u - r*0.8),
            arcade_front_point(f, v.s + long, v.u + r*0.8),
            arcade_front_point(f, v.s + r*0.5, v.u + r),
        ];
        ctx.moveTo(q[0].x, q[0].y);
        ctx.lineTo(q[1].x, q[1].y);
        ctx.lineTo(q[2].x, q[2].y);
        ctx.lineTo(q[3].x, q[3].y);
        ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
}

// Eclipse's ring: arcs between its lanes over the part in view, the leading arc bright, chevrons pointing out, the
// lanes' posts and tags
function arcade_front_draw_ring(f, kind)
{
    const middle = {x: camera.x + W/zoom/2, y: camera.y + H/zoom/2};
    const reach = Math.hypot(W, H)/zoom/2 + 60;
    const at = arcade_front_at(f, middle);
    if ((at.s > f.pos + reach) || (at.s < f.pos - f.width - reach)) {
        return;
    }
    const mid = f.pos - f.width/2;
    // the angles in view: all round when the view holds the hole, else the view's arc as seen from it
    const span = (at.s < reach) ? Math.PI : Math.min(Math.PI, Math.asin(Math.min(1, reach/at.s)) + 0.05);
    const a0 = at.u - span;
    const a1 = at.u + span;
    const cuts = [];
    for (const g of f.gaps) {
        const half = g.half/Math.max(1, mid);
        // the lane's angle brought next to the view's
        const c = at.u + Math.atan2(Math.sin(g.at - at.u), Math.cos(g.at - at.u));
        cuts.push([c - half, c + half]);
    }
    cuts.sort((a, b) => a[0] - b[0]);
    const arcs = [];
    let from = a0;
    for (const cut of cuts) {
        if ((cut[1] < a0) || (cut[0] > a1)) {
            continue;
        }
        if (cut[0] > from) {
            arcs.push([from, cut[0]]);
        }
        from = Math.max(from, cut[1]);
    }
    if (from < a1) {
        arcs.push([from, a1]);
    }
    ctx.lineWidth = f.width;
    ctx.strokeStyle = `${kind.color}30`;
    ctx.beginPath();
    for (const a of arcs) {
        ctx.moveTo(f.x + Math.cos(a[0])*mid, f.y + Math.sin(a[0])*mid);
        ctx.arc(f.x, f.y, mid, a[0], a[1]);
    }
    ctx.stroke();
    ctx.lineWidth = 3/zoom;
    ctx.strokeStyle = kind.color;
    ctx.beginPath();
    for (const a of arcs) {
        ctx.moveTo(f.x + Math.cos(a[0])*f.pos, f.y + Math.sin(a[0])*f.pos);
        ctx.arc(f.x, f.y, f.pos, a[0], a[1]);
    }
    ctx.stroke();
    ctx.lineWidth = 1/zoom;
    ctx.setLineDash([6/zoom, 14/zoom]);
    ctx.beginPath();
    for (const a of arcs) {
        ctx.moveTo(f.x + Math.cos(a[0])*(f.pos - f.width), f.y + Math.sin(a[0])*(f.pos - f.width));
        ctx.arc(f.x, f.y, f.pos - f.width, a[0], a[1]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // chevrons pointing out, every 90 m of arc, 70 at most
    const step = Math.max(90/mid, (a1 - a0)/70);
    ctx.strokeStyle = `${kind.color}aa`;
    ctx.lineWidth = 2/zoom;
    ctx.beginPath();
    for (const a of arcs) {
        for (let t = Math.ceil(a[0]/step)*step; t < a[1]; t += step) {
            const s = mid + ((f.time*40 + (Math.round(t/step)*37) % f.width) % (f.width*0.8)) - f.width*0.4;
            const p = arcade_front_point(f, s, t);
            const l = arcade_front_point(f, s - 14, t - 14/s);
            const r = arcade_front_point(f, s - 14, t + 14/s);
            ctx.moveTo(l.x, l.y);
            ctx.lineTo(p.x, p.y);
            ctx.lineTo(r.x, r.y);
        }
    }
    ctx.stroke();
    ctx.strokeStyle = kind.color;
    ctx.lineWidth = 4/zoom;
    ctx.beginPath();
    for (const cut of cuts) {
        for (const a of cut) {
            const p = arcade_front_point(f, f.pos - f.width, a);
            const q = arcade_front_point(f, f.pos + 60, a);
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
        }
    }
    ctx.stroke();
    for (const g of f.gaps) {
        const p = arcade_front_point(f, f.pos + 40, g.at);
        if (in_view(p, 0)) {
            arcade_goal_tag(p.x, p.y, kind.way, kind.color);
        }
    }
}
