// One rule for what is solid: what a shot can hit, a ship can crash into, and raiders follow it too. Solid are the
// asteroids, built structures, the convoy's freighter and every hull; no two of them overlap. Raiders steer round the
// asteroids and structures ahead of them, and are pushed out of anything they still touch.
let bodies_static = [];
// the ore nodes the frame began with: bodies_static starts with every one of them still alive
let bodies_static_ore = {list: [], count: 0};
// the settling passes run on these numbers, not on raiders of many shapes, which kept V8 reoptimizing them
const bodies_numbers = {
    x: new Float64Array(64),
    y: new Float64Array(64),
    r: new Float64Array(64),
    sx: new Float64Array(256),
    sy: new Float64Array(256),
    sr: new Float64Array(256),
    count: 0,
    statics: 0,
    player: false,
    px: 0,
    py: 0,
    pr: 0,
};

// Once a frame: the solid things that do not fly (asteroids, structures, the freighter as three circles along its hull)
function bodies_frame()
{
    const out = [];
    for (const v of ore_nodes) {
        if (v.hp > 0) {
            out.push(v);
        }
    }
    bodies_static_ore = {list: ore_nodes, count: out.length};
    if (!arcade.active) {
        for (const v of structures_here()) {
            if (v.hp > 0) {
                out.push({x: v.x, y: v.y, r: structure_kinds[v.kind].size*0.42});
            }
        }
    }
    if (escort) {
        const a = Math.atan2((escort.destination?.y ?? escort.y) - escort.y, (escort.destination?.x ?? escort.x + 1) - escort.x);
        const step = sprite_sizes.freighter*0.3;
        for (const k of [-1, 0, 1]) {
            out.push({x: escort.x + Math.cos(a)*step*k, y: escort.y + Math.sin(a)*step*k, r: sprite_sizes.freighter*0.17});
        }
    }
    bodies_static = out;
}

// A raider's heading bent away from the asteroids and structures ahead of it
function raider_avoid(v, heading)
{
    const ux = Math.cos(heading);
    const uy = Math.sin(heading);
    const reach = 140 + v.r*2;
    const {sx, sy, sr} = bodies_numbers;
    const x = v.x;
    const y = v.y;
    const r = v.r;
    let push = 0;
    for (let k = 0, end = bodies_numbers.statics; k < end; ++k) {
        const px = sx[k] - x;
        const py = sy[k] - y;
        const clearance = sr[k] + r + 12;
        // farther than reach and clearance together, it is neither ahead nor beside
        if ((px*px + py*py) > (reach + clearance)*(reach + clearance)) {
            continue;
        }
        const along = px*ux + py*uy;
        const side = px*uy - py*ux;
        if ((along > 0) && (along < reach) && (Math.abs(side) < clearance)) {
            push += ((side >= 0) ? 1 : -1)*(1 - along/reach);
        }
    }
    return heading + clamp(push, -1, 1)*1.1;
}

// After everything has moved: raiders out of solid things, the player and each other; the player out of structures
// and the freighter (asteroids push the player in resolve_solid_ore, with the impact's damage)
function bodies_resolve()
{
    const alive = enemies.filter(v => v.hp > 0);
    const n = bodies_numbers_load(alive);
    // a crowd settles over a few passes: pushing one pair apart can press another together
    for (let pass = 0; pass < 4; ++pass) {
        bodies_settle(n);
    }
    for (let i = 0; i < alive.length; ++i) {
        alive[i].x = n.x[i];
        alive[i].y = n.y[i];
    }
    if (!player || docking) {
        return;
    }
    // the ore nodes are only ever dropped by giving ore_nodes a new array
    const ore = (ore_nodes === bodies_static_ore.list) ? bodies_static_ore.count : 0;
    for (let i = ore, end = bodies_static.length; i < end; ++i) {
        if (!ore_nodes.includes(bodies_static[i])) {
            bodies_push_out(player, bodies_static[i], true);
        }
    }
}

