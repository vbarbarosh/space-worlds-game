// The agent's hook: bin/captain reads the game state and the news through window.captain; it acts through the page's own buttons and keys.
const captain_news = [];
const captain_base_show_toast = show_toast;
const captain_pilot = {on: true, idle: 0, keys: [], dock: false};
// The game waits for the agent on these screens; the window says so, so a pause never looks like a freeze.
const captain_waiting_states = ['upgrade', 'finale', 'arcade_break', 'arcade_depot', 'dead', 'won', 'menu'];
let captain_last_command = Date.now();
const captain_tick_ms = 250;
pause_on_blur = false;

show_toast = function (title, sub, duration, kind) {
    captain_news.push({n: captain_news.length + 1, time: Math.round(run_time), title, sub});
    if (captain_news.length > 500) {
        captain_news.shift();
    }
    captain_base_show_toast(title, sub, duration, kind);
};
window.captain = {status: captain_status, news: captain_news_since, autopilot: captain_autopilot_set, touch: captain_touch, dock: captain_dock};
setInterval(captain_pilot_tick, captain_tick_ms);

function captain_status()
{
    const out = {mode: arcade.active ? 'arcade' : 'campaign', state};
    if (!player || (state === 'menu')) {
        return out;
    }
    const fleet = ensure_career();
    const ship = current_ship();
    const context = guide_context();
    out.world = worlds[campaign.world].name;
    out.world_rules = current_world_rules().name;
    out.docked = state === 'upgrade';
    out.near_station = distance(player, station) < station_reach;
    out.salvage = salvage;
    out.score = score;
    out.hull = `${Math.ceil(player.hp)} / ${hull_max()}`;
    out.shield = `${Math.ceil(player.shield)} / ${shield_max()}`;
    out.energy = Math.round(player.energy);
    out.heat = Math.round(player.heat || 0);
    out.radiation_dose = Math.round(player.radiation_dose || 0);
    out.ship = ship.name;
    out.ships_owned = fleet.ships;
    out.weapon = `${current_weapon().name} T${weapon_level()}`;
    out.rank = rank_names[pilot_rank()];
    out.xp = campaign.xp;
    out.reputation = campaign.reputation[campaign.world] || 0;
    out.cargo = {...campaign.cargo, capacity: cargo_capacity()};
    out.supplies = {...supplies};
    out.contracts = [];
    for (const contract of campaign.contracts) {
        out.contracts.push({
            id: contract.id,
            title: contract.title,
            type: contract.type,
            world: worlds[contract.world].name,
            stage: contract.stages ? contract.stages[contract.stage_index].title : null,
            progress: `${Math.floor(contract.progress)} / ${contract.target}`,
            ready: !!contract.ready,
            reward: contract.reward,
        });
    }
    out.objective = context.goal ? {title: context.title, kind: context.kind, distance: Math.round(distance(player, context.goal))} : null;
    out.autopilot = captain_pilot.on ? (guide_flying ? 'flying' : 'on') : 'off';
    if (arcade.active) {
        // the step of the run (the worlds come in the order chosen at each break), the route flown, and the cards in
        // force (src/js/arcade_route.js, src/js/arcade_cards.js)
        out.arcade = {world: `${arcade_level() + 1} / ${arcade_worlds}`, wave: `${arcade.wave} / ${arcade_waves}`, route: arcade.route.map(v => worlds[v].name), cards: arcade_cards_chips().map(v => v.text)};
        // the flagship's duel: how it is won now (src/js/boss_duels.js)
        const duel = boss_duel_card();
        if (duel) {
            out.arcade.flagship = {title: duel.title, how: duel.line, state: duel.eta, distance: Math.round(distance(player, duel.target))};
        }
    }
    out.enemies_near = enemies.filter(v => (v.hp > 0) && (distance(v, player) < 900)).length;
    out.run_time = format_time(run_time);
    return out;
}

function captain_news_since(n)
{
    return captain_news.filter(v => v.n > n);
}

// In the arcade: fly to the station and open the depot as soon as no raider is close; not on a Scroll lane, where the
// depot opens between worlds only (src/js/arcade_scroll.js)
function captain_dock()
{
    captain_pilot.dock = arcade.active && !arcade_scroll_on();
    return captain_pilot.dock;
}

function captain_touch()
{
    captain_last_command = Date.now();
}

function captain_thinking_refresh()
{
    const banner = document.getElementById('agent_thinking');
    const seconds = Math.floor((Date.now() - captain_last_command)/1000);
    const waiting = captain_waiting_states.includes(state) && (seconds >= 2);
    set_hidden(banner, !waiting);
    if (waiting) {
        banner.textContent = `THE AGENT IS THINKING · ${seconds} s`;
    }
}

