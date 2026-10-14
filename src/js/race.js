// A ring race: a contract at every station (race_offer), flown through a course of rings laid out among the rocks near
// the station, against three or four rivals. The course and the rivals are the contract's own and stay in the save;
// the race itself (where everyone is, the clock) lives here and is never saved, so a load, a death or a jump ends it
// and the start line waits for the next try. Rivals fly by a ship's rules (a turn rate, a thrust, a turbo now and
// then): each aims at its own line through a ring, wide or tight by its skill, slows for the turn after it, steers
// round rocks and bumps. Raiders may go for them, and raiders' shots hurt them; your shots pass through them, as
// through the freighter, and they never shoot.

// Off the course's line by more than this, the race is forfeit after race_leash_time seconds
const race_leash = 2500;
const race_leash_time = 6;
// The rivals wait on the start line while you are this near it; flying this near your place on it lines you up
const race_grid_reach = 4000;
const race_start_reach = 260;
// A raider this near the start line holds the start: only one already there when you came (race.holders), and for
// race_hold_limit seconds of hold at most; then it pulls back
const race_raider_reach = 1100;
const race_hold_limit = 20;
// From the moment you take your place on the line to the finish no patrol or wave comes (race_calm), and a raider
// this near the course or you turns away and leaves (race_keep_off): the race is for racing. Flying past a start line
// pauses nothing.
const race_keep_clear = 1600;
const race_slot_gap = 95;
// The start line's reach from its middle: five places and a hull beyond the last
const race_start_r = Math.round(race_slot_gap*2.5 + 60);
// The seconds the race runs on after you cross the line, for the rivals still out, then the results stay a while
const race_after = 25;
const race_results_time = 8;
// A place's share of the prize, first to fifth; the last always takes the last share
const race_place_share = [1, 0.7, 0.5, 0.35, 0.2];
// A race pays a little more than its minutes, for the flying it asks
const race_premium = 1.3;
const race_names = [
    'Vex Marlow', 'Juno Kade', 'Tamsin Rook', 'Idris Vane', 'Kestrel Moon', 'Ash Okoro', 'Mara Quill', 'Sol Ferro',
    'Nyx Arden', 'Rhea Stoll', 'Lio Brand', 'Odette Lune', 'Bram Toller', 'Ines Halloway',
];
// Rival hulls from the ships' drawings, each painted in its rival's colour
const race_hulls = ['ship-interceptor', 'ship-scout', 'ship-courier', 'guard-patrol', 'ship-gunship', 'ship-miner'];
const race_colors = ['#ff8a3d', '#b48cff', '#5fd27a', '#ff5f8a', '#4fc3ff'];
const race_variants = ['sprint', 'slalom', 'loop'];
// The race as it is flown now: phase idle (none), grid (rivals on the start line), hold (raiders near the start),
// countdown, racing, done (you are over the line, the rest still racing), results (all placed, the board shows them).
// placed: you have taken your place on the line (the calm starts then); holders: the raiders at the start line when you
// took it, the only ones that may hold it; held: the seconds held;
// crashes and rock_hull: your hits on rocks and drifting debris since green, and the shield and hull they took
const race = {id: null, world: -1, course: null, phase: 'idle', clock: 0, count: 0, racers: [], leash: 0, after: 0, place: 0, prize: 0, banner: 0, nudge: 0, tags: 0, box: null, title: '', ground: null, placed: false, holders: [], held: 0, crashes: 0, rock_hull: 0};
// the nearest point of the course to a raider, worked out in place every frame (race_keep_off)
const race_near = {x: 0, y: 0};

// The rings' numbers as the minimap writes them
const race_numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

// The rings in a world's course, more in the far worlds: seven in Haven, ten in Eclipse (the author found five too
// short a race: 15 s)
function race_rings(id)
{
    return 7 + Math.floor(world_tier(id)/2);
}

// A ring's radius: tighter in the far worlds
function race_ring_r(id)
{
    return Math.round(120 - 5*world_tier(id));
}

// A generator of numbers in [0, 1) from a seed, the same every time
function race_random(seed)
{
    let s = (seed >>> 0) || 1;
    return function () {
        s = (s*1664525 + 1013904223) >>> 0;
        return s/4294967296;
    };
}

// A course's shape: rings more or fewer than the world's, a ring's radius wider or tighter, legs longer or shorter,
// turns sharper or gentler, and how much a leg seeks the rocks (below 0 it keeps clear of them). The campaign's races
// keep this one; the Races mode has one per difficulty (race_mode_levels).
const race_shape_campaign = {rings: 0, r: 0, leg: 1.1, turn: 1, rocks: 1};

// The race a station offers: this world's course (one of three, by the board), its rivals, and the prize for the
// first place at par time as the contract's reward; null where no course fits
function race_offer(id, level)
{
    const variant = (campaign.board || 0) % race_variants.length;
    const course = race_course_make(id, variant);
    if (!course) {
        return null;
    }
    const rivals = race_rivals_make(id, variant, level);
    const n = course.rings.length;
    const stages = [stage('race', id, n, `Race ${n} rings against ${rivals.length} rivals`)];
    const top = contract_reward(stages, id, level, race_premium);
    const last = race_prize(top, rivals.length + 1, rivals.length + 1, course.par, course.par);
    const w = worlds[id];
    return {
        title: `Ring race: ${w.name} ${race_variants[variant]}`,
        description: `${n} rings through the rocks off ${w.station}, ${(course.length/1000).toFixed(1)} km, against ${rivals.map(v => v.name).join(', ')}. First at par time pays ◆ ${top}, the last over the line ◆ ${last}; every second under par pays more. Flying far off the course, docking or a jump forfeits.`,
        race: {...course, variant, rivals, top},
        premium: race_premium,
        stages,
    };
}

// The prize for a place of `count` at a time: the place's share, more the faster against par (a quarter more at most,
// a quarter less at least), to the nearest 10, never under 10
function race_prize(top, place, count, time, par)
{
    const share = (place >= count) ? race_place_share[race_place_share.length - 1] : race_place_share[place - 1];
    const pace = clamp(par/Math.max(1, time), 0.75, 1.25);
    return Math.max(10, Math.round((top*share*pace)/10)*10);
}

// The course: a start line out of the shelter, then rings one to two kilometres apart, each turned off the line
// before it to the other side, among the rocks where it can; every ring clear of the station, gates, portals,
// beacons, gravity, rocks and structures (race_spot_clear), every leg clear of gravity, portals and the station. The
// shape (race_shape_campaign) scales the numbers, never the dice: the campaign's courses stay as they were. accept, when
// given, may turn a course down, and the next try is made (the Turbo kind's track must be clear edge to edge).
function race_course_make(id, variant, shape = race_shape_campaign, accept = null)
{
    const n = clamp(race_rings(id) + shape.rings, 3, race_numbers.length);
    const r = race_ring_r(id) + shape.r;
    const random = race_random((id + 1)*7919 + variant*104729);
    const fields = mining_fields.filter(v => ore_nodes.some(vv => (vv.hp > 0) && (vv.field === v.id))).sort((a, b) => distance(a, station) - distance(b, station));
    const toward = fields[0] ? Math.atan2(fields[0].y - station.y, fields[0].x - station.x) : 0;
    for (let attempt = 0; attempt < 12; ++attempt) {
        const a0 = toward + variant*2.1 + attempt*0.55;
        const away = station_shelter + 650 + random()*400;
        const start = {x: station.x + Math.cos(a0)*away, y: station.y + Math.sin(a0)*away};
        if (!race_spot_clear(start, race_start_r)) {
            continue;
        }
        const rings = [];
        let prev = start;
        let heading = a0 + (random() - 0.5)*0.6;
        let side = (random() < 0.5) ? 1 : -1;
        for (let i = 0; i < n; ++i) {
            let best = null;
            let best_score = -Infinity;
            for (let t = 0; t < 90; ++t) {
                // the first ring nearly straight out; then a turn of 30 to 75 degrees, mostly to the other side
                const turn = (i === 0) ? (random() - 0.5)*0.5 : side*((t < 60) ? 1 : -1)*(0.55 + random()*0.75)*shape.turn;
                const length = (1050 + random()*650)*shape.leg;
                const p = {x: prev.x + Math.cos(heading + turn)*length, y: prev.y + Math.sin(heading + turn)*length};
                if (!race_spot_clear(p, r) || !race_leg_clear(prev, p) || [start, ...rings].some(v => distance(v, p) < ((v === start) ? race_start_r : r) + r + 300)) {
                    continue;
                }
                const score = race_spot_score(prev, p, shape.rocks) + random()*0.6;
                if (score > best_score) {
                    best = p;
                    best_score = score;
                }
            }
            if (!best) {
                break;
            }
            heading = Math.atan2(best.y - prev.y, best.x - prev.x);
            side = (random() < 0.8) ? -side : side;
            rings.push(best);
            prev = best;
        }
        if (rings.length === n) {
            const length = [start, ...rings].reduce((sum, v, i, list) => sum + (i ? distance(list[i - 1], v) : 0), 0);
            const angle = Math.atan2(rings[0].y - start.y, rings[0].x - start.x);
            const out = {
                start: {x: Math.round(start.x), y: Math.round(start.y), angle},
                start_r: race_start_r,
                rings: rings.map(v => ({x: Math.round(v.x), y: Math.round(v.y)})),
                r,
                length: Math.round(length),
                par: race_par(id, length, n),
            };
            if (!accept || accept(out)) {
                return out;
            }
        }
    }
    return null;
}

// Par time: the course at the pace of a good rival, a little more for each turn
function race_par(id, length, n)
{
    return Math.round((length/(race_pace(id, 1)*1.4) + 0.6*n)*10)/10;
}

// A rival's cruising speed: a world's own pace, faster in the far worlds and a little with the board's level; skill
// from 0 (the slowest) to 1
function race_pace(id, skill, level = 1)
{
    return 285*world_rules[id].speed*(1 + 0.06*world_tier(id) + 0.01*(level - 1))*(0.9 + 0.3*skill);
}

