// pattern: a shot of a flagship's ring, which stays slow enough to weave through
function enemy_fire(enemy, angle, speed = 210, pattern = false)
{
    world_audio_base_enemy_fire(enemy, angle, speed, pattern);
    if (!sound.ctx || (state !== 'playing') || (distance(enemy, player) > 900) || (sound.ctx.currentTime < (sound.enemy_next || 0))) {
        return;
    }
    sfx(`enemy_${enemy.weapon}`, 0.65, enemy);
    sound.enemy_next = sound.ctx.currentTime + 0.16;
}

function update_environment_audio()
{
    if (
        !sound.ctx ||
        (state !== 'playing') ||
        muted ||
        document.hidden ||
        (sound.ctx.currentTime < (sound.environment_next || 0)) ||
        (distance(player, station) < 500)
    ) {
        return;
    }
    const z = world_zones.find(v => (distance(player, v) < v.r) && zone_state(v).active);
    if (z) {
        sfx(z.type);
        sound.environment_next = sound.ctx.currentTime + 2.5;
    }
}

function midi_frequency(note)
{
    return 440*Math.pow(2, (note - 69)/12);
}

function music_note(note, duration, type, volume, when, cutoff, shape = {})
{
    tone(midi_frequency(note), duration, type, volume, when, null, cutoff, sound.music_bus, shape);
}

function select_world_music()
{
    const id = campaign.world;
    const now = sound.ctx.currentTime;
    if ((sound.music_world === id) && sound.music_bus) {
        return;
    }
    if (sound.music_bus) {
        sound.music_bus.gain.cancelScheduledValues(now);
        sound.music_bus.gain.setTargetAtTime(0, now, 0.7);
        sound.retired_buses.push({bus: sound.music_bus, until: now + 9});
    }
    sound.music_bus = sound.ctx.createGain();
    sound.music_bus.gain.value = 0;
    sound.music_bus.connect(sound.music_trim);
    sound.music_bus.connect(sound.room);
    sound.music_world = id;
    sound.music_level = null;
    sound.enemy_next = 0;
    sound.environment_next = 0;
    sound.next = now + 0.035;
    sound.step = 0;
    el.sound_button.title = `${worlds[id].name} / ${world_audio[id].title} / MUSIC + SOUND EFFECTS`;
}

function schedule_music()
{
    if (!sound.ctx || (sound.ctx.state !== 'running')) {
        return;
    }
    const now = sound.ctx.currentTime;
    update_audio_scene();
    select_world_music();
    sound.retired_buses = sound.retired_buses.filter(function (v) {
        if (now < v.until) {
            return true;
        }
        v.bus.disconnect();
        return false;
    });
    const active = (settings_open || ['menu', 'playing', 'upgrade', 'transit', 'victory'].includes(state)) && !document.hidden && !muted;
    const level = active
        ? (now < sound.duck_until)
            ? 0.38
            : (state === 'menu')
                ? 0.42
                : (state === 'upgrade')
                    ? 0.54
                    : (state === 'transit')
                        ? 0.42
                        : sound.combat
                            ? 0.65
                            : 0.8
        : 0;
    if (sound.music_level !== level) {
        sound.music_bus.gain.setTargetAtTime(level, now, active ? 0.45 : 0.09);
        sound.music_level = level;
    }
    sound.music_trim.gain.setTargetAtTime(active ? volume_settings.music : 0, now, 0.09);
    if (active && !sound.was_active) {
        sound.step = Math.floor(sound.step/16)*16;
        sound.next = now + 0.035;
    }
    sound.was_active = active;
    if (!active) {
        sound.next = now + 0.04;
        return;
    }
    const p = world_audio[campaign.world];
    const eighth = 60/p.bpm/2;
    if (sound.next < now - 0.2) {
        sound.next = now + 0.035;
    }
    while (sound.next < now + 0.18) {
        music_step(p, sound.step, sound.next, sound.combat && (state === 'playing'));
        sound.next += eighth;
        sound.step++;
    }
}

function music_step(p, step, t, combat = 0)
{
    const s = step % 256;
    const beat = 60/p.bpm;
    const chord = p.chords[Math.floor(s/16) % 4];
    const section = Math.floor(s/64);
    const root = p.root + chord[0];
    if (s % 16 === 0) {
        for (let i = 0, end = chord.length; i < end; ++i) {
            const n = chord[i];
            const pan = ((i % 2) ? 1 : -1)*(0.3 + i*0.12);
            music_note(p.root + n + 12, beat*8 + 1.2, 'sine', 0.022, t + i*0.045, p.cutoff, {attack: 0.85, release: 1.8, pan, detune: (i % 2) ? 4 : -4});
            music_note(p.root + n + 12, beat*8 + 0.9, 'triangle', 0.006, t + i*0.055, p.cutoff*0.65, {
                attack: 1.1,
                release: 1.9,
                pan: -pan,
                detune: (i % 2) ? -6 : 6,
            });
        }
    }
    if (s % 8 === 0) {
        music_note(root, beat*3.8, 'sine', 0.055, t, 350, {attack: 0.12, release: 0.9, pan: 0});
    }
    // Phrases have breathing room and change register every sixteen bars.
    if (s % 4 === 2) {
        const i = Math.floor(s/4) % p.motif.length;
        const degree = p.motif[(i + ((section === 3) ? 2 : 0)) % p.motif.length];
        if ((degree !== null) && ((section !== 1) || (i % 2 === 0))) {
            const note = p.root + 24 + p.scale[degree % p.scale.length] + (((section === 2) && (i === 4)) ? 12 : 0);
            music_note(note, beat*((p.rhythm === 5) ? 3.2 : 1.7), 'sine', 0.039*p.air, t, p.cutoff*2, {
                attack: 0.025,
                release: beat,
                pan: (i % 2) ? 0.32 : -0.32,
            });
            if ((p.rhythm === 5) || (p.rhythm === 1)) {
                music_note(note + 12, beat*2.4, 'sine', 0.008, t + 0.08, 3500, {attack: 0.08, release: beat*1.4, pan: (i % 2) ? -0.45 : 0.45});
            }
        }
    }
    music_percussion(p, s, t, combat);
}

