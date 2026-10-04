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
    };
}

function shield_max()
{
    return upgrades.shield*25 + current_ship().shield;
}

function dash_cooldown()
{
    return Math.max(3, 8 - upgrades.dash*0.9 - upgrades.cooling*0.35);
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

function distance(a, b)
{
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function set_hidden(v, hidden)
{
    v.classList.toggle('hidden', hidden);
}

function resize()
{
    width = innerWidth;
    height = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 1.7);
    canvas.width = Math.round(width*dpr);
    canvas.height = Math.round(height*dpr);
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
