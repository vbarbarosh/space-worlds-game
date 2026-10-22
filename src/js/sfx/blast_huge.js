// A flagship's last blast: a long recording (src/sounds/), the world's kind of explosion (blast_set)
const sfx_blast_huge = {
    limit: 0.8,
    play: function (note, air, t, clip) {
        const r = 0.96 + Math.random()*0.08;
        if (blast_set() === 'deep') {
            clip('explosion_deep_huge', 0.53, r);
        }
        else {
            clip('explosion_big', 0.66, r);
        }
    },
};
