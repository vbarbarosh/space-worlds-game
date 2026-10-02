function sync_zoom_controls()
{
    document.getElementById('zoom_reset').textContent = Math.round(zoom*100) + '%';
    document.getElementById('zoom_out').disabled = zoom <= 0.5;
    document.getElementById('zoom_in').disabled = zoom >= 2;
}

function set_zoom(value)
{
    value = Number(value);
    if (!Number.isFinite(value)) {
        return;
    }
    const next = clamp(Math.round(value*100)/100, 0.5, 2);
    if (next === zoom) {
        sync_zoom_controls();
        return;
    }
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
    try {
        localStorage.setItem('pulse_drift_zoom', String(zoom));
    }
    catch {
    }
    sync_zoom_controls();
    performance_render_dirty = true;
}

function step_zoom(direction)
{
    const steps = [0.5, 0.65, 0.8, 1, 1.25, 1.5, 2];
    let next = zoom;
    if (direction > 0) {
        next = steps.find(v => v > zoom + 0.001) || 2;
    }
    else {
        next =
            steps
                .slice()
                .reverse()
                .find(v => v < zoom - 0.001) || 0.5;
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
canvas.addEventListener(
    'wheel',
    function (event) {
        if (settings_open || !['playing', 'paused'].includes(state) || !event.deltaY) {
            return;
        }
        event.preventDefault();
        set_zoom(zoom*Math.exp(clamp(-event.deltaY*0.0015, -0.18, 0.18)));
    },
    {passive: false}
);
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
