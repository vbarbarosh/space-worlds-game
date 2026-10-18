// Screens: `?screen=` opens one screen of the game straight from the URL, with the dev panel folded, so the layout
// check (bin/layout-check) reaches every screen at every window size.
const dev_screen_options = [
    {value: 'flight', label: 'Flight'},
    {value: 'combat', label: 'Flight in a fight'},
    {value: 'arcade', label: 'Arcade'},
    {value: 'crowded', label: 'Arcade: arrival in a fight, a burst of news'},
    {value: 'arcade-world-cleared', label: 'Arcade: world cleared'},
    {value: 'arcade-cleared', label: 'Arcade: depot after a world'},
    {value: 'arcade-pick', label: 'Arcade: the break, a card to take'},
    {value: 'arcade-route', label: 'Arcade: the break, the next world'},
    {value: 'arcade-finale', label: 'Arcade: finale'},
    {value: 'arcade-lost', label: 'Arcade: lost, retry the world'},
    {value: 'rocks', label: 'Facing a mining field'},
    {value: 'race', label: 'Race: lined up, the count'},
    {value: 'race-mid', label: 'Race: mid-race, the standings'},
    {value: 'race-finish', label: 'Race: over the line, the results'},
    {value: 'race-results', label: 'Races mode: the results'},
    {value: 'races-turbo', label: 'Races mode, Turbo: lined up, the count'},
    {value: 'races-turbo-mid', label: 'Races mode, Turbo: on the turbo into a bend'},
    {value: 'station-jobs', label: 'Station: contracts'},
    {value: 'station-arsenal', label: 'Station: arsenal'},
    {value: 'station-outfit', label: 'Station: modules'},
    {value: 'station-career', label: 'Station: goals'},
    {value: 'station-market', label: 'Station: market'},
    {value: 'station-intel', label: 'Station: trade intel'},
    {value: 'station-hangar', label: 'Station: hangar'},
    {value: 'map-plan', label: 'Map: mission plan'},
    {value: 'map-local', label: 'Map: world map'},
    {value: 'map-worlds', label: 'Map: worlds and lanes'},
    {value: 'pause', label: 'Pause'},
    {value: 'menu', label: 'Main menu'},
];
const dev_screen = new URLSearchParams(location.search).get('screen');
// &wave=n with &screen=arcade (dev_screen_arcade_wave), read before the scenario writes the URL over
const dev_screen_wave = clamp(Math.round(Number(new URLSearchParams(location.search).get('wave')) || 1), 1, 3);
// read at load: starting the scene rewrites the URL
const dev_screen_modules = new URLSearchParams(location.search).get('modules') || '';
// &play_log=full or empty: the play log on the pause panel (dev_screen_play_log_set), read at load too
const dev_screen_play_log = new URLSearchParams(location.search).get('play_log');
// &t=7.5 holds the finale (or a world's cleared screen) at one moment
const dev_screen_time = new URLSearchParams(location.search).get('t');
// &save=none, &slots=1 and &row=arcade: the menu with no game to continue, with saved slots (its Load row), with a row
// open (dev_screen_menu_open)
const dev_screen_save = new URLSearchParams(location.search).get('save');
const dev_screen_slots = new URLSearchParams(location.search).get('slots');
const dev_screen_row = new URLSearchParams(location.search).get('row');
// &contracts=full and &cargo=all: the station's crowded states (dev_screen_station_set)
const dev_screen_contracts = new URLSearchParams(location.search).get('contracts');
const dev_screen_cargo = new URLSearchParams(location.search).get('cargo');
// &station=full: the station's header and NEXT strip at their longest (dev_screen_station_set)
const dev_screen_station = new URLSearchParams(location.search).get('station');
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
        dev_screen_menu_open();
        return;
    }
    if (dev_screen === 'arcade') {
        dev_arcade_start();
        dev_screen_modules_set();
        dev_screen_arcade_wave();
        dev_raiders_open();
        dev_break_card_hud();
        return;
    }
    // the break between worlds (src/js/dev/arcade_break.js)
    if (['arcade-pick', 'arcade-route'].includes(dev_screen)) {
        dev_break_open(dev_screen);
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
        arcade.route = [0, 2, 1, 3, 4, 6, 5, 7];
        score = 556825;
        kills = 700;
        run_time = 824;
        salvage = 455;
        finale.frozen = (dev_screen_time === null) ? null : Number(dev_screen_time);
        arcade_finish(true);
        return;
    }
    // a death on the last wave of the world, at the run's longest numbers: Retry the world, a new run, the menu
    if (dev_screen === 'arcade-lost') {
        dev_arcade_start();
        dev_screen_modules_set();
        arcade.world = campaign.world;
        arcade.world_start = {score, kills, run_time, snapshot: arcade_snapshot()};
        arcade.wave = arcade_waves;
        score = 1556825;
        kills = 1700;
        run_time = 5824;
        salvage = 99455;
        player.hp = 0;
        finish(false);
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
        arcade.route = arcade.route.slice(0, campaign.world + 1);
        arcade.world_start = {score: 18400, kills: 41, run_time: 512};
        score = 31960;
        kills = 77;
        run_time = 761;
        salvage = 375;
        finale.frozen = (dev_screen_time === null) ? null : Number(dev_screen_time);
        arcade_world_clear();
        return;
    }
    if (dev_screen.startsWith('races-turbo')) {
        dev_races_turbo_open(dev_screen);
        return;
    }
    if (dev_screen === 'race-results') {
        dev_race_results_open();
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
        dev_screen_station_set();
        station_tab_open(dev_screen.slice('station-'.length));
        return;
    }
    if (dev_screen === 'map-plan') {
        dev_screen_station_set();
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
        dev_screen_play_log_set();
        toggle_pause();
    }
}

