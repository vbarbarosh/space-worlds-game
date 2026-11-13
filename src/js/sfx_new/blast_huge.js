// A flagship's last blast: the snap, a roar that rolls for two seconds, a second boom inside it, a rumble under all
// and debris falling for a long while
const sfx_new_blast_huge = {
    limit: 0.8,
    room: 1,
    gain: 1.05,
    voices: function (k) {
        k.noise({d: 0.04, a: 0.18, cutoff: 1800, filter: 'highpass'});
        k.noise({d: 2.3, a: 0.3, color: 'pink', cutoff: 1700, cutoff_end: 70, filter: 'lowpass', drive: 2.6});
        k.tone({d: 1.5, a: 0.24, f: 58, f_end: 21, glide: 1.1});
        k.tone({d: 1.1, a: 0.17, f: 70, f_end: 25, glide: 0.8, at: 0.19});
        k.noise({d: 1.0, a: 0.15, color: 'pink', cutoff: 1200, cutoff_end: 110, filter: 'lowpass', at: 0.19, drive: 2});
        k.tone({d: 0.7, a: 0.05, f: 88, f_end: 30, type: 'sawtooth', cutoff: 380, drive: 2});
        k.noise({d: 2.4, a: 0.05, color: 'brown', cutoff: 240, filter: 'lowpass', attack: 0.2});
        for (let i = 0; i < 6; ++i) {
            k.noise({d: 0.09, a: 0.02, cutoff: 2600 + Math.random()*3000, q: 1.4, at: 0.2 + i*0.22 + Math.random()*0.1, extra: true});
        }
    },
};
