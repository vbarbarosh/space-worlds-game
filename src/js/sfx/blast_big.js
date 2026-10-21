// A ship's blast (a tank, a carrier, a flagship's chain): a hard crack, a heavy boom rolling down, a low growl and
// debris rattling after it
const sfx_blast_big = {
    limit: 0.12,
    play: function (note, air, t) {
        const r = 0.92 + Math.random()*0.16;
        air(0.05, 0.135, 4000);
        air(0.95, 0.24, 1900*r, 0, 160, 'lowpass');
        note(58*r, 0.7, 0.145, 26);
        note(112*r, 0.32, 0.06, 40, 'sawtooth', 0, 420);
        air(0.55, 0.045, 4200, 0.12, 1400);
        air(0.3, 0.03, 3000, 0.35, 900);
    },
};
