// Obsidian's magnetic spires, in the campaign and in the arcade, Free and Scroll: the world's own trick beside its heavy
// gravity. A spire is a needle of dark glass standing in space, with its field drawn round it as a ring and lines of
// force running in. Inside the ring it draws every ship toward it, gently (yours, unless you hold B, and the raiders'),
// and bends every shot that passes toward itself, yours and the raiders' alike: a shot that passes close curves into
// it and stops there, one farther off is turned aside. So a spire covers whoever keeps it between them and the guns,
// and a raider behind one is covered from yours. A shot fired along a line shown first (a flagship's, a marksman's
// dashed aim) keeps to its line, as round Eclipse's hole, so a tell never lies; it still stops on the spire.
// It is solid (docs/principles.md): ships crash into it as into a rock, raiders steer round it, every shot stops on it,
// drifting debris glances off it.
// Nothing breaks it: it is the world's rock, as your shots on the campaign's rocks do it no harm, so it has no bar.
// The Races mode has none.
let spires = [];
// the world that has them (Obsidian)
const spire_world = 4;
// The spire's body (m): what ships crash into and shots stop on
const spire_r = 40;
// Its field's reach (m from its middle): inside it ships are drawn in and shots bent. A local cover, not a black hole's
// (Eclipse's pulls 2.3 km out)
const spire_reach = 280;
// How hard it draws a ship in (m/s): this at the body's rim, nothing at the reach; the player's ship as the planet's
// pull does, over its traction, and held by the brake. A Wisp Scout cruises at 228 m/s here.
const spire_pull = 30;
// How hard it bends a shot's way: the way's curvature, in radians a metre, is this times the share of the way across
// the line to the spire, times (1 - d/reach)². The same curve at any speed, so a slug bends as a bolt does. Measured
// (a shot flying past, its line this far from the middle): within 70 m it curves into the body, at 100 to 130 m it is
// whipped round 85 to 100°, at 160 m turned 47°, at 200 m 14°, at 250 m 1°.
const spire_bend = 0.012;
// the most a shot's way turns in a frame
const spire_turn_most = 0.5;
// A crash into one, as into a rock (resolve_solid_ore): above this speed (m/s) it costs hull, up to spire_crash_most
const spire_crash_speed = 110;
const spire_crash_most = 24;
// how many: in the campaign round the station between these radii (m); in Free the same round the depot; on a Scroll
// lane one every spire_lane_gap m of it, from spire_lane_start m along its start to spire_lane_end m before its end,
// either side of the lane's middle by spire_lane_across m, so it stands in the view (720 m across it at 100% on a
// 1280 × 720 window) and the way past it is the view's other side
const spire_rings = {campaign: {count: 7, ring: [2400, 4400]}, free: {count: 6, ring: [1400, 3000]}};
const spire_lane_gap = 1600;
const spire_lane_start = 1600;
const spire_lane_end = 1200;
const spire_lane_across = [120, 260];
// two spires' fields keep this far apart (m): one cover, one pull at a time
const spire_apart = 300;
// the world's accent: the field, the lines of force, the glow of a shot drawn in
const spire_color = '#ed97cf';

// The spires for the world's map, the same every visit (their own seed): round the station, or along a Scroll lane
// either side in turn; out of the station's shelter and every range a key acts in (docs/placement.md), out of the
// storms and the pulls, off the rock fields; a spot that will not fit is left out
function spires_generate()
{
    spires = [];
    // or the world's map file's (map_files.js)
    if ((campaign.world !== spire_world) || race_mode.active || map_file_spires()) {
        return;
    }
    const random = visual_random_from_seed(4421);
    const lane = arcade.active && arcade_lane_kind();
    const layout = arcade.active ? spire_rings.free : spire_rings.campaign;
    const span = lane ? arcade_shape().scroll - spire_lane_start - spire_lane_end : 0;
    const count = lane ? Math.round(span/spire_lane_gap) : layout.count;
    function spot(i, shake) {
        if (lane) {
            const side = (i % 2) ? 1 : -1;
            const along = spire_lane_start + (i + 0.5 + (random() - 0.5)*shake)*span/count;
            const across = spire_lane_across[0] + random()*(spire_lane_across[1] - spire_lane_across[0]);
            return arcade_lane_point(along, side*across, world.w, world.h);
        }
        const a = (i/count)*Math.PI*2 + 0.9 + (random() - 0.5)*shake;
        const d = layout.ring[0] + random()*(layout.ring[1] - layout.ring[0]);
        return {x: station.x + Math.cos(a)*d, y: station.y + Math.sin(a)*d};
    }
    for (let i = 0; i < count; ++i) {
        for (let tries = 0; tries < 40; ++tries) {
            const p = spot(i, 0.4 + tries*0.05);
            if (spire_spot_ok(p)) {
                spires.push({x: p.x, y: p.y, r: spire_r, angle: random()*Math.PI*2, flash: 0, drawn: 0});
                break;
            }
        }
    }
}

