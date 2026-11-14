// A ship's blast (a raider dying, a flagship's chain): a hard snap, a heavy boom rolling down, a growl under it and
// debris rattling away; three in turn (one with a second, smaller boom inside it, one rolling longer and lower)
const sfx_new_blast_big = {
    limit: 0.12,
    room: 1,
    gain: 0.93,
    queue: 4,
    voices: function (k) {
        const r = k.r(0.9, 1.1);
        const turn = k.turn(3);
        const roll = (turn === 2) ? 1.05 : 0.85;
        k.noise({d: 0.03, a: 0.16, cutoff: 2200, filter: 'highpass'});
        k.noise({d: roll, a: 0.27, color: 'pink', cutoff: ((turn === 2) ? 1700 : 2100)*r, cutoff_end: 150, filter: 'lowpass', drive: 2.4});
        k.tone({d: 0.7, a: 0.21, f: 74*r, f_end: 27, glide: 0.5});
        k.tone({d: 0.34, a: 0.05, f: 112*r, f_end: 40, type: 'sawtooth', cutoff: 420, drive: 2});
        if (turn === 1) {
            k.tone({d: 0.4, a: 0.1, f: 92*r, f_end: 34, glide: 0.3, at: 0.1});
            k.noise({d: 0.3, a: 0.08, color: 'pink', cutoff: 1500, cutoff_end: 200, filter: 'lowpass', at: 0.1});
        }
        for (let i = 0, end = 2 + turn; i < end; ++i) {
            k.noise({d: 0.07, a: 0.022, cutoff: 3000 + Math.random()*2600, q: 1.4, at: 0.12 + i*0.11 + Math.random()*0.06, extra: true});
        }
    },
};
