// The pulse (Space): a ring leaves the ship and hits each raider, rock and shot as its front reaches it, harder close
// by. A kill blows up a beat later and sends a smaller ring of its own: a chain (docs/balance.md, The pulse).
let pulse_waves = [];
let pulse_fuses = [];
let pulse_sparks = [];
let pulse_glow = 0;
let pulse_chain_box = null;
// the kill being dealt right now: its chain depth, read by the score (pulse_score_scale); -1 outside the pulse
let pulse_strike_depth = -1;
// kills of the last pulse for the HUD counter, and how long it stays up after the last one
const pulse_chain = {count: 0, timer: 0, shown: ''};
const pulse_bent = {x: 0, y: 0};
const pulse_speed = 760;
const pulse_push = 220;
// damage falls by 45% from the ship to the edge; divided by the area mean (0.7), a crowd takes what it took before
const pulse_falloff = 0.45;
const pulse_falloff_mean = 1 - pulse_falloff*2/3;
const pulse_chain_speed = 560;
const pulse_chain_push = 140;
const pulse_chain_radius = 110;
// a chain ring deals 20% of the pulse's damage, and each step is 0.82 of the last in reach and damage
const pulse_chain_damage = 0.2;
const pulse_chain_shrink = 0.82;
const pulse_chain_depth = 3;
const pulse_looks = {
    main: {color: '#6cf8ec', edge: '#e8fdff', alt: '#ff5baf', width: 70},
    chain: {color: '#ffb35c', edge: '#fff2d6', alt: '#ff5d6c', width: 18},
};

function pulse_clear()
{
    pulse_waves = [];
    pulse_fuses = [];
    pulse_sparks = [];
    pulse_glow = 0;
    pulse_chain.count = 0;
    pulse_chain.timer = 0;
}

// The main ring from the ship: 480 m, 140 damage on average (320 on a flagship), each amplifier level +80 m, +60 (+120)
function pulse_fire(x, y)
{
    const base = 140 + upgrades.pulse*60;
    pulse_waves.push(pulse_wave_create(x, y, 0, 480 + upgrades.pulse*80, base, 320 + upgrades.pulse*120, base, null));
    pulse_glow = 0.3;
    pulse_chain.count = 0;
    pulse_chain.timer = 0;
}

function pulse_wave_create(x, y, depth, reach, damage, boss_damage, base, source)
{
    const sparks = [];
    for (let i = 0, end = (depth ? 18 : 90)*(full_fx ? 1 : 0.4); i < end; ++i) {
        sparks.push({angle: explosion_random()*Math.PI*2, offset: -6 + explosion_random()*16, size: 1 + explosion_random()*1.6, life: 0.5 + explosion_random()*0.5});
    }
    const speed = depth ? pulse_chain_speed*(0.85 + 0.15*Math.pow(pulse_chain_shrink, depth - 1)) : pulse_speed;
    return {x, y, depth, reach, damage, boss_damage, base, r: 0, previous: 0, speed, fade: 0, hit: new Set(source ? [source] : []), sparks};
}

function pulse_update(dt)
{
    pulse_glow = Math.max(0, pulse_glow - dt);
    for (const wave of pulse_waves) {
        wave.previous = wave.r;
        wave.r = Math.min(wave.reach, wave.r + wave.speed*dt);
        if (!wave.depth) {
            pulse_wave_clear_shots(wave);
        }
        for (const enemy of enemies) {
            if ((enemy.hp > 0) && pulse_wave_reaches(wave, enemy)) {
                pulse_hit(wave, enemy, 'raider');
            }
        }
        for (const piece of drifting_debris.slice()) {
            if (pulse_wave_reaches(wave, piece)) {
                pulse_hit(wave, piece, 'debris');
            }
        }
        // ore rocks break only in the arcade, as under your guns; in the campaign the rings pass them by
        if (arcade.active) {
            for (const rock of ore_nodes) {
                if ((rock.hp > 0) && pulse_wave_reaches(wave, rock)) {
                    pulse_hit(wave, rock, 'ore');
                }
            }
        }
        if (wave.r >= wave.reach) {
            wave.fade += dt*4;
        }
    }
    pulse_waves = pulse_waves.filter(v => v.fade < 1);
    for (const fuse of pulse_fuses) {
        fuse.t -= dt;
    }
    const due = pulse_fuses.filter(v => v.t <= 0);
    pulse_fuses = pulse_fuses.filter(v => v.t > 0);
    for (const fuse of due) {
        delete fuse.target.pulse_fuse;
        pulse_strike(fuse);
    }
    for (const enemy of enemies) {
        if (enemy.push_vx || enemy.push_vy) {
            enemy.x = clamp(enemy.x + enemy.push_vx*dt, 24, world.w - 24);
            enemy.y = clamp(enemy.y + enemy.push_vy*dt, 24, world.h - 24);
            const drag = Math.pow(0.25, dt);
            enemy.push_vx = (Math.abs(enemy.push_vx) > 2) ? enemy.push_vx*drag : 0;
            enemy.push_vy = (Math.abs(enemy.push_vy) > 2) ? enemy.push_vy*drag : 0;
        }
    }
    pulse_sparks_update(dt);
    pulse_chain_update(dt);
}

