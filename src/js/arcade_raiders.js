// Arcade raiders with jobs: five kinds, each asking a different move of you, met one a step of the run from Haven to Obsidian and
// mixed into the squadrons (raider_squad_after). An INTERCEPTOR bursts faster than you cruise: turbo away or shoot it
// down. A BULWARK turns a shield on its front to you that stops your shots: fly round to its back. A CARRIER stands off
// and launches drones, tied to it by a thin line; they fall with it. A SNIPER fires from 700 m after a charge its red
// line shows: close in, or put a rock between. A MINE-LAYER seals the lane ahead of you with mines: not that way, or a
// pulse through them. Each shows its move before it makes it. The campaign never meets them: only the arcade's
// squadrons bring them, and its raiders keep their ways.
//
// A kind (its name on the plate is in target_names): the run's step it opens at (arcade_level: Haven 0 .. Eclipse 7,
// whichever world the route flies there; a drone comes only from a carrier), hull and speed as a + b × the fight's
// threat level (threat_wave, the step's, as the world's raiders have), the hit radius, the score, the blast of
// its death (size, damage: arcade_blast_from_kill), the salvage it drops besides a raider's, how many at most at once
// (`rail`: in a world of rail guns) and the toast the run's first one brings.
const raider_kinds = {
    interceptor: {world: 0, hull: [20, 6], r: 12, speed: [95, 5], points: 120, blast: [38, 8], salvage: 0, cap: 4, rail: 3, title: 'INTERCEPTOR', line: 'IT BURSTS FASTER THAN YOU CRUISE · TURBO AWAY OR SHOOT IT DOWN'},
    carrier: {world: 1, hull: [120, 18], r: 27, speed: [42, 1], points: 200, blast: [70, 22], salvage: 2, cap: 1, rail: 1, title: 'CARRIER', line: 'IT LAUNCHES DRONES · KILL IT FIRST AND THEY FALL'},
    bulwark: {world: 2, hull: [100, 16], r: 24, speed: [46, 2], points: 160, blast: [66, 20], salvage: 1, cap: 2, rail: 1, title: 'BULWARK', line: 'ITS FRONT SHIELD STOPS YOUR SHOTS · FLY ROUND TO ITS BACK'},
    sniper: {world: 3, hull: [30, 7], r: 15, speed: [75, 2], points: 140, blast: [44, 10], salvage: 1, cap: 2, rail: 1, title: 'SNIPER', line: 'A RED LINE BEFORE ITS SHOT · CLOSE IN OR PUT A ROCK BETWEEN'},
    minelayer: {world: 4, hull: [45, 9], r: 18, speed: [100, 3], points: 120, blast: [50, 12], salvage: 1, cap: 2, rail: 1, title: 'MINE-LAYER', line: 'IT SEALS THE LANE AHEAD WITH MINES · NOT THAT WAY · A PULSE CLEARS THEM'},
    drone: {world: 99, hull: [8, 2], r: 7, speed: [170, 4], points: 20, blast: [18, 3], salvage: 0, cap: 99, rail: 99, title: '', line: ''},
};
// The share of squadrons that bring one (or, from step 5 on, up to two in a squadron of six or more), by the run's
// step; CHILL brings 60% as many. A kind opens at its step from wave 2 (wave 1 is the scouts), at later steps from
// wave 1, and at its own step it comes twice as often as the others.
const raider_job_share = [0.4, 0.5, 0.55, 0.6, 0.5, 0.65, 0.7, 0.55];
const raider_job_most = [1, 1, 1, 1, 1, 2, 2, 2];
const raider_job_chill = 0.6;
// An interceptor: how long it winds up (its engines flare, an arrow shows its way), bursts and coasts after; its burst
// is this many times your cruise (CHILL less), never more than this share of your turbo, so turbo always gets away;
// it turns this slowly in a burst, so a turn of yours makes it overshoot
const interceptor_wind = 0.45;
const interceptor_burst = 1.1;
const interceptor_coast = 0.7;
const interceptor_pace = {chill: 1.15, normal: 1.3, overload: 1.4};
const interceptor_turbo_share = 0.6;
const interceptor_burst_turn = 0.9;
// A bulwark's shield: how far round its front it reaches each way (radians), how far out of its hull, and how fast the
// bulwark turns it to you (CHILL slower); you fly round faster than that from 300 m
const bulwark_arc = 1.1;
const bulwark_shield_gap = 14;
const bulwark_turn = {chill: 0.55, normal: 0.75, overload: 0.85};
// A carrier: the range it keeps, its drones at most (CHILL one fewer), two a launch, after a glow of its bays, and the
// time between launches
const carrier_range = [520, 720];
const carrier_drones = 4;
const carrier_bay = 1;
const carrier_gap = {chill: 9, normal: 7, overload: 6};
// A drone: the ring it keeps round you, a dart in every few seconds, what its ram does (it pops on it), and the gap
// between drones falling when their carrier dies
const drone_orbit = 110;
const drone_ram = 9;
const drone_fall_gap = 0.12;
// A sniper: the range it keeps, its charge (CHILL longer, a rail world longer again), the last part of it with its aim
// locked, the time between shots, and its slug's damage before the world's growth (raider_hit_scale) and the mode's hits
const sniper_range = [580, 820];
const sniper_charge = {chill: 2.1, normal: 1.6, overload: 1.5};
const sniper_rail_charge = 0.3;
const sniper_lock = 0.35;
const sniper_gap = {chill: 6.5, normal: 4.5, overload: 4};
const sniper_damage = 24;
// A mine-layer: the lane it seals, across your way this far ahead of you and this long, a mine every so many metres;
// a mine arms after a moment, lives a while, trips when you come within its reach and bursts after a short fuse
const minelayer_ahead = 420;
const minelayer_lane = 700;
const minelayer_step = {chill: 75, normal: 55, overload: 50};
const mine_arm = 0.9;
const mine_life = {chill: 11, normal: 15, overload: 16};
const mine_reach = 60;
const mine_fuse = 0.35;
const mine_blast = 85;
const mine_damage = 18;
const mines_most = 70;

