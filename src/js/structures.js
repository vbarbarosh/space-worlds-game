// Structures: a builder drone, bought once at a station, builds what you place. K opens the build menu; pick a
// structure, and a ghost follows the cursor, green where it may stand and red where not; a click places it and pays
// its cost, Esc or a right click cancels. The drone flies out and assembles it, then comes home. Raiders raid
// structures, which have hull and can be lost. campaign.structures keeps them, per world, with the save.
const builder_price = 150;
const structure_kinds = {
    outpost: {
        title: 'Mining outpost',
        cost: {salvage: 120, ore: 6},
        hp: 220,
        size: 127,
        text: 'Stands on a mining field; its two drones mine the rocks into its store of 60. Fly by to take the load, or let a transport line collect it.',
    },
    platform: {
        title: 'Defense platform',
        cost: {salvage: 160, ore: 4},
        hp: 280,
        size: 100,
        text: `A heavy turret that fires at raiders within 480 m. Not within ${station_shelter + 200} m of the station or 700 m of a gate.`,
    },
};
const structure_build_time = 6;
const outpost_store = 60;
const outpost_reach = 320;
// an outpost drone's beam per second (a unit costs deposit_chunk_cost, 70: a unit every 3 s), and the units it
// brings home a trip
const outpost_cut = 23;
const outpost_carry = 10;
const platform_range = 480;
let build_placing = null;
let builder_drone = null;
let structure_raid_clock = 90;

addEventListener('keydown', on_build_key, true);
document.getElementById('quick_build').addEventListener('click', on_build_button);
document.getElementById('build_close').addEventListener('click', () => set_hidden(document.getElementById('build_overlay'), true));

function structures_here()
{
    if (!Array.isArray(campaign.structures)) {
        campaign.structures = [];
    }
    return campaign.structures.filter(v => v.world === campaign.world);
}

function on_build_key(event)
{
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) || event.repeat) {
        return;
    }
    if ((event.code === 'KeyK') && (state === 'playing') && !arcade.active) {
        build_menu_toggle();
    }
    else if ((event.code === 'Escape') && !document.getElementById('build_overlay').classList.contains('hidden')) {
        event.stopPropagation();
        set_hidden(document.getElementById('build_overlay'), true);
    }
    else if ((event.code === 'Escape') && build_placing) {
        event.stopPropagation();
        build_placing = null;
    }
}

function on_build_button()
{
    if ((state === 'playing') && !arcade.active) {
        build_menu_toggle();
    }
}

// The build menu: one card per structure, its cost and whether you can pay it
function build_menu_toggle()
{
    const overlay = document.getElementById('build_overlay');
    if (!overlay.classList.contains('hidden')) {
        set_hidden(overlay, true);
        return;
    }
    const list = document.getElementById('build_list');
    list.replaceChildren();
    if (!campaign.builder) {
        list.innerHTML = '<p class="small">You have no builder drone. Buy one at a station: MODULES → Builder drone.</p>';
    }
    for (const [kind, v] of Object.entries(structure_kinds)) {
        const card = document.createElement('div');
        card.className = 'shop-item';
        card.innerHTML = `<b>${v.title}</b><span class="item-level">◆ ${v.cost.salvage} · ${v.cost.ore} ORE</span><p>${v.text}</p>`;
        const b = document.createElement('button');
        const short = structure_cost_short(v);
        b.textContent = !campaign.builder ? 'NO BUILDER DRONE' : builder_drone ? 'BUILDER BUSY' : short ? `NEED ${short}` : 'PLACE IT';
        b.disabled = !campaign.builder || !!builder_drone || !!short;
        b.addEventListener('click', on_place);
        card.append(b);
        list.append(ui_shop_item(card));
        function on_place() {
            set_hidden(overlay, true);
            build_placing = {kind};
            show_toast(`PLACE THE ${v.title.toUpperCase()}`, 'CLICK WHERE IT GOES · ESC CANCELS', 3);
        }
    }
    set_hidden(overlay, false);
}

// What is missing to pay for a structure, or '' when you can
function structure_cost_short(v)
{
    const missing = [];
    if (salvage < v.cost.salvage) {
        missing.push(`◆ ${v.cost.salvage - salvage}`);
    }
    if ((campaign.cargo.ore || 0) < v.cost.ore) {
        missing.push(`${v.cost.ore - (campaign.cargo.ore || 0)} ORE`);
    }
    return missing.join(' + ');
}