// Whether a spire's field fits at p: inside the map, out of the shelter, the gates', portals' and beacons' ranges by a
// margin, out of the combat zone, the storms and the pulls, its body a ship's width and more off the rock fields, and
// clear of the spires placed
function spire_spot_ok(p)
{
    const margin = 150;
    const room = spire_reach;
    if (Math.min(p.x, p.y, world.w - p.x, world.h - p.y) < room + 200) {
        return false;
    }
    if (distance(p, station) < station_shelter + room + margin) {
        return false;
    }
    if (world_gates.some(v => distance(p, v) < gate_reach + room + margin)) {
        return false;
    }
    if (portals.some(v => distance(p, v) < v.r + 25 + room + margin)) {
        return false;
    }
    if (beacons.some(v => distance(p, v) < 120 + room + margin)) {
        return false;
    }
    if (!arcade.active && (distance(p, combat_zone) < 600 + room)) {
        return false;
    }
    if (black_holes.some(v => distance(p, v) < gravity_reach(v) + room + 100)) {
        return false;
    }
    if (world_zones.some(v => distance(p, v) < v.r + room + 100)) {
        return false;
    }
    if (mining_fields.some(v => distance(p, v) < v.r + spire_r + 150)) {
        return false;
    }
    return spires.every(v => distance(p, v) > room*2 + spire_apart);
}

// The arcade's arrival in Obsidian says once what its spires do
function spires_hint()
{
    if (spires.length) {
        show_toast('MAGNETIC SPIRES', 'THEY PULL SHIPS AND DRAW SHOTS IN · KEEP ONE BETWEEN YOU AND THE GUNS', 4);
    }
}

// How hard a spire draws a ship d m from its middle in (m/s): spire_pull at its body's rim, nothing at its reach
function spire_pull_at(d)
{
    return spire_pull*clamp(1 - (d - spire_r)/(spire_reach - spire_r), 0, 1);
}

// The ship's drift this frame (fly_in_world, as the planet's pull): each spire within reach adds its pull, over the
// ship's traction
function spire_drift(drift, traction)
{
    for (const v of spires) {
        const dx = v.x - player.x;
        const dy = v.y - player.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if ((d < spire_reach) && (d > 1)) {
            const pull = spire_pull_at(d)/traction;
            drift.x += (dx/d)*pull;
            drift.y += (dy/d)*pull;
        }
    }
}

// Each frame of flight (update_world_environment): the raiders in a field are drawn in (a flagship and an anchored
// raider hold their place), the shots in one are bent, and the status line says the spire you are in
function spires_update(dt)
{
    if (!spires.length) {
        return;
    }
    for (const v of spires) {
        v.flash = Math.max(0, v.flash - dt);
        const d = distance(player, v);
        if (d < spire_reach) {
            physics_status = `MAGNETIC SPIRE · PULL ${Math.round(spire_pull_at(d))} m/s · SHOTS BEND TO IT`;
        }
    }
    for (let i = 0, end = enemies.length; i < end; ++i) {
        const e = enemies[i];
        if ((e.hp <= 0) || (e.type === 'boss') || e.anchor) {
            continue;
        }
        for (const v of spires) {
            const dx = v.x - e.x;
            const dy = v.y - e.y;
            if ((Math.abs(dx) > spire_reach) || (Math.abs(dy) > spire_reach)) {
                continue;
            }
            const d = Math.sqrt(dx*dx + dy*dy);
            if ((d < spire_reach) && (d > 1)) {
                const step = spire_pull_at(d)*dt*stasis_scale(e);
                e.x += (dx/d)*step;
                e.y += (dy/d)*step;
            }
        }
    }
    for (let i = 0, end = bullets.length; i < end; ++i) {
        spire_shot_bend(bullets[i], dt);
    }
    // a raider's shot under stasis flies slower, and bends over the way it flies
    for (let i = 0, end = hostile.length; i < end; ++i) {
        spire_shot_bend(hostile[i], dt*stasis_scale(hostile[i]));
    }
}

