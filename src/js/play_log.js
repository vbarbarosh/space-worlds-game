// The play log (docs/play-log.md): how a game went, kept on this device so it can be judged after. A session is one
// game from its start to the main menu or the page's close; it holds a record of each minute of play (cut short when
// you change worlds, load or die) and an event for each thing that matters: a world entered, a purchase, the kit, a
// rank, a contract, a flagship, a race, a death. In a frame it only adds to counters; it writes to storage once a
// minute, on pause, at a death and when the page goes away. The oldest sessions go first past play_log_cap, and a save
// always comes before the log (storage_set). Nothing leaves the device but the file the pause panel's Download saves.
const play_log_key = 'play_log_v1';
const play_log_format = 'world-explorer-play-log';
const play_log_version = 1;
// all the stored sessions together, in characters of JSON: about 40 hours of play, and room left for the saves
const play_log_cap = 1500000;
const play_log_events_cap = 5000;
const play_log_record_s = 60;
// a session goes on in a new one past an hour of play, so a minute's write stays small (about 45 KB, under a ms)
const play_log_session_s = 3600;
const play_log_flight_states = new Set(['playing', 'transit', 'victory']);
const play_log_docked_states = new Set(['upgrade', 'arcade_depot', 'navigation', 'inventory']);
let play_log_index = play_log_index_read();
let play_log_session = null;
const play_log_tally = {};
let play_log_salvage_expected = 0;
let play_log_xp_expected = 0;
let play_log_rank_seen = 0;
let play_log_world_since = 0;
let play_log_kit_text = '';
let play_log_kit_due = false;
let play_log_died = false;
let play_log_last_cause = '';
let play_log_last_by = null;
let play_log_state_seen = '';
let play_log_trash = null;
let play_log_problem = '';
// The browser's part of a frame in flight, after frame() returns: a message posted then arrives once the main thread
// is free again, past the style, layout and paint, and on a software canvas the canvas's raster, which work_ms does
// not see (paint_ms)
const play_log_after = new MessageChannel();
let play_log_after_t0 = 0;

play_log_close_unfinished();
document.getElementById('play_log_download').addEventListener('click', export_play_log);
document.getElementById('play_log_clear').addEventListener('click', function () {
    if (play_log_trash) {
        play_log_clear_undo();
    }
    else {
        play_log_clear();
    }
    refresh_play_log_panel();
});
addEventListener('pagehide', function () {
    play_log_session_end('page closed');
});
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
        play_log_persist();
    }
});

function play_log_index_read()
{
    let index = null;
    try {
        index = JSON.parse(localStorage.getItem(play_log_key));
    }
    catch {
    }
    if (!index || (index.format !== play_log_format) || !Array.isArray(index.sessions)) {
        return {format: play_log_format, version: play_log_version, played_s: 0, open: null, dropped: 0, sessions: [], runs: {}};
    }
    index.played_s = index.played_s || 0;
    index.runs = index.runs || {};
    return index;
}

// A session the page did not close (a crash, a killed tab) ends where its last record does
function play_log_close_unfinished()
{
    const id = play_log_index.open;
    play_log_index.open = null;
    const session = id ? play_log_session_read(id) : null;
    if (!session || session.ended) {
        return;
    }
    const last = session.records[session.records.length - 1];
    session.ended = last ? last.at : session.started;
    session.end_reason = 'not closed: the page went away without notice';
    play_log_store(session);
}

function play_log_session_read(id)
{
    try {
        return JSON.parse(localStorage.getItem(`${play_log_key}:${id}`));
    }
    catch {
        return null;
    }
}

// Every session kept, oldest first; the one being played as it is now, with its unfinished record
function play_log_sessions_read()
{
    const out = [];
    for (const entry of play_log_index.sessions) {
        const session = (play_log_session?.id === entry.id) ? play_log_session_now() : play_log_session_read(entry.id);
        if (session) {
            out.push(session);
        }
    }
    if (play_log_session && !play_log_index.sessions.some(v => v.id === play_log_session.id)) {
        out.push(play_log_session_now());
    }
    return out;
}

function play_log_session_now()
{
    const record = play_log_record_make(true);
    const records = record ? [...play_log_session.records, record] : play_log_session.records;
    return {...play_log_session, played_s: Math.round(play_log_session.played_s*10)/10, records};
}

