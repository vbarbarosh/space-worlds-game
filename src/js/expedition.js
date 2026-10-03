// Expedition preparation: world scale, hull-specific flight, radiation, boosters and trade intelligence.
function radiation_protection(ship = current_ship(), level = upgrades.radshield)
{
    return Math.min(0.98, (ship.radiation || 0) + (level || 0)*0.2);
}

function cruise_speed(id = campaign.world, ship = current_ship())
{
    const r = world_rules[id];
    const gravity_fit = (id === 4) ? Math.min(1.15, 0.8 + ship.traction*0.15) : 1;
    return 285*(1 + upgrades.speed*0.15)*r.speed*ship.speed*gravity_fit;
}

function turbo_duration(ship = current_ship())
{
    return 8 + ship.endurance + upgrades.turbo_tank*3;
}

function turbo_speed()
{
    return cruise_speed()*(3.2 + upgrades.dash*0.65)*current_ship().turbo;
}

function turbo_fuel()
{
    return player ? clamp(Number.isFinite(player.turbo_fuel) ? player.turbo_fuel : turbo_duration(), 0, turbo_duration()) : turbo_duration();
}

function stop_turbo()
{
    if (!player || !player.turbo_active) {
        return;
    }
    player.turbo_fuel = clamp(player.dash_time, 0, turbo_duration());
    player.turbo_active = false;
    player.dash_time = 0;
    player.dash_cd = 0.65;
}

function recharge_turbo(dt)
{
    if (player.turbo_active) {
        return;
    }
    const delay = Math.min(dt, player.dash_cd || 0);
    player.dash_cd = Math.max(0, (player.dash_cd || 0) - dt);
    player.turbo_fuel = Math.min(turbo_duration(), turbo_fuel() + (Math.max(0, dt - delay)*turbo_duration())/dash_cooldown());
}

function world_brief(id)
{
    const c = expedition_conditions[id];
    const size = world_extents[id];
    const crossing = format_time(size[0]/cruise_speed(id));
    return (
        Math.round(size[0]/1000) +
        ' × ' +
        Math.round(size[1]/1000) +
        ' km · CROSSING ~' +
        crossing +
        ' cruise · ' +
        (c.radiation ? 'RAD ' + c.radiation.toFixed(1) + '/s · MIN LINING ' + Math.round(c.required*100) + '%' : 'NO RADIATION')
    );
}

function append_world_brief(cardel, id)
{
    const note = document.createElement('p');
    note.className = 'environment-brief';
    note.textContent = world_brief(id) + ' · ' + world_rules[id].name + '. ' + expedition_conditions[id].advice;
    cardel.append(note);
}

function configure_expedition_portals()
{
    const hub = station;
    const pairs = [
        [
            [0.16, 0.22],
            [0.84, 0.78],
        ],
        [
            [0.18, 0.8],
            [0.82, 0.2],
        ],
        [
            [0.5, 0.12],
            [0.5, 0.88],
        ],
    ];
    portals = [];
    function pair(a, b, index) {
        const color = [cyan, pink, gold, blue, '#9dff9b', '#ff9469', '#c4a1ff', '#8be9ff'][index];
        const letter = 'ABCDEFGH'[index];
        const ends = [a, b];
        for (let j = 0, end = ends.length; j < end; ++j) {
            const v = ends[j];
            portals.push({x: v.x, y: v.y, r: 46, pair: index, label: letter + (j + 1), color, destination: index*2 + 1 - j});
        }
    }
    for (let i = 0, end = pairs.length; i < end; ++i) {
        const p = pairs[i];
        pair({x: world.w*p[0][0], y: world.h*p[0][1]}, {x: world.w*p[1][0], y: world.h*p[1][1]}, i);
    }
    const first = world_gates[0];
    pair({x: hub.x + 650, y: hub.y - 360}, {x: first.x + 330, y: first.y + 290}, 3);
    if (campaign.world > 0) {
        const second = world_gates[1];
        pair({x: hub.x - 650, y: hub.y + 360}, {x: second.x - 330, y: second.y + 290}, 4);
        const north = world_gates[2] || beacons[0];
        pair({x: hub.x, y: hub.y - 850}, {x: north.x + 330, y: north.y + 290}, 5);
    }
    if (world.w >= 55000) {
        pair({x: beacons[0].x + 330, y: beacons[0].y - 290}, {x: beacons[2].x + 330, y: beacons[2].y - 290}, 6);
        pair({x: world.w*0.23, y: world.h*0.68}, {x: world.w*0.81, y: world.h*0.24}, 7);
    }
    portal_leg_cache.clear();
    navigation_graph = null;
    guide_path_key = '';
}