// A shot's way bends toward each spire it is in the field of by the share of its way across the line to it; a missile
// steers itself, and a shot fired along a line shown before it flew keeps to that line
function spire_shot_bend(b, dt)
{
    if ((b.life <= 0) || b.missile || (b.raider && ((b.raider.type === 'boss') || b.raider.marksman))) {
        return;
    }
    const vx = b.vx;
    const vy = b.vy;
    const speed = Math.sqrt(vx*vx + vy*vy);
    if (speed < 1) {
        return;
    }
    let turn = 0;
    for (const v of spires) {
        const dx = v.x - b.x;
        const dy = v.y - b.y;
        if ((Math.abs(dx) > spire_reach) || (Math.abs(dy) > spire_reach)) {
            continue;
        }
        const d = Math.sqrt(dx*dx + dy*dy);
        if ((d >= spire_reach) || (d < 0.1)) {
            continue;
        }
        const across = (vx*dy - vy*dx)/(speed*d);
        const k = 1 - d/spire_reach;
        turn += across*spire_bend*k*k*speed*dt;
        v.drawn = clock;
    }
    if (turn === 0) {
        return;
    }
    turn = clamp(turn, -spire_turn_most, spire_turn_most);
    const c = Math.cos(turn);
    const s = Math.sin(turn);
    b.vx = vx*c - vy*s;
    b.vy = vx*s + vy*c;
}

// A shot's step from `from` to where it is now met a spire: it stops where it touched, with a spark of the field's
// colour, and the spire glows a moment. True when it did; a missile it stopped is the caller's to set off.
function spire_stops_shot(b, from)
{
    for (const v of spires) {
        const reach = v.r + (b.r || 3);
        if ((Math.max(from.x, b.x) < v.x - reach) || (Math.min(from.x, b.x) > v.x + reach) ||
            (Math.max(from.y, b.y) < v.y - reach) || (Math.min(from.y, b.y) > v.y + reach)) {
            continue;
        }
        if (segment_distance(v, from, b) < reach) {
            const t = segment_contact(v, from, b, reach) ?? 0;
            b.x = from.x + (b.x - from.x)*t;
            b.y = from.y + (b.y - from.y)*t;
            b.life = 0;
            v.flash = 0.2;
            burst(b.x, b.y, spire_color, 4, 80);
            return true;
        }
    }
    return false;
}

// Your ship against the spires, along the way it flew this frame, as against a rock (resolve_solid_ore): stopped where
// it touched, pushed off, and above a rock's crash speed hurt as by one (the cause `rock`, a crash: past the shield)
function spire_resolve()
{
    const from = player.previous_position;
    const swept = !!from && (distance(from, player) < sweep_most);
    for (const v of spires) {
        const min = player.r + v.r;
        const t = swept ? segment_contact(v, from, player, min) : null;
        if (t !== null) {
            player.x = from.x + (player.x - from.x)*t;
            player.y = from.y + (player.y - from.y)*t;
        }
        const dx = player.x - v.x;
        const dy = player.y - v.y;
        const d = Math.hypot(dx, dy);
        if ((t === null) && (d >= min)) {
            continue;
        }
        const nx = d ? dx/d : 1;
        const ny = d ? dy/d : 0;
        const speed = Math.hypot(player.vx, player.vy);
        const impact = player.vx*nx + player.vy*ny;
        player.x = v.x + nx*(min + 2);
        player.y = v.y + ny*(min + 2);
        if (impact < 0) {
            player.vx -= nx*impact*1.3;
            player.vy -= ny*impact*1.3;
        }
        if (speed > spire_crash_speed) {
            damage_player(Math.min(spire_crash_most, (speed - 80)*0.055), false, 'rock');
            label(player.x, player.y - 25, 'SPIRE IMPACT', spire_color);
        }
    }
}

