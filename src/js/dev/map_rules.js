// The placement rules of docs/placement.md, checked on a map as window.dev_state() gives it: bin/map-check runs them on
// every world (window.dev_map_check), and the map editor (dev/map_editor.js) on the map being edited, as it changes.
// Each problem says its rule (the rule's words in docs/placement.md), what breaks it, and where: the places of the
// things it is between, to the metre, so the editor draws them red.
const map_rules = {
    margin: 150, // between two ranges where a key acts
    gate_out: 0.25, // a gate from the station, a share of the map's smaller side
    gate_bearing: 10, // degrees between a gate's bearing from the station and the galaxy chart's
    gate_edge: 1000, // a gate from the map's edge
    gate_company: 1000, // only the portal beside a gate stands this close to it
    portal_out: 1500, // a portal from the station's centre
    portal_span: 2000, // a pair's ends apart, or a quarter of the map's smaller side if more
    portal_apart: 1000, // two portals of different pairs
    portal_edge: 300, // a portal from the map's edge
    zone_apart: 1000, // the combat zone from the station's shelter, gates and portals
    beacon_apart: 1000, // a survey beacon from a gate
    scan: 120, // a survey beacon scans a ship this close
    race_rings: [7, 10], // a race course's rings, fewest and most
    race_turn: 25, // degrees a race course turns at each ring at least, so its line needs steering
    pylon_apart: 400, // two arc pylons' rings (Ion Reach) at least this far apart, so one charges at you at a time
    pylons_least: 5, // Ion Reach has this many arc pylons at least, and fields_least charge fields
    fields_least: 3,
    spire_apart: 300, // two magnetic spires' fields (Obsidian) at least this far apart: one cover, one pull at a time
    spires_least: 5, // Obsidian has this many magnetic spires at least
};
// The rules by the words docs/placement.md gives them
const map_rule_names = {
    ranges: 'Two ranges never touch',
    gates: 'World gates',
    portals: 'Portals',
    zone: 'The combat zone',
    beacons: 'Survey beacons',
    pulls: 'No gravity well pulls inside any range',
    solids: 'Rocks and debris leave a ship\'s width',
    races: 'Race courses',
    pylons: 'Ion Reach\'s arc pylons',
    spires: 'Obsidian\'s magnetic spires',
};

// The problems of a map read from window.dev_state() (the one being flown, by default), as bin/map-check prints them
window.dev_map_check = function (map = window.dev_state()) {
    return map_rules_check(map).map(v => v.text);
};

