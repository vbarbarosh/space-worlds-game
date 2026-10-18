// Packs: an arcade squadron hunts together instead of each raider steering straight at you. One flies for where you
// will be, to cut you off; two swing out to your flanks; the rest come in from behind you. Close by, each fights as its
// type does. Hold still or circle in one place and they close a ring round you, with gaps between them to break out
// through, its round drawn; closed, it holds a few seconds and breaks, and they fight close as their types do; fly
// out of it and they hunt again. The run's steps ease you in (pack_flanks, pack_rings): Haven's packs come from its second
// wave, with a cut-off and the rest from behind, no flanks and no ring; the second step's ring you, but no flanks yet, as
// flanking was kept from both before; the rail worlds (Obsidian, Eclipse), where a slug crosses the screen in a
// quarter second, have neither.
// Raiders with jobs keep to their own (arcade_raiders.js); an elite keeps its trick, an escort its leader, a lurker
// its rock.

// the types that hunt in a pack, and the fewest that make one
const pack_types = ['chaser', 'shooter', 'splitter', 'lancer'];
const pack_least = 3;
// By the run's step (arcade_level: Haven 0, Obsidian 4, Eclipse 7 whatever the route): whether two of a pack take your flanks, and whether a pack rings you when you hold still
const pack_flanks = [false, false, true, true, false, true, true, false];
const pack_rings = [false, true, true, true, false, true, true, false];
// how far out a flank swings, how far behind you the rest come in, and the distance from which each fights as its type
const pack_flank = 300;
const pack_rear = 220;
const pack_engage = {shooter: 340, chaser: 300, splitter: 300, lancer: 300};
// a cutter far from you flies this much faster: it is cutting across, not chasing
const pack_cut_pace = 1.2;
// Where you were, every half second: held within this round for this long (CHILL longer), you are boxed in place,
// and a pack within reach closes its ring
const pack_watch_every = 0.5;
const pack_watch_round = 300;
const pack_watch_time = {chill: 6, normal: 4, overload: 3.5};
const pack_ring_reach = 1200;
// The ring: it starts at its first round (or as far as its raiders are, 600 m at most), closes to its last at its
// pace and turns slowly; closed, it holds a few seconds (CHILL fewer), then breaks and its raiders fight as their types
// do; the pack rings you again no sooner than a while after. It opens at once when you are this far out of it.
const pack_ring = {chill: [360, 270], normal: [330, 230], overload: [310, 210]};
const pack_ring_close = 30;
const pack_ring_spin = 0.22;
const pack_ring_hold = {chill: 2, normal: 3, overload: 3.5};
const pack_ring_rest = {chill: 14, normal: 10, overload: 9};
const pack_ring_out = 150;

let pack_groups = [];
const pack_watch = {t: 0, samples: [], boxed: false, x: 0, y: 0};
let pack_ring_hint = false;

// A world begun: no packs, nowhere you were; a new run (`run`) shows the ring's toast again
function pack_reset(run)
{
    pack_groups = [];
    if (run) {
        pack_ring_hint = false;
    }
    pack_watch.t = 0;
    pack_watch.samples = [];
    pack_watch.boxed = false;
}

// A squadron as a pack (raider_squad_after): its raiders of the pack's types; too few, and none; none in Haven's first
// wave, its scouts
function pack_form(squad)
{
    if ((arcade_level() === 0) && (arcade.wave < 2)) {
        return;
    }
    const members = squad.filter(v => pack_types.includes(v.type) && !v.elite && !v.guard && !v.lurk && !v.anchor && !v.event_goal);
    if (members.length < pack_least) {
        return;
    }
    const group = {members, mode: 'hunt', x: 0, y: 0, radius: 0, spin: 0, count: 0, hold: 0, rest: 0};
    for (let i = 0; i < members.length; ++i) {
        members[i].pack = {group, role: 'rear', side: 0, slot: 0};
    }
    pack_groups.push(group);
    pack_roles(group, new Set(members));
}

// The roles by the pack's raiders still in the fight (`here`: the raiders on the map; one taken off it is out of the
// fight without a kill), in their order: the first cuts you off, the next two take a flank each (in a world of
// flanks), the rest come from behind; a ring's slots in the same order
function pack_roles(group, here)
{
    const alive = group.members.filter(v => (v.hp > 0) && here.has(v));
    group.members = alive;
    group.count = alive.length;
    for (let i = 0; i < alive.length; ++i) {
        const p = alive[i].pack;
        p.slot = i;
        p.role = (i === 0) ? 'cut' : ((i <= 2) && pack_flanks[arcade_level()]) ? 'flank' : 'rear';
        p.side = (i === 1) ? -1 : 1;
    }
}

// Called from raider_jobs_update: where you have been, the packs' roles, and their rings
function pack_update(dt)
{
    pack_watch.t -= dt;
    if (pack_watch.t <= 0) {
        pack_watch.t = pack_watch_every;
        pack_watch_sample();
    }
    const here = pack_groups.length ? new Set(enemies) : null;
    for (const group of pack_groups) {
        if (group.members.some(v => (v.hp <= 0) || !here.has(v))) {
            pack_roles(group, here);
        }
        group.rest = Math.max(0, group.rest - dt);
        if (group.mode === 'ring') {
            pack_ring_update(group, dt);
        }
        else if (pack_watch.boxed && pack_rings[arcade_level()] && !group.rest && (group.count >= pack_least) && group.members.some(v => distance(v, player) < pack_ring_reach)) {
            pack_ring_start(group);
        }
    }
    pack_groups = pack_groups.filter(v => v.count > 0);
}

