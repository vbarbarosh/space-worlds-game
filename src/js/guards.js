// A world's guard wing (docs/scenario/README.md, World guards): two to four ships in the world's colour with the guard
// mark, the first that are neither yours nor raiders. They patrol a loop of the station, the gates and the beacons, and
// fight the raiders they meet; they treat you by your reputation there: a Trusted pilot near the station gets their
// escort, a Wanted one is attacked on sight. Your shots hit them as they hit any hull: a stray bolt is forgiven, a
// burst costs 2 reputation and turns the wing on you for a while, a guard destroyed costs 5. The campaign only: the
// arcade and the races have none.
const guard_wing_names = ['Anchorage Patrol', 'Canopy Wardens', 'Refinery Militia', 'Arc Sentries', 'Bastion Guard', 'Glacier Watch', 'Foundry Lancers', 'Citadel Vigil'];
const guard_length = 62;
// How near a raider has to come to the wing for it to turn and fight, and how near the wing holds round it
const guard_sight = 950;
const guard_orbit = 300;
const guard_gun_reach = 680;
// How long a wing stays turned on you after you hurt it, and after you destroy one of it (s)
const guard_provoked_time = 25;
const guard_killed_time = 45;
// A guard lost comes back from the station this long after (s)
const guard_respawn_time = 75;
// Your hits on the wing it forgives: each counts one (a beam's light lance less), they fade by this many a second, and
// more than guard_anger_limit at once is fire on the guards, however hard the gun hits
const guard_anger_limit = 5;
const guard_anger_fade = 0.5;
// On a patrol stage the one who leads waits for you while you are farther than this (m), and a point of its route
// counts only with you within it
const guard_patrol_reach = 900;
// The round keeps within this of the station, a gate or a beacon farther out marked on the way to it (the far worlds
// are hundreds of km wide: Eclipse 240 by 180); a patrol stage flies a ring of six points this far out, less in a
// small world
const guard_route_reach = 8000;
const guard_ring_reach = 5000;
// Where a Trusted pilot gets the wing's escort: within this of the station (m)
const guard_escort_reach = 2600;
// Their places behind the one who leads, in its frame: back, then to its side
const guard_slots = [{x: -110, y: -80}, {x: -110, y: 80}, {x: -210, y: 0}];

let guards = [];
let guard_shots = [];
// where your shot's step began, for guards_hit_by_your_shot: one point kept, not one made per shot a frame
const guard_shot_from = {x: 0, y: 0};
// target_v: how fast what it fights moves, from where it was a frame ago (a raider keeps no velocity), so the bolts lead it
// choice: what guards_choose decides, one object kept for it (no garbage a frame)
const guard_wing = {world: -1, route: [], on_ring: false, leg: 0, mode: 'patrol', target: null, target_at: {x: 0, y: 0}, target_seen: false, target_v: {x: 0, y: 0}, choice: {mode: 'patrol', target: null}, provoked: 0, anger: 0, warned: -99, helped: -999, respawn: [], dealing: false};

// A world's wing: 2 in Haven and Verdant, 3 in Dustfall, Ion Reach and Obsidian, 4 in Cryosphere, Nova Forge and Eclipse
function guard_count(id = campaign.world)
{
    return 2 + Math.floor((world_tier(id) + 1)/3);
}

// One guard, as strong as its world's raiders are at the story's front: twice their shield, and a hull for about
// fifteen of their heaviest hits
function guard_make(index, x, y)
{
    const id = campaign.world;
    const hull = Math.round(450*raider_hit_scale());
    const shield = 2*(worlds[id].shield + Math.max(0, raider_tier(id) - world_tier(id))*15);
    const color = worlds[id].accent;
    // goal: where it wants to be, kept and set each frame; its drawing as render_surface_ship takes it, white while hit
    return {guard_ship: true, goal: {x, y}, drawing: {color, enemy: true, sprite: {name: 'guard-patrol', length: guard_length}}, drawing_hit: {color: '#e5faff', enemy: true, sprite: {name: 'guard-patrol', length: guard_length}}, x, y, vx: 0, vy: 0, angle: 0, r: guard_length*0.36, index, hp: hull, max_hp: hull, shield, max_shield: shield, since_hit: 9, flash: 0, fire_cd: rand(0.4, 1.2), color};
}

