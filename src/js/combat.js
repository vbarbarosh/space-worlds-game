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
        shoot_cd: 0,
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
    el.pause_button.textContent = 'Ⅱ';
    begin_wave();
    save_checkpoint();
    update_hud();
    canvas.focus();
}

function show_toast(title, sub, duration = 2.5)
{
    el.toast_title.textContent = title;
    el.toast_sub.textContent = sub;
    el.toast.classList.add('show');
    toast_timer = duration;
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
    generate_map();
    player.x = station.x + 185;
    player.y = station.y;
    player.vx = 0;
    player.vy = 0;
    player.portal_cd = 3;
    mouse_drive.active = false;
    mouse_drive.following = false;
    update_camera(0, true);
    set_hidden(el.bossbar, true);
    show_world_arrival(worlds[campaign.world].name);
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
    for (let i = 0; i < 12; ++i) {
        const a = rand(0, Math.PI*2);
        x = player.x + Math.cos(a)*radius;
        y = player.y + Math.sin(a)*radius;
        if ((x > 60) && (x < world.w - 60) && (y > 60) && (y < world.h - 60)) {
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
        r: (type === 'boss') ? 55 : (type === 'tank') ? 23 : (type === 'shooter') ? 17 : 13,
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

function label(x, y, text, color = cyan)
{
    labels.push({x, y, text, color, life: 1});
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
    combo = (combo_timer > 0) ? Math.min(8, combo + 1) : 1;
    combo_timer = 4;
    const points = ((enemy.type === 'boss') ? 5000 : (enemy.type === 'tank') ? 140 : (enemy.type === 'shooter') ? 100 : (enemy.type === 'splitter') ? 110 : 80)*combo;
    score += points;
    player.energy = Math.min(100, player.energy + 4 + upgrades.pulse);
    burst(
        enemy.x,
        enemy.y,
        (enemy.type === 'boss') ? pink : (enemy.type === 'shooter') ? gold : pink,
        (enemy.type === 'boss') ? 100 : 24,
        (enemy.type === 'boss') ? 450 : 190
    );
    ring(enemy.x, enemy.y, (enemy.type === 'shooter') ? gold : pink, enemy.r*3, 0.35);
    label(enemy.x, enemy.y - 10, `+${points}`);
    shake = Math.max(shake, arcade.active ? arcade_kill_shake(enemy) : ((enemy.type === 'boss') ? 22 : 4));
    if (arcade.active && (enemy.type === 'boss')) {
        arcade.slowmo = 1.4;
    }
    sfx('kill', 1, enemy);
    if (enemy.type === 'boss') {
        explode_flagship(enemy.x, enemy.y, enemy.r, enemy.color || pink);
    }
    else {
        explode(enemy.x, enemy.y, {shard: 26, tank: 72, splitter: 48, lancer: 48, shooter: 46}[enemy.type] || 40, enemy.color || pink);
    }
    if (enemy.drop_on_death) {
        drop_pickup(enemy.x, enemy.y, enemy.drop_on_death);
    }
    if (arcade.active) {
        arcade_blast_from_kill(enemy);
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
    else {
        if (enemy.type === 'splitter') {
            for (let i = 0; i < 2; ++i) {
                spawn_enemy('shard');
                const child = enemies[enemies.length - 1];
                child.x = enemy.x + rand(-15, 15);
                child.y = enemy.y + rand(-15, 15);
            }
        }
        if (!enemy.child && (Math.random() < 0.76)) {
            drop_pickup(enemy.x, enemy.y, 'artifact', 2 + Math.floor(wave/4));
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

function damage_player(amount)
{
    if ((player.invincible > 0) || (state !== 'playing')) {
        return;
    }
    const multiplier = (difficulty === 'chill') ? 0.65 : (difficulty === 'overload') ? 1.2 : 1;
    let damage = amount*multiplier*(1 - upgrades.armor*((campaign.world === 4) ? 0.15 : 0.12));
    player.since_hit = 0;
    const shield_before = player.shield;
    const absorbed = Math.min(player.shield, damage);
    player.shield -= absorbed;
    shield_hit_show(player, shield_before);
    damage -= absorbed;
    player.hp = Math.max(0, player.hp - damage);
    player.invincible = 0.85;
    shake = 16;
    flash = 0.32;
    combo = 1;
    combo_timer = 0;
    burst(player.x, player.y, absorbed ? blue : cyan, 26, 210);
    sfx('hit');
    if (player.hp <= 0) {
        finish(false);
    }
}

function pulse()
{
    if ((state !== 'playing') || (player.energy < 100)) {
        return;
    }
    player.energy = 0;
    player.invincible = 0.75;
    shake = 18;
    flash = 0.15;
    ring(player.x, player.y, cyan, Math.max(W, H), 0.65);
    ring(player.x, player.y, pink, Math.max(W, H)*0.8, 0.7);
    burst(player.x, player.y, cyan, 65, 500);
    hostile = [];
    for (const enemy of enemies.slice()) {
        if (distance(enemy, player) < 480 + upgrades.pulse*80) {
            damage_enemy(enemy, (enemy.type === 'boss') ? 320 + upgrades.pulse*120 : 140 + upgrades.pulse*60);
        }
    }
    sfx('pulse');
    show_toast('PULSE RELEASED', 'THE STORM BENDS TO YOU', 1.1);
}

function physics_base_fire()
{
    fire_equipped_weapon();
}

function base_enemy_fire(enemy, angle, speed = 210)
{
    hostile.push({
        x: enemy.x + Math.cos(angle)*enemy.r,
        y: enemy.y + Math.sin(angle)*enemy.r,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed,
        life: 6,
        r: 5,
    });
}
