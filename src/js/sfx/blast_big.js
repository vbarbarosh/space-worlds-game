// A ship's blast (a raider, a flagship's chain): a recording (src/sounds/), the world's kind of explosion (blast_set)
const sfx_blast_big = {
    limit: 0.12,
    play: function (note, air, t, clip) {
        const r = 0.93 + Math.random()*0.14;
        if (blast_set() === 'deep') {
            clip('explosion_deep', 0.37, r);
        }
        else {
            clip('explosion_medium', 0.74, r);
        }
    },
};