function portal_flight_path(start, end)
{
    const nodes = [start, end, ...portals];
    const edges = nodes.map(() => []);
    const speed = cruise_speed();
    const jump_cost = speed*2.6;
    function walking(i, j) {
        const a = nodes[i];
        const b = nodes[j];
        const cacheable = (i >= 2) && (j >= 2);
        const key = campaign.world + ':' + i + ':' + j;
        let leg = cacheable ? portal_leg_cache.get(key) : null;
        if (!leg) {
            const points = safe_flight_path(a, b);
            let length = 0;
            let from = a;
            for (const p of points) {
                length += distance(from, p);
                from = p;
            }
            leg = {points, length};
            if (cacheable) {
                portal_leg_cache.set(key, leg);
            }
        }
        edges[i].push({to: j, cost: leg.length, points: leg.points});
    }
    // Walking paths are symmetric; reuse the reversed safe path for static portal pairs.
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            walking(i, j);
            const f = edges[i][edges[i].length - 1];
            const points = [nodes[i], ...f.points.slice(0, -1)].reverse();
            edges[j].push({to: i, cost: f.cost, points});
        }
    }
    for (let i = 0, end = portals.length; i < end; ++i) {
        const portal = portals[i];
        edges[i + 2].push({to: portal.destination + 2, cost: jump_cost, portal: i});
    }
    const cost = nodes.map(() => Infinity);
    const previous = nodes.map(() => null);
    const visited = new Set();
    cost[0] = 0;
    for (let step = 0; step < nodes.length; step++) {
        let at = -1;
        for (let i = 0; i < nodes.length; i++) {
            if (!visited.has(i) && ((at < 0) || (cost[i] < cost[at]))) {
                at = i;
            }
        }
        if ((at < 0) || !Number.isFinite(cost[at]) || (at === 1)) {
            break;
        }
        visited.add(at);
        for (const edge of edges[at]) {
            if (cost[at] + edge.cost < cost[edge.to]) {
                cost[edge.to] = cost[at] + edge.cost;
                previous[edge.to] = {from: at, edge};
            }
        }
    }
    let at = 1;
    let steps = [];
    while ((at !== 0) && previous[at]) {
        steps.unshift(previous[at]);
        at = previous[at].from;
    }
    if (at !== 0) {
        return safe_flight_path(start, end);
    }
    const out = [];
    for (const step of steps) {
        if (step.edge.portal !== undefined) {
            const index = step.edge.portal;
            const p = portals[index];
            if (out.length && (distance(out[out.length - 1], p) < 1)) {
                out[out.length - 1] = {x: p.x, y: p.y, portal: index};
            }
            else {
                out.push({x: p.x, y: p.y, portal: index});
            }
            const exit = portal_exit(portals[p.destination]);
            out.push({...exit, jump_exit: true});
        }
        else {
            for (const point of step.edge.points) {
                out.push({x: point.x, y: point.y});
            }
        }
    }
    if ((end.portal !== undefined) && out.length) {
        out[out.length - 1].portal = end.portal;
    }
    return out;
}

function route_metrics(path = guide_path, start = player)
{
    let walk = 0;
    let jumps = 0;
    let last = start;
    for (const p of path) {
        if (p.jump_exit) {
            jumps++;
        }
        else {
            walk += distance(last, p);
        }
        last = p;
    }
    return {walk, jumps, seconds: walk/cruise_speed() + jumps*2.6};
}

