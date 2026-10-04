// Saved games: six slots beside the autosave. From the pause menu you save the running campaign into any slot or load
// one; from the main menu you load. A slot holds a checkpoint as the autosave makes it, so loading resumes exactly as
// CONTINUE does, and the loaded game becomes the autosave too.
const save_slot_count = 6;
let saves_return = null;

document.getElementById('saves_close').addEventListener('click', saves_close);
document.getElementById('pause_saves_button').addEventListener('click', () => saves_open('pause'));
document.getElementById('load_button').addEventListener('click', () => saves_open('menu'));
for (const id of ['pause_last_save', 'menu_last_save', 'result_last_save']) {
    document.getElementById(id).addEventListener('click', load_last_save);
}
addEventListener('keydown', on_saves_key, true);

function saves_read()
{
    try {
        const v = JSON.parse(localStorage.getItem('pulse_drift_saves_v1'));
        return Array.isArray(v) ? v : [];
    }
    catch {
        return [];
    }
}

function saves_write(slots)
{
    try {
        localStorage.setItem('pulse_drift_saves_v1', JSON.stringify(slots));
        return true;
    }
    catch {
        return false;
    }
}

// The main menu shows LOAD GAME once any slot holds a game; every LOAD LAST SAVE button names the slot and its time
function sync_load_button()
{
    set_hidden(document.getElementById('load_button'), !saves_read().some(Boolean));
    const i = last_save_slot();
    const v = (i >= 0) ? saves_read()[i] : null;
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
function last_save_slot()
{
    const slots = saves_read();
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
    const i = last_save_slot();
    if (i >= 0) {
        load_from_slot(i);
    }
}

// F9 loads the last save; F5 opens the save slots (pausing first), in place of the browser's reload
function on_saves_key(event)
{
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
    if (saves_return === 'pause') {
        document.getElementById('saves_note').textContent = arcade.active
            ? 'An arcade save keeps your score, salvage and gear; loading it starts its world again from the first wave.'
            : 'Six slots, kept in this browser beside the autosave. Times are Chisinau time.';
    }
}

function save_time(ms)
{
    return new Date(ms).toLocaleString('en-GB', {timeZone: 'Europe/Chisinau', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'});
}

// The campaign as the autosave would keep it, into slot i
function save_to_slot(i)
{
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
    show_toast('GAME LOADED', `SLOT ${i + 1} · ${v.world.toUpperCase()}`, 2);
}