// The front crossed the target this frame: its edge is inside the ring, and it was not behind the front before
function pulse_wave_reaches(wave, target)
{
    if (wave.hit.has(target)) {
        return false;
    }
    const d = distance(wave, target);
    return (d - target.r <= wave.r) && (d + target.r >= wave.previous - 4);
}

// The main ring wipes raiders' shots as its front passes them
function pulse_wave_clear_shots(wave)
{
    for (const shot of hostile) {
        const d = distance(wave, shot);
        if ((shot.life > 0) && (d <= wave.r) && (d >= wave.previous - 8)) {
            shot.life = 0;
            explode(shot.x, shot.y, 6, cyan, 0, 'spark');
        }
    }
}

// A target the front reached: it flashes, throws sparks and is pushed away; a lethal hit waits on a fuse
function pulse_hit(wave, target, kind)
{
    wave.hit.add(target);
    const d = distance(wave, target);
    const fall = wave.depth ? 1 : 1 - pulse_falloff*Math.min(1, d/wave.reach);
    const damage = ((target.type === 'boss') ? wave.boss_damage : wave.damage)*(wave.depth ? 1 : fall/pulse_falloff_mean);
    const nx = (target.x - wave.x)/(d || 1);
    const ny = (target.y - wave.y)/(d || 1);
    const push = (wave.depth ? pulse_chain_push : pulse_push)*fall;
    if (kind === 'raider') {
        const heft = (target.type === 'boss') ? 0.1 : (target.type === 'tank') ? 0.5 : 1;
        target.push_vx = (target.push_vx || 0) + nx*push*heft;
        target.push_vy = (target.push_vy || 0) + ny*push*heft;
        target.flash = 0.12;
    }
    if (kind === 'debris') {
        target.vx += nx*push*0.3;
        target.vy += ny*push*0.3;
        const speed = Math.hypot(target.vx, target.vy);
        if (speed > 160) {
            target.vx *= 160/speed;
            target.vy *= 160/speed;
        }
    }
    pulse_sparks_add(target.x, target.y, nx, ny, wave.depth ? pulse_looks.chain.color : pulse_looks.main.color, 8);
    if (target.pulse_fuse) {
        return;
    }
    const strike = {target, kind, damage, depth: wave.depth, base: wave.base};
    if (pulse_lethal(target, kind, damage)) {
        target.pulse_fuse = true;
        pulse_fuses.push({...strike, t: pulse_fuse_delay(target, wave.depth)});
        return;
    }
    pulse_strike(strike);
}

// Whether the damage takes the last hull: a raider's shield soaks first and armour cuts the rest, as in damage_enemy
function pulse_lethal(target, kind, damage)
{
    if (kind !== 'raider') {
        return damage >= target.hp;
    }
    if (target.leviathan && !target.core_kill) {
        return false;
    }
    return (damage - Math.min(target.shield || 0, damage))*(1 - (target.armor || 0)) >= target.hp;
}

// 0.05-0.14 s after the front, later down the chain; from the target's place, not from dice: it decides the chain's timing
function pulse_fuse_delay(target, depth)
{
    const k = Math.abs(target.x*0.0137 + target.y*0.0071) % 1;
    return 0.05 + 0.09*k + 0.03*depth;
}

