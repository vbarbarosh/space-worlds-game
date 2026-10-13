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
    sky_create_layers(out, id);
    world_visual_cache[id] = out;
    return out;
}

// The sky's moving layers, on their own seed so the clouds and the planet stay as they were: two layers of stars
// behind the play (the farthest are baked into the nebula), a few bright ones with a soft glow, the fine dust that
// streams past at speed, and the weather of a world that has one
function sky_create_layers(out, id)
{
    const random = visual_random_from_seed(2671 + id*7121);
    const look = world_looks[id];
    const dim = (id === 7) ? 0.45 : 1;
    // A star's group: its layer, its colour and its twinkle, filled as one path
    out.star_groups = [];
    const layers = [
        {count: 170, parallax: 0.03, size: 1.1, alpha: 0.5},
        {count: 46, parallax: 0.075, size: 1.8, alpha: 0.7},
    ];
    for (const layer of layers) {
        for (let i = 0; i < 6; ++i) {
            out.star_groups.push({parallax: layer.parallax, alpha: layer.alpha*dim, color: (i % 3) ? look.star : worlds[id].accent, phase: i*1.9, items: []});
        }
        const groups = out.star_groups.slice(-6);
        for (let i = 0, end = Math.round(layer.count*dim); i < end; ++i) {
            groups[i % 6].items.push({x: random(), y: random(), size: layer.size*(0.7 + random()*0.6)});
        }
    }
    out.bright = [];
    for (let i = 0, end = (id === 7) ? 3 : 7; i < end; ++i) {
        out.bright.push({x: random(), y: random(), r: 9 + random()*9, phase: random()*6.28});
    }
    out.dust = [];
    for (let i = 0; i < 70; ++i) {
        out.dust.push({x: random(), y: random(), depth: 0.7 + random()*0.6});
    }
    out.glints = [];
    for (let i = 0; i < 12; ++i) {
        out.glints.push({x: random(), y: random(), size: 4 + random()*6, phase: random()});
    }
    out.glow = sky_glow_sprite(look.star, true);
    out.flash = (id === 3) ? sky_glow_sprite('#9fc4ff', false) : null;
    out.corona = (id === 7) ? create_eclipse_corona() : null;
}

// A soft round glow on a 64 px canvas, white at the core; a star's has two faint spikes across it
function sky_glow_sprite(color, spikes)
{
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const draw = canvas.getContext('2d');
    const g = draw.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, color_with_alpha(color, spikes ? 0.55 : 0.6));
    g.addColorStop(0.25, color_with_alpha(color, spikes ? 0.16 : 0.3));
    g.addColorStop(1, color_with_alpha(color, 0));
    draw.fillStyle = g;
    draw.fillRect(0, 0, 64, 64);
    if (spikes) {
        for (const [dx, dy] of [[1, 0], [0, 1]]) {
            const line = draw.createLinearGradient(32 - dx*32, 32 - dy*32, 32 + dx*32, 32 + dy*32);
            line.addColorStop(0, color_with_alpha(color, 0));
            line.addColorStop(0.5, color_with_alpha(color, 0.5));
            line.addColorStop(1, color_with_alpha(color, 0));
            draw.fillStyle = line;
            draw.fillRect(dx ? 0 : 31.5, dy ? 0 : 31.5, dx ? 64 : 1, dy ? 64 : 1);
        }
        draw.fillStyle = '#ffffff';
        draw.fillRect(31, 31, 2, 2);
    }
    return canvas;
}

