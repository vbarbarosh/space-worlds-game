function stage(type, world, target, title, extra = {})
{
    return {type, world, target, title, ...extra};
}
// Act I after chapter 1. A chapter ends where the next one starts, or on the way to it: a delivery to another world
// is a run under pursuit (courier_update), never an empty trip back
const expanded_story_stages = [
    [
        stage('scan', 1, 18, 'Locate the swarm nest', {beacon: 1}),
        stage('hunt', 1, 12, 'Break the swarm patrol'),
        stage('recover', 1, 12, 'Retrieve the nest telemetry'),
        stage('courier', 0, 1, 'Run the telemetry home to Haven'),
    ],
    [
        stage('courier', 2, 1, 'Run the navigation core to Dustfall'),
        stage('defend', 2, 65, 'Hold the refinery relay'),
        stage('elite', 2, 1, 'Drive off the Marauder captain'),
    ],
    [
        stage('scan', 3, 20, 'Align beacon alpha', {beacon: 0}),
        stage('defend', 3, 60, 'Hold beacon beta through the storm', {beacon: 1}),
        stage('scan', 3, 20, 'Align beacon gamma', {beacon: 2}),
        stage('recover', 3, 15, 'Extract the storm log'),
    ],
    [
        stage('scan', 4, 22, 'Identify the blockade command ship', {beacon: 1}),
        stage('hunt', 4, 14, 'Thin the blockade'),
        stage('elite', 4, 1, 'Disable the Iron commander'),
    ],
    [
        stage('mining', 5, 18, 'Gather frozen relic ore'),
        stage('defend', 5, 75, 'Protect the extraction relay'),
        stage('escort', 5, 1, 'Escort the sample freighter'),
        stage('courier', 4, 1, 'Run the manifest to Bastion Dock'),
    ],
    [
        stage('scan', 6, 25, 'Locate the flagship reactor', {beacon: 2}),
        stage('hunt', 6, 12, 'Destroy reactor pickets'),
        stage('boss', 6, 1, 'Destroy the Ember flagship', {boss: 'EMBER FLAGSHIP'}),
        stage('recover', 6, 18, 'Recover the reactor core'),
    ],
    [
        stage('scan', 7, 28, 'Reveal the Void signature', {beacon: 0}),
        stage('defend', 7, 90, 'Keep the last-light relay active'),
        stage('boss', 7, 1, 'Destroy the Void Dreadnought', {boss: 'VOID DREADNOUGHT'}),
        stage('recover', 7, 20, 'Recover the frontier archive'),
        stage('courier', 0, 1, 'Bring the archive home to Haven'),
    ],
];
for (let i = 0, end = story.length; i < end; ++i) {
    const m = story[i];
    m.stages = expanded_story_stages[i];
    m.reward = Math.round(m.reward*1.8);
    m.description += ` ${m.stages.map(v => v.title).join(' → ')}.`;
}
// Act II: [title, world, briefing, stages, reward]
const second_act = [
    [
        'Routes worth defending',
        0,
        'Haven signs the Charter first, if its relief convoy gets through Dustfall and the raiders who stole the last one are broken.',
        [
            stage('scan', 0, 20, 'Trace the stolen convoy', {beacon: 2}),
            stage('escort', 2, 1, 'Protect the relief convoy'),
            stage('elite', 2, 1, 'Break the pursuit'),
            stage('courier', 0, 1, 'Report the safe route to Haven'),
        ],
        1200,
    ],
    [
        'The living archive',
        1,
        'Verdant asks you to save its seed archive, the memory of a living world, and carry it to the cold vault in Haven.',
        [
            stage('recover', 1, 20, 'Retrieve the seed archive'),
            stage('defend', 1, 90, 'Keep the archive relay online'),
            stage('courier', 0, 1, 'Carry the seeds to the Haven vault'),
        ],
        1450,
    ],
    [
        'A profitable detour',
        2,
        'Dustfall signs when trade with Obsidian runs again: mine titanium sand here, sell it to the Iron foundry yourself, and see its carrier out.',
        [
            stage('mining', 2, 24, 'Mine titanium sand'),
            stage('trade', 4, 12, 'Sell the titanium to the Iron foundry', {commodity: 'titanium'}),
            stage('escort', 4, 1, 'Protect the outbound carrier'),
        ],
        1700,
    ],
    [
        'Stormbreaker network',
        3,
        'The Volt Collective jams every signal of the Arc Spire. Align the relay, take out their marshal and hold the relay while the network key resets.',
        [
            stage('scan', 3, 25, 'Align the storm relay', {beacon: 1}),
            stage('elite', 3, 1, 'Eliminate the Volt marshal'),
            stage('defend', 3, 90, 'Hold the relay while the key resets', {beacon: 0}),
        ],
        1850,
    ],
    [
        'The shattered armistice',
        4,
        'Obsidian\'s old armistice is the model for the Charter\'s peace clause. Break the occupation, recover the treaty and carry it to Cryosphere, its old co-signer.',
        [
            stage('hunt', 4, 16, 'Break the occupation fleet'),
            stage('elite', 4, 1, 'Defeat the Dominion admiral'),
            stage('recover', 4, 22, 'Recover the treaty'),
            stage('courier', 5, 1, 'Carry the treaty to Glacier Relay'),
        ],
        2150,
    ],
    [
        'Pilgrims of the ice',
        5,
        'The Glacier Relay signs when its pilgrims come home: find them, bring their freighter in, and keep the resupply relay alive.',
        [
            stage('scan', 5, 28, 'Find the lost pilgrims', {beacon: 2}),
            stage('escort', 5, 1, 'Protect the pilgrim freighter'),
            stage('defend', 5, 100, 'Defend the resupply relay', {beacon: 0}),
        ],
        2350,
    ],
    [
        'A second sunrise',
        6,
        'With a second reactor the forge can power the guild\'s own gates. Its material is here; its warden and the Helios warship stand in the way.',
        [
            stage('mining', 6, 20, 'Collect reactor material'),
            stage('elite', 6, 1, 'Defeat the Forge warden'),
            stage('boss', 6, 1, 'Silence the Helios warship', {boss: 'HELIOS WARSHIP'}),
        ],
        2700,
    ],
    [
        'Beyond the last light',
        7,
        'The last signature is Eclipse\'s own, and the Void Armada will not give it. Win it, recover the Charter where it was lost, and found the guild at the Last Light Citadel.',
        [
            stage('scan', 7, 30, 'Chart the outer darkness', {beacon: 2}),
            stage('elite', 7, 1, 'Break the Void honor guard'),
            stage('defend', 7, 110, 'Stabilize the frontier beacon'),
            stage('boss', 7, 1, 'Defeat the reborn dreadnought', {boss: 'REBORN DREADNOUGHT'}),
            stage('recover', 7, 25, 'Recover the expedition charter'),
        ],
        3400,
    ],
];
for (const v of second_act) {
    story.push({
        title: v[0],
        type: v[3][0].type,
        world: v[1],
        target: v[3][0].target,
        reward: v[4],
        stages: v[3],
        description: `${v[2]} ${v[3].map(vv => vv.title).join(' → ')}.`,
        level: 2,
    });
}
function sync_stage(m)
{
    const v = m.stages[m.stage_index];
    if (!v) {
        return;
    }
    m.type = v.type;
    m.world = v.world;
    m.target = v.target;
    m.progress = 0;
    m.scans = [];
    m.commodity = v.commodity;
    m.started = false;
    m.stage_kills = 0;
    mark_mining_changed();
    m.recovery_remaining = null;
    m.ambush = false;
    m.spawn_clock = 0;
    m.boss_hp = null;
    m.escort_state = null;
    // a delivery starts where the stage before it ended (or where the contract was taken): raiders intercept it in
    // each other world it enters (update_intercepts)
    m.run_from = m.stage_index ? m.stages[m.stage_index - 1].world : (m.issuer ?? campaign.world);
    m.intercepted = [];
    m.intercept_at = null;
    m.reinforced = false;
    guide_path_key = '';
    escort = null;
}

