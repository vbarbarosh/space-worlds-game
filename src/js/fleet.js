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
        size: 'light',
        name: 'Pulse cannon',
        rank: 0,
        opens: 0,
        price: 0,
        rating: 0,
        damage: 14,
        interval: 0.19,
        speed: 1100,
        life: 1.17,
        color: cyan,
        description: 'Balanced rapid-fire plasma. Prism and guided-plasma modules modify its shots.',
        line: 'Fast, balanced plasma bolts.',
    },
    {
        id: 'scatter',
        size: 'light',
        name: 'Shard shotgun',
        rank: 1,
        opens: 0,
        price: 220,
        rating: 2,
        damage: 13,
        interval: 0.5,
        speed: 950,
        life: 0.51,
        color: gold,
        description: 'Five close-range pellets. Strong against swarms, limited against distant armor.',
        line: 'Five pellets. Strong up close.',
    },
    {
        id: 'ion',
        size: 'medium',
        name: 'Ion disruptor',
        rank: 2,
        opens: 1,
        price: 550,
        rating: 4,
        damage: 24,
        interval: 0.3,
        speed: 1150,
        life: 1,
        color: blue,
        description: 'Triple shield damage; disables shield regeneration and slows ships for three seconds.',
        line: 'Breaks shields and slows ships.',
    },
    {
        id: 'rail',
        size: 'heavy',
        name: 'Lance railgun',
        rank: 3,
        opens: 3,
        price: 1100,
        rating: 6,
        damage: 75,
        interval: 0.65,
        speed: 2600,
        life: 0.69,
        color: '#f5f0ff',
        description: 'Long-range high-velocity slugs bypass 75% of hull plating. Slow, precise shots.',
        line: 'Slow slugs that pierce armour.',
    },
    {
        id: 'missile',
        size: 'medium',
        name: 'Seeker launcher',
        rank: 3,
        opens: 3,
        price: 1400,
        rating: 6,
        damage: 60,
        interval: 0.9,
        speed: 760,
        life: 2.4,
        missile: true,
        color: '#ff9a68',
        description: 'Homing missiles: launched slow, they speed up, turn toward a locked raider and burst across 100 m. A nimble target can make one overshoot. Seeker head, rocket motor and warhead modules tune them.',
        line: 'Homing missiles with splash.',
        tags: 'missile rocket homing ракета',
    },
    {
        id: 'beam',
        size: 'medium',
        name: 'Flux beam',
        rank: 4,
        opens: 4,
        price: 2600,
        rating: 9,
        damage: 19,
        interval: 0.105,
        speed: 3000,
        life: 0.34,
        color: '#a6ffcb',
        description: 'Rapid energy lances ignore 40% of armor but consume pulse energy. Below 8 pulse, a plasma backup fires.',
        line: 'A beam that ignores 40% armour.',
    },
];
// A gun goes on sale in the world its `opens` names (src/js/tech.js): the cannon and the shotgun in Haven, the ion gun in
// Verdant, the railgun and the Seeker in Ion Reach, before Obsidian's armour asks for one of them, the beam in Obsidian.
// Licences follow the story (docs/balance.md): Vanguard (the gunship, the rail and the Seeker) with chapter 4, before
// Obsidian's armour; Ace (the beam) with chapter 6; Commander (the cruiser) as act I ends; Admiral and Legend in act II
const rank_thresholds = [0, 120, 420, 1100, 2400, 4200, 7000, 10500];
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

// How far the guns reach, the farthest of them
function gun_reach()
{
    return Math.max(0, ...mounted_weapons().filter(Boolean).map(weapon_reach));
}

// A gun's range: how far its shot flies; a missile's, how far its seeker locks
function weapon_range(v)
{
    return v.missile ? missile_stats().lock : v.speed*v.life;
}

// How far a gun fires: its range, a gun's at most a screen's width
function weapon_reach(v)
{
    return v.missile ? weapon_range(v) : Math.min(900, weapon_range(v));
}

