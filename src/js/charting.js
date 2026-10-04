// Charting: what the maps show. Layers pick the kinds of things: the route, gates, mining, your structures, danger and
// contract targets. AUTO follows your task (on a mining step, fields and your structures; on a jump, the route, gates
// and danger), and the local map's switches set them by hand. Fog of war: each world is charted in cells, around the
// station at first and in a band along your path, and a survey robot's scan charts the area round its beacon; the maps
// leave out what lies in cells not charted yet. campaign.charts[world] keeps the charted cells, packed.
const map_layer_names = ['route', 'gates', 'mining', 'yours', 'danger', 'contracts'];
const map_layer_titles = {route: 'ROUTE', gates: 'GATES', mining: 'MINING', yours: 'YOURS', danger: 'DANGER', contracts: 'CONTRACTS'};
const map_layer_icons = {route: 'objective', gates: 'world-gate', mining: 'mining-field', yours: 'outpost', danger: 'raiders', contracts: 'beacon'};
// Cells are 250 m in a small world and larger in a big one, at most 160 across, so a vast world stays cheap
const chart_cell_min = 250;
const chart_cols_max = 160;
let chart_grid = null;
let map_auto_layers = new Set(map_layer_names);
let chart_version = 0;
let chart_packed_at = 0;
let minimap_ground = null;

// Whether a map shows a layer: by hand once a switch was used, else what your task needs
function map_layer(name)
{
    return campaign.map_layers ? !!campaign.map_layers[name] : map_auto_layers.has(name);
}

// The layers your current task needs, from the guide's next step
function map_layers_for_task()
{
    const c = guide_context();
    const kind = c.kind;
    if (['mining', 'trade'].includes(kind) || (kind === 'manual' && /MINING/.test(c.goal?.label || ''))) {
        return ['route', 'mining', 'yours'];
    }
    if (['jump', 'prepare'].includes(kind)) {
        return ['route', 'gates', 'danger'];
    }
    if (['survey', 'scan'].includes(kind)) {
        return ['route', 'contracts', 'danger'];
    }
    if (['hunt', 'boss', 'escort', 'defend', 'recover', 'elite'].includes(kind)) {
        return ['route', 'danger', 'contracts'];
    }
    return map_layer_names;
}

// A layer switch on the local map: the first one used turns AUTO off, keeping what AUTO showed
function map_layer_toggle(name)
{
    if (!campaign.map_layers) {
        campaign.map_layers = Object.fromEntries(map_layer_names.map(v => [v, map_auto_layers.has(v)]));
    }
    campaign.map_layers[name] = !campaign.map_layers[name];
}

function map_layers_auto()
{
    campaign.map_layers = null;
}

// The charted cells of the world you are in, unpacked from the save the first time they are asked for
function chart_cells()
{
    if (arcade.active) {
        return null;
    }
    const cell = Math.max(chart_cell_min, Math.ceil(Math.max(world.w, world.h)/chart_cols_max/50)*50);
    const cols = Math.ceil(world.w/cell);
    const rows = Math.ceil(world.h/cell);
    if (chart_grid && (chart_grid.world === campaign.world) && (chart_grid.cols === cols) && (chart_grid.rows === rows) && (chart_grid.campaign === campaign)) {
        return chart_grid;
    }
    chart_grid = {world: campaign.world, cell, cols, rows, campaign, cells: new Uint8Array(cols*rows), dirty: false, mask: null, mask_version: -1};
    // A save played before the fog of war knew about earlier trips: the worlds it had visited are charted whole, each
    // once, the first time it is opened; a new game starts dark
    if (!Array.isArray(campaign.charted_whole)) {
        const played = (campaign.xp > 0) || (campaign.completed > 0) || (campaign.visited.length > 1);
        campaign.charted_whole = played ? [...campaign.visited] : [];
    }
    campaign.charts = campaign.charts || {};
    const saved = campaign.charts[campaign.world];
    if (campaign.charted_whole.includes(campaign.world)) {
        chart_grid.cells.fill(1);
        chart_grid.dirty = true;
        campaign.charted_whole = campaign.charted_whole.filter(v => v !== campaign.world);
    }
    else if (saved && saved.startsWith(`${cols}:${rows}:`)) {
        const bytes = atob(saved.split(':')[2]);
        for (let i = 0; i < chart_grid.cells.length; ++i) {
            chart_grid.cells[i] = (bytes.charCodeAt(i >> 3) >> (i & 7)) & 1;
        }
    }
    else {
        chart_reveal(station, chart_home());
    }
    chart_version++;
    return chart_grid;
}

