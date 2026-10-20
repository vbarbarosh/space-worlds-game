// The map editor: `?screen=map-editor&world=3` shows the world's whole campaign map from above (`&kind=free`, `scroll`
// or `base` its arcade map, Free's or the lane Scroll and Base share), to move, add and delete its things, and checks
// the placement rules of docs/placement.md (dev/map_rules.js) as it goes. The game stays paused behind it. Every
// change is made into the map at once by the game's own generator, the edit as its map file (map_files.js), so what
// the editor shows is what the game flies: the gates, portals, storms, pylons and spires follow a moved station unless
// they are edited too. Each change is kept in this browser, per world and layout; Play flies it (&map=edited), Export
// downloads the file for src/maps/, Copy puts it on the clipboard, Reset forgets it.
const dev_map_params = new URLSearchParams(location.search);
const dev_map = {
    open: false,
    // what the game's map file is on the dev page: 'file', the packed one (src/maps/); 'edited', this browser's edit
    // or else the packed one (the editor, and Play); 'generated', none (dev_map_file_packed)
    source: (dev_map_params.get('map') === 'edited') ? 'edited' : 'file',
    // the edits read from storage, by map file name: a map, or null
    edits: new Map(),
    name: '',
    // the map as the game made it, read back after each change (dev_map_read); window.dev_state() of it, and the
    // problems of its rules
    shown: null,
    state: null,
    problems: [],
    // the thing selected, {kind, i} (a rock {kind, i: its field, j}); the kind a click adds; the view's middle (m) and
    // its scale (px a metre)
    selected: null,
    tool: null,
    view: {x: 0, y: 0, scale: 0.01},
    drag: null,
    undo: [],
    redo: [],
    // how long the last making of the map took (ms): while it is quick, a drag remakes it as it goes
    made_ms: 0,
    made_at: 0,
    pointer: null,
    message: '',
};
// The kinds of things: what the panel calls them, the list of the map file they are in (the edit takes the lists of a
// group whole: a field with its rocks, the pylons with their charge fields), their colour on the map, and whether a
// tool adds one
const dev_map_kinds = {
    station: {label: 'Station', lists: ['station'], color: '#6cf8ec'},
    field: {label: 'Rock field', lists: ['fields'], color: '#c9a227', add: true},
    rock: {label: 'Rock', lists: ['fields'], color: '#f0c45a', add: true},
    cache: {label: 'Cache', lists: ['caches'], color: '#57d6ff', add: true},
    hole: {label: 'Black hole', lists: ['holes'], color: '#ff5fb0', add: true},
    storm: {label: 'Storm', lists: ['storms'], color: '#ffb347', add: true},
    pylon: {label: 'Arc pylon', lists: ['pylons', 'charge_fields'], color: pylon_color, add: true},
    charge_field: {label: 'Charge field', lists: ['pylons', 'charge_fields'], color: charge_field_color, add: true},
    spire: {label: 'Magnetic spire', lists: ['spires'], color: spire_color, add: true},
    cliff: {label: 'Cliff', lists: ['cliffs'], color: cliff_colors.rim, add: true},
};
// a thing that breaks a rule, and the thing selected
const dev_map_bad = '#ff4040';
const dev_map_pick = '#ffffff';
// the map file's list each kind is in (a rock: its field's rocks)
const dev_map_list = {
    field: 'fields',
    rock: 'fields',
    cache: 'caches',
    hole: 'holes',
    storm: 'storms',
    pylon: 'pylons',
    charge_field: 'charge_fields',
    spire: 'spires',
    cliff: 'cliffs',
};
// a field's radius, and the rocks a new one gets
const dev_map_field_r = 260;
const dev_map_field_rocks = 9;

// The dev page's map file: none when the editor asks for the generated map; this browser's edit, if there is one, in
// the editor and with &map=edited (Play); else the packed file
const dev_map_file_packed = map_file_current;
map_file_current = function () {
    if (dev_map.source === 'generated') {
        return null;
    }
    return ((dev_map.source === 'edited') && dev_map_edit_get(map_file_name())) || dev_map_file_packed();
};

// This browser's edit of a map, by its file name, or null; read from storage once
function dev_map_edit_get(name)
{
    if (!dev_map.edits.has(name)) {
        let edit = null;
        try {
            edit = JSON.parse(localStorage.getItem(`map_edit:${name}`) || 'null');
        }
        catch {
            // no storage, or what it holds is not a map: no edit
        }
        dev_map.edits.set(name, edit?.size ? edit : null);
    }
    return dev_map.edits.get(name);
}

// Keeps this browser's edit of a map (null forgets it); whether storage took it (without, it lasts until a reload)
function dev_map_edit_set(name, edit)
{
    dev_map.edits.set(name, edit);
    try {
        if (edit) {
            localStorage.setItem(`map_edit:${name}`, JSON.stringify(edit));
        }
        else {
            localStorage.removeItem(`map_edit:${name}`);
        }
        return true;
    }
    catch {
        return false;
    }
}

// The edit of the map open in the editor, or null
function dev_map_edit()
{
    return dev_map_edit_get(dev_map.name);
}

// The packed file of the map open, scaled to the world's size, or null
function dev_map_packed()
{
    const file = map_files[dev_map.name];
    if (!file) {
        return null;
    }
    return {...map_file_scaled(file, world.w/file.size.w, world.h/file.size.h), size: {w: world.w, h: world.h}};
}

// The editor opens (dev_screen_open): the scene's world, the campaign's or the arcade's (&kind=), started and paused,
// its map made with this browser's edit, the whole of it in view
function dev_map_editor_open()
{
    if (['free', 'scroll', 'base'].includes(dev_map_params.get('kind'))) {
        dev_arcade_start();
    }
    else if (!dev_run_active()) {
        dev_scenario_start();
    }
    dev_time.paused = true;
    dev_panel_refresh_time();
    dev_map.open = true;
    dev_map.source = 'edited';
    dev_map.name = map_file_name();
    document.body.classList.add('map-editing');
    const root = document.getElementById('map_editor');
    set_hidden(root, false);
    dev_map_listen(root);
    dev_map_tools_fill();
    const lane = `lane (${arcade_base_kind() ? 'Base' : 'Scroll'})`;
    const layout = arcade.active ? `arcade ${arcade_lane_kind() ? lane : 'Free'}` : 'campaign';
    document.getElementById('me_title').textContent = `MAP · ${worlds[campaign.world].name} · ${layout}`;
    dev_map_make();
    new ResizeObserver(dev_map_resize).observe(document.getElementById('me_view'));
    dev_map_resize();
    dev_map_fit();
    // &select=station (or rock, pylon, ...: the first of its kind) opens with it selected, for its panel's screenshot
    const wanted = dev_map_params.get('select');
    const first = dev_map_things(true).find(v => v.kind === wanted);
    dev_map.selected = first ? {kind: first.kind, i: first.i, j: first.j} : null;
    dev_map_panel();
    document.getElementById('me_map').focus();
}

