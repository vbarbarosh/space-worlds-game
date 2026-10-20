// The arcade's power budget: a module level bought is owned for the run, but it works only installed, and every level
// installed draws power from the ship's reactor, which holds a limited amount: the ship's own (`power` in
// src/js/ships/) and one more for each world cleared. So no ship flies with everything at once: a run builds, and each
// depot re-shapes the build for free, a level taken out and an owned one put in. The campaign has no budget: there every
// level bought is installed, as before.
//
// `upgrades` stays what the ship flies with (the installed levels), so every effect reads it as before;
// arcade.owned holds the levels bought, and arcade.fitted the levels installed past the start's (magnet 1), one entry a
// level, in the order they went in: when the power falls short (a ship with a smaller reactor), the newest come out
// first. Where the numbers come from: docs/balance.md, The arcade's power budget.

// The levels that draw 2: those that multiply every shot (Hotter plasma +36% damage, Rapid resonance −12% interval,
// Prism a bolt more), the strongest in the shop for their price; a build of all three fills a cruiser's reactor
// by Eclipse with nothing else in it. Every other level draws 1.
const arcade_power_draws = {damage: 2, rate: 2, spread: 2};
// one more unit of power for each world cleared
const arcade_power_per_world = 1;
// Reactor tuning at the depot: one more unit of power on every ship for the rest of the run, at these prices, one a
// purchase; so the salvage a run piles up keeps a use, dear enough that a run buys one or two, not a whole build
const arcade_reactor_prices = [600, 1200, 1800];
// the order an old save's levels (from before the budget, every one installed) go in until the reactor is full
const arcade_power_fill = ['damage', 'armor', 'shield', 'spread', 'rate', 'drone', 'nanites', 'pulse'];

// What one level of a module draws
function module_power(key)
{
    return arcade_power_draws[key] || 1;
}

// A module's level owned: in the arcade the levels bought (installed or not), elsewhere the levels installed
function module_owned(key)
{
    return arcade.active ? arcade.owned[key] : upgrades[key];
}

// The reactor: the ship's own, one for each world cleared (the step, and from a world's cleared screen on, the next
// one, as world_reached counts) and one for each Reactor tuning bought
function arcade_power_capacity(ship = current_ship())
{
    return (ship.power || 0) + world_reached()*arcade_power_per_world + arcade.reactor;
}

function arcade_power_used()
{
    return arcade.fitted.reduce((sum, v) => sum + module_power(v), 0);
}

function arcade_power_free()
{
    return arcade_power_capacity() - arcade_power_used();
}

// The run's modules as it starts: a save's owned and installed levels; a save from before the budget had every level
// installed, so it owns them all and as many go in as the reactor holds (arcade_power_fill first); a new run owns
// only the start's
function arcade_modules_start(from)
{
    const base = initial_upgrades();
    arcade.reactor = clamp(Math.round(Number(from?.reactor) || 0), 0, arcade_reactor_prices.length);
    arcade.owned = {...base};
    for (const option of upgrade_options) {
        const level = Number((from?.owned || from?.upgrades)?.[option.key]);
        arcade.owned[option.key] = Number.isInteger(level) ? clamp(level, base[option.key], option.cap) : base[option.key];
    }
    arcade.fitted = [];
    if (Array.isArray(from?.fitted)) {
        for (const key of from.fitted) {
            if ((key in base) && (arcade_module_fitted(key) < arcade.owned[key] - base[key])) {
                arcade.fitted.push(key);
            }
        }
    }
    else {
        const order = [...arcade_power_fill, ...upgrade_options.map(v => v.key).filter(v => !arcade_power_fill.includes(v))];
        for (const key of order) {
            while ((arcade_module_fitted(key) < arcade.owned[key] - base[key]) && (module_power(key) <= arcade_power_free())) {
                arcade.fitted.push(key);
            }
        }
    }
    arcade_power_fit();
    arcade_modules_apply();
}

// The levels of a module installed past the start's
function arcade_module_fitted(key)
{
    return arcade.fitted.filter(v => v === key).length;
}

// The ship flies with the installed levels: `upgrades` from the start's and those fitted; a shield or a turbo smaller
// now is cut to its new size
function arcade_modules_apply()
{
    const base = initial_upgrades();
    for (const option of upgrade_options) {
        upgrades[option.key] = base[option.key] + arcade_module_fitted(option.key);
    }
    if (player) {
        player.shield = Math.min(player.shield || 0, shield_max());
        player.turbo_fuel = Math.min(player.turbo_fuel || 0, turbo_duration());
    }
}

// A level bought: owned, and installed when the reactor has the power for it; true when it went in
function arcade_module_own(key)
{
    arcade.owned[key]++;
    return arcade_module_install(key);
}

// An owned level put in, free, when there is one spare and the power for it
function arcade_module_install(key)
{
    if ((upgrades[key] >= arcade.owned[key]) || (module_power(key) > arcade_power_free())) {
        return false;
    }
    arcade.fitted.push(key);
    arcade_modules_apply();
    if (key === 'shield') {
        player.shield = shield_max();
    }
    return true;
}

// A module's top installed level taken out, free; it stays owned
function arcade_module_remove(key)
{
    const i = arcade.fitted.lastIndexOf(key);
    if (i < 0) {
        return false;
    }
    arcade.fitted.splice(i, 1);
    arcade_modules_apply();
    return true;
}