function mission_event(type, n, details = {})
{
    for (const m of campaign.contracts.slice()) {
        if (m.ready || (m.world !== campaign.world) || (m.type !== type) || (details.contract_id && (details.contract_id !== m.id))) {
            continue;
        }
        if ((type === 'trade') && (m.commodity !== details.commodity) && (m.stages?.[m.stage_index]?.commodity !== details.commodity)) {
            continue;
        }
        if ((type === 'survey') && (details.beacon !== undefined)) {
            if (m.scans.includes(details.beacon)) {
                continue;
            }
            m.scans.push(details.beacon);
        }
        m.progress = Math.min(m.target, m.progress + n);
        if (m.progress < m.target) {
            continue;
        }
        if ((type === 'mining') && guide_flying && !guide_manual && (focused_contract()?.id === m.id)) {
            guide_flying = false;
            mouse_drive.active = false;
            player.vx = player.vy = 0;
        }
        if (m.stages && (m.stage_index < m.stages.length - 1)) {
            play_log_contract('stage done', m);
            m.stage_index++;
            sync_stage(m);
            show_toast('NEXT OPERATION STAGE', `${m.stages[m.stage_index].title} / ${worlds[m.world].name}`, 4);
        }
        else {
            m.ready = true;
            play_log_contract('completed', m);
            show_toast('CONTRACT COMPLETE', `${m.title} / DOCK TO COLLECT ◆ ${m.reward}`, 4);
            sfx('win');
        }
        save_checkpoint();
    }
}

function operation_point(m)
{
    const s = m.stages?.[m.stage_index];
    if (m.type === 'scan') {
        return beacons[s?.beacon || 0];
    }
    if (m.type === 'defend') {
        return beacons[s?.beacon ?? 1];
    }
    if (['elite', 'boss', 'recover'].includes(m.type)) {
        return combat_zone;
    }
    return station;
}

function spawn_operation_enemy(m, type, point, elite = false)
{
    const enemy = spawn_enemy(type);
    const a = rand(0, Math.PI*2);
    enemy.x = clamp(point.x + Math.cos(a)*rand(390, 560), 50, world.w - 50);
    enemy.y = clamp(point.y + Math.sin(a)*rand(390, 560), 50, world.h - 50);
    enemy.operation_id = m.id;
    enemy.operation_stage = m.stage_index;
    const level = m.level || 1;
    enemy.hp = enemy.max_hp = enemy.max_hp*(1 + Math.min(10, level - 1)*0.12);
    if (elite) {
        enemy.elite = true;
        enemy.hp = enemy.max_hp = Math.max(600, enemy.max_hp*3.5);
        enemy.armor = Math.min(0.72, (enemy.armor || 0) + 0.12);
        enemy.max_shield = enemy.shield = Math.max(80, (enemy.max_shield || 0)*1.6);
        enemy.speed *= 0.8;
        enemy.r += 9;
        enemy.weapon = (campaign.world === 0) ? 'missile' : enemy.weapon;
        label(enemy.x, enemy.y - 40, 'ELITE COMMANDER', pink);
    }
    return enemy;
}

// A delivery under pursuit: a courier or trade stage carried from another world. In each world it enters, its
// destination included, a wing of that world's raiders comes for it once, a few seconds after you arrive, between you
// and the station. Fight them off or outfly them to the berth.
const intercept_delay = 4;

function update_intercepts(dt)
{
    for (const m of campaign.contracts.filter(v => !v.ready && ['courier', 'trade'].includes(v.type))) {
        if ((m.run_from === undefined) || (m.run_from === campaign.world) || (m.intercepted || []).includes(campaign.world)) {
            continue;
        }
        if (m.intercept_at !== campaign.world) {
            m.intercept_at = campaign.world;
            m.intercept_clock = 0;
        }
        m.intercept_clock += dt;
        if ((m.intercept_clock < intercept_delay) || (distance(player, station) < station_shelter) || (enemies.length > 20)) {
            continue;
        }
        m.intercepted = [...(m.intercepted || []), campaign.world];
        const a = Math.atan2(station.y - player.y, station.x - player.x);
        const ahead = Math.min(1400, distance(player, station)*0.5);
        const point = {x: player.x + Math.cos(a)*ahead, y: player.y + Math.sin(a)*ahead};
        const count = 2 + Math.min(2, m.level || 1);
        for (let i = 0; i < count; ++i) {
            spawn_operation_enemy(m, (i % 2) ? 'shooter' : 'chaser', point).interceptor = true;
        }
        show_toast('INTERCEPTED', `${worlds[campaign.world].faction.toUpperCase()} WANT WHAT YOU CARRY · ${count} INBOUND`, 3);
    }
}

function update_operations(dt)
{
    update_intercepts(dt);
    for (const m of campaign.contracts.filter(v => !v.ready && (v.world === campaign.world))) {
        if (m.type === 'lure') {
            lure_update(m);
            continue;
        }
        if (!['scan', 'recover', 'defend', 'elite'].includes(m.type)) {
            continue;
        }
        const point = operation_point(m);
        const d = distance(player, point);
        const stage_index = m.stage_index;
        if (d > 850) {
            continue;
        }
        if (!m.started) {
            m.started = true;
            m.spawn_clock = 0;
            const hint = (m.type === 'scan')
                ? 'A SURVEY ROBOT LAUNCHES AT THE BEACON · GUARD IT'
                : (m.type === 'recover')
                    ? 'CLEAR THE AMBUSH, THEN HOLD WITHIN 150 m'
                    : (m.type === 'defend')
                        ? 'STAY WITHIN 450 m / CLEAR RAIDERS'
                        : 'DEFEAT THE MARKED ELITE';
            show_toast(
                (m.type === 'defend') ? 'RELAY DEFENSE' : (m.type === 'elite') ? 'COMMANDER CONTACT' : 'SIGNAL ACQUIRED',
                hint,
                3
            );
        }
        if (m.type === 'elite') {
            if (!enemies.some(v => (v.operation_id === m.id) && (v.operation_stage === stage_index) && v.elite && (v.hp > 0))) {
                spawn_operation_enemy(m, 'tank', point, true);
            }
            continue;
        }
        if ((m.type === 'recover') && !m.ambush) {
            m.ambush = true;
            if ((m.recovery_remaining === null) || (m.recovery_remaining === undefined)) {
                m.recovery_remaining = 3 + Math.min(3, m.level || 1);
            }
            for (let i = 0; i < m.recovery_remaining; ++i) {
                spawn_operation_enemy(m, (i % 2) ? 'shooter' : 'chaser', point);
            }
        }
        const raiders = enemies.some(v => (v.hp > 0) && (v.operation_id === m.id) && (v.operation_stage === stage_index));
        if (m.type === 'scan') {
            survey_update(m, point, d, dt);
        }
        if ((m.type === 'recover') && !raiders && (d < 150)) {
            mission_event('recover', dt, {contract_id: m.id});
            // halfway through the hold the ambush calls its reinforcements: the hold stops until they are cleared
            if (!m.reinforced && (m.stage_index === stage_index) && (m.progress >= m.target*0.5)) {
                m.reinforced = true;
                const count = 2 + Math.min(2, Math.floor((m.level || 1)/2));
                for (let i = 0; i < count; ++i) {
                    spawn_operation_enemy(m, (i % 2) ? 'shooter' : 'chaser', point);
                }
                show_toast('REINFORCEMENTS', `${count} INBOUND / THE HOLD WAITS UNTIL THEY ARE CLEARED`, 3);
            }
        }
        if (m.type === 'defend') {
            m.spawn_clock -= dt;
            if ((m.spawn_clock <= 0) && (enemies.length < 21)) {
                m.spawn_clock = 12;
                // the waves grow with the time held, as a hold's do (hold_wave_size), and with the contract's level
                for (let i = 0; i < hold_wave_size(1 + Math.floor(m.progress/12)) + Math.min(2, (m.level || 1) - 1); ++i) {
                    spawn_operation_enemy(m, (i % 2) ? 'shooter' : 'chaser', point);
                }
            }
            if (d < 450) {
                mission_event('defend', dt, {contract_id: m.id});
            }
            else {
                m.progress = Math.max(0, m.progress - dt*0.2);
            }
        }
    }
}