// Where a structure may stand: an outpost on a mining field, a platform away from the station and gates
function structure_spot_ok(kind, p)
{
    if (structures_here().some(v => distance(v, p) < 160)) {
        return false;
    }
    if (kind === 'outpost') {
        return mining_fields.some(v => (distance(v, p) < v.r) && ore_nodes.some(vv => (vv.hp > 0) && (vv.field === v.id)));
    }
    return (distance(station, p) > station_shelter + 200) && world_gates.every(v => distance(v, p) > 700) && portals.every(v => distance(v, p) > 300);
}

// A click while placing: true when it was used
function build_click(point)
{
    if (!build_placing) {
        return false;
    }
    const kind = build_placing.kind;
    const v = structure_kinds[kind];
    if (!structure_spot_ok(kind, point)) {
        show_toast('CANNOT BUILD HERE', (kind === 'outpost') ? 'AN OUTPOST STANDS ON A MINING FIELD WITH ROCKS LEFT' : 'KEEP 700 m FROM THE STATION AND GATES', 2);
        return true;
    }
    if (structure_cost_short(v)) {
        build_placing = null;
        return true;
    }
    salvage -= v.cost.salvage;
    campaign.cargo.ore -= v.cost.ore;
    const site = {id: (campaign.serial = (campaign.serial || 0) + 1), world: campaign.world, kind, x: point.x, y: point.y, hp: v.hp, built: 0, store: 0, clock: 0, aim: 0, cooldown: 0};
    campaign.structures.push(site);
    builder_drone = {x: player.x, y: player.y, angle: 0, site: site.id, state: 'out'};
    build_placing = null;
    show_toast('BUILDER DRONE OUT', `${v.title.toUpperCase()} · ${structure_build_time} s TO ASSEMBLE`, 2.5);
    save_checkpoint();
    return true;
}

function structures_update(dt)
{
    if (arcade.active || !player) {
        return;
    }
    // a structure that was being assembled when the game was saved: the builder goes back to it
    const unfinished = !builder_drone && campaign.builder && structures_here().find(v => v.built < 1);
    if (unfinished) {
        builder_drone = {x: player.x, y: player.y, angle: 0, site: unfinished.id, state: 'out'};
    }
    builder_update(dt);
    for (const v of structures_here()) {
        if (v.built < 1) {
            continue;
        }
        if (v.kind === 'outpost') {
            outpost_update(v, dt);
        }
        else {
            platform_update(v, dt);
        }
        structure_damage(v, dt);
    }
    const lost = structures_here().filter(v => v.hp <= 0);
    for (const v of lost) {
        explode(v.x, v.y, 70, gold);
        show_toast(`${structure_kinds[v.kind].title.toUpperCase()} LOST`, 'RAIDERS TORE IT DOWN · BUILD ANOTHER WITH K', 3);
    }
    if (lost.length) {
        campaign.structures = campaign.structures.filter(v => v.hp > 0);
        save_checkpoint();
    }
    structure_raids(dt);
}

// The builder drone flies to its site, assembles it, and flies home
function builder_update(dt)
{
    const d = builder_drone;
    if (!d) {
        return;
    }
    const site = campaign.structures.find(v => v.id === d.site);
    const target = ((d.state === 'out') && site) ? site : player;
    const dx = target.x - d.x;
    const dy = target.y - d.y;
    const left = Math.hypot(dx, dy);
    d.angle = Math.atan2(dy, dx);
    if ((d.state === 'out') && site && (left < 40)) {
        d.state = 'building';
    }
    if (d.state === 'building') {
        d.angle += dt*3;
        d.x = site.x + Math.cos(clock*2)*46;
        d.y = site.y + Math.sin(clock*2)*46;
        site.built = Math.min(1, site.built + dt/structure_build_time);
        if (Math.random() < dt*12) {
            explode(site.x + rand(-20, 20), site.y + rand(-20, 20), 5, gold, 0, 'muzzle');
        }
        if (site.built >= 1) {
            d.state = 'home';
            show_toast(`${structure_kinds[site.kind].title.toUpperCase()} BUILT`, (site.kind === 'outpost') ? 'IT MINES ON ITS OWN · FLY BY TO COLLECT' : 'IT GUARDS THIS SPOT', 3);
            save_checkpoint();
        }
        return;
    }
    if (!site && (d.state !== 'home')) {
        d.state = 'home';
    }
    const step = Math.min(left, 420*dt);
    if (left > 0) {
        d.x += (dx/left)*step;
        d.y += (dy/left)*step;
    }
    if ((d.state === 'home') && (left < 24)) {
        builder_drone = null;
    }
}

