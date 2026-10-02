function render_galaxy_chart(parent, c)
{
    const positions = [
        [80, 170],
        [240, 80],
        [240, 260],
        [400, 170],
        [560, 170],
        [720, 80],
        [720, 260],
        [880, 170],
    ];
    const route_edges = new Set();
    for (let i = 1, end = c.route.length; i < end; ++i) {
        route_edges.add([c.route[i - 1], c.route[i]].sort((a, b) => a - b).join(':'));
    }
    let out =
        '<svg viewBox="0 0 960 340" role="img" aria-label="Connected worlds. Gold lines mark your mission route."><defs><radialGradient id="chart_glow"><stop stop-color="#203b53"/><stop offset="1" stop-color="#091321"/></radialGradient></defs><rect width="960" height="340" rx="14" fill="url(#chart_glow)"/>';
    for (let i = 0, ii = worlds.length; i < ii; ++i) {
        const world = worlds[i];
        for (const id of world.links.filter(v => v > i)) {
            const a = positions[i];
            const b = positions[id];
            const active = route_edges.has(i + ':' + id);
            out +=
                '<path d="M ' +
                a[0] +
                ' ' +
                a[1] +
                ' L ' +
                b[0] +
                ' ' +
                b[1] +
                '" stroke="' +
                (active ? gold : '#39516f') +
                '" stroke-width="' +
                (active ? 4 : 2) +
                '"' +
                (active ? '' : ' stroke-dasharray="6 7"') +
                '/>';
        }
    }
    for (let i = 0, end = worlds.length; i < end; ++i) {
        const world = worlds[i];
        const p = positions[i];
        const current = i === campaign.world;
        const target = i === c.target;
        out +=
            '<g data-chart-world="' +
            i +
            '" role="button" tabindex="0" aria-label="Set route to ' +
            world.name +
            '" class="chart-node"><circle cx="' +
            p[0] +
            '" cy="' +
            p[1] +
            '" r="' +
            (current ? 30 : 25) +
            '" fill="' +
            world.color +
            '" stroke="' +
            (target ? gold : current ? cyan : allowed_world(i) ? world.accent : '#ff5baf') +
            '" stroke-width="3"/>';
        if (current) {
            out += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="36" stroke="' + cyan + '" fill="none" opacity=".4"/>';
        }
        out +=
            '<text x="' +
            p[0] +
            '" y="' +
            (p[1] + 5) +
            '" fill="' +
            world.accent +
            '" text-anchor="middle" font-size="14">' +
            (i + 1) +
            '</text><text x="' +
            p[0] +
            '" y="' +
            (p[1] + 53) +
            '" text-anchor="middle" fill="#e9f6ff" font-size="14">' +
            world.name +
            '</text><text x="' +
            p[0] +
            '" y="' +
            (p[1] + 70) +
            '" text-anchor="middle" fill="' +
            (allowed_world(i) ? '#9ba8c5' : pink) +
            '" font-size="10">' +
            (current ? 'YOU ARE HERE' : allowed_world(i) ? 'THREAT ' + (i + 1) : 'UPGRADES REQUIRED') +
            '</text></g>';
    }
    out += '</svg>';
    const div = document.createElement('div');
    div.className = 'galaxy-chart';
    div.innerHTML = out;
    parent.append(div);
    for (const v of div.querySelectorAll('[data-chart-world]')) {
        function choose() {
            track_world(Number(v.getAttribute('data-chart-world')));
            render_navigation();
        }
        v.addEventListener('click', choose);
        v.addEventListener('keydown', function (event) {
            if ((event.code === 'Enter') || (event.code === 'Space')) {
                event.preventDefault();
                choose();
            }
        });
    }
    const legend = document.createElement('p');
    legend.className = 'chart-legend';
    legend.textContent =
        'CLICK A WORLD TO PLAN TRAVEL · GOLD: ACTIVE ROUTE / DESTINATION · CYAN: YOU · PINK: UPGRADE REQUIRED · Links are world gates, not local A–H portals.';
    parent.append(legend);
}