function damage_enemy(enemy, damage)
{
    const alive = enemy.hp > 0;
    // guns cannot hurt the Leviathan: only a black hole's core can
    if (enemy.leviathan && !enemy.core_kill) {
        enemy.flash = 0.08;
        return;
    }
    const health = play_log_health(enemy);
    // a flagship takes more while its hull is exposed, less while its pods guard it (boss_hit_factor)
    expedition_base_damage_enemy(enemy, (enemy.type === 'boss') ? damage*boss_hit_factor(enemy) : damage);
    play_log_dealt(enemy, health);
    if (alive && (enemy.hp <= 0) && enemy.leviathan) {
        show_toast('LEVIATHAN CONSUMED', 'THE BLACK HOLE TOOK IT', 4);
        mission_event('lure', 1, {contract_id: enemy.operation_id});
    }
    if (alive && (enemy.hp <= 0) && enemy.operation_id) {
        const m = campaign.contracts.find(v => v.id === enemy.operation_id);
        if (m && (m.type === 'recover') && (m.stage_index === enemy.operation_stage)) {
            m.recovery_remaining = Math.max(0, (m.recovery_remaining || 0) - 1);
        }
    }
    if (alive && (enemy.hp <= 0) && enemy.elite) {
        const m = campaign.contracts.find(v => v.id === enemy.operation_id);
        if (m && (m.stage_index === enemy.operation_stage)) {
            mission_event('elite', 1, {contract_id: m.id});
        }
    }
}

// The convoy freighter's hull in Haven at level 1; farther out and higher it grows as the raiders' hits do
const escort_hull = 300;
const escort_speed = 70;
// the freighter keeps moving while you are within this; farther, it waits for you
const escort_leash = 1000;
const escort_stop_times = {load: 8, unload: 6};

// The convoy's cargo run: from beside the station to the edge of the nearest mining field 1.5-4 km off, where it
// loads, then to the station's far side, where it unloads; a few kilometres, a couple of minutes
function escort_route()
{
    const start = {x: station.x + station_size/2 + 350, y: station.y + 250};
    const near = mining_fields.filter(v => (distance(v, start) > 1500) && (distance(v, start) < 4000));
    const fields = (near.length ? near : mining_fields).slice().sort((a, b) => distance(a, start) - distance(b, start));
    const field = fields[0] || {x: start.x + 2500, y: start.y, r: 0, id: -1};
    const a = Math.atan2(start.y - field.y, start.x - field.x);
    const load = {x: field.x + Math.cos(a)*(field.r + 150), y: field.y + Math.sin(a)*(field.r + 150), job: 'load', label: (field.id >= 0) ? `Mining field ${field.id + 1}` : 'the loading point'};
    const unload = {x: station.x - (station_size/2 + 300), y: station.y, job: 'unload', label: worlds[campaign.world].station};
    return {start, stops: [load, unload]};
}

// The run's length and time, with its stops: "4.2 km · about 2 min"
function escort_route_text(v)
{
    const points = [v.start || v, ...v.stops];
    let length = 0;
    for (let i = 1, end = points.length; i < end; ++i) {
        length += distance(points[i - 1], points[i]);
    }
    const seconds = length/escort_speed + escort_stop_times.load + escort_stop_times.unload;
    return `${(length/1000).toFixed(1)} km · about ${Math.max(1, Math.round(seconds/60))} min`;
}

// A raider wave at the freighter, once per name (a stop or a leg)
function escort_wave(m, name, count)
{
    if (escort.waves.includes(name) || (enemies.length > 16)) {
        return;
    }
    escort.waves.push(name);
    for (let i = 0; i < count; ++i) {
        const enemy = spawn_operation_enemy(m, (i % 2) ? 'chaser' : 'shooter', escort);
        enemy.escort_raider = true;
    }
    show_toast('RAIDERS ON THE CONVOY', `${count} INBOUND / PROTECT THE FREIGHTER`, 3);
}

function update_escort(dt)
{
    const m = campaign.contracts.find(v => !v.ready && (v.type === 'escort') && (v.world === campaign.world));
    if (!m) {
        escort = null;
        return;
    }
    // a convoy saved before the cargo runs starts a new one
    if (!escort && m.escort_state?.stops) {
        escort = clone(m.escort_state);
    }
    if (!escort) {
        const route = escort_route();
        // as sturdy against the world's raiders as it is in Haven: they hit harder farther out and at higher levels
        const hull = Math.round(escort_hull*raider_hit_scale()*(1 + Math.min(10, (m.level || 1) - 1)*0.12));
        escort = {x: route.start.x, y: route.start.y, start: route.start, hp: hull, max_hp: hull, active: false, stops: route.stops, leg: 0, stop_timer: -1, waves: [], destination: route.stops[0]};
    }
    if (!escort.active && (distance(player, escort) < 450)) {
        escort.active = true;
        show_toast('CONVOY UNDERWAY', `${escort.stops.map(v => v.label).join(' → ')} · ${escort_route_text(escort)}`, 4);
    }
    if (!escort.active) {
        m.escort_state = clone(escort);
        return;
    }
    const stop = escort.stops[escort.leg];
    escort.destination = stop;
    if (escort.stop_timer >= 0) {
        // at a stop: its drones ferry the cargo, and raiders strike
        escort.stop_timer -= dt;
        if (escort.stop_timer < 0) {
            escort.leg++;
            if (escort.leg >= escort.stops.length) {
                m.escort_state = null;
                escort = null;
                mission_event('escort', 1, {contract_id: m.id});
                return;
            }
            escort.hp = Math.min(escort.max_hp || escort_hull, escort.hp + 65);
            show_toast(`CONVOY ${(stop.job === 'load') ? 'LOADED' : 'UNLOADED'}`, `FIELD REPAIR +65 / NEXT: ${escort.stops[escort.leg].label.toUpperCase()}`, 3);
        }
    }
    else if (distance(escort, stop) < 60) {
        escort.stop_timer = escort_stop_times[stop.job];
        escort_wave(m, `stop-${escort.leg}`, 3);
    }
    else if (distance(player, escort) < escort_leash) {
        const a = Math.atan2(stop.y - escort.y, stop.x - escort.x);
        escort.x += Math.cos(a)*escort_speed*dt;
        escort.y += Math.sin(a)*escort_speed*dt;
        // halfway along a leg, a raider wave
        const from = (escort.leg === 0) ? escort.start : escort.stops[escort.leg - 1];
        if (distance(escort, stop) < distance(from, stop)*0.5) {
            escort_wave(m, `leg-${escort.leg}`, 2 + escort.leg);
        }
    }
    for (const b of hostile) {
        if ((b.life > 0) && (hostile_shot_contact(b, escort, b.r + sprite_sizes.freighter*0.2) >= 0)) {
            escort.hp -= b.damage || 13;
            b.life = 0;
        }
    }
    for (const enemy of enemies) {
        if ((enemy.hp > 0) && (distance(enemy, escort) < enemy.r + sprite_sizes.freighter*0.2)) {
            escort.hp -= 18*dt;
        }
    }
    if (escort.hp <= 0) {
        burst(escort.x, escort.y, pink, 50, 250);
        m.escort_state = null;
        escort = null;
        show_toast('CONVOY LOST', 'MEET A REPLACEMENT AT THE STATION / PREVIOUS STAGES PRESERVED', 4);
        return;
    }
    m.escort_state = clone(escort);
}

