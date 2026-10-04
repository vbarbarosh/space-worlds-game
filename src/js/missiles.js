// Missiles: the Seeker launcher's and the raiders', on one flight rule. Ejected slow, the motor lights and pushes to top
// speed while its fuel lasts, the seeker turns it toward its lock at a limited rate, so a nimble target can make it
// overshoot; burnt out, it coasts, slows and fizzles. The launcher's three modules (seeker, motor, warhead) tune it.

// The rocket motors, one per Rocket motor level: top speed, thrust, burn seconds, flame and trail colours, how much
// smoke the trail leaves, and how long it stays (s); the drawing is weapons/projectile-missile, then -2, -3, -4
const missile_engines = [
    {name: 'Solid rocket', top: 760, accel: 1000, fuel: 1.5, flame: '#ffb27a', trail: '#ff9a68', smoke: 0.55, span: 0.4},
    {name: 'Hot-fuel rocket', top: 900, accel: 1300, fuel: 1.6, flame: '#ffe08a', trail: '#ffd36b', smoke: 0.3, span: 0.5},
    {name: 'Ion sustainer', top: 1040, accel: 1600, fuel: 1.7, flame: '#a8ecff', trail: '#6fd0ff', smoke: 0, span: 0.6},
    {name: 'Fusion torch', top: 1180, accel: 1900, fuel: 1.8, flame: '#eedcff', trail: '#b98cff', smoke: 0, span: 0.75},
];
// Seeker head levels: turn rate (rad/s) and lock range
const missile_seekers = [{turn: 2, lock: 900}, {turn: 2.7, lock: 1050}, {turn: 3.4, lock: 1200}, {turn: 4.1, lock: 1350}];
// Shaped warhead levels: blast radius and the share of the hit the raiders in it take
const missile_warheads = [{splash: 100, share: 0.6}, {splash: 125, share: 0.7}, {splash: 150, share: 0.8}, {splash: 175, share: 0.9}];
// The seeker sees 100° either side of the nose; a missile leaves at 260, splayed 0.3 rad by its cell, and its motor
// lights 0.12 s later; burnt out it flies on 0.9 s
const missile_cone = 1.75;
const missile_launch = 260;
const missile_splay = 0.3;
const missile_kick = 0.12;
const missile_coast = 0.9;
// The trails of missiles gone, fading where they were
let missile_wakes = [];

// The launcher's missile with the modules you have
function missile_stats()
{
    return {
        ...missile_engines[upgrades.motor || 0],
        engine: upgrades.motor || 0,
        ...missile_seekers[upgrades.seeker || 0],
        ...missile_warheads[upgrades.warhead || 0],
    };
}

// A missile out of the launcher's cell `barrel` at muzzle, aimed at angle, locked on the best raider ahead
function missile_new(muzzle, angle, barrel, damage, weapon, carry)
{
    const m = missile_stats();
    const a = angle + ((barrel % 2) ? missile_splay : -missile_splay);
    return {
        x: muzzle.x,
        y: muzzle.y,
        vx: Math.cos(a)*(missile_launch + carry),
        vy: Math.sin(a)*(missile_launch + carry),
        life: m.fuel + missile_coast,
        damage,
        r: 7,
        weapon: weapon.id,
        color: weapon.color,
        missile: true,
        age: 0,
        kick: missile_kick,
        turn: m.turn,
        lock: m.lock,
        top: m.top,
        accel: m.accel,
        fuel: m.fuel,
        engine: m.engine,
        span: m.span,
        trail: [],
        target: missile_lock_find(muzzle, angle, m.lock),
        splash: m.splash,
        splash_share: m.share,
    };
}

// A raider's missile, launched at its full speed and always burning: it turns toward you at 0.85 rad/s
function missile_raider(speed, life)
{
    return {missile: true, age: 0, kick: 0, turn: 0.85, top: speed, accel: 0, fuel: life, engine: 0, span: 0.3, trail: []};
}

// The raider the seeker takes from `from` looking along angle: in its view and reach, the nearest and most ahead
function missile_lock_find(from, angle, range)
{
    let out = null;
    let best = Infinity;
    for (const enemy of enemies) {
        const d = distance(from, enemy);
        const off = Math.abs(angle_delta(angle, Math.atan2(enemy.y - from.y, enemy.x - from.x)));
        if ((enemy.hp > 0) && (d < range) && (off < missile_cone) && (d*(1 + off) < best)) {
            out = enemy;
            best = d*(1 + off);
        }
    }
    return out;
}

