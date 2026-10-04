// Hardpoints (campaign): every ship has gun mounts of three sizes, light, medium and heavy, listed in its `mounts`.
// Each mount carries its own gun, of its size or smaller, and fires on its own, so a ship with more mounts hits
// harder; a big gun needs a big ship. campaign.fleet.loadouts[ship id] lists the gun on each mount. The arcade keeps
// one gun of any size, fired from both turrets in turn, as before.
const gun_sizes = ['light', 'medium', 'heavy'];
// A gun's turret drawing across, in game units, by its mount: the mounts are 6, 8 and 12 across, and a gun's base
// (about 31 of its 64 canvas) covers 85% of its mount, leaving the mount's ring showing
const gun_boxes = {light: 10.5, medium: 14, heavy: 21};

function gun_fits(weapon, size)
{
    return gun_sizes.indexOf(weapon.size) <= gun_sizes.indexOf(size);
}

function ship_mounts(ship = current_ship())
{
    return ship.mounts || ['light'];
}

// The gun on each of the ship's mounts: the one you put there, while you own it and it fits; otherwise the best that
// fits
function ship_loadout(ship = current_ship())
{
    const f = ensure_career();
    f.loadouts = f.loadouts || {};
    const saved = f.loadouts[ship.id] || [];
    const out = ship_mounts(ship).map(function (size, i) {
        const v = weapon_by_id(saved[i]);
        return (v && f.weapons.includes(v.id) && gun_fits(v, size)) ? v.id : best_gun_for(size);
    });
    f.loadouts[ship.id] = out;
    return out;
}

// The best gun you own for a mount: the biggest that fits, then the strongest
function best_gun_for(size)
{
    const f = ensure_career();
    const owned = weapon_catalog.filter(v => f.weapons.includes(v.id) && gun_fits(v, size));
    owned.sort((a, b) => (gun_sizes.indexOf(b.size) - gun_sizes.indexOf(a.size)) || (b.rating - a.rating));
    return (owned[0] || weapon_catalog[0]).id;
}

// The guns of the current ship, mount by mount; the arcade's one gun
function mounted_weapons()
{
    if (arcade.active) {
        return [weapon_catalog.find(v => v.id === ensure_career().weapon_id) || weapon_catalog[0]];
    }
    return ship_loadout().map(weapon_by_id);
}

function set_mount_gun(index, id)
{
    const f = ensure_career();
    const v = weapon_by_id(id);
    const size = ship_mounts()[index];
    if ((state !== 'upgrade') || !v || !f.weapons.includes(id) || !size || !gun_fits(v, size)) {
        return;
    }
    ship_loadout();
    f.loadouts[current_ship().id][index] = id;
    player.gun_cd = [];
    save_checkpoint('dock');
    render_station();
    sfx('upgrade');
}

// A gun just bought goes on the first mount it fits whose gun is weaker
function mount_new_gun(id)
{
    const v = weapon_by_id(id);
    const loadout = ship_loadout();
    const mounts = ship_mounts();
    for (let i = 0; i < mounts.length; ++i) {
        const now = weapon_by_id(loadout[i]);
        if (gun_fits(v, mounts[i]) && (v.rating > now.rating)) {
            loadout[i] = id;
            return true;
        }
    }
    return false;
}

// The weapon rating the gates check: your best gun's rating and tier, and two more for each gun past the first. (A
// sum of all the guns let two flux beams clear every gate.)
function guns_rating()
{
    const f = ensure_career();
    const guns = mounted_weapons();
    return Math.max(...guns.map(v => v.rating + (f.weapon_levels[v.id] || 1) - 1)) + (guns.length - 1)*2;
}

function weapon_by_id(id)
{
    return weapon_catalog.find(v => v.id === id) || null;
}

// Whether a ship has a mount the gun fits
function gun_fits_ship(weapon, ship = current_ship())
{
    return ship_mounts(ship).some(v => gun_fits(weapon, v));
}

// The ships that take a gun, by name: those with a mount of its size or larger
function ships_for_gun_text(weapon)
{
    return ship_catalog.filter(v => gun_fits_ship(weapon, v)).map(v => v.name.toUpperCase()).join(', ');
}

