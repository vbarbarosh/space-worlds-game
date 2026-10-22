function base_reset_run(resume = false)
{
    start_audio();
    document.body.classList.add('in-game');
    stop_turbo();
    touch_boost_hold = false;
    keys.clear();
    joystick.active = false;
    mouse_drive.active = false;
    mouse_drive.following = false;
    // a dock begun in the run before ends with it, and does not pull the new run's ship into a berth
    docking = null;
    pointer.last = -100;
    pointer.active = false;
    time = 0;
    shake = 0;
    flash = 0;
    freeze = 0;
    victory_timer = 0;
    enemies = [];
    bullets = [];
    hostile = [];
    particles = [];
    rings = [];
    pickups = [];
    labels = [];
    trail = [];
    hazards = [];
    pulse_clear();
    stasis_time = 0;
    drone_cd = 0;
    score = 0;
    kills = 0;
    wave = 1;
    combo = 1;
    combo_timer = 0;
    salvage = 0;
    artifacts_count = 0;
    run_time = 0;
    upgrades = initial_upgrades();
    supplies = {medkit: 2, emp: 1, stasis: 1};
    waypoints_clear();
    survey_robot = null;
    structures_leave();
    race_clear();
    let hp = hull_max();
    if (resume && checkpoint) {
        wave = checkpoint.wave;
        score = checkpoint.score;
        kills = checkpoint.kills;
        salvage = checkpoint.salvage;
        artifacts_count = checkpoint.artifacts_count;
        run_time = checkpoint.run_time;
        upgrades = {...initial_upgrades(), ...checkpoint.upgrades};
        supplies = {...checkpoint.supplies};
        difficulty = checkpoint.difficulty;
        hp = checkpoint.hp;
    }
    for (const v of document.querySelectorAll('[data-mode]')) {
        v.classList.toggle('selected', v.dataset.mode === difficulty);
    }
    sync_mode_note();
    player = {
        x: W/2,
        y: H/2,
        vx: 0,
        vy: 0,
        angle: -Math.PI/2,
        hp,
        energy: (resume && checkpoint) ? checkpoint.energy : 35,
        dash_cd: 0,
        dash_time: 0,
        turbo_fuel: turbo_duration(),
        turbo_active: false,
        turret_angle: -Math.PI/2,
        invincible: 2.4,
        dash_grace: 0,
        shoot_cd: 0,
        gun_cd: [],
        r: current_ship().radius,
        shield: shield_max(),
        since_hit: 8,
        portal_cd: 0,
    };
    for (const v of [el.intro, el.pause_overlay, el.upgrade_overlay, el.inventory_overlay, el.result_overlay, el.bossbar]) {
        set_hidden(v, true);
    }
    for (const v of [el.hud, el.bottom_hud, el.pause_button, el.touch_buttons, el.mission, el.loadout, el.inventory_button]) {
        set_hidden(v, false);
    }
    state = 'playing';
    set_pause_icon(false);
    begin_wave();
    save_checkpoint();
    update_hud();
    canvas.focus();
}

function begin_wave()
{
    wave = worlds[campaign.world].wave;
    phase_index = 3;
    phase_timer = 0;
    wave_timer = 0;
    spawn_left = 0;
    spawn_timer = 100000;
    boss_spawned = false;
    boss_defeated = false;
    drop_timer = 14;
    hazard_timer = 12;
    hazards = [];
    pulse_clear();
    generate_map();
    player.x = station.x + station_size/2 + 60;
    player.y = station.y;
    player.vx = 0;
    player.vy = 0;
    player.portal_cd = 3;
    mouse_drive.active = false;
    mouse_drive.following = false;
    update_camera(0, true);
    set_hidden(el.bossbar, true);
    // the Races mode names the course on its own banner (race_mode_start)
    if (!race_mode.active) {
        show_world_arrival(worlds[campaign.world].name);
    }
}

