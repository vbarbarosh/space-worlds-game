// The arcade's flagships, each a fight with its own way to win (the campaign's keep the fight of boss_designs as it
// is). One entry a world in boss_duels, Haven to Eclipse: its kind, the line said as the fight begins, what it changes
// in the world's design (the cycles, an attack, the second half), its hull factor (arcade_flagship_spawn) and the
// moments it calls escorts (arcade_flagship_update):
// - Haven, the chase: the Crescent runs for a gate; each third of its hull lost sputters its engine. At the gate it
//   gets away: the wave goes on without it and its bounty is lost.
// - Verdant, the nests: nests round the Beetle hold a shield over it while they stand: no hit gets through it; at
//   half its hull it sows new ones, and the shield rises again as they grow.
// - Dustfall, the joust: the Sawtooth's blade turns most of a shot; a charge that ends on a rock stuns it, hull open.
// - Ion Reach, the shell: a shell with two gaps turns round the Wheel's core and stops your shots; lit lanes show the
//   gaps, and its arcs light up all round it but in the gaps.
// - Obsidian, the siege: the Stair stands still, turning to you; armour round it stops your shots but at one weak
//   point; each holds a quarter of its hull, and the next opens on another side: its stern, a flank, the other flank,
//   and last its bow, before its guns.
// - Cryosphere, the glow: ice turns your shots; the Crystal is hurt as it glows: after its spiral, while it gathers its
//   nova and after it.
// - Nova Forge, the arena: a ring of fire round the fight closes in as the Furnace heats; outside it burns.
// - Eclipse, the edge: the Eye keeps to the black hole's edge; its dome opens only while you are at the edge too, and
//   it makes the hole pull harder for a while, its dome wide open.
// Hooks: boss_state_new asks boss_duel_new, boss_fight runs boss_duel_frame and boss_duel_move, boss_update
// boss_duel_after, boss_hit_factor boss_duel_factor, boss_hull_draw boss_duel_draw; the arcade asks boss_duel_hull,
// boss_duel_escorts and boss_duel_watch; the auto-aim boss_duel_aim; the HUD's card boss_duel_card and
// boss_duel_marker; the bots boss_duel_pilot.

// a shot that glances off: the share of it that gets through, and the share while the hull is open
const boss_duel_glance = 0.15;
// the colours: what can be hurt now, the nests and their shield, a part to break
const boss_duel_open_color = '#fff3b0';
const boss_duel_nest_color = '#9dff9b';
const boss_duel_steel_color = '#9aa3b5';
// the Beetle's shield round it, as times its hit radius: wide enough to hold its drawn spikes
const boss_duel_nest_shield_k = 2.3;

const boss_duels = [
    {
        kind: 'chase',
        line: 'IT RUNS FOR A GATE · STOP IT BEFORE IT GETS THERE',
        hull: 1,
        escorts: [0.5, 0],
        // the seconds it needs to reach its gate unhurt, by mode (CHILL, NORMAL, OVERLOAD)
        run: [62, 46, 40],
        // a runner fires less than a fighter: a longer gap, its fans in its first half, one ring after (its ring, close
        // behind it, was the most of what hurt a chaser); with the gap of the campaign's Crescent and three fans
        // first, the bot lost two of six runs in Haven (bin/playtest, NORMAL)
        gap: 2,
        cycles: [
            ['fan', 'fan'],
            ['fan_wide', 'crescent', 'fan'],
        ],
        attacks: {
            crescent: {kind: 'ring', count: 18, gap: 1.2, weapon: 'plasma', speed: 125, rings: 2, every: 0.6, tell: 0.8, stall: 1.6},
        },
    },
    {
        kind: 'nests',
        line: 'NESTS SHIELD IT · BREAK THE NESTS, THEN THE BEETLE',
        hull: 1,
        escorts: [0.5, 0],
        // nests at the start and sown at half its hull, by mode; while one stands grown, the shield holds
        nests: [2, 3, 3],
        sown: [1, 2, 2],
        phase2: {title: 'THE BROOD WAKES', line: 'NEW NESTS SPROUT · ITS EYES BURN BEFORE IT HATCHES'},
    },
    {
        kind: 'joust',
        line: 'ITS BLADE TURNS YOUR SHOTS · DODGE ITS CHARGE INTO A ROCK',
        hull: 0.7,
        escorts: [0.4, 0],
        // how long a ram stuns it, by mode, and the share of a shot its blade lets through
        stun: [4.5, 3.6, 3.2],
        blade: 0.5,
        cycles: [
            ['saw', 'hatch', 'saw', 'flak'],
            ['saw_twice', 'hatch_more', 'saw', 'flak'],
        ],
        attacks: {
            saw: {kind: 'charge', speed: 900, length: 1700, width: 1.4, tell: 1.3, drop: 'dust', stall: 0, spin: true},
            saw_twice: {kind: 'charge', speed: 900, length: 1500, width: 1.4, tell: 1.3, drop: 'dust', stall: 0, spin: true, repeat: 2},
        },
        phase2: {title: 'BLADE UNCHAINED', line: 'TWO CHARGES IN A ROW · STAND BEFORE A ROCK', summon: ['lancer', 'lancer']},
    },
    {
        kind: 'shell',
        line: 'A SHELL TURNS ROUND ITS CORE · SHOOT THROUGH THE GAPS',
        // 3.2 until 2026-10-19: met at the run's third or fourth step, it took 4 of the 7 deaths in the author's play
        // logs (on Standard and Overload), its hull twice Verdant's and its shell letting shots through the gaps only
        hull: 2.6,
        escorts: [0.5, 0],
        // the shell's slots, filled or a gap, and its turn (rad/s); the second half's turns back every `flip` seconds
        shell: [
            {slots: [1, 1, 0, 1, 1, 0], turn: 0.32, flip: 0},
            {slots: [1, 1, 1, 0, 1, 1, 1, 0], turn: 0.45, flip: 6},
        ],
        // its spokes become arcs: lightning across the whole of each plate's side, so the gaps are where you are safe
        cycles: [
            ['volley', 'arcs', 'blink', 'volley', 'arcs'],
            ['arcs_long', 'volley', 'blink', 'arcs_long', 'volley', 'blink'],
        ],
        attacks: {
            arcs: {kind: 'arcs', length: 700, tell: 1.3, time: 2.6, damage: 12, stall: 1.6},
            arcs_long: {kind: 'arcs', length: 760, tell: 1.2, time: 3.2, damage: 12},
        },
        phase2: {title: 'THE SHELL SPINS UP', line: 'NARROWER GAPS · IT TURNS BACK AND FORTH · KEEP IN A GAP'},
    },
    {
        kind: 'siege',
        line: 'ARMOUR STOPS YOUR SHOTS · HIT THE GLOWING WEAK POINT, THEN GO ROUND',
        hull: 3,
        escorts: [0.5, 0],
        // its rail sights from three emitters, not five, in both halves, and a longer gap between attacks: you are close
        // to it all the fight; the sights hold fire while you are out of their arc (frame)
        gap: 1.8,
        cycles: [
            ['lances', 'broadside', 'lances', 'well'],
            ['lances', 'well', 'broadside_twice', 'lances', 'broadside'],
        ],
        // the weak points round the hull, in the order they open (radians from its bow), and how fast it turns: it turns
        // its bow to you, so the stern and the flanks are reached by going round it, the bow last; the half width of the
        // open one's opening in its armour (radians)
        points: [Math.PI, 1.9, -1.9, 0],
        turn: 0.3,
        opening: 0.5,
        // the half width of its rail sights' arc off its bow: from outside it they cannot bear on you
        arc: 1.1,
        phase2: {title: 'THE PLANET PULLS', line: 'TWO WELLS AND A DOUBLE BROADSIDE · KEEP GOING ROUND'},
    },
    {
        kind: 'glow',
        line: 'ICE TURNS YOUR SHOTS · HIT IT WHILE IT GLOWS, GET OUT BEFORE THE NOVA',
        hull: 2.3,
        escorts: [0.66, 0.33],
        attacks: {
            shards: {kind: 'spiral', arms: 2, rate: 7, turn: 2.1, weapon: 'plasma', speed: 130, time: 2, tell: 0.6, stall: 1.4},
            shards_more: {kind: 'spiral', arms: 3, rate: 7, turn: -2.3, weapon: 'plasma', speed: 135, time: 2.2, tell: 0.6, stall: 1.2},
            nova: {kind: 'wave', reach: 620, speed: 340, width: 26, damage: 22, tell: 2.4, effect: 'chill', stall: 3},
        },
        phase2: {title: 'THE CORE HARDENS', line: 'A FASTER SPIRAL · IT STILL GLOWS AFTER EACH ONE'},
    },
    {
        kind: 'arena',
        line: 'THE FIRE CLOSES IN AS IT HEATS · STAY INSIDE THE RING',
        // light for its step on purpose: its ring closes in as the fight goes on, so a longer one burns a slower pilot
        // (at 2.6, about Cryosphere's, the bot won 2 of 12 runs, not 9; the author's cruiser of four cannons took it in 7 s)
        hull: 1.5,
        escorts: [0.5, 0.2],
        // the ring's radius cold and at full heat, by mode
        ring: 1400,
        tight: [620, 500, 440],
        phase2: {title: 'MELTDOWN', line: 'TWIN FLAMES · THE RING CLOSES FASTER'},
    },
    {
        kind: 'edge',
        line: 'IT HOLDS THE HOLE\'S EDGE · ITS DOME OPENS ONLY WHILE YOU ARE THERE TOO',
        hull: 4.5,
        escorts: [0.66, 0.33],
        // the edge: from and to, and where it keeps, in the hole's radii; how much harder the hole pulls in a surge
        band: [1, 1.8],
        orbit: 1.3,
        surge: 1.35,
        cycles: [
            ['eye', 'blink', 'fan', 'surge', 'blink', 'fan'],
            ['eye_twin', 'blink', 'fan_wide', 'surge', 'blink', 'fan_wide', 'blink'],
        ],
        attacks: {
            surge: {kind: 'surge', tell: 1.6, life: 4.5, stall: 4.5},
        },
        phase2: {title: 'THE EYE OPENS', line: 'TWO BEAMS TURN AFTER YOU · HOLD THE EDGE'},
    },
];

