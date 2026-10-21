// Your shot landing on a raider: a short metal knock and a tick, quiet, so a stream of hits ticks under the shots
const sfx_impact = {
    limit: 0.05,
    play: function (note, air, t) {
        const r = 0.9 + Math.random()*0.2;
        note(190*r, 0.07, 0.04, 90, 'square', 0, 1400);
        air(0.03, 0.05, 6000*r);
    },
};
