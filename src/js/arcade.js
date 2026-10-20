// Arcade: one run through the eight worlds, three waves each, the world's flagship in the third; no stations, contracts or saves.
const arcade = {active: false, world: -1, wave: 0, pause: 0, squad_timer: 0, squads: 0, phase: 0, slowmo: 0, depot_hint: false, marksman_hint: false, missile_hint: false, blasts: [], event: null, between_worlds: null, world_start: null, lives: 0, life_flash: 0, campaign_checkpoint: null, route: [0], seed: 0, cards: [], wind_used: false, flagship_escaped: false, owned: {}, fitted: [], reactor: 0, evade: 0, wave_total: 0, trial: false, retry_depot: false};
const arcade_waves = 3;
const arcade_radiation = 0.35;
const arcade_wave_names = ['', 'SCOUTS', 'ASSAULT', 'FLAGSHIP'];
// a run's lives: a death costs one and starts its world again (arcade_retry); the last one ends the run
const arcade_lives = 3;
// how long the life just lost blinks in the HUD after a retry, in seconds
const arcade_life_flash = 2.4;
// salvage left unspent when the run ends adds this many points each, so keeping it is a choice too
const arcade_salvage_points = 10;
// the depot sells ships at this share of the campaign's prices
const arcade_ship_price = 0.5;
// The share of raiders that are marksmen, Haven to Eclipse, before the mode's factor: a marksman aims where you will be
// when its shot gets there, not where you are, and shows its aim for the last half second (arcade_aim_time).
const arcade_marksmen = [0, 0.2, 0.3, 0.3, 0.15, 0.25, 0.2, 0.05];
const arcade_aim_time = 0.5;
// a marksman's missile turns this much harder than another's
const arcade_marksman_turn = 1.15;
// how much slower a raider reloads by its gun (arcade_reload): a missile is a threat to read and answer, one at a time,
// not a stream
const arcade_reloads = {missile: 2};
// the share of lines and pincers from wave 2 that fly mixed, a second type in every other place (arcade_squad_mix)
const arcade_squad_mixed = 0.35;
// What each difficulty changes in the arcade: extra raiders per squadron and per wave, the gap between squadrons, the
// first world with elites, the share of repairs that still drop, the medkits a run starts with, whether every raider
// fires its world's gun (Haven's plasma included), how often (a factor on the gun's cooldown), and how hard its shots
// hit, the raiders' hull, how much it grows a world past Haven and the share of the world's shop on it
// (arcade_shop_hull), the share of the world's armour and shield they
// carry, the blast damage you take (a ship's explosion or a raider missile), raiders that grow with your weapon tier,
// the flagship's overdrive, and a factor on the share of marksmen.
const arcade_modes = {
    chill: {squad: 0, wave: 0, gap: 1, elite_world: 1, repairs: 1, medkits: 2, armed: false, gun_gap: 1, hits: 1, hull: 1, growth: 0.1, shop: 0.5, defense: 0.8, blast: 0.8, tier_hp: false, overdrive: false, marksmen: 0.5},
    normal: {squad: 1, wave: 3, gap: 0.8, elite_world: 0, repairs: 0.35, medkits: 1, armed: true, gun_gap: 0.45, hits: 1.3, hull: 1.5, growth: 0.15, shop: 1, defense: 0.8, blast: 0.65, tier_hp: false, overdrive: false, marksmen: 1},
    overload: {squad: 2, wave: 5, gap: 0.7, elite_world: 0, repairs: 0, medkits: 1, armed: true, gun_gap: 0.4, hits: 1.75, hull: 1.8, growth: 0, shop: 1, defense: 0.5, blast: 1.2, tier_hp: true, overdrive: true, marksmen: 1.3},
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
    const button = event.target.closest('[data-buy], [data-fit]');
    if (!button || button.disabled) {
        return;
    }
    const id = button.closest('[data-item]').dataset.item;
    if (button.dataset.fit) {
        arcade_depot_fit(id, button.dataset.fit);
    }
    else {
        arcade_depot_buy(id);
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

// A run from world 1, or (from: an arcade save) resumed at the start of the world it was saved in, with the lives it
// kept (a save from before lives, all of them)
function arcade_start(world = 0, from = null)
{
    if (from) {
        world = from.world;
        difficulty = from.difficulty;
        // a save from before the kinds is a Free run
        arcade_kind_pick(from.kind || 'free');
    }
    arcade.active = true;
    arcade.trial = false;
    arcade.retry_depot = false;
    arcade.lives = Number.isFinite(from?.lives) ? clamp(Math.round(from.lives), 1, arcade_lives) : arcade_lives;
    arcade.life_flash = 0;
    arcade.world = -1;
    arcade.wave = 0;
    arcade.pause = 0;
    arcade.depot_hint = false;
    arcade.marksman_hint = false;
    arcade.missile_hint = false;
    arcade.blasts = [];
    arcade.between_worlds = null;
    arcade.world_start = null;
    raider_jobs_reset();
    // the route flown and the cards taken (arcade_route.js, arcade_cards.js), before the run's first frame counts on them
    arcade_route_start(world, from);
    arcade_cards_start(from);
    document.body.classList.add('arcade');
    set_hidden(document.getElementById('arcade_depot'), true);
    document.getElementById('restart_button').innerHTML = '<span>New run</span>';
    document.getElementById('restart_button').classList.remove('btn-primary');
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
    // the module levels owned and those installed, within the reactor's power (arcade_power.js)
    arcade_modules_start(from);
}

// The run as an arcade save keeps it: the world it is in, the score and salvage, the module levels installed (upgrades),
// owned and in the order they went in (fitted), the Reactor tunings bought, supplies, weapons and hull, the route flown, the run's dice, the cards
// taken and the lives left; a load starts that world again from its first wave
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
        owned: {...arcade.owned},
        fitted: [...arcade.fitted],
        reactor: arcade.reactor,
        supplies: {...supplies},
        hp: Math.max(1, Math.ceil(player.hp)),
        fleet: clone(ensure_career()),
        route: [...arcade.route],
        seed: arcade.seed,
        cards: arcade.cards.map(v => ({...v})),
        lives: arcade.lives,
        kind: arcade_scroll.kind,
    };
}

// One line under the menu's difficulty switch on what the mode does: one line in the row, so the row with its kind
// cards above still leaves Load, Settings and Controls in a 1280x720 window
function sync_mode_note()
{
    // the Base kind has no elites, and its raiders do not grow (arcade_base.js)
    const base = arcade_base_kind();
    document.getElementById('mode_note').textContent = {
        chill: 'Slower, weaker raiders; hits hurt a third less.',
        normal: base ? 'Every raider fires; bigger squadrons.' : 'Every raider fires; bigger squadrons, elites from Haven on.',
        overload: base ? 'Tougher raiders; no repairs; overdrive.' : 'Tougher raiders that grow with your gun; no repairs; overdrive.',
    }[difficulty] || '';
}

function arcade_mode()
{
    return arcade_modes[difficulty] || arcade_modes.normal;
}

// A factor on a raider's reload: slower in the arcade for a missile (arcade_reloads), as it is for others, and slower
// on a Scroll lane (arcade_scroll_reload)
function arcade_reload(enemy)
{
    return arcade.active ? (arcade_reloads[enemy.weapon] || 1)*arcade_card_k.raider_fire*(arcade_scroll_on() ? arcade_scroll_reload : 1)*arcade_base_reload() : 1;
}

// Whether a repair may drop: always outside the arcade; in it, as often as the mode allows.
function repair_drop_allowed()
{
    return !arcade.active || (Math.random() < arcade_mode().repairs);
}

