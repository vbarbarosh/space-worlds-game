// The moments that had no sound of their own: a button, docking, the shield breaking and closing, a low hull, a life
// lost, a wave coming, cresting and cleared, the guns locked by heat, the combo climbing, an arcade event, radiation,
// the pulse charged, a run begun, a world cleared. Each is told by what changed since the last look
// (sound_moments_watch, on the music's clock, 16 times a second), so no part of the game has to call for them. Their
// sounds are the new set's (src/js/sfx_new/): in the classic set these moments stay silent, as they were.
const sound_moments = {
    state: 'menu',
    shield: null,
    shield_worn: false,
    hull_next: 0,
    lives: null,
    wave: null,
    crest: false,
    rest: false,
    overheated: false,
    combo: 1,
    event: null,
    dose: 0,
    energy: null,
    energy_spent: false,
};
// Under this share of its hull the ship's alarm calls, this often (s)
const sound_hull_low = 0.3;
const sound_hull_every = 2.8;

function sound_moments_watch()
{
    const m = sound_moments;
    const now = sound.ctx.currentTime;
    const was = m.state;
    if (state !== was) {
        m.state = state;
        sound_moments_state(was);
    }
    // a life lost is heard whatever screen follows it
    const lives = arcade.active ? arcade.lives : null;
    if ((lives !== null) && (m.lives !== null) && (lives < m.lives)) {
        sfx('life_lost');
    }
    m.lives = lives;
    if ((state !== 'playing') || !player) {
        m.shield = null;
        m.energy = null;
        m.wave = arcade.active ? arcade.wave : null;
        m.event = arcade.event ? arcade.event.kind : null;
        m.combo = combo;
        return;
    }
    sound_moments_ship(m, now);
    const wave = arcade.active ? arcade.wave : null;
    if ((wave !== null) && (m.wave !== null) && (wave > m.wave)) {
        sfx('wave_start');
    }
    m.wave = wave;
    // a wave's crest breaking (arcade_pace.js), and the breather after a wave is cleared
    const crest = arcade.active && !!arcade.pace && arcade.pace.crest;
    if (crest && !m.crest) {
        sfx('crest');
    }
    m.crest = crest;
    const rest = arcade.active && (arcade.pause > 0);
    if (rest && !m.rest) {
        sfx('wave_clear');
    }
    m.rest = rest;
    const event = arcade.event ? arcade.event.kind : null;
    if (event && (event !== m.event)) {
        sfx(({convoy: 'event_convoy', ace: 'event_ace', jammer: 'event_jammer'})[event] || 'event_danger');
    }
    m.event = event;
    if (combo > m.combo) {
        sfx('combo');
    }
    m.combo = combo;
}

// The screen changed from `was`
function sound_moments_state(was)
{
    if ((state === 'upgrade') && (was === 'playing')) {
        sfx(arcade.active ? 'card_open' : 'dock');
    }
    else if ((state === 'playing') && (was === 'upgrade') && !arcade.active) {
        sfx('undock');
    }
    else if ((state === 'paused') || (was === 'paused')) {
        sfx('pause');
    }
    else if ((state === 'playing') && (was === 'menu')) {
        sfx('launch');
    }
    else if (state === 'victory') {
        sfx('victory');
    }
}

// The ship's own moments in flight: its shield, hull, guns, pulse and the radiation in it
function sound_moments_ship(m, now)
{
    const top = shield_max();
    if (top > 0) {
        // broken: from a tenth of it or more to next to nothing (it starts to close again at once, so it is seldom
        // seen at nought)
        if ((m.shield !== null) && (m.shield > top*0.1) && (player.shield < top*0.05)) {
            sfx('shield_down');
        }
        m.shield_worn = m.shield_worn || (player.shield < top*0.35);
        if (m.shield_worn && (player.shield >= top)) {
            m.shield_worn = false;
            sfx('shield_up');
        }
    }
    m.shield = player.shield;
    if ((player.hp > 0) && (player.hp < hull_max()*sound_hull_low)) {
        if (now >= m.hull_next) {
            sfx('hull_low');
            m.hull_next = now + sound_hull_every;
        }
    }
    else {
        m.hull_next = 0;
    }
    if (!!player.overheated !== m.overheated) {
        m.overheated = !!player.overheated;
        sfx(m.overheated ? 'overheat' : 'guns_ready');
    }
    // the counter ticks while the dose grows, the faster the higher it stands
    const dose = player.radiation_dose || 0;
    if ((dose > m.dose) && (Math.random() < 0.12 + dose/100*0.7)) {
        sfx('geiger', 0.5 + dose/200);
    }
    m.dose = dose;
    const energy = player.energy;
    if (Number.isFinite(energy)) {
        m.energy_spent = m.energy_spent || (energy < 60);
        if (m.energy_spent && (m.energy !== null) && (m.energy < 100) && (energy >= 100)) {
            m.energy_spent = false;
            sfx('pulse_ready');
        }
        m.energy = energy;
    }
}

// A button pressed anywhere on the page answers with a tick
document.addEventListener('click', function (event) {
    if (event.target.closest && event.target.closest('button, summary, [role="button"]')) {
        sfx('ui_click');
    }
}, true);
