# World Explorer: balance

How hard the game is, what things cost and what they pay, and where each
number lives, so the next change knows what to edit. Every number here is
read from the code; a change to the code changes this file too.

Two modes share one combat core and differ in tuning:

- **Arcade** (`src/js/arcade.js`): one run through the eight worlds, three
  waves each, the flagship in the third. Its numbers are tuned for a short,
  dense run; three difficulty rows in `arcade_modes` change them.
- **Campaign** (stations, contracts, trade): raiders come in patrols, the
  world's armour and shields are met at full strength, and the pace is set by
  contracts and ranks.

The world files (`src/js/worlds/<world>.js`) are the base both modes start
from.

## The worlds: threat, armour, shields

Each world has a threat level, `wave`, that scales raiders' hull and speed,
and an armour share and shield that every raider there carries.

| World | wave | Armour | Shield | Raider gun | Gate needs: weapons / defence / radiation |
|---|---|---|---|---|---|
| Haven | 1 | 0 | 0 | plasma | 0 / 0 / 0% |
| Verdant | 3 | 12% | 0 | scatter | 1 / 1 / 0% |
| Dustfall | 5 | 25% | 0 | missile | 2 / 1 / 0% |
| Ion Reach | 7 | 20% | 65 | ion | 4 / 3 / 15% |
| Obsidian | 9 | 50% | 45 | rail | 7 / 4 / 30% |
| Cryosphere | 11 | 35% | 140 | scatter | 10 / 5 / 0% |
| Nova Forge | 13 | 60% | 90 | missile | 12 / 5 / 80% |
| Eclipse | 15 | 65% | 200 | rail | 15 / 6 / 90% |

- Where: `world.wave`, `world.armor`, `world.shield`, `world.weapon`,
  `world.attack`, `world.defense` and `expedition.required` in each world file.
- The gate check (`allowed_world` in `src/js/campaign.js`) compares the gate's
  needs with your ratings:
  - weapons (`attack_rating`): Hotter plasma + Rapid resonance levels + 3 per
    Prism level + 2 per Orbit drone + Guided plasma level + the gun rating
    (`guns_rating` in `src/js/hardpoints.js`: your best gun's `rating` plus
    its tier minus 1, and 2 more for each gun past the first);
  - defence (`defense_rating`): Phase armor + Shield capacitor levels + the
    ship's shield / 35, rounded down;
  - radiation (`radiation_protection` in `src/js/expedition.js`): the hull's
    own share + 20% per Radiation lining level, at most 98%;
  - armour (`armour_rating`, `gate_armour_share` in `src/js/campaign.js`):
    one mounted gun that keeps at least 20% of each hit through the world's
    raider armour (`gun_armour_share` in `src/js/hardpoints.js`; the armour
    at the story's front, `world_armour`). A cannon with no Hotter plasma
    keeps 19% in Dustfall, so the guide's plan adds Hotter plasma 1 (38);
    in Obsidian the cannon, the shotgun and the ion gun keep 9% to 13% at
    any tier a pilot has by then, so the plan names a gun that bites (the
    Seeker or the Lance railgun, licensed at Vanguard with chapter 4). The
    guide's plan adds up to two Hotter plasma levels when they are enough,
    else that gun (`preparation_plan` in `src/js/guide.js`), and its button
    opens the ARSENAL. Before, the gate let a pilot with a shotgun into
    Obsidian, where it died over and over (18 to 39 deaths for the bot).
- The raider mix (`world.mix`) is the share of each type: chaser, tank,
  shooter, splitter, lancer. Haven is `[0.7, 0, 0.3, 0, 0]`: chasers and
  shooters only.
- Each world's flight rules (`rules` in the world file) change speed, shield
  recharge, gravity and the pulse energy drain; they are part of the
  difficulty too. Eclipse drains 1.8 pulse a second; Haven recharges shields
  25% faster.

## Raiders

A raider's hull grows with the world's `wave` (`base_spawn_enemy` in
`src/js/combat.js`):

| Type | Hull | Speed | Score | XP |
|---|---|---|---|---|
| chaser | 22 + 7·wave | 90 + 5·wave | 80 | 2 |
| tank | 80 + 13·wave | 53 + 2·wave | 140 | 6 |
| shooter | 38 + 9·wave | 70 + 2·wave | 100 | 3 |
| splitter | 52 + 10·wave | 90 + 5·wave | 110 | 3 |
| lancer | 35 + 9·wave | 100 | 80 | 4 |
| shard (from a splitter) | 12 + 3·wave | 150 + 3·wave | 80 | 1 |

That gives, in the campaign at NORMAL:

| World | chaser | tank | shooter | splitter | lancer | shield (tank) |
|---|---|---|---|---|---|---|
| Haven | 29 | 93 | 47 | 62 | 44 | 0 |
| Verdant | 43 | 119 | 65 | 82 | 62 | 0 |
| Dustfall | 57 | 145 | 83 | 102 | 80 | 0 |
| Ion Reach | 71 | 171 | 101 | 122 | 98 | 65 (91) |
| Obsidian | 85 | 197 | 119 | 142 | 116 | 45 (63) |
| Cryosphere | 99 | 223 | 137 | 162 | 134 | 140 (196) |
| Nova Forge | 113 | 249 | 155 | 182 | 152 | 90 (126) |
| Eclipse | 127 | 275 | 173 | 202 | 170 | 200 (280) |

- A tank carries 1.4 times the world's shield (`spawn_enemy` in
  `src/js/campaign.js`).
