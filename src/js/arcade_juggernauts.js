// Dustfall's task in the arcade's Free kind: bury the juggernauts (each world gets a task of its own: arcade_tasks;
// Haven's is arcade_haulers.js, Verdant's arcade_nests.js). A wave is a juggernaut: as it begins, a Dune Marauder
// juggernaut comes in, plated all round, and comes for you, slower than your cruise, so you lead it where you want
// it. Your guns barely mark it: its hull is very thick by your kit. A cliff brought down on it (arcade_cliffs.js)
// buries it at once. When it has you lined up it gives a sign and charges in a straight line; a rock or a cliff in
// its way stuns it for a moment, the lesson the world's flagship then asks for. The wave's squadrons are its escort.
// Buried, or ground down the slow way, the wave's crest comes, its escort's last squadron, then the breather and the
// next juggernaut. After the fifth, the flagship, as in any world. Nothing fails: six cliffs stand for five
// juggernauts, and with no cliff left the guns still grind one down.
//
// A juggernaut is a raider of `enemies` (its `juggernaut` set), so every gun, missile, pulse and blast finds it, the
// radar and the map show it, and it is solid: a ship it rams bounces off. It is drawn here, not as a raider
// (render_enemies), and flown here.
//
// While the task runs, the cliffs keep two rules of their own: a cliff's hull is by your kit, as the juggernaut's is,
// so the crack gives in the same time to every kit; and the guns turn to a crack only when the fall would catch the
// juggernaut (or when you point at it), so no cliff is spent on its escort by itself.

// The world's juggernauts: ship (the one out now, or null), mode ('hunt', 'sign', 'charge', 'recover' or 'stun') and
// t (the s that mode has left), cd (the s to its next charge), heading (where its bow points), lane (the angle of its
// charge) and left (the m of it still to run), crush (a cliff's fall has taken it), end ('' while it is out, 'buried'
// or 'ground') and end_at (when, time), buried and ground (the world's count so far), hull_seen (its hull a frame
// ago), spark_at and word_at (when its plating last answered a shot, time), behind (the s its escort has been left
// behind: juggernaut_regroup), started (the world's count has begun)
const juggernaut_run = {ship: null, mode: 'hunt', t: 0, cd: 0, heading: 0, lane: 0, left: 0, crush: false, end: '', end_at: -Infinity, buried: 0, ground: 0, hull_seen: 0, spark_at: -Infinity, word_at: -Infinity, behind: 0, started: false};
// the world that has them (Dustfall, the world of the cliffs) and how many: one a wave before the flagship's
const juggernaut_world = cliff_world;
const juggernaut_count = arcade_free_waves - 1;
// how big one is (m, its hit radius), and how far from you it comes in (m)
const juggernaut_size = 34;
const juggernaut_come = 900;
// How fast it comes for you (m/s) on CHILL, NORMAL and OVERLOAD, where your cruise is 285, and how fast it turns
// (rad/s). A cliff's zone is 390 m across at its middle: at 120 m/s a juggernaut led across it is under the cliff for
// 3.2 s, and the crack and the rumble take 2.1 (juggernaut_cliff_burn, cliff_rumble)
const juggernaut_speeds = [100, 120, 135];
const juggernaut_turn = 1.5;
// Left behind, it burns harder to close the gap: from the first of these distances from you (m) its speed grows to
// juggernaut_rush times its own at the second, still under your cruise, so a pilot who flew ahead to a cliff 2 km off
// waits 8 s for it there, not 17; near you it is as slow as it was, and the trap's timing with it
const juggernaut_far = [700, 1100];
const juggernaut_rush = 2.1;
// A flight to a cliff leaves its escort behind, as a chase after a hauler does (hauler_regroup_after says what that
// costs): through its build-up, with fewer raiders within reach of you (pace_reach) than the director wants for this
// many s, those out of reach warp in round you, as a wave's stragglers do (pace_straggle_far)
const juggernaut_regroup_after = 3;
// Its hull: this many s of your whole kit's fire as its wave begins (arcade_base_kit_damage), times the mode's hull,
// as a raider's (arcade_modes: 1, 1.5, 1.8), and a card's factor on the raiders' hull; by the kit, as a brood nest's
// is (brood_nest_burn says why)
const juggernaut_burn = 16;
// A cliff's hull while the task runs: this many s of the kit's fire, on every mode
const juggernaut_cliff_burn = 1.5;
// The charge: with you this far (m) and its bow on you (within juggernaut_aim rad), once in juggernaut_charge_gap s
// by the mode, it stops for juggernaut_sign s, its lane drawn, turning with you until the last juggernaut_sign_lock s;
// then it runs the lane at juggernaut_charge_speed, juggernaut_charge_over m past where you stood, at most
// juggernaut_charge_most; in the open it then stands juggernaut_recover s. A rock or a cliff in the lane ends it
// there, stunned for juggernaut_stun s by the mode
const juggernaut_charge_range = [240, 700];
const juggernaut_aim = 0.3;
const juggernaut_charge_gap = [7, 6, 5];
const juggernaut_sign = 0.9;
const juggernaut_sign_lock = 0.3;
const juggernaut_charge_speed = 540;
const juggernaut_charge_over = 160;
const juggernaut_charge_most = 900;
const juggernaut_recover = 0.8;
const juggernaut_stun = [4.5, 3.8, 3.2];
// its plating answers your shots: sparks at most once in juggernaut_spark_gap s, a word once in juggernaut_word_gap
const juggernaut_spark_gap = 0.25;
const juggernaut_word_gap = 4;
// the crest comes this many s after it is buried or ground down: after the fall has run its zone
const juggernaut_crest_delay = 0.7;
// A burial pays this score times the combo and drops this many pieces of a rock's salvage, a repair with them where
// the mode lets repairs drop; the world's end pays this score a burial, and this much more for all five
const juggernaut_points = 600;
const juggernaut_salvage = 8;
const juggernaut_points_end = 300;
const juggernaut_points_all = 2500;
// the plating, its lit side, its shade and outline, the ram and its glow, the engines' flame, the stars of a stun and
// the marks on the screen and the map
const juggernaut_colors = {body: '#8f9aa8', light: '#c9d2dc', dark: '#454d59', line: '#0d0f14', ram: '#e2572b', glow: '#ffd16e', flame: '#ffb86b', star: '#ffd16e', mark: '#ffb347'};

