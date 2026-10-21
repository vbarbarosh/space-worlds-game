const sfx_kill = {
    limit: 0.09,
    play: function (note, air, t) {
        air(0.42, 0.13, 480);
        note(72, 0.4, 0.115, 29);
        note(142, 0.18, 0.036, 44, 'triangle', 0.015, 700);
    },
};
