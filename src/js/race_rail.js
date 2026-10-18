// The Races mode's second kind, Turbo (race_mode.kind): the course is a track, a smooth line through the start and
// the rings with an edge on each side, and every racer rides it by itself; yours is only the turbo (Shift, a held
// mouse button, a finger held anywhere). Off the turbo a ship eases back to its cruising speed; on it, it climbs toward
// its turbo speed. A bend holds a ship up to a speed, its grip against how tight the bend is: faster, it slides out
// toward the edge, and past the edge it spins off, slowed to a crawl, and comes back on a moment later. So the race is
// knowing when to press and when to let go. The rivals ride the same track by the same rules, each letting go before
// a bend by its nerve. Nothing of it is saved: the track is made from the course each time.

// Each difficulty's track: its half-width, and the grip of a bend (more grip, faster through it); and its rivals: their
// turbo against yours, and their nerve, how near the limit of a bend they go (tuned against a test pilot who looks
// every quarter second: Easy won by a few seconds, Normal close, Hard only flown near the limit)
const race_rail_levels = {
    easy: {w: 200, grip: 1.25, top: 0.86, nerve: -0.1},
    normal: {w: 165, grip: 1, top: 0.95, nerve: -0.03},
    hard: {w: 135, grip: 0.85, top: 1, nerve: -0.03},
};
// The track's points, this far apart along it
const race_rail_step = 16;
// The tightest bend a ship holds at its cruising speed with a grip of 1, as a radius
const race_rail_grip_r = 260;
// On the turbo the speed climbs by this share of cruising speed a second; let go, it falls by this one
const race_rail_rise = 1.1;
const race_rail_fall = 1.3;
// Off the track: the seconds of the spin, and the share of the speed kept; a spin costs about 1.5 s of a race (the
// author's log: at 2.5 s, a spin was last place in a field 2 s wide)
const race_rail_spin = 0.7;
const race_rail_spin_keep = 0.55;
// Over the grip, the slide out grows this many times the side force not held: a few per cent too fast already shows,
// ten throws a ship off
const race_rail_slide = 3;
// Your kerbs show the bends this many seconds ahead of you at your speed
const race_rail_look = 3;
// A person's reaction: a bend lights red this many seconds before letting go is too late
const race_rail_react = 0.35;
// Your path ahead is shown this many seconds on (race_rail_path_ahead); its ride and point worked out in place
const race_rail_ahead = 1.6;
const race_rail_ghost = {s: 0, v: 0, d: 0, u: 0, spin: 0, lane: 0, base: 0, top: 0, turbo: false, at: 0};
const race_rail_ghost_at = {x: 0, y: 0, vx: 0, vy: 0, angle: 0};
// The view looks this many seconds ahead of you along the track (as far as 30% of the view, js/race_view.js), easing
// to it
const race_rail_lead = 0.7;
// track: the track of the race on; grip: the side force a bend holds (px/s²); rise and fall: the climb on the turbo
// and the slowing off it; profile: at each point of the track, the fastest a ship may go and still slow for the
// bends after it by letting go; you: your ride; held: a mouse button or a finger down on the screen; spins: yours;
// lead: how far ahead of you the view looks (update_camera)
const race_rail = {track: null, grip: 0, fall: 0, rise: 0, profile: null, you: null, held: false, spins: 0, lead: {x: 0, y: 0}};
// The tracks made, by their course
const race_rail_tracks = new WeakMap();

// A race of the Turbo kind is on: you ride its track
function race_rail_on()
{
    return race_mode.active && (race_mode.kind === 'turbo') && !!race.course && !!race_rail.track;
}

// You ride the track now: from your place on the line to the results
function race_rail_riding()
{
    return race_rail_on() && (race.phase !== 'idle') && (state === 'playing');
}

