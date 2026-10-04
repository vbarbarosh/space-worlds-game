function contract_copy(template, main = false)
{
    const out = {...clone(template), id: ++campaign.serial, progress: 0, ready: false, main, scans: [], issuer: campaign.world, stage_index: 0};
    if (out.stages) {
        sync_stage(out);
    }
    return out;
}

function expedition_base_offered_jobs()
{
    const id = campaign.world;
    const t = worlds[id];
    const other = t.links[(campaign.board || 0) % t.links.length];
    const scale = id + 1;
    return [
        {
            title: 'Clear the patrol lanes',
            type: 'hunt',
            world: id,
            target: 8 + id*2,
            reward: 125 + scale*55,
            description: `Destroy ${8 + id*2} hostile ships in ${t.name}.`,
        },
        {
            title: 'Survey-grade extraction',
            type: 'mining',
            world: id,
            target: 6 + id,
            reward: 95 + scale*40,
            description: `Mine ${6 + id} ore rocks in ${t.name}. Ore remains yours to trade.`,
        },
        {
            title: `Sealed dispatch to ${worlds[other].name}`,
            type: 'courier',
            world: other,
            target: 1,
            reward: 160 + scale*45,
            description: `Dock at ${worlds[other].station} with the sealed package. Check destination requirements first.`,
        },
        {
            title: 'Map the frontier',
            type: 'survey',
            world: id,
            target: 3,
            reward: 160 + scale*40,
            description: `Scan three marked beacons in ${t.name}.`,
        },
        {
            title: 'Escort a freighter',
            type: 'escort',
            world: id,
            target: 1,
            reward: 210 + scale*55,
            description:
                `Escort the freighter's cargo run: it loads at a mining field, then unloads at the station, ${escort_route_text(escort_route())}. Raiders strike at the stops. G, or a double click on it, flies you in formation behind it.`,
        },
        {
            title: `Market supply: ${commodities[id % 3].name}`,
            type: 'trade',
            world: id,
            commodity: commodities[id % 3].key,
            target: 8,
            reward: 130 + scale*35,
            description: `Sell eight units of ${commodities[id % 3].name} at this station after accepting. Mining or importing cargo both count.`,
        },
    ];
}

function guide_base_accept_contract(template, main = false)
{
    if ((state !== 'upgrade') || (campaign.contracts.length >= 3)) {
        return;
    }
    if (main && campaign.contracts.some(v => v.main)) {
        return;
    }
    if (!main && campaign.contracts.some(v => v.title === template.title)) {
        return;
    }
    campaign.contracts.push(contract_copy(template, main));
    campaign.board++;
    save_checkpoint();
    render_station();
}

function expedition_base_guide_base_claim_contract(id)
{
    if (state !== 'upgrade') {
        return;
    }
    const m = campaign.contracts.find(v => v.id === id);
    if (!m || !m.ready) {
        return;
    }
    salvage += m.reward;
    score += m.reward*10;
    campaign.completed++;
    if (m.main) {
        campaign.story++;
        if (campaign.story === story.length) {
            show_toast('THE FRONTIER IS YOURS', 'STORY COMPLETE / KEEP EXPLORING AND TAKING CONTRACTS', 6);
        }
    }
    campaign.contracts = campaign.contracts.filter(v => v.id !== id);
    save_checkpoint();
    render_station();
    sfx('upgrade');
}

function card(parent, title, text, meta, button_label, action, disabled = false, className = '')
{
    // inside a screen on the UI kit, the kit's card
    if (parent.closest('.ui')) {
        const c = ui_card({
            title,
            text,
            note: '',
            state: (className === 'active') ? 'is-selected' : '',
            action: button_label ? ui_button_from_label(button_label, {size: 'sm', disabled, on: action}) : null,
        });
        if (meta) {
            c.querySelector('.foot').insertAdjacentHTML('beforebegin', `<p class="small card-meta">${meta}</p>`);
        }
        parent.append(c);
        return c;
    }
    const c = document.createElement('div');
    c.className = `frontier-card ${className}`;
    const h = document.createElement('h3');
    h.textContent = title;
    c.append(h);
    const p = document.createElement('p');
    p.textContent = text;
    c.append(p);
    const small = document.createElement('small');
    small.textContent = meta;
    c.append(small);
    if (button_label) {
        const b = document.createElement('button');
        b.textContent = button_label;
        b.disabled = disabled;
        b.addEventListener('click', action);
        c.append(b);
    }
    parent.append(c);
    return c;
}

