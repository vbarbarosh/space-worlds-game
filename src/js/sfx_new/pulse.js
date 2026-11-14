// Your pulse going off, an EMP charge, a fall into a black hole's core: a deep boom with a field's hum swelling out
// of it, recordings
const sfx_new_pulse = {
    limit: 0.08,
    room: 1,
    gain: 0.72,
    voices: function (k) {
        k.sample({name: 'boom_low', a: 0.3, rate: 0.9});
        k.sample({name: 'field_3', a: 0.5, rate: 0.5, at: 0.02});
        k.sample({name: 'thrust', a: 0.4, rate: 0.6, at: 0.05, cutoff: 2400});
    },
};
