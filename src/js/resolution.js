// Adaptive resolution (docs/performance-2026-10-05.md, 18 October): in flight the canvas's pixel ratio (dpr) goes a
// step lower while the frames fall behind and the game's own work is not what holds them (the graphics card is: it
// fills every pixel of the canvas each frame), and a step higher again once they have kept up for 3 minutes. Settings
// → Resolution: Auto, this, or Sharp: always the screen's own ratio up to resolution_cap, as before. The dev page
// forces a ratio with &dpr=.
const resolution_cap = 1.7;
// the ratios under the screen's own the canvas steps down to; never under 1, and none within 6% of the screen's
const resolution_steps = [1.5, 1.3, 1.15, 1];
const resolution_step_gap = 0.94;
// the frames measured for a step down (the last 2 s of flight), checked twice a second; a ratio has held when the
// last 5 s were not behind
const resolution_down_window_ms = 2000;
const resolution_held_window_ms = 5000;
const resolution_check_ms = 500;
// a pause, a menu, the settings, a hidden tab, a resize, a new world or a step: the frames of the next second are not
// measured (the sky and the sprites are drawn again at the new size)
const resolution_settle_ms = 1000;
// a frame over this, and over three times the frame before it, is the tab coming back or a world loading, not the
// frame rate; on a page that slow all the time (a software canvas in a large window) it is a frame like the others
const resolution_stall_ms = 250;
const resolution_stall_ratio = 3;
// Behind: the frames slower than about 54 fps (their mean, the longest tenth left out: a garbage collection is not the
// frame rate), while the game's own work takes under half of a frame (else fewer pixels would not help); at 20 ms (50
// fps) a run at 46 fps held, its trimmed mean just under the line, the top of the keeping-up band is the line instead
const resolution_behind_ms = 18.5;
const resolution_work_share = 0.5;
// Keeping up: as fast as the screen refreshes (the fastest frames seen lately, a window's median), and on a screen over
// 72 Hz under 14 ms. The fastest seen is let go by 1% a check, so a faster screen the window has left (or a refresh the
// system halved) is forgotten within a minute, and a frame of the slower one counts as keeping up again
const resolution_up_ms_min = 14;
const resolution_up_ms_max = 18.5;
const resolution_refresh_slack = 1.1;
const resolution_refresh_fade = 1.01;
// at the lowest ratio still behind, and no faster by a tenth than where the steps began: the pixels are not what is
// slow (a browser holding the page to 30 fps on battery, a 30 Hz screen), so the ratio goes back to where the steps
// began and stays. The steps are judged by the scene they are made in: a ratio that held (the last 5 s not behind)
// ends its descent, and frames slower by a quarter than those it began with are its measure from there on
const resolution_futile_gain = 0.9;
const resolution_heavier = 1.25;
// Up: one step, after 3 minutes of flight in which every check found the frames keeping up (a screen shows no frame
// under its refresh, so headroom shows only as a long stretch with none late), and each ratio is stepped up to once a
// run: where it fell behind again it is not tried a second time. A new run forgets that and keeps the ratio; a new
// world only waits a second (the author's play log, 2026-11-01: forgotten at each world, 1.7 was tried again in each
// of 8 worlds and held 42 fps against 56 at 1)
const resolution_up_stretch_ms = 180000;
const resolution_samples = 2048;
const resolution = {
    // 'auto' or 'sharp' (Settings → Resolution), kept in the browser's storage
    mode: 'auto',
    // the dev page's &dpr=: this ratio and no other; 0 when not forced
    forced: 0,
    // the screen's ratio up to the cap, the ratios it steps down to (the screen's first), the one in use
    top: 0,
    ladder: [1],
    level: 0,
    // the frames measured, a ring: the time since the last frame and the game's own work in it (ms), when it began
    frame_ms: new Float64Array(resolution_samples),
    work_ms: new Float64Array(resolution_samples),
    at: new Float64Array(resolution_samples),
    count: 0,
    scratch: new Float64Array(resolution_samples),
    // the frames are measured from `since` (a settle after a hold), checked at check_at
    since: 0,
    check_at: 0,
    last_t0: 0,
    last_interval: 0,
    work_last: 0,
    // the flight in a row whose every check found the frames keeping up (ms), and per level: stepped up to in this run
    clear_ms: 0,
    tried: [],
    // the steps down being made: the level they began at and the frame time (ms) they are judged by; null once a
    // ratio has held
    descent: null,
    futile: false,
    world: -1,
    // the fastest frames seen lately (the lowest median of a window): the screen's refresh, as far as it shows
    refresh_ms: Infinity,
};
try {
    resolution.mode = (localStorage.getItem('pulse_drift_resolution') === 'sharp') ? 'sharp' : 'auto';
}
catch {
}