// The station's contracts on the kit: the ones you carry on the left (with their free slots), the ones offered here
// on the right; a finished one carries the panel's primary button, Collect reward [C]
function render_station_contracts(parent)
{
    parent.classList.add('contracts');
    const taken = document.createElement('div');
    taken.className = 'contracts-column';
    taken.innerHTML = `<h3 class="h-section">Taken <span class="eyebrow eyebrow--muted">${campaign.contracts.length} of 3</span></h3>`;
    const offered = document.createElement('div');
    offered.className = 'contracts-column offered';
    offered.innerHTML = `<h3 class="h-section">Offered here <span class="eyebrow eyebrow--muted">${worlds[campaign.world].station} · refreshes on undock</span></h3>`;
    parent.append(taken, offered);
    const full = campaign.contracts.length >= 3;
    for (const m of campaign.contracts) {
        const tracked = focused_contract() === m;
        const actions = document.createElement('span');
        actions.className = 'card-actions';
        if (m.ready) {
            actions.append(ui_button({label: 'Collect reward', key: 'C', kind: 'primary', size: 'sm', on: () => claim_contract(m.id)}));
        }
        else {
            actions.append(ui_button({label: 'Abandon', kind: 'ghost', size: 'sm', on: () => contract_abandon(m)}));
            actions.append(ui_button({label: tracked ? 'Following' : 'Follow', size: 'sm', disabled: tracked, on: () => contract_follow(m)}));
        }
        taken.append(ui_card({
            tags: `${ui_world_badge(m.world)}<span class="eyebrow eyebrow--muted" style="margin-left:auto">${m.ready ? 'Complete' : contract_stage_text(m)}</span>`,
            title: m.title,
            text: m.description,
            note: `<span class="money">${ui_number(m.reward)}</span>`,
            action: actions,
            state: m.ready ? 'is-done' : tracked ? 'is-selected' : '',
        }));
        taken.lastChild.querySelector('.foot').insertAdjacentHTML('beforebegin', contract_stages_html(m));
    }
    for (let i = campaign.contracts.length; i < 3; ++i) {
        taken.insertAdjacentHTML('beforeend', '<div class="contract-slot">Free slot</div>');
    }
    const offers = [];
    if ((campaign.story < story.length) && !campaign.contracts.some(v => v.main)) {
        offers.push({...story[campaign.story], main: true, label: `Story ${campaign.story + 1} / ${story.length} · ${story[campaign.story].title}`});
    }
    for (const m of offered_jobs()) {
        offers.push({...m, label: m.title});
    }
    for (const m of offers) {
        const dupe = campaign.contracts.some(v => v.title === m.title);
        offered.append(ui_card({
            tags: `${ui_world_badge(m.world)}<span class="eyebrow eyebrow--muted" style="margin-left:auto">${m.main ? 'Story' : m.type}</span>`,
            title: m.label,
            text: m.description,
            note: `<span class="money">${ui_number(m.reward)}</span>`,
            action: ui_button({label: dupe ? 'Taken' : full ? 'No free slot' : 'Accept', size: 'sm', disabled: full || dupe, on: () => accept_contract(m, !!m.main)}),
        }));
    }
}

// A contract's stage, for its card: Stage 2 of 3, or how far along a one-stage one is
function contract_stage_text(m)
{
    return m.stages ? `Stage ${m.stage_index + 1} of ${m.stages.length}` : `${format_progress(m.progress)} / ${m.target}`;
}

// A contract's stages as gold bars: done, the one under way, and those to come
function contract_stages_html(m)
{
    const count = m.stages ? m.stages.length : 1;
    const now = m.stages ? m.stage_index : 0;
    const bars = [];
    for (let i = 0; i < count; ++i) {
        bars.push(`<b class="${(m.ready || (i < now)) ? 'done' : (i === now) ? 'now' : ''}"></b>`);
    }
    return `<div class="stages">${bars.join('')}</div>`;
}

function contract_follow(m)
{
    track_contract(m);
    render_station();
}

function contract_abandon(m)
{
    campaign.contracts = campaign.contracts.filter(v => v.id !== m.id);
    escort = null;
    save_checkpoint();
    render_station();
}

