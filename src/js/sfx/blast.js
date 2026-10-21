// A small blast (a missile's, a mine's, a raider's death): a deep thump falling in pitch and a rumble sinking from dull
// to deep, with a soft muffled crack; nothing that rings (high bands and tones sounded like a tin can, the author)
const sfx_blast = {
    limit: 0.02,
    room: true,
    play: function (note, air, t) {
        const r = 0.9 + Math.random()*0.2;
        air(0.06, 0.056, 2600, 0, 0, 'lowpass');
        note(110*r, 0.4, 0.104, 34);
        air(0.75, 0.16, 900*r, 0, 90, 'lowpass');
    },
};
