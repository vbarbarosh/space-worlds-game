// Verdant's task in the arcade's Free kind: burn the nests (a run of eight worlds flew as the same six waves eight
// times; each world gets a task of its own, and Verdant's is the first). Five brood nests of the
// Thorn Swarm stand along the valley, the same every visit, and the world's raiders come out of them: through a wave's
// build-up the director's squadrons (arcade_pace.js) hatch from a nest, the one you are burning, else the nearest, and
// fly at you; a nest far off hatches only a trickle, and once the wave's share has hatched no more come until a nest
// burns. A wave is a nest: its hull gone, it bursts, a blast that hurts and shoves what is round it, and its last
// brood comes out at once, the wave's crest. The brood down, the breather follows and the next wave begins; the nests
// in any order. The fifth burnt, the flagship comes as in any world. A pilot who keeps away from them is sent hunters.
//
// A brood nest is solid (docs/principles.md): a rock of ore_nodes (type brood_nest), as a cliff is, so ships crash
// into it, every shot stops on it and raiders steer round it. Your shots, missiles and pulse and every blast burn it;
// a raider's shot stops on it and does it no harm. It stands where it is: the current, a push wave and a blast do not
// move it. Burnt, it is a husk: background, dim, nothing stops on it.
//
// Not the Thorn Beetle's shield nests (boss_duels.js, boss_duel_nest): those are raiders of the flagship's duel, sown
// round it, and the duel is as it was.

// The nests of the map: {x, y, r, rock (its rock of ore_nodes; null once burnt), order (the place it burnt in, 1 the
// first; 0 standing), burst_at (when, time), hurt_at (when it was last hurt), hatch (the s its mouth stays open after
// a hatch), angle, phase, shape (its lobes)}
let brood_nests = [];
// The wave's own count: started (the world's nests have their hull), left (the raiders still to hatch before the
// crest), hatched_at (when the last ones did, time), away (the s since a nest was last hurt), hunters (the packs sent
// for it this wave) and woken (a nest was hurt this frame)
const brood_nest_wave = {started: false, left: 0, hatched_at: -Infinity, away: 0, hunters: 0, woken: false};
// the world that has them (Verdant), and how many: one a wave before the flagship's
const brood_nest_world = 1;
const brood_nest_count = arcade_free_waves - 1;
// how big (m)
const brood_nest_size = [62, 76];
// Where they stand (docs/placement.md): this far from the station's middle, past the reach the depot's shield watches
// (1400 m) and the fight round a nest (600 m), so burning one never closes the depot; from each other; from the map's
// edge; and with this much room all round, clear of every rock and of a beacon's range, so a ship flies round one
const brood_nest_out = 2000;
const brood_nest_apart = 1200;
const brood_nest_edge = 600;
const brood_nest_room = 150;
// and this far from a portal's ring (and a gate's range), so a ship circling a nest in a fight never flies into one
const brood_nest_ring = 500;
// A nest's hull: this many s of your whole kit's fire as the world begins (arcade_base_kit_damage: every mount and
// every bolt of a volley, which a body this big takes), times the mode's hull, as a raider's (arcade_modes: 1, 1.5,
// 1.8), and a card's factor on the raiders' hull: 13 s on CHILL, 20 on NORMAL, 24 on OVERLOAD. By the kit, as a Scroll
// run's raiders are, not by the run's step: at one step a kit with a Prism and a second gun deals a nest eight times
// what the start kit does (549 a second against 67, measured), so a hull by the step alone lasted the one 1.2 s and
// the other 10
const brood_nest_burn = 12;
// A wave's share to hatch before its crest: this much of the wave's raiders (arcade_wave_size): 35, 45 and 55 on
// NORMAL at the run's second step, nine squadrons a wave, which at brood_nest_hatch_gap is a build-up's 36 s; a nest
// burnt sooner keeps the rest (the bot's hatched 181 to 221 in the five waves, where the director's squadrons brought
// it 215 before the nests). The brood is the crest's own, on top
const brood_nest_share = 1.25;
// The nest you are burning hatches the wave's squadrons: the one hurt within this many s, else the nearest; a nest
// hatches at most once in brood_nest_hatch_gap s. Out of a nest a squadron is in your guns' reach at once, where one
// that warps in 640 m off takes some 3 s to come: with no gap the bot had a wave's share down in 15 to 20 s, against
// the 36 s of a build-up
const brood_nest_hold = 6;
const brood_nest_hatch_gap = 4;
// A nest farther than this (m) hatches a trickle: this many raiders at most, this many s apart. The next nest down
// the valley is within it, so its squadrons are on their way as you fly to it
const brood_nest_far = 2400;
const brood_nest_trickle = 2;
const brood_nest_trickle_gap = 8;
// No nest hurt for this many s of a build-up: hunters, elite interceptors out of the nearest nest, this many, then a
// pack every brood_nest_away_gap s with one more each time, up to brood_nest_hunters_most; they carry no supply
const brood_nest_away = 45;
const brood_nest_away_gap = 25;
const brood_nest_hunters = 2;
const brood_nest_hunters_most = 5;
// The burst, as a big ship's blast (blasts.js): its fireball's size (it reaches 1.8 times that), what it deals a
// raider at its middle and you before the mode's blast; then the brood, this many s after, once the front has passed
const brood_nest_blast = 110;
const brood_nest_blast_raiders = 60;
const brood_nest_blast_you = 30;
const brood_nest_brood_delay = 0.45;
// The brood comes out over this ring round the burnt nest's rim (m from it): packed on the nest, the bot's pulse and
// the first deaths' blasts took a brood of nine in 2 s, and the crest was over before it began
const brood_nest_scatter = [60, 260];
// A nest burnt pays this score times the combo, and drops this many pieces of a rock's salvage
const brood_nest_points = 400;
const brood_nest_salvage = 4;
// the body, its thorns and outline, the brood sacs alight and burnt out, the mouth's glow, a hatch's spores, the husk,
// and the marks on the screen's edge
const brood_nest_colors = {light: '#69b877', body: '#2f7a4e', dark: '#12382a', thorn: '#0c2a20', line: '#04110b', sac: '#ffc24d', sac_out: '#3a2b1a', glow: '#fff0a8', spore: '#c8ff9a', husk: '#0d1a14', mark: '#ffb347'};