function music_percussion(p, s, t, combat = 0)
{
    const bus = sound.music_bus;
    const beat = 60/p.bpm;
    const id = p.rhythm;
    if ([0, 1, 2, 3, 6].includes(id) && (s % 16 === 0)) {
        tone((id === 2) ? 105 : 80, 0.23, 'sine', 0.038, t, 42, 300, bus);
    }
    if ([1, 2, 3, 6].includes(id) && (s % 8 === 6)) {
        noise(0.12, (id === 3) ? 0.026 : 0.017, 1800, t, bus, {pan: (s % 16 === 6) ? -0.25 : 0.25});
    }
    if ((id === 4) && (s % 32 === 0)) {
        tone(64, 0.65, 'sine', 0.05, t, 32, 250, bus, {attack: 0.05});
        tone(196, 0.9, 'sine', 0.008, t + 0.1, null, 500, bus, {attack: 0.03, pan: 0.4});
    }
    if ((id === 5) && (s % 32 === 20)) {
        music_note(p.root + 43, beat*3, 'sine', 0.014, t, 4000, {attack: 0.02, release: beat*2, pan: -0.5});
    }
    if ((id === 7) && (s % 32 === 0)) {
        tone(42, beat*3, 'sine', 0.032, t, 31, 180, bus, {attack: 0.4, release: beat*1.5});
    }
    if (combat) {
        if (s % 4 === 0) {
            tone(98, 0.18, 'sine', 0.065, t, 39, 360, bus);
        }
        if (s % 8 === 4) {
            noise(0.13, 0.038, 1600, t, bus, {pan: 0.1});
        }
        if (s % 2 === 1) {
            noise(0.055, 0.013, 3100, t, bus, {pan: (s % 4 === 1) ? -0.3 : 0.3});
        }
    }
}
const sfx_by_kind = {
    shot: sfx_shot,
    enemy_plasma: sfx_enemy_plasma,
    enemy_scatter: sfx_enemy_scatter,
    enemy_missile: sfx_enemy_missile,
    enemy_ion: sfx_enemy_ion,
    enemy_railgun: sfx_enemy_railgun,
    enemy_beam: sfx_enemy_beam,
    kill: sfx_kill,
    hit: sfx_hit,
    dash: sfx_dash,
    boost: sfx_boost,
    pulse: sfx_pulse,
    portal: sfx_portal,
    mine: sfx_mine,
    pickup: sfx_pickup,
    gravity: sfx_gravity,
    storm: sfx_storm,
    flare: sfx_flare,
    upgrade: sfx_upgrade,
    win: sfx_win,
};
function sfx(kind, volume = 1, position = null, when)
{
    if (kind === 'enemy_rail') {
        kind = 'enemy_railgun';
    }
    if (!sound.ctx || muted || document.hidden) {
        return;
    }
    const t = (when === undefined) ? sound.ctx.currentTime : when;
    const effect = sfx_by_kind[kind];
    if (t < (sound.cues[kind] || 0)) {
        return;
    }
    sound.cues[kind] = t + (effect ? effect.limit : 0.08);
    let pan = 0;
    if (position && player) {
        const dx = position.x - player.x;
        const dy = position.y - player.y;
        pan = clamp(((view_mode === 'cockpit') ? Math.sin(Math.atan2(dy, dx) - player.angle)*Math.hypot(dx, dy) : dx)/750, -0.85, 0.85);
        volume *= clamp(1 - distance(player, position)/1500, 0.12, 1);
    }
    const shape = {pan};
    const v = clamp(volume, 0, 1.5);
    const bus = sound.fx_bus;
    function note(f, d, a, end = null, type = 'sine', delay = 0, cutoff = 2200) {
        return tone(f, d, type, a*v, t + delay, end, cutoff, bus, shape);
    }
    function air(d, a, f, delay = 0) {
        return noise(d, a*v, f, t + delay, bus, shape);
    }
    if (effect) {
        effect.play(note, air, t);
    }
}

function expedition_base_update_hud()
{
    physics_audio_base_update_hud();
    if (!player) {
        return;
    }
    const v = nearest_gravity();
    const out = document.getElementById('gravity_warning');
    out.classList.toggle('hidden', !v);
    if (v) {
        out.textContent = `${(v.d < v.h.radius) ? 'STRONG GRAVITY' : 'OUTER GRAVITY FIELD'} · ${Math.ceil(v.pull)} m/s PULL · STEER AWAY / SHIFT TURBO`;
    }
    el.sound_button.title = `${worlds[campaign.world].name} / ${world_audio[campaign.world].title} / MUSIC + SOUND EFFECTS`;
}
