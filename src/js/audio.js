// Offline synthesis: warm voices, a shared room and a separate flight ambience bus.
const sound = {
    ctx: null,
    master: null,
    fx_bus: null,
    music_bus: null,
    music_trim: null,
    ambient_bus: null,
    music_world: -1,
    music_level: null,
    retired_buses: [],
    noise: null,
    next: 0,
    step: 0,
    timer: null,
    voices: 0,
    peak_voices: 0,
    cues: {},
    duck_until: 0,
    combat: 0,
};
function create_audio_graph(context)
{
    sound.ctx = context;
    const c = context;
    sound.master = c.createGain();
    sound.master.gain.value = muted ? 0 : volume_settings.master;
    const compressor = c.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 18;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.015;
    compressor.release.value = 0.28;
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.ratio.value = 20;
    limiter.knee.value = 0;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    sound.master.connect(compressor);
    compressor.connect(limiter);
    limiter.connect(c.destination);
    sound.fx_bus = c.createGain();
    sound.fx_bus.gain.value = volume_settings.effects;
    sound.fx_bus.connect(sound.master);
    sound.music_trim = c.createGain();
    sound.music_trim.gain.value = volume_settings.music;
    sound.music_trim.connect(sound.master);
    sound.ambient_bus = c.createGain();
    sound.ambient_bus.gain.value = volume_settings.ambience;
    sound.ambient_bus.connect(sound.master);
    sound.noise = c.createBuffer(1, c.sampleRate*2, c.sampleRate);
    const data = sound.noise.getChannelData(0);
    let seed = 78531;
    let previous = 0;
    function random() {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return (seed/4294967296)*2 - 1;
    }
    for (let i = 0; i < data.length; i++) {
        previous = (previous + random()*0.11)/1.03;
        data[i] = previous*2.1;
    }
    sound.room = c.createConvolver();
    const impulse = c.createBuffer(2, c.sampleRate*2.6, c.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
        const d = impulse.getChannelData(channel);
        for (let i = 0; i < d.length; i++) {
            d[i] = random()*Math.pow(1 - i/d.length, 2.8)*((i < c.sampleRate*0.025) ? 0 : 0.3);
        }
    }
    sound.room.buffer = impulse;
    const wet = c.createGain();
    wet.gain.value = 0.3;
    sound.room.connect(wet);
    wet.connect(sound.music_trim);
    sound.cues = {};
    sound.music_world = -1;
    sound.retired_buses = [];
    sound.voices = 0;
    sound.peak_voices = 0;
    create_flight_audio();
    sound.next = c.currentTime + 0.08;
}

function start_audio()
{
    try {
        if (!sound.ctx) {
            const Context = window.AudioContext || window.webkitAudioContext;
            if (!Context) {
                return;
            }
            create_audio_graph(new Context());
            sound.timer = setInterval(schedule_music, 60);
        }
        if (sound.ctx.state === 'suspended') {
            sound.ctx.resume().catch(function () {});
        }
    }
    catch {
    }
}

function tone(frequency, duration, type, volume, when, end_frequency, filter_frequency, bus, shape = {})
{
    if (!sound.ctx || muted || (volume <= 0)) {
        return;
    }
    const c = sound.ctx;
    const t = (when === undefined) ? c.currentTime : when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    const nodes = [osc, gain];
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(Math.max(20, frequency), t);
    osc.detune.value = shape.detune || 0;
    if (end_frequency) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, end_frequency), t + duration);
    }
    const attack = Math.min(duration*0.4, shape.attack || 0.008);
    const release = Math.min(duration - attack, shape.release || (duration*0.75));
    const hold = t + duration - release;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + attack);
    gain.gain.linearRampToValueAtTime(volume*0.72, Math.max(t + attack, hold));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    gain.gain.linearRampToValueAtTime(0, t + duration + 0.02);
    let output = osc;
    if (filter_frequency) {
        const filter = c.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filter_frequency;
        filter.Q.value = 0.55;
        output.connect(filter);
        output = filter;
        nodes.push(filter);
    }
    output.connect(gain);
    output = gain;
    if (shape.pan) {
        const pan = c.createStereoPanner();
        pan.pan.value = clamp(shape.pan, -1, 1);
        output.connect(pan);
        output = pan;
        nodes.push(pan);
    }
    output.connect(bus || sound.fx_bus);
    osc.start(t);
    osc.stop(t + duration + 0.03);
    sound.voices++;
    sound.peak_voices = Math.max(sound.peak_voices, sound.voices);
    osc.onended = function () {
        for (const node of nodes) {
            node.disconnect();
        }
        sound.voices--;
    };
}