// The mines laid, the bulwarks of this frame (your shots ask them: raider_shield_stop) and the kinds the run has shown
let raider_mines = [];
const raider_shields = [];
const raider_hints = new Set();

// A new run (arcade_start, arcade_stop) and a world begun: no mines, no shields; the hints again only for a new run
function raider_jobs_reset(run = true)
{
    raider_mines = [];
    raider_shields.length = 0;
    pack_reset(run);
    if (run) {
        raider_hints.clear();
    }
}

// A raider of a kind at (x, y), warping in as a squadron's raiders do: the world's raider (spawn_enemy) with the kind's
// hull, size, speed and job; a drone carries no shield or armour, a bulwark and a carrier a tank's shield, an
// interceptor less. A carrier, a sniper and a mine-layer fire no gun of the world's: their job is their weapon.
function raider_kind_spawn(kind, x, y)
{
    const k = raider_kinds[kind];
    const enemy = spawn_enemy(kind);
    const hull = (difficulty === 'chill') ? 0.8 : (difficulty === 'overload') ? 1.15 : 1;
    const pace = (difficulty === 'chill') ? 0.8 : (difficulty === 'overload') ? 1.2 : 1;
    enemy.hp = enemy.max_hp = (k.hull[0] + k.hull[1]*threat_wave())*hull;
    enemy.speed = (k.speed[0] + k.speed[1]*threat_wave())*pace;
    enemy.r = k.r;
    enemy.x = clamp(x, 40, world.w - 40);
    enemy.y = clamp(y, 40, world.h - 40);
    enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    enemy.job = {kind, phase: 'go', t: rand(1, 2.5), aim: enemy.angle, side: (Math.random() < 0.5) ? -1 : 1, speed: 0, owner: null, drones: 0, lane: null, step: 0, reach: 0, blocked: false, flash: 0};
    if (kind === 'drone') {
        enemy.child = true;
        enemy.armor = 0;
        enemy.max_shield = enemy.shield = 0;
        enemy.job.phase = 'orbit';
    }
    if ((kind === 'bulwark') || (kind === 'carrier')) {
        enemy.max_shield = enemy.shield = enemy.max_shield*1.4;
    }
    if (kind === 'interceptor') {
        enemy.max_shield = enemy.shield = enemy.max_shield*0.6;
        enemy.job.phase = 'cruise';
    }
    if (['carrier', 'sniper', 'minelayer', 'drone'].includes(kind)) {
        enemy.gun_cd = Infinity;
    }
    // on a Scroll lane one firing its world's gun fires only from a chaser's range (arcade_base.js), as the lane's
    // raiders do: a bulwark there fired Eclipse's rail gun from 900 m, its shield to you, the most of what the bot lost
    // there; a sniper's long shot is its job
    if (arcade_scroll_on() && ((kind === 'bulwark') || (kind === 'interceptor'))) {
        enemy.fire_range = arcade_base_chaser_range;
    }
    if (kind === 'sniper') {
        enemy.weapon = 'rail';
        enemy.job.phase = 'move';
    }
    if (kind === 'carrier') {
        enemy.job.phase = 'wait';
    }
    if (kind === 'minelayer') {
        enemy.job.phase = 'plan';
    }
    return enemy;
}

// The kinds a squadron of this step and wave may bring, each as often as it comes: none in Haven's first wave
function raider_kinds_open()
{
    const out = [];
    for (const [kind, k] of Object.entries(raider_kinds)) {
        if ((k.world < arcade_level()) || ((k.world === arcade_level()) && (arcade.wave >= 2))) {
            out.push(kind);
        }
        if ((k.world === arcade_level()) && (arcade.wave >= 2)) {
            out.push(kind);
        }
    }
    return out;
}

