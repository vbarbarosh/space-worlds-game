// Cached render assets remain local to this page; gameplay and saves keep their original format.
const nebula_layers = new Map();
let last_render_state = '';
let performance_render_dirty = true;
let guide_context_cache = null;
let guide_context_cache_key = '';
addEventListener('resize', function () {
    nebula_layers.clear();
    performance_render_dirty = true;
});
function render_nebula_layer(id, sky)
{
    const key = `${id}:${W}:${H}`;
    const look = world_looks[id];
    let v = nebula_layers.get(key);
    if (!v) {
        const pad = Math.max(360, Math.ceil(Math.max(world.w, world.h)*0.025));
        const ratio = 0.5;
        const layer = document.createElement('canvas');
        layer.width = Math.ceil((W + pad*2)*ratio);
        layer.height = Math.ceil((H + pad*2)*ratio);
        const draw = layer.getContext('2d');
        draw.scale(ratio, ratio);
        draw.translate(pad, pad);
        draw.fillStyle = look.base;
        draw.fillRect(-pad, -pad, W + pad*2, H + pad*2);
        const gradient = draw.createRadialGradient(W*0.44, H*0.45, 10, W*0.44, H*0.45, Math.max(W, H));
        gradient.addColorStop(0, worlds[id].color);
        gradient.addColorStop(0.65, look.base);
        gradient.addColorStop(1, '#02040a');
        draw.fillStyle = gradient;
        draw.fillRect(-pad, -pad, W + pad*2, H + pad*2);
        for (let i = 0, end = sky.clouds.length; i < end; ++i) {
            const cloud = sky.clouds[i];
            const x = cloud.x*W + Math.sin(cloud.phase)*35;
            const y = cloud.y*H;
            const r = cloud.r*Math.max(W, H);
            const g = draw.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, `${(i % 2) ? look.second : look.cloud}${(id === 7) ? '28' : '50'}`);
            g.addColorStop(0.5, `${(i % 2) ? look.cloud : look.second}18`);
            g.addColorStop(1, `${look.cloud}00`);
            draw.fillStyle = g;
            draw.fillRect(x - r, y - r, r*2, r*2);
        } // Keep just the current sky to avoid retaining high-resolution buffers for every world.
        nebula_layers.clear();
        v = {layer, pad, w: layer.width/ratio, h: layer.height/ratio};
        nebula_layers.set(key, v);
    }
    const drift = full_fx ? Math.sin(clock*0.025)*18 : 0;
    ctx.drawImage(v.layer, -v.pad - camera.x*0.018 + drift, -v.pad - camera.y*0.012, v.w, v.h);
}

// The seeker missile: the designer's rocket, 14 units across its canvas, its band in the shooter's colour, and its
// flame from the tail mark
function projectile_missile_draw(v, color)
{
    const angle = Math.atan2(v.vy, v.vx);
    const name = 'weapons/projectile-missile';
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(angle);
    ctx.globalCompositeOperation = 'lighter';
    sprite_flames(ctx, sprite_anchors_box(name, 14).flames.main, 1, '#ffb27a', Math.sin(clock*40 + v.x)*0.2);
    ctx.restore();
    sprite_draw_box(name, color, 14, v.x, v.y, angle);
}

