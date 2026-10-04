// Docking as a manoeuvre. R near the station picks the nearest of its four berths (the cradles at the ends of its arms),
// lines the ship up nose-in on a lane straight out from it, and slides it in under autopilot; the station opens when
// it is in. A steering key or a click aborts the approach. Undocking backs the ship out of its berth, turns it away,
// and hands it back a little way off the station.
const docking_berth_depth = station_size*0.45;
const docking_lane = station_size/2 + 170;
const docking_slide_time = 1.1;
let docking = null;

// The four berths, each with the direction its arm points (out from the centre)
function docking_berths()
{
    return [0, Math.PI/2, Math.PI, Math.PI*1.5].map(v => ({x: station.x + Math.cos(v)*docking_berth_depth, y: station.y + Math.sin(v)*docking_berth_depth, a: v}));
}

// R near the station: the approach to the nearest berth; done runs once the ship is in (the station, or the depot)
function docking_start(done)
{
    if (docking) {
        return;
    }
    const berth = docking_berths().sort((p, q) => distance(p, player) - distance(q, player))[0];
    const lane = {x: station.x + Math.cos(berth.a)*docking_lane, y: station.y + Math.sin(berth.a)*docking_lane};
    const line_up = clamp(distance(player, lane)/320, 0.6, 1.8);
    docking = {phase: 'in', berth, lane, from: {x: player.x, y: player.y, angle: player.angle}, t: 0, line_up, total: line_up + docking_slide_time, done};
    stop_turbo();
    guide_flying = false;
    mouse_drive.active = false;
    mouse_drive.following = false;
    waypoints_clear();
    player.invincible = Math.max(player.invincible, docking.total + 0.5);
}

// Undocked: out of the berth the ship docked at (the nearest one, after a load), backing out, then turning away
function docking_leave()
{
    const berth = docking_berths().sort((p, q) => distance(p, player) - distance(q, player))[0];
    const lane = {x: station.x + Math.cos(berth.a)*docking_lane, y: station.y + Math.sin(berth.a)*docking_lane};
    player.x = berth.x;
    player.y = berth.y;
    player.angle = berth.a + Math.PI;
    docking = {phase: 'out', berth, lane, from: {x: berth.x, y: berth.y, angle: berth.a + Math.PI}, t: 0, line_up: 1, total: 1.6, done: null};
    player.invincible = Math.max(player.invincible, docking.total + 1);
}

// Every frame in flight, after the ship has moved: while docking or undocking, the manoeuvre places it
function docking_update(dt)
{
    if (!docking || !player) {
        return;
    }
    // steering keys abort either way; a click aborts an approach (the guided flight waits for the back-out)
    const steering = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some(v => keys.has(v)) || (mouse_drive.active && (docking.phase === 'in'));
    if (steering) {
        docking = null;
        return;
    }
    const d = docking;
    d.t += dt;
    const inward = d.berth.a + Math.PI;
    let x;
    let y;
    let angle;
    if (d.phase === 'in') {
        if (d.t < d.line_up) {
            // to the lane, turning nose-in
            const k = docking_ease(d.t/d.line_up);
            x = d.from.x + (d.lane.x - d.from.x)*k;
            y = d.from.y + (d.lane.y - d.from.y)*k;
            angle = d.from.angle + docking_turn(d.from.angle, inward)*Math.min(1, k*1.6);
        }
        else {
            // the slide into the cradle, slowing to a stop
            const k = docking_ease(Math.min(1, (d.t - d.line_up)/docking_slide_time));
            x = d.lane.x + (d.berth.x - d.lane.x)*k;
            y = d.lane.y + (d.berth.y - d.lane.y)*k;
            angle = inward;
        }
    }
    else {
        if (d.t < d.line_up) {
            // backing out, nose still to the station
            const k = docking_ease(d.t/d.line_up);
            x = d.berth.x + (d.lane.x - d.berth.x)*k;
            y = d.berth.y + (d.lane.y - d.berth.y)*k;
            angle = inward;
        }
        else {
            // turning away from the station
            const k = docking_ease(Math.min(1, (d.t - d.line_up)/(d.total - d.line_up)));
            x = d.lane.x + Math.cos(d.berth.a)*30*k;
            y = d.lane.y + Math.sin(d.berth.a)*30*k;
            angle = inward + docking_turn(inward, d.berth.a)*k;
        }
    }
    player.vx = (x - player.x)/Math.max(dt, 0.001);
    player.vy = (y - player.y)/Math.max(dt, 0.001);
    player.x = x;
    player.y = y;
    player.angle = angle;
    if (d.t < d.total) {
        return;
    }
    docking = null;
    player.vx = 0;
    player.vy = 0;
    if (d.done) {
        d.done();
    }
}

function docking_ease(k)
{
    return 1 - Math.pow(1 - clamp(k, 0, 1), 3);
}

// The shortest turn from one heading to another
function docking_turn(from, to)
{
    return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}
