// Flagships: each world's flagship is a fight of its own, its moves taken from its look and its world. One entry a world
// in boss_designs (Haven to Eclipse): how it moves, its gun, its attacks, and the cycle it runs them in, one for each
// half of its hull. Every attack shows its tell first (a wind-up, a glow, a drawn line or circle) and can be dodged;
// a big attack ends in a window where the hull is exposed and takes more damage. The same kinds of attack drive the
// arcade elites' tricks (elite_tricks). Hooks: update() calls boss_update for a flagship or an elite, damage_enemy asks
// boss_hit_factor, render() calls boss_render.
//
// The flagship's damage grows with the world as raiders' guns do (raider_hit_scale) and by the mode's hits; its shots
// fly at the pace raider_shot_speed gives (a ring's, a missile's or a gun's); the mode sets the pace between attacks
// (boss_pace), not the length of a tell.

// how much more a hit does while the hull is exposed, and how much of it gets through while pods guard the hub
const boss_exposed_factor = 1.6;
const boss_guard_factor = 0.35;
// the colours of a tell (about to happen) and of the exposed hull
const boss_tell_color = '#ffd16e';
const boss_open_color = '#ffffff';

// Emitters are points on the hull in units of its radius: [ahead, to the right]. A cycle is the order the attacks run
// in; the second cycle starts below half the hull, with the phase's toast, after a roar. `hull`: a factor on the arcade
// flagship's hull (arcade_flagship_spawn), so that with a mid kit each one runs both its cycles before it falls: from
// Ion Reach on its attacks are longer than its world's growth gave it time for; Cryosphere's plates and Nova Forge's
// heat already hold the fight longer, so they need less.
const boss_designs = [
    {
        // Haven: crescent wings; a corsair that orbits you, fans plasma from its wingtips and strafes across you
        name: 'THE CRESCENT',
        hull: 1,
        hint: 'WATCH ITS LINES · HIT IT WHILE IT STALLS',
        move: {kind: 'orbit', range: 380, turn: 0.42},
        gun: {every: 2.4, weapon: 'plasma', speed: 240},
        gap: 1.1,
        cycles: [
            ['fan', 'fan', 'strafe'],
            ['fan_wide', 'crescent', 'strafe', 'fan_wide', 'crescent', 'strafe'],
        ],
        phase2: {title: 'WINGS SPREAD', line: 'A RING WITH ONE GAP · FLY FOR THE GAP', summon: ['chaser', 'chaser']},
        attacks: {
            fan: {kind: 'fan', emitters: [[-0.3, -0.95], [-0.3, 0.95]], count: 4, spread: 0.45, weapon: 'plasma', speed: 150, volleys: 2, every: 0.45, tell: 0.6},
            fan_wide: {kind: 'fan', emitters: [[-0.3, -0.95], [-0.3, 0.95]], count: 6, spread: 0.65, weapon: 'plasma', speed: 155, volleys: 2, every: 0.4, tell: 0.6},
            strafe: {kind: 'charge', speed: 780, length: 1300, width: 1.3, tell: 1.1, drop: 'bolts', stall: 2.2},
            crescent: {kind: 'ring', count: 18, gap: 1.2, weapon: 'plasma', speed: 125, rings: 2, every: 0.6, tell: 0.8},
        },
    },
    {
        // Verdant: a beetle with glowing eyes and spines; it drifts with the living current, sows spores that drift too,
        // and in its second half hatches a brood
        name: 'THE THORN BEETLE',
        hull: 1,
        hint: 'SPORES DRIFT WITH THE CURRENT · HIT IT WHEN ITS SHELL OPENS',
        move: {kind: 'drift', range: 430, speed: 70, lunge: 4.5},
        gun: {every: 2.4, weapon: 'scatter', speed: 200},
        gap: 1.2,
        cycles: [
            ['spines', 'spores', 'thorns'],
            ['spines_fast', 'spores_more', 'brood', 'spines_fast', 'thorns'],
        ],
        phase2: {title: 'THE BROOD WAKES', line: 'ITS EYES BURN BEFORE IT HATCHES · KILL THE BROOD'},
        attacks: {
            spines: {kind: 'spiral', arms: 3, rate: 6, turn: 1.5, weapon: 'plasma', speed: 115, time: 2.2, tell: 0.7},
            spines_fast: {kind: 'spiral', arms: 4, rate: 6, turn: -1.9, weapon: 'plasma', speed: 125, time: 2.4, tell: 0.7},
            spores: {kind: 'mines', place: 'around', count: 5, arm: 1.2, life: 8, reach: 85, trigger: 100, damage: 18, look: 'spore', tell: 0.6},
            spores_more: {kind: 'mines', place: 'around', count: 7, arm: 1.1, life: 8, reach: 85, trigger: 100, damage: 18, look: 'spore', tell: 0.6},
            thorns: {kind: 'ring', count: 10, gap: 0, weapon: 'scatter', speed: 110, rings: 3, every: 0.55, tell: 1.0, stall: 1.8},
            brood: {kind: 'summon', types: ['shard', 'shard', 'shard', 'splitter'], tell: 1.3, eyes: true, stall: 2.4},
        },
    },
    {
        // Dustfall: a toothed blade with hatches and side pods; it coasts as everything here does, launches missiles from
        // its hatches, flak from its pods, and saws across you, the dust bursting behind it
        name: 'THE SAWTOOTH',
        hull: 1,
        hint: 'IT COASTS · DODGE THE SAW, THEN HIT IT WHILE IT IS JAMMED',
        move: {kind: 'coast', range: 470, thrust: 170, top: 250},
        gun: {every: 2.2, weapon: 'scatter', speed: 200},
        gap: 1.2,
        cycles: [
            ['hatch', 'flak', 'saw'],
            ['hatch_more', 'flak', 'saw_twice', 'flak', 'saw'],
        ],
        phase2: {title: 'BLADE UNCHAINED', line: 'TWO CHARGES IN A ROW · THE DUST BURSTS BEHIND IT', summon: ['lancer', 'lancer']},
        attacks: {
            hatch: {kind: 'missiles', emitters: [[0.25, -0.5], [0.25, 0.5], [-0.3, -0.6]], every: 0.35, tell: 0.8},
            hatch_more: {kind: 'missiles', emitters: [[0.25, -0.5], [0.25, 0.5], [-0.3, -0.6], [-0.3, 0.6]], every: 0.3, tell: 0.8},
            flak: {kind: 'fan', emitters: [[-0.15, -1.05], [-0.15, 1.05]], count: 1, spread: 0, weapon: 'scatter', speed: 175, volleys: 3, every: 0.3, tell: 0.5},
            saw: {kind: 'charge', speed: 900, length: 1200, width: 1.4, tell: 1.2, drop: 'dust', stall: 2.2, spin: true},
            saw_twice: {kind: 'charge', speed: 900, length: 1100, width: 1.4, tell: 1.2, drop: 'dust', stall: 2.6, spin: true, repeat: 2},
        },
    },
    {
        // Ion Reach: a wheel with a hub and four pods; it holds its range and jumps through the storm, sweeps you with
        // lightning spokes, and in its second half sends its pods out to shield the hub
        name: 'THE STORM WHEEL',
        hull: 4.5,
        hint: 'SPOKES SWEEP A QUARTER TURN · HIT THE HUB WHEN IT OVERHEATS',
        move: {kind: 'hold', range: 520, spin: 0.7},
        gun: {every: 2.2, weapon: 'ion', speed: 210},
        gap: 1.1,
        cycles: [
            ['volley', 'spokes', 'blink', 'volley', 'spokes'],
            ['pods', 'spokes_wide', 'blink', 'volley', 'spokes_wide', 'blink'],
        ],
        phase2: {title: 'PODS LAUNCHED', line: 'THE PODS SHIELD THE HUB · DOWN THE PODS TO OPEN IT'},
        attacks: {
            volley: {kind: 'fan', emitters: [[0.8, 0], [0, 0.8], [-0.8, 0], [0, -0.8]], spin: true, count: 1, spread: 0, weapon: 'ion', speed: 210, volleys: 2, every: 0.3, tell: 0.6},
            spokes: {kind: 'beam', count: 4, length: 700, width: 22, tell: 1.1, time: 2.6, sweep: 1.57, damage: 16, effect: 'drain', stall: 1.6},
            spokes_wide: {kind: 'beam', count: 4, length: 760, width: 22, tell: 1.1, time: 3, sweep: 2.4, damage: 16, effect: 'drain'},
            blink: {kind: 'blink', tell: 0.9, range: 500},
            pods: {kind: 'pods', count: 4, radius: 150, turn: 0.9, tell: 1, open: 3},
        },
    },
    {
        // Obsidian: a stepped blade, heavy and slow; it steps forward, tracks you with rail sights that lock before they
        // fire, opens gravity wells under you, and turns broadside to fire a row of lanes
        name: 'THE IRON STAIR',
        hull: 3,
        hint: 'A SIGHT LOCKS BEFORE IT FIRES · MOVE WHEN IT LOCKS',
        move: {kind: 'step', range: 540, stride: 170, every: 2.4},
        gun: null,
        gap: 1,
        cycles: [
            ['lances', 'well', 'lances', 'broadside'],
            ['lances_more', 'wells', 'broadside_twice', 'lances_more', 'broadside'],
        ],
        phase2: {title: 'THE PLANET PULLS', line: 'TWO WELLS AND A DOUBLE BROADSIDE · STAY BETWEEN THE LANES'},
        attacks: {
            lances: {kind: 'lances', mode: 'track', emitters: [[0.7, 0], [0, -0.7], [0, 0.7]], track: 0.9, lock: 0.35, stagger: 0.35, weapon: 'rail'},
            lances_more: {kind: 'lances', mode: 'track', emitters: [[0.7, 0], [0.2, -0.8], [0.2, 0.8], [-0.4, -0.9], [-0.4, 0.9]], track: 0.8, lock: 0.35, stagger: 0.28, weapon: 'rail'},
            well: {kind: 'well', count: 1, tell: 1.2, life: 4, reach: 330, pull: 115, core: 60, damage: 14},
            wells: {kind: 'well', count: 2, tell: 1.2, life: 4, reach: 300, pull: 110, core: 60, damage: 14},
            broadside: {kind: 'lances', mode: 'lanes', count: 6, spacing: 100, tell: 1.4, weapon: 'rail', stall: 2},
            broadside_twice: {kind: 'lances', mode: 'lanes', count: 6, spacing: 100, tell: 1.4, weapon: 'rail', volleys: 2, stall: 2},
        },
    },
    {
        // Cryosphere: a crystal with a ridge and a diamond core; it glides as ships here do, ice plates turn round it
        // and stop your shots, it spins out shards and drops icicles, and its frost nova draws the plates in
        name: 'THE FROST CRYSTAL',
        hull: 1.25,
        hint: 'PLATES STOP YOUR SHOTS · SHOOT THROUGH THE GAPS, OR AFTER THE NOVA',
        move: {kind: 'glide', range: 480, thrust: 110, top: 200},
        plates: [{count: 6, filled: 4, turn: 0.7}, {count: 6, filled: 5, turn: 1.1}],
        gun: {every: 2.6, weapon: 'scatter', speed: 200},
        gap: 1.1,
        cycles: [
            ['shards', 'icicles', 'nova'],
            ['shards_more', 'icicles_more', 'shards_more', 'nova'],
        ],
        phase2: {title: 'THE CORE HARDENS', line: 'FIVE PLATES TURN FASTER · THE NOVA STILL OPENS THEM'},
        attacks: {
            shards: {kind: 'spiral', arms: 2, rate: 7, turn: 2.1, weapon: 'plasma', speed: 130, time: 2, tell: 0.6},
            shards_more: {kind: 'spiral', arms: 3, rate: 7, turn: -2.3, weapon: 'plasma', speed: 135, time: 2.2, tell: 0.6},
            icicles: {kind: 'mines', place: 'player', count: 5, spread: 230, arm: 1.3, life: 1.3, reach: 70, damage: 18, look: 'ice', tell: 0.3},
            icicles_more: {kind: 'mines', place: 'player', count: 7, spread: 260, arm: 1.25, life: 1.25, reach: 70, damage: 18, look: 'ice', tell: 0.3},
            nova: {kind: 'wave', reach: 620, speed: 340, width: 26, damage: 22, tell: 1.4, effect: 'chill', stall: 2.6},
        },
    },
    {
        // Nova Forge: a furnace with glowing vents; it lumbers in close, sweeps a flame from its vents that heats your
        // guns, lobs embers that leave burning slag, fires missiles, and its flare opens the furnace
        name: 'THE FURNACE',
        hull: 1.25,
        hint: 'ITS FLAME HEATS YOUR GUNS · THE FLARE OPENS ITS CORE',
        move: {kind: 'lumber', range: 320, speed: 55},
        gun: null,
        gap: 1.1,
        cycles: [
            ['flame', 'mortar', 'salvo', 'flare'],
            ['flame_twin', 'mortar_more', 'salvo', 'flame_twin', 'flare'],
        ],
        phase2: {title: 'MELTDOWN', line: 'TWIN FLAMES AND MORE SLAG · THE FLARE STILL OPENS IT'},
        attacks: {
            flame: {kind: 'beam', count: 1, cone: 0.3, length: 380, tell: 0.9, time: 1.8, sweep: 2, damage: 12, effect: 'heat'},
            flame_twin: {kind: 'beam', count: 2, cone: 0.3, length: 380, tell: 0.9, time: 2.4, sweep: 2.6, damage: 12, effect: 'heat'},
            mortar: {kind: 'mines', place: 'player', count: 5, spread: 240, arm: 1.3, life: 1.3, reach: 80, damage: 16, look: 'ember', pool: 3, tell: 0.4},
            mortar_more: {kind: 'mines', place: 'player', count: 7, spread: 260, arm: 1.3, life: 1.3, reach: 80, damage: 16, look: 'ember', pool: 4, tell: 0.4},
            salvo: {kind: 'missiles', emitters: [[0.1, -0.7]], every: 0.5, tell: 0.8},
            flare: {kind: 'wave', reach: 720, speed: 380, width: 34, damage: 26, tell: 1.6, effect: 'heat', stall: 2.6},
        },
    },
    {
        // Eclipse: a crescent with a dark eye in a pink ring and a dome core; it jumps through the void, its eye beam turns
        // after you, it fires fans of rail lanes, and it opens a singularity that pulls you in while its dome is open
        name: 'THE ECLIPSE EYE',
        hull: 2.6,
        hint: 'ITS BEAM TURNS SLOWER THAN YOU · HIT THE DOME WHILE IT HOLDS THE SINGULARITY',
        move: {kind: 'hover', range: 560},
        gun: null,
        gap: 1,
        cycles: [
            ['eye', 'blink', 'fan', 'singularity', 'blink', 'fan'],
            ['eye_twin', 'blink', 'fan_wide', 'singularity', 'blink', 'fan_wide', 'blink'],
        ],
        phase2: {title: 'THE EYE OPENS', line: 'TWO BEAMS TURN AFTER YOU · OUTRUN THEIR TURN'},
        attacks: {
            eye: {kind: 'beam', count: 1, length: 950, width: 24, tell: 1.2, time: 2.8, track: 0.4, damage: 14, effect: 'drain'},
            eye_twin: {kind: 'beam', count: 2, length: 950, width: 24, tell: 1.2, time: 3, track: 0.4, damage: 14, effect: 'drain'},
            fan: {kind: 'lances', mode: 'fan', count: 5, spread: 0.3, tell: 0.8, weapon: 'rail'},
            fan_wide: {kind: 'lances', mode: 'fan', count: 7, spread: 0.26, tell: 0.75, weapon: 'rail'},
            blink: {kind: 'blink', tell: 0.9, range: 540},
            singularity: {kind: 'well', count: 1, tell: 1.5, life: 4.5, reach: 380, pull: 150, core: 70, damage: 18, drain: 6, stall: 4.5},
        },
    },
];

