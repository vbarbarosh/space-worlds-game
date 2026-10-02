// Enemies tab: spawn any type ahead of the ship; a target dummy stands still, never fires, and counts the damage it takes.
const dev_enemy_type_options = [
    {value: 'chaser', label: 'Chaser'},
    {value: 'tank', label: 'Tank'},
    {value: 'shooter', label: 'Shooter'},
    {value: 'splitter', label: 'Splitter'},
    {value: 'lancer', label: 'Lancer'},
    {value: 'boss', label: 'Boss'},
];
const dev_dummy_hp = 100000;
const dev_meter_window_ms = 3000;
let dev_damage_events = [];

function dev_enemy_spawn(dummy)
{
    if (!dev_run_active()) {
        return;
    }
    const type = document.getElementById('dev_enemy_type').value;
    const distance = Number(document.getElementById('dev_enemy_distance').value);
    const enemy = spawn_enemy(type);
    enemy.x = clamp(player.x + Math.cos(player.angle)*distance, 30, world.w - 30);
    enemy.y = clamp(player.y + Math.sin(player.angle)*distance, 30, world.h - 30);
    if (dummy) {
        enemy.dev_dummy = true;
        enemy.dev_x = enemy.x;
        enemy.dev_y = enemy.y;
        enemy.speed = 0;
        enemy.hp = dev_dummy_hp;
        enemy.max_hp = dev_dummy_hp;
        enemy.dev_total = enemy.hp + (enemy.shield || 0);
    }
}

function dev_enemies_clear()
{
    enemies = [];
    hostile = [];
    dev_damage_events = [];
}

// Dummies are held in place and disarmed every frame; their hp and shield drop is the damage dealt.
function dev_enemies_after_frame()
{
    for (const enemy of enemies) {
        if (!enemy.dev_dummy) {
            continue;
        }
        enemy.x = enemy.dev_x;
        enemy.y = enemy.dev_y;
        enemy.fire_cd = 1e9;
        enemy.gun_cd = 1e9;
        enemy.charge_cd = 1e9;
        const total = enemy.hp + (enemy.shield || 0);
        if (total < enemy.dev_total) {
            dev_damage_events.push({time: dev_time.virtual, amount: enemy.dev_total - total});
        }
        if (enemy.hp < dev_dummy_hp/2) {
            enemy.hp = dev_dummy_hp;
        }
        enemy.dev_total = enemy.hp + (enemy.shield || 0);
    }
}

function dev_enemies_refresh_meter()
{
    const since = dev_time.virtual - dev_meter_window_ms;
    dev_damage_events = dev_damage_events.filter(v => v.time >= since);
    let damage = 0;
    for (const event of dev_damage_events) {
        damage += event.amount;
    }
    const dummies = enemies.filter(v => v.dev_dummy).length;
    const dps = Math.round(damage/(dev_meter_window_ms/1000));
    const text = dummies ? `Damage per second: ${dps} · hits in the last 3 s: ${dev_damage_events.length} · dummies: ${dummies}` : 'No target dummy yet.';
    document.getElementById('dev_meter').textContent = text;
}