function captain_autopilot_set(on)
{
    captain_pilot.on = on;
    captain_pilot_keys_set([]);
    if (!on) {
        guide_flying = false;
    }
    return on;
}

// Standing orders while the agent thinks: in the campaign the guided flight goes on from stage to stage, home to
// dock and through the gates; in the arcade the pilot keeps the ship alive. Decisions stay with the agent.
function captain_pilot_tick()
{
    captain_thinking_refresh();
    if (!captain_pilot.on || !player || (state !== 'playing') || jump) {
        captain_pilot_keys_set([]);
        return;
    }
    if (arcade.active && captain_pilot.dock) {
        captain_arcade_dock();
        return;
    }
    if (arcade.active) {
        captain_arcade_pilot();
        return;
    }
    if (guide_flying) {
        captain_pilot.idle = 0;
        captain_pilot_keys_set([]);
        return;
    }
    // a ring race is flown by hand, not by the guide: the pilot steers for the next ring (js/race.js)
    if (race_running()) {
        captain_race_pilot();
        return;
    }
    // Between moves the ship keeps station: B brakes and holds it against currents, drift and planetary pull.
    captain_pilot_keys_set(['KeyB']);
    captain_pilot.idle += captain_tick_ms;
    if ((captain_pilot.idle < 1500) || !guide_context().goal) {
        return;
    }
    captain_pilot.idle = 0;
    guide_action();
}

// Keep raiders at gun range (the guns aim on their own), sidestep their fire, collect pickups when the sky is clear,
// keep off gravity wells; repair, EMP and pulse when survival needs them, since the agent thinks too slowly for that.
function captain_arcade_pilot()
{
    let x = 0;
    let y = 0;
    let nearest = null;
    let crowd = 0;
    for (const enemy of enemies) {
        // an anchored raider (a flagship's nest) is the duel's (boss_duel_pilot), not one to keep at gun range
        if ((enemy.hp <= 0) || enemy.anchor) {
            continue;
        }
        const d = Math.max(1, distance(enemy, player));
        if (!nearest || (d < distance(nearest, player))) {
            nearest = enemy;
        }
        if (d < 520) {
            x += ((player.x - enemy.x)/d)*(520 - d)/520;
            y += ((player.y - enemy.y)/d)*(520 - d)/520;
        }
        if (d < 300) {
            crowd++;
        }
    }
    if (nearest) {
        const d = Math.max(1, distance(nearest, player));
        const far = (nearest.type === 'boss') ? 880 : 650;
        const close = (nearest.type === 'boss') ? 620 : 420;
        const band = (d < close) ? -1 : (d > far) ? 1 : 0;
        const side = (Math.floor(time/3) % 2) ? 1 : -1;
        x += ((nearest.x - player.x)/d)*band - ((nearest.y - player.y)/d)*side*0.7;
        y += ((nearest.y - player.y)/d)*band + ((nearest.x - player.x)/d)*side*0.7;
    }
    else {
        // on a Scroll lane (src/js/arcade_scroll.js) only what is in the view is in reach, and the place to wait is the
        // view's back half, not the station
        const lane = arcade_scroll_on();
        const pickup = pickups.filter(v => (v.life > 0) && !(lane && arcade_scroll_unseen(v))).sort((a, b) => distance(a, player) - distance(b, player))[0];
        const view = lane ? arcade_scroll_view() : null;
        const target = pickup || (lane ? {x: view.x - arcade_scroll.way.x*view.h*0.4, y: view.y - arcade_scroll.way.y*view.h*0.4} : station);
        x += (target.x - player.x)/Math.max(1, distance(target, player));
        y += (target.y - player.y)/Math.max(1, distance(target, player));
    }
    // a flagship's duel (src/js/boss_duels.js): with no raider within 500 m, or a plan to keep to (firm), thrust toward
    // the velocity it asks for, coast once there, and fire the pulse where it says
    const plan = boss_duel_pilot();
    if (plan && ((!nearest || (distance(nearest, player) > 500)) || plan.firm)) {
        x = plan.vx - player.vx;
        y = plan.vy - player.vy;
        const error = Math.hypot(x, y);
        x = (error < 30) ? 0 : x/error;
        y = (error < 30) ? 0 : y/error;
        if (plan.pulse && (player.energy >= 100)) {
            pulse();
        }
    }
    let incoming = 0;
    for (const shot of hostile) {
        const d = distance(shot, player);
        const closing = ((player.x - shot.x)*shot.vx + (player.y - shot.y)*shot.vy) > 0;
        if ((d < 320) && closing) {
            incoming++;
            const speed = Math.max(1, Math.hypot(shot.vx, shot.vy));
            x += (-shot.vy/speed)*1.5;
            y += (shot.vx/speed)*1.5;
        }
    }
    // a plan that keeps to the rim (the Eclipse Eye's edge) leans out against the pull itself
    for (const hole of (plan && plan.firm) ? [] : black_holes) {
        const d = Math.max(1, distance(hole, player));
        if (d < gravity_reach(hole)*0.9) {
            x += ((player.x - hole.x)/d)*3;
            y += ((player.y - hole.y)/d)*3;
        }
    }
    const hurt = player.hp < hull_max()*0.5;
    const repair = hurt ? pickups.find(v => (v.life > 0) && (v.type === 'health') && (distance(v, player) < 900)) : null;
    if (repair) {
        x += ((repair.x - player.x)/Math.max(1, distance(repair, player)))*2;
        y += ((repair.y - player.y)/Math.max(1, distance(repair, player)))*2;
    }
    // off the world's edges; on a Scroll lane, off the view's
    const lane_edges = arcade_scroll_on();
    const margin = lane_edges ? 160 : 400;
    const box = lane_edges ? {x: camera.x, y: camera.y, w: W/zoom, h: H/zoom} : {x: 0, y: 0, w: world.w, h: world.h};
    x += (player.x < box.x + margin) ? 1 : (player.x > box.x + box.w - margin) ? -1 : 0;
    y += (player.y < box.y + margin) ? 1 : (player.y > box.y + box.h - margin) ? -1 : 0;
    if ((player.hp < hull_max()*0.45) && supplies.medkit) {
        use_supply('medkit');
    }
    if ((incoming >= 4) && supplies.emp) {
        use_supply('emp');
    }
    if (hurt && supplies.stasis && (stasis_time <= 0) && enemies.some(v => (v.type === 'boss') && (v.hp > 0))) {
        use_supply('stasis');
    }
    if ((player.energy >= 100) && (crowd >= 3)) {
        pulse();
    }
    const length = Math.hypot(x, y) || 1;
    const held = [];
    if (x/length > 0.38) {
        held.push('KeyD');
    }
    if (x/length < -0.38) {
        held.push('KeyA');
    }
    if (y/length > 0.38) {
        held.push('KeyS');
    }
    if (y/length < -0.38) {
        held.push('KeyW');
    }
    if ((player.hp < hull_max()*0.3) && nearest && (distance(nearest, player) < 420)) {
        held.push('ShiftLeft');
    }
    captain_pilot_keys_set(held);
}

