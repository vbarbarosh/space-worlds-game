// A raider's scatter gun: your scatter gun's three lasers, slowed and dulled
const sfx_new_enemy_scatter = {
    limit: 0.1,
    room: 0.2,
    gain: 0.03,
    voices: function (k) {
        for (let i = 0; i < 3; ++i) {
            k.sample({name: 'shot_b', a: 0.4, rate: [0.64, 0.74, 0.86][i]*k.r(0.97, 1.03), at: i*0.02, cutoff: 2600});
        }
    },
};
