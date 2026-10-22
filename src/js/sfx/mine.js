const sfx_mine = {
    limit: 0.12,
    play: function (note, air, t) {
        air(0.18, 0.08, 1800);
        note(480, 0.15, 0.027, 230, 'triangle', 0, 1500);
        note(135, 0.12, 0.039, 60);
    },
};