function captain_arcade_dock()
{
    const d = distance(player, station);
    if (d < station_reach - 30) {
        captain_pilot_keys_set(['KeyB']);
        if (!depot_shield_up()) {
            captain_pilot.dock = false;
            captain_pilot_keys_set([]);
            arcade_interact();
        }
        return;
    }
    const x = (station.x - player.x)/d;
    const y = (station.y - player.y)/d;
    const held = [];
    if (x > 0.38) {
        held.push('KeyD');
    }
    if (x < -0.38) {
        held.push('KeyA');
    }
    if (y > 0.38) {
        held.push('KeyS');
    }
    if (y < -0.38) {
        held.push('KeyW');
    }
    captain_pilot_keys_set(held);
}

// The pilot holds keys like a player would; it lets go of the ones it no longer needs.
// In a ring race: still on the line during the count, then the keys toward the next ring's middle
function captain_race_pilot()
{
    const you = race_you();
    if ((race.phase !== 'racing') || !you || (you.next >= race.course.rings.length)) {
        captain_pilot_keys_set([]);
        return;
    }
    const ring = race.course.rings[you.next];
    const a = Math.atan2(ring.y - player.y, ring.x - player.x);
    const held = [];
    if (Math.cos(a) > 0.38) {
        held.push('KeyD');
    }
    if (Math.cos(a) < -0.38) {
        held.push('KeyA');
    }
    if (Math.sin(a) > 0.38) {
        held.push('KeyS');
    }
    if (Math.sin(a) < -0.38) {
        held.push('KeyW');
    }
    captain_pilot_keys_set(held);
}

function captain_pilot_keys_set(held)
{
    for (const code of captain_pilot.keys) {
        if (!held.includes(code)) {
            keys.delete(code);
        }
    }
    for (const code of held) {
        keys.add(code);
    }
    captain_pilot.keys = held;
}
