// World goals in the arcade (notes/gameplay-review-2026-10-15.md): waves 1 and 2 of every world ask for the world's own
// action instead of a count of raiders, and end when it is done: the raiders still about jump away and the goal pays a
// bonus. Wave 1 shows the action on its own, wave 2 asks for more of it under fire; the flagship stays the climax.
// Raiders still come, half as many.
// - Haven, an escort: a tender bound for the depot moves only while you fly beside it, slowly while a raider is on it.
//   Wave 2: two tenders from two sides.
// - Dustfall, a breach: a launcher behind an arc of rock that your guns cannot break and the pulse (or the raiders'
//   missiles) can; break through or fly round its open back. Wave 2: two launchers, then an exit to reach.
// - Verdant, the brood: seed pods ride the current to a nest; fly into one to scoop it up, and one that reaches the
//   nest hatches three chasers. The goal ends when none drift any more; it pays for the share scooped. Wave 2: six
//   pods in two streams.
// - Ion Reach, the storm: relays lit by a full pulse (or an EMP) fired within its reach; the storm beside each charges
//   the pulse fast at the shield's cost, kills and the reactor slowly. Wave 2: two relays.
// - Obsidian, a siege: a command post that no shot harms while its emitters stand, set at its sides and back; break
//   them, then the post. Wave 2: three emitters.
// - Cryosphere, a rescue: capsules drifting on the ice, hooked by flying with one (near it, at its speed) and towed to
//   the depot. Wave 2: two of three. They never leave the map.
// - Nova Forge, the regulators: each stands at a flare's edge and shuts down after 4 s of you inside its ring, the time
//   kept when you leave; the flare's heat decides when to go in. Wave 2: three.
// - Eclipse, the anchors: set round the black hole inside its pull, each shut by flying through its ring. Wave 2:
//   three.

const arcade_goal_kinds = {0: 'escort', 1: 'brood', 2: 'breach', 3: 'relays', 4: 'siege', 5: 'rescue', 6: 'regulators', 7: 'anchors'};
// a goal wave's share of the raiders the wave would have
const arcade_goal_raiders = 0.5;
// the bonus for a goal done: salvage, and score, both more a world
const arcade_goal_salvage = [60, 20];
const arcade_goal_score = [1500, 300];
// a breach: the launcher's distance from the depot, the wall's distance from the launcher, the wall's half arc (rad),
// its rocks' reach and hull (a pulse breaks the rocks it reaches), how near the launcher fires, and the exit
const arcade_breach_far = [1500, 1750];
const arcade_breach_wall = 380;
const arcade_breach_arc = 0.95;
const arcade_breach_rock = 40;
const arcade_breach_rock_hp = 150;
const arcade_breach_reach = 1300;
const arcade_breach_exit = 140;
// a relay stands this far outside its storm's edge, toward the depot
const arcade_relay_gap = 230;
const arcade_relay_r = 34;
// a capsule: its drift speed (m/s), how near and how close in speed you hook it, and how long that takes (s); towed,
// it trails this far behind
const arcade_capsule_speed = [90, 140];
const arcade_capsule_hook = 120;
const arcade_capsule_match = 110;
const arcade_capsule_hold = 0.6;
const arcade_capsule_tow = 80;
const arcade_capsule_r = 18;
// a tender: how far from the depot it sets out (wave 1, wave 2), its speed, how near you keep it moving, and how near a
// raider holds it to a share of its speed
const arcade_tender_far = [1300, 1500];
const arcade_tender_speed = 80;
const arcade_tender_near = 420;
const arcade_tender_raider = 350;
const arcade_tender_held = 0.35;
const arcade_tender_r = 26;
// the brood: the nest's distance from the depot and size; a pod's way in (from this far off the nest), its speed toward
// the nest, the current's share on top, how near you scoop it, and the time between pods of a stream (s)
const arcade_nest_far = 1100;
const arcade_nest_r = 170;
const arcade_pod_from = 2100;
const arcade_pod_speed = 55;
const arcade_pod_flow = 2.5;
const arcade_pod_catch = 70;
const arcade_pod_gap = 5;
const arcade_pod_r = 16;
// a siege: the post's distance from the depot, its emitters' distance from it, how many times a raider's hull each, and
// how near an emitter fires (closer than a launcher: taken one at a time from the flank, the others hold)
const arcade_post_far = 1500;
const arcade_post_ring = 320;
const arcade_post_hull = 3;
const arcade_emitter_hull = 1.2;
const arcade_emitter_reach = 550;
// a regulator: its ring, the time inside to shut it (s), and how far inside its flare's edge it stands
const arcade_regulator_ring = 150;
const arcade_regulator_hold = 4;
const arcade_regulator_inset = 60;
// an anchor: its distance from the hole's centre as a share of the hole's radius (the pull there about 50 m/s, a
// quarter of a slow ship's speed: deeper, a ship that turns back there is dragged to the core), and its ring
const arcade_anchor_at = 1.15;
const arcade_anchor_ring = 90;
const arcade_goal_green = '#7dff8a';
const arcade_goal_ice = '#9fd8ff';
const arcade_goal_gold = '#ffd36b';
const arcade_goal_leaf = '#9be564';
const arcade_goal_heat = '#ff9a3d';
const arcade_goal_violet = '#c49bff';

// Called from arcade_wave_start: the wave's goal in a world that has one (waves before the flagship's), its raiders
// halved; none elsewhere
function arcade_goal_start(n)
{
    arcade.goal = null;
    const kind = arcade_goal_kinds[campaign.world];
    if (!kind || (n >= arcade_waves)) {
        return;
    }
    spawn_left = Math.ceil(spawn_left*arcade_goal_raiders);
    arcade.goal = {
        kind, wave: n, done: false, pay: 1, launchers: [], walls: [], exit: null, relays: [], capsules: [], need: 0,
        saved: 0, tenders: [], pods: [], nest: null, emitters: [], post: null, regulators: [], anchors: [], hole: null,
    };
    const starts = {
        escort: arcade_escort_start, brood: arcade_brood_start, breach: arcade_breach_start, relays: arcade_relays_start,
        siege: arcade_siege_start, rescue: arcade_rescue_start, regulators: arcade_regulators_start, anchors: arcade_anchors_start,
    };
    starts[kind](arcade.goal, n);
    const card = arcade_goal_card();
    show_toast(card.title.toUpperCase(), card.line, 4, 'income');
}

// Whether a goal is open: the wave waits for it, not for its raiders, and the kill combo holds
function arcade_goal_open()
{
    return arcade.active && !!arcade.goal && !arcade.goal.done;
}

// A spot `far` from the depot at `angle`, kept `margin` inside the arena
function arcade_goal_spot(angle, far, margin = 500)
{
    return {
        x: clamp(station.x + Math.cos(angle)*far, margin, world.w - margin),
        y: clamp(station.y + Math.sin(angle)*far, margin, world.h - margin),
    };
}

