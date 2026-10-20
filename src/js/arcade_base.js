// The Arcade's third kind, Base (the menu's Arcade row: Free, Scroll or Base, T turns it): Scroll pared to its base, to
// build the run up again from it a layer at a time (the author, 2026-10-20: "the map must always move the same way, at
// the same speed ... this will be the base, and then lay something else on it"). The screen moves on at its one pace
// from a world's start to its end and never stops; two kinds of raider come along the whole lane: the chaser, which
// turns to you and keeps after you, firing only once close, and the passer, which flies one straight line through the
// view, a sweep across it or a V down it, and fires only while you are inside its ring. A world ends where its lane
// ends, straight on to the next. Left out, to be laid on one by one: the depot and salvage, the cards and modules,
// elites and flagships, the other raiders and missiles, and each world's trick (cliffs, pylons, spires, the hole).
// The raiders are Haven's in every world, hull, armour and shield; from world to world only their number at once
// (as on a Scroll lane) and how often they fire grow.

// How far a passer fires (its ring) and a chaser, m
const arcade_base_passer_range = 460;
const arcade_base_chaser_range = 340;
// the share of the squadrons that come as passers
const arcade_base_passers = 0.5;
// a raider's reload, the run's step taking this share off it, down to arcade_base_reload_min
const arcade_base_reload_step = 0.06;
const arcade_base_reload_min = 0.6;

// A Base run is flown
function arcade_base_on()
{
    return arcade_scroll_on() && arcade_base_kind();
}

// A squadron of a Base lane (arcade_squad_form): passers as a formation through the view, or chasers in a line from
// ahead; no elite, no mix, no pattern
function arcade_base_squad(size)
{
    const first = enemies.length;
    if (Math.random() < arcade_base_passers) {
        arcade_scroll_formation('shooter', size, false, null, true);
    }
    else {
        const ahead = arcade_scroll_squad_spot(rand(-1, 1));
        arcade_squad_line('chaser', size, ahead.angle, false, null, ahead.far);
    }
    for (const enemy of enemies.slice(first)) {
        enemy.weapon = 'plasma';
        enemy.passer = !!enemy.path;
        enemy.fire_range = enemy.passer ? arcade_base_passer_range : arcade_base_chaser_range;
    }
}

// A Base raider's reload against its world's: shorter by the run's step
function arcade_base_reload()
{
    return arcade_base_kind() ? Math.max(arcade_base_reload_min, 1 - arcade_base_reload_step*arcade_level()) : 1;
}

// Each frame of a Base world (arcade_update): at the lane's end the world is over; true once it is
function arcade_base_update()
{
    if (!arcade_base_on() || (arcade_scroll.s < arcade_scroll.length)) {
        return false;
    }
    arcade_base_world_end();
    return true;
}

// A Base world ends where its lane ends: the run's last is won; any other goes straight on to the next world of the
// route, with no break, card or depot
function arcade_base_world_end()
{
    play_log_world_cleared(0);
    toasts_clear();
    if (arcade_level() >= arcade_worlds - 1) {
        state = 'victory';
        victory_timer = 2.5;
        return;
    }
    const next = arcade_route_offers()[0];
    arcade.route.push(next);
    start_jump({world: next, label: worlds[next].name, color: worlds[next].accent});
}

// A passer's ring (render, in the world): where it fires at you
function render_arcade_base_rings()
{
    if (!arcade_base_on()) {
        return;
    }
    ctx.lineWidth = 1.5/zoom;
    for (const enemy of enemies) {
        if (!enemy.passer || (enemy.hp <= 0) || arcade_scroll_unseen(enemy)) {
            continue;
        }
        const inside = distance(enemy, player) <= enemy.fire_range;
        ctx.strokeStyle = inside ? 'rgba(255,77,94,0.55)' : 'rgba(255,204,77,0.22)';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.fire_range, 0, Math.PI*2);
        ctx.stroke();
    }
}
