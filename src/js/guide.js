function focused_contract()
{
    if (guide_manual || Number.isInteger(campaign.route_world)) {
        return null;
    }
    return campaign.contracts.find(v => v.id === campaign.tracked_id) || campaign.contracts.find(v => !v.ready) || campaign.contracts[0] || null;
}

function focus_contract(m)
{
    campaign.trade_plan = null;
    campaign.tracked_id = m.id;
    campaign.route_world = null;
    guide_manual = null;
    guide_flying = false;
    guide_path_key = '';
    refresh_guidance();
    save_checkpoint();
}

function route_from_world_to_world(start, target)
{
    const queue = [[start]];
    const seen = new Set([start]);
    while (queue.length) {
        const route = queue.shift();
        const last = route[route.length - 1];
        if (last === target) {
            return route;
        }
        for (let i = 0, end = worlds[last].links.length; i < end; ++i) {
            const next = worlds[last].links[i];
            if (!seen.has(next)) {
                seen.add(next);
                queue.push([...route, next]);
            }
        }
    }
    return [];
}

function preparation_plan(id)
{
    const levels = {...upgrades};
    const out = [];
    let weapons = attack_rating();
    let defense = defense_rating();
    const weights = {damage: 1, rate: 1, spread: 3, drone: 2, homing: 1, armor: 1, shield: 1};
    for (let i = 0; (i < 30) && ((weapons < worlds[id].attack) || (defense < worlds[id].defense)); ++i) {
        const candidates = upgrade_options.filter(
            v => weights[v.key] && (levels[v.key] < v.cap) && (['armor', 'shield'].includes(v.key) ? defense < worlds[id].defense : weapons < worlds[id].attack)
        );
        candidates.sort(function (a, b) {
            const need_a = ['armor', 'shield'].includes(a.key) ? worlds[id].defense - defense : worlds[id].attack - weapons;
            const need_b = ['armor', 'shield'].includes(b.key) ? worlds[id].defense - defense : worlds[id].attack - weapons;
            return (
                Math.round(a.cost*(1 + levels[a.key]*0.48))/Math.min(need_a, weights[a.key]) -
                Math.round(b.cost*(1 + levels[b.key]*0.48))/Math.min(need_b, weights[b.key])
            );
        });
        const v = candidates[0];
        if (!v) {
            break;
        }
        const price = Math.round(v.cost*(1 + levels[v.key]*0.48));
        levels[v.key]++;
        out.push({
            key: v.key,
            title: v.title,
            level: levels[v.key],
            price,
            gain: weights[v.key],
            group: ['armor', 'shield'].includes(v.key) ? 'defense' : 'weapons',
        });
        if (['armor', 'shield'].includes(v.key)) {
            defense += weights[v.key];
        }
        else {
            weapons += weights[v.key];
        }
    }
    const needed = expedition_conditions[id].required;
    while ((radiation_protection(current_ship(), levels.radshield) + 0.001 < needed) && (levels.radshield < 4)) {
        const v = upgrade_options.find(v => v.key === 'radshield');
        const price = Math.round(v.cost*(1 + levels.radshield*0.48));
        levels.radshield++;
        out.push({key: v.key, title: v.title, level: levels.radshield, price, group: 'defense'});
    }
    if (radiation_protection(current_ship(), levels.radshield) + 0.001 < needed) {
        const hull = ship_catalog.find(v => radiation_protection(v, levels.radshield) + 0.001 >= needed);
        out.push({
            key: 'hull',
            title: `Protected hull: ${hull.name} (HANGAR; ${rank_names[hull.rank]})`,
            level: 1,
            price: ensure_career().ships.includes(hull.id) ? 0 : hull.price,
            group: 'defense',
        });
    }
    return out;
}

