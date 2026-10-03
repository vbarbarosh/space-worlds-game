# World Explorer

A space flight, trade and exploration game: eight worlds,
six ship classes, story chapters and frontier expeditions. It runs offline,
with no server.

Two modes:

- **Arcade**: one run through the eight worlds, three waves each, the world's
  flagship in the third. A card between worlds adds a module or a new weapon,
  and the weapon grows a tier per world. Score, combo and a best score; no
  stations, contracts or saves.
- **Campaign**: the stations, contracts, trading and story chapters; see
  [docs/scenario/](docs/scenario/README.md).

## Start

    bin/configure    install dependencies and build
    bin/run          build and open build/index.html in the browser
    bin/build        write build/index.html, build/dev.html and build/agent.html
    bin/captain      the agent's game window and its commands (see below)

`build/dev.html` is the developer mode: the game with a dev panel. It starts
straight into any world, ship and weapon, and has time controls, cheats,
enemy and target-dummy spawning, live upgrade levels and a sound board. The
scene lives in the URL, e.g. `dev.html?world=3&ship=gunship&weapon=rail`.
It keeps its own storage and never touches the game's save.

## An agent as a player

A coding agent such as Claude Code or Codex can play the campaign as your
rival, in its own world and its own window:

    bin/captain start
    claude "Read docs/agent/README.md and play World Explorer."

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
    src/dev.html     what the dev page adds into the slots of src/index.html
    src/js/dev/      the dev panel: time, cheats, scenario, one file per tab
    src/agent.html   what the agent's page adds: storage of its own, the captain hook
    src/js/agent/    the captain hook: the game state as JSON and the news

Code: [vbarbarosh/rules](https://github.com/vbarbarosh/rules).
