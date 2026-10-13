// The arcade's ending (the designer's arcade-finale.html): when the eighth world falls, a warp drops into a ring of the
// eight planets, your ship visits them in order and lights each one, flies to the centre in a white burst, and
// "FRONTIER CLEARED" assembles over the emblem while fireworks go off; then the run's results count up, with the eight
// flagships and the personal best. Every frame is a function of the time t since it began; any key or click skips to
// the end of the opening, and the scene keeps living behind the buttons. After each of the first seven worlds the same
// scene plays short (world mode): that world lights up in the ring, its numbers count up, and one button opens the
// depot. Either way the words come one step at a time, each held long enough to read (finale_steps); with reduced
// motion (the Effects setting off) the end state fades in, and nothing else moves.
const finale = {open: false, world: -1, start: 0, frozen: null, run: null, request: 0, planets: [], width: 0, height: 0};
const finale_end = 12.5;
const finale_route = [0.9, 6];
const finale_burst = 6.15;
// world mode: the story ends this many seconds in, after its last step
const finale_world_end = 6.4;
// a key or a click this soon after the open is the fight's, not a wish to skip
const finale_grace = 0.5;
// reduced motion: the end state fades in over this many seconds
const finale_calm_fade = 0.6;
// The words, in seconds from the open: the title letter by letter (its start, its letters spread over a time, a
// letter's rise), its eyebrow, the results tile by tile (start, a tile's delay) as they count up, the flagships one by
// one (start, a flag's delay), the best bar, the line, the buttons last; the opening ends when they are in. After the
// run the words wait for the ship's round and the burst (finale_burst).
const finale_steps = {
    title: [6.7, 0.4, 0.55], eyebrow: [7.5, 7.9], line: [7.9, 8.4], results: [8.7, 0.1], count: [8.85, 9.9],
    flags: [9.9, 0.06], best: [10.6, 11.2], acts: [11.4, 11.9],
};
// After a world: the window waits while the flagship's death plays behind it, till its large last blast goes off
// (explode_flagship: 1.25 s of the slowed effects' time, about 2.3 s), then fades in over it (show); the title, and
// the world lighting in the ring as it lands (planet); the numbers; the way on (onward: the line naming the next
// world, the dashed link to it and its mark in the ring); the button
const finale_world_steps = {
    show: [2.2, 2.7], title: [2.4, 0.4, 0.5], planet: [2.9, 3.3], eyebrow: [3.2, 3.6], results: [3.7, 0.08],
    count: [3.85, 4.55], flags: [4.4, 0.03], best: [4.65, 5.15], line: [5.15, 5.55], onward: [5.15, 5.75], acts: [5.7, 6.1],
};
const finale_stars = finale_random_list(7, 520, v => ({x: v(), y: v(), z: 0.2 + v()*0.8, twinkle: v()*6.28}));
// fixed bursts in the world colours, each repeating every 11 s once the results are in
const finale_fireworks = finale_random_list(11, 26, (v, i) => ({t0: 6.4 + i*0.42 + v()*0.25, x: 0.12 + v()*0.76, y: 0.12 + v()*0.5, world: i % 8, count: 46 + Math.floor(v()*30), speed: 150 + v()*140, seed: Math.floor(v()*1e6)}));

document.getElementById('finale_stage').addEventListener('click', function (event) {
    if (!event.target.closest('.btn')) {
        finale_skip();
    }
});
document.getElementById('finale_again').addEventListener('click', () => finale_leave('again'));
document.getElementById('finale_overload').addEventListener('click', () => finale_leave('overload'));
document.getElementById('finale_menu').addEventListener('click', () => finale_leave('menu'));
document.getElementById('finale_depot').addEventListener('click', () => finale_leave('depot'));
// before the game's own keys: while the finale is up, keys are its own
addEventListener('keydown', function (event) {
    if (!finale.open) {
        return;
    }
    event.stopImmediatePropagation();
    event.preventDefault();
    if (event.repeat) {
        return;
    }
    // in world mode only Enter leaves, to the depot; leaving mid-run is the pause screen's
    const world = finale.world >= 0;
    if (finale_time() < finale_ready()) {
        finale_skip();
    }
    else if (event.code === 'Enter') {
        finale_leave(world ? 'depot' : 'again');
    }
    else if (!world && (event.code === 'KeyO') && (difficulty !== 'overload')) {
        finale_leave('overload');
    }
    else if (!world && (event.code === 'Escape')) {
        finale_leave('menu');
    }
}, true);