// The session into storage under its own key, and the index with its size; past the cap the oldest go. When storage
// is full the log's oldest sessions make room, and failing that the session stays in memory
function play_log_store(session)
{
    let text = play_log_session_json(session);
    // one session past the cap alone (40 hours unbroken) loses its oldest records
    while ((text.length > play_log_cap) && (session.records.length > 10)) {
        const cut = Math.ceil(session.records.length/10);
        session.records.splice(0, cut);
        session.dropped.records += cut;
        text = play_log_session_json(session);
    }
    let entry = play_log_index.sessions.find(v => v.id === session.id);
    if (!entry) {
        entry = {id: session.id, run: session.run, chars: 0};
        play_log_index.sessions.push(entry);
    }
    entry.chars = text.length;
    entry.played_s = Math.round(session.played_s);
    for (const old of play_log_index.sessions.slice()) {
        if (play_log_chars() <= play_log_cap) {
            break;
        }
        if ((old !== entry) && (old.id !== play_log_session?.id)) {
            play_log_session_drop(old);
            play_log_index.dropped = (play_log_index.dropped || 0) + 1;
        }
    }
    try {
        storage_set(`${play_log_key}:${session.id}`, text);
        localStorage.setItem(play_log_key, JSON.stringify(play_log_index));
        play_log_problem = '';
    }
    catch {
        play_log_problem = 'Storage is full: the log is kept in memory until the page closes.';
    }
}

function play_log_session_json(session)
{
    return JSON.stringify({...session, played_s: Math.round(session.played_s*10)/10});
}

function play_log_chars()
{
    let out = 0;
    for (const entry of play_log_index.sessions) {
        out += entry.chars;
    }
    return out;
}

function play_log_session_drop(entry)
{
    play_log_index.sessions = play_log_index.sessions.filter(v => v !== entry);
    try {
        localStorage.removeItem(`${play_log_key}:${entry.id}`);
    }
    catch {
    }
    const runs = new Set(play_log_index.sessions.map(v => v.run));
    for (const run of Object.keys(play_log_index.runs)) {
        if (!runs.has(run) && (run !== play_log_session?.run)) {
            delete play_log_index.runs[run];
        }
    }
}

// Storage full: the log's oldest sessions go, never the one being played, until `chars` are free; false when none
// could go
function play_log_make_room(chars)
{
    let freed = 0;
    for (const entry of play_log_index.sessions.slice()) {
        if (freed >= chars) {
            break;
        }
        if (entry.id !== play_log_session?.id) {
            freed += entry.chars;
            play_log_session_drop(entry);
            play_log_index.dropped = (play_log_index.dropped || 0) + 1;
        }
    }
    if (freed) {
        try {
            localStorage.setItem(play_log_key, JSON.stringify(play_log_index));
        }
        catch {
        }
    }
    return freed > 0;
}

// A save comes before the log: when storage is full the log's oldest sessions give way and the save is written again;
// throws as setItem does when there is still no room
function storage_set(key, text)
{
    try {
        localStorage.setItem(key, text);
    }
    catch (error) {
        if (!play_log_make_room(text.length)) {
            throw error;
        }
        localStorage.setItem(key, text);
    }
}

function play_log_persist()
{
    if (play_log_session) {
        play_log_store(play_log_session);
    }
}

// Every run starts here (reset_run): a new game, a continue, a load, the tow after a death. A game is its run id,
// kept in the save (campaign.log_run): the same game goes on in the same session, another one starts a new session
function play_log_run_start(resume)
{
    const mode = arcade.active ? 'arcade' : race_mode.active ? 'race' : 'campaign';
    const fresh = !campaign.log_run;
    if (fresh) {
        campaign.log_run = play_log_id_make();
    }
    const how = play_log_run_how(resume);
    play_log_died = false;
    if (play_log_session && ((play_log_session.mode !== mode) || (play_log_session.run !== campaign.log_run))) {
        play_log_session_end('another game started');
    }
    if (play_log_session) {
        play_log_record_close();
        play_log_event('run', {how, world: worlds[campaign.world].name, salvage, xp: play_log_xp_now()});
        play_log_baseline();
    }
    else {
        play_log_session_start(mode, how);
    }
    play_log_world_enter(how);
    // a new game's id goes into the save at once, so a tow or a load before the next autosave stays in this session
    if (fresh && !arcade.active) {
        save_checkpoint();
    }
}

function play_log_run_how(resume)
{
    // the Races mode: each race starts as a run of its own; the first since the menu is new
    if (race_mode.active) {
        return play_log_session ? 'next race' : 'new';
    }
    if (arcade.active ? (run_time === 0) : !resume) {
        return 'new';
    }
    if (play_log_died) {
        return 'after death';
    }
    return play_log_session ? 'load' : 'continue';
}

function play_log_id_make()
{
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    return `${stamp}-${Math.random().toString(36).slice(2, 6)}`;
}