// A raider's hull by the mode and the run's step (the flagship has its own scale), and a card's factor; on OVERLOAD it
// also grows as your weapon's tier does, by the same 22% a tier adds to your damage.
// What each step's shop lets a kit do (the step's world in today's order), on the raiders' hull (a raider, a flagship),
// at the mode's share (shop): NORMAL and OVERLOAD all of it, CHILL half. It used to assume every level bought and
// installed (raiders ×1 to Obsidian, then ×2.2, ×2.8, ×3; flagships ×1, 1, 1.8, 1.3, 2, 4, 4, 2): from Obsidian on a
// world sells the gunship's third mount, the second Prism level, the cruiser's fourth and the top gun tiers. With the
// reactor's power budget (arcade_power.js) a kit flies a fifth to a quarter of the levels, and the armour of the later
// worlds bites a smaller damage harder, so the hull is cut from Verdant on: measured with bin/playtest (NORMAL, seeds
// 1–12) until its bot won about half its runs, as before the budget (docs/balance.md, The arcade's power budget).
const arcade_shop_hull = [1, 0.7, 0.55, 0.4, 0.3, 0.5, 0.6, 0.5];
const arcade_shop_flagship = [1, 0.7, 1, 0.5, 0.6, 1, 1, 0.45];

function arcade_hull_scale(enemy)
{
    const mode = arcade_mode();
    // a Base run's raiders keep Haven's hull in every world (arcade_base.js)
    const level = arcade_base_kind() ? 0 : arcade_level();
    const shop = ((enemy.type === 'boss') ? arcade_shop_flagship : arcade_shop_hull)[level] ?? 1;
    const growth = (enemy.type === 'boss') ? 1 : mode.hull*(1 + mode.growth*level)*arcade_card_k.raider_hull;
    const k = growth*(1 + (shop - 1)*mode.shop)*(mode.tier_hp ? 1 + (weapon_level() - 1)*0.22 : 1);
    enemy.hp = Math.round(enemy.hp*k);
    enemy.max_hp = Math.round(enemy.max_hp*k);
}

function arcade_stop()
{
    arcade.active = false;
    arcade_scroll.on = false;
    arcade.between_worlds = null;
    arcade_event_end();
    raider_jobs_reset();
    arcade_cards_stop();
    set_hidden(document.getElementById('arcade_break'), true);
    document.body.classList.remove('arcade');
    set_hidden(document.getElementById('arcade_depot'), true);
    document.getElementById('restart_button').innerHTML = '<span>New expedition</span>';
    document.getElementById('restart_button').classList.remove('btn-primary');
    document.getElementById('result_sector_label').textContent = 'Sector reached';
    document.getElementById('result_score_label').textContent = 'Final score';
}

// Called from update() while a run is in flight.
function arcade_update(dt)
{
    arcade.life_flash = Math.max(0, arcade.life_flash - dt);
    depot_shield_update(dt);
    // raiders with jobs do them, the mines tick and the packs hunt (arcade_raiders.js, arcade_pack.js)
    raider_jobs_update(dt);
    // on a Scroll lane the raiders left behind are held just out of sight (arcade_scroll.js)
    arcade_scroll_raiders();
    // a broken cliff rumbles and falls, between waves too (arcade_cliffs.js)
    cliffs_update(dt);
    for (const enemy of enemies) {
        if (!enemy.arcade_scaled) {
            enemy.arcade_scaled = true;
            enemy.armor = (enemy.armor || 0)*arcade_mode().defense;
            enemy.shield = (enemy.shield || 0)*arcade_mode().defense;
            enemy.max_shield = (enemy.max_shield || 0)*arcade_mode().defense;
            enemy.marksman = arcade_marksman(enemy);
            arcade_hull_scale(enemy);
        }
        // the run's first marksman says what its dashed line means
        if (enemy.marksman && !arcade.marksman_hint) {
            arcade.marksman_hint = true;
            show_toast('MARKSMEN', 'A DASHED LINE IS WHERE THEY AIM · TURN OFF IT', 3.5, 'danger');
        }
    }
    // the run's first raider missile close by says that a dash does not carry you through its blast
    if (!arcade.missile_hint && hostile.some(v => v.missile && (distance(v, player) < 600))) {
        arcade.missile_hint = true;
        show_toast('MISSILES', 'A DASH IS NO SHIELD FROM THE BLAST · OUTTURN THEM', 3.5, 'danger');
    }
    if (arcade.world !== campaign.world) {
        arcade.world = campaign.world;
        // the run as this world begins, for the numbers its cleared screen shows and a retry after a death (as a load)
        arcade.world_start = {score, kills, run_time, snapshot: arcade_snapshot()};
        arcade_cards_world_start();
        arcade_gravity_world_start();
        // a Scroll run: the world's lane, the view at its start and you at its back (arcade_scroll.js)
        arcade_scroll_world_start();
        arcade_wave_start(1);
        cliffs_hint();
        pylons_hint();
        spires_hint();
        return;
    }
    // a Base world ends where its lane ends (arcade_base.js)
    if (arcade_base_update()) {
        return;
    }
    // on a Scroll lane the next wave comes as the screen reaches it, the one before down or not (arcade_scroll.js)
    if (arcade_scroll_waves()) {
        return;
    }
    if (arcade.pause > 0) {
        // on a Scroll lane the next wave waits for the screen to reach its stretch (arcade_scroll.js)
        arcade.pause = arcade_scroll_ready(arcade.wave + 1) ? arcade.pause - dt : Math.max(arcade.pause, dt);
        if (arcade.pause <= 0) {
            arcade_wave_start(arcade.wave + 1);
        }
        return;
    }
    arcade_blasts_update(dt);
    arcade_event_update(dt);
    arcade_squads_update(dt);
    arcade_flagship_update();
    if (!arcade.depot_hint && (salvage > 0)) {
        arcade.depot_hint = true;
        show_toast('SALVAGE ◆', arcade_scroll_on() ? 'SPEND IT AT THE DEPOT · AFTER THIS WORLD' : 'SPEND IT AT THE STATION · FLY IN AND PRESS R', 3.5);
    }
    if ((spawn_left > 0) || enemies.some(v => v.hp > 0)) {
        return;
    }
    // the card says the wave is clear, and then the next one: no news for either
    if (arcade.wave < arcade_waves) {
        arcade.pause = 2.5;
        return;
    }
    arcade_world_clear();
}

function arcade_wave_start(n)
{
    arcade.wave = n;
    play_log_wave(n);
    arcade.squad_timer = 0.8;
    arcade.squads = 0;
    phase_index = n;
    phase_timer = 0;
    // a Scroll lane's wave by the length of its stretch (arcade_scroll.js)
    spawn_left = arcade_scroll_wave_size(n, arcade_wave_size(n));
    arcade.wave_total = spawn_left;
    // a world begins clear of the last one's mines and packs
    if (n === 1) {
        raider_jobs_reset(false);
    }
    if (n === arcade_waves) {
        arcade_flagship_spawn();
    }
    // a Scroll lane has no shelter to fly back to: the lining is full as each wave begins
    if (arcade_scroll_on()) {
        player.radiation_dose = 0;
    }
    // a wave-2 event is a chase across open space: none on a Scroll lane
    if ((n === 2) && !arcade_scroll_on()) {
        arcade_event_start();
    }
    else {
        arcade_event_end();
    }
}

// A wave's raiders by the run's step and the wave, and a card's factor. One more a step, not two: with waves 1 and 2
// full again (no world goals since 2026-10-18), two a step made Eclipse's second wave 31 raiders and the bot won 3
// runs of 12; with one, 8 of 12, as with the goals.
function arcade_wave_size(n)
{
    return Math.round((10 + arcade_level() + (n - 1)*4 + arcade_mode().wave)*arcade_card_k.raiders);
}

