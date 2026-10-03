// Mining drones (campaign): they fly out to rocks near the ship, cut them with a beam, and carry the load back to the hold.
// campaign.drones counts the drones you own; the ones in flight are in drones; the bay holds two, the Mule Prospector four.
let drones = [];
let drones_out = false;
const drone_price = 45;

function drone_bay()
{
    return (current_ship().id === 'miner') ? 4 : 2;
}

function drones_owned()
{
    if (!Number.isInteger(campaign.drones)) {
        campaign.drones = drone_bay();
    }
    campaign.drones = Math.min(campaign.drones, drone_bay());
    return campaign.drones;
}

// Cutting speed per drone; the miner's mining factor makes its drones cut faster.
function drone_cut_rate()
{
    return 11*(current_ship().mining || 1);
}

// H: launch the drones at the rocks within 900 m, or call them back.
function drones_toggle()
{
    if ((state !== 'playing') || arcade.active || !player) {
        return;
    }
    if (drones_out) {
        drones_out = false;
        for (const drone of drones) {
            drone.state = 'back';
        }
        show_toast('DRONES RECALLED', 'THEY BRING BACK WHAT THEY CUT', 2);
        return;
    }
    if (!drones_owned()) {
        show_toast('NO DRONES', 'BUY MINING DRONES AT A STATION', 2.5);
        return;
    }
    if (!drone_next_rock(player)) {
        show_toast('NO ROCKS IN RANGE', 'FLY WITHIN 900 m OF A MINING FIELD', 2.5);
        return;
    }
    drones_out = true;
    show_toast('DRONES OUT', drones_owned() + ' CUTTING / H CALLS THEM BACK / RAIDERS HUNT THEM', 2.5);
}

// The nearest live rock within 900 m of the ship that no other drone is cutting.
function drone_next_rock(from)
{
    let best = null;
    let near = Infinity;
    for (const rock of ore_nodes) {
        if ((rock.hp <= 0) || (distance(rock, player) > 900) || drones.some(v => v.target === rock)) {
            continue;
        }
        const d = distance(rock, from);
        if (d < near) {
            near = d;
            best = rock;
        }
    }
    return best;
}

function drone_launch()
{
    const a = drones.length*2.1 + player.angle;
    drones.push({x: player.x + Math.cos(a)*20, y: player.y + Math.sin(a)*20, angle: a, state: 'out', target: null, load: null, hp: 30, beam: 0});
}

// Returns a drone in reach of a raider and closer than the ship, for it to hunt.
function drone_prey(enemy)
{
    let best = null;
    let near = Math.min(320, distance(enemy, player));
    for (const drone of drones) {
        const d = distance(drone, enemy);
        if (d < near) {
            near = d;
            best = drone;
        }
    }
    return best;
}

function drone_fly(drone, to, dt, speed = 260)
{
    const dx = to.x - drone.x;
    const dy = to.y - drone.y;
    const d = Math.hypot(dx, dy);
    drone.angle = Math.atan2(dy, dx);
    const step = Math.min(d, speed*dt);
    if (d > 0) {
        drone.x += (dx/d)*step;
        drone.y += (dy/d)*step;
    }
    return d - step;
}

function drone_unload(drone)
{
    if (drone.load) {
        ore_load({...drone.load, x: player.x, y: player.y - 26});
        drone.load = null;
        save_checkpoint();
    }
}