function render_local_route_brief(parent)
{
    const c = refresh_guidance();
    const note = document.createElement('p');
    note.className = 'route-metrics';
    if (c?.goal) {
        const m = route_metrics();
        note.textContent =
            'PLANNED: ' +
            (m.walk/1000).toFixed(1) +
            ' km flight · ' +
            m.jumps +
            ' local portal jumps · ~' +
            format_time(m.seconds) +
            ' cruise / DIRECT ' +
            (distance(player, c.goal)/1000).toFixed(1) +
            ' km. Gold dots mark the portal entrances; dotted links are teleports.';
    }
    else {
        note.textContent = world_brief(campaign.world) + '. Select a distant map object to compare direct flight with a portal route.';
    }
    parent.append(note);
}

function generate_drifting_debris()
{
    const random = visual_random_from_seed(4381 + campaign.world*983);
    const anchors = [station, ...world_gates, ...beacons, ...mining_fields];
    drifting_debris = [];
    for (let i = 0; i < 64; i++) {
        const a = anchors[i % anchors.length];
        const angle = random()*Math.PI*2;
        const r = 600 + random()*1600;
        const x = clamp(a.x + Math.cos(angle)*r, 100, world.w - 100);
        const y = clamp(a.y + Math.sin(angle)*r, 100, world.h - 100);
        const size = 14 + random()*34;
        if ((distance({x, y}, station) < 600) || [...portals, ...world_gates].some(v => distance({x, y}, v) < 220)) {
            continue;
        }
        drifting_debris.push({
            x,
            y,
            vx: (random() - 0.5)*90,
            vy: (random() - 0.5)*90,
            r: size,
            angle: random()*6.28,
            spin: (random() - 0.5)*0.5,
            kind: (i % 3 === 0) ? 'wreck' : 'asteroid',
            hp: 1,
        });
    }
}

function update_expedition_environment(dt)
{
    const c = expedition_conditions[campaign.world];
    const safe = distance(player, station) < 500;
    const protection = radiation_protection();
    const radiation = arcade.active ? c.radiation*arcade_radiation : c.radiation;
    player.radiation_dose = clamp((player.radiation_dose || 0) + ((safe || !radiation) ? -6 : radiation*(1 - protection)*5)*dt, 0, 100);
    if (!safe && radiation) {
        const damage = radiation*(1 - protection)*(0.4 + player.radiation_dose/80)*dt;
        player.hp = Math.max(0, player.hp - damage);
        if (player.hp <= 0) {
            finish(false);
            el.result_eyebrow.textContent = 'RADIATION EXPOSURE';
            el.result_description.textContent =
                'Your radiation lining could not protect the hull. Fit radiation protection in MODULES or choose a protected ship in HANGAR, then continue the saved flight.';
            return;
        }
    }
    const previous = player.previous_position || player;
    for (const drifting_debri of drifting_debris) {
        const old = {x: drifting_debri.x, y: drifting_debri.y};
        drifting_debri.x += drifting_debri.vx*dt;
        drifting_debri.y += drifting_debri.vy*dt;
        drifting_debri.angle += drifting_debri.spin*dt;
        if ((drifting_debri.x < drifting_debri.r) || (drifting_debri.x > world.w - drifting_debri.r)) {
            drifting_debri.vx *= -1;
            drifting_debri.x = clamp(drifting_debri.x, drifting_debri.r, world.w - drifting_debri.r);
        }
        if ((drifting_debri.y < drifting_debri.r) || (drifting_debri.y > world.h - drifting_debri.r)) {
            drifting_debri.vy *= -1;
            drifting_debri.y = clamp(drifting_debri.y, drifting_debri.r, world.h - drifting_debri.r);
        }
        const sanctuary = [station, ...portals, ...world_gates].find(v => distance(drifting_debri, v) < ((v === station) ? 560 : 180) + drifting_debri.r);
        if (sanctuary) {
            const a = Math.atan2(drifting_debri.y - sanctuary.y, drifting_debri.x - sanctuary.x);
            const r = ((sanctuary === station) ? 560 : 180) + drifting_debri.r;
            drifting_debri.x = sanctuary.x + Math.cos(a)*r;
            drifting_debri.y = sanctuary.y + Math.sin(a)*r;
            drifting_debri.vx = Math.cos(a)*40;
            drifting_debri.vy = Math.sin(a)*40;
        }
        if (
            !safe &&
            (segment_distance({x: 0, y: 0}, {x: previous.x - old.x, y: previous.y - old.y}, {x: player.x - drifting_debri.x, y: player.y - drifting_debri.y}) <
                drifting_debri.r + player.r)
        ) {
            const speed = Math.hypot(player.vx - drifting_debri.vx, player.vy - drifting_debri.vy);
            damage_player(Math.min(40, 8 + speed*0.022));
            stop_turbo();
            const a = Math.atan2(player.y - drifting_debri.y, player.x - drifting_debri.x);
            player.x = drifting_debri.x + Math.cos(a)*(drifting_debri.r + player.r + 3);
            player.y = drifting_debri.y + Math.sin(a)*(drifting_debri.r + player.r + 3);
            player.vx = drifting_debri.vx + Math.cos(a)*80;
            player.vy = drifting_debri.vy + Math.sin(a)*80;
        }
    }
    if (Math.floor(run_time/90) > Math.floor((run_time - dt)/90)) {
        const markets = ensure_markets();
        for (let i = 0, end = markets.length; i < end; ++i) {
            const market = markets[i];
            const key = commodities[expedition_conditions[i].import].key;
            market.demand[key] = Math.min(80 + i*20, market.demand[key] + 10);
        }
    }
}

