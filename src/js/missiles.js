// Missiles: the Seeker launcher's and the raiders', on one flight rule. Ejected slow, the motor lights and pushes to top
// speed while its fuel lasts, the seeker turns it toward its lock at a limited rate, so a nimble target can make it
// overshoot. Near a hostile hull the fuse sets it off: its blast is a wave whose front deals the damage as it reaches
// each hull and sets off the missiles it reaches. Burnt out, it coasts, slows and bursts in a small harmless wave.

// The rocket motors, one per Rocket motor level: top speed, thrust, burn seconds, flame and trail colours, how much
// smoke the trail leaves, and how long it stays (s); the drawing is weapons/projectile-missile, then -2, -3, -4
const missile_engines = [
    {name: 'Solid rocket', top: 760, accel: 1000, fuel: 1.5, flame: '#ffb27a', trail: '#ff9a68', smoke: 0.55, span: 0.4},
    {name: 'Hot-fuel rocket', top: 900, accel: 1300, fuel: 1.6, flame: '#ffe08a', trail: '#ffd36b', smoke: 0.3, span: 0.5},
    {name: 'Ion sustainer', top: 1040, accel: 1600, fuel: 1.7, flame: '#a8ecff', trail: '#6fd0ff', smoke: 0, span: 0.6},
    {name: 'Fusion torch', top: 1180, accel: 1900, fuel: 1.8, flame: '#eedcff', trail: '#b98cff', smoke: 0, span: 0.75},
];
// Seeker head levels: turn rate (rad/s) and lock range; at 3.5 the first motor turns in a circle of 220 m, inside the
// 300 m a fight is held at, so a missile comes round onto a raider that dodged it
const missile_seekers = [{turn: 3.5, lock: 900}, {turn: 4.2, lock: 1050}, {turn: 4.9, lock: 1200}, {turn: 5.6, lock: 1350}];
// Shaped warhead levels: blast radius and the share of the hit the raiders in it take
const missile_warheads = [{splash: 100, share: 0.6}, {splash: 125, share: 0.7}, {splash: 150, share: 0.8}, {splash: 175, share: 0.9}];
// The seeker sees 100° either side of the nose; a missile leaves at 420, splayed 0.3 rad by its cell, and its motor
// lights 0.12 s later; burnt out it flies on 0.9 s
const missile_cone = 1.75;
const missile_launch = 420;
const missile_splay = 0.3;
const missile_kick = 0.12;
const missile_coast = 0.9;
// Your missile goes off 18 units from a raider's hull, and a wave of 30 at its distance sets it off
const missile_fuse = 18;
const missile_hp = 30;
// The raiders' missiles by kind: drawing size, speed and turn, flight seconds, fuse (units from your hull or shield),
// blast radius and peak damage, the wave that sets it off, the drawing (else the stock missile) and its trail
const missile_kinds = {
    dart: {size: 11, speed: 1.3, turn: 1.25, life: 2, fuse: 6, blast: 45, damage: 14, hp: 8, art: 'weapons/projectile-dart', flame: '#fff0a8', trail: '#ffe08a', smoke: 0.2, span: 0.22},
    seeker: {size: 14, speed: 1, turn: 0.85, life: 2.5, fuse: 14, blast: 70, damage: 23, hp: 20, art: 'weapons/projectile-missile', flame: '#ffb27a', trail: '#ff9a68', smoke: 0.55, span: 0.3},
    torpedo: {size: 22, speed: 0.7, turn: 0.5, life: 3.4, fuse: 40, blast: 120, damage: 40, hp: 45, art: 'weapons/projectile-torpedo', flame: '#ff8a5c', trail: '#ff6a4a', smoke: 0.85, span: 0.5},
};
// A blast's front runs at 650 a second; a missile it sets off sends its own, three deep at most, 40 at once at most
const missile_wave_speed = 650;
const missile_chain_depth = 3;
const missile_wave_limit = 40;
// The blasts running now
let missile_waves = [];
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
        flight: m.fuel + missile_coast,
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
        side: 'player',
        size: 18,
        look: missile_engines[m.engine],
        fuse: missile_fuse,
        hp: missile_hp,
        splash: m.splash,
        // the blast falls off to `edge` of its peak at the rim, so the raiders round the one it went off at take the
        // warhead's share on average
        edge: 1 - 1.5*(1 - m.share),
    };
}

// The kind a raider fires: a tank a torpedo from Nova Forge on, a fighter (chaser, splitter, lancer) a dart, the rest
// (shooters, elites, flagships) the seeker
function missile_kind_for(enemy)
{
    if ((enemy.type === 'tank') && (campaign.world >= 6)) {
        return 'torpedo';
    }
    return (['chaser', 'splitter', 'lancer'].includes(enemy.type) && !enemy.elite) ? 'dart' : 'seeker';
}

