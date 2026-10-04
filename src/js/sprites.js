// Sprites: the SVGs of src/sprites/, packed into sprite_svgs by bin/build. Ships come in two sets, 3d and flat, picked
// with the sprites button; weapons/ holds the turrets and the missile, drones/ the orbit, builder and survey drones,
// structures/ what the builder builds, pickups/ the loot of every world, worlds/<world>/ a world's objects. A ship is nose up on a 256 canvas, its longest side 228 units; an anchors layer marks flames
// (lines from the nozzle, as long as a full-thrust flame) and points (turrets, muzzles, berths, beam).
const sprite_cache = new Map();
// How big things are drawn, in game units, in one place so the proportions are tuned together: ship classes by
// length, from the 42-unit interceptor to the 104-unit cruiser; raiders and flagships by their radius; the rest
// across. The hit radii stay as they are; a ship is drawn a little larger than it is hit.
// Every ship's drawn length in metres, on one scale with the station (station_size): fighters 40-50, the warships up to
// 120, a flagship 300, the haulers 340-400. Raiders and flagships are a factor of their hit radius.
const sprite_sizes = {
    ships: {interceptor: 40, scout: 46, courier: 56, miner: 72, gunship: 86, cruiser: 120},
    raider: 2.9,
    flagship: 3.53,
    freighter: 400,
    transport: 340,
    pickup: 15,
};
const sprite_span = 228;
const sprite_sets = ['3d', 'flat'];
let sprite_set = '3d';
try {
    const saved = localStorage.getItem('pulse_drift_sprites');
    if (sprite_sets.includes(saved)) {
        sprite_set = saved;
    }
}
catch {
}

function sprite_set_toggle()
{
    sprite_set = sprite_sets[(sprite_sets.indexOf(sprite_set) + 1) % sprite_sets.length];
    try {
        localStorage.setItem('pulse_drift_sprites', sprite_set);
    }
    catch {
    }
    performance_render_dirty = true;
    if ((state === 'upgrade') && (station_tab === 'hangar')) {
        render_station();
    }
}

// The parsed drawing, its anchors as fractions of the canvas from its centre, and its rasters; null for a name with
// no file. A plain name is a ship of the chosen set; a path (weapons/turret-ion, worlds/haven/station) is that file.
// Ships, turrets, the missile and drones point their nose up and are turned to +x; the rest keep their orientation.
function sprite(name)
{
    const key = name.includes('/') ? name : `${sprite_set}:${name}`;
    if (sprite_cache.has(key)) {
        return sprite_cache.get(key);
    }
    const text = name.includes('/') ? name.split('/').reduce((v, k) => v?.[k], sprite_svgs) : sprite_svgs[sprite_set][name];
    if (typeof text !== 'string') {
        sprite_cache.set(key, null);
        return null;
    }
    const svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
    // A wide drawing (the 512 × 128 comet) is centred on a square canvas as wide as it is
    const [left, top, w, h] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const box = Math.max(w, h);
    if (w !== h) {
        svg.setAttribute('viewBox', `${left - (box - w)/2} ${top - (box - h)/2} ${box} ${box}`);
    }
    const turned = !name.includes('/') || /^(weapons|drones)\//.test(name);
    // A drawing's point as a fraction of the canvas from its centre, in the game's frame
    function at(x, y) {
        const cx = left + w/2;
        const cy = top + h/2;
        return turned ? {x: (cy - y)/box, y: (x - cx)/box} : {x: (x - cx)/box, y: (y - cy)/box};
    }
    const flames = [];
    const points = {};
    const anchors = svg.querySelector('#anchors');
    for (const v of anchors ? [...anchors.children] : []) {
        function n(name) {
            return Number(v.getAttribute(name));
        }
        if (v.tagName === 'line') {
            const a = at(n('x1'), n('y1'));
            const b = at(n('x2'), n('y2'));
            flames.push({kind: v.id.replace(/^flame-|-\d+$/g, ''), x: a.x, y: a.y, dx: b.x - a.x, dy: b.y - a.y, width: n('stroke-width')/box});
        }
        else {
            points[v.id] = {...at(n('cx'), n('cy')), r: n('r')/box};
        }
    }
    anchors?.remove();
    const out = {svg, box, turned, flames, points, spin: !!svg.querySelector('#spin'), rasters: new Map()};
    sprite_cache.set(key, out);
    return out;
}

// The anchors of a ship drawn `length` game units long, in game units: flames by kind, and the points
function sprite_anchors(name, length)
{
    return sprite_anchors_box(name, (length*256)/sprite_span);
}

// The anchors of a sprite whose canvas is drawn `size` game units wide
function sprite_anchors_box(name, size)
{
    const v = sprite(name);
    if (!v) {
        return null;
    }
    const flames = {main: [], reverse: [], side: []};
    for (const f of v.flames) {
        flames[f.kind]?.push({x: f.x*size, y: f.y*size, dx: f.dx*size, dy: f.dy*size, width: f.width*size});
    }
    const points = {};
    for (const [id, p] of Object.entries(v.points)) {
        points[id] = {x: p.x*size, y: p.y*size, r: p.r*size};
    }
    return {flames, points};
}

