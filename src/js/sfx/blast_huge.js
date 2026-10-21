// A flagship's last blast: a muffled crack, a sub-bass that shakes, a long roar sinking into a rumble, and its tail
// rolling on for three seconds
const sfx_blast_huge = {
    limit: 0.5,
    room: true,
    play: function (note, air, t) {
        air(0.1, 0.11, 2200, 0, 0, 'lowpass');
        note(70, 2, 0.2, 22);
        note(38, 2.4, 0.15, 20);
        air(3, 0.32, 1000, 0, 50, 'lowpass');
        air(3.2, 0.09, 220, 0.2, 40, 'lowpass');
        for (const delay of [0.4, 0.9, 1.5]) {
            air(0.8, 0.05, 700, delay, 120, 'lowpass');
        }
    },
};