// A new world: its wing out of the station's berth, its patrol loop set (none in the arcade or the Races mode)
function guards_spawn()
{
    inspection_reset();
    guards = [];
    guard_shots = [];
    guard_wing.world = campaign.world;
    guard_wing.route = [];
    guard_wing.on_ring = false;
    guard_wing.leg = 0;
    guard_wing.mode = 'patrol';
    guard_wing.target = null;
    guard_wing.provoked = 0;
    guard_wing.anger = 0;
    guard_wing.respawn = [];
    if (arcade.active || race_mode.active) {
        return;
    }
    guard_wing.route = guards_route();
    for (let i = 0, end = guard_count(); i < end; ++i) {
        guards.push(guard_make(i, station.x + station_size/2 + 260 + i*70, station.y - 120 + i*80));
    }
}

// The patrol loop: off the station, then the gates and the beacons (on the way to them, in a wide world), each the
// nearest of those left, and back
function guards_route()
{
    const left = [...world_gates, ...beacons].map(function (v) {
        const d = distance(v, station);
        const k = (d > guard_route_reach) ? guard_route_reach/d : 1;
        return {x: station.x + (v.x - station.x)*k, y: station.y + (v.y - station.y)*k};
    });
    const out = [{x: station.x + station_size/2 + 450, y: station.y}];
    while (left.length) {
        const last = out[out.length - 1];
        left.sort((a, b) => distance(a, last) - distance(b, last));
        out.push(left.shift());
    }
    return out;
}

// The wing's choice, set on the one object kept for it
function guards_choice(mode, target)
{
    guard_wing.choice.mode = mode;
    guard_wing.choice.target = target;
    return guard_wing.choice;
}

// What the wing does now: fight you (Wanted, or hurt by you), fight the nearest raider in sight, escort a Trusted
// pilot near the station, or patrol
function guards_choose(lead)
{
    const tier = reputation_tier().id;
    const you = player && (state === 'playing') && !docking;
    if (you && ((tier === 'wanted') || (guard_wing.provoked > 0)) && (distance(lead, player) < guard_sight*1.5)) {
        return guards_choice('fight', player);
    }
    // a ring race on: the wing keeps off the course, waiting off the station
    if (race_calm()) {
        return guards_choice('hold', null);
    }
    let best = null;
    let near = guard_sight;
    for (let i = 0, end = enemies.length; i < end; ++i) {
        const v = enemies[i];
        // the flagships, commanders and the Leviathan are the contracts' own: the guards leave them to you
        if ((v.hp <= 0) || (v.type === 'boss') || v.elite || v.leviathan) {
            continue;
        }
        // raiders near you count too: from much farther with the Guards' seat (careers.js)
        const d = Math.min(distance(v, lead), you ? distance(v, player) + guard_sight - career_guard_reach() : Infinity);
        if (d < near) {
            near = d;
            best = v;
        }
    }
    if (best) {
        return guards_choice('fight', best);
    }
    // a patrol stage: you fly with the wing on its round (guards_patrol_stage)
    if (you && guards_patrol_stage()) {
        return guards_choice('patrol', null);
    }
    // a Suspect pilot, or one with sealed cargo, may be stopped for a scan (inspection.js)
    if (you && inspection_due(lead)) {
        return guards_choice('inspect', player);
    }
    if (you && (tier === 'trusted') && (distance(player, station) < guard_escort_reach)) {
        return guards_choice('escort', player);
    }
    return guards_choice('patrol', null);
}

