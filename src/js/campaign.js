function clone(v)
{
    return JSON.parse(JSON.stringify(v));
}

function attack_rating()
{
    return (
        upgrades.damage +
        upgrades.rate +
        upgrades.spread*3 +
        upgrades.drone*2 +
        upgrades.homing +
        guns_rating() +
        Math.round((current_ship().damage - 1)*5)
    );
}

function defense_rating()
{
    return upgrades.armor + upgrades.shield + Math.floor(current_ship().shield/35);
}

// A gate also asks for a gun that bites: one mounted gun that keeps a fifth of each hit through the world's armour
// (gun_armour_share). Without it every bolt of a light gun bounces off the raiders there, and a pilot let in dies over
// and over with nothing to show for it.
const gate_armour_share = 0.2;

function armour_rating(id, damage_level = upgrades.damage)
{
    const guns = mounted_weapons().filter(Boolean);
    return guns.length ? Math.max(...guns.map(v => gun_armour_share(v, id, damage_level))) : 0;
}

// A world's place in the order of threat, as its threat level (wave) gives it: Haven 0 to Eclipse 7. The raiders' tier,
// prices and rewards read it, never the world's place in the list
function world_tier(id)
{
    return (worlds[id].wave - 1)/2;
}

function allowed_world(id)
{
    return (
        (attack_rating() >= worlds[id].attack) &&
        (defense_rating() >= worlds[id].defense) &&
        (radiation_protection() + 0.001 >= expedition_conditions[id].required) &&
        (armour_rating(id) + 0.001 >= gate_armour_share)
    );
}

function cargo_count()
{
    return Object.values(campaign.cargo).reduce((a, b) => a + b, 0);
}

function valid_checkpoint(candidate)
{
    return (
        candidate &&
        (candidate.version === 4) &&
        candidate.campaign &&
        Number.isInteger(candidate.campaign.world) &&
        worlds[candidate.campaign.world] &&
        Number.isInteger(candidate.campaign.story) &&
        (candidate.campaign.story >= 0) &&
        (candidate.campaign.story <= story.length) &&
        Array.isArray(candidate.campaign.contracts) &&
        (candidate.campaign.contracts.length <= 3) &&
        candidate.campaign.contracts.every(function (v) {
            return (
                ['mining', 'hunt', 'courier', 'survey', 'boss', 'escort', 'trade', 'scan', 'recover', 'defend', 'elite', 'lure', 'race'].includes(v.type) &&
                worlds[v.world] &&
                Number.isFinite(v.progress) &&
                (v.target > 0) &&
                (v.reward > 0)
            );
        }) &&
        candidate.campaign.cargo &&
        Object.values(candidate.campaign.cargo).every(v => Number.isInteger(v) && (v >= 0)) &&
        (Object.values(candidate.campaign.cargo).reduce((a, b) => a + b, 0) <=
            (ship_catalog.find(v => v.id === candidate.campaign.fleet?.ship_id)?.cargo || 40)) &&
        (candidate.wave === worlds[candidate.campaign.world].wave) &&
        Number.isFinite(candidate.artifacts_count) &&
        Number.isFinite(candidate.run_time) &&
        Number.isFinite(candidate.salvage) &&
        (candidate.salvage >= 0) &&
        Number.isFinite(candidate.score) &&
        Number.isFinite(candidate.kills) &&
        (candidate.hp > 0) &&
        (candidate.hp <= (ship_catalog.find(v => v.id === candidate.campaign.fleet?.ship_id)?.hull || 100)) &&
        Number.isFinite(candidate.energy) &&
        ['chill', 'normal', 'overload'].includes(candidate.difficulty) &&
        upgrade_options.every(function (v) {
            return (
                Number.isInteger(candidate.upgrades?.[v.key] ?? initial_upgrades()[v.key]) &&
                ((candidate.upgrades?.[v.key] ?? initial_upgrades()[v.key]) >= ((v.key === 'magnet') ? 1 : 0)) &&
                ((candidate.upgrades?.[v.key] ?? initial_upgrades()[v.key]) <= v.cap)
            );
        }) &&
        supply_options.every(v => Number.isInteger(candidate.supplies?.[v.key]) && (candidate.supplies[v.key] >= 0) && (candidate.supplies[v.key] <= 8))
    );
}