// Each world's own two contracts, in its own terms: its raiders, its resource, its rules. level is the board's level
function world_contracts(id, level)
{
    const n = level - 1;
    const beacon = (campaign.board || 0) % 3;
    return [
        [
            {
                title: 'Clear the patrol lanes',
                description: 'Rim Corsairs sit on the Anchorage lanes and pick off the ore tenders. Find their route, break them, and pull the flight recorder of the last tender they took.',
                stages: [
                    stage('scan', 0, 12 + n, 'Find the Corsair route', {beacon}),
                    stage('hunt', 0, 6 + n, 'Clear the Corsairs off the route'),
                    stage('recover', 0, 10, 'Retrieve the flight recorder'),
                ],
            },
            {
                title: 'Haven iron for the Anchorage',
                description: 'The Anchorage builds its berths from Haven iron. Cut a load with your drones, then see the ore tender through its run.',
                stages: [stage('mining', 0, 8 + 2*n, 'Cut Haven iron'), stage('escort', 0, 1, 'Escort the ore tender')],
            },
        ],
        [
            {
                title: 'Prune the thorn nest',
                description: 'A Thorn Swarm nest has rooted beside the Canopy Exchange. Find it, cut its swarm back, and kill the nest mother before it buds again.',
                stages: [
                    stage('scan', 1, 14 + n, 'Find the nest', {beacon: 1}),
                    stage('hunt', 1, 8 + n, 'Cut the swarm back'),
                    stage('elite', 1, 1, 'Kill the nest mother'),
                ],
            },
            {
                title: 'Spore resin harvest',
                description: 'The Exchange pays for spore resin, and the swarm swarms to its smell. Tap the rocks, then guard the taps while the resin drains.',
                stages: [stage('mining', 1, 8 + 2*n, 'Tap spore resin'), stage('defend', 1, 40 + 5*n, 'Guard the taps from the swarm', {beacon: 2})],
            },
        ],
        [
            {
                title: 'Refinery quota',
                description: 'Dustfall Refinery runs on titanium sand from its own rich rocks. Mine a load with your drones and sell the refinery its quota.',
                stages: [stage('mining', 2, 10 + 2*n, 'Mine titanium sand'), stage('trade', 2, 6 + n, 'Sell the refinery its quota', {commodity: 'titanium'})],
            },
            {
                title: 'Marauder launch site',
                description: 'Dune Marauders fire their missiles from a hidden launch site. Find it, strip its launchers under fire, and ground their captain.',
                stages: [
                    stage('scan', 2, 14 + n, 'Locate the launch site', {beacon: 2}),
                    stage('recover', 2, 12, 'Strip the launchers'),
                    stage('elite', 2, 1, 'Ground the Marauder captain'),
                ],
            },
        ],
        [
            {
                title: 'Storm cartography',
                description: 'The Arc Spire charts the storms that move its lanes. Chart the front, hold the lightning-rod array while it discharges, and recover the storm probe.',
                stages: [
                    stage('scan', 3, 14 + n, 'Chart the storm front', {beacon: 0}),
                    stage('defend', 3, 45 + 5*n, 'Hold the lightning-rod array', {beacon: 2}),
                    stage('recover', 3, 12, 'Recover the storm probe'),
                ],
            },
            {
                title: 'Silence the Volt jammers',
                description: 'The Volt Collective jams the Spire with relay ships. Hunt the relay wing, then take out the jammer chief.',
                stages: [stage('hunt', 3, 8 + n, 'Hunt the relay wing'), stage('elite', 3, 1, 'Take out the jammer chief')],
            },
        ],
        [
            {
                title: 'Break the Dominion picket',
                description: 'An Iron Dominion picket squeezes the Bastion lanes. Thin it, disable its commander, and salvage its command log. Railguns go through their plating.',
                stages: [
                    stage('hunt', 4, 6 + n, 'Thin the picket'),
                    stage('elite', 4, 1, 'Disable the picket commander'),
                    stage('recover', 4, 12, 'Salvage the command log'),
                ],
            },
            {
                title: 'Heavy metals for the Bastion',
                description: 'Bastion Dock casts its armour from heavy metals. Mine a load in the heavy gravity, then guard the ore lift that carries it up.',
                stages: [stage('mining', 4, 10 + 2*n, 'Mine heavy metals'), stage('defend', 4, 50 + 5*n, 'Guard the ore lift', {beacon: 1})],
            },
        ],
        [
            {
                title: 'Lost on the ice',
                description: 'A pilgrim shuttle went quiet on the ice. Find its beacon, pull the crew pod out under Frost Sentinel fire, and bring their freighter home.',
                stages: [
                    stage('scan', 5, 14 + n, 'Find the shuttle beacon', {beacon: 2}),
                    stage('recover', 5, 12, 'Pull the crew pod out'),
                    stage('escort', 5, 1, 'Bring the pilgrim freighter home'),
                ],
            },
            {
                title: 'Helium-3 harvest',
                description: 'Glacier Relay burns helium-3 to stay warm. Mine the ice, then keep the cryo relay running while it stores the harvest.',
                stages: [stage('mining', 5, 10 + 2*n, 'Mine helium-3 ice'), stage('defend', 5, 50 + 5*n, 'Keep the cryo relay running', {beacon: 0})],
            },
        ],
        [
            {
                title: 'Quench the furnace raiders',
                description: 'Ember Legion raiders strike the Foundry from the furnace belt. Find their staging point, break their wing, and down their foreman. Mind your guns\' heat.',
                stages: [
                    stage('scan', 6, 14 + n, 'Find the staging point', {beacon: 1}),
                    stage('hunt', 6, 8 + n, 'Break the furnace wing'),
                    stage('elite', 6, 1, 'Down the Ember foreman'),
                ],
            },
            {
                title: 'Plasma for the Foundry',
                description: 'Helios Foundry needs plasma ore under the flares. Mine it, then escort the tanker through its run.',
                stages: [stage('mining', 6, 10 + 2*n, 'Mine plasma ore'), stage('escort', 6, 1, 'Escort the plasma tanker')],
            },
        ],
        [
            {
                title: 'Signals from the dark',
                description: 'An old guild beacon calls from the Void. Find it, keep the relay lit while the Armada comes for it, and recover the beacon.',
                stages: [
                    stage('scan', 7, 16 + n, 'Trace the guild signal', {beacon: 0}),
                    stage('defend', 7, 50 + 5*n, 'Keep the relay lit', {beacon: 1}),
                    stage('recover', 7, 15, 'Recover the guild beacon'),
                ],
            },
            {
                title: 'Void matter',
                description: 'The Citadel pays for void matter, and a Void hunter guards the field. Mine a load, then drive the hunter off.',
                stages: [stage('mining', 7, 10 + 2*n, 'Mine void matter'), stage('elite', 7, 1, 'Drive off the Void hunter')],
            },
        ],
    ][id];
}

