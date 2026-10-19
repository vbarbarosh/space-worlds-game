// The Arcade's second kind, Scroll (the menu's Arcade row: Free or Scroll, T turns it): the same run of eight worlds,
// three waves, lives, depot and builds, flown on a screen that moves on by itself. Each world scrolls one way, forward
// (up the screen), back (down it), left or right (arcade_scroll_lanes), along a straight lane 12 to 16 km long, the world stretched
// along it (arcade_world_extent) with its rocks, caches, cliffs and storms spread along the way; your ship flies
// anywhere inside the view, and the back edge pushes it on. The screen moves at one speed all the way and stops only
// where the lane ends, for the flagship (the author, 2026-10-19: "the scroll speed should always be the same"). The
// raiders come from ahead, past the front edge, and fire only from inside the view; once in, none leaves it (the back
// edge carries it on). Wave 1 comes over the lane's first half, wave 2 over its second, each as the screen reaches
// it, the raiders of the one before still fighting; the flagship comes where the lane ends, on a screen that stands
// still, so a fight bound to a place (Obsidian's siege, Nova Forge's ring, Eclipse's hole) is fought as in Free. No
// portals on a lane (they would throw you out of the view), and no wave-2 event (each is a chase across open space).
// The depot comes between worlds only. With no shelter to fly back to, the radiation lining refills along the way.

