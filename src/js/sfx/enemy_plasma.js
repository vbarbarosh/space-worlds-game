// A raider's plasma shot: your shot's darker, lower cousin, so you hear whose it is: a recording of a low, punchy
// blast (src/sounds/shot_enemy.mp3), another of the author's picks from the thirteen bursts, played a little low
const sfx_enemy_plasma = {
    limit: 0.08,
    recorded: true,
    play: function (note, air, t, clip) {
        clip('shot_enemy', 0.052, 0.85 + Math.random()*0.1);
    },
};
