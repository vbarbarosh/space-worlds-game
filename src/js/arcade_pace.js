// The arcade's pace (the author, 2026-10-30: "those five minutes must be engaging"): a Free wave as a build-up, a crest
// and a rest, as Left 4 Dead's director paces a fight (docs/interest.md; waves spread evenly over their time left half
// a world's seconds with no raider near, and its flagship the one peak). Through the build-up a director keeps raiders
// in play, more of them as it goes: when fewer are alive than it wants, the next squadron comes at once. Then the
// crest: the wave's last raiders all at once, an elite leading the first squadron of them, bigger wave by wave. Once
// it is down, a breather before the next.

// the build-up's length, in s; the raiders in play the director wants at its start and at its end (a factor on them by
// the mode: arcade_modes' press), and the fewest s between two of its squadrons
const pace_build = 36;
const pace_press = [1.5, 4];
const pace_gap_least = 1.6;
// the most s between two squadrons while as many as the director wants are alive: it calls the rest
const pace_gap_most = 14;
// in a world of rail guns (Obsidian, Eclipse), where a slug crosses the screen in a quarter second, it wants this
// share of that (as arcade_pack.js keeps rings and flanks from them)
const pace_rail_k = 0.6;
// the crest: the share of a wave's raiders (arcade_wave_size) it brings, wave 1 to 5, and at most this many full
// squadrons (arcade_squad_full); a world of rail guns brings this share of it
const pace_crest_shares = [0.15, 0.17, 0.2, 0.23, 0.26];
const pace_crest_most = 1.5;
// after the crest, no raider within this many m for this many s: the ones still out of reach warp in round you, this
// far, so a wave never waits on a straggler (lancers lying in wait among far rocks kept one 50 s with nothing to do)
const pace_reach = 900;
const pace_straggle = 5;
const pace_straggle_far = 650;
// the rest after a wave, in s
const pace_rest = 6;
// A crowd's hit in Free (arcade_crowds.js) is a share of its own, the mode's (arcade_modes' crowd): the director's
// waves bring more raiders, each softer, so a minute costs what it did (on NORMAL the bot lost 1.4 to 2.3 times the
// hull and shield a minute with their whole hits, and every run in Eclipse; on OVERLOAD at 0.7, every run, most in
// Haven); its kills drop less salvage (arcade_free_drop_k)

// A crowd's hit under the director, in Free: its share
function pace_hit_k()
{
    return arcade_scroll_on() ? 1 : arcade_mode().crowd;
}

// A wave begins: its build-up
function pace_wave_start()
{
    arcade.pace = {crest: false, t: 0, since: 0, idle: 0};
}

// Each frame of a Free wave: the build-up's time; the raiders it never runs short of; the next squadron at once when
// fewer than the director wants are alive
function pace_update(dt)
{
    if (!arcade.pace) {
        pace_wave_start();
    }
    const pace = arcade.pace;
    pace.t += dt;
    pace.since += dt;
    if (pace.crest) {
        pace_stragglers(dt);
        return;
    }
    spawn_left = Math.max(spawn_left, arcade_squad_full());
    const alive = enemies.filter(v => (v.hp > 0) && !v.anchor && !v.event_kind).length;
    const rail = (worlds[campaign.world].weapon === 'rail') ? pace_rail_k : 1;
    const want = rail*arcade_mode().press*(pace_press[0] + (pace_press[1] - pace_press[0])*Math.min(1, pace.t/pace_build));
    if ((alive < want) && (pace.since >= pace_gap_least)) {
        arcade.squad_timer = Math.min(arcade.squad_timer, 0);
    }
}

// After the crest: the raiders out of reach warp in round you once none has been within it for a few seconds; an
// event's raider (a jammer, a freighter) stays where it is, the event's own
function pace_stragglers(dt)
{
    const pace = arcade.pace;
    const alive = enemies.filter(v => (v.hp > 0) && !v.anchor && !v.event_kind);
    pace.idle = alive.some(v => distance(v, player) < pace_reach) ? 0 : pace.idle + dt;
    if (pace.idle < pace_straggle) {
        return;
    }
    pace.idle = 0;
    for (const v of alive) {
        const a = Math.random()*Math.PI*2;
        v.x = clamp(player.x + Math.cos(a)*pace_straggle_far, 40, world.w - 40);
        v.y = clamp(player.y + Math.sin(a)*pace_straggle_far, 40, world.h - 40);
        v.lurk = false;
        ring(v.x, v.y, v.color || pink, 40, 0.4);
        explode(v.x, v.y, 26, '#a8e4ff', 0, 'warp');
    }
}

// A squadron of the wave came
function pace_squad_came()
{
    arcade.pace.since = 0;
}

// Whether the wave's crest is due: its build-up is over, by its clock or by what the world's task says ends it
// (arcade_tasks)
function pace_crest_due()
{
    if (arcade.pace.crest) {
        return false;
    }
    const task = arcade_task();
    return task?.crest_due ? task.crest_due() : (arcade.pace.t >= pace_build);
}

// The crest: the wave's last raiders at once, as squadrons from around you (or out of the place the world's task
// gives, with its word for it: arcade_tasks), an elite leading the first from the mode's first elite world on; after
// it the wave ends when they are down
function pace_crest(full)
{
    arcade.pace.crest = true;
    const source = arcade_task()?.crest_source?.() || null;
    show_toast(...(source ? source.toast : ['THE WAVE PEAKS', 'ITS LAST SQUADRONS ALL AT ONCE']), 3, 'danger');
    const rail = (worlds[campaign.world].weapon === 'rail') ? pace_rail_k : 1;
    let left = Math.round(rail*Math.min(arcade_wave_size(arcade.wave)*pace_crest_shares[Math.min(pace_crest_shares.length, arcade.wave) - 1], full*pace_crest_most));
    const squadrons = Math.max(2, Math.ceil(left/full));
    const angle = Math.random()*Math.PI*2;
    for (let i = 0; (i < squadrons) && (left > 0); ++i) {
        const size = Math.max(1, Math.ceil(left/(squadrons - i)));
        const type = (arcade.wave === 1) ? 'chaser' : enemy_type();
        const first = enemies.length;
        arcade_squad_source = source;
        arcade_squad_line(type, size, angle + i*Math.PI*2/squadrons, (i === 0) && (arcade_level() >= arcade_mode().elite_world), arcade_squad_mix(type, size), 700);
        arcade_squad_source = null;
        raider_squad_after(enemies.slice(first), true);
        left -= size;
        arcade.squads++;
    }
    spawn_left = 0;
}

// The rest after a wave: its seconds, said in a toast
function pace_rest_start()
{
    show_toast('BREATHER', `NEXT WAVE IN ${pace_rest} S · PICK UP THE SALVAGE`, 2.5, 'info');
    return pace_rest;
}
