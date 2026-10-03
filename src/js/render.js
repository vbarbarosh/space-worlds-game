function base_damage_ore(v, amount)
{
    if (v.hp <= 0) {
        return;
    }
    v.hp -= amount;
    v.flash = 0.1;
    if (v.hp > 0) {
        return;
    }
    burst(v.x, v.y, gold, 25, 150);
    ring(v.x, v.y, gold, v.r*2, 0.4);
    explode(v.x, v.y, v.r*1.5, '#c9924e');
    sfx('mine', 1, v);
    label(v.x, v.y - 25, 'ORE EXTRACTED', gold);
    for (let i = 0; i < 3; ++i) {
        drop_pickup(v.x + rand(-25, 25), v.y + rand(-25, 25), 'artifact', 4 + Math.floor(wave/5));
    }
    if (Math.random() < 0.13) {
        drop_pickup(v.x, v.y, 'energy');
    }
}

function base_render_navigation_objects()
{
    for (const mining_field of mining_fields) {
        if (!in_view(mining_field, mining_field.r + 80)) {
            continue;
        }
        ctx.save();
        ctx.strokeStyle = '#ffd16e24';
        ctx.setLineDash([4, 16]);
        ctx.beginPath();
        ctx.arc(mining_field.x, mining_field.y, mining_field.r, 0, Math.PI*2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffd16e88';
        ctx.font = '10px ui-monospace,monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`MINING FIELD ${String(mining_field.id + 1).padStart(2, '0')}`, mining_field.x, mining_field.y - mining_field.r - 20);
        ctx.restore();
    }
    for (const ore_node of ore_nodes) {
        render_world_ore(ore_node);
    }
    render_ore_scanner();
    render_drones();
    for (const portal of portals) {
        if (!in_view(portal, 120)) {
            continue;
        }
        if (view_mode === 'rendered') {
            render_gate_shell(portal, false);
        }
        ctx.save();
        ctx.translate(portal.x, portal.y);
        ctx.shadowColor = portal.color;
        ctx.shadowBlur = full_fx ? 18 : 0;
        ctx.strokeStyle = portal.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, portal.r, clock, clock + Math.PI*1.65);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, portal.r + 15, -clock, -clock + Math.PI*1.6);
        ctx.stroke();
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, portal.r);
        g.addColorStop(0, `${portal.color}88`);
        g.addColorStop(1, `${portal.color}04`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, portal.r, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = 'bold 14px ui-monospace,monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = portal.color;
        ctx.fillText(portal.label, 0, 5);
        ctx.font = '9px ui-monospace,monospace';
        ctx.fillText(`JUMP GATE ${portal.label}`, 0, portal.r + 34);
        ctx.restore();
    }
    for (const black_hole of black_holes) {
        if (!in_view(black_hole, black_hole.radius)) {
            continue;
        }
        if (view_mode === 'rendered') {
            render_singularity_surface(black_hole);
            continue;
        }
        ctx.save();
        const g = ctx.createRadialGradient(black_hole.x, black_hole.y, black_hole.core, black_hole.x, black_hole.y, black_hole.radius);
        g.addColorStop(0, '#ff5baf35');
        g.addColorStop(0.45, '#8d9cff0d');
        g.addColorStop(1, '#8d9cff00');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(black_hole.x, black_hole.y, black_hole.radius, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#ff5baf22';
        ctx.setLineDash([3, 17]);
        ctx.beginPath();
        ctx.arc(black_hole.x, black_hole.y, black_hole.radius, 0, Math.PI*2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#ff5baf55';
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; ++i) {
            const a = clock*0.4 + black_hole.phase + (i*Math.PI)/3;
            ctx.beginPath();
            ctx.arc(black_hole.x, black_hole.y, black_hole.core + 35 + i*22, a, a + Math.PI*0.9);
            ctx.stroke();
        }
        ctx.shadowColor = pink;
        ctx.shadowBlur = full_fx ? 28 : 0;
        ctx.strokeStyle = '#ffb77b';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(black_hole.x, black_hole.y, black_hole.core*1.8, black_hole.core*0.55, -0.3, 0, Math.PI*2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(black_hole.x, black_hole.y, black_hole.core, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = pink;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = pink;
        ctx.font = 'bold 10px ui-monospace,monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BLACK HOLE / FATAL CORE', black_hole.x, black_hole.y + black_hole.core + 72);
        ctx.restore();
    }
}

function in_view(v, padding = 150)
{
    return (v.x > camera.x - padding) && (v.x < camera.x + W/zoom + padding) && (v.y > camera.y - padding) && (v.y < camera.y + H/zoom + padding);
}

function visual_base_render_map()
{
    ctx.save();
    ctx.strokeStyle = '#6cf8ec55';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, world.w - 24, world.h - 24);
    for (const v of scenery) {
        if (!in_view(v, v.r)) {
            continue;
        }
        ctx.globalAlpha = 0.27;
        const color = (v.type === 0) ? '#6cf8ec' : (v.type === 1) ? '#8d9cff' : '#758ba1';
        if (v.type === 0) {
            polygon(v.x, v.y, v.r, 6, v.angle, color, '#0a152100');
            polygon(v.x, v.y, v.r*0.75, 6, v.angle, color, '#0a152100');
            ctx.font = '9px ui-monospace,monospace';
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.fillText(`RELAY / ${Math.floor(v.x/100)}-${Math.floor(v.y/100)}`, v.x, v.y);
        }
        else if (v.type === 1) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(v.x, v.y, v.r, 0, Math.PI*2);
            ctx.arc(v.x, v.y, v.r*0.8, 0, Math.PI*2);
            ctx.stroke();
        }
        else {
            polygon(v.x, v.y, v.r*0.4, 5, v.angle, color, '#122235');
        }
    }
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = cyan;
    ctx.font = '10px ui-monospace,monospace';
    ctx.textAlign = 'left';
    for (let x = Math.floor(camera.x/800)*800; x < camera.x + W/zoom + 800; x += 800) {
        for (let y = Math.floor(camera.y/800)*800; y < camera.y + H/zoom + 800; y += 800) {
            ctx.fillText(`GRID ${Math.floor(x/800)} : ${Math.floor(y/800)}`, x + 16, y + 22);
        }
    }
    ctx.restore();
}

