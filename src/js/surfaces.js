// The second view uses pre-rendered material sprites, with the original view kept intact.
const surface_asset_cache = new Map();
function sync_view_button()
{
    const b = document.getElementById('view_button');
    if (!b) {
        return;
    }
    const title = (view_mode === 'cockpit') ? 'Cockpit' : (view_mode === 'rendered') ? 'Rendered' : 'Wireframe';
    b.title = `View: ${title}. V or click for the next (rendered, wireframe, cockpit)`;
    b.setAttribute('aria-label', `View mode: ${title}`);
    b.classList.toggle('rendered', view_mode !== 'wireframe');
    b.classList.toggle('cockpit', view_mode === 'cockpit');
    b.setAttribute('aria-label', `View mode: ${title}. Click to cycle views.`);
    document.body.setAttribute('data-view', view_mode);
}

function toggle_view()
{
    const modes = ['wireframe', 'rendered', 'cockpit'];
    view_mode = modes[(modes.indexOf(view_mode) + 1) % modes.length];
    if ((view_mode === 'cockpit') && player) {
        cabin.yaw = player.angle;
    }
    pointer.active = false;
    mouse_drive.following = false;
    try {
        localStorage.setItem('pulse_drift_view', view_mode);
    }
    catch {
    }
    sync_view_button();
    performance_render_dirty = true;
    if ((state === 'upgrade') && (station_tab === 'hangar')) {
        render_station();
    }
}
document.getElementById('view_button').addEventListener('click', toggle_view);
addEventListener('keydown', function (event) {
    if ((event.code === 'KeyV') && !settings_open && !event.repeat && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        toggle_view();
    }
});
function color_from_shade(hex, amount)
{
    const n = parseInt(hex.slice(1), 16);
    const r = clamp((n >> 16) + amount, 0, 255);
    const g = clamp(((n >> 8) & 255) + amount, 0, 255);
    const b = clamp((n & 255) + amount, 0, 255);
    return `#${[r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

function surface_asset(key, size, paint)
{
    let out = surface_asset_cache.get(key);
    if (out) {
        return out;
    }
    const layer = document.createElement('canvas');
    layer.width = size;
    layer.height = size;
    const draw = layer.getContext('2d');
    draw.translate(size/2, size/2);
    paint(draw);
    out = {layer, size};
    if (surface_asset_cache.size >= 96) {
        surface_asset_cache.delete(surface_asset_cache.keys().next().value);
    }
    surface_asset_cache.set(key, out);
    return out;
}

function material_gradient(draw, color, r = 32)
{
    const g = draw.createLinearGradient(-r, -r*0.6, r*0.6, r);
    g.addColorStop(0, color_from_shade(color, 100));
    g.addColorStop(0.25, color_from_shade(color, 40));
    g.addColorStop(0.55, color_from_shade(color, -5));
    g.addColorStop(1, color_from_shade(color, -65));
    return g;
}

function plate(draw, points, color, edge = '#c9d2da77')
{
    draw.beginPath();
    for (let i = 0, end = points.length; i < end; ++i) {
        if (i) {
            draw.lineTo(points[i][0], points[i][1]);
        }
        else {
            draw.moveTo(points[i][0], points[i][1]);
        }
    }
    draw.closePath();
    draw.fillStyle = material_gradient(draw, color);
    draw.fill();
    draw.lineWidth = 0.8;
    draw.strokeStyle = edge;
    draw.stroke();
}

function material_box(draw, x, y, w, h, color)
{
    const g = draw.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, color_from_shade(color, 55));
    g.addColorStop(0.4, color);
    g.addColorStop(1, color_from_shade(color, -40));
    draw.fillStyle = g;
    draw.fillRect(x, y, w, h);
    draw.strokeStyle = '#c7d4de55';
    draw.lineWidth = 0.8;
    draw.strokeRect(x, y, w, h);
    draw.fillStyle = '#ffffff33';
    draw.fillRect(x + 1, y + 1, w - 2, 1.2);
    draw.fillStyle = '#00000066';
    draw.fillRect(x + 1, y + h - 2, w - 2, 1.2);
}

function ship_surface(shape, color, enemy = false, type = '')
{
    return surface_asset(`ship:${shape}:${color}:${enemy}:${type}`, 160, function (draw) {
        draw.scale(2, 2);
        const points = ship_outline(shape);
        draw.save();
        draw.translate(1.7, 2.5);
        plate(draw, points, '#080b11', '#030609');
        draw.restore();
        plate(draw, points, enemy ? '#68505d' : '#758c9c');
        // Segmented wing plates, raised central spine and forward cockpit give the hull depth.
        draw.save();
        draw.beginPath();
        for (let i = 0, end = points.length; i < end; ++i) {
            const point = points[i];
            if (i) {
                draw.lineTo(...point);
            }
            else {
                draw.moveTo(...point);
            }
        }
        draw.closePath();
        draw.clip();
        for (let i = -1; i <= 1; i += 2) {
            plate(draw, [[13, i*4], [-2, i*8], [-22, i*22], [-17, i*5]], enemy ? '#443744' : '#394c5b');
            plate(draw, [[5, i*5], [-11, i*14], [-17, i*13], [-1, i*3]], color_from_shade(color, -45));
            draw.strokeStyle = '#111b2788';
            draw.lineWidth = 0.8;
            for (let j = 0; j < 4; ++j) {
                draw.beginPath();
                draw.moveTo(-17 + j*4, i*5);
                draw.lineTo(-21 + j*4, i*18);
                draw.stroke();
            }
        }
        plate(draw, [[22, 0], [1, -5], [-17, -4], [-21, 0], [-17, 4], [1, 5]], enemy ? '#937c81' : '#adbac5');
        material_box(draw, -19, -4, 6, 8, '#263b46');
        const glass = draw.createLinearGradient(0, -4, 8, 5);
        glass.addColorStop(0, '#e5fcff');
        glass.addColorStop(0.35, color);
        glass.addColorStop(1, '#0c253d');
        draw.fillStyle = glass;
        draw.beginPath();
        draw.moveTo(13, 0);
        draw.lineTo(2, -4);
        draw.lineTo(-4, -2);
        draw.lineTo(-4, 2);
        draw.lineTo(2, 4);
        draw.closePath();
        draw.fill();
        draw.strokeStyle = '#02070c';
        draw.lineWidth = 1;
        draw.stroke();
        draw.fillStyle = '#e8f0e877';
        draw.fillRect(-11, -2, 3, 4);
        draw.fillStyle = color;
        draw.fillRect(-15, -3, 1.5, 6);
        draw.restore();
        // Weapon hardpoints and engine housings follow the hull class.
        const wing = (shape >= 4) ? 14 : (shape === 2) ? 10 : 7;
        for (let i = -1; i <= 1; i += 2) {
            material_box(draw, -13, i*wing - 2, 15, 4, '#35424a');
            material_box(draw, 0, i*wing - 1.2, 7, 2.4, '#a5b2b8');
            draw.fillStyle = color;
            draw.fillRect(-17, i*wing - 2, 3, 4);
        }
        if (type === 'boss') {
            for (let i = -1; i <= 1; i += 2) {
                material_box(draw, -7, i*21 - 3, 14, 6, '#5b526b');
                draw.fillStyle = color;
                draw.fillRect(5, i*21 - 1, 8, 2);
            }
        }
    });
}

function render_surface_ship(x, y, angle, alpha = 1, ghost = false, definition = null)
{
    const v = definition || current_ship();
    const shape = v.shape || 0;
    const color = v.color || cyan;
    // The designer's sprite when there is one; the painted hull below while it loads, or for a ship with none
    const art = definition ? definition.sprite : ship_sprite(v);
    if (art && sprite_draw(art.name, definition?.enemy ? color : null, art.length, x, y, angle, alpha)) {
        if (!ghost && !is_player_vessel(x, y)) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = alpha;
            sprite_flames(ctx, sprite_anchors(art.name, art.length).flames.main, 0.45, definition?.enemy ? color : '#9bcfff', full_fx ? Math.sin(clock*24 + x)*0.15 : 0);
            ctx.restore();
        }
        return;
    }
    const asset = ship_surface(shape, color, !!v.enemy, v.type || '');
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    const size = v.scale || 1;
    ctx.drawImage(asset.layer, -40*size, -40*size, 80*size, 80*size);
    if (!ghost && !is_player_vessel(x, y)) {
        ctx.globalCompositeOperation = 'lighter';
        const length = ((player && (Math.hypot(player.vx, player.vy) > 30)) ? 13 : 7) + (full_fx ? Math.sin(clock*24)*2 : 0);
        for (let i = -1; i <= 1; i += 2) {
            const y = i*((shape >= 4) ? 14 : (shape === 2) ? 10 : 7)*size;
            ctx.fillStyle = `${color}33`;
            ctx.beginPath();
            ctx.moveTo(-18*size, y - 3*size);
            ctx.lineTo((-23 - length)*size, y);
            ctx.lineTo(-18*size, y + 3*size);
            ctx.fill();
            ctx.fillStyle = '#e4f9ff';
            ctx.beginPath();
            ctx.moveTo(-18*size, y - 1.1*size);
            ctx.lineTo(-26*size, y);
            ctx.lineTo(-18*size, y + 1.1*size);
            ctx.fill();
        }
    }
    ctx.restore();
}

function ship(x, y, angle, alpha = 1, ghost = false)
{
    if (view_mode === 'wireframe') {
        wireframe_ship(x, y, angle, alpha, ghost);
    }
    else {
        render_surface_ship(x, y, angle, alpha, ghost);
    }
    if (!ghost && player && (x === player.x) && (y === player.y)) {
        render_ship_turrets(alpha);
    }
}

// Every hostile ship sits in a red ring of four turning arcs, under its hull, so the ones to shoot stand out from
// freighters and other friendly traffic; elites get a heavier ring
function render_hostile_marks()
{
    ctx.save();
    ctx.strokeStyle = '#ff4d5e';
    ctx.globalAlpha = 0.75;
    ctx.lineCap = 'round';
    for (const enemy of enemies) {
        if ((enemy.hp <= 0) || !in_view(enemy, enemy.r*2 + 40)) {
            continue;
        }
        const r = enemy_sprite(enemy).length*0.55 + 4;
        const turn = clock*0.6 + enemy.x*0.01;
        ctx.lineWidth = (enemy.elite ? 2.6 : 1.6)/zoom;
        ctx.beginPath();
        for (let i = 0; i < 4; ++i) {
            const a = turn + (i*Math.PI)/2;
            ctx.moveTo(enemy.x + Math.cos(a)*r, enemy.y + Math.sin(a)*r);
            ctx.arc(enemy.x, enemy.y, r, a, a + Math.PI/3);
        }
        ctx.stroke();
    }
    ctx.restore();
}

function render_enemies()
{
    if (view_mode === 'wireframe') {
        wireframe_render_enemies();
        return;
    }
    for (const enemy of enemies) {
        if (!in_view(enemy, enemy.r + 40)) {
            continue;
        }
        const color = (enemy.flash > 0) ? '#e5faff' : enemy.color || pink;
        const shape = (enemy.type === 'boss') ? 5 : (enemy.type === 'tank') ? 4 : (enemy.type === 'shooter') ? 1 : (enemy.type === 'splitter') ? 3 : 2;
        const scale = (enemy.type === 'boss') ? enemy.r/28 : enemy.r/21;
        render_surface_ship(enemy.x, enemy.y, ((enemy.type === 'lancer') && (enemy.charge_time > 0)) ? enemy.charge_angle : enemy.angle, 1, false, {
            shape,
            color,
            scale,
            enemy: true,
            type: enemy.type,
            sprite: enemy_sprite(enemy),
        });
        ctx.save();
        if ((enemy.type === 'lancer') && (enemy.charge_cd < 0.7) && (enemy.charge_time <= 0)) {
            ctx.strokeStyle = `${gold}66`;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y);
            ctx.lineTo(enemy.x + Math.cos(enemy.charge_angle)*200, enemy.y + Math.sin(enemy.charge_angle)*200);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        if (enemy.shield > 0) {
            ctx.strokeStyle = `${color}66`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.r + 8, clock, clock + (Math.PI*2*enemy.shield)/enemy.max_shield);
            ctx.stroke();
            shield_shimmer(enemy, enemy.r + 8);
        }
        if (enemy.armor > 0) {
            ctx.strokeStyle = '#e4dcad88';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.r + 3, 0, Math.PI*0.55);
            ctx.stroke();
        }
        if ((enemy.hp < enemy.max_hp) && (enemy.type !== 'boss')) {
            ctx.fillStyle = '#101623';
            ctx.fillRect(enemy.x - enemy.r, enemy.y - enemy.r - 13, enemy.r*2, 3);
            ctx.fillStyle = color;
            ctx.fillRect(enemy.x - enemy.r, enemy.y - enemy.r - 13, (enemy.r*2*enemy.hp)/enemy.max_hp, 3);
        }
        ctx.restore();
    }
}

function rock_surface(id, variant = 0)
{
    return surface_asset(`rock:${id}:${variant}`, 160, function (draw) {
        const random = visual_random_from_seed(2387 + id*179 + variant*591);
        const ice = id === 5;
        const crystal = (id === 3) || (id === 7);
        const base = ice ? '#80a7b8' : (id === 6) ? '#6b3935' : (id === 1) ? '#476548' : (id === 7) ? '#302239' : (id === 2) ? '#97734f' : '#626875';
        let points = [];
        const sides = crystal ? 6 : 13;
        for (let i = 0; i < sides; ++i) {
            const a = (i/sides)*Math.PI*2;
            const r = ice ? 40 + random()*17 : crystal ? ((i % 2) ? 29 : 60) : 42 + random()*17;
            points.push([Math.cos(a)*r, Math.sin(a)*r]);
        }
        draw.save();
        draw.translate(3, 5);
        plate(draw, points, '#06090e', '#000000');
        draw.restore();
        plate(draw, points, base, '#bfc7c333');
        draw.save();
        draw.beginPath();
        for (let i = 0, end = points.length; i < end; ++i) {
            const point = points[i];
            if (i) {
                draw.lineTo(...point);
            }
            else {
                draw.moveTo(...point);
            }
        }
        draw.closePath();
        draw.clip();
        for (let i = 0; i < 18; ++i) {
            const x = (random() - 0.5)*110;
            const y = (random() - 0.5)*110;
            const r = 3 + random()*12;
            if (ice || crystal) {
                const p = [
                    [x - r, y - r],
                    [x + r, y - r*0.5],
                    [x + r*0.3, y + r],
                    [x - r*0.6, y + r*0.4],
                ];
                plate(draw, p, color_from_shade(base, Math.round(random()*60 - 20)), '#b9f3ff22');
            }
            else {
                const g = draw.createRadialGradient(x - 2, y - 3, 1, x, y, r);
                g.addColorStop(0, '#05080977');
                g.addColorStop(0.7, '#08090c44');
                g.addColorStop(1, '#d9c8ae22');
                draw.fillStyle = g;
                draw.beginPath();
                draw.arc(x, y, r, 0, Math.PI*2);
                draw.fill();
            }
        }
        for (let i = 0; i < 7; ++i) {
            const a = (i/7)*Math.PI*2;
            const x = Math.cos(a)*random()*45;
            const y = Math.sin(a)*random()*45;
            draw.strokeStyle = ice ? '#c9f4ff88' : (id === 6) ? '#ff9e4b' : (id === 7) ? '#a576be55' : '#13151688';
            draw.lineWidth = (id === 6) ? 2.5 : 0.9;
            draw.beginPath();
            draw.moveTo(x, y);
            draw.lineTo(x + 13, y + 9);
            draw.lineTo(x + 6, y + 17);
            draw.stroke();
        }
        draw.restore();
    });
}

function scenery_surface(id, variant)
{
    if ([2, 5, 6, 7].includes(id)) {
        return rock_surface(id, variant);
    }
    return surface_asset(`scenery:${id}:${variant}`, 160, function (draw) {
        if (id === 1) {
            const g = draw.createRadialGradient(-10, -15, 3, 0, 0, 57);
            g.addColorStop(0, '#a0b568');
            g.addColorStop(0.4, '#54764e');
            g.addColorStop(1, '#122a28');
            for (let i = 0; i < 5; ++i) {
                const a = (i/5)*Math.PI*2;
                draw.save();
                draw.rotate(a);
                draw.fillStyle = g;
                draw.beginPath();
                draw.ellipse(16, 0, 40, 15, 0.2, 0, Math.PI*2);
                draw.fill();
                draw.strokeStyle = '#8ba67755';
                draw.stroke();
                draw.restore();
            }
            draw.fillStyle = '#c9e9ae';
            draw.beginPath();
            draw.arc(-4, -2, 7, 0, Math.PI*2);
            draw.fill();
            return;
        }
        if (id === 3) {
            plate(draw, [[0, -62], [26, -14], [13, 49], [-14, 62], [-27, 8]], '#789abb');
            plate(draw, [[0, -62], [0, 23], [-14, 62], [-27, 8]], '#284676');
            plate(draw, [[0, -62], [26, -14], [0, 23]], '#bddae8');
            draw.fillStyle = '#9cffff';
            draw.fillRect(-3, -18, 6, 23);
            return;
        }
        for (let i = -1; i <= 1; i += 2) {
            material_box(draw, i*27 - 17, -16, 34, 32, '#253c65');
            draw.strokeStyle = '#83a5bd66';
            draw.lineWidth = 0.7;
            for (let j = 0; j < 5; ++j) {
                draw.beginPath();
                draw.moveTo(i*27 - 15 + j*7, -15);
                draw.lineTo(i*27 - 15 + j*7, 15);
                draw.stroke();
            }
            draw.beginPath();
            draw.moveTo(i*27 - 16, 0);
            draw.lineTo(i*27 + 16, 0);
            draw.stroke();
        }
        material_box(draw, -12, -24, 24, 48, (id === 4) ? '#5c5164' : '#7c8994');
        material_box(draw, -7, -14, 14, 28, '#37444c');
        draw.fillStyle = worlds[id].accent;
        draw.fillRect(-4, -8, 8, 4);
        draw.strokeStyle = '#cad9e2';
        draw.lineWidth = 2;
        draw.beginPath();
        draw.moveTo(0, -24);
        draw.lineTo(0, -49);
        draw.stroke();
        draw.fillStyle = '#afc1c8';
        draw.beginPath();
        draw.ellipse(0, -43, 15, 5, 0, 0, Math.PI*2);
        draw.fill();
    });
}

function render_map()
{
    if (view_mode === 'wireframe') {
        wireframe_render_map();
        return;
    }
    ctx.save();
    ctx.strokeStyle = `${worlds[campaign.world].accent}22`;
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, world.w - 24, world.h - 24);
    for (let i = 0, end = scenery.length; i < end; ++i) {
        const v = scenery[i];
        if (!in_view(v, v.r + 30)) {
            continue;
        }
        const size = v.r*1.45;
        // Rocks that are only scenery recede, so they never pass for asteroids you can hit or mine.
        const alpha = [2, 5, 6, 7].includes(campaign.world) ? 0.08 : 0.68;
        const art = world_art(`scenery-${(i % 3) + 1}`);
        if (art && sprite_draw_box(art, null, size, v.x, v.y, v.angle, alpha)) {
            continue;
        }
        const asset = scenery_surface(campaign.world, i % 7);
        ctx.save();
        ctx.translate(v.x, v.y);
        ctx.rotate(v.angle);
        ctx.globalAlpha = alpha;
        ctx.drawImage(asset.layer, -size/2, -size/2, size, size);
        ctx.restore();
    }
    ctx.restore();
}

function render_world_ore(v)
{
    if (view_mode === 'wireframe') {
        wireframe_render_world_ore(v);
        return;
    }
    if (!in_view(v, v.r + 8)) {
        return;
    }
    const variant = Math.abs(Math.floor(v.angle*11)) % 7;
    // The designer's asteroids: a rich one shows veins of the world's resource in its colour, and flashes when hit
    const art = world_art(v.resource ? `asteroid-rich-${(variant % 3) + 1}` : `asteroid-${(variant % 4) + 1}`);
    if (art && sprite_draw_box(art, v.resource ? ore_color(v) : null, v.r*2.5, v.x, v.y, v.angle)) {
        if (v.flash > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = '#fff7c633';
            ctx.beginPath();
            ctx.arc(v.x, v.y, v.r*0.9, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
        }
        ore_hp_bar(v);
        return;
    }
    const asset = rock_surface(campaign.world, variant);
    const size = v.r*2.55;
    ore_glow(v);
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle);
    ctx.drawImage(asset.layer, -size/2, -size/2, size, size);
    ore_veins(v);
    ctx.fillStyle = (v.flash > 0) ? '#fff7c6' : '#dfb857';
    ctx.strokeStyle = '#fff1b666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(v.r*0.08, -v.r*0.25);
    ctx.lineTo(v.r*0.3, -v.r*0.08);
    ctx.lineTo(v.r*0.14, v.r*0.1);
    ctx.lineTo(-v.r*0.05, -v.r*0.04);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ore_hp_bar(v);
}

function ore_hp_bar(v)
{
    if (v.hp < v.max_hp) {
        ctx.fillStyle = '#0b1222';
        ctx.fillRect(v.x - v.r, v.y - v.r - 9, v.r*2, 3);
        ctx.fillStyle = gold;
        ctx.fillRect(v.x - v.r, v.y - v.r - 9, (v.r*2*v.hp)/v.max_hp, 3);
    }
}

function station_surface(id)
{
    return surface_asset(`station:${id}`, 512, function (draw) {
        const accent = worlds[id].accent;
        const base = (id === 2) ? '#847262' : (id === 5) ? '#8bafc0' : (id === 7) ? '#514560' : '#77838f';
        const random = visual_random_from_seed(781 + id*18);
        draw.fillStyle = '#00000055';
        draw.beginPath();
        draw.ellipse(7, 14, 163, 128, 0, 0, Math.PI*2);
        draw.fill();
        if (id === 1) {
            for (let i = 0; i < 7; ++i) {
                draw.save();
                draw.rotate((i/7)*Math.PI*2);
                const g = draw.createLinearGradient(15, -28, 130, 30);
                g.addColorStop(0, '#94af6c');
                g.addColorStop(0.6, '#496d48');
                g.addColorStop(1, '#172b2b');
                draw.fillStyle = g;
                draw.beginPath();
                draw.ellipse(80, 0, 71, 27, 0, 0, Math.PI*2);
                draw.fill();
                draw.strokeStyle = '#b4ca8566';
                draw.stroke();
                draw.strokeStyle = '#233c2e';
                draw.beginPath();
                draw.moveTo(27, 0);
                draw.lineTo(146, 0);
                draw.stroke();
                draw.restore();
            }
        }
        else if ((id === 2) || (id === 4)) {
            material_box(draw, -78, -70, 156, 140, base);
            for (let i = -1; i <= 1; i += 2) {
                for (let j = -1; j <= 1; j += 2) {
                    const tank = draw.createLinearGradient(i*113 - 29, j*49, i*113 + 29, j*49);
                    tank.addColorStop(0, color_from_shade(base, 45));
                    tank.addColorStop(0.4, base);
                    tank.addColorStop(1, color_from_shade(base, -40));
                    draw.fillStyle = tank;
                    draw.beginPath();
                    draw.ellipse(i*113, j*49, 29, 43, 0, 0, Math.PI*2);
                    draw.fill();
                    draw.strokeStyle = '#10161d';
                    draw.lineWidth = 3;
                    draw.stroke();
                    draw.strokeStyle = '#d3c3ae55';
                    draw.lineWidth = 1;
                    draw.beginPath();
                    draw.ellipse(i*113 - 3, j*49 - 5, 22, 31, 0, Math.PI, Math.PI*2);
                    draw.stroke();
                }
            }
        }
        else if (id === 7) {
            for (let i = 0; i < 8; ++i) {
                draw.save();
                draw.rotate((i/8)*Math.PI*2);
                plate(draw, [[21, -17], [178, 0], [21, 17]], base);
                plate(draw, [[28, -9], [153, 0], [28, 5]], '#251e35');
                draw.restore();
            }
        }
        else {
            draw.strokeStyle = '#0d1723';
            draw.lineWidth = 31;
            draw.beginPath();
            draw.arc(0, 0, (id === 3) ? 110 : 94, 0, Math.PI*2);
            draw.stroke();
            draw.strokeStyle = material_gradient(draw, base, 140);
            draw.lineWidth = 23;
            draw.beginPath();
            draw.arc(0, 0, (id === 3) ? 110 : 94, 0, Math.PI*2);
            draw.stroke();
            draw.strokeStyle = `${accent}66`;
            draw.lineWidth = 3;
            draw.beginPath();
            draw.arc(0, 0, (id === 3) ? 103 : 88, 0.2, Math.PI*1.6);
            draw.stroke();
            const count = (id === 5) ? 6 : 4;
            for (let i = 0; i < count; ++i) {
                draw.save();
                draw.rotate((i/count)*Math.PI*2);
                material_box(draw, 72, -18, 92, 36, base);
                material_box(draw, 101, -11, 46, 22, '#1b334c');
                draw.fillStyle = accent;
                draw.fillRect(103, -8, 3, 16);
                draw.restore();
            }
        }
        const p = [];
        for (let i = 0; i < 8; ++i) {
            const a = (i/8)*Math.PI*2;
            p.push([Math.cos(a)*61, Math.sin(a)*61]);
        }
        plate(draw, p, base);
        plate(
            draw,
            p.map(v => [v[0]*0.77, v[1]*0.77]),
            '#283746'
        );
        const core = draw.createRadialGradient(-7, -9, 3, 0, 0, 32);
        core.addColorStop(0, '#f2ffff');
        core.addColorStop(0.25, accent);
        core.addColorStop(1, color_from_shade(accent, -95));
        draw.fillStyle = core;
        draw.beginPath();
        draw.arc(0, 0, 30, 0, Math.PI*2);
        draw.fill();
        draw.strokeStyle = '#d7e9ed88';
        draw.lineWidth = 3;
        draw.stroke();
        for (let i = 0; i < 42; ++i) {
            const a = random()*Math.PI*2;
            const r = 65 + random()*84;
            const x = Math.cos(a)*r;
            const y = Math.sin(a)*r;
            draw.fillStyle = (i % 3) ? accent : '#e8e4d0';
            draw.fillRect(x, y, 2.2, 1.2);
        }
    });
}

function render_world_station()
{
    if (view_mode === 'wireframe') {
        wireframe_render_world_station();
        return;
    }
    if (!in_view(station, 550)) {
        return;
    }
    const asset = station_surface(campaign.world);
    const w = worlds[campaign.world];
    ctx.save();
    ctx.strokeStyle = `${w.accent}18`;
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.arc(station.x, station.y, 500, 0, Math.PI*2);
    ctx.stroke();
    ctx.setLineDash([]);
    // The designer's station turns its habitat ring slowly; its berths reach the edge, so the name goes below them
    const art = world_art('station');
    const drawn = art && sprite_draw_box(art, w.accent, 460, station.x, station.y, 0, 1, clock*0.04);
    if (!drawn) {
        ctx.drawImage(asset.layer, station.x - 230, station.y - 230, 460, 460);
    }
    const label = drawn ? 262 : 180;
    ctx.fillStyle = w.accent;
    ctx.font = 'bold 12px ui-monospace,monospace';
    ctx.textAlign = 'center';
    ctx.fillText(w.station.toUpperCase(), station.x, station.y + label);
    ctx.font = '9px ui-monospace,monospace';
    ctx.fillText('STATION / R DOCK', station.x, station.y + label + 18);
    ctx.restore();
}

// The gate's frame; true when it is the designer's drawing
function render_gate_shell(v, world_gate)
{
    const radius = world_gate ? 82 : 55;
    // The designer's gates, in the colour of where they lead; the inner ring turns, a jump gate's lights run backwards
    const art = world_art(world_gate ? 'world-gate' : 'jump-gate');
    teleport_warm(v, world_gate);
    if (art && sprite_draw_box(art, v.color, radius*2.9, v.x, v.y, 0, 1, clock*(world_gate ? 0.15 : -0.25) + teleport_gate_spin(v))) {
        return true;
    }
    const asset = surface_asset(`gate:${v.color}`, 192, function (draw) {
        draw.strokeStyle = '#050c18';
        draw.lineWidth = 20;
        draw.beginPath();
        draw.arc(0, 0, 65, 0, Math.PI*2);
        draw.stroke();
        draw.strokeStyle = material_gradient(draw, '#8894a2', 75);
        draw.lineWidth = 12;
        draw.stroke();
        for (let i = 0; i < 8; ++i) {
            draw.save();
            draw.rotate((i/8)*Math.PI*2);
            material_box(draw, 57, -6, 25, 12, '#62717e');
            draw.fillStyle = v.color;
            draw.fillRect(60, -3, 12, 6);
            draw.restore();
        }
    });
    ctx.drawImage(asset.layer, v.x - radius*1.45, v.y - radius*1.45, radius*2.9, radius*2.9);
    return false;
}

function render_singularity_surface(v)
{
    const asset = surface_asset('singularity', 256, function (draw) {
        const g = draw.createRadialGradient(0, 0, 28, 0, 0, 123);
        g.addColorStop(0, '#000000');
        g.addColorStop(0.26, '#ffcc7955');
        g.addColorStop(0.55, '#b9454922');
        g.addColorStop(1, '#9c294f00');
        draw.fillStyle = g;
        draw.fillRect(-128, -128, 256, 256);
        for (let i = 0; i < 9; ++i) {
            draw.strokeStyle = (i % 2) ? '#ffd1a178' : '#ec765353';
            draw.lineWidth = 3 + i*0.4;
            draw.beginPath();
            draw.ellipse(0, 0, 42 + i*5, 14 + i*2, -0.23, 0, Math.PI*2);
            draw.stroke();
        }
        draw.fillStyle = '#000';
        draw.beginPath();
        draw.arc(0, 0, 34, 0, Math.PI*2);
        draw.fill();
        draw.strokeStyle = '#f2ac71';
        draw.lineWidth = 1.8;
        draw.stroke();
    });
    const size = v.core*7.2;
    // The designer's black hole, its core as wide as the fatal core, its accretion disk turning
    const art = world_art('black-hole');
    const drawn = art && sprite_draw_box(art, null, v.core*5.3, v.x, v.y, 0, 1, clock*0.35 + v.phase);
    if (!drawn) {
        ctx.drawImage(asset.layer, v.x - size/2, v.y - size/2, size, size);
    }
    ctx.save();
    ctx.strokeStyle = '#ff9b7555';
    ctx.lineWidth = 1;
    if (!drawn) {
        ctx.beginPath();
        ctx.ellipse(v.x, v.y, v.core*2.6, v.core*0.9, -0.23, clock*0.2, clock*0.2 + Math.PI*0.9);
        ctx.stroke();
    }
    ctx.fillStyle = pink;
    ctx.font = 'bold 10px ui-monospace,monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BLACK HOLE / FATAL CORE', v.x, v.y + v.core + 72);
    ctx.restore();
}

function ship_svg(v)
{
    if (view_mode === 'wireframe') {
        return wireframe_ship_svg(v);
    }
    // The designer's sprite, alive: see hangar_preview.js
    if (sprite(ship_sprite(v).name)) {
        return hangar_preview_html(v);
    }
    const points = ship_outline(v.shape)
        .map(v => v.join(','))
        .join(' ');
    return `<svg viewBox="-38 -32 76 64" aria-label="${v.name}"><defs><linearGradient id="hull_${v.id}" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#dce6ee"/><stop offset=".4" stop-color="#8496a8"/><stop offset="1" stop-color="#293846"/></linearGradient></defs><polygon points="${points}" fill="url(#hull_${v.id})" stroke="#c8d5df" stroke-width=".7"/><path d="M19 0L-5 -5L-19 -3L-19 3L-5 5Z" fill="#c4d0d9"/><path d="M12 0L-4 -4L-7 0L-4 4Z" fill="${v.color}"/><path d="M-21 -7L-32 -7M-21 7L-32 7" stroke="${v.color}" stroke-width="3"/></svg>`;
}

