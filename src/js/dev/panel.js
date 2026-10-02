// The dev panel: tabs, theme, collapse, the controls of the other dev files, and the readout.
const dev_tab_options = [
    {value: 'scenario', label: 'Scenario'},
    {value: 'ships', label: 'Ships'},
    {value: 'weapons', label: 'Weapons'},
    {value: 'enemies', label: 'Enemies'},
    {value: 'upgrades', label: 'Upgrades'},
    {value: 'sounds', label: 'Sounds'},
];
const dev_world_options = worlds.map((v, i) => ({value: i, label: (i + 1) + ' · ' + v.name + ' · ' + world_rules[i].name}));
const dev_ship_options = ship_catalog.map(v => ({value: v.id, label: v.name}));
const dev_weapon_options = weapon_catalog.map(v => ({value: v.id, label: v.name}));

dev_panel_init();

function dev_panel_init()
{
    const panel = document.getElementById('dev_panel');
    panel.addEventListener('keydown', dev_panel_keydown);
    panel.addEventListener('keyup', function (event) {
        event.stopPropagation();
    });
    addEventListener('keydown', dev_panel_keydown);
    addEventListener('pointerdown', start_audio, {once: true});
    document.getElementById('dev_collapse').addEventListener('click', dev_panel_collapse_toggle);
    document.getElementById('dev_open').addEventListener('click', dev_panel_collapse_toggle);
    document.getElementById('dev_pause').addEventListener('click', dev_time_pause_toggle);
    document.getElementById('dev_step').addEventListener('click', dev_time_step);
    document.getElementById('dev_start').addEventListener('click', dev_scenario_start);
    document.getElementById('dev_clear').addEventListener('click', dev_cheats_clear_enemies);
    document.getElementById('dev_enemy_spawn').addEventListener('click', function () {
        dev_enemy_spawn(false);
    });
    document.getElementById('dev_dummy_spawn').addEventListener('click', function () {
        dev_enemy_spawn(true);
    });
    document.getElementById('dev_enemy_clear').addEventListener('click', dev_enemies_clear);
    for (const key of ['god', 'energy', 'spawns']) {
        const input = document.getElementById('dev_' + key);
        input.checked = dev_scenario[key];
        input.addEventListener('change', function () {
            dev_scenario[key] = input.checked;
            dev_scenario_save();
        });
    }
    for (const button of document.querySelectorAll('[data-dev-theme]')) {
        button.addEventListener('click', function () {
            dev_theme_set(button.dataset.devTheme);
        });
    }
    dev_select_fill('dev_world', dev_world_options, dev_scenario.world, function (value) {
        dev_scenario.world = value;
        dev_scenario_save();
    });
    dev_select_fill('dev_enemy_type', dev_enemy_type_options, 'chaser', null);
    dev_theme_set(dev_theme_initial());
    dev_panel_refresh();
    if (dev_scenario.started) {
        setTimeout(dev_scenario_start, 0);
    }
}

// Selections that other code can change are filled again on every refresh.
function dev_panel_refresh()
{
    dev_select_fill('dev_ship', dev_ship_options, dev_scenario.ship, dev_ship_set);
    dev_select_fill('dev_weapon', dev_weapon_options, dev_scenario.weapon, dev_weapon_set);
    dev_select_fill('dev_tier', dev_tier_options, dev_scenario.tier, dev_weapon_tier_set);
    dev_select_fill('dev_weapon_tier', dev_tier_options, dev_scenario.tier, dev_weapon_tier_set);
    dev_select_fill('dev_difficulty', dev_difficulty_options, dev_scenario.difficulty, function (value) {
        dev_scenario.difficulty = value;
        dev_scenario_save();
    });
    dev_select_fill('dev_view', dev_view_options, view_mode, dev_view_set);
    const tabs = document.getElementById('dev_tabs');
    tabs.replaceChildren();
    for (const option of dev_tab_options) {
        const button = dev_button(option.label, function () {
            dev_scenario.tab = option.value;
            dev_scenario_save();
            dev_panel_refresh();
        });
        button.setAttribute('aria-pressed', String(option.value === dev_scenario.tab));
        tabs.append(button);
    }
    for (const section of document.querySelectorAll('[data-dev-section]')) {
        set_hidden(section, section.dataset.devSection !== dev_scenario.tab);
    }
    dev_ships_fill();
    dev_weapons_fill();
    dev_upgrades_fill();
    dev_sounds_fill();
    dev_panel_refresh_time();
    dev_panel_refresh_readout();
}

