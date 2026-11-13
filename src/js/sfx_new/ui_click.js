// A button pressed, anywhere: a small soft tick, so the panels answer the hand
const sfx_new_ui_click = {
    limit: 0.04,
    room: 0.15,
    gain: 0.92,
    voices: function (k) {
        k.tone({d: 0.04, a: 0.03, f: 1500, f_end: 1050, glide: 0.03});
        k.noise({d: 0.008, a: 0.014, cutoff: 4000, filter: 'highpass'});
    },
};