// One tender in wave 1, two in wave 2 from sides 110° apart; each sets out far from the depot, bound for it
function arcade_escort_start(g, n)
{
    const angle = Math.random()*Math.PI*2;
    for (let i = 0; i < n; ++i) {
        const p = arcade_goal_spot(angle + i*Math.PI*0.62, arcade_tender_far[n - 1] + i*250);
        g.tenders.push({x: p.x, y: p.y, r: arcade_tender_r, angle: Math.atan2(station.y - p.y, station.x - p.x), moving: false, held: false, docked: false});
    }
}

// The nest on one side of the depot, the pods' streams setting out on the far side of it: three pods in one stream in
// wave 1, six in two streams in wave 2, each pod of a stream some seconds after the one before
function arcade_brood_start(g, n)
{
    const angle = Math.random()*Math.PI*2;
    g.nest = {...arcade_goal_spot(angle, arcade_nest_far, 600), r: arcade_nest_r};
    const per = 3;
    for (let i = 0; i < n; ++i) {
        const a = Math.atan2(station.y - g.nest.y, station.x - g.nest.x) + ((n > 1) ? (i - 0.5)*1.1 : 0);
        const from = {x: clamp(g.nest.x + Math.cos(a)*arcade_pod_from, 300, world.w - 300), y: clamp(g.nest.y + Math.sin(a)*arcade_pod_from, 300, world.h - 300)};
        for (let j = 0; j < per; ++j) {
            g.pods.push({x: from.x, y: from.y, r: arcade_pod_r, wait: j*arcade_pod_gap + i*2, caught: false, hatched: false, vx: 0, vy: 0});
        }
    }
    ore_nodes = ore_nodes.filter(v => distance(v, g.nest) > arcade_nest_r + v.r + 60);
    mark_mining_changed();
}

// A command post, anchored, with two emitters at its sides and back in wave 1, three in wave 2; the rocks round it
// cleared, so the beams between them read
function arcade_siege_start(g, n)
{
    const site = arcade_goal_spot(Math.random()*Math.PI*2, arcade_post_far, 700);
    ore_nodes = ore_nodes.filter(v => distance(v, site) > arcade_post_ring + 200);
    mark_mining_changed();
    const facing = Math.atan2(station.y - site.y, station.x - site.x);
    g.post = arcade_goal_anchored('tank', site, arcade_post_hull, 1.7);
    g.post.post = true;
    const count = n + 1;
    for (let i = 0; i < count; ++i) {
        // spread over the half away from the depot: the near side is open, the emitters wait round the flanks
        const a = facing + Math.PI*0.5 + (i/(count - 1))*Math.PI;
        const emitter = arcade_goal_anchored('shooter', {x: site.x + Math.cos(a)*arcade_post_ring, y: site.y + Math.sin(a)*arcade_post_ring}, arcade_emitter_hull, 1.15);
        emitter.emitter = true;
        // plasma, never the world's rail or missiles: an emitter's fire is short and slow, to be outflown
        emitter.weapon = 'plasma';
        g.emitters.push(emitter);
    }
}

// A raider that stands where it is set, turned to you (arcade_role_steer), `hull` times the hull and `size` the size,
// with no armour or shield: what holds a siege is the emitters' screen, not the world's armour, so any gun takes it
function arcade_goal_anchored(type, at, hull, size)
{
    const enemy = spawn_enemy(type);
    enemy.armor = 0;
    enemy.shield = 0;
    enemy.max_shield = 0;
    enemy.x = at.x;
    enemy.y = at.y;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.anchor = true;
    enemy.hp = enemy.max_hp = enemy.max_hp*hull;
    enemy.r = Math.round(enemy.r*size);
    return enemy;
}

// Regulators at the flares' edges nearest the depot, a little inside them: two in wave 1 by the nearest flares, three
// in wave 2 by the next ones, a spot of its own where a world has fewer flares
function arcade_regulators_start(g, n)
{
    const flares = world_zones.filter(v => v.type === 'flare').sort((a, b) => distance(a, station) - distance(b, station));
    const count = n + 1;
    for (let i = 0; i < count; ++i) {
        const z = flares[(i + ((n > 1) ? 1 : 0)) % Math.max(1, flares.length)];
        if (!z || g.regulators.some(v => v.zone === z)) {
            const p = arcade_goal_spot(Math.random()*Math.PI*2, 1400);
            g.regulators.push({x: p.x, y: p.y, r: 30, zone: null, held: 0, shut: false});
            continue;
        }
        const a = Math.atan2(station.y - z.y, station.x - z.x);
        const d = z.r - arcade_regulator_inset;
        g.regulators.push({x: z.x + Math.cos(a)*d, y: z.y + Math.sin(a)*d, r: 30, zone: z, held: 0, shut: false});
    }
    ore_nodes = ore_nodes.filter(v => g.regulators.every(vv => distance(v, vv) > arcade_regulator_ring + v.r + 40));
    mark_mining_changed();
}

// Anchors round the black hole, inside its pull and well clear of its core, on the side facing the arena's middle (the
// hole may stand by an edge, where an anchor would be pushed in toward the core): two in wave 1, three in wave 2; round
// the depot where the world has no hole
function arcade_anchors_start(g, n)
{
    const hole = black_holes[0] || null;
    g.hole = hole;
    const centre = hole || station;
    const d = hole ? hole.radius*arcade_anchor_at : 1200;
    const count = n + 1;
    const facing = hole ? Math.atan2(world.h/2 - hole.y, world.w/2 - hole.x) : Math.random()*Math.PI*2;
    const spread = hole ? ((count > 2) ? 1.3 : 0.8) : Math.PI*(count - 1)/count;
    for (let i = 0; i < count; ++i) {
        const a = facing + (i/(count - 1) - 0.5)*2*spread + rand(-0.15, 0.15);
        g.anchors.push({
            x: clamp(centre.x + Math.cos(a)*d, 300, world.w - 300),
            y: clamp(centre.y + Math.sin(a)*d, 300, world.h - 300),
            r: 24,
            shut: false,
        });
    }
    ore_nodes = ore_nodes.filter(v => g.anchors.every(vv => distance(v, vv) > arcade_anchor_ring + v.r + 40));
    mark_mining_changed();
}

// One launcher in wave 1, two on opposite sides in wave 2; each behind its wall
function arcade_breach_start(g, n)
{
    const angle = Math.random()*Math.PI*2;
    for (let i = 0; i < n; ++i) {
        arcade_breach_site(g, angle + i*(Math.PI*0.9 + rand(0, 0.4)), arcade_breach_far[n - 1]);
    }
}

