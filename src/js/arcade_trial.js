// A try-out of a world, for the developers (the author, 2026-10-19: "one click in the main menu and I am in that
// world, with its raiders and all its tricks, to fly about and see how it behaves"): the menu's panel in its top right
// corner, a button a world; a click starts an arcade run straight in that world, of the kind and level the Arcade row
// has, at the run's step that world has, with the kit the bot brought into it (arcade_trial_kits). It keeps no best.

// The kit the bot's run brought into each world, Haven to Eclipse, after the depot (bin/playtest records it per world
// as `kit`; NORMAL, Free, the mixed build, a run won with no death): its ships and guns, the module levels it owned
// and had in, its Reactor tunings and its supplies
const arcade_trial_kits = [
    {fleet: {ship_id: 'scout', ships: ['scout'], weapon_id: 'plasma', weapons: ['plasma'], weapon_levels: {plasma: 1}, loadouts: {scout: ['plasma']}, gun_count: {plasma: 1}}, owned: {magnet: 1}, fitted: [], reactor: 0, supplies: {medkit: 1, emp: 1, stasis: 1}},
    {fleet: {ship_id: 'courier', ships: ['scout', 'courier'], weapon_id: 'plasma', weapons: ['plasma'], weapon_levels: {plasma: 1}, loadouts: {scout: ['plasma'], courier: ['plasma', 'plasma']}, gun_count: {plasma: 2}}, owned: {damage: 1, spread: 1, armor: 2, magnet: 1, shield: 2}, fitted: ['spread', 'damage', 'armor', 'shield'], reactor: 0, supplies: {medkit: 5, emp: 3, stasis: 0}},
    {fleet: {ship_id: 'courier', ships: ['scout', 'courier'], weapon_id: 'plasma', weapons: ['plasma'], weapon_levels: {plasma: 2}, loadouts: {scout: ['plasma'], courier: ['plasma', 'plasma']}, gun_count: {plasma: 2}}, owned: {damage: 1, spread: 1, armor: 2, magnet: 1, shield: 2}, fitted: ['spread', 'damage', 'armor', 'shield'], reactor: 1, supplies: {medkit: 6, emp: 3, stasis: 0}},
    {fleet: {ship_id: 'gunship', ships: ['scout', 'courier', 'gunship'], weapon_id: 'plasma', weapons: ['plasma'], weapon_levels: {plasma: 3}, loadouts: {scout: ['plasma'], courier: ['plasma', 'plasma'], gunship: ['plasma', 'plasma', 'plasma']}, gun_count: {plasma: 3}}, owned: {damage: 2, spread: 1, armor: 2, magnet: 1, shield: 2}, fitted: ['spread', 'damage', 'armor', 'shield', 'damage', 'armor'], reactor: 1, supplies: {medkit: 8, emp: 2, stasis: 1}},
    {fleet: {ship_id: 'gunship', ships: ['scout', 'courier', 'gunship'], weapon_id: 'plasma', weapons: ['plasma'], weapon_levels: {plasma: 5}, loadouts: {scout: ['plasma'], courier: ['plasma', 'plasma'], gunship: ['plasma', 'plasma', 'plasma']}, gun_count: {plasma: 3}}, owned: {damage: 3, spread: 2, armor: 2, magnet: 1, shield: 2}, fitted: ['spread', 'damage', 'armor', 'shield', 'damage', 'armor', 'spread', 'shield'], reactor: 1, supplies: {medkit: 8, emp: 3, stasis: 0}},
    {fleet: {ship_id: 'gunship', ships: ['scout', 'courier', 'gunship'], weapon_id: 'plasma', weapons: ['plasma'], weapon_levels: {plasma: 5}, loadouts: {scout: ['plasma'], courier: ['plasma', 'plasma'], gunship: ['plasma', 'plasma', 'plasma']}, gun_count: {plasma: 3}}, owned: {damage: 3, spread: 2, armor: 2, magnet: 1, shield: 2}, fitted: ['spread', 'damage', 'armor', 'shield', 'damage', 'armor', 'spread', 'damage'], reactor: 1, supplies: {medkit: 5, emp: 3, stasis: 1}},
    {fleet: {ship_id: 'cruiser', ships: ['scout', 'courier', 'gunship', 'cruiser'], weapon_id: 'plasma', weapons: ['plasma'], weapon_levels: {plasma: 5}, loadouts: {scout: ['plasma'], courier: ['plasma', 'plasma'], gunship: ['plasma', 'plasma', 'plasma'], cruiser: ['plasma', 'plasma', 'plasma', null]}, gun_count: {plasma: 3}}, owned: {damage: 3, spread: 2, armor: 2, magnet: 1, drone: 1, shield: 2}, fitted: ['spread', 'damage', 'armor', 'shield', 'damage', 'armor', 'spread', 'damage', 'shield'], reactor: 1, supplies: {medkit: 8, emp: 3, stasis: 0}},
    {fleet: {ship_id: 'cruiser', ships: ['scout', 'courier', 'gunship', 'cruiser'], weapon_id: 'plasma', weapons: ['plasma'], weapon_levels: {plasma: 5}, loadouts: {scout: ['plasma'], courier: ['plasma', 'plasma'], gunship: ['plasma', 'plasma', 'plasma'], cruiser: ['plasma', 'plasma', 'plasma', 'plasma']}, gun_count: {plasma: 4}}, owned: {damage: 4, spread: 2, armor: 3, magnet: 1, drone: 1, shield: 3}, fitted: ['spread', 'damage', 'armor', 'shield', 'damage', 'armor', 'spread', 'damage', 'shield', 'armor', 'damage'], reactor: 2, supplies: {medkit: 8, emp: 3, stasis: 1}},
];

