# World Explorer: the scenario

What the game is about, how its story is built, and the ways to play it.
The chapters themselves are in [chapters.md](chapters.md). Each part below
says what the game already has and what is new.

## The goal

The eight worlds of the frontier once traded under the **Expedition
Charter**. One guild kept the gates open, flew the convoys and kept the
peace. When the Void Armada took Eclipse, the guild fell, and the Charter was
lost at the Last Light Citadel. Every world closed in on itself, and raiders
took the lanes between them: the Rim Corsairs, the Thorn Swarm, the Dune
Marauders and the rest.

You start in Haven with a Wisp Scout, 90 salvage and a cadet's licence.

**The goal of the game is to found the Expedition Guild again.** It has two
measures:

1. **The story.** Recover the Charter beyond Eclipse (act I), then bring the
   eight worlds to sign it (act II). The last chapter founds the guild.
2. **The frontier.** A world signs the Charter only when it trusts you, so the
   guild needs **Trusted** reputation in all eight worlds. Any way of playing
   earns it.

After the founding, frontier expeditions stay open with no end, as they do
today.

*Exists:* chapter 16 already ends with "Found the expedition guild", and the
career tab already says "earn reputation in all eight worlds". *New:* the
Charter as the thread through all chapters, and signatures as the measure.

## How the story is built

The story reads like a book:

| Book | Game | Example |
|------|------|---------|
| part | **act** | Act I, The Broken Frontier |
| chapter | **chapter**: one mission with a briefing and an epilogue | 5. Break the iron blockade |
| paragraph | **stage**: one step of a chapter | Disable the Iron commander |
| short story | **side contract**: offered by a station between chapters | Clear the patrol lanes |

- **Act I, The Broken Frontier**: chapters 1–8, one per world, from Haven to
  Eclipse. It ends with the Charter recovered.
- **Act II, The Charter**: chapters 9–16, back through the eight worlds to win
  their signatures. It ends with the guild founded.
- **Career lines** (new): short chains of three chapters, one per way of
  playing (trader, escort, hunter, warden, surveyor). They are optional and
  open with rank. Each ends with a **guild seat**, a title with a lasting
  perk.
- **Side contracts**: the station board offers them, as it does today: hunt,
  mining, courier, survey, escort, trade, convoy, bounty, expedition.

A chapter opens when the one before it is done, sometimes with a rank or a
reputation in its world as well. It pays salvage, experience (rank) and
reputation, and it may unlock a ship, a weapon or the next chapter.

**Stage types.** These exist: scan, mining, courier, hunt, recover, defend,
elite, escort, trade, boss, survey. These are new:

| Stage | What the player does |
|-------|----------------------|
| convoy | escort freighters across several worlds, through the gates |
| patrol | fly a route with a guard wing and fight what it meets |
| inspection | stop beside a guard and pass its scan |
| smuggle | carry sealed cargo past the guards of a world |

## Ways to play

Every way pays salvage and experience, and raises reputation in the world
where the work is done. So every way leads to the goal.

| Way | What you do | Exists today | New |
|-----|-------------|--------------|-----|
| **Trader** | buy where a good is cheap, sell where it is dear | cargo market, trade intel, trade plans, demand that shifts | trader chapters; contraband goods; the Merchants' seat |
| **Escort** | protect freighters on their way | escort inside one world | convoys of several freighters across worlds; pay by cargo saved; the Convoy Masters' seat |
| **Hunter** | hunt raiders and their commanders | hunt, elite, commander bounties from rank 2 | wanted lists of named raider aces per world; the Hunters' seat |
| **Miner** | extract ore for contracts and the market | mining contracts, ore as cargo | none |
| **Warden** | fly with a world's guards: patrols, inspections | none | the guard career line; the Guards' seat |
| **Surveyor** | align beacons, chart the unknown | survey, frontier expeditions from rank 4 | the Cartographers' seat |
| **Outlaw** | smuggle, raid freighters | none | a path of its own, paid well, and it costs reputation |

