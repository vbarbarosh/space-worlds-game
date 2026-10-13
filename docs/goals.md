# World Explorer: goals and missions

What the campaign asks of the player, how the work is offered, and what it
pays. The story itself, chapter by chapter, and the planned career lines and
reputation tiers are in [scenario/](scenario/README.md); this file says what
the code does today. The arcade has none of this: its one goal is to clear
the eight worlds (see [balance.md](balance.md)).

## The shape of a job

Every job is a **contract**: a title, a world, a reward in salvage, and one or
more **stages** done in order. A stage has a kind, a world and an amount
(`stage()` in `src/js/operations.js`).

| Kind | Done when |
|---|---|
| scan | you guard the survey robot at a beacon for the amount in seconds |
| mining | your drones drill the amount in units |
| courier | you dock at the stage's world station; carried from another world, a wing of raiders intercepts it once in each world you enter |
| hunt | you destroy the amount of raiders in that world |
| defend | you hold within 450 m of the relay for the amount in seconds; leaving loses progress slowly |
| recover | you clear the ambush, then hold within 150 m for the amount in seconds |
| elite | you destroy the marked commander |
| boss | you destroy the world's flagship at the combat zone |
| escort | the freighter finishes its cargo run (load at a mining field, unload at the station) |
| trade | you sell the amount of a good at that world's station, from your own hold (what you bought at that station does not count); intercepted like a courier when carried from another world |
| lure | the Leviathan falls into a black hole's core |
| survey | you fly within 120 m of three beacons (a one-stage contract) |
| race | you fly the course's rings in order through the last, the finish, in any place (see [Ring races](#ring-races)) |

- Progress counts only in the stage's world (`mission_event`). A delivery
  (courier or trade) starts where the stage before it ended, or where the
  contract was taken; in every other world it enters, its own included,
  `update_intercepts` sends 2 + level (at most 4) of that world's raiders
  once, four seconds after arrival, between you and the station. A finished
  stage starts the next; the last one makes the contract ready, and you
  collect the reward by docking at any station and pressing Collect reward.
- You carry at most three contracts, and one story chapter at a time
  (`guide_base_accept_contract` in `src/js/station.js`). Contracts have no
  timer. Abandoning one drops it with no cost.
- Following a contract (Follow on its card) points the guide at its current
  stage; the HUD shows the stage and its progress.
- The text the guide shows for each kind is `stage_description` in
  `src/js/operations.js`.

## Story chapters

Sixteen chapters, offered one after another at the station's jobs board as
"Story n / 16" while no chapter is carried. Claiming one moves the story on
(`campaign.story`); after the last, the game says the story is complete and
contracts go on.

- Chapter 1 is written as a file, `src/missions/01-a-pilot-earns-their-wings.md`
  (306). A chapter file takes its place by number (`src/js/missions.js`); the
  file format is in [src/missions/README.md](../src/missions/README.md).
- Chapters 2 to 8 (act I) are `story` in `src/js/worlds.js` with their stages
  in `expanded_story_stages`, `src/js/operations.js`; their rewards are the
  listed reward × 1.8: 522, 540, 774, 1170, 1170, 1800, 2880.
- Chapters 9 to 16 (act II) are `second_act` in `src/js/operations.js`: 1200,
  1450, 1700, 1850, 2150, 2350, 2700, 3400. Their raiders count as level 2,
  and every world fights seven tiers past its own by then (the story's
  front, in [balance.md](balance.md)).
- A chapter ends where the next one starts, or on the way to it. A delivery to
  another world is kept only where the story moves you that way, and it is
  intercepted on the way; no chapter sends you back where you came from.
- The titles, stages and story text are in
  [scenario/chapters.md](scenario/chapters.md).

## Side contracts at a station

What a station offers depends on its world (`offered_jobs` and
`world_contracts` in `src/js/operations.js`). `id` is the world's index
(Haven 0 to Eclipse 7), `level` is 1 + one for every 8 contracts completed,
at most 12, and n = level − 1.

