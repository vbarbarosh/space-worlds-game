# Feltmere: stand-in art

Every drawing in this folder is a **stand-in**. So are the felt rocket
(`../../3d/ship-rocket.svg`) and the felt raiders and flagship here. Each one
is a piece cut from the concept sheet `game-pieces-v1.png` (2026-10-13, the
piece sheet of the felt world). The final sprites will come from an image
agent and replace these files one for one, under the same names.

Each file wraps the cut-out in an SVG. Inside are:

- an `<image>` holding WebP or PNG as a data URI;
- a few flat polygons of its colours under the image. The 3D view raises its
  models from shapes, and the image hides the polygons in 2D;
- for the station and the rocket, an anchors layer: berths, engines and gun
  marks.

| File | Piece of the sheet |
|---|---|
| asteroid-1..4, debris-rock-1..2, scenery-1, scenery-3 | small, medium and large asteroid |
| asteroid-rich-1..3 | ore (felt berries), alone and on a rock |
| debris-wreck-1..2, scenery-2 | salvage (buttons) |
| planet-felt | the Verdant felt planet |
| star | the felt campfire sun (Feltmere's sun, in place of an outer moon) |
| station | the camper dock, drawn as large as a station |
| space | the knitted swatch, made seamless: the sky's cloth |
| enemy-chaser, -splitter, -shard, -lancer, -shooter, -tank | ladybug, beetle, bee, dragonfly, wasp, tortoise |
| flagship | the stag beetle (The Wool Stag) |
| enemy-split | a small ladybug beside the beetle: a splitter's halves here, the shard (a bee) elsewhere |

The elites have no files of their own. An elite is its plain drawing with a
gold rim, made in `sprite_text` (`src/js/sprites.js`).

These have no felt drawing yet, so the game draws its common look for them:

- the world gate and jump gate;
- the beacon;
- the black hole;
- the hop and warp effects;
- the rocket's 3D model, which falls back to the scout's.
