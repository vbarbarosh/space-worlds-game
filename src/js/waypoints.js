// Waypoints: Ctrl+click sets points one after another, and the ship flies through them in order, at speed through
// each, coming to rest only at the last. Ctrl+drag draws the route freehand, a point every 70 units. Ctrl+click on a
// point already set, or a drawing let go near where it began, closes the route into a patrol loop the ship flies round
// until told otherwise. While Ctrl is held the route is only being composed: points stay put and the ship waits for
// it; letting go of Ctrl starts the flight. A plain click or guided flight clears the route; WASD steers by hand
// meanwhile, and the route takes over again when let go.
let waypoints = [];
let waypoints_loop = false;
let waypoint_drawing = null;
let waypoints_composing = false;
let waypoints_by_button = false;
const waypoint_spacing = 70;

addEventListener('keydown', on_compose_key);
document.getElementById('quick_route').addEventListener('click', on_route_button);
addEventListener('keyup', on_compose_key);
addEventListener('blur', waypoints_compose_end);

function on_compose_key(event)
{
    if (event.key !== 'Control') {
        return;
    }
    if ((event.type === 'keydown') && (state === 'playing')) {
        waypoints_composing = true;
    }
    else if ((event.type === 'keyup') && !waypoints_by_button) {
        waypoints_compose_end();
    }
}

// The ROUTE button: the same as holding Ctrl, for the mouse alone; pressed again (DONE), the route is flown
function on_route_button()
{
    if (state !== 'playing') {
        return;
    }
    if (waypoints_composing) {
        waypoints_compose_end();
    }
    else {
        waypoints_composing = true;
        waypoints_by_button = true;
        show_toast('SET A ROUTE', 'CLICK POINTS OR DRAG A PATH · DONE WHEN READY', 3);
    }
    sync_route_button();
}

function sync_route_button()
{
    const b = document.getElementById('quick_route');
    b.querySelector('b').textContent = waypoints_composing ? 'DONE' : 'ROUTE';
    b.classList.toggle('on', waypoints_composing);
}

// Ctrl let go: the route composed so far is flown
function waypoints_compose_end()
{
    if (!waypoints_composing) {
        return;
    }
    waypoints_composing = false;
    waypoints_by_button = false;
    sync_route_button();
    if (waypoints.length) {
        guide_flying = false;
        waypoint_steer();
    }
}

// Ctrl+click: a new point at the end of the route; the first one starts the flight
function waypoint_add(p)
{
    const point = (view_mode === 'cockpit') ? cabin_point_from_screen(p, true) : {x: p.x/zoom + camera.x, y: p.y/zoom + camera.y};
    // On a point already set, with at least two: the route closes into a loop from that point on
    const hit = waypoints.findIndex(v => distance(v, point) < 18/zoom);
    if ((hit >= 0) && (waypoints.length >= 2)) {
        waypoints = waypoints.slice(hit).map((v, i) => ({...v, n: i + 1}));
        waypoints_loop = true;
        show_toast('PATROL', `LOOPING ${waypoints.length} POINTS · CLICK TO BREAK OFF`, 2);
        waypoint_steer();
        return;
    }
    waypoints_loop = false;
    waypoints.push({x: clamp(point.x, 24, world.w - 24), y: clamp(point.y, 24, world.h - 24), n: waypoints.length + 1});
    formation_stop(false);
    mouse_drive.following = false;
    mouse_drive.held = false;
    waypoint_steer();
}

// Ctrl+drag: the press starts a drawing, each move far enough from the last point adds one, and letting go near the
// drawing's first point closes it into a loop
function waypoint_draw_start(p)
{
    waypoint_add(p);
    // a press that closed a loop on a point already set draws nothing more
    waypoint_drawing = (waypoints.length && !waypoints_loop) ? {first: waypoints.length - 1} : null;
}

function waypoint_draw_move(p)
{
    if (!waypoint_drawing || !waypoints.length) {
        return;
    }
    const point = (view_mode === 'cockpit') ? cabin_point_from_screen(p, true) : {x: p.x/zoom + camera.x, y: p.y/zoom + camera.y};
    const last = waypoints.at(-1);
    if (distance(last, point) >= waypoint_spacing) {
        waypoints.push({x: clamp(point.x, 24, world.w - 24), y: clamp(point.y, 24, world.h - 24), n: waypoints.length + 1});
    }
}

