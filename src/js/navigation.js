function route_to(target)
{
    const queue = [[campaign.world]];
    const seen = new Set([campaign.world]);
    while (queue.length) {
        const route = queue.shift();
        const last = route[route.length - 1];
        if (last === target) {
            return route;
        }
        for (const next of worlds[last].links) {
            if (!seen.has(next)) {
                seen.add(next);
                queue.push([...route, next]);
            }
        }
    }
    return [];
}

function guide_base_track_world(id)
{
    const route = route_to(id);
    if (route.length < 2) {
        waypoint = {...station, label: worlds[id].station};
        return;
    }
    const gate = world_gates.find(v => v.destination === route[1]);
    waypoint = {...gate, label: 'GATE TO ' + worlds[route[1]].name};
}

function guide_base_track_contract(m)
{
    if (m.world !== campaign.world) {
        track_world(m.world);
        return;
    }
    const p =
        (m.type === 'mining')
            ? mining_fields.find(v => ore_nodes.some(vv => (vv.field === v.id) && (vv.hp > 0)))
            : (m.type === 'survey')
                ? beacons.find((b, i) => !m.scans.includes(i))
                : (m.type === 'boss')
                    ? combat_zone
                    : (m.type === 'escort')
                        ? escort || {x: station.x + 350, y: station.y + 250}
                        : (m.type === 'hunt')
                            ? {x: station.x - 1100, y: station.y + 800}
                            : station;
    waypoint = {...(p || station), label: m.title};
}

function guide_base_toggle_navigation()
{
    if (state === 'navigation') {
        state = nav_return;
        set_hidden(document.getElementById('navigation_overlay'), true);
        if (state === 'paused') {
            set_hidden(el.pause_overlay, false);
        }
        canvas.focus();
        return;
    }
    if (!['playing', 'paused'].includes(state)) {
        return;
    }
    nav_return = state;
    set_hidden(el.pause_overlay, true);
    state = 'navigation';
    stop_turbo();
    touch_boost_hold = false;
    keys.clear();
    mouse_drive.active = false;
    mouse_drive.following = false;
    joystick.active = false;
    render_navigation();
    set_hidden(document.getElementById('navigation_overlay'), false);
}

function guide_base_render_navigation()
{
    const parent = document.getElementById('nav_content');
    parent.replaceChildren();
    for (const b of document.querySelectorAll('[data-nav]')) {
        b.classList.toggle('selected', b.dataset.nav === nav_tab);
    }
    document.getElementById('nav_summary').textContent =
        'CURRENT ' +
        worlds[campaign.world].name +
        ' · WEAPON RATING ' +
        attack_rating() +
        ' · DEFENSE ' +
        defense_rating() +
        ' · ' +
        campaign.visited.length +
        '/8 worlds visited · Cargo ' +
        cargo_count() +
        '/' +
        cargo_capacity();
    if (nav_tab === 'jobs') {
        render_contracts(parent);
        return;
    }
    if (nav_tab === 'local') {
        card(
            parent,
            worlds[campaign.world].station,
            'Dock to repair, take contracts, trade and install modules.',
            'Safe zone · R within 230 units',
            'SET WAYPOINT',
            function () {
                waypoint = {...station, label: worlds[campaign.world].station};
                toggle_navigation();
            }
        );
        for (const world_gate of world_gates) {
            card(
                parent,
                'Gate → ' + worlds[world_gate.destination].name,
                worlds[world_gate.destination].weapons,
                'R within 155 units · ' + requirements(world_gate.destination),
                'SET WAYPOINT',
                function () {
                    waypoint = {...world_gate, label: 'GATE TO ' + worlds[world_gate.destination].name};
                    toggle_navigation();
                }
            );
        }
        for (const f of mining_fields.filter(v => ore_nodes.some(vv => vv.field === v.id))) {
            card(
                parent,
                'Mining field ' + (f.id + 1),
                'Automatic cannons extract ore and artifacts.',
                'Remaining rocks ' + ore_nodes.filter(v => v.field === f.id).length,
                'SET WAYPOINT',
                function () {
                    waypoint = {...f, label: 'MINING FIELD ' + (f.id + 1)};
                    toggle_navigation();
                }
            );
        }
        for (let i = 0, end = beacons.length; i < end; ++i) {
            const beacon = beacons[i];
            card(
                parent,
                'Survey beacon ' + (i + 1),
                'Approach within 120 units to scan for active contracts.',
                'X ' + Math.round(beacon.x) + ' / Y ' + Math.round(beacon.y),
                'SET WAYPOINT',
                function () {
                    waypoint = {...beacon, label: 'BEACON ' + (i + 1)};
                    toggle_navigation();
                }
            );
        }
        return;
    }
    for (let i = 0, end = worlds.length; i < end; ++i) {
        const world = worlds[i];
        const route = route_to(i);
        const current = i === campaign.world;
        card(
            parent,
            String(i + 1).padStart(2, '0') + ' / ' + world.name,
            world.faction + ' · ' + world.weapons,
            requirements(i) + ' · ROUTE ' + route.map(v => worlds[v].name).join(' → '),
            current ? 'TRACK STATION' : 'TRACK JUMP ROUTE',
            function () {
                track_world(i);
                toggle_navigation();
            },
            false,
            current ? 'active' : allowed_world(i) ? '' : 'locked'
        );
    }
}

