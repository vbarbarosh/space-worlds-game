// A perspective cabin shares the same world coordinates, collision rules and save data.
const cabin = {yaw: -Math.PI/2, turn: 0};
function cabin_angle_from_delta(value)
{
    return Math.atan2(Math.sin(value), Math.cos(value));
}

function cabin_focal()
{
    return width*0.72*zoom;
}

function cabin_project(v, altitude = 0, padding = 100)
{
    const W = width;
    const H = height;
    if (!player) {
        return null;
    }
    const dx = v.x - player.x;
    const dy = v.y - player.y;
    const c = Math.cos(cabin.yaw);
    const s = Math.sin(cabin.yaw);
    const depth = dx*c + dy*s + 85;
    const right = -dx*s + dy*c;
    if ((depth < 40) || (depth > 18000)) {
        return null;
    }
    const k = cabin_focal()/depth;
    const x = W*0.5 + right*k;
    const y = H*0.4 + (70 - altitude)*k;
    padding = Math.max(padding, padding*k);
    if ((x < -padding) || (x > W + padding) || (y < -padding) || (y > H*0.82 + padding)) {
        return null;
    }
    return {x, y, k, depth, right, distance: Math.hypot(dx, dy)};
}

function cabin_point_from_screen(p, pick = false)
{
    const W = width;
    const H = height;
    if (!player) {
        return {x: p.x/zoom + camera.x, y: p.y/zoom + camera.y};
    }
    if (pick && !mouse_drive.following) {
        let best = null;
        let near = Infinity;
        const objects = [
            {v: station, altitude: 105, r: 145},
            ...world_gates.map(v => ({v, altitude: 70, r: 95})),
            ...portals.map(v => ({v, altitude: 70, r: 65})),
            ...beacons.map(v => ({v, altitude: 35, r: 35})),
            ...enemies.map(v => ({v, altitude: 0, r: v.r*2})),
            ...ore_nodes.filter(v => v.hp > 0).map(v => ({v, altitude: 0, r: v.r})),
        ];
        for (const object of objects) {
            const q = cabin_project(object.v, object.altitude, 100);
            if (!q) {
                continue;
            }
            const d = Math.hypot(q.x - p.x, q.y - p.y);
            const r = clamp(object.r*q.k, 18, W*0.3);
            if ((d < r) && (q.depth < near)) {
                near = q.depth;
                best = object.v;
            }
        }
        if (best) {
            return {x: best.x, y: best.y};
        }
    }
    const focal = cabin_focal();
    const depth = clamp((70*focal)/Math.max(35, p.y - H*0.4), 180, 4500);
    const right = ((p.x - W*0.5)/focal)*depth;
    const c = Math.cos(cabin.yaw);
    const s = Math.sin(cabin.yaw);
    return {x: clamp(player.x + c*(depth - 85) - s*right, 24, world.w - 24), y: clamp(player.y + s*(depth - 85) + c*right, 24, world.h - 24)};
}

function cabin_movement(dt, turn, throttle)
{
    const yaw_input = joystick.active ? joystick.dx : turn;
    const forward = joystick.active ? -joystick.dy : -throttle;
    if ((Math.abs(yaw_input) > 0.03) || (Math.abs(forward) > 0.03)) {
        mouse_drive.active = false;
        mouse_drive.following = false;
        guide_flying = false;
    }
    cabin.yaw = cabin_angle_from_delta(cabin.yaw + yaw_input*1.65*current_ship().handling*(1 + upgrades.stabilizer*0.3)*dt);
    cabin.turn += (yaw_input - cabin.turn)*(1 - Math.exp(-7*dt));
    if (mouse_drive.active) {
        const target = Math.atan2(mouse_drive.y - player.y, mouse_drive.x - player.x);
        cabin.yaw = cabin_angle_from_delta(cabin.yaw + cabin_angle_from_delta(target - cabin.yaw)*(1 - Math.exp(-3.5*dt)));
    }
    return {x: Math.cos(cabin.yaw)*forward, y: Math.sin(cabin.yaw)*forward};
}