- **The story's front** (campaign; `raider_tier` in `src/js/campaign.js`):
  a world the story has moved past fights harder. Its tier is the larger of
  the world's index and the chapters claimed less one. Past the world's own
  index, each tier is a threat level of two more `wave` (hull and speed, as
  in the tables), 4% more armour (72% at most), 15 more shield, 8% more to
  the raider's gun, 8% more flagship hull, and a patrol as often and as many
  as that tier's world sends. In act I it touches only a world you go back
  to (Haven during chapter 3 fights like Verdant). In act II (chapters 9 to
  16, story 8 to 15) every world fights seven tiers past its own: Haven's
  raiders have Eclipse's hull and guns, 28% armour and 105 shield; Eclipse's
  in chapter 16 have a threat level of 29 (a chaser 225 hull), 72% armour,
  305 shield and guns 2.12 times Haven's.
- A shot is taken by the shield first; what passes is cut by the armour
  twice (`armour_hull_damage` in `src/js/campaign.js`): its plating takes a
  flat 50 × the armour share off every hit, never more than three quarters
  of it, then the share takes the rest in proportion. Many small bolts lose
  more to a heavy hull than one slug does: in Eclipse (52% in the arcade) a
  hit loses 26 before the share. A raider's shield comes back at 10
  a second after 6 seconds unhit (`src/js/navigation.js`).
- Raider guns (`world_audio_base_enemy_fire` in `src/js/campaign.js`): rail
  30, missile 14 to 40 by its kind (below), ion 17 (and it drains 8 pulse),
  scatter 12 a pellet in a fan of three, plasma 10; each 8% more a world past
  Haven (`raider_hit_scale`), Eclipse's 1.56 times, and in the campaign 8%
  more a tier of the story's front (above). From Nova Forge on, darts
  and seekers come in pairs. A raider fires every 3.6 s, a tank every 2.8 s
  (`src/js/navigation.js`).
- A raider's missile goes off at its fuse, units from your shield's edge (or
  your hull without one), and its blast is a wave: the full damage within
  the fuse, falling to half at the blast's rim; a wave sets off the missiles
  it reaches whose toughness its damage there beats, three deep at most
  (`missile_kinds`, `missile_kind_for` in `src/js/missiles.js`). Fighters
  (chaser, splitter, lancer) fire darts; shooters, elites (Haven's carry
  missiles) and flagships fire seekers; tanks fire seekers, torpedoes from
  Nova Forge on.

| Kind | Size | Speed | Turn | Flight | Fuse | Blast | Damage | Toughness | Trail |
|---|---|---|---|---|---|---|---|---|---|
| Dart | 11 | ×1.3 | 1.25 rad/s | 2 s | 6 | 45 | 14 | 8 | short yellow, little smoke |
| Seeker | 14 | ×1 | 0.85 rad/s | 2.5 s | 14 | 70 | 23 | 20 | orange, grey smoke |
| Torpedo | 22 | ×0.7 | 0.5 rad/s | 3.4 s | 40 | 120 | 40 | 45 | red, thick smoke |

