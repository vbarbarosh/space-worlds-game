// A raider destroyed, a cliff falling, a flagship's part gone: a crunch of metal giving way over a drop; three of
// them in turn (its ring higher or lower, a second crack in one), so a run of kills is not one sound repeated
const sfx_new_kill = {
    limit: 0.09,
    room: 0.6,
    gain: 1.12,
    voices: function (k) {
        const r = k.r(0.9, 1.1);
        const turn = k.turn(3);
        const ring = [520, 700, 410][turn]*r;
        k.noise({d: 0.03, a: 0.1, cutoff: 2800, filter: 'highpass'});
        k.noise({d: 0.32, a: 0.13, color: 'pink', cutoff: [1100, 1500, 850][turn]*r, cutoff_end: 200, q: 0.6, drive: 2});
        k.tone({d: 0.3, a: 0.11, f: 150*r, f_end: 40, glide: 0.22, type: 'triangle'});
        k.tone({d: 0.16, a: 0.03, f: ring, f_end: ring*0.58, fm: {ratio: 2.76, index: 1.6, index_end: 0.1, d: 0.1}, at: 0.01, extra: true});
        if (turn === 2) {
            k.noise({d: 0.03, a: 0.06, cutoff: 2200, filter: 'highpass', at: 0.05});
        }
    },
};
