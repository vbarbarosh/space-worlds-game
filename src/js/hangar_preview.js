// Hangar previews: each ship card shows its ship alive on a small canvas. The engines idle, the
// turrets follow the pointer over the card, a press fires the equipped weapon, and holding BOOST (or Shift over the
// card) lights the engines up. The game's frame loop draws them while the hangar is open, the cards in view only.
const hangar_previews = new WeakMap();
const hangar_previews_seen = new IntersectionObserver(function (entries) {
    for (const v of entries) {
        hangar_previews.get(v.target).seen = v.isIntersecting;
        if (!v.target.isConnected) {
            hangar_previews_seen.unobserve(v.target);
        }
    }
});
let hangar_shift = false;

addEventListener('keydown', function (event) {
    hangar_shift = event.shiftKey;
});
addEventListener('keyup', function (event) {
    hangar_shift = event.shiftKey;
});

// A card's live preview: its canvas, the BOOST button and a hint
function hangar_preview_html(v)
{
    return `<canvas class="fleet-preview" data-ship="${v.id}" aria-label="${v.name}, live preview"></canvas><button class="fleet-boost" type="button">BOOST</button><span class="fleet-hint">AIM · CLICK TO FIRE</span>`;
}

function hangar_previews_tick(dt)
{
    if ((state !== 'upgrade') || (station_tab !== 'hangar')) {
        return;
    }
    for (const canvas of document.querySelectorAll('.fleet-preview')) {
        const preview = hangar_preview_state(canvas);
        if (preview.seen) {
            hangar_preview_draw(canvas, preview, dt);
        }
    }
}

// The preview's state, made with its pointer handlers the first time the canvas is drawn; a card scrolled out of view
// keeps it and waits
function hangar_preview_state(canvas)
{
    let out = hangar_previews.get(canvas);
    if (out) {
        return out;
    }
    out = {ship: ship_catalog.find(v => v.id === canvas.dataset.ship), seen: true, layout: null, aim: 0, pointer: null, firing: false, boost: false, cooldown: 0, recoil: 0, shots: []};
    hangar_previews.set(canvas, out);
    hangar_previews_seen.observe(canvas);
    canvas.addEventListener('pointermove', function (event) {
        const box = canvas.getBoundingClientRect();
        out.pointer = {x: event.clientX - box.left, y: event.clientY - box.top};
    });
    canvas.addEventListener('pointerleave', function () {
        out.pointer = null;
        out.firing = false;
    });
    canvas.addEventListener('pointerdown', function (event) {
        out.firing = true;
        canvas.setPointerCapture(event.pointerId);
    });
    for (const name of ['pointerup', 'pointercancel']) {
        canvas.addEventListener(name, function () {
            out.firing = false;
        });
    }
    const boost = canvas.parentElement.querySelector('.fleet-boost');
    boost.addEventListener('pointerdown', function (event) {
        out.boost = true;
        boost.setPointerCapture(event.pointerId);
    });
    for (const name of ['pointerup', 'pointercancel', 'pointerleave']) {
        boost.addEventListener(name, function () {
            out.boost = false;
        });
    }
    return out;
}

// What stays the same from frame to frame while the card keeps its height: the art and its anchors, the ship's box, its
// mounts and guns (a purchase draws the hangar again, with new cards)
function hangar_preview_layout(preview, h)
{
    if (preview.layout?.h === h) {
        return preview.layout;
    }
    const art = ship_sprite(preview.ship);
    const anchors = sprite(art.name) && sprite_anchors(art.name, art.length);
    if (!anchors) {
        return null;
    }
    // The ship's box as in the static card: the cruiser fills the height, the smallest ships a bit less
    const longest = Math.max(...ship_catalog.map(v => ship_sprite(v).length));
    const size = h*(0.65 + (0.35*art.length)/longest);
    // each mount with the gun the ship would carry, at its mount's size; an empty arcade mount neither fires nor shows
    const loadout = ship_loadout(preview.ship).map(weapon_by_id);
    preview.layout = {
        h,
        art,
        anchors,
        size,
        k: (size*sprite_span)/(256*art.length),
        mounts: mount_points(preview.ship),
        loadout,
        weapon: loadout.find(Boolean) || weapon_catalog[0],
    };
    return preview.layout;
}

