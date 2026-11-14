// The new sound set's instruments (the first set's are tone() and noise() of audio.js): full-band noise, a room of
// their own for effects, a tone with a modulator and a drive, and noise in three colours. The first set's noise holds
// next to nothing over 1 kHz, so its cracks and hisses were the filter ringing; these have the air themselves.

// Which set plays: 'new', or 'classic' for the game's sounds as they were before it (Settings, Sounds)
let sound_set = 'new';
const sound_set_key = 'pulse_drift_sound_set';
// No more voices than this at once: a layer marked `extra` is left out over it
const sound_voice_limit = 96;

try {
    if (localStorage.getItem(sound_set_key) === 'classic') {
        sound_set = 'classic';
    }
}
catch {
}

function sound_set_choose(value)
{
    sound_set = (value === 'classic') ? 'classic' : 'new';
    try {
        localStorage.setItem(sound_set_key, sound_set);
    }
    catch {
    }
    if (sound.ctx) {
        sound.cues = {};
        update_audio_scene();
    }
}

// The new set's part of the graph, made with the graph itself (create_audio_graph)
function sound_voices_graph(c)
{
    let seed = 40961;
    function random() {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return (seed/4294967296)*2 - 1;
    }
    sound.noise_white = c.createBuffer(1, c.sampleRate*2, c.sampleRate);
    const white = sound.noise_white.getChannelData(0);
    for (let i = 0; i < white.length; i++) {
        white[i] = random()*0.7;
    }
    // pink: equal energy an octave, the colour of wind, fire and a far rumble
    sound.noise_pink = c.createBuffer(1, c.sampleRate*4, c.sampleRate);
    const pink = sound.noise_pink.getChannelData(0);
    const b = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < pink.length; i++) {
        const w = random();
        b[0] = 0.99886*b[0] + w*0.0555179;
        b[1] = 0.99332*b[1] + w*0.0750759;
        b[2] = 0.969*b[2] + w*0.153852;
        b[3] = 0.8665*b[3] + w*0.3104856;
        b[4] = 0.55*b[4] + w*0.5329522;
        b[5] = -0.7616*b[5] - w*0.016898;
        pink[i] = (b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + w*0.5362)*0.11;
        b[6] = w*0.115926;
    }
    // the effects' room: short and dark, so a blast has somewhere to ring and a shot is not a dry click
    sound.fx_room = c.createConvolver();
    const length = Math.floor(c.sampleRate*1.3);
    const impulse = c.createBuffer(2, length, c.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
        const d = impulse.getChannelData(channel);
        let low = 0;
        for (let i = 0; i < length; i++) {
            const k = i/length;
            // the tail darkens as it fades: the smoothing grows with time
            low += (random() - low)*(0.55 - 0.42*k);
            d[i] = (i < c.sampleRate*0.012) ? 0 : low*Math.pow(1 - k, 3.2)*0.5;
        }
    }
    sound.fx_room.buffer = impulse;
    // what is sent to the room goes in here: without its lows, so a thud stays tight and only the body and the air of
    // a sound ring on
    sound.fx_send = c.createBiquadFilter();
    sound.fx_send.type = 'highpass';
    sound.fx_send.frequency.value = 240;
    sound.fx_send.Q.value = 0.5;
    sound.fx_send.connect(sound.fx_room);
    sound.fx_wet = c.createGain();
    sound.fx_wet.gain.value = 0.5;
    sound.fx_room.connect(sound.fx_wet);
    sound.fx_wet.connect(sound.fx_bus);
    // a soft clip for a layer's `drive`: adds the edge a bare oscillator lacks
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
        curve[i] = Math.tanh((i/(curve.length - 1)*2 - 1)*2.2);
    }
    sound.drive_curve = curve;
}

// A voice ends: its nodes let go
function voice_end(source, nodes)
{
    sound.voices++;
    sound.peak_voices = Math.max(sound.peak_voices, sound.voices);
    source.onended = function () {
        for (const node of nodes) {
            node.disconnect();
        }
        sound.voices--;
    };
}

// The level's shape: up to `a` in `attack`, held for `hold`, then falling away to nothing by `d`: fast at first and
// slowing, as a struck or fired thing does; `late` falls slowly at first, a swell that is let go
function voice_envelope(gain, o, t)
{
    const attack = Math.min(o.d*0.5, o.attack || 0.004);
    const hold = Math.min(o.d - attack, o.hold || 0);
    const fall = Math.max(0.01, o.d - attack - hold);
    const curve = new Float32Array(40);
    for (let i = 0; i < curve.length; i++) {
        const k = i/(curve.length - 1);
        curve[i] = o.a*(o.late ? 1 - k*k*k : (Math.exp(-5*k) - Math.exp(-5))/(1 - Math.exp(-5)));
    }
    // silent from now, not from t: a source that starts a sample before its level's first step would click
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(o.a, t + attack);
    gain.gain.setValueCurveAtTime(curve, t + attack + hold, fall);
}

