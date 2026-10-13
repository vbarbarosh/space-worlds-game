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
    // the veins (or crystals) of rich rocks, their glow breathing, one material per ore
    ores: new Set(),
    floor: null,
    materials: new Map(),
    geometries: new Map(),
    // the model of each thing drawn, by the thing: {group, seen, roll, angle}
    models: new Map(),
    // the place of a gun on your ship worked out each frame, made once (render3d_player_guns)
    gun: null,
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
// from below; the station is rebuilt as the world's drawing, in its metal and accent where it has none
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
        render3d.station = null;
    }
    // a drawing with nothing to raise (a stand-in picture) leaves the station to 2D
    const art = world_art('station');
    render3d.station = !art ? render3d_station_plain(new render3d.three.Color(look.material).multiplyScalar(0.7).getStyle(), w.accent) : render3d_drawn(art) ? render3d_station_model(art, w.accent) : null;
    if (render3d.station) {
        render3d.scene.add(render3d.station);
    }
}

// A model leaves the scene, and the materials it alone owns are freed with it, and its guns' places (an instanced
// mesh's own); the shared geometries and materials stay for the models still using them
function render3d_retire(group)
{
    render3d.scene.remove(group);
    for (const material of group.userData.own || []) {
        material.dispose();
    }
    for (const mesh of group.userData.guns || []) {
        mesh.dispose();
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
    for (const v of ore_nodes) {
        if (!in_view(v, v.r*2.2 + render3d_margin)) {
            continue;
        }
        // the world's drawing of the rock, as 2D picks it (js/surfaces.js), or a lump where the world has none; one
        // with nothing to raise stays 2D (its drawing looked up only while it has no model)
        if (!render3d.models.has(v) && render3d_rock_art(v) && !render3d_drawn(render3d_rock_art(v))) {
            continue;
        }
        const model = render3d_model(v, () => render3d_rock_make(v));
        model.group.position.set(v.x, 0, v.y);
        model.group.rotation.y = -v.angle;
        model.group.scale.setScalar(v.r*model.group.userData.scale);
        render3d_flash(model.group, v.flash > 0);
    }
    for (const enemy of enemies) {
        const art = enemy_sprite(enemy);
        const length = art.length;
        if (!in_view(enemy, length + render3d_margin)) {
            continue;
        }
        // a drawing with nothing to raise stays 2D (render3d_render_surface_ship)
        if (!render3d_drawn(art.name)) {
            continue;
        }
        const color = enemy.color || pink;
        // its drawing: a flagship's by its table, a raider's raised from its shapes
        const model = render3d_model(enemy, () => (render3d_arts[art.name] ? render3d_flagship_model(art.name, color) : render3d_raider_model(art.name, color)));
        const angle = ((enemy.type === 'lancer') && (enemy.charge_time > 0)) ? enemy.charge_angle : enemy.angle;
        render3d_ship_place(model, enemy.x, enemy.y, angle, length, enemy.flash > 0);
    }
    if (player && (state !== 'dead') && !teleport_active() && render3d_drawn(ship_sprite(current_ship()).name)) {
        // the model of your ship as it is: its class and the parts it wears, one list a layout (js/ship_parts.js);
        // after a change of ship or of a module (the hangar, a load) the old one is not seen, and goes below this frame
        const ship = current_ship();
        const parts = ship_parts_player();
        const model = render3d_model(parts, () => render3d_player_model(ship, parts));
        render3d_ship_place(model, player.x, player.y, player.angle, ship_sprite(ship).length, false);
        render3d_player_lights(model.group);
        render3d_player_guns(model.group, ship);
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
    if (station_model) {
        render3d_station_place(station_model);
    }
    // the rich rocks' veins breathe, steady with reduced effects
    const breath = full_fx ? 0.9 + Math.sin(clock*2.2)*0.35 : 0.9;
    for (const v of render3d.ores) {
        v.emissiveIntensity = breath;
    }
}

// The world's rock drawing for a rock, as 2D picks it (js/surfaces.js); null where the world has none
function render3d_rock_art(v)
{
    const variant = Math.abs(Math.floor(v.angle*11)) % 7;
    return world_art(v.resource ? `asteroid-rich-${(variant % 3) + 1}` : `asteroid-${(variant % 4) + 1}`);
}

// A rock's model: its drawing raised, or a lump in the world's rock colour; its size a factor of the rock's radius, as
// 2D draws its drawing (2.5) or the lump stood in for the old painted rock (2.2)
function render3d_rock_make(v)
{
    const art = render3d_rock_art(v);
    const ore = v.resource ? ore_color(v) : null;
    const rock = new render3d.three.Color(world_looks[campaign.world].material).multiplyScalar(0.62).getStyle();
    const out = art ? render3d_rock_model(art, ore) : render3d_rock_lump(Math.abs(Math.floor(v.angle*11)) % 7, rock, ore);
    out.userData.scale = art ? 2.5 : 2.2;
    return out;
}

// The station where it stands, its ring turning; the plain one's beacon blinking
function render3d_station_place(station_model)
{
    // its panels reach out to 0.65 of its size
    station_model.visible = in_view(station, station_size*0.7 + render3d_margin);
    const height = station_model.userData.height;
    if (height) {
        // the drawing's box (js/surfaces.js), its top a little over the plane of flight and its foot over the floor of
        // the shadows
        const box = station_size*1.025;
        const k = Math.min(1, 40/(height*box));
        station_model.scale.set(box, box*k, box);
        station_model.position.set(station.x, 6 - height*box*k, station.y);
    }
    else {
        station_model.position.set(station.x, -10, station.y);
        station_model.scale.set(station_size*0.97, station_size*0.4, station_size*0.97);
    }
    const ring = station_model.getObjectByName('ring');
    if (ring) {
        ring.rotation.y = -clock*0.04;
    }
    // the plain station's beacon flashes twice every 2.4 s, steady with reduced effects; a drawn one's lights glow
    // steady
    const beat = clock % 2.4;
    if (!height) {
        station_model.userData.beacon.emissiveIntensity = (!full_fx || (beat < 0.12) || ((beat > 0.3) && (beat < 0.42))) ? 2.2 : 0.35;
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

// Your guns on their mounts (mount_points), each its turret's drawing on the mount's ring, all turned to where they
// aim and each kicked back as it fires, as the 2D turrets are (js/turrets.js): one instanced mesh a kind of gun, made
// again when the guns change (the hangar, a load)
function render3d_player_guns(group, ship)
{
    const THREE = render3d.three;
    const guns = mounted_weapons();
    const points = mount_points(ship);
    const length = ship_sprite(ship).length;
    const had = group.userData.weapons;
    let same = !!had && (had.length === guns.length);
    for (let i = 0; same && (i < guns.length); ++i) {
        same = (had[i] === guns[i]);
    }
    if (!same) {
        for (const mesh of group.userData.guns || []) {
            group.remove(mesh);
            mesh.dispose();
        }
        group.userData.guns = [];
        group.userData.weapons = [...guns];
        const name = ship_sprite(ship).name;
        const hull = render3d_material('#ffffff', {vertex: true, roughness: 0.6, metalness: 0.25});
        // a gun with no drawing to raise has no turret in 3D
        for (const weapon of new Set(guns.filter(v => v && render3d_drawn(`weapons/turret-${v.id}`)))) {
            const mounts = [...guns.keys()].filter(v => guns[v] === weapon);
            const mesh = new THREE.InstancedMesh(render3d_turret_geometry(weapon), hull, mounts.length);
            // each mount's height: the top of its ring in the drawing (render3d_hull_top)
            mesh.userData.mounts = mounts.map(v => ({index: v, height: render3d_hull_top(name, 128 + (points[v].y*sprite_span)/length, 128 - (points[v].x*sprite_span)/length)}));
            mesh.receiveShadow = true;
            mesh.frustumCulled = false;
            group.add(mesh);
            group.userData.guns.push(mesh);
        }
    }
    const v = render3d.gun || (render3d.gun = {matrix: new THREE.Matrix4(), position: new THREE.Vector3(), turn: new THREE.Quaternion(), scale: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0)});
    const turn = (player.turret_angle ?? player.angle) - player.angle;
    v.turn.setFromAxisAngle(v.up, -turn);
    for (const mesh of group.userData.guns) {
        for (const [j, mount] of mesh.userData.mounts.entries()) {
            const p = points[mount.index];
            const back = (turret_recoil(mount.index)*0.4)/length;
            v.position.set(p.x/length - Math.cos(turn)*back, (mount.height - 1)/sprite_span, p.y/length - Math.sin(turn)*back);
            v.scale.setScalar(gun_boxes[p.size]/length);
            mesh.setMatrixAt(j, v.matrix.compose(v.position, v.turn, v.scale));
        }
        mesh.instanceMatrix.needsUpdate = true;
    }
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

// Your ship and the raiders are models now; their trails, freighters and escorts stay 2D, and so does the shield
// bubble your ship wears, a glow over its hull
function render3d_render_surface_ship(x, y, angle, alpha = 1, ghost = false, definition = null)
{
    if (render3d_active() && !ghost && (definition ? definition.enemy : is_player_vessel(x, y)) && render3d_drawn(definition ? definition.sprite.name : ship_sprite(current_ship()).name)) {
        if (!definition) {
            render3d_shield_parts(x, y, angle, alpha);
        }
        return;
    }
    render3d_base_render_surface_ship(x, y, angle, alpha, ghost, definition);
}

// The shield bubble among your ship's parts, as 2D draws it over the hull (js/ship_parts.js): in the drawing's frame,
// fading with the charge
function render3d_shield_parts(x, y, angle, alpha)
{
    for (const v of ship_parts_player()) {
        if (!v.shield) {
            continue;
        }
        const unit = ship_sprite(current_ship()).length/sprite_span;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + Math.PI/2);
        ctx.scale(unit, unit);
        sprite_draw_box(`parts/3d/${v.sprite}`, null, v.size, v.x - 128, v.y - 128, v.rot, alpha*clamp(player.shield/Math.max(1, shield_max()), 0.25, 1));
        ctx.restore();
    }
}

// Your guns are models on a model of your ship; on a ship left to 2D, they stay 2D with it
function render3d_render_ship_turrets(alpha = 1)
{
    if (!render3d_active() || !render3d_drawn(ship_sprite(current_ship()).name)) {
        render3d_base_render_ship_turrets(alpha);
    }
}

// A rock is a model, but one whose drawing has nothing to raise (a stand-in picture); its hull bar stays
function render3d_render_world_ore(v)
{
    if (!render3d_active() || !render3d.models.has(v)) {
        render3d_base_render_world_ore(v);
        return;
    }
    if (in_view(v, v.r + 8)) {
        ore_hp_bar(v);
    }
}

// The station is a model, but one whose drawing has nothing to raise; its shelter ring, its shield and its name stay
function render3d_render_world_station()
{
    if (!render3d_active() || !render3d.station) {
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