// The track of a course: a Catmull-Rom line through the start and every ring, a stretch before the start and a long
// one past the finish to coast down on; its points race_rail_step apart, each with its heading, its curvature (signed:
// a bend to the left of the way is positive), its edges, and the distance along it of the start and of each ring
function race_rail_track(course, w)
{
    const kept = race_rail_tracks.get(course);
    if (kept && (kept.w === w)) {
        return kept;
    }
    const rings = course.rings;
    const a = course.start.angle;
    const last = rings[rings.length - 1];
    const before = rings[rings.length - 2] || course.start;
    const exit = Math.atan2(last.y - before.y, last.x - before.x);
    const control = [
        {x: course.start.x - Math.cos(a)*1200, y: course.start.y - Math.sin(a)*1200},
        {x: course.start.x - Math.cos(a)*600, y: course.start.y - Math.sin(a)*600},
        course.start,
        ...rings,
        {x: last.x + Math.cos(exit)*900, y: last.y + Math.sin(exit)*900},
        {x: last.x + Math.cos(exit)*1800, y: last.y + Math.sin(exit)*1800},
    ];
    // dense along each piece, then one point every race_rail_step
    const xs = [];
    const ys = [];
    const marks = [];
    let s = 0;
    let px = control[1].x;
    let py = control[1].y;
    let next = 0;
    for (let i = 1; i < control.length - 2; ++i) {
        const p0 = control[i - 1];
        const p1 = control[i];
        const p2 = control[i + 1];
        const p3 = control[i + 2];
        marks.push(s);
        const pieces = Math.ceil(distance(p1, p2)/4);
        for (let j = (i === 1) ? 0 : 1; j <= pieces; ++j) {
            const t = j/pieces;
            const t2 = t*t;
            const t3 = t2*t;
            const x = 0.5*(2*p1.x + (p2.x - p0.x)*t + (2*p0.x - 5*p1.x + 4*p2.x - p3.x)*t2 + (3*p1.x - p0.x - 3*p2.x + p3.x)*t3);
            const y = 0.5*(2*p1.y + (p2.y - p0.y)*t + (2*p0.y - 5*p1.y + 4*p2.y - p3.y)*t2 + (3*p1.y - p0.y - 3*p2.y + p3.y)*t3);
            s += Math.hypot(x - px, y - py);
            px = x;
            py = y;
            while (s >= next) {
                xs.push(x);
                ys.push(y);
                next += race_rail_step;
            }
        }
    }
    marks.push(s);
    const n = xs.length;
    const hs = new Float32Array(n);
    const ks = new Float32Array(n);
    const lx = new Float32Array(n);
    const ly = new Float32Array(n);
    const rx = new Float32Array(n);
    const ry = new Float32Array(n);
    for (let i = 0; i < n; ++i) {
        const p = Math.max(0, i - 1);
        const q = Math.min(n - 1, i + 1);
        hs[i] = Math.atan2(ys[q] - ys[p], xs[q] - xs[p]);
    }
    // the curvature over five points either side: a ring's corner reads as one bend, not as noise
    for (let i = 0; i < n; ++i) {
        const p = Math.max(0, i - 5);
        const q = Math.min(n - 1, i + 5);
        ks[i] = (q > p) ? Math.atan2(Math.sin(hs[q] - hs[p]), Math.cos(hs[q] - hs[p]))/((q - p)*race_rail_step) : 0;
        const nx = -Math.sin(hs[i]);
        const ny = Math.cos(hs[i]);
        lx[i] = xs[i] - nx*w;
        ly[i] = ys[i] - ny*w;
        rx[i] = xs[i] + nx*w;
        ry[i] = ys[i] + ny*w;
    }
    const start = marks[1];
    const out = {
        w,
        n,
        xs: Float32Array.from(xs),
        ys: Float32Array.from(ys),
        hs,
        ks,
        lx,
        ly,
        rx,
        ry,
        start,
        rings: marks.slice(2, 2 + rings.length),
        end: (n - 1)*race_rail_step,
    };
    race_rail_tracks.set(course, out);
    return out;
}

// A course fits a track of a difficulty: the track clear of structures, gates, beacons and pulls from the start to past
// the finish, edge to edge, or with room a share of its width (race_course_make's accept); the rocks on it are cleared
// when the race begins (race_rail_begin)
function race_rail_fits(course, level, room = 0.6)
{
    const w = race_rail_levels[level].w;
    const track = race_rail_track(course, w);
    const to = Math.min(track.n - 1, Math.round((track.rings[track.rings.length - 1] + 300)/race_rail_step));
    for (let i = Math.round(track.start/race_rail_step); i <= to; i += 4) {
        if (!race_spot_clear({x: track.xs[i], y: track.ys[i]}, w*room, false)) {
            return false;
        }
    }
    return true;
}

