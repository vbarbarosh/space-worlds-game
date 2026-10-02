const sfx_upgrade = {
    limit: 0.25,
    play: function (note, air, t) {
        const semitones = [0, 7, 12];
        for (let i = 0, end = semitones.length; i < end; ++i) {
            const ratio = Math.pow(2, semitones[i]/12);
            note(261.63*ratio, 0.65, 0.035, null, 'sine', i*0.14);
        }
    },
};
