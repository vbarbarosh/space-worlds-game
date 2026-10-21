// A ship's blast (a tank, a carrier, a flagship's chain): a heavy thump and a sub under it, a long rumble sinking
// deep, a muffled crack and debris falling dull after it
const sfx_blast_big = {
    limit: 0.02,
    room: true,
    play: function (note, air, t) {
        const r = 0.92 + Math.random()*0.16;
        air(0.08, 0.09, 2400, 0, 0, 'lowpass');
        note(90*r, 0.8, 0.16, 28);
        note(46*r, 1.1, 0.11, 25);
        air(1.4, 0.28, 1100*r, 0, 70, 'lowpass');
        air(0.6, 0.035, 1600, 0.3, 500, 'lowpass');
    },
};
