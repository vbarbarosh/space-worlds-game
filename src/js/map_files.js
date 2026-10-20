// Map files (src/maps/README.md): a world's map as the author edited it in the dev page's map editor
// (dev/map_editor.js), packed into the page by bin/build as map_files, by its name: haven-campaign, ion-reach-lane. A
// file holds only the kinds it overrides, each a whole list; a kind it leaves out is generated as before, and with no
// file the map is the generated one, unchanged. Each kind is put where the generator would have made it, so what is
// made after it is made round the edited map: the gates, beacons, portals, planets, storms, pylons and spires round an
// edited station; the pylons and spires clear of edited storms, fields and holes; the drifting debris round edited
// fields; the race courses from the map as it stands.

// The kinds a map file may hold besides its size and station, each where the game has it (bin/build checks the
// same): holes in the campaign and arcade Eclipse, storms in Ion Reach and Nova Forge (flares there), pylons and
// charge fields in Ion Reach, spires in Obsidian, cliffs in arcade Dustfall; the Base kind and the Races mode have no
// world tricks
const map_kinds = ['fields', 'caches', 'holes', 'storms', 'pylons', 'charge_fields', 'spires', 'cliffs'];

// The layout of the map being made: the campaign's (the Races mode's too), arcade Free's, or a Scroll or Base run's
// lane, which the two kinds share
function map_layout()
{
    if (!arcade.active) {
        return 'campaign';
    }
    return arcade_lane_kind() ? 'lane' : 'free';
}

// The name of a world's map file in a layout, as bin/build packs it
function map_file_name(id = campaign.world, layout = map_layout())
{
    return `${world_slug(id)}-${layout}`;
}

// The map file of the map being made, or null; the dev page puts the map editor's edit in its place
function map_file_current()
{
    return map_files[map_file_name()] || null;
}

// What tells one map file from another: a save keeps it with the rocks and caches it stored (store_world), so a save
// made on another map, or on the generated one, does not bring them back over an edited map; null with no file
function map_file_stamp()
{
    const file = map_file_current();
    if (!file) {
        return null;
    }
    // FNV-1a of the file's JSON
    const text = JSON.stringify(file);
    let hash = 2166136261;
    for (let i = 0, end = text.length; i < end; ++i) {
        hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
    }
    return hash.toString(16);
}

// Whether the world being made has a kind at all (map_kinds)
function map_kind_here(kind)
{
    const tricks = !race_mode.active && !(arcade.active && arcade_base_kind());
    switch (kind) {
    case 'holes':
        return !arcade.active || ((campaign.world === 7) && !arcade_base_kind());
    case 'storms':
        return [3, 6].includes(campaign.world) && !(arcade.active && arcade_base_kind());
    case 'pylons':
    case 'charge_fields':
        return (campaign.world === pylon_world) && tricks;
    case 'spires':
        return (campaign.world === spire_world) && tricks;
    case 'cliffs':
        return arcade.active && (campaign.world === cliff_world) && !arcade_base_kind();
    default:
        return true;
    }
}

// The map file's list of a kind, its places scaled to the world's size when the file was made for another (as a
// save's map is: store_world); null when the file leaves the kind out, or the world has none
function map_file_list(kind)
{
    const file = map_file_current();
    if (!file || !Array.isArray(file[kind]) || !map_kind_here(kind)) {
        return null;
    }
    return map_file_scaled(file[kind], world.w/file.size.w, world.h/file.size.h);
}

// A copy of v with every x and y in it scaled by sx and sy
function map_file_scaled(v, sx, sy)
{
    if (Array.isArray(v)) {
        return v.map(vv => map_file_scaled(vv, sx, sy));
    }
    if (!v || (typeof v !== 'object')) {
        return v;
    }
    const out = {};
    for (const [key, value] of Object.entries(v)) {
        out[key] = (key === 'x') ? value*sx : (key === 'y') ? value*sy : map_file_scaled(value, sx, sy);
    }
    return out;
}

// Where the map file puts the station, or null (visual_base_generate_map, before anything is placed round it)
function map_file_station()
{
    const file = map_file_current();
    if (!file?.station) {
        return null;
    }
    return {x: file.station.x*world.w/file.size.w, y: file.station.y*world.h/file.size.h};
}

