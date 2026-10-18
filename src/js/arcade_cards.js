// The arcade's cards: at each break between worlds you take one of three, drawn from a pool so no two runs go the same
// way: a gamble (the next world harder, a prize for clearing it), a trade-off (one thing better and one worse for the
// rest of the run) and a boon (a gift: a module level, a gun tier, a second wind). Their prizes are what salvage cannot
// buy, or cannot buy yet: a module level or a gun tier before the depot opens it, damage, hull and fire rate past the
// shop's. The ones with a price take salvage, which a run used to end with thousands of. What the cards taken do now
// shows in the HUD over the gauges (arcade_cards_hud), and the save keeps them (arcade_snapshot).
//
// A card's effect is a set of factors (arcade_card_k): damage (your shots), rate (your guns' interval), taken (hits on
// you), hull and shield (their maximum), speed (cruising), raiders (a wave's count), raider_hull, raider_fire (their
// reload), flagship (its hull) and elites (every squadron from wave 2 led by one). Outside a run they are all 1.

const arcade_card_k_none = {damage: 1, rate: 1, taken: 1, hull: 1, shield: 1, speed: 1, raiders: 1, raider_hull: 1, raider_fire: 1, flagship: 1, elites: 0};
let arcade_card_k = {...arcade_card_k_none};
// the modules a card may give a level of: the fight's, as the depot shelves them
const arcade_card_modules = ['spread', 'damage', 'rate', 'armor', 'shield', 'drone', 'nanites', 'pulse', 'reactor', 'cooling', 'evasive', 'dash', 'speed'];
// a second wind leaves this share of the hull
const arcade_card_wind = 0.3;
// a gamble taken for the last world, where no prize for the rest of the run is worth anything, pays this score instead
const arcade_card_last_prize = 25000;
// The pool. kind: gamble, trade or boon; lasts: world (the next one), run, or now (done at once); k: its factors while
// it lasts; a gamble's prize, given when its world is cleared: factors for the rest of the run (prize_k), a module level
// (prize_module) or a gun tier (prize_tier); once: taken once a run; needs: when it can be drawn; price: salvage
const arcade_card_pool = [
    {id: 'bounty', kind: 'gamble', title: 'Bounty contract', glyph: '✦', lasts: 'world', k: {raiders: 1.5}, risk: 'Half as many raiders again in every wave.', prize_k: {damage: 1.15}, prize: '+15% damage for the rest of the run.'},
    {id: 'wager', kind: 'gamble', title: 'Flagship wager', glyph: '♛', lasts: 'world', k: {flagship: 1.6}, risk: 'Its flagship comes with 60% more hull.', prize_module: 'locked', prize: v => `${arcade_card_module_text(v)}, before the depot sells it.`, needs: () => arcade_card_module_pick('locked', () => 0) !== null},
    {id: 'armoured', kind: 'gamble', title: 'Armoured raiders', glyph: '⬢', lasts: 'world', k: {raider_hull: 1.4}, risk: 'Raiders come with 40% more hull.', prize_tier: true, prize: 'Every gun a tier past the depot’s, from now on.', needs: () => weapon_level() < 5},
    {id: 'elite_hunt', kind: 'gamble', title: 'Elite hunt', glyph: '☗', lasts: 'world', k: {elites: 1}, risk: 'An elite leads every squadron from wave 2.', prize_k: {hull: 1.2}, prize: '+20% hull for the rest of the run.'},
    {id: 'hot_zone', kind: 'gamble', title: 'Hot zone', glyph: '✹', lasts: 'world', k: {raider_fire: 0.77}, risk: 'Raiders fire 30% faster.', prize_k: {rate: 0.87}, prize: 'Your guns fire 15% faster for the rest of the run.'},
    {id: 'afterburners', kind: 'trade', title: 'Afterburners', glyph: '➤', lasts: 'run', once: true, k: {speed: 1.2, hull: 0.85}},
    {id: 'glass_cannon', kind: 'trade', title: 'Glass cannon', glyph: '◇', lasts: 'run', once: true, k: {damage: 1.3, taken: 1.25}},
    {id: 'plating', kind: 'trade', title: 'Heavy plating', glyph: '▣', lasts: 'run', once: true, k: {hull: 1.35, speed: 0.88}},
    {id: 'overclock', kind: 'trade', title: 'Overclocked guns', glyph: '≋', lasts: 'run', once: true, k: {rate: 0.8, hull: 0.8}},
    {id: 'capacitors', kind: 'trade', title: 'Shield over hull', glyph: '⬡', lasts: 'run', once: true, k: {shield: 1.6, hull: 0.8}, needs: () => shield_max() >= 25},
    {id: 'field', kind: 'boon', title: 'Field upgrade', glyph: '✚', lasts: 'now', module: 'open', line: v => `${arcade_card_module_text(v)}, free.`, needs: () => arcade_card_module_pick('open', () => 0) !== null},
    {id: 'prototype', kind: 'boon', title: 'Prototype', glyph: '⚗', lasts: 'now', module: 'locked', price: v => module_cost(upgrade_options.find(vv => vv.key === v.module))*2, line: v => `${arcade_card_module_text(v)} now, before the depot sells it.`, needs: () => arcade_card_module_pick('locked', () => 0) !== null},
    {id: 'second_wind', kind: 'boon', title: 'Second wind', glyph: '❤', lasts: 'run', once: true, line: 'Once each world, a hit that would destroy you leaves you 30% hull.'},
    {id: 'cache', kind: 'boon', title: 'Supply cache', glyph: '▤', lasts: 'now', line: '+2 repair kits, +1 EMP and +1 stasis cell.', needs: () => (supplies.medkit < 8) || (supplies.emp < 8) || (supplies.stasis < 8)},
    {id: 'tuned', kind: 'boon', title: 'Tuned guns', glyph: '↗', lasts: 'run', once: true, k: {damage: 1.12}, line: '+12% damage for the rest of the run.'},
    {id: 'black_market', kind: 'boon', title: 'Black-market tier', glyph: '⚑', lasts: 'now', price: () => 400, line: 'Every gun a tier past the depot’s, from now on.', needs: () => weapon_level() < 5},
];
// how each kind is named on its card
const arcade_card_kinds = {gamble: 'Gamble', trade: 'Trade-off', boon: 'Boon'};
// the factors as the cards and the HUD name them: a word, and whether more is better for you
const arcade_card_words = {
    damage: ['damage', 'Damage', true], rate: ['fire rate', 'Fire rate', true], taken: ['damage taken', 'Hurt', false],
    hull: ['hull', 'Hull', true], shield: ['shield', 'Shield', true], speed: ['speed', 'Speed', true],
    raiders: ['raiders', 'Raiders', false], raider_hull: ['raider hull', 'Raider hull', false], raider_fire: ['raider fire rate', 'Raider fire', false],
    flagship: ['flagship hull', 'Flagship hull', false],
};

