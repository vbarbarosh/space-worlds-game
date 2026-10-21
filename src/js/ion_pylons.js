// Ion Reach's arc pylons and charge fields, in the campaign and in the arcade, Free and Scroll: the world's own trick
// beside its storms. A pylon is a knot of charge hanging in the storm, drawn as light with its reach as a ring round
// it: a ship that comes inside the ring sets it charging, a gold ring closing in on it and a dashed line to the ship,
// and when the ring closes the bolt strikes whatever is still inside, the shield first, as a shot does. A ship that
// gets clear in time sees it strike the empty ring instead. Then it rests, dim, before it can charge again. A charge
// field is a violet ring that fills your pulse while you stay in it; most of them lie beside a pylon, most of the field
// inside the pylon's ring, so the pulse is had for the risk of a strike or for keeping to the field's far rim.
// Neither has a hull: ships and shots pass through them, as through a storm (docs/principles.md). Raiders are not
// struck: the trick is the pilot's. The Races mode has neither. The pulse is the energy a field gives, not the
// shield: Ion Reach's storms and its raiders' ion bolts drain the pulse, and a field that filled the shield would also
// soak the strike it is the reward for.
let pylons = [];
let charge_fields = [];
// the world that has them (Ion Reach)
const pylon_world = 3;
// A pylon's reach (m): a ship within it, its radius aside, sets it charging and is struck when the charge ends
const pylon_reach = 230;
// the charge, the tell before a strike (s): enough to see the ring close and fly out of it at cruise (285 m/s in a Wisp
// Scout, 222 in the cruiser: 245 to 315 m in the time, the ring 230 m from its middle), not to linger; then it rests
// this long before it can charge again
const pylon_charge = 1.1;
const pylon_rest = 2.4;
// What a strike takes, the shield first, before the difficulty, armour and cards (damage_player): a Wisp Scout's
// shield (15) and a little of its hull (100), an eighth of a gunship's hull and shield together; a careless pass
// costs one strike, and a ship that stays in a ring loses one every 3.5 s (about 5 a second)
const pylon_damage = 18;
// the bolt shows this long (s)
const pylon_bolt_time = 0.35;
// how many: in the campaign round the station between these radii (m), out where its storms are and beyond; in Free
// the same round the depot; on a Scroll lane one every pylon_lane_gap m of it, from pylon_lane_start m along its
// start to pylon_lane_end m before its end, clear of where you start and of the flagship's screen, either side of the
// lane's middle by pylon_lane_across m: the knot in the view (720 m across it at 100% on a 1280 × 720 window), its ring
// over a half of it, so the way past is the view's other side
const pylon_rings = {campaign: {count: 8, ring: [2600, 4400]}, free: {count: 6, ring: [1500, 2700]}};
const pylon_lane_gap = 1700;
const pylon_lane_start = 1800;
const pylon_lane_end = 1200;
const pylon_lane_across = [150, 300];
// two pylons' rings keep this far apart (m), so only one charges at you at a time
const pylon_apart = 400;
// A charge field's radius (m) and what it gives, pulse a second: from empty to ready in about 8 s (a storm's discharge
// gives 14 a second for 4 s of every 16, and costs the shield)
const charge_field_r = 170;
const charge_field_rate = 12;
// A field beside a pylon has its middle this far from the pylon's: all but a crescent 90 m wide at its far rim is
// inside the pylon's ring. Two pylons of every three have one, and one field in six pylons' worth lies alone.
const charge_field_beside = 150;
const charge_field_color = '#d98cff';
// the reach ring's colour at rest and the bolt's
const pylon_color = '#8d9cff';
const pylon_bolt_color = '#dfeaff';

