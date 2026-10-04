// The main menu, after the designer's main-menu.html: the modes as one family of rows (Continue the big one). A click
// on Continue, New campaign or Arcade opens the row in place, and only its button (or Enter) plays; Load, Settings and
// Controls show their scene on the right. Starting plays the launch, then the game.
// The arcade preview per difficulty: seconds between swarms, raiders on the stage at most, the share of elites
const menu_arcade_levels = {
    chill: {spawn: 0.75, max: 7, elite: 0, color: '#7be08a', name: 'Chill'},
    normal: {spawn: 0.36, max: 14, elite: 0.12, color: '#6cf8ec', name: 'Standard'},
    overload: {spawn: 0.15, max: 26, elite: 0.45, color: '#ff4d5e', name: 'Overload'},
};
const menu_arcade_kinds = ['chaser', 'shooter', 'lancer', 'tank'];
// the preview's ship on its 720×640 stage
const menu_arcade_centre = {x: 360, y: 370};
// how long the launch plays before the game starts
const menu_launch_ms = 1000;
const menu_arcade = {
    timer: 0, last: 0, foes: [], shots: [], hostile_shots: [], sparks: [], pops: [], score: 0, combo: 1, combo_timer: 0, wave: 1,
    kills: 0, spawn: 0, fire: 0, angle: 0, launch: -1, shake: 0, level: menu_arcade_levels.normal, hero: new Image(), images: null,
};
let menu_scene_now = '';
// the row open in place: continue, campaign, arcade, or none once Esc folds it
let menu_open_row = '';
let menu_launching = false;

// A row opens on a click, or on a keyboard focus
for (const v of document.querySelectorAll('#menu_modes .mode')) {
    v.addEventListener('focus', () => v.matches(':focus-visible') && menu_scene(v.dataset.scene));
    v.addEventListener('click', () => menu_scene(v.dataset.scene));
}
for (const v of document.querySelectorAll('#intro .tile')) {
    v.addEventListener('click', () => menu_level_sync(v.dataset.mode));
}
document.getElementById('menu_continue_go').addEventListener('click', () => menu_launch('continue'));
document.getElementById('menu_campaign_go').addEventListener('click', () => menu_launch('campaign'));
document.getElementById('menu_arcade_go').addEventListener('click', () => menu_launch('arcade'));
document.getElementById('menu_arcade_back').addEventListener('click', menu_fold);
document.getElementById('menu_all_saves').addEventListener('click', () => saves_open('menu'));
document.getElementById('menu_volume').addEventListener('click', toggle_audio_settings);
addEventListener('keydown', on_menu_key);
menu_controls_fill();

// C, N, A, L, S and ? pick their row; the arrows move between the rows; 1 2 3 pick a difficulty in the open Arcade;
// Enter plays the open row; Esc folds it
function on_menu_key(event)
{
    if ((state !== 'menu') || settings_open || menu_launching || event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
    }
    const modes = Array.from(document.querySelectorAll('#menu_modes .mode')).filter(v => !v.closest('.hidden'));
    const i = modes.indexOf(document.activeElement);
    if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key) && !document.activeElement.classList.contains('tile')) {
        event.preventDefault();
        const step = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
        modes[(Math.max(0, i) + step + modes.length) % modes.length].focus();
        return;
    }
    if ((event.key === 'Escape') && menu_open_row) {
        menu_fold();
        return;
    }
    if ((menu_open_row === 'arcade') && ['1', '2', '3'].includes(event.key)) {
        document.querySelectorAll('#intro .tile')[Number(event.key) - 1].click();
        return;
    }
    if ((event.key === 'Enter') && ((i >= 0) || (document.activeElement === document.body) || document.activeElement.classList.contains('tile'))) {
        event.preventDefault();
        if (menu_open_row) {
            menu_launch(menu_open_row);
        }
        else if (i >= 0) {
            menu_scene(modes[i].dataset.scene);
        }
        return;
    }
    const m = modes.find(v => v.dataset.key === event.key.toLowerCase());
    if (m) {
        event.preventDefault();
        m.focus();
        menu_scene(m.dataset.scene);
    }
}

