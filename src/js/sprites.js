// Sprites: the SVGs of src/sprites/, packed into sprite_svgs by bin/build. Ships are in 3d/; weapons/ holds the turrets and the missile, drones/ the orbit, builder and survey drones,
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
// Settings → Ships: 'drawn', the game's own drawings, or 'painted', the pictures of the Nebula Strike prototype in their
// place (painted/): a trial of how they look in flight
let sprite_art = 'drawn';
try {
    sprite_art = (localStorage.getItem('pulse_drift_art') === 'painted') ? 'painted' : 'drawn';
}
catch {
}

// The parsed drawing, its anchors as fractions of the canvas from its centre, and its rasters; null for a name with
// no file. A plain name is a ship of 3d/; a path (weapons/turret-ion, worlds/haven/station) is that file.
// Ships, turrets, the missile and drones point their nose up and are turned to +x; the rest keep their orientation.
function sprite(name)
{
    // a plain name has no slash and a path has one, so the name is the key as it is: no string built per call
    const cached = sprite_cache.get(name);
    if (cached !== undefined) {
        return cached;
    }
    const text = name.includes('/') ? name.split('/').reduce((v, k) => v?.[k], sprite_svgs) : sprite_svgs['3d'][name];
    if (typeof text !== 'string') {
        sprite_cache.set(name, null);
        return null;
    }
    const svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
    // A wide drawing (the 512 × 128 comet) is centred on a square canvas as wide as it is
    const [left, top, w, h] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const box = Math.max(w, h);
    if (w !== h) {
        svg.setAttribute('viewBox', `${left - (box - w)/2} ${top - (box - h)/2} ${box} ${box}`);
    }
    const turned = !name.includes('/') || /^(weapons|drones|painted\/ships)\//.test(name);
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
    sprite_cache.set(name, out);
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
    // a painted picture is drawn in the place of the drawing; its anchors, turrets and size stay the drawing's
    const painted = (sprite_art === 'painted') && (part === 'body') && sprite_painted(name);
    if (painted) {
        return sprite_raster(painted, null, px);
    }
    const v = sprite(name);
    if (!v) {
        return null;
    }
    // colour, then part, then size: maps looked up without building a key string each frame
    let rasters_by_part = v.rasters.get(color || '');
    if (!rasters_by_part) {
        rasters_by_part = new Map();
        v.rasters.set(color || '', rasters_by_part);
    }
    let raster_by_px = rasters_by_part.get(part);
    if (!raster_by_px) {
        raster_by_px = new Map();
        rasters_by_part.set(part, raster_by_px);
    }
    const found = raster_by_px.get(px);
    if (found) {
        return found.ready ? found.canvas : null;
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
    raster_by_px.set(px, raster);
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

// The painted picture drawn for a drawing while Settings → Ships is Painted, or null for one with none: every player
// ship, every flagship, the raiders by their part (the heavy ones and every elite red, the gunners violet, the light
// ones green) and a world's plain asteroids (the rich ones keep their veins)
function sprite_painted(name)
{
    if (name.startsWith('ship-')) {
        return 'painted/ships/player';
    }
    if (name.startsWith('flagship')) {
        return 'painted/ships/flagship';
    }
    if (name.startsWith('enemy-')) {
        if (name.endsWith('-elite') || /^enemy-(tank|bulwark|carrier)$/.test(name)) {
            return 'painted/ships/raider-red';
        }
        return /^enemy-(shooter|sniper|lancer|minelayer)$/.test(name) ? 'painted/ships/raider-violet' : 'painted/ships/raider-green';
    }
    return /^worlds\/[^/]+\/asteroid-\d+$/.test(name) ? 'painted/rock' : null;
}

// Settings → Ships: 'drawn' or 'painted', kept for the next visit
function sprite_art_set(mode)
{
    sprite_art = (mode === 'painted') ? 'painted' : 'drawn';
    try {
        localStorage.setItem('pulse_drift_art', sprite_art);
    }
    catch {
    }
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
    const px = sprite_raster_px(v, size, t);
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

// The raster's side for a sprite drawn `size` game units wide under the transform t: a power of two half again as
// many pixels as it covers on the screen
function sprite_raster_px(v, size, t)
{
    return Math.min(v.box*2, 1024, Math.max(32, 2**Math.ceil(Math.log2(size*Math.sqrt(t.a*t.a + t.b*t.b)*1.5))));
}

// A sprite that keeps its turn and size while the camera moves (scenery, a planet, the station's body, a gate's
// frame), drawn as sprite_draw_box draws it. Turned and scaled once into a copy as the screen shows it, then copied
// to the nearest device pixel each frame: a turned or scaled copy costs the software canvas 5-15 times an unscaled
// one. Its spin layer turns, so it is drawn as before. While the zoom moves, the copies would be made every frame,
// so it is sprite_draw_box.
function sprite_draw_still(name, color, size, x, y, angle, alpha = 1, spin = 0)
{
    const v = sprite(name);
    if (!v || (zoom_target !== null)) {
        return sprite_draw_box(name, color, size, x, y, angle, alpha, spin);
    }
    const t = ctx.getTransform();
    const px = sprite_raster_px(v, size, t);
    const raster = sprite_raster(name, color, px);
    const ring = v.spin ? sprite_raster(name, color, px, 'spin') : null;
    if (!raster || (v.spin && !ring)) {
        return false;
    }
    const copy = sprite_still_copy(raster, size, angle, t);
    if (!copy) {
        return sprite_draw_box(name, color, size, x, y, angle, alpha, spin);
    }
    // the centre on the nearest device pixel (the copy's sides are even), the spin layer turning on it too
    const cx = Math.round(t.a*x + t.c*y + t.e);
    const cy = Math.round(t.b*x + t.d*y + t.f);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.drawImage(copy.canvas, cx - copy.canvas.width/2, cy - copy.canvas.height/2);
    if (ring) {
        ctx.setTransform(t.a, t.b, t.c, t.d, cx, cy);
        ctx.rotate(angle);
        ctx.rotate(spin);
        ctx.drawImage(ring, -size/2, -size/2, size, size);
    }
    ctx.restore();
    return true;
}

// A square canvas `size` units wide centred at x, y, unturned (the outer moon), through the copies of
// sprite_draw_still; false while the zoom moves or when it is too big for a copy, and the caller draws it
function image_draw_still(image, size, x, y, alpha)
{
    if (zoom_target !== null) {
        return false;
    }
    const t = ctx.getTransform();
    const copy = sprite_still_copy(image, size, 0, t);
    if (!copy) {
        return false;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.drawImage(copy.canvas, Math.round(t.a*x + t.c*y + t.e) - copy.canvas.width/2, Math.round(t.b*x + t.d*y + t.f) - copy.canvas.height/2);
    ctx.restore();
    return true;
}

// The copies of sprite_draw_still by raster: each for one turn, size and screen scale, centred on its canvas; all of
// them within a budget of device pixels (64 MB), the least recently drawn going first. None for a sprite of more than
// half of it (Nova Forge's planet at zoom 100% is 7.8 million, zoomed in it would be four times that): null, it is
// drawn as before.
const sprite_still_copies = new Map();
const sprite_still_budget = 16e6;
let sprite_still_pixels = 0;

function sprite_still_copy(raster, size, angle, t)
{
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // the transform's turn and scale, then the sprite's turn: what drawImage would map the raster through
    const a = t.a*cos + t.c*sin;
    const b = t.b*cos + t.d*sin;
    const c = t.c*cos - t.a*sin;
    const d = t.d*cos - t.b*sin;
    let list = sprite_still_copies.get(raster);
    if (!list) {
        list = [];
        sprite_still_copies.set(raster, list);
    }
    for (let i = 0, end = list.length; i < end; ++i) {
        const v = list[i];
        if ((v.size === size) && (v.a === a) && (v.b === b) && (v.c === c) && (v.d === d)) {
            v.used = clock;
            return v;
        }
    }
    // even sides, a pixel clear of the drawing all round, so its centre is on a pixel corner
    const w = 2*Math.ceil(((Math.abs(a) + Math.abs(c))*size)/2) + 2;
    const h = 2*Math.ceil(((Math.abs(b) + Math.abs(d))*size)/2) + 2;
    if (w*h > sprite_still_budget/2) {
        return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const draw = canvas.getContext('2d');
    draw.setTransform(a, b, c, d, w/2, h/2);
    draw.drawImage(raster, -size/2, -size/2, size, size);
    const out = {canvas, size, a, b, c, d, used: clock};
    list.push(out);
    sprite_still_pixels += w*h;
    if (sprite_still_pixels > sprite_still_budget) {
        sprite_still_evict();
    }
    return out;
}

// The copies not drawn this frame, the oldest first, until three quarters of the budget are left
function sprite_still_evict()
{
    const all = [];
    for (const list of sprite_still_copies.values()) {
        all.push(...list);
    }
    all.sort((p, q) => p.used - q.used);
    for (const v of all) {
        if ((sprite_still_pixels <= sprite_still_budget*0.75) || (v.used === clock)) {
            break;
        }
        for (const [raster, list] of sprite_still_copies) {
            const i = list.indexOf(v);
            if (i >= 0) {
                list.splice(i, 1);
                if (!list.length) {
                    sprite_still_copies.delete(raster);
                }
                break;
            }
        }
        sprite_still_pixels -= v.canvas.width*v.canvas.height;
    }
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
// caller draws today's look
function world_art(name)
{
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

// The radius of the rings around your ship (shield, invincibility, pulse ready): clear of its hull
function ship_halo()
{
    return Math.max(26, ship_sprite(current_ship()).length*0.58);
}
