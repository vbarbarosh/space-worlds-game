// Deposits: a rock holds a reserve of units, by its size (8 to 30 of ore; a rich rock 5 to 11 of the world's
// resource). Drones and outposts drill it a chunk at a time; it shrinks as it is mined and breaks only when it is
// empty. A field is mined out when its last rock is.
const deposit_chunk_cost = 40;

// The rock's reserve, set the first time it is asked for (old saves have none)
function ore_reserve(rock)
{
    if (!Number.isFinite(rock.reserve)) {
        rock.reserve = rock.resource ? Math.round(rock.r*0.24) : Math.round(rock.r*0.65);
        rock.reserve0 = rock.reserve;
        rock.r0 = rock.r;
    }
    return rock.reserve;
}

// Cutting at `amount` this frame: the units it frees (0 or 1); the last one breaks the rock
function ore_chip(rock, amount)
{
    if ((rock.hp <= 0) || (ore_reserve(rock) <= 0)) {
        return 0;
    }
    rock.flash = 0.06;
    rock.chip = (rock.chip || 0) + amount;
    if (rock.chip < deposit_chunk_cost) {
        return 0;
    }
    rock.chip -= deposit_chunk_cost;
    rock.reserve--;
    rock.r = rock.r0*(0.5 + 0.5*Math.sqrt(rock.reserve/rock.reserve0));
    mission_event('mining', 1);
    if (rock.reserve <= 0) {
        rock.depleted = true;
        rock.cutter = rock.cutter || true;
        damage_ore(rock, rock.hp + 1);
    }
    else {
        mark_mining_changed();
    }
    return 1;
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
