// The radar, a module of three levels: it finds raiders far beyond the window. Each one it sees off the window gets a
// bright marker on the window's edge, toward it, with its distance, bigger and brighter the nearer it is; raiders in
// one direction share a marker with their count, and the nearest are joined to your ship by a running dashed line. A
// raider's missile coming at you from off the window gets an orange marker of its own, and a ping rings out from the
// ship while anything is in reach. The Seeker launcher's missiles fly by it too (missile_guide), and the minimap shows
// what it sees bigger, charted or not, through the arcade's Dust Blind too (render_minimap).

// How far each level sees (m): the fight round you at the first, a sector of a world at the third
const radar_ranges = [0, 2500, 4000, 6000];
// Each level turns the Seeker launcher's missiles this much harder (rad/s)
const radar_missile_turn = 0.5;
// Markers within this angle of each other (rad, from the window's centre), or this many px apart (at full size, where
// the HUD has pushed them together), are one marker with a count
const radar_merge = 0.2;
const radar_merge_gap = 46;
// Lines go to this many of the nearest markers, and words (the distance) to this many, the flagship's always
const radar_lines = 3;
const radar_labels = 6;
// A ping rings out from the ship this often (s)
const radar_ping = 2.4;
const radar_red = '#ff4d5e';
const radar_orange = '#ffa53a';
// The plates' text widths by text, measured once (distances go by 10 m and 0.1 km, so they are few)
const radar_text_widths = new Map();

// How far the radar sees now (m); 0 with no radar, or out of flight
function radar_range()
{
    return (player && (state === 'playing')) ? (radar_ranges[upgrades.radar || 0] || 0) : 0;
}

// Whether the radar sees `v` (a raider, a missile)
function radar_sees(v)
{
    const range = radar_range();
    return (range > 0) && (distance(player, v) < range);
}

// The markers' size: full on a window of 720 px or more each way, down to 0.65 of it on a phone
function radar_scale()
{
    return clamp(Math.min(hud_layout.width, hud_layout.height)/720, 0.65, 1);
}

// Where `v` of the world is on the window (screen px)
function radar_screen(v)
{
    return {x: ox + (v.x - camera.x)*zoom*scale, y: oy + (v.y - camera.y)*zoom*scale};
}

// The raiders the radar sees off the window, merged by direction, nearest first:
// [{x, y, angle, d, count, boss}], the marker's place in screen px
function radar_contacts()
{
    const out = [];
    const range = radar_range();
    if (!range) {
        return out;
    }
    const gap = radar_merge_gap*radar_scale();
    const cx = hud_layout.width/2;
    const cy = hud_layout.height/2;
    const seen = [];
    for (const enemy of enemies) {
        if ((enemy.hp > 0) && !in_view(enemy, 0)) {
            const d = distance(player, enemy);
            if (d < range) {
                seen.push({enemy, d});
            }
        }
    }
    seen.sort((a, b) => a.d - b.d);
    for (const {enemy, d} of seen) {
        const p = radar_screen(enemy);
        const boss = (enemy.type === 'boss');
        // the way of a nearer marker: counted there, with no walk clear of the HUD (hud_edge_marker) of its own
        let near = out.find(v => Math.abs(angle_delta(v.angle, Math.atan2(p.y - cy, p.x - cx))) < radar_merge);
        if (!near) {
            const m = hud_edge_marker(p, 30);
            if (!m.offscreen) {
                continue;
            }
            near = out.find(v => Math.hypot(v.x - m.x, v.y - m.y) < gap);
            if (!near) {
                out.push({x: m.x, y: m.y, angle: m.angle, d, count: 1, boss});
                continue;
            }
        }
        near.count++;
        near.boss = near.boss || boss;
    }
    return out;
}

// The raiders' missiles off the window the radar sees coming at you, nearest first: [{x, y, angle, d}]
function radar_missiles()
{
    const out = [];
    if (!radar_range()) {
        return out;
    }
    for (const b of hostile) {
        if (!b.missile || in_view(b, 0) || !radar_sees(b)) {
            continue;
        }
        const d = distance(player, b);
        const speed = Math.hypot(b.vx, b.vy) || 1;
        // coming at you: flying within about 45° of the line to you
        if ((((player.x - b.x)*b.vx + (player.y - b.y)*b.vy)/(d*speed)) < 0.7) {
            continue;
        }
        const m = hud_edge_marker(radar_screen(b), 30);
        if (m.offscreen) {
            out.push({x: m.x, y: m.y, angle: m.angle, d});
        }
    }
    out.sort((a, b) => a.d - b.d);
    out.length = Math.min(out.length, 4);
    return out;
}

// A distance as the radar's markers say it: 850 m, 2.4 km
function radar_distance_text(d)
{
    return (d < 1000) ? `${Math.round(d/10)*10} m` : `${(d/1000).toFixed(1)} km`;
}

