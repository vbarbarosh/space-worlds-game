// Feltmere's try-out, from the main menu: a game made up on the spot in Feltmere, flying the felt rocket, so one can go
// in, play and see the world. Nothing of it is saved: the campaign's checkpoint is put back at once, as the arcade does,
// and save_checkpoint and the save slots leave it alone while the try-out runs. The pause panel's Main menu ends it.
const tryout = {active: false, starting: false};

function tryout_start()
{
    const world = worlds.findIndex((v, i) => world_slug(i) === 'felt');
    const ship = ship_catalog.find(v => v.id === 'rocket');
    const extent = world_extents[world];
    const campaign_checkpoint = checkpoint;
    arcade_stop();
    checkpoint = {
        version: 4,
        wave: worlds[world].wave,
        score: 0,
        kills: 0,
        salvage: 1500,
        artifacts_count: 0,
        run_time: 0,
        upgrades: initial_upgrades(),
        supplies: {medkit: 3, emp: 2, stasis: 2},
        difficulty,
        hp: ship.hull,
        energy: 100,
        // beside the Camper Dock, below it
        position: {x: extent[0]/2, y: extent[1]/2 + 700, size: {w: extent[0], h: extent[1]}},
        campaign: {
            world,
            story: 0,
            contracts: [],
            completed: 0,
            visited: [0, world],
            cargo: {ore: 0, cells: 0, relics: 0},
            maps: {},
            serial: 0,
            board: 0,
            xp: rank_thresholds[ship.rank],
            fleet: {ship_id: ship.id, ships: [ship.id], weapon_id: 'plasma', weapons: ['plasma'], weapon_levels: {plasma: 1}},
        },
    };
    // reset_run ends any try-out but the one it is starting (tryout_reset)
    tryout.starting = true;
    reset_run(true);
    checkpoint = campaign_checkpoint;
    show_world_arrival();
    show_toast('A TRY-OUT', 'NOTHING HERE IS SAVED · PAUSE, THEN MAIN MENU, TO GO BACK', 5);
}

// Called as every run starts (reset_run): a try-out lasts until another game starts, from the menu, a load or a restart
function tryout_reset()
{
    tryout.active = tryout.starting;
    tryout.starting = false;
}

// A try-out lost: no tow to a station, it starts again (the restart button, finish) or goes back to the menu, whose
// Continue shows the campaign again
function tryout_finish()
{
    set_hidden(document.getElementById('retry_sector'), true);
    el.result_sector.textContent = worlds[campaign.world].name;
    el.result_description.textContent = 'The try-out ends here. Fly again, or go back to the main menu: your campaign is as you left it.';
    if (checkpoint) {
        menu_continue_show(checkpoint.campaign);
    }
    document.getElementById('restart_button').focus();
}