// The kinds as the menu names them, and the line under the cards
const arcade_kinds = {
    free: {name: 'Free', note: 'Fly anywhere in the world; raiders come from every side; the station is the depot.'},
    scroll: {name: 'Scroll', note: 'The screen moves on by itself, up, down, left or right by the world; raiders come from ahead.'},
};
// The ways a lane goes, as a heading on the screen
const arcade_scroll_ways = {forward: {x: 0, y: -1}, back: {x: 0, y: 1}, left: {x: -1, y: 0}, right: {x: 1, y: 0}};
// Each world's lane, Haven to Eclipse (campaign.world): its way, two worlds each (the author: "not only left to
// right"), and where across the world it runs, a share of the world's width (forward, back) or height (left, right).
// Eclipse's hole stands beside its lane (hole: how far along it, a share, and how far to its side, m), not across its
// end: passed on the way, as the author would have it, its pull bending shots and taking raiders that chase you
const arcade_scroll_lanes = [
    {way: 'forward', across: 0.5},
    {way: 'right', across: 0.5},
    {way: 'back', across: 0.5},
    {way: 'left', across: 0.5},
    {way: 'forward', across: 0.5},
    {way: 'back', across: 0.5},
    {way: 'right', across: 0.5},
    {way: 'left', across: 0.5, hole: [0.75, -1200]},
];
// The share of the lane each wave's stretch ends at: the first half, the second, and the flagship where it ends
const arcade_scroll_stretches = [0.5, 1, 1];
// The screen's one pace, in m a second: a lane of 12 km under 3 min, of 16 km under 4 (at 54 m/s, 6 min a world; the
// author: "feels very boring")
const arcade_scroll_pace = 72;
// The middle worlds' lanes are busier: a wave brings this share more raiders, and this many more come at once, from
// the run's second step to its seventh; not in Haven, where the run's first ship would fall to them (the bot did in
// half its runs), nor in Eclipse, the hardest as it is (the author's run: a kill every 3 to 4 s, in Dustfall 3 to 11
// raider shots a minute and no hull lost)
const arcade_scroll_busy = 0.5;
const arcade_scroll_busy_crowd = 4;
// A formation (arcade_scroll_formation): the share of a lane's squadrons that come as one, as a line sweeping across
// the screen or as a V flying down the lane through it, and how fast each crosses the screen, m a second; its places
// this many m apart
const arcade_scroll_formations = 0.6;
const arcade_scroll_sweep = 170;
const arcade_scroll_dive = 150;
const arcade_scroll_rank = 85;
// A wave of a lane's stretch is the wave of a world in Free times its stretch over this many m: the raiders and what
// they drop keep a run's income near Free's (over 2.15 km, a wave's raiders when the lanes were short, it was 2.5
// times as much); at 2400 (30% more raiders) the bot lost 7 runs of 8, in the middle worlds too
const arcade_scroll_wave_m = 3100;
// The radiation lining refills every this many m of the lane, about every 40 s
const arcade_scroll_refill = 2200;
// The lane's ends keep this far from the world's edges, so the view at either end shows the world, not past it
const arcade_scroll_margin = 650;
// Your ship keeps this far inside the view's edges, beyond its halo
const arcade_scroll_inset = 14;
// A raider is kept this far inside the view's back and side edges, beyond its own radius; ahead it may be this far
// past the front edge, coming in
const arcade_scroll_leash = 8;
const arcade_scroll_ahead = 1400;
// A squadron waits while this many raiders are alive on a lane (in Free, 14): with no open space to spread them out
// in, a wave comes as a stream, not all at once (the bot lost Obsidian's and Eclipse's first waves to 17 at once)
const arcade_scroll_crowd = 12;
// The view never empties (the author, 2026-10-19: "killing them is fun, but when there are none it is boring", "as if
// I went out for a walk"): while fewer raiders than the floor (arcade_scroll_floor) are in play before the screen
// reaches its stretch's end, the wave's next squadron comes at once, at most this many s after the last, whatever
// the distance flown. The wave's raiders stay as many as they were: no reinforcements (the author: "the number of
// enemies should be fixed", not "the faster you work, the more work you are given")
const arcade_scroll_floor_base = 3;
const arcade_scroll_floor_gap = 2;
// A raider on a lane reloads this many times slower: every one of them is in the view, within reach of its gun, where
// in Free most are not (Obsidian's and Eclipse's raiders shot the bot down twice as often on a lane)
const arcade_scroll_reload = 1.1;
// A bulwark on a lane turns its shield to you this much slower (bulwark_turn): the view's edges cut short the circle
// that takes you round to its back, and a slow ship (the bot's tank build, a gunship or cruiser) never got round it,
// its wave held for hours of game time
const arcade_scroll_bulwark = 0.6;
// A squadron warps in this far past the front edge (a pincer's two lines at its two front corners)
const arcade_scroll_spawn = 160;
// kind: free or scroll, as the menu has it; on: a lane of a scroll run is flown; way: its heading; from: where the
// view's middle starts; length: the lane's length; s: how far along it the view's middle is; pace: m a second;
// held: the screen stands at the lane's end; refills: the lining's refills so far; rush: the factor on the pace now
// (arcade_scroll_rushing); idle: the seconds with nothing left to fight
const arcade_scroll = {kind: 'free', on: false, way: {x: 0, y: -1}, from: {x: 0, y: 0}, length: 0, s: 0, pace: 0, held: false, refills: 0, rush: 1, idle: 0};
// With nothing left to fight before the next wave (no raider in play, the wave's own all sent), the screen rushes on
// this many times its pace to where the next fight is, once no salvage lies in the view or after
// arcade_scroll_rush_wait s (the author, 2026-10-19: "a couple of seconds on an empty screen", after the last wave
// before the flagship, which waits at the lane's end)
const arcade_scroll_rush_k = 6;
const arcade_scroll_rush_wait = 4;

for (const v of document.querySelectorAll('#intro [data-arcade-kind]')) {
    v.addEventListener('click', () => arcade_kind_pick(v.dataset.arcadeKind));
}
arcade_kind_pick(arcade_scroll.kind);

// The menu's kind: its card lit, its line, and the best of that kind (one best each: a score in one says nothing of
// the other)
function arcade_kind_pick(kind)
{
    arcade_scroll.kind = arcade_kinds[kind] ? kind : 'free';
    for (const v of document.querySelectorAll('#intro [data-arcade-kind]')) {
        v.classList.toggle('selected', v.dataset.arcadeKind === arcade_scroll.kind);
        v.setAttribute('aria-pressed', String(v.dataset.arcadeKind === arcade_scroll.kind));
    }
    document.getElementById('arcade_kind_note').textContent = arcade_kinds[arcade_scroll.kind].note;
    menu_try_sync();
    try {
        best = Number(localStorage.getItem(arcade_best_key())) || 0;
    }
    catch {
    }
    menu_best_sync();
}