// The run's cards as it starts: a save's, else none
function arcade_cards_start(from)
{
    arcade.cards = Array.isArray(from?.cards) ? from.cards.filter(v => arcade_card_pool.some(vv => vv.id === v.id)).map(v => ({...v})) : [];
    arcade.wind_used = false;
    arcade_cards_sync(false);
}

// The run over: every factor back to 1
function arcade_cards_stop()
{
    arcade_card_k = {...arcade_card_k_none};
    arcade_cards_hud();
}

// The factors of the cards in force now: a run-long card's, a gamble's in its world, a gamble won's prize. The hull's
// maximum moving (adjust: not as a run starts, its hull is the save's) keeps what was lost, and what grows comes repaired
function arcade_cards_sync(adjust = true)
{
    const before = (player && adjust) ? hull_max() : 0;
    const k = {...arcade_card_k_none};
    for (const card of arcade.active ? arcade.cards : []) {
        const def = arcade_card_def(card.id);
        const factors = [];
        if ((def.lasts === 'run') || ((def.lasts === 'world') && (card.step === arcade_level()) && !card.won)) {
            factors.push(def.k || {});
        }
        if (card.won && def.prize_k) {
            factors.push(def.prize_k);
        }
        for (const f of factors) {
            for (const [key, value] of Object.entries(f)) {
                k[key] = (key === 'elites') ? Math.max(k[key], value) : k[key]*value;
            }
        }
    }
    arcade_card_k = k;
    if (player && before) {
        const after = hull_max();
        player.hp = (after > before) ? player.hp + after - before : Math.min(player.hp, after);
        player.shield = Math.min(player.shield || 0, shield_max());
    }
    arcade_cards_hud();
}

