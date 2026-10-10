// The frame rate, the time a frame takes and the renderer, in flight on the window's left edge just above the HUD's
// bottom row, panel open or folded, so the 2D and 3D views (?render=3d) can be compared by eye; a depot, a station or a
// menu over the flight hides it, for it would sit on their cards. The time is the game's own work per frame
// (update and render); the GPU's share shows in the frame rate.
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
    // 3D asked for: "no WebGL" only when it failed to start; a menu or a screen without a ship draws nothing in 3D, and says so
    const renderer = !render3d_requested ? '2D' : !render3d.on ? '2D · no WebGL' : render3d_active() ? '3D' : '3D · in flight';
    el_dev_fps.textContent = `${dev_time.fps} fps · ${ms.toFixed(1)} ms · ${renderer}`;
    // the bottom row moves with the window's size: the gap above it is free at every size (bin/layout-check)
    const bottom = el_dev_hud_bottom.getBoundingClientRect();
    el_dev_fps.classList.toggle('hidden', state !== 'playing');
    el_dev_fps.classList.toggle('placed', bottom.height > 0);
    el_dev_fps.style.top = (bottom.height > 0) ? `${Math.round(bottom.top - el_dev_fps.offsetHeight - 6)}px` : '';
}
