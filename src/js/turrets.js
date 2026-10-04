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
    else if (Math.hypot(dx, dy) > 0.1) {
        aim = Math.atan2(dy, dx);
    }
    player.turret_angle = turn_toward(Number.isFinite(player.turret_angle) ? player.turret_angle : player.angle, aim, (6 + upgrades.homing)*dt);
    update_engine_effects(dt);
}

function turret_mounts(ship = current_ship())
{
    // The turrets sit where the drawing marks them: its first two gun mounts, or its one mount twice
    const art = ship_sprite(ship);
    const points = (art && sprite(art.name) && sprite_anchors(art.name, art.length).points) || {};
    const marks = Object.keys(points).filter(v => v.startsWith('turret-')).sort().map(v => points[v]);
    if (marks.length) {
        return [marks[0], marks[1] || marks[0]].map(v => [v.x, v.y]);
    }
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

// Where shot `index` of a volley leaves, aimed at angle: the turrets take turns, and a turret with several barrels
// takes turns between them. With the weapon's drawing, at its muzzle mark, and `bore` is the barrel's opening;
// without, 13 units out along the aim.
function turret_muzzle(index, angle)
{
    const mount = turret_mounts()[index % 2];
    const c = Math.cos(player.angle);
    const s = Math.sin(player.angle);
    const x = player.x + mount[0]*c - mount[1]*s;
    const y = player.y + mount[0]*s + mount[1]*c;
    const muzzles = turret_muzzles(current_ship(), current_weapon());
    if (!muzzles) {
        return {x: x + Math.cos(angle)*13, y: y + Math.sin(angle)*13, bore: 0};
    }
    const m = muzzles[Math.floor(index/2) % muzzles.length];
    return {x: x + m.x*Math.cos(angle) - m.y*Math.sin(angle), y: y + m.x*Math.sin(angle) + m.y*Math.cos(angle), bore: m.r};
}

// A turret's drawing across: the size of the ship's first mount (the arcade's guns sit there)
function turret_box(ship)
{
    return gun_boxes[ship_mounts(ship)[0]];
}

// The muzzle marks of the weapon's turret on that ship, in game units from the turret's pivot, barrel along +x;
// null without a drawing
function turret_muzzles(ship, weapon)
{
    const name = `weapons/turret-${weapon.id}`;
    if (!sprite(name)) {
        return null;
    }
    const points = sprite_anchors_box(name, turret_box(ship)).points;
    return Object.keys(points).filter(v => v.startsWith('muzzle-')).sort().map(v => points[v]);
}

// The arcade's gun on both turret marks; in the campaign each mount's own gun, drawn at its mount's size
function render_ship_turrets(alpha = 1)
{
    const angle = player.turret_angle ?? player.angle;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.globalAlpha = alpha;
    if (arcade.active) {
        for (const mount of turret_mounts()) {
            ctx.save();
            ctx.translate(mount[0], mount[1]);
            ctx.rotate(angle - player.angle);
            turret_draw(ctx, current_weapon(), turret_box(current_ship()), (player.shoot_cd > 0.08) ? 1.5 : 0);
            ctx.restore();
        }
    }
    else {
        const guns = mounted_weapons();
        const points = mount_points();
        for (let i = 0; i < points.length; ++i) {
            ctx.save();
            ctx.translate(points[i].x, points[i].y);
            ctx.rotate(angle - player.angle);
            turret_draw(ctx, guns[i], gun_boxes[points[i].size], ((player.gun_cd?.[i] || 0) > 0.08) ? 1.5 : 0);
            ctx.restore();
        }
    }
    ctx.restore();
}

// One turret at the origin of `draw`, barrel along +x, pulled back by `recoil` after a shot: the weapon's drawing,
// `box` game units across, in the weapon's colour; the plain turret while it loads
function turret_draw(draw, weapon, box, recoil)
{
    if (sprite_draw_box(`weapons/turret-${weapon.id}`, weapon.color, box, -recoil*0.4, 0, 0, 1, 0, draw)) {
        return;
    }
    const color = weapon.color;
    draw.fillStyle = '#07101b';
    draw.strokeStyle = '#b7ced9';
    draw.lineWidth = 1;
    draw.beginPath();
    draw.arc(0, 0, 4.5, 0, Math.PI*2);
    draw.fill();
    draw.stroke();
    draw.fillStyle = '#8396a7';
    draw.fillRect(0, -2, 12 - recoil, 4);
    draw.strokeRect(0, -2, 12 - recoil, 4);
    draw.fillStyle = color;
    draw.fillRect(10 - recoil, -1.3, 3, 2.6);
}

// The minimap's corner button hides it and brings it back (minimap_on, in globals), and the choice is kept
try {
    minimap_on = localStorage.getItem('pulse_drift_minimap') !== 'off';
}
catch {
}

// The minimap's box is in the HUD, placed by CSS; it shows while flying (unless hidden) and the canvas draws the map
// inside it
function sync_minimap_button()
{
    const button = document.getElementById('minimap_button');
    if (!button) {
        return;
    }
    const flying = !!player && ['playing', 'paused'].includes(state);
    button.classList.toggle('hidden', !flying || !minimap_on);
    const toggle = document.getElementById('minimap_toggle');
    toggle.classList.toggle('hidden', !flying);
    toggle.classList.toggle('is-off', !minimap_on);
    toggle.setAttribute('aria-pressed', String(minimap_on));
    toggle.title = minimap_on ? 'Hide the minimap' : 'Show the minimap';
}

function minimap_toggle()
{
    minimap_on = !minimap_on;
    try {
        localStorage.setItem('pulse_drift_minimap', minimap_on ? 'on' : 'off');
    }
    catch {
    }
    sync_minimap_button();
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
    const body = document.querySelector('.nav-body');
    body.scrollTop = 0;
    document.getElementById('local_navigation_canvas')?.focus();
    sync_minimap_button();
}
document.getElementById('minimap_button').addEventListener('click', open_local_world_map);
document.getElementById('minimap_toggle').addEventListener('click', minimap_toggle);
sync_minimap_button();