function cabin_path(draw, points, fill, stroke = null, width = 1)
{
    draw.beginPath();
    for (let i = 0, end = points.length; i < end; ++i) {
        if (i) {
            draw.lineTo(points[i][0], points[i][1]);
        }
        else {
            draw.moveTo(points[i][0], points[i][1]);
        }
    }
    draw.closePath();
    draw.fillStyle = fill;
    draw.fill();
    if (stroke) {
        draw.strokeStyle = stroke;
        draw.lineWidth = width;
        draw.stroke();
    }
}

function cabin_ship_asset(v, friendly = false)
{
    const color = friendly ? cyan : v.color || pink;
    const shape = friendly ? current_ship().shape : (v.type === 'boss') ? 5 : (v.type === 'tank') ? 4 : (v.type === 'shooter') ? 1 : (v.type === 'splitter') ? 3 : 2;
    return surface_asset('cabin_ship:' + shape + ':' + color, 256, function (draw) {
        const wide = (shape >= 4) ? 105 : (shape === 2) ? 94 : 75;
        const tall = (shape >= 4) ? 32 : 20;
        cabin_path(
            draw,
            [
                [-wide, 18],
                [-wide*0.65, -tall],
                [-25, -9],
                [0, -32],
                [25, -9],
                [wide*0.65, -tall],
                [wide, 18],
                [40, 27],
                [0, 36],
                [-40, 27],
            ],
            material_gradient(draw, friendly ? '#728ca0' : '#685567', 100),
            '#bac5d477',
            1.5
        );
        for (let i = -1; i <= 1; i += 2) {
            cabin_path(
                draw,
                [
                    [i*32, 0],
                    [i*wide*0.6, -tall + 4],
                    [i*(wide - 5), 14],
                    [i*45, 16],
                ],
                '#1e2d40',
                color + '66'
            );
            material_box(draw, i*wide*0.52 - 9, 9, 18, 8, '#828c9f');
            draw.fillStyle = color;
            draw.fillRect(i*wide*0.52 - 6, 11, 12, 3);
            draw.strokeStyle = '#e4edf855';
            draw.beginPath();
            draw.moveTo(i*38, 8);
            draw.lineTo(i*wide*0.8, 12);
            draw.stroke();
        }
        cabin_path(
            draw,
            [
                [-18, -8],
                [0, -25],
                [18, -8],
                [12, 7],
                [-12, 7],
            ],
            '#112b42',
            color,
            1.2
        );
        cabin_path(
            draw,
            [
                [-10, -7],
                [0, -17],
                [10, -7],
                [7, 1],
                [-7, 1],
            ],
            color + 'aa'
        );
        material_box(draw, -11, 12, 22, 12, '#687d8f');
        draw.fillStyle = '#daeaff';
        draw.fillRect(-2, 14, 4, 9);
    });
}