- Measured (stepped, 120 s, three raiders 560 m out, no shield): a missile
  costs you on average about 15 hull sitting still and 7 to 11 circling at
  260/s, before and after the fuse and the wave; a dart 14 still and 9.5
  circling; a torpedo 39 still, 10 circling: slow and dodgeable, deadly to a
  ship that sits.
- Ramming you costs 16 hull, a tank 25, a flagship 35 (`src/js/update.js`).
- The difficulty switch scales raiders at spawn: CHILL 0.8 speed and hull,
  OVERLOAD 1.2 speed and 1.15 hull (`base_spawn_enemy`).
- Score and XP: `base_damage_enemy` in `src/js/combat.js` and `kill_xp` in
  `src/js/resources.js`. A flagship scores 5000 and gives 60 XP.

## Your ship

| Ship | Rank | Price | Hull | Shield | Speed | Cargo | Mounts | Radiation |
|---|---|---|---|---|---|---|---|---|
| Wisp Scout | Cadet | 0 | 100 | 0 | ×1 | 40 | light | 0% |
| Kestrel Courier | Courier | 350 | 120 | 20 | ×1.2 | 100 | 2 light | 12% |
| Viper Interceptor | Pathfinder | 850 | 85 | 45 | ×1.5 | 25 | 2 medium | 4% |
| Mule Prospector | Pathfinder | 1050 | 190 | 25 | ×0.8 | 150 | medium | 35% |
| Bastion Gunship | Vanguard | 2300 | 250 | 70 | ×0.88 | 65 | 2 medium, heavy | 55% |
| Aurora Cruiser | Commander | 5600 | 340 | 130 | ×0.78 | 120 | 2 medium, 2 heavy | 75% |

- Where: one file per ship in `src/js/ships/`; `ship` is the catalog entry,
  `hull_profile` the radiation, traction, braking, cooling, turbo and extra
  turbo seconds (`endurance`).
- The Mule Prospector mines 2.5 times faster (`mining: 2.5`) and its drone bay
  holds four drones, other ships two (`drone_bay` in `src/js/drones.js`).
- All six ships deal ×1 damage today (`damage: 1`).
- Shield: the ship's own + 25 per Shield capacitor level (`shield_max` in
  `src/js/helpers.js`). It recharges after 5 seconds unhit at
  (5 + 2 per capacitor level) a second, times the world's shield rule
  (`src/js/update.js`).
- Damage you take is multiplied by the difficulty (CHILL 0.65, OVERLOAD 1.2)
  and cut 12% per Phase armor level, 15% in Obsidian; after a hit you cannot
  be hit for 0.85 s, and the combo resets (`damage_player` in
  `src/js/combat.js`).
- Crashes: an ore rock costs hull above 110 m/s, up to 24
  (`resolve_solid_ore` in `src/js/flight.js`); drifting debris costs
  8 + 2.2% of the closing speed, up to 40 (`src/js/expedition.js`).

## Weapons

| Gun | Size | Rank | Price | Damage | Interval | Arcade price | Special |
|---|---|---|---|---|---|---|---|
| Pulse cannon | light | 0 | 0 | 14 | 0.19 s | (start gun) | Prism: two bolts more a level; Guided plasma |
| Shard shotgun | light | 1 | 220 | 13 ×5 | 0.5 s | 210 | five pellets; Prism: two more a level |
| Ion disruptor | medium | 2 | 550 | 24 | 0.3 s | 300 | triple shield damage, slows to 55% for 3 s; Prism: two bolts more a level |
| Lance railgun | heavy | 3 | 1100 | 75 | 0.65 s | 390 | ignores 75% of armour; Prism: the slug goes through a raider more a level |
| Seeker launcher | medium | 3 | 1400 | 60 | 0.9 s | 390 | homing missiles; fuse 18; a blast wave of 100 m (Shaped warhead up to 175); Prism: a missile more a salvo |
| Flux beam | medium | 4 | 2600 | 19 | 0.105 s | 525 | ignores 40% of armour, 1.8 pulse a lance; Prism: a lance more a level |