// Where the best of the kind picked is kept
function arcade_best_key()
{
    return (arcade_scroll.kind === 'scroll') ? 'pulse_drift_best_scroll' : 'pulse_drift_best';
}

// A lane is flown: an arcade run of the Scroll kind, in a world
function arcade_scroll_on()
{
    return arcade.active && arcade_scroll.on && !!player;
}

// A world of a scroll run begins (arcade_update): its lane, the view at its start, you at the back of the view facing
// the way
function arcade_scroll_world_start()
{
    arcade_scroll.on = arcade.active && (arcade_scroll.kind === 'scroll');
    if (!arcade_scroll.on) {
        return;
    }
    const lane = arcade_scroll_lanes[campaign.world] || arcade_scroll_lanes[0];
    const way = arcade_scroll_ways[lane.way];
    const m = arcade_scroll_margin;
    arcade_scroll.way = way;
    if (way.y) {
        arcade_scroll.from = {x: world.w*lane.across, y: (way.y < 0) ? world.h - m : m};
        arcade_scroll.length = world.h - 2*m;
    }
    else {
        arcade_scroll.from = {x: (way.x > 0) ? m : world.w - m, y: world.h*lane.across};
        arcade_scroll.length = world.w - 2*m;
    }
    arcade_scroll.s = 0;
    arcade_scroll.refills = 0;
    arcade_scroll.pace = arcade_scroll_pace;
    // nothing on a lane leaves the view at once: no portals, for you or the raiders; no course to the station
    portals = [];
    waypoint = null;
    arcade_scroll.held = false;
    arcade_scroll.rush = 1;
    arcade_scroll.idle = 0;
    const back = arcade_scroll_view();
    player.x = arcade_scroll.from.x - way.x*back.h*0.3;
    player.y = arcade_scroll.from.y - way.y*back.h*0.3;
    player.vx = 0;
    player.vy = 0;
    player.angle = Math.atan2(way.y, way.x);
    player.turret_angle = player.angle;
    mouse_drive.active = false;
    update_camera(0, true);
}

// The view's middle now, and its half sizes along the way (h) and across it (w), in world m: the lane's point, the view
// kept inside the world (zoomed far out, a lane's end shows no more than the world's edge)
function arcade_scroll_view()
{
    const vw = W/zoom;
    const vh = H/zoom;
    const way = arcade_scroll.way;
    const x = clamp(arcade_scroll.from.x + way.x*arcade_scroll.s - vw/2, 0, Math.max(0, world.w - vw));
    const y = clamp(arcade_scroll.from.y + way.y*arcade_scroll.s - vh/2, 0, Math.max(0, world.h - vh));
    return {x: x + vw/2, y: y + vh/2, h: (way.y ? vh : vw)/2, w: (way.y ? vw : vh)/2};
}

// Each frame of a lane (update, before the camera): the screen moves on at its one pace to the lane's end, the lining
// refills along the way, then your ship is kept inside the view
function arcade_scroll_update(dt)
{
    if (!arcade_scroll_on()) {
        return;
    }
    arcade_scroll.rush = arcade_scroll_rushing(dt) ? arcade_scroll_rush_k : 1;
    arcade_scroll.s = Math.min(arcade_scroll.length, arcade_scroll.s + arcade_scroll.pace*arcade_scroll.rush*dt);
    arcade_scroll.held = arcade_scroll.s >= arcade_scroll.length;
    const refills = Math.floor(arcade_scroll.s/arcade_scroll_refill);
    if (refills > arcade_scroll.refills) {
        arcade_scroll.refills = refills;
        player.radiation_dose = 0;
    }
    arcade_scroll_keep(player, ship_halo() + arcade_scroll_inset, 0, true);
    arcade_scroll_pickups();
    // and never under the HUD's blocks (the bottom panel, the card, the minimap): where it would come under one it
    // slides out toward the middle of the screen, as a race's view does (race_view_place)
    arcade_scroll_camera();
    const k = zoom*scale;
    const r = (ship_halo() + arcade_scroll_inset)*k;
    const home = race_view_home(r);
    const at = race_view_place(ox + (player.x - camera.x)*k, oy + (player.y - camera.y)*k, home.x, home.y, r);
    player.x = camera.x + (at.x - ox)/k;
    player.y = camera.y + (at.y - oy)/k;
}

