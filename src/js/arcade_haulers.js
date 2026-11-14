// Haven's task in the arcade's Free kind: stop the haulers (each world gets a task of its own: arcade_tasks; Verdant's
// is arcade_nests.js). The Rim Corsairs tow the harbour's cargo away. A wave is a hauler: as it begins, a corsair
// hauler comes in at one side of the map with a string of containers in tow and runs round the harbour for the gate in
// a far corner, slower than your cruise. The wave's squadrons are its escort: while you are near it they come out
// ahead of it, on its way, else they jump ahead to you, as in any world. As its hull falls by thirds a container
// breaks off the string and bursts into salvage, thrown your way; the hauler down, the last one opens. A hauler that
// reaches its gate jumps away with what it still tows. Either way the wave's crest comes, its escort's last squadron,
// then the breather and the next hauler. After the fifth, the flagship, as in any world. Nothing fails: a pilot who
// never chases flies the world as it was, and the card counts the cargo saved.
//
// A hauler and its containers are raiders of `enemies` (their `hauler` set), so every gun, missile, pulse and blast
// finds them, the radar and the map show them, and they are solid: a ship that rams one bounces off. A container has
// no hull of its own: what hits it is taken off the hauler's. They are drawn here, not as raiders (render_enemies),
// and flown here: the hauler keeps to a way found round the rocks as it comes in (hauler_path), its string on its
// trail. The sides they come from and the gates they run for are the same every visit.

// The world's haul: ship (the hauler out now, or null), boxes (its containers in tow, the nearest to it first:
// {body (a raider), angle, n (its place in the string as it came)}), trail (where the hauler has been, the newest
// first, for the string to follow), way (its points, the gate's last), leg (the one it flies to), gate, side (where it
// came in), clock (the s it has run), due (the s its way takes) and moved_at (when it last got on, of its clock),
// heading, broken (containers off this hauler), end ('' while it runs, 'down' or 'gone') and end_at (when, time),
// near_said (its gate's warning was said), saved and taken (the world's containers so far), flying (salvage thrown
// out: {pickup, vx, vy, left}), started (the world's count has begun)
const hauler_run = {ship: null, boxes: [], trail: [], way: [], leg: 0, gate: null, side: '', clock: 0, due: 0, moved_at: 0, heading: 0, broken: 0, end: '', end_at: -Infinity, near_said: false, saved: 0, taken: 0, flying: [], started: false};
// the world that has them (Haven), how many (one a wave before the flagship's) and the containers each tows
const hauler_world = 0;
const hauler_count = arcade_free_waves - 1;
const hauler_boxes = 3;
// Where each comes in, the points it rounds the harbour by and the corner its gate is in (the portal nearest it), as
// shares of the map: the middle of a side, then along the map's rim to the far corner
const hauler_routes = [
    {side: 'WEST', from: [0.05, 0.5], via: [[0.2, 0.17], [0.5, 0.13]], gate: [0.9, 0.12]},
    {side: 'EAST', from: [0.95, 0.5], via: [[0.8, 0.83], [0.5, 0.87]], gate: [0.1, 0.88]},
    {side: 'NORTH', from: [0.5, 0.06], via: [[0.83, 0.2], [0.885, 0.5]], gate: [0.9, 0.88]},
    {side: 'SOUTH', from: [0.5, 0.94], via: [[0.17, 0.8], [0.115, 0.5]], gate: [0.1, 0.12]},
    {side: 'WEST', from: [0.05, 0.5], via: [[0.2, 0.83], [0.5, 0.87]], gate: [0.9, 0.88]},
];
// Its way between two of those points is found on a grid of this many m a cell (hauler_path): round every rock, this
// far (m) from its rim, and round the reach the depot's shield watches (depot_shield_reach) by this much more, so a
// hauler never closes the depot. A cell it should keep out of costs this many times an open one: it is crossed only
// where no way round is
const hauler_grid = 120;
const hauler_room = 60;
const hauler_depot_room = 250;
const hauler_closed_cost = 8;
// it turns this fast (rad/s) toward the next point of its way and takes the point after once within this many m; not
// 8 m on in this many s (wedged among rocks a blast threw it into), it finds its way again from where it is
const hauler_turn = 1.6;
const hauler_turn_at = 100;
const hauler_stuck = 2.5;
// How fast it runs (m/s) on CHILL, NORMAL and OVERLOAD: your cruise is 285 and its ways are 5.5 to 6.1 km, so a
// hauler nobody stops is at its gate in 61 to 68 s, 46 to 51 and 39 to 44. At 105 with a hull of 27 s the bot's
// NORMAL Haven took 5.7 min; at these with the hull below, 5.5, where the world before the haulers took 5.2
// (docs/balance.md)
const hauler_speeds = [90, 120, 140];
// Its hull: this many s of your whole kit's fire as its wave begins (arcade_base_kit_damage), times the mode's hull,
// as a raider's (arcade_modes: 1, 1.5, 1.8), and a card's factor on the raiders' hull: 15, 22.5 and 27 s; by the
// kit, as a brood nest's is (brood_nest_burn says why). The bot saves 15 containers of 15 on CHILL, 13.0 on NORMAL
// and 10.6 on OVERLOAD (8, 16 and 8 runs)
const hauler_burn = 15;
// how big the hauler and a container are (m, their hit radius), and how far behind the hauler the first container
// and each next one is towed
const hauler_size = 30;
const hauler_box_size = 20;
const hauler_tow = [72, 62];
// its escort comes out ahead of it while you are within this of it (m); farther, the squadrons warp in round you
const hauler_escort_near = 1500;
// it jumps this far (m) from its gate's ring, and its gate's warning is said this far from the jump
const hauler_jump_at = 90;
const hauler_warn_at = 700;
// the crest comes this many s after the hauler is down or gone
const hauler_crest_delay = 0.6;
// a container pays this many pieces of salvage, of this value (2 more a step of the run), thrown this far your way
// (m); a hauler down with all its containers saved, a repair too, where the mode lets repairs drop
const hauler_box_pieces = 3;
const hauler_piece_value = 3;
const hauler_throw = [70, 150];
// the world's end pays this score a container saved, and this much more for all of them
const hauler_points = 200;
const hauler_points_all = 2000;
// the hull, its top plate, its shade and outline, the cabin's glass, the engines' flame, the cable, the marks on the
// screen and the map, and each container's colour with its ribs'
const hauler_colors = {body: '#d9772b', light: '#f2a65a', dark: '#6b3413', line: '#160a04', glass: '#bdf3ff', flame: '#ffd27a', cable: '#cfd6e6', mark: '#ffb347', boxes: ['#e2b93b', '#3fb6a8', '#d25b4a'], ribs: ['#8a6d17', '#1f6e65', '#7e2e24']};