function play_log_session_start(mode, how)
{
    play_log_session = {
        id: play_log_id_make(),
        mode,
        run: campaign.log_run,
        // the Races mode's own: easy, normal or hard
        difficulty: race_mode.active ? race_mode.level : difficulty,
        game: {version: build_info.version, built: build_info.time},
        started: new Date().toISOString(),
        ended: null,
        end_reason: null,
        played_s: 0,
        start: {how, world: worlds[campaign.world].name, salvage, xp: play_log_xp_now(), rank: play_log_rank_name(), ship: current_ship().name},
        screen: {w: innerWidth, h: innerHeight, dpr: devicePixelRatio || 1},
        browser: navigator.userAgent,
        records: [],
        events: [],
        dropped: {records: 0, events: 0},
    };
    play_log_index.open = play_log_session.id;
    play_log_index.runs[campaign.log_run] = play_log_index.runs[campaign.log_run] || {worlds: [], deaths: {}, priciest: 0, milestones: []};
    play_log_kit_text = '';
    play_log_tally_reset();
    play_log_baseline();
    play_log_store(play_log_session);
}

// What the next record counts from: the salvage and XP as they are now (a load or a new game moves them, and that is
// neither income nor spending), and the rank
function play_log_baseline()
{
    play_log_salvage_expected = salvage;
    play_log_xp_expected = play_log_xp_now();
    play_log_rank_seen = arcade.active ? 0 : pilot_rank();
    play_log_kit_due = true;
}

function play_log_session_end(reason)
{
    if (!play_log_session) {
        return;
    }
    play_log_record_close();
    play_log_session.ended = new Date().toISOString();
    play_log_session.end_reason = reason;
    play_log_index.open = null;
    play_log_store(play_log_session);
    play_log_session = null;
    play_log_died = false;
}

function play_log_xp_now()
{
    return arcade.active ? null : (campaign.xp || 0);
}

function play_log_rank_name()
{
    return arcade.active ? null : rank_names[pilot_rank()];
}

function play_log_run()
{
    return play_log_index.runs[play_log_session.run];
}

function play_log_t()
{
    return Math.round(play_log_session.played_s*10)/10;
}

function play_log_event(type, details)
{
    const events = play_log_session.events;
    if (events.length >= play_log_events_cap) {
        play_log_session.dropped.events += 1;
        return;
    }
    events.push({t: play_log_t(), type, ...details});
}

// The record being counted: plain numbers, reset in place, and the maps of the record it starts
function play_log_tally_reset()
{
    const v = play_log_tally;
    v.t = play_log_session ? play_log_t() : 0;
    v.world = worlds[campaign.world]?.name || '';
    v.s = 0;
    v.flight_s = 0;
    v.docked_s = 0;
    v.earned = {};
    v.spent = {};
    v.xp = {};
    v.kills = {};
    v.elite_kills = 0;
    v.dealt = 0;
    v.taken_shield = 0;
    v.taken_hull = 0;
    v.taken_by = {};
    v.raider_shots = 0;
    v.hits_on_you = 0;
    v.dashes = 0;
    v.pulses = 0;
    v.supplies = {};
    v.deaths = 0;
    v.hull_low = 1;
    v.frames = 0;
    v.frame_ms = 0;
    v.frame_max = 0;
    v.over_33 = 0;
    v.over_50 = 0;
    v.over_100 = 0;
    v.work_ms = 0;
    v.work_max = 0;
    v.paint_frames = 0;
    v.paint_ms = 0;
    v.paint_max = 0;
}

// The record of what was counted since the last; null when nothing was. Salvage or XP that moved past the hooks
// shows as 'unlogged', so the sums always match the balance
function play_log_record_make(partial)
{
    const v = play_log_tally;
    if ((v.s < 0.5) && !v.deaths) {
        return null;
    }
    const earned = {...v.earned};
    const spent = {...v.spent};
    const drift = salvage - play_log_salvage_expected;
    if (drift > 0) {
        earned.unlogged = (earned.unlogged || 0) + drift;
    }
    else if (drift < 0) {
        spent.unlogged = (spent.unlogged || 0) - drift;
    }
    const xp = {...v.xp};
    const xp_now = play_log_xp_now();
    if (xp_now !== null) {
        const xp_drift = xp_now - play_log_xp_expected;
        if (xp_drift) {
            xp.unlogged = (xp.unlogged || 0) + xp_drift;
        }
    }
    const fps = v.flight_s ? Math.round((v.frames/v.flight_s)*10)/10 : null;
    return {
        t: v.t,
        s: Math.round(v.s*10)/10,
        at: new Date().toISOString(),
        world: v.world,
        flight_s: Math.round(v.flight_s),
        docked_s: Math.round(v.docked_s),
        salvage,
        earned,
        spent,
        xp_total: xp_now,
        xp,
        rank: play_log_rank_name(),
        kills: {...v.kills},
        elite_kills: v.elite_kills,
        dealt: Math.round(v.dealt),
        taken: {shield: Math.round(v.taken_shield), hull: Math.round(v.taken_hull)},
        taken_by: play_log_rounded(v.taken_by),
        raider_shots: v.raider_shots,
        hits_on_you: v.hits_on_you,
        dashes: v.dashes,
        pulses: v.pulses,
        supplies: {...v.supplies},
        deaths: v.deaths,
        hull_low: Math.round(v.hull_low*100)/100,
        fps,
        frame_ms: {avg: v.frames ? Math.round((v.frame_ms/v.frames)*10)/10 : null, max: Math.round(v.frame_max), over_33: v.over_33, over_50: v.over_50, over_100: v.over_100},
        work_ms: {avg: v.frames ? Math.round((v.work_ms/v.frames)*100)/100 : null, max: Math.round(v.work_max*10)/10},
        paint_ms: {avg: v.paint_frames ? Math.round((v.paint_ms/v.paint_frames)*100)/100 : null, max: Math.round(v.paint_max*10)/10},
        ...(partial ? {partial: true} : {}),
    };
}

