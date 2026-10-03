function save_best()
{
    const previous = best;
    best = Math.max(best, score);
    try {
        localStorage.setItem('pulse_drift_best', String(best));
    }
    catch {
    }
    el.best_intro.textContent = `BEST ${String(best).padStart(6, '0')}`;
    return score > previous;
}

function base_finish(won)
{
    state = won ? 'won' : 'dead';
    const record = save_best();
    if (won) {
        clear_checkpoint();
    }
    else if (checkpoint) {
        set_hidden(el.continue_button, false);
        el.continue_button.textContent = `CONTINUE · SECTOR ${String(checkpoint.wave).padStart(2, '0')}`;
    }
    set_hidden(document.getElementById('retry_sector'), won || !checkpoint);
    set_hidden(el.result_overlay, false);
    set_hidden(el.loadout, true);
    set_hidden(el.inventory_button, true);
    set_hidden(el.mission, true);
    set_hidden(el.pause_button, true);
    set_hidden(el.touch_buttons, true);
    set_hidden(el.bossbar, true);
    el.toast.classList.remove('show');
    el.result_eyebrow.textContent = won ? 'SINGULARITY COLLAPSED' : 'SIGNAL LOST';
    el.result_title.textContent = won ? 'You broke the storm.' : 'One more drift?';
    el.result_description.textContent = won
        ? `Fifteen sectors. Three guardians. ${format_time(run_time)} in the storm. Your expedition is complete.`
        : `Sector ${String(wave).padStart(2, '0')} reached. Retry this sector with your saved loadout, or begin a new expedition.`;
    el.result_score.textContent = score.toLocaleString();
    el.result_sector.textContent = String(wave).padStart(2, '0');
    el.result_best.textContent =
        `${record ? 'NEW PERSONAL BEST · ' : 'PERSONAL BEST · '}${best.toLocaleString()}  /  ${kills} ELIMINATIONS · ${artifacts_count} ARTIFACTS · ${format_time(run_time)}`;
    document.getElementById('restart_button').focus();
    update_hud();
}

// Back to the main menu from the results or the pause panel; an arcade run ends here, a campaign was saved before.
function menu_open()
{
    arcade_stop();
    stop_turbo();
    keys.clear();
    state = 'menu';
    document.body.classList.remove('in-game');
    for (const v of [el.result_overlay, el.pause_overlay, el.inventory_overlay]) {
        set_hidden(v, true);
    }
    set_hidden(el.intro, false);
    for (const v of [el.hud, el.bottom_hud, el.bossbar, el.touch_buttons, el.pause_button, el.mission, el.loadout, el.inventory_button]) {
        set_hidden(v, true);
    }
    sync_minimap_button();
    document.getElementById('arcade_button').focus();
}

function toggle_pause()
{
    if (state === 'playing') {
        state = 'paused';
        stop_turbo();
        touch_boost_hold = false;
        keys.clear();
        joystick.active = false;
        mouse_drive.active = false;
        mouse_drive.following = false;
        set_hidden(el.pause_overlay, false);
        document.getElementById('pause_checkpoint').textContent = checkpoint_notice;
        el.pause_button.textContent = '▶';
        document.getElementById('resume_button').focus();
    }
    else if (state === 'paused') {
        state = 'playing';
        set_hidden(el.pause_overlay, true);
        el.pause_button.textContent = 'Ⅱ';
    }
}
el.pause_button.addEventListener('click', toggle_pause);
document.getElementById('resume_button').addEventListener('click', toggle_pause);
document.getElementById('start_button').addEventListener('click', function () {
    el.pause_button.textContent = 'Ⅱ';
    arcade_stop();
    reset_run();
});
document.getElementById('arcade_button').addEventListener('click', function () {
    el.pause_button.textContent = 'Ⅱ';
    arcade_start();
});
for (const id of ['restart_button', 'restart_pause']) {
    document.getElementById(id).addEventListener('click', function () {
        el.pause_button.textContent = 'Ⅱ';
        if (arcade.active) {
            arcade_start();
        }
        else {
            reset_run();
        }
    });
}
document.getElementById('menu_button').addEventListener('click', menu_open);
document.getElementById('pause_menu_button').addEventListener('click', function () {
    save_checkpoint();
    menu_open();
});
addEventListener('keydown', function (event) {
    if (settings_open) {
        if ((event.code === 'Escape') && !event.repeat) {
            event.preventDefault();
            toggle_audio_settings();
        }
        else if ((event.code === 'KeyM') && !event.repeat) {
            toggle_sound();
        }
        else if (event.code === 'Tab') {
            const items = Array.from(document.getElementById('audio_overlay').querySelectorAll('button,input')).filter(v => !v.disabled);
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && (document.activeElement === first)) {
                event.preventDefault();
                last.focus();
            }
            else if (!event.shiftKey && (document.activeElement === last)) {
                event.preventDefault();
                first.focus();
            }
        }
        return;
    }
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code) && !['BUTTON', 'INPUT'].includes(document.activeElement.tagName)) {
        event.preventDefault();
    }
    keys.add(event.code);
    if (event.repeat) {
        return;
    }
    if (event.code === 'KeyR') {
        interact();
    }
    if (event.code === 'KeyJ') {
        toggle_navigation();
    }
    if (event.code === 'KeyM') {
        toggle_sound();
    }
    if ((event.code === 'KeyI') || (event.code === 'Tab')) {
        if (['playing', 'paused', 'inventory'].includes(state)) {
            event.preventDefault();
            toggle_inventory();
        }
    }
    if (event.code === 'KeyQ') {
        use_supply('medkit');
    }
    if (event.code === 'KeyE') {
        use_supply('emp');
    }
    if (event.code === 'KeyF') {
        use_supply('stasis');
    }
    if (event.code === 'KeyG') {
        formation_toggle();
    }
    if (event.code === 'KeyH') {
        drones_toggle();
    }
    if ((event.code === 'KeyP') || (event.code === 'Escape')) {
        if (state === 'navigation') {
            toggle_navigation();
        }
        else if (state === 'inventory') {
            toggle_inventory();
        }
        else {
            toggle_pause();
        }
    }
    if (((event.code === 'ShiftLeft') || (event.code === 'ShiftRight')) && !mouse_drive.arriving) {
        dash();
    }
    if ((event.code === 'Space') && (state === 'playing')) {
        event.preventDefault();
        pulse();
    }
    if ((event.code === 'Enter') && (state === 'menu') && (document.activeElement.tagName !== 'BUTTON')) {
        reset_run();
    }
});
addEventListener('keyup', function (event) {
    keys.delete(event.code);
    if (['ShiftLeft', 'ShiftRight'].includes(event.code) && !keys.has('ShiftLeft') && !keys.has('ShiftRight') && !touch_boost_hold) {
        stop_turbo();
    }
});
addEventListener('blur', function () {
    stop_turbo();
    touch_boost_hold = false;
    keys.clear();
    if (pause_on_blur && (state === 'playing')) {
        toggle_pause();
    }
});
document.addEventListener('visibilitychange', function () {
    if (pause_on_blur && document.hidden && (state === 'playing')) {
        toggle_pause();
    }
});