arcade_tasks[brood_nest_world] = {
    wave_start: brood_nests_wave_start,
    update: brood_nests_update,
    source: brood_nests_source,
    crest_due: brood_nests_crest_due,
    crest_source: brood_nests_crest_source,
    share: brood_nests_share,
    card: brood_nests_card,
    banner: brood_nests_banner,
    marks: brood_nests_marks,
};

// The nests for the world's map, the same every visit (their own seed): one in each fifth of the stretch of the map's
// longer side the world's shape gives them (arcade_shapes: nests), either side of its middle in turn, where a spot
// fits (brood_nest_spot_ok); the drifting pieces in one go
function brood_nests_generate()
{
    brood_nests = [];
    brood_nest_wave.started = false;
    if (!arcade.active || (campaign.world !== brood_nest_world) || arcade_lane_kind()) {
        return;
    }
    const random = visual_random_from_seed(5150);
    const long = world.w >= world.h;
    const span = arcade_shape().nests || [0.06, 0.94];
    for (let i = 0; i < brood_nest_count; ++i) {
        for (let tries = 0; tries < 120; ++tries) {
            const r = Math.round(brood_nest_size[0] + random()*(brood_nest_size[1] - brood_nest_size[0]));
            const along = span[0] + (span[1] - span[0])*(i + 0.15 + random()*0.7)/brood_nest_count;
            // after sixty tries on its side, the other one
            const side = ((i + ((tries < 60) ? 0 : 1)) % 2) ? 1 : -1;
            const across = 0.5 + side*(0.16 + random()*0.14);
            const p = long ? {x: Math.round(world.w*along), y: Math.round(world.h*across)} : {x: Math.round(world.w*across), y: Math.round(world.h*along)};
            if (!brood_nest_spot_ok(p, r)) {
                continue;
            }
            const shape = [];
            for (let k = 0; k < 7; ++k) {
                shape.push(0.9 + random()*0.14);
            }
            // its hull comes as the world's first wave begins (brood_nests_wave_start), by the kit flown then
            const rock = ore_node_new({x: p.x, y: p.y, r, hp: 1, max_hp: 1, type: 'brood_nest', field: -1, angle: random()*Math.PI*2, flash: 0});
            brood_nests.push({x: p.x, y: p.y, r, rock, order: 0, burst_at: -Infinity, hurt_at: -Infinity, hatch: 0, angle: rock.angle, phase: random()*Math.PI*2, shape});
            break;
        }
    }
    ore_nodes.push(...brood_nests.map(v => v.rock));
    drifting_debris = drifting_debris.filter(v => brood_nests.every(vv => distance(v, vv) > v.r + vv.r + 40));
}

