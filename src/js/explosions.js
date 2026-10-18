// Explosions: a flash, a fireball, a shockwave, sparks, debris and smoke, in every view. Their randomness has a
// generator of its own, so an effect never changes what Math.random decides for the game.
let explosions = [];
let explosion_seed = 1;
let hull_smoke_timer = 0;
const explosion_limit = 140;
// What a blast leaves: smoke and a few hull fragments cooling from orange to dark as they drift, for a few seconds;
// bounded apart from the blasts, the oldest going first
let wrecks = [];
const wreck_limit = 10;
// The light of a blast covers a wide square: the newest few in a frame light the space, the rest go without
const explosion_light_limit = 2;
// the smallest blast of a ship (a shard's is 26, a raider's 40): smaller ones are shots' and leave no wreck or light
const explosion_ship_size = 36;
// A big kill holds the game still for a moment, the frame drawn and nothing moving (js/boot.js): at most once in
// 0.4 s, and never when the system asks for reduced motion
let hit_stop = 0;
let hit_stop_last = -1;
// The screen's own answer to a blast and to a hit on your hull, in seconds left: a white flash and a red edge
// (render_blast_screen), both only with full effects
let blast_flash = 0;
let hurt = 0;
const hurt_duration = 0.45;
// Lighter effects than a blast: how long each lasts, in seconds
const explosion_durations = {spark: 0.25, muzzle: 0.07, flash: 0.09, shield: 0.45, warp: 0.4, smoke: 0.9, impact: 0.38, collect: 0.34};

// size is the fireball's radius in world units: about 40 for a raider, 70 for a tank, 220 for a flagship;
// kind 'blast' is the full explosion, the others are the small effects listed in explosion_durations;
// shake and flash, for a blast, are what the screen does the moment it goes off (a delayed one included)
function explode(x, y, size, color, delay = 0, kind = 'blast', shake = 0, flash = 0)
{
    if (kind !== 'blast') {
        explosion_light_add(x, y, size, color, delay, kind);
        return;
    }
    const sparks = [];
    for (let i = 0, end = Math.round(6 + size/6); i < end; ++i) {
        sparks.push({angle: explosion_random()*Math.PI*2, speed: size*(2.2 + explosion_random()*3), length: 4 + explosion_random()*size*0.3});
    }
    const debris = [];
    for (let i = 0, end = Math.round(3 + size/12); i < end; ++i) {
        debris.push({
            angle: explosion_random()*Math.PI*2,
            speed: size*(0.7 + explosion_random()*1.6),
            spin: (explosion_random() - 0.5)*14,
            size: 1.5 + explosion_random()*size*0.12,
            sides: 3 + Math.floor(explosion_random()*2),
        });
    }
    const puffs = [];
    for (let i = 0, end = 3 + Math.floor(explosion_random()*2); i < end; ++i) {
        const angle = explosion_random()*Math.PI*2;
        puffs.push({x: Math.cos(angle)*size*0.45, y: Math.sin(angle)*size*0.45, size: size*(0.35 + explosion_random()*0.3), delay: explosion_random()*0.12});
    }
    const duration = 0.7 + size/180;
    // the debris is the hull, burnt dark; a color given another way burns plain dark
    const hull = /^#[0-9a-f]{6}$/i.test(color) ? color_mix(color, '#1a171c', 0.55) : '#2a2528';
    explosions.push({x, y, size, color, hull, kind, t: -delay, duration, sparks, debris, puffs, shake, flash, lit: false});
    if (explosions.length > explosion_limit) {
        explosions.splice(0, explosions.length - explosion_limit);
    }
    // a ship leaves a wreck; a missile's blast and smaller go without
    if (full_fx && (size >= explosion_ship_size)) {
        wreck_add(x, y, size, hull, delay + duration*0.3, Math.round(1 + size/30));
    }
}

// A flagship goes down in a chain of blasts across its hull, each one felt, then one large one that whitens the
// screen and leaves its hull in burning pieces.
function explode_flagship(x, y, r, color)
{
    for (let i = 0; i < 7; ++i) {
        const angle = explosion_random()*Math.PI*2;
        const d = r*(0.3 + explosion_random()*0.9);
        explode(x + Math.cos(angle)*d, y + Math.sin(angle)*d, 50 + explosion_random()*40, color, i*0.17, 'blast', 7);
    }
    explode(x, y, 220, color, 1.25, 'blast', 26, 0.55);
    if (full_fx) {
        wreck_add(x, y, r*1.6, explosions[explosions.length - 1].hull, 1.25, 9);
    }
}

// Your own ship: three blasts break the hull, then one large one, with a shake, a white flash and the pieces
function explode_ship_death(x, y, r)
{
    for (let i = 0; i < 3; ++i) {
        const angle = explosion_random()*Math.PI*2;
        explode(x + Math.cos(angle)*r*0.6, y + Math.sin(angle)*r*0.6, 28 + explosion_random()*12, '#e8743b', i*0.09, 'blast', 6);
    }
    explode(x, y, 120, cyan, 0.3, 'blast', 24, 0.45);
    hull_break_player();
    if (full_fx) {
        wreck_add(x, y, Math.max(40, r*2), '#4a3a34', 0.3, 7);
    }
    hurt = hurt_duration*2;
}

