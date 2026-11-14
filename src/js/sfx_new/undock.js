// Undocked: the lock's air let go, the latch knocking open, the engine waking under you (recordings)
const sfx_new_undock = {
    limit: 0.5,
    room: 0.8,
    gain: 0.17,
    voices: function (k) {
        k.sample({name: 'door_open', a: 0.3, rate: 0.9});
        k.sample({name: 'latch', a: 0.4, rate: 0.8, at: 0.06});
        k.sample({name: 'thrust', a: 0.25, rate: 0.8, at: 0.3, fade: 0.7});
    },
};