// Opens the finale for a won run: score, the best before it, raiders, time in seconds, and the salvage kept with its points
function arcade_finale_open(run)
{
    finale_open(-1, run);
}

// Opens the scene for world i cleared: score, raiders and time in it, the run's total, the best, the bonus and salvage
function arcade_world_cleared_open(i, run)
{
    finale_open(i, run);
}

function finale_open(world, run)
{
    state = 'finale';
    finale.world = world;
    finale.run = run;
    finale.open = true;
    finale.start = performance.now();
    finale_build();
    // unseen until its first frame says how far it has faded in
    document.getElementById('arcade_finale').style.opacity = 0;
    set_hidden(document.getElementById('arcade_finale'), false);
    cancelAnimationFrame(finale.request);
    finale.request = requestAnimationFrame(finale_loop);
}

function arcade_finale_close()
{
    finale.open = false;
    cancelAnimationFrame(finale.request);
    set_hidden(document.getElementById('arcade_finale'), true);
}

// The art and the words for this run: planets and their names, the flagships, your ship as you built it
function finale_build()
{
    const holder = document.getElementById('finale_planets');
    holder.replaceChildren();
    finale.planets = worlds.map(function (world, i) {
        const image = document.createElement('img');
        image.className = 'finale-planet';
        image.alt = '';
        image.src = menu_sprite_url(menu_planet_text(i));
        const name = document.createElement('span');
        name.className = 'finale-name';
        name.style.color = world.accent;
        name.innerHTML = `${ui_escape(world.name)}<s>${i + 1}/${arcade_worlds}</s>`;
        holder.append(image, name);
        return {image, name};
    });
    const world = finale.world;
    const flags = document.getElementById('finale_flags');
    for (const v of flags.querySelectorAll('img')) {
        v.remove();
    }
    for (let i = 0; i < arcade_worlds; ++i) {
        const image = document.createElement('img');
        image.alt = '';
        image.title = `${worlds[i].name} flagship`;
        image.src = finale_sprite_url(`3d/flagship-${world_slug(i)}`);
        flags.append(image);
    }
    document.getElementById('finale_ship').src = menu_sprite_url(ship_parts_svg(current_ship().id, {...ship_parts_loadout(), gun: current_weapon().id}));
    document.getElementById('finale_burst').src = ship_parts_url('worlds/haven/warp-burst');
    document.getElementById('finale_ring').src = ship_parts_url('worlds/haven/warp-ring');
    const mode = document.querySelector(`[data-mode="${difficulty}"] .tile-name`)?.textContent || '';
    document.getElementById('finale_eyebrow').textContent = mode ? `Arcade · ${mode}` : 'Arcade';
    // the title's second word in the world's accent (the frontier's in cyan); --n lets a long title shrink to the window
    const name = (world < 0) ? 'FRONTIER' : worlds[world].name.toUpperCase();
    const letters = document.getElementById('finale_letters');
    letters.innerHTML = [...`${name} CLEARED`].map((v, i) => `<span${(i > name.length) ? ' class="c"' : ''}>${(v === ' ') ? '&nbsp;' : v}</span>`).join('');
    letters.style.setProperty('--n', name.length + 8);
    document.getElementById('finale_stage').style.setProperty('--finale-accent', (world < 0) ? 'var(--cyan)' : worlds[world].accent);
    document.getElementById('finale_line').textContent = (world < 0) ? 'All eight worlds, all eight flagships.' : `Flagship down · next: ${worlds[world + 1].name}`;
    document.getElementById('finale_score_label').textContent = (world < 0) ? 'Final score' : `Score in ${worlds[world].name}`;
    document.getElementById('finale_time_label').textContent = (world < 0) ? 'Time' : 'Time here';
    document.getElementById('finale_raiders_label').textContent = (world < 0) ? 'Raiders' : 'Raiders here';
    set_hidden(document.getElementById('finale_salvage_tile'), world < 0);
    document.getElementById('finale_stats').classList.toggle('is-four', world >= 0);
    for (const id of ['finale_again', 'finale_menu']) {
        set_hidden(document.getElementById(id), world >= 0);
    }
    set_hidden(document.getElementById('finale_overload'), (world >= 0) || (difficulty === 'overload'));
    set_hidden(document.getElementById('finale_depot'), world < 0);
}

