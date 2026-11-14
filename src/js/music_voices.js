// The new music set's instruments: each world plays its theme (its chords, scale, tune and tempo, music.js) with a
// lead, a pad, a bass and a drum kit of its own (its music.voices), so the world is heard in the first notes. The
// classic set plays every world with the same sines and drums (music_step, music_drive_step). All of them are made of
// voice_tone and voice_noise (sound_voices.js) on the music's bus.

// Which set plays: 'new', or 'classic' for the music as it was before it (Settings, Music set)
let music_set = 'new';
const music_set_key = 'pulse_drift_music_set';
// The level the new set's notes are made at now: the world's own for the part being played, lead, pad, bass or kit,
// in its calm theme, its drive or its boss fight (music.voices); set by the step as it goes from part to part
let music_voices_level = 1;

try {
    if (localStorage.getItem(music_set_key) === 'classic') {
        music_set = 'classic';
    }
}
catch {
}

// The other set's notes fade out on their own bus, and the music starts again at its chord in the set chosen
function music_set_choose(value)
{
    const next = (value === 'classic') ? 'classic' : 'new';
    try {
        localStorage.setItem(music_set_key, next);
    }
    catch {
    }
    if (next === music_set) {
        return;
    }
    music_set = next;
    if (sound.ctx && sound.music_bus) {
        music_bus_swap(sound.ctx.currentTime, 0.08);
        sound.step = Math.floor(sound.step/16)*16;
        sound.next = sound.ctx.currentTime + 0.035;
    }
}

function music_tone(o)
{
    voice_tone({...o, a: o.a*music_voices_level, bus: sound.music_bus});
}

function music_air(o)
{
    voice_noise({...o, a: o.a*music_voices_level, bus: sound.music_bus});
}

// The leads, which play the tune: {f, t, d, a, pan} the pitch (Hz), when, how long, how loud, where; beat the length
// of a beat (s); tune for a note of the tune, played whole: an arpeggio's or a stab's note is the instrument's body
// alone, so a run of sixteenths stays a few voices

// An electric piano: a soft body under a tine's ping that is gone at once
function music_epiano(o)
{
    music_tone({...o, d: o.d*1.3, fm: {ratio: 1, index: 1.3, index_end: 0.06, d: o.d*0.7}, attack: 0.005});
    if (o.tune) {
        music_tone({...o, d: Math.min(o.d, 0.45), a: o.a*0.3, fm: {ratio: 14, index: 6, index_end: 0.2, d: 0.12}, attack: 0.003, pan: -o.pan});
    }
}

// A marimba: the bar's note, its overtone two octaves up for the first instant, and the mallet's knock
function music_marimba(o)
{
    const d = Math.min(o.d, 0.85);
    music_tone({...o, d, fm: {ratio: 1, index: 0.5, index_end: 0.02, d: 0.08}, attack: 0.003});
    music_tone({...o, f: o.f*4, d: Math.min(d, 0.14), a: o.a*0.32, attack: 0.002});
    if (o.tune) {
        music_air({t: o.t, d: 0.035, a: o.a*0.9, color: 'pink', cutoff: 900, q: 1.2, pan: o.pan});
    }
}

// A plucked string with a twang: bright at the pick and dull at once, its pitch bent as it is let go, a second
// course an octave up
function music_pluck(o)
{
    music_tone({
        ...o,
        type: 'sawtooth',
        f: o.f*1.04,
        f_end: o.f,
        glide: 0.07,
        cutoff: o.f*9,
        cutoff_end: o.f*1.5,
        sweep: 0.3,
        q: 2.4,
        attack: 0.002,
        a: o.a*0.85,
    });
    if (o.tune) {
        music_tone({
            ...o,
            type: 'square',
            f: o.f*2,
            detune: 9,
            d: o.d*0.55,
            cutoff: o.f*7,
            cutoff_end: o.f*2,
            sweep: 0.16,
            q: 1.2,
            attack: 0.002,
            a: o.a*0.22,
            pan: -o.pan,
        });
    }
}

// A glassy digital note; a tune's note comes back twice, a dotted eighth apart, each fainter, from the other side
function music_digital(o)
{
    const gains = o.tune ? [1, 0.4, 0.17] : [1];
    for (let i = 0, end = gains.length; i < end; ++i) {
        music_tone({
            ...o,
            t: o.t + i*o.beat*0.75,
            d: Math.min(o.d, 0.32),
            a: o.a*gains[i],
            type: 'triangle',
            fm: {ratio: 3.01, index: 5.5, index_end: 0.4, d: 0.16},
            attack: 0.002,
            pan: (i % 2) ? -o.pan : o.pan,
        });
    }
}

