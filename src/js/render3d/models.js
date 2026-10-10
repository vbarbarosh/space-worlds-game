// The low-poly models of the 3D view, built in code from a few shapes: no model files. Each points along +x and is one
// unit long (a station: one unit across), its height kept low, so the caller scales it to the sprite it stands in for.
// Geometries and materials are shared by every model of a kind; a model is a group of meshes.

function render3d_material(color, options = {})
{
    const THREE = render3d.three;
    const key = `${color}|${options.emissive || ''}|${options.glow || 0}`;
    let out = render3d.materials.get(key);
    if (!out) {
        out = new THREE.MeshStandardMaterial({
            color,
            emissive: options.emissive || '#000000',
            emissiveIntensity: options.glow || 0,
            roughness: options.roughness ?? 0.75,
            metalness: options.metalness ?? 0.15,
            flatShading: true,
        });
        render3d.materials.set(key, out);
    }
    return out;
}

// A geometry made once and kept by its name
function render3d_geometry(name, make)
{
    let out = render3d.geometries.get(name);
    if (!out) {
        out = make(render3d.three);
        render3d.geometries.set(name, out);
    }
    return out;
}

function render3d_mesh(group, geometry, material, x = 0, y = 0, z = 0)
{
    const out = new render3d.three.Mesh(geometry, material);
    out.position.set(x, y, z);
    out.castShadow = true;
    out.receiveShadow = true;
    group.add(out);
    return out;
}

// A cone of `sides` faces lying along +x, its tip forward
function render3d_nose(THREE, radius, length, sides)
{
    const out = new THREE.ConeGeometry(radius, length, sides);
    out.rotateZ(-Math.PI/2);
    return out;
}

// A wing: a flat swept plate on the +z side (span), its root along the hull
function render3d_wing(THREE, points, thickness)
{
    const shape = new THREE.Shape(points.map(v => new THREE.Vector2(v[0], v[1])));
    const out = new THREE.ExtrudeGeometry(shape, {depth: thickness, bevelEnabled: false});
    out.rotateX(Math.PI/2);
    out.translate(0, thickness/2, 0);
    return out;
}

// Your ship: an orange hull with a nose, swept wings, a cockpit and two engines glowing at the back
function render3d_player_model()
{
    const out = new render3d.three.Group();
    const hull = render3d_material('#e8743b', {roughness: 0.6});
    const plate = render3d_material('#c9d3dd', {roughness: 0.55, metalness: 0.3});
    const dark = render3d_material('#2a3340');
    const glass = render3d_material('#6cf8ec', {emissive: '#6cf8ec', glow: 0.35, roughness: 0.2});
    const flame = render3d_material('#9bcfff', {emissive: '#9bcfff', glow: 1.6});
    render3d_mesh(out, render3d_geometry('player:nose', v => render3d_nose(v, 0.16, 0.62, 4)), hull, 0.19, 0, 0);
    render3d_mesh(out, render3d_geometry('player:body', v => new v.BoxGeometry(0.42, 0.16, 0.22)), hull, -0.3, 0, 0);
    const wing = render3d_geometry('player:wing', v => render3d_wing(v, [[0.05, 0.08], [-0.34, 0.46], [-0.46, 0.46], [-0.4, 0.08]], 0.035));
    render3d_mesh(out, wing, plate, 0, -0.02, 0);
    render3d_mesh(out, wing, plate, 0, -0.02, 0).scale.z = -1;
    render3d_mesh(out, render3d_geometry('player:fin', v => new v.BoxGeometry(0.2, 0.14, 0.025)), dark, -0.38, 0.12, 0);
    render3d_mesh(out, render3d_geometry('player:cockpit', v => new v.OctahedronGeometry(0.075)), glass, 0.04, 0.09, 0).scale.set(1.9, 0.8, 1);
    const engine = render3d_geometry('player:engine', v => new v.CylinderGeometry(0.06, 0.075, 0.18, 6).rotateZ(Math.PI/2));
    const nozzle = render3d_geometry('player:nozzle', v => new v.CylinderGeometry(0.05, 0.05, 0.02, 6).rotateZ(Math.PI/2));
    for (const z of [-0.14, 0.14]) {
        render3d_mesh(out, engine, dark, -0.48, 0, z);
        render3d_mesh(out, nozzle, flame, -0.58, 0, z).castShadow = false;
    }
    return out;
}