// The player's missile: it keeps its lock while the raider lives, is still here and stays in the seeker's view;
// lost, the seeker takes the next raider ahead while the motor burns
function missile_guide(b, dt)
{
    const heading = Math.atan2(b.vy, b.vx);
    const t = b.target;
    if (t && ((t.hp <= 0) || !enemies.includes(t) || (distance(b, t) > b.lock) || (Math.abs(angle_delta(heading, Math.atan2(t.y - b.y, t.x - b.x))) > missile_cone))) {
        b.target = null;
    }
    if (!b.target && (b.age >= b.kick) && (b.age < b.fuel)) {
        b.target = missile_lock_find(b, heading, b.lock);
    }
    missile_fly(b, b.target, dt);
}

// One step of a missile's flight toward target (null: straight on); the world's projectile speed scales the motor
function missile_fly(b, target, dt)
{
    b.age += dt;
    const k = current_world_rules().projectile;
    const burning = b.age < b.fuel;
    let heading = Math.atan2(b.vy, b.vx);
    let speed = Math.hypot(b.vx, b.vy);
    if (burning && (b.age >= b.kick)) {
        if (target) {
            heading = turn_toward(heading, Math.atan2(target.y - b.y, target.x - b.x), b.turn*dt);
        }
        if (speed < b.top*k) {
            speed = Math.min(b.top*k, speed + b.accel*k*dt);
        }
    }
    else if (!burning) {
        speed *= Math.pow(0.6, dt);
    }
    b.vx = Math.cos(heading)*speed;
    b.vy = Math.sin(heading)*speed;
    // the exhaust leaves a point every 15 ms while the motor burns; points older than the trail's span go
    if (burning && (b.age >= b.kick) && (!b.trail.length || (b.age - b.trail.at(-1).t > 0.015))) {
        b.trail.push({x: b.x, y: b.y, t: b.age});
    }
    while (b.trail.length && (b.age - b.trail[0].t > b.span)) {
        b.trail.shift();
    }
}