function drones_update(dt)
{
    if (arcade.active || !player) {
        drones = [];
        drones_out = false;
        return;
    }
    if (drones_out && (drones.length < drones_owned())) {
        drone_launch();
    }
    for (const drone of drones) {
        drone.beam = 0;
        if ((drone.state === 'out') && (!drone.target || (drone.target.hp <= 0))) {
            drone.target = drone_next_rock(drone);
            if (!drone.target) {
                drone.state = 'back';
            }
        }
        if (drone.state === 'out') {
            const rock = drone.target;
            const stand = {x: rock.x + Math.cos(drone.angle + Math.PI)*(rock.r + 14), y: rock.y + Math.sin(drone.angle + Math.PI)*(rock.r + 14)};
            if (distance(drone, rock) > rock.r + 18) {
                drone_fly(drone, stand, dt);
            }
            else {
                drone.angle = Math.atan2(rock.y - drone.y, rock.x - drone.x);
                drone.beam = 1;
                rock.cutter = drone;
                damage_ore(rock, drone_cut_rate()*dt);
                rock.cutter = null;
                if (rock.hp <= 0) {
                    drone.load = {resource: rock.resource, amount: rock.amount || 1};
                    drone.target = null;
                    drone.state = 'back';
                }
            }
        }
        if (drone.state === 'back') {
            if (drone_fly(drone, player, dt, 320) < 22) {
                drone_unload(drone);
                const next = drones_out ? drone_next_rock(player) : null;
                drone.state = next ? 'out' : 'docked';
                drone.target = next;
            }
        }
        for (const b of hostile) {
            if ((b.life > 0) && (distance(b, drone) < b.r + 7)) {
                drone.hp -= b.damage || 13;
                b.life = 0;
            }
        }
        for (const enemy of enemies) {
            if ((enemy.hp > 0) && (distance(enemy, drone) < enemy.r + 7)) {
                drone.hp -= 40*dt;
            }
        }
        if (drone.hp <= 0) {
            drone.state = 'lost';
            campaign.drones = Math.max(0, drones_owned() - 1);
            explode(drone.x, drone.y, 14, gold);
            show_toast('DRONE LOST', campaign.drones + ' LEFT / REPLACE THEM AT A STATION', 2.5);
            save_checkpoint();
        }
    }
    drones = drones.filter(v => !['docked', 'lost'].includes(v.state));
    if (drones_out && !drones_owned()) {
        drones_out = false;
    }
    if (drones_out && !drones.length && !drone_next_rock(player)) {
        drones_out = false;
        show_toast('DRONES HOME', 'NO MORE ROCKS WITHIN 900 m', 2);
    }
}

// Docking, a world jump or a new run bring every drone home at once, with its load.
function drones_recall_now()
{
    for (const drone of drones) {
        drone_unload(drone);
    }
    drones = [];
    drones_out = false;
}

function render_drones()
{
    ctx.save();
    for (const drone of drones) {
        if (!in_view(drone, 40)) {
            continue;
        }
        if (drone.beam && drone.target) {
            const color = ore_color(drone.target);
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = color_with_alpha(color, 0.5 + 0.4*Math.sin(clock*40));
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(drone.x, drone.y);
            ctx.lineTo(drone.target.x, drone.target.y);
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.save();
        ctx.translate(drone.x, drone.y);
        ctx.rotate(drone.angle);
        ctx.fillStyle = drone.load ? ore_color(drone.load) : '#0d192b';
        ctx.strokeStyle = cyan;
        ctx.lineWidth = 2;
        ctx.shadowColor = cyan;
        ctx.shadowBlur = full_fx ? 10 : 0;
        ctx.beginPath();
        ctx.moveTo(13, 0);
        ctx.lineTo(0, 9);
        ctx.lineTo(-10, 0);
        ctx.lineTo(0, -9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}

// A drone for the station's shop, up to the bay's size.
function render_drone_shop_card()
{
    if (arcade.active || !['all', 'utility'].includes(shop_filter)) {
        return;
    }
    const owned = drones_owned();
    const capped = owned >= drone_bay();
    const card = document.createElement('div');
    card.className = 'shop-item';
    card.innerHTML =
        '<b>⛏ &nbsp;Mining drone</b><span class="item-level">IN BAY ' +
        owned +
        ' / ' +
        drone_bay() +
        '</span><p>H / cuts rocks near you and brings the ore to your hold. Raiders hunt drones; replace the lost ones here.</p>';
    const b = document.createElement('button');
    b.disabled = capped || (salvage < drone_price);
    b.textContent = capped ? 'BAY FULL' : 'BUY · ◆ ' + drone_price;
    b.addEventListener('click', function () {
        if ((state !== 'upgrade') || (drones_owned() >= drone_bay()) || (salvage < drone_price)) {
            return;
        }
        salvage -= drone_price;
        campaign.drones++;
        sfx('pickup');
        dock_message = 'Mining drone added to the bay.';
        render_shop();
        save_checkpoint('dock');
    });
    card.append(b);
    el.shop_grid.prepend(card);
}