function arcade_card_def(id)
{
    return arcade_card_pool.find(v => v.id === id);
}

// Three cards for the break after this world: a gamble, a trade-off and a boon, each of those that can be drawn now
// (once a run, its needs met), by the run's dice for this step, so a save loaded draws the same three. A kind with
// none left (the five trade-offs are once a run, and a run has seven breaks) gives its place to a card of another
function arcade_cards_draw()
{
    const step = arcade_level() + 1;
    const dice = finale_random(arcade.seed*3 + step*104729 + 17);
    const out = [];
    const taken = arcade.cards.map(v => v.id);
    const drawn = [];
    function drawable(def) {
        return !(def.once && taken.includes(def.id)) && !drawn.includes(def.id) && (!def.needs || def.needs());
    }
    for (const kind of ['gamble', 'trade', 'boon']) {
        const own = arcade_card_pool.filter(v => (v.kind === kind) && drawable(v));
        const pool = own.length ? own : arcade_card_pool.filter(drawable);
        if (!pool.length) {
            continue;
        }
        const def = pool[Math.floor(dice()*pool.length)];
        drawn.push(def.id);
        const card = {id: def.id, step};
        const which = def.module || def.prize_module;
        if (which) {
            card.module = arcade_card_module_pick(which, dice);
            card.level = upgrades[card.module] + 1;
        }
        out.push(card);
    }
    return out;
}

// A module for a card: one of the fight's not at its cap, whose next level the depot sells now (open) or not yet
// (locked); null when there is none
function arcade_card_module_pick(which, dice)
{
    const options = arcade_card_modules.map(v => upgrade_options.find(vv => vv.key === v)).filter(v => v && (upgrades[v.key] < v.cap) && !module_needs_gun(v) && ((module_next_locked(v) === null) === (which === 'open')));
    return options.length ? options[Math.floor(dice()*options.length)].key : null;
}

// The module a card gives: Shield capacitor level 2
function arcade_card_module_text(card)
{
    const option = upgrade_options.find(v => v.key === card.module);
    return `${option.title} level ${card.level}`;
}

// A card's price in salvage, 0 for none
function arcade_card_price(card)
{
    const def = arcade_card_def(card.id);
    return def.price ? def.price(card) : 0;
}

