// The Races mode, the main menu's Races row: ring races only (js/race.js), course after course, at one of three
// difficulties. A race starts as a run of its own, as the arcade's does: a checkpoint made up on the spot, the
// campaign's put back after, nothing saved. You fly the start ship (Wisp Scout) on every difficulty, with no modules:
// the difficulty is the rivals and the course, so a time on one course reads the same from race to race. The rivals'
// pace is a share of your ship's cruising speed in that world, so a world's own speed moves both alike. No raider
// comes, nothing drops, no radiation burns (radiation_rate); a world's other rules stay (Eclipse's turbo takes pulse,
// Nova Forge's heats the reactor); the rocks stay as they are (unbreakable, a crash costs speed and hull, you can
// die). Over the line, a wreck or a forfeit: the results, then Race again, Next course (the next world, Eclipse back
// to Haven) or the menu.
// A difficulty: its rivals (how many, the spread of their skill, their pace against your cruising speed) and its
// course's shape (race_shape_campaign: rings more or fewer than the world's, a ring wider or tighter, legs longer,
// turns sharper, how much the legs seek the rocks)
const race_mode_levels = {
    easy: {
        name: 'Easy', color: '#7be08a', rivals: 3, skill: [0, 0.45], pace: 0.86,
        shape: {rings: -1, r: 18, leg: 1, turn: 0.8, rocks: -0.5},
        note: 'Three rivals slower than you, wide rings on open lines. The first course is short.',
    },
    normal: {
        name: 'Normal', color: '#6cf8ec', rivals: 4, skill: [0.2, 0.8], pace: 0.95,
        shape: {rings: 1, r: 0, leg: 1.15, turn: 1, rocks: 1},
        note: 'Four rivals, the best as quick as you; the rings among the rocks.',
    },
    hard: {
        name: 'Hard', color: '#ff4d5e', rivals: 4, skill: [0.6, 1], pace: 1.03,
        shape: {rings: 3, r: -14, leg: 1.25, turn: 1.2, rocks: 1.8},
        note: 'Four quick rivals, more rings, tighter, deep in the rocks.',
    },
};
const race_mode_ship = 'scout';
// Seconds from your finish to the results: the banner and the flash of the line, the rivals behind still flying in
const race_mode_results_in = 3.5;
// active: a race of this mode is flown; level and world: the difficulty and the course's world; log_run: the play
// log's id for the races since the menu; saved: the campaign's checkpoint and difficulty, put back after; result: the
// last race's end for the results; results_in: the seconds left before they show
const race_mode = {active: false, level: 'normal', world: 0, log_run: null, saved: null, result: null, results_in: 0};

document.getElementById('race_again').addEventListener('click', () => race_mode_start(race_mode.level, race_mode.world));
document.getElementById('race_next').addEventListener('click', () => race_mode_start(race_mode.level, (race_mode.world + 1) % worlds.length));
document.getElementById('race_menu').addEventListener('click', menu_open);
addEventListener('keydown', on_race_result_key);
race_mode_level_pick(race_mode.level);

// On the results: Enter races again, N goes to the next course, Esc to the menu
function on_race_result_key(event)
{
    if (!race_mode.active || !['race_results', 'dead'].includes(state) || event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }
    const id = {Enter: 'race_again', KeyN: 'race_next', Escape: 'race_menu'}[event.code];
    if (id) {
        event.preventDefault();
        document.getElementById(id).click();
    }
}

// From the menu: a new series of races at the difficulty picked, Haven first
function race_mode_launch()
{
    race_mode.log_run = play_log_id_make();
    race_mode.saved = {checkpoint, difficulty};
    race_mode_start(race_mode.level, 0);
}

