// The arcade depot's shield: while raiders are near the station a dome rises round it, and nothing flies through it
// (raiders would bomb the depot); once they are cleared it falls and the depot opens. It rises and falls over about
// half a second, shimmers while up, and flashes where a ship meets it.
const depot_shield_reach = station_size/2 + 900;
const depot_shield_radius = station_size/2 + 60;
const depot_shield = {level: 0, hits: []};

// Raiders near the station: the shield is up
function depot_shield_wanted()
{
    return arcade.active && enemies.some(v => (v.hp > 0) && (distance(v, station) < depot_shield_reach));
}

// Up, or rising: the depot is closed
function depot_shield_up()
{
    return arcade.active && ((depot_shield.level > 0.05) || depot_shield_wanted());
}

// Each frame in flight: the shield rises or falls, and while up it keeps ships out
function depot_shield_update(dt)
{
    const target = depot_shield_wanted() ? 1 : 0;
    const was = depot_shield.level;
    depot_shield.level = clamp(depot_shield.level + Math.sign(target - depot_shield.level)*dt*2, 0, 1);
    if ((was < 1) && (depot_shield.level === 1)) {
        show_toast('DEPOT SHIELDED', 'RAIDERS NEAR THE STATION · CLEAR THEM AND IT OPENS', 2.5);
    }
    if ((was > 0) && (depot_shield.level === 0) && arcade.active) {
        show_toast('DEPOT OPEN', 'R TO DOCK FOR REPAIRS AND WEAPONS', 2.5);
    }
    depot_shield.hits = depot_shield.hits.filter(v => (v.life -= dt) > 0);
    if (depot_shield.level < 0.5) {
        return;
    }
    for (const ship of [player, ...enemies.filter(v => v.hp > 0)]) {
        if (!ship) {
            continue;
        }
        const d = distance(ship, station);
        if (d < depot_shield_radius + ship.r) {
            const a = Math.atan2(ship.y - station.y, ship.x - station.x);
            ship.x = station.x + Math.cos(a)*(depot_shield_radius + ship.r);
            ship.y = station.y + Math.sin(a)*(depot_shield_radius + ship.r);
            if (ship === player) {
                const into = player.vx*Math.cos(a) + player.vy*Math.sin(a);
                if (into < 0) {
                    player.vx -= Math.cos(a)*into*1.4;
                    player.vy -= Math.sin(a)*into*1.4;
                }
            }
            if (!depot_shield.hits.some(v => Math.abs(docking_turn(v.a, a)) < 0.2)) {
                depot_shield.hits.push({a, life: 0.5});
            }
        }
    }
}

// The dome, in the world's frame: a rim of light, a hex lattice that shimmers, and bright arcs where ships met it
function depot_shield_draw()
{
    const k = depot_shield.level;
    if (k <= 0) {
        return;
    }
    const r = depot_shield_radius*(0.92 + 0.08*k);
    ctx.save();
    ctx.translate(station.x, station.y);
    const glow = ctx.createRadialGradient(0, 0, r*0.6, 0, 0, r);
    glow.addColorStop(0, 'rgba(108, 248, 236, 0)');
    glow.addColorStop(0.85, `rgba(108, 248, 236, ${0.05*k})`);
    glow.addColorStop(1, `rgba(108, 248, 236, ${0.22*k})`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI*2);
    ctx.fill();
    // the hex lattice, clipped to the dome, drifting slowly
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = `rgba(108, 248, 236, ${0.09*k*(0.8 + 0.2*Math.sin(clock*3))})`;
    ctx.lineWidth = 2;
    const cell = 70;
    const drift = (clock*12) % (cell*1.5);
    for (let y = -r - cell; y < r + cell; y += cell*0.866) {
        const row = Math.round(y/(cell*0.866));
        for (let x = -r - cell*1.5 + drift; x < r + cell; x += cell*1.5) {
            const cx = x + ((row % 2) ? cell*0.75 : 0);
            ctx.beginPath();
            for (let i = 0; i < 6; ++i) {
                const a = (i*Math.PI)/3;
                ctx.lineTo(cx + Math.cos(a)*cell*0.5, y + Math.sin(a)*cell*0.5);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }
    ctx.restore();
    if (full_fx && !ring_glow(0, 0, r, 4, 24, '#6cf8ec', 0.75*k)) {
        ctx.shadowColor = '#6cf8ec';
        ctx.shadowBlur = 24;
    }
    ctx.strokeStyle = `rgba(108, 248, 236, ${0.75*k})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI*2);
    ctx.stroke();
    ctx.shadowColor = '#6cf8ec';
    ctx.shadowBlur = full_fx ? 24 : 0;
    for (const h of depot_shield.hits) {
        ctx.strokeStyle = `rgba(220, 255, 252, ${h.life*1.6})`;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(0, 0, r, h.a - 0.18, h.a + 0.18);
        ctx.stroke();
    }
    ctx.restore();
}
