// Your guns locked by heat: steam let go and a low buzz of refusal (recordings)
const sfx_new_overheat = {
    limit: 1,
    room: 0.6,
    gain: 0.19,
    voices: function (k) {
        k.sample({name: 'door_open', a: 0.4, rate: 0.7});
        k.sample({name: 'buzz', a: 0.35, at: 0.04});
        k.sample({name: 'buzz', a: 0.3, rate: 0.84, at: 0.26});
    },
};
