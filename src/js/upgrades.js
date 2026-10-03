const upgrade_options = [
    {
        key: 'magnet',
        icon: '⌁',
        title: 'Artifact magnet',
        description: 'Always active. +110 px attraction range and stronger pull per level. Seven levels: 155 → 815 px.',
        cap: 7,
        cost: 32,
        group: 'utility',
    },
    {key: 'drone', icon: '✧', title: 'Orbit drones', description: 'Add an orbiting companion that targets nearby enemies.', cap: 3, cost: 65, group: 'weapon'},
    {
        key: 'shield',
        icon: '⬡',
        title: 'Shield capacitor',
        description: 'Add 25 regenerating shield. Recharges after 5 safe seconds.',
        cap: 3,
        cost: 44,
        group: 'defense',
    },
    {
        key: 'nanites',
        icon: '✚',
        title: 'Repair nanites',
        description: 'Regenerate 0.35 hull / second per level after 5 safe seconds.',
        cap: 3,
        cost: 60,
        group: 'defense',
    },
    {
        key: 'homing',
        icon: '⤴',
        title: 'Guided plasma',
        description: 'Your bolts curve toward targets. More levels improve tracking.',
        cap: 2,
        cost: 55,
        group: 'weapon',
    },
    {
        key: 'reactor',
        icon: 'ϟ',
        title: 'Pulse reactor',
        description: 'Passively regenerate 1.5 pulse energy / second per level.',
        cap: 3,
        cost: 42,
        group: 'utility',
    },
    {key: 'salvager', icon: '◆', title: 'Relic processor', description: 'Artifacts yield 25% more salvage per level.', cap: 3, cost: 35, group: 'utility'},
    {
        key: 'dash',
        icon: '»',
        title: 'Turbo drive',
        description:
            '+20% turbo thrust and −0.9s full reservoir recharge per level. Hold Shift for thrust; release to stop. Faster reservoir recharge per level.',
        cap: 3,
        cost: 70,
        group: 'utility',
    },
    {
        key: 'turbo_tank',
        icon: '▰',
        title: 'Booster reservoir',
        description: '+3 seconds of continuous turbo flight per level. Recharges from the remaining level when thrust stops; docking refills it.',
        cap: 4,
        cost: 65,
        group: 'utility',
    },
    {
        key: 'radshield',
        icon: '☢',
        title: 'Radiation lining',
        description: '+20 percentage points of radiation protection per level, up to 98% with hull protection. Ordinary shields do not block radiation.',
        cap: 4,
        cost: 90,
        group: 'defense',
    },
    {
        key: 'stabilizer',
        icon: '⊞',
        title: 'Vector stabilizers',
        description: '+30% steering response and +40% braking per level. Counter currents and frozen inertia.',
        cap: 3,
        cost: 60,
        group: 'utility',
    },
    {
        key: 'cooling',
        icon: '❄',
        title: 'Reactor cooling',
        description: '+5 heat cooling per second per level; reduces turbo heat and improves cold-world shield recharge.',
        cap: 3,
        cost: 75,
        group: 'defense',
    },
    {key: 'spread', icon: '⋔', title: 'Prism cannon', description: 'Two additional bolts per shot. Cover a wider arc.', cap: 2, cost: 75, group: 'weapon'},
    {key: 'damage', icon: '↗', title: 'Hotter plasma', description: '+5 damage per bolt. Break heavy hulls faster.', cap: 5, cost: 38, group: 'weapon'},
    {key: 'rate', icon: '≋', title: 'Rapid resonance', description: '15% faster firing per level. Keep the pressure on.', cap: 3, cost: 45, group: 'weapon'},
    {key: 'speed', icon: '➤', title: 'Slipstream', description: '15% more movement speed per level.', cap: 3, cost: 30, group: 'utility'},
    {key: 'armor', icon: '◇', title: 'Phase armor', description: '12% less incoming damage per level.', cap: 3, cost: 46, group: 'defense'},
    {
        key: 'pulse',
        icon: '◎',
        title: 'Pulse amplifier',
        description: 'Charge faster on kills. Expand your pulse and its damage.',
        cap: 3,
        cost: 42,
        group: 'weapon',
    },
];
const supply_options = [
    {key: 'medkit', icon: '✚', title: 'Repair kit', description: 'Q / restore 40 hull. Use only when damaged.', cost: 20, cap: 8, group: 'defense'},
    {key: 'emp', icon: '⊛', title: 'EMP charge', description: 'E / clear all enemy bullets and blast nearby enemies.', cost: 26, cap: 8, group: 'weapon'},
    {key: 'stasis', icon: '◷', title: 'Stasis cell', description: 'F / slow enemies and their bullets for 8 seconds.', cost: 24, cap: 8, group: 'utility'},
];
function drop_pickup(x, y, type, value = 0)
{
    pickups.push({x: clamp(x, 25, world.w - 25), y: clamp(y, 25, world.h - 25), type, value, life: (type === 'artifact') ? 36 : 28, phase: rand(0, 6.28)});
}

