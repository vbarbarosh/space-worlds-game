// The arcade's Eclipse is the world of gravity: where you are round its black hole decides the fight. The hole bends
// every shot, yours and the raiders', a close pass round it slings your ship past its cruising speed for a moment, and
// raiders steer out of its pull, but one closing on you forgets it and is pulled in harder: a raider its core takes
// counts as your kill and pays a little.
// The campaign, the Races mode and the other worlds keep gravity as it was (gravity.js).

// How hard a hole bends a shot's way, on top of the pull that moves it as it moves everything (gravity_move): the way's
// curvature, in radians a metre, is the pull there (gravity_pull, the one the ship feels, in m/s) across the way
// times this. It is the same curve at any speed, so a slug bends as a bolt does. Measured (a shot past the hole, 1.6 s
// of flight): a bolt of 1100 m/s aimed to pass 600 m from the centre turns 33° (15° with the pull alone) and passes
// at 400 m, one aimed at 1 km turns 22° (11°), at 1.5 km 12° (7°); one aimed within 400 m swings round to the core.
// A rail slug of 2600 m/s, which the pull alone turns 3°, turns 14° at 600 m. Twice this whipped a bolt aimed at
// 600 m round the core, 120°: no aim held near the hole.
const arcade_shot_bend = 1.2e-6;
// the most a shot's way turns in a frame, so the steep pull by the core cannot flip it
const arcade_shot_turn_most = 0.5;
// A close pass: within this many of the hole's radii from its centre (840 m of the arcade's 560), and outside the core
// by sling_clear metres, the pull feeds the ship's speed
const arcade_sling_band = 1.5;
const arcade_sling_clear = 120;
// How fast the extra speed builds, a share of cruise a second for each share of cruise the pull has, counted only
// for the part of your flight across the pull (diving straight in builds nothing): at 550 to 650 m and cruise 3 s
// of the pass build the most; the most is 60% over cruise
const arcade_sling_gain = 0.45;
const arcade_sling_most = 0.6;
// the extra speed holds this long after the pass, then fades by this share of cruise a second (0.6 in 1.5 s)
const arcade_sling_hold = 1;
const arcade_sling_fade = 0.4;
// the label shows once a pass, when the extra speed passes this share of cruise
const arcade_sling_said = 0.2;
// A raider closing on you, within this of you and heading at you (within 72°: an attack run, a chaser coming in),
// is careless: its thrust goes into the chase, so the hole pulls it this much harder (a chaser of 165 m/s cannot
// pull out within about 800 m of the centre instead of 480 m). One circling you or further off minds the pull.
const arcade_lure_reach = 500;
const arcade_lure_heading = 0.3;
const arcade_lure_pull = 1.5;
// A raider minding the pull steers out of it within this many of the hole's radii (1010 m of 560): its heading leans
// outward by the pull over its own speed times this, so a chaser at 1 km leans out about as hard as it chases
const arcade_mind_band = 1.8;
const arcade_mind_lean = 1.5;
// what a raider the core takes pays on top of its kill: its own drop falls into the core with it
const arcade_swallow_points = 150;
const arcade_swallow_salvage = 6;
// how far above the core it is said: clear of the hole's bright disc and its name
const arcade_swallow_said = 170;

// Whether this frame is the arcade's Eclipse with its hole
function arcade_gravity_on()
{
    return arcade.active && (campaign.world === 7) && (black_holes.length > 0);
}

// As the world begins: the one hint, after the arrival's banner
function arcade_gravity_world_start()
{
    player.sling = 0;
    player.sling_time = 0;
    player.sling_said = false;
    if (campaign.world === 7) {
        show_toast('GRAVITY', 'IT BENDS EVERY SHOT · PASS CLOSE TO THE HOLE TO SLING · LEAD RAIDERS IN', 3.5);
    }
}

// What the gravity warning on the card advises: in the arcade's Eclipse a pass round the hole is a move, and the
// extra speed it gave shows while it lasts; elsewhere the hole is only a danger
function arcade_gravity_advice()
{
    if (!arcade_gravity_on()) {
        return 'STEER AWAY / SHIFT TURBO';
    }
    return (player.sling > 0) ? `SLINGSHOT +${Math.round(player.sling*100)}% / CORE KILLS` : 'CIRCLE TO SLING / CORE KILLS';
}