// How many of a kind are alive, and whether one more may come: a rail world takes fewer of the slow-to-answer ones, and
// the first steps fewer at once (one in Haven, two at the second step)
function raider_kind_room(kind)
{
    const k = raider_kinds[kind];
    const cap = Math.min((worlds[campaign.world].weapon === 'rail') ? k.rail : k.cap, arcade_level() + 1);
    let alive = 0;
    for (const v of enemies) {
        alive += ((v.hp > 0) && (v.type === kind)) ? 1 : 0;
    }
    return alive < cap;
}

// After a squadron came (arcade_squad_spawn): by the world's share some of its line raiders give their places to raiders
// with jobs, warping in where they stood; then the rest hunt as a pack (pack_form). An elite, an escort, its leader, a
// lurker, an anchored raider and an event's raider keep their places. Without `pack` (a Scroll lane) the rest hunt each
// on its own.
function raider_squad_after(squad, pack = true)
{
    const free = squad.filter(v => !v.elite && !v.guard && !v.lurk && !v.anchor && !v.event_goal && (v.type !== 'tank'));
    const open = raider_kinds_open();
    const share = raider_job_share[arcade_level()]*((difficulty === 'chill') ? raider_job_chill : 1);
    let count = 0;
    if (open.length && free.length && (Math.random() < share)) {
        count = Math.min(free.length - 1, (squad.length >= 6) ? raider_job_most[arcade_level()] : 1);
    }
    const squadron = squad.slice();
    for (let i = 0; i < count; ++i) {
        const kind = open[Math.floor(Math.random()*open.length)];
        if (!raider_kind_room(kind)) {
            continue;
        }
        // the last of the line gives its place, so a line's first (its elite, when it has one) stays
        const old = free.pop();
        enemies.splice(enemies.indexOf(old), 1);
        squadron[squadron.indexOf(old)] = raider_kind_spawn(kind, old.x, old.y);
    }
    if (pack) {
        pack_form(squadron);
    }
}

// Called from arcade_update every frame, whatever else waits: each raider with a job does it (at stasis' pace), the
// bulwarks put up their shields for your shots, the mines tick, the packs hunt, and a kind seen for the first time in
// the run says what it asks of you
function raider_jobs_update(dt)
{
    raider_shields.length = 0;
    for (let i = 0, end = enemies.length; i < end; ++i) {
        const v = enemies[i];
        // a dev page's target dummy (src/js/dev/enemies.js) only stands there
        if (!v.job || (v.hp <= 0) || v.dev_dummy) {
            continue;
        }
        const job_dt = dt*stasis_scale(v);
        const d = distance(v, player);
        v.job.flash = Math.max(0, v.job.flash - dt);
        raider_job_ticks[v.job.kind](v, v.job, job_dt, d);
        if (v.type === 'bulwark') {
            raider_shields.push(v);
        }
        const k = raider_kinds[v.type];
        if (k.title && !raider_hints.has(v.type) && (d < 1000)) {
            raider_hints.add(v.type);
            show_toast(k.title, k.line, 3.5, 'danger');
        }
    }
    raider_mines_update(dt);
    pack_update(dt);
}

// Where a raider flies for to meet you: where you will be in the time it takes at this speed, 2.5 s ahead at most
function raider_lead(v, speed)
{
    const t = clamp(distance(v, player)/Math.max(1, speed), 0, 2.5);
    return Math.atan2(player.y + player.vy*t - v.y, player.x + player.vx*t - v.x);
}

