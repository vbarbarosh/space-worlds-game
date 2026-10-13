// A count before a race's start: one short square beep a second
const sfx_countdown = {
    limit: 0.5,
    play: function (note, air, t) {
        note(587.33, 0.16, 0.05, null, 'square', 0, 1800);
    },
};
