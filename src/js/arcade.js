// Arcade: one run through the eight worlds, three waves each, the world's flagship in the third; no stations, contracts or saves.
const arcade = {active: false, world: -1, wave: 0, pause: 0, squad_timer: 0, squads: 0, phase: 0, slowmo: 0, depot_hint: false, blasts: [], between_worlds: null, campaign_checkpoint: null};
const arcade_extent = [7200, 5600];
const arcade_waves = 3;
const arcade_radiation = 0.35;
const arcade_defense = 0.5;
const arcade_wave_names = ['', 'SCOUTS', 'ASSAULT', 'FLAGSHIP'];
const arcade_depot_safe_range = 700;
// What each difficulty changes in the arcade: extra raiders per squadron and per wave, the gap between squadrons, the
// first world with elites, the share of repairs that still drop, the medkits a run starts with, whether every raider
// fires its world's gun (Haven's plasma included), how often (a factor on the gun's cooldown), and how hard its shots
// hit, the raiders' hull, the blast damage you take, raiders that grow with your weapon tier, and the flagship's
// overdrive. CHILL is the run as it was before.
const arcade_modes = {
    chill: {squad: 0, wave: 0, gap: 1, elite_world: 1, repairs: 1, medkits: 2, armed: false, gun_gap: 1, hits: 1, hull: 1, blast: 0.8, tier_hp: false, overdrive: false},
    normal: {squad: 1, wave: 3, gap: 0.8, elite_world: 0, repairs: 0.35, medkits: 1, armed: true, gun_gap: 0.45, hits: 1.6, hull: 1.5, blast: 0.8, tier_hp: false, overdrive: false},
    overload: {squad: 2, wave: 5, gap: 0.7, elite_world: 0, repairs: 0, medkits: 1, armed: true, gun_gap: 0.4, hits: 1.75, hull: 1.8, blast: 1.2, tier_hp: true, overdrive: true},
};

document.getElementById('arcade_depot_launch').addEventListener('click', arcade_depot_close);
sync_mode_note();

function arcade_start(world = 0)
{
    arcade.active = true;
    arcade.world = -1;
    arcade.wave = 0;
    arcade.pause = 0;
    arcade.depot_hint = false;
    arcade.blasts = [];
    arcade.between_worlds = null;
    document.body.classList.add('arcade');
    set_hidden(document.getElementById('arcade_depot'), true);
    document.getElementById('restart_button').textContent = 'PLAY AGAIN';
    document.getElementById('result_sector_label').textContent = 'WORLD REACHED';
    // A run starts as a resumed checkpoint made up on the spot; the campaign's own checkpoint is put back after.
    arcade.campaign_checkpoint = checkpoint;
    checkpoint = {
        version: 4,
        wave: worlds[world].wave,
        score: 0,
        kills: 0,
        salvage: 0,
        artifacts_count: 0,
        run_time: 0,
        upgrades: initial_upgrades(),
        supplies: {medkit: arcade_mode().medkits, emp: 1, stasis: 1},
        difficulty,
        hp: ship_catalog[0].hull,
        energy: 35,
        campaign: {
            world,
            story: 0,
            contracts: [],
            completed: 0,
            visited: [world],
            cargo: {ore: 0, cells: 0, relics: 0},
            maps: {},
            serial: 0,
            board: 0,
            fleet: {ship_id: 'scout', ships: ['scout'], weapon_id: 'plasma', weapons: ['plasma'], weapon_levels: {plasma: 1}},
        },
    };
    reset_run(true);
    checkpoint = arcade.campaign_checkpoint;
}

// One line under the menu's difficulty switch on what the mode does.
function sync_mode_note()
{
    document.getElementById('mode_note').textContent = {
        chill: 'Slower, weaker raiders; hits hurt a third less.',
        normal: 'Arcade: every raider fires, squadrons are bigger, elites from Haven on, repairs mostly at the depot.',
        overload: 'Faster, tougher raiders. Arcade: they grow with your weapon and drop no repairs; flagships go into overdrive.',
    }[difficulty] || '';
}

function arcade_mode()
{
    return arcade_modes[difficulty] || arcade_modes.normal;
}

// Whether a repair may drop: always outside the arcade; in it, as often as the mode allows.
function repair_drop_allowed()
{
    return !arcade.active || (Math.random() < arcade_mode().repairs);
}

