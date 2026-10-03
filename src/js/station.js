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
            title: 'Escort a freight shuttle',
            type: 'escort',
            world: id,
            target: 1,
            reward: 210 + scale*55,
            description:
                'Meet the shuttle near the station, then protect it along a 1,600-unit route. Hostile ships attack it too. Press G, or double click the shuttle, to fly in formation behind it. Leaving the world resets the escort.',
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
            (contract.ready && board) ? 'COLLECT REWARD' : board ? 'ABANDON CONTRACT' : 'TRACK OBJECTIVE',
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
    if ((state !== 'playing') || (distance(player, station) > 230)) {
        return;
    }
    state = 'upgrade';
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
    enemies = enemies.filter(v => distance(v, station) > 800);
    mission_event('courier', 1);
    dock_free_chosen = true;
    dock_message = 'Hull repaired and shields restored. Contracts are untimed. Your flight is saved.';
    station_tab = 'jobs';
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
    patrol_timer = 6;
    save_checkpoint();
    canvas.focus();
}

function guide_base_render_station()
{
    const w = worlds[campaign.world];
    el.dock_summary.textContent =
        `${w.faction} · ${w.weapons} · Cargo ${cargo_count()}/${cargo_capacity()} · Story ${campaign.story}/${story.length} · ${campaign.completed} contracts completed.`;
    for (const b of document.querySelectorAll('[data-station]')) {
        b.classList.toggle('selected', b.dataset.station === station_tab);
    }
    const out = station_tab === 'outfit';
    set_hidden(el.shop_grid, !out);
    set_hidden(document.getElementById('outfit_heading'), !out);
    const content = document.getElementById('station_content');
    content.replaceChildren();
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
    el.shop_wallet.textContent = salvage;
    el.dock_status.textContent = dock_message;
    el.next_sector.disabled = false;
    el.next_sector.textContent = 'UNDOCK ↗';
    update_hud();
}

function guide_base_render_shop()
{
    base_render_shop();
    render_drone_shop_card();
    el.next_sector.textContent = 'UNDOCK ↗';
    el.next_sector.disabled = false;
}
const market_quantity = {ore: 1, cells: 1, relics: 1};
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

function render_market(parent)
{
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
