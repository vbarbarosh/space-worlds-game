const sfx_portal = {
    limit: 0.6,
    play: function (note, air, t) {
        air(1.4, 0.1, 850);
        const semitones = [0, 7, 12];
        for (let i = 0, end = semitones.length; i < end; ++i) {
            const ratio = Math.pow(2, semitones[i]/12);
            note(146.83*ratio, 1.3, 0.035, 293.66*ratio, 'sine', i*0.12);
        }
        note(44, 1.2, 0.1, 75);
        sound.duck_until = t + 1.5;
    },
};