// A raider's missile of a kind, launched at `speed` (the kind's share of the gun's) and always burning: it turns toward you
function missile_raider(kind, speed)
{
    const k = missile_kinds[kind];
    return {
        missile: true,
        kind,
        age: 0,
        life: k.life,
        flight: k.life,
        r: k.size*0.45,
        kick: 0,
        turn: k.turn,
        top: speed,
        accel: 0,
        fuel: k.life,
        damage: k.damage,
        side: 'raider',
        size: k.size,
        look: k,
        span: k.span,
        trail: [],
        fuse: k.fuse,
        hp: k.hp,
        splash: k.blast,
        edge: 0.5,
    };
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

// A raider's missile keeps up with the ship it chases, turbo included: it flies at this much the ship's speed now when
// that is more than its own. It turns no harder sideways than at its own speed (its turn rate falls as it speeds up), so
// a ship in turbo that turns hard shakes it, and one far enough ahead keeps its lead until the missile's flight ends.
const missile_chase = 1.15;

// One step of a missile's flight toward target (null: straight on); the world's projectile speed scales the motor
function missile_fly(b, target, dt)
{
    b.age += dt;
    const k = current_world_rules().projectile;
    const burning = b.age < b.fuel;
    let heading = Math.atan2(b.vy, b.vx);
    let speed = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
    if (burning && (b.age >= b.kick)) {
        // a marksman's missile (raider_aim) flies for where you will be when it gets there, not where you are
        if (target) {
            const t = b.lead ? Math.min(1, distance(b, target)/Math.max(1, speed)) : 0;
            const grip = (b.side === 'raider') ? Math.min(1, b.top*k/Math.max(1, speed)) : 1;
            heading = turn_toward(heading, Math.atan2(target.y + (target.vy || 0)*t - b.y, target.x + (target.vx || 0)*t - b.x), b.turn*grip*dt);
        }
        if ((b.side === 'raider') && target) {
            speed = Math.max(b.top*k, missile_chase*Math.sqrt((target.vx || 0)*(target.vx || 0) + (target.vy || 0)*(target.vy || 0)));
        }
        else if (speed < b.top*k) {
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

// Missiles that ended this frame leave their trail to fade; one that flew its whole flight without hitting bursts
function missile_wakes_keep(items)
{
    for (const b of items) {
        if (!b.missile || (b.life > 0) || b.waked) {
            continue;
        }
        b.waked = true;
        if (b.trail.length) {
            missile_wakes.push({trail: b.trail, age: b.age, span: b.span, look: b.look, size: b.size});
        }
        if (!b.exploded && (b.age >= b.flight - 0.05)) {
            missile_burst(b);
        }
    }
}

// The burst at the end of a flight: a small dim blast in the missile's colour and a small wave that hurts nothing
function missile_burst(b)
{
    const color = b.color || pink;
    explode(b.x, b.y, 9 + explosion_random()*3, color);
    explode(b.x, b.y, 8, '#c8ccd2', 0, 'spark');
    missile_wave_add(b, {reach: 45, peak: 0, depth: missile_chain_depth});
}

// The missile goes off where it is: a blast and its wave, `depth` steps down a chain
function missile_detonate(b, depth = 0)
{
    b.life = 0;
    b.exploded = true;
    explode(b.x, b.y, b.splash*0.3, b.color || pink);
    missile_wave_add(b, {reach: b.splash, peak: b.damage, depth});
}

function missile_wave_add(b, wave)
{
    if (missile_waves.length >= missile_wave_limit) {
        return;
    }
    missile_waves.push({x: b.x, y: b.y, r: 0, fade: 0, side: b.side, color: b.color || pink, fuse: b.fuse, edge: b.edge, hit: new Set([b]), ...wave});
}

// What the wave deals at `gap` units from its centre to a hull: its peak within the fuse, falling to `edge` of it at
// the rim
function missile_wave_damage(wave, gap)
{
    return wave.peak*(1 - (1 - wave.edge)*clamp((gap - wave.fuse)/Math.max(1, wave.reach - wave.fuse), 0, 1));
}

// Your missile's fuse: a raider's hull within its reach along this frame's flight
function missile_fuse_player(b, from)
{
    return enemies.some(v => (v.hp > 0) && (segment_distance(v, from, b) < v.r + b.fuse));
}

// A raider's missile's fuse: your shield's edge, or your hull without one, within its reach
function missile_fuse_raider(b)
{
    return distance(b, player) < missile_player_reach() + b.fuse;
}

// How far out a wave meets you: your shield's bubble while it holds, else the hull
function missile_player_reach()
{
    return (player.shield > 0) ? ship_halo() + 3 : player.r;
}

// The fronts run out: yours hurt raiders, theirs hurt you, as each reaches the hull; every front sets off the
// missiles it reaches whose toughness its damage there beats
function missile_waves_update(dt)
{
    for (const w of missile_waves) {
        if (w.r >= w.reach) {
            w.fade += dt/0.2;
            continue;
        }
        w.r = Math.min(w.reach, w.r + missile_wave_speed*dt);
        if (!w.peak) {
            continue;
        }
        if (w.side === 'player') {
            for (const v of enemies) {
                const gap = distance(w, v) - v.r;
                if ((v.hp > 0) && (gap <= w.r) && !w.hit.has(v)) {
                    w.hit.add(v);
                    damage_enemy(v, missile_wave_damage(w, gap));
                }
            }
        }
        else if (!w.hit.has(player)) {
            const reach = missile_player_reach();
            const gap = distance(w, player) - reach;
            if (gap <= w.r) {
                w.hit.add(player);
                // a bubble wider than the hull drains as if only what reached the hull hit it (as for any shot)
                const share = (player.shield > 0) ? (player.r + 7)/(reach + 7) : 1;
                damage_player(missile_wave_damage(w, gap)*(arcade.active ? arcade_mode().blast : 1)*share, true);
                if (player.shield > 0) {
                    shield_impact(player, w, reach);
                }
            }
        }
        if (w.depth >= missile_chain_depth) {
            continue;
        }
        // both lists as they are, not a copy of them: setting a missile off only adds a wave and a blast
        for (const items of [bullets, hostile]) {
            for (const b of items) {
                if (b.missile && (b.life > 0) && !w.hit.has(b) && (distance(w, b) <= w.r)) {
                    w.hit.add(b);
                    if (missile_wave_damage(w, distance(w, b)) >= b.hp) {
                        missile_detonate(b, w.depth + 1);
                    }
                }
            }
        }
    }
    missile_waves = missile_waves.filter(v => v.fade < 1);
}

// A wave: a band in the blast's colour behind a bright front, fading once it has reached its rim; a harmless one dimmer
function missile_waves_draw()
{
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const w of missile_waves) {
        if (w.r < 2) {
            continue;
        }
        const alpha = (w.peak ? 0.9 : 0.5)*(1 - (w.r/w.reach)*0.5)*(1 - w.fade);
        const inner = Math.max(0, w.r - Math.max(8, w.reach*0.25));
        const colors = missile_colors(w.color);
        const band = ctx.createRadialGradient(w.x, w.y, inner, w.x, w.y, w.r);
        band.addColorStop(0, colors.clear);
        band.addColorStop(0.8, colors.band);
        band.addColorStop(1, colors.rim);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = band;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI*2);
        ctx.arc(w.x, w.y, inner, 0, Math.PI*2, true);
        ctx.fill();
        ctx.strokeStyle = colors.front;
        ctx.lineWidth = w.peak ? 2.2 : 1.4;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI*2);
        ctx.stroke();
    }
    ctx.restore();
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
        missile_trail_draw(v.trail, v, v.age, v.span, v.look, v.size);
    }
    for (const v of group.items) {
        missile_draw(v, group.color);
    }
    if (!group.friendly) {
        return;
    }
    // each raider once, in the order of the first missile on it: no set or lists made each frame
    const items = group.items;
    for (let i = 0; i < items.length; ++i) {
        if (missile_locks(items[i]) && !missile_lock_seen(items, i)) {
            missile_lock_draw(items[i].target, group.color);
        }
    }
}

