// What each world opens: every ship, gun and module level goes on sale in a world of its own (by its tier, Haven 0 to
// Eclipse 7), and reaching that world puts it on every shelf from then on, in the arcade and the campaign alike. A
// campaign's ranks still license ships and guns on top. What a save owns beyond its world stays its own; only buying
// more waits. Where the numbers come from: docs/balance.md, What each world opens.

// The furthest world reached in this game, as a tier: the arcade run's step (arcade_route.js), and from its cleared
// screen on the next one, as its depot is the way into it; in the campaign the furthest world visited, or that a
// chapter claimed took the pilot to (a save from before this kept no more than that)
function world_reached()
{
    if (arcade.active) {
        return Math.min(arcade_worlds - 1, arcade_level() + (arcade.between_worlds ? 1 : 0));
    }
    const chapters = story.slice(0, campaign.story || 0).map(v => v.world).filter(v => worlds[v]);
    return Math.max(...[campaign.world, ...(campaign.visited || []), ...chapters].map(world_tier));
}

// Whether what opens at a tier is on sale now
function tech_open(tier)
{
    return tier <= world_reached();
}

// The world a tier names: Opens in Ion Reach; in the arcade, whose worlds come in the order you choose, the step:
// world 4
function tech_world_name(tier)
{
    return arcade.active ? `world ${tier + 1}` : worlds[worlds.findIndex((v, i) => world_tier(i) === tier)].name;
}

function tech_lock_text(tier)
{
    return `Opens ${arcade.active ? 'at' : 'in'} ${tech_world_name(tier)}`;
}

// Where level `level` (1 to the cap) of a module opens: spread over the eight worlds by its share of the levels, level 1
// in Haven (a module of three levels: Haven, Ion Reach, Cryosphere), unless the module names its own (option.opens)
function module_level_opens(option, level)
{
    return option.opens ? option.opens[level - 1] : Math.min(7, Math.round(((level - 1)/option.cap)*8));
}

// Where each gun tier opens (1 to 5), as world tiers: 2 in Dustfall, 3 Ion Reach, 4 Obsidian (its 40% armour asks for
// it: a plasma kit a tier lower, measured by bin/playtest, could not clear its siege), 5 Nova Forge
const gun_tier_opens = [0, 2, 3, 4, 6];

// The highest gun tier on sale at world tier `tier`; the arcade's free tier for each world cleared stops there
function gun_tier_open(tier)
{
    return gun_tier_opens.filter(v => v <= tier).length;
}

// Where the run's guns grow next, for the depot's gun cards: T3 in Ion Reach, or at the top tier
function gun_tier_next_text()
{
    const tier = weapon_level();
    return (tier >= 5) ? 'Every gun is at its top tier.' : `Every gun grows to T${tier + 1} as you clear the way to ${tech_world_name(gun_tier_opens[tier])}.`;
}

// The tier where a module's next level opens when it has not yet, else null (open, or at its cap)
function module_next_locked(option)
{
    const level = upgrades[option.key] + 1;
    if (level > option.cap) {
        return null;
    }
    const tier = module_level_opens(option, level);
    return tech_open(tier) ? null : tier;
}

// The highest level of a module on sale now
function module_open_cap(option)
{
    const reached = world_reached();
    let out = 0;
    while ((out < option.cap) && (module_level_opens(option, out + 1) <= reached)) {
        out++;
    }
    return out;
}

// What opens past tier `from` up to tier `to`: the ships, the guns, and the module levels as one count
function tech_opened(from, to)
{
    function fresh(tier) {
        return (tier > from) && (tier <= to);
    }
    const out = [...ship_catalog.filter(v => fresh(v.opens)).map(v => v.name), ...weapon_catalog.filter(v => fresh(v.opens)).map(v => v.name)];
    let levels = 0;
    for (const option of upgrade_options) {
        for (let level = 1; level <= option.cap; ++level) {
            levels += fresh(module_level_opens(option, level)) ? 1 : 0;
        }
    }
    if (levels) {
        out.push(`${levels} module level${(levels > 1) ? 's' : ''}`);
    }
    return out;
}

// A campaign world reached for the first time says what it opens, in one line under the world's own title (the
// toast's title column is short, so the world is the banner's to name): Now on sale · Bastion Gunship, Lance railgun,
// ...; the arcade says it in the depot before the world (arcade_depot_fill)
function tech_news(from)
{
    const opened = arcade.active ? [] : tech_opened(from, world_reached());
    if (opened.length) {
        show_toast('Now on sale', `${opened.join(', ')} · at every station`, 3.5);
    }
}
