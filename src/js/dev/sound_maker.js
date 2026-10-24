// The sound maker: `?screen=sound-maker` (`&sound=blast` opens that one) makes the game's sound effects, and new ones,
// by ear. A sound is its layers, as its file of src/js/sfx/ plays them: tones (note) and noises (air), each a row of
// sliders. It plays through the game's own sfx(), so what it plays is what the game plays, and its picture is that
// sound rendered offline through the game's whole mix. Each change is kept in this browser; Fly with it is an arcade
// run with the changed sounds in place of the game's (&sounds=made), Copy gives the sound as its sfx file, WAV
// downloads it. The game stays paused behind it, its music and hum stopped.
const dev_maker_params = new URLSearchParams(location.search);
const dev_maker = {
    open: false,
    // &sounds=made: this browser's changed sounds played in place of the game's (dev_maker_sounds_apply)
    made: dev_maker_params.get('sounds') === 'made',
    // the sound open: a kind of sfx_by_kind, or a new sound's id ('new:3'); its model, {name, limit, spread, layers}
    id: '',
    sound: null,
    undo: [],
    redo: [],
    // the last offline render of the sound open, and the order it was asked in (an older one landing late is dropped)
    buffer: null,
    asked: 0,
    drawn: 0,
    message: '',
};
// the game's sounds as their files have them, read before &sounds=made puts this browser's changes in their place
const dev_maker_game = {...sfx_by_kind};
// a sound holds at most this many layers: each a voice, and a held gun plays several at once
const dev_maker_max_layers = 32;
const dev_maker_sample_rate = 48000;
// the slider of a number: its range, and whether it moves on a log scale (pitches, lengths)
const dev_maker_scales = {
    hz: {min: 20, max: 16000, log: true, step: 1},
    time: {min: 0.005, max: 6, log: true, step: 0.001},
    level: {min: 0, max: 0.5, step: 0.001},
    delay: {min: 0, max: 4, step: 0.005},
    limit: {min: 0.02, max: 3, log: true, step: 0.005},
    spread: {min: 0, max: 0.3, step: 0.005},
};
// A layer's numbers, as note() and air() of sfx() take them; `none`: 0 leaves it out (no slide, no sweep); `pitch`: a
// pitch the sound's spread moves; the waves and the filters a select
const dev_maker_fields = {
    tone: [
        {key: 'f', label: 'Pitch', unit: 'Hz', scale: 'hz', pitch: true},
        {key: 'end', label: 'Slides to', unit: 'Hz', scale: 'hz', pitch: true, none: true},
        {key: 'd', label: 'Length', unit: 's', scale: 'time'},
        {key: 'a', label: 'Loudness', unit: '', scale: 'level'},
        {key: 'delay', label: 'Starts at', unit: 's', scale: 'delay'},
        {key: 'cutoff', label: 'Muffle above', unit: 'Hz', scale: 'hz'},
        {key: 'type', label: 'Wave', options: [['sine', 'sine'], ['triangle', 'triangle'], ['square', 'square'], ['sawtooth', 'sawtooth']]},
    ],
    noise: [
        {key: 'f', label: 'Band', unit: 'Hz', scale: 'hz', pitch: true},
        {key: 'sweep', label: 'Sweeps to', unit: 'Hz', scale: 'hz', pitch: true, none: true},
        {key: 'd', label: 'Length', unit: 's', scale: 'time'},
        {key: 'a', label: 'Loudness', unit: '', scale: 'level'},
        {key: 'delay', label: 'Starts at', unit: 's', scale: 'delay'},
        {key: 'filter', label: 'Filter', options: [['', 'a band round it'], ['lowpass', 'all under it'], ['highpass', 'all over it']]},
    ],
};
// what a new layer starts as
const dev_maker_new_layers = {
    tone: {kind: 'tone', f: 440, end: 0, d: 0.3, a: 0.05, type: 'sine', delay: 0, cutoff: 2200, vary: [], on: true},
    noise: {kind: 'noise', f: 1200, sweep: 0, d: 0.3, a: 0.05, delay: 0, filter: '', vary: [], on: true},
};

// The sound maker opens (dev_screen_open): the game paused under it, the sound of &sound= (a shot when none)
function dev_maker_open()
{
    dev_time.paused = true;
    dev_panel_refresh_time();
    dev_maker.open = true;
    document.body.classList.add('sound-making');
    const root = document.getElementById('sound_maker');
    set_hidden(root, false);
    dev_maker_listen(root);
    new ResizeObserver(dev_maker_draw).observe(document.getElementById('sm_wave'));
    const wanted = dev_maker_params.get('sound') || 'shot';
    dev_maker_select(dev_maker_ids().includes(wanted) ? wanted : 'shot');
    document.getElementById('sm_play').focus();
}

