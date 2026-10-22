// Dustfall's cliffs (arcade): a few rock faces lean out over the dust, each over a strip of ground it would fall on.
// They are rocks as any other (in ore_nodes, of type 'cliff'): ships crash into them, every shot stops on them, raiders
// steer round them. Your shots wear a cliff down to its crack (raiders' fire only chips the face), and the crack gives
// to the guns aimed at it; broken, the cliff rumbles for a moment and falls: whatever stands in its fall zone is
// crushed, you too, and its rubble lies there as new rocks, closing that way and opening the one where the cliff
// stood. Here a fight is won by where you lead the raiders, not only by shooting them: half of Dustfall's squadrons
// warp in under a cliff, and the guns turn to a crack when raiders are under it.
let cliffs = [];
// the cliff the guns aim at this frame (cliff_target), or null: only its crack gives
let cliff_aim = null;
// the world that has them (Dustfall), how many, and how big (m)
const cliff_world = 2;
const cliff_count = 6;
const cliff_size = [115, 150];
// how far from the map's middle they stand (the depot's shield reaches 1400 m), and apart from each other
const cliff_ring = [1500, 2300];
const cliff_apart = 1100;
// A cliff's hull before the mode's and the step's growth, as a raider's (arcade_modes: hull, growth): 351 at NORMAL's
// third step, 2.3 s of a step-two kit's fire (two cannons) and 4.7 s of the first gun's
const cliff_hull = 180;
// The fall zone: from the cliff's middle out past its face for this far (m), as wide as the cliff at its foot and this
// much wider each side at its far end
const cliff_reach = 520;
const cliff_spread = 130;
// the rumble between the crack giving way and the fall (s): long enough to see, too short for a raider to get out;
// then the fall runs down its zone at this pace (m/s), from the foot to the far end in a third of a second
const cliff_rumble = 0.6;
const cliff_fall_pace = 2000;
// What the fall takes off a hull and its shield together: a raider's all and more (its armour aside), a heavy one's
// most (it is left with a sliver), a flagship's a little
const cliff_crush = 1.6;
const cliff_crush_heavy = 0.9;
const cliff_crush_flagship = 0.15;
const cliff_heavy = ['tank', 'bulwark', 'carrier'];
// what it takes off you, as a blast (a dash does not cover it), before the mode's factor
const cliff_hit = 40;
// The pay for raiders crushed at once, on top of their own kills: n × n × this score, and the rock's salvage, two
// pieces and one a raider, of what a broken ore rock drops
const cliff_points = 60;
const cliff_salvage = 2;
// the rocks the fall leaves in its zone, and their size (m)
const cliff_rubble = 8;
const cliff_rubble_size = [26, 42];
// The guns turn to a crack within this reach (m from its face) when this many raiders are under it, or one once the
// cliff is primed: worn below this share of its hull. Stray fire, the pulse, missiles and the guns with nothing else
// near wear a cliff down to primed and no further: the last of it gives only to the guns aimed at its crack, so a
// cliff falls when you mean it to (bin/playtest's bot, before: 14 falls of 21 on no raider, shot down by fire at
// raiders round it). The guns never fell one whose zone you are in (or this close to).
const cliff_aim_reach = 600;
const cliff_aim_least = 2;
const cliff_primed = 0.25;
const cliff_aim_margin = 60;
// The share of Dustfall's lines and pincers that warp in under a cliff, a third of the way down its zone, when one
// stands this far (m) from you and you are out of its zone
const cliff_squad_share = 0.5;
const cliff_squad_range = [500, 1400];
// the world's palette for the stone: its shadow side, its face, its lit rim, the crack's glow, and the zone's warning
const cliff_colors = {dark: '#22100a', face: '#5a2f1c', top: '#8f4f2c', rim: '#e39a5c', crack: '#ffd16e', warn: '#ff8a3d', fall: '#ff5a3d'};

