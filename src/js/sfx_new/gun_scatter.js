// Your own Scatter gun: three small lasers thrown out in a moment, each at its own pitch
const sfx_new_gun_scatter = {
    limit: 0.1,
    room: 0.2,
    gain: 0.07,
    classic: 'enemy_scatter',
    voices: function (k) {
        for (let i = 0; i < 3; ++i) {
            k.sample({name: 'shot_b', a: 0.4, rate: [0.9, 1.05, 1.2][i]*k.r(0.97, 1.03), at: i*0.016, spread: (i - 1)*0.25});
        }
    },
};
