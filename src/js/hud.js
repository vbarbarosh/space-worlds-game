// The flight HUD on the UI kit, kept off the middle of the screen, where the ship and the way ahead are: the mission
// card is two lines (the step, its distance and arrow) and unfolds the rest with ⓘ (I); the news is one line under the
// readouts, one message at a time, a burst queued and merged; banners mark goal steps and arrivals under it.
let hud_card_open = false;
let hud_card_key = '';
// The news line: the message on it and the ones waiting; a banner on screen holds all but danger
const hud_news = {shown: null, queue: [], banner: null};
const hud_news_wait_max = 4;

document.getElementById('mc_details_button').addEventListener('click', toggle_mission_details);
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
    else if ((event.code === 'KeyT') && !/^R \/ /.test(guide_action_label(guide_context()))) {
        guide_action();
    }
}

// ⓘ (I): the card unfolds to the world, the step's kind, its buttons, the contract and goal tracks and the details
function toggle_mission_details()
{
    hud_card_open = !hud_card_open;
    document.getElementById('mission').classList.toggle('is-open', hud_card_open);
    set_hidden(document.getElementById('mission_details'), !hud_card_open);
    document.getElementById('mc_details_button').setAttribute('aria-expanded', String(hud_card_open));
}

// A message on the news line under the readouts: a dot in its kind's colour (goal, income, danger, info), the title,
// the line, and an amount at the end (an ◆ amount in the line moves there). One at a time: the rest wait, danger first.
// The same title again joins the one shown or waiting (×2, the amounts added); a newer info of the same subject (its
// first word: DEPOT SHIELDED, DEPOT OPEN) takes the place of an older one.
function show_toast(title, sub, duration = 2.5, kind = null)
{
    const amount = /◆\s*([\d\s]+)\s*$/.exec(sub || '');
    const type = kind || (amount ? 'income' : /LOST|RAID|DANGER|HOSTILE|FATAL|WARNING|CRITICAL/.test(title) ? 'danger' : 'info');
    const news = {
        title: ui_sentence(title),
        sub: ui_sentence_names(amount ? sub.slice(0, amount.index).replace(/[\s·]+$/, '') : (sub || '')),
        amount: amount ? Number(amount[1].replace(/\s/g, '')) : 0,
        type,
        count: 1,
        life: 0,
        element: null,
    };
    // long enough to read, never longer than the caller asked (plus a little), 1.6 to 3.5 s
    news.life = clamp(Math.min(duration + 0.5, 1.2 + (news.title.length + news.sub.length)*0.03), 1.6, 3.5);
    const same = [hud_news.shown, ...hud_news.queue].find(v => v && (v.title === news.title));
    if (same) {
        same.count++;
        same.sub = news.sub;
        same.amount += news.amount;
        if (same === hud_news.shown) {
            same.life = Math.max(same.life, 1.2);
            news_fill(same);
        }
        return;
    }
    if (type === 'info') {
        const topic = news_topic(news.title);
        hud_news.queue = hud_news.queue.filter(v => (v.type !== 'info') || (news_topic(v.title) !== topic));
        const shown = hud_news.shown;
        if (shown && (shown.type === 'info') && (news_topic(shown.title) === topic)) {
            shown.life = Math.min(shown.life, 0.3);
        }
    }
    // danger waits behind danger only
    const at = (type === 'danger') ? hud_news.queue.findIndex(v => v.type !== 'danger') : -1;
    hud_news.queue.splice((at < 0) ? hud_news.queue.length : at, 0, news);
    while (hud_news.queue.length > hud_news_wait_max) {
        const calm = hud_news.queue.findIndex(v => v.type === 'info');
        hud_news.queue.splice((calm < 0) ? 0 : calm, 1);
    }
    news_next();
}

// A message's subject: its first word
function news_topic(title)
{
    return title.split(/[\s·]+/)[0].toLowerCase();
}

// The next message onto the line, when the line is free; while a banner shows, only danger
function news_next()
{
    const next = hud_news.queue[0];
    if (hud_news.shown || !next || (hud_news.banner && (next.type !== 'danger'))) {
        return;
    }
    hud_news.queue.shift();
    const t = document.createElement('div');
    t.className = `toast toast--${next.type}`;
    t.setAttribute('role', (next.type === 'danger') ? 'alert' : 'status');
    t.innerHTML = '<span class="dot"></span><b></b><span class="sub"></span><span class="amt"></span>';
    next.element = t;
    news_fill(next);
    hud_news.shown = next;
    document.getElementById('toasts').append(t);
}

