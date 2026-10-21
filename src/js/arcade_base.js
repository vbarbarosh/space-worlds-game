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
// leading every other squadron. Layer 5: the world's flagship at the lane's end, where the screen stands still: the
// world ends when it is down (2026-10-21, the author: "strange that the boss came in the middle, it must come at the
// end"; it came 75 s of the screen's pace before the end, 5.4 km, the middle of Haven's lane, and got away at the end).
// Layer 6 (2026-10-21, the author: "while you fly, different enemies appear, with different behaviour"): the squadrons
// that are not passers come as the world's own mix has them (arcade_base_line_type): chasers, tanks leading a wall or a
// convoy, splitters that break into shards, lancers lying in wait by the rocks ahead and lunging, so each world flies
// its own raiders. Layer 7 (2026-10-21): each world's own gun (Verdant's scatter, Dustfall's and Nova Forge's
// missiles, Ion Reach's ion bolts, Obsidian's and Eclipse's rail guns), and every second passer a missile from the
// run's second world (spawn_enemy), as in Free; the CHILL mode still leaves plasma raiders unarmed. Layer 8: each
// world's flagship fights its duel (boss_duels.js) at the lane's end, its hull times what the duel asks, but Haven's
// chase; it comes past the front edge, the screen flying up to it, the lane's raiders staying, and its escorts guard
// it (arcade_base_guards). Layer 9: each world's trick along its lane, as the Scroll of before had them: Dustfall's
// cliffs, Ion Reach's pylons and charge fields, Obsidian's spires, Ion Reach's and Nova Forge's storms,
// Eclipse's black hole beside the lane at three quarters of it (arcade_scroll_lanes). The cards (2026-10-21): a card
// and the next world between worlds, as in Free, their factors on a lane's raiders and flagship too. The wave-2
// events (2026-10-21): with the lane's second half, placed for a lane (arcade_events.js). Nothing is left out now.

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
// The flagship comes where the lane ends, the screen standing still, with this share of its hull built against your kit
// (arcade_base_flagship_hull). Tried with the bot when it came 75 s before the end, the screen moving on: 0.5 of the
// hull and full hits lost most Standard runs; 0.3 and 0.4 won them all (docs/balance.md)
const arcade_base_flagship_hull_k = 0.3;
// and this share of the hits its world's flagship deals (at all of them, on a lane of bulwarks, it cost the bot 300 to
// 650 hull)
const arcade_base_flagship_hits = 0.4;

// A squadron of a Scroll lane (arcade_squad_form): passers as a formation through the view, or the world's raiders from
// ahead (arcade_base_line_type): lancers in wait by the rocks ahead, tanks leading a wall or a convoy, the rest in a
// line; an elite leads every other one
function arcade_base_squad(size)
{
    const first = enemies.length;
    // an elite leads every other squadron from the mode's elite world on, from wave 2 (arcade_squad_form)
    const elite = (arcade_level() >= arcade_mode().elite_world) && (arcade.wave >= 2) && ((arcade.squads % 2 === 1) || !!arcade_card_k.elites);
    arcade.squads++;
    const boss = enemies.find(v => (v.type === 'boss') && (v.hp > 0));
    if (boss) {
        arcade_base_guards(boss, size, elite);
    }
    else if (Math.random() < arcade_base_passers) {
        arcade_scroll_formation('shooter', size, elite, null, true);
    }
    else {
        const type = arcade_base_line_type();
        const pattern = arcade_squad_pattern(type, size);
        const ahead = arcade_scroll_squad_spot(rand(-1, 1));
        if (pattern === 'ambush') {
            arcade_squad_ambush(size, elite);
        }
        else if ((pattern === 'wall') || (pattern === 'convoy')) {
            arcade_squad_escorted(pattern, size, ahead.angle, elite, ahead.far);
        }
        else {
            arcade_squad_line(type, size, ahead.angle, elite, null, ahead.far);
        }
    }
    for (const enemy of enemies.slice(first)) {
        enemy.passer = !!enemy.path;
        enemy.fire_range = enemy.passer ? arcade_base_passer_range : arcade_base_chaser_range;
    }
}

// A flagship's escorts on a lane (arcade_base_squad, while it flies): the world's raiders in a ring round it, keeping
// their places by it and turning on you once you come within 300 m (arcade_role_steer), not passers flying by (the
// author, 2026-10-21: "they should guard the boss, try to kill me")
function arcade_base_guards(boss, size, elite)
{
    const type = arcade_base_line_type();
    const far = boss.r + 110;
    for (let i = 0; i < size; ++i) {
        const a = Math.PI*2*i/size;
        const offset = [Math.cos(a)*far, Math.sin(a)*far];
        const x = boss.x + Math.cos(boss.angle)*offset[0] - Math.sin(boss.angle)*offset[1];
        const y = boss.y + Math.sin(boss.angle)*offset[0] + Math.cos(boss.angle)*offset[1];
        const enemy = arcade_squad_warp(type, x, y, i);
        enemy.angle = boss.angle;
        enemy.guard = boss;
        enemy.guard_offset = offset;
        if (elite && (i === 0)) {
            arcade_elite_make(enemy);
        }
    }
}

