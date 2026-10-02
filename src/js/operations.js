function stage(type, world, target, title, extra = {})
{
    return {type, world, target, title, ...extra};
}
const expanded_story_stages = [
    [
        stage('scan', 0, 12, 'Calibrate the mining scanner', {beacon: 0}),
        stage('mining', 0, 10, 'Extract trial ore'),
        stage('courier', 0, 1, 'Return the analysis to Haven'),
    ],
    [
        stage('scan', 1, 18, 'Locate the swarm nest', {beacon: 1}),
        stage('hunt', 1, 14, 'Break the swarm patrol'),
        stage('recover', 1, 12, 'Retrieve the nest telemetry'),
        stage('courier', 0, 1, 'Bring telemetry back to Haven'),
    ],
    [
        stage('courier', 2, 1, 'Deliver the sealed navigation core'),
        stage('defend', 2, 65, 'Hold the refinery relay'),
        stage('courier', 0, 1, 'Return the refinery response'),
    ],
    [
        stage('scan', 3, 20, 'Align beacon alpha', {beacon: 0}),
        stage('scan', 3, 20, 'Align beacon beta', {beacon: 1}),
        stage('scan', 3, 20, 'Align beacon gamma', {beacon: 2}),
        stage('recover', 3, 15, 'Extract the storm log'),
        stage('courier', 1, 1, 'Deliver the survey log'),
    ],
    [
        stage('scan', 4, 22, 'Identify the blockade command ship', {beacon: 1}),
        stage('hunt', 4, 20, 'Thin the blockade'),
        stage('elite', 4, 1, 'Disable the Iron commander'),
        stage('courier', 3, 1, 'Transmit the liberated route'),
    ],
    [
        stage('mining', 5, 18, 'Gather frozen relic ore'),
        stage('defend', 5, 85, 'Protect the extraction relay'),
        stage('escort', 5, 1, 'Escort the sample freighter'),
        stage('courier', 4, 1, 'Deliver the cold-storage manifest'),
    ],
    [
        stage('scan', 6, 25, 'Locate the flagship reactor', {beacon: 2}),
        stage('hunt', 6, 16, 'Destroy reactor pickets'),
        stage('boss', 6, 1, 'Destroy the Ember flagship'),
        stage('recover', 6, 18, 'Recover the reactor core'),
        stage('courier', 4, 1, 'Deliver the reactor core'),
    ],
    [
        stage('scan', 7, 28, 'Reveal the Void signature', {beacon: 0}),
        stage('defend', 7, 100, 'Keep the last-light relay active'),
        stage('boss', 7, 1, 'Destroy the Void Dreadnought'),
        stage('recover', 7, 20, 'Recover the frontier archive'),
        stage('courier', 0, 1, 'Bring the archive home'),
    ],
];
for (let i = 0, end = story.length; i < end; ++i) {
    const m = story[i];
    m.stages = expanded_story_stages[i];
    m.reward = Math.round(m.reward*1.8);
    m.description += ' A multi-stage operation: ' + m.stages.map(v => v.title).join(' → ') + '.';
}
const second_act = [
    [
        'Routes worth defending',
        0,
        [
            stage('scan', 0, 20, 'Trace a stolen convoy', {beacon: 2}),
            stage('escort', 2, 1, 'Protect the relief convoy'),
            stage('elite', 2, 1, 'Break the pursuit'),
            stage('courier', 0, 1, 'Report the safe route'),
        ],
        1200,
    ],
    [
        'The living archive',
        1,
        [
            stage('recover', 1, 20, 'Retrieve the seed archive'),
            stage('defend', 1, 100, 'Keep the archive relay online'),
            stage('courier', 5, 1, 'Deliver to cryogenic storage'),
        ],
        1450,
    ],
    [
        'A profitable detour',
        2,
        [
            stage('mining', 2, 24, 'Extract refinery ore'),
            stage('trade', 4, 16, 'Supply the Iron foundry', {commodity: 'ore'}),
            stage('escort', 4, 1, 'Protect the outbound carrier'),
        ],
        1700,
    ],
    [
        'Stormbreaker network',
        3,
        [
            stage('scan', 3, 25, 'Align the storm relay', {beacon: 1}),
            stage('elite', 3, 1, 'Eliminate the Volt marshal'),
            stage('defend', 5, 115, 'Hold the cold relay'),
            stage('courier', 0, 1, 'Return the network key'),
        ],
        1850,
    ],
    [
        'The shattered armistice',
        4,
        [
            stage('hunt', 4, 26, 'Break the occupation fleet'),
            stage('elite', 4, 1, 'Defeat the Dominion admiral'),
            stage('recover', 4, 22, 'Recover the treaty'),
            stage('courier', 1, 1, 'Deliver the treaty'),
        ],
        2150,
    ],
    [
        'Pilgrims of the ice',
        5,
        [
            stage('scan', 5, 28, 'Find the lost pilgrims', {beacon: 2}),
            stage('escort', 5, 1, 'Protect the pilgrim freighter'),
            stage('defend', 3, 120, 'Defend the resupply relay'),
            stage('courier', 0, 1, 'Return the pilgrim manifest'),
        ],
        2350,
    ],
    [
        'A second sunrise',
        6,
        [
            stage('mining', 6, 26, 'Collect reactor material'),
            stage('elite', 6, 1, 'Defeat the Forge warden'),
            stage('boss', 6, 1, 'Silence the Helios warship'),
            stage('courier', 3, 1, 'Deliver the reactor blueprint'),
        ],
        2700,
    ],
    [
        'Beyond the last light',
        7,
        [
            stage('scan', 7, 30, 'Chart the outer darkness', {beacon: 2}),
            stage('elite', 7, 1, 'Break the Void honor guard'),
            stage('defend', 7, 140, 'Stabilize the frontier beacon'),
            stage('boss', 7, 1, 'Defeat the reborn dreadnought'),
            stage('recover', 7, 25, 'Recover the expedition charter'),
            stage('courier', 0, 1, 'Found the expedition guild'),
        ],
        3400,
    ],
];
for (const v of second_act) {
    story.push({
        title: v[0],
        type: v[2][0].type,
        world: v[1],
        target: v[2][0].target,
        reward: v[3],
        stages: v[2],
        description: 'Chapter II operation: ' + v[2].map(v => v.title).join(' → ') + '.',
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
    m.escort_state = null;
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
            m.stage_index++;
            sync_stage(m);
            show_toast('NEXT OPERATION STAGE', m.stages[m.stage_index].title + ' / ' + worlds[m.world].name, 4);
        }
        else {
            m.ready = true;
            show_toast('OPERATION COMPLETE', m.title + ' / DOCK TO COLLECT ◆ ' + m.reward, 4);
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

function update_operations(dt)
{
    for (const m of campaign.contracts.filter(v => !v.ready && (v.world === campaign.world))) {
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
            show_toast(
                (m.type === 'defend') ? 'RELAY DEFENSE' : (m.type === 'elite') ? 'COMMANDER CONTACT' : 'SIGNAL ACQUIRED',
                (m.type === 'scan')
                    ? 'HOLD WITHIN 150 m TO SCAN'
                    : (m.type === 'recover')
                        ? 'CLEAR THE AMBUSH, THEN HOLD WITHIN 150 m'
                        : (m.type === 'defend')
                            ? 'STAY WITHIN 450 m / CLEAR RAIDERS'
                            : 'DEFEAT THE MARKED ELITE',
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
            if (!m.ambush) {
                m.ambush = true;
                spawn_operation_enemy(m, 'shooter', point);
            }
            if (d < 150) {
                mission_event('scan', dt*(nearest_enemy(player, 240) ? 0.3 : 1), {contract_id: m.id});
            }
        }
        if ((m.type === 'recover') && !raiders && (d < 150)) {
            mission_event('recover', dt, {contract_id: m.id});
        }
        if (m.type === 'defend') {
            m.spawn_clock -= dt;
            if ((m.spawn_clock <= 0) && (enemies.length < 21)) {
                m.spawn_clock = 12;
                for (let i = 0; i < 2 + Math.min(2, m.level || 1); ++i) {
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
    expedition_base_damage_enemy(enemy, damage);
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

function update_escort(dt)
{
    const m = campaign.contracts.find(v => !v.ready && (v.type === 'escort') && (v.world === campaign.world));
    if (!m) {
        escort = null;
        return;
    }
    if (!escort) {
        escort = m.escort_state
            ? clone(m.escort_state)
            : {
                x: station.x + 350,
                y: station.y + 250,
                hp: 300,
                active: false,
                spawn: 5,
                destination: {x: station.x - 1600, y: station.y + 700},
                leg: 0,
                legs: 3,
            };
    }
    if (!escort.active && (distance(player, escort) < 250)) {
        escort.active = true;
        show_toast('CONVOY UNDERWAY', 'PROTECT THREE ROUTE LEGS / KEEP WITHIN 800 m', 4);
    }
    if (!escort.active) {
        m.escort_state = clone(escort);
        return;
    }
    if (distance(player, escort) < 800) {
        const a = Math.atan2(escort.destination.y - escort.y, escort.destination.x - escort.x);
        escort.x += Math.cos(a)*70*dt;
        escort.y += Math.sin(a)*70*dt;
    }
    escort.spawn -= dt;
    if ((escort.spawn <= 0) && (enemies.length < 18)) {
        escort.spawn = 11;
        for (let i = 0; i < 2; ++i) {
            const enemy = spawn_operation_enemy(m, i ? 'chaser' : 'shooter', escort);
            enemy.escort_raider = true;
        }
    }
    for (const b of hostile) {
        if ((b.life > 0) && (distance(b, escort) < b.r + 20)) {
            escort.hp -= b.damage || 13;
            b.life = 0;
        }
    }
    for (const enemy of enemies) {
        if ((enemy.hp > 0) && (distance(enemy, escort) < enemy.r + 20)) {
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
    if (distance(escort, escort.destination) < 80) {
        escort.leg++;
        if (escort.leg >= escort.legs) {
            m.escort_state = null;
            escort = null;
            mission_event('escort', 1, {contract_id: m.id});
            return;
        }
        escort.hp = Math.min(300, escort.hp + 65);
        escort.destination = (escort.leg === 1) ? {...beacons[2]} : {x: station.x + 320, y: station.y - 280};
        show_toast('CONVOY CHECKPOINT ' + escort.leg + '/3', 'FIELD REPAIR +65 / NEXT ROUTE LEG', 3);
    }
    m.escort_state = clone(escort);
}

function offered_jobs()
{
    ensure_career();
    const id = campaign.world;
    const rank = pilot_rank();
    const level = Math.min(12, 1 + Math.floor(campaign.completed/8));
    const other = worlds[id].links[(campaign.board || 0) % worlds[id].links.length];
    const home = campaign.world;
    const out = expedition_base_offered_jobs().slice(0, 3);
    out[0].stages = [
        stage('scan', id, 12 + level*2, 'Locate the raider route', {beacon: (campaign.board || 0) % 3}),
        stage('hunt', id, 8 + id*2 + level*2, 'Clear the raiders'),
        stage('recover', id, 10, 'Retrieve the flight recorder'),
        stage('courier', home, 1, 'Return the flight recorder'),
    ];
    out[0].reward *= 2;
    out[1].stages = [
        stage('mining', id, 8 + level*2, 'Collect survey samples'),
        stage('scan', id, 15, 'Validate the mineral readings', {beacon: 2}),
        stage('courier', other, 1, 'Deliver the samples'),
    ];
    out[1].reward *= 2;
    out[2].stages = [
        stage('courier', other, 1, 'Deliver the dispatch'),
        stage('defend', other, 50 + level*5, 'Protect the receiving relay'),
        stage('courier', home, 1, 'Return the confirmation'),
    ];
    out[2].reward *= 2;
    out.push({
        title: 'Convoy: ' + worlds[id].name + ' relief route',
        description: 'Meet the convoy, protect three route legs, then deliver its manifest to another world.',
        reward: 450 + id*80 + level*50,
        stages: [stage('escort', id, 1, 'Protect the relief convoy'), stage('courier', other, 1, 'Deliver the convoy manifest')],
        type: 'escort',
        world: id,
        target: 1,
        level,
    });
    if (rank >= 2) {
        out.push({
            title: 'Commander bounty / ' + worlds[id].faction,
            description: 'Track a named commander, destroy its escorts, defeat the armored target, recover proof, then report.',
            reward: 650 + id*110 + level*80,
            type: 'scan',
            world: id,
            target: 18,
            level,
            stages: [
                stage('scan', id, 18, 'Locate the commander', {beacon: 1}),
                stage('hunt', id, 8 + level*2, 'Break the honor guard'),
                stage('elite', id, 1, 'Defeat the commander'),
                stage('recover', id, 15, 'Recover proof'),
                stage('courier', home, 1, 'Report the bounty'),
            ],
        });
    }
    if (rank >= 4) {
        out.push({
            title: 'Frontier expedition ' + campaign.expedition + ' / ' + worlds[id].name,
            description:
                'An escalating expedition: survey, defend, defeat an elite, recover an archive, and bring it home. Each completed expedition unlocks the next.',
            reward: 1100 + id*150 + level*140,
            type: 'scan',
            world: id,
            target: 25,
            level,
            expedition: true,
            stages: [
                stage('scan', id, 25, 'Survey the expedition route', {beacon: 2}),
                stage('defend', other, 80 + level*6, 'Hold the frontier relay'),
                stage('elite', other, 1, 'Defeat the expedition guardian'),
                stage('recover', other, 20, 'Extract the archive'),
                stage('courier', home, 1, 'Return the expedition archive'),
            ],
        });
    }
    for (const m of out) {
        m.reward = Math.round(m.reward);
        m.level = m.level || level;
        if (m.stages) {
            m.description += ' ' + m.stages.map(v => v.title).join(' → ') + '.';
        }
    }
    return out;
}

function guide_base_claim_contract(id)
{
    const m = campaign.contracts.find(v => v.id === id);
    if ((state !== 'upgrade') || !m?.ready) {
        return;
    }
    const old_rank = pilot_rank();
    const xp = Math.round(m.reward*0.28) + (m.stages?.length || 1)*18;
    campaign.xp += xp;
    campaign.reputation[m.issuer] = (campaign.reputation[m.issuer] || 0) + 1;
    if (m.expedition) {
        campaign.expedition++;
    }
    expedition_base_guide_base_claim_contract(id);
    if (pilot_rank() > old_rank) {
        show_toast('PILOT PROMOTED', rank_names[pilot_rank()].toUpperCase() + ' / NEW HANGAR AND ARSENAL LICENSES', 5);
    }
}

function build_guide_context()
{
    const out = expedition_base_guide_context();
    const m = out.mission;
    if (!m) {
        return out;
    }
    if (m.stages) {
        out.title = m.title + ' · ' + Math.min(m.stage_index + 1, m.stages.length) + '/' + m.stages.length;
        const claim = out.plan.filter(v => v.title.startsWith('Collect ◆'));
        out.plan = out.plan.filter(v => !v.title.startsWith('Collect ◆'));
        for (let i = 0, end = m.stages.length; i < end; ++i) {
            const stage = m.stages[i];
            out.plan.push({
                title: 'STAGE ' + (i + 1) + ' / ' + stage.title,
                text: worlds[stage.world].name + ' · ' + stage_description(stage, m, i),
                done: (i < m.stage_index) || m.ready,
            });
        }
        out.plan.push(...claim);
    }
    if (m.ready || (out.kind === 'prepare') || (out.kind === 'jump') || guide_manual) {
        return out;
    }
    if (['scan', 'defend', 'recover', 'elite'].includes(m.type) && (m.world === campaign.world)) {
        const p = operation_point(m);
        out.goal = {...p, label: m.stages?.[m.stage_index]?.title || m.type.toUpperCase()};
        out.kind = m.type;
        out.action = 'FLY TO OBJECTIVE';
        out.instruction = stage_description(m.stages?.[m.stage_index] || m, m, m.stage_index);
    }
    if ((m.type === 'escort') && (m.world === campaign.world) && escort) {
        out.instruction =
            'Convoy leg ' +
            (escort.leg + 1) +
            '/3 · Hull ' +
            Math.ceil(escort.hp) +
            '/300. Stay within 800 m and destroy attackers. Field repairs at each checkpoint.';
    }
    return out;
}

function stage_description(v, m, index)
{
    const current = index === m.stage_index;
    const left = Math.max(0, v.target - (current ? m.progress : 0));
    if (v.type === 'scan') {
        return (
            'Hold within 150 m of beacon ' + ((v.beacon || 0) + 1) + ' for ' + Math.ceil(left) + ' seconds. Nearby enemies slow scanning. Progress is saved.'
        );
    }
    if (v.type === 'defend') {
        return (
            'Defend the relay for ' +
            Math.ceil(left) +
            ' seconds within 450 m. Raider waves arrive every 12 seconds. Leaving the ring slowly loses defense progress.'
        );
    }
    if (v.type === 'recover') {
        return (
            'Clear the marked ambush, then hold within 150 m of the recovery signal for ' +
            Math.ceil(left) +
            ' seconds. The sealed recovery item uses no cargo space.'
        );
    }
    if (v.type === 'elite') {
        return 'Approach the combat zone and destroy its marked elite commander. Ion strips shields; railguns bypass thick armor.';
    }
    if (v.type === 'escort') {
        return 'Meet the freighter near the station and protect all three route legs. Stay within 800 m. Convoy position and hull persist when you save or travel.';
    }
    if (v.type === 'courier') {
        return 'Mission cargo is already aboard. Dock at ' + worlds[v.world].station + ' with R; delivery advances this stage automatically.';
    }
    if (v.type === 'trade') {
        return 'Sell ' + Math.ceil(left) + ' ' + (v.commodity || m.commodity) + ' at ' + worlds[v.world].station + '. This uses your real cargo.';
    }
    if (v.type === 'mining') {
        return (
            'Mine ' +
            Math.ceil(left) +
            ' live ore deposits. FLY TO OBJECTIVE follows the remaining deposits until this stage is complete. A Prospector extracts ore 2.5× faster. You keep the salvage and cargo.'
        );
    }
    if (v.type === 'boss') {
        return 'Approach the marked flagship zone and destroy the warship. Prepare your ship and weapon tier before jumping.';
    }
    return 'Destroy ' + Math.ceil(left) + ' hostile ships in this world, then continue to the next stage.';
}

function render_contracts(parent, board = false)
{
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
            ? 'STAGE ' +
              (contract.stage_index + 1) +
              '/' +
              contract.stages.length +
              ' · ' +
              contract.stages[contract.stage_index].title +
              ' · ' +
              Math.floor(contract.progress) +
              '/' +
              contract.target +
              ' · ' +
              (contract.ready ? 'REPORT AT STATION' : stage_description(contract.stages[contract.stage_index], contract, contract.stage_index))
            : 'Classic contract · ' + Math.floor(contract.progress) + '/' + contract.target;
        c.append(p);
    }
    if (board) {
        const p = document.createElement('p');
        p.className = 'contract-guidance';
        p.style.gridColumn = '1 / -1';
        p.textContent =
            'Contracts now have several stages. Accept up to 3, choose GUIDE THIS MISSION, and follow its plan. Promotions unlock ship classes and weapons. Higher-ranked operations pay more and send stronger squads.';
        parent.prepend ? parent.prepend(p) : parent.append(p);
    }
}

function render_station()
{
    ensure_career();
    expedition_base_render_station();
    const parent = document.getElementById('station_content');
    const rank = pilot_rank();
    const f = campaign.fleet;
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
            const owned = f.ships.includes(v.id);
            const selected = f.ship_id === v.id;
            const locked = rank < v.rank;
            const oversize = cargo_count() > v.cargo;
            const c = card(
                parent,
                v.name + ' / ' + v.role,
                v.description,
                'HULL ' +
                        v.hull +
                        ' · SHIELD +' +
                        v.shield +
                        ' · SPEED ' +
                        Math.round(v.speed*100) +
                        '% · CARGO ' +
                        v.cargo +
                        ' · GUN ' +
                        Math.round(v.damage*100) +
                        '%',
                selected
                    ? 'ACTIVE SHIP'
                    : locked
                        ? 'REQUIRES ' + rank_names[v.rank].toUpperCase()
                        : oversize
                            ? 'SELL CARGO TO SWITCH'
                            : owned
                                ? 'SWITCH SHIP'
                                : 'BUY · ◆ ' + v.price,
                function () {
                    fleet_purchase(v.id, 'ship');
                },
                selected || locked || oversize || (!owned && (salvage < v.price)),
                selected ? 'active' : ''
            );
            const art = document.createElement('div');
            art.className = 'fleet-silhouette';
            art.innerHTML = ship_svg(v);
            c.append(art);
            const note = document.createElement('small');
            note.textContent =
                'RAD HULL ' +
                Math.round(v.radiation*100) +
                '% · EQUIPPED ' +
                Math.round(radiation_protection(v)*100) +
                '% · GRAVITY THRUST ×' +
                v.traction +
                ' · BRAKES ×' +
                v.braking +
                ' · TURBO ' +
                (8 + v.endurance + upgrades.turbo_tank*3) +
                's';
            c.append(note);
            const match = expedition_conditions.map((e, i) => ((e.ship === v.id) ? worlds[i].name : null)).filter(Boolean);
            const usage = document.createElement('p');
            usage.textContent = 'Suited to ' + (match.join(', ') || 'specialized expeditions') + '. Protection and engines differ by hull.';
            c.append(usage);
        }
    }
    if (station_tab === 'arsenal') {
        for (const v of weapon_catalog) {
            const owned = f.weapons.includes(v.id);
            const selected = f.weapon_id === v.id;
            const locked = rank < v.rank;
            const level = f.weapon_levels[v.id] || 1;
            const c = card(
                parent,
                v.name,
                v.description,
                'TIER ' +
                        (owned ? level : '—') +
                        '/5 · DMG ' +
                        v.damage +
                        ' · ' +
                        v.interval.toFixed(2) +
                        's / SHOT · RANGE ' +
                        Math.round(v.speed*v.life) +
                        ' m',
                selected ? 'EQUIPPED' : locked ? 'REQUIRES ' + rank_names[v.rank].toUpperCase() : owned ? 'EQUIP WEAPON' : 'BUY · ◆ ' + v.price,
                function () {
                    fleet_purchase(v.id, 'weapon');
                },
                selected || locked || (!owned && (salvage < v.price)),
                selected ? 'active' : ''
            );
            if (owned) {
                const cost = Math.round((130 + v.price*0.22)*level);
                const b = document.createElement('button');
                b.textContent = (level >= 5) ? 'MAXIMUM TIER' : 'UPGRADE TO TIER ' + (level + 1) + ' · ◆ ' + cost;
                b.disabled = (level >= 5) || (salvage < cost);
                b.addEventListener('click', function () {
                    upgrade_weapon(v.id);
                });
                c.append(b);
            }
        }
    }
    if (station_tab === 'career') {
        const next = rank_thresholds[rank + 1];
        card(
            parent,
            rank_names[rank] + ' / PILOT CAREER',
            'Complete operations to earn experience and permanent ship licenses. Collect mission rewards at stations to receive XP.',
            'XP ' +
                campaign.xp +
                (next ? ' / ' + next + ' · NEXT ' + rank_names[rank + 1] : ' · LEGEND') +
                ' · CONTRACTS ' +
                campaign.completed +
                ' · EXPEDITION ' +
                campaign.expedition
        );
        card(
            parent,
            'Your next goal',
            (rank < 5)
                ? 'Earn ' +
                      Math.max(0, rank_thresholds[5] - campaign.xp) +
                      ' XP to license the Aurora Cruiser. Explore the hangar and arsenal for your current unlocks.'
                : 'Build a tier-5 arsenal, earn reputation in all eight worlds, and push frontier expedition numbers higher.',
            'FLEET ' + f.ships.length + '/6 · WEAPONS ' + f.weapons.length + '/6 · CHAPTERS ' + campaign.story + '/' + story.length
        );
        for (let i = 0, end = worlds.length; i < end; ++i) {
            const world = worlds[i];
            card(
                parent,
                world.name + ' / reputation',
                (campaign.reputation[i] >= 8) ? 'Trusted expedition partner' : (campaign.reputation[i] >= 3) ? 'Established contractor' : 'Independent visitor',
                campaign.reputation[i] + ' completed local contracts · ' + (campaign.visited.includes(i) ? 'VISITED' : 'UNEXPLORED')
            );
        }
    }
    el.dock_summary.textContent =
        current_ship().name +
        ' · ' +
        rank_names[rank] +
        ' · ' +
        current_weapon().name +
        ' T' +
        weapon_level() +
        ' · Cargo ' +
        cargo_count() +
        '/' +
        cargo_capacity() +
        ' · Story ' +
        campaign.story +
        '/' +
        story.length;
    if (['hangar', 'arsenal', 'career'].includes(station_tab)) {
        el.dock_status.textContent = 'Ships and weapons remain owned. Modules transfer between ships; switching ships repairs the hull.';
    }
    if (station_tab === 'jobs') {
        el.dock_status.textContent = 'Choose a contract or collect a completed reward. Your progress saves automatically.';
    }
    else if (station_tab === 'market') {
        el.dock_status.textContent = 'Choose a quantity to buy or sell. BUY MAX uses available credits and cargo space.';
    }
    else if (station_tab === 'intel') {
        el.dock_status.textContent = 'Station demand pays a limited premium. Prices and route margins update after each trade.';
    }
    else if (station_tab === 'outfit') {
        el.dock_status.textContent = 'Modules transfer between ships. Equip your ship and weapon before checking world-gate requirements.';
    }
}

function wireframe_ship_svg(v)
{
    const points = ship_outline(v.shape)
        .map(v => v.join(','))
        .join(' ');
    return (
        '<svg viewBox="-38 -32 76 64" aria-label="' +
        v.name +
        '"><polygon points="' +
        points +
        '" fill="' +
        v.color +
        '22" stroke="' +
        v.color +
        '" stroke-width="1.5"/><path d="M10 0L-4 -5L-9 0L-4 5Z" fill="' +
        v.color +
        '"/></svg>'
    );
}

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

function draw_fleet_ship(x, y, angle, alpha, ghost)
{
    const v = current_ship();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = v.color;
    ctx.fillStyle = ghost ? v.color : v.color + '25';
    ctx.lineWidth = 1.7;
    ctx.shadowColor = v.color;
    ctx.shadowBlur = (full_fx && !ghost) ? 16 : 0;
    const points = ship_outline(v.shape);
    ctx.beginPath();
    for (let i = 0, end = points.length; i < end; ++i) {
        const point = points[i];
        if (i) {
            ctx.lineTo(...point);
        }
        else {
            ctx.moveTo(...point);
        }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (!ghost) {
        ctx.fillStyle = '#e5ffff';
        ctx.beginPath();
        ctx.moveTo(11, 0);
        ctx.lineTo(-4, -4);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-4, 4);
        ctx.fill();
        if (!is_player_vessel(x, y)) {
            ctx.fillStyle = v.color + '88';
            ctx.beginPath();
            ctx.moveTo(-15, -5);
            ctx.lineTo(-29 - rand(0, 7), 0);
            ctx.lineTo(-15, 5);
            ctx.fill();
        }
    }
    ctx.restore();
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
        ctx.fillText(Math.floor(m.progress) + ' / ' + m.target + ((m.type === 'elite') ? ' TARGET' : ' SECONDS'), p.x, p.y - radius - 12);
    }
    for (const enemy of enemies.filter(v => v.elite && (v.hp > 0))) {
        ctx.strokeStyle = pink;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.r + 12, 0, Math.PI*2);
        ctx.stroke();
        ctx.fillStyle = pink;
        ctx.font = 'bold 10px ui-monospace,monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ELITE / ' + Math.ceil(enemy.hp), enemy.x, enemy.y - enemy.r - 20);
    }
    ctx.restore();
}

function render_inventory()
{
    expedition_base_render_inventory();
    const c = document.createElement('div');
    c.className = 'inventory-card';
    c.innerHTML =
        '<b>' +
        current_ship().name +
        '</b><span>' +
        current_weapon().name +
        ' / TIER ' +
        weapon_level() +
        '</span><p>Hull ' +
        hull_max() +
        ' · Cargo ' +
        cargo_count() +
        '/' +
        cargo_capacity() +
        ' · ' +
        rank_names[pilot_rank()] +
        ' · Dock at HANGAR / ARSENAL to change equipment.</p>';
    el.inventory_grid.append(c);
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
    cabin.yaw = player.angle;
    cabin.turn = 0;
}

function update_hud()
{
    sync_minimap_button();
    expedition_base_update_hud();
    if (!player) {
        return;
    }
    const m = focused_contract();
    if (m?.stages) {
        el.mission_phase.textContent = m.ready
            ? 'DOCK TO CLAIM ◆ ' + m.reward
            : 'STAGE ' + (m.stage_index + 1) + '/' + m.stages.length + ' · ' + Math.floor(m.progress) + '/' + m.target;
        el.sector_progress.style.width = ((m.stage_index + Math.min(1, m.progress/m.target))/m.stages.length)*100 + '%';
    }
    el.shield_readout.textContent =
        current_ship().name +
        ' · ' +
        current_weapon().name +
        ' T' +
        weapon_level() +
        ' · SHIELD ' +
        Math.ceil(player.shield) +
        '/' +
        shield_max() +
        ' · RAD ' +
        Math.round(radiation_protection()*100) +
        '%';
    update_expedition_readout();
}
