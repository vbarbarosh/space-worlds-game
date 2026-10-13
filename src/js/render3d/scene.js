// The 3D view, switched on by View 2D · 3D on the main menu and in Settings, remembered in this browser, or by
// `?render=3d` in the URL (`&shadows=0` without shadows): your ship, the raiders, the rocks and the station as low-poly
// models under soft light, drawn by Three.js and put into the game's canvas right after the background. Everything
// else stays 2D and is drawn over them as before: shots, effects, labels, bars. Three.js starts on the first switch to
// 3D, not before.
//
// The camera looks down at 45° without changing the plane of flight: a point of the plane is where the 2D view puts
// it, and a point above the plane shows that much higher on the screen (an oblique projection). So the 2D layer lines
// up with the models with no change of its own, aiming and the keys stay the same, and zoom is the game's zoom.
// The world's x, y is x, z in 3D; height is y. The functions below wrap the game's own by name, as js/dev/cheats.js
// does: the game itself does not change.

const render3d = {
    // drawn in 3D now: asked for, and this browser draws it
    on: false,
    // asked for: by the URL, else by the switch
    wanted: false,
    // why this browser cannot draw it ('no WebGL 2', 'the WebGL context was lost'), or empty
    broken: '',
    shadows: new URLSearchParams(location.search).get('shadows') !== '0',
    three: null,
    renderer: null,
    scene: null,
    camera: null,
    sun: null,
    // a cool light from the side of the view the camera sees, so the hulls' edges stand out from dark space
    rim: null,
    // the lights of the fresh blasts, a pool of render3d_blast_lights, and the white of a fireball's core
    blasts: [],
    fire: null,
    // the crystals of rich rocks, their glow breathing, one material per ore
    ores: new Set(),
    floor: null,
    materials: new Map(),
    geometries: new Map(),
    // the model of each thing drawn, by the thing: {group, seen, roll, angle}
    models: new Map(),
    world: -1,
    station: null,
    frame: 0,
    width: 0,
    height: 0,
};
const render3d_view_key = 'world_explorer_view';
// How much higher on the screen a point is drawn for each unit of height: 1 is a view from 45°
const render3d_tilt = 1;
// The plane the shadows fall on, below the plane of flight
const render3d_floor_y = -45;
// A blast lights the hulls around it for its first fraction of a second, out to a few times its size. The lights are
// a pool of a fixed size, always in the scene and dark when unused: Three.js builds its shaders for a count of lights,
// and a count that changed would build them again in the middle of a fight.
const render3d_blast_lights = 4;
const render3d_blast_glow = 0.45;
const render3d_blast_reach = 4.5;
// A thing has its model only while it is this near the view, beyond its own size: a hull's height is drawn up the
// screen and its shadow falls down and to the right, each well within this, so one just out of view still shows them
const render3d_margin = 200;

function render3d_start()
{
    try {
        const THREE = three_from_package();
        const probe = document.createElement('canvas');
        if (!probe.getContext('webgl2')) {
            throw new Error('no WebGL 2');
        }
        render3d.three = THREE;
        render3d.renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, premultipliedAlpha: true});
    }
    catch (error) {
        console.warn(`render=3d: no 3D view (${error.message}); drawing in 2D`);
        render3d.broken = error.message;
        render3d.on = false;
        return;
    }
    const THREE = render3d.three;
    const renderer = render3d.renderer;
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = render3d.shadows;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.addEventListener('webglcontextlost', function (event) {
        event.preventDefault();
        console.warn('render=3d: the WebGL context was lost; drawing in 2D');
        render3d.broken = 'the WebGL context was lost';
        render3d.on = false;
        render3d_hooks_set(false);
        sync_settings_rows();
    });
    render3d.scene = new THREE.Scene();
    render3d.camera = new THREE.OrthographicCamera();
    render3d.camera.position.set(0, 1000, 0);
    render3d.camera.up.set(0, 0, -1);
    render3d.camera.lookAt(0, 0, 0);
    render3d.sun = new THREE.DirectionalLight('#ffffff', 2);
    render3d.sun.castShadow = render3d.shadows;
    render3d.sun.shadow.mapSize.set(2048, 2048);
    render3d.sun.shadow.radius = 4;
    render3d.sun.shadow.bias = -0.001;
    render3d.sun.shadow.normalBias = 2;
    render3d.scene.add(render3d.sun, render3d.sun.target);
    render3d.hemisphere = new THREE.HemisphereLight('#ffffff', '#000000', 1.1);
    render3d.scene.add(render3d.hemisphere);
    render3d.rim = new THREE.DirectionalLight('#9ec8ff', 1.3);
    render3d.scene.add(render3d.rim, render3d.rim.target);
    render3d.fire = new THREE.Color('#fff1d6');
    for (let i = 0; i < render3d_blast_lights; ++i) {
        const light = new THREE.PointLight('#ffffff', 0, 1, 0);
        render3d.scene.add(light);
        render3d.blasts.push(light);
    }
    render3d.floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI/2), new THREE.ShadowMaterial({opacity: 0.38}));
    render3d.floor.position.y = render3d_floor_y;
    render3d.floor.receiveShadow = true;
    render3d.scene.add(render3d.floor);
}