arcade_tasks[hauler_world] = {
    wave_start: haulers_wave_start,
    update: haulers_update,
    source: haulers_source,
    crest_due: haulers_crest_due,
    crest_source: haulers_crest_source,
    share: haulers_share,
    card: haulers_card,
    banner: haulers_banner,
    marks: haulers_marks,
    cleared: haulers_cleared,
    // no convoy among the waves' events here, the prize event's neither (arcade_events.js): it would be a second
    // freighter to catch beside the hauler
    events: ['ace'],
};

// A world's map is made (generate_map): no hauler is out, and the world's count starts again
function haulers_reset()
{
    const s = hauler_run;
    s.ship = null;
    s.boxes = [];
    s.trail = [];
    s.flying = [];
    s.end = '';
    s.end_at = -Infinity;
    s.saved = 0;
    s.taken = 0;
    s.started = false;
}

// How many containers the world's haulers tow in all
function haulers_cargo()
{
    return hauler_count*hauler_boxes;
}

// A hauler's hull now: hauler_burn s of the kit's fire, by the mode and a card's factor
function hauler_hull_now()
{
    return Math.max(1, Math.round(arcade_base_kit_damage()*hauler_burn*arcade_mode().hull*arcade_card_k.raider_hull));
}

function hauler_speed_now()
{
    return hauler_speeds[['chill', 'normal', 'overload'].indexOf(difficulty)] || hauler_speeds[1];
}

// A wave begins (arcade_tasks): its hauler comes in. The world's first (or the wave the dev page starts it at): the
// count from nothing, and the world says what they are; a wave reached past the first (the dev page's &wave=n) counts
// the haulers before it as stopped, their cargo saved. The flagship's wave has none
function haulers_wave_start(n)
{
    const s = hauler_run;
    haulers_clear();
    if ((n === 1) || !s.started) {
        s.started = true;
        s.saved = Math.min(n - 1, hauler_count)*hauler_boxes;
        s.taken = 0;
        show_toast('HAULERS', 'THEY TOW CARGO TO THE GATES · SHOOT ONE AND ITS CONTAINERS BREAK OFF', 4);
    }
    s.end = '';
    s.end_at = -Infinity;
    if (n < arcade_free_waves) {
        hauler_spawn(n);
    }
}

// The hauler out and its containers off the map with no kill and no show
function haulers_clear()
{
    const s = hauler_run;
    for (const body of [s.ship, ...s.boxes.map(v => v.body)]) {
        const i = enemies.indexOf(body);
        if (i >= 0) {
            enemies.splice(i, 1);
        }
    }
    s.ship = null;
    s.boxes = [];
}

