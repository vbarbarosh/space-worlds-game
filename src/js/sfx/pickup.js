const sfx_pickup = {
    limit: 0.16,
    play: function (note, air, t) {
        note(659.25, 0.18, 0.039, null, 'sine');
        note(987.77, 0.28, 0.027, null, 'sine', 0.075);
    },
};
