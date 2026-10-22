// Your pulse (Space) going off, an EMP charge, a fall into a black hole's core: a recording of an electromagnetic pulse
// (src/sounds/pulse.mp3); the music dips under it
const sfx_pulse = {
    limit: 0.08,
    recorded: true,
    play: function (note, air, t, clip) {
        clip('pulse', 0.89, 0.96 + Math.random()*0.08);
        sound.duck_until = t + 1.1;
    },
};