// The n-th hauler: at its side, turned along its way, its string straight behind it
function hauler_spawn(n)
{
    const s = hauler_run;
    const route = hauler_routes[(n - 1) % hauler_routes.length];
    const from = {x: world.w*route.from[0], y: world.h*route.from[1]};
    const corner = {x: world.w*route.gate[0], y: world.h*route.gate[1]};
    let gate = null;
    for (const v of portals) {
        if (!gate || (distance(v, corner) < distance(gate, corner))) {
            gate = v;
        }
    }
    s.gate = gate ? {x: gate.x, y: gate.y, r: gate.r} : {x: corner.x, y: corner.y, r: 46};
    s.way = [];
    let at = from;
    for (const v of [...route.via.map(vv => ({x: world.w*vv[0], y: world.h*vv[1]})), s.gate]) {
        s.way.push(...hauler_path(at, v));
        at = v;
    }
    s.leg = 0;
    s.side = route.side;
    s.clock = 0;
    s.moved_at = 0;
    s.broken = 0;
    s.near_said = false;
    s.heading = Math.atan2(s.way[0].y - from.y, s.way[0].x - from.x);
    const ship = hauler_body('tank', 'tug', from.x, from.y, hauler_size);
    ship.hp = ship.max_hp = hauler_hull_now();
    ship.speed = hauler_speed_now();
    ship.event_kind = 'hauler';
    ship.angle = s.heading;
    s.ship = ship;
    s.due = hauler_way_left()/ship.speed;
    s.trail = [];
    for (let i = 1; i <= 30; ++i) {
        s.trail.push({x: from.x - Math.cos(s.heading)*i*8, y: from.y - Math.sin(s.heading)*i*8});
    }
    s.boxes = [];
    for (let i = 0; i < hauler_boxes; ++i) {
        // a container's hull never runs out: what it loses is taken off the hauler's (hauler_boxes_follow)
        const body = hauler_body('chaser', 'box', from.x, from.y, hauler_box_size);
        body.hp = body.max_hp = 1e12;
        s.boxes.push({body, angle: s.heading, n: i});
    }
    hauler_boxes_follow();
    ring(ship.x, ship.y, hauler_colors.mark, 220, 0.8);
    explode(ship.x, ship.y, 60, '#a8e4ff', 0, 'warp');
    show_toast('HAULER INBOUND', `FROM THE ${s.side} · ${hauler_boxes} CONTAINERS IN TOW · IT RUNS FOR A GATE`, 3.5, 'danger');
    sfx('event_danger', 1, ship);
}

// A raider that is a part of a hauler: unarmed, with no armour and no shield, its hull the task's own (the arcade
// does not scale it: arcade_scaled), and anchored: its type's way of flying moves it nowhere (arcade_role_steer), this
// file does
function hauler_body(type, part, x, y, r)
{
    const out = spawn_enemy(type);
    out.x = x;
    out.y = y;
    out.r = r;
    out.armor = 0;
    out.max_shield = 0;
    out.shield = 0;
    out.unarmed = true;
    out.anchor = true;
    out.arcade_scaled = true;
    out.hauler = part;
    return out;
}

// How far the hauler has yet to fly: to the point it flies to, then along the rest of its way
function hauler_way_left()
{
    const s = hauler_run;
    let out = 0;
    let at = s.ship || s.trail[0] || s.way[0];
    for (let i = s.leg; i < s.way.length; ++i) {
        out += distance(at, s.way[i]);
        at = s.way[i];
    }
    return out;
}

// A way from a to b for a hauler, as points, b the last: the shortest over the grid's cells (hauler_grid), eight ways
// from each, a cell to keep out of (hauler_cells_closed) costing hauler_closed_cost of an open one; then only the
// points where it turns, each the farthest one a straight line clear of closed cells reaches
function hauler_path(a, b)
{
    const size = hauler_grid;
    const cols = Math.ceil(world.w/size);
    const rows = Math.ceil(world.h/size);
    const closed = hauler_cells_closed(cols, rows);
    const start = clamp(Math.floor(a.y/size), 0, rows - 1)*cols + clamp(Math.floor(a.x/size), 0, cols - 1);
    const goal = clamp(Math.floor(b.y/size), 0, rows - 1)*cols + clamp(Math.floor(b.x/size), 0, cols - 1);
    closed[start] = 0;
    closed[goal] = 0;
    const cost = new Float32Array(cols*rows).fill(Infinity);
    const prev = new Int32Array(cols*rows).fill(-1);
    const done = new Uint8Array(cols*rows);
    const open = [start];
    cost[start] = 0;
    while (open.length) {
        // the open cell with the shortest way through it: its way so far and the straight line left
        let at = 0;
        let best = Infinity;
        for (let i = 0; i < open.length; ++i) {
            const c = open[i];
            const f = cost[c] + Math.hypot((c % cols) - (goal % cols), Math.floor(c/cols) - Math.floor(goal/cols));
            if (f < best) {
                best = f;
                at = i;
            }
        }
        const c = open[at];
        open[at] = open[open.length - 1];
        open.pop();
        if (c === goal) {
            break;
        }
        if (done[c]) {
            continue;
        }
        done[c] = 1;
        const cx = c % cols;
        const cy = Math.floor(c/cols);
        for (let k = 0; k < 9; ++k) {
            const nx = cx + (k % 3) - 1;
            const ny = cy + Math.floor(k/3) - 1;
            if ((k === 4) || (nx < 0) || (ny < 0) || (nx >= cols) || (ny >= rows) || done[ny*cols + nx]) {
                continue;
            }
            const n = ny*cols + nx;
            const g = cost[c] + (((nx !== cx) && (ny !== cy)) ? Math.SQRT2 : 1)*(closed[n] ? hauler_closed_cost : 1);
            if (g < cost[n]) {
                cost[n] = g;
                prev[n] = c;
                open.push(n);
            }
        }
    }
    const points = [];
    for (let c = goal; (c !== start) && (c >= 0); c = prev[c]) {
        points.unshift({x: ((c % cols) + 0.5)*size, y: (Math.floor(c/cols) + 0.5)*size});
    }
    points.pop();
    points.push(b);
    const out = [];
    let from = a;
    for (let i = 0; i < points.length; ++i) {
        let far = i;
        for (let k = points.length - 1; k > i; --k) {
            if (hauler_line_clear(from, points[k], closed, cols)) {
                far = k;
                break;
            }
        }
        out.push(points[far]);
        from = points[far];
        i = far;
    }
    return out;
}