function play_log_rounded(amount_by_key)
{
    const out = {};
    for (const key of Object.keys(amount_by_key)) {
        out[key] = Math.round(amount_by_key[key]);
    }
    return out;
}

function play_log_record_close()
{
    if (!play_log_session) {
        return;
    }
    const record = play_log_record_make(false);
    if (record) {
        play_log_session.records.push(record);
    }
    play_log_salvage_expected = salvage;
    play_log_xp_expected = play_log_xp_now() || 0;
    play_log_tally_reset();
}

// The message play_log_frame posted at the end of a frame in flight: the browser has drawn it
play_log_after.port1.onmessage = function () {
    const v = play_log_tally;
    const ms = performance.now() - play_log_after_t0;
    v.paint_frames += 1;
    v.paint_ms += ms;
    v.paint_max = Math.max(v.paint_max, ms);
};

// Each frame (frame() in js/boot.js): interval is the time since the last frame, work the time this one took, in ms.
// Only play counts: flight, and the station, depot, map and inventory screens; not the pause, menus or results
function play_log_frame(interval, work)
{
    if (!play_log_session) {
        return;
    }
    if (state !== play_log_state_seen) {
        play_log_state_change(play_log_state_seen, state);
        play_log_state_seen = state;
    }
    const flight = play_log_flight_states.has(state);
    if (settings_open || (!flight && !play_log_docked_states.has(state))) {
        return;
    }
    const v = play_log_tally;
    const seconds = Math.min(interval, 250)/1000;
    v.s += seconds;
    play_log_session.played_s += seconds;
    play_log_index.played_s += seconds;
    if (flight) {
        v.flight_s += seconds;
        // a frame over a second is the tab coming back, not a stall
        if (interval < 1000) {
            v.frames += 1;
            v.frame_ms += interval;
            v.frame_max = Math.max(v.frame_max, interval);
            v.over_33 += (interval > 33.4) ? 1 : 0;
            v.over_50 += (interval > 50) ? 1 : 0;
            v.over_100 += (interval > 100) ? 1 : 0;
            v.work_ms += work;
            v.work_max = Math.max(v.work_max, work);
            play_log_after_t0 = performance.now();
            play_log_after.port2.postMessage(0);
        }
    }
    else {
        v.docked_s += seconds;
    }
    if (play_log_kit_due) {
        play_log_kit_check();
    }
    if (v.s >= play_log_record_s) {
        play_log_record_close();
        play_log_kit_due = true;
        if (play_log_session.played_s >= play_log_session_s) {
            play_log_session_roll();
        }
        else {
            play_log_persist();
        }
    }
}

// An hour of play: the session ends and the same game goes on in the next, which begins with its world and kit
function play_log_session_roll()
{
    const mode = play_log_session.mode;
    play_log_session_end('an hour of play: goes on in the next session');
    play_log_session_start(mode, 'continued');
    play_log_world_enter('continued');
}

// The pause panel shows the log as it is now, and the log is stored; leaving the pause ends a cleared log's undo
function play_log_state_change(from, to)
{
    if (to === 'paused') {
        play_log_persist();
        refresh_play_log_panel();
    }
    if (from === 'paused') {
        play_log_trash = null;
    }
}

function play_log_earn(source, amount)
{
    if (!play_log_session || !(amount > 0)) {
        return;
    }
    play_log_tally.earned[source] = (play_log_tally.earned[source] || 0) + amount;
    play_log_salvage_expected += amount;
}

// A purchase: kind (ship, gun, gun tier, module, supply, repair, drone, drone tier, builder, structure, transport
// line, trade, tow), the item's id and its price; details go into its event as they are
function play_log_spend(kind, id, price, details = null)
{
    if (!play_log_session || !(price > 0)) {
        return;
    }
    play_log_tally.spent[kind] = (play_log_tally.spent[kind] || 0) + price;
    play_log_salvage_expected -= price;
    const run = play_log_run();
    const kit = !['trade', 'tow'].includes(kind);
    const priciest = kit && (price > run.priciest);
    if (priciest) {
        run.priciest = price;
    }
    play_log_event('buy', {kind, item: id, price, salvage_left: salvage, ...(priciest ? {priciest_yet: true} : {}), ...details});
    play_log_kit_due = true;
}