// Where a guard wants to be: its place in the wing behind the one who leads (or behind you, escorting), or in a fight
// on the target's flank, square to your line of fire so your misses fly past it
function guard_goal(g, lead)
{
    const target = guard_wing.target;
    if (guard_wing.mode === 'fight') {
        if (target === player) {
            const a = Math.atan2(g.y - player.y, g.x - player.x) + 0.35;
            return guard_goal_set(g, player.x + Math.cos(a)*guard_orbit*1.2, player.y + Math.sin(a)*guard_orbit*1.2);
        }
        const ax = target.x - (player ? player.x : g.x);
        const ay = target.y - (player ? player.y : g.y);
        const l = Math.hypot(ax, ay) || 1;
        const side = (g.index % 2) ? 1 : -1;
        const spread = 1 + Math.floor(g.index/2)*0.45;
        return guard_goal_set(g, target.x - (ay/l)*guard_orbit*side*spread + (ax/l)*60, target.y + (ax/l)*guard_orbit*side*spread + (ay/l)*60);
    }
    // an inspection: the one who leads alongside you, on your right, the others behind it
    if ((guard_wing.mode === 'inspect') && (g === lead)) {
        const a = player.angle || 0;
        return guard_goal_set(g, player.x - Math.sin(a)*140, player.y + Math.cos(a)*140);
    }
    const leader = (guard_wing.mode === 'escort') ? player : lead;
    if ((guard_wing.mode === 'patrol') && (g === lead)) {
        return guard_wing.route[guard_wing.leg] || station;
    }
    if ((guard_wing.mode === 'hold') && (g === lead)) {
        return guard_wing.route[0] || station;
    }
    const slot = guard_slots[((guard_wing.mode === 'escort') ? g.index : g.index - 1 + guard_slots.length) % guard_slots.length];
    const a = leader.angle || 0;
    return guard_goal_set(g, leader.x + Math.cos(a)*slot.x - Math.sin(a)*slot.y, leader.y + Math.sin(a)*slot.x + Math.cos(a)*slot.y);
}

function guard_goal_set(g, x, y)
{
    g.goal.x = x;
    g.goal.y = y;
    return g.goal;
}

// Every frame in flight: the wing chooses, each guard flies to its place round the solid things and out of the black
// holes' pull, mends its shield, and fires at what the wing fights; the lost come back from the station
function guards_update(dt)
{
    if (guard_wing.world !== campaign.world) {
        guards_spawn();
    }
    guard_wing.provoked = Math.max(0, guard_wing.provoked - dt);
    guard_wing.anger = Math.max(0, guard_wing.anger - dt*guard_anger_fade);
    for (let i = guard_wing.respawn.length - 1; i >= 0; --i) {
        guard_wing.respawn[i] -= dt;
        if (guard_wing.respawn[i] <= 0) {
            guard_wing.respawn.splice(i, 1);
            guards.push(guard_make(guards.length, station.x + station_size/2 + 260, station.y));
        }
    }
    if (!guards.length) {
        inspection.active = false;
        guard_shots_update(dt);
        return;
    }
    const lead = guards[0];
    const choice = guards_choose(lead);
    const same = choice.target && (choice.target === guard_wing.target) && guard_wing.target_seen;
    guard_wing.target_v.x = same ? (choice.target.x - guard_wing.target_at.x)/Math.max(dt, 0.001) : 0;
    guard_wing.target_v.y = same ? (choice.target.y - guard_wing.target_at.y)/Math.max(dt, 0.001) : 0;
    guard_wing.target_seen = !!choice.target;
    if (choice.target) {
        guard_wing.target_at.x = choice.target.x;
        guard_wing.target_at.y = choice.target.y;
    }
    guard_wing.mode = choice.mode;
    guard_wing.target = choice.target;
    const patrol = guards_patrol_stage();
    // a patrol stage flies its ring; the usual round again once it is done
    if (!!patrol !== guard_wing.on_ring) {
        guard_wing.on_ring = !!patrol;
        guard_wing.route = patrol ? guards_ring(lead) : guards_route();
        guard_wing.leg = 0;
    }
    const stop = guard_wing.route[guard_wing.leg];
    if (stop && (guard_wing.mode === 'patrol') && (distance(lead, stop) < 260)) {
        guard_wing.leg = (guard_wing.leg + 1) % guard_wing.route.length;
        if (patrol && player && (distance(player, lead) < guard_patrol_reach)) {
            guards_patrol_point(patrol);
        }
    }
    // on a patrol stage the one who leads waits for you
    const waiting = patrol && (guard_wing.mode === 'patrol') && player && (distance(player, lead) > guard_patrol_reach);
    for (const g of guards) {
        g.flash = Math.max(0, g.flash - dt);
        g.since_hit += dt;
        if (g.since_hit > 5) {
            g.shield = Math.min(g.max_shield, g.shield + dt*g.max_shield*0.2);
        }
        const goal = guard_goal(g, lead);
        const d = distance(g, goal);
        // the one who leads cruises; the others close up faster, and an escort keeps your pace
        const pace = (guard_wing.mode === 'fight') ? 230 : (g === lead) ? 210 : 330;
        const speed = ((guard_wing.mode === 'escort') || (guard_wing.mode === 'inspect')) ? Math.max(pace, Math.hypot(player.vx, player.vy)*1.1) : pace;
        let heading = Math.atan2(goal.y - g.y, goal.x - g.x);
        heading = raider_avoid(g, heading);
        for (const h of black_holes) {
            const reach = gravity_reach(h);
            const away = distance(g, h);
            if (away < reach*0.9) {
                heading = Math.atan2(g.y - h.y, g.x - h.x);
            }
        }
        const want = ((g === lead) && waiting) ? 0 : Math.min(speed, d*2);
        const k = Math.min(1, dt*2.5);
        g.vx += (Math.cos(heading)*want - g.vx)*k;
        g.vy += (Math.sin(heading)*want - g.vy)*k;
        g.x = clamp(g.x + g.vx*dt, 24, world.w - 24);
        g.y = clamp(g.y + g.vy*dt, 24, world.h - 24);
        gravity_move(g, dt);
        // it faces where it flies, and what it fights once that is within its guns' reach
        const target = guard_wing.target;
        const aim = ((guard_wing.mode === 'fight') && (distance(g, target) < guard_gun_reach)) ? Math.atan2(target.y - g.y, target.x - g.x) : (Math.hypot(g.vx, g.vy) > 20) ? Math.atan2(g.vy, g.vx) : g.angle;
        g.angle += clamp(angle_delta(g.angle, aim), -dt*4, dt*4);
        g.fire_cd -= dt;
        if ((guard_wing.mode === 'fight') && (g.fire_cd <= 0) && (distance(g, target) < guard_gun_reach) && (Math.abs(angle_delta(g.angle, aim)) < 0.3)) {
            guard_fire(g, target);
            g.fire_cd = rand(0.75, 1.05);
        }
    }
    if (guard_wing.mode === 'inspect') {
        inspection_update(dt, lead);
    }
    guard_shots_update(dt);
}