function base_render_minimap()
{
    if (!player || !['playing', 'paused', 'inventory', 'upgrade', 'victory'].includes(state)) {
        return;
    }
    const viewport_width = (view_mode === 'cockpit') ? width : W;
    const w = (viewport_width < 800) ? 165 : 186;
    const h = (viewport_width < 800) ? 125 : 140;
    const x = viewport_width - w - 22;
    const y = 87;
    const sx = w/world.w;
    const sy = (h - 25)/world.h;
    ctx.save();
    ctx.fillStyle = '#080e1be8';
    ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
    ctx.strokeStyle = '#6cf8ec33';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y + 20, w, h - 20);
    ctx.font = '9px ui-monospace,monospace';
    ctx.fillStyle = '#9ba8c5';
    ctx.textAlign = 'left';
    ctx.fillText('WORLD MAP', x, y + 8);
    ctx.fillStyle = '#ffd16e';
    for (const pickup of pickups) {
        if (!pickup.cache) {
            continue;
        }
        ctx.fillRect(x + pickup.x*sx, y + 23 + pickup.y*sy, 2, 2);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y + 23, w, h - 25);
    ctx.clip();
    for (const black_hole of black_holes) {
        ctx.strokeStyle = pink;
        ctx.beginPath();
        ctx.arc(x + black_hole.x*sx, y + 23 + black_hole.y*sy, Math.max(4, gravity_reach(black_hole)*sx), 0, Math.PI*2);
        ctx.stroke();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x + black_hole.x*sx, y + 23 + black_hole.y*sy, 3, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.restore();
    for (const portal of portals) {
        ctx.strokeStyle = portal.color;
        ctx.beginPath();
        ctx.arc(x + portal.x*sx, y + 23 + portal.y*sy, 4, 0, Math.PI*2);
        ctx.stroke();
        ctx.fillStyle = portal.color;
        ctx.font = '7px ui-monospace,monospace';
        ctx.fillText(portal.label, x + portal.x*sx + 5, y + 23 + portal.y*sy + 3);
    }
    for (const mining_field of mining_fields) {
        ctx.fillStyle = '#cba06a';
        ctx.fillRect(x + mining_field.x*sx - 2, y + 23 + mining_field.y*sy - 2, 4, 4);
    }
    ctx.fillStyle = pink;
    for (const enemy of enemies) {
        ctx.fillRect(x + enemy.x*sx - 1, y + 23 + enemy.y*sy - 1, (enemy.type === 'boss') ? 5 : 2, (enemy.type === 'boss') ? 5 : 2);
    }
    ctx.strokeStyle = '#6cf8ec66';
    ctx.strokeRect(x + camera.x*sx, y + 23 + camera.y*sy, (W/zoom)*sx, (H/zoom)*sy);
    ctx.fillStyle = cyan;
    ctx.beginPath();
    ctx.arc(x + player.x*sx, y + 23 + player.y*sy, 3, 0, Math.PI*2);
    ctx.fill();
    if (mouse_drive.active) {
        ctx.strokeStyle = cyan;
        ctx.beginPath();
        ctx.arc(x + mouse_drive.x*sx, y + 23 + mouse_drive.y*sy, 4, 0, Math.PI*2);
        ctx.stroke();
    }
    ctx.restore();
}

