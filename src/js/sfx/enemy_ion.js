// An ion bolt: an electric snap, a buzzing fall and a crackle
const sfx_enemy_ion = {
    limit: 0.08,
    play: function (note, air, t) {
        const r = 0.94 + Math.random()*0.12;
        note(880*r, 0.12, 0.024, 220*r, 'square', 0, 3000);
        note(1320*r, 0.08, 0.011, 420*r, 'sawtooth', 0.012, 3800);
        air(0.09, 0.05, 5200, 0, 1800);
        note(110*r, 0.08, 0.035, 55);
    },
};
