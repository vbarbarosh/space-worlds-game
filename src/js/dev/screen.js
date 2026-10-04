// Screens: `?screen=` opens one screen of the game straight from the URL, with the dev panel folded, so the layout
// check (bin/layout-check) reaches every screen at every window size.
const dev_screen_options = [
    {value: 'flight', label: 'Flight'},
    {value: 'combat', label: 'Flight in a fight'},
    {value: 'arcade', label: 'Arcade'},
    {value: 'station-jobs', label: 'Station: contracts'},
    {value: 'station-arsenal', label: 'Station: arsenal'},
    {value: 'station-career', label: 'Station: goals'},
    {value: 'station-market', label: 'Station: market'},
    {value: 'map-plan', label: 'Map: mission plan'},
    {value: 'map-local', label: 'Map: world map'},
    {value: 'pause', label: 'Pause'},
    {value: 'menu', label: 'Main menu'},
];
const dev_screen = new URLSearchParams(location.search).get('screen');

function dev_screen_open()
{
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
    if (dev_screen === 'arcade') {
        dev_arcade_start();
        return;
    }
    if (dev_screen === 'combat') {
        for (const [type, a] of [['shooter', -0.5], ['chaser', 0.3], ['chaser', 0.6]]) {
            const enemy = spawn_enemy(type);
            enemy.x = clamp(player.x + Math.cos(player.angle + a)*380, 30, world.w - 30);
            enemy.y = clamp(player.y + Math.sin(player.angle + a)*380, 30, world.h - 30);
        }
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
    if (dev_screen === 'pause') {
        toggle_pause();
    }
}
