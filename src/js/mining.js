function recenter_mining_fields()
{
    const groups = new Map();
    for (const ore_node of ore_nodes) {
        if (ore_node.hp <= 0) {
            continue;
        }
        if (!groups.has(ore_node.field)) {
            groups.set(ore_node.field, []);
        }
        groups.get(ore_node.field).push(ore_node);
    }
    for (const [id, group] of groups) {
        let f = mining_fields.find(v => v.id === id);
        if (!f) {
            f = {id, r: 260};
            mining_fields.push(f);
        }
        f.x = group.reduce((n, v) => n + v.x, 0)/group.length;
        f.y = group.reduce((n, v) => n + v.y, 0)/group.length;
    }
}
// Mining goals follow live deposits. Active contracts always retain reachable supply.
let mining_refresh_time = 0;
let mining_resource_revision = 0;
function mining_point_safe(point, padding = 70)
{
    if (
        !Number.isFinite(point.x) ||
        !Number.isFinite(point.y) ||
        (point.x < padding) ||
        (point.y < padding) ||
        (point.x > world.w - padding) ||
        (point.y > world.h - padding)
    ) {
        return false;
    }
    if (distance(point, station) < 500 + padding) {
        return false;
    }
    if (black_holes.some(v => distance(point, v) < gravity_reach(v) + padding)) {
        return false;
    }
    if ([...portals, ...world_gates].some(v => distance(point, v) < 180 + padding)) {
        return false;
    }
    return !world_zones.some(v => distance(point, v) < v.r + padding);
}

function mineable_deposits()
{
    return ore_nodes.filter(v => (v.hp > 0) && mining_point_safe(v, v.r + 50));
}

function mark_mining_changed()
{
    mining_refresh_time = 0;
    mining_resource_revision++;
    guide_context_cache = null;
}

function mining_objective()
{
    const rocks = mineable_deposits();
    if (!rocks.length) {
        return null;
    }
    // Keep a nearby live target while extracting; distant field centroids can be empty.
    let best = rocks[0];
    let near = distance(best, player);
    for (let i = 1; i < rocks.length; i++) {
        const d = distance(rocks[i], player);
        if (d < near) {
            best = rocks[i];
            near = d;
        }
    }
    return {x: best.x, y: best.y, id: best.field, r: best.r};
}

function replenish_mining_supply(needed)
{
    if (needed <= 0) {
        return 0;
    }
    const candidates = mining_fields.filter(v => mining_point_safe(v, 310));
    candidates.sort((a, b) => distance(a, player || station) - distance(b, player || station));
    let field = candidates[0];
    if (!field) {
        const sites = [];
        for (let i = 0; i < 24; i++) {
            const a = (i*Math.PI)/12;
            sites.push({x: station.x + Math.cos(a)*1200, y: station.y + Math.sin(a)*1200});
        }
        for (let y = 1; y < 10; y++) {
            for (let x = 1; x < 10; x++) {
                sites.push({x: (world.w*x)/10, y: (world.h*y)/10});
            }
        }
        const safe = sites.filter(v => mining_point_safe(v, 310));
        safe.sort((a, b) => distance(a, player || station) - distance(b, player || station));
        if (!safe.length) {
            return 0;
        }
        field = mining_fields.find(v => !ore_nodes.some(vv => (vv.hp > 0) && (vv.field === v.id)));
        if (!field) {
            field = {id: Math.max(-1, ...mining_fields.map(v => v.id)) + 1, r: 260};
            mining_fields.push(field);
        }
        Object.assign(field, safe[0]);
    }
    const count = Math.min(24, needed);
    for (let i = 0; i < count; i++) {
        const a = (i/count)*Math.PI*2 + 0.31;
        const radius = 90 + (i % 3)*45;
        const size = 26 + (i % 4)*3;
        const x = field.x + Math.cos(a)*radius;
        const y = field.y + Math.sin(a)*radius;
        const hp = 65 + wave*3 + size;
        ore_nodes.push({x, y, r: size, hp, max_hp: hp, type: 'ore', field: field.id, angle: a, flash: 0});
    }
    mark_mining_changed();
    return count;
}

function refresh_mining_resources(force = false, dt = 0)
{
    mining_refresh_time -= dt;
    if (!force && (mining_refresh_time > 0)) {
        return;
    }
    mining_refresh_time = 0.3;
    recenter_mining_fields();
    const tasks = campaign.contracts.filter(v => !v.ready && (v.type === 'mining') && (v.world === campaign.world));
    if (tasks.length) {
        const remaining = Math.max(...tasks.map(v => Math.ceil(v.target - v.progress)));
        const minimum = clamp(remaining, 6, 24);
        const available = mineable_deposits().length;
        if (available < minimum) {
            ore_nodes = ore_nodes.filter(v => v.hp > 0);
            replenish_mining_supply(Math.max(minimum - available, 12));
            mining_refresh_time = 0.3;
        }
    }
    mining_resource_revision++;
}
