// Your shot landing on a raider: a small knock of metal, a recording played high and cut short, each a little off the
// last, kept next to nothing (it comes as often as the shot does)
const sfx_new_impact = {
    limit: 0.05,
    room: 0.15,
    gain: 0.15,
    voices: function (k) {
        k.sample({name: ['hit_1', 'hit_3'][k.turn(2)], a: 0.3, rate: k.r(1.7, 2.3), fade: 0.07});
    },
};