function noise(duration, volume, frequency, when, bus, shape = {})
{
    if (!sound.ctx || muted || (volume <= 0)) {
        return;
    }
    const c = sound.ctx;
    const t = (when === undefined) ? c.currentTime : when;
    const source = c.createBufferSource();
    const gain = c.createGain();
    const filter = c.createBiquadFilter();
    const nodes = [source, gain, filter];
    source.buffer = sound.noise;
    source.loop = true;
    source.playbackRate.value = shape.rate || 1;
    filter.type = shape.filter || 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = shape.q || 0.65;
    source.connect(filter);
    filter.connect(gain);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + Math.min(0.025, duration*0.15));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    gain.gain.linearRampToValueAtTime(0, t + duration + 0.02);
    let output = gain;
    if (shape.pan) {
        const pan = c.createStereoPanner();
        pan.pan.value = clamp(shape.pan, -1, 1);
        gain.connect(pan);
        output = pan;
        nodes.push(pan);
    }
    output.connect(bus || sound.fx_bus);
    source.start(t);
    source.stop(t + duration + 0.03);
    sound.voices++;
    sound.peak_voices = Math.max(sound.peak_voices, sound.voices);
    source.onended = function () {
        for (const node of nodes) {
            node.disconnect();
        }
        sound.voices--;
    };
}

function create_flight_audio()
{
    const c = sound.ctx;
    const engine = c.createGain();
    engine.gain.value = 0;
    engine.connect(sound.fx_bus);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    filter.Q.value = 0.5;
    filter.connect(engine);
    const body = c.createOscillator();
    const overtone = c.createOscillator();
    body.type = 'sine';
    overtone.type = 'sine';
    body.frequency.value = 62;
    overtone.frequency.value = 220;
    const body_gain = c.createGain();
    const overtone_gain = c.createGain();
    body_gain.gain.value = 0.34;
    overtone_gain.gain.value = 0.11;
    body.connect(body_gain);
    body_gain.connect(filter);
    overtone.connect(overtone_gain);
    overtone_gain.connect(filter);
    body.start();
    overtone.start();
    const shimmer = c.createOscillator();
    const shimmer_depth = c.createGain();
    shimmer.frequency.value = 0.23;
    shimmer_depth.gain.value = 11;
    shimmer.connect(shimmer_depth);
    shimmer_depth.connect(overtone.detune);
    shimmer.start();
    const air = c.createBufferSource();
    const air_filter = c.createBiquadFilter();
    const air_gain = c.createGain();
    air.buffer = sound.noise;
    air.loop = true;
    air_filter.type = 'bandpass';
    air_filter.frequency.value = 650;
    air_filter.Q.value = 0.5;
    air_gain.gain.value = 0;
    air.connect(air_filter);
    air_filter.connect(air_gain);
    air_gain.connect(sound.fx_bus);
    air.start();
    const space = c.createBufferSource();
    const space_filter = c.createBiquadFilter();
    const space_gain = c.createGain();
    space.buffer = sound.noise;
    space.loop = true;
    space.playbackRate.value = 0.42;
    space_filter.type = 'lowpass';
    space_filter.frequency.value = 480;
    space_gain.gain.value = 0;
    space.connect(space_filter);
    space_filter.connect(space_gain);
    space_gain.connect(sound.ambient_bus);
    space.start();
    const reactor = c.createOscillator();
    const reactor_gain = c.createGain();
    reactor.type = 'sine';
    reactor.frequency.value = 62;
    reactor_gain.gain.value = 0;
    reactor.connect(reactor_gain);
    reactor_gain.connect(sound.ambient_bus);
    reactor.start();
    sound.flight = {engine, body, overtone, filter, air_gain, air_filter, space_gain, space_filter, reactor, reactor_gain};
}

function update_audio_scene()
{
    const c = sound.ctx;
    const f = sound.flight;
    if (!c || !f) {
        return;
    }
    const now = c.currentTime;
    const flight = (state === 'playing') && !settings_open && !document.hidden && !muted && !!player;
    const power = flight ? clamp(player.engine_thrust || 0, 0, 1) : 0;
    const boost = flight && player.turbo_active;
    const turn = flight ? Math.min(1, Math.abs(player.hull_turn || 0)/3) : 0;
    // Thrust changes field intensity; the reactor pitch stays steady.
    f.engine.gain.setTargetAtTime(flight ? 0.012 + power*0.036 + (boost ? 0.022 : 0) : 0, now, 0.28);
    f.body.frequency.setTargetAtTime(62, now, 0.2);
    f.overtone.frequency.setTargetAtTime(220, now, 0.2);
    f.filter.frequency.setTargetAtTime(700 + power*250 + (boost ? 450 : 0), now, 0.35);
    f.air_gain.gain.setTargetAtTime(flight ? power*0.014 + (boost ? 0.026 : 0) + turn*0.006 : 0, now, 0.32);
    f.air_filter.frequency.setTargetAtTime(boost ? 2300 : 1200, now, 0.5);
    const id = campaign.world;
    const sheltered = player && (distance(player, station) < station_shelter);
    const ambient = flight ? [0.014, 0.034, 0.025, 0.042, 0.035, 0.018, 0.05, 0.028][id]*(sheltered ? 0.35 : 1) : 0;
    f.space_gain.gain.setTargetAtTime(ambient, now, 0.5);
    f.space_filter.frequency.setTargetAtTime([420, 950, 380, 1500, 260, 1100, 650, 190][id], now, 0.8);
    f.reactor_gain.gain.setTargetAtTime(flight ? 0.008 : 0, now, 0.3);
    f.reactor.frequency.setTargetAtTime([62, 73, 55, 82, 46, 88, 65, 38][id], now, 0.7);
    sound.combat = (flight && enemies.some(v => (v.hp > 0) && (distance(v, player) < 850))) ? 1 : 0;
}