// Raiders come in squadrons from one side, not one by one; a squadron waits while the sky is crowded (on a Scroll
// lane sooner: arcade_scroll_crowd). On a lane short of raiders (arcade_scroll_short) the next comes at once, whatever
// the distance flown.
function arcade_squads_update(dt)
{
    arcade.squad_timer -= dt;
    const alive = enemies.filter(v => v.hp > 0).length;
    const short = arcade_scroll_short(alive);
    if (short) {
        arcade.squad_timer = Math.min(arcade.squad_timer, arcade_scroll_floor_gap);
    }
    if ((spawn_left <= 0) || (arcade.squad_timer > 0) || (alive > (arcade_scroll_on() ? arcade_scroll_crowd_now() : 14)) || (!short && !arcade_scroll_squad_due())) {
        return;
    }
    // one the floor calls tops the lane up to two past it, no more: a full squadron there piled up 6 to 9 raiders from
    // Obsidian on, and the bot lost every run
    const full = 3 + Math.min(3, Math.floor(arcade_level()/2)) + (arcade.wave - 1) + arcade_mode().squad;
    const size = short ? Math.min(full, Math.max(3, arcade_scroll_floor() + 2 - alive)) : full;
    arcade_squad_spawn(Math.min(spawn_left, size));
    spawn_left -= Math.min(spawn_left, size);
    arcade.squad_timer = Math.max(2.6, 5.5 - arcade_level()*0.3)*arcade_mode().gap;
}

// A squadron: as it comes (arcade_squad_form), then some of its line raiders swapped for raiders with jobs, and the
// rest as a pack (raider_squad_after)
function arcade_squad_spawn(size)
{
    const first = enemies.length;
    arcade_squad_form(size);
    // a Scroll lane's formation keeps its places: no jobs and no pack for it (arcade_scroll.js); a Base lane's
    // raiders have none at all (arcade_base.js)
    if (!arcade_base_on()) {
        raider_squad_after(enemies.slice(first).filter(v => !v.path));
    }
}

// How a squadron comes, by the type the world's mix draws for it: a line of one type, as it always did; a pincer, the
// line split to both sides of you; a wall, a tank in front with shooters behind it; a convoy, chasers round a slow
// tank; an ambush, lancers waiting still among the rocks. From the mode's first elite step on, every second
// squadron from wave 2 has an elite leader (every one under an Elite hunt card).
function arcade_squad_form(size)
{
    // a Base lane brings chasers and passers only (arcade_base.js)
    if (arcade_base_on()) {
        arcade_base_squad(size);
        return;
    }
    const type = (arcade.wave === 1) ? ((Math.random() < 0.7) ? 'chaser' : 'shooter') : enemy_type();
    const pattern = arcade_squad_pattern(type, size);
    // on a Scroll lane a squadron comes from ahead, past the front edge, at a place across it (arcade_scroll.js)
    const ahead = arcade_scroll_on() ? arcade_scroll_squad_spot(rand(-1, 1)) : null;
    const angle = ahead ? ahead.angle : Math.random()*Math.PI*2;
    const far = ahead ? ahead.far : 640;
    const elite = (arcade_level() >= arcade_mode().elite_world) && (arcade.wave >= 2) && ((arcade.squads % 2 === 1) || !!arcade_card_k.elites);
    arcade.squads++;
    if (pattern === 'ambush') {
        arcade_squad_ambush(size, elite);
        return;
    }
    if ((pattern === 'wall') || (pattern === 'convoy')) {
        arcade_squad_escorted(pattern, size, angle, elite, far);
        return;
    }
    const mix = arcade_squad_mix(type, size);
    // on a Scroll lane most squadrons come as a formation across the screen (arcade_scroll.js)
    if (ahead && arcade_scroll_formation(type, size, elite, mix)) {
        return;
    }
    // in Dustfall a share of them warp in under a cliff (arcade_cliffs.js), in one line
    const spot = !ahead && cliff_squad_spot();
    if (spot) {
        arcade_squad_line(type, size, Math.atan2(spot.y - player.y, spot.x - player.x), elite, mix, distance(spot, player));
        return;
    }
    // a pincer: the line split to both sides of you; on a lane, to the two front corners
    const sides = (pattern !== 'pincer') ? [{angle, far}] : ahead ? [arcade_scroll_squad_spot(-1), arcade_scroll_squad_spot(1)] : [{angle, far}, {angle: angle + Math.PI, far}];
    for (let i = 0; i < sides.length; ++i) {
        const count = (sides.length === 1) ? size : (i === 0) ? Math.ceil(size/2) : Math.floor(size/2);
        arcade_squad_line(type, count, sides[i].angle, elite && (i === 0), mix, sides[i].far);
    }
}

// A mixed squadron: from wave 2, a share of the lines and pincers fly with a second type of the world's mix in every
// other place (shooters behind chasers, lancers among splitters); none when the world's mix has no other type
function arcade_squad_mix(type, size)
{
    if ((arcade.wave < 2) || (size < 3) || (Math.random() >= arcade_squad_mixed)) {
        return null;
    }
    for (let i = 0; i < 4; ++i) {
        const other = enemy_type();
        if ((other !== type) && (other !== 'tank')) {
            return other;
        }
    }
    return null;
}

// The pattern for a squadron of this type: tanks lead walls and convoys, lancers lie in ambush where there are rocks
// to hide in, the rest come in a line or a pincer; a squadron too small for its pattern comes in a line.
function arcade_squad_pattern(type, size)
{
    const n = Math.random();
    if ((type === 'tank') && (size >= 3)) {
        return (n < 0.5) ? 'wall' : 'convoy';
    }
    if ((type === 'lancer') && (n < 0.7) && arcade_ambush_rocks().length) {
        return 'ambush';
    }
    return ((size >= 4) && (n < 0.35)) ? 'pincer' : 'line';
}

// One type in a line across its heading (or two, mixed: the second in every other place), 640 m away (or `far`) on the
// given side, warping in; then it hunts as a pack (arcade_pack.js)
function arcade_squad_line(type, size, angle, elite, mix = null, far = 640)
{
    const cx = player.x + Math.cos(angle)*far;
    const cy = player.y + Math.sin(angle)*far;
    for (let i = 0; i < size; ++i) {
        const offset = (i - (size - 1)/2)*55;
        const kind = (mix && (i % 2 === 1)) ? mix : type;
        const enemy = arcade_squad_warp(kind, cx - Math.sin(angle)*offset, cy + Math.cos(angle)*offset, i);
        if (elite && (i === 0)) {
            arcade_elite_make(enemy);
        }
    }
}

// A tank, two in a squadron of seven or more, leading the rest: a wall puts shooters in a row behind it, a convoy
// puts chasers round it, 640 m from you (or `far`). They keep their places while their leader lives and you keep away
// (arcade_role_steer).
function arcade_squad_escorted(pattern, size, angle, elite, far = 640)
{
    const cx = player.x + Math.cos(angle)*far;
    const cy = player.y + Math.sin(angle)*far;
    const heading = angle + Math.PI;
    const leaders = (size >= 7) ? 2 : 1;
    const escorts = size - leaders;
    const lead = [];
    for (let i = 0; i < leaders; ++i) {
        const side = (leaders === 1) ? 0 : (i - 0.5)*90;
        const enemy = arcade_squad_warp('tank', cx - Math.sin(heading)*side, cy + Math.cos(heading)*side, i);
        enemy.angle = heading;
        if (elite && (i === 0)) {
            arcade_elite_make(enemy);
        }
        lead.push(enemy);
    }
    for (let i = 0; i < escorts; ++i) {
        const leader = lead[i % leaders];
        // a wall: a row 80 m behind, 60 m apart; a convoy: a ring 80 m round, its gap to the front
        const k = (escorts === 1) ? 0 : i/(escorts - 1) - 0.5;
        const offset = (pattern === 'wall') ? [-80, k*60*escorts] : [80*Math.cos(Math.PI*(0.35 + 1.3*(i/Math.max(1, escorts - 1)))), 80*Math.sin(Math.PI*(0.35 + 1.3*(i/Math.max(1, escorts - 1))))];
        const x = leader.x + Math.cos(heading)*offset[0] - Math.sin(heading)*offset[1];
        const y = leader.y + Math.sin(heading)*offset[0] + Math.cos(heading)*offset[1];
        const enemy = arcade_squad_warp((pattern === 'wall') ? 'shooter' : 'chaser', x, y, leaders + i);
        enemy.angle = heading;
        enemy.guard = leader;
        enemy.guard_offset = offset;
    }
}

