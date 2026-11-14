// Your own Ion gun: a short hard laser's recording; two in turn
const sfx_new_gun_ion = {
    limit: 0.08,
    room: 0.15,
    gain: 0.04,
    classic: 'enemy_ion',
    voices: function (k) {
        k.sample({name: ['ion_1', 'ion_2'][k.turn(2)], a: 0.5, rate: k.r(0.95, 1.06)});
    },
};
