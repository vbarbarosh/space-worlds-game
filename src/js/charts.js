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
    // A lane is known once you have stood at either end; it reads as open when both worlds are open to you
    let out =
        '<svg viewBox="0 0 960 340" role="img" aria-label="Connected worlds. Gold lines mark your route."><defs><radialGradient id="chart_glow"><stop stop-color="#16294a"/><stop offset="1" stop-color="#070d1a"/></radialGradient></defs><rect width="960" height="340" rx="14" fill="url(#chart_glow)"/>';
    for (let i = 0, ii = worlds.length; i < ii; ++i) {
        const world = worlds[i];
        for (const id of world.links.filter(v => v > i)) {
            const a = positions[i];
            const b = positions[id];
            const active = route_edges.has(`${i}:${id}`);
            const known = campaign.visited.includes(i) || campaign.visited.includes(id);
            const open = allowed_world(i) && allowed_world(id);
            const stroke = active ? gold : open ? '#6f8fb8' : '#b0457a';
            out +=
                `<path d="M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}" stroke="${stroke}" stroke-width="${active ? 4 : 2}"${(active || !open) ? ' stroke-dasharray="7 7"' : ''} opacity="${(active || known) ? 1 : 0.45}"/>`;
        }
    }
    for (let i = 0, end = worlds.length; i < end; ++i) {
        const world = worlds[i];
        const p = positions[i];
        const current = i === campaign.world;
        const target = i === c.target;
        const reached = campaign.visited.includes(i);
        const locked = !allowed_world(i) && !current;
        // a world not reached yet is faded, a locked one more, the one you are heading for less
        const opacity = reached ? 1 : target ? 0.85 : locked ? 0.45 : 0.7;
        const status = current ? 'YOU ARE HERE' : locked ? 'UPGRADES REQUIRED' : reached ? 'VISITED' : 'OPEN · NOT VISITED';
        const status_color = current ? cyan : locked ? pink : reached ? '#9dff9b' : '#c9d6e6';
        const ring = current ? cyan : target ? gold : reached ? '#9dff9b' : locked ? '#b0457a' : '#c9d6e6';
        const art = sprite_svgs.worlds?.[world_slug(i)]?.[`planet-${world_slug(i)}`];
        out += `<g data-chart-world="${i}" role="button" tabindex="0" aria-label="Set route to ${world.name}" class="chart-node" opacity="${opacity}">`;
        out += `<circle cx="${p[0]}" cy="${p[1]}" r="31" fill="${world.color}"/>`;
        if (art) {
            out += `<image href="data:image/svg+xml;charset=utf-8,${encodeURIComponent(art)}" x="${p[0] - 31}" y="${p[1] - 31}" width="62" height="62"${locked ? ' opacity="0.5"' : ''}/>`;
        }
        out += `<circle cx="${p[0]}" cy="${p[1]}" r="33" fill="none" stroke="${ring}" stroke-width="3"${(!reached && !current && !locked) ? ' stroke-dasharray="5 5"' : ''}/>`;
        if (current) {
            out += `<circle cx="${p[0]}" cy="${p[1]}" r="40" stroke="${cyan}" fill="none" opacity=".45"/>`;
        }
        if (locked) {
            // a padlock
            out += `<rect x="${p[0] - 10}" y="${p[1] - 3}" width="20" height="15" rx="3" fill="${pink}"/><path d="M ${p[0] - 6} ${p[1] - 3} v -5 a 6 6 0 0 1 12 0 v 5" stroke="${pink}" stroke-width="3" fill="none"/>`;
        }
        if (reached && !current) {
            out += `<circle cx="${p[0] + 24}" cy="${p[1] - 24}" r="8" fill="#0b1a14" stroke="#9dff9b" stroke-width="2"/><path d="M ${p[0] + 20} ${p[1] - 24} l 3 3 l 5 -6" stroke="#9dff9b" stroke-width="2" fill="none"/>`;
        }
        out +=
            `<text x="${p[0]}" y="${p[1] + 53}" text-anchor="middle" fill="#e9f6ff" font-size="15" font-weight="bold">${world.name}</text><text x="${p[0]}" y="${p[1] + 70}" text-anchor="middle" fill="${status_color}" font-size="10">${status}</text></g>`;
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
        `${campaign.visited.length} OF ${worlds.length} WORLDS VISITED · CLICK A WORLD TO PLAN TRAVEL · CYAN RING: YOU · ✓ VISITED · DASHED RING: OPEN, NOT VISITED · PADLOCK: UPGRADES REQUIRED · GOLD: YOUR ROUTE · Lanes are world gates, not the local jump gates.`;
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
    render_layer_switches(parent);
    const wrap = document.createElement('div');
    wrap.className = 'chart-wrap';
    parent.append(wrap);
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
    wrap.append(map);
    render_local_map_canvas(map);
    wrap.append(render_map_legend());
    const hint = document.createElement('p');
    hint.className = 'chart-legend';
    hint.textContent = 'CLICK A THING OR EMPTY SPACE TO PLAN A ROUTE · THE MAP SHOWS WHAT YOU HAVE CHARTED: FLY TO CHART MORE, OR SCAN A BEACON';
    parent.append(hint);
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
    // what the map shows can be picked: the station and what is charted on the layers that are on
    const targets = [{...station, label: worlds[campaign.world].station}, ...map_things().filter(v => v.target).map(v => v.target)];
    for (const target of targets) {
        const d = Math.hypot(((target.x - point.x)/b.w)*960, ((target.y - point.y)/b.h)*620);
        if (d < near) {
            near = d;
            best = target;
        }
    }
    if (!best || (near >= 35)) {
        track_local_point(point, `COORDINATES ${Math.round(point.x)} / ${Math.round(point.y)}`);
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
            ctx.fillText(`${c.interaction} / ${c.goal.label}`, W/2, H - 165);
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