// The world's duel in the arcade, null elsewhere
function boss_duel_design(world = campaign.world)
{
    // a Base run's flagships fight with no duel yet (arcade_base.js)
    return (arcade.active && !arcade_base_kind()) ? boss_duels[world] || null : null;
}

// A number by the mode: CHILL, NORMAL, OVERLOAD
function boss_duel_by_mode(values)
{
    return values[(difficulty === 'chill') ? 0 : (difficulty === 'overload') ? 2 : 1];
}

// The flagship's hull factor in the arcade (arcade_flagship_spawn)
function boss_duel_hull(world)
{
    return boss_duels[world]?.hull ?? boss_designs[world].hull;
}

// The share of its hull below which it calls escorts, then a last stand (arcade_flagship_update); 0 for none
function boss_duel_escorts()
{
    return boss_duels[campaign.world]?.escorts || [0.66, 0.33];
}

// A flagship's duel begins (boss_state_new): its design as the duel changes it, and the duel's own state
function boss_duel_new(v, s)
{
    const duel = boss_duel_design();
    if (!duel) {
        return null;
    }
    const design = s.design;
    s.design = {
        ...design,
        cycles: duel.cycles || design.cycles,
        gap: duel.gap || design.gap,
        attacks: {...design.attacks, ...duel.attacks},
        phase2: duel.phase2 || design.phase2,
        plates: null,
    };
    const out = {def: duel, kind: duel.kind, t: 0, face: v.angle, aim: {x: v.x, y: v.y}, label_cd: 0};
    boss_duel_kinds[duel.kind].start(v, s, out);
    return out;
}

// A frame of the duel, before the flagship moves and attacks
function boss_duel_frame(v, s, dt)
{
    const d = s.duel;
    d.t += dt;
    d.label_cd = Math.max(0, d.label_cd - dt);
    boss_duel_kinds[d.kind].frame(v, s, d, dt);
}

// The duel's way of moving; false leaves it to the design's (boss_move)
function boss_duel_move(v, s, dt)
{
    const kind = boss_duel_kinds[s.duel.kind];
    return kind.move ? kind.move(v, s, s.duel, dt) : false;
}

// After the frame: a heavy hull turns no faster than its duel lets it
function boss_duel_after(v, s, dt)
{
    const d = s.duel;
    const turn = d.def.turn;
    if (turn) {
        v.angle = boss_turn_to(d.face, v.angle, turn*dt);
    }
    d.face = v.angle;
}

// How much of a hit gets through (boss_hit_factor)
function boss_duel_factor(v, s)
{
    const kind = boss_duel_kinds[s.duel.kind];
    if (kind.factor) {
        return kind.factor(v, s, s.duel);
    }
    return (s.exposed > 0) ? boss_exposed_factor : 1;
}

// What the guns aim at when the flagship is the nearest raider: its part that can be hurt; while its armour, blade,
// ice or dome turns your shots from where you are, the nearest other raider in reach, if one is
function boss_duel_aim(target)
{
    const s = boss_states.get(target);
    if (!s || !s.duel) {
        return target;
    }
    const kind = boss_duel_kinds[s.duel.kind];
    if (kind.open && !kind.open(target, s, s.duel)) {
        const other = boss_duel_other_target(target);
        if (other) {
            return other;
        }
    }
    return kind.aim ? kind.aim(target, s, s.duel) : target;
}

// The nearest raider within 650 m that is not the flagship
function boss_duel_other_target(boss)
{
    let out = null;
    let near = 650;
    for (let i = 0, end = enemies.length; i < end; ++i) {
        const v = enemies[i];
        const far = distance(v, player);
        if ((v !== boss) && (v.hp > 0) && (far < near)) {
            near = far;
            out = v;
        }
    }
    return out;
}

// the flagship whose duel was on at the last frame (boss_duel_watch)
let boss_duel_last = null;

// Every arcade frame (arcade_flagship_update): a duel's parts go with its flagship, and a black hole it made surge
// pulls as before once it is gone. When the flagship falls, its own salvage is drawn in: a duel keeps you at its gap,
// its weak point or its edge rather than at its hull, and with the flagship often the last ship, the world cleared at
// once and its drop was lost (the bot's salvage at Haven's depot was 120 short). Only its own: drawing in all that lay
// round gave the bot half as much again as the base at Haven's depot.
function boss_duel_watch()
{
    for (const v of enemies) {
        if (v.duel_owner && (v.hp > 0) && (v.duel_owner.hp <= 0)) {
            v.hp = 0;
            explode(v.x, v.y, 34, boss_duel_nest_color, 0, 'spark');
        }
    }
    const live = boss_duel_live();
    for (const h of black_holes) {
        if (h.duel_strength && !live) {
            h.strength = h.duel_strength;
            h.duel_strength = 0;
        }
    }
    // a flagship left behind by a death (the world starts again) still has its hull: nothing is drawn in
    if (!live && boss_duel_last && (boss_duel_last.hp <= 0)) {
        boss_duel_draw_in(boss_duel_last);
    }
    boss_duel_last = live ? live.v : null;
}

// The flagship's drop (combat.js: within 50 m of where it fell, at most 160 m once scattered) comes to you, said once
// over your ship; one that got away dropped none
function boss_duel_draw_in(boss)
{
    const before = salvage;
    for (const v of pickups) {
        if ((v.life > 0) && (v.type === 'artifact') && (distance(v, boss) < 160)) {
            collect_pickup(v, true);
        }
    }
    if (salvage > before) {
        label(player.x, player.y - 46, `◆ +${salvage - before} · SALVAGE DRAWN IN`, gold);
        sfx('pickup');
    }
}

// The flagship whose duel is on, and its state; null with none
function boss_duel_live()
{
    for (const v of enemies) {
        if ((v.type === 'boss') && (v.hp > 0)) {
            const s = boss_states.get(v);
            return (s && s.duel) ? {v, s, d: s.duel} : null;
        }
    }
    return null;
}

// The HUD card while a duel is on (sync_arcade_card): a title, the next thing to go for, how it stands
function boss_duel_card()
{
    const live = boss_duel_live();
    if (!live) {
        return null;
    }
    const card = boss_duel_kinds[live.d.kind].card(live.v, live.s, live.d);
    card.label = card.label || 'FLAGSHIP';
    return card;
}

// The duel's next thing off the window: the kit's edge marker with its name and distance (screen px)
function boss_duel_marker()
{
    if (!arcade.active || (state !== 'playing')) {
        return;
    }
    const card = boss_duel_card();
    if (!card || !card.target) {
        return;
    }
    // the Crescent's gate too, where it runs
    const live = boss_duel_live();
    if (live.d.kind === 'chase') {
        boss_duel_edge_marker(live.d.gate, 'ITS GATE', gold);
    }
    boss_duel_edge_marker(card.target, card.label, (card.label === 'NEST') ? boss_duel_nest_color : pink);
}