// One more of where you were; boxed when every one of the time's samples lies within the round of their middle
function pack_watch_sample()
{
    const keep = Math.round((pack_watch_time[difficulty] || pack_watch_time.normal)/pack_watch_every);
    pack_watch.samples.push({x: player.x, y: player.y});
    if (pack_watch.samples.length > keep) {
        pack_watch.samples.shift();
    }
    let x = 0;
    let y = 0;
    for (const v of pack_watch.samples) {
        x += v.x/pack_watch.samples.length;
        y += v.y/pack_watch.samples.length;
    }
    pack_watch.x = x;
    pack_watch.y = y;
    pack_watch.boxed = (pack_watch.samples.length >= keep) && pack_watch.samples.every(v => Math.hypot(v.x - x, v.y - y) < pack_watch_round);
}

function pack_ring_start(group)
{
    const sizes = pack_ring[difficulty] || pack_ring.normal;
    group.mode = 'ring';
    group.hold = pack_ring_hold[difficulty] || pack_ring_hold.normal;
    // a pack that comes while another rings you joins its ring, its raiders in the gaps between the other's
    const other = pack_groups.find(v => (v !== group) && (v.mode === 'ring') && (v.count > 0));
    if (other) {
        group.x = other.x;
        group.y = other.y;
        group.radius = other.radius;
        group.spin = other.spin + Math.PI/Math.max(other.count, group.count);
        return;
    }
    group.x = pack_watch.x;
    group.y = pack_watch.y;
    let far = 0;
    for (const v of group.members) {
        far += distance(v, group)/group.count;
    }
    group.radius = clamp(far, sizes[0], 600);
    group.spin = Math.atan2(group.members[0].y - group.y, group.members[0].x - group.x);
    if (!pack_ring_hint) {
        pack_ring_hint = true;
        show_toast('RING CLOSING', 'THEY BOX IN A SHIP THAT CIRCLES IN PLACE · BREAK OUT THROUGH A GAP', 3.5, 'danger');
    }
}

// The ring follows the middle of where you circle while you keep circling, closes to its last round and turns; held
// closed its while, you out of it, or too few left to close it, and the pack hunts again, resting from rings a while
function pack_ring_update(group, dt)
{
    const sizes = pack_ring[difficulty] || pack_ring.normal;
    const pull = pack_watch.boxed ? Math.min(1, dt*0.5) : 0;
    group.x += (pack_watch.x - group.x)*pull;
    group.y += (pack_watch.y - group.y)*pull;
    group.radius = Math.max(sizes[1], group.radius - pack_ring_close*dt);
    group.spin += pack_ring_spin*dt;
    if (group.radius <= sizes[1]) {
        group.hold -= dt;
    }
    if ((group.hold <= 0) || (distance(player, group) > group.radius + pack_ring_out) || (group.count < pack_least)) {
        group.mode = 'hunt';
        group.rest = pack_ring_rest[difficulty] || pack_ring_rest.normal;
    }
}

// A pack raider's way (arcade_role_steer), after its type has chosen one: in a ring, to its slot, then still there,
// turned to you; hunting, far from you, by its role, and close by as its type fights. A lancer winding up or charging
// keeps to its charge. Turns the raider and returns how fast it moves.
function arcade_pack_steer(v, move, d)
{
    const p = v.pack;
    const group = p.group;
    if ((v.type === 'lancer') && ((v.charge_time > 0) || (v.charge_cd < 0.7))) {
        return move;
    }
    if (group.mode === 'ring') {
        const a = group.spin + (p.slot*Math.PI*2)/group.count;
        const tx = group.x + Math.cos(a)*group.radius;
        const ty = group.y + Math.sin(a)*group.radius;
        const gap = Math.hypot(tx - v.x, ty - v.y);
        if (gap > 40) {
            v.angle = Math.atan2(ty - v.y, tx - v.x);
            return Math.min(1.3, gap/60);
        }
        v.angle = Math.atan2(player.y - v.y, player.x - v.x);
        return 0;
    }
    if (d < (pack_engage[v.type] || 300)) {
        return move;
    }
    // your way: where you fly, or, held still, from the pack's first raider toward you
    const speed = Math.hypot(player.vx, player.vy);
    const lead = group.members[0];
    const from = (lead && (lead !== v)) ? lead : v;
    const fd = Math.max(1, distance(from, player));
    const fx = (speed > 40) ? player.vx/speed : (player.x - from.x)/fd;
    const fy = (speed > 40) ? player.vy/speed : (player.y - from.y)/fd;
    let tx = player.x;
    let ty = player.y;
    if (p.role === 'cut') {
        const t = clamp(d/Math.max(1, v.speed), 0, 2.5);
        tx += player.vx*t;
        ty += player.vy*t;
    }
    else if (p.role === 'flank') {
        tx += -fy*p.side*pack_flank + player.vx*0.8;
        ty += fx*p.side*pack_flank + player.vy*0.8;
    }
    else {
        tx -= fx*pack_rear;
        ty -= fy*pack_rear;
    }
    v.angle = Math.atan2(ty - v.y, tx - v.x);
    return ((p.role === 'cut') && (d > 450)) ? pack_cut_pace : 1;
}

// A ring closing shows its round, faint and dashed, round the place you circle
function pack_render()
{
    if (!arcade.active) {
        return;
    }
    ctx.save();
    ctx.strokeStyle = '#ff4d5e';
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 2/zoom;
    ctx.setLineDash([18/zoom, 14/zoom]);
    ctx.beginPath();
    for (const group of pack_groups) {
        if ((group.mode === 'ring') && in_view(group, group.radius)) {
            ctx.moveTo(group.x + group.radius, group.y);
            ctx.arc(group.x, group.y, group.radius, 0, Math.PI*2);
        }
    }
    ctx.stroke();
    ctx.restore();
}