- Where: `weapon_catalog` in `src/js/fleet.js`; the specials in
  `hit_with_weapon` and `fire_equipped_weapon`.
- The ARSENAL's gun cards show ARMOUR: the share of one hit, at the tier you
  own and your Hotter plasma, that passes the armour of the world the guide
  heads for (`gun_armour_share` in `src/js/hardpoints.js`), red below the
  gates' 20%.
  At tier 1 with no Hotter plasma, in Obsidian (50%): the cannon, the
  shotgun and the ion gun keep 13%, the beam 18%, the Seeker 29%, the rail
  80%.
- A shot deals gun damage × (1 + 36% per Hotter plasma level) × (1 + 22%
  per tier past the first) × the ship's damage: Hotter plasma lifts a slug as
  much as a bolt (`hotter_plasma_share`). Prism gives every gun more a shot
  (`gun_shot_count`): two bolts or pellets more a level to the cannon, the ion
  gun and the shotgun, a missile more to the Seeker's salvo, a lance more to
  the beam, and the rail's slug goes through a raider more. The interval is
  cut 12% per Rapid resonance level, never below 0.065 s.
- Fully upgraded (tier 5, Hotter plasma 5, Rapid resonance 3, Prism 2), on a
  hull with no armour: the cannon 2860 a second, the ion gun 3100, the
  shotgun 1810, the beam 4200 while the pulse lasts, the rail 890 a raider
  and up to three in a line, the Seeker 1550 and its blast.
- Tiers run 1 to 5. In the campaign a tier costs (130 + 22% of the gun's
  price) × the tier you have × 1.5 (`gun_tier_cost` in `src/js/fleet.js`):
  tiers 2 to 5 cost 2676 for the shotgun, 3765 for the ion gun, 5580 for the
  rail, 6570 for the Seeker and 10530 for the beam. (Before, without the
  1.5, a story pilot had its gun at tier 5 by chapter 7 and kept 15 000 to
  25 000 salvage unspent through act II.) In the arcade a cleared world
  raises every gun you own a tier, and a new gun takes the run's tier
  (`arcade_weapon_take`).
- A gun fits a mount of its size or larger (`gun_fits` in
  `src/js/hardpoints.js`), and every mount fires its own gun, in the campaign
  and the arcade alike. In the arcade a mount fires only a gun bought for it
  (`arcade_loadout`, `arcade_guns_owned`): the cannon you start with is one
  gun, and a second mount needs a second gun, the same or another. A gun
  bought goes on a mount it fits, an empty one first, else the weakest gun
  there making way, which stays yours, spare, and goes back on for free
  (`mount_gun_anywhere`). A gun no mount of your ship fits names the ships
  that take it; a mount with no gun left stays empty.
- Arcade gun price: 120 + 45 × the gun's `rating`.

## Modules and supplies

A module level costs its base price × (1 + 0.48 per level you have)
(`module_cost` in `src/js/upgrades.js`). Modules move between ships.

| Module | Levels | Base price | Per level (code) |
|---|---|---|---|
| Artifact magnet | 7 | 32 | reach 45 + 110 per level (starts at 1) |
| Orbit drones | 3 | 65 | one more drone |
| Shield capacitor | 3 | 44 | +25 shield, faster recharge |
| Repair nanites | 3 | 60 | 0.35 hull a second after 5 s unhit |
| Guided plasma | 2 | 55 | plasma and ion bolts turn toward targets |
| Pulse reactor | 3 | 42 | 1.5 pulse a second |
| Relic processor | 3 | 35 | +25% salvage from artifacts |
| Turbo drive | 3 | 70 | turbo speed + 0.65 on a ×3.2 base; dash cooldown −0.9 s |
| Booster reservoir | 4 | 65 | +3 s of turbo |
| Radiation lining | 4 | 90 | +20% radiation protection |
| Vector stabilizers | 3 | 60 | steering +15%, braking +40% |
| Evasive thrusters | 3 | 70 | steers round obstacles |
| Reactor cooling | 3 | 75 | dash cooldown −0.35 s; Cryosphere shield recharge |
| Prism cannon | 2 | 75 | more a shot, by the gun (Weapons, above) |
| Hotter plasma | 5 | 38 | +36% of the gun's damage a shot |
| Rapid resonance | 3 | 45 | fire interval −12% |
| Slipstream | 3 | 30 | cruise speed +15% |
| Phase armor | 3 | 46 | −12% damage taken (−15% in Obsidian) |
| Pulse amplifier | 3 | 42 | pulse reach +80, damage +60 (flagship +120) |

