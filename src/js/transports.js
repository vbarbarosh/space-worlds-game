// Transport line: a heavy armed freighter, bought for a world at its station, flies a loop from the station to each of
// your outposts there with ore in store, pumps their stores into its hold, and flies back to unload and sell at the
// station. Two heavy turrets fire at raiders within range, and raids come for it on the way. Lost, its cargo is gone
// and a new one leaves the station a minute later. campaign.lines[world] keeps its hull, cargo and earnings with the
// save; where it is in its loop is not kept, and after a load it starts from the station.
const transport_price = 350;
const transport_hold = 60;
const transport_hp = 900;
const transport_speed = 300;
const transport_range = 560;
const transport_respawn = 60;
let transport = null;
let transport_raid_clock = 140;

// The line of the world you are in, or null where you have none
function transport_line()
{
    return campaign.lines?.[campaign.world] || null;
}

// The transport's hull: the designer's heavy transport, 160 long; the convoy freighter where it is missing
function transport_sprite()
{
    return sprite('transport-heavy') ? {name: 'transport-heavy', length: sprite_sizes.transport} : {name: 'freighter', length: sprite_sizes.freighter};
}

function transports_update(dt)
{
    if (arcade.active || !player) {
        return;
    }
    const line = transport_line();
    if (!line) {
        transport = null;
        return;
    }
    if (!transport || (transport.line !== line) || (transport.world !== campaign.world)) {
        transport = transport_spawn(line);
    }
    const ship = transport;
    if (ship.down > 0) {
        ship.down -= dt;
        if (ship.down <= 0) {
            line.hp = transport_hp;
            transport = transport_spawn(line);
            show_toast('NEW TRANSPORT', `LEAVING ${worlds[campaign.world].station.toUpperCase()}`, 3);
        }
        return;
    }
    transport_move(ship, dt);
    transport_guns(ship, dt);
    transport_damage(ship, dt);
    transport_raids(ship, dt);
    if (line.hp <= 0) {
        transport_lost(ship);
    }
}

// A transport at the station, waiting for an outpost to have a load
function transport_spawn(line)
{
    const a = rand(0, Math.PI*2);
    return {line, world: campaign.world, x: station.x + Math.cos(a)*station_reach, y: station.y + Math.sin(a)*station_reach, angle: a, state: 'waiting', timer: 0, stops: [], path: [], aim: [0, 0, 0, 0], cooldown: [0, 0.35, 0.2, 0.55], recoil: [0, 0, 0, 0], down: 0, r: transport_sprite().length*0.36};
}

// The stops of a new loop: the outposts holding at least ten units, nearest first, then the station
function transport_plan(ship)
{
    const ready = structures_here().filter(v => (v.kind === 'outpost') && (v.built >= 1) && (v.store >= 10));
    const stops = [];
    let from = ship;
    while (ready.length) {
        ready.sort((a, b) => distance(a, from) - distance(b, from));
        from = ready.shift();
        stops.push(from.id);
    }
    return stops.length ? [...stops, 'station'] : [];
}

// The structure or the station a stop names, and the point the transport docks at, on the side it comes from
function transport_stop(ship)
{
    const id = ship.stops[0];
    const target = (id === 'station') ? station : structures_here().find(v => v.id === id);
    if (!target) {
        return null;
    }
    const reach = (id === 'station') ? station_reach + 40 : 110;
    const d = Math.max(1, distance(ship, target));
    return {id, target, dock: {x: target.x + ((ship.x - target.x)/d)*reach, y: target.y + ((ship.y - target.y)/d)*reach}};
}