// A depot's item in the arcade by the kinds the campaign's purchases have
function play_log_depot_spend(item)
{
    const kind = (item.id === 'repair') ? 'repair' : (item.kind === 'weapon') ? 'gun' : item.kind;
    play_log_spend(kind, item.id, item.price);
}

// Cargo sold or commodities bought at a station's market; value is what it brought (bought: below 0)
function play_log_trade(key, amount, value)
{
    if (!play_log_session) {
        return;
    }
    if (value < 0) {
        play_log_spend('trade', key, -value, {amount});
        return;
    }
    play_log_earn(`sell ${key}`, value);
    play_log_event('sell', {item: key, amount, value, salvage_left: salvage});
}

function play_log_xp(source, amount)
{
    if (!play_log_session || !(amount > 0)) {
        return;
    }
    play_log_tally.xp[source] = (play_log_tally.xp[source] || 0) + amount;
    play_log_xp_expected += amount;
    const rank = pilot_rank();
    if (rank > play_log_rank_seen) {
        play_log_rank_seen = rank;
        play_log_event('rank', {rank: rank_names[rank], xp: campaign.xp});
        play_log_kit_due = true;
    }
}

function play_log_kill(enemy)
{
    if (!play_log_session) {
        return;
    }
    const kills = play_log_tally.kills;
    kills[enemy.type] = (kills[enemy.type] || 0) + 1;
    if (enemy.elite) {
        play_log_tally.elite_kills += 1;
    }
    if ((enemy.type === 'boss') && (enemy.log_engaged !== undefined)) {
        const bar = el.bossbar.querySelector('.meter-row')?.textContent || '';
        play_log_event('boss', {name: bar || boss_designs[campaign.world]?.name || 'flagship', world: worlds[campaign.world].name, secs: Math.round(play_log_session.played_s - enemy.log_engaged), taken: Math.round(play_log_taken() - enemy.log_taken)});
    }
}

// A raider's hull and shield together, before a hit: play_log_dealt counts what the hit took
function play_log_health(enemy)
{
    return Math.max(0, enemy.hp) + (enemy.shield || 0);
}

function play_log_dealt(enemy, before)
{
    if (!play_log_session) {
        return;
    }
    play_log_tally.dealt += Math.max(0, before - play_log_health(enemy));
    // a flagship's fight is timed from its first hit
    if ((enemy.type === 'boss') && (enemy.log_engaged === undefined)) {
        enemy.log_engaged = play_log_session.played_s;
        enemy.log_taken = play_log_taken();
    }
}

function play_log_taken()
{
    let taken = play_log_tally.taken_shield + play_log_tally.taken_hull;
    for (const record of play_log_session.records) {
        taken += record.taken.shield + record.taken.hull;
    }
    return taken;
}

// A hit on you, after the shield took its share: cause is shot, ram, flagship, missile, ship blast, vent, flare, rock,
// debris, radiation or black hole; by is the shot or the raider when there is one
function play_log_hurt(cause, shield, hull, by = null)
{
    if (!play_log_session) {
        return;
    }
    const v = play_log_tally;
    v.taken_shield += shield;
    v.taken_hull += hull;
    v.taken_by[cause] = (v.taken_by[cause] || 0) + shield + hull;
    if (cause === 'shot') {
        v.hits_on_you += 1;
    }
    if (hull > 0) {
        play_log_last_cause = cause;
        play_log_last_by = by;
        v.hull_low = Math.min(v.hull_low, Math.max(0, player.hp)/hull_max());
    }
}

function play_log_shots(n)
{
    if (play_log_session) {
        play_log_tally.raider_shots += n;
    }
}

function play_log_dash()
{
    if (play_log_session) {
        play_log_tally.dashes += 1;
    }
}

function play_log_pulse()
{
    if (play_log_session) {
        play_log_tally.pulses += 1;
    }
}

function play_log_supply(key)
{
    if (play_log_session) {
        play_log_tally.supplies[key] = (play_log_tally.supplies[key] || 0) + 1;
    }
}

// A world entered: at a run's start, through a gate, or the arcade's next world
function play_log_world_enter(how)
{
    if (!play_log_session) {
        return;
    }
    play_log_record_close();
    const name = worlds[campaign.world].name;
    const run = play_log_run();
    const first = !run.worlds.includes(name);
    if (first) {
        run.worlds.push(name);
    }
    play_log_world_since = play_log_session.played_s;
    play_log_event('world', {world: name, how, first_visit: first, salvage});
    play_log_kit_due = true;
}

// The arcade's world cleared: its three waves in so many seconds, and the bonus
function play_log_world_cleared(bonus)
{
    if (play_log_session) {
        play_log_event('world cleared', {world: worlds[campaign.world].name, secs: Math.round(play_log_session.played_s - play_log_world_since), bonus});
    }
}

