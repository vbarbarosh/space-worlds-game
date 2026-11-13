// Your Pulse cannon: a bright bolt falling fast to a low body, a click of air before it; three bolts in turn and
// each a little off in pitch, so a stream of them is not one sound repeated
const sfx_new_shot = {
    limit: 0.065,
    room: 0.18,
    gain: 0.91,
    voices: function (k) {
        const r = k.r(0.94, 1.06);
        const top = [2300, 2650, 2050][k.turn(3)]*r;
        k.noise({d: 0.016, a: 0.045, cutoff: 5200, filter: 'highpass'});
        k.tone({d: 0.11, a: 0.05, f: top, f_end: 230*r, glide: 0.07, fm: {ratio: 2.01, index: 1.5, index_end: 0.04, d: 0.06}, cutoff: 6500});
        k.tone({d: 0.1, a: 0.075, f: 168*r, f_end: 60, glide: 0.08});
        k.noise({d: 0.08, a: 0.012, color: 'pink', cutoff: 1900, cutoff_end: 500, at: 0.01, extra: true});
    },
};