// The buttons, and the keys: the game hears none of them
function dev_maker_listen(root)
{
    for (const type of ['keydown', 'keyup', 'pointerdown', 'wheel']) {
        root.addEventListener(type, function (event) {
            event.stopPropagation();
        });
    }
    root.addEventListener('keydown', dev_maker_key);
    // a key with the focus outside the maker (on the page's body) is the maker's too
    addEventListener('keydown', function (event) {
        if (dev_maker.open && !root.contains(event.target) && !event.target.closest?.('.dev-panel')) {
            event.stopImmediatePropagation();
            dev_maker_key(event);
        }
    }, true);
    const buttons = {
        sm_play: () => dev_maker_play(),
        sm_hold: dev_maker_hold,
        sm_undo: () => dev_maker_undo(true),
        sm_redo: () => dev_maker_undo(false),
        sm_fly: dev_maker_fly,
        sm_copy: dev_maker_copy,
        sm_wav: dev_maker_wav,
        sm_reset: dev_maker_reset,
        sm_add_tone: () => dev_maker_add('tone'),
        sm_add_noise: () => dev_maker_add('noise'),
    };
    for (const [id, on_click] of Object.entries(buttons)) {
        document.getElementById(id).addEventListener('click', on_click);
    }
}

// A key: Space plays, Ctrl+Z undoes, Ctrl+Shift+Z (or Ctrl+Y) redoes, ` folds the dev panel; a key typed in a field is
// the field's
function dev_maker_key(event)
{
    if (!dev_maker.open) {
        return;
    }
    const typing = event.target.matches?.('input[type=number], input[type=text], select, textarea');
    const ctrl = event.ctrlKey || event.metaKey;
    if ((event.code === 'Space') && !typing && !event.target.matches?.('button')) {
        event.preventDefault();
        dev_maker_play();
    }
    else if (ctrl && (event.code === 'KeyZ') && !typing) {
        event.preventDefault();
        dev_maker_undo(!event.shiftKey);
    }
    else if (ctrl && (event.code === 'KeyY') && !typing) {
        event.preventDefault();
        dev_maker_undo(false);
    }
    else if ((event.code === 'Backquote') && !typing && !event.repeat) {
        event.preventDefault();
        dev_panel_collapse_toggle();
    }
}

// The sounds the list shows: the game's, then this browser's new ones
function dev_maker_ids()
{
    return [...Object.keys(dev_maker_game), ...dev_maker_new_get().map(v => v.id)];
}

function dev_maker_is_new(id)
{
    return id.startsWith('new:');
}

// Opens a sound: this browser's change of it, else the game's
function dev_maker_select(id)
{
    dev_maker.id = id;
    dev_maker.sound = dev_maker_is_new(id) ? dev_maker_new_get().find(v => v.id === id).sound : (dev_maker_edit_get(id) || dev_maker_from_game(id));
    dev_maker.undo = [];
    dev_maker.redo = [];
    dev_maker.message = '';
    const params = new URLSearchParams(location.search);
    params.set('sound', id);
    history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
    dev_maker_side_fill();
    dev_maker_fill();
}

// A game's sound as its layers: its play() run with note() and air() writing down what they are asked for; run again
// with the lowest and the highest Math.random() to see which pitches its random factor moves, and how far
function dev_maker_from_game(kind)
{
    const effect = dev_maker_game[kind];
    function calls(random) {
        const out = [];
        const was = {random: Math.random, duck_until: sound.duck_until};
        Math.random = function () {
            return random;
        };
        try {
            // to six digits (a fifth up from 146.83 Hz is 219.99567 Hz: 219.996)
            const n = dev_maker_round;
            effect.play(function (f, d, a, end = null, type = 'sine', delay = 0, cutoff = 2200) {
                out.push({kind: 'tone', f: n(f), end: n(end || 0), d: n(d), a: n(a), type, delay: n(delay), cutoff: n(cutoff)});
            }, function (d, a, f, delay = 0, sweep = 0, filter = '') {
                out.push({kind: 'noise', f: n(f), sweep: n(sweep || 0), d: n(d), a: n(a), delay: n(delay), filter});
            }, 0);
        }
        finally {
            Math.random = was.random;
            sound.duck_until = was.duck_until;
        }
        return out;
    }
    const mid = calls(0.5);
    const low = calls(0);
    const high = calls(0.999999);
    let spread = 0;
    const layers = mid.map(function (v, i) {
        const vary = [];
        for (const field of dev_maker_fields[v.kind].filter(vv => vv.pitch)) {
            const lo = low[i]?.[field.key];
            const hi = high[i]?.[field.key];
            if (lo && hi && (Math.abs(hi - lo) > 1e-9)) {
                vary.push(field.key);
                spread = Math.max(spread, Math.abs(hi - lo)/(hi + lo));
            }
        }
        return {...v, vary, on: true};
    });
    return {name: kind, limit: effect.limit, spread: dev_maker_round(spread), layers};
}

// This browser's change of a game's sound, or null; a sound read from storage is checked whole (dev_maker_clean)
function dev_maker_edit_get(kind)
{
    try {
        return dev_maker_clean(JSON.parse(localStorage.getItem(`sound_edit:${kind}`) || 'null'), kind);
    }
    catch {
        return null;
    }
}

// Keeps the change of a game's sound (null forgets it); whether storage took it
function dev_maker_edit_set(kind, sound_model)
{
    try {
        if (sound_model) {
            localStorage.setItem(`sound_edit:${kind}`, JSON.stringify(sound_model));
        }
        else {
            localStorage.removeItem(`sound_edit:${kind}`);
        }
        return true;
    }
    catch {
        return false;
    }
}

