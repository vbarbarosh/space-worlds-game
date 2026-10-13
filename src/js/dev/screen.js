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
    {value: 'race', label: 'Race: lined up, the count'},
    {value: 'race-mid', label: 'Race: mid-race, the standings'},
    {value: 'race-finish', label: 'Race: over the line, the results'},
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
    if (dev_screen.startsWith('race')) {
        dev_race_open(dev_screen);
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

// A ring race straight from the URL (js/race.js): its contract taken in this world and you in your place on the start
// line, the count about to run (race), everyone along the course (race-mid), or you over the line (race-finish).
// &race_long=1 gives a rival a very long name, &race_left=1 leaves one rival in the race, &race_place=1, 2, 3 or last
// sets your place at the finish, &race_raiders=1 brings raiders to the start line
const dev_race_params = new URLSearchParams(location.search);

function dev_race_open(screen)
{
    const offer = race_offer(campaign.world, 1);
    if (!offer) {
        show_toast('NO RACE HERE', 'NO COURSE FITS THIS WORLD', 3);
        return;
    }
    if (dev_race_params.get('race_long') === '1') {
        offer.race.rivals[1].name = 'Maximiliana Wolkenkratzer-Abernathy of the Outer Rim Racing Guild';
    }
    const m = contract_copy({...offer, level: 1, reward: offer.race.top});
    campaign.contracts = [m];
    campaign.tracked_id = m.id;
    race_grid_set(m);
    const you = race_you();
    player.x = you.slot.x;
    player.y = you.slot.y;
    player.angle = m.race.start.angle;
    player.vx = 0;
    player.vy = 0;
    const rivals = race.racers.filter(v => !v.you);
    for (const v of rivals) {
        v.alpha = 1;
    }
    if (dev_race_params.get('race_left') === '1') {
        for (const v of rivals.slice(0, -1)) {
            v.out = true;
        }
    }
    if (dev_race_params.get('race_raiders') === '1') {
        for (const [type, a] of [['shooter', -0.4], ['chaser', 0], ['chaser', 0.4]]) {
            const enemy = spawn_enemy(type);
            enemy.x = player.x + Math.cos(m.race.start.angle + a)*800;
            enemy.y = player.y + Math.sin(m.race.start.angle + a)*800;
        }
    }
    if (screen !== 'race') {
        race_go(m);
        dev_race_spread(m, screen === 'race-finish');
    }
    update_camera(0, true);
    update_hud();
}

// Everyone along the course: you on the way to ring 3, the best rival a ring ahead, the rest behind; or, at the
// finish, you over the line in the place the URL asks, the rivals before you over it already
function dev_race_spread(m, finish)
{
    const rings = m.race.rings;
    const you = race_you();
    const rivals = race.racers.filter(v => !v.you).sort((a, b) => b.skill - a.skill);
    function place(v, next, along) {
        const i = Math.min(next, rings.length - 1);
        const from = i ? rings[i - 1] : m.race.start;
        const to = rings[i];
        v.next = next;
        v.x = from.x + (to.x - from.x)*along;
        v.y = from.y + (to.y - from.y)*along;
        v.angle = Math.atan2(to.y - from.y, to.x - from.x);
        v.vx = Math.cos(v.angle)*(v.pace || 300);
        v.vy = Math.sin(v.angle)*(v.pace || 300);
        return v;
    }
    race.clock = m.race.par*(finish ? 1.04 : 0.45);
    if (!finish) {
        place(you, 2, 0.62);
        player.x = you.x;
        player.y = you.y;
        player.angle = you.angle;
        player.vx = you.vx;
        player.vy = you.vy;
        m.progress = 2;
        const spots = [[3, 0.3], [2, 0.88], [2, 0.3], [1, 0.7]];
        for (let i = 0; i < rivals.length; ++i) {
            place(rivals[i], ...spots[i]);
            rivals[i].delay = 0;
        }
        return;
    }
    const wanted = dev_race_params.get('race_place') || '2';
    const ahead = (wanted === 'last') ? rivals.length : clamp(Number(wanted) - 1, 0, rivals.length);
    for (let i = 0; i < rivals.length; ++i) {
        if (i < ahead) {
            place(rivals[i], rings.length, 1);
            rivals[i].x += Math.cos(rivals[i].angle)*(220 + 160*i);
            rivals[i].y += Math.sin(rivals[i].angle)*(220 + 160*i);
            rivals[i].time = race.clock - 3.1 + i*1.4;
        }
        else {
            place(rivals[i], rings.length - 1, 0.55 - 0.18*(i - ahead));
            rivals[i].delay = 0;
        }
    }
    place(you, rings.length - 1, 1);
    you.next = rings.length;
    you.time = race.clock;
    player.x = you.x + Math.cos(you.angle)*80;
    player.y = you.y + Math.sin(you.angle)*80;
    player.angle = you.angle;
    player.vx = you.vx*0.6;
    player.vy = you.vy*0.6;
    race_you_finish(m);
}