// At the screen's pixel ratio, capped as the flight's is, but never lowered with it: a small canvas, drawn sharp
function hangar_preview_draw(canvas, preview, dt)
{
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const ratio = resolution_screen_dpr();
    if ((canvas.width !== Math.round(w*ratio)) || (canvas.height !== Math.round(h*ratio))) {
        canvas.width = Math.round(w*ratio);
        canvas.height = Math.round(h*ratio);
    }
    const layout = hangar_preview_layout(preview, h);
    if (!layout) {
        return;
    }
    const {art, anchors, size, k, mounts, loadout, weapon} = layout;
    const cx = w/2;
    const cy = h/2;
    const boost = preview.boost || (hangar_shift && !!preview.pointer);
    // Turrets turn toward the pointer, or back to the nose once it leaves
    const target = preview.pointer ? Math.atan2(preview.pointer.y - cy, preview.pointer.x - cx) : 0;
    const delta = Math.atan2(Math.sin(target - preview.aim), Math.cos(target - preview.aim));
    preview.aim += clamp(delta, -9*dt, 9*dt);
    preview.cooldown -= dt;
    preview.recoil = Math.max(0, preview.recoil - dt*12);
    if (preview.firing && !boost && (preview.cooldown <= 0)) {
        preview.cooldown = Math.max(0.12, weapon.interval);
        preview.recoil = 1.5;
        preview.volley = (preview.volley || 0) + 1;
        const c = Math.cos(preview.aim);
        const s = Math.sin(preview.aim);
        for (let i = 0; i < mounts.length; ++i) {
            if (!loadout[i]) {
                continue;
            }
            const muzzles = gun_muzzles(loadout[i], gun_boxes[mounts[i].size]) || [{x: 13, y: 0, r: 0}];
            const m = muzzles[preview.volley % muzzles.length];
            preview.shots.push({x: cx + (mounts[i].x + m.x*c - m.y*s)*k, y: cy + (mounts[i].y + m.x*s + m.y*c)*k, vx: c*520, vy: s*520, life: 0.9, width: Math.max(1.4, m.r)*k, color: loadout[i].color});
        }
        sfx((weapon.id === 'plasma') ? 'shot' : `enemy_${weapon.id}`);
    }
    for (const shot of preview.shots) {
        shot.x += shot.vx*dt;
        shot.y += shot.vy*dt;
        shot.life -= dt;
    }
    preview.shots = preview.shots.filter(v => (v.life > 0) && (v.x > -20) && (v.x < w + 20) && (v.y > -20) && (v.y < h + 20));
    const draw = canvas.getContext('2d');
    draw.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw.clearRect(0, 0, w, h);
    draw.save();
    draw.translate(cx, cy);
    draw.scale(k, k);
    draw.globalCompositeOperation = 'lighter';
    sprite_flames(draw, anchors.flames.main, boost ? 1 : 0.4, '#90c9ff', Math.sin(clock*31)*0.08);
    draw.globalCompositeOperation = 'source-over';
    draw.restore();
    const raster = sprite_raster(art.name, null, Math.min(512, 2**Math.ceil(Math.log2(size*ratio))));
    if (raster) {
        draw.drawImage(raster, cx - size/2, cy - size/2, size, size);
    }
    draw.save();
    draw.translate(cx, cy);
    draw.scale(k, k);
    for (let i = 0; i < mounts.length; ++i) {
        draw.save();
        draw.translate(mounts[i].x, mounts[i].y);
        draw.rotate(preview.aim);
        if (loadout[i]) {
            turret_draw(draw, loadout[i], gun_boxes[mounts[i].size], preview.recoil);
        }
        draw.restore();
    }
    draw.restore();
    draw.lineCap = 'round';
    for (const shot of preview.shots) {
        const speed = Math.hypot(shot.vx, shot.vy);
        draw.strokeStyle = shot.color || weapon.color;
        draw.globalAlpha = Math.min(1, shot.life*3);
        draw.lineWidth = shot.width;
        draw.beginPath();
        draw.moveTo(shot.x, shot.y);
        draw.lineTo(shot.x - (shot.vx/speed)*10, shot.y - (shot.vy/speed)*10);
        draw.stroke();
    }
    draw.globalAlpha = 1;
}