// Struck metal, low: the note an octave down under a clang of partials that are not its harmonics, and the hammer
function music_anvil(o)
{
    music_tone({...o, f: o.f/2, d: o.d*1.7, fm: {ratio: 1.41, index: 2.4, index_end: 0.12, d: o.d}, attack: 0.002});
    if (o.tune) {
        music_tone({...o, f: o.f*2.76, d: o.d*0.9, a: o.a*0.3, fm: {ratio: 2.3, index: 3, index_end: 0.1, d: 0.25}, attack: 0.002, pan: -o.pan});
        music_air({t: o.t, d: 0.03, a: o.a*0.6, cutoff: 2600, q: 1.5, pan: o.pan});
    }
}

// A celesta: a small bell, its high partial dying first, the note ringing long
function music_celesta(o)
{
    music_tone({...o, f: o.f*2, d: o.d*1.6, a: o.a*0.8, fm: {ratio: 4, index: 2.4, index_end: 0.05, d: 0.4}, attack: 0.002});
    if (o.tune) {
        music_tone({...o, f: o.f*4, d: o.d*0.7, a: o.a*0.2, attack: 0.002, pan: -o.pan});
    }
}

// Brass: two driven sawtooths a little apart, the filter opening as the note swells
function music_brass(o)
{
    for (const detune of (o.tune ? [-7, 7] : [0])) {
        music_tone({
            ...o,
            type: 'sawtooth',
            detune,
            drive: 1.4,
            cutoff: o.f*1.1,
            cutoff_end: o.f*5,
            sweep: Math.min(0.16, o.d*0.4),
            q: 1.2,
            attack: Math.min(0.05, o.d*0.2),
            hold: o.d*0.45,
            late: true,
            a: o.a*0.42,
            pan: o.pan + detune/30,
        });
    }
}

// A piano far off: two strings a little apart, bright at the hammer and darkening as they ring long
function music_piano(o)
{
    for (const detune of (o.tune ? [-4, 5] : [0])) {
        music_tone({
            ...o,
            type: 'sawtooth',
            detune,
            d: o.d*(o.tune ? 2.2 : 1.2),
            cutoff: o.f*7,
            cutoff_end: o.f*1.3,
            sweep: o.d*0.9,
            q: 0.8,
            attack: 0.004,
            a: o.a*0.75,
            pan: o.pan + detune/25,
        });
    }
    if (o.tune) {
        music_air({t: o.t, d: 0.04, a: o.a*0.5, color: 'pink', cutoff: 500, filter: 'lowpass', pan: o.pan});
    }
}

const music_leads = {
    epiano: music_epiano,
    marimba: music_marimba,
    pluck: music_pluck,
    digital: music_digital,
    anvil: music_anvil,
    celesta: music_celesta,
    brass: music_brass,
    piano: music_piano,
};

// The pads, which hold the chord: one note of it each, i its place in the chord; {f, t, d, a, pan, beat} as a lead's

// Warm: two sawtooths a little apart, only their first harmonics left
function music_pad_warm(o)
{
    for (const detune of [-6, 6]) {
        music_tone({
            ...o,
            type: 'sawtooth',
            detune,
            cutoff: o.f*2.6,
            q: 0.6,
            attack: 0.9,
            hold: Math.max(0, o.d - 2.7),
            late: true,
            a: o.a*0.7,
            pan: (detune < 0) ? o.pan : -o.pan,
        });
    }
}

// Breathing: the note swells in and out twice over the chord, a hollow reed that opens as it grows, and the root
// takes a breath of air with it
function music_pad_breath(o)
{
    const d = (o.d - 1.2)/2;
    for (const k of [0, 1]) {
        music_tone({...o, t: o.t + k*d, d: d + 0.6, type: 'square', cutoff: o.f*1.3, cutoff_end: o.f*3.6, sweep: d*0.5, q: 0.7, attack: d*0.5, a: o.a*1.1});
        if (o.i === 0) {
            music_air({
                t: o.t + k*d,
                d: d + 0.6,
                a: o.a*0.5,
                color: 'pink',
                cutoff: 500,
                cutoff_end: 1900,
                sweep: d*0.5,
                q: 0.9,
                attack: d*0.5,
                pan: k ? 0.4 : -0.4,
            });
        }
    }
}