// The editor's buttons, the map's pointer and wheel, and its keys; the game hears none of them
function dev_map_listen(root)
{
    const canvas = document.getElementById('me_map');
    canvas.addEventListener('pointerdown', dev_map_pointer_down);
    canvas.addEventListener('pointermove', dev_map_pointer_move);
    canvas.addEventListener('pointerup', dev_map_pointer_up);
    canvas.addEventListener('pointercancel', dev_map_pointer_up);
    canvas.addEventListener('pointerleave', function () {
        dev_map.pointer = null;
        dev_map_status();
    });
    canvas.addEventListener('wheel', function (event) {
        event.preventDefault();
        const r = canvas.getBoundingClientRect();
        dev_map_zoom(Math.exp(-event.deltaY*0.0015), event.clientX - r.left, event.clientY - r.top);
    }, {passive: false});
    for (const type of ['keydown', 'keyup', 'pointerdown', 'wheel']) {
        root.addEventListener(type, function (event) {
            event.stopPropagation();
        });
    }
    root.addEventListener('keydown', dev_map_key);
    // a key with the focus outside the editor (on the page's body) is the editor's too
    addEventListener('keydown', function (event) {
        if (dev_map.open && !root.contains(event.target) && !event.target.closest?.('.dev-panel')) {
            event.stopImmediatePropagation();
            dev_map_key(event);
        }
    }, true);
    const buttons = {
        me_undo: () => dev_map_undo(true),
        me_redo: () => dev_map_undo(false),
        me_play: dev_map_play,
        me_export: dev_map_export,
        me_copy: dev_map_copy,
        me_reset: dev_map_reset,
        me_zoom_in: () => dev_map_zoom(1.6),
        me_zoom_out: () => dev_map_zoom(1/1.6),
        me_fit: function () {
            dev_map_fit();
            dev_map_draw();
        },
    };
    for (const [id, on_click] of Object.entries(buttons)) {
        document.getElementById(id).addEventListener('click', on_click);
    }
}

// The bar's tools: one for each kind this world and layout has, each in its colour
function dev_map_tools_fill()
{
    const tools = document.getElementById('me_tools');
    tools.replaceChildren();
    for (const [kind, v] of Object.entries(dev_map_kinds)) {
        if (!v.add || !map_kind_here(dev_map_list[kind])) {
            continue;
        }
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'me-btn';
        button.dataset.tool = kind;
        button.title = `Add a ${dev_map_label(kind).toLowerCase()}: click on the map where it goes`;
        const swatch = document.createElement('span');
        swatch.className = 'me-swatch';
        swatch.style.background = v.color;
        button.append(swatch, `+ ${dev_map_label(kind)}`);
        button.addEventListener('click', function () {
            dev_map.tool = (dev_map.tool === kind) ? null : kind;
            dev_map_panel();
        });
        tools.append(button);
    }
}

// What the panel calls a kind: Nova Forge's storms are flares
function dev_map_label(kind)
{
    return ((kind === 'storm') && (campaign.world === 6)) ? 'Flare' : dev_map_kinds[kind].label;
}

// The map made again by the game's generator with the edit as its map file, read back, and its rules checked
function dev_map_make()
{
    const t0 = performance.now();
    // a save's rocks would come back over the edit (store_world): the editor's map is made afresh
    delete campaign.maps[campaign.world];
    generate_map();
    // a lane has no portals: its world's start clears them (arcade_scroll_world_start)
    if (arcade.active && arcade_lane_kind()) {
        portals = [];
    }
    dev_map.shown = dev_map_read();
    dev_map.state = window.dev_state();
    dev_map.problems = map_rules_check(dev_map.state);
    if (dev_map.selected && !dev_map_item(dev_map.shown, dev_map.selected)) {
        dev_map.selected = null;
    }
    dev_map.made_ms = performance.now() - t0;
    dev_map.made_at = performance.now();
}

// The map the game made, as a map file holds it: every kind this world and layout has, to the metre
function dev_map_read()
{
    function at(v) {
        return {x: Math.round(v.x), y: Math.round(v.y)};
    }
    const out = {
        size: {w: world.w, h: world.h},
        station: at(station),
        fields: mining_fields.map(function (f) {
            const rocks = ore_nodes.filter(v => (v.field === f.id) && (v.type === 'ore') && (v.hp > 0));
            return {...at(f), rocks: rocks.map(v => ({...at(v), r: Math.round(v.r)}))};
        }),
        // a cache's middle: its supply lies 35 m east and 20 m north of it (base_generate_map)
        caches: pickups.filter(v => v.cache && (v.type !== 'artifact')).map(v => at({x: v.x - 35, y: v.y + 20})),
        holes: black_holes.map(v => ({...at(v), radius: Math.round(v.radius), core: Math.round(v.core)})),
        storms: world_zones.map(v => ({...at(v), r: Math.round(v.r)})),
        pylons: pylons.map(at),
        charge_fields: charge_fields.map(at),
        spires: spires.map(at),
        cliffs: cliffs.map(function (v) {
            const rubble = v.rubble.map(vv => ({...at(vv), r: Math.round(vv.r)}));
            return {...at(v.rock), r: Math.round(v.rock.r), fall: Math.round(v.fall*1000)/1000, rubble};
        }),
    };
    for (const kind of map_kinds) {
        if (!map_kind_here(kind)) {
            delete out[kind];
        }
    }
    return out;
}

// The thing `sel` of a map, or undefined
function dev_map_item(map, sel)
{
    if (sel.kind === 'station') {
        return map.station;
    }
    if (sel.kind === 'rock') {
        return map.fields?.[sel.i]?.rocks[sel.j];
    }
    return map[dev_map_list[sel.kind]]?.[sel.i];
}