// A card as its face says it: the kind, how long it lasts, title, glyph (or its module's icon), and its lines, each a
// label, a text, a tone (risk, prize, up, down, gift) and a note (the hull as it is and would be)
function arcade_card_face(card)
{
    const def = arcade_card_def(card.id);
    const lines = [];
    if (def.kind === 'gamble') {
        lines.push(['Risk', def.risk, 'risk']);
        lines.push(['Prize', arcade_card_last(card) ? `+${ui_number(arcade_card_last_prize)} score when the run is won.` : (typeof def.prize === 'function') ? def.prize(card) : def.prize, 'prize']);
    }
    else if (def.kind === 'trade') {
        for (const [key, value] of Object.entries(def.k)) {
            const [word, , more] = arcade_card_words[key];
            const share = arcade_card_share(key, value);
            // the hull and the shield as they are and would be
            const now = (key === 'hull') ? hull_max() : (key === 'shield') ? shield_max() : 0;
            lines.push([((share > 0) === more) ? 'Up' : 'Down', `${(share > 0) ? '+' : '−'}${Math.abs(share)}% ${word}`, ((share > 0) === more) ? 'up' : 'down', now ? `${now} → ${Math.round(now*value)}` : '']);
        }
    }
    else {
        lines.push(['Gift', (typeof def.line === 'function') ? def.line(card) : def.line, 'gift']);
    }
    const lasts = {world: 'Next world', run: 'Rest of the run', now: 'Now'}[def.lasts];
    // a module's card shows the module
    const icon = card.module ? module_icon(upgrade_options.find(v => v.key === card.module)) : '';
    return {kind: def.kind, kind_name: arcade_card_kinds[def.kind], title: def.title, glyph: def.glyph, icon, lasts, lines, price: arcade_card_price(card)};
}

// Whether a card is for the run's last world, where a gamble's prize is score
function arcade_card_last(card)
{
    return card.step >= arcade_worlds - 1;
}

// A factor as the share it adds or takes, in percent: fire rate by the interval's cut (0.8 is 25% faster)
function arcade_card_share(key, value)
{
    return Math.round((['rate', 'raider_fire'].includes(key) ? 1/value - 1 : value - 1)*100);
}

// Whether a card can be taken: its price within the salvage
function arcade_card_affordable(card)
{
    return salvage >= arcade_card_price(card);
}

// The card taken at the break: its price paid, a gift given at once, kept with the run
function arcade_card_take(card)
{
    const def = arcade_card_def(card.id);
    const price = arcade_card_price(card);
    if (salvage < price) {
        return false;
    }
    salvage -= price;
    if (price) {
        play_log_spend('card', card.id, price);
    }
    if (def.module) {
        grant_upgrade(upgrade_options.find(v => v.key === card.module));
    }
    if (card.id === 'cache') {
        supplies.medkit = Math.min(8, supplies.medkit + 2);
        supplies.emp = Math.min(8, supplies.emp + 1);
        supplies.stasis = Math.min(8, supplies.stasis + 1);
    }
    if (card.id === 'black_market') {
        arcade_cards_tier_up();
    }
    arcade.cards.push({...card});
    play_log_event('card', {world: worlds[campaign.world].name, card: card.id, kind: def.kind, ...(card.module ? {module: card.module} : {}), ...(price ? {price} : {})});
    arcade_cards_sync();
    return true;
}

// Every gun a tier up (to T5), and the tier the depot's free one for a world cleared stops at a tier higher
function arcade_cards_tier_up()
{
    const fleet = ensure_career();
    const tier = Math.min(5, weapon_level() + 1);
    for (const id of fleet.weapons) {
        fleet.weapon_levels[id] = tier;
    }
}

// The tiers the cards add past the depot's: one a black-market tier or an armoured raiders' prize
function arcade_cards_tiers()
{
    return arcade.cards.filter(v => (v.id === 'black_market') || ((v.id === 'armoured') && v.won)).length;
}

// The world cleared: the gamble taken for it is won, and its prize given; what it was, for the break to say
function arcade_cards_world_cleared()
{
    const out = [];
    for (const card of arcade.cards) {
        const def = arcade_card_def(card.id);
        if ((def.lasts !== 'world') || (card.step !== arcade_level()) || card.won) {
            continue;
        }
        card.won = true;
        if (arcade_card_last(card)) {
            score += arcade_card_last_prize;
        }
        else if (def.prize_module) {
            const option = upgrade_options.find(v => v.key === card.module);
            if (upgrades[option.key] < option.cap) {
                grant_upgrade(option);
            }
        }
        if (def.prize_tier && !arcade_card_last(card)) {
            arcade_cards_tier_up();
        }
        out.push(card);
        play_log_event('card won', {world: worlds[campaign.world].name, card: card.id});
    }
    arcade_cards_sync();
    return out;
}