// One race: the world made up as a new run (no save written: save_checkpoint skips the mode), the race contract its
// only one, you in your place on the start line; the count starts at once
function race_mode_start(level, world)
{
    arcade_stop();
    race_mode.active = true;
    race_mode.level = level;
    race_mode.world = world;
    race_mode.result = null;
    race_mode.results_in = 0;
    document.body.classList.add('race-mode');
    set_hidden(document.getElementById('race_result'), true);
    set_pause_icon(false);
    const ship = ship_catalog.find(v => v.id === race_mode_ship);
    const kept = checkpoint;
    checkpoint = {
        version: 4,
        wave: worlds[world].wave,
        score: 0,
        kills: 0,
        salvage: 0,
        artifacts_count: 0,
        run_time: 0,
        upgrades: initial_upgrades(),
        supplies: {medkit: 0, emp: 0, stasis: 0},
        difficulty: 'normal',
        hp: ship.hull,
        energy: 35,
        campaign: {
            world,
            story: 0,
            contracts: [],
            completed: 0,
            visited: [world],
            cargo: {ore: 0, cells: 0, relics: 0},
            maps: {},
            serial: 0,
            board: 0,
            log_run: race_mode.log_run,
            fleet: {ship_id: ship.id, ships: [ship.id], weapon_id: 'plasma', weapons: ['plasma'], weapon_levels: {plasma: 1}},
        },
    };
    reset_run(true);
    checkpoint = kept;
    const m = race_mode_contract(world, level);
    campaign.contracts = [m];
    campaign.tracked_id = m.id;
    race_grid_set(m);
    const you = race_you();
    player.x = you.slot.x;
    player.y = you.slot.y;
    player.vx = 0;
    player.vy = 0;
    player.angle = m.race.start.angle;
    update_camera(0, true);
    const n = m.race.rings.length;
    show_banner('world', `Races · ${race_mode_levels[level].name} · course ${world + 1} of ${worlds.length}`, worlds[world].name, `${n} rings · ${(m.race.length/1000).toFixed(1)} km · ${m.race.rivals.length} rivals`, 3);
    update_hud();
}

// The race of a world at a difficulty: the course of the difficulty's own variant in its shape (the next variants,
// then the campaign's shape, where a world has no room for it), and its rivals paced against your ship
function race_mode_contract(world, level)
{
    const def = race_mode_levels[level];
    const variant = Object.keys(race_mode_levels).indexOf(level);
    let course = null;
    for (let i = 0; !course && (i < race_variants.length*2); ++i) {
        course = race_course_make(world, (variant + i) % race_variants.length, (i < race_variants.length) ? def.shape : race_shape_campaign);
    }
    const rivals = race_rivals_make(world, variant, 1, def.rivals, def.skill);
    const cruise = cruise_speed(world, ship_catalog.find(v => v.id === race_mode_ship));
    for (const v of rivals) {
        v.pace = cruise*def.pace*(0.9 + 0.3*v.skill);
    }
    const n = course.rings.length;
    return contract_copy({
        title: `Ring race: ${worlds[world].name} · ${def.name}`,
        description: `${n} rings through the rocks off ${worlds[world].station}, ${(course.length/1000).toFixed(1)} km, against ${rivals.map(v => v.name).join(', ')}.`,
        race: {...course, variant, rivals, top: 0},
        stages: [stage('race', world, n, `Race ${n} rings against ${rivals.length} rivals`)],
        level: 1,
        reward: 0,
    });
}

// Every frame of a race: once you are over the line, the results come after a moment
function race_mode_update(dt)
{
    if (race_mode.results_in <= 0) {
        return;
    }
    race_mode.results_in -= dt;
    if (race_mode.results_in <= 0) {
        race_mode_results_open();
    }
}

// Over the line: your place and time on a banner, the results a moment after
function race_mode_finished(place, count, time)
{
    race_mode.result = {end: 'finished', place, count, time};
    race_mode.results_in = race_mode_results_in;
    show_banner('goal', `Race · finished in ${race_time_text(time)}`, `${race_ordinal(place)} of ${count}`, `par ${race_time_text(race.course.par)}`, 3);
    sfx('ring');
}

// The race lost off the course (or a jump through a portal): the results at once
function race_mode_forfeit(why)
{
    race_mode.result = {end: 'forfeit', why};
    race_mode_results_open();
}

// Your hull gone on a rock (finish(false) comes here): the wreck, then the results; over the line already, your place
// stands
function race_mode_died()
{
    if (race_mode.result?.end !== 'finished') {
        race_mode.result = {end: 'wrecked'};
    }
    race_mode.results_in = 0;
    race_mode_results_open('dead');
}

