// Inside a solar flare, a flagship's heat: fire breathing over you, crackling, with the furnace's weight under it
const sfx_new_flare = {
    limit: 1.5,
    room: 0.8,
    gain: 0.65,
    voices: function (k) {
        k.noise({d: 0.75, a: 0.13, color: 'pink', cutoff: 380, cutoff_end: 1500, sweep: 0.3, attack: 0.1, q: 0.5, drive: 1.6});
        k.tone({d: 0.6, a: 0.11, f: 64, f_end: 32, glide: 0.45, attack: 0.03});
        for (let i = 0; i < 4; ++i) {
            k.noise({d: 0.018, a: 0.03, cutoff: 3000 + Math.random()*3000, filter: 'highpass', at: 0.08 + i*0.11 + Math.random()*0.07, extra: true});
        }
    },
};
