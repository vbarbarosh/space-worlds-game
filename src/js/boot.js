load_checkpoint();
function frame(timestamp)
{
    const dt = Math.min(0.033, ((timestamp - last_frame)/1000) || 0.016);
    last_frame = timestamp;
    clock += dt;
    const modal = settings_open || ['paused', 'upgrade', 'inventory', 'navigation'].includes(state);
    const game_dt = arcade.active ? arcade_time_step(dt) : dt;
    if ((state === 'transit') && !settings_open) {
        update_jump(game_dt);
    }
    else if (!modal) {
        update(game_dt);
    }
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
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
