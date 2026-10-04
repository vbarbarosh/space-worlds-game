const canvas = document.getElementById('arena');
const ctx = canvas.getContext('2d', {alpha: false});
const el = {};
for (const id of [
    'intro',
    'hud',
    'bottom_hud',
    'score',
    'sector',
    'combo',
    'health_text',
    'health_fill',
    'pulse_text',
    'pulse_fill',
    'dash_text',
    'dash_fill',
    'pause_button',
    'pause_overlay',
    'upgrade_overlay',
    'choices',
    'result_overlay',
    'result_eyebrow',
    'result_title',
    'result_description',
    'result_score',
    'result_sector',
    'result_best',
    'best_intro',
    'bossbar',
    'boss_fill',
    'touch_buttons',
    'salvage',
    'mission',
    'act_label',
    'mission_name',
    'mission_phase',
    'run_time',
    'sector_progress',
    'loadout',
    'inventory_button',
    'inventory_overlay',
    'inventory_grid',
    'shop_grid',
    'shop_wallet',
    'dock_summary',
    'dock_status',
    'next_sector',
    'continue_button',
    'shield_readout',
    'map_coordinates',
    'navigation_status',
]) {
    el[id] = document.getElementById(id);
}
const cyan = '#6cf8ec';
const pink = '#ff5baf';
const gold = '#ffd16e';
const blue = '#8d9cff';
const keys = new Set();
const pointer = {x: 0, y: 0, screen_x: 0, screen_y: 0, last: -100, active: false};
// turbo_since: when the left button went down in follow mode; held 0.15 s it counts as turbo
// held: the left button is down outside follow mode; the ship steers to the cursor until it is let go
// arriving: closing on a clicked point, where turbo stays out; arrival_hold: turbo input held through an arrival, not relit
const mouse_drive = {turbo_since: -1, follow_boost: 1, active: false, following: false, held: false, arriving: false, arrival_hold: false, id: null, x: 0, y: 0, screen_x: 0, screen_y: 0};
const world = {w: 4160, h: 3320};
const camera = {x: 0, y: 0};
let scenery = [];
let black_holes = [];
let portals = [];
let mining_fields = [];
let ore_nodes = [];
const joystick = {active: false, id: null, x: 0, y: 0, dx: 0, dy: 0};
let width = innerWidth;
let height = innerHeight;
let W = width;
let H = height;
let scale = 1;
let ox = 0;
let oy = 0;
let dpr = 1;
let zoom = 1;
let settings_open = false;
let audio_focus_return = null;
let volume_settings = {master: 0.85, music: 0.65, effects: 0.85, ambience: 0.7};
try {
    const saved_zoom = Number(localStorage.getItem('pulse_drift_zoom'));
    if (Number.isFinite(saved_zoom) && (saved_zoom >= 0.5) && (saved_zoom <= 2)) {
        zoom = saved_zoom;
    }
    const saved_audio = JSON.parse(localStorage.getItem('pulse_drift_audio') || 'null');
    if (saved_audio && (typeof saved_audio === 'object')) {
        for (const key of ['master', 'music', 'effects', 'ambience']) {
            const v = saved_audio[key];
            if ((typeof v === 'number') && Number.isFinite(v)) {
                volume_settings[key] = Math.max(0, Math.min((key === 'master') ? 2 : 1, v));
            }
        }
    }
}
catch {
}
let view_mode = 'wireframe';
try {
    const saved_view = localStorage.getItem('pulse_drift_view');
    if (['rendered', 'cockpit'].includes(saved_view)) {
        view_mode = saved_view;
    }
}
catch {
}
let state = 'menu';
// A window that loses focus pauses the game; the agent's window plays on, since nobody there is looking away.
let pause_on_blur = true;
// Whether the minimap shows (its corner button, js/turrets.js)
let minimap_on = true;
let difficulty = 'normal';
let muted = false;
let full_fx = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let time = 0;
let last_frame = 0;
let clock = 0;
let ui_timer = 0;
let score = 0;
let best = 0;
let kills = 0;
let wave = 1;
let combo = 1;
let combo_timer = 0;
let spawn_left = 0;
let spawn_timer = 0;
let wave_timer = 0;
let shake = 0;
let flash = 0;
let freeze = 0;
let victory_timer = 0;
let player;
let enemies = [];
let bullets = [];
let hostile = [];
let particles = [];
let rings = [];
let pickups = [];
let labels = [];
let trail = [];
let stars = [];
let upgrades = initial_upgrades();
let salvage = 0;
let artifacts_count = 0;
let run_time = 0;
let phase_index = 0;
let phase_timer = 0;
let phase_spawning = false;
let boss_spawned = false;
let boss_defeated = false;
let supplies = {medkit: 2, emp: 1, stasis: 1};
let stasis_time = 0;
let drone_cd = 0;
let drop_timer = 0;
let hazard_timer = 0;
let dock_free_chosen = false;
let dock_free_keys = [];
let shop_filter = 'all';
let inventory_return = 'playing';
let checkpoint = null;
let checkpoint_notice = '';
let dock_message = '';
let hazards = [];
