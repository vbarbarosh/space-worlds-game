// A flagship's last blast: its two layers, as the world combines them (explosion_play)
const sfx_blast_huge = {
    limit: 0.8,
    recorded: true,
    play: function (note, air, t, clip) {
        explosion_play(clip, 'big');
    },
};