// The type of a lane's squadron that is not passers: by the world's mix (combat.js, enemy_type), its shooters left out,
// as they fly through as passers: Haven's all chasers, Verdant's half splitters, Dustfall's and Obsidian's heavy with
// tanks
function arcade_base_line_type()
{
    const mix = current_sector().mix;
    const types = ['chaser', 'tank', null, 'splitter', 'lancer'];
    let sum = 0;
    for (let i = 0; i < types.length; ++i) {
        sum += types[i] ? mix[i] : 0;
    }
    let n = Math.random()*sum;
    for (let i = 0; i < types.length; ++i) {
        if (!types[i]) {
            continue;
        }
        n -= mix[i];
        if (n < 0) {
            return types[i];
        }
    }
    return 'chaser';
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

// Each frame of a Scroll world (arcade_update): the raiders keep coming to the lane's end; there the screen stands and
// the world's flagship comes, its wave the run's last (arcade_wave_start), with its escorts only; the world is over once
// it is down; true then
function arcade_base_update()
{
    if (!arcade_scroll_on()) {
        return false;
    }
    // the wave's raiders never run out: they keep coming at its pace to the lane's end, so the screen is never empty
    // (the author's run, 2026-10-20: a wave's count spent, the rest of Haven's lane was empty)
    if (arcade.wave < arcade_waves) {
        if (spawn_left <= 0) {
            spawn_left = Math.max(1, arcade.wave_total);
        }
        // the flagship comes past the front edge as the screen nears the end, so it stops with it half the view ahead
        if (arcade_scroll.length - arcade_scroll.s > arcade_scroll_view().h*0.5 + arcade_scroll_flagship_ahead) {
            return false;
        }
        arcade_wave_start(arcade_waves);
        // the raiders still in the view stay; no more squadrons, but its guards (arcade_base_guards): two with it in
        // Haven, four in Eclipse (six cost the bot more at Eclipse; the lane's raiders rallied round it, more again:
        // Eclipse's duel takes you to its edge, among them)
        spawn_left = 0;
        arcade_squad_spawn(2 + Math.floor(arcade_level()/3));
        return false;
    }
    if (enemies.some(v => (v.type === 'boss') && (v.hp > 0))) {
        return false;
    }
    arcade_base_world_end();
    return true;
}

// A Scroll flagship's hull: arcade_base_flagship_hull_k of a flagship's 1500, by the mode, the world's design and your
// kit (arcade_base_hull_k); its duel's factor on top (arcade_flagship_spawn)
function arcade_base_flagship_hull(scale)
{
    return Math.round(1500*scale*boss_designs[campaign.world].hull*arcade_base_hull_k()*arcade_base_flagship_hull_k);
}

// A Scroll world ends with its flagship, at the lane's end: the raiders still in the view go up with it; the run's last
// is won; any other pays the world's bonus and a gamble won for it (arcade_cards.js), grows the guns a tier and plays
// its cleared screen on the lane (arcade_lane_clear.js; the author, 2026-10-21: "a beautiful animation, wow, we won,
// and then on to the shop"), whose button opens the break: a card, the next world, then the depot (arcade_break.js)
function arcade_base_world_end()
{
    toasts_clear();
    let i = 0;
    for (const v of enemies.filter(vv => vv.hp > 0)) {
        explode(v.x, v.y, v.r*2.2, v.color || pink, 0.25 + 0.09*i++);
        v.hp = 0;
    }
    if (arcade_level() >= arcade_worlds - 1) {
        // a gamble taken for the last world pays in score (arcade_cards.js)
        arcade_cards_world_cleared();
        play_log_world_cleared(0);
        state = 'victory';
        victory_timer = 2.5;
        return;
    }
    const bonus = arcade_clear_bonus();
    salvage += bonus;
    play_log_earn('world bonus', bonus);
    play_log_world_cleared(bonus);
    const won = arcade_cards_world_cleared();
    arcade_guns_grow();
    set_hidden(el.bossbar, true);
    arcade.between_worlds = {world: campaign.world, bonus, won, next: null};
    lane_clear_open(campaign.world, arcade_world_run(bonus));
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
