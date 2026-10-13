// Wave events: wave 2 of each arcade world draws one event from that world's pool, says it in a toast and marks it on
// the map; it ends with the wave. An ion storm takes your shield, a convoy's freighter runs past with salvage, a
// fleeing ace jumps away unless you catch it, dust blinds the minimap, a heat surge bursts vents along a line.
const arcade_event_kinds = {
    ion_storm: {title: 'ION STORM', line: 'Shields down for the wave'},
    convoy: {title: 'CONVOY', line: 'A freighter of salvage runs past: catch it'},
    ace: {title: 'FLEEING ACE', line: 'An elite jumps away in 20 s: catch it'},
    dust_blind: {title: 'DUST BLIND', line: 'The minimap is out for the wave'},
    heat_surge: {title: 'HEAT SURGE', line: 'Vents burst along a line: keep off it'},
};
// Each world's pool, Haven to Eclipse: the ion storm where the middle worlds lean on your shield, the heat surge in the
// fire worlds, the dust where it blows
const arcade_event_pools = [
    ['convoy', 'ace'],
    ['convoy', 'dust_blind'],
    ['dust_blind', 'convoy'],
    ['ion_storm', 'ace'],
    ['ion_storm', 'dust_blind'],
    ['ion_storm', 'convoy'],
    ['heat_surge', 'ace'],
    ['heat_surge', 'ace'],
];
// how long an ace stays before it jumps away, and what a freighter and an ace carry: artifacts and their value (2 more
// a world past Haven)
const arcade_ace_time = 20;
const arcade_event_loot = {convoy: [6, 8], ace: [4, 10]};
// a heat surge: vents along a line 1400 m long through your way, a warning, then a burst
const arcade_vent_count = 8;
const arcade_vent_reach = 80;
const arcade_vent_warn = 1.4;
const arcade_vent_burst = 0.5;
const arcade_vent_damage = 22;

function arcade_event_start()
{
    arcade_event_end();
    const pool = arcade_event_pools[campaign.world] || arcade_event_pools[0];
    const kind = pool[Math.floor(Math.random()*pool.length)];
    arcade.event = {kind, time: 0, target: null, vents: [], vent_timer: 2};
    show_toast(arcade_event_kinds[kind].title, arcade_event_kinds[kind].line, 4, 'danger');
    if (kind === 'convoy') {
        arcade_event_convoy();
    }
    else if (kind === 'ace') {
        arcade_event_ace();
    }
}

function arcade_event_end()
{
    arcade.event = null;
}

// A freighter: a tank's hull ×4, unarmed, on a 2 km run past you at a crawl, about 30 s, ignoring you
function arcade_event_convoy()
{
    const a = Math.random()*Math.PI*2;
    const side = rand(-400, 400);
    const x = player.x - Math.sin(a)*side;
    const y = player.y + Math.cos(a)*side;
    const enemy = spawn_enemy('tank');
    enemy.x = clamp(x - Math.cos(a)*1000, 120, world.w - 120);
    enemy.y = clamp(y - Math.sin(a)*1000, 120, world.h - 120);
    enemy.hp = enemy.max_hp = enemy.hp*4;
    enemy.r = Math.round(enemy.r*1.5);
    enemy.speed = 70;
    enemy.unarmed = true;
    enemy.event_kind = 'convoy';
    enemy.event_goal = {x: clamp(x + Math.cos(a)*1000, 120, world.w - 120), y: clamp(y + Math.sin(a)*1000, 120, world.h - 120)};
    arcade.event.target = enemy;
}

// An elite of the world's mix, faster, 700 m away; it jumps away when its time is up
function arcade_event_ace()
{
    const angle = Math.random()*Math.PI*2;
    const enemy = spawn_enemy((campaign.world >= 1) ? 'shooter' : 'chaser');
    enemy.x = clamp(player.x + Math.cos(angle)*700, 60, world.w - 60);
    enemy.y = clamp(player.y + Math.sin(angle)*700, 60, world.h - 60);
    arcade_elite_make(enemy);
    enemy.speed *= 1.3;
    enemy.event_kind = 'ace';
    arcade.event.target = enemy;
    explode(enemy.x, enemy.y, 30, '#a8e4ff', 0, 'warp');
}