// The race lined up (race_mode_start): the track made and the rocks on it cleared, the grip and the turbo's numbers
// from your ship, the speed each point allows, you and the rivals on the line
function race_rail_begin(level)
{
    const def = race_rail_levels[level];
    const cruise = cruise_speed();
    const track = race_rail_track(race.course, def.w);
    race_rail.track = track;
    race_rail_clear_rocks(track);
    race_rail.grip = (cruise*cruise*def.grip)/race_rail_grip_r;
    race_rail.rise = cruise*race_rail_rise;
    race_rail.fall = cruise*race_rail_fall;
    race_rail.held = false;
    race_rail.spins = 0;
    race_rail.lead.x = 0;
    race_rail.lead.y = 0;
    // from the finish back: no faster than the bend here allows, nor than letting go can slow to the next one in time
    const profile = new Float32Array(track.n);
    profile[track.n - 1] = 1e5;
    for (let i = track.n - 2; i >= 0; --i) {
        const safe = Math.sqrt(race_rail.grip/Math.max(1e-6, Math.abs(track.ks[i])));
        profile[i] = Math.min(safe, Math.sqrt(profile[i + 1]*profile[i + 1] + 2*race_rail.fall*race_rail_step));
    }
    race_rail.profile = profile;
    race_rail.you = race_rail_ride(0, cruise, turbo_speed());
    const fuel = turbo_duration(ship_catalog.find(v => v.id === race_mode_ship));
    for (const v of race.racers) {
        if (v.you) {
            continue;
        }
        // its place on the line across the track, and its lane: a share of the track's width by its side; its turbo
        // as quick as yours by the difficulty's pace, a little more with its skill (its cruising speed counts for
        // little here: a race on the track is flown on the turbo and through the bends)
        const a = race.course.start.angle;
        const d = (v.slot.x - race.course.start.x)*-Math.sin(a) + (v.slot.y - race.course.start.y)*Math.cos(a);
        v.ride = race_rail_ride(clamp(d/race_slot_gap, -2, 2)*def.w*0.38, v.pace, turbo_speed()*def.top*(0.96 + 0.06*v.skill));
        v.ride.d = d;
        v.ride.fuel = fuel;
        v.ride.tank = fuel;
        v.ride.edge = def.nerve;
        v.ride.nerve = race_rail_nerve(v);
    }
}

// The rocks on the track and a hull beyond its edges taken away: a Races mode world is made up for the race and never
// saved, and a ship that cannot steer must not ride through a rock (the courses of Haven at Normal and Hard had none
// clear of them)
function race_rail_clear_rocks(track)
{
    const room = track.w + 40;
    const from = Math.max(0, Math.round(track.start/race_rail_step) - 10);
    ore_nodes = ore_nodes.filter(function (v) {
        const reach = room + v.r;
        for (let i = from; i < track.n; i += 2) {
            const dx = track.xs[i] - v.x;
            const dy = track.ys[i] - v.y;
            if ((Math.abs(dx) < reach) && (Math.abs(dy) < reach) && ((dx*dx + dy*dy) < reach*reach)) {
                return false;
            }
        }
        return true;
    });
}

// One racer's ride: s along the track from its start, v its speed, d its offset across (left negative), u its slide,
// spin the seconds of a spin left; lane the offset it keeps to; base and top its cruising and turbo speeds
function race_rail_ride(lane, base, top)
{
    return {s: race_rail.track.start, v: 0, d: lane, u: 0, spin: 0, lane, base, top, turbo: false, at: 0};
}

// How near a rival goes to the limit until its next ring: the best close to it and steady, the weakest short of it,
// and now and then over it, so they slide, and off they go
function race_rail_nerve(v)
{
    return 0.88 + v.ride.edge + 0.1*v.skill + rand(-0.04, 0.12)*(1.2 - v.skill);
}

// The point of the track at a distance along it, as an index
function race_rail_index(s)
{
    return Math.floor(clamp(s/race_rail_step, 0, race_rail.track.n - 1.001));
}