// Whether this frame is drawn in 3D: the flag is on, a ship is in flight
function render3d_active()
{
    return render3d.on && !!player && (state !== 'menu');
}

// The light and the colours of the world, from its own file (js/worlds/*.js): its stars light from above, its clouds
// from below; the station is rebuilt in its metal and accent
function render3d_world_set()
{
    const w = worlds[campaign.world];
    const look = world_looks[campaign.world];
    render3d.world = campaign.world;
    render3d.sun.color.set(look.star);
    render3d.hemisphere.color.set(look.star);
    render3d.hemisphere.groundColor.set(look.cloud);
    // the rim in the world's cloud, lightened, so it reads on every hull
    render3d.rim.color.set(look.cloud).lerp(new render3d.three.Color('#c8dcff'), 0.55);
    for (const [key, v] of render3d.models) {
        render3d_retire(v.group);
        render3d.models.delete(key);
    }
    if (render3d.station) {
        render3d_retire(render3d.station);
    }
    render3d.station = render3d_station_model(new render3d.three.Color(look.material).multiplyScalar(0.7).getStyle(), w.accent);
    render3d.scene.add(render3d.station);
}

// A model leaves the scene, and the materials it alone owns are freed with it; the shared geometries and materials
// stay for the models still using them
function render3d_retire(group)
{
    render3d.scene.remove(group);
    for (const material of group.userData.own || []) {
        material.dispose();
    }
}

// The camera on the 2D view's rectangle of the plane, from above, the height sheared up the screen
function render3d_camera_set()
{
    const view = render3d.camera;
    view.projectionMatrix.makeOrthographic(camera.x, camera.x + W/zoom, -camera.y, -(camera.y + H/zoom), 1, 3000);
    // z in the camera's space is height - 1000: y on the screen gains tilt × height
    const shear = new render3d.three.Matrix4().set(
        1, 0, 0, 0,
        0, 1, render3d_tilt, render3d_tilt*1000,
        0, 0, 1, 0,
        0, 0, 0, 1,
    );
    view.projectionMatrix.multiply(shear);
    view.projectionMatrixInverse.copy(view.projectionMatrix).invert();
}

// The sun stands up and to the left of the view, so shadows fall down and to the right; its shadow covers the view
function render3d_light_set()
{
    const x = camera.x + W/zoom/2;
    const z = camera.y + H/zoom/2;
    const half = Math.max(W, H)/zoom*0.62 + 250;
    const sun = render3d.sun;
    sun.target.position.set(x, 0, z);
    sun.position.set(x - 700, 1400, z - 900);
    sun.shadow.camera.left = -half;
    sun.shadow.camera.right = half;
    sun.shadow.camera.top = half;
    sun.shadow.camera.bottom = -half;
    sun.shadow.camera.near = 100;
    sun.shadow.camera.far = 3500;
    sun.shadow.camera.updateProjectionMatrix();
    render3d.floor.position.x = x;
    render3d.floor.position.z = z;
    render3d.floor.scale.set(half*4, 1, half*4);
    // low from down and to the right: on the faces turned to the camera, opposite the sun
    render3d.rim.target.position.set(x, 0, z);
    render3d.rim.position.set(x + 600, 350, z + 900);
}

