# Missiles: what to draw

The Seeker launcher fires homing missiles. A missile is ejected slowly from
one of the launcher's four cells, lights its motor, speeds up, turns toward
the raider it has locked and, near its hull, goes off: the blast is a wave
that runs out and hurts what its front reaches, and sets off the missiles it
meets. It can overshoot a nimble raider, and when its fuel runs out it coasts
and bursts in a small harmless wave. Raiders on Dustfall and Nova Forge, and
Haven's elite commanders, fire missiles of three kinds at you: darts,
seekers and torpedoes.

Three modules change the missile: Seeker head (turns harder, locks farther),
Rocket motor (faster, a new engine and exhaust each level) and Shaped warhead
(a bigger blast). The game already plays all of this with today's drawings
and code-drawn stand-ins; this brief lists what to draw so it looks finished.

Screenshots from the game (2026-10-04, in `docs/designer/missiles/`):

| Shot | What it shows |
|---|---|
| [before](missiles/before.jpg) | The launcher before this work: small rockets with a flame, no trail |
| [closeup-stock](missiles/closeup-stock.jpg) | One stock missile at 200%: drawing, flame, smoke puffs |
| [engine-1](missiles/engine-1.jpg) | Rocket motor level 0, solid rocket: orange core, grey smoke |
| [engine-2](missiles/engine-2.jpg) | Level 1, hot-fuel rocket: yellow core, thin smoke |
| [engine-3](missiles/engine-3.jpg) | Level 2, ion sustainer: blue ribbon, no smoke |
| [engine-4](missiles/engine-4.jpg) | Level 3, fusion torch: long violet ribbon |
| [flight-stock](missiles/flight-stock.jpg) | Stock blast (100 m ring) and the lock bracket on a raider |
| [flight-maxed](missiles/flight-maxed.jpg) | All modules: fusion torch trail, 175 m blast |
| [campaign-arsenal-after](missiles/campaign-arsenal-after.jpg) | Station arsenal: the launcher card, two launchers on an interceptor |
| [campaign-modules](missiles/campaign-modules.jpg) | Station modules: the three missile modules with stand-in icons |
| [arcade-depot-search](missiles/arcade-depot-search.jpg) | Arcade depot: launcher, and modules that wait for it |
| [arcade-depot-bought](missiles/arcade-depot-bought.jpg) | Arcade depot after buying: launcher on the ship preview |
| [kinds](missiles/kinds.jpg) | Raider kinds in flight: a dart (yellow), two seekers, a torpedo (thick smoke) |
| [fuse-3](missiles/fuse-3.jpg) | A raider's seeker gone off at its fuse beside your ship, its wave reaching you |
| [chain-1](missiles/chain-1.jpg), [chain-2](missiles/chain-2.jpg) | Your missile's wave at a tank sets off a raider's dart, which sends its own |
| [fizzle-3](missiles/fizzle-3.jpg) | A seeker at the end of its flight: a small blast and a small wave |

Frame sequences 0.1 s apart are in `data/missiles/` (fizzle-1..7, fuse-1..6,
chain-1..6), kept out of git.

## What to draw

Eight new files and two refinements. Every file goes in `src/sprites/`, under
the name given; the game picks it up on the next build, and until a file is
there it keeps drawing what it draws now.

| # | File | What | Canvas | Shown at |
|---|---|---|---|---|
| 1 | `weapons/projectile-missile.svg` | Mk I missile, solid rocket (exists; refine or keep) | 32 × 32 | 18 units yours, 14 a raider's |
| 2 | `weapons/projectile-missile-2.svg` | Mk II, hot-fuel rocket | 32 × 32 | 18 units |
| 3 | `weapons/projectile-missile-3.svg` | Mk III, ion sustainer | 32 × 32 | 18 units |
| 4 | `weapons/projectile-missile-4.svg` | Mk IV, fusion torch | 32 × 32 | 18 units |
| 4a | `weapons/projectile-dart.svg` | A raider's dart | 32 × 32 | 11 units |
| 4b | `weapons/projectile-torpedo.svg` | A raider's torpedo | 32 × 32 | 22 units |
| 5 | `weapons/turret-missile.svg` | The launcher on a mount (exists; refine or keep) | 64 × 64 | 10.5, 14 or 21 units |
| 6 | `modules/seeker-head.svg` | Module icon | 64 × 64 | 24-55 px |
| 7 | `modules/rocket-motor.svg` | Module icon | 64 × 64 | 24-55 px |
| 8 | `modules/shaped-warhead.svg` | Module icon | 64 × 64 | 24-55 px |

