// Arcade: one run through the eight worlds, three waves each, the world's flagship in the third; no stations, contracts or saves.
const arcade = {active: false, world: -1, wave: 0, pause: 0, squad_timer: 0, squads: 0, phase: 0, slowmo: 0, depot_hint: false, marksman_hint: false, missile_hint: false, blasts: [], event: null, between_worlds: null, world_start: null, campaign_checkpoint: null};
const arcade_extent = [7200, 5600];
const arcade_waves = 3;
const arcade_radiation = 0.35;
const arcade_wave_names = ['', 'SCOUTS', 'ASSAULT', 'FLAGSHIP'];
// salvage left unspent when the run ends adds this many points each, so keeping it is a choice too
const arcade_salvage_points = 10;
// the depot sells ships at this share of the campaign's prices
const arcade_ship_price = 0.5;
// The share of raiders that are marksmen, Haven to Eclipse, before the mode's factor: a marksman aims where you will be
// when its shot gets there, not where you are, and shows its aim for the last half second (arcade_aim_time).
const arcade_marksmen = [0, 0.2, 0.3, 0.3, 0.15, 0.25, 0.2, 0.05];
const arcade_aim_time = 0.5;
// How wide a line squadron fans out round you (arcade_flank_steer), in radians from its first raider to its last,
// Haven to Eclipse: not at all in Haven and Verdant, hard enough already, nor in the rail worlds, Obsidian and Eclipse,
// where a slug crosses the screen in a quarter second
const arcade_flank_arc = [0, 0, 2.8, 2.8, 0, 2.8, 2.8, 0];
// a marksman's missile turns this much harder than another's
const arcade_marksman_turn = 1.15;
// how much slower a raider reloads by its gun (arcade_reload): a missile is a threat to read and answer, one at a time,
// not a stream
const arcade_reloads = {missile: 2};
// What each difficulty changes in the arcade: extra raiders per squadron and per wave, the gap between squadrons, the
// first world with elites, the share of repairs that still drop, the medkits a run starts with, whether every raider
// fires its world's gun (Haven's plasma included), how often (a factor on the gun's cooldown), and how hard its shots
// hit, the raiders' hull and how much it grows a world past Haven, the share of the world's armour and shield they
// carry, the blast damage you take (a ship's explosion or a raider missile), raiders that grow with your weapon tier,
// the flagship's overdrive, and a factor on the share of marksmen.
const arcade_modes = {
    chill: {squad: 0, wave: 0, gap: 1, elite_world: 1, repairs: 1, medkits: 2, armed: false, gun_gap: 1, hits: 1, hull: 1, growth: 0.1, defense: 0.8, blast: 0.8, tier_hp: false, overdrive: false, marksmen: 0.5},
    normal: {squad: 1, wave: 3, gap: 0.8, elite_world: 0, repairs: 0.35, medkits: 1, armed: true, gun_gap: 0.45, hits: 1.6, hull: 1.5, growth: 0.15, defense: 0.8, blast: 0.8, tier_hp: false, overdrive: false, marksmen: 1},
    overload: {squad: 2, wave: 5, gap: 0.7, elite_world: 0, repairs: 0, medkits: 1, armed: true, gun_gap: 0.4, hits: 1.75, hull: 1.8, growth: 0, defense: 0.5, blast: 1.2, tier_hp: true, overdrive: true, marksmen: 1.3},
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
    arcade.marksman_hint = false;
    arcade.missile_hint = false;
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

// A factor on a raider's reload: slower in the arcade for a missile (arcade_reloads), as it is for others
function arcade_reload(enemy)
{
    return arcade.active ? (arcade_reloads[enemy.weapon] || 1) : 1;
}

// Whether a repair may drop: always outside the arcade; in it, as often as the mode allows.
function repair_drop_allowed()
{
    return !arcade.active || (Math.random() < arcade_mode().repairs);
}

// A raider's hull by the mode and the world (the flagship has its own scale); on OVERLOAD it also grows as your weapon's
// tier does, by the same 22% a tier adds to your damage.
function arcade_hull_scale(enemy)
{
    const mode = arcade_mode();
    const k = ((enemy.type === 'boss') ? 1 : mode.hull*(1 + mode.growth*campaign.world))*(mode.tier_hp ? 1 + (weapon_level() - 1)*0.22 : 1);
    enemy.hp = Math.round(enemy.hp*k);
    enemy.max_hp = Math.round(enemy.max_hp*k);
}

function arcade_stop()
{
    arcade.active = false;
    arcade.between_worlds = null;
    arcade_event_end();
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
        show_toast('MISSILES', 'A DASH IS NO SHIELD FROM THE BLAST · OUTRUN OR OUTTURN THEM', 3.5, 'danger');
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
    arcade_event_update(dt);
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
    if (n === 2) {
        arcade_event_start();
    }
    else {
        arcade_event_end();
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

// How a squadron comes, by the type the world's mix draws for it: a line of one type, as it always did; a pincer, the
// line split to both sides of you; a wall, a tank in front with shooters behind it; a convoy, chasers round a slow
// tank; an ambush, lancers waiting still among the rocks. From the mode's first elite world on, every second
// squadron from wave 2 has an elite leader.
function arcade_squad_spawn(size)
{
    const type = (arcade.wave === 1) ? ((Math.random() < 0.7) ? 'chaser' : 'shooter') : enemy_type();
    const pattern = arcade_squad_pattern(type, size);
    const angle = Math.random()*Math.PI*2;
    const elite = (campaign.world >= arcade_mode().elite_world) && (arcade.wave >= 2) && (arcade.squads % 2 === 1);
    arcade.squads++;
    if (pattern === 'ambush') {
        arcade_squad_ambush(size, elite);
        return;
    }
    if ((pattern === 'wall') || (pattern === 'convoy')) {
        arcade_squad_escorted(pattern, size, angle, elite);
        return;
    }
    const sides = (pattern === 'pincer') ? [angle, angle + Math.PI] : [angle];
    for (let i = 0; i < sides.length; ++i) {
        const count = (sides.length === 1) ? size : (i === 0) ? Math.ceil(size/2) : Math.floor(size/2);
        arcade_squad_line(type, count, sides[i], elite && (i === 0));
    }
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

// One type in a line across its heading, 640 m away on the given side, warping in. Chasers, shooters and splitters then
// fan out round you, each to its own bearing, so their fire comes from a wide arc (arcade_flank_steer).
function arcade_squad_line(type, size, angle, elite)
{
    const cx = player.x + Math.cos(angle)*640;
    const cy = player.y + Math.sin(angle)*640;
    const step = Math.min(0.55, arcade_flank_arc[campaign.world]/size);
    for (let i = 0; i < size; ++i) {
        const offset = (i - (size - 1)/2)*55;
        const enemy = arcade_squad_warp(type, cx - Math.sin(angle)*offset, cy + Math.cos(angle)*offset, i);
        if (elite && (i === 0)) {
            arcade_elite_make(enemy);
        }
        if (['chaser', 'shooter', 'splitter'].includes(type) && (size > 1) && step) {
            enemy.flank_to = {bearing: angle + (i - (size - 1)/2)*step};
        }
    }
}

// A tank, two in a squadron of seven or more, leading the rest: a wall puts shooters in a row behind it, a convoy
// puts chasers round it. They keep their places while their leader lives and you keep away (arcade_role_steer).
function arcade_squad_escorted(pattern, size, angle, elite)
{
    const cx = player.x + Math.cos(angle)*640;
    const cy = player.y + Math.sin(angle)*640;
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

// The rocks a lancer can hide by: 450 to 1000 m from you, the nearest first
function arcade_ambush_rocks()
{
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
// leader, at the leader's pace, until the leader dies or you come within 300 m; a lurker waits still, turned to you,
// until you come within 420 m, it is hit or 25 s pass; a flanker swings out to its side first (arcade_flank_steer).
// Turns the raider (angle) and returns how fast it moves.
function arcade_role_steer(v, move, d)
{
    if (v.event_goal) {
        return arcade_event_steer(v);
    }
    if (v.flank_to) {
        return arcade_flank_steer(v, move);
    }
    if (v.lurk) {
        if ((d > 420) && (v.hp >= v.max_hp) && ((v.shield || 0) >= (v.max_shield || 0)) && (v.age < 25)) {
            // a lancer charges at the end of its count: hold the count while it waits
            v.charge_cd = Math.max(v.charge_cd, 1.5);
            return 0;
        }
        v.lurk = false;
        ring(v.x, v.y, gold, 50, 0.3);
        return move;
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

// A flanker swings out to its own side of you before it fights: to the point at its bearing from you, at its range; once
// there, or 6 s after it came, it fights as its type does, from that side. Turns the raider and returns how fast it moves.
function arcade_flank_steer(v, move)
{
    const range = (v.type === 'shooter') ? 290 : 340;
    const tx = player.x + Math.cos(v.flank_to.bearing)*range;
    const ty = player.y + Math.sin(v.flank_to.bearing)*range;
    if ((Math.hypot(tx - v.x, ty - v.y) < 90) || (v.age > 6)) {
        v.flank_to = null;
        return move;
    }
    v.angle = Math.atan2(ty - v.y, tx - v.x);
    return 1;
}

function arcade_elite_make(enemy)
{
    enemy.arcade_scaled = true;
    enemy.elite = true;
    enemy.hp = Math.round(enemy.max_hp*3);
    enemy.max_hp = enemy.hp;
    enemy.r = Math.round(enemy.r*1.35);
    enemy.armor = (enemy.armor || 0)*arcade_mode().defense;
    enemy.max_shield = 40 + campaign.world*25;
    enemy.shield = enemy.max_shield;
    arcade_hull_scale(enemy);
    enemy.drop_on_death = repair_drop_allowed() ? 'medkit' : 'emp';
    enemy.marksman = arcade_marksman(enemy);
}

// Whether a raider is a marksman: by the world's share and the mode's; an elite always is, from the first world with
// marksmen on; a flagship and a shard never
function arcade_marksman(enemy)
{
    const share = arcade_marksmen[campaign.world]*arcade_mode().marksmen;
    if ((enemy.type === 'boss') || (enemy.type === 'shard') || enemy.unarmed || !share) {
        return false;
    }
    return enemy.elite || (Math.random() < share);
}

// Where a raider fires at its target: straight at it, or, for a marksman in the arcade, where the target will be when
// a shot of this speed gets there if it keeps its course; straight at it when the shot cannot catch it within 1.5 s
function raider_aim(enemy, target, speed)
{
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    if (!arcade.active || !enemy.marksman) {
        return Math.atan2(dy, dx);
    }
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
    // every gun you own grows a tier: the run's tier is one for all of them
    const fleet = ensure_career();
    const tier = Math.min(5, weapon_level() + 1);
    for (const id of fleet.weapons) {
        fleet.weapon_levels[id] = tier;
    }
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
            damage_player(blast.damage*arcade_mode().blast*(1 - Math.min(1, d/blast.radius)), true);
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
    const owned = arcade_guns_owned();
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
    mouse_drive_suspend();
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
    // the guns in the catalog's order, so a card stays under the pointer as you switch, their stats against yours. Each
    // mount of your ship fires a gun bought for it: a gun bought goes on a mount it fits, an empty one first, else the
    // weakest gun there making way, which stays yours, spare, and goes on again for free. A gun no mount of your ship
    // fits says which ships take it.
    const mine = current_weapon();
    const owned = arcade_guns_owned();
    const mounts = ship_mounts();
    for (const weapon of weapon_catalog) {
        const carried = mounts_carrying(weapon);
        const fits = gun_fits_ship(weapon);
        const room = carried < mounts.filter(v => gun_fits(weapon, v)).length;
        const spare = (owned[weapon.id] || 0) > carried;
        const where = (mounts.length > 1) ? `On ${carried} of your ${mounts.length} mounts.` : 'On your one mount.';
        const line = !fits ? `Needs a ${weapon.size} mount: ${ship_catalog.filter(v => gun_fits_ship(weapon, v)).map(v => v.name).join(', ')}.` : carried ? (room ? `${where} Buy another for one more mount.` : `${where} Every gun grows a tier with every world you clear.`) : spare ? `Yours, spare. ${weapon.line}` : weapon.line;
        out.push({
            kind: 'weapon', id: weapon.id, section: 'weapons', title: carried ? `${weapon.name} T${weapon_level()}${(carried > 1) ? ` ×${carried}` : ''}` : weapon.name,
            line,
            tags: `weapon gun оружие пушка ${weapon.tags || ''}`, icon: ship_parts_clean_url(`weapons/turret-${weapon.id}`), chips: arcade_weapon_chips(weapon, mine),
            price: (!fits || !room) ? null : spare ? 0 : 120 + weapon.rating*45, done: !fits ? 'No mount fits' : !room ? 'Equipped' : '', owned: carried > 0, label: spare ? 'Equip' : carried ? 'Buy another' : 'Buy',
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
        {value: 'weapons', label: 'Weapons', note: 'each mount fires a gun bought for it · a spare one goes back on for free'},
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
    hud_text(el.act_label, `ARCADE · WORLD ${campaign.world + 1} / ${worlds.length} · ${world_looks[campaign.world].biome}`);
    hud_text(el.mission_name, worlds[campaign.world].name.toUpperCase());
    hud_text(el.mission_phase, (arcade.pause > 0) ? `WAVE ${arcade.wave} CLEAR` : `WAVE ${Math.max(1, arcade.wave)} / ${arcade_waves}`);
    const total = arcade_wave_size(arcade.wave);
    const left = spawn_left + enemies.filter(v => v.hp > 0).length;
    el.sector_progress.style.width = `${clamp((((arcade.wave - 1) + (1 - Math.min(1, left/Math.max(1, total))))/arcade_waves)*100, 0, 100)}%`;
}
