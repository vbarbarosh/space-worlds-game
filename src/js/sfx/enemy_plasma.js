const sfx_enemy_plasma = {
    limit: 0.08,
    play: function (note, air, t) {
        note(380, 0.11, 0.055, 120, 'triangle', 0, 1200);
        note(90, 0.07, 0.037, 60);
        air(0.045, 0.025, 1100);
    },
};