// A launcher: a gunner of missiles, anchored, three times the hull; an arc of rock in front of it, toward the depot,
// open at its back. The rocks there before are cleared.
function arcade_breach_site(g, angle, far)
{
    const site = arcade_goal_spot(angle, far, 700);
    ore_nodes = ore_nodes.filter(v => distance(v, site) > arcade_breach_wall + 160);
    const facing = Math.atan2(station.y - site.y, station.x - site.x);
    const count = Math.round((arcade_breach_wall*arcade_breach_arc*2)/(arcade_breach_rock*1.6)) + 1;
    for (let i = 0; i < count; ++i) {
        const a = facing + (i/(count - 1) - 0.5)*arcade_breach_arc*2;
        const rock = ore_node_new({
            x: site.x + Math.cos(a)*arcade_breach_wall,
            y: site.y + Math.sin(a)*arcade_breach_wall,
            r: arcade_breach_rock + rand(-4, 6),
            hp: arcade_breach_rock_hp,
            max_hp: arcade_breach_rock_hp,
            type: 'ore',
            field: -1,
            angle: Math.random()*Math.PI*2,
            flash: 0,
        });
        rock.wall = true;
        rock.site = site;
        ore_nodes.push(rock);
        g.walls.push(rock);
    }
    const enemy = spawn_enemy('shooter');
    enemy.x = site.x;
    enemy.y = site.y;
    enemy.weapon = 'missile';
    enemy.anchor = true;
    enemy.launcher = true;
    enemy.hp = enemy.max_hp = enemy.max_hp*3;
    enemy.r = Math.round(enemy.r*1.3);
    g.launchers.push(enemy);
    mark_mining_changed();
}

// A relay beside a storm near the depot, outside its edge toward the depot, the rocks round it cleared: wave 1's by the
// nearest storm, wave 2's by the next two, so the one lit before stays where it was
function arcade_relays_start(g, n)
{
    const storms = world_zones.filter(v => v.type === 'storm').sort((a, b) => distance(a, station) - distance(b, station));
    for (let i = 0; i < n; ++i) {
        const z = storms[i + n - 1];
        if (!z) {
            const p = arcade_goal_spot(Math.random()*Math.PI*2, 1500);
            g.relays.push({x: p.x, y: p.y, r: arcade_relay_r, lit: false});
            continue;
        }
        const a = Math.atan2(station.y - z.y, station.x - z.x);
        g.relays.push({x: z.x + Math.cos(a)*(z.r + arcade_relay_gap), y: z.y + Math.sin(a)*(z.r + arcade_relay_gap), r: arcade_relay_r, lit: false});
    }
    ore_nodes = ore_nodes.filter(v => g.relays.every(vv => distance(v, vv) > 200));
    mark_mining_changed();
}

// One capsule in wave 1, three in wave 2 with two to save; each drifting across the arena 1.3–1.9 km out
function arcade_rescue_start(g, n)
{
    const count = (n === 1) ? 1 : 3;
    g.need = (n === 1) ? 1 : 2;
    const angle = Math.random()*Math.PI*2;
    for (let i = 0; i < count; ++i) {
        const p = arcade_goal_spot(angle + (i*Math.PI*2)/count, rand(1300, 1900));
        const a = rand(0, Math.PI*2);
        const s = rand(arcade_capsule_speed[0], arcade_capsule_speed[1]);
        g.capsules.push({x: p.x, y: p.y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, r: arcade_capsule_r, hook: 0, towed: false, saved: false});
    }
}

// Called from arcade_update while the wave is on: each goal's rule, then done when it is met
function arcade_goal_update(dt)
{
    const g = arcade.goal;
    if (!g || g.done) {
        return;
    }
    if (g.kind === 'breach') {
        arcade_breach_update(g);
    }
    if (g.kind === 'rescue') {
        arcade_rescue_update(g, dt);
    }
    if (g.kind === 'escort') {
        arcade_escort_update(g, dt);
    }
    if (g.kind === 'brood') {
        arcade_brood_update(g, dt);
    }
    if (g.kind === 'regulators') {
        arcade_regulators_update(g, dt);
    }
    if (g.kind === 'anchors') {
        arcade_anchors_update(g);
    }
    if (arcade_goal_met(g)) {
        arcade_goal_finish(g);
    }
}

function arcade_goal_met(g)
{
    if (g.kind === 'breach') {
        return g.launchers.every(v => v.hp <= 0) && (!g.exit || g.exit.reached);
    }
    if (g.kind === 'relays') {
        return g.relays.every(v => v.lit);
    }
    if (g.kind === 'escort') {
        return g.tenders.every(v => v.docked);
    }
    if (g.kind === 'brood') {
        return g.pods.every(v => v.caught || v.hatched);
    }
    if (g.kind === 'siege') {
        return g.post.hp <= 0;
    }
    if (g.kind === 'regulators') {
        return g.regulators.every(v => v.shut);
    }
    if (g.kind === 'anchors') {
        return g.anchors.every(v => v.shut);
    }
    return g.saved >= g.need;
}

// A tender moves toward the depot while you are near it, slowly while a raider is on it; in the depot's reach it docks
function arcade_escort_update(g, dt)
{
    for (const t of g.tenders) {
        if (t.docked) {
            continue;
        }
        t.held = enemies.some(v => (v.hp > 0) && (distance(v, t) < arcade_tender_raider));
        t.moving = distance(player, t) < arcade_tender_near;
        if (t.moving) {
            const d = distance(t, station);
            const step = Math.min(d, arcade_tender_speed*(t.held ? arcade_tender_held : 1)*dt);
            t.angle = Math.atan2(station.y - t.y, station.x - t.x);
            t.x += Math.cos(t.angle)*step;
            t.y += Math.sin(t.angle)*step;
        }
        if (distance(t, station) < station_reach) {
            t.docked = true;
            t.moving = false;
            ring(t.x, t.y, arcade_goal_green, 120, 0.7);
            const left = g.tenders.filter(v => !v.docked).length;
            if (left) {
                show_toast('TENDER DOCKED', `${left} more to bring in`, 2.5, 'income');
            }
        }
    }
}