// What a station offers: its world's two own contracts, a sealed dispatch and a supply run to a neighbour, and with
// rank a commander bounty and a frontier expedition. A neighbour is a linked world you have reached, so a contract
// never sends you where your ship cannot go yet; a delivery to it is a run under pursuit (update_intercepts)
function offered_jobs()
{
    ensure_career();
    const id = campaign.world;
    const w = worlds[id];
    const rank = pilot_rank();
    const level = Math.min(12, 1 + Math.floor(campaign.completed/8));
    const n = level - 1;
    const reached = w.links.filter(v => campaign.visited.includes(v));
    const links = reached.length ? reached : w.links;
    const other = links[(campaign.board || 0) % links.length];
    const out = world_contracts(id, level);
    out.push({
        title: `Sealed dispatch to ${worlds[other].name}`,
        description: `A sealed dispatch for ${worlds[other].station}. Raiders know a guild package when they see one: expect a wing on the way in, then hold the relay that receives it.`,
        stages: [
            stage('courier', other, 1, `Run the dispatch to ${worlds[other].station}`),
            stage('defend', other, 40 + 5*n, 'Protect the receiving relay'),
        ],
    });
    const supply = supply_run(id, links, level);
    if (supply) {
        out.push(supply);
    }
    // a ring race against rivals on a course off the station (js/race.js)
    const race_job = race_offer(id, level);
    if (race_job) {
        out.push(race_job);
    }
    if (rank >= 2) {
        out.push({
            title: `Commander bounty / ${w.faction}`,
            description: `A named ${w.faction} commander has a price on its head. Track it, break its honor guard, and destroy it.`,
            premium: 1.4,
            stages: [
                stage('scan', id, 16 + n, 'Locate the commander', {beacon: 1}),
                stage('hunt', id, 6 + n, 'Break the honor guard'),
                stage('elite', id, 1, 'Defeat the commander'),
            ],
        });
    }
    if (rank >= 4) {
        out.push({
            title: `Frontier expedition ${campaign.expedition} / ${w.name}`,
            description: `An escalating expedition into ${worlds[other].name}: survey the route here, then hold a relay there, defeat its guardian and extract the archive. Each completed expedition opens the next.`,
            premium: 1.7,
            expedition: true,
            stages: [
                stage('scan', id, 22 + n, 'Survey the expedition route', {beacon: 2}),
                stage('defend', other, 70 + 6*n, 'Hold the frontier relay'),
                stage('elite', other, 1, 'Defeat the expedition guardian'),
                stage('recover', other, 20, 'Extract the archive'),
            ],
        });
    }
    for (const m of out) {
        m.type = m.stages[0].type;
        m.world = m.stages[0].world;
        m.target = m.stages[0].target;
        m.level = level;
        m.reward = contract_reward(m.stages, id, level, m.premium || 1);
        m.description += ` ${m.stages.map(v => v.title).join(' → ')}.`;
    }
    // side missions written as files, in their world, until done
    for (const v of side_missions.filter(vv => (vv.world === id) && !(campaign.sides_done || []).includes(vv.file))) {
        out.unshift({...clone(v), level, side: v.file});
    }
    return out;
}

// A trade run from this world's cheapest good to the neighbour that pays most for it; none when no neighbour pays
// enough more to be worth the trip
function supply_run(id, links, level)
{
    const prices = worlds[id].prices;
    const index = prices.indexOf(Math.min(...prices));
    const target = links.slice().sort((a, b) => worlds[b].prices[index] - worlds[a].prices[index])[0];
    if (worlds[target].prices[index] < prices[index] + 8) {
        return null;
    }
    const amount = Math.min(12, 5 + level);
    const good = commodities[index];
    return {
        title: `Supply run: ${good.name} to ${worlds[target].name}`,
        description: `${worlds[target].station} is short of ${good.name.toLowerCase()}, and ${worlds[id].station} sells them cheap. Buy ${amount} here, carry them through, and sell them there: the margin is yours as well. Goods bought at ${worlds[target].station} itself do not count.`,
        stages: [stage('trade', target, amount, `Sell ${amount} ${good.name.toLowerCase()} at ${worlds[target].station}`, {commodity: good.key})],
    };
}

// Minutes a stage takes at level 1, timed by playing them; a delivery to another world adds its jumps and the
// interception on the way
function stage_minutes(v, from)
{
    const jumps = Math.max(0, route_from_world_to_world(from, v.world).length - 1);
    const travel = jumps ? 0.6*jumps + 0.5 : 0;
    const minutes = {
        scan: 0.5 + v.target*0.045,
        hunt: 0.3 + v.target*0.08,
        recover: 0.5 + v.target*0.04,
        defend: 0.3 + v.target/60,
        elite: 1.2,
        boss: 2.5,
        escort: 2.5,
        mining: 0.3 + v.target*0.04,
        courier: 0.3,
        trade: 0.5,
        lure: 3,
        race: 0.5 + v.target*0.12,
    }[v.type] ?? 1;
    // a convoy's run here is as long as its route: a minute in Haven, three in the far worlds
    if ((v.type === 'escort') && (v.world === campaign.world)) {
        const route = escort_route();
        const length = distance(route.start, route.stops[0]) + distance(route.stops[0], route.stops[1]);
        return 0.3 + (length/escort_speed + escort_stop_times.load + escort_stop_times.unload)/60;
    }
    return minutes + travel;
}

// A contract pays for its minutes: more in the farther worlds and at higher levels, more again for rank-gated work
function contract_reward(stages, id, level, premium = 1)
{
    let minutes = 0;
    let from = id;
    for (const v of stages) {
        minutes += stage_minutes(v, from);
        from = v.world;
    }
    return Math.round((minutes*105*(1 + 0.2*world_tier(id))*(1 + 0.1*(level - 1))*premium)/10)*10;
}

function guide_base_claim_contract(id)
{
    const m = campaign.contracts.find(v => v.id === id);
    if ((state !== 'upgrade') || !m?.ready) {
        return;
    }
    const old_rank = pilot_rank();
    if (m.side) {
        campaign.sides_done = [...(campaign.sides_done || []), m.side];
    }
    // a contract's experience is its pay: the raiders you destroy on the way bring the most of it (kill_xp)
    const xp = m.reward;
    play_log_contract('claimed', m, {xp});
    campaign.xp += xp;
    play_log_xp('contract', xp);
    campaign.reputation[m.issuer] = (campaign.reputation[m.issuer] || 0) + 1;
    if (m.expedition) {
        campaign.expedition++;
    }
    expedition_base_guide_base_claim_contract(id);
    if (pilot_rank() > old_rank) {
        show_toast('PILOT PROMOTED', `${rank_names[pilot_rank()].toUpperCase()} / NEW HANGAR AND ARSENAL LICENSES`, 5);
    }
}

