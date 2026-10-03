// Each world mines a resource of its own besides plain ore; rich rocks hold it, several units each.
// value: what a unit is worth; a market pays 60% of it at home and 30% more for each world farther away.
const resources = [
    {key: 'iron', name: 'Haven iron', world: 0, color: '#ff7a59', value: 16},
    {key: 'resin', name: 'Spore resin', world: 1, color: '#7cf29a', value: 20},
    {key: 'titanium', name: 'Titanium sand', world: 2, color: '#e9e4d4', value: 24},
    {key: 'charge', name: 'Charge crystals', world: 3, color: '#5fd0ff', value: 30},
    {key: 'heavy', name: 'Heavy metals', world: 4, color: '#9b8cff', value: 36},
    {key: 'helium', name: 'Helium-3 ice', world: 5, color: '#bff4ff', value: 40},
    {key: 'plasma', name: 'Plasma ore', world: 6, color: '#ff4f7a', value: 48},
    {key: 'void', name: 'Void matter', world: 7, color: '#c46bff', value: 60},
];
commodities.push(...resources);

function resource_of(key)
{
    return resources.find(v => v.key === key) || null;
}

// The price a market at world id starts from: the world's own table for the first three, the resource value otherwise.
function commodity_base_price(id, index)
{
    if (index < worlds[id].prices.length) {
        return worlds[id].prices[index];
    }
    const resource = commodities[index];
    return Math.round(resource.value*(0.6 + 0.3*Math.abs(id - resource.world)));
}

// Every third mining field is rich: its rocks hold the world's resource, two to four units by size.
function ore_resource_assign(v, field_id)
{
    if ((field_id % 3) !== 1) {
        return v;
    }
    v.resource = resources[campaign.world].key;
    v.amount = 2 + Math.floor((v.r - 22)/12);
    return v;
}

function ore_color(v)
{
    return v.resource ? resource_of(v.resource).color : gold;
}

// Fills the keys an older save lacks.
function cargo_normalize(cargo)
{
    for (const commodity of commodities) {
        if (!Number.isInteger(cargo[commodity.key])) {
            cargo[commodity.key] = 0;
        }
    }
    return cargo;
}

// Loads what a broken rock held; what does not fit stays behind as a label.
function ore_load(v)
{
    const key = v.resource || 'ore';
    const room = cargo_capacity() - cargo_count();
    const amount = Math.min(room, v.amount || 1);
    campaign.cargo[key] = (campaign.cargo[key] || 0) + amount;
    if (v.resource && (amount > 0)) {
        label(v.x, v.y, `+${amount} ${resource_of(key).name.toUpperCase()}`, ore_color(v));
    }
    if (amount < (v.amount || 1)) {
        label(v.x, v.y + 18, 'CARGO FULL · SALVAGE COLLECTIBLE', gold);
    }
}

// Scanner: rich rocks near the ship show their kind and how much they hold.
function render_ore_scanner()
{
    if (!player) {
        return;
    }
    ctx.save();
    ctx.font = '700 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    for (const v of ore_nodes) {
        if (!v.resource || (v.hp <= 0) || (distance(v, player) > 420) || !in_view(v, v.r + 30)) {
            continue;
        }
        ctx.fillStyle = ore_color(v);
        ctx.fillText(`${resource_of(v.resource).name.toUpperCase()} ×${v.amount}`, v.x, v.y + v.r + 18);
    }
    ctx.restore();
}

// Some raiders carry cargo; a wreck spills it in canisters: the world's resource, energy cells or relic components.
function cargo_spill(enemy)
{
    const chance = {boss: 1, tank: 0.5, shooter: 0.3, lancer: 0.25}[enemy.type] ?? 0.15;
    if (enemy.child || (Math.random() >= chance)) {
        return;
    }
    const count = (enemy.type === 'boss') ? 6 : 1 + Math.floor(Math.random()*2);
    for (let i = 0; i < count; ++i) {
        const key = (Math.random() < 0.6) ? resources[campaign.world].key : (Math.random() < 0.5) ? 'cells' : 'relics';
        pickups.push({
            x: clamp(enemy.x + rand(-30, 30), 25, world.w - 25),
            y: clamp(enemy.y + rand(-30, 30), 25, world.h - 25),
            type: 'cargo',
            key,
            amount: 1 + Math.floor(Math.random()*3),
            value: 0,
            life: 60,
            phase: rand(0, 6.28),
        });
    }
}

function pickup_color(pickup)
{
    if (pickup.type === 'cargo') {
        return resource_of(pickup.key)?.color || '#b9c7d6';
    }
    if (pickup.type === 'artifact') {
        return gold;
    }
    if ((pickup.type === 'health') || (pickup.type === 'medkit')) {
        return cyan;
    }
    return (pickup.type === 'energy') ? pink : blue;
}

// A canister is pulled in and loaded only while the hold has room.
function pickup_takes(pickup)
{
    return (pickup.type !== 'cargo') || (cargo_count() < cargo_capacity());
}

function cargo_collect(pickup, quiet)
{
    const amount = Math.min(pickup.amount, cargo_capacity() - cargo_count());
    campaign.cargo[pickup.key] = (campaign.cargo[pickup.key] || 0) + amount;
    if (!quiet && (amount > 0)) {
        label(pickup.x, pickup.y, `+${amount} ${commodities.find(v => v.key === pickup.key).name.toUpperCase()}`, pickup_color(pickup));
    }
}

// Experience for a kill, by the raider's type; it counts toward the pilot rank that licenses ships.
function kill_xp(enemy)
{
    if (enemy.child) {
        return 1;
    }
    return {boss: 60, tank: 6, lancer: 4, shooter: 3, splitter: 3}[enemy.type] || 2;
}

function kill_xp_grant(enemy)
{
    const old_rank = pilot_rank();
    const xp = kill_xp(enemy);
    campaign.xp += xp;
    label(enemy.x, enemy.y + 22, `+${xp} XP`, blue);
    if (pilot_rank() > old_rank) {
        show_toast('PILOT PROMOTED', `${rank_names[pilot_rank()].toUpperCase()} / NEW HANGAR AND ARSENAL LICENSES`, 5);
    }
}