// Pods set out in turn and drift to the nest, carried by the current; one you fly into is scooped up, one that reaches
// the nest hatches three chasers there. The pay is the share scooped.
function arcade_brood_update(g, dt)
{
    for (const pod of g.pods) {
        if (pod.caught || pod.hatched) {
            continue;
        }
        if (pod.wait > 0) {
            pod.wait -= dt;
            continue;
        }
        const d = Math.max(1, distance(pod, g.nest));
        const flow = world_flow(pod);
        pod.vx = ((g.nest.x - pod.x)/d)*arcade_pod_speed + flow.x*arcade_pod_flow;
        pod.vy = ((g.nest.y - pod.y)/d)*arcade_pod_speed + flow.y*arcade_pod_flow;
        pod.x = clamp(pod.x + pod.vx*dt, 200, world.w - 200);
        pod.y = clamp(pod.y + pod.vy*dt, 200, world.h - 200);
        if (distance(pod, player) < arcade_pod_catch + player.r) {
            pod.caught = true;
            ring(pod.x, pod.y, arcade_goal_leaf, 90, 0.5);
            const left = g.pods.filter(v => !v.caught && !v.hatched).length;
            if (left) {
                show_toast('POD SCOOPED', `${left} still drifting`, 2, 'income');
            }
            continue;
        }
        if (distance(pod, g.nest) < g.nest.r) {
            pod.hatched = true;
            explode(pod.x, pod.y, 50, arcade_goal_leaf);
            for (let i = 0; i < 3; ++i) {
                const enemy = spawn_enemy('chaser');
                enemy.x = pod.x + rand(-60, 60);
                enemy.y = pod.y + rand(-60, 60);
            }
            show_toast('A POD HATCHED', 'Three chasers out of the nest', 2.5, 'danger');
        }
    }
    g.pay = g.pods.filter(v => v.caught).length/g.pods.length;
}

// Whether a command post's emitters still stand: no shot harms it then (damage_enemy)
function arcade_post_shielded(enemy)
{
    const g = arcade.goal;
    return !!enemy.post && !!g && (g.post === enemy) && g.emitters.some(v => v.hp > 0);
}

// A regulator gathers the time you spend in its ring and shuts down when it has enough
function arcade_regulators_update(g, dt)
{
    for (const r of g.regulators) {
        if (r.shut || (distance(player, r) >= arcade_regulator_ring)) {
            continue;
        }
        r.held += dt;
        if (r.held >= arcade_regulator_hold) {
            r.shut = true;
            ring(r.x, r.y, arcade_goal_green, 160, 0.7);
            explode(r.x, r.y, 40, arcade_goal_heat);
            const left = g.regulators.filter(v => !v.shut).length;
            if (left) {
                show_toast('REGULATOR SHUT', `${left} more to shut down`, 2.5, 'income');
            }
        }
    }
}

// An anchor you fly through shuts
function arcade_anchors_update(g)
{
    for (const a of g.anchors) {
        if (!a.shut && (distance(player, a) < arcade_anchor_ring)) {
            a.shut = true;
            ring(a.x, a.y, arcade_goal_violet, 150, 0.7);
            const left = g.anchors.filter(v => !v.shut).length;
            if (left) {
                show_toast('ANCHOR SHUT', `${left} more round the hole`, 2.5, 'income');
            }
        }
    }
}

// The launchers down, wave 2 opens the exit past the last one; flying into it is the breach's end
function arcade_breach_update(g)
{
    if ((g.wave > 1) && !g.exit && g.launchers.every(v => v.hp <= 0)) {
        const last = g.launchers[g.launchers.length - 1];
        const a = Math.atan2(last.y - station.y, last.x - station.x);
        g.exit = {...arcade_goal_spot(a, distance(last, station) + 550, 300), reached: false};
        // nothing solid in the ring: rocks there would hold you off it
        ore_nodes = ore_nodes.filter(v => v.wall || (distance(v, g.exit) > arcade_breach_exit + v.r + 40));
        mark_mining_changed();
        ring(g.exit.x, g.exit.y, arcade_goal_green, arcade_breach_exit*1.6, 0.8);
        show_toast('EXIT OPEN', 'Fly into the green ring', 3, 'income');
    }
    if (g.exit && !g.exit.reached && (distance(player, g.exit) < arcade_breach_exit)) {
        g.exit.reached = true;
    }
}

// Whether a goal's anchored gunner holds its fire: beyond its reach of you (an emitter's is shorter)
function arcade_launcher_holds(v, d)
{
    return v.anchor && (d > (v.emitter ? arcade_emitter_reach : arcade_breach_reach));
}

// A wall rock takes no harm from your guns: the shot stops on it (update's shots against the rocks)
function arcade_wall_shields(rock)
{
    return !!rock.wall;
}

// Called from pulse_update for each wave: a pulse of yours, or an EMP, that reaches a relay lights it
function arcade_goal_pulse(wave)
{
    const g = arcade.goal;
    if (!g || g.done || (g.kind !== 'relays') || !['pulse', 'emp'].includes(wave.kind)) {
        return;
    }
    for (const relay of g.relays) {
        if (!relay.lit && pulse_wave_reaches(wave, relay)) {
            relay.lit = true;
            ring(relay.x, relay.y, cyan, 160, 0.8);
            explode(relay.x, relay.y, 60, cyan);
            const left = g.relays.filter(v => !v.lit).length;
            if (left) {
                show_toast('RELAY LIT', `${left} more to light`, 2.5, 'income');
            }
        }
    }
}

// Capsules drift and bounce off the arena's edge; one you fly with long enough hooks on, and towed into the depot's
// reach it is saved. One at a time on the line.
function arcade_rescue_update(g, dt)
{
    const towing = g.capsules.find(v => v.towed && !v.saved);
    for (const c of g.capsules) {
        if (c.saved) {
            continue;
        }
        if (c.towed) {
            const a = Math.atan2(player.vy, player.vx);
            const speed = Math.hypot(player.vx, player.vy);
            const tx = player.x - ((speed > 20) ? Math.cos(a) : Math.cos(player.angle))*arcade_capsule_tow;
            const ty = player.y - ((speed > 20) ? Math.sin(a) : Math.sin(player.angle))*arcade_capsule_tow;
            c.vx = (tx - c.x)*6;
            c.vy = (ty - c.y)*6;
        }
        c.x += c.vx*dt;
        c.y += c.vy*dt;
        if ((c.x < 200) || (c.x > world.w - 200)) {
            c.vx = -c.vx;
            c.x = clamp(c.x, 200, world.w - 200);
        }
        if ((c.y < 200) || (c.y > world.h - 200)) {
            c.vy = -c.vy;
            c.y = clamp(c.y, 200, world.h - 200);
        }
        if (c.towed) {
            if (distance(c, station) < station_reach) {
                c.saved = true;
                c.towed = false;
                g.saved++;
                ring(c.x, c.y, arcade_goal_green, 120, 0.7);
                if (g.saved < g.need) {
                    show_toast('CAPSULE SAVED', `${g.need - g.saved} more to bring in`, 2.5, 'income');
                }
            }
            continue;
        }
        const close = (distance(c, player) < arcade_capsule_hook) && (Math.hypot(c.vx - player.vx, c.vy - player.vy) < arcade_capsule_match);
        c.hook = (close && !towing) ? c.hook + dt : Math.max(0, c.hook - dt*2);
        if (c.hook >= arcade_capsule_hold) {
            c.towed = true;
            c.hook = 0;
            ring(c.x, c.y, arcade_goal_ice, 70, 0.5);
            show_toast('CAPSULE HOOKED', 'Tow it to the depot', 2.5, 'income');
            return;
        }
    }
}