// smoke and `count` hull fragments of the color `hull` where a blast of `size` went off, `delay` seconds from now
function wreck_add(x, y, size, hull, delay, count)
{
    const puffs = [];
    for (let i = 0, end = 2 + Math.floor(explosion_random()*3); i < end; ++i) {
        const angle = explosion_random()*Math.PI*2;
        const speed = size*(0.12 + explosion_random()*0.25);
        puffs.push({x: Math.cos(angle)*size*0.3, y: Math.sin(angle)*size*0.3, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, size: size*(0.25 + explosion_random()*0.25)});
    }
    const shards = [];
    for (let i = 0; i < count; ++i) {
        const angle = explosion_random()*Math.PI*2;
        const speed = size*(0.3 + explosion_random()*0.8);
        shards.push({
            x: Math.cos(angle)*size*0.2,
            y: Math.sin(angle)*size*0.2,
            vx: Math.cos(angle)*speed,
            vy: Math.sin(angle)*speed,
            angle: explosion_random()*Math.PI*2,
            spin: (explosion_random() - 0.5)*3,
            size: Math.min(26, 3.5 + size*(0.05 + explosion_random()*0.07)),
        });
    }
    wrecks.push({x, y, size, hull, t: -delay, duration: 2.4 + Math.min(2.2, size/100), puffs, shards, seen: false, p: 0, fade: 0, travel: 0, heat: 0});
    if (wrecks.length > wreck_limit) {
        wrecks.splice(0, wrecks.length - wreck_limit);
    }
}

// A shot that strikes a hull: a white star where it struck, sparks thrown back the way the shot came, and chips of
// the hull in its own color; angle is the shot's heading
function explode_impact(x, y, angle, size, color, hull_color)
{
    const sparks = [];
    for (let i = 0; i < 7; ++i) {
        sparks.push({angle: angle + Math.PI + (explosion_random() - 0.5)*2.2, speed: size*(7 + explosion_random()*9), length: 4 + explosion_random()*size*0.8});
    }
    const debris = [];
    for (let i = 0; i < 3; ++i) {
        debris.push({angle: angle + Math.PI + (explosion_random() - 0.5)*2.6, speed: size*(4 + explosion_random()*5), spin: (explosion_random() - 0.5)*18, size: 2 + explosion_random()*2.5, sides: 3});
    }
    // the sparks in the shot's colour, whitened: a cyan bolt splashes cyan, a raider's red
    const spark_color = /^#[0-9a-f]{6}$/i.test(color) ? color_mix(color, '#ffffff', 0.55) : '#fff1c8';
    explosions.push({x, y, size, color, hull_color, spark_color, angle, kind: 'impact', t: 0, duration: explosion_durations.impact, sparks, debris, puffs: []});
    if (explosions.length > explosion_limit) {
        explosions.splice(0, explosions.length - explosion_limit);
    }
}

// A gun's flash at its muzzle: a glow in the shot's colour, a flare thrown along the shot and a white heart; size
// by the gun (muzzle_flash_sizes), angle the shot's heading
function explode_muzzle(x, y, angle, size, color)
{
    explosions.push({x, y, size, color, angle, kind: 'flash', t: 0, duration: explosion_durations.flash, sparks: [], debris: [], puffs: []});
    if (explosions.length > explosion_limit) {
        explosions.splice(0, explosions.length - explosion_limit);
    }
}

// A pickup taken: a ring in its color closing on your ship and sparks drawn into the hull, so what you took shows
// where you are looking; drawn where the ship is, as it flies on
function explode_collect(color)
{
    if (!player) {
        return;
    }
    const sparks = [];
    for (let i = 0; i < 6; ++i) {
        sparks.push({angle: explosion_random()*Math.PI*2, speed: 0, length: 5 + explosion_random()*7});
    }
    explosions.push({x: player.x, y: player.y, size: 24, color, kind: 'collect', t: 0, duration: explosion_durations.collect, sparks, debris: [], puffs: []});
    if (explosions.length > explosion_limit) {
        explosions.splice(0, explosions.length - explosion_limit);
    }
}

function hit_stop_start(seconds)
{
    if (!full_fx || (clock - hit_stop_last < 0.4)) {
        return;
    }
    hit_stop = Math.max(hit_stop, seconds);
    hit_stop_last = clock;
}

function explosion_light_add(x, y, size, color, delay, kind)
{
    const sparks = [];
    const count = (kind === 'spark') ? 5 : (kind === 'shield') ? 12 : 0;
    for (let i = 0; i < count; ++i) {
        sparks.push({angle: explosion_random()*Math.PI*2, speed: size*(4 + explosion_random()*5), length: 3 + explosion_random()*size*0.5});
    }
    const drift = {x: (explosion_random() - 0.5)*20, y: -10 - explosion_random()*25};
    explosions.push({x, y, size, color, kind, t: -delay, duration: explosion_durations[kind], sparks, debris: [], puffs: [], drift});
    if (explosions.length > explosion_limit) {
        explosions.splice(0, explosions.length - explosion_limit);
    }
}

function explosion_random()
{
    explosion_seed = (explosion_seed*1664525 + 1013904223) >>> 0;
    return explosion_seed/4294967296;
}

