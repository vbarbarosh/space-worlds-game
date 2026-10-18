// The arcade's route: a run starts in Haven and ends in Eclipse, and at each break between worlds you choose the next
// of two, so the six worlds between come in an order of your own. The run's difficulty grows with the step, not the
// world: a world's raiders carry the hull, armour, shield and hits of the step they come at (spawn_enemy), its waves
// the step's size, its flagship the step's hull, and the depot opens what the step opens (world_reached); the world
// keeps what makes it itself: its map, its rules, its raiders' gun, its goal and its flagship's attacks. The offer:
// the lowest world left (so none is put off for ever without your say) and one more of those at most a step ahead,
// so no gun or rule comes far before the kit that answers it; Obsidian only at its own step. Always taking the lowest
// flies today's order with today's numbers. The offers come from the run's own dice (arcade.seed), so loading a save
// offers the same two again.

// The steps a world may be flown at, by its index: from a step before its own place (its tier) to the last before
// Eclipse. Obsidian only at its own, 4: its siege asks for a third gun (the gunship's mount, on sale from step 3) and
// is tuned to step 4's hull; bin/playtest's bot (NORMAL) lost the run there 6 times in 9 at step 3, 6 in 9 at steps 5
// and 6 (where the shop gives raiders 2.2 and 2.8 times the hull), and 2 in 12 at step 4, both with two guns
const arcade_route_steps = [[0, 0], [1, 6], [1, 6], [2, 6], [4, 4], [4, 6], [5, 6], [7, 7]];

// Raiders' guns as the route card names them
const arcade_route_guns = {plasma: 'Plasma bolts', scatter: 'Scatter shot', missile: 'Missiles', ion: 'Ion bolts', rail: 'Railgun slugs'};
// Each world's goal in a few words (arcade_goals.js), for the route card
const arcade_route_goals = {
    escort: 'Escort tenders to the depot',
    brood: 'Scoop the seed pods before the nest',
    breach: 'Break through the launchers’ rock walls',
    relays: 'Light relays with a storm-charged pulse',
    siege: 'Break the emitters, then the command post',
    rescue: 'Tow the drifting capsules home',
    regulators: 'Hold the regulators by the flares',
    anchors: 'Fly through the anchors round the black hole',
};

// The step of the run, 0 to 7: the worlds cleared before this one. Outside the arcade, the world.
function arcade_level()
{
    return arcade.active ? arcade.route.length - 1 : campaign.world;
}

// The tier a raider of this world fights at: the run's step in the arcade, the world's own tier elsewhere
function arcade_tier()
{
    return arcade.active ? arcade_level() : world_tier(campaign.world);
}

// The threat level a fight is at (1, 3, ... 15): in the arcade the run's step's, so a world's shooters' bolts and
// reload, its flagship's patterns, your EMP and the salvage a raider spills follow the step, as its raiders' hull does;
// elsewhere the world's own (wave). The world's map keeps its own: rocks, black holes, gravity
function threat_wave()
{
    return arcade.active ? 1 + arcade_level()*2 : wave;
}

// The route as a run starts: a save's when it holds a whole one ending in its world; else the worlds in their order up
// to the world (a save from before routes, a dev page's world), which are the steps it was then
function arcade_route_start(world, from)
{
    const route = from?.route;
    const valid = Array.isArray(route) && route.length && route.every(v => Number.isInteger(v) && worlds[v]) && (new Set(route).size === route.length) && (route[0] === 0) && (route[route.length - 1] === world);
    arcade.route = valid ? [...route] : Array.from({length: world + 1}, (_, i) => i);
    arcade.seed = Number.isInteger(from?.seed) ? from.seed : Math.floor(Math.random()*1e9);
}

// The worlds offered for the next step: Eclipse alone last, and a world whose last step it is (arcade_route_steps)
// alone; else the lowest world left and one more of those that may come this early, by the run's dice; the lowest
// alone when none may
function arcade_route_offers()
{
    const next = arcade.route.length;
    const last = arcade_worlds - 1;
    const left = worlds.map((_, i) => i).filter(v => (v !== last) && !arcade.route.includes(v)).sort((a, b) => world_tier(a) - world_tier(b));
    if ((next >= last) || !left.length) {
        return [last];
    }
    const due = left.find(v => arcade_route_steps[v][1] <= next);
    if (due !== undefined) {
        return [due];
    }
    const lowest = left[0];
    const near = left.slice(1).filter(v => arcade_route_steps[v][0] <= next);
    if (!near.length) {
        return [lowest];
    }
    const dice = finale_random(arcade.seed + next*7919);
    const other = near[Math.floor(dice()*near.length)];
    // in the map's order, so the lower is always the first card
    return [lowest, other].sort((a, b) => world_tier(a) - world_tier(b));
}

// What a world offered asks of you, as the route card says it: its goal, its raiders' gun, its rules
function arcade_route_card(world)
{
    const kind = arcade_goal_kinds[world];
    return {
        goal: arcade_route_goals[kind] || '',
        gun: arcade_route_guns[worlds[world].weapon] || '',
        rules: world_rules[world].summary.split(' · '),
    };
}

// The route as a strip of eight steps: the worlds flown (lit, ticked), the next step's offers stacked (the one chosen
// lit), the steps still to come as numbered rings, Eclipse last; then the worlds still ahead, dim
function arcade_route_map_html(offers, chosen)
{
    const next = arcade.route.length;
    const steps = [];
    for (let i = 0; i < arcade_worlds; ++i) {
        let inner = '';
        let kind = 'is-ahead';
        if (i < next) {
            kind = 'is-flown';
            inner = arcade_route_node(arcade.route[i], i === next - 1 ? 'here' : 'flown');
        }
        else if (i === next) {
            kind = (offers.length > 1) ? 'is-next is-fork' : 'is-next';
            inner = offers.map(v => arcade_route_node(v, (v === chosen) ? 'chosen' : 'offer')).join('');
        }
        else if (i === arcade_worlds - 1) {
            kind = 'is-last';
            inner = arcade_route_node(i, 'last');
        }
        else {
            inner = `<span class="rt-ring">${i + 1}</span>`;
        }
        steps.push(`<li class="rt-step ${kind}">${inner}</li>`);
    }
    const ahead = worlds.map((_, i) => i).filter(v => (v !== arcade_worlds - 1) && !arcade.route.includes(v) && !offers.includes(v));
    const pool = ahead.length ? `<p class="rt-pool"><span class="eyebrow eyebrow--muted">Still ahead</span>${ahead.map(v => `<span class="rt-pool-w" style="--world:var(--w-${world_slug(v)})"><img src="${arcade_route_planet(v)}" alt="">${ui_escape(worlds[v].name)}</span>`).join('')}</p>` : '';
    return `<ol class="rt-strip" aria-label="Your route">${steps.join('')}</ol>${pool}`;
}

// One world on the strip: its planet and its name; kind: flown, here (the one just cleared), offer, chosen or last
function arcade_route_node(world, kind)
{
    const tick = ['flown', 'here'].includes(kind) ? '<i class="rt-tick"></i>' : '';
    return `<span class="rt-node is-${kind}" style="--world:var(--w-${world_slug(world)})" title="${ui_escape(worlds[world].name)}"><img src="${arcade_route_planet(world)}" alt="">${tick}<b>${ui_escape(worlds[world].name)}</b></span>`;
}

// A world's planet as an image URL, made once a world
const arcade_route_planets = {};

function arcade_route_planet(world)
{
    arcade_route_planets[world] = arcade_route_planets[world] || menu_sprite_url(menu_planet_text(world));
    return arcade_route_planets[world];
}