// Each kind's clock: what it is doing, and what comes next
const raider_job_ticks = {
    // cruise toward where you will be; near, a wind-up, then a burst faster than you cruise, its way locked and turning
    // slowly; a coast after it
    interceptor: function (v, job, dt, d) {
        job.t -= dt;
        if ((job.phase === 'cruise') && (job.t <= 0) && (d < 950)) {
            job.phase = 'wind';
            job.t = interceptor_wind;
            ring(v.x, v.y, gold, 34, interceptor_wind);
        }
        else if ((job.phase === 'wind') && (job.t <= 0)) {
            job.phase = 'burst';
            job.t = interceptor_burst;
            job.speed = Math.min(cruise_speed()*(interceptor_pace[difficulty] || interceptor_pace.normal), turbo_speed()*interceptor_turbo_share);
            job.aim = raider_lead(v, job.speed);
            explode(v.x - Math.cos(job.aim)*v.r, v.y - Math.sin(job.aim)*v.r, 14, '#ffd16e', 0, 'spark');
        }
        else if (job.phase === 'burst') {
            job.aim = turn_toward(job.aim, raider_lead(v, job.speed), interceptor_burst_turn*dt);
            if (job.t <= 0) {
                job.phase = 'coast';
                job.t = interceptor_coast;
            }
        }
        else if ((job.phase === 'coast') && (job.t <= 0)) {
            job.phase = 'cruise';
            job.t = rand(2.2, 3.6);
        }
    },
    // its shield turns to you, slower than you fly round it from close by
    bulwark: function (v, job, dt) {
        // slower on an arcade Scroll lane, where there is less room to fly round it (arcade_scroll_bulwark)
        const turn = (bulwark_turn[difficulty] || bulwark_turn.normal)*(arcade_scroll_on() ? arcade_scroll_bulwark : 1);
        job.aim = turn_toward(job.aim, Math.atan2(player.y - v.y, player.x - v.x), turn*dt);
    },
    // in range, its bays glow, then two drones leave them; one more pair a while after, while it has room for them
    carrier: function (v, job, dt, d) {
        job.t -= dt;
        const most = carrier_drones - ((difficulty === 'chill') ? 1 : 0);
        if ((job.phase === 'wait') && (job.t <= 0) && (job.drones < most) && (d < 1300)) {
            job.phase = 'bay';
            job.t = carrier_bay;
        }
        else if ((job.phase === 'bay') && (job.t <= 0)) {
            for (const side of [-1, 1]) {
                const a = v.angle + side*Math.PI/2;
                const drone = raider_kind_spawn('drone', v.x + Math.cos(a)*v.r, v.y + Math.sin(a)*v.r);
                drone.job.owner = v;
                drone.job.side = side;
                drone.angle = a;
                explode(drone.x, drone.y, 12, '#a8e4ff', 0, 'warp');
            }
            job.drones += 2;
            job.phase = 'wait';
            job.t = carrier_gap[difficulty] || carrier_gap.normal;
        }
    },
    // it rings you, darting in now and then; it pops when it rams you; once its carrier is gone it falls, one after
    // another
    drone: function (v, job, dt, d) {
        job.t -= dt;
        if (job.phase === 'fall') {
            if (job.t <= 0) {
                damage_enemy(v, v.hp + 1000);
            }
            return;
        }
        if (d < v.r + player.r + 8) {
            damage_player(drone_ram*raider_hit_scale(v), false, 'ram', v);
            damage_enemy(v, v.hp + 1000);
            return;
        }
        if ((job.phase === 'orbit') && (job.t <= 0) && (d < 320)) {
            job.phase = 'dart';
            job.t = 0.7;
        }
        else if ((job.phase === 'dart') && (job.t <= 0)) {
            job.phase = 'orbit';
            job.t = rand(1.6, 3);
        }
    },
    // in range, it charges: its line follows where you will be, locks for the last moment, and the slug flies along
    // it, unless a rock stands in the way, when it waits and tries again soon
    sniper: function (v, job, dt, d) {
        job.t -= dt;
        if ((job.phase === 'move') && (job.t <= 0) && (d < 1150)) {
            job.phase = 'charge';
            job.t = (sniper_charge[difficulty] || sniper_charge.normal) + ((worlds[campaign.world].weapon === 'rail') ? sniper_rail_charge : 0);
        }
        if (job.phase !== 'charge') {
            return;
        }
        if (job.t > sniper_lock) {
            job.aim = raider_aim(v, player);
        }
        job.reach = raider_sight(v, job.aim, d*1.3);
        job.blocked = job.reach < d - player.r;
        if (job.t > 0) {
            return;
        }
        job.phase = 'move';
        if (job.blocked) {
            job.t = 1.2;
            return;
        }
        job.t = sniper_gap[difficulty] || sniper_gap.normal;
        const count = hostile.length;
        enemy_fire(v, job.aim);
        // out of sight on an arcade Scroll lane it holds its fire (arcade_scroll_unseen): no slug
        if (hostile.length === count) {
            return;
        }
        const slug = hostile[hostile.length - 1];
        slug.damage = sniper_damage*raider_hit_scale(v);
        slug.sniper = true;
        ring(v.x, v.y, '#ff4d5e', 40, 0.3);
    },
    // it plans a lane across your way ahead of you, through its own place when it is ahead of you already, flies to the
    // lane (planning again when you turn off that way or pass the lane), then along it to its far end, dropping a mine
    // every few metres; a rest, and another
    minelayer: function (v, job, dt) {
        job.t -= dt;
        if ((job.phase === 'plan') || ((job.phase === 'approach') && (job.t <= 0) && minelayer_lane_stale(job.lane))) {
            job.lane = minelayer_lane_plan(v);
            job.phase = 'approach';
            job.t = 1.2;
        }
        else if ((job.phase === 'approach') && (job.t <= 0)) {
            job.t = 1.2;
        }
        if ((job.phase === 'approach') && (segment_distance(v, {x: job.lane.ax, y: job.lane.ay}, {x: job.lane.bx, y: job.lane.by}) < 60)) {
            // on the lane: it lays toward the end farther from it
            if (distance(v, {x: job.lane.ax, y: job.lane.ay}) > distance(v, {x: job.lane.bx, y: job.lane.by})) {
                job.lane = {...job.lane, ax: job.lane.bx, ay: job.lane.by, bx: job.lane.ax, by: job.lane.ay};
            }
            job.phase = 'lay';
            job.step = 0;
        }
        else if (job.phase === 'lay') {
            job.step += v.speed*dt;
            if (job.step >= (minelayer_step[difficulty] || minelayer_step.normal)) {
                job.step = 0;
                raider_mine_lay(v);
            }
            if (distance(v, {x: job.lane.bx, y: job.lane.by}) < 50) {
                job.phase = 'rest';
                job.t = 2.5;
            }
        }
        else if ((job.phase === 'rest') && (job.t <= 0)) {
            job.phase = 'plan';
        }
    },
};

