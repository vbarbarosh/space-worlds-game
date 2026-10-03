// Upgrades tab: module and supply levels applied live, with the stats they change.
const dev_preset_options = [
    {value: 'fresh', label: 'Fresh scout'},
    {value: 'mid', label: 'Mid game'},
    {value: 'max', label: 'All maxed'},
];
const dev_supply_cap = 8;

function dev_upgrades_fill()
{
    const presets = document.getElementById('dev_presets');
    presets.replaceChildren();
    for (const option of dev_preset_options) {
        presets.append(dev_button(option.label, function () {
            dev_upgrades_preset(option.value);
        }));
    }
    const rows = [];
    for (const option of upgrade_options) {
        rows.push({value: option.key, cells: [option.title, `${upgrades[option.key]} / ${option.cap}`, ...dev_step_buttons(option.key, option.cap, upgrades)]});
    }
    for (const option of supply_options) {
        rows.push({value: option.key, cells: [option.title, `${supplies[option.key]} / ${dev_supply_cap}`, ...dev_step_buttons(option.key, dev_supply_cap, supplies)]});
    }
    dev_table_fill(document.getElementById('dev_upgrades'), ['Module', 'Level', '', ''], rows, null, null);
    const stats = [
        ['Attack rating', attack_rating()],
        ['Defense rating', defense_rating()],
        ['Hull', hull_max()],
        ['Shield', shield_max()],
        ['Magnet radius', Math.round(magnetic_radius())],
        ['Cruise speed', Math.round(cruise_speed())],
        ['Turbo seconds', turbo_duration().toFixed(1)],
        ['Turbo cooldown', `${dash_cooldown().toFixed(1)} s`],
        ['Cargo', cargo_capacity()],
        ['Radiation protection', `${Math.round(radiation_protection()*100)}%`],
    ];
    dev_table_fill(document.getElementById('dev_stats'), ['Stat', 'Value'], stats.map(v => ({value: v[0], cells: v})), null, null);
}

function dev_step_buttons(key, cap, levels)
{
    const down = dev_button('−', function () {
        dev_upgrade_set(levels, key, levels[key] - 1, cap);
    });
    const up = dev_button('+', function () {
        dev_upgrade_set(levels, key, levels[key] + 1, cap);
    });
    return [down, up];
}

function dev_upgrade_set(levels, key, level, cap)
{
    levels[key] = clamp(level, 0, cap);
    dev_upgrades_after_change();
}

function dev_upgrades_preset(value)
{
    const fresh = initial_upgrades();
    for (const option of upgrade_options) {
        if (value === 'fresh') {
            upgrades[option.key] = fresh[option.key];
        }
        else if (value === 'mid') {
            upgrades[option.key] = Math.max(fresh[option.key], Math.ceil(option.cap/2));
        }
        else {
            upgrades[option.key] = option.cap;
        }
    }
    dev_upgrades_after_change();
}

function dev_upgrades_after_change()
{
    if (dev_run_active()) {
        player.shield = Math.min(player.shield, shield_max());
        player.turbo_fuel = Math.min(player.turbo_fuel, turbo_duration());
        update_hud();
    }
    dev_upgrades_fill();
}
