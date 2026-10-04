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