// How many of your ship's mounts carry the gun
function mounts_carrying(weapon)
{
    return ship_loadout().filter(v => v === weapon.id).length;
}

// Mounts as words: 2 MEDIUM + 1 HEAVY
function mounts_text(ship)
{
    return gun_sizes.map(function (size) {
        const n = ship_mounts(ship).filter(v => v === size).length;
        return n ? `${n} ${size.toUpperCase()}` : '';
    }).filter(Boolean).join(' + ');
}

// Where each mount sits in the ship's frame (x along the nose), with its size: the drawing's size-named marks
// (turret-light-1, turret-heavy-1...) when it has them. Until then the two turret marks take the biggest guns (their
// midpoint a single one), and the others go in a mirrored pair across the hull from them
function mount_points(ship = current_ship())
{
    const sizes = ship_mounts(ship);
    const art = (view_mode === 'wireframe') ? null : ship_sprite(ship);
    const points = (art && sprite(art.name) && sprite_anchors(art.name, art.length).points) || {};
    // the drawing's marks, numbered within each size: turret-medium-1, turret-medium-2, turret-heavy-1
    const marks = sizes.map((v, i) => points[`turret-${v}-${sizes.slice(0, i + 1).filter(vv => vv === v).length}`]);
    if (marks.every(Boolean)) {
        return marks.map((v, i) => ({x: v.x, y: v.y, size: sizes[i]}));
    }
    const legacy = turret_mounts(ship).map(v => ({x: v[0], y: v[1]})).sort((a, b) => b.x - a.x);
    const length = art ? art.length : ship.radius*2.8;
    const mid = {x: (legacy[0].x + legacy[1].x)/2, y: (legacy[0].y + legacy[1].y)/2};
    const spine = legacy.every(v => Math.abs(v.y) < 3);
    const biggest = gun_sizes.filter(v => sizes.includes(v)).at(-1);
    const on_marks = sizes.filter(v => v === biggest).length;
    const out = [];
    let mark = 0;
    let other = 0;
    for (const size of sizes) {
        if ((size === biggest) && (on_marks === 1)) {
            // one big gun: on the forward mark of a spine, between side marks
            out.push({...(spine ? legacy[0] : mid), size});
        }
        else if ((size === biggest) && (mark < 2)) {
            out.push({...legacy[mark++], size});
        }
        else {
            // the rest across from the marks: on the sides of a spine, on the spine between side marks
            const side = (other++ % 2) ? 1 : -1;
            out.push(spine ? {x: mid.x, y: side*length*0.15, size} : {x: mid.x + side*length*0.2, y: 0, size});
        }
    }
    return out;
}

// The muzzle marks of a gun's turret drawn `box` across, from its pivot, barrel along +x; null without a drawing
function gun_muzzles(weapon, box)
{
    const name = `weapons/turret-${weapon.id}`;
    if ((view_mode === 'wireframe') || !sprite(name)) {
        return null;
    }
    const points = sprite_anchors_box(name, box).points;
    return Object.keys(points).filter(v => v.startsWith('muzzle-')).sort().map(v => points[v]);
}

// Where shot `barrel` of a mount's gun leaves, aimed at angle, in the world
function mount_muzzle(index, barrel, angle, weapon)
{
    const mount = mount_points()[index];
    const c = Math.cos(player.angle);
    const s = Math.sin(player.angle);
    const x = player.x + mount.x*c - mount.y*s;
    const y = player.y + mount.x*s + mount.y*c;
    const muzzles = gun_muzzles(weapon, gun_boxes[mount.size]);
    if (!muzzles) {
        return {x: x + Math.cos(angle)*13, y: y + Math.sin(angle)*13, bore: 0};
    }
    const m = muzzles[barrel % muzzles.length];
    return {x: x + m.x*Math.cos(angle) - m.y*Math.sin(angle), y: y + m.x*Math.sin(angle) + m.y*Math.cos(angle), bore: m.r};
}

// Each mount's gun fires when it is ready and the target is within its reach
function guns_fire(target_distance)
{
    if (arcade.active) {
        if ((player.shoot_cd <= 0) && (target_distance < gun_reach())) {
            fire();
        }
        return;
    }
    const guns = mounted_weapons();
    player.gun_cd = player.gun_cd || [];
    for (let i = 0; i < guns.length; ++i) {
        if (((player.gun_cd[i] || 0) <= 0) && (target_distance < Math.min(900, guns[i].speed*guns[i].life))) {
            fire(i);
        }
    }
}

