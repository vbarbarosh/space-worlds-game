// Salvage or a supply picked up, a purchase, a card chosen: two small bells, the second a fifth up, at the classic
// pickup's pitch; a run of pickups climbs a step of the scale with each one (k.streak), an octave at most, so sweeping
// a field of salvage plays a rising line
const sfx_new_pickup = {
    limit: 0.09,
    room: 0.6,
    gain: 2.48,
    streak: 1.3,
    voices: function (k) {
        const steps = [0, 2, 4, 5, 7, 9, 11, 12];
        const up = Math.pow(2, steps[Math.min(k.streak, steps.length - 1)]/12);
        k.tone({d: 0.2, a: 0.05, f: 659.25*up, fm: {ratio: 3.5, index: 0.7, index_end: 0.02, d: 0.08}, spread: -0.2});
        k.tone({d: 0.3, a: 0.04, f: 987.77*up, fm: {ratio: 3.5, index: 0.5, index_end: 0.02, d: 0.08}, at: 0.055, spread: 0.2});
        k.tone({d: 0.16, a: 0.03, f: 329.63*up, type: 'triangle', cutoff: 2400});
    },
};