function update_explosions(dt)
{
    for (const explosion of explosions) {
        // the moment a blast goes off, delayed or not, the screen answers it
        if ((explosion.t <= 0) && (explosion.t + dt > 0) && (explosion.shake || explosion.flash)) {
            shake = Math.max(shake, explosion.shake);
            blast_flash = Math.max(blast_flash, explosion.flash);
        }
        explosion.t += dt;
    }
    explosions = explosions.filter(v => v.t < v.duration);
    for (const wreck of wrecks) {
        wreck.t += dt;
    }
    wrecks = wrecks.filter(v => v.t < v.duration);
    blast_flash = Math.max(0, blast_flash - dt);
    hurt = Math.max(0, hurt - dt);
    for (const enemy of enemies) {
        if (enemy.shield_flash) {
            enemy.shield_flash = Math.max(0, enemy.shield_flash - dt);
        }
    }
    if (player && player.shield_flash) {
        player.shield_flash = Math.max(0, player.shield_flash - dt);
    }
    update_hull_damage(dt);
    update_enemy_wounds(dt);
    update_hull_breaks(dt);
    update_raider_trails(dt);
}

// Below a third of its hull your ship trails smoke and throws sparks.
function update_hull_damage(dt)
{
    if (!player || (state !== 'playing') || (player.hp >= hull_max()/3) || (player.hp <= 0)) {
        return;
    }
    hull_smoke_timer -= dt;
    if (hull_smoke_timer > 0) {
        return;
    }
    hull_smoke_timer = 0.09 + explosion_random()*0.08;
    const back = player.angle + Math.PI;
    const x = player.x + Math.cos(back)*10 + (explosion_random() - 0.5)*10;
    const y = player.y + Math.sin(back)*10 + (explosion_random() - 0.5)*10;
    explode(x, y, 9 + explosion_random()*5, '#5b5550', 0, 'smoke');
    if (explosion_random() < 0.3) {
        explode(x, y, 6, '#ffb347', 0, 'spark');
    }
}

// Below a third of its hull a raider in view trails smoke and throws sparks, as yours does: the next shots read as
// the last. Blasts come first: the wounds wait while the explosions are past 60% of their limit.
function update_enemy_wounds(dt)
{
    if (state !== 'playing') {
        return;
    }
    for (const enemy of enemies) {
        if ((enemy.hp <= 0) || !enemy.max_hp || (enemy.hp >= enemy.max_hp/3) || !in_view(enemy, 120)) {
            continue;
        }
        enemy.wound_timer = (enemy.wound_timer || 0) - dt;
        if ((enemy.wound_timer > 0) || (explosions.length > explosion_limit*0.6)) {
            continue;
        }
        const r = enemy.r || 18;
        enemy.wound_timer = 0.12 + explosion_random()*0.1;
        const x = enemy.x + (explosion_random() - 0.5)*r;
        const y = enemy.y + (explosion_random() - 0.5)*r;
        // lighter than your own ship's smoke: a raider burns against dark space, not against your hull
        explode(x, y, r*0.75 + explosion_random()*6, '#a39d96', 0, 'smoke');
        if (explosion_random() < 0.5) {
            explode(x, y, 10, '#ffb347', 0, 'spark');
        }
    }
}

// Ore rocks glow gold, so a rock you can mine never looks like one you can only hit.
function ore_glow(v)
{
    const pulse = (Math.sin(clock*2.2 + v.x*0.013) + 1)/2;
    const glow = ctx.createRadialGradient(v.x, v.y, v.r*0.4, v.x, v.y, v.r*1.7);
    glow.addColorStop(0, color_with_alpha(ore_color(v), 0.16 + pulse*0.14 + (v.resource ? 0.12 : 0)));
    glow.addColorStop(1, color_with_alpha(ore_color(v), 0));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    explosion_circle(v.x, v.y, v.r*1.7);
    ctx.fill();
    ctx.restore();
}

// Three gold veins across an ore rock, drawn in its own rotated frame
function ore_veins(v)
{
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `${ore_color(v)}cc`;
    ctx.lineWidth = Math.max(1.2, v.r*0.06);
    ctx.beginPath();
    ctx.moveTo(-v.r*0.55, -v.r*0.1);
    ctx.lineTo(-v.r*0.15, -v.r*0.3);
    ctx.lineTo(v.r*0.25, -v.r*0.15);
    ctx.moveTo(-v.r*0.35, v.r*0.35);
    ctx.lineTo(0, v.r*0.12);
    ctx.lineTo(v.r*0.45, v.r*0.3);
    ctx.moveTo(v.r*0.1, -v.r*0.55);
    ctx.lineTo(v.r*0.05, -v.r*0.2);
    ctx.stroke();
    ctx.restore();
}

// Pickups twinkle: a small four-pointed star that comes and goes on each of them
function render_pickup_glints()
{
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#fff6d8';
    ctx.lineWidth = 1.2;
    for (const pickup of pickups) {
        const twinkle = (Math.sin(clock*3 + (pickup.phase || 0)*2 + pickup.x*0.01) + 1)/2;
        if ((twinkle < 0.55) || !in_view(pickup, 20)) {
            continue;
        }
        const r = 4 + twinkle*5;
        const x = pickup.x + 5;
        const y = pickup.y - 5;
        ctx.globalAlpha = (twinkle - 0.55)/0.45;
        ctx.beginPath();
        ctx.moveTo(x - r, y);
        ctx.lineTo(x + r, y);
        ctx.moveTo(x, y - r);
        ctx.lineTo(x, y + r);
        ctx.stroke();
    }
    ctx.restore();
}

