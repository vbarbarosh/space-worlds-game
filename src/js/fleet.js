// Fleet, weapon payloads and persistent multi-stage operations.
const ship_defs = [ship_scout, ship_courier, ship_interceptor, ship_miner, ship_gunship, ship_cruiser];
const ship_catalog = ship_defs.map(v => v.ship);
const hull_profiles = Object.fromEntries(ship_defs.map(v => [v.ship.id, v.hull_profile]));
for (const v of ship_catalog) {
    Object.assign(v, hull_profiles[v.id]);
}
const weapon_catalog = [
    {
        id: 'plasma',
        name: 'Pulse cannon',
        rank: 0,
        price: 0,
        rating: 0,
        damage: 14,
        interval: 0.19,
        speed: 760,
        life: 1.7,
        color: cyan,
        description: 'Balanced rapid-fire plasma. Prism and guided-plasma modules modify its shots.',
    },
    {
        id: 'scatter',
        name: 'Shard shotgun',
        rank: 1,
        price: 220,
        rating: 2,
        damage: 11,
        interval: 0.5,
        speed: 650,
        life: 0.75,
        color: gold,
        description: 'Five close-range pellets. Strong against swarms, limited against distant armor.',
    },
    {
        id: 'ion',
        name: 'Ion disruptor',
        rank: 2,
        price: 550,
        rating: 4,
        damage: 24,
        interval: 0.3,
        speed: 850,
        life: 1.35,
        color: blue,
        description: 'Triple shield damage; disables shield regeneration and slows ships for three seconds.',
    },
    {
        id: 'rail',
        name: 'Lance railgun',
        rank: 3,
        price: 1100,
        rating: 6,
        damage: 75,
        interval: 0.65,
        speed: 1800,
        life: 1,
        color: '#f5f0ff',
        description: 'Long-range high-velocity slugs bypass 75% of hull plating. Slow, precise shots.',
    },
    {
        id: 'missile',
        name: 'Seeker launcher',
        rank: 3,
        price: 1400,
        rating: 6,
        damage: 65,
        interval: 0.95,
        speed: 390,
        life: 4.5,
        color: '#ff9a68',
        description: 'Self-guided missiles explode across a 115 m radius. Good for grouped enemies.',
    },
    {
        id: 'beam',
        name: 'Flux beam',
        rank: 4,
        price: 2600,
        rating: 9,
        damage: 19,
        interval: 0.105,
        speed: 2400,
        life: 0.42,
        color: '#a6ffcb',
        description: 'Rapid energy lances ignore 40% of armor but consume pulse energy. Below 8 pulse, a plasma backup fires.',
    },
];
const rank_thresholds = [0, 120, 380, 800, 1450, 2500, 4000, 6000];
const rank_names = ['Cadet', 'Courier', 'Pathfinder', 'Vanguard', 'Ace', 'Commander', 'Admiral', 'Legend'];
function ensure_career()
{
    if (!campaign.fleet) {
        campaign.fleet = {ship_id: 'scout', ships: ['scout'], weapon_id: 'plasma', weapons: ['plasma'], weapon_levels: {plasma: 1}};
    }
    const f = campaign.fleet;
    f.ships = f.ships || ['scout'];
    f.weapons = f.weapons || ['plasma'];
    f.weapon_levels = f.weapon_levels || {plasma: 1};
    if (!ship_catalog.some(v => v.id === f.ship_id)) {
        f.ship_id = 'scout';
    }
    if (!weapon_catalog.some(v => v.id === f.weapon_id)) {
        f.weapon_id = 'plasma';
    }
    if (!Number.isFinite(campaign.xp)) {
        campaign.xp = (campaign.completed || 0)*70;
    }
    campaign.reputation = campaign.reputation || worlds.map(() => 0);
    campaign.expedition = campaign.expedition || 1;
    return f;
}

function pilot_rank()
{
    ensure_career();
    let out = 0;
    for (let i = 1, end = rank_thresholds.length; i < end; ++i) {
        if (campaign.xp >= rank_thresholds[i]) {
            out = i;
        }
    }
    return out;
}

function current_ship()
{
    const f = ensure_career();
    return ship_catalog.find(v => v.id === f.ship_id) || ship_catalog[0];
}

function current_weapon()
{
    const f = ensure_career();
    return weapon_catalog.find(v => v.id === f.weapon_id) || weapon_catalog[0];
}

function hull_max()
{
    return current_ship().hull;
}

function cargo_capacity()
{
    return current_ship().cargo;
}

function weapon_level()
{
    const f = ensure_career();
    return f.weapon_levels[f.weapon_id] || 1;
}

