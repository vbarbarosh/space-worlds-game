// &spire=near|pull|cover|bend with a scene of Obsidian (&world=obsidian, &screen=flight or arcade, &kind=scroll): your
// ship still by the magnetic spire nearest the station, in one of its moments (near, 80 m outside its field; pull,
// inside it 150 m from the spire, drawn in; cover, the spire between you and three shooters held where they stand 380 m
// beyond it, their fire drawn into it; bend, a tank held 230 m past the spire and 300 m off its line, within the start
// gun's reach, your fire passing the spire about 110 m off and curving into it or round it), for trying them and their
// screenshots (js/obsidian_spires.js). The raiders stand on the side toward the map's middle. &speed=0.1 makes the
// moment last.
const dev_spire = new URLSearchParams(location.search).get('spire');

function dev_spire_open()
{
    if (!dev_spire || !player || !spires.length) {
        return;
    }
    const v = spires.slice().sort((a, b) => distance(a, station) - distance(b, station))[0];
    // on a Scroll lane the world begins here, as dev_raiders_open has it, and the view moves to the spire
    if (arcade.active && (arcade.world !== campaign.world)) {
        arcade.world = campaign.world;
        arcade.world_start = {score, kills, run_time};
        arcade_scroll_world_start();
        arcade_wave_start(1);
    }
    if (arcade_scroll_on()) {
        arcade_scroll.s = clamp((v.x - arcade_scroll.from.x)*arcade_scroll.way.x + (v.y - arcade_scroll.from.y)*arcade_scroll.way.y, 0, arcade_scroll.length);
    }
    // the raiders toward the map's middle, you on the spire's other side
    const a = Math.atan2(v.y - world.h/2, v.x - world.w/2);
    const ways = {near: spire_reach + 80, pull: 150, cover: 170, bend: 130};
    const d = ways[dev_spire] || ways.near;
    player.x = v.x + Math.cos(a)*d;
    player.y = v.y + Math.sin(a)*d;
    player.angle = a + Math.PI;
    player.vx = 0;
    player.vy = 0;
    const far = a + Math.PI;
    // across the line through the spire: the raiders' offsets from it (m)
    const across = (dev_spire === 'cover') ? [-50, 0, 60] : (dev_spire === 'bend') ? [300] : [];
    const reach = (dev_spire === 'cover') ? 380 : 230;
    for (const off of across) {
        spawn_enemy((dev_spire === 'cover') ? 'shooter' : 'tank');
        const e = enemies[enemies.length - 1];
        e.x = v.x + Math.cos(far)*reach - Math.sin(far)*off;
        e.y = v.y + Math.sin(far)*reach + Math.cos(far)*off;
        e.anchor = true;
        e.fire_cd = 0.3 + Math.abs(off)/200;
        e.age = 1;
    }
    update_camera(0, true);
}
