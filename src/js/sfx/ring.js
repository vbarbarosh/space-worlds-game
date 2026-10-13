// Through a race's ring: a quick rising pair, brighter than a pickup
const sfx_ring = {
    limit: 0.2,
    play: function (note, air, t) {
        note(783.99, 0.14, 0.04, null, 'triangle');
        note(1174.66, 0.22, 0.035, null, 'triangle', 0.06);
    },
};
