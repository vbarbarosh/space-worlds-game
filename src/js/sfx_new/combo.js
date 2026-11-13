// The combo one higher: a small bright tick, a step up the scale with each, so a long run of kills is heard climbing
const sfx_new_combo = {
    limit: 0.08,
    room: 0.5,
    gain: 2.24,
    voices: function (k) {
        const steps = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
        const up = Math.pow(2, steps[clamp(combo - 2, 0, steps.length - 1)]/12);
        k.tone({d: 0.1, a: 0.03, f: 587.33*up, fm: {ratio: 3, index: 0.6, index_end: 0.02, d: 0.05}});
        k.tone({d: 0.06, a: 0.012, f: 1174.66*up});
    },
};