function guide_base_reset_run(resume = false)
{
    loading_campaign = true;
    const saved = (resume && checkpoint) ? clone(checkpoint) : null;
    campaign = saved
        ? clone(saved.campaign)
        : {world: 0, story: 0, contracts: [], completed: 0, visited: [0], cargo: {ore: 0, cells: 0, relics: 0}, maps: {}, serial: 0, board: 0};
    cargo_normalize(campaign.cargo);
    drones = [];
    drones_out = false;
    jump = null;
    escort = null;
    waypoint = null;
    base_reset_run(!!saved);
    wave = worlds[campaign.world].wave;
    salvage = saved ? saved.salvage : 90;
    set_hidden(document.getElementById('navigation_overlay'), true);
    set_hidden(document.getElementById('nav_button'), false);
    set_hidden(document.getElementById('dock_button'), false);
    if (saved && saved.position) {
        const size = saved.position.size || {w: 9000 + wave*320, h: 7400 + wave*240};
        player.x = clamp((saved.position.x*world.w)/size.w, 30, world.w - 30);
        player.y = clamp((saved.position.y*world.h)/size.h, 30, world.h - 30);
        // A save made inside a black hole's pull, before saves avoided it, resumes beside the station instead
        if (in_gravity_pull(player)) {
            player.x = station.x;
            player.y = station.y + station_size/2 + 100;
            show_toast(`RECOVERED AT ${worlds[campaign.world].station.toUpperCase()}`, 'YOUR LAST SAVE WAS INSIDE A GRAVITY WELL', 4);
        }
        update_camera(0, true);
    }
    loading_campaign = false;
    save_checkpoint();
    update_hud();
    if (!saved) {
        dock_station();
    }
    // a save brought back from Feltmere says once what changed (checkpoint_without_feltmere); the save just made drops it
    if (saved?.news) {
        show_toast('FELTMERE IS CLOSED', saved.news, 8);
    }
}

function store_world()
{
    if (!ore_nodes.length && !mining_fields.length) {
        return;
    }
    campaign.maps[campaign.world] = {
        size: {w: world.w, h: world.h},
        ore: ore_nodes.filter(v => v.hp > 0).map(v => ({...v, cutter: null})),
        pickups: pickups.filter(v => v.cache && (v.life > 0)).map(v => ({...v})),
    };
}

