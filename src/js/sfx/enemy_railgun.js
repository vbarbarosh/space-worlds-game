const sfx_enemy_railgun = {
    limit: 0.12,
    play: function (note, air, t) {
        air(0.055, 0.14, 2400);
        note(1800, 0.08, 0.05, 120, 'triangle', 0, 2600);
        note(85, 0.2, 0.067, 42);
    },
};
