// Each world's background, in the new sound set: a bed that never stops (surf, wind, a hum, a drone: noise and tones
// with slow tides in them) and calls that come now and then out of the distance (a radio, a bubble, thunder, a clank,
// a chime of ice, an ember, a voice from the void), and a flagship's own sound while one is near, louder as it closes. It plays on the ambience
// bus over the space hum and the reactor's tone that both sets have, quieter by the station, silent out of flight.
// The classic set has none of it.
const sound_ambience = {
    world: -1,
    // the bed playing: {level, pan, nodes} its own way into the mix and the nodes that run on (sound_ambience_group)
    bed: null,
    // a flagship's own sound while one is near, the same shape, and the world it was made for
    presence: null,
    presence_world: -1,
    next: 0,
    idle: 0,
    // until then (the audio's clock) world `audition_world`'s background plays whatever the game is doing: the dev
    // page's Sounds tab, to hear one
    audition: 0,
    audition_world: 0,
};
// Out of flight this long (s), the bed is let go; it is made again with the next flight
const sound_ambience_idle = 6;
// A flagship this near (m) begins to be heard; its sound grows as it closes
const sound_presence_reach = 2500;

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
    sound_ambience.bed = null;
    sound_ambience.presence = null;
    sound_ambience.next = 0;
}

// A layer that runs on: noise ({color, filter, f, q}) or a tone ({tone: its pitch, type, cutoff}) at level `a`;
// tide: {rate, depth} its level rising and falling (depth 1 falls to nothing); drift: {rate, by} its filter's pitch
// wandering by so many Hz
function sound_ambience_layer(c, group, o)
{
    const nodes = group.nodes;
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
    gain.connect(group.level);
    nodes.push(source, gain);
    if (o.tide) {
        sound_ambience_sway(c, group, o.tide.rate, o.a*depth/2, gain.gain);
    }
    if (o.drift && filter) {
        sound_ambience_sway(c, group, o.drift.rate, o.drift.by, filter.frequency);
    }
    if (o.tone) {
        source.start();
    }
    else {
        source.start(0, Math.random()*(source.buffer.duration - 0.1));
    }
}

// A slow wave on a level or a pitch: `rate` times a second, `by` each way
function sound_ambience_sway(c, group, rate, by, param)
{
    const wave = c.createOscillator();
    const depth = c.createGain();
    wave.frequency.value = rate;
    depth.gain.value = by;
    wave.connect(depth);
    depth.connect(param);
    wave.start();
    group.nodes.push(wave, depth);
}

// Layers begun together behind one level, silent at first: {level, pan, nodes}; `panned` gives it a place left or
// right (a centred panner takes 3 dB off a sound, so a group's level is measured as it is made here)
function sound_ambience_group(layers, level, panned)
{
    const c = sound.ctx;
    const out = {level: c.createGain(), pan: panned ? c.createStereoPanner() : null, nodes: []};
    out.level.gain.value = 0;
    if (out.pan) {
        out.level.connect(out.pan);
        out.pan.connect(sound.ambience_in);
    }
    else {
        out.level.connect(sound.ambience_in);
    }
    for (const v of layers) {
        sound_ambience_layer(c, out, {...v, a: v.a*level});
    }
    return out;
}

// A group faded out and let go
function sound_ambience_group_stop(group)
{
    const c = sound.ctx;
    group.level.gain.setTargetAtTime(0, c.currentTime, 0.3);
    for (const v of group.nodes) {
        if (v.stop) {
            v.stop(c.currentTime + 2);
        }
    }
    setTimeout(function () {
        for (const v of group.nodes) {
            v.disconnect();
        }
        group.level.disconnect();
        if (group.pan) {
            group.pan.disconnect();
        }
    }, 2500);
}

// The bed of world `id` begun, the one before it let go
function sound_ambience_bed(id)
{
    sound_ambience_stop();
    const world = sound_ambience_worlds[id];
    sound_ambience.bed = sound_ambience_group(world.bed, world.bed_level, false);
    sound_ambience.bed.level.gain.setTargetAtTime(1, sound.ctx.currentTime, 0.8);
    sound_ambience.world = id;
    sound_ambience.next = sound.ctx.currentTime + 2 + Math.random()*4;
}

function sound_ambience_stop()
{
    if (sound_ambience.bed) {
        sound_ambience_group_stop(sound_ambience.bed);
    }
    if (sound_ambience.presence) {
        sound_ambience_group_stop(sound_ambience.presence);
    }
    sound_ambience.bed = null;
    sound_ambience.presence = null;
    sound_ambience.world = -1;
}

// On the music's clock (schedule_music): the bed follows the world and the flight, a call comes when its time is up,
// and a flagship near is heard
function sound_ambience_watch()
{
    const c = sound.ctx;
    const now = c.currentTime;
    const audition = (now < sound_ambience.audition) && !muted;
    const flight = audition || ((sound_set === 'new') && (state === 'playing') && !settings_open && !document.hidden && !muted && !!player);
    const sheltered = flight && !audition && (distance(player, station) < station_shelter);
    sound.ambience_in.gain.setTargetAtTime(flight ? (sheltered ? 0.4 : 1) : 0, now, 0.5);
    if (!flight) {
        if (sound_ambience.bed && (now > sound_ambience.idle + sound_ambience_idle)) {
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
    sound_ambience_presence(id, audition ? null : enemies.find(v => (v.type === 'boss') && (v.hp > 0)), now);
}

// World `id`'s flagship `boss` heard while it is within reach: its own layers, louder as it closes, from its side
function sound_ambience_presence(id, boss, now)
{
    const near = boss ? clamp(1 - distance(boss, player)/sound_presence_reach, 0, 1) : 0;
    let presence = sound_ambience.presence;
    if (presence && ((near <= 0) || (sound_ambience.presence_world !== id))) {
        sound_ambience_group_stop(presence);
        sound_ambience.presence = presence = null;
    }
    if (near <= 0) {
        return;
    }
    if (!presence) {
        const flagship = sound_ambience_worlds[id].flagship;
        sound_ambience.presence = presence = sound_ambience_group(flagship.layers, flagship.level, true);
        sound_ambience.presence_world = id;
    }
    presence.level.gain.setTargetAtTime(near*near, now, 0.4);
    presence.pan.pan.setTargetAtTime(clamp((boss.x - player.x)/900, -0.8, 0.8), now, 0.3);
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