// A drone: the chord's root and fifth an octave down, buzzing and held; its other notes only a shade
function music_pad_drone(o)
{
    if (o.i % 2) {
        music_tone({...o, attack: 1.1, hold: Math.max(0, o.d - 3), late: true, a: o.a*0.8});
        return;
    }
    for (const detune of [-5, 5]) {
        music_tone({
            ...o,
            f: o.f/2,
            type: 'sawtooth',
            detune,
            drive: 1.1,
            cutoff: o.f*2.2,
            q: 1.8,
            attack: 0.5,
            hold: Math.max(0, o.d - 2.4),
            late: true,
            a: o.a*0.5,
            pan: detune/12,
        });
    }
}

// Thin and digital: a narrow band of a square wave, far behind the arpeggio
function music_pad_thin(o)
{
    music_tone({...o, type: 'square', cutoff: 1500, filter: 'bandpass', q: 0.9, attack: 0.6, hold: Math.max(0, o.d - 2.2), late: true, a: o.a*0.9});
}

// Iron: a driven sawtooth kept dark, a machine's hum; the root doubled an octave down
function music_pad_iron(o)
{
    music_tone({...o, type: 'sawtooth', drive: 1.3, cutoff: 520, q: 1.3, attack: 1.2, hold: Math.max(0, o.d - 3.2), late: true, a: o.a*0.75});
    if (o.i === 0) {
        music_tone({
            ...o,
            f: o.f/2,
            type: 'sawtooth',
            detune: 7,
            drive: 1.3,
            cutoff: 300,
            q: 1.6,
            attack: 1.2,
            hold: Math.max(0, o.d - 3.2),
            late: true,
            a: o.a*0.9,
            pan: -o.pan,
        });
    }
}

// Glass: the note an octave up, thin and slow, and with the root a band of air far above it
function music_pad_glass(o)
{
    music_tone({...o, f: o.f*2, fm: {ratio: 2, index: 0.5, index_end: 0.3}, attack: 1.6, hold: Math.max(0, o.d - 4), late: true, a: o.a*0.8});
    if (o.i === 0) {
        music_air({t: o.t, d: o.d, a: o.a*0.55, cutoff: 7500, q: 0.5, attack: 2, hold: Math.max(0, o.d - 5), late: true, pan: -o.pan});
    }
}

// Brass swelling: two driven sawtooths a little apart, the filter opening slowly over half the chord
function music_pad_swell(o)
{
    for (const detune of [-8, 8]) {
        music_tone({
            ...o,
            type: 'sawtooth',
            detune,
            drive: 1.2,
            cutoff: o.f*0.9,
            cutoff_end: o.f*3.4,
            sweep: o.d*0.45,
            q: 0.9,
            attack: o.d*0.3,
            hold: o.d*0.25,
            late: true,
            a: o.a*0.5,
            pan: (detune < 0) ? o.pan : -o.pan,
        });
    }
}

// A choir: two voices a little apart, each through one band of a sung "oh"
function music_pad_choir(o)
{
    music_tone({
        ...o,
        type: 'sawtooth',
        detune: -9,
        cutoff: 480,
        filter: 'bandpass',
        q: 3.2,
        attack: 1.3,
        hold: Math.max(0, o.d - 3.6),
        late: true,
        a: o.a*1.5,
    });
    music_tone({
        ...o,
        type: 'sawtooth',
        detune: 9,
        cutoff: 880,
        filter: 'bandpass',
        q: 4,
        attack: 1.5,
        hold: Math.max(0, o.d - 3.8),
        late: true,
        a: o.a*1.1,
        pan: -o.pan,
    });
}

const music_pads = {
    warm: music_pad_warm,
    breath: music_pad_breath,
    drone: music_pad_drone,
    thin: music_pad_thin,
    iron: music_pad_iron,
    glass: music_pad_glass,
    swell: music_pad_swell,
    choir: music_pad_choir,
};

// The basses, which play the chord's root: {f, t, d, a}

// Round: a sine with a soft octave over it
function music_bass_round(o)
{
    music_tone({...o, attack: 0.03, hold: o.d*0.5, late: true});
    music_tone({...o, f: o.f*2, type: 'triangle', cutoff: 520, attack: 0.03, hold: o.d*0.2, a: o.a*0.35});
}