// The grid's cells a hauler keeps out of (1): those whose middle is within hauler_room of a rock's rim and the
// hauler's own size, or within hauler_depot_room of the reach the depot's shield watches; and the map's rim
function hauler_cells_closed(cols, rows)
{
    const size = hauler_grid;
    const out = new Uint8Array(cols*rows);
    const discs = ore_nodes.filter(v => v.hp > 0).map(v => ({x: v.x, y: v.y, r: v.r + hauler_size + hauler_room}));
    discs.push({x: station.x, y: station.y, r: depot_shield_reach + hauler_depot_room});
    for (const disc of discs) {
        for (let cy = Math.max(0, Math.floor((disc.y - disc.r)/size)); cy <= Math.min(rows - 1, Math.floor((disc.y + disc.r)/size)); ++cy) {
            for (let cx = Math.max(0, Math.floor((disc.x - disc.r)/size)); cx <= Math.min(cols - 1, Math.floor((disc.x + disc.r)/size)); ++cx) {
                if (Math.hypot((cx + 0.5)*size - disc.x, (cy + 0.5)*size - disc.y) < disc.r) {
                    out[cy*cols + cx] = 1;
                }
            }
        }
    }
    for (let i = 0; i < cols*rows; ++i) {
        if ((i < cols) || (i >= cols*(rows - 1)) || (i % cols === 0) || (i % cols === cols - 1)) {
            out[i] = 1;
        }
    }
    return out;
}

// Whether the straight line from a to b crosses no closed cell, looked at every third of a cell
function hauler_line_clear(a, b, closed, cols)
{
    const size = hauler_grid;
    const steps = Math.ceil(distance(a, b)/(size/3));
    for (let i = 1; i < steps; ++i) {
        const x = a.x + (b.x - a.x)*i/steps;
        const y = a.y + (b.y - a.y)*i/steps;
        if (closed[Math.floor(y/size)*cols + Math.floor(x/size)]) {
            return false;
        }
    }
    return true;
}

// Each frame of the world (arcade_tasks): the salvage thrown out flies; the hauler keeps to its way, no portal taking
// it, its string behind it; what its containers were hit for comes off its hull; by thirds of that a container breaks
// off; down, it leaves its last ones; at its gate, it jumps
function haulers_update(dt)
{
    const s = hauler_run;
    hauler_pickups_fly(dt);
    const ship = s.ship;
    if (!ship) {
        return;
    }
    if (ship.hp > 0) {
        s.clock += dt;
        ship.portal_cd = 1;
        hauler_way_keep(dt);
        hauler_boxes_follow();
    }
    const cut = (ship.hp > 0) ? Math.floor((1 - ship.hp/ship.max_hp)*hauler_boxes + 1e-9) : hauler_boxes;
    while ((s.broken < cut) && s.boxes.length) {
        s.broken++;
        hauler_box_free(s.boxes.pop());
    }
    if (ship.hp <= 0) {
        hauler_down();
        return;
    }
    const left = distance(ship, s.gate) - s.gate.r - ship.r - hauler_jump_at;
    if ((s.leg === s.way.length - 1) && (left < hauler_warn_at) && !s.near_said) {
        s.near_said = true;
        show_toast('HAULER AT ITS GATE', `IT JUMPS WITH ${hauler_boxes_text(s.boxes.length)} IN A MOMENT`, 3, 'danger');
    }
    // at its gate; or, held up far past the time its way takes, from where it is
    if (((s.leg === s.way.length - 1) && (left <= 0)) || (s.clock > s.due*1.6 + 20)) {
        hauler_jump();
    }
}

// "1 container", "3 containers"
function hauler_boxes_text(n)
{
    return `${n} CONTAINER${(n === 1) ? '' : 'S'}`;
}