| Contract | Stages | Open from |
|---|---|---|
| Two of the world's own | in the table below | always |
| Sealed dispatch to a neighbour | courier to it (intercepted), defend 40 + 5n there | always |
| Supply run: a good to a neighbour | trade: sell 5 + level (at most 12) of this world's cheapest good at the neighbour that pays most for it (intercepted); offered when that pays at least 8 more | always |
| Ring race: the world's sprint, slalom or loop | race: 5 to 7 rings against 3 or 4 rivals ([Ring races](#ring-races)) | always, in every world |
| Commander bounty | scan 16 + n, hunt 6 + n, elite | rank Pathfinder |
| Frontier expedition n | scan 22 + n here; defend 70 + 6n, elite, recover 20 in a neighbour | rank Ace |
| Side missions | from their file | in their world, until done |

Each world's own two, in its terms (its raiders, its resource, its rules):

| World | Contract | Stages |
|---|---|---|
| Haven | Clear the patrol lanes | scan 12 + n, hunt 6 + n, recover 10 |
| Haven | Haven iron for the Anchorage | mining 8 + 2n, escort |
| Verdant | Prune the thorn nest | scan 14 + n, hunt 8 + n, elite |
| Verdant | Spore resin harvest | mining 8 + 2n, defend 40 + 5n |
| Dustfall | Refinery quota | mining 10 + 2n, trade titanium sand 6 + n at Dustfall |
| Dustfall | Marauder launch site | scan 14 + n, recover 12, elite |
| Ion Reach | Storm cartography | scan 14 + n, defend 45 + 5n, recover 12 |
| Ion Reach | Silence the Volt jammers | hunt 8 + n, elite |
| Obsidian | Break the Dominion picket | hunt 6 + n, elite, recover 12 |
| Obsidian | Heavy metals for the Bastion | mining 10 + 2n, defend 50 + 5n |
| Cryosphere | Lost on the ice | scan 14 + n, recover 12, escort |
| Cryosphere | Helium-3 harvest | mining 10 + 2n, defend 50 + 5n |
| Nova Forge | Quench the furnace raiders | scan 14 + n, hunt 8 + n, elite |
| Nova Forge | Plasma for the Foundry | mining 10 + 2n, escort |
| Eclipse | Signals from the dark | scan 16 + n, defend 50 + 5n, recover 15 |
| Eclipse | Void matter | mining 10 + 2n, elite |

- A neighbour is a linked world you have reached, the next of them each time
  a contract is taken (`campaign.board`); a link you have not reached is used
  only when none is. So no contract sends you where your ship cannot go yet.
- A contract pays for the minutes its stages take (`stage_minutes`, timed by
  playing them, plus 0.6 a jump and 0.5 for the interception of a delivery to
  another world): minutes × 105 × (1 + 0.2·id) × (1 + 0.1·n), × 1.4 for a
  bounty and × 1.7 for an expedition, to the nearest 10
  (`contract_reward`).
- A completed expedition opens the next one (`campaign.expedition`).
- Side missions are `src/missions/side-<name>.md`; today there is one, Lure
  the Leviathan in Verdant (900). It needs a black hole, and Haven has none.
- A higher level makes contract raiders tougher (+12% hull a level past the
  first, up to ten levels), sends more raiders to a recover ambush
  (3 + level, at most 6), to each defend wave (every 12 s, a hold's wave
  size below plus level − 1, at most 2 more) and to an interception
  (2 + level, at most 4).
- A stage that waits for raiders brings them in growing waves (`hold_waves_update`
  in `src/js/navigation.js`): a hunt, or a mining stage while your drones
  drill, out of the station's shelter. The first wave comes 5 s after you
  settle, then one every 14 s, from one side and 1100 m out, past your guns'
  reach, so it arrives together: 2 + tier / 3 raiders (rounded down; the
  patrol's count and one more), one more each wave, three more at most
  (`hold_wave_size`). The patrols rest meanwhile. A defend stage's waves grow
  the same way with the seconds held. Before, a hunt waited for the patrols:
  in Haven one or two raiders every 11 s, a minute or more for a hunt of 6.
- What you guard grows with the raiders' hits (+8% a world past Haven, +12%
  a level past the first): the survey robot (80 hull in Haven) and the
  convoy's freighter (300). A robot scans at half speed with a raider close;
  a lost one sets the scan back a third.
- Halfway through a recover hold the ambush calls 2 to 4 reinforcements; the
  hold waits until they are cleared.
- A mining stage whose drones are all lost sends the guide to the station to
  buy new ones (MODULES).

## Ring races

A contract at every station, in every world (`race_offer` in `src/js/race.js`):
a course of rings off the station and rivals to beat through it.

