// A flagship's last blast: its own muffled recording, swelling over 1.4 s, with the world's echo of a big one
const sfx_blast_huge = {
    limit: 0.8,
    recorded: true,
    play: function (note, air, t, clip) {
        explosion_play(clip, 'big', {name: 'body_flagship', gain: 0.52, at: 1.5});
    },
};
