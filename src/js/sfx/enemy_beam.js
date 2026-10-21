// A beam: a sizzling burst, buzzing and bright, over a low hum
const sfx_enemy_beam = {
    limit: 0.1,
    play: function (note, air, t) {
        const r = 0.95 + Math.random()*0.1;
        note(340*r, 0.22, 0.028, 240*r, 'sawtooth', 0, 1800);
        note(680*r, 0.2, 0.011, 480*r, 'square', 0, 2600);
        air(0.2, 0.04, 4200, 0, 1600);
        note(85, 0.1, 0.035, 50);
    },
};
