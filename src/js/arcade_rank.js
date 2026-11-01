// Scroll's two reasons for one more go (the author, 2026-11-01: "make the slide mode more addictive"): your best run as
// a rival along the lanes, and a rank for each world cleared.
//
// The rival: a Scroll run notes its score at each tenth of each lane, the first time it gets there; the run that sets
// a best keeps its notes (rank_track_key). On the lanes of the next run the HUD's Best box says how far ahead of that
// run or behind it you are at the same tenth of the same step of the run, and a banner says when the run's score
// passes the best. A try-out of a world from the menu keeps no notes, as it keeps no best (save_best).
//
// The rank: a world cleared on a lane is ranked S, A, B or C on its cleared screen by three marks: a long streak, a
// whole hull and few raiders let through. All three are S, none C. The best rank of each world is kept and named
// beside it, a better one said so.

// a streak this long, a share of the hull lost no bigger, a share of the lane's raiders killed no smaller
const rank_streak = 30;
const rank_hull = 0.25;
const rank_kills = 0.9;
const rank_letters = ['C', 'B', 'A', 'S'];
// the run's notes: score at each tenth of each lane, step*10 + tenth; best: the best run's, or null; passed: its score
// passed this run
const rank_rival = {notes: [], best: null, passed: false, shown: null};

function rank_track_key()
{
    return 'pulse_drift_best_scroll_track';
}

function rank_ranks_key()
{
    return 'pulse_drift_scroll_ranks';
}

// A run begins (arcade_start): no notes yet, the best run's loaded
function rank_run_start()
{
    rank_rival.notes = [];
    rank_rival.passed = false;
    rank_rival.best = null;
    try {
        const kept = JSON.parse(localStorage.getItem(rank_track_key()) || 'null');
        rank_rival.best = (kept && Array.isArray(kept.notes) && (kept.score === best)) ? kept.notes : null;
    }
    catch {
    }
}

// A world of a lane begins, or begins again after a death: its notes from the start, the world's marks from nothing
function rank_world_start()
{
    const from = arcade_level()*10;
    rank_rival.notes.length = Math.min(rank_rival.notes.length, from);
    streak.hull_lost = 0;
    streak.missed = 0;
}

// The tenth of the run's lanes the view is at now
function rank_point()
{
    const tenth = Math.min(9, Math.floor(10*arcade_scroll.s/Math.max(1, arcade_scroll.length)));
    return arcade_level()*10 + tenth;
}

// Each frame of a lane (arcade_update): the note of this tenth, the rival's lead, and the best passed
function rank_update()
{
    if (!arcade_scroll_on() || arcade.trial) {
        return;
    }
    const at = rank_point();
    for (let i = rank_rival.notes.length; i <= at; ++i) {
        rank_rival.notes[i] = score;
    }
    if (!rank_rival.passed && best && (score > best) && !arcade.trial) {
        rank_rival.passed = true;
        show_banner('goal', 'New best', ui_number(score), `past your best of ${ui_number(best)}`, 2.5);
    }
}

// The HUD's Best box on a lane: your lead on the best run at this tenth, green ahead and red behind; hidden off a lane,
// in a try-out and with no best run noted
function rank_hud()
{
    const box = document.getElementById('rival_box');
    const at = arcade_scroll_on() ? rank_point() : -1;
    const then = (rank_rival.best && (at >= 0) && !arcade.trial) ? rank_rival.best[at] : undefined;
    set_hidden(box, then === undefined);
    if (then === undefined) {
        return;
    }
    // the best run's score at this point, between its notes of this tenth and the next
    const k = clamp(10*arcade_scroll.s/Math.max(1, arcade_scroll.length) - at % 10, 0, 1);
    const lead = score - then - k*((rank_rival.best[at + 1] ?? then) - then);
    hud_text(document.getElementById('rival'), `${(lead >= 0) ? '+' : '−'}${rank_short(Math.abs(lead))}`);
    box.classList.toggle('is-ahead', lead >= 0);
}

// A lead short enough for a phone's HUD row: 9 999, 12.3k, 1.23M
function rank_short(v)
{
    if (v < 10000) {
        return ui_number(v);
    }
    if (v < 1e6) {
        return `${(v/1000).toFixed((v < 1e5) ? 1 : 0)}k`;
    }
    return `${(v/1e6).toFixed((v < 1e7) ? 2 : 1)}M`;
}

// The run is over with a new best (save_best): its notes kept as the next run's rival; a Free run keeps none
function rank_best_saved()
{
    if (!arcade_lane_kind()) {
        return;
    }
    try {
        localStorage.setItem(rank_track_key(), JSON.stringify({score: best, notes: rank_rival.notes}));
    }
    catch {
    }
}

// The world just cleared: its three marks, its rank, the best rank kept for the world before, and whether this one
// is better
function rank_of_world(world)
{
    const raiders = kills - (arcade.world_start?.kills || 0);
    const marks = [
        {label: 'Longest streak', value: streak.best, ok: streak.best >= rank_streak, aim: `aim ${rank_streak}+`},
        {label: 'Hull lost', value: Math.round(100*streak.hull_lost/hull_max()), ok: streak.hull_lost <= hull_max()*rank_hull, aim: `aim ${Math.round(100*rank_hull)}% or less`, unit: '%'},
        {label: 'Raiders let through', value: Math.round(100*streak.missed/Math.max(1, raiders + streak.missed)), unit: '%', ok: streak.missed <= (raiders + streak.missed)*(1 - rank_kills), aim: `aim ${Math.round(100*(1 - rank_kills))}% or less`},
    ];
    const letter = rank_letters[marks.filter(v => v.ok).length];
    let kept = {};
    try {
        kept = JSON.parse(localStorage.getItem(rank_ranks_key()) || '{}') || {};
    }
    catch {
    }
    const id = world_slug(world);
    const before = rank_letters.includes(kept[id]) ? kept[id] : null;
    const better = !arcade.trial && (!before || (rank_letters.indexOf(letter) > rank_letters.indexOf(before)));
    if (better) {
        kept[id] = letter;
        try {
            localStorage.setItem(rank_ranks_key(), JSON.stringify(kept));
        }
        catch {
        }
    }
    return {letter, marks, before, better};
}