// Half the band charted along your path, and the area round the station and a scanned beacon: wider in a big world
function chart_band()
{
    return Math.max(750, (chart_grid?.cell || chart_cell_min)*1.6);
}

function chart_home()
{
    return Math.max(2500, (chart_grid?.cell || chart_cell_min)*3);
}

// Charts every cell within r of p
function chart_reveal(p, r)
{
    const g = chart_grid;
    if (!g) {
        return;
    }
    const c0 = Math.max(0, Math.floor((p.x - r)/g.cell));
    const c1 = Math.min(g.cols - 1, Math.floor((p.x + r)/g.cell));
    const r0 = Math.max(0, Math.floor((p.y - r)/g.cell));
    const r1 = Math.min(g.rows - 1, Math.floor((p.y + r)/g.cell));
    for (let row = r0; row <= r1; ++row) {
        for (let col = c0; col <= c1; ++col) {
            const i = row*g.cols + col;
            if (!g.cells[i] && (Math.hypot((col + 0.5)*g.cell - p.x, (row + 0.5)*g.cell - p.y) < r + g.cell*0.5)) {
                g.cells[i] = 1;
                g.dirty = true;
            }
        }
    }
}

// The chart into the save, as bits in base64 after its size
function chart_pack()
{
    const g = chart_grid;
    const bytes = new Uint8Array(Math.ceil(g.cells.length/8));
    for (let i = 0; i < g.cells.length; ++i) {
        bytes[i >> 3] |= g.cells[i] << (i & 7);
    }
    let text = '';
    for (const v of bytes) {
        text += String.fromCharCode(v);
    }
    campaign.charts = campaign.charts || {};
    campaign.charts[g.world] = `${g.cols}:${g.rows}:${btoa(text)}`;
}

// A chart charted since it was last packed goes into the save now; every save asks for it
function chart_flush()
{
    if (chart_grid?.dirty) {
        chart_pack();
        chart_packed_at = clock;
        chart_grid.dirty = false;
    }
}

// Whether a point of the world you are in is charted; everything is in the arcade
function charted(p)
{
    const g = chart_cells();
    if (!g) {
        return true;
    }
    const col = clamp(Math.floor(p.x/g.cell), 0, g.cols - 1);
    const row = clamp(Math.floor(p.y/g.cell), 0, g.rows - 1);
    return !!g.cells[row*g.cols + col];
}

// Every HUD tick: the band along your path is charted, the maps learn of it, and AUTO follows the task. The save is
// packed at most every two seconds; a local map waiting for its icons is drawn again once they are in.
function charting_tick()
{
    if (!player || arcade.active || !['playing', 'upgrade', 'navigation', 'paused'].includes(state)) {
        return;
    }
    const g = chart_cells();
    chart_reveal(player, chart_band());
    if (g.dirty) {
        chart_version++;
        if (clock - chart_packed_at > 2) {
            chart_flush();
        }
    }
    map_auto_layers = new Set(map_layers_for_task());
    if (chart_pending && (state === 'navigation') && (nav_tab === 'local')) {
        chart_pending = false;
        render_navigation();
    }
}