// An arcade elite's trick, by world: an attack of the same kinds, smaller, every `every` seconds, while you are within
// 750 m. Haven's bursts, Verdant's spores, Dustfall's charge, Ion Reach's and Eclipse's jumps, Obsidian's locked rail,
// Cryosphere's frost ring, Nova Forge's embers.
const elite_tricks = [
    {every: 5, attack: {kind: 'fan', emitters: [[0.6, 0]], count: 3, spread: 0.3, weapon: 'plasma', speed: 150, volleys: 2, every: 0.4, tell: 0.6}},
    {every: 6, attack: {kind: 'mines', place: 'around', count: 2, arm: 1.2, life: 7, reach: 70, trigger: 90, damage: 14, look: 'spore', tell: 0.4}},
    {every: 7, attack: {kind: 'charge', speed: 620, length: 600, width: 1.2, tell: 0.9, drop: null, stall: 0}},
    {every: 7, attack: {kind: 'blink', tell: 0.8, range: 300}},
    {every: 5, attack: {kind: 'lances', mode: 'track', emitters: [[0.6, 0]], track: 0.8, lock: 0.35, stagger: 0, weapon: 'rail'}},
    {every: 7, attack: {kind: 'wave', reach: 280, speed: 300, width: 20, damage: 14, tell: 1, effect: 'chill'}},
    {every: 6, attack: {kind: 'mines', place: 'player', count: 3, spread: 160, arm: 1.3, life: 1.3, reach: 70, damage: 16, look: 'ember', tell: 0.3}},
    {every: 7, attack: {kind: 'blink', tell: 0.8, range: 320}},
];

// The fight of each flagship and the trick of each elite, by its ship; gone with it
const boss_states = new WeakMap();

// The state of a flagship's fight or an elite's trick (the tests read its counts)
function boss_state_of(enemy)
{
    return boss_states.get(enemy) || null;
}

function boss_state_new(enemy)
{
    const flagship = enemy.type === 'boss';
    const design = flagship ? boss_designs[campaign.world] || boss_designs[0] : null;
    const out = {
        design,
        trick: flagship ? null : elite_tricks[campaign.world] || elite_tricks[0],
        phase: (flagship && (enemy.hp < enemy.max_hp*0.5)) ? 2 : 1,
        step: 0,
        attack: null,
        gap: flagship ? 2 : rand(2, 4),
        gun_cd: 2.5,
        exposed: 0,
        roar: 0,
        effects: [],
        pods: [],
        guarded: false,
        spin: 0,
        plates: 0,
        face: null,
        mv: {vx: 0, vy: 0, dir: (Math.random() < 0.5) ? -1 : 1, orbit: Math.atan2(enemy.y - player.y, enemy.x - player.x), t: 0, lunge: 0, lunge_angle: 0},
        counts: {},
    };
    boss_states.set(enemy, out);
    if (flagship && arcade.active) {
        show_toast(design.name, design.hint, 3.5, 'danger');
    }
    return out;
}

