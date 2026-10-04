// The main menu on the UI kit: the game to continue comes first (its world, ship and progress), the ship and the
// world's planet are the art, and Enter continues it, or starts a campaign when there is nothing to continue
function menu_continue_show(c)
{
    const ship = ship_catalog.find(v => v.id === c.fleet?.ship_id) || ship_catalog[0];
    set_hidden(el.continue_button, false);
    document.getElementById('continue_title').textContent = `${worlds[c.world].name} · ${ship.name}`;
    document.getElementById('continue_detail').textContent = `${c.visited?.length || 1}/${worlds.length} worlds · story ${c.story || 0}/${story.length}`;
    menu_art_sync(c.world, ship.id);
}

// An arcade run lost with a checkpoint: Continue retries its sector
function menu_continue_sector(wave)
{
    set_hidden(el.continue_button, false);
    document.getElementById('continue_title').textContent = `Arcade · sector ${String(wave).padStart(2, '0')}`;
    document.getElementById('continue_detail').textContent = 'Retry from the start of the sector';
}

function menu_art_sync(world, ship_id)
{
    const planet = sprite_svgs.worlds?.[worlds[world].name.toLowerCase().replace(/\s+/g, '-')];
    const planet_text = planet && Object.entries(planet).find(v => v[0].startsWith('planet-'))?.[1];
    const ship = sprite(`3d/ship-${ship_id}`);
    const ship_text = ship && new XMLSerializer().serializeToString(ship.svg);
    for (const [id, text] of [['menu_ship', ship_text], ['menu_planet', planet_text], ['continue_planet', planet_text]]) {
        const img = document.getElementById(id);
        img.src = text ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}` : '';
        set_hidden(img, !text);
    }
}

// The menu's first thing to do takes the focus, so Enter does it: Continue, or a new campaign
function menu_focus()
{
    document.getElementById(el.continue_button.classList.contains('hidden') ? 'start_button' : 'continue_go').focus();
}

function menu_enter()
{
    if (checkpoint && !el.continue_button.classList.contains('hidden')) {
        el.continue_button.click();
    }
    else {
        reset_run();
    }
}
