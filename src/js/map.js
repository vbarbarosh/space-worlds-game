function base_generate_map()
{
    const extent = arcade.active ? arcade_extent : world_extents[campaign.world];
    world.w = extent[0];
    world.h = extent[1];
    scenery = [];
    pickups = [];
    black_holes = [];
    portals = [];
    mining_fields = [];
    ore_nodes = [];
    let seed = wave*9127 + 83;
    function seeded() {
        seed = (seed*1664525 + 1013904223) >>> 0;
        return seed/4294967296;
    }
    for (let i = 0; i < 260 + wave*8; ++i) {
        scenery.push({
            x: 80 + seeded()*(world.w - 160),
            y: 80 + seeded()*(world.h - 160),
            r: 30 + seeded()*110,
            angle: seeded()*Math.PI*2,
            type: i % 3,
        });
    }
    const positions = [
        [
            [0.15, 0.25],
            [0.85, 0.75],
        ],
        [
            [0.18, 0.8],
            [0.82, 0.2],
        ],
        [
            [0.5, 0.12],
            [0.5, 0.88],
        ],
        [
            [0.5 + 850/world.w, 0.5 - 280/world.h],
            [0.89, 0.55],
        ],
    ];
    const colors = [cyan, pink, gold, blue];
    for (let i = 0, ii = positions.length; i < ii; ++i) {
        const position = positions[i];
        for (let j = 0, end = position.length; j < end; ++j) {
            const v = position[j];
            portals.push({x: world.w*v[0], y: world.h*v[1], r: 46, pair: i, label: 'ABCD'[i], color: colors[i], destination: i*2 + 1 - j});
        }
    }
    const count = 4 + Math.floor((wave - 1)/5)*2;
    for (let i = 0; i < count; ++i) {
        let x;
        let y;
        let radius = 1000 + seeded()*180;
        let valid = false;
        for (let j = 0; j < 100; ++j) {
            x = (i === 0) ? world.w/2 + 1700 : 600 + seeded()*(world.w - 1200);
            y = (i === 0) ? world.h/2 + 1050 : 600 + seeded()*(world.h - 1200);
            if (Math.hypot(x - world.w/2, y - world.h/2) < radius + 350) {
                continue;
            }
            if (portals.some(v => Math.hypot(x - v.x, y - v.y) < radius + 250)) {
                continue;
            }
            if (black_holes.some(v => Math.hypot(x - v.x, y - v.y) < radius + v.radius + 200)) {
                continue;
            }
            valid = true;
            break;
        }
        if (valid) {
            black_holes.push({x, y, radius, core: 48 + seeded()*22, strength: 920 + wave*12, phase: seeded()*6.28});
        }
    }
    function safe_point(x, y, margin = 100) {
        return black_holes.every(v => Math.hypot(v.x - x, v.y - y) > v.radius + margin);
    }
    for (let i = 0; i < 22; ++i) {
        let x;
        let y;
        for (let j = 0; j < 60; ++j) {
            const a = (i/22)*Math.PI*2 + wave*0.35;
            const r = 550 + seeded()*Math.min(world.w, world.h)*0.37;
            x = clamp(world.w/2 + Math.cos(a)*r, 180, world.w - 180);
            y = clamp(world.h/2 + Math.sin(a)*r, 180, world.h - 180);
            if (safe_point(x, y)) {
                break;
            }
        }
        for (let j = 0; j < 5; ++j) {
            pickups.push({
                x: x + (seeded() - 0.5)*90,
                y: y + (seeded() - 0.5)*90,
                type: 'artifact',
                value: 3 + Math.floor(wave/5),
                life: 1e9,
                phase: seeded()*6.28,
                cache: true,
            });
        }
        pickups.push({
            x: x + 35,
            y: y - 20,
            type: (i % 3 === 0) ? 'medkit' : (i % 3 === 1) ? 'energy' : 'health',
            value: 0,
            life: 1e9,
            phase: seeded()*6.28,
            cache: true,
        });
    }
    for (let i = 0; i < 12; ++i) {
        let x;
        let y;
        for (let j = 0; j < 80; ++j) {
            x = (i === 0) ? world.w/2 - 600 : 350 + seeded()*(world.w - 700);
            y = (i === 0) ? world.h/2 + 440 : 350 + seeded()*(world.h - 700);
            if (safe_point(x, y, 350) && !mining_fields.some(v => Math.hypot(x - v.x, y - v.y) < 600)) {
                break;
            }
        }
        const field = {x, y, r: 260, id: i};
        mining_fields.push(field);
        for (let j = 0; j < 9; ++j) {
            const a = seeded()*Math.PI*2;
            const r = 40 + seeded()*210;
            const size = 22 + seeded()*24;
            const hp = 30 + size + wave*3;
            ore_nodes.push(ore_resource_assign(ore_node_new({x: x + Math.cos(a)*r, y: y + Math.sin(a)*r, r: size, hp, max_hp: hp, type: 'ore', field: i, angle: seeded()*6.28, flash: 0}), i));
        }
    }
}

