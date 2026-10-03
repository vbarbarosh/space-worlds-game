// Explosions: a flash, a fireball, a shockwave, sparks, debris and smoke, in every view. Their randomness has a
// generator of its own, so an effect never changes what Math.random decides for the game.
let explosions = [];
let explosion_seed = 1;
const explosion_limit = 90;

// size is the fireball's radius in world units: about 40 for a raider, 70 for a tank, 220 for a flagship
function explode(x, y, size, color, delay = 0)
{
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
    explosions.push({x, y, size, color, t: -delay, duration: 0.7 + size/180, sparks, debris, puffs});
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
}

// The top-down views draw in world units; the cockpit passes the projected point and its scale.
function render_explosions()
{
    for (const explosion of explosions) {
        if ((explosion.t >= 0) && in_view(explosion, explosion.size*3)) {
            explosion_draw(explosion, explosion.x, explosion.y, 1);
        }
    }
}

function render_explosions_in_cabin()
{
    for (const explosion of explosions) {
        if (explosion.t < 0) {
            continue;
        }
        const p = cabin_project(explosion, 0, explosion.size*3);
        if (p) {
            explosion_draw(explosion, p.x, p.y, p.k);
        }
    }
}

function explosion_draw(explosion, x, y, scale)
{
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

// White core, gold, orange, then the color of what blew up, fading as p goes from 0 to 1.
function explosion_fireball(x, y, radius, p, color)
{
    const fireball = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, radius));
    fireball.addColorStop(0, 'rgba(255, 252, 240, ' + (1 - p)*0.95 + ')');
    fireball.addColorStop(0.15, 'rgba(255, 226, 140, ' + (1 - p)*0.9 + ')');
    fireball.addColorStop(0.4, 'rgba(255, 140, 60, ' + (1 - p)*0.75 + ')');
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
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}
