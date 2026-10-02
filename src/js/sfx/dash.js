const sfx_dash = {
    limit: 0.08,
    play: function (note, air, t) {
        air(0.4, 0.035, 1700);
        note(220, 0.4, 0.024, 165);
    },
};