// The screen rushes on now (arcade_scroll_rush_k): nothing left to fight before the next wave, and no salvage in the
// view, or none picked up for arcade_scroll_rush_wait s
function arcade_scroll_rushing(dt)
{
    const empty = (arcade.wave >= 1) && (arcade.wave < arcade_waves) && (spawn_left <= 0) && !enemies.some(v => v.hp > 0);
    arcade_scroll.idle = empty ? arcade_scroll.idle + dt : 0;
    return empty && (!pickups.some(v => !arcade_scroll_unseen(v)) || (arcade_scroll.idle > arcade_scroll_rush_wait));
}

// Salvage, repairs and caches the back edge has passed are gone (the author, 2026-10-19: they piled up along the
// bottom edge, under the panel; "better they vanish, if I don't make it in time, than all gather on the edge"). What
// lies beside the view is left where it is. While the screen rushes on (arcade_scroll_rushing) what comes into the
// view is drawn to you, so a rush skips the empty way, not its caches: without that, the bot came to its depots with
// a quarter less and won 1 run of 8
function arcade_scroll_pickups()
{
    const view = arcade_scroll_view();
    const way = arcade_scroll.way;
    for (let i = pickups.length - 1; i >= 0; --i) {
        const v = pickups[i];
        const along = (v.x - view.x)*way.x + (v.y - view.y)*way.y;
        if (along < -view.h - arcade_scroll_gone) {
            pickups.splice(i, 1);
        }
        else if ((arcade_scroll.rush > 1) && !arcade_scroll_unseen(v)) {
            v.x = player.x;
            v.y = player.y;
        }
    }
}

// Where wave n's stretch of the lane ends, in m along it (0 before the first)
function arcade_scroll_end(n)
{
    return (n < 1) ? 0 : arcade_scroll.length*arcade_scroll_stretches[Math.min(n, arcade_waves) - 1];
}

// The seconds to the lining's next refill on a lane (radiation_alert); none past the lane's end
function arcade_scroll_refill_in()
{
    const next = (arcade_scroll.refills + 1)*arcade_scroll_refill;
    return (next > arcade_scroll.length) ? null : (next - arcade_scroll.s)/arcade_scroll.pace;
}

// Whether wave n may begin (arcade_update): off a lane always; on one, once the screen has come to where the wave
// before it ended, so the flagship's wave waits for the lane's end
function arcade_scroll_ready(n)
{
    return !arcade_scroll_on() || (arcade_scroll.s >= arcade_scroll_end(n - 1));
}

// The next wave of a lane comes as the screen reaches its stretch (arcade_update), whether the one before is down or
// not: its raiders still fight on; or sooner, when the one before has sent all its own and the view runs short of
// raiders (arcade_scroll_floor), so a quick pilot does not fly an empty stretch to it (the author's screenshot: "Wave
// clear: the screen moves on to the next" over an empty screen). Not the flagship's: it waits for the lane's end; nor
// in the run's last world, whose second wave is the run's strongest raiders and meets Eclipse's hole on the way:
// brought on before it, the bot lost every run of 8 there. True when it came
function arcade_scroll_waves()
{
    if (!arcade_scroll_on() || (arcade.wave >= arcade_waves)) {
        return false;
    }
    const early = (spawn_left <= 0) && (arcade.wave + 1 < arcade_waves) && (arcade_level() < arcade_worlds - 1) && (enemies.filter(v => v.hp > 0).length < arcade_scroll_floor());
    if ((arcade_scroll.s < arcade_scroll_end(arcade.wave)) && !early) {
        return false;
    }
    arcade.pause = 0;
    arcade_wave_start(arcade.wave + 1);
    return true;
}