// &play_log=full fills the play log to its cap with sessions like the one being played, &play_log=empty clears it: the
// pause panel's longest line and its empty one (bin/layout-check)
function dev_screen_play_log_set()
{
    const kind = dev_screen_play_log;
    if (kind === 'empty') {
        play_log_clear();
        play_log_trash = null;
    }
    if (kind === 'full') {
        play_log_tally.s = 60;
        play_log_tally.flight_s = 60;
        const record = play_log_record_make(false);
        play_log_tally_reset();
        for (let i = 0; (i < 50) && !play_log_index.dropped; ++i) {
            const session = {...play_log_session, id: `dev-${i}`, run: `dev-${i}`, played_s: 400*60, records: Array(400).fill(record), ended: new Date().toISOString(), end_reason: 'made up by the dev page'};
            play_log_index.played_s += session.played_s;
            play_log_store(session);
        }
    }
}

// The menu as a player meets it: with a game to continue (the dev scene's own save, the Continue row open) or, with
// &save=none, a first launch with none (in memory only: the dev page's storage keeps the save); &slots=1 adds six
// saved slots, the longest names among them (the Load row, and its scene opened by &row=load); &row=arcade (campaign,
// continue, load, settings or controls) opens that row, as its click does. The slots are written for the menu's first
// look and taken back out after it, so the dev page's storage keeps what it had
function dev_screen_menu_open()
{
    const kept = localStorage.getItem('pulse_drift_saves_v1');
    if (dev_screen_slots === '1') {
        dev_screen_slots_write();
        sync_load_button();
    }
    if (dev_screen_save === 'none') {
        checkpoint = null;
        set_hidden(el.continue_row, true);
    }
    menu_open();
    // &race_kind=turbo: the Races row with Turbo picked
    if (dev_race_params.get('race_kind')) {
        race_mode_kind_pick(dev_race_params.get('race_kind'));
    }
    const mode = document.querySelector(`#menu_modes .mode[data-scene="${dev_screen_row}"]`);
    if (mode && !mode.closest('.hidden')) {
        mode.focus();
        menu_scene(dev_screen_row);
    }
    if (dev_screen_slots === '1') {
        if (kept === null) {
            localStorage.removeItem('pulse_drift_saves_v1');
        }
        else {
            localStorage.setItem('pulse_drift_saves_v1', kept);
        }
    }
}

