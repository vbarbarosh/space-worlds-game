// Sounds tab: one button per sound effect of src/js/sfx/, played through the game's own sfx(), and one opening it in
// the sound maker (dev/sound_maker.js).
function dev_sounds_fill()
{
    const rows = [];
    for (const kind of Object.keys(sfx_by_kind)) {
        const play = dev_button('Play', function () {
            dev_sound_play(kind);
        });
        const make = dev_button('Make', function () {
            dev_sound_make(kind);
        });
        make.title = `Open ${kind} in the sound maker`;
        rows.push({value: kind, cells: [kind, `${sfx_by_kind[kind].limit} s`, play, make]});
    }
    dev_table_fill(document.getElementById('dev_sounds'), ['Sound', 'Cooldown', '', ''], rows, null, null);
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

function dev_sound_play(kind)
{
    start_audio();
    const status = document.getElementById('dev_sound_status');
    if (!sound.ctx) {
        status.textContent = 'Audio is not available in this browser.';
        return;
    }
    if (muted) {
        status.textContent = 'Sound is off: press M or the ♫ button.';
        return;
    }
    const volume = Number(document.getElementById('dev_sound_volume').value);
    const pan = Number(document.getElementById('dev_sound_pan').value);
    const position = player ? {x: player.x + pan*750, y: player.y} : null;
    const skipped = sound.ctx.currentTime < (sound.cues[kind] || 0);
    sfx(kind, volume, position);
    status.textContent = skipped ? `${kind}: skipped, still in its ${sfx_by_kind[kind].limit} s cooldown` : `${kind}: played`;
}
