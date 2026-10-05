// Goals: on the station's GOALS tab you pick what you want from the game, and the goal lays out the way there as a
// list of steps. The current step points the guide at its target (a world to reach, or a place to fly to), so FOLLOW
// GOAL in flight takes you there; a step with something to buy has its BUY button on the goal card. Steps tick
// themselves as they are done, and the last one pays the goal's bonus. campaign.goal keeps the goal and its step.
const goal_kinds = {
    explorer: {
        title: 'Explorer',
        pitch: 'See all eight worlds as fast as you can. The plan takes the nearest world you have not seen; at each gate the guide lists the modules it needs, with BUY buttons at the station.',
        reward: 1500,
        steps: explorer_steps,
    },
    prospector: {
        title: 'Prospector',
        pitch: 'Get rich from the rocks: a builder drone, mining outposts whose drones mine for you, a transport line that sells their ore, and better drones.',
        reward: 1200,
        steps: prospector_steps,
    },
};
const prospector_target = 2000;

// The worlds in the order to see them: those seen already, then each time the nearest one not seen yet
function explorer_steps()
{
    const out = campaign.visited.map(v => ({title: `Reach ${worlds[v].name}`, text: 'Visited.', done: true}));
    const left = worlds.map((v, i) => i).filter(v => !campaign.visited.includes(v));
    let from = campaign.world;
    while (left.length) {
        left.sort((a, b) => (route_from_world_to_world(from, a).length - route_from_world_to_world(from, b).length) || (a - b));
        const id = left.shift();
        const text = allowed_world(id)
            ? `Your ship is ready for ${worlds[id].name}. Follow the guide through the gates.`
            : `${requirements(id)}. Dock, and the guide lists the modules to buy, each with its BUY button.`;
        out.push({title: `Reach ${worlds[id].name}`, text, done: false, target: {world: id}});
        from = id;
    }
    return out;
}

function prospector_steps()
{
    const outposts = (campaign.structures || []).filter(v => (v.kind === 'outpost') && (v.built >= 1));
    const earned = Object.values(campaign.lines || {}).reduce((n, v) => n + (v.earned || 0), 0);
    const at_station = {point: station, label: worlds[campaign.world].station};
    const field = goal_free_field();
    const next_tier = drone_tiers[1];
    return [
        {
            title: 'Buy a builder drone',
            text: `At a station: MODULES → Builder drone, ◆ ${builder_price}. It builds what you place with K.`,
            done: !!campaign.builder,
            target: at_station,
            buy: {label: `BUY BUILDER DRONE · ◆ ${builder_price}`, price: builder_price, run: buy_builder},
        },
        {
            title: 'Build a mining outpost',
            text: `Fly to a mining field with rocks, press K and place an outpost on it (◆ ${structure_kinds.outpost.cost.salvage} and ${structure_kinds.outpost.cost.ore} ore). Its two drones mine the field.`,
            done: outposts.length >= 1,
            target: field,
            build: true,
        },
        {
            title: 'Open a transport line',
            text: `At the station of the world with your outpost: MODULES → Transport line, ◆ ${transport_price}. It collects the outposts' ore and sells it.`,
            done: Object.keys(campaign.lines || {}).length > 0,
            target: at_station,
            buy: {label: `BUY TRANSPORT LINE · ◆ ${transport_price}`, price: transport_price, run: buy_transport_line},
        },
        {
            title: `Upgrade the drones to ${next_tier.name} ${next_tier.mark}`,
            text: `At a station: MODULES → ${next_tier.name} drones, ◆ ${next_tier.price}. Your own drones fly faster and carry ${next_tier.carry} units a trip.`,
            done: (campaign.drone_tier || 0) >= 1,
            target: at_station,
            buy: {label: `UPGRADE DRONES · ◆ ${next_tier.price}`, price: next_tier.price, run: buy_drone_tier},
        },
        {
            title: 'Build a second outpost',
            text: 'Another field, another outpost: the transport visits each one with a load on its loop.',
            done: outposts.length >= 2,
            target: field,
            build: true,
        },
        {
            title: `Earn ◆ ${prospector_target} from your transports`,
            text: 'Keep the outposts mining and the transport flying, and defend it from raids. A defense platform beside an outpost helps.',
            done: earned >= prospector_target,
            progress: [Math.min(earned, prospector_target), prospector_target],
        },
    ];
}

