const sfx_kill = {
    limit: 0.09,
    play: function (note, air, t) {
        air(0.42, 0.13, 480);
        note(72, 0.4, 0.115, 29);
        air(0.5, 0.06, 700, 0.015, 120, 'lowpass');
    },
};