function guns_cool(dt)
{
    for (let i = 0; i < (player.gun_cd || []).length; ++i) {
        player.gun_cd[i] -= dt;
    }
}

let arsenal_size = 'all';

// The ARSENAL on the UI kit: on the left your ship drawn large with its mounts numbered, and a row per mount with its
// size and a picker of the guns you own that fit; on the right the six guns as cards, filtered by size
function render_arsenal(parent)
{
    const ship = current_ship();
    const f = ensure_career();
    const loadout = ship_loadout();
    const mounts = ship_mounts();
    parent.classList.add('arsenal');
    const left = document.createElement('div');
    left.className = 'arsenal-ship';
    left.innerHTML = `<div class="arsenal-ship-head"><span class="eyebrow eyebrow--muted">${ship.name} · ${mounts.length} mount${(mounts.length > 1) ? 's' : ''}</span>${ui_badge(`Weapon rating ${guns_rating()}`)}</div>`;
    const canvas = document.createElement('canvas');
    canvas.className = 'arsenal-art';
    canvas.width = 760;
    canvas.height = 440;
    left.append(canvas);
    for (let i = 0; i < mounts.length; ++i) {
        const row = document.createElement('div');
        row.className = 'mount-row';
        row.innerHTML = `<span class="mount-number">${i + 1}</span>${ui_size(mounts[i])}`;
        const label = document.createElement('label');
        label.className = 'select';
        const select = document.createElement('select');
        for (const v of weapon_catalog) {
            if (f.weapons.includes(v.id) && gun_fits(v, mounts[i])) {
                const option = document.createElement('option');
                option.value = v.id;
                option.textContent = `${v.name} · T${f.weapon_levels[v.id] || 1}`;
                option.selected = v.id === loadout[i];
                select.append(option);
            }
        }
        select.addEventListener('change', () => set_mount_gun(i, select.value));
        label.append(select);
        row.append(label);
        row.insertAdjacentHTML('beforeend', gun_icon_html(weapon_by_id(loadout[i]), 22));
        left.append(row);
    }
    const note = document.createElement('p');
    note.className = 'small arsenal-note';
    note.innerHTML = 'A mount takes a gun of its size or smaller. Bigger guns need a bigger ship: ';
    note.append(ui_button({label: 'Hangar', key: '5', kind: 'ghost', size: 'sm', on: () => station_tab_open('hangar')}));
    left.append(note);
    const right = document.createElement('div');
    right.className = 'arsenal-guns';
    const head = document.createElement('div');
    head.className = 'arsenal-guns-head';
    head.innerHTML = `<h3 class="h-section">Guns <span class="eyebrow eyebrow--muted">${f.weapons.length} owned · pick one on a mount to fit it</span></h3>`;
    const seg = document.createElement('div');
    seg.className = 'seg';
    for (const size of ['all', ...gun_sizes]) {
        const b = document.createElement('button');
        b.textContent = (size === 'all') ? 'All' : `${size[0].toUpperCase()}${size.slice(1)}`;
        b.classList.toggle('is-active', size === arsenal_size);
        b.addEventListener('click', function () {
            arsenal_size = size;
            render_station();
        });
        seg.append(b);
    }
    head.append(seg);
    right.append(head);
    const grid = document.createElement('div');
    grid.className = 'arsenal-grid';
    for (const gun of weapon_catalog.filter(v => (arsenal_size === 'all') || (v.size === arsenal_size))) {
        grid.append(arsenal_gun_card(gun));
    }
    right.append(grid);
    parent.append(left, right);
    render_arsenal_ship(canvas);
}

