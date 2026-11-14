// An ore rock broken, drifting debris or a cliff struck, a flagship's mine: stone crunching apart, a recording
const sfx_new_mine = {
    limit: 0.12,
    room: 0.5,
    gain: 0.11,
    voices: function (k) {
        k.sample({name: 'rock', a: 0.5, rate: k.r(0.92, 1.15), from: Math.random()*0.04});
    },
};
