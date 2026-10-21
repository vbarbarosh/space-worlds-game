// The driving music: the arcade's, and any flagship fight's. Each world's theme (its chords, scale and tune, music.js)
// played fast over a drum kit, a running bass, an arpeggio and a lead of the world's own sound (its music.drive). A
// flagship in reach lifts it at once: a hit on the spot, the tempo up, the kit doubled, the bass in sixteenths, the lead
// an octave higher; gone, the music drops back to the drive at the next step.

// A flagship this near (m) is a boss fight
const music_boss_reach = 1800;
// The boss fight plays this much faster than the world's drive
const music_boss_tempo = 1.08;

// 0 the world's calm theme, 1 the drive (the arcade), 2 a boss fight
function music_drive_level()
{
    const flight = (state === 'playing') && !!player;
    if (flight && enemies.some(v => (v.type === 'boss') && (v.hp > 0) && (distance(v, player) < music_boss_reach))) {
        return 2;
    }
    return arcade.active ? 1 : 0;
}

// The drive's tempo for the world's theme `p`
function music_drive_bpm(p, level)
{
    return p.drive.bpm*((level === 2) ? music_boss_tempo : 1);
}

// The boss fight begins: a low boom, a crash and the chord stabbed, at once
function music_drive_hit(p, t)
{
    const bus = sound.music_bus;
    const chord = p.chords[0];
    tone(120, 0.9, 'sine', 0.13, t, 32, 400, bus);
    noise(1.4, 0.045, 6000, t, bus, {filter: 'highpass'});
    for (let i = 0, end = chord.length; i < end; ++i) {
        tone(midi_frequency(p.root + 12 + chord[i]), 0.7, 'sawtooth', 0.016, t, null, 1600, bus, {pan: (i % 2) ? 0.35 : -0.35, release: 0.5});
    }
}

// One eighth of the drive at step `step`, played at t; `eighth` long (s)
function music_drive_step(p, step, t, eighth, level)
{
    const d = p.drive;
    const s = step % 256;
    const boss = (level === 2);
    const chord = p.chords[Math.floor(s/16) % 4];
    const section = Math.floor(s/64);
    const root = p.root + chord[0] + ((p.root + chord[0] < 36) ? 12 : 0);
    const half = eighth/2;
    music_drive_kit(d.kit, s, t, half, boss);
    // the bass: the chord's root, by the world's figure; in a boss fight in sixteenths, jumping octaves
    function bass(note, when, length) {
        music_note(note, length, 'sawtooth', 0.042, when, boss ? 760 : 460, {attack: 0.005, release: length*0.6});
        music_note(note, length, 'sine', 0.05, when, 300, {attack: 0.005, release: length*0.6});
    }
    if (boss) {
        bass(root, t, half*0.9);
        bass(root + ((s % 2) ? 12 : 0), t + half, half*0.9);
    }
    else if (d.bass === 'offbeat') {
        if (s % 2) {
            bass(root + 12, t, eighth*0.8);
        }
        else {
            music_note(root, eighth*1.6, 'sine', 0.06, t, 260, {attack: 0.005});
        }
    }
    else if (d.bass === 'gallop') {
        bass(root, t, half*0.9);
        if (s % 2) {
            bass(root, t + half, half*0.9);
        }
    }
    else {
        bass(root + ((s % 8 === 7) ? 12 : 0), t, eighth*0.85);
    }
    // the arpeggio: the chord's notes in sixteenths, all along
    for (const k of [0, 1]) {
        const i = d.arp[(s*2 + k) % d.arp.length] % chord.length;
        music_note(p.root + 24 + chord[i], half*0.9, d.lead, boss ? 0.011 : 0.008, t + k*half, 2800, {
            attack: 0.004,
            release: half*0.7,
            pan: k ? 0.35 : -0.35,
        });
    }
    // the tune: the world's motif in quarters, doubled a little out of tune, from the second section on (an octave up
    // in a boss fight, from the start)
    if ((boss || (section > 0)) && (s % 2 === 0)) {
        const degree = p.motif[(s/2) % p.motif.length];
        if (degree !== null) {
            const note = p.root + 24 + (boss ? 12 : 0) + p.scale[degree % p.scale.length];
            for (const detune of [-7, 7]) {
                music_note(note, eighth*1.8, d.lead, 0.014, t, 3200, {attack: 0.01, release: eighth, detune, pan: detune/40});
            }
        }
    }
    // a pad under it all, and in a boss fight a stab of the chord on its change and on the and of three
    if (s % 16 === 0) {
        for (let i = 0, end = chord.length; i < end; ++i) {
            music_note(p.root + 12 + chord[i], eighth*15, 'sawtooth', 0.005, t, 900, {attack: 0.3, release: eighth*6, pan: (i % 2) ? 0.4 : -0.4});
        }
    }
    if (boss && ((s % 16 === 0) || (s % 16 === 5))) {
        for (let i = 0, end = chord.length; i < end; ++i) {
            music_note(p.root + 12 + chord[i], eighth*0.9, 'sawtooth', 0.012, t, 1900, {attack: 0.004, release: eighth*0.6});
        }
    }
}

// The drums of one eighth: 'four' a kick on every beat, 'break' a broken kick, 'half' a heavy half-time; a boss fight
// plays four on the floor with sixteenth hats and a snare roll into every fourth bar
function music_drive_kit(kit, s, t, half, boss)
{
    const bus = sound.music_bus;
    const bar = s % 8;
    const kick = boss
        ? (bar % 2 === 0)
        : (kit === 'break')
            ? [0, 3, 5].includes(bar)
            : (kit === 'half')
                ? [0, 5].includes(bar)
                : (bar % 2 === 0);
    const snare = ((kit === 'half') && !boss) ? (bar === 4) : ((bar === 2) || (bar === 6));
    if (kick) {
        tone(150, 0.26, 'sine', 0.1, t, 42, 400, bus, {attack: 0.002});
        noise(0.012, 0.03, 3500, t, bus);
    }
    if (boss && (bar === 7)) {
        tone(150, 0.2, 'sine', 0.07, t + half, 42, 400, bus, {attack: 0.002});
    }
    if (snare) {
        noise(0.16, 0.05, 1900, t, bus, {q: 0.8});
        tone(200, 0.1, 'triangle', 0.022, t, 150, 900, bus);
    }
    if (boss && (s % 64 >= 60)) {
        noise(0.08, 0.03, 2100, t, bus, {q: 0.8});
        noise(0.08, 0.034, 2100, t + half, bus, {q: 0.8});
    }
    // the hats: on the offbeats; every eighth in a broken or half-time kit; sixteenths in a boss fight
    if (boss || (kit !== 'four') || (s % 2)) {
        noise(0.035, 0.014, 8000, t, bus, {filter: 'highpass', pan: 0.2});
    }
    if (boss) {
        noise(0.03, 0.009, 9000, t + half, bus, {filter: 'highpass', pan: -0.2});
    }
    if (s % 64 === 0) {
        noise(1.2, 0.02, 5500, t, bus, {filter: 'highpass', pan: -0.3});
    }
}