// This browser's new sounds, [{id, sound}]
function dev_maker_new_get()
{
    let list = [];
    try {
        list = JSON.parse(localStorage.getItem('sound_maker_new') || '[]');
    }
    catch {
        // no storage, or what it holds is not a list: none
    }
    if (!Array.isArray(list)) {
        return [];
    }
    return list.map(v => ({id: String(v?.id || ''), sound: dev_maker_clean(v?.sound, 'new')}))
        .filter(v => /^new:\d+$/.test(v.id) && v.sound);
}

function dev_maker_new_set(list)
{
    try {
        localStorage.setItem('sound_maker_new', JSON.stringify(list));
        return true;
    }
    catch {
        return false;
    }
}

// A sound as storage gave it, every number inside its slider's range, every word one of the choices: or null
function dev_maker_clean(v, fallback_name)
{
    if (!v || (typeof v !== 'object') || !Array.isArray(v.layers)) {
        return null;
    }
    const layers = v.layers.slice(0, dev_maker_max_layers).filter(vv => dev_maker_fields[vv?.kind]).map(function (layer) {
        const out = {kind: layer.kind, vary: [], on: layer.on !== false};
        for (const field of dev_maker_fields[layer.kind]) {
            if (field.options) {
                const values = field.options.map(vv => vv[0]);
                out[field.key] = values.includes(layer[field.key]) ? layer[field.key] : values[0];
            }
            else {
                out[field.key] = dev_maker_clamp(field, Number(layer[field.key]));
                if (field.pitch && Array.isArray(layer.vary) && layer.vary.includes(field.key)) {
                    out.vary.push(field.key);
                }
            }
        }
        return out;
    });
    const name = String(v.name || fallback_name).replace(/\s+/g, ' ').trim().slice(0, 60) || fallback_name;
    const limit = dev_maker_clamp({scale: 'limit'}, Number(v.limit));
    const spread = dev_maker_clamp({scale: 'spread'}, Number(v.spread));
    return {name, limit, spread, layers};
}

// A number into its field's range; 0 stays for a field that 0 leaves out; not a number: the range's least
function dev_maker_clamp(field, value)
{
    const scale = dev_maker_scales[field.scale];
    if (field.none && (value === 0)) {
        return 0;
    }
    if (!Number.isFinite(value)) {
        return field.none ? 0 : scale.min;
    }
    return dev_maker_round(clamp(value, scale.min, scale.max));
}

// six significant digits: every number of the sfx files as written (1174.66 Hz); a slider lands on four (629.5 Hz)
function dev_maker_round(value, digits = 6)
{
    return Number(Number(value).toPrecision(digits));
}

// The sound open as an sfx effect, {limit, play}: each layer that is on, its pitches moved by one random factor a play
function dev_maker_effect(sound_model)
{
    return {
        limit: sound_model.limit,
        play: function (note, air, t) {
            const r = 1 + sound_model.spread*(Math.random()*2 - 1);
            for (const v of sound_model.layers) {
                if (!v.on) {
                    continue;
                }
                function pitch(key) {
                    return v.vary.includes(key) ? v[key]*r : v[key];
                }
                if (v.kind === 'tone') {
                    note(pitch('f'), v.d, v.a, v.end ? pitch('end') : null, v.type, v.delay, v.cutoff);
                }
                else {
                    air(v.d, v.a, pitch('f'), v.delay, v.sweep ? pitch('sweep') : 0, v.filter);
                }
            }
        },
    };
}

// On the dev page with &sounds=made: every game's sound this browser changed plays in place of the game's
function dev_maker_sounds_apply()
{
    if (!dev_maker.made) {
        return [];
    }
    const out = [];
    for (const kind of Object.keys(dev_maker_game)) {
        const edit = dev_maker_edit_get(kind);
        if (edit) {
            sfx_by_kind[kind] = dev_maker_effect(edit);
            out.push(kind);
        }
    }
    return out;
}

// On the dev page's Fly with it: a word that the sounds heard are this browser's, not the game's
function dev_maker_fly_note(changed)
{
    if (!dev_maker.made || dev_maker.open) {
        return;
    }
    const names = changed.length ? changed.join(', ').toUpperCase() : 'NONE CHANGED';
    show_toast('MADE SOUNDS', `${names} · FROM THE SOUND MAKER · THIS BROWSER ONLY`, 5);
}

// The audio, started on a click (a browser starts none before one), quiet but for the sounds played here: no music,
// no engine hum, no ambience
function dev_maker_audio()
{
    start_audio();
    if (!sound.ctx) {
        return false;
    }
    if (sound.timer) {
        clearInterval(sound.timer);
        sound.timer = null;
    }
    const now = sound.ctx.currentTime;
    for (const gain of [sound.music_trim.gain, sound.ambient_bus.gain, sound.flight.engine.gain, sound.flight.air_gain.gain]) {
        gain.cancelScheduledValues(now);
        gain.setTargetAtTime(0, now, 0.03);
    }
    return true;
}

// Why nothing would be heard, or ''
function dev_maker_silent_reason()
{
    if (!sound.ctx) {
        return 'Audio is not available in this browser.';
    }
    if (muted) {
        return 'All sound is off: the ♫ button of the game, or M, turns it on.';
    }
    if ((volume_settings.master === 0) || (volume_settings.effects === 0)) {
        return 'The master or the effects volume is at zero (Settings).';
    }
    if (!dev_maker.sound.layers.some(v => v.on && (v.a > 0))) {
        return 'Nothing to play: every layer is off or silent.';
    }
    return '';
}