// Each thing you act on has a body and a range: R docks within station_reach of the station's centre, R jumps within
// gate_reach of a world gate's, a portal takes any ship whose hull touches its ring, a beacon scans within
// map_rules.scan. The problems of the map: {rule, text, at}
function map_rules_check(map)
{
    const out = [];
    const side = Math.min(map.world.w, map.world.h);
    const station = {label: 'station', x: map.station.x, y: map.station.y, body: map.station_size/2, range: map.station_reach};
    const gates = map.gates.map(v => ({...v, label: `gate to ${v.to}`, body: v.r, range: map.gate_reach}));
    const portals = map.portals.map(v => ({...v, label: `portal ${v.label}`, body: v.r, range: v.r + map.ship_radius}));
    const beacons = map.beacons.map((v, i) => ({...v, label: `beacon ${i + 1}`, body: 0, range: map_rules.scan}));
    const things = [station, ...gates, ...portals, ...beacons];
    const fail = map_rules_fail(out);
    function edge(v) {
        return Math.min(v.x, v.y, map.world.w - v.x, map.world.h - v.y);
    }
    for (let i = 0, end = things.length; i < end; ++i) {
        for (let j = i + 1; j < end; ++j) {
            const a = things[i];
            const b = things[j];
            const need = a.range + b.range + map_rules.margin;
            fail('ranges', `${a.label} and ${b.label} ranges touch`, map_rules_distance(a, b), need, a, b);
        }
    }
    for (const gate of gates) {
        fail('gates', `${gate.label} too near the station`, map_rules_distance(gate, station), side*map_rules.gate_out, gate, station);
        const bearing = Math.atan2(gate.y - station.y, gate.x - station.x);
        const off = Math.abs(Math.atan2(Math.sin(bearing - gate.bearing), Math.cos(bearing - gate.bearing)))*180/Math.PI;
        if (off > map_rules.gate_bearing) {
            map_rules_push(out, 'gates', `${gate.label} faces ${Math.round(off)}° off its world on the galaxy chart, need ${map_rules.gate_bearing}° at most`, [gate, station]);
        }
        fail('gates', `${gate.label} too near the map's edge`, edge(gate), map_rules.gate_edge, gate);
        for (const v of beacons) {
            fail('beacons', `${v.label} near the ${gate.label}`, map_rules_distance(gate, v), map_rules.beacon_apart, gate, v);
        }
        const company = portals.filter(v => map_rules_distance(gate, v) < map_rules.gate_company);
        if (company.length > 1) {
            map_rules_push(out, 'gates', `${gate.label} has ${company.length} portals within ${map_rules.gate_company} m (${company.map(v => v.label).join(', ')}), one at most`, [gate, ...company]);
        }
    }
    const span = Math.max(map_rules.portal_span, side/4);
    for (let i = 0, end = portals.length; i < end; ++i) {
        const v = portals[i];
        fail('portals', `${v.label} too near the station`, map_rules_distance(v, station), map_rules.portal_out, v, station);
        fail('portals', `${v.label} too near the map's edge`, edge(v), map_rules.portal_edge, v);
        for (let j = i + 1; j < end; ++j) {
            const vv = portals[j];
            if (j === v.destination) {
                fail('portals', `${v.label} and ${vv.label} are a pair too short to save a flight`, map_rules_distance(v, vv), span, v, vv);
            }
            else {
                fail('portals', `${v.label} and ${vv.label} too near each other`, map_rules_distance(v, vv), map_rules.portal_apart, v, vv);
            }
        }
    }
    if (!map.arcade) {
        for (const v of [...gates, ...portals]) {
            fail('zone', `combat zone on the ${v.label}`, map_rules_distance(v, map.combat_zone), map_rules.zone_apart, v, map.combat_zone);
        }
        const need = map.station_size/2 + 400 + map_rules.zone_apart;
        fail('zone', 'combat zone near the station', map_rules_distance(station, map.combat_zone), need, station, map.combat_zone);
    }
    out.push(...map_rules_pylons(map, things));
    // a cliff's rubble (arcade Dustfall) is a solid of the map once the cliff falls: it keeps the same room
    const rubble = map.cliffs.flatMap(v => v.rubble.map(vv => ({...vv, kind: 'cliff rubble'})));
    const solids = [...map.ore.map(v => ({...v, kind: v.cliff ? 'cliff' : 'rock'})), ...rubble, ...map.debris];
    // a drifting piece passes by and glances off a spire (spire_deflect): only what stands still is checked round one
    out.push(...map_rules_spires(map, things, solids.filter(v => !map.debris.includes(v))));
    if (!map.arcade) {
        out.push(...map_rules_races(map, things, solids));
    }
    for (const thing of things) {
        for (const v of map.holes) {
            const need = v.radius + thing.range;
            fail('pulls', `gravity well at ${v.x},${v.y} pulls inside the range of the ${thing.label}`, map_rules_distance(v, thing), need, v, thing);
        }
        // a solid leaves a ship's width of room round the body
        for (const v of solids) {
            const need = thing.body + v.r + map.ship_radius*2;
            fail('solids', `${v.kind} at ${v.x},${v.y} on the ${thing.label}`, map_rules_distance(v, thing), need, v, thing);
        }
    }
    return out;
}

// A problem of a rule, with the places of the things it is between
function map_rules_push(out, rule, text, things)
{
    out.push({rule: map_rule_names[rule], text, at: things.map(v => ({x: Math.round(v.x), y: Math.round(v.y)}))});
}

// The check of one distance: a problem when d is short of need, to the metre the page rounds positions to
function map_rules_fail(out)
{
    return function (rule, text, d, need, ...things) {
        if (d < need - 1) {
            map_rules_push(out, rule, `${text}: ${Math.round(d)} m, need ${Math.round(need)} m`, things);
        }
    };
}