function render_projectiles()
{
    const groups = new Map();
    function gather(items, friendly) {
        for (let i = 0, end = items.length; i < end; ++i) {
            const v = items[i];
            if ((v.life <= 0) || !in_view(v, 100)) {
                continue;
            }
            const type = v.weapon || 'plasma';
            const color = v.color || (friendly ? cyan : pink);
            const key = `${friendly ? 'f' : 'h'}${type}${color}`;
            let group = groups.get(key);
            if (!group) {
                group = {type, color, friendly, items: []};
                groups.set(key, group);
            }
            group.items.push(v);
        }
    }
    gather(bullets, true);
    gather(hostile, false);
    // Missiles are drawn rockets when the designer's drawing is there
    const rocket = sprite('weapons/projectile-missile');
    for (const group of groups.values()) {
        if (rocket && (group.type === 'missile')) {
            for (const v of group.items) {
                projectile_missile_draw(v, group.color);
            }
            continue;
        }
        const missile = !group.friendly && (group.type === 'missile');
        // Every shot but a missile is a bolt along its flight, a raider's too: no slow round blobs
        const line = !missile;
        ctx.fillStyle = missile ? '#301a1c' : group.color;
        ctx.strokeStyle = group.color;
        // A player's shot is as wide as the bore it left; a raider's by its gun
        const bore = group.friendly && group.items[0].width;
        ctx.lineWidth = bore ? Math.max(1.4, bore) : missile ? 1.7 : (group.type === 'rail') ? 4 : (group.type === 'beam') ? 5 : 3;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        const items = group.items;
        for (let i = 0, end = items.length; i < end; ++i) {
            const v = items[i];
            if (missile) {
                const speed = Math.sqrt(v.vx*v.vx + v.vy*v.vy) || 1;
                const c = v.vx/speed;
                const n = v.vy/speed;
                ctx.moveTo(v.x + c*7, v.y + n*7);
                ctx.lineTo(v.x - c*3.5 + n*6.1, v.y - n*3.5 - c*6.1);
                ctx.lineTo(v.x - c*3.5 - n*6.1, v.y - n*3.5 + c*6.1);
                ctx.closePath();
            }
            else if (line) {
                const length = (group.type === 'beam') ? 0.042 : (group.type === 'rail') ? 0.03 : 0.018;
                ctx.moveTo(v.x, v.y);
                ctx.lineTo(v.x - v.vx*length, v.y - v.vy*length);
            }
            else {
                ctx.moveTo(v.x + v.r, v.y);
                ctx.arc(v.x, v.y, v.r, 0, Math.PI*2);
            }
        }
        const stroke_width = ctx.lineWidth;
        if (full_fx) {
            ctx.globalAlpha = 0.1;
            ctx.lineWidth = bore ? stroke_width*2.2 : stroke_width + 9;
            ctx.stroke();
            ctx.globalAlpha = 0.22;
            ctx.lineWidth = bore ? stroke_width*1.6 : stroke_width + 4;
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.lineWidth = stroke_width;
        }
        if (missile) {
            ctx.fill();
            ctx.stroke();
        }
        else if (line) {
            ctx.stroke();
        }
        else {
            ctx.fill();
        }
    }
    ctx.shadowBlur = 0;
}

function in_gravity_core(v, padding = 0)
{
    for (let i = 0, end = black_holes.length; i < end; ++i) {
        const h = black_holes[i];
        const dx = v.x - h.x;
        const dy = v.y - h.y;
        const r = h.core + padding;
        if ((Math.abs(dx) < r) && (Math.abs(dy) < r) && (dx*dx + dy*dy < r*r)) {
            return true;
        }
    }
    return false;
}

function guide_context()
{
    const m = focused_contract();
    const f = campaign.fleet;
    const s = (state === 'navigation') ? nav_return : state;
    const key = [
        campaign.world,
        mining_resource_revision,
        s,
        m?.id,
        m?.stage_index,
        m?.type,
        m?.world,
        Math.floor(m?.progress || 0),
        m?.ready,
        m?.scans?.join(','),
        campaign.route_world,
        campaign.tracked_id,
        guide_manual?.x,
        guide_manual?.y,
        guide_manual?.label,
        f?.ship_id,
        f?.weapon_id,
        f?.loadouts?.[f?.ship_id]?.join(','),
        Object.values(f?.weapon_levels || {}).join(','),
        salvage,
        Object.values(upgrades).join(','),
        Math.round((escort?.x || 0)/30),
        Math.round((escort?.y || 0)/30),
        Math.ceil(escort?.hp || 0),
        escort?.leg,
        Math.floor(player?.x/90),
        Math.floor(player?.y/90),
        Math.floor(time*5),
    ].join('|');
    if (guide_context_cache && (key === guide_context_cache_key)) {
        return guide_context_cache;
    }
    guide_context_cache_key = key;
    guide_context_cache = build_guide_context();
    return guide_context_cache;
}
