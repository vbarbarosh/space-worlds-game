# Missions

One file per mission:
- `<nn>-<name>.md` is a story chapter; the number is its place in the story (01
  comes first). A chapter with no file keeps its stages in `src/js/worlds.js` and
  `src/js/operations.js`.
- `side-<name>.md` is a side mission, offered as a contract at its world's
  station until it is done.

`bin/build` packs every such file into the game.

A file:

    # A pilot earns their wings

    World: Haven · Reward: 306

    The story, one or more paragraphs: what the station tells you and why it
    matters. The first paragraph is the contract's description.

    | Stage | Kind | World | Amount | Where |
    |---|---|---|---|---|
    | Calibrate the mining scanner | scan | Haven | 12 | beacon 1 |
    | Extract trial ore | mining | Haven | 10 | |
    | Return the analysis to Haven | courier | Haven | 1 | |

- **World** is where the contract is offered; **Reward** is salvage, paid when
  you collect it at a station.
- Each table row is a stage, done in order. **Stage** is what the guide shows.
  **World** is a world's name: Haven, Verdant, Dustfall, Ion Reach, Obsidian,
  Cryosphere, Nova Forge, Eclipse.
- **Where** is empty, `beacon <n>` (1–3) for a scan, or `commodity <key>`
  (ore, cells, relics) for a trade.

| Kind | Amount means |
|---|---|
| scan | seconds of scanning at the beacon, guarding the survey robot |
| mining | units your drones drill at a mining field |
| courier | 1: dock at the stage's world station to deliver |
| hunt | raiders destroyed in that world |
| defend | seconds holding the relay |
| recover | seconds holding at the recovery signal after the ambush |
| elite | 1: the marked commander destroyed |
| boss | 1: the world's flagship destroyed |
| escort | 1: the convoy brought through its legs |
| trade | units of the commodity sold at that world's station |
| lure | 1: the Leviathan, which guns cannot hurt, led into a black hole's core |

`bin/build` stops with the file and line when a file does not read.