// A raider's hull by the mode (the flagship has its own scale); on OVERLOAD it also grows as your weapon's tier does,
// by the same 22% a tier adds to your damage.
function arcade_hull_scale(enemy)
{
    const k = ((enemy.type === 'boss') ? 1 : arcade_mode().hull)*(arcade_mode().tier_hp ? 1 + (weapon_level() - 1)*0.22 : 1);
    enemy.hp = Math.round(enemy.hp*k);
    enemy.max_hp = Math.round(enemy.max_hp*k);
}

function arcade_stop()
{
    arcade.active = false;
    arcade.between_worlds = null;
    document.body.classList.remove('arcade');
    set_hidden(document.getElementById('arcade_depot'), true);
    document.getElementById('restart_button').textContent = 'NEW EXPEDITION';
    document.getElementById('result_sector_label').textContent = 'SECTOR REACHED';
}

// Called from update() while a run is in flight.
function arcade_update(dt)
{
    for (const enemy of enemies) {
        if (!enemy.arcade_scaled) {
            enemy.arcade_scaled = true;
            enemy.armor = (enemy.armor || 0)*arcade_defense;
            enemy.shield = (enemy.shield || 0)*arcade_defense;
            enemy.max_shield = (enemy.max_shield || 0)*arcade_defense;
            arcade_hull_scale(enemy);
        }
    }
    if (arcade.world !== campaign.world) {
        arcade.world = campaign.world;
        arcade_wave_start(1);
        return;
    }
    if (arcade.pause > 0) {
        arcade.pause -= dt;
        if (arcade.pause <= 0) {
            arcade_wave_start(arcade.wave + 1);
        }
        return;
    }
    arcade_blasts_update(dt);
    arcade_squads_update(dt);
    arcade_flagship_update();
    if (!arcade.depot_hint && (salvage > 0)) {
        arcade.depot_hint = true;
        show_toast('SALVAGE ◆', 'SPEND IT AT THE STATION · FLY IN AND PRESS R', 3.5);
    }
    if ((spawn_left > 0) || enemies.some(v => v.hp > 0)) {
        return;
    }
    if (arcade.wave < arcade_waves) {
        arcade.pause = 2.5;
        show_toast(`WAVE ${arcade.wave} CLEAR`, 'NEXT WAVE INBOUND', 2);
        return;
    }
    arcade_world_clear();
}

function arcade_wave_start(n)
{
    arcade.wave = n;
    arcade.squad_timer = 0.8;
    arcade.squads = 0;
    phase_index = n;
    phase_timer = 0;
    spawn_left = arcade_wave_size(n);
    show_toast(`WAVE ${n} / ${arcade_waves} · ${arcade_wave_names[n]}`, `${worlds[campaign.world].name.toUpperCase()} · ${current_world_rules().name.toUpperCase()}`, 2);
    if (n === arcade_waves) {
        arcade_flagship_spawn();
    }
}

function arcade_wave_size(n)
{
    return 10 + campaign.world*2 + (n - 1)*4 + arcade_mode().wave;
}

// Raiders come in squadrons from one side, not one by one; a squadron waits while the sky is crowded.
function arcade_squads_update(dt)
{
    arcade.squad_timer -= dt;
    const alive = enemies.filter(v => v.hp > 0).length;
    if ((spawn_left <= 0) || (arcade.squad_timer > 0) || (alive > 14)) {
        return;
    }
    const size = Math.min(spawn_left, 3 + Math.min(3, Math.floor(campaign.world/2)) + (arcade.wave - 1) + arcade_mode().squad);
    arcade_squad_spawn(size);
    spawn_left -= size;
    arcade.squad_timer = Math.max(2.6, 5.5 - campaign.world*0.3)*arcade_mode().gap;
}

// One type per squadron, in a line across its heading; from the mode's first elite world on, every second one has an
// elite leader.
function arcade_squad_spawn(size)
{
    const type = (arcade.wave === 1) ? ((Math.random() < 0.7) ? 'chaser' : 'shooter') : enemy_type();
    const angle = Math.random()*Math.PI*2;
    const cx = player.x + Math.cos(angle)*640;
    const cy = player.y + Math.sin(angle)*640;
    const elite = (campaign.world >= arcade_mode().elite_world) && (arcade.wave >= 2) && (arcade.squads % 2 === 1);
    arcade.squads++;
    for (let i = 0; i < size; ++i) {
        const enemy = spawn_enemy(type);
        const offset = (i - (size - 1)/2)*55;
        enemy.x = clamp(cx - Math.sin(angle)*offset, 40, world.w - 40);
        enemy.y = clamp(cy + Math.cos(angle)*offset, 40, world.h - 40);
        ring(enemy.x, enemy.y, enemy.color || pink, 40, 0.4);
        explode(enemy.x, enemy.y, 26, '#a8e4ff', i*0.05, 'warp');
        if (elite && (i === 0)) {
            arcade_elite_make(enemy);
        }
    }
}