// One frame of a ride: the speed toward the turbo's or the cruise's; in a bend faster than the grip holds, a slide out;
// past the edge, a spin; held, it eases back to its lane. True on a spin begun.
function race_rail_move(r, dt)
{
    const track = race_rail.track;
    let spun = false;
    if (r.spin > 0) {
        r.spin -= dt;
        r.v = Math.max(r.base*0.5, r.v - race_rail.fall*0.5*dt);
        r.u *= Math.exp(-3*dt);
        if (r.spin <= 0) {
            // back on: steering in from the edge
            r.u = -Math.sign(r.d)*r.base*0.6;
        }
    }
    else {
        const top = r.turbo ? r.top : r.base;
        r.v = (r.v < top) ? Math.min(top, r.v + race_rail.rise*(r.turbo ? 1 : 2)*dt) : Math.max(top, r.v - race_rail.fall*dt);
    }
    r.s = Math.min(track.end, r.s + r.v*dt);
    const i = race_rail_index(r.s);
    const k = track.ks[i];
    const over = r.v*r.v*Math.abs(k) - race_rail.grip;
    if ((r.spin <= 0) && (over > 0)) {
        // out of a bend is away from its middle; the slide scrubs a little speed
        r.u += -Math.sign(k)*over*race_rail_slide*dt;
        r.v = Math.max(r.base*0.5, r.v - over*0.3*dt);
    }
    else if (r.spin <= 0) {
        const want = clamp((r.lane - r.d)*2.5, -r.base*0.7, r.base*0.7);
        r.u += clamp(want - r.u, -r.base*2*dt, r.base*2*dt);
    }
    r.d += r.u*dt;
    if ((r.spin <= 0) && (over > 0) && (Math.abs(r.d) > track.w)) {
        r.spin = race_rail_spin;
        r.v *= race_rail_spin_keep;
        r.u = Math.sign(r.d)*Math.min(Math.abs(r.u), r.base*0.5);
        spun = true;
    }
    // a spin takes it no farther out than a hull past the edge
    r.d = clamp(r.d, -track.w - 90, track.w + 90);
    return spun;
}

// Where a ride is: its point, its heading with the slide in it, a spin turning the hull round; its velocity for the
// camera, the flame and the trail
function race_rail_place(r, to)
{
    const track = race_rail.track;
    const i = race_rail_index(r.s);
    const f = clamp(r.s/race_rail_step - i, 0, 1);
    const j = Math.min(track.n - 1, i + 1);
    const h = track.hs[i];
    const nx = -Math.sin(h);
    const ny = Math.cos(h);
    to.x = track.xs[i] + (track.xs[j] - track.xs[i])*f + nx*r.d;
    to.y = track.ys[i] + (track.ys[j] - track.ys[i])*f + ny*r.d;
    to.vx = Math.cos(h)*r.v + nx*r.u;
    to.vy = Math.sin(h)*r.v + ny*r.u;
    to.angle = h + Math.atan2(r.u, Math.max(1, r.v))*0.8 + ((r.spin > 0) ? (race_rail_spin - r.spin)*(Math.PI*2.2/race_rail_spin) : 0);
}

// A ride over its next ring: passed by its distance along the track, whichever lane it rides
function race_rail_rings(v, r)
{
    const rings = race.course.rings;
    let passed = false;
    while ((v.next < rings.length) && (r.s >= race_rail.track.rings[v.next])) {
        race_ring_effect(rings[v.next], v);
        v.next++;
        v.splits.push(Math.round(race.clock*10)/10);
        passed = true;
        if (v.next >= rings.length) {
            v.time = race.clock;
            v.turbo = 0;
        }
    }
    return passed;
}

// Your ship each frame on the track (instead of fly_in_world): on the line until green, then the ride; the turbo's tank
// runs down while it burns, as in flight
function race_rail_fly(dt)
{
    const r = race_rail.you;
    if (!['racing', 'done', 'results'].includes(race.phase)) {
        // on the line: race_hold keeps you in your place during the count
        player.vx = 0;
        player.vy = 0;
        player.engine_thrust = 0;
        return;
    }
    r.turbo = !!player.turbo_active && (race.phase === 'racing');
    if (player.turbo_active) {
        player.dash_time = Math.max(0, player.dash_time - dt);
        player.turbo_fuel = player.dash_time;
        if ((player.dash_time <= 0) || (race.phase !== 'racing')) {
            stop_turbo();
        }
    }
    if (race_rail_move(r, dt)) {
        race_rail.spins++;
        race.crashes++;
        shake = 10;
        sfx('hit');
        show_toast('OFF THE TRACK', 'LET GO BEFORE THE BEND', 2.5, 'danger');
        play_log_event('race_spin', {at: Math.round(race.clock*10)/10, ring: race_you().next + 1});
    }
    race_rail_place(r, player);
    // the view eases toward a point ahead along the track, not the slide or the spin
    const h = race_rail.track.hs[race_rail_index(r.s)];
    const k = 1 - Math.exp(-2.5*dt);
    race_rail.lead.x += (Math.cos(h)*r.v*race_rail_lead - race_rail.lead.x)*k;
    race_rail.lead.y += (Math.sin(h)*r.v*race_rail_lead - race_rail.lead.y)*k;
    player.hull_turn = 0;
    player.turbo_heading = player.angle;
    player.engine_thrust = (r.spin > 0) ? 0 : r.turbo ? 1 : 0.45;
}

