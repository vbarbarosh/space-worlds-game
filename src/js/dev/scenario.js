// A sandbox run is a checkpoint made up on the spot and resumed: any world, ship, weapon and loadout, already in flight.
const dev_scenario = dev_scenario_from_url();
const dev_view_options = [
    {value: 'wireframe', label: 'Wireframe'},
    {value: 'rendered', label: 'Rendered'},
    {value: 'cockpit', label: 'Cockpit'},
];
const dev_difficulty_options = [
    {value: 'chill', label: 'Chill'},
    {value: 'normal', label: 'Standard'},
    {value: 'overload', label: 'Overload'},
];
const dev_speed_options = [
    {value: 0.1, label: '×0.1'},
    {value: 0.25, label: '×0.25'},
    {value: 1, label: '×1'},
    {value: 2, label: '×2'},
    {value: 4, label: '×4'},
];

dev_time.scale = dev_scenario.speed;

function dev_scenario_from_url()
{
    const params = new URLSearchParams(location.search);
    const world = Number(params.get('world'));
    function flag(name, fallback) {
        return params.has(name) ? (params.get(name) === '1') : fallback;
    }
    return {
        started: params.has('world'),
        world: (Number.isInteger(world) && worlds[world]) ? world : 0,
        ship: ship_catalog.some(v => v.id === params.get('ship')) ? params.get('ship') : 'scout',
        weapon: weapon_catalog.some(v => v.id === params.get('weapon')) ? params.get('weapon') : 'plasma',
        tier: clamp(Number(params.get('tier')) || 1, 1, 5),
        difficulty: ['chill', 'normal', 'overload'].includes(params.get('difficulty')) ? params.get('difficulty') : 'normal',
        view: ['wireframe', 'rendered', 'cockpit'].includes(params.get('view')) ? params.get('view') : view_mode,
        speed: [0.1, 0.25, 1, 2, 4].includes(Number(params.get('speed'))) ? Number(params.get('speed')) : 1,
        tab: params.get('tab') || 'scenario',
        god: flag('god', true),
        energy: flag('energy', false),
        spawns: flag('spawns', false),
    };
}

function dev_scenario_save()
{
    const params = new URLSearchParams();
    if (dev_scenario.started) {
        params.set('world', dev_scenario.world);
    }
    params.set('ship', dev_scenario.ship);
    params.set('weapon', dev_scenario.weapon);
    params.set('tier', dev_scenario.tier);
    params.set('difficulty', dev_scenario.difficulty);
    params.set('view', dev_scenario.view);
    params.set('speed', dev_scenario.speed);
    params.set('tab', dev_scenario.tab);
    params.set('god', dev_scenario.god ? '1' : '0');
    params.set('energy', dev_scenario.energy ? '1' : '0');
    params.set('spawns', dev_scenario.spawns ? '1' : '0');
    history.replaceState(null, '', location.pathname + '?' + params.toString());
}

function dev_scenario_start()
{
    const world = dev_scenario.world;
    const extent = world_extents[world];
    const weapon_levels = {};
    for (const weapon of weapon_catalog) {
        weapon_levels[weapon.id] = (weapon.id === dev_scenario.weapon) ? dev_scenario.tier : 1;
    }
    dev_scenario.started = true;
    difficulty = dev_scenario.difficulty;
    arcade_stop();
    checkpoint = {
        version: 4,
        wave: worlds[world].wave,
        score: 0,
        kills: 0,
        salvage: 99999,
        artifacts_count: 0,
        run_time: 0,
        upgrades: player ? {...upgrades} : initial_upgrades(),
        supplies: player ? {...supplies} : {medkit: 8, emp: 8, stasis: 8},
        difficulty,
        hp: ship_catalog.find(v => v.id === dev_scenario.ship).hull,
        energy: 100,
        position: {x: extent[0]/2, y: extent[1]/2 + 700, size: {w: extent[0], h: extent[1]}},
        campaign: {
            world,
            story: 0,
            contracts: [],
            completed: 0,
            visited: [world],
            cargo: {ore: 0, cells: 0, relics: 0},
            maps: {},
            serial: 0,
            board: 0,
            xp: 99999,
            fleet: {
                ship_id: dev_scenario.ship,
                ships: ship_catalog.map(v => v.id),
                weapon_id: dev_scenario.weapon,
                weapons: weapon_catalog.map(v => v.id),
                weapon_levels,
            },
        },
    };
    reset_run(true);
    dev_view_set(dev_scenario.view);
    dev_scenario_save();
    dev_panel_refresh();
}

function dev_arcade_start()
{
    difficulty = dev_scenario.difficulty;
    arcade_start(dev_scenario.world);
    dev_view_set(dev_scenario.view);
    dev_panel_refresh();
}

function dev_view_set(value)
{
    dev_scenario.view = value;
    for (let i = 0; (i < 3) && (view_mode !== value); ++i) {
        toggle_view();
    }
    dev_scenario_save();
}