// A sprite drawn as the game draws it (its anchors stripped) as an image URL
function finale_sprite_url(name)
{
    const art = sprite(name);
    return art ? menu_sprite_url(new XMLSerializer().serializeToString(art.svg)) : '';
}

function finale_time()
{
    return (finale.frozen !== null) ? finale.frozen : (performance.now() - finale.start)/1000;
}

// The steps of this opening: the run's or a world's
function finale_steps_now()
{
    return (finale.world < 0) ? finale_steps : finale_world_steps;
}

// When the opening is over and the buttons answer: with reduced motion, once the end state has faded in
function finale_ready()
{
    const steps = finale_steps_now();
    return full_fx ? steps.acts[1] : (steps.show ? steps.show[0] : 0) + finale_calm_fade;
}

// Straight to the end of the opening; a key or a click in the first moment is still the fight's
function finale_skip()
{
    const t = finale_time();
    if ((t >= finale_grace) && (t < finale_ready())) {
        finale.start = performance.now() - finale_ready()*1000;
    }
}

// Play again, the same run on Overload, the main menu, or (world mode) the depot
function finale_leave(choice)
{
    arcade_finale_close();
    if (choice === 'depot') {
        arcade_depot_open();
        return;
    }
    if (choice === 'menu') {
        menu_open();
        return;
    }
    if (choice === 'overload') {
        document.querySelector('[data-mode="overload"]')?.click();
    }
    arcade_start();
}

function finale_loop()
{
    if (!finale.open) {
        return;
    }
    finale_frame(finale_time());
    finale.request = requestAnimationFrame(finale_loop);
}

// The ring of planets: it sits high and wide during the flight, then shrinks into the emblem under the title; on a
// short window the emblem moves right, the results take the left. Where the results under the emblem would run off
// the window, the emblem shrinks into the room between the title (its bottom: top) and the results (their height)
function finale_geometry(t, w, h, top = 0, results = 0)
{
    const k = finale_ease(finale_seg(t, 6.35, 7.4));
    const short = h < 640;
    const r0 = Math.min(w*0.34, h*0.3);
    let r1 = Math.min(w*0.2, h*(short ? 0.2 : 0.15));
    let cy1 = short ? h*0.5 : h*0.38;
    if (!short && (cy1 + r1*1.45 + results > h - 12)) {
        const room = h - 12 - results - top;
        r1 = Math.max(30, room/2.9);
        cy1 = top + room*0.47;
    }
    const cy0 = Math.min(h*0.42, h/2 - 40);
    const cx = short ? w/2 + w*0.27*k : w/2;
    const cy = cy0 + (cy1 - cy0)*k;
    const r = r0 + (r1 - r0)*k;
    const points = worlds.map(function (_, i) {
        const a = Math.PI/2 + (i*2*Math.PI)/arcade_worlds;
        return {x: cx + Math.cos(a)*r*1.18, y: cy + Math.sin(a)*r};
    });
    return {cx, cy, r, points, short};
}

function finale_frame(t)
{
    const stage = document.getElementById('finale_stage');
    const canvas = document.getElementById('finale_canvas');
    const ratio = Math.min(2, devicePixelRatio || 1);
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if ((w !== finale.width) || (h !== finale.height)) {
        finale.width = w;
        finale.height = h;
        canvas.width = w*ratio;
        canvas.height = h*ratio;
    }
    // past the end the story holds its last frame; the stars, the ring, the planets' bob and the fireworks go on.
    // With reduced motion the end state fades in and holds still: the living clock stops at the end too
    const world = finale.world >= 0;
    const end = world ? finale_world_end : finale_end;
    const story = full_fx ? Math.min(t, end) : end;
    const show = world ? finale_world_steps.show : [0, 0.5];
    document.getElementById('arcade_finale').style.opacity = full_fx ? finale_ease(finale_seg(t, show[0], show[1])) : finale_seg(t, show[0], show[0] + finale_calm_fade);
    const live = full_fx ? t : end;
    const title = document.getElementById('finale_title');
    // world mode starts with the ring already in the emblem's place
    const g = finale_geometry(world ? finale_end : story, w, h, title.offsetTop + title.offsetHeight, document.getElementById('finale_res').offsetHeight);
    stage.classList.toggle('is-short', g.short);
    const c = canvas.getContext('2d');
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (world) {
        finale_world_draw(c, story, live, w, h, g);
        finale_world_place_art(story, live, g);
        finale_place_words(story, g, h, finale_world_steps);
        return;
    }
    const path = [{x: -80, y: h + 60}, ...g.points, {x: g.cx, y: g.cy}];
    finale_draw_scene(c, story, live, w, h, g, path);
    finale_place_art(story, live, g, path);
    finale_place_words(story, g, h, finale_steps);
}

