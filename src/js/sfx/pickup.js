// A pickup: a bright rising pair with a sparkle over it, loud enough to hear in a fight
const sfx_pickup = {
    limit: 0.16,
    play: function (note, air, t) {
        note(659.25, 0.16, 0.06, null, 'triangle', 0, 4000);
        note(987.77, 0.24, 0.045, null, 'triangle', 0.06, 4000);
        note(1318.51, 0.3, 0.02, null, 'sine', 0.11);
    },
};
