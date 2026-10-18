// The view in a ring race, campaign and Races mode alike (update_camera): where it looks, and where your ship sits on
// the screen. It looks ahead to the lights during the count, and along the track to the bend coming on a Turbo race;
// and wherever it looks, your ship stays clear of the HUD's blocks: the readouts and toolbar, the race's card, the
// minimap and the standings, the bottom panel. Without it a Turbo leg heading down the screen put the ship a fifth of
// the way from the top, under the card or the WORLD label on a short window or a phone, and a course near the world's
// edge (Haven's run 600 m from it) held the view at the edge and slid the ship under the bottom panel. Where the ship
// would come under a block, the view pulls it back toward the middle of the screen, past the world's edge if it must:
// the space beyond the edge is shown rather than the ship hidden.

// During the count the view looks this far ahead of the line (the lights stand 170 m ahead, the count 300 m)
const race_view_count_ahead = 140;
// The ship keeps this many screen pixels from a block or the window's edge, beyond its halo
const race_view_margin = 12;
// Along the way from where the ship would be to a clear place, the view tries a place this share of the way at a time
const race_view_step = 1/16;
// blocks: the HUD's fixed blocks, in screen px, and a touch screen's TURBO under your thumb (the news line and the
// banners come and go, and are left out: the view does not jump as one shows); source: the hud_layout.rects they were
// measured with, so a change of the HUD measures them again; home: the clear place nearest the middle of the screen,
// for the ship's halo of radius home_r, found again with the blocks
const race_view = {blocks: [], source: null, home: null, home_r: 0};
// The race's phases the view is the race's in: from the count to the results
const race_view_phases = ['countdown', 'racing', 'done', 'results'];

// A race's view: from the count to the results, while you fly, and paused (a window resized or a zoom changed behind
// the pause panel keeps the race's view)
function race_view_on()
{
    return !!player && !!race.course && ['playing', 'paused'].includes(state) && race_view_phases.includes(race.phase);
}

// Where the view looks, from the ship, in world px: the lights ahead during the count; on a Turbo race's track the
// bend coming (race_rail.lead), as far as 30% of the view; else the ship itself
function race_view_lead(vw, vh)
{
    if (race.phase === 'countdown') {
        const a = race.course.start.angle;
        return {x: Math.cos(a)*race_view_count_ahead, y: Math.sin(a)*race_view_count_ahead};
    }
    if (race_rail_riding()) {
        return {x: clamp(race_rail.lead.x, -vw*0.3, vw*0.3), y: clamp(race_rail.lead.y, -vh*0.3, vh*0.3)};
    }
    return {x: 0, y: 0};
}

// The camera in a race (update_camera): it eases toward the view race_view_lead asks for, kept inside the world as
// ever, but with the ship moved clear of the HUD toward the middle of the screen (past the world's edge if it must);
// then, as the eased view lags the ship (a ship on the turbo runs ahead of it), the ship is moved clear again, toward
// that place
function race_view_camera(dt, snap)
{
    const vw = W/zoom;
    const vh = H/zoom;
    const k = zoom*scale;
    const r = (ship_halo() + race_view_margin)*k;
    const lead = race_view_lead(vw, vh);
    const tx = clamp(player.x + lead.x - vw/2, 0, Math.max(0, world.w - vw));
    const ty = clamp(player.y + lead.y - vh/2, 0, Math.max(0, world.h - vh));
    const home = race_view_home(r);
    const want = race_view_place(ox + (player.x - tx)*k, oy + (player.y - ty)*k, home.x, home.y, r);
    const smooth = snap ? 1 : 1 - Math.exp(-10*dt);
    camera.x += (player.x - (want.x - ox)/k - camera.x)*smooth;
    camera.y += (player.y - (want.y - oy)/k - camera.y)*smooth;
    const at = race_view_place(ox + (player.x - camera.x)*k, oy + (player.y - camera.y)*k, want.x, want.y, r);
    camera.x = player.x - (at.x - ox)/k;
    camera.y = player.y - (at.y - oy)/k;
}

// The clear place for the ship nearest the middle of the screen, up or down from it (a 320 px phone's standings come
// down to a few pixels above the middle): the middle itself where nothing is clear
function race_view_home(r)
{
    race_view_blocks();
    if (race_view.home && (race_view.home_r === r)) {
        return race_view.home;
    }
    const x = hud_layout.width/2;
    const y = hud_layout.height/2;
    race_view.home = {x, y};
    race_view.home_r = r;
    for (let d = 0; d < y; d += 2) {
        const at = [y + d, y - d].find(v => race_view_free(x, v, r));
        if (at !== undefined) {
            race_view.home = {x, y: at};
            break;
        }
    }
    return race_view.home;
}

// The ship's place on the screen (px): x, y where it is clear, else the first clear place along the way from there to
// tx, ty, found to the pixel so the ship slides along a block rather than step; tx, ty when none is
function race_view_place(x, y, tx, ty, r)
{
    if (!hud_layout.width || race_view_free(x, y, r)) {
        return {x, y};
    }
    let lo = -1;
    let hi = 0;
    for (let t = race_view_step; t < 1; t += race_view_step) {
        if (race_view_free(x + (tx - x)*t, y + (ty - y)*t, r)) {
            lo = t - race_view_step;
            hi = t;
            break;
        }
    }
    if (lo < 0) {
        return {x: tx, y: ty};
    }
    for (let i = 0; i < 8; ++i) {
        const t = (lo + hi)/2;
        if (race_view_free(x + (tx - x)*t, y + (ty - y)*t, r)) {
            hi = t;
        }
        else {
            lo = t;
        }
    }
    return {x: x + (tx - x)*hi, y: y + (ty - y)*hi};
}

// A circle of radius r at x, y (screen px) is inside the window and clear of every fixed block of the HUD
function race_view_free(x, y, r)
{
    if ((x < r) || (y < r) || (x > hud_layout.width - r) || (y > hud_layout.height - r)) {
        return false;
    }
    for (const v of race_view_blocks()) {
        const dx = Math.max(v.left - x, 0, x - v.right);
        const dy = Math.max(v.top - y, 0, y - v.bottom);
        if (dx*dx + dy*dy < r*r) {
            return false;
        }
    }
    return true;
}

// The HUD's fixed blocks, measured again whenever hud_layout has measured the HUD again
function race_view_blocks()
{
    if (race_view.source !== hud_layout.rects) {
        race_view.source = hud_layout.rects;
        race_view.home = null;
        const screen = document.getElementById('screen').getBoundingClientRect();
        race_view.blocks = [];
        for (const v of document.querySelectorAll('#hud_root [data-hud-safe]:not(#toasts):not(#banners), #touch_buttons > button')) {
            const r = v.getBoundingClientRect();
            if ((r.width >= 1) && (r.height >= 1)) {
                race_view.blocks.push({left: r.left - screen.left, top: r.top - screen.top, right: r.right - screen.left, bottom: r.bottom - screen.top});
            }
        }
    }
    return race_view.blocks;
}