// The mode's pace between attacks: CHILL slower, OVERLOAD faster, an overdrive faster again
function boss_pace(enemy)
{
    const mode = (difficulty === 'chill') ? 0.8 : (difficulty === 'overload') ? 1.15 : 1;
    return mode*(enemy.overdrive ? 1.3 : 1);
}

// Called by update() for a flagship or an elite, with the frame's time for it and its distance to you; returns how
// fast the main loop moves it (a flagship moves itself)
function boss_update(v, dt, move, d)
{
    if (v.dev_dummy) {
        return move;
    }
    if (v.type !== 'boss') {
        return (arcade.active && v.elite && !v.unarmed) ? elite_trick_update(v, dt, move, d) : move;
    }
    const s = boss_states.get(v) || boss_state_new(v);
    // it turns as its fight has it, not as the main loop heads it
    v.angle = s.face ?? v.angle;
    boss_fight(v, s, dt);
    s.face = v.angle;
    return 0;
}

// A frame of a flagship's fight: its effects, pods and plates, the turn at half its hull, its move, then the attack it
// is in, or its gun and the next attack once the gap is over
function boss_fight(v, s, dt)
{
    const design = s.design;
    s.spin += dt*(design.move.spin || 0);
    s.exposed = Math.max(0, s.exposed - dt);
    boss_effects_update(v, s, dt);
    boss_pods_update(v, s, dt);
    boss_plates_update(v, s, dt);
    if ((s.phase === 1) && (v.hp < v.max_hp*0.5)) {
        boss_phase_two(v, s);
    }
    const busy = s.attack && boss_attack_kinds[s.attack.p.kind].moves;
    if (!busy) {
        boss_move(v, s, dt);
    }
    if (s.roar > 0) {
        s.roar -= dt;
        if (s.roar <= 0) {
            boss_summon_now(design.phase2.summon || []);
        }
        return;
    }
    if (s.attack) {
        if (boss_attack_kinds[s.attack.p.kind].tick(v, s, s.attack, dt)) {
            boss_attack_end(v, s);
        }
        return;
    }
    s.gap -= dt*boss_pace(v);
    boss_gun(v, s, dt);
    if (s.gap <= 0) {
        const cycle = design.cycles[s.phase - 1];
        const name = cycle[s.step % cycle.length];
        s.step += 1;
        boss_attack_begin(v, s, design.attacks[name], name);
    }
}

// Below half its hull: a roar (a ring, a flash, the phase's toast) while it holds still, then its second cycle
function boss_phase_two(v, s)
{
    s.phase = 2;
    s.step = 0;
    s.attack = null;
    s.roar = 1.4;
    s.gap = 0.6;
    ring(v.x, v.y, v.color || pink, 300, 0.8);
    ring(v.x, v.y, boss_tell_color, 200, 1.2);
    flash = Math.max(flash, 0.25);
    shake = Math.max(shake, 12);
    show_toast(`${s.design.name} · ${s.design.phase2.title}`, s.design.phase2.line, 3, 'danger');
    sfx('flare', 0.9, v);
}

function boss_attack_begin(v, s, p, name)
{
    s.attack = {p, name, t: 0, i: 0, n: 0, angle: 0, aims: [], lanes: [], points: [], from: null, to: null, phase: 'tell', sweep: 0};
    s.counts[name] = (s.counts[name] || 0) + 1;
    boss_attack_kinds[p.kind].begin(v, s, s.attack);
}

// An attack ends: a stall opens the hull, and the next waits for the gap
function boss_attack_end(v, s)
{
    const p = s.attack.p;
    s.attack = null;
    if (p.stall) {
        boss_expose(v, s, p.stall);
    }
    if (s.design) {
        s.gap = s.design.gap + (p.stall ? p.stall*0.6 : 0);
    }
}

// The hull exposed for a while: its shield drops, hits do more (boss_hit_factor)
function boss_expose(v, s, seconds)
{
    s.exposed = Math.max(s.exposed, seconds);
    v.shield = 0;
    label(v.x, v.y - v.r - 30, 'EXPOSED', boss_open_color);
    ring(v.x, v.y, boss_open_color, v.r*1.8, 0.5);
}

// Asked by damage_enemy for every hit on a flagship: more while it is exposed, less while pods guard its hub
function boss_hit_factor(enemy)
{
    const s = boss_states.get(enemy);
    if (!s) {
        return 1;
    }
    if (s.exposed > 0) {
        return boss_exposed_factor;
    }
    return s.guarded ? boss_guard_factor : 1;
}

// Between attacks, the flagship's gun: an aimed shot of its kind now and then
function boss_gun(v, s, dt)
{
    const gun = s.design.gun;
    if (!gun) {
        return;
    }
    s.gun_cd -= dt*boss_pace(v);
    if ((s.gun_cd <= 0) && (distance(v, player) < 950)) {
        s.gun_cd = gun.every;
        // it leads its aim as every raider does (raider_aim), at the pace of the gun it fires
        const keep = v.weapon;
        v.weapon = gun.weapon;
        const angle = raider_aim(v, player, gun.speed);
        v.weapon = keep;
        boss_shot(v, angle, gun.weapon, gun.speed, false, null);
    }
}

// A point on the hull: `ahead` along its heading and `right` across it, in units of its radius
function boss_point(v, ahead, right, turn = 0)
{
    const a = v.angle + turn;
    return {x: v.x + (Math.cos(a)*ahead - Math.sin(a)*right)*v.r, y: v.y + (Math.sin(a)*ahead + Math.cos(a)*right)*v.r};
}

// A shot of a given gun from the flagship, or from a point on its hull: the raider's own shot (enemy_fire), so it keeps
// the gun's pace (raider_shot_speed), its damage and the world's growth; pattern: a ring's slower pace
function boss_shot(v, angle, weapon, speed, pattern, from)
{
    const keep_weapon = v.weapon;
    const keep_x = v.x;
    const keep_y = v.y;
    const keep_r = v.r;
    v.weapon = weapon;
    if (from) {
        v.x = from.x;
        v.y = from.y;
        v.r = 4;
    }
    enemy_fire(v, angle, speed + ((pattern && (weapon !== 'rail') && (weapon !== 'ion')) ? wave*2 : 0), pattern);
    v.weapon = keep_weapon;
    v.x = keep_x;
    v.y = keep_y;
    v.r = keep_r;
}

// A hit from an attack that is not a shot (a beam, a burst, a wave, a well), grown as a raider's hit is
function boss_hit(v, amount, blast)
{
    damage_player(amount*raider_hit_scale(v)*(arcade.active ? arcade_mode().hits : 1), blast, 'flagship', v);
}

// Where you are now, from the hull: a drawn attack (a line, a lane, a fan's tell) points where it will fire, so it does
// not lead you; only the gun between attacks leads, as a raider's does (boss_gun)
function boss_aim(v)
{
    return Math.atan2(player.y - v.y, player.x - v.x);
}

