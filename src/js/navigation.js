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
    waypoint = {...gate, label: `GATE TO ${worlds[route[1]].name}`};
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
                        ? escort || {x: station.x + station_size/2 + 350, y: station.y + 250}
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
        b.classList.toggle('is-active', b.dataset.nav === nav_tab);
    }
    document.getElementById('nav_summary').textContent =
        `${worlds[campaign.world].name} · weapon rating ${attack_rating()} · defense ${defense_rating()} · ${campaign.visited.length}/8 worlds visited · cargo ${cargo_count()}/${cargo_capacity()}`;
    if (nav_tab === 'jobs') {
        render_contracts(parent);
        return;
    }
    if (nav_tab === 'local') {
        card(
            parent,
            worlds[campaign.world].station,
            'Dock to repair, take contracts, trade and install modules.',
            `Safe zone · R within ${station_reach} m`,
            'SET WAYPOINT',
            function () {
                waypoint = {...station, label: worlds[campaign.world].station};
                toggle_navigation();
            }
        );
        for (const world_gate of world_gates) {
            card(
                parent,
                `Gate → ${worlds[world_gate.destination].name}`,
                worlds[world_gate.destination].weapons,
                `R within 155 units · ${requirements(world_gate.destination)}`,
                'SET WAYPOINT',
                function () {
                    waypoint = {...world_gate, label: `GATE TO ${worlds[world_gate.destination].name}`};
                    toggle_navigation();
                }
            );
        }
        for (const f of mining_fields.filter(v => ore_nodes.some(vv => vv.field === v.id))) {
            card(
                parent,
                `Mining field ${f.id + 1}`,
                'Automatic cannons extract ore and artifacts.',
                `Remaining rocks ${ore_nodes.filter(v => v.field === f.id).length}`,
                'SET WAYPOINT',
                function () {
                    waypoint = {...f, label: `MINING FIELD ${f.id + 1}`};
                    toggle_navigation();
                }
            );
        }
        for (let i = 0, end = beacons.length; i < end; ++i) {
            const beacon = beacons[i];
            card(
                parent,
                `Survey beacon ${i + 1}`,
                'Approach within 120 units to scan for active contracts.',
                `X ${Math.round(beacon.x)} / Y ${Math.round(beacon.y)}`,
                'SET WAYPOINT',
                function () {
                    waypoint = {...beacon, label: `BEACON ${i + 1}`};
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
        function on_track() {
            track_world(i);
            toggle_navigation();
        }
        card(
            parent,
            `${String(i + 1).padStart(2, '0')} / ${world.name}`,
            `${world.faction} · ${world.weapons}`,
            `${requirements(i)} · ROUTE ${route.map(v => worlds[v].name).join(' → ')}`,
            current ? 'TRACK STATION' : 'TRACK JUMP ROUTE',
            on_track,
            false,
            current ? 'active' : allowed_world(i) ? '' : 'locked'
        );
    }
}

function requirements(id)
{
    const w = worlds[id];
    return `${allowed_world(id) ? 'FLIGHT CLEARED' : 'UPGRADE REQUIRED'} · WEAPONS ${attack_rating()}/${w.attack} · DEFENSE ${defense_rating()}/${w.defense} · RAD ${Math.round(radiation_protection()*100)}%/${Math.round(expedition_conditions[id].required*100)}%`;
}

function interact()
{
    if (state !== 'playing') {
        return;
    }
    if (arcade.active) {
        arcade_interact();
        return;
    }
    if (distance(player, station) < station_reach) {
        docking_start(dock_station);
        return;
    }
    const g = world_gates.find(v => distance(player, v) < 155);
    if (g) {
        if (!allowed_world(g.destination)) {
            show_toast('SHIP NOT READY', `${requirements(g.destination)} / DOCK AND OPEN MODULES`, 5);
            return;
        }
        start_jump({world: g.destination, color: g.color, label: `JUMP TO ${worlds[g.destination].name}`, gate: g});
        return;
    }
    station_course();
}

// Far from the station, Dock [R] sets the course to its nearest berth and flies there; the contract you follow stays
// followed, and the course ends once you dock
function station_course()
{
    const berth = docking_berths().sort((p, q) => distance(p, player) - distance(q, player))[0];
    guide_manual = {x: station.x + Math.cos(berth.a)*docking_lane, y: station.y + Math.sin(berth.a)*docking_lane, label: worlds[campaign.world].station, dock: true};
    waypoints_clear();
    guide_flying = true;
    guide_path_key = '';
    refresh_guidance();
    show_toast('COURSE SET', `${worlds[campaign.world].station.toUpperCase()} · R DOCKS ON ARRIVAL`, 2.5);
}

function start_jump(destination)
{
    waypoints_clear();
    survey_robot = null;
    structures_leave();
    if ((state !== 'playing') || jump) {
        return;
    }
    state = 'transit';
    const duration = (destination.world === undefined) ? hop_duration : full_fx ? warp_duration : warp_duration*0.55;
    jump = {...destination, t: 0, duration, switched: false, following: mouse_drive.following, from: {x: player.x, y: player.y}, angle: player.angle, vx: player.vx, vy: player.vy};
    teleport_start(jump);
    mouse_drive.active = false;
    joystick.active = false;
    stop_turbo();
    touch_boost_hold = false;
    keys.clear();
    player.vx = player.vy = 0;
    player.dash_time = 0;
    hostile = [];
    bullets = [];
    if (view_mode === 'cockpit') {
        ring(player.x, player.y, destination.color, 260, 0.8);
        burst(player.x, player.y, destination.color, 75, 450);
    }
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
            drones_recall_now();
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
            const exit = jump.exit_point || portal_exit(portals[jump.local]);
            player.x = exit.x;
            player.y = exit.y;
        }
        player.portal_cd = 4;
        player.invincible = 3;
        trail = [];
        update_camera(0, true);
        if (view_mode === 'cockpit') {
            burst(player.x, player.y, jump.color, 90, 450);
            ring(player.x, player.y, jump.color, 280, 0.9);
        }
    }
    teleport_view();
    if (jump.t >= jump.duration) {
        const previous = jump;
        state = 'playing';
        jump = null;
        teleport_end(previous);
        mouse_drive.following = previous.following;
        if (mouse_drive.following) {
            set_mouse_destination({x: mouse_drive.screen_x, y: mouse_drive.screen_y});
        }
        (previous.world !== undefined) ? show_world_arrival(previous.label) : show_toast(previous.label, `LOCAL ARRIVAL / ${current_world_rules().name}`, 3);
        save_checkpoint();
    }
}