// The pylons and fields for the world's map, the same every visit (their own seed): round the station, or along a
// Scroll lane either side in turn; out of the station's shelter and every range a key acts in (docs/placement.md),
// out of the storms and the pulls, off the rock fields; a spot that will not fit is left out
function pylons_generate()
{
    pylons = [];
    charge_fields = [];
    // or the world's map file's (map_files.js)
    if ((campaign.world !== pylon_world) || race_mode.active || map_file_pylons()) {
        return;
    }
    const random = visual_random_from_seed(3917);
    const lane = arcade.active && arcade_lane_kind();
    const layout = arcade.active ? pylon_rings.free : pylon_rings.campaign;
    const span = lane ? arcade_shape().scroll - pylon_lane_start - pylon_lane_end : 0;
    const count = lane ? Math.round(span/pylon_lane_gap) : layout.count;
    function spot(i, shake) {
        if (lane) {
            const side = (i % 2) ? 1 : -1;
            const along = pylon_lane_start + (i + 0.5 + (random() - 0.5)*shake)*span/count;
            const across = pylon_lane_across[0] + random()*(pylon_lane_across[1] - pylon_lane_across[0]);
            return arcade_lane_point(along, side*across, world.w, world.h);
        }
        const a = (i/count)*Math.PI*2 + 0.5 + (random() - 0.5)*shake;
        const d = layout.ring[0] + random()*(layout.ring[1] - layout.ring[0]);
        return {x: station.x + Math.cos(a)*d, y: station.y + Math.sin(a)*d};
    }
    for (let i = 0; i < count; ++i) {
        for (let tries = 0; tries < 40; ++tries) {
            const p = spot(i, 0.4 + tries*0.05);
            if (pylon_spot_ok(p, pylon_reach, null)) {
                pylons.push({x: p.x, y: p.y, phase: 'calm', t: 0, bolt: null, strikes: 0, field: null});
                break;
            }
        }
    }
    for (let i = 0; i < pylons.length; ++i) {
        if (i % 3 === 2) {
            continue;
        }
        const v = pylons[i];
        const a0 = random()*Math.PI*2;
        for (let tries = 0; tries < 12; ++tries) {
            const a = a0 + tries*0.52;
            const p = {x: v.x + Math.cos(a)*charge_field_beside, y: v.y + Math.sin(a)*charge_field_beside};
            if (pylon_spot_ok(p, charge_field_r, v)) {
                charge_fields.push({x: p.x, y: p.y, r: charge_field_r, pylon: v});
                v.field = charge_fields[charge_fields.length - 1];
                break;
            }
        }
    }
    for (let i = 0, end = Math.max(1, Math.floor(pylons.length/6)); i < end; ++i) {
        for (let tries = 0; tries < 40; ++tries) {
            const p = spot(i*3 + 1.5, 0.6 + tries*0.05);
            if (pylon_spot_ok(p, charge_field_r, null)) {
                charge_fields.push({x: p.x, y: p.y, r: charge_field_r, pylon: null});
                break;
            }
        }
    }
}

// Whether a pylon's ring or a field (room, its radius) fits at p: inside the map, out of the shelter, the gates',
// portals' and beacons' ranges by a margin, out of the combat zone, the storms and the pulls, off the rock fields'
// middles and clear of the pylons placed (a field beside one, `own`, only of the others) and the fields
function pylon_spot_ok(p, room, own)
{
    const margin = 150;
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
    if (mining_fields.some(v => distance(p, v) < v.r + 60)) {
        return false;
    }
    if (pylons.some(v => (v !== own) && (distance(p, v) < pylon_reach + room + ((room === pylon_reach) ? pylon_apart : 100)))) {
        return false;
    }
    return charge_fields.every(v => distance(p, v) > v.r + room + 100);
}

// The arcade's arrival in Ion Reach says once what its pylons and fields do
function pylons_hint()
{
    if (pylons.length) {
        show_toast('ARC PYLONS', 'THEY STRIKE A SHIP INSIDE THEIR RING · VIOLET FIELDS FILL YOUR PULSE', 4);
    }
}

// Each frame of flight (update_world_environment): a pylon with you in its ring charges and strikes, one that struck
// rests; a field you are in fills your pulse. The status line says the nearer danger first.
function pylons_update(dt)
{
    for (const v of pylons) {
        v.t += dt;
        const inside = distance(player, v) < pylon_reach + player.r;
        if (v.phase === 'calm') {
            if (inside) {
                v.phase = 'charging';
                v.t = 0;
                sfx('enemy_beam', 0.6, v);
            }
        }
        else if (v.phase === 'charging') {
            if (v.t >= pylon_charge) {
                pylon_strike(v, inside);
            }
            else if (inside) {
                physics_status = `ARC PYLON · STRIKE IN ${(pylon_charge - v.t).toFixed(1)}s · GET CLEAR`;
            }
        }
        else if (v.t >= pylon_rest) {
            v.phase = 'calm';
            v.t = 0;
            v.bolt = null;
        }
    }
    const field = charge_field_in();
    if (field) {
        player.energy = Math.min(100, player.energy + charge_field_rate*dt);
        if (!pylons.some(v => (v.phase === 'charging') && (distance(player, v) < pylon_reach + player.r))) {
            physics_status = `CHARGE FIELD · PULSE +${charge_field_rate}/s`;
        }
    }
}

