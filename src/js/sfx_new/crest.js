// A wave's crest breaking on you: a drum struck, the horn's fifth leaping up under a rush of air
const sfx_new_crest = {
    limit: 2,
    room: 1,
    gain: 0.75,
    voices: function (k) {
        k.tone({d: 0.5, a: 0.14, f: 110, f_end: 40, glide: 0.35});
        k.noise({d: 0.06, a: 0.05, cutoff: 1200, q: 0.7});
        for (const f of [146.83, 220, 293.66]) {
            k.tone({d: 0.7, a: 0.035, f, f_end: f*1.122, glide: 0.25, type: 'sawtooth', cutoff: 700, cutoff_end: 2000, sweep: 0.3, attack: 0.04, hold: 0.25, drive: 1.6, spread: (f - 220)/260});
        }
        k.noise({d: 0.8, a: 0.05, color: 'pink', cutoff: 400, cutoff_end: 3000, sweep: 0.4, attack: 0.25, q: 0.7});
    },
};
