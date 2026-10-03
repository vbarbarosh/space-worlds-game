function pointer_position(event)
{
    if (view_mode === 'cockpit') {
        return {x: clamp(event.clientX, 0, width), y: clamp(event.clientY, 0, height)};
    }
    return {x: clamp((event.clientX - ox)/scale, 0, W), y: clamp((event.clientY - oy)/scale, 0, H)};
}

function update_pointer(p)
{
    pointer.screen_x = p.x;
    pointer.screen_y = p.y;
    const point = (view_mode === 'cockpit') ? cabin_point_from_screen(p) : {x: p.x/zoom + camera.x, y: p.y/zoom + camera.y};
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.active = true;
}

function set_mouse_destination(p)
{
    const point = (view_mode === 'cockpit') ? cabin_point_from_screen(p, true) : {x: p.x/zoom + camera.x, y: p.y/zoom + camera.y};
    mouse_drive.x = clamp(point.x, 24, world.w - 24);
    mouse_drive.y = clamp(point.y, 24, world.h - 24);
    mouse_drive.screen_x = p.x;
    mouse_drive.screen_y = p.y;
    mouse_drive.active = true;
    mouse_drive.arrival_hold = false;
    pointer.last = -100;
}
canvas.addEventListener('pointermove', function (event) {
    const p = pointer_position(event);
    if (event.pointerType === 'touch') {
        if (joystick.active && (joystick.id === event.pointerId)) {
            joystick.dx = clamp((p.x - joystick.x)/55, -1, 1);
            joystick.dy = clamp((p.y - joystick.y)/55, -1, 1);
        }
    }
    else {
        update_pointer(p);
        if (waypoint_drawing && (event.buttons & 1)) {
            waypoint_draw_move(p);
            return;
        }
        mouse_drive.held = mouse_drive.held && !!(event.buttons & 1);
        if ((mouse_drive.following || mouse_drive.held) && (state === 'playing')) {
            set_mouse_destination(p);
        }
        else {
            pointer.last = time;
        }
    }
});
canvas.addEventListener('pointerdown', function (event) {
    if (state !== 'playing') {
        return;
    }
    start_audio();
    const p = pointer_position(event);
    if ((event.pointerType === 'touch') && (event.clientX < width*0.65) && !joystick.active) {
        joystick.active = true;
        joystick.id = event.pointerId;
        joystick.x = p.x;
        joystick.y = p.y;
        joystick.dx = 0;
        joystick.dy = 0;
        mouse_drive.active = false;
        mouse_drive.following = false;
        canvas.setPointerCapture(event.pointerId);
    }
    else if (event.pointerType !== 'touch') {
        update_pointer(p);
        if (build_placing && (event.button === 2)) {
            build_placing = null;
            return;
        }
        if ((event.button === 0) && build_click({x: pointer.x, y: pointer.y})) {
            return;
        }
        if ((event.button === 0) && (event.ctrlKey || waypoints_by_button)) {
            waypoint_draw_start(p);
            canvas.setPointerCapture(event.pointerId);
            canvas.focus();
            return;
        }
        if (event.button === 0) {
            waypoints_clear();
            formation_stop();
            set_mouse_destination(p);
            canvas.focus();
            mouse_drive.turbo_since = mouse_drive.following ? clock : -1;
            mouse_drive.held = !mouse_drive.following;
        }
        if (event.button === 2) {
            pulse();
        }
    }
});
canvas.addEventListener('dblclick', function (event) {
    if ((state !== 'playing') || (event.pointerType === 'touch') || event.sourceCapabilities?.firesTouchEvents || event.ctrlKey) {
        return;
    }
    const p = pointer_position(event);
    update_pointer(p);
    const leader = formation_pick(p);
    if (leader) {
        formation_start(leader);
        update_hud();
        event.preventDefault();
        return;
    }
    mouse_drive.following = !mouse_drive.following;
    if (mouse_drive.following) {
        set_mouse_destination(p);
    }
    else {
        mouse_drive.active = false;
        player.vx = 0;
        player.vy = 0;
        pointer.last = -100;
    }
    update_hud();
    event.preventDefault();
});
function release_pointer(event)
{
    waypoint_draw_end();
    if (event.pointerType !== 'touch') {
        mouse_drive.turbo_since = -1;
        mouse_drive.held = false;
    }
    if (event.pointerId === joystick.id) {
        joystick.active = false;
        joystick.dx = 0;
        joystick.dy = 0;
    }
}
canvas.addEventListener('pointerup', release_pointer);
canvas.addEventListener('pointercancel', release_pointer);
canvas.addEventListener('contextmenu', v => v.preventDefault());
const turbo_button = document.getElementById('touch_dash');
turbo_button.addEventListener('pointerdown', function (event) {
    event.preventDefault();
    touch_boost_hold = true;
    turbo_button.setPointerCapture(event.pointerId);
    dash();
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    turbo_button.addEventListener(event, function () {
        touch_boost_hold = false;
        if (!keys.has('ShiftLeft') && !keys.has('ShiftRight')) {
            stop_turbo();
        }
    });
}
document.getElementById('touch_pulse').addEventListener('pointerdown', function (event) {
    event.preventDefault();
    pulse();
});
