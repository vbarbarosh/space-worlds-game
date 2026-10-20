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

Three modes:

- **Arcade**: one run through the eight worlds, three waves each, the world's
  flagship in the third. Raiders come in squadrons; elites lead some of them,
  from Haven on (from the second world on Chill); in the middle worlds a
  squadron fans out round you, and marksmen aim where you will be, a dashed
  line showing their aim; a share of the squadrons fly mixed, and each
  world's elites have a trick of their own. Each world's flagship is a fight
  of its own: its own attacks, each shown before it lands, its own way of
  moving, a second half below 50%, and its own way to be won: the Crescent
  runs for a gate and gets away if it reaches it, nests shield the Thorn
  Beetle, the Sawtooth stuns itself on a rock it charges into, the Storm
  Wheel is hurt through the gaps of its turning shell, the Iron Stair at one
  weak point at a time, the Frost Crystal while it glows, the Furnace's ring
  of fire closes in as it heats, and the Eclipse Eye's dome opens only while
  you are at the black hole's edge with it. Eclipse is the gravity world: its
  black hole bends every shot, slings a ship that passes close, and swallows
  the raiders you lead into it. Ion Reach is the lightning world, here and in
  the campaign: an arc pylon strikes a ship that comes inside its ring once a
  gold ring has closed on it (1.1 s to get clear; 18, the shield first), and
  violet charge fields, most of them beside a pylon, fill the pulse while you
  stay in them. Obsidian is the magnetic world, here and in the campaign: its
  dark spires draw ships in within 280 m and bend the shots that pass into
  themselves, yours and the raiders' alike, so a spire covers whoever keeps it
  between them and the guns; a spire is solid and nothing breaks it. A ship that explodes hurts what is close to it. The salvage you collect buys
  repairs, weapons, ships, supplies and modules at the station's depot (R); each world opens more of them, and
  what is not open yet says where it opens. A module level bought is yours for the run but works only installed,
  and the ship's reactor powers only so many: its own power (Wisp Scout 4 up to Aurora Cruiser 8) and one more for
  each world cleared, so a run flies a build, not the whole shop (by Eclipse a cruiser holds 15 of the 75 levels'
  84 power); Hotter plasma, Rapid resonance and Prism draw 2 a level, the rest 1. At the depot a level goes in or
  out for free, so each world can fly its own build; a ship with a smaller reactor takes out the newest levels and
  says so. Reactor tuning (600, 1200, 1800 salvage, three a run) adds a unit of power to every ship. The support
  levels do more in the arcade (drones that grow with the run, nanites that mend under fire, a fast pulse, shots
  that slip past an evasive ship), so a guns build, a tank and an evasive pulse build each win about half the
  bot's runs ([docs/balance.md](docs/balance.md#the-arcades-power-budget)). A cleared world pays a fixed bonus, the weapon
  grows a tier, a cleared screen shows the world's numbers, and the depot opens before the next world. Score, combo and a best score (salvage left at the end scores 10 points each); no
  stations or contracts. A run has three lives, shown at the top of the HUD: a
  death costs one and retries its world from the first wave, as you began it, the depot opening first so you can try
  another kit; the last ends the run, its score against your best. A save keeps the score,
  salvage, gear and lives, and loading it starts its world again from the first wave.

  Each arcade world has a shape of its own: its size (from Nova Forge's 5.4 ×
  5.4 km to Dustfall's 7.6 × 6.6 km) and proportions (Verdant 9.6 × 4.4 km
  long, Obsidian 5.6 × 8 km tall), its station in the middle, at an end or on a rim, and its rock fields
  strewn, in a band, a ring, a belt, columns or outcrops.

  The arcade comes in three kinds, picked on its menu row (T turns it): **Free**, as above, **Scroll**, the same
  run on a screen that moves on by itself, up, down, left or right by the world, along a lane 12 to 16 km long (3 to
  4 minutes), the world stretched along it with its rocks, caches, cliffs, storms, pylons and spires spread along the way. Your ship
  flies anywhere in the view and the back edge pushes it on; the raiders come from ahead, and one the back edge leaves
  behind is gone, as is salvage it passes; most squadrons come as a formation, a line sweeping across the screen or a
  V flying down it, firing as they pass and gone once through. The screen moves at one speed all the way, never
  faster: wave 1 comes over the lane's first
  half and wave 2 over its second, squadron by squadron as the screen goes on, whatever is still fighting (busier in
  the middle worlds); the view never empties: while fewer than 3 raiders are in play (4 in the second wave) the
  wave's next squadron comes at once, and once the first wave has sent all its own, the second comes on early (not
  in the run's last world); a lane's raiders stay as many as they were; it stops only where the lane ends, for the
  flagship. No portals, no wave-2 events, and the depot opens between worlds only. And **Base**, Scroll pared to
  its base to build it up again a layer at a time: one speed from a world's start to its end, where the world ends
  and the depot opens before the next; two raiders, the chaser, which turns to you and fires once close, and the
  passer, which flies a straight line through the view and fires only while you are inside its ring; salvage and
  the whole depot (layer 1); the raiders built against the kit you bring, their hull following your guns' damage
  and their hits your hull, shield and armour (layer 3), and firing faster world by world; the
  raiders with jobs in the chasers' lines, one more kind each world from Haven to Obsidian (layer 2); squadrons
  that keep coming to the lane's end, and elites leading every other one; no cards, flagships, tanks, splitters,
  lancers, missiles or world tricks yet. Each kind keeps its own best.