// A full bright ring over the shield arc for the moment after a hit
function shield_shimmer(target, radius)
{
    if (!target.shield_flash) {
        return;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = target.shield_flash/0.18;
    ctx.strokeStyle = '#cfeaff';
    ctx.lineWidth = 3;
    explosion_circle(target.x, target.y, radius);
    ctx.stroke();
    ctx.restore();
}

// A shot the shield took: a bright arc on the shield where it struck, fading over 0.4 s, a ripple running round the
// bubble both ways from there, and a few sparks; the newest 48 are kept
const shield_impacts = [];

function shield_impact(target, shot, radius)
{
    const angle = Math.atan2(shot.y - target.y, shot.x - target.x);
    shield_impacts.push({target, angle, radius, time: clock});
    if (shield_impacts.length > 48) {
        shield_impacts.splice(0, shield_impacts.length - 48);
    }
    explode(target.x + Math.cos(angle)*radius, target.y + Math.sin(angle)*radius, 7, '#bfe4ff', 0, 'muzzle');
}

function render_shield_impacts()
{
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = shield_impacts.length - 1; i >= 0; --i) {
        const v = shield_impacts[i];
        const age = (clock - v.time)/0.4;
        if ((age < 0) || (age >= 1)) {
            shield_impacts.splice(i, 1);
            continue;
        }
        const x = v.target.x;
        const y = v.target.y;
        const spread = 0.35 + age*0.5;
        const radius = v.radius + age*3;
        ctx.globalAlpha = 1 - age;
        ctx.strokeStyle = '#d6efff';
        ctx.lineWidth = 3.5 - age*2;
        ctx.beginPath();
        ctx.arc(x, y, radius, v.angle - spread, v.angle + spread);
        ctx.stroke();
        ctx.strokeStyle = '#8d9cff';
        ctx.lineWidth = 8;
        ctx.globalAlpha = (1 - age)*0.25;
        ctx.stroke();
        // the ripple: two short arcs running away from the point round the bubble, thinning as they go
        const run = 0.5 + age*2.2;
        ctx.globalAlpha = (1 - age)*(1 - age)*0.85;
        ctx.strokeStyle = '#bfe4ff';
        ctx.lineWidth = Math.max(0.8, 2.2*(1 - age));
        ctx.beginPath();
        ctx.arc(x, y, radius, v.angle + run - 0.22, v.angle + run + 0.22);
        ctx.moveTo(x + Math.cos(v.angle - run - 0.22)*radius, y + Math.sin(v.angle - run - 0.22)*radius);
        ctx.arc(x, y, radius, v.angle - run - 0.22, v.angle - run + 0.22);
        ctx.stroke();
    }
    ctx.restore();
}

// A shield that takes a hit shimmers; one that breaks bursts in blue.
function shield_hit_show(target, before)
{
    if ((before > 0) && ((target.shield || 0) < before)) {
        target.shield_flash = 0.18;
        if ((target.shield || 0) <= 0) {
            // sized so its ring starts on the bubble that broke (render_equipment, render_enemies)
            const bubble = (target === player) ? ship_halo() + 3 : (target.r || 18) + 8;
            explode(target.x, target.y, bubble/0.8, '#8fd0ff', 0, 'shield');
        }
    }
}

// Drawn in world units: the wrecks under the blasts, so a fresh fireball burns over the smoke of an old one. The lists
// are walked by index here and in the drawings below: called once a frame, they run unoptimized for a long while, where
// each step of an iterator is an object.
function render_explosions()
{
    let lights = explosion_light_limit;
    for (let i = explosions.length - 1; i >= 0; --i) {
        const v = explosions[i];
        v.lit = (lights > 0) && (v.kind === 'blast') && (v.size >= explosion_ship_size) && (v.t >= 0) && (v.t < v.duration*0.3) && in_view(v, v.size*3);
        lights -= v.lit ? 1 : 0;
    }
    render_wrecks();
    render_hull_breaks();
    for (let i = 0; i < explosions.length; ++i) {
        const explosion = explosions[i];
        if ((explosion.t >= 0) && in_view(explosion, explosion.size*3)) {
            explosion_draw(explosion, explosion.x, explosion.y, 1);
        }
    }
}