// A point of the course is clear: inside the map, out of the station's shelter, 150 m beyond the reach of every gate,
// portal and beacon, out of every gravity pull, and a ship's width clear of rocks, drifting debris and structures (with
// rocks false, of structures only: the Turbo race clears the rocks off its track)
function race_spot_clear(p, r, rocks = true)
{
    const margin = 150;
    const ship = race_ship_width();
    if ((p.x < r + 400) || (p.y < r + 400) || (p.x > world.w - r - 400) || (p.y > world.h - r - 400)) {
        return false;
    }
    if (distance(p, station) < station_shelter + r + margin) {
        return false;
    }
    if (world_gates.some(v => distance(p, v) < gate_reach + r + margin)) {
        return false;
    }
    if (portals.some(v => distance(p, v) < v.r + ship/2 + r + margin)) {
        return false;
    }
    if (beacons.some(v => distance(p, v) < 120 + r + margin)) {
        return false;
    }
    if (!arcade.active && (distance(p, combat_zone) < 600 + r)) {
        return false;
    }
    if (black_holes.some(v => distance(p, v) < gravity_reach(v) + r + 100)) {
        return false;
    }
    if (rocks && ore_nodes.some(v => (v.hp > 0) && (distance(p, v) < v.r + r + ship))) {
        return false;
    }
    if (rocks && drifting_debris.some(v => distance(p, v) < v.r + r + ship)) {
        return false;
    }
    return !structures_here().some(v => distance(p, v) < structure_kinds[v.kind].size*0.5 + r + ship);
}

// Twice the widest hull's radius: the room a ship needs beside a solid
function race_ship_width()
{
    return 2*Math.max(...ship_catalog.map(v => v.radius));
}

// A leg of the course is clear: it never crosses a gravity pull, a portal's ring or the station
function race_leg_clear(a, b)
{
    if (black_holes.some(v => segment_distance(v, a, b) < gravity_reach(v) + 60)) {
        return false;
    }
    if (portals.some(v => segment_distance(v, a, b) < v.r + race_ship_width() + 40)) {
        return false;
    }
    return segment_distance(station, a, b) > station_size/2 + 250;
}

// How good a ring is, from the one before: rocks along the leg (to steer round) and round the ring, by how much the
// shape seeks them, the nearer the station the better
function race_spot_score(a, b, rocks = 1)
{
    let along = 0;
    let round = 0;
    for (const v of ore_nodes) {
        if (v.hp <= 0) {
            continue;
        }
        if (segment_distance(v, a, b) < v.r + 240) {
            along++;
        }
        if (distance(v, b) < 500) {
            round++;
        }
    }
    return (Math.min(6, along) + Math.min(3, round)*0.5)*rocks - Math.max(0, distance(b, station) - 5000)/1000;
}

// The rivals of a race: three in the first worlds, four from Dustfall on (or `count`), from the slowest to the best
// (their skill spread over `skills`, 0 to 1), each with a name, a hull and a colour
function race_rivals_make(id, variant, level, count = (world_tier(id) < 2) ? 3 : 4, skills = [0, 1])
{
    const random = race_random((id + 3)*3571 + variant*613 + level*31);
    const names = race_names.slice();
    const hulls = race_hulls.slice();
    const out = [];
    for (let i = 0; i < count; ++i) {
        const name = names.splice(Math.floor(random()*names.length), 1)[0];
        const hull = hulls.splice(Math.floor(random()*hulls.length), 1)[0];
        const skill = clamp(skills[0] + (skills[1] - skills[0])*(i/(count - 1)) + (random() - 0.5)*0.1, 0, 1);
        out.push({name, hull, color: race_colors[i], skill: Math.round(skill*100)/100});
    }
    return out;
}

// The race contract of this world, not yet flown to its end
function race_contract()
{
    // asked every frame: a loop, no callback made for it
    for (const v of campaign.contracts) {
        if ((v.type === 'race') && !v.ready && (v.world === campaign.world) && v.race) {
            return v;
        }
    }
    return null;
}

// The race is under way: lined up and counting down, or racing
function race_running()
{
    return (race.phase === 'countdown') || (race.phase === 'racing');
}

// Green has been given: the places mean something
function race_started()
{
    return ['racing', 'done', 'results'].includes(race.phase);
}

// Every frame in flight: the rivals come to the start line as you near it, you are lined up, the count runs, the
// race runs, and it ends
function race_update(dt)
{
    if (race_mode.active) {
        race_mode_update(dt);
    }
    const m = race_contract();
    // you left the race's world, or its contract is gone
    if (race.id && (campaign.world !== race.world)) {
        if (race_running()) {
            race_forfeit(`You left ${worlds[race.world].name}`);
        }
        else {
            race_reset();
        }
    }
    else if (race.id && ['grid', 'hold', 'countdown', 'racing'].includes(race.phase) && (!m || (m.id !== race.id))) {
        if (race_running()) {
            race_forfeit('The contract was dropped');
        }
        else {
            race_reset();
        }
    }
    if (race.phase !== 'idle') {
        race_fade(dt);
    }
    if (race.phase === 'done') {
        race_after_update(dt);
        return;
    }
    if (race.phase === 'results') {
        race.after -= dt;
        if (race.after <= 0) {
            race_reset();
        }
        return;
    }
    if (!m) {
        return;
    }
    const course = m.race;
    if (race.phase === 'idle') {
        if (distance(player, course.start) < race_grid_reach) {
            race_grid_set(m);
        }
        return;
    }
    race_nudge(dt);
    if ((race.phase === 'grid') || (race.phase === 'hold')) {
        race_idle(dt);
        if (distance(player, course.start) > race_grid_reach + 500) {
            race_reset();
            return;
        }
        const you = race_you();
        if (race.phase === 'hold') {
            race_hold_time(dt);
            if (!race_raiders_near()) {
                race.phase = 'grid';
            }
            return;
        }
        if (distance(player, you.slot) < race_start_reach) {
            race_place_taken();
            if (race_raiders_near()) {
                race.phase = 'hold';
                show_toast('START HELD', 'RAIDERS NEAR THE START LINE · CLEAR THEM AND IT GOES', 3);
                return;
            }
            race.phase = 'countdown';
            race.count = 3;
            race.banner = 4;
            guide_flying = false;
            waypoints_clear();
            mouse_drive.active = false;
        }
        return;
    }
    if (race.phase === 'countdown') {
        race_idle(dt);
        if (race_raiders_near()) {
            race_hold_time(dt);
            race.phase = 'hold';
            show_toast('START HELD', 'RAIDERS NEAR THE START LINE · CLEAR THEM AND IT GOES', 3);
            return;
        }
        race.count -= dt;
        const second = Math.ceil(race.count);
        if (second < race.banner) {
            race.banner = second;
            // the count is in the world over the lights, and on the card; the beep marks each second
            if (second > 0) {
                sfx('countdown');
            }
        }
        if (race.count <= 0) {
            race_go(m);
        }
        return;
    }
    // racing
    race.clock += dt;
    if (race_rail_on()) {
        race_rail_update(m, dt);
        race_tags(dt);
        return;
    }
    race_you_update(m, dt);
    for (const v of race.racers) {
        if (!v.you && !v.out) {
            race_rival_update(v, dt);
        }
    }
    race_collide();
    race_tags(dt);
}

// Five times a second, each rival's place before its name
function race_tags(dt)
{
    race.tags -= dt;
    if (race.tags > 0) {
        return;
    }
    race.tags = 0.2;
    const order = race_standings();
    for (const v of race.racers) {
        if (!v.you) {
            v.tag = `${order.indexOf(v) + 1} · ${race_short_name(v.name)}`;
        }
    }
}

// The racers lined up on the start line, nose to the first ring, you in the middle; they fade in where they appear
function race_grid_set(m)
{
    const course = m.race;
    const level = m.level || 1;
    const count = course.rivals.length + 1;
    const mid = Math.floor(count/2);
    const a = course.start.angle;
    const lx = Math.cos(a + Math.PI/2);
    const ly = Math.sin(a + Math.PI/2);
    race.id = m.id;
    race.world = campaign.world;
    race.course = course;
    race.title = `RACE · ${worlds[campaign.world].name.toUpperCase()}`;
    race.phase = 'grid';
    race.clock = 0;
    race.leash = 0;
    race.after = 0;
    race.place = 0;
    race.prize = 0;
    race.tags = 0;
    race.ground = null;
    race.racers = [];
    race.placed = false;
    race.holders = [];
    race.held = 0;
    race.crashes = 0;
    race.rock_hull = 0;
    // the course's bounds, for the minimap
    const xs = [course.start.x, ...course.rings.map(v => v.x)];
    const ys = [course.start.y, ...course.rings.map(v => v.y)];
    const pad = course.r + 300;
    race.box = {left: Math.min(...xs) - pad, right: Math.max(...xs) + pad, up: Math.min(...ys) - pad, down: Math.max(...ys) + pad};
    for (let i = 0, rival = 0; i < count; ++i) {
        const k = i - (count - 1)/2;
        const slot = {x: course.start.x + lx*k*race_slot_gap, y: course.start.y + ly*k*race_slot_gap};
        if (i === mid) {
            race.racers.push({you: true, name: 'You', color: cyan, slot, next: 0, time: null, out: false, x: player.x, y: player.y, r: player.r});
            continue;
        }
        race.racers.push(race_rival_make(course.rivals[rival++], slot, a, level));
        // its lane through the rings: its side of the start line, a third of a ring's radius at most
        race.racers[race.racers.length - 1].lane = clamp(k/(count - 1), -0.5, 0.5)*0.6;
    }
    for (const v of race.racers) {
        v.splits = [];
    }
}