// Dustfall's cliffs for an arcade map, the same every visit (their own seed): round the middle, each leaning across
// the ring (its fall zone runs along it, not at the depot), clear of the depot's shield, the portals and each other,
// its rubble's places on the map; the ore rocks under a cliff and down its fall go, and the drifting pieces in it
function cliffs_generate()
{
    cliffs = [];
    cliff_aim = null;
    if (!arcade.active || (campaign.world !== cliff_world)) {
        return;
    }
    const random = visual_random_from_seed(6151);
    const mode = arcade_mode();
    const hp = Math.round(cliff_hull*mode.hull*(1 + mode.growth*arcade_level()));
    const keep = [{x: station.x, y: station.y, r: depot_shield_radius + 300}, ...[...portals, ...world_gates, ...beacons].map(v => ({x: v.x, y: v.y, r: (v.r || 0) + 250}))];
    // or the world's map file's (map_files.js)
    const edited = map_file_cliffs(hp);
    for (let i = 0; !edited && (i < cliff_count); ++i) {
        for (let tries = 0; tries < 60; ++tries) {
            const a = (i/cliff_count)*Math.PI*2 + random()*0.7;
            const d = cliff_ring[0] + random()*(cliff_ring[1] - cliff_ring[0]);
            const r = cliff_size[0] + random()*(cliff_size[1] - cliff_size[0]);
            // round the middle of the map, or where the world's shape sets the ring (arcade_shapes.js); on a Scroll
            // run's lane along it instead, either side in turn, each falling across the lane
            const middle = arcade_shape().cliffs || [0.5, 0.5];
            const lane = arcade_lane_kind() ? arcade_lane_point((i + 0.3 + random()*0.4)*arcade_shape().scroll/cliff_count, ((i % 2) ? 1 : -1)*(500 + random()*400), world.w, world.h) : null;
            const across = lane && arcade_lane_point((i + 0.5)*arcade_shape().scroll/cliff_count, 0, world.w, world.h);
            const x = lane ? lane.x : world.w*middle[0] + Math.cos(a)*d;
            const y = lane ? lane.y : world.h*middle[1] + Math.sin(a)*d*(world.h/world.w);
            const fall = lane ? Math.atan2(across.y - y, across.x - x) + (random() - 0.5)*0.6 : a + ((random() < 0.5) ? 1 : -1)*Math.PI/2 + (random() - 0.5)*0.6;
            const c = {rock: {x, y, r}, fall, rumble: 0, front: null, marks: 0, landed: 0, hit: [], crushed: 0, shape: [], rubble: []};
            const tip = cliff_point(c, r + cliff_reach, 0);
            if (![c.rock, tip].every(v => (Math.min(v.x, v.y, world.w - v.x, world.h - v.y) > r + 200))) {
                continue;
            }
            if (cliffs.some(v => distance(v.rock, c.rock) < cliff_apart) || black_holes.some(v => distance(v, c.rock) < v.radius + r + cliff_reach)) {
                continue;
            }
            for (let k = 0; k < cliff_rubble; ++k) {
                const along = r + 40 + (k + random()*0.6)*(cliff_reach - 80)/cliff_rubble;
                const half = r + cliff_spread*along/(r + cliff_reach);
                c.rubble.push({...cliff_point(c, along, (random()*2 - 1)*half*0.8), r: cliff_rubble_size[0] + random()*(cliff_rubble_size[1] - cliff_rubble_size[0]), along});
            }
            if ([c.rock, ...c.rubble].some(v => keep.some(vv => distance(v, vv) < v.r + vv.r))) {
                continue;
            }
            for (let k = 0; k < 11; ++k) {
                c.shape.push(0.95 + random()*0.1);
            }
            c.rock = ore_node_new({x, y, r, hp, max_hp: hp, type: 'cliff', field: -1, angle: fall, flash: 0});
            cliffs.push(c);
            break;
        }
    }
    cliffs = edited || cliffs;
    // the ground under a cliff and down its fall is bare: what lies there is the rubble, once it falls; a map file's
    // rocks lie where the author put them
    ore_nodes = map_file_list('fields') ? ore_nodes : ore_nodes.filter(v => cliffs.every(vv => (distance(v, vv.rock) > v.r + vv.rock.r + 40) && !cliff_zone_has(vv, v, v.r)));
    ore_nodes.push(...cliffs.map(v => v.rock));
    drifting_debris = drifting_debris.filter(v => cliffs.every(vv => distance(v, vv.rock) > v.r + vv.rock.r + 40));
}