// The fresh blasts in view light the pool, the brightest first: a light flares in the blast's colour, warmed toward
// its white core, and fades over render3d_blast_glow. Reduced effects leave the pool dark.
function render3d_blasts_set()
{
    const lights = render3d.blasts;
    for (const light of lights) {
        light.intensity = 0;
    }
    if (!full_fx) {
        return;
    }
    for (const v of explosions) {
        if ((v.kind !== 'blast') || (v.t < 0) || (v.t >= render3d_blast_glow) || !in_view(v, v.size*render3d_blast_reach)) {
            continue;
        }
        const fade = 1 - v.t/render3d_blast_glow;
        const power = fade*fade*clamp(v.size/30, 0.6, 2.5)*7;
        let light = lights[0];
        for (const vv of lights) {
            if (vv.intensity < light.intensity) {
                light = vv;
            }
        }
        if (light.intensity >= power) {
            continue;
        }
        light.intensity = power;
        light.distance = v.size*render3d_blast_reach;
        light.position.set(v.x, 15 + v.size*0.3, v.y);
        light.color.set(v.color).lerp(render3d.fire, 0.45);
    }
}

// The model of a thing, made the first time it is seen, kept while it is
function render3d_model(key, make)
{
    let out = render3d.models.get(key);
    if (!out) {
        out = {group: make(), seen: 0, roll: 0, angle: null};
        render3d.scene.add(out.group);
        render3d.models.set(key, out);
    }
    out.seen = render3d.frame;
    out.group.visible = true;
    return out;
}

// Places a ship's model: on the plane, along its angle, banked into its turn, a flash of white when hit
function render3d_ship_place(v, x, y, angle, length, flash)
{
    const group = v.group;
    const turn = (v.angle === null) ? 0 : Math.atan2(Math.sin(angle - v.angle), Math.cos(angle - v.angle));
    v.angle = angle;
    v.roll += (clamp(turn*9, -0.7, 0.7) - v.roll)*0.15;
    group.position.set(x, full_fx ? Math.sin(clock*2 + x*0.01)*2 : 0, y);
    group.rotation.set(v.roll, -angle, 0, 'YXZ');
    group.scale.setScalar(length);
    render3d_flash(group, flash);
}

// A model hit turns white-hot for its flash, its faces still shaded so its shape stays, then back to its own materials
function render3d_flash(group, on)
{
    if (!!group.userData.flash === on) {
        return;
    }
    group.userData.flash = on;
    const white = render3d_material('#ffffff', {emissive: '#cdeeff', glow: 0.5, roughness: 0.45});
    group.traverse(function (mesh) {
        if (!mesh.isMesh) {
            return;
        }
        if (on) {
            mesh.userData.material = mesh.material;
            mesh.material = white;
        }
        else {
            mesh.material = mesh.userData.material;
        }
    });
}

