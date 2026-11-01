// Blasts and crashes, the arcade's (the author, 2026-11-01: "the blast wave also damages everything near it; different
// things blow up with different force; it hits my ship too; if I collide with someone, it changes his speed and his
// course; raiders that collide push each other and take damage"). What blows up sends a front that runs out from it:
// as it reaches a hull it hurts it, less toward its reach, and shoves it away by the hull's weight; a tripped mine goes
// off as a front reaches it. Ships that meet bounce apart by their speeds and weights; a raider thrown out of its
// pilot's hands that hits another raider or a rock is hurt by the speed of the crash, and so is a raider you ram.
// The campaign keeps its rules (docs/principles.md): all of it runs only while arcade.active.

// The front's speed, m/s: past a raider's blast (72 m) in a tenth of a second, a flagship's last (400 m) in 0.45 s
const blast_front_speed = 900;
// At most this many fronts at once: a crowd going up in a chain is a few dozen, the oldest go first
const blast_front_limit = 40;
// A shove: a blast this size throws a hull of weight 1 at its middle at 100 + 4 × size m/s (a raider's 40 → 260, a
// tank's 72 → 390, a flagship's 220 → 980); a lighter hull flies farther, up to 1.6 times that
const blast_push_base = 100;
const blast_push_size = 4;
const blast_push_light = 1.6;
// no shove throws a hull faster than this, m/s: a flagship's last blast beside a light raider carries it some 360 m;
// your ship no faster than the second, about 215 m, so a blast near Eclipse's hole cannot throw you deep into its pull
const blast_push_most = 500;
const blast_push_most_you = 300;
// How hulls bounce off each other: 0 would stick, 1 bounce back at full speed
const crash_bounce = 0.5;
// The fastest a ram throws your ship back, m/s: a flagship weighs some fifty of your fighter and would throw it at one
// and a half times the closing speed, in Eclipse's duel into the hole's pull (bin/playtest: 2 deaths in 16 Scroll runs)
const crash_bounce_most_you = 200;
// A crash hurts by the closing speed past this, m/s, this much a m/s (a raider thrown at 200 m/s into another of its
// weight at rest: 18 each; you at cruise into a chaser coming at you: about 50 to it, as much as its hull)
const crash_hurt_from = 50;
const crash_hurt = 0.12;
// A raider is out of its pilot's hands while its shove is faster than this (m/s): only then does meeting another
// raider or a rock hurt it; the pilots of a squadron flying together brush past each other unhurt
const crash_loose = 60;
// After a crash hurts a raider, the next one hurts it only this many seconds later: a pilot steering on into you, or
// two pressed together, would be hurt again every frame
const crash_grace = 0.3;

// What a dying ship sends (size: its fireball, damage: at its middle): a raider with a job by its kind (raider_kinds),
// the others by their type; the raiders it reaches take twice that, you take it as before (times the mode's blast),
// so a crowd goes up in a chain while your hull takes no more than it did
const blast_sizes = {shard: 26, tank: 72, splitter: 48, lancer: 48, shooter: 46, boss: 220};
const blast_damages = {shard: 6, chaser: 10, shooter: 12, splitter: 14, lancer: 14, tank: 26, boss: 50};
const blast_raider_k = 2;

// A front from x, y: it runs out to `reach` and, on each hull it reaches, deals `damage` to a raider and
// `player_damage` to you at its middle, falling to `edge` of that at its reach, and shoves by `push` (m/s at the
// middle for a weight of 1). Options: delay (s), source (the hull it came from, not hit), cause and by (for your
// play log and the arcade's crowds, damage_player's).
function blast_add(x, y, reach, damage, player_damage, push, {delay = 0, source = null, cause = 'ship blast', by = null, edge = 0} = {})
{
    arcade.blasts.push({x, y, reach, damage, player_damage, push, edge, t: -delay, r: 0, source, cause, by, hit: new Set(), player_hit: false});
    if (arcade.blasts.length > blast_front_limit) {
        arcade.blasts.splice(0, arcade.blasts.length - blast_front_limit);
    }
}

