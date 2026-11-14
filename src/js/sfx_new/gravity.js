// Flying into a gravity well, a flagship's gravity moves: two low calls of a heavy engine, the second lower
// (a recording)
const sfx_new_gravity = {
    limit: 1.2,
    room: 0.8,
    gain: 0.1,
    voices: function (k) {
        k.sample({name: 'drone', a: 0.5, rate: 0.8});
        k.sample({name: 'drone', a: 0.5, rate: 0.6, at: 0.55});
    },
};
