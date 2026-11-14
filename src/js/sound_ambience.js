// Each world's background, in the new sound set: a bed that never stops (surf, wind, a hum, a drone: noise and tones
// with slow tides in them) and calls that come now and then out of the distance (a radio, a bubble, thunder, a clank,
// a chime of ice, an ember, a voice from the void). It plays on the ambience bus over the space hum and the reactor's
// tone that both sets have, quieter by the station, silent out of flight. The classic set has none of it.
const sound_ambience = {
    world: -1,
    // the bed's nodes that run on (stopped with it) and its own way into the mix
    nodes: [],
    out: null,
    next: 0,
    idle: 0,
    // until then (the audio's clock) world `audition_world`'s background plays whatever the game is doing: the dev
    // page's Sounds tab, to hear one
    audition: 0,
    audition_world: 0,
};
// Out of flight this long (s), the bed is let go; it is made again with the next flight
const sound_ambience_idle = 6;

// The ambience's part of the graph, made with the graph itself (create_audio_graph)
function sound_ambience_graph(c)
{
    sound.ambience_in = c.createGain();
    sound.ambience_in.gain.value = 0;
    sound.ambience_in.connect(sound.ambient_bus);
    // a room of its own for the calls, so a far sound is far whatever the effects' volume
    const room = c.createConvolver();
    const wet = c.createGain();
    room.buffer = sound.fx_room.buffer;
    wet.gain.value = 0.9;
    room.connect(wet);
    wet.connect(sound.ambience_in);
    // a call goes in here: a little of it straight, the rest through the room
    const near = c.createGain();
    near.gain.value = 0.5;
    sound.ambience_far = c.createGain();
    sound.ambience_far.connect(near);
    near.connect(sound.ambience_in);
    sound.ambience_far.connect(room);
    sound_ambience.world = -1;
    sound_ambience.nodes = [];
    sound_ambience.out = null;
    sound_ambience.next = 0;
}

// A layer of a bed that runs on: noise ({color, filter, f, q}) or a tone ({tone: its pitch, type, cutoff}) at level
// `a`; tide: {rate, depth} its level rising and falling (depth 1 falls to nothing); drift: {rate, by} its filter's
// pitch wandering by so many Hz
function sound_ambience_layer(c, out, o)
{
    const nodes = sound_ambience.nodes;
    const gain = c.createGain();
    let source;
    let filter = null;
    if (o.tone) {
        source = c.createOscillator();
        source.type = o.type || 'sine';
        source.frequency.value = o.tone;
    }
    else {
        source = c.createBufferSource();
        source.buffer = (o.color === 'pink') ? sound.noise_pink : (o.color === 'brown') ? sound.noise : sound.noise_white;
        source.loop = true;
    }
    let output = source;
    if (o.f || o.cutoff) {
        filter = c.createBiquadFilter();
        filter.type = o.filter || 'lowpass';
        filter.frequency.value = o.f || o.cutoff;
        filter.Q.value = o.q || 0.7;
        output.connect(filter);
        output = filter;
        nodes.push(filter);
    }
    const depth = o.tide ? o.tide.depth : 0;
    gain.gain.value = o.a*(1 - depth/2);
    output.connect(gain);
    gain.connect(out);
    nodes.push(source, gain);
    if (o.tide) {
        sound_ambience_sway(c, o.tide.rate, o.a*depth/2, gain.gain);
    }
    if (o.drift && filter) {
        sound_ambience_sway(c, o.drift.rate, o.drift.by, filter.frequency);
    }
    if (o.tone) {
        source.start();
    }
    else {
        source.start(0, Math.random()*(source.buffer.duration - 0.1));
    }
}

// A slow wave on a level or a pitch: `rate` times a second, `by` each way
function sound_ambience_sway(c, rate, by, param)
{
    const wave = c.createOscillator();
    const depth = c.createGain();
    wave.frequency.value = rate;
    depth.gain.value = by;
    wave.connect(depth);
    depth.connect(param);
    wave.start();
    sound_ambience.nodes.push(wave, depth);
}

// The bed of world `id` begun, the one before it let go
function sound_ambience_bed(id)
{
    const c = sound.ctx;
    sound_ambience_stop();
    const bed = c.createGain();
    bed.gain.value = 0;
    bed.gain.setTargetAtTime(1, c.currentTime, 0.8);
    bed.connect(sound.ambience_in);
    sound_ambience.out = bed;
    sound_ambience.world = id;
    for (const v of sound_ambience_worlds[id].bed) {
        sound_ambience_layer(c, bed, {...v, a: v.a*sound_ambience_worlds[id].bed_level});
    }
    sound_ambience.next = c.currentTime + 2 + Math.random()*4;
}

function sound_ambience_stop()
{
    const c = sound.ctx;
    const bed = sound_ambience.out;
    if (!bed) {
        return;
    }
    const nodes = sound_ambience.nodes;
    bed.gain.setTargetAtTime(0, c.currentTime, 0.3);
    for (const v of nodes) {
        if (v.stop) {
            v.stop(c.currentTime + 2);
        }
    }
    setTimeout(function () {
        for (const v of nodes) {
            v.disconnect();
        }
        bed.disconnect();
    }, 2500);
    sound_ambience.nodes = [];
    sound_ambience.out = null;
    sound_ambience.world = -1;
}

// On the music's clock (schedule_music): the bed follows the world and the flight, and a call comes when its time is up
function sound_ambience_watch()
{
    const c = sound.ctx;
    const now = c.currentTime;
    const audition = (now < sound_ambience.audition) && !muted;
    const flight = audition || ((sound_set === 'new') && (state === 'playing') && !settings_open && !document.hidden && !muted && !!player);
    const sheltered = flight && !audition && (distance(player, station) < station_shelter);
    sound.ambience_in.gain.setTargetAtTime(flight ? (sheltered ? 0.4 : 1) : 0, now, 0.5);
    if (!flight) {
        if (sound_ambience.out && (now > sound_ambience.idle + sound_ambience_idle)) {
            sound_ambience_stop();
        }
        return;
    }
    sound_ambience.idle = now;
    const id = audition ? sound_ambience.audition_world : campaign.world;
    if (sound_ambience.world !== id) {
        sound_ambience_bed(id);
    }
    if (now >= sound_ambience.next) {
        const world = sound_ambience_worlds[id];
        const i = Math.floor(Math.random()*world.calls.length);
        sound_ambience_call(world.calls[i], now + 0.05, world.call_levels[i]);
        sound_ambience.next = now + world.every[0] + Math.random()*(world.every[1] - world.every[0]);
    }
}

// One call out of the distance: somewhere left or right, through the ambience's room
function sound_ambience_call(call, t, level)
{
    const pan = Math.random()*1.4 - 0.7;
    function layer(o) {
        return {...o, t: t + (o.at || 0), a: o.a*level, pan: clamp(pan + (o.spread || 0), -1, 1), bus: sound.ambience_far};
    }
    call({
        tone: v => voice_tone(layer(v)),
        noise: v => voice_noise(layer(v)),
        r: (a, b) => a + Math.random()*(b - a),
        pick: v => v[Math.floor(Math.random()*v.length)],
    });
}
