// Sounds tab: every sound effect of both sets (src/js/sfx/, src/js/sfx_new/), played through the game's own sfx() in
// the set its button names, with a button opening a classic one in the sound maker (dev/sound_maker.js); and under
// them each world's background (sound_ambience.js): its bed for a while, and each of its calls.

// How long a world's bed plays from its button (s)
const dev_sound_bed_time = 12;

function dev_sounds_fill()
{
    const rows = [];
    const kinds = Object.keys(sfx_by_kind).concat(Object.keys(sfx_new_by_kind).filter(v => !sfx_by_kind[v]));
    for (const kind of kinds) {
        const fresh = sfx_new_by_kind[kind];
        // a sound the new set split off another plays that other one in the classic set; one only the new set has is
        // silent there
        const classic = sfx_by_kind[kind] || ((fresh && fresh.classic) ? sfx_by_kind[fresh.classic] : null);
        const play_new = fresh ? dev_button('New', function () {
            dev_sound_play(kind, 'new');
        }) : '';
        const play_classic = classic ? dev_button('Classic', function () {
            dev_sound_play(kind, 'classic');
        }) : 'silent';
        let make = '';
        if (sfx_by_kind[kind]) {
            make = dev_button('Make', function () {
                dev_sound_make(kind);
            });
            make.title = `Open the classic ${kind} in the sound maker`;
        }
        rows.push({value: kind, cells: [kind, `${(fresh || classic).limit} s`, play_new, play_classic, make]});
    }
    dev_table_fill(document.getElementById('dev_sounds'), ['Sound', 'Cooldown', 'New set', 'Classic set', ''], rows, null, null);
    const beds = [];
    for (let i = 0, end = sound_ambience_worlds.length; i < end; ++i) {
        const cells = [worlds[i].name, dev_button('Bed', function () {
            dev_sound_bed(i);
        })];
        for (let j = 0, calls = sound_ambience_worlds[i].calls.length; j < calls; ++j) {
            cells.push(dev_button(`Call ${j + 1}`, function () {
                dev_sound_call(i, j);
            }));
        }
        beds.push({value: i, cells});
    }
    dev_table_fill(document.getElementById('dev_sound_worlds'), ['Background', `${dev_sound_bed_time} s of it`, 'From the distance', '', ''], beds, null, null);
}

// The sound maker, that sound open in it
function dev_sound_make(kind)
{
    dev_scenario_save();
    const params = new URLSearchParams(location.search);
    params.set('screen', 'sound-maker');
    params.set('sound', kind);
    location.assign(`${location.pathname}?${params.toString()}`);
}

// Audio started and heard: says why not in the tab's status line
function dev_sound_ready()
{
    start_audio();
    const status = document.getElementById('dev_sound_status');
    if (!sound.ctx) {
        status.textContent = 'Audio is not available in this browser.';
        return false;
    }
    if (muted) {
        status.textContent = 'Sound is off: press M or the ♫ button.';
        return false;
    }
    return true;
}

// Plays `kind` as the set `set` plays it, whichever set the game is on
function dev_sound_play(kind, set)
{
    if (!dev_sound_ready()) {
        return;
    }
    const status = document.getElementById('dev_sound_status');
    const volume = Number(document.getElementById('dev_sound_volume').value);
    const pan = Number(document.getElementById('dev_sound_pan').value);
    const position = player ? {x: player.x + pan*750, y: player.y} : null;
    const now = sound_set;
    sound_set = set;
    const played = sfx_kind(kind);
    const skipped = sound.ctx.currentTime < (sound.cues[played] || 0);
    sfx(kind, volume, position);
    sound_set = now;
    status.textContent = skipped ? `${kind}: skipped, still in its cooldown` : `${kind}: played, ${set} set${(played === kind) ? '' : ` (it plays ${played} there)`}`;
}

// World i's bed for a while, in flight or out of it
function dev_sound_bed(i)
{
    if (!dev_sound_ready()) {
        return;
    }
    sound_ambience.audition = sound.ctx.currentTime + dev_sound_bed_time;
    sound_ambience.audition_world = i;
    document.getElementById('dev_sound_status').textContent = `${worlds[i].name}: its background for ${dev_sound_bed_time} s (the Flight ambience volume sets its level)`;
}

// Call j of world i, once
function dev_sound_call(i, j)
{
    if (!dev_sound_ready()) {
        return;
    }
    const world = sound_ambience_worlds[i];
    sound_ambience.audition = Math.max(sound_ambience.audition, sound.ctx.currentTime + 6);
    sound_ambience.audition_world = i;
    sound_ambience_call(world.calls[j], sound.ctx.currentTime + 0.05, world.call_levels[j]);
    document.getElementById('dev_sound_status').textContent = `${worlds[i].name}: call ${j + 1} of ${world.calls.length}`;
}
