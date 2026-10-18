// Area effects you release travel: a ring leaves the ship and acts on each raider, rock and shot as its front reaches
// it, never before (docs/principles.md). Space sends the pulse, which chains through what it kills; E the EMP; F stasis.
let pulse_waves = [];
let pulse_fuses = [];
let pulse_sparks = [];
const pulse_glow = {time: 0, color: '#6cf8ec'};
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
// the EMP's front reaches its 650 m in 0.6 s, as its old ring did and as long as it shields you
const emp_reach = 650;
const emp_speed = 1100;
// stasis slows raiders and their shots to 35%; its front crosses the view in 1 s, then the field holds everywhere
const stasis_scale_slow = 0.35;
// How each ring looks: colours, band width, sparks riding the front, how far it bends the stars, a halo ahead
const pulse_looks = {
    pulse: {color: '#6cf8ec', edge: '#e8fdff', alt: '#ff5baf', width: 70, sparks: 90, bend: 22, halo: true},
    chain: {color: '#ffb35c', edge: '#fff2d6', alt: '#ff5d6c', width: 18, sparks: 18, bend: 8, halo: false},
    emp: {color: '#8d9cff', edge: '#e6e9ff', alt: '#6cf8ec', width: 50, sparks: 70, bend: 16, halo: true},
    stasis: {color: '#8d9cff', edge: '#d9ddff', alt: '#b48cff', width: 34, sparks: 50, bend: 10, halo: false},
};

function pulse_clear()
{
    pulse_waves = [];
    pulse_fuses = [];
    pulse_sparks = [];
    pulse_glow.time = 0;
    pulse_chain.count = 0;
    pulse_chain.timer = 0;
}

// The pulse from the ship: 480 m, 140 damage on average (320 on a flagship), each amplifier level +80 m, +60 (+120)
function pulse_fire(x, y)
{
    const base = 140 + upgrades.pulse*60;
    pulse_waves.push(pulse_wave_create('pulse', x, y, {
        reach: 480 + upgrades.pulse*80,
        speed: pulse_speed,
        damage: base,
        boss_damage: 320 + upgrades.pulse*120,
        base,
        falloff: true,
        push: pulse_push,
        shots: true,
        rocks: true,
        chains: true,
    }));
    pulse_glow_start(pulse_looks.pulse.color);
    pulse_chain.count = 0;
    pulse_chain.timer = 0;
}

// The EMP: 160 + 12 × threat level to each raider within 650 m (400 to a flagship), the same all the way out; it wipes
// raiders' shots as its front passes and breaks rocks as the pulse does
function emp_fire(x, y)
{
    pulse_waves.push(pulse_wave_create('emp', x, y, {reach: emp_reach, speed: emp_speed, damage: 160 + threat_wave()*12, boss_damage: 400, shots: true, rocks: true}));
    pulse_glow_start(pulse_looks.emp.color);
}

// The stasis field: no damage; the slow lands as its front arrives (stasis_scale)
function stasis_fire(x, y)
{
    const reach = Math.max(W, H);
    pulse_waves.push(pulse_wave_create('stasis', x, y, {reach, speed: reach}));
}

function pulse_glow_start(color)
{
    pulse_glow.time = 0.3;
    pulse_glow.color = color;
}

// A ring of a kind; what it does on arrival: damage (with falloff for the pulse), push, shots wiped, rocks hit, chains
function pulse_wave_create(kind, x, y, options)
{
    const sparks = [];
    for (let i = 0, end = pulse_looks[kind].sparks*(full_fx ? 1 : 0.4); i < end; ++i) {
        sparks.push({angle: explosion_random()*Math.PI*2, offset: -6 + explosion_random()*16, size: 1 + explosion_random()*1.6, life: 0.5 + explosion_random()*0.5});
    }
    const defaults = {depth: 0, damage: 0, boss_damage: 0, base: 0, falloff: false, push: 0, shots: false, rocks: false, chains: false, source: null};
    const out = {kind, x, y, r: 0, previous: 0, fade: 0, sparks, ...defaults, ...options};
    out.hit = new Set(out.source ? [out.source] : []);
    return out;
}

