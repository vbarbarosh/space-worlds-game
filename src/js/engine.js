function is_player_vessel(x, y)
{
    return player && (x === player.x) && (y === player.y);
}

function update_engine_effects(dt)
{
    if (state !== 'playing') {
        return;
    }
    const boost = !!player.turbo_active;
    const power = boost ? 1 : player.engine_thrust || 0;
    const turn = player.hull_turn || 0;
    player.engine_emit = (player.engine_emit || 0) + dt;
    if (full_fx && (power > 0.1) && (player.engine_emit > 0.06)) {
        player.engine_emit = 0;
        const c = Math.cos(player.angle);
        const s = Math.sin(player.angle);
        for (const side of [-1, 1]) {
            const reverse = player.engine_reverse && !boost;
            const x = reverse ? 14 : -17;
            const y = side*((current_ship().shape >= 4) ? 14 : 7);
            const direction = reverse ? 1 : -1;
            const life = boost ? 0.24 : 0.12;
            particles.push({
                x: player.x + x*c - y*s,
                y: player.y + x*s + y*c,
                vx: direction*c*(boost ? 130 : 55) + player.vx*0.25,
                vy: direction*s*(boost ? 130 : 55) + player.vy*0.25,
                life,
                total: life,
                color: '#9bcfff',
                size: boost ? 1.6 : 0.8,
            });
        }
    }
}

function render_engine_plumes()
{
    if (!player || (state === 'dead')) {
        return;
    }
    const boost = !!player.turbo_active;
    const power = boost ? 1 : player.engine_thrust || 0;
    const turn = player.hull_turn || 0;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    function plume(x, y, angle, length, intensity = 1) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        const g = ctx.createLinearGradient(0, 0, length, 0);
        g.addColorStop(0, '#f1faffdd');
        g.addColorStop(0.25, '#90c9ffb3');
        g.addColorStop(0.65, '#5b92ce44');
        g.addColorStop(1, '#40679000');
        ctx.globalAlpha = intensity;
        ctx.fillStyle = g;
        const r = 2.6;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.bezierCurveTo(length*0.2, -r, length*0.7, -r*0.4, length, 0);
        ctx.bezierCurveTo(length*0.7, r*0.4, length*0.2, r, 0, r);
        ctx.closePath();
        ctx.fill();
        if (full_fx) {
            const glow = ctx.createRadialGradient(1, 0, 0, 1, 0, 7);
            glow.addColorStop(0, '#acd9ff33');
            glow.addColorStop(1, '#8abaff00');
            ctx.fillStyle = glow;
            ctx.fillRect(-6, -7, 14, 14);
        }
        ctx.restore();
    }
    if (power > 0.03) {
        const y = (current_ship().shape >= 4) ? 14 : 7;
        for (const side of [-1, 1]) {
            plume((player.engine_reverse && !boost) ? 14 : -17, side*y, (player.engine_reverse && !boost) ? 0 : Math.PI, (boost ? 42 : 18)*power);
        }
    }
    if (Math.abs(turn) > 0.15) {
        const side = -Math.sign(turn);
        const intensity = clamp(Math.abs(turn)/2, 0.15, 0.65);
        plume(12, side*10, (side*Math.PI)/2, 9, intensity);
        plume(-12, -side*10, (-side*Math.PI)/2, 9, intensity);
    }
    ctx.restore();
}

function cabin_render_engine_effects()
{
    const W = width;
    const H = height;
    const boost = !!player.turbo_active;
    const power = boost ? 1 : player.engine_thrust || 0;
    cabin_label(boost ? 'BOOST THRUST' : 'THRUST ' + Math.round(power*100) + '%', W*0.17, H*0.91, (W < 700) ? 7 : 9, boost ? '#a9d4ff' : '#8aafc5');
}
