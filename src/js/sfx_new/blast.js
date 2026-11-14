// A small blast (a missile's, a mine, a drone): the picked take of the blasts at its smallest (sound_takes.js); a
// chain of them is heard blast by blast (queue)
const sfx_new_blast = {
    limit: 0.07,
    room: 0.6,
    queue: 4,
    voices: function (k) {
        sound_take_blast(k, 'blast');
    },
};
