// The low-poly models of the 3D view, built in code from a few shapes: no model files. Each points along +x and is one
// unit long (a station: one unit across), its height kept low, so the caller scales it to the sprite it stands in for.
// Geometries and materials are shared by every model of a kind; a model is a group of meshes, its parts that never
// move apart merged into one mesh per material (render3d_merge).

// A material shared by every model using it; `vertex` takes the colour of each part from its geometry (render3d_art_part)
function render3d_material(color, options = {})
{
    const key = `${color}|${options.emissive || ''}|${options.glow || 0}|${options.vertex ? 'vertex' : ''}`;
    let out = render3d.materials.get(key);
    if (!out) {
        out = render3d_material_own(color, options);
        render3d.materials.set(key, out);
    }
    return out;
}

// A material of one model alone, for a glow that changes as it flies: engines, running lights, a beacon. The model
// lists it in its `userData.own`, and render3d_retire frees it with the model
function render3d_material_own(color, options = {})
{
    return new render3d.three.MeshStandardMaterial({
        color,
        emissive: options.emissive || '#000000',
        emissiveIntensity: options.glow || 0,
        roughness: options.roughness ?? 0.75,
        metalness: options.metalness ?? 0.15,
        vertexColors: !!options.vertex,
        flatShading: true,
    });
}

