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

- **World** is where the contract is offered; **Reward** is salvage, paid when
  you collect it at a station.
- Each table row is a stage, done in order. **Stage** is what the guide shows.
  **World** is a world's name: Haven, Verdant, Dustfall, Ion Reach, Obsidian,
  Cryosphere, Nova Forge, Eclipse.
- **Where** is empty, `beacon <n>` (1–3) for a scan or a defend (a defend
  holds beacon 2 when empty), `commodity <key>` (ore, cells, relics) for a
  trade, or `from <world or station> to <world or station>` for an escort
  that is a convoy's leg: `from station to Verdant` runs from beside the
  station to the gate to Verdant, `from Haven to station` from the gate from
  Haven to the station.
- No stage needs to bring you back to the station: collecting the reward is
  docking there. A courier to the world you are already in is only a dock;
  send the player to another world only when the story goes that way, and
  the delivery is intercepted there (see docs/goals.md).

| Kind | Amount means |
|---|---|
| scan | seconds of scanning at the beacon, guarding the survey robot |
| mining | units your guns cut from the rocks of a mining field |
| courier | 1: dock at the stage's world station to deliver; from another world, raiders intercept it in each world it enters |
| hunt | raiders destroyed in that world |
| defend | seconds holding the relay |
| recover | seconds holding at the recovery signal after the ambush |
| elite | 1: the marked commander destroyed |
| boss | 1: the world's flagship destroyed |
| escort | 1: the convoy brought through its legs |
| trade | units of the commodity sold at that world's station from your own hold; what you bought there does not count |
| lure | 1: the Leviathan, which guns cannot hurt, led into a black hole's core |
| patrol | points of the world's guard wing's round flown with it |
| inspection | 1: a guard's scan passed with no sealed cargo aboard |
| smuggle | units of sealed cargo sold in the back room of that world, where it is banned |

`bin/build` stops with the file and line when a file does not read.