// Wood: a double bass plucked, dull at once
function music_bass_wood(o)
{
    music_tone({...o, type: 'triangle', cutoff: 950, cutoff_end: 240, sweep: 0.3, q: 1.1, attack: 0.008, hold: o.d*0.25, a: o.a*1.3});
}

// A low string plucked with a pick
function music_bass_string(o)
{
    music_tone({...o, type: 'sawtooth', cutoff: o.f*6, cutoff_end: o.f*1.5, sweep: 0.25, q: 1.4, attack: 0.004, hold: o.d*0.3, a: o.a*1.1});
}

// A sub bass: a sine held, then let go
function music_bass_sub(o)
{
    music_tone({...o, attack: 0.012, hold: o.d*0.6, late: true});
}

// A growl: a driven sawtooth with a rough undertone, opening as it is held
function music_bass_growl(o)
{
    music_tone({
        ...o,
        type: 'sawtooth',
        drive: 1.7,
        fm: {ratio: 0.5, index: 0.5, index_end: 0.3},
        cutoff: 170,
        cutoff_end: 460,
        sweep: o.d*0.5,
        q: 2.2,
        attack: 0.05,
        hold: o.d*0.4,
        late: true,
        a: o.a*0.8,
    });
}

// Soft: a sine that comes in slowly, an octave up
function music_bass_soft(o)
{
    music_tone({...o, f: o.f*2, attack: 0.4, hold: o.d*0.3, late: true, a: o.a*0.7});
}

// A tuba: a driven sawtooth that opens at once
function music_bass_tuba(o)
{
    music_tone({
        ...o,
        type: 'sawtooth',
        drive: 1.3,
        cutoff: o.f*1.4,
        cutoff_end: o.f*4.5,
        sweep: Math.min(0.12, o.d*0.4),
        q: 1,
        attack: Math.min(0.03, o.d*0.2),
        hold: o.d*0.5,
        late: true,
        a: o.a*0.7,
    });
}

// Deep: a sine pressed a little, so a small speaker still shows it, coming in slowly, and its octave below
function music_bass_deep(o)
{
    music_tone({...o, drive: 0.7, cutoff: o.f*4, attack: Math.min(0.3, o.d*0.3), hold: o.d*0.4, late: true, a: o.a*0.8});
    music_tone({...o, f: o.f/2, attack: Math.min(0.4, o.d*0.3), hold: o.d*0.4, late: true, a: o.a*0.6});
}

const music_basses = {
    round: music_bass_round,
    wood: music_bass_wood,
    string: music_bass_string,
    sub: music_bass_sub,
    growl: music_bass_growl,
    soft: music_bass_soft,
    tuba: music_bass_tuba,
    deep: music_bass_deep,
};

