// The 3D view, a prototype on the dev page behind `?render=3d` (`&shadows=0` without shadows): your ship, the raiders,
// the rocks and the station as low-poly models under soft light, drawn by Three.js and put into the game's canvas
// right after the background. Everything else stays 2D and is drawn over them as before: shots, effects, labels, bars.
//
// The camera looks down at 45° without changing the plane of flight: a point of the plane is where the 2D view puts
// it, and a point above the plane shows that much higher on the screen (an oblique projection). So the 2D layer lines
// up with the models with no change of its own, aiming and the keys stay the same, and zoom is the game's zoom.
// The world's x, y is x, z in 3D; height is y. The functions below wrap the game's own by name, as js/dev/cheats.js
// does: the game itself does not change.

const render3d = {
    on: new URLSearchParams(location.search).get('render') === '3d',
    shadows: new URLSearchParams(location.search).get('shadows') !== '0',
    three: null,
    renderer: null,
    scene: null,
    camera: null,
    sun: null,
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
// asked for in the URL, even when this browser could not draw it
const render3d_requested = render3d.on;
// How much higher on the screen a point is drawn for each unit of height: 1 is a view from 45°
const render3d_tilt = 1;
// The plane the shadows fall on, below the plane of flight
const render3d_floor_y = -45;

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
        render3d.on = false;
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
    for (const [key, v] of render3d.models) {
        render3d.scene.remove(v.group);
        render3d.models.delete(key);
    }
    render3d.station = render3d_station_model(new render3d.three.Color(look.material).multiplyScalar(0.7).getStyle(), w.accent);
    render3d.scene.add(render3d.station);
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

// A model hit turns white for its flash, then back to its own materials
function render3d_flash(group, on)
{
    if (!!group.userData.flash === on) {
        return;
    }
    group.userData.flash = on;
    const white = render3d_material('#e5faff', {emissive: '#e5faff', glow: 0.8});
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

// Matches the scene to the game: what is gone is removed, what is new gets its model, everything moves where it is
function render3d_sync()
{
    if (render3d.world !== campaign.world) {
        render3d_world_set();
    }
    render3d.frame++;
    const look = world_looks[campaign.world];
    const rock = new render3d.three.Color(look.material).multiplyScalar(0.62).getStyle();
    for (const v of ore_nodes) {
        const variant = Math.abs(Math.floor(v.angle*11)) % 7;
        const model = render3d_model(v, () => render3d_rock_model(variant, rock, v.resource ? ore_color(v) : null));
        model.group.position.set(v.x, 0, v.y);
        model.group.rotation.y = -v.angle;
        model.group.scale.setScalar(v.r*2.2);
        render3d_flash(model.group, v.flash > 0);
    }
    for (const enemy of enemies) {
        const color = enemy.color || pink;
        const model = render3d_model(enemy, () => render3d_raider_model(enemy.type, color, !!enemy.elite));
        const angle = ((enemy.type === 'lancer') && (enemy.charge_time > 0)) ? enemy.charge_angle : enemy.angle;
        render3d_ship_place(model, enemy.x, enemy.y, angle, enemy_sprite(enemy).length, enemy.flash > 0);
    }
    if (player && (state !== 'dead') && !teleport_active()) {
        const model = render3d_model(player, render3d_player_model);
        render3d_ship_place(model, player.x, player.y, player.angle, ship_sprite(current_ship()).length*1.05, false);
        // blinking while invincible, as the 2D ship does
        model.group.visible = !(player.invincible > 0) || (Math.sin(clock*25) > -0.3);
    }
    for (const [key, v] of render3d.models) {
        if (v.seen !== render3d.frame) {
            render3d.scene.remove(v.group);
            render3d.models.delete(key);
        }
    }
    const station_model = render3d.station;
    station_model.position.set(station.x, -10, station.y);
    station_model.scale.set(station_size*0.97, station_size*0.4, station_size*0.97);
    station_model.getObjectByName('ring').rotation.y = -clock*0.04;
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
    render3d.renderer.render(render3d.scene, render3d.camera);
    ctx.drawImage(render3d.renderer.domElement, 0, 0, W, H);
}

const render3d_base_draw_background = draw_background;
const render3d_base_render_map = render_map;
const render3d_base_render_surface_ship = render_surface_ship;
const render3d_base_render_ship_turrets = render_ship_turrets;
const render3d_base_render_world_ore = render_world_ore;
const render3d_base_render_world_station = render_world_station;
const render3d_base_dev_scenario_save = dev_scenario_save;

// The background, then the background things (scenery is never drawn over a ship), then the 3D scene
draw_background = function () {
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
};
render_map = function () {
    if (!render3d_active()) {
        render3d_base_render_map();
    }
};
// Your ship and the raiders are models now; their trails, freighters and escorts stay 2D
render_surface_ship = function (x, y, angle, alpha = 1, ghost = false, definition = null) {
    if (render3d_active() && !ghost && (definition ? definition.enemy : is_player_vessel(x, y))) {
        return;
    }
    render3d_base_render_surface_ship(x, y, angle, alpha, ghost, definition);
};
render_ship_turrets = function (alpha = 1) {
    if (!render3d_active()) {
        render3d_base_render_ship_turrets(alpha);
    }
};
// A rock is a model; its hull bar stays
render_world_ore = function (v) {
    if (!render3d_active()) {
        render3d_base_render_world_ore(v);
        return;
    }
    if (in_view(v, v.r + 8)) {
        ore_hp_bar(v);
    }
};
// The station is a model; its shelter ring, its shield and its name stay
render_world_station = function () {
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
};
// The dev page writes its scenario into the URL: the flags of the 3D view stay in it, so a reload keeps them
dev_scenario_save = function () {
    render3d_base_dev_scenario_save();
    const params = new URLSearchParams(location.search);
    if (render3d_requested && (params.get('render') !== '3d')) {
        params.set('render', '3d');
        if (!render3d.shadows) {
            params.set('shadows', '0');
        }
        history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
    }
};

if (render3d.on) {
    render3d_start();
}