function play_log_wave(n)
{
    if (play_log_session) {
        play_log_event('wave', {world: worlds[campaign.world].name, wave: n});
    }
}

// A run's end (finish): a death with its cause, or the game won
function play_log_finish(won)
{
    if (!play_log_session || ['dead', 'won'].includes(state)) {
        return;
    }
    const name = worlds[campaign.world].name;
    if (won) {
        play_log_event('won', {world: name, salvage});
        play_log_persist();
        return;
    }
    const run = play_log_run();
    run.deaths[name] = (run.deaths[name] || 0) + 1;
    play_log_tally.deaths += 1;
    const boss = enemies.find(v => (v.type === 'boss') && (v.hp > 0));
    play_log_event('death', {
        world: name,
        cause: play_log_cause(),
        first_in_world: run.deaths[name] === 1,
        in_world_s: Math.round(play_log_session.played_s - play_log_world_since),
        salvage,
        ship: current_ship().name,
        flagship_alive: boss ? Math.round((boss.hp/boss.max_hp)*100)/100 : null,
    });
    play_log_died = true;
    play_log_record_close();
    play_log_persist();
}

// What dealt the last hit on the hull: its kind, and for a shot or a ram the raider and its gun
function play_log_cause()
{
    const by = play_log_last_by;
    if (play_log_last_cause === 'shot') {
        return {kind: 'shot', raider: by?.from || null, weapon: by?.weapon || null, elite: !!by?.from_elite};
    }
    if (play_log_last_cause === 'ram') {
        return {kind: 'ram', raider: by?.type || null, elite: !!by?.elite};
    }
    return {kind: play_log_last_cause || 'unknown'};
}

// A contract's step: taken, stage done, completed, claimed, abandoned; times in seconds of play since it was taken
// and since its stage began
function play_log_contract(action, m, details = null)
{
    if (!play_log_session || !m) {
        return;
    }
    const now = Math.round(play_log_index.played_s);
    if (action === 'taken') {
        m.log_taken = now;
        m.log_stage = now;
    }
    const secs = Number.isFinite(m.log_taken) && (now >= m.log_taken) ? now - m.log_taken : null;
    const stage_secs = Number.isFinite(m.log_stage) && (now >= m.log_stage) ? now - m.log_stage : null;
    play_log_event('contract', {
        action,
        title: m.title,
        kind: m.type,
        stage: (m.stage_index || 0) + 1,
        stages: m.stages?.length || 1,
        world: worlds[m.world]?.name || null,
        reward: m.reward,
        story: !!m.main,
        secs,
        stage_secs,
        ...details,
    });
    if (action === 'stage done') {
        m.log_stage = now;
    }
}

// A ring race over the line: place among the field, time against the course's par, the prize
function play_log_race(m, result)
{
    if (play_log_session) {
        play_log_event('race', {title: m.title, world: worlds[campaign.world].name, place: result.place, of: result.count, time: result.time, par: race.course?.par ? Math.round(race.course.par*10)/10 : null, prize: m.reward});
    }
}

// A race of the Races mode at its end (over the line, wrecked or forfeit): the difficulty and course, your place and
// time, par, your crashes and the shield and hull rocks took, and every racer's times at each ring (splits, seconds
// since green), so the places along the way can be read back
function play_log_race_mode(result)
{
    if (!play_log_session || !race.course) {
        return;
    }
    const you = race_you();
    play_log_event('race', {
        mode: 'race',
        level: race_mode.level,
        world: worlds[campaign.world].name,
        title: race_contract()?.title || null,
        end: result.end,
        why: result.why || null,
        place: result.place || null,
        of: race.racers.length,
        time: (you.time === null) ? null : Math.round(you.time*10)/10,
        at: Math.round(race.clock*10)/10,
        par: Math.round(race.course.par*10)/10,
        rings: race.course.rings.length,
        km: Math.round(race.course.length/100)/10,
        reached: you.next,
        crashes: race.crashes,
        rock_hull: Math.round(race.rock_hull),
        hull_left: Math.max(0, Math.round(player.hp)),
        racers: race.racers.map(v => ({name: v.you ? 'You' : v.name, skill: v.you ? null : v.skill, time: (v.time === null) ? null : Math.round(v.time*10)/10, next: v.next, out: v.out, splits: v.splits})),
    });
    play_log_persist();
}

function play_log_race_forfeit(why)
{
    if (play_log_session) {
        play_log_event('race forfeit', {world: worlds[campaign.world].name, why});
    }
}

