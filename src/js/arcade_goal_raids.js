// Goals fought over (arcade_goals.js): while a world goal is open, raiding parties come for the goal itself, each world
// in its own way, and a goal can be lost.
// - Haven: they shoot the tender (a hull of its own); one destroyed is lost.
// - Verdant: they snatch a drifting pod and fly it to the nest; shot down, the carrier drops it.
// - Dustfall: couriers bring warheads to a launcher; armed with enough of them it jumps away, lost.
// - Ion Reach: they shoot a relay not lit yet; burnt out, it is lost. A lit relay is sealed.
// - Obsidian: couriers leave the command post for the arena's edge; when enough get out the relief comes: the post and
//   its emitters jump away and a squadron jumps in.
// - Cryosphere: they shoot the capsules, and one that flies across the tow line cuts it.
// - Nova Forge: they shoot a regulator still running (blown, it is lost), and one in its ring holds its count.
// - Eclipse: a tug latches onto an anchor and drags it toward the hole; at the core it is swallowed, lost.
// A party comes every so often, from the wave's raiders while it has any left, warping in on the far side of the part
// farthest from you. A part under attack shows how whole it is and a red pulse, the card says so, and an edge marker
// points to it in red when it is off the window. A goal ends when each of its parts is done or lost (arcade_goals.js):
// it pays for the share done; nothing done is a goal lost, with no bonus, and the wave goes on until its raiders are
// down. Every part done and none touched is a clean save: 60% more bonus, said in its toast.

// when the first party comes (s after the goal begins, wave 1 and 2), the gap between parties (s), how many in a party
// (wave 1 and 2) and how many raiders of the goal at once, by the mode
const arcade_raid_first = [9, 6];
const arcade_raid_gap = {chill: 26, normal: 17, overload: 13};
const arcade_raid_size = {chill: [1, 2], normal: [2, 3], overload: [3, 3]};
const arcade_raid_alive = 6;
// a party warps in this far from what it comes for, on the side away from you; a raider of the goal turns on you when
// you come this near it
const arcade_raid_from = 800;
const arcade_raid_break = 230;
// the hits a part takes (a missile counts two), by the mode, and each kind's share of that
const arcade_part_hits = {chill: 40, normal: 28, overload: 22};
const arcade_part_size = {escort: 1.2, relays: 1, rescue: 0.6, regulators: 1.2};
// a raider with no gun (CHILL's plasma) boards what it comes for: a hit every this many seconds while it touches it
const arcade_part_board = 1.4;
// a part counts as under attack this long after a hit (s)
const arcade_part_alert = 3;
// couriers: their speed (m/s), the gap between them by the mode (s), the warheads that arm a launcher and the couriers
// out that call the relief, by the mode
const arcade_courier_speed = 115;
const arcade_courier_gap = {chill: 22, normal: 15, overload: 12};
const arcade_courier_need = {chill: 4, normal: 3, overload: 3};
// a launcher's couriers set out this far behind it
const arcade_courier_from = 1500;
// a tug drags its anchor toward the hole this fast (m/s); deeper than this share of the hole's radius it is swallowed
const arcade_tug_drag = 20;
const arcade_tug_core = 0.78;
// a carrier flies a pod to the nest at this share of its speed
const arcade_carrier_pace = 0.8;
// a clean save: this share of the goal's salvage on top
const arcade_goal_clean = 0.6;
const arcade_raid_red = '#ff4d5e';

// The parts of a goal raiders come for, still open, and how: shoot, snatch, tug or courier
function arcade_raid_targets(g)
{
    if (g.kind === 'escort') {
        return g.tenders.filter(v => !v.docked && !v.lost);
    }
    if (g.kind === 'relays') {
        return g.relays.filter(v => !v.lit && !v.lost);
    }
    if (g.kind === 'rescue') {
        return g.capsules.filter(v => !v.saved && !v.lost);
    }
    if (g.kind === 'regulators') {
        return g.regulators.filter(v => !v.shut && !v.lost);
    }
    if (g.kind === 'brood') {
        return g.pods.filter(v => !v.caught && !v.hatched && !v.carrier && (v.wait <= 0));
    }
    if (g.kind === 'anchors') {
        return g.anchors.filter(v => !v.shut && !v.lost && !v.tug);
    }
    if (g.kind === 'breach') {
        return g.launchers.filter(v => (v.hp > 0) && !v.lost);
    }
    return ((g.kind === 'siege') && (g.post.hp > 0)) ? [g.post] : [];
}

