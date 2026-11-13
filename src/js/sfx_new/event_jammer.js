// A jammer blinding the radar: the board breaking into static, in bursts, as a tone slides away under it
const sfx_new_event_jammer = {
    limit: 2,
    room: 0.4,
    gain: 1.11,
    voices: function (k) {
        for (let i = 0; i < 4; ++i) {
            k.noise({d: 0.07 + Math.random()*0.05, a: 0.05, cutoff: 1800 + Math.random()*2400, q: 0.5, hold: 0.04, at: i*0.13 + Math.random()*0.04});
        }
        k.tone({d: 0.6, a: 0.03, f: 920, f_end: 300, glide: 0.5, fm: {ratio: 7.1, index: 1.5, index_end: 0.5}});
    },
};