// The shove of a blast of this size (explode's), at its middle, for a hull of weight 1
function blast_push(size)
{
    return blast_push_base + blast_push_size*size;
}

// A ship that dies sends its front: a crowded squadron can go up in a chain
function arcade_blast_from_kill(enemy)
{
    // a raider with a job blows up by its kind (raider_kinds)
    const kind = enemy.job ? raider_kinds[enemy.type].blast : null;
    const size = kind ? kind[0] : blast_sizes[enemy.type] || 40;
    const damage = (kind ? kind[1] : blast_damages[enemy.type] || 10)*(enemy.elite ? 1.5 : 1);
    blast_add(enemy.x, enemy.y, size*1.8, damage*blast_raider_k, damage*arcade_mode().blast, blast_push(size), {delay: (enemy.type === 'boss') ? 1.25 : 0, source: enemy, by: enemy});
}

// How heavy a hull is against a shove or a crash: by its area, a tank, a bulwark and a carrier half again, a flagship
// four times; your ship by its size, and never lighter than a fighter of radius 14, which weighs 1
function crash_weight(v)
{
    if (v === player) {
        return Math.max(1, (v.r/14)*(v.r/14));
    }
    const k = (v.type === 'boss') ? 4 : ((v.type === 'tank') || (v.type === 'bulwark') || (v.type === 'carrier')) ? 1.6 : 1;
    return (v.r/14)*(v.r/14)*k;
}

// The share of its middle's damage and shove the front deals d m from it
function blast_fall(blast, d)
{
    return 1 - (1 - blast.edge)*Math.min(1, d/blast.reach);
}

// The fronts run out; each hull, mine and rock is reached once
function blasts_update(dt)
{
    for (let i = 0; i < arcade.blasts.length; ++i) {
        const blast = arcade.blasts[i];
        blast.t += dt;
        if (blast.t < 0) {
            continue;
        }
        blast.r = Math.min(blast.reach, blast.t*blast_front_speed);
        // a raider the blast kills sends its own front, pushed to the list as this one runs: the loop sees it too
        for (let j = 0, end = enemies.length; j < end; ++j) {
            const v = enemies[j];
            if ((v.hp > 0) && (v !== blast.source) && !blast.hit.has(v) && (distance(v, blast) - v.r <= blast.r)) {
                blast.hit.add(v);
                blast_hit_raider(blast, v);
            }
        }
        if (!blast.player_hit && player && (state === 'playing') && (distance(player, blast) - player.r <= blast.r)) {
            blast.player_hit = true;
            blast_hit_player(blast);
        }
        for (const piece of drifting_debris) {
            if (!blast.hit.has(piece) && (distance(piece, blast) - piece.r <= blast.r)) {
                blast.hit.add(piece);
                blast_hit_debris(blast, piece);
            }
        }
        // an armed mine the front reaches goes off a moment after (raider_mines_update)
        for (const mine of raider_mines) {
            if ((mine.life > 0) && (mine.fuse < 0) && (distance(mine, blast) <= blast.r)) {
                mine.fuse = 0.05;
            }
        }
    }
    arcade.blasts = arcade.blasts.filter(v => v.r < v.reach);
}

// The unit vector from the blast to v, and how far
function blast_away(blast, v)
{
    const dx = v.x - blast.x;
    const dy = v.y - blast.y;
    const d = Math.hypot(dx, dy);
    return d ? {x: dx/d, y: dy/d, d} : {x: 1, y: 0, d: 0};
}

// The shove a hull of weight `weight` takes from the front `fall` of the way in, at most `most` m/s
function blast_shove(blast, weight, fall, most = blast_push_most)
{
    return Math.min(most, blast.push*blast_push_light, blast.push/weight)*fall;
}

