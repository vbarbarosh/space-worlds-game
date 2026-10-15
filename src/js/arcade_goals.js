// World goals in the arcade (notes/gameplay-review-2026-10-15.md): waves 1 and 2 of Dustfall, Ion Reach and Cryosphere
// ask for the world's own action instead of a count of raiders, and end when it is done: the raiders still about jump
// away and the goal pays a bonus. Wave 1 shows the action on its own, wave 2 asks for more of it under fire; the
// flagship stays the climax. Raiders still come, half as many.
// - Dustfall, a breach: a launcher behind an arc of rock that your guns cannot break and the pulse (or the raiders'
//   missiles) can; break through or fly round its open back. Wave 2: two launchers, then an exit to reach.
// - Ion Reach, the storm: relays lit by a full pulse fired within its reach; the storm beside each charges the pulse
//   fast at the shield's cost, kills and the reactor slowly. Wave 2: two relays.
// - Cryosphere, a rescue: capsules drifting on the ice, hooked by flying with one (near it, at its speed) and towed to
//   the depot. Wave 2: two of three. They never leave the map.

const arcade_goal_kinds = {2: 'breach', 3: 'relays', 5: 'rescue'};
// a goal wave's share of the raiders the wave would have
const arcade_goal_raiders = 0.5;
// the bonus for a goal done: salvage, and score, both more a world
const arcade_goal_salvage = [40, 12];
const arcade_goal_score = [1500, 300];
// a breach: the launcher's distance from the depot, the wall's distance from the launcher, the wall's half arc (rad),
// its rocks' reach and hull (a pulse breaks the rocks it reaches), how near the launcher fires, and the exit
const arcade_breach_far = [1500, 1750];
const arcade_breach_wall = 380;
const arcade_breach_arc = 0.95;
const arcade_breach_rock = 40;
const arcade_breach_rock_hp = 150;
const arcade_breach_reach = 1300;
const arcade_breach_exit = 140;
// a relay stands this far outside its storm's edge, toward the depot
const arcade_relay_gap = 230;
const arcade_relay_r = 34;
// a capsule: its drift speed (m/s), how near and how close in speed you hook it, and how long that takes (s); towed,
// it trails this far behind
const arcade_capsule_speed = [90, 140];
const arcade_capsule_hook = 120;
const arcade_capsule_match = 110;
const arcade_capsule_hold = 0.6;
const arcade_capsule_tow = 80;
const arcade_capsule_r = 18;
const arcade_goal_green = '#7dff8a';
const arcade_goal_ice = '#9fd8ff';

// Called from arcade_wave_start: the wave's goal in a world that has one (waves before the flagship's), its raiders
// halved; none elsewhere
function arcade_goal_start(n)
{
    arcade.goal = null;
    const kind = arcade_goal_kinds[campaign.world];
    if (!kind || (n >= arcade_waves)) {
        return;
    }
    spawn_left = Math.ceil(spawn_left*arcade_goal_raiders);
    arcade.goal = {kind, wave: n, done: false, launchers: [], walls: [], exit: null, relays: [], capsules: [], need: 0, saved: 0};
    if (kind === 'breach') {
        arcade_breach_start(arcade.goal, n);
    }
    if (kind === 'relays') {
        arcade_relays_start(arcade.goal, n);
    }
    if (kind === 'rescue') {
        arcade_rescue_start(arcade.goal, n);
    }
    const card = arcade_goal_card();
    show_toast(card.title.toUpperCase(), card.line, 4, 'income');
}

// Whether a goal is open: the wave waits for it, not for its raiders, and the kill combo holds
function arcade_goal_open()
{
    return arcade.active && !!arcade.goal && !arcade.goal.done;
}

// A spot `far` from the depot at `angle`, kept `margin` inside the arena
function arcade_goal_spot(angle, far, margin = 500)
{
    return {
        x: clamp(station.x + Math.cos(angle)*far, margin, world.w - margin),
        y: clamp(station.y + Math.sin(angle)*far, margin, world.h - margin),
    };
}

// One launcher in wave 1, two on opposite sides in wave 2; each behind its wall
function arcade_breach_start(g, n)
{
    const angle = Math.random()*Math.PI*2;
    for (let i = 0; i < n; ++i) {
        arcade_breach_site(g, angle + i*(Math.PI*0.9 + rand(0, 0.4)), arcade_breach_far[n - 1]);
    }
}

