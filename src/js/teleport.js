// Teleports, played with the designer's parts in worlds/<world>/: hop-burst, hop-trail, warp-burst and warp-ring. A hop
// between the gates of a pair keeps the world on screen: the ship is pulled into the gate, a comet crosses to the other
// one with the camera after it, and the ship leaves that gate the way it was flying. A jump through a world gate
// charges the gate, pulls the ship in with a flash, runs a tunnel of this world's rings and then the destination's, and
// flashes again on arrival.
const hop_duration = 0.9;
const warp_duration = 2.5;
const teleport_px = {'hop-burst': 512, 'hop-trail': 512, 'warp-burst': 1024, 'warp-ring': 1024};

function teleport_active()
{
    return !!jump;
}

// What a jump needs to be played, filled in as it starts: where the ship was, the camera's zoom, and for a hop the
// two gates, the arc between them and the point the ship leaves the exit gate for
function teleport_start(v)
{
    v.zoom0 = zoom_target ?? zoom;
    v.from_world = campaign.world;
    if (v.world !== undefined) {
        // the arcade jumps from where the ship is: it keeps its heading
        v.gate = v.gate || v.from;
        v.to_gate = (v.gate === v.from) ? v.angle : Math.atan2(v.gate.y - v.from.y, v.gate.x - v.from.x);
        return;
    }
    const exit = portals[v.local];
    const entry = v.gate || v.from;
    const moving = Math.hypot(v.vx, v.vy) > 30;
    const heading = moving ? Math.atan2(v.vy, v.vx) : v.angle;
    v.exit = exit;
    v.exit_point = {x: clamp(exit.x + Math.cos(heading)*130, 30, world.w - 30), y: clamp(exit.y + Math.sin(heading)*130, 30, world.h - 30)};
    v.heading = heading;
    // The arc bows to one side by a fifth of the distance
    const length = distance(entry, exit);
    v.bend = {x: (entry.x + exit.x)/2 - ((exit.y - entry.y)/length)*length*0.2, y: (entry.y + exit.y)/2 + ((exit.x - entry.x)/length)*length*0.2};
}

// After the jump: the zoom the player had, and on a hop the speed the ship came in with
function teleport_end(v)
{
    if (v.world === undefined) {
        player.vx = v.vx;
        player.vy = v.vy;
        player.angle = v.angle;
    }
    zoom_target = null;
    zoom_apply(v.zoom0);
}

// Each frame of a hop the camera eases out and follows the comet from gate to gate
function teleport_view()
{
    if (!teleport_active() || (jump.world !== undefined)) {
        return;
    }
    const p = clamp(jump.t/jump.duration, 0, 1);
    zoom = Math.max(0.4, jump.zoom0*(1 - 0.3*Math.sin(Math.PI*clamp((p - 0.1)/0.8, 0, 1))));
    const centre = hop_camera(p);
    camera.x = clamp(centre.x - W/zoom/2, 0, Math.max(0, world.w - W/zoom));
    camera.y = clamp(centre.y - H/zoom/2, 0, Math.max(0, world.h - H/zoom));
    performance_render_dirty = true;
}

function hop_camera(p)
{
    const entry = jump.gate || jump.from;
    if (p < 0.25) {
        return mix_point(jump.from, entry, ease_in_out(p/0.25));
    }
    if (p < 0.75) {
        return hop_comet(ease_in_out((p - 0.25)/0.5));
    }
    return mix_point(jump.exit, jump.exit_point, ease_out((p - 0.75)/0.25));
}

// The comet's head at u along the arc, and the way it flies
function hop_comet(u)
{
    const a = jump.gate || jump.from;
    const b = jump.exit;
    const c = jump.bend;
    return {
        x: (1 - u)*(1 - u)*a.x + 2*u*(1 - u)*c.x + u*u*b.x,
        y: (1 - u)*(1 - u)*a.y + 2*u*(1 - u)*c.y + u*u*b.y,
        angle: Math.atan2(2*(1 - u)*(c.y - a.y) + 2*u*(b.y - c.y), 2*(1 - u)*(c.x - a.x) + 2*u*(b.x - c.x)),
    };
}

// The extra turn of a gate's inner ring while a jump uses it: one full turn, so it ends where it would have been
function teleport_gate_spin(v)
{
    if (!teleport_active()) {
        return 0;
    }
    const p = jump.t/jump.duration;
    if (v === jump.gate) {
        return (jump.world !== undefined) ? Math.PI*4*ease_in(clamp(p/0.3, 0, 1)) : Math.PI*2*ease_in_out(clamp(p/0.5, 0, 1));
    }
    if (v === jump.exit) {
        return Math.PI*2*ease_in_out(clamp((p - 0.5)/0.5, 0, 1));
    }
    return 0;
}

// A visible gate asks for its jump's parts ahead, so the first frames of a jump have them ready
function teleport_warm(v, world_gate)
{
    if (world_gate) {
        teleport_raster(campaign.world, 'warp-burst', v.color);
        teleport_raster(campaign.world, 'warp-ring', null);
        teleport_raster(v.destination, 'warp-burst', null);
        teleport_raster(v.destination, 'warp-ring', null);
    }
    else {
        teleport_raster(campaign.world, 'hop-burst', v.color);
        teleport_raster(campaign.world, 'hop-trail', v.color);
    }
}

