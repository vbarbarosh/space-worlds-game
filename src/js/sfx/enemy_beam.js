const sfx_enemy_beam = {
    limit: 0.1,
    play: function (note, air, t) {
        note(320, 0.23, 0.045, 260, 'triangle', 0, 1400);
        note(480, 0.2, 0.017, 390);
        air(0.2, 0.035, 1800);
    },
};
