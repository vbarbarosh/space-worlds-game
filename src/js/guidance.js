function refresh_guidance()
{
    if (!player) {
        return;
    }
    const c = guide_context();
    if (!c.goal) {
        if (!guide_manual && !Number.isInteger(campaign.route_world) && !focused_contract()) {
            waypoint = null;
        }
        guide_path = [];
        return c;
    }
    const key = `${campaign.world}:${c.kind}:${Math.round(c.goal.x/50)}:${Math.round(c.goal.y/50)}`;
    if ((key !== guide_path_key) || !guide_path_origin || (distance(player, guide_path_origin) > 160)) {
        guide_path = portal_flight_path(player, c.goal);
        guide_path_key = key;
        guide_path_origin = {x: player.x, y: player.y};
    }
    while ((guide_path.length > 1) && (guide_path[0].portal === undefined) && (distance(player, guide_path[0]) < 90)) {
        guide_path.shift();
    }
    const next = guide_path[0] || c.goal;
    waypoint = {
        x: next.x,
        y: next.y,
        label:
            (next.portal !== undefined)
                ? `LOCAL PORTAL ${portals[next.portal].label} → ${portals[portals[next.portal].destination].label}`
                : (guide_path.length > 1)
                    ? 'SAFE ROUTE / NEXT MARKER'
                    : c.goal.label,
        follow: (guide_path.length > 1) ? null : c.goal.follow,
    };
    if (guide_flying && (state === 'playing')) {
        const arrival =
            (c.goal.portal !== undefined)
                ? 25
                : (c.kind === 'jump')
                    ? 130
                    : ['claim', 'courier', 'trade', 'prepare', 'station'].includes(c.kind)
                        ? 190
                        : (c.kind === 'mining')
                            ? 100
                            : (c.kind === 'escort')
                                ? 100
                                : 65;
        if ((guide_path.length === 1) && (distance(player, c.goal) < arrival)) {
            if (c.kind !== 'mining') {
                guide_flying = false;
            }
            else if (!drones_out && drones_owned()) {
                drones_toggle();
            }
            mouse_drive.active = false;
            player.vx = player.vy = 0;
        }
        else {
            mouse_drive.following = false;
            mouse_drive.active = true;
            mouse_drive.x = next.x;
            mouse_drive.y = next.y;
        }
    }
    return c;
}

function track_contract(m)
{
    focus_contract(m);
}

function track_world(id)
{
    campaign.trade_plan = null;
    campaign.route_world = id;
    campaign.tracked_id = null;
    guide_manual = null;
    guide_flying = false;
    guide_path_key = '';
    refresh_guidance();
    save_checkpoint();
}

function track_local_point(v, label)
{
    campaign.trade_plan = null;
    campaign.route_world = null;
    campaign.tracked_id = null;
    guide_manual = {x: v.x, y: v.y, label, portal: v.portal};
    guide_flying = false;
    guide_path_key = '';
    refresh_guidance();
}

function guide_action()
{
    const c = guide_context();
    if (!player || !['playing', 'upgrade', 'navigation', 'paused'].includes(state)) {
        return;
    }
    if (!c.goal) {
        open_map();
        return;
    }
    if (state === 'navigation') {
        toggle_navigation();
    }
    if (state === 'paused') {
        toggle_pause();
    }
    if ((c.kind === 'prepare') && (state === 'upgrade')) {
        station_tab = 'outfit';
        render_station();
        el.shop_grid.querySelector(`[data-key="${c.purchases[0]?.key}"]`)?.scrollIntoView({block: 'center', behavior: 'smooth'});
        return;
    }
    if ((c.kind === 'claim') && (state === 'upgrade')) {
        claim_contract(c.mission.id);
        return;
    }
    if ((c.kind === 'trade') && (state === 'upgrade')) {
        station_tab = 'market';
        render_station();
        return;
    }
    if (state === 'upgrade') {
        undock();
    }
    if ((distance(player, c.goal) < ((c.kind === 'jump') ? 155 : 230)) && ['jump', 'claim', 'courier', 'trade', 'prepare', 'station'].includes(c.kind)) {
        interact();
        return;
    }
    waypoints_clear();
    guide_flying = true;
    guide_path_key = '';
    refresh_guidance();
    canvas.focus();
    update_hud();
}

function open_map()
{
    nav_tab = 'worlds';
    if (state !== 'navigation') {
        toggle_navigation();
    }
    else {
        render_navigation();
    }
    const body = document.getElementById('navigation_overlay').querySelector('.navigation-body');
    if (body) {
        body.scrollTop = 0;
    }
}

