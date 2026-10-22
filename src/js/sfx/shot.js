// Your plasma shot, a cannon firing a beam of energy: a recording of a blaster (src/sounds/shot.mp3), a fast sweep
// from 2 kHz down into a low thump, the author's pick blind from thirteen bursts (2026-10-22 20:59; a laser's tone was
// "a children's game's", streaks of air made to Freelancer's measure "a bug"); each a little off the last in pitch, so
// a stream of them does not ring as one
const sfx_shot = {
    limit: 0.065,
    recorded: true,
    play: function (note, air, t, clip) {
        clip('shot', 0.103, 0.94 + Math.random()*0.12);
    },
};