function news_fill(v)
{
    const t = v.element;
    t.querySelector('b').textContent = (v.count > 1) ? `${v.title} ×${v.count}` : v.title;
    t.querySelector('.sub').textContent = v.sub;
    t.querySelector('.amt').textContent = v.amount ? `+${ui_number(v.amount)}` : '';
    t.title = v.sub ? `${v.title} · ${v.sub}` : v.title;
}

// Every frame: the message on the line ages (faster while others wait) and fades out; the banner ages
function toasts_update(dt)
{
    const shown = hud_news.shown;
    if (shown) {
        shown.life -= dt*(hud_news.queue.length ? 1.6 : 1);
        shown.element.classList.toggle('is-leaving', shown.life < 0.3);
        if (shown.life <= 0) {
            shown.element.remove();
            hud_news.shown = null;
        }
    }
    const banner = hud_news.banner;
    if (banner) {
        banner.life -= dt;
        banner.classList.toggle('is-leaving', banner.life < 0.4);
        if (banner.life <= 0) {
            banner.remove();
            hud_news.banner = null;
        }
    }
    news_next();
}

function toasts_clear()
{
    hud_news.shown = null;
    hud_news.queue = [];
    hud_news.banner = null;
    document.getElementById('toasts').replaceChildren();
    document.getElementById('banners').replaceChildren();
}