The outlaw way is not a career line with a seat: it is what happens when the
player chooses money over trust. Reputation and the guards make it a real
choice.

## Reputation

Each world keeps its own reputation, from −10 to +10. Today it is a counter
of completed contracts that only the career tab shows.

| Tier | Range | What the world does |
|------|-------|---------------------|
| **Wanted** | −10 … −5 | guards attack on sight; the station refuses docking |
| **Suspect** | −4 … −1 | guards stop you for inspection; contraband is taken and a fine is charged; prices are worse |
| **Neutral** | 0 … 2 | nothing special |
| **Established** | 3 … 7 | better side contracts; 5% off at the market |
| **Trusted** | 8 … 10 | guards escort you near the station; the world signs the Charter |

| Raises it | | Lowers it | |
|-----------|---|-----------|---|
| a side contract completed | +1 | a contract abandoned | −1 |
| a chapter completed | +2 | a freighter lost on escort | −1 |
| helping guards or freighters in a fight | +1 | contraband found at inspection | −2 |
| a fine paid | back to 0 | hitting a guard | −2 |
| | | destroying a guard | −5 |
| | | destroying a freighter | −4 |

A Wanted player cannot dock in that world, so the way back is amnesty: a fine
paid at the station of a neighbouring world sets the reputation back to 0.

## World guards

Each world has a guard wing of its own, apart from its raiders. The guards
are the first ships in the game that are neither the player's nor enemies.

| World | Raiders (exist) | Guards (new) |
|-------|-----------------|--------------|
| Haven | Rim Corsairs | Anchorage Patrol |
| Verdant | Thorn Swarm | Canopy Wardens |
| Dustfall | Dune Marauders | Refinery Militia |
| Ion Reach | Volt Collective | Arc Sentries |
| Obsidian | Iron Dominion | Bastion Guard |
| Cryosphere | Frost Sentinels | Glacier Watch |
| Nova Forge | Ember Legion | Foundry Lancers |
| Eclipse | Void Armada | Citadel Vigil |

- Guards fly in wings of two to four. They patrol the lanes between the
  station, the gates and the beacons, and they fight any raiders they meet.
- They treat the player by reputation tier: escort (Trusted), ignore
  (Neutral, Established), inspect (Suspect), attack (Wanted).
- **Inspection.** A guard flies alongside for a few seconds. Slow down and the
  scan finishes; contraband, if any, is found. Flee and the reputation drops by
  1, to Suspect at most.
- Their strength follows the world: the armor and shields of its threat level.
- They wear the world's accent color and a guard mark on the map and in every
  view, so a guard is never mistaken for a raider.

## How a chapter is written

One file per chapter, the way each world and each ship has a file today. A
writer reads and edits it alone, without the game code around it. A chapter
file holds:

- **number, act, title, world, issuer**: the station that gives the chapter
- **requires**: the previous chapter, a rank, a reputation
- **briefing**: what the station says when it offers the chapter
- **stages**: type, target, title; the same stages the game has now
- **rewards**: salvage, experience, reputation; what it unlocks
- **epilogue**: what the station says when the chapter is claimed

Example, chapter 1 written as such a file:

```js
const chapter_a_pilot_earns_their_wings = {
    number: 1,
    act: 1,
    title: 'A pilot earns their wings',
    world: 'haven',
    requires: {chapter: null, rank: 0},
    briefing: 'Haven Anchorage needs ore it can trust. Calibrate the scanner, bring back a trial load, and the dock master will put your name on the board.',
    stages: [
        {type: 'scan', target: 12, title: 'Calibrate the mining scanner', beacon: 0},
        {type: 'mining', target: 10, title: 'Extract trial ore'},
        {type: 'courier', target: 1, title: 'Return the analysis to Haven'},
    ],
    rewards: {salvage: 306, reputation: 2, unlocks: ['side contracts in Haven']},
    epilogue: 'The analysis is good. The dock master signs your licence: you are a pilot of Haven now, and the board is yours to choose from.',
};
```