function boss_duel_edge_marker(target, name, color)
{
    if (in_view(target, 0)) {
        return;
    }
    const m = hud_edge_marker(radar_screen(target), 40);
    if (m.offscreen) {
        draw_edge_marker(m, `${name} · ${radar_distance_text(distance(player, target))}`, color);
    }
}

// How a pilot fights the duel now, for the bots (bin/playtest, the captain's autopilot): the velocity to fly at (m/s),
// whether to fire the pulse, and whether to keep to it with raiders near (firm); null to fight as against any raider
function boss_duel_pilot()
{
    const live = boss_duel_live();
    if (!live) {
        return null;
    }
    return boss_duel_kinds[live.d.kind].pilot(live.v, live.s, live.d);
}

// The duel drawn under the hulls (boss_hull_draw)
function boss_duel_draw(v, s)
{
    boss_duel_kinds[s.duel.kind].draw(v, s, s.duel);
}

// Called by render() over the hulls: what of the flagship can be hurt now, lit on its hull
function boss_duel_render_over()
{
    const live = arcade.active && boss_duel_live();
    if (!live || !in_view(live.v, 300)) {
        return;
    }
    const over = boss_duel_kinds[live.d.kind].over;
    if (over) {
        ctx.save();
        over(live.v, live.s, live.d);
        ctx.restore();
    }
}

// A pilot's way toward a point: at most 340 m/s, slowing as it nears `stop`
function boss_duel_toward(p, stop = 60, firm = true)
{
    const d = distance(player, p);
    if (d <= stop) {
        return {vx: 0, vy: 0, pulse: false, firm};
    }
    const speed = Math.min(340, (d - stop)*1.2 + 40);
    return {vx: ((p.x - player.x)/d)*speed, vy: ((p.y - player.y)/d)*speed, pulse: false, firm};
}

// A pilot's way round a centre to the point at `angle` and `r` from it: a little of the turn at a time, never across it
function boss_duel_round(c, angle, r, firm = true)
{
    const mine = Math.atan2(player.y - c.y, player.x - c.x);
    const step = clamp(boss_duel_turn(angle, mine), -0.6, 0.6);
    return boss_duel_toward(boss_duel_at(c, mine + step, r), 30, firm);
}

// A point at an angle and a distance from another
function boss_duel_at(p, angle, r)
{
    return {x: p.x + Math.cos(angle)*r, y: p.y + Math.sin(angle)*r};
}