// A missile of yours still burning toward a raider alive
function missile_locks(v)
{
    return v.target && (v.target.hp > 0) && (v.age < v.fuel);
}

// Whether a missile before the i-th has locked the same raider
function missile_lock_seen(items, i)
{
    for (let j = 0; j < i; ++j) {
        if (missile_locks(items[j]) && (items[j].target === items[i].target)) {
            return true;
        }
    }
    return false;
}

function missile_wakes_draw()
{
    for (const v of missile_wakes) {
        missile_trail_draw(v.trail, null, v.age, v.span, v.look, v.size);
    }
}

// A trail: smoke puffs that swell and fade (a chemical motor's), and a glowing ribbon in the engine's colour, short
// and hot behind a chemical motor, the whole trail long behind an ion or fusion one. The trail's points and then the
// head's: read where they are, not copied into a list each frame.
function missile_trail_draw(trail, head, now, span, look, size)
{
    const count = trail.length + (head ? 1 : 0);
    if (count < 2) {
        return;
    }
    const k = size/18;
    ctx.save();
    if (look.smoke) {
        ctx.fillStyle = '#b4bcc6';
        for (let i = 0; i < count; ++i) {
            const v = (i < trail.length) ? trail[i] : head;
            const old = clamp((now - ((i < trail.length) ? v.t : now))/span, 0, 1);
            ctx.globalAlpha = look.smoke*(1 - old)*0.55;
            ctx.beginPath();
            ctx.arc(v.x, v.y, (1.6 + old*6)*k, 0, Math.PI*2);
            ctx.fill();
        }
    }
    // the hot points: all of them, or behind a chemical motor those under 0.12 s old
    let tail = -1;
    let end = -1;
    let hot = 0;
    for (let i = 0; i < count; ++i) {
        if (!look.smoke || ((now - ((i < trail.length) ? trail[i].t : now)) < 0.12)) {
            tail = (tail < 0) ? i : tail;
            end = i;
            ++hot;
        }
    }
    if (hot > 1) {
        const a = (tail < trail.length) ? trail[tail] : head;
        const b = (end < trail.length) ? trail[end] : head;
        const colors = missile_colors(look.trail);
        const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        g.addColorStop(0, colors.clear);
        g.addColorStop(1, colors.solid);
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = g;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        for (let i = tail; i <= end; ++i) {
            if (!look.smoke || ((now - ((i < trail.length) ? trail[i].t : now)) < 0.12)) {
                const v = (i < trail.length) ? trail[i] : head;
                ctx.lineTo(v.x, v.y);
            }
        }
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 7*k;
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 2.4*k;
        ctx.stroke();
    }
    ctx.restore();
}