// A point of a cliff's fall: `along` its way from the cliff's middle, `side` to its left (−) or right (+)
function cliff_point(c, along, side)
{
    const ux = Math.cos(c.fall);
    const uy = Math.sin(c.fall);
    return {x: c.rock.x + ux*along - uy*side, y: c.rock.y + uy*along + ux*side};
}

// Whether v (with its radius r) is in a cliff's fall zone
function cliff_zone_has(c, v, r = 0)
{
    const ux = Math.cos(c.fall);
    const uy = Math.sin(c.fall);
    const dx = v.x - c.rock.x;
    const dy = v.y - c.rock.y;
    const along = dx*ux + dy*uy;
    const end = c.rock.r + cliff_reach;
    if ((along < -r) || (along > end + r)) {
        return false;
    }
    return Math.abs(dy*ux - dx*uy) < c.rock.r + cliff_spread*clamp(along/end, 0, 1) + r;
}

// The raiders in a cliff's fall zone now
function cliff_under(c)
{
    let n = 0;
    for (let i = 0, end = enemies.length; i < end; ++i) {
        const v = enemies[i];
        if ((v.hp > 0) && cliff_zone_has(c, v, v.r)) {
            n++;
        }
    }
    return n;
}

// Your shots (and pulse, and missiles) on a cliff: down to primed, and past it only while the guns aim at it; broken,
// it rumbles and then falls. The hull stays at 1 for the rumble, so the cliff is still there, solid, until it comes
// down.
function cliff_damage(v, amount)
{
    const c = cliffs.find(vv => vv.rock === v);
    if (!c || (v.hp <= 0) || (c.rumble > 0)) {
        return;
    }
    v.hp = Math.max((cliff_aim === v) ? 0 : Math.min(v.hp, v.max_hp*cliff_primed), v.hp - amount);
    v.flash = 0.1;
    if (v.hp > 0) {
        return;
    }
    v.hp = 1;
    c.rumble = cliff_rumble;
    shake = Math.max(shake, 6);
    const middle = cliff_point(c, (v.r + cliff_reach)/2, 0);
    ring(middle.x, middle.y, cliff_colors.fall, (v.r + cliff_reach)/2, cliff_rumble);
    label(v.x, v.y - v.r - 24, 'ROCKFALL', cliff_colors.warn);
    burst(v.x, v.y, cliff_colors.rim, 30, 160);
    sfx('mine', 1, v);
}

// Once a frame in an arcade run: a rumbling cliff shakes the view and falls when its rumble ends; a falling one runs
// down its zone
function cliffs_update(dt)
{
    for (const c of cliffs) {
        if (c.rumble > 0) {
            c.rumble -= dt;
            shake = Math.max(shake, 5);
            if (c.rumble <= 0) {
                cliff_fall_start(c);
            }
        }
        else if (c.front !== null) {
            cliff_fall_update(c, dt);
        }
    }
}

// The fall begins: the cliff is gone, the rock comes down from its foot
function cliff_fall_start(c)
{
    c.rock.hp = 0;
    c.front = 0;
    c.marks = 0;
    c.landed = 0;
    c.hit = [];
    c.crushed = 0;
    shake = Math.max(shake, 20);
    sfx('kill', 1, c.rock);
}