// The mining field nearest you with rocks left and no outpost on it yet, as a guide target
function goal_free_field()
{
    const taken = structures_here().filter(v => v.kind === 'outpost');
    const free = mining_fields.filter(v => ore_nodes.some(vv => (vv.hp > 0) && (vv.field === v.id)) && !taken.some(vv => distance(vv, v) < v.r));
    const field = free.sort((a, b) => distance(a, player || station) - distance(b, player || station))[0];
    return field ? {point: {x: field.x, y: field.y}, label: 'MINING FIELD · K BUILD AN OUTPOST'} : null;
}

// The goal you follow, its steps, and the step you are on; null without one
function goal_state()
{
    const kind = campaign.goal && goal_kinds[campaign.goal.id];
    if (!kind || arcade.active) {
        return null;
    }
    const steps = kind.steps();
    return {kind, steps, index: steps.findIndex(v => !v.done)};
}

function goal_choose(id)
{
    campaign.goal = {id, step: -1};
    goal_tick();
    render_station();
    save_checkpoint((state === 'upgrade') ? 'dock' : undefined);
}

function goal_drop()
{
    campaign.goal = null;
    sync_goal_strip(null);
    render_station();
    save_checkpoint((state === 'upgrade') ? 'dock' : undefined);
}

// Every HUD tick: a step done moves the goal on and points the guide at the next one; the last pays the bonus
function goal_tick()
{
    const g = goal_state();
    sync_goal_strip(g);
    if (!g) {
        return;
    }
    if (g.index < 0) {
        goal_reached(g.kind);
        return;
    }
    if (g.index === campaign.goal.step) {
        return;
    }
    campaign.goal.step = g.index;
    const step = g.steps[g.index];
    goal_follow(step, false);
    show_banner('goal', `Goal · ${g.kind.title}`, `Step ${g.index + 1} of ${g.steps.length}`, step.title, 3.5);
}

// The guide pointed at the step's target; fly: and the ship sent there at once, undocking if need be
function goal_follow(step, fly)
{
    if (!step.target) {
        return;
    }
    if (step.target.world !== undefined) {
        track_world(step.target.world);
    }
    else {
        track_local_point(step.target.point, step.target.label);
    }
    if (fly) {
        guide_action();
    }
}

function goal_reached(kind)
{
    salvage += kind.reward;
    campaign.goals_done = [...(campaign.goals_done || []), campaign.goal.id];
    campaign.goal = null;
    sync_goal_strip(null);
    sfx('win');
    show_toast(`GOAL REACHED · ${kind.title.toUpperCase()}`, `◆ ${kind.reward} BONUS · PICK THE NEXT ONE ON THE STATION'S GOALS TAB`, 6);
    save_checkpoint((state === 'upgrade') ? 'dock' : undefined);
}

// The HUD line under the mission card: the goal, the step, and its button
function sync_goal_strip(g)
{
    const strip = document.getElementById('goal_strip');
    set_hidden(strip, !g || (g.index < 0));
    if (!g || (g.index < 0)) {
        return;
    }
    const step = g.steps[g.index];
    const progress = step.progress ? ` · ◆ ${step.progress[0]}/${step.progress[1]}` : '';
    hud_text(document.getElementById('goal_text'), `${g.kind.title.toUpperCase()} · ${g.index + 1}/${g.steps.length} · ${step.title}${progress}`);
    const b = document.getElementById('goal_button');
    const here = step.build && step.target && player && (distance(player, step.target.point) < 450);
    hud_html(b, here ? '<span>K</span> BUILD' : 'FOLLOW GOAL');
    b.disabled = !here && !step.target;
}