function render_drifting_debris()
{
    ctx.save();
    for (const drifting_debri of drifting_debris) {
        if (!in_view(drifting_debri, drifting_debri.r + 20)) {
            continue;
        }
        ctx.save();
        ctx.translate(drifting_debri.x, drifting_debri.y);
        ctx.rotate(drifting_debri.angle);
        if (drifting_debri.kind === 'asteroid') {
            if (view_mode === 'wireframe') {
                polygon(0, 0, drifting_debri.r, 7, 0, '#c2b08c', '#312a24');
            }
            else {
                const asset = rock_surface(campaign.world, 3);
                ctx.drawImage(asset.layer, -drifting_debri.r*1.25, -drifting_debri.r*1.25, drifting_debri.r*2.5, drifting_debri.r*2.5);
            }
        }
        else {
            ctx.fillStyle = '#28394a';
            ctx.strokeStyle = '#a9bbc8';
            ctx.lineWidth = 1.4;
            ctx.fillRect(-drifting_debri.r, -drifting_debri.r*0.35, drifting_debri.r*2, drifting_debri.r*0.7);
            ctx.strokeRect(-drifting_debri.r, -drifting_debri.r*0.35, drifting_debri.r*2, drifting_debri.r*0.7);
            ctx.strokeStyle = '#ffd16e88';
            ctx.beginPath();
            ctx.moveTo(-drifting_debri.r, -drifting_debri.r*0.65);
            ctx.lineTo(drifting_debri.r*0.4, drifting_debri.r*0.7);
            ctx.stroke();
        }
        ctx.restore();
    }
    ctx.restore();
}

function update_expedition_readout()
{
    const readout = document.getElementById('expedition_readout');
    const c = expedition_conditions[campaign.world];
    const safe = distance(player, station) < 500;
    const speed = Math.round(Math.hypot(player.vx, player.vy));
    let text = 'FLIGHT ' + speed + ' m/s · TURBO ' + turbo_duration() + 's';
    if (c.radiation) {
        text +=
            '\n☢ ' +
            (safe ? 'STATION SANCTUARY' : c.radiation.toFixed(1) + '/s FIELD') +
            ' · LINING ' +
            Math.round(radiation_protection()*100) +
            '% · DOSE ' +
            Math.round(player.radiation_dose || 0) +
            '%';
    }
    else {
        text += '\nNO RADIATION · ' + Math.round(world.w/1000) + ' × ' + Math.round(world.h/1000) + ' km';
    }
    const context = guide_context();
    if (context?.goal && guide_path.length) {
        const m = route_metrics();
        text += '\nROUTE ' + m.jumps + ' PORTALS · ' + (m.walk/1000).toFixed(1) + ' km · ~' + format_time(m.seconds);
    }
    readout.textContent = text;
    readout.style.whiteSpace = 'pre-line';
    readout.classList.toggle('danger', (!safe && (c.radiation > 0) && (radiation_protection() + 0.001 < c.required)) || ((player.radiation_dose || 0) > 60));
}