// The rest of a voice's chain after its source: a drive, a filter that may slide, the envelope, the pan, the bus
function voice_chain(c, source, o, t, nodes)
{
    let output = source;
    if (o.drive) {
        const pre = c.createGain();
        const shaper = c.createWaveShaper();
        pre.gain.value = o.drive;
        shaper.curve = sound.drive_curve;
        output.connect(pre);
        pre.connect(shaper);
        output = shaper;
        nodes.push(pre, shaper);
    }
    if (o.cutoff) {
        const filter = c.createBiquadFilter();
        filter.type = o.filter || 'lowpass';
        filter.frequency.setValueAtTime(o.cutoff, t);
        filter.Q.value = o.q || 0.7;
        if (o.cutoff_end) {
            filter.frequency.exponentialRampToValueAtTime(o.cutoff_end, t + (o.sweep || o.d));
        }
        output.connect(filter);
        output = filter;
        nodes.push(filter);
    }
    const gain = c.createGain();
    voice_envelope(gain, o, t);
    output.connect(gain);
    output = gain;
    nodes.push(gain);
    if (o.pan) {
        const pan = c.createStereoPanner();
        pan.pan.value = clamp(o.pan, -1, 1);
        output.connect(pan);
        output = pan;
        nodes.push(pan);
    }
    output.connect(o.bus || sound.fx_bus);
}

// A tone: {t, d, a} when, how long, how loud; f its pitch, sliding to f_end over `glide` (the whole of it when not
// given); type the waveform; fm: {ratio, index, index_end} a modulator at ratio × the pitch, its depth in pitches;
// drive, cutoff, cutoff_end, filter, q, attack, hold, late, pan, bus as voice_chain and voice_envelope take them
function voice_tone(o)
{
    if (!sound.ctx || muted || (o.a <= 0) || (o.extra && (sound.voices > sound_voice_limit))) {
        return;
    }
    const c = sound.ctx;
    const t = o.t;
    const osc = c.createOscillator();
    const nodes = [osc];
    const glide = o.glide || o.d;
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(Math.max(20, o.f), t);
    if (o.f_end) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f_end), t + glide);
    }
    if (o.detune) {
        osc.detune.value = o.detune;
    }
    if (o.fm) {
        const mod = c.createOscillator();
        const depth = c.createGain();
        mod.type = 'sine';
        mod.frequency.setValueAtTime(Math.max(20, o.f*o.fm.ratio), t);
        if (o.f_end) {
            mod.frequency.exponentialRampToValueAtTime(Math.max(20, o.f_end*o.fm.ratio), t + glide);
        }
        depth.gain.setValueAtTime(o.f*o.fm.index, t);
        depth.gain.exponentialRampToValueAtTime(Math.max(1, (o.f_end || o.f)*(o.fm.index_end || 0.01)), t + (o.fm.d || o.d));
        mod.connect(depth);
        depth.connect(osc.frequency);
        mod.start(t);
        mod.stop(t + o.d + 0.06);
        nodes.push(mod, depth);
    }
    voice_chain(c, osc, o, t, nodes);
    osc.start(t);
    osc.stop(t + o.d + 0.06);
    voice_end(osc, nodes);
}

// Noise: {t, d, a} as a tone's; color 'white' (a crack, a hiss), 'pink' (wind, fire, a roar) or 'brown' (a rumble);
// cutoff with filter 'bandpass', 'lowpass' or 'highpass', sliding to cutoff_end; each one starts somewhere else in
// the noise, so two in a row are never the same sound
function voice_noise(o)
{
    if (!sound.ctx || muted || (o.a <= 0) || (o.extra && (sound.voices > sound_voice_limit))) {
        return;
    }
    const c = sound.ctx;
    const source = c.createBufferSource();
    const nodes = [source];
    source.buffer = (o.color === 'pink') ? sound.noise_pink : (o.color === 'brown') ? sound.noise : sound.noise_white;
    source.loop = true;
    if (o.rate) {
        source.playbackRate.value = o.rate;
    }
    voice_chain(c, source, {...o, filter: o.filter || 'bandpass'}, o.t, nodes);
    source.start(o.t, Math.random()*(source.buffer.duration - 0.1));
    source.stop(o.t + o.d + 0.06);
    voice_end(source, nodes);
}