// The difference of two angles, -π to π
function boss_duel_turn(a, b)
{
    return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

// Your shots that would cross a circle round the flagship this frame where its duel's `closed` says the armour is
// stop on it, a missile goes off there (as Cryosphere's plates in the campaign)
function boss_duel_block(v, s, r, dt)
{
    const d = s.duel;
    const closed = boss_duel_kinds[d.kind].closed;
    for (let i = 0, end = bullets.length; i < end; ++i) {
        const b = bullets[i];
        // a fast slug flies farther in a long frame than the margin: its step counts
        const nx = b.x + b.vx*dt;
        const ny = b.y + b.vy*dt;
        const reach = r + 20 + Math.abs(b.vx*dt) + Math.abs(b.vy*dt);
        if ((b.life <= 0) || (Math.abs(b.x - v.x) > reach) || (Math.abs(b.y - v.y) > reach)) {
            continue;
        }
        const now = distance(b, v);
        const next = Math.hypot(nx - v.x, ny - v.y);
        if ((now < r - 6) || (next > r)) {
            continue;
        }
        if (closed(v, s, d, Math.atan2(ny - v.y, nx - v.x))) {
            b.life = 0;
            explode(b.x, b.y, 8, '#dff8ff', 0, 'spark');
            if (b.missile) {
                missile_detonate(b);
            }
        }
    }
}

// A label over the flagship, not more than one a second and a half
function boss_duel_say(v, d, text, color)
{
    if (d.label_cd > 0) {
        return;
    }
    d.label_cd = 1.5;
    label(v.x, v.y - Math.max(40, v.r*2.6), text, color);
}

// Text in the world at a fixed size on the screen
function boss_duel_text(text, x, y, color, alpha = 0.9, size = 12)
{
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${Math.round(size/zoom)}px ui-monospace,monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

const boss_duel_kinds = {
    chase: {
        start: function (v, s, d) {
            d.gate = boss_duel_gate(v);
            d.speed = distance(v, d.gate)/boss_duel_by_mode(d.def.run);
            d.slow = 1;
            d.cut = 0;
        },
        frame: function (v, s, d, dt) {
            // no other gate takes it on its way
            v.portal_cd = 1;
            const cut = Math.floor((1 - v.hp/v.max_hp)*3);
            if (cut > d.cut) {
                d.cut = cut;
                d.slow *= 0.8;
                boss_expose(v, s, 2.5);
                label(v.x, v.y - v.r*2.6, 'ENGINE HIT · IT SLOWS', boss_duel_open_color);
                explode(v.x - Math.cos(v.angle)*v.r*0.8, v.y - Math.sin(v.angle)*v.r*0.8, 40, '#ffb27a');
                sfx('kill', 0.6, v);
            }
            if (distance(v, d.gate) < d.gate.r + v.r*0.5) {
                boss_duel_escape(v, s, d);
            }
        },
        move: function (v, s, d, dt) {
            // it slows to fire its ring and while its engine sputters, and looks back at you as it fires
            const a = Math.atan2(d.gate.y - v.y, d.gate.x - v.x);
            const k = (s.exposed > 0) ? 0.2 : (s.roar > 0) ? 0.3 : 1;
            const step = Math.min(distance(v, d.gate), d.speed*d.slow*k*dt);
            v.x += Math.cos(a)*step;
            v.y += Math.sin(a)*step;
            boss_face(v, s.attack ? boss_aim(v) : a, dt, 3);
            return true;
        },
        draw: function (v, s, d) {
            const g = d.gate;
            const left = distance(v, g);
            // its way to the gate, and the gate
            boss_dash(v.x, v.y, g.x, g.y, pink, 0.35, 2/zoom);
            ctx.globalAlpha = 0.5 + Math.sin(clock*6)*0.25;
            ctx.strokeStyle = pink;
            ctx.lineWidth = 4/zoom;
            ctx.beginPath();
            ctx.arc(g.x, g.y, g.r + 30 + Math.sin(clock*4)*6, 0, Math.PI*2);
            ctx.stroke();
            boss_swirl(g.x, g.y, g.r + 70, pink, 0.5, 1);
            boss_duel_text('ITS ESCAPE GATE', g.x, g.y - g.r - 56, pink);
            boss_duel_text(`GATE ${radar_distance_text(left)}`, v.x, v.y - v.r*2.2, pink, 0.85);
        },
        card: function (v, s, d) {
            return {title: 'Stop it before it reaches the gate', line: 'Each third of its hull slows it', target: v, eta: `gate ${radar_distance_text(distance(v, d.gate))}`};
        },
        pilot: function (v, s, d) {
            // on its tail, a little to the side, out of its way
            const a = Math.atan2(d.gate.y - v.y, d.gate.x - v.x);
            return boss_duel_toward(boss_duel_at(v, a + Math.PI - 0.5, 340), 40, distance(player, v) > 700);
        },
    },
    nests: {
        start: function (v, s, d) {
            d.nests = [];
            d.sown = false;
            d.shield = false;
            const count = boss_duel_by_mode(d.def.nests);
            const a0 = Math.atan2(v.y - player.y, v.x - player.x);
            for (let i = 0; i < count; ++i) {
                boss_duel_nest(v, d, a0 + Math.PI*0.35 + (i/count)*Math.PI*2, 0);
            }
        },
        frame: function (v, s, d, dt) {
            if ((s.phase === 2) && !d.sown) {
                d.sown = true;
                const count = boss_duel_by_mode(d.def.sown);
                const a0 = Math.atan2(player.y - v.y, player.x - v.x);
                for (let i = 0; i < count; ++i) {
                    boss_duel_nest(v, d, a0 + Math.PI*0.7 + i*Math.PI*0.6, 2.5);
                }
            }
            for (const n of d.nests) {
                n.grow = Math.max(0, n.grow - dt);
            }
            // the shield rises with a grown nest and breaks with the last one: told where it happens
            const shield = boss_duel_nest_shield(d);
            if (shield !== d.shield) {
                d.shield = shield;
                ring(v.x, v.y, boss_duel_nest_color, v.r*boss_duel_nest_shield_k + (shield ? 0 : 60), shield ? 0.5 : 0.8);
                if (!shield) {
                    explode(v.x, v.y, v.r*boss_duel_nest_shield_k, boss_duel_nest_color, 0, 'spark');
                }
                label(v.x, v.y - Math.max(40, v.r*2.6), shield ? 'SHIELD UP' : 'SHIELD DOWN', boss_duel_nest_color);
            }
            if (shield) {
                boss_duel_block(v, s, v.r*boss_duel_nest_shield_k, dt);
            }
        },
        closed: function (v, s, d, angle) {
            return boss_duel_nest_shield(d);
        },
        open: function (v, s, d) {
            return !boss_duel_nest_shield(d);
        },
        factor: function (v, s, d) {
            return boss_duel_nest_shield(d) ? 0 : 1;
        },
        aim: function (target, s, d) {
            const n = boss_duel_nearest_nest(d);
            return (n && (distance(n, player) < 760)) ? n : target;
        },
        draw: function (v, s, d) {
            for (const n of d.nests) {
                if ((n.v.hp <= 0) || !(in_view(n.v, 300) || in_view(v, 300))) {
                    continue;
                }
                boss_duel_nest_draw(v, n);
            }
            if (boss_duel_nest_shield(d)) {
                boss_duel_nest_shield_draw(v);
            }
        },
        card: function (v, s, d) {
            const left = d.nests.filter(vv => vv.v.hp > 0).length;
            if (!left) {
                return {title: 'Destroy the Thorn Beetle', line: 'Its shield is down', target: v, eta: 'no nests left'};
            }
            return {
                title: `Break the ${(left > 1) ? `${left} nests` : 'nest'} shielding it`,
                line: 'The green lines hold its shield up',
                target: boss_duel_nearest_nest(d),
                eta: `${left} shielding`,
                label: 'NEST',
            };
        },
        pilot: function (v, s, d) {
            const n = boss_duel_nearest_nest(d);
            return n ? boss_duel_toward(n, 240) : null;
        },
    },
    joust: {
        start: function (v, s, d) {
            d.rock = null;
            d.flash = null;
            d.flash_t = 0;
            d.misses = 0;
        },
        frame: function (v, s, d, dt) {
            d.flash_t = Math.max(0, d.flash_t - dt);
            const k = s.attack;
            if (!k || (k.p.kind !== 'charge')) {
                d.rock = null;
                return;
            }
            if (k.phase === 'tell') {
                // the rock its lane runs into is lit while it winds up
                d.rock = boss_duel_lane_rock(v, k.angle, k.p.length - k.sweep);
                return;
            }
            const rock = boss_duel_rock_ahead(v, k.angle, k.p.speed*dt);
            if (rock) {
                boss_duel_ram(v, s, d, k, rock);
                return;
            }
            if (k.sweep + k.p.speed*dt >= k.p.length) {
                d.misses += 1;
                if (d.misses % 2 === 1) {
                    label(player.x, player.y - 40, 'STAND BEFORE A ROCK · DODGE', gold);
                }
            }
        },
        factor: function (v, s, d) {
            return (s.exposed > 0) ? 2 : d.def.blade;
        },
        open: function (v, s, d) {
            return s.exposed > 0;
        },
        draw: function (v, s, d) {
            if (d.rock) {
                const r = d.rock;
                ctx.globalAlpha = 0.6 + Math.sin(clock*14)*0.3;
                ctx.strokeStyle = gold;
                ctx.lineWidth = 3/zoom;
                ctx.beginPath();
                ctx.arc(r.x, r.y, r.r + 18, 0, Math.PI*2);
                ctx.stroke();
                boss_duel_text('IT RAMS HERE', r.x, r.y - r.r - 28, gold);
            }
            if (d.flash && (d.flash_t > 0)) {
                boss_glow(d.flash.x, d.flash.y, d.flash.r + 30, gold, d.flash_t);
            }
            if (s.exposed > 0) {
                return;
            }
            // the blade's guard, turning: shots glance off it
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = boss_duel_steel_color;
            ctx.lineWidth = 3/zoom;
            ctx.setLineDash(boss_dashes(14, 10));
            ctx.beginPath();
            ctx.arc(v.x, v.y, v.r*1.12, clock*2, clock*2 + Math.PI*2);
            ctx.stroke();
            ctx.setLineDash(boss_no_dash);
        },
        over: function (v, s, d) {
            if (s.exposed <= 0) {
                return;
            }
            // stunned: four-pointed stars turning over the hull, outlined so they stand out of its lights
            ctx.globalAlpha = 0.95;
            ctx.fillStyle = gold;
            ctx.strokeStyle = '#2a1a05';
            ctx.lineWidth = 1.5/zoom;
            const size = 7/zoom;
            for (let i = 0; i < 5; ++i) {
                const a = clock*3 + (i*Math.PI*2)/5;
                const x = v.x + Math.cos(a)*v.r*0.85;
                const y = v.y - v.r*1.05 + Math.sin(a)*v.r*0.25;
                ctx.beginPath();
                for (let j = 0; j < 8; ++j) {
                    const r = (j % 2) ? size*0.35 : size;
                    const b = clock*2 + (j*Math.PI)/4;
                    ctx.lineTo(x + Math.cos(b)*r, y + Math.sin(b)*r);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        },
        card: function (v, s, d) {
            if (s.exposed > 0) {
                return {title: 'Hit it now: it is stunned', line: 'Its blade is down', target: v, eta: `stunned ${s.exposed.toFixed(1)} s`};
            }
            const rock = boss_duel_nearest_rock(player);
            if (rock && (distance(rock, player) > 700)) {
                return {title: 'Lead it to the rocks', line: 'A charge that ends on a rock stuns it', target: rock, eta: 'blade up', label: 'ROCK'};
            }
            return {title: 'Dodge its charge into a rock', line: 'A lit rock is where it rams', target: v, eta: 'blade up'};
        },
        pilot: function (v, s, d) {
            const k = s.attack;
            if (s.exposed > 0) {
                return boss_duel_toward(v, 260);
            }
            if (k && (k.p.kind === 'charge')) {
                // across its lane, away from where it points
                const side = (boss_duel_turn(Math.atan2(player.y - v.y, player.x - v.x), k.angle) > 0) ? 1 : -1;
                const a = k.angle + side*Math.PI/2;
                return {vx: Math.cos(a)*340, vy: Math.sin(a)*340, pulse: false, firm: true};
            }
            // a rock behind you, as it sees you
            const rock = boss_duel_nearest_rock(player);
            if (!rock) {
                return null;
            }
            const a = Math.atan2(v.y - rock.y, v.x - rock.x);
            return boss_duel_toward(boss_duel_at(rock, a, rock.r + 170), 40);
        },
    },
    shell: {
        start: function (v, s, d) {
            d.angle = 0;
            d.dir = 1;
            d.flip = 0;
        },
        frame: function (v, s, d, dt) {
            const p = d.def.shell[s.phase - 1];
            d.angle += d.dir*p.turn*dt;
            if (p.flip) {
                d.flip -= dt;
                if (d.flip <= 0) {
                    d.flip = p.flip;
                    d.dir = -d.dir;
                    ring(v.x, v.y, '#8be9ff', v.r + 60, 0.4);
                }
            }
            // an open hull (after the spokes) has its shell drawn in
            if (s.exposed <= 0) {
                boss_duel_block(v, s, v.r + 34, dt);
            }
        },
        closed: function (v, s, d, angle) {
            return boss_duel_shell_closed(d, d.def.shell[s.phase - 1], angle);
        },
        open: function (v, s, d) {
            return (s.exposed > 0) || !boss_duel_shell_closed(d, d.def.shell[s.phase - 1], Math.atan2(player.y - v.y, player.x - v.x));
        },
        draw: function (v, s, d) {
            const p = d.def.shell[s.phase - 1];
            const slot = (Math.PI*2)/p.slots.length;
            const r = v.r + 34;
            const open = s.exposed > 0;
            // the gaps: lit lanes out from the core, where to stand
            ctx.fillStyle = '#6cf8ec';
            for (let i = 0; i < p.slots.length; ++i) {
                if (p.slots[i]) {
                    continue;
                }
                const a = d.angle + i*slot;
                ctx.globalAlpha = 0.12 + Math.sin(clock*5)*0.03;
                ctx.beginPath();
                ctx.moveTo(v.x, v.y);
                ctx.arc(v.x, v.y, 720, a + 0.04, a + slot - 0.04);
                ctx.closePath();
                ctx.fill();
                for (const edge of [a + 0.04, a + slot - 0.04]) {
                    boss_dash(v.x + Math.cos(edge)*r, v.y + Math.sin(edge)*r, v.x + Math.cos(edge)*720, v.y + Math.sin(edge)*720, '#6cf8ec', 0.55, 1.5/zoom);
                }
            }
            // the shell: arcs of crackling plate
            ctx.globalAlpha = open ? 0.2 : 0.9;
            ctx.strokeStyle = '#8d9cff';
            ctx.lineWidth = 13;
            ctx.beginPath();
            for (let i = 0; i < p.slots.length; ++i) {
                if (!p.slots[i]) {
                    continue;
                }
                const a = d.angle + i*slot;
                ctx.moveTo(v.x + Math.cos(a + 0.05)*r, v.y + Math.sin(a + 0.05)*r);
                ctx.arc(v.x, v.y, r, a + 0.05, a + slot - 0.05);
            }
            ctx.stroke();
            ctx.strokeStyle = '#e6ecff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = open ? 0.15 : 0.6 + Math.sin(clock*30)*0.2;
            ctx.stroke();
        },
        over: function (v, s, d) {
            // the core, lit: what to hit
            boss_glow(v.x, v.y, v.r*(0.32 + Math.sin(clock*8)*0.03), '#6cf8ec', (s.exposed > 0) ? 0.95 : 0.7);
        },
        card: function (v, s, d) {
            const p = d.def.shell[s.phase - 1];
            const inside = !boss_duel_shell_closed(d, p, Math.atan2(player.y - v.y, player.x - v.x));
            if (s.exposed > 0) {
                return {title: 'Hit the core: its shell is open', line: 'It closes again soon', target: v, eta: `open ${s.exposed.toFixed(1)} s`};
            }
            if (s.attack && (s.attack.p.kind === 'arcs')) {
                return {title: inside ? 'Keep in the gap: arcs all round' : 'Into a gap before the arcs', line: 'Its arcs reach all but the gaps', target: v, eta: inside ? 'in a gap' : 'arcs coming'};
            }
            return {title: inside ? 'In a gap: keep with it' : 'Fly into a lit lane', line: 'Shots pass the gaps in its shell', target: v, eta: inside ? 'in a gap' : 'shell between'};
        },
        pilot: function (v, s, d) {
            // to the gap nearest you, a little ahead of where it turns
            const p = d.def.shell[s.phase - 1];
            const slot = (Math.PI*2)/p.slots.length;
            const mine = Math.atan2(player.y - v.y, player.x - v.x);
            let best = null;
            for (let i = 0; i < p.slots.length; ++i) {
                if (p.slots[i]) {
                    continue;
                }
                const a = d.angle + (i + 0.5)*slot + d.dir*p.turn*0.6;
                if ((best === null) || (Math.abs(boss_duel_turn(a, mine)) < Math.abs(boss_duel_turn(best, mine)))) {
                    best = a;
                }
            }
            return boss_duel_toward(boss_duel_at(v, best, 430), 30, distance(player, v) < 900);
        },
    },
    siege: {
        start: function (v, s, d) {
            d.index = 0;
            d.opening = 1.2;
        },
        frame: function (v, s, d, dt) {
            const index = Math.min(3, Math.floor((1 - v.hp/v.max_hp)*4));
            if (index > d.index) {
                // a weak point broken: the hull reels, open for a moment; the next opens on another side
                const broken = boss_duel_point(v, d);
                explode(broken.x, broken.y, 60, '#ff8a3d');
                d.index = index;
                d.opening = 1.4;
                boss_expose(v, s, 2);
                label(v.x, v.y - v.r*2.6, `WEAK POINT BROKEN · ${4 - index} LEFT`, boss_duel_open_color);
                sfx('kill', 0.7, v);
            }
            d.opening = Math.max(0, d.opening - dt);
            // its rail sights cannot bear on you behind it or at its flanks: the attack is dropped
            const k = s.attack;
            if (k && (k.p.kind === 'lances') && (k.p.mode === 'track') && (Math.abs(boss_duel_turn(boss_aim(v), v.angle)) > d.def.arc)) {
                s.attack = null;
                s.gap = s.design.gap;
                boss_duel_say(v, d, 'OUT OF ITS GUNS\' ARC', '#ffb27a');
            }
            const p = boss_duel_point(v, d);
            d.aim.x = p.x;
            d.aim.y = p.y;
            if (s.exposed <= 0) {
                boss_duel_block(v, s, v.r + 26, dt);
            }
        },
        move: function (v, s, d, dt) {
            // a fortress: it stands where it is and turns its bow to you, no faster than its duel lets it
            boss_face(v, boss_aim(v), dt, 1);
            return true;
        },
        aim: function (target, s, d) {
            return d.aim;
        },
        closed: function (v, s, d, angle) {
            return !boss_duel_point_open(v, d, angle);
        },
        open: function (v, s, d) {
            return (s.exposed > 0) || boss_duel_point_open(v, d, Math.atan2(player.y - v.y, player.x - v.x));
        },
        draw: function (v, s, d) {
            const r = v.r + 26;
            const a = v.angle + d.def.points[d.index];
            const open = d.opening <= 0;
            const half = d.def.opening;
            // the armour: a steel ring all round but at the weak point
            if (s.exposed <= 0) {
                ctx.globalAlpha = 0.85;
                ctx.strokeStyle = boss_duel_steel_color;
                ctx.lineWidth = 11;
                ctx.beginPath();
                ctx.arc(v.x, v.y, r, a + (open ? half : 0), a + Math.PI*2 - (open ? half : 0));
                ctx.stroke();
                ctx.globalAlpha = 0.5;
                ctx.strokeStyle = '#2b303a';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            // the broken points, dark; the open one glowing, and a lane out from it
            for (let i = 0; i < d.index; ++i) {
                const b = boss_duel_at(v, v.angle + d.def.points[i], v.r*0.8);
                ctx.globalAlpha = 0.85;
                ctx.fillStyle = '#1a1414';
                ctx.beginPath();
                ctx.arc(b.x, b.y, 11, 0, Math.PI*2);
                ctx.fill();
            }
            if (open) {
                const p = boss_duel_point(v, d);
                boss_dash(p.x + Math.cos(a)*30, p.y + Math.sin(a)*30, p.x + Math.cos(a)*520, p.y + Math.sin(a)*520, '#ff8a3d', 0.5, 1.6/zoom);
            }
        },
        over: function (v, s, d) {
            const p = boss_duel_point(v, d);
            const f = (d.opening <= 0) ? 1 : 1 - d.opening/1.4;
            boss_glow(p.x, p.y, 12 + f*14 + Math.sin(clock*10)*3, '#ff8a3d', 0.4 + f*0.6);
            if (d.opening <= 0) {
                boss_duel_text(`WEAK POINT ${d.index + 1}/4 · GO ROUND`, v.x, v.y - v.r*2.2, '#ffb27a');
            }
        },
        card: function (v, s, d) {
            const quarter = v.max_hp/4;
            const left = clamp((v.hp - quarter*(3 - d.index))/quarter, 0, 1);
            return {title: `Hit weak point ${d.index + 1} of 4`, line: 'Go round to the glowing one', target: v, eta: `${Math.ceil(left*100)}% of it left`};
        },
        pilot: function (v, s, d) {
            // round to the open point when no raider is close
            const a = v.angle + d.def.points[d.index];
            return boss_duel_round(v, a, 500, false);
        },
    },
    glow: {
        start: function (v, s, d) {
            d.glow = false;
        },
        frame: function (v, s, d, dt) {
            const was = d.glow;
            d.glow = boss_duel_glowing(s);
            if (d.glow && !was) {
                ring(v.x, v.y, '#dff8ff', v.r*2, 0.4);
                label(v.x, v.y - v.r*2.6, 'IT GLOWS · HIT IT', '#dff8ff');
            }
        },
        factor: function (v, s, d) {
            return d.glow ? 1.5 : boss_duel_glance;
        },
        open: function (v, s, d) {
            return d.glow;
        },
        over: function (v, s, d) {
            if (d.glow) {
                boss_glow(v.x, v.y, v.r*(1.1 + Math.sin(clock*12)*0.08), '#dff8ff', 0.45);
                // while its hull is exposed, the exposed timer over it says so already
                if (s.exposed <= 0) {
                    boss_duel_text('GLOWING · HIT IT', v.x, v.y - v.r*2.2, '#dff8ff');
                }
            }
        },
        draw: function (v, s, d) {
            if (d.glow) {
                return;
            }
            // the ice armour: a pale ring of facets
            ctx.globalAlpha = 0.45;
            ctx.strokeStyle = '#b8e8f5';
            ctx.lineWidth = 2/zoom;
            ctx.beginPath();
            for (let i = 0; i <= 8; ++i) {
                const a = (i*Math.PI)/4 + clock*0.3;
                const x = v.x + Math.cos(a)*v.r*1.15;
                const y = v.y + Math.sin(a)*v.r*1.15;
                if (i) {
                    ctx.lineTo(x, y);
                }
                else {
                    ctx.moveTo(x, y);
                }
            }
            ctx.stroke();
        },
        card: function (v, s, d) {
            const k = s.attack;
            if (k && (k.p.kind === 'wave')) {
                return {title: 'Hit it, then get out before the nova', line: 'The dashed circle is its reach', target: v, eta: 'nova gathering'};
            }
            if (d.glow) {
                return {title: 'Hit it now: it glows', line: 'Ice turns your shots when it fades', target: v, eta: `glows ${s.exposed.toFixed(1)} s`};
            }
            return {title: 'Wait for the glow', line: 'It glows after its spiral and its nova', target: v, eta: 'ice up'};
        },
        pilot: function (v, s, d) {
            const k = s.attack;
            const dist = distance(player, v);
            if (k && (k.p.kind === 'wave') && (k.t > k.p.tell*0.45)) {
                // out of the nova's reach before it goes
                const a = Math.atan2(player.y - v.y, player.x - v.x);
                return boss_duel_toward(boss_duel_at(v, a, k.p.reach + 160), 20);
            }
            if (d.glow || (k && (k.p.kind === 'wave'))) {
                return boss_duel_toward(v, 300, dist > 340);
            }
            return null;
        },
    },
    arena: {
        start: function (v, s, d) {
            const r = d.def.ring;
            d.c = {x: clamp((v.x + player.x)/2, Math.min(r, world.w/2), Math.max(world.w - r, world.w/2)), y: clamp((v.y + player.y)/2, Math.min(r, world.h/2), Math.max(world.h - r, world.h/2))};
            // kept off the arena's edge, the centre could leave you at or outside the ring as it began: it comes toward you
            // until you are well inside (the ring may then pass the edge, where the radiation is anyway)
            const far = distance(player, d.c);
            if (far > r*0.6) {
                d.c = boss_duel_at(player, Math.atan2(d.c.y - player.y, d.c.x - player.x), r*0.6);
            }
            d.r = r;
            d.heat = 0;
            d.step = 0;
            d.outside = false;
        },
        frame: function (v, s, d, dt) {
            const r0 = d.def.ring;
            const tight = boss_duel_by_mode(d.def.tight);
            // it heats as its hull goes and as the fight goes on; the second half heats faster
            d.heat = clamp(0.75*(1 - v.hp/v.max_hp) + d.t/((s.phase === 2) ? 150 : 240), 0, 1);
            const to = r0 - (r0 - tight)*d.heat;
            d.r = Math.max(to, d.r - 70*dt);
            const step = Math.floor(d.heat*3);
            if (step > d.step) {
                d.step = step;
                shake = Math.max(shake, 10);
                ring(d.c.x, d.c.y, '#ff8a3d', d.r, 0.6);
                label(v.x, v.y - v.r*2.6, 'IT HEATS · THE RING CLOSES', '#ffb27a');
                sfx('flare', 0.7, v);
            }
            d.outside = distance(player, d.c) > d.r;
            if (d.outside) {
                boss_hit(v, 10, false);
                player.heat = clamp((player.heat || 0) + 30*dt, 0, 100);
                if (player.heat >= 100) {
                    player.overheated = true;
                }
                boss_duel_say(player, d, 'TOO HOT · BACK INSIDE', '#ff8a3d');
            }
        },
        move: function (v, s, d, dt) {
            boss_move(v, s, dt);
            // it keeps inside its fire
            const far = distance(v, d.c);
            const room = Math.max(0, d.r - v.r - 40);
            if (far > room) {
                v.x = d.c.x + ((v.x - d.c.x)/far)*room;
                v.y = d.c.y + ((v.y - d.c.y)/far)*room;
            }
            return true;
        },
        draw: function (v, s, d) {
            const c = d.c;
            // a dark band just outside, the wall of fire, its heat; the band, not the whole window outside the ring: a
            // full-window fill each frame cost Nova Forge's flagship wave about 4 ms a frame on a software canvas
            ctx.globalAlpha = 0.38;
            ctx.strokeStyle = '#2a0802';
            ctx.lineWidth = 320;
            ctx.beginPath();
            ctx.arc(c.x, c.y, d.r + 160, 0, Math.PI*2);
            ctx.stroke();
            ctx.globalAlpha = 0.5 + Math.sin(clock*18)*0.12;
            ctx.strokeStyle = '#ff6a2a';
            ctx.lineWidth = 18;
            ctx.beginPath();
            ctx.arc(c.x, c.y, d.r, 0, Math.PI*2);
            ctx.stroke();
            ctx.globalAlpha = 0.85;
            ctx.strokeStyle = '#ffe1a8';
            ctx.lineWidth = 3/zoom;
            ctx.stroke();
            boss_duel_text(`HEAT ${Math.round(d.heat*100)}%`, v.x, v.y - v.r*2.2, '#ffb27a', 0.85);
        },
        card: function (v, s, d) {
            if (d.outside) {
                return {title: 'Back inside the fire ring', line: 'Outside it burns and heats your guns', target: d.c, eta: 'burning', label: 'RING'};
            }
            return {title: 'Destroy the Furnace inside the ring', line: 'The ring closes as it heats', target: v, eta: `heat ${Math.round(d.heat*100)}%`};
        },
        pilot: function (v, s, d) {
            return (distance(player, d.c) > d.r - 160) ? boss_duel_toward(d.c, d.r*0.4) : null;
        },
    },
    edge: {
        start: function (v, s, d) {
            // on an arcade Scroll lane the hole is behind, beside the lane: the edge is a ring in the middle of the
            // standing screen instead, as large as half the view's shorter side lets it be (arcade_scroll.js)
            const lane = arcade_scroll_on() ? arcade_scroll_view() : null;
            const hole = lane ? null : black_holes.reduce((best, h) => (!best || (distance(h, v) < distance(best, v))) ? h : best, null);
            const ring = lane && {x: lane.x, y: lane.y, radius: clamp(Math.min(lane.w, lane.h)*0.5, 160, 700), strength: 0, virtual: true};
            d.hole = hole || ring || {x: clamp(v.x, 900, world.w - 900), y: clamp(v.y, 900, world.h - 900), radius: 700, strength: 0, virtual: true};
            d.orbit = Math.atan2(v.y - d.hole.y, v.x - d.hole.x);
            d.side = (Math.random() < 0.5) ? -1 : 1;
            d.surge = 0;
            d.strength = d.hole.strength;
            d.inside = false;
        },
        frame: function (v, s, d, dt) {
            const h = d.hole;
            const far = distance(player, h);
            d.inside = (far > h.radius*d.def.band[0]) && (far < h.radius*d.def.band[1]);
            if (d.surge > 0) {
                d.surge -= dt;
                if (d.surge <= 0) {
                    h.strength = d.strength;
                    h.duel_strength = 0;
                }
            }
            // a jump keeps to the edge, ahead of you or behind
            const k = s.attack;
            if (k && (k.p.kind === 'blink') && !k.rim) {
                k.rim = true;
                const mine = Math.atan2(player.y - h.y, player.x - h.x);
                k.to = boss_duel_at(h, mine + ((Math.random() < 0.5) ? -1 : 1)*rand(0.35, 0.6), h.radius*d.def.orbit);
            }
        },
        move: function (v, s, d, dt) {
            // round the edge, toward you along it, never on top of you
            const h = d.hole;
            const mine = Math.atan2(player.y - h.y, player.x - h.x);
            d.orbit = boss_turn_to(d.orbit, mine + d.side*0.38, 0.16*dt);
            const p = boss_duel_at(h, d.orbit, h.radius*d.def.orbit);
            const far = distance(v, p);
            const step = Math.min(far, 260*dt);
            if (far > 1) {
                v.x += ((p.x - v.x)/far)*step;
                v.y += ((p.y - v.y)/far)*step;
            }
            boss_face(v, boss_aim(v), dt, 1.5);
            return true;
        },
        factor: function (v, s, d) {
            if (!d.inside) {
                return boss_duel_glance;
            }
            return (s.exposed > 0) ? boss_exposed_factor : 1;
        },
        open: function (v, s, d) {
            return d.inside;
        },
        draw: function (v, s, d) {
            const h = d.hole;
            const [r0, r1] = d.def.band;
            // the edge, a band round the hole: lit when you are in it
            ctx.globalAlpha = d.inside ? 0.1 : 0.05 + Math.sin(clock*3)*0.02;
            ctx.strokeStyle = '#c58bff';
            ctx.lineWidth = h.radius*(r1 - r0);
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.radius*(r0 + r1)/2, 0, Math.PI*2);
            ctx.stroke();
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 2/zoom;
            ctx.setLineDash(boss_dashes(12, 10));
            for (const r of d.def.band) {
                ctx.beginPath();
                ctx.arc(h.x, h.y, h.radius*r, 0, Math.PI*2);
                ctx.stroke();
            }
            ctx.setLineDash(boss_no_dash);
            if (d.surge > 0) {
                boss_swirl(h.x, h.y, h.radius*0.8, '#c58bff', 0.6, 1);
            }
        },
        over: function (v, s, d) {
            // the dome: open and lit, or shut under a dark shell
            if (d.inside) {
                boss_glow(v.x, v.y, v.r*0.5 + Math.sin(clock*10)*3, '#ffd0f0', 0.85);
                boss_duel_text('DOME OPEN · HIT IT', v.x, v.y - v.r*2.2, '#ffd0f0');
            }
            else {
                ctx.globalAlpha = 0.45;
                ctx.fillStyle = '#05060c';
                ctx.beginPath();
                ctx.arc(v.x, v.y, v.r*1.15, 0, Math.PI*2);
                ctx.fill();
                ctx.strokeStyle = '#c58bff';
                ctx.lineWidth = 2/zoom;
                ctx.stroke();
                boss_duel_text('DOME SHUT · MEET IT AT THE EDGE', v.x, v.y - v.r*2.2, '#c58bff');
            }
        },
        card: function (v, s, d) {
            if (d.inside) {
                return {title: 'Duel at the edge: its dome is open', line: 'Lean out against the pull', target: v, eta: (d.surge > 0) ? 'the hole surges' : 'dome open'};
            }
            const h = d.hole;
            const a = Math.atan2(player.y - h.y, player.x - h.x);
            return {title: h.virtual ? 'Meet it on the ring' : 'Meet it at the hole\'s edge', line: 'Its dome opens only while you are there', target: boss_duel_at(h, a, h.radius*d.def.orbit), eta: 'dome shut', label: 'EDGE'};
        },
        pilot: function (v, s, d) {
            // to the edge beside it, leaning out against the pull
            const h = d.hole;
            const a = Math.atan2(v.y - h.y, v.x - h.x) - d.side*0.32;
            const plan = boss_duel_round(h, a, h.radius*(d.def.orbit + 0.1));
            const far = Math.max(1, distance(player, h));
            if (!h.virtual) {
                const lean = gravity_pull(h, far)*1.3 + ((far < h.radius*d.def.band[0]) ? 260 : 0);
                plan.vx += ((player.x - h.x)/far)*lean;
                plan.vy += ((player.y - h.y)/far)*lean;
            }
            return plan;
        },
    },
};

// The Storm Wheel's arcs: lightning out across each plate's side of the shell, turning with it, to `length`; its gaps
// are where they do not reach. Drawn as lit sectors, dashed while they gather.
boss_attack_kinds.arcs = {
    begin: function (v, s, k) {
        sfx('enemy_beam', 0.9, v);
    },
    tick: function (v, s, k, dt) {
        const p = k.p;
        k.t += dt;
        if (k.t < p.tell) {
            return false;
        }
        if (k.phase === 'tell') {
            k.phase = 'fire';
            shake = Math.max(shake, 5);
            sfx('storm', 0.8, v);
        }
        const d = s.duel;
        const far = distance(player, v);
        if (d && (far > v.r) && (far < p.length + player.r) && boss_duel_shell_closed(d, d.def.shell[s.phase - 1], Math.atan2(player.y - v.y, player.x - v.x))) {
            boss_hit(v, p.damage, false);
            player.energy = Math.max(0, player.energy - 30*dt);
        }
        return k.t >= p.tell + p.time;
    },
    draw: function (v, s, k) {
        const d = s.duel;
        if (!d) {
            return;
        }
        const p = k.p;
        const shell = d.def.shell[s.phase - 1];
        const slot = (Math.PI*2)/shell.slots.length;
        const lit = k.t >= p.tell;
        const f = lit ? 1 : k.t/p.tell;
        const r0 = v.r + 34;
        ctx.beginPath();
        for (let i = 0; i < shell.slots.length; ++i) {
            if (!shell.slots[i]) {
                continue;
            }
            const a = d.angle + i*slot;
            ctx.moveTo(v.x + Math.cos(a)*r0, v.y + Math.sin(a)*r0);
            ctx.arc(v.x, v.y, p.length, a, a + slot);
            ctx.arc(v.x, v.y, r0, a + slot, a, true);
            ctx.closePath();
        }
        ctx.globalAlpha = lit ? 0.2 + Math.sin(clock*40)*0.06 : 0.04 + f*0.1;
        ctx.fillStyle = lit ? '#8d9cff' : boss_tell_color;
        ctx.fill();
        ctx.globalAlpha = lit ? 0.8 : 0.3 + f*0.5;
        ctx.strokeStyle = lit ? '#e6ecff' : boss_tell_color;
        ctx.lineWidth = 2/zoom;
        ctx.setLineDash(lit ? boss_no_dash : boss_dashes(10, 8));
        ctx.stroke();
        ctx.setLineDash(boss_no_dash);
    },
};

// The Eclipse Eye's surge: the hole swirls while it gathers, then pulls harder for a while, the dome wide open
boss_attack_kinds.surge = {
    begin: function (v, s, k) {
        sfx('gravity', 0.9, v);
    },
    tick: function (v, s, k, dt) {
        k.t += dt;
        if (k.t < k.p.tell) {
            return false;
        }
        const d = s.duel;
        if (d && !d.hole.virtual) {
            d.hole.strength = d.strength*d.def.surge;
            d.hole.duel_strength = d.strength;
            d.surge = k.p.life;
        }
        shake = Math.max(shake, 8);
        show_toast('THE HOLE SURGES', 'IT PULLS HARDER · THE DOME IS WIDE OPEN', 2, 'danger');
        return true;
    },
    draw: function (v, s, k) {
        const d = s.duel;
        if (!d) {
            return;
        }
        const f = Math.min(1, k.t/k.p.tell);
        boss_swirl(d.hole.x, d.hole.y, d.hole.radius*(1.2 - f*0.4), boss_tell_color, 0.3 + f*0.5, f);
        boss_dash(v.x, v.y, d.hole.x, d.hole.y, boss_tell_color, 0.3 + f*0.4, 2/zoom);
    },
};

// The Crescent's gate: the arcade map's gate farthest from you that it can reach (1.8 to 4.2 km off), or a point
// 3 km off, away from you, when none is
function boss_duel_gate(v)
{
    // on an arcade Scroll lane: just past the front edge (arcade_scroll.js)
    if (arcade_scroll_on()) {
        return arcade_scroll_gate();
    }
    let best = null;
    for (const p of portals) {
        const far = distance(p, v);
        if ((far < 1800) || (far > 4200)) {
            continue;
        }
        if (!best || (distance(p, player) > distance(best, player))) {
            best = p;
        }
    }
    if (best) {
        return {x: best.x, y: best.y, r: best.r};
    }
    const a = Math.atan2(v.y - player.y, v.x - player.x);
    return {x: clamp(v.x + Math.cos(a)*3000, 200, world.w - 200), y: clamp(v.y + Math.sin(a)*3000, 200, world.h - 200), r: 46};
}

// The Crescent at its gate: it jumps away, the wave goes on without it, and its bounty is lost
function boss_duel_escape(v, s, d)
{
    explode(v.x, v.y, v.r, '#a8e4ff', 0, 'warp');
    ring(d.gate.x, d.gate.y, pink, 260, 0.8);
    v.hp = 0;
    arcade.flagship_escaped = true;
    set_hidden(el.bossbar, true);
    show_toast(`${s.design.name} GOT AWAY`, 'IT REACHED ITS GATE · NO FLAGSHIP BOUNTY', 3.5, 'danger');
    sfx('portal', 1, v);
}

// A nest round the Thorn Beetle: an anchored raider that does not fire, drawn as a nest (boss_duel_nest_draw), a
// tenth of the Beetle's hull; `grow` the seconds before it holds the shield up
function boss_duel_nest(v, d, angle, grow)
{
    const at = boss_duel_at(v, angle, 600);
    const enemy = spawn_enemy('tank');
    enemy.x = clamp(at.x, 120, world.w - 120);
    enemy.y = clamp(at.y, 120, world.h - 120);
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.anchor = true;
    enemy.unarmed = true;
    enemy.armor = 0;
    enemy.shield = 0;
    enemy.max_shield = 0;
    enemy.arcade_scaled = true;
    enemy.r = 30;
    enemy.hp = enemy.max_hp = Math.round(v.max_hp*0.1);
    enemy.color = boss_duel_nest_color;
    enemy.duel_owner = v;
    ore_nodes = ore_nodes.filter(vv => distance(vv, enemy) > vv.r + 90);
    mark_mining_changed();
    ring(enemy.x, enemy.y, boss_duel_nest_color, 90, 0.6);
    d.nests.push({v: enemy, grow});
}

function boss_duel_nearest_nest(d)
{
    let out = null;
    for (const n of d.nests) {
        if ((n.v.hp > 0) && (!out || (distance(n.v, player) < distance(out, player)))) {
            out = n.v;
        }
    }
    return out;
}

// A nest: green bulbs round a core that swell as it grows, its hull as an arc, and the shield's feed running along a
// line to the Beetle
function boss_duel_nest_draw(v, n)
{
    const e = n.v;
    const grown = 1 - Math.min(1, n.grow/2.5);
    if (n.grow <= 0) {
        boss_dash(e.x, e.y, v.x, v.y, boss_duel_nest_color, 0.35, 2/zoom);
        const f = (clock*0.8 + e.x*0.001) % 1;
        boss_glow(e.x + (v.x - e.x)*f, e.y + (v.y - e.y)*f, 6, boss_duel_nest_color, 0.9);
    }
    ctx.fillStyle = (e.flash > 0) ? '#e5faff' : '#3f7a3a';
    ctx.globalAlpha = 0.95;
    for (let i = 0; i < 6; ++i) {
        const a = (i*Math.PI)/3 + e.x;
        const r = (9 + (i % 2)*4)*(0.5 + grown*0.5)*(1 + Math.sin(clock*4 + i)*0.08);
        ctx.beginPath();
        ctx.arc(e.x + Math.cos(a)*e.r*0.55, e.y + Math.sin(a)*e.r*0.55, r, 0, Math.PI*2);
        ctx.fill();
    }
    boss_glow(e.x, e.y, 14*(0.5 + grown*0.5), boss_duel_nest_color, 0.9);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = boss_duel_nest_color;
    ctx.lineWidth = 3/zoom;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r + 10, -Math.PI/2, -Math.PI/2 + Math.PI*2*(e.hp/e.max_hp));
    ctx.stroke();
    boss_duel_text((n.grow > 0) ? 'NEST · SPROUTING' : 'NEST · SHIELDS IT', e.x, e.y - e.r - 20, boss_duel_nest_color);
}

// Whether a grown nest stands: then the Beetle's shield is up
function boss_duel_nest_shield(d)
{
    return d.nests.some(v => (v.v.hp > 0) && (v.grow <= 0));
}

// The Beetle's shield: a green bubble round it, a bright rim that breathes and a sheen turning over it
function boss_duel_nest_shield_draw(v)
{
    const r = v.r*boss_duel_nest_shield_k;
    const pulse = 0.5 + Math.sin(clock*3)*0.5;
    boss_glow(v.x, v.y, r + 18, boss_duel_nest_color, 0.25 + pulse*0.1);
    ctx.globalAlpha = 0.2 + pulse*0.06;
    ctx.fillStyle = boss_duel_nest_color;
    ctx.beginPath();
    ctx.arc(v.x, v.y, r, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 0.8 + pulse*0.2;
    ctx.strokeStyle = '#d9ffd6';
    ctx.lineWidth = 7/zoom;
    ctx.beginPath();
    ctx.arc(v.x, v.y, r, 0, Math.PI*2);
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 9/zoom;
    ctx.strokeStyle = '#e8ffe6';
    const a = clock*0.9;
    ctx.beginPath();
    ctx.arc(v.x, v.y, r - 6/zoom, a, a + 0.9);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

// The rocks a charge can stun itself on: whole ore rocks
function boss_duel_nearest_rock(p)
{
    let out = null;
    let near = Infinity;
    for (let i = 0; i < ore_nodes.length; ++i) {
        const rock = ore_nodes[i];
        const far = distance(rock, p);
        if ((rock.hp > 0) && (rock.r >= 16) && (far < near)) {
            near = far;
            out = rock;
        }
    }
    return out;
}

// The first rock a lane from the hull runs into within `length`
function boss_duel_lane_rock(v, angle, length)
{
    const end = boss_duel_at(v, angle, length);
    let out = null;
    let near = Infinity;
    for (let i = 0; i < ore_nodes.length; ++i) {
        const rock = ore_nodes[i];
        if ((rock.hp <= 0) || (rock.r < 16)) {
            continue;
        }
        const along = (rock.x - v.x)*Math.cos(angle) + (rock.y - v.y)*Math.sin(angle);
        if ((along < 0) || (along > length + rock.r) || (along > near)) {
            continue;
        }
        if (segment_distance(rock, v, end) < rock.r + v.r*0.8) {
            near = along;
            out = rock;
        }
    }
    return out;
}

// A rock the hull meets within the next step of its charge
function boss_duel_rock_ahead(v, angle, step)
{
    const end = boss_duel_at(v, angle, step);
    for (let i = 0; i < ore_nodes.length; ++i) {
        const rock = ore_nodes[i];
        if ((rock.hp > 0) && (rock.r >= 16) && (Math.abs(rock.x - v.x) < step + v.r + 200) && (segment_distance(rock, v, end) < rock.r + v.r*0.8)) {
            return rock;
        }
    }
    return null;
}

// The Sawtooth rams a rock: its charge ends there, it reels back, stunned, its hull open
function boss_duel_ram(v, s, d, k, rock)
{
    const stun = boss_duel_by_mode(d.def.stun);
    s.attack = null;
    s.gap = s.design.gap + stun*0.5;
    s.mv.vx = 0;
    s.mv.vy = 0;
    v.x = clamp(v.x - Math.cos(k.angle)*24, 90, world.w - 90);
    v.y = clamp(v.y - Math.sin(k.angle)*24, 90, world.h - 90);
    boss_expose(v, s, stun);
    d.rock = null;
    d.flash = rock;
    d.flash_t = 0.8;
    shake = Math.max(shake, 16);
    explode((v.x + rock.x)/2, (v.y + rock.y)/2, 70, '#e4c98a');
    burst((v.x + rock.x)/2, (v.y + rock.y)/2, '#e4c98a', 40, 320);
    label(v.x, v.y - v.r*2.6, 'STUNNED · HIT IT NOW', gold);
    sfx('kill', 0.9, v);
}

// The Storm Wheel's shell: whether it is closed at an angle from the core
function boss_duel_shell_closed(d, p, angle)
{
    const slot = (Math.PI*2)/p.slots.length;
    const a = (((angle - d.angle) % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
    return p.slots[Math.min(p.slots.length - 1, Math.floor(a/slot))] === 1;
}

// The Iron Stair's weak point open now: where it is on the hull, and whether a shot at an angle from its centre meets it
function boss_duel_point(v, d)
{
    return boss_duel_at(v, v.angle + d.def.points[d.index], v.r*0.8);
}

function boss_duel_point_open(v, d, angle)
{
    return (d.opening <= 0) && (Math.abs(boss_duel_turn(angle, v.angle + d.def.points[d.index])) < d.def.opening);
}

// The Frost Crystal glows after its spiral and its nova (its stalls), and while it gathers the nova
function boss_duel_glowing(s)
{
    const k = s.attack;
    return (s.exposed > 0) || (s.roar > 0) || (!!k && (k.p.kind === 'wave') && (k.t > 0.3));
}