// Whether a nest of radius r fits at p: inside the map, out of the depot's reach, clear of the gates', portals' and
// beacons' ranges, the pulls and the storms, with room all round among the rocks, and apart from the nests placed
function brood_nest_spot_ok(p, r)
{
    if (Math.min(p.x, p.y, world.w - p.x, world.h - p.y) < brood_nest_edge) {
        return false;
    }
    if (distance(p, station) < brood_nest_out) {
        return false;
    }
    if (world_gates.some(v => distance(p, v) < gate_reach + r + brood_nest_ring)) {
        return false;
    }
    if (portals.some(v => distance(p, v) < v.r + 25 + r + brood_nest_ring)) {
        return false;
    }
    if (beacons.some(v => distance(p, v) < 120 + r + brood_nest_room)) {
        return false;
    }
    if (black_holes.some(v => distance(p, v) < gravity_reach(v) + r) || world_zones.some(v => distance(p, v) < v.r + r)) {
        return false;
    }
    if (ore_nodes.some(v => distance(p, v) < v.r + r + brood_nest_room)) {
        return false;
    }
    return brood_nests.every(v => distance(p, v) >= brood_nest_apart);
}

// A nest's hull now: brood_nest_burn s of the kit's fire, by the mode and a card's factor
function brood_nest_hull_now()
{
    return Math.max(1, Math.round(arcade_base_kit_damage()*brood_nest_burn*arcade_mode().hull*arcade_card_k.raider_hull));
}

// The nests standing, and how many have burnt
function brood_nests_live()
{
    return brood_nests.filter(v => v.rock);
}

function brood_nests_burnt()
{
    return brood_nests.length - brood_nests_live().length;
}

// The standing nest nearest you, or null
function brood_nest_nearest()
{
    let out = null;
    for (const nest of brood_nests) {
        if (nest.rock && (!out || (distance(nest, player) < distance(out, player)))) {
            out = nest;
        }
    }
    return out;
}

// The nest that hatches now: the one hurt last within brood_nest_hold s, else the nearest
function brood_nest_hatching()
{
    let hurt = null;
    for (const nest of brood_nests) {
        if (nest.rock && (time - nest.hurt_at < brood_nest_hold) && (!hurt || (nest.hurt_at > hurt.hurt_at))) {
            hurt = nest;
        }
    }
    return hurt || brood_nest_nearest();
}

// A wave begins (arcade_tasks): its share to hatch, nobody away yet. The world's first (or the wave the dev page
// starts it at): every nest gets its hull, and the world says what they are. A wave reached with fewer nests burnt
// than the waves before it (the dev page's &wave=n) finds those burnt already, as husks.
function brood_nests_wave_start(n)
{
    const w = brood_nest_wave;
    if ((n === 1) || !w.started) {
        w.started = true;
        w.hatched_at = -Infinity;
        const hp = brood_nest_hull_now();
        for (const nest of brood_nests_live()) {
            nest.rock.hp = nest.rock.max_hp = hp;
        }
        show_toast('NESTS', 'THE SWARM HATCHES FROM THEM · BURN ONE AND ITS LAST BROOD COMES OUT', 4);
    }
    w.left = (n < arcade_free_waves) ? Math.round(arcade_wave_size(n)*brood_nest_share) : 0;
    w.away = 0;
    w.hunters = 0;
    for (const nest of brood_nests) {
        if (nest.rock && (brood_nests_burnt() < Math.min(n - 1, brood_nest_count))) {
            brood_nest_husk(nest);
        }
    }
}

// A nest gone with no burst: its rock leaves the map, the husk stays
function brood_nest_husk(nest)
{
    nest.order = brood_nests_burnt() + 1;
    nest.rock.hp = 0;
    nest.rock = null;
}