// Plays the sound (or one layer of it) through the game's sfx(), at `when`; its cooldown never holds it back here
function dev_maker_sfx(sound_model, when)
{
    const key = 'sound_maker';
    sfx_by_kind[key] = dev_maker_effect(sound_model);
    delete sound.cues[key];
    sfx(key, 1, null, when);
    delete sfx_by_kind[key];
}

function dev_maker_play(layer = null)
{
    if (!dev_maker_audio()) {
        dev_maker_say(dev_maker_silent_reason());
        return;
    }
    const sound_model = layer ? {...dev_maker.sound, layers: [{...layer, on: true}]} : dev_maker.sound;
    dev_maker_sfx(sound_model);
    dev_maker_say(dev_maker_silent_reason());
}

// Hold: the sound again and again for 2 s, as a held trigger fires: 8 a second, or its cooldown when that is longer
function dev_maker_hold()
{
    if (!dev_maker_audio()) {
        dev_maker_say(dev_maker_silent_reason());
        return;
    }
    const every = Math.max(dev_maker.sound.limit, 0.125);
    const t = sound.ctx.currentTime + 0.02;
    for (let i = 0, end = Math.max(1, Math.floor(2/every)); i < end; ++i) {
        dev_maker_sfx(dev_maker.sound, t + i*every);
    }
    dev_maker_say(dev_maker_silent_reason() || `Held: ${(1/every).toFixed(1)} a second for 2 s.`);
}

function dev_maker_say(text)
{
    dev_maker.message = text;
    document.getElementById('sm_status').textContent = text;
}

// The sound changed: kept, a step to undo, its picture and its row redrawn; with `play`, heard at once
function dev_maker_commit(before, play)
{
    dev_maker_say('');
    dev_maker.undo.push(before);
    dev_maker.redo = [];
    dev_maker_store();
    dev_maker_side_fill();
    dev_maker_fill_bar();
    dev_maker_render();
    if (play && document.getElementById('sm_autoplay').checked) {
        dev_maker_play();
    }
}

// The sound open into storage: a game's as its change (the same as the game's: none), a new one in its list
function dev_maker_store()
{
    let kept;
    if (dev_maker_is_new(dev_maker.id)) {
        kept = dev_maker_new_set(dev_maker_new_get().map(v => (v.id === dev_maker.id) ? {id: v.id, sound: dev_maker.sound} : v));
    }
    else {
        const same = JSON.stringify(dev_maker.sound) === JSON.stringify(dev_maker_from_game(dev_maker.id));
        kept = dev_maker_edit_set(dev_maker.id, same ? null : dev_maker.sound);
    }
    if (!kept) {
        dev_maker_say('This browser keeps no storage here: the change lasts until the page is closed.');
    }
}

function dev_maker_undo(back)
{
    const from = back ? dev_maker.undo : dev_maker.redo;
    const to = back ? dev_maker.redo : dev_maker.undo;
    if (!from.length) {
        return;
    }
    to.push(JSON.stringify(dev_maker.sound));
    dev_maker.sound = JSON.parse(from.pop());
    dev_maker_store();
    dev_maker_side_fill();
    dev_maker_fill();
}

function dev_maker_add(kind)
{
    if (dev_maker.sound.layers.length >= dev_maker_max_layers) {
        return;
    }
    const before = JSON.stringify(dev_maker.sound);
    const last = dev_maker.sound.layers.at(-1);
    dev_maker.sound.layers.push({...dev_maker_new_layers[kind], vary: [], delay: 0});
    dev_maker_commit(before, false);
    dev_maker_fill_layers();
    document.getElementById('sm_layers').lastElementChild?.scrollIntoView({block: 'nearest'});
    dev_maker_say(last ? '' : 'A first layer: its sliders change it, Space plays it.');
}

// Reset: a game's sound back to its file (this browser's change forgotten); a new sound deleted
function dev_maker_reset()
{
    const id = dev_maker.id;
    if (dev_maker_is_new(id)) {
        if (!confirm(`Delete the new sound “${dev_maker.sound.name}”?`)) {
            return;
        }
        dev_maker_new_set(dev_maker_new_get().filter(v => v.id !== id));
        dev_maker_select('shot');
        return;
    }
    if (!dev_maker_edit_get(id)) {
        dev_maker_say(`${id} is the game's own: nothing to reset.`);
        return;
    }
    if (!confirm(`Forget this browser's change of ${id} and go back to src/js/sfx/${id}.js?`)) {
        return;
    }
    dev_maker_edit_set(id, null);
    dev_maker_select(id);
    dev_maker_say(`${id}: the game's own again.`);
}

// A new sound: a copy of the one open (`copy`), or one plain tone; it has no place in the game until its file is
function dev_maker_new(copy)
{
    const list = dev_maker_new_get();
    const n = list.reduce((max, v) => Math.max(max, Number(v.id.slice(4))), 0) + 1;
    const sound_model = copy
        ? {...JSON.parse(JSON.stringify(dev_maker.sound)), name: `${dev_maker.sound.name} copy`.slice(0, 60)}
        : {name: `new sound ${n}`, limit: 0.1, spread: 0, layers: [{...dev_maker_new_layers.tone, vary: []}]};
    list.push({id: `new:${n}`, sound: sound_model});
    if (!dev_maker_new_set(list)) {
        dev_maker_say('This browser keeps no storage here: a new sound cannot be kept.');
        return;
    }
    dev_maker_select(`new:${n}`);
}