arcade_tasks[juggernaut_world] = {
    wave_start: juggernauts_wave_start,
    update: juggernauts_update,
    crest_due: juggernauts_crest_due,
    crest_source: juggernauts_crest_source,
    share: juggernauts_share,
    card: juggernauts_card,
    banner: juggernauts_banner,
    marks: juggernauts_marks,
    cleared: juggernauts_cleared,
};

// A world's map is made (generate_map): no juggernaut is out, and the world's count starts again
function juggernauts_reset()
{
    const s = juggernaut_run;
    s.ship = null;
    s.mode = 'hunt';
    s.crush = false;
    s.end = '';
    s.end_at = -Infinity;
    s.buried = 0;
    s.ground = 0;
    s.started = false;
}

// Whether the task runs now: Dustfall's Free world, before its flagship's wave
function juggernauts_on()
{
    return (arcade_task() === arcade_tasks[juggernaut_world]) && (arcade.wave >= 1) && (arcade.wave < arcade_free_waves);
}

// A value by the mode: CHILL's, NORMAL's or OVERLOAD's
function juggernaut_by_mode(values)
{
    return values[['chill', 'normal', 'overload'].indexOf(difficulty)] ?? values[1];
}

// A juggernaut's hull now: juggernaut_burn s of the kit's fire, by the mode and a card's factor
function juggernaut_hull_now()
{
    return Math.max(1, Math.round(arcade_base_kit_damage()*juggernaut_burn*arcade_mode().hull*arcade_card_k.raider_hull));
}

// The cliffs still standing, and the one nearest you, or null
function juggernaut_cliffs_live()
{
    return cliffs.filter(v => (v.rock.hp > 0) && (v.rumble <= 0));
}

function juggernaut_cliff_nearest()
{
    let out = null;
    for (const c of juggernaut_cliffs_live()) {
        if (!out || (distance(c.rock, player) < distance(out.rock, player))) {
            out = c;
        }
    }
    return out;
}