function arcade_raid_mode(g)
{
    return {brood: 'snatch', anchors: 'tug', breach: 'courier', siege: 'courier'}[g.kind] || 'shoot';
}

// Called from arcade_goal_start: each part's hull and the goal's raid count
function arcade_raid_setup(g)
{
    g.harm = 0;
    g.raid_timer = arcade_raid_first[Math.min(1, g.wave - 1)];
    g.couriers_out = 0;
    g.relieved = false;
    g.result = null;
    const hits = Math.round((arcade_part_hits[difficulty] || arcade_part_hits.normal)*(arcade_part_size[g.kind] || 1));
    for (const part of [...g.tenders, ...g.relays, ...g.capsules, ...g.regulators]) {
        part.hp = part.max_hp = hits;
        part.hit_at = -99;
        part.lost = false;
    }
    for (const v of [...g.anchors, ...g.launchers]) {
        v.lost = false;
        v.hit_at = -99;
    }
    for (const v of g.launchers) {
        v.warheads = 0;
    }
    for (const v of g.pods) {
        v.carrier = null;
        v.hit_at = -99;
    }
}

// Called from arcade_goal_update while the goal is open: parties come, raiders of the goal do their work
function arcade_raid_update(g, dt)
{
    const raiders = enemies.filter(v => v.goal_raid && (v.hp > 0));
    g.raid_timer -= dt;
    if ((g.raid_timer <= 0) && arcade_raid_targets(g).length) {
        const courier = arcade_raid_mode(g) === 'courier';
        g.raid_timer = (courier ? arcade_courier_gap : arcade_raid_gap)[difficulty] || 17;
        if (raiders.length < arcade_raid_alive) {
            if (courier) {
                arcade_courier_spawn(g);
            }
            else {
                arcade_raid_spawn(g, Math.min(arcade_raid_alive - raiders.length, (arcade_raid_size[difficulty] || arcade_raid_size.normal)[Math.min(1, g.wave - 1)]));
            }
            // a party is the wave's own raiders while it has any left to send
            spawn_left = Math.max(0, spawn_left - (courier ? 1 : (arcade_raid_size[difficulty] || arcade_raid_size.normal)[Math.min(1, g.wave - 1)]));
        }
    }
    for (const v of raiders) {
        if (v.raid.mode === 'courier') {
            arcade_courier_update(g, v);
        }
        else if (v.raid.mode === 'snatch') {
            arcade_snatch_update(g, v);
        }
        else if (v.raid.mode === 'tug') {
            arcade_tug_update(g, v, dt);
        }
        else {
            arcade_board_update(g, v, dt);
        }
    }
    if (g.kind === 'rescue') {
        arcade_tow_cut(g, raiders);
    }
    // what a carrier or a tug held is let go when it dies
    for (const pod of g.pods) {
        if (pod.carrier && (pod.carrier.hp <= 0)) {
            arcade_pod_let_go(pod);
            ring(pod.x, pod.y, arcade_goal_leaf, 70, 0.5);
            label(pod.x, pod.y - 30, 'POD DROPPED', arcade_goal_leaf);
        }
    }
    for (const a of g.anchors) {
        if (a.tug && (a.tug.hp <= 0)) {
            arcade_anchor_let_go(a);
            ring(a.x, a.y, arcade_goal_violet, 80, 0.5);
            label(a.x, a.y - 30, 'TUG DOWN', arcade_goal_violet);
        }
    }
}

// A pod carried: where its carrier flies (arcade_brood_update)
function arcade_pod_carry(pod, dt)
{
    const c = pod.carrier;
    pod.vx = (c.x - pod.x)/Math.max(dt, 0.001);
    pod.vy = (c.y - pod.y)/Math.max(dt, 0.001);
    pod.x = c.x;
    pod.y = c.y;
    // under attack for as long as it is carried
    pod.hit_at = time;
}

// A pod's carrier lets it go: at the nest, shot down, or the pod scooped
function arcade_pod_let_go(pod)
{
    if (pod.carrier && pod.carrier.raid) {
        pod.carrier.raid.pod = null;
        pod.carrier.raid.target = null;
    }
    pod.carrier = null;
}

// A tug lets its anchor go: shot down, or the anchor shut
function arcade_anchor_let_go(a)
{
    if (a.tug && a.tug.raid) {
        a.tug.raid.anchor = null;
        a.tug.raid.target = null;
    }
    a.tug = null;
}