function on_goal_button()
{
    const g = goal_state();
    if (!g || (g.index < 0) || (state !== 'playing')) {
        return;
    }
    const step = g.steps[g.index];
    if (step.build && step.target && (distance(player, step.target.point) < 450)) {
        build_menu_toggle();
        return;
    }
    goal_follow(step, true);
}
document.getElementById('goal_button').addEventListener('click', on_goal_button);

// The GOALS tab: the goal you follow, step by step, with the current step's buttons; or the goals to choose from
function render_goals(parent)
{
    const g = goal_state();
    if (g && (g.index >= 0)) {
        const box = card(parent, `${g.kind.title} · step ${g.index + 1} of ${g.steps.length}`, g.kind.pitch, `BONUS ◆ ${g.kind.reward} WHEN EVERY STEP IS DONE`, 'DROP THIS GOAL', goal_drop, false, 'goal-card');
        const list = document.createElement('ol');
        list.className = 'goal-steps';
        for (let i = 0; i < g.steps.length; ++i) {
            const step = g.steps[i];
            const li = document.createElement('li');
            li.className = step.done ? 'done' : (i === g.index) ? 'current' : '';
            li.innerHTML = `<b>${step.done ? '✓' : (i === g.index) ? '▶' : '·'} ${step.title}</b>`;
            if (i === g.index) {
                const p = document.createElement('p');
                p.textContent = step.text + (step.progress ? ` (◆ ${step.progress[0]} of ${step.progress[1]})` : '');
                li.append(p);
                const actions = document.createElement('div');
                actions.className = 'goal-actions';
                if (step.buy) {
                    const b = document.createElement('button');
                    b.className = 'primary';
                    b.textContent = (salvage < step.buy.price) ? `NEED ◆ ${step.buy.price - salvage} MORE` : step.buy.label;
                    b.disabled = salvage < step.buy.price;
                    b.addEventListener('click', step.buy.run);
                    actions.append(b);
                }
                // a step bought here needs no flight; the others are followed from the dock
                if (step.target && !step.buy) {
                    const b = document.createElement('button');
                    b.textContent = 'FOLLOW THIS STEP';
                    b.addEventListener('click', () => goal_follow(step, true));
                    actions.append(b);
                }
                li.append(actions);
            }
            list.append(li);
        }
        box.querySelector('button').before(list);
        return;
    }
    for (const [id, kind] of Object.entries(goal_kinds)) {
        const done = (campaign.goals_done || []).includes(id);
        card(parent, `Goal: ${kind.title}`, kind.pitch, `BONUS ◆ ${kind.reward}${done ? ' · REACHED BEFORE' : ''}`, 'FOLLOW THIS GOAL', () => goal_choose(id), false, 'goal-card');
    }
}