// Lancers in the rocks between 450 and 1000 m from you, still and dark until you come near or hit one; no warp flash
// gives them away, only the radar
function arcade_squad_ambush(size, elite)
{
    const rocks = arcade_ambush_rocks();
    for (let i = 0; i < size; ++i) {
        const rock = rocks[i % rocks.length];
        const a = Math.random()*Math.PI*2;
        const enemy = spawn_enemy('lancer');
        enemy.x = clamp(rock.x + Math.cos(a)*(rock.r + 30), 40, world.w - 40);
        enemy.y = clamp(rock.y + Math.sin(a)*(rock.r + 30), 40, world.h - 40);
        enemy.lurk = true;
        if (elite && (i === 0)) {
            arcade_elite_make(enemy);
        }
    }
}

// The rocks a lancer can hide by: 450 to 1000 m from you, the nearest first; on a Scroll lane, those ahead
// (arcade_scroll_ambush_rocks)
function arcade_ambush_rocks()
{
    if (arcade_scroll_on()) {
        return arcade_scroll_ambush_rocks().sort((a, b) => distance(a, player) - distance(b, player));
    }
    return ore_nodes.filter(v => (distance(v, player) > 450) && (distance(v, player) < 1000)).sort((a, b) => distance(a, player) - distance(b, player));
}

function arcade_squad_warp(type, x, y, i)
{
    const enemy = spawn_enemy(type);
    enemy.x = clamp(x, 40, world.w - 40);
    enemy.y = clamp(y, 40, world.h - 40);
    ring(enemy.x, enemy.y, enemy.color || pink, 40, 0.4);
    explode(enemy.x, enemy.y, 26, '#a8e4ff', i*0.05, 'warp');
    return enemy;
}

// A raider's way by its place in a squadron, after its type has chosen one (update): an escort keeps its place by its
// leader, at the leader's pace, until the leader dies or you come within 300 m; an anchored raider stays put; a
// lurker waits still, turned to you, until you come within 420 m, it is hit, 25 s pass or a Scroll lane's back edge
// passes it (arcade_scroll_behind); a raider with a job does it
// (raider_job_steer); a pack's raider hunts by its role (arcade_pack_steer). Turns the raider (angle) and returns how
// fast it moves.
function arcade_role_steer(v, move, d)
{
    // a Scroll lane's formation keeps to its way across the screen (arcade_scroll.js)
    if (v.path) {
        return arcade_scroll_path_steer(v);
    }
    if (v.event_goal) {
        return arcade_event_steer(v);
    }
    // an anchored raider (a flagship's nest, boss_duels.js) stays where it stands, turned to you
    if (v.anchor) {
        v.angle = Math.atan2(player.y - v.y, player.x - v.x);
        return 0;
    }
    if (v.job) {
        return raider_job_steer(v, move, d);
    }
    if (v.lurk) {
        if ((d > 420) && (v.hp >= v.max_hp) && ((v.shield || 0) >= (v.max_shield || 0)) && (v.age < 25) && !arcade_scroll_behind(v)) {
            // a lancer charges at the end of its count: hold the count while it waits
            v.charge_cd = Math.max(v.charge_cd, 1.5);
            return 0;
        }
        v.lurk = false;
        ring(v.x, v.y, gold, 50, 0.3);
        return move;
    }
    if (!v.guard) {
        return arcade_pack_steer(v, move, d);
    }
    const lead = v.guard;
    if ((lead.hp <= 0) || (d < 300)) {
        v.guard = null;
        return move;
    }
    const tx = lead.x + Math.cos(lead.angle)*v.guard_offset[0] - Math.sin(lead.angle)*v.guard_offset[1];
    const ty = lead.y + Math.sin(lead.angle)*v.guard_offset[0] + Math.cos(lead.angle)*v.guard_offset[1];
    // the leader's way plus a pull to the place, twice the gap a second
    const vx = Math.cos(lead.angle)*lead.speed + (tx - v.x)*2;
    const vy = Math.sin(lead.angle)*lead.speed + (ty - v.y)*2;
    v.angle = Math.atan2(vy, vx);
    return Math.min(1.5, Math.sqrt(vx*vx + vy*vy)/v.speed);
}

function arcade_elite_make(enemy)
{
    enemy.arcade_scaled = true;
    enemy.elite = true;
    enemy.hp = Math.round(enemy.max_hp*3);
    enemy.max_hp = enemy.hp;
    enemy.r = Math.round(enemy.r*1.35);
    enemy.armor = (enemy.armor || 0)*arcade_mode().defense;
    enemy.max_shield = 40 + arcade_level()*25;
    enemy.shield = enemy.max_shield;
    arcade_hull_scale(enemy);
    enemy.drop_on_death = repair_drop_allowed() ? 'medkit' : 'emp';
    enemy.marksman = arcade_marksman(enemy);
}

// Whether a raider is a marksman: by the world's share and the mode's; an elite always is, from the first world with
// marksmen on; a flagship, a shard and a raider with a job (it has a tell of its own) never
function arcade_marksman(enemy)
{
    const share = arcade_marksmen[campaign.world]*arcade_mode().marksmen;
    if ((enemy.type === 'boss') || (enemy.type === 'shard') || enemy.job || enemy.unarmed || !share) {
        return false;
    }
    return enemy.elite || (Math.random() < share);
}

// Where a raider fires at its target: where the target will be when a shot of this speed (raider_shot_speed) gets there
// if it keeps its course, in the campaign and the arcade alike; straight at it when the shot cannot catch it within
// 1.5 s. The course is taken as straight: a target that turns is not where the shot goes, and that is how it is
// dodged. A marksman differs by the dashed line that shows its aim, and by its missiles (world_audio_base_enemy_fire).
function raider_aim(enemy, target, speed)
{
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const t = intercept_time(dx, dy, target.vx || 0, target.vy || 0, raider_shot_speed(enemy, speed)*current_world_rules().projectile);
    return Math.atan2(dy + (target.vy || 0)*t, dx + (target.vx || 0)*t);
}

// The time a shot of speed s from the origin takes to meet a target at (dx, dy) moving at (vx, vy): the root of
// |d + v·t| = s·t; 0 when there is none within 1.5 s
function intercept_time(dx, dy, vx, vy, s)
{
    const a = vx*vx + vy*vy - s*s;
    const b = 2*(dx*vx + dy*vy);
    const c = dx*dx + dy*dy;
    const disc = b*b - 4*a*c;
    if ((a >= 0) || (disc < 0)) {
        return 0;
    }
    const t = (-b - Math.sqrt(disc))/(2*a);
    return ((t > 0) && (t < 1.5)) ? t : 0;
}

// How long until a raider fires again: a shooter keeps its own count
function raider_fire_left(enemy)
{
    return (enemy.type === 'shooter') ? enemy.fire_cd : enemy.gun_cd;
}

