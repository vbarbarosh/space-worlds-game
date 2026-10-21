// A small blast (a missile's, a mine's, a raider's death), fitted to the author's examples (cartoon and medium
// explosions: half of it at 63 Hz, a few % over 2 kHz, 20 dB down in 0.5 to 0.9 s): a crack, a deep thump that
// carries the weight, a rumble of three bursts swelling over a twentieth of a second, grit over it and debris
// crackling after it
const sfx_blast = {
    limit: 0.02,
    room: true,
    // fitted to the examples, it peaks near full scale alone; this brings it under the limiter
    volume: 0.41,
    play: function (note, air, t, grit) {
        const r = 0.9 + Math.random()*0.2;
        grit(0.03, 0.32, 3500, 0, 0, 'bandpass');
        note(70*r, 1.4, 0.2, 32);
        for (let i = 0; i < 3; ++i) {
            air(2.2 + Math.random()*0.4, 0.2, (220 + Math.random()*130)*r, Math.random()*0.04, 40, 'lowpass', 0.05);
        }
        grit(0.8, 0.32, 3500, 0.02, 800, 'lowpass', 0.04);
        for (let i = 0; i < 4; ++i) {
            grit(0.015, 0.32, 2500 + Math.random()*3000, 0.1 + Math.random()*0.8, 0, 'bandpass');
        }
    },
};