// The fall's front runs down the zone (an area effect travels: docs/principles.md): what it reaches is crushed, you
// too, and the rubble lands behind it; at the far end the raiders crushed pay, the rock's salvage lies in the zone
function cliff_fall_update(c, dt)
{
    const v = c.rock;
    const end = v.r + cliff_reach;
    c.front = Math.min(end, c.front + cliff_fall_pace*dt);
    const ux = Math.cos(c.fall);
    const uy = Math.sin(c.fall);
    for (; (c.marks <= 4) && ((c.marks/4)*end <= c.front); ++c.marks) {
        const p = cliff_point(c, (c.marks/4)*end, 0);
        explode(p.x, p.y, v.r*(1.1 - c.marks*0.12), '#c9924e', 0, 'rock');
        burst(p.x, p.y, cliff_colors.rim, 16, 260);
    }
    for (const enemy of enemies.slice()) {
        if ((enemy.hp <= 0) || c.hit.includes(enemy) || ((enemy.x - v.x)*ux + (enemy.y - v.y)*uy > c.front + enemy.r) || !cliff_zone_has(c, enemy, enemy.r)) {
            continue;
        }
        c.hit.push(enemy);
        const share = (enemy.type === 'boss') ? cliff_crush_flagship : (cliff_heavy.includes(enemy.type) || enemy.elite) ? cliff_crush_heavy : cliff_crush;
        damage_enemy(enemy, share*(enemy.max_hp + (enemy.max_shield || 0)));
        c.crushed += (enemy.hp <= 0) ? 1 : 0;
    }
    if (!c.hit.includes(player) && ((player.x - v.x)*ux + (player.y - v.y)*uy <= c.front + player.r) && cliff_zone_has(c, player, player.r)) {
        c.hit.push(player);
        damage_player(cliff_hit, true, 'rockfall');
    }
    for (; (c.landed < c.rubble.length) && (c.rubble[c.landed].along <= c.front); ++c.landed) {
        cliff_rubble_land(c.rubble[c.landed]);
    }
    if (c.front < end) {
        return;
    }
    c.front = null;
    const middle = cliff_point(c, end/2, 0);
    for (let k = 0; k < cliff_salvage + c.crushed; ++k) {
        drop_pickup(middle.x + rand(-60, 60), middle.y + rand(-60, 60), 'artifact', 4 + Math.floor(wave/5));
    }
    if (c.crushed) {
        const bonus = cliff_points*c.crushed*c.crushed;
        score += bonus;
        label(middle.x, middle.y - 30, `CRUSHED ×${c.crushed}`, gold);
        show_toast(`CRUSHED ×${c.crushed}`, `+${bonus} SCORE · THE ROCK TOOK THEM`, 2.5, 'income');
    }
}

// A piece of rubble lands, a rock as any other, unless a rock lies there already; a pickup it fell on lies beside it
function cliff_rubble_land(piece)
{
    if (ore_nodes.some(v => (v.hp > 0) && (distance(v, piece) < v.r + piece.r))) {
        return;
    }
    const hp = 30 + piece.r + wave*3;
    ore_nodes.push(ore_node_new({x: piece.x, y: piece.y, r: piece.r, hp, max_hp: hp, type: 'rubble', field: -1, angle: piece.x + piece.y, flash: 0}));
    for (const v of pickups) {
        const d = distance(v, piece);
        if (d < piece.r + 8) {
            v.x = piece.x + (d ? (v.x - piece.x)/d : 1)*(piece.r + 10);
            v.y = piece.y + (d ? (v.y - piece.y)/d : 0)*(piece.r + 10);
        }
    }
}