// A patrol stage's round: six points on a ring round the station, the first the nearest to the one who leads; a point
// in a black hole's pull moved out of it, along its spoke
function guards_ring(lead)
{
    const r = Math.min(guard_ring_reach, world.w/4, world.h/4);
    const start = Math.atan2(lead.y - station.y, lead.x - station.x);
    const out = [];
    for (let i = 0; i < 6; ++i) {
        const a = start + (i*Math.PI)/3;
        let d = r;
        while ((d < r*1.8) && black_holes.some(v => distance(v, {x: station.x + Math.cos(a)*d, y: station.y + Math.sin(a)*d}) < gravity_reach(v) + 300)) {
            d += 400;
        }
        out.push({x: clamp(station.x + Math.cos(a)*d, 200, world.w - 200), y: clamp(station.y + Math.sin(a)*d, 200, world.h - 200)});
    }
    return out;
}

// The patrol stage under way in this world, if any (docs/goals.md, Stages with the guards)
function guards_patrol_stage()
{
    return campaign.contracts.find(v => !v.ready && (v.type === 'patrol') && (v.world === campaign.world)) || null;
}

// A point of the round flown with you: it counts, and every second one the wing meets a raider wing near the next
function guards_patrol_point(m)
{
    mission_event('patrol', 1, {contract_id: m.id});
    if (m.ready || (m.type !== 'patrol') || (m.progress % 2) || (enemies.length > 16)) {
        return;
    }
    const next = guard_wing.route[guard_wing.leg];
    const count = 2 + Math.floor(Math.min(9, (m.level || 1) - 1)/3);
    for (let i = 0; i < count; ++i) {
        spawn_operation_enemy(m, (i % 2) ? 'chaser' : 'shooter', next);
    }
    show_toast(`${guard_wing_names[campaign.world].toUpperCase()}: CONTACT`, `${count} RAIDERS AHEAD ON THE ROUND`, 3, 'danger');
}