function angle_delta(from, to)
{
    return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

// Missiles that ended this frame leave their trail to fade; one that ran out of flight without hitting fizzles
function missile_wakes_keep(items)
{
    for (const b of items) {
        if (!b.missile || (b.life > 0) || b.waked) {
            continue;
        }
        b.waked = true;
        if (b.trail.length) {
            missile_wakes.push({trail: b.trail, age: b.age, span: b.span, engine: b.engine});
        }
        if (!b.exploded && (b.age >= b.fuel + missile_coast - 0.05)) {
            explode(b.x, b.y, 7, '#c8ccd2', 0, 'spark');
        }
    }
}

function missile_wakes_update(dt)
{
    for (const v of missile_wakes) {
        v.age += dt;
        while (v.trail.length && (v.age - v.trail[0].t > v.span)) {
            v.trail.shift();
        }
    }
    missile_wakes = missile_wakes.filter(v => v.trail.length > 1);
}

// The missiles of one group (render_projectiles): wakes and trails under them, then each missile, then a bracket on
// every raider a missile of yours has locked
function missile_group_draw(group)
{
    for (const v of group.items) {
        missile_trail_draw(v.trail, v, v.age, v.span, missile_engines[v.engine || 0]);
    }
    for (const v of group.items) {
        missile_draw(v, group.color, group.friendly ? 18 : 14);
    }
    if (!group.friendly) {
        return;
    }
    const locked = new Set(group.items.filter(v => v.target && (v.target.hp > 0) && (v.age < v.fuel)).map(v => v.target));
    for (const t of locked) {
        missile_lock_draw(t, group.color);
    }
}

function missile_wakes_draw()
{
    for (const v of missile_wakes) {
        missile_trail_draw(v.trail, null, v.age, v.span, missile_engines[v.engine]);
    }
}

// A trail: smoke puffs that swell and fade (a chemical motor's), and a glowing ribbon in the engine's colour, short
// and hot behind a chemical motor, the whole trail long behind an ion or fusion one
function missile_trail_draw(trail, head, now, span, engine)
{
    const points = head ? [...trail, {x: head.x, y: head.y, t: now}] : trail;
    if (points.length < 2) {
        return;
    }
    ctx.save();
    if (engine.smoke) {
        ctx.fillStyle = '#b4bcc6';
        for (const v of points) {
            const old = clamp((now - v.t)/span, 0, 1);
            ctx.globalAlpha = engine.smoke*(1 - old)*0.55;
            ctx.beginPath();
            ctx.arc(v.x, v.y, 1.6 + old*6, 0, Math.PI*2);
            ctx.fill();
        }
    }
    const hot = engine.smoke ? points.filter(v => (now - v.t) < 0.12) : points;
    if (hot.length > 1) {
        const tail = hot[0];
        const end = hot.at(-1);
        const g = ctx.createLinearGradient(tail.x, tail.y, end.x, end.y);
        g.addColorStop(0, color_with_alpha(engine.trail, 0));
        g.addColorStop(1, color_with_alpha(engine.trail, 1));
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = g;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        for (const v of hot) {
            ctx.lineTo(v.x, v.y);
        }
        for (const [width, alpha] of [[7, 0.25], [2.4, 0.9]]) {
            ctx.globalAlpha = alpha;
            ctx.lineWidth = width;
            ctx.stroke();
        }
    }
    ctx.restore();
}

// The drawing for an engine: its own when the designer has drawn it, else the stock missile; null without either
function missile_sprite(engine)
{
    const name = engine ? `weapons/projectile-missile-${engine + 1}` : 'weapons/projectile-missile';
    return sprite(name) ? name : sprite('weapons/projectile-missile') ? 'weapons/projectile-missile' : null;
}

// One missile `size` units across its canvas, its band in the shooter's colour, its flame from the tail mark while
// the motor burns; a drawn rocket of lines when there is no drawing
function missile_draw(v, color, size)
{
    const angle = Math.atan2(v.vy, v.vx);
    const name = missile_sprite(v.engine || 0);
    const engine = missile_engines[v.engine || 0];
    const lit = (v.age >= v.kick) && (v.age < v.fuel);
    const flames = name ? sprite_anchors_box(name, size).flames.main : [{x: -size*0.38, y: 0, dx: -size*0.3, dy: 0, width: size*0.12}];
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(angle);
    if (lit) {
        ctx.globalCompositeOperation = 'lighter';
        // full flame while it climbs to top speed, shorter at cruise
        const climbing = Math.hypot(v.vx, v.vy) < v.top*current_world_rules().projectile*0.97;
        sprite_flames(ctx, flames, (climbing ? 1.25 : 0.85) + v.engine*0.15, engine.flame, Math.sin(clock*40 + v.x)*0.2);
        ctx.globalCompositeOperation = 'source-over';
    }
    if (!name || !sprite_draw_box(name, color, size, 0, 0, 0)) {
        missile_vector_draw(size, color);
    }
    ctx.restore();
}

// The fallback rocket, nose along +x: a pale body, dark fins, a band in the shooter's colour
function missile_vector_draw(size, color)
{
    const s = size/32;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.2*s;
    ctx.strokeStyle = '#0b1722';
    ctx.fillStyle = '#5d6874';
    ctx.beginPath();
    ctx.moveTo(-3*s, -2.5*s);
    ctx.lineTo(-10.5*s, -8*s);
    ctx.lineTo(-9*s, -2.5*s);
    ctx.moveTo(-3*s, 2.5*s);
    ctx.lineTo(-10.5*s, 8*s);
    ctx.lineTo(-9*s, 2.5*s);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#d8dde3';
    ctx.beginPath();
    ctx.moveTo(-10*s, -3*s);
    ctx.lineTo(6*s, -3*s);
    ctx.quadraticCurveTo(13*s, -3*s, 14*s, 0);
    ctx.quadraticCurveTo(13*s, 3*s, 6*s, 3*s);
    ctx.lineTo(-10*s, 3*s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(3*s, -3*s, 3.5*s, 6*s);
    ctx.strokeRect(3*s, -3*s, 3.5*s, 6*s);
}

// Four corner ticks round a locked raider, turning slowly
function missile_lock_draw(t, color)
{
    const r = t.r + 10;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(clock*1.6);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 4; ++i) {
        ctx.rotate(Math.PI/2);
        ctx.beginPath();
        ctx.moveTo(r, r*0.45);
        ctx.lineTo(r, r);
        ctx.lineTo(r*0.45, r);
        ctx.stroke();
    }
    ctx.restore();
}
