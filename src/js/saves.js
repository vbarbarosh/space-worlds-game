// Saved games: six slots beside the autosave. From the pause menu you save the running campaign into any slot or load
// one; from the main menu you load. A slot holds a checkpoint as the autosave makes it, so loading resumes exactly as
// CONTINUE does, and the loaded game becomes the autosave too.
const save_slot_count = 6;
let saves_return = null;
// The campaign another game took the place of: one of it, kept beside the six slots. New campaign on the menu,
// Restart campaign at a pause, New expedition after a death, a slot's Load and F9 put a game over the campaign to
// continue; before they do, that campaign as it stands is kept here (saves_keep_replaced), and the saves panel shows
// it in a row of its own with Load. A campaign with under a minute flown does not take the place of a kept one with more: New campaign pressed
// twice keeps the first.
const saves_kept_key = 'pulse_drift_kept_v1';
const saves_kept_least = 60;

document.getElementById('saves_close').addEventListener('click', saves_close);
document.getElementById('pause_saves_button').addEventListener('click', () => saves_open('pause'));
for (const id of ['pause_last_save', 'menu_last_save', 'result_last_save']) {
    document.getElementById(id).addEventListener('click', load_last_save);
}
addEventListener('keydown', on_saves_key, true);

function saves_read()
{
    try {
        const v = JSON.parse(localStorage.getItem('pulse_drift_saves_v1'));
        return Array.isArray(v) ? v.map(saves_slot_without_gone) : [];
    }
    catch {
        return [];
    }
}

// A slot saved while a part of the game since taken out was in (Feltmere; the mining drones, structures and transport
// lines), its campaign brought to the game as it is now and its line naming where, in what and with what salvage it is
// now (checkpoint_without_gone)
function saves_slot_without_gone(slot)
{
    if (!slot?.checkpoint) {
        return slot;
    }
    checkpoint_without_gone(slot.checkpoint);
    if (slot.checkpoint.news || slot.checkpoint.paid_back) {
        slot.world = worlds[slot.checkpoint.campaign.world]?.name || slot.world;
        slot.ship = ship_catalog.find(v => v.id === slot.checkpoint.campaign.fleet?.ship_id)?.name || slot.ship;
        slot.salvage = Number.isFinite(slot.checkpoint.salvage) ? slot.checkpoint.salvage : slot.salvage;
    }
    return slot;
}

// The kept campaign, as a slot is: {saved_at, world, story, ship, salvage, checkpoint}; null with none, or one that
// cannot be loaded
function saves_kept_read()
{
    try {
        const v = saves_slot_without_gone(JSON.parse(localStorage.getItem(saves_kept_key)));
        return (v && valid_checkpoint(v.checkpoint)) ? v : null;
    }
    catch {
        return null;
    }
}

// `v` (a checkpoint) as the kept campaign; null takes the kept one away
function saves_kept_write(v)
{
    try {
        if (!v) {
            localStorage.removeItem(saves_kept_key);
            return true;
        }
        const ship = ship_catalog.find(vv => vv.id === v.campaign.fleet?.ship_id) || ship_catalog[0];
        storage_set(saves_kept_key, JSON.stringify({saved_at: Date.now(), world: worlds[v.campaign.world].name, story: `${v.campaign.story}/${story.length}`, ship: ship.name, salvage: v.salvage, checkpoint: v}));
        return true;
    }
    catch {
        return false;
    }
}

// A checkpoint worth keeping over `kept` (a kept campaign or null): any that can be loaded, but one with under a
// minute flown not over one with more
function saves_kept_takes(v, kept)
{
    return !!v && valid_checkpoint(v) && !((v.run_time < saves_kept_least) && kept && (kept.checkpoint.run_time >= saves_kept_least));
}

// Before another game takes the place of the campaign to continue (a new campaign, a slot's Load, F9): that one
// becomes the kept campaign. True when it was kept. running: it is the game in flight, kept as it is now and not as
// its last autosave left it; false where the game in flight is not the campaign (an arcade run and a race fly over
// it, and it waits as it was saved).
function saves_keep_replaced(running = true)
{
    if (race_mode.active) {
        return false;
    }
    if (running && !arcade.active && ['playing', 'paused'].includes(state)) {
        save_checkpoint();
    }
    if (!saves_kept_takes(checkpoint, saves_kept_read())) {
        return false;
    }
    const out = saves_kept_write(JSON.parse(JSON.stringify(checkpoint)));
    sync_load_button();
    return out;
}

