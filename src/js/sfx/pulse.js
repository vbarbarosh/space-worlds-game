const sfx_pulse = {
    limit: 0.08,
    play: function (note, air, t) {
        air(0.95, 0.19, 450);
        note(155, 0.85, 0.17, 30);
        note(310, 0.65, 0.06, 62);
        sound.duck_until = t + 1.1;
    },
};
