// A flagship's last blast: a crack, a long roar sinking to a rumble, a sub-bass that shakes, and debris falling for
// two seconds
const sfx_blast_huge = {
    limit: 0.8,
    play: function (note, air, t) {
        air(0.07, 0.2, 3600);
        air(2.4, 0.32, 1500, 0, 70, 'lowpass');
        note(44, 1.8, 0.22, 21);
        note(88, 1, 0.08, 30, 'sawtooth', 0, 320);
        air(2.8, 0.07, 240, 0.1, 60, 'lowpass');
        for (const delay of [0.2, 0.55, 0.95, 1.4]) {
            air(0.35, 0.035, 3800, delay, 1200);
        }
    },
};
