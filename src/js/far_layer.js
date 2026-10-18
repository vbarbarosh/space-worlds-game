// Depth behind the play: a few of the world's own rocks and wrecks far off, between its stars and its planet, dark
// against the sky with one rim caught by the light (upper left, as on every hull), sliding past at a fifth to a third
// of the ship's pace. They are background, smaller and darker than anything solid, and never in the way: the planet
// passes in front of them. Each is baked once, blurred, at half the screen's resolution, and drawn each frame at the
// nearest device pixel twice as large: a handful of copies.
const far_layer_count = 7;
// Half resolution: out of focus, they look the same with a quarter of the pixels; at full size the seven pushed Haven's
// whole raster into the frame on a software canvas (bin/perf calm-w0-z100: frame p50 1.5 to 60 ms)
const far_layer_res = 0.5;
const far_layer_cache = {key: '', items: []};

function far_layer_items(id)
{
    const look = world_looks[id];
    const random = visual_random_from_seed(9137 + id*311);
    // smaller on a small screen, as far things stay small: a phone's view is a third of a monitor's
    const scale = clamp(Math.min(W, H)/900, 0.45, 1);
    const names = ['asteroid-1', 'asteroid-2', 'asteroid-3', 'asteroid-4', 'debris-rock-1', 'debris-wreck-1', 'debris-rock-2'];
    const out = [];
    for (let i = 0; i < far_layer_count; ++i) {
        const near = i % 2;
        out.push({
            name: `worlds/${world_slug(id)}/${names[i % names.length]}`,
            x: random(),
            y: random(),
            size: (near ? 80 + random()*60 : 45 + random()*40)*scale,
            angle: random()*Math.PI*2,
            parallax: near ? 0.32 : 0.2,
            // the nearer ones a little lighter, as the far ones sink into the sky
            dark: near ? 0.8 : 0.88,
            blur: near ? 1.8 : 2.6,
            base: look.base,
            rim: color_mix(look.star, worlds[id].accent, 0.35),
            canvas: null,
        });
    }
    return out;
}

// Behind the planet (draw_background), in the screen's units
function render_far_layer(id)
{
    const t = ctx.getTransform();
    if (t.b || t.c) {
        return;
    }
    const key = `${id}:${t.a}:${W}:${H}`;
    if (far_layer_cache.key !== key) {
        far_layer_cache.key = key;
        far_layer_cache.items = far_layer_items(id);
    }
    const margin = 200;
    const w = W + margin*2;
    const h = H + margin*2;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const v of far_layer_cache.items) {
        const x = (((v.x*w - camera.x*v.parallax) % w) + w) % w - margin;
        const y = (((v.y*h - camera.y*v.parallax*0.8) % h) + h) % h - margin;
        if ((x < -v.size) || (x > W + v.size) || (y < -v.size) || (y > H + v.size)) {
            continue;
        }
        const canvas = v.canvas || far_layer_bake(v, t.a*far_layer_res);
        if (!canvas) {
            continue;
        }
        const size = canvas.width/far_layer_res;
        ctx.drawImage(canvas, Math.round(t.a*x + t.e - size/2), Math.round(t.d*y + t.f - size/2), size, size);
    }
    ctx.restore();
}

// The rock turned and sized as the screen shows it (k device pixels a unit): its rim in the light first, a pixel or two
// up and left, then its body darkened toward the sky over it; null while its drawing loads or for a world without it
function far_layer_bake(v, k)
{
    const s = sprite(v.name);
    if (!s) {
        return null;
    }
    const px = Math.max(16, Math.ceil(v.size*k*1.42/2)*2);
    const raster = sprite_raster(v.name, null, sprite_raster_px(s, px, new DOMMatrix()));
    if (!raster) {
        return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = px + 4;
    const draw = canvas.getContext('2d');
    const size = v.size*k;
    const shift = Math.max(1, k*1.2);
    for (const [tint, offset, alpha] of [[sprite_tint(raster, v.rim, 1), -shift, 0.55], [sprite_tint(raster, v.base, v.dark), 0, 0.85]]) {
        draw.setTransform(1, 0, 0, 1, px/2 + 2 + offset, px/2 + 2 + offset);
        draw.rotate(v.angle);
        draw.globalAlpha = alpha;
        // out of focus, as far things are: blurred once here
        draw.filter = `blur(${(v.blur*k).toFixed(2)}px)`;
        draw.drawImage(tint, -size/2, -size/2, size, size);
    }
    v.canvas = canvas;
    return canvas;
}
