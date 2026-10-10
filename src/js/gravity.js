// Whether a point lies in a black hole's pull: a save never keeps a ship there, so a continue cannot drop it back in
function in_gravity_pull(p)
{
    return black_holes.some(v => distance(v, p) < gravity_reach(v));
}

function gravity_reach(h)
{
    return Math.max(h.radius*2.8, h.radius + 1700);
}

function gravity_pull(h, d)
{
    const reach = gravity_reach(h);
    if ((d >= reach) || (d < 0.1)) {
        return 0;
    }
    const outer = 1 - d/reach;
    const inner = Math.max(0, 1 - d/h.radius);
    return (
        ((25*Math.sqrt(outer) + 65*outer*outer)*(h.strength/1000) + (h.strength*0.8*inner*inner)/(0.7 + d/h.radius))*
        current_world_rules().gravity
    );
}

// The position is read once and written back only when a hole moved it: objects of every kind pass here each frame,
// and each read of a field on so many shapes boxes a number
function gravity_move(v, dt)
{
    let x = v.x;
    let y = v.y;
    let moved = false;
    for (let i = 0, end = black_holes.length; i < end; ++i) {
        const h = black_holes[i];
        const dx = h.x - x;
        const dy = h.y - y;
        const reach = gravity_reach(h);
        const squared = dx*dx + dy*dy;
        if ((squared >= reach*reach) || (squared < 0.01)) {
            continue;
        }
        const d = Math.sqrt(squared);
        const pull = gravity_pull(h, d);
        const step = Math.min(d, pull*dt);
        x += (dx/d)*step;
        y += (dy/d)*step;
        moved = true;
        if ((v !== player) && (typeof v.vx === 'number')) {
            v.vx += (dx/d)*pull*dt*2;
            v.vy += (dy/d)*pull*dt*2;
        }
    }
    if (moved) {
        v.x = x;
        v.y = y;
    }
}

function place_gravity_wells(protected_objects)
{
    const holes = black_holes.length ? black_holes : [{x: 0, y: 0, radius: 1080, core: 58, strength: 920 + wave*12, phase: campaign.world*0.8}];
    const black_holes_placed = [];
    const spots = [
        [0.07, 0.07],
        [0.93, 0.93],
        [0.07, 0.93],
        [0.93, 0.07],
        [0.5, 0.06],
        [0.5, 0.94],
        [0.06, 0.5],
        [0.94, 0.5],
    ];
    function safe(h, separate) {
        return (
            protected_objects.every(v => distance(h, v) > gravity_reach(h) + 250) &&
            portals.every(v => distance(h, v) > h.radius + 250) &&
            black_holes_placed.every(v => distance(h, v) > (separate ? gravity_reach(h) + gravity_reach(v) + 100 : h.radius + v.radius + 600))
        );
    }
    next_hole: for (const hole of holes) {
        if (safe(hole, true)) {
            black_holes_placed.push(hole);
            continue;
        }
        for (let pass = 0; pass < 2; ++pass) {
            for (let i = 0, end = spots.length; i < end; ++i) {
                const v = spots[(i + campaign.world) % end];
                const candidate = {...hole, x: clamp(world.w*v[0], 650, world.w - 650), y: clamp(world.h*v[1], 650, world.h - 650)};
                if (safe(candidate, pass === 0)) {
                    black_holes_placed.push(candidate);
                    continue next_hole;
                }
            }
        }
    }
    black_holes = black_holes_placed;
    gravity_warning_cd = 0;
    gravity_was_active = false;
    // Relocated cores must leave every local gate and its exit clear.
    ore_nodes = ore_nodes.filter(v => black_holes.every(vv => distance(vv, v) > vv.radius + v.r + 180));
}

function nearest_gravity()
{
    let out = null;
    for (const black_hole of black_holes) {
        const d = distance(black_hole, player);
        const pull = gravity_pull(black_hole, d);
        if ((pull > 0) && (!out || (pull > out.pull))) {
            out = {h: black_hole, d, pull};
        }
    }
    return out;
}

function update_gravity_warning(dt)
{
    gravity_warning_cd = Math.max(0, gravity_warning_cd - dt);
    const v = nearest_gravity();
    if (v && (!gravity_was_active || (gravity_warning_cd <= 0))) {
        sfx('gravity');
        gravity_warning_cd = (v.d < v.h.radius) ? 1.4 : 3.5;
    }
    gravity_was_active = !!v;
}

function render_gravity_fields()
{
    ctx.save();
    for (const black_hole of black_holes) {
        const reach = gravity_reach(black_hole);
        if (!in_view(black_hole, reach)) {
            continue;
        }
        ctx.strokeStyle = '#ff9cc83a';
        ctx.lineWidth = 1;
        ctx.setLineDash([10, 20]);
        ctx.beginPath();
        ctx.arc(black_hole.x, black_hole.y, reach, 0, Math.PI*2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ff9cc880';
        ctx.font = '10px ui-monospace,monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GRAVITY BEGINS / STEER AWAY', black_hole.x, black_hole.y - reach - 18);
    }
    ctx.restore();
}

function render_gravity_direction()
{
    if (!player || (state !== 'playing')) {
        return;
    }
    const v = nearest_gravity();
    if (!v) {
        return;
    }
    const a = Math.atan2(v.h.y - player.y, v.h.x - player.x);
    const x = (player.x - camera.x)*zoom;
    const y = (player.y - camera.y)*zoom;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.strokeStyle = (v.d < v.h.radius) ? pink : '#ffaacb';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(38, 0);
    ctx.lineTo(74, 0);
    ctx.moveTo(67, -5);
    ctx.lineTo(74, 0);
    ctx.lineTo(67, 5);
    ctx.stroke();
    ctx.rotate(-a);
    ctx.fillStyle = '#ffc5dd';
    ctx.font = '9px ui-monospace,monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`PULL ${Math.ceil(v.pull)} m/s`, 0, 51);
    ctx.restore();
}

function update_hazards(dt)
{
    update_world_environment(dt);
    update_gravity_warning(dt);
    update_environment_audio();
}