// The hauler flies its way: turned toward the point it flies to, the next one once this is near (the gate it flies
// right up to), on at its speed, slowed as stasis slows a raider; where it has been, a point each 8 m, for its string;
// wedged, its way again from where it is
function hauler_way_keep(dt)
{
    const s = hauler_run;
    const ship = s.ship;
    if ((s.leg < s.way.length - 1) && (distance(ship, s.way[s.leg]) < hauler_turn_at)) {
        s.leg++;
    }
    const goal = s.way[s.leg];
    const to = Math.atan2(goal.y - ship.y, goal.x - ship.x);
    s.heading += clamp(Math.atan2(Math.sin(to - s.heading), Math.cos(to - s.heading)), -hauler_turn*dt, hauler_turn*dt);
    const step = ship.speed*dt*stasis_scale(ship);
    ship.x = clamp(ship.x + Math.cos(s.heading)*step, 24, world.w - 24);
    ship.y = clamp(ship.y + Math.sin(s.heading)*step, 24, world.h - 24);
    const last = s.trail[0];
    if (distance(ship, last) >= 8) {
        // the oldest point comes round as the newest: none is made
        const p = s.trail.pop();
        p.x = ship.x;
        p.y = ship.y;
        s.trail.unshift(p);
        s.moved_at = s.clock;
    }
    else if (s.clock - s.moved_at > hauler_stuck) {
        s.moved_at = s.clock;
        s.way = hauler_path(ship, s.gate);
        s.leg = 0;
    }
}

// The string: each container on the hauler's trail, its place behind (hauler_tow), turned along it, held there
// whatever shoved it; what it was hit for this frame (the most any one of them was: a blast over the whole string
// counts once) comes off the hauler's hull
function hauler_boxes_follow()
{
    const s = hauler_run;
    const ship = s.ship;
    let most = 0;
    for (let i = 0; i < s.boxes.length; ++i) {
        const box = s.boxes[i];
        const v = box.body;
        most = Math.max(most, v.max_hp - v.hp);
        v.hp = v.max_hp;
        v.push_vx = 0;
        v.push_vy = 0;
        v.portal_cd = 1;
        let want = hauler_tow[0] + i*hauler_tow[1];
        let px = ship.x;
        let py = ship.y;
        for (let k = 0; k < s.trail.length; ++k) {
            const p = s.trail[k];
            const d = Math.sqrt((p.x - px)*(p.x - px) + (p.y - py)*(p.y - py));
            if ((d >= want) || (k === s.trail.length - 1)) {
                const f = d ? Math.min(1, want/d) : 0;
                box.angle = d ? Math.atan2(py - p.y, px - p.x) : box.angle;
                px += (p.x - px)*f;
                py += (p.y - py)*f;
                break;
            }
            want -= d;
            px = p.x;
            py = p.y;
        }
        v.x = px;
        v.y = py;
    }
    if (most > 0) {
        damage_enemy(ship, most);
    }
}

// A container off the string: gone from the map in a burst, counted as saved, its salvage thrown your way
function hauler_box_free(box)
{
    const s = hauler_run;
    const v = box.body;
    const i = enemies.indexOf(v);
    if (i >= 0) {
        enemies.splice(i, 1);
    }
    s.saved++;
    const color = hauler_colors.boxes[box.n % hauler_colors.boxes.length];
    explode(v.x, v.y, 44, color, 0, 'blast', 6, 0.12);
    burst(v.x, v.y, color, 26, 260);
    ring(v.x, v.y, color, 130, 0.45);
    label(v.x, v.y - 24, 'CARGO LOOSE', hauler_colors.mark);
    show_toast('CARGO LOOSE', `ITS SALVAGE IS YOURS · ${s.saved} OF ${haulers_cargo()} SAVED`, 2.5, 'income');
    sfx('cargo_loose', 1, v);
    hit_stop_start(0.05);
    const a = Math.atan2(player.y - v.y, player.x - v.x);
    for (let k = 0; k < hauler_box_pieces; ++k) {
        hauler_pickup_throw(v, 'artifact', hauler_piece_value + arcade_level()*2, a + (k - (hauler_box_pieces - 1)/2)*0.5);
    }
    // the last of a hauler's string, none of it lost: a repair with it
    if (!s.boxes.length && (s.broken >= hauler_boxes) && repair_drop_allowed()) {
        hauler_pickup_throw(v, 'health', 0, a + Math.PI/2);
    }
}

// A pickup out of a container at v, thrown along angle a: it lands hauler_throw m off
function hauler_pickup_throw(v, type, value, a)
{
    drop_pickup(v.x, v.y, type, value);
    const far = rand(hauler_throw[0], hauler_throw[1]);
    // it slows to a stop over 0.5 s: twice the way over that time at its start
    hauler_run.flying.push({pickup: pickups[pickups.length - 1], vx: Math.cos(a)*far*4, vy: Math.sin(a)*far*4, left: 0.5});
}