// How far a sniper's line runs from it along `angle` before a rock stops it, `reach` at most
function raider_sight(v, angle, reach)
{
    const end = {x: v.x + Math.cos(angle)*reach, y: v.y + Math.sin(angle)*reach};
    let out = reach;
    for (let i = 0, count = ore_nodes.length; i < count; ++i) {
        const rock = ore_nodes[i];
        if ((rock.hp > 0) && (segment_distance(rock, v, end) < rock.r)) {
            out = Math.min(out, Math.max(0, (rock.x - v.x)*Math.cos(angle) + (rock.y - v.y)*Math.sin(angle) - rock.r*0.8));
        }
    }
    return out;
}

// A lane across your way (toward the layer, when you hold still), square to it: through the point this far ahead of
// you, or through the layer's own place when that is farther ahead (900 m at most), its nearer end first; inside the
// world. It keeps your way then (fx, fy) and its middle (cx, cy), for minelayer_lane_stale.
function minelayer_lane_plan(v)
{
    const speed = Math.hypot(player.vx, player.vy);
    const d = Math.max(1, distance(v, player));
    const f = (speed > 60) ? {x: player.vx/speed, y: player.vy/speed} : {x: (v.x - player.x)/d, y: (v.y - player.y)/d};
    const ahead = clamp((v.x - player.x)*f.x + (v.y - player.y)*f.y, minelayer_ahead + speed*0.6, 900);
    const cx = player.x + f.x*ahead;
    const cy = player.y + f.y*ahead;
    const half = minelayer_lane/2;
    const a = {x: clamp(cx - f.y*half, 80, world.w - 80), y: clamp(cy + f.x*half, 80, world.h - 80)};
    const b = {x: clamp(cx + f.y*half, 80, world.w - 80), y: clamp(cy - f.x*half, 80, world.h - 80)};
    const near = distance(v, a) < distance(v, b);
    return {...(near ? {ax: a.x, ay: a.y, bx: b.x, by: b.y} : {ax: b.x, ay: b.y, bx: a.x, by: a.y}), fx: f.x, fy: f.y, cx, cy};
}

// Whether a planned lane is no longer across your way: you fly off that way, have passed it, or are far from it
function minelayer_lane_stale(lane)
{
    const speed = Math.hypot(player.vx, player.vy);
    const ox = lane.cx - player.x;
    const oy = lane.cy - player.y;
    if (Math.hypot(ox, oy) > 1100) {
        return true;
    }
    if (speed <= 60) {
        return false;
    }
    return ((player.vx*lane.fx + player.vy*lane.fy)/speed < 0.7) || (ox*player.vx + oy*player.vy < 0);
}

function raider_mine_lay(v)
{
    raider_mines.push({x: v.x - Math.cos(v.angle)*v.r, y: v.y - Math.sin(v.angle)*v.r, arm: mine_arm, life: mine_life[difficulty] || mine_life.normal, fuse: -1, color: v.color || pink, scale: raider_hit_scale(v), owner: v});
    if (raider_mines.length > mines_most) {
        raider_mines.shift();
    }
}

