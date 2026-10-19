# World Explorer: the play log

The game keeps a log of how you play, so a game can be judged after it: where
the time went, what paid and what was bought, when the kit was complete, what
killed you, and how smooth the frames were. Pause → **Download play log**
saves it as `world-explorer-log-<date>.json`; `bin/play-log <file>` turns it
into a report. The code is `src/js/play_log.js`.

## Privacy

The log is kept in this browser's storage and nowhere else. Nothing is sent;
the downloaded file is the only way it leaves the device. The pause panel says
so in one line. **Clear log** empties it (Undo brings it back until you
resume). The dev page (`build/dev.html`) and the agent's page keep logs of
their own, as they keep saves of their own.

## What it records

- **Sessions.** A session is one game from its start (new, continue, load) to
  the main menu or the page's close; past an hour of play it goes on in a new
  session of the same game, which begins with the world and the kit. It carries the mode (`campaign`,
  `arcade` or `race`, the main menu's Races), the difficulty, the game's version and build time, and how it
  began and ended.
- **Games (runs).** A campaign is one run across all its sessions: its save
  keeps the id (`campaign.log_run`), so a continue next week joins the same
  run. Each arcade run is a run of its own. In the Races mode the races from
  the menu back to the menu are one run, each race a `run` event in it.
- **Records.** One record a minute of play, cut short when you change worlds,
  load, or die, so each record is in one world. A record holds the salvage on
  hand, salvage earned by source and spent by kind, XP by source, kills by
  raider type, damage dealt and taken (by cause), raider shots, dashes, pulses,
  supplies used, deaths, the lowest hull, the frame rate, and the canvas's
  pixel ratio.
- **Events.** A world entered, a purchase, a sale, the kit when it changed, a
  rank, a contract's steps, a flagship killed, a race, an arcade wave and a
  world cleared, a death with its cause, the milestones (the top ship, every
  module at its cap, every gun at tier 5), a load or a tow.

Only play counts toward time: flight, and the station, depot, map and
inventory screens. Pause, menus, settings and the results screens do not.

## Size

All stored sessions together are kept under 1.5 million characters (about
1.5 MB, some 40 hours of play); past it the oldest sessions go first. Saves
come first: when the browser's storage is full, the log's oldest sessions make
room for a save (`storage_set`). The pause panel says how many sessions were
dropped. A session longer than the cap would lose its oldest records, and say
how many in `dropped`; the hourly roll keeps sessions far below it.

## Cost

In a frame the log only adds to counters it already holds: no objects, no
strings. It writes once a minute (the session being played: an hour at most,
about 45 KB, under a millisecond), on pause, at a death and when the page is
hidden or closed. `bin/perf` shows no change in frame time or allocation.

## The file

One JSON document. Each record and each event sits on a line of its own, so it
reads as text and loads as JSON.

    {
     "format": "world-explorer-play-log",
     "format_version": 1,
     "about": "…",
     "exported_at": "2026-10-13T20:46:00.000Z",
     "game": {"version": "0.1.0", "built": "2026-10-13T20:42:31.451Z"},
     "summary": {…},
     "sessions": [{…}, …]
    }

`format_version` grows when a field changes meaning or goes away; new fields
can come without it. A reader skips fields it does not know.

### Units

| What | Unit |
| --- | --- |
| `t`, `s`, `*_s`, `secs`, `played_s` | seconds of play (pause and menus not counted) |
| `*_at`, `started`, `ended`, `built` | ISO 8601, UTC |
| `minute` (summary) | minutes of play since the session began |
| salvage, prices, `earned`, `spent`, `value` | salvage (◆) |
| `dealt`, `taken`, `taken_by` | hull and shield points |
| `hull_low` | the lowest hull in the record, 0 to 1 of the ship's hull |
| `fps` | frames a second in flight |
| `frame_ms`, `work_ms`, `paint_ms` | milliseconds: the time between frames, the time a frame's work took, and the browser's time after it |
| `dpr`, `dpr_min` | canvas pixels per CSS pixel |

### summary

| Field | |
| --- | --- |
| `sessions`, `play_minutes` | how many sessions, how much play |
| `worlds[]` | per mode and world: `minutes`, `earned`, `spent`, `kills`, `deaths`, `taken` |
| `salvage_curves[]` | per session: `minute_salvage`, at most 40 `[minute, salvage on hand]` points |
| `deaths[]` | every death: `session`, `mode`, `minute`, `world`, `cause`, `first_in_world` |
| `milestones[]` | `top ship`, `all modules at cap`, `all guns tier 5`: when, and the salvage then |

### A session

| Field | |
| --- | --- |
| `id` | the session's id (its start time, UTC, and four letters) |
| `mode` | `campaign`, `arcade` or `race` (the Races mode) |
| `run` | the game's id: a campaign keeps it in its save across sessions |
| `difficulty` | `chill`, `normal`, `overload`; in the Races mode `easy`, `normal`, `hard` |
| `game` | `version` (package.json) and `built` (bin/build's time) |
| `started`, `ended`, `end_reason` | `back to the main menu`, `page closed`, `another game started`, `an hour of play: goes on in the next session`, or `not closed: the page went away without notice` (a crash); `ended` is null while it is being played |
| `played_s` | seconds of play |
| `start` | `how` (`new`, `continue`, `load`, `after death`, `next race` (the Races mode), `continued` (the hourly roll), `after the log was cleared`), `world`, `salvage`, `xp`, `rank`, `ship` |
| `screen`, `browser` | the window's size (`w`, `h`), the screen's pixel ratio (`dpr`) and Settings → Resolution (`resolution`: `auto`, `sharp`, or `forced 1.3` on the dev page's `&dpr=`; missing in logs of version 0.10.3 and before); the user agent |
| `records[]`, `events[]` | below |
| `dropped` | records and events dropped to keep the size (events: past 5000 a session) |

### A record

    {"t":60,"s":53,"at":"…","world":"Haven","flight_s":47,"docked_s":6,"salvage":970,
     "earned":{"contract":290,"race":190,"sell ore":80},"spent":{"trade":24},
     "xp_total":262,"xp":{"kill":14,"contract":206},"rank":"Courier",
     "kills":{"chaser":2,"shooter":2,"lancer":1},"elite_kills":0,"dealt":1180,
     "taken":{"shield":0,"hull":53},"taken_by":{"shot":53},"raider_shots":28,"hits_on_you":4,
     "dashes":3,"pulses":1,"supplies":{"emp":1},"deaths":0,"hull_low":0.41,
     "fps":59.8,"frame_ms":{"avg":16.7,"max":34,"over_33":1,"over_50":0,"over_100":0},
     "work_ms":{"avg":3.1,"max":12.4},"paint_ms":{"avg":4.2,"max":15.8},"dpr":1.43,"dpr_min":1.3}

| Field | |
| --- | --- |
| `t`, `s` | when the record began, and how long it covers |
| `at` | the wall clock at its end |
| `world` | the world it was played in |
| `flight_s`, `docked_s` | seconds in flight; seconds in the station, depot, map or inventory |
| `salvage` | on hand at its end |
| `earned` | by source: `pickups` (wreck and cache salvage), `contract`, `story` (a story chapter), `race`, `goal`, `world bonus` (arcade), `swallowed` (a raider the arcade's Eclipse hole took), `sell <cargo>` (ore, cells, relics, commodities), `transport` (a transport line's sales), `refund` (a structure still building when you left), `unlogged` |
| `spent` | by kind: `ship`, `gun`, `gun tier`, `module`, `supply`, `repair` (arcade), `card` (arcade, a card's price), `drone`, `drone tier`, `builder`, `structure`, `transport line`, `trade` (commodities bought), `tow` (the tug after a death), `unlogged` |
| `xp_total`, `xp`, `rank` | campaign only (null in the arcade): XP at the end, earned by source (`kill`, `contract`, `unlogged`), the rank |
| `kills` | by raider type: `chaser`, `shooter`, `lancer`, `tank`, `splitter`, `shard`, `boss` |
| `elite_kills` | of those, elites |
| `dealt` | damage your side dealt to raiders' shields and hulls: guns, pulse, EMP, missiles, drones, platforms, arcade chain blasts |
| `taken` | the damage you took, on the shield and on the hull |
| `taken_by` | by cause: `shot`, `ram`, `flagship` (its attacks that are not shots), `missile` (a blast), `ship blast` (arcade), `vent` (arcade event), `flare`, `lightning` (Ion Reach's arc pylons), `rock`, `debris`, `radiation`, `black hole` |
| `raider_shots` | shots raiders fired (at you, and at what you protect) |
| `hits_on_you` | shots that hit you |
| `dashes`, `pulses`, `supplies` | turbo ignitions, pulses released, supplies used by key (`medkit`, `emp`, `stasis`) |
| `deaths`, `hull_low` | deaths in it; the lowest hull |
| `fps`, `frame_ms`, `work_ms` | in flight only; frames over 33, 50 and 100 ms are counted; `work_ms` is the game's own script in `frame()`: update, the canvas calls that record the drawing, the HUD |
| `paint_ms` | in flight only: from the end of `frame()` until the main thread is free again (a message posted then arrives): the browser's style, layout and paint, and on a software canvas the canvas's raster, which `work_ms` does not see. Whatever is left of `frame_ms` is waiting: for the screen's refresh, or for the graphics card. Missing in logs from before version 0.2.6 |
| `dpr`, `dpr_min` | in flight only: the canvas's pixel ratio, the mean over the record's frames and the lowest. It is the screen's own up to 1.7, and with Settings → Resolution on Auto (the default) a step lower (1.5, 1.3, 1.15, 1) while the frames fall behind for the graphics card (docs/performance-2026-10-05.md, 18 October). A `dpr` under the session's `screen.dpr` (capped at 1.7) says the game drew fewer pixels to keep up. Missing in logs of version 0.10.3 and before |
| `partial` | true on the last record of the session being played when the file was saved |

`unlogged` is salvage or XP that moved without passing a hook the log knows (a
dev cheat, or a new source in the code): the sums always match the balance,
and a non-zero `unlogged` says a hook is missing.

### Events

Every event has `t` and `type`.

| type | Fields |
| --- | --- |
| `world` | `world`, `how` (`new`, `continue`, `load`, `after death`, `continued`, `gate`, `next world`), `first_visit`, `salvage` |
| `run` | a load or the tow inside a session: `how`, `world`, `salvage`, `xp` |
| `buy` | `kind` (as `spent`), `item`, `price`, `salvage_left`, `priciest_yet` (the game's dearest purchase so far), and for a gun tier `tier`, for trade `amount` |
| `sell` | `item`, `amount`, `value`, `salvage_left` |
| `kit` | `ship`, `guns` (mount by mount: `id`, `name`, `tier`, or null for an empty mount), `modules` (installed level by key), `modules_at_cap`, `modules_total`, `modules_below_cap` (by the levels owned; those needing a launcher are marked), `ships_owned`, `drones`, `rank`, `salvage`; in the arcade `owned` (owned level by key, installed or not) and `power` (used, held by the reactor) |
| `rank` | `rank`, `xp` |
| `milestone` | `what`: `top ship` (the priciest ship owned), `all modules at cap` (all but those needing a launcher you do not carry), `all guns tier 5`; `salvage` |
| `contract` | `action` (`taken`, `stage done`, `completed`, `claimed`, `abandoned`), `title`, `kind` (the stage's), `stage`, `stages`, `world`, `reward`, `story`, `secs` (since taken), `stage_secs` (since the stage began), and `xp` when claimed |
| `boss` | a flagship killed: `name`, `world`, `secs` (from its first hit), `taken` (the damage you took meanwhile) |
| `race` | a campaign race over the line: `title`, `world`, `place`, `of`, `time` and `par` (seconds), `prize` |
| `race` (`mode: race`) | a race of the Races mode at its end: `kind` (`steer`, `turbo`), `level` (`easy`, `normal`, `hard`), `world`, `title`, `end` (`finished`, `wrecked`, `forfeit`), `why` (a forfeit's), `place` (null unless finished), `of`, `time` (yours, null unless finished), `at` (the race's clock at its end), `par`, `rings`, `km`, `reached` (rings you passed), `crashes` (hits on rocks and drifting debris; in a Turbo race, spins off the track), `rock_hull` (the shield and hull they took), `hull_left`, `racers[]`: `name` (`You` for you), `skill` (0 to 1), `time`, `next` (rings passed), `out`, `splits` (seconds since green at each ring passed: the places along the race) |
| `race_spin` | a Turbo race: you spun off the track: `at` (the race's clock), `ring` (the one you were heading for) |
| `race forfeit` | `world`, `why` |
| `wave` | arcade: `world`, `wave` |
| `world cleared` | arcade: `world`, `secs` in it, `bonus` |
| `card` | arcade: a card taken at the break (`src/js/arcade_cards.js`): `world` (the one just cleared), `card` (its id), `kind` (`gamble`, `trade`, `boon`), `module` and `price` when it has them |
| `card won` | arcade: a gamble's world cleared, its prize given: `world`, `card` |
| `card used` | arcade: the second wind saved you: `world`, `card` |
| `module` | arcade: a module level taken out of the ship or put in at the depot, free (`src/js/arcade_power.js`): `world`, `module`, `way` (`out`, `in`), `level` (installed now), `power` (used now) |
| `route` | arcade: the next world chosen at the break: `from`, `to`, `offered` (the worlds offered, names) |
| `death` | `world`, `cause` (`kind` as `taken_by`; for a shot `raider`, `weapon`, `elite`; for a ram `raider`, `elite`), `first_in_world` (in this game), `in_world_s`, `salvage`, `ship`, `flagship_alive` (its hull left, 0 to 1, or null) |
| `won` | the arcade's last world cleared: `world`, `salvage` |

## Reading it

    bin/play-log world-explorer-log-2026-10-13-2346.json
    bin/play-log log.json --charts=data/play-log    # PNG charts too
    bin/play-log log.json --mode=campaign
    bin/play-log log.json --mode=race               # the Races mode only

The report has the sessions and games, per world time, income, spending and
kills, income by source and spending by kind, salvage on hand over time, the
kit as it changed, the priciest purchases, when the game was maxed out and what
the salvage did after, combat per world, deaths, contracts, flagships, races
(the Races mode's each with its place, time, par, gap to the best rival,
crashes and hull left, a summary per difficulty, and your place at each ring),
the arcade's worlds, the frame rate with the canvas's pixel ratio, and notes on what stands out.

In Python:

    import json, pandas as pd
    log = json.load(open('world-explorer-log.json'))
    records = pd.json_normalize([dict(r, session=s['id'], mode=s['mode']) for s in log['sessions'] for r in s['records']])
    events = pd.json_normalize([dict(e, session=s['id']) for s in log['sessions'] for e in s['events']])

With jq, every purchase over 1000:

    jq -c '.sessions[].events[] | select(.type == "buy" and .price > 1000)' log.json
