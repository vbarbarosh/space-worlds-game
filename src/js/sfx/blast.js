// A small blast (a missile's, a mine's, a drone dying): its two layers, as the world combines them (explosion_play)
const sfx_blast = {
    limit: 0.07,
    recorded: true,
    play: function (note, air, t, clip) {
        explosion_play(clip, 'small');
    },
};

// An explosion's two recordings (src/sounds/), by its set and size: the blast's own volume on the ladder, and where
// its echo begins (s into the blast)
const explosion_layers = {
    a: {small: {gain: 0.19, at: 0.4}, ship: {gain: 0.36, at: 0.75}, big: {gain: 0.41, at: 1}},
    deep: {small: {gain: 0.1, at: 0.35}, ship: {gain: 0.185, at: 0.5}, big: {gain: 0.285, at: 1.2}},
};

// An explosion as the world combines it (its music's `explosions`): the blast of one set, the echo of one, the echo
// at the world's level and pitch; ±7% in pitch each time so two in a row differ. A blast of its own (`body`: a
// rock's, a heavy ship's) takes the world's echo of the size at `echo_level` of the world's
function explosion_play(clip, size, body = null, echo_level = 1)
{
    const v = world_audio[campaign.world];
    const world = (v && v.explosions) || {body: 'a', echo: 'a', level: 0.8, rate: 1};
    const r = (0.93 + Math.random()*0.14)*((body && body.rate) || 1);
    const blast = body || {...explosion_layers[world.body][size], name: `body_${world.body}_${size}`};
    const echo = explosion_layers[world.echo][size];
    clip(blast.name, blast.gain, r);
    clip(`echo_${world.echo}_${size}`, echo.gain*world.level*echo_level, r*world.rate, blast.at/r);
}