| Supply | Key | Price | Effect | Carry |
|---|---|---|---|---|
| Repair kit | Q | 20 | +40 hull | 8 |
| EMP charge | E | 26 | a ring out to 650 m in 0.6 s: as it arrives, clears shots and deals 160 + 12·wave (flagship 400), the same all the way out; breaks drifting rocks and wrecks (ore rocks in the arcade only), as the pulse does | 8 |
| Stasis cell | F | 24 | slows raiders and shots to 35% for 8 s, each once its ring (1 s across the view) has passed it | 8 |

- Where: `upgrade_options` and `supply_options` in `src/js/upgrades.js`; the
  effects in `src/js/update.js`, `src/js/helpers.js`, `src/js/expedition.js`,
  `src/js/flight.js`, `src/js/combat.js`.
- The pulse (Space) fires at 100 energy: a ring runs out at 760 m/s to 480 m
  and hits each thing as its front arrives, 200 damage beside you down to 110
  at the edge (140 on average, as before; a flagship 457 to 251), before the
  amplifier; a kill blows up 0.05–0.14 s later and sends a chain ring: 110 m,
  28 damage, ×0.82 a step, 3 steps, ×1.35 from a tank, elite or flagship
  (`src/js/pulse.js`). A kill gives 4 energy + the amplifier level.

## Salvage in

Salvage (◆) is the one currency.

- **Kills:** a raider drops an artifact 76% of the time, worth
  2 + wave / 4 (rounded down): 2 in Haven and Verdant, 3 in Dustfall and Ion
  Reach, 4 in Obsidian and Cryosphere, 5 in Nova Forge and Eclipse. Shards drop
  none. A flagship drops 12 artifacts of 10. (`base_damage_enemy` in
  `src/js/combat.js`.) The Relic processor adds 25% a level.
- **Rocks:** a broken ore rock drops 3 artifacts of 4 + wave / 5
  (`base_damage_ore` in `src/js/render.js`); a broken drifting rock or wreck
  one of 2.
- **Arcade:** a cleared world pays 80 + 40 × the world's index, so 80 for
  Haven up to 320 for Nova Forge (`arcade_clear_bonus`); Eclipse ends the run.
  Salvage left at the end scores 10 points each (`arcade_salvage_points`).
- **Campaign:** you start with 90. Contracts pay most (see
  [goals.md](goals.md)); a raider may also spill cargo (`cargo_spill` in
  `src/js/resources.js`: 15% for most, 30% shooters, 50% tanks, always a
  flagship), and cargo sells at stations.

An arcade world at NORMAL, as a rough sum from these formulas: Haven sends
13 + 17 + 21 raiders and 3 + 4 flagship escorts, so about 58 kills × 76% × 2,
about 88, plus 120 from the flagship and the 80 bonus: near 290 salvage
before rocks and the Relic processor.

## Salvage out

| What | Arcade | Campaign |
|---|---|---|
| Repair | Full repair 60 | free on docking |
| Ships | half the campaign price, rounded to 10 (`arcade_ship_price`): 180, 430, 530, 1150, 2800 | the price above, gated by rank |
| Guns | 120 + 45 × rating, no rank | the price above, gated by rank |
| Gun tier | free, one per world cleared | (130 + 22% of price) × tier × 1.5 |
| Modules, supplies | the tables above | the tables above |
| Builder drone, outposts, transport | none | see below |

