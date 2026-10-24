<p>
<a href="https://github.com/vbarbarosh/space-worlds-game"><img src="https://img.shields.io/github/stars/vbarbarosh/space-worlds-game?style=flat"></a>
<a href="LICENSE"><img src="https://img.shields.io/github/license/vbarbarosh/space-worlds-game"></a>
<a href="https://github.com/vbarbarosh/space-worlds-game/actions/workflows/docs.yml"><img src="https://github.com/vbarbarosh/space-worlds-game/actions/workflows/docs.yml/badge.svg"></a>
</p>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="img/cover-dark.png">
  <img alt="World Explorer" src="img/cover.png">
</picture>

# World Explorer

A space flight, trade and exploration game: eight worlds, six ship classes, story chapters and frontier expeditions, offline, with no server.

[Website](https://vbarbarosh.github.io/space-worlds-game/)

## Quick start

    bin/configure
    bin/run

## Documentation

[The full documentation](https://vbarbarosh.github.io/space-worlds-game/),
built from [docs/](docs/README.md) (Settings → Pages → Source: GitHub Actions
turns it on). The rules the game keeps everywhere (what is solid, and the
like) are in [docs/principles.md](docs/principles.md).

Three modes ([docs/modes.md](docs/modes.md) has each in detail):

- **Arcade**: one run through the eight worlds, about five minutes each:
  six waves of raiders, the world's flagship in the last, each flagship a
  fight of its own. Salvage buys weapons, ships and modules at the depot
  between worlds, as many as the ship's reactor can power. Three lives, a
  score and a best; no stations or contracts. Two kinds: **Free**, the world
  open around you, and **Scroll**, the same run along a lane that moves on
  by itself.
- **Races**: ring races alone, course after course through the eight
  worlds, at Easy, Normal or Hard: Steer, flown by hand, or Turbo, where
  the ship rides the track and you work only the turbo.
- **Campaign**: the stations, contracts, trading and story chapters
  ([docs/scenario/](docs/scenario/README.md)); ranks earned in fights
  license ships and guns, and each world reached opens more.

## Commands

    bin/configure    install dependencies and build
    bin/run          build and open build/index.html in the browser
    bin/build        write build/index.html, build/dev.html and build/agent.html
    bin/captain      the agent's game window and its commands (see below)
    bin/layout-check every screen at twelve window sizes, the menu, the
                     station, the flight HUD and the arcade's cleared
                     screens at three phone sizes too (two upright, one on
                     its side): no HUD
                     block over another, no button off the window or over
                     another, no text cut; shots and report.json in
                     data/layout-check/, exit 1 on a failure
    bin/build-docs   docs/ as a website in build/docs, with the game from
                     bin/build in play/; published to GitHub Pages on every
                     push to main (.github/workflows/docs.yml)
    bin/world-pictures
                     the pictures of the worlds' pages (docs/worlds/), taken
                     from build/dev.html with no HUD: each world in a fight,
                     its station, its raiders, its flagship, its special
                     thing; and its sprites copied beside them
    bin/world-music  a world's five-minute track for its page, docs/worlds/
                     <world>/music.mp3 and its waveform music.json: the
                     world's calm theme with an ending, composed with the
                     game's own music and instruments (bin/world-music haven);
                     needs Playwright's Chromium and ffmpeg
    bin/perf         frame times, garbage and drawing costs over 57 scenes
                     (every world calm and in a fight, zoom 100% and 50%,
                     the arcade from Dustfall on, Scroll lanes in Dustfall,
                     Obsidian, Nova Forge and Eclipse, campaigns of 10, 50 and
                     100 structures, a ring race and drifting debris close
                     by in Haven and Eclipse), at
                     any window size, pixel ratio and difficulty; see
                     docs/performance-2026-10-05.md
    bin/playtest     a bot plays arcade runs on a virtual clock (about a
                     minute each) and counts per world and wave the hull
                     lost, kills off the screen, salvage left and, for
                     waves 1 and 2, the seconds with under 3 raiders in
                     play and how many are in play, flying
                     a build of modules (--build=mixed, guns, tank or
                     evasion), Free or Scroll runs (--kind=scroll),
                     or idle, no key pressed (--idle, in
                     data/playtest/<mode>-idle/); tables and JSON in
                     data/playtest/
    bin/play-log     a play log saved from the pause panel (Download play log)
                     as a report: time, income and spending per world, the
                     kit as it changed, when the shop ran out, deaths, frame
                     rate; --charts=dir draws its charts as PNGs; the format
                     is in docs/play-log.md
    bin/sound-render the game's sound recorded as it plays: every effect in a
                     row, each world's calm theme, each world's arcade
                     music, an arcade fight and a flagship fight, as WebM
                     files with their peak and mean levels (ffmpeg), in
                     data/sound/<label>/; --page records a build kept from
                     before a change, for before and after
    bin/sound-pack   generate the sound brief as WAV, MP3 and Ogg assets:
                     every effect, new explosion takes, full world music
                     loops, flight stems and listening demos; --label=name
                     writes data/sound/<name>/ with a playlist and manifest.
                     Requires Playwright Chromium and ffmpeg; see
                     docs/designer/sound.md. Does not change game playback.
    bin/lint         the rulebook's linter over src/, docs/assets/ and bin/;
                     see AGENTS.md
    bin/map-check    every world's map, campaign and arcade, against
                     docs/placement.md: no two things R acts on within reach
                     of each other, gates and portals where the rules put
                     them, race courses clear of all of it, Ion Reach's
                     pylons and charge fields and Obsidian's spires out of
                     every range; exit 1 on a failure
    bin/resolution-check
                     the adaptive resolution in real time (about three
                     minutes): the canvas's pixel ratio holds when frames
                     keep up, steps down under a stand-in for a slow
                     graphics card and holds where they keep up, comes back
                     in a new world; Sharp, a forced ratio, a page held to
                     30 fps; exit 1 on a failure

The main menu's top right corner holds a developers' panel, **Try a world** (src/js/arcade_trial.js): a click on a
planet starts an arcade run straight in that world, of the kind and level the Arcade row has, at its step, with the
kit a bot's won run brought into it (bin/playtest records it per world as `kit`); it keeps no best, and hides in a
window under 980 px wide.

`build/dev.html` is the developer mode: the game with a dev panel. It starts
straight into any world, ship and weapon, and has time controls, cheats,
enemy and target-dummy spawning, live upgrade levels, a sound board and a
sound maker. The main menu's Developer button (D) opens it; its Screens tab
opens every screen below, the map editor and the sound maker first, in the
world, ship, difficulty and arcade kind chosen under Scenario, so no URL needs
remembering. The
scene lives in the URL, e.g. `dev.html?world=3&ship=gunship&weapon=rail`; a world goes by number or file name (`world=ion-reach`).
`&screen=station-arsenal` (or flight, combat, arcade, crowded, pause, settings, menu,
map-plan, ...; the list is in src/js/dev/screen.js) opens that screen with the
panel folded; with `&screen=arcade`, `&wave=2` starts the world at that wave
(e.g. `dev.html?world=dustfall&screen=arcade&wave=2`), `&kind=scroll` makes it a Scroll run, on the world's lane, and
`&raiders=sniper,bulwark` brings a pack of three chasers and one raider of each kind named (interceptor,
carrier, bulwark, sniper, minelayer) 640 m ahead.
`&card_hud=1` puts cards in force over the gauges.
With Ion Reach (`world=ion-reach`, flight or arcade, Free or Scroll), `&pylon=calm|charge|strike|field` puts your ship
by an arc pylon at that moment (`&speed=0.1` to watch it, `&god=0` for the strike to land).
With Obsidian (`world=obsidian`, the same scenes), `&spire=near|pull|cover|bend` puts your ship by a magnetic spire:
outside its field, inside it drawn in, behind it with three shooters held beyond it, or firing past it at a tank.
`&screen=arcade-lost` shows a death on the world's last wave with two lives left, with Retry for that world
(`&lives=1` the last one left), `arcade-over` the last life lost, the run over; `&long=1` gives either a very long
world name and a huge score. With `&screen=arcade`, `&lives=n` sets the HUD's lives (0 to 3), the lost ones blinking.
`&screen=arcade-depot` opens the depot before the next world (`&modules=damage:3,armor:2` owned and installed in that
order while the reactor's power lasts, `&ship=gunship` the ship flown, `&swap=scout` a ship taken there, its smaller
reactor taking out the newest levels, `&long=1` its header at its widest).
`&screen=arcade-pick` opens the break after the world at its three cards,
`arcade-route` at the next world of two (`&cards=wager,overclock,prototype`
draws those, `&cards=long` the longest texts, `&salvage=n`, `&route=0,2,1` a
route flown, `&won=1` a gamble won; the list is in src/js/dev/arcade_break.js). `&screen=race` starts a ring race at its start line
(`race-mid` mid-race, `race-finish` over the line; `&race_place=1|2|3|last`,
`&race_long=1`, `&race_left=1`, `&race_raiders=1` for its edge states), e.g.
`dev.html?world=0&screen=race`; `&screen=race-results` shows the Races mode's
results (`&race_level=easy|normal|hard`, `&race_place=1|last`,
`&race_end=wrecked|forfeit`, `&race_crashes=n`, `&race_kind=turbo`);
`&screen=races-turbo` lines up a Turbo race, `races-turbo-mid` puts you on
the turbo two seconds before its tightest bend. `&screen=menu` shows the menu with the scene's
game to continue; `&row=arcade` (or `races`, `load`, `settings`, `controls`) opens that
row, `&slots=1` adds six saved slots (the Load row, and its scene with
`&row=load`), `&save=none` a first launch with no game to continue.
`&kit=start` leaves you only the start ship and gun (and the ones in the
URL), so the HANGAR and ARSENAL show what a later world opens. It keeps
its own storage and never touches the game's save. `&xp=8400` sets the
pilot's experience (else a Legend's, every licence held), so the HANGAR and
ARSENAL show the licences a rank still holds back, with the XP each needs.
`&contracts=full` crowds the station's CONTRACTS (three taken, among them a very long title, and the
longest board offered) and `&cargo=all` puts all eleven goods in the hold for
the CARGO MARKET; `&station=full` puts the station's header and NEXT strip at
their longest (a very long station name, the hold full, salvage in the
millions, the guide's longest step); `&screen=station-intel` opens TRADE INTEL.
`&screen=map-editor` is the map editor: the world's campaign map from above (`&kind=free` or `scroll` its
arcade map), its things to move, add and delete, the rules of docs/placement.md checked as you go; Play flies the edit,
Export downloads the file to put in src/maps/ ([src/maps/README.md](src/maps/README.md)).
`&screen=sound-maker` is the sound maker (`&sound=blast` opens that one; the Sounds tab's Make does too): each sound
effect as its layers, tones and noises, a row of sliders each, played through the game's own mix, with its picture and
peak; new sounds start from a tone or a copy. Fly with it is an arcade run with this browser's changed sounds
(`&sounds=made`), Copy gives the sound as its file of src/js/sfx/, WAV downloads it
([docs/designer/sound.md](docs/designer/sound.md)).
`&dpr=1.3` draws the canvas at that pixel ratio, whatever Settings → Resolution
says; `&slow=20` stands in for a slow graphics card, each frame waiting 20 ms
for every million pixels of the canvas, so Auto steps down;
`&stall=30` waits 30 ms a frame whatever the canvas's size. The frame rate at
the left edge shows the ratio in use (`×1.50`).

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
    src/js/worlds/   one file per world: map, look, flight rules, expedition, music (its
                     calm theme, and the drive the arcade and a flagship fight
                     play it with, src/js/music_drive.js)
    src/js/ships/    one file per ship class: catalog entry and hull profile
    src/js/sfx/      one file per sound effect: its cooldown and its synth calls
    src/maps/        map files: a world's map as the map editor left it, packed into the page
    src/sprites/     drawings (SVG): ships in 3d/ (the shaded set), weapons, pickups, worlds/<world>; a
                     `<!-- svgs sprites as sprite_svgs -->` line packs them
                     into the page
    src/dev.html     what the dev page adds into the slots of src/index.html
    src/js/dev/      the dev panel: time, cheats, scenario, one file per tab
    src/agent.html   what the agent's page adds: storage of its own, the captain hook
    src/js/agent/    the captain hook: the game state as JSON and the news

Earlier prototypes are kept as they were in `prototypes/`, one HTML file
each, listed in [prototypes/README.md](prototypes/README.md).

Code: [vbarbarosh/rules](https://github.com/vbarbarosh/rules).

## License

[MIT](LICENSE)