// The flagship's way of moving, by its design
function boss_move(v, s, dt)
{
    const m = s.design.move;
    const mv = s.mv;
    const a = boss_aim(v);
    const d = distance(v, player);
    mv.t += dt;
    if (m.kind === 'orbit') {
        // round you at its range, the way it turns changing after each strafe
        mv.orbit += mv.dir*m.turn*dt;
        boss_seek(v, player.x + Math.cos(mv.orbit)*m.range, player.y + Math.sin(mv.orbit)*m.range, 1.2, dt);
        boss_face(v, a, dt, 3);
    }
    else if (m.kind === 'drift') {
        // to its range on its side of you, slowly (the current carries it besides), and a quick sideways lunge now and then
        const back = Math.atan2(v.y - player.y, v.x - player.x);
        const tx = player.x + Math.cos(back + mv.dir*0.3)*m.range;
        const ty = player.y + Math.sin(back + mv.dir*0.3)*m.range;
        const k = Math.atan2(ty - v.y, tx - v.x);
        const step = Math.min(Math.hypot(tx - v.x, ty - v.y), m.speed*dt);
        v.x += Math.cos(k)*step;
        v.y += Math.sin(k)*step;
        mv.lunge -= dt;
        if (mv.lunge <= -m.lunge) {
            mv.lunge = 0.35;
            mv.lunge_angle = a + mv.dir*Math.PI/2;
            mv.dir = -mv.dir;
        }
        if (mv.lunge > 0) {
            v.x += Math.cos(mv.lunge_angle)*360*dt;
            v.y += Math.sin(mv.lunge_angle)*360*dt;
        }
        boss_face(v, a, dt, 2);
    }
    else if ((m.kind === 'coast') || (m.kind === 'glide')) {
        // thrust toward a point at its range, beside you, and coast: it overshoots and swings round as you do here
        const side = (m.kind === 'glide') ? mv.orbit + mv.t*0.25*mv.dir : Math.atan2(v.y - player.y, v.x - player.x) + mv.dir*0.6;
        const tx = player.x + Math.cos(side)*m.range;
        const ty = player.y + Math.sin(side)*m.range;
        const k = Math.atan2(ty - v.y, tx - v.x);
        mv.vx += Math.cos(k)*m.thrust*dt;
        mv.vy += Math.sin(k)*m.thrust*dt;
        const speed = Math.hypot(mv.vx, mv.vy);
        if (speed > m.top) {
            mv.vx *= m.top/speed;
            mv.vy *= m.top/speed;
        }
        v.x += mv.vx*dt;
        v.y += mv.vy*dt;
        if (Math.random() < dt*0.15) {
            mv.dir = -mv.dir;
        }
        boss_face(v, a, dt, 1.5);
    }
    else if (m.kind === 'hold') {
        // at its range, sliding round you slowly
        const back = Math.atan2(v.y - player.y, v.x - player.x) + mv.dir*0.25*dt*4;
        boss_seek(v, player.x + Math.cos(back)*m.range, player.y + Math.sin(back)*m.range, 0.9, dt);
        boss_face(v, a, dt, 2);
    }
    else if (m.kind === 'step') {
        // still, then a heavy step toward its range every few seconds
        if (mv.lunge > 0) {
            mv.lunge -= dt;
            v.x += Math.cos(mv.lunge_angle)*(m.stride/0.45)*dt;
            v.y += Math.sin(mv.lunge_angle)*(m.stride/0.45)*dt;
            if (mv.lunge <= 0) {
                shake = Math.max(shake, 4);
                ring(v.x, v.y, v.color || pink, v.r*1.6, 0.4);
            }
        }
        else if (mv.t > m.every) {
            mv.t = 0;
            if (Math.abs(d - m.range) > 60) {
                mv.lunge = 0.45;
                mv.lunge_angle = (d > m.range) ? a : a + Math.PI;
            }
        }
        boss_face(v, a, dt, 0.8);
    }
    else if (m.kind === 'lumber') {
        // in close, slow and straight at you
        if (d > m.range) {
            v.x += Math.cos(v.angle)*m.speed*dt;
            v.y += Math.sin(v.angle)*m.speed*dt;
        }
        boss_face(v, a, dt, 0.9);
    }
    else {
        // hovers: a slow drift to its range
        if (Math.abs(d - m.range) > 80) {
            const k = (d > m.range) ? a : a + Math.PI;
            v.x += Math.cos(k)*40*dt;
            v.y += Math.sin(k)*40*dt;
        }
        boss_face(v, a, dt, 1.5);
    }
    v.x = clamp(v.x, 90, world.w - 90);
    v.y = clamp(v.y, 90, world.h - 90);
}

// Toward a point, a share of the way each second
function boss_seek(v, x, y, rate, dt)
{
    const k = Math.min(1, rate*dt);
    v.x += (clamp(x, 90, world.w - 90) - v.x)*k;
    v.y += (clamp(y, 90, world.h - 90) - v.y)*k;
}

// Turns the hull toward an angle, at most `rate` radians a second
function boss_face(v, angle, dt, rate)
{
    const delta = Math.atan2(Math.sin(angle - v.angle), Math.cos(angle - v.angle));
    v.angle += clamp(delta, -rate*dt, rate*dt);
}

