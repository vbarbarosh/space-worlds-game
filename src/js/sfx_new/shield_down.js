// Your shield broken: its field falling away in pitch, a crack of glass, the hull bare with a thump
const sfx_new_shield_down = {
    limit: 0.6,
    room: 0.7,
    gain: 0.95,
    voices: function (k) {
        k.tone({d: 0.42, a: 0.05, f: 1900, f_end: 180, glide: 0.36, fm: {ratio: 1.5, index: 2, index_end: 0.2, d: 0.3}, cutoff: 5000});
        k.noise({d: 0.07, a: 0.07, cutoff: 3200, filter: 'highpass'});
        for (let i = 0; i < 3; ++i) {
            k.noise({d: 0.02, a: 0.03, cutoff: 5000 + Math.random()*3000, filter: 'highpass', at: 0.06 + i*0.05 + Math.random()*0.03, extra: true});
        }
        k.tone({d: 0.22, a: 0.09, f: 84, f_end: 40, glide: 0.16});
    },
};