// An outpost keeps two mining drones. Each flies to a rock of its field within reach, cuts it a chunk at a time and
// brings the units home to the store; a full store keeps them docked until it is emptied. Flying within 220 m moves
// the store into your hold, and a transport line (transports.js) collects it too.
function outpost_update(site, dt)
{
    if (!Array.isArray(site.crew)) {
        site.crew = [0, 1].map(() => ({x: site.x, y: site.y, angle: 0, state: 'docked', rock: null, load: {}, count: 0}));
    }
    const rocks = ore_nodes.filter(v => (v.hp > 0) && (distance(v, site) < outpost_reach));
    site.idle = !rocks.length;
    for (const drone of site.crew) {
        outpost_drone(site, drone, rocks, dt);
    }
    if (site.store && (distance(player, site) < 220) && (cargo_count() < cargo_capacity())) {
        let room = cargo_capacity() - cargo_count();
        for (const [key, amount] of Object.entries(site.loads || {})) {
            const n = Math.min(room, amount);
            if (n > 0) {
                ore_load({resource: (key === 'ore') ? null : key, amount: n, x: site.x, y: site.y - 40});
                site.loads[key] -= n;
                site.store -= n;
                room -= n;
            }
        }
        sfx('pickup');
        save_checkpoint();
    }
}

// One outpost drone: docked, out to a rock, cutting it, or home with its load
function outpost_drone(site, drone, rocks, dt)
{
    const room = site.store + drone.count < outpost_store;
    let rock = ore_nodes.find(v => (v.id === drone.rock) && (v.hp > 0)) || null;
    if (['out', 'cut'].includes(drone.state) && !rock) {
        rock = outpost_pick_rock(drone, rocks);
        drone.state = (rock && room) ? 'out' : 'home';
    }
    if (drone.state === 'docked') {
        drone.x = site.x;
        drone.y = site.y;
        rock = room && outpost_pick_rock(drone, rocks);
        if (rock) {
            drone.state = 'out';
        }
        return;
    }
    if (drone.state === 'home') {
        if (drone_fly(drone, site, dt, 200) > 6) {
            return;
        }
        site.loads = site.loads || {};
        for (const [key, n] of Object.entries(drone.load)) {
            site.loads[key] = (site.loads[key] || 0) + n;
            site.store += n;
        }
        if (drone.count) {
            save_checkpoint();
        }
        drone.load = {};
        drone.count = 0;
        drone.rock = null;
        drone.state = 'docked';
        return;
    }
    if (drone.state === 'out') {
        // to the near side of the rock
        const d = Math.max(1, distance(drone, rock));
        const at = {x: rock.x + ((drone.x - rock.x)/d)*(rock.r + 14), y: rock.y + ((drone.y - rock.y)/d)*(rock.r + 14)};
        if (drone_fly(drone, at, dt, 200) < 4) {
            drone.state = 'cut';
        }
        return;
    }
    drone.angle = Math.atan2(rock.y - drone.y, rock.x - drone.x);
    rock.cutter = true;
    const got = ore_chip(rock, outpost_cut*dt);
    rock.cutter = null;
    if (got) {
        const key = rock.resource || 'ore';
        drone.load[key] = (drone.load[key] || 0) + got;
        drone.count += got;
    }
    if ((drone.count >= outpost_carry) || (rock.hp <= 0) || (site.store + drone.count >= outpost_store)) {
        drone.state = 'home';
    }
}

// The rock nearest the drone among those in reach, now its target; null when there is none
function outpost_pick_rock(drone, rocks)
{
    const rock = rocks.slice().sort((a, b) => distance(a, drone) - distance(b, drone))[0];
    drone.rock = rock ? (rock.id = rock.id || `${rock.x}:${rock.y}`) : null;
    return rock || null;
}