// The cliff the guns turn to now, or null: one you point at, or one with raiders under it (one is enough once it is
// primed) whose zone you are out of, within reach of its face, the nearest
function cliff_target()
{
    const pointed = pointer.active && (time - pointer.last < 2) && !mouse_drive.active && !mouse_drive.following;
    let out = null;
    let near = cliff_aim_reach;
    for (const c of cliffs) {
        const v = c.rock;
        const d = distance(v, player) - v.r;
        if ((v.hp <= 0) || (c.rumble > 0) || (d >= near)) {
            continue;
        }
        if (!(pointed && (distance(pointer, v) < v.r))) {
            if (cliff_zone_has(c, player, player.r + cliff_aim_margin) || (cliff_under(c) < ((v.hp <= v.max_hp*cliff_primed) ? 1 : cliff_aim_least))) {
                continue;
            }
        }
        near = d;
        out = v;
    }
    return out;
}

// Whether the guns may wear a cliff with nothing else near: down to primed, and never one you are under
function cliff_idle_target(v)
{
    const c = cliffs.find(vv => vv.rock === v);
    return !!c && (v.hp > v.max_hp*cliff_primed) && (c.rumble <= 0) && !cliff_zone_has(c, player, player.r + cliff_aim_margin);
}

// Where a Dustfall squadron warps in under a cliff, or null: a third of the way down the zone of the nearest standing
// cliff that far from you, when you are out of its zone, for a share of the squadrons
function cliff_squad_spot()
{
    if (!cliffs.length || (Math.random() >= cliff_squad_share)) {
        return null;
    }
    let out = null;
    let near = cliff_squad_range[1];
    for (const c of cliffs) {
        const p = cliff_point(c, c.rock.r + cliff_reach/3, 0);
        const d = distance(p, player);
        if ((c.rock.hp > 0) && (c.rumble <= 0) && (d > cliff_squad_range[0]) && (d < near) && !cliff_zone_has(c, player, player.r + 100)) {
            near = d;
            out = p;
        }
    }
    return out;
}

// The run's arrival in Dustfall says once what its cliffs are for
function cliffs_hint()
{
    if (cliffs.length) {
        show_toast('CLIFFS', 'SHOOT A CLIFF\'S CRACK · THE ROCK FALLS ON WHAT IS UNDER IT', 4);
    }
}

