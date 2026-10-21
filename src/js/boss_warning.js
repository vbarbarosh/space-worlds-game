// A flagship's arrival sounds an alarm on the screen: its edges pulse red three times (Galaxy Attack's boss warning,
// the author's screenshots). At the edges only: the middle of the screen is for flying (docs/principles.md), and the
// news already names the flagship as it comes (boss_state_new).
const boss_warning_time = 2.4;
const boss_warning_pulses = 3;
// The warning's time left, s; the flagships already warned of
let boss_warning = 0;
const boss_warning_seen = new WeakSet();

function boss_warning_update(dt)
{
    boss_warning = Math.max(0, boss_warning - dt);
    if (state !== 'playing') {
        return;
    }
    for (const v of enemies) {
        if ((v.type === 'boss') && (v.hp > 0) && !boss_warning_seen.has(v)) {
            boss_warning_seen.add(v);
            boss_warning = boss_warning_time;
        }
    }
}

// Screen space: a red glow from the edges inward, pulsing
function render_boss_warning()
{
    if (!boss_warning) {
        return;
    }
    const p = 1 - boss_warning/boss_warning_time;
    const pulse = Math.pow(Math.sin(p*Math.PI*boss_warning_pulses), 2);
    const g = ctx.createRadialGradient(W/2, H/2, Math.min(W, H)*0.3, W/2, H/2, Math.max(W, H)*0.75);
    g.addColorStop(0, 'rgba(255, 40, 60, 0)');
    g.addColorStop(1, `rgba(255, 40, 60, ${(0.5*pulse).toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
}