function guide_base_render_contracts(parent, board = false)
{
    for (const contract of campaign.contracts) {
        const meta =
            `${worlds[contract.world].name} · ${format_progress(contract.progress)}/${contract.target} · ◆ ${contract.reward}${contract.main ? ' · STORY' : ''}`;
        function on_action() {
            if (contract.ready && board) {
                claim_contract(contract.id);
            }
            else if (board) {
                campaign.contracts = campaign.contracts.filter(v => v.id !== contract.id);
                escort = null;
                save_checkpoint();
                render_station();
            }
            else {
                if (contract.ready) {
                    waypoint = {...station, label: worlds[campaign.world].station};
                }
                else {
                    track_contract(contract);
                }
                toggle_navigation();
            }
        }
        const c = card(
            parent,
            contract.title,
            contract.description,
            meta,
            (contract.ready && board) ? 'Collect reward' : board ? 'Abandon contract' : 'Track objective',
            on_action,
            false,
            contract.ready ? 'active' : ''
        );
    }
    if (board) {
        if ((campaign.story < story.length) && !campaign.contracts.some(v => v.main)) {
            const m = story[campaign.story];
            card(
                parent,
                `STORY ${campaign.story + 1} / ${story.length} · ${m.title}`,
                m.description,
                `${worlds[m.world].name} · ◆ ${m.reward}`,
                'ACCEPT STORY CONTRACT',
                () => accept_contract(m, true),
                campaign.contracts.length >= 3
            );
        }
        for (const m of offered_jobs()) {
            card(
                parent,
                m.title,
                m.description,
                `${worlds[m.world].name} · ◆ ${m.reward}`,
                'ACCEPT CONTRACT',
                () => accept_contract(m),
                (campaign.contracts.length >= 3) || campaign.contracts.some(v => v.title === m.title)
            );
        }
    }
    else if (!campaign.contracts.length) {
        card(
            parent,
            'Your log is clear',
            'Dock at a station to accept story missions and repeatable contracts. You can carry three at a time.',
            'No time limits · Progress persists across worlds'
        );
    }
}

function dock_station()
{
    if ((state !== 'playing') || (distance(player, station) > station_reach)) {
        return;
    }
    state = 'upgrade';
    waypoints_clear();
    drones_recall_now();
    stop_turbo();
    touch_boost_hold = false;
    keys.clear();
    mouse_drive.active = false;
    mouse_drive.following = false;
    joystick.active = false;
    player.vx = player.vy = 0;
    player.dash_time = 0;
    player.turbo_active = false;
    player.turbo_fuel = turbo_duration();
    player.dash_cd = 0;
    player.radiation_dose = 0;
    player.heat = 0;
    player.overheated = false;
    player.hp = hull_max();
    player.shield = shield_max();
    hostile = [];
    enemies = enemies.filter(v => distance(v, station) > station_shelter + 300);
    mission_event('courier', 1);
    dock_free_chosen = true;
    dock_message = 'Hull repaired and shields restored. Contracts are untimed. Your flight is saved.';
    station_tab = 'jobs';
    station_docked_at = performance.now();
    // a course to the station ends here
    if (guide_manual?.dock) {
        guide_manual = null;
    }
    set_hidden(el.upgrade_overlay, false);
    document.getElementById('station_title').textContent = worlds[campaign.world].station;
    save_checkpoint();
    render_station();
}

function undock()
{
    if (state !== 'upgrade') {
        return;
    }
    set_hidden(el.upgrade_overlay, true);
    state = 'playing';
    player.invincible = 3;
    docking_leave();
    patrol_timer = 6;
    save_checkpoint();
    canvas.focus();
}

// After a purchase, the open tab drawn again; the shop keeps the purchase's message
function refresh_station_tab()
{
    if (station_tab === 'outfit') {
        render_shop();
    }
    else {
        render_station();
    }
}

const station_undock_label = '<span>Undock</span><span class="key">R</span>';
// The station's tabs in the order of their number keys
const station_tab_keys = ['jobs', 'market', 'intel', 'outfit', 'hangar', 'arsenal', 'career'];
// When the ship last docked: the key press that docked it (R) must not also undock it
let station_docked_at = 0;

addEventListener('keydown', on_station_key);

function station_tab_open(tab)
{
    station_tab = tab;
    render_station();
}

