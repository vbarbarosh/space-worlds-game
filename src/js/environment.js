function current_world_rules()
{
    return world_rules[campaign.world];
}

function generate_environment()
{
    const offsets = [
        [-800, -450],
        [900, 750],
        [-350, 900],
        [650, -750],
        [-1050, 250],
        [0, -1150],
        [700, 950],
        [-700, -650],
    ];
    const diameters = [1300, 1450, 1250, 1400, 1450, 1600, 1800, 1650];
    const v = offsets[campaign.world];
    world_bodies = [
        {
            x: clamp(station.x + v[0], 850, world.w - 850),
            y: clamp(station.y + v[1], 850, world.h - 850),
            diam: diameters[campaign.world],
            texture: campaign.world,
            primary: true,
            name: `${worlds[campaign.world].name} PRIME`,
        },
        {
            x: world.w*((campaign.world % 2) ? 0.22 : 0.77),
            y: world.h*((campaign.world % 3 === 0) ? 0.72 : 0.24),
            diam: 650 + campaign.world*35,
            texture: 2,
            primary: false,
            name: `${worlds[campaign.world].name} OUTER MOON`,
        },
    ];
    world_zones = [];
    environment_time = 0;
    physics_status = '';
    if (campaign.world === 1) {
        recenter_mining_fields();
    }
    if ((campaign.world === 3) || (campaign.world === 6)) {
        const positions = [
            [-1500, -1600],
            [1800, 900],
            [-1600, 1500],
            [2300, -1700],
        ];
        for (let i = 0, end = positions.length; i < end; ++i) {
            const position = positions[i];
            const z = {
                x: clamp(station.x + position[0], 450, world.w - 450),
                y: clamp(station.y + position[1], 450, world.h - 450),
                r: 330 + 40*(i % 2),
                offset: i*3.1,
                type: (campaign.world === 3) ? 'storm' : 'flare',
            };
            if (world_gates.every(v => distance(v, z) > z.r + 200)) {
                world_zones.push(z);
            }
        }
    }
    if (player) {
        player.heat = 0;
        player.overheated = false;
        player.brake_time = 0;
        player.environment_hit_cd = 0;
    }
}

function zone_state(z)
{
    const period = (z.type === 'storm') ? 16 : 20;
    const phase = (environment_time + z.offset) % period;
    return {phase, warning: (phase >= period - 7) && (phase < period - 4), active: phase >= period - 4, remaining: period - phase};
}

function world_flow(v)
{
    if (campaign.world !== 1) {
        return {x: 0, y: 0};
    }
    return {
        x: Math.sin(v.y/1100 + environment_time*0.08)*42 + Math.cos(environment_time*0.04)*18,
        y: Math.cos(v.x/1400 - environment_time*0.06)*32,
    };
}
