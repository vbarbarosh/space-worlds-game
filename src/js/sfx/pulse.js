// Your pulse (Space) going off, an EMP charge, a fall into a black hole's core: a recording of a wave spreading out
// (src/sounds/pulse.mp3): it swells for 0.6 s as the ring grows to its reach, then washes away; the music dips under it
const sfx_pulse = {
    limit: 0.08,
    recorded: true,
    play: function (note, air, t, clip) {
        clip('pulse', 0.35, 0.96 + Math.random()*0.08);
        sound.duck_until = t + 1.6;
    },
};