function open_mission_plan()
{
    nav_tab = 'jobs';
    if (state !== 'navigation') {
        toggle_navigation();
    }
    else {
        render_navigation();
    }
}

function stop_guided_flight(event)
{
    if (guide_flying && event?.code) {
        mouse_drive.active = false;
    }
    guide_flying = false;
}

function accept_contract(template, main = false)
{
    const before = campaign.serial;
    guide_base_accept_contract(template, main);
    if (campaign.serial > before) {
        refresh_mining_resources(true);
        const m = campaign.contracts[campaign.contracts.length - 1];
        focus_contract(m);
        render_station();
        show_toast(
            'MISSION ACCEPTED',
            (m.type === 'courier') ? 'SEALED PACKAGE ABOARD / OPEN MISSION PLAN FOR YOUR ROUTE' : 'YOUR NEXT STEP IS MARKED IN GOLD / OPEN MISSION PLAN',
            4
        );
    }
}

function claim_contract(id)
{
    guide_flying = false;
    guide_base_claim_contract(id);
    if (!campaign.contracts.some(v => v.id === campaign.tracked_id)) {
        campaign.tracked_id = null;
    }
    guide_manual = null;
    guide_path_key = '';
    refresh_guidance();
    save_checkpoint();
}

function physics_base_reset_run(resume = false)
{
    guide_flying = false;
    guide_manual = null;
    guide_path_key = '';
    guide_path = [];
    guide_base_reset_run(resume);
    refresh_guidance();
    update_hud();
    if (state === 'upgrade') {
        render_station();
    }
}

function expedition_base_update_frontier(dt)
{
    guide_base_update_frontier(dt);
    refresh_guidance();
}

function update_jump(dt)
{
    guide_base_update_jump(dt);
    if (state === 'playing') {
        guide_path_key = '';
        refresh_guidance();
    }
}

function guide_action_label(c)
{
    if ((state === 'playing') && c.goal && (distance(player, c.goal) < ((c.kind === 'jump') ? 155 : 230))) {
        if (c.kind === 'jump') {
            return `R / JUMP TO ${worlds[c.route[1]].name.toUpperCase()}`;
        }
        if (['claim', 'courier', 'trade', 'prepare', 'station'].includes(c.kind)) {
            return 'R / DOCK NOW';
        }
    }
    if (guide_flying) {
        return 'FLYING · CLICK / WASD TO STEER';
    }
    return c.action;
}

function visual_base_update_hud()
{
    guide_base_update_hud();
    if (!player) {
        return;
    }
    const c = refresh_guidance();
    const m = c.mission;
    document.getElementById('nav_button').disabled = !['playing', 'paused', 'upgrade', 'navigation'].includes(state);
    el.mission_name.textContent = c.title;
    document.getElementById('mission_instruction').textContent = c.instruction;
    document.getElementById('mission_route').textContent =
        (c.route.length > 1)
            ? `ROUTE ${c.route.map(v => worlds[v].name).join(' → ')}`
            : c.goal
                ? `${c.goal.label} · ${Math.round(distance(player, c.goal))} m`
                : '';
    const b = document.getElementById('guide_action');
    b.textContent = guide_action_label(c);
    b.disabled = !['playing', 'upgrade'].includes(state);
    document.getElementById('guide_plan').disabled = !['playing', 'paused', 'upgrade', 'navigation'].includes(state);
    if ((m?.type === 'courier') && !m.ready) {
        el.mission_phase.textContent = `CORE ABOARD · DELIVERY ${format_progress(m.progress)}/${m.target}`;
    }
}

function render_guide_plan(parent, c)
{
    parent.replaceChildren();
    const heading = document.createElement('b');
    heading.textContent = c.title;
    parent.append(heading);
    const next = document.createElement('p');
    next.className = 'next-instruction';
    next.textContent = `NEXT: ${c.instruction}`;
    parent.append(next);
    const route = document.createElement('div');
    route.className = 'route-chips';
    for (let i = 0, end = c.route.length; i < end; ++i) {
        const id = c.route[i];
        const chip = document.createElement('span');
        chip.className = `${(i === 0) ? 'current ' : ''}${(id === c.target) ? 'destination ' : ''}${!allowed_world(id) ? 'locked' : ''}`;
        chip.textContent = `${(i === 0) ? 'YOU: ' : ''}${worlds[id].name}`;
        route.append(chip);
    }
    parent.append(route);
    if (c.plan.length) {
        const list = document.createElement('ol');
        list.className = 'mission-checklist';
        for (const v of c.plan) {
            const item = document.createElement('li');
            item.className = v.done ? 'done' : '';
            const title = document.createElement('b');
            title.textContent = `${v.done ? '✓ ' : ''}${v.title}`;
            item.append(title);
            const text = document.createElement('span');
            text.textContent = v.text;
            item.append(text);
            list.append(item);
        }
        parent.append(list);
    }
    if ((c.kind === 'prepare') && (state === 'upgrade')) {
        parent.append(guide_purchase_buttons(c.purchases));
    }
    const action = document.createElement('button');
    action.className = 'primary';
    action.textContent = guide_action_label(c);
    action.addEventListener('click', guide_action);
    parent.append(action);
}