function transport_move(ship, dt)
{
    const line = ship.line;
    if (ship.state === 'waiting') {
        ship.timer -= dt;
        if (ship.timer > 0) {
            return;
        }
        ship.timer = 3;
        ship.stops = transport_plan(ship);
        if (ship.stops.length) {
            transport_next(ship);
        }
        return;
    }
    if (ship.state === 'flying') {
        const stop = transport_stop(ship);
        if (!stop) {
            ship.stops.shift();
            transport_next(ship);
            return;
        }
        const point = ship.path[0] || stop.dock;
        const dx = point.x - ship.x;
        const dy = point.y - ship.y;
        const d = Math.hypot(dx, dy);
        const step = Math.min(d, transport_speed*dt);
        if (d > 1) {
            ship.x += (dx/d)*step;
            ship.y += (dy/d)*step;
            const turn = Math.atan2(Math.sin(Math.atan2(dy, dx) - ship.angle), Math.cos(Math.atan2(dy, dx) - ship.angle));
            ship.angle += clamp(turn, -dt*1.4, dt*1.4);
        }
        if (d - step < 12) {
            if (ship.path.length > 1) {
                ship.path.shift();
            }
            else {
                ship.state = (stop.id === 'station') ? 'unloading' : 'loading';
                ship.timer = (stop.id === 'station') ? 3 : 0;
            }
        }
        return;
    }
    if (ship.state === 'loading') {
        const site = transport_stop(ship)?.target;
        ship.timer -= dt;
        while (site && (ship.timer <= 0) && (site.store > 0) && (line.count < transport_hold)) {
            ship.timer += 0.08;
            const key = Object.keys(site.loads || {}).find(v => site.loads[v] > 0);
            if (!key) {
                site.store = 0;
                break;
            }
            site.loads[key]--;
            site.store--;
            line.cargo[key] = (line.cargo[key] || 0) + 1;
            line.count++;
        }
        if (!site || !site.store || (line.count >= transport_hold)) {
            save_checkpoint();
            ship.stops.shift();
            // a full hold goes straight to the station
            if (line.count >= transport_hold) {
                ship.stops = ['station'];
            }
            transport_next(ship);
        }
        return;
    }
    if (ship.state === 'unloading') {
        ship.timer -= dt;
        if (ship.timer <= 0) {
            transport_unload(ship);
            ship.stops = [];
            ship.state = 'waiting';
            ship.timer = 2;
        }
    }
}

// On to the next stop, round the black holes; at the end of the loop, back to waiting
function transport_next(ship)
{
    const stop = transport_stop(ship);
    if (!stop) {
        ship.state = 'waiting';
        ship.timer = 3;
        return;
    }
    ship.path = safe_flight_path(ship, stop.dock);
    ship.state = 'flying';
}

// At the station: the hold is sold at this world's prices, and the hull repaired
function transport_unload(ship)
{
    const line = ship.line;
    line.hp = transport_hp;
    if (!line.count) {
        return;
    }
    let value = 0;
    for (const [key, amount] of Object.entries(line.cargo)) {
        if (amount > 0) {
            value += trade_total(campaign.world, key, 'sell', amount);
        }
    }
    salvage += value;
    line.earned = (line.earned || 0) + value;
    show_toast('TRANSPORT UNLOADED', `${line.count} UNITS SOLD AT ${worlds[campaign.world].station.toUpperCase()} · ◆ ${value}`, 3);
    sfx('pickup');
    line.cargo = {};
    line.count = 0;
    save_checkpoint();
}

// Where the turrets sit, in the world: on the drawing's four turret marks, or for the freighter two on its spine, a
// quarter of its length ahead and behind
function transport_mounts(ship)
{
    const art = transport_sprite();
    const points = sprite_anchors(art.name, art.length)?.points || {};
    const marks = ['turret-1', 'turret-2', 'turret-3', 'turret-4'].map(v => points[v]).filter(Boolean);
    const local = marks.length ? marks : [{x: art.length*0.24, y: 0}, {x: -art.length*0.24, y: 0}];
    return local.map(v => transport_point(ship, v));
}

// A point of the ship's frame (x along the nose) in the world
function transport_point(ship, p)
{
    const c = Math.cos(ship.angle);
    const s = Math.sin(ship.angle);
    return {x: ship.x + p.x*c - p.y*s, y: ship.y + p.x*s + p.y*c};
}

