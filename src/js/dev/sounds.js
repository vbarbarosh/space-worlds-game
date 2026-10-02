// Sounds tab: one button per sound effect of src/js/sfx/, played through the game's own sfx().
function dev_sounds_fill()
{
    const rows = [];
    for (const kind of Object.keys(sfx_by_kind)) {
        const play = dev_button('Play', function () {
            dev_sound_play(kind);
        });
        rows.push({value: kind, cells: [kind, sfx_by_kind[kind].limit + ' s', play]});
    }
    dev_table_fill(document.getElementById('dev_sounds'), ['Sound', 'Cooldown', ''], rows, null, null);
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