// Every thing of the map shown that can be picked, in the order a click picks them, the small over the wide: {kind, i,
// j, x, y, r}, r what a click hits; the rocks only where they can be told apart on the screen, unless `all`
function dev_map_things(all = false)
{
    const map = dev_map.shown;
    const out = [{kind: 'station', i: 0, x: map.station.x, y: map.station.y, r: station_size/2}];
    function add(kind, list, r) {
        for (const [i, v] of (list || []).entries()) {
            out.push({kind, i, x: v.x, y: v.y, r: r(v)});
        }
    }
    add('pylon', map.pylons, () => 40);
    add('spire', map.spires, () => spire_r);
    add('cache', map.caches, () => 50);
    // rocks one by one only where their field is big enough on the screen to tell them apart; else the field
    if (all || (dev_map_field_r*dev_map.view.scale >= 24)) {
        for (const [i, f] of (map.fields || []).entries()) {
            for (const [j, v] of f.rocks.entries()) {
                out.push({kind: 'rock', i, j, x: v.x, y: v.y, r: v.r});
            }
        }
    }
    add('cliff', map.cliffs, v => v.r);
    add('hole', map.holes, v => v.core);
    add('charge_field', map.charge_fields, () => charge_field_r);
    add('field', map.fields, () => dev_map_field_r);
    add('storm', map.storms, v => v.r);
    return out;
}

// The thing under a point of the canvas (px), or null: of the things with a body there (a small one is hit within 8
// px of it) the nearest; of the wide ones that have none, a field, a storm or a charge field, the one first in
// dev_map_things, the nearest of its kind
function dev_map_hit(px, py)
{
    let best = null;
    let best_score = Infinity;
    const things = dev_map_things();
    const wide = ['charge_field', 'field', 'storm'];
    for (let k = 0, end = things.length; k < end; ++k) {
        const v = things[k];
        const p = dev_map_screen(v);
        const d = Math.hypot(p.x - px, p.y - py);
        if (d > Math.max(v.r*dev_map.view.scale, 8)) {
            continue;
        }
        const score = wide.includes(v.kind) ? 1e9*(wide.indexOf(v.kind) + 1) + d : d;
        if (score < best_score) {
            best = v;
            best_score = score;
        }
    }
    return best && {kind: best.kind, i: best.i, j: best.j};
}

// A point of the world on the canvas (px), and back
function dev_map_screen(v)
{
    const c = document.getElementById('me_map');
    const s = dev_map.view.scale;
    return {x: c.clientWidth/2 + (v.x - dev_map.view.x)*s, y: c.clientHeight/2 + (v.y - dev_map.view.y)*s};
}

function dev_map_world(px, py)
{
    const c = document.getElementById('me_map');
    const s = dev_map.view.scale;
    return {x: dev_map.view.x + (px - c.clientWidth/2)/s, y: dev_map.view.y + (py - c.clientHeight/2)/s};
}

// The whole map in view, 44 px of room round it (the zoom's buttons above it, the dev panel's tab beside it)
function dev_map_fit()
{
    const c = document.getElementById('me_map');
    dev_map.view.x = world.w/2;
    dev_map.view.y = world.h/2;
    dev_map.view.scale = Math.min(Math.max(1, c.clientWidth - 88)/world.w, Math.max(1, c.clientHeight - 88)/world.h);
}

// Zoom by a factor, the point under (px, py) held still (the view's middle without one), from a quarter of the whole
// map in view to 2 px a metre
function dev_map_zoom(factor, px, py)
{
    const c = document.getElementById('me_map');
    const x = px ?? c.clientWidth/2;
    const y = py ?? c.clientHeight/2;
    const before = dev_map_world(x, y);
    const fit = Math.min(Math.max(1, c.clientWidth)/world.w, Math.max(1, c.clientHeight)/world.h);
    dev_map.view.scale = clamp(dev_map.view.scale*factor, fit/4, 2);
    const after = dev_map_world(x, y);
    dev_map.view.x += before.x - after.x;
    dev_map.view.y += before.y - after.y;
    dev_map_draw();
}

// The canvas at the pixel ratio of the window, its size following its box
function dev_map_resize()
{
    const c = document.getElementById('me_map');
    const ratio = window.devicePixelRatio || 1;
    c.width = Math.max(1, Math.round(c.clientWidth*ratio));
    c.height = Math.max(1, Math.round(c.clientHeight*ratio));
    dev_map_draw();
}

// Before a change of a kind: the edit as it is goes on the undo list, and the edit (this browser's, else a copy of the
// packed file's, else none) takes in, whole, each list of the kind's group it does not hold yet, as the map shows it
function dev_map_change(kind)
{
    dev_map.undo.push(JSON.stringify(dev_map_edit()));
    dev_map.redo = [];
    const edit = dev_map_edit() ? clone(dev_map_edit()) : (dev_map_packed() || {size: {w: world.w, h: world.h}});
    for (const key of dev_map_kinds[kind].lists) {
        if (!(key in edit)) {
            edit[key] = clone(dev_map.shown[key]);
        }
    }
    return edit;
}

// After a change: the edit kept, the map made with it, the panel and the map drawn again
function dev_map_commit(edit)
{
    const kept = dev_map_edit_set(dev_map.name, edit);
    dev_map.message = kept ? '' : 'This browser keeps no storage: the edit lasts until the page reloads.';
    dev_map_make();
    dev_map_panel();
}

// Moves a thing of the edit by dx, dy, kept in the map: a field with its rocks, a cliff with its rubble
function dev_map_move(edit, sel, dx, dy)
{
    const v = dev_map_item(edit, sel);
    const x = clamp(v.x + dx, 0, world.w);
    const y = clamp(v.y + dy, 0, world.h);
    const mx = x - v.x;
    const my = y - v.y;
    const children = (sel.kind === 'field') ? v.rocks : (sel.kind === 'cliff') ? v.rubble : [];
    for (const vv of [v, ...children]) {
        vv.x = Math.round(vv.x + mx);
        vv.y = Math.round(vv.y + my);
    }
}

