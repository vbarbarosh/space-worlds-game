// &raiders=sniper,bulwark with &screen=arcade: the arcade's raiders with jobs (src/js/arcade_raiders.js) to try at
// once, whatever the world: a squadron 640 m ahead of you, three chasers hunting as a pack and one of each kind named
// (interceptor, carrier, bulwark, sniper, minelayer; pack brings the chasers alone)
const dev_raiders = (new URLSearchParams(location.search).get('raiders') || '').split(',').filter(Boolean);

function dev_raiders_open()
{
    if (!dev_raiders.length) {
        return;
    }
    if (arcade.world !== campaign.world) {
        arcade.world = campaign.world;
        arcade.world_start = {score, kills, run_time};
        arcade_wave_start(1);
    }
    const first = enemies.length;
    arcade_squad_line('chaser', 3, player.angle, false);
    for (const kind of dev_raiders.filter(v => Object.hasOwn(raider_kinds, v) && (v !== 'drone'))) {
        const a = player.angle + rand(-0.6, 0.6);
        raider_kind_spawn(kind, player.x + Math.cos(a)*640, player.y + Math.sin(a)*640);
    }
    pack_form(enemies.slice(first));
}