function visual_base_generate_map()
{
    base_generate_map();
    const w = worlds[campaign.world];
    current_sector().color = w.color;
    current_sector().mix = w.mix;
    station = {x: world.w/2, y: world.h/2};
    // A gate faces the world it leads to, as the galaxy chart draws it, 60% of the way to the map's edge
    // (docs/placement.md)
    world_gates = w.links.map(function (destination) {
        const a = galaxy_bearing(campaign.world, destination);
        const edge = Math.min(world.w/2/Math.abs(Math.cos(a)), world.h/2/Math.abs(Math.sin(a)));
        return {
            x: station.x + Math.cos(a)*edge*0.6,
            y: station.y + Math.sin(a)*edge*0.6,
            r: 72,
            destination,
            color: worlds[destination].accent,
        };
    });
    // A beacon or the combat zone 1 km clear of the gates (and the zone of the portals and the shelter): its spot, or
    // the spot mirrored across the map's centre lines
    function clear_spot(spot, others, room) {
        const spots = [[0, 0], [1, 0], [0, 1], [1, 1]].map(v => ({x: world.w*Math.abs(v[0] - spot[0]), y: world.h*Math.abs(v[1] - spot[1])}));
        return spots.find(v => others.every(vv => distance(v, vv) >= room + (vv.r || 0))) || spots[0];
    }
    beacons = [[0.22, 0.3], [0.76, 0.18], [0.36, 0.82]].map(v => clear_spot(v, world_gates, 1000));
    configure_expedition_portals();
    combat_zone = clear_spot([0.82, 0.25], [...world_gates, ...portals, {...station, r: station_shelter}], 1000);
    const protected_objects = [station, ...world_gates, ...beacons, combat_zone, {x: station.x - 1600, y: station.y + 700}];
    place_gravity_wells(protected_objects);
    const saved = campaign.maps[campaign.world];
    if (saved) {
        const old = saved.size || {w: 9000 + wave*320, h: 7400 + wave*240};
        const sx = world.w/old.w;
        const sy = world.h/old.h;
        ore_nodes = clone(saved.ore).map(v => ore_node_new({...v, x: v.x*sx, y: v.y*sy}));
        pickups = clone(saved.pickups).map(v => ({...v, x: v.x*sx, y: v.y*sy}));
        recenter_mining_fields();
    }
    // Keep mines off the docking ring, the gates and the beacons, a ship's width clear, a saved map's too; one
    // accessible field is near the first station.
    ore_nodes = ore_nodes.filter(v => (distance(v, station) > station_size/2 + v.r + 50) && [...world_gates, ...portals, ...beacons].every(vv => distance(v, vv) > (vv.r || 0) + v.r + 50));
    patrol_timer = 8;
    save_timer = 15;
    escort = null;
    for (const contract of campaign.contracts) {
        if ((contract.type === 'recover') && (contract.world === campaign.world)) {
            contract.ambush = false;
        }
    }
}

// Gunners spawned so far: from Verdant on, every other one carries missiles, whatever its world's gun
let gunners_spawned = 0;

// The story's front: the world one behind the chapter you fly. A world the story has moved past fights as hard as the
// front, so in act I only a world you go back to is harder, and in act II (chapters 9 to 16, back through the eight
// worlds) every world fights seven tiers past its own: Haven's raiders with Eclipse's hull and guns, Eclipse's beyond
// them. The arcade keeps the world's own.
function raider_tier(id = campaign.world)
{
    return arcade.active ? world_tier(id) : Math.max(world_tier(id), campaign.story - 1);
}

// A world's raider armour at the story's front: 4% more a tier past its own, 72% at most
function world_armour(id)
{
    return Math.min(0.72, worlds[id].armor + (raider_tier(id) - world_tier(id))*0.04);
}

function spawn_enemy(type)
{
    const tier = raider_tier();
    // a raider's hull and speed follow the tier's threat level, as a world's follow its own (1, 3, ... 15, then on)
    const own_wave = wave;
    if (tier > world_tier(campaign.world)) {
        wave = 1 + tier*2;
    }
    base_spawn_enemy(type);
    wave = own_wave;
    const enemy = enemies[enemies.length - 1];
    const w = worlds[campaign.world];
    // past the world's own tier, 4% more armour (72% at most) and 15 more shield a tier: in act II every world's
    // raiders come 28% heavier and with 105 more shield than in act I, so a light gun's bolts fail there again
    const past = tier - world_tier(campaign.world);
    const armour = world_armour(campaign.world);
    const shield = w.shield + past*15;
    enemy.color = w.accent;
    enemy.armor = armour;
    enemy.max_shield = shield*((type === 'tank') ? 1.4 : 1);
    enemy.shield = enemy.max_shield;
    enemy.since_hit = 0;
    enemy.weapon = w.weapon;
    if (type === 'shooter') {
        gunners_spawned += 1;
        if ((world_tier(campaign.world) >= 1) && (gunners_spawned % 2 === 0)) {
            enemy.weapon = 'missile';
        }
    }
    enemy.gun_cd = rand(1, 3);
    // the campaign's raiders carry twice the hull of the table (campaign_raider_hull); a flagship keeps its own
    if (!arcade.active && (type !== 'boss')) {
        enemy.hp = enemy.max_hp = enemy.max_hp*campaign_raider_hull;
    }
    if (type === 'boss') {
        enemy.hp = enemy.max_hp = ((campaign.world === 7) ? 19000 : 10500)*(1 + past*0.08);
        enemy.r = 66;
        enemy.armor = armour;
        enemy.max_shield = enemy.shield = shield*3;
    }
    return enemy;
}