// What the next world needs, as buttons that buy it here: the next level of each module is for sale now, later
// levels wait for it, and one you cannot afford says how much is missing
function guide_purchase_buttons(purchases)
{
    const out = document.createElement('div');
    out.className = 'guide-purchases';
    for (const p of purchases) {
        const option = upgrade_options.find(v => v.key === p.key);
        const next = p.level === upgrades[p.key] + 1;
        const b = document.createElement('button');
        b.textContent = !next
            ? `${p.title.toUpperCase()} LV ${p.level} · AFTER LV ${p.level - 1}`
            : (salvage < p.price)
                ? `${p.title.toUpperCase()} LV ${p.level} · NEED ◆ ${p.price}, YOU HAVE ◆ ${salvage}`
                : `BUY ${p.title.toUpperCase()} LV ${p.level} · ◆ ${p.price}`;
        b.disabled = !next || (salvage < p.price);
        b.addEventListener('click', on_buy);
        out.append(b);
        function on_buy() {
            if (shop_buy(option)) {
                render_station();
            }
        }
    }
    return out;
}

function expedition_base_render_contracts(parent, board = false)
{
    guide_base_render_contracts(parent, board);
    for (let i = 0, end = campaign.contracts.length; i < end; ++i) {
        const contract = campaign.contracts[i];
        const c = parent.children[i];
        if (!c) {
            continue;
        }
        const note = document.createElement('p');
        note.className = 'contract-guidance';
        note.textContent =
            (contract.type === 'courier')
                ? contract.ready
                    ? 'DELIVERED · Collect your reward.'
                    : `PACKAGE ABOARD · Dock at ${worlds[contract.world].station} in ${worlds[contract.world].name} to deliver automatically.`
                : 'Open MISSION PLAN for controls, the next step and a marked route.';
        c.append(note);
        const b = document.createElement('button');
        b.textContent = (campaign.tracked_id === contract.id) ? 'OPEN ACTIVE MISSION PLAN' : 'GUIDE THIS MISSION';
        b.addEventListener('click', function () {
            focus_contract(contract);
            open_mission_plan();
        });
        c.append(b);
    }
}

function render_shop()
{
    guide_base_render_shop();
    if (document.getElementById('station_briefing') && player) {
        render_next_strip(document.getElementById('station_briefing'), guide_context());
    }
}

function expedition_base_render_station()
{
    guide_base_render_station();
    render_next_strip(document.getElementById('station_briefing'), guide_context());
}

// The station's NEXT strip: the guide's next step in one line, with its button ([T]); a goal you follow leads it
function render_next_strip(parent, c)
{
    const g = goal_state();
    const step = (g && (g.index >= 0)) ? g.steps[g.index] : null;
    const lead = step ? `${g.kind.title} ${g.index + 1}/${g.steps.length}` : c.title;
    const text = step ? step.title : c.instruction;
    parent.innerHTML = `<span class="eyebrow eyebrow--gold">Next</span><p class="next-text"><b>${lead}</b> · ${text}</p>`;
    if (c.goal || step) {
        const label = guide_action_label(c).toLowerCase().replace(/^\w/, v => v.toUpperCase());
        parent.append(ui_button({label, key: 'T', size: 'sm', on: guide_action}));
    }
}

function toggle_navigation()
{
    if (state === 'navigation') {
        state = nav_return;
        set_hidden(document.getElementById('navigation_overlay'), true);
        if (state === 'paused') {
            set_hidden(el.pause_overlay, false);
        }
        if (state === 'upgrade') {
            set_hidden(el.upgrade_overlay, false);
        }
        canvas.focus();
        return;
    }
    if (!['playing', 'paused', 'upgrade'].includes(state)) {
        return;
    }
    nav_return = state;
    set_hidden(el.pause_overlay, true);
    set_hidden(el.upgrade_overlay, true);
    state = 'navigation';
    stop_turbo();
    touch_boost_hold = false;
    keys.clear();
    mouse_drive.active = false;
    mouse_drive.following = false;
    joystick.active = false;
    guide_flying = false;
    render_navigation();
    set_hidden(document.getElementById('navigation_overlay'), false);
}

