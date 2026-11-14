// A jump through a portal or a gate; a flagship escaping or jumping: the air drawn into the gate, its field ringing
// low as it takes the ship, a hiss let go behind (recordings)
const sfx_new_portal = {
    limit: 0.6,
    room: 1,
    gain: 0.16,
    voices: function (k) {
        k.sample({name: 'swell', a: 0.5, rate: 0.9});
        k.sample({name: 'field_3', a: 0.45, rate: 0.5, at: 0.7});
        k.sample({name: 'door_open', a: 0.15, rate: 0.6, at: 0.72});
    },
};