// Whether a raider of the goal is within `r` of a part (a regulator's ring: it holds its count)
function arcade_raid_in_ring(part, r)
{
    for (const v of enemies) {
        if (v.goal_raid && (v.hp > 0) && (distance(v, part) < r)) {
            return true;
        }
    }
    return false;
}

// The bots' way to defend (arcade_goal_pilot): toward the raider of the goal nearest what is under attack, while it is
// farther than the guns reach; null with nothing under attack or the raider close (the bot's own fight then)
function arcade_raid_pilot(g)
{
    const alert = arcade_goal_alert(g);
    if (!alert) {
        return null;
    }
    const raider = alert.target.goal_raid ? alert.target : arcade_goal_nearest_to(alert.target, enemies.filter(v => v.goal_raid && (v.hp > 0)));
    if (!raider || (distance(player, raider) < 300)) {
        return null;
    }
    return arcade_goal_toward(raider, 250);
}

// The goal's end in the play log: its world, wave, kind, result (clean, done, partial or lost) and parts done and lost
function arcade_goal_log(g)
{
    if (!play_log_session) {
        return;
    }
    const t = arcade_goal_tally(g);
    play_log_event('goal', {world: worlds[campaign.world].name, wave: g.wave, kind: g.kind, result: g.result, done: t.done, lost: t.lost, of: t.total});
}

// A party: raiders of the world's mix warping in beside the part they come for, on its side away from you (away from
// the hole, round a black hole)
function arcade_raid_spawn(g, size)
{
    const targets = arcade_raid_targets(g);
    // the part farthest from you: a raid where you are not
    const target = targets.reduce((best, v) => (!best || (distance(v, player) > distance(best, player))) ? v : best, null);
    // round a black hole, from outside it: a party flying across the hole would be pulled into its core
    const from = g.hole || player;
    const away = Math.atan2(target.y - from.y, target.x - from.x) + rand(-0.6, 0.6);
    const cx = clamp(target.x + Math.cos(away)*arcade_raid_from, 200, world.w - 200);
    const cy = clamp(target.y + Math.sin(away)*arcade_raid_from, 200, world.h - 200);
    const mode = arcade_raid_mode(g);
    for (let i = 0; i < size; ++i) {
        const type = (g.wave === 1) ? ((Math.random() < 0.6) ? 'chaser' : 'shooter') : enemy_type();
        const enemy = arcade_squad_warp((type === 'tank') ? 'shooter' : type, cx + (i - (size - 1)/2)*70*Math.sin(away), cy - (i - (size - 1)/2)*70*Math.cos(away), i);
        enemy.goal_raid = true;
        enemy.raid = {mode, target, board: arcade_part_board};
    }
    const said = {
        escort: ['RAIDERS ON THE TENDER', 'Keep them off it'],
        relays: ['RAIDERS AT A RELAY', 'They burn out what is not lit'],
        rescue: ['RAIDERS ON THE CAPSULES', 'They shoot them and cut the tow'],
        regulators: ['RAIDERS AT A REGULATOR', 'They blow it and hold its ring'],
        brood: ['SNATCHERS', 'They carry pods to the nest: shoot them down'],
        anchors: ['TUGS', 'They drag the anchors into the hole'],
    }[g.kind];
    show_toast(said[0], said[1], 2.5, 'danger');
}

// A courier: a raider of the world that ignores you and flies its errand: to a launcher with a warhead (from behind
// it), or out of the command post to the arena's edge
function arcade_courier_spawn(g)
{
    const targets = arcade_raid_targets(g);
    const target = arcade_goal_nearest(targets);
    let from;
    let to;
    if (g.kind === 'breach') {
        const back = Math.atan2(target.y - station.y, target.x - station.x) + rand(-0.7, 0.7);
        from = {x: clamp(target.x + Math.cos(back)*arcade_courier_from, 150, world.w - 150), y: clamp(target.y + Math.sin(back)*arcade_courier_from, 150, world.h - 150)};
        to = target;
    }
    else {
        const away = Math.atan2(target.y - station.y, target.x - station.x) + rand(-0.9, 0.9);
        from = {x: target.x + Math.cos(away)*(target.r + 40), y: target.y + Math.sin(away)*(target.r + 40)};
        to = {x: clamp(target.x + Math.cos(away)*3000, 150, world.w - 150), y: clamp(target.y + Math.sin(away)*3000, 150, world.h - 150)};
    }
    const enemy = arcade_squad_warp('chaser', from.x, from.y, 0);
    enemy.goal_raid = true;
    enemy.unarmed = true;
    enemy.speed = arcade_courier_speed;
    enemy.hp = enemy.max_hp = enemy.max_hp*1.5;
    enemy.raid = {mode: 'courier', target, to};
    show_toast(
        (g.kind === 'breach') ? 'COURIER · A WARHEAD FOR THE LAUNCHER' : 'COURIER · CALLING THE RELIEF',
        (g.kind === 'breach') ? `${arcade_courier_need[difficulty] || 3} arm it: shoot them down` : `${(arcade_courier_need[difficulty] || 3) - g.couriers_out} out and the post is relieved`,
        2.5,
        'danger'
    );
}