### 1-4. The missile, one body per engine

Four variants, one per Rocket motor level. The player sees theirs change
when they buy a level, so the four should read as one missile family whose
tail section grows: same canvas, same nose-up pose, same band position, a
different engine.

- Canvas `viewBox="0 0 32 32"`, nose up (the game turns it to fly along its
  course). Today's body runs from y 2 to 28, 6 wide (x 13-19), fins out to
  x 8 and 24. Keep a variant within y 1-30 and x 6-26.
- Drawn 18 game units across the canvas: about 15 units of body, a third of
  the Wisp scout (46 long), half a raider fighter. On screen that is 18 px at
  100% and 36 px at 200%: the silhouette and the band have to read at 18 px.
- Mk I, solid rocket: today's drawing. Mk II, hot-fuel: a bigger bell
  nozzle, a fuel line. Mk III, ion sustainer: slimmer, a grid ring at the
  tail that glows blue (`#6fd0ff`). Mk IV, fusion torch: a magnetic nozzle
  ring, violet emitter (`#b98cff`). These are suggestions; the rule is that
  the tail tells the tier.
- Raiders fire three kinds, each painted in their faction colour: the
  seeker is Mk I at 14 units, so Mk I must also look right as an enemy
  weapon; the dart (11 units: slim, a needle nose, small fins, a short
  yellow trail) and the torpedo (22 units: fat, blunt, a big warhead, thick
  smoke) have their own files and use Mk I until drawn. Each must read at a
  glance by size and trail: a dart has to come close to go off, a torpedo
  goes off 40 units out with a wide wave.

Layers, as in today's file (the game reads them by id):

- `<g id="base">`: metal body and fins, outline `#0b1722` 1.4 wide, the
  greys of the other weapon drawings (`#e0e4e9`-`#6c6e72` body,
  `#9ea4ac`-`#2e343a` fins).
- `<g id="accent">`: the band. Fill it with the gradient `accent-fill`
  whose stops have the ids `accent-light`, `accent-base`, `accent-dark`; the
  game repaints the stops in the shooter's colour: yours `#ff9a68` (the
  launcher's colour), a raider's its faction colour. Only the band goes
  here; a glow that should not change colour stays in `base`.
- `<g id="anchors">`: one `<line id="flame-main-1">` per nozzle, from the
  nozzle backwards. Its length is a full flame (the game draws 0.85-1.7
  times it, longer while the missile accelerates and for higher motors);
  its `stroke-width` is the nozzle's width. Two nozzles: `flame-main-1`,
  `flame-main-2`. The layer is removed when the drawing loads; colour it
  anything (today red).

### Exhaust and trail (code, colours from you)

The game draws the flame and the trail itself, so they can stretch and
fade. What is wanted from you is the colours and a mock of each look; today
they are:

| Level | Motor | Flame | Trail | Smoke |
|---|---|---|---|---|
| 0 | Solid rocket | `#ffb27a` | `#ff9a68`, short hot core | grey puffs, dense |
| 1 | Hot-fuel rocket | `#ffe08a` | `#ffd36b`, short hot core | grey puffs, thin |
| 2 | Ion sustainer | `#a8ecff` | `#6fd0ff`, the whole trail | none |
| 3 | Fusion torch | `#eedcff` | `#b98cff`, the whole trail, longest | none |

Smoke puffs swell from 1.6 to 7.6 units and fade over the trail's life
(0.4, 0.5, 0.6, 0.75 s by level). A raider's missile has the solid-rocket
look with a 0.3 s trail.