// The fall zones under everything: the ground a cliff would fall on, faint; warmer with raiders under it, red and
// pulsing while it rumbles and falls. Chevrons point the way it falls.
function render_cliff_zones()
{
    for (const c of cliffs) {
        const v = c.rock;
        if (((v.hp <= 0) && (c.front === null)) || !in_view(cliff_point(c, (v.r + cliff_reach)/2, 0), v.r + cliff_reach)) {
            continue;
        }
        const end = v.r + cliff_reach;
        const corners = [cliff_point(c, 0, -v.r), cliff_point(c, end, -v.r - cliff_spread), cliff_point(c, end, v.r + cliff_spread), cliff_point(c, 0, v.r)];
        const rumbling = (c.rumble > 0) || (c.front !== null);
        const under = !rumbling && (cliff_under(c) > 0);
        const color = rumbling ? cliff_colors.fall : under ? cliff_colors.warn : cliff_colors.crack;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (const p of corners.slice(1)) {
            ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.globalAlpha = rumbling ? 0.16 + 0.12*Math.sin(clock*40) : under ? 0.1 : 0.05;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = rumbling ? 0.9 : under ? 0.55 : 0.3;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5/zoom;
        ctx.setLineDash([14/zoom, 10/zoom]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 2/zoom;
        for (let k = 1; k <= 3; ++k) {
            const along = v.r + (k/4)*cliff_reach;
            const w = (v.r + cliff_spread*along/end)*0.35;
            const tip = cliff_point(c, along + 18, 0);
            const left = cliff_point(c, along - 10, -w);
            const right = cliff_point(c, along - 10, w);
            ctx.beginPath();
            ctx.moveTo(left.x, left.y);
            ctx.lineTo(tip.x, tip.y);
            ctx.lineTo(right.x, right.y);
            ctx.stroke();
        }
        ctx.restore();
    }
}

// A cliff: its shadow cast down its fall, a dark foot, the face leaning out the way it falls with its lit rim and
// strata, and the crack across its foot, glowing more as it gives (bright and pulsing once primed); the bar over it
// once hit. It shakes while it rumbles.
function render_cliffs()
{
    for (const c of cliffs) {
        const v = c.rock;
        if ((v.hp <= 0) || !in_view(v, v.r + 40)) {
            continue;
        }
        const quake = (c.rumble > 0) ? Math.sin(clock*70)*4 : 0;
        const worn = 1 - v.hp/v.max_hp;
        ctx.save();
        ctx.translate(v.x + quake, v.y);
        ctx.rotate(c.fall);
        ctx.fillStyle = '#00000066';
        ctx.beginPath();
        ctx.ellipse(v.r*0.45, 0, v.r*1.05, v.r*0.9, 0, 0, Math.PI*2);
        ctx.fill();
        cliff_outline(c, 1, 0);
        ctx.fillStyle = cliff_colors.dark;
        ctx.fill();
        ctx.strokeStyle = '#120804';
        ctx.lineWidth = 3/zoom;
        ctx.stroke();
        // the face, leaning out over the fall
        cliff_outline(c, 0.86, v.r*0.16);
        const g = ctx.createLinearGradient(-v.r, 0, v.r, 0);
        g.addColorStop(0, cliff_colors.top);
        g.addColorStop(1, cliff_colors.face);
        ctx.fillStyle = (v.flash > 0) ? '#b8754a' : g;
        ctx.fill();
        ctx.strokeStyle = cliff_colors.rim;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 2/zoom;
        ctx.stroke();
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = cliff_colors.dark;
        for (let k = -1; k <= 1; ++k) {
            ctx.beginPath();
            ctx.arc(-v.r*0.9, k*v.r*0.25, v.r*(1.15 + k*0.05), -0.5, 0.5);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // the crack across the foot, on the side it falls from
        const primed = v.hp <= v.max_hp*cliff_primed;
        ctx.beginPath();
        for (let k = 0; k <= 6; ++k) {
            const y = (k/6 - 0.5)*v.r*1.5;
            const x = -v.r*0.2 + ((k % 2) ? 1 : -1)*v.r*0.07;
            if (k) {
                ctx.lineTo(x, y);
            }
            else {
                ctx.moveTo(x, y);
            }
        }
        ctx.strokeStyle = '#120804';
        ctx.lineWidth = (5 + worn*8)/zoom;
        ctx.stroke();
        ctx.strokeStyle = cliff_colors.crack;
        ctx.globalAlpha = primed ? 0.65 + 0.35*Math.sin(clock*8) : 0.35 + worn*0.6;
        ctx.lineWidth = (1.5 + worn*3)/zoom;
        ctx.shadowColor = cliff_colors.crack;
        ctx.shadowBlur = full_fx ? 6 + worn*14 : 0;
        ctx.stroke();
        ctx.restore();
        if (v.hp < v.max_hp) {
            const w = v.r*1.2;
            ctx.fillStyle = '#0b1222';
            ctx.fillRect(v.x - w/2, v.y - v.r - 14, w, 4);
            ctx.fillStyle = primed ? cliff_colors.warn : gold;
            ctx.fillRect(v.x - w/2, v.y - v.r - 14, w*v.hp/v.max_hp, 4);
        }
    }
}

// A cliff's outline as a path, scaled and pushed along its fall (in the cliff's own turned frame)
function cliff_outline(c, scale, shift)
{
    const n = c.shape.length;
    ctx.beginPath();
    for (let k = 0; k < n; ++k) {
        const a = (k/n)*Math.PI*2;
        const r = c.rock.r*c.shape[k]*scale;
        if (k) {
            ctx.lineTo(shift + Math.cos(a)*r, Math.sin(a)*r);
        }
        else {
            ctx.moveTo(shift + Math.cos(a)*r, Math.sin(a)*r);
        }
    }
    ctx.closePath();
}