function requirements(id)
{
    const w = worlds[id];
    return (
        (allowed_world(id) ? 'FLIGHT CLEARED' : 'UPGRADE REQUIRED') +
        ' · WEAPONS ' +
        attack_rating() +
        '/' +
        w.attack +
        ' · DEFENSE ' +
        defense_rating() +
        '/' +
        w.defense +
        ' · RAD ' +
        Math.round(radiation_protection()*100) +
        '%/' +
        Math.round(expedition_conditions[id].required*100) +
        '%'
    );
}

function interact()
{
    if (state !== 'playing') {
        return;
    }
    if (distance(player, station) < 230) {
        dock_station();
        return;
    }
    const g = world_gates.find(v => distance(player, v) < 155);
    if (g) {
        if (!allowed_world(g.destination)) {
            show_toast('SHUTTLE NOT PREPARED', requirements(g.destination) + ' / DOCK AT THE OUTFITTER', 5);
            return;
        }
        start_jump({world: g.destination, color: g.color, label: 'JUMP TO ' + worlds[g.destination].name});
    }
}

function start_jump(destination)
{
    if ((state !== 'playing') || jump) {
        return;
    }
    state = 'transit';
    jump = {...destination, t: 0, duration: full_fx ? 2.2 : 0.7, switched: false, following: mouse_drive.following};
    mouse_drive.active = false;
    joystick.active = false;
    stop_turbo();
    touch_boost_hold = false;
    keys.clear();
    player.vx = player.vy = 0;
    player.dash_time = 0;
    hostile = [];
    bullets = [];
    ring(player.x, player.y, destination.color, 260, 0.8);
    burst(player.x, player.y, destination.color, 75, 450);
    sfx('portal');
}

function guide_base_update_jump(dt)
{
    time += dt;
    update_effects(dt);
    if (!jump) {
        return;
    }
    jump.t += dt;
    if (!jump.switched && (jump.t >= jump.duration*0.5)) {
        jump.switched = true;
        if (jump.world !== undefined) {
            store_world();
            campaign.world = jump.world;
            wave = worlds[campaign.world].wave;
            if (!campaign.visited.includes(campaign.world)) {
                campaign.visited.push(campaign.world);
            }
            enemies = [];
            hazards = [];
            begin_wave();
            waypoint = {...station, label: worlds[campaign.world].station};
        }
        else {
            const exit = portal_exit(portals[jump.local]);
            player.x = exit.x;
            player.y = exit.y;
        }
        player.portal_cd = 4;
        player.invincible = 3;
        trail = [];
        update_camera(0, true);
        burst(player.x, player.y, jump.color, 90, 450);
        ring(player.x, player.y, jump.color, 280, 0.9);
    }
    if (jump.t >= jump.duration) {
        const previous = jump;
        state = 'playing';
        jump = null;
        mouse_drive.following = previous.following;
        if (mouse_drive.following) {
            set_mouse_destination({x: mouse_drive.screen_x, y: mouse_drive.screen_y});
        }
        (previous.world !== undefined) ? show_world_arrival(previous.label) : show_toast(previous.label, 'LOCAL ARRIVAL / ' + current_world_rules().name, 3);
        save_checkpoint();
    }
}