// The drum kits: low (a kick's place), mid (a snare's), high (a hat's), each (t, a, pan); calm(s, t) the kit's own
// figure in the calm theme, over the world's (music_voices_percussion), s the eighth of the cycle
const music_kits = {
    // Haven: a round soft kick, brushes
    soft: {
        low: function (t, a) {
            music_tone({t, d: 0.28, a, f: 92, f_end: 44, attack: 0.004});
        },
        mid: function (t, a, pan) {
            music_air({t, d: 0.2, a: a*1.2, color: 'pink', cutoff: 2200, q: 0.7, attack: 0.012, pan});
        },
        high: function (t, a, pan) {
            music_air({t, d: 0.05, a, cutoff: 7500, filter: 'highpass', pan});
        },
    },
    // Verdant: a log drum, a wood block, a shaker that never stops
    wood: {
        low: function (t, a) {
            music_tone({t, d: 0.22, a, f: 150, f_end: 78, glide: 0.06, type: 'triangle', cutoff: 600});
        },
        mid: function (t, a, pan) {
            music_tone({t, d: 0.07, a: a*1.4, f: 820, fm: {ratio: 1.6, index: 1.5, index_end: 0.1}, attack: 0.002, pan});
        },
        high: function (t, a, pan) {
            music_air({t, d: 0.085, a: a*1.3, cutoff: 6200, q: 1.1, attack: 0.02, pan});
        },
        calm: function (s, t) {
            this.high(t, (s % 2) ? 0.011 : 0.006, (s % 2) ? 0.3 : -0.3);
        },
    },
    // Dustfall: a hand drum, its deep "dum" and its sharp "tek"
    hand: {
        low: function (t, a) {
            music_tone({t, d: 0.34, a, f: 118, f_end: 68, glide: 0.09, attack: 0.003});
            music_air({t, d: 0.05, a: a*0.6, color: 'pink', cutoff: 420, filter: 'lowpass'});
        },
        mid: function (t, a, pan) {
            music_tone({t, d: 0.075, a, f: 440, f_end: 380, type: 'triangle', attack: 0.002, pan});
            music_air({t, d: 0.05, a: a*1.1, cutoff: 3200, q: 1.4, pan});
        },
        high: function (t, a, pan) {
            music_air({t, d: 0.045, a: a*1.2, cutoff: 5200, q: 2, pan});
        },
        calm: function (s, t) {
            if (s % 16 === 8) {
                this.low(t, 0.022);
            }
            if ((s % 8 === 3) || (s % 16 === 15)) {
                this.mid(t, 0.012, (s % 16 === 3) ? 0.25 : -0.25);
            }
        },
    },
    // Ion Reach: a tight electric kick, a snap, hats cut short
    tight: {
        low: function (t, a) {
            music_tone({t, d: 0.17, a, f: 190, f_end: 42, glide: 0.08, attack: 0.002});
        },
        mid: function (t, a, pan) {
            music_air({t, d: 0.09, a: a*1.3, cutoff: 2500, q: 1.6, pan});
        },
        high: function (t, a, pan) {
            music_air({t, d: 0.024, a: a*1.2, cutoff: 9500, filter: 'highpass', pan});
        },
        calm: function (s, t) {
            this.high(t, (s % 2) ? 0.012 : 0.006, (s % 4 < 2) ? 0.3 : -0.3);
        },
    },
    // Obsidian: a heavy step, an anvil's ring, a link of chain
    iron: {
        low: function (t, a) {
            music_tone({t, d: 0.6, a, f: 74, f_end: 30, glide: 0.25, drive: 1.2, cutoff: 240, attack: 0.004});
            music_air({t, d: 0.3, a: a*0.7, color: 'brown', cutoff: 140, filter: 'lowpass'});
        },
        mid: function (t, a, pan) {
            music_tone({t, d: 0.7, a: a*0.8, f: 523, fm: {ratio: 2.76, index: 3.2, index_end: 0.2, d: 0.5}, attack: 0.002, pan});
            music_air({t, d: 0.025, a, cutoff: 3000, q: 1.5, pan});
        },
        high: function (t, a, pan) {
            music_tone({t, d: 0.05, a: a*0.8, f: 3100, type: 'square', fm: {ratio: 1.48, index: 2, index_end: 0.5}, attack: 0.002, pan});
        },
        calm: function (s, t) {
            if (s % 16 === 8) {
                this.low(t, 0.03);
            }
            if (s % 32 === 20) {
                this.mid(t, 0.012, 0.35);
            }
        },
    },
    // Cryosphere: a far thud, ice cracking, a splinter of glass
    ice: {
        low: function (t, a) {
            music_tone({t, d: 0.32, a: a*0.8, f: 66, f_end: 50, attack: 0.01});
        },
        mid: function (t, a, pan) {
            music_air({t, d: 0.035, a: a*1.3, cutoff: 5200, filter: 'highpass', pan});
            music_tone({t, d: 0.09, a: a*0.6, f: 2500, f_end: 2300, attack: 0.002, pan});
        },
        high: function (t, a, pan) {
            music_tone({t, d: 0.07, a, f: 6300, type: 'triangle', attack: 0.002, pan});
        },
        calm: function (s, t) {
            if (s % 32 === 10) {
                this.mid(t, 0.008, 0.45);
            }
        },
    },
    // Nova Forge: big drums in a big room
    big: {
        low: function (t, a) {
            music_tone({t, d: 0.5, a: a*1.1, f: 105, f_end: 38, glide: 0.2, drive: 1.1, cutoff: 320, attack: 0.003});
            music_air({t, d: 0.28, a: a*0.8, color: 'pink', cutoff: 300, filter: 'lowpass'});
        },
        mid: function (t, a, pan) {
            music_air({t, d: 0.26, a: a*1.3, color: 'pink', cutoff: 1400, q: 0.8, pan});
            music_tone({t, d: 0.18, a: a*0.7, f: 185, f_end: 120, type: 'triangle', pan});
        },
        high: function (t, a, pan) {
            music_air({t, d: 0.07, a: a*1.1, cutoff: 6000, filter: 'highpass', pan});
        },
        calm: function (s, t) {
            if ((s % 16 === 10) || (s % 16 === 11)) {
                this.low(t, 0.022);
            }
        },
    },
    // Eclipse: a boom from far below, a blow far away, a faint tick
    void: {
        low: function (t, a) {
            music_tone({t, d: 0.95, a: a*1.1, f: 56, f_end: 28, glide: 0.6, attack: 0.012});
        },
        mid: function (t, a, pan) {
            music_air({t, d: 0.42, a: a*1.4, color: 'brown', cutoff: 700, filter: 'lowpass', attack: 0.04, pan});
        },
        high: function (t, a, pan) {
            music_air({t, d: 0.05, a: a*0.8, cutoff: 4200, q: 1.5, pan});
        },
    },
};