function explosion_draw(explosion, x, y, scale)
{
    if (explosion.kind !== 'blast') {
        explosion_light_draw(explosion, x, y, scale);
        return;
    }
    const p = explosion.t/explosion.duration;
    const ease = 1 - Math.pow(1 - p, 3);
    const size = explosion.size*scale;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // the first moments of a ship's blast light the space around: a warm glow wider than the fireball, gone in under
    // a third of the blast (a scaled image costs by its area: kept small, two at a time)
    if (full_fx && explosion.lit && (p < 0.3)) {
        const light = 1 - p/0.3;
        ctx.globalAlpha = light*light*0.6;
        const r = size*(1.4 + p*2);
        ctx.drawImage(explosion_light_sprite(), x - r, y - r, r*2, r*2);
    }
    if (p < 0.16) {
        ctx.globalAlpha = 1 - p/0.16;
        ctx.fillStyle = '#ffffff';
        explosion_circle(x, y, size*(0.3 + p*2));
        ctx.fill();
    }
    explosion_fireball(x, y, size*(0.35 + ease*0.75), p, explosion.color);
    for (let i = 0; i < explosion.puffs.length; ++i) {
        const puff = explosion.puffs[i];
        const q = clamp((explosion.t - puff.delay)/(explosion.duration*0.8), 0, 1);
        if (q > 0) {
            explosion_fireball(x + puff.x*scale*(0.4 + q), y + puff.y*scale*(0.4 + q), puff.size*scale*(0.4 + q*0.8), q, explosion.color);
        }
    }
    // the shockwave: a crisp white-hot front and the blast's color in a wider band behind it, racing out and thinning
    const wave = size*(0.4 + Math.pow(Math.min(1, p*1.6), 0.5)*2.2);
    ctx.globalAlpha = (1 - p)*(1 - p)*0.5;
    ctx.strokeStyle = explosion.color;
    ctx.lineWidth = Math.max(1, size*0.16*(1 - p));
    explosion_circle(x, y, wave - size*0.05*(1 - p));
    ctx.stroke();
    ctx.globalAlpha = Math.max(0, 1 - p*1.4)*0.9;
    ctx.strokeStyle = '#fff4e0';
    ctx.lineWidth = Math.max(1, size*0.035*(1 - p));
    explosion_circle(x, y, wave);
    ctx.stroke();
    // embers fly out and cool: white, gold, orange, then a dark red as they slow
    ctx.globalAlpha = Math.min(1, (1 - p)*1.6);
    ctx.strokeStyle = explosion_ember_color(p);
    ctx.lineWidth = Math.max(1, 1.6*scale);
    ctx.beginPath();
    for (let i = 0; i < explosion.sparks.length; ++i) {
        const spark = explosion.sparks[i];
        const d = spark.speed*scale*explosion.t*(1 - p*0.5);
        const cos = Math.cos(spark.angle);
        const sin = Math.sin(spark.angle);
        const length = spark.length*scale*(1 - p*0.7);
        ctx.moveTo(x + cos*Math.max(0, d - length), y + sin*Math.max(0, d - length));
        ctx.lineTo(x + cos*d, y + sin*d);
    }
    ctx.stroke();
    // debris: pieces of the burnt hull, their edges glowing hot as they fly, in one path
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = (1 - p)*0.9;
    ctx.fillStyle = explosion.hull;
    ctx.beginPath();
    for (let j = 0; j < explosion.debris.length; ++j) {
        const piece = explosion.debris[j];
        const d = piece.speed*scale*explosion.t*(1 - p*0.4);
        const px = x + Math.cos(piece.angle)*d;
        const py = y + Math.sin(piece.angle)*d;
        for (let i = 0; i < piece.sides; ++i) {
            const a = piece.spin*explosion.t + (i/piece.sides)*Math.PI*2;
            const r = piece.size*scale*((i % 2) ? 0.6 : 1);
            if (i === 0) {
                ctx.moveTo(px + Math.cos(a)*r, py + Math.sin(a)*r);
            }
            else {
                ctx.lineTo(px + Math.cos(a)*r, py + Math.sin(a)*r);
            }
        }
        ctx.closePath();
    }
    ctx.fill();
    if (p < 0.6) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1 - p/0.6;
        ctx.strokeStyle = explosion_ember_color(p + 0.15);
        ctx.lineWidth = Math.max(1, scale);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    }
    // Smoke rises late, in loose puffs, faint enough never to read as a hole on a bright sky.
    if (p > 0.4) {
        const q = (p - 0.4)/0.6;
        ctx.globalAlpha = (1 - q)*0.16;
        ctx.fillStyle = '#3a3532';
        for (let i = 0; i < explosion.puffs.length; ++i) {
            const puff = explosion.puffs[i];
            explosion_circle(x + puff.x*scale*(0.8 + q), y + puff.y*scale*(0.8 + q) - size*0.2*q, puff.size*scale*(0.6 + q));
            ctx.fill();
        }
    }
    ctx.restore();
}

// In the screen's units, over the scene: a blast's white flash, and a red edge for a hit on your hull, deepest at the
// corners so the middle of the fight stays clear
let hurt_edge = null;
let hurt_edge_key = '';

function render_blast_screen()
{
    if (!full_fx || ((blast_flash <= 0) && (hurt <= 0))) {
        return;
    }
    ctx.save();
    if (blast_flash > 0) {
        ctx.fillStyle = `rgba(255, 246, 232, ${Math.min(0.38, blast_flash*0.75)})`;
        ctx.fillRect(0, 0, W, H);
    }
    if (hurt > 0) {
        // drawn once a size into a canvas an eighth of the screen's, and stretched over it: a radial gradient over the
        // whole screen costs several times a copy, and a copy of a canvas the screen's size rasters the whole frame
        // there and then (12 ms a frame in bin/perf's fight-w6), where a small one costs nothing
        const width = Math.round(W/8);
        const height = Math.round(H/8);
        const key = `${width}:${height}`;
        if (hurt_edge_key !== key) {
            hurt_edge = document.createElement('canvas');
            hurt_edge.width = width;
            hurt_edge.height = height;
            const draw = hurt_edge.getContext('2d');
            const g = draw.createRadialGradient(width/2, height/2, Math.min(width, height)*0.32, width/2, height/2, Math.hypot(width, height)*0.55);
            g.addColorStop(0, 'rgba(255, 40, 50, 0)');
            g.addColorStop(0.6, 'rgba(255, 40, 50, 0.22)');
            g.addColorStop(1, 'rgba(255, 30, 40, 0.6)');
            draw.fillStyle = g;
            draw.fillRect(0, 0, width, height);
            hurt_edge_key = key;
        }
        ctx.globalAlpha = Math.min(1, hurt/hurt_duration);
        ctx.drawImage(hurt_edge, 0, 0, W, H);
    }
    ctx.restore();
}