function waypoint_draw_end()
{
    if (!waypoint_drawing) {
        return;
    }
    const first = waypoints[waypoint_drawing.first];
    const drawn = waypoints.length - waypoint_drawing.first;
    const start = waypoint_drawing.first;
    waypoint_drawing = null;
    if (!first || (drawn < 3)) {
        return;
    }
    const closed = (drawn >= 4) && (distance(first, waypoints.at(-1)) < waypoint_spacing*1.5);
    // The hand's jitter smoothed out, then laid out again a point every waypoint_spacing
    const stroke = waypoints_resample(waypoints_smooth(waypoints.slice(start), closed), closed);
    waypoints = [...waypoints.slice(0, start), ...stroke].map((v, i) => ({...v, n: i + 1}));
    if (closed) {
        waypoints = waypoints.slice(start).map((v, i) => ({...v, n: i + 1}));
        waypoints_loop = true;
        show_toast('PATROL', 'LOOPING THE DRAWN ROUTE · CLICK TO BREAK OFF', 2);
    }
}

// Chaikin's corner cutting, twice: each corner of the stroke becomes two points a quarter of the way along its sides
function waypoints_smooth(points, closed)
{
    let out = points.map(v => ({x: v.x, y: v.y}));
    for (let pass = 0; pass < 2; ++pass) {
        const next = closed ? [] : [out[0]];
        const end = closed ? out.length : out.length - 1;
        for (let i = 0; i < end; ++i) {
            const a = out[i];
            const b = out[(i + 1) % out.length];
            next.push({x: a.x*0.75 + b.x*0.25, y: a.y*0.75 + b.y*0.25}, {x: a.x*0.25 + b.x*0.75, y: a.y*0.25 + b.y*0.75});
        }
        if (!closed) {
            next.push(out.at(-1));
        }
        out = next;
    }
    return out;
}

// Points every waypoint_spacing along a polyline
function waypoints_resample(points, closed)
{
    const path = closed ? [...points, points[0]] : points;
    const out = [path[0]];
    let carry = 0;
    for (let i = 1; i < path.length; ++i) {
        const a = path[i - 1];
        const b = path[i];
        const length = distance(a, b);
        let at = waypoint_spacing - carry;
        while (at <= length) {
            out.push({x: a.x + ((b.x - a.x)*at)/length, y: a.y + ((b.y - a.y)*at)/length});
            at += waypoint_spacing;
        }
        carry = length - (at - waypoint_spacing);
    }
    if (!closed && (distance(out.at(-1), path.at(-1)) > waypoint_spacing*0.4)) {
        out.push(path.at(-1));
    }
    return out;
}

function waypoints_clear()
{
    waypoints = [];
    waypoints_loop = false;
}

// Each frame: point the click-to-move steering at the next waypoint, and move on to the following one when close,
// before the steering would brake for it
function waypoint_steer()
{
    if (!waypoints.length || waypoints_composing) {
        return;
    }
    // A point passed goes to the back of a loop, or is done with
    if ((waypoints.length > 1) && (distance(player, waypoints[0]) < 110)) {
        const passed = waypoints.shift();
        if (waypoints_loop) {
            waypoints.push(passed);
        }
    }
    if ((waypoints.length === 1) && (distance(player, waypoints[0]) < 8)) {
        waypoints_clear();
        return;
    }
    mouse_drive.x = waypoints[0].x;
    mouse_drive.y = waypoints[0].y;
    mouse_drive.active = true;
    mouse_drive.arrival_hold = false;
}

// A smooth curve through the points (Catmull-Rom, as Bézier segments)
function waypoints_curve(points)
{
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; ++i) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];
        ctx.bezierCurveTo(p1.x + (p2.x - p0.x)/6, p1.y + (p2.y - p0.y)/6, p2.x - (p3.x - p1.x)/6, p2.y - (p3.y - p1.y)/6, p2.x, p2.y);
    }
}

// The route ahead: a dashed line from the ship through every point, each numbered
function render_waypoints()
{
    if (!waypoints.length || !player) {
        return;
    }
    ctx.save();
    ctx.strokeStyle = '#6cf8ec88';
    ctx.lineWidth = 1.5/zoom;
    ctx.setLineDash([8/zoom, 8/zoom]);
    ctx.lineDashOffset = -clock*30/zoom;
    ctx.beginPath();
    waypoints_curve([player, ...waypoints, ...(waypoints_loop ? [waypoints[0]] : [])]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `bold ${11/zoom}px ui-monospace,monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // A drawn route has many points: small dots, no numbers
    if (waypoints.length > 8) {
        ctx.fillStyle = cyan;
        for (const v of waypoints) {
            ctx.beginPath();
            ctx.arc(v.x, v.y, 3/zoom, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();
        return;
    }
    for (const v of waypoints) {
        ctx.fillStyle = '#071722cc';
        ctx.strokeStyle = cyan;
        ctx.beginPath();
        ctx.arc(v.x, v.y, 10/zoom, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = cyan;
        ctx.fillText(String(v.n), v.x, v.y + 0.5/zoom);
    }
    ctx.restore();
}
