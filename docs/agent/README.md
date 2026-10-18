# Playing World Explorer as an agent

You are a pilot in World Explorer, a space game with eight worlds, stations,
contracts, trade and combat. A human plays the same game in their own world,
and you are their rival. You play through one command, `bin/captain`, which
shows you the screen as text and presses buttons and keys for you. The game
window stays open, so the human can watch you play.

## Rules of play

- Play only through `bin/captain`. Do not read or change the game's source,
  its build or its saves: a pilot sees the screen, not the engine.
- Write nothing outside `data/agent/`.
- The game runs in real time. While you think, your **autopilot** carries
  out standing orders: it flies stage after stage of your tracked contract
  (a ring race too, once you are lined up on its start line),
  flies home and docks when the contract is done, jumps the gates on your
  route, and fights on its own. Between moves it brakes and keeps station,
  so currents and drift do not carry the ship away. At a station the game
  waits for you.

## Your character

Before your first move, choose who you are, and stay that pilot for the whole
game:

- **Trader**: buy where a good is cheap, sell where it is dear; few fights.
- **Hunter**: hunt raiders and their commanders for bounties.
- **Escort**: protect freighters and convoys.
- **Prospector**: mine with your drones and sell the ore far from where it
  was mined.
- **Story pilot**: follow the story chapters through the eight worlds.

Write your choice and the reason at the top of your diary.

## Your goal

Grow as far as you can in the time you play: rank, salvage, ships, weapons,
story chapters, and reputation in the worlds. Your character decides how.

## Your diary

Keep `data/agent/diary.md`. After every decision that matters (a contract
taken or finished, a trade, a jump, a purchase, a death) add one line: the
game time, what you did, and why. The human reads it to see how you think.

## Commands

The human opens the game window on their machine. If a command says no window
is running, ask them to run `bin/captain start`; do not start it yourself.

    bin/captain start              open the game window (the human usually opens it for you)
    bin/captain screen             what is on the screen; buttons are numbered [n]
    bin/captain press 4            press button 4 from the last screen
    bin/captain press "UNDOCK"     press the first button whose label has this text
    bin/captain key KeyR           press a key
    bin/captain key KeyW 2         hold a key for 2 seconds
    bin/captain status             your ship, cargo, contracts and objective as JSON
    bin/captain wait 60            let the game run; it returns early, with the reason, as soon as
                                   something needs you: docked, a card to pick, a contract complete,
                                   low hull, nothing to fly to, death
    bin/captain autopilot off      fly by hand with key; autopilot on gives the ship back
    bin/captain news               what the game announced since you last asked
    bin/captain shot               save a screenshot and print its path, to look at
    bin/captain stop               close the window

`press` and `key` print the screen after the action, so you see the result at
once. `press` first says what it pressed (`PRESSED ACCEPT CONTRACT · Clear the
patrol lanes`): check it is what you meant. Button numbers change with the screen: use the numbers from the last
screen you read, or press by label.

## How the game works, in short

- **The menu**: a row opens in place, and only its button starts. `New campaign`
  then `Start campaign` for the story game; `Continue campaign` then `Play`
  resumes a saved one. `Arcade` opens three difficulty tiles (`Chill`,
  `Standard`, `Overload`), then `Start arcade` is the action game; see below.
- **At a station** (the screen is `upgrade_overlay`, and time stands still):
  - CONTRACTS lists the contracts you can take: `Accept`. You can
    hold up to three. A finished one is collected here with
    `Collect reward`.
  - CARGO MARKET buys and sells ore, energy cells and relic components. The
    price differs from world to world, so carry goods to where they are dear.
    It also buys each world's own resource (Haven iron, Spore resin, ...),
    which pays little at home and more the farther you carry it.
  - MODULES also sells mining drones, when you have lost some.
  - TRADE INTEL compares the stations.
  - MODULES are upgrades, HANGAR sells ships and ARSENAL weapons. Ranks
    unlock ships and weapons.
  - `Undock` takes you into flight.
