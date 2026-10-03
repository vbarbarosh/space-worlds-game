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
        current_weapon().rating +
        weapon_level() -
        1 +
        Math.round((current_ship().damage - 1)*5)
    );
}

function defense_rating()
{
    return upgrades.armor + upgrades.shield + Math.floor(current_ship().shield/35);
}

function allowed_world(id)
{
    return (
        (attack_rating() >= worlds[id].attack) && (defense_rating() >= worlds[id].defense) && (radiation_protection() + 0.001 >= expedition_conditions[id].required)
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
                ['mining', 'hunt', 'courier', 'survey', 'boss', 'escort', 'trade', 'scan', 'recover', 'defend', 'elite'].includes(v.type) &&
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
        update_camera(0, true);
    }
    loading_campaign = false;
    save_checkpoint();
    update_hud();
    if (!saved) {
        dock_station();
    }
}

function store_world()
{
    if (!ore_nodes.length && !mining_fields.length) {
        return;
    }
    campaign.maps[campaign.world] = {
        size: {w: world.w, h: world.h},
        ore: ore_nodes.filter(v => v.hp > 0).map(v => ({...v})),
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
    // Fixed navigational structures are placed on clear approaches, outside gravity fields.
    const spread = (campaign.world === 0) ? 0.1 : 0.34;
    world_gates = w.links.map(function (destination, i) {
        return {
            x: station.x + ((i === 0) ? world.w*spread : (i === 1) ? -world.w*spread : 0),
            y: station.y + ((i === 2) ? -world.h*spread : 0),
            r: 72,
            destination,
            color: worlds[destination].accent,
        };
    });
    beacons = [
        {x: world.w*0.22, y: world.h*0.3},
        {x: world.w*0.76, y: world.h*0.18},
        {x: world.w*0.36, y: world.h*0.82},
    ];
    combat_zone = {x: world.w*0.82, y: world.h*0.25};
    configure_expedition_portals();
    const protected_objects = [station, ...world_gates, ...beacons, combat_zone, {x: station.x - 1600, y: station.y + 700}];
    place_gravity_wells(protected_objects);
    // Keep mines away from the docking ring; one accessible field is near the first station.
    ore_nodes = ore_nodes.filter(v => distance(v, station) > 270);
    const saved = campaign.maps[campaign.world];
    if (saved) {
        const old = saved.size || {w: 9000 + wave*320, h: 7400 + wave*240};
        const sx = world.w/old.w;
        const sy = world.h/old.h;
        ore_nodes = clone(saved.ore).map(v => ({...v, x: v.x*sx, y: v.y*sy}));
        pickups = clone(saved.pickups).map(v => ({...v, x: v.x*sx, y: v.y*sy}));
        recenter_mining_fields();
    }
    patrol_timer = 8;
    save_timer = 15;
    escort = null;
    for (const contract of campaign.contracts) {
        if ((contract.type === 'recover') && (contract.world === campaign.world)) {
            contract.ambush = false;
        }
    }
}

function spawn_enemy(type)
{
    base_spawn_enemy(type);
    const enemy = enemies[enemies.length - 1];
    const w = worlds[campaign.world];
    enemy.color = w.accent;
    enemy.armor = w.armor;
    enemy.max_shield = w.shield*((type === 'tank') ? 1.4 : 1);
    enemy.shield = enemy.max_shield;
    enemy.since_hit = 0;
    enemy.weapon = w.weapon;
    enemy.gun_cd = rand(1, 3);
    if (type === 'boss') {
        enemy.hp = enemy.max_hp = (campaign.world === 7) ? 19000 : 10500;
        enemy.r = 66;
        enemy.armor = w.armor;
        enemy.max_shield = enemy.shield = w.shield*3;
    }
    return enemy;
}

function world_audio_base_enemy_fire(enemy, angle, speed = 210)
{
    const w = enemy.weapon || 'plasma';
    const spread = (w === 'scatter') ? [-0.23, 0, 0.23] : ((w === 'missile') && (campaign.world >= 6)) ? [-0.2, 0.2] : [0];
    for (const offset of spread) {
        const a = angle + offset;
        const s = (w === 'rail') ? 520 : (w === 'missile') ? 190 : (w === 'ion') ? 275 : speed;
        hostile.push({
            x: enemy.x + Math.cos(a)*enemy.r,
            y: enemy.y + Math.sin(a)*enemy.r,
            vx: Math.cos(a)*s,
            vy: Math.sin(a)*s,
            life: 6,
            r: (w === 'missile') ? 7 : (w === 'rail') ? 3 : 5,
            weapon: w,
            escort_target: !!enemy.escort_raider,
            damage: (w === 'rail') ? 30 : (w === 'missile') ? 23 : (w === 'scatter') ? 12 : (w === 'ion') ? 17 : 10,
            color: enemy.color,
        });
    }
    explode(enemy.x + Math.cos(angle)*enemy.r, enemy.y + Math.sin(angle)*enemy.r, 11, enemy.color || pink, 0, 'muzzle');
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
    const hull = (damage - absorbed)*(1 - (enemy.armor || 0));
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
        mission_event('mining', 1);
    }
}