// A courier's errand: a launcher armed with enough warheads jumps away; a command post with enough couriers out is
// relieved
function arcade_courier_update(g, v)
{
    const need = arcade_courier_need[difficulty] || 3;
    if (g.kind === 'breach') {
        const launcher = v.raid.target;
        if ((launcher.hp <= 0) || launcher.lost) {
            v.raid.target = v.raid.to = arcade_goal_nearest(arcade_raid_targets(g)) || launcher;
            return;
        }
        if (distance(v, launcher) < launcher.r + v.r + 30) {
            arcade_raid_leave(v);
            launcher.warheads++;
            launcher.hit_at = time;
            g.harm++;
            ring(launcher.x, launcher.y, arcade_raid_red, 120, 0.6);
            if (launcher.warheads >= need) {
                launcher.lost = true;
                arcade_raid_leave(launcher);
                show_toast('LAUNCHER ARMED', 'It jumped away to fire elsewhere', 3, 'danger');
            }
            else {
                show_toast('WARHEAD DELIVERED', `${launcher.warheads}/${need} · the next arms it closer`, 2.5, 'danger');
            }
        }
        return;
    }
    if (distance(v, v.raid.to) < 120) {
        arcade_raid_leave(v);
        g.couriers_out++;
        g.post.hit_at = time;
        g.harm++;
        if (g.couriers_out >= need) {
            g.relieved = true;
            for (const e of [g.post, ...g.emitters]) {
                if (e.hp > 0) {
                    arcade_raid_leave(e);
                }
            }
            show_toast('RELIEF CALLED', 'The post jumped away · a squadron jumps in', 3, 'danger');
            arcade_squad_spawn(3 + Math.min(3, Math.floor(campaign.world/2)));
        }
        else {
            show_toast('COURIER ESCAPED', `${g.couriers_out}/${need} · the relief comes at ${need}`, 2.5, 'danger');
        }
    }
}

// A raider or a goal's part jumps away: gone from the fight, no kill
function arcade_raid_leave(v)
{
    explode(v.x, v.y, 34, '#a8e4ff', 0, 'warp');
    v.hp = 0;
    v.left = true;
    const i = enemies.indexOf(v);
    if (i >= 0) {
        enemies.splice(i, 1);
    }
}

// A snatcher takes the pod it reaches; a carrier at the nest leaves its pod to hatch there (arcade_brood_update)
function arcade_snatch_update(g, v)
{
    if (v.raid.pod) {
        return;
    }
    const pod = v.raid.target;
    if (!pod || pod.caught || pod.hatched || pod.carrier || (pod.wait > 0)) {
        v.raid.target = arcade_goal_nearest_to(v, arcade_raid_targets(g));
        return;
    }
    if (distance(v, pod) < v.r + pod.r + 12) {
        pod.carrier = v;
        pod.hit_at = time;
        v.raid.pod = pod;
        g.harm++;
        ring(pod.x, pod.y, arcade_raid_red, 60, 0.4);
        show_toast('A POD TAKEN', 'Shoot the carrier down to drop it', 2.5, 'danger');
    }
}

