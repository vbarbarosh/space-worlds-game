// Sealed cargo, the frontier's one contraband (docs/scenario/README.md, the outlaw's way): two free ports sell it,
// Dustfall's refinery and Nova Forge's foundry, and every other world bans it while its station's back room buys it
// dear, the dearer the farther out. Sealed cargo aboard in a world that bans it is what the guards' inspection looks
// for: found, it is taken, and a fine and 2 reputation go with it (inspection.js)
const contraband = {key: 'sealed', name: 'Sealed cargo', ports: [{world: 2, price: 28}, {world: 6, price: 34}]};
commodities.push(contraband);
// What the back room of a world that bans it pays, before the world's tier adds to it
const contraband_black_price = 70;

// Whether world id sells sealed cargo openly
function contraband_port(id = campaign.world)
{
    return contraband.ports.some(v => v.world === id);
}

// A unit's price at world id: a free port's own, or a back room's, 12 more a tier farther out
function contraband_price(id)
{
    const port = contraband.ports.find(v => v.world === id);
    return port ? port.price : contraband_black_price + 12*world_tier(id);
}

// The sealed cargo aboard that is contraband where you are: all of it, but in a free port
function contraband_aboard(id = campaign.world)
{
    return contraband_port(id) ? 0 : (campaign.cargo[contraband.key] || 0);
}

// Sealed cargo sold in a world that bans it: a smuggle stage there counts it
function contraband_sold(amount)
{
    if (!contraband_port()) {
        mission_event('smuggle', amount);
    }
}

// The market's card text and badge for sealed cargo here
function contraband_card()
{
    if (contraband_port()) {
        return {badge: ui_badge('Free port', 'gold'), text: 'Legal only in the two free ports. Elsewhere back rooms pay well for it, and guards take it.'};
    }
    return {badge: ui_badge('Contraband', 'red'), text: 'Banned here. The back room pays well; a guard\'s scan takes it, with a fine.'};
}
