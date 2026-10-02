function polygon(x, y, r, sides, angle, color, fill)
{
    ctx.beginPath();
    for (let i = 0; i < sides; ++i) {
        const a = angle + (i/sides)*Math.PI*2;
        const px = x + Math.cos(a)*r;
        const py = y + Math.sin(a)*r;
        if (i === 0) {
            ctx.moveTo(px, py);
        }
        else {
            ctx.lineTo(px, py);
        }
    }
    ctx.closePath();
    ctx.fillStyle = fill || '#0e1529';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.7;
    ctx.stroke();
}

function wireframe_ship(x, y, angle, alpha = 1, ghost = false)
{
    if (current_ship().shape) {
        draw_fleet_ship(x, y, angle, alpha, ghost);
        return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = (full_fx && !ghost) ? 16 : 0;
    ctx.shadowColor = cyan;
    ctx.beginPath();
    ctx.moveTo(21, 0);
    ctx.lineTo(-13, -12);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-13, 12);
    ctx.closePath();
    ctx.fillStyle = ghost ? '#6cf8ec' : '#123747';
    ctx.fill();
    ctx.strokeStyle = cyan;
    ctx.lineWidth = 1.7;
    ctx.stroke();
    if (!ghost) {
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(-3, -4);
        ctx.lineTo(-1, 0);
        ctx.lineTo(-3, 4);
        ctx.closePath();
        ctx.fillStyle = '#d6fff8';
        ctx.fill();
        if (!is_player_vessel(x, y)) {
            ctx.beginPath();
            ctx.moveTo(-10, -5);
            ctx.lineTo(-24 - rand(0, 8), 0);
            ctx.lineTo(-10, 5);
            ctx.fillStyle = '#6cf8ec88';
            ctx.fill();
        }
    }
    ctx.restore();
}

function visual_base_draw_background()
{
    ctx.fillStyle = '#080b17';
    ctx.fillRect(0, 0, W, H);
    const gradient = ctx.createRadialGradient(W*0.55, H*0.45, 30, W*0.5, H*0.5, Math.max(W, H)*0.65);
    gradient.addColorStop(0, (state === 'menu') ? '#152342' : current_sector().color);
    gradient.addColorStop(0.5, '#0f152b');
    gradient.addColorStop(1, '#080b17');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    const cx = (state === 'menu') ? clock*7 : camera.x;
    const cy = (state === 'menu') ? clock*7 : camera.y;
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#7a9cd212';
    ctx.beginPath();
    for (let x = -cx % 80; x < W; x += 80) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
    }
    for (let y = -cy % 80; y < H; y += 80) {
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
    }
    ctx.stroke();
    for (const star of stars) {
        ctx.globalAlpha = (0.25 + Math.sin(clock*0.6 + star.phase)*0.15)*star.z;
        ctx.fillStyle = (star.z > 0.9) ? cyan : '#bccdf8';
        const x = (((star.x - cx*star.z*0.17) % W) + W) % W;
        const y = (((star.y - cy*star.z*0.17) % H) + H) % H;
        ctx.fillRect(x, y, star.z*1.7, star.z*1.7);
    }
    ctx.globalAlpha = 1;
}

function update_camera(dt, snap = false)
{
    if (!player) {
        return;
    }
    const vw = W/zoom;
    const vh = H/zoom;
    const tx = clamp(player.x - vw/2, 0, Math.max(0, world.w - vw));
    const ty = clamp(player.y - vh/2, 0, Math.max(0, world.h - vh));
    const smooth = snap ? 1 : 1 - Math.exp(-10*dt);
    camera.x = clamp(camera.x + (tx - camera.x)*smooth, 0, Math.max(0, world.w - vw));
    camera.y = clamp(camera.y + (ty - camera.y)*smooth, 0, Math.max(0, world.h - vh));
}
