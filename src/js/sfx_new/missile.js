// Your Seeker launching: a thruster's recording, catching and pulling away
const sfx_new_missile = {
    limit: 0.12,
    room: 0.4,
    gain: 0.19,
    voices: function (k) {
        k.sample({name: 'thrust', a: 0.5, rate: k.r(1.25, 1.45), fade: 0.5});
    },
};
