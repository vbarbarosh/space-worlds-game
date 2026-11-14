// What each world's background is made of (sound_ambience.js), Haven to Eclipse: `bed` its layers that run on, `calls`
// the sounds that come out of the distance, one every `every` seconds (from, to), `flagship` the layers of its
// flagship's own sound while it is near;
// `bed_level` and `call_levels` set each to its place in the mix (measured: a bed about 11 dB under the calm music).
const sound_ambience_worlds = [
    // Haven, the ocean world: a far surf rolling in and out, the traffic's radio, a sonar's ping
    {
        bed_level: 1.58,
        call_levels: [0.86, 0.97, 4.37],
        every: [7, 16],
        bed: [
            {color: 'pink', filter: 'lowpass', f: 520, a: 0.05, tide: {rate: 0.09, depth: 0.75}},
            {color: 'pink', filter: 'bandpass', f: 1500, q: 0.6, a: 0.012, tide: {rate: 0.09, depth: 1}, drift: {rate: 0.05, by: 400}},
            {tone: 124, a: 0.006, tide: {rate: 0.03, depth: 0.5}},
        ],
        // the Crescent: a keen engine's whine circling, two voices a shade apart
        flagship: {
            level: 1.33,
            layers: [
                {tone: 220, type: 'sawtooth', cutoff: 900, a: 0.02, tide: {rate: 3.1, depth: 0.35}},
                {tone: 221.6, type: 'sawtooth', cutoff: 900, a: 0.02, tide: {rate: 2.7, depth: 0.35}},
                {color: 'pink', filter: 'bandpass', f: 1400, q: 0.8, a: 0.02, tide: {rate: 0.5, depth: 0.7}},
            ],
        },
        calls: [
            function (k) {
                const notes = [1174.66, 1396.91, 1567.98];
                k.noise({d: 0.5, a: 0.006, cutoff: 2600, q: 0.6, hold: 0.3});
                for (let i = 0, end = 2 + Math.floor(Math.random()*2); i < end; ++i) {
                    k.tone({d: 0.09, a: 0.016, f: k.pick(notes), type: 'square', cutoff: 2400, hold: 0.05, at: 0.06 + i*0.13});
                }
            },
            function (k) {
                k.tone({d: 1.6, a: 0.03, f: 880, f_end: 866});
                k.tone({d: 1.2, a: 0.012, f: 880, f_end: 866, at: 0.42});
            },
            function (k) {
                k.noise({d: 3.6, a: 0.03, color: 'pink', cutoff: 280, cutoff_end: 620, sweep: 1.8, attack: 1.4, late: true, q: 0.7});
            },
        ],
    },
    // Verdant, the living veil: the nebula breathing, bubbles rising, spores chirring, something large groaning
    {
        bed_level: 1.76,
        call_levels: [1.38, 4.79, 1.08],
        every: [4, 10],
        bed: [
            {color: 'pink', filter: 'bandpass', f: 520, q: 0.8, a: 0.06, tide: {rate: 0.13, depth: 0.85}, drift: {rate: 0.13, by: 170}},
            {color: 'white', filter: 'bandpass', f: 5200, q: 2, a: 0.006, tide: {rate: 0.31, depth: 1}},
            {tone: 73, a: 0.008, tide: {rate: 0.13, depth: 0.7}},
        ],
        // the Thorn Beetle: chitin chittering over a slow low throb
        flagship: {
            level: 1.14,
            layers: [
                {color: 'white', filter: 'bandpass', f: 3000, q: 3, a: 0.1, tide: {rate: 9, depth: 1}},
                {color: 'white', filter: 'bandpass', f: 4300, q: 4, a: 0.05, tide: {rate: 13, depth: 1}},
                {tone: 55, a: 0.03, tide: {rate: 0.7, depth: 0.8}},
            ],
        },
        calls: [
            function (k) {
                for (let i = 0, end = 3 + Math.floor(Math.random()*4); i < end; ++i) {
                    const f = k.r(280, 720);
                    k.tone({d: 0.09, a: 0.03, f, f_end: f*k.r(1.6, 2.1), glide: 0.07, at: i*k.r(0.07, 0.14), spread: k.r(-0.2, 0.2)});
                }
            },
            function (k) {
                for (let i = 0; i < 7; ++i) {
                    k.tone({d: 0.03, a: 0.008, f: (i % 2) ? 2640 : 2220, at: i*0.034});
                }
            },
            function (k) {
                k.tone({d: 2.8, a: 0.035, f: 92, f_end: 70, glide: 2.2, attack: 0.9, late: true, fm: {ratio: 0.5, index: 0.8, index_end: 0.4}});
            },
        ],
    },
    // Dustfall, the dune belt: wind in gusts, grit hissing across the hull, rock tumbling somewhere
    {
        bed_level: 1.6,
        call_levels: [1.41, 4.73, 6.76],
        every: [5, 12],
        bed: [
            {color: 'pink', filter: 'bandpass', f: 800, q: 0.6, a: 0.06, tide: {rate: 0.11, depth: 0.7}, drift: {rate: 0.05, by: 380}},
            {color: 'pink', filter: 'bandpass', f: 320, q: 0.7, a: 0.03, tide: {rate: 0.07, depth: 0.6}},
            {color: 'white', filter: 'highpass', f: 4500, a: 0.005, tide: {rate: 0.23, depth: 1}},
        ],
        // the Sawtooth: its blade whirring, grit thrown off it
        flagship: {
            level: 1.82,
            layers: [
                {tone: 110, type: 'sawtooth', cutoff: 1400, a: 0.03, tide: {rate: 14, depth: 0.9}},
                {tone: 165, type: 'sawtooth', cutoff: 900, a: 0.012, tide: {rate: 14, depth: 0.9}},
                {color: 'white', filter: 'highpass', f: 3800, a: 0.008, tide: {rate: 1.3, depth: 0.9}},
            ],
        },
        calls: [
            function (k) {
                k.noise({d: 3.8, a: 0.07, color: 'pink', cutoff: 520, cutoff_end: 1500, sweep: 1.6, attack: 1.5, late: true, q: 0.6});
            },
            function (k) {
                k.noise({d: 0.7, a: 0.012, cutoff: 5000, filter: 'highpass', attack: 0.2});
                for (let i = 0; i < 3; ++i) {
                    k.noise({d: 0.012, a: 0.012, cutoff: 6000, filter: 'highpass', at: 0.2 + Math.random()*0.4});
                }
            },
            function (k) {
                for (let i = 0, end = 3 + Math.floor(Math.random()*2); i < end; ++i) {
                    k.noise({d: 0.16, a: 0.06, color: 'pink', cutoff: k.r(220, 380), filter: 'lowpass', at: i*k.r(0.16, 0.34)});
                }
            },
        ],
    },
    // Ion Reach, the electric storm: mains humming in the air, a crackle over it, thunder far off, a snap of static
    {
        bed_level: 1.23,
        call_levels: [1.58, 3.35, 2.24],
        every: [4, 11],
        bed: [
            {tone: 50, type: 'sawtooth', cutoff: 320, a: 0.02, tide: {rate: 0.06, depth: 0.4}},
            {tone: 100, a: 0.008, tide: {rate: 0.11, depth: 0.6}},
            {color: 'white', filter: 'highpass', f: 6000, a: 0.006, tide: {rate: 0.9, depth: 1}},
            {color: 'pink', filter: 'bandpass', f: 1500, q: 0.7, a: 0.02, tide: {rate: 0.17, depth: 0.8}},
        ],
        // the Storm Wheel: a hum that comes round as it turns, sparks along its spokes
        flagship: {
            level: 1.41,
            layers: [
                {tone: 100, type: 'sawtooth', cutoff: 700, a: 0.035, tide: {rate: 1.1, depth: 0.8}},
                {tone: 150, a: 0.012, tide: {rate: 1.1, depth: 0.8}},
                {color: 'white', filter: 'highpass', f: 5000, a: 0.012, tide: {rate: 7, depth: 1}},
            ],
        },
        calls: [
            function (k) {
                k.noise({d: 3.2, a: 0.09, color: 'pink', cutoff: 700, cutoff_end: 110, filter: 'lowpass', attack: 0.06});
                k.tone({d: 2, a: 0.05, f: 62, f_end: 34, glide: 1.5});
                k.noise({d: 1.4, a: 0.04, color: 'pink', cutoff: 420, cutoff_end: 120, filter: 'lowpass', at: k.r(0.5, 0.9)});
            },
            function (k) {
                k.tone({d: 0.08, a: 0.02, f: 1900, f_end: 600, glide: 0.05, fm: {ratio: 3.37, index: 2, index_end: 0.1, d: 0.04}});
                for (let i = 0; i < 3; ++i) {
                    k.noise({d: 0.01, a: 0.014, cutoff: 6000, filter: 'highpass', at: 0.02 + Math.random()*0.12});
                }
            },
            function (k) {
                k.tone({d: 2.6, a: 0.03, f: 50, type: 'sawtooth', cutoff: 420, attack: 1, late: true});
                k.tone({d: 2.6, a: 0.01, f: 150, attack: 1.2, late: true});
            },
        ],
    },
    // Obsidian, the iron expanse: machinery throbbing far below, a clank in the works, steam let go, a girder groaning
    {
        bed_level: 0.27,
        call_levels: [1.64, 3.98, 1.72],
        every: [5, 12],
        bed: [
            {tone: 46, a: 0.05, tide: {rate: 1.6, depth: 0.55}},
            {tone: 92, type: 'sawtooth', cutoff: 260, a: 0.012, tide: {rate: 0.8, depth: 0.5}},
            {color: 'brown', filter: 'lowpass', f: 300, a: 0.08, tide: {rate: 0.08, depth: 0.6}},
        ],
        // the Iron Stair: one heavy step every 2.4 s, iron grinding between them
        flagship: {
            level: 0.66,
            layers: [
                {tone: 41, a: 0.06, tide: {rate: 0.417, depth: 1}},
                {tone: 82, type: 'sawtooth', cutoff: 520, a: 0.07, tide: {rate: 0.417, depth: 1}},
                {color: 'pink', filter: 'bandpass', f: 600, q: 1.2, a: 0.05, tide: {rate: 0.834, depth: 0.9}},
            ],
        },
        calls: [
            function (k) {
                const f = k.r(170, 270);
                k.noise({d: 0.02, a: 0.03, cutoff: 2200, q: 0.8});
                k.tone({d: 1.4, a: 0.03, f, fm: {ratio: 2.76, index: 2.4, index_end: 0.1, d: 0.5}});
                k.tone({d: 0.9, a: 0.012, f: f*1.51, fm: {ratio: 2.76, index: 1.5, index_end: 0.1, d: 0.4}, at: k.r(0.18, 0.5)});
            },
            function (k) {
                k.noise({d: 1.3, a: 0.018, cutoff: 3600, q: 0.9, attack: 0.08});
            },
            function (k) {
                k.tone({d: 2.6, a: 0.03, f: 72, f_end: 61, glide: 2, type: 'sawtooth', cutoff: 300, attack: 0.7, late: true, fm: {ratio: 0.5, index: 0.6, index_end: 0.3}});
            },
        ],
    },
    // Cryosphere, the frozen aurora: thin cold air, a shimmer that beats slowly, chimes of ice, a crack running through it
    {
        bed_level: 1.43,
        call_levels: [0.67, 1.8, 0.84],
        every: [4, 10],
        bed: [
            {color: 'white', filter: 'highpass', f: 5200, a: 0.007, tide: {rate: 0.07, depth: 0.7}},
            {tone: 2093, a: 0.0022, tide: {rate: 0.05, depth: 0.9}},
            {tone: 2101, a: 0.0022, tide: {rate: 0.04, depth: 0.9}},
            {tone: 88, a: 0.003, tide: {rate: 0.03, depth: 0.5}},
            {color: 'pink', filter: 'bandpass', f: 1100, q: 0.8, a: 0.012, tide: {rate: 0.06, depth: 0.9}},
        ],
        // the Frost Crystal: glass singing, three notes drifting in and out of each other
        flagship: {
            level: 0.93,
            layers: [
                {tone: 1567.98, a: 0.008, tide: {rate: 0.31, depth: 0.9}},
                {tone: 1574, a: 0.008, tide: {rate: 0.23, depth: 0.9}},
                {tone: 2349.32, a: 0.005, tide: {rate: 0.17, depth: 1}},
                {color: 'white', filter: 'highpass', f: 6000, a: 0.006, tide: {rate: 0.4, depth: 0.8}},
            ],
        },
        calls: [
            function (k) {
                const notes = [1174.66, 1318.51, 1567.98, 1760, 2093];
                for (let i = 0, end = 2 + Math.floor(Math.random()*2); i < end; ++i) {
                    k.tone({d: 1.8, a: 0.022, f: k.pick(notes), fm: {ratio: 3.5, index: 0.6, index_end: 0.02, d: 0.3}, at: i*k.r(0.22, 0.5), spread: k.r(-0.3, 0.3)});
                }
            },
            function (k) {
                k.noise({d: 0.02, a: 0.035, cutoff: 3000, filter: 'highpass'});
                k.tone({d: 0.28, a: 0.02, f: 1900, f_end: 620, glide: 0.2});
                k.noise({d: 0.015, a: 0.012, cutoff: 4000, filter: 'highpass', at: k.r(0.25, 0.4)});
            },
            function (k) {
                k.tone({d: 3.6, a: 0.01, f: 2637, attack: 1.3, late: true});
                k.tone({d: 3.6, a: 0.01, f: 2649, attack: 1.3, late: true});
            },
        ],
    },
    // Nova Forge, the solar foundry: the furnace roaring under everything, embers popping, slag rolling over
    {
        bed_level: 0.75,
        call_levels: [5.5, 1.35, 2.95],
        every: [3, 8],
        bed: [
            {color: 'pink', filter: 'lowpass', f: 560, a: 0.08, tide: {rate: 0.15, depth: 0.5}},
            {color: 'white', filter: 'bandpass', f: 2400, q: 1.2, a: 0.008, tide: {rate: 2.3, depth: 1}},
            {color: 'white', filter: 'bandpass', f: 3600, q: 1.5, a: 0.005, tide: {rate: 3.7, depth: 1}},
            {tone: 65, a: 0.02, tide: {rate: 0.21, depth: 0.5}},
        ],
        // the Furnace: its fire roaring and fluttering, the weight of it under
        flagship: {
            level: 1.1,
            layers: [
                {color: 'pink', filter: 'lowpass', f: 700, a: 0.09, tide: {rate: 0.5, depth: 0.5}},
                {color: 'white', filter: 'bandpass', f: 2400, q: 1, a: 0.035, tide: {rate: 5, depth: 1}},
                {tone: 49, a: 0.04, tide: {rate: 0.25, depth: 0.5}},
            ],
        },
        calls: [
            function (k) {
                for (let i = 0, end = 4 + Math.floor(Math.random()*5); i < end; ++i) {
                    k.noise({d: 0.016, a: k.r(0.012, 0.03), cutoff: k.r(2400, 5200), filter: 'highpass', at: Math.random()*0.9, spread: k.r(-0.3, 0.3)});
                }
            },
            function (k) {
                k.noise({d: 3.2, a: 0.09, color: 'pink', cutoff: 240, cutoff_end: 560, sweep: 1.4, filter: 'lowpass', attack: 1.2, late: true});
            },
            function (k) {
                k.tone({d: 0.3, a: 0.05, f: 78, f_end: 165, glide: 0.13});
                k.tone({d: 0.22, a: 0.03, f: 96, f_end: 190, glide: 0.1, at: k.r(0.2, 0.36)});
            },
        ],
    },
    // Eclipse, the black crown: a drone that beats against itself at the bottom of hearing, the dark swelling, a voice
    // calling from far inside it, ticks echoing away
    {
        bed_level: 0.21,
        call_levels: [0.92, 0.38, 4.03],
        every: [6, 14],
        bed: [
            {tone: 38, a: 0.05},
            {tone: 38.4, a: 0.05},
            {tone: 57, a: 0.02, tide: {rate: 0.04, depth: 0.8}},
            {color: 'brown', filter: 'lowpass', f: 190, a: 0.1, tide: {rate: 0.06, depth: 0.7}},
            {color: 'pink', filter: 'bandpass', f: 300, q: 1, a: 0.014, tide: {rate: 0.05, depth: 1}, drift: {rate: 0.03, by: 120}},
        ],
        // the Eclipse Eye: a slow pulse, like a heart, in a drone that beats against itself
        flagship: {
            level: 0.39,
            layers: [
                {tone: 55, a: 0.05},
                {tone: 55.7, a: 0.05},
                {tone: 110, a: 0.06, tide: {rate: 0.9, depth: 1}},
                {tone: 220, a: 0.012, tide: {rate: 0.9, depth: 1}},
                {color: 'brown', filter: 'lowpass', f: 150, a: 0.08, tide: {rate: 0.9, depth: 0.8}},
            ],
        },
        calls: [
            function (k) {
                const f = k.pick([196, 174.61, 146.83]);
                k.tone({d: 3.4, a: 0.035, f, f_end: f*0.75, glide: 2.4, attack: 0.8, late: true, fm: {ratio: 1.004, index: 0.6, index_end: 0.4}});
                k.tone({d: 3.4, a: 0.02, f: f/2, f_end: f*0.375, glide: 2.4, attack: 1, late: true});
            },
            function (k) {
                k.noise({d: 5, a: 0.12, color: 'brown', cutoff: 120, cutoff_end: 280, sweep: 2.4, filter: 'lowpass', attack: 2.2, late: true});
            },
            function (k) {
                for (let i = 0; i < 4; ++i) {
                    k.tone({d: 0.04, a: 0.03/(i + 1), f: 900 - i*60, at: i*0.36});
                }
            },
        ],
    },
];
// What is heard by its nearness in any world that has it (sound_ambience_things): the nearest of Obsidian's magnetic
// spires, a black hole
const sound_ambience_fields = {
    // a spire's field: a buzzing magnetic hum with a thin whine of iron in it
    spire: {
        level: 1.24,
        layers: [
            {tone: 92.5, type: 'sawtooth', cutoff: 520, a: 0.04, tide: {rate: 6, depth: 0.5}},
            {tone: 185, a: 0.014, tide: {rate: 0.7, depth: 0.6}},
            {color: 'white', filter: 'bandpass', f: 2200, q: 4, a: 0.01, tide: {rate: 11, depth: 1}},
        ],
    },
    // a black hole: the dark rumbling and turning, heavier the nearer its edge
    hole: {
        level: 0.4,
        layers: [
            {color: 'brown', filter: 'lowpass', f: 120, a: 0.12, tide: {rate: 0.3, depth: 0.5}},
            {tone: 46, a: 0.05},
            {tone: 46.6, a: 0.05},
            {tone: 92, a: 0.02, tide: {rate: 0.21, depth: 0.9}},
            {color: 'pink', filter: 'bandpass', f: 260, q: 1.5, a: 0.03, tide: {rate: 0.17, depth: 1}, drift: {rate: 0.11, by: 90}},
        ],
    },
};
