// A mine (a barrel, the author calls it) going off: a hard crack, a heavy boom rolling down, a low growl and debris
// rattling after it, made in code: the game's old ship blast, which the author heard as a barrel struck and asked
// back for the barrels
const sfx_blast_barrel = {
    limit: 0.12,
    play: function (note, air, t) {
        const r = 0.92 + Math.random()*0.16;
        air(0.05, 0.071, 4000);
        air(0.95, 0.126, 1900*r, 0, 160, 'lowpass');
        note(58*r, 0.7, 0.077, 26);
        note(112*r, 0.32, 0.032, 40, 'sawtooth', 0, 420);
        air(0.55, 0.024, 4200, 0.12, 1400);
        air(0.3, 0.015, 3000, 0.35, 900);
    },
};