// The goal met: its bonus, and the raiders still about jump away (the flagship's wave keeps its own)
function arcade_goal_finish(g)
{
    g.done = true;
    const bonus = Math.round((arcade_goal_salvage[0] + arcade_goal_salvage[1]*campaign.world)*g.pay);
    salvage += bonus;
    play_log_earn('goal bonus', bonus);
    score += Math.round((arcade_goal_score[0] + arcade_goal_score[1]*campaign.world)*g.pay);
    show_toast('GOAL DONE', `+${bonus} ◆ · the raiders jump away`, 3, 'income');
    spawn_left = 0;
    for (const enemy of enemies.slice()) {
        if ((enemy.hp > 0) && (enemy.type !== 'boss')) {
            explode(enemy.x, enemy.y, 30, '#a8e4ff', 0, 'warp');
            enemies.splice(enemies.indexOf(enemy), 1);
        }
    }
}

// The goal on the card: its title, a line under it in the toast, where to fly next, and the state in a few words
function arcade_goal_card()
{
    const g = arcade.goal;
    if (g.kind === 'breach') {
        const left = g.launchers.filter(v => v.hp > 0);
        if (left.length) {
            return {
                title: `Destroy ${(left.length > 1) ? `${left.length} launchers` : 'the launcher'}`,
                line: 'Pulse its wall (Space) or fly round',
                target: arcade_goal_nearest(left),
                eta: `${g.launchers.length - left.length}/${g.launchers.length} down`,
                label: 'LAUNCHER',
            };
        }
        return {title: 'Reach the exit', line: 'Fly into the green ring', target: g.exit, eta: 'exit open', label: 'EXIT'};
    }
    if (g.kind === 'relays') {
        const left = g.relays.filter(v => !v.lit);
        return {
            title: `Light ${(left.length > 1) ? `${left.length} relays` : 'the relay'}`,
            line: 'A full pulse or an EMP near it · storms charge the pulse',
            target: arcade_goal_nearest(left),
            eta: `pulse ${Math.floor(player.energy)}%`,
            label: 'RELAY',
        };
    }
    if (g.kind === 'escort') {
        const left = g.tenders.filter(v => !v.docked);
        const t = arcade_goal_nearest(left);
        return {
            title: `Escort ${(left.length > 1) ? `${left.length} tenders` : 'the tender'} to the depot`,
            line: 'It moves while you fly beside it',
            target: t,
            eta: !t.moving ? 'waits for you' : t.held ? 'slowed by raiders' : 'moving',
            label: 'TENDER',
        };
    }
    if (g.kind === 'brood') {
        const left = g.pods.filter(v => !v.caught && !v.hatched);
        const drifting = g.pods.filter(v => !v.caught && !v.hatched && (v.wait <= 0));
        return {
            title: `Scoop ${left.length} pod${(left.length > 1) ? 's' : ''} before the nest`,
            line: 'Fly into a pod · the current carries them',
            target: arcade_goal_nearest(drifting.length ? drifting : left),
            eta: `${g.pods.filter(v => v.caught).length}/${g.pods.length} scooped`,
            label: 'POD',
        };
    }
    if (g.kind === 'siege') {
        const left = g.emitters.filter(v => v.hp > 0);
        return left.length
            ? {title: `Break ${(left.length > 1) ? `${left.length} emitters` : 'the emitter'}`, line: 'They shield the command post · go round', target: arcade_goal_nearest(left), eta: `${g.emitters.length - left.length}/${g.emitters.length} down`, label: 'EMITTER'}
            : {title: 'Destroy the command post', line: 'Its shield is down', target: g.post, eta: 'shield down', label: 'COMMAND'};
    }
    if (g.kind === 'regulators') {
        const left = g.regulators.filter(v => !v.shut);
        const r = arcade_goal_nearest(left);
        return {
            title: `Shut ${(left.length > 1) ? `${left.length} regulators` : 'the regulator'}`,
            line: 'Stay in its ring · mind the flare',
            target: r,
            eta: `${Math.floor((r.held/arcade_regulator_hold)*100)}% shut`,
            label: 'REGULATOR',
        };
    }
    if (g.kind === 'anchors') {
        const left = g.anchors.filter(v => !v.shut);
        return {
            title: `Shut ${(left.length > 1) ? `${left.length} anchors` : 'the anchor'}`,
            line: 'Fly through its ring · the hole pulls',
            target: arcade_goal_nearest(left),
            eta: `${g.anchors.length - left.length}/${g.anchors.length} shut`,
            label: 'ANCHOR',
        };
    }
    const towed = g.capsules.find(v => v.towed);
    const free = g.capsules.filter(v => !v.saved && !v.towed);
    return {
        title: towed ? 'Tow the capsule to the depot' : `Rescue ${g.need - g.saved} capsule${((g.need - g.saved) > 1) ? 's' : ''}`,
        line: 'Fly at its speed to hook it',
        target: towed ? station : arcade_goal_nearest(free),
        eta: `${g.saved}/${g.need} saved`,
        label: towed ? 'DEPOT' : 'CAPSULE',
    };
}

function arcade_goal_nearest(list)
{
    let out = null;
    for (const v of list) {
        if (!out || (distance(v, player) < distance(out, player))) {
            out = v;
        }
    }
    return out;
}

