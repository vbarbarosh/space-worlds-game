// Your own Beam: a field's hum held for a moment, a recording, pitched up and clean
const sfx_new_gun_beam = {
    limit: 0.1,
    room: 0.3,
    gain: 0.1,
    classic: 'enemy_beam',
    voices: function (k) {
        k.sample({name: 'field_3', a: 0.5, rate: k.r(1.9, 2.1), fade: 0.24});
    },
};