// The map file's black holes, rock fields with their rocks and caches, in place of the generated ones
// (visual_base_generate_map, before the storms, pylons and spires are placed clear of them); `restored`: a save of
// this map brought its rocks and caches back, and they stay as it left them
function map_file_bodies(restored)
{
    const holes = map_file_list('holes');
    const fields = map_file_list('fields');
    const caches = map_file_list('caches');
    if (holes) {
        const strength = 920 + wave*12;
        black_holes = holes.map((v, i) => ({x: v.x, y: v.y, radius: v.radius, core: v.core, strength, phase: i*0.8}));
        // generated rocks keep clear of a hole as place_gravity_wells has them
        if (!fields && !restored) {
            ore_nodes = ore_nodes.filter(v => black_holes.every(vv => distance(vv, v) > vv.radius + v.r + 180));
        }
    }
    if (fields) {
        mining_fields = fields.map((v, i) => ({x: v.x, y: v.y, r: 260, id: i}));
        if (!restored) {
            const random = visual_random_from_seed(7243 + campaign.world*131);
            ore_nodes = [];
            for (const [i, v] of fields.entries()) {
                for (const rock of v.rocks) {
                    const hp = 30 + rock.r + wave*3;
                    const angle = random()*6.28;
                    const node = {...rock, hp, max_hp: hp, type: 'ore', field: i, angle, flash: 0};
                    ore_nodes.push(ore_resource_assign(ore_node_new(node), i));
                }
            }
        }
        recenter_mining_fields();
    }
    if (caches && !restored) {
        pickups = pickups.filter(v => !v.cache);
        const random = visual_random_from_seed(5309 + campaign.world*577);
        // as base_generate_map lays one: salvage round its middle (none on a Base run) and a supply beside it
        const pieces = (arcade.active && arcade_base_kind()) ? 0 : 5;
        for (let i = 0, end = caches.length; i < end; ++i) {
            const v = caches[i];
            for (let j = 0; j < pieces; ++j) {
                const x = v.x + (random() - 0.5)*90;
                const y = v.y + (random() - 0.5)*90;
                const value = 3 + Math.floor(wave/5);
                pickups.push({x, y, type: 'artifact', value, life: 1e9, phase: random()*6.28, cache: true});
            }
            const type = (i % 3 === 0) ? 'medkit' : (i % 3 === 1) ? 'energy' : 'health';
            pickups.push({x: v.x + 35, y: v.y - 20, type, value: 0, life: 1e9, phase: random()*6.28, cache: true});
        }
    }
}

// The map file's storms (flares in Nova Forge), or null (generate_environment)
function map_file_storms()
{
    const list = map_file_list('storms');
    const type = (campaign.world === 3) ? 'storm' : 'flare';
    return list && list.map((v, i) => ({x: v.x, y: v.y, r: v.r, offset: i*3.1, type}));
}

// The map file's arc pylons and charge fields in place of the generated ones, the two kinds together: whether it has
// them (pylons_generate). A field within a pylon's ring is the one beside it, as the generator lays them.
function map_file_pylons()
{
    const list = map_file_list('pylons');
    const fields = map_file_list('charge_fields');
    if (!list && !fields) {
        return false;
    }
    pylons = (list || []).map(v => ({x: v.x, y: v.y, phase: 'calm', t: 0, bolt: null, strikes: 0, field: null}));
    charge_fields = (fields || []).map(function (v) {
        const pylon = pylons.find(vv => !vv.field && (distance(v, vv) < pylon_reach)) || null;
        const out = {x: v.x, y: v.y, r: charge_field_r, pylon};
        if (pylon) {
            pylon.field = out;
        }
        return out;
    });
    return true;
}

// The map file's magnetic spires in place of the generated ones: whether it has them (spires_generate)
function map_file_spires()
{
    const list = map_file_list('spires');
    if (!list) {
        return false;
    }
    const random = visual_random_from_seed(4421);
    spires = list.map(v => ({x: v.x, y: v.y, r: spire_r, angle: random()*Math.PI*2, flash: 0, drawn: 0}));
    return true;
}

// The map file's cliffs (arcade Dustfall), each with its hull and the rubble its fall leaves, or null (cliffs_generate)
function map_file_cliffs(hp)
{
    const list = map_file_list('cliffs');
    if (!list) {
        return null;
    }
    const random = visual_random_from_seed(6151);
    return list.map(function (v) {
        const ux = Math.cos(v.fall);
        const uy = Math.sin(v.fall);
        const rock = ore_node_new({x: v.x, y: v.y, r: v.r, hp, max_hp: hp, type: 'cliff', field: -1, angle: v.fall,
            flash: 0});
        const rubble = v.rubble.map(vv => ({x: vv.x, y: vv.y, r: vv.r, along: (vv.x - v.x)*ux + (vv.y - v.y)*uy}));
        const shape = Array.from({length: 11}, () => 0.95 + random()*0.1);
        return {rock, fall: v.fall, rumble: 0, front: null, marks: 0, landed: 0, hit: [], crushed: 0, shape, rubble};
    });
}