// Fly with it: an arcade run in the Scenario's world, with this browser's changed sounds (dev.html with &sounds=made)
function dev_maker_fly()
{
    dev_maker.made = true;
    dev_scenario.started = true;
    dev_scenario_save();
    const params = new URLSearchParams(location.search);
    params.set('screen', 'arcade');
    location.assign(`${location.pathname}?${params.toString()}`);
}

// The sound as its file of src/js/sfx/: the layers that are on, the pitches its spread moves written `*r`
function dev_maker_file_text(sound_model, id)
{
    const name = dev_maker_is_new(id) ? sound_model.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'new' : id;
    const lines = [];
    if (sound_model.layers.some(v => v.on && v.vary.length)) {
        const s = sound_model.spread;
        lines.push(`        const r = ${dev_maker_round(1 - s)} + Math.random()*${dev_maker_round(2*s)};`);
    }
    const layers_on = sound_model.layers.filter(v => v.on);
    for (const v of layers_on) {
        function n(key) {
            return v.vary.includes(key) ? `${v[key]}*r` : String(v[key]);
        }
        const args = (v.kind === 'tone')
            ? [n('f'), v.d, v.a, v.end ? n('end') : 'null', `'${v.type}'`, v.delay, v.cutoff]
            : [v.d, v.a, n('f'), v.delay, v.sweep ? n('sweep') : 0, `'${v.filter}'`];
        // the arguments at the end that are as the function's defaults go
        const defaults = (v.kind === 'tone') ? [null, null, null, 'null', '\'sine\'', '0', '2200'] : [null, null, null, '0', '0', '\'\''];
        while ((args.length > 3) && (String(args.at(-1)) === defaults[args.length - 1])) {
            args.pop();
        }
        lines.push(`        ${(v.kind === 'tone') ? 'note' : 'air'}(${args.join(', ')});`);
    }
    return [
        `// ${sound_model.name}: made in the sound maker of the dev page`,
        `const sfx_${name} = {`,
        `    limit: ${sound_model.limit},`,
        '    play: function (note, air, t) {',
        ...lines,
        '    },',
        '};',
        '',
    ].join('\n');
}

// Copy: the sound's file on the clipboard
function dev_maker_copy()
{
    const text = dev_maker_file_text(dev_maker.sound, dev_maker.id);
    function done(ok) {
        dev_maker_say(ok ? `Copied ${dev_maker.sound.name} as its sfx file: paste it into a message.` : 'The clipboard said no: use WAV, or try again.');
    }
    try {
        navigator.clipboard.writeText(text).then(() => done(true), () => done(false));
    }
    catch {
        done(false);
    }
}

// WAV: the sound as the game's mix renders it, 16-bit mono
function dev_maker_wav()
{
    const buffer = dev_maker.buffer;
    if (!buffer) {
        dev_maker_say('Nothing to save: the sound has no layer on.');
        return;
    }
    const data = buffer.getChannelData(0);
    const wav = new DataView(new ArrayBuffer(44 + data.length*2));
    function text(at, s) {
        for (let i = 0, end = s.length; i < end; ++i) {
            wav.setUint8(at + i, s.charCodeAt(i));
        }
    }
    text(0, 'RIFF');
    wav.setUint32(4, 36 + data.length*2, true);
    text(8, 'WAVEfmt ');
    wav.setUint32(16, 16, true);
    wav.setUint16(20, 1, true);
    wav.setUint16(22, 1, true);
    wav.setUint32(24, buffer.sampleRate, true);
    wav.setUint32(28, buffer.sampleRate*2, true);
    wav.setUint16(32, 2, true);
    wav.setUint16(34, 16, true);
    text(36, 'data');
    wav.setUint32(40, data.length*2, true);
    for (let i = 0, end = data.length; i < end; ++i) {
        wav.setInt16(44 + i*2, clamp(data[i], -1, 1)*32767, true);
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([wav], {type: 'audio/wav'}));
    a.download = `${dev_maker.sound.name.replace(/[^\w.-]+/g, '_')}.wav`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    dev_maker_say(`Downloaded ${a.download}.`);
}

// The sound rendered offline through the game's own mix (create_audio_graph on an OfflineAudioContext: the effects
// bus, the master, its compressor and limiter, at this browser's volumes), the live audio put back as it was
async function dev_maker_render()
{
    const asked = ++dev_maker.asked;
    const sound_model = dev_maker.sound;
    const end = sound_model.layers.filter(v => v.on).reduce((max, v) => Math.max(max, v.delay + v.d), 0);
    if (!end || !window.OfflineAudioContext) {
        dev_maker.buffer = null;
        dev_maker.drawn = asked;
        dev_maker_draw();
        return;
    }
    // the sound and a little after it, for the mix's release
    const seconds = Math.min(end*1.08 + 0.04, 10);
    // played a little after the start, as live audio plays it into a mix already running (one played at the very
    // start renders 10 dB quieter), the lead cut off after
    const lead = Math.round(dev_maker_sample_rate*0.05);
    const length = Math.ceil(dev_maker_sample_rate*seconds);
    const context = new OfflineAudioContext(1, lead + length, dev_maker_sample_rate);
    const was = {...sound};
    const was_muted = muted;
    muted = false;
    try {
        create_audio_graph(context);
        dev_maker_sfx(sound_model, lead/dev_maker_sample_rate);
    }
    finally {
        Object.assign(sound, was);
        muted = was_muted;
    }
    const rendered = await context.startRendering();
    if (asked < dev_maker.drawn) {
        return;
    }
    const buffer = new AudioBuffer({length, sampleRate: dev_maker_sample_rate, numberOfChannels: 1});
    buffer.copyToChannel(rendered.getChannelData(0).subarray(lead), 0);
    dev_maker.buffer = buffer;
    dev_maker.drawn = asked;
    dev_maker_draw();
}