function start_phase()
{
    phase_index++;
    phase_timer = 0;
    phase_spawning = true;
    spawn_left = current_sector().count + (phase_index - 1)*2;
    spawn_timer = 1.3;
    if (phase_index > 1) {
        show_toast(`WAVE ${phase_index} / 3`, current_sector().name, 1.7);
        ring(player.x, player.y, blue, 100, 0.6);
    }
    if (current_sector().boss && (phase_index === 3)) {
        spawn_enemy('boss');
        boss_spawned = true;
        set_hidden(el.bossbar, false);
        el.bossbar.querySelector('.meter-row').textContent = current_sector().boss;
        show_toast(current_sector().boss, 'GUARDIAN SIGNAL / KEEP MOVING', 3);
    }
}

function enemy_type()
{
    const n = Math.random();
    let sum = 0;
    const types = ['chaser', 'tank', 'shooter', 'splitter', 'lancer'];
    for (let i = 0; i < types.length; ++i) {
        sum += current_sector().mix[i];
        if (n < sum) {
            return types[i];
        }
    }
    return 'chaser';
}

function base_spawn_enemy(type)
{
    let x;
    let y;
    const radius = Math.max(330, Math.min(W, H)*0.55) + rand(120, 230);
    let found = false;
    // never inside a black hole's radius and a half: a raider there was pulled to the core and lost before it fought
    // (the arcade's Eclipse, with you beside the hole, lost flagships so in 2 s)
    for (let i = 0; i < 24; ++i) {
        const a = rand(0, Math.PI*2);
        x = player.x + Math.cos(a)*radius;
        y = player.y + Math.sin(a)*radius;
        if ((x > 60) && (x < world.w - 60) && (y > 60) && (y < world.h - 60) && black_holes.every(v => Math.hypot(v.x - x, v.y - y) > v.radius*1.5)) {
            found = true;
            break;
        }
    }
    if (!found) {
        const a = Math.atan2(world.h/2 - player.y, world.w/2 - player.x);
        x = clamp(player.x + Math.cos(a)*radius, 65, world.w - 65);
        y = clamp(player.y + Math.sin(a)*radius, 65, world.h - 65);
    }
    const hp =
        (type === 'boss')
            ? [0, 3200, 8200, 15500][Math.floor(wave/5)]
            : (type === 'tank')
                ? 80 + wave*13
                : (type === 'shooter')
                    ? 38 + wave*9
                    : (type === 'splitter')
                        ? 52 + wave*10
                        : (type === 'lancer')
                            ? 35 + wave*9
                            : (type === 'shard')
                                ? 12 + wave*3
                                : 22 + wave*7;
    const enemy = {
        x,
        y,
        type,
        hp,
        max_hp: hp,
        r: (type === 'boss') ? 85 : (type === 'tank') ? 23 : (type === 'shooter') ? 17 : 13,
        speed:
            (type === 'tank')
                ? 53 + wave*2
                : (type === 'shooter')
                    ? 70 + wave*2
                    : (type === 'boss')
                        ? 45
                        : (type === 'lancer')
                            ? 100
                            : (type === 'shard')
                                ? 150 + wave*3
                                : 90 + wave*5,
        angle: 0,
        phase: rand(0, 6.28),
        fire_cd: rand(0.7, 2.3),
        flash: 0,
        age: 0,
        charge_cd: rand(2, 4),
        charge_time: 0,
        charge_angle: 0,
        child: type === 'shard',
        // every field a raider gets later, here at the value that reads as not set, so all raiders keep one shape and
        // the loops over them read their numbers without boxing them: the world's (spawn_enemy), an attack run's
        // (update; Infinity is a count not started), a gate's, the pulse's push, the hit marks, the arcade's (scale,
        // elite, squadron, pack, job, event), and the campaign's (operations, escorts, the survey robot, structures, the lure)
        color: null,
        armor: 0,
        max_shield: 0,
        shield: 0,
        since_hit: 0,
        weapon: null,
        gun_cd: 0,
        run_cd: Infinity,
        run_time: 0,
        portal_cd: 0,
        push_vx: 0,
        push_vy: 0,
        shield_flash: 0,
        wound_timer: 0,
        disrupted: null,
        core_kill: false,
        careless: false,
        arcade_scaled: false,
        elite: false,
        marksman: false,
        drop_on_death: null,
        overdrive: false,
        guard: null,
        guard_offset: null,
        lurk: false,
        pack: null,
        job: null,
        unarmed: false,
        event_kind: null,
        event_goal: null,
        operation_id: null,
        operation_stage: null,
        escort_raider: false,
        robot_raider: false,
        structure_target: null,
        mission_boss: null,
        leviathan: false,
        duel_owner: null,
    };
    if (difficulty === 'chill') {
        enemy.speed *= 0.8;
        enemy.hp *= 0.8;
        enemy.max_hp = enemy.hp;
    }
    if (difficulty === 'overload') {
        enemy.speed *= 1.2;
        enemy.hp *= 1.15;
        enemy.max_hp = enemy.hp;
    }
    enemies.push(enemy);
    ring(x, y, (type === 'boss') ? pink : blue, 50, 0.6);
}

