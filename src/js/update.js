function base_update_hud()
{
    el.score.textContent = String(score).padStart(6, '0');
    el.sector.innerHTML = `${String(wave).padStart(2, '0')} <small>/ 15</small>`;
    el.combo.textContent = `×${combo}`;
    el.combo.style.color = (combo > 3) ? gold : '#eef4ff';
    el.salvage.textContent = salvage;
    if (!player) {
        return;
    }
    el.health_text.innerHTML = `${Math.ceil(player.hp)} <small>/ ${hull_max()}</small>`;
    el.health_fill.style.width = `${(player.hp/hull_max())*100}%`;
    el.pulse_text.textContent = (player.energy >= 100) ? 'Ready' : `${Math.floor(player.energy)}%`;
    el.pulse_fill.style.width = `${player.energy}%`;
    // short values only, so the gauge keeps one line: while thrusting the seconds left, lit
    el.dash_text.classList.toggle('t-cyan', !!player.turbo_active);
    el.dash_text.textContent = player.turbo_active
        ? `${turbo_fuel().toFixed(1)}s`
        : (player.dash_cd > 0)
            ? 'Cooling'
            : (turbo_fuel() >= turbo_duration() - 0.05)
                ? 'Ready'
                : `${turbo_fuel().toFixed(1)}s`;
    el.dash_fill.style.width = `${(turbo_fuel()/turbo_duration())*100}%`;
    document.getElementById('touch_pulse').disabled = player.energy < 100;
    document.getElementById('touch_dash').disabled = !player.turbo_active && ((player.dash_cd > 0) || (turbo_fuel() < 0.25));
    document.getElementById('touch_dash').textContent = 'HOLD TURBO';
    document.getElementById('touch_dash').setAttribute('aria-pressed', String(!!player.turbo_active));
    const boss = enemies.find(v => v.type === 'boss');
    if (boss) {
        el.boss_fill.style.width = `${clamp((boss.hp/boss.max_hp)*100, 0, 100)}%`;
    }
    el.act_label.textContent = `ACT ${['I', 'II', 'III'][Math.floor((wave - 1)/5)]} / ${current_sector().act}`;
    el.mission_name.textContent = current_sector().name;
    const phase = (spawn_left > 0) ? `WAVE ${phase_index} / 3` : `CLEAR ${enemies.length} SIGNALS`;
    el.mission_phase.textContent = `${phase}${(stasis_time > 0) ? ` · STASIS ${Math.ceil(stasis_time)}s` : ''}`;
    el.run_time.textContent = format_time(run_time);
    el.sector_progress.style.width = `${clamp(((phase_index - 1 + Math.min(1, phase_timer/current_sector().duration))/3)*100, 0, 100)}%`;
    for (const key of ['medkit', 'emp', 'stasis']) {
        const b = document.getElementById(`quick_${key}`);
        b.querySelector('b').textContent = supplies[key];
        b.disabled = (state !== 'playing') || !supplies[key] || ((key === 'medkit') && (player.hp >= hull_max())) || ((key === 'stasis') && (stasis_time > 0));
    }
    set_hidden(document.getElementById('quick_build'), arcade.active);
    set_hidden(document.getElementById('quick_route'), arcade.active);
    const convoy = document.getElementById('quick_convoy');
    set_hidden(convoy, !formation_candidates().some(v => distance(v, player) < 1500));
    convoy.querySelector('b').textContent = formation.leader ? 'Break off' : 'Formation';
    convoy.classList.toggle('on', !!formation.leader);
    const drone_button = document.getElementById('quick_drones');
    set_hidden(drone_button, arcade.active);
    drone_button.querySelector('b').textContent = drones_out ? `${drones.length}/${drones_owned()}` : drones_owned();
    drone_button.classList.toggle('on', drones_out);
    drone_button.disabled = (state !== 'playing') || (!drones_out && !drones_owned());
    document.getElementById('quick_magnet').querySelector('b').textContent = `Magnet ${upgrades.magnet}/7`;
    document.getElementById('quick_magnet').title = `Magnet level ${upgrades.magnet} of 7: ${format_reading(magnetic_radius())} px reach. Always on; upgrade it at a station.`;
    el.map_coordinates.textContent = `X ${Math.round(player.x)} / Y ${Math.round(player.y)} · ${world.w} × ${world.h}`;
    const danger = black_holes.some(v => distance(v, player) < gravity_reach(v));
    const steering = formation.leader ? 'IN FORMATION · G TO BREAK OFF' : `FOLLOW ${mouse_drive.following ? 'ON · DOUBLE CLICK TO STOP' : 'OFF · DOUBLE CLICK TO START'}`;
    const warning = danger ? ' / GRAVITY WELL · CORE FATAL' : (player.portal_cd > 0) ? ` / GATE COOLDOWN ${player.portal_cd.toFixed(1)}s` : '';
    el.navigation_status.textContent = `${steering}${warning}`;
    el.navigation_status.classList.toggle('danger', danger);
    el.shield_readout.textContent = `Shield ${Math.ceil(player.shield)}/${shield_max()}`;
}

