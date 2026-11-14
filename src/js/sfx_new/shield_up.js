// Your shield whole again after it was worn low: its field closing high and a swish of air rising into it (recordings)
const sfx_new_shield_up = {
    limit: 1,
    room: 0.8,
    gain: 0.13,
    voices: function (k) {
        k.sample({name: 'field_1', a: 0.4, rate: 1.5});
        k.sample({name: 'swish_up', a: 0.2, rate: 1.2});
    },
};