// Each frame of the world (arcade_tasks): a nest stays rooted where it stands (Verdant's current carries the rocks,
// not a nest) and keeps its rim clear; a nest hurt or burnt while the last one's brood is still out, or in the
// breather, begins its wave at once, so no nest is burnt with its raiders asleep; and through a build-up with no nest
// hurt, the hunters
function brood_nests_update(dt)
{
    for (const nest of brood_nests) {
        nest.hatch = Math.max(0, nest.hatch - dt);
        if (nest.rock) {
            nest.rock.x = nest.x;
            nest.rock.y = nest.y;
        }
    }
    brood_nests_keep_clear();
    if ((arcade.wave < 1) || (arcade.wave >= arcade_free_waves)) {
        return;
    }
    const w = brood_nest_wave;
    const crested = (arcade.pause > 0) || !!arcade.pace?.crest;
    const woken = w.woken;
    w.woken = false;
    if (crested && (woken || (brood_nests_burnt() > arcade.wave)) && (arcade.wave < brood_nest_count)) {
        arcade_event_cut();
        arcade.pause = 0;
        arcade_wave_start(arcade.wave + 1);
        return;
    }
    if (crested || (brood_nests_burnt() >= arcade.wave)) {
        return;
    }
    w.away += dt;
    if (w.away >= brood_nest_away + w.hunters*brood_nest_away_gap) {
        brood_nest_hunters_send();
    }
}

// What the current or a shove brings to a standing nest stops at its rim: a rock is put back out, a drifting piece
// glances off as off a spire (spire_deflect)
function brood_nests_keep_clear()
{
    for (const nest of brood_nests) {
        if (!nest.rock) {
            continue;
        }
        for (let i = 0, end = ore_nodes.length; i < end; ++i) {
            const v = ore_nodes[i];
            if ((v !== nest.rock) && (v.hp > 0)) {
                brood_nest_push_out(nest, v, 0);
            }
        }
        for (let i = 0, end = drifting_debris.length; i < end; ++i) {
            const v = drifting_debris[i];
            if (brood_nest_push_out(nest, v, 4)) {
                const d = distance(v, nest) || 1;
                const into = (v.vx*(v.x - nest.x) + v.vy*(v.y - nest.y))/d;
                if (into < 0) {
                    v.vx -= 2*into*(v.x - nest.x)/d;
                    v.vy -= 2*into*(v.y - nest.y)/d;
                }
            }
        }
    }
}

// v moved out of a nest to its rim and `gap` m more; whether it was in it
function brood_nest_push_out(nest, v, gap)
{
    const min = nest.r + v.r + gap;
    const dx = v.x - nest.x;
    const dy = v.y - nest.y;
    if ((Math.abs(dx) >= min) || (Math.abs(dy) >= min)) {
        return false;
    }
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d >= min) {
        return false;
    }
    v.x = nest.x + (d ? dx/d : 1)*min;
    v.y = nest.y + (d ? dy/d : 0)*min;
    return true;
}

// The hunters for a pilot who keeps away: elite interceptors out of the nearest nest, one more each time, with no
// supply to drop, so waiting for them pays nothing
function brood_nest_hunters_send()
{
    const w = brood_nest_wave;
    const nest = brood_nest_nearest();
    if (!nest) {
        return;
    }
    const count = Math.min(brood_nest_hunters_most, brood_nest_hunters + w.hunters);
    w.hunters++;
    show_toast('HUNTERS', 'THE NESTS SEND THEM AFTER YOU · BURN A NEST', 4, 'danger');
    nest.hatch = 0.6;
    for (let i = 0; i < count; ++i) {
        const enemy = raider_kind_spawn('interceptor', nest.x, nest.y);
        arcade_elite_make(enemy);
        enemy.drop_on_death = null;
        enemy.plate = 'Hunter';
        brood_nest_place(nest, enemy, i);
    }
}

// Where a build-up's squadron comes from (arcade_tasks): the nest that hatches now, as many of the `size` the director
// asks as the wave's share has left; a far nest a trickle; none once the share is out, or the wave's nest has burst
function brood_nests_source(size)
{
    const w = brood_nest_wave;
    const nest = brood_nest_hatching();
    if (!nest || (w.left <= 0) || (brood_nests_burnt() >= arcade.wave)) {
        return {size: 0};
    }
    const far = distance(nest, player) > brood_nest_far;
    if (time - w.hatched_at < (far ? brood_nest_trickle_gap : brood_nest_hatch_gap)) {
        return {size: 0};
    }
    const count = Math.min(size, w.left, far ? brood_nest_trickle : size);
    w.left -= count;
    w.hatched_at = time;
    nest.hatch = 0.6;
    return {
        x: nest.x,
        y: nest.y,
        size: count,
        place: function (enemy, i) {
            brood_nest_place(nest, enemy, i);
        },
    };
}

