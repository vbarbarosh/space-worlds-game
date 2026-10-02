// The hull steers gradually while independently traversing turrets handle aiming.
let touch_boost_hold = false;
function turn_toward(angle, target, limit)
{
    const delta = Math.atan2(Math.sin(target - angle), Math.cos(target - angle));
    return angle + clamp(delta, -limit, limit);
}

function update_ship_orientation(dt, target, dx, dy)
{
    let aim = Number.isFinite(player.turret_angle) ? player.turret_angle : player.angle;
    if (pointer.active && (time - pointer.last < 2) && !mouse_drive.active && !mouse_drive.following) {
        aim = Math.atan2(pointer.y - player.y, pointer.x - player.x);
    }
    else if (target) {
        aim = Math.atan2(target.y - player.y, target.x - player.x);
    }
    else if (view_mode === 'cockpit') {
        aim = cabin.yaw;
    }
    else if (Math.hypot(dx, dy) > 0.1) {
        aim = Math.atan2(dy, dx);
    }
    player.turret_angle = turn_toward(Number.isFinite(player.turret_angle) ? player.turret_angle : player.angle, aim, (6 + upgrades.homing)*dt);
    update_engine_effects(dt);
}

function turret_mounts()
{
    const ship = current_ship();
    return (ship.shape >= 4)
        ? [
            [3, -13],
            [3, 13],
        ]
        : (ship.shape === 3)
            ? [
                [-2, -11],
                [-2, 11],
            ]
            : [
                [-1, -7],
                [-1, 7],
            ];
}

function turret_muzzle(index, angle)
{
    const mount = turret_mounts()[index % 2];
    const c = Math.cos(player.angle);
    const s = Math.sin(player.angle);
    return {x: player.x + mount[0]*c - mount[1]*s + Math.cos(angle)*13, y: player.y + mount[0]*s + mount[1]*c + Math.sin(angle)*13};
}

function render_ship_turrets(alpha = 1)
{
    const angle = player.turret_angle ?? player.angle;
    const color = current_weapon().color;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.globalAlpha = alpha;
    for (const mount of turret_mounts()) {
        ctx.save();
        ctx.translate(mount[0], mount[1]);
        ctx.rotate(angle - player.angle);
        ctx.fillStyle = '#07101b';
        ctx.strokeStyle = (view_mode === 'wireframe') ? color : '#b7ced9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        const recoil = (player.shoot_cd > 0.08) ? 1.5 : 0;
        ctx.fillStyle = (view_mode === 'wireframe') ? '#214e5a' : '#8396a7';
        ctx.fillRect(0, -2, 12 - recoil, 4);
        ctx.strokeRect(0, -2, 12 - recoil, 4);
        ctx.fillStyle = color;
        ctx.fillRect(10 - recoil, -1.3, 3, 2.6);
        ctx.restore();
    }
    ctx.restore();
}

function cabin_render_turrets(deck, accent)
{
    const W = width;
    const H = height;
    const bearing = Math.atan2(Math.sin((player.turret_angle ?? player.angle) - cabin.yaw), Math.cos((player.turret_angle ?? player.angle) - cabin.yaw));
    const fire = (player.shoot_cd > 0) && (player.shoot_cd < 0.09) && (state === 'playing');
    for (const side of [-1, 1]) {
        const x = W*0.5 + side*W*0.2;
        material_box(ctx, x - W*0.028, deck - H*0.012, W*0.056, H*0.12, '#425361');
        ctx.save();
        ctx.translate(x, deck + H*0.022);
        ctx.rotate(clamp(bearing, -1.6, 1.6)*0.65);
        material_box(ctx, -W*0.014, -H*0.05, W*0.028, H*0.06, '#687e92');
        ctx.fillStyle = '#0a1019';
        ctx.fillRect(-W*0.007, -H*0.06, W*0.014, H*0.044);
        ctx.fillStyle = accent;
        ctx.fillRect(-W*0.007, -H*0.063, W*0.014, 3);
        if (fire && full_fx) {
            ctx.fillStyle = accent + '77';
            ctx.beginPath();
            ctx.moveTo(-5, -H*0.061);
            ctx.lineTo(0, -H*0.11);
            ctx.lineTo(5, -H*0.061);
            ctx.fill();
        }
        ctx.restore();
    }
    cabin_label('TURRET ' + Math.round((bearing*180)/Math.PI) + '°', W*0.6, H*0.888, (W < 700) ? 6 : 8, accent, 'center');
}

function sync_minimap_button()
{
    const button = document.getElementById('minimap_button');
    if (!button) {
        return;
    }
    const cockpit = view_mode === 'cockpit';
    const viewport = cockpit ? width : W;
    const w = (viewport < 800) ? 165 : 186;
    const h = (viewport < 800) ? 125 : 140;
    const k = cockpit ? 1 : scale;
    button.style.left = (cockpit ? 0 : ox) + (viewport - w - 22)*k + 'px';
    button.style.top = (cockpit ? 0 : oy) + 87*k + 'px';
    button.style.width = w*k + 'px';
    button.style.height = h*k + 'px';
    button.classList.toggle('hidden', !player || !['playing', 'paused'].includes(state));
}

function open_local_world_map()
{
    if (!['playing', 'paused', 'navigation'].includes(state)) {
        return;
    }
    nav_tab = 'local';
    local_map_mode = 'whole';
    if (state === 'navigation') {
        render_navigation();
    }
    else {
        toggle_navigation();
    }
    const body = document.querySelector('.navigation-body');
    body.scrollTop = 0;
    document.getElementById('local_navigation_canvas')?.focus();
    sync_minimap_button();
}
document.getElementById('minimap_button').addEventListener('click', open_local_world_map);
sync_minimap_button();
