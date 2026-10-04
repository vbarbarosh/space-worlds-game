// The main menu, from the designer's main-menu.html: the modes as one family of rows (Continue the big one), and on the
// right a scene for the mode you pick (a click, the arrow keys or its key): your ship orbiting the world you left, the
// route through the eight worlds, a live arcade demo, the save slots, the settings, the keys. A mode's click only picks
// it: the scene's own button, or Enter, plays.
const menu_arcade = {timer: 0, foes: [], score: 0, angle: 0, spawn: 0, fire: 0};
// the demo never has more raiders than this on its stage
const menu_arcade_foes_max = 8;
const menu_arcade_centre = {x: 360, y: 320};
let menu_scene_now = '';

for (const v of document.querySelectorAll('#menu_modes .mode')) {
    v.addEventListener('focus', () => menu_scene(v.dataset.scene));
    v.addEventListener('click', () => menu_scene(v.dataset.scene));
}
document.getElementById('menu_continue_go').addEventListener('click', menu_start_continue);
document.getElementById('menu_campaign_go').addEventListener('click', menu_start_campaign);
document.getElementById('menu_arcade_go').addEventListener('click', menu_start_arcade);
document.getElementById('menu_all_saves').addEventListener('click', () => saves_open('menu'));
document.getElementById('menu_volume').addEventListener('click', toggle_audio_settings);
addEventListener('keydown', on_menu_key);
menu_controls_fill();

// C, N, A, L, S and ? point at their mode; the arrows move between the modes; Enter presses the scene's button
function on_menu_key(event)
{
    if ((state !== 'menu') || settings_open || event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
    }
    const modes = Array.from(document.querySelectorAll('#menu_modes .mode')).filter(v => !v.classList.contains('hidden'));
    const i = modes.indexOf(document.activeElement);
    if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) {
        event.preventDefault();
        const step = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
        modes[(Math.max(0, i) + step + modes.length) % modes.length].focus();
        return;
    }
    if ((event.key === 'Enter') && ((i >= 0) || (document.activeElement === document.body))) {
        event.preventDefault();
        document.getElementById(`menu_${menu_scene_now}_go`)?.click();
        return;
    }
    const m = modes.find(v => v.dataset.key === event.key.toLowerCase());
    if (m) {
        event.preventDefault();
        m.focus();
    }
}

function menu_scene(name)
{
    if (name === menu_scene_now) {
        // back on the menu with the arcade scene showing: its demo starts again
        if (name === 'arcade') {
            menu_arcade_start();
        }
        return;
    }
    menu_scene_now = name;
    for (const v of document.querySelectorAll('#intro [data-scene]')) {
        v.classList.toggle('on', v.dataset.scene === name);
    }
    if (name === 'load') {
        menu_slots_render();
    }
    if (name === 'settings') {
        sync_settings_rows();
    }
    if (name === 'arcade') {
        menu_arcade_start();
    }
    else {
        menu_arcade_stop();
    }
}

// The game to continue: its card, its scene's line, and the art of its world and ship
function menu_continue_show(c)
{
    const ship = ship_catalog.find(v => v.id === c.fleet?.ship_id) || ship_catalog[0];
    set_hidden(el.continue_button, false);
    document.getElementById('continue_name').textContent = 'Continue campaign';
    document.getElementById('continue_detail').textContent = `${worlds[c.world].name} · ${ship.name} · ${c.visited?.length || 1}/${worlds.length} worlds`;
    document.getElementById('continue_title').textContent = `Back to ${worlds[c.world].name}`;
    document.getElementById('continue_line').textContent = `Your ${ship.name} is waiting in orbit. Story ${c.story || 0}/${story.length}.`;
    menu_art_sync(c.world, ship.id);
}