// A hatched raider's place: at the nest's rim on your side, the i-th a step farther round it, turned to you, in a puff
// of spores
function brood_nest_place(nest, enemy, i)
{
    const a = Math.atan2(player.y - nest.y, player.x - nest.x) + ((i % 2) ? 1 : -1)*Math.ceil(i/2)*0.34;
    const d = nest.r + enemy.r + 6;
    enemy.x = clamp(nest.x + Math.cos(a)*d, 40, world.w - 40);
    enemy.y = clamp(nest.y + Math.sin(a)*d, 40, world.h - 40);
    enemy.angle = a;
    brood_nest_spores(enemy, i);
}

// A raider out of a nest: a ring and a puff in the spores' green, the i-th a moment after the one before
function brood_nest_spores(enemy, i)
{
    ring(enemy.x, enemy.y, brood_nest_colors.spore, 34, 0.35);
    explode(enemy.x, enemy.y, 16, brood_nest_colors.spore, i*0.04, 'spark');
}

// What ends a wave's build-up (arcade_tasks): its nest is burnt, and the burst's front has passed
function brood_nests_crest_due()
{
    const nest = brood_nests.find(v => v.order === arcade.wave);
    return !!nest && (time - nest.burst_at >= brood_nest_brood_delay);
}

// Where the crest comes from (arcade_tasks): the burnt nest's place, its last brood scattered round it, each turned
// away from it as it flies out
function brood_nests_crest_source()
{
    const nest = brood_nests.find(v => v.order === arcade.wave);
    const left = brood_nests_live().length;
    return {
        x: nest.x,
        y: nest.y,
        place: function (enemy, i) {
            const a = Math.random()*Math.PI*2;
            const d = nest.r + brood_nest_scatter[0] + Math.random()*(brood_nest_scatter[1] - brood_nest_scatter[0]);
            enemy.x = clamp(nest.x + Math.cos(a)*d, 40, world.w - 40);
            enemy.y = clamp(nest.y + Math.sin(a)*d, 40, world.h - 40);
            enemy.angle = a;
            brood_nest_spores(enemy, i);
        },
        toast: ['NEST BURNT', left ? `ITS LAST BROOD IS OUT · ${left} ${(left > 1) ? 'NESTS' : 'NEST'} LEFT` : 'ITS LAST BROOD IS OUT · THEN THE FLAGSHIP'],
    };
}

// How far the wave has come to its crest (arcade_tasks): the share of its hull the most burnt nest has lost
function brood_nests_share()
{
    if (brood_nests_burnt() >= arcade.wave) {
        return 1;
    }
    return Math.max(0, ...brood_nests_live().map(v => 1 - v.rock.hp/v.rock.max_hp));
}

// Your shots, missiles and pulse and a blast on a nest (damage_ore): it burns, it is the one that hatches, and nobody
// is away; its hull gone, it bursts
function brood_nest_damage(rock, amount)
{
    const nest = brood_nests.find(v => v.rock === rock);
    if (!nest || (rock.hp <= 0)) {
        return;
    }
    rock.hp -= amount;
    rock.flash = 0.1;
    nest.hurt_at = time;
    brood_nest_wave.away = 0;
    brood_nest_wave.woken = true;
    if (rock.hp <= 0) {
        brood_nest_burst(nest);
    }
}

// The burst: the nest is gone from the map, its blast hurts and shoves what is round it, as a big ship's, it pays its
// score and drops its salvage; the husk stays. Its last brood follows (brood_nests_crest_due).
function brood_nest_burst(nest)
{
    const rock = nest.rock;
    rock.hp = 0;
    nest.rock = null;
    nest.order = brood_nests_burnt();
    nest.burst_at = time;
    blast_add(nest.x, nest.y, brood_nest_blast*1.8, brood_nest_blast_raiders, brood_nest_blast_you*arcade_mode().blast, blast_push(brood_nest_blast), {source: rock, cause: 'nest blast'});
    explode(nest.x, nest.y, brood_nest_blast, brood_nest_colors.spore, 0, 'blast', 14, 0.25);
    burst(nest.x, nest.y, brood_nest_colors.sac, 60, 320);
    ring(nest.x, nest.y, brood_nest_colors.spore, brood_nest_blast*1.8, 0.5);
    hit_stop_start(0.06);
    const points = brood_nest_points*combo;
    score += points;
    label(nest.x, nest.y - 10, `+${points}`, gold);
    for (let i = 0; i < brood_nest_salvage; ++i) {
        drop_pickup(nest.x + rand(-40, 40), nest.y + rand(-40, 40), 'artifact', 4 + Math.floor(wave/5));
    }
}

