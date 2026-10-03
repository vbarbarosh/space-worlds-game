// Arcade: one run through the eight worlds, three waves each, the world's flagship in the third; no stations, contracts or saves.
const arcade = {active: false, world: -1, wave: 0, pause: 0, squad_timer: 0, squads: 0, phase: 0, campaign_checkpoint: null};
const arcade_extent = [7200, 5600];
const arcade_waves = 3;
const arcade_radiation = 0.35;
const arcade_defense = 0.5;
const arcade_wave_names = ['', 'SCOUTS', 'ASSAULT', 'FLAGSHIP'];

function arcade_start(world = 0)
{
    arcade.active = true;
    arcade.world = -1;
    arcade.wave = 0;
    arcade.pause = 0;
    document.body.classList.add('arcade');
    set_hidden(document.getElementById('arcade_overlay'), true);
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
        supplies: {medkit: 2, emp: 1, stasis: 1},
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

function arcade_stop()
{
    arcade.active = false;
    document.body.classList.remove('arcade');
    set_hidden(document.getElementById('arcade_overlay'), true);
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
    arcade_squads_update(dt);
    arcade_flagship_update();
    if ((spawn_left > 0) || enemies.some(v => v.hp > 0)) {
        return;
    }
    if (arcade.wave < arcade_waves) {
        arcade.pause = 2.5;
        show_toast('WAVE ' + arcade.wave + ' CLEAR', 'NEXT WAVE INBOUND', 2);
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
    show_toast('WAVE ' + n + ' / ' + arcade_waves + ' · ' + arcade_wave_names[n], worlds[campaign.world].name.toUpperCase() + ' · ' + current_world_rules().name.toUpperCase(), 2);
    if (n === arcade_waves) {
        arcade_flagship_spawn();
    }
}

function arcade_wave_size(n)
{
    return 10 + campaign.world*2 + (n - 1)*4;
}

// Raiders come in squadrons from one side, not one by one; a squadron waits while the sky is crowded.
function arcade_squads_update(dt)
{
    arcade.squad_timer -= dt;
    const alive = enemies.filter(v => v.hp > 0).length;
    if ((spawn_left <= 0) || (arcade.squad_timer > 0) || (alive > 14)) {
        return;
    }
    const size = Math.min(spawn_left, 3 + Math.min(3, Math.floor(campaign.world/2)) + (arcade.wave - 1));
    arcade_squad_spawn(size);
    spawn_left -= size;
    arcade.squad_timer = Math.max(2.6, 5.5 - campaign.world*0.3);
}

// One type per squadron, in a line across its heading; from the second world on every second one has an elite leader.
function arcade_squad_spawn(size)
{
    const type = (arcade.wave === 1) ? ((Math.random() < 0.7) ? 'chaser' : 'shooter') : enemy_type();
    const angle = Math.random()*Math.PI*2;
    const cx = player.x + Math.cos(angle)*640;
    const cy = player.y + Math.sin(angle)*640;
    const elite = (campaign.world >= 1) && (arcade.wave >= 2) && (arcade.squads % 2 === 1);
    arcade.squads++;
    for (let i = 0; i < size; ++i) {
        const enemy = spawn_enemy(type);
        const offset = (i - (size - 1)/2)*55;
        enemy.x = clamp(cx - Math.sin(angle)*offset, 40, world.w - 40);
        enemy.y = clamp(cy + Math.cos(angle)*offset, 40, world.h - 40);
        ring(enemy.x, enemy.y, enemy.color || pink, 40, 0.4);
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
    enemy.drop_on_death = 'medkit';
}

// The flagship turns at 66% (escorts) and at 33% (a last stand with more of them).
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
    el.bossbar.querySelector('.meter-row').textContent = worlds[campaign.world].faction.toUpperCase() + ' FLAGSHIP';
    set_hidden(el.bossbar, false);
}

function arcade_world_clear()
{
    if (campaign.world === worlds.length - 1) {
        state = 'victory';
        victory_timer = 2.5;
        return;
    }
    state = 'arcade_draft';
    stop_turbo();
    keys.clear();
    mouse_drive.active = false;
    mouse_drive.following = false;
    joystick.active = false;
    set_hidden(el.bossbar, true);
    arcade_draft_show();
}

// Three cards between worlds: modules not yet at their cap, and a new weapon after every second world.
function arcade_draft_show()
{
    const next = worlds[campaign.world + 1];
    const modules = upgrade_options.filter(v => upgrades[v.key] < v.cap);
    for (let i = modules.length - 1; i > 0; --i) {
        const j = Math.floor(Math.random()*(i + 1));
        [modules[i], modules[j]] = [modules[j], modules[i]];
    }
    const cards = modules.slice(0, 3).map(v => ({icon: v.icon, title: v.title, level: 'Lv ' + (upgrades[v.key] + 1), description: v.description, module: v}));
    const weapons = weapon_catalog.filter(v => v.id !== current_weapon().id);
    if ((campaign.world % 2 === 1) && weapons.length) {
        const weapon = weapons[Math.floor(Math.random()*weapons.length)];
        cards[cards.length - 1] = {icon: '⚔', title: weapon.name, level: 'Weapon', description: weapon.description, weapon};
    }
    document.getElementById('arcade_eyebrow').textContent = worlds[campaign.world].name.toUpperCase() + ' CLEARED · WORLD ' + (campaign.world + 1) + ' / ' + worlds.length;
    const tier = Math.min(5, weapon_level() + 1);
    document.getElementById('arcade_description').textContent = 'Weapon tier ' + tier + ' · next: ' + next.name + ', ' + world_rules[campaign.world + 1].summary;
    const parent = document.getElementById('arcade_choices');
    parent.replaceChildren();
    for (const card of cards) {
        const button = document.createElement('button');
        button.className = 'choice';
        button.innerHTML = '<span class="icon">' + card.icon + '</span><b>' + card.title + ' <small>' + card.level + '</small></b><span>' + card.description + '</span>';
        button.addEventListener('click', function () {
            arcade_card_take(card);
        });
        parent.append(button);
    }
    set_hidden(document.getElementById('arcade_overlay'), false);
    parent.firstChild.focus();
}

function arcade_card_take(card)
{
    if (state !== 'arcade_draft') {
        return;
    }
    // The weapon grows one tier per world cleared; a new weapon keeps the tier reached.
    const fleet = ensure_career();
    const tier = Math.min(5, weapon_level() + 1);
    if (card.module) {
        grant_upgrade(card.module);
    }
    else {
        fleet.weapons.push(card.weapon.id);
        fleet.weapon_id = card.weapon.id;
        sfx('upgrade');
    }
    fleet.weapon_levels[fleet.weapon_id] = tier;
    set_hidden(document.getElementById('arcade_overlay'), true);
    state = 'playing';
    const next = campaign.world + 1;
    start_jump({world: next, label: worlds[next].name, color: worlds[next].accent});
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
    el.toast.classList.remove('show');
    el.result_eyebrow.textContent = won ? 'ARCADE · FRONTIER CLEARED' : 'ARCADE · SIGNAL LOST';
    el.result_title.textContent = won ? 'All eight worlds.' : 'One more run?';
    el.result_description.textContent = won
        ? 'Eight worlds, eight flagships, ' + format_time(run_time) + '.'
        : 'You reached ' + worlds[campaign.world].name + ', wave ' + arcade.wave + ' of ' + arcade_waves + '.';
    el.result_score.textContent = score.toLocaleString();
    el.result_sector.textContent = (campaign.world + 1) + ' / ' + worlds.length;
    el.result_best.textContent = (record ? 'NEW PERSONAL BEST · ' : 'PERSONAL BEST · ') + best.toLocaleString() + '  /  ' + kills + ' ELIMINATIONS · ' + format_time(run_time);
    document.getElementById('restart_button').focus();
}

function arcade_update_hud()
{
    el.act_label.textContent = 'ARCADE · WORLD ' + (campaign.world + 1) + ' / ' + worlds.length + ' · ' + world_looks[campaign.world].biome;
    el.mission_name.textContent = worlds[campaign.world].name.toUpperCase();
    el.mission_phase.textContent = (arcade.pause > 0) ? 'WAVE ' + arcade.wave + ' CLEAR' : 'WAVE ' + Math.max(1, arcade.wave) + ' / ' + arcade_waves;
    const total = arcade_wave_size(arcade.wave);
    const left = spawn_left + enemies.filter(v => v.hp > 0).length;
    el.sector_progress.style.width = clamp((((arcade.wave - 1) + (1 - Math.min(1, left/Math.max(1, total))))/arcade_waves)*100, 0, 100) + '%';
}