// A rival on the start line, its numbers from its skill and the world (race_pace)
function race_rival_make(def, slot, angle, level)
{
    const id = campaign.world;
    const rules = world_rules[id];
    const k = def.skill;
    const length = sprite_sizes.ships[def.hull.replace(/^ship-/, '')] || 60;
    const hp = Math.round(120 + 25*world_tier(id));
    return {
        you: false,
        rival: true,
        name: def.name,
        color: def.color,
        hull: def.hull,
        skill: k,
        length,
        r: length*0.36,
        slot,
        x: slot.x,
        y: slot.y,
        vx: 0,
        vy: 0,
        angle,
        next: 0,
        time: null,
        out: false,
        hp,
        max_hp: hp,
        flash: 0,
        alpha: 0,
        pace: def.pace || race_pace(id, k, level),
        turn: (2.9 + 1.1*k)*clamp(rules.response/10, 0.65, 1.25),
        thrust: rules.thrust*(0.8 + 0.35*k),
        line: 0.2 + 0.4*k,
        look: 0.3 + 0.35*k,
        caution: 0.95 - 0.35*k,
        boost: 2 + 0.8*k,
        burst: 1.5 + 2.5*k,
        turbo: 0,
        turbo_cd: 2,
        delay: 0.55 - 0.4*k + rand(0, 0.15),
        stuck: 0,
        rammed: 0,
        plan: 0,
        via: null,
        best: Infinity,
        since: 0,
        recover: 0,
        from: {x: slot.x, y: slot.y},
        aim: {x: slot.x, y: slot.y},
        // its name under it with its place, and its drawing as render_surface_ship takes it (white while hit), made
        // once rather than every frame
        tag: race_short_name(def.name),
        drawing: {color: def.color, enemy: true, sprite: {name: def.hull, length}},
        drawing_hit: {color: '#e5faff', enemy: true, sprite: {name: def.hull, length}},
    };
}

// A name short enough to hang under a ship: 18 letters at most
function race_short_name(name)
{
    return (name.length > 18) ? `${name.slice(0, 17)}…` : name;
}

// You, among the racers
function race_you()
{
    return race.racers.find(v => v.you);
}

// A raider near the start line holds the start: one of those already there when you came, while it has not pulled back
function race_raiders_near()
{
    const start = race.course.start;
    return race.holders.some(v => (v.hp > 0) && !v.race_leave && (distance(v, start) < race_raider_reach));
}

// You are in your place on the line: from now no patrol or wave comes (race_calm); the raiders at the line now are the
// only ones that may hold the start
function race_place_taken()
{
    if (race.placed) {
        return;
    }
    race.placed = true;
    race.holders = enemies.filter(v => (v.hp > 0) && (distance(v, race.course.start) < race_raider_reach));
    race.held = 0;
}

// The hold's clock: past race_hold_limit seconds the raiders holding the start pull back, and it goes
function race_hold_time(dt)
{
    race.held += dt;
    if ((race.held < race_hold_limit) || !race_raiders_near()) {
        return;
    }
    for (const v of race.holders) {
        v.race_leave = true;
    }
    show_toast('RAIDERS PULL BACK', 'THE START LINE IS CLEAR', 2.5);
}

// The race keeps the raiders off: from the moment you take your place on the line to the finish
function race_calm()
{
    // a count running or a race under way has you on the course, placed or not (a dev scene starts mid-race)
    if ((race.phase === 'countdown') || (race.phase === 'racing')) {
        return true;
    }
    return race.placed && ((race.phase === 'grid') || (race.phase === 'hold'));
}

// Where a raider goes while a race is on: null when it may go on as it was (one holding the start, a flagship, one busy
// far off); otherwise it turns away from the nearest point of the course, holds its fire, and is gone once out of
// sight and clear of the course. Asked for every raider every frame: no object made on the way.
function race_keep_off(v, prey)
{
    if (!race_calm() || (v.type === 'boss')) {
        return null;
    }
    if (!v.race_leave && race.holders.includes(v)) {
        return null;
    }
    const off = race_nearest(v);
    const near = (off < race_keep_clear) || (distance(v, player) < race_keep_clear);
    if (!near && !v.race_leave && prey && !prey.rival) {
        return null;
    }
    v.race_leave = true;
    const sight = Math.max(W, H)/zoom*0.6 + 200;
    if ((off > race_keep_clear) && (distance(v, player) > sight)) {
        v.hp = 0;
    }
    const dx = v.x - race_near.x;
    const dy = v.y - race_near.y;
    const d = Math.sqrt(dx*dx + dy*dy) || 1;
    race_near.x = v.x + (dx/d)*1000;
    race_near.y = v.y + (dy/d)*1000;
    return race_near;
}

// How far a point is from the course's line, its nearest point on it left in race_near
function race_nearest(p)
{
    const course = race.course;
    let best = Infinity;
    let from = course.start;
    for (const to of course.rings) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const k = clamp(((p.x - from.x)*dx + (p.y - from.y)*dy)/Math.max(1, dx*dx + dy*dy), 0, 1);
        const x = from.x + dx*k;
        const y = from.y + dy*k;
        const d = Math.sqrt((p.x - x)*(p.x - x) + (p.y - y)*(p.y - y));
        if (d < best) {
            best = d;
            race_near.x = x;
            race_near.y = y;
        }
        from = to;
    }
    return best;
}

// A hit on your hull or shield while racing: one on a rock or drifting debris counts as a crash
function race_crash_note(cause, amount)
{
    if ((race.phase !== 'racing') || ((cause !== 'rock') && (cause !== 'debris'))) {
        return;
    }
    race.crashes += 1;
    race.rock_hull += amount;
}

// On the start line: the rivals idle in their places, their noses to the first ring
function race_idle(dt)
{
    for (const v of race.racers) {
        if (v.you) {
            continue;
        }
        v.x += (v.slot.x - v.x)*Math.min(1, dt*3);
        v.y += (v.slot.y - v.y)*Math.min(1, dt*3);
        v.vx = 0;
        v.vy = 0;
        v.angle = turn_toward(v.angle, race.course.start.angle, dt*2);
    }
}

// The rivals fade in where they appear, and out once the race is over
function race_fade(dt)
{
    const target = (race.phase === 'results') ? 0 : 1;
    for (const v of race.racers) {
        if (!v.you) {
            v.alpha += clamp(target - v.alpha, -dt*0.6, dt*1.5);
        }
    }
}

// During the count, after your ship has moved: you are held in your place on the line, nose to the first ring, as a
// berth holds a docking ship; the turbo waits for green
function race_hold(dt)
{
    if (race.phase !== 'countdown') {
        return;
    }
    const you = race_you();
    const k = Math.min(1, dt*6);
    player.x += (you.slot.x - player.x)*k;
    player.y += (you.slot.y - player.y)*k;
    player.vx = 0;
    player.vy = 0;
    player.angle = turn_toward(player.angle, race.course.start.angle, dt*4);
    stop_turbo();
}

// Green: the clock starts, each rival after its own reaction
function race_go(m)
{
    race.phase = 'racing';
    race.clock = 0;
    m.race_live = true;
    m.progress = 0;
    show_banner('goal', 'Race', 'Go', `${race.course.rings.length} rings · par ${race_time_text(race.course.par)}`, 1.2);
    sfx('go');
}

// Your progress: rings passed, the leash off the course, and the finish
function race_you_update(m, dt)
{
    const you = race_you();
    const from = player.previous_position || player;
    you.x = player.x;
    you.y = player.y;
    you.r = player.r;
    if (race_pass(you, from)) {
        m.progress = you.next;
        if (you.next >= race.course.rings.length) {
            race_you_finish(m);
            return;
        }
        sfx('ring');
    }
    // off the course: a word once on the news line; the card counts the seconds down in red
    const off = race_off_course(player);
    if ((off > race_leash) && !race.leash) {
        show_toast('OFF COURSE', `TURN BACK TO RING ${you.next + 1} · THE RACE IS FORFEIT IN ${race_leash_time} s`, 3, 'danger');
    }
    race.leash = (off > race_leash) ? race.leash + dt : 0;
    if (race.leash >= race_leash_time) {
        race_forfeit('You flew off the course');
    }
}

// How far a point is from the course's line: the nearest of its legs
function race_off_course(p)
{
    const rings = race.course.rings;
    let out = segment_distance(p, race.course.start, rings[0]);
    for (let i = 1; i < rings.length; ++i) {
        out = Math.min(out, segment_distance(p, rings[i - 1], rings[i]));
    }
    return out;
}

// A racer's path this frame, from where it was, through its next ring: it passes when the path comes within the
// ring's radius of its middle. True when it passed one; its time is kept when it was the last.
function race_pass(v, from)
{
    const rings = race.course.rings;
    const ring = rings[v.next];
    if (!ring || (segment_distance(ring, from, v) > race.course.r)) {
        return false;
    }
    v.next++;
    v.splits.push(Math.round(race.clock*10)/10);
    race_ring_effect(ring, v);
    if (v.next >= rings.length) {
        v.time = race.clock;
        v.turbo = 0;
    }
    return true;
}

// A ring passed: a flash in the racer's colour; yours with the count beside it
function race_ring_effect(p, v)
{
    if (!in_view(p, race.course.r + 200)) {
        return;
    }
    ring(p.x, p.y, v.color, race.course.r*1.5, 0.45);
    if (v.you) {
        burst(p.x, p.y, gold, 14, 160);
        label(p.x, p.y - race.course.r - 24, (v.next >= race.course.rings.length) ? 'FINISH' : `RING ${v.next}/${race.course.rings.length}`, gold);
    }
}