function menu_scene(name)
{
    menu_open_row = ['continue', 'campaign', 'arcade'].includes(name) ? name : '';
    for (const v of document.querySelectorAll('#menu_modes .fold')) {
        v.classList.toggle('on', v.dataset.scene === name);
        v.classList.toggle('open', v.dataset.scene === menu_open_row);
    }
    document.getElementById('menu_modes').classList.toggle('has-open', !!menu_open_row);
    // short windows hide the other rows while the arcade's tiles are open, so they fit
    document.getElementById('menu_modes').classList.toggle('arcade-open', menu_open_row === 'arcade');
    if (name === menu_scene_now) {
        // back on the menu with the arcade scene showing: its preview starts again
        if (name === 'arcade') {
            menu_arcade_start();
        }
        return;
    }
    menu_scene_now = name;
    for (const v of document.querySelectorAll('#intro .scene, #menu_modes .mode')) {
        v.classList.toggle('on', v.dataset.scene === name);
    }
    if (name === 'load') {
        menu_slots_render();
    }
    if (name === 'settings') {
        sync_settings_rows();
    }
    if (name === 'arcade') {
        menu_level_sync(difficulty);
        menu_arcade_start();
    }
    else {
        menu_arcade_stop();
    }
}

// Esc: the open row closes, its scene stays
function menu_fold()
{
    menu_open_row = '';
    for (const v of document.querySelectorAll('#menu_modes .fold')) {
        v.classList.remove('open');
    }
    document.getElementById('menu_modes').classList.remove('has-open', 'arcade-open');
}

// The launch: the scene zooms, a flash, "Starting · …", then the game
function menu_launch(mode)
{
    if (menu_launching || ((mode === 'continue') && !checkpoint)) {
        return;
    }
    menu_launching = true;
    menu_arcade.launch = 0;
    const titles = {continue: document.getElementById('continue_title').textContent, campaign: 'New campaign', arcade: `Arcade · ${menu_arcade.level.name}`};
    document.getElementById('menu_go_title').textContent = titles[mode];
    document.getElementById('intro').classList.add('launching');
    setTimeout(() => menu_start(mode), menu_launch_ms);
}

function menu_start(mode)
{
    set_pause_icon(false);
    if (mode === 'continue') {
        reset_run(true);
    }
    else if (mode === 'campaign') {
        arcade_stop();
        reset_run();
    }
    else {
        arcade_start();
    }
}

// The game to continue: its card, its scene's line, and the art of its world and ship
function menu_continue_show(c)
{
    const ship = ship_catalog.find(v => v.id === c.fleet?.ship_id) || ship_catalog[0];
    set_hidden(el.continue_row, false);
    document.getElementById('continue_name').textContent = 'Continue campaign';
    document.getElementById('continue_detail').textContent = `${worlds[c.world].name} · ${ship.name} · ${c.visited?.length || 1}/${worlds.length} worlds`;
    document.getElementById('continue_title').textContent = `Back to ${worlds[c.world].name}`;
    document.getElementById('continue_line').textContent = `Your ${ship.name} is waiting in orbit. Story ${c.story || 0}/${story.length}.`;
    menu_art_sync(c.world, ship.id);
}

// An arcade run lost with a checkpoint: Continue retries its sector
function menu_continue_sector(wave)
{
    set_hidden(el.continue_row, false);
    document.getElementById('continue_name').textContent = 'Continue arcade';
    document.getElementById('continue_detail').textContent = `Arcade · sector ${String(wave).padStart(2, '0')}`;
    document.getElementById('continue_title').textContent = 'Back to the arcade';
    document.getElementById('continue_line').textContent = 'Retry from the start of the sector.';
}

