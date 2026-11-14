// A juggernaut's sign before its charge (Dustfall's task, arcade_juggernauts.js): its drive's hum climbing with the
// air drawn in, and the thrusters opening as it goes (recordings)
const sfx_new_juggernaut_charge = {
    limit: 0.5,
    room: 0.6,
    gain: 0.14,
    classic: 'boost',
    voices: function (k) {
        k.sample({name: 'drone', a: 0.5, rate: 1.5});
        k.sample({name: 'swish_up', a: 0.25, rate: 0.55});
        k.sample({name: 'thrust', a: 0.45, rate: 0.75, at: 0.85});
    },
};