// A platform turns to the nearest raider within range and fires heavy plasma at it
function platform_update(site, dt)
{
    site.cooldown -= dt;
    const target = enemies.filter(v => (v.hp > 0) && (distance(v, site) < platform_range)).sort((a, b) => distance(a, site) - distance(b, site))[0];
    if (!target) {
        return;
    }
    const want = Math.atan2(target.y - site.y, target.x - site.x);
    site.aim += clamp(Math.atan2(Math.sin(want - site.aim), Math.cos(want - site.aim)), -dt*4, dt*4);
    if (site.cooldown <= 0) {
        site.cooldown = 0.55;
        for (const side of [-1, 1]) {
            const x = site.x + Math.cos(site.aim)*16 - Math.sin(site.aim)*side*4;
            const y = site.y + Math.sin(site.aim)*16 + Math.cos(site.aim)*side*4;
            bullets.push({x, y, vx: Math.cos(site.aim)*1300, vy: Math.sin(site.aim)*1300, life: platform_range/1300, damage: 14, r: 3, weapon: 'plasma', color: gold, width: 2.5});
        }
        explode(site.x + Math.cos(site.aim)*16, site.y + Math.sin(site.aim)*16, 5, gold, 0, 'muzzle');
    }
}

function structure_damage(site, dt)
{
    for (const b of hostile) {
        if ((b.life > 0) && (distance(b, site) < b.r + structure_kinds[site.kind].size*0.4)) {
            site.hp -= b.damage || 13;
            b.life = 0;
        }
    }
    for (const e of enemies) {
        if ((e.hp > 0) && (distance(e, site) < e.r + structure_kinds[site.kind].size*0.4)) {
            site.hp -= 25*dt;
        }
    }
}

// Every couple of minutes in a world with structures, a raid goes for one of them
function structure_raids(dt)
{
    const here = structures_here().filter(v => v.built >= 1);
    if (!here.length) {
        return;
    }
    structure_raid_clock -= dt;
    if ((structure_raid_clock > 0) || (enemies.length > 14)) {
        return;
    }
    structure_raid_clock = rand(100, 150);
    const v = here[Math.floor(rand(0, here.length))];
    for (let i = 0; i < 3; ++i) {
        const enemy = spawn_enemy((i === 2) ? 'shooter' : 'chaser');
        const a = rand(0, Math.PI*2);
        enemy.x = clamp(v.x + Math.cos(a)*600, 50, world.w - 50);
        enemy.y = clamp(v.y + Math.sin(a)*600, 50, world.h - 50);
        enemy.structure_target = v.id;
    }
    show_toast(`RAID ON YOUR ${structure_kinds[v.kind].title.toUpperCase()}`, `${Math.round(distance(player, v))} m AWAY · DEFEND IT`, 3);
}

// The structure (or the transport) a raider was sent for, while it stands
function structure_prey(enemy)
{
    if (!enemy.structure_target) {
        return null;
    }
    if (enemy.structure_target === 'transport') {
        return transport_prey();
    }
    return structures_here().find(v => v.id === enemy.structure_target) || null;
}

function render_structures()
{
    for (const v of structures_here()) {
        if (!in_view(v, 160)) {
            continue;
        }
        const k = structure_kinds[v.kind];
        ctx.save();
        ctx.globalAlpha = 0.35 + v.built*0.65;
        // The designer's outpost turns its drill ring while its drones are out; the platform carries the heavy turret
        const working = (v.kind === 'outpost') && outpost_busy(v);
        const drawn = sprite_draw_box(`structures/${(v.kind === 'outpost') ? 'mining-outpost' : 'defence-platform'}`, null, k.size*1.1, v.x, v.y, 0, ctx.globalAlpha, working ? clock*1.2 : 0);
        if (!drawn) {
            polygon(v.x, v.y, k.size*0.42, (v.kind === 'outpost') ? 6 : 8, 0, gold, '#2b2210');
        }
        if (v.kind === 'outpost') {
            render_outpost_crew(v);
        }
        if (v.kind === 'platform') {
            ctx.save();
            ctx.translate(v.x, v.y);
            ctx.rotate(v.aim);
            turret_draw(ctx, {id: 'heavy', color: gold}, 34, 0);
            ctx.restore();
        }
        ctx.restore();
        const outpost_text = v.idle ? `field empty · ${v.store}/${outpost_store}` : (v.store >= outpost_store) ? `full ${v.store}/${outpost_store} · awaiting pickup` : `mining · ${v.store}/${outpost_store}`;
        const title = (v.kind === 'outpost') ? 'OUTPOST' : 'DEFENSE PLATFORM';
        world_label(v.x, v.y + k.size*0.75 + 2, title, (v.built < 1) ? `building ${Math.round(v.built*100)}%` : (v.kind === 'outpost') ? outpost_text : '', gold);
        ctx.save();
        ctx.fillStyle = '#0b1222';
        ctx.fillRect(v.x - 30, v.y - k.size*0.75 - 12, 60, 4);
        ctx.fillStyle = (v.hp < k.hp*0.35) ? pink : gold;
        ctx.fillRect(v.x - 30, v.y - k.size*0.75 - 12, (60*Math.max(0, v.hp))/k.hp, 4);
        ctx.restore();
    }
    render_builder();
}