// Eclipse's crown: the light of the hidden sun round the black disc, pink near it and violet farther out, with thin
// streamers; drawn twice the planet's size, the disc covering its middle
function create_eclipse_corona()
{
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const draw = canvas.getContext('2d');
    const r = 112;
    const random = visual_random_from_seed(9091);
    const g = draw.createRadialGradient(256, 256, r - 6, 256, 256, 256);
    g.addColorStop(0, '#ffb8e055');
    g.addColorStop(0.1, '#ff7cc226');
    g.addColorStop(0.35, '#c04fd00e');
    g.addColorStop(0.7, '#5b2fa004');
    g.addColorStop(1, '#5b2fa000');
    draw.fillStyle = g;
    draw.fillRect(0, 0, 512, 512);
    // the streamers blurred once here, soft at no cost later
    draw.filter = 'blur(5px)';
    draw.globalCompositeOperation = 'lighter';
    const rays = draw.createRadialGradient(256, 256, r, 256, 256, 240);
    rays.addColorStop(0, '#ffb3dd22');
    rays.addColorStop(0.45, '#d86cff0a');
    rays.addColorStop(1, '#d86cff00');
    draw.fillStyle = rays;
    for (let i = 0; i < 60; ++i) {
        const a = random()*Math.PI*2;
        const spread = 0.02 + random()*0.05;
        const length = r*(1.2 + random()*0.9);
        draw.beginPath();
        draw.moveTo(256 + Math.cos(a - spread)*r, 256 + Math.sin(a - spread)*r);
        draw.lineTo(256 + Math.cos(a)*length, 256 + Math.sin(a)*length);
        draw.lineTo(256 + Math.cos(a + spread)*r, 256 + Math.sin(a + spread)*r);
        draw.closePath();
        draw.fill();
    }
    return canvas;
}