- **The course:** a start line 1.5 to 2 km from the station, then
  5 + ⌊tier/3⌋ rings (5 in Haven to 7 in Eclipse), each 1 to 1.7 km from the
  one before and turned 30° to 75° off its line, mostly to the other side, so
  the line between them needs steering; it is laid out among the rocks of the
  fields nearest the station where they are. A ring is 120 m across its
  radius in Haven, 5 m less a tier (85 m in Eclipse). Three courses a world
  (sprint, slalom, loop), one offered at a time by the board. Each keeps
  clear of everything R or a ring acts on ([placement.md](placement.md#race-courses)).
  A ring a drifting rock comes into (Verdant's current) moves off it.
- **The rivals:** 3 in Haven and Verdant, 4 from Dustfall on, from the
  slowest to the best, each with a name, a hull from the ships' drawings in
  its colour. A rival's cruise is
  285 m/s × the world's speed × (1 + 0.06 tier + 0.01 (level − 1)) ×
  (0.9 + 0.3 skill), its turn and thrust the world's own scaled by its
  skill; it aims at its own line through each ring, slows for the turn after
  it as much as its thrust needs, lights a turbo of 2 to 2.8 × its cruise for
  1.5 to 4 s on a long straight, steers round rocks, bumps you and the others,
  and can miss a ring and loop back for it. Rivals never shoot. Raiders may go
  for them (two raiders in five pick a rival near them over you), and their
  shots and rams hurt them (120 hull + 25 a tier); a rival with its hull gone
  is out. Your shots pass through them.
- **The start:** fly into your place on the line (the guide marks it); the
  rivals stand in theirs, and the count runs 3, 2, 1 over three lights, then
  green. A raider within 1.1 km of the line holds the start until it is
  cleared. You are held in your place during the count.
- **The finish:** your place is one more than the rivals over the line before
  you. The prize is the contract's reward for first at par time × the place's
  share (1, 0.7, 0.5, 0.35; the last always 0.2) × par ÷ your time (0.75 to
  1.25), to the nearest 10. Par is the course at 1.4 × the best rival's
  cruise, plus 0.6 s a ring. The reward offered is first at par:
  (0.5 + 0.12 a ring) minutes × the formula below × 1.3. The contract is done
  then; dock and collect as for any other. The race runs on 25 s for the
  rivals still out, then the results stay 8 s on the board.
- **Forfeit:** 2.5 km off the course's line for 6 s (the card counts it down
  in red), docking, or a jump to another world forfeits; the contract stays,
  and the start line waits for another try.
- **Saves:** a race is not saved. A save made mid-race loads with the race
  called off and the contract as it was before the start; so does a tow after
  a death.
- **On screen:** the mission card is the race's (your place, the ring and its
  distance, the clock), the standings stand in a small board under the
  minimap, and near the course the minimap shows the course instead of the
  world.

## What a contract pays

On collecting (`guide_base_claim_contract` in `src/js/operations.js` and
`expedition_base_guide_base_claim_contract` in `src/js/station.js`):

- the reward in salvage, and 10 × the reward in score;
- experience: 28% of the reward + 18 for each stage, toward the pilot rank
  that licenses ships and guns (ranks in [balance.md](balance.md));
- +1 reputation with the world that issued it. The GOALS tab shows a world as
  known from 3 and trusted from 8. Reputation changes nothing else yet; the
  tiers in [scenario/README.md](scenario/README.md#reputation) are a plan.

## Goals

On the station's GOALS tab the player picks one goal; it lays out its steps,
the current step points the guide at its target, steps tick themselves, and
the last pays a bonus (`src/js/goals.js`). One goal at a time; a goal can be
dropped and picked again.

| Goal | Steps | Bonus |
|---|---|---|
| Explorer | reach every world not yet seen, nearest first; a step names the modules a gate needs | 1500 |
| Prospector | buy a builder drone, build a mining outpost, open a transport line, upgrade the drones to Hauler, build a second outpost, earn 2000 from transports | 1200 |

- Where: `goal_kinds`, `explorer_steps`, `prospector_steps`;
  `prospector_target` is the 2000.
- The same tab shows the pilot's rank and XP, and reputation in the worlds
  seen.

## Trade plans

Not a contract, but a goal the guide follows: TRADE INTEL lists routes by
profit, and Plan sets a buy-here, sell-there route the guide flies
(`trade_opportunities`, `plan_trade` in `src/js/trade.js`).