function base_render_screen_controls()
{
    ctx.save();
    if (mouse_drive.active) {
        const x = (mouse_drive.x - camera.x)*zoom;
        const y = (mouse_drive.y - camera.y)*zoom;
        ctx.strokeStyle = '#6cf8ec88';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo((player.x - camera.x)*zoom, (player.y - camera.y)*zoom);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI*2);
        ctx.stroke();
    }
    if (joystick.active) {
        ctx.strokeStyle = '#6cf8ec44';
        ctx.fillStyle = '#6cf8ec11';
        ctx.beginPath();
        ctx.arc(joystick.x, joystick.y, 55, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#6cf8ec66';
        ctx.beginPath();
        ctx.arc(joystick.x + joystick.dx*35, joystick.y + joystick.dy*35, 18, 0, Math.PI*2);
        ctx.fill();
    }
    if (player && (state === 'playing')) {
        for (const enemy of enemies) {
            if (in_view(enemy, 0) || !((enemy.type === 'boss') || ((spawn_left === 0) && (enemies.length < 7)))) {
                continue;
            }
            const px = (enemy.x - camera.x)*zoom;
            const py = (enemy.y - camera.y)*zoom;
            const x = clamp(px, 24, W - 24);
            const y = clamp(py, 190, H - 145);
            const a = Math.atan2(py - y, px - x);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(a);
            ctx.fillStyle = (enemy.type === 'boss') ? pink : gold;
            ctx.beginPath();
            ctx.moveTo(9, 0);
            ctx.lineTo(-5, -5);
            ctx.lineTo(-5, 5);
            ctx.fill();
            ctx.restore();
        }
    }
    if (stasis_time > 0) {
        ctx.fillStyle = '#8d9cff0a';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#8d9cff88';
        ctx.lineWidth = 2;
        ctx.strokeRect(12, 12, W - 24, H - 24);
    }
    ctx.restore();
    render_minimap();
}

