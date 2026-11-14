// Docked at the station: a latch shutting on the hull, the clamps' thud, the lock's air hissing in (recordings)
const sfx_new_dock = {
    limit: 0.5,
    room: 0.8,
    gain: 0.17,
    voices: function (k) {
        k.sample({name: 'latch', a: 0.5});
        k.sample({name: 'hit_low', a: 0.3, rate: 1.1, at: 0.02});
        k.sample({name: 'door_close', a: 0.3, rate: 0.9, at: 0.12});
    },
};