// Six slots made from the dev scene's save: the longest world and ship names, a salvage in the millions, an arcade run
function dev_screen_slots_write()
{
    save_checkpoint();
    const now = Date.now();
    const slots = [['Nova Forge', 'Viper Interceptor'], ['Cryosphere', 'Bastion Gunship'], ['Haven', 'Wisp Scout'], ['Obsidian', 'Mule Prospector'], ['Ion Reach', 'Kestrel Courier']].map(function ([world, ship], i) {
        return {saved_at: now - i*3600e3, world, story: `${12 - i}/${story.length}`, ship, salvage: 1234567 - i*1000, checkpoint: JSON.parse(JSON.stringify(checkpoint))};
    });
    slots.push({saved_at: now - 90e3, world: 'Eclipse', story: 'arcade', ship: 'Aurora Cruiser', salvage: 455, arcade: {world: 7, score: 556825}});
    localStorage.setItem('pulse_drift_saves_v1', JSON.stringify(slots));
}

// The station's crowded states, the mission plan's too. &contracts=full: three contracts taken (a story chapter
// followed, one with a very long title and paragraph, one finished), a goal followed, and the longest board offered:
// rank Ace (its bounty and expedition), a side mission with a very long title and paragraph among them. &cargo=all:
// every one of the eleven goods in the hold. &station=full: the header and the NEXT strip at their longest: a station
// name far longer than any world's, the hold full, salvage in the millions, and the guide's longest step (every mining
// drone lost, sent to the station by its long name) with its button
function dev_screen_station_set()
{
    if (dev_screen_station === 'full') {
        worlds[campaign.world].station = 'Snowflake research dock and relief yard of the outer ring, berth seven';
        document.getElementById('station_title').textContent = worlds[campaign.world].station;
        salvage = 12345678;
        const dev_base_guide_context = guide_context;
        guide_context = function () {
            const name = worlds[campaign.world].station;
            return {
                ...dev_base_guide_context(),
                goal: {...station, label: name},
                kind: 'prepare',
                action: 'Open modules',
                instruction: `Your mining drones are all lost. Dock at ${name} and buy new ones in MODULES, then come back to the field.`,
            };
        };
    }
    if (dev_screen_contracts === 'full') {
        campaign.xp = Math.max(campaign.xp || 0, rank_thresholds[4]);
        const long = {
            title: 'Escort the relief convoy through the Dustfall storm corridor and back before the Marauders regroup',
            type: 'escort',
            world: campaign.world,
            target: 1,
            reward: 123456,
            description: 'A paragraph far longer than any the game writes, to see where it stops: the convoy waits at HAVEN-ANCHORAGE/BERTH-07/FLIGHT-RECORDER-ARCHIVE-UNBROKEN-PATH, its freighters loaded past their marks, their crews nervous, their escort gone; the Marauders know the route, the storm knows the rest, and the guild wants every crate home before the next front closes the lanes for a season or more. Escort the convoy → Hold the relay → Bring it home.',
            file: 'side-dev-long',
            stages: [stage('escort', campaign.world, 1, 'Escort the convoy'), stage('defend', campaign.world, 60, 'Hold the relay'), stage('courier', 0, 1, 'Bring it home')],
        };
        if (!side_missions.some(v => v.file === long.file)) {
            side_missions.push(long);
        }
        const chapter = contract_copy(story[campaign.story], true);
        const taken = contract_copy({...long, level: 1});
        taken.stage_index = 1;
        sync_stage(taken);
        const done = contract_copy({...(offered_jobs().find(v => v.type === 'mining') || offered_jobs()[0])});
        done.ready = true;
        campaign.contracts = [chapter, taken, done];
        campaign.tracked_id = chapter.id;
        // and a goal followed: the mission plan's fourth row
        campaign.goal = campaign.goal || {id: Object.keys(goal_kinds)[0], step: -1};
    }
    if (dev_screen_cargo === 'all') {
        for (const v of commodities) {
            campaign.cargo[v.key] = 1;
        }
    }
    if (dev_screen_station === 'full') {
        campaign.cargo[commodities[0].key] += Math.max(0, cargo_capacity() - cargo_count());
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
            // there before you came: they may hold the start (race.holders)
            race.holders.push(enemy);
        }
    }
    if (screen !== 'race') {
        race_go(m);
        dev_race_spread(m, screen === 'race-finish');
    }
    update_camera(0, true);
    update_hud();
}