// Whether any of an outpost's drones is out of its dock
function outpost_busy(site)
{
    return (site.crew || []).some(v => v.state !== 'docked');
}

// An outpost's drones out of their dock, each with its beam on the rock it cuts: gold, the structures' colour, so they
// are told apart from your ship's cyan drones, with a dot of the ore they carry
function render_outpost_crew(site)
{
    for (const drone of site.crew || []) {
        if (drone.state === 'docked') {
            continue;
        }
        const rock = (drone.state === 'cut') && ore_nodes.find(v => (v.id === drone.rock) && (v.hp > 0));
        if (rock) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = color_with_alpha(ore_color(rock), 0.5 + 0.4*Math.sin(clock*40));
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(drone.x, drone.y);
            ctx.lineTo(rock.x, rock.y);
            ctx.stroke();
            ctx.restore();
        }
        const key = Object.keys(drone.load).find(v => drone.load[v] > 0);
        const color = key ? ore_color({resource: (key === 'ore') ? null : key}) : null;
        if ((view_mode === 'wireframe') || !sprite_draw('drone-mining', gold, 18, drone.x, drone.y, drone.angle)) {
            polygon(drone.x, drone.y, 7, 4, drone.angle, gold, '#2b2210');
        }
        drone_load_dot(drone.x, drone.y, color);
    }
}

// The builder drone in gold, and the ghost of a structure being placed
function render_builder()
{
    const d = builder_drone;
    if (d && !sprite_draw('drones/builder-drone', gold, 26, d.x, d.y, d.angle)) {
        polygon(d.x, d.y, 10, 4, d.angle, gold, '#2b2210');
    }
    if (build_placing && pointer.active) {
        const k = structure_kinds[build_placing.kind];
        const ok = structure_spot_ok(build_placing.kind, pointer);
        ctx.save();
        ctx.strokeStyle = ok ? '#9dff9b' : '#ff4d5e';
        ctx.fillStyle = ok ? '#9dff9b22' : '#ff4d5e22';
        ctx.lineWidth = 2/zoom;
        ctx.setLineDash([6/zoom, 6/zoom]);
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, k.size*0.6, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        if (build_placing.kind === 'platform') {
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.arc(pointer.x, pointer.y, platform_range, 0, Math.PI*2);
            ctx.stroke();
        }
        ctx.restore();
    }
}

// Leaving the world or starting over: placing stops, and a structure still being assembled is taken down and paid back
function structures_leave()
{
    build_placing = null;
    set_hidden(document.getElementById('build_overlay'), true);
    if (builder_drone) {
        const site = campaign.structures?.find(v => v.id === builder_drone.site);
        if (site && (site.built < 1)) {
            salvage += structure_kinds[site.kind].cost.salvage;
            campaign.cargo.ore = (campaign.cargo.ore || 0) + structure_kinds[site.kind].cost.ore;
            campaign.structures = campaign.structures.filter(v => v !== site);
        }
        builder_drone = null;
    }
}

// The station's depot sells the builder drone, once
function render_builder_shop_card()
{
    if (arcade.active || !['all', 'helpers'].includes(shop_filter)) {
        return;
    }
    const card = document.createElement('div');
    card.className = 'shop-item';
    card.innerHTML = `<b>⚒ &nbsp;Builder drone</b><span class="item-level">${campaign.builder ? 'IN BAY' : 'NOT OWNED'}</span><p>Builds mining outposts and defence platforms where you place them. K opens the build menu in flight.</p>`;
    const b = document.createElement('button');
    b.disabled = !!campaign.builder || (salvage < builder_price);
    b.textContent = campaign.builder ? 'OWNED' : `BUY · ◆ ${builder_price}`;
    b.addEventListener('click', buy_builder);
    card.append(b);
    el.shop_grid.prepend(card);
}

// Docked: the builder drone bought, once
function buy_builder()
{
    if ((state !== 'upgrade') || campaign.builder || (salvage < builder_price)) {
        return;
    }
    salvage -= builder_price;
    campaign.builder = true;
    sfx('upgrade');
    dock_message = 'Builder drone added. Press K in flight to build.';
    refresh_station_tab();
    save_checkpoint('dock');
}