// A wave begins (arcade_tasks): its juggernaut comes in. The world's first (or the wave the dev page starts it at):
// the count from nothing, a wave reached past the first (the dev page's &wave=n) counting the juggernauts before it
// as buried, and every standing cliff's hull set by the kit. The flagship's wave has none
function juggernauts_wave_start(n)
{
    const s = juggernaut_run;
    juggernauts_clear();
    if ((n === 1) || !s.started) {
        s.started = true;
        s.buried = Math.min(n - 1, juggernaut_count);
        s.ground = 0;
        const hp = Math.max(1, Math.round(arcade_base_kit_damage()*juggernaut_cliff_burn));
        for (const c of juggernaut_cliffs_live()) {
            c.rock.hp = hp*c.rock.hp/c.rock.max_hp;
            c.rock.max_hp = hp;
        }
    }
    s.end = '';
    s.end_at = -Infinity;
    if (n < arcade_free_waves) {
        juggernaut_spawn(n);
    }
}

// The juggernaut out off the map with no kill and no show
function juggernauts_clear()
{
    const s = juggernaut_run;
    const i = enemies.indexOf(s.ship);
    if (i >= 0) {
        enemies.splice(i, 1);
    }
    s.ship = null;
}

// The n-th juggernaut: juggernaut_come m from you, on the map and clear of the rocks, its bow to you; the world's
// first says what to do with it
function juggernaut_spawn(n)
{
    const s = juggernaut_run;
    const at = juggernaut_spawn_spot();
    const ship = spawn_enemy('tank');
    ship.x = at.x;
    ship.y = at.y;
    ship.r = juggernaut_size;
    ship.armor = 0;
    ship.max_shield = 0;
    ship.shield = 0;
    // unarmed, its hull the task's own (the arcade does not scale it: arcade_scaled), and anchored: its type's way of
    // flying moves it nowhere (arcade_role_steer), this file does
    ship.unarmed = true;
    ship.anchor = true;
    ship.arcade_scaled = true;
    ship.juggernaut = true;
    ship.event_kind = 'juggernaut';
    ship.hp = ship.max_hp = juggernaut_hull_now();
    ship.speed = juggernaut_by_mode(juggernaut_speeds);
    s.ship = ship;
    s.mode = 'hunt';
    s.t = 0;
    s.cd = juggernaut_by_mode(juggernaut_charge_gap)*0.5;
    s.heading = Math.atan2(player.y - ship.y, player.x - ship.x);
    s.crush = false;
    s.behind = 0;
    s.hull_seen = ship.hp;
    ship.angle = s.heading;
    ring(ship.x, ship.y, juggernaut_colors.mark, 220, 0.8);
    explode(ship.x, ship.y, 60, '#a8e4ff', 0, 'warp');
    const cliff = juggernaut_cliffs_live().length > 0;
    show_toast('JUGGERNAUT INBOUND', (n > 1)
        ? `${n} OF ${juggernaut_count} · ${cliff ? 'LEAD IT UNDER A CLIFF' : 'NO CLIFF STANDS · GRIND IT DOWN'}`
        : 'GUNS BARELY MARK IT · LEAD IT UNDER A CLIFF AND SHOOT THE CRACK', 4, 'danger');
    sfx('event_danger', 1, ship);
}

// Where a juggernaut comes in: juggernaut_come m from you, the first of a few bearings that is on the map, off the
// depot, clear of every rock and out of the cliffs' zones; else toward the map's middle
function juggernaut_spawn_spot()
{
    const middle = Math.atan2(world.h/2 - player.y, world.w/2 - player.x);
    let out = null;
    for (let i = 0; (i < 16) && !out; ++i) {
        const a = (i < 15) ? Math.random()*Math.PI*2 : middle;
        const p = {x: clamp(player.x + Math.cos(a)*juggernaut_come, 200, world.w - 200), y: clamp(player.y + Math.sin(a)*juggernaut_come, 200, world.h - 200)};
        const clear = (distance(p, player) > juggernaut_come*0.8)
            && (distance(p, station) > depot_shield_radius + juggernaut_size + 100)
            && ore_nodes.every(v => (v.hp <= 0) || (distance(v, p) > v.r + juggernaut_size + 40))
            && cliffs.every(v => (v.rock.hp <= 0) || !cliff_zone_has(v, p, juggernaut_size));
        if (clear || (i === 15)) {
            out = p;
        }
    }
    return out;
}