function render()
{
    if ((view_mode === 'cockpit') && player && (state !== 'menu')) {
        render_cabin();
        return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (ox || oy) {
        ctx.fillStyle = '#080b17';
        ctx.fillRect(0, 0, width, height);
    }
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    if (full_fx && (shake > 0)) {
        ctx.translate(rand(-shake, shake)*0.4, rand(-shake, shake)*0.4);
    }
    draw_background();
    if (state === 'menu') {
        ctx.globalAlpha = 0.25;
        for (let i = 0; i < 5; ++i) {
            const x = W*0.76 + Math.cos(clock*0.15 + i*1.256)*W*0.18;
            const y = H*0.5 + Math.sin(clock*0.15 + i*1.256)*H*0.32;
            polygon(x, y, 12, 4, clock*0.4, pink);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
        return;
    }
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-camera.x, -camera.y);
    render_map();
    render_navigation_objects();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const v of trail) {
        if (in_view(v, 50)) {
            ship(v.x, v.y, v.angle, (v.life/v.total)*0.18, true);
        }
    }
    for (const ring of rings) {
        const progress = 1 - ring.life/ring.total;
        ctx.globalAlpha = (1 - progress)*0.7;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 3*(1 - progress) + 1;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, Math.max(1, ring.max_r*(1 - Math.pow(1 - progress, 3))), 0, Math.PI*2);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    render_projectiles();
    for (const particle of particles) {
        if (!in_view(particle, 8)) {
            continue;
        }
        ctx.globalAlpha = clamp(particle.life/particle.total, 0, 1);
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x - particle.size/2, particle.y - particle.size/2, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    render_hostile_marks();
    render_enemies();
    render_explosions();
    render_pickups();
    render_equipment();
    render_hazards();
    if (player && (state !== 'dead')) {
        if (player.invincible > 0) {
            ctx.strokeStyle = '#6cf8ec55';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(player.x, player.y, ship_halo() + Math.sin(clock*10)*2, 0, Math.PI*2);
            ctx.stroke();
        }
        ship(player.x, player.y, player.angle, (player.invincible > 0) ? 0.65 + Math.sin(clock*25)*0.25 : 1);
        if (player.energy >= 100) {
            ctx.strokeStyle = '#ff5baf55';
            ctx.beginPath();
            ctx.arc(player.x, player.y, ship_halo() + 6, clock*2, clock*2 + Math.PI*1.4);
            ctx.stroke();
        }
    }
    for (const label of labels) {
        if (!in_view(label, 100)) {
            continue;
        }
        ctx.globalAlpha = Math.min(1, label.life*2);
        ctx.font = 'bold 12px ui-monospace,monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = label.color;
        ctx.fillText(label.text, label.x, label.y);
    }
    ctx.globalAlpha = 1;
    if (pointer.active && (time - pointer.last < 2) && (state === 'playing') && !mouse_drive.active) {
        ctx.strokeStyle = '#6cf8ec88';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 9, 0, Math.PI*2);
        ctx.moveTo(pointer.x - 14, pointer.y);
        ctx.lineTo(pointer.x - 6, pointer.y);
        ctx.moveTo(pointer.x + 6, pointer.y);
        ctx.lineTo(pointer.x + 14, pointer.y);
        ctx.moveTo(pointer.x, pointer.y - 14);
        ctx.lineTo(pointer.x, pointer.y - 6);
        ctx.moveTo(pointer.x, pointer.y + 6);
        ctx.lineTo(pointer.x, pointer.y + 14);
        ctx.stroke();
    }
    ctx.restore();
    render_screen_controls();
    if (full_fx && (flash > 0)) {
        ctx.fillStyle = `rgba(255,91,175,${flash*0.35})`;
        ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
}

function update_equipment(dt)
{
    drone_cd -= dt;
    if (upgrades.drone && (drone_cd <= 0)) {
        drone_cd = 0.42;
        for (let i = 0; i < upgrades.drone; ++i) {
            const a = time*1.7 + (i/upgrades.drone)*Math.PI*2;
            const x = player.x + Math.cos(a)*46;
            const y = player.y + Math.sin(a)*46;
            let target = null;
            let near = 550;
            for (const enemy of enemies) {
                const d = Math.hypot(enemy.x - x, enemy.y - y);
                if ((enemy.hp > 0) && (d < near)) {
                    near = d;
                    target = enemy;
                }
            }
            if (target) {
                const aim = Math.atan2(target.y - y, target.x - x);
                bullets.push({x, y, vx: Math.cos(aim)*680, vy: Math.sin(aim)*680, life: 1.5, damage: 10 + upgrades.damage*3, r: 3, homing: true});
            }
        }
    }
}

function render_equipment()
{
    if (!player || (state === 'dead')) {
        return;
    }
    ctx.save();
    if (upgrades.magnet) {
        ctx.strokeStyle = '#ffd16e1c';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 14]);
        ctx.beginPath();
        ctx.arc(player.x, player.y, magnetic_radius(), clock*0.4, clock*0.4 + Math.PI*2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#ffd16e70';
        ctx.beginPath();
        ctx.arc(player.x, player.y, ship_halo() + 13, clock*1.5, clock*1.5 + 0.8);
        ctx.stroke();
    }
    if (player.shield > 0) {
        ctx.strokeStyle = '#8d9cff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, ship_halo() + 3, -Math.PI/2, -Math.PI/2 + (Math.PI*2*player.shield)/shield_max());
        ctx.stroke();
        shield_shimmer(player, ship_halo() + 3);
    }
    for (let i = 0; i < upgrades.drone; ++i) {
        const a = time*1.7 + (i/upgrades.drone)*Math.PI*2;
        polygon(player.x + Math.cos(a)*46, player.y + Math.sin(a)*46, 6, 4, -a, blue, '#18263c');
    }
    ctx.restore();
}

function render_hazards()
{
    for (const hazard of hazards) {
        const active = hazard.life < 1.8;
        ctx.save();
        ctx.strokeStyle = active ? '#ff5bafaa' : '#ffd16e77';
        ctx.fillStyle = active ? '#ff5baf22' : '#ffd16e0a';
        ctx.setLineDash(active ? [] : [6, 8]);
        ctx.beginPath();
        ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '9px ui-monospace,monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = active ? pink : gold;
        ctx.fillText(active ? 'ION SURGE' : `SURGE IN ${Math.ceil(hazard.life - 1.8)}`, hazard.x, hazard.y);
        ctx.restore();
    }
}