// A rock with every field it may get later, in one order: its resource (ore_resource_assign), its deposit (ore_reserve,
// ore_chip) and the drill on it (drones, outposts). All rocks keep one shape, so the loops over them read their numbers
// without boxing them; a field not set yet stays undefined, as it was, and a save keeps the same JSON
function ore_node_new(v)
{
    return {
        x: v.x,
        y: v.y,
        r: v.r,
        hp: v.hp,
        max_hp: v.max_hp,
        type: v.type,
        field: v.field,
        angle: v.angle,
        flash: v.flash,
        resource: v.resource,
        amount: v.amount,
        id: v.id,
        cutter: v.cutter,
        r0: v.r0,
        reserve0: v.reserve0,
        reserve: v.reserve,
        deposit: v.deposit,
        chip: v.chip,
        depleted: v.depleted,
    };
}

function segment_distance(v, a, b)
{
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = dx*dx + dy*dy;
    const t = l ? clamp(((v.x - a.x)*dx + (v.y - a.y)*dy)/l, 0, 1) : 0;
    const ex = v.x - a.x - dx*t;
    const ey = v.y - a.y - dy*t;
    return Math.sqrt(ex*ex + ey*ey);
}

// How far along the way from a to b (0 to 1) it first comes within reach of v; null when it never does on the way, or
// is within reach at a already
function segment_contact(v, a, b, reach)
{
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const fx = a.x - v.x;
    const fy = a.y - v.y;
    const outside = fx*fx + fy*fy - reach*reach;
    const l = dx*dx + dy*dy;
    const half = fx*dx + fy*dy;
    if ((outside <= 0) || !l || (half >= 0) || (half*half < l*outside)) {
        return null;
    }
    const t = (-half - Math.sqrt(half*half - l*outside))/l;
    return (t <= 1) ? t : null;
}

function fatal_gravity(h)
{
    play_log_hurt('black hole', 0, Math.max(0, player.hp));
    player.hp = 0;
    player.vx = 0;
    player.vy = 0;
    mouse_drive.active = false;
    mouse_drive.following = false;
    burst(player.x, player.y, pink, 65, 250);
    ring(h.x, h.y, pink, h.core*4, 0.7);
    sfx('pulse');
    finish(false);
    el.result_eyebrow.textContent = 'EVENT HORIZON CROSSED';
    el.result_title.textContent = 'The void took your ship.';
    el.result_description.textContent =
        'Black hole cores are fatal, even during a dash or with a full shield. Continue from your last saved flight with your loadout and contracts.';
}

function portal_exit(p)
{
    const a = Math.atan2(world.h/2 - p.y, world.w/2 - p.x);
    return {x: clamp(p.x + Math.cos(a)*125, 30, world.w - 30), y: clamp(p.y + Math.sin(a)*125, 30, world.h - 30)};
}

function update_player_navigation(dt, previous)
{
    player.portal_cd = Math.max(0, player.portal_cd - dt);
    gravity_move(player, dt);
    for (let i = 0; i < black_holes.length; ++i) {
        const h = black_holes[i];
        if (segment_distance(h, previous, player) < h.core + player.r) {
            fatal_gravity(h);
            return false;
        }
    }
    if (player.portal_cd <= 0) {
        for (let i = 0; i < portals.length; ++i) {
            const p = portals[i];
            if (segment_distance(p, previous, player) > p.r + player.r) {
                continue;
            }
            start_jump({local: p.destination, color: p.color, label: `LOCAL GATE ${p.label}`, gate: p});
            return false;
        }
    }
    return true;
}