// v's shove dies away as a raider's does under the pulse (pulse_update): a quarter of it left after a second
function blast_shove_fade(v, dt)
{
    const drag = Math.pow(0.25, dt);
    v.push_vx = (Math.abs(v.push_vx) > 2) ? v.push_vx*drag : 0;
    v.push_vy = (Math.abs(v.push_vy) > 2) ? v.push_vy*drag : 0;
}

function blast_hit_raider(blast, v)
{
    const away = blast_away(blast, v);
    const fall = blast_fall(blast, away.d);
    const dv = blast_shove(blast, crash_weight(v), fall);
    v.push_vx += away.x*dv;
    v.push_vy += away.y*dv;
    if (blast.damage > 0) {
        blast_strike(v, blast.damage*fall);
    }
}

// The game's own damage, as a chain's: a kill goes on with the HUD's chain and scores by its place in it (chain_kill)
function blast_strike(v, damage)
{
    chain_striking = true;
    blast_striking = true;
    damage_enemy(v, damage);
    chain_striking = false;
    blast_striking = false;
}

function blast_hit_player(blast)
{
    const away = blast_away(blast, player);
    const fall = blast_fall(blast, away.d);
    const dv = blast_shove(blast, crash_weight(player), fall, blast_push_most_you);
    player.push_vx += away.x*dv;
    player.push_vy += away.y*dv;
    if (blast.player_damage > 0) {
        damage_player(blast.player_damage*fall, true, blast.cause, blast.by);
    }
}

// A drifting rock or wreck: shoved as the pulse shoves it, no faster than 160 m/s, and hurt as a raider is
function blast_hit_debris(blast, piece)
{
    const away = blast_away(blast, piece);
    const fall = blast_fall(blast, away.d);
    piece.vx += away.x*blast.push*fall*0.3;
    piece.vy += away.y*blast.push*fall*0.3;
    const speed = Math.hypot(piece.vx, piece.vy);
    if (speed > 160) {
        piece.vx *= 160/speed;
        piece.vy *= 160/speed;
    }
    if (blast.damage > 0) {
        drifting_debris_hit(piece, blast.damage*fall);
    }
}

// How fast a raider flies now: its pilot's way (update) and its shove
function crash_vx(v)
{
    return v.move_vx + v.push_vx;
}

function crash_vy(v)
{
    return v.move_vy + v.push_vy;
}

function crash_is_loose(v)
{
    return (v.push_vx*v.push_vx + v.push_vy*v.push_vy) > crash_loose*crash_loose;
}

// The damage a crash at `closing` m/s does to a hull of weight `own` against one of weight `other` (Infinity: a rock)
function crash_damage(closing, own, other)
{
    const share = (other === Infinity) ? 2 : Math.min(1.5, 2*other/(own + other));
    return Math.max(0, closing - crash_hurt_from)*crash_hurt*share;
}

// You and raider v touch (update): if closing, both bounce by their weights, its course is knocked off and its hull
// hurt by the crash (your own hull takes the ram, as before)
function crash_ram(v)
{
    const dx = v.x - player.x;
    const dy = v.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx/d;
    const ny = dy/d;
    const closing = (player.vx + player.push_vx - crash_vx(v))*nx + (player.vy + player.push_vy - crash_vy(v))*ny;
    if (closing <= 0) {
        return;
    }
    const mp = crash_weight(player);
    const mv = crash_weight(v);
    const j = (1 + crash_bounce)*closing/(1/mp + 1/mv);
    // your engine's way along the line of the crash turns into a shove: what is left of it after the crash carries
    // you on past something light, and something heavy throws you back, no faster than crash_bounce_most_you
    const into = Math.max(0, player.vx*nx + player.vy*ny);
    const after = Math.max(-crash_bounce_most_you, into - j/mp);
    player.vx -= nx*into;
    player.vy -= ny*into;
    player.push_vx += nx*after;
    player.push_vy += ny*after;
    v.push_vx += nx*j/mv;
    v.push_vy += ny*j/mv;
    crash_spark(player.x + nx*player.r, player.y + ny*player.r, Math.atan2(ny, nx), closing);
    crash_hurt_raider(v, crash_damage(closing, mv, mp));
}

