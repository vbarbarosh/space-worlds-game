// A ship's blast (a tank, a carrier, a flagship's chain), fitted to the author's examples (a big explosion and a
// sci-fi one: swelling for 0.4 s, 20 dB down in 1.2 to 1.6 s): a crack, a deep thump and a sub, a rumble of bursts
// swelling over a fifth of a second and rolling on, grit over it and debris crackling
const sfx_blast_big = {
    limit: 0.02,
    room: true,
    // fitted to the examples, it peaks near full scale alone; this brings it under the limiter
    volume: 0.5,
    play: function (note, air, t, grit) {
        const r = 0.92 + Math.random()*0.16;
        grit(0.04, 0.352, 3200, 0, 0, 'bandpass');
        note(60*r, 2, 0.08, 26);
        note(38*r, 2.6, 0.06, 22);
        for (let i = 0; i < 4; ++i) {
            air(4.5 + Math.random()*0.8, 0.3, (300 + Math.random()*200)*r, Math.random()*0.25, 40, 'lowpass', 0.2);
        }
        grit(1.8, 0.32, 3000, 0.05, 500, 'lowpass', 0.15);
        for (let i = 0; i < 12; ++i) {
            grit(0.02, 0.32, 2000 + Math.random()*3000, 0.2 + Math.random()*1.6, 0, 'bandpass');
        }
    },
};