// The kinds of attack: begin sets it up, tick runs it a frame and says when it is over, draw shows its tell and its
// fire. `moves`: the attack moves the ship itself.
const boss_attack_kinds = {
    // Aimed fans from points on the hull: they glow and draw their aim, then fire volleys at you
    fan: {
        begin: function (v, s, k) {
            sfx('enemy_beam', 0.5, v);
        },
        tick: function (v, s, k, dt) {
            const p = k.p;
            k.t += dt;
            if (k.t < p.tell) {
                return false;
            }
            if (k.t - p.tell >= k.n*p.every) {
                for (const e of p.emitters) {
                    const from = boss_point(v, e[0], e[1], p.spin ? s.spin : 0);
                    const a = Math.atan2(player.y - from.y, player.x - from.x);
                    for (let i = 0; i < p.count; ++i) {
                        const off = (p.count === 1) ? 0 : (i/(p.count - 1) - 0.5)*p.spread*2;
                        boss_shot(v, a + off, p.weapon, p.speed, true, from);
                    }
                }
                k.n += 1;
            }
            return k.n >= p.volleys;
        },
        draw: function (v, s, k) {
            const p = k.p;
            if (k.t >= p.tell) {
                return;
            }
            const f = k.t/p.tell;
            for (const e of p.emitters) {
                const from = boss_point(v, e[0], e[1], p.spin ? s.spin : 0);
                boss_glow(from.x, from.y, 8 + f*14, v.color || pink, 0.4 + f*0.5);
                const a = Math.atan2(player.y - from.y, player.x - from.x);
                for (const off of (p.count === 1) ? [0] : [-p.spread, p.spread]) {
                    boss_dash(from.x, from.y, from.x + Math.cos(a + off)*260, from.y + Math.sin(a + off)*260, boss_tell_color, 0.15 + f*0.5, 1.2/zoom);
                }
            }
        },
    },
    // Arms turning round the hull, each firing in turn: a spiral to weave through
    spiral: {
        begin: function (v, s, k) {
            k.angle = boss_aim(v);
        },
        tick: function (v, s, k, dt) {
            const p = k.p;
            k.t += dt;
            if (k.t < p.tell) {
                return false;
            }
            k.angle += p.turn*dt;
            if (k.t - p.tell >= k.n/p.rate) {
                for (let i = 0; i < p.arms; ++i) {
                    boss_shot(v, k.angle + (i*Math.PI*2)/p.arms, p.weapon, p.speed, true, null);
                }
                k.n += 1;
            }
            return k.t >= p.tell + p.time;
        },
        draw: function (v, s, k) {
            const p = k.p;
            if (k.t >= p.tell) {
                return;
            }
            const f = k.t/p.tell;
            boss_glow(v.x, v.y, v.r*(0.4 + f*0.5), v.color || pink, 0.25 + f*0.4);
            for (let i = 0; i < p.arms; ++i) {
                const a = k.angle + (i*Math.PI*2)/p.arms + p.turn*(k.t - p.tell)*0.3;
                boss_dash(v.x + Math.cos(a)*v.r, v.y + Math.sin(a)*v.r, v.x + Math.cos(a)*(v.r + 160), v.y + Math.sin(a)*(v.r + 160), boss_tell_color, 0.2 + f*0.5, 1.4/zoom);
            }
        },
    },
    // A ring of shots, with a gap to fly through when it has one; the gap is marked during the tell
    ring: {
        begin: function (v, s, k) {
            k.angle = boss_aim(v) + ((Math.random() < 0.5) ? -1 : 1)*rand(0.5, 1.2);
            sfx('enemy_beam', 0.6, v);
        },
        tick: function (v, s, k, dt) {
            const p = k.p;
            k.t += dt;
            if (k.t < p.tell) {
                return false;
            }
            if (k.t - p.tell >= k.n*p.every) {
                // a ring with a gap spreads its shots over the rest of the turn; one without turns half a step each time
                const twist = (k.n % 2) ? Math.PI/p.count : 0;
                for (let i = 0; i < p.count; ++i) {
                    const a = p.gap ? k.angle + p.gap/2 + ((i + 0.5)/p.count)*(Math.PI*2 - p.gap) : k.angle + twist + (i/p.count)*Math.PI*2;
                    boss_shot(v, a, p.weapon, p.speed, true, null);
                }
                k.n += 1;
                ring(v.x, v.y, v.color || pink, 90, 0.4);
            }
            return k.n >= p.rings;
        },
        draw: function (v, s, k) {
            const p = k.p;
            if (k.t >= p.tell) {
                return;
            }
            const f = k.t/p.tell;
            ctx.globalAlpha = 0.25 + f*0.5;
            ctx.strokeStyle = boss_tell_color;
            ctx.lineWidth = 2/zoom;
            ctx.setLineDash(boss_dashes(8, 8));
            ctx.beginPath();
            const r = v.r*(2.6 - f*1.2);
            if (p.gap) {
                ctx.arc(v.x, v.y, r, k.angle + p.gap/2, k.angle + Math.PI*2 - p.gap/2);
            }
            else {
                ctx.arc(v.x, v.y, r, 0, Math.PI*2);
            }
            ctx.stroke();
            ctx.setLineDash(boss_no_dash);
            if (p.gap) {
                // the gap: a bright wedge out to where the ring will pass
                ctx.globalAlpha = 0.12 + f*0.18;
                ctx.fillStyle = '#9dffb0';
                ctx.beginPath();
                ctx.moveTo(v.x, v.y);
                ctx.arc(v.x, v.y, 420, k.angle - p.gap/2, k.angle + p.gap/2);
                ctx.closePath();
                ctx.fill();
            }
        },
    },
    // A charge along a lane drawn through you: it winds up, rams through, drops bolts or dust behind, and stalls
    charge: {
        moves: true,
        begin: function (v, s, k) {
            boss_charge_aim(v, k);
            sfx('boost', 0.8, v);
        },
        tick: function (v, s, k, dt) {
            const p = k.p;
            k.t += dt;
            if (k.phase === 'tell') {
                boss_face(v, k.angle, dt, 6);
                if (k.t >= ((k.i > 0) ? 0.7 : p.tell)) {
                    k.phase = 'run';
                    k.t = 0;
                    k.sweep = 0;
                    shake = Math.max(shake, 6);
                }
                return false;
            }
            const step = p.speed*dt;
            v.x = clamp(v.x + Math.cos(k.angle)*step, 90, world.w - 90);
            v.y = clamp(v.y + Math.sin(k.angle)*step, 90, world.h - 90);
            k.sweep += step;
            if (distance(v, player) < v.r + player.r) {
                boss_hit(v, 30, false);
            }
            if (p.drop === 'bolts') {
                while (k.n*95 < k.sweep) {
                    k.n += 1;
                    boss_shot(v, k.angle + Math.PI/2, 'plasma', 95, true, null);
                    boss_shot(v, k.angle - Math.PI/2, 'plasma', 95, true, null);
                }
            }
            if (p.drop === 'dust') {
                while (k.n*110 < k.sweep) {
                    k.n += 1;
                    s.effects.push(boss_mine_new(v.x, v.y, 0, 0, {arm: 0.8, life: 0.8, reach: 75, trigger: 0, damage: 16, look: 'dust'}));
                }
            }
            const end = (k.sweep >= p.length) || (v.x <= 90) || (v.x >= world.w - 90) || (v.y <= 90) || (v.y >= world.h - 90);
            if (!end) {
                return false;
            }
            k.i += 1;
            s.mv.dir = -s.mv.dir;
            s.mv.orbit = Math.atan2(v.y - player.y, v.x - player.x);
            s.mv.vx = 0;
            s.mv.vy = 0;
            if (k.i < (p.repeat || 1)) {
                boss_charge_aim(v, k);
                k.t = 0;
                k.n = 0;
                k.phase = 'tell';
                return false;
            }
            return true;
        },
        draw: function (v, s, k) {
            const p = k.p;
            const w = v.r*p.width;
            const tell = (k.i > 0) ? 0.7 : p.tell;
            const f = (k.phase === 'tell') ? k.t/tell : 1;
            const nx = -Math.sin(k.angle)*w;
            const ny = Math.cos(k.angle)*w;
            const ex = v.x + Math.cos(k.angle)*(p.length - k.sweep);
            const ey = v.y + Math.sin(k.angle)*(p.length - k.sweep);
            ctx.globalAlpha = (k.phase === 'tell') ? 0.06 + f*0.14 : 0.08;
            ctx.fillStyle = boss_tell_color;
            ctx.beginPath();
            ctx.moveTo(v.x + nx, v.y + ny);
            ctx.lineTo(ex + nx, ey + ny);
            ctx.lineTo(ex - nx, ey - ny);
            ctx.lineTo(v.x - nx, v.y - ny);
            ctx.closePath();
            ctx.fill();
            boss_dash(v.x + nx, v.y + ny, ex + nx, ey + ny, boss_tell_color, 0.3 + f*0.5, 1.6/zoom);
            boss_dash(v.x - nx, v.y - ny, ex - nx, ey - ny, boss_tell_color, 0.3 + f*0.5, 1.6/zoom);
            if (p.spin && (k.phase === 'tell')) {
                // the saw spins up: teeth turning faster round the hull
                ctx.globalAlpha = 0.3 + f*0.5;
                ctx.strokeStyle = v.color || pink;
                ctx.lineWidth = 3/zoom;
                for (let i = 0; i < 8; ++i) {
                    const a = clock*(4 + f*18) + (i*Math.PI)/4;
                    ctx.beginPath();
                    ctx.arc(v.x, v.y, v.r*1.15, a, a + 0.3);
                    ctx.stroke();
                }
            }
        },
    },
    // Mines: thrown round the ship (they drift with a current), or bursting on circles drawn round you; each warns
    // while it arms, then bursts on you close by or at the end of its life; an ember leaves burning slag
    mines: {
        begin: function (v, s, k) {
            const p = k.p;
            for (let i = 0; i < p.count; ++i) {
                if (p.place === 'around') {
                    const a = (i/p.count)*Math.PI*2 + rand(-0.3, 0.3);
                    const speed = rand(120, 200);
                    s.effects.push(boss_mine_new(v.x + Math.cos(a)*v.r, v.y + Math.sin(a)*v.r, Math.cos(a)*speed, Math.sin(a)*speed, p));
                }
                else {
                    // the first on you, the rest round you, where you are about to be among them
                    const a = rand(0, Math.PI*2);
                    const r = (i === 0) ? 0 : rand(0.35, 1)*p.spread;
                    const ahead = (i === 0) ? 0.25 : 0;
                    s.effects.push(boss_mine_new(player.x + (player.vx || 0)*ahead + Math.cos(a)*r, player.y + (player.vy || 0)*ahead + Math.sin(a)*r, 0, 0, p));
                }
            }
            sfx('mine', 0.7, v);
        },
        tick: function (v, s, k, dt) {
            k.t += dt;
            return k.t >= k.p.tell;
        },
        draw: function () {},
    },
    // Beams from the hull: drawn as thin lines while they charge, then lit and sweeping a set arc, or turning after you
    // at a set rate; a cone is a flame. Touching one hurts, and drains your pulse or heats your guns by its kind
    beam: {
        begin: function (v, s, k) {
            const p = k.p;
            k.angle = boss_aim(v);
            k.dir = (Math.random() < 0.5) ? -1 : 1;
            // a sweep starts on one side of you and crosses you
            if (p.sweep) {
                k.angle -= k.dir*p.sweep*((p.count >= 4) ? 0.3 : 0.5);
            }
            sfx('enemy_beam', 0.9, v);
        },
        tick: function (v, s, k, dt) {
            const p = k.p;
            k.t += dt;
            if (k.t < p.tell) {
                if (p.track) {
                    k.angle = boss_turn_to(k.angle, boss_aim(v), p.track*2*dt);
                }
                return false;
            }
            if (k.phase === 'tell') {
                k.phase = 'fire';
                shake = Math.max(shake, 5);
                sfx((p.effect === 'heat') ? 'flare' : 'storm', 0.8, v);
            }
            if (p.sweep) {
                k.angle += k.dir*(p.sweep/p.time)*dt;
            }
            else {
                k.angle = boss_turn_to(k.angle, boss_aim(v), p.track*dt);
            }
            for (let i = 0; i < p.count; ++i) {
                if (boss_beam_touches(v, k.angle + (i*Math.PI*2)/p.count, p)) {
                    boss_hit(v, p.damage, false);
                    if (p.effect === 'drain') {
                        player.energy = Math.max(0, player.energy - 30*dt);
                    }
                    if (p.effect === 'heat') {
                        player.heat = clamp((player.heat || 0) + 25*dt, 0, 100);
                        if (player.heat >= 100) {
                            player.overheated = true;
                        }
                    }
                }
            }
            return k.t >= p.tell + p.time;
        },
        draw: function (v, s, k) {
            const p = k.p;
            const lit = k.t >= p.tell;
            const f = lit ? 1 : k.t/p.tell;
            for (let i = 0; i < p.count; ++i) {
                const a = k.angle + (i*Math.PI*2)/p.count;
                const x0 = v.x + Math.cos(a)*v.r*0.6;
                const y0 = v.y + Math.sin(a)*v.r*0.6;
                if (p.cone) {
                    ctx.globalAlpha = lit ? 0.35 + Math.sin(clock*40)*0.06 : 0.06 + f*0.12;
                    ctx.fillStyle = lit ? '#ff8a3d' : boss_tell_color;
                    ctx.beginPath();
                    ctx.moveTo(x0, y0);
                    ctx.arc(x0, y0, p.length, a - p.cone, a + p.cone);
                    ctx.closePath();
                    ctx.fill();
                    if (lit) {
                        ctx.globalAlpha = 0.5;
                        ctx.fillStyle = '#ffe1a8';
                        ctx.beginPath();
                        ctx.moveTo(x0, y0);
                        ctx.arc(x0, y0, p.length*0.6, a - p.cone*0.45, a + p.cone*0.45);
                        ctx.closePath();
                        ctx.fill();
                    }
                    else {
                        boss_dash(x0, y0, x0 + Math.cos(a - p.cone)*p.length, y0 + Math.sin(a - p.cone)*p.length, boss_tell_color, 0.3 + f*0.5, 1.4/zoom);
                        boss_dash(x0, y0, x0 + Math.cos(a + p.cone)*p.length, y0 + Math.sin(a + p.cone)*p.length, boss_tell_color, 0.3 + f*0.5, 1.4/zoom);
                    }
                    continue;
                }
                const x1 = v.x + Math.cos(a)*p.length;
                const y1 = v.y + Math.sin(a)*p.length;
                if (!lit) {
                    boss_dash(x0, y0, x1, y1, boss_tell_color, 0.25 + f*0.6, (1 + f*1.5)/zoom);
                    continue;
                }
                ctx.lineCap = 'round';
                ctx.globalAlpha = 0.3;
                ctx.strokeStyle = v.color || pink;
                ctx.lineWidth = p.width*1.8;
                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y1);
                ctx.stroke();
                ctx.globalAlpha = 0.85;
                ctx.lineWidth = p.width*0.7;
                ctx.stroke();
                ctx.globalAlpha = 0.9;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = p.width*0.25 + Math.sin(clock*50)*1.5;
                ctx.stroke();
                ctx.lineCap = 'butt';
            }
        },
    },
    // Rail sights: lines that track you, lock (they stop and brighten), then fire a slug along them; a fan of fixed
    // lines; or a row of parallel lanes across you with gaps between
    lances: {
        moves: true,
        begin: function (v, s, k) {
            const p = k.p;
            const a = boss_aim(v);
            if (p.mode === 'fan') {
                for (let i = 0; i < p.count; ++i) {
                    k.aims.push({from: null, angle: a + (i - (p.count - 1)/2)*p.spread, fired: false, at: p.tell});
                }
            }
            else if (p.mode === 'lanes') {
                k.angle = a;
                boss_lanes_set(v, k);
            }
            else {
                for (let i = 0; i < p.emitters.length; ++i) {
                    k.aims.push({from: p.emitters[i], angle: a, fired: false, at: p.track + p.lock + i*p.stagger});
                }
            }
            sfx('enemy_beam', 0.6, v);
        },
        tick: function (v, s, k, dt) {
            const p = k.p;
            k.t += dt;
            if (p.mode === 'lanes') {
                boss_face(v, k.angle + Math.PI/2, dt, 3);
                if (k.t < p.tell) {
                    return false;
                }
                for (const lane of k.lanes) {
                    boss_shot(v, k.angle, p.weapon, 210, false, lane);
                }
                k.n += 1;
                shake = Math.max(shake, 7);
                if (k.n < (p.volleys || 1)) {
                    // the second volley: the lanes move half a gap, so the gaps of the first are hit
                    k.t = p.tell - 0.7;
                    boss_lanes_set(v, k, 0.5);
                    return false;
                }
                return true;
            }
            let left = 0;
            for (const aim of k.aims) {
                if (aim.fired) {
                    continue;
                }
                left += 1;
                const from = aim.from ? boss_point(v, aim.from[0], aim.from[1]) : v;
                if ((p.mode === 'track') && (k.t < aim.at - p.lock)) {
                    aim.angle = Math.atan2(player.y - from.y, player.x - from.x);
                }
                if (k.t >= aim.at) {
                    aim.fired = true;
                    boss_shot(v, aim.angle, p.weapon, 210, false, aim.from ? from : null);
                }
            }
            return left === 0;
        },
        draw: function (v, s, k) {
            const p = k.p;
            if (p.mode === 'lanes') {
                const f = Math.min(1, k.t/p.tell);
                for (const lane of k.lanes) {
                    boss_dash(lane.x, lane.y, lane.x + Math.cos(k.angle)*1400, lane.y + Math.sin(k.angle)*1400, boss_tell_color, 0.2 + f*0.6, (1 + f*1.6)/zoom);
                }
                return;
            }
            for (const aim of k.aims) {
                if (aim.fired) {
                    continue;
                }
                const from = aim.from ? boss_point(v, aim.from[0], aim.from[1]) : v;
                const locked = (p.mode === 'fan') || (k.t >= aim.at - p.lock);
                const f = clamp(k.t/aim.at, 0, 1);
                const l = 1300;
                if (locked) {
                    ctx.globalAlpha = 0.35 + f*0.5;
                    ctx.strokeStyle = (p.mode === 'fan') ? boss_tell_color : '#ff4d5e';
                    ctx.lineWidth = (1.2 + f*1.4)/zoom;
                    ctx.beginPath();
                    ctx.moveTo(from.x, from.y);
                    ctx.lineTo(from.x + Math.cos(aim.angle)*l, from.y + Math.sin(aim.angle)*l);
                    ctx.stroke();
                }
                else {
                    boss_dash(from.x, from.y, from.x + Math.cos(aim.angle)*l, from.y + Math.sin(aim.angle)*l, '#ff4d5e', 0.2 + f*0.4, 1/zoom);
                }
            }
        },
    },
    // A ring that runs out from the hull to its reach, hurting where its front passes you: a frost nova slows you, a
    // flare heats your guns. The reach is drawn while it gathers
    wave: {
        begin: function (v, s, k) {
            sfx('enemy_beam', 0.8, v);
        },
        tick: function (v, s, k, dt) {
            const p = k.p;
            k.t += dt;
            if (k.t < p.tell) {
                return false;
            }
            s.effects.push({kind: 'wave', x: v.x, y: v.y, r: v.r, t: 0, life: (p.reach - v.r)/p.speed, p, hit: false, color: v.color || pink});
            sfx((p.effect === 'heat') ? 'flare' : 'pulse', 0.9, v);
            shake = Math.max(shake, 8);
            return true;
        },
        draw: function (v, s, k) {
            const p = k.p;
            const f = Math.min(1, k.t/p.tell);
            boss_glow(v.x, v.y, v.r*(0.8 + f*0.9), (p.effect === 'heat') ? '#ffe1a8' : '#dff8ff', 0.2 + f*0.5);
            ctx.globalAlpha = 0.2 + f*0.45;
            ctx.strokeStyle = boss_tell_color;
            ctx.lineWidth = 1.6/zoom;
            ctx.setLineDash(boss_dashes(10, 10));
            ctx.beginPath();
            ctx.arc(v.x, v.y, p.reach, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash(boss_no_dash);
            // the front's way out, as far as it has gathered
            ctx.globalAlpha = 0.25 + f*0.3;
            ctx.beginPath();
            ctx.arc(v.x, v.y, v.r + (p.reach - v.r)*f, 0, Math.PI*2);
            ctx.stroke();
        },
    },
    // Gravity wells under you: a swirl gathers, then pulls you to its core, which hurts; one that channels holds the
    // flagship still with its hull exposed
    well: {
        begin: function (v, s, k) {
            for (let i = 0; i < k.p.count; ++i) {
                const a = rand(0, Math.PI*2);
                const r = (i === 0) ? 40 : 260;
                k.points.push({x: clamp(player.x + Math.cos(a)*r, 60, world.w - 60), y: clamp(player.y + Math.sin(a)*r, 60, world.h - 60)});
            }
            sfx('gravity', 0.9, v);
        },
        tick: function (v, s, k, dt) {
            const p = k.p;
            k.t += dt;
            if (k.t < p.tell) {
                return false;
            }
            // one that stalls holds the singularity open: its dome open for as long as the well lasts (boss_attack_end)
            for (const point of k.points) {
                s.effects.push({kind: 'well', x: point.x, y: point.y, t: 0, life: p.life, p, color: v.color || pink});
            }
            return true;
        },
        draw: function (v, s, k) {
            const p = k.p;
            const f = Math.min(1, k.t/p.tell);
            for (const point of k.points) {
                boss_swirl(point.x, point.y, p.reach*(1.2 - f*0.2), boss_tell_color, 0.2 + f*0.5, f);
            }
        },
    },
    // Raiders called in: warp marks where they will come, then they come
    summon: {
        begin: function (v, s, k) {
            for (let i = 0; i < k.p.types.length; ++i) {
                const a = boss_aim(v) + Math.PI + (i - (k.p.types.length - 1)/2)*0.7;
                k.points.push({x: clamp(v.x + Math.cos(a)*(v.r + 70), 60, world.w - 60), y: clamp(v.y + Math.sin(a)*(v.r + 70), 60, world.h - 60)});
            }
            sfx('portal', 0.8, v);
        },
        tick: function (v, s, k, dt) {
            k.t += dt;
            if (k.t < k.p.tell) {
                return false;
            }
            for (let i = 0; i < k.p.types.length; ++i) {
                if (enemies.length < 22) {
                    boss_summon_one(k.p.types[i], k.points[i].x, k.points[i].y);
                }
            }
            return true;
        },
        draw: function (v, s, k) {
            const f = Math.min(1, k.t/k.p.tell);
            if (k.p.eyes) {
                // its eyes burn before it hatches
                boss_glow(boss_point(v, 0.75, -0.25).x, boss_point(v, 0.75, -0.25).y, 6 + f*12, '#ff4d5e', 0.5 + f*0.5);
                boss_glow(boss_point(v, 0.75, 0.25).x, boss_point(v, 0.75, 0.25).y, 6 + f*12, '#ff4d5e', 0.5 + f*0.5);
            }
            for (const point of k.points) {
                boss_swirl(point.x, point.y, 34 - f*16, v.color || pink, 0.3 + f*0.5, f);
            }
        },
    },
    // Missiles from the hatches, one after another: the hatches glow first
    missiles: {
        begin: function (v, s, k) {
            sfx('enemy_missile', 0.6, v);
        },
        tick: function (v, s, k, dt) {
            const p = k.p;
            k.t += dt;
            if (k.t < p.tell) {
                return false;
            }
            if (k.t - p.tell >= k.n*p.every) {
                const e = p.emitters[k.n];
                const from = boss_point(v, e[0], e[1]);
                // out to the hatch's side first; it turns for you as it flies
                const side = Math.atan2(from.y - v.y, from.x - v.x);
                boss_shot(v, side, 'missile', 210, false, from);
                k.n += 1;
            }
            return k.n >= p.emitters.length;
        },
        draw: function (v, s, k) {
            const p = k.p;
            const f = Math.min(1, k.t/p.tell);
            for (let i = k.n; i < p.emitters.length; ++i) {
                const from = boss_point(v, p.emitters[i][0], p.emitters[i][1]);
                boss_glow(from.x, from.y, 6 + f*10, '#ffb27a', 0.35 + f*0.55);
            }
        },
    },
    // A jump through the void: a ring marks where it will come out, the hull fades, and it is there
    blink: {
        moves: true,
        begin: function (v, s, k) {
            const p = k.p;
            const from = Math.atan2(v.y - player.y, v.x - player.x);
            const a = from + ((Math.random() < 0.5) ? -1 : 1)*rand(1.3, 2.4);
            k.to = {x: clamp(player.x + Math.cos(a)*p.range, 90, world.w - 90), y: clamp(player.y + Math.sin(a)*p.range, 90, world.h - 90)};
            sfx('portal', 0.8, v);
        },
        tick: function (v, s, k, dt) {
            k.t += dt;
            if (k.t < k.p.tell) {
                return false;
            }
            explode(v.x, v.y, v.r*0.6, '#a8e4ff', 0, 'warp');
            v.x = k.to.x;
            v.y = k.to.y;
            v.angle = boss_aim(v);
            explode(v.x, v.y, v.r*0.6, '#a8e4ff', 0, 'warp');
            ring(v.x, v.y, v.color || pink, v.r*2, 0.5);
            s.mv.orbit = Math.atan2(v.y - player.y, v.x - player.x);
            return true;
        },
        draw: function (v, s, k) {
            const f = Math.min(1, k.t/k.p.tell);
            boss_swirl(k.to.x, k.to.y, v.r*(1.6 - f*0.6), v.color || pink, 0.3 + f*0.6, f);
            ctx.globalAlpha = 0.5*(1 - f) + 0.1;
            ctx.fillStyle = '#05060c';
            ctx.beginPath();
            ctx.arc(k.to.x, k.to.y, v.r*0.5*f, 0, Math.PI*2);
            ctx.fill();
        },
    },
    // Pods launched from the hull: raiders that turn round it, linked to the hub, which takes a third of a hit while
    // any of them flies; the last one down opens the hub
    pods: {
        begin: function (v, s, k) {
            sfx('storm', 0.8, v);
        },
        tick: function (v, s, k, dt) {
            const p = k.p;
            k.t += dt;
            if (k.t < p.tell) {
                return false;
            }
            s.pods = s.pods.filter(v => v.hp > 0);
            for (let i = s.pods.length; i < p.count; ++i) {
                const pod = boss_summon_one('shooter', v.x, v.y);
                pod.r = 15;
                // the pods fire in turn, not as one
                pod.fire_cd = 1.2 + i*0.7;
                s.pods.push(pod);
            }
            s.guarded = true;
            return true;
        },
        draw: function (v, s, k) {
            const f = Math.min(1, k.t/k.p.tell);
            for (let i = 0; i < k.p.count; ++i) {
                const a = s.spin + (i*Math.PI)/2;
                boss_glow(v.x + Math.cos(a)*v.r*0.8, v.y + Math.sin(a)*v.r*0.8, 6 + f*12, '#8d9cff', 0.4 + f*0.5);
            }
        },
    },
};

