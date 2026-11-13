// An ore rock broken, drifting debris or a cliff struck, a flagship's mine: stone cracking apart, a thud, and
// chips skittering off
const sfx_new_mine = {
    limit: 0.12,
    room: 0.5,
    gain: 1.72,
    voices: function (k) {
        const r = k.r(0.88, 1.12);
        const cracks = [2100, 3300, 1400];
        for (let i = 0; i < cracks.length; ++i) {
            k.noise({d: 0.04, a: 0.07 - i*0.012, cutoff: cracks[i]*r, q: 1.3, at: i*0.024 + Math.random()*0.006, drive: 1.5});
        }
        k.tone({d: 0.15, a: 0.06, f: 150*r, f_end: 55, glide: 0.11});
        for (let i = 0; i < 3; ++i) {
            k.noise({d: 0.02, a: 0.018, cutoff: 3200 + Math.random()*2400, q: 2, at: 0.09 + i*0.045 + Math.random()*0.03, extra: true});
        }
    },
};
