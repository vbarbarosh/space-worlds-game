function fly_in_world(dt, dx, dy)
{
    const rule = current_world_rules();
    const ship = current_ship();
    const speed = cruise_speed();
    const input = clamp(Math.hypot(dx, dy), 0, 1);
    player.brake_time = Math.max(0, (player.brake_time || 0) - dt);
    const braking = keys.has('KeyB') || (player.brake_time > 0);
    if (braking && player.turbo_active) {
        stop_turbo();
    }
    const manual =
        ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some(v => keys.has(v)) ||
            (joystick.active && (Math.hypot(joystick.dx, joystick.dy) > 0.1));
    const auto = mouse_drive.active && !manual;
    const drift = braking ? {x: 0, y: 0} : world_flow(player);
    if ((campaign.world === 4) && !braking) {
        const p = world_bodies[0];
        const d = distance(player, p);
        if ((d > 30) && (d < 2100)) {
            const pull = (100*(1 - d/2100))/ship.traction;
            drift.x += ((p.x - player.x)/d)*pull;
            drift.y += ((p.y - player.y)/d)*pull;
        }
    }
    let target = player.angle;
    if (input > 0.04) {
        target = Math.atan2(dy - (auto ? drift.y/speed : 0), dx - (auto ? drift.x/speed : 0));
    }
    const velocity = Math.hypot(player.vx, player.vy);
    const turnRate =
        (3.8*ship.handling*(1 + upgrades.stabilizer*0.15)*clamp(rule.response/10, 0.65, 1.25))/(1 + Math.max(0, velocity/speed - 1)*0.65);
    const before = player.angle;
    player.angle = turn_toward(player.angle, target, turnRate*dt);
    player.hull_turn = (player.angle - before)/Math.max(0.001, dt);
    player.turbo_heading = player.angle;
    const alignment = Math.max(0, Math.cos(target - player.angle));
    const facing = (input > 0.04) ? 0.12 + 0.88*alignment : 1;
    const brake = rule.brake*ship.braking*(1 + upgrades.stabilizer*0.4);
    if (braking) {
        const f = velocity ? Math.max(0, velocity - brake*dt)/velocity : 0;
        player.vx *= f;
        player.vy *= f;
        player.engine_thrust = 0;
    }
    else if ((input > 0.04) || player.turbo_active) {
        const boost = !!player.turbo_active;
        let desiredSpeed = (boost ? turbo_speed() : speed)*(boost ? 1 : input)*facing;
        if (auto && (mouse_drive.following || mouse_drive.held) && !boost) {
            desiredSpeed *= mouse_drive.follow_boost || 1;
        }
        // Arrival braking for a click; a held button or follow mode chases the cursor and never arrives.
        if (auto && !mouse_drive.following && !mouse_drive.held) {
            const d = distance(player, {x: mouse_drive.x, y: mouse_drive.y});
            desiredSpeed = Math.min(desiredSpeed, Math.sqrt(2*brake*0.65*Math.max(0, d - 5)));
            if (boost && (d < Math.max(180, velocity*0.8))) {
                stop_turbo();
                desiredSpeed = Math.min(desiredSpeed, speed);
            }
        }
        const tx = Math.cos(player.angle)*desiredSpeed;
        const ty = Math.sin(player.angle)*desiredSpeed;
        const ax = tx - player.vx;
        const ay = ty - player.vy;
        const delta = Math.hypot(ax, ay);
        const acceleration = rule.thrust*ship.handling*(1 + upgrades.stabilizer*0.15)*(boost ? 2 : 1);
        const factor = delta ? Math.min(1, (acceleration*dt)/delta) : 0;
        player.vx += ax*factor;
        player.vy += ay*factor;
        player.engine_thrust = (boost ? 1 : input)*facing;
    }
    else {
        const drag = rule.inertial ? Math.max(0.35, rule.drag*4)*(1 + upgrades.stabilizer*0.35) : 6*ship.braking;
        const f = Math.exp(-drag*dt);
        player.vx *= f;
        player.vy *= f;
        if (Math.hypot(player.vx, player.vy) < 2) {
            player.vx = player.vy = 0;
        }
        player.engine_thrust = 0;
    }
    if (player.turbo_active) {
        player.dash_time = Math.max(0, player.dash_time - dt);
        player.turbo_fuel = player.dash_time;
        if (campaign.world === 6) {
            player.heat = clamp((player.heat || 0) + dt*Math.max(3, 16 - upgrades.cooling*3 - ship.cooling*8), 0, 100);
            if (player.heat >= 100) {
                player.overheated = true;
                stop_turbo();
            }
        }
        if (player.dash_time <= 0) {
            stop_turbo();
        }
    }
    player.x += drift.x*dt;
    player.y += drift.y*dt;
}

