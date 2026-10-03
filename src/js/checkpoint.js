function save_checkpoint()
{
    if (arcade.active || loading_campaign || !player || (player.hp <= 0)) {
        return;
    }
    store_world();
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
        position: {x: player.x, y: player.y, size: {w: world.w, h: world.h}},
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
    };
    try {
        localStorage.setItem('pulse_drift_frontier_v4', JSON.stringify(checkpoint));
        checkpoint_notice = 'Progress saved · ' + worlds[campaign.world].name;
        set_hidden(el.continue_button, false);
        el.continue_button.textContent = 'CONTINUE · ' + worlds[campaign.world].name;
    }
    catch {
        checkpoint_notice = 'Autosave unavailable. Keep this tab open.';
    }
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
            el.continue_button.textContent = 'CONTINUE · ' + worlds[v.campaign.world].name;
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