// The picture: the wave as the game plays it (its loudest and quietest each pixel), drawn to the picture's height
// whatever its level (the readout says how loud), a line every 0.01 to 1 s as its length asks, and under it each
// layer's time as a bar, a tone's in the accent, a noise's in amber, a layer off dimmed
function dev_maker_draw()
{
    const canvas = document.getElementById('sm_wave');
    if (!dev_maker.open || !canvas.clientWidth) {
        return;
    }
    const ratio = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w*ratio);
    canvas.height = Math.round(h*ratio);
    const c = canvas.getContext('2d');
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    const style = getComputedStyle(canvas);
    const accent = style.getPropertyValue('--dev-accent').trim();
    const muted_color = style.getPropertyValue('--dev-muted').trim();
    const line = style.getPropertyValue('--dev-line').trim();
    const noise_color = '#e0a030';
    c.clearRect(0, 0, w, h);
    const layers = dev_maker.sound.layers;
    const lane = Math.min(8, Math.max(3, Math.floor((h*0.35)/Math.max(1, layers.length))));
    const lanes_h = layers.length ? Math.min(h*0.4, layers.length*lane) : 0;
    const wave_h = h - lanes_h - 16;
    const buffer = dev_maker.buffer;
    const seconds = buffer ? buffer.duration : 1;
    function x_of(s) {
        return (s/seconds)*w;
    }
    c.strokeStyle = line;
    c.fillStyle = muted_color;
    c.font = '11px ui-sans-serif, system-ui, sans-serif';
    c.lineWidth = 1;
    const tick = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1].find(v => seconds/v <= Math.max(2, Math.floor(w/90))) || 2;
    for (let i = 0; i*tick <= seconds + 1e-9; ++i) {
        const x = Math.round(x_of(i*tick)) + 0.5;
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, wave_h);
        c.stroke();
        if (x < w - 40) {
            c.fillText(`${Number((i*tick).toFixed(2))} s`, x + 3, wave_h + 12);
        }
    }
    const mid = wave_h/2;
    c.beginPath();
    c.moveTo(0, mid + 0.5);
    c.lineTo(w, mid + 0.5);
    c.stroke();
    if (buffer) {
        const data = buffer.getChannelData(0);
        const per = data.length/w;
        const peak = data.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
        const gain = (peak > 0) ? 0.92/peak : 1;
        c.fillStyle = accent;
        for (let x = 0; x < w; x++) {
            let lo = 0;
            let hi = 0;
            for (let i = Math.floor(x*per), end = Math.min(data.length, Math.floor((x + 1)*per)); i < end; ++i) {
                lo = Math.min(lo, data[i]);
                hi = Math.max(hi, data[i]);
            }
            c.fillRect(x, mid - hi*gain*mid, 1, Math.max(1, (hi - lo)*gain*mid));
        }
    }
    else {
        c.fillStyle = muted_color;
        c.font = '13px ui-sans-serif, system-ui, sans-serif';
        c.fillText(layers.length ? 'Every layer is off: silence.' : 'No layers yet: + Tone or + Noise below.', 10, mid - 6);
    }
    for (let i = 0, end = layers.length; i < end; ++i) {
        const v = layers[i];
        c.globalAlpha = v.on ? 0.9 : 0.3;
        c.fillStyle = (v.kind === 'tone') ? accent : noise_color;
        const x = x_of(v.delay);
        c.fillRect(x, h - lanes_h + i*lane, Math.max(2, x_of(v.delay + v.d) - x), Math.max(2, lane - 1));
    }
    c.globalAlpha = 1;
    dev_maker_readout();
}

// Under the picture: how loud and how long, as the game's mix gives it
function dev_maker_readout()
{
    const readout = document.getElementById('sm_readout');
    const buffer = dev_maker.buffer;
    const count = dev_maker.sound.layers.length;
    const layers = `${count} layer${(count === 1) ? '' : 's'}`;
    if (!buffer) {
        readout.textContent = layers;
        return;
    }
    const data = buffer.getChannelData(0);
    let peak = 0;
    let last = 0;
    for (let i = 0, end = data.length; i < end; ++i) {
        const a = Math.abs(data[i]);
        peak = Math.max(peak, a);
        if (a > 0.001) {
            last = i;
        }
    }
    const db = (peak > 0) ? `${(20*Math.log10(peak)).toFixed(1)} dB` : 'silent';
    const loud = (peak > 0.85) ? ' · at the limiter: louder will not be louder' : '';
    readout.textContent = `Peak ${db} · heard for ${(last/buffer.sampleRate).toFixed(2)} s · ${layers}${loud}`;
}

