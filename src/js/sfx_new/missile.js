// Your Seeker launching: a thump off the rail, then the motor catching and pulling away
const sfx_new_missile = {
    limit: 0.12,
    room: 0.4,
    gain: 1.24,
    voices: function (k) {
        const r = k.r(0.95, 1.05);
        k.tone({d: 0.12, a: 0.085, f: 82, f_end: 40, glide: 0.09});
        k.noise({d: 0.05, a: 0.04, cutoff: 1400, q: 0.6});
        k.noise({d: 0.42, a: 0.05, color: 'pink', cutoff: 700*r, cutoff_end: 3200*r, attack: 0.06, at: 0.03});
        k.tone({d: 0.36, a: 0.022, f: 160*r, f_end: 500*r, type: 'sawtooth', cutoff: 1600, attack: 0.05, at: 0.04, drive: 1.5});
    },
};
