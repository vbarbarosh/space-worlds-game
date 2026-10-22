// A small blast (a missile's, a drone dying): its own muffled recording, with the world's echo of a small blast
// (each thing that explodes has a take of its own, for the author to compare in play, 2026-10-22 19:17)
const sfx_blast = {
    limit: 0.07,
    recorded: true,
    play: function (note, air, t, clip) {
        explosion_play(clip, 'small', {name: 'body_small', gain: 0.108, at: 0.4});
    },
};

// An explosion's echo (src/sounds/), by its set and size: its volume on the ladder
const explosion_echoes = {
    a: {small: 0.19, ship: 0.36, big: 0.41},
    deep: {small: 0.1, ship: 0.185, big: 0.285},
};

// An explosion as the world combines it: the blast's own recording (`body`: its name, its volume on the ladder, where
// the echo begins, s into it, and its pitch), then the world's echo (its music's `explosions`: the set, the level,
// the pitch) of the size, at `echo_level` of the world's; ±7% in pitch each time so two in a row differ
function explosion_play(clip, size, body, echo_level = 1)
{
    const v = world_audio[campaign.world];
    const world = (v && v.explosions) || {echo: 'a', level: 0.8, rate: 1};
    const r = (0.93 + Math.random()*0.14)*(body.rate || 1);
    clip(body.name, body.gain, r);
    clip(`echo_${world.echo}_${size}`, explosion_echoes[world.echo][size]*world.level*echo_level, r*world.rate, body.at/r);
}
