// Rocks shoved, the arcade's (the author, 2026-11-01: "the push wave can move the asteroids with minerals too: push
// them carefully together, then bang, and it all blows up beautifully for a good bonus"). An ore rock a push wave or a
// blast reaches drifts away by its weight and slows down; rocks that meet bounce apart, and a hard hit cracks them; a
// rock broken in the arcade blows up, and its blast breaks the rocks packed close round it, so a herded cluster goes up
// in a chain that scores. A cliff stays where it stands. The campaign's rocks stay put (docs/principles.md).

// A rock weighs twice a ship of its size: a push wave moves a rock of 30 m at some 50 m/s, a raider's blast less
const rock_weight_k = 2;
// its drift halves every second: shoved at 50 m/s it comes to rest some 70 m on
const rock_drag = 0.5;
// slower than this (m/s) it is at rest
const rock_still = 4;
// how rocks bounce off each other and off a hull
const rock_bounce = 0.3;
// A rock's blast: out to 3 × its radius, 60 to the rocks at its middle, 16 to a raider (twice as a ship's blast hurts
// them: blast_raider_k) and 8 to you before the mode's blast, and the shove of a ship's blast of 1.5 × its radius. The
// fields' rocks touch or overlap (in each world half of them are within a radius of the next), and a whole rock has 60
// to 110 hull: a field at rest does not go up from one rock broken, nor from the shoves of its own blasts. A rock your
// push wave moved is loose for 4 s and takes twice a blast's damage, so a herd goes up in a chain from one shot
const rock_blast_reach = 3;
const rock_blast_rocks = 60;
const rock_loose_time = 4;
const rock_loose_k = 2;
const rock_blast_raiders = 16;
const rock_blast_you = 8;
// What a rock broken down a chain scores, before its place in the chain (pulse_score_scale)
const rock_chain_points = 60;

// rocks moving now: only they are stepped and checked against the others
let rocks_moving = [];
// a crash cracks a rock at most once in this many seconds: rocks of a field overlap, and two pressed together would be
// hurt every frame
const rock_crash_grace = 0.3;
// the rock being dealt a chain's damage right now (rock_strike): its break goes on the chain, not a new one
let rock_striking = false;

function rock_weight(rock)
{
    return rock_rooted(rock) ? Infinity : (rock.r/14)*(rock.r/14)*rock_weight_k;
}

// A rock that stands where it is, whatever shoves it, and breaks its own way: a cliff falls (arcade_cliffs.js), a
// brood nest bursts (arcade_nests.js)
function rock_rooted(rock)
{
    return (rock.type === 'cliff') || (rock.type === 'brood_nest');
}

// Shove a rock by `dv` m/s for a weight of 1, along (nx, ny): a rooted one does not move
function rock_shove(rock, nx, ny, dv)
{
    const weight = rock_weight(rock);
    if ((weight === Infinity) || (rock.hp <= 0)) {
        return;
    }
    rock.vx += nx*dv/weight;
    rock.vy += ny*dv/weight;
    if (!rocks_moving.includes(rock)) {
        rocks_moving.push(rock);
    }
}

// Your push wave moves a rock (pulse_hit): it drifts, and is loose for a while; a rooted one is neither
function rock_push(rock, nx, ny, dv)
{
    if (rock_rooted(rock)) {
        return;
    }
    rock_shove(rock, nx, ny, dv);
    rock.loose_at = time;
}

// A blast's front reaches a rock: hurt as the rocks' damage of the blast says, less with the gap between them, twice
// while it drifts loose; then shoved
function blast_hit_rock(blast, rock)
{
    const away = blast_away(blast, rock);
    const fall = blast_fall(blast, Math.max(0, away.d - rock.r));
    const loose = (time - rock.loose_at < rock_loose_time) ? rock_loose_k : 1;
    if (blast.rock_damage > 0) {
        rock_strike(rock, blast.rock_damage*fall*loose);
    }
    rock_shove(rock, away.x, away.y, blast.push*fall);
}

// The game's own damage to a rock, as a chain's: broken, it goes on the HUD's chain and scores by its place in it
function rock_strike(rock, damage)
{
    if ((rock.hp <= 0) || (damage <= 0)) {
        return;
    }
    rock_striking = true;
    damage_ore(rock, damage);
    rock_striking = false;
    if ((rock.hp > 0) || rock_rooted(rock)) {
        return;
    }
    chain_kill(true);
    blast_striking = true;
    const points = Math.round(rock_chain_points*pulse_score_scale());
    blast_striking = false;
    score += points;
    label(rock.x, rock.y - 10, `+${points}`, (pulse_chain.count > 1) ? gold : cyan);
}