// You are over the line: your place among those already over it, the prize for it and your time; the contract is
// done, and the race runs on for the rest
function race_you_finish(m)
{
    const you = race_you();
    const count = race.racers.length;
    const place = 1 + race.racers.filter(v => !v.you && (v.time !== null) && (v.time <= you.time)).length;
    race.place = place;
    race.prize = race_prize(race.course.top, place, count, you.time, race.course.par);
    race.phase = 'done';
    race.after = race_after;
    if (race_mode.active) {
        m.race_live = false;
        race_mode_finished(place, count, you.time);
        return;
    }
    m.reward = race.prize;
    m.race_live = false;
    m.race_result = {place, count, time: Math.round(you.time*10)/10};
    play_log_race(m, m.race_result);
    m.progress = m.target - 1;
    show_banner('goal', `Race · finished in ${race_time_text(you.time)}`, `${race_ordinal(place)} of ${count}`, `◆ ${ui_number(race.prize)} · dock to collect`, 3);
    sfx('ring');
    mission_event('race', 1, {contract_id: m.id});
}

// After you finish: the rivals still out fly on until they are over the line, out, or the time is up; then the
// results stay on the board a while
function race_after_update(dt)
{
    race.clock += dt;
    race.after -= dt;
    const you = race_you();
    you.x = player.x;
    you.y = player.y;
    if (race_rail_on()) {
        race_rail_rivals(dt);
    }
    else {
        for (const v of race.racers) {
            if (!v.you && !v.out) {
                race_rival_update(v, dt);
            }
        }
        race_collide();
    }
    race_tags(dt);
    const racing = race.racers.some(v => !v.you && !v.out && (v.time === null));
    if (!racing || (race.after <= 0)) {
        race.phase = 'results';
        race.after = race_results_time;
    }
}

// The race lost: why, on the news line in red; the contract stays, and the start line waits for another try
function race_forfeit(why)
{
    const m = campaign.contracts.find(v => v.id === race.id);
    if (m) {
        m.race_live = false;
        m.progress = 0;
    }
    if (race_mode.active) {
        race_mode_forfeit(why);
        return;
    }
    play_log_race_forfeit(why);
    show_toast('RACE FORFEIT', `${why.toUpperCase()} · THE START LINE WAITS FOR ANOTHER TRY`, 3.5, 'danger');
    race_reset();
}

// No race on: the rivals gone, the board hidden
function race_reset()
{
    race.id = null;
    race.world = -1;
    race.course = null;
    race.phase = 'idle';
    race.racers = [];
    race.placed = false;
    race.holders = [];
    race.leash = 0;
}

// A new run, a load or a restart: no race goes on. A save made mid-race comes back with its race called off, the
// contract as it was before the start.
function race_clear()
{
    race_reset();
    const live = campaign.contracts.filter(v => (v.type === 'race') && v.race_live);
    for (const m of live) {
        m.race_live = false;
        m.progress = 0;
    }
    if (live.length) {
        show_toast('RACE CALLED OFF', 'A RACE IS NOT KEPT IN A SAVE · ITS START LINE WAITS FOR ANOTHER TRY', 4);
    }
}

// Docking ends a race under way
function race_dock()
{
    if (race_running()) {
        race_forfeit('You docked');
    }
}

// A rival's frame: it waits for its reaction at green, aims at its line (race_aim), turns toward it as fast as its
// hull lets it at that speed, slows for the turn after the ring by its nerve, burns its turbo on a long straight, and
// moves; past the finish it eases off
function race_rival_update(v, dt)
{
    v.flash = Math.max(0, v.flash - dt);
    v.from.x = v.x;
    v.from.y = v.y;
    const rings = race.course.rings;
    const speed = Math.sqrt(v.vx*v.vx + v.vy*v.vy);
    if (v.time !== null) {
        const f = Math.exp(-0.9*dt);
        v.vx *= f;
        v.vy *= f;
        v.x += v.vx*dt;
        v.y += v.vy*dt;
        return;
    }
    if (race.clock < v.delay) {
        return;
    }
    // its way to the ring: a new one each second (Verdant's rocks drift), and at once on a new ring or past the point
    // it went round the rocks by
    v.plan -= dt;
    if ((v.plan <= 0) || (v.via && race_via_passed(v))) {
        race_plan(v);
    }
    // no nearer to its ring for three seconds (pinned on a rock, circling it): a new way round, and if it was on its
    // way round already, straight for the ring's middle a while, round nothing, slower
    const ring_d = distance(v, rings[v.next]);
    if (ring_d < v.best - 30) {
        v.best = ring_d;
        v.since = 0;
    }
    v.since += dt;
    if (v.since > 3) {
        v.recover = v.via ? 0 : 2;
        v.since = 0;
        v.best = ring_d;
        race_plan(v, true);
    }
    v.recover = Math.max(0, v.recover - dt);
    const aim = (v.recover > 0) ? rings[v.next] : v.via || race_aim(v, speed, v.aim);
    const dx = aim.x - v.x;
    const dy = aim.y - v.y;
    const d = Math.sqrt(dx*dx + dy*dy);
    const heading = (v.recover > 0) ? Math.atan2(dy, dx) : race_avoid(v, Math.atan2(dy, dx), speed, d);
    const rate = v.turn/(1 + Math.max(0, speed/v.pace - 1)*0.65);
    v.angle = turn_toward(v.angle, heading, rate*dt);
    const off = Math.abs(Math.atan2(Math.sin(heading - v.angle), Math.cos(heading - v.angle)));
    // the speed it can take the bend after the ring at, by its nerve, and the speed it can still brake down to that
    // from here on its thrust: faster than that, it eases off now
    const ring = rings[v.next];
    const after = rings[v.next + 1];
    let corner = v.pace;
    if (after) {
        const bend = Math.abs(race_angle_between(Math.atan2(ring.y - v.y, ring.x - v.x), Math.atan2(after.y - ring.y, after.x - ring.x)));
        corner = v.pace*clamp(1 - (bend/Math.PI)*v.caution, 0.35, 1);
        // and no faster than its thrust can bend its way by that much within three ring radii: on Cryosphere's ice,
        // the boldest rivals came in too fast, missed the ring and looped back for it, and finished last
        corner = Math.min(corner, Math.sqrt((race.course.r*3*v.thrust)/Math.max(0.2, 2*Math.sin(bend/2))));
    }
    const brake = Math.sqrt(corner*corner + 2*v.thrust*0.7*Math.max(0, ring_d - race.course.r*0.5));
    race_rival_turbo(v, off, brake, dt);
    const top = Math.min(v.pace*((v.turbo > 0) ? v.boost : 1), brake)*(0.2 + 0.8*Math.max(0, Math.cos(off)))*((v.recover > 0) ? 0.7 : 1);
    const ax = Math.cos(v.angle)*top - v.vx;
    const ay = Math.sin(v.angle)*top - v.vy;
    const delta = Math.sqrt(ax*ax + ay*ay);
    const step = v.thrust*((v.turbo > 0) ? 2 : 1)*dt;
    const k = delta ? Math.min(1, step/delta) : 0;
    v.vx += ax*k;
    v.vy += ay*k;
    v.x = clamp(v.x + v.vx*dt, 24, world.w - 24);
    v.y = clamp(v.y + v.vy*dt, 24, world.h - 24);
    // pressed against a rock and slow: it backs off to one side for a moment
    v.stuck = (speed < 40) ? v.stuck + dt : 0;
    if (v.stuck > 1.5) {
        v.stuck = 0;
        v.angle += (Math.random() < 0.5) ? 1.2 : -1.2;
        v.vx = Math.cos(v.angle)*v.pace*0.5;
        v.vy = Math.sin(v.angle)*v.pace*0.5;
    }
    if (race_pass(v, v.from)) {
        v.best = Infinity;
        v.since = 0;
        v.recover = 0;
        v.plan = 0;
    }
}

// Sideways from the rock that blocks a rival's way, the points tried to go round it by, nearest first
const race_detours = [200, -200, 400, -400, 650, -650, 950, -950, 1300, -1300];

// A rival's way to its next ring (v.via): none while the straight line to it is clear of rocks and structures with a
// hull's room; otherwise the nearest point beside the first rock across it from which the ring is clear too, so a
// field of rocks across the leg is flown round, not into. `wide`: pinned already, the room asked is doubled.
function race_plan(v, wide = false)
{
    const ring = race.course.rings[v.next];
    v.plan = 1;
    v.via = null;
    if (!ring) {
        return;
    }
    const room = v.r*(wide ? 2 : 1) + 14;
    const k = race_path_block(v.x, v.y, ring.x, ring.y, room);
    if (k < 0) {
        return;
    }
    const n = bodies_numbers;
    const dx = ring.x - v.x;
    const dy = ring.y - v.y;
    const d = Math.sqrt(dx*dx + dy*dy) || 1;
    for (const side of race_detours) {
        const x = n.sx[k] - (dy/d)*side;
        const y = n.sy[k] + (dx/d)*side;
        if ((x < 60) || (y < 60) || (x > world.w - 60) || (y > world.h - 60)) {
            continue;
        }
        if ((race_path_block(v.x, v.y, x, y, room) < 0) && (race_path_block(x, y, ring.x, ring.y, room) < 0)) {
            v.via = {x, y};
            return;
        }
    }
}

// The first solid (bodies_numbers' index) the line from (ax, ay) to (bx, by) passes within `room` of its edge, the
// nearest to its start; -1 when it is clear
function race_path_block(ax, ay, bx, by, room)
{
    const n = bodies_numbers;
    const dx = bx - ax;
    const dy = by - ay;
    const length2 = Math.max(1, dx*dx + dy*dy);
    let best = -1;
    let best_along = Infinity;
    for (let k = 0, end = n.statics; k < end; ++k) {
        const px = n.sx[k] - ax;
        const py = n.sy[k] - ay;
        const t = clamp((px*dx + py*dy)/length2, 0, 1);
        const ex = px - dx*t;
        const ey = py - dy*t;
        const reach = n.sr[k] + room;
        if (((ex*ex + ey*ey) < reach*reach) && (t < best_along)) {
            best = k;
            best_along = t;
        }
    }
    return best;
}