function brake_ship()
{
    if (state !== 'playing') {
        return;
    }
    guide_flying = false;
    mouse_drive.active = false;
    mouse_drive.following = false;
    player.brake_time = 1.2;
    keys.delete('KeyW');
    keys.delete('KeyA');
    keys.delete('KeyS');
    keys.delete('KeyD');
    label(player.x, player.y - 30, 'BRAKING', cyan);
}

function apply_world_projectile_physics(dt)
{
    const r = current_world_rules();
    const projectile_lists = [bullets, hostile];
    for (let i = 0, ii = projectile_lists.length; i < ii; ++i) {
        const items = projectile_lists[i];
        for (const item of items) {
            if (!item.physics_applied) {
                item.vx *= r.projectile;
                item.vy *= r.projectile;
                if (r.inertial && (i === 0)) {
                    item.vx += player.vx*0.3;
                    item.vy += player.vy*0.3;
                }
                item.physics_applied = true;
            }
            const flow = world_flow(item);
            item.x += flow.x*dt*0.9;
            item.y += flow.y*dt*0.9;
        }
    }
}

function update_world_environment(dt)
{
    if (state !== 'playing') {
        return;
    }
    environment_time += dt;
    const r = current_world_rules();
    player.heat = clamp((player.heat || 0) - dt*(10 + upgrades.reactor*2 + upgrades.cooling*5 + current_ship().cooling*8), 0, 100);
    player.environment_hit_cd = Math.max(0, (player.environment_hit_cd || 0) - dt);
    if (player.overheated && (player.heat < 55)) {
        player.overheated = false;
    }
    // the Pulse reactor and the world's own charge or drain in one step, so a drain after the cap can't hold it at 99%
    player.energy = clamp(player.energy + (upgrades.reactor*1.5 + r.energy)*dt, 0, 100);
    if ((campaign.world === 1) && (player.since_hit > 5)) {
        player.hp = Math.min(hull_max(), player.hp + 0.4*dt);
    }
    if (campaign.world === 1) {
        const flow = world_flow(player);
        physics_status = `CURRENT ${(flow.x > 0) ? 'E' : 'W'} / ${(flow.y > 0) ? 'S' : 'N'} · ${Math.round(Math.hypot(flow.x, flow.y))} m/s`;
        const drifting_lists = [enemies, pickups, ore_nodes];
        for (let j = 0, jj = drifting_lists.length; j < jj; ++j) {
            const items = drifting_lists[j];
            for (const item of items) {
                const f = world_flow(item);
                const weight = (j === 2) ? 0.15 : (j === 1) ? 1.2 : 0.65;
                item.x = clamp(item.x + f.x*dt*weight, 25, world.w - 25);
                item.y = clamp(item.y + f.y*dt*weight, 25, world.h - 25);
            }
        }
        recenter_mining_fields();
    }
    else if (campaign.world === 6) {
        physics_status =
            `${player.overheated ? 'OVERHEATED / COOLING' : `HEAT ${Math.round(player.heat)}/100`} · COOL ${10 + upgrades.reactor*2 + upgrades.cooling*5 + current_ship().cooling*8}/s`;
    }
    else if (r.inertial) {
        physics_status = `COAST ${Math.round(Math.hypot(player.vx, player.vy))} m/s · HOLD B TO BRAKE`;
    }
    else if (campaign.world === 7) {
        physics_status = 'PULSE −1.8/s · TURBO COST 12 · MAGNET ×0.72';
    }
    else {
        physics_status = `CRUISE ×${r.speed} · GRAVITY ×${r.gravity}`;
    }
    for (const world_zone of world_zones) {
        if ((distance(player, world_zone) > world_zone.r) || (distance(player, station) < station_shelter)) {
            continue;
        }
        const s = zone_state(world_zone);
        if (s.warning) {
            physics_status = `${(world_zone.type === 'storm') ? 'STORM' : 'SOLAR FLARE'} IN ${Math.ceil(s.remaining - 4)}s`;
        }
        if (!s.active) {
            continue;
        }
        if (world_zone.type === 'storm') {
            player.energy = Math.min(100, player.energy + 14*dt);
            player.shield = Math.max(0, player.shield - 12*dt);
            physics_status = 'STORM HARVEST · PULSE +14/s · SHIELD −12/s';
        }
        else {
            player.heat = Math.min(100, player.heat + 15*dt);
            if (player.heat >= 100) {
                player.overheated = true;
            }
            physics_status = 'SOLAR FLARE · HEAT +15/s';
            if (player.environment_hit_cd <= 0) {
                damage_player(10);
                player.environment_hit_cd = 1;
            }
        }
    }
    update_expedition_environment(dt);
    // asteroids are solid in every world: anything that looks like an object is one
    resolve_solid_ore();
}

