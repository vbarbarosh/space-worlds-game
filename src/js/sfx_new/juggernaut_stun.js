// A juggernaut's charge ending in a rock or a cliff: plate on stone, a heavy clang and the crunch of it (recordings)
const sfx_new_juggernaut_stun = {
    limit: 0.5,
    room: 0.8,
    gain: 0.51,
    classic: 'hit',
    voices: function (k) {
        k.sample({name: 'hit_low', a: 0.6, rate: 0.7});
        k.sample({name: ['hit_1', 'hit_2'][k.turn(2)], a: 0.4, rate: k.r(0.55, 0.65)});
        k.sample({name: 'rock', a: 0.35, rate: k.r(0.85, 1), at: 0.03, fade: 0.8});
    },
};
