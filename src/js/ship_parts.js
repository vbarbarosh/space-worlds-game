// Upgrades you can see on the ship (the designer's ship-composer.js): the parts (sprites/parts/3d and flat) for what
// the ship carries, pinned on the anchors of its drawing; armour plates on the flanks, boosters on the main engines,
// side thrusters on the small ones, the magnet, the reactor and its radiator, the prism on the nose, the shield bubble.
// Laid out once per change of loadout, in the ship drawing's 256 canvas.
let ship_parts_cache = {key: '', ops: []};
const ship_parts_urls = new Map();

// What the player's modules show: a loadout for the layout (levels clamped to the parts there are)
function ship_parts_loadout(levels = upgrades)
{
    return {
        armor: Math.min(3, levels.armor || 0),
        turbo: Math.min(3, levels.dash || 0),
        evasive: Math.min(2, levels.evasive || 0),
        // every ship starts with the magnet at level 1: the part shows from the first level bought
        magnet: Math.max(0, (levels.magnet || 0) - 1),
        reactor: Math.min(3, levels.reactor || 0),
        cooling: (levels.cooling || 0) > 0,
        prism: (levels.spread || 0) > 0,
        shield: Math.min(3, levels.shield || 0),
        drones: levels.drone || 0,
    };
}

// The parts of a ship with a loadout: [{sprite, x, y, size, rot}] on the 256 canvas, in draw order
function ship_parts_layout(ship_id, loadout)
{
    const text = sprite_svgs[sprite_set]?.[`ship-${ship_id}`] || '';
    const a = ship_parts_anchors(text);
    const ids = Object.keys(a);
    const out = [];
    if (loadout.cooling && a['module-2']) {
        const m = a['module-2'];
        out.push({sprite: 'radiator', x: m.x, y: m.y, size: ((m.r*64)/18)*1.1, rot: 0});
    }
    for (const id of ids.filter(v => v.startsWith('flame-main-'))) {
        if (loadout.turbo) {
            const f = a[id];
            out.push(ship_parts_pinned(`booster-${loadout.turbo}`, f.x1, f.y1, f.x2 - f.x1, f.y2 - f.y1, f.w*3.2));
        }
    }
    for (const id of ids.filter(v => v.startsWith('flame-side-'))) {
        if (loadout.evasive) {
            const f = a[id];
            out.push(ship_parts_pinned(`rcs-${loadout.evasive}`, f.x1, f.y1, f.x2 - f.x1, f.y2 - f.y1, f.w*3.4));
        }
    }
    for (let i = 1; i <= Math.min(6, loadout.armor*2); ++i) {
        const p = a[`armor-${i}`];
        if (p) {
            const dx = p.x2 - p.x1;
            const dy = p.y2 - p.y1;
            out.push({sprite: `plate-${loadout.armor}`, x: (p.x1 + p.x2)/2, y: (p.y1 + p.y2)/2, size: Math.hypot(dx, dy), rot: Math.atan2(dx, -dy)});
        }
    }
    if (loadout.magnet && a['module-1']) {
        const m = a['module-1'];
        const stage = (loadout.magnet <= 2) ? 1 : (loadout.magnet <= 5) ? 2 : 3;
        out.push({sprite: `magnet-${stage}`, x: m.x, y: m.y, size: (m.r*64)/18, rot: 0});
    }
    if (loadout.reactor && a['module-2']) {
        const m = a['module-2'];
        out.push({sprite: `reactor-${loadout.reactor}`, x: m.x, y: m.y, size: (m.r*64)/18, rot: 0});
    }
    if (loadout.prism && a.nose) {
        out.push({sprite: 'prism', x: a.nose.x, y: a.nose.y - a.nose.r*0.6, size: a.nose.r*6.4, rot: 0});
    }
    if (loadout.shield && a.shield) {
        out.push({sprite: `shield-${loadout.shield}`, x: a.shield.x, y: a.shield.y, size: (256*a.shield.r)/120, rot: 0, shield: true});
    }
    return out;
}