- Campaign extras: builder drone 150 (`builder_price`), mining outpost 120 and
  6 ore, defense platform 160 and 4 ore (`structure_kinds` in
  `src/js/structures.js`), transport line 350 (`transport_price` in
  `src/js/transports.js`), a mining drone 45, drone tiers Hauler 220 and
  Harvester 520 (`drone_tiers` in `src/js/drones.js`).

## Trade

- Each world has its own prices for refined ore, energy cells and relic
  components (`world.prices`). You buy at that price and sell at that
  price −2.
- Each world imports one good (`expedition.import`); its demand starts at
  80 + 20 × the world's index. While it lasts, a sale pays +6 a unit (up to
  the demand left), and the buying price there is +6 too. Demand
  comes back by 10 units every 90 seconds of flight (`src/js/expedition.js`).
- Each world's own resource (Haven iron 16 up to Void matter 60, `resources`
  in `src/js/resources.js`) sells for 60% of its worth at home and 30% more
  for each world farther along the list; it is never bought.
- Where: `market_price`, `trade_total` in `src/js/trade.js`;
  `commodity_base_price` in `src/js/resources.js`.

## Elites and flagships

| | Arcade | Campaign |
|---|---|---|
| Elite | from the mode's first elite world, the leader of every second squadron from wave 2: hull ×3, size ×1.35, shield 40 + 25 × world index, drops a repair kit or an EMP | the target of an `elite` stage: hull ×3.5 (at least 600), armour +12% (at most 72%), shield ×1.6 (at least 80), speed ×0.8; carries missiles in Haven |
| Flagship | 1500 × (1 + 0.6 × world index) hull (CHILL ×0.8, OVERLOAD ×1.25); calls escorts at 66% and a last stand at 33%; on OVERLOAD, overdrive at 15% | 10500 hull, 19000 in Eclipse; three times the world's shield |

- Where: `arcade_elite_make`, `arcade_flagship_spawn`,
  `arcade_flagship_update` in `src/js/arcade.js`; `spawn_operation_enemy` in
  `src/js/operations.js`; `spawn_enemy` in `src/js/campaign.js`.
- Contract enemies grow with the contract's level: +12% hull a level past the
  first, up to ten levels (`spawn_operation_enemy`).

## The arcade's difficulty rows

| Row | CHILL | NORMAL | OVERLOAD |
|---|---|---|---|
| extra raiders a squadron | 0 | 1 | 2 |
| extra raiders a wave | 0 | 3 | 5 |
| gap between squadrons | ×1 | ×0.8 | ×0.7 |
| first world with elites | Verdant | Haven | Haven |
| repairs that still drop | all | 35% | none |
| repair kits at the start | 2 | 1 | 1 |
| plasma raiders fire | no | yes | yes |
| raider gun cooldown | ×1 | ×0.45 | ×0.4 |
| raider shot damage | ×1 | ×1.6 | ×1.75 |
| raider hull | ×1 | ×1.5 | ×1.8 |
| raider hull growth a world past Haven | +10% | +15% | none |
| share of the world's armour and shield | 80% | 80% | 50% |
| blast damage to you | ×0.8 | ×0.8 | ×1.2 |
| raiders grow with your gun tier | no | no | +22% a tier |
| flagship overdrive | no | no | yes |

- Where: `arcade_modes` in `src/js/arcade.js`; the menu's line for each mode
  is `sync_mode_note`.
- A raider's hull is the campaign's × the mode's hull × (1 + growth × world
  index), so on NORMAL an Eclipse raider has ×2.05 on top of the mode's
  ×1.5; the flagship keeps its own scale (`arcade_hull_scale`). Raiders carry
  the mode's share of the world's armour and shield, elites of its armour
  (`defense`, read in `arcade_update` and `arcade_elite_make`). Radiation is
  35% of the campaign's (`arcade_radiation`).