// Docked: 1–7 open the tabs, C collects a finished reward, T does what the NEXT strip offers, R undocks
function on_station_key(event)
{
    if ((state !== 'upgrade') || (event.timeStamp < station_docked_at) || arcade.active || event.repeat || event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
    }
    const n = Number(event.key);
    if (Number.isInteger(n) && (n >= 1) && (n <= station_tab_keys.length)) {
        event.preventDefault();
        station_tab_open(station_tab_keys[n - 1]);
    }
    else if (event.code === 'KeyC') {
        const m = campaign.contracts.find(v => v.ready);
        if (m) {
            claim_contract(m.id);
        }
    }
    else if (event.code === 'KeyT') {
        guide_action();
    }
    else if (event.code === 'KeyR') {
        undock();
    }
}

// The tabs' gold counts: rewards ready to collect on CONTRACTS, the goal's step on GOALS when it can be done here
function sync_station_tab_counts()
{
    const ready = campaign.contracts.filter(v => v.ready).length;
    const g = goal_state();
    const goal_here = g && (g.index >= 0) && !!g.steps[g.index].buy;
    for (const [tab, n, text] of [['jobs', ready, String(ready)], ['career', goal_here ? 1 : 0, '!']]) {
        const count = document.querySelector(`[data-station="${tab}"] .count`);
        set_hidden(count, !n);
        count.textContent = text;
        count.classList.add('is-alert');
    }
}

function guide_base_render_station()
{
    el.dock_summary.textContent = `${current_ship().name} · rank ${rank_names[pilot_rank()]} · story ${campaign.story}/${story.length}`;
    for (const b of document.querySelectorAll('[data-station]')) {
        b.classList.toggle('is-active', b.dataset.station === station_tab);
    }
    sync_station_tab_counts();
    document.getElementById('station_cargo').innerHTML = `${cargo_count()}<small>/${cargo_capacity()}</small>`;
    const out = station_tab === 'outfit';
    set_hidden(el.shop_grid, !out);
    set_hidden(document.getElementById('outfit_heading'), !out);
    const content = document.getElementById('station_content');
    content.replaceChildren();
    content.classList.remove('contracts', 'arsenal', 'goals');
    if (out) {
        render_shop();
        dock_message =
            'Weapon rating: damage + rate + 3×prism + 2×drones + guided plasma. Defense: armor + shield levels. Use J in flight to check world requirements.';
    }
    else if (station_tab === 'jobs') {
        render_contracts(content, true);
    }
    else {
        render_market(content);
    }
    el.shop_wallet.textContent = ui_number(salvage);
    el.dock_status.textContent = dock_message;
    el.next_sector.disabled = false;
    el.next_sector.innerHTML = station_undock_label;
    update_hud();
}

function guide_base_render_shop()
{
    base_render_shop();
    render_drone_shop_card();
    render_builder_shop_card();
    render_transport_shop_card();
    // on the UI kit every shop card becomes a kit item card
    if (el.shop_grid.closest('.ui')) {
        for (const old of [...el.shop_grid.querySelectorAll('.shop-item')]) {
            old.replaceWith(ui_shop_item(old));
        }
    }
    el.next_sector.innerHTML = station_undock_label;
    el.next_sector.disabled = false;
}
const market_quantity = {ore: 1, cells: 1, relics: 1};
// Cargo a trade contract still has to deliver to another world: SELL ALL keeps it aboard
function cargo_reserved()
{
    return campaign.contracts.filter(v => !v.ready && (v.type === 'trade') && (v.world !== campaign.world)).map(v => v.commodity);
}

// What SELL ALL sells here, and what it pays
function sell_all_offer()
{
    const reserved = cargo_reserved();
    const keys = commodities.map(v => v.key).filter(v => (campaign.cargo[v] > 0) && !reserved.includes(v));
    return {keys, total: keys.reduce((n, v) => n + trade_total(campaign.world, v, 'sell', campaign.cargo[v]), 0), units: keys.reduce((n, v) => n + campaign.cargo[v], 0)};
}

// One button for a pilot who doesn't want to trade: everything aboard, sold here
function sell_all_cargo()
{
    const offer = sell_all_offer();
    if ((state !== 'upgrade') || !offer.keys.length) {
        return;
    }
    const before = salvage;
    for (const key of offer.keys) {
        trade_cargo(key, 'sell', 'all');
    }
    show_toast('CARGO SOLD', `${offer.units} UNITS · ◆ ${salvage - before}`, 2.5);
}

document.getElementById('sell_all_button').addEventListener('click', sell_all_cargo);

