function save_checkpoint()
{
    // an arcade run and Feltmere's try-out leave the campaign's save as it was
    if (arcade.active || tryout.active || loading_campaign || !player || (player.hp <= 0)) {
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
        menu_continue_show(campaign);
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
    set_hidden(el.continue_row, true);
}

function load_checkpoint()
{
    try {
        const v = JSON.parse(localStorage.getItem('pulse_drift_frontier_v4'));
        if (valid_checkpoint(v)) {
            checkpoint = v;
            menu_continue_show(v.campaign);
        }
    }
    catch {
    }
}
document.getElementById('retry_sector').addEventListener('click', function () {
    if (!checkpoint) {
        return;
    }
    const towed = (state === 'dead') && !arcade.active;
    // the autosave is up to 15 s old: a flagship keeps the damage dealt it since (boss_hp, src/js/navigation.js)
    if (towed) {
        for (const saved of checkpoint.campaign.contracts) {
            const live = campaign.contracts.find(v => v.id === saved.id);
            if (live && (live.boss_hp > 0) && (live.stage_index === saved.stage_index)) {
                saved.boss_hp = live.boss_hp;
            }
        }
    }
    reset_run(true);
    if (towed) {
        tow_to_station();
    }
});

// A campaign death: a tug brings the wreck to the world's station, docked and repaired. The tow takes a share of the
// salvage, and the cargo aboard is lost; contracts keep their progress. (Resuming at the last autosave could leave the
// ship with a sliver of hull or a burnt-out radiation shield amid raiders, and die again at once, over and over.)
const tow_share = 0.1;

function tow_fee(amount)
{
    return Math.round(amount*tow_share);
}

function tow_to_station()
{
    const fee = tow_fee(salvage);
    salvage -= fee;
    for (const key of Object.keys(campaign.cargo)) {
        campaign.cargo[key] = 0;
    }
    player.x = station.x;
    player.y = station.y + station_size/2 + 100;
    player.vx = player.vy = 0;
    player.radiation_dose = 0;
    update_camera(0, true);
    dock_station();
    dock_message = `Towed in for ◆ ${fee}. Hull repaired; the cargo aboard was lost with the wreck. Contracts keep their progress.`;
    render_station();
    show_toast(`TOWED TO ${worlds[campaign.world].station.toUpperCase()}`, `◆ ${fee} FOR THE TOW · THE CARGO ABOARD IS LOST · CONTRACTS KEPT`, 5);
}