// White, gold, orange, then dark red, as p goes from 0 to 1
function explosion_ember_color(p)
{
    return (p < 0.18) ? '#fff6e0' : (p < 0.4) ? '#ffd27a' : (p < 0.65) ? '#ff8a3d' : '#b8361f';
}

// A soft warm light, white at its heart, drawn once and scaled to every blast
let explosion_light_canvas = null;

function explosion_light_sprite()
{
    if (!explosion_light_canvas) {
        explosion_light_canvas = document.createElement('canvas');
        explosion_light_canvas.width = explosion_light_canvas.height = 128;
        const draw = explosion_light_canvas.getContext('2d');
        const g = draw.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(255, 246, 225, 1)');
        g.addColorStop(0.18, 'rgba(255, 210, 140, 0.6)');
        g.addColorStop(0.45, 'rgba(255, 140, 70, 0.22)');
        g.addColorStop(1, 'rgba(255, 110, 50, 0)');
        draw.fillStyle = g;
        draw.fillRect(0, 0, 128, 128);
    }
    return explosion_light_canvas;
}

// What a blast leaves: smoke spreading and thinning, and hull fragments turning slowly as they drift apart, their
// edges glowing orange, then dark red, then cold. The wrecks share their fills: the smoke and the glowing edges are
// drawn in three steps of fading for all of them at once, so the cost stays a few calls however many there are.
function render_wrecks()
{
    ctx.save();
    for (let i = 0; i < wrecks.length; ++i) {
        const wreck = wrecks[i];
        wreck.seen = (wreck.t >= 0) && in_view(wreck, wreck.size*3);
        if (!wreck.seen) {
            continue;
        }
        const p = wreck.t/wreck.duration;
        wreck.p = p;
        wreck.fade = Math.min(1, wreck.t/0.35)*(1 - p);
        wreck.travel = wreck.duration*0.5*(1 - Math.pow(1 - p, 2));
        wreck.heat = (p < 0.7) ? Math.min(1, wreck.t/0.2)*(1 - p/0.7) : 0;
    }
    ctx.fillStyle = '#5c5652';
    for (let step = 0; step < 3; ++step) {
        // a wide faint fill and a denser heart: soft at the cost of plain fills
        for (let layer = 0; layer < 2; ++layer) {
            const k = layer ? 0.55 : 1;
            ctx.globalAlpha = ((3 - step)/3)*((k === 1) ? 0.12 : 0.14);
            ctx.beginPath();
            for (let i = 0; i < wrecks.length; ++i) {
                const wreck = wrecks[i];
                if (!wreck.seen || (wreck_step(wreck.fade) !== step)) {
                    continue;
                }
                for (let j = 0; j < wreck.puffs.length; ++j) {
                    const puff = wreck.puffs[j];
                    const px = wreck.x + puff.x + puff.vx*wreck.travel;
                    const py = wreck.y + puff.y + puff.vy*wreck.travel;
                    const r = puff.size*(0.7 + wreck.p*0.9)*k;
                    ctx.moveTo(px + r, py);
                    ctx.arc(px, py, r, 0, Math.PI*2);
                }
            }
            ctx.fill();
        }
    }
    for (let i = 0; i < wrecks.length; ++i) {
        const wreck = wrecks[i];
        if (wreck.seen) {
            ctx.globalAlpha = Math.min(1, wreck.fade*1.4);
            ctx.fillStyle = wreck.hull;
            ctx.beginPath();
            wreck_shards_trace(wreck);
            ctx.fill();
        }
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1.4;
    for (let step = 0; step < 3; ++step) {
        ctx.globalAlpha = (3 - step)/3;
        ctx.strokeStyle = explosion_ember_color(0.3 + step*0.2);
        ctx.beginPath();
        for (let i = 0; i < wrecks.length; ++i) {
            const wreck = wrecks[i];
            if (wreck.seen && (wreck.heat > 0) && (wreck_step(wreck.heat) === step)) {
                wreck_shards_trace(wreck);
            }
        }
        ctx.stroke();
    }
    ctx.restore();
}

// 0 for a value near 1, 1 for one near 2/3, 2 for one near 1/3 and below
function wreck_step(v)
{
    return (v > 0.66) ? 0 : (v > 0.33) ? 1 : 2;
}

function wreck_shards_trace(wreck)
{
    for (let i = 0; i < wreck.shards.length; ++i) {
        const shard = wreck.shards[i];
        const px = wreck.x + shard.x + shard.vx*wreck.travel;
        const py = wreck.y + shard.y + shard.vy*wreck.travel;
        const a = shard.angle + shard.spin*wreck.t;
        const r = shard.size;
        ctx.moveTo(px + Math.cos(a)*r, py + Math.sin(a)*r);
        ctx.lineTo(px + Math.cos(a + 2.1)*r*0.55, py + Math.sin(a + 2.1)*r*0.55);
        ctx.lineTo(px + Math.cos(a + 3.3)*r*0.9, py + Math.sin(a + 3.3)*r*0.9);
        ctx.lineTo(px + Math.cos(a + 4.6)*r*0.45, py + Math.sin(a + 4.6)*r*0.45);
        ctx.closePath();
    }
}

function explosion_light_draw(explosion, x, y, scale)
{
    if (explosion.kind === 'impact') {
        explosion_impact_draw(explosion, x, y, scale);
        return;
    }
    if (explosion.kind === 'collect') {
        explosion_collect_draw(explosion, scale);
        return;
    }
    if (explosion.kind === 'flash') {
        explosion_flash_draw(explosion, x, y, scale);
        return;
    }
    const p = explosion.t/explosion.duration;
    const size = explosion.size*scale;
    ctx.save();
    if (explosion.kind === 'smoke') {
        ctx.globalAlpha = (1 - p)*0.32;
        ctx.fillStyle = explosion.color;
        explosion_circle(x + explosion.drift.x*explosion.t*scale, y + explosion.drift.y*explosion.t*scale, size*(0.6 + p*1.4));
        ctx.fill();
        ctx.restore();
        return;
    }
    ctx.globalCompositeOperation = 'lighter';
    if (explosion.kind === 'muzzle') {
        explosion_fireball(x, y, size*(1 - p*0.4), p, explosion.color);
    }
    if ((explosion.kind === 'spark') || (explosion.kind === 'warp')) {
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = '#ffffff';
        explosion_circle(x, y, size*(0.35 + p*0.5)*((explosion.kind === 'warp') ? 1.4 : 1));
        ctx.fill();
    }
    // a shield that breaks flares: the whole bubble lights up and comes apart in pieces of arc flying outward
    if (explosion.kind === 'shield') {
        const r = size*(0.8 + p*0.2);
        if (p < 0.4) {
            ctx.globalAlpha = (1 - p/0.4)*0.35;
            ctx.fillStyle = explosion.color;
            explosion_circle(x, y, r);
            ctx.fill();
        }
        ctx.globalAlpha = (1 - p)*(1 - p);
        ctx.strokeStyle = '#e6f6ff';
        ctx.lineWidth = Math.max(1, 2.4*scale*(1 - p*0.6));
        ctx.beginPath();
        for (let i = 0; i < 8; ++i) {
            const a = (i/8)*Math.PI*2 + p*0.4;
            const d = r + size*p*0.6*(1 + (i % 3)*0.3);
            ctx.moveTo(x + Math.cos(a)*d, y + Math.sin(a)*d);
            ctx.arc(x, y, d, a, a + 0.5*(1 - p*0.5));
        }
        ctx.stroke();
    }
    if ((explosion.kind === 'shield') || (explosion.kind === 'warp')) {
        ctx.globalAlpha = (1 - p)*0.9;
        ctx.strokeStyle = explosion.color;
        ctx.lineWidth = Math.max(1, size*0.08*(1 - p));
        explosion_circle(x, y, (explosion.kind === 'warp') ? size*(1.6 - p*1.2) : size*(0.8 + p*0.9));
        ctx.stroke();
    }
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = (explosion.kind === 'shield') ? '#d8f0ff' : '#ffe9b0';
    ctx.lineWidth = Math.max(1, 1.3*scale);
    ctx.beginPath();
    for (let i = 0; i < explosion.sparks.length; ++i) {
        const spark = explosion.sparks[i];
        const d = spark.speed*scale*explosion.t;
        const cos = Math.cos(spark.angle);
        const sin = Math.sin(spark.angle);
        ctx.moveTo(x + cos*Math.max(0, d - spark.length*scale), y + sin*Math.max(0, d - spark.length*scale));
        ctx.lineTo(x + cos*d, y + sin*d);
    }
    ctx.stroke();
    ctx.restore();
}

// The star is widest across the shot's line, so where a hit came from reads at a glance; the sparks and chips follow it.
function explosion_impact_draw(explosion, x, y, scale)
{
    const p = explosion.t/explosion.duration;
    const size = explosion.size*scale;
    const fade = (1 - p)*(1 - p);
    const across = explosion.angle + Math.PI/2;
    const long = size*(2.4 - p*1.6);
    const short = size*(1.1 - p*0.7);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    // a glow in the shot's colour for the first 60% of the hit, and a ring of it splashing out; the glow is kept
    // small, as a beam lands thirty hits a second
    if (full_fx) {
        if (p < 0.6) {
            const r = size*(1.3 + p);
            ctx.globalAlpha = (1 - p/0.6)*0.75;
            ctx.drawImage(shot_glow(explosion.color), x - r, y - r, r*2, r*2);
        }
        ctx.globalAlpha = fade*0.7;
        ctx.strokeStyle = explosion.color;
        ctx.lineWidth = Math.max(1, 2*scale*(1 - p));
        explosion_circle(x, y, size*(0.5 + Math.sqrt(p)*1.5));
        ctx.stroke();
    }
    ctx.globalAlpha = fade;
    ctx.fillStyle = '#ffffff';
    explosion_circle(x, y, size*0.42*(1 - p*0.6));
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, 2.2*scale*(1 - p*0.5));
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(across)*long, y - Math.sin(across)*long);
    ctx.lineTo(x + Math.cos(across)*long, y + Math.sin(across)*long);
    ctx.moveTo(x - Math.cos(explosion.angle)*short, y - Math.sin(explosion.angle)*short);
    ctx.lineTo(x + Math.cos(explosion.angle)*short, y + Math.sin(explosion.angle)*short);
    ctx.stroke();
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = explosion.spark_color;
    ctx.lineWidth = Math.max(1, 1.4*scale);
    ctx.beginPath();
    for (let i = 0; i < explosion.sparks.length; ++i) {
        const spark = explosion.sparks[i];
        const d = spark.speed*scale*explosion.t*(1 - p*0.45);
        const cos = Math.cos(spark.angle);
        const sin = Math.sin(spark.angle);
        ctx.moveTo(x + cos*Math.max(0, d - spark.length*scale), y + sin*Math.max(0, d - spark.length*scale));
        ctx.lineTo(x + cos*d, y + sin*d);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = (1 - p)*0.95;
    ctx.fillStyle = explosion.hull_color;
    for (let i = 0; i < explosion.debris.length; ++i) {
        const piece = explosion.debris[i];
        const d = piece.speed*scale*explosion.t;
        const px = x + Math.cos(piece.angle)*d;
        const py = y + Math.sin(piece.angle)*d;
        const a = piece.spin*explosion.t;
        const r = piece.size*scale;
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a)*r, py + Math.sin(a)*r);
        ctx.lineTo(px + Math.cos(a + 2.4)*r*0.7, py + Math.sin(a + 2.4)*r*0.7);
        ctx.lineTo(px + Math.cos(a + 4.2)*r*0.8, py + Math.sin(a + 4.2)*r*0.8);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

