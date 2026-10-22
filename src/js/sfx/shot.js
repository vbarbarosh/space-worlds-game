// Your plasma shot, a cannon firing a beam of energy: a recording of a blaster (src/sounds/shot.mp3), a sweep from
// 1.3 kHz down into a low thump with a gunshot's body, one of the author's picks blind from thirteen bursts
// (2026-10-22 20:59; a laser's tone was "a children's game's", streaks of air made to Freelancer's measure "a bug"),
// the one earshot hears as "a gunshot, an explosion" rather than "a digital glitch"; each a little off the last in
// pitch, so a stream of them does not ring as one
const sfx_shot = {
    limit: 0.065,
    recorded: true,
    play: function (note, air, t, clip) {
        clip('shot', 0.098, 0.94 + Math.random()*0.12);
    },
};
