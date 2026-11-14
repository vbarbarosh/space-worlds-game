// Your own Rail gun: a heavy laser's recording, the slug's thud in it; two in turn
const sfx_new_gun_rail = {
    limit: 0.12,
    room: 0.4,
    gain: 0.15,
    classic: 'enemy_railgun',
    voices: function (k) {
        k.sample({name: ['rail_1', 'rail_2'][k.turn(2)], a: 0.5, rate: k.r(0.95, 1.05)});
    },
};