function finale_draw_scene(c, story, t, w, h, g, path)
{
    const glow = clamp(finale_seg(story, finale_burst - 0.2, finale_burst + 0.6)*1.2, 0, 1)*(1 - finale_seg(story, finale_burst + 0.6, 9)*0.6);
    finale_draw_sky(c, t, w, h, g, glow, 1 - finale_seg(story, 0, 1.1));
    // the constellation: dashed lines join the cleared worlds; after the burst, spokes run from each to the centre
    for (let i = 0; i < arcade_worlds; ++i) {
        if (!finale_seg(story, finale_arrive(i), finale_arrive(i) + 0.5)) {
            continue;
        }
        const last = i === arcade_worlds - 1;
        const b = last ? finale_seg(story, finale_burst, finale_burst + 0.8) : finale_seg(story, finale_arrive(i + 1) - 0.1, finale_arrive(i + 1) + 0.4);
        finale_draw_link(c, g.points[i], g.points[(i + 1) % arcade_worlds], worlds[i].accent, b);
        finale_draw_spoke(c, g.points[i], g, worlds[i].accent, finale_seg(story, finale_burst, finale_burst + 1));
    }
    // the run's flight is motion from start to end: with reduced motion the end state is all there is
    if (!full_fx) {
        return;
    }
    // the ship's trail, in the colour of the world it just left
    const u = finale_ease(finale_seg(story, finale_route[0], finale_route[1]));
    if (u > 0) {
        c.lineCap = 'round';
        for (let k = 1, steps = 160; k <= steps; ++k) {
            const v = (u*k)/steps;
            if (u - v > 0.22) {
                continue;
            }
            const a = finale_along(path, (u*(k - 1))/steps);
            const b = finale_along(path, v);
            const world = Math.min(arcade_worlds - 1, Math.floor(v*9) - 1);
            const fade = (1 - (u - v)/0.22)*(1 - finale_seg(story, 6.3, 7.6));
            c.strokeStyle = (world < 0) ? worlds[0].accent : worlds[world].accent;
            c.globalAlpha = fade*0.9;
            c.lineWidth = 1 + fade*5;
            c.beginPath();
            c.moveTo(a.x, a.y);
            c.lineTo(b.x, b.y);
            c.stroke();
        }
        c.globalAlpha = 1;
    }
    // a ring in the world's colour as the ship arrives
    for (let i = 0; i < arcade_worlds; ++i) {
        finale_draw_arrival(c, g.points[i], g, worlds[i].accent, finale_seg(story, finale_arrive(i), finale_arrive(i) + 0.9));
    }
    // three shockwaves at the burst
    const wave = finale_seg(story, finale_burst, finale_burst + 1.6);
    if ((wave > 0) && (wave < 1)) {
        for (const [m, color] of [[1, '#ffffff'], [0.75, '#6cf8ec'], [0.5, '#ff5baf']]) {
            c.strokeStyle = color;
            c.globalAlpha = (1 - wave)*0.8;
            c.lineWidth = 6*(1 - wave) + 1;
            c.beginPath();
            c.arc(g.cx, g.cy, wave*Math.max(w, h)*0.75*m, 0, Math.PI*2);
            c.stroke();
        }
        c.globalAlpha = 1;
    }
    finale_draw_fireworks(c, t, w, h);
}

// The sky: a gradient lit from the emblem by glow (0..1), and the stars, streaking while warp (0..1) is up
function finale_draw_sky(c, t, w, h, g, glow, warp)
{
    const background = c.createRadialGradient(g.cx, g.cy, 0, g.cx, g.cy, Math.max(w, h)*0.75);
    background.addColorStop(0, `rgb(${Math.round(18 + 60*glow)}, ${Math.round(40 + 70*glow)}, ${Math.round(78 + 60*glow)})`);
    background.addColorStop(0.55, '#07142a');
    background.addColorStop(1, '#02050b');
    c.fillStyle = background;
    c.fillRect(0, 0, w, h);
    // the stars: warp streaks at first, then still and twinkling
    for (const v of finale_stars) {
        const x = v.x*w;
        const y = v.y*h;
        if (warp > 0.02) {
            const dx = x - g.cx;
            const dy = y - g.cy;
            const d = Math.hypot(dx, dy) || 1;
            const length = warp*v.z*120;
            c.strokeStyle = `rgba(210, 230, 255, ${0.3 + 0.5*v.z})`;
            c.lineWidth = v.z*1.6;
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(x - (dx/d)*length, y - (dy/d)*length);
            c.stroke();
        }
        else {
            c.fillStyle = `rgba(220, 232, 255, ${(0.25 + 0.6*v.z)*(0.7 + 0.3*Math.sin(t*2 + v.twinkle))})`;
            c.fillRect(x, y, v.z*1.8, v.z*1.8);
        }
    }
}

