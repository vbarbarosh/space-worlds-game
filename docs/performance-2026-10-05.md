# World Explorer: performance, 5 October 2026

Where a frame's time goes, in every world, in calm flight and in a heavy
fight, at zoom 100% and 50%; what was changed to make the game smooth and
what each change bought, with screenshots compared pixel by pixel. Build: commit
64c9626 and the changes listed below.

## How it was measured

`bin/perf` plays scenes of `build/index.html` in headless Chromium
(Playwright) at a window of 1920 × 1080, at device pixel ratio 2 (the main
case: a 4K screen at 200%; the game caps the ratio at 1.7, so the canvas is
3264 × 1836) and at 1. It works on a copy of the page with a hook inserted
before the script's last line, so the game itself carries no measuring code.
The page runs on a virtual clock of 1/60 s a frame and a seeded
`Math.random`; the menu's clocks and seeds are reset when a scene starts, so a
scene is the same frame for frame on every run and every build (two runs give
identical canvases). Each scene is played 240 frames without drawing, drawn
60 more, then measured over 300 frames (5 s of game time).

| Scene | What happens |
|---|---|
| calm-wN | world N (0 Haven … 7 Eclipse), the campaign's scout flying a slow circle by the keys from beside the station |
| fight-wN | the gunship with two missile launchers, a rail gun and two drones; 36 raiders of three times their hull kept in view (all five kinds), the pulse every 2 s and the EMP every 3 s, so chains, explosions, missiles and debris pile up |
| arcade-wN | the arcade's worlds 6–8 in their third wave, the flagship and its squadrons, the pulse and the EMP as in a fight |

Each at zoom 100% (`-z100`) and 50% (`-z50`): 38 scenes. The ship never dies.

What is reported:

- **frame**: the main thread's time inside the game's `frame()`: update,
  drawing (the canvas calls) and the HUD. p50, p95, p99 and the longest of
  300 frames, and how many took longer than 16.7 ms (a missed frame at 60 Hz)
  and 33 ms.
- **GC**: the garbage collections in a trace of the 300 frames (`MinorGC`,
  `MajorGC`), their total and longest pause, and the memory allocated a frame
  (what the collections freed plus what the heap grew).
- **raster**: this machine has no graphics card, so Chromium draws the canvas
  in software, on the same main thread. `--mode=layers` flushes the canvas
  around each drawing pass, so a pass's time includes its raster; on a
  graphics card that work moves to the GPU process, so these numbers rank what
  is expensive to fill and blur rather than predict milliseconds there.
- `--mode=profile`: a CPU and an allocation profile per scene;
  `--mode=shots` and `--compare`: screenshots of the canvas at a fixed frame,
  compared pixel by pixel between two builds.

## What was slow

Ranked by what it costs a frame at ×2, before the changes.

1. **The sky layer in the big worlds.** `render_nebula_layer` drew the
   nebula into a canvas padded by 2.5% of the map's size on every side, for
   the parallax. The maps grow from 12 km (Haven) to 240 km (Eclipse), so the
   layer did too: 1320 × 900 px in Haven, 3335 × 2915 in Obsidian, 6960 × 6540
   (174 MB) in Eclipse, built again on every window resize (428 ms in
   Eclipse). In worlds 5–8 of the campaign that image made Chromium flush the
   canvas in the middle of the frame, at the planet's `drawImage`: **render
   took 20–28 ms every frame, calm or not, and every one of the 300 frames
   went over 16.7 ms** (the worlds 1–4 drew in 1–1.5 ms). Most of the layer can
   never be seen: the camera never goes left of or above the map, and past the
   glow and the clouds the sky is one colour.
2. **The pulse, EMP and chain fronts.** Each front was stroked with
   `shadowBlur = 18`, and the depot's shield ring with 24. A blurred shadow of
   a large circle is a Gaussian blur over its whole bounding box: about 100 ms
   a ring in software and 68 ms in SwiftShader (Chromium's GPU path on the
   CPU), for a ring 300–840 px across at ×2. In the fights it was the largest
   drawing cost by far: `render_pulse_wave` 69 ms a frame of 116 in Haven at
   100%, 54 of 98 in Ion Reach at 50%. On a graphics card it is the same blur
   in a shader over a 4K canvas, once per front per frame, with up to a dozen
   fronts after a pulse chains.