// Adds a thing of a kind at p, selected
function dev_map_add(kind, p)
{
    const edit = dev_map_change(kind);
    const x = Math.round(clamp(p.x, 0, world.w));
    const y = Math.round(clamp(p.y, 0, world.h));
    if (kind === 'rock') {
        // into the nearest field; with none, a field of its own
        const fields = edit.fields;
        let i = -1;
        for (const [k, v] of fields.entries()) {
            if ((i < 0) || (distance(v, p) < distance(fields[i], p))) {
                i = k;
            }
        }
        if (i < 0) {
            fields.push({x, y, rocks: []});
            i = 0;
        }
        fields[i].rocks.push({x, y, r: 32});
        dev_map.selected = {kind, i, j: fields[i].rocks.length - 1};
    }
    else {
        const list = edit[dev_map_list[kind]];
        list.push(dev_map_new(kind, x, y));
        dev_map.selected = {kind, i: list.length - 1};
    }
    dev_map.tool = null;
    dev_map_commit(edit);
}

// A new thing of a kind at x, y, as the generator makes one: a field of nine rocks, a hole of its layout's size, a
// cliff falling across the ring round the map's middle (on a lane, across the lane) with its rubble
function dev_map_new(kind, x, y)
{
    if (kind === 'field') {
        const rocks = [];
        for (let j = 0; j < dev_map_field_rocks; ++j) {
            const a = Math.random()*Math.PI*2;
            const d = 40 + Math.random()*210;
            const r = Math.round(22 + Math.random()*24);
            rocks.push({x: Math.round(x + Math.cos(a)*d), y: Math.round(y + Math.sin(a)*d), r});
        }
        return {x, y, rocks};
    }
    if (kind === 'hole') {
        return arcade.active ? {x, y, radius: 560, core: 56} : {x, y, radius: 1080, core: 58};
    }
    if (kind === 'storm') {
        return {x, y, r: 330};
    }
    if (kind === 'cliff') {
        const middle = arcade_lane_kind() ? dev_map_lane_axis({x, y}) : {x: world.w/2, y: world.h/2};
        const toward = Math.atan2(middle.y - y, middle.x - x);
        const fall = Math.round((arcade_lane_kind() ? toward : toward + Math.PI/2)*1000)/1000;
        const r = 130;
        const rubble = [];
        for (let k = 0; k < cliff_rubble; ++k) {
            const along = r + 40 + (k + Math.random()*0.6)*(cliff_reach - 80)/cliff_rubble;
            const half = r + cliff_spread*along/(r + cliff_reach);
            const side = (Math.random()*2 - 1)*half*0.8;
            const size = cliff_rubble_size[0] + Math.random()*(cliff_rubble_size[1] - cliff_rubble_size[0]);
            const px = Math.round(x + Math.cos(fall)*along - Math.sin(fall)*side);
            const py = Math.round(y + Math.sin(fall)*along + Math.cos(fall)*side);
            rubble.push({x: px, y: py, r: Math.round(size)});
        }
        return {x, y, r, fall, rubble};
    }
    return {x, y};
}

// The point of the lane's middle line nearest to p
function dev_map_lane_axis(p)
{
    const [a, b] = dev_map_lane();
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = clamp(((p.x - a.x)*dx + (p.y - a.y)*dy)/(dx*dx + dy*dy), 0, 1);
    return {x: a.x + dx*t, y: a.y + dy*t};
}

// A lane's start and end on the map, and half its width: the view across it at 100% on a 1280 × 720 window
function dev_map_lane()
{
    const a = arcade_lane_point(0, 0, world.w, world.h);
    const b = arcade_lane_point(arcade_shape().scroll, 0, world.w, world.h);
    return [a, b, arcade_lane_way().y ? 640 : 360];
}

// Deletes the thing selected (the station stays: it moves only); a field goes with its rocks
function dev_map_delete()
{
    const sel = dev_map.selected;
    if (!sel || (sel.kind === 'station')) {
        return;
    }
    const edit = dev_map_change(sel.kind);
    if (sel.kind === 'rock') {
        edit.fields[sel.i].rocks.splice(sel.j, 1);
    }
    else {
        edit[dev_map_list[sel.kind]].splice(sel.i, 1);
    }
    dev_map.selected = null;
    dev_map_commit(edit);
}

// Undo (back) or redo: the edit as it was before the last change, or after the one undone
function dev_map_undo(back)
{
    const from = back ? dev_map.undo : dev_map.redo;
    const to = back ? dev_map.redo : dev_map.undo;
    if (!from.length) {
        return;
    }
    to.push(JSON.stringify(dev_map_edit()));
    dev_map_commit(JSON.parse(from.pop()));
}

// Reset: this browser's edit forgotten, after a yes, back to the packed file or the generated map; Undo brings it back
function dev_map_reset()
{
    if (!dev_map_edit()) {
        return;
    }
    const to = map_files[dev_map.name] ? `the map file src/maps/${dev_map.name}.json` : 'the map the game generates';
    if (!confirm(`Forget this browser's edit of ${worlds[campaign.world].name}'s map and go back to ${to}?`)) {
        return;
    }
    dev_map.undo.push(JSON.stringify(dev_map_edit()));
    dev_map.redo = [];
    dev_map_commit(null);
}

// Play: the game, flying the edit at once, in this world and layout (dev.html with &map=edited)
function dev_map_play()
{
    const params = new URLSearchParams({world: world_slug(), map: 'edited'});
    if (arcade.active) {
        params.set('screen', 'arcade');
        if (arcade_scroll.kind !== 'free') {
            params.set('kind', arcade_scroll.kind);
        }
    }
    else {
        params.set('screen', 'flight');
    }
    location.href = `${location.pathname}?${params.toString()}`;
}

// The map file the editor gives: the edit, else the packed file; a list a line, each thing on a line of its own
function dev_map_file_text()
{
    const map = dev_map_edit() || map_files[dev_map.name];
    if (!map) {
        return null;
    }
    const lines = Object.entries(map).map(function ([key, value]) {
        if (!Array.isArray(value)) {
            return `    ${JSON.stringify(key)}: ${JSON.stringify(value)}`;
        }
        const items = value.map(v => `        ${JSON.stringify(v)}`);
        return `    ${JSON.stringify(key)}: [${items.length ? `\n${items.join(',\n')}\n    ` : ''}]`;
    });
    return `{\n${lines.join(',\n')}\n}\n`;
}

