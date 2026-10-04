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
    const dt = Math.min(0.033, ((timestamp - last_frame)/1000) || 0.016);
    last_frame = timestamp;
    clock += dt;
    zoom_step(dt);
    toasts_update(dt);
    const modal = settings_open || ['paused', 'upgrade', 'inventory', 'navigation'].includes(state);
    const game_dt = arcade.active ? arcade_time_step(dt) : dt;
    if ((state === 'transit') && !settings_open) {
        update_jump(game_dt);
    }
    else if (!modal) {
        update(game_dt);
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
}
requestAnimationFrame(frame);
