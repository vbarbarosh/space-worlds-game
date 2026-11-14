// The turbo's burst (yours, a flagship's charge, a rival's in a race): a thruster opened wide, a recording, with a
// low kick under it
const sfx_new_boost = {
    limit: 0.08,
    room: 0.6,
    gain: 0.65,
    voices: function (k) {
        k.sample({name: 'thrust', a: 0.6, rate: k.r(0.95, 1.05)});
        k.sample({name: 'hit_low', a: 0.4, rate: 0.8});
    },
};