// The reactor too small for what is installed (a ship with less power): the newest levels come out until it holds them;
// what came out, a key a level
function arcade_power_fit()
{
    const out = [];
    while (arcade_power_used() > arcade_power_capacity()) {
        out.push(arcade.fitted.pop());
    }
    if (out.length) {
        arcade_modules_apply();
    }
    return out;
}

// What a ship's reactor would leave out of what is installed now: the newest levels past its power, a key a level
function arcade_power_cut(ship)
{
    const capacity = arcade_power_capacity(ship);
    const out = [];
    let used = arcade_power_used();
    for (let i = arcade.fitted.length - 1; (i >= 0) && (used > capacity); --i) {
        used -= module_power(arcade.fitted[i]);
        out.push(arcade.fitted[i]);
    }
    return out;
}

// Levels just taken out (a key a level) as words: Hotter plasma 3, Rapid resonance 2–3
function arcade_power_levels_text(keys)
{
    const words = [];
    for (const key of [...new Set(keys)]) {
        const option = upgrade_options.find(v => v.key === key);
        const n = keys.filter(v => v === key).length;
        words.push(`${option.title} ${upgrades[key] + 1}${(n > 1) ? `–${upgrades[key] + n}` : ''}`);
    }
    return words.join(', ');
}

// What the levels do in the arcade, where a build of one kind must carry a run (the campaign keeps its own numbers).
// Three builds, each on a small common core (Prism 1, Phase armor 1, Shield capacitor 1), each win about half of
// bin/playtest's runs (docs/balance.md, The arcade's power budget): the guns (Hotter plasma, Rapid resonance, Prism),
// the tank (armour, shield, drones, nanites) and the slippery one (evasion, Slipstream, the pulse and the generator).
// So: an orbit drone's bolt grows by drone_step a step, as the raiders' hull and armour do, every drone_gap seconds;
// the nanites mend this share of the hull a second, with no wait; a Generator level is the generator's (generator.js); each
// Pulse amplifier level adds pulse_step a step to its 60; each Turbo drive level cuts the dash cooldown by dash; each
// Evasive thrusters level slips this share of the raiders' shots that reach you (evade), each Slipstream level this
// (evade_speed), together no more than evade_max; each Rapid resonance level cuts the interval by rate, each Phase
// armor level a hit by armor.
const arcade_module_tune = {
    drone_step: 16, drone_gap: 0.3, nanites: 0.012, pulse_step: 80, dash: 1.4, evade: 0.17, evade_speed: 0.08, evade_max: 0.5,
    rate: 0.2, armor: 0.15,
};

// A module's line at the arcade's depot, where it does more than the campaign's line says
function arcade_module_line(option)
{
    const t = arcade_module_tune;
    const lines = {
        drone: 'A drone circles you and shoots; its bolts grow with every world.',
        nanites: 'The hull repairs itself, even under fire.',
        reactor: 'More energy a second: the shield, turbo and pulse refill faster.',
        pulse: 'Your pulse (Space) blasts wider, and harder every world.',
        evasive: `Slips ${Math.round(t.evade*100)}% of the shots that reach you; steers round rocks.`,
        speed: `Faster cruising; slips ${Math.round(t.evade_speed*100)}% of the shots that reach you.`,
        rate: `Each level cuts the guns' interval by ${Math.round(t.rate*100)}%.`,
        armor: `Hull plates: every hit does ${Math.round(t.armor*100)}% less each level.`,
    };
    return lines[option.key] || option.line;
}

// An orbit drone's bolt and the gap between its shots
function drone_bolt_damage()
{
    return 10 + upgrades.damage*3 + (arcade.active ? arcade_module_tune.drone_step*arcade_level() : 0);
}

function drone_fire_gap()
{
    return arcade.active ? arcade_module_tune.drone_gap : 0.42;
}

// The hull the nanites mend a second, and whether they wait for 5 s unhit (the campaign's)
function nanites_rate()
{
    return arcade.active ? upgrades.nanites*arcade_module_tune.nanites*hull_max() : upgrades.nanites*0.35;
}



// What each Pulse amplifier level adds to the pulse's damage (a flagship's twice that)
function pulse_amp_damage()
{
    return 60 + (arcade.active ? arcade_module_tune.pulse_step*arcade_level() : 0);
}

// What each Turbo drive level cuts from the dash cooldown
function dash_cut()
{
    return arcade.active ? arcade_module_tune.dash : 0.9;
}

// A raider's shot that reaches you in the arcade: true when it slips past (the Evasive thrusters' and Slipstream's
// share, at most half, counted out exactly, not by dice: of ten shots at 30%, the 4th, the 7th and the 10th slip)
function arcade_evade_shot()
{
    const t = arcade_module_tune;
    const share = arcade.active ? Math.min(t.evade_max, upgrades.evasive*t.evade + upgrades.speed*t.evade_speed) : 0;
    if (!share || (player.invincible > 0)) {
        return false;
    }
    arcade.evade = (arcade.evade || 0) + share;
    if (arcade.evade < 1) {
        return false;
    }
    arcade.evade -= 1;
    return true;
}

// What each Rapid resonance level cuts from the guns' interval
function rate_cut()
{
    return arcade.active ? arcade_module_tune.rate : 0.12;
}

// What each Phase armor level cuts from a hit (Obsidian's rule: 15% a level)
function armor_cut()
{
    return Math.max((campaign.world === 4) ? 0.15 : 0.12, arcade.active ? arcade_module_tune.armor : 0);
}
