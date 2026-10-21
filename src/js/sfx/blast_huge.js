// A flagship's last blast, fitted to the author's examples and longer: a crack, a sub-bass that shakes, a rumble of
// bursts swelling over a third of a second and rolling on for seconds, grit over it and debris falling for three
const sfx_blast_huge = {
    limit: 0.5,
    room: true,
    // fitted to the examples, it peaks near full scale alone; this brings it under the limiter
    volume: 0.6,
    play: function (note, air, t, grit) {
        grit(0.05, 0.352, 3000, 0, 0, 'bandpass');
        note(55, 3, 0.09, 22);
        note(34, 3.6, 0.07, 20);
        for (let i = 0; i < 6; ++i) {
            air(6.5 + Math.random()*1, 0.28, 250 + Math.random()*200, Math.random()*0.6, 35, 'lowpass', 0.35);
        }
        grit(3, 0.32, 2500, 0.1, 300, 'lowpass', 0.3);
        for (let i = 0; i < 20; ++i) {
            grit(0.025, 0.32, 1500 + Math.random()*3000, 0.3 + Math.random()*2.7, 0, 'bandpass');
        }
    },
};