// The panel: a button a world, its planet and its name
const menu_try_worlds = document.getElementById('menu_try_worlds');
for (let i = 0; i < worlds.length; ++i) {
    const slug = world_slug(i);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'try-world';
    button.title = `Fly ${worlds[i].name} at once, with a kit fit for it; keeps no best`;
    button.innerHTML = `<img alt="" src="${menu_sprite_url(sprite_svgs.worlds?.[slug]?.[`planet-${slug}`])}"><span>${worlds[i].name}</span>`;
    button.addEventListener('click', () => menu_launch('trial', i));
    menu_try_worlds.append(button);
}
menu_try_sync();

// The panel's line: the kind and the level a try-out flies, as the Arcade row has them; nothing before the panel is
// filled (arcade_kind_pick runs as the page loads, before the menu's state is there)
function menu_try_sync()
{
    if (!menu_try_worlds_filled()) {
        return;
    }
    document.getElementById('menu_try_note').textContent = `${arcade_kinds[arcade_scroll.kind].name} · ${(menu_arcade_levels[difficulty] || menu_arcade_levels.normal).name}`;
}

function menu_try_worlds_filled()
{
    return document.getElementById('menu_try_worlds').childElementCount > 0;
}

// A try-out of world `world` (menu_start): an arcade run in it, at its step, with its kit, three lives, no salvage
function arcade_trial_start(world)
{
    const kit = arcade_trial_kits[world] || {fleet: null, owned: {}, fitted: [], reactor: 0, supplies: {medkit: arcade_mode().medkits, emp: 1, stasis: 1}};
    const fleet = kit.fleet ? clone(kit.fleet) : null;
    const ship = ship_catalog.find(v => v.id === fleet?.ship_id) || ship_catalog[0];
    arcade_start(world, {
        world,
        difficulty,
        kind: arcade_scroll.kind,
        lives: arcade_lives,
        score: 0,
        kills: 0,
        salvage: 0,
        run_time: 0,
        upgrades: {},
        owned: {...kit.owned},
        fitted: [...kit.fitted],
        reactor: kit.reactor,
        supplies: {...kit.supplies},
        hp: ship.hull,
        fleet: fleet || {ship_id: 'scout', ships: ['scout'], weapon_id: 'plasma', weapons: ['plasma'], weapon_levels: {plasma: 1}},
        route: Array.from({length: world + 1}, (_, i) => i),
        cards: [],
    });
    arcade.trial = true;
    player.hp = hull_max();
    player.shield = shield_max();
    show_toast('TRY-OUT', `${worlds[world].name.toUpperCase()} · KEEPS NO BEST`, 3);
}
