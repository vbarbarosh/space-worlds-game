# World Explorer: balance

How hard the game is, what things cost and what they pay, and where each
number lives, so the next change knows what to edit. Every number here is
read from the code; a change to the code changes this file too.

Two modes share one combat core and differ in tuning:

- **Arcade** (`src/js/arcade.js`): one run through the eight worlds, three
  waves each, the flagship in the third. Its numbers are tuned for a short,
  dense run; three difficulty rows in `arcade_modes` change them. The worlds
  come in an order of the player's (a route, a card at each break: see
  [The arcade's route and cards](#the-arcades-route-and-cards)), so its
  numbers go by the run's **step** (0 for the first world flown to 7 for
  Eclipse), which is the world's index on the map's order.
  Its Scroll kind, on a screen that moves on by itself, has a few numbers of
  its own ([The arcade's Scroll kind](#the-arcades-scroll-kind)).
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

- A world's place in the order of threat is `world_tier` (`(wave - 1)/2`):
  Haven 0 to Eclipse 7. The raiders' tier, contract rewards, resource prices
  and the threat shown read it, never the world's place in the list.

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

In the campaign every raider but a flagship carries twice that hull
(`campaign_raider_hull` in `src/js/campaign.js`; the arcade scales its own,
below). That gives, in the campaign at NORMAL:

| World | chaser | tank | shooter | splitter | lancer | shield (tank) |
|---|---|---|---|---|---|---|
| Haven | 58 | 186 | 94 | 124 | 88 | 0 |
| Verdant | 86 | 238 | 130 | 164 | 124 | 0 |
| Dustfall | 114 | 290 | 166 | 204 | 160 | 0 |
| Ion Reach | 142 | 342 | 202 | 244 | 196 | 65 (91) |
| Obsidian | 170 | 394 | 238 | 284 | 232 | 45 (63) |
| Cryosphere | 198 | 446 | 274 | 324 | 268 | 140 (196) |
| Nova Forge | 226 | 498 | 310 | 364 | 304 | 90 (126) |
| Eclipse | 254 | 550 | 346 | 404 | 340 | 200 (280) |

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
  (`src/js/navigation.js`), a shooter every 2.1 − 0.04·wave s, at least 1.2
  (`src/js/update.js`), each times its reload (`raider_reload` in
  `src/js/campaign.js`): in the campaign half of that
  (`campaign_raider_reload`), so every 1.8 s, 1.4 s and 0.6 to 1 s; in the
  arcade the mode's gap. In both a missile raider reloads twice as slowly
  as one with another gun (`arcade_reloads`).
- Measured (a bot taking contracts with a story pilot's kit, 4 minutes a
  world, seeds 1 to 3 in Haven, 1 and 2 elsewhere; before, and after the
  raiders took twice the hull and half the reload, with the growing hold
  waves, the campaign dash's grace and one gun a mount of the same change):
  shots at you a minute, Haven 4 → 18, Obsidian 13 → 33, Eclipse 14 → 28;
  raiders killed before they fire 74% → 49%, 49% → 25%, 77% → 65%; the
  share of the time in a fight 24% → 45%, 41% → 46%, 36% → 44%. Deaths:
  Haven one in 12 minutes, before and after; Obsidian and Eclipse none
  before, one in each 4-minute run after.
- Raider shot speeds (`raider_shot_first` × `raider_shot_boost`, read by
  `raider_shot_speed` in `src/js/campaign.js`), before the world's
  projectile rule: a gun's bolt flies 3.84 times the speed it is fired at
  (plasma and scatter 210, so 806; a shooter's 180 + 4·wave; a flagship's
  gun its design's, `boss_designs` in `src/js/bosses.js`), a rail slug
  520 × 3.84 = 1997, an ion bolt 275 × 3.84 = 1056; a missile 190 × its
  kind's speed × 4.32 (dart 1067, seeker 821, torpedo 575); a shot of a
  flagship's pattern (a ring, a fan, a spiral) 1.61 times its speed. A
  bolt's flight is 6 s over its factor, a missile's its kind's flight
  (below) over 1.8, so the reach stays as it was before the boost (2.4 for
  guns and missiles, 1.4 for a pattern). In every
  world each bolt and missile outflies the fastest cruising ship (an
  interceptor with three Slipstreams; the closest are a Haven shooter's
  bolt, 707 against 620, and an Eclipse torpedo, 575 against 558); turbo
  outruns the bolts, not the missiles (below). Hits are checked along a shot's whole step
  (`hostile_shot_contact`), so a slug never passes through a small hull
  between two frames.
- Every raider's gun leads its aim (`raider_aim` in `src/js/arcade.js`), in
  the campaign and the arcade alike: it fires where you will be when the
  shot gets there if you hold your course, at the shot's real speed, or
  straight at you when it could not catch you within 1.5 s. The course is
  taken as straight, so a turn is what dodges it.
- A raider's missile keeps up with the ship it chases, turbo included: it
  flies at 1.15 times the ship's speed at that moment when that is more
  than its own (`missile_chase` in `src/js/missiles.js`). It turns no
  harder sideways than at its own speed (its turn rate falls as it speeds
  up), so a ship in turbo that turns hard shakes it, and one far enough
  ahead keeps its lead until the missile's flight ends.
- A raider's missile goes off at its fuse, units from your shield's edge (or
  your hull without one), and its blast is a wave: the full damage within
  the fuse, falling to half at the blast's rim; a wave sets off the missiles
  it reaches whose toughness its damage there beats, three deep at most
  (`missile_kinds`, `missile_kind_for` in `src/js/missiles.js`). Fighters
  (chaser, splitter, lancer) fire darts; shooters, elites (Haven's carry
  missiles) and flagships fire seekers; tanks fire seekers, torpedoes from
  Nova Forge on.
- A dash (Shift) gives a quarter second of grace, in the campaign and the
  arcade alike: it covers bolts, slugs and rams but not a blast, a
  missile's wave or a ship's explosion (`dash_grace`, `damage_player`'s
  `blast`): a missile is outturned or cleared by the EMP, not dashed
  through. The run's first raider missile within 600 m says so in a toast.
  Before, the campaign's dash made you untouchable for that quarter second:
  a bot dashing at every missile within 220 m took no damage at all in
  Dustfall and Nova Forge (4 raiders, 60 s, a story pilot's kit).

| Kind | Size | Speed | Turn | Flight | Fuse | Blast | Damage | Toughness | Trail |
|---|---|---|---|---|---|---|---|---|---|
| Dart | 11 | ×1.3 | 1.25 rad/s | 2 s | 6 | 45 | 14 | 8 | short yellow, little smoke |
| Seeker | 14 | ×1 | 0.85 rad/s | 2.5 s | 14 | 70 | 23 | 20 | orange, grey smoke |
| Torpedo | 22 | ×0.7 | 0.5 rad/s | 3.4 s | 40 | 120 | 40 | 45 | red, thick smoke |

- Measured before the boost above (stepped, 120 s, three raiders 560 m
  out, no shield): a missile costs you on average about 15 hull sitting
  still and 7 to 11 circling at 260/s, before and after the fuse and the
  wave; a dart 14 still and 9.5 circling; a torpedo 39 still, 10 circling:
  slow and dodgeable, deadly to a ship that sits.
- Ramming you costs 16 hull, a tank 25, a flagship 35 (`src/js/update.js`).
- The difficulty switch scales raiders at spawn: CHILL 0.8 speed and hull,
  OVERLOAD 1.2 speed and 1.15 hull (`base_spawn_enemy`).
- Score and XP: `base_damage_enemy` in `src/js/combat.js` and `kill_xp` in
  `src/js/resources.js`. A flagship scores 5000 and gives 60 XP.

## Your ship

| Ship | Opens in | Rank | Price | Hull | Shield | Speed | Cargo | Mounts | Radiation |
|---|---|---|---|---|---|---|---|---|---|
| Wisp Scout | Haven | Cadet | 0 | 100 | 0 | ×1 | 40 | light | 0% |
| Kestrel Courier | Haven | Courier | 350 | 120 | 20 | ×1.2 | 100 | 2 light | 12% |
| Viper Interceptor | Verdant | Pathfinder | 850 | 85 | 45 | ×1.5 | 25 | 2 medium | 4% |
| Mule Prospector | Dustfall | Pathfinder | 1050 | 190 | 25 | ×0.8 | 150 | medium | 35% |
| Bastion Gunship | Ion Reach | Vanguard | 2300 | 250 | 70 | ×0.88 | 65 | 2 medium, heavy | 55% |
| Aurora Cruiser | Cryosphere | Commander | 5600 | 340 | 130 | ×0.78 | 120 | 2 medium, 2 heavy | 75% |

- Where: one file per ship in `src/js/ships/`; `ship` is the catalog entry
  (`opens`: the world it goes on sale in, below), `hull_profile` the
  radiation, traction, braking, cooling, turbo and extra turbo seconds
  (`endurance`).
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
- **Crowds** (the arcade only, `src/js/arcade_crowds.js`): a raider's shot,
  missile or dying blast hurts × 0.45, and after it only that raider's next
  hit waits 0.35 s, anyone's 0.1 s. With 0.85 s for any hit one raider firing
  at you filled most of it (a raider of Ion Reach hits about 50 times a
  minute on its own), so twelve hurt little more than three; a 0.35 s for any
  hit lifts twelve only × 1.2. Measured with immortal raiders round a pilot
  that circles and dodges as the playtest bot does (NORMAL, damage a minute):

  | World | 3 raiders before / now | 12 raiders before / now |
  |---|---|---|
  | Verdant | 546 / 386 | 792 / 884 |
  | Ion Reach | 1202 / 1235 | 1540 / 1955 |
  | Nova Forge | 1073 / 817 | 1314 / 1455 |

  A ram, a flagship's fire (its beams, pools, rings of shots), a flare, a
  vent and a rock keep the whole hit and 0.85 s for any hit, as in the
  campaign.
- Crashes: an ore rock costs hull above 110 m/s, up to 24
  (`resolve_solid_ore` in `src/js/flight.js`); drifting debris costs
  8 + 2.2% of the closing speed, up to 40 (`src/js/expedition.js`).

## Weapons

| Gun | Size | Opens in | Rank | Price | Damage | Interval | Arcade price | Special |
|---|---|---|---|---|---|---|---|---|
| Pulse cannon | light | Haven | 0 | 0 | 14 | 0.19 s | (start gun) | Prism: two bolts more a level; Guided plasma |
| Shard shotgun | light | Haven | 1 | 220 | 13 ×5 | 0.5 s | 210 | five pellets; Prism: two more a level |
| Ion disruptor | medium | Verdant | 2 | 550 | 24 | 0.3 s | 300 | triple shield damage, slows to 55% for 3 s; Prism: two bolts more a level |
| Lance railgun | heavy | Ion Reach | 3 | 1100 | 75 | 0.65 s | 390 | ignores 75% of armour; Prism: the slug goes through a raider more a level |
| Seeker launcher | medium | Ion Reach | 3 | 1400 | 60 | 0.9 s | 390 | homing missiles; fuse 18; a blast wave of 100 m (Shaped warhead up to 175); Prism: a missile more a salvo |
| Flux beam | medium | Obsidian | 4 | 2600 | 19 | 0.105 s | 525 | ignores 40% of armour, 1.8 pulse a lance; Prism: a lance more a level |

- Where: `weapon_catalog` in `src/js/fleet.js` (`opens`, below); the specials in
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
  and the arcade alike. A mount fires only a gun bought for it
  (`ship_loadout`, `guns_owned`): the cannon you start with is one gun, and a
  second mount needs a second gun, the same or another. A gun bought goes on
  a mount it fits, an empty one first, else the weakest gun there making way
  (in the campaign only a weaker one), which stays yours, spare, and goes
  back on for free (`mount_gun_anywhere`). A gun no mount of your ship fits
  names the ships that take it; a mount with no gun left stays empty, and
  the ARSENAL draws it red, with Buy another on the cards of the guns that
  fit it; the HANGAR counts a ship's empty mounts. A tier is one for every
  one of a gun.
- Before, in the campaign, one gun bought armed every mount of its size: the
  cruiser with one rail and one ion gun fired four guns. A campaign save from
  then gets as many of each gun as its ships carried (`guns_kept`), so every
  mount it had armed stays armed.
- Arcade gun price: 120 + 45 × the gun's `rating`. Campaign: a gun's price,
  and the same again for each more of it (`gun_copy_price`; the start
  cannon 120).

## Modules and supplies

A module level costs its base price × (1 + 0.48 per level you have; in the
arcade the levels owned, installed or not) (`module_cost` in
`src/js/upgrades.js`). Modules move between ships. In the arcade each level
installed draws the reactor's power (Power, below; [The arcade's power
budget](#the-arcades-power-budget)), and the drones, nanites, Pulse reactor
and amplifier, Turbo drive, Evasive thrusters, Slipstream, Rapid resonance and
Phase armor do more there (its Builds).

| Module | Levels | Opens (level by level) | Base price | Power (arcade) | Per level (code) |
|---|---|---|---|---|---|
| Artifact magnet | 7 | H V D I C N E | 32 | 1 (none for the level 1 you start with) | reach 45 + 110 per level (starts at 1) |
| Orbit drones | 3 | H I C | 65 | 1 | one more drone |
| Shield capacitor | 3 | H V O | 44 | 1 | +25 shield, faster recharge |
| Repair nanites | 3 | H I C | 60 | 1 | 0.35 hull a second after 5 s unhit |
| Guided plasma | 2 | H O | 55 | 1 | plasma and ion bolts turn toward targets |
| Pulse reactor | 3 | H I C | 42 | 1 | 1.5 pulse a second |
| Relic processor | 3 | H I C | 35 | 1 | +25% salvage from artifacts |
| Turbo drive | 3 | H I C | 70 | 1 | turbo speed + 0.65 on a ×3.2 base; dash cooldown −0.9 s |
| Booster reservoir | 4 | H D O N | 65 | 1 | +3 s of turbo |
| Radiation lining | 4 | H D O N | 90 | 1 | +20% radiation protection |
| Vector stabilizers | 3 | H I C | 60 | 1 | steering +15%, braking +40% |
| Evasive thrusters | 3 | H I C | 70 | 1 | steers round obstacles |
| Radar | 3 | H I C | 40 | 1 | sees raiders 2.5, 4, 6 km off: markers on the window's edge; Seeker missiles +0.5 rad/s turn, lock to its reach, held while it sees the target (`src/js/radar.js`) |
| Reactor cooling | 3 | H I C | 75 | 1 | dash cooldown −0.35 s; Cryosphere shield recharge |
| Prism cannon | 2 | H O | 75 | 2 | more a shot, by the gun (Weapons, above) |
| Hotter plasma | 5 | H D I C N | 38 | 2 | +36% of the gun's damage a shot |
| Rapid resonance | 3 | H I C | 45 | 2 | fire interval −12% |
| Slipstream | 3 | H I C | 30 | 1 | cruise speed +15% |
| Phase armor | 3 | H V O | 46 | 1 | −12% damage taken (−15% in Obsidian) |
| Pulse amplifier | 3 | H I C | 42 | 1 | pulse reach +80, damage +60 (flagship +120) |
| Seeker head, Rocket motor, Shaped warhead | 3 each | H I C | 55, 50, 60 | 1 | the Seeker launcher's missiles; on sale with the launcher |

H Haven, V Verdant, D Dustfall, I Ion Reach, O Obsidian, C Cryosphere, N Nova
Forge, E Eclipse: see What each world opens, below.

| Supply | Key | Price | Effect | Carry |
|---|---|---|---|---|
| Repair kit | Q | 20 | +40 hull | 8 |
| EMP charge | E | 26 | a ring out to 650 m in 0.6 s: as it arrives, clears shots and deals 160 + 12·wave (the arcade: the step's wave) (flagship 400), the same all the way out; breaks drifting rocks and wrecks (ore rocks in the arcade only), as the pulse does | 8 |
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

## The arcade's power budget

In the arcade (`src/js/arcade_power.js`; the campaign has none) a module level
bought is owned for the rest of the run, but it works only installed, and every
level installed draws power from the ship's reactor, which holds a limited
amount. So no ship flies with everything, and a run ends with "which build next
time?", not with the whole shop bought.

- **The reactor:** the ship's own power (`power` in `src/js/ships/`) + 1 for
  each world cleared (`arcade_power_per_world`; the step, and from a world's
  cleared screen on the next one, as `world_reached` counts) + 1 for each
  Reactor tuning bought (below):

  | Ship | Power | at the depot before world 2 | before Obsidian (5) | before Eclipse (8) |
  |---|---|---|---|---|
  | Wisp Scout | 4 | 5 | 8 | 11 |
  | Kestrel Courier | 5 | 6 | 9 | 12 |
  | Mule Prospector | 5 | 6 | 9 | 12 |
  | Viper Interceptor | 6 | 7 | 10 | 13 |
  | Bastion Gunship | 7 | 8 | 11 | 14 |
  | Aurora Cruiser | 8 | 9 | 12 | 15 |

- **The draw:** Hotter plasma, Rapid resonance and Prism draw 2 a level
  (`arcade_power_draws`): they multiply every shot, the strongest levels in
  the shop for their price, and the three at their caps alone would take 20.
  Every other level draws 1; the magnet's level 1, which every run starts with,
  draws none. All 75 levels would draw 84, so an Eclipse cruiser flies about a
  fifth of them.
- **Reactor tuning** (the depot's Ships shelf): +1 power on every ship for the
  rest of the run, at 600, 1200 and 1800 salvage, three a run at most
  (`arcade_reactor_prices`), kept in the save. It gives the salvage a run piles
  up a use, dear enough that a run buys one or two: the bot bought one or two
  in every run that reached Eclipse, and its salvage left at the end fell from
  700–3394 (median 2000) to 426–1663 (median 1200).
- **Owned and installed:** a level bought goes in at once when the reactor has
  the power for it, else it stays owned, spare, and the depot says so (the
  row's Install says No power, and a note heads the list). At the depot a level
  comes out (Remove) or an owned one goes in (Install) for free, so each world
  can fly its own build. A module's row shows its draw (POWER), its levels
  installed (lit pips), owned but not installed (outlined) and not owned, and
  ON SHIP once a level of a module you see on the ship is installed; the
  header shows the power used against the reactor's, a cell a unit. A level's
  price goes by the levels owned. `upgrades` stays the levels installed, so
  every effect reads only those; `arcade.owned` holds the levels bought and
  `arcade.fitted` those installed past the start's, in the order they went in.
- **A smaller reactor** (a ship with less power taken at the depot): the
  newest levels installed come out until it holds the rest, they stay owned,
  and a note at the head of the list names them (The Wisp Scout's reactor
  holds 8: Orbit drones 1, Shield capacitor 1–2 came out...); a ship's row says
  beforehand how many levels its reactor would take out. A bigger reactor puts
  nothing back by itself: Install does.
- **The save** (`arcade_snapshot`) keeps the levels installed (`upgrades`),
  owned (`owned`) and the order they went in (`fitted`); a retry and a load
  start the world with them. A save from before the budget owns every level it
  had and installs as many as the reactor holds, Hotter plasma, Phase armor,
  the shield, Prism, Rapid resonance, drones, nanites and the pulse first
  (`arcade_power_fill`).
- **Cards:** a module level a card gives (Field upgrade, Prototype, a Flagship
  wager's prize) is owned and goes in if there is power; the card names its
  draw (Shield capacitor level 2 (1 power)). Each break's three cards hold a
  trade-off (a run-long card with a downside) while one is left
  (`arcade_cards_draw` draws one of each kind).
- **The raiders' hull** went down with it: the shop's factor on it
  (`arcade_shop_hull`, `arcade_shop_flagship`; [The arcade's difficulty
  rows](#the-arcades-difficulty-rows)) assumed every level bought and
  installed. The armour of the later worlds takes a flat share off every hit,
  so the smaller damage of a budget kit bites it much less: with Eclipse's
  raiders at a third of their old hull the bot won no run of 12.
- **Builds.** In the arcade the levels that are not the guns' do more, so a
  build of one kind carries a run (`arcade_module_tune`, the campaign keeps
  its numbers; the depot's rows say the arcade's):

  | Module | Campaign | Arcade |
  |---|---|---|
  | Orbit drones | a bolt of 10 + 3 per Hotter plasma level every 0.42 s | the same + 16 a step, every 0.3 s |
  | Repair nanites | 0.35 hull a second after 5 s unhit | 1.2% of the hull a second, under fire too |
  | Pulse reactor | 1.5 energy a second | 9 |
  | Pulse amplifier | +60 damage (flagship +120) | +60 + 80 a step (twice that to a flagship) |
  | Turbo drive | dash cooldown −0.9 s | −1.4 s |
  | Evasive thrusters | steers round rocks and ships | that, and 17% of the raiders' shots that reach you slip by |
  | Slipstream | cruise +15% | that, and 8% of the shots slip by (with the thrusters, 50% at most) |
  | Rapid resonance | interval −12% | −20% |
  | Phase armor | −12% a hit (−15% in Obsidian) | −15% |

  A shot that slips is counted out, not rolled: at 30% the 4th, 7th and 10th
  of ten slip (`arcade_evade_shot`). The draws stay as above: with the guns at
  2 a level a guns build is the weakest of the three (6 of 12), at 3 it would
  fall further; and no stat is taken from the guns' levels for the same
  reason, as the reactor is their price.
- **The bot** (`bin/playtest`) flies a build: levels in its order, each that
  fits the power left; once those are bought, a sturdier ship (more power), a
  gun for each empty mount, Reactor tuning while the salvage lasts, the levels
  the next two worlds' power will hold; then at each depot it takes out what
  is not in its build and installs what is. `--build=` names one of four
  (`builds` in `bin/playtest`), each on the same core of Prism 1, Phase armor 1
  and Shield capacitor 1, or gives its own order. Measured (NORMAL, seeds
  1–12):

  | Build | Its levels (after the core) | Won | Deaths | The kit at the end of a won run | Salvage left |
  |---|---|---|---|---|---|
  | mixed (the default) | Hotter plasma, armour, shield, Prism 2, ... | 8 of 12 | 17: Haven 1, Verdant 2, Obsidian 2, Nova Forge 1, Eclipse 11 | Hotter plasma 4, Prism 2, armour 3, shield 2 | 426–1663 |
  | guns | Hotter plasma, Rapid resonance, Prism 2 | 6 of 12 | 22: Haven 1, Verdant 2, Obsidian 3, Nova Forge 2, Eclipse 14 | Hotter plasma 3, Rapid resonance 2, Prism 2 | 476–1691 |
  | tank | armour, shield, drones, nanites, then Hotter plasma | 8 of 12 | 18: Haven 1, Verdant 3, Ion Reach 1, Obsidian 4, Eclipse 9 | armour 3, shield 3, drones 3, nanites 3, Hotter plasma 1 | 572–2224 |
  | evasion | Evasive thrusters, the pulse and its reactor, Slipstream, Turbo drive, Guided plasma | 6 of 12 | 24: Haven 1, Verdant 2, Dustfall 1, Ion Reach 1, Obsidian 2, Eclipse 17 | evasion 3, Pulse amplifier 3, Pulse reactor 3, Slipstream 2, Turbo drive 1 | 433–3059 |

  A won run takes 700–890 s (median). Before the arcade's own numbers the
  guns won 1 to 2 runs of 12, the tank 0 to 1, evasion none (it died in Ion
  Reach); with evasion at 20% a level and Slipstream 10% (90% of the shots
  slipping) evasion won 11 of 12; at 17% and 8% with no cap (up to 75%) 7 of
  12, and with the slips capped at 50% (`evade_max`) 6. The mixed build before them won 7 of 12
  (below).
- Measured (`bin/playtest`, NORMAL, seeds 1–12, the budget and the hull below
  against the game before, the mixed build, before the arcade's own module
  numbers and Reactor tuning):

  | | before | with the budget |
  |---|---|---|
  | runs won | 6 of 12 | 7 of 12 |
  | deaths | 25: Haven 1, Verdant 3, Ion Reach 1, Eclipse 20 | 25: Haven 1, Verdant 2, Obsidian 1, Eclipse 21 |
  | levels at the end, owned / installed | 46–62 / all of them | 11–15 / 10 (power 15 of 15) |
  | the kit at Eclipse | every module near its cap | Hotter plasma 3, Prism 2, Phase armor 3, Shield capacitor 2, the rest spare |
  | salvage left at the end | 845–7513 (median 3960) | 700–3394 (median 2000) |
  | damage taken a world without a death (median, hull and shield): Verdant, Dustfall, Ion Reach, Obsidian | 244, 161, 293, 262 | 257, 343, 357, 592 |
  | the same: Cryosphere, Nova Forge, Eclipse | 208, 256, 746 | 296, 450, 744 |
  | a won run, s (median) | 709 | 695 |

  Raider hull ×1, 0.7, 0.55, 0.4, 0.3, 0.5, 0.6, 0.5 by step (before ×1 to
  Obsidian, 2.2, 2.8, 3), flagships ×1, 0.7, 1, 0.5, 0.6, 1, 1, 0.45 (before
  1, 1, 1.8, 1.3, 2, 4, 4, 2). Tried on the way: the old hull lost all 12 runs
  (Verdant to Obsidian); ×0.75 to 0.5 up to Obsidian, then 1.1, 1.4, 1.5, also
  0 of 12 (Obsidian and later); the factors above with Eclipse at 0.6 (flagship
  0.5) 4 of 12, at 0.42 (0.4) 8 of 12. The middle worlds cost more than
  before, not less, as the kit fights them with fewer levels. CHILL (seeds
  1–3): 3 won, 1 death (with the builds' numbers and Reactor tuning: 3 won, no death). With the
  trade-off card taken at every break (NORMAL, seeds 1–8): 3 of 8 won.

## What each world opens

Every ship, gun and module level goes on sale in a world of its own, and
reaching that world opens it at every shop from then on, in the arcade and the
campaign alike (`src/js/tech.js`). The world reached (`world_reached`) is in
the arcade the run's step, and from a world's cleared screen on the next one,
as its depot is the way into it; in the campaign the furthest world visited
(`campaign.visited`) or that a chapter claimed took the pilot to, so an old
save opens what its trips earned. What a save already owns beyond that stays its own and flies
or fires as before; only buying it, or one more of it, waits. In the campaign
the rank still licenses ships and guns on top; the arcade's free gun tier for
each world cleared stays, up to the tier the next step opens: 2 in Dustfall,
3 Ion Reach, 4 Obsidian, 5 Nova Forge (`gun_tier_opens` in `src/js/tech.js`;
the play log of v0.9.0 had every gun at tier 5 after Ion Reach). Tier 4 waits
for Obsidian, not Cryosphere: with a plasma kit a tier lower the bot could not
clear Obsidian's siege on any of three seeds.

- Ships and guns: `opens` on each ship (`src/js/ships/`) and gun
  (`weapon_catalog`), a world tier.
- Module levels: level L of a module with M levels opens at world
  round((L − 1)/M × 8) (`module_level_opens`): 2 levels Haven, Obsidian; 3
  levels Haven, Ion Reach, Cryosphere; 4 Haven, Dustfall, Obsidian, Nova
  Forge; 5 Haven, Dustfall, Ion Reach, Cryosphere, Nova Forge; 7 one a world
  from Haven to Eclipse, Obsidian skipped. Phase armor and the Shield
  capacitor name their own (`opens: [0, 1, 4]`): Haven, Verdant, Obsidian. With
  the formula's Ion Reach and Cryosphere, the gate to Ion Reach (defence 3,
  from Verdant or Dustfall) and those to Cryosphere and Nova Forge (defence 5,
  from Obsidian) would let in only a pilot flying the Viper or the Bastion.

| World | Opens |
|---|---|
| Haven | Wisp Scout, Kestrel Courier, Pulse cannon, Shard shotgun, level 1 of every module (23) |
| Verdant | Viper Interceptor, Ion disruptor, 3 module levels (magnet 2, Phase armor 2, Shield capacitor 2) |
| Dustfall | Mule Prospector, 4 module levels (magnet 3, Hotter plasma 2, Booster reservoir 2, Radiation lining 2) |
| Ion Reach | Bastion Gunship, Lance railgun, Seeker launcher, 17 module levels (level 2 of the 15 three-level modules, magnet 4, Hotter plasma 3) |
| Obsidian | Flux beam, 6 module levels (Prism 2, Guided plasma 2, Phase armor 3, Shield capacitor 3, Booster reservoir 3, Radiation lining 3) |
| Cryosphere | Aurora Cruiser, 17 module levels (level 3 of the 15 three-level modules, magnet 5, Hotter plasma 4) |
| Nova Forge | 4 module levels (magnet 6, Hotter plasma 5, Booster reservoir 4, Radiation lining 4) |
| Eclipse | magnet 7 |

- What a world opens is said once: in the arcade's depot before it, under the
  next world's rules (New on sale Bastion Gunship, Lance railgun, Seeker
  launcher, 17 module levels); in the campaign by a toast as you first arrive
  (Now on sale · ... · at every station). An item not yet open shows its
  world in a lock badge where a rank-locked gun shows its rank (Opens in Ion
  Reach), and cannot be bought.
- Why the arcade opens a world at the depot before it, not on arrival: its
  depot between worlds is where a run shops. Opened on arrival, what a world
  opens is bought only after it is cleared, and Ion Reach (the first raider
  shields, a flagship of 18 900) became a wall: `bin/playtest`'s bot died
  three times there in two seeds of three (NORMAL), where it had cleared it
  with no death before.
- The campaign's story still works (checked by hand against the gates'
  needs, `allowed_world`): each gate is met with what the world before it
  opens. The Obsidian gate's gun that bites (the Seeker or the rail) opens in
  Ion Reach, where chapter 4 brings its Vanguard licence; Nova Forge's 80%
  radiation from Obsidian asks for a hull with 20% of its own (the Mule or the
  Bastion) as Radiation lining 4 opens in Nova Forge itself. The guide's plan
  (`preparation_plan` in `src/js/guide.js`) names only what is on sale: module
  levels up to what is open, a gun or a protected hull you own or that is open.

- Measured (`bin/playtest`'s bot, NORMAL, seeds 1 to 3, before and after;
  the bot now arms each empty mount with one more of its gun, keeps its
  mounts when it buys a sturdier ship, and buys the rest of the shop once the
  fight's core is bought):

  | | before | after |
  |---|---|---|
  | runs won, deaths | 1 of 3; 0, 3, 3 (all in Eclipse) | 3 of 3; 0, 0, 0 |
  | run, s | 616, 619, 574 | 720, 509, 634 |
  | Ion Reach, s | 79, 76, 88 | 102, 67, 80 |
  | Obsidian, Cryosphere, s | 67 and 69, 71 and 58, 50 and 70 | 137 and 115, 59 and 48, 54 and 89 |
  | Nova Forge, Eclipse, s | 69 and 50, 128 and 172, 61 and 176 | 76 and 57, 48 and 50, 59 and 61 |
  | left after the Cryosphere depot (levels + ships, salvage kept) | 29 + 3, 2339; 32 + 3, 1231; 34 + 3, 2678 | 32 + 3, 2589; 15 + 2, 12; 28 + 3, 2118 |
  | the shop ran out | never | seed 2 at the Nova Forge depot (7.7 min), the others never |
  | salvage left at the end | 861, 607, 605 | 1353, 3469, 854 |

  The bot is a poorer shopper than the play logs' pilots (it saves for the
  next ship and never maxed out before), so it shows the shape, not the
  pilots' pace: nothing can run out before the depot ahead of Eclipse, and it
  did there once. Its deaths went because what a world locks pushes it to a
  two-gun ship sooner, and the later worlds still take it about a minute.
  OVERLOAD: the bot dies three times in Haven in every seed, before and after
  (Haven's shop is the same), so it cannot say whether OVERLOAD got easier;
  its raider growth (`arcade_modes.overload.growth`) stays 0. The campaign
  has no bot in `bin/playtest`; its gates were checked by hand (above).

## Salvage in

Salvage (◆) is the one currency.

- **Kills:** a raider drops an artifact 76% of the time, worth
  2 + wave / 4 (rounded down; in the arcade the step's wave, 1 + 2 × step,
  `threat_wave`): 2 in Haven and Verdant, 3 in Dustfall and Ion
  Reach, 4 in Obsidian and Cryosphere, 5 in Nova Forge and Eclipse. Shards drop
  none. A flagship drops 12 artifacts of 10. (`base_damage_enemy` in
  `src/js/combat.js`.) The Relic processor adds 25% a level.
- **Rocks:** a broken ore rock drops 3 artifacts of 4 + wave / 5
  (`base_damage_ore` in `src/js/render.js`); a broken drifting rock or wreck
  one of 2. A Dustfall cliff that falls (arcade) drops 2 of them and one more
  a raider it crushed ([Dustfall's cliffs](#dustfalls-cliffs)).
- **Arcade:** a cleared world pays 80 + 40 × the step, so 80 for
  the first world up to 320 for the seventh (`arcade_clear_bonus`); Eclipse ends the run.
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
| Ships | half the campaign price, rounded to 10 (`arcade_ship_price`): 180, 430, 530, 1150, 2800; from the world that opens it | the price above, gated by rank and by the world that opens it |
| Guns | 120 + 45 × rating, no rank; from the world that opens it | the price above, gated by rank and by the world that opens it; each more of a gun the same (the cannon 120) |
| Gun tier | free, one per world cleared, up to the tier the next world opens: 2 in Dustfall, 3 Ion Reach, 4 Obsidian, 5 Nova Forge (`gun_tier_open`) | (130 + 22% of price) × tier × 1.5 |
| Modules, supplies | the tables above; a module level from the world that opens it, and it works installed, within the reactor's power ([The arcade's power budget](#the-arcades-power-budget)) | the same, every level installed |
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
| Elite | from the mode's first elite world, the leader of every second squadron from wave 2: hull ×3, size ×1.35, shield 40 + 25 × step, drops a repair kit or an EMP; a trick of its world (below) | the target of an `elite` stage: hull ×3.5 (at least 600), armour +12% (at most 72%), shield ×1.6 (at least 80), speed ×0.8; carries missiles in Haven |
| Flagship | 1500 × (1 + 0.6 × step) hull × the design's factor of the step's world on the map's order (so any world's flagship at step 3 has Ion Reach's design) × its own duel's factor over its own design's, for its way to be won (so on the worlds' own order it is the duel's factor: Haven and Verdant 1, Dustfall 0.7, Ion Reach 3.2, Obsidian 3, Cryosphere 2.3, Nova Forge 1.5, Eclipse 4.5) (CHILL ×0.8, OVERLOAD ×1.25), × a card's factor; fights its world's duel (below); calls escorts and a last stand where its duel has it (66% and 33% for most); on OVERLOAD, overdrive at 15% | 10500 hull, 19000 in Eclipse; three times the world's shield |

- Where: `arcade_elite_make`, `arcade_flagship_spawn`,
  `arcade_flagship_update` in `src/js/arcade.js`; `spawn_operation_enemy` in
  `src/js/operations.js`; `spawn_enemy` in `src/js/campaign.js`.
- Every flagship fights as its world's entry in `boss_designs`
  (`src/js/bosses.js`) has it, an arcade one as its duel changes it (below): a way of moving, a gun between
  attacks, and a cycle of attacks; below 50% hull it roars (1.4 s, a toast
  naming what changes) and runs a second cycle. Each attack shows a tell
  first: a drawn lane, aim lines, a dashed reach, a glow, a swirl. A big
  attack ends in a stall: the hull is exposed for 1.6 to 4.5 s, its shield
  drops and hits do ×1.6 (`boss_hit_factor`, asked by `damage_enemy`).
  Hits that are not shots (a beam, a burst, a wave, a well) grow as a
  raider's do (`raider_hit_scale`) and by the mode's hits; shots are the
  raiders' own (`enemy_fire`), at `raider_shot_speed`'s pace. The mode sets
  the gap between attacks (CHILL ×0.8, OVERLOAD ×1.15, overdrive ×1.3 more),
  never the length of a tell. Drawn attacks aim where you are; only the gun
  between them leads you, as a raider's does.
- The campaign's flagships fight as their world's design, with their own
  hull: with a gunship (rail and two launchers at tier 3), the Ember
  flagship falls in 15 s and the Void Dreadnought in 28 s. The table is the
  campaign's fight; the arcade's duels below change some of it.

  | World | Moves | Attacks | Below 50% | Exposed |
  |---|---|---|---|---|
  | Haven, the Crescent | orbits you at 380 m | wingtip plasma fans; a strafing run down a drawn lane, dropping bolts to both sides | wider fans, a ring with one gap (marked green), two chasers | 2.2 s after a strafe |
  | Verdant, the Thorn Beetle | drifts with the current, lunging sideways | a spiral of spines; spores that drift and burst near you; three rings of thorns | faster spiral, more spores, its eyes burn and it hatches a brood (shards and a splitter) | after the thorns and the brood |
  | Dustfall, the Sawtooth | coasts, overshooting as you do | hatch missiles; side-pod flak; a saw charge leaving dust that bursts | missiles from four hatches, two charges in a row, two lancers | 2.2 to 2.6 s after a charge |
  | Ion Reach, the Storm Wheel | holds 520 m; jumps (a ring marks where) | ion bursts from its four pods; four lightning spokes sweeping a quarter turn, draining your pulse | four pods launched round it: while any flies, the hub takes a third of a hit | 1.6 s after the spokes; 3 s when the last pod falls |
  | Obsidian, the Iron Stair | still, then a heavy step | rail sights that track, lock and fire; a gravity well under you; a broadside of six lanes | five sights, two wells, a double broadside half a lane apart | 2 s after a broadside |
  | Cryosphere, the Frost Crystal | glides round you | ice plates turning round it stop your shots (4 of 6); a spiral of shards; icicles bursting round you; a frost nova that slows you | 5 plates turning faster, a three-arm spiral, more icicles | 2.6 s after the nova, the plates drawn in |
  | Nova Forge, the Furnace | lumbers in to 320 m | a sweeping flame from its vents that heats your guns; embers that leave burning slag; missiles; a flare | twin flames, more slag | 2.6 s after the flare |
  | Eclipse, the Eclipse Eye | hovers at 560 m; jumps | an eye beam turning after you at 0.4 rad/s, draining your pulse; a fan of rail lanes; a singularity pulling you in | two beams, wider fans, more jumps | 4.5 s while it holds the singularity |

- In the arcade each flagship is a duel of its own, a way to win it besides
  its hull (`boss_duels` in `src/js/boss_duels.js`): the line said as it
  appears, the HUD's card says what to go for now and an edge marker points
  at it off the screen. Its hull carries the duel's factor, for time to fight
  the duel through both its halves. While the flagship turns your shots from
  where you are (armour, blade, ice, a shut dome, a plate of its shell) and
  it is the nearest raider, the guns take the nearest other raider within
  650 m; a nest within 760 m is taken before the Beetle (`boss_duel_aim`).
  A part of a duel (a nest) goes with its flagship. When the flagship falls,
  its own drop (12 × 10 salvage) is drawn in (`boss_duel_watch`): a duel
  keeps you at a gap, a weak point or the edge rather than at its hull, and
  the flagship is often the last ship, so the world cleared at once and its
  drop was lost (the bot's salvage at Haven's depot was 120 short). Drawing
  in all the salvage lying round gave the bot half as much again as the base
  there, so only the flagship's is.

  | World | The duel | Its fight changes | Escorts |
  |---|---|---|---|
  | Haven, the Crescent | runs for the portal farthest from you 1.8 to 4.2 km off, there in 62, 46, 40 s unhurt (CHILL, NORMAL, OVERLOAD); each third of its hull lost slows it ×0.8 and opens it 2.5 s; at the gate it gets away: the wave goes on, no flagship bounty, the cleared screen says so | 2 s between attacks (the campaign's 1.1); two fans, then a wide fan, its ring and a fan; no strafe | 50%, no last stand |
  | Verdant, the Thorn Beetle | 2, 3, 3 nests 600 m round it, unarmed, a tenth of its hull each; while one stands grown, a shield round the Beetle stops every hit; at half its hull 1, 2, 2 more sprout, and the shield rises again 2.5 s later | as the campaign's | 50%, no last stand |
  | Dustfall, the Sawtooth | its blade lets half of a shot through; a charge that ends on a rock stuns it 4.5, 3.6, 3.2 s, hits ×2; the rock in its lane is lit while it winds up | saw charge, hatch missiles, charge, flak; then two charges in a row, more missiles; two lancers at half | 40%, no last stand |
  | Ion Reach, the Storm Wheel | a shell of six plates with two gaps turns round its core at 0.32 rad/s and stops your shots; below half eight plates, two gaps, 0.45 rad/s, turning back every 6 s; lit lanes show the gaps | its spokes become arcs: lightning out to 700 m across each plate's side, 16 a hit and your pulse drained, safe in the gaps; no pods | 50%, no last stand |
  | Obsidian, the Iron Stair | stands still and turns its bow to you at 0.3 rad/s; armour stops your shots but at one weak point, each a quarter of its hull, opening in turn at its stern, a flank, the other flank, its bow; a broken one opens the hull 2 s | three rail sights, never five; they hold fire while you are more than 1.1 rad off its bow; 1.8 s between attacks | 50%, no last stand |
  | Cryosphere, the Frost Crystal | ice lets 15% of a hit through; it glows (×1.5) after its spiral, while it gathers its nova and 3 s after it, and while it roars at half | no plates; its nova gathers 2.4 s (the campaign's 1.4) | 66%, 33% |
  | Nova Forge, the Furnace | a ring of fire 1400 m round the fight closes to 620, 500, 440 m as it heats (75% of its hull lost and the time: 240 s, 150 s in its second half); outside it, 10 a hit and your guns heat 30 a second; it keeps inside | as the campaign's | 50%, 20% |
  | Eclipse, the Eclipse Eye | keeps to the black hole's edge at 1.3 radii, its jumps too; its dome opens only while you are 1 to 1.8 radii from the hole's centre, 15% of a hit through otherwise; a surge makes the hole pull ×1.35 for 4.5 s, the dome wide open | a surge in place of the singularity | 66%, 33% |

- Arcade elites have a trick of their world, every 5 to 7 s while you are
  within 750 m, of the same kinds (`elite_tricks`): Haven a three-bolt
  burst, Verdant two spores, Dustfall a charge, Ion Reach and Eclipse a
  jump, Obsidian a locked rail sight, Cryosphere a small frost ring, Nova
  Forge three embers. From wave 2, 35% of the lines and pincers fly mixed:
  a second type of the world's mix in every other place
  (`arcade_squad_mix`).
- Contract enemies grow with the contract's level: +12% hull a level past the
  first, up to ten levels (`spawn_operation_enemy`).
- A chapter's flagship keeps the damage you dealt it: towed home or docked,
  you find it as you left it (`boss_hp` on the contract, kept by
  `src/js/navigation.js`, and carried past the autosave by the tow in
  `src/js/checkpoint.js`). Before, it came back whole after each tow, or as
  it was at the autosave up to 15 s before: in chapter 16 a story pilot
  (the Aurora Cruiser, two Lance railguns at tier 5, every module) took the
  reborn dreadnought (29 640 hull) to half in each life, died ten times in
  13 minutes without killing it, and the bot gave the chapter up. After, the
  same pilot kills it in its second life. Its bar names the ship the stage
  sends you after (`boss` on the stage): the Helios warship of chapter 15
  was shown as the Ember flagship.

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
| raider shot damage (a missile: the blast row) | ×1 | ×1.6 | ×1.75 |
| raider hull | ×1 | ×1.5 | ×1.8 |
| raider hull growth a world past Haven | +10% | +15% | none |
| share of the world's shop on raider and flagship hull (`arcade_shop_hull`) | half | all | all |
| share of the world's armour and shield | 80% | 80% | 50% |
| blast damage to you (a ship's explosion, a raider missile) | ×0.8 | ×0.8 | ×1.2 |
| raiders grow with your gun tier | no | no | +22% a tier |
| flagship overdrive | no | no | yes |
| marksmen (a factor on the world's share) | ×0.5 | ×1 | ×1.3 |

- Where: `arcade_modes` in `src/js/arcade.js`; the menu's line for each mode
  is `sync_mode_note`.
- **Lives:** a run has 3 on every row (`arcade_lives` in
  `src/js/arcade.js`). A death costs one; with lives left its screen offers
  to retry the world from its first wave, as the run stood when that world
  began but with the lives the run has now (`arcade_retry`), and the HUD
  blinks the one lost for 2.4 s (`arcade_life_flash`). The last ends the
  run: its score is weighed against the best and recorded if it beats it
  (`save_best`, as every death and the finale do). A save keeps the lives
  (`arcade_snapshot`); one from before lives loads with all three. The bot
  (bin/playtest) plays by the same lives. Before them it allowed three
  deaths in each world, so the runs counted won below with deaths in two
  worlds or more would be lost now. Measured with lives (NORMAL, seeds
  1–12): 5 of 12 won instead of 8; of the 7 lost, 4 lost all three lives
  in Eclipse and one in Verdant, as the old rule would have lost them too,
  and 2 lost them across two worlds (Obsidian twice then Eclipse, Haven then
  Eclipse twice).
- A raider's hull is the first table's (`base_spawn_enemy`, without the
  campaign's ×2) × the mode's hull × (1 + growth × step) × the
  step's shop, so on NORMAL an Eclipse raider has ×2.05 and ×0.5 on top of the
  mode's ×1.5; the flagship keeps its own scale but for the shop
  (`arcade_hull_scale`). The shop (`arcade_shop_hull`, `arcade_shop_flagship`)
  since the power budget: raiders ×1, 0.7, 0.55, 0.4, 0.3, 0.5, 0.6, 0.5 by
  step; flagships ×1, 0.7, 1, 0.5, 0.6, 1, 1, 0.45 ([The arcade's power
  budget](#the-arcades-power-budget)). Before it, with every level bought and
  installed: raiders ×1 to Obsidian, then ×2.2 Cryosphere, ×2.8 Nova Forge, ×3
  Eclipse; flagships ×1, 1, 1.8, 1.3, 2, 4, 4, 2. From Obsidian on a world sells the
  gunship's third mount, Prism 2, the cruiser's fourth and the top gun tiers,
  and a play log of v0.9.0 (NORMAL, 0 deaths, 19 min) killed a raider there in
  0.4–0.6 s against 1.7 s before, a flagship in 2–13 s. Measured after it
  (bin/playtest, seeds 1–3): NORMAL 793–824 s instead of 572–651, two of three
  won (the third reached Nova Forge's depot 22 short of the cruiser and died
  three times in Eclipse; seed 1 lost two lives in Obsidian's siege); CHILL
  626–633 s, no deaths. OVERLOAD carries the shop too since v0.10.3: its growth
  with your gun tier stops at tier 5, and a play log of v0.10.2 there (16.6
  min, no deaths) lost no hull from Cryosphere on. Its Eclipse flagship that
  died in 2 s had fallen into the black hole: raiders spawned within the
  hole's reach of you and the core took them. No raider spawns
  within 1.5 × a hole's radius now (`base_spawn_enemy`, the campaign too), and
  the arcade's flagship is neither pulled nor taken by a core. Measured after
  it (NORMAL seeds 1–3): Eclipse 114–129 s instead of 49–112, its flagship
  wave a real fight (643–1283 hull); two of three won. The bot cannot clear
  OVERLOAD's Haven, so OVERLOAD waits on a play log. Raiders carry
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
- A wave holds 10 + step + 4 per wave past the first + the mode's extra
  raiders (`arcade_wave_size`): on NORMAL 13 in Haven's first wave, 24 in
  Eclipse's second. With the world goals gone (2026-10-18) waves 1 and 2
  are full again, and 2 a step made Eclipse's second wave 31: the bot won
  3 runs of 12 (27 deaths in Eclipse); with 1 a step it wins 8 of 12, as
  before, every death in Eclipse. A squadron is
  3 + min(3, step / 2) + (wave − 1) + the mode's extra, and the next
  comes after max(2.6, 5.5 − 0.3 × step) seconds × the mode's gap,
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
- **Packs** (`src/js/arcade_pack.js`): a squadron's chasers, shooters,
  splitters and lancers (three at least; not an elite, an escort or a lurker)
  hunt together. Farther than 300 m (340 m for a shooter) from you, the first
  flies for where you will be, 1.2 times as fast while it is beyond 450 m
  (the **cut-off**); the next two swing to your sides, 300 m out (the
  **flanks**); the rest come in 220 m behind you. Closer, each fights as its
  type does. Hold still or circle within 300 m for 4 s (CHILL 6, OVERLOAD
  3.5) and a pack within 1.2 km closes a **ring** round you: from as far as
  it is (330 to 600 m) down to 230 m (CHILL 270, OVERLOAD 210) at 30 m/s,
  turning slowly, its round drawn; closed, it holds 3 s (CHILL 2, OVERLOAD
  3.5), then breaks and its raiders fight close; it rings you again no sooner
  than 10 s after (CHILL 14, OVERLOAD 9), and opens at once when you are
  150 m out of it. A second pack ringing you joins the first's ring. By
  world (`pack_flanks`, `pack_rings`):

  | | Haven | Verdant | Dustfall | Ion Reach | Obsidian | Cryosphere | Nova Forge | Eclipse |
  |---|---|---|---|---|---|---|---|---|
  | packs | from wave 2 | yes | yes | yes | yes | yes | yes | yes |
  | flanks | – | – | yes | yes | – | yes | yes | – |
  | ring | – | yes | yes | yes | – | yes | yes | – |

  Flanks are kept from Haven and Verdant, as the fanning out of squadrons
  that the packs replace was, and both from the rail worlds, where a slug
  crosses the screen in a quarter second.
- **Raiders with jobs** (`src/js/arcade_raiders.js`, `raider_kinds`): by the
  world's share a squadron gives one of its line raiders' places (two from
  Cryosphere on in a squadron of six or more) to a raider of a kind; a kind
  opens in its world from wave 2 and in every later world from wave 1, twice
  as often in its own world. At most world + 1 of a kind at once (one in
  Haven), and fewer of the slow-to-answer ones in a rail world. CHILL
  brings 60% as many. The campaign has none.

  | | Haven | Verdant | Dustfall | Ion Reach | Obsidian | Cryosphere | Nova Forge | Eclipse |
  |---|---|---|---|---|---|---|---|---|
  | share | 40% | 50% | 55% | 60% | 50% | 65% | 70% | 55% |
  | opens | interceptor | carrier | bulwark | sniper | mine-layer | | | |

  - **Interceptor**: hull 20 + 6 × threat, 95 m/s; near (950 m), it winds up
    for 0.45 s (its engines flare, a dashed arrow shows its way), then
    bursts for 1.1 s at 1.3 × your cruise (CHILL 1.15, OVERLOAD 1.4), never
    above 0.6 × your turbo, turning slowly, then coasts 0.7 s.
  - **Bulwark**: hull 100 + 16 × threat, 1.4 × a tank's shield; an arc of
    ±63° round its front stops your shots, turned to you at 0.75 rad/s
    (CHILL 0.55); your guns pass over a bulwark that faces you for a raider
    up to 350 m farther.
  - **Carrier**: hull 120 + 18 × threat; keeps 520 to 720 m; two drones from
    its bays every 7 s (CHILL 9), 4 at most (CHILL 3), each tied to it by a
    thin line, ringing you at 110 m, darting in, popping on a ram (9 before
    the world's growth); they fall when the carrier dies; it drops 2 salvage
    pieces, the drones none.
  - **Sniper**: keeps 580 to 820 m; a red line follows you for its charge,
    1.6 s (CHILL 2.1, a rail world +0.3), locked for the last 0.35 s; a slug
    of 24 before the world's growth, every 4.5 s (CHILL 6.5); a rock in the
    way grays the line and holds the shot.
  - **Mine-layer**: plans a 700 m lane across your way, 420 m ahead of you
    or through itself when it is farther ahead, and drops a mine every 55 m
    (CHILL 75) along it; a mine arms after 0.9 s, lives 15 s (CHILL 11),
    trips within 60 m, bursts 0.35 s later for up to 18 (before the world's
    growth and the mode's blast) within 85 m; a pulse or an EMP clears the
    mines it passes; 70 at most.

  The run's first of each kind brings a toast that says what it asks of you.
- **Marksmen** (`arcade_marksmen`, `raider_aim`): a share of the raiders
  shows its aim, where you will be when the shot gets there if you keep
  your course (as every raider aims), as a dashed line for the last half
  second before it fires (`arcade_aim_time`, drawn in
  `render_hostile_marks`). Its missiles steer for that point too, and turn
  1.15 times as hard as others (`arcade_marksman_turn`). Holding one
  course, a circle included, gets you hit; turning as the line brightens
  breaks the aim. The share, before the mode's factor:

  | Haven | Verdant | Dustfall | Ion Reach | Obsidian | Cryosphere | Nova Forge | Eclipse |
  |---|---|---|---|---|---|---|---|
  | 0 | 20% | 30% | 30% | 15% | 25% | 20% | 5% |

  An elite is always a marksman where the share is above 0; a flagship and
  a shard never are. The run's first marksman brings a toast that says what
  the line means. The campaign has no marksmen; its raiders lead their
  shots all the same.
- Measured (`bin/playtest`'s bot, NORMAL, seeds 1 to 3, with one more of its
  gun bought for each empty mount; before and after the marksmen and the
  fanning out): all six runs won with no deaths. All damage taken, hull and
  shield: Ion Reach 83 to 149 instead of 10 to 51, Cryosphere 94 to 161
  instead of 45 to 126, Obsidian 131 to 510 instead of 131 to 222, Eclipse
  455 to 689 instead of 243 to 522; Dustfall and Nova Forge stay at 0 to 14,
  as the bot dashes past every missile and a dash's quarter second of grace
  covers it. Raider bolts that hit: Ion Reach 17% instead of 6%, Obsidian 18%
  instead of 9%.
- Measured (the same bot, NORMAL, seeds 1 to 6, with one more of its gun
  for each empty mount; before and after a dash stopped covering blasts,
  missile raiders reloaded twice as slowly and a missile's blast took the
  mode's blast factor instead of its shot factor): all damage, hull and
  shield, Dustfall 79 to 130 instead of 0 to 19, Nova Forge 100 to 325
  instead of 0 to 56; most of it lands on the shield (hull 0 to 29 in
  Dustfall, 0 to 268 in Nova Forge). Missiles now cost something from Verdant
  on: Ion Reach 36 to 155 (57 to 149 before), Cryosphere 76 to 269 (84 to
  161). Seeds 1, 2, 3 and 6 are won with no deaths, seed 6 lost before;
  Eclipse costs them 321 to 820 instead of 455 to 689. Seeds 4 and 5 die
  three times in Eclipse, as they did before (2227 and 2241 then, 1961 and
  1981 now, most of it rail slugs): a wall for this bot that seeds 1 to 3
  had hidden. Tried and dropped: a dash that covered nothing for 1.5 s
  after the last (the first round) made the rail worlds walls; the blast at
  the shot factor (×1.6) with missiles at their old pace cost Nova Forge
  three deaths in every seed; at ×1.2 with the slower reload it walled Nova
  Forge for seeds 4 and 5, whose repairs had left them one gun. CHILL seed
  1: still no deaths, Dustfall 52 and Nova Forge 51 instead of 9 and 0.
  OVERLOAD was lost before on seeds 1 and 2 (three deaths in Eclipse); seed
  2 still reaches Eclipse and dies there, seed 1 now dies three times in
  Dustfall, after three deaths in Haven and Verdant.
- Wave 2 of each world draws an **event** from the world's pool
  (`arcade_event_pools` in `src/js/arcade_events.js`), with a toast and a
  mark on the map; it ends with the wave:

  | Event | What it does | Worlds |
  |---|---|---|
  | Convoy | an unarmed freighter (a tank's hull ×4) on a 2 km run past you, about 30 s; 6 artifacts of 8 + 2 × step if caught | Haven, Verdant, Dustfall, Ion Reach, Cryosphere |
  | Fleeing ace | an elite, 30% faster, jumps away after 20 s; 4 artifacts of 10 + 2 × step if caught | Haven, Ion Reach, Obsidian, Cryosphere, Nova Forge, Eclipse |
  | Jammer | a gunner with twice the hull, 900–1300 m off; while it lives the minimap and the radar show only it | Verdant, Dustfall, Obsidian |
  | Heat surge | every 6 s a line of 8 vents, 1400 m long, across your way; each warns for 1.4 s, then bursts for 22 within 80 m | Nova Forge, Eclipse |
  The ion storm (your shield at 0 for the wave, wherever you were) went on
  2026-10-15: there was no answer to it, and it undid Ion Reach's own storms.
- A ship that explodes hurts everything within 1.8 × its blast size, less
  with distance: a chaser 10, a tank 26, a flagship 50, an elite ×1.5
  (`arcade_blast_from_kill`).
- **Eclipse is the gravity world** (`src/js/arcade_gravity.js`, the arcade
  only; one hole of 560 m, core 56 m, its pull reaching 2260 m: 131 m/s at
  600 m from the centre, 490 at 300). A toast as the world begins says so:
  "it bends every shot · pass close to the hole to sling · lead raiders in".
  - **Shots bend.** On top of the pull that moves everything, a shot's way
    curves toward the hole by 1.2 × 10⁻⁶ rad a metre for each m/s of pull
    across it (`arcade_shot_bend`), the same curve at any speed. A bolt of
    1100 m/s aimed to pass 600 m from the centre turns 33° (15° with the pull
    alone), aimed at 1 km 22° (11°); a rail slug of 2600 m/s 14° at 600 m
    (3°); one aimed within 400 m swings round into the core, which takes it.
    Your shots and the raiders' alike, missiles too (their guidance steers
    back); a flagship's shots and a marksman's keep the line they showed.
    Twice the bend whipped a bolt aimed at 600 m 120° round the core.
  - **The slingshot.** Within 1.5 radii of the centre (840 m) and 120 m
    clear of the core, the part of your flight across the pull builds extra
    speed: pull ÷ cruise × 0.45 of cruise a second, at most +60%; diving
    straight in builds none. It holds 1 s after the pass, then fades by 40%
    of cruise a second; B drops it, and the ship turns as it does at cruise
    (`arcade_sling_*`). A pass at 550–650 m reaches it in 3 s; SLINGSHOT
    shows once a pass, at +20%. The core still kills.
  - **Raiders mind the pull, but not while closing on you.** Within 1.8
    radii of the centre (1010 m) a raider's way leans outward by the pull
    over its speed × 1.5 (`arcade_mind_band`, `arcade_mind_lean`): it holds
    off at the edge rather than drift in (before, nothing steered them out).
    One within 500 m of you and heading at you (within 72°: an attack run, a
    chaser coming in; `arcade_lure_reach`, `arcade_lure_heading`) forgets
    the pull, and the hole pulls it ×1.5 (`arcade_lure_pull`), so a chaser
    of 165 m/s cannot pull out within about 800 m of the centre instead of
    480: lead it past the hole. The flagship, as before, is neither pulled
    nor taken, and holds its place itself. A raider the core takes is a kill
    as before, and its drop, which fell in with it, is paid instead: 150
    points and 6 salvage, SWALLOWED over where it fell.
  - Measured (bin/playtest, NORMAL, seeds 1–12, against the build before
    it run beside it): 7 runs of 12 won instead of 6, 21 deaths in Eclipse
    instead of 22 (6 elsewhere in both), Eclipse 66–323 s instead of
    61–245; the hole took 339 of the bot's 1891 Eclipse kills (18%). The
    bot keeps 1.6 radii off the hole, so it never slings. With every raider
    careless near you (900 m, any heading) a pilot circling at 600 m let
    the hole take a whole first wave in about 5 s, and the bot won 9 of 12.
  - Circling against fighting away from the hole (build/dev.html, no god
    mode, a cruiser with four tier-5 cannons and the bot's Eclipse modules,
    340 hull and 205 shield, three tries each): wave 1 (20 raiders) circled
    with the stick took 14–18 s, the hole 6–13 of them, 17–34 hull and
    shield lost; circled with the keys' eight ways 18–19 s, 2–5, 26–51;
    the bot's way away from it 17–23 s, none, 58–77. Wave 2 (24): circled
    9–16 s, 6–12 swallowed, 0–70 lost; away 17–25 s, 94–392 lost. Most of
    the loss is raiders' shots either way: led for a straight flight, they
    miss a ship going round, and the raiders that mind the pull keep 400 m
    or more off it. The circle's price is the core, which a slip costs.

NORMAL in numbers, a row a step (named for the world flown at it on the map's
order; any world flown at that step has its numbers):

| World | chaser | tank | armour, shield (tank) | elite shield | flagship | raiders a wave | squadron | gap (s) | clear bonus |
|---|---|---|---|---|---|---|---|---|---|
| Haven | 44 | 140 | 0%, 0 | 40 | 1500 | 13 / 17 / 21 | 4 / 5 / 6 | 4.40 | 80 |
| Verdant | 52 | 144 | 10%, 0 | 65 | 1680 | 15 / 19 / 23 | 4 / 5 / 6 | 4.16 | 120 |
| Dustfall | 61 | 156 | 20%, 0 | 90 | 3300 | 17 / 21 / 25 | 5 / 6 / 7 | 3.92 | 160 |
| Ion Reach | 62 | 149 | 16%, 52 (73) | 115 | 9450 | 19 / 23 / 27 | 5 / 6 / 7 | 3.68 | 200 |
| Obsidian | 61 | 142 | 40%, 36 (50) | 140 | 9180 | 21 / 25 / 29 | 6 / 7 / 8 | 3.44 | 240 |
| Cryosphere | 130 | 292 | 28%, 112 (157) | 165 | 7500 | 23 / 27 / 31 | 6 / 7 / 8 | 3.20 | 280 |
| Nova Forge | 193 | 426 | 48%, 72 (101) | 190 | 8625 | 25 / 29 / 33 | 7 / 8 / 9 | 2.96 | 320 |
| Eclipse | 196 | 423 | 52%, 160 (224) | 215 | 9126 | 27 / 31 / 35 | 7 / 8 / 9 | 2.72 | (run ends) |

## Dustfall's cliffs

In the arcade, Dustfall is the world where you change the ground, not only
shoot what flies over it (`src/js/arcade_cliffs.js`; the campaign has none).

- **Six cliffs** (`cliff_count`), 115 to 150 m across in radius
  (`cliff_size`), 1.5 to 2.3 km round the middle, 1.1 km apart, each leaning
  across the ring, the same every visit (their own seed). The ore rocks under
  a cliff and down its fall zone go (78 rocks stay of 95), so the zone is
  bare ground until the cliff falls.
- **The fall zone:** from the cliff's middle 520 m out past its face
  (`cliff_reach`), as wide as the cliff at its foot and 130 m wider each
  side at its far end (`cliff_spread`); drawn faint, warmer with a raider
  under it, red while it rumbles and falls.
- **Hull:** 180 × the mode's raider hull × (1 + its growth × step)
  (`cliff_hull`): 351 at NORMAL's third step, 2.3 s of two cannons, 4.7 s
  of the first gun; CHILL 216 to 238. A bar over it once hit, orange once it
  is **primed** (a quarter left, `cliff_primed`). Your shots, the pulse and
  your missiles wear it down to primed; the last quarter gives only to the
  guns while they aim at its crack. Raiders' shots stop on it and do not wear
  it (Dustfall's `solid` rule wears its ore rocks only).
- **The guns aim at a crack** within 600 m of its face (`cliff_aim_reach`)
  when two raiders are under it (`cliff_aim_least`), or one once it is
  primed, and you are out of its zone (60 m to spare); or when you point at
  the cliff. With nothing else near they wear a cliff down to primed, as
  they shoot rocks.
- **The fall:** broken, it rumbles 0.6 s (`cliff_rumble`, a red ring and
  ROCKFALL), then the fall runs down the zone at 2 km/s (`cliff_fall_pace`)
  and each hull it reaches loses 1.6 × its hull and shield together (dead,
  its armour aside: `cliff_crush`), a tank, bulwark, carrier or elite 0.9 ×
  (left with a sliver: `cliff_crush_heavy`), a flagship 0.15 ×
  (`cliff_crush_flagship`). You lose 40 (`cliff_hit`, a blast: a dash does
  not cover it). Eight rubble rocks of 26 to 42 m (`cliff_rubble`) land in
  the zone as the fall passes them (ore rocks: your shots break them, with
  their salvage), and where the cliff stood is open.
- **The pay:** the crushed raiders' kills (the combo counting up through
  them), 60 × n × n score on top (`cliff_points`), and 2 + n pieces of a
  rock's salvage in the zone (`cliff_salvage`): a toast CRUSHED ×n.
- **Squadrons come to the cliffs:** half of Dustfall's lines and pincers
  (`cliff_squad_share`) warp in a third of the way down the zone of the
  nearest standing cliff 500 to 1400 m from you (`cliff_squad_range`), when
  you are out of it, in one line.
- The world's arrival says it once: CLIFFS · SHOOT A CLIFF'S CRACK · THE ROCK
  FALLS ON WHAT IS UNDER IT.
- Measured (`bin/playtest`'s bot, NORMAL, seeds 1 to 4, Dustfall third): no
  deaths in Dustfall before or after; its time 94, 88, 109, 117 s against
  143, 107, 243, 92 before (mean 102 against 146); hull lost there 56, 24,
  0, 0 against 16, 24, 57, 15, all damage 135 to 192 against 126 to 380. The
  bot does not seek the cliffs: its guns felled 2 to 5 a run, each with
  raiders under it, and crushed 6 to 10 raiders a run (up to 6 at once); no
  fall caught the bot. With the last quarter open to any shot (the first
  try), 14 falls of 21 came down on no raider, shot through by fire at
  raiders round them, and two caught the bot (30 each).

## The arcade's route and cards

At each break between two worlds (after the cleared screen, before the
depot: `src/js/arcade_break.js`) the player takes one of three cards, then
chooses the next world of two.

- **The route** (`src/js/arcade_route.js`): Haven first, Eclipse last. The
  offer is the lowest world left on the map's order and one more of those at
  most a step past the next one (its tier at most the next step + 1;
  `arcade_route_steps`), drawn
  by the run's dice (`arcade.seed`, kept in the save with the route and the
  cards); after the seventh world only Eclipse. Taking the first (lower) one
  every time flies the map's order with the numbers of before. Obsidian comes
  only at its own step, the fifth world: it is tuned to that step's hull.
  bin/playtest's bot (NORMAL) lost the run there 6 times in 9 when it came
  fourth, 6 in 9 when it came sixth or seventh (the shop's ×2.2 and ×2.8
  raider hull), and 2 in 12 in its place, both with two guns. So the first
  three worlds after Haven are Verdant, Dustfall and Ion Reach in an order of
  yours (VDI, VID, DVI, DIV), and Cryosphere and Nova Forge come after
  Obsidian in either order: eight routes.
- **What goes by the step**, whichever world it is: the raiders' hull, armour
  and shield, their threat level (hull, speed, the shooters' bolts and
  reload, the flagship's pattern speed: `threat_wave`), their hits, the wave
  and squadron sizes and gap, the elites' shield, the flagship's hull with
  the design factor of the step's world (so Ion Reach flown third has
  Dustfall's 5 940, not 26 730), the world bonus, an event's pay,
  your EMP, what a kill drops, what the depot opens (`Opens at world 5`) and
  the free gun tier. **What stays the world's:** its map (rocks, black holes,
  storms), its rules, its raiders' gun and type mix, its marksmen and flank
  arc, its events, its flagship's attacks and its elites' trick.
- **The cards** (`arcade_card_pool` in `src/js/arcade_cards.js`): one of each
  kind a break, by the run's dice; a kind with none left gives its place to
  another. A gamble lasts the next world and pays its prize when that world
  is cleared (in Eclipse, where the run ends, 25 000 score instead); a
  trade-off lasts the rest of the run and is taken once; a boon is given at
  once, or lasts the run. What is in force shows as chips over the gauges.

  | Card | Kind | What it does |
  |---|---|---|
  | Bounty contract | gamble | ×1.5 raiders a wave; prize +15% damage |
  | Flagship wager | gamble | flagship hull ×1.6; prize a module level the depot does not sell yet |
  | Armoured raiders | gamble | raider hull ×1.4; prize every gun a tier past the depot's |
  | Elite hunt | gamble | an elite leads every squadron from wave 2; prize +20% hull |
  | Hot zone | gamble | raiders reload ×0.77 (30% faster); prize your guns 15% faster |
  | Afterburners | trade-off | speed +20%, hull −15% |
  | Glass cannon | trade-off | damage +30%, damage taken +25% |
  | Heavy plating | trade-off | hull +35%, speed −12% |
  | Overclocked guns | trade-off | fire rate +25%, hull −20% |
  | Shield over hull | trade-off | shield +60%, hull −20% (with 25 shield or more) |
  | Field upgrade | boon | a module level on sale now, free |
  | Prototype | boon | a module level not on sale yet, for twice its price |
  | Second wind | boon | once a world, a hit that would destroy you leaves 30% hull |
  | Supply cache | boon | +2 repair kits, +1 EMP, +1 stasis cell |
  | Tuned guns | boon | +12% damage |
  | Black-market tier | boon | every gun a tier past the depot's, for 400 |

- Measured (`bin/playtest --pick=... --route=...`, NORMAL): the old order
  with no card (`--pick=none --route=low`) won 5 of seeds 1–6 (the game
  before: 2 of seeds 1–3); a card and a world at random won 5 of 6, always
  the gamble and the later world 3 of 3, and CHILL with the later world 3 of
  3 with no death. The two runs lost ended in Obsidian (with two guns, at its
  own step) and in Eclipse. Before Obsidian kept its step, runs that took it
  early or late ended there more often than not (above), and before the
  flagship's hull went by the step, Ion Reach flown third had a flagship of
  26 730 and ended three runs of eight.

## The arcade's Scroll kind

The arcade's second kind (`src/js/arcade_scroll.js`) flies the same run on a
screen that moves on by itself, along a lane through each world. With no open
space to spread the raiders out in, and every raider in the view within reach
of its gun, the free arcade's numbers were too hard on a lane; these are the
lane's own, each measured with the bot (`bin/playtest --kind=scroll`, NORMAL):

| On a lane | Value | In Free | Why |
|---|---|---|---|
| Raiders alive before the next squadron waits | 8 | 14 | 17 at once in Obsidian's and Eclipse's first waves |
| Raider reload | ×1.35 | ×1 | shots were most of the damage, twice Free's |
| A bulwark's shield turn | ×0.6 | ×1 | the view's edges cut the circle round it short; a slow ship never got round, its wave held for hours of game time |
| The lane's two stretches | 80 s | - | about as long as two waves take in Free; between waves the screen goes ×3 |

A raider inside a black hole's reach is left to the hole, not held in the
view (Eclipse's lane ends 650 m above it): held at the view's edge, it could
neither fall in nor be reached. Farther from the hole (900 m) the bot won none
of 12 runs: the raiders it swallows are much of the help there.

Bot runs on 2026-10-19, seeds 1–6 a build: tank 6 of 6, mixed 5, evasion 2,
guns 1 (14 of 24); Free, seeds 1–12, 8 of 12. With no room to dodge, the hull
counts for more on a lane than in Free.

## Campaign pace

- Patrols: every 11 s in Haven, elsewhere every max(4.5, 10 − 0.6 × tier)
  s, 1 + min(9, tier) / 3 raiders (the tier is the world's index, or the
  story's front past it, above), while you are outside the station's
  shelter and fewer than 12 are out (`src/js/navigation.js`). While you hold
  a hunt or a mining stage, growing waves come instead (see
  [goals.md](goals.md)).
- A death (campaign): a tug brings the ship to the world's station, docked
  and repaired, for 10% of the salvage saved; the cargo aboard is lost, the
  contracts keep their progress, a flagship its damage (`tow_to_station` in
  `src/js/checkpoint.js`).
  Before, the flight resumed at the last autosave with the hull and the
  radiation dose saved there, which could die again at once, over and over.
- Ranks license ships and guns: XP from kills (table above) and from
  contracts.

| Rank | Cadet | Courier | Pathfinder | Vanguard | Ace | Commander | Admiral | Legend |
|---|---|---|---|---|---|---|---|---|
| XP | 0 | 120 | 420 | 1100 | 2400 | 4200 | 7000 | 10500 |

- Where: `rank_thresholds`, `rank_names` in `src/js/fleet.js`. The world
  that opens a ship or gun is a second condition (What each world opens,
  above); in the story both come together.
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
- Measured again (2026-10-12, second round, the same bot). A full campaign
  from chapter 1: chapters 1 to 7 in 31.5 minutes; the pilot owns every
  module by minute 28, two Lance railguns at tier 5 by minute 31 and the
  Aurora Cruiser after chapter 8. Chapter 8 took 15.1 minutes and 5 deaths,
  all at the Void Dreadnought, which came back whole after each tow. Act
  II from that kit (two railguns at tier 5, two shotguns, every module):
  chapters 9 to 15 take 1.9 to 4.3 minutes each (chapter 14, with its
  100-second relay, 11) with no hull lost and no death; 10 000 to 37 000
  salvage pile up with nothing left to buy. Chapter 16 was a wall: the
  reborn dreadnought, back whole after each death, killed the pilot ten
  times in 13 minutes. After the flagship kept its damage, chapter 16
  takes 14 minutes and 3 deaths (two at the dreadnought), and chapter 8
  with the same kit 10.2 minutes and a death.

## Scoring

- A kill scores its type's points (table above) × the combo. The combo grows
  by one for each kill within 4 s of the last, up to ×8, and a hit on you
  resets it.
- An artifact picked up scores 25.
- Arcade Dustfall: raiders crushed by one cliff's fall score their kills
  (the combo counting up through them) and 60 × n × n on top: 240 for two,
  960 for four (`cliff_points`).
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
