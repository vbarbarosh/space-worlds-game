// The player's missile leaving the launcher: a thump, then the motor's rising hiss
const sfx_missile = {
    limit: 0.12,
    play: function (note, air, t) {
        note(72, 0.16, 0.06, 40);
        air(0.12, 0.05, 700);
        air(0.4, 0.03, 2400, 0.1);
        note(160, 0.42, 0.016, 480, 'sawtooth', 0.1, 900);
    },
};