// The kit as it is now: ship, the gun on each mount with its tier, module levels, drones, rank
function play_log_kit()
{
    const f = ensure_career();
    const guns = ship_loadout().map(function (id) {
        const gun = weapon_by_id(id);
        return gun ? {id: gun.id, name: gun.name, tier: f.weapon_levels[gun.id] || 1} : null;
    });
    const modules = {};
    const below_cap = [];
    for (const option of upgrade_options) {
        if (upgrades[option.key]) {
            modules[option.key] = upgrades[option.key];
        }
        if (upgrades[option.key] < option.cap) {
            below_cap.push(module_needs_gun(option) ? `${option.key} (needs a launcher)` : option.key);
        }
    }
    return {
        ship: current_ship().name,
        guns,
        modules,
        modules_at_cap: upgrade_options.length - below_cap.length,
        modules_total: upgrade_options.length,
        modules_below_cap: below_cap,
        ships_owned: f.ships.length,
        drones: arcade.active ? null : (campaign.drones || 0),
        rank: play_log_rank_name(),
    };
}

// The kit logged when it changed, and the run's milestones the first time they come: the priciest ship owned, every
// module at its cap that your guns let you fit (a missile module needs a launcher), every gun on the ship at tier 5
function play_log_kit_check()
{
    play_log_kit_due = false;
    if (!play_log_session || !player) {
        return;
    }
    const kit = play_log_kit();
    const text = JSON.stringify(kit);
    if (text !== play_log_kit_text) {
        play_log_kit_text = text;
        play_log_event('kit', {...kit, salvage});
    }
    const run = play_log_run();
    const top = ship_catalog.reduce((a, b) => (b.price > a.price) ? b : a, ship_catalog[0]);
    const milestones = [
        ['top ship', ensure_career().ships.includes(top.id)],
        ['all modules at cap', kit.modules_below_cap.every(v => v.endsWith('(needs a launcher)'))],
        ['all guns tier 5', kit.guns.length && kit.guns.every(v => v && (v.tier >= 5))],
    ];
    for (const [what, done] of milestones) {
        if (done && !run.milestones.includes(what)) {
            run.milestones.push(what);
            play_log_event('milestone', {what, salvage});
        }
    }
}

// Clear: the stored log goes and the current game starts a new session; until the pause closes, Undo brings it back
function play_log_clear()
{
    play_log_record_close();
    const texts = {};
    for (const entry of play_log_index.sessions) {
        try {
            texts[entry.id] = localStorage.getItem(`${play_log_key}:${entry.id}`);
            localStorage.removeItem(`${play_log_key}:${entry.id}`);
        }
        catch {
        }
    }
    play_log_trash = {index: play_log_index, texts, session: play_log_session};
    play_log_index = {format: play_log_format, version: play_log_version, played_s: 0, open: null, dropped: 0, sessions: [], runs: {}};
    play_log_session = null;
    try {
        localStorage.removeItem(play_log_key);
    }
    catch {
    }
    if (state !== 'menu') {
        play_log_session_start(arcade.active ? 'arcade' : 'campaign', 'after the log was cleared');
    }
}

function play_log_clear_undo()
{
    const trash = play_log_trash;
    play_log_trash = null;
    // the session begun at the clear goes: the one it replaced goes on
    if (play_log_session) {
        try {
            localStorage.removeItem(`${play_log_key}:${play_log_session.id}`);
        }
        catch {
        }
    }
    play_log_index = trash.index;
    play_log_session = trash.session;
    play_log_tally_reset();
    play_log_baseline();
    for (const id of Object.keys(trash.texts)) {
        try {
            storage_set(`${play_log_key}:${id}`, trash.texts[id]);
        }
        catch {
        }
    }
    play_log_persist();
}

// The pause panel's lines: how much the log holds, Download (off with nothing in it), Clear or Undo
function refresh_play_log_panel()
{
    const sessions = play_log_index.sessions.length + ((play_log_session && !play_log_index.sessions.some(v => v.id === play_log_session.id)) ? 1 : 0);
    let played_s = 0;
    for (const entry of play_log_index.sessions) {
        played_s += (entry.id === play_log_session?.id) ? play_log_session.played_s : (entry.played_s || 0);
    }
    const minutes = Math.floor(played_s/60);
    // empty: no session kept but the one just begun, and not a second of it played
    const empty = !play_log_index.sessions.some(v => v.id !== play_log_session?.id) && (played_s < 1);
    const dropped = play_log_index.dropped || 0;
    const size = document.getElementById('play_log_size');
    const clear = document.getElementById('play_log_clear');
    if (play_log_trash) {
        size.textContent = 'Cleared · Undo brings it back until you resume';
    }
    else if (empty) {
        size.textContent = 'Empty · it fills as you play';
    }
    else {
        const cap = dropped ? ` of ${format_play_log_bytes(play_log_cap)}, ${(dropped === 1) ? 'the oldest session' : `the ${dropped} oldest sessions`} dropped` : '';
        size.textContent = `${format_play_log_bytes(play_log_chars())}${cap} · ${sessions} ${(sessions === 1) ? 'session' : 'sessions'} · ${format_play_log_minutes(minutes)}`;
    }
    document.getElementById('play_log_download').disabled = empty || !!play_log_trash;
    clear.disabled = empty && !play_log_trash;
    clear.querySelector('span').textContent = play_log_trash ? 'Undo' : 'Clear log';
    document.getElementById('play_log_note').textContent = play_log_problem || 'Kept on this device only; nothing is sent. Download is the only way out.';
}

