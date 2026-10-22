// A flagship's last blast: the same explosion recording, loudest and lowest, twice over a third of a second apart
const sfx_blast_huge = {
    limit: 0.8,
    play: function (note, air, t, clip) {
        clip('explosion', 0.37, 0.78);
        clip('explosion', 0.28, 0.7, 0.35);
    },
};