function menu_art_sync(world, ship_id)
{
    const planet = menu_sprite_url(menu_planet_text(world));
    const ship = sprite(`3d/ship-${ship_id}`);
    const ship_url = ship ? menu_sprite_url(new XMLSerializer().serializeToString(ship.svg)) : '';
    const station = menu_sprite_url(sprite_svgs.worlds?.[world_slug(world)]?.station);
    for (const [id, url] of [['continue_planet', planet], ['menu_planet', planet], ['menu_station', station], ['menu_ship', ship_url], ['menu_traveller', ship_url]]) {
        document.getElementById(id).src = url;
    }
    menu_arcade.hero.src = ship_url;
    for (const v of document.querySelectorAll('#intro [data-world]')) {
        v.src = menu_sprite_url(menu_planet_text(Number(v.dataset.world)));
        v.style.filter = (Number(v.dataset.world) <= world) ? '' : 'saturate(.35) brightness(.7)';
    }
    for (const v of document.querySelectorAll('#intro [data-world-name]')) {
        const i = Number(v.dataset.worldName);
        v.textContent = worlds[i].name;
        v.style.color = (i <= world) ? `var(--w-${world_slug(i)})` : '#7f93a8';
    }
}

function menu_planet_text(world)
{
    const files = sprite_svgs.worlds?.[world_slug(world)] || {};
    return Object.entries(files).find(v => v[0].startsWith('planet-'))?.[1] || '';
}

