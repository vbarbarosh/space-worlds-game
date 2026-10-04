// Arcade: one run through the eight worlds, three waves each, the world's flagship in the third; no stations, contracts or saves.
const arcade = {active: false, world: -1, wave: 0, pause: 0, squad_timer: 0, squads: 0, phase: 0, slowmo: 0, depot_hint: false, blasts: [], between_worlds: null, world_start: null, campaign_checkpoint: null};
const arcade_extent = [7200, 5600];
const arcade_waves = 3;
const arcade_radiation = 0.35;
const arcade_defense = 0.5;
const arcade_wave_names = ['', 'SCOUTS', 'ASSAULT', 'FLAGSHIP'];
// salvage left unspent when the run ends adds this many points each, so keeping it is a choice too
const arcade_salvage_points = 10;
// the depot sells ships at this share of the campaign's prices
const arcade_ship_price = 0.5;
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
document.getElementById('arcade_depot_tabs').addEventListener('click', function (event) {
    const tab = event.target.closest('[data-tab]');
    if (tab) {
        arcade_depot_view.tab = tab.dataset.tab;
        arcade_depot_fill();
    }
});
document.getElementById('arcade_depot_list').addEventListener('click', function (event) {
    const button = event.target.closest('[data-buy]');
    if (button && !button.disabled) {
        arcade_depot_buy(button.closest('[data-item]').dataset.item);
    }
});
document.getElementById('arcade_depot_list').addEventListener('mouseover', function (event) {
    const id = event.target.closest('[data-item]')?.dataset.item || '';
    if (id !== arcade_depot_view.hover) {
        arcade_depot_view.hover = id;
        arcade_depot_sync_hover();
    }
});
document.getElementById('arcade_depot_list').addEventListener('mouseleave', function () {
    arcade_depot_view.hover = '';
    arcade_depot_sync_hover();
});
document.getElementById('arcade_depot_search').addEventListener('input', function (event) {
    arcade_depot_view.search = event.target.value.trim();
    arcade_depot_render_list();
});
addEventListener('keydown', function (event) {
    if (state !== 'arcade_depot') {
        return;
    }
    const search = document.getElementById('arcade_depot_search');
    // / finds; in the search Enter and Escape leave it (Escape clearing it first); elsewhere Enter launches
    if (document.activeElement === search) {
        if (['Enter', 'Escape'].includes(event.code)) {
            event.preventDefault();
            if ((event.code === 'Escape') && search.value) {
                search.value = '';
                arcade_depot_view.search = '';
                arcade_depot_render_list();
            }
            else {
                search.blur();
            }
        }
        return;
    }
    if (event.key === '/') {
        event.preventDefault();
        search.focus();
    }
    else if ((event.code === 'Enter') && !event.repeat) {
        event.preventDefault();
        arcade_depot_close();
    }
});
sync_mode_note();

// A run from world 1, or (from: an arcade save) resumed at the start of the world it was saved in
function arcade_start(world = 0, from = null)
{
    if (from) {
        world = from.world;
        difficulty = from.difficulty;
    }
    arcade.active = true;
    arcade.world = -1;
    arcade.wave = 0;
    arcade.pause = 0;
    arcade.depot_hint = false;
    arcade.blasts = [];
    arcade.between_worlds = null;
    arcade.world_start = null;
    document.body.classList.add('arcade');
    set_hidden(document.getElementById('arcade_depot'), true);
    document.getElementById('restart_button').innerHTML = '<span>Play again</span>';
    document.getElementById('result_sector_label').textContent = 'World reached';
    // A run starts as a resumed checkpoint made up on the spot; the campaign's own checkpoint is put back after.
    arcade.campaign_checkpoint = checkpoint;
    checkpoint = {
        version: 4,
        wave: worlds[world].wave,
        score: from ? from.score : 0,
        kills: from ? from.kills : 0,
        salvage: from ? from.salvage : 0,
        artifacts_count: 0,
        run_time: from ? from.run_time : 0,
        upgrades: from ? {...initial_upgrades(), ...from.upgrades} : initial_upgrades(),
        supplies: from ? {...from.supplies} : {medkit: arcade_mode().medkits, emp: 1, stasis: 1},
        difficulty,
        hp: from ? from.hp : ship_catalog[0].hull,
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
            fleet: from ? clone(from.fleet) : {ship_id: 'scout', ships: ['scout'], weapon_id: 'plasma', weapons: ['plasma'], weapon_levels: {plasma: 1}},
        },
    };
    reset_run(true);
    checkpoint = arcade.campaign_checkpoint;
}