function build_guide_context()
{
    const out = expedition_base_guide_context();
    // a race under way leads, whatever contract is followed
    const racing = race_running() ? campaign.contracts.find(v => v.id === race.id) : null;
    if (racing) {
        race_guide(out, racing);
        return out;
    }
    const m = out.mission;
    if (!m) {
        return out;
    }
    if (m.stages) {
        out.title = `${m.title} · ${Math.min(m.stage_index + 1, m.stages.length)}/${m.stages.length}`;
        const claim = out.plan.filter(v => v.title.startsWith('Collect ◆'));
        out.plan = out.plan.filter(v => !v.title.startsWith('Collect ◆'));
        for (let i = 0, end = m.stages.length; i < end; ++i) {
            const stage = m.stages[i];
            out.plan.push({
                title: `STAGE ${i + 1} / ${stage.title}`,
                text: `${worlds[stage.world].name} · ${stage_description(stage, m, i)}`,
                done: (i < m.stage_index) || m.ready,
            });
        }
        out.plan.push(...claim);
    }
    if (m.ready || (out.kind === 'prepare') || (out.kind === 'jump') || guide_manual) {
        return out;
    }
    if ((m.type === 'race') && (m.world === campaign.world) && m.race) {
        race_guide(out, m);
        return out;
    }
    if ((m.type === 'lure') && (m.world === campaign.world)) {
        out.goal = lure_goal(m) || out.goal;
        out.kind = 'lure';
        out.action = 'Fly to the black hole';
        out.instruction = stage_description(m.stages?.[m.stage_index] || m, m, m.stage_index);
        return out;
    }
    if (['scan', 'defend', 'recover', 'elite'].includes(m.type) && (m.world === campaign.world)) {
        const p = operation_point(m);
        out.goal = {...p, label: m.stages?.[m.stage_index]?.title || m.type.toUpperCase()};
        out.kind = m.type;
        out.action = 'Fly to objective';
        out.instruction = stage_description(m.stages?.[m.stage_index] || m, m, m.stage_index);
    }
    // a mining stage with every drone lost cannot go on: the guide sends you to the station to replace them
    if ((m.type === 'mining') && (m.world === campaign.world) && !drones_owned() && !drones.length) {
        out.goal = {...station, label: worlds[campaign.world].station};
        // docked, the guide's button opens MODULES, where the drones are sold
        out.kind = (state === 'upgrade') ? 'prepare' : 'station';
        out.purchases = [];
        out.action = (state === 'upgrade') ? 'Open modules' : 'Fly to station';
        out.instruction = `Your mining drones are all lost. Dock at ${worlds[campaign.world].station} and buy new ones in MODULES, then come back to the field.`;
    }
    if ((m.type === 'escort') && (m.world === campaign.world) && escort) {
        out.instruction =
            `Cargo run, stop ${escort.leg + 1}/${escort.stops.length}: ${escort.stops[escort.leg].label} · hull ${Math.ceil(escort.hp)}/${escort.max_hp || escort_hull}. Stay within ${escort_leash} m so it keeps moving; raiders strike at the stops.`;
    }
    return out;
}

function stage_description(v, m, index)
{
    const current = index === m.stage_index;
    const left = Math.max(0, v.target - (current ? m.progress : 0));
    if (v.type === 'scan') {
        return `Within ${survey_launch_range} m of beacon ${(v.beacon || 0) + 1} you launch a survey robot. Guard it while it scans: ${Math.ceil(left)} seconds of scanning left. Raiders go for it: with one close it scans at half speed, and a lost robot sets the scan back a third. It scans only while you are within ${survey_cover_range} m. Progress is saved.`;
    }
    if (v.type === 'defend') {
        return `Defend the relay for ${Math.ceil(left)} seconds within 450 m. Raider waves arrive every 12 seconds. Leaving the ring slowly loses defense progress.`;
    }
    if (v.type === 'recover') {
        return `Clear the marked ambush, then hold within 150 m of the recovery signal for ${Math.ceil(left)} seconds; halfway through, reinforcements come and the hold waits until they are cleared. The sealed recovery item uses no cargo space.`;
    }
    if (v.type === 'elite') {
        return 'Approach the combat zone and destroy its marked elite commander. Ion strips shields; railguns bypass thick armor.';
    }
    if (v.type === 'escort') {
        return `Meet the freighter beside the station and escort its cargo run: it loads at a mining field, then unloads at the station, ${(v.world === campaign.world) ? escort_route_text(escort || escort_route()) : 'about 2-3 min'}. Stay within ${escort_leash} m so it keeps moving; raiders strike at the stops. G flies you in formation behind it.`;
    }
    // a delivery from another world is intercepted on the way (update_intercepts)
    const from = index ? m.stages[index - 1].world : (m.issuer ?? campaign.world);
    const pursuit = (from !== v.world) ? ' Raiders know what you carry: a wing comes for it once in each world you enter, this one included. Fight them off or outfly them to the berth.' : '';
    if (v.type === 'courier') {
        return `The sealed cargo is already aboard and takes no space. Dock at ${worlds[v.world].station} with R to deliver it.${pursuit}`;
    }
    if (v.type === 'trade') {
        const key = v.commodity || m.commodity;
        const good = commodities.find(vv => vv.key === key);
        // a world's own resource is only mined, in its rich rocks; a common good can be bought, but not where it is sold
        const source = resource_of(key)
            ? `the drones cut it from the rich rocks of ${worlds[resource_of(key).world].name}`
            : `mine or buy it elsewhere, since what you buy at ${worlds[v.world].station} itself does not count`;
        return `Sell ${Math.ceil(left)} ${good.name.toLowerCase()} at ${worlds[v.world].station}, from your own hold: ${source}.${pursuit}`;
    }
    if (v.type === 'mining') {
        return `Mine ${Math.ceil(left)} units from the deposits: launch your drones (H) at a mining field, and each chunk they drill counts. FLY TO OBJECTIVE leads to the nearest field. Raiders hunt the drones: replace lost ones in a station's MODULES. A Prospector extracts ore 2.5× faster. You keep the salvage and cargo.`;
    }
    if (v.type === 'boss') {
        return 'Approach the marked flagship zone and destroy the warship. Prepare your ship and weapon tier before jumping.';
    }
    if (v.type === 'race') {
        return `Fly to the start line off ${worlds[v.world].station} and into your place: the rivals line up beside you and the count runs (no raider comes while you race; one already at the line holds it until it is shot or pulls back). Then through the ${v.target} rings in order, the last one the finish. Your place and the time set the prize: first pays most, and every second under par pays more. Flying ${race_leash/1000} km off the course for ${race_leash_time} s, docking or a jump forfeits; the start line waits for another try.`;
    }
    if (v.type === 'lure') {
        return 'Fly to the marked black hole and the Leviathan comes for you. Guns cannot hurt it. Keep ahead of it and lead it across the pull: your ship climbs out, its thrust cannot, and the core takes it. Keep clear of the core yourself.';
    }
    return `Destroy ${Math.ceil(left)} raiders in ${worlds[v.world].name}: any raider you destroy there counts, wherever you meet it.`;
}