// A raster of the drawing, with the accent painted `color` (null keeps the drawing's own); part 'body' is all but
// the spin layer, 'spin' the spin layer alone; null while it loads
function sprite_raster(name, color, px, part = 'body')
{
    const v = sprite(name);
    if (!v) {
        return null;
    }
    const key = `${color || ''}:${px}:${part}`;
    if (v.rasters.has(key)) {
        return v.rasters.get(key).ready ? v.rasters.get(key).canvas : null;
    }
    const svg = v.svg.cloneNode(true);
    for (const id of (part === 'spin') ? ['base', 'hull', 'accent'] : ['spin']) {
        svg.querySelector(`#${id}`)?.remove();
    }
    // A 3D drawing shades its accent with a gradient of three stops; a flat one fills each shape
    if (color && svg.querySelector('#accent-base')) {
        svg.querySelector('#accent-light').setAttribute('stop-color', color_mix(color, '#ffffff', 0.45));
        svg.querySelector('#accent-base').setAttribute('stop-color', color);
        svg.querySelector('#accent-dark').setAttribute('stop-color', color_mix(color, '#000000', 0.4));
    }
    else if (color) {
        for (const shape of svg.querySelectorAll('#accent > *')) {
            shape.setAttribute('fill', color);
        }
    }
    const raster = {ready: false, canvas: document.createElement('canvas')};
    raster.canvas.width = px;
    raster.canvas.height = px;
    v.rasters.set(key, raster);
    const image = new Image();
    image.onload = function () {
        const draw = raster.canvas.getContext('2d');
        draw.translate(px/2, px/2);
        if (v.turned) {
            draw.rotate(Math.PI/2);
        }
        draw.drawImage(image, -px/2, -px/2, px, px);
        raster.ready = true;
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
    return null;
}

// Two #rrggbb colours mixed, t of the way from a to b
function color_mix(a, b, t)
{
    const parts = [0, 1, 2].map(v => Math.round(channel(a, v) + (channel(b, v) - channel(a, v))*t).toString(16).padStart(2, '0'));
    return `#${parts.join('')}`;
    function channel(color, i) {
        return parseInt(color.slice(1 + i*2, 3 + i*2), 16);
    }
}

// Draws the ship `length` game units long at x, y, turned to angle; false while it is not ready, so the caller
// draws its own fallback
function sprite_draw(name, color, length, x, y, angle, alpha = 1)
{
    return sprite_draw_box(name, color, (length*256)/sprite_span, x, y, angle, alpha);
}

// Draws a sprite's canvas `size` game units wide centred at x, y, turned to angle; its spin layer, if it has one,
// turned by `spin` more. False while it is not ready.
function sprite_draw_box(name, color, size, x, y, angle, alpha = 1, spin = 0, draw = ctx)
{
    const v = sprite(name);
    if (!v) {
        return false;
    }
    const t = draw.getTransform();
    const px = Math.min(v.box*2, 1024, Math.max(32, 2**Math.ceil(Math.log2(size*Math.hypot(t.a, t.b)*1.5))));
    const raster = sprite_raster(name, color, px);
    const ring = v.spin ? sprite_raster(name, color, px, 'spin') : null;
    if (!raster || (v.spin && !ring)) {
        return false;
    }
    draw.save();
    draw.translate(x, y);
    draw.rotate(angle);
    draw.globalAlpha = alpha;
    draw.drawImage(raster, -size/2, -size/2, size, size);
    if (ring) {
        draw.rotate(spin);
        draw.drawImage(ring, -size/2, -size/2, size, size);
    }
    draw.restore();
    return true;
}

// Flames along a sprite's anchors of one kind, on `draw` in the ship's frame (the caller has turned the context):
// each as long as its anchor times `power`, as wide as its nozzle
function sprite_flames(draw, flames, power, color, flicker = 0)
{
    for (const f of flames) {
        const length = Math.hypot(f.dx, f.dy);
        if ((length*power < 0.5) || (length === 0)) {
            continue;
        }
        const reach = length*power*(1 + flicker);
        draw.save();
        draw.translate(f.x, f.y);
        draw.rotate(Math.atan2(f.dy, f.dx));
        const g = draw.createLinearGradient(0, 0, reach, 0);
        g.addColorStop(0, '#f1faffee');
        g.addColorStop(0.25, color_with_alpha(color, 0.75));
        g.addColorStop(0.7, color_with_alpha(color, 0.25));
        g.addColorStop(1, color_with_alpha(color, 0));
        draw.fillStyle = g;
        const r = f.width/2;
        draw.beginPath();
        draw.moveTo(0, -r);
        draw.bezierCurveTo(reach*0.2, -r, reach*0.7, -r*0.35, reach, 0);
        draw.bezierCurveTo(reach*0.7, r*0.35, reach*0.2, r, 0, r);
        draw.closePath();
        draw.fill();
        draw.restore();
    }
}

// The current world's drawing of an object (worlds/haven/station), or null where the world has none yet, so the
// caller draws today's look; the wireframe view never uses them
function world_art(name)
{
    if (view_mode === 'wireframe') {
        return null;
    }
    const path = `worlds/${world_slug()}/${name}`;
    return sprite(path) ? path : null;
}

// A world's name as a file name, the current world's by default: haven, ion-reach
function world_slug(id = campaign.world)
{
    return worlds[id].name.toLowerCase().replace(/\s+/g, '-');
}

// The sprite of a player ship class, and its length: the size follows the class's radius
function ship_sprite(v)
{
    return {name: `ship-${v.id}`, length: sprite_sizes.ships[v.id] || v.radius*2.8};
}

// The sprite of a raider: its type, elite or not; the flagship of the world it serves
function enemy_sprite(enemy)
{
    if (enemy.type === 'boss') {
        const name = `flagship-${world_slug()}`;
        return {name: sprite(name) ? name : 'flagship', length: enemy.r*sprite_sizes.flagship};
    }
    return {name: `enemy-${enemy.type}${enemy.elite ? '-elite' : ''}`, length: enemy.r*sprite_sizes.raider};
}

// The radius of the rings around your ship (shield, invincibility, pulse ready): clear of its hull in the rendered
// view, as before in the wireframe one
function ship_halo()
{
    return (view_mode === 'wireframe') ? 26 : Math.max(26, ship_sprite(current_ship()).length*0.58);
}