// A raider in its colour over a dark hull, its shape by its type; an elite carries gold fins, the flagship is a disc
// with spikes around a glowing core
function render3d_raider_model(type, color, elite)
{
    const out = new render3d.three.Group();
    const dark = render3d_material('#454c5c', {metalness: 0.3});
    const paint = render3d_material(color, {emissive: color, glow: 0.3});
    const core = render3d_material(color, {emissive: color, glow: 1.2});
    const fin = elite ? render3d_material(gold, {emissive: gold, glow: 0.3, metalness: 0.5}) : dark;
    if (type === 'boss') {
        render3d_mesh(out, render3d_geometry('boss:disc', v => new v.CylinderGeometry(0.42, 0.5, 0.14, 6)), dark);
        render3d_mesh(out, render3d_geometry('boss:deck', v => new v.CylinderGeometry(0.3, 0.36, 0.1, 6)), paint, 0, 0.11, 0);
        render3d_mesh(out, render3d_geometry('boss:core', v => new v.IcosahedronGeometry(0.13, 0)), core, 0, 0.2, 0);
        const spike = render3d_geometry('boss:spike', v => render3d_nose(v, 0.06, 0.24, 4));
        for (let i = 0; i < 6; ++i) {
            const a = (i/6)*Math.PI*2;
            const mesh = render3d_mesh(out, spike, paint, Math.cos(a)*0.55, 0, Math.sin(a)*0.55);
            mesh.rotation.y = -a;
        }
        return out;
    }
    if (type === 'tank') {
        render3d_mesh(out, render3d_geometry('tank:hull', v => new v.CylinderGeometry(0.4, 0.46, 0.24, 6)), dark);
        render3d_mesh(out, render3d_geometry('tank:top', v => new v.CylinderGeometry(0.26, 0.32, 0.12, 6)), paint, 0, 0.17, 0);
        render3d_mesh(out, render3d_geometry('tank:gun', v => new v.BoxGeometry(0.34, 0.06, 0.08)), fin, 0.3, 0.17, 0);
        return out;
    }
    if (type === 'splitter') {
        const pod = render3d_geometry('splitter:pod', v => render3d_nose(v, 0.13, 0.42, 3).scale(1, 0.6, 1));
        for (let i = 0; i < 3; ++i) {
            const a = (i/3)*Math.PI*2;
            const mesh = render3d_mesh(out, pod, i ? dark : paint, Math.cos(a)*0.2, 0, Math.sin(a)*0.2);
            mesh.rotation.y = -a;
        }
        render3d_mesh(out, render3d_geometry('splitter:core', v => new v.OctahedronGeometry(0.1)), core, 0, 0.04, 0);
        return out;
    }
    if (type === 'lancer') {
        render3d_mesh(out, render3d_geometry('lancer:lance', v => render3d_nose(v, 0.1, 1, 4).scale(1, 0.7, 1)), paint);
        const wing = render3d_geometry('lancer:fin', v => render3d_wing(v, [[-0.1, 0.04], [-0.42, 0.26], [-0.48, 0.26], [-0.36, 0.04]], 0.03));
        render3d_mesh(out, wing, fin);
        render3d_mesh(out, wing, fin).scale.z = -1;
        return out;
    }
    // chaser and shooter: a flat wedge, the shooter with a gun pod on each side
    render3d_mesh(out, render3d_geometry('raider:wedge', v => render3d_nose(v, 0.3, 0.9, 3).rotateX(Math.PI).scale(1, 0.45, 1)), dark);
    render3d_mesh(out, render3d_geometry('raider:spine', v => render3d_nose(v, 0.1, 0.62, 3).scale(1, 0.7, 1)), paint, -0.04, 0.08, 0);
    render3d_mesh(out, render3d_geometry('raider:eye', v => new v.OctahedronGeometry(0.05)), core, 0.12, 0.1, 0);
    if (type === 'shooter') {
        const gun = render3d_geometry('shooter:pod', v => new v.CylinderGeometry(0.05, 0.06, 0.4, 6).rotateZ(Math.PI/2));
        render3d_mesh(out, gun, fin, 0.02, 0, 0.24);
        render3d_mesh(out, gun, fin, 0.02, 0, -0.24);
    }
    else {
        render3d_mesh(out, render3d_geometry('raider:fin', v => new v.BoxGeometry(0.22, 0.14, 0.03)), fin, -0.3, 0.08, 0);
    }
    return out;
}

