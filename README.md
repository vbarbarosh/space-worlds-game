# World Explorer

A space flight, trade and exploration game: eight worlds,
six ship classes, story chapters and frontier expeditions. It runs offline,
with no server.

## Start

    bin/configure    install dependencies and build
    bin/run          build and open build/index.html in the browser
    bin/build        write build/index.html

## Layout

The game is one page with one script scope. `bin/build` reads
`src/index.html` and replaces each `<!-- include path -->` line with that
file of `src/`, so the include list there is the load order.

    src/index.html   the page shell and the include list
    src/css/         styles, in their original order
    src/html/        body markup: the HUD and one file per overlay
    src/js/          game code, one file per part of the game
    src/js/worlds/   one file per world: map, look, flight rules, expedition, music
    src/js/ships/    one file per ship class: catalog entry and hull profile
    src/js/sfx/      one file per sound effect: its cooldown and its synth calls

Code: [vbarbarosh/rules](https://github.com/vbarbarosh/rules).