function cabin_draw_object(item)
{
    const W = width;
    const H = height;
    const v = item.v;
    const p = cabin_project(v, item.altitude || 0, (item.radius*2) || 200);
    if (!p) {
        return;
    }
    const color = item.color || v.color || cyan;
    ctx.save();
    ctx.translate(p.x, p.y);
    const radius = clamp((item.radius || 30)*p.k, 1, Math.max(W, H)*0.8);
    const size = radius*2;
    if (item.type === 'planet') {
        const sky = ensure_world_visuals(v.texture);
        ctx.globalAlpha = v.primary ? 0.78 : 0.45;
        ctx.drawImage(sky.texture, -size/2, -size/2, size, size);
    }
    else if (item.type === 'station') {
        const asset = station_surface(campaign.world);
        ctx.drawImage(asset.layer, -size/2, -size/2, size, size);
    }
    else if (item.type === 'gate') {
        ctx.strokeStyle = '#344a60';
        ctx.lineWidth = clamp(radius*0.13, 3, 18);
        ctx.beginPath();
        ctx.ellipse(0, 0, radius, radius*1.02, 0, 0, Math.PI*2);
        ctx.stroke();
        ctx.strokeStyle = color;
        ctx.lineWidth = clamp(radius*0.025, 1, 4);
        ctx.stroke();
        ctx.fillStyle = color + '12';
        ctx.fill();
        for (let i = 0; i < 6; ++i) {
            const a = (i*Math.PI)/3 + clock*0.15;
            ctx.fillStyle = '#d4efff';
            ctx.fillRect(Math.cos(a)*radius - 2, Math.sin(a)*radius - 2, 4, 4);
        }
        if (full_fx) {
            ctx.strokeStyle = color + '33';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, radius*0.75, clock*0.3, clock*0.3 + Math.PI*1.5);
            ctx.stroke();
        }
    }
    else if (item.type === 'ship') {
        const asset = cabin_ship_asset(v, item.friendly);
        ctx.drawImage(asset.layer, -size, -size*0.55, size*2, size*1.1);
        if (v.shield > 0) {
            ctx.strokeStyle = color + '55';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(0, 0, radius*1.3, radius*0.65, 0, 0, Math.PI*2);
            ctx.stroke();
        }
        if (v.hp < v.max_hp) {
            ctx.fillStyle = '#ffffff22';
            ctx.fillRect(-radius, -radius*0.7, radius*2, 3);
            ctx.fillStyle = color;
            ctx.fillRect(-radius, -radius*0.7, radius*2*clamp(v.hp/v.max_hp, 0, 1), 3);
        }
    }
    else if (item.type === 'black_hole') {
        const g = ctx.createRadialGradient(0, 0, radius*0.45, 0, 0, radius*1.5);
        g.addColorStop(0, '#000000');
        g.addColorStop(0.45, '#d25c4844');
        g.addColorStop(1, '#c7376f00');
        ctx.fillStyle = g;
        ctx.fillRect(-radius*1.5, -radius*1.5, radius*3, radius*3);
        ctx.strokeStyle = '#ffbc87';
        ctx.lineWidth = clamp(radius*0.04, 1, 8);
        ctx.beginPath();
        ctx.ellipse(0, 0, radius*1.25, radius*0.4, -0.2, 0, Math.PI*2);
        ctx.stroke();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, 0, radius*0.65, 0, Math.PI*2);
        ctx.fill();
    }
    else if (item.type === 'rock') {
        const asset = rock_surface(campaign.world, item.variant || 0);
        ctx.rotate(v.angle || 0);
        ctx.drawImage(asset.layer, -radius, -radius, size, size);
    }
    else if (item.type === 'scenery') {
        const asset = scenery_surface(campaign.world, item.variant || 0);
        ctx.drawImage(asset.layer, -radius, -radius, size, size);
    }
    else if (item.type === 'field') {
        ctx.fillStyle = color + '12';
        ctx.strokeStyle = color + '88';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.ellipse(0, 0, radius, radius*0.22, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
    }
    else if (item.type === 'beacon') {
        ctx.strokeStyle = cyan;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI*2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -radius*1.4);
        ctx.lineTo(0, radius*1.4);
        ctx.moveTo(-radius*1.4, 0);
        ctx.lineTo(radius*1.4, 0);
        ctx.stroke();
    }
    else if (item.type === 'pickup') {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -radius);
        ctx.lineTo(radius, 0);
        ctx.lineTo(0, radius);
        ctx.lineTo(-radius, 0);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
    if (item.label && (p.depth < 6500) && (p.x > 40) && (p.x < W - 40) && (p.y < H*0.69)) {
        ctx.font = ((item.type === 'ship') ? '10' : '11') + 'px ui-monospace,monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = color;
        ctx.fillText(item.label, p.x, Math.min(H*0.72, p.y + radius + 18));
        ctx.fillStyle = '#afc7da';
        ctx.font = '9px ui-monospace,monospace';
        ctx.fillText(Math.round(p.distance) + ' m', p.x, Math.min(H*0.74, p.y + radius + 31));
    }
}

