const sfx_gravity = {
    limit: 1.2,
    play: function (note, air, t) {
        note(196, 0.26, 0.06, null, 'triangle', 0, 1800);
        note(146.83, 0.34, 0.056, null, 'triangle', 0.31, 1800);
    },
};
