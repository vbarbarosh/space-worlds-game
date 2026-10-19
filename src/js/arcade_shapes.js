// The arcade's worlds each have a shape of their own (the campaign's maps are drawn from world_extents, far larger):
// its size and proportions, where its station stands, how its rock fields lie and which portal crossings it has. The
// world's own rules are placed round that as in any map: Dustfall's cliffs on their ring, Eclipse's hole where its
// shape sets it, the storms and the planet at their offsets from the station. Before 2026-10-19 every arcade world
// was the same 7.2 × 5.6 km with the station in its middle and its fields strewn alike.

// Each world, Haven to Eclipse (campaign.world): extent in m; station, its place as shares of the extent; fields,
// the pattern its rock fields lie in (arcade_field_spot); crossings, its portal pairs as shares (a pair that breaks
// a rule of docs/placement.md is left out, as everywhere)
const arcade_shapes = [
    // the first: small, the station in the middle, the fields strewn round it
    {extent: [6000, 4800], station: [0.5, 0.5], fields: 'scatter', crossings: [[[0.1, 0.12], [0.9, 0.88]], [[0.1, 0.88], [0.9, 0.12]]]},
    // a long river valley: the station at its west end, the fields a band along the middle the current runs down
    {extent: [9600, 4400], station: [0.2, 0.5], fields: 'band', crossings: [[[0.45, 0.1], [0.95, 0.9]], [[0.45, 0.9], [0.95, 0.1]]]},
    // a broad canyon floor: the station on its south rim, the fields in outcrops, the cliffs' ring (cliffs) north of
    // the middle, clear of the depot so all six stand
    {extent: [7600, 6600], station: [0.5, 0.8], fields: 'clusters', cliffs: [0.5, 0.4], crossings: [[[0.07, 0.1], [0.93, 0.1]], [[0.08, 0.5], [0.92, 0.5]]]},
    // a square storm field: the station in the middle, the fields a ring round it, the storms between
    {extent: [6400, 6400], station: [0.5, 0.5], fields: 'ring', crossings: [[[0.1, 0.1], [0.9, 0.9]], [[0.1, 0.9], [0.9, 0.1]]]},
    // tall and deep: the station at the top, a belt of rock across the planet's side below it
    {extent: [5600, 8000], station: [0.5, 0.2], fields: 'belt', crossings: [[[0.1, 0.45], [0.9, 0.95]], [[0.9, 0.45], [0.1, 0.95]]]},
    // a wide ice shelf: the station at its east end, the fields in columns, walls of ice to fly between
    {extent: [8800, 5400], station: [0.8, 0.5], fields: 'columns', crossings: [[[0.06, 0.1], [0.55, 0.9]], [[0.06, 0.9], [0.55, 0.1]]]},
    // small and hot: the station in the middle, close outcrops, nowhere far to run
    {extent: [5400, 5400], station: [0.5, 0.5], fields: 'clusters', crossings: [[[0.1, 0.1], [0.9, 0.9]]]},
    // the end of the world: the station west of the middle, the hole (hole) 3.1 km east of it and 1 km from the east
    // edge, as on the old map: the fights round the station reach it, and raiders fall in
    {extent: [7600, 6000], station: [0.45, 0.5], hole: [0.86, 0.5], fields: 'scatter', crossings: [[[0.08, 0.1], [0.6, 0.9]], [[0.08, 0.9], [0.6, 0.1]]]},
];
// Every world has the old map's twelve fields, closer together in a small world and farther apart in a large one:
// the rocks your guns mine pay much of a run's salvage, and kept to its area (9 in Nova Forge, a ring 2.2 km round
// Ion Reach's station) the bot earned a quarter less from Ion Reach on and won 1 to 5 runs of 12, not 8
const arcade_field_total = 12;
// A field's middle keeps this far from another's, and from the map's edge
const arcade_field_apart = 620;
const arcade_field_edge = 380;
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