// A launcher: a gunner of missiles, anchored, three times the hull; an arc of rock in front of it, toward the depot,
// open at its back. The rocks there before are cleared.
function arcade_breach_site(g, angle, far)
{
    const site = arcade_goal_spot(angle, far, 700);
    ore_nodes = ore_nodes.filter(v => distance(v, site) > arcade_breach_wall + 160);
    const facing = Math.atan2(station.y - site.y, station.x - site.x);
    const count = Math.round((arcade_breach_wall*arcade_breach_arc*2)/(arcade_breach_rock*1.6)) + 1;
    for (let i = 0; i < count; ++i) {
        const a = facing + (i/(count - 1) - 0.5)*arcade_breach_arc*2;
        const rock = ore_node_new({
            x: site.x + Math.cos(a)*arcade_breach_wall,
            y: site.y + Math.sin(a)*arcade_breach_wall,
            r: arcade_breach_rock + rand(-4, 6),
            hp: arcade_breach_rock_hp,
            max_hp: arcade_breach_rock_hp,
            type: 'ore',
            field: -1,
            angle: Math.random()*Math.PI*2,
            flash: 0,
        });
        rock.wall = true;
        rock.site = site;
        ore_nodes.push(rock);
        g.walls.push(rock);
    }
    const enemy = spawn_enemy('shooter');
    enemy.x = site.x;
    enemy.y = site.y;
    enemy.weapon = 'missile';
    enemy.anchor = true;
    enemy.launcher = true;
    enemy.hp = enemy.max_hp = enemy.max_hp*3;
    enemy.r = Math.round(enemy.r*1.3);
    g.launchers.push(enemy);
    mark_mining_changed();
}

// A relay beside a storm near the depot, outside its edge toward the depot, the rocks round it cleared: wave 1's by the
// nearest storm, wave 2's by the next two, so the one lit before stays where it was
function arcade_relays_start(g, n)
{
    const storms = world_zones.filter(v => v.type === 'storm').sort((a, b) => distance(a, station) - distance(b, station));
    for (let i = 0; i < n; ++i) {
        const z = storms[i + n - 1];
        if (!z) {
            const p = arcade_goal_spot(Math.random()*Math.PI*2, 1500);
            g.relays.push({x: p.x, y: p.y, r: arcade_relay_r, lit: false});
            continue;
        }
        const a = Math.atan2(station.y - z.y, station.x - z.x);
        g.relays.push({x: z.x + Math.cos(a)*(z.r + arcade_relay_gap), y: z.y + Math.sin(a)*(z.r + arcade_relay_gap), r: arcade_relay_r, lit: false});
    }
    ore_nodes = ore_nodes.filter(v => g.relays.every(vv => distance(v, vv) > 200));
    mark_mining_changed();
}

// One capsule in wave 1, three in wave 2 with two to save; each drifting across the arena 1.3–1.9 km out
function arcade_rescue_start(g, n)
{
    const count = (n === 1) ? 1 : 3;
    g.need = (n === 1) ? 1 : 2;
    const angle = Math.random()*Math.PI*2;
    for (let i = 0; i < count; ++i) {
        const p = arcade_goal_spot(angle + (i*Math.PI*2)/count, rand(1300, 1900));
        const a = rand(0, Math.PI*2);
        const s = rand(arcade_capsule_speed[0], arcade_capsule_speed[1]);
        g.capsules.push({x: p.x, y: p.y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, r: arcade_capsule_r, hook: 0, towed: false, saved: false});
    }
}

// Called from arcade_update while the wave is on: each goal's rule, then done when it is met
function arcade_goal_update(dt)
{
    const g = arcade.goal;
    if (!g || g.done) {
        return;
    }
    if (g.kind === 'breach') {
        arcade_breach_update(g);
    }
    if (g.kind === 'rescue') {
        arcade_rescue_update(g, dt);
    }
    if (arcade_goal_met(g)) {
        arcade_goal_finish(g);
    }
}

function arcade_goal_met(g)
{
    if (g.kind === 'breach') {
        return g.launchers.every(v => v.hp <= 0) && (!g.exit || g.exit.reached);
    }
    if (g.kind === 'relays') {
        return g.relays.every(v => v.lit);
    }
    return g.saved >= g.need;
}

