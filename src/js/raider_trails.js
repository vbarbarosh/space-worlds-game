// A raider in view leaves a short trail from its engines in its own colour, a third of a second long, fading behind it,
// so how each one flies (a dive, a circle, a charge) reads at a glance. Points are taken 30 times a second of the
// game's time from the raiders in view and kept by raider; a frame draws them in three steps of fading, one stroke a
// step and colour for all the raiders at once.
const raider_trail_span = 0.35;
const raider_trail_steps = 3;
// farther than this between two points 1/30 s apart (7,500 units a second) is a jump, not flight
const raider_trail_jump = 250;
let raider_trail_clock = 0;
let raider_trail_due = 0;
const raider_trails = new WeakMap();
// a drawing's engine point behind its middle, by name and length
const raider_trail_engines = new Map();

function update_raider_trails(dt)
{
    raider_trail_clock += dt;
    raider_trail_due -= dt;
    if (raider_trail_due > 0) {
        return;
    }
    raider_trail_due = 1/30;
    for (let i = 0; i < enemies.length; ++i) {
        const enemy = enemies[i];
        if ((enemy.hp <= 0) || !in_view(enemy, 300)) {
            raider_trails.delete(enemy);
            continue;
        }
        let v = raider_trails.get(enemy);
        if (!v) {
            v = {points: []};
            raider_trails.set(enemy, v);
        }
        const engine = raider_trail_engine(enemy);
        // a raider that jumped (a blink, a warp in, a move by the game) starts a new trail where it is: no streak
        // across the screen
        const last = v.points[v.points.length - 1];
        if (last && (Math.abs(engine.x - last.x) + Math.abs(engine.y - last.y) > raider_trail_jump)) {
            v.points.length = 0;
        }
        v.points.push({x: engine.x, y: engine.y, t: raider_trail_clock});
        while (v.points.length && (raider_trail_clock - v.points[0].t > raider_trail_span)) {
            v.points.shift();
        }
    }
}

// The raider's engine in the world: behind its middle, where the drawing's main flames start
function raider_trail_engine(enemy)
{
    const art = enemy_sprite(enemy);
    const key = `${art.name}:${art.length}`;
    let back = raider_trail_engines.get(key);
    if (back === undefined) {
        const flames = sprite(art.name) ? sprite_anchors(art.name, art.length).flames.main : [];
        back = flames.length ? flames.reduce((a, f) => a + f.x, 0)/flames.length : -art.length*0.4;
        raider_trail_engines.set(key, back);
    }
    const angle = raider_draw_angle(enemy);
    return {x: enemy.x + Math.cos(angle)*back, y: enemy.y + Math.sin(angle)*back};
}

// The way a raider's hull is drawn turned (render_enemies): a charging lancer along its charge
function raider_draw_angle(enemy)
{
    return ((enemy.type === 'lancer') && (enemy.charge_time > 0)) ? enemy.charge_angle : enemy.angle;
}

// How fast a raider was going, from its trail (units a second); still when it has none
function raider_trail_velocity(enemy)
{
    const v = raider_trails.get(enemy);
    if (!v || (v.points.length < 2)) {
        return {x: 0, y: 0};
    }
    const a = v.points[v.points.length - 2];
    const b = v.points[v.points.length - 1];
    const dt = Math.max(1/60, b.t - a.t);
    return {x: (b.x - a.x)/dt, y: (b.y - a.y)/dt};
}

// Drawn in world units, under the hulls (render_enemies): the newest part brightest and widest
function render_raider_trails()
{
    const groups = new Map();
    for (let i = 0; i < enemies.length; ++i) {
        const enemy = enemies[i];
        const v = (enemy.hp > 0) && raider_trails.get(enemy);
        if (!v || (v.points.length < 2)) {
            continue;
        }
        // grouped by colour and width: a flagship's trail is wider than its escorts'
        const color = enemy.color || pink;
        const width = Math.max(1, Math.round(enemy.r*((enemy.type === 'boss') ? 0.3 : 0.45)));
        const key = `${color}:${width}`;
        let group = groups.get(key);
        if (!group) {
            group = {color, width, items: []};
            groups.set(key, group);
        }
        group.items.push(enemy);
    }
    if (!groups.size) {
        return;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const group of groups.values()) {
        ctx.strokeStyle = group.color;
        for (let step = 0; step < raider_trail_steps; ++step) {
            const from = (step*raider_trail_span)/raider_trail_steps;
            const to = ((step + 1)*raider_trail_span)/raider_trail_steps;
            ctx.beginPath();
            for (const enemy of group.items) {
                const points = raider_trails.get(enemy).points;
                // a still raider leaves none: its points all in one place
                const first = points[0];
                const last = points[points.length - 1];
                if (Math.abs(last.x - first.x) + Math.abs(last.y - first.y) < 6) {
                    continue;
                }
                let open = false;
                for (let j = points.length - 1; j > 0; --j) {
                    const age = raider_trail_clock - points[j].t;
                    if (age >= to) {
                        break;
                    }
                    if (age + 1/30 < from) {
                        continue;
                    }
                    if (!open) {
                        ctx.moveTo(points[j].x, points[j].y);
                        open = true;
                    }
                    ctx.lineTo(points[j - 1].x, points[j - 1].y);
                }
            }
            ctx.globalAlpha = 0.34*(1 - step/raider_trail_steps);
            ctx.lineWidth = Math.max(1, group.width*(1 - step*0.28));
            ctx.stroke();
        }
    }
    ctx.restore();
}