- Measured (a bot through the keyboard, NORMAL, 4 runs each of a careful and
  a casual player, before growth and with the share at 50%, then as now):
  8 of 8 runs won instead of 7 of 8. From Dustfall to Nova Forge a world
  costs the careful player 40 to 65 hull and shield instead of 21 to 48, and
  the casual one 72 to 195 instead of 37 to 74. Eclipse costs them 533 and
  705 instead of 163 and 153, with one casual death there. Haven and
  Verdant (no armour or shield to speak of) stay as they were. A run takes
  394 to 448 s instead of 368 to 486. CHILL: still no deaths, Eclipse 90
  instead of 44. OVERLOAD is unchanged. The cost: with the railgun or the
  beam instead of the cannon (one run each) the careful player now dies
  three times in Eclipse, where both got through before. Why: problem 1 of
  [playtest-2026-10-05.md](playtest-2026-10-05.md).
- A wave holds 10 + 2 × world index + 4 per wave past the first + the mode's
  extra raiders (`arcade_wave_size`). A squadron is
  3 + min(3, world index / 2) + (wave − 1) + the mode's extra, and the next
  comes after max(2.6, 5.5 − 0.3 × world index) seconds × the mode's gap,
  but not while more than 14 raiders are alive (`arcade_squads_update`).
- Wave 1 is chasers (70%) and shooters; later waves follow the world's mix.
  The type drawn sets how the squadron comes (`arcade_squad_pattern`):
  - a tank (three raiders or more) leads a **wall**, shooters in a row 80 m
    behind it carrying the world's gun, not missiles, or a **convoy**,
    chasers in a ring round it, half and half; two tanks from seven raiders
    on. The escorts keep their places at the tank's pace until it dies or
    you come within 300 m (`arcade_role_steer`);
  - lancers lie in **ambush** (70%, when there are rocks 450 to 1000 m from
    you): still beside the rocks, with no warp flash, until you come within
    420 m, hit one, or 25 s pass;
  - the rest come in a **line** across their heading, 640 m away, or, from
    four raiders on and 35% of the time, in a **pincer**: the line split to
    both sides of you.