// A trail's or a wave's colour as its gradients and its front take it, made once a colour (a motor's, a raider's
// missile kind's, a shooter's), not each frame; a few in a run, cleared past 64 all the same
const missile_colors_by_color = new Map();

function missile_colors(color)
{
    let out = missile_colors_by_color.get(color);
    if (!out) {
        if (missile_colors_by_color.size >= 64) {
            missile_colors_by_color.clear();
        }
        out = {
            clear: color_with_alpha(color, 0),
            band: color_with_alpha(color, 0.25),
            rim: color_with_alpha(color, 0.6),
            solid: color_with_alpha(color, 1),
            front: color_mix(color, '#ffffff', 0.6),
        };
        missile_colors_by_color.set(color, out);
    }
    return out;
}

// A missile's drawing: a raider's kind's or your engine's when the designer has drawn it, else the stock missile;
// null without either
function missile_sprite(v)
{
    const name = v.kind ? v.look.art : v.engine ? missile_engine_art[v.engine] : 'weapons/projectile-missile';
    return sprite(name) ? name : sprite('weapons/projectile-missile') ? 'weapons/projectile-missile' : null;
}

// The drawing of each motor past the first, its name made once, not per missile and frame
const missile_engine_art = missile_engines.map((v, i) => `weapons/projectile-missile-${i + 1}`);

// The flames of a missile's drawing at its size, worked out once a drawing and size: a few drawings at a few sizes
const missile_flames_by_name = new Map();

function missile_flames(name, size)
{
    let by_size = missile_flames_by_name.get(name);
    if (!by_size) {
        by_size = new Map();
        missile_flames_by_name.set(name, by_size);
    }
    let out = by_size.get(size);
    if (!out) {
        out = sprite_anchors_box(name, size).flames.main;
        by_size.set(size, out);
    }
    return out;
}

// One missile its size across its canvas, its band in the shooter's colour, its flame from the tail mark while the
// motor burns; a drawn rocket of lines when there is no drawing
function missile_draw(v, color)
{
    const angle = Math.atan2(v.vy, v.vx);
    const name = missile_sprite(v);
    const size = v.size;
    const lit = (v.age >= v.kick) && (v.age < v.fuel);
    const flames = name ? missile_flames(name, size) : [{x: -size*0.38, y: 0, dx: -size*0.3, dy: 0, width: size*0.12}];
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(angle);
    if (lit) {
        ctx.globalCompositeOperation = 'lighter';
        // full flame while it climbs to top speed, shorter at cruise
        const climbing = Math.hypot(v.vx, v.vy) < v.top*current_world_rules().projectile*0.97;
        sprite_flames(ctx, flames, (climbing ? 1.25 : 0.85) + (v.engine || 0)*0.15, v.look.flame, Math.sin(clock*40 + v.x)*0.2);
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
