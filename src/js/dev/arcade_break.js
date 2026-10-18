// The arcade's break on the dev page (bin/layout-check): `&screen=arcade-pick` opens it at its card, `arcade-route` at
// the next world, after the world of `&world=` (Haven to Cryosphere; Nova Forge's break offers Eclipse alone). Its
// states: `&cards=wager,overclock,prototype` draws those (a gamble, a trade-off, a boon), `&cards=long` gives the three
// drawn the longest texts there could be, `&salvage=n` the salvage at hand (a card with a price out of reach),
// `&route=0,2,1` the route flown, `&won=1` a gamble won in the world just cleared, `&card_hud=1` the cards in force in
// the HUD (with &screen=arcade), `&card_hud=all` the most chips at once.
const dev_break_params = new URLSearchParams(location.search);

function dev_break_open(screen)
{
    dev_arcade_start();
    dev_screen_modules_set();
    const route = (dev_break_params.get('route') || '').split(',').filter(Boolean).map(Number);
    if (route.length) {
        arcade.route = route;
        campaign.world = route[route.length - 1];
    }
    // the eighth world ends in the finale instead
    if (arcade.route.length >= arcade_worlds) {
        arcade.route = arcade.route.slice(0, arcade_worlds - 1);
        campaign.world = arcade.route[arcade.route.length - 1];
    }
    arcade.world = campaign.world;
    salvage = dev_break_params.has('salvage') ? Number(dev_break_params.get('salvage')) : 1840;
    arcade.between_worlds = {world: campaign.world, bonus: arcade_clear_bonus(), won: [], next: null};
    if (dev_break_params.get('won')) {
        const card = {id: 'bounty', step: arcade_level(), won: true};
        arcade.cards.push(card);
        arcade.between_worlds.won = [card];
        arcade_cards_sync();
    }
    arcade_break_open(arcade.between_worlds.won);
    dev_break_cards_set();
    if (screen === 'arcade-route') {
        arcade_break.chosen = 0;
        arcade_break_go();
        arcade_break.chosen = (arcade_break.offers.length > 1) ? 1 : 0;
    }
    arcade_break_fill();
}

// &cards=: the three cards by their ids, or the drawn three with the longest texts
function dev_break_cards_set()
{
    const ids = (dev_break_params.get('cards') || '').split(',').filter(Boolean);
    if (ids[0] === 'long') {
        for (const card of arcade_break.cards) {
            const def = arcade_card_def(card.id);
            Object.assign(def, {
                title: `${def.title} of the long and winding outer frontier`,
                risk: 'Half as many raiders again in every wave, and each of them fires twice as often at you while the flagship calls its escorts twice over.',
                prize: 'Plus fifteen per cent damage for the rest of the run, and a word with no spaces: PROTOTYPE_PLASMA_RESONANCE_COUPLING.',
                line: 'A gift with a very long line: Shield capacitor level 3 now, before the depot sells it at world 5, fitted by the Free Traders.',
            });
            if (def.kind === 'trade') {
                def.k = {damage: 1.3, taken: 1.25, speed: 0.9, rate: 0.85};
            }
        }
    }
    else if (ids.length) {
        arcade_break.cards = ids.map(function (id) {
            const def = arcade_card_def(id);
            const out = {id, step: arcade_level() + 1};
            const which = def && (def.module || def.prize_module);
            if (which) {
                out.module = arcade_card_module_pick(which, () => 0) || 'shield';
                out.level = upgrades[out.module] + 1;
            }
            return out;
        }).filter(v => arcade_card_def(v.id));
    }
}

// &card_hud=1 with &screen=arcade: a gamble for this world, a trade-off, the second wind and a won prize in force;
// &card_hud=all the most chips a run can show at once (one card a break: one gamble in force, the five trade-offs,
// a gamble won, a boon's damage, the second wind used): eight
function dev_break_card_hud()
{
    const which = dev_break_params.get('card_hud');
    if (!which) {
        return;
    }
    const step = arcade_level();
    if (which === 'all') {
        const ids = ['glass_cannon', 'afterburners', 'plating', 'overclock', 'capacitors', 'second_wind', 'tuned'];
        arcade.cards.push({id: 'armoured', step}, {id: 'hot_zone', step: Math.max(0, step - 1), won: true}, ...ids.map(v => ({id: v, step})));
    }
    else {
        arcade.cards.push({id: 'bounty', step}, {id: 'glass_cannon', step}, {id: 'afterburners', step}, {id: 'second_wind', step}, {id: 'hot_zone', step: Math.max(0, step - 1), won: true});
    }
    arcade_cards_sync();
    // a moment after the world's start, which gives the second wind back
    if (which === 'all') {
        setTimeout(function () {
            arcade.wind_used = true;
            arcade_cards_hud();
        }, 300);
    }
}