// The fog mask: one pixel a cell, opaque where it is not charted; made again when the chart changes
function chart_mask()
{
    const g = chart_cells();
    if (!g) {
        return null;
    }
    if (g.mask && (g.mask_version === chart_version)) {
        return g.mask;
    }
    g.mask = g.mask || document.createElement('canvas');
    g.mask.width = g.cols;
    g.mask.height = g.rows;
    const draw = g.mask.getContext('2d');
    const image = draw.createImageData(g.cols, g.rows);
    for (let i = 0; i < g.cells.length; ++i) {
        image.data[i*4 + 3] = g.cells[i] ? 0 : 255;
    }
    draw.putImageData(image, 0, 0);
    g.mask_version = chart_version;
    return g.mask;
}

// The local map's layer switches: AUTO, then one per layer with its icon and how many things it has, lit when the
// map shows it
function render_layer_switches(parent)
{
    const counts = map_layer_counts();
    const row = document.createElement('div');
    row.className = 'nav-tabs map-layers';
    const auto = document.createElement('button');
    auto.textContent = 'AUTO';
    auto.className = campaign.map_layers ? '' : 'selected';
    auto.title = 'Show what your current task needs';
    auto.addEventListener('click', function () {
        map_layers_auto();
        render_navigation();
    });
    row.append(auto);
    for (const name of map_layer_names) {
        const b = document.createElement('button');
        b.innerHTML = `${map_icon_html(map_layer_icons[name], 14)} ${map_layer_titles[name]} <span>${counts[name]}</span>`;
        b.className = map_layer(name) ? 'selected' : '';
        b.addEventListener('click', function () {
            map_layer_toggle(name);
            render_navigation();
        });
        row.append(b);
    }
    parent.append(row);
}

// A map icon (sprites/map/<name>) `size` across, centred at x, y, its accent painted `tint`; turned by angle from nose
// up. False while it loads: the map is drawn again when it has.
function map_icon(draw, name, x, y, size, tint = null, angle = 0, alpha = 1)
{
    const raster = sprite(`map/${name}`) && sprite_raster(`map/${name}`, tint, 64);
    if (!raster) {
        chart_pending = true;
        return false;
    }
    draw.save();
    draw.translate(x, y);
    draw.rotate(angle);
    draw.globalAlpha *= alpha;
    draw.drawImage(raster, -size/2, -size/2, size, size);
    draw.restore();
    return true;
}
let chart_pending = false;

// What a map can show, each with its layer, its icon, its tint, its label and where it is: what is charted, on the
// layers that are on (or on every layer)
function map_things(every_layer = false)
{
    const out = [];
    function add(layer, v, icon, tint, label, extra = {}) {
        if ((every_layer || map_layer(layer)) && charted(v)) {
            out.push({layer, x: v.x, y: v.y, icon, tint, label, ...extra});
        }
    }
    for (const v of black_holes) {
        add('danger', v, 'black-hole', null, 'BLACK HOLE · FATAL', {reach: gravity_reach(v), ring: '#ff7a3d'});
    }
    for (const v of world_zones) {
        add('danger', v, 'storm', (v.type === 'storm') ? null : '#9dff9b', (v.type === 'storm') ? 'ION STORM' : 'RADIATION', {reach: v.r, ring: (v.type === 'storm') ? '#a77bff' : '#ff9469'});
    }
    for (const field of mining_fields) {
        if (!ore_nodes.some(v => (v.hp > 0) && (v.field === field.id))) {
            continue;
        }
        const rich = ore_nodes.find(v => (v.hp > 0) && (v.field === field.id) && v.resource);
        add('mining', field, rich ? 'mining-field-rich' : 'mining-field', rich ? ore_color(rich) : null, `MINE ${field.id + 1} · ${field_reserves_text(field)}`, {reach: field.r, ring: '#e9b94966', target: {...field, label: `MINING FIELD ${field.id + 1}`}});
    }
    for (const v of structures_here()) {
        add('yours', v, (v.kind === 'outpost') ? 'outpost' : 'platform', null, (v.kind === 'outpost') ? `OUTPOST · ${v.store}/${outpost_store}` : 'DEFENCE PLATFORM');
    }
    const t = transport_prey();
    if (t) {
        add('yours', t, 'transport', null, `TRANSPORT · ${t.line.count}/${transport_hold}`, {angle: t.angle + Math.PI/2});
    }
    // the arcade draws no gates or beacons (physics_base_render_navigation_objects), so its map shows none
    for (const v of arcade.active ? [] : world_gates) {
        add('gates', v, 'world-gate', worlds[v.destination].accent, `${worlds[v.destination].name.toUpperCase()} · WORLD GATE`, {target: {...v, label: `WORLD GATE → ${worlds[v.destination].name}`}});
    }
    for (let i = 0; i < portals.length; ++i) {
        const v = portals[i];
        add('gates', v, 'jump-gate', v.color, v.label, {short: true, target: {...v, portal: i, label: `LOCAL PORTAL ${v.label}`}});
    }
    for (let i = 0; i < (arcade.active ? 0 : beacons.length); ++i) {
        add('contracts', beacons[i], 'beacon', null, `SCAN BEACON ${i + 1}`, {target: {...beacons[i], label: `SCAN BEACON ${i + 1}`}});
    }
    for (const v of enemies) {
        if (v.hp > 0) {
            add('danger', v, 'raiders', null, '', {small: true});
        }
    }
    return out;
}

