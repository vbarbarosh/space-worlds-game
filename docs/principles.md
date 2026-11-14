# World Explorer: design principles

Rules the game keeps everywhere. A new feature follows them, and a change that
breaks one changes this file first.

## What a shot hits, a ship crashes into

A thing in space is either solid or background, and you can tell which at a
glance.

- **Solid:** asteroids and ore rocks, Dustfall's cliffs and their rubble (arcade),
  Verdant's brood nests (arcade), Obsidian's magnetic spires, drifting debris and wrecks, built outposts and platforms, the convoy's
  freighter, every hull (yours and the raiders'). Shots stop on them, and ships
  collide with them: a hit pushes the ship off, and above cruising speed it
  costs hull.
- **Background:** scenery rocks, wrecks and satellites drawn dim (8%) behind the
  world. Shots and ships pass through them, and they never look like the solid
  things. The same drawings far off (`src/js/sky_far.js`) are smaller than any
  rock, fainter than any hull and slide past slower than the world, and none
  of them is one that, small and faint, passes for salvage, a mine, a shot or
  a field's ring.
- **Everyone follows it:** raiders collide with the same things you do, and
  with each other, and steer round what lies ahead. No two hulls overlap.
- A cliff is a rock of `ore_nodes` (type `cliff`), drawn in full colour with a
  dark outline and a cast shadow, larger than any rock, so it can never pass for
  the dim scenery; its fall zone is drawn on the ground, not as a body.
- A brood nest is a rock of `ore_nodes` too (type `brood_nest`), drawn the
  same way, in full colour with a dark outline and a cast shadow. Burnt, it
  leaves a husk drawn flat and dim with no outline, as the background is:
  nothing stops on it (`src/js/arcade_nests.js`).
- **Fields** are neither: a black hole's pull, Ion Reach's storms, and its arc
  pylons and charge fields act on a ship inside a ring drawn round them, and
  ships and shots pass through them. A pylon is drawn as light (a glowing knot
  with no dark outline and no shadow), not as a body, so it never reads as a
  solid you could shoot down (`src/js/ion_pylons.js`).
- A **body with a field round it** is both: Obsidian's magnetic spire is a
  solid (a needle of dark glass with a dark outline and a cast shadow: ships
  crash into it as into a rock, raiders steer round it, every shot stops on
  it, drifting debris glances off it) and its field is a field (a ring with
  lines of force running in: inside it ships are drawn in and shots bent
  toward the spire). Its field bends shots as Eclipse's hole does, so a shot
  fired along a line shown first keeps to it (`src/js/obsidian_spires.js`).
- **In the arcade, blasts shove and crashes bounce** (the author,
  2026-11-01: "the blast wave damages everything near it, my ship too;
  different things blow up with different force; if I collide with someone,
  his speed and course change; raiders that collide push each other and take
  damage"). A blast's front hurts each hull it reaches, less toward its
  reach, and shoves it away by its weight (by area; a tank, bulwark and
  carrier half again, a flagship four times): a drone's pops, a raider's
  throws its neighbours, a tank's or a mine's throws them far, a flagship's
  last clears the area. It sets off the mines it reaches. Your ship and a
  raider that meet bounce apart by speed and weight, the raider's course
  knocked off and its hull hurt by the closing speed (your hull takes the
  ram as before). A raider thrown loose (its shove past 60 m/s) that meets
  another bounces off it and both are hurt; one thrown into a rock or cliff
  is hurt too. Pilots flying together only brush past each other. The
  campaign keeps its rules (`src/js/blasts.js`).
- **In the arcade, ore rocks move when shoved** (the author, 2026-11-01:
  "push them carefully together, then bang, and it all blows up beautifully
  for a good bonus"). A push wave or a blast sets a rock drifting by its
  weight (twice a ship's of its size); rocks that meet bounce, a hard hit
  cracks them, and a rock broken blows up, hurting and shoving what is
  round it. A field at rest does not go up from one rock; rocks your push
  wave moved are loose for 4 s and break at twice the damage, so a herd goes
  up in a chain. A cliff and a brood nest never move (`src/js/rocks.js`).
- Where it lives: `src/js/bodies.js` (what is solid, the separation),
  `resolve_solid_ore` in `src/js/flight.js` (your ship against rocks),
  `block_hostile_ore` (enemy shots on rocks), `src/js/evasion.js` (the
  Evasive thrusters module, which steers round all of it).

## What a ship can crash into, a shot can damage; what can be destroyed shows its health

The author's rule, in three parts: what a shot hits, a ship can crash into;
what a ship can crash into, a shot can damage; whatever can be destroyed
shows a health bar (its armour or energy, and how much is left as it is hit).

- The first part is the section above.
- The bar shows what is left of the thing's hull; a shield shows as a ring
  round it.
- Your ship's shield has its own blue gauge beside the hull's, and its ring
  round the ship. Shots, missiles, blasts and an arc pylon's strike hit the
  shield first and the hull only once it is gone; a crash (a raider's ram, a rock, debris, a
  cliff's falling rock) goes past it, straight to the hull
  (`damage_crashes` in `src/js/combat.js`). It mends once 5 s pass with no
  hit, and the gauge glows while it does (`shield_mending` in
  `src/js/helpers.js`). Every ship has one, the Wisp Scout's the smallest
  (15).
- Today, where the code keeps it and where it does not:
  - **Raiders:** solid, damaged by shots, a bar over the hull once hit, a
    shield ring while they have shields. A flagship has the bar at the top
    of the screen instead (`#bossbar`). The Leviathan of the lure mission is
    the one hull guns cannot hurt (`damage_enemy` in `src/js/operations.js`);
    only a black hole's core takes it.
  - **Ore rocks:** solid in both modes, and your guns mine them in both: your
    shots, your missiles and the pulse all land on a rock through one door
    (`damage_ore`). In the arcade a hit takes the rock's hp, and a broken rock
    drops salvage. In the campaign a hit cuts it (`ore_cut` in
    `src/js/deposits.js`): a rock holds a reserve of units, every 250 of
    damage frees one, and each unit goes into the hold at once and counts
    toward a mining stage; with the hold full the rock is still cut and
    nothing is loaded. A rock has one bar (`ore_hp_bar` in
    `src/js/surfaces.js`), shown once it is below full: what is left of the
    rock. In the campaign that is the share of its reserve left, and the rock
    breaks when the reserve is out. In Dustfall and Obsidian (world rule
    `solid`) raiders' shots take the same bar down (`block_hostile_ore` in
    `src/js/flight.js`), and the ore goes with it. What a field still holds
    shows as its label (`field_reserves_text`).
  - **When the guns take a rock:** their own aim turns to a rock only with no
    raider within 600 m, so a fight is never spent on rocks. In the arcade
    that is any rock within 650 m. In the campaign it needs a reason besides:
    the contract you follow is at a mining stage in this world, or the
    guide's marker stands on a mining field (a click on one in the map), or
    you point at the rock, which stays the guns' while the pointer rests on
    it (`mining_aim` and `ore_pointed` in `src/js/mining.js`). In the Races
    mode the rocks stay whole.
  - **Obsidian's magnetic spires:** solid, and nothing damages them: every
    shot stops on one and does it no harm, so a spire has no bar. It is the
    world's rock, the cover the world gives both sides; a spire shot down
    would leave the world without its trick (`src/js/obsidian_spires.js`).
  - **Dustfall's cliffs** (arcade): solid; your shots, the pulse and your
    missiles wear one down to its crack (a quarter left: primed), and the
    crack gives only to the guns aimed at it, so a cliff falls when you mean
    it to. Raiders' shots stop on a cliff and do not wear it, unlike
    Dustfall's ore rocks. A bar over it once hit, orange once primed.
    Broken, it rumbles 0.6 s and falls along its zone; its rubble are ore
    rocks with their own bars (`src/js/arcade_cliffs.js`).
  - **Verdant's brood nests** (arcade Free): solid; your shots, missiles and
    pulse and every blast burn one, and raiders' shots stop on it and do it
    no harm. A bar over it once hit, and its glowing sacs go out one by one
    as it burns. Burnt, it bursts and leaves a husk
    (`src/js/arcade_nests.js`).
  - **Drifting asteroids and wrecks:** they hurt your ship when you hit them,
    and your shots break them (`drifting_debris_hit` in
    `src/js/expedition.js`), but they have no bar. Raiders and raiders' shots
    pass through them: they are not among the solid bodies of
    `src/js/bodies.js`.
  - **Outposts and defense platforms** (campaign): solid, a bar always shown.
    Raiders' shots and rams damage them; your own shots pass through.
  - **The convoy's freighter** (campaign): solid, 300 hull, shown as a label
    ("FREIGHTER · n hull"), not a bar. Raiders damage it; your shots pass
    through.
  - **The transport line's ship** (campaign): a bar always shown; raiders
    damage it; it is not solid, and your shots pass through.
  - **The survey robot** (campaign): a bar always shown; raiders damage it.
  - **A ring race's rivals** (campaign and the Races mode): solid (they
    bounce off rocks and bump you and each other), raiders' shots and rams
    damage them, a bar once hit; your shots pass through them, and they never
    shoot (`src/js/race.js`).
  - **World guards** (campaign): solid, a bar once hurt, a shield that mends.
    Raiders' bolts and missiles damage them. Your guns' own aim passes over
    them, as over every friendly hull; a shot you aim with the pointer, or
    any shot once the wing fights you, hits them: they are the world's, not
    yours, and the outlaw's way goes through them (`src/js/guards.js`).
- Where it lives: `src/js/update.js` (your shots against raiders, rocks and
  drifting debris), `src/js/deposits.js` (a campaign rock's reserve and its
  cutting), `src/js/surfaces.js` (raiders' and rocks' bars),
  `src/js/structures.js`, `src/js/transports.js`, `src/js/survey.js` (their
  bars and damage), `update_escort` in `src/js/operations.js`.

## Every action is a button that shows its key

A key is a shortcut, never the only way. Whatever a key does, a button on the
screen does too, and the button shows the key.

- The HUD has a button for each flight key: R dock or jump, J map, Q E F
  supplies, H drones, K build, G formation, B brake, Space pulse, Shift turbo.
- A button made in code takes its key as a chip: `ui_button({label, key})` in
  `src/js/ui.js`, e.g. Collect reward [C] on a station contract.
- The pause screen lists every key with what it does.
- Today the inventory (Tab), pause (P, Esc) and zoom (+, −) buttons name
  their key only in the tooltip, and M (sound on or off) has no button that
  shows it.
- Where it lives: `src/html/hud.html` (the buttons), `src/js/controls.js`
  (the keys), `src/html/pause.html` (the key list).

## A world's map is the same every visit

Where things are in a world is fixed, so a pilot can learn it.

- The map of a world is drawn from a generator seeded by the world's threat
  level (`wave`): scenery, black holes, mining fields and rocks land in the
  same places every time. Drifting debris starts from a seed of its own per
  world.
- What the player changes is kept: rocks mined and caches left are saved per
  world in `campaign.maps` (`store_world` in `src/js/campaign.js`).
- Where it lives: `base_generate_map` in `src/js/map.js`,
  `generate_drifting_debris` in `src/js/expedition.js`.

## Effects have their own dice

An explosion never changes what the game decides.

- Explosions take their randomness from a generator of their own
  (`explosion_random` in `src/js/explosions.js`), so a bigger or a smaller
  effect leaves drops, spawns and raider types as they were.
- The arcade finale's stars and fireworks come from a seeded generator too,
  so they are the same every time (`finale_random` in
  `src/js/arcade_finale.js`).
- Today the particle bursts (`burst` in `src/js/combat.js`) and the screen
  shake (`render` in `src/js/render.js`) still draw from `Math.random`.
- Where it lives: `src/js/explosions.js`.

## An area effect travels

A wave you release touches each thing when its front arrives, never before,
so the eye sees the wave do the work.

- The pulse (Space), the EMP (E), stasis (F) and the arcade's push wave (V)
  are rings that run out from the ship to their reach. A raider, rock or shot is hit, cleared or slowed as
  the front reaches it, and a raider it kills blows up a moment after.
- Each keeps its own numbers and colour: the pulse is weaker with range and
  chains through its kills, the EMP deals the same all the way out, stasis
  only slows, the push wave only throws (slower than what it throws, so the
  raiders it throws crash into the ones it has not reached yet).
- A missile's blast travels too: its wave hurts each hull as the front
  reaches it, less toward the rim, and sets off the missiles it reaches
  (`missile_waves_update` in `src/js/missiles.js`). So does every blast of
  the arcade: a dying ship's, a mine's, a vent's (`blasts_update` in
  `src/js/blasts.js`).
- A cliff's fall (arcade Dustfall) runs down its zone from the cliff's foot at
  2 km/s: each raider, you and each piece of rubble are hit or land as the
  front gets there (`cliff_fall_update` in `src/js/arcade_cliffs.js`).
- Where it lives: `src/js/pulse.js` (`pulse_fire`, `emp_fire`,
  `stasis_fire`, `stasis_scale`), `use_supply` in `src/js/upgrades.js`.

## The arcade is tuned on its own; the campaign stays as it is

The arcade gets the extra feel (shake, slow motion, chain blasts) and its own
difficulty; none of that changes the campaign's rules.

- Every arcade number is read through `arcade_mode()` and applies only while
  `arcade.active`; the campaign never reads `arcade_modes`.
- An arcade run starts from a checkpoint made up on the spot and puts the
  campaign's checkpoint back after (`arcade_start`); an arcade save is a slot
  of its own (`arcade_snapshot`, `src/js/saves.js`).
- In the arcade a fight's numbers follow the run's step (`arcade_level`, the
  worlds flown before), not the world's index: the worlds come in an order the
  player chooses (`src/js/arcade_route.js`), and a world keeps only what makes
  it itself (map, rules, its raiders' gun, flagship's attacks). Outside
  the arcade `arcade_level()` is the world's index, and a card's factors
  (`arcade_card_k`) are all 1.
- Arcade-only effects: a kill shakes the screen by the size of what died
  (`arcade_kill_shake`), a flagship's death plays at 30% speed for a moment
  (`arcade_time_step`), and a blast hurts and shoves what is close to it,
  and ships that crash bounce apart (`src/js/blasts.js`, below).
- A world of the arcade plays its own way, not only by its numbers: Eclipse
  is the gravity world. Its hole bends every shot's way, yours and the
  raiders', but a shot fired along a line shown first (a flagship's lanes, a
  marksman's aim) keeps to it, so a tell never lies; a close pass slings your
  ship past cruise for a moment; raiders steer out of its pull, but one
  closing on you forgets it and is pulled harder, and one the core takes is
  your kill (`src/js/arcade_gravity.js`). The campaign's holes pull as
  before.
- The pulse's chain rings are the pulse's own, in both modes; their score
  (×(1 + 0.5 × depth)) is arcade-only, and like your shots the pulse and its
  chains break ore rocks only in the arcade (`src/js/pulse.js`).
- Where it lives: `src/js/arcade.js`.

## A station is a shelter

In the campaign, the space round a station is safe, so a pilot always has a
place to fall back to.

- Within `station_shelter` (the station's half size plus 400 m): no radiation,
  no new patrols while you are inside, no mining fields, and raiders are
  pushed out. A defense platform stands at least 200 m beyond it.
- Docking repairs the hull, restores the shield, refills the turbo, clears
  the radiation dose and saves the flight (`dock_station` in
  `src/js/station.js`).
- Not for a Wanted pilot: that world's station refuses docking and its guards
  attack on sight; the shelter is a neighbour's station, where the fine is
  paid ([goals.md](goals.md#reputation)).
- The arcade has no shelter. Its depot raises a shield while raiders are near
  and opens only once they are cleared (`src/js/depot_shield.js`).
- Where it lives: `station_shelter` in `src/js/worlds.js`; its uses in
  `src/js/navigation.js`, `src/js/expedition.js`, `src/js/mining.js`,
  `src/js/structures.js`.

## One scene, one camera

The game is one view of one world.

- `render()` in `src/js/render.js` draws the world once a frame on one canvas
  (`#arena`) through one camera and one zoom; there is no second camera or
  split view.
- Ships are drawn from one set of drawings, `src/sprites/3d/`.
- The map (J) and the minimap are charts of the same objects, not another
  scene.
- Where it lives: `src/js/render.js`, `src/js/sprites.js`.

## The middle of the screen is for flying

The ship and the way ahead are in the middle of the screen; the HUD keeps to
its edges and says each thing once, in the least room and for the least time.

- **News** (`show_toast`) is one line under the readouts, one message at a
  time: a burst waits its turn, danger first; the same title again joins the
  one shown (×2, amounts added); a newer word on the same subject replaces an
  older one. A message stays long enough to read, 1.6 to 3.5 s, shorter while
  others wait. Danger is red, its dot blinks.
- **Banners** (a world's arrival, a goal's step) come under the news line,
  smaller and for 3 s; the news waits while one shows, all but danger.
- **The mission card** is two lines: the step, then its distance, arrow and
  a word on it, with the step's key ([T], [R]) as a button. ⓘ (I) unfolds
  the world, the step's kind, the buttons, the contract and goal tracks.
- **Nothing says twice what the HUD already shows:** no toast for a wave's
  start or end (the card says it), no threat chip (the card's distance turns
  red with the raiders near), no EMP or Repair on the card (the quick bar has
  them).
- **The minimap** is small and see-through, fainter still while a raider
  flies under it; Hide folds it. Near a ring race it shows the course.
- **A race's standings** are a small board under the minimap (in its place
  when it is hidden, under the one-line card on a narrow window): place,
  name and rings, your row lit; the news line leaves it room.
- **Text in the world** (`label` in `src/js/combat.js`) does not pile up: the
  same text close by starts again, amounts of the same thing add up (+6 and
  +4 make +10), another text stands a line above.
- **A view that moves on its own** (a race's, an arcade Scroll lane's) never
  puts the ship under a block of the HUD: where it would come under one, the
  ship slides out toward the middle of the screen (`race_view_place`).
- No setting for any of it: one HUD, as clear as it can be.
- Where it lives: `src/js/hud.js`, `src/css/hud-ui.css`, the layout section of
  `src/css/ui-kit.css`; `bin/layout-check` holds the crowded screen (`crowded`:
  an arrival in a fight with a burst of news) to it.