// The mines: they arm, age, trip when you come within their reach and burst after a short fuse, hurting you by how
// close you are (a blast: a dash does not carry you through it); a pulse's or an EMP's front clears them as it passes
function raider_mines_update(dt)
{
    for (const mine of raider_mines) {
        mine.life -= dt;
        mine.arm -= dt;
        for (const w of pulse_waves) {
            if (((w.kind === 'pulse') || (w.kind === 'emp')) && (distance(w, mine) <= w.r)) {
                mine.life = 0;
                explode(mine.x, mine.y, 8, pulse_looks[w.kind].color, 0, 'spark');
            }
        }
        if (mine.life <= 0) {
            continue;
        }
        const d = distance(mine, player);
        if ((mine.arm <= 0) && (mine.fuse < 0) && (d < mine_reach + player.r)) {
            mine.fuse = mine_fuse;
        }
        if (mine.fuse < 0) {
            continue;
        }
        mine.fuse -= dt;
        if (mine.fuse > 0) {
            continue;
        }
        mine.life = 0;
        explode(mine.x, mine.y, 34, mine.color, 0, 'barrel');
        ring(mine.x, mine.y, '#ff4d5e', mine_blast, 0.3);
        if (d < mine_blast + player.r) {
            damage_player(mine_damage*mine.scale*arcade_mode().blast*(1 - 0.5*Math.min(1, d/mine_blast)), true, 'mine', mine.owner);
        }
    }
    raider_mines = raider_mines.filter(v => v.life > 0);
}

// A raider with a job, its way and pace (arcade_role_steer): turns it and returns how fast it moves
function raider_job_steer(v, move, d)
{
    const job = v.job;
    const a = Math.atan2(player.y - v.y, player.x - v.x);
    if (v.type === 'interceptor') {
        if ((job.phase === 'burst') || (job.phase === 'coast')) {
            v.angle = job.aim;
            return (job.phase === 'burst') ? job.speed/v.speed : 0.6;
        }
        v.angle = raider_lead(v, v.speed);
        return (job.phase === 'wind') ? 0.25 : 1;
    }
    if (v.type === 'bulwark') {
        v.angle = job.aim;
        return (d > 280) ? 1 : 0;
    }
    if (v.type === 'carrier') {
        v.angle = a;
        return (d > carrier_range[1]) ? 1 : (d < carrier_range[0]) ? -0.7 : 0;
    }
    if (v.type === 'drone') {
        if (job.phase === 'fall') {
            v.angle += 0.2;
            return 0.2;
        }
        if (job.phase === 'dart') {
            v.angle = a;
            return 1.5;
        }
        v.angle = a + job.side*clamp(Math.PI/2 - (d - drone_orbit)/160, 0.3, 2.2);
        return 1;
    }
    if (v.type === 'sniper') {
        if (job.phase === 'charge') {
            v.angle = job.aim;
            return 0;
        }
        if (d > sniper_range[1]) {
            v.angle = a;
            return 1;
        }
        if (d < sniper_range[0]) {
            v.angle = a;
            return -0.8;
        }
        v.angle = a + job.side*Math.PI/2;
        return 0.5;
    }
    // a mine-layer: to its lane's end, along the lane, or away from you to rest
    if (job.phase === 'approach') {
        v.angle = Math.atan2(job.lane.ay - v.y, job.lane.ax - v.x);
        return 1;
    }
    if (job.phase === 'lay') {
        v.angle = Math.atan2(job.lane.by - v.y, job.lane.bx - v.x);
        return 1;
    }
    v.angle = a + Math.PI;
    return (d < 500) ? 1 : 0;
}

// A raider with a job died (base_damage_enemy): its salvage, a carrier's drones falling one after another, a drone
// leaving its carrier room for another
function raider_job_kill(enemy)
{
    if (!enemy.job) {
        return;
    }
    const k = raider_kinds[enemy.type];
    for (let i = 0; i < k.salvage; ++i) {
        drop_pickup(enemy.x + rand(-30, 30), enemy.y + rand(-30, 30), 'artifact', 2 + Math.floor(threat_wave()/4));
    }
    if (enemy.type === 'carrier') {
        let n = 0;
        for (const v of enemies) {
            if ((v.hp > 0) && v.job && (v.job.owner === enemy)) {
                v.job.phase = 'fall';
                v.job.t = 0.3 + n*drone_fall_gap;
                n++;
            }
        }
    }
    if (enemy.job.owner) {
        enemy.job.owner.job.drones = Math.max(0, enemy.job.owner.job.drones - 1);
    }
}

// The score of a kill of a kind; null for the raiders of before (base_damage_enemy keeps theirs)
function raider_kind_points(enemy)
{
    return enemy.job ? raider_kinds[enemy.type].points : null;
}

// A drone drops nothing: its carrier carries the salvage
function raider_job_bare(enemy)
{
    return !!enemy.job && (enemy.type === 'drone');
}

// Your guns pass over a bulwark that has its shield to you, for the nearest raider they can hurt, 350 m farther at
// most; null when there is none (they keep at the shield, and its sparks say why)
function raider_target_past_shield(target)
{
    if (!raider_shield_faces(target, player)) {
        return null;
    }
    const far = distance(target, player) + 350;
    let best = null;
    let near = far;
    for (const v of enemies) {
        const d = distance(v, player);
        // on a Scroll lane only one on the screen (the guns' rule, update.js)
        if ((v !== target) && (v.hp > 0) && (d < near) && !raider_shield_faces(v, player) && (!arcade_scroll_on() || in_view(v, 0))) {
            best = v;
            near = d;
        }
    }
    return best;
}

