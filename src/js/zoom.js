// The controls show the level the zoom is heading to
function sync_zoom_controls(level = zoom_target ?? zoom)
{
    document.getElementById('zoom_reset').textContent = `${Math.round(level*100)}%`;
    document.getElementById('zoom_out').disabled = level <= 0.5;
    document.getElementById('zoom_in').disabled = level >= 2;
}

// The zoom eases to the level asked for over about a fifth of a second (zoom_step, every frame); instant: at once, for
// a scene set up in code
let zoom_target = null;

function set_zoom(value, instant = false)
{
    value = Number(value);
    if (!Number.isFinite(value)) {
        return;
    }
    const next = clamp(Math.round(value*100)/100, 0.5, 2);
    zoom_target = instant ? null : next;
    try {
        localStorage.setItem('pulse_drift_zoom', String(next));
    }
    catch {
    }
    if (instant) {
        zoom_apply(next);
    }
    sync_zoom_controls(next);
}

function zoom_step(dt)
{
    if (zoom_target === null) {
        return;
    }
    const next = (Math.abs(zoom_target - zoom) < 0.002) ? zoom_target : zoom + (zoom_target - zoom)*(1 - Math.exp(-dt*14));
    if (next === zoom_target) {
        zoom_target = null;
    }
    zoom_apply(next);
}

// The camera keeps the ship where it was on screen while the zoom changes
function zoom_apply(next)
{
    zoom = next;
    update_camera(0, true);
    if (view_mode === 'cockpit') {
        const point = cabin_point_from_screen({x: pointer.screen_x, y: pointer.screen_y});
        pointer.x = point.x;
        pointer.y = point.y;
    }
    else {
        pointer.x = pointer.screen_x/zoom + camera.x;
        pointer.y = pointer.screen_y/zoom + camera.y;
    }
    performance_render_dirty = true;
}

function step_zoom(direction)
{
    const steps = [0.5, 0.65, 0.8, 1, 1.25, 1.5, 2];
    // from the level the zoom is heading to, so quick presses add up
    const from = zoom_target ?? zoom;
    let next = from;
    if (direction > 0) {
        next = steps.find(v => v > from + 0.001) || 2;
    }
    else {
        next =
            steps
                .slice()
                .reverse()
                .find(v => v < from - 0.001) || 0.5;
    }
    set_zoom(next);
}
document.getElementById('zoom_out').addEventListener('click', function () {
    step_zoom(-1);
});
document.getElementById('zoom_in').addEventListener('click', function () {
    step_zoom(1);
});
document.getElementById('zoom_reset').addEventListener('click', function () {
    set_zoom(1);
});
canvas.addEventListener('wheel', on_wheel, {passive: false});
addEventListener('keydown', function (event) {
    if (
        settings_open ||
        !['playing', 'paused', 'upgrade', 'inventory', 'navigation'].includes(state) ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
    ) {
        return;
    }
    if (['Equal', 'NumpadAdd', 'Minus', 'NumpadSubtract', 'Digit0', 'Numpad0'].includes(event.code)) {
        event.preventDefault();
        if (['Digit0', 'Numpad0'].includes(event.code)) {
            set_zoom(1);
        }
        else {
            step_zoom(['Equal', 'NumpadAdd'].includes(event.code) ? 1 : -1);
        }
        if ((state === 'navigation') && (nav_tab === 'local')) {
            render_navigation();
        }
    }
});
sync_zoom_controls();

function on_wheel(event)
{
    if (settings_open || !['playing', 'paused'].includes(state) || !event.deltaY) {
        return;
    }
    event.preventDefault();
    set_zoom((zoom_target ?? zoom)*Math.exp(clamp(-event.deltaY*0.0015, -0.18, 0.18)));
}
