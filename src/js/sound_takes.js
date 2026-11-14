// The sounds picked by ear: the shots, the blasts and the pickup of the new set are recordings (src/sounds/), each in
// several takes, one of which plays. In flight 7, 8 and 9 step through the takes of the shots, the blasts and the
// pickup, the game says which one plays and plays it, and the pick is kept in this browser, so the takes are judged
// in a fight and not on a page. The pick of each family in `sound_takes` is the one a new browser starts with.
//
// A fight's mix is built on them: your own shot short and quiet (it fires five times a second and more), a hit on a
// raider next to nothing, a raider's end the loud deep thing the shots were fired for.
const sound_takes_key = 'pulse_drift_sound_takes';
// Each take's level by the sound it plays, set by measure (the sound brief, docs/designer/sound.md, says against what)
const sound_take_levels = {
    /* levels */
    shot: {a: {shot: 0.04, enemy_plasma: 0.018}, b: {shot: 0.082, enemy_plasma: 0.04}, c: {shot: 0.048, enemy_plasma: 0.021}, d: {shot: 0.034, enemy_plasma: 0.015}, e: {shot: 0.039, enemy_plasma: 0.019}, f: {shot: 0.097, enemy_plasma: 0.045}},
    blast: {a: {blast: 0.366, blast_big: 0.489, blast_huge: 0.57, kill: 0.224}, b: {blast: 0.274, blast_big: 0.425, blast_huge: 0.628, kill: 0.227}, c: {blast: 0.293, blast_big: 0.472, blast_huge: 0.581, kill: 0.224}, d: {blast: 0.337, blast_big: 0.616, blast_huge: 0.61, kill: 0.217}},
    pickup: {a: {pickup: 0.483}, b: {pickup: 0.265}, c: {pickup: 0.88}, d: {pickup: 0.392}, e: {pickup: 0.252}, f: {pickup: 0.237}},
    /* levels end */
};
const sound_takes = {
    shot: {
        pick: 'a',
        key: 'Digit7',
        label: 'Shot',
        // the sound played when its take is stepped to
        hear: 'shot',
        takes: {
            a: {name: 'a small bright laser', file: 'shot_a'},
            b: {name: 'a soft low laser', file: 'shot_b'},
            c: {name: 'a round mid laser', file: 'shot_c'},
            d: {name: 'a blaster with a snap', file: 'shot_d'},
            e: {name: 'a cannon’s bark', file: 'shot_e'},
            f: {name: 'a heavy laser with a thud', file: 'shot_f'},
        },
    },
    blast: {
        pick: 'a',
        key: 'Digit8',
        label: 'Blast',
        hear: 'blast_big',
        takes: {
            a: {name: 'a crunch over a deep boom'},
            b: {name: 'a film’s explosion, long'},
            c: {name: 'a middle-sized explosion'},
            d: {name: 'the deepest, mostly felt'},
        },
    },
    pickup: {
        pick: 'a',
        key: 'Digit9',
        label: 'Pickup',
        hear: 'pickup',
        takes: {
            a: {name: 'a glass tick', file: 'pickup_a'},
            b: {name: 'two notes of a chime', file: 'pickup_b'},
            c: {name: 'a pluck', file: 'pickup_c'},
            d: {name: 'coins', file: 'pickup_d'},
            e: {name: 'a small rising blip', file: 'pickup_e'},
            f: {name: 'a soft bell', file: 'pickup_f'},
        },
    },
};
// the picks kept in this browser, by family; anything else in storage counts as nothing
const sound_take_picks = sound_take_picks_read();

function sound_take_picks_read()
{
    const out = {};
    try {
        const kept = JSON.parse(localStorage.getItem(sound_takes_key));
        for (const family of Object.keys(sound_takes)) {
            if (kept && (typeof kept[family] === 'string') && Object.hasOwn(sound_takes[family].takes, kept[family])) {
                out[family] = kept[family];
            }
        }
    }
    catch {
    }
    return out;
}

// The take of `family` that plays: its letter
function sound_take(family)
{
    return sound_take_picks[family] || sound_takes[family].pick;
}

// Take `letter` of `family` plays from now, and is kept
function sound_take_choose(family, letter)
{
    if (!Object.hasOwn(sound_takes, family) || !Object.hasOwn(sound_takes[family].takes, letter)) {
        return;
    }
    sound_take_picks[family] = letter;
    try {
        localStorage.setItem(sound_takes_key, JSON.stringify(sound_take_picks));
    }
    catch {
    }
}

// The level of the take that plays for sound `kind` of `family`
function sound_take_level(family, kind)
{
    return sound_take_levels[family][sound_take(family)][kind] || 1;
}