// Matches the scene to the game: what is gone or far out of view is removed, what comes near gets its model,
// everything near moves where it is
function render3d_sync()
{
    if (render3d.world !== campaign.world) {
        render3d_world_set();
    }
    render3d.frame++;
    const look = world_looks[campaign.world];
    const rock = new render3d.three.Color(look.material).multiplyScalar(0.62).getStyle();
    for (const v of ore_nodes) {
        if (!in_view(v, v.r*2.2 + render3d_margin)) {
            continue;
        }
        const variant = Math.abs(Math.floor(v.angle*11)) % 7;
        const model = render3d_model(v, () => render3d_rock_model(variant, rock, v.resource ? ore_color(v) : null));
        model.group.position.set(v.x, 0, v.y);
        model.group.rotation.y = -v.angle;
        model.group.scale.setScalar(v.r*2.2);
        render3d_flash(model.group, v.flash > 0);
    }
    for (const enemy of enemies) {
        const art = enemy_sprite(enemy);
        const length = art.length;
        if (!in_view(enemy, length + render3d_margin)) {
            continue;
        }
        const color = enemy.color || pink;
        // a flagship as its world's drawing
        const model = render3d_model(enemy, () => render3d_arts[art.name] ? render3d_flagship_model(art.name, color) : render3d_raider_model(enemy.type, color, !!enemy.elite));
        const angle = ((enemy.type === 'lancer') && (enemy.charge_time > 0)) ? enemy.charge_angle : enemy.angle;
        render3d_ship_place(model, enemy.x, enemy.y, angle, length, enemy.flash > 0);
    }
    if (player && (state !== 'dead') && !teleport_active()) {
        // the model of the class you fly: after a change of ship (the hangar, a load) the old one is not seen, and goes
        // below this frame
        const ship = current_ship();
        const model = render3d_model(ship, () => render3d_player_model(ship));
        render3d_ship_place(model, player.x, player.y, player.angle, ship_sprite(ship).length, false);
        render3d_player_lights(model.group);
        // blinking while invincible, as the 2D ship does
        model.group.visible = !(player.invincible > 0) || (Math.sin(clock*25) > -0.3);
    }
    for (const [key, v] of render3d.models) {
        if (v.seen !== render3d.frame) {
            render3d_retire(v.group);
            render3d.models.delete(key);
        }
    }
    const station_model = render3d.station;
    // its panels reach out to 0.65 of its size
    station_model.visible = in_view(station, station_size*0.7 + render3d_margin);
    station_model.position.set(station.x, -10, station.y);
    station_model.scale.set(station_size*0.97, station_size*0.4, station_size*0.97);
    station_model.getObjectByName('ring').rotation.y = -clock*0.04;
    // the beacon flashes twice every 2.4 s, the rich rocks' crystals breathe; steady with reduced effects
    const beat = clock % 2.4;
    station_model.userData.beacon.emissiveIntensity = (!full_fx || (beat < 0.12) || ((beat > 0.3) && (beat < 0.42))) ? 2.2 : 0.35;
    const breath = full_fx ? 0.9 + Math.sin(clock*2.2)*0.35 : 0.9;
    for (const v of render3d.ores) {
        v.emissiveIntensity = breath;
    }
}

// Your engines glow with the thrust, white-hot on turbo; the running lights are in the ship's colour, with a strobe
// every 1.5 s
function render3d_player_lights(group)
{
    const turbo = !!player.turbo_active;
    const power = turbo ? 1 : clamp(Math.abs(player.engine_thrust || 0), 0, 1);
    const flame = group.userData.flame;
    flame.emissiveIntensity = 0.7 + power*1.5 + (turbo ? 1.6 : 0);
    if (flame.userData.turbo !== turbo) {
        flame.userData.turbo = turbo;
        flame.emissive.set(turbo ? '#e4f3ff' : '#9bcfff');
    }
    const lights = group.userData.lights;
    const color = current_ship().color;
    if (lights.userData.color !== color) {
        lights.userData.color = color;
        lights.color.set(color);
        lights.emissive.set(color);
    }
    lights.emissiveIntensity = (full_fx && (clock % 1.5 < 0.07)) ? 3.5 : 1.2;
}

// Draws the 3D scene at the size of the game's canvas and puts it into it, in the scene's units (render() is drawing
// the background in them)
function render3d_draw()
{
    const width = Math.max(1, Math.round(W*scale*dpr));
    const height = Math.max(1, Math.round(H*scale*dpr));
    if ((width !== render3d.width) || (height !== render3d.height)) {
        render3d.width = width;
        render3d.height = height;
        render3d.renderer.setSize(width, height, false);
    }
    render3d_sync();
    render3d_camera_set();
    render3d_light_set();
    render3d_blasts_set();
    render3d.renderer.render(render3d.scene, render3d.camera);
    ctx.drawImage(render3d.renderer.domElement, 0, 0, W, H);
}

const render3d_base_draw_background = draw_background;
const render3d_base_render_map = render_map;
const render3d_base_render_surface_ship = render_surface_ship;
const render3d_base_render_ship_turrets = render_ship_turrets;
const render3d_base_render_world_ore = render_world_ore;
const render3d_base_render_world_station = render_world_station;

// The background, then the background things (scenery is never drawn over a ship), then the 3D scene
function render3d_draw_background()
{
    render3d_base_draw_background();
    if (!render3d_active()) {
        return;
    }
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-camera.x, -camera.y);
    render3d_base_render_map();
    ctx.restore();
    render3d_draw();
}