function sync_sell_all_button()
{
    const b = document.getElementById('sell_all_button');
    const offer = sell_all_offer();
    set_hidden(b, arcade.active);
    b.disabled = !offer.keys.length;
    b.innerHTML = offer.keys.length ? `<span>Sell all cargo</span><span class="price">${ui_number(offer.total)}</span>` : '<span>Nothing to sell</span>';
}

function trade_cargo(key, side, requested)
{
    if (state !== 'upgrade') {
        return 0;
    }
    const index = commodities.findIndex(v => v.key === key);
    if ((index < 0) || !['buy', 'sell'].includes(side) || ((side === 'buy') && resource_of(key))) {
        return 0;
    }
    const price = market_price(campaign.world, index, side);
    const maximum = (side === 'buy') ? Math.max(0, Math.min(cargo_capacity() - cargo_count(), Math.floor(salvage/price))) : campaign.cargo[key];
    const wanted = (requested === 'all') ? maximum : Math.floor(Number(requested));
    if (!Number.isFinite(wanted) || (wanted < 1)) {
        return 0;
    }
    const amount = Math.min(wanted, maximum);
    if (amount <= 0) {
        return 0;
    }
    campaign.cargo[key] += (side === 'buy') ? amount : -amount;
    salvage += (side === 'buy') ? -amount*price : trade_total(campaign.world, key, side, amount);
    if (side === 'sell') {
        ensure_markets()[campaign.world].demand[key] = Math.max(0, ensure_markets()[campaign.world].demand[key] - amount);
        mission_event('trade', amount, {commodity: key});
    }
    advance_trade_plan(key, side, amount);
    save_checkpoint();
    render_station();
    sfx('pickup');
    return amount;
}

// The CARGO MARKET on the UI kit: a card per good with what you hold and the prices, a quantity (×1, ×10, ×50, all)
// and Buy and Sell with their totals
function render_market_kit(parent)
{
    for (let i = 0, ii = commodities.length; i < ii; ++i) {
        const commodity = commodities[i];
        const resource = resource_of(commodity.key);
        if (resource && (resource.world !== campaign.world) && !campaign.cargo[commodity.key]) {
            continue;
        }
        const price = market_price(campaign.world, i, 'buy');
        const sell = market_price(campaign.world, i, 'sell');
        const owned = campaign.cargo[commodity.key];
        const max_buy = Math.max(0, Math.min(cargo_capacity() - cargo_count(), Math.floor(salvage/price)));
        const demand = ensure_markets()[campaign.world].demand[commodity.key];
        const pick = market_quantity[commodity.key] || 1;
        const buy_n = (pick === 'all') ? max_buy : Math.min(pick, max_buy);
        const sell_n = (pick === 'all') ? owned : Math.min(pick, owned);
        const actions = document.createElement('span');
        actions.className = 'card-actions';
        if (!resource) {
            actions.append(ui_button({label: `Buy ${buy_n}`, price: buy_n*price, size: 'sm', disabled: buy_n < 1, on: () => trade_cargo(commodity.key, 'buy', buy_n)}));
        }
        actions.append(ui_button({label: `Sell ${sell_n}`, price: trade_total(campaign.world, commodity.key, 'sell', sell_n), size: 'sm', kind: (sell_n > 0) ? 'primary' : '', disabled: sell_n < 1, on: () => trade_cargo(commodity.key, 'sell', sell_n)}));
        const c = ui_card({
            tags: resource ? `${ui_world_badge(resource.world)}${ui_badge('Resource')}` : (demand > 0) ? ui_badge(`Demand ${demand}`, 'gold') : ui_badge('No demand'),
            title: commodity.name,
            text: resource ? `Mined, never sold here: ${worlds[resource.world].name} pays 60% of its worth, each world farther away 30% more.` : 'Demand pays +6 a unit until it is filled. TRADE INTEL compares every station.',
            stats: [['CARGO', String(owned)], ...(resource ? [] : [['BUY', `◆ ${price}`]]), ['SELL', `◆ ${sell}`]],
            action: actions,
        });
        const seg = document.createElement('div');
        seg.className = 'seg';
        for (const n of [1, 10, 50, 'all']) {
            const b = document.createElement('button');
            b.textContent = (n === 'all') ? 'All' : `×${n}`;
            b.classList.toggle('is-active', n === pick);
            b.addEventListener('click', function () {
                market_quantity[commodity.key] = n;
                render_station();
            });
            seg.append(b);
        }
        c.querySelector('.foot').before(seg);
        parent.append(c);
    }
}