function render_contracts(parent, board = false)
{
    // the station on the UI kit draws its own contract cards, stage and all
    if (board && parent.closest('.ui')) {
        render_station_contracts(parent);
        return;
    }
    expedition_base_render_contracts(parent, board);
    for (let i = 0, end = campaign.contracts.length; i < end; ++i) {
        const contract = campaign.contracts[i];
        const c = parent.children[i];
        if (!c) {
            continue;
        }
        const p = document.createElement('p');
        p.className = 'contract-guidance';
        p.textContent = contract.stages
            ? `STAGE ${contract.stage_index + 1}/${contract.stages.length} · ${contract.stages[contract.stage_index].title} · ${Math.floor(contract.progress)}/${contract.target} · ${contract.ready ? 'REPORT AT STATION' : stage_description(contract.stages[contract.stage_index], contract, contract.stage_index)}`
            : `Classic contract · ${Math.floor(contract.progress)}/${contract.target}`;
        c.append(p);
    }
    if (board) {
        const p = document.createElement('p');
        p.className = 'contract-guidance';
        p.style.gridColumn = '1 / -1';
        p.textContent =
            'Contracts now have several stages. Accept up to 3, press Follow on one, and the guide takes you through its stages. Promotions unlock ship classes and weapons. Higher-ranked operations pay more and send stronger squads.';
        parent.prepend ? parent.prepend(p) : parent.append(p);
    }
}

function render_station()
{
    ensure_career();
    expedition_base_render_station();
    sync_sell_all_button();
    const parent = document.getElementById('station_content');
    const rank = pilot_rank();
    if ((station_tab === 'hangar') || (station_tab === 'arsenal') || (station_tab === 'career') || (station_tab === 'intel')) {
        parent.replaceChildren();
        set_hidden(el.shop_grid, true);
        set_hidden(document.getElementById('outfit_heading'), true);
    }
    if (station_tab === 'intel') {
        render_trade_intel(parent);
    }
    if (station_tab === 'hangar') {
        for (const v of ship_catalog) {
            render_hangar_card(parent, v);
        }
        ui_text_clamp(parent);
    }
    if (station_tab === 'arsenal') {
        render_arsenal(parent);
    }
    if (station_tab === 'career') {
        render_station_goals(parent);
    }
    el.dock_summary.textContent = `${current_ship().name} · rank ${rank_names[rank]} · story ${campaign.story}/${story.length}`;
    if (['hangar', 'arsenal'].includes(station_tab)) {
        el.dock_status.textContent = 'Ships and guns stay yours. Guns move between ships with their mounts; switching ships repairs the hull.';
    }
    if (station_tab === 'career') {
        el.dock_status.textContent = 'One goal at a time; its next step shows in the HUD and on the map.';
    }
    if (station_tab === 'jobs') {
        el.dock_status.textContent = 'Choose a contract or collect a completed reward. Your progress saves automatically.';
    }
    else if (station_tab === 'market') {
        el.dock_status.textContent = 'Pick a quantity, then Buy or Sell. All buys what fits your hold and your salvage.';
    }
    else if (station_tab === 'intel') {
        el.dock_status.textContent = 'Station demand pays a limited premium. Prices and route margins update after each trade.';
    }
    else if (station_tab === 'outfit') {
        el.dock_status.textContent = 'Modules transfer between ships. Equip your ship and weapon before checking world-gate requirements.';
    }
}

// A ship in the HANGAR, picture first: its live preview, its role as a tag, its name, three lines of text, then
// hull, shield, speed and cargo as bars against the best ship (green above yours, red below), its mounts by size, its
// radiation shielding, gravity thrust, brakes and turbo as chips, and the worlds it suits as their badges
function render_hangar_card(parent, v)
{
    const f = campaign.fleet;
    const owned = f.ships.includes(v.id);
    const selected = f.ship_id === v.id;
    // a ship not yet on sale says where it opens, before the rank it needs
    const closed = !owned && !tech_open(v.opens);
    const locked = !owned && (closed || (pilot_rank() < v.rank));
    const oversize = cargo_count() > v.cargo;
    const action = selected
        ? 'ACTIVE SHIP'
        : closed
            ? tech_lock_text(v.opens).toUpperCase()
            : locked
                ? `REQUIRES ${rank_names[v.rank].toUpperCase()}`
                : oversize
                    ? 'SELL CARGO TO SWITCH'
                    : owned
                        ? 'SWITCH SHIP'
                        : `BUY · ◆ ${v.price}`;
    const c = card(parent, v.name, v.description, '', action, () => fleet_purchase(v.id, 'ship'),
        selected || locked || oversize || (!owned && (salvage < v.price)), selected ? 'active' : '');
    // the kit's button writes its label in sentence case: the world and the rank keep their names
    const label = locked && c.querySelector('.foot .btn > span');
    if (label) {
        label.textContent = closed ? tech_lock_text(v.opens) : `Requires ${rank_names[v.rank]}`;
    }
    const art = document.createElement('div');
    art.className = 'fleet-silhouette';
    art.innerHTML = ship_svg(v);
    c.append(art);
    const foot = c.querySelector('.foot');
    // off the kit (no foot) the card keeps its name, text and picture
    if (!foot) {
        return;
    }
    c.classList.add('hangar-card');
    c.querySelector('p.small')?.classList.add('clamp');
    c.querySelector('.h-card').insertAdjacentHTML('beforebegin', `<div class="meta">${ui_badge(v.role)}${selected ? ui_badge('Flying', 'cyan') : owned ? ui_badge('Yours') : ''}</div>`);
    foot.insertAdjacentHTML('beforebegin', hangar_specs_html(v, owned));
    // a ship your rank does not license yet: the XP it asks and yours, whether or not its world is open
    if (!owned && (pilot_rank() < v.rank)) {
        foot.insertAdjacentHTML('beforebegin', `<div class="ship-row" title="XP: the hull of every raider you destroy, and each contract as much as it pays"><span class="eyebrow eyebrow--muted">Licence</span><span class="badge badge--locked">${ui_lock_svg}${rank_names[v.rank]}</span><span class="ship-xp">${xp_need_text(v.rank)}</span></div>`);
    }
}

// What a ship is, as pictures and numbers: bars, mounts, chips and the worlds it suits
function hangar_specs_html(ship, owned)
{
    const mine = current_ship();
    const bars = [
        ['Hull', ship.hull, mine.hull, String(ship.hull)],
        ['Shield', ship.shield, mine.shield, `+${ship.shield}`],
        ['Speed', ship.speed, mine.speed, `${Math.round(ship.speed*100)}%`],
        ['Cargo', ship.cargo, mine.cargo, String(ship.cargo)],
    ].map(function ([name, value, now, text]) {
        const best = Math.max(...ship_catalog.map(v => v[name.toLowerCase()]));
        const mark = (ship.id === mine.id) ? '' : (value > now) ? ' is-up' : (value < now) ? ' is-down' : '';
        const width = Math.round((value/best)*100);
        return `<div class="ship-bar${mark}" title="${name} ${text}: the best ship has ${(name === 'Speed') ? `${Math.round(best*100)}%` : best}"><span class="lbl">${name}</span><span class="track"><b style="width:${width}%"></b></span><span class="val">${text}</span></div>`;
    }).join('');
    const sizes = ship_mounts(ship);
    const mounts = gun_sizes.filter(v => sizes.includes(v)).map(function (size) {
        return `<span class="ship-mount">${sizes.filter(v => v === size).length}×${ui_size(size)}</span>`;
    }).join('');
    const empty = owned ? ship_loadout(ship).filter(v => !v).length : 0;
    const turbo = 8 + ship.endurance + upgrades.turbo_tank*3;
    // each chip names itself in words a screen reader and the captain's agent read (the label is hidden on screen)
    const chips = [
        ['rad', 'radiation shielding', `${Math.round(radiation_protection(ship)*100)}%`, `Radiation shielding ${Math.round(radiation_protection(ship)*100)}%: ${Math.round(ship.radiation*100)}% from the hull, the rest from your radiation lining`],
        ['thrust', 'gravity thrust', `×${ship.traction}`, `Gravity thrust ×${ship.traction}: how well it climbs out of a pull`],
        ['brakes', 'brakes', `×${ship.braking}`, `Brakes ×${ship.braking}`],
        ['turbo', 'turbo', `${turbo}s`, `Turbo ${turbo} s with your booster reservoir`],
    ].map(v => `<span class="ship-chip" title="${v[3]}">${hangar_icons[v[0]]}<span class="visually-hidden">${v[1]} </span>${v[2]}</span>`).join('');
    const suits = expedition_conditions.map((e, i) => ((e.ship === ship.id) ? ui_world_badge(i) : '')).join('');
    return `<div class="ship-bars">${bars}</div>`
        + `<div class="ship-row"><span class="eyebrow eyebrow--muted">Guns</span>${mounts}${empty ? `<span class="ship-empty">${empty} empty</span>` : ''}</div>`
        + `<div class="ship-chips">${chips}</div>`
        + (suits ? `<div class="ship-row" title="The worlds whose conditions this hull suits"><span class="eyebrow eyebrow--muted">Suits</span>${suits}</div>` : '');
}