// The nest the guns turn to (update), or null: the one you point at; else the nearest standing one in view whose rim
// is nearer than `near`, the raider the guns have chosen: a nest is a target as a raider is, the nearer of the two
function brood_nest_target(near)
{
    if (!brood_nests.length) {
        return null;
    }
    const pointed = pointer.active && (time - pointer.last < 2) && !mouse_drive.active && !mouse_drive.following;
    let out = null;
    let best = near;
    for (const nest of brood_nests) {
        const v = nest.rock;
        if (!v || !in_view(v, v.r*0.5)) {
            continue;
        }
        if (pointed && (distance(pointer, v) < v.r)) {
            return v;
        }
        const d = Math.max(0, distance(v, player) - v.r);
        if (d < best) {
            best = d;
            out = v;
        }
    }
    return out;
}

// The nests in view, under the ships: a husk dim and flat, a standing nest in full colour with its dark outline and
// cast shadow, and the bar over it once hit
function brood_nests_render()
{
    for (const nest of brood_nests) {
        if (!in_view(nest, nest.r*1.5 + 20)) {
            continue;
        }
        if (nest.rock) {
            brood_nest_draw(nest);
        }
        else {
            brood_nest_husk_draw(nest);
        }
    }
}

// A standing nest: its shadow, thorns between its lobes, the body breathing (and swelling as it hatches), the brood
// sacs round its mouth, alight while it has the hull for them and burnt out one by one as it burns, and the mouth,
// which glows as it hatches
function brood_nest_draw(nest)
{
    const v = nest.rock;
    const r = nest.r;
    const c = brood_nest_colors;
    const open = clamp(nest.hatch/0.6, 0, 1);
    const swell = 1 + Math.sin(clock*1.7 + nest.phase)*0.025 + open*0.06;
    const share = clamp(v.hp/v.max_hp, 0, 1);
    const lobes = nest.shape.length;
    ctx.save();
    ctx.translate(nest.x, nest.y);
    ctx.fillStyle = '#00000066';
    ctx.beginPath();
    ctx.ellipse(r*0.3, r*0.32, r*1.08, r*0.96, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.rotate(nest.angle);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 3/zoom;
    ctx.fillStyle = c.thorn;
    for (let k = 0; k < lobes; ++k) {
        const a = ((k + 0.5)/lobes)*Math.PI*2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.2)*r*0.8, Math.sin(a - 0.2)*r*0.8);
        ctx.lineTo(Math.cos(a)*r*1.3, Math.sin(a)*r*1.3);
        ctx.lineTo(Math.cos(a + 0.2)*r*0.8, Math.sin(a + 0.2)*r*0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    brood_nest_outline(nest, swell);
    const g = ctx.createRadialGradient(-r*0.28, -r*0.3, r*0.1, 0, 0, r*1.1);
    g.addColorStop(0, c.light);
    g.addColorStop(0.55, c.body);
    g.addColorStop(1, c.dark);
    ctx.fillStyle = (v.flash > 0) ? '#b9e8a8' : g;
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 2/zoom;
    for (let k = 0; k < lobes; ++k) {
        const a = (k/lobes)*Math.PI*2;
        const lit = share > k/lobes;
        const size = r*0.17*(lit ? 1 + Math.sin(clock*3 + k*1.7)*0.1 : 0.85);
        ctx.fillStyle = lit ? c.sac : c.sac_out;
        ctx.beginPath();
        ctx.arc(Math.cos(a)*r*0.58*swell, Math.sin(a)*r*0.58*swell, size, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        if (lit) {
            ctx.fillStyle = c.glow;
            ctx.beginPath();
            ctx.arc(Math.cos(a)*r*0.58*swell - size*0.3, Math.sin(a)*r*0.58*swell - size*0.3, size*0.35, 0, Math.PI*2);
            ctx.fill();
        }
    }
    ctx.fillStyle = c.line;
    ctx.beginPath();
    ctx.arc(0, 0, r*(0.22 + open*0.08), 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = c.glow;
    ctx.globalAlpha = 0.35 + open*0.65;
    ctx.lineWidth = (2 + open*3)/zoom;
    ctx.stroke();
    ctx.restore();
    if (v.hp < v.max_hp) {
        const w = r*1.4;
        ctx.fillStyle = '#0b1222';
        ctx.fillRect(nest.x - w/2, nest.y - r*1.3 - 14, w, 5);
        ctx.fillStyle = gold;
        ctx.fillRect(nest.x - w/2, nest.y - r*1.3 - 14, w*share, 5);
    }
}

// A nest's outline as a path, its lobes scaled (in the nest's own turned frame)
function brood_nest_outline(nest, scale)
{
    const n = nest.shape.length;
    const step = Math.PI*2/n;
    ctx.beginPath();
    for (let k = 0; k <= n; ++k) {
        const a = k*step;
        const r = nest.r*nest.shape[k % n]*scale;
        if (!k) {
            ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
            continue;
        }
        // the dip between two lobes, then on to the next lobe's top
        const dip = nest.r*0.8*scale;
        ctx.quadraticCurveTo(Math.cos(a - step*0.5)*dip, Math.sin(a - step*0.5)*dip, Math.cos(a)*r, Math.sin(a)*r);
    }
    ctx.closePath();
}

// A burnt nest: its shell torn open, flat and dim, with no outline and no shadow, as the background is drawn
function brood_nest_husk_draw(nest)
{
    ctx.save();
    ctx.translate(nest.x, nest.y);
    ctx.rotate(nest.angle);
    ctx.globalAlpha = 0.3;
    brood_nest_outline(nest, 0.94);
    ctx.moveTo(nest.r*0.5, 0);
    ctx.arc(0, 0, nest.r*0.5, 0, Math.PI*2, true);
    ctx.fillStyle = brood_nest_colors.husk;
    ctx.fill('evenodd');
    ctx.restore();
}

// What the card says (arcade_tasks): the nests left with the way to the nearest; its brood out, the raiders left; in
// the breather, the nests left; the flagship's wave is the flagship's
function brood_nests_card()
{
    if ((arcade.wave < 1) || (arcade.wave >= arcade_free_waves)) {
        return null;
    }
    const left = brood_nests_live().length;
    const nest = brood_nest_nearest();
    const eta = (left > 1) ? 'nearest' : 'the last';
    if (arcade.pause > 0) {
        return left ? {title: `Nest burnt: ${left} left to burn`, target: nest, eta} : {title: 'Every nest burnt: the flagship is coming'};
    }
    if (brood_nests_burnt() >= arcade.wave) {
        const raiders = enemies.filter(v => v.hp > 0).length;
        return {title: `Destroy its brood: ${raiders} raider${(raiders === 1) ? '' : 's'}`};
    }
    return {title: (left > 1) ? `Burn the nests: ${left} left` : 'Burn the last nest', target: nest, eta};
}

// What the arrival's banner says (arcade_tasks)
function brood_nests_banner()
{
    return {title: 'Burn the nests', line: `${brood_nests_live().length} nests of the ${worlds[campaign.world].faction} · then its flagship`};
}

// The standing nests on the map and the minimap (arcade_tasks)
function brood_nests_marks(add)
{
    for (const nest of brood_nests_live()) {
        add('danger', nest, 'raider-nest', null, 'NEST');
    }
}

// On the screen's edge (screen px), while no standing nest is in view: the kit's marker toward the nearest with its
// distance, and a small arrow toward each other one the radar sees; none while a jammer blinds (arcade_events.js)
function brood_nests_render_marks()
{
    const live = brood_nests_live();
    if (!live.length || !player || (state !== 'playing') || arcade_event_blind() || live.some(v => in_view(v, 0))) {
        return;
    }
    const nearest = brood_nest_nearest();
    for (const nest of live) {
        if ((nest !== nearest) && !radar_sees(nest)) {
            continue;
        }
        const m = hud_edge_marker(radar_screen(nest), (nest === nearest) ? 40 : 22);
        if (!m.offscreen) {
            continue;
        }
        if (nest === nearest) {
            draw_edge_marker(m, `NEST · ${radar_distance_text(distance(player, nest))}`, brood_nest_colors.mark);
            continue;
        }
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.translate(m.x, m.y);
        ctx.rotate(m.angle);
        ctx.fillStyle = brood_nest_colors.mark;
        ctx.strokeStyle = brood_nest_colors.line;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(-5, -6);
        ctx.lineTo(-5, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}
