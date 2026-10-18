// The frame rate and the time a frame takes, in flight on the window's left edge just above the HUD's bottom row,
// panel open or folded; a depot, a station, a menu or the settings over the flight hide it, for it would sit on their
// cards. The time is the game's own work per frame (update and render); the GPU's share shows in the frame rate. Then
// the canvas's pixel ratio (js/resolution.js).
const dev_fps = {ms: 0, frames: 0};
const el_dev_fps = document.getElementById('dev_fps');
const el_dev_hud_bottom = document.querySelector('.hud-bottom');
const dev_fps_base_frame = frame;

frame = function (timestamp) {
    const time0 = performance.now();
    dev_fps_base_frame(timestamp);
    dev_fps.ms += performance.now() - time0;
    dev_fps.frames++;
};

// Called every quarter of a second (js/dev/cheats.js): the mean time of the frames since
function dev_fps_refresh()
{
    const ms = dev_fps.frames ? dev_fps.ms/dev_fps.frames : 0;
    dev_fps.ms = 0;
    dev_fps.frames = 0;
    el_dev_fps.textContent = `${dev_time.fps} fps · ${ms.toFixed(1)} ms · ×${dpr.toFixed(2)}`;
    // the bottom row moves with the window's size: the gap above it is free at every size (bin/layout-check)
    const bottom = el_dev_hud_bottom.getBoundingClientRect();
    el_dev_fps.classList.toggle('hidden', (state !== 'playing') || settings_open);
    el_dev_fps.classList.toggle('placed', bottom.height > 0);
    el_dev_fps.style.top = (bottom.height > 0) ? `${Math.round(bottom.top - el_dev_fps.offsetHeight - 6)}px` : '';
}