function ring(x, y, color, max_r, duration)
{
    rings.push({x, y, color, max_r, life: duration, total: duration});
}

function burst(x, y, color, count, speed = 170)
{
    for (let i = 0, end = Math.round(count*(full_fx ? 1 : 0.45)); i < end; ++i) {
        const a = rand(0, Math.PI*2);
        const v = rand(speed*0.2, speed);
        particles.push({x, y, vx: Math.cos(a)*v, vy: Math.sin(a)*v, life: rand(0.25, 0.85), total: 0.85, color, size: rand(1, 3.5)});
    }
    if (particles.length > 600) {
        particles.splice(0, particles.length - 600);
    }
}

// A line of text that rises from a point and fades in a second. One close by joins it rather than pile on: the same
// text starts its second again, an amount of the same thing adds up (+6 and +4 make +10, ◆ +4 and ◆ +6 make ◆ +10);
// another text stands a line above the ones there. 24 at most, the oldest goes.
function label(x, y, text, color = cyan)
{
    const amount = /^(\D*?)\+(\d+)(\D*)$/.exec(text);
    for (const v of labels) {
        if ((v.life < 0.5) || (Math.abs(v.x - x) > 90) || (Math.abs(v.y - y) > 60)) {
            continue;
        }
        if (amount && v.amount && (v.amount.head === amount[1]) && (v.amount.tail === amount[3])) {
            v.amount.n += Number(amount[2]);
            v.text = `${amount[1]}+${v.amount.n}${amount[3]}`;
            v.life = 1;
            return;
        }
        if (!amount && (v.text === text)) {
            v.life = 1;
            return;
        }
    }
    let top = y;
    for (let moved = true; moved;) {
        moved = false;
        for (const v of labels) {
            if ((Math.abs(v.x - x) < 70) && (Math.abs(v.y - top) < 14)) {
                top = v.y - 16;
                moved = true;
            }
        }
    }
    labels.push({x, y: top, text, color, life: 1, amount: amount ? {head: amount[1], n: Number(amount[2]), tail: amount[3]} : null});
    if (labels.length > 24) {
        labels.shift();
    }
}

