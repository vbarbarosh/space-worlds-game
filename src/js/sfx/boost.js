const sfx_boost = {
    limit: 0.08,
    play: function (note, air, t) {
        air(0.7, 0.038, 2300);
        note(220, 0.55, 0.019);
        note(329.63, 0.7, 0.014, null, 'sine', 0.08);
        note(440, 0.8, 0.009, null, 'sine', 0.16);
    },
};
