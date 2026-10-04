# World Explorer: design principles

Rules the game keeps everywhere. A new feature follows them, and a change that
breaks one changes this file first.

## What a shot hits, a ship crashes into

A thing in space is either solid or background, and you can tell which at a
glance.

- **Solid:** asteroids and ore rocks, drifting debris and wrecks, built outposts
  and platforms, the convoy's freighter, every hull (yours and the raiders').
  Shots stop on them, and ships collide with them: a hit pushes the ship off,
  and above cruising speed it costs hull.
- **Background:** scenery rocks, wrecks and satellites drawn dim behind the
  world. Shots and ships pass through them, and they never look like the solid
  things.
- **Everyone follows it:** raiders collide with the same things you do, and
  with each other, and steer round what lies ahead. No two hulls overlap.
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
- Today, where the code keeps it and where it does not:
  - **Raiders:** solid, damaged by shots, a bar over the hull once hit, a
    shield ring while they have shields. A flagship has the bar at the top
    of the screen instead (`#bossbar`). The Leviathan of the lure mission is
    the one hull guns cannot hurt (`damage_enemy` in `src/js/operations.js`);
    only a black hole's core takes it.
  - **Ore rocks:** solid in both modes. In the arcade your shots break them
    (`damage_ore`) and a broken rock drops salvage. In the campaign your shots
    stop on them and do no damage: rocks are the drones' work, and a drone
    takes units from a reserve (`ore_chip` in `src/js/deposits.js`), not from
    the rock's hp. In Dustfall and Obsidian (world rule `solid`) raiders' shots
    take hp off a rock (`block_hostile_ore` in `src/js/flight.js`). The bar
    (`ore_hp_bar` in `src/js/surfaces.js`) shows the rock's hp once it is below
    full, so in the campaign it shows only after raider fire; what a rock still
    holds shows as the field's label (`field_reserves_text`).
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
- Open question: should ore rocks be shot apart in the campaign as they are
  in the arcade, and if a rock both holds ore and can break, does it show two
  bars (hull and reserve) or one? Not decided yet.
- Where it lives: `src/js/update.js` (your shots against raiders, rocks and
  drifting debris), `src/js/surfaces.js` (raiders' and rocks' bars),
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

## The arcade is tuned on its own; the campaign stays as it is

The arcade gets the extra feel (shake, slow motion, chain blasts) and its own
difficulty; none of that changes the campaign's rules.

- Every arcade number is read through `arcade_mode()` and applies only while
  `arcade.active`; the campaign never reads `arcade_modes`.
- An arcade run starts from a checkpoint made up on the spot and puts the
  campaign's checkpoint back after (`arcade_start`); an arcade save is a slot
  of its own (`arcade_snapshot`, `src/js/saves.js`).
- Arcade-only effects: a kill shakes the screen by the size of what died
  (`arcade_kill_shake`), a flagship's death plays at 30% speed for a moment
  (`arcade_time_step`), and a ship that explodes hurts what is close to it
  (`arcade_blast_from_kill`).
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
