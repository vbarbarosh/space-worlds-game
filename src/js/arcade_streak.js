// Scroll's streak and grazes (the author, 2026-11-01: "make the slide mode more addictive"). The combo of a kill made
// within 4 s of the last stops at ×8 in Free; on a Scroll lane it keeps climbing as a streak: past ×8, one more × every
// streak_step kills, with no ceiling, so a long streak is something to keep and a hit breaks it. Every streak_marks
// kills a banner and a bonus; a streak of streak_lost_shown or more lost says so. A raider's shot that just misses you,
// passing within streak_graze_band m of what it would hit, is a graze: a few points times the combo, and the combo's
// 4 s held for at least streak_graze_hold, so flying close to the fire keeps a streak alive. The world's longest streak
// and its grazes go to its cleared screen (arcade_rank.js).

// past ×8, one more × every this many kills of the streak
const streak_step = 10;
// a banner and a bonus every this many kills, the bonus this many points per kill of the streak (25: 1 500)
const streak_marks = 25;
const streak_mark_bonus = 60;
// a streak this long, lost, says so
const streak_lost_shown = 10;
// a graze: a shot passing this many m beyond what it would hit, worth this many points times the combo, and holding
// the combo's time at least this many s
const streak_graze_band = 26;
const streak_graze_points = 10;
const streak_graze_hold = 2;
// count: kills in a row, each within the combo's time of the last; best, grazes, the hull lost and the raiders let
// through: the world's (hull_lost and missed for its rank, arcade_rank.js)
const streak = {count: 0, best: 0, grazes: 0, hull_lost: 0, missed: 0};

// The combo a kill gives, the streak counted: up to ×8 as anywhere, then on a lane one more every streak_step kills
function streak_kill()
{
    streak.count = (combo_timer > 0) ? streak.count + 1 : 1;
    if (!arcade_scroll_on()) {
        return Math.min(8, streak.count);
    }
    streak.best = Math.max(streak.best, streak.count);
    return 8 + Math.max(0, Math.floor((streak.count - 8)/streak_step)) - Math.max(0, 8 - streak.count);
}

// After a kill on a lane has scored (base_damage_enemy): a mark of the streak, its banner and its bonus
function streak_mark(enemy)
{
    if (!arcade_scroll_on() || (streak.count < streak_marks) || (streak.count % streak_marks)) {
        return;
    }
    const bonus = streak.count*streak_mark_bonus;
    score += bonus;
    label(enemy.x, enemy.y - 34, `STREAK ${streak.count} +${bonus}`, gold);
    show_banner('goal', 'Streak', `${streak.count} in a row`, `+${ui_number(bonus)} · ×${combo} now · a hit breaks it`, 2);
}

// The combo is broken (a hit, its time run out, a new run): a long streak lost on a lane says so
function streak_break()
{
    if ((streak.count >= streak_lost_shown) && arcade_scroll_on() && (state === 'playing')) {
        show_toast(`STREAK ${streak.count} LOST`, `×${combo} · THE LONGEST HERE ${streak.best}`, 2, 'danger');
    }
    streak.count = 0;
    combo = 1;
    combo_timer = 0;
}

// A world of a lane begins, or begins again after a death: its streak, longest and grazes from nothing
function streak_world_start()
{
    streak.count = 0;
    streak.best = 0;
    streak.grazes = 0;
}

// Each raider shot that did not hit you this frame, on a lane (update): one that came within streak_graze_band of
// `reach` is near; once it is out of that band again, unhit, it was a graze
function streak_graze_check(b, reach)
{
    if (!arcade_scroll_on() || b.missile || b.grazed) {
        return;
    }
    const band = reach + streak_graze_band;
    if (!b.near) {
        b.near = hostile_shot_contact(b, player, band) >= 0;
        return;
    }
    if (Math.hypot(b.x - player.x, b.y - player.y) <= band) {
        return;
    }
    b.grazed = true;
    streak.grazes++;
    const points = streak_graze_points*combo;
    score += points;
    combo_timer = Math.max(combo_timer, streak_graze_hold);
    label(player.x, player.y - 30, `GRAZE +${points}`, '#7dffb0');
    for (let i = 0; i < 6; ++i) {
        const angle = Math.atan2(b.y - player.y, b.x - player.x) + rand(-0.6, 0.6);
        particles.push({x: player.x + Math.cos(angle)*reach, y: player.y + Math.sin(angle)*reach, vx: Math.cos(angle)*rand(60, 160), vy: Math.sin(angle)*rand(60, 160), life: 0.3, total: 0.3, color: '#7dffb0', size: rand(1.5, 3)});
    }
}

// The combo's readout on a lane: the streak in its label, its time left as a bar under it; off a lane, Combo
function streak_hud()
{
    const lane = arcade_scroll_on();
    const box = document.getElementById('combo_box');
    box.classList.toggle('is-streak', lane);
    hud_text(box.querySelector('.eyebrow'), (lane && (streak.count > 1)) ? `Streak ${streak.count}` : 'Combo');
    box.style.setProperty('--left', lane ? String(clamp(combo_timer/4, 0, 1)) : '0');
}
