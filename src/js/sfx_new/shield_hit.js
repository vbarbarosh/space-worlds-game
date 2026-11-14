// A hit your shield took whole: the field humming where it was struck, a recording, lighter and higher than a hit
// on the hull
const sfx_new_shield_hit = {
    limit: 0.18,
    room: 0.4,
    gain: 0.08,
    classic: 'hit',
    voices: function (k) {
        k.sample({name: ['field_1', 'field_2'][k.turn(2)], a: 0.5, rate: k.r(1.3, 1.6)});
    },
};