// The calm theme in the new set: music_step's cycle, chords, bass and tune, played by the world's instruments
function music_voices_step(p, step, t, combat = 0)
{
    const v = p.voices;
    const s = step % 256;
    const beat = 60/p.bpm;
    const chord = p.chords[Math.floor(s/16) % 4];
    const section = Math.floor(s/64);
    const lead = music_leads[v.lead];
    music_voices_level = v.calm.pad;
    if (s % 16 === 0) {
        for (let i = 0, end = chord.length; i < end; ++i) {
            const pan = ((i % 2) ? 1 : -1)*(0.3 + i*0.12);
            music_pads[v.pad]({f: midi_frequency(p.root + chord[i] + 12), t: t + i*0.045, d: beat*8 + 1.2, a: 0.022, pan, i, beat});
        }
    }
    music_voices_level = v.calm.bass;
    if (s % 8 === 0) {
        music_basses[v.bass]({f: midi_frequency(p.root + chord[0]), t, d: beat*3.8, a: 0.055});
    }
    music_voices_level = v.calm.lead;
    let tune = false;
    if (s % 4 === 2) {
        const i = Math.floor(s/4) % p.motif.length;
        const degree = p.motif[(i + ((section === 3) ? 2 : 0)) % p.motif.length];
        if ((degree !== null) && ((section !== 1) || (i % 2 === 0))) {
            const note = p.root + 24 + p.scale[degree % p.scale.length] + (((section === 2) && (i === 4)) ? 12 : 0);
            const pan = (i % 2) ? 0.32 : -0.32;
            tune = true;
            lead({f: midi_frequency(note), t, d: beat*((p.rhythm === 5) ? 3.2 : 1.7), a: 0.039*p.air, pan, beat, tune: true});
            if ((p.rhythm === 5) || (p.rhythm === 1)) {
                lead({f: midi_frequency(note + 12), t: t + 0.08, d: beat*2.4, a: 0.008, pan: -pan, beat});
            }
        }
    }
    // a world of arpeggios: the chord's notes one by one on the eighths the tune leaves free
    if (v.arp && !tune) {
        const i = p.drive.arp[s % p.drive.arp.length] % chord.length;
        lead({f: midi_frequency(p.root + 24 + chord[i]), t, d: beat*0.5, a: 0.013, pan: (s % 2) ? 0.4 : -0.4, beat});
    }
    music_voices_percussion(p, s, t, combat);
}

// The calm theme's drums in the new set: the world's figure where the classic set has it (its `rhythm`), the kit's
// own over it, and a campaign fight's kick, snare and hats, all on the world's kit
function music_voices_percussion(p, s, t, combat = 0)
{
    const kit = music_kits[p.voices.kit];
    const id = p.rhythm;
    if ((id === 5) && (s % 32 === 20)) {
        music_voices_level = p.voices.calm.lead;
        music_leads[p.voices.lead]({f: midi_frequency(p.root + 43), t, d: 60/p.bpm*3, a: 0.014, pan: -0.5, beat: 60/p.bpm});
    }
    music_voices_level = p.voices.calm.kit;
    if ([0, 1, 2, 3, 6].includes(id) && (s % 16 === 0)) {
        kit.low(t, 0.038);
    }
    if ([1, 2, 3, 6].includes(id) && (s % 8 === 6)) {
        kit.mid(t, (id === 3) ? 0.026 : 0.017, (s % 16 === 6) ? -0.25 : 0.25);
    }
    if ((id === 4) && (s % 32 === 0)) {
        kit.low(t, 0.05);
        kit.mid(t + 0.1, 0.012, 0.4);
    }
    if ((id === 7) && (s % 32 === 0)) {
        kit.low(t, 0.04);
    }
    if (kit.calm) {
        kit.calm(s, t);
    }
    if (combat) {
        music_voices_level = p.voices.calm.fight;
        if (s % 4 === 0) {
            kit.low(t, 0.065);
        }
        if (s % 8 === 4) {
            kit.mid(t, 0.038, 0.1);
        }
        if (s % 2 === 1) {
            kit.high(t, 0.013, (s % 4 === 1) ? -0.3 : 0.3);
        }
    }
}

