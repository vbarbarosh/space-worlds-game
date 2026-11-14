// One of Verdant's nests burnt: it bursts wet and heavy, with the cry of what lived in it, and bits of it rain down
const sfx_new_nest_burst = {
    limit: 1,
    room: 1,
    gain: 0.52,
    voices: function (k) {
        k.tone({d: 0.5, a: 0.16, f: 92, f_end: 30, glide: 0.35});
        k.noise({d: 0.7, a: 0.2, color: 'pink', cutoff: 1900, cutoff_end: 200, filter: 'lowpass', drive: 2.2});
        k.tone({d: 0.55, a: 0.05, f: 940, f_end: 280, glide: 0.45, fm: {ratio: 1.41, index: 3, index_end: 0.4, d: 0.4}, cutoff: 3600, attack: 0.02});
        for (let i = 0; i < 6; ++i) {
            const f = k.r(260, 640);
            k.tone({d: 0.07, a: 0.025, f, f_end: f*1.7, glide: 0.05, at: 0.2 + i*0.09 + Math.random()*0.05, spread: k.r(-0.5, 0.5), extra: true});
        }
    },
};