// The charge ends: the bolt strikes you if you are still in the ring, else a point of its rim on your side
function pylon_strike(v, inside)
{
    const a = Math.atan2(player.y - v.y, player.x - v.x);
    v.phase = 'spent';
    v.t = 0;
    v.strikes++;
    v.bolt = inside ? {x: player.x, y: player.y, hit: true} : {x: v.x + Math.cos(a)*pylon_reach, y: v.y + Math.sin(a)*pylon_reach, hit: false};
    sfx('storm', inside ? 1 : 0.6, v);
    ring(v.bolt.x, v.bolt.y, pylon_bolt_color, inside ? 70 : 40, 0.35);
    if (inside) {
        damage_player(pylon_damage, false, 'lightning');
        label(player.x, player.y - 25, 'ARC STRIKE', pylon_bolt_color);
    }
}

// The field you are in, or null
function charge_field_in()
{
    for (const v of charge_fields) {
        if (distance(player, v) < v.r) {
            return v;
        }
    }
    return null;
}

// The fields under the pylons, and the pylons: each field's violet ring with its rings flowing in, and a line of charge
// to your ship while you are in it; each pylon's reach ring (dashed at rest, a gold ring closing in while it charges),
// its knot of light and the bolt
function render_pylons()
{
    const random = pylon_flicker(Math.floor(clock*24));
    for (const v of charge_fields) {
        if (!in_view(v, v.r + 30)) {
            continue;
        }
        const here = distance(player, v) < v.r;
        ctx.fillStyle = `${charge_field_color}${here ? '1c' : '10'}`;
        ctx.strokeStyle = `${charge_field_color}${here ? 'cc' : '77'}`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(v.x, v.y, v.r, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; ++i) {
            const f = 1 - ((clock*(here ? 0.7 : 0.35) + i/3) % 1);
            ctx.globalAlpha = (1 - f)*0.7;
            ctx.beginPath();
            ctx.arc(v.x, v.y, v.r*f, 0, Math.PI*2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (here) {
            pylon_bolt_path(v.x, v.y, player.x, player.y, random, 10);
            ctx.strokeStyle = charge_field_color;
            ctx.globalAlpha = 0.25;
            ctx.lineWidth = 5;
            ctx.stroke();
            ctx.globalAlpha = 0.8;
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        ctx.fillStyle = charge_field_color;
        ctx.font = 'bold 10px ui-monospace,monospace';
        ctx.textAlign = 'center';
        const at = pylon_label_at(v, v.pylon, v.r);
        ctx.fillText(`CHARGE FIELD / PULSE +${charge_field_rate}/s`, at.x, at.y);
    }
    for (const v of pylons) {
        if (!in_view(v, pylon_reach + 40)) {
            continue;
        }
        const charging = v.phase === 'charging';
        const spent = v.phase === 'spent';
        const f = charging ? Math.min(1, v.t/pylon_charge) : 0;
        // the reach: dashed at rest, dim once spent, lit gold while it charges, a second gold ring closing in on the
        // knot as the charge runs out
        ctx.lineWidth = charging ? 2 : 1;
        ctx.setLineDash(spent ? [] : [8, 12]);
        ctx.strokeStyle = charging ? boss_tell_color : `${pylon_color}${spent ? '22' : '55'}`;
        ctx.fillStyle = charging ? `${boss_tell_color}${(f < 0.5) ? '0c' : '16'}` : `${pylon_color}06`;
        ctx.globalAlpha = charging ? 0.5 + f*0.5 : 1;
        ctx.beginPath();
        ctx.arc(v.x, v.y, pylon_reach, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        if (charging) {
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(v.x, v.y, Math.max(20, pylon_reach*(1 - f)), 0, Math.PI*2);
            ctx.stroke();
            if (distance(player, v) < pylon_reach + player.r) {
                boss_dash(v.x, v.y, player.x, player.y, boss_tell_color, 0.35 + f*0.5, 2/zoom);
            }
        }
        ctx.globalAlpha = 1;
        // the knot: a glow, its sprite turning, and while it charges arcs crackling out from it, longer as it fills
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = pylon_color;
        ctx.globalAlpha = spent ? 0.08 : 0.16 + f*0.3 + Math.sin(clock*3 + v.x)*0.04;
        ctx.beginPath();
        ctx.arc(v.x, v.y, 46 + f*20, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;
        const art = world_art('pylon');
        if (!art || !sprite_draw_box(art, null, 78, v.x, v.y, 0, spent ? 0.45 : 1, clock*(0.6 + f*4))) {
            polygon(v.x, v.y, 18, 3, clock*0.6, pylon_bolt_color, '#1c2347');
        }
        if (charging || (v.phase === 'calm')) {
            const arcs = charging ? 2 + Math.floor(f*4) : ((random() < 0.15) ? 1 : 0);
            for (let i = 0; i < arcs; ++i) {
                const a = random()*Math.PI*2;
                const reach = 40 + random()*(charging ? 30 + f*110 : 30);
                pylon_bolt_path(v.x, v.y, v.x + Math.cos(a)*reach, v.y + Math.sin(a)*reach, random, 7);
                ctx.strokeStyle = pylon_bolt_color;
                ctx.globalAlpha = charging ? 0.5 + f*0.4 : 0.35;
                ctx.lineWidth = 1.2;
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
        // the bolt: a wide glow and a white core, flickering out
        if (spent && v.bolt && (v.t < pylon_bolt_time)) {
            const k = (1 - v.t/pylon_bolt_time)*((random() < 0.3) ? 0.5 : 1);
            const bolt = pylon_flicker(v.strikes*7919 + Math.floor(v.t*30));
            pylon_bolt_path(v.x, v.y, v.bolt.x, v.bolt.y, bolt, 26);
            ctx.strokeStyle = pylon_color;
            ctx.globalAlpha = k*0.6;
            ctx.lineWidth = 14;
            ctx.stroke();
            ctx.strokeStyle = pylon_bolt_color;
            ctx.globalAlpha = k;
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = charging ? boss_tell_color : pylon_color;
        ctx.font = 'bold 10px ui-monospace,monospace';
        ctx.textAlign = 'center';
        const at = pylon_label_at(v, v.field, pylon_reach);
        ctx.fillText(`ARC PYLON / ${charging ? `STRIKE ${(pylon_charge - v.t).toFixed(1)}s` : spent ? `SPENT ${Math.ceil(pylon_rest - v.t)}s` : 'CALM'}`, at.x, at.y);
    }
}

// Where the name of a pylon or a field (v, its ring r) stands: past its ring on the side away from its pair (the
// pylon's field, the field's pylon), so the two names never sit on the other's rings; above it with no pair, as a
// storm's
function pylon_label_at(v, pair, r)
{
    if (!pair) {
        return {x: v.x, y: v.y - r - 18};
    }
    const a = Math.atan2(v.y - pair.y, v.x - pair.x);
    return {x: v.x + Math.cos(a)*(r + 18), y: v.y + Math.sin(a)*(r + 18) + 4};
}

// The jagged way of a bolt from (x0, y0) to (x1, y1) as the canvas's path, each bend up to `jag` m off the line, a fork
// off the middle; random is a pylon_flicker
function pylon_bolt_path(x0, y0, x1, y1, random, jag)
{
    const dx = x1 - x0;
    const dy = y1 - y0;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy/length;
    const ny = dx/length;
    const steps = Math.max(3, Math.min(9, Math.round(length/30)));
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    let fork = null;
    for (let i = 1; i < steps; ++i) {
        const off = (random() - 0.5)*2*jag;
        const x = x0 + dx*(i/steps) + nx*off;
        const y = y0 + dy*(i/steps) + ny*off;
        ctx.lineTo(x, y);
        if (i === Math.floor(steps/2)) {
            fork = {x, y};
        }
    }
    ctx.lineTo(x1, y1);
    if (fork) {
        const side = (random() < 0.5) ? -1 : 1;
        ctx.moveTo(fork.x, fork.y);
        ctx.lineTo(fork.x + dx*0.15 + nx*side*jag*1.6, fork.y + dy*0.15 + ny*side*jag*1.6);
        ctx.lineTo(fork.x + dx*0.25 + nx*side*jag*2.6, fork.y + dy*0.25 + ny*side*jag*2.6);
    }
}

// The flicker's own dice, from a seed (a frame's, a strike's): a drawing never draws from Math.random, so the effects
// leave the game's decisions as they were (docs/principles.md)
function pylon_flicker(seed)
{
    return visual_random_from_seed(seed >>> 0);
}

// The map's marks: each pylon with its reach, each field with its own, small and unnamed (the legend names them): a
// campaign map of the whole world showed fifteen names piled round the station
function pylons_marks(add)
{
    for (const v of pylons) {
        add('danger', v, 'pylon', null, '', {reach: pylon_reach, ring: pylon_color, small: true});
    }
    for (const v of charge_fields) {
        add('danger', v, 'charge-field', null, '', {reach: v.r, ring: charge_field_color, small: true});
    }
}