// A small light on a hull that casts no shadow
function render3d_lamp(group, geometry, material, x, y, z)
{
    const out = render3d_mesh(group, geometry, material, x, y, z);
    out.castShadow = false;
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

// The group's meshes of one material and one shadow become one mesh, a draw call instead of one per part; a group
// within it (the station's ring, which turns) keeps its own. The merged geometry is made once, kept by the model's
// name and the parts it holds, and shared: every model of a name has the same parts in the same places, its materials
// may differ.
function render3d_merge(group, name)
{
    const sets = new Map();
    for (const [i, mesh] of group.children.filter(v => v.isMesh).entries()) {
        const key = `${mesh.material.id}|${mesh.castShadow}`;
        if (!sets.has(key)) {
            sets.set(key, []);
        }
        sets.get(key).push({mesh, i});
    }
    for (const parts of sets.values()) {
        if (parts.length < 2) {
            continue;
        }
        const meshes = parts.map(v => v.mesh);
        const geometry = render3d_geometry(`${name}:${parts.map(v => v.i).join(',')}`, v => render3d_merged(v, meshes));
        group.remove(...meshes);
        render3d_mesh(group, geometry, meshes[0].material).castShadow = meshes[0].castShadow;
    }
}

// One geometry of the meshes, each part moved to its place; a mirrored part has its faces turned so they face out.
// Parts coloured each in its own (render3d_art_part) keep their colours.
function render3d_merged(THREE, meshes)
{
    const position = [];
    const normal = [];
    const index = [];
    const color = meshes.every(v => v.geometry.attributes.color) ? [] : null;
    for (const mesh of meshes) {
        mesh.updateMatrix();
        const part = mesh.geometry.clone().applyMatrix4(mesh.matrix);
        const offset = position.length/3;
        const mirrored = mesh.matrix.determinant() < 0;
        const corners = part.index ? part.index.array : [...Array(part.attributes.position.count).keys()];
        for (let i = 0, end = corners.length; i < end; i += 3) {
            index.push(offset + corners[i], offset + corners[mirrored ? i + 2 : i + 1], offset + corners[mirrored ? i + 1 : i + 2]);
        }
        position.push(...part.attributes.position.array);
        normal.push(...part.attributes.normal.array);
        color?.push(...part.attributes.color.array);
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
    if (color) {
        out.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
    }
    out.setIndex(index);
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

// Your ships and the worlds' flagships as their drawings (src/sprites/3d/<name>.svg) seen from above, part by part:
// [colour, bottom, top, shape, bevel], each a shape of the drawing raised from `bottom` to `top` above the plane of
// flight, in the drawing's units (render3d_art_part). A part in a colour is hull, all of them one material; 'glass' is
// a canopy, 'accent' a flagship's accent in its world's colour (a ship's is the drawing's own orange). The gun mounts
// are the drawing's, where mount_points puts the guns. `nozzle` is the height of the engines, at the drawing's flame
// marks; `lights` are your ship's running lights, [x, y, height].
const render3d_arts = {
    'ship-scout': {
        nozzle: 5.5,
        lights: [[40, 195, 9], [216, 195, 9], [128, 216, 18.5]],
        parts: [
            ['#b9c2cc', 3, 8, 'M112 112 L40 186 Q35 199 46 204 L108 194 Z'],
            ['#b9c2cc', 3, 8, 'M144 112 L216 186 Q221 199 210 204 L148 194 Z'],
            ['#e8743b', 7.5, 9, 'M40 186 L57 169 L62 201 L46 204 Q35 199 40 186 Z'],
            ['#e8743b', 7.5, 9, 'M216 186 L199 169 L194 201 L210 204 Q221 199 216 186 Z'],
            ['#4d5966', 0, 11, 'M114 210 L142 210 L139 238 L117 238 Z'],
            ['#d3dae2', 0, 17, 'M128 14 Q140 40 146 96 L150 160 Q152 196 140 222 L116 222 Q104 196 106 160 L110 96 Q116 40 128 14 Z', 4],
            ['#1c232c', 3, 14, 'M109 118 L103 150 L109 162 L113 130 Z'],
            ['#1c232c', 3, 14, 'M147 118 L153 150 L147 162 L143 130 Z'],
            ['#4d5966', 13, 18, 'M116 194 L140 194 L138 216 L118 216 Z'],
            ['#e8743b', 14, 18, 'M110 148 L128 158 L146 148 L147 160 L128 170 L109 160 Z'],
            ['#3a4552', 14, 18.5, {x: 128, y: 84, rx: 13, ry: 30}],
            ['glass', 18, 25, {x: 128, y: 85, rx: 9.5, ry: 25, dome: true}],
            ['#a9b3be', 15, 19.5, {x: 128, y: 131, r: 14.5}],
            ['#1c232c', 19, 20.5, {x: 128, y: 131, r: 8}],
        ],
    },
    'ship-courier': {
        nozzle: 5.5,
        lights: [[62, 164, 10], [194, 164, 10], [128, 230, 19]],
        parts: [
            ['#a9b3be', 2, 10, {x: 62, y: 146, w: 132, h: 36, r: 6}],
            ['#4d5966', 0, 11, {x: 77, y: 221, w: 21, h: 21}],
            ['#4d5966', 0, 11, {x: 158, y: 221, w: 21, h: 21}],
            ['#d3dae2', 0, 17, 'M71 143 L104 143 L104 218 Q104 233 87.5 233 Q71 233 71 218 Z', 3],
            ['#d3dae2', 0, 17, 'M152 143 L185 143 L185 218 Q185 233 168.5 233 Q152 233 152 218 Z', 3],
            ['#e8743b', 0, 17, 'M71 143 L71 128 Q71 113 87.5 113 Q104 113 104 128 L104 143 Z', 3],
            ['#e8743b', 0, 17, 'M152 143 L152 128 Q152 113 168.5 113 Q185 113 185 128 L185 143 Z', 3],
            ['#d3dae2', 0, 19, 'M128 14 L152 59 L158 164 L149 236 L107 236 L98 164 L104 59 Z', 4],
            ['#a9b3be', 17, 20.5, {x: 107, y: 104, w: 42, h: 99, r: 7.5}],
            ['#1c232c', 3, 16, 'M104 104 L98 149 L102.5 164 L107 116 Z'],
            ['#1c232c', 3, 16, 'M152 104 L158 149 L153.5 164 L149 116 Z'],
            ['#e8743b', 16, 20, 'M104 80 L152 80 L153.5 95 L102.5 95 Z'],
            ['glass', 16, 25, {x: 128, y: 59, rx: 12, ry: 22.5, dome: true}],
            ['#a9b3be', 16, 20, {x: 87.5, y: 185, r: 12}],
            ['#1c232c', 19.5, 21, {x: 87.5, y: 185, r: 6}],
            ['#a9b3be', 16, 20, {x: 168.5, y: 185, r: 12}],
            ['#1c232c', 19.5, 21, {x: 168.5, y: 185, r: 6}],
        ],
    },
    'ship-interceptor': {
        nozzle: 5,
        lights: [[14, 175, 9], [242, 175, 9], [128, 205, 18]],
        parts: [
            ['#a9b3be', 4, 9, 'M33.4 153.47 L89.19 117.09 L166.81 117.09 L222.6 153.47 L222.6 183.79 L166.81 177.72 L89.19 177.72 L33.4 183.79 Z'],
            ['#e8743b', 4, 9, 'M14 165.6 L33.4 153.47 L33.4 183.79 L14 185 Z'],
            ['#e8743b', 4, 9, 'M242 165.6 L222.6 153.47 L222.6 183.79 L242 185 Z'],
            ['#4d5966', 0, 10, {x: 75.85, y: 214.11, w: 16.98, h: 16.98}],
            ['#4d5966', 0, 10, {x: 163.17, y: 214.11, w: 16.98, h: 16.98}],
            ['#4d5966', 0, 10, {x: 119.51, y: 206.83, w: 16.98, h: 16.98}],
            ['#d3dae2', 0, 15, 'M74.64 71 Q84.34 51.6 94.04 71 L94.04 223.81 L74.64 223.81 Z', 3],
            ['#d3dae2', 0, 15, 'M161.96 71 Q171.66 51.6 181.36 71 L181.36 223.81 L161.96 223.81 Z', 3],
            ['#d3dae2', 0, 18, 'M128 24.91 L144.98 63.72 L147.4 187.43 L137.7 216.53 L118.3 216.53 L108.6 187.43 L111.02 63.72 Z', 4],
            ['glass', 15, 24, {x: 128, y: 87.98, rx: 9.7, ry: 23.04, dome: true}],
            ['#e8743b', 13, 16, {x: 74.64, y: 148.62, w: 19.4, h: 19.4}],
            ['#e8743b', 13, 16, {x: 161.96, y: 148.62, w: 19.4, h: 19.4}],
            ['#1c232c', 17.4, 18.8, {x: 118.3, y: 177.72, w: 19.4, h: 4.24}],
            ['#1c232c', 17.4, 18.8, {x: 118.3, y: 186.21, w: 19.4, h: 4.24}],
            ['#a9b3be', 13, 17.5, {x: 84.34, y: 92, r: 21.5}],
            ['#1c232c', 17, 18.5, {x: 84.34, y: 92, r: 11.83}],
            ['#a9b3be', 13, 17.5, {x: 171.66, y: 92, r: 21.5}],
            ['#1c232c', 17, 18.5, {x: 171.66, y: 92, r: 11.83}],
        ],
    },
    'ship-gunship': {
        nozzle: 5,
        lights: [[20, 183, 10], [236, 183, 10], [128, 176, 17]],
        parts: [
            ['#4d5966', 0, 9, {x: 87.2, y: 220.4, w: 24, h: 21.6}],
            ['#4d5966', 0, 9, {x: 116, y: 220.4, w: 24, h: 21.6}],
            ['#4d5966', 0, 9, {x: 144.8, y: 220.4, w: 24, h: 21.6}],
            ['#a9b3be', 0, 10, 'M128 14 L164 52.4 L173.6 114.8 L236 160.4 L236 206 L176 215.6 L164 232.4 L92 232.4 L80 215.6 L20 206 L20 160.4 L82.4 114.8 L92 52.4 Z', 3],
            ['#d3dae2', 0, 17, 'M128 30.8 L154.4 59.6 L161.6 112.4 L152 182 L104 182 L94.4 112.4 L101.6 59.6 Z', 4],
            ['glass', 14, 18.5, 'M117.2 47.6 L138.8 47.6 L135.2 64.4 L120.8 64.4 Z'],
            ['#1c232c', 9.5, 11, {x: 108.8, y: 194, w: 38.4, h: 4.8}],
            ['#1c232c', 9.5, 11, {x: 108.8, y: 203.6, w: 38.4, h: 4.8}],
            ['#1c232c', 9.5, 11, {x: 108.8, y: 213.2, w: 38.4, h: 4.8}],
            ['#e8743b', 9.5, 11.2, 'M44 172.4 L89.6 141.2 L96.8 196.4 L44 196.4 Z'],
            ['#e8743b', 9.5, 11.2, 'M212 172.4 L166.4 141.2 L159.2 196.4 L212 196.4 Z'],
            ['#e8743b', 9.5, 11.2, 'M128 14 L142.4 29.6 L113.6 29.6 Z'],
            ['#98a2ad', 3, 13, 'M96 67.2 L79 64 A16 16 0 0 0 79 96 L96 92.8 Z', 2],
            ['#a9b3be', 12, 15.5, {x: 79, y: 80, r: 11}],
            ['#1c232c', 15, 16.5, {x: 79, y: 80, r: 5.5}],
            ['#98a2ad', 3, 13, 'M160 67.2 L177 64 A16 16 0 0 1 177 96 L160 92.8 Z', 2],
            ['#a9b3be', 12, 15.5, {x: 177, y: 80, r: 11}],
            ['#1c232c', 15, 16.5, {x: 177, y: 80, r: 5.5}],
            ['#98a2ad', 15, 19.5, 'M149.71 158.99 L136.99 171.71 L119.01 171.71 L106.29 158.99 L106.29 141.01 L119.01 128.29 L136.99 128.29 L149.71 141.01 Z', 1.5],
            ['#a9b3be', 19, 22.5, {x: 128, y: 150, r: 16.5}],
            ['#1c232c', 22, 23.5, {x: 128, y: 150, r: 9.08}],
        ],
    },
    'ship-miner': {
        nozzle: 5.5,
        lights: [[48.74, 128, 15.5], [207.26, 128, 15.5], [128, 232, 16.5]],
        parts: [
            ['#a9b3be', 0, 15, {x: 32.46, y: 124.74, w: 32.57, h: 106.4, r: 10.86}, 3],
            ['#a9b3be', 0, 15, {x: 190.97, y: 124.74, w: 32.57, h: 106.4, r: 10.86}, 3],
            ['#4d5966', 0, 11, {x: 84.57, y: 222.46, w: 26.06, h: 19.54}],
            ['#4d5966', 0, 11, {x: 145.37, y: 222.46, w: 26.06, h: 19.54}],
            ['#4d5966', 2, 14, {x: 110.63, y: 53.09, w: 34.74, h: 23.89}],
            // the drill: a cone along the nose, its tip in the accent
            ['#a9b3be', 1, 19, {x: 128, y: [59.6, 35.71], r: [19.54, 9.77]}],
            ['#e8743b', 5.5, 14.5, {x: 128, y: [35.71, 14], r: [9.77, 0]}],
            ['#d3dae2', 0, 16, 'M93.26 72.63 L162.74 72.63 L171.43 124.74 L193.14 137.77 L197.49 224.63 L171.43 237.66 L84.57 237.66 L58.51 224.63 L62.86 137.77 L84.57 124.74 Z', 3],
            ['#3a424c', 14.5, 16.6, {x: 80.23, y: 139.94, w: 95.54, h: 82.51, r: 6.51}],
            // the ore in the hold
            ['#8a7a6a', 15, 19.5, 'M88.91 159.49 L110.63 146.46 L130.17 159.49 L123.66 183.37 L95.43 183.37 Z', 1.5],
            ['#6e6259', 15, 19, 'M132.34 152.97 L158.4 146.46 L169.26 168.17 L151.89 187.71 L132.34 179.03 Z', 1.5],
            ['#6e6259', 15, 18.5, 'M91.09 194.23 L121.49 189.89 L132.34 211.6 L97.6 215.94 Z', 1.5],
            ['#8a7a6a', 15, 19, 'M136.69 194.23 L162.74 192.06 L169.26 213.77 L141.03 215.94 Z', 1.5],
            ['glass', 14.5, 17.5, 'M106.29 81.31 L149.71 81.31 L154.06 105.2 L101.94 105.2 Z'],
            ['#e8743b', 14.5, 17, {x: 97.6, y: 111.71, w: 60.8, h: 9.77}],
            ['#3a424c', 13, 17, {x: 48.74, y: 146.46, r: 8}],
            ['#3a424c', 13, 17, {x: 207.26, y: 146.46, r: 8}],
            ['#3a424c', 13, 17.5, {x: 48.74, y: 181.2, r: 11.94}],
            ['#3a424c', 13, 17.5, {x: 48.74, y: 211.6, r: 11.94}],
            ['#3a424c', 13, 17.5, {x: 207.26, y: 181.2, r: 11.94}],
            ['#3a424c', 13, 17.5, {x: 207.26, y: 211.6, r: 11.94}],
            ['#e8743b', 17, 18.5, {x: 48.74, y: 181.2, r: 5.43}],
            ['#e8743b', 17, 18.5, {x: 48.74, y: 211.6, r: 5.43}],
            ['#e8743b', 17, 18.5, {x: 207.26, y: 181.2, r: 5.43}],
            ['#e8743b', 17, 18.5, {x: 207.26, y: 211.6, r: 5.43}],
            ['#1c232c', 14.5, 16.8, {x: 65.03, y: 148.63, w: 10.86, h: 3.8}],
            ['#1c232c', 14.5, 16.8, {x: 65.03, y: 157.31, w: 10.86, h: 3.8}],
            ['#1c232c', 14.5, 16.8, {x: 65.03, y: 166, w: 10.86, h: 3.8}],
            ['#1c232c', 14.5, 16.8, {x: 180.11, y: 148.63, w: 10.86, h: 3.8}],
            ['#1c232c', 14.5, 16.8, {x: 180.11, y: 157.31, w: 10.86, h: 3.8}],
            ['#1c232c', 14.5, 16.8, {x: 180.11, y: 166, w: 10.86, h: 3.8}],
            ['#98a2ad', 16, 21, {x: 76, y: 170, w: 104, h: 22, r: 3}, 1.5],
            ['#a9b3be', 20.5, 24, {x: 128, y: 181, r: 12.5}],
            ['#1c232c', 23.5, 25, {x: 128, y: 181, r: 6.88}],
        ],
    },
    'ship-cruiser': {
        nozzle: 5,
        lights: [[67.89, 193, 13.5], [188.11, 193, 13.5], [128, 218, 19]],
        parts: [
            ['#4d5966', 0, 10, {x: 94.84, y: 223.35, w: 66.33, h: 18.65}],
            ['#d3dae2', 0, 12, 'M128 14 L140.44 43.02 L144.58 96.91 L161.16 107.27 L163.24 159.09 L188.11 175.67 L188.11 210.91 L163.24 217.13 L157.02 231.64 L98.98 231.64 L92.76 217.13 L67.89 210.91 L67.89 175.67 L92.76 159.09 L94.84 107.27 L111.42 96.91 L115.56 43.02 Z', 3],
            ['#a9b3be', 11, 13.5, 'M67.89 175.67 L92.76 161.16 L92.76 215.05 L67.89 210.91 Z'],
            ['#a9b3be', 11, 13.5, 'M188.11 175.67 L163.24 161.16 L163.24 215.05 L188.11 210.91 Z'],
            ['#a9b3be', 6, 19, {x: 117.64, y: 49.24, w: 20.73, h: 174.11}, 2.5],
            ['#4d5966', 8, 21, 'M109.35 161.16 L146.65 161.16 L150.8 192.25 L105.2 192.25 Z', 2],
            ['#e8743b', 20.5, 22, {x: 113.49, y: 169.45, w: 29.02, h: 10.36}],
            ['#1c232c', 11.5, 13, {x: 103.13, y: 200.55, w: 49.75, h: 4.15}],
            ['#1c232c', 11.5, 13, {x: 103.13, y: 207.8, w: 49.75, h: 4.15}],
            ['#e8743b', 11, 13.5, 'M128 14 L136.29 32.65 L119.71 32.65 Z'],
            ['#e8743b', 13, 14.5, {x: 80.33, y: 196.4, r: 6.22}],
            ['#e8743b', 13, 14.5, {x: 175.67, y: 196.4, r: 6.22}],
            ['#98a2ad', 8, 15, 'M122 66.8 L104 64 A14 14 0 0 0 104 92 L122 89.2 Z', 2],
            ['#a9b3be', 14.5, 17.5, {x: 104, y: 78, r: 9}],
            ['#1c232c', 17, 18.5, {x: 104, y: 78, r: 4.5}],
            ['#98a2ad', 8, 15, 'M134 66.8 L152 64 A14 14 0 0 1 152 92 L134 89.2 Z', 2],
            ['#a9b3be', 14.5, 17.5, {x: 152, y: 78, r: 9}],
            ['#1c232c', 17, 18.5, {x: 152, y: 78, r: 4.5}],
            ['#98a2ad', 6, 14, 'M112 118 L102 114 A20 20 0 0 0 102 154 L112 150 Z', 2],
            ['#98a2ad', 8, 16, 'M120.48 141.65 L109.65 152.48 L94.35 152.48 L83.52 141.65 L83.52 126.35 L94.35 115.52 L109.65 115.52 L120.48 126.35 Z', 2],
            ['#a9b3be', 15.5, 19, {x: 102, y: 134, r: 13}],
            ['#1c232c', 18.5, 20, {x: 102, y: 134, r: 7.15}],
            ['#98a2ad', 6, 14, 'M144 118 L154 114 A20 20 0 0 1 154 154 L144 150 Z', 2],
            ['#98a2ad', 8, 16, 'M172.48 141.65 L161.65 152.48 L146.35 152.48 L135.52 141.65 L135.52 126.35 L146.35 115.52 L161.65 115.52 L172.48 126.35 Z', 2],
            ['#a9b3be', 15.5, 19, {x: 154, y: 134, r: 13}],
            ['#1c232c', 18.5, 20, {x: 154, y: 134, r: 7.15}],
        ],
    },
    'flagship-haven': {
        nozzle: 5,
        parts: [
            ['#5e7183', 3, 9, 'M108.17 93.3 Q40.77 109.17 22.92 208.3 Q62.57 176.57 106.19 172.61 Z'],
            ['#5e7183', 3, 9, 'M147.83 93.3 Q215.23 109.17 233.08 208.3 Q193.43 176.57 149.81 172.61 Z'],
            ['accent', 8.5, 10, 'M108.17 93.3 Q40.77 109.17 22.92 208.3 Q50.68 136.92 106.19 113.13 Z'],
            ['accent', 8.5, 10, 'M147.83 93.3 Q215.23 109.17 233.08 208.3 Q205.32 136.92 149.81 113.13 Z'],
            ['#34414e', 0, 11, {x: 84.38, y: 164.68, w: 15.86, h: 15.86}],
            ['#34414e', 0, 11, {x: 155.76, y: 164.68, w: 15.86, h: 15.86}],
            ['#34414e', 0, 10, {x: 106.19, y: 222.17, w: 15.86, h: 19.83}],
            ['#34414e', 0, 10, {x: 133.95, y: 222.17, w: 15.86, h: 19.83}],
            ['#8fa3b3', 0, 18, 'M128 14 L143.86 65.55 L149.81 154.77 L139.9 232.09 L116.1 232.09 L106.19 154.77 L112.14 65.55 Z', 4],
            ['glass', 15, 19, 'M120.07 59.6 L135.93 59.6 L137.91 75.46 L118.09 75.46 Z'],
            ['#34414e', 16, 24, {x: 128, y: 109.17, r: 10.9, dome: true}],
            ['#34414e', 16, 24, {x: 128, y: 152.78, r: 10.9, dome: true}],
            ['#1c232c', 17.5, 18.8, {x: 120.07, y: 200.37, w: 15.86, h: 3.47}],
            ['#1c232c', 17.5, 18.8, {x: 120.07, y: 207.3, w: 15.86, h: 3.47}],
            ['#1c232c', 17.5, 18.8, {x: 120.07, y: 214.24, w: 15.86, h: 3.47}],
            ['accent', 14, 18.5, 'M128 14 L135.93 39.77 L120.07 39.77 Z'],
            ['accent', 17.5, 19, {x: 116.1, y: 184.5, w: 23.79, h: 9.91}],
        ],
    },
    'flagship-verdant': {
        nozzle: 5,
        parts: [
            ['#4a6340', 4, 9, 'M100.95 201.42 L71.97 242 L112.54 218.81 Z'],
            ['#4a6340', 4, 9, 'M155.05 201.42 L184.03 242 L143.46 218.81 Z'],
            ['#4a6340', 4, 9, 'M75.83 104.81 L27.53 81.63 L73.9 128 Z'],
            ['#4a6340', 4, 9, 'M68.1 133.8 L17.86 143.46 L70.03 155.05 Z'],
            ['#4a6340', 4, 9, 'M180.17 104.81 L228.47 81.63 L182.1 128 Z'],
            ['#4a6340', 4, 9, 'M187.9 133.8 L238.14 143.46 L185.97 155.05 Z'],
            ['accent', 8.5, 10, 'M27.53 81.63 L42.98 89.36 L39.12 93.22 Z'],
            ['accent', 8.5, 10, 'M228.47 81.63 L213.02 89.36 L216.88 93.22 Z'],
            ['accent', 8.5, 10, 'M17.86 143.46 L33.32 140.56 L33.32 147.32 Z'],
            ['accent', 8.5, 10, 'M238.14 143.46 L222.68 140.56 L222.68 147.32 Z'],
            ['#2c3b27', 6, 14, 'M112.54 41.05 Q97.08 19.8 116.41 14 Q112.54 29.46 122.2 37.19 Z'],
            ['#2c3b27', 6, 14, 'M143.46 41.05 Q158.92 19.8 139.59 14 Q143.46 29.46 133.8 37.19 Z'],
            ['#2c3b27', 0, 11, {x: 112.54, y: 226.54, rx: 8.69, ry: 9.66}],
            ['#2c3b27', 0, 11, {x: 143.46, y: 226.54, rx: 8.69, ry: 9.66}],
            ['#4a6340', 0, 18, 'M128 147.32 Q168.58 156.98 160.85 214.95 Q128 240.07 95.15 214.95 Q87.42 156.98 128 147.32 Z', 5],
            ['#6e8f5e', 0, 22, 'M128 79.69 Q184.03 85.49 187.9 147.32 Q128 172.44 68.1 147.32 Q71.97 85.49 128 79.69 Z', 6],
            ['#4a6340', 0, 18, 'M128 29.46 Q162.78 39.12 162.78 75.83 Q128 93.22 93.22 75.83 Q93.22 39.12 128 29.46 Z', 5],
            ['accent', 16.5, 19.5, {x: 114.47, y: 58.44, r: 6.76}],
            ['accent', 16.5, 19.5, {x: 141.53, y: 58.44, r: 6.76}],
            ['accent', 20.5, 23.5, {x: 100.95, y: 106.75, r: 8.69}],
            ['accent', 20.5, 23.5, {x: 155.05, y: 106.75, r: 8.69}],
            ['accent', 20.5, 23.5, {x: 108.68, y: 141.53, r: 6.76}],
            ['accent', 20.5, 23.5, {x: 147.32, y: 141.53, r: 6.76}],
            ['accent', 16.5, 19.5, {x: 128, y: 187.9, r: 9.66}],
        ],
    },
    'flagship-cryosphere': {
        nozzle: 4.5,
        parts: [
            ['#5f7a8e', 0, 9, {x: 65.1, y: 200.72, w: 15.72, h: 15.72}],
            ['#5f7a8e', 0, 9, {x: 175.17, y: 200.72, w: 15.72, h: 15.72}],
            ['#5f7a8e', 0, 9, {x: 121.12, y: 228.24, w: 13.76, h: 13.76}],
            ['#dde8f0', 3, 11, 'M104.41 84.76 L45.45 63.14 L61.17 126.03 L104.41 143.72 Z', 3],
            ['#dde8f0', 3, 11, 'M151.59 84.76 L210.55 63.14 L194.83 126.03 L151.59 143.72 Z', 3],
            ['#dde8f0', 3, 11, 'M104.41 153.55 L31.69 175.17 L59.21 214.48 L104.41 192.86 Z', 3],
            ['#dde8f0', 3, 11, 'M151.59 153.55 L224.31 175.17 L196.79 214.48 L151.59 192.86 Z', 3],
            ['accent', 9, 12, 'M45.45 63.14 L61.17 69.03 L49.38 78.86 Z'],
            ['accent', 9, 12, 'M210.55 63.14 L194.83 69.03 L206.62 78.86 Z'],
            ['accent', 9, 12, 'M31.69 175.17 L47.41 170.26 L39.55 185.98 Z'],
            ['accent', 9, 12, 'M224.31 175.17 L208.59 170.26 L216.45 185.98 Z'],
            // a crystal: its top cut to a ridge, lit on one side as the drawing is
            ['#dde8f0', 0, 24, 'M128 14 L151.59 45.45 L151.59 202.69 L128 238.07 L104.41 202.69 L104.41 45.45 Z', 10],
            ['accent', 18, 25.5, 'M128 96.55 L143.72 124.07 L128 151.59 L112.28 124.07 Z'],
            ['accent', 12, 18, 'M128 14 L139.79 29.72 L116.21 29.72 Z'],
        ],
    },
    'flagship-dustfall': {
        nozzle: 5,
        parts: [
            ['#4f4436', 2, 14, 'M58 56 L198 56 L214 34 L42 34 Z', 2],
            ['accent', 4, 12, 'M50 34 L62 16 L74 34 Z'],
            ['accent', 4, 12, 'M84 34 L96 16 L108 34 Z'],
            ['accent', 4, 12, 'M116 34 L128 14 L140 34 Z'],
            ['accent', 4, 12, 'M148 34 L160 16 L172 34 Z'],
            ['accent', 4, 12, 'M182 34 L194 16 L206 34 Z'],
            ['#8c7a62', 0, 14, {x: 32, y: 104, w: 18, h: 80, r: 3}, 2],
            ['#8c7a62', 0, 14, {x: 206, y: 104, w: 18, h: 80, r: 3}, 2],
            ['accent', 13.5, 15, {x: 32, y: 118, w: 18, h: 10}],
            ['accent', 13.5, 15, {x: 32, y: 160, w: 18, h: 10}],
            ['accent', 13.5, 15, {x: 206, y: 118, w: 18, h: 10}],
            ['accent', 13.5, 15, {x: 206, y: 160, w: 18, h: 10}],
            ['#4f4436', 0, 10, {x: 76, y: 224, w: 20, h: 18}],
            ['#4f4436', 0, 10, {x: 104, y: 224, w: 20, h: 18}],
            ['#4f4436', 0, 10, {x: 132, y: 224, w: 20, h: 18}],
            ['#4f4436', 0, 10, {x: 160, y: 224, w: 20, h: 18}],
            ['#8c7a62', 0, 20, 'M70 54 L186 54 L210 94 L210 204 L186 230 L70 230 L46 204 L46 94 Z', 4],
            ['#b8a58a', 18.5, 23, {x: 86, y: 76, w: 84, h: 104, r: 6}, 2],
            ['#4f4436', 22.5, 24.5, {x: 108, y: 102, r: 10}],
            ['#4f4436', 22.5, 24.5, {x: 148, y: 102, r: 10}],
            ['#4f4436', 22.5, 24.5, {x: 108, y: 144, r: 10}],
            ['#4f4436', 22.5, 24.5, {x: 148, y: 144, r: 10}],
            ['#4f4436', 18, 23, {x: 108, y: 186, w: 40, h: 28, r: 4}, 1.5],
            ['accent', 22.5, 24, {x: 114, y: 192, w: 28, h: 8}],
            ['#1c232c', 18.5, 20.8, {x: 56, y: 208, w: 20, h: 3.5}],
            ['#1c232c', 18.5, 20.8, {x: 56, y: 215, w: 20, h: 3.5}],
            ['#1c232c', 18.5, 20.8, {x: 180, y: 208, w: 20, h: 3.5}],
            ['#1c232c', 18.5, 20.8, {x: 180, y: 215, w: 20, h: 3.5}],
        ],
    },
    'flagship-eclipse': {
        nozzle: 5,
        parts: [
            ['#4f4568', 0, 10, {x: 41.44, y: 193.44, w: 16.89, h: 16.89}],
            ['#4f4568', 0, 10, {x: 197.67, y: 193.44, w: 16.89, h: 16.89}],
            ['#4f4568', 0, 10, {x: 109, y: 223, w: 16.89, h: 19}],
            ['#4f4568', 0, 10, {x: 130.11, y: 223, w: 16.89, h: 19}],
            ['#4f4568', 4, 12, 'M117.44 43.56 L128 14 L138.56 43.56 Z'],
            ['accent', 11.5, 13, 'M121.67 30.89 L128 14 L134.33 30.89 Z'],
            ['#73668f', 0, 16, 'M50.58 199.7 A101.33 101.33 0 1 1 205.43 199.7 A84.44 84.44 0 1 0 50.58 199.7 Z', 4],
            ['accent', 15, 17.5, {x: 60.44, y: 87.89, r: 7.39}],
            ['accent', 15, 17.5, {x: 195.56, y: 87.89, r: 7.39}],
            // the eye: a dark disc in a ring of the accent, its core a dome
            ['#2e2840', 0, 20, {x: 128, y: 166, r: 63.33, sides: 20}],
            ['accent', 1, 19, {x: 128, y: 166, r: 73.89, inner: 63.33}],
            ['#4f4568', 19, 31, {x: 128, y: 166, r: 25.33, dome: true}],
        ],
    },
    'flagship-obsidian': {
        nozzle: 5,
        parts: [
            ['#5a5f6c', 3, 9, 'M99.26 169.19 L39.87 184.52 L43.7 205.6 L101.18 196.02 Z'],
            ['#5a5f6c', 3, 9, 'M156.74 169.19 L216.13 184.52 L212.3 205.6 L154.82 196.02 Z'],
            ['accent', 8.5, 10, 'M39.87 184.52 L55.19 180.69 L59.03 202.72 L43.7 205.6 Z'],
            ['accent', 8.5, 10, 'M216.13 184.52 L200.81 180.69 L196.97 202.72 L212.3 205.6 Z'],
            ['#3a3d47', 0, 10, {x: 110.76, y: 226.67, w: 13.41, h: 15.33}],
            ['#3a3d47', 0, 10, {x: 131.83, y: 226.67, w: 13.41, h: 15.33}],
            ['#5a5f6c', 0, 14, 'M128 14 L149.08 75.31 L156.74 171.11 L183.56 194.1 L179.73 219.01 L149.08 213.26 L139.5 234.34 L116.5 234.34 L106.92 213.26 L76.27 219.01 L72.44 194.1 L99.26 171.11 L106.92 75.31 Z', 3],
            // a blade in steps: the spine, its ridge
            ['#7a7f8e', 10, 20, 'M128 35.08 L141.41 82.97 L145.24 161.53 L110.76 161.53 L114.59 82.97 Z', 3],
            ['#9aa0b0', 16, 26, 'M128 61.9 L135.66 92.55 L136.62 142.37 L119.38 142.37 L120.34 92.55 Z', 3],
            ['#1c232c', 13.5, 14.8, {x: 116.5, y: 196.02, w: 22.99, h: 3.35}],
            ['#1c232c', 13.5, 14.8, {x: 116.5, y: 202.72, w: 22.99, h: 3.35}],
            ['accent', 13.5, 15.5, 'M118.42 167.28 L137.58 167.28 L133.75 180.69 L122.25 180.69 Z'],
            ['accent', 12, 15, 'M128 14 L133.75 31.24 L122.25 31.24 Z'],
            ['accent', 13.5, 15, {x: 80.1, y: 197.93, w: 9.58, h: 9.58}],
            ['accent', 13.5, 15, {x: 166.32, y: 197.93, w: 9.58, h: 9.58}],
        ],
    },
    'flagship-nova-forge': {
        nozzle: 5,
        parts: [
            ['#3b3431', 0, 16, {x: 35.51, y: 125.85, w: 21.51, h: 81.74, r: 3.23}, 2],
            ['#3b3431', 0, 16, {x: 198.98, y: 125.85, w: 21.51, h: 81.74, r: 3.23}, 2],
            ['accent', 15.5, 17, {x: 35.51, y: 125.85, w: 21.51, h: 15.06}],
            ['accent', 15.5, 17, {x: 198.98, y: 125.85, w: 21.51, h: 15.06}],
            ['#3b3431', 0, 10, {x: 87.13, y: 220.49, w: 23.66, h: 21.51}],
            ['#3b3431', 0, 10, {x: 116.17, y: 220.49, w: 23.66, h: 21.51}],
            ['#3b3431', 0, 10, {x: 145.21, y: 220.49, w: 23.66, h: 21.51}],
            ['#6e625b', 0, 14, 'M128 14 L175.32 74.23 L201.13 160.26 L205.43 229.09 L50.57 229.09 L54.87 160.26 L80.68 74.23 Z', 3],
            ['#a3948a', 12, 20, 'M128 33.36 L160.26 80.68 L177.47 160.26 L177.47 209.74 L78.53 209.74 L78.53 160.26 L95.74 80.68 Z', 3],
            ['glass', 19, 21.5, {x: 115.09, y: 61.32, w: 25.81, h: 15.06}],
            // the forge: a furnace block, its vents glowing
            ['#3b3431', 18, 25, {x: 91.43, y: 110.79, w: 73.13, h: 75.28, r: 4.3}, 2],
            ['accent', 24.5, 26, {x: 97.89, y: 119.4, w: 60.23, h: 10.75}],
            ['accent', 24.5, 26, {x: 97.89, y: 140.91, w: 60.23, h: 10.75}],
            ['accent', 24.5, 26, {x: 97.89, y: 162.42, w: 60.23, h: 10.75}],
            ['accent', 12, 15.5, 'M128 14 L140.91 31.21 L115.09 31.21 Z'],
        ],
    },
    'flagship-ion-reach': {
        nozzle: 5,
        parts: [
            ['#444a62', 0, 10, {x: 98.44, y: 218.78, w: 21.11, h: 23.22}],
            ['#444a62', 0, 10, {x: 136.44, y: 218.78, w: 21.11, h: 23.22}],
            ['#444a62', 3, 13, 'M113.22 62.56 L117.44 26.67 L128 14 L138.56 26.67 L142.78 62.56 Z', 2],
            ['accent', 12.5, 14.5, 'M117.44 26.67 L128 14 L138.56 26.67 Z'],
            // a wheel: a disc, its hub and four pods on a cross
            ['#7e86a3', 0, 14, {x: 128, y: 142.78, r: 88.67, taper: 0.94, sides: 24}],
            ['#444a62', 12.5, 15, {x: 128, y: 142.78, r: 61.22, sides: 20}],
            ['#7e86a3', 13, 18, {x: 120.61, y: 83.67, w: 14.78, h: 118.22}, 1.5],
            ['#7e86a3', 13, 18, {x: 68.89, y: 135.39, w: 118.22, h: 14.78}, 1.5],
            ['#b7bdd0', 15, 23, {x: 128, y: 142.78, r: 27.44, taper: 0.8, sides: 12}],
            ['#b7bdd0', 12, 19, {x: 75.22, y: 90, r: 14.78, taper: 0.8}],
            ['#b7bdd0', 12, 19, {x: 180.78, y: 90, r: 14.78, taper: 0.8}],
            ['#b7bdd0', 12, 19, {x: 75.22, y: 195.56, r: 14.78, taper: 0.8}],
            ['#b7bdd0', 12, 19, {x: 180.78, y: 195.56, r: 14.78, taper: 0.8}],
            ['accent', 22.5, 25, {x: 128, y: 142.78, r: 12.67}],
            ['accent', 18.5, 20.5, {x: 75.22, y: 90, r: 6.33}],
            ['accent', 18.5, 20.5, {x: 180.78, y: 90, r: 6.33}],
            ['accent', 18.5, 20.5, {x: 75.22, y: 195.56, r: 6.33}],
            ['accent', 18.5, 20.5, {x: 180.78, y: 195.56, r: 6.33}],
            ['accent', 13.5, 15.5, {x: 43.56, y: 136.44, w: 19, h: 12.67}],
            ['accent', 13.5, 15.5, {x: 193.44, y: 136.44, w: 19, h: 12.67}],
        ],
    },
};

// A point of a drawing in its model: the drawing is 256 across, nose up, the ship as long as sprite_span
// (js/sprites.js), so x, y of it is (128 - y, x - 128)/sprite_span, the nose along +x
function render3d_art_point(x, y)
{
    return [(128 - y)/sprite_span, (x - 128)/sprite_span];
}

// A shape of a drawing as the outline of its part: a path (absolute M, L, Q, Z and A of a circle), a rect
// {x, y, w, h}, its corners rounded r, or a ring {x, y, r, inner}
function render3d_art_shape(THREE, v)
{
    const out = new THREE.Shape();
    if (v.inner) {
        out.setFromPoints(render3d_art_circle(THREE, v.x, v.y, v.r));
        out.holes.push(new THREE.Path(render3d_art_circle(THREE, v.x, v.y, v.inner)));
        return out;
    }
    if (typeof v !== 'string') {
        const [x, y, right, bottom, r] = [v.x, v.y, v.x + v.w, v.y + v.h, v.r];
        return render3d_art_shape(THREE, r
            ? `M${x} ${y + r} Q${x} ${y} ${x + r} ${y} L${right - r} ${y} Q${right} ${y} ${right} ${y + r} L${right} ${bottom - r} Q${right} ${bottom} ${right - r} ${bottom} L${x + r} ${bottom} Q${x} ${bottom} ${x} ${bottom - r} Z`
            : `M${x} ${y} L${right} ${y} L${right} ${bottom} L${x} ${bottom} Z`);
    }
    let at = [0, 0];
    for (const [, op, list] of v.matchAll(/([MLQAZ])([^MLQAZ]*)/g)) {
        const n = list.trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (op === 'M') {
            out.moveTo(...render3d_art_point(n[0], n[1]));
        }
        else if (op === 'L') {
            for (let i = 0; i < n.length; i += 2) {
                out.lineTo(...render3d_art_point(n[i], n[i + 1]));
            }
        }
        else if (op === 'Q') {
            out.quadraticCurveTo(...render3d_art_point(n[0], n[1]), ...render3d_art_point(n[2], n[3]));
        }
        else if (op === 'A') {
            for (const p of render3d_art_arc(at, n)) {
                out.lineTo(...p);
            }
        }
        if (n.length) {
            at = n.slice(-2);
        }
    }
    return out;
}

// The points of a circle of a drawing, 24 round
function render3d_art_circle(THREE, x, y, r)
{
    const out = [];
    for (let i = 0; i < 24; ++i) {
        const a = (i/24)*Math.PI*2;
        out.push(new THREE.Vector2(...render3d_art_point(x + Math.cos(a)*r, y + Math.sin(a)*r)));
    }
    return out;
}

// The points along an arc of a circle of a path (A r r 0 large sweep x y) from `from`, in the model, 15° apart at most
function render3d_art_arc(from, n)
{
    const [r, large, sweep, x, y] = [n[0], n[3], n[4], n[5], n[6]];
    const half = [(from[0] - x)/2, (from[1] - y)/2];
    const d = Math.hypot(...half);
    const k = ((large === sweep) ? -1 : 1)*Math.sqrt(Math.max(0, r*r - d*d))/d;
    const cx = (from[0] + x)/2 + k*half[1];
    const cy = (from[1] + y)/2 - k*half[0];
    const start = Math.atan2(from[1] - cy, from[0] - cx);
    let turn = Math.atan2(y - cy, x - cx) - start;
    if (sweep && (turn < 0)) {
        turn += Math.PI*2;
    }
    if (!sweep && (turn > 0)) {
        turn -= Math.PI*2;
    }
    const steps = Math.max(2, Math.ceil(Math.abs(turn)/(Math.PI/12)));
    const out = [];
    for (let i = 1; i <= steps; ++i) {
        const a = start + (turn*i)/steps;
        out.push(render3d_art_point(cx + Math.cos(a)*r, cy + Math.sin(a)*r));
    }
    return out;
}

// One part of a drawing's model (render3d_arts): a plate of a path or a rect raised from bottom to top, its top
// edges cut by `bevel`; a disc of a circle or an ellipse ({x, y, r} or rx, ry), its top `taper` of its width or a
// dome (`dome`); a cone along the nose ({x, y: [from, to], r: [from, to]}) between bottom and top. A part in a colour
// carries it in its corners, for the one material of the hull.
function render3d_art_part(THREE, [color, bottom, top, shape, bevel = 0])
{
    const k = 1/sprite_span;
    let out;
    if (Array.isArray(shape.y)) {
        const [back, front] = shape.y.map(v => (128 - v)*k);
        out = new THREE.CylinderGeometry(shape.r[1]*k, shape.r[0]*k, front - back, 6).rotateZ(-Math.PI/2);
        out.scale(1, (top - bottom)/(2*shape.r[0]), 1);
        out.translate((back + front)/2, ((bottom + top)/2)*k, (shape.x - 128)*k);
    }
    else if (shape.dome) {
        out = new THREE.SphereGeometry(1, 10, 3, 0, Math.PI*2, 0, Math.PI/2);
        out.scale((shape.ry || shape.r)*k, (top - bottom)*k, (shape.rx || shape.r)*k);
        out.translate((128 - shape.y)*k, bottom*k, (shape.x - 128)*k);
    }
    else if ((shape.r || shape.rx) && !shape.w && !shape.inner) {
        out = new THREE.CylinderGeometry(shape.taper || 1, 1, (top - bottom)*k, shape.sides || 10);
        out.scale((shape.ry || shape.r)*k, 1, (shape.rx || shape.r)*k);
        out.translate((128 - shape.y)*k, ((bottom + top)/2)*k, (shape.x - 128)*k);
    }
    else {
        // the bevel cuts in from the outline, so the plate covers its shape and no more
        out = new THREE.ExtrudeGeometry(render3d_art_shape(THREE, shape), {
            depth: (top - bottom - bevel*2)*k,
            bevelEnabled: bevel > 0,
            bevelThickness: bevel*k,
            bevelSize: bevel*k,
            bevelOffset: -bevel*k,
            bevelSegments: 1,
            curveSegments: 4,
        });
        out.rotateX(Math.PI/2);
        out.translate(0, (top - bevel)*k, 0);
    }
    if (color.startsWith('#')) {
        const rgb = new THREE.Color(color);
        const colors = new Float32Array(out.attributes.position.count*3);
        for (let i = 0, end = colors.length; i < end; i += 3) {
            colors.set([rgb.r, rgb.g, rgb.b], i);
        }
        out.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    return out;
}

// A drawing's parts into the group: the hull in one material that takes each part's colour, the canopy in glass, the
// accent in `accent`; only the hull casts a shadow, the rest lie on it
function render3d_art_parts(group, name, accent)
{
    const hull = render3d_material('#ffffff', {vertex: true, roughness: 0.6, metalness: 0.25});
    const glass = render3d_material('#2f6a92', {emissive: '#8fd0f0', glow: 0.35, roughness: 0.2, metalness: 0.3});
    for (const [i, part] of render3d_arts[name].parts.entries()) {
        const material = (part[0] === 'glass') ? glass : (part[0] === 'accent') ? accent : hull;
        render3d_mesh(group, render3d_geometry(`${name}:${i}`, v => render3d_art_part(v, part)), material).castShadow = (material === hull);
    }
}

// A drawing's engines glowing in `material` at its flame marks (js/sprites.js), each as wide as its mark, out of the
// back of its engine block
function render3d_art_nozzles(group, name, material)
{
    const height = render3d_arts[name].nozzle/sprite_span;
    for (const [i, v] of sprite_anchors(name, 1).flames.main.entries()) {
        const geometry = render3d_geometry(`${name}:nozzle:${i}`, function (THREE) {
            const r = v.width*0.4;
            const out = new THREE.CylinderGeometry(r, r, 0.03, 8).rotateZ(Math.PI/2);
            out.scale(1, Math.min(1, (height*0.8)/r), 1);
            out.translate(v.x - 0.006, height, v.y);
            return out;
        });
        render3d_lamp(group, geometry, material);
    }
}

// Your ship as its drawing (render3d_arts), its engines glowing brighter with thrust and turbo, its running lights in
// the ship's colour (js/render3d/scene.js lights them); one model a class
function render3d_player_model(ship)
{
    const out = new render3d.three.Group();
    // a class with no model of its own yet flies the scout's
    const name = render3d_arts[ship_sprite(ship).name] ? ship_sprite(ship).name : 'ship-scout';
    const flame = render3d_material_own('#9bcfff', {emissive: '#9bcfff', glow: 1.6});
    const lights = render3d_material_own('#ffffff', {emissive: '#ffffff', glow: 1});
    out.userData.flame = flame;
    out.userData.lights = lights;
    out.userData.own = [flame, lights];
    render3d_art_parts(out, name, null);
    render3d_art_nozzles(out, name, flame);
    const lamp = render3d_geometry('art:lamp', v => new v.OctahedronGeometry(6/sprite_span));
    for (const [x, y, height] of render3d_arts[name].lights) {
        const [px, pz] = render3d_art_point(x, y);
        render3d_lamp(out, lamp, lights, px, (height + 2)/sprite_span, pz);
    }
    render3d_merge(out, `player:${ship.id}`);
    return out;
}

// A world's flagship as its drawing (render3d_arts), its accent and engines in the raider's colour, glowing as the
// raiders' do
function render3d_flagship_model(name, color)
{
    const out = new render3d.three.Group();
    render3d_art_parts(out, name, render3d_material(color, {emissive: color, glow: 0.3}));
    render3d_art_nozzles(out, name, render3d_material(color, {emissive: color, glow: 1.2}));
    render3d_merge(out, `raider:${name}`);
    return out;
}

// A raider in its colour over a dark hull, its shape by its type; an elite carries gold fins. A flagship whose drawing
// has no model of its own (render3d_flagship_model) is a disc with spikes around a glowing core.
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
        render3d_merge(out, `raider:${type}`);
        return out;
    }
    if (type === 'tank') {
        render3d_mesh(out, render3d_geometry('tank:hull', v => new v.CylinderGeometry(0.4, 0.46, 0.24, 6)), dark);
        render3d_mesh(out, render3d_geometry('tank:top', v => new v.CylinderGeometry(0.26, 0.32, 0.12, 6)), paint, 0, 0.17, 0);
        render3d_mesh(out, render3d_geometry('tank:gun', v => new v.BoxGeometry(0.34, 0.06, 0.08)), fin, 0.3, 0.17, 0);
        render3d_merge(out, `raider:${type}`);
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
        render3d_merge(out, `raider:${type}`);
        return out;
    }
    // an engine glowing at the stern, in the raider's colour
    const exhaust = render3d_geometry('raider:exhaust', v => new v.BoxGeometry(0.04, 0.07, 0.14));
    if (type === 'lancer') {
        render3d_mesh(out, render3d_geometry('lancer:lance', v => render3d_nose(v, 0.1, 1, 4).scale(1, 0.7, 1)), paint);
        render3d_lamp(out, exhaust, core, -0.5, 0, 0).scale.set(1, 0.8, 0.8);
        const wing = render3d_geometry('lancer:fin', v => render3d_wing(v, [[-0.1, 0.04], [-0.42, 0.26], [-0.48, 0.26], [-0.36, 0.04]], 0.03));
        render3d_mesh(out, wing, fin);
        render3d_mesh(out, wing, fin).scale.z = -1;
        render3d_merge(out, `raider:${type}`);
        return out;
    }
    // chaser and shooter: a flat wedge, the shooter with a gun pod on each side
    render3d_mesh(out, render3d_geometry('raider:wedge', v => render3d_nose(v, 0.3, 0.9, 3).rotateX(Math.PI).scale(1, 0.45, 1)), dark);
    render3d_mesh(out, render3d_geometry('raider:spine', v => render3d_nose(v, 0.1, 0.62, 3).scale(1, 0.7, 1)), paint, -0.04, 0.08, 0);
    render3d_mesh(out, render3d_geometry('raider:eye', v => new v.OctahedronGeometry(0.05)), core, 0.12, 0.1, 0);
    render3d_lamp(out, exhaust, core, -0.45, 0.02, 0.1);
    render3d_lamp(out, exhaust, core, -0.45, 0.02, -0.1);
    if (type === 'shooter') {
        const gun = render3d_geometry('shooter:pod', v => new v.CylinderGeometry(0.05, 0.06, 0.4, 6).rotateZ(Math.PI/2));
        render3d_mesh(out, gun, fin, 0.02, 0, 0.24);
        render3d_mesh(out, gun, fin, 0.02, 0, -0.24);
    }
    else {
        render3d_mesh(out, render3d_geometry('raider:fin', v => new v.BoxGeometry(0.22, 0.14, 0.03)), fin, -0.3, 0.08, 0);
    }
    render3d_merge(out, `raider:${type}`);
    return out;
}

// A rock: an icosahedron pushed in and out by its seed, one of seven; a rich one wears crystals of its ore, their glow
// breathing (js/render3d/scene.js)
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
    // a rich rock's stone glows faintly in its ore, as its crystals do brightly
    render3d_mesh(out, geometry, render3d_material(rock_color, {emissive: ore || '#000000', glow: ore ? 0.1 : 0, roughness: 0.95, metalness: 0}));
    if (ore) {
        const crystal = render3d_geometry('rock:crystal', v => new v.OctahedronGeometry(0.09).scale(0.8, 1.8, 0.8));
        const material = render3d_material(ore, {emissive: ore, glow: 0.9, roughness: 0.3});
        render3d.ores.add(material);
        for (let i = 0; i < 3; ++i) {
            const a = variant + i*2.1;
            const mesh = render3d_mesh(out, crystal, material, Math.cos(a)*0.22, 0.24, Math.sin(a)*0.22);
            mesh.rotation.set(Math.cos(a)*0.5, a, Math.sin(a)*0.5);
            mesh.castShadow = false;
        }
    }
    render3d_merge(out, `rock:${variant}`);
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
    // lit windows, warm against the accent, and a beacon of its own that blinks
    const window_light = render3d_material('#ffe7b8', {emissive: '#ffd58a', glow: 0.9});
    const beacon = render3d_material_own(accent, {emissive: accent, glow: 1.5});
    out.userData.beacon = beacon;
    out.userData.own = [beacon];
    render3d_mesh(out, render3d_geometry('station:hub', v => new v.CylinderGeometry(0.11, 0.14, 0.12, 8)), plate);
    render3d_mesh(out, render3d_geometry('station:dome', v => new v.CylinderGeometry(0.035, 0.07, 0.05, 8)), plate, 0, 0.085, 0);
    render3d_lamp(out, render3d_geometry('station:beacon', v => new v.OctahedronGeometry(0.018)), beacon, 0, 0.125, 0);
    // a ring of small windows on the hub's deck, round the dome
    const pane = render3d_geometry('station:pane', v => new v.BoxGeometry(0.007, 0.004, 0.012));
    for (let i = 0; i < 20; ++i) {
        const a = (i/20)*Math.PI*2 + Math.PI/20;
        render3d_lamp(out, pane, window_light, Math.cos(a)*0.092, 0.06, Math.sin(a)*0.092).rotation.y = -a;
    }
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
    // the ring's modules, each with a row of three windows on its top
    for (let i = 0; i < 8; ++i) {
        const a = (i/8)*Math.PI*2 + Math.PI/8;
        render3d_mesh(ring, module, plate, Math.cos(a)*0.36, 0.02, Math.sin(a)*0.36).rotation.y = -a;
        for (const d of [-0.022, 0, 0.022]) {
            const x = Math.cos(a)*0.36 - Math.sin(a)*d;
            const z = Math.sin(a)*0.36 + Math.cos(a)*d;
            render3d_lamp(ring, pane, window_light, x, 0.046, z).rotation.y = -a;
        }
    }
    render3d_merge(ring, 'station:ring');
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
    render3d_merge(out, 'station');
    return out;
}
