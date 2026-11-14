// A raider destroyed, a cliff falling, a flagship's part gone: the wreck breaking up, a recording of debris played
// from a place of its own each time (sound_takes.js), under the blast that comes with it
const sfx_new_kill = {
    limit: 0.09,
    room: 0.5,
    voices: function (k) {
        sound_take_blast(k, 'kill');
    },
};
