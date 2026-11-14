// Deposits: a rock holds a large reserve of units, by its size (about 180 to 370 of ore; a rich rock 55 to 115 of the
// world's resource). In the campaign your shots, missiles and the pulse cut it (ore_cut): the damage frees units, into
// the hold at once. The rock's bar is the share of its reserve left; it wears down a little as it is mined and breaks
// only when it is empty. A field is mined out when its last rock is.
// The damage of your guns that frees one unit. Tuned on the start ship: its pulse cannon fills the hold of 40 in about
// 145 s of fire (docs/balance.md)
const ore_cut_cost = 250;

// The rock's reserve, set the first time it is asked for; a rock of an older save keeps the share it had left
function ore_reserve(rock)
{
    if (rock.deposit !== 2) {
        const left = Number.isFinite(rock.reserve) ? rock.reserve/Math.max(1, rock.reserve0) : 1;
        rock.r0 = rock.r0 || rock.r;
        rock.reserve0 = rock.resource ? Math.round(rock.r0*2.5) : Math.round(rock.r0*8);
        rock.reserve = Math.max(1, Math.round(rock.reserve0*left));
        rock.deposit = 2;
    }
    // one bar for a rock: what raiders' fire wore off it (Dustfall, Obsidian) is gone from its reserve too
    const left = Math.ceil(rock.reserve0*Math.max(0, rock.hp)/rock.max_hp);
    if (rock.reserve > left) {
        rock.reserve = left;
    }
    return rock.reserve;
}

// A campaign rock hit by your shot, missile or pulse: the damage cuts into it, a unit freed for every ore_cut_cost of
// it. Each unit goes into the hold at once (ore_load) and counts toward a mining stage; the rock's bar falls with its
// reserve, and the last unit breaks it
function ore_cut(rock, amount)
{
    if ((rock.hp <= 0) || (ore_reserve(rock) <= 0)) {
        return;
    }
    rock.flash = 0.1;
    rock.chip = (rock.chip || 0) + amount;
    const units = Math.min(rock.reserve, Math.floor(rock.chip/ore_cut_cost));
    if (!units) {
        return;
    }
    rock.chip -= units*ore_cut_cost;
    rock.reserve -= units;
    rock.r = rock.r0*(0.8 + 0.2*Math.sqrt(rock.reserve/rock.reserve0));
    ore_load({resource: rock.resource, amount: units, x: rock.x, y: rock.y - rock.r - 14});
    mission_event('mining', units);
    if (rock.reserve > 0) {
        rock.hp = rock.max_hp*rock.reserve/rock.reserve0;
        mark_mining_changed();
        return;
    }
    ore_break(rock);
}

// A campaign rock with nothing left in it breaks; one of Dustfall leaves a unit of ore more
function ore_break(rock)
{
    physics_base_damage_ore(rock, rock.hp + 1);
    if ((campaign.world === 2) && (cargo_count() < cargo_capacity())) {
        campaign.cargo.ore++;
        save_checkpoint();
    }
}

// What a field still holds: plain ore, and its resource if it is rich
function field_reserves(field)
{
    const out = {ore: 0, resource: 0, key: null};
    for (const rock of ore_nodes) {
        if ((rock.hp <= 0) || (rock.field !== field.id)) {
            continue;
        }
        if (rock.resource) {
            out.resource += ore_reserve(rock);
            out.key = rock.resource;
        }
        else {
            out.ore += ore_reserve(rock);
        }
    }
    return out;
}

// A field's reserves as a short label: ORE 140 · HAVEN IRON 30
function field_reserves_text(field)
{
    const v = field_reserves(field);
    const parts = [];
    if (v.ore) {
        parts.push(`ORE ${v.ore}`);
    }
    if (v.resource) {
        parts.push(`${resource_of(v.key).name.toUpperCase()} ${v.resource}`);
    }
    return parts.join(' · ') || 'MINED OUT';
}
