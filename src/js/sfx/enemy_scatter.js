// A scatter blast: a crack, a burst of grit falling away and a heavy thump
const sfx_enemy_scatter = {
    limit: 0.1,
    play: function (note, air, t) {
        const r = 0.94 + Math.random()*0.12;
        air(0.03, 0.09, 3000);
        air(0.22, 0.1, 1800, 0, 500);
        note(150*r, 0.16, 0.06, 45, 'sawtooth', 0, 700);
        note(70*r, 0.18, 0.05, 38);
    },
};