function physics_base_render_navigation()
{
    const c = guide_context();
    guide_base_render_navigation();
    render_guide_plan(document.getElementById('route_briefing'), c);
    set_hidden(document.getElementById('route_briefing'), nav_tab === 'local');
    document.querySelector('.navigation-panel h2').textContent = (nav_tab === 'local') ? `${worlds[campaign.world].name} / world map` : 'Chart your own course.';
    const chart = document.getElementById('navigation_chart');
    chart.replaceChildren();
    chart.classList.remove('hidden');
    if (nav_tab === 'worlds') {
        render_galaxy_chart(chart, c);
        return;
    }
    if (nav_tab === 'local') {
        render_local_chart(chart);
        return;
    }
    if (nav_tab === 'help') {
        chart.classList.add('hidden');
        const parent = document.getElementById('nav_content');
        parent.replaceChildren();
        for (const v of [
            [
                'Your first flight',
                'Accept a contract at the station. Its next step appears at the upper left. Open MISSION PLAN to see the whole journey. Press UNDOCK, then FLY TO NEXT MARKER or steer with WASD.',
            ],
            [
                'Delivering the navigation core',
                'Accepting the courier contract loads the sealed core automatically. Follow the world route, jump to the destination, and dock at the named station with R. Delivery completes on docking; collect your reward under CONTRACTS.',
            ],
            [
                'World gates and local portals',
                'WORLD GATE → world name: approach and press R to change worlds. Local gates A–H: fly into the ring to teleport across the current map. Local portals cannot take you to Dustfall.',
            ],
            [
                'Reading the maps',
                'Gold is your route and current objective. Cyan is your ship and friendly station. Large dashed pink circles mark the early gravity field. Drift starts far from the core and grows gradually. The arrow beside your shuttle points toward the pull. Steer the other way or ignite turbo early; black centers are fatal. Brown fields contain ore. The galaxy map shows which worlds connect and where upgrades are required.',
            ],
            [
                'Shuttle preparation',
                'A locked route shows a shopping list in MISSION PLAN. Dock, open OUTFITTER and install those modules. Weapon and defense ratings update immediately. Use local contracts or sell mined ore if you need salvage.',
            ],
            [
                'Moving and stopping',
                'WASD selects a flight direction; the hull turns and its engines accelerate along that heading. Release movement to slow down. Hold B or use B BRAKE for a quick stop. Dustfall and Cryosphere keep coasting after movement is released. Single click sets a destination. Double click starts or stops mouse follow. WASD and arrows steer. FLY TO NEXT MARKER follows the plotted path around gravity wells; click or use WASD to take control. It stops before a world gate or dock so you can press R.',
            ],
            [
                'Mining and combat',
                'Cannons fire automatically at nearby enemies; rocks are for your drones. Near a mining field press H and guard them while they cut. Rich rocks glow in their world\'s color and pay more the farther you carry them. Hunt missions require kills in the named world. Q repairs, E releases an EMP, F slows enemies, Hold Shift for turbo thrust, and Space releases a charged pulse.',
            ],
            [
                'Completing operations',
                'Follow the current stage in MISSION PLAN. Scans require a timed hold within 150 m; recoveries require clearing an ambush before extracting its item; relay defenses require staying within 450 m through several waves. Convoys have three legs and field repairs. Dock and COLLECT REWARD for credits and XP.',
            ],
            [
                'Cockpit flight',
                'Press V to cycle Wireframe, Rendered and Cockpit. In Cockpit, hold W / S for forward / reverse thrust and A / D to turn; arrows and the touch stick work too. Click a visible station, gate or marker to fly toward it, or click in the window for a flight direction. B brakes. Automatic weapons and guided routes still work. The local radar rotates with your heading and shows nearby contacts, including ships behind you.',
            ],
            [
                'Zoom and sound',
                'Use the + / − buttons, mouse wheel or + / − keys to zoom from 50% to 200%; press 0 or click the percentage to reset. Zoom changes the flight view while the HUD stays readable. SOUND ⚙ opens master, music, effects and flight ambience controls. M mutes all sound. Your view and sound settings are remembered.',
            ],
            [
                'Building your fleet',
                'Dock and choose HANGAR to buy or switch ship classes. All modules transfer. ARSENAL sells six weapon types, each upgradable to tier 5. Ion breaks shields, rail bypasses armor, seekers explode, and flux beams consume pulse. CAREER shows rank, unlocks, reputation and expedition progress.',
            ],
        ]) {
            card(parent, v[0], v[1], 'J / MAP & GUIDE · R / DOCK OR JUMP');
        }
        return;
    }
    chart.classList.add('hidden');
}