function arcade_elite_make(enemy)
{
    enemy.arcade_scaled = true;
    enemy.elite = true;
    enemy.hp = Math.round(enemy.max_hp*3);
    enemy.max_hp = enemy.hp;
    enemy.r = Math.round(enemy.r*1.35);
    enemy.armor = (enemy.armor || 0)*arcade_defense;
    enemy.max_shield = 40 + campaign.world*25;
    enemy.shield = enemy.max_shield;
    arcade_hull_scale(enemy);
    enemy.drop_on_death = repair_drop_allowed() ? 'medkit' : 'emp';
}

// The flagship turns at 66% (escorts) and at 33% (a last stand with more of them); on OVERLOAD, at 15% it goes into
// overdrive: it fires faster and calls an elite squadron.
function arcade_flagship_update()
{
    const boss = enemies.find(v => (v.type === 'boss') && (v.hp > 0));
    if (!boss) {
        return;
    }
    if ((arcade.phase === 1) && (boss.hp < boss.max_hp*0.66)) {
        arcade.phase = 2;
        show_toast('FLAGSHIP · ESCORTS INBOUND', worlds[campaign.world].faction.toUpperCase(), 2);
        arcade_squad_spawn(3 + Math.min(2, Math.floor(campaign.world/3)));
    }
    if ((arcade.phase === 2) && (boss.hp < boss.max_hp*0.33)) {
        arcade.phase = 3;
        show_toast('FLAGSHIP · LAST STAND', 'EVERYTHING IT HAS', 2);
        flash = 0.35;
        shake = Math.max(shake, 14);
        ring(boss.x, boss.y, pink, 260, 0.6);
        arcade_squad_spawn(4 + Math.min(2, Math.floor(campaign.world/3)));
    }
    if ((arcade.phase === 3) && arcade_mode().overdrive && (boss.hp < boss.max_hp*0.15)) {
        arcade.phase = 4;
        boss.overdrive = true;
        show_toast('FLAGSHIP · OVERDRIVE', 'IT WILL NOT GO QUIETLY', 2);
        flash = 0.4;
        shake = Math.max(shake, 18);
        ring(boss.x, boss.y, pink, 320, 0.7);
        arcade.squads = 1;
        arcade_squad_spawn(3 + Math.min(2, Math.floor(campaign.world/3)));
    }
}

function arcade_flagship_spawn()
{
    const enemy = spawn_enemy('boss');
    const scale = (difficulty === 'chill') ? 0.8 : (difficulty === 'overload') ? 1.25 : 1;
    enemy.hp = Math.round(1500*(1 + campaign.world*0.6)*scale);
    enemy.max_hp = enemy.hp;
    boss_spawned = true;
    boss_defeated = false;
    arcade.phase = 1;
    el.bossbar.querySelector('.meter-row').textContent = `${worlds[campaign.world].faction.toUpperCase()} FLAGSHIP`;
    set_hidden(el.bossbar, false);
}

// A world cleared pays a fixed bonus, the weapon grows a tier, and the depot opens before the jump to the next world.
function arcade_world_clear()
{
    if (campaign.world === worlds.length - 1) {
        state = 'victory';
        victory_timer = 2.5;
        return;
    }
    const bonus = arcade_clear_bonus();
    salvage += bonus;
    ensure_career().weapon_levels[current_weapon().id] = Math.min(5, weapon_level() + 1);
    set_hidden(el.bossbar, true);
    arcade.between_worlds = {world: campaign.world, bonus};
    arcade_depot_open();
}

function arcade_clear_bonus()
{
    return 80 + campaign.world*40;
}

