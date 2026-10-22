// A raider's plasma shot: your shot's darker, lower cousin, so you hear whose it is
const sfx_enemy_plasma = {
    limit: 0.08,
    play: function (note, air, t) {
        const r = 0.94 + Math.random()*0.12;
        air(0.02, 0.035, 2600);
        note(420*r, 0.12, 0.03, 110*r, 'sawtooth', 0, 1500);
        note(96*r, 0.09, 0.04, 48);
        air(0.1, 0.012, 1100, 0.01, 500);
    },
};