// The charge's lane: from the hull through you, on to its length
function boss_charge_aim(v, k)
{
    k.angle = boss_aim(v);
    k.sweep = 0;
}

// The lanes of a broadside: parallel, `spacing` apart across the line to you, you between two of them (shifted by
// `half` a gap for a second volley)
function boss_lanes_set(v, k, half = 0)
{
    const p = k.p;
    const nx = -Math.sin(k.angle);
    const ny = Math.cos(k.angle);
    const offset = rand(0.3, 0.7) + half;
    k.lanes = [];
    for (let i = 0; i < p.count; ++i) {
        const side = (i - p.count/2 + offset)*p.spacing;
        k.lanes.push({x: v.x - Math.cos(k.angle)*80 + nx*side, y: v.y - Math.sin(k.angle)*80 + ny*side});
    }
}

// Whether a beam at this angle touches you: along its line within its width, or inside its cone
function boss_beam_touches(v, angle, p)
{
    const x0 = v.x + Math.cos(angle)*v.r*0.6;
    const y0 = v.y + Math.sin(angle)*v.r*0.6;
    const d = Math.hypot(player.x - x0, player.y - y0);
    if (p.cone) {
        const off = Math.atan2(player.y - y0, player.x - x0) - angle;
        return (d < p.length + player.r) && (Math.abs(Math.atan2(Math.sin(off), Math.cos(off))) < p.cone + player.r/Math.max(d, 1));
    }
    return segment_distance(player, {x: x0, y: y0}, {x: v.x + Math.cos(angle)*p.length, y: v.y + Math.sin(angle)*p.length}) < p.width/2 + player.r;
}