function cabin_render_world()
{
    const items = [];
    function add(v, type, radius, altitude = 0, label = '', color = null, variant = 0, friendly = false) {
        const p = cabin_project(v, altitude, radius*2);
        if (p) {
            items.push({v, type, radius, altitude, label, color, variant, friendly, depth: p.depth});
        }
    }
    for (const world_body of world_bodies) {
        add(world_body, 'planet', world_body.diam*0.437, 250 + world_body.diam*0.08);
    }
    for (let i = 0, end = scenery.length; i < end; ++i) {
        const v = scenery[i];
        add(v, 'scenery', v.r*0.6, ((i % 5) - 2)*90, '', null, i % 4);
    }
    for (let i = 0, end = ore_nodes.length; i < end; ++i) {
        const ore_node = ore_nodes[i];
        if (ore_node.hp > 0) {
            add(ore_node, 'rock', ore_node.r, 0, '', gold, i % 4);
        }
    }
    for (const black_hole of black_holes) {
        add(black_hole, 'black_hole', black_hole.core*2.3, 80, 'FATAL CORE / GRAVITY', pink);
    }
    add(station, 'station', 155, 105, worlds[campaign.world].station.toUpperCase(), cyan);
    for (const portal of portals) {
        add(portal, 'gate', portal.r, 70, 'LOCAL GATE ' + portal.label, portal.color);
    }
    for (const world_gate of world_gates) {
        add(world_gate, 'gate', 85, 70, 'WORLD GATE → ' + worlds[world_gate.destination].name.toUpperCase(), world_gate.color);
    }
    for (const drifting_debri of drifting_debris) {
        add(
            drifting_debri,
            (drifting_debri.kind === 'wreck') ? 'scenery' : 'rock',
            drifting_debri.r,
            0,
            (drifting_debri.kind === 'wreck') ? 'DRIFTING WRECKAGE' : 'ASTEROID',
            '#c2b08c'
        );
    }
    for (const world_zone of world_zones) {
        const phase = zone_state(world_zone);
        add(
            world_zone,
            'field',
            world_zone.r,
            0,
            ((world_zone.type === 'storm') ? 'ION FIELD' : 'SOLAR FIELD') + ' / ' + (phase.active ? 'ACTIVE' : phase.warning ? 'WARNING' : 'CALM'),
            (world_zone.type === 'storm') ? blue : '#ff9469'
        );
    }
    for (const hazard of hazards) {
        add(hazard, 'field', hazard.r, 0, (hazard.life < 1.8) ? 'ION SURGE' : 'SURGE WARNING', (hazard.life < 1.8) ? pink : gold);
    }
    for (let i = 0, end = beacons.length; i < end; ++i) {
        const beacon = beacons[i];
        add(beacon, 'beacon', 28, 35, 'SCAN BEACON ' + (i + 1), cyan);
    }
    for (const enemy of enemies) {
        if (enemy.hp > 0) {
            add(
                enemy,
                'ship',
                (enemy.type === 'boss') ? enemy.r*1.2 : enemy.r*1.1,
                0,
                (enemy.type === 'boss') ? 'HOSTILE FLAGSHIP' : enemy.elite ? 'ELITE TARGET' : '',
                enemy.color || pink
            );
        }
    }
    if (escort) {
        add(escort, 'ship', 35, 0, 'CONVOY / ' + Math.ceil(escort.hp) + ' HULL', cyan, 0, true);
    }
    for (const pickup of pickups) {
        add(pickup, 'pickup', (pickup.type === 'artifact') ? 7 : 10, 0, '', (pickup.type === 'artifact') ? gold : (pickup.type === 'energy') ? pink : cyan);
    }
    items.sort((a, b) => b.depth - a.depth);
    for (const item of items) {
        cabin_draw_object(item);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const ring of rings) {
        const progress = 1 - ring.life/ring.total;
        const r = ring.max_r*(1 - Math.pow(1 - progress, 3));
        ctx.strokeStyle = ring.color;
        ctx.globalAlpha = (1 - progress)*0.6;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let previous = false;
        for (let i = 0; i <= 48; ++i) {
            const a = (i/48)*Math.PI*2;
            const p = cabin_project({x: ring.x + Math.cos(a)*r, y: ring.y + Math.sin(a)*r}, 0, 80);
            if (p) {
                if (previous) {
                    ctx.lineTo(p.x, p.y);
                }
                else {
                    ctx.moveTo(p.x, p.y);
                }
            }
            previous = !!p;
        }
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const projectile_lists = [bullets, hostile];
    for (let index = 0, index_end = projectile_lists.length; index < index_end; ++index) {
        const list = projectile_lists[index];
        for (let i = 0, end = list.length; i < end; ++i) {
            const v = list[i];
            if (v.life <= 0) {
                continue;
            }
            const p = cabin_project(v, 0, 80);
            if (!p) {
                continue;
            }
            const tail = cabin_project({x: v.x - v.vx*0.035, y: v.y - v.vy*0.035}, 0, 120);
            ctx.strokeStyle = v.color || (index ? pink : cyan);
            ctx.lineWidth = clamp((v.r || 3)*p.k, 1, 8);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(tail ? tail.x : p.x, tail ? tail.y : p.y + 5);
            ctx.stroke();
            if (index && (p.distance < 180)) {
                ctx.globalAlpha = 0.12;
                ctx.fillStyle = pink;
                ctx.fillRect(0, 0, W, H*0.8);
                ctx.globalAlpha = 1;
            }
        }
    }
    if (full_fx) {
        for (let i = 0, end = Math.min(particles.length, 220); i < end; ++i) {
            const v = particles[i];
            const p = cabin_project(v, ((i % 7) - 3)*6, 20);
            if (!p) {
                continue;
            }
            ctx.globalAlpha = clamp(v.life/v.total, 0, 1);
            ctx.fillStyle = v.color;
            const r = clamp(v.size*p.k, 1, 5);
            ctx.fillRect(p.x, p.y, r, r);
        }
        ctx.globalAlpha = 1;
    }
    ctx.restore();
    render_explosions_in_cabin();
}

function cabin_label(text, x, y, size = 10, color = cyan, align = 'left')
{
    ctx.font = size + 'px ui-monospace,monospace';
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

function cabin_render_radar()
{
    const W = width;
    const H = height;
    const radius = Math.min(68, W*0.085, H*0.075);
    const x = W*0.84;
    const y = H*0.86;
    const range = 2200;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#06141ce8';
    ctx.beginPath();
    ctx.arc(0, 0, radius + 7, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#52ddc540';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; ++i) {
        ctx.beginPath();
        ctx.arc(0, 0, (radius*i)/3, 0, Math.PI*2);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-radius, 0);
    ctx.lineTo(radius, 0);
    ctx.moveTo(0, -radius);
    ctx.lineTo(0, radius);
    ctx.stroke();
    ctx.fillStyle = '#70d8cb09';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -Math.PI*0.77, -Math.PI*0.23);
    ctx.closePath();
    ctx.fill();
    function blip(v, color, big = false) {
        const dx = v.x - player.x;
        const dy = v.y - player.y;
        const d = Math.hypot(dx, dy);
        if (d > range) {
            return;
        }
        const right = -dx*Math.sin(cabin.yaw) + dy*Math.cos(cabin.yaw);
        const forward = dx*Math.cos(cabin.yaw) + dy*Math.sin(cabin.yaw);
        ctx.fillStyle = color;
        const r = big ? 4 : 2;
        ctx.fillRect((right/range)*radius - r/2, (-forward/range)*radius - r/2, r, r);
    }
    for (const v of ore_nodes.filter(v => v.hp > 0)) {
        blip(v, '#dfbd6877');
    }
    for (const portal of portals) {
        blip(portal, portal.color, true);
    }
    for (const world_gate of world_gates) {
        blip(world_gate, world_gate.color, true);
    }
    for (const black_hole of black_holes) {
        blip(black_hole, pink, true);
    }
    for (const enemy of enemies) {
        blip(enemy, pink, true);
    }
    blip(station, cyan, true);
    if (escort) {
        blip(escort, cyan, true);
    }
    ctx.fillStyle = '#f0fff9';
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(-3, 4);
    ctx.lineTo(3, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    cabin_label((W < 700) ? 'RADAR / 2.2 km' : 'LOCAL RADAR / 2.2 km', x, y + radius + 17, 8, '#a5c4ce', 'center');
}

function cabin_render_guidance()
{
    const W = width;
    const H = height;
    const c = guide_context();
    const goal = c.goal || waypoint;
    if (!goal) {
        return;
    }
    const dx = goal.x - player.x;
    const dy = goal.y - player.y;
    const angle = cabin_angle_from_delta(Math.atan2(dy, dx) - cabin.yaw);
    const d = Math.hypot(dx, dy);
    const p = cabin_project(goal, 35, 50);
    const ahead = Math.abs(angle) < Math.PI*0.44;
    if (p && ahead) {
        ctx.strokeStyle = gold;
        ctx.lineWidth = 1.3;
        ctx.strokeRect(p.x - 15, p.y - 15, 30, 30);
        cabin_label((goal.label || 'OBJECTIVE').toUpperCase(), p.x, p.y - 27, 11, gold, 'center');
    }
    const y = H*((W < 700) ? 0.54 : 0.7);
    const arrow = (angle > 0) ? 'TURN RIGHT →' : '← TURN LEFT';
    const caption = ((d < 230) && c.interaction) ? c.interaction + ' / ' + (goal.label || 'OBJECTIVE') : ahead ? 'OBJECTIVE AHEAD' : arrow;
    cabin_label(caption + ' · ' + Math.round(d) + ' m', W*0.5, y, (W < 700) ? 9 : 12, gold, 'center');
}

function cabin_render_frame()
{
    const W = width;
    const H = height;
    const accent = current_ship().color;
    const deck = H*0.79;
    const g = ctx.createLinearGradient(0, deck, 0, H);
    g.addColorStop(0, '#344552');
    g.addColorStop(0.12, '#13202c');
    g.addColorStop(1, '#060d16');
    cabin_path(
        ctx,
        [
            [0, 0],
            [W*0.105, 0],
            [W*0.07, H*0.48],
            [W*0.16, deck],
            [0, H],
        ],
        '#0a1420',
        '#476476',
        2
    );
    cabin_path(
        ctx,
        [
            [W, 0],
            [W*0.895, 0],
            [W*0.93, H*0.48],
            [W*0.84, deck],
            [W, H],
        ],
        '#0a1420',
        '#476476',
        2
    );
    cabin_path(
        ctx,
        [
            [0, 0],
            [W, 0],
            [W*0.9, H*0.045],
            [W*0.1, H*0.045],
        ],
        '#152431',
        '#5a7688',
        1.5
    );
    cabin_path(
        ctx,
        [
            [0, H],
            [0, deck + H*0.06],
            [W*0.21, deck],
            [W*0.79, deck],
            [W, deck + H*0.06],
            [W, H],
        ],
        g,
        '#668c9d',
        2
    );
    ctx.strokeStyle = accent + '77';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W*0.13, H*0.73);
    ctx.lineTo(W*0.24, deck - 0.01*H);
    ctx.lineTo(W*0.76, deck - 0.01*H);
    ctx.lineTo(W*0.87, H*0.73);
    ctx.stroke();
    // Recessed panels and inset hardware remain fixed when the field of view changes.
    for (let i = 0; i < 9; ++i) {
        const x = W*(0.26 + i*0.057);
        ctx.fillStyle = '#00000066';
        ctx.fillRect(x, deck + 7, W*0.034, 6);
        ctx.fillStyle = ((i === 3) || (i === 4)) ? accent + '88' : '#446471';
        ctx.fillRect(x + 2, deck + 9, W*0.034 - 4, 2);
    }
    const speed = Math.hypot(player.vx, player.vy);
    const heading = (Math.round((cabin.yaw*180)/Math.PI + 90) + 360) % 360;
    cabin_label('VELOCITY', W*0.16, H*0.835, Math.min(9, W*0.012), '#829fb3');
    cabin_label(Math.round(speed) + ' m/s', W*0.16, H*0.872, Math.min(26, W*0.035), accent);
    cabin_label('HEADING', W*0.42, H*0.835, 9, '#829fb3');
    cabin_label(String(heading).padStart(3, '0') + '°', W*0.42, H*0.872, Math.min(26, W*0.035), '#d6f2ed');
    cabin_label(current_ship().name.toUpperCase(), W*0.6, H*0.838, (W < 700) ? 7 : 10, '#aec6d8', 'center');
    cabin_label(current_weapon().name.toUpperCase(), W*0.6, H*0.862, (W < 700) ? 6 : 9, accent, 'center');
    cabin_label(
        (W < 700) ? 'W/S THRUST · A/D TURN · B BRAKE' : 'W / S THRUST · A / D TURN · B BRAKE · CLICK TO FLY',
        W*0.5,
        H*0.748,
        (W < 700) ? 8 : 10,
        '#88a9bb',
        'center'
    );
    cabin_render_radar();
    // Two visible forward hardpoints fire along with the shared automatic weapons.
    cabin_render_turrets(deck, accent);
    if (player.overheated) {
        cabin_label('WEAPONS OVERHEATED / COOLING', W*0.5, H*0.6, 11, gold, 'center');
    }
    if (player.hp < hull_max()*0.25) {
        cabin_label('HULL CRITICAL / Q REPAIR', W*0.5, H*0.11, 12, pink, 'center');
    }
    const gravity = nearest_gravity();
    if (gravity) {
        cabin_label('GRAVITY ' + Math.ceil(gravity.pull) + ' m/s · STEER AWAY', W*0.5, H*0.65, 11, pink, 'center');
    }
}

function render_cabin()
{
    const W = width;
    const H = height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#020710';
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    const sky = ensure_world_visuals(campaign.world);
    render_nebula_layer(campaign.world, sky);
    ctx.fillStyle = '#02071455';
    ctx.fillRect(0, 0, W, H);
    const focal = cabin_focal();
    for (let i = 0, end = stars.length; i < end; ++i) {
        const v = stars[i];
        const a = cabin_angle_from_delta(v.phase - cabin.yaw);
        if (Math.abs(a) > 1.35) {
            continue;
        }
        const x = W*0.5 + Math.tan(a)*focal;
        const y = H*(0.08 + (v.y/H)*0.59);
        ctx.globalAlpha = 0.3 + v.z*0.4;
        ctx.fillStyle = (i % 5) ? '#dbefff' : worlds[campaign.world].accent;
        ctx.fillRect(x, y, Math.max(1, v.z*1.5), Math.max(1, v.z*1.5));
    }
    ctx.globalAlpha = 1;
    cabin_render_world();
    ctx.strokeStyle = cyan + '55';
    ctx.lineWidth = 1;
    const x = W*0.5;
    const y = H*0.4;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI*2);
    ctx.moveTo(x - 22, y);
    ctx.lineTo(x - 15, y);
    ctx.moveTo(x + 15, y);
    ctx.lineTo(x + 22, y);
    ctx.moveTo(x, y - 22);
    ctx.lineTo(x, y - 15);
    ctx.stroke();
    const heading = (Math.round((cabin.yaw*180)/Math.PI + 90) + 360) % 360;
    for (let i = (W < 700) ? -2 : -3; i <= ((W < 700) ? 2 : 3); ++i) {
        const hx = W*0.5 + i*W*0.052;
        cabin_label(String((heading + i*10 + 360) % 360).padStart(3, '0'), hx, H*((W < 700) ? 0.61 : 0.15), (W < 700) ? 7 : 9, '#88bcc1', 'center');
        ctx.strokeStyle = '#8ad2ce33';
        ctx.beginPath();
        ctx.moveTo(hx, H*((W < 700) ? 0.62 : 0.16));
        ctx.lineTo(hx, H*((W < 700) ? 0.628 : 0.168));
        ctx.stroke();
    }
    cabin_label('HEADING / ' + Math.round(zoom*100) + '%', W*0.5, H*((W < 700) ? 0.58 : 0.125), (W < 700) ? 7 : 9, cyan, 'center');
    cabin_render_engine_effects();
    cabin_render_guidance();
    cabin_render_frame();
    render_minimap();
    if (player.dash_time > 0) {
        cabin_label('TURBO ' + player.dash_time.toFixed(1) + 's / RELEASE SHIFT TO DISENGAGE', width*0.5, height*0.55, 11, cyan, 'center');
    }
    if (joystick.active) {
        ctx.strokeStyle = cyan + '55';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(joystick.x, joystick.y, 55, 0, Math.PI*2);
        ctx.stroke();
        ctx.fillStyle = cyan + '66';
        ctx.beginPath();
        ctx.arc(joystick.x + joystick.dx*35, joystick.y + joystick.dy*35, 14, 0, Math.PI*2);
        ctx.fill();
    }
    if (state === 'transit') {
        render_jump();
    }
    if (full_fx && (flash > 0)) {
        ctx.fillStyle = 'rgba(255,91,175,' + flash*0.3 + ')';
        ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
}
