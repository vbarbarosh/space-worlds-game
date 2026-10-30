// The arcade's stakes (the author, 2026-10-30, on a world's five minutes: "engaging"): choices with something at stake
// in every Free wave, and a fight you can come back from (docs/interest.md: Sid Meier's interesting decisions; close
// calls). Waves 3 and 5 bring a prize event too, a fleeing ace or a freighter of salvage to go for or leave, besides the
// world's own events in waves 2 and 4; a Scroll lane an ace a quarter of the way along, besides its own event halfway
// (but in the run's last world, as that one). Low on hull, the next kill drops a repair kit to fly in for, and your
// guns hit harder while you hold on.

// the waves that bring a prize event, and the kind each brings
const stakes_prize_waves = {3: 'ace', 5: 'convoy'};
const stakes_lane_at = 0.25;
// under this share of the hull: a kill drops a repair kit (one in this many s at most), and the guns hit this much harder
const stakes_low = 0.35;
const stakes_kit_gap = 20;
const stakes_last_stand = 1.5;

// Whether a Free wave brings a prize event
function stakes_event_wave(n)
{
    return !arcade_scroll_on() && !!stakes_prize_waves[n];
}

// The prize event this wave brings, or a lane's now, or null for the world's own
function stakes_event_kind()
{
    return arcade.stakes_lane_now ? 'ace' : stakes_event_wave(arcade.wave) ? stakes_prize_waves[arcade.wave] : null;
}

// Each frame of a lane: its ace once the screen has come a quarter of the way
function stakes_update()
{
    if (!arcade_scroll_on() || arcade.stakes_lane_done || (arcade_level() >= arcade_worlds - 1) || (arcade_scroll.s < arcade_scroll.length*stakes_lane_at)) {
        return;
    }
    arcade.stakes_lane_done = true;
    arcade.stakes_lane_now = true;
    arcade_event_start();
    arcade.stakes_lane_now = false;
}

// A kill while the hull is low drops a repair kit, one in stakes_kit_gap s at most
function stakes_kill(enemy)
{
    if ((player.hp >= hull_max()*stakes_low) || (run_time - (arcade.stakes_kit_at ?? -1e9) < stakes_kit_gap)) {
        return;
    }
    arcade.stakes_kit_at = run_time;
    drop_pickup(enemy.x, enemy.y, 'medkit');
    label(enemy.x, enemy.y - 24, 'REPAIR KIT', '#7dffb0');
}

// The factor on your shots' damage: a last stand while the hull is low, said once a world
function stakes_damage_k()
{
    if (!arcade.active || (player.hp >= hull_max()*stakes_low)) {
        return 1;
    }
    if (arcade.stakes_said !== campaign.world) {
        arcade.stakes_said = campaign.world;
        show_toast('LAST STAND', 'LOW HULL · YOUR GUNS HIT HARDER · A KILL DROPS A REPAIR KIT', 3, 'danger');
    }
    return stakes_last_stand;
}
