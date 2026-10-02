const sfx_enemy_missile = {
    limit: 0.18,
    play: function (note, air, t) {
        air(0.36, 0.11, 650);
        note(82, 0.32, 0.055, 145, 'triangle', 0, 600);
    },
};