// The kept campaign resumed as a slot is; the game it takes the place of becomes the kept one, so the two change
// places and neither is lost
function load_kept()
{
    const v = saves_kept_read();
    if (!v) {
        return;
    }
    const racing = race_mode.active;
    race_mode_stop();
    if (!racing && !arcade.active && ['playing', 'paused'].includes(state)) {
        save_checkpoint();
    }
    const replaced = (saves_kept_takes(checkpoint, null) && (checkpoint.run_time >= saves_kept_least)) ? JSON.parse(JSON.stringify(checkpoint)) : null;
    saves_kept_write(replaced);
    checkpoint = JSON.parse(JSON.stringify(v.checkpoint));
    try {
        localStorage.setItem('pulse_drift_frontier_v4', JSON.stringify(checkpoint));
    }
    catch {
    }
    set_hidden(document.getElementById('saves_overlay'), true);
    set_hidden(el.pause_overlay, true);
    saves_return = null;
    set_pause_icon(false);
    arcade_stop();
    reset_run(true);
    show_toast('GAME LOADED', `THE EARLIER CAMPAIGN · ${v.world.toUpperCase()}`, 2);
    sync_load_button();
}

function saves_write(slots)
{
    try {
        storage_set('pulse_drift_saves_v1', JSON.stringify(slots));
        return true;
    }
    catch {
        return false;
    }
}

// The main menu shows LOAD GAME once any slot holds a game; every LOAD LAST SAVE button names the slot and its time
function sync_load_button()
{
    const slots = saves_read();
    set_hidden(document.getElementById('load_button'), !slots.some(Boolean) && !saves_kept_read());
    const i = last_save_slot(slots);
    const v = (i >= 0) ? slots[i] : null;
    for (const id of ['pause_last_save', 'menu_last_save', 'result_last_save']) {
        const b = document.getElementById(id);
        set_hidden(b, !v);
        if (v) {
            b.innerHTML = `<span>Load last save</span><span class="meta">${i + 1} · ${save_time(v.saved_at)}</span><span class="key">F9</span>`;
            b.title = `Slot ${i + 1}: ${v.world}, story ${v.story}, saved ${save_time(v.saved_at)} (F9)`;
        }
    }
}

// from: 'pause' saves and loads; 'menu' only loads
function saves_open(from)
{
    saves_return = from;
    set_hidden(el.pause_overlay, true);
    set_hidden(document.getElementById('saves_overlay'), false);
    document.getElementById('saves_title').textContent = (from === 'pause') ? 'Save or load.' : 'Load a game.';
    saves_render();
    document.getElementById('saves_close').focus();
}

function saves_close()
{
    set_hidden(document.getElementById('saves_overlay'), true);
    if ((saves_return === 'pause') && (state === 'paused')) {
        set_hidden(el.pause_overlay, false);
    }
    saves_return = null;
}

// A slot that can be loaded: a campaign checkpoint, or an arcade run
function save_slot_valid(v)
{
    return v.arcade ? Number.isInteger(v.arcade.world) && !!worlds[v.arcade.world] : valid_checkpoint(v.checkpoint);
}

// F9, or a LOAD LAST SAVE button (pause, main menu, the end-of-flight screen): the slot saved most recently
function last_save_slot(slots)
{
    let best = -1;
    for (let i = 0; i < slots.length; ++i) {
        if (slots[i] && save_slot_valid(slots[i]) && ((best < 0) || (slots[i].saved_at > slots[best].saved_at))) {
            best = i;
        }
    }
    return best;
}

function load_last_save()
{
    const i = last_save_slot(saves_read());
    if (i >= 0) {
        load_from_slot(i);
    }
}

// F9 loads the last save; F5 opens the save slots (pausing first), in place of the browser's reload. The Races mode has
// no saves to use (race-mode.css hides their buttons): there both keys do nothing, and F5 reloads no page mid-race
function on_saves_key(event)
{
    if (((event.code === 'F5') || (event.code === 'F9')) && race_mode.active) {
        event.preventDefault();
        return;
    }
    if ((event.code === 'F5') && !event.repeat && ['playing', 'paused'].includes(state)) {
        event.preventDefault();
        if (state === 'playing') {
            toggle_pause();
        }
        saves_open('pause');
        return;
    }
    if ((event.code === 'F9') && !event.repeat && ['playing', 'paused', 'menu', 'dead', 'won'].includes(state)) {
        event.preventDefault();
        load_last_save();
        return;
    }
    if ((event.code === 'Escape') && !document.getElementById('saves_overlay').classList.contains('hidden')) {
        event.preventDefault();
        event.stopPropagation();
        saves_close();
    }
}

