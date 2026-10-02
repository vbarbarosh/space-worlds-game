const sfx_enemy_ion = {
    limit: 0.08,
    play: function (note, air, t) {
        note(660, 0.16, 0.035, 180, 'sine');
        note(970, 0.12, 0.018, 310, 'sine', 0.014);
        air(0.065, 0.04, 2100);
    },
};