// The list of sounds: the game's (a dot on those this browser changed), this browser's new ones, and New
function dev_maker_side_fill()
{
    const side = document.getElementById('sm_side');
    side.replaceChildren();
    function row(id, label, changed) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sm-item';
        button.title = changed ? `${label}: changed in this browser` : label;
        button.setAttribute('aria-pressed', String(id === dev_maker.id));
        const dot = document.createElement('span');
        dot.className = 'sm-dot';
        dot.classList.toggle('hidden', !changed);
        const text = document.createElement('span');
        text.className = 'sm-label';
        text.textContent = label;
        button.append(dot, text);
        button.addEventListener('click', () => dev_maker_select(id));
        return button;
    }
    const game = document.createElement('h3');
    game.textContent = 'The game\'s';
    side.append(game);
    for (const kind of Object.keys(dev_maker_game)) {
        side.append(row(kind, kind, !!dev_maker_edit_get(kind)));
    }
    const mine = document.createElement('h3');
    mine.textContent = 'New';
    side.append(mine);
    for (const v of dev_maker_new_get()) {
        side.append(row(v.id, v.sound.name, false));
    }
    const buttons = document.createElement('span');
    buttons.className = 'sm-new';
    const blank = document.createElement('button');
    blank.type = 'button';
    blank.className = 'me-btn';
    blank.textContent = '+ New';
    blank.title = 'A new sound, one plain tone to start from';
    blank.addEventListener('click', () => dev_maker_new(false));
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'me-btn';
    copy.textContent = '+ Copy of this';
    copy.title = 'A new sound, made from the one open';
    copy.addEventListener('click', () => dev_maker_new(true));
    buttons.append(blank, copy);
    side.append(buttons);
}

// The whole of the sound open: the bar, its own numbers, its layers, its picture
function dev_maker_fill()
{
    dev_maker_fill_bar();
    dev_maker_fill_sound();
    dev_maker_fill_layers();
    dev_maker_say(dev_maker.message);
    dev_maker_render();
}

function dev_maker_fill_bar()
{
    const is_new = dev_maker_is_new(dev_maker.id);
    const changed = !is_new && !!dev_maker_edit_get(dev_maker.id);
    const where = is_new ? 'new, this browser' : (changed ? 'changed, this browser' : `src/js/sfx/${dev_maker.id}.js`);
    document.getElementById('sm_title').textContent = `SOUND · ${dev_maker.sound.name} · ${where}`;
    document.getElementById('sm_undo').disabled = !dev_maker.undo.length;
    document.getElementById('sm_redo').disabled = !dev_maker.redo.length;
    document.getElementById('sm_reset').textContent = is_new ? 'Delete' : 'Reset';
    document.getElementById('sm_reset').disabled = !is_new && !changed;
    document.getElementById('sm_add_tone').disabled = document.getElementById('sm_add_noise').disabled = dev_maker.sound.layers.length >= dev_maker_max_layers;
}

// The sound's own numbers: a new one's name, the cooldown, the spread of its pitches
function dev_maker_fill_sound()
{
    const box = document.getElementById('sm_sound');
    box.replaceChildren();
    if (dev_maker_is_new(dev_maker.id)) {
        const label = document.createElement('label');
        label.className = 'sm-field sm-name';
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 60;
        input.value = dev_maker.sound.name;
        input.addEventListener('change', function () {
            const before = JSON.stringify(dev_maker.sound);
            dev_maker.sound.name = input.value.replace(/\s+/g, ' ').trim().slice(0, 60) || dev_maker.sound.name;
            input.value = dev_maker.sound.name;
            dev_maker_commit(before, false);
        });
        label.append(dev_maker_text('span', 'Name'), input);
        box.append(label);
    }
    box.append(dev_maker_slider(dev_maker.sound, {key: 'limit', label: 'Cooldown', unit: 's', scale: 'limit', title: 'The least time between two plays of it: one asked for sooner is not played'}));
    box.append(dev_maker_slider(dev_maker.sound, {key: 'spread', label: 'Pitch spread', unit: '%', scale: 'spread', title: 'Each play moves the pitches marked ± by up to this much, up or down, so a stream of them does not ring as one'}));
}