// A crash's damage to v, unless its last crash was moments ago (crash_grace)
function crash_hurt_raider(v, damage)
{
    if ((v.crash_cd > 0) || (damage <= 0)) {
        return;
    }
    v.crash_cd = crash_grace;
    blast_strike(v, damage);
}

// After the raiders have moved, before their hulls are pulled apart (bodies_resolve): one thrown loose that meets
// another bounces off it and both are hurt by the crash; one thrown into a rock bounces off it, hurt
function crashes_update(dt)
{
    const end = enemies.length;
    for (let i = 0; i < end; ++i) {
        const a = enemies[i];
        if (a.hp <= 0) {
            continue;
        }
        a.crash_cd = Math.max(0, a.crash_cd - dt);
        for (let j = i + 1; j < end; ++j) {
            const b = enemies[j];
            const min = a.r + b.r;
            if ((b.hp <= 0) || (Math.abs(a.x - b.x) >= min) || (Math.abs(a.y - b.y) >= min)) {
                continue;
            }
            const d = Math.hypot(b.x - a.x, b.y - a.y);
            if ((d >= min) || !d) {
                continue;
            }
            crash_pair(a, b, (b.x - a.x)/d, (b.y - a.y)/d);
        }
        if (crash_is_loose(a)) {
            crash_into_rocks(a);
        }
    }
}

// a and b touch, n the unit vector from a to b
function crash_pair(a, b, nx, ny)
{
    // two in their pilots' hands are only kept apart (bodies_resolve), as a squadron flies
    if (!crash_is_loose(a) && !crash_is_loose(b)) {
        return;
    }
    const closing = (crash_vx(a) - crash_vx(b))*nx + (crash_vy(a) - crash_vy(b))*ny;
    if (closing <= 0) {
        return;
    }
    const ma = crash_weight(a);
    const mb = crash_weight(b);
    const j = (1 + crash_bounce)*closing/(1/ma + 1/mb);
    a.push_vx -= nx*j/ma;
    a.push_vy -= ny*j/ma;
    b.push_vx += nx*j/mb;
    b.push_vy += ny*j/mb;
    crash_spark(a.x + nx*a.r, a.y + ny*a.r, Math.atan2(ny, nx), closing);
    crash_hurt_raider(a, crash_damage(closing, ma, mb));
    crash_hurt_raider(b, crash_damage(closing, mb, ma));
}

// A loose raider against the solid things that do not fly (bodies_static: rocks, spires, the cliffs' rubble)
function crash_into_rocks(v)
{
    const {sx, sy, sr} = bodies_numbers;
    for (let k = 0, end = bodies_numbers.statics; k < end; ++k) {
        const min = v.r + sr[k];
        const dx = sx[k] - v.x;
        const dy = sy[k] - v.y;
        if ((Math.abs(dx) >= min) || (Math.abs(dy) >= min)) {
            continue;
        }
        const d = Math.hypot(dx, dy);
        if ((d >= min) || !d) {
            continue;
        }
        const nx = dx/d;
        const ny = dy/d;
        const into = crash_vx(v)*nx + crash_vy(v)*ny;
        if (into <= 0) {
            continue;
        }
        v.push_vx -= nx*into*(1 + crash_bounce);
        v.push_vy -= ny*into*(1 + crash_bounce);
        crash_spark(v.x + nx*v.r, v.y + ny*v.r, Math.atan2(ny, nx), into);
        crash_hurt_raider(v, crash_damage(into, crash_weight(v), Infinity));
        return;
    }
}

// Where two hulls meet: sparks by the speed of it, and the knock of a hit past 120 m/s
function crash_spark(x, y, angle, closing)
{
    explode_impact(x, y, angle + Math.PI, 8 + Math.min(14, closing/30), '#ffd27a', '#aab4bf');
    if (closing > 120) {
        sfx('impact', Math.min(1, closing/400), {x, y});
    }
}