// Your own shot: the take's recording, a little off in pitch each time
function sound_take_shot(k)
{
    const take = sound_takes.shot.takes[sound_take('shot')];
    k.sample({name: take.file, a: 0.5*sound_take_level('shot', 'shot'), rate: k.r(0.95, 1.06)});
}

// A raider's plasma shot: the same recording slowed and dulled, so the two guns are kin and still told apart
function sound_take_enemy_shot(k)
{
    const take = sound_takes.shot.takes[sound_take('shot')];
    k.sample({name: take.file, a: 0.5*sound_take_level('shot', 'enemy_plasma'), rate: k.r(0.66, 0.76), cutoff: 2600});
}

// A blast by its size ('blast' a missile's or a mine's, 'blast_big' a ship's, 'blast_huge' a flagship's last) and
// 'kill', the wreck breaking up under a ship's blast
function sound_take_blast(k, kind)
{
    const letter = sound_take('blast');
    const level = sound_take_level('blast', kind);
    function layer(name, a, o = {}) {
        k.sample({name, a: a*level, ...o});
    }
    if (kind === 'kill') {
        layer('debris', 0.4, {rate: k.r(1.05, 1.4), from: Math.random()*0.3, fade: 0.7});
        return;
    }
    const turn = k.turn(3);
    const r = k.r(0.93, 1.07);
    if (letter === 'a') {
        if (kind === 'blast') {
            layer('boom_crunch_1', 0.7, {rate: r*1.22, fade: 0.55});
            layer('boom_low', 0.3, {rate: 1.3, fade: 0.5});
        }
        else if (kind === 'blast_big') {
            layer(['boom_crunch_1', 'boom_crunch_2', 'boom_crunch_3'][turn], 0.8, {rate: r});
            layer('boom_sub', 0.45, {rate: 1.15, fade: 1.3});
            layer('debris', 0.12, {rate: k.r(0.9, 1.2), at: 0.1, extra: true});
        }
        else {
            layer('boom_deep', 0.9, {rate: 0.85});
            layer('boom_sub', 0.8, {rate: 0.9});
            layer('boom_cinema', 0.6, {at: 0.14});
            layer('debris', 0.2, {rate: 0.8, at: 0.35});
        }
    }
    else if (letter === 'b') {
        if (kind === 'blast') {
            layer('boom_cinema', 0.7, {rate: r*1.35, fade: 0.6});
        }
        else if (kind === 'blast_big') {
            layer('boom_cinema', 0.9, {rate: r, fade: 1.7});
        }
        else {
            layer('boom_cinema', 0.9, {rate: 0.75});
            layer('boom_sub', 0.7, {rate: 0.9, at: 0.05});
        }
    }
    else if (letter === 'c') {
        if (kind === 'blast') {
            layer('boom_medium', 0.7, {rate: r*1.3, fade: 0.55});
        }
        else if (kind === 'blast_big') {
            layer('boom_medium', 0.9, {rate: r});
        }
        else {
            layer('boom_medium', 0.9, {rate: 0.7});
            layer('boom_sub', 0.7, {rate: 0.9, at: 0.05});
        }
    }
    else {
        if (kind === 'blast') {
            layer('boom_low', 0.8, {rate: r*1.2, fade: 0.6});
        }
        else if (kind === 'blast_big') {
            layer('boom_deep', 0.8, {rate: r*1.05});
            layer('boom_low', 0.4, {rate: 0.95});
        }
        else {
            layer('boom_sub', 0.9, {rate: 0.9});
            layer('boom_deep', 0.8, {rate: 0.8, at: 0.1});
        }
    }
}

// A pickup: the take's recording, a step of the scale up with each one of a run (k.streak), an octave at most
function sound_take_pickup(k)
{
    const take = sound_takes.pickup.takes[sound_take('pickup')];
    const steps = [0, 2, 4, 5, 7, 9, 11, 12];
    k.sample({name: take.file, a: 0.4*sound_take_level('pickup', 'pickup'), rate: Math.pow(2, steps[Math.min(k.streak, steps.length - 1)]/12)});
}

// 7, 8, 9 in flight or at a pause: the next take of the shots, the blasts, the pickup; said on the screen and played
addEventListener('keydown', function (event) {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof HTMLInputElement) || !['playing', 'paused'].includes(state)) {
        return;
    }
    for (const family of Object.keys(sound_takes)) {
        const v = sound_takes[family];
        if (event.code !== v.key) {
            continue;
        }
        const letters = Object.keys(v.takes);
        const next = letters[(letters.indexOf(sound_take(family)) + 1) % letters.length];
        sound_take_choose(family, next);
        show_toast(`${v.label} sound ${next.toUpperCase()}`, `${v.takes[next].name} · ${letters.indexOf(next) + 1} of ${letters.length}`, 2.5, 'info');
        if (sound.ctx) {
            delete sound.cues[v.hear];
            sfx(v.hear);
        }
    }
});
