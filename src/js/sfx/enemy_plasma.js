// A raider's plasma shot: your shot's darker, lower cousin, so you hear whose it is: a recording of a softer laser
// (src/sounds/shot_enemy.mp3), a tone falling from 1 kHz to 300 Hz with a body under it, played a little low
const sfx_enemy_plasma = {
    limit: 0.08,
    recorded: true,
    play: function (note, air, t, clip) {
        clip('shot_enemy', 0.082, 0.85 + Math.random()*0.1);
    },
};
