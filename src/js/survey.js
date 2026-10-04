// Survey robot: a scan stage is no longer standing in a circle. Close to the beacon you launch a robot; it flies to the
// beacon and scans, and raiders come for it, not for you. It works only while you are within cover range, so you guard
// it in the field. Destroyed, it sets the scan back by a third and another launches a few seconds later.
let survey_robot = null;
const survey_launch_range = 450;
const survey_cover_range = 600;

// A scan stage's work this frame: m the contract, point its beacon, d your distance to it
function survey_update(m, point, d, dt)
{
    if (survey_robot && ((survey_robot.contract_id !== m.id) || (survey_robot.stage !== m.stage_index))) {
        survey_robot = null;
    }
    m.relaunch = Math.max(0, (m.relaunch || 0) - dt);
    if (!survey_robot) {
        if ((d < survey_launch_range) && !m.relaunch) {
            survey_launch(m, point);
        }
        return;
    }
    const robot = survey_robot;
    if (robot.state === 'flying') {
        const dx = point.x - robot.x;
        const dy = point.y - robot.y;
        const left = Math.hypot(dx, dy);
        robot.angle = Math.atan2(dy, dx);
        if (left < 20) {
            robot.state = 'scanning';
        }
        else {
            const step = Math.min(left, 220*dt);
            robot.x += (dx/left)*step;
            robot.y += (dy/left)*step;
        }
    }
    robot.covered = distance(player, robot) < survey_cover_range;
    if ((robot.state === 'scanning') && robot.covered) {
        robot.angle += dt*0.8;
        const pressed = enemies.some(v => (v.hp > 0) && (distance(v, robot) < 240));
        mission_event('scan', dt*(pressed ? 0.3 : 1), {contract_id: m.id});
        // the scan charts the area round the beacon
        chart_reveal(point, chart_home());
    }
    m.wave_clock = (m.wave_clock ?? 12) - dt;
    if ((m.wave_clock <= 0) && (robot.state === 'scanning')) {
        m.wave_clock = 12;
        if (enemies.filter(v => (v.hp > 0) && v.robot_raider).length < 6) {
            survey_raiders(m, 2);
        }
    }
    survey_damage(dt);
    if (robot.hp <= 0) {
        explode(robot.x, robot.y, 30, cyan);
        survey_robot = null;
        m.progress = Math.round(m.progress*0.67*10)/10;
        m.relaunch = 5;
        show_toast('SURVEY ROBOT LOST', 'SCAN SET BACK A THIRD · ANOTHER LAUNCHES IN 5 s', 3);
    }
}

function survey_launch(m, point)
{
    survey_robot = {contract_id: m.id, stage: m.stage_index, x: player.x, y: player.y, angle: Math.atan2(point.y - player.y, point.x - player.x), hp: 80, max_hp: 80, state: 'flying', covered: true};
    show_toast('SURVEY ROBOT LAUNCHED', `GUARD IT WHILE IT SCANS · STAY WITHIN ${survey_cover_range} m`, 3);
    survey_raiders(m, 2);
    m.wave_clock = 12;
}

// Raiders sent for the robot
function survey_raiders(m, count)
{
    for (let i = 0; i < count; ++i) {
        const enemy = spawn_operation_enemy(m, (i % 2) ? 'shooter' : 'chaser', operation_point(m));
        enemy.robot_raider = true;
    }
}

function survey_damage(dt)
{
    const v = survey_robot;
    for (const b of hostile) {
        if ((b.life > 0) && (distance(b, v) < b.r + 14)) {
            v.hp -= b.damage || 13;
            b.life = 0;
            explode(b.x, b.y, 6, '#bfe4ff', 0, 'muzzle');
        }
    }
    for (const e of enemies) {
        if ((e.hp > 0) && (distance(e, v) < e.r + 14)) {
            v.hp -= 30*dt;
        }
    }
}

// The robot: the drone drawing in cyan, a sweep turning while it scans, its hull, and what it is doing
function render_survey_robot()
{
    const v = survey_robot;
    if (!v || !in_view(v, 200)) {
        return;
    }
    ctx.save();
    if (v.state === 'scanning') {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(v.x, v.y, 10, v.x, v.y, 150);
        g.addColorStop(0, '#6cf8ec44');
        g.addColorStop(1, '#6cf8ec00');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.arc(v.x, v.y, 150, v.angle*3, v.angle*3 + 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }
    if (!sprite_draw('drones/survey-robot', cyan, 34, v.x, v.y, v.angle)) {
        polygon(v.x, v.y, 14, 4, v.angle, cyan, '#142c35');
    }
    ctx.fillStyle = '#0b1222';
    ctx.fillRect(v.x - 22, v.y - 30, 44, 4);
    ctx.fillStyle = (v.hp < v.max_hp*0.35) ? pink : cyan;
    ctx.fillRect(v.x - 22, v.y - 30, (44*Math.max(0, v.hp))/v.max_hp, 4);
    ctx.font = '10px ui-monospace,monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = cyan;
    const status = (v.state === 'flying') ? 'ON ITS WAY' : v.covered ? 'SCANNING' : 'WAITING FOR COVER';
    ctx.fillText(`SURVEY ROBOT · ${status}`, v.x, v.y + 34);
    ctx.restore();
}