// A banner under the news line for the moments that matter: a goal step (gold) or arriving in a world (its colour).
// The news waits while it shows, but for danger.
function show_banner(kind, eyebrow, title, line, duration = 3)
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
    hud_news.banner = b;
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
        if ((v.hp > 0) && !v.structure_target && !v.robot_raider && (!best || (distance(v, player) < distance(best, player)))) {
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

// Every HUD tick: the mission card and the ship status
function sync_hud_kit()
{
    document.getElementById('mission').classList.toggle('is-arcade', arcade.active);
    // in a fight the edges of the screen glow red
    document.body.classList.toggle('in-fight', !!player && (state === 'playing') && !!hud_threat());
    if (!player) {
        return;
    }
    sync_ship_status();
    race_board_sync();
    if (arcade.active) {
        sync_arcade_card();
    }
    else {
        sync_mission_card();
    }
}

// The arcade's card: the raiders left with the way to the nearest, the wave beside it (and how many are near, in a
// fight); folded, the world, the wave's name and the depot [R]. No EMP and Repair: the quick bar has them (Q, E); no
// run bar: the wave is on the card already.
function sync_arcade_card()
{
    const id = campaign.world;
    // the threat by the run's step: the worlds come in the order chosen (arcade_route.js)
    const step = arcade_level();
    const pips = Math.ceil(((step + 1)/arcade_worlds)*5);
    hud_html(document.getElementById('mc_where'), `${ui_world_badge(id)}<span class="small">Arcade · world ${step + 1}/${arcade_worlds}</span><span class="threat" title="Threat ${step + 1} of ${arcade_worlds}">${[0, 1, 2, 3, 4].map(v => `<b class="${(v < pips) ? 'on' : ''}"></b>`).join('')}</span>`);
    const wave = Math.max(1, arcade.wave);
    const left = spawn_left + enemies.filter(v => v.hp > 0).length;
    const threat = hud_threat();
    const flagship = enemies.some(v => (v.hp > 0) && (v.type === 'boss'));
    const at_depot = (distance(player, station) < station_reach) && !depot_shield_up();
    const kind_el = document.getElementById('mc_kind');
    hud_text(kind_el, (arcade.pause > 0) ? `Wave ${wave} of ${arcade_waves} · clear` : `Wave ${wave} of ${arcade_waves} · ${ui_sentence(arcade_wave_names[wave] || '')}`);
    kind_el.classList.toggle('eyebrow--red', !!threat);
    kind_el.classList.toggle('eyebrow--gold', !threat);
    // a wave with a goal says the goal, and the way to its next place unless a raider is on you (arcade_goals.js)
    // a flagship's duel says how it is won (boss_duels.js)
    const goal = (arcade_goal_open() && (arcade.pause <= 0)) ? arcade_goal_card() : flagship ? boss_duel_card() : null;
    hud_text(document.getElementById('mc_title'), (arcade.pause > 0)
        ? 'Wave clear: repair at the depot or wait for the next'
        : goal ? goal.title : flagship ? `Destroy the flagship of ${worlds[id].name}` : `Destroy ${left} raider${(left === 1) ? '' : 's'}`);
    const nearest = threat || goal?.target || enemies.filter(v => v.hp > 0).sort((a, b) => distance(a, player) - distance(b, player))[0];
    const dist = document.getElementById('mc_dist');
    set_hidden(dist, !nearest);
    dist.classList.toggle('is-danger', !!threat);
    if (nearest) {
        const [value, unit] = hud_distance(distance(player, nearest));
        hud_html(document.getElementById('mc_distance'), `${value}<small>${unit}</small>`);
        // folded, the wave is said here (its name, or how many are near in a fight); unfolded, the card's kind says it
        const eta = threat ? `${hud_near_count()} near` : goal ? goal.eta : hud_card_open ? `${left} left` : ui_sentence(arcade_wave_names[wave] || '');
        hud_text(document.getElementById('mc_eta'), hud_card_open ? eta : `Wave ${wave}/${arcade_waves} · ${eta}`);
        const a = Math.atan2(nearest.y - player.y, nearest.x - player.x);
        document.getElementById('mc_arrow').style.transform = `rotate(${a + Math.PI/4}rad)`;
    }
    const key = threat ? 'fight' : at_depot ? 'depot' : 'calm';
    if (key !== hud_card_key) {
        hud_card_key = key;
        const acts = document.getElementById('mc_acts');
        acts.replaceChildren();
        if (key === 'depot') {
            acts.append(ui_button({label: 'Depot', key: 'R', kind: 'primary', title: 'Depot (R)', on: interact}));
        }
        else if (key === 'calm') {
            acts.append(ui_button({label: 'Fly to the depot', key: 'R', title: 'Fly to the depot (R)', on: interact}));
        }
    }
    hud_html(document.getElementById('mc_tracks'), '');
}

// The raiders within 1200 m of you
function hud_near_count()
{
    return enemies.filter(v => (v.hp > 0) && (distance(v, player) < 1200)).length;
}

function sync_mission_card()
{
    const c = guide_context();
    const g = goal_state();
    const m = focused_contract();
    const threat = hud_threat();
    const id = campaign.world;
    // the threat by the world's tier, of eight
    const threat_level = Math.floor(world_tier(id)) + 1;
    const pips = Math.ceil((threat_level/arcade_worlds)*5);
    hud_html(document.getElementById('mc_where'), `${ui_world_badge(id)}<span class="threat" title="Threat ${threat_level} of ${arcade_worlds}">${[0, 1, 2, 3, 4].map(v => `<b class="${(v < pips) ? 'on' : ''}"></b>`).join('')}</span>`);
    // in a race the card is the race's: place, ring and its distance (js/race.js)
    if (race_card()) {
        return;
    }
    const step = (g && (g.index >= 0)) ? g.steps[g.index] : null;
    const goal_leads = step && !m;
    let kind = 'Next';
    let title = ui_sentence(c.title);
    if (threat) {
        const count = hud_near_count();
        kind = m?.stages ? `Now · Contract stage ${m.stage_index + 1} of ${m.stages.length}` : 'Now · Under attack';
        title = m?.stages ? m.stages[m.stage_index].title : `Fight off ${count} raider${(count > 1) ? 's' : ''}`;
    }
    else if ((m?.type === 'escort') && escort?.active) {
        // the cargo run: where the freighter goes, its stop's countdown, or that it waits for you
        const stop = escort.stops[escort.leg];
        kind = `Escort · stop ${escort.leg + 1} of ${escort.stops.length}`;
        title = (escort.stop_timer >= 0)
            ? `${(stop.job === 'load') ? 'Loading' : 'Unloading'} at ${stop.label} · ${Math.ceil(escort.stop_timer)} s`
            : (distance(player, escort) > escort_leash) ? 'The freighter waits for you' : `Freighter to ${stop.label}`;
    }
    else if (goal_leads) {
        kind = `Next · Goal step ${g.index + 1} of ${g.steps.length}`;
        title = step.title;
    }
    else if (m) {
        kind = m.stages ? `Next · Contract stage ${m.stage_index + 1} of ${m.stages.length}` : 'Next · Contract';
    }
    const kind_el = document.getElementById('mc_kind');
    hud_text(kind_el, kind);
    kind_el.classList.toggle('eyebrow--red', !!threat);
    kind_el.classList.toggle('eyebrow--gold', !threat);
    hud_text(document.getElementById('mc_title'), title);
    // the distance: to the raiders in a fight, else to the marker
    const target = threat || (c.goal && waypoint ? waypoint_live() : c.goal);
    const dist = document.getElementById('mc_dist');
    set_hidden(dist, !target);
    dist.classList.toggle('is-danger', !!threat);
    if (target) {
        const [value, unit] = hud_distance(distance(player, target));
        hud_html(document.getElementById('mc_distance'), `${value}<small>${unit}</small>`);
        // beside the distance, the place it is to (the details keep the time and the portals)
        const run = ((m?.type === 'escort') && escort?.active) ? escort.stops[escort.leg] : null;
        hud_text(document.getElementById('mc_eta'), threat
            ? `${hud_near_count()} near · auto fire`
            : (m?.type === 'lure')
                ? lure_text(m)
                : run
                    ? `${run.label} in ${hud_distance(distance(escort, run)).join(' ')} · ~${Math.ceil(distance(escort, run)/escort_speed)} s`
                    : ui_sentence_names(c.goal?.label || target.label || worlds[c.target]?.station || ''));
        const a = Math.atan2(target.y - player.y, target.x - player.x);
        document.getElementById('mc_arrow').style.transform = `rotate(${a + Math.PI/4}rad)`;
    }
    sync_mission_actions(c, step, threat);
    sync_mission_tracks(m, g, threat);
}

// The card's buttons: the guide's next action [T], and the step's own verb (Build at a field); none in a fight, where
// EMP and Repair are the quick bar's (E, Q). Made again only when they change, so a click is never lost to a redraw.
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
        return;
    }
    // docking and jumping are R's, wherever they show; T is the way to the next step
    const act_key = /^R \/ /.test(label) ? 'R' : 'T';
    const text = ui_sentence(label.replace(/^[A-Z] \/ /, ''));
    acts.append(ui_button({label: text, key: act_key, kind: 'primary', title: `${text} (${act_key})`, on: (act_key === 'R') ? interact : guide_action}));
    if (build) {
        acts.append(ui_button({label: 'Build', key: 'K', title: 'Build (K)', on: build_menu_toggle}));
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
    hud_html(document.getElementById('mc_tracks'), rows.join(''));
}

