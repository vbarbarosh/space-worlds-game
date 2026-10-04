# World Explorer: where things stand

The rules that place the station, the world gates and the portals in every
world, campaign and arcade, and the things placed round them. Each rule has
its reason and the number `bin/map-check` enforces (marked *checked*). A map
that breaks one fails the check; the generator follows them, and a portal
pair that cannot is left out rather than squeezed in.

## What R and a ring reach

Every thing you act on has a range, taken from the code:

| Thing | Acts when | Range from its centre |
|---|---|---|
| Station | R docks (the arcade's depot) | 750 m (`station_reach`; hull 500 m) |
| World gate | R jumps | 155 m (`gate_reach`) |
| Portal | your hull touches its ring | 71 m (ring 46 m + the widest hull, 25 m) |
| Survey beacon | it scans a ship | 120 m |

- **Two ranges never touch: 150 m between them at least.** One key must
  have one meaning; a gate in the docking range left R guessing. So the
  station and a gate stand 1055 m apart at least, a gate and a portal 376 m,
  two portals 292 m. *Checked.*
- **R picks in a fixed order** where ranges would meet: the arcade only
  docks; the campaign docks if the station is in reach, else jumps through
  the first gate in reach (list order, not the nearest), else sets a course
  to the station (`interact`, `src/js/navigation.js`). The rule above keeps
  that order from ever mattering.

## The station

- **At the map's centre**, one per world. Every flight starts and ends
  there, so the rest is measured from it.
- **Its shelter (900 m) holds no portal, gate or fight.** The space round
  the berths is for docking traffic. *Checked* through the rules
  below.

## World gates

- **A gate faces the world it leads to, as the galaxy chart draws it**
  (`galaxy_bearing`, `src/js/charts.js`). The gate to Verdant is up and
  right in Haven because Verdant is up and right on the chart; you find a
  gate without looking. Within 10°. *Checked.*
- **60% of the way from the station to the map's edge** along that bearing.
  A gate is a journey, not a doorstep, and still well inside the map. At
  least a quarter of the map's smaller side from the station (Haven: 2.5 km
  in the campaign, 1.4 km in the arcade) and 1 km from every edge. *Checked.*
- **One portal beside it at most** within 1 km: the one that serves it.
  Two rings by a gate read as clutter and hide which one goes where.
  *Checked.*
- Where: `world_gates` in `visual_base_generate_map`, `src/js/campaign.js`.

## Portals (jump pairs)

A pair crosses a big distance: fly into one end, leave by the other.

- **The ends are far apart: 2 km, or a quarter of the map's smaller side if
  that is more.** A jump costs a few seconds of tunnel; a shorter pair saves
  nothing and only crowds the map. *Checked.*
- **Every end 1.5 km from the station's centre** (1 km beyond its hull).
  Near enough to reach in seconds after undocking, far enough that a ship
  leaving its berth never flies into a ring. *Checked.*
- **Two portals of different pairs stand 1 km apart.** Neighbouring rings
  look like one place and swap your destination. *Checked.*
- **300 m inside the map's edge**, so the exit point (125 m in from the
  ring) is always in space. *Checked.*
- **Each end leads somewhere worth reaching:**
  - three crossings for every world: corner to corner (A: 10%, 12% to 90%,
    88%; B: the other diagonal) and edge to edge (C: 7% to 93% of the
    height);
  - in worlds 55 km wide or more, survey beacon 1 to beacon 3 (G) and a long
    diagonal (H);
  - the station's pairs: one end 1.5 km out toward a world gate, the other
    440 m beside that gate (D, E, F); a world with two gates gives F to the
    first beacon that fits; Haven has only D.
- **Placed in that order, and a pair that breaks a rule is left out.** The
  arcade's map (7.2 × 5.6 km) is too small for the station's pairs to save
  a flight, and its gates do nothing, so it has the three crossings only.
- Where: `configure_expedition_portals`, `src/js/expedition.js`.

## Round them

- **Survey beacons stand 1 km from every gate**; a beacon that would not
  takes its spot mirrored across the map's centre lines. A scan on a gate
  would read as one place. *Checked.*
- **The combat zone** (elite, boss and recover stages; campaign only) **1 km
  from every gate and portal and from the shelter's edge** (1.9 km from the
  station), its spot or the spot mirrored. A flagship waiting on a gate
  blocks it. *Checked.*
- **No gravity well pulls inside any range above** (its radius plus the
  range). A jump or a docking must never start in a pull. *Checked*;
  placed by `place_gravity_wells`, `src/js/gravity.js`.
- **Rocks and drifting debris leave a ship's width (50 m) round the station's
  hull, a gate's or a portal's ring and a beacon**; the rocks of a field that
  would not are left out. A solid in a ring stops the ship short of it.
  *Checked.*
- Built structures keep the code's own distances: a defence platform 1.1 km
  from the station, 700 m from a gate, 300 m from a portal; an outpost on a
  mining field (`structure_spot_ok`, `src/js/structures.js`). Storm and flare
  zones keep 200 m beyond their edge from a gate (`src/js/environment.js`).