// Every frame of a race on the track, as race_update's racing step: your rings and the finish, then the rivals
function race_rail_update(m, dt)
{
    const you = race_you();
    you.x = player.x;
    you.y = player.y;
    if (race_rail_rings(you, race_rail.you)) {
        m.progress = you.next;
        if (you.next >= race.course.rings.length) {
            race_you_finish(m);
        }
        else {
            sfx('ring');
        }
    }
    race_rail_rivals(dt);
}

// The rivals on the track: each on its own reaction to green, the turbo on while it is under what the track ahead
// allows by its nerve and its tank holds out, off past it; a new nerve at each ring; over the line, it coasts
function race_rail_rivals(dt)
{
    for (const v of race.racers) {
        if (v.you || v.out) {
            continue;
        }
        const r = v.ride;
        v.flash = Math.max(0, v.flash - dt);
        if (race.clock < v.delay) {
            continue;
        }
        if (v.time !== null) {
            r.turbo = false;
        }
        else {
            // it looks again five times a second, not every frame: a hand on the turbo, not a computer's
            r.at -= dt;
            if (r.at <= 0) {
                r.at = 0.2 - 0.1*v.skill;
                const want = Math.min(race_rail.profile[race_rail_index(r.s)], race_rail.profile[race_rail_index(r.s + r.v*0.15)])*r.nerve;
                r.turbo = (r.v < want*0.97) && (r.v < r.top) && (r.fuel > (r.turbo ? 0 : 1)) && (r.spin <= 0);
            }
        }
        r.fuel = r.turbo ? Math.max(0, r.fuel - dt) : Math.min(r.tank, r.fuel + (r.tank*dt)/dash_cooldown());
        if (r.fuel <= 0) {
            r.turbo = false;
        }
        race_rail_move(r, dt);
        race_rail_place(r, v);
        v.turbo = r.turbo ? 1 : 0;
        if (race_rail_rings(v, r)) {
            r.nerve = race_rail_nerve(v);
        }
    }
}

// A mouse button or a finger down on the screen in a race on the track: the turbo, until it lifts
function race_rail_press()
{
    race_rail.held = true;
    dash();
}

// The race over or left: no track
function race_rail_reset()
{
    race_rail.track = null;
    race_rail.profile = null;
    race_rail.you = null;
    race_rail.held = false;
}

