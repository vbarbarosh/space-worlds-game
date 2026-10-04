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
| courier | you dock at the stage's world station |
| hunt | you destroy the amount of raiders in that world |
| defend | you hold within 450 m of the relay for the amount in seconds; leaving loses progress slowly |
| recover | you clear the ambush, then hold within 150 m for the amount in seconds |
| elite | you destroy the marked commander |
| boss | you destroy the world's flagship at the combat zone |
| escort | the freighter finishes its cargo run (load at a mining field, unload at the station) |
| trade | you sell the amount of a good at that world's station |
| lure | the Leviathan falls into a black hole's core |
| survey | you fly within 120 m of three beacons (a one-stage contract) |

- Progress counts only in the stage's world (`mission_event`). A finished
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
  1450, 1700, 1850, 2150, 2350, 2700, 3400. Their raiders count as level 2.
- The titles, stages and story text are in
  [scenario/chapters.md](scenario/chapters.md).

## Side contracts at a station

What a station offers depends on its world (`offered_jobs` in
`src/js/operations.js`). `id` is the world's index (Haven 0 to Eclipse 7) and
`level` is 1 + one for every 8 contracts completed, at most 12.

| Contract | Stages | Reward | Open from |
|---|---|---|---|
| Clear the patrol lanes | scan, hunt 8 + 2·id + 2·level, recover 10, courier home | (125 + 55·(id+1)) × 2 | always |
| Survey-grade extraction | mining 8 + 2·level, scan 15, courier to a linked world | (95 + 40·(id+1)) × 2 | always |
| Sealed dispatch | courier to a linked world, defend 50 + 5·level, courier home | (160 + 45·(id+1)) × 2 | always |
| Convoy: relief route | escort, courier to a linked world | 450 + 80·id + 50·level | always |
| Commander bounty | scan, hunt, elite, recover, courier home | 650 + 110·id + 80·level | rank Pathfinder |
| Frontier expedition n | scan, defend, elite, recover, courier home | 1100 + 150·id + 140·level | rank Ace |
| Side missions | from their file | from their file | in their world, until done |

- The linked world is the next of the world's gate links each time a contract
  is taken (`campaign.board`).
- A completed expedition opens the next one (`campaign.expedition`).
- Side missions are `src/missions/side-<name>.md`; today there is one, Lure
  the Leviathan in Haven (900).
- `expedition_base_offered_jobs` in `src/js/station.js` also writes Map the
  frontier, Escort a freighter and Market supply, but only its first three
  are offered.
- A higher level makes contract raiders tougher (+12% hull a level past the
  first, up to ten levels), sends more raiders to a recover ambush
  (3 + level, at most 6) and to each defend wave (2 + level, at most 4, every
  12 s).

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