// How much busier the run's step makes a lane: 1 + arcade_scroll_busy between the first step and the last, else 1
function arcade_scroll_busy_k()
{
    const step = arcade_level();
    return ((step > 0) && (step < arcade_worlds - 1)) ? 1 + arcade_scroll_busy : 1;
}

// How many raiders may be alive on a lane before a squadron waits (arcade_squads_update)
function arcade_scroll_crowd_now()
{
    return arcade_scroll_crowd + Math.round(arcade_scroll_busy_crowd*(arcade_scroll_busy_k() - 1)/arcade_scroll_busy);
}

// How many raiders a lane keeps in play: 3 in the first wave, 4 in the second, in every world: the later worlds' own
// squadrons, bigger and closer together, fill their lanes past it anyway (with one more every two steps of the run,
// the bot had 6 to 9 in play from Obsidian on and lost every run; with 5 and two more, it fell in Haven, 7 in play
// on average where it had 2)
function arcade_scroll_floor()
{
    return arcade_scroll_floor_base + (arcade.wave - 1);
}

// A lane's wave is short of raiders: fewer than its floor in play, and the screen not yet at its stretch's end (the
// flagship's wave as in Free)
function arcade_scroll_short(alive)
{
    if (!arcade_scroll_on() || (arcade.wave < 1) || (arcade.wave >= arcade_waves)) {
        return false;
    }
    return (alive < arcade_scroll_floor()) && (arcade_scroll.s < arcade_scroll_end(arcade.wave));
}

// A squadron as a formation on a lane (arcade_squad_form), arcade_scroll_formations of the time; false when it comes
// as it would anyway. A sweep: a line coming in at one side of the screen's front half and flying across it to the
// other; a V: its point ahead, flying down the lane through the screen against its way. Each raider fires as it does
// anywhere; the formation keeps its places, and a raider of it is gone once it has flown out of the view.
function arcade_scroll_formation(type, size, elite, mix)
{
    if (Math.random() >= arcade_scroll_formations) {
        return false;
    }
    const view = arcade_scroll_view();
    const way = arcade_scroll.way;
    function place(along, across) {
        return {x: view.x + way.x*along - way.y*across, y: view.y + way.y*along + way.x*across};
    }
    const sweep = Math.random() < 0.55;
    const side = (Math.random() < 0.5) ? -1 : 1;
    const row = view.h*rand(0.15, 0.7);
    for (let i = 0; i < size; ++i) {
        const kind = (mix && (i % 2 === 1)) ? mix : type;
        // the V's places: its point, then left and right of it, a rank back each
        const k = Math.ceil(i/2)*((i % 2) ? -1 : 1);
        const p = sweep ? place(row, side*(view.w + 60 + i*arcade_scroll_rank)) : place(view.h + 120 + Math.abs(k)*arcade_scroll_rank*0.8, k*arcade_scroll_rank);
        const enemy = arcade_squad_warp(kind, p.x, p.y, i);
        // its own way over the screen's, in the world
        const rx = sweep ? -way.y*-side*arcade_scroll_sweep : -way.x*arcade_scroll_dive;
        const ry = sweep ? way.x*-side*arcade_scroll_sweep : -way.y*arcade_scroll_dive;
        enemy.path = {rx, ry, entered: false};
        if (elite && (i === 0)) {
            arcade_elite_make(enemy);
        }
    }
    return true;
}

// A formation's raider on a lane (arcade_role_steer): flies the screen's way at its pace and its own across it, at
// whatever speed that takes; returns the move as a share of its speed
function arcade_scroll_path_steer(v)
{
    const pace = arcade_scroll.held ? 0 : arcade_scroll.pace;
    const vx = arcade_scroll.way.x*pace + v.path.rx;
    const vy = arcade_scroll.way.y*pace + v.path.ry;
    v.angle = Math.atan2(vy, vx);
    return Math.hypot(vx, vy)/Math.max(1, v.speed);
}