// A guard's bolt at what the wing fights, leading it: heavy enough to go through its world's raider armour (about 16
// left of it on the hull at Haven's front, 25 at Eclipse's); at you it hurts as a raider's bolt would
function guard_fire(g, target)
{
    const speed = 820;
    const v = guard_wing.target_v;
    const t = intercept_time(target.x - g.x, target.y - g.y, v.x, v.y, speed);
    const a = Math.atan2(target.y + v.y*t - g.y, target.x + v.x*t - g.x) + rand(-0.03, 0.03);
    const at_you = target === player;
    const damage = at_you ? 12*raider_hit_scale() : (16 + world_armour(campaign.world)*armour_plating)*(1 + 0.15*world_tier(campaign.world));
    const x = g.x + Math.cos(g.angle)*guard_length*0.4;
    const y = g.y + Math.sin(g.angle)*guard_length*0.4;
    guard_shots.push({x, y, px: x, py: y, from: {x, y}, vx: Math.cos(a)*speed, vy: Math.sin(a)*speed, r: 3, life: guard_gun_reach*1.25/speed, damage, color: g.color, at_you});
    if (in_view(g, 0) && (distance(g, player) < 900)) {
        sfx('shot', 0.25, g);
    }
}

// The guards' bolts fly; one stops on a rock or a spire, on the first raider it meets, or on you when it was fired at
// you. A raider they destroy counts as yours: you fought beside them
function guard_shots_update(dt)
{
    if (!guard_shots.length) {
        return;
    }
    for (let i = 0, end = guard_shots.length; i < end; ++i) {
        const b = guard_shots[i];
        b.px = b.x;
        b.py = b.y;
        b.x += b.vx*dt;
        b.y += b.vy*dt;
        b.life -= dt;
        const from = b.from;
        from.x = b.px;
        from.y = b.py;
        if (guard_shot_blocked(b, from)) {
            b.life = 0;
            continue;
        }
        if (b.at_you) {
            if (player && (hostile_shot_contact(b, player, player.r + b.r) >= 0)) {
                damage_player(b.damage, false, 'shot', b);
                explode_impact(b.x, b.y, Math.atan2(b.vy, b.vx), 10, b.color, '#aab4bf');
                b.life = 0;
            }
            continue;
        }
        for (let j = 0, jend = enemies.length; j < jend; ++j) {
            const v = enemies[j];
            if ((v.hp <= 0) || (Math.abs(v.x - b.x) > v.r + 60) || (Math.abs(v.y - b.y) > v.r + 60) || (segment_distance(v, from, b) > v.r + b.r)) {
                continue;
            }
            guard_wing.dealing = true;
            damage_enemy(v, b.damage);
            guard_wing.dealing = false;
            explode_impact(b.x, b.y, Math.atan2(b.vy, b.vx), 9, b.color, '#aab4bf');
            b.life = 0;
            break;
        }
    }
    // the spent ones out, in place
    let n = 0;
    for (const b of guard_shots) {
        if (b.life > 0) {
            guard_shots[n++] = b;
        }
    }
    guard_shots.length = n;
}

// A bolt meets a rock or one of Obsidian's spires on its way: it stops there and does it no harm
function guard_shot_blocked(b, from)
{
    for (let i = 0, end = ore_nodes.length; i < end; ++i) {
        const v = ore_nodes[i];
        if ((v.hp > 0) && (Math.abs(v.x - b.x) < v.r + 40) && (Math.abs(v.y - b.y) < v.r + 40) && (segment_distance(v, from, b) < v.r + b.r)) {
            return true;
        }
    }
    return spires.length && spire_stops_shot(b, from);
}

// A raider's choice of prey: a guard nearer than you and within its reach, so the raiders fight the wing back
function guard_prey(enemy)
{
    if (!guards.length || enemy.escort_raider || enemy.robot_raider || (enemy.type === 'boss')) {
        return null;
    }
    let best = null;
    let near = Math.min(650, player ? distance(enemy, player) : Infinity);
    for (const g of guards) {
        const d = distance(enemy, g);
        if (d < near) {
            near = d;
            best = g;
        }
    }
    if (best) {
        enemy.guard_fight = clock;
        enemy.guard_prey = best;
    }
    return best;
}