function render_jump()
{
    if (!jump) {
        return;
    }
    const p = jump.t/jump.duration;
    const envelope = Math.sin(Math.PI*p);
    ctx.save();
    ctx.fillStyle = 'rgba(3,6,20,' + envelope*0.94 + ')';
    ctx.fillRect(0, 0, W, H);
    ctx.translate(W/2, H/2);
    ctx.strokeStyle = jump.color;
    ctx.globalAlpha = envelope;
    ctx.lineWidth = 2;
    const r = Math.max(W, H);
    for (let i = 0; i < (full_fx ? 65 : 12); ++i) {
        const a = i*2.39996 + clock*0.08;
        const phase = (i*0.137 + p*3) % 1;
        const near = 30 + phase*phase*r;
        const far = near + 40 + phase*160;
        ctx.globalAlpha = envelope*(0.3 + phase*0.7);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a)*near, Math.sin(a)*near);
        ctx.lineTo(Math.cos(a)*far, Math.sin(a)*far);
        ctx.stroke();
    }
    ctx.globalAlpha = envelope;
    for (let i = 0; i < 7; ++i) {
        const radius = 35 + ((i/7 + p*1.6) % 1)*r*0.65;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, radius, radius*0.6, p*1.4, 0, Math.PI*2);
        ctx.stroke();
    }
    ship(0, 0, -Math.PI/2, 1);
    ctx.fillStyle = '#f0fffc';
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px ui-monospace,monospace';
    ctx.fillText(jump.label, 0, H*0.25);
    ctx.font = '10px ui-monospace,monospace';
    ctx.fillStyle = jump.color;
    ctx.fillText((p < 0.5) ? 'GATE ALIGNMENT / SPACETIME FOLD' : 'FLIGHT VECTOR / ARRIVAL', 0, H*0.25 + 25);
    ctx.restore();
}

function guide_base_update_frontier(dt)
{
    const w = worlds[campaign.world];
    for (const enemy of enemies) {
        enemy.since_hit = (enemy.since_hit || 0) + dt;
        if (enemy.since_hit > 6) {
            enemy.shield = Math.min(enemy.max_shield || 0, (enemy.shield || 0) + dt*10);
        }
        if ((enemy.type !== 'shooter') && (enemy.type !== 'boss') && (enemy.weapon !== 'plasma')) {
            enemy.gun_cd -= dt;
            if ((enemy.gun_cd <= 0) && (distance(enemy, player) < 900)) {
                enemy_fire(enemy, Math.atan2(player.y - enemy.y, player.x - enemy.x));
                enemy.gun_cd = (enemy.type === 'tank') ? 2.8 : 3.6;
            }
        }
    }
    patrol_timer -= dt;
    if (patrol_timer <= 0) {
        patrol_timer = (campaign.world === 0) ? 11 : Math.max(4.5, 10 - campaign.world*0.6);
        if ((distance(player, station) > 550) && (enemies.length < 12)) {
            for (let i = 0; i < 1 + Math.floor(campaign.world/3); ++i) {
                spawn_enemy(enemy_type());
            }
        }
    }
    // Stations provide sanctuary: hostile fleets cannot swarm the docking ring.
    for (const enemy of enemies) {
        if (distance(enemy, station) < 500) {
            const a = Math.atan2(enemy.y - station.y, enemy.x - station.x);
            enemy.x = station.x + Math.cos(a)*510;
            enemy.y = station.y + Math.sin(a)*510;
        }
    }
    for (const m of campaign.contracts.filter(v => !v.ready && (v.world === campaign.world))) {
        if (m.type === 'survey') {
            for (let i = 0, end = beacons.length; i < end; ++i) {
                const beacon = beacons[i];
                if ((distance(player, beacon) < 120) && !m.scans.includes(i)) {
                    ring(beacon.x, beacon.y, cyan, 200, 0.9);
                    mission_event('survey', 1, {beacon: i});
                }
            }
        }
        if ((m.type === 'boss') && !enemies.some(v => v.mission_boss === m.id) && (distance(player, combat_zone) < 900)) {
            const enemy = spawn_enemy('boss');
            enemy.x = combat_zone.x;
            enemy.y = combat_zone.y;
            enemy.mission_boss = m.id;
            set_hidden(el.bossbar, false);
            el.bossbar.querySelector('.meter-row').textContent = (campaign.world === 7) ? 'VOID DREADNOUGHT' : 'EMBER FLAGSHIP';
        }
    }
    update_escort(dt);
    if (waypoint && (distance(player, waypoint) < 110)) {
        waypoint = null;
    }
    save_timer -= dt;
    if (save_timer <= 0) {
        save_timer = 15;
        save_checkpoint();
    }
}