// The damage lands through the game's own damage; a target it destroys counts on the HUD and sends a chain ring
function pulse_strike(strike)
{
    const target = strike.target;
    const alive = (strike.kind === 'debris') ? drifting_debris.includes(target) : target.hp > 0;
    if (!alive) {
        return;
    }
    if (strike.kind === 'raider') {
        pulse_strike_depth = strike.depth;
        damage_enemy(target, strike.damage);
        pulse_strike_depth = -1;
    }
    if (strike.kind === 'debris') {
        drifting_debris_hit(target, strike.damage);
    }
    if (strike.kind === 'ore') {
        damage_ore(target, strike.damage);
    }
    const dead = (strike.kind === 'debris') ? !drifting_debris.includes(target) : target.hp <= 0;
    if (!dead) {
        return;
    }
    pulse_chain.count++;
    pulse_chain.timer = 1.2;
    const depth = strike.depth + 1;
    if (depth > pulse_chain_depth) {
        return;
    }
    const big = (target.type === 'boss') || (target.type === 'tank') || target.elite;
    const step = Math.pow(pulse_chain_shrink, depth - 1);
    const damage = strike.base*pulse_chain_damage*step;
    pulse_waves.push(pulse_wave_create(target.x, target.y, depth, pulse_chain_radius*step*(big ? 1.35 : 1), damage, damage, strike.base, target));
}

// Arcade only: a kill down a chain scores ×(1 + 0.5 × its depth); the ring from the ship itself scores as before
function pulse_score_scale()
{
    return (arcade.active && (pulse_strike_depth > 0)) ? 1 + 0.5*pulse_strike_depth : 1;
}

function pulse_sparks_add(x, y, nx, ny, color, count)
{
    const heading = Math.atan2(ny, nx);
    for (let i = 0, end = full_fx ? count : count/2; i < end; ++i) {
        const angle = heading + (explosion_random() - 0.5)*1.4;
        const speed = 120 + explosion_random()*200;
        const life = 0.2 + explosion_random()*0.25;
        pulse_sparks.push({x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, life, color, size: 1.2 + explosion_random()*1.2});
    }
    if (pulse_sparks.length > 400) {
        pulse_sparks.splice(0, pulse_sparks.length - 400);
    }
}

function pulse_sparks_update(dt)
{
    const drag = Math.pow(0.05, dt);
    for (const spark of pulse_sparks) {
        spark.x += spark.vx*dt;
        spark.y += spark.vy*dt;
        spark.vx *= drag;
        spark.vy *= drag;
        spark.life -= dt;
    }
    pulse_sparks = pulse_sparks.filter(v => v.life > 0);
}

// The gold ×N CHAIN counter over the HUD: up from the second kill, it pops on each and fades 1.2 s after the last
function pulse_chain_update(dt)
{
    pulse_chain.timer = Math.max(0, pulse_chain.timer - dt);
    pulse_chain_box = pulse_chain_box || document.getElementById('pulse_chain');
    if (!pulse_chain_box) {
        return;
    }
    const on = (pulse_chain.count > 1) && (pulse_chain.timer > 0);
    const shown = on ? `×${pulse_chain.count}` : '';
    if (shown !== pulse_chain.shown) {
        // the counter heads the toasts, where a banner high in the middle would cover it: the banner fades out
        if (on && !pulse_chain.shown) {
            for (const banner of document.querySelectorAll('#banners .banner')) {
                banner.life = Math.min(banner.life, 0.4);
            }
        }
        pulse_chain.shown = shown;
        pulse_chain_box.querySelector('b').textContent = shown;
        set_hidden(pulse_chain_box, !on);
    }
    if (on) {
        pulse_chain_box.style.opacity = String(Math.min(1, pulse_chain.timer*4));
        pulse_chain_box.style.setProperty('--s', String(1 + Math.max(0, pulse_chain.timer - 1)*2.5));
    }
}

// Stars near a ring's front are pushed outwards, a cheap refraction; in screen units, as the background draws them
function pulse_star_bend(x, y)
{
    pulse_bent.x = x;
    pulse_bent.y = y;
    if (!full_fx) {
        return pulse_bent;
    }
    for (const wave of pulse_waves) {
        const dx = x - (wave.x - camera.x)*zoom;
        const dy = y - (wave.y - camera.y)*zoom;
        const d = Math.hypot(dx, dy) || 1;
        const band = 60*zoom;
        const off = Math.abs(d - wave.r*zoom);
        if (off < band) {
            const bend = (1 - off/band)*(wave.depth ? 8 : 22)*zoom*(1 - wave.fade);
            pulse_bent.x += (dx/d)*bend;
            pulse_bent.y += (dy/d)*bend;
        }
    }
    return pulse_bent;
}