// A guard takes a hit: the shield first, then the hull; one with none left is lost, and another comes from the station
function guard_hurt(g, damage)
{
    g.since_hit = 0;
    g.flash = 0.08;
    const absorbed = Math.min(g.shield, damage);
    g.shield -= absorbed;
    g.hp -= damage - absorbed;
    if (g.hp > 0) {
        return false;
    }
    explode(g.x, g.y, 46, g.color);
    burst(g.x, g.y, g.color, 24, 190);
    sfx('kill', 0.8, g);
    guards = guards.filter(v => v !== g);
    for (let i = 0; i < guards.length; ++i) {
        guards[i].index = i;
    }
    guard_wing.respawn.push(guard_respawn_time);
    return true;
}

// The guard a raider fires at now, for its missile to fly at; none when it fights you
function guard_prey_now(enemy)
{
    return (enemy.guard_prey && (clock - enemy.guard_fight < 0.5) && guards.includes(enemy.guard_prey)) ? enemy.guard_prey : null;
}

// A raider's missile within its fuse of a guard: it goes off there
function guards_missile_fuse(b)
{
    return guards.some(v => distance(b, v) < v.r + b.fuse);
}

// A raider's missile's wave reaches the guards as it reaches you
function guards_wave_hit(w)
{
    for (const g of guards.slice()) {
        const gap = distance(w, g) - g.r;
        if ((gap <= w.r) && !w.hit.has(g)) {
            w.hit.add(g);
            guard_hurt(g, missile_wave_damage(w, gap));
        }
    }
}

// A raider's bolt on a guard: it stops there, as on any hull
function guards_hit_by_raider_shot(b)
{
    for (const g of guards) {
        if ((Math.abs(g.x - b.x) > g.r + b.r + 60) || (Math.abs(g.y - b.y) > g.r + b.r + 60)) {
            continue;
        }
        const contact = hostile_shot_contact(b, g, g.r + b.r);
        if (contact < 0) {
            continue;
        }
        b.x = b.px + (b.x - b.px)*contact;
        b.y = b.py + (b.y - b.py)*contact;
        explode_impact(b.x, b.y, Math.atan2(b.vy, b.vx), 9, hostile_shot_color(b.color || pink), '#aab4bf');
        guard_hurt(g, b.damage || 13);
        return true;
    }
    return false;
}

// Whether the wing fights you now
function guards_hostile()
{
    return guards.length && (guard_wing.mode === 'fight') && (guard_wing.target === player);
}

// A wing that fights you is your guns' target too: its guard nearest you, within near, or null
function guards_target(near)
{
    if (!guards_hostile()) {
        return null;
    }
    let best = null;
    for (const g of guards) {
        const d = distance(g, player);
        if (d < near) {
            near = d;
            best = g;
        }
    }
    return best;
}

// Your shot on a guard. Your guns aim at raiders, and their shots pass over the guards as over every friendly hull;
// a shot you aimed yourself (the pointer), or any once the wing fights you, stops on a guard and hurts it. A stray
// bolt or two is forgiven with a word; more within a few seconds costs 2 reputation and turns the wing on you; a
// guard destroyed costs 5
function guards_hit_by_your_shot(b, px, py)
{
    if (!b.aimed && !guards_hostile()) {
        return false;
    }
    const from = guard_shot_from;
    from.x = px;
    from.y = py;
    for (const g of guards) {
        if ((Math.abs(g.x - b.x) > g.r + 80) || (Math.abs(g.y - b.y) > g.r + 80) || (segment_distance(g, from, b) > g.r + b.r)) {
            continue;
        }
        const id = campaign.world;
        const damage = b.damage || 10;
        explode_impact(b.x, b.y, Math.atan2(b.vy, b.vx), 9, b.color || cyan, '#aab4bf');
        // a wing already fighting you takes no more offence at your fire: only a guard destroyed counts then
        const was_angry = (guard_wing.provoked > 0) || guards_hostile();
        guard_wing.anger += Math.min(1, damage/20);
        if (guard_hurt(g, damage)) {
            reputation_change(id, -5, 'guard destroyed');
            guard_wing.provoked = Math.max(guard_wing.provoked, guard_killed_time);
            show_toast(`${guard_wing_names[id].toUpperCase()}: GUARD DOWN`, 'THE WING TURNS ON YOU', 4, 'danger');
        }
        else if (!was_angry && (guard_wing.anger > guard_anger_limit)) {
            reputation_change(id, -2, 'guard hit');
            guard_wing.provoked = guard_provoked_time;
            show_toast(`${guard_wing_names[id].toUpperCase()}: OPEN FIRE`, 'YOU FIRED ON THE GUARDS', 4, 'danger');
        }
        else if (!was_angry && (clock - guard_wing.warned > 8)) {
            guard_wing.warned = clock;
            show_toast(`${guard_wing_names[id].toUpperCase()}`, 'WATCH YOUR FIRE', 2.5, 'danger');
        }
        return true;
    }
    return false;
}

