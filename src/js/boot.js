// The saves are read once every script has run: a slot is checked against the ship catalog
sync_load_button();
hud_init();
menu_art_sync(0, 'scout');
load_checkpoint();
menu_scene(el.continue_row.classList.contains('hidden') ? 'campaign' : 'continue');
// The next frame is asked for first, so an error in this one is reported without stopping the game
function frame(timestamp)
{
    requestAnimationFrame(frame);
    const time0 = performance.now();
    // a step of the canvas's pixel ratio, if the frames call for one, before anything is drawn (js/resolution.js)
    resolution_frame(time0);
    const interval = timestamp - last_frame;
    const dt = Math.min(0.033, (interval/1000) || 0.016);
    last_frame = timestamp;
    clock += dt;
    zoom_step(dt);
    toasts_update(dt);
    const modal = settings_open || ['paused', 'upgrade', 'inventory', 'navigation'].includes(state);
    const game_dt = arcade.active ? arcade_time_step(dt) : dt;
    if ((state === 'transit') && !settings_open) {
        update_jump(game_dt);
    }
    else if (!modal && (hit_stop > 0)) {
        // a big kill holds the game still for a moment (js/explosions.js)
        hit_stop -= dt;
    }
    else if (!modal) {
        update(game_dt, dt);
    }
    hangar_previews_tick(dt);
    ui_timer += dt;
    if (ui_timer > 0.12) {
        update_hud();
        ui_timer = 0;
    }
    if (!modal || (last_render_state !== state) || performance_render_dirty) {
        render();
        last_render_state = state;
        performance_render_dirty = false;
    }
    const work = performance.now() - time0;
    resolution_frame_end(work);
    play_log_frame(interval, work);
}
requestAnimationFrame(frame);
