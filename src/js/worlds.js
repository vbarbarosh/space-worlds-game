const sectors = [
    {name: 'FIRST CONTACT', act: 'OUTER RIM', color: '#152342', duration: 20, count: 14, mix: [1, 0, 0, 0, 0]},
    {name: 'SCATTERED RELICS', act: 'OUTER RIM', color: '#173331', duration: 21, count: 15, mix: [0.75, 0.25, 0, 0, 0]},
    {name: 'CROSS FIRE', act: 'OUTER RIM', color: '#29203c', duration: 22, count: 16, mix: [0.5, 0.2, 0.3, 0, 0]},
    {name: 'SHATTER BELT', act: 'OUTER RIM', color: '#302833', duration: 22, count: 17, mix: [0.4, 0.2, 0.25, 0.15, 0]},
    {name: 'THE WARDEN', act: 'OUTER RIM', color: '#351b33', duration: 21, count: 12, mix: [0.45, 0.25, 0.3, 0, 0], boss: 'THE WARDEN'},
    {name: 'ION GARDENS', act: 'INNER VEIL', color: '#153536', duration: 23, count: 18, mix: [0.3, 0.2, 0.3, 0.2, 0]},
    {name: 'HUNTER NETWORK', act: 'INNER VEIL', color: '#2a2945', duration: 23, count: 19, mix: [0.25, 0.2, 0.2, 0.15, 0.2]},
    {name: 'REACTOR WAKE', act: 'INNER VEIL', color: '#392b20', duration: 24, count: 19, mix: [0.25, 0.2, 0.3, 0.1, 0.15], hazard: true},
    {name: 'GHOST CORRIDOR', act: 'INNER VEIL', color: '#17283e', duration: 24, count: 20, mix: [0.15, 0.25, 0.2, 0.2, 0.2]},
    {name: 'THE ARCHITECT', act: 'INNER VEIL', color: '#352244', duration: 23, count: 14, mix: [0.3, 0.3, 0.25, 0.15, 0], boss: 'THE ARCHITECT'},
    {name: 'GRAVITY SCARS', act: 'EVENT HORIZON', color: '#252146', duration: 25, count: 21, mix: [0.2, 0.2, 0.2, 0.2, 0.2], hazard: true},
    {name: 'RELIC TEMPEST', act: 'EVENT HORIZON', color: '#1b353e', duration: 25, count: 22, mix: [0.15, 0.25, 0.3, 0.15, 0.15]},
    {name: 'RED SHIFT', act: 'EVENT HORIZON', color: '#3b202e', duration: 26, count: 22, mix: [0.1, 0.2, 0.3, 0.2, 0.2], hazard: true},
    {name: 'LAST LIGHT', act: 'EVENT HORIZON', color: '#252c47', duration: 26, count: 23, mix: [0.1, 0.3, 0.25, 0.2, 0.15], hazard: true},
    {
        name: 'THE SINGULARITY',
        act: 'EVENT HORIZON',
        color: '#341432',
        duration: 25,
        count: 16,
        mix: [0.25, 0.2, 0.3, 0.15, 0.1],
        boss: 'THE SINGULARITY',
        hazard: true,
    },
];
const world_defs = [world_haven, world_verdant, world_dustfall, world_ion_reach, world_obsidian, world_cryosphere, world_nova_forge, world_eclipse];
const worlds = world_defs.map(v => v.world);
const commodities = [
    {key: 'ore', name: 'Refined ore'},
    {key: 'cells', name: 'Energy cells'},
    {key: 'relics', name: 'Relic components'},
];
// The story chapters still written here; the ones in src/missions/ take their places by number (js/missions.js)
const story = [
    {title: 'Thorns in the canopy', type: 'hunt', world: 1, target: 10, reward: 290, description: 'Eliminate ten Thorn Swarm ships in Verdant.'},
    {
        title: 'The refinery run',
        type: 'courier',
        world: 2,
        target: 1,
        reward: 300,
        description: 'Deliver a sealed navigation core to Dustfall Refinery. It uses no cargo space.',
    },
    {
        title: 'Cartographers of the storm',
        type: 'survey',
        world: 3,
        target: 3,
        reward: 430,
        description: 'Visit three marked beacons in Ion Reach. Fly within 120 units to scan.',
    },
    {
        title: 'Break the iron blockade',
        type: 'hunt',
        world: 4,
        target: 16,
        reward: 650,
        description: 'Destroy sixteen Iron Dominion ships in Obsidian. Prepare for railguns and thick plating.',
    },
    {
        title: 'Under frozen skies',
        type: 'mining',
        world: 5,
        target: 14,
        reward: 650,
        description: 'Mine fourteen rocks in Cryosphere while Frost Sentinels patrol.',
    },
    {
        title: 'Heart of the forge',
        type: 'boss',
        world: 6,
        target: 1,
        reward: 1000,
        description: 'Find the Ember flagship at the marked combat zone and destroy it.',
    },
    {
        title: 'A light beyond Eclipse',
        type: 'boss',
        world: 7,
        target: 1,
        reward: 1600,
        description: 'Defeat the Void Dreadnought in Eclipse. The frontier stays open after the story ends.',
    },
];
let campaign = {world: 0, story: 0, contracts: [], completed: 0, visited: [0], cargo: {ore: 0, cells: 0, relics: 0}, maps: {}, serial: 0, board: 0};
let station = {x: 0, y: 0};
// The station's length across, in metres: the scale every ship is drawn against (sprite_sizes)
const station_size = 1000;
// R docks within this of the station's centre: a short flight from its berths' tips, the approach does the rest
const station_reach = station_size/2 + 250;
// R jumps within this of a world gate's centre
const gate_reach = 155;
// The sheltered space round the station: no radiation, no gravity storms, no mining, raiders cleared on docking
const station_shelter = station_size/2 + 400;
let world_gates = [];
let beacons = [];
let combat_zone = {x: 0, y: 0};
let nav_tab = 'worlds';
let station_tab = 'jobs';
let loading_campaign = false;
let patrol_timer = 7;
let save_timer = 15;
let jump = null;
let nav_return = 'playing';
let waypoint = null;
let escort = null;
let guide_flying = false;
let guide_path = [];
let guide_path_key = '';
let guide_path_origin = null;
let guide_manual = null;
let local_map_mode = 'nearby';
let local_chart_bounds = null;
const world_looks = world_defs.map(v => v.look);
let world_visual_cache = [];
const world_rules = world_defs.map(v => v.rules);
let world_bodies = [];
let world_zones = [];
let environment_time = 0;
let physics_status = '';
const world_extents = world_defs.map(v => v.extent);
const expedition_conditions = world_defs.map(v => v.expedition);
let drifting_debris = [];
let portal_leg_cache = new Map();
