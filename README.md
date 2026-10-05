# World Explorer

A space flight, trade and exploration game: eight worlds,
six ship classes, story chapters and frontier expeditions. It runs offline,
with no server.

Two modes:

- **Arcade**: one run through the eight worlds, three waves each, the world's
  flagship in the third. Raiders come in squadrons; elites lead some of them,
  from Haven on (from the second world on Chill); the flagship turns at 66% and 33%. A ship
  that explodes hurts what is close to it. The salvage you collect buys
  repairs, weapons, ships, supplies and modules at the station's depot (R). A cleared world pays a fixed bonus, the weapon
  grows a tier, a cleared screen shows the world's numbers, and the depot opens before the next world. Score, combo and a best score (salvage left at the end scores 10 points each); no
  stations or contracts. A save keeps the score, salvage and gear, and loading
  it starts its world again from the first wave.
- **Campaign**: the stations, contracts, trading and story chapters; see
  [docs/scenario/](docs/scenario/README.md).

The rules the game keeps everywhere (what is solid, and the like) are in
[docs/principles.md](docs/principles.md).
All the documentation is indexed in [docs/README.md](docs/README.md), and
published as a website at https://vbarbarosh.github.io/space-worlds-game/
(Settings → Pages → Source: GitHub Actions turns it on).

## Start

    bin/configure    install dependencies and build
    bin/run          build and open build/index.html in the browser
    bin/build        write build/index.html, build/dev.html and build/agent.html
    bin/captain      the agent's game window and its commands (see below)
    bin/layout-check every screen at twelve window sizes: no HUD block over
                     another, nothing off the window, no text cut; shots and
                     report.json in data/layout-check/, exit 1 on a failure
    bin/build-docs   docs/ as a website in build/docs, with the game from
                     bin/build in play/; published to GitHub Pages on every
                     push to main (.github/workflows/docs.yml)
    bin/perf         frame times, garbage and drawing costs over 38 scenes
                     (every world calm and in a fight, zoom 100% and 50%);
                     see docs/performance-2026-10-05.md
    bin/map-check    every world's map, campaign and arcade, against
                     docs/placement.md: no two things R acts on within reach
                     of each other, gates and portals where the rules put
                     them; exit 1 on a failure

`build/dev.html` is the developer mode: the game with a dev panel. It starts
straight into any world, ship and weapon, and has time controls, cheats,
enemy and target-dummy spawning, live upgrade levels and a sound board. The
scene lives in the URL, e.g. `dev.html?world=3&ship=gunship&weapon=rail`.
`&screen=station-arsenal` (or flight, combat, arcade, pause, menu, map-plan,
...; the list is in src/js/dev/screen.js) opens that screen with the panel
folded. It keeps its own storage and never touches the game's save.

The interface is the designer's UI kit (src/css/ui-kit.css): one root,
`.ui-screen`, is a size container, so every layout rule is an `@container`
query and a small window and browser zoom behave the same. Run
bin/layout-check after any change to it.

## An agent as a player

A coding agent such as Claude Code or Codex can play the campaign as your
rival, in its own world and its own window. Open the window on your machine,
then start the agent, inside ai-box or anywhere else that shares this folder:

    bin/captain start
    claude "Read docs/agent/README.md and play World Explorer."

The agent's commands reach the window through `data/agent/cdp.sock`, a socket
in this folder, so no port is opened to the network.

`bin/captain` shows the agent the screen as text and presses buttons and keys
for it; `docs/agent/README.md` is its instructions. The agent keeps a diary of
its decisions in `data/agent/diary.md`; its window and save are its own.

## Layout

The game is one page with one script scope. `bin/build` reads
`src/index.html` and replaces each `<!-- include path -->` line with that
file of `src/`, so the include list there is the load order. A
`<!-- slot name -->` line is empty in the game; `src/dev.html` fills the slots
for the dev page.

    src/index.html   the page shell and the include list
    src/css/         styles, in their original order
    src/html/        body markup: the HUD and one file per overlay
    src/js/          game code, one file per part of the game
    src/js/worlds/   one file per world: map, look, flight rules, expedition, music
    src/js/ships/    one file per ship class: catalog entry and hull profile
    src/js/sfx/      one file per sound effect: its cooldown and its synth calls
    src/sprites/     drawings (SVG): ships in 3d, weapons, pickups, worlds/<world>; a
                     `<!-- svgs sprites as sprite_svgs -->` line packs them
                     into the page
    src/dev.html     what the dev page adds into the slots of src/index.html
    src/js/dev/      the dev panel: time, cheats, scenario, one file per tab
    src/agent.html   what the agent's page adds: storage of its own, the captain hook
    src/js/agent/    the captain hook: the game state as JSON and the news

Code: [vbarbarosh/rules](https://github.com/vbarbarosh/rules).
