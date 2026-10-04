# World Explorer: objects in space

Every kind of thing a world holds, and why it is there. Every object should
have a purpose for the player: something to do with it, or something it does
to you. The ones the code gives no purpose yet are listed at the end.

"Solid" follows [principles.md](principles.md): a solid thing stops shots and
ships. "Modes" is arcade, campaign or both.

## The world's frame

### Station (the main base)

- The central point of the world, one per world: you dock there, repair, buy,
  sell at the exchange, take and collect contracts. Most movement in a world
  starts and ends there.
- In the campaign the space round it is a shelter (see
  [principles.md](principles.md)); docking repairs and saves. In the arcade it
  is the depot (R), shielded while raiders are near.
- Not solid: ships fly over its drawing. Cannot be damaged.
- Both modes, every world. Where: `station`, `station_size`,
  `station_shelter` in `src/js/worlds.js`; `dock_station` in
  `src/js/station.js`; `src/js/docking.js`; `src/js/depot_shield.js`.

### World gates

- Gates to another world: R beside one jumps there once your ship meets the
  destination's needs (weapons, defence, radiation; `allowed_world`). Each
  world has two or three (`world.links`). A gate faces the world it leads to,
  as the galaxy chart draws it, well away from the station
  ([placement.md](placement.md)).
- Not solid, cannot be damaged.
- Campaign. The arcade draws them but they do nothing there: the arcade moves
  on to the next world from the depot.
- Where: `world_gates` in `visual_base_generate_map`, `src/js/campaign.js`;
  `interact` in `src/js/navigation.js`; the jump in `src/js/teleport.js`.

### Portals (local gates)

- Cross big distances fast: a pair of gates, A1 and A2, in one world; fly into
  one and you leave the other. Both ends stand far apart, never by the
  station, and a pair that cannot keep the rules of
  [placement.md](placement.md) is left out; the arcade's small maps keep six
  portals. The guide's route uses them, and raiders take them too.
- Not solid, cannot be damaged.
- Both modes. Where: `configure_expedition_portals` in `src/js/expedition.js`;
  `update_player_navigation` in `src/js/map.js`; `enemy_waypoint`.

### Beacons

- Three per world: the places of scan stages (the survey robot scans beside
  one), survey contracts, and the defend relay.
- Not solid, cannot be damaged.
- Drawn in both modes; used only in the campaign.
- Where: `beacons` in `src/js/campaign.js`; `operation_point` in
  `src/js/operations.js`; `src/js/survey.js`.

### Combat zone

- The point where elite, boss and recover stages happen; the flagship of a
  boss stage waits there.
- Not drawn unless a contract uses it. Campaign.
- Where: `combat_zone` in `src/js/campaign.js`; `src/js/navigation.js`.

## Rock and debris

### Ore rocks (asteroids in mining fields)

- What ore is mined from. Twelve fields of nine rocks per world; every third
  field is rich and holds the world's resource. In the campaign your drones
  (H) drill them and carry the units to your hold; in the arcade your shots
  break them for salvage.
- Solid. In the arcade your shots damage them; in the campaign your shots stop
  on them without damage (see the open question in
  [principles.md](principles.md)). A bar shows once a rock is below full hp.
- Both modes, every world. Where: `base_generate_map` in `src/js/map.js`;
  `src/js/deposits.js` (the reserve), `src/js/mining.js`, `src/js/drones.js`;
  `resolve_solid_ore` in `src/js/flight.js`.

### Drifting asteroids and wrecks

- Moving obstacles: they raise the difficulty a little and add noise, so
  flying is more interesting. A hit costs hull; your shots break them, and
  the turret shoots one drifting at you when no raider is near. A broken one
  leaves a little salvage (2).
- Solid for you, not for raiders or their shots. Damageable, no bar.
- Both modes, every world; 64 placed per world round the station, gates,
  beacons and fields. Where: `generate_drifting_debris`,
  `drifting_debris_hit` in `src/js/expedition.js`.

### Caches

- Salvage lying in space: 22 per world, each five artifacts and a repair kit,
  energy cell or repair. Taken ones stay taken in the campaign (saved per
  world).
- Pickups, not solid. Both modes. Where: `base_generate_map` in
  `src/js/map.js`; `store_world` in `src/js/campaign.js`.

### Pickups

- What raiders and rocks drop: artifacts (salvage), repairs (+18 hull),
  energy (+25 pulse), supplies (repair kit, EMP, stasis), and in the campaign
  cargo. The magnet module pulls them in.
- Both modes. Where: `drop_pickup`, `collect_pickup` in `src/js/upgrades.js`;
  `cargo_spill` in `src/js/resources.js`.

## Forces

### Black holes

- A danger to steer round, and a tool: they pull ships in, and the core kills
  a ship at once, shields or not. The lure mission uses one to destroy the
  Leviathan. Four per world, six from Ion Reach, eight from Nova Forge;
  Eclipse pulls at 210%.
- Not solid; not damageable. Both modes. Where: `base_generate_map` and
  `fatal_gravity` in `src/js/map.js`; `src/js/gravity.js`; `src/js/lure.js`.

### Storm and flare zones

