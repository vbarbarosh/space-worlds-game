// Hardpoints: every ship has gun mounts of three sizes, light, medium and heavy, listed in its `mounts`. Each mount
// carries its own gun, of its size or smaller, and fires on its own, so a ship with more mounts hits harder; a big gun
// needs a big ship. A gun arms one mount: a second mount takes a second gun, bought again (guns_owned), in the
// campaign as in the arcade. campaign.fleet.loadouts[ship id] lists the gun on each mount, null for an empty one.
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

// The gun on each of the ship's mounts: a mount fires only a gun bought for it, so each gun you own goes on one mount;
// the one you put there while it fits, then the best of the rest that fit, and a mount with none left stays empty
// (null). Before, in the campaign, one gun bought armed every mount of its size, and a second rail cost nothing.
function ship_loadout(ship = current_ship())
{
    const f = ensure_career();
    f.loadouts = f.loadouts || {};
    const left = {...guns_owned()};
    const saved = f.loadouts[ship.id] || [];
    const mounts = ship_mounts(ship);
    const out = mounts.map(function (size, i) {
        const v = weapon_by_id(saved[i]);
        if (v && (left[v.id] > 0) && gun_fits(v, size)) {
            left[v.id] -= 1;
            return v.id;
        }
        return null;
    });
    for (let i = 0; i < out.length; ++i) {
        if (out[i] === null) {
            const fit = weapon_catalog.filter(v => (left[v.id] > 0) && gun_fits(v, mounts[i]));
            fit.sort((a, b) => (gun_sizes.indexOf(b.size) - gun_sizes.indexOf(a.size)) || (b.rating - a.rating));
            if (fit.length) {
                out[i] = fit[0].id;
                left[fit[0].id] -= 1;
            }
        }
    }
    f.loadouts[ship.id] = out;
    return out;
}

// How many of each gun you own: one each, unless bought again for another mount; the cannon is the start gun. A
// campaign save from before a gun armed one mount has no count: it is given as many of each gun as its ships carried
// then (guns_kept), so every mount it had armed stays armed and nothing it paid for goes
function guns_owned()
{
    const f = ensure_career();
    if (!f.gun_count) {
        f.gun_count = arcade.active ? Object.fromEntries(f.weapons.map(v => [v, 1])) : guns_kept(f);
    }
    // a gun you own is one at least (the dev panel adds guns by name)
    for (const id of f.weapons) {
        f.gun_count[id] = Math.max(1, f.gun_count[id] || 0);
    }
    return f.gun_count;
}