function menu_sprite_url(text)
{
    return text ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}` : '';
}

// The best arcade score, under Arcade and in its scene
function menu_best_sync()
{
    el.best_intro.textContent = `Waves of raiders · best ${ui_number(best)}`;
    document.getElementById('menu_best').textContent = `Best ${ui_number(best)}`;
}

// The Load scene: the four games saved last, the newest first, each with its Load; All slots has the six
function menu_slots_render()
{
    const parent = document.getElementById('menu_slots');
    parent.replaceChildren();
    const slots = saves_read();
    const recent = slots.map((v, i) => i).filter(v => slots[v]).sort((a, b) => slots[b].saved_at - slots[a].saved_at).slice(0, 4);
    for (const [n, i] of recent.entries()) {
        const slot = slots[i];
        const row = document.createElement('div');
        row.className = 'slot';
        row.style.setProperty('--d', `${0.05 + n*0.08}s`);
        row.innerHTML = '<img alt=""><div><b></b><small></small></div>';
        const world = worlds.findIndex(v => v.name === slot.world);
        row.querySelector('img').src = menu_sprite_url(menu_planet_text(Math.max(0, world)));
        row.querySelector('b').textContent = slot.arcade ? `Arcade · ${slot.world}` : `${slot.world} · story ${slot.story}`;
        row.querySelector('small').textContent = `Slot ${i + 1} · ${slot.ship} · ${slot.arcade ? `score ${ui_number(slot.arcade.score)}` : `◆ ${ui_number(slot.salvage)}`} · ${save_time(slot.saved_at)}`;
        row.append(ui_button({label: 'Load', size: 'sm', kind: n ? '' : 'primary', disabled: !save_slot_valid(slot), on: () => load_from_slot(i)}));
        parent.append(row);
    }
}

// The Controls scene: the keys as the pause menu lists them, one list for both
function menu_controls_fill()
{
    const list = document.querySelector('#controls_card .keys-list').cloneNode(true);
    list.removeAttribute('id');
    document.getElementById('menu_keys').replaceChildren(list);
}

// The arcade preview follows the difficulty picked: Chill calm and green, Standard busy, Overload a red grid
function menu_level_sync(mode)
{
    menu_arcade.level = menu_arcade_levels[mode] || menu_arcade_levels.normal;
    const stage = document.getElementById('menu_arcade');
    stage.classList.toggle('over', mode === 'overload');
    stage.style.setProperty('--dc', menu_arcade.level.color);
    document.getElementById('menu_dname').textContent = menu_arcade.level.name;
}

// The arcade preview: swarms come in from the edges, the ship turns to the nearest and fires tracer streams, kills
// throw sparks and score pop-ups that grow with the combo, waves are announced. A timer drives it, not the frame loop
// (the dev page's clock takes the frame loop over)
function menu_arcade_start()
{
    if (menu_arcade.timer) {
        return;
    }
    if (!menu_arcade.images) {
        menu_arcade.images = {};
        for (const kind of menu_arcade_kinds) {
            for (const name of [kind, `${kind}-elite`]) {
                const art = sprite(`3d/enemy-${name}`);
                menu_arcade.images[name] = new Image();
                menu_arcade.images[name].src = art ? menu_sprite_url(new XMLSerializer().serializeToString(art.svg)) : '';
            }
        }
    }
    menu_arcade.last = performance.now();
    menu_arcade.timer = setInterval(menu_arcade_tick, 33);
}

function menu_arcade_stop()
{
    clearInterval(menu_arcade.timer);
    menu_arcade.timer = 0;
}

function menu_arcade_tick()
{
    // the preview runs only while the menu shows it; a game started from the menu stops it
    if ((state !== 'menu') || (menu_scene_now !== 'arcade')) {
        menu_arcade_stop();
        return;
    }
    const now = performance.now();
    const dt = Math.min(0.05, (now - menu_arcade.last)/1000);
    menu_arcade.last = now;
    menu_arcade_spawn(dt);
    menu_arcade_fire(dt);
    menu_arcade_move(dt);
    menu_arcade_draw(dt);
}

function menu_arcade_spawn(dt)
{
    const a = menu_arcade;
    const c = menu_arcade_centre;
    a.spawn -= dt;
    if ((a.spawn > 0) || (a.foes.length >= a.level.max) || (a.launch >= 0)) {
        return;
    }
    a.spawn = a.level.spawn*(0.6 + Math.random()*0.8);
    const count = (Math.random() < 0.35) ? 3 : 1;
    const heading = Math.random()*Math.PI*2;
    for (let i = 0; i < count; ++i) {
        const angle = heading + (i - 1)*0.18;
        const elite = Math.random() < a.level.elite;
        const kind = menu_arcade_kinds[Math.floor(Math.random()*menu_arcade_kinds.length)];
        a.foes.push({
            x: c.x + Math.cos(angle)*430,
            y: c.y + Math.sin(angle)*400,
            hp: elite ? 4 : (kind === 'tank') ? 3 : 1,
            speed: (elite ? 90 : 60) + Math.random()*50,
            image: elite ? `${kind}-elite` : kind,
            size: (kind === 'tank') ? 60 : elite ? 56 : 44,
            elite,
            orbit: (Math.random() < 0.5) ? 1 : -1,
            fire: 1 + Math.random()*2,
            hit: 0,
            r: 0,
        });
    }
}

// The ship turns to the nearest raider and fires two tracer streams
function menu_arcade_fire(dt)
{
    const a = menu_arcade;
    const c = menu_arcade_centre;
    let near = null;
    let near_d = Infinity;
    for (const f of a.foes) {
        const d = Math.hypot(f.x - c.x, f.y - c.y);
        if (d < near_d) {
            near_d = d;
            near = f;
        }
    }
    if (!near || (a.launch >= 0)) {
        return;
    }
    const want = Math.atan2(near.y - c.y, near.x - c.x);
    const turn = ((want - a.angle + Math.PI*3) % (Math.PI*2)) - Math.PI;
    a.angle += turn*Math.min(1, dt*10);
    a.fire -= dt;
    if ((a.fire > 0) || (near_d > 420)) {
        return;
    }
    a.fire = 0.07;
    for (const side of [-1, 1]) {
        const ox = Math.cos(a.angle + Math.PI/2)*9*side;
        const oy = Math.sin(a.angle + Math.PI/2)*9*side;
        const spread = a.angle + (Math.random() - 0.5)*0.06;
        a.shots.push({x: c.x + ox + Math.cos(a.angle)*30, y: c.y + oy + Math.sin(a.angle)*30, vx: Math.cos(spread)*900, vy: Math.sin(spread)*900, life: 0.6});
    }
}

function menu_arcade_move(dt)
{
    const a = menu_arcade;
    const c = menu_arcade_centre;
    for (const f of a.foes) {
        const dx = c.x - f.x;
        const dy = c.y - f.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d > 150) {
            f.x += (dx/d)*f.speed*dt;
            f.y += (dy/d)*f.speed*dt;
        }
        else {
            f.x += ((-dy/d)*f.speed*f.orbit + (dx/d)*(d - 150))*dt;
            f.y += ((dx/d)*f.speed*f.orbit + (dy/d)*(d - 150))*dt;
        }
        f.r = Math.atan2(dy, dx) + Math.PI/2;
        f.hit = Math.max(0, f.hit - dt*6);
        f.fire -= dt;
        if ((f.fire <= 0) && (d < 380)) {
            f.fire = (f.elite ? 0.8 : 1.8) + Math.random();
            a.hostile_shots.push({x: f.x, y: f.y, vx: (dx/d)*260, vy: (dy/d)*260, life: 2});
        }
    }
    for (const s of a.shots) {
        s.x += s.vx*dt;
        s.y += s.vy*dt;
        s.life -= dt;
        const f = a.foes.find(v => (v.hp > 0) && (Math.hypot(s.x - v.x, s.y - v.y) < v.size*0.42));
        if (f) {
            s.life = 0;
            menu_arcade_hit(f, s);
        }
    }
    a.foes = a.foes.filter(v => (v.hp > 0) && (Math.hypot(v.x - c.x, v.y - c.y) < 700));
    a.shots = a.shots.filter(v => v.life > 0);
    for (const s of a.hostile_shots) {
        s.x += s.vx*dt;
        s.y += s.vy*dt;
        s.life -= dt;
        if (Math.hypot(s.x - c.x, s.y - c.y) < 62) {
            s.life = 0;
            menu_arcade_sparks(s.x, s.y, '#8fb8ff', 8);
        }
    }
    a.hostile_shots = a.hostile_shots.filter(v => v.life > 0);
    for (const p of a.sparks) {
        p.x += p.vx*dt;
        p.y += p.vy*dt;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.life -= dt*1.4;
    }
    a.sparks = a.sparks.filter(v => v.life > 0);
    for (const p of a.pops) {
        p.t += dt;
    }
    a.pops = a.pops.filter(v => v.t < 1);
    a.combo_timer -= dt;
    if (a.combo_timer <= 0) {
        a.combo = 1;
    }
    document.getElementById('menu_ascore').textContent = String(a.score).padStart(6, '0');
    document.getElementById('menu_acombo').textContent = `×${a.combo}`;
    document.getElementById('menu_awave').textContent = a.wave;
}

// A tracer hits: a spark; a kill: the combo, a pop-up, a blast, a shake, and every 14 kills a new wave
function menu_arcade_hit(f, s)
{
    const a = menu_arcade;
    f.hp -= 1;
    f.hit = 1;
    menu_arcade_sparks(s.x, s.y, '#bff9ff', 3);
    if (f.hp > 0) {
        return;
    }
    a.kills += 1;
    a.combo = Math.min(16, a.combo + 1);
    a.combo_timer = 2.2;
    const points = (f.elite ? 300 : 100)*a.combo;
    a.score += points;
    a.pops.push({x: f.x, y: f.y, t: 0, text: `+${points}`, color: f.elite ? '#ffcc4d' : '#ffffff'});
    menu_arcade_sparks(f.x, f.y, f.elite ? '#ff5d6c' : '#ffb35c', f.elite ? 40 : 26);
    a.shake = f.elite ? 0.25 : 0.12;
    document.getElementById('menu_acombo').animate([{transform: 'scale(1.35)'}, {transform: 'none'}], {duration: 160});
    if (a.kills % 14 === 0) {
        a.wave += 1;
        const banner = document.getElementById('menu_wave_banner');
        banner.querySelector('b').textContent = `WAVE ${a.wave}`;
        banner.animate([{opacity: 0, transform: 'scale(1.4)'}, {opacity: 1, transform: 'scale(1)', offset: 0.2}, {opacity: 1, offset: 0.75}, {opacity: 0, transform: 'scale(0.95)'}], {duration: 1500});
    }
}

function menu_arcade_sparks(x, y, color, count)
{
    for (let i = 0; i < count; ++i) {
        const angle = Math.random()*Math.PI*2;
        const speed = 60 + Math.random()*220;
        menu_arcade.sparks.push({x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, life: 0.5 + Math.random()*0.5, color: (Math.random() < 0.3) ? '#ffffff' : color, size: 1.5 + Math.random()*2.5});
    }
}

function menu_arcade_draw(dt)
{
    const a = menu_arcade;
    const c = menu_arcade_centre;
    const draw = document.getElementById('menu_arcade_canvas').getContext('2d');
    draw.setTransform(2, 0, 0, 2, 0, 0);
    draw.clearRect(0, 0, 720, 640);
    draw.save();
    if (a.shake > 0) {
        a.shake -= dt;
        draw.translate((Math.random() - 0.5)*8, (Math.random() - 0.5)*8);
    }
    draw.strokeStyle = `${a.level.color}55`;
    draw.lineWidth = 1.5;
    draw.beginPath();
    draw.arc(c.x, c.y, 62, 0, Math.PI*2);
    draw.stroke();
    draw.fillStyle = '#ff5d6c';
    draw.shadowColor = '#ff5d6c';
    draw.shadowBlur = 10;
    for (const s of a.hostile_shots) {
        draw.beginPath();
        draw.arc(s.x, s.y, 4, 0, Math.PI*2);
        draw.fill();
    }
    draw.strokeStyle = '#d9fdff';
    draw.lineWidth = 2.5;
    draw.shadowColor = '#6cf8ec';
    draw.shadowBlur = 12;
    for (const s of a.shots) {
        draw.beginPath();
        draw.moveTo(s.x, s.y);
        draw.lineTo(s.x - s.vx*0.022, s.y - s.vy*0.022);
        draw.stroke();
    }
    draw.shadowBlur = 0;
    for (const f of a.foes) {
        menu_arcade_draw_foe(draw, f);
    }
    for (const p of a.sparks) {
        draw.globalAlpha = Math.max(0, p.life);
        draw.fillStyle = p.color;
        draw.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
    draw.globalAlpha = 1;
    menu_arcade_draw_hero(draw, dt);
    draw.font = '700 16px "JetBrains Mono", monospace';
    draw.textAlign = 'center';
    for (const p of a.pops) {
        draw.globalAlpha = 1 - p.t;
        draw.fillStyle = p.color;
        draw.fillText(p.text, p.x, p.y - 30*p.t - 20);
    }
    draw.globalAlpha = 1;
    draw.restore();
}

function menu_arcade_draw_foe(draw, f)
{
    const image = menu_arcade.images[f.image];
    draw.save();
    draw.translate(f.x, f.y);
    draw.rotate(f.r);
    if (f.elite) {
        draw.shadowColor = '#ff4d5e';
        draw.shadowBlur = 18;
    }
    if (image.complete && image.naturalWidth) {
        draw.drawImage(image, -f.size/2, -f.size/2, f.size, f.size);
    }
    draw.restore();
    if (f.hit > 0) {
        draw.fillStyle = `rgba(255, 255, 255, ${f.hit*0.5})`;
        draw.beginPath();
        draw.arc(f.x, f.y, f.size*0.35, 0, Math.PI*2);
        draw.fill();
    }
}

// The ship; on a launch it boosts off the top with a trail
function menu_arcade_draw_hero(draw, dt)
{
    const a = menu_arcade;
    const c = menu_arcade_centre;
    let y = c.y;
    let angle = a.angle + Math.PI/2;
    if (a.launch >= 0) {
        a.launch += dt;
        const k = Math.min(1, a.launch);
        angle = 0;
        y = c.y - k*k*620;
        draw.strokeStyle = '#6cf8ec';
        draw.lineWidth = 14*(1 - k) + 2;
        draw.shadowColor = '#6cf8ec';
        draw.shadowBlur = 24;
        draw.beginPath();
        draw.moveTo(c.x, y + 40);
        draw.lineTo(c.x, c.y + 60);
        draw.stroke();
        draw.shadowBlur = 0;
    }
    draw.save();
    draw.translate(c.x, y);
    draw.rotate(angle);
    draw.shadowColor = '#6cf8ec';
    draw.shadowBlur = 20;
    if (a.hero.complete && a.hero.naturalWidth) {
        draw.drawImage(a.hero, -48, -48, 96, 96);
    }
    draw.restore();
}

// The menu shows again: the launch is over, and its first thing to do opens, so Enter plays it: Continue, or a new
// campaign
function menu_focus()
{
    document.getElementById('intro').classList.remove('launching');
    menu_launching = false;
    menu_arcade.launch = -1;
    menu_arcade.foes = [];
    const scene = el.continue_row.classList.contains('hidden') ? 'campaign' : 'continue';
    document.querySelector(`#menu_modes .mode[data-scene="${scene}"]`).focus();
    menu_scene(scene);
}
