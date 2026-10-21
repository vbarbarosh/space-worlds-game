// Your plasma shot: a click, a zap falling from its pitch, a low thump and a short hiss; each a little off the last, so
// a stream of them does not ring as one beep
const sfx_shot = {
    limit: 0.065,
    play: function (note, air, t) {
        const r = 0.94 + Math.random()*0.12;
        air(0.022, 0.062, 4200);
        note(620*r, 0.1, 0.042, 150*r, 'sawtooth', 0, 2400);
        note(124*r, 0.09, 0.062, 52);
        air(0.11, 0.017, 1500, 0.015, 600);
    },
};