// A dashed line from p towards q, b (0..1) of the way
function finale_draw_link(c, p, q, color, b)
{
    if (b <= 0) {
        return;
    }
    c.strokeStyle = `${color}66`;
    c.lineWidth = 1.5;
    c.setLineDash([4, 6]);
    c.beginPath();
    c.moveTo(p.x, p.y);
    c.lineTo(p.x + (q.x - p.x)*b, p.y + (q.y - p.y)*b);
    c.stroke();
    c.setLineDash([]);
}

// A spoke from p towards the emblem's centre, k (0..1) of the way, fading as it goes
function finale_draw_spoke(c, p, g, color, k)
{
    if (k <= 0) {
        return;
    }
    const line = c.createLinearGradient(p.x, p.y, g.cx, g.cy);
    line.addColorStop(0, `${color}aa`);
    line.addColorStop(1, `${color}00`);
    c.strokeStyle = line;
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(p.x, p.y);
    c.lineTo(p.x + (g.cx - p.x)*k, p.y + (g.cy - p.y)*k);
    c.stroke();
}

// A ring widening and fading from a planet as it lights, k (0..1) through it
function finale_draw_arrival(c, p, g, color, k)
{
    if ((k <= 0) || (k >= 1)) {
        return;
    }
    c.strokeStyle = color;
    c.globalAlpha = (1 - k)*0.9;
    c.lineWidth = 3*(1 - k) + 1;
    c.beginPath();
    c.arc(p.x, p.y, g.r*0.12 + k*g.r*0.35, 0, Math.PI*2);
    c.stroke();
    c.globalAlpha = 1;
}

// color, when given, paints every burst (world mode: that world's accent); every: one burst of so many goes off
function finale_draw_fireworks(c, t, w, h, color = null, every = 1)
{
    for (const [i, f] of finale_fireworks.entries()) {
        if ((t < f.t0) || (i % every)) {
            continue;
        }
        const dt = (t - f.t0) % 11;
        if (dt > 2.4) {
            continue;
        }
        const random = finale_random(f.seed);
        const ox = f.x*w;
        const oy = f.y*h;
        const life = 1 - dt/2.4;
        const paint = color || worlds[f.world].accent;
        for (let j = 0; j < f.count; ++j) {
            const a = random()*Math.PI*2;
            const speed = f.speed*(0.55 + random()*0.45);
            c.globalAlpha = Math.max(0, life)*(0.6 + 0.4*Math.sin(dt*30 + j));
            c.fillStyle = (j % 5) ? paint : '#ffffff';
            c.beginPath();
            c.arc(ox + Math.cos(a)*speed*dt*(1 - dt*0.18), oy + Math.sin(a)*speed*dt*(1 - dt*0.18) + 38*dt*dt, 1.2 + life*1.8, 0, Math.PI*2);
            c.fill();
        }
        if (dt < 0.25) {
            c.globalAlpha = 1 - dt/0.25;
            c.fillStyle = '#ffffff';
            c.beginPath();
            c.arc(ox, oy, 10*(1 - dt/0.25) + 2, 0, Math.PI*2);
            c.fill();
        }
    }
    c.globalAlpha = 1;
}

