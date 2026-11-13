// A run begun: the engine catching and the ship pulled out into the dark
const sfx_new_launch = {
    limit: 2,
    room: 1,
    gain: 2.39,
    voices: function (k) {
        k.tone({d: 0.2, a: 0.1, f: 70, f_end: 38, glide: 0.15});
        k.noise({d: 1, a: 0.09, color: 'pink', cutoff: 280, cutoff_end: 2600, sweep: 0.7, attack: 0.32, q: 0.6});
        k.tone({d: 0.9, a: 0.035, f: 58, f_end: 165, glide: 0.7, type: 'sawtooth', cutoff: 850, attack: 0.25, drive: 1.5});
        k.noise({d: 0.5, a: 0.02, cutoff: 5000, filter: 'highpass', attack: 0.3, at: 0.4, extra: true});
    },
};
