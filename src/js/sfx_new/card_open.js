// The arcade's cards laid out for a pick: a swish of air and two notes rising under it
const sfx_new_card_open = {
    limit: 0.5,
    room: 0.7,
    gain: 1.45,
    voices: function (k) {
        k.noise({d: 0.32, a: 0.04, color: 'pink', cutoff: 800, cutoff_end: 3400, attack: 0.06, q: 0.8});
        k.tone({d: 0.26, a: 0.03, f: 523.25, fm: {ratio: 2, index: 0.7, index_end: 0.03, d: 0.1}, at: 0.05, spread: -0.25});
        k.tone({d: 0.34, a: 0.03, f: 783.99, fm: {ratio: 2, index: 0.7, index_end: 0.03, d: 0.1}, at: 0.14, spread: 0.25});
    },
};
