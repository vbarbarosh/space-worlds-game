function visual_random_from_seed(seed)
{
    return function () {
        seed = (seed*1664525 + 1013904223) >>> 0;
        return seed/4294967296;
    };
}

function ensure_world_visuals(id)
{
    if (world_visual_cache[id]) {
        return world_visual_cache[id];
    }
    const random = visual_random_from_seed(7813 + id*3989);
    const out = {clouds: [], motes: [], texture: null};
    for (let i = 0; i < 9; ++i) {
        out.clouds.push({x: random()*1.5 - 0.25, y: random()*1.5 - 0.25, r: 0.2 + random()*0.5, phase: random()*6.28});
    }
    for (let i = 0; i < 140; ++i) {
        out.motes.push({x: random(), y: random(), size: 0.5 + random()*2.5, angle: random()*6.28, phase: random()*6.28, speed: 5 + random()*30});
    }
    out.texture = create_world_planet(id);
    world_visual_cache[id] = out;
    return out;
}

function create_world_planet(id)
{
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 640;
    const draw = canvas.getContext('2d');
    const r = 279;
    const x = 320;
    const y = 320;
    const random = visual_random_from_seed(418 + id*5349);
    const look = world_looks[id];
    const outer = draw.createRadialGradient(x, y, r - 4, x, y, 318);
    outer.addColorStop(0, `${worlds[id].accent}55`);
    outer.addColorStop(0.45, `${worlds[id].accent}18`);
    outer.addColorStop(1, `${worlds[id].accent}00`);
    draw.fillStyle = outer;
    draw.fillRect(0, 0, 640, 640);
    draw.save();
    draw.beginPath();
    draw.arc(x, y, r, 0, Math.PI*2);
    draw.clip();
    const g = draw.createRadialGradient(x - 115, y - 100, 15, x + 40, y + 30, 390);
    g.addColorStop(0, (id === 6) ? '#efa343' : (id === 7) ? '#251732' : worlds[id].planet);
    g.addColorStop(0.65, (id === 6) ? '#a32918' : (id === 7) ? '#05050e' : worlds[id].color);
    g.addColorStop(1, '#010309');
    draw.fillStyle = g;
    draw.fillRect(0, 0, 640, 640);
    if (id === 0) {
        for (let i = 0; i < 29; ++i) {
            const px = 85 + random()*470;
            const py = 70 + random()*510;
            draw.fillStyle = (i % 3) ? '#43826766' : '#80b7ab55';
            draw.beginPath();
            draw.ellipse(px, py, 20 + random()*70, 15 + random()*45, random()*6.28, 0, Math.PI*2);
            draw.fill();
        }
        draw.strokeStyle = '#d5ffff44';
        draw.lineWidth = 9;
        for (let i = 0; i < 14; ++i) {
            draw.beginPath();
            draw.ellipse(310, 80 + i*36, 210 + random()*100, 7 + random()*16, -0.18, 0, Math.PI);
            draw.stroke();
        }
    }
    else if (id === 1) {
        for (let i = 0; i < 22; ++i) {
            draw.strokeStyle = (i % 3) ? '#adff9b28' : '#0c302777';
            draw.lineWidth = 8 + random()*15;
            draw.beginPath();
            draw.ellipse(320, 42 + i*25, 340, 25, -0.15, 0, Math.PI);
            draw.stroke();
        }
        draw.strokeStyle = '#deffac55';
        for (let i = 0; i < 6; ++i) {
            draw.lineWidth = 3;
            draw.beginPath();
            draw.ellipse(220, 255, 47 + i*10, 16 + i*4, -0.3, 0, Math.PI*2);
            draw.stroke();
        }
    }
    else if (id === 2) {
        for (let i = 0; i < 105; ++i) {
            const px = 40 + random()*560;
            const py = 40 + random()*560;
            const size = 3 + random()*30;
            draw.fillStyle = '#39211d44';
            draw.strokeStyle = '#ffdd9d22';
            draw.lineWidth = 2;
            draw.beginPath();
            draw.ellipse(px, py, size, size*0.75, -0.3, 0, Math.PI*2);
            draw.fill();
            draw.stroke();
            draw.strokeStyle = '#fff0b033';
            draw.beginPath();
            draw.arc(px - 3, py - 2, size*0.82, 3.2, 4.9);
            draw.stroke();
        }
    }
    else if (id === 3) {
        for (let i = 0; i < 20; ++i) {
            draw.strokeStyle = (i % 2) ? '#98aaff25' : '#141f6f88';
            draw.lineWidth = 10;
            draw.beginPath();
            draw.ellipse(330, 40 + i*28, 335, 18 + (i % 3)*5, -0.26, 0, Math.PI);
            draw.stroke();
        }
        draw.strokeStyle = '#a9f2ff99';
        draw.lineWidth = 2;
        for (let i = 0; i < 22; ++i) {
            let px = 80 + random()*400;
            let py = 80 + random()*400;
            draw.beginPath();
            draw.moveTo(px, py);
            for (let j = 0; j < 5; ++j) {
                px += random()*38 - 19;
                py += 8 + random()*17;
                draw.lineTo(px, py);
            }
            draw.stroke();
        }
    }
    else if (id === 4) {
        draw.strokeStyle = '#c5b8cf22';
        draw.lineWidth = 2;
        for (let i = 0; i < 14; ++i) {
            draw.beginPath();
            draw.moveTo(i*50, 20);
            draw.lineTo(i*50 - 110, 640);
            draw.stroke();
            draw.beginPath();
            draw.moveTo(0, i*50);
            draw.lineTo(640, i*50 + 100);
            draw.stroke();
        }
        for (let i = 0; i < 170; ++i) {
            draw.fillStyle = (i % 5) ? '#ffd39a22' : '#ffdb9577';
            draw.fillRect(40 + random()*570, 40 + random()*570, 2 + random()*13, 2 + random()*6);
        }
        draw.strokeStyle = '#0a0c1677';
        draw.lineWidth = 12;
        draw.beginPath();
        draw.ellipse(320, 320, 280, 95, -0.35, 0, Math.PI*2);
        draw.stroke();
    }
    else if (id === 5) {
        for (let i = 0; i < 95; ++i) {
            const px = 50 + random()*540;
            const py = 50 + random()*540;
            const size = 25 + random()*70;
            draw.fillStyle = (i % 2) ? '#b5efff19' : '#23678855';
            draw.strokeStyle = '#c4fcff35';
            draw.lineWidth = 1;
            draw.beginPath();
            draw.moveTo(px, py - size);
            draw.lineTo(px + size*0.7, py + size*0.3);
            draw.lineTo(px - size*0.6, py + size*0.6);
            draw.closePath();
            draw.fill();
            draw.stroke();
        }
        draw.strokeStyle = '#e0ffffaa';
        draw.lineWidth = 2;
        draw.beginPath();
        draw.moveTo(140, 30);
        draw.lineTo(230, 145);
        draw.lineTo(180, 230);
        draw.lineTo(340, 290);
        draw.lineTo(300, 370);
        draw.lineTo(430, 500);
        draw.stroke();
    }
    else if (id === 6) {
        for (let i = 0; i < 120; ++i) {
            const px = 35 + random()*570;
            const py = 35 + random()*570;
            const size = 5 + random()*42;
            draw.fillStyle = (i % 3) ? '#40121255' : '#ffc84d44';
            draw.beginPath();
            draw.ellipse(px, py, size, size*0.55, random()*6.28, 0, Math.PI*2);
            draw.fill();
        }
        draw.strokeStyle = '#ffd875aa';
        draw.lineWidth = 2;
        for (let i = 0; i < 30; ++i) {
            let px = random()*640;
            let py = random()*640;
            draw.beginPath();
            draw.moveTo(px, py);
            for (let j = 0; j < 6; ++j) {
                px += random()*70 - 35;
                py += random()*60 - 20;
                draw.lineTo(px, py);
            }
            draw.stroke();
        }
    }
    else {
        draw.fillStyle = '#03040cee';
        draw.fillRect(0, 0, 640, 640);
        draw.strokeStyle = '#9067b822';
        draw.lineWidth = 1;
        for (let i = 0; i < 12; ++i) {
            draw.beginPath();
            draw.ellipse(x, y, r - i*16, r - i*19, 0.4, 0, Math.PI*2);
            draw.stroke();
        }
        draw.strokeStyle = '#f0b5fdcc';
        draw.lineWidth = 4;
        draw.beginPath();
        draw.arc(x, y, r - 1, 2.5, 4.85);
        draw.stroke();
        draw.strokeStyle = '#ffecb377';
        draw.lineWidth = 1;
        draw.beginPath();
        draw.arc(x, y, r + 2, 2.45, 4.9);
        draw.stroke();
    }
    if ((id !== 6) && (id !== 7)) {
        const night = draw.createLinearGradient(110, 0, 630, 400);
        night.addColorStop(0, '#01040b00');
        night.addColorStop(0.5, '#01040b11');
        night.addColorStop(1, '#01030bf2');
        draw.fillStyle = night;
        draw.fillRect(0, 0, 640, 640);
    }
    draw.restore();
    return canvas;
}