// The launchers down, wave 2 opens the exit past the last one; flying into it is the breach's end
function arcade_breach_update(g)
{
    if ((g.wave > 1) && !g.exit && g.launchers.every(v => v.hp <= 0)) {
        const last = g.launchers[g.launchers.length - 1];
        const a = Math.atan2(last.y - station.y, last.x - station.x);
        g.exit = {...arcade_goal_spot(a, distance(last, station) + 550, 300), reached: false};
        // nothing solid in the ring: rocks there would hold you off it
        ore_nodes = ore_nodes.filter(v => v.wall || (distance(v, g.exit) > arcade_breach_exit + v.r + 40));
        mark_mining_changed();
        ring(g.exit.x, g.exit.y, arcade_goal_green, arcade_breach_exit*1.6, 0.8);
        show_toast('EXIT OPEN', 'Fly into the green ring', 3, 'income');
    }
    if (g.exit && !g.exit.reached && (distance(player, g.exit) < arcade_breach_exit)) {
        g.exit.reached = true;
    }
}

// Whether a launcher holds its fire: beyond its reach of you
function arcade_launcher_holds(v, d)
{
    return v.anchor && (d > arcade_breach_reach);
}

// A wall rock takes no harm from your guns: the shot stops on it (update's shots against the rocks)
function arcade_wall_shields(rock)
{
    return !!rock.wall;
}

// Called from pulse_update for each wave: a pulse of yours that reaches a relay lights it
function arcade_goal_pulse(wave)
{
    const g = arcade.goal;
    if (!g || g.done || (g.kind !== 'relays') || (wave.kind !== 'pulse')) {
        return;
    }
    for (const relay of g.relays) {
        if (!relay.lit && pulse_wave_reaches(wave, relay)) {
            relay.lit = true;
            ring(relay.x, relay.y, cyan, 160, 0.8);
            explode(relay.x, relay.y, 60, cyan);
            const left = g.relays.filter(v => !v.lit).length;
            if (left) {
                show_toast('RELAY LIT', `${left} more to light`, 2.5, 'income');
            }
        }
    }
}

// Capsules drift and bounce off the arena's edge; one you fly with long enough hooks on, and towed into the depot's
// reach it is saved. One at a time on the line.
function arcade_rescue_update(g, dt)
{
    const towing = g.capsules.find(v => v.towed && !v.saved);
    for (const c of g.capsules) {
        if (c.saved) {
            continue;
        }
        if (c.towed) {
            const a = Math.atan2(player.vy, player.vx);
            const speed = Math.hypot(player.vx, player.vy);
            const tx = player.x - ((speed > 20) ? Math.cos(a) : Math.cos(player.angle))*arcade_capsule_tow;
            const ty = player.y - ((speed > 20) ? Math.sin(a) : Math.sin(player.angle))*arcade_capsule_tow;
            c.vx = (tx - c.x)*6;
            c.vy = (ty - c.y)*6;
        }
        c.x += c.vx*dt;
        c.y += c.vy*dt;
        if ((c.x < 200) || (c.x > world.w - 200)) {
            c.vx = -c.vx;
            c.x = clamp(c.x, 200, world.w - 200);
        }
        if ((c.y < 200) || (c.y > world.h - 200)) {
            c.vy = -c.vy;
            c.y = clamp(c.y, 200, world.h - 200);
        }
        if (c.towed) {
            if (distance(c, station) < station_reach) {
                c.saved = true;
                c.towed = false;
                g.saved++;
                ring(c.x, c.y, arcade_goal_green, 120, 0.7);
                if (g.saved < g.need) {
                    show_toast('CAPSULE SAVED', `${g.need - g.saved} more to bring in`, 2.5, 'income');
                }
            }
            continue;
        }
        const close = (distance(c, player) < arcade_capsule_hook) && (Math.hypot(c.vx - player.vx, c.vy - player.vy) < arcade_capsule_match);
        c.hook = (close && !towing) ? c.hook + dt : Math.max(0, c.hook - dt*2);
        if (c.hook >= arcade_capsule_hold) {
            c.towed = true;
            c.hook = 0;
            ring(c.x, c.y, arcade_goal_ice, 70, 0.5);
            show_toast('CAPSULE HOOKED', 'Tow it to the depot', 2.5, 'income');
            return;
        }
    }
}