function render_pickups()
{
    if (view_mode === 'wireframe') {
        wireframe_render_pickups();
        return;
    }
    const radius = magnetic_radius();
    for (const pickup of pickups) {
        if (!in_view(pickup, radius)) {
            continue;
        }
        const color = pickup_color(pickup);
        const art = `pickups/${pickup_art(pickup)}`;
        if ((view_mode !== 'wireframe') && sprite(art)) {
            const ore = (pickup.type === 'cargo') && resource_of(pickup.key);
            const alpha = (pickup.life < 5) ? 0.5 + Math.sin(clock*10)*0.3 : 1;
            if (sprite_draw_box(art, ore ? color : null, sprite_sizes.pickup, pickup.x, pickup.y, Math.sin(clock*1.5 + pickup.x)*0.25, alpha)) {
                pickup_tether(pickup, color, radius);
                continue;
            }
        }
        const asset = surface_asset(`pickup:${pickup.type}${pickup.key ? `:${pickup.key}` : ''}`, 64, function (draw) {
            material_box(draw, -13, -11, 26, 22, '#55616e');
            material_box(draw, -10, -8, 20, 16, '#152635');
            draw.fillStyle = color;
            if (pickup.type === 'artifact') {
                plate(draw, [[0, -8], [7, 0], [0, 8], [-7, 0]], '#a68733', gold);
                draw.fillStyle = '#ffe8a4';
                draw.fillRect(-1, -4, 2, 5);
            }
            else {
                draw.fillRect(-6, -1, 12, 2);
                if ((pickup.type === 'medkit') || (pickup.type === 'health')) {
                    draw.fillRect(-1, -6, 2, 12);
                }
                else if (pickup.type === 'cargo') {
                    draw.fillRect(-6, -5, 12, 2);
                    draw.fillRect(-6, 3, 12, 2);
                }
                else if (pickup.type === 'energy') {
                    draw.beginPath();
                    draw.moveTo(1, -7);
                    draw.lineTo(-4, 1);
                    draw.lineTo(1, 0);
                    draw.lineTo(-1, 7);
                    draw.lineTo(5, -2);
                    draw.lineTo(0, -1);
                    draw.closePath();
                    draw.fill();
                }
            }
            draw.fillStyle = color;
            draw.fillRect(-12, -10, 2, 2);
            draw.fillRect(10, 8, 2, 2);
        });
        const size = (pickup.type === 'artifact') ? 26 : 32;
        ctx.save();
        ctx.globalAlpha = (pickup.life < 5) ? 0.5 + Math.sin(clock*10)*0.3 : 1;
        ctx.drawImage(asset.layer, pickup.x - size/2, pickup.y - size/2, size, size);
        ctx.restore();
        pickup_tether(pickup, color, radius);
    }
    render_pickup_glints();
}