function collect_pickup(v, quiet = false)
{
    explode(v.x, v.y, 14, pickup_color(v), 0, 'spark');
    if (v.type === 'cargo') {
        cargo_collect(v, quiet);
    }
    else if (v.type === 'artifact') {
        const amount = Math.ceil(v.value*(1 + upgrades.salvager*0.25));
        salvage += amount;
        artifacts_count++;
        score += 25;
        player.energy = Math.min(100, player.energy + 2);
        if (!quiet) {
            label(v.x, v.y, '◆ +' + amount, gold);
        }
    }
    else if (v.type === 'health') {
        player.hp = Math.min(hull_max(), player.hp + 18);
        if (!quiet) {
            label(v.x, v.y, '+18 HULL');
        }
    }
    else if (v.type === 'energy') {
        player.energy = Math.min(100, player.energy + 25);
        if (!quiet) {
            label(v.x, v.y, '+25 PULSE', pink);
        }
    }
    else if (supplies[v.type] !== undefined) {
        supplies[v.type] = Math.min(8, supplies[v.type] + 1);
        if (!quiet) {
            label(v.x, v.y, '+' + v.type.toUpperCase(), blue);
        }
    }
    v.life = 0;
    if (!quiet) {
        sfx('pickup');
    }
}

function grant_upgrade(v)
{
    upgrades[v.key]++;
    if (v.key === 'shield') {
        player.shield = shield_max();
    }
    if (v.key === 'turbo_tank') {
        player.turbo_fuel = turbo_duration();
    }
    sfx('upgrade');
    update_hud();
}

function module_cost(v)
{
    return Math.round(v.cost*(1 + upgrades[v.key]*0.48));
}

function render_draft()
{
    el.choices.replaceChildren();
    if (dock_free_chosen) {
        const note = document.createElement('p');
        note.className = 'fine';
        note.textContent = 'Free module already installed at this checkpoint.';
        el.choices.append(note);
        return;
    }
    const options = dock_free_keys.map(v => upgrade_options.find(vv => vv.key === v)).filter(Boolean);
    for (const option of options) {
        const b = document.createElement('button');
        b.className = 'choice';
        b.disabled = dock_free_chosen;
        b.innerHTML =
            '<span class="icon">' +
            option.icon +
            '</span><b>' +
            option.title +
            ' <small>Lv ' +
            (upgrades[option.key] + 1) +
            '</small></b><span>' +
            option.description +
            '</span>';
        b.addEventListener('click', function () {
            if ((state !== 'upgrade') || dock_free_chosen) {
                return;
            }
            grant_upgrade(option);
            dock_free_chosen = true;
            b.classList.add('selected');
            for (const c of Array.from(el.choices.children)) {
                c.disabled = true;
            }
            dock_message = option.title + ' installed. Spend salvage or launch when ready.';
            render_shop();
            save_checkpoint('dock');
        });
        el.choices.append(b);
    }
}

function base_render_shop()
{
    el.shop_wallet.textContent = salvage;
    el.shop_grid.replaceChildren();
    for (const v of upgrade_options.concat(supply_options).filter(v => (shop_filter === 'all') || (v.group === shop_filter))) {
        const is_supply = supplies[v.key] !== undefined;
        const level = is_supply ? supplies[v.key] : upgrades[v.key];
        const price = is_supply ? v.cost : module_cost(v);
        const capped = level >= v.cap;
        const card = document.createElement('div');
        card.className = 'shop-item';
        card.innerHTML =
            '<b>' +
            v.icon +
            ' &nbsp;' +
            v.title +
            '</b><span class="item-level">' +
            (is_supply ? 'IN CARGO ' + level + ' / ' + v.cap : 'LEVEL ' + level + ' / ' + v.cap) +
            '</span><p>' +
            v.description +
            '</p>';
        const b = document.createElement('button');
        b.disabled = !dock_free_chosen || capped || (salvage < price);
        b.textContent = capped ? 'FULLY STOCKED' : (is_supply ? 'BUY' : 'INSTALL') + ' · ◆ ' + price;
        b.addEventListener('click', function () {
            if ((state !== 'upgrade') || !dock_free_chosen || (salvage < price) || (level >= v.cap)) {
                return;
            }
            salvage -= price;
            if (is_supply) {
                supplies[v.key]++;
                sfx('pickup');
            }
            else {
                grant_upgrade(v);
            }
            dock_message = v.title + (is_supply ? ' added to cargo.' : ' installed.');
            render_shop();
            save_checkpoint('dock');
            update_hud();
        });
        card.append(b);
        el.shop_grid.append(card);
    }
    el.dock_status.textContent = dock_message;
    el.next_sector.disabled = !dock_free_chosen;
    el.next_sector.textContent = 'LAUNCH SECTOR ' + String(wave + 1).padStart(2, '0') + ' ↗';
    update_hud();
}

