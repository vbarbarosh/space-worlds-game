// Inside a solar flare, a flagship's heat: a thruster's fire breathing over you, bits crackling in it (recordings)
const sfx_new_flare = {
    limit: 1.5,
    room: 0.8,
    gain: 0.42,
    voices: function (k) {
        k.sample({name: 'thrust', a: 0.6, rate: k.r(0.92, 1.04)});
        k.sample({name: 'debris', a: 0.2, rate: k.r(1.4, 1.8), from: Math.random()*0.3, fade: 0.9, extra: true});
    },
};
