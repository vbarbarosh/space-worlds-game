// A ship's blast (a raider dying, a flagship's chain): the picked take of the blasts (sound_takes.js), deep and long,
// the loudest thing in a fight but a flagship's end; three of them in turn where the take has three
const sfx_new_blast_big = {
    limit: 0.12,
    room: 0.8,
    queue: 4,
    voices: function (k) {
        sound_take_blast(k, 'blast_big');
    },
};