// The layers, a card each: its kind, play it alone, on, ± (the spread moves its pitches), up, a copy, delete; its numbers
function dev_maker_fill_layers()
{
    const list = document.getElementById('sm_layers');
    list.replaceChildren();
    const layers = dev_maker.sound.layers;
    for (let i = 0, end = layers.length; i < end; ++i) {
        const v = layers[i];
        const item = document.createElement('li');
        item.className = `sm-layer sm-${v.kind}`;
        item.classList.toggle('sm-off', !v.on);
        const head = document.createElement('div');
        head.className = 'sm-head';
        const play = dev_maker_button('▶', `Play this ${v.kind} alone`, () => dev_maker_play(v));
        const title = dev_maker_text('b', `${i + 1} · ${(v.kind === 'tone') ? 'Tone' : 'Noise'}`);
        const on = dev_maker_check('on', 'Off: left out of the sound, kept here', v.on, function (checked) {
            dev_maker_change(function () {
                v.on = checked;
            }, true);
            item.classList.toggle('sm-off', !v.on);
        });
        const pitch_keys = dev_maker_fields[v.kind].filter(vv => vv.pitch).map(vv => vv.key);
        const vary = dev_maker_check('± spread', 'The sound\'s pitch spread moves this layer\'s pitches', v.vary.length > 0, function (checked) {
            dev_maker_change(function () {
                v.vary = checked ? pitch_keys : [];
            }, true);
        });
        const tools = document.createElement('span');
        tools.className = 'sm-tools';
        const up = dev_maker_button('↑', 'Move it up', function () {
            dev_maker_change(() => layers.splice(i - 1, 0, ...layers.splice(i, 1)), false);
            dev_maker_fill_layers();
        });
        up.disabled = i === 0;
        const copy = dev_maker_button('Copy', 'A copy of this layer, under it', function () {
            dev_maker_change(() => layers.splice(i + 1, 0, JSON.parse(JSON.stringify(v))), false);
            dev_maker_fill_layers();
        });
        copy.disabled = layers.length >= dev_maker_max_layers;
        const remove = dev_maker_button('Delete', 'Delete this layer (Undo brings it back)', function () {
            dev_maker_change(() => layers.splice(i, 1), false);
            dev_maker_fill_layers();
        });
        remove.classList.add('me-danger');
        tools.append(up, copy, remove);
        head.append(play, title, on, vary, tools);
        const fields = document.createElement('div');
        fields.className = 'sm-fields';
        for (const field of dev_maker_fields[v.kind]) {
            fields.append(field.options ? dev_maker_select_field(v, field) : dev_maker_slider(v, field));
        }
        item.append(head, fields);
        list.append(item);
    }
}

// A change to the sound open, made by `change`; kept and drawn again, played with `play`
function dev_maker_change(change, play)
{
    const before = JSON.stringify(dev_maker.sound);
    change();
    dev_maker_commit(before, play);
}

// A number: its name, a slider (a log one for pitches and lengths) and the number to type; the slider redraws the
// picture as it moves and plays the sound when let go; a number typed is put inside the slider's range
function dev_maker_slider(target, field)
{
    const scale = dev_maker_scales[field.scale];
    const percent = field.unit === '%';
    const label = document.createElement('label');
    label.className = 'sm-field';
    if (field.title) {
        label.title = field.title;
    }
    const range = document.createElement('input');
    range.type = 'range';
    range.min = '0';
    range.max = '1000';
    range.setAttribute('aria-label', field.label);
    const number = document.createElement('input');
    number.type = 'number';
    number.step = String(percent ? 0.5 : scale.step);
    number.min = field.none ? '0' : String(percent ? scale.min*100 : scale.min);
    number.max = String(percent ? scale.max*100 : scale.max);
    number.setAttribute('aria-label', `${field.label}${field.unit ? `, ${field.unit}` : ''}`);
    function slider_of(value) {
        if (field.none && !value) {
            return 0;
        }
        const t = scale.log ? Math.log(value/scale.min)/Math.log(scale.max/scale.min) : (value - scale.min)/(scale.max - scale.min);
        return Math.round(clamp(t, 0, 1)*1000);
    }
    function value_of(position) {
        if (field.none && (position === 0)) {
            return 0;
        }
        const t = position/1000;
        return dev_maker_clamp(field, dev_maker_round(scale.log ? scale.min*Math.pow(scale.max/scale.min, t) : scale.min + t*(scale.max - scale.min), 4));
    }
    function show() {
        range.value = String(slider_of(target[field.key]));
        number.value = String(percent ? dev_maker_round(target[field.key]*100) : target[field.key]);
        number.placeholder = field.none ? 'none' : '';
        if (field.none && !target[field.key]) {
            number.value = '';
        }
    }
    let before = null;
    range.addEventListener('input', function () {
        before = before || JSON.stringify(dev_maker.sound);
        target[field.key] = value_of(Number(range.value));
        show();
        dev_maker_render();
    });
    range.addEventListener('change', function () {
        const was = before || JSON.stringify(dev_maker.sound);
        before = null;
        dev_maker_commit(was, true);
    });
    number.addEventListener('change', function () {
        const was = JSON.stringify(dev_maker.sound);
        const typed = (number.value.trim() === '') ? 0 : Number(number.value);
        target[field.key] = dev_maker_clamp(field, percent ? typed/100 : typed);
        show();
        dev_maker_commit(was, true);
    });
    show();
    const unit = dev_maker_text('span', field.unit);
    unit.className = 'sm-unit';
    label.append(dev_maker_text('span', field.label), range, number, unit);
    return label;
}

function dev_maker_select_field(target, field)
{
    const label = document.createElement('label');
    label.className = 'sm-field';
    const select = document.createElement('select');
    for (const [value, text] of field.options) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.append(option);
    }
    select.value = target[field.key];
    select.addEventListener('change', function () {
        dev_maker_change(function () {
            target[field.key] = select.value;
        }, true);
    });
    label.append(dev_maker_text('span', field.label), select);
    return label;
}

function dev_maker_button(text, title, on_click)
{
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'me-btn';
    button.textContent = text;
    button.title = title;
    button.addEventListener('click', on_click);
    return button;
}

function dev_maker_check(text, title, checked, on_change)
{
    const label = document.createElement('label');
    label.className = 'sm-check';
    label.title = title;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', () => on_change(input.checked));
    label.append(input, ` ${text}`);
    return label;
}

function dev_maker_text(tag, text)
{
    const out = document.createElement(tag);
    out.textContent = text;
    return out;
}