// The planets (dim until reached, then lit and named), the ship on its route, the burst, the ring and the flash
function finale_place_art(story, t, g, path)
{
    for (let i = 0; i < arcade_worlds; ++i) {
        const lit = finale_seg(story, finale_arrive(i) - 0.05, finale_arrive(i) + 0.35);
        const named = finale_seg(story, finale_arrive(i), finale_arrive(i) + 0.4)*(1 - finale_seg(story, 6.3, 6.9));
        finale_place_planet(i, g, t, finale_seg(story, 0.3 + i*0.06, 0.9 + i*0.06), lit, named);
    }
    const ship = document.getElementById('finale_ship');
    if (story < finale_route[0]) {
        ship.style.opacity = 0;
    }
    else {
        const u = finale_ease(finale_seg(story, finale_route[0], finale_route[1]));
        const a = finale_along(path, u);
        const b = finale_along(path, Math.min(1, u + 0.004));
        let angle = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI/2;
        let x = a.x;
        let y = a.y;
        let scale = 1;
        if (story > finale_route[1]) {
            const k = t - finale_route[1];
            angle = Math.sin(k*0.8)*0.08;
            x = g.cx;
            y = g.cy + Math.sin(k*1.6)*5;
            scale = 1 + finale_seg(story, finale_burst - 0.1, finale_burst + 0.5)*0.5;
        }
        finale_place_ship(g, x, y, angle, scale, 1);
    }
    const burst = finale_seg(story, finale_burst - 0.1, finale_burst + 1.4);
    finale_place_image('finale_burst', g, g.r*2.6, (burst > 0) ? 1 - burst : 0, `scale(${0.3 + burst*1.4}) rotate(${burst*40}deg)`);
    finale_place_image('finale_ring', g, g.r*1.5, finale_seg(story, finale_burst + 0.2, finale_end)*0.55, `rotate(${t*12}deg)`);
    document.getElementById('finale_flash').style.opacity = Math.max(0, 1 - Math.abs(story - finale_burst)/0.22)*0.7;
}

// Planet i: appear (0..1) fades it in, lit (0..1) brings its colour and glow with a pop, named (0..1) shows its name
function finale_place_planet(i, g, t, appear, lit, named)
{
    const p = g.points[i];
    const pop = ((lit > 0) && (lit < 1)) ? 1 + 0.25*Math.sin(lit*Math.PI) : 1;
    const bob = Math.sin(t*1.3 + i)*3;
    const s = g.r*0.3*(0.8 + 0.2*appear)*pop;
    const {image, name} = finale.planets[i];
    image.style.width = `${s}px`;
    image.style.transform = `translate(${p.x - s/2}px, ${p.y - s/2 + bob}px)`;
    image.style.opacity = appear;
    image.style.filter = `saturate(${0.15 + 0.85*lit}) brightness(${0.45 + 0.55*lit}) drop-shadow(0 0 ${lit*22}px ${worlds[i].accent})`;
    name.style.transform = `translate(calc(${p.x}px - 50%), ${p.y + s/2 + 8 + bob}px)`;
    name.style.opacity = named;
}

// The ship at x, y; it keeps to the ring's scale, so a short window's small emblem does not hold a big ship
function finale_place_ship(g, x, y, angle, scale, opacity)
{
    const ship = document.getElementById('finale_ship');
    const size = clamp(g.r*0.42, 36, 80);
    ship.style.opacity = opacity;
    ship.style.width = `${size}px`;
    ship.style.transform = `translate(${x - size/2}px, ${y - size/2}px) rotate(${angle}rad) scale(${scale})`;
}

function finale_place_image(id, g, size, opacity, transform)
{
    const image = document.getElementById(id);
    image.style.width = `${size}px`;
    image.style.left = `${g.cx - size/2}px`;
    image.style.top = `${g.cy - size/2}px`;
    image.style.opacity = opacity;
    image.style.transform = transform;
}