// The goal met: its bonus, and the raiders still about jump away (the flagship's wave keeps its own)
function arcade_goal_finish(g)
{
    g.done = true;
    const bonus = arcade_goal_salvage[0] + arcade_goal_salvage[1]*campaign.world;
    salvage += bonus;
    score += arcade_goal_score[0] + arcade_goal_score[1]*campaign.world;
    show_toast('GOAL DONE', `+${bonus} ◆ · the raiders jump away`, 3, 'income');
    spawn_left = 0;
    for (const enemy of enemies.slice()) {
        if ((enemy.hp > 0) && (enemy.type !== 'boss')) {
            explode(enemy.x, enemy.y, 30, '#a8e4ff', 0, 'warp');
            enemies.splice(enemies.indexOf(enemy), 1);
        }
    }
}

// The goal on the card: its title, a line under it in the toast, where to fly next, and the state in a few words
function arcade_goal_card()
{
    const g = arcade.goal;
    if (g.kind === 'breach') {
        const left = g.launchers.filter(v => v.hp > 0);
        if (left.length) {
            return {
                title: `Destroy ${(left.length > 1) ? `${left.length} launchers` : 'the launcher'}`,
                line: 'Pulse its wall (Space) or fly round',
                target: arcade_goal_nearest(left),
                eta: `${g.launchers.length - left.length}/${g.launchers.length} down`,
                label: 'LAUNCHER',
            };
        }
        return {title: 'Reach the exit', line: 'Fly into the green ring', target: g.exit, eta: 'exit open', label: 'EXIT'};
    }
    if (g.kind === 'relays') {
        const left = g.relays.filter(v => !v.lit);
        return {
            title: `Light ${(left.length > 1) ? `${left.length} relays` : 'the relay'}`,
            line: 'A full pulse near it · storms charge it',
            target: arcade_goal_nearest(left),
            eta: `pulse ${Math.floor(player.energy)}%`,
            label: 'RELAY',
        };
    }
    const towed = g.capsules.find(v => v.towed);
    const free = g.capsules.filter(v => !v.saved && !v.towed);
    return {
        title: towed ? 'Tow the capsule to the depot' : `Rescue ${g.need - g.saved} capsule${((g.need - g.saved) > 1) ? 's' : ''}`,
        line: 'Fly at its speed to hook it',
        target: towed ? station : arcade_goal_nearest(free),
        eta: `${g.saved}/${g.need} saved`,
        label: towed ? 'DEPOT' : 'CAPSULE',
    };
}

function arcade_goal_nearest(list)
{
    let out = null;
    for (const v of list) {
        if (!out || (distance(v, player) < distance(out, player))) {
            out = v;
        }
    }
    return out;
}