// Each frame of the world (arcade_tasks): the juggernaut out flies its own way, no portal taking it and no shove
// moving it; its plating answers the shots it took; its hull gone, its wave's crest follows
function juggernauts_update(dt)
{
    const s = juggernaut_run;
    const ship = s.ship;
    if (!ship) {
        return;
    }
    if (ship.hp <= 0) {
        juggernaut_down();
        return;
    }
    ship.portal_cd = 1;
    ship.push_vx = 0;
    ship.push_vy = 0;
    juggernaut_answer();
    juggernaut_fly(dt*stasis_scale(ship));
    ship.angle = s.heading;
    juggernaut_regroup(dt);
}

// How fast it flies now (m/s): its own speed, more the farther behind it is left (juggernaut_far)
function juggernaut_speed_now()
{
    const ship = juggernaut_run.ship;
    const k = clamp((distance(ship, player) - juggernaut_far[0])/(juggernaut_far[1] - juggernaut_far[0]), 0, 1);
    return ship.speed*(1 + (juggernaut_rush - 1)*k);
}

// The escort a flight to a cliff left behind regroups (juggernaut_regroup_after): through the build-up, the raiders
// the director counts (not an event's) that are out of reach warp in round you once fewer than it wants have been
// within reach for long enough; a lancer lying in wait among the rocks comes too
function juggernaut_regroup(dt)
{
    const s = juggernaut_run;
    if (arcade.pace?.crest || !arcade.pace) {
        s.behind = 0;
        return;
    }
    let near = 0;
    let far = 0;
    for (let i = 0, end = enemies.length; i < end; ++i) {
        const v = enemies[i];
        if ((v.hp > 0) && !v.anchor && !v.event_kind) {
            if (distance(v, player) >= pace_reach) {
                far++;
            }
            else {
                near++;
            }
        }
    }
    s.behind = (far && (near < pace_want())) ? s.behind + dt : 0;
    if (s.behind < juggernaut_regroup_after) {
        return;
    }
    s.behind = 0;
    for (let i = 0, end = enemies.length; i < end; ++i) {
        const v = enemies[i];
        if ((v.hp > 0) && !v.anchor && !v.event_kind && (distance(v, player) >= pace_reach)) {
            const a = Math.random()*Math.PI*2;
            v.x = clamp(player.x + Math.cos(a)*pace_straggle_far, 40, world.w - 40);
            v.y = clamp(player.y + Math.sin(a)*pace_straggle_far, 40, world.h - 40);
            v.lurk = false;
            ring(v.x, v.y, v.color || pink, 40, 0.4);
            explode(v.x, v.y, 26, '#a8e4ff', 0, 'warp');
        }
    }
}

// The juggernaut flies, slowed as stasis slows a raider: hunting, it turns to you round the rocks ahead and comes on,
// and with you lined up gives its sign; the sign over, it charges down its lane; a rock in the lane stuns it; then it
// hunts again
function juggernaut_fly(dt)
{
    const s = juggernaut_run;
    const ship = s.ship;
    const to = Math.atan2(player.y - ship.y, player.x - ship.x);
    const d = distance(ship, player);
    if (s.mode === 'hunt') {
        s.cd -= dt;
        const want = raider_avoid(ship, to);
        s.heading += clamp(Math.atan2(Math.sin(want - s.heading), Math.cos(want - s.heading)), -juggernaut_turn*dt, juggernaut_turn*dt);
        const speed = juggernaut_speed_now();
        ship.x = clamp(ship.x + Math.cos(s.heading)*speed*dt, 24, world.w - 24);
        ship.y = clamp(ship.y + Math.sin(s.heading)*speed*dt, 24, world.h - 24);
        const lined = Math.abs(Math.atan2(Math.sin(to - s.heading), Math.cos(to - s.heading))) < juggernaut_aim;
        if ((s.cd <= 0) && lined && (d > juggernaut_charge_range[0]) && (d < juggernaut_charge_range[1])) {
            s.mode = 'sign';
            s.t = juggernaut_sign;
            s.lane = to;
            ring(ship.x, ship.y, juggernaut_colors.glow, 70, 0.4);
            sfx('boost', 1, ship);
        }
        return;
    }
    if (s.mode === 'sign') {
        s.t -= dt;
        if (s.t > juggernaut_sign_lock) {
            s.lane = to;
            s.left = clamp(d + juggernaut_charge_over, juggernaut_charge_range[0], juggernaut_charge_most);
        }
        s.heading = s.lane;
        if (s.t <= 0) {
            s.mode = 'charge';
        }
        return;
    }
    if (s.mode === 'charge') {
        const step = Math.min(s.left, juggernaut_charge_speed*dt);
        const rock = boss_duel_rock_ahead(ship, s.lane, step);
        if (rock) {
            juggernaut_stunned(rock);
            return;
        }
        ship.x = clamp(ship.x + Math.cos(s.lane)*step, 24, world.w - 24);
        ship.y = clamp(ship.y + Math.sin(s.lane)*step, 24, world.h - 24);
        s.left -= step;
        if (s.left <= 0) {
            s.mode = 'recover';
            s.t = juggernaut_recover;
        }
        return;
    }
    // standing after a charge, or stunned
    s.t -= dt;
    if (s.t <= 0) {
        s.cd = juggernaut_by_mode(juggernaut_charge_gap)*((s.mode === 'stun') ? 0.5 : 1);
        s.mode = 'hunt';
    }
}