// The solid things' x, y and r as numbers, the arrays grown to fit
function bodies_statics_load()
{
    const n = bodies_numbers;
    if (n.sx.length < bodies_static.length) {
        n.sx = new Float64Array(bodies_static.length*2);
        n.sy = new Float64Array(bodies_static.length*2);
        n.sr = new Float64Array(bodies_static.length*2);
    }
    for (let i = 0; i < bodies_static.length; ++i) {
        n.sx[i] = bodies_static[i].x;
        n.sy[i] = bodies_static[i].y;
        n.sr[i] = bodies_static[i].r;
    }
    n.statics = bodies_static.length;
}

// The raiders' x, y and r as numbers, and the solid things' and the player's again
function bodies_numbers_load(alive)
{
    const n = bodies_numbers;
    if (n.x.length < alive.length) {
        n.x = new Float64Array(alive.length*2);
        n.y = new Float64Array(alive.length*2);
        n.r = new Float64Array(alive.length*2);
    }
    for (let i = 0; i < alive.length; ++i) {
        n.x[i] = alive[i].x;
        n.y[i] = alive[i].y;
        n.r[i] = alive[i].r;
    }
    bodies_statics_load();
    n.count = alive.length;
    n.player = !!player && !docking;
    n.px = player ? player.x : 0;
    n.py = player ? player.y : 0;
    n.pr = player ? player.r : 0;
    return n;
}

// One pass: each raider out of the solid things and the player (bodies_push_out on numbers), then out of each other
function bodies_settle(n)
{
    const {x, y, r, sx, sy, sr} = n;
    for (let i = 0; i < n.count; ++i) {
        for (let k = 0; k < n.statics; ++k) {
            bodies_push_point(n, i, sx[k], sy[k], sr[k]);
        }
        if (n.player) {
            bodies_push_point(n, i, n.px, n.py, n.pr);
        }
    }
    for (let i = 0, end = n.count; i < end; ++i) {
        for (let j = i + 1; j < end; ++j) {
            const min = r[i] + r[j];
            // apart along either axis, they cannot touch
            if ((Math.abs(x[i] - x[j]) >= min) || (Math.abs(y[i] - y[j]) >= min)) {
                continue;
            }
            const dx = x[i] - x[j];
            const dy = y[i] - y[j];
            const d = Math.sqrt(dx*dx + dy*dy);
            if ((d > 0) && (d < min)) {
                // the lighter hull gives way more
                const ma = r[i]*r[i];
                const mb = r[j]*r[j];
                const nx = (x[i] - x[j])/d;
                const ny = (y[i] - y[j])/d;
                const overlap = min - d;
                x[i] += nx*overlap*(mb/(ma + mb));
                y[i] += ny*overlap*(mb/(ma + mb));
                x[j] -= nx*overlap*(ma/(ma + mb));
                y[j] -= ny*overlap*(ma/(ma + mb));
            }
        }
    }
}

// Raider i moved out of the circle at sx, sy of radius sr, as bodies_push_out does without a bounce
function bodies_push_point(n, i, sx, sy, sr)
{
    const dx = n.x[i] - sx;
    const dy = n.y[i] - sy;
    const min = n.r[i] + sr;
    if ((Math.abs(dx) >= min) || (Math.abs(dy) >= min)) {
        return;
    }
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d >= min) {
        return;
    }
    n.x[i] = sx + (d ? dx/d : 1)*min;
    n.y[i] = sy + (d ? dy/d : 0)*min;
}

// v moved out of s along the line between them; a ship (bounce) loses its speed into s
function bodies_push_out(v, s, bounce = false)
{
    const dx = v.x - s.x;
    const dy = v.y - s.y;
    const min = v.r + s.r;
    // apart along either axis, they cannot touch
    if ((Math.abs(dx) >= min) || (Math.abs(dy) >= min)) {
        return;
    }
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d >= min) {
        return;
    }
    const nx = d ? dx/d : 1;
    const ny = d ? dy/d : 0;
    v.x = s.x + nx*min;
    v.y = s.y + ny*min;
    if (bounce) {
        const into = v.vx*nx + v.vy*ny;
        if (into < 0) {
            v.vx -= nx*into*1.3;
            v.vy -= ny*into*1.3;
        }
    }
}
