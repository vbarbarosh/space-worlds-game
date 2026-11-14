// A raider's or a flagship's missile launching: the thruster's recording, lower and duller
const sfx_new_enemy_missile = {
    limit: 0.18,
    room: 0.4,
    gain: 0.18,
    voices: function (k) {
        k.sample({name: 'thrust', a: 0.5, rate: k.r(0.85, 0.98), fade: 0.5, cutoff: 2800});
    },
};