// Its charge ends on a rock: it reels back a step and stands stunned, as the world's flagship does
function juggernaut_stunned(rock)
{
    const s = juggernaut_run;
    const ship = s.ship;
    s.mode = 'stun';
    s.t = juggernaut_by_mode(juggernaut_stun);
    shake = Math.max(shake, 10);
    explode((ship.x + rock.x)/2, (ship.y + rock.y)/2, 50, '#e4c98a');
    burst((ship.x + rock.x)/2, (ship.y + rock.y)/2, '#e4c98a', 26, 280);
    label(ship.x, ship.y - ship.r*3.3, 'STUNNED', gold);
    sfx('impact', 1, ship);
}

// Its plating answers the shots it took since the last frame: sparks off its rim on your side, and now and then, in
// the open, a word, so a pilot sees the guns are not the way
function juggernaut_answer()
{
    const s = juggernaut_run;
    const ship = s.ship;
    const hurt = ship.hp < s.hull_seen;
    s.hull_seen = ship.hp;
    if (!hurt || s.crush) {
        return;
    }
    const a = Math.atan2(player.y - ship.y, player.x - ship.x);
    if (time - s.spark_at >= juggernaut_spark_gap) {
        s.spark_at = time;
        burst(ship.x + Math.cos(a)*ship.r, ship.y + Math.sin(a)*ship.r, juggernaut_colors.light, 4, 140);
    }
    // no word while it is under a cliff: there the pilot is at the right thing
    if ((time - s.word_at >= juggernaut_word_gap) && !cliffs.some(v => (v.rock.hp > 0) && cliff_zone_has(v, ship, 0))) {
        s.word_at = time;
        label(ship.x, ship.y - ship.r*3.3, 'PLATING HOLDS', juggernaut_colors.light);
        sfx('hit', 0.5, ship);
    }
}

// A cliff's fall reaches a juggernaut (cliff_fall_update): it is buried at once, its plating no help; the kill is a
// raider's, the burial's show and pay the task's (juggernaut_down)
function juggernaut_bury(enemy)
{
    juggernaut_run.crush = true;
    damage_enemy(enemy, enemy.hp + (enemy.shield || 0) + 1);
}

// The juggernaut's hull is gone: buried, the wave's moment, with its score, its salvage and the count going up; or
// ground down by the guns. Its wave's crest follows
function juggernaut_down()
{
    const s = juggernaut_run;
    const ship = s.ship;
    s.ship = null;
    s.end = s.crush ? 'buried' : 'ground';
    s.end_at = time;
    if (!s.crush) {
        s.ground++;
        return;
    }
    s.buried++;
    const points = juggernaut_points*combo;
    score += points;
    // over the kill's own number and the blasts of the fall
    label(ship.x, ship.y - ship.r*3.6, `BURIED · +${points}`, gold);
    ring(ship.x, ship.y, juggernaut_colors.glow, 300, 0.7);
    burst(ship.x, ship.y, juggernaut_colors.light, 50, 360);
    shake = Math.max(shake, 24);
    hit_stop_start(0.1);
    sfx('blast_big', 1, ship);
    for (let i = 0; i < juggernaut_salvage; ++i) {
        drop_pickup(ship.x + rand(-50, 50), ship.y + rand(-50, 50), 'artifact', 4 + arcade_level()*2);
    }
    if (repair_drop_allowed()) {
        drop_pickup(ship.x, ship.y, 'health');
    }
    if (s.buried >= juggernaut_count) {
        show_toast('ALL FIVE BURIED', `EVERY JUGGERNAUT OF THE ${worlds[campaign.world].faction} UNDER A CLIFF`, 3.5, 'income');
        sfx('upgrade');
    }
}

