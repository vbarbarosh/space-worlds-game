// Settings, one panel for the menu, pause, the station and the HUD: music, sound, effects and fullscreen
// as switches, the volumes under them. Every switch does what its old toolbar button did.
let settings_music_volume = 0.65;

for (const v of document.querySelectorAll('[data-setting] [data-value]')) {
    v.addEventListener('click', function () {
        settings_set(v.parentElement.dataset.setting, v.dataset.value);
    });
}
document.getElementById('settings_fullscreen').addEventListener('click', toggle_fullscreen);
document.addEventListener('fullscreenchange', sync_settings_rows);

function settings_set(name, value)
{
    if (name === 'music') {
        if ((value === 'off') && (volume_settings.music > 0)) {
            settings_music_volume = volume_settings.music;
            set_audio_volume('music', 0);
        }
        else if ((value === 'on') && (volume_settings.music === 0)) {
            set_audio_volume('music', Math.round((settings_music_volume || 0.65)*100));
        }
    }
    else if ((name === 'sound') && ((value === 'off') !== muted)) {
        toggle_sound();
    }
    else if ((name === 'effects') && ((value === 'on') !== full_fx)) {
        full_fx = !full_fx;
    }
    sync_settings();
    sync_settings_rows();
}

// Each switch shows what is on now
function sync_settings_rows()
{
    const now = {
        music: (volume_settings.music > 0) ? 'on' : 'off',
        sound: muted ? 'off' : 'on',
        effects: full_fx ? 'on' : 'off',
    };
    for (const v of document.querySelectorAll('[data-setting] [data-value]')) {
        const on = now[v.parentElement.dataset.setting] === v.dataset.value;
        v.classList.toggle('is-active', on);
        v.setAttribute('aria-pressed', String(on));
    }
    document.querySelector('#settings_fullscreen span').textContent = document.fullscreenElement ? 'Leave' : 'Enter';
}

function toggle_fullscreen()
{
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(function () {});
    }
    else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(function () {});
    }
}
