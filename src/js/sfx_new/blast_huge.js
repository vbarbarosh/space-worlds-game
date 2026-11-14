// A flagship's last blast: the picked take of the blasts at its largest (sound_takes.js), several recordings over
// one another
const sfx_new_blast_huge = {
    limit: 0.8,
    room: 1,
    voices: function (k) {
        sound_take_blast(k, 'blast_huge');
    },
};