// The track under the race: the band, its two edges, red and white kerbs on the bends, ahead of you the edges of the
// bends you are too fast for (amber half a second before red, red once you must let go), and your path ahead
function race_rail_draw()
{
    const track = race_rail.track;
    if (!track) {
        return;
    }
    const pad = track.w + 60;
    const left = camera.x - pad;
    const top = camera.y - pad;
    const right = camera.x + width/zoom + pad;
    const bottom = camera.y + height/zoom + pad;
    const from = Math.round(track.start/race_rail_step) - 20;
    const to = Math.min(track.n - 1, Math.round((track.rings[track.rings.length - 1] + 900)/race_rail_step));
    ctx.save();
    // the band: between its edges, filled, for each stretch in view (a fill rasters cheaper than a stroke this wide)
    ctx.fillStyle = 'rgba(120, 170, 220, 0.07)';
    ctx.beginPath();
    for (let i = Math.max(0, from); i <= to; ++i) {
        if (!race_rail_in(track.xs[i], track.ys[i], left, top, right, bottom)) {
            continue;
        }
        let j = i;
        while ((j < to) && race_rail_in(track.xs[j + 1], track.ys[j + 1], left, top, right, bottom)) {
            ++j;
        }
        ctx.moveTo(track.lx[i], track.ly[i]);
        for (let k = i + 1; k <= j; ++k) {
            ctx.lineTo(track.lx[k], track.ly[k]);
        }
        for (let k = j; k >= i; --k) {
            ctx.lineTo(track.rx[k], track.ry[k]);
        }
        ctx.closePath();
        i = j;
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(200, 225, 255, 0.35)';
    ctx.lineWidth = 3/zoom;
    race_rail_path(track.lx, track.ly, from, to, left, top, right, bottom);
    race_rail_path(track.rx, track.ry, from, to, left, top, right, bottom, true);
    ctx.stroke();
    // kerbs on the bends, outside edge and in: red and white blocks four points long
    ctx.lineWidth = 9/zoom;
    ctx.lineCap = 'butt';
    for (let pass = 0; pass < 2; ++pass) {
        ctx.strokeStyle = pass ? '#f4f1e8' : '#e8414f';
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        for (let i = Math.max(0, from); i < to; ++i) {
            if ((Math.abs(track.ks[i]) < 0.0012) || ((Math.floor(i/4) % 2) !== pass) || !race_rail_in(track.xs[i], track.ys[i], left, top, right, bottom)) {
                continue;
            }
            ctx.moveTo(track.lx[i], track.ly[i]);
            ctx.lineTo(track.lx[i + 1], track.ly[i + 1]);
            ctx.moveTo(track.rx[i], track.ry[i]);
            ctx.lineTo(track.rx[i + 1], track.ry[i + 1]);
        }
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const r = race_rail.you;
    if (r && (race.phase === 'racing') && (r.spin <= 0)) {
        ctx.lineWidth = 6/zoom;
        ctx.lineCap = 'round';
        const here = race_rail_index(r.s);
        const ahead = Math.min(to, here + Math.ceil((Math.max(r.v, r.base)*race_rail_look)/race_rail_step));
        for (const [color, warn] of [['#ffb02e', false], ['#ff3b4e', true]]) {
            ctx.strokeStyle = color;
            ctx.globalAlpha = warn ? 0.95 : 0.8;
            ctx.beginPath();
            for (let i = here; i < ahead; ++i) {
                const red = r.v > race_rail_red(i);
                if ((red !== warn) || (!red && (r.v <= race_rail_amber(i)))) {
                    continue;
                }
                ctx.moveTo(track.lx[i], track.ly[i]);
                ctx.lineTo(track.lx[i + 1], track.ly[i + 1]);
                ctx.moveTo(track.rx[i], track.ry[i]);
                ctx.lineTo(track.rx[i + 1], track.ry[i + 1]);
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        race_rail_path_ahead(r);
    }
    ctx.restore();
}

// Your path ahead: where the ship flies in the next race_rail_ahead seconds with the turbo as you hold it now, a dot
// every tenth of a second, fading; too fast for a bend it bends out with the slide, and where it would spin off a red
// cross ends it
function race_rail_path_ahead(r)
{
    const p = race_rail_ghost;
    Object.assign(p, r);
    const at = race_rail_ghost_at;
    const k = 1/zoom;
    const steps = Math.round(race_rail_ahead*30);
    ctx.save();
    ctx.fillStyle = cyan;
    for (let i = 1; i <= steps; ++i) {
        if (race_rail_move(p, 1/30)) {
            race_rail_place(p, at);
            ctx.globalAlpha = 0.95;
            ctx.strokeStyle = '#ff3b4e';
            ctx.lineWidth = 4*k;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(at.x - 12*k, at.y - 12*k);
            ctx.lineTo(at.x + 12*k, at.y + 12*k);
            ctx.moveTo(at.x + 12*k, at.y - 12*k);
            ctx.lineTo(at.x - 12*k, at.y + 12*k);
            ctx.stroke();
            break;
        }
        if ((i % 3) !== 0) {
            continue;
        }
        race_rail_place(p, at);
        ctx.globalAlpha = 0.95*(1 - i/(steps + 10));
        ctx.beginPath();
        ctx.arc(at.x, at.y, 6*k, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.restore();
}

// The speed past which a point lights red: let go now, and a person's reaction later the ship still slows for it in
// time (race_rail_react)
function race_rail_red(i)
{
    return race_rail.profile[i] - race_rail.fall*race_rail_react;
}

// The speed past which it lights amber: red comes in about half a second
function race_rail_amber(i)
{
    return race_rail.profile[i] - race_rail.fall*(race_rail_react + 0.5);
}

// A line along the track's points from one index to another, broken where it leaves the view; adds to the path begun,
// or begins one
function race_rail_path(xs, ys, from, to, left, top, right, bottom, more = false)
{
    if (!more) {
        ctx.beginPath();
    }
    let open = false;
    for (let i = Math.max(0, from); i <= to; ++i) {
        if (!race_rail_in(xs[i], ys[i], left, top, right, bottom)) {
            open = false;
            continue;
        }
        if (open) {
            ctx.lineTo(xs[i], ys[i]);
        }
        else {
            ctx.moveTo(xs[i], ys[i]);
            open = true;
        }
    }
}

function race_rail_in(x, y, left, top, right, bottom)
{
    return (x > left) && (x < right) && (y > top) && (y < bottom);
}
