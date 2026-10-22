// A ship's blast (a tank, a carrier, a flagship's chain): the same explosion recording, fuller and a little lower
const sfx_blast_big = {
    limit: 0.12,
    play: function (note, air, t, clip) {
        clip('explosion', 0.44, 0.9 + Math.random()*0.12);
    },
};
