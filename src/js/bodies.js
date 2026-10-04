// One rule for what is solid: what a shot can hit, a ship can crash into, and raiders follow it too. Solid are the
// asteroids, built structures, the convoy's freighter and every hull; no two of them overlap. Raiders steer round the
// asteroids and structures ahead of them, and are pushed out of anything they still touch.
let bodies_static = [];

// Once a frame: the solid things that do not fly (asteroids, structures, the freighter as three circles along its hull)
function bodies_frame()
{
    const out = [];
    for (const v of ore_nodes) {
        if (v.hp > 0) {
            out.push(v);
        }
    }
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
    let push = 0;
    for (const s of bodies_static) {
        const px = s.x - v.x;
        const py = s.y - v.y;
        const along = px*ux + py*uy;
        const side = px*uy - py*ux;
        const clearance = s.r + v.r + 12;
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
    // a crowd settles over a few passes: pushing one pair apart can press another together
    for (let pass = 0; pass < 4; ++pass) {
        bodies_settle(alive);
    }
    if (!player || docking) {
        return;
    }
    for (const s of bodies_static) {
        if (!ore_nodes.includes(s)) {
            bodies_push_out(player, s, true);
        }
    }
}

function bodies_settle(alive)
{
    for (const v of alive) {
        for (const s of bodies_static) {
            bodies_push_out(v, s);
        }
        if (player && !docking) {
            bodies_push_out(v, player);
        }
    }
    for (let i = 0, end = alive.length; i < end; ++i) {
        for (let j = i + 1; j < end; ++j) {
            const a = alive[i];
            const b = alive[j];
            const d = distance(a, b);
            const min = a.r + b.r;
            if ((d > 0) && (d < min)) {
                // the lighter hull gives way more
                const ma = a.r*a.r;
                const mb = b.r*b.r;
                const nx = (a.x - b.x)/d;
                const ny = (a.y - b.y)/d;
                const overlap = min - d;
                a.x += nx*overlap*(mb/(ma + mb));
                a.y += ny*overlap*(mb/(ma + mb));
                b.x -= nx*overlap*(ma/(ma + mb));
                b.y -= ny*overlap*(ma/(ma + mb));
            }
        }
    }
}

// v moved out of s along the line between them; a ship (bounce) loses its speed into s
function bodies_push_out(v, s, bounce = false)
{
    const dx = v.x - s.x;
    const dy = v.y - s.y;
    const d = Math.hypot(dx, dy);
    const min = v.r + s.r;
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