// Export: the map file downloaded as <world>-<layout>.json, to put in src/maps/
function dev_map_export()
{
    const text = dev_map_file_text();
    if (!text) {
        return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], {type: 'application/json'}));
    a.download = `${dev_map.name}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    dev_map.message = `Downloaded ${dev_map.name}.json: put it in src/maps/ and run bin/build, and the game flies it.`;
    dev_map_panel();
}

// Copy: the map file on the clipboard
function dev_map_copy()
{
    const text = dev_map_file_text();
    if (!text) {
        return;
    }
    function done(ok) {
        const copied = `Copied ${dev_map.name}.json: save it in src/maps/ and run bin/build.`;
        dev_map.message = ok ? copied : 'The clipboard said no: use Export.';
        dev_map_panel();
    }
    try {
        navigator.clipboard.writeText(text).then(() => done(true), () => done(false));
    }
    catch {
        done(false);
    }
}

// A key in the editor: Delete (or Backspace) deletes the thing selected, Ctrl+Z undoes, Ctrl+Shift+Z (or Ctrl+Y)
// redoes, Escape drops the tool or the selection, ` folds the dev panel; a key typed in a number is the number's
function dev_map_key(event)
{
    if (!dev_map.open) {
        return;
    }
    const typing = event.target.matches?.('input, select, textarea');
    const ctrl = event.ctrlKey || event.metaKey;
    if (ctrl && (event.code === 'KeyZ') && !typing) {
        event.preventDefault();
        dev_map_undo(!event.shiftKey);
    }
    else if (ctrl && (event.code === 'KeyY') && !typing) {
        event.preventDefault();
        dev_map_undo(false);
    }
    else if (['Delete', 'Backspace'].includes(event.key) && !typing) {
        event.preventDefault();
        dev_map_delete();
    }
    else if (event.key === 'Escape') {
        if (dev_map.tool) {
            dev_map.tool = null;
        }
        else {
            dev_map.selected = null;
        }
        dev_map_panel();
    }
    else if ((event.code === 'Backquote') && !typing && !event.repeat) {
        event.preventDefault();
        dev_panel_collapse_toggle();
    }
}

// A press on the map: with a tool, the thing added there; on a thing, it is selected and a drag would move it; on
// empty space, a drag pans (and a click without one drops the selection)
function dev_map_pointer_down(event)
{
    const canvas = event.currentTarget;
    canvas.focus();
    canvas.setPointerCapture(event.pointerId);
    const r = canvas.getBoundingClientRect();
    const px = event.clientX - r.left;
    const py = event.clientY - r.top;
    if (dev_map.tool) {
        dev_map_add(dev_map.tool, dev_map_world(px, py));
        return;
    }
    const hit = dev_map_hit(px, py);
    if (hit) {
        dev_map.selected = hit;
        dev_map_panel();
    }
    dev_map.drag = {sel: hit, px, py, last: dev_map_world(px, py), view: {...dev_map.view}, moved: false, edit: null};
}

function dev_map_pointer_move(event)
{
    const r = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - r.left;
    const py = event.clientY - r.top;
    dev_map.pointer = dev_map_world(px, py);
    const drag = dev_map.drag;
    if (!drag) {
        event.currentTarget.classList.toggle('me-over', !dev_map.tool && !!dev_map_hit(px, py));
        dev_map_status();
        return;
    }
    if (!drag.moved && (Math.hypot(px - drag.px, py - drag.py) < 4)) {
        return;
    }
    drag.moved = true;
    if (!drag.sel) {
        dev_map.view.x = drag.view.x - (px - drag.px)/dev_map.view.scale;
        dev_map.view.y = drag.view.y - (py - drag.py)/dev_map.view.scale;
        dev_map_draw();
        return;
    }
    // the thing follows the pointer: the edit takes it in on the first move, the map shown draws the edit's lists
    if (!drag.edit) {
        drag.edit = dev_map_change(drag.sel.kind);
    }
    const p = dev_map_world(px, py);
    dev_map_move(drag.edit, drag.sel, p.x - drag.last.x, p.y - drag.last.y);
    drag.last = p;
    // while making the map is quick, it is made as the thing moves, its rules with it
    if ((dev_map.made_ms < 40) && (performance.now() - dev_map.made_at > 120)) {
        dev_map.edits.set(dev_map.name, clone(drag.edit));
        dev_map_make();
        dev_map_panel();
    }
    for (const key of dev_map_kinds[drag.sel.kind].lists) {
        dev_map.shown[key] = drag.edit[key];
    }
    dev_map_draw();
}

function dev_map_pointer_up()
{
    const drag = dev_map.drag;
    dev_map.drag = null;
    if (!drag) {
        return;
    }
    if (drag.edit) {
        dev_map_commit(drag.edit);
    }
    else if (!drag.sel && !drag.moved) {
        dev_map.selected = null;
        dev_map_panel();
    }
}

// The places a problem names, to the metre, as a set of keys
function dev_map_bad_places()
{
    const out = new Set();
    for (const v of dev_map.problems) {
        for (const p of v.at) {
            out.add(`${p.x},${p.y}`);
        }
    }
    return out;
}

// Whether a thing at v is one a problem names
function dev_map_is_bad(bad, v)
{
    return bad.has(`${Math.round(v.x)},${Math.round(v.y)}`);
}

// The problems naming a thing at v
function dev_map_problems_at(v)
{
    const key = `${Math.round(v.x)},${Math.round(v.y)}`;
    return dev_map.problems.filter(vv => vv.at.some(vvv => `${vvv.x},${vvv.y}` === key));
}

// The side panel and the bar: what map is shown, the thing selected with its numbers, the problems; the tools and
// buttons as they stand
function dev_map_panel()
{
    const file = map_files[dev_map.name];
    const edit = dev_map_edit();
    const source = document.getElementById('me_source');
    source.replaceChildren();
    const name = document.createElement('b');
    if (edit) {
        name.textContent = 'Edited in this browser';
        const over = file ? `, over the map file src/maps/${dev_map.name}.json.` : ', over the generated map.';
        source.append(name, over, ' The game flies it with Play; Export it to src/maps/ to keep it.');
    }
    else if (file) {
        name.textContent = `Map file src/maps/${dev_map.name}.json`;
        source.append(name, ', as the game flies it.');
    }
    else {
        name.textContent = 'Generated';
        source.append(name, ' by the game\'s code: no map file. A change starts this browser\'s edit.');
    }
    for (const v of document.querySelectorAll('#me_tools [data-tool]')) {
        v.setAttribute('aria-pressed', String(v.dataset.tool === dev_map.tool));
    }
    document.getElementById('me_map').classList.toggle('me-adding', !!dev_map.tool);
    document.getElementById('me_undo').disabled = !dev_map.undo.length;
    document.getElementById('me_redo').disabled = !dev_map.redo.length;
    document.getElementById('me_reset').disabled = !edit;
    document.getElementById('me_export').disabled = !edit && !file;
    document.getElementById('me_copy').disabled = !edit && !file;
    dev_map_selected_fill();
    dev_map_problems_fill();
    const tool = dev_map.tool && dev_map_label(dev_map.tool).toLowerCase();
    const adding = tool && `Click on the map where the ${tool} goes; Escape drops the tool.`;
    const moving = 'Drag a thing to move it, empty space to pan; the wheel, + and − zoom; Delete deletes, Ctrl+Z '
        + 'undoes.';
    const hint = `${adding || moving} Export downloads ${dev_map.name}.json for src/maps/.`;
    document.getElementById('me_note').textContent = dev_map.message || hint;
    dev_map_draw();
}