// A raider down: one you destroyed while it fought the guards is help they remember, +1 reputation (once a minute and
// a half at most)
function guards_raider_down(enemy)
{
    if (guard_wing.dealing || !enemy.guard_fight || (clock - enemy.guard_fight > 4) || (clock - guard_wing.helped < 90)) {
        return;
    }
    guard_wing.helped = clock;
    reputation_change(campaign.world, 1, 'helped the guards');
    show_toast(`${guard_wing_names[campaign.world].toUpperCase()}`, 'THANKS FOR THE HELP · +1 REPUTATION', 3, 'info');
}

// The wing on the map: a guard's mark in the world's colour for each
function guards_map_things(out, every_layer)
{
    if (!every_layer && !map_layer('yours')) {
        return;
    }
    for (const g of guards) {
        out.push({layer: 'yours', x: g.x, y: g.y, icon: 'guard', tint: g.color, label: '', small: true});
    }
}

// The guards in the world: each its hull in its world's colour, the guard mark over it, a bar once hurt, the wing's
// name under the one who leads; their bolts
function guards_render()
{
    for (const b of guard_shots) {
        if (!in_view(b, 40)) {
            continue;
        }
        ctx.save();
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx*0.025, b.y - b.vy*0.025);
        ctx.stroke();
        ctx.restore();
    }
    for (const g of guards) {
        if (!in_view(g, guard_length + 60)) {
            continue;
        }
        render_surface_ship(g.x, g.y, g.angle, 1, false, (g.flash > 0) ? g.drawing_hit : g.drawing);
        ctx.save();
        const top = g.y - guard_length*0.55 - 14/zoom;
        guard_mark(g.x, top - 8/zoom, 7/zoom, g.color);
        if ((g.hp < g.max_hp) || (g.shield < g.max_shield)) {
            const w = guard_length;
            ctx.fillStyle = '#101623';
            ctx.fillRect(g.x - w/2, top + 2/zoom, w, 3/zoom);
            ctx.fillStyle = g.color;
            ctx.fillRect(g.x - w/2, top + 2/zoom, (w*Math.max(0, g.hp))/g.max_hp, 3/zoom);
        }
        if (g === guards[0]) {
            ctx.font = race_font(Math.round(11/zoom));
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = g.color;
            ctx.fillText(guard_wing_names[campaign.world], g.x, g.y + guard_length*0.55 + 14/zoom);
        }
        ctx.restore();
    }
    if (guards.length) {
        inspection_render(guards[0]);
    }
}

// The guard mark: a small shield, outlined dark so it reads on any ground
function guard_mark(x, y, s, color)
{
    ctx.beginPath();
    ctx.moveTo(x - s, y - s*0.7);
    ctx.lineTo(x, y - s);
    ctx.lineTo(x + s, y - s*0.7);
    ctx.lineTo(x + s, y + s*0.1);
    ctx.quadraticCurveTo(x + s*0.8, y + s*0.8, x, y + s*1.15);
    ctx.quadraticCurveTo(x - s*0.8, y + s*0.8, x - s, y + s*0.1);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.strokeStyle = '#070b14';
    ctx.lineWidth = 2/zoom;
    ctx.fill();
    ctx.stroke();
}
