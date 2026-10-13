// Screens: `?screen=` opens one screen of the game straight from the URL, with the dev panel folded, so the layout
// check (bin/layout-check) reaches every screen at every window size.
const dev_screen_options = [
    {value: 'flight', label: 'Flight'},
    {value: 'combat', label: 'Flight in a fight'},
    {value: 'arcade', label: 'Arcade'},
    {value: 'crowded', label: 'Arcade: arrival in a fight, a burst of news'},
    {value: 'arcade-world-cleared', label: 'Arcade: world cleared'},
    {value: 'arcade-cleared', label: 'Arcade: depot after a world'},
    {value: 'arcade-finale', label: 'Arcade: finale'},
    {value: 'rocks', label: 'Facing a mining field'},
    {value: 'station-jobs', label: 'Station: contracts'},
    {value: 'station-arsenal', label: 'Station: arsenal'},
    {value: 'station-outfit', label: 'Station: modules'},
    {value: 'station-career', label: 'Station: goals'},
    {value: 'station-market', label: 'Station: market'},
    {value: 'station-hangar', label: 'Station: hangar'},
    {value: 'map-plan', label: 'Map: mission plan'},
    {value: 'map-local', label: 'Map: world map'},
    {value: 'map-worlds', label: 'Map: worlds and lanes'},
    {value: 'pause', label: 'Pause'},
    {value: 'menu', label: 'Main menu'},
    {value: 'menu-felt', label: 'Main menu: Feltmere\'s try-out open'},
];
const dev_screen = new URLSearchParams(location.search).get('screen');
// read at load: starting the scene rewrites the URL
const dev_screen_modules = new URLSearchParams(location.search).get('modules') || '';
// &t=7.5 holds the finale (or a world's cleared screen) at one moment
const dev_screen_time = new URLSearchParams(location.search).get('t');
// The crowded screen's burst: the news of a busy arrival, danger among it, the same title twice, a long line
const dev_screen_news = [
    ['DEPOT SHIELDED', 'RAIDERS NEAR THE STATION · CLEAR THEM AND IT OPENS', 'info'],
    ['MARKSMEN', 'A DASHED LINE IS WHERE THEY AIM · TURN OFF IT', 'danger'],
    ['MISSILES', 'A DASH IS NO SHIELD FROM THE BLAST · OUTTURN THEM', 'danger'],
    ['SALVAGE ◆', 'SPEND IT AT THE STATION · FLY IN AND PRESS R', 'info'],
    ['ACE DOWN', 'Its salvage is yours · ◆ 120', 'income'],
    ['DRONE LOST', '2 LEFT / REPLACE THEM AT A STATION', 'danger'],
    ['DRONE LOST', '1 LEFT / REPLACE THEM AT A STATION', 'danger'],
    ['RAID ON YOUR MINING OUTPOST AT THE FAR SIDE OF THE NEBULA', 'A_PATH_WITH_NO_SPACES_AT_ALL_TO_BREAK_IT · 1240 m AWAY · DEFEND IT BEFORE THEY TEAR IT DOWN', 'danger'],
];

function dev_screen_open()
{
    dev_screen_modules_set();
    if (!dev_screen_options.some(v => v.value === dev_screen)) {
        return;
    }
    if (!dev_layout.collapsed) {
        dev_panel_collapse_toggle();
    }
    if (dev_screen === 'menu') {
        menu_open();
        return;
    }
    if (dev_screen === 'menu-felt') {
        menu_open();
        menu_scene('felt');
        return;
    }
    if (dev_screen === 'arcade') {
        dev_arcade_start();
        dev_screen_modules_set();
        return;
    }
    // the author's moment: the world's title over a fight that has just begun, and a burst of news at once
    if (dev_screen === 'crowded') {
        dev_arcade_start();
        dev_screen_modules_set();
        dev_screen_raiders();
        show_world_arrival();
        for (const [title, sub, kind] of dev_screen_news) {
            show_toast(title, sub, 3.5, kind);
        }
        return;
    }
    if (dev_screen === 'arcade-finale') {
        dev_arcade_start();
        dev_screen_modules_set();
        campaign.world = arcade_worlds - 1;
        score = 556825;
        kills = 700;
        run_time = 824;
        salvage = 455;
        finale.frozen = (dev_screen_time === null) ? null : Number(dev_screen_time);
        arcade_finish(true);
        return;
    }
    if (dev_screen === 'arcade-cleared') {
        dev_arcade_start();
        dev_screen_modules_set();
        player.hp = hull_max()*0.32;
        salvage = 375;
        arcade_world_clear();
        finale_leave('depot');
        return;
    }
    if (dev_screen === 'arcade-world-cleared') {
        dev_arcade_start();
        dev_screen_modules_set();
        // the eighth world ends in the finale instead
        campaign.world = Math.min(campaign.world, arcade_worlds - 2);
        arcade.world_start = {score: 18400, kills: 41, run_time: 512};
        score = 31960;
        kills = 77;
        run_time = 761;
        salvage = 375;
        finale.frozen = (dev_screen_time === null) ? null : Number(dev_screen_time);
        arcade_world_clear();
        return;
    }
    if (dev_screen === 'rocks') {
        // a kilometre east of the first mining field, nose to it, still
        const field = mining_fields[0];
        player.x = field.x + 1000;
        player.y = field.y;
        player.angle = Math.PI;
        player.vx = player.vy = 0;
        update_camera(0, true);
        return;
    }
    if (dev_screen === 'combat') {
        dev_screen_raiders();
        return;
    }
    if (dev_screen.startsWith('station-')) {
        player.x = station.x;
        player.y = station.y + 120;
        dock_station();
        station_tab_open(dev_screen.slice('station-'.length));
        return;
    }
    if (dev_screen === 'map-plan') {
        open_mission_plan();
        return;
    }
    if (dev_screen === 'map-local') {
        open_local_world_map();
        return;
    }
    if (dev_screen === 'map-worlds') {
        open_map();
        return;
    }
    if (dev_screen === 'pause') {
        toggle_pause();
    }
}

// Three raiders 380 m ahead of you
function dev_screen_raiders()
{
    for (const [type, a] of [['shooter', -0.5], ['chaser', 0.3], ['chaser', 0.6]]) {
        const enemy = spawn_enemy(type);
        enemy.x = clamp(player.x + Math.cos(player.angle + a)*380, 30, world.w - 30);
        enemy.y = clamp(player.y + Math.sin(player.angle + a)*380, 30, world.h - 30);
    }
}

// &modules=evasive:3,speed:2 sets module levels for the screen (again after an arcade start, which resets them)
function dev_screen_modules_set()
{
    for (const pair of dev_screen_modules.split(',').filter(Boolean)) {
        const [key, level] = pair.split(':');
        if (Object.hasOwn(upgrades, key)) {
            upgrades[key] = Number(level) || 0;
        }
    }
}
