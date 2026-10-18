function save_checkpoint()
{
    if (arcade.active || race_mode.active || loading_campaign || !player || (player.hp <= 0)) {
        return;
    }
    store_world();
    chart_flush();
    checkpoint = {
        version: 4,
        wave,
        score,
        kills,
        salvage,
        artifacts_count,
        run_time,
        upgrades: {...upgrades},
        supplies: {...supplies},
        difficulty,
        hp: player.hp,
        energy: player.energy,
        position: checkpoint_position(),
        physics: {
            heat: player.heat || 0,
            overheated: !!player.overheated,
            time: environment_time,
            dose: player.radiation_dose || 0,
            turbo_cd: player.dash_cd || 0,
            turbo_fuel: turbo_fuel(),
            turbo_remaining: player.dash_time || 0,
            turbo_heading: player.turbo_heading || 0,
        },
        campaign: JSON.parse(JSON.stringify(campaign)),
        // the guide's marker on a place (a goal's mining field, a map click) and your own route
        guide: guide_manual ? {x: guide_manual.x, y: guide_manual.y, label: guide_manual.label, portal: guide_manual.portal} : null,
        route: {points: waypoints.map(v => ({x: v.x, y: v.y, n: v.n})), loop: waypoints_loop},
    };
    // ore your drones are bringing home counts as aboard: they come back with the save, not without it
    const cargo = checkpoint.campaign.cargo;
    for (const drone of drones) {
        for (const load of drone.loads || []) {
            const key = load.resource || 'ore';
            cargo[key] = (cargo[key] || 0) + (load.amount || 1);
        }
    }
    try {
        storage_set('pulse_drift_frontier_v4', JSON.stringify(checkpoint));
        checkpoint_notice = `Progress saved · ${worlds[campaign.world].name}`;
        menu_continue_show(campaign);
    }
    catch {
        checkpoint_notice = 'Autosave unavailable. Keep this tab open.';
    }
}

// Where a continue resumes: the ship's place, unless it is in a black hole's pull; then the last safe place saved in
// this world, or beside the station
function checkpoint_position()
{
    const size = {w: world.w, h: world.h};
    if (!in_gravity_pull(player)) {
        return {x: player.x, y: player.y, size};
    }
    if (checkpoint?.position && (checkpoint.campaign?.world === campaign.world)) {
        return checkpoint.position;
    }
    return {x: station.x, y: station.y + 260, size};
}

function clear_checkpoint()
{
    checkpoint = null;
    try {
        localStorage.removeItem('pulse_drift_frontier_v4');
    }
    catch {
    }
    set_hidden(el.continue_row, true);
}

function load_checkpoint()
{
    try {
        const v = checkpoint_without_feltmere(JSON.parse(localStorage.getItem('pulse_drift_frontier_v4')));
        if (valid_checkpoint(v)) {
            checkpoint = v;
            menu_continue_show(v.campaign);
        }
    }
    catch {
    }
}
// Feltmere, a ninth world entered only in the felt rocket, was taken out of the game. A save made while it was in comes
// back to the eight worlds: a ship in Feltmere waits beside Haven's station; the felt rocket is bought back at its price
// and you fly your best other ship, or a scout; Feltmere's contracts, maps, structures and transport line go, their
// salvage paid back, and its felt berries are sold at Haven's price, as is any cargo the new hold has no room for. The
// save is changed in place, and `news` says what changed, for a toast when it is played (guide_base_reset_run). A save
// that never knew Feltmere comes back as it was.
const feltmere_gone = {world: 8, ship: 'rocket', ship_price: 400, berries: 'berries', berry_price: 15};

