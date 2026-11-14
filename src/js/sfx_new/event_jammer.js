// A jammer blinding the radar: the board breaking into static, twice (a recording)
const sfx_new_event_jammer = {
    limit: 2,
    room: 0.4,
    gain: 0.23,
    voices: function (k) {
        k.sample({name: 'static', a: 0.4, rate: k.r(0.95, 1.1)});
        k.sample({name: 'static', a: 0.25, rate: 1.3, from: 0.1, at: 0.5, fade: 0.35});
    },
};