// A ship that dies hurts what is close to it, raiders and you alike, less with distance; a blast that kills sets off
// the next one, so a crowded squadron can go up in a chain.
function arcade_blast_from_kill(enemy)
{
    const sizes = {shard: 26, tank: 72, splitter: 48, lancer: 48, shooter: 46, boss: 220};
    const damages = {shard: 6, chaser: 10, shooter: 12, splitter: 14, lancer: 14, tank: 26, boss: 50};
    const size = sizes[enemy.type] || 40;
    const damage = (damages[enemy.type] || 10)*(enemy.elite ? 1.5 : 1);
    arcade.blasts.push({x: enemy.x, y: enemy.y, radius: size*1.8, damage, t: (enemy.type === 'boss') ? 1.25 : 0.12, source: enemy});
}

function arcade_blasts_update(dt)
{
    const due = [];
    for (const blast of arcade.blasts) {
        blast.t -= dt;
        if (blast.t <= 0) {
            due.push(blast);
        }
    }
    arcade.blasts = arcade.blasts.filter(v => v.t > 0);
    for (const blast of due) {
        for (const enemy of enemies.slice()) {
            const d = distance(enemy, blast);
            if ((enemy !== blast.source) && (enemy.hp > 0) && (d < blast.radius + enemy.r)) {
                damage_enemy(enemy, blast.damage*(1 - Math.min(1, d/blast.radius)));
            }
        }
        const d = distance(player, blast);
        if (d < blast.radius + player.r) {
            damage_player(blast.damage*arcade_mode().blast*(1 - Math.min(1, d/blast.radius)));
        }
    }
}

// A new weapon keeps the tier the old one had reached.
function arcade_weapon_take(weapon)
{
    const fleet = ensure_career();
    const tier = weapon_level();
    if (!fleet.weapons.includes(weapon.id)) {
        fleet.weapons.push(weapon.id);
    }
    fleet.weapon_id = weapon.id;
    fleet.weapon_levels[weapon.id] = tier;
}

// R at the station opens the depot, unless raiders are close: the depot is a shop, not a hiding place.
function arcade_interact()
{
    if (distance(player, station) > 230) {
        return;
    }
    if (enemies.some(v => (v.hp > 0) && (distance(v, player) < arcade_depot_safe_range))) {
        show_toast('DEPOT CLOSED', `RAIDERS WITHIN ${arcade_depot_safe_range} m · CLEAR THEM FIRST`, 2);
        return;
    }
    arcade_depot_open();
}

function arcade_depot_open()
{
    state = 'arcade_depot';
    stop_turbo();
    keys.clear();
    mouse_drive.active = false;
    mouse_drive.following = false;
    joystick.active = false;
    arcade_depot_fill();
    set_hidden(document.getElementById('arcade_depot'), false);
    document.getElementById('arcade_depot_launch').focus();
    sfx('pickup');
}

// Repair, the other weapons, supplies and the next level of every module, for the salvage collected in the run
function arcade_depot_fill()
{
    const cleared = arcade.between_worlds;
    const next = cleared ? worlds[cleared.world + 1] : null;
    document.getElementById('arcade_depot_eyebrow').textContent = cleared
        ? `${worlds[cleared.world].name.toUpperCase()} CLEARED · BONUS ◆ ${cleared.bonus} · WEAPON TIER ${weapon_level()}`
        : `ARCADE DEPOT · ${worlds[campaign.world].station.toUpperCase()}`;
    document.getElementById('arcade_depot_launch').textContent = next ? `NEXT: ${next.name.toUpperCase()} ↗` : 'LAUNCH ↗';
    document.getElementById('arcade_depot_next').textContent = next ? `Next: ${next.name}, ${world_rules[cleared.world + 1].summary}.` : '';
    document.getElementById('arcade_depot_wallet').textContent =
        `◆ ${salvage} salvage · ${current_weapon().name} T${weapon_level()} · hull ${Math.ceil(player.hp)} / ${hull_max()}`;
    const items = [];
    if (player.hp < hull_max()) {
        items.push({icon: '✚', title: 'Full repair', text: `The hull back to ${hull_max()}.`, price: 60, buy: function () {
            player.hp = hull_max();
        }});
    }
    for (const weapon of weapon_catalog.filter(v => v.id !== current_weapon().id)) {
        items.push({icon: '⚔', title: weapon.name, text: weapon.description, price: 120 + weapon.rating*45, buy: function () {
            arcade_weapon_take(weapon);
        }});
    }
    for (const option of supply_options.filter(v => supplies[v.key] < 8)) {
        items.push({icon: option.icon, title: option.title, text: option.description, price: option.cost, buy: function () {
            supplies[option.key]++;
        }});
    }
    for (const option of upgrade_options.filter(v => upgrades[v.key] < v.cap)) {
        items.push({icon: option.icon, title: `${option.title} Lv ${upgrades[option.key] + 1}`, text: option.description, price: module_cost(option), buy: function () {
            grant_upgrade(option);
        }});
    }
    const grid = document.getElementById('arcade_depot_grid');
    grid.replaceChildren();
    for (const item of items) {
        const card = document.createElement('div');
        card.className = 'shop-item';
        card.innerHTML = `<b>${item.icon} &nbsp;${item.title}</b><p>${item.text}</p>`;
        const button = document.createElement('button');
        button.textContent = `BUY · ◆ ${item.price}`;
        button.disabled = salvage < item.price;
        button.addEventListener('click', function () {
            arcade_depot_buy(item);
        });
        card.append(button);
        grid.append(card);
    }
}