// The thrown salvage on its way, slowing to a stop, inside the map
function hauler_pickups_fly(dt)
{
    const flying = hauler_run.flying;
    for (let i = flying.length - 1; i >= 0; --i) {
        const v = flying[i];
        const step = Math.min(dt, v.left);
        const k = v.left/0.5;
        v.pickup.x = clamp(v.pickup.x + v.vx*k*step, 25, world.w - 25);
        v.pickup.y = clamp(v.pickup.y + v.vy*k*step, 25, world.h - 25);
        v.left -= step;
        if (v.left <= 0) {
            flying.splice(i, 1);
        }
    }
}

// The hauler is down (its kill's score, blast and wreck are a raider's): its wave's crest follows; the world's last
// container saved with none lost is said
function hauler_down()
{
    const s = hauler_run;
    if (s.broken >= hauler_boxes) {
        sfx('pickup', 1, s.ship);
    }
    if (s.saved >= haulers_cargo()) {
        show_toast('ALL CARGO SAVED', `EVERY CONTAINER OF THE ${hauler_count} HAULERS · ${s.saved} OF ${haulers_cargo()}`, 3.5, 'income');
        sfx('upgrade');
    }
    s.ship = null;
    s.end = 'down';
    s.end_at = time;
}

// The hauler at its gate: it jumps away with the containers it still tows, each in a flash, and the gate says what
// went with it; no score, no salvage, no blast. Its wave's crest follows
function hauler_jump()
{
    const s = hauler_run;
    const ship = s.ship;
    const count = s.boxes.length;
    explode(ship.x, ship.y, ship.r*1.6, '#a8e4ff', 0, 'warp');
    for (let i = 0; i < count; ++i) {
        explode(s.boxes[i].body.x, s.boxes[i].body.y, 30, '#a8e4ff', (i + 1)*0.08, 'warp');
    }
    ring(ship.x, ship.y, hauler_colors.mark, 260, 0.8);
    label(ship.x, ship.y - 30, `${hauler_boxes_text(count)} GONE`, hauler_colors.mark);
    sfx('portal', 1, ship);
    s.taken += count;
    haulers_clear();
    s.end = 'gone';
    s.end_at = time;
}

// Where a build-up's squadron comes from (arcade_tasks): out ahead of the hauler while you are near it; else null,
// and it warps in round you, as in any world
function haulers_source(size)
{
    const ship = hauler_run.ship;
    if (!ship || (ship.hp <= 0) || (distance(ship, player) > hauler_escort_near)) {
        return null;
    }
    ring(ship.x, ship.y, hauler_colors.mark, 170, 0.4);
    return {
        x: ship.x,
        y: ship.y,
        size,
        place: function (enemy, i) {
            hauler_escort_place(ship, enemy, i);
        },
    };
}

// An escort's place: ahead of the hauler on its way, 280 to 380 m, in a line across it, the i-th a step farther to a
// side (farther ahead still if that is within 260 m of you), turned to you, in a warp's flash: the chase flies into
// its escort. Beside the hauler on your side it came out on top of a pilot at its beam, and the bot lost 0.9 lives in
// an OVERLOAD Haven against 0.25 before the haulers (8 runs); behind it, a raider, slower than the hauler, never
// reached a pilot who kept up with it (NORMAL, 16 runs: 211 kills a world against 270, interest 63 against 69)
function hauler_escort_place(ship, enemy, i)
{
    const h = hauler_run.heading;
    const across = ((i % 2) ? 1 : -1)*Math.ceil(i/2)*70;
    let along = 280 + (i % 3)*50;
    if (Math.hypot(ship.x + Math.cos(h)*along - Math.sin(h)*across - player.x, ship.y + Math.sin(h)*along + Math.cos(h)*across - player.y) < 260) {
        along += 240;
    }
    enemy.x = clamp(ship.x + Math.cos(h)*along - Math.sin(h)*across, 40, world.w - 40);
    enemy.y = clamp(ship.y + Math.sin(h)*along + Math.cos(h)*across, 40, world.h - 40);
    enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    hauler_escort_show(enemy, i);
}

function hauler_escort_show(enemy, i)
{
    ring(enemy.x, enemy.y, enemy.color || pink, 40, 0.4);
    explode(enemy.x, enemy.y, 26, '#a8e4ff', i*0.05, 'warp');
}

// What ends a wave's build-up (arcade_tasks): its hauler is down or gone
function haulers_crest_due()
{
    const s = hauler_run;
    return !!s.end && (time - s.end_at >= hauler_crest_delay);
}

// Where the crest comes from (arcade_tasks): round you, as any wave's, with the task's word for it
function haulers_crest_source()
{
    const s = hauler_run;
    const taken = hauler_boxes - s.broken;
    return {
        x: player.x,
        y: player.y,
        place: function (enemy, i) {
            hauler_escort_show(enemy, i);
        },
        toast: (s.end === 'down')
            ? ['HAULER DOWN', 'ALL ITS CARGO SAVED · ITS ESCORT\'S LAST SQUADRON COMES']
            : ['HAULER GONE', `IT JUMPED WITH ${hauler_boxes_text(taken)} · ITS ESCORT'S LAST SQUADRON COMES`],
    };
}