function pulse_update(dt)
{
    pulse_glow.time = Math.max(0, pulse_glow.time - dt);
    for (const wave of pulse_waves) {
        wave.previous = wave.r;
        wave.r = Math.min(wave.reach, wave.r + wave.speed*dt);
        if (wave.shots) {
            pulse_wave_clear_shots(wave);
        }
        for (const enemy of enemies) {
            if ((enemy.hp > 0) && pulse_wave_reaches(wave, enemy)) {
                pulse_hit(wave, enemy, 'raider');
            }
        }
        if (wave.rocks) {
            for (const piece of drifting_debris.slice()) {
                if (pulse_wave_reaches(wave, piece)) {
                    pulse_hit(wave, piece, 'debris');
                }
            }
        }
        // ore rocks break only in the arcade, as under your guns; in the campaign the rings pass them by
        if (wave.rocks && arcade.active) {
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

// How fast a raider or a shot runs under stasis: slowed once the field's front has passed it, everywhere once the
// front has crossed the view (as the field always held), at full speed before
function stasis_scale(target)
{
    if (stasis_time <= 0) {
        return 1;
    }
    const field = pulse_waves.find(v => v.kind === 'stasis');
    if (!field || (distance(field, target) - (target.r || 0) <= field.r)) {
        return stasis_scale_slow;
    }
    return 1;
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

// The ring wipes raiders' shots as its front passes them: a shot inside the front now that was outside it before its
// last step (from px, py), as a fast one flying in crosses more than the front grows in a frame
function pulse_wave_clear_shots(wave)
{
    for (const shot of hostile) {
        const d = distance(wave, shot);
        const before = Math.hypot(shot.px - wave.x, shot.py - wave.y);
        if ((shot.life > 0) && (d <= wave.r) && (Math.max(d, before) >= wave.previous - 8)) {
            shot.life = 0;
            explode(shot.x, shot.y, 6, pulse_looks[wave.kind].color, 0, 'spark');
        }
    }
}

// A target the front reached: it flashes, throws sparks and is pushed away; a lethal hit waits on a fuse
function pulse_hit(wave, target, kind)
{
    wave.hit.add(target);
    const d = distance(wave, target);
    const fall = wave.falloff ? 1 - pulse_falloff*Math.min(1, d/wave.reach) : 1;
    const damage = ((target.type === 'boss') ? wave.boss_damage : wave.damage)*(wave.falloff ? fall/pulse_falloff_mean : 1);
    const nx = (target.x - wave.x)/(d || 1);
    const ny = (target.y - wave.y)/(d || 1);
    const push = wave.push*fall;
    if (kind === 'raider') {
        const heft = (target.type === 'boss') ? 0.1 : (target.type === 'tank') ? 0.5 : 1;
        target.push_vx = (target.push_vx || 0) + nx*push*heft;
        target.push_vy = (target.push_vy || 0) + ny*push*heft;
        target.flash = 0.12;
    }
    if ((kind === 'debris') && push) {
        target.vx += nx*push*0.3;
        target.vy += ny*push*0.3;
        const speed = Math.hypot(target.vx, target.vy);
        if (speed > 160) {
            target.vx *= 160/speed;
            target.vy *= 160/speed;
        }
    }
    pulse_sparks_add(target.x, target.y, nx, ny, pulse_looks[wave.kind].color, wave.damage ? 8 : 4);
    // a target already on a fuse is left to it, found among the fuses: a mark set on it and deleted would give the
    // raider, rock or wreck a shape of its own, and every loop over them a slow lookup that allocates
    if (!damage || pulse_fuses.some(v => v.target === target)) {
        return;
    }
    const strike = {target, kind, damage, depth: wave.depth, base: wave.base, chains: wave.chains};
    if (pulse_lethal(target, kind, damage)) {
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
    return armour_hull_damage(target, damage - Math.min(target.shield || 0, damage)) >= target.hp;
}

// 0.05-0.14 s after the front, later down the chain; from the target's place, not from dice: it decides the chain's timing
function pulse_fuse_delay(target, depth)
{
    const k = Math.abs(target.x*0.0137 + target.y*0.0071) % 1;
    return 0.05 + 0.09*k + 0.03*depth;
}

// The damage lands through the game's own damage; what the pulse destroys counts on the HUD and sends a chain ring
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
    if (!dead || !strike.chains) {
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
    pulse_waves.push(pulse_wave_create('chain', target.x, target.y, {
        depth,
        reach: pulse_chain_radius*step*(big ? 1.35 : 1),
        speed: pulse_chain_speed*(0.85 + 0.15*step),
        damage,
        boss_damage: damage,
        base: strike.base,
        push: pulse_chain_push,
        rocks: true,
        chains: true,
        source: target,
    }));
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
        const d = Math.sqrt(dx*dx + dy*dy) || 1;
        const band = 60*zoom;
        const off = Math.abs(d - wave.r*zoom);
        if (off < band) {
            const bend = (1 - off/band)*pulse_looks[wave.kind].bend*zoom*(1 - wave.fade);
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
    if ((pulse_glow.time > 0) && player) {
        const k = pulse_glow.time/0.3;
        const glow = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, 70 + (1 - k)*50);
        glow.addColorStop(0, color_with_alpha('#f2fbff', 0.8*k));
        glow.addColorStop(0.3, color_with_alpha(pulse_glow.color, 0.4*k));
        glow.addColorStop(1, color_with_alpha(pulse_glow.color, 0));
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

// A band behind the front, two coloured echoes, a halo ahead of the pulse and the EMP, the bright front and sparks on it
function render_pulse_wave(wave)
{
    const look = pulse_looks[wave.kind];
    const life = wave.r/wave.reach;
    const width = look.width*(0.6 + 0.4*(1 - life));
    const alpha = (1 - wave.fade)*(wave.depth ? 0.95*Math.pow(1 - life, 0.6) : 1 - life*0.4);
    const {x, y, r} = wave;
    if (full_fx && pulse_wave_rings(wave, look, width, alpha)) {
        pulse_wave_sparks(wave, look, life, alpha);
        return;
    }
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
    if (look.halo && (r > 40) && full_fx) {
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
    if (full_fx && !ring_glow(x, y, r, wave.depth ? 2.5 : 4, 18, look.color)) {
        ctx.shadowColor = look.color;
        ctx.shadowBlur = 18;
    }
    ctx.strokeStyle = look.edge;
    ctx.lineWidth = wave.depth ? 2.5 : 4;
    explosion_circle(x, y, r);
    ctx.stroke();
    ctx.shadowBlur = 0;
    pulse_wave_sparks(wave, look, life, alpha);
}

function pulse_wave_sparks(wave, look, life, alpha)
{
    const {x, y, r} = wave;
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

// The wave's band, its two echoes, its halo, the front's glow and the front itself in one ring and one gradient, as
// render_pulse_wave draws them one by one: they add up ('lighter'), so a stop holds their sum, clamped as the screen
// clamps it. Every shape was a large blended fill of its own: on a software canvas one pulse at 300 m on a 1536 × 794
// window at DPR 2.5 cost 16.5 ms a frame, 10.2 ms so (bin/perf layers), and a graphics card blends the ring once
// instead of seven times (the pixels differ by under a device pixel's shift at the edges of the thin lines). False, drawing nothing,
// when the glow would not be a ring (render_pulse_wave draws it with a shadow then).
function pulse_wave_rings(wave, look, width, alpha)
{
    const {x, y, r} = wave;
    const t = ctx.getTransform();
    const scale = Math.sqrt(t.a*t.a + t.b*t.b);
    const px = 1/scale;
    // ring_glow's spread: its blur of 18 device px
    const sigma = 9/scale;
    if ((r <= 2) || (r < sigma*4)) {
        return false;
    }
    const edge = wave.depth ? 2.5 : 4;
    const halo = look.halo && (r > 40);
    const inner = Math.max(0, r - width);
    const lo = Math.max(0, Math.min(inner, r - 24) - px);
    const hi = r + Math.max(halo ? 26 : 0, sigma*4, edge) + px;
    const color = pulse_rgb(look.color);
    const alt = pulse_rgb(look.alt);
    const front = pulse_rgb(look.edge);
    const g = ctx.createRadialGradient(x, y, lo, x, y, hi);
    const n = Math.min(255, Math.ceil((hi - lo)/px));
    const sum = [0, 0, 0];
    function add(rgb, a) {
        sum[0] += rgb[0]*a;
        sum[1] += rgb[1]*a;
        sum[2] += rgb[2]*a;
    }
    for (let i = 0; i <= n; ++i) {
        const d = lo + ((hi - lo)*i)/n;
        sum[0] = 0;
        sum[1] = 0;
        sum[2] = 0;
        if ((d >= inner) && (d <= r)) {
            add(color, pulse_band_alpha((r > inner) ? (d - inner)/(r - inner) : 1)*alpha);
        }
        add(alt, pulse_line_cover(d, r - 10, 2, px)*alpha*0.5);
        add(color, pulse_line_cover(d, r - 22, 2, px)*alpha*0.5);
        if (halo && (d >= r) && (d <= r + 26)) {
            add(color, (0x55/255)*(1 - (d - r)/26)*alpha*0.8);
        }
        add(color, pulse_glow_alpha(d - r, edge, sigma)*alpha);
        add(front, pulse_line_cover(d, r, edge, px)*alpha);
        const pr = Math.min(1, sum[0]);
        const pg = Math.min(1, sum[1]);
        const pb = Math.min(1, sum[2]);
        const a = Math.max(pr, pg, pb);
        g.addColorStop(i/n, a ? `rgba(${Math.round((pr/a)*255)}, ${Math.round((pg/a)*255)}, ${Math.round((pb/a)*255)}, ${a.toFixed(4)})` : 'rgba(0, 0, 0, 0)');
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, hi, 0, Math.PI*2);
    ctx.arc(x, y, lo, 0, Math.PI*2, true);
    ctx.fill();
    if (halo) {
        ctx.strokeStyle = look.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = alpha*0.35;
        explosion_circle(x, y, r*0.8);
        ctx.stroke();
        ctx.globalAlpha = alpha*0.18;
        explosion_circle(x, y, r*0.62);
        ctx.stroke();
    }
    ctx.globalAlpha = alpha;
    return true;
}

// '#6cf8ec' -> [0.42, 0.97, 0.93], kept per colour
const pulse_rgb_by_color = new Map();

function pulse_rgb(color)
{
    let out = pulse_rgb_by_color.get(color);
    if (!out) {
        out = [1, 3, 5].map(v => parseInt(color.slice(v, v + 2), 16)/255);
        pulse_rgb_by_color.set(color, out);
    }
    return out;
}

// The band's opacity at k (0 at its inner edge, 1 at the front): the stops of render_pulse_wave's band
function pulse_band_alpha(k)
{
    if (k < 0.7) {
        return ((k/0.7)*0x22)/255;
    }
    if (k < 0.95) {
        return (0x22 + ((k - 0.7)/0.25)*(0x77 - 0x22))/255;
    }
    return (0x77 + ((k - 0.95)/0.05)*(0xaa - 0x77))/255;
}

// How much of a pixel `px` wide at distance d a line `w` wide at distance c covers
function pulse_line_cover(d, c, w, px)
{
    const lo = Math.max(d - px/2, c - w/2);
    const hi = Math.min(d + px/2, c + w/2);
    return Math.max(0, hi - lo)/px;
}

// The front's glow at `dd` from it, as ring_glow draws it: its 25 stops over ± 4 sigma, straight between them
function pulse_glow_alpha(dd, width, sigma)
{
    const k = ((dd + sigma*4)/(sigma*8))*24;
    if ((k < 0) || (k > 24)) {
        return 0;
    }
    const j = Math.min(23, Math.floor(k));
    function at(i) {
        const e = -sigma*4 + (sigma*8*i)/24;
        return normal_cdf((e + width/2)/sigma) - normal_cdf((e - width/2)/sigma);
    }
    return at(j) + (at(j + 1) - at(j))*(k - j);
}