// The radar's drawing over the window (screen px): the ping, the lines to the nearest, the markers on the edge
function render_radar()
{
    const range = radar_range();
    if (!range) {
        return;
    }
    const contacts = radar_contacts();
    const missiles = radar_missiles();
    const ship = radar_screen(player);
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // anything in reach: off the window, or on it (always nearer than the first level's reach)
    if (contacts.length || enemies.some(v => (v.hp > 0) && in_view(v, 0))) {
        const t = (clock % radar_ping)/radar_ping;
        ctx.strokeStyle = '#6cf8ec';
        ctx.globalAlpha = (1 - t)*0.22;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, 40 + t*Math.hypot(hud_layout.width, hud_layout.height)*0.5, 0, Math.PI*2);
        ctx.stroke();
    }
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 9]);
    ctx.lineDashOffset = -clock*40;
    for (const c of contacts.slice(0, radar_lines)) {
        const k = radar_near(c.d, range);
        const gap = Math.hypot(c.x - ship.x, c.y - ship.y);
        if (gap < 120) {
            continue;
        }
        const ux = (c.x - ship.x)/gap;
        const uy = (c.y - ship.y)/gap;
        ctx.strokeStyle = c.boss ? pink : radar_red;
        ctx.globalAlpha = 0.25 + k*0.4;
        ctx.beginPath();
        ctx.moveTo(ship.x + ux*60, ship.y + uy*60);
        ctx.lineTo(c.x - ux*28, c.y - uy*28);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    radar_markers_draw(contacts, range);
    // the plates drawn, so that a later one never covers one before it: the flagship's first, then the missiles', then
    // the nearest raiders'
    const plates = [];
    for (const c of contacts.filter(v => v.boss)) {
        radar_marker_plate(c, range, plates);
    }
    for (const b of missiles) {
        radar_missile_draw(b, plates);
    }
    for (const c of contacts.slice(0, radar_labels)) {
        if (!c.boss) {
            radar_marker_plate(c, range, plates);
        }
    }
    ctx.restore();
}

// How near a contact is, 0 at the radar's reach to 1 at the window's edge
function radar_near(d, range)
{
    return 1 - clamp((d - 700)/Math.max(1, range - 700), 0, 1);
}

// A contact's marker's size (screen px, from its centre to its tip): bigger the nearer, the flagship's bigger still
function radar_marker_size(c, k)
{
    return ((c.boss ? 16 : 11) + k*8)*radar_scale();
}

// The contacts' markers (screen px): a chevron toward each in a soft disc of its colour, outlined in white, bigger the
// nearer and beating when close; the flagship pink. Drawn as one path for each colour and nearness, the near ones
// brighter, so many cost a few fills and no more.
function radar_markers_draw(contacts, range)
{
    const beat = 1 + Math.sin(clock*8)*0.1;
    for (const boss of [false, true]) {
        for (const near of [false, true]) {
            const glow = new Path2D();
            const chevrons = new Path2D();
            let any = false;
            for (const c of contacts) {
                const k = radar_near(c.d, range);
                if ((c.boss !== boss) || ((k > 0.6) !== near)) {
                    continue;
                }
                any = true;
                const size = radar_marker_size(c, k)*(near ? beat : 1);
                const ux = Math.cos(c.angle);
                const uy = Math.sin(c.angle);
                glow.moveTo(c.x + size*1.5, c.y);
                glow.arc(c.x, c.y, size*1.5, 0, Math.PI*2);
                // the chevron's tip, back corners and notch, along the way to the raider (u) and across it
                chevrons.moveTo(c.x + ux*size, c.y + uy*size);
                chevrons.lineTo(c.x - ux*size*0.7 + uy*size*0.75, c.y - uy*size*0.7 - ux*size*0.75);
                chevrons.lineTo(c.x - ux*size*0.3, c.y - uy*size*0.3);
                chevrons.lineTo(c.x - ux*size*0.7 - uy*size*0.75, c.y - uy*size*0.7 + ux*size*0.75);
                chevrons.closePath();
            }
            if (!any) {
                continue;
            }
            ctx.fillStyle = boss ? pink : radar_red;
            ctx.globalAlpha = near ? 0.3 : 0.2;
            ctx.fill(glow);
            ctx.globalAlpha = near ? 1 : 0.8;
            ctx.fill(chevrons);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#fff4f5';
            ctx.stroke(chevrons);
        }
    }
    ctx.globalAlpha = 1;
}

// A contact's distance on a dark plate on the side toward the centre, with the count of raiders that way
function radar_marker_plate(c, range, plates)
{
    const size = radar_marker_size(c, radar_near(c.d, range));
    radar_plate(c, size + 26, (c.boss ? 'FLAGSHIP · ' : '') + radar_distance_text(c.d) + ((c.count > 1) ? ` ×${c.count}` : ''), c.boss ? pink : radar_red, plates);
}

// A raider's missile coming at you (screen px): an orange diamond toward it, MISSILE and its distance beside
function radar_missile_draw(b, plates)
{
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = radar_orange;
    ctx.strokeStyle = '#fff4e0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(0, -6);
    ctx.lineTo(-10, 0);
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    radar_plate(b, 34, `MISSILE ${radar_distance_text(b.d)}`, radar_orange, plates);
}

// A marker's words on a dark plate `back` px from it toward the window's centre, kept inside the window; left out
// where it would cover one of `plates` (the rects drawn before) or the HUD
function radar_plate(m, back, text, color, plates)
{
    ctx.font = '700 12px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (!radar_text_widths.has(text)) {
        if (radar_text_widths.size > 400) {
            radar_text_widths.clear();
        }
        radar_text_widths.set(text, ctx.measureText(text).width);
    }
    const w = radar_text_widths.get(text) + 14;
    const x = clamp(m.x - Math.cos(m.angle)*(back + w*0.3), w/2 + 4, hud_layout.width - w/2 - 4);
    const y = clamp(m.y - Math.sin(m.angle)*back, 14, hud_layout.height - 14);
    const rect = {left: x - w/2 - 3, right: x + w/2 + 3, top: y - 12, bottom: y + 12};
    if (plates.some(v => hud_rects_hit(rect, v)) || hud_layout.rects.some(v => hud_rects_hit(rect, v))) {
        return;
    }
    plates.push(rect);
    ctx.fillStyle = 'rgba(4, 8, 15, 0.78)';
    ctx.strokeStyle = `${color}99`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - w/2 + 0.5, y - 10 + 0.5, w, 20, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(text, x, y + 1);
}
