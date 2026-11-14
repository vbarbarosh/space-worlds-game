// A raider's shot that just missed you (a graze, arcade_streak.js): the air of it going by, a recording, with a
// small tick that climbs through a run of them
const sfx_new_graze = {
    limit: 0.07,
    room: 0.3,
    streak: 1.5,
    gain: 0.07,
    voices: function (k) {
        k.sample({name: 'swish', a: 0.4, rate: k.r(1.1, 1.4)});
        k.sample({name: 'tick', a: 0.12, rate: Math.pow(2, Math.min(k.streak, 7)/12), at: 0.05});
    },
};
