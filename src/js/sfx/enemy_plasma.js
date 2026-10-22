// A raider's plasma shot: your shot's darker, lower cousin, so you hear whose it is; Freelancer's second gun in the
// author's track: a 45 ms streak of air round 2.5 kHz, barely falling, a lower tick under it
const sfx_enemy_plasma = {
    limit: 0.08,
    play: function (note, air, t) {
        const r = 0.94 + Math.random()*0.12;
        air(0.045, 0.28, 2600*r, 0, 2300*r, '', 2);
        air(0.03, 0.11, 1200*r, 0.004, 1000*r, '', 1.5);
    },
};