// Whether a raider is a bulwark with its shield toward p
function raider_shield_faces(v, p)
{
    if (v.type !== 'bulwark') {
        return false;
    }
    const a = Math.atan2(p.y - v.y, p.x - v.x);
    return Math.abs(Math.atan2(Math.sin(a - v.job.aim), Math.cos(a - v.job.aim))) < bulwark_arc;
}

// Whether a shot of yours met a bulwark's shield on its step from (px, py): it stops where it met it, in sparks, and
// the shield flashes. The shield is an arc round the hull's front; a shot that comes in from behind it passes to the
// hull.
function raider_shield_stop(b, px, py)
{
    for (let i = 0; i < raider_shields.length; ++i) {
        const v = raider_shields[i];
        if (v.hp <= 0) {
            continue;
        }
        const reach = v.r + bulwark_shield_gap;
        const ox = px - v.x;
        const oy = py - v.y;
        const c = ox*ox + oy*oy - reach*reach;
        const dx = b.x - px;
        const dy = b.y - py;
        const a = dx*dx + dy*dy;
        const half = ox*dx + oy*dy;
        const disc = half*half - a*c;
        // it started inside the shield's round, or never comes into it on this step
        if ((c <= 0) || !a || (half >= 0) || (disc < 0)) {
            continue;
        }
        const t = (-half - Math.sqrt(disc))/a;
        if (t > 1) {
            continue;
        }
        const hx = px + dx*t;
        const hy = py + dy*t;
        if (!raider_shield_faces(v, {x: hx, y: hy})) {
            continue;
        }
        b.x = hx;
        b.y = hy;
        b.life = 0;
        v.job.flash = 0.15;
        explode(hx, hy, 9, '#bfefff', 0, 'spark');
        return true;
    }
    return false;
}