// How many things each layer has on the map now, for its switch
function map_layer_counts()
{
    const out = Object.fromEntries(map_layer_names.map(v => [v, 0]));
    for (const v of map_things(true)) {
        out[v.layer] += v.small ? 0 : 1;
    }
    out.route = (guide_context().goal ? 1 : 0) + waypoints.length;
    return out;
}

// The charted ground and the fog over the rest, at the map's scale: the fog texture where the mask says not charted,
// its edge softened by scaling the mask up smoothly, and a faint cyan glow along it
function render_chart_ground(draw, b, sx, sy, w, h, grid)
{
    draw.fillStyle = '#0d1f3a';
    draw.fillRect(0, 0, w, h);
    if (grid) {
        draw.strokeStyle = '#3a5a8a26';
        draw.lineWidth = 1;
        for (let i = 0; i < w; i += grid) {
            draw.beginPath();
            draw.moveTo(i, 0);
            draw.lineTo(i, h);
            draw.stroke();
        }
        for (let i = 0; i < h; i += grid) {
            draw.beginPath();
            draw.moveTo(0, i);
            draw.lineTo(w, i);
            draw.stroke();
        }
    }
    const mask = chart_mask();
    if (!mask) {
        return;
    }
    const g = chart_grid;
    const fog = sprite('map/fog') && sprite_raster('map/fog', null, 256);
    if (!fog) {
        chart_pending = true;
    }
    // the part of the mask under the map, in cells
    const src = [b.x/g.cell, b.y/g.cell, b.w/g.cell, b.h/g.cell];
    const layer = document.createElement('canvas');
    layer.width = Math.ceil(w);
    layer.height = Math.ceil(h);
    const fill = layer.getContext('2d');
    fill.imageSmoothingEnabled = true;
    // the mask is blurred by about half a cell as it is scaled up, so the edge is a smooth curve at any scale
    const soft = Math.max(1.5, g.cell*sx*0.6);
    // the glow: the mask blurred further, in cyan, under the fog
    fill.filter = `blur(${soft + 2}px)`;
    fill.drawImage(mask, ...src, 0, 0, w, h);
    fill.filter = 'none';
    fill.globalCompositeOperation = 'source-in';
    fill.fillStyle = '#6cf8ec66';
    fill.fillRect(0, 0, w, h);
    fill.globalCompositeOperation = 'source-over';
    draw.drawImage(layer, 0, 0);
    fill.clearRect(0, 0, w, h);
    fill.fillStyle = fog ? fill.createPattern(fog, 'repeat') : '#060a14';
    fill.fillRect(0, 0, w, h);
    fill.globalCompositeOperation = 'destination-in';
    fill.filter = `blur(${soft}px)`;
    fill.drawImage(mask, ...src, 0, 0, w, h);
    fill.filter = 'none';
    draw.drawImage(layer, 0, 0);
}