// The HANGAR chips' small icons, in the text's colour: a radiation trefoil, an arrow out of a pull, brakes, a flame
const hangar_icons = {
    rad: '<svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="1.6"/><path d="M8 6 L5 1.2 A7 7 0 0 1 11 1.2 Z M9.7 9 L15 9 A7 7 0 0 1 12 14.2 Z M6.3 9 L4 14.2 A7 7 0 0 1 1 9 Z"/></svg>',
    thrust: '<svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 10 V1.5 M4.5 5 L8 1.5 L11.5 5"/><path d="M1.5 15 A8 5 0 0 1 14.5 15"/></svg>',
    brakes: '<svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="8" cy="8" r="6"/><path d="M5 5 L11 11"/></svg>',
    turbo: '<svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0.8 C9 4 13 6 13 10 A5 5 0 0 1 3 10 C3 7.5 5 6.5 5.5 4.5 C6.5 6 7 7 6.8 8.5 C8.5 7 9 4 8 0.8 Z"/></svg>',
};

function ship_outline(shape)
{
    return [
        [
            [21, 0],
            [-13, -12],
            [-7, 0],
            [-13, 12],
        ],
        [
            [25, 0],
            [9, -13],
            [-18, -13],
            [-23, -7],
            [-15, 0],
            [-23, 7],
            [-18, 13],
            [9, 13],
        ],
        [
            [28, 0],
            [-20, -20],
            [-9, -5],
            [-12, 0],
            [-9, 5],
            [-20, 20],
        ],
        [
            [20, 0],
            [12, -16],
            [-20, -16],
            [-25, -9],
            [-18, -9],
            [-18, 9],
            [-25, 9],
            [-20, 16],
            [12, 16],
        ],
        [
            [27, 0],
            [8, -10],
            [-1, -23],
            [-22, -21],
            [-17, -8],
            [-23, 0],
            [-17, 8],
            [-22, 21],
            [-1, 23],
            [8, 10],
        ],
        [
            [32, 0],
            [12, -12],
            [6, -25],
            [-25, -25],
            [-29, -12],
            [-19, 0],
            [-29, 12],
            [-25, 25],
            [6, 25],
            [12, 12],
        ],
    ][shape || 0];
}

function update_frontier(dt)
{
    ensure_career();
    for (const enemy of enemies) {
        if (!enemy.disrupted) {
            continue;
        }
        enemy.disrupted.time -= dt;
        if (enemy.disrupted.time <= 0) {
            enemy.speed = enemy.disrupted.speed;
            enemy.disrupted = null;
        }
    }
    refresh_mining_resources(false, dt);
    expedition_base_update_frontier(dt);
    if (state !== 'playing') {
        return;
    }
    update_operations(dt);
}

function render_navigation_objects()
{
    expedition_base_render_navigation_objects();
    render_drifting_debris();
    render_engine_plumes();
    ctx.save();
    for (const m of campaign.contracts.filter(v => !v.ready && (v.world === campaign.world) && ['scan', 'defend', 'recover', 'elite'].includes(v.type))) {
        const p = operation_point(m);
        if (!in_view(p, 600)) {
            continue;
        }
        const radius = (m.type === 'defend') ? 450 : 150;
        ctx.strokeStyle = gold;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 12]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI*2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = 'bold 11px ui-monospace,monospace';
        ctx.fillStyle = gold;
        ctx.textAlign = 'center';
        ctx.fillText((m.stages?.[m.stage_index]?.title || m.title).toUpperCase(), p.x, p.y - radius - 28);
        ctx.fillText(`${Math.floor(m.progress)} / ${m.target}${(m.type === 'elite') ? ' TARGET' : ' SECONDS'}`, p.x, p.y - radius - 12);
    }
    for (const enemy of enemies.filter(v => v.elite && (v.hp > 0))) {
        ctx.strokeStyle = pink;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.r + 12, 0, Math.PI*2);
        ctx.stroke();
        ctx.fillStyle = pink;
        ctx.font = 'bold 10px ui-monospace,monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`ELITE / ${Math.ceil(enemy.hp)}`, enemy.x, enemy.y - enemy.r - 20);
    }
    ctx.restore();
}

function render_inventory()
{
    expedition_base_render_inventory();
    el.inventory_grid.append(ui_card({
        tags: ui_badge('Your ship', 'cyan'),
        title: current_ship().name,
        text: `${guns_text()}. Hull ${hull_max()} · cargo ${cargo_count()}/${cargo_capacity()} · ${rank_names[pilot_rank()]}. Change it at a station's HANGAR and ARSENAL.`,
    }));
}

function reset_run(resume = false)
{
    portal_leg_cache.clear();
    guide_context_cache = null;
    guide_context_cache_key = '';
    expedition_base_reset_run(resume);
    ensure_career();
    for (const contract of campaign.contracts) {
        if (contract.type === 'recover') {
            contract.ambush = false;
        }
    }
    player.r = current_ship().radius;
    player.hp = Math.min(hull_max(), player.hp);
    ensure_markets();
    update_hud();
    if (state === 'upgrade') {
        render_station();
    }
    play_log_run_start(resume);
}

function update_hud()
{
    // the outermost call writes the HUD's text once, at its end (hud_flush)
    if (hud_pending) {
        update_hud_layers();
        return;
    }
    hud_pending = new Map();
    try {
        update_hud_layers();
    }
    finally {
        hud_flush();
    }
}

function update_hud_layers()
{
    sync_minimap_button();
    expedition_base_update_hud();
    if (!player) {
        return;
    }
    const m = focused_contract();
    if (m?.stages) {
        hud_text(el.mission_phase, m.ready
            ? `DOCK TO CLAIM ◆ ${m.reward}`
            : `STAGE ${m.stage_index + 1}/${m.stages.length} · ${Math.floor(m.progress)}/${m.target}`);
        el.sector_progress.style.width = `${((m.stage_index + Math.min(1, m.progress/m.target))/m.stages.length)*100}%`;
    }
    update_expedition_readout();
    goal_tick();
    charting_tick();
    sync_hud_kit();
    if (arcade.active) {
        arcade_update_hud();
    }
}