// A world's part, its accent painted `tint` (null keeps the world's own); null where the world
// has none, or while it loads
function teleport_raster(id, part, tint)
{
    const name = `worlds/${world_slug(id)}/${part}`;
    return sprite(name) ? sprite_raster(name, tint, teleport_px[part]) : null;
}

// Draws a part `size` units wide at x, y, turned to angle; a plain shape of its colour while there is no art
function teleport_draw(id, part, tint, size, x, y, angle, alpha)
{
    if (alpha <= 0.01) {
        return;
    }
    const raster = teleport_raster(id, part, tint);
    const color = tint || worlds[id].accent;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    if (raster) {
        ctx.drawImage(raster, -size/2, -size/2, size, size);
    }
    else if (part === 'warp-ring') {
        ctx.strokeStyle = color;
        ctx.lineWidth = size*0.03;
        ctx.beginPath();
        ctx.arc(0, 0, size*0.42, 0, Math.PI*2);
        ctx.stroke();
    }
    else if (part === 'hop-trail') {
        const g = ctx.createLinearGradient(-size*0.48, 0, size*0.36, 0);
        g.addColorStop(0, color_with_alpha(color, 0));
        g.addColorStop(1, color_with_alpha(color, 0.9));
        ctx.strokeStyle = g;
        ctx.lineCap = 'round';
        ctx.lineWidth = size*0.05;
        ctx.beginPath();
        ctx.moveTo(-size*0.48, 0);
        ctx.lineTo(size*0.36, 0);
        ctx.stroke();
    }
    else {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, size/2);
        g.addColorStop(0, '#ffffffdd');
        g.addColorStop(0.3, color_with_alpha(color, 0.55));
        g.addColorStop(1, color_with_alpha(color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, size/2, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.restore();
}

// The ship drawn stretched along its heading and thinned across it, as a gate pulls it in
function teleport_ship(x, y, angle, stretch, alpha)
{
    if (alpha <= 0.01) {
        return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(stretch, 1/(stretch*stretch));
    ctx.rotate(-angle);
    ship(0, 0, angle, alpha);
    ctx.restore();
}

// In the world, under the HUD: the gates' flares, the comet or the charged gate, and the ship in place of its usual
// drawing
function render_teleport()
{
    if (!teleport_active() || !player) {
        return;
    }
    ctx.save();
    if (jump.world === undefined) {
        render_hop(clamp(jump.t/jump.duration, 0, 1));
    }
    else {
        render_warp(clamp(jump.t/jump.duration, 0, 1));
    }
    ctx.restore();
}

function render_hop(p)
{
    const entry = jump.gate || jump.from;
    const id = campaign.world;
    // The ship is pulled into the entry gate, shrinking into a streak
    const pull = clamp(p/0.25, 0, 1);
    if (pull < 1) {
        const at = mix_point(jump.from, entry, ease_in(pull));
        teleport_ship(at.x, at.y, jump.angle, 1 + 2*pull, 1 - pull*pull);
    }
    ctx.globalCompositeOperation = 'lighter';
    hop_flare(id, entry, clamp((p - 0.12)/0.4, 0, 1));
    hop_flare(id, jump.exit, clamp((p - 0.6)/0.4, 0, 1));
    // The comet, as wide on screen whatever the zoom
    const u = clamp((p - 0.25)/0.5, 0, 1);
    if ((u > 0) && (u < 1)) {
        const head = hop_comet(ease_in_out(u));
        const size = 360/zoom;
        const anchor = sprite(`worlds/${world_slug(id)}/hop-trail`)?.points.head || {x: 0.36, y: 0};
        const x = head.x - (Math.cos(head.angle)*anchor.x - Math.sin(head.angle)*anchor.y)*size;
        const y = head.y - (Math.sin(head.angle)*anchor.x + Math.cos(head.angle)*anchor.y)*size;
        teleport_draw(id, 'hop-trail', jump.color, size, x, y, head.angle, Math.min(1, u*8, (1 - u)*8));
    }
    ctx.globalCompositeOperation = 'source-over';
    // and leaves the exit gate the way it was flying
    const leaving = clamp((p - 0.75)/0.25, 0, 1);
    if (leaving > 0) {
        const at = mix_point(jump.exit, jump.exit_point, ease_out(leaving));
        teleport_ship(at.x, at.y, jump.angle, 3 - 2*leaving, Math.sqrt(leaving));
    }
}

// A gate's flare, q from 0 to 1: it grows at once and fades slowly
function hop_flare(id, v, q)
{
    if ((q <= 0) || (q >= 1)) {
        return;
    }
    const alpha = (q < 0.2) ? q/0.2 : 1 - (q - 0.2)/0.8;
    teleport_draw(id, 'hop-burst', jump.color, 110 + 170*ease_out(q), v.x, v.y, q*0.8, alpha);
}

function render_warp(p)
{
    if (jump.switched) {
        // Arrival: the destination's flash, and the ship sliding out of it
        const q = clamp((p - 0.76)/0.24, 0, 1);
        const back = {x: player.x - Math.cos(player.angle)*90, y: player.y - Math.sin(player.angle)*90};
        ctx.globalCompositeOperation = 'lighter';
        teleport_draw(campaign.world, 'warp-burst', null, 220 + 380*ease_out(q), back.x, back.y, q*0.5, (q < 0.15) ? q/0.15 : 1 - (q - 0.15)/0.85);
        ctx.globalCompositeOperation = 'source-over';
        const at = mix_point(back, player, ease_out(q));
        teleport_ship(at.x, at.y, player.angle, 3 - 2*q, Math.sqrt(q));
        return;
    }
    const gate = jump.gate;
    const charge = clamp(p/0.3, 0, 1);
    // The gate's opening fills with the destination's colour
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(gate.x, gate.y, 0, gate.x, gate.y, 70);
    g.addColorStop(0, color_with_alpha(jump.color, 0.85*ease_in(charge)));
    g.addColorStop(1, color_with_alpha(jump.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(gate.x, gate.y, 70, 0, Math.PI*2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // The ship turns to the gate, slides in and stretches into a streak
    if (charge < 1) {
        const turn = ease_in_out(clamp(charge*2, 0, 1));
        const angle = jump.angle + Math.atan2(Math.sin(jump.to_gate - jump.angle), Math.cos(jump.to_gate - jump.angle))*turn;
        const at = mix_point(jump.from, gate, ease_in(charge));
        const streak = clamp((charge - 0.6)/0.4, 0, 1);
        teleport_ship(at.x, at.y, angle, 1 + 3*streak, 1 - streak*streak);
    }
    const q = clamp((p - 0.27)/0.2, 0, 1);
    if ((q > 0) && (q < 1)) {
        ctx.globalCompositeOperation = 'lighter';
        teleport_draw(jump.from_world, 'warp-burst', jump.color, 200 + 500*ease_out(q), gate.x, gate.y, q*0.6, (q < 0.15) ? q/0.15 : 1 - (q - 0.15)/0.85);
    }
}

// Over the screen: the warp tunnel and its flashes, and the jump's name
function render_teleport_screen()
{
    if (!jump || (jump.world === undefined)) {
        return;
    }
    const p = clamp(jump.t/jump.duration, 0, 1);
    const dark = clamp((p - 0.3)/0.06, 0, 1)*clamp((0.82 - p)/0.06, 0, 1);
    ctx.save();
    if (dark > 0) {
        ctx.fillStyle = `rgba(3,6,20,${dark*0.96})`;
        ctx.fillRect(0, 0, W, H);
        render_warp_tunnel(p, dark);
    }
    // White flashes as the ship goes in and comes out
    const flare = Math.max(0, 1 - Math.abs(p - 0.31)/0.05)*0.75 + Math.max(0, 1 - Math.abs(p - 0.8)/0.05)*0.45;
    if (flare > 0) {
        ctx.fillStyle = `rgba(240,252,255,${flare})`;
        ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
}

// Rings rushing toward the viewer, this world's first and then the destination's, the ship flying through them
function render_warp_tunnel(p, alpha)
{
    const tunnel = (p - 0.3)*jump.duration;
    const switch_at = 0.2*jump.duration;
    const count = full_fx ? 9 : 5;
    ctx.save();
    ctx.translate(W/2, H/2);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < count; ++i) {
        // q is the ring's age from 0 (far, small) to 1 (past the viewer)
        const q = (i/count + tunnel*0.8) % 1;
        const born = tunnel - q/0.8;
        const id = (born < switch_at) ? jump.from_world : jump.world;
        const size = 70*Math.exp(q*4);
        const turn = i*0.7 + tunnel*((i % 2) ? 0.4 : -0.4);
        teleport_draw(id, 'warp-ring', null, size, 0, 0, turn, alpha*0.8*Math.min(1, q*5)*Math.min(1, (1 - q)*2.2));
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.scale(zoom, zoom);
    ship(0, Math.sin(clock*3)*4, -Math.PI/2, alpha);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0fffc';
    ctx.font = 'bold 18px ui-monospace,monospace';
    ctx.fillText(jump.label, W/2, H*0.75);
    ctx.font = '10px ui-monospace,monospace';
    ctx.fillStyle = jump.color;
    ctx.fillText((p < 0.5) ? `LEAVING ${worlds[jump.from_world].name.toUpperCase()}` : `ARRIVING AT ${worlds[jump.world].name.toUpperCase()}`, W/2, H*0.75 + 25);
    ctx.restore();
}

function mix_point(a, b, t)
{
    return {x: a.x + (b.x - a.x)*t, y: a.y + (b.y - a.y)*t};
}

function ease_in(t)
{
    return t*t;
}

function ease_out(t)
{
    return 1 - (1 - t)*(1 - t);
}

function ease_in_out(t)
{
    return t*t*(3 - 2*t);
}