// A drifting piece of debris that touched a spire: out of it, its way along the spire's face kept and the part into
// it turned back
function spire_deflect(piece)
{
    for (const v of spires) {
        const dx = piece.x - v.x;
        const dy = piece.y - v.y;
        const min = v.r + piece.r + 4;
        if ((Math.abs(dx) >= min) || (Math.abs(dy) >= min)) {
            continue;
        }
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d >= min) {
            continue;
        }
        const nx = d ? dx/d : 1;
        const ny = d ? dy/d : 0;
        piece.x = v.x + nx*min;
        piece.y = v.y + ny*min;
        const into = piece.vx*nx + piece.vy*ny;
        if (into < 0) {
            piece.vx -= 2*nx*into;
            piece.vy -= 2*ny*into;
        }
    }
}

// Each spire in view: its field (a faint disc, the rim dashed, lines of force with their dashes running in, brighter
// while you are in it or a shot is being drawn in), its shadow, its body and its name
function render_spires()
{
    for (const v of spires) {
        if (!in_view(v, spire_reach + 40)) {
            continue;
        }
        const here = distance(player, v) < spire_reach;
        const busy = clock - v.drawn < 0.15;
        ctx.fillStyle = `${spire_color}${here ? '12' : '08'}`;
        ctx.strokeStyle = `${spire_color}${here ? '88' : '4a'}`;
        ctx.lineWidth = here ? 1.6 : 1.2;
        ctx.setLineDash([6, 10]);
        ctx.beginPath();
        ctx.arc(v.x, v.y, spire_reach, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        // the lines of force: drawn from the body out, the dash offset growing, so the dashes run in to the spire
        ctx.setLineDash([12, 16]);
        ctx.lineDashOffset = clock*42;
        ctx.strokeStyle = spire_color;
        ctx.globalAlpha = (here || busy) ? 0.42 : 0.24;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let i = 0; i < 10; ++i) {
            const a = v.angle + i*Math.PI/5;
            const r0 = v.r + 14;
            const r1 = spire_reach - 6;
            ctx.moveTo(v.x + Math.cos(a)*r0, v.y + Math.sin(a)*r0);
            const bend = (r0 + r1)*0.5;
            ctx.quadraticCurveTo(v.x + Math.cos(a + 0.22)*bend, v.y + Math.sin(a + 0.22)*bend, v.x + Math.cos(a + 0.55)*r1, v.y + Math.sin(a + 0.55)*r1);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
        ctx.globalAlpha = 1;
        // solid: a cast shadow under it, as a cliff's, and a body with a dark outline
        ctx.fillStyle = '#05040888';
        ctx.beginPath();
        ctx.ellipse(v.x + v.r*0.3, v.y + v.r*0.45, v.r*1.12, v.r*0.95, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = spire_color;
        ctx.globalAlpha = Math.min(0.24, 0.08 + v.flash + (busy ? 0.04 : 0) + Math.sin(clock*2 + v.x)*0.03);
        ctx.beginPath();
        ctx.arc(v.x, v.y, v.r*1.3, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        const art = world_art('spire');
        if (!art || !sprite_draw_still(art, null, v.r*2.7, v.x, v.y, v.angle)) {
            polygon(v.x, v.y, v.r, 6, v.angle, spire_color, '#17131d');
        }
        if (v.flash > 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = spire_color;
            ctx.globalAlpha = Math.min(0.5, v.flash*2.5);
            ctx.beginPath();
            ctx.arc(v.x, v.y, v.r*0.7, 0, Math.PI*2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.fillStyle = spire_color;
        ctx.font = 'bold 10px ui-monospace,monospace';
        ctx.textAlign = 'center';
        // under the spire, not past its field's rim as a storm's name: a field this small puts that under the HUD's top
        ctx.fillText('MAGNETIC SPIRE / PULLS · BENDS SHOTS', v.x, v.y + v.r*1.6 + 16);
    }
}

// The map's marks: each spire with its field, small and unnamed (the legend names it)
function spires_marks(add)
{
    for (const v of spires) {
        add('danger', v, 'spire', null, '', {reach: spire_reach, ring: spire_color, small: true});
    }
}