// A rival is past the point it went round the rocks by: near it, or beyond it toward the ring
function race_via_passed(v)
{
    const ring = race.course.rings[v.next];
    const dx = v.via.x - v.x;
    const dy = v.via.y - v.y;
    return ((dx*dx + dy*dy) < 110*110) || (ring && ((dx*(ring.x - v.via.x) + dy*(ring.y - v.via.y)) < 0));
}

// The signed angle from a to b, in (-π, π]
function race_angle_between(a, b)
{
    return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}

// Where a rival aims: its next ring, shifted toward the inside of the turn after it by its line (a third of the ring
// at most, so it still passes), and once it is close the aim slides on toward the ring after, by how far it looks
// ahead: a rival can still miss a ring, and loops back for it. The finish ring is aimed at through its middle.
function race_aim(v, speed, out)
{
    const rings = race.course.rings;
    const ring = rings[v.next];
    const after = rings[v.next + 1];
    out.x = ring.x;
    out.y = ring.y;
    // the finish, or a ring missed and come back to: through its middle
    if (!after || (distance(v, ring) < race.course.r*1.6)) {
        return out;
    }
    const il = Math.max(1, distance(v, ring));
    const ol = Math.max(1, distance(ring, after));
    const nx = (after.x - ring.x)/ol - (ring.x - v.x)/il;
    const ny = (after.y - ring.y)/ol - (ring.y - v.y)/il;
    const nl = Math.sqrt(nx*nx + ny*ny);
    const cut = race.course.r*v.line*0.5;
    if (nl > 0.01) {
        out.x += (nx/nl)*cut;
        out.y += (ny/nl)*cut;
    }
    // its lane: each rival keeps to its own part of the ring (by its place on the start line), so the pack spreads
    // across it instead of flying one line
    if (v.lane) {
        out.x += -((ring.y - v.y)/il)*v.lane*race.course.r;
        out.y += ((ring.x - v.x)/il)*v.lane*race.course.r;
    }
    const reach = Math.max(120, speed*v.look);
    const d = distance(v, out);
    if (d < reach) {
        const k = (1 - d/reach)*0.15*v.look;
        out.x += (after.x - out.x)*k;
        out.y += (after.y - out.y)*k;
    }
    return out;
}

// A rival's heading bent away from the rocks and structures ahead, farther ahead the faster it flies, but never
// those beyond the point it aims at
function race_avoid(v, heading, speed, d)
{
    const ux = Math.cos(heading);
    const uy = Math.sin(heading);
    const reach = Math.min(d, 140 + v.r*2 + speed*0.45);
    const {sx, sy, sr} = bodies_numbers;
    let push = 0;
    for (let k = 0, end = bodies_numbers.statics; k < end; ++k) {
        const px = sx[k] - v.x;
        const py = sy[k] - v.y;
        const clearance = sr[k] + v.r + 16;
        if ((px*px + py*py) > (reach + clearance)*(reach + clearance)) {
            continue;
        }
        const along = px*ux + py*uy;
        const side = px*uy - py*ux;
        if ((along > 0) && (along < reach) && (Math.abs(side) < clearance)) {
            push += ((side >= 0) ? 1 : -1)*(1 - along/reach);
        }
    }
    // a rival also steers past the racers just ahead of it, you among them, rather than into their tail: before, the
    // pack flew one line and leaned on each other ring after ring (seconds of contact a race, ten in Cryosphere)
    if (v.rival) {
        const near = 90 + speed*0.35;
        for (const o of race.racers) {
            if ((o === v) || o.out) {
                continue;
            }
            const px = o.x - v.x;
            const py = o.y - v.y;
            const along = px*ux + py*uy;
            const side = px*uy - py*ux;
            const clearance = v.r + (o.r || 14) + 18;
            if ((along > 0) && (along < near) && (Math.abs(side) < clearance)) {
                push += ((side >= 0) ? 1 : -1)*0.7*(1 - along/near);
            }
        }
    }
    return heading + clamp(push, -1, 1)*1.1;
}

// A rival's turbo: lit on a long straight now and then, the better the rival the more often, for a burst; out on a
// turn or once it must brake for the ring, then a few seconds to recharge
function race_rival_turbo(v, off, brake, dt)
{
    v.turbo_cd = Math.max(0, v.turbo_cd - dt);
    if (v.turbo > 0) {
        v.turbo -= dt;
        if ((v.turbo <= 0) || (off > 0.45) || (brake < v.pace*1.2)) {
            v.turbo = 0;
            v.turbo_cd = 4 - v.skill*1.5;
        }
        return;
    }
    if ((v.turbo_cd <= 0) && (off < 0.2) && (brake > v.pace*v.boost) && (Math.random() < dt*(0.8 + 1.5*v.skill))) {
        v.turbo = v.burst;
        sfx('boost', 0.3, v);
    }
}

// No two hulls overlap: the rivals out of rocks and structures (they bounce off), out of raiders, and off each other
// and you, a bump trading their speed along the hit
function race_collide()
{
    const racers = race.racers;
    for (const v of racers) {
        if (v.out || v.you) {
            continue;
        }
        for (let k = 0, end = bodies_numbers.statics; k < end; ++k) {
            race_push_static(v, k);
        }
        // a raider that rams a rival hurts it, as it hurts you
        v.rammed = Math.max(0, v.rammed - 1/60);
        for (const e of enemies) {
            if ((e.hp > 0) && race_push(v, e) && (v.rammed <= 0)) {
                v.rammed = 0.6;
                race_hurt(v, (e.type === 'tank') ? 25 : 16);
            }
        }
    }
    for (let i = 0; i < racers.length; ++i) {
        const a = racers[i];
        if (a.out || a.you) {
            continue;
        }
        for (let j = i + 1; j < racers.length; ++j) {
            if (!racers[j].out && !racers[j].you) {
                race_bump(a, racers[j]);
            }
        }
        if (!docking) {
            race_bump(a, player);
        }
    }
}

// A rival out of the k-th solid thing (bodies_numbers), as race_push does; the numbers read here, not passed, so none
// is boxed on the way
function race_push_static(v, k)
{
    const n = bodies_numbers;
    const dx = v.x - n.sx[k];
    const dy = v.y - n.sy[k];
    const min = v.r + n.sr[k];
    if ((Math.abs(dx) >= min) || (Math.abs(dy) >= min)) {
        return;
    }
    race_push(v, {x: n.sx[k], y: n.sy[k], r: n.sr[k]});
}

// v moved out of the circle s, losing its speed into it; true when they touched
function race_push(v, s)
{
    const x = s.x;
    const y = s.y;
    const dx = v.x - x;
    const dy = v.y - y;
    const min = v.r + s.r;
    if ((Math.abs(dx) >= min) || (Math.abs(dy) >= min)) {
        return false;
    }
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d >= min) {
        return false;
    }
    const nx = d ? dx/d : 1;
    const ny = d ? dy/d : 0;
    v.x = x + nx*min;
    v.y = y + ny*min;
    const into = v.vx*nx + v.vy*ny;
    if (into < 0) {
        v.vx -= nx*into*1.3;
        v.vy -= ny*into*1.3;
    }
    return true;
}

// Two hulls that touch pushed apart, the lighter more, and their speeds along the hit traded, half of it lost
function race_bump(a, b)
{
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const min = a.r + b.r;
    if ((Math.abs(dx) >= min) || (Math.abs(dy) >= min)) {
        return;
    }
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d >= min) {
        return;
    }
    const nx = d ? dx/d : 1;
    const ny = d ? dy/d : 0;
    const ma = a.r*a.r;
    const mb = b.r*b.r;
    const overlap = min - d;
    a.x += nx*overlap*(mb/(ma + mb));
    a.y += ny*overlap*(mb/(ma + mb));
    b.x -= nx*overlap*(ma/(ma + mb));
    b.y -= ny*overlap*(ma/(ma + mb));
    const closing = (a.vx - b.vx)*nx + (a.vy - b.vy)*ny;
    if (closing >= 0) {
        return;
    }
    const j = (-1.5*closing)/(1/ma + 1/mb);
    a.vx += (j/ma)*nx;
    a.vy += (j/ma)*ny;
    b.vx -= (j/mb)*nx;
    b.vy -= (j/mb)*ny;
    if (closing < -60) {
        burst(b.x + nx*b.r, b.y + ny*b.r, '#ffe6b0', 6, 120);
        sfx('hit', 0.35, b);
    }
}

// What a raider goes for in a race: one of the raiders (two in five) picks a rival out racing near it, nearer than
// you; null for the rest
function race_prey(enemy)
{
    if (!race_running() && (race.phase !== 'done')) {
        return null;
    }
    if (enemy.phase > Math.PI*0.8) {
        return null;
    }
    let best = null;
    let near = Math.min(700, distance(enemy, player));
    for (const v of race.racers) {
        if (v.you || v.out || (v.time !== null)) {
            continue;
        }
        const d = distance(enemy, v);
        if (d < near) {
            near = d;
            best = v;
        }
    }
    return best;
}

// A raider's shot on a rival: it stops on the hull and hurts it; a rival with its hull gone is out of the race.
// True when the shot hit one.
function race_shot_hit(b)
{
    for (const v of race.racers) {
        if (v.you || v.out || (v.alpha < 0.5)) {
            continue;
        }
        if ((Math.abs(v.x - b.x) > v.r + b.r + 60) || (Math.abs(v.y - b.y) > v.r + b.r + 60)) {
            continue;
        }
        const contact = hostile_shot_contact(b, v, v.r + b.r);
        if (contact < 0) {
            continue;
        }
        b.x = b.px + (b.x - b.px)*contact;
        b.y = b.py + (b.y - b.py)*contact;
        explode_impact(b.x, b.y, Math.atan2(b.vy, b.vx), 9, hostile_shot_color(b.color || pink), '#aab4bf');
        race_hurt(v, b.damage || 13);
        return true;
    }
    return false;
}

// A rival hit: its hull flashes and drops; with its hull gone it is out of the race
function race_hurt(v, damage)
{
    v.hp -= damage;
    v.flash = 0.08;
    if (v.hp <= 0) {
        race_out(v);
    }
}

