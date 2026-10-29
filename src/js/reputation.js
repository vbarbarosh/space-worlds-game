// What each world thinks of you, from −10 to +10, in five tiers (docs/scenario/README.md, Reputation): work done
// raises it, a contract dropped or a freighter lost lowers it; the tier sets the station's prices and whether it lets
// you dock, and a fine paid sets it back to 0
const reputation_tiers = [
    {id: 'wanted', name: 'Wanted', min: -10, buy: 1.1, sell: 0.9, contracts: 1, text: 'the station refuses docking'},
    {id: 'suspect', name: 'Suspect', min: -4, buy: 1.1, sell: 0.9, contracts: 1, text: 'prices 10% worse'},
    {id: 'neutral', name: 'Neutral', min: 0, buy: 1, sell: 1, contracts: 1, text: 'nothing special'},
    {id: 'established', name: 'Established', min: 3, buy: 0.95, sell: 1, contracts: 1.1, text: '5% off at the market, contracts pay 10% more'},
    {id: 'trusted', name: 'Trusted', min: 8, buy: 0.95, sell: 1, contracts: 1.1, text: '5% off at the market, contracts pay 10% more'},
];
const reputation_min = -10;
const reputation_max = 10;
// What a fine costs for each point below 0, before the world's tier adds to it
const reputation_fine_per_point = 120;

// A save's reputation as whole numbers within the range, one per world; a save from before the tiers counted every
// contract done with no limit, so it comes back clamped
function reputation_sanitize(list)
{
    return worlds.map((v, i) => clamp(Math.round(Number(list?.[i]) || 0), reputation_min, reputation_max));
}

function reputation_of(id = campaign.world)
{
    return campaign.reputation?.[id] || 0;
}

function reputation_tier(id = campaign.world)
{
    const value = reputation_of(id);
    return reputation_tiers.findLast(v => value >= v.min);
}

// A change to a world's reputation: kept within the range, and a lowering kept above floor (a dropped contract or a
// lost freighter leaves you Suspect at worst; only hitting a world's own ships makes you Wanted); a new tier is told
function reputation_change(id, delta, why, floor = reputation_min)
{
    ensure_career();
    const before = reputation_of(id);
    const after = (delta < 0) ? Math.max(Math.min(before, floor), before + delta) : Math.min(reputation_max, before + delta);
    if (after === before) {
        return;
    }
    const tier = reputation_tier(id);
    campaign.reputation[id] = clamp(after, reputation_min, reputation_max);
    play_log_event('reputation', {world: id, from: before, to: campaign.reputation[id], why});
    const now = reputation_tier(id);
    if (now !== tier) {
        show_toast(`${worlds[id].name.toUpperCase()}: ${now.name.toUpperCase()}`, now.text.toUpperCase(), 4, (after < before) ? 'danger' : 'info');
    }
    // a world that trusts you signs the Charter (charter.js)
    if (now.id === 'trusted') {
        charter_sign(id);
    }
}

// The fine that sets a world's reputation back to 0: more the lower it is and the farther out the world; nothing
// to pay at 0 or above
function reputation_fine(id)
{
    const value = reputation_of(id);
    return (value >= 0) ? 0 : Math.round(-value*reputation_fine_per_point*(1 + 0.3*world_tier(id))/10)*10;
}

// Where a world's fine can be paid from this station: its own, while it lets you dock, and any world linked to it.
// A world none of whose neighbours you have reached takes it at its own station, Wanted or not, so nobody is left
// with nowhere to pay
function reputation_fine_here(id)
{
    if ((reputation_fine(id) <= 0) || !campaign.visited.includes(id)) {
        return false;
    }
    if (id === campaign.world) {
        return true;
    }
    return worlds[campaign.world].links.includes(id);
}

// A fine paid: the world's reputation back to 0. What you cannot afford of it is forgiven, so an outlaw with empty
// pockets still gets a way back
function reputation_pay_fine(id)
{
    const fine = reputation_fine(id);
    if (!fine || !reputation_fine_here(id)) {
        return;
    }
    const paid = Math.min(fine, Math.max(0, salvage));
    salvage -= paid;
    play_log_spend('fine', worlds[id].name, paid);
    reputation_change(id, -reputation_of(id), 'fine');
    // the amount not at the end: a toast ending in ◆ n reads as income (show_toast)
    show_toast('FINE PAID', `◆ ${paid} · ${worlds[id].name.toUpperCase()} BACK TO NEUTRAL`, 4, 'info');
    save_checkpoint();
    if (state === 'upgrade') {
        render_station();
    }
}

// A Wanted pilot at the station: docking refused, with where the fine can be paid; when no neighbour of this world
// has been reached, the station takes the fine over the comm and docks you
function reputation_dock_refused()
{
    const id = campaign.world;
    if (reputation_tier(id).id !== 'wanted') {
        return false;
    }
    const neighbours = worlds[id].links.filter(v => campaign.visited.includes(v));
    if (!neighbours.length) {
        reputation_pay_fine(id);
        return false;
    }
    const names = neighbours.map(v => worlds[v].name.toUpperCase()).join(' OR ');
    show_toast('DOCKING REFUSED', `WANTED IN ${worlds[id].name.toUpperCase()} · PAY THE FINE AT ${names}`, 5, 'danger');
    return true;
}

// A market price as this world's reputation makes it: a Suspect or Wanted pilot pays more and gets less, an
// Established or Trusted one pays 5% less
function reputation_price(id, side, price)
{
    const tier = reputation_tier(id);
    return Math.max(1, Math.round(price*((side === 'buy') ? tier.buy : tier.sell)*career_price_k(id, side)));
}

// The reputation bars of the GOALS tab: one row per world you know, the bar from its middle (0) to the left in red
// for a debt, to the right in the world's colour, and its tier
function reputation_rows_html()
{
    return campaign.visited.map(function (id) {
        const value = reputation_of(id);
        const width = (Math.abs(value)/reputation_max)*50;
        const bar = (value < 0)
            ? `<i class="debt" style="width:${width}%;margin-left:${50 - width}%"></i>`
            : `<i style="width:${width}%;margin-left:50%;background:var(--w-${world_slug(id)})"></i>`;
        const tier = reputation_tier(id);
        return `<span>${worlds[id].name}</span><span class="b" title="${value > 0 ? '+' : ''}${value} of ${reputation_min} to +${reputation_max}">${bar}</span><span class="v rep-${tier.id}">${tier.name}</span>`;
    }).join('');
}

// Under the bars, a button for each fine this station takes: the world, and what paying costs
function reputation_fines_element()
{
    const fines = document.createElement('div');
    fines.className = 'rep-fines';
    for (const id of campaign.visited.filter(reputation_fine_here)) {
        const price = Math.min(reputation_fine(id), Math.max(0, salvage));
        fines.append(ui_button({label: `Pay ${worlds[id].name}'s fine`, price, size: 'sm', title: `${worlds[id].name} back to Neutral`, on: () => reputation_pay_fine(id)}));
    }
    return fines.childElementCount ? fines : null;
}