// The flagship turns at 66% (escorts) and at 33% (a last stand with more of them), or where its duel has it
// (boss_duel_escorts: a duel may have no last stand); on OVERLOAD, at 15% it goes into overdrive: it fires faster and
// calls an elite squadron.
function arcade_flagship_update()
{
    boss_duel_watch();
    const boss = enemies.find(v => (v.type === 'boss') && (v.hp > 0));
    if (!boss) {
        return;
    }
    const marks = boss_duel_escorts();
    if ((arcade.phase === 1) && (boss.hp < boss.max_hp*marks[0])) {
        arcade.phase = 2;
        show_toast('FLAGSHIP · ESCORTS INBOUND', worlds[campaign.world].faction.toUpperCase(), 2);
        arcade_squad_spawn(3 + Math.min(2, Math.floor(arcade_level()/3)));
    }
    if ((arcade.phase === 2) && (boss.hp < boss.max_hp*marks[1])) {
        arcade.phase = 3;
        show_toast('FLAGSHIP · LAST STAND', 'EVERYTHING IT HAS', 2);
        flash = 0.35;
        shake = Math.max(shake, 14);
        ring(boss.x, boss.y, pink, 260, 0.6);
        arcade_squad_spawn(4 + Math.min(2, Math.floor(arcade_level()/3)));
    }
    if ((arcade.phase === (marks[1] ? 3 : 2)) && arcade_mode().overdrive && (boss.hp < boss.max_hp*0.15)) {
        arcade.phase = 4;
        boss.overdrive = true;
        show_toast('FLAGSHIP · OVERDRIVE', 'IT WILL NOT GO QUIETLY', 2);
        flash = 0.4;
        shake = Math.max(shake, 18);
        ring(boss.x, boss.y, pink, 320, 0.7);
        arcade.squads = 1;
        arcade_squad_spawn(3 + Math.min(2, Math.floor(arcade_level()/3)));
    }
}

function arcade_flagship_spawn()
{
    const enemy = spawn_enemy('boss');
    // on a Scroll lane, ahead of you in the view
    arcade_scroll_flagship(enemy);
    const scale = (difficulty === 'chill') ? 0.8 : (difficulty === 'overload') ? 1.25 : 1;
    // by the run's step, as the shop's factor on it (arcade_shop_flagship) is the step's: the design's factor of the
    // step's world in the map's order, so a flagship has the step's hull whichever world it is; times how much more its
    // own duel asks than its design (boss_duels: Dustfall's blade halves your shots, Ion Reach's shell lets them through
    // its gaps only), so Ion Reach's duel flown at step 2 is not a step-3 fight on a step-2 kit; and a card's factor
    const duel = boss_duel_hull(campaign.world)/boss_designs[campaign.world].hull;
    enemy.hp = Math.round(1500*(1 + arcade_level()*0.6)*scale*boss_designs[arcade_level()].hull*duel*arcade_card_k.flagship);
    // on a Scroll lane a duel bound to a hole is fought round a ring, with no hole to swallow raiders (arcade_scroll.js)
    enemy.hp = Math.round(enemy.hp*arcade_scroll_flagship_k());
    enemy.max_hp = enemy.hp;
    boss_spawned = true;
    boss_defeated = false;
    arcade.phase = 1;
    arcade.flagship_escaped = false;
    el.bossbar.querySelector('.meter-row').textContent = `${worlds[campaign.world].faction.toUpperCase()} FLAGSHIP`;
    set_hidden(el.bossbar, false);
}

// A world cleared pays a fixed bonus, the weapon grows a tier, a gamble taken for it is won, and its cleared screen
// opens; its button opens the break (a card, the next world: arcade_break.js), then the depot before the jump.
function arcade_world_clear()
{
    if (arcade_level() >= arcade_worlds - 1) {
        // a gamble taken for the last world pays in score (arcade_cards.js)
        arcade_cards_world_cleared();
        state = 'victory';
        victory_timer = 2.5;
        return;
    }
    const bonus = arcade_clear_bonus();
    salvage += bonus;
    play_log_earn('world bonus', bonus);
    play_log_world_cleared(bonus);
    // every gun you own grows a tier, up to the tier the next step opens (gun_tier_open), and those a card added past
    // it: the run's tier is one for all of them
    const won = arcade_cards_world_cleared();
    const fleet = ensure_career();
    const tier = Math.max(weapon_level(), Math.min(5, weapon_level() + 1, gun_tier_open(arcade_level() + 1) + arcade_cards_tiers()));
    for (const id of fleet.weapons) {
        fleet.weapon_levels[id] = tier;
    }
    set_hidden(el.bossbar, true);
    arcade.between_worlds = {world: campaign.world, bonus, won, next: null};
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
    return 80 + arcade_level()*40;
}

// A ship that dies hurts what is close to it, raiders and you alike, less with distance; a blast that kills sets off
// the next one, so a crowded squadron can go up in a chain.
function arcade_blast_from_kill(enemy)
{
    const sizes = {shard: 26, tank: 72, splitter: 48, lancer: 48, shooter: 46, boss: 220};
    const damages = {shard: 6, chaser: 10, shooter: 12, splitter: 14, lancer: 14, tank: 26, boss: 50};
    // a raider with a job blows up by its kind (raider_kinds)
    const kind = enemy.job ? raider_kinds[enemy.type].blast : null;
    const size = kind ? kind[0] : sizes[enemy.type] || 40;
    const damage = (kind ? kind[1] : damages[enemy.type] || 10)*(enemy.elite ? 1.5 : 1);
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
            damage_player(blast.damage*arcade_mode().blast*(1 - Math.min(1, d/blast.radius)), true, 'ship blast', blast.source);
        }
    }
}

// A new weapon keeps the tier the old one had reached.
// A gun at the depot: one you have spare goes on a mount again; else you buy one more of it. It goes on a mount it
// fits, an empty one first, else the weakest gun there making way, and takes the run's tier.
function arcade_weapon_take(weapon)
{
    const fleet = ensure_career();
    const tier = weapon_level();
    const owned = guns_owned();
    if ((owned[weapon.id] || 0) <= mounts_carrying(weapon)) {
        owned[weapon.id] = (owned[weapon.id] || 0) + 1;
    }
    if (!fleet.weapons.includes(weapon.id)) {
        fleet.weapons.push(weapon.id);
    }
    fleet.weapon_id = weapon.id;
    fleet.weapon_levels[weapon.id] = tier;
    mount_gun_anywhere(weapon.id);
    player.gun_cd = [];
}

// R at the station opens the depot, unless raiders are close: the depot is a shop, not a hiding place. From afar, R
// sets the course to the station, as in the campaign. On a Scroll run it only says the depot comes between worlds.
function arcade_interact()
{
    // a Scroll run's lane does not stop at the station: the depot opens between worlds
    if (arcade_scroll_on()) {
        show_toast('DEPOT', 'IT OPENS BETWEEN WORLDS · THE SCREEN MOVES ON', 2);
        return;
    }
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
    mouse_drive_suspend();
    joystick.active = false;
    arcade_depot_view.hover = '';
    arcade_depot_view.note = '';
    arcade_depot_fill();
    set_hidden(document.getElementById('arcade_depot'), false);
    document.getElementById('arcade_depot_launch').focus();
    sfx('pickup');
}

// The depot's view: the shelf shown, the search, the item under the pointer (its preview on the ship), and the news of
// the last change to the power (a level left spare, levels a smaller reactor took out)
const arcade_depot_view = {tab: 'all', search: '', hover: '', note: ''};