function base_damage_enemy(enemy, damage)
{
    if (enemy.hp <= 0) {
        return;
    }
    enemy.hp -= damage;
    enemy.flash = 0.08;
    if (enemy.hp > 0) {
        return;
    }
    kills++;
    play_log_kill(enemy);
    combo = (combo_timer > 0) ? Math.min(8, combo + 1) : 1;
    combo_timer = 4;
    const chain = pulse_score_scale();
    // an arcade raider with a job scores by its kind (raider_kind_points)
    const points = Math.round((raider_kind_points(enemy) ?? ((enemy.type === 'boss') ? 5000 : (enemy.type === 'tank') ? 140 : (enemy.type === 'shooter') ? 100 : (enemy.type === 'splitter') ? 110 : 80))*combo*chain);
    score += points;
    burst(
        enemy.x,
        enemy.y,
        (enemy.type === 'boss') ? pink : (enemy.type === 'shooter') ? gold : pink,
        (enemy.type === 'boss') ? 100 : 24,
        (enemy.type === 'boss') ? 450 : 190
    );
    ring(enemy.x, enemy.y, (enemy.type === 'shooter') ? gold : pink, enemy.r*3, 0.35);
    label(enemy.x, enemy.y - 10, `+${points}`, (chain > 1) ? gold : cyan);
    shake = Math.max(shake, arcade.active ? arcade_kill_shake(enemy) : ((enemy.type === 'boss') ? 22 : 4));
    if ((enemy.type === 'boss') || (enemy.type === 'tank') || enemy.elite) {
        hit_stop_start((enemy.type === 'boss') ? 0.12 : 0.05);
    }
    if (arcade.active && (enemy.type === 'boss')) {
        arcade.slowmo = 1.4;
    }
    sfx('kill', (enemy.type === 'boss') ? 1 : 0.55, enemy);
    hull_break_enemy(enemy);
    if (enemy.type === 'boss') {
        explode_flagship(enemy.x, enemy.y, enemy.r, enemy.color || pink);
    }
    else {
        explode(enemy.x, enemy.y, {shard: 26, tank: 72, splitter: 48, lancer: 48, shooter: 46, drone: 20, carrier: 74, bulwark: 70}[enemy.type] || 40, enemy.color || pink);
    }
    if (enemy.drop_on_death) {
        drop_pickup(enemy.x, enemy.y, enemy.drop_on_death);
    }
    if (arcade.active) {
        arcade_blast_from_kill(enemy);
        arcade_event_kill(enemy);
        raider_job_kill(enemy);
    }
    if (enemy.type === 'boss') {
        boss_defeated = true;
        hostile = [];
        flash = 0.5;
        set_hidden(el.bossbar, true);
        sfx('win');
        show_toast('GUARDIAN BROKEN', 'CLEAR THE REMAINING SIGNALS', 2);
        for (let i = 0; i < 12; ++i) {
            drop_pickup(enemy.x + rand(-50, 50), enemy.y + rand(-50, 50), 'artifact', 10);
        }
    }
    // a carrier's drone drops nothing: its carrier carries the salvage (raider_job_kill)
    else if (!raider_job_bare(enemy)) {
        if (enemy.type === 'splitter') {
            for (let i = 0; i < 2; ++i) {
                spawn_enemy('shard');
                const child = enemies[enemies.length - 1];
                child.x = enemy.x + rand(-15, 15);
                child.y = enemy.y + rand(-15, 15);
            }
        }
        if (!enemy.child && (Math.random() < 0.76*arcade_kill_drop_k())) {
            drop_pickup(enemy.x, enemy.y, 'artifact', 2 + Math.floor(threat_wave()/4));
        }
        const drop = Math.random();
        if ((drop < 0.1) && repair_drop_allowed()) {
            drop_pickup(enemy.x, enemy.y, 'health');
        }
        else if (drop < 0.22) {
            drop_pickup(enemy.x, enemy.y, 'energy');
        }
        else if ((drop < 0.24) && !enemy.child) {
            drop_pickup(enemy.x, enemy.y, repair_drop_allowed() ? ['medkit', 'emp', 'stasis'][Math.floor(rand(0, 3))] : ['emp', 'stasis'][Math.floor(rand(0, 2))]);
        }
    }
}