// A crash's damage to a rock, unless its last crash was moments ago (rock_crash_grace)
function rock_crash(rock, damage)
{
    if (time - rock.crash_at < rock_crash_grace) {
        return;
    }
    rock.crash_at = time;
    rock_strike(rock, damage);
}

// A rock broken in the arcade, by anything: it blows up (base_damage_ore)
function rock_blow(rock)
{
    if (!arcade.active || rock_rooted(rock)) {
        return;
    }
    // broken by your guns, it starts a count its blast can go on with; a pulse's or a chain's counts its own
    if (!rock_striking && (pulse_strike_depth < 0)) {
        chain_kill(false);
    }
    const size = rock.r*1.5;
    blast_add(rock.x, rock.y, rock.r*rock_blast_reach, rock_blast_raiders, rock_blast_you*arcade_mode().blast, blast_push(size), {source: rock, cause: 'rock blast', rock_damage: rock_blast_rocks});
}

// Each frame (arcade_update): the moving rocks drift and slow down, bounce off the rocks and hulls they meet, and a
// hard hit cracks them and hurts the raider
function rocks_update(dt)
{
    if (!rocks_moving.length) {
        return;
    }
    const drag = Math.pow(rock_drag, dt);
    for (const rock of rocks_moving) {
        if (rock.hp <= 0) {
            continue;
        }
        rock.x = clamp(rock.x + rock.vx*dt, 25, world.w - 25);
        rock.y = clamp(rock.y + rock.vy*dt, 25, world.h - 25);
        rock.vx *= drag;
        rock.vy *= drag;
        for (const other of ore_nodes) {
            if ((other !== rock) && (other.hp > 0)) {
                rock_meet(rock, other, rock_weight(other), other.vx || 0, other.vy || 0, true);
            }
        }
        for (const v of enemies) {
            if (v.hp > 0) {
                rock_meet(rock, v, crash_weight(v), crash_vx(v), crash_vy(v), false);
            }
        }
    }
    // a rock of a world left behind, or broken, leaves the list
    rocks_moving = rocks_moving.filter(v => (v.hp > 0) && (Math.hypot(v.vx, v.vy) > rock_still) && ore_nodes.includes(v));
    for (const rock of ore_nodes) {
        if (!rocks_moving.includes(rock) && (rock.vx || rock.vy)) {
            rock.vx = 0;
            rock.vy = 0;
        }
    }
}

// The moving rock meets `other` (a rock or a raider) of weight `weight` flying (vx, vy): if they close, both bounce by
// their weights, and the hit's speed past crash_hurt_from cracks the rock and hurts the other
function rock_meet(rock, other, weight, vx, vy, is_rock)
{
    const min = rock.r + other.r;
    const dx = other.x - rock.x;
    const dy = other.y - rock.y;
    if ((Math.abs(dx) >= min) || (Math.abs(dy) >= min)) {
        return;
    }
    const d = Math.hypot(dx, dy);
    if ((d >= min) || !d) {
        return;
    }
    const nx = dx/d;
    const ny = dy/d;
    const closing = (rock.vx - vx)*nx + (rock.vy - vy)*ny;
    if (closing <= 0) {
        return;
    }
    const mine = rock_weight(rock);
    const j = (1 + rock_bounce)*closing/(1/mine + ((weight === Infinity) ? 0 : 1/weight));
    rock.vx -= nx*j/mine;
    rock.vy -= ny*j/mine;
    if (is_rock) {
        rock_shove(other, nx, ny, j);
    }
    else {
        other.push_vx += nx*j/weight;
        other.push_vy += ny*j/weight;
    }
    if (closing <= crash_hurt_from) {
        return;
    }
    crash_spark(rock.x + nx*rock.r, rock.y + ny*rock.r, Math.atan2(ny, nx), closing);
    rock_crash(rock, crash_damage(closing, mine, weight));
    if (is_rock) {
        rock_crash(other, crash_damage(closing, weight, mine));
    }
    else {
        crash_hurt_raider(other, crash_damage(closing, weight, mine));
    }
}
