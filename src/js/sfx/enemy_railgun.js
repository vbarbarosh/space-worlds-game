// A rail slug: a hard crack, a ringing metal tail, a deep thump and the air closing behind it
const sfx_enemy_railgun = {
    limit: 0.12,
    play: function (note, air, t) {
        const r = 0.96 + Math.random()*0.08;
        air(0.03, 0.15, 5000);
        note(2400*r, 0.06, 0.028, 300, 'sawtooth', 0, 4000);
        note(1760*r, 0.35, 0.011, 1700*r, 'sine', 0.01);
        note(80*r, 0.22, 0.065, 38);
        air(0.25, 0.03, 2600, 0.02, 700);
    },
};
