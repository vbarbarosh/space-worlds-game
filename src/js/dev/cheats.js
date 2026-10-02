// Cheats wrap the game's own functions; every caller looks them up by name, so the wrapper is what runs.
const dev_base_damage_player = damage_player;
const dev_base_fatal_gravity = fatal_gravity;
let dev_readout_time = 0;

damage_player = function (amount) {
    if (dev_scenario.god) {
        return;
    }
    dev_base_damage_player(amount);
};
fatal_gravity = function (h) {
    if (dev_scenario.god) {
        return;
    }
    dev_base_fatal_gravity(h);
};

function dev_after_frame(now)
{
    if (player && (state !== 'menu')) {
        dev_cheats_apply();
        dev_enemies_after_frame(now);
    }
    if (now - dev_readout_time > 250) {
        dev_readout_time = now;
        dev_panel_refresh_readout();
        dev_enemies_refresh_meter(now);
    }
}

function dev_cheats_apply()
{
    if (dev_scenario.god) {
        player.hp = hull_max();
        player.radiation_dose = 0;
    }
    if (dev_scenario.energy) {
        player.energy = 100;
        player.turbo_fuel = turbo_duration();
        player.dash_cd = 0;
        player.heat = 0;
        player.overheated = false;
    }
    if (!dev_scenario.spawns) {
        spawn_left = 0;
        patrol_timer = 60;
    }
}

function dev_cheats_clear_enemies()
{
    enemies = enemies.filter(v => v.dev_dummy);
    hostile = [];
}
