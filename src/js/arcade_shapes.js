// The arcade's worlds each have a shape of their own (the campaign's maps are drawn from world_extents, far larger):
// its size and proportions, where its station stands, how its rock fields lie and which portal crossings it has. The
// world's own rules are placed round that as in any map: Dustfall's cliffs on their ring, Eclipse's hole where its
// shape sets it, the storms and the planet at their offsets from the station. Before 2026-10-19 every arcade world
// was the same 7.2 × 5.6 km with the station in its middle and its fields strewn alike.

// Each world, Haven to Eclipse (campaign.world): scroll, its lane's length on a Scroll run, in m (the world stretched
// along the lane to it: arcade_world_extent); extent in m; station, its place as shares of the extent; fields,
// the pattern its rock fields lie in (arcade_field_spot); crossings, its portal pairs as shares (a pair that breaks
// a rule of docs/placement.md is left out, as everywhere)
const arcade_shapes = [
    // the first: small, the station in the middle, the fields strewn round it
    {scroll: 12000, extent: [6000, 4800], station: [0.5, 0.5], fields: 'scatter', crossings: [[[0.1, 0.12], [0.9, 0.88]], [[0.1, 0.88], [0.9, 0.12]]]},
    // a long river valley: the station at its west end, the fields a band along the middle the current runs down
    {scroll: 16000, extent: [9600, 4400], station: [0.2, 0.5], fields: 'band', crossings: [[[0.45, 0.1], [0.95, 0.9]], [[0.45, 0.9], [0.95, 0.1]]]},
    // a broad canyon floor: the station on its south rim, the fields in outcrops, the cliffs' ring (cliffs) north of
    // the middle, clear of the depot so all six stand
    {scroll: 14000, extent: [7600, 6600], station: [0.5, 0.8], fields: 'clusters', cliffs: [0.5, 0.4], crossings: [[[0.07, 0.1], [0.93, 0.1]], [[0.08, 0.5], [0.92, 0.5]]]},
    // a square storm field: the station in the middle, the fields a ring round it, the storms between
    {scroll: 13000, extent: [6400, 6400], station: [0.5, 0.5], fields: 'ring', crossings: [[[0.1, 0.1], [0.9, 0.9]], [[0.1, 0.9], [0.9, 0.1]]]},
    // tall and deep: the station at the top, a belt of rock across the planet's side below it
    {scroll: 16000, extent: [5600, 8000], station: [0.5, 0.2], fields: 'belt', crossings: [[[0.1, 0.45], [0.9, 0.95]], [[0.9, 0.45], [0.1, 0.95]]]},
    // a wide ice shelf: the station at its east end, the fields in columns, walls of ice to fly between
    {scroll: 15000, extent: [8800, 5400], station: [0.8, 0.5], fields: 'columns', crossings: [[[0.06, 0.1], [0.55, 0.9]], [[0.06, 0.9], [0.55, 0.1]]]},
    // small and hot: the station in the middle, close outcrops, nowhere far to run
    {scroll: 12000, extent: [5400, 5400], station: [0.5, 0.5], fields: 'clusters', crossings: [[[0.1, 0.1], [0.9, 0.9]]]},
    // the end of the world: the station west of the middle, the hole (hole) 3.1 km east of it and 1 km from the east
    // edge, as on the old map: the fights round the station reach it, and raiders fall in
    {scroll: 12000, extent: [7600, 6000], station: [0.45, 0.5], hole: [0.86, 0.5], fields: 'scatter', crossings: [[[0.08, 0.1], [0.6, 0.9]], [[0.08, 0.9], [0.6, 0.1]]]},
];
// Every world has the old map's twelve fields, closer together in a small world and farther apart in a large one:
// the rocks your guns mine pay much of a run's salvage, and kept to its area (9 in Nova Forge, a ring 2.2 km round
// Ion Reach's station) the bot earned a quarter less from Ion Reach on and won 1 to 5 runs of 12, not 8
const arcade_field_total = 12;
// A field's middle keeps this far from another's, and from the map's edge
const arcade_field_apart = 620;
const arcade_field_edge = 380;
// On a Scroll run's lane: a rock field every this many m of it, and a cache of salvage every this many; a run earns
// about what it does in Free (every 700 and 400 m, the bot earned 2.5 times as much, and won 11 runs of 12)
const arcade_lane_field_gap = 2000;
const arcade_lane_cache_gap = 1800;
// An outcrop's three fields stand this far from its middle, so this far apart at least
const arcade_cluster_r = 330;
const arcade_cluster_apart = 540;

// The shape of the world being flown in the arcade
function arcade_shape()
{
    return arcade_shapes[campaign.world] || arcade_shapes[0];
}

