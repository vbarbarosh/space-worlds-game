// Explosions: a flash, a fireball, a shockwave, sparks, debris and smoke, in every view. Their randomness has a
// generator of its own, so an effect never changes what Math.random decides for the game.
let explosions = [];
let explosion_seed = 1;
let hull_smoke_timer = 0;
const explosion_limit = 140;
// Lighter effects than a blast: how long each lasts, in seconds
const explosion_durations = {spark: 0.25, muzzle: 0.07, shield: 0.45, warp: 0.4, smoke: 0.9};

// size is the fireball's radius in world units: about 40 for a raider, 70 for a tank, 220 for a flagship;
// kind 'blast' is the full explosion, the others are the small effects listed in explosion_durations
function explode(x, y, size, color, delay = 0, kind = 'blast')
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
    explosions.push({x, y, size, color, kind, t: -delay, duration: 0.7 + size/180, sparks, debris, puffs});
    if (explosions.length > explosion_limit) {
        explosions.splice(0, explosions.length - explosion_limit);
    }
}

// A flagship goes down in a chain of blasts across its hull, then one large one.
function explode_flagship(x, y, r, color)
{
    for (let i = 0; i < 7; ++i) {
        const angle = explosion_random()*Math.PI*2;
        const d = r*(0.3 + explosion_random()*0.9);
        explode(x + Math.cos(angle)*d, y + Math.sin(angle)*d, 50 + explosion_random()*40, color, i*0.17);
    }
    explode(x, y, 220, color, 1.25);
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
        explosion.t += dt;
    }
    explosions = explosions.filter(v => v.t < v.duration);
    for (const enemy of enemies) {
        if (enemy.shield_flash) {
            enemy.shield_flash = Math.max(0, enemy.shield_flash - dt);
        }
    }
    if (player && player.shield_flash) {
        player.shield_flash = Math.max(0, player.shield_flash - dt);
    }
    update_hull_damage(dt);
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

// A shot the shield took: a bright arc on the shield where it struck, fading over 0.4 s, and a few sparks
const shield_impacts = [];

function shield_impact(target, shot, radius)
{
    const angle = Math.atan2(shot.y - target.y, shot.x - target.x);
    shield_impacts.push({target, angle, radius, time: clock});
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
        const spread = 0.35 + age*0.5;
        ctx.globalAlpha = 1 - age;
        ctx.strokeStyle = '#d6efff';
        ctx.lineWidth = 3.5 - age*2;
        ctx.beginPath();
        ctx.arc(v.target.x, v.target.y, v.radius + age*3, v.angle - spread, v.angle + spread);
        ctx.stroke();
        ctx.strokeStyle = '#8d9cff';
        ctx.lineWidth = 8;
        ctx.globalAlpha = (1 - age)*0.25;
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
            explode(target.x, target.y, (target.r || 18)*1.7, '#8fd0ff', 0, 'shield');
        }
    }
}

// Drawn in world units.
function render_explosions()
{
    for (const explosion of explosions) {
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
    if (p < 0.16) {
        ctx.globalAlpha = 1 - p/0.16;
        ctx.fillStyle = '#ffffff';
        explosion_circle(x, y, size*(0.3 + p*2));
        ctx.fill();
    }
    explosion_fireball(x, y, size*(0.35 + ease*0.75), p, explosion.color);
    for (const puff of explosion.puffs) {
        const q = clamp((explosion.t - puff.delay)/(explosion.duration*0.8), 0, 1);
        if (q > 0) {
            explosion_fireball(x + puff.x*scale*(0.4 + q), y + puff.y*scale*(0.4 + q), puff.size*scale*(0.4 + q*0.8), q, explosion.color);
        }
    }
    ctx.globalAlpha = (1 - p)*0.8;
    ctx.strokeStyle = explosion.color;
    ctx.lineWidth = Math.max(1, size*0.07*(1 - p));
    explosion_circle(x, y, size*(0.4 + ease*2.2));
    ctx.stroke();
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = '#ffe9b0';
    ctx.lineWidth = Math.max(1, 1.6*scale);
    ctx.beginPath();
    for (const spark of explosion.sparks) {
        const d = spark.speed*scale*explosion.t*(1 - p*0.5);
        const cos = Math.cos(spark.angle);
        const sin = Math.sin(spark.angle);
        ctx.moveTo(x + cos*Math.max(0, d - spark.length*scale), y + sin*Math.max(0, d - spark.length*scale));
        ctx.lineTo(x + cos*d, y + sin*d);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = explosion.color;
    for (const piece of explosion.debris) {
        const d = piece.speed*scale*explosion.t*(1 - p*0.4);
        const px = x + Math.cos(piece.angle)*d;
        const py = y + Math.sin(piece.angle)*d;
        ctx.globalAlpha = (1 - p)*0.9;
        ctx.beginPath();
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
        ctx.fill();
    }
    // Smoke rises late, in loose puffs, faint enough never to read as a hole on a bright sky.
    if (p > 0.4) {
        const q = (p - 0.4)/0.6;
        ctx.globalAlpha = (1 - q)*0.16;
        ctx.fillStyle = '#3a3532';
        for (const puff of explosion.puffs) {
            explosion_circle(x + puff.x*scale*(0.8 + q), y + puff.y*scale*(0.8 + q) - size*0.2*q, puff.size*scale*(0.6 + q));
            ctx.fill();
        }
    }
    ctx.restore();
}

function explosion_light_draw(explosion, x, y, scale)
{
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
    for (const spark of explosion.sparks) {
        const d = spark.speed*scale*explosion.t;
        const cos = Math.cos(spark.angle);
        const sin = Math.sin(spark.angle);
        ctx.moveTo(x + cos*Math.max(0, d - spark.length*scale), y + sin*Math.max(0, d - spark.length*scale));
        ctx.lineTo(x + cos*d, y + sin*d);
    }
    ctx.stroke();
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

// '#ff5baf' and alpha 0.5 -> 'rgba(255, 91, 175, 0.5)'; other colors pass through as they are
function color_with_alpha(color, alpha)
{
    if (!/^#[0-9a-f]{6}/i.test(color)) {
        return color;
    }
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
