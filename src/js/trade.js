function ensure_markets()
{
    if (!Array.isArray(campaign.markets) || (campaign.markets.length !== worlds.length)) {
        campaign.markets = worlds.map(function (w, i) {
            return {demand: Object.fromEntries(commodities.map((c, j) => [c.key, (j === expedition_conditions[i].import) ? 80 + i*20 : 0]))};
        });
    }
    return campaign.markets;
}

function market_price(id, index, side)
{
    const base = worlds[id].prices[index];
    const key = commodities[index].key;
    if (side === 'sell') {
        return base - 2 + ((ensure_markets()[id].demand[key] > 0) ? 6 : 0);
    }
    return base + ((ensure_markets()[id].demand[key] > 0) ? 6 : 0);
}

function trade_total(id, key, side, amount)
{
    const i = commodities.findIndex(v => v.key === key);
    if ((i < 0) || !Number.isFinite(amount) || (amount < 0)) {
        return 0;
    }
    return (side === 'buy') ? market_price(id, i, 'buy')*amount : (worlds[id].prices[i] - 2)*amount + Math.min(amount, ensure_markets()[id].demand[key])*6;
}
let intel_commodity = 'all';
function trade_opportunities()
{
    const out = [];
    for (let i = 0, ii = commodities.length; i < ii; ++i) {
        const commodity = commodities[i];
        if ((intel_commodity !== 'all') && (intel_commodity !== commodity.key)) {
            continue;
        }
        for (let a = 0, aa = worlds.length; a < aa; ++a) {
            const source = worlds[a];
            for (let b = 0, end = worlds.length; b < end; ++b) {
                const world = worlds[b];
                if (a === b) {
                    continue;
                }
                const buy = market_price(a, i, 'buy');
                const max = Math.min(cargo_capacity() - cargo_count(), Math.floor(salvage/buy));
                const amount = Math.max(0, max);
                const margin = trade_total(b, commodity.key, 'sell', amount) - amount*buy;
                const unit = market_price(b, i, 'sell') - buy;
                const route = route_from_world_to_world(a, b);
                const approach = route_to(a);
                const blocked = [...approach, ...route].find(v => !allowed_world(v));
                if (unit > 0) {
                    out.push({source: a, destination: b, commodity: commodity.key, amount, margin, unit, buy, route, approach, blocked});
                }
            }
        }
    }
    out.sort(function (a, b) {
        const ready_a = a.blocked === undefined;
        const ready_b = b.blocked === undefined;
        if (ready_a !== ready_b) {
            return ready_a ? -1 : 1;
        }
        const score_a = (a.margin || a.unit)/(a.route.length + a.approach.length - 1);
        const score_b = (b.margin || b.unit)/(b.route.length + b.approach.length - 1);
        return score_b - score_a;
    });
    return out;
}

function plan_trade(v)
{
    if (!['upgrade', 'navigation'].includes(state) || !v.amount) {
        return;
    }
    campaign.trade_plan = {
        source: v.source,
        destination: v.destination,
        commodity: v.commodity,
        amount: v.amount,
        remaining: v.amount,
        margin: v.margin,
        stage: 'buy',
        bought: 0,
    };
    campaign.route_world = v.source;
    campaign.tracked_id = null;
    guide_manual = null;
    guide_flying = false;
    guide_path_key = '';
    guide_context_cache = null;
    save_checkpoint();
    if (state === 'upgrade') {
        station_tab = (campaign.world === v.source) ? 'market' : 'intel';
        render_station();
    }
    else {
        nav_tab = 'worlds';
        render_navigation();
    }
    show_toast('TRADE ROUTE PLANNED', 'BUY AT ' + worlds[v.source].name.toUpperCase() + ' → SELL AT ' + worlds[v.destination].name.toUpperCase(), 4);
}