// The Races mode's results (js/race_mode.js) in this world: &race_level=easy|normal|hard, &race_place=1|2|3|last
// over the line, or &race_end=wrecked (your hull gone mid-race) or forfeit; &race_crashes=n your crashes on rocks;
// &race_long=1 a rival with a very long name
function dev_race_results_open()
{
    race_mode.log_run = 'dev';
    race_mode.saved = {checkpoint, difficulty};
    race_mode.kind = (dev_race_params.get('race_kind') === 'turbo') ? 'turbo' : 'steer';
    race_mode_start(dev_race_params.get('race_level') || 'normal', campaign.world);
    const m = race_contract();
    const rivals = race.racers.filter(v => !v.you);
    for (const v of rivals) {
        v.alpha = 1;
    }
    if (dev_race_params.get('race_long') === '1') {
        rivals[1].name = 'Maximiliana Wolkenkratzer-Abernathy of the Outer Rim Racing Guild';
    }
    race_go(m);
    race.crashes = Number(dev_race_params.get('race_crashes')) || 0;
    race.rock_hull = race.crashes*13.4;
    const end = dev_race_params.get('race_end');
    if (end === 'wrecked') {
        dev_race_spread(m, false);
        player.hp = 0;
        finish(false);
    }
    else if (end === 'forfeit') {
        dev_race_spread(m, false);
        race_forfeit('You flew off the course');
    }
    else {
        dev_race_spread(m, true);
        race_mode_results_open();
    }
    update_camera(0, true);
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
            rivals[i].time = race.clock - 3.1 + i*0.7;
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

// The Races mode's Turbo race from the URL (js/race_rail.js): you on the start line, the count about to run
// (races-turbo), or on the turbo two seconds before the course's tightest bend, its kerbs lit ahead of you, the rivals
// along the track round you (races-turbo-mid); &race_level=easy|normal|hard
function dev_races_turbo_open(screen)
{
    race_mode.log_run = 'dev';
    race_mode.saved = {checkpoint, difficulty};
    race_mode.kind = 'turbo';
    race_mode_start(dev_race_params.get('race_level') || 'normal', campaign.world);
    const m = race_contract();
    for (const v of race.racers) {
        v.alpha = 1;
    }
    if (screen === 'races-turbo') {
        update_camera(0, true);
        return;
    }
    race_go(m);
    const track = race_rail.track;
    const rings = track.rings;
    let tight = Math.round(rings[1]/race_rail_step);
    for (let i = tight; i < Math.round(rings[rings.length - 2]/race_rail_step); ++i) {
        if (Math.abs(track.ks[i]) > Math.abs(track.ks[tight])) {
            tight = i;
        }
    }
    const r = race_rail.you;
    r.v = r.top*0.85;
    r.s = Math.max(track.start, tight*race_rail_step - r.v*2);
    race_rail.held = true;
    dash();
    race.clock = m.race.par*0.45;
    const gaps = [520, -260, -640, 180];
    let k = 0;
    for (const racer of race.racers) {
        const ride = racer.you ? r : racer.ride;
        if (!racer.you) {
            ride.s = clamp(r.s + gaps[k++ % gaps.length], track.start, rings[rings.length - 1] - 10);
            ride.v = ride.base*1.4;
            ride.d = ride.lane;
        }
        racer.next = rings.filter(v => v <= ride.s).length;
        racer.splits = rings.slice(0, racer.next).map((v, i) => Math.round(race.clock*((i + 1)/(racer.next + 1))*10)/10);
        race_rail_place(ride, racer.you ? player : racer);
    }
    m.progress = race_you().next;
    update_camera(0, true);
}

// &wave=2 (or 3): the arcade's world from that wave on, its goal set out (arcade_goals.js), as its first frame would
function dev_screen_arcade_wave()
{
    if (dev_screen_wave === 1) {
        return;
    }
    arcade.world = campaign.world;
    arcade.world_start = {score, kills, run_time};
    arcade_wave_start(dev_screen_wave);
}