// The words by their steps (finale_steps): the title letter by letter, its eyebrow, the results tile by tile counting
// up, the flagships, the best bar, the line, and the buttons last
function finale_place_words(story, g, h, steps)
{
    const run = finale.run;
    const title = document.getElementById('finale_title');
    title.style.top = `${g.short ? 14 : Math.max(16, h*0.03)}px`;
    title.querySelector('.eyebrow').style.opacity = finale_seg(story, ...steps.eyebrow);
    const letters = [...title.querySelectorAll('h1 span')];
    const [start, spread, rise] = steps.title;
    for (const [i, v] of letters.entries()) {
        const a = start + (spread*i)/Math.max(1, letters.length - 1);
        const k = finale_ease(finale_seg(story, a, a + rise));
        v.style.opacity = k;
        v.style.transform = (k < 1) ? `translateY(${(1 - k)*18}px) scale(${1.12 - 0.12*k})` : '';
        v.style.filter = (k < 1) ? `blur(${(1 - k)*5}px)` : '';
    }
    title.querySelector('p').style.opacity = finale_seg(story, ...steps.line);
    const results = document.getElementById('finale_res');
    results.style.top = `${g.short ? h*0.3 : g.cy + g.r*1.45}px`;
    results.style.opacity = (story >= steps.results[0]) ? 1 : 0;
    results.style.transform = g.short ? '' : 'translateX(-50%)';
    // each tile rises in its turn; the flagships' row and the best bar's come with their own steps
    const tiles = [...document.querySelectorAll('#finale_stats .finale-st')].filter(v => !v.classList.contains('hidden'));
    for (const [i, v] of tiles.entries()) {
        finale_place_row(v, finale_seg(story, steps.results[0] + i*steps.results[1], steps.results[0] + i*steps.results[1] + 0.35));
    }
    finale_place_row(document.getElementById('finale_flags'), finale_seg(story, steps.flags[0] - 0.1, steps.flags[0] + 0.2));
    finale_place_row(document.querySelector('#finale_res .finale-best'), finale_seg(story, steps.best[0] - 0.15, steps.best[0] + 0.15));
    const count = finale_ease(finale_seg(story, ...steps.count));
    document.getElementById('finale_score').textContent = ui_number(run.score*count);
    document.getElementById('finale_raiders').textContent = ui_number(run.raiders*count);
    document.getElementById('finale_time').textContent = format_time(Math.round(run.time*count));
    const world = finale.world >= 0;
    if (world) {
        document.getElementById('finale_kept').textContent = `run total ${ui_number(run.total)}`;
        document.getElementById('finale_salvage').textContent = ui_number(run.salvage*count);
        document.getElementById('finale_bonus').textContent = `+${ui_number(run.bonus)} world bonus`;
    }
    else {
        document.getElementById('finale_kept').textContent = run.kept ? `with ◆ ${ui_number(run.salvage)} kept · +${ui_number(run.kept*count)}` : '';
    }
    // the bar weighs the run's score so far against the best
    const total = world ? run.total : run.score;
    const fill = finale_ease(finale_seg(story, ...steps.best));
    const record = total > run.best;
    document.getElementById('finale_best_bar').style.width = `${(run.best ? Math.min(1, total/run.best) : 1)*100*fill}%`;
    document.getElementById('finale_best_note').innerHTML = record ? ((fill >= 1) ? '<span class="finale-new">NEW BEST</span>' : '') : (total === run.best) ? 'equals your best' : `${ui_number(run.best - total)} to beat it`;
    document.getElementById('finale_best_label').textContent = `Personal best ${ui_number(record ? total : run.best)}`;
    // in world mode the flagships still ahead stay dim
    for (const [i, v] of [...document.querySelectorAll('#finale_flags img')].entries()) {
        const k = finale_seg(story, steps.flags[0] + i*steps.flags[1], steps.flags[0] + i*steps.flags[1] + 0.25);
        const ahead = world && (i > finale.world);
        v.classList.toggle('is-ahead', ahead);
        v.style.opacity = ahead ? k*0.3 : k;
        v.style.transform = `scale(${ahead ? 0.8 : 0.4 + 0.6*k + Math.sin(k*Math.PI)*0.25})`;
    }
    const acts = document.getElementById('finale_acts');
    acts.style.opacity = finale_ease(finale_seg(story, ...steps.acts));
    acts.style.pointerEvents = (story > steps.acts[0]) ? 'auto' : 'none';
    // the hint shows while the opening plays, and goes as the buttons come
    const shown = steps.show ? finale_seg(story, ...steps.show) : 1;
    document.getElementById('finale_skip').style.opacity = full_fx ? shown*(1 - finale_seg(story, steps.acts[0] - 0.3, steps.acts[0])) : 0;
}

// A row of the results rising into its place, k (0..1) of the way
function finale_place_row(v, k)
{
    const e = finale_ease(k);
    v.style.opacity = e;
    v.style.transform = (e < 1) ? `translateY(${(1 - e)*14}px)` : '';
}