function enemy_waypoint(v)
{
    // Every raider asks every frame: the distances are distance()'s own sum, worked here on a position read once, and
    // the portals walked by index, so no number is boxed on the way back from a call and no iterator steps
    const x = v.x;
    const y = v.y;
    let target = player;
    let shortest = Math.sqrt((x - player.x)*(x - player.x) + (y - player.y)*(y - player.y)) - 400;
    if (shortest < 900) {
        return target;
    }
    for (let i = 0; i < portals.length; ++i) {
        const portal = portals[i];
        const exit = portals[portal.destination];
        const cost =
            Math.sqrt((x - portal.x)*(x - portal.x) + (y - portal.y)*(y - portal.y)) +
            Math.sqrt((exit.x - player.x)*(exit.x - player.x) + (exit.y - player.y)*(exit.y - player.y));
        if (cost < shortest) {
            shortest = cost;
            target = portal;
        }
    }
    return target;
}

function update_enemy_portal(v, dt)
{
    v.portal_cd = Math.max(0, (v.portal_cd || 0) - dt);
    if (v.portal_cd > 0) {
        return;
    }
    // every raider, every frame: its position is read once and distance()'s sum worked here, as in enemy_waypoint
    const x = v.x;
    const y = v.y;
    const r = v.r;
    for (let i = 0; i < portals.length; ++i) {
        const p = portals[i];
        if (Math.sqrt((x - p.x)*(x - p.x) + (y - p.y)*(y - p.y)) > p.r + r) {
            continue;
        }
        const exit = portal_exit(portals[p.destination]);
        v.x = exit.x;
        v.y = exit.y;
        v.portal_cd = 3;
        ring(v.x, v.y, p.color, 80, 0.4);
        break;
    }
}

// In a world with no black hole nothing is pulled and no core takes anything: only the rocks' flash fades
function update_gravity_objects(dt)
{
    if (black_holes.length) {
        // the raiders this pass began with, by index: a split's young, pushed on the list, wait for the next frame
        const list = enemies;
        for (let i = 0, end = list.length; i < end; ++i) {
            const v = list[i];
            // the arcade's flagship holds its place against a hole: the climax is a fight, not a fall
            if ((v.hp <= 0) || (arcade.active && (v.type === 'boss'))) {
                continue;
            }
            gravity_move(v, dt, arcade_lure_pull_k(v));
            if (in_gravity_core(v, v.r*0.4)) {
                v.core_kill = true;
                damage_enemy(v, v.hp/(1 - (v.armor || 0)) + (v.shield || 0) + 1);
                if (v.hp <= 0) {
                    arcade_swallowed(v);
                }
            }
        }
        // in the arcade's Eclipse the hole bends the shots' ways too (arcade_gravity.js)
        const bend = arcade_gravity_on();
        const lists = [bullets, hostile, pickups, particles, trail];
        for (let j = 0, jj = lists.length; j < jj; ++j) {
            const items = lists[j];
            for (let i = 0; i < items.length; ++i) {
                const item = items[i];
                if (item.life <= 0) {
                    continue;
                }
                if (bend && (j < 2)) {
                    arcade_shot_bend_move(item, dt);
                }
                gravity_move(item, dt);
                if (in_gravity_core(item)) {
                    item.life = 0;
                }
            }
        }
    }
    for (let i = 0; i < ore_nodes.length; ++i) {
        const ore_node = ore_nodes[i];
        if (ore_node.hp <= 0) {
            continue;
        }
        ore_node.flash = Math.max(0, ore_node.flash - dt);
        if (black_holes.length) {
            gravity_move(ore_node, dt);
            if (in_gravity_core(ore_node, ore_node.r*0.4)) {
                ore_node.hp = 0;
            }
        }
    }
    // update() filtered the lists earlier this frame: these drop only what died since, a core's kill or a rock shot
    // apart, and most frames nothing did
    enemies = dead_drop(enemies, v => v.hp > 0);
    bullets = dead_drop(bullets, v => v.life > 0);
    hostile = dead_drop(hostile, v => v.life > 0);
    pickups = dead_drop(pickups, v => v.life > 0);
    particles = dead_drop(particles, v => v.life > 0);
    trail = dead_drop(trail, v => v.life > 0);
    ore_nodes = dead_drop(ore_nodes, v => v.hp > 0);
}

// The list as list.filter(alive) gives it, but the list itself when nothing in it is dead: no copy
function dead_drop(list, alive)
{
    for (let i = 0, end = list.length; i < end; ++i) {
        if (!alive(list[i])) {
            return list.filter(alive);
        }
    }
    return list;
}