function guide_base_update_hud()
{
    base_update_hud();
    if (!player) {
        return;
    }
    const w = worlds[campaign.world];
    const m = campaign.contracts.find(v => !v.ready) || campaign.contracts[0];
    const sector_html = String(campaign.world + 1).padStart(2, '0') + ' <small>/ 8</small>';
    if (el.sector.innerHTML !== sector_html) {
        el.sector.innerHTML = sector_html;
    }
    el.act_label.textContent = w.name.toUpperCase() + ' / THREAT ' + (campaign.world + 1);
    el.mission_name.textContent = m ? m.title : 'FREE FLIGHT / ' + w.station;
    el.mission_phase.textContent = m
        ? m.ready
            ? 'DOCK TO CLAIM ◆ ' + m.reward
            : worlds[m.world].name + ' · ' + format_progress(m.progress) + '/' + m.target
        : 'R DOCK · J NAVIGATION';
    el.sector_progress.style.width = m ? Math.min(100, (m.progress/m.target)*100) + '%' : '0%';
    const b = document.getElementById('dock_button');
    const g = world_gates.find(v => distance(player, v) < 155);
    b.disabled = (state !== 'playing') || !((distance(player, station) < 230) || g);
    b.textContent = g ? 'R JUMP' : 'R DOCK';
    document.getElementById('nav_button').disabled = !['playing', 'paused', 'navigation'].includes(state);
    if ((state === 'playing') && (distance(player, station) < 230)) {
        el.navigation_status.textContent += ' / R DOCK';
    }
    else if (g) {
        el.navigation_status.textContent += ' / ' + requirements(g.destination);
    }
}

function expedition_base_render_inventory()
{
    base_render_inventory();
    card(
        el.inventory_grid,
        'Cargo hold',
        commodities.map(v => v.name + ': ' + campaign.cargo[v.key]).join(' · '),
        'CAPACITY ' + cargo_count() + '/' + cargo_capacity() + ' · WEAPONS ' + attack_rating() + ' · DEFENSE ' + defense_rating()
    );
}

function finish(won)
{
    base_finish(won);
    document.getElementById('retry_sector').textContent = 'CONTINUE SAVED FLIGHT ↗';
    el.result_sector.textContent = worlds[campaign.world].name;
    el.result_description.textContent =
        'Continue from your last autosave with your contracts, cargo and upgrades. Prepare at a station before entering heavily armed worlds.';
    document.getElementById('nav_button').classList.add('hidden');
    document.getElementById('dock_button').classList.add('hidden');
}