function draw_background()
{
    if (state === 'menu') {
        visual_base_draw_background();
        return;
    }
    const id = campaign.world;
    const look = world_looks[id];
    const sky = ensure_world_visuals(id);
    ctx.save();
    render_nebula_layer(id, sky);
    for (const world_body of world_bodies) {
        render_celestial_body(world_body);
    }
    if (id === 5) {
        for (let i = 0; i < 3; ++i) {
            ctx.strokeStyle = (i % 2) ? '#61ffd921' : '#7badff20';
            ctx.lineWidth = 18 - i*4;
            ctx.beginPath();
            for (let j = 0; j <= 18; ++j) {
                const x = (j/18)*W;
                const y = H*(0.24 + i*0.09) + Math.sin(j*0.35 + clock*0.05 + i)*H*0.09;
                if (!j) {
                    ctx.moveTo(x, y);
                }
                else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }
    }
    if ((id === 3) && full_fx) {
        for (let i = 0; i < 3; ++i) {
            const phase = (clock*0.15 + i*0.31) % 1;
            if (phase > 0.11) {
                continue;
            }
            ctx.globalAlpha = (1 - phase/0.11)*0.22;
            ctx.strokeStyle = '#acddff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            let x = W*(0.12 + i*0.37);
            let y = 0;
            ctx.moveTo(x, y);
            for (let j = 0; j < 12; ++j) {
                x += Math.sin(j*9 + i*7)*45;
                y += H/13;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
    for (let i = 0, end = stars.length; i < end; ++i) {
        const star = stars[i];
        if ((id === 7) && (i % 3)) {
            continue;
        }
        ctx.globalAlpha = (0.4 + Math.sin(clock*0.5 + star.phase)*0.12)*star.z;
        ctx.fillStyle = (i % 5) ? look.star : worlds[id].accent;
        const x = (((star.x - camera.x*star.z*0.055) % W) + W) % W;
        const y = (((star.y - camera.y*star.z*0.045) % H) + H) % H;
        ctx.fillRect(x, y, star.z*((id === 5) ? 2 : 1.5), star.z*1.5);
    }
    ctx.globalAlpha = 1;
    for (let i = 0, end = sky.motes.length; i < end; ++i) {
        const mote = sky.motes[i];
        if (!full_fx && (i % 3)) {
            continue;
        }
        const x = (((mote.x*W - camera.x*0.035 + clock*((id === 2) ? -mote.speed : (id === 6) ? mote.speed*0.4 : 2)) % W) + W) % W;
        const y = (((mote.y*H - camera.y*0.03 + clock*((id === 5) ? mote.speed*0.7 : (id === 6) ? -mote.speed*0.5 : 1)) % H) + H) % H;
        ctx.globalAlpha = (id === 7) ? 0.12 : (id === 2) ? 0.17 : 0.22;
        ctx.fillStyle = look.star;
        if (id === 1) {
            ctx.beginPath();
            ctx.arc(x, y, mote.size*1.3, 0, Math.PI*2);
            ctx.fill();
        }
        else if (id === 5) {
            ctx.fillRect(x, y, mote.size, mote.size*2);
        }
        else if (id === 6) {
            ctx.strokeStyle = '#ffb579';
            ctx.lineWidth = mote.size*0.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 10, y + 8);
            ctx.stroke();
        }
        else {
            ctx.fillRect(x, y, mote.size, (id === 2) ? mote.size*0.6 : mote.size);
        }
    }
    ctx.globalAlpha = 1;
    if ((view_mode === 'wireframe') && ((id === 0) || (id === 4))) {
        ctx.strokeStyle = (id === 0) ? '#75bccc0b' : '#bd9cbd0d';
        ctx.lineWidth = 1;
        const spacing = ((id === 4) ? 150 : 110)*zoom;
        ctx.beginPath();
        for (let x = -(camera.x*zoom) % spacing; x < W; x += spacing) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
        }
        for (let y = -(camera.y*zoom) % spacing; y < H; y += spacing) {
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
        }
        ctx.stroke();
    }
    ctx.restore();
}

function wireframe_render_map()
{
    const id = campaign.world;
    const look = world_looks[id];
    ctx.save();
    ctx.strokeStyle = `${worlds[id].accent}44`;
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, world.w - 24, world.h - 24);
    for (let i = 0, ii = scenery.length; i < ii; ++i) {
        const v = scenery[i];
        if (!in_view(v, v.r + 30)) {
            continue;
        }
        ctx.save();
        ctx.translate(v.x, v.y);
        ctx.rotate(v.angle);
        ctx.globalAlpha = [2, 5, 6, 7].includes(id) ? 0.28 : 0.48;
        const r = v.r;
        ctx.strokeStyle = look.material;
        ctx.lineWidth = 1;
        if (id === 0) {
            polygon(0, 0, r*0.6, 6, 0, look.material, '#12293566');
            ctx.strokeRect(-r*0.95, -r*0.16, r*0.35, r*0.32);
            ctx.strokeRect(r*0.6, -r*0.16, r*0.35, r*0.32);
            ctx.strokeStyle = '#69d1d277';
            ctx.beginPath();
            ctx.arc(0, 0, r*0.35, 0, Math.PI*2);
            ctx.stroke();
        }
        else if (id === 1) {
            for (let j = 0; j < 5; ++j) {
                const a = (j/5)*Math.PI*2;
                ctx.fillStyle = '#29573855';
                ctx.beginPath();
                ctx.ellipse(Math.cos(a)*r*0.35, Math.sin(a)*r*0.35, r*0.45, r*0.17, a, 0, Math.PI*2);
                ctx.fill();
                ctx.stroke();
            }
            polygon(0, 0, r*0.17, 5, clock*0.04, look.material, '#517b3b66');
        }
        else if (id === 2) {
            polygon(0, 0, r*0.55, 7, v.angle, look.material, '#352921');
            ctx.fillStyle = '#110f1644';
            ctx.beginPath();
            ctx.arc(-r*0.13, -r*0.1, r*0.15, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = '#dec49144';
            ctx.beginPath();
            ctx.arc(-r*0.13, -r*0.1, r*0.16, 3, 5.3);
            ctx.stroke();
            polygon(r*0.67, r*0.15, r*0.14, 5, 0, look.material, '#302721');
        }
        else if (id === 3) {
            polygon(0, 0, r*0.48, 4, Math.PI/4, look.material, '#18284944');
            polygon(0, 0, r*0.25, 4, Math.PI/4, worlds[id].accent, '#4a6ac133');
            ctx.strokeStyle = '#b4dfff55';
            ctx.beginPath();
            ctx.moveTo(-r*0.65, 0);
            ctx.lineTo(-r*0.2, -r*0.18);
            ctx.lineTo(r*0.1, r*0.16);
            ctx.lineTo(r*0.65, -r*0.1);
            ctx.stroke();
        }
        else if (id === 4) {
            ctx.fillStyle = '#252633';
            ctx.fillRect(-r*0.6, -r*0.35, r*1.2, r*0.7);
            ctx.strokeRect(-r*0.6, -r*0.35, r*1.2, r*0.7);
            for (let j = -2; j <= 2; ++j) {
                ctx.fillStyle = '#83849733';
                ctx.fillRect(j*r*0.2, -r*0.28, r*0.08, r*0.56);
            }
            ctx.fillStyle = '#f6b98155';
            ctx.fillRect(-r*0.4, r*0.1, r*0.2, 3);
            ctx.fillRect(r*0.25, -r*0.2, r*0.16, 3);
        }
        else if (id === 5) {
            polygon(0, 0, r*0.5, 5, 0, look.material, '#669fb522');
            ctx.strokeStyle = '#c8f6ff88';
            ctx.beginPath();
            ctx.moveTo(-r*0.32, -r*0.25);
            ctx.lineTo(r*0.14, r*0.06);
            ctx.lineTo(-r*0.05, r*0.38);
            ctx.moveTo(r*0.14, r*0.06);
            ctx.lineTo(r*0.38, -r*0.14);
            ctx.stroke();
            polygon(r*0.6, -r*0.2, r*0.13, 3, 0, look.material, '#a2dcf322');
        }
        else if (id === 6) {
            polygon(0, 0, r*0.53, 6, v.angle, '#bb6853', '#281519');
            ctx.strokeStyle = '#ffa35b99';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-r*0.35, -r*0.2);
            ctx.lineTo(-r*0.07, r*0.08);
            ctx.lineTo(r*0.16, -r*0.12);
            ctx.lineTo(r*0.36, r*0.2);
            ctx.stroke();
            ctx.fillStyle = '#ffe19a99';
            ctx.fillRect(-2, -2, 4, 4);
        }
        else {
            polygon(0, 0, r*0.6, 3, 0.2, look.material, '#100d1bcc');
            polygon(0, 0, r*0.32, 3, 0.2, '#c599e455', '#03050e');
            ctx.strokeStyle = '#d7b5ff33';
            ctx.beginPath();
            ctx.moveTo(-r*0.5, r*0.3);
            ctx.lineTo(0, -r*0.4);
            ctx.lineTo(r*0.12, r*0.1);
            ctx.stroke();
        }
        ctx.restore();
    }
    ctx.restore();
}

function wireframe_render_world_ore(v)
{
    if (!in_view(v, v.r)) {
        return;
    }
    const id = campaign.world;
    const look = world_looks[id];
    ctx.save();
    const color = (v.flash > 0) ? '#fff5b4' : look.material;
    const sides = (id === 3) ? 4 : (id === 5) ? 5 : (id === 7) ? 3 : 7;
    polygon(v.x, v.y, v.r, sides, v.angle, color, (id === 5) ? '#39576e99' : (id === 1) ? '#223728' : (id === 6) ? '#321c21' : (id === 7) ? '#181023' : '#25222b');
    ctx.strokeStyle = (id === 6) ? '#ffa34a' : `${color}99`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(v.x - v.r*0.5, v.y);
    ctx.lineTo(v.x, v.y - v.r*0.35);
    ctx.lineTo(v.x + v.r*0.35, v.y + v.r*0.25);
    ctx.stroke();
    polygon(v.x + v.r*0.15, v.y - v.r*0.05, 6, 4, v.angle, gold, '#ffd16e66');
    ore_glow(v);
    if (v.hp < v.max_hp) {
        ctx.fillStyle = '#ffd16e22';
        ctx.fillRect(v.x - v.r, v.y - v.r - 9, v.r*2, 3);
        ctx.fillStyle = gold;
        ctx.fillRect(v.x - v.r, v.y - v.r - 9, (v.r*2*v.hp)/v.max_hp, 3);
    }
    ctx.restore();
}

function wireframe_render_world_station()
{
    if (!in_view(station, 550)) {
        return;
    }
    const id = campaign.world;
    const w = worlds[id];
    const look = world_looks[id];
    ctx.save();
    ctx.translate(station.x, station.y);
    ctx.strokeStyle = `${w.accent}18`;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.arc(0, 0, 500, 0, Math.PI*2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowColor = w.accent;
    ctx.shadowBlur = full_fx ? 12 : 0;
    if (id === 0) {
        ctx.strokeStyle = w.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 90, 0, Math.PI*2);
        ctx.stroke();
        polygon(0, 0, 45, 6, clock*0.04, w.accent, '#132a37');
        for (let i = 0; i < 4; ++i) {
            ctx.save();
            ctx.rotate((i*Math.PI)/2);
            ctx.fillStyle = '#153148';
            ctx.fillRect(65, -15, 70, 30);
            ctx.strokeRect(65, -15, 70, 30);
            ctx.fillStyle = '#53d4e177';
            ctx.fillRect(83, -9, 45, 18);
            ctx.restore();
        }
    }
    else if (id === 1) {
        for (let i = 0; i < 7; ++i) {
            const a = (i/7)*Math.PI*2 + clock*0.015;
            ctx.strokeStyle = '#a6ffc599';
            ctx.fillStyle = '#245537';
            ctx.beginPath();
            ctx.ellipse(Math.cos(a)*75, Math.sin(a)*75, 58, 24, a, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
        }
        polygon(0, 0, 48, 7, -clock*0.02, w.accent, '#244d35');
    }
    else if (id === 2) {
        ctx.strokeStyle = '#e3bc80';
        ctx.fillStyle = '#302b29';
        ctx.fillRect(-65, -62, 130, 124);
        ctx.strokeRect(-65, -62, 130, 124);
        for (let i = 0; i < 4; ++i) {
            const x = (i % 2) ? 98 : -98;
            const y = (i < 2) ? -45 : 45;
            ctx.fillStyle = '#38332e';
            ctx.beginPath();
            ctx.ellipse(x, y, 26, 39, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#e9b35b99';
            ctx.fillRect(x - 10, y - 12, 20, 24);
        }
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-120, -90);
        ctx.lineTo(110, -90);
        ctx.lineTo(110, 20);
        ctx.stroke();
        polygon(0, 0, 27, 6, clock*0.06, w.accent, '#5e4c2e');
    }
    else if (id === 3) {
        for (let i = 0; i < 3; ++i) {
            ctx.strokeStyle = (i === 1) ? '#c4d5ff' : w.accent;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(0, 0, 118, 45, clock*0.1 + (i*Math.PI)/3, 0, Math.PI*2);
            ctx.stroke();
        }
        polygon(0, 0, 43, 4, clock*0.2, w.accent, '#2a3559');
    }
    else if (id === 4) {
        ctx.fillStyle = '#222532';
        ctx.strokeStyle = '#b9a9c5';
        ctx.lineWidth = 3;
        ctx.fillRect(-87, -77, 174, 154);
        ctx.strokeRect(-87, -77, 174, 154);
        for (let i = 0; i < 4; ++i) {
            ctx.save();
            ctx.rotate((i*Math.PI)/2);
            ctx.fillStyle = '#373344';
            ctx.fillRect(64, -29, 63, 58);
            ctx.strokeRect(64, -29, 63, 58);
            ctx.fillStyle = '#fbd395';
            ctx.fillRect(82, -6, 40, 12);
            ctx.restore();
        }
        polygon(0, 0, 47, 4, Math.PI/4, w.accent, '#161725');
    }
    else if (id === 5) {
        for (let i = 0; i < 6; ++i) {
            ctx.save();
            ctx.rotate((i*Math.PI)/3);
            ctx.strokeStyle = '#b7efff';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(35, 0);
            ctx.lineTo(130, 0);
            ctx.moveTo(80, 0);
            ctx.lineTo(98, -24);
            ctx.moveTo(80, 0);
            ctx.lineTo(98, 24);
            ctx.stroke();
            polygon(125, 0, 15, 6, clock*0.05, w.accent, '#244954');
            ctx.restore();
        }
        polygon(0, 0, 48, 6, 0, '#d1faff', '#234e61');
        polygon(0, 0, 30, 6, 0, w.accent, '#387485');
    }
    else if (id === 6) {
        ctx.strokeStyle = '#f59162';
        ctx.lineWidth = 13;
        ctx.beginPath();
        ctx.arc(0, 0, 88, 0, Math.PI*2);
        ctx.stroke();
        ctx.strokeStyle = '#ffe8ac';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 70, clock*0.2, clock*0.2 + Math.PI*1.7);
        ctx.stroke();
        for (let i = 0; i < 4; ++i) {
            ctx.save();
            ctx.rotate((i*Math.PI)/2);
            ctx.fillStyle = '#40242a';
            ctx.strokeStyle = '#b96b5b';
            ctx.fillRect(79, -19, 60, 38);
            ctx.strokeRect(79, -19, 60, 38);
            ctx.fillStyle = '#ffb56b';
            ctx.fillRect(95, -5, 32, 10);
            ctx.restore();
        }
        polygon(0, 0, 40, 6, -clock*0.1, w.accent, '#7c3324');
    }
    else {
        for (let i = 0; i < 6; ++i) {
            ctx.save();
            ctx.rotate((i*Math.PI)/3);
            ctx.strokeStyle = '#b795dc';
            ctx.fillStyle = '#140f22';
            ctx.beginPath();
            ctx.moveTo(22, -16);
            ctx.lineTo(140, 0);
            ctx.lineTo(22, 16);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
        polygon(0, 0, 52, 6, 0, '#e4b3ff', '#05070f');
        polygon(0, 0, 31, 3, clock*0.08, '#bd86e7', '#1b0d32');
    }
    ctx.shadowBlur = 0;
    world_label(0, 153, w.station.toUpperCase(), `${look.station} · R dock`, w.accent);
    ctx.restore();
}

function physics_base_generate_map()
{
    visual_base_generate_map();
    ensure_world_visuals(campaign.world);
    document.body.setAttribute('data-world', String(campaign.world));
}

function physics_base_update_hud()
{
    visual_base_update_hud();
    if (player) {
        el.act_label.textContent = `${worlds[campaign.world].name.toUpperCase()} / ${world_looks[campaign.world].biome} / THREAT ${campaign.world + 1}`;
    }
}
