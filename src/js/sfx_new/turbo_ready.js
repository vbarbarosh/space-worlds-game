// The turbo ready again: two small low ticks, under the pulse's note so the two are told apart
const sfx_new_turbo_ready = {
    limit: 0.5,
    room: 0.4,
    gain: 1.93,
    voices: function (k) {
        k.tone({d: 0.06, a: 0.03, f: 392, type: 'triangle', cutoff: 1800});
        k.tone({d: 0.09, a: 0.03, f: 523.25, type: 'triangle', cutoff: 1800, at: 0.07});
        k.noise({d: 0.08, a: 0.012, color: 'pink', cutoff: 900, cutoff_end: 2400, at: 0.02});
    },
};