function choose_upgrade(restored = false)
{
    state = 'upgrade';
    stop_turbo();
    touch_boost_hold = false;
    keys.clear();
    joystick.active = false;
    mouse_drive.active = false;
    mouse_drive.following = false;
    hostile = [];
    bullets = [];
    hazards = [];
    combo_timer = 0;
    combo = 1;
    set_hidden(el.bossbar, true);
    el.toast.classList.remove('show');
    if (!restored) {
        for (const v of pickups.filter(v => (v.life > 0) && !v.cache)) {
            collect_pickup(v, true);
        }
        pickups = [];
        player.hp = Math.min(hull_max(), player.hp + 30);
        player.shield = shield_max();
        const reward = 30 + wave*5;
        salvage += reward;
        dock_free_chosen = false;
        dock_message = 'Choose your free module above. Sector bonus: ◆ ' + reward + '.';
        const options = upgrade_options.filter(v => upgrades[v.key] < v.cap);
        for (let i = options.length - 1; i > 0; --i) {
            const j = Math.floor(Math.random()*(i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }
        if ((wave === 1) && (upgrades.magnet < 3)) {
            const index = options.findIndex(v => v.key === 'magnet');
            if (index >= 0) {
                [options[0], options[index]] = [options[index], options[0]];
            }
        }
        dock_free_keys = options.slice(0, 3).map(v => v.key);
        if (!dock_free_keys.length) {
            dock_free_chosen = true;
            salvage += 50;
            dock_message = 'All modules installed. Bonus salvage: ◆ 50.';
        }
    }
    shop_filter = 'all';
    for (const v of document.querySelectorAll('[data-filter]')) {
        v.classList.toggle('selected', v.dataset.filter === 'all');
    }
    el.dock_summary.textContent =
        'Sector ' + String(wave).padStart(2, '0') + ' cleared · +30 hull · ' + format_time(run_time) + ' elapsed. Select one free module, then shop.';
    render_draft();
    render_shop();
    set_hidden(el.upgrade_overlay, false);
    save_checkpoint('dock');
    sfx('upgrade');
    if (el.choices.firstElementChild && !dock_free_chosen) {
        el.choices.firstElementChild.focus();
    }
    else {
        el.next_sector.focus();
    }
}
el.next_sector.addEventListener('click', undock);
for (const v of document.querySelectorAll('[data-filter]')) {
    v.addEventListener('click', function () {
        shop_filter = v.dataset.filter;
        for (const b of document.querySelectorAll('[data-filter]')) {
            b.classList.toggle('selected', b === v);
        }
        render_shop();
    });
}
function use_supply(key)
{
    if ((state !== 'playing') || !supplies[key]) {
        return;
    }
    if (key === 'medkit') {
        if (player.hp >= hull_max()) {
            return;
        }
        supplies.medkit--;
        player.hp = Math.min(hull_max(), player.hp + 40);
        burst(player.x, player.y, cyan, 25, 140);
        label(player.x, player.y - 25, '+40 HULL');
        sfx('pickup');
    }
    if (key === 'emp') {
        supplies.emp--;
        hostile = [];
        ring(player.x, player.y, blue, 650, 0.65);
        burst(player.x, player.y, blue, 45, 350);
        for (const v of enemies.slice()) {
            if (distance(v, player) < 650) {
                damage_enemy(v, (v.type === 'boss') ? 400 : 160 + wave*12);
            }
        }
        player.invincible = Math.max(player.invincible, 0.6);
        sfx('pulse');
    }
    if (key === 'stasis') {
        if (stasis_time > 0) {
            return;
        }
        supplies.stasis--;
        stasis_time = 8;
        ring(player.x, player.y, blue, Math.max(W, H), 1);
        sfx('dash');
        show_toast('TIME DILATED', 'STASIS FIELD / 8 SECONDS', 1.8);
    }
    update_hud();
}