// World mode's sky and constellation: the worlds cleared before joined and lit as the window fades in, this one
// lighting with a ring and a spoke as its title lands, then the way on: a dashed line to the next one, which a turning
// dashed circle marks. A burst in this world's accent once the title is read, then one every second or so
function finale_world_draw(c, story, t, w, h, g)
{
    const here = finale.world;
    const steps = finale_world_steps;
    const [lit, lit_end] = steps.planet;
    const glow = finale_seg(story, lit, lit_end)*(1 - finale_seg(story, lit_end, lit_end + 1.5))*0.5;
    finale_draw_sky(c, t, w, h, g, glow, 0);
    const early = finale_seg(story, ...steps.show);
    for (let i = 0; i < here; ++i) {
        finale_draw_link(c, g.points[i], g.points[i + 1], worlds[i].accent, early);
        finale_draw_spoke(c, g.points[i], g, worlds[i].accent, early);
    }
    finale_draw_spoke(c, g.points[here], g, worlds[here].accent, finale_seg(story, lit, lit_end + 0.5));
    finale_draw_arrival(c, g.points[here], g, worlds[here].accent, finale_seg(story, lit + 0.05, lit + 0.95));
    const [onward, onward_end] = steps.onward;
    finale_draw_link(c, g.points[here], g.points[here + 1], worlds[here].accent, finale_ease(finale_seg(story, onward, onward_end - 0.1)));
    const mark = finale_seg(story, onward + 0.2, onward_end);
    if (mark > 0) {
        const p = g.points[here + 1];
        c.strokeStyle = worlds[here + 1].accent;
        c.globalAlpha = mark*(0.6 + 0.3*Math.sin(t*4));
        c.lineWidth = 2;
        c.setLineDash([5, 5]);
        c.beginPath();
        c.arc(p.x, p.y, g.r*0.24, t*0.8, t*0.8 + Math.PI*2);
        c.stroke();
        c.setLineDash([]);
        c.globalAlpha = 1;
    }
    if (full_fx) {
        finale_draw_fireworks(c, t + finale_fireworks[0].t0 - lit_end, w, h, worlds[here].accent, 3);
    }
}

// World mode's art: the planets (cleared ones lit as the window fades in, this one lighting, the next one half lit
// once marked), your ship settling into the emblem's centre and the ring turning around it
function finale_world_place_art(story, t, g)
{
    const here = finale.world;
    const steps = finale_world_steps;
    const [show, show_end] = steps.show;
    for (let i = 0; i < arcade_worlds; ++i) {
        const appear = finale_seg(story, show + i*0.04, show_end + i*0.04);
        const next = finale_seg(story, steps.onward[0] + 0.2, steps.onward[1])*0.35;
        const lit = (i < here) ? appear : (i === here) ? finale_seg(story, ...steps.planet) : (i === here + 1) ? next : 0;
        finale_place_planet(i, g, t, appear, lit, 0);
    }
    const arrive = finale_ease(finale_seg(story, show, show_end + 0.3));
    finale_place_ship(g, g.cx, g.cy + (1 - arrive)*40 + Math.sin(t*1.6)*5, Math.sin(t*0.8)*0.08, 0.7 + 0.3*arrive, arrive);
    finale_place_image('finale_burst', g, g.r*2.6, 0, '');
    finale_place_image('finale_ring', g, g.r*1.5, finale_seg(story, show, show_end + 0.4)*0.55, `rotate(${t*12}deg)`);
    document.getElementById('finale_flash').style.opacity = 0;
}

// When the ship reaches world i: the route visits the eight in order, then the centre
function finale_arrive(i)
{
    return finale_route[0] + (finale_route[1] - finale_route[0])*((i + 1)/(arcade_worlds + 1));
}

// A point at u (0..1) along a smooth curve through the points
function finale_along(points, u)
{
    const n = points.length - 1;
    const s = Math.min(n - 1e-6, Math.max(0, u*n));
    const i = Math.floor(s);
    const t = s - i;
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(n, i + 2)];
    function spline(a, b, c, d) {
        return 0.5*(2*b + (c - a)*t + (2*a - 5*b + 4*c - d)*t*t + (3*b - a - 3*c + d)*t*t*t);
    }
    return {x: spline(p0.x, p1.x, p2.x, p3.x), y: spline(p0.y, p1.y, p2.y, p3.y)};
}

function finale_ease(t)
{
    return (t < 0.5) ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;
}

// How far t is from a to b, 0..1
function finale_seg(t, a, b)
{
    return clamp((t - a)/(b - a), 0, 1);
}

// A seeded generator: the same stars and fireworks every time
function finale_random(seed)
{
    let s = (seed >>> 0) || 1;
    return function () {
        s = (Math.imul(s ^ (s >>> 15), 1 | s) + 0x6d2b79f5) | 0;
        return ((s ^ (s >>> 7)) >>> 0) % 100000/100000;
    };
}

function finale_random_list(seed, count, make)
{
    const random = finale_random(seed);
    return Array.from({length: count}, (_, i) => make(random, i));
}