// A boss fight begins in the new set: the classic hit's boom under the kit's low drum, a crash, the chord on the
// world's lead
function music_voices_drive_hit(p, t)
{
    const kit = music_kits[p.voices.kit];
    const chord = p.chords[0];
    music_voices_level = p.voices.boss.kit;
    music_tone({t, d: 0.9, a: 0.11, f: 120, f_end: 32, attack: 0.004});
    kit.low(t, 0.07);
    music_air({t, d: 1.4, a: 0.03, cutoff: 6000, filter: 'highpass', attack: 0.01});
    music_voices_level = p.voices.boss.lead;
    for (let i = 0, end = chord.length; i < end; ++i) {
        music_leads[p.voices.lead]({f: midi_frequency(p.root + 12 + chord[i]), t, d: 0.7, a: 0.02, pan: (i % 2) ? 0.35 : -0.35, beat: 60/p.drive.bpm});
    }
}

// One eighth of the drive in the new set: the world's own bar of drums, bass and arpeggio (its voices.groove), its
// tune and its pad; a boss fight is music_drive_step's piece, its kit, bass, riff and stabs on the world's instruments
function music_voices_drive_step(p, step, t, eighth, level)
{
    const d = p.drive;
    const v = p.voices;
    const s = step % 256;
    const chord = p.chords[Math.floor(s/16) % 4];
    const section = Math.floor(s/64);
    const root = p.root + chord[0] + ((p.root + chord[0] < 36) ? 12 : 0);
    const half = eighth/2;
    const beat = eighth*2;
    const lead = music_leads[v.lead];
    if (level === 2) {
        music_voices_level = v.boss.kit;
        music_voices_boss_kit(music_kits[v.kit], s, t, half);
        music_voices_level = v.boss.bass;
        music_basses[v.bass]({f: midi_frequency(root), t, d: half*0.9, a: 0.075});
        music_basses[v.bass]({f: midi_frequency(root + ((s % 2) ? 12 : 0)), t: t + half, d: half*0.9, a: 0.075});
        // its riff on the world's lead with an edge of sawtooth under it, the chord stabbed
        music_voices_level = v.boss.lead;
        const note = root + 24 + music_boss_riff[s % music_boss_riff.length];
        lead({f: midi_frequency(note), t, d: eighth*0.8, a: 0.03, pan: -0.15, beat});
        music_tone({t, d: eighth*0.8, a: 0.012, f: midi_frequency(note - 12), type: 'sawtooth', cutoff: 1500, attack: 0.004, pan: 0.15});
        if ((s % 16 === 0) || (s % 16 === 5)) {
            for (let i = 0, end = chord.length; i < end; ++i) {
                lead({f: midi_frequency(p.root + 12 + chord[i]), t, d: eighth*0.9, a: 0.014, pan: (i % 2) ? 0.3 : -0.3, beat});
            }
        }
        return;
    }
    music_voices_groove(p, s, t, eighth, chord, root);
    music_voices_level = v.drive.kit;
    if (s % 64 === 0) {
        music_air({t, d: 1.2, a: 0.016, cutoff: 5500, filter: 'highpass', attack: 0.01, pan: -0.3});
    }
    music_voices_level = v.drive.lead;
    if ((section > 0) && (s % 2 === 0)) {
        const degree = p.motif[(s/2) % p.motif.length];
        if (degree !== null) {
            lead({f: midi_frequency(p.root + 24 + p.scale[degree % p.scale.length]), t, d: eighth*1.8, a: 0.03, pan: -0.15, beat, tune: true});
        }
    }
    music_voices_level = v.drive.pad;
    if (s % 16 === 0) {
        for (let i = 0, end = chord.length; i < end; ++i) {
            music_pads[v.pad]({f: midi_frequency(p.root + 12 + chord[i]), t, d: eighth*16 + 0.6, a: 0.008, pan: (i % 2) ? 0.4 : -0.4, i, beat});
        }
    }
}

