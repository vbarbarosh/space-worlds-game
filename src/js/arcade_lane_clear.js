// A Scroll world's cleared screen (the author, 2026-10-21: "let's make a different one for the scrolls"), played on
// the lane itself rather than over a sky of its own: the flagship and the raiders still in the view go up, the HUD
// makes way, your ship turns to the lane's way and boosts off the screen; the world's name slides in from the left and
// CLEARED from the right in its colour; the world's numbers count up one under the other; the next world is named and
// one button opens the depot. Any key or click skips to the end; Enter there, or the button, goes on. With the Effects
// setting off the end comes at once. The run's last world ends in the arcade's finale instead (arcade_finale.js).
const lane_clear = {open: false, t: 0, frozen: null, rows: []};
// Its steps, in seconds from the flagship's fall: the ship turns to the way; it boosts (start, end) to this speed, m a
// second; the title; the rows (the first, one after another, each counting this long); the next world; the button
const lane_clear_steps = {turn: 0.6, boost: [1.4, 2.6], title: 1.1, rows: [2.2, 0.35, 0.5], next: 4.2, go: 4.5};
const lane_clear_speed = 1800;

document.getElementById('lc_go').addEventListener('click', lane_clear_leave);
document.getElementById('lc_stage').addEventListener('click', function (event) {
    if (!event.target.closest('.btn')) {
        lane_clear_skip();
    }
});
// before the game's own keys: while it is up, keys are its own
addEventListener('keydown', function (event) {
    if (!lane_clear.open) {
        return;
    }
    event.stopImmediatePropagation();
    event.preventDefault();
    if (event.repeat) {
        return;
    }
    if (lane_clear.t < lane_clear_steps.go) {
        lane_clear_skip();
    }
    else if (event.code === 'Enter') {
        lane_clear_leave();
    }
}, true);

// The world just cleared (arcade_base_world_end) and its numbers (arcade_world_run); the next world is
// arcade.between_worlds.next
function lane_clear_open(world, run)
{
    state = 'lane_clear';
    stop_turbo();
    keys.clear();
    mouse_drive_suspend();
    joystick.active = false;
    bullets = [];
    lane_clear.open = true;
    lane_clear.t = full_fx ? 0 : lane_clear_steps.go;
    const mode = document.querySelector(`[data-mode="${difficulty}"] .tile-name`)?.textContent || '';
    document.getElementById('lc_eyebrow').textContent = `Scroll${mode ? ` · ${mode}` : ''} · ${arcade_lives_text(arcade.lives)}`;
    document.getElementById('lc_name').textContent = worlds[world].name;
    document.getElementById('lc_stage').style.setProperty('--lc-accent', worlds[world].accent);
    const next = arcade.between_worlds?.next ?? null;
    document.getElementById('lc_next').textContent = (next === null) ? '' : `Next: ${worlds[next].name}${(next === arcade_worlds - 1) ? ', the last' : ''}`;
    lane_clear.rows = [
        {label: `Score in ${worlds[world].name}`, value: run.score, text: v => ui_number(v), gold: true},
        {label: 'Raiders here', value: run.raiders, text: v => ui_number(v)},
        {label: 'Time here', value: run.time, text: v => format_time(v)},
        {label: 'World bonus', value: run.bonus, text: v => `+${ui_number(v)}`},
        {label: 'Salvage', value: run.salvage, text: v => ui_number(v)},
    ];
    document.getElementById('lc_tally').innerHTML = lane_clear.rows.map(v => `<div class="lc-row${v.gold ? ' is-gold' : ''}"><span class="eyebrow eyebrow--muted">${ui_escape(v.label)}</span><span class="readout">0</span></div>`).join('');
    document.body.classList.add('lane-clearing');
    set_hidden(document.getElementById('lane_clear'), false);
    lane_clear_sync();
}

// Each frame while it is up (update): its time, by the screen's clock (the flagship's fall slows the game's), your ship
// turned to the way and boosting off along it, a streak behind it, and the words
function lane_clear_update(frame_dt)
{
    lane_clear.t = (lane_clear.frozen !== null) ? lane_clear.frozen : lane_clear.t + frame_dt;
    const t = lane_clear.t;
    const way = arcade_scroll.way;
    if (t >= lane_clear_steps.turn) {
        player.angle = turn_toward(player.angle, Math.atan2(way.y, way.x), frame_dt*5);
    }
    const [b0, b1] = lane_clear_steps.boost;
    if ((t >= b0) && (lane_clear.frozen === null) && in_view(player, 200)) {
        const k = clamp((t - b0)/(b1 - b0), 0, 1);
        const speed = lane_clear_speed*k*k;
        player.x += way.x*speed*frame_dt;
        player.y += way.y*speed*frame_dt;
        for (let i = 0; i < 3; ++i) {
            particles.push({x: player.x - way.x*16 + rand(-5, 5), y: player.y - way.y*16 + rand(-5, 5), vx: -way.x*rand(40, 160), vy: -way.y*rand(40, 160), life: 0.6, total: 0.6, color: (i === 0) ? '#ffffff' : '#6cf8ec', size: rand(2, 4.5)});
        }
    }
    lane_clear_sync();
}

// The words as the time has them: the title, each row in and counted up, the next world, the button
function lane_clear_sync()
{
    const t = lane_clear.t;
    const steps = lane_clear_steps;
    const stage = document.getElementById('lc_stage');
    stage.classList.toggle('is-title', t >= steps.title);
    stage.classList.toggle('is-next', t >= steps.next);
    const go = t >= steps.go;
    if (go && !stage.classList.contains('is-go')) {
        document.getElementById('lc_go').focus();
    }
    stage.classList.toggle('is-go', go);
    const [start, gap, count] = steps.rows;
    const rows = document.querySelectorAll('#lc_tally .lc-row');
    for (const [i, row] of lane_clear.rows.entries()) {
        const k = clamp((t - start - i*gap)/count, 0, 1);
        rows[i].classList.toggle('is-in', t >= start + i*gap);
        hud_text(rows[i].querySelector('.readout'), row.text(Math.round(row.value*k)));
    }
}

// Straight to the end, the words all in
function lane_clear_skip()
{
    if ((lane_clear.frozen === null) && (lane_clear.t < lane_clear_steps.go)) {
        lane_clear.t = lane_clear_steps.go;
        lane_clear_sync();
    }
}

// The button or Enter: on to the depot, which launches to the next world (arcade_depot_close)
function lane_clear_leave()
{
    if (!lane_clear.open) {
        return;
    }
    lane_clear.open = false;
    lane_clear.frozen = null;
    document.body.classList.remove('lane-clearing');
    set_hidden(document.getElementById('lane_clear'), true);
    arcade_depot_open();
}
