// The turbo lit: a thump, a jet's roar opening up from low to bright, a whine rising under it, and a rumble; no buzz
const sfx_boost = {
    limit: 0.08,
    play: function (note, air, t) {
        note(56, 0.3, 0.064, 34);
        air(0.9, 0.127, 280, 0, 2400, 'lowpass');
        air(0.7, 0.04, 900, 0.05, 3800);
        note(320, 0.8, 0.011, 980, 'sine', 0.05);
        note(48, 0.8, 0.04, 60, 'sawtooth', 0, 240);
    },
};
