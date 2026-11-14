// The arcade's two reasons for one more go (the author, 2026-11-01: "make the slide mode more addictive", then "make
// the arcade mode more addictive"): your best run as a rival, and a rank for each world cleared.
//
// The rival: a run notes its score at ten points of each world, the first time it gets there: on a Scroll lane each
// tenth of the lane, in Free the start of each wave; the run that sets a best of its kind keeps its notes
// (rank_track_key). In the next run of the kind the HUD's Best box says how far ahead of that run or behind it you are
// at the same point of the same step of the run, and a banner says when the run's score passes the best. A try-out of a
// world from the menu keeps no notes, as it keeps no best (save_best).
//
// The rank: a world cleared is ranked S, A, B or C on its cleared screen by three marks: a long streak, a whole hull,
// and on a lane few raiders let through, in Free its flagship down quickly. All three are S, none C. The best rank of
// each world is kept for each kind and named beside it, a better one said so. The run's last world ends in the finale
// of the whole run, with no rank of its own.

// a streak this long, a share of the hull lost no bigger, a share of the lane's raiders killed no smaller, a Free
// flagship's fight no longer than this many s (the bot's: 19 s the median, 10 to 97)
const rank_streak = 30;
const rank_hull = 0.25;
const rank_kills = 0.9;
const rank_flagship = 30;
const rank_letters = ['C', 'B', 'A', 'S'];
// the run's notes: score at each of ten points of each world, step*10 + point; best: the best run's, or null; passed:
// its score passed this run; flagship_at: when this world's flagship came, run_time
const rank_rival = {notes: [], best: null, passed: false, flagship_at: null};

// Where the best run of the kind picked keeps its notes, and the kind's best ranks (Scroll's as they were first named)
function rank_track_key()
{
    return `${arcade_best_key()}_track`;
}

function rank_ranks_key()
{
    return arcade_lane_kind() ? 'pulse_drift_scroll_ranks' : 'pulse_drift_ranks';
}

// A run begins (arcade_start): no notes yet, the best run's loaded; a retry keeps the run's notes so far
function rank_run_start(retry)
{
    if (!retry) {
        rank_rival.notes = [];
    }
    rank_rival.passed = false;
    rank_rival.best = null;
    try {
        const kept = JSON.parse(localStorage.getItem(rank_track_key()) || 'null');
        rank_rival.best = (kept && Array.isArray(kept.notes) && (kept.score === best)) ? kept.notes : null;
    }
    catch {
    }
}

// A world begins, or begins again after a death: its notes from the start, the world's marks from nothing
function rank_world_start()
{
    const from = arcade_level()*10;
    rank_rival.notes.length = Math.min(rank_rival.notes.length, from);
    rank_rival.flagship_at = null;
    streak.hull_lost = 0;
    streak.missed = 0;
}

// Where in the world the run is now: its point (step*10 + point) and how far on to the next (0 to 1): on a lane its
// tenth, in Free its wave, the share of a wave's way to its crest gone by (arcade_wave_share)
function rank_point()
{
    if (arcade_scroll_on()) {
        const along = 10*arcade_scroll.s/Math.max(1, arcade_scroll.length);
        const tenth = Math.min(9, Math.floor(along));
        return {at: arcade_level()*10 + tenth, k: clamp(along - tenth, 0, 1)};
    }
    const wave = clamp(arcade.wave - 1, 0, 9);
    return {at: arcade_level()*10 + wave, k: arcade_wave_timed() ? arcade_wave_share() : 0};
}

// Each frame of an arcade world (arcade_update): the note of this point, when the flagship came, and the best passed
function rank_update()
{
    if (!arcade.active || !player) {
        return;
    }
    if ((rank_rival.flagship_at === null) && enemies.some(v => (v.type === 'boss') && (v.hp > 0))) {
        rank_rival.flagship_at = run_time;
    }
    if (arcade.trial) {
        return;
    }
    const {at} = rank_point();
    for (let i = rank_rival.notes.length; i <= at; ++i) {
        rank_rival.notes[i] = score;
    }
    if (!rank_rival.passed && best && (score > best) && !arcade.trial) {
        rank_rival.passed = true;
        show_banner('goal', 'New best', ui_number(score), `past your best of ${ui_number(best)}`, 2.5);
    }
}

// The HUD's Best box in the arcade: your lead on the best run at this point, green ahead and red behind; hidden out of
// the arcade, in a try-out and with no best run noted
function rank_hud()
{
    const box = document.getElementById('rival_box');
    const {at, k} = (arcade.active && player) ? rank_point() : {at: -1, k: 0};
    const then = (rank_rival.best && (at >= 0) && !arcade.trial) ? rank_rival.best[at] : undefined;
    set_hidden(box, then === undefined);
    if (then === undefined) {
        return;
    }
    // the best run's score at this point, between its notes of this point and the next
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

// The run is over with a new best (save_best): its notes kept as the next run's rival of its kind
function rank_best_saved()
{
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
    const fight = (rank_rival.flagship_at === null) ? 0 : Math.round(run_time - rank_rival.flagship_at);
    const marks = [
        {label: 'Longest streak', value: streak.best, ok: streak.best >= rank_streak, aim: `aim ${rank_streak}+`},
        {label: 'Hull lost', value: Math.round(100*streak.hull_lost/hull_max()), ok: streak.hull_lost <= hull_max()*rank_hull, aim: `aim ${Math.round(100*rank_hull)}% or less`, unit: '%'},
        arcade_lane_kind()
            ? {label: 'Raiders let through', value: Math.round(100*streak.missed/Math.max(1, raiders + streak.missed)), unit: '%', ok: streak.missed <= (raiders + streak.missed)*(1 - rank_kills), aim: `aim ${Math.round(100*(1 - rank_kills))}% or less`}
            : {label: 'Flagship down in', value: fight, unit: ' s', ok: fight <= rank_flagship, aim: `aim ${rank_flagship} s or less`},
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

// A world's rank into a cleared screen (lane_clear_open, finale_build): its letter, its three marks each met (✓) or not
// with its aim, and the best rank of the world before, a better one said so
function rank_render(world, letter, list, line)
{
    const rank = rank_of_world(world);
    letter.textContent = rank.letter;
    letter.dataset.rank = rank.letter;
    list.innerHTML = rank.marks.map(v => `<li class="${v.ok ? 'is-met' : ''}"><span>${v.ok ? '✓' : '✗'}</span> ${ui_escape(v.label)} <b>${ui_number(v.value)}${v.unit || ''}</b> <small>${ui_escape(v.aim)}</small></li>`).join('');
    line.textContent = arcade.trial ? 'A try-out keeps no rank' : rank.better ? (rank.before ? `Better than your ${rank.before} here` : 'Your first rank here') : `Your best here: ${rank.before}`;
}