3. **Collisions in a crowd.** `bodies_settle` runs four passes of every raider
   against every rock and every other raider (36 raiders and 108 rocks: about
   18 000 checks a frame), each through `Math.hypot`. Raiders come in many
   shapes (fields added as they fly), so V8 threw the optimized code away 25
   times in 8 s and recompiled `bodies_settle` 34 times; between recompiles it
   ran in a lower tier that boxes every number. In a fight: 2.8 ms of CPU and
   1.5 MB of garbage a frame in `bodies_resolve`, `bodies_settle` and
   `bodies_push_out` alone.
4. **`Math.hypot` everywhere.** V8 does not inline it: every call allocates
   its numbers. In a micro test, a million distances cause 275 minor GCs with
   `Math.hypot` and 13 with `Math.sqrt(dx*dx + dy*dy)`, which is also 2–3
   times faster. `distance()` and `segment_distance()` are called thousands
   of times a frame; 260 KB a frame came straight from the builtin.
5. **Arrays built per object per frame.** `block_hostile_ore` ran
   `ore_nodes.filter()` and a sort for every raider shot every frame (380 KB
   a frame and 0.3 ms in the arcade's Eclipse); each drifting rock built
   `[station, ...portals, ...world_gates]` and a closure every frame.

Together the fights allocated 2.5–2.9 MB a frame: 186–219 garbage collections
in 300 frames, the longest 4–7 ms, which is where the stutter in a crowd
comes from even when the average frame is short.

## What changed

Each item is one commit; the files are listed so they can be staged
separately. Every change but the glow keeps the simulation and the picture
the same: the canvases of all 38 scenes, compared pixel by pixel
(`bin/perf --mode=shots` then `--compare`), differ by at most 1 of 255 on
about 20 pixels (the sky layer's new edge) and, in Eclipse at 50%, by at most
8 of 255 in a 3 px column at the screen's edge where the old layer ended.

1. **The sky layer only as large as can be seen** (`src/js/render_cache.js`).
   `nebula_box()` keeps the part the parallax can bring into view (the camera
   only moves right and down from the map's corner) and the glow and the
   clouds colour; past it the sky is the glow's last colour, filled under the
   layer. The box stays on the old layer's pixel grid, 16 units at a time, so
   the layer renders as before. Eclipse 6960 × 6540 → 1444 × 1235 (174 →
   7 MB), built in 64 ms instead of 428; Obsidian 37 → 6 MB. Worlds 5–8:
   render 20–28 → 1.0–1.3 ms a frame, frames over 16.7 ms 300 → 0 of 300.
2. **Ring glows as gradient rings** (`src/js/draw.js`, `src/js/pulse.js`,
   `src/js/depot_shield.js`; pulse.js also carries one `Math.hypot` of item
   4). `ring_glow()` draws what the shadow drew: the stroke's profile
   convolved with the same Gaussian (σ = shadowBlur/2 canvas pixels, measured
   in Chromium), as a radial gradient of 25 stops over an annulus. A small
   ring, whose shadow is cheap and where the flat profile would be off, keeps
   the real shadow; so do the shield's hit flashes. Look: the pulse and EMP
   fronts mid-flight (frame 90 of a fight) differ by at most 3–4 of 255 at
   ×1 and 8 at ×2, no pixel by more than 8. Cost of a front in software
   raster: `render_pulse_wave` 69 → 12 ms (Haven fight, 100%), 54 → 10 ms (Ion
   Reach, 50%), 25 → 6.5 ms (arcade Eclipse); the depot shield 13 → 10 ms.
3. **Collisions on typed arrays** (`src/js/bodies.js`, `src/js/update.js`;
   update.js also carries two `Math.hypot` of item 4). The settling passes and
   `raider_avoid` read x, y and r from `Float64Array`s filled each frame, not
   from raiders of many shapes, and skip a pair apart along either axis before
   any square root (an exact test). The rocks are loaded again just before the
   raiders move, since a pulse can shrink a mined rock in the frame. The
   player's pass no longer calls `ore_nodes.includes()` for every rock.
4. **`Math.sqrt` instead of `Math.hypot` in the hot paths**
   (`src/js/helpers.js`, `src/js/map.js`, `src/js/missiles.js`,
   `src/js/drones.js`, `src/js/sprites.js`). `distance()`,
   `segment_distance()`, the missile's speed, the drones' flight, a sprite's
   raster size, and in items 2 and 3 the star bend and the shots. The square
   root rounds differently in the last bit: two pixels in one scene of 38
   differ after 300 frames.
5. **No arrays per shot or rock** (`src/js/flight.js`,
   `src/js/expedition.js`). `block_hostile_ore` finds the nearest rock hit in
   one loop and skips a rock clear of the shot's box; `debris_sanctuary()`
   looks up the station, portals and gates in the old order without building
   an array.
6. **`bin/perf`**, the tool, and this page (`bin/perf`,
   `docs/performance-2026-10-05.md`, `docs/README.md`).

7. **The HUD writes only what changed** (`src/js/hud.js`, `src/js/operations.js`,
   `src/js/update.js`, `src/js/navigation.js`, `src/js/guidance.js`,
   `src/js/world_visuals.js`, `src/js/physics.js`, `src/js/music.js`,
   `src/js/expedition.js`, `src/js/goals.js`, `src/js/arcade.js`). Every 0.12 s
   the HUD's layers wrote about 35 texts and markups whether or not they
   changed, and four of them (act, mission name and phase, navigation status)
   twice, a later layer overwriting an earlier one; each write rebuilds the
   element and costs a style and layout pass. `hud_text()` and `hud_html()`
   now hold the writes until the end of `update_hud` and write only a value
   that differs from the page's (text) or from the last one written (markup,
   while the element still holds the nodes it made). In a fight 35 writes a
   tick fall to 2–6 (the distance, the alert, a changing readout). Script in
   `update_hud` 0.07 → 0.04 ms a frame, style and layout 0.21 → 0.14 ms in a
   fight and 0.09 → 0.00 calm: the tick's spike falls from about 2 to 1.4 ms
   in a fight and from 1.1 to 0.2 ms in calm flight (×2, 300 frames, the same
   scenes before and after). Every element of the HUD reads the same as before
   at frames 30, 97 and 300 of a calm flight, a fight and the arcade
   (`bin/perf --mode=shots` now saves the HUD's text beside the canvas), and a
   driven check moves hull 40 → 100, pulse 43% → Ready, turbo 8.0 s → Ready,
   Dock → Jump at a gate and back at the station.

The missile smoke trails stay as they are. Behind 53 raider missiles in Nova
Forge at 50% they cost 0.5 ms of script and 3.4 ms of software raster a frame,
nearly all of it in the one `arc` and `fill` per puff that the look needs:
building no arrays per trail and caching the ribbon's colours and the sprites'
anchors measured 0.51 → 0.49 ms and was left out. Puff sprites cost more
(1600 puffs: 1.6 ms of script instead of 0.4, and 70 ms instead of 3 in
SwiftShader); one path per colour would draw overlapping puffs once, and they
overlap by most of their size, so the smoke would turn flat and lighter; the
smallest puff, a dart's newest, is about 1 px across at 50% and ×1 (1.7 px at
×2), and dropping it would remove its share of grey. A graphics card batches
such circles into one draw.

Items 3–5 together: in the CPU profile of the Ion Reach fight at 50% the
collision functions fall from 2.8 ms a frame to below the top 30; over the 16
fights, update falls from 2.6 to 1.0 ms a frame, allocation from 2.7 to 0.7 MB
a frame and garbage collections from 202 to 54 per 300 frames.

## Before and after

Main-thread time per frame at ×2 (1920 × 1080 at 200%), in ms, before → after.
Before and after ran side by side on the same machine; the arcade rows come
from a second run, one build after the other. The one long frame of the Verdant
fight after is a major garbage collection of 20 ms.

| Scene | p50 | p95 | p99 | max | >16.7 ms | >33 ms |
|---|---|---|---|---|---|---|
| calm-w0-z100 | 1.5 → 1.3 | 3.0 → 3.0 | 3.9 → 3.7 | 3.9 → 4.4 | 0 → 0 | 0 → 0 |
| fight-w0-z100 | 5.0 → 3.4 | 8.4 → 5.9 | 13.9 → 8.1 | 18.6 → 10.4 | 1 → 0 | 0 → 0 |
| calm-w1-z100 | 1.6 → 1.3 | 2.9 → 3.0 | 4.0 → 4.1 | 6.0 → 6.3 | 0 → 0 | 0 → 0 |
| fight-w1-z100 | 5.0 → 3.0 | 8.4 → 5.3 | 12.8 → 7.0 | 15.7 → 47.6 | 0 → 1 | 0 → 1 |
| calm-w2-z100 | 1.5 → 1.3 | 3.3 → 3.0 | 4.5 → 3.7 | 9.7 → 4.7 | 0 → 0 | 0 → 0 |
| fight-w2-z100 | 5.1 → 2.9 | 8.8 → 5.1 | 11.9 → 7.8 | 13.5 → 12.1 | 0 → 0 | 0 → 0 |
| calm-w3-z100 | 1.6 → 1.5 | 3.2 → 3.3 | 4.3 → 4.5 | 5.2 → 4.6 | 0 → 0 | 0 → 0 |
| fight-w3-z100 | 4.8 → 3.0 | 8.2 → 6.1 | 10.9 → 10.4 | 16.5 → 11.4 | 0 → 0 | 0 → 0 |
| calm-w4-z100 | 25.7 → 1.3 | 40.1 → 3.0 | 44.1 → 3.5 | 47.2 → 6.5 | 300 → 0 | 76 → 0 |
| fight-w4-z100 | 28.0 → 3.5 | 42.0 → 6.3 | 47.2 → 7.6 | 64.1 → 20.2 | 300 → 1 | 90 → 0 |
| calm-w5-z100 | 25.7 → 1.4 | 39.5 → 3.3 | 57.2 → 4.4 | 63.6 → 5.7 | 300 → 0 | 86 → 0 |
| fight-w5-z100 | 28.3 → 3.3 | 41.1 → 5.7 | 45.6 → 9.6 | 49.1 → 10.7 | 300 → 0 | 89 → 0 |
| calm-w6-z100 | 24.4 → 1.7 | 37.2 → 3.5 | 41.1 → 5.2 | 41.7 → 6.7 | 300 → 0 | 44 → 0 |
| fight-w6-z100 | 27.8 → 3.2 | 43.4 → 5.7 | 49.9 → 8.0 | 58.4 → 10.2 | 300 → 0 | 83 → 0 |
| calm-w7-z100 | 25.3 → 1.4 | 38.2 → 3.3 | 39.8 → 5.0 | 40.5 → 6.4 | 300 → 0 | 45 → 0 |
| fight-w7-z100 | 28.2 → 3.2 | 42.9 → 5.8 | 47.0 → 8.7 | 60.3 → 10.3 | 300 → 0 | 80 → 0 |
| calm-w0-z50 | 1.6 → 1.5 | 3.3 → 3.4 | 4.2 → 4.5 | 6.9 → 5.8 | 0 → 0 | 0 → 0 |
| fight-w0-z50 | 5.3 → 3.9 | 8.8 → 6.9 | 12.5 → 8.4 | 13.4 → 26.0 | 0 → 2 | 0 → 0 |
| calm-w1-z50 | 1.7 → 1.5 | 3.7 → 3.2 | 5.6 → 5.7 | 9.5 → 6.2 | 0 → 0 | 0 → 0 |
| fight-w1-z50 | 5.7 → 3.9 | 8.7 → 6.7 | 13.4 → 7.7 | 31.9 → 10.6 | 1 → 0 | 0 → 0 |
| calm-w2-z50 | 1.4 → 1.4 | 2.9 → 3.1 | 3.6 → 3.8 | 7.8 → 4.3 | 0 → 0 | 0 → 0 |
| fight-w2-z50 | 5.2 → 3.6 | 8.6 → 6.3 | 11.7 → 7.9 | 13.5 → 13.2 | 0 → 0 | 0 → 0 |
| calm-w3-z50 | 1.7 → 1.5 | 3.4 → 3.2 | 4.1 → 4.0 | 4.2 → 5.5 | 0 → 0 | 0 → 0 |
| fight-w3-z50 | 4.1 → 3.7 | 6.4 → 7.4 | 8.3 → 11.2 | 11.1 → 11.9 | 0 → 0 | 0 → 0 |
| calm-w4-z50 | 19.7 → 1.5 | 23.3 → 3.1 | 30.8 → 4.1 | 34.1 → 6.8 | 300 → 0 | 1 → 0 |
| fight-w4-z50 | 21.7 → 3.6 | 32.9 → 6.6 | 39.7 → 8.1 | 41.8 → 13.0 | 300 → 0 | 13 → 0 |
| calm-w5-z50 | 19.5 → 1.4 | 22.5 → 2.9 | 31.3 → 3.7 | 32.8 → 8.3 | 300 → 0 | 0 → 0 |
| fight-w5-z50 | 21.9 → 3.7 | 32.8 → 6.2 | 34.4 → 8.7 | 42.8 → 11.9 | 300 → 0 | 9 → 0 |
| calm-w6-z50 | 20.2 → 1.8 | 30.7 → 3.6 | 38.5 → 4.7 | 46.8 → 7.2 | 300 → 0 | 9 → 0 |
| fight-w6-z50 | 22.3 → 4.3 | 33.4 → 7.4 | 36.2 → 10.4 | 43.9 → 11.6 | 300 → 0 | 15 → 0 |
| calm-w7-z50 | 20.0 → 1.7 | 29.9 → 3.5 | 33.9 → 4.3 | 35.7 → 5.5 | 300 → 0 | 4 → 0 |
| fight-w7-z50 | 21.5 → 3.7 | 31.0 → 6.8 | 37.2 → 8.5 | 43.4 → 14.0 | 300 → 0 | 7 → 0 |
| arcade-w5-z100 | 3.0 → 2.3 | 5.1 → 4.1 | 6.8 → 5.6 | 9.9 → 9.4 | 0 → 0 | 0 → 0 |
| arcade-w6-z100 | 3.9 → 3.2 | 6.4 → 5.4 | 7.7 → 7.3 | 11.7 → 7.5 | 0 → 0 | 0 → 0 |
| arcade-w7-z100 | 3.1 → 2.5 | 5.3 → 4.4 | 7.6 → 7.4 | 8.8 → 10.1 | 0 → 0 | 0 → 0 |
| arcade-w5-z50 | 3.6 → 3.0 | 6.3 → 5.3 | 8.3 → 7.6 | 10.7 → 9.0 | 0 → 0 | 0 → 0 |
| arcade-w6-z50 | 4.7 → 4.0 | 8.2 → 6.7 | 9.9 → 11.2 | 10.1 → 12.1 | 0 → 0 | 0 → 0 |
| arcade-w7-z50 | 3.8 → 3.3 | 6.6 → 6.3 | 8.8 → 9.1 | 11.2 → 10.3 | 0 → 0 | 0 → 0 |

Update and render per frame (ms), garbage collections in 300 frames, memory
allocated a frame, and the main thread's whole time a frame with the
software raster:

| Scene | update ms | render ms | GCs | GC ms | longest GC ms | KB allocated a frame | main thread with raster ms |
|---|---|---|---|---|---|---|---|
| calm-w0-z100 | 0.3 → 0.2 | 1.1 → 1.1 | 43 → 33 | 18 → 16 | 0.8 → 0.8 | 291 → 222 | 37 → 36 |
| fight-w0-z100 | 2.8 → 0.9 | 2.4 → 2.5 | 186 → 41 | 85 → 41 | 7.2 → 3.5 | 2502 → 555 | 126 → 57 |
| calm-w1-z100 | 0.4 → 0.3 | 1.1 → 1.0 | 56 → 46 | 23 → 17 | 3.8 → 1.0 | 378 → 318 | 36 → 34 |
| fight-w1-z100 | 2.9 → 0.9 | 2.2 → 2.2 | 199 → 46 | 79 → 44 | 5.5 → 20.2 | 2701 → 612 | 110 → 55 |
| calm-w2-z100 | 0.4 → 0.3 | 1.1 → 1.0 | 55 → 40 | 25 → 16 | 3.1 → 0.6 | 365 → 276 | 36 → 34 |
| fight-w2-z100 | 2.9 → 0.8 | 2.5 → 2.2 | 195 → 48 | 84 → 34 | 5.8 → 6.3 | 2655 → 641 | 114 → 50 |
| calm-w3-z100 | 0.4 → 0.3 | 1.1 → 1.2 | 59 → 47 | 28 → 18 | 3.3 → 0.6 | 394 → 314 | 34 → 35 |
| fight-w3-z100 | 2.7 → 0.9 | 2.3 → 2.3 | 191 → 46 | 79 → 35 | 4.9 → 5.8 | 2592 → 637 | 112 → 51 |
| calm-w4-z100 | 0.5 → 0.3 | 27.9 → 1.0 | 64 → 49 | 31 → 21 | 3.9 → 4.0 | 428 → 329 | 35 → 30 |
| fight-w4-z100 | 2.9 → 1.0 | 27.9 → 2.5 | 202 → 58 | 89 → 51 | 3.7 → 10.4 | 2719 → 731 | 119 → 55 |
| calm-w5-z100 | 0.5 → 0.4 | 28.1 → 1.0 | 64 → 52 | 26 → 24 | 3.0 → 3.7 | 440 → 347 | 35 → 32 |
| fight-w5-z100 | 2.9 → 1.0 | 27.4 → 2.3 | 208 → 52 | 86 → 33 | 5.5 → 4.1 | 2791 → 705 | 104 → 52 |
| calm-w6-z100 | 0.5 → 0.5 | 25.8 → 1.2 | 71 → 59 | 30 → 29 | 3.3 → 3.2 | 485 → 399 | 39 → 40 |
| fight-w6-z100 | 2.9 → 0.9 | 27.8 → 2.4 | 212 → 55 | 92 → 35 | 3.8 → 3.8 | 2826 → 760 | 114 → 57 |
| calm-w7-z100 | 0.5 → 0.4 | 26.3 → 1.1 | 72 → 65 | 28 → 26 | 4.1 → 4.1 | 488 → 411 | 33 → 19 |
| fight-w7-z100 | 2.8 → 1.0 | 27.8 → 2.2 | 202 → 60 | 80 → 51 | 3.6 → 6.5 | 2739 → 698 | 111 → 38 |
| calm-w0-z50 | 0.3 → 0.2 | 1.3 → 1.3 | 47 → 37 | 23 → 20 | 3.9 → 3.2 | 309 → 241 | 35 → 35 |
| fight-w0-z50 | 2.7 → 0.9 | 2.8 → 3.0 | 191 → 43 | 93 → 47 | 6.8 → 8.7 | 2538 → 571 | 83 → 52 |
| calm-w1-z50 | 0.5 → 0.4 | 1.3 → 1.2 | 60 → 50 | 40 → 26 | 6.4 → 3.3 | 398 → 330 | 39 → 37 |
| fight-w1-z50 | 3.0 → 1.0 | 2.8 → 2.8 | 207 → 55 | 89 → 44 | 5.6 → 4.5 | 2799 → 726 | 90 → 55 |
| calm-w2-z50 | 0.4 → 0.3 | 1.1 → 1.1 | 57 → 42 | 27 → 17 | 3.1 → 0.6 | 386 → 287 | 33 → 34 |
| fight-w2-z50 | 2.7 → 0.9 | 2.8 → 2.7 | 199 → 50 | 81 → 41 | 4.3 → 8.0 | 2675 → 672 | 81 → 50 |
| calm-w3-z50 | 0.4 → 0.3 | 1.2 → 1.2 | 61 → 48 | 22 → 25 | 1.1 → 3.6 | 401 → 318 | 34 → 32 |
| fight-w3-z50 | 2.1 → 1.0 | 2.2 → 2.9 | 200 → 59 | 62 → 40 | 3.7 → 4.4 | 2694 → 746 | 66 → 49 |
| calm-w4-z50 | 0.3 → 0.3 | 19.7 → 1.2 | 66 → 50 | 23 → 22 | 2.9 → 4.0 | 449 → 339 | 27 → 34 |
| fight-w4-z50 | 2.2 → 1.0 | 20.9 → 2.7 | 203 → 60 | 71 → 47 | 3.8 → 6.5 | 2731 → 741 | 65 → 49 |
| calm-w5-z50 | 0.4 → 0.4 | 19.5 → 1.0 | 64 → 53 | 22 → 26 | 2.7 → 5.5 | 432 → 353 | 25 → 31 |
| fight-w5-z50 | 2.3 → 1.0 | 20.7 → 2.7 | 219 → 62 | 68 → 40 | 2.8 → 5.2 | 2932 → 798 | 60 → 48 |
| calm-w6-z50 | 0.4 → 0.5 | 21.3 → 1.3 | 74 → 59 | 27 → 26 | 2.7 → 3.9 | 491 → 401 | 31 → 39 |
| fight-w6-z50 | 2.3 → 1.1 | 21.5 → 3.2 | 217 → 63 | 75 → 48 | 4.1 → 4.7 | 2897 → 829 | 68 → 54 |
| calm-w7-z50 | 0.4 → 0.4 | 20.6 → 1.2 | 72 → 65 | 22 → 29 | 2.6 → 4.3 | 486 → 417 | 26 → 20 |
| fight-w7-z50 | 2.1 → 1.0 | 20.2 → 2.8 | 204 → 64 | 62 → 43 | 3.0 → 6.9 | 2752 → 762 | 61 → 36 |
| arcade-w5-z100 | 1.4 → 0.6 | 1.7 → 1.7 | 120 → 45 | 49 → 32 | 4.1 → 4.1 | 1481 → 442 | 99 → 49 |
| arcade-w6-z100 | 1.4 → 0.6 | 2.6 → 2.5 | 118 → 45 | 66 → 38 | 8.4 → 2.8 | 1553 → 581 | 105 → 69 |
| arcade-w7-z100 | 1.4 → 0.7 | 1.8 → 1.9 | 141 → 67 | 51 → 31 | 4.2 → 3.2 | 1707 → 606 | 88 → 48 |
| arcade-w5-z50 | 1.4 → 0.6 | 2.4 → 2.5 | 130 → 53 | 55 → 35 | 2.7 → 3.3 | 1598 → 528 | 83 → 52 |
| arcade-w6-z50 | 1.4 → 0.6 | 3.5 → 3.7 | 129 → 55 | 70 → 54 | 3.1 → 5.6 | 1705 → 721 | 88 → 63 |
| arcade-w7-z50 | 1.5 → 0.7 | 2.4 → 2.7 | 149 → 77 | 63 → 49 | 3.9 → 3.2 | 1825 → 741 | 80 → 56 |

At ×1 (1920 × 1080 at 100%), frames over 16.7 ms of 300 per scene, summed
by kind:

| Scenes | >16.7 ms | >33 ms | worst p99 |
|---|---|---|---|
| calm, 100% | 184 → 0 | 1 → 0 | 28.4 → 7.4 |
| fight, 100% | 478 → 3 | 5 → 0 | 35.0 → 11.6 |
| arcade, 100% | 1 → 0 | 0 → 0 | 11.8 → 11.3 |
| calm, 50% | 8 → 1 | 0 → 0 | 17.3 → 8.4 |
| fight, 50% | 154 → 3 | 1 → 0 | 26.1 → 12.9 |
| arcade, 50% | 0 → 0 | 0 → 0 | 10.7 → 12.3 |

The same at ×2: calm 1200 → 0 and fight 1201 → 2 at 100%, calm 1200 → 0 and
fight 1201 → 2 at 50%; the worst p99 of any campaign scene 57 → 11 ms.

Raster by pass at ×2 (`--mode=layers`, ms a frame, software canvas; the
passes not named are under 3 ms):

| Scene | total | sky layer | pulse fronts | depot shield |
|---|---|---|---|---|
| fight Haven 100% | 116 → 53 | 27 → 24 | 69 → 12 | |
| fight Ion Reach 50% | 98 → 56 | 25 → 27 | 54 → 10 | |
| fight Eclipse 50% | 66 → 31 | 21 → 10 | 31 → 5 | |
| arcade Eclipse 50% | 85 → 82 | 19 → 27 | 25 → 7 | 13 → 10 |
| calm Eclipse 100% | 29 → 18 | 23 → 12 | | |

The software raster numbers wander by a few ms between runs (the arcade's
sky layer and scenery went up while its fronts went down); the fronts and the
Eclipse sky are the changes that hold in every run.

## What is left

- The sky layer, kept at half resolution, is scaled up to the canvas every
  frame: 20–27 ms in software, a single textured quad on a graphics card. The
  depot shield's hex lattice is about 460 separate strokes; one path would
  merge the shared edges and change their brightness, so it stays.
- Smaller garbage: `debris_sanctuary`, `gravity_move` and `in_gravity_core`
  still allocate about 50 KB a frame each (numbers V8 boxes),
  `block_hostile_ore` 170 KB a frame in the arcade's Eclipse.
- The portals' turning arcs keep `shadowBlur`: they are partial arcs, small
  on screen and only near a portal.
- No graphics card here: the numbers that transfer are the script's and the
  garbage collector's. A check on the 4K machine itself would be Chrome's
  Performance panel over a fight at 50% in Eclipse.

## Running it

    bin/build
    bin/perf                                 every scene, frames, ×2
    bin/perf --dpr=1 fight-w7-z50            one scene at ×1
    bin/perf --mode=layers --wrap=render_pulse_wave fight-w3-z50
    bin/perf --mode=shots --label=before     screenshots, then after a change:
    bin/perf --mode=shots --label=after
    bin/perf --compare=before,after

`--page=` measures another copy of the page (a build kept from before a
change). The reports and screenshots go to `data/perf/`, which git ignores.
