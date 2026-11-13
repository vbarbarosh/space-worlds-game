// The game paused or going on again: two soft notes falling, as a breath held
const sfx_new_pause = {
    limit: 0.15,
    room: 0.4,
    gain: 2.04,
    voices: function (k) {
        k.tone({d: 0.1, a: 0.03, f: 660, spread: -0.2});
        k.tone({d: 0.16, a: 0.03, f: 440, at: 0.07, spread: 0.2});
    },
};
