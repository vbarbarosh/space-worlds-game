// Your plasma shot, in the style of Freelancer's guns as the author's track has them (docs/designer/sound.md, the
// author's notes, 2026-10-22 20:07): a bright 35 ms streak of air falling from 6.3 kHz to 4.9 kHz, a faint lower tick
// under it, no thump; each a little off the last, so a stream of them does not ring as one beep
const sfx_shot = {
    limit: 0.065,
    play: function (note, air, t) {
        const r = 0.94 + Math.random()*0.12;
        air(0.035, 0.66, 7000*r, 0, 3800*r, '', 1.5);
        air(0.025, 0.22, 2400*r, 0.003, 1900*r, '', 1.5);
    },
};
