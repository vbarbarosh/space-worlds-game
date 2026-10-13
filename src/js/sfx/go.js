// A race's green light: the count's beep an octave up, held, with a rush of air
const sfx_go = {
    limit: 0.5,
    play: function (note, air, t) {
        note(1174.66, 0.5, 0.05, null, 'square', 0, 2400);
        note(587.33, 0.5, 0.03, null, 'sine');
        air(0.4, 0.05, 1600);
    },
};