// An angle turned toward another, at most `step` radians
function boss_turn_to(angle, to, step)
{
    const delta = Math.atan2(Math.sin(to - angle), Math.cos(to - angle));
    return angle + clamp(delta, -step, step);
}

function boss_mine_new(x, y, vx, vy, p)
{
    return {kind: 'mine', x, y, vx, vy, t: 0, arm: p.arm, life: p.life, reach: p.reach, trigger: p.trigger || 0, damage: p.damage, look: p.look, pool: p.pool || 0, fuse: -1};
}

// Mines, waves, wells and slag live on after the attack that made them, while the flagship lives
function boss_effects_update(v, s, dt)
{
    if (!s.effects.length) {
        return;
    }
    for (const e of s.effects) {
        e.t += dt;
        if (e.kind === 'mine') {
            boss_mine_update(v, s, e, dt);
        }
        else if (e.kind === 'pool') {
            if (distance(e, player) < e.reach + player.r) {
                boss_hit(v, 6, false);
                player.heat = clamp((player.heat || 0) + 15*dt, 0, 100);
            }
        }
        else if (e.kind === 'wave') {
            const r = e.r + e.p.speed*e.t;
            const d = distance(e, player);
            if (!e.hit && (Math.abs(d - r) < e.p.width/2 + player.r)) {
                e.hit = true;
                boss_hit(v, e.p.damage, false);
                if (e.p.effect === 'chill') {
                    player.vx *= 0.3;
                    player.vy *= 0.3;
                    label(player.x, player.y - 30, 'CHILLED', '#8be9ff');
                }
                if (e.p.effect === 'heat') {
                    player.heat = clamp((player.heat || 0) + 20, 0, 100);
                }
            }
        }
        else if (e.kind === 'well') {
            const d = distance(e, player);
            if (d < e.p.reach) {
                // the pull: stronger nearer the core
                const k = e.p.pull*(0.5 + 0.5*(1 - d/e.p.reach))*dt;
                player.x += ((e.x - player.x)/Math.max(d, 1))*Math.min(k, d);
                player.y += ((e.y - player.y)/Math.max(d, 1))*Math.min(k, d);
                if (e.p.drain) {
                    player.energy = Math.max(0, player.energy - e.p.drain*dt);
                }
            }
            if (d < e.p.core + player.r) {
                boss_hit(v, e.p.damage, true);
            }
        }
    }
    if (s.effects.some(v => v.t >= v.life)) {
        s.effects = s.effects.filter(v => v.t < v.life);
    }
}

function boss_mine_update(v, s, e, dt)
{
    e.x += e.vx*dt;
    e.y += e.vy*dt;
    const slow = Math.exp(-2.4*dt);
    e.vx *= slow;
    e.vy *= slow;
    // a spore rides the current
    const flow = world_flow(e);
    e.x += flow.x*dt*0.9;
    e.y += flow.y*dt*0.9;
    if ((e.fuse < 0) && e.trigger && (e.t > e.arm) && (distance(e, player) < e.trigger)) {
        e.fuse = 0.3;
        e.life = e.t + e.fuse;
    }
    if (e.t + dt >= e.life) {
        explode(e.x, e.y, e.reach*0.6, boss_mine_color(e.look));
        if (distance(e, player) < e.reach + player.r) {
            boss_hit(v, e.damage, true);
        }
        if (e.pool) {
            s.effects.push({kind: 'pool', x: e.x, y: e.y, t: 0, life: e.pool, reach: e.reach*0.85});
        }
    }
}

function boss_mine_color(look)
{
    return {spore: '#9dff9b', ember: '#ff8a3d', ice: '#8be9ff', dust: '#e4c98a'}[look] || pink;
}

// The pods turn round the hub while it lives; with the last of them down, the hub opens
function boss_pods_update(v, s, dt)
{
    if (!s.pods.length) {
        return;
    }
    const alive = s.pods.filter(v => v.hp > 0);
    for (let i = 0; i < alive.length; ++i) {
        const a = s.spin*1.3 + (i*Math.PI*2)/alive.length;
        alive[i].x = v.x + Math.cos(a)*150;
        alive[i].y = v.y + Math.sin(a)*150;
    }
    if (!alive.length) {
        s.pods = [];
        s.guarded = false;
        boss_expose(v, s, 3);
        show_toast('HUB OPEN', 'THE PODS ARE DOWN · HIT IT NOW', 2, 'danger');
    }
}