// The header, the ship and the next world, then the shop: repairs and supplies, the guns, the modules by shelf
function arcade_depot_fill()
{
    const cleared = arcade.between_worlds;
    const here = cleared ? cleared.world : campaign.world;
    // the next world: the one chosen at the break (arcade_break.js), else the next in the map's order
    const next = cleared ? (cleared.next ?? here + 1) : null;
    const step = arcade_level();
    set_hidden(document.getElementById('cleared_tick'), !cleared);
    document.getElementById('arcade_depot_eyebrow').textContent = `Arcade · depot · world ${step + 1} of ${arcade_worlds}`;
    document.getElementById('cleared_title').textContent = cleared ? `${worlds[here].name} cleared` : worlds[here].station;
    const stats = [['Raiders', String(kills)], ['Time', format_time(run_time)], ...(cleared ? [['Bonus', `+${cleared.bonus}`]] : []), ['Score', ui_number(score)]];
    document.getElementById('cleared_stats').innerHTML = stats.map(v => `<div><dt>${v[0]}</dt><dd${(v[0] === 'Bonus') ? ' class="t-gold"' : ''}>${v[1]}</dd></div>`).join('');
    document.getElementById('arcade_depot_ship_name').textContent = current_ship().name;
    document.getElementById('cleared_hull_text').innerHTML = `${Math.ceil(player.hp)}<small> / ${hull_max()}</small>`;
    document.getElementById('cleared_hull_fill').style.width = `${(player.hp/hull_max())*100}%`;
    document.getElementById('cleared_hull').classList.toggle('is-low', player.hp < hull_max()*0.5);
    const installed = upgrade_options.filter(v => upgrades[v.key] > 0);
    document.getElementById('arcade_depot_installed').innerHTML = installed.map(v => `<img src="${module_icon(v)}" alt="" title="${v.title} · level ${upgrades[v.key]}">`).join('') || '<span class="small">Nothing yet</span>';
    arcade_depot_power_fill();
    // the next world (or, between waves, this one)
    const shown = (next === null) ? here : next;
    document.getElementById('cleared_next_eyebrow').textContent = (next === null) ? 'This world' : 'Next world';
    document.getElementById('cleared_planet').src = menu_sprite_url(menu_planet_text(shown));
    const name = document.getElementById('cleared_next_name');
    name.textContent = worlds[shown].name;
    name.style.color = `var(--w-${world_slug(shown)})`;
    document.getElementById('arcade_depot_next').textContent = `World ${step + ((next === null) ? 1 : 2)} of ${arcade_worlds} · ${arcade_waves} waves · flagship`;
    document.getElementById('cleared_rules').innerHTML = world_rules[shown].summary.split(' · ').map(v => ui_badge(ui_sentence(v))).join('');
    // what the next step opens, on sale here from now on (src/js/tech.js)
    const opened = (next === null) ? [] : tech_opened(step, step + 1);
    const fresh = document.getElementById('arcade_depot_new');
    fresh.innerHTML = opened.length ? `<b>New on sale</b> ${opened.map(ui_escape).join(', ')}` : '';
    set_hidden(fresh, !opened.length);
    const launch = arcade.retry_depot ? `Retry ${worlds[here].name}` : (next === null) ? 'Back to the fight' : `Launch to ${worlds[next].name}`;
    document.getElementById('arcade_depot_launch').innerHTML = `<span>${launch}</span><span class="key">Enter</span>`;
    const tabs = [{value: 'all', label: 'All'}, {value: 'repairs', label: 'Repairs'}, {value: 'weapons', label: 'Weapons'}, {value: 'ships', label: 'Ships'}, ...module_shelves];
    document.getElementById('arcade_depot_tabs').innerHTML = tabs.map(v => `<button type="button" class="${(v.value === arcade_depot_view.tab) ? 'is-active' : ''}" data-tab="${v.value}">${module_shelves.includes(v) ? `<i class="depot-dot depot-dot--${v.value}"></i>` : ''}${v.label}</button>`).join('');
    arcade_depot_render_list();
    arcade_depot_sync_hover();
}

// The reactor in the header: the power the installed levels draw against what it holds, a cell a unit (lit for those
// drawn, red past it)
function arcade_depot_power_fill()
{
    const used = arcade_power_used();
    const capacity = arcade_power_capacity();
    const box = document.getElementById('arcade_depot_power');
    box.classList.toggle('is-over', used > capacity);
    box.title = `Every module level installed draws power: ${used} of the ${capacity} your ${current_ship().name}'s reactor holds now (${current_ship().power} of its own, ${world_reached()} for the worlds cleared${arcade.reactor ? `, ${arcade.reactor} from Reactor tuning` : ''}). Levels you own and do not install wait for free; put them in and take them out here.`;
    document.getElementById('arcade_depot_power_text').innerHTML = `${used}<small> / ${capacity}</small>`;
    document.getElementById('arcade_depot_power_cells').innerHTML = Array.from({length: Math.max(used, capacity)}, (_, i) => `<i class="${(i >= capacity) ? 'over' : (i < used) ? 'on' : ''}"></i>`).join('');
}

