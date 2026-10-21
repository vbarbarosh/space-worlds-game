// A dash: a quick whoosh falling past, a kick of thrust and a short rising zip
const sfx_dash = {
    limit: 0.08,
    play: function (note, air, t) {
        air(0.38, 0.08, 3600, 0, 600);
        note(95, 0.14, 0.06, 45);
        note(260, 0.18, 0.018, 820, 'sawtooth', 0, 2000);
    },
};
