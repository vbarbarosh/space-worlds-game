// Ship sprites: the SVGs of src/sprites/, packed into sprite_svgs by bin/build. A drawing is nose up on a 256 canvas,
// the ship's longest side 228 units; its anchors layer marks flames (lines from the nozzle, as long as a full-thrust
// flame) and points (turrets, beam). In the game's frame the nose is +x, so a drawing's (x, y) is (128 - y, x - 128).
// sprite_svgs holds one set per folder, flat and 3d; the player picks one with the sprites button.
const sprite_cache = new Map();
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
document.getElementById('sprites_button').addEventListener('click', sprite_set_toggle);
sync_sprites_button();

function sprite_set_toggle()
{
    sprite_set = sprite_sets[(sprite_sets.indexOf(sprite_set) + 1) % sprite_sets.length];
    try {
        localStorage.setItem('pulse_drift_sprites', sprite_set);
    }
    catch {
    }
    sync_sprites_button();
    performance_render_dirty = true;
}

function sync_sprites_button()
{
    const b = document.getElementById('sprites_button');
    const title = (sprite_set === '3d') ? '3D' : 'Flat';
    b.textContent = title.toUpperCase();
    b.setAttribute('aria-label', 'Ship sprites: ' + title + '. Click to switch.');
}

// The parsed drawing, its anchors in drawing units and its rasters; null for a name with no file
function sprite(name)
{
    const key = sprite_set + ':' + name;
    if (sprite_cache.has(key)) {
        return sprite_cache.get(key);
    }
    const text = sprite_svgs[sprite_set][name];
    if (!text) {
        sprite_cache.set(key, null);
        return null;
    }
    const svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
    const flames = [];
    const points = {};
    const anchors = svg.querySelector('#anchors');
    for (const v of anchors ? [...anchors.children] : []) {
        const n = k => Number(v.getAttribute(k));
        if (v.tagName === 'line') {
            flames.push({kind: v.id.replace(/^flame-|-\d+$/g, ''), x: 128 - n('y1'), y: n('x1') - 128, dx: n('y1') - n('y2'), dy: n('x2') - n('x1'), width: n('stroke-width')});
        }
        else {
            points[v.id] = {x: 128 - n('cy'), y: n('cx') - 128};
        }
    }
    anchors?.remove();
    const out = {svg, flames, points, rasters: new Map()};
    sprite_cache.set(key, out);
    return out;
}

// The anchors of a sprite drawn `length` game units long, in game units: flames by kind, and the points
function sprite_anchors(name, length)
{
    const v = sprite(name);
    if (!v) {
        return null;
    }
    const k = length/sprite_span;
    const flames = {main: [], reverse: [], side: []};
    for (const f of v.flames) {
        flames[f.kind]?.push({x: f.x*k, y: f.y*k, dx: f.dx*k, dy: f.dy*k, width: f.width*k});
    }
    const points = {};
    for (const [id, p] of Object.entries(v.points)) {
        points[id] = {x: p.x*k, y: p.y*k};
    }
    return {flames, points};
}

// A raster turned nose to +x, with the accent painted `color` (null keeps the drawing's own); null while it loads
function sprite_raster(name, color, px)
{
    const v = sprite(name);
    if (!v) {
        return null;
    }
    const key = (color || '') + ':' + px;
    if (v.rasters.has(key)) {
        return v.rasters.get(key).ready ? v.rasters.get(key).canvas : null;
    }
    const svg = v.svg.cloneNode(true);
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
        draw.rotate(Math.PI/2);
        draw.drawImage(image, -px/2, -px/2, px, px);
        raster.ready = true;
    };
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    return null;
}

// Two #rrggbb colours mixed, t of the way from a to b
function color_mix(a, b, t)
{
    const channel = (v, i) => parseInt(v.slice(1 + i*2, 3 + i*2), 16);
    return '#' + [0, 1, 2].map(i => Math.round(channel(a, i) + (channel(b, i) - channel(a, i))*t).toString(16).padStart(2, '0')).join('');
}

// Draws the sprite `length` game units long at x, y, turned to angle; false while it is not ready, so the caller
// draws its own fallback
function sprite_draw(name, color, length, x, y, angle, alpha = 1)
{
    const size = (length*256)/sprite_span;
    const px = Math.min(512, Math.max(64, 2**Math.ceil(Math.log2(size*2))));
    const raster = sprite_raster(name, color, px);
    if (!raster) {
        return false;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.drawImage(raster, -size/2, -size/2, size, size);
    ctx.restore();
    return true;
}

// Flames along a sprite's anchors of one kind, in the ship's frame (the caller has turned the context): each as long
// as its anchor times `power`, as wide as its nozzle
function sprite_flames(flames, power, color, flicker = 0)
{
    for (const f of flames) {
        const length = Math.hypot(f.dx, f.dy);
        if ((length*power < 0.5) || (length === 0)) {
            continue;
        }
        const reach = length*power*(1 + flicker);
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(Math.atan2(f.dy, f.dx));
        const g = ctx.createLinearGradient(0, 0, reach, 0);
        g.addColorStop(0, '#f1faffee');
        g.addColorStop(0.25, color_with_alpha(color, 0.75));
        g.addColorStop(0.7, color_with_alpha(color, 0.25));
        g.addColorStop(1, color_with_alpha(color, 0));
        ctx.fillStyle = g;
        const r = f.width/2;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.bezierCurveTo(reach*0.2, -r, reach*0.7, -r*0.35, reach, 0);
        ctx.bezierCurveTo(reach*0.7, r*0.35, reach*0.2, r, 0, r);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

// The sprite of a player ship class, and its length: the size follows the class's radius
function ship_sprite(v)
{
    return {name: 'ship-' + v.id, length: v.radius*2.8};
}

// The sprite of a raider: its type, elite or not; the flagship of the world it serves
function enemy_sprite(enemy)
{
    if (enemy.type === 'boss') {
        const name = 'flagship-' + worlds[campaign.world].name.toLowerCase().replace(/\s+/g, '-');
        return {name: sprite(name) ? name : 'flagship', length: enemy.r*2.2};
    }
    return {name: 'enemy-' + enemy.type + (enemy.elite ? '-elite' : ''), length: enemy.r*2.4};
}
