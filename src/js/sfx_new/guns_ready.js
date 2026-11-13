// Your guns cool enough to fire again: two quick notes up
const sfx_new_guns_ready = {
    limit: 0.5,
    room: 0.4,
    gain: 1.51,
    voices: function (k) {
        k.tone({d: 0.08, a: 0.03, f: 698.46, fm: {ratio: 2, index: 0.5, index_end: 0.05}});
        k.tone({d: 0.12, a: 0.03, f: 1046.5, fm: {ratio: 2, index: 0.5, index_end: 0.05}, at: 0.07});
    },
};