// The pickup's file among the drawings, the same in every world: a cargo canister of a resource is an ore chunk
function pickup_art(pickup)
{
    if (pickup.type === 'cargo') {
        return resource_of(pickup.key) ? 'pickup-ore' : 'pickup-cargo';
    }
    return `pickup-${{health: 'repair', artifact: 'salvage'}[pickup.type] || pickup.type}`;
}

// A faint line from a pickup within the magnet's reach to the ship
function pickup_tether(pickup, color, radius)
{
    if (full_fx && (distance(pickup, player) < radius)) {
        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pickup.x, pickup.y);
        ctx.lineTo(player.x, player.y);
        ctx.stroke();
        ctx.restore();
    }
}

function wireframe_render_pickups()
{
    for (const pickup of pickups) {
        if (!in_view(pickup, magnetic_radius())) {
            continue;
        }
        const color = pickup_color(pickup);
        ctx.globalAlpha = (pickup.life < 5) ? 0.5 + Math.sin(clock*10)*0.3 : 1;
        const size = (pickup.type === 'artifact') ? 7 : 11;
        polygon(pickup.x, pickup.y, size + Math.sin(clock*4 + pickup.phase)*1.5, (pickup.type === 'artifact') ? 6 : 4, Math.PI/4, color, '#102b30');
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        if (pickup.type === 'artifact') {
            ctx.fillStyle = gold;
            ctx.fillRect(pickup.x - 2, pickup.y - 2, 4, 4);
        }
        else {
            ctx.beginPath();
            ctx.moveTo(pickup.x - 4, pickup.y);
            ctx.lineTo(pickup.x + 4, pickup.y);
            if ((pickup.type === 'health') || (pickup.type === 'medkit')) {
                ctx.moveTo(pickup.x, pickup.y - 4);
                ctx.lineTo(pickup.x, pickup.y + 4);
            }
            ctx.stroke();
        }
        if (full_fx && (distance(pickup, player) < magnetic_radius())) {
            ctx.globalAlpha = 0.16;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pickup.x, pickup.y);
            ctx.lineTo(player.x, player.y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
    render_pickup_glints();
}
sync_view_button();
function wireframe_render_enemies()
{
    for (const enemy of enemies) {
        if (!in_view(enemy)) {
            continue;
        }
        const color =
            (enemy.flash > 0)
                ? '#ffffff'
                : enemy.color ||
                  (((enemy.type === 'shooter') || (enemy.type === 'lancer')) ? gold : (enemy.type === 'tank') ? blue : (enemy.type === 'splitter') ? '#9dff9b' : pink);
        ctx.shadowColor = color;
        ctx.shadowBlur = full_fx ? 14 : 0;
        if (enemy.type === 'boss') {
            polygon(enemy.x, enemy.y, enemy.r, 6, clock*0.35, color, '#30132d');
            polygon(enemy.x, enemy.y, enemy.r*0.7, 6, -clock*0.5, color, '#241435');
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.r*0.33, 0, Math.PI*2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = pink;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.r + 12, clock, clock + Math.PI*1.5);
            ctx.stroke();
        }
        else if (enemy.type === 'chaser') {
            polygon(enemy.x, enemy.y, enemy.r, 3, enemy.angle, color, '#311528');
        }
        else if (enemy.type === 'splitter') {
            polygon(enemy.x, enemy.y, enemy.r, 5, clock*0.5, color, '#173229');
            polygon(enemy.x, enemy.y, enemy.r*0.45, 3, -clock, color, '#173229');
        }
        else if (enemy.type === 'lancer') {
            polygon(enemy.x, enemy.y, enemy.r, 3, (enemy.charge_time > 0) ? enemy.charge_angle : enemy.angle, color, '#30251c');
            if ((enemy.charge_cd < 0.7) && (enemy.charge_time <= 0)) {
                ctx.strokeStyle = '#ffd16e55';
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(enemy.x, enemy.y);
                ctx.lineTo(enemy.x + Math.cos(enemy.charge_angle)*200, enemy.y + Math.sin(enemy.charge_angle)*200);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
        else if (enemy.type === 'shooter') {
            polygon(enemy.x, enemy.y, enemy.r, 4, enemy.angle + Math.PI/4, color, '#30251c');
            ctx.fillStyle = color;
            ctx.fillRect(enemy.x - 3, enemy.y - 3, 6, 6);
        }
        else {
            polygon(enemy.x, enemy.y, enemy.r, 6, -clock*0.5, color, '#1e2141');
            polygon(enemy.x, enemy.y, enemy.r*0.5, 6, clock*0.5, color, '#16192c');
        }
        ctx.shadowBlur = 0;
        if (enemy.shield > 0) {
            ctx.strokeStyle = `${enemy.color}99`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.r + 7, clock, clock + (Math.PI*2*enemy.shield)/enemy.max_shield);
            ctx.stroke();
            shield_shimmer(enemy, enemy.r + 7);
        }
        if (enemy.armor > 0) {
            ctx.strokeStyle = '#e4dcad77';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.r + 3, 0, Math.PI*0.55);
            ctx.stroke();
        }
        if ((enemy.hp < enemy.max_hp) && (enemy.type !== 'boss')) {
            ctx.fillStyle = '#ffffff16';
            ctx.fillRect(enemy.x - enemy.r, enemy.y - enemy.r - 10, enemy.r*2, 3);
            ctx.fillStyle = color;
            ctx.fillRect(enemy.x - enemy.r, enemy.y - enemy.r - 10, (enemy.r*2*enemy.hp)/enemy.max_hp, 3);
        }
    }
}