function format_play_log_bytes(chars)
{
    if (chars < 1000) {
        return `${chars} B`;
    }
    if (chars < 1000000) {
        return `${Math.round(chars/1000)} KB`;
    }
    return `${(chars/1000000).toFixed(1)} MB`;
}

function format_play_log_minutes(minutes)
{
    if (minutes < 60) {
        return `${minutes} min of play`;
    }
    return `${Math.floor(minutes/60)} h ${minutes % 60} min of play`;
}

// Download: every session kept, with a summary at the top, as world-explorer-log-<date>.json; nothing else is sent
// anywhere
function export_play_log()
{
    play_log_persist();
    const sessions = play_log_sessions_read();
    const doc = {
        format: play_log_format,
        format_version: play_log_version,
        about: 'A World Explorer play log: docs/play-log.md describes every field. Times are seconds of play (pause and menus not counted) unless named *_at (ISO 8601, UTC); salvage in ◆; damage in hull points.',
        exported_at: new Date().toISOString(),
        game: {version: build_info.version, built: build_info.time},
        summary: play_log_summary(sessions),
        sessions,
    };
    const blob = new Blob([json_from_play_log(doc)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `world-explorer-log-${play_log_file_stamp(new Date())}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function play_log_file_stamp(at)
{
    function pad(v) {
        return String(v).padStart(2, '0');
    }
    return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}`;
}

// The summary at the top of the file: per mode and world the minutes, salvage in and out, kills and deaths; each
// session's salvage curve, at most 40 points; every death; the milestones
function play_log_summary(sessions)
{
    const world_by_key = {};
    const curves = [];
    const deaths = [];
    const milestones = [];
    let minutes = 0;
    for (const session of sessions) {
        for (const record of session.records) {
            const key = `${session.mode}:${record.world}`;
            const v = world_by_key[key] || (world_by_key[key] = {mode: session.mode, world: record.world, minutes: 0, earned: 0, spent: 0, kills: 0, deaths: 0, taken: 0});
            v.minutes += record.s/60;
            v.earned += play_log_sum(record.earned);
            v.spent += play_log_sum(record.spent);
            v.kills += play_log_sum(record.kills);
            v.deaths += record.deaths;
            v.taken += record.taken.shield + record.taken.hull;
            minutes += record.s/60;
        }
        const step = Math.max(1, Math.ceil(session.records.length/40));
        const points = session.records.filter((v, i) => (i % step === 0) || (i === session.records.length - 1)).map(v => [Math.round((v.t + v.s)/6)/10, v.salvage]);
        curves.push({session: session.id, mode: session.mode, difficulty: session.difficulty, minute_salvage: points});
        for (const event of session.events) {
            if (event.type === 'death') {
                deaths.push({session: session.id, mode: session.mode, minute: Math.round(event.t/6)/10, world: event.world, cause: event.cause, first_in_world: event.first_in_world});
            }
            if (event.type === 'milestone') {
                milestones.push({session: session.id, mode: session.mode, minute: Math.round(event.t/6)/10, what: event.what, salvage: event.salvage});
            }
        }
    }
    const worlds_list = Object.values(world_by_key).map(v => ({...v, minutes: Math.round(v.minutes*10)/10, taken: Math.round(v.taken)}));
    return {sessions: sessions.length, play_minutes: Math.round(minutes*10)/10, worlds: worlds_list, salvage_curves: curves, deaths, milestones};
}

function play_log_sum(amount_by_key)
{
    let out = 0;
    for (const key of Object.keys(amount_by_key)) {
        out += amount_by_key[key];
    }
    return out;
}

// JSON a person and a tool read alike: objects open, and each item of a list (a record, an event, a row of the
// summary) on a line of its own; an item too long for a line (a session) opens as an object does
function json_from_play_log(value, indent = '')
{
    if (Array.isArray(value)) {
        if (!value.some(v => v && (typeof v === 'object'))) {
            return JSON.stringify(value);
        }
        const inner = `${indent} `;
        const lines = [];
        for (const item of value) {
            const flat = JSON.stringify(item);
            lines.push(`${inner}${(flat.length <= 1000) ? flat : json_from_play_log(item, inner)}`);
        }
        return `[\n${lines.join(',\n')}\n${indent}]`;
    }
    if (value && (typeof value === 'object')) {
        const flat = JSON.stringify(value);
        if (flat.length <= 100) {
            return flat;
        }
        const inner = `${indent} `;
        return `{\n${Object.keys(value).map(v => `${inner}${JSON.stringify(v)}: ${json_from_play_log(value[v], inner)}`).join(',\n')}\n${indent}}`;
    }
    return JSON.stringify(value);
}