### 5. The launcher on the hardpoint

`weapons/turret-missile.svg` exists: a square pod of four cells on the round
turret base. The launcher is now a medium gun, so it is drawn 14 units
across on a medium mount and 21 on a heavy one; in the arcade the scout
carries it at 10.5. It is also the launcher's card icon (about 55 px on the
arsenal card, 22 px in a mount row, 40 px on the arcade depot card, and on
the depot's ship preview), so no separate card icon is needed.

- Keep the base disc the size of the other turrets (about 31 of the 64, so
  the mount's ring shows round it) and the pod on top.
- Keep the four `muzzle-1` to `muzzle-4` circles in `<g id="anchors">`, one
  in each cell, `r` = the cell's bore: missiles leave from the cells in turn,
  splayed alternately left and right.
- Worth adding: missile noses in the cells, in the accent band colour, so a
  loaded pod reads as missiles at 22 px.

### 6-8. Module icons

Three icons in the family of `modules/guided-plasma.svg`: 64 × 64, base
`#5d6874` with `#070b14` outlines 3-4 wide, the accent gradient `accent-fill`
(`accent-light`, `accent-base`, `accent-dark`). The file name is the module's
title in lower case with dashes; until it is there the game shows the
module's glyph on a tile (see campaign-modules.png).

- `seeker-head.svg`: the missile's nose cone with a crosshair or lock
  brackets.
- `rocket-motor.svg`: a nozzle with a flame.
- `shaped-warhead.svg`: a warhead with a burst.

They show at about 55 px on station cards, 40 px on depot cards and 24 px
in the depot's Installed strip.

### Explosion and lock (code, reference only)

- The blast is drawn by code: a fireball (`explode()`) and a travelling
  wave, a band in the missile's colour behind a bright front, running out
  to the blast radius (yours 100, 125, 150 or 175 m; a dart's 45, a
  seeker's 70, a torpedo's 120) and fading; the front does the damage as it
  reaches each hull (fuse-3, chain-1). No file is loaded for it; a reference
  sheet of the wave and of how a missile blast should differ from a ship
  exploding is welcome, and the code will follow it.
- A missile that runs out of flight without going off bursts: a small dim
  fireball in its colour, a grey spark and a small wave of 45 that hurts
  nothing (fizzle-3).
- A raider a missile of yours has locked wears four turning corner ticks in
  `#ff9a68` (flight-stock.jpg). A restyle is welcome as a reference.

## What already exists and stays

- `weapons/projectile-missile.svg` is today's missile; raiders use it. Its
  canvas, scale and band are the pattern for the other three.
- `weapons/turret-missile.svg` is the launcher; its cells and muzzle marks
  decide where missiles come from.
- The other turrets (`weapons/turret-*.svg`) and module icons
  (`modules/*.svg`) are the families the new art joins.
- Weapons and drones point their nose up on their canvas; everything in
  `weapons/` follows that.

# Reference

## How the code uses the files

- `src/js/missiles.js`: `missile_sprite(engine)` loads
  `weapons/projectile-missile-<level + 1>` for levels 1-3, falls back to
  `weapons/projectile-missile`, and draws a rocket of lines when neither
  exists; `missile_draw` puts it at 18 units (yours) or 14 (a raider's),
  band painted, flame from the `flame-main` marks; `missile_trail_draw` and
  `missile_engines` hold the trail looks.
- `src/js/upgrades.js`: `module_icon(option)` loads
  `modules/<title-with-dashes>.svg`, else the glyph tile.
- `src/js/turrets.js` and `src/js/hardpoints.js`: `turret_draw` and
  `gun_muzzles` read `weapons/turret-missile.svg` and its muzzle marks;
  `gun_boxes` sets 10.5 / 14 / 21 units by mount.

## Flight, by the numbers

- Ejected at 260 plus the ship's forward speed, splayed 0.3 rad from the
  aim; the motor lights 0.12 s later and pushes to top speed. A world's
  projectile speed (Ion Reach 1.35, Obsidian 0.82) scales speed and thrust.
- The seeker sees 100° either side of the nose. It locks the raider that is
  nearest and most ahead within its lock range, keeps it while it lives and
  stays in view, and otherwise takes the next one ahead while the motor
  burns. Turn rate is limited, so a faster motor turns wider.
- It goes off 18 units from a raider's hull (its fuse), or on a rock or
  debris. The blast is a wave running out at 650 a second: a hull within the
  fuse distance takes the full damage, one farther out less, down to the rim
  where the falloff leaves 40% (Shaped warhead 0: 55%, 70%, 85% at levels
  1-3), so the raiders round the one it went off at take the warhead's share
  on average. The wave sets off any missile, either side's, whose toughness
  its damage there beats (yours 30), three deep at most.
- Burnt out, the missile coasts 0.9 s, slowing, then bursts in a small
  harmless wave.

| Level | Seeker head: turn, lock | Rocket motor: top, thrust, burn | Shaped warhead: blast, share |
|---|---|---|---|
| 0 | 2.0 rad/s, 900 m | 760, 1000/s², 1.5 s | 100 m, 60% |
| 1 | 2.7 rad/s, 1050 m | 900, 1300/s², 1.6 s | 125 m, 70% |
| 2 | 3.4 rad/s, 1200 m | 1040, 1600/s², 1.7 s | 150 m, 80% |
| 3 | 4.1 rad/s, 1350 m | 1180, 1900/s², 1.8 s | 175 m, 90% |

Module prices follow the other modules (cost × (1 + 0.48 × level)): Seeker
head 55 / 81 / 108, Rocket motor 50 / 74 / 98, Shaped warhead 60 / 89 / 118;
733 for all nine levels. They wait until you own the launcher.

## Balance: a choice, not an upgrade

The Seeker launcher: medium mount (was heavy), rank Vanguard, 1400 salvage in
the campaign, 390 in the arcade (120 + rating 6 × 45); damage 60 every
1.05 s, tier +22% per level like every gun.

| Gun | Mount | Price | Damage per second at tier 1 | Its edge |
|---|---|---|---|---|
| Pulse cannon | light | 0 | 74 | Prism and guided-plasma modules |
| Shard shotgun | light | 220 | 110 within 0.5 km | Swarms up close |
| Ion disruptor | medium | 550 | 80 | Triple damage to shields, slows |
| Lance railgun | heavy | 1100 | 115 | Ignores 75% armour |
| Flux beam | medium | 2600 | 181 | Ignores 40% armour; drains 17 pulse/s |
| Seeker launcher | medium | 1400 | 57 at the raider it fuses on, about +36 to each other within 100 m | Fire and forget, locks past 0.9 km |

- Against one raider it is the weakest gun: 57 a second, less what misses
  (in a stepped test, 60 s against two raiders, about 80% of stock missiles
  hit circling fighters; all hit tanks and lancers). Against a squadron of
  three in its blast it does 57 + 2 × 36 = 129, past the railgun's 115.
- The fuse and the wave kept that: into the same squadron of five (stepped,
  60 s, 116 missiles) a stock missile dealt 62 before and 65 after, all
  modules 75 before and 81 after. Darts and seekers that fly into your wave
  go off with it.
- It hits without the turret having to lead the target, and with the Seeker
  head it fires from 1.35 km while guns stop at 0.9 km; a missile still
  takes about 1.3 s to get there, and the target can turn away.
- Hotter plasma adds 5 a shot to every gun: 26 a second on the pulse cannon,
  5 on the launcher. The launcher grows through its own warhead instead.
- Medium, it shares a mount with the ion disruptor and the flux beam, so a
  medium mount is a choice of shields, burst or crowds; on a gunship or
  cruiser the heavy mount stays for the railgun.
- Arcade income per world is about 270 (Haven: 45 raiders × 76% × 2, + 80
  bonus, + 120 flagship), 400 by Dustfall, 545 by Obsidian. The launcher is
  bought after the first world; all three modules take about two more
  worlds, as five levels of Hotter plasma (372) plus Prism (186) do for the
  pulse cannon.
