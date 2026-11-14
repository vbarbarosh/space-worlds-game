// A raider's beam, a flagship's, a pylon's: the field's hum lower and rougher than your own beam's
const sfx_new_enemy_beam = {
    limit: 0.1,
    room: 0.3,
    gain: 0.08,
    voices: function (k) {
        k.sample({name: 'field_3', a: 0.5, rate: k.r(1.2, 1.35), fade: 0.24, cutoff: 3000});
    },
};
