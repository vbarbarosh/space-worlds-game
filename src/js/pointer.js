function pointer_position(event)
{
    return {x: clamp((event.clientX - ox)/scale, 0, W), y: clamp((event.clientY - oy)/scale, 0, H)};
}

function update_pointer(p)
{
    pointer.screen_x = p.x;
    pointer.screen_y = p.y;
    const point = {x: p.x/zoom + camera.x, y: p.y/zoom + camera.y};
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.active = true;
}

function set_mouse_destination(p)
{
    const point = {x: p.x/zoom + camera.x, y: p.y/zoom + camera.y};
    mouse_drive.x = clamp(point.x, 24, world.w - 24);
    mouse_drive.y = clamp(point.y, 24, world.h - 24);
    mouse_drive.screen_x = p.x;
    mouse_drive.screen_y = p.y;
    mouse_drive.active = true;
    mouse_drive.arrival_hold = false;
    pointer.last = -100;
}
// Two left presses this close in time and place are a double click. The native dblclick missed often: it needs the
// pointer to stay put between the clicks, and you are steering with it
const pointer_double_ms = 450;
const pointer_double_px = 30;
let pointer_last_press = {at: -Infinity, x: 0, y: 0};

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
        if ((event.button === 0) && pointer_double_press(event, p)) {
            pointer_double_click(p);
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

// Whether this left press makes a double click with the one before it; a double click starts the pairing afresh
function pointer_double_press(event, p)
{
    const prev = pointer_last_press;
    const out = ((event.timeStamp - prev.at) < pointer_double_ms) && (Math.hypot(p.x - prev.x, p.y - prev.y) < pointer_double_px);
    pointer_last_press = out ? {at: -Infinity, x: 0, y: 0} : {at: event.timeStamp, x: p.x, y: p.y};
    return out;
}

// A double click follows a convoy under the pointer, or turns following the pointer on or off
function pointer_double_click(p)
{
    const leader = formation_pick(p);
    if (leader) {
        formation_start(leader);
        update_hud();
        return;
    }
    mouse_drive.following = !mouse_drive.following;
    mouse_drive.held = false;
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
}
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