// What a ship crashes into: a raider's ram, a rock, debris, a cliff's falling rock. A crash goes past the shield, straight
// to the hull; shots, missiles, blasts and the rest hit the shield first (the author, 2026-10-19: "if I crash into
// something, the shield won't help")
const damage_crashes = new Set(['ram', 'rock', 'debris', 'rockfall']);

// blast: a missile's wave or a ship's explosion, which a dash's grace (dash_grace, the arcade's) does not cover; cause
// and by, what hit you and the shot or raider that did, go to the play log (play_log_hurt)
function damage_player(amount, blast = false, cause = 'other', by = null)
{
    // on a Turbo race's track the ship cannot steer round a drifting rock, so none costs it anything
    if ((player.invincible > 0) || ((player.dash_grace > 0) && !blast) || (state !== 'playing') || race_rail_riding() || arcade_hit_held(cause, by)) {
        return;
    }
    const multiplier = (difficulty === 'chill') ? 0.65 : (difficulty === 'overload') ? 1.2 : 1;
    // a crowd's hits come smaller and closer together in the arcade (arcade_crowds.js), and shake the view less
    const share = arcade_hit_share(cause, by);
    let damage = amount*multiplier*share*(1 - upgrades.armor*armor_cut())*arcade_card_k.taken;
    player.since_hit = 0;
    const shield_before = player.shield;
    const absorbed = damage_crashes.has(cause) ? 0 : Math.min(player.shield, damage);
    player.shield -= absorbed;
    shield_hit_show(player, shield_before);
    damage -= absorbed;
    const hull_before = player.hp;
    player.hp = Math.max(0, player.hp - damage);
    play_log_hurt(cause, absorbed, damage, by);
    race_crash_note(cause, absorbed + hull_before - player.hp);
    player.invincible = arcade_hit_safe(cause, by);
    shake = 16*share;
    // a hit on the hull reddens the screen's edge; one the shield took tints it as before
    if (damage > 0) {
        hurt = hurt_duration;
    }
    else {
        flash = 0.32;
    }
    combo = 1;
    combo_timer = 0;
    burst(player.x, player.y, absorbed ? blue : cyan, 26, 210);
    sfx('hit');
    // an arcade card's second wind turns one such hit a world into 30% hull (arcade_cards.js)
    if ((player.hp <= 0) && !arcade_cards_second_wind()) {
        finish(false);
    }
}

function pulse()
{
    // the Races mode has no pulse: it would make you crash-proof for a moment (race-mode.css hides its gauge)
    if ((state !== 'playing') || (player.energy < 100) || race_mode.active) {
        return;
    }
    player.energy = 0;
    player.invincible = 0.75;
    play_log_pulse();
    shake = Math.max(shake, 10);
    // nothing is hit here: the ring travels and hits each target as its front reaches it (src/js/pulse.js)
    pulse_fire(player.x, player.y);
    sfx('pulse');
    show_toast('PULSE RELEASED', 'THE STORM BENDS TO YOU', 1.1);
}

function physics_base_fire(mount = null)
{
    fire_equipped_weapon(mount);
}

// Where on its last step, from (px, py) to where it is now, a raider's shot first came within `reach` of v's middle: 0
// at the step's start, 1 at its end, -1 when it never did. A fast slug flies farther in a frame than a small hull is
// wide, so the step is checked, not where it ended.
function hostile_shot_contact(b, v, reach)
{
    const ox = b.px - v.x;
    const oy = b.py - v.y;
    const c = ox*ox + oy*oy - reach*reach;
    if (c <= 0) {
        return 0;
    }
    const dx = b.x - b.px;
    const dy = b.y - b.py;
    const a = dx*dx + dy*dy;
    const half = ox*dx + oy*dy;
    const disc = half*half - a*c;
    if (!a || (half >= 0) || (disc < 0)) {
        return -1;
    }
    const t = (-half - Math.sqrt(disc))/a;
    return (t <= 1) ? t : -1;
}