// What the depot sells, as items of one shape: kind and id, the section it shows under, title, line, the words a
// search finds it by, icon, key, chips, level pips, price (null: nothing to buy), why it cannot be bought (Full, Max,
// Equipped, or the world that opens it: locked) and what buying it does
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
    // the guns in the catalog's order, so a card stays under the pointer as you switch, their stats against yours. Each
    // mount of your ship fires a gun bought for it: a gun bought goes on a mount it fits, an empty one first, else the
    // weakest gun there making way, which stays yours, spare, and goes on again for free. A gun no mount of your ship
    // fits says which ships take it.
    const mine = current_weapon();
    const owned = guns_owned();
    const mounts = ship_mounts();
    for (const weapon of weapon_catalog) {
        const carried = mounts_carrying(weapon);
        const fits = gun_fits_ship(weapon);
        const room = carried < mounts.filter(v => gun_fits(weapon, v)).length;
        const spare = (owned[weapon.id] || 0) > carried;
        const where = (mounts.length > 1) ? `On ${carried} of your ${mounts.length} mounts.` : 'On your one mount.';
        const line = !fits ? `Needs a ${weapon.size} mount: ${ship_catalog.filter(v => gun_fits_ship(weapon, v)).map(v => v.name).join(', ')}.` : carried ? (room ? `${where} Buy another for one more mount.` : `${where} ${gun_tier_next_text()}`) : spare ? `Yours, spare. ${weapon.line}` : weapon.line;
        // a gun, or one more of it, waits for the world that opens it, said before whether a mount fits it; one you have
        // spare goes back on
        const closed = !spare && !(carried && !room) && !tech_open(weapon.opens);
        out.push({
            kind: 'weapon', id: weapon.id, section: 'weapons', title: carried ? `${weapon.name} T${weapon_level()}${(carried > 1) ? ` ×${carried}` : ''}` : weapon.name,
            line,
            tags: `weapon gun оружие пушка ${weapon.tags || ''}`, icon: ship_parts_clean_url(`weapons/turret-${weapon.id}`), chips: arcade_weapon_chips(weapon, mine),
            price: (!fits || !room || closed) ? null : spare ? 0 : 120 + weapon.rating*45, done: closed ? tech_lock_text(weapon.opens) : !fits ? 'No mount fits' : !room ? 'Equipped' : '', locked: closed, owned: carried > 0, label: spare ? 'Equip' : carried ? 'Buy another' : 'Buy',
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
        const closed = !have && !tech_open(ship.opens);
        out.push({
            kind: 'ship', id: ship.id, section: 'ships', title: ship.name, line: arcade_ship_line(ship, now, have),
            tags: `ship hull ${ship.role.toLowerCase()} корабль`, icon: ship_parts_clean_url(`3d/ship-${ship.id}`), chips: arcade_ship_chips(ship, flying),
            price: (now || closed) ? null : have ? 0 : Math.round((ship.price*arcade_ship_price)/10)*10, done: now ? 'Flying' : closed ? tech_lock_text(ship.opens) : '', locked: closed, owned: now, label: have ? 'Fly' : 'Buy',
            buy: function () {
                arcade_ship_take(ship);
            },
        });
    }
    // the modules: the levels owned (bought) and installed (drawing power, arcade_power.js), each level's draw; Remove
    // and Install move an owned level out and in for free
    const free = arcade_power_free();
    const base = initial_upgrades();
    // Reactor tuning: one more unit of power on every ship, a few times a run (arcade_power.js)
    const tuned = arcade.reactor;
    const tunings = arcade_reactor_prices.length;
    out.push({
        kind: 'reactor', id: 'tuning', section: 'ships', title: 'Reactor tuning', line: `+1 power on every ship for the rest of the run. ${tuned} of ${tunings} bought.`,
        tags: 'reactor power tuning energy core', icon: module_icon(upgrade_options.find(v => v.key === 'reactor')), chips: [['POWER', '+1', 'up']], pips: [tuned, tunings],
        price: (tuned < tunings) ? arcade_reactor_prices[tuned] : null, done: (tuned >= tunings) ? 'Max' : '', label: 'Buy',
        buy: function () {
            arcade.reactor++;
        },
    });
    for (const shelf of module_shelves) {
        for (const option of upgrade_options.filter(v => v.shelf === shelf.value)) {
            const level = arcade.owned[option.key];
            const fitted = upgrades[option.key];
            const draw = module_power(option.key);
            const closed = module_next_locked(option);
            out.push({
                kind: 'module', id: option.key, section: shelf.value, title: option.title, line: arcade_module_line(option), tags: option.tags, icon: module_icon(option),
                part: option.part, on_ship: option.part && (fitted > 0), pips: [fitted, option.cap, level], price: module_cost(option), label: level ? 'Upgrade' : 'Buy',
                chips: [['POWER', String(draw), (draw > 1) ? 'heavy' : '']],
                fit: {out: fitted > base[option.key], in: level > fitted, power: free >= draw, draw},
                installs: free >= draw,
                done: (level >= option.cap) ? 'Max' : module_needs_gun(option) ? 'Needs launcher' : (closed !== null) ? tech_lock_text(closed) : '', locked: (closed !== null) && !module_needs_gun(option), owned: fitted > base[option.key],
                buy: function () {
                    if (!arcade_module_own(option.key)) {
                        arcade_depot_view.note = `${option.title} ${arcade.owned[option.key]} is yours, spare: it needs ${draw} power and the reactor has ${Math.max(0, free)} free. Remove a level to install it.`;
                    }
                    if (option.key === 'turbo_tank') {
                        player.turbo_fuel = turbo_duration();
                    }
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
        {value: 'weapons', label: 'Weapons', note: 'each mount fires a gun bought for it · a spare one goes back on for free'},
        {value: 'ships', label: 'Ships', note: 'your modules and gun move with you · Reactor tuning adds power to every ship'},
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
    // the news of the last change to the power (a level left spare, levels a smaller reactor took out) heads the list
    const note = arcade_depot_view.note ? `<p class="depot-note" role="status">${ui_escape(arcade_depot_view.note)}</p>` : '';
    list.innerHTML = note + (html.join('') || `<div class="depot-empty">Nothing matches “${ui_escape(arcade_depot_view.search)}”. Try: homing, shield, speed, repair.</div>`);
}

// One item: icon, title (its key, ON SHIP for a module installed that you see on the ship), line, chips or level
// pips, and Buy with the price, "Need n" in the button when the salvage is short; one a later world opens, the lock and
// that world. A module's pips are its levels installed (lit), owned but not installed (an outline) and not owned;
// Remove and Install move a level out and in, Install saying "No power" when the reactor is short of its draw
function arcade_depot_item_html(item, words)
{
    const short = (item.price !== null) && !item.done && (salvage < item.price);
    const idle = item.done && !(item.fit && (item.fit.in || item.fit.out));
    const classes = ['depot-it', short && 'is-short', idle && !item.owned && (item.locked ? 'is-locked' : 'is-done'), item.owned && 'is-owned'].filter(Boolean).join(' ');
    const chips = (item.chips || []).map(v => `<span class="depot-chip${v[2] ? ` is-${v[2]}` : ''}"${(v[0] === 'POWER') ? ' title="The power each level draws while installed"' : ''}><i>${v[0]}</i>${v[1]}</span>`).join('');
    let pips = '';
    if (item.pips) {
        const [fitted, cap, owned = fitted] = item.pips;
        const title = (owned > fitted) ? `${fitted} of ${owned} levels owned installed` : `${fitted} of ${cap} levels`;
        // the levels in words too, for a screen reader and the captain's agent
        const said = `<span class="visually-hidden">Installed ${fitted}, owned ${owned}, of ${cap}</span>`;
        pips = `<span class="depot-pips${(cap > 3) ? ' is-many' : ''}" title="${title}">${Array.from({length: cap}, (_, i) => `<i${(i < fitted) ? ' class="on"' : (i < owned) ? ' class="own"' : ''}></i>`).join('')}${said}</span>`;
    }
    let fit = '';
    if (item.fit && (item.fit.in || item.fit.out)) {
        const take = item.fit.out ? '<button type="button" class="btn btn-sm btn-ghost" data-fit="out" title="Take a level out: it stays yours, and its power is free">Remove</button>' : '';
        const no_power = item.fit.in && !item.fit.power;
        const put = !item.fit.in ? '' : no_power
            ? `<button type="button" class="btn btn-sm is-disabled is-short" data-fit="in" disabled title="It draws ${item.fit.draw} power: remove a level to free it">No power</button>`
            : '<button type="button" class="btn btn-sm btn-primary" data-fit="in" title="Put a level you own in, free">Install</button>';
        fit = `<span class="depot-fit">${take}${put}</span>`;
    }
    let action = '';
    if (item.locked) {
        action = ui_badge(`${ui_lock_svg}${item.done}`, 'locked');
    }
    else if (item.done) {
        action = ui_badge(item.done, item.owned ? 'cyan' : '');
    }
    else if (item.price !== null) {
        const kind = short ? ' is-disabled is-short' : item.primary ? ' btn-primary' : '';
        const price = item.price ? `<span class="price">${ui_number(item.price)}</span>` : '';
        action = `<button type="button" class="btn btn-sm${kind}" data-buy${short ? ` disabled title="You need ${ui_number(item.price - salvage)} more salvage"` : ''}><span>${short ? `Need ${ui_number(item.price - salvage)}` : (item.label || 'Buy')}</span>${price}</button>`;
    }
    const keycap = item.keycap ? `<span class="key key--sm">${item.keycap}</span>` : '';
    // ON SHIP: a module installed that you see on the ship (a level owned but not installed is not on it)
    const part = item.on_ship ? '<span class="depot-onship" title="Installed: you see it on your ship">ON SHIP</span>' : '';
    return `<div class="${classes}" data-item="${item.kind}:${item.id}"><span class="ic"><img src="${item.icon}" alt=""></span><b><span>${arcade_depot_mark(item.title, words)}</span>${keycap}${part}</b><p>${arcade_depot_mark(item.line, words)}</p><div class="row">${chips}${pips}${fit}${action}</div></div>`;
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
    if (buyable && item.part && item.installs) {
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
        mark('POWER', String(arcade_power_capacity(ship)), ship.power, mine.power),
    ];
}

// A ship's line at the depot: yours or its role, and the levels its smaller reactor would take out
function arcade_ship_line(ship, now, have)
{
    const cut = now ? 0 : arcade_power_cut(ship).length;
    const head = now ? 'Your ship.' : have ? `Yours. ${ship.role}.` : `${ship.role}.`;
    return cut ? `${head} Its reactor takes out ${cut} module level${(cut > 1) ? 's' : ''}, the newest.` : head;
}

// A ship bought or taken out again; the modules and the gun move over, a new hull comes repaired and one you had keeps
// its share of the damage; a smaller reactor takes out the newest module levels past its power, and the depot says so
function arcade_ship_take(ship)
{
    const fleet = ensure_career();
    const fresh = !fleet.ships.includes(ship.id);
    const share = player.hp/hull_max();
    if (fresh) {
        fleet.ships.push(ship.id);
    }
    fleet.ship_id = ship.id;
    const cut = arcade_power_fit();
    if (cut.length) {
        arcade_depot_view.note = `The ${ship.name}'s reactor holds ${arcade_power_capacity()}: ${arcade_power_levels_text(cut)} came out. They stay yours; install them when there is power.`;
    }
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
    play_log_depot_spend(item);
    arcade_depot_view.note = '';
    item.buy();
    sfx('upgrade');
    update_hud();
    arcade_depot_fill();
    document.querySelector(`#arcade_depot_list [data-item="${id}"]`)?.classList.add('is-flash');
}

// A module level taken out of the ship or put in again, free: it stays owned either way
function arcade_depot_fit(id, way)
{
    const item = arcade_depot_items().find(v => `${v.kind}:${v.id}` === id);
    if ((state !== 'arcade_depot') || !item?.fit) {
        return;
    }
    const done = (way === 'out') ? arcade_module_remove(item.id) : arcade_module_install(item.id);
    if (!done) {
        return;
    }
    arcade_depot_view.note = '';
    play_log_event('module', {world: worlds[campaign.world].name, module: item.id, way, level: upgrades[item.id], power: arcade_power_used()});
    sfx((way === 'out') ? 'dash' : 'upgrade');
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
    // a retry's depot (arcade_retry): the world starts as it would, no station to undock from
    if (arcade.retry_depot) {
        arcade.retry_depot = false;
        return;
    }
    if (cleared) {
        // the route goes on to it now: the jump's half way puts you there
        const next = cleared.next ?? cleared.world + 1;
        arcade.route.push(next);
        start_jump({world: next, label: worlds[next].name, color: worlds[next].accent});
    }
    else {
        docking_leave();
    }
}

// A won run opens the finale; a death costs a life: with lives left its screen offers to retry the world it came in
// (Enter), the last one ends the run, its score against the best, and offers only a new run. Each records the best.
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
    arcade.lives = Math.max(0, arcade.lives - 1);
    const over = arcade.lives <= 0;
    const retry = document.getElementById('retry_sector');
    const restart = document.getElementById('restart_button');
    const name = worlds[campaign.world].name;
    const left = arcade_lives_text(arcade.lives);
    retry.innerHTML = `<span>Retry ${ui_escape(name)}</span>`;
    set_hidden(retry, over || !arcade.world_start?.snapshot);
    restart.classList.toggle('btn-primary', over);
    set_hidden(el.result_overlay, false);
    for (const v of [el.loadout, el.inventory_button, el.mission, el.pause_button, el.touch_buttons, el.bossbar]) {
        set_hidden(v, true);
    }
    toasts_clear();
    // a Base world has no waves to name, and its retry no depot (arcade_base.js)
    const base = arcade_base_kind();
    const reached = base ? `You reached ${name}, ${hud_distance(arcade_scroll.s).join(' ')} along its lane.` : `You reached ${name}, wave ${arcade.wave} of ${arcade_waves}.`;
    const again = base ? 'Retry flies it again from its start.' : 'Retry opens the depot first, with what you had as the world began: change the kit, then fly it again from its first wave.';
    const salvage_line = salvage ? ` Salvage kept: ◆\u00a0${ui_number(salvage)}, +${ui_number(kept)} points.` : '';
    el.result_eyebrow.textContent = over ? 'ARCADE · RUN OVER' : 'ARCADE · SIGNAL LOST';
    el.result_title.textContent = over ? 'Run over.' : `${left[0].toUpperCase()}${left.slice(1)} left.`;
    el.result_description.textContent = over
        ? `No lives left. ${reached}${salvage_line}`
        : `${reached} ${again} Or start a new run.${(arcade.lives === 1) ? ' One more death ends the run.' : ''}${salvage_line}`;
    document.getElementById('result_score_label').textContent = over ? 'Final score' : 'Score';
    el.result_score.textContent = ui_number(score);
    el.result_sector.textContent = `${arcade_level() + 1} / ${arcade_worlds}`;
    const note = arcade_best_note(score, previous);
    el.result_best.textContent = `${record ? 'NEW PERSONAL BEST · ' : 'PERSONAL BEST · '}${ui_number(best)}${note ? ` · ${note.toUpperCase()}` : ''}  /  ${kills} ELIMINATIONS · ${format_time(run_time)}`;
    (retry.classList.contains('hidden') ? restart : retry).focus();
    arcade_update_hud();
}

// A death with lives left: the world it came in again from its first wave, as the run stood when that world began, but
// with the lives the run has now, not those of the world's start; the life just lost blinks in the HUD. The depot
// opens first, with that world's salvage and kit, so another kit can be tried (the author, 2026-10-19: "they killed
// me, I can take something else and fly again"); its Retry button starts the world
function arcade_retry()
{
    const from = arcade.world_start?.snapshot;
    if (!from || (arcade.lives <= 0)) {
        return;
    }
    const lives = arcade.lives;
    set_pause_icon(false);
    arcade_stop();
    arcade_start(from.world, {...from, lives});
    arcade.life_flash = arcade_life_flash;
    // a Base run has no depot (arcade_base.js)
    if (arcade_base_kind()) {
        return;
    }
    arcade.retry_depot = true;
    arcade_depot_open();
}

// "3 lives", "1 life"
function arcade_lives_text(n)
{
    return `${n} ${(n === 1) ? 'life' : 'lives'}`;
}

// A score against the best before it: '' for a new best, else how far it is from it
function arcade_best_note(total, previous)
{
    if (total > previous) {
        return '';
    }
    return (total === previous) ? 'equals your best' : `${ui_number(previous - total)} to beat it`;
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
    const strength = {shard: 1.5, drone: 1, chaser: 3, shooter: 4, splitter: 4.5, lancer: 4.5, tank: 9, bulwark: 8, carrier: 10, boss: 26}[enemy.type] || 3;
    return enemy.elite ? strength*1.6 : strength;
}

function arcade_update_hud()
{
    hud_text(el.act_label, `ARCADE · WORLD ${arcade_level() + 1} / ${arcade_worlds} · ${world_looks[campaign.world].biome}`);
    hud_text(el.mission_name, worlds[campaign.world].name.toUpperCase());
    hud_text(el.mission_phase, (arcade.pause > 0) ? `WAVE ${arcade.wave} CLEAR` : `WAVE ${Math.max(1, arcade.wave)} / ${arcade_waves}`);
    const total = arcade_wave_size(arcade.wave);
    const left = spawn_left + enemies.filter(v => v.hp > 0).length;
    el.sector_progress.style.width = `${clamp((((arcade.wave - 1) + (1 - Math.min(1, left/Math.max(1, total))))/arcade_waves)*100, 0, 100)}%`;
    arcade_lives_hud();
}

// The run's lives at the top of the HUD: a ship for each, the lost ones dim, the one just lost blinking a moment after a
// retry; written only when they change
let arcade_lives_shown = '';

function arcade_lives_hud()
{
    const flash = arcade.life_flash > 0;
    const key = `${arcade.lives}:${flash}`;
    if (key === arcade_lives_shown) {
        return;
    }
    arcade_lives_shown = key;
    const lives = document.getElementById('lives');
    lives.innerHTML = Array.from({length: arcade_lives}, function (_, i) {
        const kind = (i < arcade.lives) ? '' : (flash && (i === arcade.lives)) ? ' is-lost is-going' : ' is-lost';
        return `<svg class="life${kind}" viewBox="0 0 10 12" aria-hidden="true"><path d="M5 0.6 9.4 11.4 5 8.7 0.6 11.4z"/></svg>`;
    }).join('');
    lives.setAttribute('aria-label', `${arcade_lives_text(arcade.lives)} left`);
    document.getElementById('lives_box').title = `${arcade_lives_text(arcade.lives)} left: a death retries the world, the last ends the run`;
}