function arcade_depot_buy(item)
{
    if ((state !== 'arcade_depot') || (salvage < item.price)) {
        return;
    }
    salvage -= item.price;
    item.buy();
    sfx('upgrade');
    update_hud();
    arcade_depot_fill();
}

function arcade_depot_close()
{
    if (state !== 'arcade_depot') {
        return;
    }
    set_hidden(document.getElementById('arcade_depot'), true);
    state = 'playing';
    const cleared = arcade.between_worlds;
    arcade.between_worlds = null;
    if (cleared) {
        const next = cleared.world + 1;
        start_jump({world: next, label: worlds[next].name, color: worlds[next].accent});
    }
}

function arcade_finish(won)
{
    state = won ? 'won' : 'dead';
    const record = save_best();
    set_hidden(document.getElementById('retry_sector'), true);
    set_hidden(el.result_overlay, false);
    for (const v of [el.loadout, el.inventory_button, el.mission, el.pause_button, el.touch_buttons, el.bossbar]) {
        set_hidden(v, true);
    }
    toasts_clear();
    el.result_eyebrow.textContent = won ? 'ARCADE · FRONTIER CLEARED' : 'ARCADE · SIGNAL LOST';
    el.result_title.textContent = won ? 'All eight worlds.' : 'One more run?';
    el.result_description.textContent = won
        ? `Eight worlds, eight flagships, ${format_time(run_time)}.`
        : `You reached ${worlds[campaign.world].name}, wave ${arcade.wave} of ${arcade_waves}.`;
    el.result_score.textContent = score.toLocaleString();
    el.result_sector.textContent = `${campaign.world + 1} / ${worlds.length}`;
    el.result_best.textContent = `${record ? 'NEW PERSONAL BEST · ' : 'PERSONAL BEST · '}${best.toLocaleString()}  /  ${kills} ELIMINATIONS · ${format_time(run_time)}`;
    document.getElementById('restart_button').focus();
}

// A flagship's death plays at 30% speed for a moment; elsewhere the clock runs as it is.
function arcade_time_step(dt)
{
    if (arcade.slowmo <= 0) {
        return dt;
    }
    arcade.slowmo -= dt;
    return dt*0.3;
}

// A kill shakes the screen by the size of what died.
function arcade_kill_shake(enemy)
{
    const strength = {shard: 1.5, chaser: 3, shooter: 4, splitter: 4.5, lancer: 4.5, tank: 9, boss: 26}[enemy.type] || 3;
    return enemy.elite ? strength*1.6 : strength;
}

function arcade_update_hud()
{
    el.act_label.textContent = `ARCADE · WORLD ${campaign.world + 1} / ${worlds.length} · ${world_looks[campaign.world].biome}`;
    el.mission_name.textContent = worlds[campaign.world].name.toUpperCase();
    el.mission_phase.textContent = (arcade.pause > 0) ? `WAVE ${arcade.wave} CLEAR` : `WAVE ${Math.max(1, arcade.wave)} / ${arcade_waves}`;
    const total = arcade_wave_size(arcade.wave);
    const left = spawn_left + enemies.filter(v => v.hp > 0).length;
    el.sector_progress.style.width = `${clamp((((arcade.wave - 1) + (1 - Math.min(1, left/Math.max(1, total))))/arcade_waves)*100, 0, 100)}%`;
}