// Each turret turns to the nearest raider within range and fires a twin burst of heavy plasma
function transport_guns(ship, dt)
{
    const mounts = transport_mounts(ship);
    for (let i = 0; i < mounts.length; ++i) {
        const m = mounts[i];
        ship.cooldown[i] -= dt;
        ship.recoil[i] = Math.max(0, ship.recoil[i] - dt*10);
        const target = enemies.filter(v => (v.hp > 0) && (distance(v, m) < transport_range)).sort((a, b) => distance(a, m) - distance(b, m))[0];
        if (!target) {
            continue;
        }
        const want = Math.atan2(target.y - m.y, target.x - m.x);
        ship.aim[i] += clamp(Math.atan2(Math.sin(want - ship.aim[i]), Math.cos(want - ship.aim[i])), -dt*3, dt*3);
        if ((ship.cooldown[i] > 0) || (Math.abs(Math.atan2(Math.sin(want - ship.aim[i]), Math.cos(want - ship.aim[i]))) > 0.2)) {
            continue;
        }
        ship.cooldown[i] = 0.75;
        ship.recoil[i] = 1;
        for (const side of [-1, 1]) {
            const x = m.x + Math.cos(ship.aim[i])*16 - Math.sin(ship.aim[i])*side*4;
            const y = m.y + Math.sin(ship.aim[i])*16 + Math.cos(ship.aim[i])*side*4;
            bullets.push({x, y, vx: Math.cos(ship.aim[i])*1300, vy: Math.sin(ship.aim[i])*1300, life: transport_range/1300, damage: 12, r: 3, weapon: 'plasma', color: gold, width: 2.5});
        }
        explode(m.x + Math.cos(ship.aim[i])*16, m.y + Math.sin(ship.aim[i])*16, 5, gold, 0, 'muzzle');
    }
}

function transport_damage(ship, dt)
{
    for (const b of hostile) {
        if ((b.life > 0) && (distance(b, ship) < b.r + ship.r)) {
            ship.line.hp -= b.damage || 13;
            b.life = 0;
            explode(b.x, b.y, 8, '#bfe4ff', 0, 'muzzle');
        }
    }
    for (const e of enemies) {
        if ((e.hp > 0) && (distance(e, ship) < e.r + ship.r)) {
            ship.line.hp -= 30*dt;
        }
    }
}

// Every two to three minutes on the road, away from the station, three raiders come for the transport
function transport_raids(ship, dt)
{
    if ((ship.state !== 'flying') || (distance(ship, station) < station_shelter + 1000)) {
        return;
    }
    transport_raid_clock -= dt;
    if ((transport_raid_clock > 0) || (enemies.length > 14)) {
        return;
    }
    transport_raid_clock = rand(120, 180);
    for (let i = 0; i < 3; ++i) {
        const enemy = spawn_enemy((i === 2) ? 'shooter' : 'chaser');
        const a = ship.angle + rand(-0.8, 0.8);
        enemy.x = clamp(ship.x + Math.cos(a)*650, 50, world.w - 50);
        enemy.y = clamp(ship.y + Math.sin(a)*650, 50, world.h - 50);
        enemy.structure_target = 'transport';
    }
    show_toast('RAIDERS ON YOUR TRANSPORT', `${Math.round(distance(player, ship))} m AWAY · ${ship.line.count} UNITS ABOARD`, 3);
}

function transport_lost(ship)
{
    const lost = ship.line.count;
    explode(ship.x, ship.y, 90, gold);
    burst(ship.x, ship.y, gold, 60, 380);
    ship.line.cargo = {};
    ship.line.count = 0;
    ship.line.hp = 0;
    ship.down = transport_respawn;
    ship.stops = [];
    ship.path = [];
    show_toast('TRANSPORT LOST', `${lost} UNITS GONE · A NEW ONE LEAVES THE STATION IN ${transport_respawn} s`, 4);
    save_checkpoint();
}

// The transport a raider was sent for, while it flies
function transport_prey()
{
    return (transport && !(transport.down > 0)) ? transport : null;
}

