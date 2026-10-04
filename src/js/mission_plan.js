// The map & guide's MISSION PLAN on the kit: the goal's step and every contract's next stage in one list, nearest
// first, the one the guide follows marked; the world's map beside it, and what the ship carries under the map
function render_mission_plan(parent)
{
    parent.replaceChildren();
    const steps = mission_plan_steps();
    const split = document.createElement('div');
    split.className = 'split split--plan mission-plan';
    const list = document.createElement('div');
    list.className = 'plan-list';
    list.innerHTML = '<div class="section-head"><h3 class="h-section">In order</h3><span class="eyebrow eyebrow--muted">Goal and contracts, nearest first</span></div>';
    if (!steps.length) {
        const empty = document.createElement('div');
        empty.className = 'callout callout--cyan';
        empty.innerHTML = '<span class="eyebrow">Tip</span><p class="body">Nothing to do yet: take a contract at a station, or pick a goal on its GOALS tab.</p>';
        list.append(empty);
    }
    for (let i = 0, end = steps.length; i < end; ++i) {
        list.append(mission_plan_row(steps[i], i));
    }
    if (steps.length) {
        list.append(ui_button({label: 'Fly to step 1', kind: 'primary', on: () => mission_plan_go(steps[0].on)}));
    }
    split.append(list, mission_plan_side());
    parent.append(split);
}

// Each thing to do: what, from where (goal or contract), the world, the distance when it is in this world, and how to
// start on it
function mission_plan_steps()
{
    const out = [];
    const g = goal_state();
    if (g && (g.index >= 0)) {
        const step = g.steps[g.index];
        const world = step.target?.world ?? campaign.world;
        out.push({
            title: step.title,
            text: `Goal · ${g.kind.title} ${g.index + 1}/${g.steps.length}`,
            world,
            point: (world === campaign.world) ? step.target?.point || null : null,
            current: !campaign.tracked_id,
            action: 'Fly',
            on: () => goal_follow(step, true),
        });
    }
    for (const m of campaign.contracts) {
        const stage = m.stages?.[m.stage_index];
        const world = m.ready ? campaign.world : stage?.world ?? m.world;
        const stages = m.stages ? ` · stage ${Math.min(m.stage_index + 1, m.stages.length)}/${m.stages.length}` : '';
        out.push({
            title: m.ready ? 'Collect the reward' : stage?.title || m.title,
            text: `Contract · ${m.title}${m.ready ? ' · complete' : stages}`,
            world,
            point: m.ready ? station : (world === campaign.world) ? operation_point(m) : null,
            current: campaign.tracked_id === m.id,
            action: m.ready ? 'Dock' : 'Fly',
            on: function () {
                focus_contract(m);
                guide_action();
            },
        });
    }
    for (const v of out) {
        v.distance = (v.point && player) ? distance(player, v.point) : null;
    }
    return out.sort(function (a, b) {
        return ((a.distance === null) - (b.distance === null)) || ((a.distance ?? a.world) - (b.distance ?? b.world));
    });
}

function mission_plan_row(v, i)
{
    const out = document.createElement('div');
    out.className = `plan-step${v.current ? ' is-current' : ''}`;
    const [value, unit] = (v.distance === null) ? ['', ''] : hud_distance(v.distance);
    const where = (v.distance === null) ? `<span class="small">${worlds[v.world].name}</span>` : `<span class="mono">${value} ${unit}</span>`;
    out.innerHTML = `<span class="plan-n">${i + 1}</span><div class="plan-text"><b></b><span class="small"></span></div><div class="plan-where">${ui_world_badge(v.world)}${where}</div>`;
    out.querySelector('b').textContent = v.title;
    out.querySelector('.plan-text .small').textContent = v.text;
    out.append(ui_button({label: v.action, kind: v.current ? 'primary' : '', size: 'sm', on: () => mission_plan_go(v.on)}));
    return out;
}

// The world's map (click a thing to plan a route there) and what the ship carries
function mission_plan_side()
{
    const out = document.createElement('div');
    out.className = 'plan-side';
    const chart = document.createElement('div');
    chart.className = 'panel plan-map';
    const map = document.createElement('canvas');
    map.id = 'local_navigation_canvas';
    map.width = 960;
    map.height = 620;
    map.className = 'local-chart';
    map.setAttribute('aria-label', 'Local flight map. Click a station, world gate, beacon or mining field to set a waypoint.');
    map.addEventListener('click', function (event) {
        const rect = map.getBoundingClientRect();
        local_map_select(((event.clientX - rect.left)*960)/rect.width, ((event.clientY - rect.top)*620)/rect.height);
    });
    chart.append(map);
    render_local_map_canvas(map);
    const carry = document.createElement('div');
    carry.className = 'panel plan-carry';
    const items = commodities.filter(v => campaign.cargo[v.key]).map(v => ui_badge(`${v.name} ${campaign.cargo[v.key]}`));
    items.push(ui_badge(`Contracts ${campaign.contracts.length}/3`, 'gold'));
    carry.innerHTML = `<span class="eyebrow eyebrow--muted">Carrying</span><div class="plan-chips">${items.join('')}</div>`;
    out.append(chart, carry);
    return out;
}

// A step's button leaves the map & guide first, then sends the ship
function mission_plan_go(on)
{
    if (state === 'navigation') {
        toggle_navigation();
    }
    on();
}