- **Races**: ring races alone, at Easy, Normal or Hard, course after course
  from Haven through the eight worlds; the start ship, no raiders, the rocks
  as solid as ever. Two kinds: Steer, flown by hand, and Turbo, where the
  ship rides a track by itself and you only press and let go of the turbo
  (too fast in a bend, it spins off). After each: your place and time, then race again, the
  next course or the menu. Nothing is saved; the play log records each race
  ([docs/goals.md](docs/goals.md#the-races-mode)).
- **Campaign**: the stations, contracts, trading and story chapters; see
  [docs/scenario/](docs/scenario/README.md). Ranks license ships and guns, and
  a rank is experience: the hull of every raider you destroy (a Haven chaser
  58, an Eclipse tank 550, a flagship 10 500) and a contract's pay, so a ship
  is earned in fights; the HANGAR and ARSENAL say what each needs and what you
  have. Each world reached opens more ships, guns and module levels, as in the arcade
  ([docs/balance.md](docs/balance.md), What each world opens).

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
                     evasion), Free, Scroll or Base runs (--kind=scroll, base),
                     or idle, no key pressed (--idle, in
                     data/playtest/<mode>-idle/); tables and JSON in
                     data/playtest/
    bin/play-log     a play log saved from the pause panel (Download play log)
                     as a report: time, income and spending per world, the
                     kit as it changed, when the shop ran out, deaths, frame
                     rate; --charts=dir draws its charts as PNGs; the format
                     is in docs/play-log.md
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
enemy and target-dummy spawning, live upgrade levels and a sound board. The
scene lives in the URL, e.g. `dev.html?world=3&ship=gunship&weapon=rail`; a world goes by number or file name (`world=ion-reach`).
`&screen=station-arsenal` (or flight, combat, arcade, crowded, pause, settings, menu,
map-plan, ...; the list is in src/js/dev/screen.js) opens that screen with the
panel folded; with `&screen=arcade`, `&wave=2` starts the world at that wave
(e.g. `dev.html?world=dustfall&screen=arcade&wave=2`), `&kind=scroll` makes it a Scroll run, on the world's lane (`&kind=base` a Base run), and
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
    src/js/worlds/   one file per world: map, look, flight rules, expedition, music
    src/js/ships/    one file per ship class: catalog entry and hull profile
    src/js/sfx/      one file per sound effect: its cooldown and its synth calls
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