// The route ahead, the cargo stream while it loads, the hull and its turrets, and what it is doing
function render_transport()
{
    const ship = transport_prey();
    if (!ship) {
        return;
    }
    const stop = transport_stop(ship);
    if ((ship.state === 'flying') && stop) {
        ctx.save();
        ctx.strokeStyle = '#ffd16e44';
        ctx.lineWidth = 1.5/zoom;
        ctx.setLineDash([10/zoom, 12/zoom]);
        ctx.lineDashOffset = -clock*24/zoom;
        ctx.beginPath();
        ctx.moveTo(ship.x, ship.y);
        for (const p of [...ship.path, stop.dock]) {
            ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.restore();
    }
    if (!in_view(ship, 200)) {
        return;
    }
    if ((ship.state === 'loading') && stop) {
        const art = transport_sprite();
        const port = sprite_anchors(art.name, art.length)?.points.cargo;
        transport_stream(stop.target, port ? transport_point(ship, port) : ship);
    }
    const art = transport_sprite();
    render_surface_ship(ship.x, ship.y, ship.angle, 1, false, {...current_ship(), sprite: art});
    const mounts = transport_mounts(ship);
    for (let i = 0; i < mounts.length; ++i) {
        ctx.save();
        ctx.translate(mounts[i].x, mounts[i].y);
        ctx.rotate(ship.aim[i]);
        // the designer's heavy turret, about a sixth of the hull's length across
        turret_draw(ctx, {id: 'heavy', color: gold}, art.length*0.17, ship.recoil[i]);
        ctx.restore();
    }
    const doing = {waiting: 'at the station', flying: (stop?.id === 'station') ? 'to the station' : 'to an outpost', loading: 'loading', unloading: 'unloading'}[ship.state];
    world_label(ship.x, ship.y + art.length*0.5 + 6, 'TRANSPORT', `${doing} · ${ship.line.count}/${transport_hold}`, gold);
    ctx.save();
    ctx.fillStyle = '#0b1222';
    ctx.fillRect(ship.x - 36, ship.y - art.length*0.5 - 14, 72, 4);
    ctx.fillStyle = (ship.line.hp < transport_hp*0.35) ? pink : gold;
    ctx.fillRect(ship.x - 36, ship.y - art.length*0.5 - 14, (72*Math.max(0, ship.line.hp))/transport_hp, 4);
    ctx.restore();
}

// Ore pumped from an outpost to the hold: bright beads running along a faint line
function transport_stream(from, to)
{
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#ffd16e33';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.fillStyle = gold;
    for (let i = 0; i < 6; ++i) {
        const t = (i/6 + clock*1.5) % 1;
        ctx.globalAlpha = Math.sin(Math.PI*t);
        ctx.beginPath();
        ctx.arc(from.x + (to.x - from.x)*t, from.y + (to.y - from.y)*t, 3.5, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.restore();
}

// The station's shop sells a line for its own world, once
function render_transport_shop_card()
{
    if (arcade.active || !['all', 'helpers'].includes(shop_filter)) {
        return;
    }
    const line = transport_line();
    const here = worlds[campaign.world].name;
    const status = !line ? 'NOT OWNED' : (transport?.down > 0) ? `LOST · NEW ONE IN ${Math.ceil(transport.down)} s` : `IN SERVICE · ${line.count}/${transport_hold} ABOARD · ◆ ${line.earned || 0} EARNED`;
    const card = document.createElement('div');
    card.className = 'shop-item';
    card.innerHTML = `<b>Transport line · ${here}</b><span class="item-level">${status}</span><p>A heavy armed freighter for ${here}: from the station to each of your outposts here, it loads their ore and sells it at the station. Two heavy turrets; raiders hunt it on the road.</p>`;
    const b = document.createElement('button');
    b.disabled = !!line || (salvage < transport_price);
    b.textContent = line ? 'IN SERVICE' : `BUY · ◆ ${transport_price}`;
    b.addEventListener('click', buy_transport_line);
    card.append(b);
    el.shop_grid.prepend(card);
}

// Docked: a transport line for this world
function buy_transport_line()
{
    if ((state !== 'upgrade') || transport_line() || (salvage < transport_price)) {
        return;
    }
    salvage -= transport_price;
    campaign.lines = campaign.lines || {};
    campaign.lines[campaign.world] = {hp: transport_hp, cargo: {}, count: 0, earned: 0};
    sfx('upgrade');
    dock_message = `Transport line opened for ${worlds[campaign.world].name}. It collects from your outposts here.`;
    refresh_station_tab();
    save_checkpoint('dock');
}
