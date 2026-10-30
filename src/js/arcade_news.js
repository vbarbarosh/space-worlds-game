// The arcade's headlines (the author, 2026-10-30, on a world's five minutes: "engaging"): something new in every Free
// wave from the third, where a world had shown all it had by its second (docs/interest.md: Raph Koster, play is
// learning a pattern, and a learned one bores). Each of waves 3 to 5 brings a headline some seconds in, and a Scroll
// lane the same three along its way: a lieutenant, an ace of the newest raider kind open, whose fall pays salvage; a
// swarm of drones that ring you and dart in, which a pulse breaks; two hunters, elite interceptors that burst at you.

// the headline each wave brings, and how many s into it; on a lane, where along it (a share of its length): none past
// its half in the run's last world, whose second half and flagship are the run's hardest already (as its event)
const news_waves = {3: 'lieutenant', 4: 'swarm', 5: 'hunters'};
const news_delay = 10;
const news_lane = [[0.3, 'lieutenant'], [0.55, 'swarm'], [0.8, 'hunters']];
const news_titles = {
    lieutenant: ['LIEUTENANT', 'AN ACE OF THEIRS · ITS FALL PAYS SALVAGE'],
    swarm: ['SWARM', 'DRONES RING YOU AND DART IN · A PULSE BREAKS THEM'],
    hunters: ['HUNTERS', 'TWO ACES BURST AT YOU · TURBO AWAY OR SHOOT THEM DOWN'],
};
// a lieutenant's hull over an elite's, and its salvage: pieces and their value (2 more a world past Haven)
const news_lieutenant_hull = 2;
const news_lieutenant_loot = [6, 8];
// a swarm: its drones (one more a world past Haven) and the ring they come in on
const news_swarm = 8;
const news_swarm_ring = 520;

// Each frame of a wave: its headline once it is due; on a lane, the next one the screen has come to
function news_update()
{
    if (arcade_scroll_on()) {
        const next = news_lane[arcade.news_wave];
        const last = arcade_level() >= arcade_worlds - 1;
        if (next && (arcade_scroll.s >= arcade_scroll.length*next[0]) && !(last && (next[0] > 0.5))) {
            arcade.news_wave++;
            news_headline(next[1]);
        }
        return;
    }
    const kind = news_waves[arcade.wave];
    if (!kind || (arcade.news_wave === arcade.wave) || (arcade.wave_clock < news_delay)) {
        return;
    }
    arcade.news_wave = arcade.wave;
    news_headline(kind);
}

// A headline: said, and its raiders come
function news_headline(kind)
{
    show_toast(news_titles[kind][0], news_titles[kind][1], 4, 'danger');
    if (kind === 'lieutenant') {
        const open = raider_kinds_open().filter(v => v !== 'drone');
        const at = arcade_event_spot(650);
        const enemy = open.length ? raider_kind_spawn(open[open.length - 1], at.x, at.y) : spawn_enemy('shooter');
        enemy.x = clamp(at.x, 60, world.w - 60);
        enemy.y = clamp(at.y, 60, world.h - 60);
        arcade_elite_make(enemy);
        enemy.hp = enemy.max_hp = enemy.max_hp*news_lieutenant_hull;
        enemy.news_loot = true;
        enemy.plate = 'Lieutenant';
        explode(enemy.x, enemy.y, 36, '#ffd36b', 0, 'warp');
    }
    else if (kind === 'swarm') {
        const count = news_swarm + arcade_level();
        for (let i = 0; i < count; ++i) {
            const a = i*Math.PI*2/count;
            raider_kind_spawn('drone', player.x + Math.cos(a)*news_swarm_ring, player.y + Math.sin(a)*news_swarm_ring).plate = 'Swarm drone';
        }
    }
    else {
        for (const side of [-1, 1]) {
            const at = arcade_event_spot(700);
            const enemy = raider_kind_spawn('interceptor', at.x + side*80, at.y);
            arcade_elite_make(enemy);
            enemy.plate = 'Hunter';
        }
    }
}

// A lieutenant's fall: its salvage
function news_kill(enemy)
{
    if (!enemy.news_loot) {
        return;
    }
    for (let i = 0; i < news_lieutenant_loot[0]; ++i) {
        drop_pickup(enemy.x + rand(-60, 60), enemy.y + rand(-60, 60), 'artifact', news_lieutenant_loot[1] + arcade_level()*2);
    }
    show_toast('LIEUTENANT DOWN', 'Its salvage is yours', 2.5, 'income');
}