// HUD text reaches the page only when it changed: a write of the same text still rebuilds the element and costs a
// style and layout pass. Inside update_hud the writes wait for its end, so a value a later layer overwrites never lands.
const hud_markup = new WeakMap();
let hud_pending = null;

function hud_text(element, text)
{
    hud_write(element, 'text', String(text));
}

function hud_html(element, html)
{
    hud_write(element, 'html', html);
}

// The text an element will show: the one waiting for the end of update_hud, or the page's
function hud_read(element)
{
    const v = hud_pending?.get(element);
    return (v?.kind === 'text') ? v.value : element.textContent;
}

function hud_write(element, kind, value)
{
    if (hud_pending) {
        hud_pending.set(element, {kind, value});
        return;
    }
    hud_apply(element, kind, value);
}

function hud_flush()
{
    const pending = hud_pending;
    hud_pending = null;
    for (const [element, v] of pending) {
        hud_apply(element, v.kind, v.value);
    }
}

// Text is compared with the page's (a lone text node); markup with what was written last, while the element still
// holds the nodes that write made
function hud_apply(element, kind, value)
{
    if (kind === 'text') {
        const plain = !element.firstChild || ((element.childNodes.length === 1) && (element.firstChild.nodeType === Node.TEXT_NODE));
        if (!plain || (element.textContent !== value)) {
            element.textContent = value;
        }
        return;
    }
    const last = hud_markup.get(element);
    if (last && (last.html === value) && (last.first === element.firstChild)) {
        return;
    }
    element.innerHTML = value;
    hud_markup.set(element, {html: value, first: element.firstChild});
}

// The bottom status: the ship and its guns, magnet, shield and radiation; hull turns red when low
function sync_ship_status()
{
    hud_text(document.getElementById('ship_name'), current_ship().name);
    hud_text(document.getElementById('ship_guns'), guns_text());
    hud_text(document.getElementById('rad_readout'), `Rad ${Math.round(radiation_protection()*100)}%`);
    document.getElementById('hull_gauge').classList.toggle('is-low', player.hp < hull_max()*0.3);
    document.getElementById('turbo_gauge').classList.toggle('is-ready', !player.turbo_active && (player.dash_cd <= 0));
    document.getElementById('combo_box').classList.toggle('is-hot', combo > 1);
}

const hud_dock_icon = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="2"/><path d="M8 0.8v2.4M8 12.8v2.4M0.8 8h2.4M12.8 8h2.4"/></svg>';
