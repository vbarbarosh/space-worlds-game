// A small blast (a missile's, a mine's, a raider's death): a crack, a boom falling from bright to dull, a thump
const sfx_blast = {
    limit: 0.07,
    play: function (note, air, t) {
        const r = 0.9 + Math.random()*0.2;
        air(0.04, 0.085, 4500);
        air(0.5, 0.14, 2600*r, 0, 260, 'lowpass');
        note(80*r, 0.35, 0.085, 32);
        air(0.3, 0.025, 5200, 0.04, 2200);
    },
};