// Whether a lane's next squadron may come (arcade_squads_update): its wave's raiders are spread over its stretch, so
// one comes only once the screen is far enough along it for what is still to come (a whole wave came in its first
// 30 s, and the screen then flew 45 s through nothing); off a lane, always
function arcade_scroll_squad_due()
{
    if (!arcade_scroll_on() || (arcade.wave >= arcade_waves)) {
        return true;
    }
    const start = arcade_scroll_end(arcade.wave - 1);
    const progress = clamp((arcade_scroll.s - start)/Math.max(1, arcade_scroll_end(arcade.wave) - start), 0, 1);
    return spawn_left > (arcade.wave_total || 0)*(1 - progress) - 0.5;
}

// How many raiders a wave of a lane brings: the world's wave in Free (base) times its stretch over arcade_scroll_wave_m;
// the flagship's wave as in Free
function arcade_scroll_wave_size(n, base)
{
    if (!arcade_scroll_on() || (n >= arcade_waves)) {
        return base;
    }
    const stretch = arcade_scroll_end(n) - arcade_scroll_end(n - 1);
    return Math.round(base*stretch/arcade_scroll_wave_m*arcade_scroll_busy_k());
}

// Keeps a ship within the view, `side` m in from its edges, and as far ahead as `ahead` past the front edge; for
// your ship (moving: it has a speed of its own), a speed out through an edge is stopped there, and the back edge
// carries it on at the screen's pace
// free_behind: the back edge does not hold it (a raider, which is gone once past it: arcade_scroll_raiders)
function arcade_scroll_keep(v, side, ahead, moving, free_behind = false)
{
    const view = arcade_scroll_view();
    const way = arcade_scroll.way;
    // the ship's place along the way (+ ahead) and across it, from the view's middle
    const dx = v.x - view.x;
    const dy = v.y - view.y;
    const along = dx*way.x + dy*way.y;
    const across = dy*way.x - dx*way.y;
    const a = clamp(along, free_behind ? -Infinity : -view.h + side, view.h - side + ahead);
    const c = clamp(across, -view.w + side, view.w - side);
    if ((a === along) && (c === across)) {
        return;
    }
    v.x = view.x + way.x*a - way.y*c;
    v.y = view.y + way.y*a + way.x*c;
    if (!moving) {
        return;
    }
    const va = v.vx*way.x + v.vy*way.y;
    const vc = v.vy*way.x - v.vx*way.y;
    const pace = arcade_scroll.held ? 0 : arcade_scroll.pace*arcade_scroll.rush;
    const na = (a > along) ? Math.max(va, pace) : (a < along) ? Math.min(va, pace) : va;
    const nc = (c !== across) ? 0 : vc;
    v.vx = way.x*na - way.y*nc;
    v.vy = way.y*na + way.x*nc;
}

// The camera on a lane (update_camera): on the view
function arcade_scroll_camera()
{
    const view = arcade_scroll_view();
    camera.x = view.x - W/zoom/2;
    camera.y = view.y - H/zoom/2;
}

// The raiders of a lane (arcade_update): kept inside the view's sides; ahead, no farther than arcade_scroll_ahead past
// the front edge; one the back edge leaves behind is gone, unkilled, as a formation's is (the author, 2026-10-19: the
// back edge dragged them along, piled under the panel). A lancer lying in wait stays by its rock, and
// one inside a black hole's reach is the hole's: held at the view's edge 110 m from Eclipse's core, a raider the
// hole was pulling in neither fell nor could be reached, and its wave never ended
function arcade_scroll_raiders()
{
    if (!arcade_scroll_on()) {
        return;
    }
    for (const v of enemies) {
        // a formation's raider flies through: once in the view and out of it again, it is gone, no points
        if ((v.hp > 0) && v.path) {
            const inside = !arcade_scroll_unseen(v);
            v.path.entered = v.path.entered || inside;
            if (v.path.entered && !inside) {
                v.hp = 0;
            }
            continue;
        }
        if ((v.hp > 0) && !v.lurk && !black_holes.some(vv => distance(v, vv) < vv.radius)) {
            if (arcade_scroll_behind(v, v.r + arcade_scroll_gone)) {
                v.hp = 0;
                continue;
            }
            arcade_scroll_keep(v, v.r + arcade_scroll_leash, arcade_scroll_ahead + v.r + arcade_scroll_leash, false, true);
        }
    }
}