// Under the hulls: the mines, their reach, a mine-layer's lane before it seals it, and the lines from drones to their
// carrier
function raider_jobs_render_under()
{
    if (!arcade.active) {
        return;
    }
    ctx.save();
    ctx.lineWidth = 1.5/zoom;
    ctx.strokeStyle = '#ff4d5e';
    ctx.globalAlpha = 0.4;
    ctx.setLineDash([14/zoom, 10/zoom]);
    ctx.beginPath();
    for (const v of enemies) {
        if ((v.type === 'minelayer') && (v.hp > 0) && ((v.job.phase === 'approach') || (v.job.phase === 'lay'))) {
            const lane = v.job.lane;
            ctx.moveTo((v.job.phase === 'lay') ? v.x : lane.ax, (v.job.phase === 'lay') ? v.y : lane.ay);
            ctx.lineTo(lane.bx, lane.by);
        }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#a8e4ff';
    ctx.lineWidth = 1/zoom;
    ctx.beginPath();
    for (const v of enemies) {
        if ((v.type === 'drone') && (v.hp > 0) && v.job.owner && (v.job.owner.hp > 0) && (in_view(v, 60) || in_view(v.job.owner, 60))) {
            ctx.moveTo(v.x, v.y);
            ctx.lineTo(v.job.owner.x, v.job.owner.y);
        }
    }
    ctx.stroke();
    // the mines' reach, faint, so a lane reads as a wall; then each mine
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#ff4d5e';
    ctx.lineWidth = 1.5/zoom;
    ctx.beginPath();
    for (const mine of raider_mines) {
        if ((mine.arm <= 0) && in_view(mine, mine_reach)) {
            ctx.moveTo(mine.x + mine_reach, mine.y);
            ctx.arc(mine.x, mine.y, mine_reach, 0, Math.PI*2);
        }
    }
    ctx.stroke();
    for (let i = 0; i < raider_mines.length; ++i) {
        const mine = raider_mines[i];
        if (!in_view(mine, 30)) {
            continue;
        }
        raider_mine_draw(mine, i);
    }
    ctx.restore();
}

// A mine: a dark disc with four spikes in its world's colour and a red eye that blinks, faint until it arms, swelling
// red on its fuse
function raider_mine_draw(mine, i)
{
    const armed = mine.arm <= 0;
    ctx.globalAlpha = armed ? 1 : 0.5;
    ctx.strokeStyle = mine.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < 4; ++k) {
        const a = k*Math.PI/2 + clock*0.8 + i;
        ctx.moveTo(mine.x + Math.cos(a)*7, mine.y + Math.sin(a)*7);
        ctx.lineTo(mine.x + Math.cos(a)*15, mine.y + Math.sin(a)*15);
    }
    ctx.stroke();
    ctx.fillStyle = '#1a1e28';
    ctx.beginPath();
    ctx.arc(mine.x, mine.y, 9, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
    const blink = (mine.fuse >= 0) ? 1 : armed ? 0.45 + 0.55*Math.max(0, Math.sin(clock*6 + i)) : 0.3;
    ctx.globalAlpha = blink;
    ctx.fillStyle = '#ff4d5e';
    ctx.beginPath();
    ctx.arc(mine.x, mine.y, (mine.fuse >= 0) ? 8 + (1 - mine.fuse/mine_fuse)*12 : 4, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

// Over the hulls: a bulwark's shield, an interceptor's wind-up and burst, a carrier's bays about to launch, and a
// sniper's line, drawn from a sniper off the screen too, since the line reaches you
function raider_jobs_render()
{
    if (!arcade.active) {
        return;
    }
    ctx.save();
    for (const v of enemies) {
        if (!v.job || (v.hp <= 0)) {
            continue;
        }
        if (v.type === 'sniper') {
            raider_sniper_line_draw(v);
        }
        if (!in_view(v, v.r + 160)) {
            continue;
        }
        if (v.type === 'bulwark') {
            const r = v.r + bulwark_shield_gap;
            ctx.globalAlpha = 0.55 + Math.min(1, v.job.flash/0.15)*0.45;
            ctx.strokeStyle = '#bfefff';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(v.x, v.y, r, v.job.aim - bulwark_arc, v.job.aim + bulwark_arc);
            ctx.stroke();
            ctx.globalAlpha = 0.25;
            ctx.lineWidth = 11;
            ctx.stroke();
        }
        if ((v.type === 'interceptor') && ((v.job.phase === 'wind') || (v.job.phase === 'burst'))) {
            const a = (v.job.phase === 'wind') ? v.angle : v.job.aim;
            const tail = (v.job.phase === 'wind') ? 16 : 56;
            ctx.globalAlpha = (v.job.phase === 'wind') ? 0.5 + 0.5*Math.sin(clock*40) : 0.75;
            ctx.strokeStyle = '#ffd16e';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(v.x - Math.cos(a)*v.r, v.y - Math.sin(a)*v.r);
            ctx.lineTo(v.x - Math.cos(a)*(v.r + tail), v.y - Math.sin(a)*(v.r + tail));
            ctx.stroke();
            if (v.job.phase === 'wind') {
                // an arrow of its way ahead
                ctx.lineWidth = 2/zoom;
                ctx.setLineDash([8/zoom, 6/zoom]);
                ctx.beginPath();
                ctx.moveTo(v.x + Math.cos(a)*(v.r + 6), v.y + Math.sin(a)*(v.r + 6));
                ctx.lineTo(v.x + Math.cos(a)*(v.r + 150), v.y + Math.sin(a)*(v.r + 150));
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
        if ((v.type === 'carrier') && (v.job.phase === 'bay')) {
            const glow = 1 - v.job.t/carrier_bay;
            ctx.globalAlpha = 0.4 + 0.6*glow;
            ctx.fillStyle = '#ffd16e';
            for (const side of [-1, 1]) {
                const a = v.angle + side*Math.PI/2;
                ctx.beginPath();
                ctx.arc(v.x + Math.cos(a)*v.r*0.75, v.y + Math.sin(a)*v.r*0.75, 3 + glow*5, 0, Math.PI*2);
                ctx.fill();
            }
        }
    }
    ctx.restore();
}

// A sniper's line while it charges: thin and red, following you; locked for the last moment, brighter and thicker;
// cut short and dim where a rock stops it
function raider_sniper_line_draw(v)
{
    const job = v.job;
    if (job.phase !== 'charge') {
        return;
    }
    const locked = job.t <= sniper_lock;
    const x = v.x + Math.cos(job.aim)*(v.r + 6);
    const y = v.y + Math.sin(job.aim)*(v.r + 6);
    const ex = v.x + Math.cos(job.aim)*job.reach;
    const ey = v.y + Math.sin(job.aim)*job.reach;
    const total = (sniper_charge[difficulty] || sniper_charge.normal);
    const charged = 1 - Math.max(0, job.t)/total;
    ctx.globalAlpha = job.blocked ? 0.3 : locked ? 0.95 : 0.35 + 0.4*charged;
    ctx.strokeStyle = job.blocked ? '#8a8f99' : '#ff4d5e';
    ctx.lineWidth = (locked ? 4 : 2)/zoom;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    if (locked && !job.blocked) {
        ctx.strokeStyle = '#ffe6e9';
        ctx.lineWidth = 1.2/zoom;
        ctx.stroke();
    }
    // the charge gathers at its muzzle
    ctx.fillStyle = job.blocked ? '#8a8f99' : '#ff4d5e';
    ctx.beginPath();
    ctx.arc(x, y, 3 + charged*6, 0, Math.PI*2);
    ctx.fill();
}