// The goal in the world (the camera's units): the wall's rocks ringed by how whole they are, the launchers named, the
// exit; the relays, and the pulse's reach round you when it is full; the capsules with the way they drift, the hook
// filling, the line to the one towed and the depot's ring
function render_arcade_goal()
{
    const g = arcade.active && arcade.goal;
    if (!g || g.done) {
        return;
    }
    ctx.save();
    ctx.lineWidth = 2/zoom;
    if (g.kind === 'breach') {
        ctx.setLineDash([6/zoom, 5/zoom]);
        for (const rock of g.walls) {
            if ((rock.hp <= 0) || !in_view(rock, rock.r + 20)) {
                continue;
            }
            const k = rock.hp/rock.max_hp;
            ctx.strokeStyle = (k > 0.5) ? '#ff9a3d' : '#ff4d5e';
            ctx.beginPath();
            ctx.arc(rock.x, rock.y, rock.r + 8, -Math.PI/2, -Math.PI/2 + Math.PI*2*k);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        // named here unless the nearest threat's plate names it already (render_target_brackets)
        const named = hud_threat();
        for (const v of g.launchers) {
            if ((v.hp > 0) && (v !== named) && in_view(v, 200)) {
                arcade_goal_tag(v.x, v.y - v.r - 26, 'LAUNCHER', '#ff4d5e');
            }
        }
        if (g.exit && in_view(g.exit, 300)) {
            const beat = 1 + Math.sin(clock*5)*0.05;
            ctx.strokeStyle = arcade_goal_green;
            ctx.lineWidth = 4/zoom;
            ctx.setLineDash([14/zoom, 10/zoom]);
            ctx.beginPath();
            ctx.arc(g.exit.x, g.exit.y, arcade_breach_exit*beat, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
            arcade_goal_tag(g.exit.x, g.exit.y, 'EXIT', arcade_goal_green);
        }
    }
    if (g.kind === 'relays') {
        const reach = 480 + upgrades.pulse*80;
        if ((player.energy >= 100) && g.relays.some(v => !v.lit && (distance(v, player) < reach*2))) {
            ctx.strokeStyle = '#ff5baf88';
            ctx.setLineDash([10/zoom, 8/zoom]);
            ctx.beginPath();
            ctx.arc(player.x, player.y, reach, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        for (const relay of g.relays) {
            if (!in_view(relay, 200)) {
                continue;
            }
            ctx.fillStyle = relay.lit ? cyan : '#1b2633';
            ctx.strokeStyle = cyan;
            ctx.lineWidth = 3/zoom;
            ctx.beginPath();
            ctx.arc(relay.x, relay.y, relay.r, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            for (let i = 0; i < 4; ++i) {
                const a = clock*(relay.lit ? 2 : 0.4) + (i*Math.PI)/2;
                ctx.moveTo(relay.x + Math.cos(a)*relay.r, relay.y + Math.sin(a)*relay.r);
                ctx.lineTo(relay.x + Math.cos(a)*(relay.r + 16), relay.y + Math.sin(a)*(relay.r + 16));
            }
            ctx.stroke();
            arcade_goal_tag(relay.x, relay.y - relay.r - 30, relay.lit ? 'RELAY LIT' : 'RELAY · PULSE', cyan);
        }
    }
    if (g.kind === 'rescue') {
        const towed = g.capsules.find(v => v.towed);
        if (towed) {
            ctx.strokeStyle = arcade_goal_ice;
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(towed.x, towed.y);
            ctx.stroke();
            ctx.strokeStyle = arcade_goal_green;
            ctx.setLineDash([14/zoom, 10/zoom]);
            ctx.beginPath();
            ctx.arc(station.x, station.y, station_reach, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        for (const c of g.capsules) {
            if (c.saved || !in_view(c, 400)) {
                continue;
            }
            if (!c.towed) {
                // where it drifts in the next 3 s
                ctx.fillStyle = arcade_goal_ice;
                for (let i = 1; i <= 6; ++i) {
                    ctx.globalAlpha = 0.6 - i*0.08;
                    ctx.beginPath();
                    ctx.arc(c.x + c.vx*i*0.5, c.y + c.vy*i*0.5, 3/zoom, 0, Math.PI*2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }
            // a pod: a pale hull, a dark window, a beacon that blinks
            ctx.fillStyle = arcade_goal_ice;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2/zoom;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#16364d';
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r*0.45, 0, Math.PI*2);
            ctx.fill();
            if ((clock % 1) < 0.5) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(c.x, c.y - c.r - 4/zoom, 3/zoom, 0, Math.PI*2);
                ctx.fill();
            }
            if (c.hook > 0) {
                ctx.strokeStyle = arcade_goal_green;
                ctx.lineWidth = 4/zoom;
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.r + 10, -Math.PI/2, -Math.PI/2 + Math.PI*2*Math.min(1, c.hook/arcade_capsule_hold));
                ctx.stroke();
            }
            if (!c.towed) {
                arcade_goal_tag(c.x, c.y - c.r - 22, 'CAPSULE', arcade_goal_ice);
            }
        }
    }
    ctx.restore();
}

// A word over a goal's thing (the camera's units), as big on the screen at any zoom
function arcade_goal_tag(x, y, text, color)
{
    ctx.font = `700 ${12/zoom}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(4, 8, 15, 0.7)';
    const w = ctx.measureText(text).width + 12/zoom;
    ctx.fillRect(x - w/2, y - 9/zoom, w, 18/zoom);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y + 1/zoom);
}

// The goal's next place off the window: the kit's edge marker with its name and distance (screen px)
function render_arcade_goal_marker()
{
    if (!arcade_goal_open() || (state !== 'playing')) {
        return;
    }
    const card = arcade_goal_card();
    if (!card.target || in_view(card.target, 0)) {
        return;
    }
    const m = hud_edge_marker(radar_screen(card.target), 40);
    if (m.offscreen) {
        draw_edge_marker(m, `${card.label} · ${radar_distance_text(distance(player, card.target))}`, (card.label === 'RELAY') ? cyan : (card.label === 'CAPSULE') ? arcade_goal_ice : gold);
    }
}

// How a pilot does the goal now, for the bots (bin/playtest, the captain's autopilot): the velocity to fly at (m/s)
// and whether to fire the pulse; null with no goal open. A breach goes round the wall's open back to the launcher, then
// to the exit; the storm's relays charge the pulse in the storm (or wait for kills) and fire it within reach; a rescue
// flies at the capsule's speed onto it, then tows it home.
function arcade_goal_pilot()
{
    if (!arcade_goal_open()) {
        return null;
    }
    const g = arcade.goal;
    if (g.kind === 'breach') {
        const left = g.launchers.filter(v => v.hp > 0);
        if (!left.length) {
            return g.exit ? arcade_goal_toward(arcade_goal_way(g.exit)) : null;
        }
        const l = arcade_goal_nearest(left);
        const way = arcade_goal_way(l);
        return (way === l) ? arcade_goal_toward(l, 220) : arcade_goal_toward(way);
    }
    if (g.kind === 'relays') {
        const relay = arcade_goal_nearest(g.relays.filter(v => !v.lit));
        if (player.energy < 100) {
            const storm = arcade_goal_nearest(world_zones.filter(v => v.type === 'storm'));
            return storm ? arcade_goal_toward(storm, 120) : arcade_goal_toward(relay, 200);
        }
        const plan = arcade_goal_toward(relay, 150);
        plan.pulse = distance(player, relay) < 300;
        return plan;
    }
    const towed = g.capsules.find(v => v.towed);
    if (towed) {
        return arcade_goal_toward(station);
    }
    const c = arcade_goal_nearest(g.capsules.filter(v => !v.saved));
    // the capsule's way, and a pull onto it that eases as you come close, so you arrive at its speed
    const plan = arcade_goal_toward(c, 0, Math.min(260, distance(player, c)*0.9));
    plan.vx += c.vx;
    plan.vy += c.vy;
    return plan;
}

// The way to `p` past the breaches' walls (every wave's, standing still): `p` itself, or, when a wall rock stands on
// the straight line, the end of that wall's arc (out past its last rock) that makes the shorter way round; from inside
// a wall's cup, out through its open back first
function arcade_goal_way(p)
{
    // the first rock on the line, the nearest to you
    let block = null;
    for (const v of ore_nodes) {
        if (v.wall && (v.hp > 0) && (segment_distance(v, player, p) < v.r + 50) && (!block || (distance(v, player) < distance(block, player)))) {
            block = v;
        }
    }
    if (!block) {
        return p;
    }
    const s = block.site;
    const facing = Math.atan2(station.y - s.y, station.x - s.x);
    if (distance(player, s) < arcade_breach_wall + 20) {
        return {x: s.x - Math.cos(facing)*(arcade_breach_wall + 160), y: s.y - Math.sin(facing)*(arcade_breach_wall + 160)};
    }
    let out = null;
    for (const side of [-1, 1]) {
        const a = facing + side*(arcade_breach_arc + 0.7);
        const end = {x: s.x + Math.cos(a)*(arcade_breach_wall + 240), y: s.y + Math.sin(a)*(arcade_breach_wall + 240)};
        if (!out || ((distance(player, end) + distance(end, p)) < (distance(player, out) + distance(out, p)))) {
            out = end;
        }
    }
    return out;
}

// The velocity for flying at `p`: `speed` along the way to it (by default 340, easing within 300 m), nothing within `stop`
function arcade_goal_toward(p, stop = 60, speed = null)
{
    const d = distance(player, p);
    if (d <= stop) {
        return {vx: 0, vy: 0, pulse: false};
    }
    const s = speed ?? Math.min(340, (d - stop)*1.2 + 40);
    return {vx: ((p.x - player.x)/d)*s, vy: ((p.y - player.y)/d)*s, pulse: false};
}
