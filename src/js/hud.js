// The flight HUD on the UI kit: the mission card leads with what to do now (the step, its distance, one button) and
// folds the rest into Details (I); toasts stack under the readouts, banners mark goal steps and arrivals; the view
// toggles fold into one button on narrow screens; the ship status shows the ship, its guns and three gauges.
const hud_toast_max = 3;
let hud_details_open = false;
let hud_card_key = '';
let hud_alert = null;

document.getElementById('toolbar_more').addEventListener('click', on_toolbar_more);
document.getElementById('mc_details_button').addEventListener('click', toggle_mission_details);
document.getElementById('controls_button').addEventListener('click', pause_controls_open);
addEventListener('keydown', on_hud_key);

// Once every script has run (the sprites are packed at the end): the quick bar's icons
function hud_init()
{
    for (const img of document.querySelectorAll('.hud-icon[data-icon]')) {
        img.src = hud_icon_url(img.dataset.icon);
    }
}

// One of the HUD's drawings (sprites/hud/<name>) as an image address
function hud_icon_url(name)
{
    const text = sprite_svgs.hud?.[name];
    return text ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}` : '';
}

// I opens the mission card's Details; ? opens the controls (on the pause screen)
function on_hud_key(event)
{
    if ((state !== 'playing') || event.repeat || event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
    }
    if (event.code === 'KeyI') {
        toggle_mission_details();
    }
    else if (event.key === '?') {
        pause_controls_open();
    }
    else if (event.code === 'KeyT') {
        guide_action();
    }
}

function toggle_mission_details()
{
    hud_details_open = !hud_details_open;
    set_hidden(document.getElementById('mission_details'), !hud_details_open);
    document.getElementById('mc_details_button').setAttribute('aria-expanded', String(hud_details_open));
}

// Below 1440 px the view toggles hide behind one button, which opens them as a menu
function on_toolbar_more()
{
    const toolbar = document.querySelector('.hud-top .toolbar');
    toolbar.classList.toggle('is-open');
    document.getElementById('toolbar_more').setAttribute('aria-expanded', String(toolbar.classList.contains('is-open')));
}

// A toast under the readouts: a colour bar for its kind (goal, income, danger, info), the title, a line, and an amount
// on the right (an ◆ amount in the line moves there); three at most, the oldest goes
function show_toast(title, sub, duration = 2.5, kind = null)
{
    const stack = document.getElementById('toasts');
    const amount = /◆\s*([\d\s]+)\s*$/.exec(sub || '');
    const type = kind || (amount ? 'income' : /LOST|RAID|DANGER|HOSTILE|FATAL|WARNING|CRITICAL/.test(title) ? 'danger' : 'info');
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    t.innerHTML = `<span class="ic"><img src="${hud_icon_url(`toast-${type}`)}" alt=""></span><span><b></b><span></span></span><span class="amt"></span>`;
    t.querySelector('b').textContent = ui_sentence(title);
    t.querySelector('span span').textContent = ui_sentence_names(amount ? sub.slice(0, amount.index).replace(/[\s·]+$/, '') : (sub || ''));
    t.querySelector('.amt').textContent = amount ? `+${amount[1].trim()}` : '';
    t.life = Math.max(duration, 3);
    stack.prepend(t);
    while (stack.children.length > hud_toast_max) {
        stack.lastChild.remove();
    }
}

// Every frame: toasts age and fade out
function toasts_update(dt)
{
    for (const t of [...document.querySelectorAll('#toasts .toast, #banners .banner')]) {
        t.life -= dt;
        t.classList.toggle('is-leaving', t.life < 0.4);
        if (t.life <= 0) {
            t.remove();
        }
    }
}

function toasts_clear()
{
    document.getElementById('toasts').replaceChildren();
    document.getElementById('banners').replaceChildren();
}

// A banner high on the screen for the moments that matter: a goal step (gold) or arriving in a world (its colour)
function show_banner(kind, eyebrow, title, line, duration = 4)
{
    const holder = document.getElementById('banners');
    holder.replaceChildren();
    const b = document.createElement('div');
    b.className = `banner banner--${kind}`;
    b.style.setProperty('--world', `var(--w-${world_slug()})`);
    b.innerHTML = `<span class="eyebrow${(kind === 'goal') ? ' eyebrow--gold' : ''}"></span><h2></h2><p></p>`;
    b.querySelector('.eyebrow').textContent = eyebrow;
    b.querySelector('h2').textContent = title;
    b.querySelector('p').textContent = line;
    b.life = duration;
    holder.append(b);
}

// A capitalised line in sentence case with the worlds, stations, ships and guns named as they are: 43 UNITS SOLD AT
// HAVEN ANCHORAGE becomes 43 units sold at Haven Anchorage
function ui_sentence_names(text)
{
    let out = ui_sentence(text);
    const names = [...worlds.flatMap(v => [v.station, v.name]), ...ship_catalog.map(v => v.name), ...weapon_catalog.map(v => v.name)];
    for (const name of names) {
        out = out.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), name);
    }
    return out;
}

// A capitalised line in sentence case: TRANSPORT UNLOADED becomes Transport unloaded
function ui_sentence(text)
{
    return /[a-z]/.test(text) ? text : text.toLowerCase().replace(/^\w/, v => v.toUpperCase());
}

function set_pause_icon(paused)
{
    el.pause_button.innerHTML = paused
        ? '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 2.8v10.4L13 8z"/></svg>'
        : '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="3" width="2.8" height="10" rx="1"/><rect x="9.2" y="3" width="2.8" height="10" rx="1"/></svg>';
}

// The nearest raider coming for you, while one is within 900 m: the card switches to the fight
function hud_threat()
{
    let best = null;
    for (const v of enemies) {
        if ((v.hp > 0) && !v.structure_target && !v.robot_raider && !v.escort_raider && (!best || (distance(v, player) < distance(best, player)))) {
            best = v;
        }
    }
    return (best && (distance(best, player) < 900)) ? best : null;
}

// Metres or kilometres, as the card shows them: [2.2, 'km'] or [420, 'm']
function hud_distance(d)
{
    return (d >= 1000) ? [(d/1000).toFixed(1), 'km'] : [String(Math.round(d)), 'm'];
}

// The compass direction from you to a point: north-east
function hud_bearing(p)
{
    const a = Math.atan2(p.y - player.y, p.x - player.x);
    const names = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
    return names[(Math.round(a/(Math.PI/4)) + 8) % 8];
}

// Every HUD tick: the mission card, the ship status, the threat chip
function sync_hud_kit()
{
    document.getElementById('mission').classList.toggle('is-arcade', arcade.active);
    // the arcade's card is its lines, shown whether or not Details is open
    set_hidden(document.getElementById('mission_details'), !hud_details_open && !arcade.active);
    if (!player) {
        return;
    }
    sync_ship_status();
    if (!arcade.active) {
        sync_mission_card();
    }
}

function sync_mission_card()
{
    const c = guide_context();
    const g = goal_state();
    const m = focused_contract();
    const threat = hud_threat();
    const id = campaign.world;
    const pips = Math.ceil(((id + 1)/worlds.length)*5);
    document.getElementById('mc_where').innerHTML = `${ui_world_badge(id)}<span class="small">${ui_sentence(world_looks[id].biome)}</span><span class="threat" title="Threat ${id + 1} of ${worlds.length}">${[0, 1, 2, 3, 4].map(v => `<b class="${(v < pips) ? 'on' : ''}"></b>`).join('')}</span>`;
    const step = (g && (g.index >= 0)) ? g.steps[g.index] : null;
    const goal_leads = step && !m;
    let kind = 'Next';
    let title = ui_sentence(c.title);
    if (threat) {
        const count = enemies.filter(v => (v.hp > 0) && (distance(v, player) < 1200)).length;
        kind = m?.stages ? `Now · Contract stage ${m.stage_index + 1} of ${m.stages.length}` : 'Now · Under attack';
        title = m?.stages ? m.stages[m.stage_index].title : `Fight off ${count} raider${(count > 1) ? 's' : ''}`;
    }
    else if (goal_leads) {
        kind = `Next · Goal step ${g.index + 1} of ${g.steps.length}`;
        title = step.title;
    }
    else if (m) {
        kind = m.stages ? `Next · Contract stage ${m.stage_index + 1} of ${m.stages.length}` : 'Next · Contract';
    }
    const kind_el = document.getElementById('mc_kind');
    kind_el.textContent = kind;
    kind_el.className = `eyebrow ${threat ? 'eyebrow--red' : 'eyebrow--gold'}`;
    document.getElementById('mc_title').textContent = title;
    // the distance: to the raiders in a fight, else to the marker
    const target = threat || (c.goal && waypoint ? waypoint_live() : c.goal);
    const dist = document.getElementById('mc_dist');
    set_hidden(dist, !target);
    dist.classList.toggle('is-danger', !!threat);
    if (target) {
        const [value, unit] = hud_distance(distance(player, target));
        document.getElementById('mc_distance').innerHTML = `${value}<small>${unit}</small>`;
        const portals_ahead = guide_path.filter(v => v.portal !== undefined).length;
        const seconds = distance(player, target)/Math.max(1, cruise_speed());
        document.getElementById('mc_eta').innerHTML = threat
            ? `${enemies.filter(v => (v.hp > 0) && (distance(v, player) < 1200)).length} hostiles<br>auto fire on`
            : `~${format_time(seconds)}<br>${portals_ahead} portal${(portals_ahead === 1) ? '' : 's'}`;
        const a = Math.atan2(target.y - player.y, target.x - player.x);
        document.getElementById('mc_arrow').style.transform = `rotate(${a + Math.PI/4}rad)`;
    }
    sync_mission_actions(c, step, threat);
    sync_mission_tracks(m, g, threat);
    const r = current_world_rules();
    document.getElementById('mc_rule').textContent = threat ? `Shield ${Math.ceil(player.shield)}/${shield_max()} · rad ${Math.round(radiation_protection()*100)}%` : ui_sentence(r.name);
}

// The card's buttons: in a fight EMP and Repair; else the guide's next action [T], and the step's own verb (Build at a
// field, Drones at a mining field). Made again only when they change, so a click is never lost to a redraw.
function sync_mission_actions(c, step, threat)
{
    const build = step?.build && step.target && (distance(player, step.target.point) < 450);
    const label = guide_action_label(c);
    const key = threat ? 'fight' : `${label}|${build}`;
    if (key === hud_card_key) {
        return;
    }
    hud_card_key = key;
    const acts = document.getElementById('mc_acts');
    acts.replaceChildren();
    if (threat) {
        acts.append(ui_button({label: 'EMP', key: 'E', kind: 'primary', on: () => document.getElementById('quick_emp').click()}));
        acts.append(ui_button({label: 'Repair', key: 'Q', on: () => document.getElementById('quick_medkit').click()}));
        return;
    }
    acts.append(ui_button({label: ui_sentence(label.replace(/^[A-Z] \/ /, '')), key: 'T', kind: 'primary', on: guide_action}));
    if (build) {
        acts.append(ui_button({label: 'Build', key: 'K', on: build_menu_toggle}));
    }
}

// Under the buttons: the contract you follow (red in a fight) and the goal, each with its segmented bar
function sync_mission_tracks(m, g, threat)
{
    const rows = [];
    if (m) {
        const count = m.stages ? m.stages.length : 1;
        const now = m.stages ? m.stage_index : 0;
        const bars = [];
        for (let i = 0; i < count; ++i) {
            bars.push((m.ready || (i < now)) ? '<b class="done"></b>' : (i === now) ? `<b class="now" style="--p:${Math.round(Math.min(1, m.progress/m.target)*100)}%"></b>` : '<b></b>');
        }
        rows.push(`<div class="track-row${threat ? ' is-danger' : ''}"><div class="head">${ui_badge('Contract', threat ? 'red' : 'gold')}<b>${m.title}</b><span class="eyebrow ${threat ? 'eyebrow--red' : 'eyebrow--gold'}">${format_progress(m.progress)} / ${m.target}</span></div><div class="prog"><div class="track">${bars.join('')}</div></div></div>`);
    }
    if (g && (g.index >= 0)) {
        const step = g.steps[g.index];
        const bars = g.steps.map((v, i) => (v.done ? '<b class="done"></b>' : (i === g.index) ? '<b class="now" style="--p:20%"></b>' : '<b></b>')).join('');
        const then = (m || threat) ? `<p class="small">Then: ${step.title.toLowerCase()}</p>` : '';
        rows.push(`<div class="track-row"><div class="head">${ui_badge('Goal', 'gold')}<b>${g.kind.title}</b><span class="eyebrow eyebrow--gold">${g.index} / ${g.steps.length}</span></div>${(m || threat) ? '' : `<div class="prog"><div class="track">${bars}</div></div>`}${then}</div>`);
    }
    document.getElementById('mc_tracks').innerHTML = rows.join('');
}

// The bottom status: the ship and its guns, magnet, shield and radiation; hull turns red when low
function sync_ship_status()
{
    document.getElementById('ship_name').textContent = current_ship().name;
    document.getElementById('ship_guns').textContent = guns_text();
    document.getElementById('rad_readout').textContent = `Rad ${Math.round(radiation_protection()*100)}%`;
    document.getElementById('hull_gauge').classList.toggle('is-low', player.hp < hull_max()*0.3);
    document.getElementById('turbo_gauge').classList.toggle('is-ready', !player.turbo_active && (player.dash_cd <= 0));
    document.getElementById('combo_box').classList.toggle('is-hot', combo > 1);
    const threat = hud_threat();
    if (threat && !hud_alert) {
        hud_alert = document.createElement('div');
        hud_alert.className = 'alert';
        document.getElementById('hud_toasts').prepend(hud_alert);
    }
    if (hud_alert) {
        if (!threat) {
            hud_alert.remove();
            hud_alert = null;
            return;
        }
        const count = enemies.filter(v => (v.hp > 0) && (distance(v, player) < 1200)).length;
        const [value, unit] = hud_distance(distance(player, threat));
        hud_alert.innerHTML = `<span class="dot"></span>Raiders ×${count} · ${value} ${unit} · ${hud_bearing(threat)}`;
    }
}

const hud_dock_icon = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="2"/><path d="M8 0.8v2.4M8 12.8v2.4M0.8 8h2.4M12.8 8h2.4"/></svg>';