// The thing selected: its kind, its place in metres and its sizes as numbers to type, what it breaks, Delete
function dev_map_selected_fill()
{
    const box = document.getElementById('me_selected');
    box.replaceChildren();
    const sel = dev_map.selected;
    const v = sel && dev_map_item(dev_map.shown, sel);
    if (!v) {
        const p = document.createElement('p');
        p.textContent = 'Nothing selected: click a thing on the map.';
        box.append(p);
        return;
    }
    const title = document.createElement('p');
    const label = document.createElement('b');
    const rock = `Rock ${sel.j + 1} of field ${sel.i + 1}`;
    const other = `${dev_map_label(sel.kind)} ${sel.i + 1}`;
    label.textContent = (sel.kind === 'station') ? 'Station' : (sel.kind === 'rock') ? rock : other;
    title.append(label, ` · ${dev_map_size_text(sel.kind, v)}`);
    box.append(title);
    const fields = document.createElement('div');
    fields.className = 'me-fields';
    const numbers = [['x', 'm'], ['y', 'm']];
    if (['rock', 'storm', 'cliff'].includes(sel.kind)) {
        numbers.push(['r', 'm']);
    }
    if (sel.kind === 'hole') {
        numbers.push(['radius', 'm'], ['core', 'm']);
    }
    if (sel.kind === 'cliff') {
        numbers.push(['fall', '°']);
    }
    for (const [key, unit] of numbers) {
        const id = `me_number_${key}`;
        const name = document.createElement('label');
        name.htmlFor = id;
        name.textContent = (key === 'r') ? 'radius' : key;
        const input = document.createElement('input');
        input.id = id;
        input.type = 'number';
        input.step = '1';
        input.value = String((key === 'fall') ? Math.round(v.fall*180/Math.PI) : v[key]);
        input.addEventListener('change', function () {
            dev_map_number_set(sel, key, Number(input.value));
        });
        const after = document.createElement('span');
        after.textContent = unit;
        fields.append(name, input, after);
    }
    box.append(fields);
    for (const problem of dev_map_problems_at(v)) {
        const p = document.createElement('p');
        p.className = 'me-bad';
        p.textContent = `${problem.rule}: ${problem.text}`;
        box.append(p);
    }
    if (sel.kind === 'station') {
        const p = document.createElement('p');
        p.className = 'me-note';
        p.textContent = 'It moves only. The gates, beacons, portals, storms, pylons and spires are placed round it '
            + 'unless edited.';
        box.append(p);
        return;
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'me-btn me-danger';
    remove.textContent = (sel.kind === 'field') ? `Delete the field and its ${v.rocks.length} rocks` : 'Delete';
    remove.addEventListener('click', dev_map_delete);
    box.append(remove);
}

// What the panel says of a thing's size: its body, and the reach it acts in
function dev_map_size_text(kind, v)
{
    switch (kind) {
    case 'station':
        return `hull ${station_size/2} m, docks within ${station_reach} m, shelter ${station_shelter} m`;
    case 'field':
        return `radius ${dev_map_field_r} m, ${v.rocks.length} rocks`;
    case 'hole':
        return `pulls within ${Math.round(gravity_reach(v))} m`;
    case 'pylon':
        return `strikes within ${pylon_reach} m`;
    case 'charge_field':
        return `radius ${charge_field_r} m`;
    case 'spire':
        return `body ${spire_r} m, pulls within ${spire_reach} m`;
    case 'cliff':
        return `falls ${cliff_reach} m, ${v.rubble.length} rubble`;
    case 'cache':
        return 'salvage and a supply';
    default:
        return `radius ${v.r} m`;
    }
}

// A number typed for the thing selected: its place (a field's rocks and a cliff's rubble go with it), a size, or a
// cliff's fall (its rubble turning with it)
function dev_map_number_set(sel, key, value)
{
    if (!Number.isFinite(value)) {
        dev_map_panel();
        return;
    }
    const edit = dev_map_change(sel.kind);
    const v = dev_map_item(edit, sel);
    if ((key === 'x') || (key === 'y')) {
        dev_map_move(edit, sel, (key === 'x') ? value - v.x : 0, (key === 'y') ? value - v.y : 0);
    }
    else if (key === 'fall') {
        const fall = Math.round(value*Math.PI/180*1000)/1000;
        const turn = fall - v.fall;
        for (const vv of v.rubble) {
            const dx = vv.x - v.x;
            const dy = vv.y - v.y;
            vv.x = Math.round(v.x + dx*Math.cos(turn) - dy*Math.sin(turn));
            vv.y = Math.round(v.y + dx*Math.sin(turn) + dy*Math.cos(turn));
        }
        v.fall = fall;
    }
    else {
        v[key] = Math.max(1, Math.round(value));
    }
    dev_map_commit(edit);
}

// The problems of the map, each its rule and what breaks it; a click shows where
function dev_map_problems_fill()
{
    const list = document.getElementById('me_problems');
    list.replaceChildren();
    document.getElementById('me_problems_title').textContent = `Problems: ${dev_map.problems.length}`;
    if (!dev_map.problems.length) {
        const li = document.createElement('li');
        li.className = 'me-none';
        li.textContent = 'Every placement rule holds (docs/placement.md).';
        list.append(li);
        return;
    }
    for (const problem of dev_map.problems) {
        const li = document.createElement('li');
        const rule = document.createElement('small');
        rule.textContent = problem.rule;
        li.append(rule, problem.text);
        li.addEventListener('click', function () {
            const p = problem.at[0];
            if (!p) {
                return;
            }
            dev_map.view.x = p.x;
            dev_map.view.y = p.y;
            const thing = dev_map_things().find(v => dev_map_problems_at(v).includes(problem));
            dev_map.selected = thing ? {kind: thing.kind, i: thing.i, j: thing.j} : dev_map.selected;
            dev_map_panel();
        });
        list.append(li);
    }
}

// The status line: the scale, and where the pointer is
function dev_map_status()
{
    const at = dev_map.pointer ? ` · x ${Math.round(dev_map.pointer.x)} y ${Math.round(dev_map.pointer.y)} m` : '';
    const m = 100/dev_map.view.scale;
    const scale = (m >= 1000) ? `${(m/1000).toFixed(m >= 10000 ? 0 : 1)} km` : `${Math.round(m)} m`;
    const size = `${(world.w/1000).toFixed(1)} × ${(world.h/1000).toFixed(1)} km`;
    document.getElementById('me_status').textContent = `100 px = ${scale} · ${size}${at}`;
}

// The map from above: the world's bounds, a lane's corridor, the storms, pulls and fields under the rest, then each
// thing with its reach; what breaks a rule red, the thing selected ringed white
function dev_map_draw()
{
    const c = document.getElementById('me_map');
    if (!dev_map.open || !dev_map.shown || !c.clientWidth) {
        return;
    }
    const ctx2 = c.getContext('2d');
    const ratio = c.width/c.clientWidth;
    ctx2.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx2.fillStyle = '#060912';
    ctx2.fillRect(0, 0, c.clientWidth, c.clientHeight);
    const map = dev_map.shown;
    const state = dev_map.state;
    const s = dev_map.view.scale;
    const bad = dev_map_bad_places();
    const corner = dev_map_screen({x: 0, y: 0});
    ctx2.fillStyle = '#0d1528';
    ctx2.fillRect(corner.x, corner.y, world.w*s, world.h*s);
    ctx2.strokeStyle = '#3a4a6b';
    ctx2.lineWidth = 1;
    ctx2.strokeRect(corner.x, corner.y, world.w*s, world.h*s);
    function circle(v, r, stroke, fill = null, dash = null, least = 0) {
        const p = dev_map_screen(v);
        ctx2.beginPath();
        ctx2.arc(p.x, p.y, Math.max(least, r*s), 0, Math.PI*2);
        if (fill) {
            ctx2.fillStyle = fill;
            ctx2.fill();
        }
        if (stroke) {
            ctx2.setLineDash(dash || []);
            ctx2.strokeStyle = stroke;
            ctx2.stroke();
            ctx2.setLineDash([]);
        }
    }
    function label(v, text, color, dy = 0) {
        if (s < 0.004) {
            return;
        }
        const p = dev_map_screen(v);
        ctx2.fillStyle = color;
        ctx2.font = '11px ui-sans-serif, system-ui, sans-serif';
        ctx2.textAlign = 'center';
        ctx2.fillText(text, p.x, p.y + dy);
    }
    // a lane's corridor: where the screen runs, the view across it at 100%
    if (arcade.active && arcade_lane_kind()) {
        const [a, b, half] = dev_map_lane();
        const pa = dev_map_screen(a);
        const pb = dev_map_screen(b);
        const ux = (b.y - a.y)/distance(a, b);
        const uy = -(b.x - a.x)/distance(a, b);
        ctx2.fillStyle = '#1d2a4a80';
        ctx2.beginPath();
        ctx2.moveTo(pa.x + ux*half*s, pa.y + uy*half*s);
        ctx2.lineTo(pb.x + ux*half*s, pb.y + uy*half*s);
        ctx2.lineTo(pb.x - ux*half*s, pb.y - uy*half*s);
        ctx2.lineTo(pa.x - ux*half*s, pa.y - uy*half*s);
        ctx2.closePath();
        ctx2.fill();
        ctx2.setLineDash([6, 6]);
        ctx2.strokeStyle = '#5b78b8';
        ctx2.beginPath();
        ctx2.moveTo(pa.x, pa.y);
        ctx2.lineTo(pb.x, pb.y);
        ctx2.stroke();
        ctx2.setLineDash([]);
        label(a, 'lane start', '#8fa6d8', half*s + 14);
        label(b, 'lane end · flagship', '#8fa6d8', half*s + 14);
    }
    for (const v of map.storms || []) {
        circle(v, v.r, dev_map_is_bad(bad, v) ? dev_map_bad : '#ffb347', '#ffb34722', null, 3);
    }
    for (const v of map.holes || []) {
        const red = dev_map_is_bad(bad, v);
        circle(v, gravity_reach(v), red ? dev_map_bad : '#ff5fb066', '#ff5fb00d', [4, 6]);
        circle(v, v.radius, red ? dev_map_bad : '#ff5fb0aa', null, [2, 4]);
        circle(v, v.core, red ? dev_map_bad : '#ff5fb0', '#000000', null, 3);
    }
    for (const v of map.charge_fields || []) {
        circle(v, charge_field_r, dev_map_is_bad(bad, v) ? dev_map_bad : charge_field_color, '#d98cff22', null, 2);
    }
    // the race courses (campaign): drawn faintly, made by the game round the map (race_course_make)
    for (const course of state.races || []) {
        if (!course) {
            continue;
        }
        const points = [course.start, ...course.rings].map(dev_map_screen);
        ctx2.strokeStyle = '#ffffff30';
        dev_map_path(ctx2, points);
        ctx2.stroke();
        for (const v of course.rings) {
            circle(v, course.r, dev_map_is_bad(bad, v) ? dev_map_bad : '#ffffff55');
        }
        const start = dev_map_is_bad(bad, course.start) ? dev_map_bad : '#ffffff55';
        circle(course.start, course.start_r, start, null, [3, 3]);
    }
    for (const v of state.debris) {
        circle(v, v.r, null, dev_map_is_bad(bad, v) ? dev_map_bad : '#7d879c', null, 1);
    }
    for (const f of map.fields || []) {
        circle(f, dev_map_field_r, dev_map_is_bad(bad, f) ? dev_map_bad : '#c9a22799', '#c9a2270f', [5, 4], 3);
        for (const v of f.rocks) {
            circle(v, v.r, null, dev_map_is_bad(bad, v) ? dev_map_bad : '#f0c45a', null, 1.2);
        }
    }
    for (const v of map.cliffs || []) {
        const red = dev_map_is_bad(bad, v);
        const ux = Math.cos(v.fall);
        const uy = Math.sin(v.fall);
        const end = v.r + cliff_reach;
        const far = v.r + cliff_spread;
        const corners = [[0, -v.r], [end, -far], [end, far], [0, v.r]];
        const zone = corners.map(vv => dev_map_screen({x: v.x + ux*vv[0] - uy*vv[1], y: v.y + uy*vv[0] + ux*vv[1]}));
        ctx2.fillStyle = '#ff8a3d1a';
        ctx2.strokeStyle = red ? dev_map_bad : '#ff8a3d80';
        dev_map_path(ctx2, zone);
        ctx2.closePath();
        ctx2.fill();
        ctx2.stroke();
        for (const vv of v.rubble) {
            circle(vv, vv.r, dev_map_is_bad(bad, vv) ? dev_map_bad : '#a8673d', null, [2, 2], 1);
        }
        circle(v, v.r, null, red ? dev_map_bad : cliff_colors.face, null, 3);
        circle(v, v.r, cliff_colors.rim, null, null, 3);
    }
    for (const v of map.caches || []) {
        const p = dev_map_screen(v);
        const d = Math.max(4, 45*s);
        ctx2.fillStyle = dev_map_is_bad(bad, v) ? dev_map_bad : '#57d6ff';
        ctx2.beginPath();
        ctx2.moveTo(p.x, p.y - d);
        ctx2.lineTo(p.x + d, p.y);
        ctx2.lineTo(p.x, p.y + d);
        ctx2.lineTo(p.x - d, p.y);
        ctx2.closePath();
        ctx2.fill();
    }
    for (const v of map.pylons || []) {
        const red = dev_map_is_bad(bad, v);
        circle(v, pylon_reach, red ? dev_map_bad : pylon_color, '#8d9cff14', null, 3);
        circle(v, 30, null, red ? dev_map_bad : '#dfeaff', null, 2.5);
    }
    for (const v of map.spires || []) {
        const red = dev_map_is_bad(bad, v);
        circle(v, spire_reach, red ? dev_map_bad : spire_color, '#ed97cf14', [6, 4], 3);
        circle(v, spire_r, null, red ? dev_map_bad : '#2b1630', null, 2.5);
        circle(v, spire_r, spire_color, null, null, 2.5);
    }
    // what the game places round the station and does not edit: the beacons, the combat zone, the portals, the gates
    for (const v of state.beacons) {
        circle(v, map_rules.scan, dev_map_is_bad(bad, v) ? dev_map_bad : '#9fe870', null, null, 2.5);
    }
    if (!arcade.active && state.combat_zone) {
        const zone = dev_map_is_bad(bad, state.combat_zone) ? dev_map_bad : '#ff6b6b88';
        circle(state.combat_zone, 600, zone, null, [8, 6], 4);
        label(state.combat_zone, 'combat zone', '#ff9b9b', 4);
    }
    for (const v of state.portals) {
        const pair = state.portals[v.destination];
        if (pair) {
            const a = dev_map_screen(v);
            const b = dev_map_screen(pair);
            ctx2.strokeStyle = '#ffffff18';
            ctx2.setLineDash([2, 6]);
            ctx2.beginPath();
            ctx2.moveTo(a.x, a.y);
            ctx2.lineTo(b.x, b.y);
            ctx2.stroke();
            ctx2.setLineDash([]);
        }
        circle(v, v.r + state.ship_radius, dev_map_is_bad(bad, v) ? dev_map_bad : '#c6b6ff', null, null, 3.5);
        label(v, `portal ${v.label}`, '#c6b6ff', -9);
    }
    for (const v of state.gates) {
        const color = dev_map_is_bad(bad, v) ? dev_map_bad : '#ffd36e';
        circle(v, state.gate_reach, color, null, [3, 3], 4);
        circle(v, v.r, color, null, null, 2.5);
        label(v, `gate to ${v.to}`, '#ffd36e', -10);
    }
    const red = dev_map_is_bad(bad, map.station);
    circle(map.station, station_shelter, red ? dev_map_bad : '#6cf8ec55', null, [6, 6], 6);
    circle(map.station, station_reach, red ? dev_map_bad : '#6cf8ec99', null, [3, 3], 5);
    circle(map.station, station_size/2, null, red ? dev_map_bad : '#6cf8ec', null, 4);
    label(map.station, arcade.active ? 'depot' : 'station', '#06222a', 4);
    dev_map_draw_selected(ctx2);
    dev_map_status();
}

// A path through points (px), begun
function dev_map_path(ctx2, points)
{
    ctx2.beginPath();
    for (const [i, p] of points.entries()) {
        if (i) {
            ctx2.lineTo(p.x, p.y);
        }
        else {
            ctx2.moveTo(p.x, p.y);
        }
    }
}

// The thing selected, ringed white past its body
function dev_map_draw_selected(ctx2)
{
    const sel = dev_map.selected;
    const v = sel && dev_map_item(dev_map.shown, sel);
    if (!v) {
        return;
    }
    const things = dev_map_things().filter(vv => (vv.kind === sel.kind) && (vv.i === sel.i));
    const thing = things.find(vv => vv.j === sel.j) || {r: v.r || 40};
    const p = dev_map_screen(v);
    ctx2.strokeStyle = dev_map_pick;
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    ctx2.arc(p.x, p.y, Math.max(9, thing.r*dev_map.view.scale + 5), 0, Math.PI*2);
    ctx2.stroke();
    ctx2.lineWidth = 1;
}

// On the dev page's Play: a word that the map flown is this browser's edit, not the game's; in the campaign your ship
// beside the station, as a world's arrival has it (the dev scene starts it in the map's middle, where the generated
// station stands)
function dev_map_play_note()
{
    if ((dev_map.source !== 'edited') || dev_map.open || !player || !dev_map_edit_get(map_file_name())) {
        return;
    }
    if (!arcade.active) {
        player.x = station.x + station_size/2 + 60;
        player.y = station.y;
        update_camera(0, true);
    }
    show_toast('EDITED MAP', `${map_file_name().toUpperCase()} · FROM THE MAP EDITOR · THIS BROWSER ONLY`, 5);
}