// The race courses of a world (docs/placement.md, Race courses): every ring and the start line out of the station's
// shelter and 150 m beyond every range, a ship's width clear of every solid, out of every pull; rings apart; legs
// clear of pulls, portals and the station; a turn at every ring but the last
function map_rules_races(map, things, solids)
{
    const out = [];
    const fail = map_rules_fail(out);
    const shelter = map.station_size/2 + 400;
    for (let k = 0; k < map.races.length; ++k) {
        const course = map.races[k];
        const name = `race course ${k + 1}`;
        if (!course) {
            map_rules_push(out, 'races', `${name}: no course fits`, []);
            continue;
        }
        const rings = course.rings.map((v, i) => ({...v, r: course.r, label: `${name} ring ${i + 1}`}));
        const spots = [{...course.start, r: course.start_r, label: `${name} start line`}, ...rings];
        if ((rings.length < map_rules.race_rings[0]) || (rings.length > map_rules.race_rings[1])) {
            map_rules_push(out, 'races', `${name}: ${rings.length} rings, need ${map_rules.race_rings.join(' to ')}`, []);
        }
        for (const spot of spots) {
            fail('races', `${spot.label} in the station's shelter`, map_rules_distance(spot, map.station), shelter + spot.r + map_rules.margin, spot, map.station);
            for (const thing of things.slice(1)) {
                fail('races', `${spot.label} and ${thing.label} ranges touch`, map_rules_distance(spot, thing), thing.range + spot.r + map_rules.margin, spot, thing);
            }
            for (const v of map.holes) {
                fail('races', `${spot.label} in the pull at ${v.x},${v.y}`, map_rules_distance(spot, v), v.reach + spot.r, spot, v);
            }
            for (const v of map.pylons) {
                fail('races', `${spot.label} in the reach of the arc pylon at ${v.x},${v.y}`, map_rules_distance(spot, v), v.reach + spot.r + map_rules.margin, spot, v);
            }
            for (const v of map.spires) {
                fail('races', `${spot.label} in the field of the magnetic spire at ${v.x},${v.y}`, map_rules_distance(spot, v), v.reach + spot.r + map_rules.margin, spot, v);
            }
            for (const v of solids) {
                fail('races', `${v.kind} at ${v.x},${v.y} in the ${spot.label}`, map_rules_distance(spot, v), v.r + spot.r + map.ship_radius*2, spot, v);
            }
        }
        for (let i = 0; i < spots.length; ++i) {
            for (let j = i + 1; j < spots.length; ++j) {
                fail('races', `${spots[i].label} and ${spots[j].label} overlap`, map_rules_distance(spots[i], spots[j]), spots[i].r + spots[j].r + map_rules.margin, spots[i], spots[j]);
            }
        }
        for (let i = 1; i < spots.length; ++i) {
            const a = spots[i - 1];
            const b = spots[i];
            for (const v of map.holes) {
                fail('races', `${name} leg ${i} crosses the pull at ${v.x},${v.y}`, map_rules_segment(v, a, b), v.reach, a, b, v);
            }
            for (const v of map.portals) {
                fail('races', `${name} leg ${i} crosses portal ${v.label}`, map_rules_segment(v, a, b), v.r + map.ship_radius, a, b, v);
            }
            for (const v of map.spires) {
                fail('races', `${name} leg ${i} crosses the field of the magnetic spire at ${v.x},${v.y}`, map_rules_segment(v, a, b), v.reach, a, b, v);
            }
            fail('races', `${name} leg ${i} crosses the station`, map_rules_segment(map.station, a, b), map.station_size/2 + 100, a, b, map.station);
        }
        for (let i = 1; i < spots.length - 1; ++i) {
            const a = Math.atan2(spots[i].y - spots[i - 1].y, spots[i].x - spots[i - 1].x);
            const b = Math.atan2(spots[i + 1].y - spots[i].y, spots[i + 1].x - spots[i].x);
            const turn = Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)))*180/Math.PI;
            if ((i > 1) && (turn < map_rules.race_turn)) {
                map_rules_push(out, 'races', `${name} turns ${Math.round(turn)}° at ring ${i}, need ${map_rules.race_turn}°`, [spots[i]]);
            }
        }
    }
    return out;
}