// The ratio the canvas is made at (resize() in js/helpers.js). A new screen ratio (another screen, the browser's zoom)
// starts the steps again from its own
function resolution_dpr()
{
    if (resolution.forced) {
        return resolution.forced;
    }
    const top = Math.min(devicePixelRatio || 1, resolution_cap);
    if (top !== resolution.top) {
        resolution.top = top;
        resolution.ladder = [top, ...resolution_steps.filter(v => (v >= 1) && (v <= top*resolution_step_gap))];
        resolution.level = 0;
        resolution_forget();
    }
    return (resolution.mode === 'sharp') ? top : resolution.ladder[resolution.level];
}

// The screen's ratio up to the cap, never stepped down: for the small canvases beside the flight (js/hangar_preview.js)
function resolution_screen_dpr()
{
    return resolution.forced || Math.min(devicePixelRatio || 1, resolution_cap);
}

// Settings → Resolution: 'auto' or 'sharp'; Sharp puts the screen's ratio back at once
function resolution_mode_set(mode)
{
    const next = (mode === 'sharp') ? 'sharp' : 'auto';
    if (next === resolution.mode) {
        return;
    }
    resolution.mode = next;
    resolution.level = 0;
    resolution_forget();
    try {
        localStorage.setItem('pulse_drift_resolution', next);
    }
    catch {
    }
    resize();
    performance_render_dirty = true;
}

// What the steps learned about this run and screen goes: a ratio stepped up to may be tried again, after a stretch of
// its own (a new run: a new campaign, reset_run, or a new arcade run, arcade_start). The ratio in use stays
function resolution_forget()
{
    resolution.tried = [];
    resolution.clear_ms = 0;
    resolution.descent = null;
    resolution.futile = false;
}

// The frames from now on are not measured for a second, and those before are dropped
function resolution_hold(t0)
{
    resolution.count = 0;
    resolution.since = t0 + resolution_settle_ms;
    resolution.check_at = resolution.since;
}

// At the start of each frame (frame() in js/boot.js), before anything is drawn: a step made here draws this frame at
// the new ratio, so the canvas never shows cleared
function resolution_frame(t0)
{
    const interval = t0 - resolution.last_t0;
    const stall = (interval > resolution_stall_ms) && (interval > resolution.last_interval*resolution_stall_ratio);
    resolution.last_t0 = t0;
    resolution.last_interval = interval;
    if (resolution.forced || (resolution.mode !== 'auto') || (resolution.ladder.length < 2)) {
        return;
    }
    if (campaign.world !== resolution.world) {
        resolution.world = campaign.world;
        resolution_hold(t0);
        return;
    }
    if ((state !== 'playing') || settings_open || document.hidden || stall) {
        resolution_hold(t0);
        return;
    }
    if (t0 < resolution.since) {
        return;
    }
    const i = resolution.count % resolution_samples;
    resolution.frame_ms[i] = interval;
    resolution.work_ms[i] = resolution.work_last;
    resolution.at[i] = t0;
    resolution.count++;
    if (t0 >= resolution.check_at) {
        resolution.check_at = t0 + resolution_check_ms;
        resolution_check(t0);
    }
}