// How many times the speeds they were first given raiders' shots fly (raider_shot_first), and how much faster again
// since the author asked for nimbler fire (raider_shot_boost). In every world a gun's bolt outflies the fastest
// cruising ship (an interceptor with three Slipstreams; the closest: a Haven shooter's bolt, 707 m/s against 620) and
// stays slower than your own gun of its kind (a raider's ion bolt 1056 against yours 1150), so your shots still feel
// the faster. A missile outflies that ship too, a torpedo included (575 against 558 in Eclipse), and keeps up with it
// in turbo (missile_chase). Turbo outruns the bolts: it is the way out of a crossfire. A flagship's patterns (rings,
// fans, spirals) are made to be woven through, so they gain least. A shot's flight is cut by as much as its speed
// grows, so its reach stays.
const raider_shot_first = {gun: 2.4, missile: 2.4, pattern: 1.4};
const raider_shot_boost = {gun: 1.6, missile: 1.8, pattern: 1.15};

function world_audio_base_enemy_fire(enemy, angle, speed = 210, pattern = false)
{
    const w = enemy.weapon || 'plasma';
    // a missile's kind by the raider (missile_kind_for); a torpedo comes alone
    const kind = (w === 'missile') ? missile_kind_for(enemy) : null;
    const group = raider_shot_group(w, pattern);
    const s = raider_shot_speed(enemy, speed, pattern);
    const spread = (w === 'scatter') ? [-0.23, 0, 0.23] : (kind && (kind !== 'torpedo') && (world_tier(campaign.world) >= 6)) ? [-0.2, 0.2] : [0];
    for (const offset of spread) {
        const a = angle + offset;
        const x = enemy.x + Math.cos(a)*enemy.r;
        const y = enemy.y + Math.sin(a)*enemy.r;
        const shot = {
            x,
            y,
            // where the last step started: hits are checked along it (hostile_shot_contact)
            px: x,
            py: y,
            vx: Math.cos(a)*s,
            vy: Math.sin(a)*s,
            life: 6/(raider_shot_first[group]*raider_shot_boost[group]),
            r: (w === 'missile') ? 7 : (w === 'rail') ? 3 : 5,
            weapon: w,
            escort_target: !!enemy.escort_raider,
            // who fired it, for the play log's cause of a death
            from: enemy.type,
            from_elite: !!enemy.elite,
            damage: (w === 'rail') ? 30 : (w === 'missile') ? 23 : (w === 'scatter') ? 12 : (w === 'ion') ? 17 : 10,
            color: enemy.color,
            ...(kind ? missile_raider(kind, s) : {}),
        };
        if (kind) {
            // the kind's flight was set for its first speed: as much shorter as it flies faster
            shot.life = shot.flight = shot.fuel = missile_kinds[kind].life/raider_shot_boost[group];
        }
        // a marksman's missile flies for where you will be and turns harder (arcade_marksman_turn)
        if (kind && enemy.marksman && arcade.active) {
            shot.lead = true;
            shot.turn *= arcade_marksman_turn;
        }
        shot.damage *= raider_hit_scale(enemy);
        hostile.push(shot);
    }
    play_log_shots(spread.length);
    explode_muzzle(enemy.x + Math.cos(angle)*enemy.r, enemy.y + Math.sin(angle)*enemy.r, angle, (w === 'rail') ? 9 : 7, hostile_shot_color(enemy.color || pink));
}

