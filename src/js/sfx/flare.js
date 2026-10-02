const sfx_flare = {
    limit: 1.5,
    play: function (note, air, t) {
        air(0.9, 0.09, 480);
        note(61, 0.7, 0.05, 32);
    },
};
