// Through a race's ring, a race finished: two glassy notes, a fifth apart
const sfx_new_ring = {
    limit: 0.2,
    room: 0.7,
    gain: 2.57,
    voices: function (k) {
        k.tone({d: 0.22, a: 0.045, f: 783.99, fm: {ratio: 4, index: 0.6, index_end: 0.02, d: 0.08}, spread: -0.25});
        k.tone({d: 0.34, a: 0.045, f: 1174.66, fm: {ratio: 4, index: 0.6, index_end: 0.02, d: 0.1}, at: 0.07, spread: 0.25});
    },
};
