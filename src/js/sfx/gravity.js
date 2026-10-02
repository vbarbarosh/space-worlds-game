const sfx_gravity = {
    limit: 1.2,
    play: function (note, air, t) {
        note(196, 0.26, 0.035, null, 'sine');
        note(146.83, 0.34, 0.032, null, 'sine', 0.31);
    },
};
