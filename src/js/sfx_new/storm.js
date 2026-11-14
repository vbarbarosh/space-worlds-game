// Inside an ion storm, a pylon's strike, a flagship's storm: a crack, a crunch played high, and its thunder
// rolling off (recordings)
const sfx_new_storm = {
    limit: 1.5,
    room: 1,
    gain: 0.14,
    voices: function (k) {
        k.sample({name: 'rock', a: 0.7, rate: k.r(1.5, 1.9), fade: 0.3});
        k.sample({name: 'boom_low', a: 0.25, rate: k.r(0.95, 1.1), at: 0.08});
    },
};