function checkpoint_without_feltmere(v)
{
    const c = v?.campaign;
    if (!c || (typeof c !== 'object')) {
        return v;
    }
    const gone = feltmere_gone.world;
    const news = [];
    let refund = 0;
    let moved = false;
    if (c.world === gone) {
        const extent = world_extents[0];
        c.world = 0;
        v.wave = worlds[0].wave;
        v.position = {x: extent[0]/2, y: extent[1]/2 + station_size/2 + 100, size: {w: extent[0], h: extent[1]}};
        v.guide = null;
        v.route = {points: [], loop: false};
        news.push(`BACK AT ${worlds[0].station.toUpperCase()}`);
    }
    if (Array.isArray(c.contracts)) {
        const kept = c.contracts.filter(v => (v.world !== gone) && (v.issuer !== gone) && !(v.stages || []).some(vv => vv.world === gone));
        if (kept.length < c.contracts.length) {
            news.push(`ITS ${c.contracts.length - kept.length} CONTRACT${(c.contracts.length - kept.length > 1) ? 'S' : ''} DROPPED`);
        }
        c.contracts = kept;
    }
    if (Array.isArray(c.structures)) {
        for (const s of c.structures.filter(v => v.world === gone)) {
            refund += structure_kinds[s.kind]?.cost.salvage || 0;
        }
        c.structures = c.structures.filter(v => v.world !== gone);
    }
    if (c.lines?.[gone]) {
        refund += transport_price;
        delete c.lines[gone];
    }
    for (const key of ['maps', 'charts']) {
        if (c[key]) {
            delete c[key][gone];
        }
    }
    for (const key of ['visited', 'charted_whole']) {
        if (Array.isArray(c[key])) {
            c[key] = c[key].filter(v => v !== gone);
        }
    }
    if (Array.isArray(c.reputation)) {
        c.reputation = c.reputation.slice(0, worlds.length);
    }
    if (Array.isArray(c.markets) && (c.markets.length > worlds.length)) {
        c.markets = c.markets.slice(0, worlds.length);
        for (const market of c.markets) {
            delete market.demand?.[feltmere_gone.berries];
        }
    }
    if (c.route_world === gone) {
        c.route_world = null;
    }
    if ((c.trade_plan?.source === gone) || (c.trade_plan?.destination === gone)) {
        c.trade_plan = null;
    }
    const f = c.fleet;
    if (f && Array.isArray(f.ships) && (f.ships.includes(feltmere_gone.ship) || (f.ship_id === feltmere_gone.ship))) {
        refund += f.ships.includes(feltmere_gone.ship) ? feltmere_gone.ship_price : 0;
        f.ships = f.ships.filter(v => v !== feltmere_gone.ship);
        delete f.loadouts?.[feltmere_gone.ship];
        if (f.ship_id === feltmere_gone.ship) {
            const owned = ship_catalog.filter(v => f.ships.includes(v.id));
            const best = owned.reduce((a, b) => ((b.price > a.price) ? b : a), ship_catalog.find(v => v.id === 'scout'));
            f.ship_id = best.id;
            if (!f.ships.includes(best.id)) {
                f.ships.push(best.id);
            }
            v.hp = Math.min(v.hp, best.hull);
            moved = true;
            news.push(`THE FELT ROCKET BOUGHT BACK · NOW IN YOUR ${best.name.toUpperCase()}`);
        }
        else {
            news.push('THE FELT ROCKET BOUGHT BACK');
        }
    }
    if (c.cargo && (typeof c.cargo === 'object')) {
        const berries = c.cargo[feltmere_gone.berries];
        if (Number.isInteger(berries) && (berries > 0)) {
            refund += berries*feltmere_gone.berry_price;
            news.push(`${berries} FELT BERRIES SOLD`);
        }
        delete c.cargo[feltmere_gone.berries];
        // out of the rocket, what the hold of the ship you fly now cannot carry is sold at Haven's price, the worlds'
        // own resources first
        const room = ship_catalog.find(v => v.id === f?.ship_id)?.cargo || 40;
        let over = moved ? Object.values(c.cargo).reduce((a, b) => a + (Number.isInteger(b) ? b : 0), 0) - room : 0;
        for (let i = commodities.length - 1; (i >= 0) && (over > 0); --i) {
            const amount = Math.min(over, Number.isInteger(c.cargo[commodities[i].key]) ? c.cargo[commodities[i].key] : 0);
            if (amount > 0) {
                c.cargo[commodities[i].key] -= amount;
                refund += amount*Math.max(0, commodity_base_price(0, i) - 2);
                over -= amount;
                news.push(`${amount} ${commodities[i].name.toUpperCase()} SOLD`);
            }
        }
    }
    if (!news.length && !refund) {
        return v;
    }
    if (Number.isFinite(v.salvage)) {
        v.salvage += refund;
    }
    v.news = `${news.join(' · ') || 'FELTMERE IS GONE FROM YOUR SAVE'}${refund ? ` · ◆ ${refund}` : ''}`;
    return v;
}

document.getElementById('retry_sector').addEventListener('click', function () {
    // an arcade death: the world it came in, again from its first wave, as the run stood when that world began
    if (arcade.active) {
        const from = arcade.world_start.snapshot;
        set_pause_icon(false);
        arcade_stop();
        arcade_start(from.world, from);
        return;
    }
    if (!checkpoint) {
        return;
    }
    const towed = (state === 'dead') && !arcade.active;
    // the autosave is up to 15 s old: a flagship keeps the damage dealt it since (boss_hp, src/js/navigation.js)
    if (towed) {
        for (const saved of checkpoint.campaign.contracts) {
            const live = campaign.contracts.find(v => v.id === saved.id);
            if (live && (live.boss_hp > 0) && (live.stage_index === saved.stage_index)) {
                saved.boss_hp = live.boss_hp;
            }
        }
    }
    reset_run(true);
    if (towed) {
        tow_to_station();
    }
});

// A campaign death: a tug brings the wreck to the world's station, docked and repaired. The tow takes a share of the
// salvage, and the cargo aboard is lost; contracts keep their progress. (Resuming at the last autosave could leave the
// ship with a sliver of hull or a burnt-out radiation shield amid raiders, and die again at once, over and over.)
const tow_share = 0.1;

function tow_fee(amount)
{
    return Math.round(amount*tow_share);
}

function tow_to_station()
{
    const fee = tow_fee(salvage);
    salvage -= fee;
    play_log_spend('tow', 'fee', fee);
    for (const key of Object.keys(campaign.cargo)) {
        campaign.cargo[key] = 0;
    }
    player.x = station.x;
    player.y = station.y + station_size/2 + 100;
    player.vx = player.vy = 0;
    player.radiation_dose = 0;
    update_camera(0, true);
    dock_station();
    dock_message = `Towed in for ◆ ${fee}. Hull repaired; the cargo aboard was lost with the wreck. Contracts keep their progress.`;
    render_station();
    show_toast(`TOWED TO ${worlds[campaign.world].station.toUpperCase()}`, `◆ ${fee} FOR THE TOW · THE CARGO ABOARD IS LOST · CONTRACTS KEPT`, 5);
}