// A tug latches onto the anchor it reaches and drags it toward the hole; deep enough, the hole swallows it
function arcade_tug_update(g, v, dt)
{
    const a = v.raid.anchor;
    if (!a) {
        const target = v.raid.target;
        if (!target || target.shut || target.lost || target.tug) {
            v.raid.target = arcade_goal_nearest_to(v, arcade_raid_targets(g));
            return;
        }
        if (distance(v, target) < v.r + target.r + 20) {
            target.tug = v;
            target.hit_at = time;
            v.raid.anchor = target;
            g.harm++;
            ring(target.x, target.y, arcade_raid_red, 70, 0.4);
            show_toast('AN ANCHOR TAKEN IN TOW', 'Shoot the tug before the hole has it', 2.5, 'danger');
        }
        return;
    }
    if (a.shut || a.lost) {
        v.raid.anchor = null;
        v.raid.target = null;
        return;
    }
    // toward the core, or out from the depot where the world has no hole
    const centre = g.hole || station;
    const d = Math.max(1, distance(a, centre));
    const k = g.hole ? -1 : 1;
    a.x += ((a.x - centre.x)/d)*k*arcade_tug_drag*dt;
    a.y += ((a.y - centre.y)/d)*k*arcade_tug_drag*dt;
    a.hit_at = time;
    v.x = a.x + ((a.x - centre.x)/d)*(a.r + v.r + 6);
    v.y = a.y + ((a.y - centre.y)/d)*(a.r + v.r + 6);
    const deep = g.hole ? (d < g.hole.radius*arcade_tug_core) : (d > 1200 + 600);
    if (deep) {
        a.lost = true;
        arcade_anchor_let_go(a);
        ring(a.x, a.y, arcade_goal_violet, 140, 0.8);
        explode(a.x, a.y, 40, arcade_goal_violet);
        show_toast('ANCHOR SWALLOWED', 'The hole has it', 2.5, 'danger');
    }
}

// A raider with no gun sent for a part with a hull boards it: a hit every arcade_part_board seconds while it touches it
function arcade_board_update(g, v, dt)
{
    const part = v.raid.target;
    if (!part || arcade_raid_armed(v) || !arcade_raid_targets(g).includes(part) || (distance(v, part) > v.r + part.r + 14)) {
        return;
    }
    v.raid.board -= dt;
    if (v.raid.board <= 0) {
        v.raid.board = arcade_part_board;
        arcade_part_hurt(g, part, 1);
    }
}

// A raider of the goal crossing your tow line cuts it: the capsule drifts loose again
function arcade_tow_cut(g, raiders)
{
    const c = g.capsules.find(v => v.towed && !v.saved);
    if (!c) {
        return;
    }
    for (const v of raiders) {
        if (segment_distance(v, player, c) < v.r + 6) {
            c.towed = false;
            c.hook = 0;
            c.hit_at = time;
            g.harm++;
            ring(c.x, c.y, arcade_raid_red, 70, 0.5);
            show_toast('TOW CUT', 'Hook the capsule again', 2.5, 'danger');
            return;
        }
    }
}

// Whether a raider's gun fires in the arcade's mode (as guide_base_update_frontier has it)
function arcade_raid_armed(v)
{
    return !v.unarmed && ((v.weapon !== 'plasma') || arcade_mode().armed);
}

// A part hit: its hull drops; with none left it is lost
function arcade_part_hurt(g, part, hits)
{
    if (part.lost || (part.hp <= 0)) {
        return;
    }
    part.hp = Math.max(0, part.hp - hits);
    part.hit_at = time;
    g.harm++;
    if (part.hp > 0) {
        return;
    }
    part.lost = true;
    const said = {escort: ['TENDER DESTROYED', arcade_goal_gold], relays: ['RELAY BURNT OUT', cyan], rescue: ['CAPSULE DESTROYED', arcade_goal_ice], regulators: ['REGULATOR BLOWN', arcade_goal_heat]}[g.kind];
    explode(part.x, part.y, 60, said[1]);
    ring(part.x, part.y, arcade_raid_red, 140, 0.7);
    if (g.kind === 'rescue') {
        part.towed = false;
    }
    show_toast(said[0], arcade_raid_targets(g).length ? 'The rest still count' : 'Nothing left of the goal', 2.5, 'danger');
    // a shot lands after the goal's own update: the goal ends here, so nothing asks for a part that is gone
    if (arcade_goal_ended(g)) {
        arcade_goal_finish(g);
    }
}

