// Crowds hurt in the arcade. After a hit you are safe for a moment, and a hit that lands then is lost: with 0.85 s of
// it for any hit, one raider firing at you filled most of it, and twelve hurt little more than three. In the arcade
// the safe time after a raider's shot is that raider's own, 0.35 s: its next hit within it is lost, the others' only
// within an instant (so a missile and a shot that land together count once). A crowd's hit is smaller, so three
// raiders hurt about as much as before and twelve two to three times more (docs/balance.md, Crowds). What hurts for as
// long as you touch it (a ram, a flagship's beam or pool, a flare, a rock) and a flagship's own fire keep 0.85 s for
// any hit, and their whole hit: they hurt as they did. The campaign keeps 0.85 s for any hit, and its hits as they are.

// the safe time after a hit (s): after a touch or in the campaign; from the raider whose shot it was; from anyone
const arcade_touch_safe = 0.85;
const arcade_raider_safe = 0.35;
const arcade_crowd_safe = 0.1;
// a crowd's hit in the arcade, as a share of what it was
const arcade_crowd_hit = 0.45;
// the causes a crowd brings (damage_player's cause): a shot, a missile's wave, a dying ship's blast
const arcade_crowd_causes = ['shot', 'missile', 'ship blast'];

// Whether a hit is a crowd's: in the arcade, a raider's shot, missile or blast; a flagship's fire is not
function arcade_crowd_hit_is(cause, by)
{
    return arcade.active && arcade_crowd_causes.includes(cause) && !(by && ((by.from === 'boss') || (by.type === 'boss')));
}

// The raider a crowd's hit came from: the one that fired the shot (its `raider`), or the ship that blew up; null for a
// missile's wave
function arcade_hit_raider(by)
{
    return by ? (by.raider || by) : null;
}

// Whether a crowd's hit is lost: its raider hit you within its own safe time (damage_player)
function arcade_hit_held(cause, by)
{
    const raider = arcade_crowd_hit_is(cause, by) && arcade_hit_raider(by);
    return !!raider && (time < (raider.safe_until || 0));
}

// The share of a hit that lands: smaller for a crowd's, all of it otherwise (damage_player)
function arcade_hit_share(cause, by)
{
    return arcade_crowd_hit_is(cause, by) ? arcade_crowd_hit : 1;
}

// The safe time a hit leaves for any hit (s); after a crowd's, its raider keeps a longer one of its own
function arcade_hit_safe(cause, by)
{
    if (!arcade_crowd_hit_is(cause, by)) {
        return arcade_touch_safe;
    }
    const raider = arcade_hit_raider(by);
    if (raider) {
        raider.safe_until = time + arcade_raider_safe;
    }
    return arcade_crowd_safe;
}
