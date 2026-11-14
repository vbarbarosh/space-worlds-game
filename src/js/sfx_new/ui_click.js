// A button pressed, anywhere: a small click, a recording, so the panels answer the hand
const sfx_new_ui_click = {
    limit: 0.04,
    room: 0.15,
    gain: 0.32,
    voices: function (k) {
        k.sample({name: 'click', a: 0.3, rate: k.r(0.96, 1.04)});
    },
};