// A rival whose hull is gone drops out of the race
function race_out(v)
{
    v.out = true;
    v.hp = 0;
    explode(v.x, v.y, v.length*0.9, v.color);
    show_toast(`${v.name.toUpperCase()} IS OUT`, 'RAIDERS BROKE THE HULL', 2.5);
}

// The racers in order: over the line by time, then the ones racing by rings passed and the distance to the next one,
// then the ones out
function race_standings()
{
    const rings = race.course.rings;
    function rank(v) {
        if (v.out) {
            return -1e9;
        }
        if (v.time !== null) {
            return 1e9 - v.time;
        }
        const next = rings[v.next];
        return v.next*1e5 - (next ? distance(v, next) : 0);
    }
    return race.racers.slice().sort((a, b) => rank(b) - rank(a));
}

// A place as words: 1st, 2nd, 3rd, 4th
function race_ordinal(n)
{
    const teen = Math.floor(n/10) % 10 === 1;
    return `${n}${(!teen && ['th', 'st', 'nd', 'rd'][n % 10]) || 'th'}`;
}

// A race time: 41.8 s as 0:41.8
function race_time_text(t)
{
    const s = Math.max(0, t);
    return `${Math.floor(s/60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
}

// Once the racers have moved, the rings a rock has drifted into (Verdant's current) are moved off it, so a ring never
// holds a rock
function race_nudge(dt)
{
    race.nudge -= dt;
    if (race.nudge > 0) {
        return;
    }
    race.nudge = 0.5;
    const r = race.course.r;
    const room = race_ship_width();
    for (const ring of race.course.rings) {
        for (const v of ore_nodes) {
            if (v.hp <= 0) {
                continue;
            }
            const d = distance(ring, v);
            const min = v.r + r + room;
            if (d < min) {
                const a = d ? Math.atan2(ring.y - v.y, ring.x - v.x) : 0;
                ring.x = v.x + Math.cos(a)*min;
                ring.y = v.y + Math.sin(a)*min;
            }
        }
    }
}

// The guide in a race, into its context c: to your place on the start line, then ring after ring
function race_guide(c, m)
{
    const course = m.race;
    const you = (race.id === m.id) ? race_you() : null;
    c.mission = m;
    c.kind = 'race';
    c.instruction = stage_description(m.stages[0], m, 0);
    if (race_running() && you) {
        const n = Math.min(you.next, course.rings.length - 1);
        c.goal = {...course.rings[n], round: course.r + 24, label: (n === course.rings.length - 1) ? 'FINISH RING' : `RING ${n + 1}`};
        c.action = 'Racing';
        return;
    }
    c.goal = {...(you ? you.slot : course.start), label: you ? 'YOUR PLACE' : 'RACE START'};
    c.action = 'Fly to the start line';
}

// The pennants' colours along a course, in turn; the few by the start and the finish are chequered instead
const race_flag_colors = ['#ffcc4d', ...race_colors, '#f4f1e8'];
// A course's flags (or a Turbo track's), made once for each and made again when the rocks or the structures here
// change; the course is the save's own object, so they are kept beside it, never on it
const race_flags_kept = new WeakMap();
// The pennant being drawn: its way back along the course, its way out from it, its wave now, and whether it is
// chequered; set in place for each one (race_flag_path)
const race_flag_frame = {fx: 0, fy: 0, nx: 0, ny: 0, wave: 0, chequer: false};

// Flags along both sides of a line (a list of {x, y}), for looks: offset px out from it, about every gap px of its
// length, the two sides staggered by half a gap. Each is {x, y, side (-1 on the left of the way, 1 on the right),
// angle (the line's heading there), color (a pennant's colour, or 'chequer' within two and a half gaps of either
// end; the two sides of a stretch share one), phase (its wave's own start)}. A spot nearer another part of the line
// than the offset (the inside of a turn, a leg crossing back), within half a gap of a flag already placed (the
// outside of a turn), or not clear of rocks, structures, gates and the station (race_spot_clear) has no flag.
// The list comes sorted by colour, so a colour is set once for all its flags (race_flags_draw).
function race_flags_along(points, offset, gap)
{
    const spots = [];
    let total = 0;
    for (let i = 1; i < points.length; ++i) {
        total += distance(points[i - 1], points[i]);
    }
    for (const side of [-1, 1]) {
        let s = (side < 0) ? 0 : gap/2;
        let base = 0;
        let count = 0;
        for (let i = 1; i < points.length; ++i) {
            const a = points[i - 1];
            const b = points[i];
            const length = distance(a, b);
            const angle = Math.atan2(b.y - a.y, b.x - a.x);
            const nx = Math.cos(angle + side*Math.PI/2);
            const ny = Math.sin(angle + side*Math.PI/2);
            for (; s <= base + length; s += gap) {
                const t = length ? (s - base)/length : 0;
                const p = {x: Math.round(a.x + (b.x - a.x)*t + nx*offset), y: Math.round(a.y + (b.y - a.y)*t + ny*offset)};
                let near = spots.some(v => distance(v, p) < gap/2);
                for (let j = 1; (j < points.length) && !near; ++j) {
                    near = segment_distance(p, points[j - 1], points[j]) < offset*0.9;
                }
                if (near || !race_spot_clear(p, 40)) {
                    continue;
                }
                // the two sides of a stretch in one colour, the next stretch in the next
                const chequer = (s < gap*2.5) || (total - s < gap*2.5);
                const color = chequer ? 'chequer' : race_flag_colors[Math.floor(s/gap) % race_flag_colors.length];
                spots.push({...p, side, angle, color, phase: (count*2.3 + ((side > 0) ? 1.1 : 0)) % (Math.PI*2)});
                count++;
            }
            base += length;
        }
    }
    const order = [...race_flag_colors, 'chequer'];
    return spots.sort((a, b) => order.indexOf(a.color) - order.indexOf(b.color));
}

// A course's flags: along a ring course's legs from the start line to the finish ring, 70 px beyond a ring's reach
// out; in a Turbo race along its track's edges instead (race_track_line), 30 px out from them; none on the start line
// or round a ring. Kept by the course, or by the track while one is ridden
function race_course_flags(course)
{
    const track = race_rail_on() ? race_rail.track : null;
    const here = structures_here();
    const kept = race_flags_kept.get(track || course);
    if (kept && (kept.here === here) && (kept.ore === ore_nodes)) {
        return kept.flags;
    }
    const points = track ? race_track_line(track) : [course.start, ...course.rings];
    const offset = track ? track.w + 30 : course.r + 70;
    const flags = race_flags_along(points, offset, 320).filter(function (flag) {
        if (distance(flag, course.start) < course.start_r + 40) {
            return false;
        }
        return !course.rings.some(v => distance(flag, v) < course.r + 110);
    });
    race_flags_kept.set(track || course, {here, ore: ore_nodes, flags});
    return flags;
}

// A Turbo track's centre line as race_flags_along takes it: from the start line to as far past the finish ring as the
// track is drawn (race_rail_draw), a point every two of its steps
function race_track_line(track)
{
    const out = [];
    const to = Math.min(track.n - 1, Math.round((track.rings[track.rings.length - 1] + 900)/race_rail_step));
    for (let i = Math.round(track.start/race_rail_step); i <= to; i += 2) {
        out.push({x: track.xs[i], y: track.ys[i]});
    }
    return out;
}

// The flags in view (race_flags_along), faded a little under the rings: a thin pole out from the course and a
// pennant at its end blown back along the way, its tip swaying (still without full effects); the chequered ones white
// with black squares. Each flag is a path of its own: one path a colour for flags across the screen drew no faster
function race_flags_draw(flags)
{
    const sway = full_fx ? 1 : 0;
    let color = '';
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = '#c3ccd8';
    ctx.lineWidth = 2;
    for (const v of flags) {
        if (!in_view(v, 80)) {
            continue;
        }
        const nx = Math.cos(v.angle + v.side*Math.PI/2);
        const ny = Math.sin(v.angle + v.side*Math.PI/2);
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(v.x + nx*34, v.y + ny*34);
        ctx.stroke();
        if (v.color !== color) {
            color = v.color;
            ctx.fillStyle = (color === 'chequer') ? '#f4f1e8' : color;
        }
        ctx.beginPath();
        race_flag_path(v, sway, 0, 1, 0, 1);
        ctx.fill();
        if (color === 'chequer') {
            // the black squares, two rows of four, every other one
            ctx.fillStyle = '#10141a';
            ctx.beginPath();
            for (let i = 0; i < 4; ++i) {
                const row = i % 2;
                race_flag_path(v, sway, i/4, (i + 1)/4, row/2, (row + 1)/2);
            }
            ctx.fill();
            color = '';
        }
    }
    ctx.restore();
}

// A pennant's part as a path, from u0 to u1 of its length (0 at the pole, 1 at the end) and v0 to v1 of its height
// (0 at the pole's end, 1 down the pole): a chequered flag is a cloth 26 by 14 px, a pennant a triangle as long
// narrowing to its tip; the free end swings across by up to 5 px with the wave
function race_flag_path(v, sway, u0, u1, v0, v1)
{
    const f = race_flag_frame;
    f.fx = -Math.cos(v.angle);
    f.fy = -Math.sin(v.angle);
    f.nx = Math.cos(v.angle + v.side*Math.PI/2);
    f.ny = Math.sin(v.angle + v.side*Math.PI/2);
    f.wave = sway*Math.sin(clock*4 + v.phase)*5;
    f.chequer = (v.color === 'chequer');
    ctx.moveTo(race_flag_x(v, u0, v0), race_flag_y(v, u0, v0));
    ctx.lineTo(race_flag_x(v, u1, v0), race_flag_y(v, u1, v0));
    ctx.lineTo(race_flag_x(v, u1, v1), race_flag_y(v, u1, v1));
    ctx.lineTo(race_flag_x(v, u0, v1), race_flag_y(v, u0, v1));
    ctx.closePath();
}

// A point of a pennant's cloth (race_flag_path): u along it, w across it from the pole's end; how far along it is
// and how far out from the course
function race_flag_along(u)
{
    return u*26;
}

function race_flag_across(u, w)
{
    const f = race_flag_frame;
    const narrow = f.chequer ? w : 0.5 + (w - 0.5)*(1 - u);
    return 34 - narrow*(f.chequer ? 14 : 13) + f.wave*u*u;
}

function race_flag_x(v, u, w)
{
    return v.x + race_flag_frame.fx*race_flag_along(u) + race_flag_frame.nx*race_flag_across(u, w);
}

function race_flag_y(v, u, w)
{
    return v.y + race_flag_frame.fy*race_flag_along(u) + race_flag_frame.ny*race_flag_across(u, w);
}

// The rings, the start line and the line between them, while a race contract waits in this world: the next ring lit
// and turning, the ones after it plain, the ones passed faded; the finish ring chequered; flags along the sides
function race_render_course()
{
    const m = race_contract();
    const course = (race.course && ((race.phase === 'done') || (race.phase === 'results'))) ? race.course : m?.race;
    if (!course) {
        return;
    }
    const you = race.course ? race_you() : null;
    const next = you ? you.next : 0;
    const live = (race.phase !== 'idle') && (race.phase !== 'grid') && (race.phase !== 'hold');
    const rings = course.rings;
    ctx.save();
    // the line, faint, ring to ring; a Turbo race has its track instead (race_rail_draw)
    if (!race_rail_on()) {
        ctx.strokeStyle = gold;
        ctx.globalAlpha = 0.16;
        ctx.lineWidth = 2/zoom;
        ctx.setLineDash([18/zoom, 22/zoom]);
        ctx.beginPath();
        ctx.moveTo(course.start.x, course.start.y);
        for (const v of rings) {
            ctx.lineTo(v.x, v.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
    }
    race_flags_draw(race_course_flags(course));
    for (let i = rings.length - 1; i >= 0; --i) {
        if (!in_view(rings[i], course.r + 120)) {
            continue;
        }
        const kind = !live ? 'idle' : (i < next) ? 'passed' : (i === next) ? 'next' : 'later';
        race_ring_draw(rings[i], rings[i + 1] || null, course.r, i + 1, kind, i === rings.length - 1);
    }
    race_start_draw(course, live);
    ctx.restore();
}

// One ring: a gold hoop with its number, lit and turning when it is next (with chevrons toward the ring after it), dim
// when later, faded when passed; the finish chequered black and white
function race_ring_draw(p, after, r, n, kind, finish)
{
    const alpha = (kind === 'next') ? 1 : (kind === 'passed') ? 0.16 : (kind === 'idle') ? 0.55 : 0.5;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = alpha;
    const width = (kind === 'next') ? 9 : 5;
    if ((kind === 'next') && full_fx) {
        ctx.shadowColor = gold;
        ctx.shadowBlur = 18;
    }
    ctx.lineWidth = width;
    ctx.strokeStyle = (kind === 'passed') ? '#8396ab' : gold;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI*2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (finish && (kind !== 'passed')) {
        ctx.strokeStyle = '#f4f1e8';
        ctx.setLineDash([r*0.32, r*0.32]);
        ctx.lineDashOffset = (kind === 'next') ? -clock*40 : 0;
        ctx.stroke();
        ctx.setLineDash([]);
    }
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = alpha*0.6;
    ctx.beginPath();
    ctx.arc(0, 0, r*0.82, 0, Math.PI*2);
    ctx.stroke();
    if (kind === 'next') {
        // a slow ring of light round it, and chevrons on its far side pointing on to the ring after
        ctx.globalAlpha = 0.35 + (full_fx ? Math.sin(clock*5)*0.2 : 0);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r + 16 + (full_fx ? (clock*30) % 24 : 0), 0, Math.PI*2);
        ctx.stroke();
        if (after) {
            const a = Math.atan2(after.y - p.y, after.x - p.x);
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = gold;
            for (let i = 0; i < 2; ++i) {
                const d = r + 34 + i*26;
                ctx.save();
                ctx.translate(Math.cos(a)*d, Math.sin(a)*d);
                ctx.rotate(a);
                ctx.beginPath();
                ctx.moveTo(10, 0);
                ctx.lineTo(-6, -11);
                ctx.lineTo(-6, 11);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = (kind === 'passed') ? '#8396ab' : (kind === 'next') ? '#fff3d0' : gold;
    ctx.font = race_font(Math.round(r*0.62));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(finish ? '⚑' : race_numbers[n - 1], 0, 2);
    ctx.restore();
}

// The race's bold mono font at a size in px, each size made once
const race_fonts = new Map();

function race_font(size)
{
    let out = race_fonts.get(size);
    if (!out) {
        out = `700 ${size}px "JetBrains Mono", ui-monospace, monospace`;
        race_fonts.set(size, out);
    }
    return out;
}

// The start line: a dashed bar across the places, a mark at each, and three lights over it, red as the count runs,
// green at the go
function race_start_draw(course, live)
{
    const s = course.start;
    if (!in_view(s, 500)) {
        return;
    }
    const count = (race.course === course) ? race.racers.length : course.rivals.length + 1;
    const half = ((count - 1)/2)*race_slot_gap + 60;
    const lx = Math.cos(s.angle + Math.PI/2);
    const ly = Math.sin(s.angle + Math.PI/2);
    ctx.save();
    ctx.strokeStyle = gold;
    ctx.globalAlpha = live ? 0.35 : 0.8;
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.moveTo(s.x - lx*half, s.y - ly*half);
    ctx.lineTo(s.x + lx*half, s.y + ly*half);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!live || (race.phase === 'countdown')) {
        for (let i = 0; i < count; ++i) {
            const k = i - (count - 1)/2;
            const x = s.x + lx*k*race_slot_gap - Math.cos(s.angle)*48;
            const y = s.y + ly*k*race_slot_gap - Math.sin(s.angle)*48;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(s.angle - 2.4)*22, y + Math.sin(s.angle - 2.4)*22);
            ctx.lineTo(x, y);
            ctx.lineTo(x + Math.cos(s.angle + 2.4)*22, y + Math.sin(s.angle + 2.4)*22);
            ctx.stroke();
        }
    }
    // three lights ahead of the line's middle, lit red one a second, all green at the go; the count over them
    const lit = (race.phase === 'countdown') ? 4 - Math.ceil(race.count) : 0;
    const green = (race.phase === 'racing') && (race.clock < 1.5);
    const fx = Math.cos(s.angle);
    const fy = Math.sin(s.angle);
    ctx.globalAlpha = 1;
    for (let i = 0; i < 3; ++i) {
        const k = i - 1;
        const x = s.x + fx*170 + lx*k*44;
        const y = s.y + fy*170 + ly*k*44;
        ctx.fillStyle = green ? '#5fe08a' : (i < lit) ? '#ff4d5e' : '#2a3442';
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI*2);
        ctx.fill();
    }
    if ((race.phase === 'countdown') || green) {
        const beat = green ? race.clock/1.5 : 1 - (race.count % 1);
        ctx.globalAlpha = 1 - beat*0.7;
        ctx.fillStyle = green ? '#5fe08a' : '#fff3d0';
        ctx.font = `800 ${Math.round(150 - beat*40)}px "JetBrains Mono", ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(green ? 'GO' : String(Math.max(1, Math.ceil(race.count))), s.x + fx*300, s.y + fy*300);
    }
    if (!live) {
        world_label(s.x - Math.cos(s.angle)*120, s.y - Math.sin(s.angle)*120, 'START LINE', `${course.rings.length} rings · ${count} racers`, gold);
    }
    ctx.restore();
}