// Whether the guns may turn to a cliff's crack while the task runs (cliff_target): the wave's juggernaut is in its
// zone and the fall would catch it there: stunned or giving its sign for longer than the crack and the rumble take,
// or, as it flies, still in the zone by then
function juggernaut_cliff_due(c)
{
    const s = juggernaut_run;
    const ship = s.ship;
    if (!ship || (ship.hp <= 0) || !cliff_zone_has(c, ship, 0)) {
        return false;
    }
    const need = c.rock.hp/Math.max(1, arcade_base_kit_damage()) + cliff_rumble + 0.2;
    if (s.mode === 'charge') {
        return false;
    }
    if (s.mode !== 'hunt') {
        return (s.t >= need) || (s.mode === 'stun');
    }
    const far = juggernaut_speed_now()*need;
    return cliff_zone_has(c, {x: ship.x + Math.cos(s.heading)*far, y: ship.y + Math.sin(s.heading)*far}, 0);
}

// What ends a wave's build-up (arcade_tasks): its juggernaut is buried or ground down
function juggernauts_crest_due()
{
    const s = juggernaut_run;
    return !!s.end && (time - s.end_at >= juggernaut_crest_delay);
}

// Where the crest comes from (arcade_tasks): round you, as any wave's, with the task's word for it
function juggernauts_crest_source()
{
    const s = juggernaut_run;
    return {
        x: player.x,
        y: player.y,
        place: function (enemy, i) {
            ring(enemy.x, enemy.y, enemy.color || pink, 40, 0.4);
            explode(enemy.x, enemy.y, 26, '#a8e4ff', i*0.05, 'warp');
        },
        toast: (s.end === 'buried')
            ? ['JUGGERNAUT BURIED', `${s.buried} OF ${juggernaut_count} UNDER A CLIFF · ITS ESCORT'S LAST SQUADRON COMES`]
            : ['JUGGERNAUT GROUND DOWN', 'NO CLIFF TOOK IT · ITS ESCORT\'S LAST SQUADRON COMES'],
    };
}

// How far the wave has come to its crest (arcade_tasks): the share of its hull the juggernaut has lost
function juggernauts_share()
{
    const s = juggernaut_run;
    if (s.end || !s.ship) {
        return 1;
    }
    return 1 - s.ship.hp/s.ship.max_hp;
}

// What the card says (arcade_tasks): the juggernauts buried so far, with the way to the nearest cliff still standing;
// the juggernaut under a cliff, to shoot the crack, or to get clear of the zone first; with no cliff left, the way
// to the juggernaut; down, its escort left; in the breather, what comes next; the flagship's wave is the flagship's
function juggernauts_card()
{
    if ((arcade.wave < 1) || (arcade.wave >= arcade_free_waves)) {
        return null;
    }
    const s = juggernaut_run;
    const count = `${s.buried} of ${juggernaut_count}`;
    if (arcade.pause > 0) {
        return {title: (arcade.wave < juggernaut_count) ? `Juggernauts buried ${count} · next one soon` : `Juggernauts buried ${count} · now the flagship`};
    }
    const ship = s.ship;
    if (!ship || (ship.hp <= 0)) {
        const raiders = enemies.filter(v => v.hp > 0).length;
        return {title: `Destroy its escort: ${raiders} raider${(raiders === 1) ? '' : 's'}`};
    }
    const under = juggernaut_cliffs_live().find(v => cliff_zone_has(v, ship, 0));
    if (under) {
        // the guns never fell a cliff whose zone you are in (cliff_target): the card says so
        const you = cliff_zone_has(under, player, player.r + cliff_aim_margin);
        return {title: you ? 'It is under a cliff: stand clear of it' : 'It is under a cliff: shoot the crack', target: under.rock, eta: you ? 'out of its zone' : 'the crack'};
    }
    const cliff = juggernaut_cliff_nearest();
    if (!cliff) {
        return {title: 'No cliff stands: grind it down', target: ship, eta: 'juggernaut'};
    }
    return {title: `Lead it under a cliff: buried ${count}`, target: cliff.rock, eta: `cliff · juggernaut ${radar_distance_text(distance(ship, player))}`};
}

