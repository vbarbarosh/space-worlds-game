// A race's start count, each second: a round beep with a click on its front
const sfx_new_countdown = {
    limit: 0.5,
    room: 0.5,
    gain: 0.66,
    voices: function (k) {
        k.tone({d: 0.18, a: 0.05, f: 587.33, type: 'square', cutoff: 1500, hold: 0.06});
        k.tone({d: 0.18, a: 0.03, f: 1174.66, hold: 0.04});
        k.noise({d: 0.01, a: 0.02, cutoff: 3000, filter: 'highpass'});
    },
};