// What a raider of the goal flies for (update's prey), null while it fights you as any raider does: within
// arcade_raid_break of you, or with nothing left to come for. Keeps goal_aim, what its shots are fired at.
function arcade_goal_prey(v)
{
    if (!v.goal_raid) {
        return null;
    }
    v.goal_aim = null;
    const g = arcade.goal;
    if (!arcade.active || !g || g.done) {
        v.goal_raid = false;
        v.unarmed = false;
        return null;
    }
    const r = v.raid;
    if (r.mode === 'courier') {
        return r.to;
    }
    if (r.mode === 'snatch') {
        return r.pod ? g.nest : (r.target || null);
    }
    if (r.mode === 'tug') {
        return r.anchor || r.target || null;
    }
    if (!r.target || !arcade_raid_targets(g).includes(r.target)) {
        r.target = arcade_goal_nearest_to(v, arcade_raid_targets(g));
    }
    if (!r.target || (distance(v, player) < arcade_raid_break)) {
        return null;
    }
    v.goal_aim = r.target;
    return r.target;
}

// A raider of the goal's gun: at the part it came for while it does (null: at you)
function arcade_goal_gun_target(v)
{
    return (v.goal_raid && v.goal_aim) || null;
}

// How a raider of the goal moves, after its type has chosen (update): a gunner keeps its range of the part and circles
// it, a raider with no gun closes in to board it, a courier, a snatcher and a tug fly straight; a tug latched holds
// still (arcade_tug_update moves it). Turns the raider (angle) and returns how fast it moves.
function arcade_goal_raid_steer(v, move, prey)
{
    if (!prey) {
        return move;
    }
    const r = v.raid;
    const a = Math.atan2(prey.y - v.y, prey.x - v.x);
    v.angle = a;
    if (r.mode === 'tug') {
        return r.anchor ? 0 : 1;
    }
    if (r.mode === 'snatch') {
        return r.pod ? arcade_carrier_pace : 1.1;
    }
    if (r.mode === 'courier') {
        return 1;
    }
    const d = distance(v, prey);
    const keep = !arcade_raid_armed(v) ? 0 : (v.type === 'shooter') ? 320 : 220;
    if (d > keep + 50) {
        return 1;
    }
    if (d < keep - 50) {
        v.angle = a + Math.PI;
        return 0.5;
    }
    v.angle = a + ((v.phase > Math.PI) ? 1 : -1)*Math.PI/2;
    return 0.45;
}

// A shot fired at a goal's part (goal_target) that reaches it stops there and hurts it; a missile goes off on it.
// True when it did.
function arcade_goal_shot_hit(b)
{
    const g = arcade.goal;
    const part = b.goal_target;
    if (!g || g.done || !arcade_raid_targets(g).includes(part)) {
        return false;
    }
    const contact = hostile_shot_contact(b, part, part.r + b.r + (b.missile ? 10 : 0));
    if (contact < 0) {
        return false;
    }
    b.x = b.px + (b.x - b.px)*contact;
    b.y = b.py + (b.y - b.py)*contact;
    if (b.missile) {
        missile_detonate(b);
    }
    else {
        b.life = 0;
        explode_impact(b.x, b.y, Math.atan2(b.vy, b.vx), 9, hostile_shot_color(b.color || pink), '#aab4bf');
    }
    arcade_part_hurt(g, part, b.missile ? 2 : 1);
    return true;
}

// What a raider's missile flies for: the goal's part it was fired at, while that is open; null: you
function arcade_goal_missile_target(b)
{
    const g = arcade.goal;
    return (b.goal_target && g && !g.done && arcade_raid_targets(g).includes(b.goal_target)) ? b.goal_target : null;
}

function arcade_goal_nearest_to(from, list)
{
    let out = null;
    for (const v of list) {
        if (!out || (distance(v, from) < distance(out, from))) {
            out = v;
        }
    }
    return out;
}

// The part under attack now, the one hit last, or a courier on its way, for the card: {target, label, eta}; null when
// nothing is
function arcade_goal_alert(g)
{
    const courier = enemies.find(v => v.goal_raid && (v.hp > 0) && (v.raid.mode === 'courier'));
    if (courier) {
        return {target: courier, label: 'COURIER', eta: (g.kind === 'breach') ? 'courier: a warhead' : 'courier: the relief'};
    }
    const parts = [...g.tenders, ...g.relays, ...g.capsules, ...g.regulators, ...g.pods, ...g.anchors].filter(v => !v.lost && !v.caught && !v.hatched && !v.docked && !v.lit && !v.saved && !v.shut);
    let hit = null;
    for (const v of parts) {
        if ((time - (v.hit_at ?? -99) < arcade_part_alert) && (!hit || (v.hit_at > hit.hit_at))) {
            hit = v;
        }
    }
    if (!hit) {
        return null;
    }
    const names = {escort: 'TENDER', relays: 'RELAY', rescue: 'CAPSULE', regulators: 'REGULATOR', brood: 'POD', anchors: 'ANCHOR'};
    const name = names[g.kind].toLowerCase();
    const eta = hit.carrier ? 'pod carried off' : hit.tug ? 'anchor in tow' : hit.max_hp ? `${name} hit · ${Math.ceil((hit.hp/hit.max_hp)*100)}%` : `${name} hit`;
    return {target: hit.carrier || hit, label: names[g.kind], eta};
}

