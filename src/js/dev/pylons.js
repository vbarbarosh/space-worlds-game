// &pylon=calm|charge|strike|field with a scene of Ion Reach (&world=ion-reach, &screen=flight or arcade, &kind=scroll):
// your ship still by the pylon nearest the station that has a charge field beside it, at one of its moments (calm,
// 60 m outside its ring; charge, in its ring with half the charge run; strike, in its ring as the charge runs out;
// field, in the field's rim outside the ring, the pulse at 40% and filling), for trying them and their screenshots
// (js/ion_pylons.js). &speed=0.1 makes the moment last.
const dev_pylon = new URLSearchParams(location.search).get('pylon');

function dev_pylon_open()
{
    if (!dev_pylon || !player || !pylons.length) {
        return;
    }
    const field = charge_fields.filter(vv => vv.pylon).sort((a, b) => distance(a, station) - distance(b, station))[0];
    const v = field ? field.pylon : pylons[0];
    // on a Scroll lane the world begins here, as dev_raiders_open has it, and the view moves to the pylon
    if (arcade.active && (arcade.world !== campaign.world)) {
        arcade.world = campaign.world;
        arcade.world_start = {score, kills, run_time};
        arcade_scroll_world_start();
        arcade_wave_start(1);
    }
    if (arcade_scroll_on()) {
        arcade_scroll.s = clamp((v.x - arcade_scroll.from.x)*arcade_scroll.way.x + (v.y - arcade_scroll.from.y)*arcade_scroll.way.y, 0, arcade_scroll.length);
    }
    const toward = field ? Math.atan2(field.y - v.y, field.x - v.x) : 0;
    // field on the field's side, the rest on the other, so one moment shows at a time
    const ways = {calm: [toward + Math.PI, pylon_reach + 60], charge: [toward + Math.PI, pylon_reach*0.6], strike: [toward + Math.PI, pylon_reach*0.6], field: [toward, charge_field_beside + charge_field_r - 30]};
    const [a, d] = ways[dev_pylon] || ways.calm;
    player.x = v.x + Math.cos(a)*d;
    player.y = v.y + Math.sin(a)*d;
    player.angle = a + Math.PI;
    player.vx = 0;
    player.vy = 0;
    if ((dev_pylon === 'charge') || (dev_pylon === 'strike')) {
        v.phase = 'charging';
        v.t = (dev_pylon === 'charge') ? pylon_charge*0.5 : pylon_charge - 0.005;
        // no arrival's grace: the strike lands
        player.invincible = 0;
    }
    if (dev_pylon === 'field') {
        player.energy = 40;
    }
    update_camera(0, true);
}