// The route ahead in gold: the guide's path from your ship to the objective, its turning points, and your own
// waypoints
function render_chart_route(draw, point, icon_size, labels)
{
    if (!map_layer('route')) {
        return;
    }
    const c = guide_context();
    const you = point(player);
    draw.save();
    draw.strokeStyle = '#ffcc4d';
    draw.lineWidth = 2;
    draw.setLineDash([6, 6]);
    if (c.goal) {
        draw.beginPath();
        draw.moveTo(you.x, you.y);
        for (const v of guide_path) {
            const p = point(v);
            draw.lineTo(p.x, p.y);
        }
        const goal = point(c.goal);
        draw.lineTo(goal.x, goal.y);
        draw.stroke();
    }
    if (waypoints.length) {
        draw.beginPath();
        draw.moveTo(you.x, you.y);
        for (const v of waypoints) {
            const p = point(v);
            draw.lineTo(p.x, p.y);
        }
        draw.stroke();
    }
    draw.restore();
    for (const v of guide_path.slice(0, -1)) {
        const p = point(v);
        map_icon(draw, 'waypoint', p.x, p.y, icon_size*0.6);
    }
    for (const v of waypoints) {
        const p = point(v);
        map_icon(draw, 'waypoint', p.x, p.y, icon_size*0.6);
    }
    if (c.goal) {
        const p = point(c.goal);
        map_icon(draw, 'objective', p.x, p.y, icon_size*1.1);
        labels?.(c.goal, 'OBJECTIVE', '#ffcc4d', -icon_size);
    }
}

const map_label_colors = {danger: '#ff8a6a', mining: '#e9c37a', gates: '#9dff9b', yours: '#6cf8ec', contracts: '#7be08a'};