// A raider or a pickup the back edge has passed this far is gone: out of the view, not dragged along at its edge
const arcade_scroll_gone = 60;

// A raider out of the view holds its fire on a lane (enemy_fire): nothing hits you from where you cannot see
function arcade_scroll_unseen(v)
{
    if (!arcade_scroll_on()) {
        return false;
    }
    const vw = W/zoom;
    const vh = H/zoom;
    return (v.x < camera.x) || (v.x > camera.x + vw) || (v.y < camera.y) || (v.y > camera.y + vh);
}

// A raider the back edge of a lane has passed, by `past` m: a lancer lying in wait there wakes, rather than hold its
// wave up out of sight (arcade_role_steer); one past it by its radius and arcade_scroll_gone is gone
function arcade_scroll_behind(v, past = 0)
{
    if (!arcade_scroll_on()) {
        return false;
    }
    const view = arcade_scroll_view();
    return (v.x - view.x)*arcade_scroll.way.x + (v.y - view.y)*arcade_scroll.way.y < -view.h - past;
}

// Where a squadron warps in on a lane (arcade_squad_form): past the front edge, at a place across it (-1 to 1), as
// the bearing and distance from you the squadron's lines take
function arcade_scroll_squad_spot(across)
{
    const view = arcade_scroll_view();
    const way = arcade_scroll.way;
    const a = view.h + arcade_scroll_spawn;
    const c = across*view.w*0.75;
    const x = clamp(view.x + way.x*a - way.y*c, 40, world.w - 40);
    const y = clamp(view.y + way.y*a + way.x*c, 40, world.h - 40);
    return {angle: Math.atan2(y - player.y, x - player.x), far: Math.hypot(x - player.x, y - player.y)};
}

// The rocks a lancer may lie in wait by on a lane: those ahead in the view's front half or just past it
function arcade_scroll_ambush_rocks()
{
    const view = arcade_scroll_view();
    const way = arcade_scroll.way;
    return ore_nodes.filter(function (v) {
        const along = (v.x - view.x)*way.x + (v.y - view.y)*way.y;
        const across = (v.y - view.y)*way.x - (v.x - view.x)*way.y;
        return (v.hp > 0) && (along > view.h*0.2) && (along < view.h + 500) && (Math.abs(across) < view.w*0.8);
    });
}

// The flagship on a lane (arcade_flagship_spawn): ahead in the view, in the middle across it
function arcade_scroll_flagship(v)
{
    if (!arcade_scroll_on()) {
        return;
    }
    const view = arcade_scroll_view();
    v.x = clamp(view.x + arcade_scroll.way.x*view.h*0.55, 90, world.w - 90);
    v.y = clamp(view.y + arcade_scroll.way.y*view.h*0.55, 90, world.h - 90);
}

// A flagship's hull on a lane: a duel bound to a hole (Eclipse's Eye) fights round a ring at the lane's end, with no
// hole to swallow the raiders round it, and has this share of its hull (at its whole hull the bot lost 1100 hull a
// run to it, and Eclipse took 20 lives in 12 runs)
const arcade_scroll_ring_hull = 0.7;

function arcade_scroll_flagship_k()
{
    return (arcade_scroll_on() && (boss_duel_design()?.kind === 'edge')) ? arcade_scroll_ring_hull : 1;
}

// Haven's Crescent on a lane (boss_duel_gate): it runs for a gate just past the front edge, as there are no portals
function arcade_scroll_gate()
{
    const view = arcade_scroll_view();
    const a = view.h + 60;
    return {x: clamp(view.x + arcade_scroll.way.x*a, 40, world.w - 40), y: clamp(view.y + arcade_scroll.way.y*a, 40, world.h - 40), r: 46};
}
