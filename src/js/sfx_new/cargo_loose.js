// A container torn off a hauler's string (Haven's task, arcade_haulers.js): its lock snapping, the box bursting open
// with a short crunch, its load scattering (recordings)
const sfx_new_cargo_loose = {
    limit: 0.3,
    room: 0.7,
    gain: 0.38,
    classic: 'blast',
    voices: function (k) {
        k.sample({name: 'latch', a: 0.3, rate: k.r(0.7, 0.85)});
        k.sample({name: ['boom_crunch_1', 'boom_crunch_3'][k.turn(2)], a: 0.6, rate: k.r(1.2, 1.35), at: 0.03, fade: 0.6});
        k.sample({name: 'debris', a: 0.15, rate: k.r(1.1, 1.4), at: 0.12, fade: 0.8, extra: true});
    },
};