// The drawing's anchors: lines (x1, y1, x2, y2, width) and circles (x, y, r) by id
function ship_parts_anchors(text)
{
    const out = {};
    for (const m of text.matchAll(/<line id="([\w-]+)" x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"[^>]*stroke-width="([\d.]+)"/g)) {
        out[m[1]] = {x1: Number(m[2]), y1: Number(m[3]), x2: Number(m[4]), y2: Number(m[5]), w: Number(m[6])};
    }
    for (const m of text.matchAll(/<circle id="([\w-]+)" cx="([-\d.]+)" cy="([-\d.]+)" r="([\d.]+)"/g)) {
        out[m[1]] = {x: Number(m[2]), y: Number(m[3]), r: Number(m[4])};
    }
    return out;
}

// A part whose exit (32, 50 on its 64 canvas) sits on (x, y), its canvas "down" along (dx, dy)
function ship_parts_pinned(sprite, x, y, dx, dy, size)
{
    const rot = Math.atan2(-dx, dy);
    const ox = 0;
    const oy = ((32 - 50)/64)*size;
    return {sprite, x: x + ox*Math.cos(rot) - oy*Math.sin(rot), y: y + ox*Math.sin(rot) + oy*Math.cos(rot), size, rot};
}

// The player's parts, laid out again only when the ship, the set or a module level changes
function ship_parts_player()
{
    const loadout = ship_parts_loadout();
    const key = `${current_ship().id}:${sprite_set}:${JSON.stringify(loadout)}`;
    if (ship_parts_cache.key !== key) {
        ship_parts_cache = {key, ops: ship_parts_layout(current_ship().id, loadout)};
    }
    return ship_parts_cache.ops;
}

// Over the player's hull (drawn `length` long at x, y, angle): its parts; the shield bubble fades with the charge
function ship_parts_draw(length, x, y, angle, alpha)
{
    const ops = ship_parts_player();
    if (!ops.length) {
        return;
    }
    const unit = ((length*256)/sprite_span)/256;
    ctx.save();
    ctx.translate(x, y);
    // the drawing's nose points up; the ship's points along angle
    ctx.rotate(angle + Math.PI/2);
    ctx.scale(unit, unit);
    for (const v of ops) {
        const k = v.shield ? clamp(player.shield/Math.max(1, shield_max()), 0.25, 1) : 1;
        sprite_draw_box(`parts/${sprite_set}/${v.sprite}`, null, v.size, v.x - 128, v.y - 128, v.rot, alpha*k);
    }
    ctx.restore();
}

// A ship with a loadout as one <svg> (the depot's preview): the hull, its parts and its orbiting drones, as the
// designer's toSvg does; with base, what the loadout adds to it pulses gold
function ship_parts_svg(ship_id, loadout, base = null)
{
    const had = new Set(base ? ship_parts_layout(ship_id, base).map(ship_parts_place) : []);
    const parts = ship_parts_layout(ship_id, loadout).map(function (v) {
        const ghost = base && !had.has(ship_parts_place(v)) ? ' class="parts-ghost"' : '';
        return `<image${ghost} href="${ship_parts_url(`parts/3d/${v.sprite}`)}" x="${-v.size/2}" y="${-v.size/2}" width="${v.size}" height="${v.size}" transform="translate(${v.x} ${v.y}) rotate(${(v.rot*180)/Math.PI})"/>`;
    });
    for (let i = 0; i < (loadout.drones || 0); ++i) {
        const ghost = base && (i >= (base.drones || 0)) ? ' parts-ghost' : '';
        parts.push(`<g class="parts-orbit${ghost}" style="animation-delay: ${-i*2}s"><image href="${ship_parts_url('drones/orbit-drone')}" x="215" y="111" width="34" height="34"/></g>`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-28 -20 312 300"><image href="${ship_parts_hull_url(ship_id)}" x="0" y="0" width="256" height="256"/>${parts.join('')}</svg>`;
}

// Where a part sits, to tell a part the loadout adds from one already on
function ship_parts_place(v)
{
    return `${v.sprite}:${v.x.toFixed(1)}:${v.y.toFixed(1)}`;
}

// A sprite (its path under sprites/, e.g. parts/3d/plate-1) as an image URL, encoded once
function ship_parts_url(path)
{
    if (!ship_parts_urls.has(path)) {
        const text = path.split('/').reduce((v, vv) => v?.[vv], sprite_svgs);
        ship_parts_urls.set(path, menu_sprite_url(typeof text === 'string' ? text : ''));
    }
    return ship_parts_urls.get(path);
}

// The ship's drawing without its anchor marks (sprite() strips them) as an image URL
function ship_parts_hull_url(ship_id)
{
    const key = `hull:${ship_id}`;
    if (!ship_parts_urls.has(key)) {
        const ship = sprite(`3d/ship-${ship_id}`);
        ship_parts_urls.set(key, ship ? menu_sprite_url(new XMLSerializer().serializeToString(ship.svg)) : '');
    }
    return ship_parts_urls.get(key);
}
