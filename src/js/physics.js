function damage_ore(v, amount)
{
    const alive = v.hp > 0;
    physics_base_damage_ore(v, amount);
    if (alive && (v.hp <= 0) && (campaign.world === 2) && (cargo_count() < cargo_capacity())) {
        campaign.cargo.ore++;
        save_checkpoint();
    }
}

function magnetic_radius()
{
    return (45 + upgrades.magnet*110)*current_world_rules().magnet;
}

function generate_map()
{
    physics_base_generate_map();
    generate_environment();
    refresh_mining_resources(true);
    generate_drifting_debris();
}

function expedition_base_reset_run(resume = false)
{
    const saved = (resume && checkpoint?.physics) ? clone(checkpoint.physics) : null;
    // read now: the reset below saves along the way, and the checkpoint would no longer hold them
    const guide = saved ? clone(checkpoint.guide || null) : null;
    const route = saved ? clone(checkpoint.route || {points: [], loop: false}) : null;
    physics_base_reset_run(resume);
    if (saved) {
        player.heat = clamp(Number(saved.heat) || 0, 0, 100);
        player.overheated = !!saved.overheated;
        environment_time = Math.max(0, Number(saved.time) || 0);
        player.radiation_dose = clamp(Number(saved.dose) || 0, 0, 100);
        player.dash_cd = clamp(Number(saved.turbo_cd) || 0, 0, dash_cooldown());
        player.turbo_fuel = clamp(
            Number.isFinite(saved.turbo_fuel) ? saved.turbo_fuel : (saved.turbo_remaining > 0) ? saved.turbo_remaining : turbo_duration(),
            0,
            turbo_duration()
        );
        player.dash_time = 0;
        player.turbo_active = false;
        player.turbo_heading = Number.isFinite(saved.turbo_heading) ? saved.turbo_heading : player.angle;
        // the guide's marker and your route, before the save below writes the checkpoint again
        guide_manual = guide;
        waypoints = route.points;
        waypoints_loop = !!route.loop;
        save_checkpoint();
    }
    update_hud();
}

// Arriving in a world: its banner, in its colour, high on the screen
function show_world_arrival(title)
{
    const r = current_world_rules();
    show_banner('world', `World ${campaign.world + 1} · arrived`, worlds[campaign.world].name, `${r.name} · ${r.summary}`, 4.5);
}

function render_celestial_body(body)
{
    const px = (body.x - camera.x)*zoom;
    const py = (body.y - camera.y)*zoom;
    const diam = body.diam*zoom;
    const radius = diam*0.437;
    const id = body.primary ? campaign.world : 2;
    if ((px + diam < 0) || (px - diam > W) || (py + diam < 0) || (py - diam > H)) {
        return;
    }
    // The designer's planet: its disc as wide as today's, a little see-through so it stays in the background
    const art = body.primary && world_art(`planet-${world_slug()}`);
    if (art && sprite_draw_box(art, null, diam*0.913, px, py, 0, 0.85)) {
        return;
    }
    const sky = ensure_world_visuals(body.texture);
    ctx.save();
    if (body.primary && ((id === 1) || (id === 7))) {
        ctx.translate(px, py);
        ctx.rotate((id === 1) ? -0.35 : -0.15);
        ctx.scale(1, 0.32);
        ctx.strokeStyle = (id === 1) ? '#c0f1a040' : '#c596ee44';
        ctx.lineWidth = (id === 1) ? 30 : 22;
        ctx.beginPath();
        ctx.arc(0, 0, radius*1.42, 0, Math.PI*2);
        ctx.stroke();
        ctx.strokeStyle = (id === 1) ? '#8ad39333' : '#ffc2de55';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, radius*1.58, 0, Math.PI*2);
        ctx.stroke();
        ctx.restore();
        ctx.save();
    }
    if (body.primary && (id === 6)) {
        const g = ctx.createRadialGradient(px, py, radius*0.85, px, py, radius*1.8);
        g.addColorStop(0, '#ffac5833');
        g.addColorStop(0.4, '#ff552b17');
        g.addColorStop(1, '#ff552b00');
        ctx.fillStyle = g;
        ctx.fillRect(px - radius*1.8, py - radius*1.8, radius*3.6, radius*3.6);
        ctx.strokeStyle = '#ffb77018';
        for (let i = 0; i < 9; ++i) {
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(px, py, radius*(1.05 + i*0.065), radius*(1.05 + i*0.025), clock*0.02 + i*0.4, 0, Math.PI*1.3);
            ctx.stroke();
        }
    }
    ctx.globalAlpha = body.primary ? ((id === 6) ? 0.64 : (id === 7) ? 0.95 : 0.7) : 0.4;
    ctx.drawImage(sky.texture, px - diam/2, py - diam/2, diam, diam);
    ctx.restore();
}

