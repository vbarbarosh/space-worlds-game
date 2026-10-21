// One generator charges the ship (the author, 2026-10-20: "a generator gives the energy, and these things refill from
// it ... I buy a stronger generator, it gives more power"): its output a second goes to the shield first, once the
// last hit is shield_mend_delay behind, then the turbo and the pulse share what is left, the one that is full giving
// its share to the other. A bigger generator charges all three faster: its output follows the reactor's power
// (arcade_power_capacity: the ship's own, one a world cleared, the Reactor tunings), the power that also holds the
// modules, and each Generator module level adds to it. An energy cell pours into the same supply. Kills and salvage
// charge nothing. A world's own trickle or drain of the pulse (Haven, Verdant, Eclipse), a storm's harvest and Ion
// Reach's charge fields stay the pulse's own.

// The output a second: this many units a unit of the reactor's power, and this many a Generator module level
const generator_per_power = 2;
const generator_per_level = 5;
// What each takes from it: a point of shield, a second of turbo (cheaper as the Turbo drive and the cooling shorten
// its cooldown: dash_cooldown, 8 s with neither), a percent of the pulse
const generator_cost = {shield: 2, turbo: 5, pulse: 2};
// An energy cell's units
const generator_cell = 50;
// what the generator charged this frame, for the gauges' marks (sync_ship_status)
const generator = {shield: false, turbo: false, pulse: false, poured: 0};

// The units a second: a new run's Wisp Scout, 4 units of power, makes 8, its shield refilled at 4 a second (5 before,
// after 5 s with no hit, not 2)
function generator_output()
{
    return generator_per_power*arcade_power_capacity() + generator_per_level*upgrades.reactor;
}

// An energy cell, or anything else that pours into the supply: spent over the next frames as the output is
function generator_pour(units)
{
    generator.poured += units;
}

// Each frame (update): the output and what was poured in go to the shield first, then the turbo and the pulse share the
// rest; whatever is not needed is lost
function generator_update(dt)
{
    let supply = generator_output()*dt + generator.poured;
    generator.poured = 0;
    // the shield, a world's own factor on it (an ion storm weakens it, Cryosphere's cooling helps)
    const shield_k = current_world_rules().shield + ((campaign.world === 5) ? upgrades.cooling*0.15 : 0);
    const shield_need = ((player.since_hit > shield_mend_delay) && (shield_k > 0)) ? Math.max(0, shield_max() - player.shield)*generator_cost.shield/shield_k : 0;
    const to_shield = Math.min(supply, shield_need);
    player.shield = Math.min(shield_max(), player.shield + to_shield/generator_cost.shield*shield_k);
    supply -= to_shield;
    // the turbo (not while it burns, nor in the moment after a dash) and the pulse, half each, a full one's half the
    // other's
    // the world's own trickle or drain of the pulse first, then the charge: a drain after it (Eclipse's, 1.8 a second)
    // left a full pulse at 99.97, never Ready (the author, 2026-10-21: "it does not rise above 99%")
    player.energy = clamp(player.energy + current_world_rules().energy*dt, 0, 100);
    const turbo_cost = generator_cost.turbo*dash_cooldown()/8;
    const turbo_need = (!player.turbo_active && ((player.dash_cd || 0) <= 0)) ? Math.max(0, turbo_duration() - turbo_fuel())*turbo_cost : 0;
    const pulse_need = Math.max(0, 100 - player.energy)*generator_cost.pulse;
    const to_turbo = Math.min(turbo_need, Math.max(supply/2, supply - pulse_need));
    const to_pulse = Math.min(pulse_need, supply - to_turbo);
    player.turbo_fuel = Math.min(turbo_duration(), turbo_fuel() + to_turbo/turbo_cost);
    player.energy = Math.min(100, player.energy + to_pulse/generator_cost.pulse);
    generator.shield = to_shield > 0;
    generator.turbo = to_turbo > 0;
    generator.pulse = to_pulse > 0;
}
