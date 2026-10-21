// Scroll, the Arcade's second kind (the menu's Arcade row: Free or Scroll, T turns it), built up again from its base a
// layer at a time (the author, 2026-10-20: "the map must always move the same way, at the same speed ... this will be
// the base, and then lay something else on it"). Built beside the Scroll of before as a third kind, Base, it took its
// place on 2026-10-21 (the author: "there is only one mode, Scroll"). The screen moves on at its one pace from a
// world's start to its end and never stops; two kinds of raider come along the whole lane: the chaser, which turns to
// you and keeps after you, firing only once close, and the passer, which flies one straight line through the view, a
// sweep across it or a V down it, and fires only while you are inside its ring. A world ends where its lane ends.
// Layer 1 (2026-10-20): salvage, and the depot between worlds, the whole of it, modules too (without them the salvage
// piled up with nothing to buy), the guns a tier up for each world. Layer 2: the raiders with jobs (arcade_raiders.js:
// interceptor, carrier, bulwark, sniper, mine-layer), one more opening each world from Haven to Obsidian, in a chasers'
// line's places; the passers' formations keep theirs.
// Layer 3: the raiders are built against the kit you bring, not the run's step: Haven's tier in every world, their hull
// following your guns' damage a second and their hits your hull, shield and armour, each against the run's start
// kit, to the power arcade_base_follow (most of the growth, not all: a better kit still makes you stronger); from world
// to world their number at once and how often they fire grow besides. Layer 4: raiders all along the lane, an elite
// leading every other squadron. Layer 5: the world's flagship before the lane's end (arcade_base_flagship_time).
// Left out, to be laid on one by one: the cards, the world's other types (tanks, splitters, lancers) and missiles,
// the wave-2 events, the flagships' duels and each world's trick (cliffs, pylons, spires, the hole). The Scroll of
// before had them on its lanes, and their lane code is kept for its layer, off until then: the lane's squadron
// patterns and lancers' rocks (arcade_squad_form, arcade_scroll_ambush_rocks), Haven's gate and Eclipse's ring
// (arcade_scroll_gate, arcade_scroll_flagship_k), the tricks along a lane (cliffs, pylons, spires, storms, the hole).

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
// The flagship comes this many seconds of the screen's pace before the lane's end, and is fought with the screen moving
// on, with this share of its hull built against your kit (arcade_base_flagship_hull); one still flying at the lane's
// end gets away, with no bounty. Tried with the bot: 0.5 of the hull and full hits lost most Standard runs; 0.3 and 0.4
// won them all, a quarter of the flagships getting away (docs/balance.md)
const arcade_base_flagship_time = 75;
const arcade_base_flagship_hull_k = 0.3;
// and this share of the hits its world's flagship deals (at all of them, on a lane of bulwarks, it cost the bot 300 to
// 650 hull)
const arcade_base_flagship_hits = 0.4;
// The world's flagship has come (arcade_base_update)
let arcade_base_flagship = false;

// A squadron of a Scroll lane (arcade_squad_form): passers as a formation through the view, or chasers in a line from
// ahead; no elite, no mix, no pattern
function arcade_base_squad(size)
{
    const first = enemies.length;
    // an elite leads every other squadron from the mode's elite world on, from wave 2 (arcade_squad_form)
    const elite = (arcade_level() >= arcade_mode().elite_world) && (arcade.wave >= 2) && (arcade.squads % 2 === 1);
    arcade.squads++;
    if (Math.random() < arcade_base_passers) {
        arcade_scroll_formation('shooter', size, elite, null, true);
    }
    else {
        const ahead = arcade_scroll_squad_spot(rand(-1, 1));
        arcade_squad_line('chaser', size, ahead.angle, elite, null, ahead.far);
    }
    for (const enemy of enemies.slice(first)) {
        enemy.weapon = 'plasma';
        enemy.passer = !!enemy.path;
        enemy.fire_range = enemy.passer ? arcade_base_passer_range : arcade_base_chaser_range;
    }
}

// A Scroll raider's reload against its world's: shorter by the run's step
function arcade_base_reload()
{
    return arcade_lane_kind() ? Math.max(arcade_base_reload_min, 1 - arcade_base_reload_step*arcade_level()) : 1;
}

// A Scroll raider's hull against Haven's: your kit's damage a second against the run's start kit's, to
// arcade_base_follow
function arcade_base_hull_k()
{
    const start = weapon_by_id('plasma');
    return Math.pow(arcade_base_kit_damage()/(start.damage*ship_catalog[0].damage/start.interval), arcade_base_follow);
}

// A Scroll raider's hits against Haven's (raider_hit_scale): your hull, shield and armour against the run's start
// kit's, to arcade_base_follow, a flagship's arcade_base_flagship_hits of that; outside a Scroll run, 1
function arcade_base_hit_k(enemy = null)
{
    if (!arcade_scroll_on()) {
        return 1;
    }
    const toughness = (hull_max() + shield_max())/(1 - upgrades.armor*armor_cut());
    const k = Math.pow(toughness/(ship_catalog[0].hull + ship_catalog[0].shield), arcade_base_follow);
    return (enemy?.type === 'boss') ? k*arcade_base_flagship_hits : k;
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

// A Scroll world begins (arcade_update): its flagship still to come
function arcade_base_world_start()
{
    arcade_base_flagship = false;
}

// Each frame of a Scroll world (arcade_update): the raiders keep coming, the flagship comes before the lane's end; at its
// end the world is over; true once it is
function arcade_base_update()
{
    if (!arcade_scroll_on()) {
        return false;
    }
    // the wave's raiders never run out: they keep coming at its pace to the lane's end, so the screen is never empty
    // (the author's run, 2026-10-20: a wave's count spent, the rest of Haven's lane was empty); while the flagship
    // flies, only its escorts come (arcade_flagship_update)
    const flagship = enemies.some(v => (v.type === 'boss') && (v.hp > 0));
    if ((spawn_left <= 0) && !flagship) {
        spawn_left = Math.max(1, arcade.wave_total);
    }
    if (!arcade_base_flagship && (arcade_scroll.s >= arcade_scroll.length - arcade_scroll.pace*arcade_base_flagship_time)) {
        arcade_base_flagship = true;
        spawn_left = 0;
        arcade_flagship_spawn();
    }
    if (arcade_scroll.s < arcade_scroll.length) {
        return false;
    }
    arcade_base_flagship_away();
    arcade_base_world_end();
    return true;
}

// A flagship still flying at the lane's end jumps away: no bounty (its drop)
function arcade_base_flagship_away()
{
    for (const v of enemies.filter(vv => (vv.type === 'boss') && (vv.hp > 0))) {
        explode(v.x, v.y, v.r, '#a8e4ff', 0, 'warp');
        v.hp = 0;
        arcade.flagship_escaped = true;
        set_hidden(el.bossbar, true);
        show_toast('THE FLAGSHIP GOT AWAY', 'THE LANE ENDED · NO FLAGSHIP BOUNTY', 3.5, 'danger');
    }
}

// A Scroll flagship's hull: arcade_base_flagship_hull_k of a flagship's 1500, by the mode, the world's design and your
// kit (arcade_base_hull_k), with no duel (a duel is each world's own trick: a layer still to come)
function arcade_base_flagship_hull(scale)
{
    return Math.round(1500*scale*boss_designs[campaign.world].hull*arcade_base_hull_k()*arcade_base_flagship_hull_k);
}

// A Scroll world ends where its lane ends: the run's last is won; any other pays the world's bonus, grows the guns a
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
    if (!arcade_scroll_on()) {
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