// Baked into the sky layer under the clouds' glow: filaments of gas in the world's colours and the faint far stars,
// so the sky has depth at no cost per frame. Every third filament was a dark lane of dust; the layer barely moves, so
// a lane stayed on the screen wherever the ship flew and read as a smudge on the glass. Its numbers are still drawn,
// so the gas and the stars keep their places.
function nebula_bake_detail(draw, id, box)
{
    const look = world_looks[id];
    const random = visual_random_from_seed(5519 + id*7457);
    const size = Math.max(W, H);
    const w = box.right - box.left;
    const h = box.bottom - box.top;
    const colors = [look.cloud, look.second];
    const strength = (id === 7) ? '0c' : (id === 6) ? '1e' : '16';
    // Dustfall's banks lie along its wind; the others' filaments curl any way
    const banked = (id === 2);
    for (let i = 0, end = banked ? 7 : 5; i < end; ++i) {
        const lane = (i % 3 === 2);
        let x = box.left + random()*w;
        let y = box.top + random()*h;
        let angle = banked ? 0.12 + random()*0.2 : random()*6.28;
        const color = colors[i % 3];
        for (let j = 0; j < 16; ++j) {
            const r = size*(banked ? 0.07 + random()*0.08 : 0.035 + random()*0.075);
            if (!lane) {
                const g = draw.createRadialGradient(x, y, 0, x, y, r);
                g.addColorStop(0, `${color}${strength}`);
                g.addColorStop(1, `${color}00`);
                draw.fillStyle = g;
                if (banked) {
                    draw.save();
                    draw.translate(x, y);
                    draw.scale(1.8, 0.6);
                    draw.translate(-x, -y);
                    draw.fillRect(x - r, y - r, r*2, r*2);
                    draw.restore();
                }
                else {
                    draw.fillRect(x - r, y - r, r*2, r*2);
                }
            }
            angle += random()*0.9 - 0.45;
            x += Math.cos(angle)*r*(banked ? 1.2 : 0.75);
            y += Math.sin(angle)*r*(banked ? 0.4 : 0.75);
        }
    }
    // Nova Forge: the heat of its sun from below
    if (id === 6) {
        const g = draw.createRadialGradient(W*0.5, H*1.25, 0, W*0.5, H*1.25, size*0.9);
        g.addColorStop(0, '#ff6a2a30');
        g.addColorStop(0.5, '#c2301818');
        g.addColorStop(1, '#c2301800');
        draw.fillStyle = g;
        draw.fillRect(box.left, box.top, w, h);
    }
    draw.fillStyle = look.star;
    for (let i = 0, end = Math.round(w*h/((id === 7) ? 9000 : 4200)); i < end; ++i) {
        draw.globalAlpha = 0.12 + random()*random()*0.5;
        draw.fillRect(box.left + random()*w, box.top + random()*h, 2, 2);
    }
    draw.globalAlpha = 1;
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
    const sky = ensure_world_visuals(id);
    ctx.save();
    render_nebula_layer(id, sky);
    if (id === 3) {
        draw_ion_discharges(sky);
    }
    draw_sky_stars(sky);
    for (const world_body of world_bodies) {
        render_celestial_body(world_body);
    }
    if (id === 5) {
        for (let i = 0; i < 3; ++i) {
            ctx.strokeStyle = (i % 2) ? '#61ffd921' : '#7badff20';
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
            // the curtain's soft edge, then its bright core
            ctx.globalAlpha = 0.45;
            ctx.lineWidth = 44 - i*8;
            ctx.stroke();
            ctx.globalAlpha = 0.85;
            ctx.lineWidth = 10 - i*2;
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        draw_ice_glints(sky);
    }
    draw_sky_motes(id, sky);
    draw_speed_dust(sky);
    ctx.restore();
}

// The stars in their two layers, a path a group, the near layer sliding faster; then the bright few with their glow
function draw_sky_stars(sky)
{
    for (const group of sky.star_groups) {
        const px = camera.x*group.parallax;
        const py = camera.y*group.parallax*0.8;
        ctx.globalAlpha = group.alpha*(0.82 + Math.sin(clock*0.5 + group.phase)*0.18);
        ctx.fillStyle = group.color;
        ctx.beginPath();
        for (let i = 0, end = group.items.length; i < end; ++i) {
            const star = group.items[i];
            const bent = pulse_star_bend((((star.x*W - px) % W) + W) % W, (((star.y*H - py) % H) + H) % H);
            ctx.rect(bent.x, bent.y, star.size, star.size);
        }
        ctx.fill();
    }
    for (let i = 0, end = sky.bright.length; i < end; ++i) {
        const star = sky.bright[i];
        const r = star.r*(0.9 + Math.sin(clock*0.7 + star.phase)*0.1);
        const bent = pulse_star_bend((((star.x*W - camera.x*0.05) % W) + W) % W, (((star.y*H - camera.y*0.04) % H) + H) % H);
        ctx.globalAlpha = 0.75 + Math.sin(clock*1.3 + star.phase)*0.2;
        ctx.drawImage(sky.glow, bent.x - r, bent.y - r, r*2, r*2);
    }
    ctx.globalAlpha = 1;
}

// The world's drifting motes in one path: Verdant's spores, Dustfall's blown grit, Cryosphere's falling ice, Nova
// Forge's embers rising with their tails
function draw_sky_motes(id, sky)
{
    const look = world_looks[id];
    ctx.globalAlpha = (id === 7) ? 0.12 : (id === 2) ? 0.17 : 0.22;
    ctx.fillStyle = look.star;
    if (id === 6) {
        draw_embers(sky);
        return;
    }
    ctx.beginPath();
    for (let i = 0, end = sky.motes.length; i < end; ++i) {
        const mote = sky.motes[i];
        if (!full_fx && (i % 3)) {
            continue;
        }
        const x = (((mote.x*W - camera.x*0.035 + clock*((id === 2) ? -mote.speed : 2)) % W) + W) % W;
        const y = (((mote.y*H - camera.y*0.03 + clock*((id === 5) ? mote.speed*0.7 : 1)) % H) + H) % H;
        if (id === 1) {
            ctx.moveTo(x + mote.size*1.3, y);
            ctx.arc(x, y, mote.size*1.3, 0, Math.PI*2);
        }
        else if (id === 5) {
            ctx.rect(x, y, mote.size, mote.size*2);
        }
        else if (id === 2) {
            // grit streaks along the wind
            ctx.rect(x, y, mote.size*(1 + mote.speed/15), mote.size*0.6);
        }
        else {
            ctx.rect(x, y, mote.size, mote.size);
        }
    }
    ctx.fill();
    ctx.globalAlpha = 1;
}

// Nova Forge's embers: three heats, each flickering on its own, a faint tail behind each and a hot core
function draw_embers(sky)
{
    const colors = ['#ffb579', '#ff7a3d', '#ffd27a'];
    ctx.lineWidth = 1;
    for (let k = 0; k < 3; ++k) {
        ctx.strokeStyle = colors[k];
        ctx.fillStyle = colors[k];
        ctx.beginPath();
        for (let i = k, end = sky.motes.length; i < end; i += 3) {
            if (!full_fx && (i % 9 >= 3)) {
                continue;
            }
            const mote = sky.motes[i];
            const x = (((mote.x*W - camera.x*0.035 + clock*mote.speed*0.4) % W) + W) % W;
            const y = (((mote.y*H - camera.y*0.03 - clock*mote.speed*0.5) % H) + H) % H;
            const tail = 4 + mote.speed*0.35;
            ctx.moveTo(x, y);
            ctx.lineTo(x - tail*0.62, y + tail*0.78);
        }
        ctx.globalAlpha = 0.22;
        ctx.stroke();
        ctx.beginPath();
        for (let i = k, end = sky.motes.length; i < end; i += 3) {
            if (!full_fx && (i % 9 >= 3)) {
                continue;
            }
            const mote = sky.motes[i];
            const x = (((mote.x*W - camera.x*0.035 + clock*mote.speed*0.4) % W) + W) % W;
            const y = (((mote.y*H - camera.y*0.03 - clock*mote.speed*0.5) % H) + H) % H;
            const s = 1 + mote.size*0.6;
            ctx.rect(x - s/2, y - s/2, s, s);
        }
        ctx.globalAlpha = 0.42 + Math.sin(clock*(3 + k) + k*2.1)*0.14;
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// Ion Reach: now and then a discharge lights a storm cloud from inside, a glow and a short forked arc that flicker
// out in a third of a second. Behind the full effects only: it is a flash.
function draw_ion_discharges(sky)
{
    if (!full_fx) {
        return;
    }
    const drift = Math.sin(clock*0.025)*18;
    for (let i = 0; i < 3; ++i) {
        const t = clock*0.15 + i*0.37;
        const phase = t % 1;
        if (phase > 0.05) {
            continue;
        }
        const random = visual_random_from_seed(Math.floor(t)*7919 + i*104729);
        const cloud = sky.clouds[Math.floor(random()*sky.clouds.length)];
        const r = cloud.r*Math.max(W, H);
        const x = cloud.x*W + Math.sin(cloud.phase)*35 - camera.x*0.018 + drift + (random() - 0.5)*r*0.6;
        const y = cloud.y*H - camera.y*0.012 + (random() - 0.5)*r*0.6;
        if ((x < -200) || (x > W + 200) || (y < -200) || (y > H + 200)) {
            continue;
        }
        // two strokes of light, the second weaker
        const k = (1 - phase/0.05)*((phase < 0.018) || (phase > 0.03) ? 1 : 0.3);
        const glow = 140 + random()*120;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = k*0.55;
        ctx.drawImage(sky.flash, x - glow, y - glow, glow*2, glow*2);
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#c9e4ff';
        // a jagged channel both ways from the flash, a short fork off it every few steps
        ctx.beginPath();
        for (let j = 0; j < 2; ++j) {
            let px = x;
            let py = y;
            let angle = random()*Math.PI*2 + j*Math.PI;
            ctx.moveTo(px, py);
            for (let n = 0, steps = 5 + Math.floor(random()*4); n < steps; ++n) {
                angle += random()*1.6 - 0.8;
                const step = 10 + random()*18;
                px += Math.cos(angle)*step;
                py += Math.sin(angle)*step;
                ctx.lineTo(px, py);
                if (n % 3 === 1) {
                    let fx = px;
                    let fy = py;
                    let fork = angle + ((random() < 0.5) ? -0.9 : 0.9);
                    for (let m = 0; m < 3; ++m) {
                        fork += random()*1.2 - 0.6;
                        fx += Math.cos(fork)*(7 + random()*10);
                        fy += Math.sin(fork)*(7 + random()*10);
                        ctx.lineTo(fx, fy);
                    }
                    ctx.moveTo(px, py);
                }
            }
        }
        ctx.globalAlpha = k*0.12;
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.globalAlpha = k*0.45;
        ctx.lineWidth = 1.2;
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

// Cryosphere: ice crystals far off catch the light, one or two at a time, a small four-point glint that comes and goes;
// behind the full effects only
function draw_ice_glints(sky)
{
    if (!full_fx) {
        return;
    }
    ctx.strokeStyle = '#e8fdff';
    ctx.lineWidth = 1;
    for (let i = 0, end = sky.glints.length; i < end; ++i) {
        const glint = sky.glints[i];
        const phase = (clock*0.18 + glint.phase) % 1;
        if (phase > 0.1) {
            continue;
        }
        const k = Math.sin((phase/0.1)*Math.PI);
        const x = (((glint.x*W - camera.x*0.045) % W) + W) % W;
        const y = (((glint.y*H - camera.y*0.036) % H) + H) % H;
        const s = glint.size*(0.5 + k*0.5);
        ctx.globalAlpha = k*0.5;
        ctx.drawImage(sky.glow, x - s*1.2, y - s*1.2, s*2.4, s*2.4);
        ctx.globalAlpha = k*0.4;
        ctx.beginPath();
        ctx.moveTo(x - s, y);
        ctx.lineTo(x + s, y);
        ctx.moveTo(x, y - s*0.7);
        ctx.lineTo(x, y + s*0.7);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

// Fine dust in the plane of the fight streaks past the ship at speed, longer and brighter in turbo; still, none
function draw_speed_dust(sky)
{
    if (!player || ((state !== 'playing') && (state !== 'paused'))) {
        return;
    }
    const speed = Math.hypot(player.vx, player.vy);
    const cruise = cruise_speed();
    const k = clamp((speed - cruise*0.45)/(cruise*1.6), 0, 1);
    if (k <= 0) {
        return;
    }
    const margin = 160;
    const w = W + margin*2;
    const h = H + margin*2;
    const blur = player.turbo_active ? 0.07 : 0.045;
    ctx.strokeStyle = world_looks[campaign.world].star;
    for (const near of [false, true]) {
        ctx.beginPath();
        for (let i = 0, end = sky.dust.length; i < end; ++i) {
            const mote = sky.dust[i];
            if ((mote.depth > 1) !== near) {
                continue;
            }
            const x = (((mote.x*w - camera.x*zoom*mote.depth) % w) + w) % w - margin;
            const y = (((mote.y*h - camera.y*zoom*mote.depth) % h) + h) % h - margin;
            const dx = clamp(player.vx*zoom*mote.depth*blur, -margin, margin);
            const dy = clamp(player.vy*zoom*mote.depth*blur, -margin, margin);
            ctx.moveTo(x, y);
            ctx.lineTo(x - dx, y - dy);
        }
        ctx.globalAlpha = k*(near ? 0.3 : 0.18);
        ctx.lineWidth = near ? 1.4 : 1;
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
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
        hud_text(el.act_label, `${worlds[campaign.world].name.toUpperCase()} / ${world_looks[campaign.world].biome} / THREAT ${Math.floor(world_tier(campaign.world)) + 1}`);
    }
}