// The rivals, each in its colour with its place and name under it, a bar once raiders have hurt it, its engine's
// flame behind it (race_rival_plume)
function race_render_rivals()
{
    if (!race.course) {
        return;
    }
    for (const v of race.racers) {
        if (v.you || v.out || (v.alpha <= 0.02) || !in_view(v, v.length + 60)) {
            continue;
        }
        race_rival_plume(v);
        render_surface_ship(v.x, v.y, v.angle, v.alpha, false, (v.flash > 0) ? v.drawing_hit : v.drawing);
        ctx.save();
        ctx.globalAlpha = v.alpha;
        const y = v.y + v.length*0.55 + 16/zoom;
        ctx.font = race_font(Math.round(11/zoom));
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = v.color;
        ctx.fillText(v.tag, v.x, y);
        if (v.hp < v.max_hp) {
            const w = v.length;
            ctx.fillStyle = '#101623';
            ctx.fillRect(v.x - w/2, v.y - v.length*0.55 - 10, w, 3);
            ctx.fillStyle = v.color;
            ctx.fillRect(v.x - w/2, v.y - v.length*0.55 - 10, (w*v.hp)/v.max_hp, 3);
        }
        ctx.restore();
    }
}

// A rival's engine: a flame tapering to nothing behind the hull, white at the nozzle and its colour after, as your
// ship's is (render_engine_plumes); short as it cruises, long on its turbo, none while it stands. Its gradient runs
// along a flame one unit long, made once per rival and scaled to the flame's size.
function race_rival_plume(v)
{
    const speed = Math.sqrt(v.vx*v.vx + v.vy*v.vy);
    const power = (v.turbo > 0) ? 1 : clamp(speed/v.pace, 0, 1)*0.4;
    if (power < 0.05) {
        return;
    }
    if (!v.plume) {
        v.plume = ctx.createLinearGradient(0, 0, 1, 0);
        v.plume.addColorStop(0, '#f1faffee');
        v.plume.addColorStop(0.18, `${v.color}cc`);
        v.plume.addColorStop(0.6, `${v.color}44`);
        v.plume.addColorStop(1, `${v.color}00`);
    }
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle + Math.PI);
    ctx.translate(v.length*0.4, 0);
    ctx.scale(v.length*(0.3 + 1.2*power), v.length*(0.05 + 0.04*power));
    ctx.globalAlpha = v.alpha*(0.55 + 0.45*power);
    ctx.fillStyle = v.plume;
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.bezierCurveTo(0.2, -1, 0.7, -0.4, 1, 0);
    ctx.bezierCurveTo(0.7, 0.4, 0.2, 1, 0, 1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

// The minimap while a race is near: the course fills it, not the world, with the rocks round it, the rings (the next
// one lit), the rivals as dots in their colours and you. True when it drew.
function race_minimap(box)
{
    if (!race.course || !box) {
        return false;
    }
    const course = race.course;
    const x = box.left + 5;
    const y = box.top + 5;
    const w = Math.round(box.width - 10);
    const h = Math.round(box.height - 10);
    const top = 16;
    const mh = h - top;
    const {left, right, up, down} = race.box;
    const k = Math.min(w/(right - left), mh/(down - up));

    const ox = x + (w - (right - left)*k)/2 - left*k;
    const oy = y + top + (mh - (down - up)*k)/2 - up*k;
    const rings = course.rings;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = minimap_covers_raider(box) ? 0.35 : 0.85;
    ctx.fillStyle = '#060a14d0';
    ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
    ctx.strokeStyle = '#ffd16e44';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 5, y - 5, w + 10, h + 10);
    ctx.font = 'bold 9px ui-monospace,monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = gold;
    ctx.fillText(race.title, x, y + 7);
    ctx.beginPath();
    ctx.rect(x, y + top, w, mh);
    ctx.clip();
    // the rocks and the course's line, drawn again once a second (Verdant's rocks drift) or when the box changes
    const ground = race_minimap_ground(w, mh, ox - x, oy - y - top, k);
    ctx.drawImage(ground, x, y + top, w, mh);
    const you = race_you();
    const next = you ? you.next : 0;
    ctx.font = 'bold 8px ui-monospace,monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < rings.length; ++i) {
        const px = ox + rings[i].x*k;
        const py = oy + rings[i].y*k;
        const lit = (i === next) && (race.phase !== 'results');
        ctx.strokeStyle = (i < next) ? '#8396ab88' : lit ? '#fff3d0' : gold;
        ctx.lineWidth = lit ? 2 : 1;
        ctx.beginPath();
        ctx.arc(px, py, lit ? 6 : 4.5, 0, Math.PI*2);
        ctx.stroke();
        ctx.fillStyle = (i < next) ? '#8396ab' : gold;
        ctx.fillText(race_numbers[i], px, py - 10);
    }
    ctx.fillStyle = gold;
    ctx.fillRect(ox + course.start.x*k - 4, oy + course.start.y*k - 1.5, 8, 3);
    for (const v of race.racers) {
        if (v.you || v.out || (v.alpha < 0.3)) {
            continue;
        }
        ctx.fillStyle = v.color;
        ctx.beginPath();
        ctx.arc(ox + v.x*k, oy + v.y*k, 2.6, 0, Math.PI*2);
        ctx.fill();
    }
    map_icon(ctx, 'you', clamp(ox + player.x*k, x, x + w), clamp(oy + player.y*k, y + top, y + h), 12, null, player.angle + Math.PI/2);
    ctx.restore();
    return true;
}