// The guns a campaign save from before carried: each gun as many times as the ship of yours that carried it most,
// mounts filled as they were then (the gun put there while it fitted, else the best that fitted)
function guns_kept(f)
{
    const out = Object.fromEntries(f.weapons.map(v => [v, 1]));
    for (const id of f.ships) {
        const ship = ship_catalog.find(v => v.id === id);
        if (!ship) {
            continue;
        }
        const saved = f.loadouts?.[id] || [];
        const carried = {};
        const mounts = ship_mounts(ship);
        for (let i = 0; i < mounts.length; ++i) {
            const v = weapon_by_id(saved[i]);
            const gun = (v && f.weapons.includes(v.id) && gun_fits(v, mounts[i])) ? v.id : best_gun_for(mounts[i]);
            carried[gun] = (carried[gun] || 0) + 1;
        }
        for (const [gun, n] of Object.entries(carried)) {
            out[gun] = Math.max(out[gun] || 0, n);
        }
    }
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

// The campaign's price of one more of a gun you own: its price, the start cannon's 120 (the arcade's for it)
function gun_copy_price(v)
{
    return v.price || 120;
}

// Buys one more of a gun you own for an empty mount it fits (the ARSENAL's Buy another), once its world has opened it
function buy_gun_copy(id)
{
    const v = weapon_by_id(id);
    const price = gun_copy_price(v);
    if ((state !== 'upgrade') || !v || !tech_open(v.opens) || !ensure_career().weapons.includes(id) || !mounts_empty_for(v).length || (salvage < price)) {
        return;
    }
    salvage -= price;
    play_log_spend('gun', id, price);
    guns_owned()[id] = (guns_owned()[id] || 0) + 1;
    ship_loadout();
    player.gun_cd = [];
    save_checkpoint('dock');
    render_station();
    sfx('upgrade');
}

// The empty mounts of a ship that the gun fits, by index
function mounts_empty_for(v, ship = current_ship())
{
    const loadout = ship_loadout(ship);
    const mounts = ship_mounts(ship);
    const out = [];
    for (let i = 0; i < mounts.length; ++i) {
        if (!loadout[i] && gun_fits(v, mounts[i])) {
            out.push(i);
        }
    }
    return out;
}

// A ship's mounts as words with how many are armed: 2 MEDIUM + 1 HEAVY · 1 EMPTY
function mounts_armed_text(ship)
{
    const empty = ship_loadout(ship).filter(v => !v).length;
    return `${mounts_text(ship)}${empty ? ` · ${empty} EMPTY` : ''}`;
}

// The guns of the current ship, mount by mount, in the campaign and the arcade alike; an empty arcade mount is null
function mounted_weapons()
{
    return ship_loadout().map(weapon_by_id);
}

// A gun you own put on a mount; with every one of it already on other mounts, it moves from the first of them, which
// takes the best gun left over, or stays empty
function set_mount_gun(index, id)
{
    const f = ensure_career();
    const v = weapon_by_id(id);
    const size = ship_mounts()[index];
    if ((state !== 'upgrade') || !v || !f.weapons.includes(id) || !size || !gun_fits(v, size)) {
        return;
    }
    const loadout = ship_loadout();
    const others = [];
    for (let i = 0; i < loadout.length; ++i) {
        if ((loadout[i] === id) && (i !== index)) {
            others.push(i);
        }
    }
    if (others.length && (others.length >= guns_owned()[id])) {
        loadout[others[0]] = null;
    }
    loadout[index] = id;
    player.gun_cd = [];
    save_checkpoint('dock');
    render_station();
    sfx('upgrade');
}

// A new gun on a mount it fits that does not carry it: an empty one first, else the weakest gun there (with
// weaker_only, only a gun weaker than it), which stays yours for another mount or ship
function mount_gun_anywhere(id, weaker_only = false)
{
    const loadout = ship_loadout();
    // an empty mount it fits took it already as the loadout was made
    if (loadout.filter(v => v === id).length >= guns_owned()[id]) {
        return true;
    }
    const mounts = ship_mounts();
    const rating = weapon_by_id(id).rating;
    const free = mounts.map((size, i) => i).filter(v => gun_fits(weapon_by_id(id), mounts[v]) && (loadout[v] !== id) && (!weaker_only || !loadout[v] || (weapon_by_id(loadout[v]).rating < rating)));
    free.sort((a, b) => (weapon_by_id(loadout[a])?.rating ?? -1) - (weapon_by_id(loadout[b])?.rating ?? -1));
    if (!free.length) {
        return false;
    }
    loadout[free[0]] = id;
    return true;
}

// The weapon rating the gates check: your best gun's rating and tier, and two more for each gun past the first. (A
// sum of all the guns let two flux beams clear every gate.)
function guns_rating()
{
    const f = ensure_career();
    const guns = mounted_weapons().filter(Boolean);
    return guns.length ? Math.max(...guns.map(v => v.rating + (f.weapon_levels[v.id] || 1) - 1)) + (guns.length - 1)*2 : 0;
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
    const art = ship_sprite(ship);
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
    if (!sprite(name)) {
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
    const guns = mounted_weapons();
    player.gun_cd = player.gun_cd || [];
    for (let i = 0; i < guns.length; ++i) {
        if (guns[i] && ((player.gun_cd[i] || 0) <= 0) && (target_distance < weapon_reach(guns[i]))) {
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
    const owned = guns_owned();
    for (let i = 0; i < mounts.length; ++i) {
        const row = document.createElement('div');
        // an empty mount says so, in red, and its picker offers the guns you own that would fit it
        row.className = loadout[i] ? 'mount-row' : 'mount-row is-empty';
        row.innerHTML = `<span class="mount-number">${i + 1}</span>${ui_size(mounts[i])}`;
        const label = document.createElement('label');
        label.className = 'select';
        const select = document.createElement('select');
        if (!loadout[i]) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Empty';
            option.selected = true;
            option.disabled = true;
            select.append(option);
        }
        for (const v of weapon_catalog) {
            if (f.weapons.includes(v.id) && gun_fits(v, mounts[i])) {
                const option = document.createElement('option');
                const elsewhere = loadout.filter((id, j) => (id === v.id) && (j !== i)).length;
                option.value = v.id;
                // a gun whose every copy is on another mount moves from there
                option.textContent = `${v.name} · T${f.weapon_levels[v.id] || 1}${((v.id !== loadout[i]) && (elsewhere >= owned[v.id])) ? ' · from another mount' : ''}`;
                option.selected = v.id === loadout[i];
                select.append(option);
            }
        }
        select.addEventListener('change', () => set_mount_gun(i, select.value));
        label.append(select);
        row.append(label);
        row.insertAdjacentHTML('beforeend', loadout[i] ? gun_icon_html(weapon_by_id(loadout[i]), 22) : '<span class="mount-empty" title="No gun on this mount">—</span>');
        left.append(row);
    }
    const note = document.createElement('p');
    note.className = 'small arsenal-note';
    note.innerHTML = 'A mount takes a gun of its size or smaller, and each gun arms one mount. Bigger guns need a bigger ship: ';
    note.append(ui_button({label: 'Hangar', key: '5', kind: 'ghost', size: 'sm', on: () => station_tab_open('hangar')}));
    left.append(note);
    const right = document.createElement('div');
    right.className = 'arsenal-guns';
    const head = document.createElement('div');
    head.className = 'arsenal-guns-head';
    const copies = Object.values(owned).reduce((a, b) => a + b, 0);
    const empty = loadout.filter(v => !v).length;
    head.innerHTML = `<h3 class="h-section">Guns <span class="eyebrow eyebrow--muted">${copies} owned · ${empty ? `<span class="t-red">${empty} mount${(empty > 1) ? 's' : ''} empty</span>` : 'pick one on a mount to fit it'}</span></h3>`;
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
    const count = owned ? guns_owned()[v.id] : 0;
    const level = f.weapon_levels[v.id] || 1;
    const on = ship_loadout().map((id, i) => ((id === v.id) ? i + 1 : 0)).filter(Boolean);
    // an empty mount this gun fits: one more of it arms it
    const empty = owned ? mounts_empty_for(v) : [];
    // a gun not yet on sale says where it opens, before the rank it needs
    const closed = !tech_open(v.opens);
    const locked = !owned && (closed || (pilot_rank() < v.rank));
    const fits = gun_fits_ship(v);
    const cost = gun_tier_cost(v, level);
    let note = owned ? (on.length ? `Mount${(on.length > 1) ? 's' : ''} ${on.join(', ')}${(count > on.length) ? ` · ${count - on.length} spare` : ''}` : fits ? 'Owned · not mounted' : `Needs a ${v.size} mount`) : '';
    let action = null;
    if (locked) {
        note = `<span class="badge badge--locked">${ui_lock_svg}${closed ? tech_lock_text(v.opens) : `Rank ${rank_names[v.rank]}`}</span>`;
    }
    else if (owned) {
        action = ui_button({label: (level >= 5) ? 'Max tier' : 'Upgrade', price: (level >= 5) ? null : cost, size: 'sm', disabled: (level >= 5) || (salvage < cost), on: () => upgrade_weapon(v.id)});
        // one more of a gun a save kept from before its world opened waits for that world
        if (empty.length && !closed) {
            const price = gun_copy_price(v);
            const actions = document.createElement('span');
            actions.className = 'card-actions';
            actions.append(ui_button({label: 'Buy another', price, size: 'sm', kind: 'ghost', title: `Arms mount ${empty[0] + 1}; the tier is the same for every one of this gun`, disabled: salvage < price, on: () => buy_gun_copy(v.id)}), action);
            action = actions;
        }
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
    const target = guide_context().target;
    const world = Number.isInteger(target) ? target : campaign.world;
    const share = gun_armour_share(v, world);
    const through = `<span class="${(share < gate_armour_share) ? 't-red' : ''}" title="Of each hit at your tier and Hotter plasma, what passes the armour of ${worlds[world].name} (${Math.round(world_armour(world)*100)}%)">${Math.round(share*100)}%</span>`;
    return ui_card({
        tags: `${ui_size(v.size)}${owned ? ui_tier(level) : ''}${on.length ? ui_badge(`Equipped${(on.length > 1) ? ` ×${on.length}` : ''}`, 'cyan') : ''}${(count > 1) ? ui_badge(`Own ×${count}`) : ''}`,
        title: v.name,
        stats: [['DMG', damage], ['RATE', `${v.interval.toFixed(2)}s`], ['RANGE', `${(weapon_range(v)/1000).toFixed(1)}\u00a0km`], ['ARMOUR', through]],
        note,
        action,
        state: on.length ? 'is-equipped' : locked ? 'is-locked' : '',
        art: gun_icon_html(v, 40),
    });
}

// What a hit of the gun keeps through a world's armour, at the tier you own and a Hotter plasma level (yours unless
// given): plating takes a flat part of each hit (armour_hull_damage), so light guns lose most of their bolts to a heavy
// hull; the rail ignores 75% of the armour, the beam 40% (hit_with_weapon). The ARSENAL shows it for the world you head
// for (the guide's target), and the gates ask for it (allowed_world).
function gun_armour_share(v, world, damage_level = upgrades.damage)
{
    const tier = ensure_career().weapon_levels[v.id] || 1;
    const hit = v.damage*(1 + damage_level*hotter_plasma_share)*(1 + (tier - 1)*0.22)*current_ship().damage;
    const pierce = (v.id === 'rail') ? 0.25 : (v.id === 'beam') ? 0.6 : 1;
    return armour_hull_damage({armor: world_armour(world)*pierce}, hit)/hit;
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
        if (guns[i]) {
            turret_draw(draw, guns[i], gun_boxes[points[i].size], 0);
        }
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
        // an empty mount's number is a hollow red ring
        const color = guns[i] ? '#6cf8ec' : '#ff4d5e';
        draw.fillStyle = guns[i] ? color : '#0b1222';
        draw.strokeStyle = color;
        draw.lineWidth = 3;
        draw.shadowColor = color;
        draw.shadowBlur = 12;
        draw.beginPath();
        draw.arc(x, y, 18, 0, Math.PI*2);
        draw.fill();
        draw.stroke();
        draw.shadowBlur = 0;
        draw.fillStyle = guns[i] ? '#032421' : color;
        draw.fillText(String(i + 1), x, y + 1);
    }
}
