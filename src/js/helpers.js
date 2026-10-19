function initial_upgrades()
{
    return {
        damage: 0,
        rate: 0,
        spread: 0,
        speed: 0,
        armor: 0,
        pulse: 0,
        magnet: 1,
        drone: 0,
        shield: 0,
        nanites: 0,
        homing: 0,
        reactor: 0,
        salvager: 0,
        dash: 0,
        radshield: 0,
        stabilizer: 0,
        cooling: 0,
        turbo_tank: 0,
        evasive: 0,
        seeker: 0,
        motor: 0,
        warhead: 0,
        radar: 0,
    };
}

// the shield's capacitors and the ship's own, and an arcade card's factor (arcade_cards.js)
// The shield mends once this many seconds have passed with no hit (update.js), at 5 + 2 a module level a second
const shield_mend_delay = 5;

function shield_max()
{
    const shield = upgrades.shield*25 + current_ship().shield;
    return (arcade_card_k.shield === 1) ? shield : Math.round(shield*arcade_card_k.shield);
}

// The shield fills again now: no hit for shield_mend_delay and room to fill
function shield_mending()
{
    return (player.since_hit > shield_mend_delay) && (player.shield < shield_max());
}

function dash_cooldown()
{
    return Math.max(3, 8 - upgrades.dash*dash_cut() - upgrades.cooling*0.35);
}

function format_reading(v)
{
    return String(Number(Number(v).toFixed(1)));
}

function format_progress(v)
{
    return String(Math.floor(Number(v) + 1e-7));
}

function format_time(v)
{
    return `${String(Math.floor(v/60)).padStart(2, '0')}:${String(Math.floor(v % 60)).padStart(2, '0')}`;
}

function current_sector()
{
    return sectors[wave - 1];
}
try {
    best = Number(localStorage.getItem('pulse_drift_best')) || 0;
    muted = localStorage.getItem('pulse_drift_muted') === '1';
}
catch {
}
menu_best_sync();
function rand(a, b)
{
    return a + Math.random()*(b - a);
}

function clamp(v, a, b)
{
    return Math.max(a, Math.min(b, v));
}

// Math.hypot is a slow builtin that boxes its numbers; the hot paths take the square root of the sum
function distance(a, b)
{
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx*dx + dy*dy);
}

function set_hidden(v, hidden)
{
    v.classList.toggle('hidden', hidden);
}

// The window's size and pixel ratio the canvas was last made for
let resize_last = '';

// The browser itself sends a resize event at most once a frame, however fast the window is dragged
function resize()
{
    width = innerWidth;
    height = innerHeight;
    // the screen's pixel ratio up to 1.7, or a step under it while the frames fall behind (js/resolution.js)
    dpr = resolution_dpr();
    // one that leaves the window as it was keeps the canvas (made again, it would be cleared and allocated anew), its
    // picture and its stars
    const view = `${width}x${height}`;
    const size = `${view}@${dpr}`;
    if (size === resize_last) {
        return;
    }
    const same_view = resize_last.startsWith(`${view}@`);
    resize_last = size;
    canvas.width = Math.round(width*dpr);
    canvas.height = Math.round(height*dpr);
    resolution_hold(performance.now());
    // a new pixel ratio alone keeps the scene as it was: its camera, its stars
    if (same_view) {
        return;
    }
    // A window smaller than 620 × 550 shows the scene scaled down, widened to the window's shape so it fills it
    scale = Math.min(1, width/620, height/550);
    W = width/scale;
    H = height/scale;
    ox = (width - W*scale)/2;
    oy = (height - H*scale)/2;
    world.w = Math.max(world.w, W + 200);
    world.h = Math.max(world.h, H + 200);
    if (player) {
        update_camera(0, true);
    }
    sync_minimap_button();
    stars = [];
    for (let i = 0, end = 130; i < end; ++i) {
        stars.push({x: rand(0, W), y: rand(0, H), z: rand(0.2, 1.2), phase: rand(0, 6.28)});
    }
}
resize();
addEventListener('resize', resize);