function render3d_render_map()
{
    if (!render3d_active()) {
        render3d_base_render_map();
    }
}

// Your ship and the raiders are models now; their trails, freighters and escorts stay 2D
function render3d_render_surface_ship(x, y, angle, alpha = 1, ghost = false, definition = null)
{
    if (render3d_active() && !ghost && (definition ? definition.enemy : is_player_vessel(x, y))) {
        return;
    }
    render3d_base_render_surface_ship(x, y, angle, alpha, ghost, definition);
}

function render3d_render_ship_turrets(alpha = 1)
{
    if (!render3d_active()) {
        render3d_base_render_ship_turrets(alpha);
    }
}

// A rock is a model; its hull bar stays
function render3d_render_world_ore(v)
{
    if (!render3d_active()) {
        render3d_base_render_world_ore(v);
        return;
    }
    if (in_view(v, v.r + 8)) {
        ore_hp_bar(v);
    }
}

// The station is a model; its shelter ring, its shield and its name stay
function render3d_render_world_station()
{
    if (!render3d_active()) {
        render3d_base_render_world_station();
        return;
    }
    if (!in_view(station, station_shelter + 50)) {
        return;
    }
    const w = worlds[campaign.world];
    ctx.save();
    ctx.strokeStyle = `${w.accent}18`;
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.arc(station.x, station.y, station_shelter, 0, Math.PI*2);
    ctx.stroke();
    ctx.setLineDash([]);
    depot_shield_draw();
    world_label(station.x, station.y + station_size/2 + 70, arcade.active ? 'DEPOT' : w.station.toUpperCase(), arcade.active ? (depot_shield_up() ? 'Shielded · clear the raiders' : 'R repairs and weapons') : 'Station · R dock', w.accent);
    ctx.restore();
}

// The 3D drawing takes the place of the game's own functions only while 3D is on: in 2D the game draws with its
// own, as if this file were not there
function render3d_hooks_set(on)
{
    draw_background = on ? render3d_draw_background : render3d_base_draw_background;
    render_map = on ? render3d_render_map : render3d_base_render_map;
    render_surface_ship = on ? render3d_render_surface_ship : render3d_base_render_surface_ship;
    render_ship_turrets = on ? render3d_render_ship_turrets : render3d_base_render_ship_turrets;
    render_world_ore = on ? render3d_render_world_ore : render3d_base_render_world_ore;
    render_world_station = on ? render3d_render_world_station : render3d_base_render_world_station;
}

// The view now, as the switch shows it: '3d' while asked for and drawn, else '2d'
function render3d_view()
{
    return render3d.on ? '3d' : '2d';
}

// The switch: '3d' starts Three.js the first time and draws the next frame in 3D; '2d' draws it in 2D again. The
// choice is kept for the next visit, unless this browser cannot draw 3D.
function render3d_view_set(view)
{
    render3d.wanted = (view === '3d');
    if (render3d.wanted && !render3d.renderer && !render3d.broken) {
        render3d_start();
    }
    render3d.on = render3d.wanted && !!render3d.renderer && !render3d.broken;
    render3d_hooks_set(render3d.on);
    // drawn again at once, under the pause or the settings too
    performance_render_dirty = true;
    if (render3d.wanted && !render3d.on) {
        show_toast('3D view unavailable', `This browser cannot draw it: ${render3d.broken}`, 2.5);
    }
    try {
        localStorage.setItem(render3d_view_key, render3d.on ? '3d' : '2d');
    }
    catch {
    }
}

// The URL first (the dev page's ?render=3d), then the switch's last choice in this browser
function render3d_view_saved()
{
    const param = new URLSearchParams(location.search).get('render');
    if (param) {
        return param;
    }
    try {
        return localStorage.getItem(render3d_view_key) || '2d';
    }
    catch {
        return '2d';
    }
}

render3d.wanted = (render3d_view_saved() === '3d');
if (render3d.wanted) {
    render3d_start();
    render3d.on = !!render3d.renderer && !render3d.broken;
    render3d_hooks_set(render3d.on);
}
