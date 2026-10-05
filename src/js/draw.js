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

// The glow a canvas shadow (shadowBlur blur, in canvas pixels) gives a circle's stroke `width` wide, as a gradient
// ring: a blurred shadow costs up to 100 ms on a large circle. False for a small one, which keeps its cheap shadow.
function ring_glow(x, y, r, width, blur, color, alpha = 1)
{
    const t = ctx.getTransform();
    const sigma = blur/2/Math.sqrt(t.a*t.a + t.b*t.b);
    if (r < sigma*4) {
        return false;
    }
    const inner = r - sigma*4;
    const outer = r + sigma*4;
    const g = ctx.createRadialGradient(x, y, inner, x, y, outer);
    for (let i = 0; i <= 24; ++i) {
        const d = inner + ((outer - inner)*i)/24 - r;
        g.addColorStop(i/24, color_with_alpha(color, alpha*(normal_cdf((d + width/2)/sigma) - normal_cdf((d - width/2)/sigma))));
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, outer, 0, Math.PI*2);
    ctx.arc(x, y, inner, 0, Math.PI*2, true);
    ctx.fill();
    return true;
}

// The standard normal distribution's share below x (Abramowitz and Stegun 7.1.26, within 1.5e-7)
function normal_cdf(x)
{
    const z = Math.abs(x)/Math.SQRT2;
    const t = 1/(1 + 0.3275911*z);
    const erf = 1 - (((((1.061405429*t - 1.453152027)*t + 1.421413741)*t - 0.284496736)*t + 0.254829592)*t)*Math.exp(-z*z);
    return (x >= 0) ? (1 + erf)/2 : (1 - erf)/2;
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