// Which pace a raider's shot keeps (raider_shot_first, raider_shot_boost): a flagship's ring shot's, a missile's or a
// gun's
function raider_shot_group(weapon, pattern)
{
    return pattern ? 'pattern' : (weapon === 'missile') ? 'missile' : 'gun';
}

// The speed a raider's shot leaves at, before the world's projectile rule: a missile's by its kind, a rail's or an ion
// bolt's its own, another gun's the one it is fired at
function raider_shot_speed(enemy, speed = 210, pattern = false)
{
    const w = enemy.weapon || 'plasma';
    const group = raider_shot_group(w, pattern);
    const base = (w === 'missile') ? 190*missile_kinds[missile_kind_for(enemy)].speed : (w === 'rail') ? 520 : (w === 'ion') ? 275 : speed;
    return base*raider_shot_first[group]*raider_shot_boost[group];
}

// The campaign's raiders against the arcade's: twice the hull and half the reload they had, so a patrol lives long
// enough to shoot back. Before, half to three quarters of them died before their first shot, and a minute in the
// campaign brought 5 to 26 shots at you where the arcade brings 50 to 220 (docs/balance.md). A missile still reloads
// twice as slowly as another gun, as in the arcade. The arcade keeps its own numbers (arcade_modes).
const campaign_raider_hull = 2;
const campaign_raider_reload = 0.5;

// A factor on a raider's reload: the arcade's (arcade_reload), or the campaign's, slower for a missile
function raider_reload(enemy)
{
    return arcade.active ? arcade_reload(enemy) : campaign_raider_reload*(arcade_reloads[enemy.weapon] || 1);
}

// Raiders' guns hit harder the farther the world: 8% more a world past Haven, Eclipse's half as much again; in the
// campaign, 8% more a tier of the story's front past the world (raider_tier). A raider sent for a freighter, the survey
// robot or a structure keeps its world's own: their hulls do not grow with the story, and a stage that guards one
// would never end.
function raider_hit_scale(enemy = null)
{
    const own = enemy && (enemy.escort_raider || enemy.robot_raider || enemy.structure_target);
    return 1 + (own ? world_tier(campaign.world) : raider_tier())*0.08;
}

// Armour cuts a hit twice: its plating takes a flat part of every hit, 50 at full armour and never more than three
// quarters of it, then its share takes the rest in proportion. So many small bolts lose much more to a heavy hull than
// one big slug does, and a far world asks for a heavier gun.
const armour_plating = 50;

function armour_hull_damage(enemy, through)
{
    const armor = enemy.armor || 0;
    return Math.max(through*0.25, through - armor*armour_plating)*(1 - armor);
}

function expedition_base_damage_enemy(enemy, damage)
{
    if (enemy.hp <= 0) {
        return;
    }
    enemy.since_hit = 0;
    const shield_before = enemy.shield || 0;
    const absorbed = Math.min(enemy.shield || 0, damage);
    enemy.shield = Math.max(0, (enemy.shield || 0) - absorbed);
    shield_hit_show(enemy, shield_before);
    const hull = armour_hull_damage(enemy, damage - absorbed);
    if (hull <= 0) {
        enemy.flash = 0.08;
        return;
    }
    const alive = enemy.hp > 0;
    base_damage_enemy(enemy, hull);
    if (alive && (enemy.hp <= 0)) {
        if (!arcade.active) {
            cargo_spill(enemy);
            kill_xp_grant(enemy);
        }
        mission_event('hunt', 1);
        if ((enemy.type === 'boss') && enemy.mission_boss) {
            mission_event('boss', 1);
        }
    }
}

function physics_base_damage_ore(v, amount)
{
    const alive = v.hp > 0;
    base_damage_ore(v, amount);
    if (alive && (v.hp <= 0)) {
        mark_mining_changed();
        if (!v.cutter) {
            ore_load(v);
        }
        // a deposit drilled empty counted its units as they were mined
        if (!v.depleted) {
            mission_event('mining', 1);
        }
    }
}