function expedition_base_guide_context()
{
    const effective_state = (state === 'navigation') ? nav_return : state;
    const trade = campaign.trade_plan;
    const m = focused_contract();
    const target = m ? (m.ready ? campaign.world : m.world) : Number.isInteger(campaign.route_world) ? campaign.route_world : campaign.world;
    const route = route_to(target);
    const blocked = route.slice(1).find(v => !allowed_world(v));
    const out = {
        mission: m,
        target,
        route,
        blocked,
        goal: null,
        kind: 'free',
        title: 'Choose a destination',
        instruction: 'Open the map and guide (J), then take a contract or click a destination.',
        interaction: '',
        action: 'Open map',
        plan: [],
    };
    if (trade && !guide_manual && (campaign.route_world === ((trade.stage === 'buy') ? trade.source : trade.destination))) {
        out.title = `${(trade.stage === 'buy') ? 'Buy' : 'Sell'} ${commodities.find(v => v.key === trade.commodity).name} / trade route`;
        out.plan.push({
            title: `Buy at ${worlds[trade.source].station}`,
            text: `Buy ${trade.amount} units, then travel to ${worlds[trade.destination].station}. Demand premium is limited and can change.`,
            done: trade.stage === 'sell',
        });
        out.plan.push({
            title: `Sell at ${worlds[trade.destination].station}`,
            text:
                `${(trade.margin === null) ? `Estimated sale proceeds ◆ ${trade.proceeds}` : `Estimated net cargo margin ◆ ${trade.margin}`}. Travel, protection and other purchases are separate costs.`,
            done: false,
        });
    }
    if (guide_manual) {
        out.goal = guide_manual;
        // a course to the station (Dock [R] from afar) ends in docking, like any other way home
        out.kind = guide_manual.dock ? 'station' : 'manual';
        out.title = guide_manual.label;
        out.instruction =
            `Follow the gold route to ${guide_manual.label}. ${(guide_manual.portal !== undefined) ? 'Fly into the ring to use the portal. ' : ''}Click or hold to move, or use WASD. The route uses local portals when they save flight time.`;
        out.action = 'Fly to marker';
        return out;
    }
    if (!m && !Number.isInteger(campaign.route_world)) {
        // docked with nothing chosen: the station's contracts are right here
        if (effective_state === 'upgrade') {
            out.title = `Docked at ${worlds[campaign.world].station}`;
            out.instruction = 'Take a contract here (CONTRACTS, 1), or open the map and guide (J) to choose where to go.';
        }
        return out;
    }
    out.title = trade
        ? `${(trade.stage === 'buy') ? 'Buy' : 'Sell'} ${commodities.find(v => v.key === trade.commodity).name} / trade route`
        : m
            ? m.title
            : `Travel to ${worlds[target].name}`;
    if (m && (m.type === 'courier')) {
        out.plan.push({
            title: 'Sealed mission package loaded',
            text: 'The package for this delivery stage is already aboard. It takes no cargo space.',
            done: true,
        });
    }
    if (blocked !== undefined) {
        const purchases = preparation_plan(blocked);
        const cost = purchases.reduce((n, v) => n + v.price, 0);
        out.goal = {...station, label: worlds[campaign.world].station};
        out.kind = 'prepare';
        out.purchases = purchases;
        out.action = (effective_state === 'upgrade') ? 'Open modules' : 'Fly to station';
        out.instruction =
            `Prepare for ${worlds[blocked].name}: ${purchases.map(v => `${v.title} Lv ${v.level}`).join(', ')}. Dock at ${worlds[campaign.world].station} and use OUTFITTER.`;
        out.plan.push({
            title: `Prepare your ship for ${worlds[blocked].name}`,
            text:
                `${requirements(blocked)}. Suggested purchases: ${purchases.map(v => `${v.title} Lv ${v.level} (◆ ${v.price})`).join(', ')}. Total ◆ ${cost}; you have ◆ ${salvage}.${(salvage < cost) ? ' Earn salvage from local mining contracts, mine ore and sell it at the CARGO MARKET.' : ''}`,
            done: false,
        });
    }
    else {
        out.plan.push({title: 'Ship ready for this route', text: 'Required weapon and defense ratings are met. Repairs are free when docking.', done: true});
    }
    if (effective_state === 'upgrade') {
        out.plan.push({
            title: `Undock from ${worlds[campaign.world].station}`,
            text: 'Press Undock to return to flight. You can open this map while docked.',
            done: false,
        });
    }
    for (let i = 1, end = route.length; i < end; ++i) {
        out.plan.push({
            title: `Jump ${worlds[route[i - 1]].name} → ${worlds[route[i]].name}`,
            text:
                `Approach the WORLD GATE labeled ${worlds[route[i]].name}. When R JUMP lights up, press R. Local gates A–H only move you within the same world.`,
            done: false,
        });
    }
    if (m && m.ready) {
        out.kind = 'claim';
        out.goal = {...station, label: worlds[campaign.world].station};
        out.action = (effective_state === 'upgrade') ? 'Collect reward' : 'Fly to station';
        out.instruction =
            (effective_state === 'upgrade')
                ? `Delivery complete. Collect ◆ ${m.reward} from CONTRACTS.`
                : `Objective complete. Fly to ${worlds[campaign.world].station}, press R to dock, then collect ◆ ${m.reward}.`;
        out.plan.push({title: 'Objective complete', text: `Your progress is ${format_progress(m.progress)}/${m.target}.`, done: true});
        out.plan.push({title: `Collect ◆ ${m.reward}`, text: 'Dock at any station, open CONTRACTS, and press Collect reward.', done: false});
        return out;
    }
    if (route.length > 1) {
        if (blocked === undefined) {
            const g = world_gates.find(v => v.destination === route[1]);
            out.goal = {...g, label: `WORLD GATE → ${worlds[route[1]].name}`};
            out.kind = 'jump';
            out.action = 'Fly to world gate';
            out.instruction =
                `Next: ${worlds[campaign.world].name} → ${worlds[route[1]].name}. Follow the gold marker to the WORLD GATE. Fly within 155 m, then press R to jump.`;
            out.interaction = 'R JUMP';
        }
    }
    if (m) {
        let description = '';
        let goal = station;
        let kind = m.type;
        if (m.type === 'courier') {
            goal = station;
            description =
                `In ${worlds[m.world].name}, fly to ${worlds[m.world].station}. Within ${station_reach} m, press R to dock. The mission package is delivered automatically.`;
        }
        if (m.type === 'mining') {
            goal = mining_objective() || station;
            description =
                `Fly to the marked live ore deposit and press H: your drones cut the rocks and bring the ore aboard, and raiders hunt them. FLY TO OBJECTIVE launches them on arrival and continues to the next deposit. Extract ${format_progress(m.target - m.progress)} more rocks; you keep the ore and artifacts.`;
        }
        if (m.type === 'survey') {
            const remaining = beacons.map((b, i) => ({...b, index: i})).filter(v => !m.scans.includes(v.index));
            remaining.sort((a, b) => distance(a, player) - distance(b, player));
            goal = remaining[0] || station;
            description = `Fly within 120 m of each scan beacon. Scanning is automatic. ${format_progress(m.target - m.progress)} beacons remain.`;
        }
        if (m.type === 'hunt') {
            goal = {x: station.x - 1100, y: station.y + 800};
            description =
                `Leave the station safe zone and enter the marked patrol area. Your weapons fire automatically. Destroy ${format_progress(m.target - m.progress)} more hostile ships here.`;
        }
        if (m.type === 'boss') {
            goal = combat_zone;
            description = 'Fly to the marked flagship zone. The enemy appears when you approach. Keep moving while your cannon and drones fire.';
        }
        if (m.type === 'escort') {
            goal = escort || {x: station.x + station_size/2 + 350, y: station.y + 250};
            description = escort?.active
                ? `Stay within ${escort_leash} m of the freighter so it keeps moving. Next: ${escort.stops[escort.leg].label}.`
                : `Meet the freighter beside the station; its cargo run is ${escort_route_text(escort || escort_route())}.`;
        }
        if (m.type === 'trade') {
            goal = station;
            description =
                `Dock at ${worlds[m.world].station}, open CARGO MARKET, and sell ${format_progress(m.target - m.progress)} more ${commodities.find(v => v.key === m.commodity).name}. Mine ore or buy cargo here or in another world.`;
        }
        out.plan.push({
            title: (m.type === 'courier') ? `Dock at ${worlds[m.world].station}` : `Complete the ${m.type} objective in ${worlds[m.world].name}`,
            text: description,
            done: false,
        });
        out.plan.push({title: `Collect ◆ ${m.reward}`, text: 'After completion, open CONTRACTS at a station and press Collect reward.', done: false});
        if ((route.length === 1) && (blocked === undefined)) {
            out.goal = {
                ...goal,
                // a goal that moves (the convoy's freighter) is followed live by the marker, not where it was
                follow: (m.type === 'escort') ? escort : null,
                label:
                    ((m.type === 'courier') || (m.type === 'trade'))
                        ? worlds[m.world].station
                        : (m.type === 'survey')
                            ? `SCAN BEACON ${(goal.index || 0) + 1}`
                            : (m.type === 'mining')
                                ? `MINING FIELD ${(goal.id || 0) + 1}`
                                : (m.type === 'boss')
                                    ? 'FLAGSHIP ZONE'
                                    : (m.type === 'escort')
                                        ? 'FREIGHTER'
                                        : 'PATROL AREA',
            };
            out.kind = kind;
            out.instruction = description;
            out.action =
                ((effective_state === 'upgrade') && (m.type === 'trade'))
                    ? 'Open cargo market'
                    : ((effective_state === 'upgrade') && (m.type === 'courier'))
                        ? 'Deliver on docking'
                        : 'Fly to objective';
            if ((m.type === 'courier') || (m.type === 'trade')) {
                out.interaction = 'R DOCK';
            }
        }
    }
    else if ((route.length === 1) && (blocked === undefined) && (effective_state === 'upgrade')) {
        // already docked where the route ends: nothing to fly to
        out.title = `Docked at ${worlds[target].station}`;
        out.instruction = 'Take a contract here, or open the map and guide (J) to choose where to go next.';
        out.action = 'Open map';
    }
    else if ((route.length === 1) && (blocked === undefined)) {
        out.goal = {...station, label: worlds[target].station};
        out.kind = 'station';
        out.instruction = `You are in ${worlds[target].name}. Follow the gold marker to ${worlds[target].station} and press R to dock.`;
        out.action = 'Fly to station';
    }
    if (trade && (route.length === 1) && (blocked === undefined)) {
        out.kind = 'trade';
        out.goal = {...station, label: worlds[campaign.world].station};
        out.action = (effective_state === 'upgrade') ? 'Open cargo market' : 'Fly to station';
        const step = (trade.stage === 'buy')
            ? `buy ${Math.max(0, trade.amount - (trade.bought || 0))}`
            : `sell ${Math.min(trade.remaining || trade.amount, campaign.cargo[trade.commodity])}`;
        out.instruction = `Dock at ${worlds[campaign.world].station} and ${step} ${commodities.find(v => v.key === trade.commodity).name} in CARGO MARKET.`;
    }
    return out;
}
let navigation_graph = null;
function safe_flight_path(start, end)
{
    const key = `${world.w}:${world.h}:${black_holes.map(v => `${v.x},${v.y},${gravity_reach(v)}`).join(';')}`;
    let graph = navigation_graph;
    if (!graph || (graph.key !== key)) {
        const obstacles = black_holes.map(v => ({x: v.x, y: v.y, r: gravity_reach(v) + 150}));
        const nodes = [];
        const edges = [];
        function visible(a, b) {
            for (let i = 0, end = obstacles.length; i < end; ++i) {
                const h = obstacles[i];
                const minimum = Math.min(h.r, distance(h, a), distance(h, b));
                if (segment_distance(h, a, b) < minimum - 1) {
                    return false;
                }
            }
            return true;
        }
        for (const obstacle of obstacles) {
            for (let i = 0; i < 16; ++i) {
                const a = (i/16)*Math.PI*2;
                const node = {x: obstacle.x + Math.cos(a)*(obstacle.r + 70), y: obstacle.y + Math.sin(a)*(obstacle.r + 70)};
                if (
                    (node.x > 40) &&
                    (node.x < world.w - 40) &&
                    (node.y > 40) &&
                    (node.y < world.h - 40) &&
                    obstacles.every(v => (node.x - v.x)**2 + (node.y - v.y)**2 >= v.r*v.r)
                ) {
                    nodes.push(node);
                }
            }
        }
        for (let i = 0, end = nodes.length; i < end; ++i) {
            edges.push([]);
        }
        for (let i = 0, end = nodes.length; i < end; ++i) {
            for (let j = i + 1; j < end; ++j) {
                if (visible(nodes[i], nodes[j])) {
                    const cost = distance(nodes[i], nodes[j]);
                    edges[i].push({index: j, cost});
                    edges[j].push({index: i, cost});
                }
            }
        }
        graph = navigation_graph = {key, obstacles, nodes, edges, visible};
    }
    if (graph.visible(start, end)) {
        return [{x: end.x, y: end.y}];
    }
    const nodes = [{x: start.x, y: start.y}, {x: end.x, y: end.y}, ...graph.nodes];
    const edges = [[], []];
    for (const edge of graph.edges) {
        edges.push(edge.map(v => ({index: v.index + 2, cost: v.cost})));
    }
    for (let i = 2, end_i = nodes.length; i < end_i; ++i) {
        for (let j = 0; j < 2; ++j) {
            if (graph.visible(nodes[i], nodes[j])) {
                const cost = distance(nodes[i], nodes[j]);
                edges[i].push({index: j, cost});
                edges[j].push({index: i, cost});
            }
        }
    }
    const costs = new Float64Array(nodes.length);
    const previous = new Int32Array(nodes.length);
    const visited = new Uint8Array(nodes.length);
    costs.fill(Infinity);
    previous.fill(-1);
    costs[0] = 0;
    for (let i = 0, end_i = nodes.length; i < end_i; ++i) {
        let index = -1;
        for (let j = 0; j < end_i; ++j) {
            if (!visited[j] && ((index < 0) || (costs[j] < costs[index]))) {
                index = j;
            }
        }
        if ((index < 0) || !Number.isFinite(costs[index])) {
            break;
        }
        if (index === 1) {
            break;
        }
        visited[index] = 1;
        const links = edges[index];
        for (let j = 0, end_j = links.length; j < end_j; ++j) {
            const v = links[j];
            if (visited[v.index]) {
                continue;
            }
            const cost = costs[index] + v.cost;
            if (cost < costs[v.index]) {
                costs[v.index] = cost;
                previous[v.index] = index;
            }
        }
    }
    if (previous[1] < 0) {
        return [{x: end.x, y: end.y}];
    }
    const out = [];
    let index = 1;
    while (index > 0) {
        out.unshift(nodes[index]);
        index = previous[index];
    }
    return out;
}
