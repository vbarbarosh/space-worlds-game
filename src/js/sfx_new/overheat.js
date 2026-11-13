// Your guns locked by heat: steam venting, a buzz of refusal, the charge running down
const sfx_new_overheat = {
    limit: 1,
    room: 0.6,
    gain: 0.53,
    voices: function (k) {
        k.noise({d: 0.8, a: 0.06, cutoff: 2600, filter: 'highpass', attack: 0.02, late: true});
        k.tone({d: 0.26, a: 0.035, f: 142, type: 'square', cutoff: 950, hold: 0.14});
        k.tone({d: 0.4, a: 0.03, f: 640, f_end: 190, glide: 0.34, cutoff: 2400});
    },
};