function saves_render()
{
    const slots = saves_read();
    const can_save = (saves_return === 'pause') && !!player && (player.hp > 0);
    const list = document.getElementById('save_slots');
    list.replaceChildren();
    for (let i = 0; i < save_slot_count; ++i) {
        const v = slots[i];
        const row = document.createElement('div');
        row.className = `slot${v ? '' : ' empty'}`;
        row.innerHTML = '<span class="slot-n"></span><div><b></b><small></small></div><span class="slot-acts"></span>';
        row.querySelector('.slot-n').textContent = String(i + 1);
        row.querySelector('b').textContent = v ? (v.arcade ? `Arcade · ${v.world} · score ${ui_number(v.arcade.score)}` : `${v.world} · story ${v.story}`) : 'Empty';
        row.querySelector('small').textContent = v ? `${v.ship} · ◆ ${ui_number(v.salvage)} · ${save_time(v.saved_at)}` : '';
        const acts = row.querySelector('.slot-acts');
        if (can_save) {
            acts.append(ui_button({label: v ? 'Overwrite' : 'Save here', size: 'sm', kind: v ? 'ghost' : '', on: () => save_to_slot(i)}));
        }
        if (v) {
            acts.append(ui_button({label: 'Load', size: 'sm', kind: 'primary', disabled: !save_slot_valid(v), on: () => load_from_slot(i)}));
        }
        list.append(row);
    }
    // the campaign a new one took the place of, in a row of its own under the slots
    const kept = saves_kept_read();
    if (kept) {
        const row = document.createElement('div');
        row.className = 'slot';
        row.innerHTML = '<span class="slot-n">↩</span><div><b></b><small></small></div><span class="slot-acts"></span>';
        row.title = 'The campaign you could continue before another game took its place: a new campaign, or a save loaded over it. Loading it keeps the game it takes the place of here instead.';
        row.querySelector('b').textContent = `Earlier campaign · ${kept.world} · story ${kept.story}`;
        row.querySelector('small').textContent = `${kept.ship} · ◆ ${ui_number(kept.salvage)} · kept when another game took its place, ${save_time(kept.saved_at)}`;
        row.querySelector('.slot-acts').append(ui_button({label: 'Load', size: 'sm', kind: 'primary', on: load_kept}));
        list.append(row);
    }
    if (saves_return === 'pause') {
        document.getElementById('saves_note').textContent = arcade.active
            ? 'An arcade save keeps your score, salvage and gear; loading it starts its world again from the first wave.'
            : 'The game saves itself as you play, and Continue in the main menu picks it up. A slot keeps a copy you can come back to. Times are Chisinau time.';
    }
}

function save_time(ms)
{
    return new Date(ms).toLocaleString('en-GB', {timeZone: 'Europe/Chisinau', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'});
}

// The campaign as the autosave would keep it, into slot i
function save_to_slot(i)
{
    // the Races mode keeps no saves: its campaign is a stand-in for the race (race_mode_start)
    if (race_mode.active) {
        return;
    }
    const slots = saves_read();
    if (arcade.active) {
        // an arcade run: its snapshot, loaded at the start of the world it was saved in
        slots[i] = {saved_at: Date.now(), world: worlds[campaign.world].name, story: 'arcade', ship: current_ship().name, salvage, arcade: arcade_snapshot()};
    }
    else {
        save_checkpoint();
        if (!checkpoint) {
            return;
        }
        slots[i] = {
            saved_at: Date.now(),
            world: worlds[campaign.world].name,
            story: `${campaign.story}/${story.length}`,
            ship: current_ship().name,
            salvage,
            checkpoint: JSON.parse(JSON.stringify(checkpoint)),
        };
    }
    if (saves_write(slots)) {
        show_toast('GAME SAVED', `SLOT ${i + 1} · ${worlds[campaign.world].name.toUpperCase()}`, 2);
    }
    sync_load_button();
    saves_render();
}

// The game in slot i, resumed as CONTINUE resumes the autosave, which it now also is
function load_from_slot(i)
{
    const v = saves_read()[i];
    if (!v || !save_slot_valid(v)) {
        return;
    }
    // a load leaves the Races mode first: it puts its own campaign back (race_mode_stop), and the slot's then takes over
    const racing = race_mode.active;
    race_mode_stop();
    if (v.arcade) {
        set_hidden(document.getElementById('saves_overlay'), true);
        set_hidden(el.pause_overlay, true);
        saves_return = null;
        set_pause_icon(false);
        arcade_stop();
        arcade_start(v.arcade.world, v.arcade);
        show_toast('ARCADE RUN LOADED', `SLOT ${i + 1} · ${v.world.toUpperCase()} · WAVE 1`, 2);
        return;
    }
    // the campaign the slot's takes the place of is kept, as a new campaign keeps it
    const kept = saves_keep_replaced(!racing);
    checkpoint = JSON.parse(JSON.stringify(v.checkpoint));
    try {
        localStorage.setItem('pulse_drift_frontier_v4', JSON.stringify(checkpoint));
    }
    catch {
    }
    set_hidden(document.getElementById('saves_overlay'), true);
    set_hidden(el.pause_overlay, true);
    saves_return = null;
    set_pause_icon(false);
    arcade_stop();
    reset_run(true);
    show_toast('GAME LOADED', `SLOT ${i + 1} · ${v.world.toUpperCase()}${kept ? ' · THE GAME BEFORE IS KEPT IN SAVED GAMES' : ''}`, kept ? 3.5 : 2);
}