// How far the wave has come to its crest (arcade_tasks): the share of its hull the hauler has lost, or of its way it
// has flown, the greater
function haulers_share()
{
    const s = hauler_run;
    if (s.end || !s.ship) {
        return 1;
    }
    return Math.max(1 - s.ship.hp/s.ship.max_hp, 1 - hauler_way_left()/Math.max(1, s.due*s.ship.speed));
}

// What the card says (arcade_tasks): the cargo saved so far, with the way to the hauler and how far it is from its
// gate; the hauler down or gone, its escort left; in the breather, what comes next; the flagship's wave is the
// flagship's
function haulers_card()
{
    if ((arcade.wave < 1) || (arcade.wave >= arcade_free_waves)) {
        return null;
    }
    const s = hauler_run;
    const count = `${s.saved} of ${haulers_cargo()}`;
    if (arcade.pause > 0) {
        return {title: (arcade.wave < hauler_count) ? `Cargo saved ${count} · next hauler soon` : `Cargo saved ${count} · now the flagship`};
    }
    if (!s.ship || (s.ship.hp <= 0)) {
        const raiders = enemies.filter(v => v.hp > 0).length;
        return {title: `Destroy its escort: ${raiders} raider${(raiders === 1) ? '' : 's'}`};
    }
    return {title: `Stop the hauler: cargo saved ${count}`, target: s.ship, eta: `hauler · gate ${radar_distance_text(distance(s.ship, s.gate))}`};
}

// What the arrival's banner says (arcade_tasks)
function haulers_banner()
{
    return {title: 'Stop the haulers', line: `${hauler_count} haulers of the ${worlds[campaign.world].faction}, cargo in tow · then its flagship`};
}

// The hauler and its gate on the map and the minimap (arcade_tasks)
function haulers_marks(add)
{
    const s = hauler_run;
    if (!s.ship || (s.ship.hp <= 0)) {
        return;
    }
    add('danger', s.ship, 'transport', hauler_colors.mark, 'HAULER · CARGO', {angle: s.heading + Math.PI/2});
    add('danger', s.gate, 'objective', hauler_colors.mark, 'ITS GATE', {small: true});
}

// The world cleared (arcade_tasks): what the cargo saved pays in score, and the cleared screen's words for it, said
// on its line after the flagship's
function haulers_cleared()
{
    const s = hauler_run;
    const all = s.saved >= haulers_cargo();
    const points = s.saved*hauler_points + (all ? hauler_points_all : 0);
    return {points, line: `${all ? 'all cargo saved' : `cargo saved ${s.saved} of ${haulers_cargo()}`}${points ? ` +${ui_number(points)}` : ''}`};
}

// A hauler's part's name on its plate (target_plate_name)
function hauler_plate_name(enemy)
{
    return (enemy.hauler === 'tug') ? 'HAULER' : 'CARGO';
}

// The hauler in view, under the raiders: its gate's ring, its way to it, the cable, the containers and the hauler;
// its hull's bar and its name come over the raiders (haulers_render_over)
function haulers_render()
{
    const s = hauler_run;
    const ship = s.ship;
    if (!ship || (ship.hp <= 0)) {
        return;
    }
    const c = hauler_colors;
    const g = s.gate;
    ctx.save();
    if (in_view(g, g.r + 60)) {
        ctx.globalAlpha = 0.5 + (full_fx ? Math.sin(clock*6)*0.25 : 0);
        ctx.strokeStyle = c.mark;
        ctx.lineWidth = 4/zoom;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.r + 30, 0, Math.PI*2);
        ctx.stroke();
        boss_duel_text('THE HAULER\'S GATE', g.x, g.y - g.r - 56, c.mark);
    }
    ctx.restore();
    if (!in_view(ship, 320)) {
        return;
    }
    ctx.save();
    // its way from here to its gate
    let from = ship;
    for (let i = s.leg; i < s.way.length; ++i) {
        boss_dash(from.x, from.y, s.way[i].x, s.way[i].y, c.mark, 0.3, 2/zoom);
        from = s.way[i];
    }
    ctx.globalAlpha = 1;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = c.cable;
    ctx.lineWidth = 2/zoom;
    ctx.beginPath();
    ctx.moveTo(ship.x, ship.y);
    for (const box of s.boxes) {
        ctx.lineTo(box.body.x, box.body.y);
    }
    ctx.stroke();
    for (const box of s.boxes) {
        hauler_box_draw(box);
    }
    hauler_draw(ship, s.heading);
    ctx.restore();
}