// Ion Reach's arc pylons and charge fields (js/ion_pylons.js): there, and each one's reach (a pylon strikes inside it,
// a field fills the pulse) out of the station's shelter, 150 m beyond every range where a key acts, out of every pull
// and every storm; two pylons' rings map_rules.pylon_apart apart
function map_rules_pylons(map, things)
{
    const out = [];
    const fail = map_rules_fail(out);
    // an arcade Scroll lane has no world tricks yet (src/js/arcade_base.js)
    if ((map.world_name === 'Ion Reach') && !map.lane) {
        if (map.pylons.length < map_rules.pylons_least) {
            map_rules_push(out, 'pylons', `${map.pylons.length} arc pylons, need ${map_rules.pylons_least}`, []);
        }
        if (map.charge_fields.length < map_rules.fields_least) {
            map_rules_push(out, 'pylons', `${map.charge_fields.length} charge fields, need ${map_rules.fields_least}`, []);
        }
    }
    const shelter = map.station_size/2 + 400;
    const pylons = map.pylons.map((v, i) => ({...v, label: `arc pylon ${i + 1}`, range: v.reach}));
    const fields = map.charge_fields.map((v, i) => ({...v, label: `charge field ${i + 1}`, range: v.r}));
    for (const v of [...pylons, ...fields]) {
        fail('pylons', `${v.label} in the station's shelter`, map_rules_distance(v, map.station), shelter + v.range + map_rules.margin, v, map.station);
        for (const thing of things.slice(1)) {
            fail('pylons', `${v.label} and ${thing.label} ranges touch`, map_rules_distance(v, thing), thing.range + v.range + map_rules.margin, v, thing);
        }
        for (const hole of map.holes) {
            fail('pylons', `${v.label} in the pull at ${hole.x},${hole.y}`, map_rules_distance(v, hole), hole.reach + v.range, v, hole);
        }
        for (const storm of map.storms) {
            fail('pylons', `${v.label} in the storm at ${storm.x},${storm.y}`, map_rules_distance(v, storm), storm.r + v.range, v, storm);
        }
    }
    for (let i = 0; i < pylons.length; ++i) {
        for (let j = i + 1; j < pylons.length; ++j) {
            fail('pylons', `${pylons[i].label} and ${pylons[j].label} rings too near`, map_rules_distance(pylons[i], pylons[j]), pylons[i].range + pylons[j].range + map_rules.pylon_apart, pylons[i], pylons[j]);
        }
    }
    return out;
}

// Obsidian's magnetic spires (js/obsidian_spires.js): there, and each one's field (it pulls ships and bends shots) out
// of the station's shelter, 150 m beyond every range where a key acts, out of every pull and every storm; two fields
// map_rules.spire_apart apart; the spire itself is solid, so every rock leaves a ship's width round it
function map_rules_spires(map, things, solids)
{
    const out = [];
    const fail = map_rules_fail(out);
    if ((map.world_name === 'Obsidian') && !map.lane && (map.spires.length < map_rules.spires_least)) {
        map_rules_push(out, 'spires', `${map.spires.length} magnetic spires, need ${map_rules.spires_least}`, []);
    }
    const shelter = map.station_size/2 + 400;
    const spires = map.spires.map((v, i) => ({...v, label: `magnetic spire ${i + 1}`}));
    for (const v of spires) {
        fail('spires', `${v.label} in the station's shelter`, map_rules_distance(v, map.station), shelter + v.reach + map_rules.margin, v, map.station);
        for (const thing of things.slice(1)) {
            fail('spires', `${v.label} and ${thing.label} ranges touch`, map_rules_distance(v, thing), thing.range + v.reach + map_rules.margin, v, thing);
        }
        for (const hole of map.holes) {
            fail('spires', `${v.label} in the pull at ${hole.x},${hole.y}`, map_rules_distance(v, hole), hole.reach + v.reach, v, hole);
        }
        for (const storm of map.storms) {
            fail('spires', `${v.label} in the storm at ${storm.x},${storm.y}`, map_rules_distance(v, storm), storm.r + v.reach, v, storm);
        }
        for (const solid of solids) {
            fail('spires', `${solid.kind} at ${solid.x},${solid.y} on the ${v.label}`, map_rules_distance(v, solid), v.r + solid.r + map.ship_radius*2, v, solid);
        }
    }
    for (let i = 0; i < spires.length; ++i) {
        for (let j = i + 1; j < spires.length; ++j) {
            fail('spires', `${spires[i].label} and ${spires[j].label} fields too near`, map_rules_distance(spires[i], spires[j]), spires[i].reach + spires[j].reach + map_rules.spire_apart, spires[i], spires[j]);
        }
    }
    return out;
}

// The distance from a point to the segment a, b
function map_rules_segment(v, a, b)
{
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = dx*dx + dy*dy;
    const t = l ? Math.max(0, Math.min(1, ((v.x - a.x)*dx + (v.y - a.y)*dy)/l)) : 0;
    return map_rules_distance(v, {x: a.x + dx*t, y: a.y + dy*t});
}

// Math.hypot, as bin/map-check measured before the rules moved here: the same metres, to the last digit
function map_rules_distance(a, b)
{
    return Math.hypot(a.x - b.x, a.y - b.y);
}