// An arcade run lost with a checkpoint: Continue retries its sector
function menu_continue_sector(wave)
{
    set_hidden(el.continue_button, false);
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
    for (const [id, url] of [['continue_planet', planet], ['menu_planet', planet], ['menu_station', station], ['menu_ship', ship_url], ['menu_traveller', ship_url], ['menu_hero', ship_url]]) {
        document.getElementById(id).src = url;
    }
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

// The arcade demo: raiders come in from the edges, the ship turns to the nearest and fires, the score runs. A timer
// drives it, not the frame loop (the dev page's clock takes the frame loop over)
function menu_arcade_start()
{
    if (menu_arcade.timer) {
        return;
    }
    menu_arcade.timer = setInterval(menu_arcade_tick, 33);
}

function menu_arcade_stop()
{
    clearInterval(menu_arcade.timer);
    menu_arcade.timer = 0;
    for (const v of menu_arcade.foes) {
        v.img.remove();
    }
    menu_arcade.foes = [];
}

function menu_arcade_tick()
{
    // the demo runs only while the menu shows it; a game started from the menu stops it
    if ((state !== 'menu') || (menu_scene_now !== 'arcade')) {
        menu_arcade_stop();
        return;
    }
    const dt = 0.033;
    const stage = document.getElementById('menu_arcade');
    const c = menu_arcade_centre;
    menu_arcade.spawn -= dt;
    if ((menu_arcade.spawn <= 0) && (menu_arcade.foes.length < menu_arcade_foes_max)) {
        menu_arcade.spawn = 0.3 + Math.random()*0.3;
        const a = Math.random()*Math.PI*2;
        const img = document.createElement('img');
        img.className = 'foe';
        img.alt = '';
        const names = ['enemy-chaser', 'enemy-shooter', 'enemy-lancer', 'enemy-shard'];
        const foe = sprite(`3d/${names[Math.floor(Math.random()*names.length)]}`);
        img.src = foe ? menu_sprite_url(new XMLSerializer().serializeToString(foe.svg)) : '';
        stage.append(img);
        menu_arcade.foes.push({img, x: c.x + Math.cos(a)*360, y: c.y + Math.sin(a)*324, hp: 3, v: 70 + Math.random()*50});
    }
    let near = null;
    let near_d = Infinity;
    for (const f of menu_arcade.foes) {
        const dx = c.x - f.x;
        const dy = c.y - f.y;
        const d = Math.hypot(dx, dy);
        if (d > 95) {
            f.x += (dx/d)*f.v*dt;
            f.y += (dy/d)*f.v*dt;
        }
        else {
            f.x += (-dy/d)*f.v*dt;
            f.y += (dx/d)*f.v*dt;
        }
        f.img.style.left = `${f.x}px`;
        f.img.style.top = `${f.y}px`;
        f.img.style.setProperty('--r', `${(Math.atan2(dy, dx)*180)/Math.PI + 90}deg`);
        if (d < near_d) {
            near_d = d;
            near = f;
        }
    }
    if (!near) {
        return;
    }
    const want = (Math.atan2(near.y - c.y, near.x - c.x)*180)/Math.PI + 90;
    const turn = ((want - menu_arcade.angle + 540) % 360) - 180;
    menu_arcade.angle += turn*Math.min(1, dt*8);
    document.getElementById('menu_hero').style.setProperty('--a', `${menu_arcade.angle}deg`);
    menu_arcade.fire -= dt;
    if ((menu_arcade.fire > 0) || (near_d > 330) || (Math.abs(turn) > 20)) {
        return;
    }
    menu_arcade.fire = 0.16;
    const a = Math.atan2(near.y - c.y, near.x - c.x);
    const zap = document.createElement('i');
    zap.className = 'zap';
    zap.style.left = `${c.x + Math.cos(a)*24}px`;
    zap.style.top = `${c.y + Math.sin(a)*24}px`;
    zap.style.width = `${near_d - 20}px`;
    zap.style.transform = `rotate(${a}rad)`;
    stage.append(zap);
    setTimeout(() => zap.remove(), 200);
    near.hp -= 1;
    if (near.hp > 0) {
        return;
    }
    const boom = document.createElement('i');
    boom.className = 'boom';
    boom.style.left = `${near.x}px`;
    boom.style.top = `${near.y}px`;
    stage.append(boom);
    setTimeout(() => boom.remove(), 500);
    near.img.remove();
    menu_arcade.foes.splice(menu_arcade.foes.indexOf(near), 1);
    menu_arcade.score += 150;
    document.getElementById('menu_ascore').textContent = String(menu_arcade.score).padStart(6, '0');
}

// The menu's first thing to do takes the focus, so Enter does it: Continue, or a new campaign
function menu_focus()
{
    document.getElementById(el.continue_button.classList.contains('hidden') ? 'start_button' : 'continue_button').focus();
}

function menu_start_continue()
{
    if (checkpoint) {
        set_pause_icon(false);
        reset_run(true);
    }
}

function menu_start_campaign()
{
    set_pause_icon(false);
    arcade_stop();
    reset_run();
}

function menu_start_arcade()
{
    set_pause_icon(false);
    arcade_start();
}
