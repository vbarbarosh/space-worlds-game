// The Arcade's third kind, Base (the menu's Arcade row: Free, Scroll or Base, T turns it): Scroll pared to its base, to
// build the run up again from it a layer at a time (the author, 2026-10-20: "the map must always move the same way, at
// the same speed ... this will be the base, and then lay something else on it"). The screen moves on at its one pace
// from a world's start to its end and never stops; two kinds of raider come along the whole lane: the chaser, which
// turns to you and keeps after you, firing only once close, and the passer, which flies one straight line through the
// view, a sweep across it or a V down it, and fires only while you are inside its ring. A world ends where its lane
// ends. Layer 1 (2026-10-20): salvage, and the depot between worlds, the whole of it, modules too (without them the
// salvage piled up with nothing to buy), the guns a tier up for each world, as on a Scroll lane. Layer 2: the raiders
// with jobs (arcade_raiders.js: interceptor, carrier, bulwark, sniper, mine-layer), one more opening each world from
// Haven to Obsidian, in a chasers' line's places; the passers' formations keep theirs. Left out, to be laid on one by
// one: the cards, elites and flagships, the world's other types (tanks, splitters, lancers) and missiles, and each
// world's trick (cliffs, pylons, spires, the hole).
// Layer 3: the raiders are built against the kit you bring, not the run's step: Haven's tier in every world, their hull
// following your guns' damage a second and their hits your hull, shield and armour, each against the run's start
// kit, to the power arcade_base_follow (most of the growth, not all: a better kit still makes you stronger); from world
// to world their number at once (as on a Scroll lane) and how often they fire grow besides.

// How far a passer fires (its ring) and a chaser, m
const arcade_base_passer_range = 460;
const arcade_base_chaser_range = 340;
// the share of the squadrons that come as passers
const arcade_base_passers = 0.5;
// a raider's reload, the run's step taking this share off it, down to arcade_base_reload_min
const arcade_base_reload_step = 0.06;
const arcade_base_reload_min = 0.6;

// How far the raiders follow your kit's growth: this power of it (1: all of it, 0: none)
const arcade_base_follow = 0.6;

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

// A Base raider's hull against Haven's: your kit's damage a second against the run's start kit's, to
// arcade_base_follow
function arcade_base_hull_k()
{
    const start = weapon_by_id('plasma');
    return Math.pow(arcade_base_kit_damage()/(start.damage*ship_catalog[0].damage/start.interval), arcade_base_follow);
}

// A Base raider's hits against Haven's (raider_hit_scale): your hull, shield and armour against the run's start
// kit's, to arcade_base_follow; outside a Base run, 1
function arcade_base_hit_k()
{
    if (!arcade_base_on()) {
        return 1;
    }
    const toughness = (hull_max() + shield_max())/(1 - upgrades.armor*armor_cut());
    return Math.pow(toughness/(ship_catalog[0].hull + ship_catalog[0].shield), arcade_base_follow);
}

// Your guns' damage a second, every mount's (fire_equipped_weapon): its damage by Hotter plasma, its tier and the
// ship, its shots a volley, over its reload
function arcade_base_kit_damage()
{
    const tiers = ensure_career().weapon_levels;
    let sum = 0;
    for (const v of mounted_weapons().filter(Boolean)) {
        const damage = v.damage*(1 + upgrades.damage*hotter_plasma_share)*(1 + ((tiers[v.id] || 1) - 1)*0.22)*current_ship().damage;
        sum += damage*gun_shot_count(v)/Math.max(0.065, v.interval*(1 - upgrades.rate*rate_cut()));
    }
    return sum;
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

// A Base world ends where its lane ends: the run's last is won; any other pays the world's bonus, grows the guns a
// tier and opens the depot, which launches to the next world of the route (arcade_depot_close); no break, no card
function arcade_base_world_end()
{
    toasts_clear();
    if (arcade_level() >= arcade_worlds - 1) {
        play_log_world_cleared(0);
        state = 'victory';
        victory_timer = 2.5;
        return;
    }
    const bonus = arcade_clear_bonus();
    salvage += bonus;
    play_log_earn('world bonus', bonus);
    play_log_world_cleared(bonus);
    arcade_guns_grow();
    arcade.between_worlds = {world: campaign.world, bonus, won: [], next: arcade_route_offers()[0]};
    arcade_depot_open();
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