function update_effects(dt)
{
    update_explosions(dt);
    for (const particle of particles) {
        particle.x += particle.vx*dt;
        particle.y += particle.vy*dt;
        particle.vx *= Math.pow(0.22, dt);
        particle.vy *= Math.pow(0.22, dt);
        particle.life -= dt;
    }
    particles = particles.filter(v => v.life > 0);
    for (const ring of rings) {
        ring.life -= dt;
    }
    rings = rings.filter(v => v.life > 0);
    for (const label of labels) {
        label.y -= 30*dt;
        label.life -= dt;
    }
    labels = labels.filter(v => v.life > 0);
    for (const v of trail) {
        v.life -= dt;
    }
    trail = trail.filter(v => v.life > 0);
    missile_wakes_update(dt);
    shake = Math.max(0, shake - dt*32);
    flash = Math.max(0, flash - dt);
}

function update(dt)
{
    time += dt;
    update_effects(dt);
    if (state === 'victory') {
        victory_timer -= dt;
        if (victory_timer <= 0) {
            finish(true);
        }
        return;
    }
    if (state !== 'playing') {
        return;
    }
    const previous_player = {x: player.x, y: player.y};
    player.previous_position = previous_player;
    run_time += dt;
    wave_timer += dt;
    phase_timer += dt;
    stasis_time = Math.max(0, stasis_time - dt);
    const enemy_dt = dt*((stasis_time > 0) ? 0.35 : 1);
    bodies_frame();
    player.since_hit += dt;
    if (player.since_hit > 5) {
        player.shield = Math.min(
            shield_max(),
            player.shield + dt*(5 + upgrades.shield*2)*(current_world_rules().shield + ((campaign.world === 5) ? upgrades.cooling*0.15 : 0))
        );
        player.hp = Math.min(hull_max(), player.hp + dt*upgrades.nanites*0.35);
    }
    player.energy = Math.min(100, player.energy + dt*upgrades.reactor*1.5);
    player.invincible = Math.max(0, player.invincible - dt);
    recharge_turbo(dt);
    player.shoot_cd -= dt;
    guns_cool(dt);
    combo_timer -= dt;
    if (combo_timer <= 0) {
        combo = 1;
    }
    // Turbo burns while its input is held and fuel lasts; let go and it stops and recharges at once.
    const mouse_turbo = mouse_drive.following && (mouse_drive.turbo_since >= 0) && (clock - mouse_drive.turbo_since > 0.15);
    const braking = keys.has('KeyB') || (player.brake_time > 0);
    const turbo_input = keys.has('ShiftLeft') || keys.has('ShiftRight') || touch_boost_hold || mouse_turbo;
    // Closing on a clicked point, turbo stays out so the ship can brake; a held input relights only once let go and pressed again.
    const click_arrival =
        mouse_drive.active && !mouse_drive.following && !mouse_drive.held &&
            (distance(player, mouse_drive) < Math.max(180, Math.hypot(player.vx, player.vy)*0.8)) && (waypoints.length < 2);
    mouse_drive.arriving = click_arrival;
    if (click_arrival && turbo_input) {
        mouse_drive.arrival_hold = true;
    }
    if (!turbo_input) {
        mouse_drive.arrival_hold = false;
    }
    const turbo_held = turbo_input && !braking && !click_arrival && !mouse_drive.arrival_hold;
    if (turbo_held && !player.turbo_active) {
        dash(true);
    }
    else if (!turbo_held && player.turbo_active) {
        stop_turbo();
    }
    let dx = ((keys.has('KeyD') || keys.has('ArrowRight')) ? 1 : 0) - ((keys.has('KeyA') || keys.has('ArrowLeft')) ? 1 : 0);
    let dy = ((keys.has('KeyS') || keys.has('ArrowDown')) ? 1 : 0) - ((keys.has('KeyW') || keys.has('ArrowUp')) ? 1 : 0);
    if (joystick.active) {
        dx = joystick.dx;
        dy = joystick.dy;
    }
    if (formation.leader && (Math.hypot(dx, dy) > 0)) {
        formation_stop();
    }
    else if (formation.leader) {
        const steer = formation_steer(dt);
        if (steer) {
            dx = steer.x;
            dy = steer.y;
        }
    }
    waypoint_steer();
    if ((Math.hypot(dx, dy) === 0) && mouse_drive.active) {
        if (mouse_drive.following || mouse_drive.held) {
            set_mouse_destination({x: mouse_drive.screen_x, y: mouse_drive.screen_y});
        }
        const mx = mouse_drive.x - player.x;
        const my = mouse_drive.y - player.y;
        const md = Math.hypot(mx, my);
        if ((md < 5) && !mouse_drive.following && !mouse_drive.held) {
            mouse_drive.active = false;
            player.vx = 0;
            player.vy = 0;
        }
        else if (md > 3) {
            // following the cursor (double click) or steering with the button held, the farther it is on screen the
            // faster the ship goes, at any zoom and screen size: easing in close, full cruise at three quarters of the
            // way to the nearer screen edge, above cruise past it (mouse_drive.follow_boost); a click's flight keeps its
            // own arrival
            const chasing = mouse_drive.following || mouse_drive.held;
            const reach = (md*zoom)/(Math.min(width, height)/2);
            const approach = chasing ? clamp((reach - 0.07)/0.68, 0, 1) : Math.min(1, md/45);
            mouse_drive.follow_boost = chasing ? 1 + 0.6*clamp((reach - 0.9)/0.8, 0, 1) : 1;
            dx = (mx/md)*approach;
            dy = (my/md)*approach;
        }
    }
    const length = Math.hypot(dx, dy);
    if (length > 1) {
        dx /= length;
        dy /= length;
    }
    const evaded = evasion_steer(dx, dy);
    dx = evaded.x;
    dy = evaded.y;
    if (Math.hypot(dx, dy) > 1) {
        const k = Math.hypot(dx, dy);
        dx /= k;
        dy /= k;
    }
    player.evading = Math.max(0, (player.evading || 0) - dt);
    fly_in_world(dt, dx, dy);
    player.x = clamp(player.x + player.vx*dt, 24, world.w - 24);
    player.y = clamp(player.y + player.vy*dt, 24, world.h - 24);
    docking_update(dt);
    if (!update_player_navigation(dt, previous_player)) {
        return;
    }
    update_camera(dt);
    pointer.x = pointer.screen_x/zoom + camera.x;
    pointer.y = pointer.screen_y/zoom + camera.y;
    let target = null;
    let near = Infinity;
    for (let i = 0, end = enemies.length; i < end; ++i) {
        const v = enemies[i];
        const d = distance(v, player);
        if ((d < near) && (v.hp > 0)) {
            near = d;
            target = v;
        }
    }
    // With no raider close, the turret shoots debris drifting at the ship before it hits.
    if (near > 600) {
        for (const piece of drifting_debris) {
            const d = distance(piece, player);
            const closing = ((player.x - piece.x)*(piece.vx - player.vx) + (player.y - piece.y)*(piece.vy - player.vy)) > 0;
            if ((d < 450) && closing && (d < near)) {
                near = d;
                target = piece;
            }
        }
    }
    // Guns mine only in the arcade; in the campaign rocks are the drones' work.
    if ((near > 600) && arcade.active) {
        for (let i = 0; i < ore_nodes.length; ++i) {
            const v = ore_nodes[i];
            const d = distance(v, player);
            if ((v.hp > 0) && (d < 650) && (d < near)) {
                near = d;
                target = v;
            }
        }
    }
    update_ship_orientation(dt, target, dx, dy);
    // The guns fire only at a target in their reach: a raider, debris about to hit, or (arcade) a rock; never into empty space.
    if (target) {
        guns_fire(near);
    }
    if (Math.hypot(player.vx, player.vy) > 20) {
        trail.push({x: player.x, y: player.y, angle: player.angle, life: (player.dash_time > 0) ? 0.3 : 0.16, total: (player.dash_time > 0) ? 0.3 : 0.16});
        if (full_fx && (player.turbo_active || (player.engine_thrust > 0.05)) && (Math.random() < 0.7)) {
            particles.push({
                x: player.x - Math.cos(player.angle)*14,
                y: player.y - Math.sin(player.angle)*14,
                vx: -player.vx*0.1 + rand(-20, 20),
                vy: -player.vy*0.1 + rand(-20, 20),
                life: 0.3,
                total: 0.3,
                color: cyan,
                size: 2,
            });
        }
    }
    spawn_timer -= dt;
    if ((spawn_left > 0) && (spawn_timer <= 0) && (enemies.length < 24) && !arcade.active) {
        spawn_enemy(enemy_type());
        spawn_left--;
        spawn_timer =
            (current_sector().duration/(current_sector().count + (phase_index - 1)*2))*
            ((difficulty === 'chill') ? 1.12 : (difficulty === 'overload') ? 0.86 : 1);
    }
    drop_timer -= dt;
    if (drop_timer <= 0) {
        drop_timer = 18;
        drop_pickup(player.x + rand(-W*0.35, W*0.35), player.y + rand(-H*0.35, H*0.35), ((player.hp < 65) && repair_drop_allowed()) ? 'health' : 'energy');
    }
    update_equipment(dt);
    update_hazards(dt);
    update_frontier(dt);
    if (arcade.active) {
        arcade_update(dt);
    }
    for (let i = 0, end = enemies.length; i < end; ++i) {
        const v = enemies[i];
        if (v.hp <= 0) {
            continue;
        }
        v.age += enemy_dt;
        v.flash = Math.max(0, v.flash - dt);
        const prey = (v.escort_raider && escort) ? escort : (v.robot_raider && survey_robot) ? survey_robot : structure_prey(v);
        const waypoint = prey || (drones.length && drone_prey(v)) || enemy_waypoint(v);
        const a = Math.atan2(waypoint.y - v.y, waypoint.x - v.x);
        const d = distance(v, player);
        let heading = a;
        let move = 1;
        // Chasers and splitters fly attack runs instead of ramming: they close to gun range and circle you, and every
        // few seconds one cuts straight across you, then pulls out to circle again
        if (['chaser', 'splitter'].includes(v.type) && (waypoint === player)) {
            v.run_cd = (v.run_cd ?? rand(2, 5)) - enemy_dt;
            if ((v.run_cd <= 0) && (d < 420)) {
                v.run_time = 1.5;
                v.run_cd = rand(3.5, 6.5);
            }
            if (v.run_time > 0) {
                v.run_time -= enemy_dt;
                move = 1.4;
            }
            else if (d < 330) {
                const side = (v.phase > Math.PI) ? 1 : -1;
                heading = a + side*clamp(Math.PI/2 - (d - 230)/260, 0.35, 2.4);
                move = 0.85;
            }
        }
        v.angle = heading;
        if (v.type === 'shooter') {
            move = (d < 220) ? -0.6 : (d < 320) ? 0.18 : 1;
            v.fire_cd -= enemy_dt;
            if ((v.fire_cd <= 0) && (v.age > 0.8)) {
                enemy_fire(v, a, 180 + wave*4);
                v.fire_cd = Math.max(1.2, 2.1 - wave*0.04);
                ring(v.x, v.y, gold, 30, 0.25);
            }
        }
        if (v.type === 'boss') {
            const tx = clamp(player.x + Math.cos(v.age*0.35)*350, 90, world.w - 90);
            const ty = clamp(player.y + Math.sin(v.age*0.35)*280, 90, world.h - 90);
            v.x += (tx - v.x)*enemy_dt*0.8;
            v.y += (ty - v.y)*enemy_dt*0.8;
            move = 0;
            v.fire_cd -= enemy_dt;
            if ((v.fire_cd <= 0) && (v.age > 1)) {
                const count = ((wave === 5) ? 10 : (wave === 10) ? 14 : 18) + ((v.hp < v.max_hp*0.45) ? 4 : 0);
                for (let j = 0; j < count; ++j) {
                    enemy_fire(v, (j/count)*Math.PI*2 + v.age*0.65, 125 + wave*2 + ((v.hp < v.max_hp*0.45) ? 25 : 0), true);
                }
                enemy_fire(v, a, 260);
                v.fire_cd = v.overdrive ? 0.6 : (v.hp < v.max_hp*0.45) ? 0.85 : 1.2;
                ring(v.x, v.y, pink, 90, 0.4);
            }
            if ((Math.floor(v.age/7) > Math.floor((v.age - enemy_dt)/7)) && (enemies.length < 16)) {
                spawn_enemy((Math.random() < 0.3) ? 'shooter' : 'chaser');
            }
        }
        if (v.type === 'lancer') {
            v.charge_cd -= enemy_dt;
            if ((v.charge_cd < 0.7) && (v.charge_time <= 0)) {
                move = 0.1;
                if (v.charge_cd > 0) {
                    v.charge_angle = a;
                }
            }
            if ((v.charge_cd <= 0) && (v.charge_time <= 0)) {
                v.charge_time = 0.7;
                v.charge_cd = 3.8;
                ring(v.x, v.y, gold, 45, 0.25);
            }
            if (v.charge_time > 0) {
                v.charge_time -= enemy_dt;
                v.x += Math.cos(v.charge_angle)*420*enemy_dt;
                v.y += Math.sin(v.charge_angle)*420*enemy_dt;
                move = 0;
            }
        }
        // raiders steer round the asteroids and structures ahead, as the rule for everything solid asks
        if (move > 0) {
            heading = raider_avoid(v, heading);
        }
        // the Leviathan's thrust is too weak against a black hole's pull: that is how it is caught
        if (v.leviathan && in_gravity_pull(v)) {
            move *= 0.35;
        }
        v.x += Math.cos(heading)*v.speed*move*enemy_dt;
        v.y += Math.sin(heading)*v.speed*move*enemy_dt;
        v.x = clamp(v.x, 24, world.w - 24);
        v.y = clamp(v.y, 24, world.h - 24);
        update_enemy_portal(v, enemy_dt);
        if (d < v.r + player.r) {
            damage_player((v.type === 'boss') ? 35 : (v.type === 'tank') ? 25 : 16);
            if (player.dash_time > 0) {
                damage_enemy(v, 35*dt);
            }
        }
    }
    // no two hulls overlap: raiders out of asteroids, structures, the freighter, you and each other
    bodies_resolve();
    apply_world_projectile_physics(dt);
    for (let i = 0, end = bullets.length; i < end; ++i) {
        const b = bullets[i];
        const px = b.x;
        const py = b.y;
        if (b.missile) {
            missile_guide(b, dt);
        }
        else if (b.homing && target && (distance(b, target) < 400)) {
            const angle = Math.atan2(target.y - b.y, target.x - b.x);
            const current = Math.atan2(b.vy, b.vx);
            const delta = Math.atan2(Math.sin(angle - current), Math.cos(angle - current));
            const next = current + clamp(delta, -dt*upgrades.homing*2.2, dt*upgrades.homing*2.2);
            const speed = Math.hypot(b.vx, b.vy);
            b.vx = Math.cos(next)*speed;
            b.vy = Math.sin(next)*speed;
        }
        b.x += b.vx*dt;
        b.y += b.vy*dt;
        b.life -= dt;
        for (let j = 0; j < enemies.length; ++j) {
            const v = enemies[j];
            if (v.hp <= 0) {
                continue;
            }
            const vx = b.x - px;
            const vy = b.y - py;
            const l = vx*vx + vy*vy;
            const t = l ? clamp(((v.x - px)*vx + (v.y - py)*vy)/l, 0, 1) : 0;
            if (Math.hypot(v.x - (px + vx*t), v.y - (py + vy*t)) < v.r + b.r) {
                hit_with_weapon(v, b);
                b.life = 0;
                burst(b.x, b.y, b.color || cyan, 3, 70);
                explode(b.x, b.y, 10, b.color || cyan, 0, 'spark');
                break;
            }
        }
        if (b.life > 0) {
            for (let j = 0; j < ore_nodes.length; ++j) {
                const v = ore_nodes[j];
                if (
                    (v.hp > 0) &&
                    (v.x >= Math.min(px, b.x) - v.r - b.r) &&
                    (v.x <= Math.max(px, b.x) + v.r + b.r) &&
                    (v.y >= Math.min(py, b.y) - v.r - b.r) &&
                    (v.y <= Math.max(py, b.y) + v.r + b.r) &&
                    (segment_distance(v, {x: px, y: py}, b) < v.r + b.r)
                ) {
                    if (arcade.active) {
                        damage_ore(v, b.damage*(current_ship().mining || 1));
                    }
                    else {
                        explode(b.x, b.y, 8, ore_color(v), 0, 'spark');
                    }
                    b.life = 0;
                    if (b.splash) {
                        blast_payload(b, null);
                    }
                    break;
                }
            }
        }
        if (b.life > 0) {
            for (const piece of drifting_debris) {
                if ((Math.abs(piece.x - b.x) < piece.r + 60) && (Math.abs(piece.y - b.y) < piece.r + 60) && (segment_distance(piece, {x: px, y: py}, b) < piece.r + b.r)) {
                    drifting_debris_hit(piece, b.damage);
                    b.life = 0;
                    break;
                }
            }
        }
    }
    for (let i = 0, end = hostile.length; i < end; ++i) {
        const b = hostile[i];
        const previous = {x: b.x, y: b.y};
        if (b.life <= 0) {
            continue;
        }
        if (b.missile) {
            missile_fly(b, (b.escort_target && escort) ? escort : player, enemy_dt);
        }
        b.x += b.vx*enemy_dt;
        b.y += b.vy*enemy_dt;
        b.life -= enemy_dt;
        if (block_hostile_ore(b, previous)) {
            continue;
        }
        // A shield is a bubble: it takes the shot at its edge, and the hull only once it is gone. The bubble is a wider
        // target than the hull, so a shot it takes counts by the ratio of the two: the shield drains as fast as if
        // only shots that would have hit the hull reached it.
        const shielded = player.shield > 0;
        const reach = (shielded ? ship_halo() + 3 : player.r) + b.r;
        if (distance(b, player) < reach) {
            const share = shielded ? (player.r + b.r)/reach : 1;
            damage_player((b.damage || 13)*(arcade.active ? arcade_mode().hits : 1)*share);
            if (shielded) {
                shield_impact(player, b, ship_halo() + 3);
            }
            if (b.weapon === 'ion') {
                player.energy = Math.max(0, player.energy - 8);
            }
            b.life = 0;
        }
    }
    missile_wakes_keep(bullets);
    missile_wakes_keep(hostile);
    bullets = bullets.filter(v => (v.life > 0) && (v.x > -40) && (v.x < world.w + 40) && (v.y > -40) && (v.y < world.h + 40));
    hostile = hostile.filter(v => (v.life > 0) && (v.x > -40) && (v.x < world.w + 40) && (v.y > -40) && (v.y < world.h + 40));
    enemies = enemies.filter(v => v.hp > 0);
    for (const pickup of pickups) {
        pickup.life -= dt;
        const d = distance(pickup, player);
        const takes = pickup_takes(pickup);
        if (!takes && (d < 30) && !pickup.full_said) {
            pickup.full_said = true;
            label(pickup.x, pickup.y, 'CARGO FULL', gold);
        }
        if (takes && (d < magnetic_radius())) {
            const pull = 1 - Math.exp(-(4 + upgrades.magnet*1.7)*dt);
            pickup.x += (player.x - pickup.x)*pull;
            pickup.y += (player.y - pickup.y)*pull;
        }
        if (takes && (distance(pickup, player) < 24)) {
            collect_pickup(pickup);
        }
    }
    pickups = pickups.filter(v => v.life > 0);
    if (state !== 'playing') {
        return;
    }
    update_gravity_objects(dt);
}