// A new world: the second wind is there again, and the factors are this step's
function arcade_cards_world_start()
{
    arcade.wind_used = false;
    arcade_cards_sync();
}

// A hit that would destroy you, with the second wind taken and not yet used in this world: 30% hull instead, a moment
// untouchable, and the news. True when it saved you
function arcade_cards_second_wind()
{
    if (!arcade.active || arcade.wind_used || !arcade.cards.some(v => v.id === 'second_wind')) {
        return false;
    }
    arcade.wind_used = true;
    player.hp = Math.max(1, Math.round(hull_max()*arcade_card_wind));
    player.invincible = 2;
    flash = 0.5;
    ring(player.x, player.y, '#ff8a96', 220, 0.6);
    show_toast('SECOND WIND', 'ONE MORE CHANCE · ONCE EACH WORLD', 3, 'danger');
    play_log_event('card used', {world: worlds[campaign.world].name, card: 'second_wind'});
    arcade_cards_hud();
    return true;
}

// The cards in force, over the gauges: each factor as a chip (up green, down red), a gamble's marked for this world,
// the second wind ready or used; the cards' names in the tooltip. Nothing when no card is in force.
const arcade_cards_hud_box = document.createElement('div');
arcade_cards_hud_box.className = 'cardfx hidden';
arcade_cards_hud_box.id = 'card_effects';
document.getElementById('bottom_hud').prepend(arcade_cards_hud_box);

function arcade_cards_hud()
{
    const chips = arcade.active ? arcade_cards_chips() : [];
    const html = chips.map(v => `<span class="cardfx-chip is-${v.tone}${v.world ? ' is-world' : ''}" title="${ui_escape(v.title)}">${v.world ? '<i>This world</i>' : ''}${ui_escape(v.text)}</span>`).join('');
    if (arcade_cards_hud_box.innerHTML !== html) {
        arcade_cards_hud_box.innerHTML = html;
    }
    set_hidden(arcade_cards_hud_box, !chips.length);
}

// The chips: for each factor not 1, its share and whose it is (this world's gamble or the run's cards)
function arcade_cards_chips()
{
    const out = [];
    const step = arcade_level();
    for (const key of Object.keys(arcade_card_words)) {
        const value = arcade_card_k[key];
        if (value === 1) {
            continue;
        }
        const [, name, more] = arcade_card_words[key];
        const share = arcade_card_share(key, value);
        const by = arcade.cards.filter(function (v) {
            const def = arcade_card_def(v.id);
            const live = (def.lasts === 'run') || ((def.lasts === 'world') && (v.step === step) && !v.won);
            return (live && def.k && (key in def.k)) || (v.won && def.prize_k && (key in def.prize_k));
        });
        const world = by.some(v => (arcade_card_def(v.id).lasts === 'world') && !v.won);
        out.push({text: `${name} ${(share > 0) ? '+' : '−'}${Math.abs(share)}%`, tone: ((share > 0) === more) ? 'up' : 'down', world, title: by.map(v => arcade_card_def(v.id).title).join(', ')});
    }
    if (arcade_card_k.elites) {
        out.push({text: 'Elite leaders', tone: 'down', world: true, title: `${arcade_card_def('elite_hunt').title}: an elite leads every squadron from wave 2`});
    }
    if (arcade.cards.some(v => v.id === 'second_wind')) {
        out.push({text: arcade.wind_used ? 'Second wind used' : 'Second wind', tone: arcade.wind_used ? 'off' : 'up', world: false, title: `Second wind${arcade.wind_used ? ', used in this world' : ''}: once each world, a hit that would destroy you leaves you 30% hull`});
    }
    // the gambles first: they are this world's
    out.sort((a, b) => b.world - a.world);
    return out;
}
