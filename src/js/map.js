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
            ore_nodes.push(ore_resource_assign({x: x + Math.cos(a)*r, y: y + Math.sin(a)*r, r: size, hp, max_hp: hp, type: 'ore', field: i, angle: seeded()*6.28, flash: 0}, i));
        }
    }
}

function segment_distance(v, a, b)
{
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = dx*dx + dy*dy;
    const t = l ? clamp(((v.x - a.x)*dx + (v.y - a.y)*dy)/l, 0, 1) : 0;
    return Math.hypot(v.x - a.x - dx*t, v.y - a.y - dy*t);
}

function fatal_gravity(h)
{
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
    let target = player;
    let shortest = distance(v, player) - 400;
    if (shortest < 900) {
        return target;
    }
    for (const portal of portals) {
        const cost = distance(v, portal) + distance(portals[portal.destination], player);
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
    for (let i = 0; i < portals.length; ++i) {
        const p = portals[i];
        if (distance(v, p) > p.r + v.r) {
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

function update_gravity_objects(dt)
{
    for (const v of enemies.slice()) {
        if (v.hp <= 0) {
            continue;
        }
        gravity_move(v, dt);
        if (in_gravity_core(v, v.r*0.4)) {
            v.core_kill = true;
            damage_enemy(v, v.hp/(1 - (v.armor || 0)) + (v.shield || 0) + 1);
        }
    }
    for (const items of [bullets, hostile, pickups, particles, trail]) {
        for (const item of items) {
            if (item.life <= 0) {
                continue;
            }
            gravity_move(item, dt);
            if (in_gravity_core(item)) {
                item.life = 0;
            }
        }
    }
    for (const ore_node of ore_nodes) {
        if (ore_node.hp <= 0) {
            continue;
        }
        ore_node.flash = Math.max(0, ore_node.flash - dt);
        gravity_move(ore_node, dt);
        if (in_gravity_core(ore_node, ore_node.r*0.4)) {
            ore_node.hp = 0;
        }
    }
    enemies = enemies.filter(v => v.hp > 0);
    bullets = bullets.filter(v => v.life > 0);
    hostile = hostile.filter(v => v.life > 0);
    pickups = pickups.filter(v => v.life > 0);
    particles = particles.filter(v => v.life > 0);
    trail = trail.filter(v => v.life > 0);
    ore_nodes = ore_nodes.filter(v => v.hp > 0);
}