// Over the raiders (render): the hauler's hull as a bar in thirds once hit, and above it its name with how far its
// gate is. Both stand clear of the bracket the guns' target gets (render_target_brackets: 1.9 times its size), and no
// raider's hull or bar crosses them: under the raiders, an escort flying over the hauler struck its name through
function haulers_render_over()
{
    const s = hauler_run;
    const ship = s.ship;
    if (!ship || (ship.hp <= 0) || !in_view(ship, 320)) {
        return;
    }
    ctx.save();
    const top = ship.y - ship.r*1.9 - 12;
    const share = clamp(ship.hp/ship.max_hp, 0, 1);
    if (share < 1) {
        const w = ship.r*2.4;
        ctx.fillStyle = '#0b1222';
        ctx.fillRect(ship.x - w/2, top, w, 5);
        ctx.fillStyle = gold;
        ctx.fillRect(ship.x - w/2, top, w*share, 5);
        ctx.fillStyle = '#0b1222';
        for (let k = 1; k < hauler_boxes; ++k) {
            ctx.fillRect(ship.x - w/2 + w*k/hauler_boxes - 1/zoom, top, 2/zoom, 5);
        }
    }
    boss_duel_text(`HAULER · GATE ${radar_distance_text(distance(ship, s.gate)).toUpperCase()}`, ship.x, top - 8, hauler_colors.mark, 0.9);
    ctx.restore();
}

// The hauler, its bow along `angle`: two engines' flames, the tow arms, the hull with its outline, the top plate, a
// dark band and the cabin's glass; white for a moment when hit
function hauler_draw(ship, angle)
{
    const c = hauler_colors;
    const r = ship.r;
    const hit = ship.flash > 0;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(angle);
    ctx.lineJoin = 'round';
    const flame = r*(0.5 + (full_fx ? Math.sin(clock*31)*0.12 : 0));
    ctx.fillStyle = c.flame;
    ctx.beginPath();
    for (const side of [-1, 1]) {
        ctx.moveTo(-r*0.95, side*r*0.62);
        ctx.lineTo(-r*0.95 - flame, side*r*0.45);
        ctx.lineTo(-r*0.95, side*r*0.28);
    }
    ctx.fill();
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 3/zoom;
    ctx.fillStyle = hit ? '#ffffff' : c.dark;
    ctx.beginPath();
    ctx.rect(-r*1.15, -r*0.22, r*0.5, r*0.44);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = hit ? '#ffffff' : c.body;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(r*0.5, -r*0.66);
    ctx.lineTo(-r*0.7, -r*0.74);
    ctx.lineTo(-r*0.98, -r*0.4);
    ctx.lineTo(-r*0.98, r*0.4);
    ctx.lineTo(-r*0.7, r*0.74);
    ctx.lineTo(r*0.5, r*0.66);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (!hit) {
        ctx.fillStyle = c.light;
        ctx.beginPath();
        ctx.moveTo(r*0.62, 0);
        ctx.lineTo(r*0.34, -r*0.4);
        ctx.lineTo(-r*0.5, -r*0.46);
        ctx.lineTo(-r*0.5, r*0.46);
        ctx.lineTo(r*0.34, r*0.4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = c.dark;
        ctx.fillRect(-r*0.3, -r*0.46, r*0.2, r*0.92);
        ctx.fillStyle = c.glass;
        ctx.beginPath();
        ctx.moveTo(r*0.5, 0);
        ctx.lineTo(r*0.26, -r*0.24);
        ctx.lineTo(r*0.04, -r*0.24);
        ctx.lineTo(r*0.04, r*0.24);
        ctx.lineTo(r*0.26, r*0.24);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

// A container, along its place on the trail: a box in its colour with its outline, ribs across it and a lighter
// strip; white for a moment when hit
function hauler_box_draw(box)
{
    const c = hauler_colors;
    const v = box.body;
    const r = v.r;
    const hit = v.flash > 0;
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(box.angle);
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 3/zoom;
    ctx.fillStyle = hit ? '#ffffff' : c.boxes[box.n % c.boxes.length];
    ctx.beginPath();
    ctx.rect(-r*1.25, -r*0.72, r*2.5, r*1.44);
    ctx.fill();
    ctx.stroke();
    if (!hit) {
        ctx.fillStyle = c.ribs[box.n % c.ribs.length];
        for (let k = -2; k <= 2; ++k) {
            ctx.fillRect(k*r*0.44 - r*0.06, -r*0.72, r*0.12, r*1.44);
        }
        ctx.fillStyle = '#ffffff55';
        ctx.fillRect(-r*1.25, -r*0.5, r*2.5, r*0.2);
    }
    ctx.restore();
}

// On the screen's edge (screen px), while the hauler is out of view: the kit's marker toward it with its distance;
// none while a jammer blinds (arcade_events.js)
function haulers_render_marks()
{
    const ship = hauler_run.ship;
    if (!ship || (ship.hp <= 0) || !player || (state !== 'playing') || arcade_event_blind() || in_view(ship, 0)) {
        return;
    }
    const m = hud_edge_marker(radar_screen(ship), 40);
    if (m.offscreen) {
        draw_edge_marker(m, `HAULER · ${radar_distance_text(distance(player, ship))}`, hauler_colors.mark);
    }
}