function plan_cargo_sale(key, destination)
{
    const amount = campaign.cargo[key];
    if (!amount) {
        return;
    }
    campaign.trade_plan = {
        source: campaign.world,
        destination,
        commodity: key,
        amount,
        remaining: amount,
        margin: null,
        proceeds: trade_total(destination, key, 'sell', amount),
        stage: 'sell',
        bought: amount,
    };
    campaign.route_world = destination;
    campaign.tracked_id = null;
    guide_manual = null;
    guide_flying = false;
    guide_path_key = '';
    guide_context_cache = null;
    save_checkpoint();
    if (state === 'navigation') {
        nav_tab = 'worlds';
        render_navigation();
    }
    else {
        render_station();
    }
    show_toast('SALE ROUTE PLANNED', 'SELL AT ' + worlds[destination].station.toUpperCase(), 4);
}

function advance_trade_plan(key, side, amount)
{
    const p = campaign.trade_plan;
    if (!p || (p.commodity !== key)) {
        return;
    }
    if ((p.stage === 'buy') && (side === 'buy') && (campaign.world === p.source)) {
        p.bought = (p.bought || 0) + amount;
        if (p.bought >= p.amount) {
            p.remaining = p.bought;
            p.stage = 'sell';
            campaign.route_world = p.destination;
            guide_path_key = '';
            guide_context_cache = null;
            show_toast('CARGO LOADED', 'SELL AT ' + worlds[p.destination].station.toUpperCase(), 4);
        }
    }
    else if ((p.stage === 'sell') && (side === 'sell')) {
        p.remaining = Math.max(0, p.remaining - amount);
        if (p.remaining === 0) {
            campaign.trade_plan = null;
            campaign.route_world = null;
            guide_context_cache = null;
            show_toast('TRADE ROUTE COMPLETE', 'CARGO SOLD / OPEN TRADE INTEL FOR YOUR NEXT RUN', 4);
        }
    }
}