// The run as an arcade save keeps it: the world it is in, the score and salvage, modules, supplies, weapons and hull; a
// load starts that world again from its first wave
function arcade_snapshot()
{
    return {
        world: campaign.world,
        difficulty,
        score,
        kills,
        salvage,
        run_time,
        upgrades: {...upgrades},
        supplies: {...supplies},
        hp: Math.max(1, Math.ceil(player.hp)),
        fleet: clone(ensure_career()),
    };
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
    document.getElementById('restart_button').innerHTML = '<span>New expedition</span>';
    document.getElementById('result_sector_label').textContent = 'Sector reached';
}

// Called from update() while a run is in flight.
function arcade_update(dt)
{
    depot_shield_update(dt);
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
        // the run as this world begins, for the numbers its cleared screen shows
        arcade.world_start = {score, kills, run_time};
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

// A world cleared pays a fixed bonus, the weapon grows a tier, and its cleared screen opens; its button opens the depot
// before the jump to the next world.
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
    toasts_clear();
    const start = arcade.world_start || {score: 0, kills: 0, run_time: 0};
    arcade_world_cleared_open(campaign.world, {
        score: score - start.score,
        total: score,
        best,
        raiders: kills - start.kills,
        time: run_time - start.run_time,
        bonus,
        salvage,
    });
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

// R at the station opens the depot, unless raiders are close: the depot is a shop, not a hiding place. From afar, R
// sets the course to the station, as in the campaign.
function arcade_interact()
{
    if (distance(player, station) > station_reach) {
        station_course();
        return;
    }
    if (depot_shield_up()) {
        show_toast('DEPOT SHIELDED', 'RAIDERS NEAR THE STATION · CLEAR THEM AND IT OPENS', 2);
        return;
    }
    docking_start(arcade_depot_open);
}

function arcade_depot_open()
{
    state = 'arcade_depot';
    stop_turbo();
    keys.clear();
    mouse_drive.active = false;
    mouse_drive.following = false;
    joystick.active = false;
    arcade_depot_view.hover = '';
    arcade_depot_fill();
    set_hidden(document.getElementById('arcade_depot'), false);
    document.getElementById('arcade_depot_launch').focus();
    sfx('pickup');
}

// The depot's view: the shelf shown, the search, and the item under the pointer (its preview on the ship)
const arcade_depot_view = {tab: 'all', search: '', hover: ''};

// The header, the ship and the next world, then the shop: repairs and supplies, the guns, the modules by shelf
function arcade_depot_fill()
{
    const cleared = arcade.between_worlds;
    const here = cleared ? cleared.world : campaign.world;
    const next = cleared ? cleared.world + 1 : null;
    set_hidden(document.getElementById('cleared_tick'), !cleared);
    document.getElementById('arcade_depot_eyebrow').textContent = `Arcade · depot · world ${here + 1} of ${worlds.length}`;
    document.getElementById('cleared_title').textContent = cleared ? `${worlds[here].name} cleared` : worlds[here].station;
    const stats = [['Raiders', String(kills)], ['Time', format_time(run_time)], ...(cleared ? [['Bonus', `+${cleared.bonus}`]] : []), ['Score', ui_number(score)]];
    document.getElementById('cleared_stats').innerHTML = stats.map(v => `<div><dt>${v[0]}</dt><dd${(v[0] === 'Bonus') ? ' class="t-gold"' : ''}>${v[1]}</dd></div>`).join('');
    document.getElementById('arcade_depot_ship_name').textContent = current_ship().name;
    document.getElementById('cleared_hull_text').innerHTML = `${Math.ceil(player.hp)}<small> / ${hull_max()}</small>`;
    document.getElementById('cleared_hull_fill').style.width = `${(player.hp/hull_max())*100}%`;
    document.getElementById('cleared_hull').classList.toggle('is-low', player.hp < hull_max()*0.5);
    const installed = upgrade_options.filter(v => upgrades[v.key] > 0);
    document.getElementById('arcade_depot_installed').innerHTML = installed.map(v => `<img src="${module_icon(v)}" alt="" title="${v.title} · level ${upgrades[v.key]}">`).join('') || '<span class="small">Nothing yet</span>';
    // the next world (or, between waves, this one)
    const shown = (next === null) ? here : next;
    document.getElementById('cleared_next_eyebrow').textContent = (next === null) ? 'This world' : 'Next world';
    document.getElementById('cleared_planet').src = menu_sprite_url(menu_planet_text(shown));
    const name = document.getElementById('cleared_next_name');
    name.textContent = worlds[shown].name;
    name.style.color = `var(--w-${world_slug(shown)})`;
    document.getElementById('arcade_depot_next').textContent = `${arcade_waves} waves · flagship`;
    document.getElementById('cleared_rules').innerHTML = world_rules[shown].summary.split(' · ').map(v => ui_badge(ui_sentence(v))).join('');
    document.getElementById('arcade_depot_launch').innerHTML = `<span>${(next === null) ? 'Back to the fight' : `Launch to ${worlds[next].name}`}</span><span class="key">Enter</span>`;
    const tabs = [{value: 'all', label: 'All'}, {value: 'repairs', label: 'Repairs'}, {value: 'weapons', label: 'Weapons'}, {value: 'ships', label: 'Ships'}, ...module_shelves];
    document.getElementById('arcade_depot_tabs').innerHTML = tabs.map(v => `<button type="button" class="${(v.value === arcade_depot_view.tab) ? 'is-active' : ''}" data-tab="${v.value}">${module_shelves.includes(v) ? `<i class="depot-dot depot-dot--${v.value}"></i>` : ''}${v.label}</button>`).join('');
    arcade_depot_render_list();
    arcade_depot_sync_hover();
}

// What the depot sells, as items of one shape: kind and id, the section it shows under, title, line, the words a
// search finds it by, icon, key, chips, level pips, price (null: nothing to buy), why it cannot be bought (Full, Max,
// Equipped) and what buying it does
function arcade_depot_items()
{
    const out = [];
    const low = player.hp < hull_max()*0.5;
    out.push({
        kind: 'supply', id: 'repair', section: 'repairs', title: 'Full repair', line: `Hull back to ${hull_max()}.`, tags: 'repair hull heal ремонт',
        icon: ship_parts_url('pickups/pickup-medkit'), chips: [['HULL', `${Math.ceil(player.hp)} → ${hull_max()}`, 'up']],
        price: 60, done: (player.hp >= hull_max()) ? 'Full' : '', primary: low,
        buy: function () {
            player.hp = hull_max();
        },
    });
    const kept = [
        ['medkit', 'Q', '+40 hull when you press Q.', 'repair heal ремонт аптечка'],
        ['emp', 'E', 'Clears enemy shots and blasts raiders nearby.', 'emp bullets clear'],
        ['stasis', 'F', 'Slows enemies and their shots for 8\u00a0s.', 'slow time stasis замедление'],
    ];
    for (const [key, keycap, line, tags] of kept) {
        const option = supply_options.find(v => v.key === key);
        out.push({
            kind: 'supply', id: key, section: 'repairs', title: option.title, line, tags,
            icon: ship_parts_url(`pickups/pickup-${(key === 'medkit') ? 'repair' : key}`), keycap, chips: [['HAVE', String(supplies[key])]],
            price: option.cost, done: (supplies[key] >= option.cap) ? 'Full' : '',
            buy: function () {
                supplies[key]++;
            },
        });
    }
    // the guns in the catalog's order, so a card stays under the pointer as you switch, their stats against yours; a
    // gun bought is yours for the run, and equipping it again is free
    const mine = current_weapon();
    const owned = ensure_career().weapons;
    for (const weapon of weapon_catalog) {
        const equipped = weapon.id === mine.id;
        const have = owned.includes(weapon.id);
        out.push({
            kind: 'weapon', id: weapon.id, section: 'weapons', title: equipped ? `${weapon.name} T${weapon_level()}` : weapon.name,
            line: equipped ? 'Your gun. It grows a tier with every world you clear.' : have ? `Yours. ${weapon.line}` : weapon.line,
            tags: `weapon gun оружие пушка ${weapon.tags || ''}`, icon: ship_parts_clean_url(`weapons/turret-${weapon.id}`), chips: arcade_weapon_chips(weapon, mine),
            price: equipped ? null : have ? 0 : 120 + weapon.rating*45, done: equipped ? 'Equipped' : '', owned: equipped, label: have ? 'Equip' : 'Buy',
            buy: function () {
                arcade_weapon_take(weapon);
            },
        });
    }
    // the ships in the catalog's order, their hull, shield and speed against yours; a ship bought stays yours too
    const flying = current_ship();
    for (const ship of ship_catalog) {
        const now = ship.id === flying.id;
        const have = ensure_career().ships.includes(ship.id);
        out.push({
            kind: 'ship', id: ship.id, section: 'ships', title: ship.name, line: now ? 'Your ship.' : have ? `Yours. ${ship.role}.` : `${ship.role}.`,
            tags: `ship hull ${ship.role.toLowerCase()} корабль`, icon: ship_parts_clean_url(`3d/ship-${ship.id}`), chips: arcade_ship_chips(ship, flying),
            price: now ? null : have ? 0 : Math.round((ship.price*arcade_ship_price)/10)*10, done: now ? 'Flying' : '', owned: now, label: have ? 'Fly' : 'Buy',
            buy: function () {
                arcade_ship_take(ship);
            },
        });
    }
    for (const shelf of module_shelves) {
        for (const option of upgrade_options.filter(v => v.shelf === shelf.value)) {
            const level = upgrades[option.key];
            out.push({
                kind: 'module', id: option.key, section: shelf.value, title: option.title, line: option.line, tags: option.tags, icon: module_icon(option),
                part: option.part, pips: [level, option.cap], price: module_cost(option), label: level ? 'Upgrade' : 'Buy',
                done: (level >= option.cap) ? 'Max' : module_needs_gun(option) ? 'Needs launcher' : '',
                buy: function () {
                    grant_upgrade(option);
                },
            });
        }
    }
    return out;
}

// The shop's list: the sections the tab shows, the items the search finds, marked where they match
function arcade_depot_render_list()
{
    const words = arcade_depot_view.search.toLowerCase().split(/\s+/).filter(Boolean);
    const found = arcade_depot_items().filter(v => words.every(vv => `${v.title} ${v.line} ${v.tags}`.toLowerCase().includes(vv)));
    const sections = [
        {value: 'repairs', label: 'Repairs and supplies', note: 'kept for the next world'},
        {value: 'weapons', label: 'Weapons', note: 'guns you buy stay yours · equip any for free'},
        {value: 'ships', label: 'Ships', note: 'your modules and gun move with you'},
        ...module_shelves,
    ];
    const html = [];
    for (const section of sections.filter(v => (arcade_depot_view.tab === 'all') || (arcade_depot_view.tab === v.value))) {
        const items = found.filter(v => v.section === section.value);
        if (items.length) {
            const dot = module_shelves.includes(section) ? `<i class="depot-dot depot-dot--${section.value}"></i>` : '';
            html.push(`<section class="depot-sec depot-sec--${section.value}"><header>${dot}<h3 class="h-section">${section.label}</h3><span class="eyebrow eyebrow--muted">${section.note}</span></header><div class="depot-grid">${items.map(v => arcade_depot_item_html(v, words)).join('')}</div></section>`);
        }
    }
    const list = document.getElementById('arcade_depot_list');
    list.innerHTML = html.join('') || `<div class="depot-empty">Nothing matches “${ui_escape(arcade_depot_view.search)}”. Try: homing, shield, speed, repair.</div>`;
}

// One item: icon, title (its key, ON SHIP for a module you will see on the ship), line, chips or level pips, and Buy
// with the price, "Need n" in the button when the salvage is short
function arcade_depot_item_html(item, words)
{
    const short = (item.price !== null) && !item.done && (salvage < item.price);
    const classes = ['depot-it', short && 'is-short', item.done && !item.owned && 'is-done', item.owned && 'is-owned'].filter(Boolean).join(' ');
    const chips = (item.chips || []).map(v => `<span class="depot-chip${v[2] ? ` is-${v[2]}` : ''}"><i>${v[0]}</i>${v[1]}</span>`).join('');
    const pips = item.pips ? `<span class="depot-pips${(item.pips[1] > 3) ? ' is-many' : ''}">${Array.from({length: item.pips[1]}, (_, i) => `<i${(i < item.pips[0]) ? ' class="on"' : ''}></i>`).join('')}</span>` : '';
    let action = '';
    if (item.done) {
        action = ui_badge(item.done, item.owned ? 'cyan' : '');
    }
    else if (item.price !== null) {
        const kind = short ? ' is-disabled is-short' : item.primary ? ' btn-primary' : '';
        const price = item.price ? `<span class="price">${ui_number(item.price)}</span>` : '';
        action = `<button type="button" class="btn btn-sm${kind}" data-buy${short ? ` disabled title="You need ${ui_number(item.price - salvage)} more salvage"` : ''}><span>${short ? `Need ${ui_number(item.price - salvage)}` : (item.label || 'Buy')}</span>${price}</button>`;
    }
    const keycap = item.keycap ? `<span class="key key--sm">${item.keycap}</span>` : '';
    const part = item.part ? '<span class="depot-onship" title="You will see it on your ship">ON SHIP</span>' : '';
    return `<div class="${classes}" data-item="${item.kind}:${item.id}"><span class="ic"><img src="${item.icon}" alt=""></span><b><span>${arcade_depot_mark(item.title, words)}</span>${keycap}${part}</b><p>${arcade_depot_mark(item.line, words)}</p><div class="row">${chips}${pips}${action}</div></div>`;
}

// Text with the words of the search marked
function arcade_depot_mark(text, words)
{
    let out = ui_escape(text);
    for (const word of words.filter(v => v.length > 1)) {
        out = out.replace(new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<mark>$1</mark>');
    }
    return out;
}

// The item under the pointer: the wallet says what is left after it (or what is missing), and a module you will see
// on the ship shows on it, pulsing gold, at its next level
function arcade_depot_sync_hover()
{
    const item = arcade_depot_view.hover ? arcade_depot_items().find(v => `${v.kind}:${v.id}` === arcade_depot_view.hover) : null;
    const buyable = item && !item.done && (item.price !== null);
    document.getElementById('arcade_depot_wallet').textContent = ui_number(salvage);
    const after = document.getElementById('arcade_depot_after');
    after.className = (buyable && (salvage < item.price)) ? 'after is-short' : 'after';
    after.innerHTML = (!buyable || !item.price) ? '' : (salvage < item.price) ? `need <b>${ui_number(item.price - salvage)}</b>` : `after <b>${ui_number(salvage - item.price)}</b>`;
    const base = {...ship_parts_loadout(), gun: current_weapon().id};
    const ship_id = current_ship().id;
    let preview = null;
    let pulse = '';
    if (buyable && item.part) {
        preview = {...ship_parts_loadout({...upgrades, [item.id]: upgrades[item.id] + 1}), gun: base.gun};
        // a level the drawing does not show (magnet 3, the second prism) lights the part it improves
        if (arcade_depot_ship_signature(ship_id, preview) === arcade_depot_ship_signature(ship_id, base)) {
            pulse = item.part;
        }
    }
    else if (buyable && (item.kind === 'weapon')) {
        preview = {...base, gun: item.id};
    }
    // a ship shows as it would fly: your parts and gun on its hull
    const ship = (buyable && (item.kind === 'ship')) ? ship_catalog.find(v => v.id === item.id) : null;
    if (ship) {
        arcade_depot_ship_show(ship_parts_svg(ship.id, base));
    }
    else {
        arcade_depot_ship_show(ship_parts_svg(ship_id, preview || base, preview ? base : null, pulse));
    }
    document.getElementById('arcade_depot_ship_name').textContent = (ship || current_ship()).name;
    document.getElementById('arcade_depot_shipbox').classList.toggle('is-preview', !!(preview || ship));
}

// What a loadout draws on the ship: its parts where they sit, and its drones
function arcade_depot_ship_signature(ship_id, loadout)
{
    return ship_parts_layout(ship_id, loadout).map(ship_parts_place).join() + loadout.drones;
}

// The ship in the depot, changed in place: the parts it keeps stay as they are, so the drones keep their orbit and
// nothing blinks while the pointer runs down the list; a new drone joins the others' orbit at its own place
function arcade_depot_ship_show(html)
{
    const holder = document.getElementById('arcade_depot_ship');
    const box = document.createElement('div');
    box.innerHTML = html;
    const next = box.firstElementChild;
    const svg = holder.querySelector('svg');
    if (!svg) {
        holder.replaceChildren(next);
        return;
    }
    const kept = [...svg.children].map(v => ({key: arcade_depot_part_key(v), element: v}));
    let last = null;
    for (const element of [...next.children]) {
        const key = arcade_depot_part_key(element);
        const i = kept.findIndex(v => v.key === key);
        if (i >= 0) {
            const old = kept.splice(i, 1)[0].element;
            old.setAttribute('class', element.getAttribute('class') || '');
            last = old;
            continue;
        }
        if (last) {
            last.after(element);
        }
        else {
            svg.prepend(element);
        }
        last = element;
    }
    for (const v of kept) {
        v.element.remove();
    }
    const orbits = [...svg.querySelectorAll('.parts-orbit')].flatMap(v => v.getAnimations()).filter(v => v.animationName === 'parts-orbit');
    const start = orbits.find(v => v.startTime !== null)?.startTime;
    if (start !== undefined) {
        for (const v of orbits) {
            v.startTime = start;
        }
    }
}

// A part of the ship's <svg> by what it draws and where, whatever its class (a previewed part keeps its node once bought)
function arcade_depot_part_key(element)
{
    const copy = element.cloneNode(true);
    copy.removeAttribute('class');
    return copy.outerHTML;
}

// A ship's hull, shield and speed as chips, each marked against yours: up better, down worse
function arcade_ship_chips(ship, mine)
{
    function mark(name, text, value, now) {
        return [name, text, (ship.id === mine.id) ? '' : (value > now) ? 'up' : (value < now) ? 'down' : ''];
    }
    return [
        mark('HULL', String(ship.hull), ship.hull, mine.hull),
        mark('SHIELD', String(ship.shield), ship.shield, mine.shield),
        mark('SPEED', `×${ship.speed}`, ship.speed, mine.speed),
    ];
}

// A ship bought or taken out again; the modules and the gun move over, a new hull comes repaired and one you had keeps
// its share of the damage
function arcade_ship_take(ship)
{
    const fleet = ensure_career();
    const fresh = !fleet.ships.includes(ship.id);
    const share = player.hp/hull_max();
    if (fresh) {
        fleet.ships.push(ship.id);
    }
    fleet.ship_id = ship.id;
    player.hp = fresh ? hull_max() : Math.max(1, Math.round(share*hull_max()));
    player.shield = shield_max();
    player.turbo_fuel = turbo_duration();
    player.r = ship.radius;
}

// A gun's damage, fire interval and range as chips, each marked against your gun: up better, down worse
function arcade_weapon_chips(weapon, mine)
{
    const range = weapon_range(weapon);
    const mine_range = weapon_range(mine);
    function mark(name, text, better, worse) {
        return [name, text, (weapon.id === mine.id) ? '' : better ? 'up' : worse ? 'down' : ''];
    }
    return [
        mark('DMG', String(weapon.damage), weapon.damage > mine.damage, weapon.damage < mine.damage),
        mark('RATE', `${weapon.interval}s`, weapon.interval < mine.interval, weapon.interval > mine.interval),
        mark('RANGE', `${(range/1000).toFixed(1)} km`, range > mine_range, range < mine_range),
    ];
}

function arcade_depot_buy(id)
{
    const item = arcade_depot_items().find(v => `${v.kind}:${v.id}` === id);
    if ((state !== 'arcade_depot') || !item || item.done || (item.price === null) || (salvage < item.price)) {
        return;
    }
    salvage -= item.price;
    item.buy();
    sfx('upgrade');
    update_hud();
    arcade_depot_fill();
    document.querySelector(`#arcade_depot_list [data-item="${id}"]`)?.classList.add('is-flash');
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
    else {
        docking_leave();
    }
}

function arcade_finish(won)
{
    state = won ? 'won' : 'dead';
    const kept = salvage*arcade_salvage_points;
    score += kept;
    const previous = best;
    const record = save_best();
    if (won) {
        for (const v of [el.loadout, el.inventory_button, el.mission, el.pause_button, el.touch_buttons, el.bossbar]) {
            set_hidden(v, true);
        }
        toasts_clear();
        arcade_finale_open({score, best: previous, raiders: kills, time: run_time, salvage, kept});
        return;
    }
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
        : `You reached ${worlds[campaign.world].name}, wave ${arcade.wave} of ${arcade_waves}.${salvage ? ` Salvage kept: ◆ ${ui_number(salvage)}, +${ui_number(kept)} points.` : ''}`;
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