// At the end of each frame: the game's own work in it (ms), measured with the next frame's time
function resolution_frame_end(work)
{
    resolution.work_last = work;
}

function resolution_check(t0)
{
    const down = resolution_window(t0, resolution_down_window_ms);
    if (!down) {
        return;
    }
    resolution.refresh_ms = Math.min(resolution.refresh_ms*resolution_refresh_fade, down.median_ms);
    const level = resolution.level;
    const bottom = resolution.ladder.length - 1;
    if ((down.frame_ms > resolution_behind_ms) && (down.work_ms < down.frame_ms*resolution_work_share)) {
        resolution.clear_ms = 0;
        if (resolution.futile) {
            return;
        }
        if (level < bottom) {
            // a scene grown heavy at once: the 2 s still hold the lighter frames from before it, the last half second
            // does not
            const recent = resolution_window(t0, resolution_check_ms, 1);
            const heavier = recent.frame_ms > down.frame_ms*resolution_heavier;
            resolution_step_down(t0, heavier ? recent.frame_ms : down.frame_ms);
            return;
        }
        const from = resolution.descent;
        if (from && (down.frame_ms > from.frame_ms*resolution_futile_gain)) {
            resolution.futile = true;
            resolution_step(t0, from.level);
        }
        return;
    }
    // the ratio in use held: its descent is over, and the next one is judged by its own frames
    if (resolution.descent && !resolution.futile) {
        const held = resolution_window(t0, resolution_held_window_ms);
        if (held && (held.frame_ms <= resolution_behind_ms)) {
            resolution.descent = null;
        }
    }
    const keep_up_ms = Math.min(resolution_up_ms_max, Math.max(resolution_up_ms_min, resolution.refresh_ms*resolution_refresh_slack));
    if (down.frame_ms > keep_up_ms) {
        resolution.clear_ms = 0;
        return;
    }
    resolution.clear_ms += resolution_check_ms;
    if ((resolution.clear_ms < resolution_up_stretch_ms) || (level === 0) || resolution.tried[level - 1]) {
        return;
    }
    resolution.tried[level - 1] = true;
    resolution_step(t0, level - 1);
}

// The ratio in use fell behind: the next lower
function resolution_step_down(t0, frame_ms)
{
    const level = resolution.level;
    if (!resolution.descent) {
        resolution.descent = {level, frame_ms};
    }
    else if (frame_ms > resolution.descent.frame_ms*resolution_heavier) {
        resolution.descent.frame_ms = frame_ms;
    }
    resolution_step(t0, level + 1);
}

function resolution_step(t0, level)
{
    resolution.level = level;
    resolution.clear_ms = 0;
    resize();
    performance_render_dirty = true;
    resolution_hold(t0);
}

// The frames of the last `ms` of flight, or the last `frames_min` of them when those took longer (under 5 frames a
// second 2 s hold fewer than 10), if they were all measured: their time (the mean of all but the longest tenth), their
// median, and the game's own work (the median); null if not
function resolution_window(t0, ms, frames_min = 10)
{
    if (t0 - resolution.since < ms) {
        return null;
    }
    const v = resolution;
    const scratch = v.scratch;
    let n = 0;
    for (let i = v.count - 1, end = Math.max(0, v.count - resolution_samples); i >= end; --i) {
        const k = i % resolution_samples;
        if ((v.at[k] < t0 - ms) && (n >= frames_min)) {
            break;
        }
        scratch[n++] = v.work_ms[k];
    }
    if (n < frames_min) {
        return null;
    }
    scratch.subarray(0, n).sort();
    const work_ms = scratch[n >> 1];
    for (let i = 0; i < n; ++i) {
        scratch[i] = v.frame_ms[(v.count - 1 - i) % resolution_samples];
    }
    scratch.subarray(0, n).sort();
    const kept = n - Math.floor(n/10);
    let sum = 0;
    for (let i = 0; i < kept; ++i) {
        sum += scratch[i];
    }
    return {frame_ms: sum/kept, median_ms: scratch[n >> 1], work_ms};
}