- Ion Reach storms: inside an active one, pulse charges +14 a second and the
  shield loses 12 a second. Nova Forge solar flares: heat +15 a second and a hit
  of 10 every second. Both warn before they turn on; up to four per world.
- Not solid. Both modes in those two worlds. Where: `generate_environment`,
  `zone_state` in `src/js/environment.js`; `src/js/flight.js`.

### Currents and planetary pull

- Verdant's currents carry ships, raiders and pickups; Obsidian's planet pulls
  ships within 2.1 km, less for hulls with more traction.
- Where: `world_flow` in `src/js/environment.js`; `src/js/flight.js`.

### Radiation

- A field over the whole of Ion Reach, Obsidian, Nova Forge and Eclipse that
  wears down the ship's radiation shield and then the hull, unless the lining
  is good enough. Arcade radiation is 35% of the campaign's.
- Where: `expedition.radiation` in the world files; `src/js/expedition.js`.

## Ships

### Raiders

- The world's faction: they attack you, your structures and your freighters.
  Five types (chaser, tank, shooter, splitter, lancer) plus a splitter's
  shards; numbers in [balance.md](balance.md).
- Solid, damageable, a bar once hit, a shield ring. Both modes.
- Where: `src/js/combat.js`, `spawn_enemy` in `src/js/campaign.js`,
  `src/js/navigation.js`, `src/js/update.js`.

### Elites and flagships

- Tougher raiders to hunt: elites lead arcade squadrons and are the targets of
  elite stages; a flagship ends each arcade world and each boss stage.
- Solid, damageable; a flagship's bar is at the top of the screen. Both modes.
- Where: `src/js/arcade.js`; `spawn_operation_enemy` in
  `src/js/operations.js`.

### The Leviathan

- The lure mission's beast: guns cannot hurt it; lead it into a black hole.
- Solid, not damageable by shots. Campaign, Haven. Where: `src/js/lure.js`.

### The convoy's freighter

- What escort stages protect: it loads at a mining field and unloads at the
  station; raiders strike at the stops. G flies you in formation behind it.
- Solid; raiders damage it (300 hull, shown as a label). Campaign.
- Where: `update_escort` in `src/js/operations.js`; `src/js/formation.js`.

### The transport line's ship

- Your own freighter: it collects ore from your outposts and sells it at the
  station, with two turrets of its own. Raids come for it.
- Not solid; raiders damage it (900 hull, a bar). Campaign.
- Where: `src/js/transports.js`.

### Drones

- Mining drones (H) drill rocks and carry the load home; two in the bay, four
  on the Mule Prospector. Orbit drones (a module) circle you and shoot. The
  builder drone builds what you place with K. The survey robot scans at a
  beacon while you guard it (80 hull, a bar).
- Mining drones, the builder and the robot: campaign. Orbit drones: both.
- Where: `src/js/drones.js`, `src/js/structures.js`, `src/js/survey.js`,
  `src/js/render.js` (orbit drones).

## What you build (campaign)

### Mining outpost

- Stands on a mining field; its two drones mine the rocks into a store of 60
  that you or a transport line collect.
- Solid; raiders damage it (220 hull, a bar). Where: `structure_kinds` in
  `src/js/structures.js`.

### Defense platform

- A heavy turret that fires at raiders within 480 m.
- Solid; raiders damage it (280 hull, a bar). Where: `src/js/structures.js`.

## Background

### Planets and moons

- Each world has its planet ("PRIME") and an outer moon, drawn in the sky.
  Obsidian's planet pulls ships (above); elsewhere they are scenery.
- Background, not solid. Where: `generate_environment` in
  `src/js/environment.js`; `src/js/world_visuals.js`.

### Scenery rocks and wrecks

- 260 + 8 × the world's `wave` dim shapes behind the world; ships and shots
  pass through.
- Where: `base_generate_map` in `src/js/map.js`; `render_map` in
  `src/js/surfaces.js`.

### Satellites

- In Haven only (the one world with satellite drawings), every fourth scenery
  item is a satellite, faded and turning slowly.
- Where: `render_map` in `src/js/surfaces.js`;
  `src/sprites/worlds/haven/satellite-*.svg`.

## No purpose yet

What the code draws or places without giving the player anything to do with
it. Each has a suggestion, only a suggestion.

- **Satellites** (Haven): decoration only; nothing touches them and they do
  nothing. *Suggestion:* a satellite in range charts the map round it (as the
  map's fog of war is cleared today), so Haven teaches charting.
- **Scenery rocks and wrecks:** decoration only, kept dim so they never pass
  for solid things. *Suggestion:* none needed beyond depth, or let a scenery
  wreck hold a cache marker so the eye has a reason to look.
- **Planets and moons** outside Obsidian: decoration only. *Suggestion:* a
  planet gives a slow gravity assist (a speed boost along its rim), so the
  sky is a route too.
- **World gates, beacons in the arcade:** drawn but unused; the arcade jumps
  from the depot and has no scans. *Suggestion:* the arcade's next-world jump
  goes through the gate (fly in after the depot), and a beacon gives a short
  buff while you hold beside it.
- **The station's drawing as a body:** it is not solid, so ships fly over a
  1 km structure, against the rule that what looks like an object is one.
  *Suggestion:* make the hull solid outside the docking lane.
