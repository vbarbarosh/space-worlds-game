// The game's frame loop runs on a virtual clock: paused, stepped one frame, slowed down or sped up. Every loop asking
// for a frame gets it (the game's and the arcade's cleared screen alike), so one never takes the other's place.
const dev_time = {paused: false, scale: 1, steps: 0, virtual: 0, last: 0, callbacks: [], serial: 0, ticks: 0, fps: 0, fps_time: 0};
const dev_request_frame = window.requestAnimationFrame.bind(window);
const dev_frame_ms = 1000/60;
const dev_chunk_ms = 1000/30;

window.requestAnimationFrame = function (callback) {
    dev_time.serial++;
    dev_time.callbacks.push({id: dev_time.serial, callback});
    return dev_time.serial;
};
window.cancelAnimationFrame = function (id) {
    dev_time.callbacks = dev_time.callbacks.filter(v => v.id !== id);
};
dev_request_frame(dev_time_tick);

function dev_time_tick(now)
{
    const real = dev_time.last ? Math.min(100, now - dev_time.last) : dev_frame_ms;
    dev_time.last = now;
    let budget = 0;
    if (dev_time.steps > 0) {
        budget = dev_frame_ms;
        dev_time.steps--;
    }
    else if (!dev_time.paused) {
        budget = real*dev_time.scale;
    }
    let ran = false;
    while (budget > 0.01) {
        const chunk = Math.min(budget, dev_chunk_ms);
        dev_time.virtual += chunk;
        budget -= chunk;
        dev_time_run_frame();
        ran = true;
    }
    if (!ran) {
        render();
    }
    dev_time.ticks++;
    if (now - dev_time.fps_time >= 1000) {
        dev_time.fps = dev_time.ticks;
        dev_time.ticks = 0;
        dev_time.fps_time = now;
    }
    dev_after_frame(now);
    dev_request_frame(dev_time_tick);
}

function dev_time_run_frame()
{
    const callbacks = dev_time.callbacks;
    dev_time.callbacks = [];
    // as the browser does: an error in one loop is reported and the others still run
    for (const v of callbacks) {
        try {
            v.callback(dev_time.virtual);
        }
        catch (error) {
            reportError(error);
        }
    }
}

function dev_time_pause_toggle()
{
    dev_time.paused = !dev_time.paused;
    dev_panel_refresh_time();
}

function dev_time_step()
{
    dev_time.paused = true;
    dev_time.steps++;
    dev_panel_refresh_time();
}

function dev_time_scale_set(scale)
{
    dev_time.scale = scale;
    dev_scenario.speed = scale;
    dev_scenario_save();
    dev_panel_refresh_time();
}
