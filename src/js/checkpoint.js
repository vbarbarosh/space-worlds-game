function save_checkpoint()
{
    if (arcade.active || loading_campaign || !player || (player.hp <= 0)) {
        return;
    }
    store_world();
    chart_flush();
    checkpoint = {
        version: 4,
        wave,
        score,
        kills,
        salvage,
        artifacts_count,
        run_time,
        upgrades: {...upgrades},
        supplies: {...supplies},
        difficulty,
        hp: player.hp,
        energy: player.energy,
        position: checkpoint_position(),
        physics: {
            heat: player.heat || 0,
            overheated: !!player.overheated,
            time: environment_time,
            dose: player.radiation_dose || 0,
            turbo_cd: player.dash_cd || 0,
            turbo_fuel: turbo_fuel(),
            turbo_remaining: player.dash_time || 0,
            turbo_heading: player.turbo_heading || 0,
        },
        campaign: JSON.parse(JSON.stringify(campaign)),
        // the guide's marker on a place (a goal's mining field, a map click) and your own route
        guide: guide_manual ? {x: guide_manual.x, y: guide_manual.y, label: guide_manual.label, portal: guide_manual.portal} : null,
        route: {points: waypoints.map(v => ({x: v.x, y: v.y, n: v.n})), loop: waypoints_loop},
    };
    // ore your drones are bringing home counts as aboard: they come back with the save, not without it
    const cargo = checkpoint.campaign.cargo;
    for (const drone of drones) {
        for (const load of drone.loads || []) {
            const key = load.resource || 'ore';
            cargo[key] = (cargo[key] || 0) + (load.amount || 1);
        }
    }
    try {
        localStorage.setItem('pulse_drift_frontier_v4', JSON.stringify(checkpoint));
        checkpoint_notice = `Progress saved · ${worlds[campaign.world].name}`;
        set_hidden(el.continue_button, false);
        el.continue_button.textContent = `CONTINUE · ${worlds[campaign.world].name}`;
    }
    catch {
        checkpoint_notice = 'Autosave unavailable. Keep this tab open.';
    }
}

// Where a continue resumes: the ship's place, unless it is in a black hole's pull; then the last safe place saved in
// this world, or beside the station
function checkpoint_position()
{
    const size = {w: world.w, h: world.h};
    if (!in_gravity_pull(player)) {
        return {x: player.x, y: player.y, size};
    }
    if (checkpoint?.position && (checkpoint.campaign?.world === campaign.world)) {
        return checkpoint.position;
    }
    return {x: station.x, y: station.y + 260, size};
}

function clear_checkpoint()
{
    checkpoint = null;
    try {
        localStorage.removeItem('pulse_drift_frontier_v4');
    }
    catch {
    }
    set_hidden(el.continue_button, true);
}

function load_checkpoint()
{
    try {
        const v = JSON.parse(localStorage.getItem('pulse_drift_frontier_v4'));
        if (valid_checkpoint(v)) {
            checkpoint = v;
            set_hidden(el.continue_button, false);
            el.continue_button.textContent = `CONTINUE · ${worlds[v.campaign.world].name}`;
        }
    }
    catch {
    }
}
el.continue_button.addEventListener('click', function () {
    if (checkpoint) {
        reset_run(true);
    }
});
document.getElementById('retry_sector').addEventListener('click', function () {
    if (checkpoint) {
        reset_run(true);
    }
});
