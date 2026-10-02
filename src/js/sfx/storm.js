const sfx_storm = {
    limit: 1.5,
    play: function (note, air, t) {
        air(0.7, 0.08, 1800);
        note(82, 0.45, 0.05, 36);
    },
};
