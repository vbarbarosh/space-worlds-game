// An ace jumping in: a sharp call of three, out and back, hard-edged
const sfx_new_event_ace = {
    limit: 2,
    room: 0.5,
    gain: 0.58,
    voices: function (k) {
        const notes = [987.77, 1396.91, 987.77];
        for (let i = 0; i < notes.length; ++i) {
            k.tone({d: 0.09, a: 0.035, f: notes[i], type: 'sawtooth', cutoff: 3200, hold: 0.04, at: i*0.1, drive: 1.6});
        }
        k.tone({d: 0.3, a: 0.05, f: 98, f_end: 62, at: 0});
    },
};