function render_local_chart(parent)
{
    const controls = document.createElement('div');
    controls.className = 'nav-tabs';
    for (const mode of ['nearby', 'whole']) {
        const b = document.createElement('button');
        b.textContent = (mode === 'nearby') ? 'NEARBY OBJECTIVES' : 'ENTIRE WORLD';
        b.className = (mode === local_map_mode) ? 'selected' : '';
        b.addEventListener('click', function () {
            local_map_mode = mode;
            render_navigation();
        });
        controls.append(b);
    }
    parent.append(controls);
    const map = document.createElement('canvas');
    map.setAttribute('id', 'local_navigation_canvas');
    map.width = 960;
    map.height = 620;
    map.className = 'local-chart';
    map.setAttribute('aria-label', 'Local flight map. Click a station, world gate, beacon or mining field to set a waypoint.');
    map.addEventListener('click', function (event) {
        const rect = map.getBoundingClientRect();
        const x = ((event.clientX - rect.left)*960)/rect.width;
        const y = ((event.clientY - rect.top)*620)/rect.height;
        local_map_select(x, y);
    });
    parent.append(map);
    render_local_map_canvas(map);
    const legend = document.createElement('p');
    legend.className = 'chart-legend';
    legend.textContent =
        'CLICK AN OBJECT OR EMPTY SPACE TO PLAN A PORTAL ROUTE · GOLD: ROUTE · CYAN TRIANGLE: YOUR SHIP · HEXAGON: STATION · DIAMOND: WORLD GATE (R) · SMALL A–H RINGS: LOCAL PORTALS · BROWN: ORE · LARGE PINK CIRCLES: EARLY GRAVITY FIELD / BLACK CORE: FATAL';
    parent.append(legend);
}

function local_map_bounds()
{
    if (local_map_mode === 'whole') {
        return {x: 0, y: 0, w: world.w, h: world.h};
    }
    const w = Math.min(world.w, 4900);
    const h = Math.min(world.h, 3300);
    return {x: clamp(player.x - w/2, 0, world.w - w), y: clamp(player.y - h/2, 0, world.h - h), w, h};
}

function local_map_select(x, y)
{
    const b = local_chart_bounds;
    if (!b) {
        return;
    }
    const point = {x: b.x + (x/960)*b.w, y: b.y + (y/620)*b.h};
    let best = null;
    let near = Infinity;
    const targets = [
        {...station, label: worlds[campaign.world].station},
        ...world_gates.map(v => ({...v, label: 'WORLD GATE → ' + worlds[v.destination].name})),
        ...beacons.map((v, i) => ({...v, label: 'SCAN BEACON ' + (i + 1)})),
        ...mining_fields.filter(v => ore_nodes.some(vv => (vv.hp > 0) && (vv.field === v.id))).map(v => ({...v, label: 'MINING FIELD ' + (v.id + 1)})),
        ...portals.map((v, i) => ({...v, portal: i, label: 'LOCAL PORTAL ' + v.label})),
    ];
    for (const target of targets) {
        const d = Math.hypot(((target.x - point.x)/b.w)*960, ((target.y - point.y)/b.h)*620);
        if (d < near) {
            near = d;
            best = target;
        }
    }
    if (!best || (near >= 35)) {
        track_local_point(point, 'COORDINATES ' + Math.round(point.x) + ' / ' + Math.round(point.y));
        render_navigation();
        return;
    }
    if (best && (near < 35)) {
        if (best.portal !== undefined) {
            track_local_point(best, best.label);
        }
        else if (best.destination !== undefined) {
            track_world(best.destination);
        }
        else {
            track_local_point(best, best.label);
        }
        render_navigation();
    }
}

