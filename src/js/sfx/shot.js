// Your plasma shot, a cannon firing a beam of energy: a recording of a laser shot (src/sounds/shot.mp3), a tone falling
// from 720 Hz to 230 Hz in a quarter second; each a little off the last in pitch, so a stream of them does not ring
// as one beep. (The streaks of air made to Freelancer's measure "sounded like a bug", the author, 2026-10-22 20:29.)
const sfx_shot = {
    limit: 0.065,
    recorded: true,
    play: function (note, air, t, clip) {
        clip('shot', 0.077, 0.94 + Math.random()*0.12);
    },
};