// The cockpit's jump; the other views play the teleport (teleport.js)
function render_jump()
{
    if (!jump) {
        return;
    }
    if (view_mode !== 'cockpit') {
        render_teleport_screen();
        return;
    }
    const p = jump.t/jump.duration;
    const envelope = Math.sin(Math.PI*p);
    ctx.save();
    ctx.fillStyle = `rgba(3,6,20,${envelope*0.94})`;
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
        // Every raider fires its world's gun, Haven's plasma included; the CHILL arcade keeps plasma raiders unarmed,
        // as the arcade was before its modes; shards are pieces and only ram
        const armed = (enemy.weapon !== 'plasma') || !arcade.active || arcade_mode().armed;
        if ((enemy.type !== 'shooter') && (enemy.type !== 'boss') && (enemy.type !== 'shard') && armed) {
            enemy.gun_cd -= dt;
            // a raider sent for the survey robot shoots at it
            const target = structure_prey(enemy) || ((enemy.robot_raider && survey_robot) ? survey_robot : player);
            if ((enemy.gun_cd <= 0) && (distance(enemy, target) < 900)) {
                enemy_fire(enemy, Math.atan2(target.y - enemy.y, target.x - enemy.x));
                enemy.gun_cd = ((enemy.type === 'tank') ? 2.8 : 3.6)*(arcade.active ? arcade_mode().gun_gap : 1);
            }
        }
    }
    patrol_timer -= dt;
    if ((patrol_timer <= 0) && !arcade.active) {
        patrol_timer = (campaign.world === 0) ? 11 : Math.max(4.5, 10 - campaign.world*0.6);
        if ((distance(player, station) > station_shelter + 50) && (enemies.length < 12)) {
            for (let i = 0; i < 1 + Math.floor(campaign.world/3); ++i) {
                spawn_enemy(enemy_type());
            }
        }
    }
    // Stations provide sanctuary: hostile fleets cannot swarm the docking ring. The arcade has no sanctuary.
    for (const enemy of enemies) {
        if ((distance(enemy, station) < station_shelter) && !arcade.active) {
            const a = Math.atan2(enemy.y - station.y, enemy.x - station.x);
            enemy.x = station.x + Math.cos(a)*(station_shelter + 10);
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
    drones_update(dt);
    structures_update(dt);
    transports_update(dt);
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
    const sector_html = `${campaign.world + 1}<small>/${worlds.length}</small>`;
    if (el.sector.innerHTML !== sector_html) {
        el.sector.innerHTML = sector_html;
    }
    el.act_label.textContent = `${w.name.toUpperCase()} / THREAT ${campaign.world + 1}`;
    el.mission_name.textContent = m ? m.title : `FREE FLIGHT / ${w.station}`;
    el.mission_phase.textContent = m
        ? m.ready
            ? `DOCK TO CLAIM ◆ ${m.reward}`
            : `${worlds[m.world].name} · ${format_progress(m.progress)}/${m.target}`
        : 'R dock · J map and guide';
    el.sector_progress.style.width = m ? `${Math.min(100, (m.progress/m.target)*100)}%` : '0%';
    const b = document.getElementById('dock_button');
    const g = world_gates.find(v => distance(player, v) < 155);
    // far from the station it sets the course there, so it is always pressable in flight
    b.disabled = state !== 'playing';
    b.innerHTML = `${hud_dock_icon}<span>${g ? 'Jump' : 'Dock'}</span><span class="key">R</span>`;
    document.getElementById('nav_button').disabled = !['playing', 'paused', 'navigation'].includes(state);
    if ((state === 'playing') && (distance(player, station) < station_reach)) {
        el.navigation_status.textContent += ' / R DOCK';
    }
    else if (g) {
        el.navigation_status.textContent += ` / ${requirements(g.destination)}`;
    }
}

function expedition_base_render_inventory()
{
    base_render_inventory();
    card(
        el.inventory_grid,
        'Cargo hold',
        commodities.filter((v, i) => (i < 3) || campaign.cargo[v.key]).map(v => `${v.name}: ${campaign.cargo[v.key]}`).join(' · '),
        `CAPACITY ${cargo_count()}/${cargo_capacity()} · WEAPONS ${attack_rating()} · DEFENSE ${defense_rating()}`
    );
}

function finish(won)
{
    if (!won && player) {
        explode(player.x, player.y, 100, cyan);
    }
    if (arcade.active) {
        arcade_finish(won);
        return;
    }
    base_finish(won);
    document.getElementById('retry_sector').innerHTML = '<span>Continue the saved flight</span>';
    el.result_sector.textContent = worlds[campaign.world].name;
    el.result_description.textContent =
        'Continue from your last autosave with your contracts, cargo and upgrades. Prepare at a station before entering heavily armed worlds.';
    document.getElementById('nav_button').classList.add('hidden');
    document.getElementById('dock_button').classList.add('hidden');
}

// The gate's name and status, `y` below its centre
function world_gate_label(world_gate, y)
{
    // the arcade moves on by clearing waves, not through gates
    if (arcade.active) {
        return;
    }
    world_label(world_gate.x, world_gate.y + y - 12, `WORLD GATE → ${worlds[world_gate.destination].name.toUpperCase()}`, `R jump · ${allowed_world(world_gate.destination) ? 'cleared' : 'upgrades required'}`, world_gate.color);
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
        if ((view_mode === 'rendered') && render_gate_shell(world_gate, true)) {
            // The drawing has its own rings; a glow fills its opening in the colour of where it leads
            const g = ctx.createRadialGradient(world_gate.x, world_gate.y, 4, world_gate.x, world_gate.y, 78);
            g.addColorStop(0, `${world_gate.color}55`);
            g.addColorStop(1, `${world_gate.color}00`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(world_gate.x, world_gate.y, 78, 0, Math.PI*2);
            ctx.fill();
            world_gate_label(world_gate, 138);
            continue;
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
        world_gate_label(world_gate, 115);
    }
    for (let i = 0, end = beacons.length; i < end; ++i) {
        const beacon = beacons[i];
        if (!in_view(beacon)) {
            continue;
        }
        const art = world_art('beacon');
        if (!art || !sprite_draw_box(art, null, 50, beacon.x, beacon.y, clock*0.2)) {
            polygon(beacon.x, beacon.y, 24, 4, clock*0.2, cyan, '#142c35');
        }
        ctx.strokeStyle = '#6cf8ec44';
        ctx.beginPath();
        ctx.arc(beacon.x, beacon.y, 50 + ((clock*20) % 45), 0, Math.PI*2);
        ctx.stroke();
        world_label(beacon.x, beacon.y + 56, `SCAN BEACON ${i + 1}`, '', cyan);
    }
    if (escort) {
        const angle = Math.atan2(escort.destination.y - escort.y, escort.destination.x - escort.x);
        if (view_mode === 'wireframe') {
            wireframe_hauler(escort.x, escort.y, angle, sprite_sizes.freighter, gold);
        }
        else {
            render_surface_ship(escort.x, escort.y, angle, 1, false, {...current_ship(), sprite: {name: 'freighter', length: sprite_sizes.freighter}});
        }
        // below the hull; the guide's marker names it above
        world_label(escort.x, escort.y + sprite_sizes.freighter*0.6 + 4, 'FREIGHTER', `${Math.ceil(escort.hp)} hull`, gold);
    }
    if (waypoint) {
        const p = waypoint_live();
        ctx.strokeStyle = gold;
        ctx.setLineDash([5, 10]);
        ctx.beginPath();
        // round a moving goal (the freighter) the ring clears its hull
        ctx.arc(p.x, p.y, waypoint.follow ? Math.max(65, sprite_sizes.freighter*0.62) : 65, 0, Math.PI*2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    ctx.restore();
}

// Where the guide's marker is now: on a moving goal (the convoy's freighter) where that is this frame
function waypoint_live()
{
    return (Number.isFinite(waypoint.follow?.x) && Number.isFinite(waypoint.follow?.y)) ? waypoint.follow : waypoint;
}

function guide_base_render_screen_controls()
{
    base_render_screen_controls();
    // the guide's marker: its name above it on a plate, or, off the screen, an edge marker clear of the HUD
    if (waypoint && player) {
        const live = waypoint_live();
        const px = (live.x - camera.x)*zoom;
        const py = (live.y - camera.y)*zoom;
        const d = Math.round(distance(player, live));
        const m = hud_edge_marker({x: ox + px*scale, y: oy + py*scale});
        if (m.offscreen) {
            draw_edge_marker(m, `${waypoint.label} · ${d} m`);
        }
        else {
            // above the marker's ring, which is wider round a moving goal's hull
            const above = waypoint.follow ? Math.max(65, sprite_sizes.freighter*0.62)*zoom + 10 : 20;
            world_label(px, py - above - 31, waypoint.label.toUpperCase(), `${d} m`, gold);
        }
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
addEventListener('keydown', on_navigation_key);

// In the map & guide, 1–6 open its tabs
function on_navigation_key(event)
{
    if ((state !== 'navigation') || event.repeat || event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
    }
    const tabs = Array.from(document.querySelectorAll('[data-nav]'));
    const n = Number(event.key);
    if (Number.isInteger(n) && (n >= 1) && (n <= tabs.length)) {
        event.preventDefault();
        nav_tab = tabs[n - 1].dataset.nav;
        render_navigation();
    }
}
for (const b of document.querySelectorAll('[data-station]')) {
    b.addEventListener('click', () => station_tab_open(b.dataset.station));
}