// Called from arcade_update: the event's clock, the storm on your shield, the freighter's way, the ace's jump, the vents
function arcade_event_update(dt)
{
    const e = arcade.event;
    if (!e) {
        return;
    }
    e.time += dt;
    if (e.kind === 'ion_storm') {
        player.shield = 0;
    }
    const target = e.target;
    if (target && (target.hp > 0)) {
        if ((e.kind === 'ace') && (e.time > arcade_ace_time)) {
            explode(target.x, target.y, 34, '#a8e4ff', 0, 'warp');
            arcade_event_remove(target);
            show_toast('ACE ESCAPED', 'It jumped away with its salvage', 2.5);
        }
        else if ((e.kind === 'convoy') && (distance(target, target.event_goal) < 80)) {
            explode(target.x, target.y, 40, '#a8e4ff', 0, 'warp');
            arcade_event_remove(target);
            show_toast('CONVOY ESCAPED', 'The freighter left the map', 2.5);
        }
    }
    if (e.kind === 'heat_surge') {
        arcade_vents_update(e, dt);
    }
}

// A raider gone without a kill: no score, no salvage, no blast
function arcade_event_remove(enemy)
{
    const i = enemies.indexOf(enemy);
    if (i >= 0) {
        enemies.splice(i, 1);
    }
    arcade.event.target = null;
}

// The freighter keeps to its way, whatever the others do (update, after its type has chosen)
function arcade_event_steer(v)
{
    v.angle = Math.atan2(v.event_goal.y - v.y, v.event_goal.x - v.x);
    return 1;
}

// Called on a kill: a freighter or an ace spills its salvage
function arcade_event_kill(enemy)
{
    const loot = arcade_event_loot[enemy.event_kind];
    if (!loot) {
        return;
    }
    for (let i = 0; i < loot[0]; ++i) {
        drop_pickup(enemy.x + rand(-60, 60), enemy.y + rand(-60, 60), 'artifact', loot[1] + campaign.world*2);
    }
    show_toast((enemy.event_kind === 'ace') ? 'ACE DOWN' : 'CONVOY TAKEN', 'Its salvage is yours', 2.5, 'income');
    if (arcade.event) {
        arcade.event.target = null;
    }
}

// A heat surge: every few seconds a new line of vents across your way, a warning ring, then a burst that hurts within
// its reach
function arcade_vents_update(e, dt)
{
    e.vent_timer -= dt;
    if (e.vent_timer <= 0) {
        const a = player.angle + Math.PI/2 + rand(-0.4, 0.4);
        const ahead = 260;
        const cx = player.x + Math.cos(player.angle)*ahead;
        const cy = player.y + Math.sin(player.angle)*ahead;
        e.vents = [];
        for (let i = 0; i < arcade_vent_count; ++i) {
            const k = (i/(arcade_vent_count - 1) - 0.5)*1400;
            e.vents.push({x: clamp(cx + Math.cos(a)*k, 40, world.w - 40), y: clamp(cy + Math.sin(a)*k, 40, world.h - 40), time: -i*0.06, hit: false});
        }
        e.vent_timer = 6;
    }
    for (const v of e.vents) {
        const before = v.time;
        v.time += dt;
        if ((before < 0) && (v.time >= 0)) {
            ring(v.x, v.y, '#ff8a3d', arcade_vent_reach, arcade_vent_warn);
        }
        if ((before < arcade_vent_warn) && (v.time >= arcade_vent_warn)) {
            explode(v.x, v.y, arcade_vent_reach*0.7, '#ff8a3d');
        }
        if (!v.hit && (v.time >= arcade_vent_warn) && (v.time < arcade_vent_warn + arcade_vent_burst) && (distance(v, player) < arcade_vent_reach + player.r)) {
            v.hit = true;
            damage_player(arcade_vent_damage, false, 'vent');
        }
    }
}

// Whether dust blinds the minimap now
function arcade_event_blind()
{
    return arcade.active && !!arcade.event && (arcade.event.kind === 'dust_blind');
}

// The event's marks for the map: the freighter and its way out, the ace, the vents about to burst
function arcade_event_marks(add)
{
    const e = arcade.event;
    if (!e) {
        return;
    }
    const target = e.target;
    if (target && (target.hp > 0)) {
        if (e.kind === 'convoy') {
            add('danger', target, 'transport', '#ffd16e', 'CONVOY · SALVAGE', {angle: target.angle + Math.PI/2});
        }
        else {
            add('danger', target, 'objective', '#ffd16e', `ACE · ${Math.max(0, Math.ceil(arcade_ace_time - e.time))} S`);
        }
    }
    for (const v of e.vents) {
        if (v.time < arcade_vent_warn + arcade_vent_burst) {
            add('danger', v, 'storm', '#ff8a3d', 'HEAT VENT', {small: true});
        }
    }
}