function physics_base_render_navigation_objects()
{
    base_render_navigation_objects();
    const w = worlds[campaign.world];
    ctx.save();
    render_world_station();
    for (const world_gate of world_gates) {
        if (!in_view(world_gate, 200)) {
            continue;
        }
        if (view_mode === 'rendered') {
            render_gate_shell(world_gate, true);
        }
        ctx.strokeStyle = world_gate.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = world_gate.color;
        ctx.shadowBlur = full_fx ? 24 : 0;
        for (let i = 0; i < 3; ++i) {
            ctx.beginPath();
            ctx.ellipse(world_gate.x, world_gate.y, 72 + i*15, 55 + i*15, clock*0.12 + (i*Math.PI)/3, 0, Math.PI*2);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        polygon(world_gate.x, world_gate.y, 34, 6, -clock*0.4, world_gate.color, '#102233');
        ctx.fillStyle = world_gate.color;
        ctx.font = 'bold 11px ui-monospace,monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WORLD GATE → ' + worlds[world_gate.destination].name.toUpperCase(), world_gate.x, world_gate.y + 115);
        ctx.font = '9px ui-monospace,monospace';
        ctx.fillText('R JUMP · ' + (allowed_world(world_gate.destination) ? 'CLEARED' : 'UPGRADES REQUIRED'), world_gate.x, world_gate.y + 134);
    }
    for (let i = 0, end = beacons.length; i < end; ++i) {
        const beacon = beacons[i];
        if (!in_view(beacon)) {
            continue;
        }
        polygon(beacon.x, beacon.y, 24, 4, clock*0.2, cyan, '#142c35');
        ctx.strokeStyle = '#6cf8ec44';
        ctx.beginPath();
        ctx.arc(beacon.x, beacon.y, 50 + ((clock*20) % 45), 0, Math.PI*2);
        ctx.stroke();
        ctx.fillStyle = cyan;
        ctx.font = '10px ui-monospace,monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SCAN BEACON ' + (i + 1), beacon.x, beacon.y + 65);
    }
    if (escort) {
        ship(escort.x, escort.y, Math.atan2(escort.destination.y - escort.y, escort.destination.x - escort.x));
        ctx.fillStyle = gold;
        ctx.font = '10px ui-monospace,monospace';
        ctx.textAlign = 'center';
        ctx.fillText('FREIGHTER · ' + Math.ceil(escort.hp) + ' HULL', escort.x, escort.y - 35);
    }
    if (waypoint) {
        ctx.strokeStyle = gold;
        ctx.setLineDash([5, 10]);
        ctx.beginPath();
        ctx.arc(waypoint.x, waypoint.y, 65, 0, Math.PI*2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    ctx.restore();
}

function physics_base_render_minimap()
{
    base_render_minimap();
    if (!player || (state === 'menu') || (state === 'dead')) {
        return;
    }
    const viewport_width = (view_mode === 'cockpit') ? width : W;
    const w = (viewport_width < 800) ? 165 : 186;
    const h = (viewport_width < 800) ? 125 : 140;
    const x = viewport_width - w - 22;
    const y = 87;
    const sx = w/world.w;
    const sy = (h - 25)/world.h;
    ctx.save();
    ctx.fillStyle = cyan;
    ctx.fillRect(x + station.x*sx - 3, y + 23 + station.y*sy - 3, 6, 6);
    for (const world_gate of world_gates) {
        ctx.strokeStyle = world_gate.color;
        ctx.beginPath();
        ctx.arc(x + world_gate.x*sx, y + 23 + world_gate.y*sy, 5, 0, Math.PI*2);
        ctx.stroke();
    }
    for (const beacon of beacons) {
        ctx.fillStyle = '#6cf8ec77';
        ctx.fillRect(x + beacon.x*sx - 1, y + 23 + beacon.y*sy - 1, 3, 3);
    }
    if (waypoint) {
        ctx.strokeStyle = gold;
        ctx.beginPath();
        ctx.arc(x + waypoint.x*sx, y + 23 + waypoint.y*sy, 6, 0, Math.PI*2);
        ctx.stroke();
    }
    ctx.restore();
}

function guide_base_render_screen_controls()
{
    base_render_screen_controls();
    if (waypoint && player) {
        const px = (waypoint.x - camera.x)*zoom;
        const py = (waypoint.y - camera.y)*zoom;
        const x = clamp(px, 50, W - 50);
        const y = clamp(py, 255, H - 165);
        const d = Math.round(distance(player, waypoint));
        ctx.save();
        ctx.fillStyle = gold;
        ctx.font = '10px ui-monospace,monospace';
        ctx.textAlign = 'center';
        ctx.fillText(waypoint.label.toUpperCase() + ' · ' + d + ' m', x, y - 20);
        const a = Math.atan2(py - y, px - x);
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-6, -6);
        ctx.lineTo(-6, 6);
        ctx.fill();
        ctx.restore();
    }
    render_jump();
}
document.getElementById('nav_button').addEventListener('click', toggle_navigation);
document.getElementById('dock_button').addEventListener('click', interact);
document.getElementById('close_navigation').addEventListener('click', toggle_navigation);
for (const b of document.querySelectorAll('[data-nav]')) {
    b.addEventListener('click', function () {
        nav_tab = b.dataset.nav;
        render_navigation();
    });
}
for (const b of document.querySelectorAll('[data-station]')) {
    b.addEventListener('click', function () {
        station_tab = b.dataset.station;
        render_station();
    });
}