// What the arrival's banner says (arcade_tasks)
function juggernauts_banner()
{
    return {title: 'Bury the juggernauts', line: `${juggernaut_count} juggernauts of the ${worlds[campaign.world].faction} · a cliff buries one · then its flagship`};
}

// The juggernaut and the cliffs still standing on the map and the minimap (arcade_tasks)
function juggernauts_marks(add)
{
    const s = juggernaut_run;
    if (!juggernauts_on()) {
        return;
    }
    if (s.ship && (s.ship.hp > 0)) {
        add('danger', s.ship, 'transport', juggernaut_colors.mark, 'JUGGERNAUT', {angle: s.heading + Math.PI/2});
    }
    for (const c of juggernaut_cliffs_live()) {
        add('danger', c.rock, 'objective', juggernaut_colors.mark, 'CLIFF', {small: true});
    }
}

// The world cleared (arcade_tasks): what the burials pay in score, and the cleared screen's words for them, said on
// its line after the flagship's
function juggernauts_cleared()
{
    const s = juggernaut_run;
    const all = s.buried >= juggernaut_count;
    const points = s.buried*juggernaut_points_end + (all ? juggernaut_points_all : 0);
    return {points, line: `${all ? `all ${juggernaut_count} juggernauts buried` : `juggernauts buried ${s.buried} of ${juggernaut_count}`}${points ? ` +${ui_number(points)}` : ''}`};
}

// The juggernaut in view, under the raiders: the lane of its charge while it gives its sign and runs it, and its hull;
// its bar and its name come over the raiders (juggernauts_render_over)
function juggernauts_render()
{
    const s = juggernaut_run;
    const ship = s.ship;
    if (!ship || (ship.hp <= 0) || !in_view(ship, juggernaut_charge_most + 100)) {
        return;
    }
    ctx.save();
    if ((s.mode === 'sign') || (s.mode === 'charge')) {
        const blink = (full_fx && (s.mode === 'sign')) ? 0.5 + 0.3*Math.sin(clock*30) : 0.7;
        boss_dash(ship.x, ship.y, ship.x + Math.cos(s.lane)*s.left, ship.y + Math.sin(s.lane)*s.left, juggernaut_colors.ram, blink, 4/zoom);
    }
    ctx.globalAlpha = 1;
    juggernaut_draw(ship, s.heading, s.mode);
    ctx.restore();
}

