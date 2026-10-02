const sfx_enemy_scatter = {
    limit: 0.1,
    play: function (note, air, t) {
        air(0.12, 0.12, 1350);
        note(130, 0.15, 0.067, 48, 'triangle', 0, 800);
    },
};
