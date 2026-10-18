// Light on the hulls: the first moments of a ship's blast light the hulls round it, yours and the raiders', a warm
// glow over their drawing that fades with distance and with the blast; a shield is a bubble round the hull, its rim
// brightest, as bright as it is full; a pickup floats in a soft glow of its colour. Each is an image drawn once and
// stamped, a few calls a frame.
const hull_light_color = '#ffc27a';
const shield_bubbles = new Map();

// Over the ships (render, after your ship): the hulls the newest blasts light, and the shield bubbles
function render_hull_light()
{
    if (!player) {
        return;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    render_shield_bubbles();
    if (full_fx) {
        let lights = explosion_light_limit;
        for (let i = explosions.length - 1; (i >= 0) && (lights > 0); --i) {
            const v = explosions[i];
            if ((v.kind !== 'blast') || (v.size < explosion_ship_size) || (v.t < 0) || (v.t >= v.duration*0.3) || !in_view(v, v.size*3)) {
                continue;
            }
            lights--;
            const light = 1 - v.t/(v.duration*0.3);
            const reach = v.size*3.2;
            for (let j = 0; j < enemies.length; ++j) {
                const enemy = enemies[j];
                if (enemy.hp > 0) {
                    hull_light_ship(enemy, v, reach, light, enemy_sprite(enemy), enemy.color || pink, raider_draw_angle(enemy));
                }
            }
            if ((state !== 'dead') && !teleport_active()) {
                hull_light_ship(player, v, reach, light, ship_sprite(current_ship()), null, player.angle);
            }
        }
    }
    ctx.restore();
}

// One hull lit by a blast `reach` wide: its drawing in the blast's warm colour, added over it
function hull_light_ship(target, blast, reach, light, art, color, angle)
{
    const d = Math.hypot(target.x - blast.x, target.y - blast.y);
    if (d >= reach) {
        return;
    }
    const s = sprite(art.name);
    if (!s) {
        return;
    }
    const size = (art.length*256)/sprite_span;
    const raster = sprite_raster(art.name, color, sprite_raster_px(s, size, ctx.getTransform()));
    if (!raster) {
        return;
    }
    const k = 1 - d/reach;
    ctx.globalAlpha = light*light*k*0.6;
    ctx.save();
    ctx.translate(target.x, target.y);
    ctx.rotate(angle);
    ctx.drawImage(sprite_tint(raster, hull_light_color, 1), -size/2, -size/2, size, size);
    ctx.restore();
}

// A shield's bubble: clear inside, a faint film, a bright rim, in the shield ring's colour; a hit brightens it
function render_shield_bubbles()
{
    if ((player.shield > 0) && (state !== 'dead') && !teleport_active()) {
        shield_bubble_draw(player, ship_halo() + 3, '#8d9cff', player.shield/shield_max());
    }
    for (let i = 0; i < enemies.length; ++i) {
        const enemy = enemies[i];
        if ((enemy.hp > 0) && (enemy.shield > 0) && enemy.max_shield && in_view(enemy, enemy.r + 20)) {
            shield_bubble_draw(enemy, enemy.r + 8, enemy.color || pink, enemy.shield/enemy.max_shield);
        }
    }
}

function shield_bubble_draw(target, radius, color, full)
{
    ctx.globalAlpha = Math.min(1, 0.22 + full*0.3 + (target.shield_flash || 0)*3);
    ctx.drawImage(shield_bubble(color), target.x - radius, target.y - radius, radius*2, radius*2);
}

function shield_bubble(color)
{
    let v = shield_bubbles.get(color);
    if (!v) {
        v = document.createElement('canvas');
        v.width = v.height = 128;
        const draw = v.getContext('2d');
        const g = draw.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, color_with_alpha(color, 0));
        g.addColorStop(0.62, color_with_alpha(color, 0.01));
        g.addColorStop(0.86, color_with_alpha(color, 0.07));
        g.addColorStop(0.96, color_with_alpha(color, 0.45));
        g.addColorStop(1, color_with_alpha(color, 0));
        draw.fillStyle = g;
        draw.fillRect(0, 0, 128, 128);
        // a highlight on the upper left, where the light comes from on every hull
        const shine = draw.createRadialGradient(40, 36, 0, 40, 36, 30);
        shine.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
        draw.fillStyle = shine;
        draw.beginPath();
        draw.arc(64, 64, 62, 0, Math.PI*2);
        draw.fill();
        if (shield_bubbles.size >= 32) {
            shield_bubbles.clear();
        }
        shield_bubbles.set(color, v);
    }
    return v;
}

// Under the pickups (render_pickups): a soft glow in each one's colour, breathing slowly with full effects
function render_pickup_halos()
{
    if (!pickups.length) {
        return;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < pickups.length; ++i) {
        const pickup = pickups[i];
        if (!in_view(pickup, 30)) {
            continue;
        }
        const breath = full_fx ? Math.sin(clock*2.4 + pickup.x*0.05) : 0;
        const r = 16 + breath*3;
        ctx.globalAlpha = ((pickup.life < 5) ? 0.25 : 0.5) + breath*0.1;
        ctx.drawImage(shot_glow(pickup_color(pickup)), pickup.x - r, pickup.y - r, r*2, r*2);
    }
    ctx.restore();
}
