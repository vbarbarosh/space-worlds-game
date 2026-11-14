// A raider's ion gun: your ion gun's recording slowed and dulled
const sfx_new_enemy_ion = {
    limit: 0.08,
    room: 0.15,
    gain: 0.02,
    voices: function (k) {
        k.sample({name: ['ion_1', 'ion_2'][k.turn(2)], a: 0.5, rate: k.r(0.68, 0.78), cutoff: 2600});
    },
};