function render_market(parent)
{
    if (parent.closest('.ui')) {
        render_market_kit(parent);
        return;
    }
    for (let i = 0, ii = commodities.length; i < ii; ++i) {
        const commodity = commodities[i];
        const resource = resource_of(commodity.key);
        if (resource && (resource.world !== campaign.world) && !campaign.cargo[commodity.key]) {
            continue;
        }
        const price = market_price(campaign.world, i, 'buy');
        const sell = market_price(campaign.world, i, 'sell');
        const max_buy = Math.max(0, Math.min(cargo_capacity() - cargo_count(), Math.floor(salvage/price)));
        const owned = campaign.cargo[commodity.key];
        const about = resource
            ? `Mined, never sold here: ${worlds[resource.world].name} pays 60% of its worth, and each world farther away 30% more.`
            : `Station demand: ${ensure_markets()[campaign.world].demand[commodity.key]} units. Demand pays +6 per unit until filled. Open TRADE INTEL to compare all stations.`;
        const cardel = card(
            parent,
            commodity.name,
            about,
            `CARGO ${owned}${resource ? '' : ` · BUY ◆ ${price}`} / SELL ◆ ${sell}`
        );
        const label = document.createElement('label');
        label.className = 'market-quantity';
        label.textContent = 'QUANTITY';
        const input = document.createElement('input');
        input.setAttribute('type', 'number');
        input.setAttribute('min', '1');
        input.setAttribute('max', String(cargo_capacity()));
        input.setAttribute('step', '1');
        input.setAttribute('aria-label', `${commodity.name} trade quantity`);
        input.value = String(market_quantity[commodity.key] || 1);
        label.append(input);
        cardel.append(label);
        const buy = document.createElement('button');
        const sellb = document.createElement('button');
        cardel.append(buy);
        cardel.append(sellb);
        function refresh_buttons() {
            const n = Math.floor(Number(input.value));
            const valid = Number.isFinite(n) && (n >= 1) && (n <= cargo_capacity());
            if (valid) {
                market_quantity[commodity.key] = n;
            }
            buy.textContent = `BUY ${valid ? n : '—'} · ◆ ${valid ? n*price : '—'}`;
            sellb.textContent = `SELL ${valid ? n : '—'} · ◆ ${valid ? trade_total(campaign.world, commodity.key, 'sell', n) : '—'}`;
            buy.disabled = !valid || (n > max_buy) || !!resource;
            buy.hidden = !!resource;
            sellb.disabled = !valid || (n > owned);
        }
        input.addEventListener('input', refresh_buttons);
        buy.addEventListener('click', function () {
            trade_cargo(commodity.key, 'buy', input.value);
        });
        sellb.addEventListener('click', function () {
            trade_cargo(commodity.key, 'sell', input.value);
        });
        const shortcuts = document.createElement('div');
        shortcuts.className = 'market-shortcuts';
        for (const n of [1, 10, 50]) {
            const b = document.createElement('button');
            b.textContent = `×${n}`;
            b.disabled = n > cargo_capacity();
            b.addEventListener('click', function () {
                input.value = String(n);
                refresh_buttons();
            });
            shortcuts.append(b);
        }
        cardel.append(shortcuts);
        const max_actions = document.createElement('div');
        max_actions.className = 'market-max-actions';
        const buy_max = document.createElement('button');
        buy_max.textContent = `BUY MAX ${max_buy} · ◆ ${max_buy*price}`;
        buy_max.disabled = max_buy <= 0;
        buy_max.addEventListener('click', function () {
            trade_cargo(commodity.key, 'buy', 'all');
        });
        max_actions.append(buy_max);
        const sell_all = document.createElement('button');
        sell_all.textContent = `SELL ALL ${owned} · ◆ ${trade_total(campaign.world, commodity.key, 'sell', owned)}`;
        sell_all.disabled = owned <= 0;
        sell_all.addEventListener('click', function () {
            trade_cargo(commodity.key, 'sell', 'all');
        });
        max_actions.append(sell_all);
        cardel.append(max_actions);
        const note = document.createElement('small');
        note.className = 'market-total';
        note.textContent =
            `Free cargo ${Math.max(0, cargo_capacity() - cargo_count())}/${cargo_capacity()} · Can afford ${Math.floor(salvage/price)} units`;
        cardel.append(note);
        refresh_buttons();
    }
}
