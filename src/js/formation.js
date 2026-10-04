// Formation flight: the ship keeps a slot behind a friendly ship and matches its pace; steering of your own breaks it off.
const formation = {leader: null, gap: 150, heading: 0, prev: null};

// Ships the player may fly behind; today the convoy of an escort contract.
function formation_candidates()
{
    return escort ? [escort] : [];
}

function formation_screen_point(ship)
{
    return {x: (ship.x - camera.x)*zoom, y: (ship.y - camera.y)*zoom};
}

// The friendly ship under a screen point, if any.
function formation_pick(p)
{
    for (const ship of formation_candidates()) {
        const q = formation_screen_point(ship);
        if (q && (Math.hypot(q.x - p.x, q.y - p.y) < 60)) {
            return ship;
        }
    }
    return null;
}

function formation_start(ship)
{
    formation.leader = ship;
    formation.prev = {x: ship.x, y: ship.y};
    formation.heading = Math.atan2(ship.y - player.y, ship.x - player.x);
    mouse_drive.active = false;
    mouse_drive.following = false;
    mouse_drive.held = false;
    show_toast('IN FORMATION', 'FOLLOWING THE CONVOY / STEER, CLICK OR PRESS G TO BREAK OFF', 3);
}

function formation_stop(toast = true)
{
    if (!formation.leader) {
        return;
    }
    formation.leader = null;
    formation.prev = null;
    if (toast) {
        show_toast('FORMATION OFF', 'YOU HAVE THE HELM', 2);
    }
}

document.getElementById('quick_convoy').addEventListener('click', formation_toggle);

// G: fly behind the nearest friendly ship within 1,500 m, or break off.
function formation_toggle()
{
    if (state !== 'playing') {
        return;
    }
    if (formation.leader) {
        formation_stop();
        return;
    }
    const ship = formation_candidates().find(v => distance(v, player) < 1500);
    if (ship) {
        formation_start(ship);
    }
    else {
        show_toast('NOBODY TO FOLLOW', 'A CONVOY OF AN ESCORT CONTRACT CAN BE FOLLOWED', 2);
    }
}

// The stick input that holds the slot: the leader's own velocity plus a pull toward the slot, braking once there.
function formation_steer(dt)
{
    const leader = formation.leader;
    if (!formation_candidates().includes(leader)) {
        formation_stop(false);
        return null;
    }
    const vx = (dt > 0) ? (leader.x - formation.prev.x)/dt : 0;
    const vy = (dt > 0) ? (leader.y - formation.prev.y)/dt : 0;
    formation.prev = {x: leader.x, y: leader.y};
    if (Math.hypot(vx, vy) > 5) {
        formation.heading = Math.atan2(vy, vx);
    }
    const slot_x = leader.x - Math.cos(formation.heading)*formation.gap;
    const slot_y = leader.y - Math.sin(formation.heading)*formation.gap;
    const ex = slot_x - player.x;
    const ey = slot_y - player.y;
    const speed = cruise_speed();
    let wx = vx + ex*1.2;
    let wy = vy + ey*1.2;
    const want = Math.hypot(wx, wy);
    if (want > speed) {
        wx *= speed/want;
        wy *= speed/want;
    }
    if ((Math.hypot(ex, ey) < 20) && (Math.hypot(vx, vy) < 5)) {
        player.brake_time = Math.max(player.brake_time || 0, 0.1);
        return {x: 0, y: 0};
    }
    return {x: wx/speed, y: wy/speed};
}