// A gun's card: size, tier and how many of your mounts carry it; damage, rate and range; what it needs, and Buy or
// Upgrade with its price
function arsenal_gun_card(v)
{
    const f = ensure_career();
    const owned = f.weapons.includes(v.id);
    const level = f.weapon_levels[v.id] || 1;
    const on = ship_loadout().map((id, i) => ((id === v.id) ? i + 1 : 0)).filter(Boolean);
    const locked = !owned && (pilot_rank() < v.rank);
    const fits = gun_fits_ship(v);
    const cost = Math.round((130 + v.price*0.22)*level);
    let note = owned ? (on.length ? `Mount${(on.length > 1) ? 's' : ''} ${on.join(', ')}` : fits ? 'Owned · not mounted' : `Needs a ${v.size} mount`) : '';
    let action = null;
    if (locked) {
        note = `<span class="badge badge--locked">${ui_lock_svg}Rank ${rank_names[v.rank]}</span>`;
    }
    else if (owned) {
        action = ui_button({label: (level >= 5) ? 'Max tier' : 'Upgrade', price: (level >= 5) ? null : cost, size: 'sm', disabled: (level >= 5) || (salvage < cost), on: () => upgrade_weapon(v.id)});
    }
    else {
        if (salvage < v.price) {
            note = `<span class="t-red">Need ${ui_number(v.price - salvage)} more</span>`;
        }
        else if (!fits) {
            note = `Needs a ${v.size} mount`;
        }
        action = ui_button({label: 'Buy', price: v.price, size: 'sm', disabled: salvage < v.price, on: () => fleet_purchase(v.id, 'weapon')});
    }
    const damage = (v.id === 'scatter') ? `${v.damage}×5` : String(v.damage);
    return ui_card({
        tags: `${ui_size(v.size)}${owned ? ui_tier(level) : ''}${on.length ? ui_badge(`Equipped${(on.length > 1) ? ` ×${on.length}` : ''}`, 'cyan') : ''}`,
        title: v.name,
        stats: [['DMG', damage], ['RATE', `${v.interval.toFixed(2)}s`], ['RANGE', `${((v.speed*v.life)/1000).toFixed(1)} km`]],
        note,
        action,
        state: on.length ? 'is-equipped' : locked ? 'is-locked' : '',
        art: gun_icon_html(v, 40),
    });
}

// A gun's turret drawing as an image for the page
function gun_icon_html(v, size)
{
    const text = sprite_svgs.weapons?.[`turret-${v.id}`];
    return text ? `<img class="gun-icon" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}" width="${size}" height="${size}" alt="">` : '';
}

// Your ship nose up, its guns on their mounts, each mount numbered as in the rows below
function render_arsenal_ship(canvas)
{
    const ship = current_ship();
    const art = ship_sprite(ship);
    const raster = sprite(art.name) && sprite_raster(art.name, null, 512);
    const draw = canvas.getContext('2d');
    if (!raster) {
        setTimeout(() => (canvas.isConnected && render_arsenal_ship(canvas)), 120);
        return;
    }
    const size = canvas.height*1.2;
    const k = size/((art.length*256)/sprite_span);
    const cx = canvas.width/2;
    const cy = canvas.height/2;
    draw.clearRect(0, 0, canvas.width, canvas.height);
    draw.save();
    draw.translate(cx, cy);
    draw.rotate(-Math.PI/2);
    draw.drawImage(raster, -size/2, -size/2, size, size);
    const guns = mounted_weapons();
    const points = mount_points(ship);
    for (let i = 0; i < points.length; ++i) {
        draw.save();
        draw.translate(points[i].x*k, points[i].y*k);
        draw.scale(k, k);
        turret_draw(draw, guns[i], gun_boxes[points[i].size], 0);
        draw.restore();
    }
    draw.restore();
    // the numbers, upright, beside each mount
    draw.font = 'bold 22px Inter, sans-serif';
    draw.textAlign = 'center';
    draw.textBaseline = 'middle';
    for (let i = 0; i < points.length; ++i) {
        const x = cx + points[i].y*k + ((points[i].y < 0) ? -46 : 46);
        const y = cy - points[i].x*k - 30;
        draw.fillStyle = '#6cf8ec';
        draw.shadowColor = '#6cf8ec';
        draw.shadowBlur = 12;
        draw.beginPath();
        draw.arc(x, y, 18, 0, Math.PI*2);
        draw.fill();
        draw.shadowBlur = 0;
        draw.fillStyle = '#032421';
        draw.fillText(String(i + 1), x, y + 1);
    }
}