// Called from render_arcade_goal: each part's hull as a ring once it is hit, red while under attack; the raiders of the
// goal with a red line to what they came for
function render_arcade_raids(g)
{
    ctx.save();
    for (const part of [...g.tenders, ...g.relays, ...g.capsules, ...g.regulators]) {
        if (part.lost || part.docked || part.lit || part.saved || part.shut || (part.hp >= part.max_hp) || !in_view(part, 200)) {
            continue;
        }
        const k = part.hp/part.max_hp;
        const r = part.r + 14;
        ctx.lineWidth = 5/zoom;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(part.x, part.y, r, 0, Math.PI*2);
        ctx.stroke();
        ctx.strokeStyle = (k > 0.6) ? arcade_goal_green : (k > 0.3) ? arcade_goal_heat : arcade_raid_red;
        ctx.beginPath();
        ctx.arc(part.x, part.y, r, -Math.PI/2, -Math.PI/2 + Math.PI*2*k);
        ctx.stroke();
    }
    // a red pulse round what is under attack
    const alert = arcade_goal_alert(g);
    if (alert && (alert.label !== 'COURIER') && in_view(alert.target, 200)) {
        const t = (time*1.6) % 1;
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = arcade_raid_red;
        ctx.lineWidth = 3/zoom;
        ctx.beginPath();
        ctx.arc(alert.target.x, alert.target.y, (alert.target.r || 20) + 20 + t*40, 0, Math.PI*2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = arcade_raid_red;
    ctx.lineWidth = 1.5/zoom;
    ctx.setLineDash([5/zoom, 7/zoom]);
    ctx.globalAlpha = 0.6;
    for (const v of enemies) {
        if (!v.goal_raid || (v.hp <= 0) || !in_view(v, 900)) {
            continue;
        }
        const to = (v.raid.mode === 'courier') ? v.raid.to : v.raid.pod ? g.nest : v.raid.anchor || v.goal_aim || ((v.raid.mode !== 'shoot') ? v.raid.target : null);
        if (!to) {
            continue;
        }
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    for (const v of enemies) {
        if (v.goal_raid && (v.hp > 0) && (v.raid.mode === 'courier') && in_view(v, 100)) {
            arcade_goal_tag(v.x, v.y - v.r - 22, 'COURIER', arcade_raid_red);
        }
    }
    // a launcher's warheads, a post's couriers out
    for (const l of g.launchers) {
        if ((l.hp > 0) && !l.lost && l.warheads && in_view(l, 200)) {
            arcade_goal_tag(l.x, l.y + l.r + 26, `ARMED ${l.warheads}/${arcade_courier_need[difficulty] || 3}`, arcade_raid_red);
        }
    }
    if ((g.kind === 'siege') && g.couriers_out && (g.post.hp > 0) && in_view(g.post, 200)) {
        arcade_goal_tag(g.post.x, g.post.y + g.post.r + 30, `RELIEF ${g.couriers_out}/${arcade_courier_need[difficulty] || 3}`, arcade_raid_red);
    }
    ctx.restore();
}

// The plate's name for a raider of the goal (target_plate_name), null for another
function arcade_raid_plate_name(v)
{
    if (!v.goal_raid || !v.raid) {
        return null;
    }
    if (v.raid.mode === 'courier') {
        return 'COURIER';
    }
    if (v.raid.pod) {
        return 'POD CARRIER';
    }
    if (v.raid.anchor) {
        return 'TUG';
    }
    return {escort: 'RAIDER · ON THE TENDER', relays: 'RAIDER · ON A RELAY', rescue: 'RAIDER · ON THE CAPSULES', regulators: 'RAIDER · ON A REGULATOR', brood: 'SNATCHER', anchors: 'TUG'}[arcade.goal?.kind] || 'RAIDER';
}