// The results: your place and time (or how it ended), par, your crashes; the field as it stands; Race again, Next
// course, Main menu. The race goes into the play log here, with the rivals that finished in the moment after you.
function race_mode_results_open(next_state = 'race_results')
{
    const r = race_mode.result;
    const course = race.course;
    const you = race_you();
    const def = race_mode_levels[race_mode.level];
    const n = course.rings.length;
    // wrecked or forfeit, you are placed after every rival still racing
    you.out = r.end !== 'finished';
    const order = race_standings();
    state = next_state;
    stop_turbo();
    keys.clear();
    toasts_clear();
    for (const v of [el.loadout, el.inventory_button, el.mission, el.pause_button, el.touch_buttons, el.bossbar]) {
        set_hidden(v, true);
    }
    const crashes = race.crashes ? `${race.crashes} ${(race.crashes === 1) ? 'crash' : 'crashes'} · ${Math.round(race.rock_hull)} hull to rocks` : 'No crashes';
    const eyebrow = document.getElementById('race_result_eyebrow');
    eyebrow.textContent = `Races · ${def.name} · ${worlds[race_mode.world].name}`;
    eyebrow.classList.toggle('eyebrow--red', r.end !== 'finished');
    eyebrow.classList.toggle('eyebrow--gold', r.end === 'finished');
    document.getElementById('race_result_title').textContent = (r.end === 'finished') ? `${race_ordinal(r.place)} of ${r.count}` : (r.end === 'wrecked') ? 'Wrecked' : 'Forfeit';
    document.getElementById('race_result_line').textContent = (r.end === 'finished')
        ? `${race_time_text(r.time)} · par ${race_time_text(course.par)} · ${crashes}`
        : (r.end === 'wrecked')
            ? `Your hull gave out at ring ${Math.min(n, you.next + 1)} of ${n}, ${race_time_text(race.clock)} in · ${crashes}`
            : `${r.why} · ring ${Math.min(n, you.next + 1)} of ${n}`;
    document.getElementById('race_result_rows').innerHTML = order.map(function (v, i) {
        const right = v.you ? ((r.end === 'wrecked') ? 'Wrecked' : (r.end === 'forfeit') ? 'Forfeit' : race_time_text(v.time)) : v.out ? 'Out' : (v.time !== null) ? race_time_text(v.time) : `ring ${v.next}/${n}`;
        const name = v.you ? 'You' : v.name;
        return `<li class="${v.you ? 'is-you' : ''}" title="${ui_escape(name)}"><b>${i + 1}</b><i style="--c:${v.color}"></i><span class="nm">${ui_escape(name)}</span><span class="rg">${right}</span></li>`;
    }).join('');
    document.getElementById('race_next_name').textContent = worlds[(race_mode.world + 1) % worlds.length].name;
    set_hidden(document.getElementById('race_result'), false);
    document.getElementById('race_again').focus();
    play_log_race_mode(r);
}

// Out of the mode: to the menu, or another mode started; the campaign's checkpoint and difficulty as they were
function race_mode_stop()
{
    if (!race_mode.active) {
        return;
    }
    race_mode.active = false;
    race_mode.results_in = 0;
    document.body.classList.remove('race-mode');
    set_hidden(document.getElementById('race_result'), true);
    race_reset();
    if (race_mode.saved) {
        checkpoint = race_mode.saved.checkpoint;
        difficulty = race_mode.saved.difficulty;
        race_mode.saved = null;
    }
    for (const v of document.querySelectorAll('[data-mode]')) {
        v.classList.toggle('selected', v.dataset.mode === difficulty);
    }
    sync_mode_note();
}

// The menu's Races row: a difficulty picked, its tile lit and its line under the tiles
function race_mode_level_pick(level)
{
    race_mode.level = race_mode_levels[level] ? level : 'normal';
    for (const v of document.querySelectorAll('#intro [data-race-level]')) {
        v.classList.toggle('selected', v.dataset.raceLevel === race_mode.level);
    }
    document.getElementById('races_note').textContent = race_mode_levels[race_mode.level].note;
}