// Cryosphere's ice plates: arcs round the hull that stop your shots; drawn in while the hull is exposed
function boss_plates_update(v, s, dt)
{
    const all = s.design.plates;
    if (!all) {
        return;
    }
    const plates = all[s.phase - 1];
    s.plates += plates.turn*dt;
    if (s.exposed > 0) {
        return;
    }
    const r = v.r + 34;
    for (let i = 0, end = bullets.length; i < end; ++i) {
        const b = bullets[i];
        if ((b.life <= 0) || (Math.abs(b.x - v.x) > r + 60) || (Math.abs(b.y - v.y) > r + 60)) {
            continue;
        }
        const now = distance(b, v);
        const next = Math.hypot(b.x + b.vx*dt - v.x, b.y + b.vy*dt - v.y);
        if ((now < r - 6) || (next > r)) {
            continue;
        }
        const a = Math.atan2(b.y + b.vy*dt - v.y, b.x + b.vx*dt - v.x) - s.plates;
        const slot = Math.floor((((a % (Math.PI*2)) + Math.PI*2) % (Math.PI*2))/(Math.PI*2/plates.count));
        if (slot < plates.filled) {
            b.life = 0;
            explode(b.x, b.y, 8, '#dff8ff', 0, 'spark');
            if (b.missile) {
                missile_detonate(b);
            }
        }
    }
}

// Raiders a flagship calls: they warp in and fight as their kind does
function boss_summon_now(types)
{
    for (const type of types) {
        const a = rand(0, Math.PI*2);
        boss_summon_one(type, player.x + Math.cos(a)*560, player.y + Math.sin(a)*560);
    }
}

function boss_summon_one(type, x, y)
{
    const enemy = spawn_enemy(type);
    enemy.x = clamp(x, 40, world.w - 40);
    enemy.y = clamp(y, 40, world.h - 40);
    ring(enemy.x, enemy.y, enemy.color || pink, 40, 0.4);
    explode(enemy.x, enemy.y, 26, '#a8e4ff', 0, 'warp');
    return enemy;
}

// An arcade elite's trick (elite_tricks): every few seconds while you are near, an attack of the boss kinds; it holds
// still for the tell, and a charge or a jump moves it
function elite_trick_update(v, dt, move, d)
{
    const s = boss_states.get(v) || boss_state_new(v);
    boss_effects_update(v, s, dt);
    if (s.attack) {
        const kind = boss_attack_kinds[s.attack.p.kind];
        if (kind.moves && (s.face !== null)) {
            v.angle = s.face;
        }
        if (kind.tick(v, s, s.attack, dt)) {
            boss_attack_end(v, s);
            s.gap = s.trick.every;
        }
        s.face = v.angle;
        return kind.moves ? 0 : move*0.2;
    }
    s.gap -= dt;
    if ((s.gap <= 0) && (d < 750)) {
        s.face = v.angle;
        boss_attack_begin(v, s, s.trick.attack, 'trick');
        return 0;
    }
    return move;
}

// Called by render() under the hulls: every flagship's and elite's tells, beams, mines, waves and wells, the pods'
// links, the plates, and EXPOSED over a hull that is
function boss_render()
{
    for (const v of enemies) {
        if (v.hp <= 0) {
            continue;
        }
        const s = boss_states.get(v);
        if (!s) {
            continue;
        }
        ctx.save();
        for (const e of s.effects) {
            boss_effect_draw(e);
        }
        if (s.attack && in_view(v, 1500)) {
            boss_attack_kinds[s.attack.p.kind].draw(v, s, s.attack);
        }
        ctx.globalAlpha = 1;
        if (s.design) {
            boss_hull_draw(v, s);
        }
        ctx.restore();
    }
}

function boss_hull_draw(v, s)
{
    if (s.design.plates && (s.exposed <= 0)) {
        const plates = s.design.plates[s.phase - 1];
        const slot = (Math.PI*2)/plates.count;
        ctx.strokeStyle = '#dff8ff';
        ctx.lineWidth = 7;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        for (let i = 0; i < plates.filled; ++i) {
            const a = s.plates + i*slot;
            ctx.moveTo(v.x + Math.cos(a + 0.06)*(v.r + 34), v.y + Math.sin(a + 0.06)*(v.r + 34));
            ctx.arc(v.x, v.y, v.r + 34, a + 0.06, a + slot - 0.06);
        }
        ctx.stroke();
        ctx.strokeStyle = '#8be9ff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    if (s.guarded) {
        ctx.strokeStyle = '#8d9cff';
        ctx.lineWidth = 2/zoom;
        ctx.globalAlpha = 0.45 + Math.sin(clock*30)*0.2;
        ctx.beginPath();
        for (const pod of s.pods) {
            if (pod.hp > 0) {
                ctx.moveTo(v.x, v.y);
                ctx.lineTo(pod.x, pod.y);
            }
        }
        ctx.stroke();
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(v.x, v.y, v.r + 12, 0, Math.PI*2);
        ctx.stroke();
    }
    if (s.roar > 0) {
        boss_glow(v.x, v.y, v.r*(1.2 + (1.4 - s.roar)*0.5), v.color || pink, 0.5);
    }
    if (s.exposed > 0) {
        ctx.globalAlpha = 0.5 + Math.sin(clock*12)*0.3;
        ctx.strokeStyle = boss_open_color;
        ctx.lineWidth = 3/zoom;
        ctx.setLineDash(boss_dashes(6, 6));
        ctx.beginPath();
        ctx.arc(v.x, v.y, v.r*1.25, clock, clock + Math.PI*2);
        ctx.stroke();
        ctx.setLineDash(boss_no_dash);
        ctx.globalAlpha = 0.9;
        ctx.font = `bold ${Math.round(12/zoom)}px ui-monospace,monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = boss_open_color;
        ctx.fillText(`EXPOSED · ${s.exposed.toFixed(1)} S`, v.x, v.y - v.r*1.6);
    }
}

function boss_effect_draw(e)
{
    if (!in_view(e, 400)) {
        return;
    }
    if (e.kind === 'mine') {
        const color = boss_mine_color(e.look);
        const armed = e.t >= e.arm;
        const f = clamp(e.t/Math.max(e.arm, 0.01), 0, 1);
        // the reach it bursts in, closing in as it arms; then its body pulsing
        ctx.globalAlpha = armed ? 0.16 : 0.06 + f*0.12;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.reach, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 0.5 + f*0.4;
        ctx.strokeStyle = (e.fuse >= 0) ? '#ffffff' : color;
        ctx.lineWidth = 1.6/zoom;
        ctx.setLineDash(armed ? boss_no_dash : boss_dashes(6, 6));
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.reach, 0, Math.PI*2);
        ctx.stroke();
        ctx.setLineDash(boss_no_dash);
        if (!armed || (e.life - e.t < 1)) {
            ctx.beginPath();
            ctx.arc(e.x, e.y, Math.max(2, e.reach*(armed ? (e.life - e.t) : 1 - f)), 0, Math.PI*2);
            ctx.stroke();
        }
        boss_glow(e.x, e.y, 7 + Math.sin(clock*10 + e.x)*2, color, 0.9);
        return;
    }
    if (e.kind === 'pool') {
        ctx.globalAlpha = 0.25*(1 - e.t/e.life) + 0.1;
        ctx.fillStyle = '#ff6a2a';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.reach, 0, Math.PI*2);
        ctx.fill();
        return;
    }
    if (e.kind === 'wave') {
        const r = e.r + e.p.speed*e.t;
        ctx.globalAlpha = 0.65*(1 - e.t/e.life) + 0.2;
        ctx.strokeStyle = (e.p.effect === 'heat') ? '#ffb27a' : '#dff8ff';
        ctx.lineWidth = e.p.width;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI*2);
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
    }
    if (e.kind === 'well') {
        boss_swirl(e.x, e.y, e.p.reach, e.color, 0.55*Math.min(1, (e.life - e.t)*2), 1);
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#05060c';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.p.core, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 3/zoom;
        ctx.stroke();
    }
}

// The dash patterns of the tells, in screen pixels at the zoom they were made for: made again only when it changes,
// not each frame
const boss_no_dash = [];
const boss_dash_cache = {zoom: 0, patterns: new Map()};

function boss_dashes(on, off)
{
    if (boss_dash_cache.zoom !== zoom) {
        boss_dash_cache.zoom = zoom;
        boss_dash_cache.patterns.clear();
    }
    const key = on*100 + off;
    let out = boss_dash_cache.patterns.get(key);
    if (!out) {
        out = [on/zoom, off/zoom];
        boss_dash_cache.patterns.set(key, out);
    }
    return out;
}

// A dashed line
function boss_dash(x0, y0, x1, y1, color, alpha, width)
{
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(boss_dashes(10, 8));
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.setLineDash(boss_no_dash);
}

// A soft glowing dot
function boss_glow(x, y, r, color, alpha)
{
    ctx.globalAlpha = alpha*0.35;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, r*0.45, 0, Math.PI*2);
    ctx.fill();
}

// A swirl of turning arcs closing on a point: a well, a summons, a jump's way out
function boss_swirl(x, y, r, color, alpha, f)
{
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2/zoom;
    for (let i = 0; i < 3; ++i) {
        const rr = r*(1 - i*0.28);
        const a = clock*(1.5 + i) + i*2;
        ctx.beginPath();
        ctx.arc(x, y, rr, a, a + 1.2 + f*1.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, rr, a + Math.PI, a + Math.PI + 1.2 + f*1.5);
        ctx.stroke();
    }
}