// The local map: the charted ground and the fog, what the layers show with their icons and labels, the route, your
// ship, the view, a scale and how much of the world is charted
function render_chart_local(map)
{
    const draw = map.getContext('2d');
    const b = local_map_bounds();
    local_chart_bounds = b;
    const sx = 960/b.w;
    const sy = 620/b.h;
    const placed = [];
    function point(v) {
        return {x: (v.x - b.x)*sx, y: (v.y - b.y)*sy};
    }
    // a label below or above its thing, moved along until it overlaps no other
    function label(thing, text, color, dy = 22) {
        const p = point(thing);
        if ((p.x < 0) || (p.x > 960) || (p.y < 0) || (p.y > 620)) {
            return;
        }
        draw.font = 'bold 11px ui-monospace,monospace';
        draw.textAlign = 'center';
        const width = draw.measureText(text).width + 10;
        const x = clamp(p.x, width/2 + 3, 960 - width/2 - 3);
        let y = clamp(p.y + dy, 16, 614);
        for (let i = 0; i < 7; ++i) {
            const candidate = clamp(p.y + dy + ((i % 2) ? -1 : 1)*Math.ceil(i/2)*18, 16, 614);
            const box = {x: x - width/2, y: candidate - 12, w: width, h: 16};
            if (!placed.some(v => (box.x < v.x + v.w + 4) && (box.x + box.w + 4 > v.x) && (box.y < v.y + v.h + 3) && (box.y + box.h + 3 > v.y))) {
                y = candidate;
                break;
            }
        }
        placed.push({x: x - width/2, y: y - 12, w: width, h: 16});
        draw.fillStyle = '#060c18cc';
        draw.fillRect(x - width/2, y - 12, width, 16);
        draw.fillStyle = color;
        draw.fillText(text, x, y);
    }
    render_chart_ground(draw, b, sx, sy, 960, 620, 80);
    const things = map_things();
    draw.save();
    draw.setLineDash([5, 5]);
    for (const thing of things.filter(v => v.reach)) {
        const p = point(thing);
        draw.strokeStyle = thing.ring;
        draw.fillStyle = color_with_alpha(thing.ring.slice(0, 7), 0.07);
        draw.beginPath();
        draw.ellipse(p.x, p.y, Math.max(8, thing.reach*sx), Math.max(8, thing.reach*sy), 0, 0, Math.PI*2);
        draw.fill();
        draw.stroke();
    }
    draw.restore();
    const home = point(station);
    map_icon(draw, 'station', home.x, home.y, 32);
    label(station, `${worlds[campaign.world].station.toUpperCase()} · STATION`, cyan, 26);
    for (const v of things) {
        const p = point(v);
        if ((p.x < -20) || (p.x > 980) || (p.y < -20) || (p.y > 640)) {
            continue;
        }
        map_icon(draw, v.icon, p.x, p.y, v.small ? 14 : 28, v.tint, v.angle || 0);
        if (v.label) {
            label(v, v.label, v.short ? (v.tint || cyan) : map_label_colors[v.layer], v.short ? 20 : 24);
        }
    }
    render_chart_route(draw, point, 28, label);
    const you = point(player);
    map_icon(draw, 'you', you.x, you.y, 30, null, player.angle + Math.PI/2);
    label(player, 'YOU', '#e2fffc', -22);
    draw.strokeStyle = '#6cf8ec44';
    draw.setLineDash([]);
    draw.strokeRect((camera.x - b.x)*sx, (camera.y - b.y)*sy, (W/zoom)*sx, (H/zoom)*sy);
    // a scale bar of one kilometre, and how much is charted
    draw.fillStyle = '#9ba8c5';
    draw.strokeStyle = '#9ba8c5';
    draw.font = '10px ui-monospace,monospace';
    draw.textAlign = 'left';
    draw.beginPath();
    draw.moveTo(16, 604);
    draw.lineTo(16 + 1000*sx, 604);
    draw.stroke();
    draw.fillText('1 KM', 16, 596);
    const g = chart_cells();
    if (g) {
        const share = Math.round((g.cells.reduce((n, v) => n + v, 0)/g.cells.length)*100);
        draw.textAlign = 'right';
        draw.fillText(`CHARTED ${share}% · X ${Math.round(player.x)} Y ${Math.round(player.y)}`, 944, 604);
    }
}

