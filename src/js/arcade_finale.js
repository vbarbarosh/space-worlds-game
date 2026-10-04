// The arcade's ending (the designer's arcade-finale.html): when the eighth world falls, a warp drops into a ring of the
// eight planets, your ship visits them in order and lights each one, flies to the centre in a white burst, and
// "FRONTIER CLEARED" assembles over the emblem while fireworks go off; then the run's results count up, with the eight
// flagships and the personal best. Every frame is a function of the time t since it began; any key or click skips to
// the results, and the scene keeps living behind the buttons.
const finale = {open: false, start: 0, frozen: null, run: null, request: 0, planets: [], width: 0, height: 0};
const finale_end = 12.5;
const finale_results = 11.6;
const finale_route = [0.9, 6];
const finale_burst = 6.15;
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
    if (finale_time() < finale_results) {
        finale_skip();
    }
    else if (event.code === 'Enter') {
        finale_leave('again');
    }
    else if ((event.code === 'KeyO') && (difficulty !== 'overload')) {
        finale_leave('overload');
    }
    else if (event.code === 'Escape') {
        finale_leave('menu');
    }
}, true);

// Opens the finale for a won run: score, the best before it, raiders, time in seconds, and the salvage kept with its points
function arcade_finale_open(run)
{
    state = 'finale';
    finale.run = run;
    finale.open = true;
    finale.start = performance.now();
    finale_build();
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
        name.innerHTML = `${ui_escape(world.name)}<s>${i + 1}/${worlds.length}</s>`;
        holder.append(image, name);
        return {image, name};
    });
    const flags = document.getElementById('finale_flags');
    for (const v of flags.querySelectorAll('img')) {
        v.remove();
    }
    for (let i = 0; i < worlds.length; ++i) {
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
    document.getElementById('finale_letters').innerHTML = [...'FRONTIER CLEARED'].map((v, i) => `<span${(i > 8) ? ' class="c"' : ''}>${(v === ' ') ? '&nbsp;' : v}</span>`).join('');
    set_hidden(document.getElementById('finale_overload'), difficulty === 'overload');
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

function finale_skip()
{
    if (finale_time() < finale_results) {
        finale.start = performance.now() - finale_results*1000;
    }
}

// Play again, the same run on Overload, or the main menu
function finale_leave(choice)
{
    arcade_finale_close();
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
        const a = Math.PI/2 + (i*2*Math.PI)/worlds.length;
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
    // past the end the story holds its last frame; the stars, the ring, the planets' bob and the fireworks go on
    const story = Math.min(t, finale_end);
    const title = document.getElementById('finale_title');
    const g = finale_geometry(story, w, h, title.offsetTop + title.offsetHeight, document.getElementById('finale_res').offsetHeight);
    stage.classList.toggle('is-short', g.short);
    const path = [{x: -80, y: h + 60}, ...g.points, {x: g.cx, y: g.cy}];
    const c = canvas.getContext('2d');
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    finale_draw_scene(c, story, t, w, h, g, path);
    finale_place_art(story, t, g, path);
    finale_place_words(story, t, g, h);
}

function finale_draw_scene(c, story, t, w, h, g, path)
{
    const background = c.createRadialGradient(g.cx, g.cy, 0, g.cx, g.cy, Math.max(w, h)*0.75);
    const glow = clamp(finale_seg(story, finale_burst - 0.2, finale_burst + 0.6)*1.2, 0, 1)*(1 - finale_seg(story, finale_burst + 0.6, 9)*0.6);
    background.addColorStop(0, `rgb(${Math.round(18 + 60*glow)}, ${Math.round(40 + 70*glow)}, ${Math.round(78 + 60*glow)})`);
    background.addColorStop(0.55, '#07142a');
    background.addColorStop(1, '#02050b');
    c.fillStyle = background;
    c.fillRect(0, 0, w, h);
    // the stars: warp streaks at first, then still and twinkling
    const warp = 1 - finale_seg(story, 0, 1.1);
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
    // the constellation: dashed lines join the cleared worlds; after the burst, spokes run from each to the centre
    for (let i = 0; i < worlds.length; ++i) {
        if (!finale_seg(story, finale_arrive(i), finale_arrive(i) + 0.5)) {
            continue;
        }
        const p = g.points[i];
        const q = g.points[(i + 1) % worlds.length];
        const color = worlds[i].accent;
        const last = i === worlds.length - 1;
        const b = last ? finale_seg(story, finale_burst, finale_burst + 0.8) : finale_seg(story, finale_arrive(i + 1) - 0.1, finale_arrive(i + 1) + 0.4);
        if (b > 0) {
            c.strokeStyle = `${color}66`;
            c.lineWidth = 1.5;
            c.setLineDash([4, 6]);
            c.beginPath();
            c.moveTo(p.x, p.y);
            c.lineTo(p.x + (q.x - p.x)*b, p.y + (q.y - p.y)*b);
            c.stroke();
            c.setLineDash([]);
        }
        const spoke = finale_seg(story, finale_burst, finale_burst + 1);
        if (spoke > 0) {
            const line = c.createLinearGradient(p.x, p.y, g.cx, g.cy);
            line.addColorStop(0, `${color}aa`);
            line.addColorStop(1, `${color}00`);
            c.strokeStyle = line;
            c.lineWidth = 2.5;
            c.beginPath();
            c.moveTo(p.x, p.y);
            c.lineTo(p.x + (g.cx - p.x)*spoke, p.y + (g.cy - p.y)*spoke);
            c.stroke();
        }
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
            const world = Math.min(worlds.length - 1, Math.floor(v*9) - 1);
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
    for (let i = 0; i < worlds.length; ++i) {
        const k = finale_seg(story, finale_arrive(i), finale_arrive(i) + 0.9);
        if ((k > 0) && (k < 1)) {
            c.strokeStyle = worlds[i].accent;
            c.globalAlpha = (1 - k)*0.9;
            c.lineWidth = 3*(1 - k) + 1;
            c.beginPath();
            c.arc(g.points[i].x, g.points[i].y, g.r*0.12 + k*g.r*0.35, 0, Math.PI*2);
            c.stroke();
        }
    }
    c.globalAlpha = 1;
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

function finale_draw_fireworks(c, t, w, h)
{
    for (const f of finale_fireworks) {
        if (t < f.t0) {
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
        const color = worlds[f.world].accent;
        for (let j = 0; j < f.count; ++j) {
            const a = random()*Math.PI*2;
            const speed = f.speed*(0.55 + random()*0.45);
            c.globalAlpha = Math.max(0, life)*(0.6 + 0.4*Math.sin(dt*30 + j));
            c.fillStyle = (j % 5) ? color : '#ffffff';
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
    const size = g.r*0.3;
    for (const [i, world] of worlds.entries()) {
        const p = g.points[i];
        const lit = finale_seg(story, finale_arrive(i) - 0.05, finale_arrive(i) + 0.35);
        const appear = finale_seg(story, 0.3 + i*0.06, 0.9 + i*0.06);
        const pop = ((lit > 0) && (lit < 1)) ? 1 + 0.25*Math.sin(lit*Math.PI) : 1;
        const bob = Math.sin(t*1.3 + i)*3;
        const s = size*(0.8 + 0.2*appear)*pop;
        const {image, name} = finale.planets[i];
        image.style.width = `${s}px`;
        image.style.transform = `translate(${p.x - s/2}px, ${p.y - s/2 + bob}px)`;
        image.style.opacity = appear;
        image.style.filter = `saturate(${0.15 + 0.85*lit}) brightness(${0.45 + 0.55*lit}) drop-shadow(0 0 ${lit*22}px ${world.accent})`;
        name.style.transform = `translate(calc(${p.x}px - 50%), ${p.y + s/2 + 8 + bob}px)`;
        name.style.opacity = finale_seg(story, finale_arrive(i), finale_arrive(i) + 0.4)*(1 - finale_seg(story, 6.3, 6.9));
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
        ship.style.opacity = 1;
        // the ship keeps to the ring's scale, so a short window's small emblem does not hold a big ship
        const size = clamp(g.r*0.42, 36, 80);
        ship.style.width = `${size}px`;
        ship.style.transform = `translate(${x - size/2}px, ${y - size/2}px) rotate(${angle}rad) scale(${scale})`;
    }
    const burst = finale_seg(story, finale_burst - 0.1, finale_burst + 1.4);
    finale_place_image('finale_burst', g, g.r*2.6, (burst > 0) ? 1 - burst : 0, `scale(${0.3 + burst*1.4}) rotate(${burst*40}deg)`);
    finale_place_image('finale_ring', g, g.r*1.5, finale_seg(story, finale_burst + 0.2, finale_end)*0.55, `rotate(${t*12}deg)`);
    document.getElementById('finale_flash').style.opacity = Math.max(0, 1 - Math.abs(story - finale_burst)/0.22)*0.7;
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

// The title letter by letter, then the results counting up, the flagships, the best bar and the buttons
function finale_place_words(story, t, g, h)
{
    const run = finale.run;
    const title = document.getElementById('finale_title');
    title.style.top = `${g.short ? 14 : Math.max(16, h*0.03)}px`;
    title.querySelector('.eyebrow').style.opacity = finale_seg(story, 6.6, 7.2);
    for (const [i, v] of [...title.querySelectorAll('h1 span')].entries()) {
        const k = finale_ease(finale_seg(story, 6.7 + i*0.045, 7.2 + i*0.045));
        v.style.opacity = k;
        v.style.transform = `translateY(${(1 - k)*30}px) scale(${1.3 - 0.3*k})`;
        v.style.filter = (k < 1) ? `blur(${(1 - k)*8}px)` : '';
    }
    title.querySelector('p').style.opacity = finale_seg(story, 7.8, 8.4);
    const results = document.getElementById('finale_res');
    const rise = finale_ease(finale_seg(story, 8.6, 9.4));
    results.style.top = `${g.short ? h*0.3 : g.cy + g.r*1.45}px`;
    results.style.opacity = rise;
    results.style.transform = g.short ? `translateY(${(1 - rise)*24}px)` : `translateX(-50%) translateY(${(1 - rise)*24}px)`;
    const count = finale_ease(finale_seg(story, 8.8, 10.8));
    document.getElementById('finale_score').textContent = ui_number(run.score*count);
    document.getElementById('finale_raiders').textContent = ui_number(run.raiders*count);
    document.getElementById('finale_time').textContent = format_time(Math.round(run.time*count));
    document.getElementById('finale_kept').textContent = run.kept ? `with ◆ ${ui_number(run.salvage)} kept · +${ui_number(run.kept*count)}` : '';
    const fill = finale_seg(story, 10.6, 11.4);
    const record = run.score > run.best;
    document.getElementById('finale_best_bar').style.width = `${(run.best ? Math.min(1, run.score/run.best) : 1)*100*fill}%`;
    document.getElementById('finale_best_note').innerHTML = record ? ((fill >= 1) ? '<span class="finale-new">NEW BEST</span>' : '') : (run.score === run.best) ? 'equals your best' : `${ui_number(run.best - run.score)} to beat it`;
    document.getElementById('finale_best_label').textContent = `Personal best ${ui_number(record ? run.score : run.best)}`;
    for (const [i, v] of [...document.querySelectorAll('#finale_flags img')].entries()) {
        const k = finale_seg(story, 9.3 + i*0.12, 9.6 + i*0.12);
        v.style.opacity = k;
        v.style.transform = `scale(${0.4 + 0.6*k + Math.sin(k*Math.PI)*0.25})`;
    }
    const acts = document.getElementById('finale_acts');
    acts.style.opacity = finale_seg(story, 11.4, 12);
    acts.style.pointerEvents = (story > 11.4) ? 'auto' : 'none';
    document.getElementById('finale_skip').style.opacity = (t < 11) ? 1 : 0;
}

// When the ship reaches world i: the route visits the eight in order, then the centre
function finale_arrive(i)
{
    return finale_route[0] + (finale_route[1] - finale_route[0])*((i + 1)/(worlds.length + 1));
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
