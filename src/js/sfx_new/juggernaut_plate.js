// A shot that does a juggernaut's plating nothing: a small hard ring of metal, kept low and apart, so the ear
// learns the guns are not the way (recordings)
const sfx_new_juggernaut_plate = {
    limit: 0.22,
    room: 0.3,
    gain: 0.23,
    classic: 'impact',
    voices: function (k) {
        k.sample({name: 'latch', a: 0.3, rate: k.r(1.2, 1.4)});
        k.sample({name: 'hit_3', a: 0.25, rate: k.r(1.9, 2.3), fade: 0.12});
    },
};