function dev_panel_refresh_time()
{
    document.getElementById('dev_pause').textContent = dev_time.paused ? 'Resume' : 'Pause';
    const speed = document.getElementById('dev_speed');
    speed.replaceChildren();
    for (const option of dev_speed_options) {
        const button = dev_button(option.label, function () {
            dev_time_scale_set(option.value);
        });
        button.setAttribute('aria-pressed', String(option.value === dev_time.scale));
        speed.append(button);
    }
}

function dev_panel_refresh_readout()
{
    const lines = [`fps ${dev_time.fps} · ${dev_time.paused ? 'paused' : 'speed ×' + dev_time.scale} · state ${state}`];
    if (dev_run_active()) {
        const rules = current_world_rules();
        const velocity = Math.round(Math.hypot(player.vx, player.vy));
        lines.push(`world ${campaign.world + 1} ${worlds[campaign.world].name} · ${rules.name}`);
        lines.push(`${current_ship().name} · ${current_weapon().name} T${weapon_level()}`);
        lines.push(`hull ${Math.ceil(player.hp)}/${hull_max()} · shield ${Math.ceil(player.shield)} · energy ${Math.round(player.energy)}`);
        lines.push(`speed ${velocity} · x ${Math.round(player.x)} y ${Math.round(player.y)} · map ${world.w}×${world.h}`);
        lines.push(`heat ${Math.round(player.heat || 0)} · radiation ${Math.round(player.radiation_dose || 0)} · turbo ${(player.turbo_fuel || 0).toFixed(1)} s`);
        lines.push(`enemies ${enemies.length} · bullets ${bullets.length} · enemy fire ${hostile.length} · particles ${particles.length}`);
    }
    lines.push(`view ${view_mode} · zoom ${Math.round(zoom*100)}%`);
    document.getElementById('dev_readout').textContent = lines.join('\n');
}

function dev_panel_keydown(event)
{
    if ((event.code === 'Backquote') && !event.repeat) {
        event.preventDefault();
        dev_panel_collapse_toggle();
    }
    if (event.currentTarget !== window) {
        event.stopPropagation();
    }
}

function dev_panel_collapse_toggle()
{
    dev_layout.collapsed = !dev_layout.collapsed;
    document.body.classList.toggle('dev-collapsed', dev_layout.collapsed);
    set_hidden(document.getElementById('dev_open'), !dev_layout.collapsed);
    dispatchEvent(new Event('resize'));
}

function dev_theme_initial()
{
    try {
        const saved = localStorage.getItem('dev_theme');
        if (['light', 'dark'].includes(saved)) {
            return saved;
        }
    }
    catch {
        // The theme falls back to the system preference.
    }
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function dev_theme_set(theme)
{
    document.documentElement.dataset.theme = theme;
    for (const button of document.querySelectorAll('[data-dev-theme]')) {
        button.setAttribute('aria-pressed', String(button.dataset.devTheme === theme));
    }
    try {
        localStorage.setItem('dev_theme', theme);
    }
    catch {
        // Without storage the theme lasts until the page reloads.
    }
}

function dev_run_active()
{
    return !!player && !['menu', 'dead', 'won'].includes(state);
}

function dev_button(label, on_click)
{
    const out = document.createElement('button');
    out.type = 'button';
    out.textContent = label;
    out.addEventListener('click', on_click);
    return out;
}

// options are {value, label}; the handler gets the option's own value, number or string
function dev_select_fill(id, options, value, on_change)
{
    const select = document.getElementById(id);
    select.replaceChildren();
    for (let i = 0, end = options.length; i < end; ++i) {
        const item = document.createElement('option');
        item.value = String(i);
        item.textContent = options[i].label;
        item.selected = options[i].value === value;
        select.append(item);
    }
    select.onchange = function () {
        if (on_change) {
            on_change(options[Number(select.value)].value);
        }
    };
}

// rows are {value, cells}; a cell is text or a node; with on_click a row selects its value
function dev_table_fill(parent, headers, rows, selected, on_click)
{
    const table = document.createElement('table');
    const head = document.createElement('tr');
    for (const header of headers) {
        const th = document.createElement('th');
        th.textContent = header;
        head.append(th);
    }
    table.append(head);
    for (const row of rows) {
        const tr = document.createElement('tr');
        if (on_click) {
            tr.className = (row.value === selected) ? 'dev-row dev-selected' : 'dev-row';
            tr.addEventListener('click', function () {
                on_click(row.value);
            });
        }
        for (const cell of row.cells) {
            const td = document.createElement('td');
            td.append((cell instanceof Node) ? cell : String(cell));
            tr.append(td);
        }
        table.append(tr);
    }
    parent.replaceChildren(table);
}
