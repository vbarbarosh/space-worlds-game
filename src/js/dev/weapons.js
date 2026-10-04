// Weapons tab: every weapon with its numbers; a click fires it at once, at the chosen tier.
const dev_tier_options = [
    {value: 1, label: 'Tier 1'},
    {value: 2, label: 'Tier 2'},
    {value: 3, label: 'Tier 3'},
    {value: 4, label: 'Tier 4'},
    {value: 5, label: 'Tier 5'},
];

function dev_weapons_fill()
{
    const rows = [];
    for (const weapon of weapon_catalog) {
        const range = Math.round(weapon_range(weapon));
        rows.push({value: weapon.id, cells: [weapon.name, weapon.damage, `${weapon.interval} s`, weapon.speed, range, weapon.rating]});
    }
    const headers = ['Weapon', 'Dmg', 'Every', 'Speed', 'Range', 'Rating'];
    dev_table_fill(document.getElementById('dev_weapons'), headers, rows, dev_scenario.weapon, dev_weapon_set);
}

function dev_weapon_set(id)
{
    dev_scenario.weapon = id;
    dev_scenario_save();
    if (dev_run_active()) {
        const fleet = ensure_career();
        if (!fleet.weapons.includes(id)) {
            fleet.weapons.push(id);
        }
        fleet.weapon_id = id;
        fleet.weapon_levels[id] = dev_scenario.tier;
        update_hud();
    }
    dev_panel_refresh();
}

function dev_weapon_tier_set(tier)
{
    dev_scenario.tier = tier;
    dev_scenario_save();
    if (dev_run_active()) {
        ensure_career().weapon_levels[dev_scenario.weapon] = tier;
        update_hud();
    }
    dev_panel_refresh();
}