function render_trade_intel(parent)
{
    parent.replaceChildren();
    ensure_markets();
    const intro = document.createElement('div');
    intro.className = 'frontier-card intel-wide';
    const title = document.createElement('h3');
    title.className = 'intel-heading';
    title.textContent = 'Station demand & trade routes';
    intro.append(title);
    const p = document.createElement('p');
    p.textContent =
        'Live regional quotes. Importing stations pay +6 for their remaining demand, then return to the normal sell price. Demand recovers by 10 units every 90 seconds of flight. Route estimates use your current credits and free hold; equipment costs are separate.';
    intro.append(p);
    const controls = document.createElement('label');
    controls.className = 'intel-filter';
    controls.textContent = 'RESOURCE';
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Trade intelligence resource');
    for (const c of [{key: 'all', name: 'All resources'}, ...commodities]) {
        const o = document.createElement('option');
        o.value = c.key;
        o.textContent = c.name;
        select.append(o);
    }
    select.value = intel_commodity;
    select.addEventListener('change', function () {
        intel_commodity = select.value;
        render_trade_intel(parent);
    });
    controls.append(select);
    intro.append(controls);
    parent.append(intro);
    const wrap = document.createElement('div');
    wrap.className = 'intel-table-wrap intel-wide';
    const table = document.createElement('table');
    table.className = 'intel-table';
    const header = document.createElement('thead');
    header.innerHTML = '<tr><th>WORLD / STATION</th><th>RESOURCE</th><th>BUY ◆</th><th>SELL ◆</th><th>DEMAND</th><th>PREPARATION</th></tr>';
    table.append(header);
    const body = document.createElement('tbody');
    for (let id = 0, id_end = worlds.length; id < id_end; ++id) {
        const world = worlds[id];
        for (let i = 0, ii = commodities.length; i < ii; ++i) {
            const commodity = commodities[i];
            if ((intel_commodity !== 'all') && (intel_commodity !== commodity.key)) {
                continue;
            }
            const row = document.createElement('tr');
            if (id === campaign.world) {
                row.className = 'current';
            }
            const values = [
                world.name + ' / ' + world.station,
                commodity.name,
                market_price(id, i, 'buy'),
                market_price(id, i, 'sell'),
                ensure_markets()[id].demand[commodity.key] + ' units',
                allowed_world(id) ? 'CLEARED' : requirements(id),
            ];
            for (let n = 0, end = values.length; n < end; ++n) {
                const value = values[n];
                const cell = document.createElement('td');
                cell.textContent = value;
                if ((n === 4) && ensure_markets()[id].demand[commodity.key]) {
                    cell.className = 'demand';
                }
                row.append(cell);
            }
            body.append(row);
        }
    }
    table.append(body);
    wrap.append(table);
    parent.append(wrap);
    if (campaign.trade_plan) {
        const t = campaign.trade_plan;
        card(
            parent,
            'Active cargo route',
            worlds[t.source].station + ' → ' + worlds[t.destination].station,
            'NEXT: ' +
                t.stage.toUpperCase() +
                ' ' +
                ((t.stage === 'buy') ? Math.max(0, t.amount - (t.bought || 0)) : t.remaining) +
                ' ' +
                commodities.find(v => v.key === t.commodity).name,
            'CANCEL TRADE PLAN',
            function () {
                campaign.trade_plan = null;
                campaign.route_world = null;
                guide_context_cache = null;
                save_checkpoint();
                render_trade_intel(parent);
            }
        );
    }
    const cargoHeading = document.createElement('h3');
    cargoHeading.className = 'intel-heading intel-wide';
    cargoHeading.textContent = 'Already in your hold · best sale destinations';
    if (cargo_count()) {
        parent.append(cargoHeading);
    }
    for (const c of commodities.filter(v => campaign.cargo[v.key] > 0)) {
        const units = campaign.cargo[c.key];
        const targets = worlds
            .map((w, id) => ({id, proceeds: trade_total(id, c.key, 'sell', units)}))
            .filter(v => v.id !== campaign.world)
            .sort((a, b) => b.proceeds - a.proceeds)
            .slice(0, 2);
        for (const target of targets) {
            const route = route_to(target.id);
            const blocked = route.find(v => !allowed_world(v));
            card(
                parent,
                c.name + ' ×' + units + ' → ' + worlds[target.id].name,
                'Sell the cargo already aboard at ' +
                    worlds[target.id].station +
                    '. ' +
                    ((blocked === undefined) ? 'Your vessel is cleared.' : 'Prepare for ' + worlds[blocked].name + ' before travel.'),
                'SALE PROCEEDS ◆ ' +
                    target.proceeds +
                    ' · DEMAND ' +
                    ensure_markets()[target.id].demand[c.key] +
                    ' · ROUTE ' +
                    route.map(v => worlds[v].name).join(' → '),
                'PLAN SALE OF ONBOARD CARGO',
                () => plan_cargo_sale(c.key, target.id),
                false,
                (blocked === undefined) ? '' : 'locked'
            );
        }
    }
    const heading = document.createElement('h3');
    heading.className = 'intel-heading intel-wide';
    heading.textContent = 'Suggested runs · profit per gate and approach';
    parent.append(heading);
    for (const opportunity of trade_opportunities().slice(0, 6)) {
        const c = commodities.find(v => v.key === opportunity.commodity);
        const route = [...opportunity.approach, ...opportunity.route.slice(1)];
        const cleared = opportunity.blocked === undefined;
        const description =
            'Buy ' +
                c.name +
                ' at ' +
                worlds[opportunity.source].station +
                ' (◆ ' +
                opportunity.buy +
                '), sell at ' +
                worlds[opportunity.destination].station +
                '. ' +
                (cleared ? 'Your vessel meets the gate requirements.' : 'Preparation needed: ' + requirements(opportunity.blocked));
        card(
            parent,
            worlds[opportunity.source].name + ' → ' + worlds[opportunity.destination].name + ' / ' + c.name,
            description,
            'LOAD ' +
                opportunity.amount +
                ' · COST ◆ ' +
                opportunity.amount*opportunity.buy +
                ' · NET ◆ ' +
                opportunity.margin +
                ' · UNIT UP TO +' +
                opportunity.unit +
                ' · DEMAND ' +
                ensure_markets()[opportunity.destination].demand[opportunity.commodity] +
                '\nROUTE ' +
                route.map(v => worlds[v].name).join(' → '),
            opportunity.amount ? 'PLAN BUY → SELL' : 'EARN CREDITS / FREE CARGO',
            () => plan_trade(opportunity),
            opportunity.amount === 0,
            cleared ? '' : 'locked'
        );
    }
    if (!trade_opportunities().length) {
        card(parent, 'No profitable quotes', 'Try a different resource or wait for station demand to recover.', 'Mining produces ore without a purchase cost.');
    }
}