// The minimap, in its box in the HUD (screen px): the world name, the whole world charted and in fog, what the layers show as small icons, the route,
// your ship, the view, and the distance to the objective
function render_minimap()
{
    if (!player || !['playing', 'paused', 'inventory', 'upgrade', 'victory'].includes(state)) {
        return;
    }
    const box = hud_layout.minimap;
    if (!box) {
        return;
    }
    const x = box.left + 5;
    const y = box.top + 5;
    const w = Math.round(box.width - 10);
    const h = Math.round(box.height - 10);
    const top = 16;
    const mh = h - top;
    const sx = w/world.w;
    const sy = mh/world.h;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#060a14ee';
    ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
    ctx.strokeStyle = '#6cf8ec33';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 5, y - 5, w + 10, h + 10);
    ctx.font = 'bold 9px ui-monospace,monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = cyan;
    ctx.fillText(worlds[campaign.world].name.toUpperCase(), x, y + 7);
    // the ground is drawn again only when the chart or the size changes
    const fog_ready = !!(sprite('map/fog') && sprite_raster('map/fog', null, 256));
    const key = `${campaign.world}:${w}:${mh}:${world.w}:${world.h}:${fog_ready}`;
    const stale = !minimap_ground || (minimap_ground.key !== key) || ((minimap_ground.version !== chart_version) && (time - minimap_ground.at > 1));
    if (stale) {
        const canvas = document.createElement('canvas');
        canvas.width = w*2;
        canvas.height = mh*2;
        const draw = canvas.getContext('2d');
        draw.scale(2, 2);
        render_chart_ground(draw, {x: 0, y: 0, w: world.w, h: world.h}, sx, sy, w, mh, 0);
        minimap_ground = {key, canvas, version: chart_version, at: time};
    }
    ctx.save();
    ctx.translate(x, y + top);
    ctx.beginPath();
    ctx.rect(0, 0, w, mh);
    ctx.clip();
    ctx.drawImage(minimap_ground.canvas, 0, 0, w, mh);
    function point(v) {
        return {x: v.x*sx, y: v.y*sy};
    }
    const home = point(station);
    map_icon(ctx, 'station', home.x, home.y, 11);
    for (const v of map_things()) {
        const p = point(v);
        if (v.reach && (v.layer === 'danger')) {
            ctx.strokeStyle = v.ring;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(4, v.reach*sx), 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        map_icon(ctx, v.icon, p.x, p.y, v.small ? 6 : 10, v.tint, v.angle || 0);
        if (v.short) {
            ctx.font = 'bold 7px ui-monospace,monospace';
            ctx.textAlign = 'left';
            ctx.fillStyle = v.tint || cyan;
            ctx.fillText(v.label, p.x + 5, p.y + 3);
        }
    }
    render_chart_route(ctx, point, 10, null);
    const you = point(player);
    map_icon(ctx, 'you', you.x, you.y, 12, null, player.angle + Math.PI/2);
    ctx.strokeStyle = '#6cf8ec55';
    ctx.strokeRect(camera.x*sx, camera.y*sy, (W/zoom)*sx, (H/zoom)*sy);
    ctx.restore();
    const goal = guide_context().goal;
    if (goal) {
        ctx.font = 'bold 9px ui-monospace,monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffcc4d';
        ctx.fillText(`◆ ${(distance(player, goal)/1000).toFixed(1)} KM`, x + 3, y + h - 4);
    }
    ctx.restore();
}

// A map icon as an <img> for the page, `size` px across
function map_icon_html(name, size)
{
    const text = sprite_svgs.map?.[name];
    return text ? `<img class="map-icon" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}" width="${size}" height="${size}" alt="">` : '';
}

// The legend beside the local map: each layer's things with their icons, dimmed when the layer is off, and the two
// chart states
function render_map_legend()
{
    const groups = [
        ['route', [['you', 'You'], ['waypoint', 'Route point'], ['objective', 'Objective']]],
        ['gates', [['world-gate', 'World gate'], ['jump-gate', 'Jump gate']]],
        ['mining', [['mining-field', 'Ore field'], ['mining-field-rich', 'Rich field']]],
        ['yours', [['station', 'Station'], ['outpost', 'Outpost'], ['platform', 'Defense platform'], ['transport', 'Transport']]],
        ['danger', [['black-hole', 'Black hole'], ['storm', 'Storm / radiation'], ['raiders', 'Raiders seen']]],
        ['contracts', [['beacon', 'Scan beacon']]],
    ];
    const out = document.createElement('div');
    out.className = 'map-legend';
    let html = '';
    for (const [layer, items] of groups) {
        html += `<div class="${map_layer(layer) ? '' : 'off'}"><b>${map_layer_titles[layer]}</b>`;
        for (const [icon, text] of items) {
            html += `<span>${map_icon_html(icon, 14)} ${text}</span>`;
        }
        html += '</div>';
    }
    html += '<div><b>CHART</b><span><i class="charted"></i> Charted</span><span><i class="fog"></i> Not yet seen</span></div>';
    out.innerHTML = html;
    return out;
}