// The flare is a spike along the shot, two short ones across it at the start, over a glow; all gone in 0.09 s
function explosion_flash_draw(explosion, x, y, scale)
{
    const p = explosion.t/explosion.duration;
    const size = explosion.size*scale;
    const cos = Math.cos(explosion.angle);
    const sin = Math.sin(explosion.angle);
    const long = size*(2.8 - p*1.4);
    const wide = size*0.5*(1 - p*0.5);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (full_fx) {
        const r = size*(1.8 - p*0.8);
        ctx.globalAlpha = (1 - p)*0.85;
        ctx.drawImage(shot_glow(explosion.color), x - r, y - r, r*2, r*2);
    }
    ctx.globalAlpha = 1 - p;
    ctx.fillStyle = explosion.color;
    ctx.beginPath();
    ctx.moveTo(x + cos*long, y + sin*long);
    ctx.lineTo(x - sin*wide, y + cos*wide);
    ctx.lineTo(x - cos*size*0.4, y - sin*size*0.4);
    ctx.lineTo(x + sin*wide, y - cos*wide);
    ctx.closePath();
    ctx.fill();
    if (p < 0.5) {
        const across = size*1.2*(1 - p*2);
        ctx.strokeStyle = explosion.color;
        ctx.lineWidth = Math.max(1, size*0.18);
        ctx.beginPath();
        ctx.moveTo(x - sin*across, y + cos*across);
        ctx.lineTo(x + sin*across, y - cos*across);
        ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    explosion_circle(x, y, size*0.42*(1 - p*0.5));
    ctx.fill();
    ctx.restore();
}

function explosion_collect_draw(explosion, scale)
{
    const p = explosion.t/explosion.duration;
    const size = explosion.size*scale;
    const x = player ? player.x : explosion.x;
    const y = player ? player.y : explosion.y;
    const radius = size*(1.7 - p*1.25);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.globalAlpha = (1 - p)*0.9;
    ctx.strokeStyle = explosion.color;
    ctx.lineWidth = Math.max(1, 2.6*scale*(1 - p*0.5));
    explosion_circle(x, y, radius);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, 1.4*scale);
    ctx.beginPath();
    for (let i = 0; i < explosion.sparks.length; ++i) {
        const spark = explosion.sparks[i];
        const cos = Math.cos(spark.angle);
        const sin = Math.sin(spark.angle);
        const outer = radius + spark.length*scale*(1 - p);
        ctx.moveTo(x + cos*outer, y + sin*outer);
        ctx.lineTo(x + cos*radius, y + sin*radius);
    }
    ctx.stroke();
    if (p > 0.6) {
        ctx.globalAlpha = (1 - p)/0.4;
        ctx.fillStyle = explosion.color;
        explosion_circle(x, y, size*0.55*(p - 0.4));
        ctx.fill();
    }
    ctx.restore();
}

