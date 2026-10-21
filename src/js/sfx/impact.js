// Your shot landing on a raider: a short dull thud, quiet, under the stream of shots (a square-wave knock rang like a
// tin can)
const sfx_impact = {
    limit: 0.05,
    play: function (note, air, t) {
        const r = 0.9 + Math.random()*0.2;
        note(95*r, 0.08, 0.03, 55);
        air(0.045, 0.027, 1500*r, 0, 0, 'lowpass');
    },
};