function render_world_fields()
{
    ctx.save();
    for (const world_zone of world_zones) {
        if (!in_view(world_zone, world_zone.r + 30)) {
            continue;
        }
        const s = zone_state(world_zone);
        const color = (world_zone.type === 'storm') ? blue : '#ff9469';
        ctx.fillStyle = `${color}${s.active ? '26' : s.warning ? '18' : '08'}`;
        ctx.strokeStyle = `${color}${s.active ? 'aa' : s.warning ? '88' : '33'}`;
        ctx.lineWidth = s.active ? 2 : 1;
        ctx.setLineDash(s.active ? [] : [8, 12]);
        ctx.beginPath();
        ctx.arc(world_zone.x, world_zone.y, world_zone.r, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.font = 'bold 10px ui-monospace,monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${(world_zone.type === 'storm') ? 'ION FIELD' : 'SOLAR FIELD'} / ${s.active ? `ACTIVE ${Math.ceil(s.remaining)}s` : s.warning ? `WARNING ${Math.ceil(s.remaining - 4)}s` : 'CALM'}`,
            world_zone.x,
            world_zone.y - world_zone.r - 18
        );
        if (s.active) {
            ctx.strokeStyle = `${color}66`;
            for (let i = 0; i < 4; ++i) {
                const a = (i*Math.PI)/2 + environment_time*0.2;
                ctx.beginPath();
                ctx.moveTo(world_zone.x + Math.cos(a)*world_zone.r*0.8, world_zone.y + Math.sin(a)*world_zone.r*0.8);
                ctx.lineTo(world_zone.x + Math.cos(a + 0.3)*world_zone.r*0.35, world_zone.y + Math.sin(a + 0.3)*world_zone.r*0.35);
                ctx.lineTo(world_zone.x + Math.cos(a + 0.6)*world_zone.r*0.1, world_zone.y + Math.sin(a + 0.6)*world_zone.r*0.1);
                ctx.stroke();
            }
        }
    }
    if (campaign.world === 1) {
        const f = world_flow(player);
        const a = Math.atan2(f.y, f.x);
        ctx.strokeStyle = '#9dff9b22';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; ++i) {
            const x = camera.x + (W/zoom)*(0.1 + i*0.16);
            const y = camera.y + (H/zoom)*0.75;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(a)*60, y + Math.sin(a)*60);
            ctx.stroke();
        }
    }
    ctx.restore();
}

function expedition_base_render_navigation_objects()
{
    render_gravity_fields();
    physics_base_render_navigation_objects();
    render_world_fields();
}

function render_local_map_canvas(map)
{
    render_chart_local(map);
}

function open_world_rules()
{
    nav_tab = 'rules';
    if (state !== 'navigation') {
        toggle_navigation();
    }
    else {
        render_navigation();
    }
}

function render_navigation()
{
    physics_base_render_navigation();
    if (nav_tab === 'jobs') {
        set_hidden(document.getElementById('route_briefing'), true);
        document.getElementById('navigation_chart').classList.add('hidden');
        render_mission_plan(document.getElementById('nav_content'));
        return;
    }
    if (nav_tab === 'trade') {
        document.getElementById('navigation_chart').classList.add('hidden');
        render_trade_intel(document.getElementById('nav_content'));
        return;
    }
    if (nav_tab === 'worlds') {
        const parent = document.getElementById('nav_content');
        const children = Array.from(parent.children);
        for (let i = 0, end = children.length; i < end; ++i) {
            const c = children[i];
            if (!worlds[i]) {
                continue;
            }
            append_world_brief(c, i);
        }
    }
    if (nav_tab === 'local') {
        render_local_route_brief(document.getElementById('navigation_chart'));
    }
    if (nav_tab === 'help') {
        card(
            document.getElementById('nav_content'),
            'Sustained turbo and environment',
            'Hold Shift to apply turbo thrust. Release Shift to disengage; the remaining booster reservoir recharges after a short cooling delay. Steering remains active, with wider turns at high speed. You can still take damage while boosting. Radioactive worlds accumulate dose outside the 500 m station sanctuary. Radiation lining and protected hulls reduce dose; docking decontaminates the ship.',
            'MODULES: TURBO DRIVE · BOOSTER RESERVOIR · RADIATION LINING · VECTOR STABILIZERS · REACTOR COOLING'
        );
    }
    if (nav_tab !== 'rules') {
        return;
    }
    document.getElementById('navigation_chart').classList.add('hidden');
    const parent = document.getElementById('nav_content');
    parent.replaceChildren();
    for (let i = 0, end = world_rules.length; i < end; ++i) {
        const world_rule = world_rules[i];
        function on_plan() {
            track_world(i);
            nav_tab = 'worlds';
            render_navigation();
        }
        const c = card(
            parent,
            `${worlds[i].name} / ${world_rule.name}`,
            `${world_rule.details.join(' ')} ${expedition_conditions[i].advice}`,
            `${world_brief(i)} · ${world_rule.prepare} Soundtrack: ${world_audio[i].title} / ${world_audio[i].bpm} BPM.`,
            (i === campaign.world) ? 'CURRENT WORLD' : 'PLAN TRAVEL',
            on_plan,
            i === campaign.world,
            (i === campaign.world) ? 'active' : ''
        );
    }
}

function physics_audio_base_update_hud()
{
    physics_base_update_hud();
    if (!player) {
        return;
    }
    const r = current_world_rules();
    hud_text(document.getElementById('world_rule_name'), r.name.toUpperCase());
    hud_text(document.getElementById('world_rule_status'), physics_status || r.summary);
    document.getElementById('brake_button').disabled = state !== 'playing';
}
document.getElementById('world_rules_button').addEventListener('click', open_world_rules);
document.getElementById('brake_button').addEventListener('click', brake_ship);
addEventListener('keydown', function (event) {
    if ((event.code === 'KeyB') && !settings_open && (state === 'playing')) {
        guide_flying = false;
        mouse_drive.active = false;
        mouse_drive.following = false;
    }
});
