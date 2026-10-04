// The lure stage: a Leviathan that guns cannot hurt hunts you, and only a black hole can take it. Fly to the marked
// black hole and it comes for you; keep ahead of it and lead it across the hole's pull. Your ship is light and climbs
// out; its thrust is too weak against the pull, and the core takes it.
const leviathan_speed = 130;

// Each frame for a contract on a lure stage in this world
function lure_update(m)
{
    const hole = lure_hole(m);
    if (!hole) {
        return;
    }
    const alive = enemies.some(v => v.leviathan && (v.operation_id === m.id) && (v.hp > 0));
    if (!alive && (distance(player, hole) < gravity_reach(hole) + 300)) {
        // it comes from the far side of you, so the hole lies between it and you or beside you
        const a = Math.atan2(player.y - hole.y, player.x - hole.x);
        const point = {x: player.x + Math.cos(a)*900, y: player.y + Math.sin(a)*900};
        const v = spawn_operation_enemy(m, 'tank', point);
        v.leviathan = true;
        v.r = 80;
        v.hp = v.max_hp = 1e9;
        v.speed = leviathan_speed;
        v.weapon = null;
        show_toast('LEVIATHAN', 'GUNS CANNOT HURT IT · LEAD IT INTO THE BLACK HOLE', 4);
    }
}

// The black hole of the stage: the one nearest the Leviathan once it is out (any hole will take it), before that the
// one nearest you
function lure_hole(m)
{
    const leviathan = enemies.find(v => v.leviathan && (v.operation_id === m.id) && (v.hp > 0));
    const from = leviathan || player;
    return black_holes.slice().sort((a, b) => distance(a, from) - distance(b, from))[0] || null;
}

// Where the guide leads you: the edge of the hole's pull on your side, never its core
function lure_goal(m)
{
    const hole = lure_hole(m);
    if (!hole) {
        return null;
    }
    const a = Math.atan2(player.y - hole.y, player.x - hole.x);
    const r = gravity_reach(hole)*0.8;
    return {x: hole.x + Math.cos(a)*r, y: hole.y + Math.sin(a)*r, label: 'BLACK HOLE'};
}

// The Leviathan's distance to the core of the stage's hole, for the card
function lure_text(m)
{
    const hole = lure_hole(m);
    const leviathan = enemies.find(v => v.leviathan && (v.operation_id === m.id) && (v.hp > 0));
    if (!hole || !leviathan) {
        return 'the Leviathan comes when you near the hole';
    }
    return `Leviathan ${hud_distance(Math.max(0, distance(leviathan, hole) - hole.core)).join(' ')} from the core`;
}
