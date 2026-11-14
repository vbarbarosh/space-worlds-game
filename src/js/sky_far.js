// The sky's far things: the world's own scenery drawings (render_map draws them in the plane of flight) again far behind
// it, small and faint, in two depths. Each depth is a plane of its own that slides past slower than the world, the
// farther the slower, and grows and shrinks with the zoom as the world does, so open space has depth and is this
// world's: Haven's satellites, Verdant's blooms, Obsidian's girders, Cryosphere's crystals. Decoration, with full
// effects only; nothing of it moves by itself, the camera alone moves it. Smaller than any rock and fainter than any
// hull, behind the planet: it never passes for a thing to hit or to take.
const sky_far_depths = [
    {parallax: 0.2, size: 24, alpha: 0.24, count: 9},
    {parallax: 0.45, size: 44, alpha: 0.3, count: 5},
];
// Which of a world's three scenery drawings go far, by world: all but the ones that, small and faint, pass for a thing
// of the game or for a smudge: Dustfall's wheel and Nova Forge's spiked disc for a piece of salvage or a mine, Ion
// Reach's ringed prism for a field's ring, Eclipse's slab for a raider's shot by its pink stone; Haven's dish is a
// grey spot at that size
const sky_far_arts = [[1, 3], [1, 2, 3], [1, 2], [2, 3], [1, 2, 3], [1, 2, 3], [1, 2], [1, 3]];
// the window a depth's count is for (a wider one shows as many to the same area); the room past the window's edge a
// thing leaves and comes back through, in screen units: over half the largest of them at the closest zoom; and the
// widest zoom (set_zoom), which a plane's side is made for
const sky_far_screen = 1366*768;
const sky_far_margin = 60;
const sky_far_widest = 0.5;

// A depth's things for a plane `tiles` screens across: where each is on it (0 to 1 of its side), which of the world's
// drawings, its turn (one of six, so the stamped copies are few) and its size, one of two
function sky_far_create(id, tiles)
{
    const random = visual_random_from_seed(5501 + id*6113);
    const slug = world_slug(id);
    const arts = sky_far_arts[id];
    const out = [];
    for (const depth of sky_far_depths) {
        const items = [];
        for (let i = 0, end = Math.round(depth.count*tiles); i < end; ++i) {
            items.push({
                x: random(),
                y: random(),
                art: `worlds/${slug}/scenery-${arts[Math.floor(random()*arts.length)]}`,
                angle: (Math.floor(random()*6)*Math.PI)/3,
                size: depth.size*((random() < 0.5) ? 0.85 : 1.15),
            });
        }
        out.push(items);
    }
    return out;
}

// A thing's copy as the screen shows it under the transform t, `size` across: one of sprite_draw_still's copies, a
// few for a whole sky; null while its drawing loads
function sky_far_copy(item, size, t)
{
    const v = sprite(item.art);
    const raster = v && sprite_raster(item.art, null, sprite_raster_px(v, size, t));
    return raster ? sprite_still_copy(raster, size, item.angle, t) : null;
}

// Drawn after the stars and before the planet (draw_background), in screen units. A plane's side is what fills the
// window at the widest zoom, so a thing that leaves on one side comes back on the other out of sight. Each thing keeps
// its copy while the zoom and the canvas's scale stand, so a frame is one copy to the nearest device pixel a thing
// under one state of the canvas (through sprite_draw_still, a call a thing, the pass cost a calm frame 0.3 ms); while
// the zoom moves the copies would be made every frame, so the things are drawn as any sprite is.
function draw_sky_far(id, sky)
{
    if (!full_fx) {
        return;
    }
    const side = Math.max(W, H) + sky_far_margin*2;
    const tiles = (side*side)/(sky_far_widest*sky_far_widest*sky_far_screen);
    if (sky.far_tiles !== tiles) {
        sky.far = sky_far_create(id, tiles);
        sky.far_tiles = tiles;
    }
    const t = ctx.getTransform();
    const still = (zoom_target === null) && !t.b && !t.c;
    const fresh = (sky.far_scale !== t.a) || (sky.far_zoom !== zoom);
    sky.far_scale = t.a;
    sky.far_zoom = zoom;
    // the middle of the view, in the world's units
    const cx = camera.x + W/zoom/2;
    const cy = camera.y + H/zoom/2;
    // a thing is in sight while its middle is within its own half-diagonal of the window
    const reach_x = W/2 + sky_far_margin*zoom*0.6;
    const reach_y = H/2 + sky_far_margin*zoom*0.6;
    ctx.save();
    if (still) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    for (let k = 0; k < sky_far_depths.length; ++k) {
        const depth = sky_far_depths[k];
        const items = sky.far[k];
        // the plane's side in its own units, and a unit of it on the screen
        const plane = side/(sky_far_widest*depth.parallax);
        const unit = zoom*depth.parallax;
        // a wider view holds four times as many, each smaller: fainter there, so they stay a backdrop
        const alpha = depth.alpha*Math.min(1, 0.5 + zoom*0.5);
        ctx.globalAlpha = alpha;
        for (let i = 0, end = items.length; i < end; ++i) {
            const item = items[i];
            if (fresh) {
                item.copy = null;
            }
            const x = (((((item.x*plane - cx) % plane) + plane*1.5) % plane) - plane/2)*unit;
            if ((x < -reach_x) || (x > reach_x)) {
                continue;
            }
            const y = (((((item.y*plane - cy) % plane) + plane*1.5) % plane) - plane/2)*unit;
            if ((y < -reach_y) || (y > reach_y)) {
                continue;
            }
            if (!still) {
                sprite_draw_box(item.art, null, item.size*zoom, W/2 + x, H/2 + y, item.angle, alpha);
                continue;
            }
            if (!item.copy) {
                item.copy = sky_far_copy(item, item.size*zoom, t);
            }
            if (item.copy) {
                // in use this frame: the copies' budget lets it be (sprite_still_evict)
                item.copy.used = clock;
                ctx.drawImage(item.copy.canvas, Math.round(t.a*(W/2 + x) + t.e) - item.copy.canvas.width/2, Math.round(t.d*(H/2 + y) + t.f) - item.copy.canvas.height/2);
            }
        }
    }
    ctx.restore();
}