function sync_settings()
{
    sync_audio_controls();
    document.getElementById('scanlines').style.display = full_fx ? '' : 'none';
    if (settings_open) {
        sync_settings_rows();
    }
}

function toggle_sound()
{
    muted = !muted;
    start_audio();
    apply_audio_levels();
    try {
        localStorage.setItem('pulse_drift_muted', muted ? '1' : '0');
    }
    catch {
    }
    sync_settings();
}

function apply_audio_levels()
{
    if (!sound.ctx) {
        return;
    }
    const now = sound.ctx.currentTime;
    sound.master.gain.setTargetAtTime(muted ? 0 : volume_settings.master, now, 0.04);
    sound.fx_bus.gain.setTargetAtTime(volume_settings.effects, now, 0.04);
    sound.music_trim.gain.setTargetAtTime(volume_settings.music, now, 0.04);
    sound.ambient_bus.gain.setTargetAtTime(volume_settings.ambience, now, 0.04);
    update_audio_scene();
}

function save_audio_settings()
{
    try {
        localStorage.setItem('pulse_drift_audio', JSON.stringify(volume_settings));
        localStorage.setItem('pulse_drift_muted', muted ? '1' : '0');
    }
    catch {
    }
}

function sync_audio_controls()
{
    for (const key of ['master', 'music', 'effects', 'ambience']) {
        const input = document.getElementById(`${key}_volume`);
        const value = Math.round(volume_settings[key]*100);
        input.value = String(value);
        document.getElementById(`${key}_volume_value`).textContent = `${value}%`;
        input.setAttribute('aria-valuetext', `${value} percent`);
    }
    document.getElementById('audio_state').textContent = muted ? 'All sound is off.' : (volume_settings.master === 0) ? 'The master volume is at zero.' : '';
    document.getElementById('test_audio').disabled = muted || (volume_settings.master === 0);
}

function set_audio_volume(key, value)
{
    if (!Object.hasOwn(volume_settings, key)) {
        return;
    }
    value = Number(value);
    if (!Number.isFinite(value)) {
        return;
    }
    volume_settings[key] = clamp(value/100, 0, (key === 'master') ? 2 : 1);
    start_audio();
    apply_audio_levels();
    save_audio_settings();
    sync_audio_controls();
}

function toggle_audio_settings()
{
    settings_open = !settings_open;
    set_hidden(document.getElementById('audio_overlay'), !settings_open);
    stop_turbo();
    touch_boost_hold = false;
    keys.clear();
    joystick.active = false;
    joystick.dx = joystick.dy = 0;
    if (settings_open) {
        audio_focus_return = document.activeElement;
        start_audio();
        sync_audio_controls();
        sync_settings_rows();
        document.getElementById('close_audio').focus();
    }
    else if (audio_focus_return && audio_focus_return.focus) {
        audio_focus_return.focus();
    }
    performance_render_dirty = true;
}

function test_audio_mix()
{
    start_audio();
    if (!sound.ctx || muted || (volume_settings.master === 0)) {
        return;
    }
    const t = sound.ctx.currentTime;
    const notes = [48, 55, 62, 64];
    for (let i = 0, end = notes.length; i < end; ++i) {
        const n = notes[i];
        tone(midi_frequency(n), 2.8, 'sine', 0.035, t + i*0.06, null, 1600, sound.music_trim, {attack: 0.25, release: 1.2, pan: (i % 2) ? 0.3 : -0.3});
    }
    sfx('pickup');
    tone(65, 0.8, 'sine', 0.065, t + 1.1, 90, 550);
    noise(0.5, 0.07, 800, t + 1.1);
}
for (const id of ['settings_button', 'pause_audio', 'station_audio']) {
    document.getElementById(id).addEventListener('click', toggle_audio_settings);
}
document.getElementById('close_audio').addEventListener('click', toggle_audio_settings);
document.getElementById('test_audio').addEventListener('click', test_audio_mix);
document.getElementById('reset_audio').addEventListener('click', function () {
    volume_settings = {master: 0.85, music: 0.65, effects: 0.85, ambience: 0.7};
    muted = false;
    start_audio();
    apply_audio_levels();
    save_audio_settings();
    sync_settings();
});
for (const key of ['master', 'music', 'effects', 'ambience']) {
    document.getElementById(`${key}_volume`).addEventListener('input', function (event) {
        set_audio_volume(key, event.target.value);
    });
}
sync_settings();
for (const v of document.querySelectorAll('[data-mode]')) {
    v.addEventListener('click', function () {
        difficulty = v.dataset.mode;
        for (const v of document.querySelectorAll('[data-mode]')) {
            v.classList.toggle('selected', v.dataset.mode === difficulty);
        }
        sync_mode_note();
    });
}
