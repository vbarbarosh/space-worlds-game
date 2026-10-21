// The turbo lit: a thump, the engine's roar climbing, and a whoosh sliding up past you
const sfx_boost = {
    limit: 0.08,
    play: function (note, air, t) {
        note(58, 0.3, 0.075, 34);
        note(70, 0.75, 0.05, 150, 'sawtooth', 0, 520);
        note(105, 0.7, 0.022, 240, 'square', 0.03, 700);
        air(0.85, 0.07, 500, 0, 3600);
        air(0.3, 0.03, 5000, 0.05, 1200);
    },
};