// Where field i of n lies by the world's pattern, a little shaken by the seeded random; `ok` says whether a spot is
// free (clear of the pulls); a spot that is not tries the pattern's place again, shaken more, then anywhere. A
// field's spot also keeps arcade_field_apart from the fields placed before it.
function arcade_field_spot(i, n, random, ok)
{
    const {extent: [w, h], station: [sx, sy], fields} = arcade_shape();
    const station_at = {x: w*sx, y: h*sy};
    // a Scroll run's long lane: the fields along it, either side of where it runs, wherever its pattern would put them
    if (arcade_lane_kind()) {
        const [lw, lh] = arcade_world_extent();
        let spot = arcade_lane_point((i + 0.5)*arcade_shape().scroll/n, (random() - 0.5)*1800, lw, lh);
        for (let tries = 0; (tries < 40) && !ok(spot, arcade_field_apart); ++tries) {
            spot = arcade_lane_point((i + random())*arcade_shape().scroll/n, (random() - 0.5)*2200, lw, lh);
        }
        return {x: clamp(spot.x, arcade_field_edge, lw - arcade_field_edge), y: clamp(spot.y, arcade_field_edge, lh - arcade_field_edge)};
    }
    const t = (i + 0.5)/n;
    function place(shake) {
        const jx = (random() - 0.5)*shake;
        const jy = (random() - 0.5)*shake;
        if (fields === 'band') {
            return {x: w*(0.06 + 0.88*t) + jx*0.3, y: h*0.5 + (random() - 0.5)*h*0.3 + jy*0.3};
        }
        if (fields === 'ring') {
            const a = t*Math.PI*2 + 0.4;
            const r = Math.min(w, h)*0.27;
            return {x: station_at.x + Math.cos(a)*r + jx, y: station_at.y + Math.sin(a)*r + jy};
        }
        if (fields === 'belt') {
            return {x: w*(0.1 + 0.8*t) + jx, y: h*(0.85 - 0.45*t) + jy};
        }
        if (fields === 'columns') {
            const column = i % 3;
            const row = Math.floor(i/3);
            const rows = Math.ceil(n/3);
            return {x: w*(0.14 + 0.24*column) + jx*0.4, y: h*(0.12 + 0.76*(row + 0.5)/rows) + jy*0.4};
        }
        if (fields === 'clusters') {
            // outcrops of three fields in a tight triangle, the outcrops round the map's middle
            const groups = Math.ceil(n/3);
            const g = Math.floor(i/3);
            const ga = (g/groups)*Math.PI*2 + 0.6;
            const fa = ((i % 3)/3)*Math.PI*2 + g;
            return {
                x: w*(0.5 + 0.34*Math.cos(ga)) + Math.cos(fa)*arcade_cluster_r + jx*0.3,
                y: h*(0.5 + 0.32*Math.sin(ga)) + Math.sin(fa)*arcade_cluster_r + jy*0.3,
            };
        }
        return {x: arcade_field_edge + random()*(w - 2*arcade_field_edge), y: arcade_field_edge + random()*(h - 2*arcade_field_edge)};
    }
    function inside(v) {
        return {x: clamp(v.x, arcade_field_edge, w - arcade_field_edge), y: clamp(v.y, arcade_field_edge, h - arcade_field_edge)};
    }
    // an outcrop's fields stand closer to each other than other fields do
    const apart = (fields === 'clusters') ? arcade_cluster_apart : arcade_field_apart;
    let spot = inside(place(0));
    for (let tries = 0; (tries < 80) && !ok(spot, apart); ++tries) {
        spot = inside((tries < 40) ? place(300 + tries*30) : {x: random()*w, y: random()*h});
    }
    return spot;
}

// The world's size in the arcade: its shape's; on a Scroll run stretched along its lane to the lane's length and the
// margins at its two ends, the shape's other side kept (a 4.3 km lane was over in a minute and a half: "about
// nothing", the author, 2026-10-19)
function arcade_world_extent()
{
    const shape = arcade_shape();
    if (!arcade_lane_kind()) {
        return shape.extent;
    }
    const along = shape.scroll + 2*arcade_scroll_margin;
    return arcade_lane_way().y ? [shape.extent[0], along] : [along, shape.extent[1]];
}

// The way the world's lane goes (arcade_scroll_ways)
function arcade_lane_way()
{
    return arcade_scroll_ways[(arcade_scroll_lanes[campaign.world] || arcade_scroll_lanes[0]).way];
}

// Where the station stands, as shares of the world's size: its shape's place; on a Scroll run at the lane's start,
// across where the shape has it
function arcade_station_at()
{
    const shape = arcade_shape();
    if (!arcade_lane_kind()) {
        return shape.station;
    }
    const [w, h] = arcade_world_extent();
    const way = arcade_lane_way();
    // behind where the lane starts, so the screen leaves it behind at once
    const back = arcade_scroll_margin - 350;
    if (way.y) {
        return [shape.station[0], (way.y < 0) ? 1 - back/h : back/h];
    }
    return [(way.x > 0) ? back/w : 1 - back/w, shape.station[1]];
}

// A point of a Scroll run's lane, before the map is made: `along` m from where the lane starts, `across` m to its
// side, in a world of size w × h; the lane runs where arcade_scroll_world_start will put it
function arcade_lane_point(along, across, w, h)
{
    const lane = arcade_scroll_lanes[campaign.world] || arcade_scroll_lanes[0];
    const way = arcade_lane_way();
    const m = arcade_scroll_margin;
    if (way.y) {
        return {x: w*lane.across + across, y: (way.y < 0) ? h - m - along : m + along};
    }
    return {x: (way.x > 0) ? m + along : w - m - along, y: h*lane.across + across};
}