// Drawn in world units, over the raiders and under your ship: the ship's flash, the rings, the sparks; only in flight,
// where they move (a pause holds them)
function render_pulse()
{
    if ((state !== 'playing') && (state !== 'paused')) {
        return;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if ((pulse_glow > 0) && player) {
        const k = pulse_glow/0.3;
        const glow = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, 70 + (1 - k)*50);
        glow.addColorStop(0, color_with_alpha(pulse_looks.main.edge, 0.8*k));
        glow.addColorStop(0.3, color_with_alpha(pulse_looks.main.color, 0.4*k));
        glow.addColorStop(1, color_with_alpha(pulse_looks.main.color, 0));
        ctx.fillStyle = glow;
        explosion_circle(player.x, player.y, 70 + (1 - k)*50);
        ctx.fill();
    }
    for (const wave of pulse_waves) {
        if (in_view(wave, wave.r + 80)) {
            render_pulse_wave(wave);
        }
    }
    ctx.lineCap = 'round';
    for (const spark of pulse_sparks) {
        ctx.globalAlpha = Math.min(1, spark.life*3);
        ctx.strokeStyle = spark.color;
        ctx.lineWidth = spark.size;
        ctx.beginPath();
        ctx.moveTo(spark.x, spark.y);
        ctx.lineTo(spark.x - spark.vx*0.035, spark.y - spark.vy*0.035);
        ctx.stroke();
    }
    ctx.restore();
}

// A band behind the front, two coloured echoes, a halo ahead of the main ring, the bright front and sparks riding it
function render_pulse_wave(wave)
{
    const look = wave.depth ? pulse_looks.chain : pulse_looks.main;
    const life = wave.r/wave.reach;
    const width = look.width*(0.6 + 0.4*(1 - life));
    const alpha = (1 - wave.fade)*(wave.depth ? 0.95*Math.pow(1 - life, 0.6) : 1 - life*0.4);
    const {x, y, r} = wave;
    if (r > 2) {
        const inner = Math.max(0, r - width);
        const band = ctx.createRadialGradient(x, y, inner, x, y, r);
        band.addColorStop(0, `${look.color}00`);
        band.addColorStop(0.7, `${look.color}22`);
        band.addColorStop(0.95, `${look.color}77`);
        band.addColorStop(1, `${look.color}aa`);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = band;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.arc(x, y, inner, 0, Math.PI*2, true);
        ctx.fill();
    }
    ctx.globalAlpha = alpha*0.5;
    ctx.lineWidth = 2;
    ctx.strokeStyle = look.alt;
    explosion_circle(x, y, Math.max(0, r - 10));
    ctx.stroke();
    ctx.strokeStyle = look.color;
    explosion_circle(x, y, Math.max(0, r - 22));
    ctx.stroke();
    if (!wave.depth && (r > 40) && full_fx) {
        const halo = ctx.createRadialGradient(x, y, r, x, y, r + 26);
        halo.addColorStop(0, `${look.color}55`);
        halo.addColorStop(1, `${look.color}00`);
        ctx.globalAlpha = alpha*0.8;
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, r + 26, 0, Math.PI*2);
        ctx.arc(x, y, r, 0, Math.PI*2, true);
        ctx.fill();
        ctx.globalAlpha = alpha*0.35;
        ctx.lineWidth = 1.5;
        explosion_circle(x, y, r*0.8);
        ctx.stroke();
        ctx.globalAlpha = alpha*0.18;
        explosion_circle(x, y, r*0.62);
        ctx.stroke();
    }
    ctx.globalAlpha = alpha;
    ctx.shadowColor = look.color;
    ctx.shadowBlur = full_fx ? 18 : 0;
    ctx.strokeStyle = look.edge;
    ctx.lineWidth = wave.depth ? 2.5 : 4;
    explosion_circle(x, y, r);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = look.edge;
    for (const spark of wave.sparks) {
        if (life > spark.life) {
            continue;
        }
        const rr = r + spark.offset;
        ctx.globalAlpha = alpha*(1 - life/spark.life);
        ctx.fillRect(x + Math.cos(spark.angle)*rr - spark.size/2, y + Math.sin(spark.angle)*rr - spark.size/2, spark.size, spark.size);
    }
}
