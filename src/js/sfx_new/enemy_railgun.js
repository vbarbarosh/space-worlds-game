// A raider's rail gun: your rail gun's recording slowed and dulled
const sfx_new_enemy_railgun = {
    limit: 0.12,
    room: 0.4,
    gain: 0.08,
    voices: function (k) {
        k.sample({name: ['rail_1', 'rail_2'][k.turn(2)], a: 0.5, rate: k.r(0.7, 0.8), cutoff: 2600});
    },
};