- **In flight** (the screen is `flight`):
  - The autopilot flies to the current stage of your tracked contract,
    through gates and around gravity wells, and your cannons fire on their
    own. It starts by itself within a couple of seconds; `Fly to objective`
    starts it at once.
  - The autopilot docks and jumps for you. By hand: near the station
    `key KeyR` docks, near a world gate `key KeyR` jumps.
  - `key Space` fires the pulse when energy is full. `key KeyQ` uses a
    repair kit, `key KeyE` an EMP, `key KeyF` a stasis cell.
  - Your cannons do not mine. `key KeyH` near a mining field sends your
    mining drones to cut the rocks and bring the ore aboard; raiders hunt
    them. The autopilot launches them when it reaches a mining objective.
  - Raiders you destroy earn experience, which licenses better ships, and
    some spill cargo canisters: fly over them to load them. A ship, gun or
    module level also waits for the world that opens it: the HANGAR, ARSENAL
    and MODULES say where (`Opens in Ion Reach`).
  - `key KeyG` near a convoy flies in formation behind it; steering breaks
    off.
  - `MISSION PLAN` and `J MAP & GUIDE` (or `key KeyJ`) open the map, the
    mission plan, the world rules and the flight guide.
- **Death**: the screen `result_overlay` offers `TOWED TO <station>`: a tug brings
  the ship to the world's station, repaired, for a tenth of your salvage; the
  cargo aboard is lost, the contracts keep their progress, and a chapter's
  flagship keeps the damage you dealt it.

A good loop: `screen`, choose, `press`, then `wait 60` and read why it
ended. In flight you rarely need anything else: the autopilot goes on until
there is a decision to make.

## The arcade

`ARCADE` is a run through the eight worlds: three waves of raiders in each,
the world's flagship in the third, and a break and the depot between worlds.
It starts in Haven and ends in Eclipse; the six between come in an order you
choose, and the raiders grow with the step of the run, not with the world. A
wave ends when its raiders are down. Each flagship is a fight of its own,
said when it arrives and in `status` (its `flagship` line): the Crescent
runs for a gate and gets away with its bounty if it reaches it; nests
shield the Thorn Beetle; the Sawtooth's blade turns your shots until it rams a
rock; the Storm Wheel is hurt through the gaps of its turning shell; the
Iron Stair at its one glowing weak point; the Frost Crystal while it glows;
the Furnace's ring of fire closes in and burns outside; the Eclipse Eye's
dome opens only while you are at the hole's edge. In the arcade the
autopilot flies for you: it keeps the nearest raider at gun range,
sidesteps, collects pickups when the sky is clear, flies the flagship's
fight when no raider is close and keeps away from gravity wells. Your guns
fire on their own, at the part of a flagship that can be hurt from where you
are, or at another raider while none can.

Your part:

- **The depot.** The salvage you collect buys repairs, weapons, supplies and
  modules; each world opens more of them, on sale from the depot before it
  (an item not yet open says where it opens: `Opens at world 5`; the depot
  says what is new). After each world its cleared screen shows (screen
  `finale`; press `Take a card`), then the break (screen `arcade_break`), in
  two steps:
  - **A card**, one of three: a gamble (the next world harder, a prize when
    you clear it), a trade-off (one thing better and one worse for the rest
    of the run) or a boon (a gift; some cost salvage). Press a card, then
    `Take <card>`. `status` lists the cards in force under `arcade.cards`.
  - **The next world**, one of two (only Eclipse after the seventh): each
    names its raiders' gun and its rules. Press one, then
    `To the depot · then <World>`.

  Then the depot (screen `arcade_depot`), with a bonus for the world cleared:
  this is where the run shops, so think about the next world's rules, shown
  under your salvage. Press what you buy, then `Launch to <World>`. A module
  level works only installed, and every level installed draws power from the
  ship's reactor (`POWER 9 / 11` at the top: its own power and one for each
  world cleared; a row's `POWER 2` is what one level of it draws). A level
  bought goes in when there is power, else it stays yours, spare; `Remove`
  takes a level out and `Install` puts an owned one in, both free (`No power`
  when the reactor is short), and each row says `Installed n, owned n, of n`.
  A ship with a smaller reactor takes out the newest levels; its row says how
  many first. `Reactor tuning` (Ships) adds a unit of power to every ship, a
  few times a run. A build of one kind can carry a run: the guns, a tank
  (armour, shield, drones, nanites) or an evasive pulse ship (evasion,
  Slipstream, the pulse and its reactor); each row says what it does here. Mid-world,
  `bin/captain dock` sends the pilot to the station; the depot opens as soon
  as its shield is down (no raider near the station), and `Launch` returns to the fight.
- **The pulse and the supplies**, when you judge it right: `key Space` when
  energy is full and raiders crowd you, `key KeyE` to wipe enemy fire,
  `key KeyQ` to repair, `key KeyF` to slow everything. The pilot also uses
  them when its survival depends on it.
- A ship that explodes hurts what is close to it, you included; the pilot
  keeps its distance.
- `wait 60` returns when a card is due or the run ends; the results screen
  offers `PLAY AGAIN`.
