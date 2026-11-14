// A run begun: the engine's hum rising and the thrusters opened behind it (recordings)
const sfx_new_launch = {
    limit: 2,
    room: 1,
    gain: 0.28,
    voices: function (k) {
        k.sample({name: 'drone', a: 0.4, rate: 1.25});
        k.sample({name: 'thrust', a: 0.5, rate: 0.72, at: 0.35});
    },
};