// The goal in the world (the camera's units): the wall's rocks ringed by how whole they are, the launchers named, the
// exit; the relays, and the pulse's reach round you when it is full; the capsules with the way they drift, the hook
// filling, the line to the one towed and the depot's ring
function render_arcade_goal()
{
    const g = arcade.active && arcade.goal;
    if (!g || g.done) {
        return;
    }
    ctx.save();
    ctx.lineWidth = 2/zoom;
    if (g.kind === 'breach') {
        ctx.setLineDash([6/zoom, 5/zoom]);
        for (const rock of g.walls) {
            if ((rock.hp <= 0) || !in_view(rock, rock.r + 20)) {
                continue;
            }
            const k = rock.hp/rock.max_hp;
            ctx.strokeStyle = (k > 0.5) ? '#ff9a3d' : '#ff4d5e';
            ctx.beginPath();
            ctx.arc(rock.x, rock.y, rock.r + 8, -Math.PI/2, -Math.PI/2 + Math.PI*2*k);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        // named here unless the nearest threat's plate names it already (render_target_brackets)
        const named = hud_threat();
        for (const v of g.launchers) {
            if ((v.hp > 0) && (v !== named) && in_view(v, 200)) {
                arcade_goal_tag(v.x, v.y - v.r - 26, 'LAUNCHER', '#ff4d5e');
            }
        }
        if (g.exit && in_view(g.exit, 300)) {
            const beat = 1 + Math.sin(clock*5)*0.05;
            ctx.strokeStyle = arcade_goal_green;
            ctx.lineWidth = 4/zoom;
            ctx.setLineDash([14/zoom, 10/zoom]);
            ctx.beginPath();
            ctx.arc(g.exit.x, g.exit.y, arcade_breach_exit*beat, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
            arcade_goal_tag(g.exit.x, g.exit.y, 'EXIT', arcade_goal_green);
        }
    }
    if (g.kind === 'relays') {
        const reach = 480 + upgrades.pulse*80;
        if ((player.energy >= 100) && g.relays.some(v => !v.lit && (distance(v, player) < reach*2))) {
            ctx.strokeStyle = '#ff5baf88';
            ctx.setLineDash([10/zoom, 8/zoom]);
            ctx.beginPath();
            ctx.arc(player.x, player.y, reach, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        for (const relay of g.relays) {
            if (!in_view(relay, 200)) {
                continue;
            }
            ctx.fillStyle = relay.lit ? cyan : '#1b2633';
            ctx.strokeStyle = cyan;
            ctx.lineWidth = 3/zoom;
            ctx.beginPath();
            ctx.arc(relay.x, relay.y, relay.r, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            for (let i = 0; i < 4; ++i) {
                const a = clock*(relay.lit ? 2 : 0.4) + (i*Math.PI)/2;
                ctx.moveTo(relay.x + Math.cos(a)*relay.r, relay.y + Math.sin(a)*relay.r);
                ctx.lineTo(relay.x + Math.cos(a)*(relay.r + 16), relay.y + Math.sin(a)*(relay.r + 16));
            }
            ctx.stroke();
            arcade_goal_tag(relay.x, relay.y - relay.r - 30, relay.lit ? 'RELAY LIT' : 'RELAY · PULSE', cyan);
        }
    }
    if (g.kind === 'rescue') {
        const towed = g.capsules.find(v => v.towed);
        if (towed) {
            ctx.strokeStyle = arcade_goal_ice;
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(towed.x, towed.y);
            ctx.stroke();
            ctx.strokeStyle = arcade_goal_green;
            ctx.setLineDash([14/zoom, 10/zoom]);
            ctx.beginPath();
            ctx.arc(station.x, station.y, station_reach, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        for (const c of g.capsules) {
            if (c.saved || !in_view(c, 400)) {
                continue;
            }
            if (!c.towed) {
                // where it drifts in the next 3 s
                ctx.fillStyle = arcade_goal_ice;
                for (let i = 1; i <= 6; ++i) {
                    ctx.globalAlpha = 0.6 - i*0.08;
                    ctx.beginPath();
                    ctx.arc(c.x + c.vx*i*0.5, c.y + c.vy*i*0.5, 3/zoom, 0, Math.PI*2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }
            // a pod: a pale hull, a dark window, a beacon that blinks
            ctx.fillStyle = arcade_goal_ice;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2/zoom;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#16364d';
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r*0.45, 0, Math.PI*2);
            ctx.fill();
            if ((clock % 1) < 0.5) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(c.x, c.y - c.r - 4/zoom, 3/zoom, 0, Math.PI*2);
                ctx.fill();
            }
            if (c.hook > 0) {
                ctx.strokeStyle = arcade_goal_green;
                ctx.lineWidth = 4/zoom;
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.r + 10, -Math.PI/2, -Math.PI/2 + Math.PI*2*Math.min(1, c.hook/arcade_capsule_hold));
                ctx.stroke();
            }
            if (!c.towed) {
                arcade_goal_tag(c.x, c.y - c.r - 22, 'CAPSULE', arcade_goal_ice);
            }
        }
    }
    if (g.kind === 'escort') {
        render_arcade_escort(g);
    }
    if (g.kind === 'brood') {
        render_arcade_brood(g);
    }
    if (g.kind === 'siege') {
        render_arcade_siege(g);
    }
    if (g.kind === 'regulators') {
        render_arcade_regulators(g);
    }
    if (g.kind === 'anchors') {
        render_arcade_anchors(g);
    }
    ctx.restore();
}

// A tender: its lane to the depot dashed, the ring you keep it moving in (green while it moves), a freighter's hull
function render_arcade_escort(g)
{
    for (const t of g.tenders) {
        if (t.docked) {
            continue;
        }
        ctx.strokeStyle = arcade_goal_gold;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 2/zoom;
        ctx.setLineDash([12/zoom, 10/zoom]);
        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        ctx.lineTo(station.x, station.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (!in_view(t, arcade_tender_near + 40)) {
            ctx.setLineDash([]);
            continue;
        }
        ctx.strokeStyle = !t.moving ? '#8aa0b8' : t.held ? '#ff4d5e' : arcade_goal_green;
        ctx.beginPath();
        ctx.arc(t.x, t.y, arcade_tender_near, 0, Math.PI*2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.angle);
        ctx.fillStyle = '#d9c38a';
        ctx.strokeStyle = '#fff3cf';
        ctx.lineWidth = 2/zoom;
        ctx.beginPath();
        ctx.roundRect(-t.r*1.4, -t.r*0.6, t.r*2.8, t.r*1.2, t.r*0.4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#5a4a2a';
        for (let i = -1; i <= 1; ++i) {
            ctx.fillRect(i*t.r*0.8 - t.r*0.3, -t.r*0.35, t.r*0.6, t.r*0.7);
        }
        if (t.moving) {
            ctx.fillStyle = '#90c9ff';
            ctx.beginPath();
            ctx.moveTo(-t.r*1.4, -t.r*0.3);
            ctx.lineTo(-t.r*(2 + Math.random()*0.4), 0);
            ctx.lineTo(-t.r*1.4, t.r*0.3);
            ctx.fill();
        }
        ctx.restore();
        arcade_goal_tag(t.x, t.y - t.r - 26, !t.moving ? 'TENDER · COME CLOSE' : t.held ? 'TENDER · RAIDERS ON IT' : 'TENDER', arcade_goal_gold);
    }
}

// The nest a dashed ring; each pod drifting, with dots where it goes in the next seconds
function render_arcade_brood(g)
{
    if (in_view(g.nest, g.nest.r + 40)) {
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 3/zoom;
        ctx.setLineDash([14/zoom, 10/zoom]);
        ctx.beginPath();
        ctx.arc(g.nest.x, g.nest.y, g.nest.r*(1 + Math.sin(clock*3)*0.03), 0, Math.PI*2);
        ctx.stroke();
        ctx.setLineDash([]);
        arcade_goal_tag(g.nest.x, g.nest.y, 'NEST', '#ff6b6b');
    }
    for (const pod of g.pods) {
        if (pod.caught || pod.hatched || (pod.wait > 0) || !in_view(pod, 300)) {
            continue;
        }
        ctx.fillStyle = arcade_goal_leaf;
        for (let i = 1; i <= 6; ++i) {
            ctx.globalAlpha = 0.6 - i*0.08;
            ctx.beginPath();
            ctx.arc(pod.x + pod.vx*i*0.6, pod.y + pod.vy*i*0.6, 3/zoom, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        const a = Math.atan2(pod.vy, pod.vx);
        ctx.strokeStyle = '#e6ffd0';
        ctx.lineWidth = 2/zoom;
        ctx.beginPath();
        ctx.ellipse(pod.x, pod.y, pod.r*1.3, pod.r, a, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#2d4a1c';
        ctx.beginPath();
        ctx.arc(pod.x, pod.y, pod.r*0.4 + Math.sin(clock*6 + pod.x)*1.5, 0, Math.PI*2);
        ctx.fill();
        arcade_goal_tag(pod.x, pod.y - pod.r - 20, 'POD', arcade_goal_leaf);
    }
}

// The emitters' beams to the post and the post's shield while any stands; each named
function render_arcade_siege(g)
{
    const post = g.post;
    if ((post.hp <= 0) || !in_view(post, arcade_post_ring + 120)) {
        return;
    }
    const shielded = arcade_post_shielded(post);
    ctx.strokeStyle = cyan;
    ctx.lineWidth = 3/zoom;
    ctx.setLineDash([10/zoom, 8/zoom]);
    ctx.lineDashOffset = -clock*40/zoom;
    for (const e of g.emitters) {
        if (e.hp > 0) {
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(post.x, post.y);
            ctx.stroke();
        }
    }
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
    if (shielded) {
        ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
        ctx.beginPath();
        ctx.arc(post.x, post.y, post.r + 26, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
    }
    const named = hud_threat();
    for (const e of g.emitters) {
        if ((e.hp > 0) && (e !== named)) {
            arcade_goal_tag(e.x, e.y - e.r - 24, 'EMITTER', cyan);
        }
    }
    if (post !== named) {
        arcade_goal_tag(post.x, post.y - post.r - 36, shielded ? 'COMMAND · SHIELDED' : 'COMMAND', shielded ? cyan : '#ff4d5e');
    }
}

// A regulator: its ring dashed (green while you are in it), the time gathered as an arc, the machine glowing
function render_arcade_regulators(g)
{
    for (const r of g.regulators) {
        if (!in_view(r, arcade_regulator_ring + 40)) {
            continue;
        }
        const inside = !r.shut && (distance(player, r) < arcade_regulator_ring);
        if (!r.shut) {
            ctx.strokeStyle = inside ? arcade_goal_green : arcade_goal_heat;
            ctx.lineWidth = 2/zoom;
            ctx.setLineDash([12/zoom, 9/zoom]);
            ctx.beginPath();
            ctx.arc(r.x, r.y, arcade_regulator_ring, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
            if (r.held > 0) {
                ctx.strokeStyle = arcade_goal_green;
                ctx.lineWidth = 6/zoom;
                ctx.beginPath();
                ctx.arc(r.x, r.y, arcade_regulator_ring, -Math.PI/2, -Math.PI/2 + Math.PI*2*(r.held/arcade_regulator_hold));
                ctx.stroke();
            }
        }
        ctx.fillStyle = r.shut ? '#3a3a40' : arcade_goal_heat;
        ctx.strokeStyle = r.shut ? '#8a8a90' : '#ffe0b0';
        ctx.lineWidth = 2/zoom;
        ctx.beginPath();
        for (let i = 0; i < 6; ++i) {
            const a = (i*Math.PI)/3 + (r.shut ? 0 : clock*0.8);
            ctx.lineTo(r.x + Math.cos(a)*r.r, r.y + Math.sin(a)*r.r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        arcade_goal_tag(r.x, r.y - r.r - 24, r.shut ? 'REGULATOR SHUT' : 'REGULATOR', r.shut ? '#8a8a90' : arcade_goal_heat);
    }
}

// The anchors: a tether to the hole from each one still holding, its ring, a pylon
function render_arcade_anchors(g)
{
    for (const a of g.anchors) {
        if (!in_view(a, arcade_anchor_ring + 600)) {
            continue;
        }
        if (!a.shut && g.hole) {
            ctx.strokeStyle = arcade_goal_violet;
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 2/zoom;
            ctx.setLineDash([4/zoom, 8/zoom]);
            ctx.lineDashOffset = clock*30/zoom;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(g.hole.x, g.hole.y);
            ctx.stroke();
            ctx.lineDashOffset = 0;
            ctx.globalAlpha = 1;
        }
        if (!a.shut) {
            ctx.strokeStyle = arcade_goal_violet;
            ctx.lineWidth = 3/zoom;
            ctx.setLineDash([12/zoom, 9/zoom]);
            ctx.beginPath();
            ctx.arc(a.x, a.y, arcade_anchor_ring*(1 + Math.sin(clock*4)*0.04), 0, Math.PI*2);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.fillStyle = a.shut ? '#3a3448' : arcade_goal_violet;
        ctx.strokeStyle = '#efe4ff';
        ctx.lineWidth = 2/zoom;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y - a.r);
        ctx.lineTo(a.x + a.r*0.7, a.y);
        ctx.lineTo(a.x, a.y + a.r);
        ctx.lineTo(a.x - a.r*0.7, a.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        arcade_goal_tag(a.x, a.y - a.r - 22, a.shut ? 'ANCHOR SHUT' : 'ANCHOR', arcade_goal_violet);
    }
}

// A word over a goal's thing (the camera's units), as big on the screen at any zoom
function arcade_goal_tag(x, y, text, color)
{
    ctx.font = `700 ${12/zoom}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(4, 8, 15, 0.7)';
    const w = ctx.measureText(text).width + 12/zoom;
    ctx.fillRect(x - w/2, y - 9/zoom, w, 18/zoom);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y + 1/zoom);
}

// The goal's next place off the window: the kit's edge marker with its name and distance (screen px)
function render_arcade_goal_marker()
{
    if (!arcade_goal_open() || (state !== 'playing')) {
        return;
    }
    const card = arcade_goal_card();
    if (!card.target || in_view(card.target, 0)) {
        return;
    }
    const m = hud_edge_marker(radar_screen(card.target), 40);
    if (m.offscreen) {
        const colors = {RELAY: cyan, EMITTER: cyan, CAPSULE: arcade_goal_ice, POD: arcade_goal_leaf, REGULATOR: arcade_goal_heat, ANCHOR: arcade_goal_violet};
        draw_edge_marker(m, `${card.label} · ${radar_distance_text(distance(player, card.target))}`, colors[card.label] || gold);
    }
}

// How a pilot does the goal now, for the bots (bin/playtest, the captain's autopilot): the velocity to fly at (m/s),
// whether to fire the pulse, and whether to keep to it with raiders near (firm); null with no goal open. A breach goes
// round the wall's open back to the launcher, then to the exit; the storm's relays charge the pulse in the storm (or
// wait for kills) and fire it within reach; a rescue flies at the capsule's speed onto it, then tows it home. An
// escort keeps beside the tender; the brood is met on its way; a siege goes for the emitters, then the post; a
// regulator is held from inside its ring; an anchor is flown through, round the hole's core.
function arcade_goal_pilot()
{
    if (!arcade_goal_open()) {
        return null;
    }
    const g = arcade.goal;
    if (g.kind === 'breach') {
        const left = g.launchers.filter(v => v.hp > 0);
        if (!left.length) {
            return g.exit ? arcade_goal_toward(arcade_goal_way(g.exit)) : null;
        }
        const l = arcade_goal_nearest(left);
        const way = arcade_goal_way(l);
        return (way === l) ? arcade_goal_toward(l, 220) : arcade_goal_toward(way);
    }
    if (g.kind === 'relays') {
        const relay = arcade_goal_nearest(g.relays.filter(v => !v.lit));
        if (player.energy < 100) {
            const storm = arcade_goal_nearest(world_zones.filter(v => v.type === 'storm'));
            return storm ? arcade_goal_toward(storm, 120) : arcade_goal_toward(relay, 200);
        }
        const plan = arcade_goal_toward(relay, 150);
        plan.pulse = distance(player, relay) < 300;
        return plan;
    }
    if (g.kind === 'escort') {
        const t = arcade_goal_nearest(g.tenders.filter(v => !v.docked));
        const plan = arcade_goal_toward(t, 160);
        plan.firm = distance(player, t) > arcade_tender_near*0.8;
        return plan;
    }
    if (g.kind === 'brood') {
        const pod = arcade_goal_nearest(g.pods.filter(v => !v.caught && !v.hatched && (v.wait <= 0)));
        if (!pod) {
            return arcade_goal_toward(arcade_goal_nearest(g.pods.filter(v => !v.caught && !v.hatched)), 200);
        }
        return arcade_goal_toward(pod, 0);
    }
    if (g.kind === 'siege') {
        const left = g.emitters.filter(v => v.hp > 0);
        return arcade_goal_toward(left.length ? arcade_goal_nearest(left) : g.post, 260);
    }
    if (g.kind === 'regulators') {
        const r = arcade_goal_nearest(g.regulators.filter(v => !v.shut));
        const plan = arcade_goal_toward(r, 40);
        plan.firm = distance(player, r) < arcade_regulator_ring*2;
        return plan;
    }
    if (g.kind === 'anchors') {
        // through the ring at speed, never slowing where the hole pulls, and leaning out against the pull
        const a = arcade_goal_nearest(g.anchors.filter(v => !v.shut));
        const plan = arcade_goal_toward(arcade_goal_round_hole(g.hole, a), 0, 300);
        if (g.hole) {
            const d = Math.max(1, distance(player, g.hole));
            const away = {x: (player.x - g.hole.x)/d, y: (player.y - g.hole.y)/d};
            // deeper than the anchors: straight out first
            if (d < g.hole.radius*(arcade_anchor_at - 0.1)) {
                plan.vx = away.x*340;
                plan.vy = away.y*340;
            }
            const pull = gravity_pull(g.hole, d)*1.5;
            plan.vx += away.x*pull;
            plan.vy += away.y*pull;
        }
        // kept to with raiders near: a pilot turned aside by a fight in the pull is the one dragged in
        plan.firm = true;
        return plan;
    }
    const towed = g.capsules.find(v => v.towed);
    if (towed) {
        const plan = arcade_goal_toward(station);
        plan.firm = true;
        return plan;
    }
    const c = arcade_goal_nearest(g.capsules.filter(v => !v.saved));
    // the capsule's way, and a pull onto it that eases as you come close, so you arrive at its speed
    const plan = arcade_goal_toward(c, 0, Math.min(260, distance(player, c)*0.9));
    plan.vx += c.vx;
    plan.vy += c.vy;
    return plan;
}

// The way to `p` past the breaches' walls (every wave's, standing still): `p` itself, or, when a wall rock stands on
// the straight line, the end of that wall's arc (out past its last rock) that makes the shorter way round; from inside
// a wall's cup, out through its open back first
function arcade_goal_way(p)
{
    // the first rock on the line, the nearest to you
    let block = null;
    for (const v of ore_nodes) {
        if (v.wall && (v.hp > 0) && (segment_distance(v, player, p) < v.r + 50) && (!block || (distance(v, player) < distance(block, player)))) {
            block = v;
        }
    }
    if (!block) {
        return p;
    }
    const s = block.site;
    const facing = Math.atan2(station.y - s.y, station.x - s.x);
    if (distance(player, s) < arcade_breach_wall + 20) {
        return {x: s.x - Math.cos(facing)*(arcade_breach_wall + 160), y: s.y - Math.sin(facing)*(arcade_breach_wall + 160)};
    }
    let out = null;
    for (const side of [-1, 1]) {
        const a = facing + side*(arcade_breach_arc + 0.7);
        const end = {x: s.x + Math.cos(a)*(arcade_breach_wall + 240), y: s.y + Math.sin(a)*(arcade_breach_wall + 240)};
        if (!out || ((distance(player, end) + distance(end, p)) < (distance(player, out) + distance(out, p)))) {
            out = end;
        }
    }
    return out;
}

// The way to `p` past a black hole: `p` itself, or a point out on the hole's side, the side you are on, when the
// straight line runs inside the anchors' ring; with `p` nearly across the hole, the way round chosen last is kept, so
// the pilot does not turn back and forth
let arcade_goal_round_side = 1;
function arcade_goal_round_hole(hole, p)
{
    const keep = hole ? hole.radius*(arcade_anchor_at - 0.05) : 0;
    if (!hole || (segment_distance(hole, player, p) > keep)) {
        return p;
    }
    const a = Math.atan2(player.y - hole.y, player.x - hole.x);
    const b = Math.atan2(p.y - hole.y, p.x - hole.x);
    const turn = Math.atan2(Math.sin(b - a), Math.cos(b - a));
    if (Math.abs(turn) < 2.6) {
        arcade_goal_round_side = Math.sign(turn) || 1;
    }
    const step = a + arcade_goal_round_side*Math.min(Math.abs(turn), 0.7);
    const d = hole.radius*(arcade_anchor_at + 0.3);
    return {x: clamp(hole.x + Math.cos(step)*d, 250, world.w - 250), y: clamp(hole.y + Math.sin(step)*d, 250, world.h - 250)};
}

// The velocity for flying at `p`: `speed` along the way to it (by default 340, easing within 300 m), nothing within `stop`
function arcade_goal_toward(p, stop = 60, speed = null)
{
    const d = distance(player, p);
    if (d <= stop) {
        return {vx: 0, vy: 0, pulse: false};
    }
    const s = speed ?? Math.min(340, (d - stop)*1.2 + 40);
    return {vx: ((p.x - player.x)/d)*s, vy: ((p.y - player.y)/d)*s, pulse: false};
}