function fleet_purchase(id, kind)
{
    if (state !== 'upgrade') {
        return;
    }
    const f = ensure_career();
    const list = (kind === 'ship') ? ship_catalog : weapon_catalog;
    const v = list.find(v => v.id === id);
    const owned = (kind === 'ship') ? f.ships : f.weapons;
    if (!v || (pilot_rank() < v.rank)) {
        return;
    }
    if ((kind === 'ship') && (cargo_count() > v.cargo)) {
        show_toast('CARGO TOO LARGE', 'SELL CARGO BEFORE SWITCHING TO ' + v.name.toUpperCase(), 3);
        return;
    }
    if (!owned.includes(id)) {
        if (salvage < v.price) {
            return;
        }
        salvage -= v.price;
        owned.push(id);
        if (kind !== 'ship') {
            f.weapon_levels[id] = 1;
        }
    }
    if (kind === 'ship') {
        f.ship_id = id;
        player.turbo_fuel = turbo_duration();
        player.hp = hull_max();
        player.shield = shield_max();
        player.r = v.radius;
    }
    else {
        f.weapon_id = id;
    }
    save_checkpoint();
    render_station();
    sfx('upgrade');
}

function upgrade_weapon(id)
{
    const f = ensure_career();
    const level = f.weapon_levels[id] || 1;
    const v = weapon_catalog.find(v => v.id === id);
    const cost = Math.round((130 + v.price*0.22)*level);
    if ((state !== 'upgrade') || !f.weapons.includes(id) || (level >= 5) || (salvage < cost)) {
        return;
    }
    salvage -= cost;
    f.weapon_levels[id] = level + 1;
    save_checkpoint();
    render_station();
    sfx('upgrade');
}

function fire_equipped_weapon()
{
    let v = current_weapon();
    if ((v.id === 'beam') && (player.energy < 8)) {
        v = weapon_catalog[0];
    }
    const f = ensure_career();
    const tier = f.weapon_levels[v.id] || 1;
    const damage = (v.damage + upgrades.damage*5)*(1 + (tier - 1)*0.22)*current_ship().damage;
    const count = (v.id === 'scatter') ? 5 + upgrades.spread*2 : ['plasma', 'ion'].includes(v.id) ? 1 + upgrades.spread*2 : 1;
    player.weapon_barrel = (player.weapon_barrel || 0) + 1;
    for (let i = 0, end = count; i < end; ++i) {
        const a = (player.turret_angle ?? player.angle) + (i - (count - 1)/2)*((v.id === 'scatter') ? 0.12 : 0.11);
        const muzzle = turret_muzzle((player.weapon_barrel + i) % 2, a);
        bullets.push({
            x: muzzle.x,
            y: muzzle.y,
            vx: Math.cos(a)*v.speed,
            vy: Math.sin(a)*v.speed,
            life: v.life,
            damage,
            r: (v.id === 'missile') ? 7 : (v.id === 'beam') ? 5 : 3,
            weapon: v.id,
            color: v.color,
            homing: (v.id === 'missile') || (['plasma', 'ion'].includes(v.id) && (upgrades.homing > 0)),
            seeker: v.id === 'missile',
            splash: (v.id === 'missile') ? 115 : 0,
        });
    }
    if (v.id === 'beam') {
        player.energy = Math.max(0, player.energy - 1.8);
    }
    player.shoot_cd = Math.max(0.065, v.interval*(1 - upgrades.rate*0.12));
    sfx((v.id === 'plasma') ? 'shot' : 'enemy_' + v.id);
}

function blast_payload(b, direct)
{
    ring(b.x, b.y, b.color || gold, b.splash, 0.35);
    burst(b.x, b.y, b.color || gold, 22, 190);
    for (const enemy of enemies.slice()) {
        if ((enemy !== direct) && (enemy.hp > 0) && (distance(enemy, b) < b.splash)) {
            damage_enemy(enemy, b.damage*0.65);
        }
    }
}

function hit_with_weapon(enemy, b)
{
    if (enemy.hp <= 0) {
        return;
    }
    const armor = enemy.armor || 0;
    if (b.weapon === 'ion') {
        const shield_damage = Math.min(enemy.shield || 0, b.damage*3);
        enemy.shield = Math.max(0, (enemy.shield || 0) - shield_damage);
        enemy.since_hit = -3;
        if (!enemy.disrupted) {
            enemy.disrupted = {speed: enemy.speed, time: 0};
            enemy.speed *= 0.55;
        }
        enemy.disrupted.time = 3;
        damage_enemy(enemy, Math.max(0, b.damage - shield_damage/3));
    }
    else {
        if (b.weapon === 'rail') {
            enemy.armor = armor*0.25;
        }
        else if (b.weapon === 'beam') {
            enemy.armor = armor*0.6;
        }
        damage_enemy(enemy, b.damage);
        enemy.armor = armor;
    }
    if (b.splash) {
        blast_payload(b, enemy);
    }
}

function nearest_enemy(v, radius)
{
    let out = null;
    let near = radius;
    for (const enemy of enemies) {
        const d = distance(v, enemy);
        if ((enemy.hp > 0) && (d < near)) {
            out = enemy;
            near = d;
        }
    }
    return out;
}
