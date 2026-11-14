// The arcade's cards laid out for a pick: a swish of air rising, a recording, the second a little higher
const sfx_new_card_open = {
    limit: 0.5,
    room: 0.7,
    gain: 0.07,
    voices: function (k) {
        k.sample({name: 'swish_up', a: 0.4});
        k.sample({name: 'swish_up', a: 0.25, rate: 1.26, at: 0.12});
    },
};