// The GOALS tab on the UI kit: the goal you follow with its steps on the left (the current one carries its button),
// and on the right your rank and XP, reputation in the worlds you know, and the other goals to follow
function render_station_goals(parent)
{
    parent.classList.add('goals');
    const g = goal_state();
    const left = document.createElement('div');
    left.className = 'goal-panel';
    if (g && (g.index >= 0)) {
        const icon = map_icon_html((campaign.goal.id === 'explorer') ? 'world-gate' : 'outpost', 56);
        const head = `<div class="goal-panel-head"><span class="eyebrow eyebrow--gold">Goal you follow</span><span class="money">${ui_number(g.kind.reward)} bonus</span></div>`;
        const title = `<div class="goal-panel-title">${icon}<div><h3 class="h-section">${g.kind.title}</h3><p class="small">${g.kind.pitch}</p></div></div>`;
        left.innerHTML = `${head}${title}${ui_progress_html(g.steps.length, g.index, `${g.index} / ${g.steps.length}`)}`;
        const list = document.createElement('ol');
        list.className = 'steps';
        for (let i = 0; i < g.steps.length; ++i) {
            const step = g.steps[i];
            const li = document.createElement('li');
            li.className = step.done ? 'is-done' : (i === g.index) ? 'is-current' : 'is-next';
            const check = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5 6.5 11.5 12.5 4.5"/></svg>';
            const detail = (i === g.index) ? `<small>${step.text}${step.progress ? ` · ${ui_number(step.progress[0])} / ${ui_number(step.progress[1])}` : ''}</small>` : step.progress ? `<small>${ui_number(step.progress[0])} / ${ui_number(step.progress[1])}</small>` : '';
            li.innerHTML = `<span class="n">${step.done ? check : i + 1}</span><span class="t">${step.title}${detail}</span>`;
            if (step.done) {
                li.insertAdjacentHTML('beforeend', '<span class="small">done</span>');
            }
            else if ((i === g.index) && step.buy) {
                li.append(ui_button({label: step.buy.label.replace(/ · ◆ .*/, '').toLowerCase().replace(/^\w/, v => v.toUpperCase()), price: step.buy.price, kind: 'primary', size: 'sm', disabled: salvage < step.buy.price, on: step.buy.run}));
            }
            else if ((i === g.index) && step.target) {
                li.append(ui_button({label: 'Fly to marker', key: 'T', kind: 'primary', size: 'sm', on: () => goal_follow(step, true)}));
            }
            else {
                li.insertAdjacentHTML('beforeend', '<span></span>');
            }
            list.append(li);
        }
        left.append(list);
        left.append(ui_button({label: 'Drop this goal', kind: 'ghost', size: 'sm', on: goal_drop}));
    }
    else {
        left.innerHTML = '<span class="eyebrow eyebrow--gold">Choose a goal</span><p class="small">Pick what you want from the game, and the goal lays out the way there, step by step.</p>';
    }
    const right = document.createElement('div');
    right.className = 'goal-side';
    const rank = pilot_rank();
    const next = rank_thresholds[rank + 1];
    const from = rank_thresholds[rank];
    const career = document.createElement('div');
    career.className = 'goal-panel';
    const career_head = `<div class="career-head"><div><h3 class="h-section">${rank_names[rank]}</h3>${next ? `<p class="small">next: ${rank_names[rank + 1]}</p>` : ''}</div><span class="readout">${ui_number(campaign.xp)}${next ? `<small> / ${ui_number(next)} XP</small>` : ''}</span></div>`;
    const career_bar = next ? ui_progress_html(10, Math.floor(((campaign.xp - from)/(next - from))*10), '') : '';
    const career_text = (rank < 5) ? `Earn ${ui_number(Math.max(0, rank_thresholds[5] - campaign.xp))} XP to license the Aurora Cruiser. The hangar and arsenal show what each rank unlocks.` : 'Every ship and gun is yours to fly.';
    const reputation = campaign.visited.map(v => `<span>${worlds[v].name}</span><span class="b"><i style="width:${Math.min(100, (campaign.reputation[v]/8)*100)}%;background:var(--w-${world_slug(v)})"></i></span><span class="v">${(campaign.reputation[v] >= 8) ? 'trusted' : (campaign.reputation[v] >= 3) ? 'known' : '–'}</span>`).join('');
    career.innerHTML = `<span class="eyebrow eyebrow--muted">Pilot career</span>${career_head}${career_bar}<p class="small">${career_text}</p><span class="eyebrow eyebrow--muted">Reputation</span><div class="bars">${reputation}</div>`;
    right.append(career);
    const others = document.createElement('div');
    others.className = 'goal-panel';
    others.innerHTML = '<span class="eyebrow eyebrow--muted">Other goals</span>';
    for (const [id, kind] of Object.entries(goal_kinds)) {
        if (campaign.goal?.id === id) {
            continue;
        }
        const row = document.createElement('div');
        row.className = 'goal-row';
        const done = (campaign.goals_done || []).includes(id);
        row.innerHTML = `${map_icon_html((id === 'explorer') ? 'world-gate' : 'outpost', 30)}<div><b>${kind.title}</b><p class="small">${kind.pitch.split('.')[0]} · bonus ${ui_number(kind.reward)}${done ? ' · reached before' : ''}</p></div>`;
        row.append(ui_button({label: 'Follow', size: 'sm', on: () => goal_choose(id)}));
        others.append(row);
    }
    right.append(others);
    parent.append(left, right);
}