// A rock: an icosahedron pushed in and out by its seed, one of seven; a rich one wears crystals of its ore
function render3d_rock_model(variant, rock_color, ore)
{
    const out = new render3d.three.Group();
    const geometry = render3d_geometry(`rock:${variant}`, function (THREE) {
        const out = new THREE.IcosahedronGeometry(0.5, 1);
        const random = visual_random_from_seed(4127 + variant*313);
        const position = out.attributes.position;
        // the same corner appears once per face it touches: each moves by its place, so the faces stay joined
        const moved = new Map();
        for (let i = 0, end = position.count; i < end; ++i) {
            const key = `${position.getX(i).toFixed(3)},${position.getY(i).toFixed(3)},${position.getZ(i).toFixed(3)}`;
            if (!moved.has(key)) {
                moved.set(key, 0.78 + random()*0.36);
            }
            const k = moved.get(key);
            position.setXYZ(i, position.getX(i)*k, position.getY(i)*k*0.72, position.getZ(i)*k);
        }
        out.computeVertexNormals();
        return out;
    });
    render3d_mesh(out, geometry, render3d_material(rock_color, {roughness: 0.95, metalness: 0}));
    if (ore) {
        const crystal = render3d_geometry('rock:crystal', v => new v.OctahedronGeometry(0.09).scale(0.8, 1.8, 0.8));
        const material = render3d_material(ore, {emissive: ore, glow: 0.9, roughness: 0.3});
        for (let i = 0; i < 3; ++i) {
            const a = variant + i*2.1;
            const mesh = render3d_mesh(out, crystal, material, Math.cos(a)*0.22, 0.24, Math.sin(a)*0.22);
            mesh.rotation.set(Math.cos(a)*0.5, a, Math.sin(a)*0.5);
            mesh.castShadow = false;
        }
    }
    return out;
}

// The station: a hub, a ring that turns, spokes, four berths reaching out, and lights in the world's accent
function render3d_station_model(metal, accent)
{
    const THREE = render3d.three;
    const out = new THREE.Group();
    const plate = render3d_material(metal, {roughness: 0.6, metalness: 0.35});
    const dark = render3d_material('#2a3340');
    const light = render3d_material(accent, {emissive: accent, glow: 0.8});
    render3d_mesh(out, render3d_geometry('station:hub', v => new v.CylinderGeometry(0.11, 0.14, 0.12, 8)), plate);
    render3d_mesh(out, render3d_geometry('station:dome', v => new v.CylinderGeometry(0.035, 0.07, 0.05, 8)), plate, 0, 0.085, 0);
    render3d_mesh(out, render3d_geometry('station:beacon', v => new v.OctahedronGeometry(0.018)), light, 0, 0.125, 0).castShadow = false;
    const ring = new THREE.Group();
    ring.name = 'ring';
    render3d_mesh(ring, render3d_geometry('station:ring', v => new v.TorusGeometry(0.36, 0.035, 5, 28).rotateX(Math.PI/2)), plate);
    const spoke = render3d_geometry('station:spoke', v => new v.BoxGeometry(0.24, 0.025, 0.03));
    const lamp = render3d_geometry('station:lamp', v => new v.BoxGeometry(0.03, 0.03, 0.05));
    for (let i = 0; i < 4; ++i) {
        const a = (i/4)*Math.PI*2 + Math.PI/4;
        render3d_mesh(ring, spoke, dark, Math.cos(a)*0.24, 0, Math.sin(a)*0.24).rotation.y = -a;
    }
    for (let i = 0; i < 12; ++i) {
        const a = (i/12)*Math.PI*2;
        const mesh = render3d_mesh(ring, lamp, light, Math.cos(a)*0.36, 0.03, Math.sin(a)*0.36);
        mesh.rotation.y = -a;
        mesh.castShadow = false;
    }
    const module = render3d_geometry('station:module', v => new v.BoxGeometry(0.05, 0.05, 0.08));
    for (let i = 0; i < 8; ++i) {
        const a = (i/8)*Math.PI*2 + Math.PI/8;
        render3d_mesh(ring, module, plate, Math.cos(a)*0.36, 0.02, Math.sin(a)*0.36).rotation.y = -a;
    }
    out.add(ring);
    // two wings of solar panels on a mast, east and west of the hub
    const solar = render3d_material('#1d3550', {roughness: 0.35, metalness: 0.6});
    const panel = render3d_geometry('station:panel', v => new v.BoxGeometry(0.09, 0.012, 0.16));
    const mast = render3d_geometry('station:mast', v => new v.BoxGeometry(0.9, 0.02, 0.02));
    render3d_mesh(out, mast, dark, 0, 0.05, 0);
    for (const x of [-0.62, -0.52, 0.52, 0.62]) {
        render3d_mesh(out, panel, solar, x, 0.05, 0);
    }
    const berth = render3d_geometry('station:berth', v => new v.BoxGeometry(0.16, 0.035, 0.035));
    const pad = render3d_geometry('station:pad', v => new v.BoxGeometry(0.035, 0.02, 0.06));
    for (let i = 0; i < 4; ++i) {
        const a = (i/4)*Math.PI*2;
        render3d_mesh(out, berth, plate, Math.cos(a)*0.46, 0, Math.sin(a)*0.46).rotation.y = -a;
        render3d_mesh(out, pad, light, Math.cos(a)*0.55, 0, Math.sin(a)*0.55).rotation.y = -a;
    }
    return out;
}