function physics_base_render_local_map_canvas(map)
{
    const draw = map.getContext('2d');
    const b = local_map_bounds();
    const map_labels = [];
    local_chart_bounds = b;
    const sx = 960/b.w;
    const sy = 620/b.h;
    function point(v) {
        return {x: (v.x - b.x)*sx, y: (v.y - b.y)*sy};
    }
    function label(v, text, color, dy = 20) {
        const p = point(v);
        if ((p.x < 0) || (p.x > 960) || (p.y < 0) || (p.y > 620)) {
            return;
        }
        draw.font = '12px ui-monospace,monospace';
        draw.textAlign = 'center';
        const width = draw.measureText(text).width + 10;
        const x = clamp(p.x, width/2 + 3, 960 - width/2 - 3);
        let y = clamp(p.y + dy, 16, 614);
        for (let i = 0; i < 7; ++i) {
            const candidate = clamp(p.y + dy + ((i % 2) ? -1 : 1)*Math.ceil(i/2)*20, 16, 614);
            const box = {x: x - width/2, y: candidate - 12, w: width, h: 17};
            if (!map_labels.some(v => (box.x < v.x + v.w + 4) && (box.x + box.w + 4 > v.x) && (box.y < v.y + v.h + 3) && (box.y + box.h + 3 > v.y))) {
                y = candidate;
                break;
            }
        }
        map_labels.push({x: x - width/2, y: y - 12, w: width, h: 17});
        draw.fillStyle = '#081221e8';
        draw.fillRect(x - width/2, y - 12, width, 17);
        draw.fillStyle = color;
        draw.fillText(text, x, y);
    }
    function ring(v, r, color) {
        const p = point(v);
        draw.strokeStyle = color;
        draw.beginPath();
        draw.arc(p.x, p.y, r, 0, Math.PI*2);
        draw.stroke();
    }
    draw.fillStyle = '#091321';
    draw.fillRect(0, 0, 960, 620);
    draw.strokeStyle = '#30425b33';
    draw.lineWidth = 1;
    for (let i = 0; i < 960; i += 80) {
        draw.beginPath();
        draw.moveTo(i, 0);
        draw.lineTo(i, 620);
        draw.stroke();
    }
    for (let i = 0; i < 620; i += 80) {
        draw.beginPath();
        draw.moveTo(0, i);
        draw.lineTo(960, i);
        draw.stroke();
    }
    for (const black_hole of black_holes) {
        const p = point(black_hole);
        draw.fillStyle = '#ff5baf0d';
        draw.strokeStyle = '#ff5baf88';
        draw.beginPath();
        draw.ellipse(p.x, p.y, gravity_reach(black_hole)*sx, gravity_reach(black_hole)*sy, 0, 0, Math.PI*2);
        draw.fill();
        draw.stroke();
        draw.fillStyle = '#000';
        draw.beginPath();
        draw.arc(p.x, p.y, Math.max(5, black_hole.core*sx), 0, Math.PI*2);
        draw.fill();
        label(black_hole, 'BLACK HOLE', pink, 30);
    }
    for (const mining_field of mining_fields) {
        if (!ore_nodes.some(v => v.field === mining_field.id)) {
            continue;
        }
        const p = point(mining_field);
        draw.fillStyle = '#ffd16e14';
        draw.strokeStyle = '#a78a58';
        draw.beginPath();
        draw.ellipse(p.x, p.y, mining_field.r*sx, mining_field.r*sy, 0, 0, Math.PI*2);
        draw.fill();
        draw.stroke();
        draw.fillStyle = gold;
        draw.fillRect(p.x - 3, p.y - 3, 6, 6);
        label(mining_field, 'MINE ' + (mining_field.id + 1), '#cbae79', 25);
    }
    for (const portal of portals) {
        ring(portal, 7, portal.color + '99');
        label(portal, 'LOCAL ' + portal.label, portal.color, 22);
    }
    for (let i = 0, end = beacons.length; i < end; ++i) {
        const beacon = beacons[i];
        ring(beacon, 6, cyan);
        label(beacon, 'SCAN ' + (i + 1), '#8db8ba', -12);
    }
    for (let i = 0, end = world_gates.length; i < end; ++i) {
        const world_gate = world_gates[i];
        const p = point(world_gate);
        draw.strokeStyle = world_gate.color;
        draw.fillStyle = world_gate.color + '22';
        draw.beginPath();
        draw.moveTo(p.x, p.y - 12);
        draw.lineTo(p.x + 12, p.y);
        draw.lineTo(p.x, p.y + 12);
        draw.lineTo(p.x - 12, p.y);
        draw.closePath();
        draw.fill();
        draw.stroke();
        label(world_gate, 'WORLD → ' + worlds[world_gate.destination].name.toUpperCase(), world_gate.color, (i === 2) ? -20 : 30);
    }
    const p = point(station);
    draw.strokeStyle = cyan;
    draw.fillStyle = '#123747';
    draw.beginPath();
    for (let i = 0; i < 6; ++i) {
        const a = (i/6)*Math.PI*2;
        if (i === 0) {
            draw.moveTo(p.x + Math.cos(a)*14, p.y + Math.sin(a)*14);
        }
        else {
            draw.lineTo(p.x + Math.cos(a)*14, p.y + Math.sin(a)*14);
        }
    }
    draw.closePath();
    draw.fill();
    draw.stroke();
    label(station, worlds[campaign.world].station.toUpperCase(), cyan, 32);
    const current = point(player);
    draw.save();
    draw.translate(current.x, current.y);
    draw.rotate(player.angle);
    draw.fillStyle = cyan;
    draw.beginPath();
    draw.moveTo(10, 0);
    draw.lineTo(-7, -6);
    draw.lineTo(-4, 0);
    draw.lineTo(-7, 6);
    draw.closePath();
    draw.fill();
    draw.restore();
    label(player, 'YOUR SHIP', '#e2fffc', -22);
    const c = refresh_guidance();
    if (c?.goal) {
        draw.strokeStyle = gold;
        draw.lineWidth = 2;
        draw.setLineDash([6, 6]);
        draw.beginPath();
        draw.moveTo(current.x, current.y);
        let last = current;
        for (const v of guide_path) {
            const p = point(v);
            if (v.jump_exit) {
                draw.stroke();
                draw.setLineDash([2, 10]);
                draw.beginPath();
                draw.moveTo(last.x, last.y);
                draw.lineTo(p.x, p.y);
                draw.stroke();
                draw.setLineDash([6, 6]);
                draw.beginPath();
                draw.moveTo(p.x, p.y);
            }
            else {
                draw.lineTo(p.x, p.y);
            }
            last = p;
        }
        draw.stroke();
        draw.setLineDash([]);
        ring(c.goal, 20, gold);
        label(c.goal, 'OBJECTIVE', gold, -32);
    }
    for (const enemy of enemies) {
        const p = point(enemy);
        draw.fillStyle = pink;
        draw.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    draw.strokeStyle = '#6cf8ec44';
    draw.strokeRect((camera.x - b.x)*sx, (camera.y - b.y)*sy, (W/zoom)*sx, (H/zoom)*sy);
}

function render_screen_controls()
{
    guide_base_render_screen_controls();
    render_gravity_direction();
    if (player && waypoint && (state === 'playing')) {
        const c = guide_context();
        if (c.interaction && c.goal && (distance(player, c.goal) < ((c.kind === 'jump') ? 155 : 230))) {
            ctx.save();
            ctx.font = 'bold 16px ui-monospace,monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = gold;
            ctx.fillText(c.interaction + ' / ' + c.goal.label, W/2, H - 165);
            ctx.restore();
        }
    }
}
document.getElementById('guide_plan').addEventListener('click', open_mission_plan);
document.getElementById('guide_action').addEventListener('click', guide_action);
canvas.addEventListener('pointerdown', stop_guided_flight);
canvas.addEventListener('dblclick', stop_guided_flight);
addEventListener('keydown', function (event) {
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        stop_guided_flight(event);
    }
});