// White core, gold, orange, then the color of what blew up, fading as p goes from 0 to 1.
function explosion_fireball(x, y, radius, p, color)
{
    const fireball = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, radius));
    fireball.addColorStop(0, `rgba(255, 252, 240, ${(1 - p)*0.95})`);
    fireball.addColorStop(0.15, `rgba(255, 226, 140, ${(1 - p)*0.9})`);
    fireball.addColorStop(0.4, `rgba(255, 140, 60, ${(1 - p)*0.75})`);
    fireball.addColorStop(0.75, color_with_alpha(color, (1 - p)*0.35));
    fireball.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = fireball;
    explosion_circle(x, y, radius);
    ctx.fill();
}

function explosion_circle(x, y, r)
{
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI*2);
}

// A colour's 'rgba(r, g, b, ' parsed once, null for one that passes through; bounded, since some colours are computed
const rgba_prefix_by_color = new Map();

// '#ff5baf' and alpha 0.5 -> 'rgba(255, 91, 175, 0.5)'; other colors pass through as they are
function color_with_alpha(color, alpha)
{
    let prefix = rgba_prefix_by_color.get(color);
    if (prefix === undefined) {
        prefix = null;
        if (/^#[0-9a-f]{6}/i.test(color)) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            prefix = `rgba(${r}, ${g}, ${b}, `;
        }
        if (rgba_prefix_by_color.size >= 512) {
            rgba_prefix_by_color.clear();
        }
        rgba_prefix_by_color.set(color, prefix);
    }
    if (prefix === null) {
        return color;
    }
    return `${prefix}${alpha})`;
}
