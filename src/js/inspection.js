// A guard's inspection (docs/scenario/README.md, World guards): the one who leads the wing flies alongside you, and
// the scan runs while you hold slow beside it. A Suspect pilot is stopped whenever the wing comes near; a Neutral or
// Established one only with sealed cargo aboard, and then four times in ten, once a visit; a Trusted one never. The
// scan done, contraband is taken with a fine and 2 reputation; flying off costs 1 (neither makes you Wanted), and
// while it runs the station holds your docking.
const inspection_reach = 900;
// The scan's time while you hold within inspection_hold of the guard and under inspection_slow (s, m, m/s)
const inspection_time = 4;
const inspection_hold = 450;
const inspection_slow = 150;
// Farther from the guard than this, you have fled
const inspection_flee = 1300;
// The chance a pilot who is not Suspect is stopped with sealed cargo aboard, rolled once a visit
const inspection_chance = 0.4;
// After an inspection, the next not before this long (s); after you flee, a minute
const inspection_gap = 180;

const inspection = {active: false, progress: 0, next: 0, roll: null, world: -1};

// A new world: no inspection under way, and the roll for the visit not yet made; one fled in the world you left costs
// its reputation there
function inspection_reset()
{
    if (inspection.active && (inspection.world >= 0)) {
        inspection_fled(inspection.world);
    }
    inspection.active = false;
    inspection.progress = 0;
    inspection.next = 0;
    inspection.roll = null;
    inspection.world = campaign.world;
}

// Whether the wing stops you now (or goes on with a scan under way)
function inspection_due(lead)
{
    if (inspection.active) {
        return true;
    }
    // an inspection stage: the wing scans you whatever your standing, once you come near (inspection_stage)
    if (inspection_stage() && (clock >= inspection.next) && (distance(lead, player) < inspection_reach) && (reputation_tier().id !== 'wanted')) {
        inspection_start();
        return true;
    }
    const tier = reputation_tier().id;
    if ((clock < inspection.next) || !['suspect', 'neutral', 'established'].includes(tier) || (distance(lead, player) > inspection_reach)) {
        return false;
    }
    if (tier !== 'suspect') {
        if (!contraband_aboard()) {
            return false;
        }
        inspection.roll = inspection.roll ?? (Math.random() < inspection_chance);
        if (!inspection.roll) {
            return false;
        }
    }
    inspection_start();
    return true;
}

function inspection_start()
{
    inspection.active = true;
    inspection.progress = 0;
    inspection.world = campaign.world;
    show_toast(`${guard_wing_names[campaign.world].toUpperCase()}: INSPECTION`, 'SLOW DOWN BESIDE THE GUARD FOR THE SCAN', 4, 'danger');
}

// The inspection stage under way in this world, if any: pass a scan clean
function inspection_stage()
{
    return campaign.contracts.find(v => !v.ready && (v.type === 'inspection') && (v.world === campaign.world)) || null;
}

// Every frame of an inspection: the scan runs while you hold slow beside the guard; too far is fleeing
function inspection_update(dt, guard)
{
    const d = distance(guard, player);
    if (d > inspection_flee) {
        inspection_fled(campaign.world);
        inspection.active = false;
        inspection.next = clock + 60;
        return;
    }
    if ((d < inspection_hold) && (Math.hypot(player.vx, player.vy) < inspection_slow)) {
        inspection.progress = Math.min(1, inspection.progress + dt/inspection_time);
    }
    if (inspection.progress >= 1) {
        inspection_finish();
    }
}

// Fled: 1 reputation in that world, down to Suspect at worst
function inspection_fled(id)
{
    reputation_change(id, -1, 'fled inspection', -4);
    show_toast(`${guard_wing_names[id].toUpperCase()}: INSPECTION EVADED`, '−1 REPUTATION', 4, 'danger');
}

// The scan done: contraband taken, with a fine (what you cannot pay of it forgiven) and 2 reputation; or cleared
function inspection_finish()
{
    const id = campaign.world;
    const found = contraband_aboard();
    inspection.active = false;
    inspection.next = clock + inspection_gap;
    if (!found) {
        show_toast(`${guard_wing_names[id].toUpperCase()}: CLEARED`, 'NOTHING TO DECLARE', 3, 'info');
        mission_event('inspection', 1);
        return;
    }
    const fine = Math.min(Math.max(0, salvage), Math.round((100 + found*contraband_price(id)*0.5)/10)*10);
    campaign.cargo[contraband.key] = 0;
    salvage -= fine;
    play_log_spend('fine', 'contraband', fine);
    reputation_change(id, -2, 'contraband', -4);
    // the amount not at the end: a toast ending in ◆ n reads as income (show_toast)
    show_toast('CONTRABAND FOUND', `FINE ◆ ${fine} · ${found} SEALED CARGO TAKEN`, 5, 'danger');
}

// The station holds your docking while a scan runs
function inspection_holds_docking()
{
    if (!inspection.active) {
        return false;
    }
    show_toast('DOCKING HELD', 'INSPECTION UNDER WAY · SLOW DOWN BESIDE THE GUARD', 3, 'danger');
    return true;
}

// Over your ship while a scan runs: what it asks, how far along, and a dashed line from the guard
function inspection_render(guard)
{
    // a fight first: the scan waits, and so does its label
    if (!inspection.active || !player || (guard_wing.mode !== 'inspect')) {
        return;
    }
    ctx.save();
    ctx.strokeStyle = guard.color;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 2/zoom;
    ctx.setLineDash([6/zoom, 6/zoom]);
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(player.x, player.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 4/zoom;
    ctx.beginPath();
    ctx.arc(player.x, player.y, ship_halo() + 10/zoom, -Math.PI/2, -Math.PI/2 + Math.PI*2*inspection.progress);
    ctx.stroke();
    ctx.restore();
    const slow = Math.hypot(player.vx, player.vy) < inspection_slow;
    const near = distance(guard, player) < inspection_hold;
    world_label(player.x, player.y - ship_halo() - 40/zoom, 'INSPECTION', `${(slow && near) ? 'scanning' : near ? 'slow down' : 'close in'} · ${Math.round(inspection.progress*100)}%`, guard.color);
}
