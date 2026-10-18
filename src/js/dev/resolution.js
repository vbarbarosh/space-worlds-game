// The canvas's pixel ratio on the dev page (js/resolution.js). &dpr=1.3 forces that ratio, Auto and Sharp aside.
// &slow=20 stands in for a slow graphics card: each frame waits 20 ms for every million pixels of the canvas after its
// work, as a frame waits for the card to fill them, so Auto has something to step down for. &stall=30 waits 30 ms a
// frame however many pixels: a browser holding the page to a low frame rate, which fewer pixels do not help
// (bin/resolution-check).
const dev_resolution_params = new URLSearchParams(location.search);
const dev_slow_base_frame = frame;
let dev_slow_ms = clamp(Number(dev_resolution_params.get('slow')) || 0, 0, 100);
const dev_stall_ms = clamp(Number(dev_resolution_params.get('stall')) || 0, 0, 200);

if (dev_resolution_params.has('dpr')) {
    resolution.forced = clamp(Number(dev_resolution_params.get('dpr')) || 1, 0.5, 4);
    resize();
}

// each frame that changed the canvas's size: the ratio, whether the frame drew on the new canvas (its middle not left
// black, as a canvas made again is) and whether it kept the stars (a step keeps the scene; a new window size makes them
// again)
const dev_resolution_steps = [];

frame = function (timestamp) {
    const size = canvas.width;
    const sky = stars;
    dev_slow_base_frame(timestamp);
    if (canvas.width !== size) {
        const pixel = ctx.getImageData(canvas.width >> 1, canvas.height >> 1, 1, 1).data;
        dev_resolution_steps.push({dpr, drawn: (pixel[0] + pixel[1] + pixel[2]) > 0, stars_kept: stars === sky});
    }
    const wait = dev_slow_ms*canvas.width*canvas.height/1e6 + dev_stall_ms;
    if (wait > 0) {
        const until = performance.now() + wait;
        let spins = 0;
        while (performance.now() < until) {
            spins++;
        }
    }
};

// For a browser driver (bin/resolution-check): the ratio in use and what it was chosen from, and the play log's
// record of it; slow(ms) changes &slow, world(n) flies to world n as a gate would (a new world forgets the ratios
// that fell behind)
window.dev_resolution = {
    state() {
        const record = play_log_session ? play_log_record_make(true) : null;
        return {
            dpr, mode: resolution.mode, forced: resolution.forced, top: resolution.top, ladder: resolution.ladder, level: resolution.level,
            futile: resolution.futile, refresh_ms: resolution.refresh_ms, canvas: [canvas.width, canvas.height], width, height,
            slow: dev_slow_ms, stall: dev_stall_ms, fps: dev_time.fps, world: campaign.world, state,
            log: record ? {dpr: record.dpr, dpr_min: record.dpr_min} : null, steps: dev_resolution_steps,
        };
    },
    slow(ms) {
        dev_slow_ms = ms;
    },
    world(n) {
        dev_scenario.world = n;
        dev_scenario_start();
    },
};