// The minimap's still part in a race: the rocks round the course and its line, on a canvas of its own at twice the
// box's size, kept a second
function race_minimap_ground(w, h, ox, oy, k)
{
    const g = race.ground;
    if (g && (g.w === w) && (g.h === h) && (time - g.at < 1) && (time >= g.at)) {
        return g.canvas;
    }
    const canvas = (g && (g.w === w) && (g.h === h)) ? g.canvas : document.createElement('canvas');
    canvas.width = w*2;
    canvas.height = h*2;
    race.ground = {canvas, w, h, at: time};
    const draw = canvas.getContext('2d');
    const {left, right, up, down} = race.box;
    const course = race.course;
    draw.scale(2, 2);
    draw.fillStyle = '#7d6a52';
    for (const v of ore_nodes) {
        if ((v.hp <= 0) || (v.x < left) || (v.x > right) || (v.y < up) || (v.y > down)) {
            continue;
        }
        draw.beginPath();
        draw.arc(ox + v.x*k, oy + v.y*k, Math.max(1, v.r*k), 0, Math.PI*2);
        draw.fill();
    }
    draw.strokeStyle = '#ffd16e66';
    draw.lineWidth = 1;
    draw.setLineDash([3, 3]);
    draw.beginPath();
    draw.moveTo(ox + course.start.x*k, oy + course.start.y*k);
    for (const v of course.rings) {
        draw.lineTo(ox + v.x*k, oy + v.y*k);
    }
    draw.stroke();
    return canvas;
}

// On the whole world's minimap: the course of a race contract in this world, a small gold line from the start
function race_minimap_course(draw, point)
{
    const m = race_contract();
    if (!m) {
        return;
    }
    const points = [m.race.start, ...m.race.rings].map(point);
    draw.save();
    draw.strokeStyle = gold;
    draw.lineWidth = 1.5;
    draw.beginPath();
    for (let i = 0; i < points.length; ++i) {
        if (i) {
            draw.lineTo(points[i].x, points[i].y);
        }
        else {
            draw.moveTo(points[i].x, points[i].y);
        }
    }
    draw.stroke();
    draw.fillStyle = gold;
    draw.fillRect(points[0].x - 3, points[0].y - 3, 6, 6);
    draw.restore();
}

// The mission card in a race: your place, the ring to fly through and its distance; held at the start while raiders
// are near; red off the course. False when no race is on, and the card is the guide's.
function race_card()
{
    if (!['hold', 'countdown', 'racing'].includes(race.phase)) {
        return false;
    }
    const you = race_you();
    const course = race.course;
    const count = race.racers.length;
    let kind = '';
    let title = '';
    let target = null;
    let eta = '';
    let danger = false;
    if (race.phase === 'hold') {
        target = enemies.filter(v => v.hp > 0).sort((a, b) => distance(a, player) - distance(b, player))[0] || course.start;
        kind = 'Race · start held';
        title = 'Raiders hold the start';
        eta = `${hud_near_count()} near`;
        danger = true;
    }
    else if (race.phase === 'countdown') {
        target = course.rings[0];
        kind = `Race · lined up · ${count} racers`;
        title = `Get ready · ${Math.max(1, Math.ceil(race.count))}`;
        eta = 'Ring 1';
    }
    else {
        const n = Math.min(you.next, course.rings.length - 1);
        const place = race_standings().indexOf(you) + 1;
        target = course.rings[n];
        danger = race.leash > 0;
        kind = `Race · ${race_ordinal(place)} of ${count}`;
        title = (n === course.rings.length - 1) ? 'Through the finish ring' : `Ring ${n + 1} of ${course.rings.length}`;
        eta = danger ? `Off course · ${Math.ceil(race_leash_time - race.leash)} s` : race_time_text(race.clock);
    }
    const kind_el = document.getElementById('mc_kind');
    hud_text(kind_el, kind);
    kind_el.classList.toggle('eyebrow--red', danger);
    kind_el.classList.toggle('eyebrow--gold', !danger);
    hud_text(document.getElementById('mc_title'), title);
    const dist = document.getElementById('mc_dist');
    set_hidden(dist, false);
    dist.classList.toggle('is-danger', danger);
    const [value, unit] = hud_distance(distance(player, target));
    hud_html(document.getElementById('mc_distance'), `${value}<small>${unit}</small>`);
    hud_text(document.getElementById('mc_eta'), eta);
    const a = Math.atan2(target.y - player.y, target.x - player.x);
    document.getElementById('mc_arrow').style.transform = `rotate(${a + Math.PI/4}rad)`;
    if (hud_card_key !== 'race') {
        hud_card_key = 'race';
        document.getElementById('mc_acts').replaceChildren();
    }
    hud_html(document.getElementById('mc_tracks'), '');
    return true;
}

// The standings on the HUD: place, name and rings (or time, or out) for each racer, your row lit; after the race,
// the results with your prize under them. Hidden while no race is on.
function race_board_sync()
{
    const board = document.getElementById('race_board');
    const shown = !!race.course && ['hold', 'countdown', 'racing', 'done', 'results'].includes(race.phase) && ['playing', 'paused'].includes(state);
    set_hidden(board, !shown);
    if (!shown) {
        return;
    }
    const n = race.course.rings.length;
    const over = (race.phase === 'done') || (race.phase === 'results');
    const started = race_started();
    // before green the racers stand as they are lined up, with no places yet
    const list = started ? race_standings() : race.racers;
    const rows = list.map(function (v, i) {
        const right = v.out ? 'Out' : (v.time !== null) ? race_time_text(v.time) : (race.phase === 'results') ? '—' : `${v.next}/${n}`;
        const name = v.you ? 'You' : v.name;
        return `<li class="${v.you ? 'is-you' : ''}${v.out ? ' is-out' : ''}" title="${ui_escape(name)}"><b>${started ? i + 1 : '·'}</b><i style="--c:${v.color}"></i><span class="nm">${ui_escape(name)}</span><span class="rg">${right}</span></li>`;
    });
    hud_text(document.getElementById('race_board_title'), over ? 'Results' : started ? 'Race' : 'Lined up');
    hud_text(document.getElementById('race_board_clock'), over ? `${race_ordinal(race.place)} of ${race.racers.length}` : started ? race_time_text(race.clock) : `${n} rings`);
    hud_html(document.getElementById('race_board_rows'), rows.join(''));
    const foot = document.getElementById('race_board_foot');
    set_hidden(foot, !over);
    hud_text(foot, !over ? '' : race_mode.active ? `${race_time_text(race_you().time ?? race.clock)} · par ${race_time_text(race.course.par)}` : `◆ ${ui_number(race.prize)} · dock to collect`);
}