// Over the raiders (render): its hull as a bar once hit, and above it its name, or what it does: both clear of the
// bracket the guns' target gets (render_target_brackets: 1.9 times its size); the stars of a stun turn over it
function juggernauts_render_over()
{
    const s = juggernaut_run;
    const ship = s.ship;
    if (!ship || (ship.hp <= 0) || !in_view(ship, 320)) {
        return;
    }
    const c = juggernaut_colors;
    ctx.save();
    const top = ship.y - ship.r*1.9 - 12;
    const share = clamp(ship.hp/ship.max_hp, 0, 1);
    if (share < 1) {
        const w = ship.r*2.4;
        ctx.fillStyle = '#0b1222';
        ctx.fillRect(ship.x - w/2, top, w, 5);
        ctx.fillStyle = c.light;
        ctx.fillRect(ship.x - w/2, top, w*share, 5);
    }
    const word = (s.mode === 'stun') ? `STUNNED ${Math.max(0, s.t).toFixed(1)} S` : ((s.mode === 'sign') || (s.mode === 'charge')) ? 'JUGGERNAUT · CHARGE' : 'JUGGERNAUT · PLATED';
    boss_duel_text(word, ship.x, top - 8, (s.mode === 'hunt') ? c.mark : c.glow, 0.9);
    if (s.mode === 'stun') {
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = c.star;
        ctx.strokeStyle = c.line;
        ctx.lineWidth = 1.5/zoom;
        const size = 7/zoom;
        const turn = full_fx ? clock*3 : 0;
        for (let i = 0; i < 4; ++i) {
            const a = turn + i*Math.PI/2;
            const x = ship.x + Math.cos(a)*ship.r*0.9;
            const y = ship.y - ship.r*0.2 + Math.sin(a)*ship.r*0.35;
            ctx.beginPath();
            for (let k = 0; k < 8; ++k) {
                const r = (k % 2) ? size*0.4 : size;
                ctx.lineTo(x + Math.cos(k*Math.PI/4)*r, y + Math.sin(k*Math.PI/4)*r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }
    ctx.restore();
}

// The juggernaut, its bow along `angle`: two engines' flames, the plates round its rim, the hull with its outline,
// its lit top, a dark band and the ram at its bow, which glows while it gives its sign and charges; a shot lights
// the plates' rim for a moment, the hull under them unmarked
function juggernaut_draw(ship, angle, mode)
{
    const c = juggernaut_colors;
    const r = ship.r;
    const hit = ship.flash > 0;
    const hot = (mode === 'sign') || (mode === 'charge');
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(angle);
    ctx.lineJoin = 'round';
    const flame = r*((mode === 'charge') ? 1.1 : (mode === 'hunt') ? 0.45 : 0.15)*(1 + (full_fx ? Math.sin(clock*31)*0.15 : 0));
    ctx.fillStyle = c.flame;
    ctx.beginPath();
    for (const side of [-1, 1]) {
        ctx.moveTo(-r*0.95, side*r*0.66);
        ctx.lineTo(-r*0.95 - flame, side*r*0.46);
        ctx.lineTo(-r*0.95, side*r*0.26);
    }
    ctx.fill();
    ctx.strokeStyle = hit ? c.light : c.line;
    ctx.lineWidth = 3/zoom;
    // the plates: three a side and one across the stern, each over the hull's rim
    ctx.fillStyle = c.dark;
    ctx.beginPath();
    for (const side of [-1, 1]) {
        for (let k = 0; k < 3; ++k) {
            ctx.rect(-r*0.86 + k*r*0.56, side*r*0.94 - r*0.14, r*0.5, r*0.28);
        }
    }
    ctx.rect(-r*1.12, -r*0.5, r*0.26, r);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = c.line;
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(r*0.78, -r*0.5);
    ctx.lineTo(r*0.4, -r*0.84);
    ctx.lineTo(-r*0.7, -r*0.84);
    ctx.lineTo(-r*0.98, -r*0.5);
    ctx.lineTo(-r*0.98, r*0.5);
    ctx.lineTo(-r*0.7, r*0.84);
    ctx.lineTo(r*0.4, r*0.84);
    ctx.lineTo(r*0.78, r*0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c.light;
    ctx.beginPath();
    ctx.moveTo(r*0.5, -r*0.36);
    ctx.lineTo(r*0.26, -r*0.56);
    ctx.lineTo(-r*0.6, -r*0.56);
    ctx.lineTo(-r*0.6, r*0.56);
    ctx.lineTo(r*0.26, r*0.56);
    ctx.lineTo(r*0.5, r*0.36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.dark;
    ctx.fillRect(-r*0.34, -r*0.56, r*0.22, r*1.12);
    ctx.fillRect(r*0.06, -r*0.2, r*0.26, r*0.4);
    // the ram
    ctx.fillStyle = hot ? c.glow : c.ram;
    ctx.beginPath();
    ctx.moveTo(r*1.25, 0);
    ctx.lineTo(r*0.74, -r*0.56);
    ctx.lineTo(r*0.6, -r*0.3);
    ctx.lineTo(r*0.6, r*0.3);
    ctx.lineTo(r*0.74, r*0.56);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

// On the screen's edge (screen px), while the juggernaut is out of view: the kit's marker toward it with its
// distance; none while a jammer blinds (arcade_events.js)
function juggernauts_render_marks()
{
    const ship = juggernaut_run.ship;
    if (!ship || (ship.hp <= 0) || !player || (state !== 'playing') || arcade_event_blind() || in_view(ship, 0)) {
        return;
    }
    const m = hud_edge_marker(radar_screen(ship), 40);
    if (m.offscreen) {
        draw_edge_marker(m, `JUGGERNAUT · ${radar_distance_text(distance(player, ship))}`, juggernaut_colors.mark);
    }
}