// A shot's way bends toward each hole by the pull across it; a shot fired along a line shown before it flew (a
// flagship's fan or lanes, a marksman's dashed aim) keeps to that line, so a tell never lies
function arcade_shot_bend_move(b, dt)
{
    if (b.raider && ((b.raider.type === 'boss') || b.raider.marksman)) {
        return;
    }
    const vx = b.vx;
    const vy = b.vy;
    const speed = Math.sqrt(vx*vx + vy*vy);
    if (speed < 1) {
        return;
    }
    let turn = 0;
    for (let i = 0, end = black_holes.length; i < end; ++i) {
        const h = black_holes[i];
        const dx = h.x - b.x;
        const dy = h.y - b.y;
        const reach = gravity_reach(h);
        const squared = dx*dx + dy*dy;
        if ((squared >= reach*reach) || (squared < 0.01)) {
            continue;
        }
        const d = Math.sqrt(squared);
        // the sine of the angle from the shot's way to the hole: the share of the pull across it, and its side
        const across = (vx*dy - vy*dx)/(speed*d);
        turn += across*gravity_pull(h, d)*arcade_shot_bend*speed*dt;
    }
    if (turn === 0) {
        return;
    }
    turn = clamp(turn, -arcade_shot_turn_most, arcade_shot_turn_most);
    const c = Math.cos(turn);
    const s = Math.sin(turn);
    b.vx = vx*c - vy*s;
    b.vy = vx*s + vy*c;
}

// How much harder the hole pulls a raider: one closing on you does not lean against it
function arcade_lure_pull_k(v)
{
    return (v.careless && arcade_gravity_on()) ? arcade_lure_pull : 1;
}

// Each raider each frame, after its own steering (d: its distance to you, move: its thrust along the heading, below 0
// for a shooter backing off): whether it is closing on you (careless), and if not, its way leaned out of the pull of
// each hole it is near. The flagship holds its place by itself.
function arcade_raider_mind_pull(v, heading, d, move)
{
    v.careless = false;
    if (!arcade_gravity_on() || (v.type === 'boss') || v.anchor) {
        return heading;
    }
    const toward = Math.cos(heading - Math.atan2(player.y - v.y, player.x - v.x));
    if ((move > 0) && (d < arcade_lure_reach) && (toward > arcade_lure_heading)) {
        v.careless = true;
        return heading;
    }
    // backing off, it flies against its heading: the lean is turned with it
    const side = (move < 0) ? -1 : 1;
    let x = Math.cos(heading);
    let y = Math.sin(heading);
    let leaned = false;
    for (let i = 0, end = black_holes.length; i < end; ++i) {
        const h = black_holes[i];
        const ox = v.x - h.x;
        const oy = v.y - h.y;
        const far = Math.sqrt(ox*ox + oy*oy);
        if ((far > h.radius*arcade_mind_band) || (far < 0.1)) {
            continue;
        }
        const lean = (gravity_pull(h, far)/Math.max(1, v.speed))*arcade_mind_lean;
        x += (ox/far)*lean*side;
        y += (oy/far)*lean*side;
        leaned = true;
    }
    return leaned ? Math.atan2(y, x) : heading;
}

// A raider the core took: a kill (damage_enemy counted it) and a little on top, said over where it fell
function arcade_swallowed(v)
{
    if (!arcade_gravity_on()) {
        return;
    }
    score += arcade_swallow_points;
    salvage += arcade_swallow_salvage;
    play_log_earn('swallowed', arcade_swallow_salvage);
    label(v.x, v.y - arcade_swallow_said, 'SWALLOWED', pink);
    label(v.x, v.y - arcade_swallow_said + 16, `◆ +${arcade_swallow_salvage}`, gold);
}

// Each frame in flight, before the engine: the factor on cruise the ship may fly at. A close pass round the hole,
// across its pull, builds extra speed; it holds a moment after the pass and fades; the brake drops it.
function arcade_sling_update(dt, braking)
{
    if (!arcade_gravity_on() || braking) {
        player.sling = 0;
        player.sling_time = 0;
        player.sling_said = false;
        return 1;
    }
    const cruise = cruise_speed();
    let gain = 0;
    for (let i = 0, end = black_holes.length; i < end; ++i) {
        const h = black_holes[i];
        const d = distance(h, player);
        if ((d > h.radius*arcade_sling_band) || (d < h.core + arcade_sling_clear)) {
            continue;
        }
        // the part of your speed across the line to the hole, as a share of cruise
        const across = Math.abs(player.vx*(h.y - player.y) - player.vy*(h.x - player.x))/d;
        gain += (gravity_pull(h, d)/cruise)*Math.min(1, across/cruise)*arcade_sling_gain*dt;
    }
    if (gain > 0) {
        player.sling = Math.min(arcade_sling_most, (player.sling || 0) + gain);
        player.sling_time = arcade_sling_hold;
    }
    else {
        player.sling_time = Math.max(0, (player.sling_time || 0) - dt);
        if (player.sling_time <= 0) {
            player.sling = Math.max(0, (player.sling || 0) - arcade_sling_fade*dt);
        }
    }
    if ((player.sling >= arcade_sling_said) && !player.sling_said) {
        player.sling_said = true;
        label(player.x, player.y - 30, 'SLINGSHOT', pink);
    }
    if (player.sling <= 0) {
        player.sling_said = false;
    }
    return 1 + player.sling;
}
