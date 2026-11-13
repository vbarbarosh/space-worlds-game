// Inside an ion storm, a pylon's strike, a flagship's storm: a crack of lightning and its thunder rolling off
const sfx_new_storm = {
    limit: 1.5,
    room: 1,
    gain: 0.63,
    voices: function (k) {
        const r = k.r(0.9, 1.1);
        k.noise({d: 0.03, a: 0.11, cutoff: 2600, filter: 'highpass'});
        k.noise({d: 0.05, a: 0.05, cutoff: 5200, filter: 'highpass', at: 0.05 + Math.random()*0.03});
        k.noise({d: 0.7, a: 0.11, color: 'pink', cutoff: 1900*r, cutoff_end: 180, filter: 'lowpass', drive: 1.8});
        k.tone({d: 0.5, a: 0.1, f: 86*r, f_end: 34, glide: 0.4});
    },
};
