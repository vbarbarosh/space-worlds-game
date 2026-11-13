// A jump through a portal or a gate; a flagship escaping or jumping: the gate opening as a rush, three voices
// rising an octave into it, and the pull of it underneath
const sfx_new_portal = {
    limit: 0.6,
    room: 1,
    gain: 1.42,
    voices: function (k) {
        k.noise({d: 1.5, a: 0.15, color: 'pink', cutoff: 520, cutoff_end: 3000, sweep: 0.9, attack: 0.45, q: 0.6});
        const notes = [146.83, 220, 293.66];
        for (let i = 0; i < notes.length; ++i) {
            k.tone({d: 1.0, a: 0.035, f: notes[i], f_end: notes[i]*2, glide: 0.8, attack: 0.12, at: i*0.12, fm: {ratio: 2, index: 0.5, index_end: 0.05}, spread: (i - 1)*0.4});
        }
        k.tone({d: 1.3, a: 0.13, f: 44, f_end: 78, glide: 1, attack: 0.2});
        k.noise({d: 0.5, a: 0.03, cutoff: 6000, filter: 'highpass', attack: 0.3, at: 0.75, extra: true});
    },
};