function resolve_solid_ore()
{
    for (const ore_node of ore_nodes) {
        if (ore_node.hp <= 0) {
            continue;
        }
        const dx = player.x - ore_node.x;
        const dy = player.y - ore_node.y;
        const d = Math.hypot(dx, dy);
        const min = player.r + ore_node.r;
        if (d < min) {
            const nx = d ? dx/d : 1;
            const ny = d ? dy/d : 0;
            const speed = Math.hypot(player.vx, player.vy);
            const impact = player.vx*nx + player.vy*ny;
            player.x = ore_node.x + nx*(min + 2);
            player.y = ore_node.y + ny*(min + 2);
            if (impact < 0) {
                player.vx -= nx*impact*1.3;
                player.vy -= ny*impact*1.3;
            }
            if (speed > 110) {
                damage_player(Math.min(24, (speed - 80)*0.055));
                label(player.x, player.y - 25, 'ORE IMPACT', gold);
            }
        }
    }
}

function block_hostile_ore(b, previous)
{
    // the rock hit nearest to where the shot was; one clear of the shot's box by its reach is skipped unmeasured
    const left = Math.min(previous.x, b.x) - 1;
    const right = Math.max(previous.x, b.x) + 1;
    const top = Math.min(previous.y, b.y) - 1;
    const bottom = Math.max(previous.y, b.y) + 1;
    let v = null;
    let near = Infinity;
    for (let i = 0, end = ore_nodes.length; i < end; ++i) {
        const node = ore_nodes[i];
        const reach = node.r + b.r;
        if (!(node.hp > 0) || (node.x + reach < left) || (node.x - reach > right) || (node.y + reach < top) || (node.y - reach > bottom)) {
            continue;
        }
        if (!(segment_distance(node, previous, b) < reach)) {
            continue;
        }
        const d = distance(node, previous);
        if (d < near) {
            near = d;
            v = node;
        }
    }
    if (!v) {
        return false;
    }
    b.life = 0;
    if (current_world_rules().solid) {
        v.hp = Math.max(0, v.hp - (b.damage || 13)*0.5);
    }
    burst(v.x, v.y, worlds[campaign.world].accent, 4, 80);
    return true;
}

// mount: the campaign gun to fire; null for the arcade's one gun
function fire(mount = null)
{
    // The main engines' boost takes the reactor: the guns hold fire until it ends
    if (player.turbo_active) {
        return;
    }
    if ((campaign.world === 6) && player.overheated) {
        player.shoot_cd = 0.2;
        if (mount !== null) {
            player.gun_cd[mount] = 0.2;
        }
        return;
    }
    physics_base_fire(mount);
    player.shoot_cd *= current_world_rules().gun;
    if (mount !== null) {
        player.gun_cd[mount] *= current_world_rules().gun;
    }
    if (campaign.world === 6) {
        // the reactor heats by the volley, however many guns share it
        player.heat = Math.min(100, (player.heat || 0) + 3/((mount === null) ? 1 : mounted_weapons().length));
        if (player.heat >= 100) {
            player.overheated = true;
        }
    }
}

// held: ignition from an input still held down, retried every frame; it stays silent and waits for 1.5 s of charge,
// so holding on an empty tank gives bursts, not a flicker
function dash(held = false)
{
    if ((state !== 'playing') || player.turbo_active || (player.dash_cd > 0) || (turbo_fuel() < (held ? 1.5 : 0.25))) {
        return;
    }
    if ((campaign.world === 7) && (player.energy < 12)) {
        if (!held) {
            show_toast('TURBO NEEDS 12 PULSE', 'COLLECT ENERGY OR INSTALL A PULSE REACTOR', 2);
        }
        return;
    }
    if ((campaign.world === 6) && (player.overheated || (player.heat > 85))) {
        if (!held) {
            show_toast('ENGINE TOO HOT', 'COOL THE REACTOR BEFORE IGNITION', 2);
        }
        return;
    }
    const moving = Math.hypot(player.vx, player.vy) > 10;
    player.turbo_heading = moving ? Math.atan2(player.vy, player.vx) : player.angle;
    player.dash_time = turbo_fuel();
    player.turbo_active = true;
    player.dash_cd = 0;
    player.invincible = Math.max(player.invincible, 0.25);
    if (campaign.world === 7) {
        player.energy -= 12;
    }
    sfx('boost');
    update_hud();
}