// How hard a slot of a groove's row is played
const music_groove_hits = {X: 1, x: 0.65, o: 0.35};
// The bass's note in a groove's row, over the chord's root: the root, its fifth, the octave up
const music_groove_notes = {r: 0, f: 7, u: 12};

// One eighth of the world's own bar in the drive (its voices.groove): rows of slots, `grid` of them a bar (16
// sixteenths, or 12 for a bar in triplets), a row one bar long or several. The drums' rows low, mid and high, and
// stab (the chord on the lead): X a full hit, x a lighter one, o a ghost. bass: r the chord's root, f its fifth, u
// the octave up, held for each - after it. arp: x the next note of the chord's arpeggio (the drive's arp)
function music_voices_groove(p, s, t, eighth, chord, root)
{
    const v = p.voices;
    const g = v.groove;
    const kit = music_kits[v.kit];
    const lead = music_leads[v.lead];
    const slot = eighth*8/g.grid;
    const bar = Math.floor(s/8);
    const e = s % 8;
    // each slot of the row that starts within this eighth: play(the slot's character, when, its place in the row)
    function row(pattern, play) {
        if (!pattern) {
            return;
        }
        const from = (bar % (pattern.length/g.grid))*g.grid;
        for (let k = Math.ceil(e*g.grid/8), end = Math.ceil((e + 1)*g.grid/8); k < end; ++k) {
            if (pattern[from + k] !== '.') {
                play(pattern[from + k], t + (k - e*g.grid/8)*slot, from + k);
            }
        }
    }
    music_voices_level = v.drive.kit;
    row(g.low, (c, when) => kit.low(when, 0.1*music_groove_hits[c]));
    row(g.mid, (c, when) => kit.mid(when, 0.05*music_groove_hits[c], 0));
    row(g.high, (c, when, k) => kit.high(when, 0.014*music_groove_hits[c], (k % 2) ? -0.2 : 0.2));
    music_voices_level = v.drive.bass;
    row(g.bass, function (c, when, k) {
        if (c === '-') {
            return;
        }
        let length = 1;
        while (g.bass[k + length] === '-') {
            length++;
        }
        music_basses[v.bass]({f: midi_frequency(root + music_groove_notes[c]), t: when, d: length*slot*0.92, a: 0.075});
    });
    music_voices_level = v.drive.lead;
    row(g.arp, function (c, when, k) {
        const i = p.drive.arp[(bar*g.grid + k) % p.drive.arp.length] % chord.length;
        lead({f: midi_frequency(p.root + 24 + chord[i]), t: when, d: slot*0.9, a: 0.012, pan: (k % 2) ? 0.35 : -0.35, beat: eighth*2});
    });
    row(g.stab, function (c, when) {
        for (let i = 0, end = chord.length; i < end; ++i) {
            lead({f: midi_frequency(p.root + 12 + chord[i]), t: when, d: slot*1.8, a: 0.014*music_groove_hits[c], pan: (i % 2) ? 0.3 : -0.3, beat: eighth*2});
        }
    });
}

// The drums of one eighth of a boss fight in the new set: music_drive_kit's boss figure on the world's kit
function music_voices_boss_kit(kit, s, t, half)
{
    const bar = s % 8;
    if (bar % 2 === 0) {
        kit.low(t, 0.1);
    }
    if (bar === 7) {
        kit.low(t + half, 0.07);
    }
    if ((bar === 2) || (bar === 6)) {
        kit.mid(t, 0.05, 0);
    }
    if (s % 64 >= 60) {
        kit.mid(t, 0.03, -0.2);
        kit.mid(t + half, 0.034, 0.2);
    }
    kit.high(t, 0.014, 0.2);
    kit.high(t + half, 0.009, -0.2);
    if (s % 64 === 0) {
        music_air({t, d: 1.2, a: 0.016, cutoff: 5500, filter: 'highpass', attack: 0.01, pan: -0.3});
    }
}
