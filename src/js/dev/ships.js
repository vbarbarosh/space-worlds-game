// Ships tab: every class with its stats; a click flies it at once.
function dev_ships_fill()
{
    const rows = [];
    for (const ship of ship_catalog) {
        rows.push({value: ship.id, cells: [ship.name, ship.hull, ship.shield, ship.speed, ship.handling, ship.cargo, ship.damage]});
    }
    const headers = ['Ship', 'Hull', 'Shield', 'Speed', 'Turn', 'Cargo', 'Dmg'];
    dev_table_fill(document.getElementById('dev_ships'), headers, rows, dev_scenario.ship, dev_ship_set);
}

function dev_ship_set(id)
{
    dev_scenario.ship = id;
    dev_scenario_save();
    if (dev_run_active()) {
        const fleet = ensure_career();
        if (!fleet.ships.includes(id)) {
            fleet.ships.push(id);
        }
        fleet.ship_id = id;
        player.r = current_ship().radius;
        player.hp = hull_max();
        player.shield = shield_max();
        player.turbo_fuel = turbo_duration();
        update_hud();
    }
    dev_panel_refresh();
}
