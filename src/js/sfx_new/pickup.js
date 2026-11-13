// Salvage or a supply picked up, a purchase, a card chosen: two small bells, the second a fifth up; a run of
// pickups climbs a step with each one (k.streak), so sweeping a field of salvage plays a rising line
const sfx_new_pickup = {
    limit: 0.09,
    room: 0.6,
    gain: 2.02,
    streak: 1.3,
    voices: function (k) {
        const steps = [0, 2, 4, 7, 9, 12, 14, 16, 19];
        const up = Math.pow(2, steps[Math.min(k.streak, steps.length - 1)]/12);
        k.tone({d: 0.2, a: 0.05, f: 1318.51*up, fm: {ratio: 3.5, index: 0.7, index_end: 0.02, d: 0.08}, spread: -0.2});
        k.tone({d: 0.3, a: 0.04, f: 1975.53*up, fm: {ratio: 3.5, index: 0.5, index_end: 0.02, d: 0.08}, at: 0.055, spread: 0.2});
        k.tone({d: 0.16, a: 0.03, f: 659.25*up, type: 'triangle', cutoff: 3000});
    },
};
