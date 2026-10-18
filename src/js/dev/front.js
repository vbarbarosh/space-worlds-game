// &front=far, near or in with &screen=arcade: the world's sweeping front (arcade_fronts.js) set out at once, its
// leading edge 1500 m off (its edge marker), 260 m off (in view, with its lanes or the rocks' lee), or over you; read at
// load, as the scene writes the URL over
const dev_front = new URLSearchParams(location.search).get('front');
const dev_front_lead = {far: 1500, near: 260};

addEventListener('load', function () {
    setTimeout(dev_front_open, 50);
});

function dev_front_open()
{
    const kind = arcade.active && arcade_front_kind();
    if (!dev_front || !kind) {
        return;
    }
    arcade_front_launch(kind);
    const f = arcade_front;
    f.pos = arcade_front_at(f, player).s - (dev_front_lead[dev_front] ?? -f.width*0.4);
    f.time = 2;
}
