// Your shield broken: its field dropping away low, glass ringing as it goes, the hull bare with a thump (recordings)
const sfx_new_shield_down = {
    limit: 0.6,
    room: 0.7,
    gain: 0.27,
    voices: function (k) {
        k.sample({name: 'field_3', a: 0.5, rate: 0.6});
        k.sample({name: 'glass', a: 0.25, rate: k.r(0.85, 1), at: 0.03});
        k.sample({name: 'hit_low', a: 0.3, rate: 0.85, at: 0.05});
    },
};
