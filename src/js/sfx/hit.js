const sfx_hit = {
    limit: 0.18,
    play: function (note, air, t) {
        air(0.16, 0.12, 950);
        note(105, 0.22, 0.095, 38);
        note(210, 0.13, 0.025, 82, 'triangle', 0, 900);
        sound.duck_until = t + 0.55;
    },
};
