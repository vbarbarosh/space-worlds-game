// Evasive thrusters (the module evasive, 0-3): ahead along the ship's course, the nearest solid thing in its path (an
// asteroid, debris, a raider, the convoy's freighter) pushes the steering sideways, away from it, harder the closer it
// is. They only steer: thrust and speed stay the pilot's.
const evasion_reach = [0, 250, 400, 550];
const evasion_push = [0, 0.7, 1.1, 1.7];

// The steering (dx, dy) with the thrusters' push added; the pilot's own when there is nothing in the way. The course
// is where the pilot steers (or, coasting, where the ship goes); every solid thing in the corridor ahead pushes
// sideways away from it, the nearer and the more squarely in the path, the harder.
function evasion_steer(dx, dy)
{
    const level = upgrades.evasive || 0;
    const steering = Math.hypot(dx, dy);
    const speed = Math.hypot(player.vx, player.vy);
    if (!level || docking || ((steering < 0.1) && (speed < 40))) {
        return {x: dx, y: dy};
    }
    const ux = (steering >= 0.1) ? dx/steering : player.vx/speed;
    const uy = (steering >= 0.1) ? dy/steering : player.vy/speed;
    const reach = evasion_reach[level]*Math.max(1, speed/220);
    let push = 0;
    for (const v of evasion_obstacles()) {
        const px = v.x - player.x;
        const py = v.y - player.y;
        const along = px*ux + py*uy;
        // side: the obstacle's offset across the course, along n = (uy, -ux)
        const side = px*uy - py*ux;
        const clearance = v.r + player.r + 40;
        if ((along > -v.r) && (along < reach) && (Math.abs(side) < clearance)) {
            const near = 1 - Math.max(0, along)/reach;
            const square = 1 - (Math.abs(side)/clearance)*0.6;
            push -= ((side >= 0) ? 1 : -1)*near*square;
        }
    }
    if (!push) {
        return {x: dx, y: dy};
    }
    const k = clamp(push, -1.5, 1.5)*evasion_push[level];
    player.evading = 0.25;
    const base = Math.max(steering, 0.6);
    return {x: ux*base + uy*k, y: uy*base - ux*k};
}

function evasion_obstacles()
{
    const out = [];
    for (const v of ore_nodes) {
        if (v.hp > 0) {
            out.push(v);
        }
    }
    out.push(...drifting_debris);
    for (const v of enemies) {
        if (v.hp > 0) {
            out.push(v);
        }
    }
    if (escort) {
        out.push({x: escort.x, y: escort.y, r: sprite_sizes.freighter*0.2});
    }
    return out;
}