- Wave 2 of each world draws an **event** from the world's pool
  (`arcade_event_pools` in `src/js/arcade_events.js`), with a toast and a
  mark on the map; it ends with the wave:

  | Event | What it does | Worlds |
  |---|---|---|
  | Ion storm | your shield stays at 0 | Ion Reach, Obsidian, Cryosphere |
  | Convoy | an unarmed freighter (a tank's hull ×4) on a 2 km run past you, about 30 s; 6 artifacts of 8 + 2 × world index if caught | Haven, Verdant, Dustfall, Cryosphere |
  | Fleeing ace | an elite, 30% faster, jumps away after 20 s; 4 artifacts of 10 + 2 × world index if caught | Haven, Ion Reach, Nova Forge, Eclipse |
  | Dust blind | the minimap shows only haze | Verdant, Dustfall, Obsidian |
  | Heat surge | every 6 s a line of 8 vents, 1400 m long, across your way; each warns for 1.4 s, then bursts for 22 within 80 m | Nova Forge, Eclipse |
- A ship that explodes hurts everything within 1.8 × its blast size, less
  with distance: a chaser 10, a tank 26, a flagship 50, an elite ×1.5
  (`arcade_blast_from_kill`).

NORMAL in numbers:

| World | chaser | tank | armour, shield (tank) | elite shield | flagship | raiders a wave | squadron | gap (s) | clear bonus |
|---|---|---|---|---|---|---|---|---|---|
| Haven | 44 | 140 | 0%, 0 | 40 | 1500 | 13 / 17 / 21 | 4 / 5 / 6 | 4.40 | 80 |
| Verdant | 74 | 205 | 10%, 0 | 65 | 2400 | 15 / 19 / 23 | 4 / 5 / 6 | 4.16 | 120 |
| Dustfall | 111 | 283 | 20%, 0 | 90 | 3300 | 17 / 21 / 25 | 5 / 6 / 7 | 3.92 | 160 |
| Ion Reach | 154 | 372 | 16%, 52 (73) | 115 | 4200 | 19 / 23 / 27 | 5 / 6 / 7 | 3.68 | 200 |
| Obsidian | 204 | 473 | 40%, 36 (50) | 140 | 5100 | 21 / 25 / 29 | 6 / 7 / 8 | 3.44 | 240 |
| Cryosphere | 260 | 585 | 28%, 112 (157) | 165 | 6000 | 23 / 27 / 31 | 6 / 7 / 8 | 3.20 | 280 |
| Nova Forge | 322 | 710 | 48%, 72 (101) | 190 | 6900 | 25 / 29 / 33 | 7 / 8 / 9 | 2.96 | 320 |
| Eclipse | 391 | 846 | 52%, 160 (224) | 215 | 7800 | 27 / 31 / 35 | 7 / 8 / 9 | 2.72 | (run ends) |

## Campaign pace

- Patrols: every 11 s in Haven, elsewhere every max(4.5, 10 − 0.6 × tier)
  s, 1 + min(9, tier) / 3 raiders (the tier is the world's index, or the
  story's front past it, above), while you are outside the station's
  shelter and fewer than 12 are out (`src/js/navigation.js`).
- A death (campaign): a tug brings the ship to the world's station, docked
  and repaired, for 10% of the salvage saved; the cargo aboard is lost, the
  contracts keep their progress (`tow_to_station` in `src/js/checkpoint.js`).
  Before, the flight resumed at the last autosave with the hull and the
  radiation dose saved there, which could die again at once, over and over.
- Ranks license ships and guns: XP from kills (table above) and from
  contracts.

| Rank | Cadet | Courier | Pathfinder | Vanguard | Ace | Commander | Admiral | Legend |
|---|---|---|---|---|---|---|---|---|
| XP | 0 | 120 | 420 | 1100 | 2400 | 4200 | 7000 | 10500 |

- Where: `rank_thresholds`, `rank_names` in `src/js/fleet.js`.
- The licences follow the story. A story pilot (the campaign bot, below)
  reaches Courier with chapter 1, Pathfinder with chapter 2, Vanguard
  (gunship, Lance railgun, Seeker) with chapter 4, before Obsidian's 50%
  armour asks for a heavy gun, Ace (Flux beam) with
  chapter 6 and Commander (Aurora Cruiser) with chapter 8, as act I ends.
  Before (120 / 380 / 800 / 1450 / 2500), Commander came with chapter 6 and
  nothing was left to license for the last ten chapters.
- Measured (2026-10-12, a bot playing the campaign as a story pilot on a
  virtual clock with the game's own guided flight: it follows the chapters,
  buys what the gates ask, takes side contracts when it cannot pay, and
  spends the rest on a sturdier ship, a better gun and its tier). Before:
  chapters 1 to 7 took 33 to 41 game minutes, 1.4 to 6 minutes a chapter;
  the gates never stopped it; it died 18 times in Obsidian with a shotgun
  and 25 times at the Ember flagship with a tier-1 beam; a death resumed at
  the autosave and could die again at once (205 deaths in a row once, from a
  burnt-out radiation shield). Act II from a chapter-8 kit (the cruiser, the
  Seeker at tier 5): all eight chapters in 49 minutes, no hull lost outside
  Nova Forge, no death, and 58 000 salvage left unspent. After: chapters 1 to
  4 as before (12 to 13 minutes); the Obsidian gate asks for a gun that
  bites, the bot earns it with two Commander bounties in Verdant (7 to 8
  minutes) and clears Obsidian with no death; in act II, Obsidian cost 710
  hull and a death where it cost none, and chapter 11 took 10.9 minutes
  instead of 4.7 (the bot's runs ended at chapter 12, the machine being
  slow that night).

## Scoring

- A kill scores its type's points (table above) × the combo. The combo grows
  by one for each kill within 4 s of the last, up to ×8, and a hit on you
  resets it.
- An artifact picked up scores 25.
- Arcade: salvage left at the end scores 10 each.
- Campaign: a claimed contract scores 10 × its reward
  (`expedition_base_guide_base_claim_contract` in `src/js/station.js`).
- One best score is kept for both modes (`save_best` in
  `src/js/controls.js`, stored as `pulse_drift_best`).

## Leftovers

- `sectors` in `src/js/worlds.js` (fifteen sectors of an older run) is still
  read for a few HUD lines and the background colour; its `mix` and `color`
  are overwritten by the current world's (`visual_base_generate_map` in
  `src/js/campaign.js`). `choose_upgrade` in `src/js/upgrades.js` (a free
  module after each sector) is no longer called.