// The main gun: the arcade's one gun; in the campaign the biggest, then strongest, on your mounts
function current_weapon()
{
    if (arcade.active) {
        const f = ensure_career();
        return weapon_catalog.find(v => v.id === f.weapon_id) || weapon_catalog[0];
    }
    return mounted_weapons().filter(Boolean).sort((a, b) => (gun_sizes.indexOf(b.size) - gun_sizes.indexOf(a.size)) || (b.rating - a.rating))[0];
}

// Your guns in words: Pulse cannon ×2 + Lance railgun
function guns_text()
{
    const counts = new Map();
    for (const v of mounted_weapons().filter(Boolean)) {
        counts.set(v.name, (counts.get(v.name) || 0) + 1);
    }
    const parts = [];
    for (const [name, n] of counts) {
        parts.push((n > 1) ? `${name} ×${n}` : name);
    }
    return parts.join(' + ');
}

// the ship's hull, and an arcade card's factor (arcade_cards.js)
function hull_max()
{
    const hull = current_ship().hull;
    return (arcade_card_k.hull === 1) ? hull : Math.round(hull*arcade_card_k.hull);
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
    // one you own stays yours to fly or fit; a new one waits for its rank and its world
    if (!v || (!owned.includes(id) && ((pilot_rank() < v.rank) || !tech_open(v.opens)))) {
        return;
    }
    if ((kind === 'ship') && (cargo_count() > v.cargo)) {
        show_toast('CARGO TOO LARGE', `SELL CARGO BEFORE SWITCHING TO ${v.name.toUpperCase()}`, 3);
        return;
    }
    if (!owned.includes(id)) {
        if (salvage < v.price) {
            return;
        }
        salvage -= v.price;
        play_log_spend((kind === 'ship') ? 'ship' : 'gun', id, v.price);
        owned.push(id);
        if (kind !== 'ship') {
            f.weapon_levels[id] = 1;
            if (!arcade.active && !gun_fits_ship(v)) {
                show_toast('NO MOUNT FITS IT YET', `${v.size.toUpperCase()} GUN · ${ships_for_gun_text(v)}`, 4);
            }
            else if (!arcade.active && !mount_gun_anywhere(id, true)) {
                show_toast('BOUGHT · SPARE', 'YOUR MOUNTS CARRY BETTER GUNS · PICK IT ON A MOUNT TO FIT IT', 4);
            }
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
    player.gun_cd = [];
    save_checkpoint();
    render_station();
    sfx('upgrade');
}

// A gun's next tier in the campaign: (130 + 22% of its price) × the tier you have × 1.5, so taking one gun to tier 5
// costs about as much as act I pays (the Seeker 6570, the beam 10530) and the salvage of act II still buys something
const gun_tier_price_scale = 1.5;

function gun_tier_cost(v, level)
{
    return Math.round((130 + v.price*0.22)*level*gun_tier_price_scale);
}

function upgrade_weapon(id)
{
    const f = ensure_career();
    const level = f.weapon_levels[id] || 1;
    const v = weapon_catalog.find(v => v.id === id);
    const cost = gun_tier_cost(v, level);
    if ((state !== 'upgrade') || !f.weapons.includes(id) || (level >= 5) || (salvage < cost)) {
        return;
    }
    salvage -= cost;
    play_log_spend('gun tier', id, cost, {tier: level + 1});
    f.weapon_levels[id] = level + 1;
    save_checkpoint();
    render_station();
    sfx('upgrade');
}

// One volley: the arcade's gun from the turrets in turn (mount null), or the gun on one mount
function fire_equipped_weapon(mount = null)
{
    let v = (mount === null) ? current_weapon() : mounted_weapons()[mount];
    if ((v.id === 'beam') && (player.energy < 8)) {
        v = weapon_catalog[0];
    }
    const f = ensure_career();
    const tier = f.weapon_levels[v.id] || 1;
    const damage = v.damage*(1 + upgrades.damage*hotter_plasma_share)*(1 + (tier - 1)*0.22)*current_ship().damage*arcade_card_k.damage;
    const count = gun_shot_count(v);
    player.barrels = player.barrels || [];
    const slot = mount ?? 0;
    player.barrels[slot] = (player.barrels[slot] || 0) + 1;
    for (let i = 0, end = count; i < end; ++i) {
        const a = (player.turret_angle ?? player.angle) + (i - (count - 1)/2)*((v.id === 'scatter') ? 0.12 : 0.11);
        const muzzle = (mount === null) ? turret_muzzle((player.barrels[slot] + i) % 2, a) : mount_muzzle(mount, player.barrels[slot] + i, a, v);
        // The ship's speed along the shot, when it flies that way, rides on top: a shot always outruns a chasing ship,
        // and still flies straight
        const carry = Math.max(0, player.vx*Math.cos(a) + player.vy*Math.sin(a));
        const shot = v.missile ? missile_new(muzzle, a, player.barrels[slot] + i, damage, v, carry) : {
            x: muzzle.x,
            y: muzzle.y,
            // where it left, so its tail is never drawn back into the turret
            ox: muzzle.x,
            oy: muzzle.y,
            vx: Math.cos(a)*(v.speed + carry),
            vy: Math.sin(a)*(v.speed + carry),
            life: v.life,
            damage,
            r: (v.id === 'beam') ? 5 : 3,
            weapon: v.id,
            color: v.color,
            homing: ['plasma', 'ion'].includes(v.id) && (upgrades.homing > 0),
            width: muzzle.bore,
            pierce: (v.id === 'rail') ? upgrades.spread : 0,
            tier,
        };
        bullets.push(shot);
        if ((v.id === 'rail') || (v.id === 'beam')) {
            shot_trace_add(shot, (v.id === 'rail') ? 0.3 : 0.14);
        }
        // one flash a muzzle a volley: a shotgun's five pellets leave two turrets
        if (i < 2) {
            explode_muzzle(muzzle.x, muzzle.y, a, (muzzle.bore ? Math.max(3, muzzle.bore*3) : 9)*(muzzle_flash_sizes[v.id] || 1), v.color);
        }
    }
    if (v.id === 'beam') {
        player.energy = Math.max(0, player.energy - 1.8*count);
    }
    player.shoot_cd = Math.max(0.065, v.interval*(1 - upgrades.rate*0.12)*arcade_card_k.rate);
    if (mount !== null) {
        player.gun_cd = player.gun_cd || [];
        player.gun_cd[mount] = player.shoot_cd;
        // when it fired, for the turret's kick back (render_ship_turrets)
        player.gun_fired = player.gun_fired || [];
        player.gun_fired[mount] = clock;
    }
    sfx((v.id === 'plasma') ? 'shot' : v.missile ? 'missile' : `enemy_${v.id}`);
}

// A gun's muzzle flash against the cannon's: the slug's the largest, a lance's the smallest, fired ten times a second
const muzzle_flash_sizes = {scatter: 1.3, ion: 1.1, rail: 1.8, missile: 1.2, beam: 0.75};

// Hotter plasma: each level adds this share of the gun's own damage to every shot, so it lifts a slug as much as a
// bolt (14 + 36% is the old +5 on the cannon)
const hotter_plasma_share = 0.36;

// Prism gives each gun more per shot: two more bolts to the cannon and the ion gun, two more pellets to the shotgun,
// a missile more to the Seeker's salvo, a lance more to the beam; the rail's slug pierces a raider more instead
function gun_shot_count(v)
{
    if (v.id === 'scatter') {
        return 5 + upgrades.spread*2;
    }
    if (['plasma', 'ion'].includes(v.id)) {
        return 1 + upgrades.spread*2;
    }
    if (['missile', 'beam'].includes(v.id)) {
        return 1 + upgrades.spread;
    }
    return 1;
}

function hit_with_weapon(enemy, b)
{
    if (enemy.hp <= 0) {
        return;
    }
    const armor = enemy.armor || 0;
    if (b.weapon === 'ion') {
        const shield_before = enemy.shield || 0;
        const shield_damage = Math.min(enemy.shield || 0, b.damage*3);
        enemy.shield = Math.max(0, (enemy.shield || 0) - shield_damage);
        shield_hit_show(enemy, shield_before);
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
}
